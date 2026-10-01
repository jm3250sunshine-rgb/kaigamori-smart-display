// ゲームコアエンジン
import { FIELD_WIDTH_YARDS, OFFENSE_FORMATIONS, DEFENSE_FORMATIONS } from './Formations.js';
import { Player } from './Player.js';
import { Field } from './Field.js';
import { sounds } from './SoundEffects.js';

export const GAME_STATES = {
  PLAY_SELECT: 'PLAY_SELECT',
  READY_TO_SNAP: 'READY_TO_SNAP',
  PLAY_IN_PROGRESS: 'PLAY_IN_PROGRESS',
  BALL_IN_AIR: 'BALL_IN_AIR',
  PLAY_OVER: 'PLAY_OVER',
  KICK_GAUGE: 'KICK_GAUGE',
  PAT_SELECT: 'PAT_SELECT',
  GAME_OVER: 'GAME_OVER'
};

export class FootballGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.field = new Field();
    
    // スコア＆ゲーム進行パラメータ
    this.homeScore = 0;
    this.awayScore = 0;
    this.quarter = 1;
    this.clock = 900; // 15分 (秒換算)

    this.down = 1;
    this.yardsToGo = 10;
    this.ballX = 25.0; // 自陣25ヤードからスタート
    this.firstDownX = 35.0;
    
    // 現在のフォーメーション
    this.currentOffenseKey = 'pro_set';
    this.currentDefenseKey = 'def_5_3';

    // 選手 & ボール
    this.offensePlayers = [];
    this.defensePlayers = [];
    this.ballCarrier = null;
    this.userPlayer = null;

    this.ball = {
      x: 25.0,
      y: FIELD_WIDTH_YARDS / 2,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      targetReceiver: null,
      isAirborne: false
    };

    this.state = GAME_STATES.PLAY_SELECT;
    this.playResultText = '';
    
    // カメラオフセット (ヤード単位)
    this.cameraX = 0;
    
    // 入力キー
    this.keys = {};

    // キックゲージ用
    this.kickPower = 0;
    this.kickPowerDir = 1;

    this.initInput();
  }

  initInput() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      // Spaceでスナップ / 決定 / アクション
      if (e.code === 'Space') {
        if (this.state === GAME_STATES.READY_TO_SNAP) {
          this.snapBall();
        } else if (this.state === GAME_STATES.KICK_GAUGE) {
          this.executeKick();
        }
      }

      // パス / ターゲットキー (Key1: TE, Key2: WR, Key3: RB)
      if (this.state === GAME_STATES.PLAY_IN_PROGRESS && this.ballCarrier && this.ballCarrier.role === 'QB') {
        if (e.code === 'Digit1' || e.code === 'Numpad1') this.throwPassToRole('TE');
        if (e.code === 'Digit2' || e.code === 'Numpad2') this.throwPassToRole('WR');
        if (e.code === 'Digit3' || e.code === 'Numpad3') this.throwPassToRole('RB');
        if (e.code === 'KeyH') this.handoffToRB();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // キャンバス上のクリックでパス / 選択
    this.canvas.addEventListener('click', (e) => {
      if (this.state === GAME_STATES.PLAY_IN_PROGRESS && this.ballCarrier && this.ballCarrier.role === 'QB') {
        const rect = this.canvas.getBoundingClientRect();
        const mousePxX = e.clientX - rect.left;
        const mousePxY = e.clientY - rect.top;

        // ピクセルからヤード座標へ
        const yardX = this.cameraX + mousePxX / this.yardToPxX;
        const yardY = mousePxY / this.yardToPxY;

        // 最も近いレシーバーを探してパス
        let closestReceiver = null;
        let minDistance = 999;
        this.offensePlayers.forEach(p => {
          if (p.role !== 'QB' && p.role !== 'OL') {
            const dist = Math.hypot(p.x - yardX, p.y - yardY);
            if (dist < minDistance) {
              minDistance = dist;
              closestReceiver = p;
            }
          }
        });

        if (closestReceiver && minDistance < 10) {
          this.throwPass(closestReceiver);
        }
      }
    });
  }

  // フォーメーション選択とセットアップ
  setupPlay(offenseKey, defenseKey) {
    this.currentOffenseKey = offenseKey || this.currentOffenseKey;
    this.currentDefenseKey = defenseKey || this.currentDefenseKey;

    const offDef = OFFENSE_FORMATIONS[this.currentOffenseKey];
    let defDef = DEFENSE_FORMATIONS[this.currentDefenseKey];

    // キッキング対抗
    if (offDef.isKicking) {
      if (this.currentOffenseKey === 'punt_offense') defDef = DEFENSE_FORMATIONS.def_punt_return;
      if (this.currentOffenseKey === 'field_goal_offense') defDef = DEFENSE_FORMATIONS.def_fg_block;
    }

    const los = this.ballX;

    // オフェンス配置
    this.offensePlayers = offDef.players.map(p => {
      const player = new Player(p, true, 'offense');
      player.setPosition(los + p.relX, p.relY);
      return player;
    });

    // ディフェンス配置
    this.defensePlayers = defDef.players.map(p => {
      const player = new Player(p, false, 'defense');
      player.setPosition(los + p.relX, p.relY);
      return player;
    });

    // QBを操作対象
    const qb = this.offensePlayers.find(p => p.role === 'QB' || p.isPunter || p.isKicker);
    if (qb) {
      qb.isUserControlled = true;
      qb.hasBall = true;
      this.userPlayer = qb;
      this.ballCarrier = qb;
    }

    // ボール位置更新
    this.ball.x = qb ? qb.x : los;
    this.ball.y = qb ? qb.y : FIELD_WIDTH_YARDS / 2;
    this.ball.z = 0;
    this.ball.isAirborne = false;
    this.ballCarrier = qb;

    if (offDef.isKicking) {
      this.state = GAME_STATES.KICK_GAUGE;
    } else {
      this.state = GAME_STATES.READY_TO_SNAP;
    }

    this.playResultText = 'Press SPACE to Snap!';
  }

  snapBall() {
    this.state = GAME_STATES.PLAY_IN_PROGRESS;
    this.playResultText = 'Play Live!';
    sounds.playWhistle();
  }

  throwPassToRole(role) {
    const target = this.offensePlayers.find(p => p.role === role);
    if (target) {
      this.throwPass(target);
    }
  }

  throwPass(target) {
    if (!this.ballCarrier || this.ballCarrier.role !== 'QB' || this.ball.isAirborne) return;

    sounds.playKick(); // パス投げ音
    this.ballCarrier.hasBall = false;
    this.ballCarrier = null;

    this.ball.isAirborne = true;
    this.ball.targetReceiver = target;
    this.ball.startX = this.ball.x;
    this.ball.startY = this.ball.y;
    this.ball.targetX = target.x + target.vx * 0.8;
    this.ball.targetY = target.y + target.vy * 0.8;
    this.ball.progress = 0;

    this.state = GAME_STATES.BALL_IN_AIR;
  }

  handoffToRB() {
    if (!this.ballCarrier || this.ballCarrier.role !== 'QB') return;
    const rb = this.offensePlayers.find(p => p.role === 'RB');
    if (rb) {
      const dist = Math.hypot(rb.x - this.ballCarrier.x, rb.y - this.ballCarrier.y);
      if (dist < 4.0) {
        this.ballCarrier.hasBall = false;
        this.ballCarrier.isUserControlled = false;
        
        rb.hasBall = true;
        rb.isUserControlled = true;
        this.ballCarrier = rb;
        this.userPlayer = rb;
        sounds.playTackle();
      }
    }
  }

  executeKick() {
    sounds.playKick();
    const isPunt = this.currentOffenseKey === 'punt_offense';
    const kickDist = 25 + (this.kickPower * 0.45); // キック飛距離

    if (isPunt) {
      this.ballX += kickDist;
      if (this.ballX > 110) this.ballX = 90; // タッチバック
      this.playResultText = `Punt ${Math.round(kickDist)} Yards!`;
      sounds.playWhistle();
      setTimeout(() => this.endTurnover(), 1500);
    } else {
      // Field Goal 判定
      const distToGoal = 110 - this.ballX;
      if (distToGoal <= kickDist && Math.abs(FIELD_WIDTH_YARDS / 2 - 26.65) < 8) {
        this.homeScore += 3;
        this.playResultText = 'FIELD GOAL IS GOOD! (+3)';
        sounds.playCheer();
      } else {
        this.playResultText = 'FIELD GOAL MISSED!';
        sounds.playWhistle();
      }
      setTimeout(() => this.endTurnover(), 2000);
    }
  }

  update(dt) {
    if (this.state === GAME_STATES.KICK_GAUGE) {
      this.kickPower += this.kickPowerDir * 120 * dt;
      if (this.kickPower > 100) {
        this.kickPower = 100;
        this.kickPowerDir = -1;
      } else if (this.kickPower < 0) {
        this.kickPower = 0;
        this.kickPowerDir = 1;
      }
      return;
    }

    if (this.state !== GAME_STATES.PLAY_IN_PROGRESS && this.state !== GAME_STATES.BALL_IN_AIR) return;

    // 時計カウント
    this.clock = Math.max(0, this.clock - dt);

    // ユーザープレイヤー操作 (WASD / 矢印キー)
    if (this.userPlayer && this.userPlayer.isUserControlled) {
      let speed = this.userPlayer.speed;
      let vx = 0;
      let vy = 0;

      if (this.keys['KeyW'] || this.keys['ArrowUp']) vy -= speed;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) vy += speed;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) vx -= speed;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) vx += speed;

      this.userPlayer.vx = vx;
      this.userPlayer.vy = vy;
    }

    // 選手アップデート
    this.offensePlayers.forEach(p => p.update(dt, this));
    this.defensePlayers.forEach(p => p.update(dt, this));

    // ボール保持者の座標同期
    if (this.ballCarrier) {
      this.ball.x = this.ballCarrier.x;
      this.ball.y = this.ballCarrier.y;
      this.ball.z = 0;

      // エンドゾーン到達 (TOUCHDOWN!)
      if (this.ballCarrier.x >= 110) {
        this.handleTouchdown();
        return;
      }

      // アウト・オブ・バウンズ
      if (this.ballCarrier.y <= 1.5 || this.ballCarrier.y >= 51.8) {
        this.handlePlayEnd('Out of Bounds!');
        return;
      }

      // ディフェンスによるタックル判定
      for (let def of this.defensePlayers) {
        const dist = Math.hypot(def.x - this.ballCarrier.x, def.y - this.ballCarrier.y);
        if (dist < 1.3) {
          sounds.playTackle();
          this.handlePlayEnd('Tackled!');
          return;
        }
      }
    }

    // ボール滞空処理（パス時）
    if (this.state === GAME_STATES.BALL_IN_AIR) {
      this.ball.progress += dt * 1.6;
      const t = Math.min(1.0, this.ball.progress);

      this.ball.x = this.ball.startX + (this.ball.targetX - this.ball.startX) * t;
      this.ball.y = this.ball.startY + (this.ball.targetY - this.ball.startY) * t;
      this.ball.z = Math.sin(t * Math.PI) * 4.0; // 放物線高さ

      if (t >= 1.0) {
        // パス到達
        const rec = this.ball.targetReceiver;
        const distToRec = rec ? Math.hypot(rec.x - this.ball.x, rec.y - this.ball.y) : 99;

        if (rec && distToRec < 2.5) {
          // キャッチ成功！
          this.ball.isAirborne = false;
          rec.hasBall = true;
          rec.isUserControlled = true;
          this.ballCarrier = rec;
          this.userPlayer = rec;
          this.state = GAME_STATES.PLAY_IN_PROGRESS;
          this.playResultText = `Pass Complete to ${rec.pos}!`;
        } else {
          // パス不成功
          this.handlePlayEnd('Pass Incomplete!');
        }
      }
    }
  }

  handleTouchdown() {
    sounds.playCheer();
    this.homeScore += 6;
    this.playResultText = 'TOUCHDOWN!! (+6)';
    this.state = GAME_STATES.PLAY_OVER;

    setTimeout(() => {
      this.ballX = 25.0;
      this.down = 1;
      this.yardsToGo = 10;
      this.firstDownX = 35.0;
      this.state = GAME_STATES.PLAY_SELECT;
    }, 3000);
  }

  handlePlayEnd(reason) {
    sounds.playWhistle();
    this.state = GAME_STATES.PLAY_OVER;

    const gainedYards = Math.round((this.ball.x - this.ballX) * 10) / 10;
    this.ballX = Math.max(10, Math.min(109, this.ball.x));

    if (this.ballX >= this.firstDownX) {
      // 1st Down 獲得！
      this.down = 1;
      this.yardsToGo = 10;
      this.firstDownX = Math.min(110, this.ballX + 10);
      this.playResultText = `${reason} 1st DOWN! (+${gainedYards} Yds)`;
    } else {
      this.down++;
      this.yardsToGo = Math.round((this.firstDownX - this.ballX) * 10) / 10;

      if (this.down > 4) {
        // ターンオーバー
        this.playResultText = `Turnover on Downs!`;
        setTimeout(() => this.endTurnover(), 2000);
        return;
      } else {
        this.playResultText = `${reason} Gain ${gainedYards} Yds (${this.down}th & ${this.yardsToGo})`;
      }
    }

    setTimeout(() => {
      this.state = GAME_STATES.PLAY_SELECT;
    }, 2200);
  }

  endTurnover() {
    this.ballX = Math.max(20, 110 - this.ballX);
    this.down = 1;
    this.yardsToGo = 10;
    this.firstDownX = Math.min(110, this.ballX + 10);
    this.state = GAME_STATES.PLAY_SELECT;
  }

  draw() {
    const width = this.canvas.width;
    const height = this.canvas.height;

    // スケール計算 (フィールド長さ 45ヤード分を画面表示)
    const visibleYardsX = 45;
    this.yardToPxX = width / visibleYardsX;
    this.yardToPxY = height / FIELD_WIDTH_YARDS;

    // カメラはボールを中心にトラッキング
    this.cameraX = Math.max(0, Math.min(120 - visibleYardsX, this.ball.x - 15));

    // フィールド描画
    this.field.draw(
      this.ctx,
      width,
      height,
      this.cameraX,
      this.yardToPxX,
      this.yardToPxY,
      this.ballX,
      this.firstDownX,
      this.ball
    );

    // 選手描画 (白丸 & 黒丸)
    this.offensePlayers.forEach(p => p.draw(this.ctx, this.yardToPxX, this.yardToPxY, this.cameraX, 0));
    this.defensePlayers.forEach(p => p.draw(this.ctx, this.yardToPxX, this.yardToPxY, this.cameraX, 0));

    // キックゲージ描画
    if (this.state === GAME_STATES.KICK_GAUGE) {
      this.drawKickGauge(width, height);
    }
  }

  drawKickGauge(width, height) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(width / 2 - 150, height - 80, 300, 50);

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(width / 2 - 130, height - 65, 260, 20);

    // ゲージパワー
    ctx.fillStyle = this.kickPower > 80 ? '#FF3366' : '#00E5FF';
    ctx.fillRect(width / 2 - 130, height - 65, (260 * this.kickPower) / 100, 20);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Press SPACE to Kick! Power: ${Math.round(this.kickPower)}%`, width / 2, height - 40);
    ctx.restore();
  }
}
