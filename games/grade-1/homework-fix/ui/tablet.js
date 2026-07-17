(function () {
  "use strict";

  const HF = (window.HomeworkFix = window.HomeworkFix || {});
  HF.layouts = HF.layouts || {};
  const byId = HF.byId || ((id) => document.getElementById(id));

  function renderMarkup(sceneRoot) {
    sceneRoot.innerHTML = `
      <div class="scene__content scene__content--tablet">
        <div class="homeworkBoard">
          <div class="titleStrip"><div class="titleStrip__title">Fix the homework</div></div>

          <section class="sentenceCard" aria-live="polite">
            <div class="sentenceCard__top">
              <div class="sentenceCard__badge">Classmate's homework</div>
              <div class="helperStrip" id="helperStrip">Count again!</div>
            </div>
            <div class="sentenceCard__prompt" id="sentenceText">Loading...</div>
          </section>

          <section class="picturePanel" id="picturePanel" aria-label="Picture counting board">
            <div class="picturePanel__title" id="pictureTitle">Count the picture.</div>
            <div class="picturePanel__board" id="pictureBoard"></div>
            <div class="stickerBurst" id="stickerBurst" aria-hidden="true">⭐</div>
          </section>

          <section class="answerPanel" aria-label="Answer choices">
            <div class="answerPanel__title">Tap the correct number.</div>
            <div class="numberGrid" id="numberGrid"></div>
          </section>

          <section class="feedbackBar is-idle" id="feedbackText" aria-live="polite">Look at the picture and fix the homework.</section>
        </div>
      </div>
    `;

    return {
      sentenceText: byId("sentenceText"),
      helperStrip: byId("helperStrip"),
      picturePanel: byId("picturePanel"),
      pictureTitle: byId("pictureTitle"),
      pictureBoard: byId("pictureBoard"),
      numberGrid: byId("numberGrid"),
      feedbackText: byId("feedbackText"),
      stickerBurst: byId("stickerBurst"),
    };
  }

  HF.layouts.tablet = { id: "tablet", render: renderMarkup };
})();
