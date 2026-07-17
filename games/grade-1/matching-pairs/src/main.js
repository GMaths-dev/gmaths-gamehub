/* ==========================================================================
  Matching Pairs - Main logic
============================================================================ */

(function () {
  "use strict";

  const MP = (window.MatchingPairs = window.MatchingPairs || {});

  const state = {
    device: "phone",
    refs: null,
    soundOn: true,
    fullscreen: false,
    started: false,
    locked: true,
    moves: 0,
    pairsMatched: 0,
    flippedIds: [],
    matchedKeys: new Set(),
    cards: [],
    pendingTimeout: null,
    sfx: {
      correct: null,
      wrong: null,
    },
  };

  function init() {
    preloadAudio();
    renderLayout();
    bindUI();
    initPasswordSystem();
  }

  function preloadAudio() {
    state.sfx.correct = new Audio("./assets/sounds/correct.mp3");
    state.sfx.wrong = new Audio("./assets/sounds/wrong.mp3");

    Object.values(state.sfx).forEach((audio) => {
      if (audio) audio.preload = "auto";
    });
  }

  function renderLayout() {
    const sceneRoot = MP.byId("sceneRoot");
    if (!sceneRoot || !MP.layouts) return;

    const device = MP.detectDevice ? MP.detectDevice() : "phone";
    state.device = device;
    MP.setDeviceCss?.(device);

    const layout = MP.layouts[device] || MP.layouts.phone || MP.layouts.desktop;
    state.refs = layout.render(sceneRoot);

    if (state.started) {
      renderBoard();
      updateHud();
    }
  }

  function bindUI() {
    const soundBtn = MP.byId("soundBtn");
    const fullscreenBtn = MP.byId("fullscreenBtn");
    const restartBtn = MP.byId("restartBtn");
    const playAgainBtn = MP.byId("playAgainBtn");

    if (soundBtn) {
      soundBtn.addEventListener("click", () => {
        state.soundOn = !state.soundOn;
        updateHud();
      });
    }

    if (fullscreenBtn) {
      fullscreenBtn.addEventListener("click", () => {
        toggleFullscreen();
      });
    }

    if (restartBtn) {
      restartBtn.addEventListener("click", () => {
        if (!state.started) return;
        resetGame();
      });
    }

    if (playAgainBtn) {
      playAgainBtn.addEventListener("click", () => {
        hideWin();
        resetGame();
      });
    }

    let lastDevice = state.device;
    window.addEventListener("resize", () => {
      const nextDevice = MP.detectDevice ? MP.detectDevice() : state.device;
      if (nextDevice !== lastDevice) {
        lastDevice = nextDevice;
        renderLayout();
      }
    });

    // sync fullscreen state when user presses F11 or uses other controls
    document.addEventListener("fullscreenchange", () => {
      state.fullscreen = !!document.fullscreenElement;
      updateHud();
    });
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }

  function buildDeck() {
    const pairs = Array.isArray(MP.pairs) ? MP.pairs : [];
    const deck = [];

    pairs.forEach((pair) => {
      deck.push({
        id: `${pair.key}-number`,
        pairKey: pair.key,
        type: "Number",
        value: pair.number,
        icon: pair.icon || "🔢",
      });

      deck.push({
        id: `${pair.key}-word`,
        pairKey: pair.key,
        type: "Word",
        value: pair.word,
        icon: pair.icon || "🔤",
      });
    });

    return MP.shuffle ? MP.shuffle(deck) : deck;
  }

  function renderBoard() {
    const board = state.refs?.board;
    if (!board) return;

    board.innerHTML = "";
    state.cards.forEach((card) => {
      board.appendChild(createCardElement(card));
    });
  }

  function createCardElement(card) {
    const btn = document.createElement("button");
    btn.className = "memoryCard";
    btn.type = "button";
    btn.dataset.cardId = card.id;
    btn.dataset.pairKey = card.pairKey;
    btn.setAttribute("aria-label", `${card.type} card`);

    if (state.matchedKeys.has(card.pairKey)) {
      btn.classList.add("is-matched");
      btn.disabled = true;
    } else if (state.flippedIds.includes(card.id)) {
      btn.classList.add("is-flipped");
    }

    btn.innerHTML = `
      <div class="memoryCard__inner">
        <div class="memoryCard__face memoryCard__face--back">
          <div class="memoryCard__sparkles">★</div>
        </div>
        <div class="memoryCard__face memoryCard__face--front">
          <div class="memoryCard__badge">Matched</div>
          <div class="memoryCard__content">
            <div class="memoryCard__pairHint">${card.icon || "✨"}</div>
            <div class="memoryCard__type">${card.type}</div>
            <div class="memoryCard__value">${card.value}</div>
          </div>
        </div>
      </div>
    `;

    btn.addEventListener("click", onCardClick);
    return btn;
  }

  function onCardClick(event) {
    if (state.locked) return;

    const btn = event.currentTarget;
    const cardId = btn.dataset.cardId;
    const pairKey = btn.dataset.pairKey;

    if (!cardId || state.flippedIds.includes(cardId) || state.matchedKeys.has(pairKey)) return;
    if (state.flippedIds.length >= 2) return;

    MP.unlockAudio?.();

    state.flippedIds.push(cardId);
    btn.classList.add("is-flipped");

    if (state.flippedIds.length < 2) {
      setHelperText("Now find the matching card.");
      return;
    }

    state.locked = true;
    state.moves += 1;
    updateHud();

    const [first, second] = state.flippedIds.map(findCardById);
    if (!first || !second) {
      finishMismatch();
      return;
    }

    if (first.pairKey === second.pairKey && first.id !== second.id) {
      handleMatch(first.pairKey);
    } else {
      handleMismatch();
    }
  }

  function handleMatch(pairKey) {
    state.matchedKeys.add(pairKey);
    state.pairsMatched = state.matchedKeys.size;

    MP.playAudio?.(state.sfx.correct, state.soundOn, MP.playFallbackCorrect);
    setHelperText("Nice! That pair matches.");

    const openCards = document.querySelectorAll(`.memoryCard[data-pair-key="${pairKey}"]`);
    openCards.forEach((el) => {
      el.classList.add("is-matched");
      el.disabled = true;
    });

    state.flippedIds = [];
    updateHud();

    setTimeout(() => {
      state.locked = false;
      if (state.pairsMatched >= getTargetPairs()) {
        showWin();
      }
    }, 450);
  }

  function handleMismatch() {
    MP.playAudio?.(state.sfx.wrong, state.soundOn, MP.playFallbackWrong);
    setHelperText("Oops! Try again.");

    clearTimeout(state.pendingTimeout);
    state.pendingTimeout = setTimeout(() => {
      const currentFlipped = state.flippedIds.slice();
      currentFlipped.forEach((id) => {
        const el = document.querySelector(`.memoryCard[data-card-id="${id}"]`);
        el?.classList.remove("is-flipped");
      });
      finishMismatch();
    }, 900);
  }

  function finishMismatch() {
    state.flippedIds = [];
    state.locked = false;
    setHelperText("Find the number card and its matching word card.");
  }

  function findCardById(id) {
    return state.cards.find((card) => card.id === id) || null;
  }

  function getTargetPairs() {
    return Array.isArray(MP.pairs) ? MP.pairs.length : 0;
  }

  function updateHud() {
    const pairsMatched = MP.byId("pairsMatched");
    const pairsTarget = MP.byId("pairsTarget");
    const movesCount = MP.byId("movesCount");
    const soundState = MP.byId("soundState");
    const fullscreenState = MP.byId("fullscreenState");
    const finalMoves = MP.byId("finalMoves");

    if (pairsMatched) pairsMatched.textContent = String(state.pairsMatched);
    if (pairsTarget) pairsTarget.textContent = String(getTargetPairs());
    if (movesCount) movesCount.textContent = String(state.moves);
    if (soundState) soundState.textContent = state.soundOn ? "On" : "Off";
    if (fullscreenState) fullscreenState.textContent = state.fullscreen ? "On" : "Off";
    if (finalMoves) finalMoves.textContent = String(state.moves);
  }

  function setHelperText(text) {
    if (state.refs?.helperText) {
      state.refs.helperText.textContent = text;
    }
  }

  function showWin() {
    const overlay = MP.byId("winOverlay");
    if (!overlay) return;
    overlay.classList.remove("hidden");
    updateHud();
    MP.spawnConfetti?.(MP.byId("confettiRoot"), 48);
    setHelperText("You matched all pairs!");
    state.locked = true;
  }

  function hideWin() {
    const overlay = MP.byId("winOverlay");
    if (overlay) overlay.classList.add("hidden");
    const confettiRoot = MP.byId("confettiRoot");
    if (confettiRoot) confettiRoot.innerHTML = "";
  }

  function startGame() {
    if (state.started) return;
    state.started = true;
    MP.unlockAudio?.();
    resetGame();
  }

  function resetGame() {
    clearTimeout(state.pendingTimeout);
    state.pendingTimeout = null;
    hideWin();

    state.moves = 0;
    state.pairsMatched = 0;
    state.flippedIds = [];
    state.matchedKeys = new Set();
    state.cards = buildDeck();
    state.locked = false;

    renderBoard();
    updateHud();
    setHelperText("Find the number card and its matching word card.");
  }

  function initPasswordSystem() {
    const SECRET_CODES = [71, 77, 97, 116, 104, 115, 103, 97, 109, 101, 115, 64, 50, 48, 50, 54];

    const loginOverlay = MP.byId("login-overlay");
    const appRoot = MP.byId("app");
    const passwordInput = MP.byId("password-input");
    const loginBtn = MP.byId("login-btn");
    const loginError = MP.byId("login-error");

    if (!loginOverlay || !passwordInput || !loginBtn) return;

    function checkPassword() {
      const inputVal = passwordInput.value;

      let isCorrect = inputVal.length === SECRET_CODES.length;
      if (isCorrect) {
        for (let i = 0; i < inputVal.length; i += 1) {
          if (inputVal.charCodeAt(i) !== SECRET_CODES[i]) {
            isCorrect = false;
            break;
          }
        }
      }

      if (isCorrect) {
        loginOverlay.style.display = "none";
        appRoot?.classList.remove("blurred");
        startGame();
      } else {
        if (loginError) loginError.style.opacity = "1";
        passwordInput.value = "";
        passwordInput.focus();

        setTimeout(() => {
          if (loginError) loginError.style.opacity = "0";
        }, 2000);
      }
    }

    loginBtn.addEventListener("click", checkPassword);
    passwordInput.addEventListener("keypress", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        checkPassword();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
