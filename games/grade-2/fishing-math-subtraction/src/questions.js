/* ==========================================================================
  Questions (EN) - theo đúng đề bài bạn đưa
============================================================================ */

(function () {
  "use strict";

  const FM = (window.FishingMath = window.FishingMath || {});

  FM.questions = [
    {
      audio: "Q1.mp3", // Tên file mp3 cho câu 1
      prompt: "The minuend is 10, and the subtrahend is 7. What is the difference?",
      options: { A: "10", B: "7", C: "3" },
      correctKey: "C",
    },
    {
      audio: "Q2.mp3",
      prompt: "The minuend is 10, and the subtrahend is 3. What is the difference?",
      options: { A: "3", B: "10", C: "7" },
      correctKey: "C",
    },
    {
      audio: "Q3.mp3",
      prompt: "The minuend is 14 and the difference is 4. Find the subtrahend of a subtraction.",
      options: { A: "14", B: "10", C: "18" },
      correctKey: "B",
    },
    {
      audio: "Q4.mp3",
      prompt: "The minuend is 20 and the difference is 10. Find the subtrahend of a subtraction.",
      options: { A: "10", B: "20", C: "30" },
      correctKey: "A", 
    },
    {
      audio: "Q5.mp3",
      prompt: "Jane has 17 apples, she gives her brother 7 apples. How many apples does she have left?",
      options: { A: "10", B: "17", C: "7" },
      correctKey: "A", 
    },
    {
      audio: "Q6.mp3",
      prompt: "Anna had 15 balloons and sold 3 balloons. How many did she have left?",
      options: { A: "15", B: "12", C: "18" },
      correctKey: "B", 
    },
  ]
})();