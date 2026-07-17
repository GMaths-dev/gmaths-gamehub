/* ==========================================================================
  Layout: DESKTOP
============================================================================ */

(function () {
  "use strict";

  const MP = (window.MatchingPairs = window.MatchingPairs || {});
  MP.layouts = MP.layouts || {};
  const byId = MP.byId || ((id) => document.getElementById(id));

  MP.layouts.desktop = {
    id: "desktop",
    cssHref: "./styles/desktop.css",

    render(sceneRoot) {
      sceneRoot.innerHTML = `
        <div class="scene__content scene__content--desktop">
          <div class="questionCard" role="status" aria-live="polite">
            <div class="questionCard__label">Matching Pairs</div>
            <div class="questionCard__text" id="questionText">Match each number with the correct word.</div>
            <div class="questionCard__sub">Tap 2 cards. Find all 5 pairs.</div>
          </div>

          <div class="boardWrap" aria-label="Matching cards board">
            <div class="board" id="board"></div>
          </div>

          <div class="helperText" id="helperText">Find the number card and its matching word card.</div>
        </div>
      `;

      return {
        board: byId("board"),
        questionText: byId("questionText"),
        helperText: byId("helperText"),
      };
    },
  };
})();
