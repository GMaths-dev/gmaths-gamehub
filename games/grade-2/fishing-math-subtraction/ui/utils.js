/* ==========================================================================
  Fishing Math - Utils dùng chung
  - KHÔNG chứa layout (layout tách riêng trong ui/phone|tablet|desktop.js)
  - Chú thích tiếng Việt, dễ bảo trì
============================================================================ */

(function () {
  "use strict";

  const root = window;
  root.FishingMath = root.FishingMath || {};
  const FM = root.FishingMath;

  FM.byId = function byId(id) {
    return document.getElementById(id);
  };

  FM.clamp = function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  };

  // Fisher-Yates shuffle (xáo trộn)
  FM.shuffle = function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Lấy n phần tử khác nhau
  FM.sampleUnique = function sampleUnique(arr, n) {
    return FM.shuffle(arr).slice(0, Math.max(0, Math.min(n, arr.length)));
  };

  // Nhận diện thiết bị theo bề ngang
  FM.detectDevice = function detectDevice() {
    const w = Math.min(window.innerWidth || 0, window.screen?.width || 0) || window.innerWidth || 0;
    if (w < 600) return "phone";
    if (w < 1024) return "tablet";
    return "desktop";
  };

  FM.setDeviceCss = function setDeviceCss(device) {
    const link = FM.byId("deviceCss");
    if (!link) return;
    const map = {
      phone: "./styles/phone.css",
      tablet: "./styles/tablet.css",
      desktop: "./styles/desktop.css",
    };
    link.setAttribute("href", map[device] || map.phone);
    document.documentElement.dataset.device = device;
  };

  // ================= SpeechSynthesis (đọc tiếng Anh) =================
  let voicesReady = false;
  let cachedVoice = null;

  function pickEnglishVoice() {
    const voices = window.speechSynthesis?.getVoices?.() || [];
    const enUS = voices.find((v) => /^en-US/i.test(v.lang));
    if (enUS) return enUS;
    const en = voices.find((v) => /^en\b/i.test(v.lang));
    return en || null;
  }

  function ensureVoicesReady() {
    if (!window.speechSynthesis) return;
    if (voicesReady) return;
    cachedVoice = pickEnglishVoice();
    voicesReady = true;
  }

  if ("speechSynthesis" in window) {
    window.speechSynthesis.onvoiceschanged = function () {
      voicesReady = false;
      ensureVoicesReady();
    };
  }

  FM.toSpeakableEnglish = function toSpeakableEnglish(text) {
    return String(text || "")
      .replaceAll("+", " plus ")
      .replaceAll("=", " equals ")
      .replaceAll("?", " ?");
  };

  FM.speakEnglish = function speakEnglish(text, enabled) {
    if (!enabled) return;
    if (!("speechSynthesis" in window)) return;

    try {
      ensureVoicesReady();
      window.speechSynthesis.cancel();

      const utter = new SpeechSynthesisUtterance(FM.toSpeakableEnglish(text));
      if (cachedVoice) utter.voice = cachedVoice;
      utter.lang = cachedVoice?.lang || "en-US";
      utter.rate = 0.95;
      utter.pitch = 1.08;
      utter.volume = 1.0;
      window.speechSynthesis.speak(utter);
    } catch {
      // bị chặn thì bỏ qua
    }
  };

  // ================= WebAudio SFX (ting/buzz) =================
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

  FM.unlockAudio = function unlockAudio() {
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

  FM.playTing = function playTing(enabled) {
    if (!enabled) return;
    FM.unlockAudio();
    tone({ type: "sine", freq: 880, durationMs: 140, gainStart: 0.12, gainEnd: 0.0001 });
    setTimeout(() => tone({ type: "sine", freq: 1175, durationMs: 120, gainStart: 0.09, gainEnd: 0.0001 }), 70);
  };

  FM.playBuzz = function playBuzz(enabled) {
    if (!enabled) return;
    FM.unlockAudio();
    tone({ type: "sawtooth", freq: 140, durationMs: 180, gainStart: 0.06, gainEnd: 0.0001 });
  };

  // ================= Confetti (You Win) =================
  FM.spawnConfetti = function spawnConfetti(confettiRoot, count) {
    if (!confettiRoot) return;
    confettiRoot.innerHTML = "";
    const n = count || 40;
    const colors = ["#ffcc33", "#ff5fa2", "#29b6ff", "#20c997", "#ffffff"];

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
})();