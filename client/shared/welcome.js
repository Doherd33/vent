/* ════════════════════════════════════════════════════════
   welcome.js — welcome screen: name capture & transition
   Depends on: cinematic.js (playSfx, initLoginCanvas, initParticleCanvas)
   ════════════════════════════════════════════════════════ */

// ════════════════════════════════════════════════════════
// CANVAS — welcome screen background particles
// ════════════════════════════════════════════════════════
function initWelcomeCanvas() {
  initParticleCanvas('welcomeCanvas', { count: 50, speed: 0.25, maxSize: 1.3, lineRange: 130 });
}

// ════════════════════════════════════════════════════════
// WELCOME SCREEN INTERACTIONS
// ════════════════════════════════════════════════════════
function submitWelcomeName() {
  const name = document.getElementById('welcomeNameInput').value.trim();
  if (!name) return;

  localStorage.setItem('vent_first_name', name);
  playSfx('enter');

  const welcome = document.getElementById('welcomeScreen');
  welcome.classList.add('exit');
  setTimeout(() => {
    welcome.classList.remove('active', 'exit');
    transitionToLogin(name);
  }, 600);
}

function skipWelcomeName() {
  playSfx('click');
  const welcome = document.getElementById('welcomeScreen');
  welcome.classList.add('exit');
  setTimeout(() => {
    welcome.classList.remove('active', 'exit');
    transitionToLogin(null);
  }, 600);
}

// ════════════════════════════════════════════════════════
// TRANSITION — welcome → login card
// ════════════════════════════════════════════════════════
function transitionToLogin(firstName) {
  document.body.classList.add('login-ready');
  document.body.style.overflow = 'auto';

  const greeting = document.getElementById('personalGreeting');
  if (firstName) {
    greeting.textContent = '';
    greeting.appendChild(document.createTextNode('Hey, '));
    const em = document.createElement('em');
    em.textContent = firstName;
    greeting.appendChild(em);
    greeting.style.display = 'block';
  } else {
    greeting.style.display = 'none';
  }

  initLoginCanvas();
  document.getElementById('loginOrbs').classList.add('show');

  setTimeout(() => {
    document.getElementById('loginWrap').classList.add('visible');
    playSfx('click');
    playSfx('ambient');
  }, 200);
}

// ════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // Enable/disable Continue button as user types
  const inp = document.getElementById('welcomeNameInput');
  if (inp) {
    inp.addEventListener('input', () => {
      document.getElementById('welcomeBtn').disabled = !inp.value.trim();
    });
  }

});
