import { FootballGame, GAME_STATES } from './game/FootballGame.js';
import { OFFENSE_FORMATIONS, DEFENSE_FORMATIONS } from './game/Formations.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('football-canvas');
  const container = canvas.parentElement;

  // キャンバスリサイズ
  function resizeCanvas() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const game = new FootballGame(canvas);

  // UI要素
  const scoreHomeEl = document.getElementById('score-home');
  const scoreAwayEl = document.getElementById('score-away');
  const downDistanceTextEl = document.getElementById('down-distance-text');
  const gameClockTextEl = document.getElementById('game-clock-text');
  const playBannerEl = document.getElementById('play-banner');
  const playSelectModalEl = document.getElementById('play-select-modal');
  const modalDownInfoEl = document.getElementById('modal-down-info');

  const offenseGrid = document.getElementById('offense-card-grid');
  const defenseGrid = document.getElementById('defense-card-grid');
  const btnStartPlay = document.getElementById('btn-start-play');

  let selectedOffenseKey = 'pro_set';
  let selectedDefenseKey = 'def_5_3';

  // フォーメーションカードの初期化
  function renderFormationCards() {
    offenseGrid.innerHTML = '';
    Object.keys(OFFENSE_FORMATIONS).forEach(key => {
      const form = OFFENSE_FORMATIONS[key];
      const card = document.createElement('div');
      card.className = `formation-card ${key === selectedOffenseKey ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="card-name">${form.name}</div>
        <div class="card-desc">${form.description}</div>
      `;
      card.addEventListener('click', () => {
        document.querySelectorAll('#offense-card-grid .formation-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedOffenseKey = key;
      });
      offenseGrid.appendChild(card);
    });

    defenseGrid.innerHTML = '';
    Object.keys(DEFENSE_FORMATIONS).forEach(key => {
      const form = DEFENSE_FORMATIONS[key];
      const card = document.createElement('div');
      card.className = `formation-card ${key === selectedDefenseKey ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="card-name">${form.name}</div>
        <div class="card-desc">${form.description}</div>
      `;
      card.addEventListener('click', () => {
        document.querySelectorAll('#defense-card-grid .formation-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedDefenseKey = key;
      });
      defenseGrid.appendChild(card);
    });
  }
  renderFormationCards();

  btnStartPlay.addEventListener('click', () => {
    game.setupPlay(selectedOffenseKey, selectedDefenseKey);
    playSelectModalEl.classList.remove('active');
  });

  // ダウン表記文字列変換
  function getDownString(down) {
    if (down === 1) return '1st';
    if (down === 2) return '2nd';
    if (down === 3) return '3rd';
    return '4th';
  }

  // 時計フォーマット
  function formatClock(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  let lastTime = performance.now();

  function gameLoop(now) {
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    game.update(dt);
    game.draw();

    // UI更新
    scoreHomeEl.textContent = game.homeScore;
    scoreAwayEl.textContent = game.awayScore;
    downDistanceTextEl.textContent = `${getDownString(game.down)} & ${game.yardsToGo}`;
    gameClockTextEl.textContent = `Q${game.quarter} ${formatClock(game.clock)}`;
    playBannerEl.textContent = game.playResultText;

    // プレー選択状態になったらモーダル表示
    if (game.state === GAME_STATES.PLAY_SELECT && !playSelectModalEl.classList.contains('active')) {
      modalDownInfoEl.textContent = `${getDownString(game.down)} & ${game.yardsToGo} at ${Math.round(game.ballX)} yds`;
      playSelectModalEl.classList.add('active');
    }

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
});
