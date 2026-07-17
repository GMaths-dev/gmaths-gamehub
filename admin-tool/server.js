const http=require("http");
const path=require("path");
const fs=require("fs");
const fsp=require("fs/promises");
const crypto=require("crypto");
const zlib=require("zlib");
const {execFile}=require("child_process");
const {promisify}=require("util");

const execFileAsync=promisify(execFile);

const TOOL_ROOT=__dirname;
loadEnv(path.join(TOOL_ROOT,".env"));
const HUB_ROOT=path.resolve(process.env.GMATHS_HUB_ROOT||path.resolve(TOOL_ROOT,".."));
const PUBLIC_ROOT=path.join(TOOL_ROOT,"public");
const DATA_ROOT=path.resolve(process.env.GMATHS_ADMIN_DATA_ROOT||path.join(TOOL_ROOT,".data"));
const JOBS_ROOT=path.join(DATA_ROOT,"jobs");

const PORT=Number(process.env.PORT||4177);
const ADMIN_PASSWORD=process.env.GMATHS_ADMIN_PASSWORD||"";
const MAX_UPLOAD=250*1024*1024;
const PUBLIC_GIT_PATHS=["404.html","assets","data","game.html","games","index.html","thumbnails"];
const sessions=new Set();
const jobs=new Map();
const loginAttempts=new Map();
let gitPublishInProgress=false;

if(!ADMIN_PASSWORD){
  console.error("GMATHS_ADMIN_PASSWORD is required. Copy .env.example to .env and choose a password.");
  process.exit(1);
}

function loadEnv(file){
  if(!fs.existsSync(file))return;
  const text=fs.readFileSync(file,"utf8");
  for(const line of text.split(/\r?\n/)){
    const trimmed=line.trim();
    if(!trimmed||trimmed.startsWith("#")||!trimmed.includes("="))continue;
    const index=trimmed.indexOf("=");
    const key=trimmed.slice(0,index).trim();
    let value=trimmed.slice(index+1).trim();
    if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);
    if(!(key in process.env))process.env[key]=value;
  }
}

const json=(res,status,data)=>{
  res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store"});
  res.end(JSON.stringify(data));
};
const cookieToken=req=>{
  const match=(req.headers.cookie||"").match(/(?:^|;\s*)gmaths_admin=([^;]+)/);
  return match?decodeURIComponent(match[1]):"";
};
const isAuthenticated=req=>sessions.has(cookieToken(req));
const requireAuth=(req,res)=>{if(isAuthenticated(req))return true;json(res,401,{error:"Admin authentication required."});return false;};
const safeEqual=(a,b)=>{
  const aa=Buffer.from(String(a)),bb=Buffer.from(String(b));
  return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb);
};
const safeResolve=(root,...parts)=>{
  const resolved=path.resolve(root,...parts);
  if(resolved!==root&&!resolved.startsWith(root+path.sep))throw new Error("Unsafe path.");
  return resolved;
};
const slug=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const readJsonBody=async(req,limit=1024*1024)=>JSON.parse((await readBody(req,limit)).toString("utf8")||"{}");
const readBody=(req,limit)=>new Promise((resolve,reject)=>{
  const chunks=[];let size=0;
  req.on("data",chunk=>{size+=chunk.length;if(size>limit){reject(new Error("Request is too large."));req.destroy();return;}chunks.push(chunk);});
  req.on("end",()=>resolve(Buffer.concat(chunks)));
  req.on("error",reject);
});

async function gitRun(args,allowedExitCodes=[]){
  try{
    const result=await execFileAsync("git",["-C",HUB_ROOT,...args],{
      cwd:HUB_ROOT,encoding:"utf8",windowsHide:true,maxBuffer:10*1024*1024,
      env:{...process.env,GIT_TERMINAL_PROMPT:"0"}
    });
    return{code:0,stdout:result.stdout.trim(),stderr:result.stderr.trim()};
  }catch(error){
    const code=Number.isInteger(error.code)?error.code:1;
    if(allowedExitCodes.includes(code))return{code,stdout:String(error.stdout||"").trim(),stderr:String(error.stderr||"").trim()};
    const details=String(error.stderr||error.stdout||error.message||"Git command failed.").trim();
    throw new Error(details.replace(/^fatal:\s*/i,"Git: "));
  }
}
function githubDetails(remote){
  const match=String(remote||"").trim().match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if(!match)return{repository:"",siteUrl:String(process.env.GMATHS_SITE_URL||"").trim()};
  const owner=match[1],repositoryName=match[2];
  return{
    repository:`${owner}/${repositoryName}`,
    siteUrl:String(process.env.GMATHS_SITE_URL||"").trim()||(repositoryName.toLowerCase()===`${owner.toLowerCase()}.github.io`?`https://${owner}.github.io/`:`https://${owner}.github.io/${repositoryName}/`)
  };
}
async function publicationStatus(){
  if(!fs.existsSync(path.join(HUB_ROOT,".git")))return{configured:false,publishing:gitPublishInProgress,changes:[],message:"This GameHub folder is not a Git repository yet."};
  const branchResult=await gitRun(["branch","--show-current"]);
  const remoteResult=await gitRun(["config","--get","remote.origin.url"],[1]);
  const branch=branchResult.stdout||String(process.env.GMATHS_GIT_BRANCH||"main");
  const remote=remoteResult.stdout;
  const status=await gitRun(["status","--porcelain=v1","--untracked-files=all","--",...PUBLIC_GIT_PATHS]);
  const changes=status.stdout?status.stdout.split(/\r?\n/).filter(Boolean).map(line=>({status:line.slice(0,2).trim()||"M",path:line.slice(3)})):[];
  const details=githubDetails(remote);
  return{configured:Boolean(remote&&details.repository),publishing:gitPublishInProgress,branch,remote,repository:details.repository,siteUrl:details.siteUrl,changes,changeCount:changes.length};
}
async function publishToGithub(message){
  if(gitPublishInProgress)throw new Error("A GitHub publication is already running.");
  gitPublishInProgress=true;
  try{
    const status=await publicationStatus();
    if(!status.configured)throw new Error("GitHub is not configured for this GameHub yet.");
    const branch=status.branch||"main";
    const fetchResult=await gitRun(["fetch","origin",branch],[1,128]);
    const remoteRef=await gitRun(["rev-parse","--verify",`origin/${branch}`],[1,128]);
    if(remoteRef.code===0){
      const ancestor=await gitRun(["merge-base","--is-ancestor",`origin/${branch}`,"HEAD"],[1]);
      if(ancestor.code!==0)throw new Error("GitHub contains changes that are not on this computer. Synchronize them before publishing.");
    }else if(fetchResult.code!==0&&/authentication|permission|repository not found/i.test(fetchResult.stderr)){
      throw new Error("GitHub authentication is unavailable on this computer. Sign in with Git Credential Manager, then try again.");
    }
    await gitRun(["add","--",...PUBLIC_GIT_PATHS]);
    const staged=await gitRun(["diff","--cached","--quiet"],[1]);
    if(staged.code===0)return{published:false,message:"There are no public website changes to publish.",...status};
    const cleanMessage=String(message||"").replace(/[\r\n]+/g," ").trim().slice(0,120)||`Update GameHub ${new Date().toISOString().slice(0,10)}`;
    await gitRun(["commit","-m",cleanMessage]);
    await gitRun(["push","origin",`HEAD:${branch}`]);
    const commit=(await gitRun(["rev-parse","HEAD"])).stdout;
    return{published:true,commit,branch,repository:status.repository,siteUrl:status.siteUrl,message:"Changes were pushed. GitHub Pages is deploying the new version."};
  }finally{gitPublishInProgress=false;}
}

async function walk(root){
  const output=[];
  async function visit(current){
    for(const entry of await fsp.readdir(current,{withFileTypes:true})){
      if(entry.name==="__MACOSX"||entry.name===".DS_Store")continue;
      const full=path.join(current,entry.name);
      if(entry.isDirectory())await visit(full);
      else if(entry.isFile()){const stat=await fsp.stat(full);output.push({full,relative:path.relative(root,full).replaceAll("\\","/"),size:stat.size,ext:path.extname(entry.name).toLowerCase()});}
    }
  }
  await visit(root);return output;
}

async function findGameRoot(extractRoot){
  const files=await walk(extractRoot);
  const indexes=files.filter(file=>file.relative.toLowerCase().endsWith("index.html"));
  if(!indexes.length)throw new Error("No index.html was found in the ZIP.");
  indexes.sort((a,b)=>a.relative.split("/").length-b.relative.split("/").length||a.relative.length-b.relative.length);
  return path.dirname(indexes[0].full);
}

async function analyzePackage(root,packageName){
  const files=await walk(root);
  const textExtensions=new Set([".html",".htm",".css",".js",".mjs",".json",".md",".txt"]);
  const imageExtensions=new Set([".png",".jpg",".jpeg",".webp",".gif"]);
  const samples=[];let combined="";
  for(const file of files.filter(file=>textExtensions.has(file.ext)&&file.size<512*1024)){
    const text=await fsp.readFile(file.full,"utf8");
    combined+=`\n/* ${file.relative} */\n${text}`;
    if(samples.join("").length<45000)samples.push(`FILE: ${file.relative}\n${text.slice(0,6000)}`);
  }
  const indexFile=files.find(file=>file.relative.toLowerCase()==="index.html");
  const indexText=indexFile?await fsp.readFile(indexFile.full,"utf8"):"";
  const titleMatch=indexText.match(/<title[^>]*>([^<]+)<\/title>/i);
  const external=[...new Set((combined.match(/https?:\/\/[^\s"'`)<>]+/g)||[]).filter(url=>!url.includes("w3.org")))].slice(0,30);
  const rootPaths=[...new Set((combined.match(/(?:src|href)\s*=\s*["']\/(?!\/)[^"']+/gi)||[]))].slice(0,30);
  const controls=["replay","sound on","sound off","exit"].filter(term=>combined.toLowerCase().includes(term));
  const secretPatterns=[];
  if(/sk-[a-zA-Z0-9_-]{20,}/.test(combined))secretPatterns.push("Possible OpenAI API key");
  if(/(?:api[_-]?key|secret|token)\s*[:=]\s*["'][^"']{12,}/i.test(combined))secretPatterns.push("Possible embedded credential");
  const framework=/\bPhaser\b/i.test(combined)?"Phaser":/\bUnity\b/i.test(combined)?"Unity WebGL":/\bcreatejs\b/i.test(combined)?"CreateJS":"HTML / JavaScript";
  const images=files.filter(file=>imageExtensions.has(file.ext)).sort((a,b)=>{
    const aScore=/(thumb|cover|logo|preview|screenshot)/i.test(a.relative)?1:0,bScore=/(thumb|cover|logo|preview|screenshot)/i.test(b.relative)?1:0;
    return bScore-aScore||b.size-a.size;
  });
  const candidateThumbnail=images[0]?.relative||"";
  const checks=[
    {level:"ok",message:"A root index.html was found."},
    {level:rootPaths.length?"warn":"ok",message:rootPaths.length?`${rootPaths.length} root-relative path reference(s) need normalization.`:"Resource paths appear relative."},
    {level:external.length?"warn":"ok",message:external.length?`${external.length} external URL(s) require review or local vendoring.`:"No external runtime URL was detected."},
    {level:controls.length?"warn":"ok",message:controls.length?`Shared controls detected: ${controls.join(", ")}.`:"No shared Replay/Sound/Exit control text detected."},
    {level:secretPatterns.length?"warn":"ok",message:secretPatterns.length?secretPatterns.join("; "):"No obvious plaintext API key was detected."},
    {level:candidateThumbnail?"ok":"warn",message:candidateThumbnail?`Thumbnail candidate: ${candidateThumbnail}`:"No thumbnail candidate was found."}
  ];
  const proposedChanges=[];
  if(rootPaths.length)proposedChanges.push("Convert root-relative index.html paths to game-relative paths.");
  if(!/name\s*=\s*["']viewport["']/i.test(indexText))proposedChanges.push("Add a responsive viewport declaration.");
  if(external.length)proposedChanges.push("Review external dependencies; keep source unchanged unless local vendoring is approved.");
  if(controls.length)proposedChanges.push("Review game-owned Replay/Sound/Exit controls against the current GameHub standard.");
  return{
    packageName,fileCount:files.length,totalBytes:files.reduce((sum,file)=>sum+file.size,0),
    framework,detectedTitle:titleMatch?.[1]?.trim()||"",candidateThumbnail,externalUrls:external,
    rootRelativePaths:rootPaths,controls,secretPatterns,checks,proposedChanges,
    suggestedDescription:"Interactive educational game.",samples:samples.join("\n\n").slice(0,50000)
  };
}

async function extractZip(buffer,destination){
  const maxFiles=5000,maxEntryBytes=150*1024*1024,maxTotalBytes=600*1024*1024;
  const min=Math.max(0,buffer.length-65557);let eocd=-1;
  for(let offset=buffer.length-22;offset>=min;offset--){if(buffer.readUInt32LE(offset)===0x06054b50){eocd=offset;break;}}
  if(eocd<0)throw new Error("Invalid ZIP: end-of-central-directory record was not found.");
  const entryCount=buffer.readUInt16LE(eocd+10),centralOffset=buffer.readUInt32LE(eocd+16);
  if(entryCount>maxFiles)throw new Error(`Archive contains too many files (${entryCount}).`);
  let cursor=centralOffset,total=0;
  await fsp.mkdir(destination,{recursive:true});
  for(let index=0;index<entryCount;index++){
    if(buffer.readUInt32LE(cursor)!==0x02014b50)throw new Error("Invalid ZIP central directory.");
    const flags=buffer.readUInt16LE(cursor+8),method=buffer.readUInt16LE(cursor+10);
    const compressedSize=buffer.readUInt32LE(cursor+20),size=buffer.readUInt32LE(cursor+24);
    const nameLength=buffer.readUInt16LE(cursor+28),extraLength=buffer.readUInt16LE(cursor+30),commentLength=buffer.readUInt16LE(cursor+32);
    const externalAttributes=buffer.readUInt32LE(cursor+38),localOffset=buffer.readUInt32LE(cursor+42);
    if(compressedSize===0xffffffff||size===0xffffffff||localOffset===0xffffffff)throw new Error("ZIP64 archives are not supported.");
    if(flags&1)throw new Error("Encrypted ZIP entries are not supported.");
    if(method!==0&&method!==8)throw new Error(`Unsupported ZIP compression method: ${method}.`);
    if(size>maxEntryBytes)throw new Error("A ZIP entry exceeds the per-file size limit.");
    total+=size;if(total>maxTotalBytes)throw new Error("Archive exceeds the extracted-size limit.");
    const nameBuffer=buffer.subarray(cursor+46,cursor+46+nameLength);
    const name=nameBuffer.toString("utf8").replaceAll("\\","/");
    const segments=name.split("/");
    if(!name||name.startsWith("/")||/^[A-Za-z]:/.test(name)||segments.includes(".."))throw new Error(`Unsafe ZIP path: ${name}`);
    const unixType=(externalAttributes>>>16)&0xf000;
    if(unixType===0xa000)throw new Error(`Symbolic links are not allowed in ZIP packages: ${name}`);
    const target=safeResolve(destination,...segments.filter(Boolean));
    if(name.endsWith("/"))await fsp.mkdir(target,{recursive:true});
    else{
      if(buffer.readUInt32LE(localOffset)!==0x04034b50)throw new Error(`Invalid local ZIP header: ${name}`);
      const localNameLength=buffer.readUInt16LE(localOffset+26),localExtraLength=buffer.readUInt16LE(localOffset+28);
      const dataStart=localOffset+30+localNameLength+localExtraLength;
      const compressed=buffer.subarray(dataStart,dataStart+compressedSize);
      const data=method===0?Buffer.from(compressed):zlib.inflateRawSync(compressed,{maxOutputLength:maxEntryBytes});
      if(data.length!==size)throw new Error(`ZIP entry size mismatch: ${name}`);
      await fsp.mkdir(path.dirname(target),{recursive:true});
      await fsp.writeFile(target,data);
    }
    cursor+=46+nameLength+extraLength+commentLength;
  }
  return entryCount;
}

async function uploadZip(req,res,url){
  const length=Number(req.headers["content-length"]||0);
  if(length<=0||length>MAX_UPLOAD)return json(res,413,{error:"ZIP must be between 1 byte and 250 MB."});
  const filename=path.basename(url.searchParams.get("filename")||"game.zip");
  if(!filename.toLowerCase().endsWith(".zip"))return json(res,400,{error:"Only ZIP files are accepted."});
  const jobId=crypto.randomUUID();
  const jobDir=safeResolve(JOBS_ROOT,jobId),extractDir=path.join(jobDir,"extracted");
  await fsp.mkdir(jobDir,{recursive:true});
  const zipPath=path.join(jobDir,"source.zip");
  const zipBuffer=await readBody(req,MAX_UPLOAD);
  await fsp.writeFile(zipPath,zipBuffer);
  await extractZip(zipBuffer,extractDir);
  const gameRoot=await findGameRoot(extractDir);
  const report=await analyzePackage(gameRoot,filename);
  report.rootRelative=path.relative(extractDir,gameRoot).replaceAll("\\","/")||".";
  const job={id:jobId,jobDir,extractDir,gameRoot,report,metadata:null,stagingRoot:null,published:false};
  jobs.set(jobId,job);
  await fsp.writeFile(path.join(jobDir,"analysis.json"),JSON.stringify(report,null,2));
  json(res,200,{jobId,report:{...report,samples:undefined}});
}

function jobFor(id){const job=jobs.get(id);if(!job)throw new Error("This staging job is unavailable. Upload the ZIP again.");return job;}

function validateMetadata(input){
  const grade=String(input.grade||"");
  if(!/^(?:[1-8]|extra)$/.test(grade))throw new Error("Grade must be 1-8 or extra.");
  const output={
    title:String(input.title||"").trim(),slug:slug(input.slug),id:slug(input.id),grade,
    subject:String(input.subject||"").trim(),topic:String(input.topic||"").trim(),
    description:String(input.description||"").trim(),featured:Boolean(input.featured)
  };
  for(const key of ["title","slug","id","subject","topic","description"])if(!output[key])throw new Error(`${key} is required.`);
  return output;
}

const catalogPath=()=>path.join(HUB_ROOT,"data","games.json");
const readCatalog=async()=>JSON.parse(await fsp.readFile(catalogPath(),"utf8"));
const writeCatalog=async catalog=>fsp.writeFile(catalogPath(),JSON.stringify(catalog,null,2)+"\n");
const gradeBucket=grade=>String(grade)==="extra"?"extra":`grade-${Number(grade)}`;
const currentDate=()=>new Date().toISOString().slice(0,10);
const findCatalogGame=(catalog,id)=>{
  const index=catalog.findIndex(game=>game.id===id);
  if(index<0)throw new Error(`Game was not found: ${id}`);
  return{game:catalog[index],index};
};
const trashRootFor=id=>path.join(DATA_ROOT,"trash",`${Date.now()}-${slug(id)||"game"}`);
async function hashFile(file){
  const hash=crypto.createHash("sha256");
  const stream=fs.createReadStream(file);
  for await(const chunk of stream)hash.update(chunk);
  return hash.digest("hex");
}
async function verifyCopiedPath(source,destination){
  const sourceStat=await fsp.stat(source),destinationStat=await fsp.stat(destination);
  if(sourceStat.isDirectory()!==destinationStat.isDirectory())throw new Error("The copied item type does not match the source.");
  if(!sourceStat.isDirectory()){
    if(sourceStat.size!==destinationStat.size||(await hashFile(source))!==(await hashFile(destination)))throw new Error("The copied file did not pass verification.");
    return;
  }
  const sourceFiles=await walk(source),destinationFiles=await walk(destination);
  if(sourceFiles.length!==destinationFiles.length)throw new Error("The copied game has a different file count.");
  const destinationMap=new Map(destinationFiles.map(file=>[file.relative,file]));
  for(const sourceFile of sourceFiles){
    const copied=destinationMap.get(sourceFile.relative);
    if(!copied||copied.size!==sourceFile.size||(await hashFile(sourceFile.full))!==(await hashFile(copied.full))){
      throw new Error(`The copied game failed verification at ${sourceFile.relative}.`);
    }
  }
}
async function movePathCompatible(source,destination){
  const fallbackCodes=new Set(["EPERM","EACCES","EBUSY","EXDEV"]);
  if(process.env.GMATHS_FORCE_COPY_MOVE!=="1"){
    try{
      await fsp.rename(source,destination);
      return;
    }catch(error){
      if(!fallbackCodes.has(error.code))throw error;
    }
  }
  if(fs.existsSync(destination))throw new Error(`The move destination already exists: ${destination}`);
  await fsp.mkdir(path.dirname(destination),{recursive:true});
  try{
    const stat=await fsp.stat(source);
    if(stat.isDirectory())await fsp.cp(source,destination,{recursive:true,errorOnExist:true,force:false});
    else await fsp.copyFile(source,destination,fs.constants.COPYFILE_EXCL);
    await verifyCopiedPath(source,destination);
    try{
      if(stat.isDirectory())await fsp.rm(source,{recursive:true});
      else await fsp.unlink(source);
    }catch(error){
      await fsp.rm(destination,{recursive:true,force:true}).catch(()=>{});
      throw new Error(`The copy was verified, but Windows would not release the original item: ${error.message}`);
    }
  }catch(error){
    await fsp.rm(destination,{recursive:true,force:true}).catch(()=>{});
    throw error;
  }
}
async function moveToTrash(source,trashRoot,label){
  if(!source||!fs.existsSync(source))return "";
  await fsp.mkdir(trashRoot,{recursive:true});
  const destination=path.join(trashRoot,label);
  await fsp.mkdir(path.dirname(destination),{recursive:true});
  await movePathCompatible(source,destination);
  return destination;
}
function gameDirectoryFor(game){
  const relative=String(game.gamePath||"").replaceAll("\\","/");
  if(!relative.startsWith("games/")||!relative.endsWith("/index.html")||relative.includes(".."))throw new Error("The game source path is unsafe.");
  return safeResolve(path.join(HUB_ROOT,"games"),...relative.slice("games/".length,-"/index.html".length).split("/"));
}
function thumbnailPathFor(game){
  const relative=String(game.thumbnail||"").replaceAll("\\","/");
  if(!relative)return"";
  if(!relative.startsWith("thumbnails/")||relative.includes(".."))throw new Error("The thumbnail path is unsafe.");
  return safeResolve(HUB_ROOT,...relative.split("/"));
}
async function listGames(){
  const catalog=await readCatalog();
  return catalog.sort((a,b)=>String(a.grade).localeCompare(String(b.grade),undefined,{numeric:true})||(a.order||99)-(b.order||99)||a.title.localeCompare(b.title)).map(game=>({
    ...game,visible:game.visible!==false,
    coverUrl:game.thumbnail?`/hub-file/${encodeURIComponent(game.thumbnail)}?v=${encodeURIComponent(game.updatedAt||"latest")}`:""
  }));
}
async function updateGame(id,input){
  const catalog=await readCatalog(),{game}=findCatalogGame(catalog,id);
  const nextGrade=String(input.grade??game.grade);
  if(!/^(?:[1-8]|extra)$/.test(nextGrade))throw new Error("Grade must be 1-8 or extra.");
  const nextValues={
    title:String(input.title??game.title).trim(),
    subject:String(input.subject??game.subject).trim(),
    topic:String(input.topic??game.topic).trim(),
    description:String(input.description??game.description).trim()
  };
  for(const [key,value] of Object.entries(nextValues))if(!value)throw new Error(`${key} cannot be empty.`);
  const oldBucket=gradeBucket(game.grade),newBucket=gradeBucket(nextGrade);
  if(oldBucket!==newBucket){
    const sourceDir=gameDirectoryFor(game),folderName=path.basename(sourceDir);
    const targetDir=safeResolve(path.join(HUB_ROOT,"games"),newBucket,folderName);
    if(fs.existsSync(targetDir))throw new Error(`The target grade folder already contains ${folderName}.`);
    let oldThumb="",targetThumb="";
    if(game.thumbnail){
      oldThumb=thumbnailPathFor(game);
      if(fs.existsSync(oldThumb)){
        targetThumb=path.join(HUB_ROOT,"thumbnails",newBucket,path.basename(oldThumb));
        if(fs.existsSync(targetThumb))throw new Error("The target grade already contains a cover with this filename.");
      }
    }
    let sourceMoved=false,thumbMoved=false;
    try{
      await movePathCompatible(sourceDir,targetDir);
      sourceMoved=true;
      if(oldThumb&&targetThumb){
        await movePathCompatible(oldThumb,targetThumb);
        thumbMoved=true;
      }
    }catch(error){
      const rollbackErrors=[];
      if(thumbMoved)try{await movePathCompatible(targetThumb,oldThumb);}catch(rollbackError){rollbackErrors.push(`cover rollback: ${rollbackError.message}`);}
      if(sourceMoved)try{await movePathCompatible(targetDir,sourceDir);}catch(rollbackError){rollbackErrors.push(`game rollback: ${rollbackError.message}`);}
      if(rollbackErrors.length)throw new Error(`${error.message} Automatic rollback also failed (${rollbackErrors.join("; ")}).`);
      throw error;
    }
    game.gamePath=`games/${newBucket}/${folderName}/index.html`;
    if(thumbMoved)game.thumbnail=`thumbnails/${newBucket}/${path.basename(targetThumb)}`;
  }
  game.title=nextValues.title;
  game.grade=nextGrade==="extra"?"extra":Number(nextGrade);
  game.subject=nextValues.subject;
  game.topic=nextValues.topic;
  game.description=nextValues.description;
  game.orientation=["any","landscape","portrait"].includes(input.orientation)?input.orientation:(game.orientation||"any");
  game.order=Math.max(1,Number(input.order)||Number(game.order)||1);
  game.featured=Boolean(input.featured);
  game.updatedAt=currentDate();
  await writeCatalog(catalog);return game;
}
async function setGameVisibility(id,visible){
  const catalog=await readCatalog(),{game}=findCatalogGame(catalog,id);
  game.visible=Boolean(visible);game.updatedAt=currentDate();
  await writeCatalog(catalog);return game;
}
async function replaceGameCover(id,filename,contentType,buffer){
  const extensions={".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".gif":"image/gif"};
  const ext=path.extname(path.basename(filename||"")).toLowerCase();
  const normalizedType=String(contentType||"").split(";")[0].trim().toLowerCase();
  if(!extensions[ext]||![extensions[ext],"application/octet-stream",""].includes(normalizedType))throw new Error("Cover must be PNG, JPG, WebP or GIF.");
  if(!buffer.length)throw new Error("The cover file is empty.");
  const catalog=await readCatalog(),{game}=findCatalogGame(catalog,id);
  const bucket=gradeBucket(game.grade),targetDir=path.join(HUB_ROOT,"thumbnails",bucket);
  const targetName=`${slug(game.id)}${ext}`,target=path.join(targetDir,targetName);
  const trash=trashRootFor(game.id);
  const current=thumbnailPathFor(game);
  if(fs.existsSync(target)&&path.resolve(target)!==path.resolve(current||""))throw new Error("A different cover already uses the target filename.");
  if(current&&fs.existsSync(current))await moveToTrash(current,trash,`cover${path.extname(current)}`);
  await fsp.mkdir(targetDir,{recursive:true});
  await fsp.writeFile(target,buffer);
  game.thumbnail=`thumbnails/${bucket}/${targetName}`;game.updatedAt=currentDate();
  await writeCatalog(catalog);
  return{...game,coverUrl:`/hub-file/${encodeURIComponent(game.thumbnail)}?v=${Date.now()}`};
}
async function removeGameCover(id){
  const catalog=await readCatalog(),{game}=findCatalogGame(catalog,id);
  const current=thumbnailPathFor(game);
  if(current&&fs.existsSync(current))await moveToTrash(current,trashRootFor(game.id),`cover${path.extname(current)}`);
  game.thumbnail="";game.updatedAt=currentDate();
  await writeCatalog(catalog);return game;
}
async function deleteGame(id,confirmation){
  const catalog=await readCatalog(),{game,index}=findCatalogGame(catalog,id);
  if(confirmation!==game.title)throw new Error("The confirmation title does not match.");
  const trash=trashRootFor(game.id);
  const sourceDir=gameDirectoryFor(game);
  if(fs.existsSync(sourceDir))await moveToTrash(sourceDir,trash,"game-source");
  const cover=thumbnailPathFor(game);
  if(cover&&fs.existsSync(cover))await moveToTrash(cover,trash,`cover${path.extname(cover)}`);
  catalog.splice(index,1);await writeCatalog(catalog);
  return{deleted:true,trash};
}

async function prepareJob(job,metadata){
  metadata=validateMetadata(metadata);
  const stagingRoot=path.join(job.jobDir,`staging-${Date.now()}`,"game");
  await fsp.mkdir(path.dirname(stagingRoot),{recursive:true});
  await fsp.cp(job.gameRoot,stagingRoot,{recursive:true,errorOnExist:true});
  const indexPath=path.join(stagingRoot,"index.html");
  let html=await fsp.readFile(indexPath,"utf8"),updated=html;
  const changes=[];
  updated=updated.replace(/\b(src|href)=("|')\/(?!\/)/gi,"$1=$2./");
  if(updated!==html)changes.push("Normalized root-relative paths in index.html.");
  if(!/name\s*=\s*["']viewport["']/i.test(updated)){
    updated=updated.replace(/<head([^>]*)>/i,'<head$1>\n  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">');
    changes.push("Added a responsive viewport declaration.");
  }
  if(updated!==html)await fsp.writeFile(indexPath,updated);
  job.metadata=metadata;job.stagingRoot=stagingRoot;job.prepareChanges=changes;
  await fsp.writeFile(path.join(job.jobDir,"prepared.json"),JSON.stringify({metadata,changes},null,2));
  return changes;
}

async function publishJob(job){
  if(!job.stagingRoot||!job.metadata)throw new Error("Prepare and preview the game before publishing.");
  if(job.published)throw new Error("This job has already been published.");
  const meta=job.metadata;
  const bucket=meta.grade==="extra"?"extra":`grade-${meta.grade}`;
  const destination=safeResolve(path.join(HUB_ROOT,"games"),bucket,meta.slug);
  if(fs.existsSync(destination))throw new Error(`Destination already exists: games/${bucket}/${meta.slug}`);
  const catalog=await readCatalog();
  if(catalog.some(game=>game.id===meta.id))throw new Error(`Game ID already exists: ${meta.id}`);

  await fsp.mkdir(path.dirname(destination),{recursive:true});
  await fsp.cp(job.stagingRoot,destination,{recursive:true,errorOnExist:true});
  let thumbnail="";
  const candidate=job.report.candidateThumbnail;
  if(candidate){
    const candidateSource=safeResolve(job.stagingRoot,candidate);
    if(fs.existsSync(candidateSource)){
      const ext=path.extname(candidateSource).toLowerCase()||".png";
      const thumbDir=path.join(HUB_ROOT,"thumbnails",bucket);
      await fsp.mkdir(thumbDir,{recursive:true});
      const thumbName=`${meta.slug}${ext}`;
      await fsp.copyFile(candidateSource,path.join(thumbDir,thumbName));
      thumbnail=`thumbnails/${bucket}/${thumbName}`;
    }
  }
  const sameGrade=catalog.filter(game=>String(game.grade)===meta.grade);
  const order=Math.max(0,...sameGrade.map(game=>Number(game.order)||0))+1;
  const updatedAt=currentDate();
  const record={
    id:meta.id,title:meta.title,grade:meta.grade==="extra"?"extra":Number(meta.grade),
    subject:meta.subject,topic:meta.topic,description:meta.description,thumbnail,
    gamePath:`games/${bucket}/${meta.slug}/index.html`,
    inputMethods:["mouse","touch"],orientation:"any",status:"published",
    featured:meta.featured,visible:true,order,updatedAt
  };
  catalog.push(record);
  await writeCatalog(catalog);
  job.published=true;
  return record;
}

const mimeTypes={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".gif":"image/gif",".svg":"image/svg+xml",".mp3":"audio/mpeg",".wav":"audio/wav",".woff":"font/woff",".woff2":"font/woff2"};
async function serveFile(res,file){
  let stat;
  try{stat=await fsp.stat(file);}
  catch(error){
    if(error.code==="ENOENT"){res.writeHead(404,{"content-type":"text/plain; charset=utf-8"});res.end("Not found.");return;}
    throw error;
  }
  if(stat.isDirectory())file=path.join(file,"index.html");
  const data=await fsp.readFile(file);
  res.writeHead(200,{"content-type":mimeTypes[path.extname(file).toLowerCase()]||"application/octet-stream","x-content-type-options":"nosniff","cache-control":"no-store"});
  res.end(data);
}

async function handle(req,res){
  const url=new URL(req.url,"http://127.0.0.1");
  res.setHeader("x-frame-options","SAMEORIGIN");
  res.setHeader("content-security-policy","default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-src 'self'; connect-src 'self'");

  if(req.method==="POST"&&url.pathname==="/api/login"){
    const key=req.socket.remoteAddress||"local",attempt=loginAttempts.get(key)||{count:0,until:0};
    if(Date.now()<attempt.until)return json(res,429,{error:"Too many attempts. Try again shortly."});
    const body=await readJsonBody(req);
    if(!safeEqual(body.password||"",ADMIN_PASSWORD)){
      attempt.count++;if(attempt.count>=5){attempt.count=0;attempt.until=Date.now()+30000;}loginAttempts.set(key,attempt);
      return json(res,401,{error:"Incorrect admin password."});
    }
    loginAttempts.delete(key);
    const token=crypto.randomBytes(32).toString("hex");sessions.add(token);
    res.setHeader("set-cookie",`gmaths_admin=${token}; HttpOnly; SameSite=Strict; Path=/`);
    return json(res,200,{authenticated:true});
  }
  if(req.method==="POST"&&url.pathname==="/api/logout"){
    sessions.delete(cookieToken(req));res.setHeader("set-cookie","gmaths_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");
    return json(res,200,{ok:true});
  }
  if(req.method==="GET"&&url.pathname==="/api/session"){
    return json(res,200,{authenticated:isAuthenticated(req)});
  }
  if(url.pathname.startsWith("/api/")&&!requireAuth(req,res))return;
  if(req.method==="GET"&&url.pathname==="/api/publication/status")return json(res,200,await publicationStatus());
  if(req.method==="POST"&&url.pathname==="/api/publication/github"){
    const body=await readJsonBody(req);
    return json(res,200,await publishToGithub(body.message));
  }
  if(req.method==="GET"&&url.pathname==="/api/games")return json(res,200,{games:await listGames()});
  let gameRoute=url.pathname.match(/^\/api\/games\/([^/]+)(?:\/(visibility|cover))?$/);
  if(gameRoute){
    const id=decodeURIComponent(gameRoute[1]),action=gameRoute[2]||"details";
    if(action==="details"&&req.method==="PATCH")return json(res,200,{game:await updateGame(id,await readJsonBody(req))});
    if(action==="details"&&req.method==="DELETE"){
      const body=await readJsonBody(req);
      return json(res,200,await deleteGame(id,body.confirmation));
    }
    if(action==="visibility"&&req.method==="POST"){
      const body=await readJsonBody(req);
      return json(res,200,{game:await setGameVisibility(id,body.visible)});
    }
    if(action==="cover"&&req.method==="POST"){
      const filename=url.searchParams.get("filename")||"cover.png";
      const contentType=String(req.headers["content-type"]||"").split(";")[0].trim().toLowerCase();
      return json(res,200,{game:await replaceGameCover(id,filename,contentType,await readBody(req,12*1024*1024))});
    }
    if(action==="cover"&&req.method==="DELETE")return json(res,200,{game:await removeGameCover(id)});
    return json(res,405,{error:"Method not allowed."});
  }
  if(req.method==="POST"&&url.pathname==="/api/upload")return uploadZip(req,res,url);

  let match=url.pathname.match(/^\/api\/jobs\/([a-f0-9-]+)\/(prepare|publish)$/);
  if(match){
    const job=jobFor(match[1]),action=match[2];
    if(req.method!=="POST")return json(res,405,{error:"Method not allowed."});
    if(action==="prepare"){
      const changes=await prepareJob(job,await readJsonBody(req));
      return json(res,200,{changes,previewUrl:`/preview/${job.id}/`});
    }
    if(action==="publish"){
      const record=await publishJob(job);
      return json(res,200,record);
    }
  }
  match=url.pathname.match(/^\/preview\/([a-f0-9-]+)\/(.*)$/);
  if(match){
    if(!requireAuth(req,res))return;
    const job=jobFor(match[1]);
    if(!job.stagingRoot)return json(res,404,{error:"Preview has not been prepared."});
    const relative=decodeURIComponent(match[2]||"index.html");
    res.setHeader("content-security-policy","default-src 'self' data: blob: https:; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; connect-src 'self' https:");
    return serveFile(res,safeResolve(job.stagingRoot,relative));
  }
  match=url.pathname.match(/^\/hub-file\/(.+)$/);
  if(match){
    if(!requireAuth(req,res))return;
    const relative=decodeURIComponent(match[1]);
    return serveFile(res,safeResolve(HUB_ROOT,...relative.replaceAll("\\","/").split("/")));
  }
  if(req.method==="GET"){
    const relative=url.pathname==="/index.html"||url.pathname==="/"? "index.html":decodeURIComponent(url.pathname.slice(1));
    res.setHeader("content-security-policy","default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-src 'self'; connect-src 'self'");
    return serveFile(res,safeResolve(PUBLIC_ROOT,relative));
  }
  json(res,404,{error:"Not found."});
}

fsp.mkdir(JOBS_ROOT,{recursive:true}).then(()=>{
  const server=http.createServer((req,res)=>handle(req,res).catch(error=>{
    console.error(error);
    if(!res.headersSent)json(res,500,{error:error.message||"Unexpected server error."});
    else res.end();
  }));
  server.listen(PORT,"127.0.0.1",()=>console.log(`GMaths Local Admin: http://127.0.0.1:${PORT}`));
});
