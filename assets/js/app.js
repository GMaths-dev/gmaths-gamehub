(async function(){
  "use strict";
  const grid=document.getElementById("game-grid");
  try{
    const [settingsResponse,gamesResponse]=await Promise.all([fetch("data/settings.json"),fetch("data/games.json")]);
    if(!settingsResponse.ok||!gamesResponse.ok)throw new Error("Data files could not be loaded.");
    const [settings,games]=await Promise.all([settingsResponse.json(),gamesResponse.json()]);
    document.title=settings.siteName;document.getElementById("site-name").textContent=settings.siteName;document.getElementById("current-year").textContent=new Date().getFullYear();
    if(!settings.enableSearch)document.querySelector(".search-box").hidden=true;
    if(!settings.enableGradeFilter)document.getElementById("grade-filters").hidden=true;
    if(!settings.enableSubjectFilter)document.getElementById("subject-filters").hidden=true;
    const visibleGames=games.filter(g=>settings.showExtraGames||g.grade!=="extra");new window.GameCatalog({games:visibleGames,settings}).init();
  }catch(error){console.error(error);grid.setAttribute("aria-busy","false");grid.innerHTML='<div class="empty-state"><h3>Game library unavailable</h3><p>Open this project with Live Server so the JSON files can be loaded.</p></div>';document.getElementById("result-count").textContent="Unable to load";}
  const toggle=document.getElementById("filter-toggle");toggle.addEventListener("click",()=>{const filters=document.getElementById("filters");const open=filters.classList.toggle("open");toggle.setAttribute("aria-expanded",String(open));});
})();
