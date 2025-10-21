'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
const W = canvas.width, H = canvas.height;

// HUD
const timeEl = document.getElementById('time');
const livesEl = document.getElementById('life');
const survEl = document.getElementById('surv');
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
fundoImg.src = "images/fundo.png";
const meteoroImg = new Image();
meteoroImg.src = "images/bomba.png";
const meteoroAzulImg = new Image();
meteoroAzulImg.src = "images/missil.png";
const playerImg = new Image();
playerImg.src = "images/sordadinho.png";

// Estado
let playing = false;
let startTime = 0;
const TOTAL_TIME = 60;
let remaining = TOTAL_TIME;
let lives = 3;
let survived = 0;
let meteors = [];
let particles = [];
let keys = {};
let spawnInterval = 900;
let spawnTimer = 0;
let lastFrame = 0;
let difficultyFactorBase = 1;
let difficultyMode = null;

const player = { x: W/2, y: H-80, w: 46, h: 46, speed: 6 };

// ==== Funções utilitárias ====
function playBeep(freq=440, time=0.06, type='sine', vol=0.08){
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if(!playBeep._ctx) playBeep._ctx = new AudioContext();
    const audioCtx = playBeep._ctx;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = vol; o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + time);
  } catch(e){}
}
function rand(min,max){ return Math.random()*(max-min)+min; }
function now(){ return performance.now(); }

// ==== Spawn meteoro ====
function spawnMeteor(){
  const size = rand(20,48)*(0.9+difficultyFactorBase*0.15);
  const sx = rand(40,W-40);
  const vx = (Math.random()-0.5)*1.4*difficultyFactorBase;
  const vy = rand(1.8,3.2)*difficultyFactorBase + difficultyFactorBase*0.8;
  const isBlue = Math.random()<0.25;
  meteors.push({x:sx,y:-size-10,vx,vy,size,sprite:isBlue?meteoroAzulImg:meteoroImg});
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
  lives=3; remaining=TOTAL_TIME; survived=0;
  spawnInterval=900; spawnTimer=0; lastFrame=0;
  difficultyFactorBase=1; difficultyMode=null;
  player.x=W/2; player.y=H-80;
  hideAllScreens(); startScreen.style.visibility="visible";
  updateHUD(); draw();
}

function startGame(){
  playing=true; startTime=performance.now();
  lastFrame=performance.now(); spawnTimer=spawnInterval;
  hideAllScreens(); messageEl.textContent="";
  playBeep(660,0.06,'square',0.06);
  requestAnimationFrame(loop);
}

function endGame(win=false){
  playing=false; hideAllScreens();
  if(win){ victoryScreen.style.visibility="visible"; playBeep(880,0.18,'sine',0.12);}
  else{ gameOverScreen.style.visibility="visible"; playBeep(120,0.3,'sawtooth',0.16);}
}

function updateHUD(){
  timeEl.textContent=Math.max(0,Math.ceil(remaining));
  livesEl.textContent=lives;
  survEl.textContent=survived;
}

// ==== Eventos ====
startBtn.onclick=()=>{ hideAllScreens(); difficultyScreen.style.visibility="visible"; };
easyBtn.onclick=()=>{ lives=3; spawnInterval=900; difficultyFactorBase=1; difficultyMode="facil"; startGame(); };
hardBtn.onclick=()=>{ lives=1; spawnInterval=600; difficultyFactorBase=1.8; difficultyMode="dificil"; startGame(); };
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
      spawnTimer-=spawnInterval; spawnMeteor();
      spawnInterval=Math.max(250,spawnInterval-8);
    }

    let mvX=0;
    if(keys['arrowleft']||keys['a']) mvX=-1;
    if(keys['arrowright']||keys['d']) mvX=1;
    player.x+=mvX*player.speed;
    if(keys['arrowup']||keys['w']) player.y=Math.max(40,player.y-player.speed*0.9);
    else if(keys['arrowdown']||keys['s']) player.y=Math.min(H-player.h-10,player.y+player.speed*0.9);
    else player.y+=((H-80)-player.y)*0.05;
    player.x=Math.max(10,Math.min(W-player.w-10,player.x));
    player.y=Math.max(30,Math.min(H-player.h-10,player.y));

    for(let i=meteors.length-1;i>=0;i--){
      const m=meteors[i]; m.x+=m.vx; m.y+=m.vy;
      if(m.y-m.size>H+200||m.x<-200||m.x>W+200){
        meteors.splice(i,1); survived++;
      }else if(circleRectCollision(m.x,m.y,m.size*0.85,player.x,player.y,player.w,player.h)){
        spawnParticles(m.x,m.y,"#fff",20);
        meteors.splice(i,1); lives--; playBeep(120,0.18,'sawtooth',0.12);
        if(lives<=0){ updateHUD(); endGame(false); return; }
      }
    }

    for(let i=particles.length-1;i>=0;i--){
      const p=particles[i]; const age=timestamp-p.born;
      if(age>p.life){particles.splice(i,1);continue;}
      p.vy+=0.18; p.x+=p.vx; p.y+=p.vy; p.size*=0.998;
    }

    if(remaining<=0){ updateHUD(); endGame(true); return; }
  }

  draw(); updateHUD();
  if(playing) requestAnimationFrame(loop);
}

// ==== Draw ====
function draw(){
  ctx.clearRect(0,0,W,H); drawBackground();
  for(const m of meteors){
    if(m.sprite&&m.sprite.complete) ctx.drawImage(m.sprite,m.x-m.size,m.y-m.size,m.size*2,m.size*2);
    else{ ctx.beginPath(); ctx.arc(m.x,m.y,m.size,0,Math.PI*2); ctx.fillStyle="#fff"; ctx.fill(); }
  }
  if(playerImg.complete) ctx.drawImage(playerImg,player.x,player.y,player.w,player.h);
  else{ ctx.fillStyle="#0f0"; ctx.fillRect(player.x,player.y,player.w,player.h); }

  for(const p of particles){
    const ageFrac=(now()-p.born)/p.life;
    ctx.globalAlpha=Math.max(0.02,1-ageFrac);
    ctx.beginPath(); ctx.arc(p.x,p.y,Math.max(1,p.size),0,Math.PI*2);
    ctx.fillStyle=p.color; ctx.fill();
  }
  ctx.globalAlpha=1;
  drawTimerBar();
}

function drawBackground(){
  if(fundoImg.complete) ctx.drawImage(fundoImg,0,0,W,H);
  else{ ctx.fillStyle="#000"; ctx.fillRect(0,0,W,H); }
}

function drawTimerBar(){
  const barW=360, barH=12, x=(W-barW)/2, y=12;
  ctx.save(); ctx.fillStyle='rgba(255,255,255,0.03)';
  roundRect(ctx,x-4,y-6,barW+8,barH+12,8,true,false);
  const frac=(TOTAL_TIME-remaining)/TOTAL_TIME;
  const filled=Math.max(0,Math.min(barW,frac*barW));
  const g=ctx.createLinearGradient(x,0,x+barW,0);
  g.addColorStop(0,"#4b8bd9"); g.addColorStop(1,"#d94b4b");
  ctx.fillStyle=g; roundRect(ctx,x,y,filled,barH,6,true,false);
  ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1;
  roundRect(ctx,x-4,y-6,barW+8,barH+12,8,false,true);
  ctx.fillStyle='rgba(230,238,248,0.9)'; ctx.font='12px Arial';
  ctx.fillText(`Tempo restante: ${Math.ceil(remaining)}s`,x+barW/2-46,y+barH+8);
  ctx.restore();
}

function roundRect(ctx,x,y,w,h,r,fill,stroke){
  ctx.beginPath(); ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath(); if(fill)ctx.fill(); if(stroke)ctx.stroke();
}

// ==== Start ====
reset();
