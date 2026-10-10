// Number Guessing Game Logic (Faithful to numer_guessing_game.c)
const gameState = {
  maxRange: 100,
  targetNumber: 0,
  guessesCount: 0,
  minPossible: 1,
  maxPossible: 100,
  isGameOver: false,
  soundEnabled: true,
  history: [], // [{ guess, hint }]
  bestScores: JSON.parse(localStorage.getItem('ng_bests') || '{}')
};

// Web Audio sound generator
const audioCtx = (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext))
  ? new (window.AudioContext || window.webkitAudioContext)()
  : null;

function playTone(type) {
  if (!gameState.soundEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'hint') {
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(330, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } else if (type === 'win') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(783.99, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.45);
    }
  } catch (_) {}
}

document.addEventListener('DOMContentLoaded', () => {
  initGame();

  document.getElementById('guess-form').addEventListener('submit', handleGuessSubmit);
  document.getElementById('btn-new-game').addEventListener('click', () => initGame());

  // Sound toggle
  document.getElementById('btn-sound').addEventListener('click', () => {
    gameState.soundEnabled = !gameState.soundEnabled;
    document.getElementById('btn-sound').innerHTML = gameState.soundEnabled
      ? '<i class="fa-solid fa-volume-high"></i>'
      : '<i class="fa-solid fa-volume-xmark"></i>';
  });

  // Mode/Range buttons
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      gameState.maxRange = parseInt(btn.dataset.range);
      initGame();
    });
  });
});

function initGame() {
  // C: int randomNumber = (rand() % maxRange) + 1;
  gameState.targetNumber = Math.floor(Math.random() * gameState.maxRange) + 1;
  gameState.guessesCount = 0;
  gameState.minPossible = 1;
  gameState.maxPossible = gameState.maxRange;
  gameState.isGameOver = false;
  gameState.history = [];

  // Reset UI elements
  document.getElementById('count-guesses').textContent = '0';
  document.getElementById('range-hint').innerHTML = `The secret number is between <b>1</b> and <b>${gameState.maxRange}</b>`;
  document.getElementById('current-range-scope').textContent = `1 – ${gameState.maxRange}`;
  
  const statusEl = document.getElementById('game-status');
  statusEl.textContent = 'Playing';
  statusEl.style.color = 'var(--primary)';

  const box = document.getElementById('mystery-box');
  box.classList.remove('won');
  document.getElementById('box-display').textContent = '?';

  const banner = document.getElementById('feedback-banner');
  banner.className = 'feedback-banner';
  document.getElementById('feedback-icon').className = 'fa-solid fa-lightbulb';
  document.getElementById('feedback-text').textContent = 'Take your first guess!';

  const input = document.getElementById('guess-input');
  input.value = '';
  input.disabled = false;
  input.placeholder = `1 – ${gameState.maxRange}`;
  input.focus();

  document.getElementById('btn-submit').disabled = false;

  renderHistory();
  updateBestScoreDisplay();
}

function updateBestScoreDisplay() {
  const best = gameState.bestScores[gameState.maxRange];
  document.getElementById('stat-best').textContent = best ? `${best} guesses` : '-';
}

function handleGuessSubmit(e) {
  e.preventDefault();
  if (gameState.isGameOver) {
    initGame();
    return;
  }

  const input = document.getElementById('guess-input');
  const guess = parseInt(input.value);

  if (isNaN(guess) || guess < 1 || guess > gameState.maxRange) {
    setFeedback(`Please enter a number between 1 and ${gameState.maxRange}!`, 'lower');
    input.focus();
    return;
  }

  gameState.guessesCount++;
  document.getElementById('count-guesses').textContent = gameState.guessesCount;

  const banner = document.getElementById('feedback-banner');
  const icon = document.getElementById('feedback-icon');
  const text = document.getElementById('feedback-text');

  // Exact C program comparison logic:
  // if(guessed_number > randomNumber) Lower number please!
  // else if(guessed_number < randomNumber) Higher number please!
  // else Congrats!!
  if (guess > gameState.targetNumber) {
    playTone('hint');
    banner.className = 'feedback-banner lower';
    icon.className = 'fa-solid fa-arrow-down';
    text.textContent = 'Lower number please! 📉';
    if (guess < gameState.maxPossible) gameState.maxPossible = guess - 1;
    gameState.history.unshift({ guess, type: 'lower', icon: '↓' });
  } else if (guess < gameState.targetNumber) {
    playTone('hint');
    banner.className = 'feedback-banner higher';
    icon.className = 'fa-solid fa-arrow-up';
    text.textContent = 'Higher number please! 📈';
    if (guess > gameState.minPossible) gameState.minPossible = guess + 1;
    gameState.history.unshift({ guess, type: 'higher', icon: '↑' });
  } else {
    // CONGRATS - WON!
    playTone('win');
    gameState.isGameOver = true;
    banner.className = 'feedback-banner correct';
    icon.className = 'fa-solid fa-trophy';
    text.textContent = `Congrats!! You guessed it in ${gameState.guessesCount} guesses! 🎉`;

    document.getElementById('mystery-box').classList.add('won');
    document.getElementById('box-display').textContent = gameState.targetNumber;

    const statusEl = document.getElementById('game-status');
    statusEl.textContent = 'Solved! 🏆';
    statusEl.style.color = 'var(--green)';

    input.disabled = true;
    document.getElementById('btn-submit').innerHTML = '<span>PLAY AGAIN</span> <i class="fa-solid fa-rotate-right"></i>';

    gameState.history.unshift({ guess, type: 'correct', icon: '★' });

    // Save best score
    const currentBest = gameState.bestScores[gameState.maxRange];
    if (!currentBest || gameState.guessesCount < currentBest) {
      gameState.bestScores[gameState.maxRange] = gameState.guessesCount;
      localStorage.setItem('ng_bests', JSON.stringify(gameState.bestScores));
      updateBestScoreDisplay();
    }
  }

  document.getElementById('current-range-scope').textContent = `${gameState.minPossible} – ${gameState.maxPossible}`;
  renderHistory();
  input.value = '';
  input.focus();
}

function renderHistory() {
  const container = document.getElementById('history-tags');
  if (gameState.history.length === 0) {
    container.innerHTML = '<span class="no-history-hint">No guesses yet</span>';
    return;
  }

  container.innerHTML = gameState.history.map(item => `
    <span class="guess-tag ${item.type}">
      ${item.guess} <small>${item.icon}</small>
    </span>
  `).join('');
}

function setFeedback(msg, type) {
  const banner = document.getElementById('feedback-banner');
  banner.className = `feedback-banner ${type}`;
  document.getElementById('feedback-text').textContent = msg;
}
