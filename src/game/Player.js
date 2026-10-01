// 選手 (Player) クラス
// オフェンス: 白丸 (城丸), ディフェンス: 黒丸

export class Player {
  constructor(config, isOffense, teamSide = 'offense') {
    this.role = config.role; // OL, TE, QB, RB, WR, DL, LB, CB, S
    this.pos = config.pos;   // LT, LG, C, QB, RB, WR, etc.
    this.isOffense = isOffense;
    this.teamSide = teamSide; // 'offense' (白丸) または 'defense' (黒丸)
    
    // ヤード座標 (フィールド全体 0〜120 yards X, 0〜53.3 yards Y)
    this.x = 0; 
    this.y = 0;
    this.startX = 0;
    this.startY = 0;

    this.vx = 0;
    this.vy = 0;
    this.speed = this.getDefaultSpeed();

    this.route = config.route || null;
    this.routePoints = [];
    this.currentRouteIndex = 0;

    this.hasBall = false;
    this.isUserControlled = false;
    this.radiusYards = 1.0; // 選手の判定半径（約1ヤード）

    // キック用フラグ
    this.isKicker = config.isKicker || false;
    this.isPunter = config.isPunter || false;
    this.isHolder = config.isHolder || false;
    this.isReturner = config.isReturner || false;

    // パスルートの走行進捗
    this.routeProgress = 0;
  }

  getDefaultSpeed() {
    switch (this.role) {
      case 'WR': return 7.5;
      case 'RB': return 7.0;
      case 'QB': return 6.2;
      case 'TE': return 6.5;
      case 'CB':
      case 'S':  return 7.2;
      case 'LB': return 6.4;
      case 'DL':
      case 'OL': return 5.0;
      default:   return 6.0;
    }
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this.startX = x;
    this.startY = y;
    this.vx = 0;
    this.vy = 0;
    this.hasBall = false;
    this.buildRoutePoints();
  }

  // ルート設計
  buildRoutePoints() {
    this.routePoints = [];
    this.currentRouteIndex = 0;
    const sx = this.startX;
    const sy = this.startY;

    if (!this.route) return;

    switch (this.route) {
      case 'fly': // 直進
        this.routePoints = [{ x: sx + 30, y: sy }];
        break;
      case 'slant': // 直進後、斜め中へ
        this.routePoints = [
          { x: sx + 5, y: sy },
          { x: sx + 25, y: sy + (sy < 26.65 ? 12 : -12) }
        ];
        break;
      case 'out': // 直進後、外側へ90度フック
        this.routePoints = [
          { x: sx + 10, y: sy },
          { x: sx + 12, y: sy + (sy < 26.65 ? -15 : 15) }
        ];
        break;
      case 'corner': // 直進後、外側対角へ
        this.routePoints = [
          { x: sx + 10, y: sy },
          { x: sx + 25, y: sy + (sy < 26.65 ? -12 : 12) }
        ];
        break;
      case 'post': // 直進後、ゴールポスト中央へ
        this.routePoints = [
          { x: sx + 10, y: sy },
          { x: sx + 30, y: 26.65 }
        ];
        break;
      case 'curl': // 前進後振り返る
        this.routePoints = [
          { x: sx + 12, y: sy },
          { x: sx + 9, y: sy }
        ];
        break;
      case 'flat': // アウトサイド即サイドウェイ
        this.routePoints = [
          { x: sx + 2, y: sy + (sy < 26.65 ? -8 : 8) },
          { x: sx + 15, y: sy + (sy < 26.65 ? -8 : 8) }
        ];
        break;
      case 'run_offtackle': // RBオフタックルラン
        this.routePoints = [
          { x: sx + 2, y: sy + 4 },
          { x: sx + 20, y: sy + 6 }
        ];
        break;
      case 'power_dive': // RB中央突破
        this.routePoints = [
          { x: sx + 20, y: sy }
        ];
        break;
      case 'screen': // スクリーンパス用ショートパターン
        this.routePoints = [
          { x: sx - 1, y: sy + 6 },
          { x: sx + 15, y: sy + 8 }
        ];
        break;
      case 'gunner': // パントガンナー全速力
        this.routePoints = [{ x: sx + 50, y: sy }];
        break;
      default:
        this.routePoints = [{ x: sx + 15, y: sy }];
        break;
    }
  }

  update(dt, game) {
    if (this.isUserControlled) {
      // ユーザー操作時の物理移動
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    } else if (this.isOffense) {
      // オフェンス自動ルート走行
      if (this.hasBall) {
        // ボールを持ったらエンドゾーン（X増大方向）を目指す
        const targetX = 110;
        const targetY = 26.65;
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.1) {
          this.x += (dx / dist) * this.speed * dt;
          this.y += (dy / dist) * (this.speed * 0.3) * dt;
        }
      } else if (this.routePoints.length > 0 && this.currentRouteIndex < this.routePoints.length) {
        const target = this.routePoints[this.currentRouteIndex];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 0.5) {
          this.currentRouteIndex++;
        } else {
          this.x += (dx / dist) * this.speed * dt;
          this.y += (dy / dist) * this.speed * dt;
        }
      } else if (this.role === 'OL') {
        // OLはディフェンスをブロック
        this.x += 0.5 * dt;
      }
    } else {
      // ディフェンスAI
      // ボールを持っている選手（またはQB/ボール目標地点）を追尾
      let targetX = game.ball.x;
      let targetY = game.ball.y;

      if (game.ballCarrier) {
        targetX = game.ballCarrier.x;
        targetY = game.ballCarrier.y;
      }

      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0.2) {
        // スピードに応じて追従
        this.x += (dx / dist) * this.speed * dt;
        this.y += (dy / dist) * this.speed * dt;
      }
    }

    // フィールド幅境界チェック (Y: 1.0 〜 52.3)
    this.y = Math.max(1.5, Math.min(51.8, this.y));
  }

  draw(ctx, yardToPxX, yardToPxY, offsetX, offsetY) {
    const px = (this.x - offsetX) * yardToPxX;
    const py = (this.y - offsetY) * yardToPxY;
    const radius = 13; // 円の半径

    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);

    if (this.teamSide === 'offense') {
      // 白丸（城丸）
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.lineWidth = this.isUserControlled ? 3 : 2;
      ctx.strokeStyle = this.isUserControlled ? '#FFD700' : '#111111';
      ctx.stroke();

      // 文字
      ctx.fillStyle = '#111111';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.pos, px, py);
    } else {
      // 黒丸
      ctx.fillStyle = '#1A1A1A';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      // 文字
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.pos, px, py);
    }

    // ボール保持マーカー
    if (this.hasBall) {
      ctx.beginPath();
      ctx.arc(px, py, radius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = '#FF3366';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // ユーザー操作インジケータ（リング）
    if (this.isUserControlled) {
      ctx.beginPath();
      ctx.arc(px, py, radius + 7, 0, Math.PI * 2);
      ctx.strokeStyle = '#00E5FF';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }
}
