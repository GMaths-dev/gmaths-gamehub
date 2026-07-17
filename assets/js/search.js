(function(){
  "use strict";
  const normalize=value=>String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  window.GameSearch={
    normalize,
    matches(game,query){if(!query)return true;const haystack=[game.title,game.subject,game.topic,game.description,game.grade].map(normalize).join(" ");return normalize(query).split(/\s+/).every(term=>haystack.includes(term));}
  };
})();
