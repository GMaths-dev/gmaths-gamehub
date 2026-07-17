(function () {
  "use strict";

  const HF = (window.HomeworkFix = window.HomeworkFix || {});
  const byId = HF.byId || ((id) => document.getElementById(id));

  const qIndexEl = byId("questionIndex");
  const qTotalEl = byId("questionTotal");
  const scoreValueEl = byId("scoreValue");
  const scoreTotalEl = byId("scoreTotal");
  const soundBtn = byId("soundBtn");
  const soundStateEl = byId("soundState");
  const retryBtn = byId("retryBtn");
  const startOverlay = byId("startOverlay");
  const startBtn = byId("startBtn");
  const winOverlay = byId("winOverlay");
  const playAgainBtn = byId("playAgainBtn");
  const confettiRoot = byId("confettiRoot");
  const sceneRoot = byId("sceneRoot");

  let device = "phone";
  let refs = null;

  let started = false;
  let locked = false;
  let qIndex = 0;
  let score = 0;
  let completed = false;
  let hintTimer = null;
  let successTimer = null;
  let helperTimer = null;

  const IDLE_TEXT = "Look at the picture and fix the homework.";

  function preloadAudio() {
    HF.audio.preload([
      { key: "correct", src: "./assets/sounds/correct.mp3" },
      { key: "wrong", src: "./assets/sounds/wrong.mp3" },
    ]);
  }

  function setHud() {
    const total = HF.questions?.length || 5;
    if (qIndexEl) qIndexEl.textContent = String(Math.min(qIndex + 1, total));
    if (qTotalEl) qTotalEl.textContent = String(total);
    if (scoreValueEl) scoreValueEl.textContent = String(score);
    if (scoreTotalEl) scoreTotalEl.textContent = String(total);
  }

  function setSoundUI() {
    if (soundStateEl) soundStateEl.textContent = HF.audio.enabled ? "On" : "Off";
  }

  function showStartOverlay() {
    startOverlay?.classList.remove("hidden");
    winOverlay?.classList.add("hidden");
  }

  function hideStartOverlay() {
    startOverlay?.classList.add("hidden");
  }

  function showWin() {
    winOverlay?.classList.remove("hidden");
    HF.spawnConfetti?.(confettiRoot, 60);
  }

  function hideWin() {
    winOverlay?.classList.add("hidden");
  }

  function clearTimers() {
    clearTimeout(hintTimer);
    clearTimeout(successTimer);
    clearTimeout(helperTimer);
  }

  function renderLayout() {
    const layout = HF.layouts?.[device] || HF.layouts?.phone;
    if (!layout) return;
    HF.setDeviceCss?.(device);
    refs = layout.render(sceneRoot);
    buildNumberButtons();
  }

  function buildNumberButtons() {
    if (!refs?.numberGrid) return;
    refs.numberGrid.innerHTML = "";
    for (let i = 1; i <= 10; i += 1) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "numberBtn";
      btn.textContent = String(i);
      btn.dataset.value = String(i);
      btn.setAttribute("aria-label", `Choose number ${i}`);
      btn.addEventListener("click", onNumberClick);
      refs.numberGrid.appendChild(btn);
    }
  }

  function setFeedback(text, mode) {
    if (!refs?.feedbackText) return;
    refs.feedbackText.textContent = text;
    refs.feedbackText.classList.remove("is-idle", "is-good", "is-hint");
    refs.feedbackText.classList.add(mode || "is-idle");
  }

  function setHelper(text, show) {
    if (!refs?.helperStrip) return;
    refs.helperStrip.textContent = text || "Count again!";
    refs.helperStrip.classList.toggle("show", !!show);
  }

  function renderSentence(q) {
    if (!refs?.sentenceText || !q) return;
    const safeSentence = q.sentence.replace(
      q.wrongWord,
      `<span class="wrongWord">${q.wrongWord}</span>`
    );
    refs.sentenceText.innerHTML = safeSentence;
  }

  function renderPicture(q) {
    if (!refs?.pictureBoard || !q) return;
    refs.pictureBoard.innerHTML = "";
    if (refs.pictureTitle) {
      refs.pictureTitle.textContent = `How many ${q.objectName} do you really see?`;
    }
  
    for (let i = 0; i < q.actualCount; i += 1) {
      const item = document.createElement("div");
      item.className = "countItem";
      item.textContent = q.objectEmoji;
      item.setAttribute("aria-label", `${q.objectName} ${i + 1}`);
      refs.pictureBoard.appendChild(item);
    }
  }

  function resetChoiceButtons() {
    refs?.numberGrid?.querySelectorAll(".numberBtn").forEach((btn) => {
      btn.disabled = false;
      btn.classList.remove("is-correct", "is-wrong");
    });
  }

  function setButtonsDisabled(disabled) {
    refs?.numberGrid?.querySelectorAll(".numberBtn").forEach((btn) => {
      btn.disabled = !!disabled;
    });
  }

  function showSticker(char) {
    if (!refs?.stickerBurst) return;
    refs.stickerBurst.textContent = char || "⭐";
    refs.stickerBurst.classList.remove("show");
    void refs.stickerBurst.offsetWidth;
    refs.stickerBurst.classList.add("show");
  }

  function renderQuestion() {
    const q = HF.questions?.[qIndex];
    if (!q) return;
    clearTimers();
    hideWin();
    setHud();
    renderSentence(q);
    renderPicture(q);
    resetChoiceButtons();
    refs?.picturePanel?.classList.remove("is-success");
    setHelper("Count again!", false);
    setFeedback(IDLE_TEXT, "is-idle");
    locked = false;
  }

  function animateCountHint(count, helperBase) {
    const items = Array.from(refs?.pictureBoard?.querySelectorAll(".countItem") || []);
    if (!items.length) return;

    setButtonsDisabled(true);
    setHelper(helperBase || "Count again!", true);
    setFeedback(`${helperBase || "Count again!"} 1...`, "is-hint");

    items.forEach((item) => item.classList.remove("is-pulsing"));

    items.forEach((item, idx) => {
      setTimeout(() => {
        items.forEach((el) => el.classList.remove("is-pulsing"));
        item.classList.add("is-pulsing");
        setFeedback(`${helperBase || "Count again!"} ${idx + 1}${idx + 1 < count ? "..." : "!"}`, "is-hint");
      }, idx * 320);
    });

    hintTimer = setTimeout(() => {
      items.forEach((item) => item.classList.remove("is-pulsing"));
      setButtonsDisabled(false);
      locked = false;
      setFeedback("Now tap the correct number.", "is-hint");
      helperTimer = setTimeout(() => {
        setHelper("Count again!", false);
      }, 700);
    }, (count * 320) + 420);
  }

  function nextQuestionOrWin() {
    const total = HF.questions?.length || 5;
    if (score >= total) {
      completed = true;
      showWin();
      return;
    }
    qIndex = Math.min(qIndex + 1, total - 1);
    renderQuestion();
  }

  function onCorrect(btn, q) {
    locked = true;
    setButtonsDisabled(true);
    btn.classList.add("is-correct");
    refs?.picturePanel?.classList.add("is-success");
    showSticker("🎉");
    setFeedback(q.successText || "Correct!", "is-good");
    HF.audio.play("correct");

    successTimer = setTimeout(() => {
      score += 1;
      setHud();
      nextQuestionOrWin();
    }, 920);
  }

  function onWrong(btn, q) {
    locked = true;
    btn.classList.add("is-wrong");
    HF.audio.play("wrong");
    animateCountHint(q.actualCount, q.hintText || "Count again!");
    setTimeout(() => btn.classList.remove("is-wrong"), 480);
  }

  function onNumberClick(event) {
    if (locked) return;
    const q = HF.questions?.[qIndex];
    if (!q) return;

    const btn = event.currentTarget;
    const value = Number(btn.dataset.value);

    if (value === q.actualCount) {
      onCorrect(btn, q);
    } else {
      onWrong(btn, q);
    }
  }

  function startGameplay() {
    hideStartOverlay();
    score = 0;
    qIndex = 0;
    completed = false;
    started = true;
    renderQuestion();
  }

  function resetGameToIntro() {
    clearTimers();
    score = 0;
    qIndex = 0;
    completed = false;
    locked = false;
    setHud();
    hideWin();
    renderQuestion();
    showStartOverlay();
  }

  function toggleSound() {
    HF.audio.enabled = !HF.audio.enabled;
    setSoundUI();
  }

  function bindUI() {
    soundBtn?.addEventListener("click", toggleSound);
    retryBtn?.addEventListener("click", resetGameToIntro);
    startBtn?.addEventListener("click", startGameplay);
    playAgainBtn?.addEventListener("click", resetGameToIntro);
  }

  function initPasswordSystem() {
    const SECRET_CODES = [71, 77, 97, 116, 104, 115, 103, 97, 109, 101, 115, 64, 50, 48, 50, 54];
    const loginOverlay = document.getElementById("login-overlay");
    const appRoot = document.getElementById("app");
    const passwordInput = document.getElementById("password-input");
    const loginBtn = document.getElementById("login-btn");
    const loginError = document.getElementById("login-error");

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
        if (appRoot) appRoot.classList.remove("blurred");
        showStartOverlay();
      } else {
        loginError.style.opacity = "1";
        passwordInput.value = "";
        passwordInput.focus();
        setTimeout(() => {
          loginError.style.opacity = "0";
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

  function init() {
    preloadAudio();
    device = HF.detectDevice?.() || "phone";
    renderLayout();
    setHud();
    setSoundUI();
    showStartOverlay();
    bindUI();

    let lastDevice = device;
    window.addEventListener("resize", () => {
      const d = HF.detectDevice?.() || "phone";
      if (d !== lastDevice) {
        lastDevice = d;
        device = d;
        renderLayout();
        if (started) {
          if (completed) {
            showWin();
          } else {
            renderQuestion();
          }
        }
      }
    });

    initPasswordSystem();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
