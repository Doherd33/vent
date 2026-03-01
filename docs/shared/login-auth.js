/* ════════════════════════════════════════════════════════
   login-auth.js — auth logic: login, register, role routing
   Load this FIRST so SERVER is defined before cinematic.js
   ════════════════════════════════════════════════════════ */

// ════════════════════════════════════════════════════════
// SERVER + ROUTING
// ════════════════════════════════════════════════════════
const SERVER = window.location.origin;

const ROLE_ROUTES = {
  operator:    'query.html',
  qa:          'qa.html',
  director:    'dashboard.html',
  msat:        'query.html',
  engineering: 'qa.html',
  admin:       'dashboard.html',
};

// ════════════════════════════════════════════════════════
// AUTO-REDIRECT — verify existing token on load
// ════════════════════════════════════════════════════════
(async function checkExisting() {
  const token = localStorage.getItem('vent_token');
  const role  = localStorage.getItem('vent_role');
  if (!token || !role) return;
  try {
    const res = await fetch(SERVER + '/auth/me', {
      headers: { 'Authorization': 'Bearer ' + token },
    });
    if (res.ok) {
      window.location.replace(ROLE_ROUTES[role] || 'dashboard.html');
    } else {
      localStorage.removeItem('vent_token');
      localStorage.removeItem('vent_role');
      localStorage.removeItem('vent_name');
      localStorage.removeItem('vent_user_id');
    }
  } catch {
    // Server unreachable — stay on login
  }
})();

// ════════════════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════════════════
let selectedRole = null;
let selectedPath = null;

// ════════════════════════════════════════════════════════
// UI HELPERS
// ════════════════════════════════════════════════════════
function togglePw(inputId, btn) {
  const inp  = document.getElementById(inputId);
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  btn.querySelector('.eye-open').style.display = show ? 'none' : '';
  btn.querySelector('.eye-shut').style.display = show ? '' : 'none';
}

function checkMatch() {
  const pw  = document.getElementById('regPass').value;
  const cpw = document.getElementById('regPassConfirm').value;
  const tag = document.getElementById('matchTag');
  if (!cpw) { tag.className = 'match-tag hide'; tag.textContent = ''; return; }
  if (pw === cpw) { tag.className = 'match-tag ok'; tag.textContent = t('err.matchOk'); }
  else            { tag.className = 'match-tag no'; tag.textContent = t('err.matchNo'); }
}

function switchTab(tab, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById('loginPane').classList.toggle('show', tab === 'login');
  document.getElementById('registerPane').classList.toggle('show', tab === 'register');
  if (tab === 'register') backToStep1();
}

function selectPath(card) {
  document.querySelectorAll('.path-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  selectedPath = card.dataset.path;
  document.getElementById('step1Btn').disabled = false;
}

function goToStep2() {
  if (!selectedPath) return;
  document.getElementById('regStep1').style.display = 'none';
  document.getElementById('regStep2').style.display = 'block';

  if (selectedPath === 'floor') {
    selectedRole = 'operator';
    document.getElementById('deptPicker').style.display = 'none';
    document.getElementById('step2Title').textContent = t('login.almostThere');
    document.getElementById('step2Sub').textContent   = t('login.detailsSub');
  } else {
    selectedRole = null;
    document.getElementById('deptPicker').style.display = 'block';
    document.getElementById('step2Title').textContent = t('login.yourDept');
    document.getElementById('step2Sub').textContent   = t('login.deptSub');
  }
}

function backToStep1() {
  document.getElementById('regStep1').style.display = 'block';
  document.getElementById('regStep2').style.display = 'none';
  selectedRole = selectedPath === 'floor' ? 'operator' : null;
  document.querySelectorAll('.dept-item').forEach(d => d.classList.remove('selected'));
}

function selectDept(item) {
  document.querySelectorAll('.dept-item').forEach(d => d.classList.remove('selected'));
  item.classList.add('selected');
  selectedRole = item.dataset.role;
}

function selectRole(item) {
  // Legacy compat — retained for safety
  selectedRole = item.dataset.role;
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  setTimeout(() => { el.textContent = ''; }, 5000);
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (loading) {
    btn.classList.add('btn-loading');
    btn.dataset.origHtml = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> ' + t('login.pleaseWait');
  } else {
    btn.classList.remove('btn-loading');
    if (btn.dataset.origHtml) btn.innerHTML = btn.dataset.origHtml;
  }
}

function handleAuthSuccess(data) {
  localStorage.setItem('vent_token',   data.token);
  localStorage.setItem('vent_role',    data.user.role);
  localStorage.setItem('vent_name',    data.user.name);
  localStorage.setItem('vent_user_id', data.user.id);
  window.location.href = ROLE_ROUTES[data.user.role] || 'dashboard.html';
}

// ════════════════════════════════════════════════════════
// LOGIN
// ════════════════════════════════════════════════════════
async function doLogin() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPass').value;

  if (!email || !password) { showError('loginErr', t('err.emailPassword')); return; }

  setLoading('loginBtn', true);
  try {
    const res  = await fetch(SERVER + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) { showError('loginErr', data.error || t('err.signInFailed')); setLoading('loginBtn', false); return; }
    handleAuthSuccess(data);
  } catch {
    showError('loginErr', t('err.serverUnreachable'));
    setLoading('loginBtn', false);
  }
}

// ════════════════════════════════════════════════════════
// REGISTER
// ════════════════════════════════════════════════════════
async function doRegister() {
  if (!selectedRole) {
    showError('regErr', selectedPath === 'management' ? t('err.selectDept') : t('err.selectPath'));
    return;
  }
  const name            = document.getElementById('regName').value.trim();
  const email           = document.getElementById('regEmail').value.trim();
  const password        = document.getElementById('regPass').value;
  const confirmPassword = document.getElementById('regPassConfirm').value;

  if (!name)                       { showError('regErr', t('err.enterName'));         return; }
  if (!email)                      { showError('regErr', t('err.enterEmail'));        return; }
  if (password.length < 6)         { showError('regErr', t('err.passwordLength'));   return; }
  if (password !== confirmPassword){ showError('regErr', t('err.passwordMismatch')); return; }

  setLoading('regBtn', true);
  try {
    const res  = await fetch(SERVER + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, role: selectedRole }),
    });
    const data = await res.json();
    if (!res.ok) { showError('regErr', data.error || t('err.registrationFailed')); setLoading('regBtn', false); return; }
    handleAuthSuccess(data);
  } catch {
    showError('regErr', t('err.serverUnreachable'));
    setLoading('regBtn', false);
  }
}
