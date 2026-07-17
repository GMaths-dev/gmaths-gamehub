const $=selector=>document.querySelector(selector);
const state={job:null,prepared:false,games:[],editingId:null};

async function api(path,options={}){
  let response;
  try{response=await fetch(path,{credentials:"same-origin",...options});}
  catch(_){throw new Error("The local admin server is not reachable. Run start-admin.ps1 and use the address it opens automatically.");}
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||(response.status===404?"Open the address launched by start-admin.ps1, not a Live Server page.":`Request failed (${response.status})`));
  return data;
}
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
const slugify=value=>String(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const formatBytes=bytes=>bytes>1048576?`${(bytes/1048576).toFixed(1)} MB`:`${Math.ceil(bytes/1024)} KB`;

async function checkSession(){
  if(location.hostname!=="127.0.0.1"&&location.hostname!=="localhost"){
    $("#login-message").textContent="Wrong address. Run start-admin.ps1 and use the local page it opens automatically.";return;
  }
  try{const data=await api("/api/session");if(data.authenticated)showApp();}
  catch(_){}
}
async function showApp(){
  $("#login-view").hidden=true;$("#app").hidden=false;await Promise.all([loadGames(),loadPublicationStatus()]);
}
$("#login-form").addEventListener("submit",async event=>{
  event.preventDefault();$("#login-message").textContent="";
  try{await api("/api/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password:$("#password").value})});await showApp();}
  catch(error){$("#login-message").textContent=error.message;}
});
$("#logout").addEventListener("click",async()=>{await api("/api/logout",{method:"POST"});location.reload();});

async function loadPublicationStatus(){
  $("#publication-message").textContent="";
  try{
    const status=await api("/api/publication/status"),count=status.changeCount||0;
    $("#publication-state").textContent=!status.configured?"Not configured":count?"Local changes":"Up to date";
    $("#publication-state").className=`publication-state ${!status.configured?"state-warn":count?"state-pending":"state-ready"}`;
    $("#publication-summary").textContent=!status.configured?(status.message||"GitHub is not configured."):count?`${count} public change(s) waiting to publish.`:"The local public website matches the latest local commit.";
    $("#publication-detail").textContent=status.configured?`${status.repository} · branch ${status.branch}`:"Configure the repository once; the admin tool will handle later publications.";
    $("#publication-changes").innerHTML=(status.changes||[]).slice(0,30).map(change=>`<li><span>${escapeHtml(change.status)}</span>${escapeHtml(change.path)}</li>`).join("")||(status.configured?"<li class=\"empty-change\">No unpublished website files.</li>":"");
    const repo=$("#open-repository"),site=$("#open-live-site");
    repo.hidden=!status.repository;repo.href=status.repository?`https://github.com/${status.repository}`:"#";
    site.hidden=!status.siteUrl;site.href=status.siteUrl||"#";
    $("#publish-github").disabled=!status.configured||!count||status.publishing;
  }catch(error){$("#publication-summary").textContent="Publication status unavailable.";$("#publication-message").textContent=error.message;}
}
$("#refresh-publication").addEventListener("click",loadPublicationStatus);
$("#publish-github").addEventListener("click",async()=>{
  if(!confirm("Publish all listed public website changes to GitHub? Teachers will receive the new version after GitHub Pages finishes deploying."))return;
  const button=$("#publish-github");button.disabled=true;$("#publication-message").textContent="Publishing to GitHub…";
  try{
    const result=await api("/api/publication/github",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({})});
    $("#publication-message").textContent=result.message;
    await loadPublicationStatus();
  }catch(error){$("#publication-message").textContent=error.message;button.disabled=false;}
});

async function loadGames(){
  $("#manager-message").textContent="Loading games…";
  try{const data=await api("/api/games");state.games=data.games;renderGames();$("#manager-message").textContent=`${data.games.length} game(s) in the catalog.`;}
  catch(error){$("#manager-message").textContent=error.message;}
}
function renderGames(){
  const query=$("#game-search").value.trim().toLowerCase();
  const games=state.games.filter(game=>[game.title,game.subject,game.topic,game.grade].join(" ").toLowerCase().includes(query));
  $("#game-list").innerHTML=games.map(game=>`
    <article class="admin-game-card" data-id="${escapeHtml(game.id)}">
      <div class="admin-game-cover">${game.coverUrl?`<img src="${escapeHtml(game.coverUrl)}" alt="">`:"∑"}</div>
      <div class="admin-game-info">
        <span class="game-state ${game.visible?"":"hidden-state"}">${game.visible?"Visible":"Hidden"}</span>
        <h3>${escapeHtml(game.title)}</h3>
        <p>${escapeHtml(game.grade==="extra"?"Extra":`Grade ${game.grade}`)} · ${escapeHtml(game.subject)} · ${escapeHtml(game.topic)}</p>
        <div class="card-actions">
          <button data-action="edit">Edit</button>
          <button class="secondary" data-action="visibility">${game.visible?"Hide":"Show"}</button>
          <button class="delete-card" data-action="delete">Delete</button>
        </div>
      </div>
    </article>`).join("")||"<p>No games match this search.</p>";
}
$("#refresh-games").addEventListener("click",loadGames);
$("#game-search").addEventListener("input",renderGames);
$("#game-list").addEventListener("click",async event=>{
  const button=event.target.closest("button"),card=event.target.closest("[data-id]");if(!button||!card)return;
  const game=state.games.find(item=>item.id===card.dataset.id);if(!game)return;
  const action=button.dataset.action;
  if(action==="edit")openEditor(game);
  if(action==="visibility"){
    button.disabled=true;
    try{await api(`/api/games/${encodeURIComponent(game.id)}/visibility`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({visible:!game.visible})});await Promise.all([loadGames(),loadPublicationStatus()]);}
    catch(error){$("#manager-message").textContent=error.message;button.disabled=false;}
  }
  if(action==="delete")await deleteExistingGame(game);
});

function openEditor(game){
  state.editingId=game.id;
  const form=$("#edit-game-form");$("#edit-heading").textContent=game.title;
  form.elements.title.value=game.title;form.elements.grade.value=String(game.grade);form.elements.subject.value=game.subject;
  form.elements.topic.value=game.topic;form.elements.orientation.value=game.orientation||"any";form.elements.order.value=game.order||1;
  form.elements.description.value=game.description;form.elements.featured.checked=Boolean(game.featured);
  $("#cover-file").value="";renderCover(game);$("#edit-message").textContent="";$("#edit-dialog").showModal();
}
function renderCover(game){
  $("#cover-preview").innerHTML=game.coverUrl?`<img src="${escapeHtml(game.coverUrl)}" alt="${escapeHtml(game.title)} cover">`:"<span>∑</span>";
}
$("#save-game").addEventListener("click",async()=>{
  const form=$("#edit-game-form"),game=state.games.find(item=>item.id===state.editingId);if(!game)return;
  const values=Object.fromEntries(new FormData(form));values.featured=form.elements.featured.checked;
  $("#edit-message").textContent="Saving…";
  try{await api(`/api/games/${encodeURIComponent(game.id)}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(values)});await Promise.all([loadGames(),loadPublicationStatus()]);$("#edit-dialog").close();}
  catch(error){$("#edit-message").textContent=error.message;}
});
$("#replace-cover").addEventListener("click",async()=>{
  const file=$("#cover-file").files[0];if(!file){$("#edit-message").textContent="Choose an image first.";return;}
  $("#edit-message").textContent="Uploading cover…";
  try{const result=await api(`/api/games/${encodeURIComponent(state.editingId)}/cover?filename=${encodeURIComponent(file.name)}`,{method:"POST",headers:{"content-type":file.type},body:file});await Promise.all([loadGames(),loadPublicationStatus()]);const game=state.games.find(item=>item.id===state.editingId)||result.game;renderCover(game);$("#edit-message").textContent="Cover replaced.";}
  catch(error){$("#edit-message").textContent=error.message;}
});
$("#remove-cover").addEventListener("click",async()=>{
  if(!confirm("Remove this game's cover? The old file will be moved to local trash."))return;
  try{await api(`/api/games/${encodeURIComponent(state.editingId)}/cover`,{method:"DELETE"});await Promise.all([loadGames(),loadPublicationStatus()]);renderCover(state.games.find(item=>item.id===state.editingId));$("#edit-message").textContent="Cover removed.";}
  catch(error){$("#edit-message").textContent=error.message;}
});
$("#delete-game").addEventListener("click",async()=>{
  const game=state.games.find(item=>item.id===state.editingId);if(game)await deleteExistingGame(game,true);
});
async function deleteExistingGame(game,closeAfter=false){
  const confirmation=prompt(`Type the exact game title to remove it from GameHub:\n\n${game.title}`);
  if(confirmation===null)return;
  try{await api(`/api/games/${encodeURIComponent(game.id)}`,{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({confirmation})});if(closeAfter)$("#edit-dialog").close();await Promise.all([loadGames(),loadPublicationStatus()]);$("#manager-message").textContent=`${game.title} was removed. Its files are preserved in admin-tool/.data/trash.`;}
  catch(error){(closeAfter?$("#edit-message"):$("#manager-message")).textContent=error.message;}
}

const drop=$("#drop-zone"),fileInput=$("#zip-file");
["dragenter","dragover"].forEach(type=>drop.addEventListener(type,event=>{event.preventDefault();drop.classList.add("drag");}));
["dragleave","drop"].forEach(type=>drop.addEventListener(type,event=>{event.preventDefault();drop.classList.remove("drag");}));
drop.addEventListener("drop",event=>upload(event.dataTransfer.files[0]));
fileInput.addEventListener("change",()=>upload(fileInput.files[0]));
async function upload(file){
  if(!file)return;if(!file.name.toLowerCase().endsWith(".zip")){alert("Please select a ZIP file.");return;}
  $("#upload-progress").hidden=false;$("#workspace").hidden=true;
  try{const result=await api(`/api/upload?filename=${encodeURIComponent(file.name)}`,{method:"POST",headers:{"content-type":"application/zip"},body:file});state.job=result.jobId;state.prepared=false;renderReport(result.report);fillMetadata(result.report);$("#workspace").hidden=false;$("#publish").disabled=true;$("#preview-panel").hidden=true;}
  catch(error){alert(error.message);}
  finally{$("#upload-progress").hidden=true;fileInput.value="";}
}
function renderReport(report){
  const cards=[["Files",report.fileCount],["Package size",formatBytes(report.totalBytes)],["Game root",report.rootRelative||"."],["Framework",report.framework||"HTML / JS"]];
  $("#summary-grid").innerHTML=cards.map(([label,value])=>`<div class="summary-card"><strong>${escapeHtml(value)}</strong><span>${label}</span></div>`).join("");
  $("#checks").innerHTML=report.checks.map(item=>`<li class="${item.level}">${escapeHtml(item.message)}</li>`).join("");
  $("#changes").innerHTML=report.proposedChanges.length?report.proposedChanges.map(item=>`<li>${escapeHtml(item)}</li>`).join(""):"<li>No automatic source edits are required.</li>";
}
function fillMetadata(report){
  const form=$("#metadata-form"),title=report.detectedTitle||report.packageName.replace(/\.zip$/i,"");
  form.elements.title.value=title;form.elements.slug.value=slugify(title);form.elements.id.value=slugify(title);form.elements.description.value=report.suggestedDescription||"Interactive educational game.";
}
$("#metadata-form").addEventListener("submit",async event=>{
  event.preventDefault();if(!state.job)return;const metadata=Object.fromEntries(new FormData(event.currentTarget));metadata.featured=event.currentTarget.elements.featured.checked;
  $("#action-message").textContent="Preparing a minimal-change preview…";
  try{const result=await api(`/api/jobs/${state.job}/prepare`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(metadata)});state.prepared=true;$("#preview-panel").hidden=false;$("#preview-frame").src=result.previewUrl;$("#open-preview").href=result.previewUrl;$("#publish").disabled=false;$("#action-message").textContent=`Prepared with ${result.changes.length} minimal source change(s).`;}
  catch(error){$("#action-message").textContent=error.message;}
});
$("#publish").addEventListener("click",async()=>{
  if(!state.prepared||!confirm("Publish this staged game into GameHub and update games.json?"))return;
  $("#publish").disabled=true;$("#action-message").textContent="Publishing…";
  try{const result=await api(`/api/jobs/${state.job}/publish`,{method:"POST"});$("#action-message").textContent=`Saved locally: ${result.gamePath}. Use Publish to GitHub when testing is complete.`;await Promise.all([loadGames(),loadPublicationStatus()]);}
  catch(error){$("#action-message").textContent=error.message;$("#publish").disabled=false;}
});

checkSession();
