/* ==========================================================================
  Layout: DESKTOP
============================================================================ */

(function () {
  "use strict";

  const FM = (window.FishingMath = window.FishingMath || {});
  FM.layouts = FM.layouts || {};
  const byId = FM.byId || ((id) => document.getElementById(id));

  FM.layouts.desktop = {
    id: "desktop",
    cssHref: "./styles/desktop.css",

    render(sceneRoot) {
      sceneRoot.innerHTML = `
        <div class="scene__content scene__content--desktop">
          <div class="questionCard" role="status" aria-live="polite">
            <div class="questionCard__label">Question</div>
            <div class="questionCard__text" id="questionText">Loading...</div>
          </div>

          <div class="fisherWrap" aria-label="Fisherman">
            <img class="fisherman" id="fishermanImg" src="./assets/fisherman.png" alt="Fisherman" />
            <div class="fisherTarget" id="fisherTarget" aria-hidden="true"></div>
          </div>

          <div class="fishLayer" id="fishLayer" aria-label="Answer fish choices">
            <button class="fish slot-1" id="fishA" type="button" data-key="A" aria-label="Choose answer A">
              <div class="fish__sprite" aria-hidden="true"><img id="fishAImg" alt="" /></div>
              <div class="fish__bubble">
                <div class="fish__key">A</div>
                <div class="fish__value" id="optA">0</div>
              </div>
            </button>

            <button class="fish slot-2" id="fishB" type="button" data-key="B" aria-label="Choose answer B">
              <div class="fish__sprite" aria-hidden="true"><img id="fishBImg" alt="" /></div>
              <div class="fish__bubble">
                <div class="fish__key">B</div>
                <div class="fish__value" id="optB">0</div>
              </div>
            </button>

            <button class="fish slot-3" id="fishC" type="button" data-key="C" aria-label="Choose answer C">
              <div class="fish__sprite" aria-hidden="true"><img id="fishCImg" alt="" /></div>
              <div class="fish__bubble">
                <div class="fish__key">C</div>
                <div class="fish__value" id="optC">0</div>
              </div>
            </button>
          </div>
        </div>
      `;

      return {
        questionText: byId("questionText"),
        fishLayer: byId("fishLayer"),
        fishA: byId("fishA"),
        fishB: byId("fishB"),
        fishC: byId("fishC"),
        fishAImg: byId("fishAImg"),
        fishBImg: byId("fishBImg"),
        fishCImg: byId("fishCImg"),
        optA: byId("optA"),
        optB: byId("optB"),
        optC: byId("optC"),
        fishermanImg: byId("fishermanImg"),
        fisherTarget: byId("fisherTarget"),
      };
    },
  };
})();