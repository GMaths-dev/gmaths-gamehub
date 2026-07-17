/* ==========================================================================
  Fishing Math - Main game logic
============================================================================ */

(function () {
  "use strict";

  const FM = (window.FishingMath = window.FishingMath || {});
  const byId = FM.byId || ((id) => document.getElementById(id));

  // ====== CONFIG ======
  const FISH_SPRITES = [
    "./assets/fish 1.png",
    "./assets/fish 2.png",
    "./assets/fish 3.png",
    "./assets/fish 4.png",
    "./assets/fish 5.png",
    "./assets/fish 6.png",
    "./assets/fish 7.png",
  ];

  const PRAISE = ["Great job!", "Awesome!", "Well done!", "Nice catch!", "You got it!"];
  const ENCOURAGE = ["Try again!", "Almost!", "Not yet, keep trying!", "Oops, try again!", "You can do it!"];

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ====== STATE ======
  let device = "phone";
  let refs = null;

  let qIndex = 0;
  let coins = 0;
  let targetCoins = 5;

  let soundOn = true;
  let started = false;

  let locked = false;
  let currentSpritesByKey = { A: null, B: null, C: null };

  // ====== HỆ THỐNG QUẢN LÝ AUDIO MP3 ======
  let currentVoiceAudio = null;
  let questionAudioTimeout = null;

  function playVoice(filename) {
    if (!soundOn || !filename) return;
    
    if (currentVoiceAudio) {
      currentVoiceAudio.pause();
      currentVoiceAudio.currentTime = 0;
    }
    
    currentVoiceAudio = new Audio('./' + filename);
    currentVoiceAudio.play().catch(e => console.log("Lỗi phát audio:", e));
  }

  // ====== UI REFS ======
  const sceneRoot = byId("sceneRoot");
  const coinsEl = byId("coins");
  const coinsTargetEl = byId("coinsTarget");
  const qIndexEl = byId("questionIndex");
  const qTotalEl = byId("questionTotal");

  const soundBtn = byId("soundBtn");
  const soundStateEl = byId("soundState");
  const restartBtn = byId("restartBtn");

  const winOverlay = byId("winOverlay");
  const confettiRoot = byId("confettiRoot");
  const playAgainBtn = byId("playAgainBtn");

  function setSoundUI() {
    if(soundStateEl) soundStateEl.textContent = soundOn ? "On" : "Off";
  }

  function setHudUI() {
    if(coinsEl) coinsEl.textContent = String(coins);
    if(coinsTargetEl) coinsTargetEl.textContent = String(targetCoins);
    if(qIndexEl) qIndexEl.textContent = String(Math.min(qIndex + 1, targetCoins));
    if(qTotalEl) qTotalEl.textContent = String(targetCoins);
  }

  function hideWin() {
    if(winOverlay) winOverlay.classList.add("hidden");
  }

  function showWin() {
    if(winOverlay) winOverlay.classList.remove("hidden");
    if(FM.spawnConfetti) FM.spawnConfetti(confettiRoot, 55);
  }

  // ====== RENDER LAYOUT ======
  function renderLayout() {
    const layout = FM.layouts?.[device] || FM.layouts?.phone;
    if (!layout) return;

    if(FM.setDeviceCss) FM.setDeviceCss(device);
    refs = layout.render(sceneRoot);

    if(refs.fishA) refs.fishA.addEventListener("click", onFishClick);
    if(refs.fishB) refs.fishB.addEventListener("click", onFishClick);
    if(refs.fishC) refs.fishC.addEventListener("click", onFishClick);
  }

  // ====== QUESTION FLOW ======
  function applyRandomSlots() {
    if(!FM.shuffle) return;
    const slots = FM.shuffle(["slot-1", "slot-2", "slot-3"]);
    const map = { A: slots[0], B: slots[1], C: slots[2] };

    [refs.fishA, refs.fishB, refs.fishC].forEach((btn) => {
      if(btn) btn.classList.remove("slot-1", "slot-2", "slot-3");
    });

    if(refs.fishA) refs.fishA.classList.add(map.A);
    if(refs.fishB) refs.fishB.classList.add(map.B);
    if(refs.fishC) refs.fishC.classList.add(map.C);
  }

  function applyRandomFishSprites() {
    if(!FM.sampleUnique) return;
    const sprites = FM.sampleUnique(FISH_SPRITES, 3);
    currentSpritesByKey = { A: sprites[0], B: sprites[1], C: sprites[2] };

    if(refs.fishAImg) refs.fishAImg.src = currentSpritesByKey.A;
    if(refs.fishBImg) refs.fishBImg.src = currentSpritesByKey.B;
    if(refs.fishCImg) refs.fishCImg.src = currentSpritesByKey.C;
  }

  function renderQuestion(isFirstTime = false) {
    const qs = FM.questions || [];
    targetCoins = qs.length || 5;

    setHudUI();
    hideWin();

    const q = qs[qIndex];
    if (!q) return;

    if(refs.questionText) refs.questionText.textContent = q.prompt;
    if(refs.optA) refs.optA.textContent = q.options.A;
    if(refs.optB) refs.optB.textContent = q.options.B;
    if(refs.optC) refs.optC.textContent = q.options.C;

    [refs.fishA, refs.fishB, refs.fishC].forEach((btn) => {
      if(btn) {
        btn.classList.remove("is-wrong", "is-caught");
        btn.disabled = false;
        btn.setAttribute("aria-disabled", "false");
      }
    });

    applyRandomSlots();
    applyRandomFishSprites();

    if (started) {
      clearTimeout(questionAudioTimeout);
      
      if (isFirstTime) {
        playVoice(q.audio);
      } else {
        questionAudioTimeout = setTimeout(() => {
          playVoice(q.audio);
        }, 800);
      }
    }
  }

  function nextQuestionOrWin() {
    if (coins >= targetCoins) {
      showWin();
      return;
    }
    qIndex = Math.min(qIndex + 1, targetCoins - 1);
    renderQuestion(false); 
  }

  // ====== ANIMATION: FISH FLY TO FISHERMAN ======
  function flyFishToFisher(btn) {
    const spriteWrap = btn.querySelector(".fish__sprite");
    const imgEl = spriteWrap?.querySelector("img");
    if (!spriteWrap || !imgEl || !refs.fisherTarget) {
      nextQuestionOrWin();
      return;
    }

    const r0 = spriteWrap.getBoundingClientRect();
    const rt = refs.fisherTarget.getBoundingClientRect();

    const fly = document.createElement("div");
    fly.className = "flyFish";
    fly.style.left = r0.left + "px";
    fly.style.top = r0.top + "px";
    fly.style.width = r0.width + "px";
    fly.style.height = r0.height + "px";

    const img = document.createElement("img");
    img.src = imgEl.src;
    img.alt = "";
    fly.appendChild(img);
    document.body.appendChild(fly);

    const endX = rt.left + rt.width / 2 - (r0.left + r0.width / 2);
    const endY = rt.top + rt.height / 2 - (r0.top + r0.height / 2);

    requestAnimationFrame(() => {
      fly.classList.add("flyFish--go");
      fly.style.transform = `translate(${endX}px, ${endY}px) scale(0.18) rotate(-12deg)`;
      fly.style.opacity = "0.25";
    });

    const done = () => {
      fly.removeEventListener("transitionend", done);
      fly.remove();
      nextQuestionOrWin();
    };
    fly.addEventListener("transitionend", done);
  }

  // ====== INPUT HANDLER ======
  function onFishClick(e) {
    if (locked) return;
    const btn = e.currentTarget;
    const key = btn.dataset.key;

    const q = FM.questions?.[qIndex];
    if (!q) return;

    if (key === q.correctKey) {
      // ===== TRẢ LỜI ĐÚNG =====
      locked = true;
      [refs.fishA, refs.fishB, refs.fishC].forEach((b) => { if(b) b.disabled = true; });
      btn.classList.add("is-caught");

      if(FM.playTing) FM.playTing(soundOn);
      if (soundOn && FM.speakEnglish) FM.speakEnglish(pick(PRAISE), true);

      setTimeout(() => {
        coins += 1;
        setHudUI();
        flyFishToFisher(btn);
        setTimeout(() => {
          locked = false;
        }, 850);
      }, 140);

    } else {
      // ===== TRẢ LỜI SAI =====
      locked = true;
      btn.classList.add("is-wrong");
      if(FM.playBuzz) FM.playBuzz(soundOn);
      if (soundOn && FM.speakEnglish) FM.speakEnglish(pick(ENCOURAGE), true);

      setTimeout(() => btn.classList.remove("is-wrong"), 420);

      setTimeout(() => {
        locked = false;
      }, 800);
    }
  }

  // ====== START / RESTART ======
  function startGame() {
    if (started) return;
    started = true;
    if(FM.unlockAudio) FM.unlockAudio(); 
    renderQuestion(true); 
  }

  function resetGame() {
    locked = false;
    qIndex = 0;
    coins = 0;
    
    if (currentVoiceAudio) currentVoiceAudio.pause();
    try { window.speechSynthesis?.cancel?.(); } catch {}
    clearTimeout(questionAudioTimeout);
    
    hideWin();
    setHudUI();
    renderQuestion(true); 
  }

  // ====== INIT ======
  function init() {
    if(FM.detectDevice) device = FM.detectDevice();
    renderLayout();

    const qs = FM.questions || [];
    targetCoins = qs.length || 5;
    setHudUI();
    setSoundUI();

    hideWin();

    if(soundBtn) {
      soundBtn.addEventListener("click", () => {
        soundOn = !soundOn;
        setSoundUI();
        if (!soundOn) {
          if (currentVoiceAudio) currentVoiceAudio.pause();
          try { window.speechSynthesis?.cancel?.(); } catch {}
          clearTimeout(questionAudioTimeout);
        } else if (started) {
          const q = FM.questions?.[qIndex];
          if (q) playVoice(q.audio);
        }
      });
    }

    if(restartBtn) {
      restartBtn.addEventListener("click", () => {
        resetGame();
      });
    }

    if(playAgainBtn) {
      playAgainBtn.addEventListener("click", () => {
        hideWin();
        resetGame();
      });
    }

    let lastDevice = device;
    window.addEventListener("resize", () => {
      if(FM.detectDevice) {
        const d = FM.detectDevice();
        if (d !== lastDevice) {
          lastDevice = d;
          device = d;
          renderLayout();
          renderQuestion(false);
        }
      }
    });

    // ---------- KHỞI CHẠY HỆ THỐNG PASSWORD BẢO MẬT TỰ ĐỘNG ----------
    initPasswordSystem();
  }

  /* ==========================================================================
     HỆ THỐNG BẢO MẬT (PASSWORD) - AUTO INJECT
     ========================================================================== */
  function initPasswordSystem() {
    const SECRET_CODES = [71, 77, 97, 116, 104, 115, 103, 97, 109, 101, 115, 64, 50, 48, 50, 54]; // GMathsgames@2026
    
    let loginOverlay = document.getElementById("login-overlay");
    if (!loginOverlay) {
      loginOverlay = document.createElement("div");
      loginOverlay.id = "login-overlay";
      loginOverlay.innerHTML = `
        <div class="login-box">
          <img src="./assets/logo gmaths.png" class="login-logo" alt="GMaths Logo" onerror="this.style.display='none'">
          <h1>Fishing Math</h1>
          <p class="desc">Help the fisherman catch the correct fish to earn 5 coins!</p>
          
          <div class="login-divider"></div>
          
          <h2>Enter secret password to play game!</h2>
          <input type="password" id="password-input" placeholder="Typing..." />
          <button id="login-btn">Let's Go!</button>
          <p id="login-error">Wrong, try again!</p>
        </div>
      `;
      document.body.appendChild(loginOverlay);
    }

    const appRoot = document.getElementById("app");
    if (appRoot) {
      appRoot.classList.add("blurred");
    }

    const passwordInput = document.getElementById("password-input");
    const loginBtn = document.getElementById("login-btn");
    const loginError = document.getElementById("login-error");

    function checkPassword() {
      const inputVal = passwordInput.value;
      
      let isCorrect = inputVal.length === SECRET_CODES.length;
      if (isCorrect) {
        for (let i = 0; i < inputVal.length; i++) {
          if (inputVal.charCodeAt(i) !== SECRET_CODES[i]) {
            isCorrect = false;
            break;
          }
        }
      }

      if (isCorrect) {
        // Đúng mật khẩu -> Xóa giao diện bảo mật, bỏ mờ và BẮT ĐẦU GAME LUÔN
        loginOverlay.style.display = "none";
        if(appRoot) appRoot.classList.remove("blurred");
        startGame(); // Gọi luôn startGame để unlock audio và phát nhạc
      } else {
        // Sai mật khẩu -> Báo đỏ
        loginError.style.opacity = "1";
        passwordInput.value = "";
        passwordInput.focus();
        
        setTimeout(() => {
          loginError.style.opacity = "0";
        }, 2000);
      }
    }

    if(loginBtn && passwordInput) {
      loginBtn.addEventListener("click", checkPassword);
      passwordInput.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
          event.preventDefault();
          checkPassword();
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();