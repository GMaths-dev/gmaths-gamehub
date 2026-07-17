(function () {
  "use strict";

  const root = window;
  root.HomeworkFix = root.HomeworkFix || {};
  const HF = root.HomeworkFix;

  HF.byId = function (id) { return document.getElementById(id); };

  HF.detectDevice = function () {
    const w = Math.min(window.innerWidth || 0, window.screen?.width || 0) || window.innerWidth || 0;
    if (w < 600) return "phone";
    if (w < 1024) return "tablet";
    return "desktop";
  };

  HF.setDeviceCss = function (device) {
    const link = document.getElementById("deviceCss");
    if (!link) return;
    const map = {
      phone: "./styles/phone.css",
      tablet: "./styles/tablet.css",
      desktop: "./styles/desktop.css",
    };
    link.setAttribute("href", map[device] || map.phone);
    document.documentElement.dataset.device = device;
  };

  HF.spawnConfetti = function (rootEl, count) {
    if (!rootEl) return;
    rootEl.innerHTML = "";
    const n = count || 40;
    const colors = ["#ffd166", "#ff8b4d", "#57c7ff", "#35b46a", "#ffffff"];
    for (let i = 0; i < n; i++) {
      const piece = document.createElement("div");
      piece.className = "confetti__piece";
      piece.style.left = Math.random() * 100 + "%";
      piece.style.top = (-10 - Math.random() * 40) + "px";
      piece.style.background = colors[i % colors.length];
      piece.style.transform = `translateY(-20px) rotate(${Math.random() * 180}deg)`;
      piece.style.animationDelay = (Math.random() * 0.3).toFixed(2) + "s";
      piece.style.animationDuration = (1.2 + Math.random() * 1.2).toFixed(2) + "s";
      rootEl.appendChild(piece);
    }
  };

  HF.audio = {
    enabled: true,
    _map: new Map(),

    preload(list) {
      (list || []).forEach(({ key, src }) => {
        if (!key || !src) return;
        const a = new Audio(src);
        a.preload = "auto";
        this._map.set(key, a);
      });
    },

    play(key) {
      if (!this.enabled) return;
      const a = this._map.get(key);
      if (!a) return;
      try {
        a.pause();
        a.currentTime = 0;
        a.play().catch(() => {});
      } catch {}
    },
  };
})();
