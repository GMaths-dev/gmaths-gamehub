const assert=require("assert/strict");
const crypto=require("crypto");
const fs=require("fs/promises");
const os=require("os");
const path=require("path");
const {spawn}=require("child_process");

const toolRoot=path.resolve(__dirname,"..");
const port=4300+crypto.randomInt(500);
const password=`test-${crypto.randomBytes(8).toString("hex")}`;

async function waitForServer(child){
  for(let attempt=0;attempt<50;attempt++){
    if(child.exitCode!==null)throw new Error(`Admin server exited with code ${child.exitCode}.`);
    try{
      const response=await fetch(`http://127.0.0.1:${port}/api/session`);
      if(response.ok)return;
    }catch{}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error("Admin server did not start.");
}

async function main(){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"gmaths-admin-test-"));
  const hub=path.join(root,"hub"),data=path.join(root,"admin-data");
  const sourceDir=path.join(hub,"games","grade-2","test-game");
  const coverDir=path.join(hub,"thumbnails","grade-2");
  await fs.mkdir(path.join(hub,"data"),{recursive:true});
  await fs.mkdir(sourceDir,{recursive:true});
  await fs.mkdir(coverDir,{recursive:true});
  await fs.writeFile(path.join(sourceDir,"index.html"),"<!doctype html><title>Test Game</title>");
  await fs.writeFile(path.join(coverDir,"test-game.png"),Buffer.from("old-cover"));
  await fs.writeFile(path.join(hub,"data","games.json"),JSON.stringify([{
    id:"test-game",title:"Test Game",grade:2,subject:"English Math",topic:"Lesson 1",
    description:"Original description.",thumbnail:"thumbnails/grade-2/test-game.png",
    gamePath:"games/grade-2/test-game/index.html",orientation:"landscape",status:"published",
    featured:false,order:1,updatedAt:"2026-07-16"
  }],null,2));

  const child=spawn(process.execPath,["server.js"],{
    cwd:toolRoot,
    env:{...process.env,PORT:String(port),GMATHS_ADMIN_PASSWORD:password,GMATHS_HUB_ROOT:hub,GMATHS_ADMIN_DATA_ROOT:data,GMATHS_FORCE_COPY_MOVE:"1"},
    stdio:["ignore","pipe","pipe"]
  });
  let stderr="";
  child.stderr.on("data",chunk=>{stderr+=chunk;});

  try{
    await waitForServer(child);
    const base=`http://127.0.0.1:${port}`;
    const login=await fetch(`${base}/api/login`,{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({password})
    });
    assert.equal(login.status,200);
    const cookie=login.headers.get("set-cookie").split(";")[0];
    const request=(pathname,options={})=>fetch(base+pathname,{...options,headers:{cookie,...options.headers}});

    let response=await request("/api/games");
    let payload=await response.json();
    assert.equal(payload.games.length,1);
    assert.equal(payload.games[0].visible,true);

    response=await request("/api/games/test-game",{
      method:"PATCH",headers:{"content-type":"application/json"},
      body:JSON.stringify({title:"Edited Game",grade:3,subject:"English Math",topic:"Lesson 2",description:"Edited description.",orientation:"any",order:4,featured:true})
    });
    assert.equal(response.status,200);
    await fs.access(path.join(hub,"games","grade-3","test-game","index.html"));
    await fs.access(path.join(hub,"thumbnails","grade-3","test-game.png"));

    response=await request("/api/games/test-game/visibility",{
      method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({visible:false})
    });
    payload=await response.json();
    assert.equal(payload.game.visible,false);

    response=await request("/api/games/test-game/cover?filename=new.webp",{
      method:"POST",headers:{"content-type":"image/webp"},body:Buffer.from("new-cover")
    });
    assert.equal(response.status,200);
    await fs.access(path.join(hub,"thumbnails","grade-3","test-game.webp"));

    response=await request("/api/games/test-game/cover",{method:"DELETE"});
    assert.equal(response.status,200);

    response=await request("/api/games/test-game",{
      method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({confirmation:"Edited Game"})
    });
    assert.equal(response.status,200);
    payload=JSON.parse(await fs.readFile(path.join(hub,"data","games.json"),"utf8"));
    assert.equal(payload.length,0);
    const trashEntries=await fs.readdir(path.join(data,"trash"));
    assert.ok(trashEntries.length>=2);
    console.log("Admin integration test passed.");
  }finally{
    child.kill();
    await fs.rm(root,{recursive:true,force:true});
    if(stderr)process.stderr.write(stderr);
  }
}

main().catch(error=>{console.error(error);process.exitCode=1;});
