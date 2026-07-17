/* ==========================================================================
  Matching Pairs - Utils dùng chung
============================================================================ */

(function () {
  "use strict";

  const root = window;
  root.MatchingPairs = root.MatchingPairs || {};
  const MP = root.MatchingPairs;

  MP.byId = function byId(id) {
    return document.getElementById(id);
  };

  MP.shuffle = function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  MP.detectDevice = function detectDevice() {
    const w = Math.min(window.innerWidth || 0, window.screen?.width || 0) || window.innerWidth || 0;
    if (w < 600) return "phone";
    if (w < 1024) return "tablet";
    return "desktop";
  };

  MP.setDeviceCss = function setDeviceCss(device) {
    const link = MP.byId("deviceCss");
    if (!link) return;
    const map = {
      phone: "./styles/phone.css",
      tablet: "./styles/tablet.css",
      desktop: "./styles/desktop.css",
    };
    link.setAttribute("href", map[device] || map.phone);
    document.documentElement.dataset.device = device;
  };

  MP.spawnConfetti = function spawnConfetti(confettiRoot, count) {
    if (!confettiRoot) return;
    confettiRoot.innerHTML = "";
    const n = count || 42;
    const colors = ["#ffcc33", "#ff5fa2", "#29b6ff", "#20c997", "#ffffff", "#9bde6d"];

    for (let i = 0; i < n; i++) {
      const piece = document.createElement("div");
      piece.className = "confetti__piece";
      piece.style.left = Math.random() * 100 + "%";
      piece.style.top = (-10 - Math.random() * 40) + "px";
      piece.style.background = colors[i % colors.length];
      piece.style.transform = `translateY(-20px) rotate(${Math.random() * 180}deg)`;
      piece.style.animationDelay = (Math.random() * 0.3).toFixed(2) + "s";
      piece.style.animationDuration = (1.2 + Math.random() * 1.1).toFixed(2) + "s";
      confettiRoot.appendChild(piece);
    }
  };

  let audioCtx = null;
  let audioUnlocked = false;

  function getAudioCtx() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    return audioCtx;
  }

  MP.unlockAudio = function unlockAudio() {
    if (audioUnlocked) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    ctx.resume?.().catch(() => {});
    audioUnlocked = true;
  };

  function tone({ type, freq, durationMs, gainStart, gainEnd }) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);

    gain.gain.setValueAtTime(gainStart, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(gainEnd, 0.0001), t0 + durationMs / 1000);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t0);
    osc.stop(t0 + durationMs / 1000);
  }

  MP.playFallbackCorrect = function playFallbackCorrect(enabled) {
    if (!enabled) return;
    MP.unlockAudio();
    tone({ type: "sine", freq: 1046, durationMs: 120, gainStart: 0.12, gainEnd: 0.0001 });
    setTimeout(() => tone({ type: "sine", freq: 1318, durationMs: 140, gainStart: 0.09, gainEnd: 0.0001 }), 65);
  };

  MP.playFallbackWrong = function playFallbackWrong(enabled) {
    if (!enabled) return;
    MP.unlockAudio();
    tone({ type: "sawtooth", freq: 180, durationMs: 120, gainStart: 0.06, gainEnd: 0.0001 });
    setTimeout(() => tone({ type: "sawtooth", freq: 140, durationMs: 130, gainStart: 0.05, gainEnd: 0.0001 }), 50);
  };

  MP.playAudio = function playAudio(audioEl, enabled, fallback) {
    if (!enabled) return;
    MP.unlockAudio();

    if (!audioEl) {
      fallback?.(enabled);
      return;
    }

    try {
      audioEl.pause();
      audioEl.currentTime = 0;
      const promise = audioEl.play();
      if (promise && typeof promise.catch === "function") {
        promise.catch(() => fallback?.(enabled));
      }
    } catch (_) {
      fallback?.(enabled);
    }
  };
})();
