const CLIENT_ID = '17911301156-6pbjojugqb4ate0n4qh62u9h6oj0vu69.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
let token = null;
let files = [];

const tokenClient = google.accounts.oauth2.initTokenClient({
  client_id: CLIENT_ID,
  scope: SCOPE,
  callback: (response) => {
    if (response.error) return alert('Login failed: ' + response.error);
    token = response.access_token;
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('app-section').style.display = 'block';
    document.getElementById('user-bar').style.display = 'flex';
    loadFiles();
  }
});

document.getElementById('google-login').onclick = () => tokenClient.requestAccessToken();

async function loadFiles() {
  const list = document.getElementById('playlist');
  list.innerHTML = '<li style="color:#1db954; text-align:center;">Loading music...</li>';
  
  let pageToken = '';
  files = [];
  let isFirstBatch = true;

  do {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("mimeType contains 'audio' and trashed = false")}&fields=nextPageToken,files(id,name)&pageSize=1000&pageToken=${pageToken}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    files = files.concat(data.files);
    pageToken = data.nextPageToken;

    if (isFirstBatch) {
      renderPlaylist();
      isFirstBatch = false;
    }
  } while (pageToken);
  renderPlaylist();
}

function renderPlaylist() {
  const list = document.getElementById('playlist');
  list.innerHTML = '';
  files.forEach(f => {
    const li = document.createElement('li');
    li.textContent = f.name.replace(/\.[^/.]+$/, ""); // Removes file extension for cleaner look
    li.onclick = () => playFile(f);
    list.appendChild(li);
  });
}

function playFile(file) {
  const player = document.getElementById('player');
  // Direct stream - NO Apps Script middleman!
  player.src = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&access_token=${token}`;
  player.load();
  player.play().catch(e => console.log("Autoplay blocked", e));
  logActivity(file.name);
}

function setUser() {
  const u = document.getElementById('username').value.trim();
  if (!u) return alert('Enter a username');
  localStorage.setItem('current_user', u);
  document.getElementById('current-user').textContent = `👤 ${u}`;
  document.getElementById('username').style.display = 'none';
  document.querySelector('#user-bar button').style.display = 'none';
  renderHistory();
}

function logActivity(songName) {
  const user = localStorage.getItem('current_user');
  if (!user) return;
  const key = `history_${user}`;
  const history = JSON.parse(localStorage.getItem(key) || '[]');
  history.push({ song: songName, time: new Date().toLocaleString() });
  localStorage.setItem(key, JSON.stringify(history));
  if (document.getElementById('history').style.display !== 'none') renderHistory();
}

function renderHistory() {
  const user = localStorage.getItem('current_user');
  const history = JSON.parse(localStorage.getItem(`history_${user}`) || '[]');
  const hList = document.getElementById('history');
  hList.innerHTML = history.map(h => `<li>${h.song}<small>${h.time}</small></li>`).reverse();
}

function showTab(tab, btn) {
  document.getElementById('playlist').style.display = tab === 'playlist' ? 'block' : 'none';
  document.getElementById('history').style.display = tab === 'history' ? 'block' : 'none';
  document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (tab === 'history') renderHistory();
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}
