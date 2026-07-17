(function () {
  "use strict";

  const HF = (window.HomeworkFix = window.HomeworkFix || {});

  HF.questions = [
    {
      sentence: "I have TWO cats.",
      wrongWord: "TWO",
      actualCount: 5,
      objectName: "cats",
      objectEmoji: "🐱",
      hintText: "Count the cats again!",
      successText: "Great! You fixed it!",
    },
    {
      sentence: "I have FIVE dogs.",
      wrongWord: "FIVE",
      actualCount: 8,
      objectName: "dogs",
      objectEmoji: "🐶",
      hintText: "Let's count the dogs together!",
      successText: "Correct! Nice fixing!",
    },
    {
      sentence: "I have TEN candies.",
      wrongWord: "TEN",
      actualCount: 1,
      objectName: "candies",
      objectEmoji: "🍬",
      hintText: "Count carefully. How many candies can you see?",
      successText: "Great! That's the right number!",
    },
    {
      sentence: "I have THREE flowers.",
      wrongWord: "THREE",
      actualCount: 10,
      objectName: "flowers",
      objectEmoji: "🌼",
      hintText: "Let's count all the flowers one by one!",
      successText: "Excellent! You fixed the flowers question!",
    },
    {
      sentence: "I have NINE bananas.",
      wrongWord: "NINE",
      actualCount: 5,
      objectName: "bananas",
      objectEmoji: "🍌",
      hintText: "Count the bananas again!",
      successText: "Great job, teacher helper!",
    },
  ];
})();
