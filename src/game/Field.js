// フィールド（アメリカンフットボール場）描画モジュール
// 120ヤード（両端10ヤードエンドゾーン含む）× 53.3ヤード

export class Field {
  constructor() {
    this.totalLengthYards = 120; // 0..10 Endzone, 10..110 Playing Field, 110..120 Endzone
    this.fieldWidthYards = 53.3;
  }

  draw(ctx, width, height, cameraOffsetX, yardToPxX, yardToPxY, lineOfScrimmage, firstDownLine, ball) {
    ctx.save();

    // 背景：美しい芝生グリーン
    const fieldGradient = ctx.createLinearGradient(0, 0, 0, height);
    fieldGradient.addColorStop(0, '#1E4D2B');
    fieldGradient.addColorStop(0.5, '#286138');
    fieldGradient.addColorStop(1, '#1E4D2B');
    ctx.fillStyle = fieldGradient;
    ctx.fillRect(0, 0, width, height);

    // 芝生ストライプ（5ヤードごとの濃淡模様）
    for (let yrd = 0; yrd < 120; yrd += 5) {
      const px1 = (yrd - cameraOffsetX) * yardToPxX;
      const px2 = (yrd + 5 - cameraOffsetX) * yardToPxX;
      if (px2 < 0 || px1 > width) continue;

      if ((yrd / 5) % 2 === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(px1, 0, px2 - px1, height);
      }
    }

    // エンドゾーン描画 (0-10 & 110-120)
    this.drawEndzone(ctx, 0, 10, cameraOffsetX, yardToPxX, height, 'HOME', '#153A20');
    this.drawEndzone(ctx, 110, 120, cameraOffsetX, yardToPxX, height, 'AWAY', '#1B2A4A');

    // 5ヤードごとの白線およびヤード数字描画
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';

    for (let yrd = 10; yrd <= 110; yrd += 5) {
      const px = (yrd - cameraOffsetX) * yardToPxX;
      if (px < -10 || px > width + 10) continue;

      // 5ヤードライン描画
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();

      // 10ヤード刻み数字
      if (yrd % 10 === 0 && yrd > 10 && yrd < 110) {
        let fieldNum = yrd <= 60 ? yrd - 10 : 110 - yrd;
        // 上部ヤード数
        ctx.fillText(fieldNum.toString(), px, 24);
        // 下部ヤード数
        ctx.fillText(fieldNum.toString(), px, height - 12);
      }

      // ハッシュマーク (上下と中央)
      for (let h = 0; h < 53; h += 1) {
        const py = h * yardToPxY;
        ctx.beginPath();
        ctx.moveTo(px - 3, py);
        ctx.lineTo(px + 3, py);
        ctx.stroke();
      }
    }

    // サイドライン（フィールド上下縁）
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(width, 4);
    ctx.moveTo(0, height - 4);
    ctx.lineTo(width, height - 4);
    ctx.stroke();

    // スクリメージライン (LINE OF SCRIMMAGE - 黄色)
    if (lineOfScrimmage !== null && lineOfScrimmage !== undefined) {
      const losPx = (lineOfScrimmage - cameraOffsetX) * yardToPxX;
      if (losPx >= 0 && losPx <= width) {
        ctx.save();
        ctx.strokeStyle = '#FFD700'; // ゴールド
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(losPx, 0);
        ctx.lineTo(losPx, height);
        ctx.stroke();
        ctx.restore();
      }
    }

    // ファーストダウンライン (FIRST DOWN LINE - 鮮やかな青)
    if (firstDownLine !== null && firstDownLine !== undefined) {
      const fdPx = (firstDownLine - cameraOffsetX) * yardToPxX;
      if (fdPx >= 0 && fdPx <= width) {
        ctx.save();
        ctx.strokeStyle = '#00E5FF'; // シアン
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#00E5FF';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(fdPx, 0);
        ctx.lineTo(fdPx, height);
        ctx.stroke();
        ctx.restore();
      }
    }

    // ボール描画 (Ball)
    if (ball) {
      this.drawBall(ctx, ball, cameraOffsetX, yardToPxX, yardToPxY);
    }

    ctx.restore();
  }

  drawEndzone(ctx, startYrd, endYrd, cameraOffsetX, yardToPxX, height, text, bgColor) {
    const px1 = (startYrd - cameraOffsetX) * yardToPxX;
    const px2 = (endYrd - cameraOffsetX) * yardToPxX;

    ctx.fillStyle = bgColor;
    ctx.fillRect(px1, 0, px2 - px1, height);

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate((px1 + px2) / 2, height / 2);
    ctx.rotate(startYrd === 0 ? -Math.PI / 2 : Math.PI / 2);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  drawBall(ctx, ball, cameraOffsetX, yardToPxX, yardToPxY) {
    const px = (ball.x - cameraOffsetX) * yardToPxX;
    const py = ball.y * yardToPxY;

    ctx.save();
    ctx.translate(px, py);

    // ボールの高度による影と本体サイズ
    const zOffset = ball.z || 0;
    
    // 影
    ctx.beginPath();
    ctx.ellipse(0, zOffset * 4, 8, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();

    // ボール本体 (楕円アメフト球)
    ctx.translate(0, -zOffset * 15);
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 5.5, ball.angle || 0, 0, Math.PI * 2);
    ctx.fillStyle = '#8B4513'; // ブラウン
    ctx.fill();
    ctx.strokeStyle = '#5A2A0A';
    ctx.lineWidth = 1;
    ctx.stroke();

    // レース (縫い目)
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.lineTo(3, 0);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }
}
