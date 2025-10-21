'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
const W = canvas.width, H = canvas.height;

// HUD
const timeEl = document.getElementById('time');
const messageEl = document.getElementById('message');

// Telas
const startScreen = document.getElementById('startScreen');
const difficultyScreen = document.getElementById('difficultyScreen');
const gameOverScreen = document.getElementById('gameover');
const victoryScreen = document.getElementById('victory');

// Botões
const startBtn = document.getElementById('startBtn');
const easyBtn = document.getElementById('easyBtn');
const hardBtn = document.getElementById('hardBtn');
const restartBtn = document.getElementById('restartBtn');
const restartWinBtn = document.getElementById('restartWinBtn');

// Sprites
const fundoImg = new Image();
fundoImg.src = "images/fundo_lua.png";
const meteoroImg = new Image();
meteoroImg.src = "images/meteoro.png";
const meteoroAzulImg = new Image();
meteoroAzulImg.src = "images/meteoro.png";

// Sprites diferentes para cada player
const player1Img = new Image();
player1Img.src = "images/foguete_usa.png";   // esquerda
const player2Img = new Image();
player2Img.src = "images/foguete_urss.png"; // direita

// Estado
let playing = false;
let startTime = 0;
const TOTAL_TIME = 60;
let remaining = TOTAL_TIME;
let spawnInterval = 900;
let spawnTimer = 0;
let lastFrame = 0;
let difficultyFactorBase = 1;
let difficultyMode = null;
let meteors = [];
let particles = [];
let keys = {};

const halfW = W / 2;

const player1 = { x: halfW/2, y: H-80, w: 46, h: 46, speed: 6, lives: 3, survived: 0, active: true, side: "left" };
const player2 = { x: halfW+halfW/2, y: H-80, w: 46, h: 46, speed: 6, lives: 3, survived: 0, active: true, side: "right" };

// ==== Funções utilitárias ====
function playBeep(freq=440,time=0.06,type='sine',vol=0.08){ try{
  const AudioContext = window.AudioContext||window.webkitAudioContext;
  if(!playBeep._ctx) playBeep._ctx = new AudioContext();
  const audioCtx = playBeep._ctx;
  const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
  o.type=type; o.frequency.value=freq; g.gain.value=vol;
  o.connect(g); g.connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime+time);
}catch(e){}}

function rand(min,max){ return Math.random()*(max-min)+min; }
function now(){ return performance.now(); }

// ==== Spawn meteoro ====
function spawnMeteor(forPlayer=1){
  const size = rand(20,48)*(0.9+difficultyFactorBase*0.15);
  const vx = (Math.random()-0.5)*1.4*difficultyFactorBase;
  const vy = rand(1.8,3.2)*difficultyFactorBase + difficultyFactorBase*0.8;
  const isBlue = Math.random()<0.25;

  let sx;
  if(forPlayer===1){
    sx = rand(40,halfW-40);
  } else {
    sx = rand(halfW+40,W-40);
  }

  meteors.push({x:sx,y:-size-10,vx,vy,size,sprite:isBlue?meteoroAzulImg:meteoroImg,target:forPlayer});
}

function spawnParticles(x,y,color,amt=18){
  for(let i=0;i<amt;i++){
    particles.push({x,y,vx:rand(-4,4),vy:rand(-6,2),
      life:rand(400,1000),born:now(),size:rand(2,6),color});
  }
}

function circleRectCollision(cx,cy,r,rx,ry,rw,rh){
  const nearestX=Math.max(rx,Math.min(cx,rx+rw));
  const nearestY=Math.max(ry,Math.min(cy,ry+rh));
  const dx=cx-nearestX, dy=cy-nearestY;
  return (dx*dx+dy*dy)<(r*r);
}

// ==== Controle ====
function reset(){
  meteors=[]; particles=[]; keys={};
  player1.lives=3; player2.lives=3;
  player1.survived=0; player2.survived=0;
  player1.active=true; player2.active=true;
  remaining=TOTAL_TIME; spawnInterval=900; spawnTimer=0; lastFrame=0;
  difficultyFactorBase=1; difficultyMode=null;
  hideAllScreens(); startScreen.style.visibility="visible";
  draw();
}

function startGame(){
  playing=true; startTime=performance.now();
  lastFrame=performance.now(); spawnTimer=spawnInterval;
  hideAllScreens(); messageEl.textContent="";
  playBeep(660,0.06,'square',0.06);
  requestAnimationFrame(loop);
}

function endGame(){
  playing=false; hideAllScreens();
  victoryScreen.style.visibility="visible";
}

function updateHUD(){
  timeEl.textContent=Math.max(0,Math.ceil(remaining));
}

// ==== Eventos ====
startBtn.onclick=()=>{ hideAllScreens(); difficultyScreen.style.visibility="visible"; };
easyBtn.onclick=()=>{ spawnInterval=900; difficultyFactorBase=1; difficultyMode="facil"; startGame(); };
hardBtn.onclick=()=>{ spawnInterval=600; difficultyFactorBase=1.8; difficultyMode="dificil"; startGame(); };
restartBtn.onclick=()=>{ gameOverScreen.style.visibility="hidden"; reset(); };
restartWinBtn.onclick=()=>{ victoryScreen.style.visibility="hidden"; reset(); };

function hideAllScreens(){
  startScreen.style.visibility="hidden";
  difficultyScreen.style.visibility="hidden";
  gameOverScreen.style.visibility="hidden";
  victoryScreen.style.visibility="hidden";
}

window.addEventListener('keydown', e=>{ keys[e.key.toLowerCase()]=true; });
window.addEventListener('keyup', e=>{ keys[e.key.toLowerCase()]=false; });

// ==== Loop ====
function loop(timestamp){
  const dt=timestamp-lastFrame; lastFrame=timestamp;
  if(playing){
    const elapsedSec=(timestamp-startTime)/1000;
    remaining=Math.max(0,TOTAL_TIME-elapsedSec);
    difficultyFactorBase=(difficultyMode==="dificil")?
      1.8+(elapsedSec/TOTAL_TIME)*2.5:
      1+(elapsedSec/TOTAL_TIME)*2.2;

    spawnTimer+=dt;
    if(spawnTimer>=spawnInterval){
      spawnTimer-=spawnInterval;
      spawnMeteor(1); spawnMeteor(2);
      spawnInterval=Math.max(250,spawnInterval-8);
    }

    updatePlayer(player1,keys['a'],keys['d'],keys['w'],keys['s'],0,halfW);
    updatePlayer(player2,keys['arrowleft'],keys['arrowright'],keys['arrowup'],keys['arrowdown'],halfW,W);

    updateMeteors();
    updateParticles(timestamp);

    if(remaining<=0){ endGame(); return; }
  }

  draw(); updateHUD();
  if(playing) requestAnimationFrame(loop);
}

function updatePlayer(p,left,right,up,down,xMin,xMax){
  if(!p.active) return;
  let mvX=0;
  if(left) mvX=-1;
  if(right) mvX=1;
  p.x+=mvX*p.speed;
  if(up) p.y-=p.speed*0.9;
  else if(down) p.y+=p.speed*0.9;
  else p.y+=((H-80)-p.y)*0.05;

  p.x=Math.max(xMin+10,Math.min(xMax-p.w-10,p.x));
  p.y=Math.max(30,Math.min(H-p.h-10,p.y));
}

function updateMeteors(){
  for(let i=meteors.length-1;i>=0;i--){
    const m=meteors[i]; m.x+=m.vx; m.y+=m.vy;

    const target=(m.target===1?player1:player2);
    if(!target.active){ meteors.splice(i,1); continue; }

    if(m.y-m.size>H+200){
      meteors.splice(i,1); target.survived++;
    } else if(circleRectCollision(m.x,m.y,m.size*0.85,target.x,target.y,target.w,target.h)){
      spawnParticles(m.x,m.y,"#fff",20);
      meteors.splice(i,1); target.lives--; playBeep(120,0.18,'sawtooth',0.12);
      if(target.lives<=0) target.active=false;
    }
  }
}

function updateParticles(timestamp){
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i]; const age=timestamp-p.born;
    if(age>p.life){particles.splice(i,1);continue;}
    p.vy+=0.18; p.x+=p.vx; p.y+=p.vy; p.size*=0.998;
  }
}

// ==== Draw ====
function draw(){
  ctx.clearRect(0,0,W,H);
  if(fundoImg.complete) ctx.drawImage(fundoImg,0,0,W,H);
  else ctx.fillRect(0,0,W,H);

  ctx.fillStyle="rgba(255,255,255,0.2)";
  ctx.fillRect(halfW-2,0,4,H);

  for(const m of meteors){
    if(m.sprite&&m.sprite.complete) ctx.drawImage(m.sprite,m.x-m.size,m.y-m.size,m.size*2,m.size*2);
  }

  drawPlayer(player1,"#0f0",1);
  drawPlayer(player2,"#00f",2);

  for(const p of particles){
    const ageFrac=(now()-p.born)/p.life;
    ctx.globalAlpha=Math.max(0.02,1-ageFrac);
    ctx.beginPath(); ctx.arc(p.x,p.y,Math.max(1,p.size),0,Math.PI*2);
    ctx.fillStyle=p.color; ctx.fill();
  }
  ctx.globalAlpha=1;

  drawHUDPlayer(player1,20,20,"Jogador 1");
  drawHUDPlayer(player2,W-180,20,"Jogador 2");
}

function drawPlayer(p,color,num){
  if(!p.active) return;
  const img = (num===1?player1Img:player2Img);
  if(img.complete) ctx.drawImage(img,p.x,p.y,p.w,p.h);
  else{ ctx.fillStyle=color; ctx.fillRect(p.x,p.y,p.w,p.h); }
}

function drawHUDPlayer(p,x,y,label){
  ctx.fillStyle="#fff"; ctx.font="14px Arial";
  ctx.fillText(`${label} - Vidas:${p.lives} Pontos:${p.survived}`,x,y);
}

// ==== Start ====
reset();
