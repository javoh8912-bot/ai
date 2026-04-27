// ── 3D BACKGROUND LOGIC ──
let scene, camera, renderer, particles;
function init3D() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('canvas-container').appendChild(renderer.domElement);

  const geo = new THREE.BufferGeometry();
  const pos = [];
  for(let i=0; i<5000; i++) {
    pos.push((Math.random()-0.5)*100, (Math.random()-0.5)*100, (Math.random()-0.5)*100);
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ size: 0.1, color: 0x6366f1, transparent: true, opacity: 0.5 });
  particles = new THREE.Points(geo, mat);
  scene.add(particles);
  camera.position.z = 5;
}
function animate3D() {
  requestAnimationFrame(animate3D);
  particles.rotation.y += 0.001;
  particles.rotation.x += 0.0005;
  renderer.render(scene, camera);
}
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
init3D(); animate3D();

// ── CORE LOGIC ──
let currentUser = localStorage.getItem('ai_user');
let isLogin = true;
let imageMode = false;
let currentChat = null;
let history = [];
let settings = DB.getSettings();
let GEMINI_API_KEY = settings.apiKey;

function handleAuth() {
  const user = document.getElementById('login-user').value.trim();
  const pass = document.getElementById('login-pass').value.trim();
  if(!user || !pass) return showError("Barcha maydonlarni to'ldiring");

  let db = DB.getUsers();
  
  if(isLogin) {
    const u = db.find(x => x.user === user && x.pass === pass);
    if(u) loginSuccess(user);
    else showError("Login yoki parol xato");
  } else {
    if(db.find(x => x.user === user)) return showError("Bunday login mavjud");
    DB.saveUser({user, pass, avatar: null});
    loginSuccess(user);
  }
}

function loginSuccess(user) {
  localStorage.setItem('ai_user', user);
  currentUser = user;
  document.getElementById('auth-container').style.display = 'none';
  
  const u = DB.getUsers().find(x => x.user === user);


  if(user === 'Javoh') {
    document.getElementById('admin-container').style.display = 'block';
    renderAdmin();
  } else {
    document.getElementById('app-container').classList.add('active');
    document.getElementById('user-name-small').innerText = user;
    
    const avatarEl = document.getElementById('user-avatar-small');
    if (u && u.avatar) {
      avatarEl.innerHTML = `<img src="${u.avatar}">`;
    } else {
      avatarEl.innerText = user[0].toUpperCase();
    }
    loadChats();
  }
}


function switchAuth() {
  isLogin = !isLogin;
  document.getElementById('auth-title').innerText = isLogin ? "Xush Kelibsiz" : "Ro'yxatdan O'tish";
  document.getElementById('auth-desc').innerText = isLogin ? "Tizimga kirish uchun ma'lumotlarni kiriting" : "Yangi hisob yaratish uchun ma'lumotlarni kiriting";
  document.getElementById('auth-switch-btn').innerText = isLogin ? "Ro'yxatdan o'tish" : "Kirish";
  document.getElementById('auth-switch-msg').innerText = isLogin ? "Hali hisobingiz yo'qmi?" : "Hisobingiz bormi?";
}

function showError(m) {
  const e = document.getElementById('auth-error');
  e.innerText = m; e.style.display = 'block';
  setTimeout(() => e.style.display = 'none', 3000);
}

function logout() {
  localStorage.removeItem('ai_user');
  location.reload();
}

// ── CHAT LOGIC ──
function loadChats() {
  const list = DB.getUserChats(currentUser);
  const dom = document.getElementById('chat-list-dom');
  dom.innerHTML = '';
  list.forEach(c => {
    const el = document.createElement('div');
    el.className = `chat-item ${currentChat === c.id ? 'active' : ''}`;
    el.innerHTML = `<span>💬</span> <div style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.title}</div>`;
    el.onclick = () => selectChat(c.id);
    dom.appendChild(el);
  });
  if(!currentChat && list.length > 0) selectChat(list[0].id);
  else if(list.length === 0) createNewChat();
}

function createNewChat() {
  let chats = DB.getChats();
  if(!chats[currentUser]) chats[currentUser] = [];
  const id = Date.now().toString();
  chats[currentUser].unshift({ id, title: "Yangi suhbat", history: [] });
  DB.saveChats(chats);
  selectChat(id);
}

function selectChat(id) {
  currentChat = id;
  const c = DB.getUserChats(currentUser).find(x => x.id === id);
  history = c.history;
  renderMessages();
  loadChats();
}


function switchTab(t) {
  document.querySelectorAll('#profile-modal .btn-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.settings-tab').forEach(s => s.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById(`tab-${t}`).classList.add('active');
}

function switchAdminTab(t) {
  document.querySelectorAll('#admin-container .btn-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.admin-tab').forEach(s => s.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById(`admin-tab-${t}`).classList.add('active');
}


function updateProfile() {
  const newName = document.getElementById('new-name-in').value.trim();
  const newPass = document.getElementById('new-pass-in').value.trim();

  let updateData = {};
  if (newName) {
    let chats = DB.getChats();
    if (chats[currentUser]) {
      chats[newName] = chats[currentUser];
      delete chats[currentUser];
      DB.saveChats(chats);
    }
    updateData.user = newName;
    localStorage.setItem('ai_user', newName);
  }
  if (newPass) updateData.pass = newPass;

  DB.updateUser(currentUser, updateData);
  
  alert("Sozlamalar saqlandi!");
  location.reload();
}

function saveMasterApiKey(v) {
  DB.saveSetting('gemini_api_key', v);
  GEMINI_API_KEY = v;
}


function setTheme(c) {
  document.documentElement.style.setProperty('--primary', c);
  document.documentElement.style.setProperty('--primary-glow', c + '80');
  document.documentElement.style.setProperty('--grad', `linear-gradient(135deg, ${c} 0%, #a855f7 100%)`);
  DB.saveSetting('ai_theme', c);
  document.querySelectorAll('.color-dot').forEach(d => {
    d.classList.toggle('active', d.style.backgroundColor.includes(c));
  });
}

function updateBGIntensity(v) {
  if (particles) {
    particles.material.opacity = v / 100;
    DB.saveSetting('ai_bg_opacity', v);
  }
}

function handleAvatar(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(event) {
    const base64 = event.target.result;
    if (DB.updateUser(currentUser, { avatar: base64 })) {
      document.getElementById('profile-avatar-big').innerHTML = `<img src="${base64}">`;
      document.getElementById('user-avatar-small').innerHTML = `<img src="${base64}">`;
    }
  };
  reader.readAsDataURL(file);
}

// Load Theme
const savedTheme = DB.getSettings().theme;
if (savedTheme) setTheme(savedTheme);
const savedOp = DB.getSettings().bgOpacity;
if (savedOp) setTimeout(() => updateBGIntensity(savedOp), 1000);


function renderMessages() {

  const dom = document.getElementById('messages');
  dom.innerHTML = '';
  history.forEach(m => appendDOM(m.role === 'user' ? 'user' : 'ai', m.parts[0].text));
  dom.scrollTop = dom.scrollHeight;
}

function appendDOM(role, text) {
  const wrap = document.createElement('div');
  wrap.className = `msg-wrap ${role}`;
  const isImg = text.includes('<div class="ai-image-wrap">');
  
  let avatarHTML = role === 'ai' ? '✦' : currentUser[0];
  if (role === 'user') {
    const u = DB.getUsers().find(x => x.user === currentUser);
    if (u && u.avatar) avatarHTML = `<img src="${u.avatar}">`;
    
    // Save to global message DB
    DB.logMessage(currentUser, text);
  }



  wrap.innerHTML = `
    <div class="avatar" style="overflow:hidden;">${avatarHTML}</div>
    <div class="bubble ${role}">${isImg ? text : formatText(text)}</div>
  `;
  document.getElementById('messages').appendChild(wrap);
  document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
}


function formatText(t) {
  return t.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

function toggleImageMode() {
  imageMode = !imageMode;
  const btn = document.getElementById('image-mode-toggle');
  btn.classList.toggle('active');
  document.getElementById('prompt-in').placeholder = imageMode ? "Rasm uchun tavsif yozing..." : "Xabar yozing...";
}

async function sendMessage() {
  const inp = document.getElementById('prompt-in');
  const text = inp.value.trim();
  if(!text) return;
  inp.value = '';

  appendDOM('user', text);
  history.push({ role: 'user', parts: [{ text }] });

  if(imageMode || text.toLowerCase().includes('rasm')) {
    generateImage(text);
  } else {
    generateText(text);
  }
}

async function generateImage(text) {
  if(!GEMINI_API_KEY) return appendDOM('ai', "❌ API Keyni kiritishingiz kerak (Sozlamalar)");
  
  let prompt = text.replace(/rasm|chiz|yarat/gi, '').trim();
  appendDOM('ai', '✦ Rasm tayyorlanmoqda...');
  const loadingMsg = document.getElementById('messages').lastChild;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST', body: JSON.stringify({ contents: [{ parts: [{ text: `Translate the following prompt to English for image generation. Only output the translation, nothing else: ${prompt}` }] }] })
    });
    const data = await res.json();
    prompt = data.candidates[0].content.parts[0].text.trim();
  } catch(e) {}

  const url = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${Date.now()}`;
  const html = `
    <div class="ai-image-wrap">
      <img src="${url}" 
           onload="this.parentElement.previousElementSibling.style.display='none'; this.style.opacity=1" 
           onerror="this.src='https://via.placeholder.com/512?text=Rasm+yuklashda+xatolik'; this.style.opacity=1"
           style="opacity:0; transition:0.5s; width:100%; display:block;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
        <p style="font-size:11px; color:var(--text-muted); font-style:italic;">"${prompt}"</p>
        <a href="${url}" download="avenaa_ai.png" target="_blank" style="color:var(--primary); font-size:12px; text-decoration:none;">Download 📥</a>
      </div>
    </div>`;
  
  setTimeout(() => {
    loadingMsg.remove();
    appendDOM('ai', html);
    history.push({ role: 'model', parts: [{ text: html }] });
    saveCurrent();
  }, 1000);
}


async function generateText(text) {
  if(!GEMINI_API_KEY) return appendDOM('ai', "❌ API Keyni kiritishingiz kerak (Sozlamalar)");
  
  try {
    const cleanHistory = history.map(h => ({ role: h.role, parts: [{ text: h.parts[0].text.includes('<div') ? '[Rasm]' : h.parts[0].text }] }));
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST', body: JSON.stringify({ contents: cleanHistory })
    });
    const data = await res.json();
    const reply = data.candidates[0].content.parts[0].text;
    appendDOM('ai', reply);
    history.push({ role: 'model', parts: [{ text: reply }] });
    saveCurrent();
  } catch(e) {
    appendDOM('ai', "❌ Xatolik yuz berdi. API kalitni tekshiring.");
  }
}

function saveCurrent() {
  let chats = DB.getChats();
  const c = chats[currentUser].find(x => x.id === currentChat);
  c.history = history;
  if(c.title === "Yangi suhbat" && history.length > 0) c.title = history[0].parts[0].text.substring(0, 20);
  DB.saveChats(chats);
}

function openProfile() { 
  document.getElementById('profile-modal').style.display = 'flex'; 
  document.getElementById('new-name-in').value = currentUser;
  
  const u = DB.getUsers().find(x => x.user === currentUser);

  const avBig = document.getElementById('profile-avatar-big');
  if (u && u.avatar) {
    avBig.innerHTML = `<img src="${u.avatar}">`;
  } else {
    avBig.innerText = currentUser[0].toUpperCase();
  }
}


function closeProfile() { document.getElementById('profile-modal').style.display = 'none'; }

function renderAdmin() {
  const users = DB.getUsers();
  const chats = DB.getChats();
  document.getElementById('stat-users').innerText = users.length;
  let total = 0; Object.values(chats).forEach(x => total += x.length);
  document.getElementById('stat-chats').innerText = total;

  const masterKeyIn = document.getElementById('admin-api-key');
  if(masterKeyIn) masterKeyIn.value = GEMINI_API_KEY;

  const table = document.getElementById('admin-table');

  table.innerHTML = '';
  users.forEach(u => {
    let avatar = u.avatar ? `<img src="${u.avatar}" style="width:30px; height:30px; border-radius:50%; object-fit:cover;">` : `<div style="width:30px; height:30px; border-radius:50%; background:var(--grad); display:flex; align-items:center; justify-content:center; font-size:10px;">${u.user[0]}</div>`;
    table.innerHTML += `
      <tr style="border-top: 1px solid var(--border);">
        <td style="padding: 16px; display:flex; align-items:center; gap:10px;">${avatar} ${u.user}</td>
        <td>27.04.2026</td>
        <td><span style="color:#22c55e">Active</span></td>
      </tr>
    `;
  });

  const msgTable = document.getElementById('admin-messages-table');
  const globalMsgs = DB.getGlobalMessages();
  msgTable.innerHTML = '';
  globalMsgs.forEach(m => {
    msgTable.innerHTML += `
      <tr style="border-top: 1px solid var(--border); font-size:12px;">
        <td style="padding: 12px; color:var(--primary); font-weight:600;">${m.user}</td>
        <td style="padding: 12px; color:var(--text-muted);">${m.text.substring(0, 100)}${m.text.length > 100 ? '...' : ''}</td>
        <td style="padding: 12px; font-size:10px;">${m.date}</td>
      </tr>
    `;
  });
}



function executeSQL() {
  const inp = document.getElementById('sql-input');
  const out = document.getElementById('sql-output');
  const query = inp.value;
  if(!query) return;

  const result = DB.runSQL(query);
  out.innerHTML += `<br><span style="color: #22c55e;">mysql></span> ${query}`;
  
  if (result.error) {
    out.innerHTML += `<br><span style="color: #ef4444;">ERROR: ${result.error}</span>`;
  } else {
    out.innerHTML += `<br><span style="color: #a855f7;">Result:</span><br>${JSON.stringify(result, null, 2)}`;
  }
  
  inp.value = '';
  out.scrollTop = out.scrollHeight;
}

function toggleSidebar() {

  document.getElementById('sidebar').classList.toggle('active');
}

if(currentUser) loginSuccess(currentUser);
DB.syncWithFile();

