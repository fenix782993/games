const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

let state = null;
let currentScreen = "home";
let currentBet = 100;
const bets = [50, 100, 250, 500, 1000, 5000];

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
  return {id:1,first_name:"Fenix",username:"demo",coins:5000,xp:120,level:3,wins:12,losses:5,games_played:17,title:"Игрок"};
}

async function load(){
  try { state = await api("/api/me"); }
  catch(e){
    state = {
      user: demoUser(),
      achievements: [{title:"Первые шаги"}],
      collection: [{name:"Fire Fenix",rarity:"Legendary"}],
      quests: [{title:"Сыграй 3 игры",progress:"3/3",reward:200,done:true}]
    };
    showToast("Демо-режим V3 (запустите через Telegram Mini App)");
  }
  render();
}

function render(){
  const s = document.getElementById("screen");
  if(currentScreen==="home") s.innerHTML = home();
  if(currentScreen==="games") s.innerHTML = gamesList();
  if(currentScreen==="quests") loadQuests();
  if(currentScreen==="shop") s.innerHTML = shop();
  if(currentScreen==="collection") s.innerHTML = collection();
  if(currentScreen==="rating") loadRating();
  if(currentScreen==="profile") s.innerHTML = profile();
}

function renderBetSelector(){
  return `<div class="section-title"><span>💵 Ставка</span></div>
  <div class="bet-selector">
    ${bets.map(b => `<button class="bet-btn ${currentBet===b?'active':''}" onclick="setBet(${b})">${b}</button>`).join('')}
  </div>`;
}

function setBet(b){
  currentBet = b;
  render();
}

function home(){
 const u = state.user;
 const pct = Math.min(100, (u.xp % 500) / 5);
 return `<section class="hero center">
   <div class="avatar">🔥</div>
   <div class="name">${esc(u.first_name||"Fenix")}</div>
   <span class="badge">${esc(u.title||"Новичок")} • LEVEL ${u.level} • 🔥 Streak ${u.streak || 1}</span>
   <div class="stats">
    <div class="stat"><b>💰 ${u.coins}</b><span>Coins</span></div>
    <div class="stat"><b>⭐ ${u.xp}</b><span>XP</span></div>
    <div class="stat"><b>🏆 ${u.wins}</b><span>Побед</span></div>
   </div>
   <div class="progress"><i style="width:${pct}%"></i></div>
   <button class="primary" onclick="bonus()">🎁 ЗАБРАТЬ DAILY BONUS</button>
 </section>
 <div class="section-title"><span>🔥 Быстрый старт V3</span></div>
 <div class="grid">
  <div class="game" onclick="go('games')"><div class="emoji">🎮</div><b>Игры</b><small>Mines, Slots, Dice...</small></div>
  <div class="game" onclick="go('quests')"><div class="emoji">🎯</div><b>Квесты</b><small>Награды Coins/XP</small></div>
  <div class="game" onclick="go('shop')"><div class="emoji">🛒</div><b>Магазин</b><small>Бустеры и скины</small></div>
  <div class="game" onclick="go('rating')"><div class="emoji">🏆</div><b>Рейтинг</b><small>TOP игроков</small></div>
 </div>`;
}

function gamesList(){
 const arr=[
  ["💣","Mines 5x5","openMines"],["🎰","Slots 3x3","openSlots"],
  ["🎲","Dice","dice"],["⚽","Football","football"],
  ["🏎️","Race","race"],["⚡","Reaction","reaction"],["👥","PvP Dice","pvp"]
 ];
 return `<div class="section-title"><span>🎮 FENIX GAMES V3</span><span class="badge">Backend Active</span></div>
 <div class="grid">${arr.map(x=>`<div class="game" onclick="${x[2]}()"><div class="emoji">${x[0]}</div><b>${x[1]}</b><small>Играть</small></div>`).join("")}</div>`;
}

// --- MINES GAME INTERFACE ---
function openMines(){
  const s = document.getElementById("screen");
  s.innerHTML = `
    <div class="section-title"><span>💣 MINES 5x5</span><button class="badge" onclick="go('games')">Назад</button></div>
    ${renderBetSelector()}
    <div class="card center">Нажми «Старт», чтобы запустить игру с выбранной ставкой.</div>
    <button class="primary" onclick="startMinesGame()">🎲 СТАРТ ИГРЫ</button>
  `;
}

async function startMinesGame(){
  try {
    // Пример запроса к бэкенду на старт игры
    showToast("Игра Mines запущена! Выбирай ячейки.");
    const s = document.getElementById("screen");
    s.innerHTML = `
      <div class="section-title"><span>💣 MINES 5x5</span><button class="badge" onclick="openMines()">Сдаться</button></div>
      <div class="center muted">Ставка: ${currentBet} Coins</div>
      <div class="mines-grid">
        ${Array(25).fill(0).map((_,i)=>`<div class="mine-cell" onclick="hitMine(${i})">❓</div>`).join('')}
      </div>
    `;
  } catch(e){ showToast(e.message); }
}

function hitMine(index){
  // Интерактивный клик по клетке
  const cell = document.querySelectorAll('.mine-cell')[index];
  cell.textContent = "⭐";
  cell.style.background = "#1f3a28";
  showToast("Успех! Множитель растет 📈");
}

// --- SLOTS GAME INTERFACE ---
function openSlots(){
  const s = document.getElementById("screen");
  s.innerHTML = `
    <div class="section-title"><span>🎰 SLOTS 3x3</span><button class="badge" onclick="go('games')">Назад</button></div>
    ${renderBetSelector()}
    <div class="slots-board" id="slotsBoard">
      <span>🍒</span><span>🍋</span><span>⭐</span>
    </div>
    <button class="primary" onclick="spinSlots()">🎰 КРУТИТЬ БАРАБАН</button>
  `;
}

async function spinSlots(){
  try {
    const emojis = ["🍒", "🍋", "⭐", "💎", "🔥", "7️⃣"];
    const board = document.getElementById("slotsBoard");
    board.innerHTML = `<span>${emojis[Math.floor(Math.random()*emojis.length)]}</span><span>${emojis[Math.floor(Math.random()*emojis.length)]}</span><span>${emojis[Math.floor(Math.random()*emojis.length)]}</span>`;
    showToast("🎰 Выпала комбинация! Баланс обновлен.");
  } catch(e){ showToast(e.message); }
}

async function play(game){
 try{
  const d = await api("/api/game/"+game, {method:"POST", body: JSON.stringify({bet: currentBet})});
  state.user = d.user;
  const text = d.result==="win" ? `🔥 Победа! +${d.reward} Coins` : "💀 Поражение";
  showToast(text); render();
 }catch(e){showToast(e.message)}
}

async function bonus(){
 try{
  const d = await api("/api/bonus", {method:"POST"});
  state.user = d.user;
  showToast(d.success?`🎁 +${d.reward} Coins`:"⏳ Бонус уже получен");
  render();
 }catch(e){showToast(e.message)}
}

function loadQuests(){
  const s = document.getElementById("screen");
  s.innerHTML = `
    <div class="section-title"><span>🎯 ЕЖЕДНЕВНЫЕ КВЕСТЫ</span></div>
    <div class="list">
      <div class="card">
        <div class="avatar" style="width:40px;height:40px;font-size:20px">🎯</div>
        <div class="grow"><b>Сыграй 3 игры в Mines</b><div class="muted">Награда: 250 XP • 500 Coins</div></div>
        <button class="badge" style="background:var(--red);color:#fff" onclick="showToast('Выполнено!')">Забрать</button>
      </div>
      <div class="card">
        <div class="avatar" style="width:40px;height:40px;font-size:20px">🔥</div>
        <div class="grow"><b>Поддерживай Streak 3 дня</b><div class="muted">Награда: Редкий Fenix</div></div>
        <span class="badge">В процессе</span>
      </div>
    </div>
  `;
}

function shop(){
  return `
    <div class="section-title"><span>🛒 МАГАЗИН ЭКОСИСТЕМЫ</span></div>
    <div class="list">
      <div class="card">
        <div class="avatar" style="width:45px;height:45px;font-size:22px">⚡</div>
        <div class="grow"><b>Бустер XP x2 (24 часа)</b><div class="muted">Ускорь прокачку уровня</div></div>
        <button class="badge" style="background:var(--red);color:#fff" onclick="showToast('Куплено!')">1000 💰</button>
      </div>
      <div class="card">
        <div class="avatar" style="width:45px;height:45px;font-size:22px">👑</div>
        <div class="grow"><b>Титул «Магнат»</b><div class="muted">Эксклюзивный статус в профиле</div></div>
        <button class="badge" style="background:var(--red);color:#fff" onclick="showToast('Куплено!')">5000 💰</button>
      </div>
    </div>
  `;
}

function collection(){
 return `<div class="section-title"><span>🐦 КОЛЛЕКЦИЯ FENIX</span></div>
 <div class="list">${state.collection.map(x=>`<div class="card"><div class="avatar" style="width:50px;height:50px;font-size:25px">🔥</div><div class="grow"><b>${esc(x.name)}</b><div class="muted">${esc(x.rarity)}</div></div><span>🐦</span></div>`).join("")}</div>`;
}

async function loadRating(){
 const s = document.getElementById("screen");
 s.innerHTML = `<div class="section-title">🏆 РЕЙТИНГ V3</div><div class="card">Загрузка топа...</div>`;
 try{
  const d = await fetch("/api/leaderboard").then(r=>r.json());
  s.innerHTML = `<div class="section-title">🏆 GLOBAL TOP V3</div><div class="list">${
   d.items.map((x,i)=>`<div class="card"><b>#${i+1}</b><div class="grow"><b>${esc(x.first_name||"Fenix")}</b><div class="muted">Level ${x.level} • ${x.wins} побед</div></div><span>⭐ ${x.xp}</span></div>`).join("")
  }</div>`;
 }catch(e){
   // Демо-регби для лидерборда при отсутствии бэкенда
   s.innerHTML = `<div class="section-title">🏆 GLOBAL TOP V3</div><div class="list">
     <div class="card"><b>#1</b><div class="grow"><b>AlphaFenix</b><div class="muted">Level 42 • 320 побед</div></div><span>⭐ 18450</span></div>
     <div class="card"><b>#2</b><div class="grow"><b>CryptoKing</b><div class="muted">Level 38 • 290 побед</div></div><span>⭐ 15200</span></div>
   </div>`;
 }
}

function profile(){
 const u = state.user;
 return `<div class="hero center"><div class="avatar">🔥</div><div class="name">${esc(u.first_name)}</div><span class="badge">${esc(u.title)}</span>
 <div class="stats"><div class="stat"><b>${u.games_played}</b><span>Игр</span></div><div class="stat"><b>${u.wins}</b><span>Побед</span></div><div class="stat"><b>${u.losses}</b><span>Поражений</span></div></div></div>
 <div class="section-title">🏅 Достижения V3</div><div class="list">${
 state.achievements.length?state.achievements.map(a=>`<div class="card">🏆 <b>${esc(a.title)}</b></div>`).join(""):`<div class="card">Пока нет достижений.</div>`
 }</div>`;
}

function go(screen){
 currentScreen = screen;
 document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active", b.dataset.screen===screen));
 render();
}
document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>go(b.dataset.screen));

function showToast(text){
 const t = document.querySelector(".toast")||document.body.appendChild(Object.assign(document.createElement("div"),{className:"toast"}));
 t.textContent = text; t.style.display = "block"; clearTimeout(window.toastTimer);
 window.toastTimer = setTimeout(()=>t.style.display="none", 2200);
}
function esc(v){return String(v?=""??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
load();