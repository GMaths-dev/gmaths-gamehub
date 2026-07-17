(async function(){
  "use strict";
  const frame=document.getElementById("game-frame");
  const loader=document.getElementById("game-loader");
  const errorPanel=document.getElementById("load-error");
  errorPanel.hidden=true;
  loader.hidden=false;
  const params=new URLSearchParams(location.search);
  const id=params.get("id");
  const bundledGames={
    "g2-sum-pyramid":{id:"g2-sum-pyramid",title:"Sum Pyramid",grade:2,subject:"English Math",gamePath:"games/grade-2/sum-pyramid/index.html",updatedAt:"2026-07-16"}
  };
  const fail=message=>{
    loader.hidden=true;
    frame.classList.add("is-loading");
    errorPanel.hidden=false;
    document.getElementById("error-message").textContent=message;
  };
  const isSafeGamePath=value=>Boolean(value)&&value.startsWith("games/")&&!value.includes("..")&&value.endsWith("/index.html");
  const directPath=params.get("path");
  let game=isSafeGamePath(directPath)?{
    id:id||"direct-game",
    title:params.get("title")||"GMaths Game",
    grade:params.get("grade")||"",
    subject:params.get("subject")||"",
    gamePath:directPath,
    updatedAt:params.get("updatedAt")||"latest"
  }:null;

  if(!game&&id){
    try{
      const catalogUrl=new URL("data/games.json",document.baseURI);
      const response=await fetch(catalogUrl.href,{cache:"no-store"});
      if(response.ok){
        const games=await response.json();
        game=games.find(item=>item.id===id&&isSafeGamePath(item.gamePath))||null;
      }
    }catch(error){console.warn("Catalog lookup failed; using bundled fallback when available.",error);}
  }
  if(!game&&id)game=bundledGames[id]||null;
  if(!game){fail(id?"This game does not exist or its path is unavailable.":"No game was selected.");return;}

  document.title=`${game.title} | GMaths GameHub`;
  document.getElementById("game-title").textContent=game.title;
  document.getElementById("game-grade").textContent=game.grade==="extra"?game.subject:[game.grade?`Grade ${game.grade}`:"",game.subject].filter(Boolean).join(" · ");
  frame.title=game.title;
  const gameUrl=new URL(game.gamePath,document.baseURI);
  gameUrl.searchParams.set("v",game.updatedAt||"latest");
  try{
    const sourceResponse=await fetch(gameUrl.href,{cache:"no-store"});
    if(!sourceResponse.ok){
      fail(`The game source is unavailable (${sourceResponse.status}).`);
      return;
    }
  }catch(error){
    fail("The game source could not be reached.");
    return;
  }
  frame.addEventListener("load",()=>{
    errorPanel.hidden=true;
    loader.hidden=true;
    frame.classList.remove("is-loading");
  },{once:true});
  frame.src=gameUrl.href;
  setTimeout(()=>{if(!loader.hidden)loader.querySelector("p").textContent="Almost ready…";},4000);

  document.getElementById("fullscreen-button").addEventListener("click",async()=>{
    try{
      if(document.fullscreenElement){await document.exitFullscreen();return;}
      if(frame.requestFullscreen){await frame.requestFullscreen();return;}
      if(frame.webkitRequestFullscreen){frame.webkitRequestFullscreen();return;}
      const stage=document.querySelector(".game-stage");
      if(stage.requestFullscreen)await stage.requestFullscreen();
    }
    catch(error){console.warn("Fullscreen is unavailable",error);}
  });
})();
