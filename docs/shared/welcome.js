/* ════════════════════════════════════════════════════════
   welcome.js — welcome screen: name capture & transition
   Depends on: cinematic.js (playSfx, initLoginCanvas)
   ════════════════════════════════════════════════════════ */

// ════════════════════════════════════════════════════════
// CANVAS — welcome screen background particles
// ════════════════════════════════════════════════════════
function initWelcomeCanvas() {
  const canvas = document.getElementById('welcomeCanvas');
  const ctx    = canvas.getContext('2d');
  let particles = [];
  const COUNT  = 50;

  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      size: Math.random() * 1.3 + 0.4, opacity: Math.random() * 0.25 + 0.04,
      color: Math.random() > 0.5 ? '0,122,204' : '78,201,176',
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 130) {
          ctx.strokeStyle = `rgba(0,122,204,${(1 - dist / 130) * 0.07})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.opacity})`;
      ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;  if (p.x > canvas.width)  p.x = 0;
      if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
    });
    requestAnimationFrame(draw);
  }
  draw();
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
    greeting.innerHTML = `Hey, <em>${firstName}</em>`;
    greeting.style.display = 'block';
    const regName = document.getElementById('regName');
    if (regName) regName.value = firstName;
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

  // ?reset param handled here as a fallback (also handled in bootCinematic)
  if (new URLSearchParams(window.location.search).has('reset')) {
    localStorage.removeItem('vent_first_name');
    history.replaceState(null, '', window.location.pathname);
  }
});
