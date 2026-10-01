// Video Processing Pipeline: Demux → Decode → GPU Upscale → Encode → Mux
import { createFile, DataStream } from 'mp4box';
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { GPUUpscaler } from './gpu-upscaler.js';

// Extract codec description (avcC / hvcC) from mp4box track
function getCodecDesc(mp4file, track) {
  try {
    const trak = mp4file.getTrackById(track.id);
    const entry = trak.mdia.minf.stbl.stsd.entries[0];
    const box = entry.avcC || entry.hvcC || entry.vpcC || entry.av1C;
    if (!box) return undefined;
    const stream = new DataStream(undefined, 0, DataStream.BIG_ENDIAN);
    box.write(stream);
    return new Uint8Array(stream.buffer, 8);
  } catch { return undefined; }
}

// Demux MP4 file using mp4box.js
function demuxFile(file) {
  return new Promise(async (resolve, reject) => {
    const mp4file = createFile();
    const result = { videoTrack: null, videoSamples: [], audioTrack: null, audioSamples: [], mp4file };

    mp4file.onReady = (info) => {
      if (info.videoTracks.length === 0) { reject(new Error('No video track found')); return; }
      result.videoTrack = info.videoTracks[0];
      mp4file.setExtractionOptions(result.videoTrack.id, 'video', { nbSamples: 500 });

      if (info.audioTracks.length > 0) {
        result.audioTrack = info.audioTracks[0];
        mp4file.setExtractionOptions(result.audioTrack.id, 'audio', { nbSamples: 500 });
      }
      mp4file.start();
    };

    mp4file.onSamples = (trackId, user, samples) => {
      if (user === 'video') result.videoSamples.push(...samples);
      if (user === 'audio') result.audioSamples.push(...samples);
    };

    mp4file.onError = (e) => reject(e);

    try {
      const buf = await file.arrayBuffer();
      buf.fileStart = 0;
      mp4file.appendBuffer(buf);
      mp4file.flush();

      // Wait a tick for onReady/onSamples callbacks
      await new Promise(r => setTimeout(r, 100));
      if (!result.videoTrack) {
        return reject(new Error('有効な動画ファイルではありません。'));
      }
      resolve(result);
    } catch (e) { reject(e); }
  });
}

/**
 * Main processing function
 * @param {File} file
 * @param {{ scaleFactor: number, mode: string }} options
 * @param {{ onProgress: Function, onStatus: Function, signal: AbortSignal }} cb
 * @returns {Promise<Blob>}
 */
export async function processVideo(file, options, cb) {
  const { scaleFactor, mode } = options;
  const { onProgress, onStatus, signal } = cb;

  // --- DEMUX ---
  onStatus('Reading video file...');
  const { videoTrack, videoSamples, audioTrack, audioSamples, mp4file } = await demuxFile(file);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  const srcW = videoTrack.track_width;
  const srcH = videoTrack.track_height;
  const fps = videoTrack.nb_samples / (videoTrack.duration / videoTrack.timescale) || 30;
  const totalFrames = videoSamples.length;

  // Calculate output dimensions (capped at 4K = 3840px on longest side)
  const MAX_DIM = 3840;
  let outW = srcW * scaleFactor;
  let outH = srcH * scaleFactor;
  if (outW > MAX_DIM || outH > MAX_DIM) {
    const scale = MAX_DIM / Math.max(outW, outH);
    outW = Math.round(outW * scale);
    outH = Math.round(outH * scale);
  }
  // Ensure even dimensions (required by H.264)
  outW = outW - (outW % 2);
  outH = outH - (outH % 2);

  // --- Find a supported encoder config (try levels, then reduce resolution) ---
  onStatus('Checking encoder support...');
  const AVC_LEVELS = ['28', '29', '32', '33', '34', '3C', '3E'];

  async function findSupportedConfig(w, h) {
    for (const lvl of AVC_LEVELS) {
      const cfg = {
        codec: `avc1.6400${lvl}`,
        width: w, height: h,
        bitrate: Math.min(w * h * 8, 50_000_000),
        framerate: fps,
        hardwareAcceleration: 'prefer-hardware',
      };
      const res = await VideoEncoder.isConfigSupported(cfg);
      if (res.supported) return cfg;
    }
    return null;
  }

  let encoderConfig = await findSupportedConfig(outW, outH);

  // If not supported, progressively reduce resolution
  if (!encoderConfig) {
    for (const maxDim of [2560, 1920, 1280]) {
      if (outW <= maxDim && outH <= maxDim) continue;
      const s = maxDim / Math.max(outW, outH);
      const rw = Math.round(outW * s) - (Math.round(outW * s) % 2);
      const rh = Math.round(outH * s) - (Math.round(outH * s) % 2);
      encoderConfig = await findSupportedConfig(rw, rh);
      if (encoderConfig) { outW = rw; outH = rh; break; }
    }
  }

  if (!encoderConfig) {
    throw new Error(`エンコーダーがサポートする設定が見つかりませんでした。`);
  }

  // --- GPU INIT ---
  onStatus(`Initializing WebGPU... (${srcW}×${srcH} → ${outW}×${outH})`);
  const upscaler = new GPUUpscaler();
  await upscaler.init(srcW, srcH, outW, outH);
  if (signal?.aborted) { upscaler.destroy(); throw new DOMException('Aborted', 'AbortError'); }

  // --- MUXER ---
  const target = new ArrayBufferTarget();
  const muxOpts = {
    target,
    video: { codec: 'avc', width: outW, height: outH },
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  };

  if (audioTrack) {
    try {
      muxOpts.audio = {
        codec: 'aac',
        numberOfChannels: audioTrack.audio.channel_count,
        sampleRate: audioTrack.audio.sample_rate,
      };
    } catch { /* skip audio */ }
  }

  const muxer = new Muxer(muxOpts);

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => console.error('VideoEncoder error:', e),
  });
  videoEncoder.configure(encoderConfig);

  // --- VIDEO DECODER (single instance for entire stream) ---
  const decoderCfg = {
    codec: videoTrack.codec,
    codedWidth: srcW, codedHeight: srcH,
    hardwareAcceleration: 'prefer-hardware',
  };
  const desc = getCodecDesc(mp4file, videoTrack);
  if (desc) decoderCfg.description = desc;

  onStatus('Upscaling video frames...');
  const startTime = performance.now();

  const decoded = [];
  let processed = 0;
  let cancelled = false;

  const videoDecoder = new VideoDecoder({
    output: (f) => decoded.push(f),
    error: (e) => console.error('VideoDecoder error:', e),
  });
  videoDecoder.configure({ ...decoderCfg });

  // Cleanup helper
  const cleanup = () => {
    decoded.forEach(f => { try { f.close(); } catch {} });
    decoded.length = 0;
    try { if (videoDecoder.state !== 'closed') videoDecoder.close(); } catch {}
    try { if (videoEncoder.state !== 'closed') videoEncoder.close(); } catch {}
    upscaler.destroy();
  };

  // Helper: process all available decoded frames (checks abort each frame)
  const processDecoded = async () => {
    while (decoded.length > 0) {
      if (signal?.aborted) {
        cancelled = true;
        cleanup();
        throw new DOMException('Aborted', 'AbortError');
      }
      const frame = decoded.shift();
      const upscaled = await upscaler.upscaleFrame(frame, mode);
      if (signal?.aborted) {
        upscaled.close();
        cancelled = true;
        cleanup();
        throw new DOMException('Aborted', 'AbortError');
      }
      videoEncoder.encode(upscaled, { keyFrame: processed % 60 === 0 });
      upscaled.close();
      processed++;
      const elapsed = (performance.now() - startTime) / 1000;
      const eta = processed > 0 ? (elapsed / processed) * (totalFrames - processed) : 0;
      onProgress(processed, totalFrames, eta);
    }
  };

  try {
    // Feed samples to decoder, processing frames frequently
    for (let i = 0; i < videoSamples.length; i++) {
      if (signal?.aborted) {
        cancelled = true;
        throw new DOMException('Aborted', 'AbortError');
      }

      const s = videoSamples[i];
      videoDecoder.decode(new EncodedVideoChunk({
        type: s.is_sync ? 'key' : 'delta',
        timestamp: s.cts * 1_000_000 / videoTrack.timescale,
        duration: s.duration * 1_000_000 / videoTrack.timescale,
        data: s.data,
      }));

      // Process decoded frames frequently (every 3 samples or when queue builds up)
      if (i % 3 === 0 || videoDecoder.decodeQueueSize > 3) {
        await new Promise(r => setTimeout(r, 0));
        await processDecoded();
      }
    }

    // Flush decoder and process all remaining frames
    await videoDecoder.flush();
    videoDecoder.close();
    await processDecoded();

    await videoEncoder.flush();
    videoEncoder.close();
  } catch (e) {
    if (!cancelled) cleanup();
    throw e;
  }

  // --- AUDIO PASSTHROUGH ---
  if (audioTrack && muxOpts.audio && audioSamples.length > 0) {
    onStatus('Processing audio...');
    try {
      for (const s of audioSamples) {
        const chunk = new EncodedAudioChunk({
          type: s.is_sync ? 'key' : 'delta',
          timestamp: s.cts * 1_000_000 / audioTrack.timescale,
          duration: s.duration * 1_000_000 / audioTrack.timescale,
          data: s.data,
        });
        muxer.addAudioChunk(chunk);
      }
    } catch (e) { console.warn('Audio passthrough failed:', e); }
  }

  // --- FINALIZE ---
  onStatus('Finalizing video file...');
  muxer.finalize();
  upscaler.destroy();

  const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
  return { blob: new Blob([target.buffer], { type: 'video/mp4' }), elapsed };
}
