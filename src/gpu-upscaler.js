// WebGPU Video Frame Upscaler
// Bilinear: hardware linear sampler
// High Quality: Catmull-Rom bicubic interpolation shader

const BILINEAR_SHADER = `
struct VSOut {
  @builtin(position) pos : vec4f,
  @location(0) uv : vec2f,
};

@vertex fn vs(@builtin(vertex_index) i : u32) -> VSOut {
  var p = array<vec2f,6>(
    vec2f(-1,-1), vec2f(1,-1), vec2f(-1,1),
    vec2f(-1,1),  vec2f(1,-1), vec2f(1,1));
  var u = array<vec2f,6>(
    vec2f(0,1), vec2f(1,1), vec2f(0,0),
    vec2f(0,0), vec2f(1,1), vec2f(1,0));
  var o : VSOut;
  o.pos = vec4f(p[i], 0, 1);
  o.uv = u[i];
  return o;
}

@group(0) @binding(0) var tex : texture_external;
@group(0) @binding(1) var samp : sampler;

@fragment fn fs(v : VSOut) -> @location(0) vec4f {
  return textureSampleBaseClampToEdge(tex, samp, v.uv);
}
`;

const BICUBIC_SHADER = `
struct VSOut {
  @builtin(position) pos : vec4f,
  @location(0) uv : vec2f,
};

struct Params {
  srcW : f32, srcH : f32, dstW : f32, dstH : f32,
};

@vertex fn vs(@builtin(vertex_index) i : u32) -> VSOut {
  var p = array<vec2f,6>(
    vec2f(-1,-1), vec2f(1,-1), vec2f(-1,1),
    vec2f(-1,1),  vec2f(1,-1), vec2f(1,1));
  var u = array<vec2f,6>(
    vec2f(0,1), vec2f(1,1), vec2f(0,0),
    vec2f(0,0), vec2f(1,1), vec2f(1,0));
  var o : VSOut;
  o.pos = vec4f(p[i], 0, 1);
  o.uv = u[i];
  return o;
}

@group(0) @binding(0) var tex : texture_external;
@group(0) @binding(1) var samp : sampler;
@group(0) @binding(2) var<uniform> p : Params;

fn cr(t : f32) -> f32 {
  let a = abs(t);
  if (a <= 1.0) { return 1.5*a*a*a - 2.5*a*a + 1.0; }
  if (a <= 2.0) { return -0.5*a*a*a + 2.5*a*a - 4.0*a + 2.0; }
  return 0.0;
}

@fragment fn fs(v : VSOut) -> @location(0) vec4f {
  let sc = v.uv * vec2f(p.srcW, p.srcH);
  let c  = floor(sc - 0.5) + 0.5;
  var col = vec4f(0); var tw = 0.0;
  for (var dy = -1i; dy <= 2i; dy++) {
    for (var dx = -1i; dx <= 2i; dx++) {
      let sp = c + vec2f(f32(dx), f32(dy));
      let w  = cr(sc.x - sp.x) * cr(sc.y - sp.y);
      col += textureSampleBaseClampToEdge(tex, samp, sp / vec2f(p.srcW, p.srcH)) * w;
      tw += w;
    }
  }
  return select(col, col / tw, tw > 0.0);
}
`;

export class GPUUpscaler {
  constructor() {
    this.device = null;
    this.canvas = null;
    this.context = null;
  }

  static async checkSupport() {
    if (!navigator.gpu) return false;
    try {
      const a = await navigator.gpu.requestAdapter();
      return !!a;
    } catch { return false; }
  }

  async init(srcW, srcH, outW, outH) {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('WebGPU adapter not found');
    this.device = await adapter.requestDevice();

    this.canvas = new OffscreenCanvas(outW, outH);
    this.context = this.canvas.getContext('webgpu');
    const fmt = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({ device: this.device, format: fmt, alphaMode: 'opaque' });

    this.linearSampler  = this.device.createSampler({ magFilter: 'linear',  minFilter: 'linear' });
    this.nearestSampler = this.device.createSampler({ magFilter: 'nearest', minFilter: 'nearest' });

    const mk = (code) => {
      const m = this.device.createShaderModule({ code });
      return this.device.createRenderPipeline({
        layout: 'auto',
        vertex:   { module: m, entryPoint: 'vs' },
        fragment: { module: m, entryPoint: 'fs', targets: [{ format: fmt }] },
        primitive: { topology: 'triangle-list' },
      });
    };
    this.bilinearPipe = mk(BILINEAR_SHADER);
    this.bicubicPipe  = mk(BICUBIC_SHADER);

    this.ubuf = this.device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.device.queue.writeBuffer(this.ubuf, 0, new Float32Array([srcW, srcH, outW, outH]));
    this.outW = outW; this.outH = outH;
  }

  async upscaleFrame(frame, mode) {
    const bicubic = mode === 'high';
    const pipe = bicubic ? this.bicubicPipe : this.bilinearPipe;
    const samp = bicubic ? this.nearestSampler : this.linearSampler;
    const ext  = this.device.importExternalTexture({ source: frame });

    const entries = [
      { binding: 0, resource: ext },
      { binding: 1, resource: samp },
    ];
    if (bicubic) entries.push({ binding: 2, resource: { buffer: this.ubuf } });

    const bg  = this.device.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries });
    const enc = this.device.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        clearValue: [0,0,0,1], loadOp: 'clear', storeOp: 'store',
      }],
    });
    pass.setPipeline(pipe);
    pass.setBindGroup(0, bg);
    pass.draw(6);
    pass.end();
    this.device.queue.submit([enc.finish()]);
    await this.device.queue.onSubmittedWorkDone();

    const out = new VideoFrame(this.canvas, { timestamp: frame.timestamp, duration: frame.duration });
    frame.close();
    return out;
  }

  destroy() {
    try { this.ubuf?.destroy(); this.device?.destroy(); } catch {}
    this.device = null;
  }
}
