const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

let state = null;
let currentScreen = "home";

function headers(){
  const initData = tg?.initData || "";
  return {"Content-Type":"application/json","X-Telegram-Init-Data":initData};
}

async function api(path, options={}){
  const res = await fetch(path,{...options,headers:{...headers(),...(options.headers||{})}});
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.detail || "Ошибка");
  return data;
}

function demoUser(){
  return {id:1,first_name:"Fenix",username:"demo",coins:1000,xp:0,level:1,wins:0,losses:0,games_played:0,title:"Новичок"};
}

async function load(){
  try { state = await api("/api/me"); }
  catch(e){
    // Для обычного открытия в браузере оставляем демо-режим.
    state = {user:demoUser(),achievements:[],collection:[{name:"Fire Fenix",rarity:"Common"}]};
    showToast("Открой Mini App через Telegram для авторизации");
  }
  render();
}

function render(){
  const s=document.getElementById("screen");
  if(currentScreen==="home") s.innerHTML=home();
  if(currentScreen==="games") s.innerHTML=games();
  if(currentScreen==="collection") s.innerHTML=collection();
  if(currentScreen==="rating") loadRating();
  if(currentScreen==="profile") s.innerHTML=profile();
}

function home(){
 const u=state.user;
 const pct=Math.min(100,(u.xp%500)/5);
 return `<section class="hero center">
   <div class="avatar">🔥</div>
   <div class="name">${esc(u.first_name||"Fenix")}</div>
   <span class="badge">${esc(u.title||"Новичок")} • LEVEL ${u.level}</span>
   <div class="stats">
    <div class="stat"><b>💰 ${u.coins}</b><span>Coins</span></div>
    <div class="stat"><b>⭐ ${u.xp}</b><span>XP</span></div>
    <div class="stat"><b>🏆 ${u.wins}</b><span>Побед</span></div>
   </div>
   <div class="progress"><i style="width:${pct}%"></i></div>
   <button class="primary" onclick="bonus()">🎁 ЗАБРАТЬ DAILY BONUS</button>
 </section>
 <div class="section-title"><span>🔥 Быстрый старт</span></div>
 <div class="grid">
  <div class="game" onclick="go('games')"><div class="emoji">🎮</div><b>Играть</b><small>5 игр</small></div>
  <div class="game" onclick="go('collection')"><div class="emoji">🐦</div><b>Коллекция</b><small>${state.collection.length} Fenix</small></div>
  <div class="game" onclick="go('rating')"><div class="emoji">🏆</div><b>Рейтинг</b><small>TOP игроков</small></div>
  <div class="game" onclick="showToast('События V1.1')"><div class="emoji">🌋</div><b>События</b><small>Скоро</small></div>
 </div>`;
}

function games(){
 const arr=[
  ["🎲","Dice","dice"],["⚡","Reaction","reaction"],["💣","Mines","mines"],
  ["🏎️","Race","race"],["⚽","Football","football"]
 ];
 return `<div class="section-title"><span>🎮 FENIX GAMES</span><span class="badge">V1</span></div>
 <div class="grid">${arr.map(x=>`<div class="game" onclick="play('${x[2]}')"><div class="emoji">${x[0]}</div><b>${x[1]}</b><small>Играть</small></div>`).join("")}</div>
 <div class="card" style="margin-top:12px">💡 Победы дают XP и Fenix Coins. В V1 нет денежных ставок.</div>`;
}

async function play(game){
 try{
  const d=await api("/api/game/"+game,{method:"POST"});
  state.user=d.user;
  const text=d.result==="win" ? `🔥 Победа! +${d.reward} Coins` : d.result==="draw" ? "🤝 Ничья!" : "💀 Поражение";
  showToast(text); render();
 }catch(e){showToast(e.message)}
}

async function bonus(){
 try{
  const d=await api("/api/bonus",{method:"POST"});
  state.user=d.user;
  showToast(d.success?`🎁 +${d.reward} Coins`:"⏳ Бонус уже получен сегодня");
  render();
 }catch(e){showToast(e.message)}
}

function collection(){
 return `<div class="section-title"><span>🐦 МОЯ КОЛЛЕКЦИЯ</span></div>
 <div class="list">${state.collection.map(x=>`<div class="card"><div class="avatar" style="width:50px;height:50px;font-size:25px">🔥</div><div class="grow"><b>${esc(x.name)}</b><div class="muted">${esc(x.rarity)}</div></div><span>🐦</span></div>`).join("")}</div>
 <div class="card" style="margin-top:12px">🔒 Новые Fenix будут открываться через игры, события и достижения.</div>`;
}

async function loadRating(){
 const s=document.getElementById("screen");
 s.innerHTML=`<div class="section-title">🏆 РЕЙТИНГ</div><div class="card">Загрузка...</div>`;
 try{
  const d=await fetch("/api/leaderboard").then(r=>r.json());
  s.innerHTML=`<div class="section-title">🏆 GLOBAL TOP</div><div class="list">${
   d.items.map((x,i)=>`<div class="card"><b>#${i+1}</b><div class="grow"><b>${esc(x.first_name||x.username||"Fenix")}</b><div class="muted">Level ${x.level} • ${x.wins} побед</div></div><span>⭐ ${x.xp}</span></div>`).join("")
  }</div>`;
 }catch(e){s.innerHTML=`<div class="card">Не удалось загрузить рейтинг.</div>`}
}

function profile(){
 const u=state.user;
 return `<div class="hero center"><div class="avatar">🔥</div><div class="name">${esc(u.first_name)}</div><span class="badge">${esc(u.title)}</span>
 <div class="stats"><div class="stat"><b>${u.games_played}</b><span>Игр</span></div><div class="stat"><b>${u.wins}</b><span>Побед</span></div><div class="stat"><b>${u.losses}</b><span>Поражений</span></div></div></div>
 <div class="section-title">🏅 Достижения</div><div class="list">${
 state.achievements.length?state.achievements.map(a=>`<div class="card">🏆 <b>${esc(a.title)}</b></div>`).join(""):`<div class="card">Пока нет достижений. Сыграй первую игру!</div>`
 }</div>`;
}

function go(screen){
 currentScreen=screen;
 document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.screen===screen));
 render();
}
document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>go(b.dataset.screen));

function showToast(text){
 const t=document.querySelector(".toast")||document.body.appendChild(Object.assign(document.createElement("div"),{className:"toast"}));
 t.textContent=text;t.style.display="block";clearTimeout(window.toastTimer);
 window.toastTimer=setTimeout(()=>t.style.display="none",2200);
}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
load();
