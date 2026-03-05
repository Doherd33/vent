// ═══════════════════════════════════════════════════════════════
// VENT — Shared Nav: auth helpers, guard, role filtering
// Loaded after i18n.js on every authenticated page.
// ═══════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // ── Server base URL ──
  var SERVER = window.location.origin;
  window.SERVER     = SERVER;
  window.SERVER_URL = SERVER;

  // ── Auth helpers ──
  function getAuthHeaders(extra) {
    var token = localStorage.getItem('vent_token');
    var h = Object.assign({}, extra || {});
    if (token) h['Authorization'] = 'Bearer ' + token;
    return h;
  }

  function authFetch(url, opts) {
    opts = opts || {};
    opts.headers = getAuthHeaders(opts.headers);
    return fetch(url, opts);
  }

  window.getAuthHeaders = getAuthHeaders;
  window.authFetch      = authFetch;

  // ── Auth guard ──
  // Pages can set window.SKIP_AUTH_GUARD = true before loading this script to skip
  // Demo mode: token 'demo' bypasses server validation for offline demos
  if (!window.SKIP_AUTH_GUARD) {
    (async function authGuard() {
      var token = localStorage.getItem('vent_token');
      if (!token) { window.location.replace('login.html'); return; }
      if (token === 'demo') return; // Demo mode — skip server validation
      try {
        var res = await fetch(SERVER + '/auth/me', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) throw new Error('expired');
      } catch (e) {
        localStorage.removeItem('vent_token');
        localStorage.removeItem('vent_role');
        localStorage.removeItem('vent_name');
        localStorage.removeItem('vent_user_id');
        window.location.replace('login.html');
      }
    })();
  }

  // ── Nav role filtering + badge + name ──
  (function applyNavRoles() {
    var role = localStorage.getItem('vent_role') || 'operator';
    var name = localStorage.getItem('vent_name') || '';

    var rules = {
      operator:    ['Charlie AI', 'My Activity', 'Doc Builder', 'Equipment', 'Feedback'],
      training:    ['Charlie AI', 'My Activity', 'Doc Builder', 'Training', 'Feedback'],
      qa:          ['Charlie AI', 'My Activity', 'Doc Builder', 'QA Centre', 'Training', 'Feedback'],
      director:    ['Charlie AI', 'My Activity', 'Doc Builder', 'QA Centre', 'Training', 'Analytics', 'Feedback'],
      msat:        ['Charlie AI', 'My Activity', 'Doc Builder'],
      engineering: ['Charlie AI', 'My Activity', 'Doc Builder', 'Equipment'],
      admin:       ['Charlie AI', 'My Activity', 'Doc Builder', 'QA Centre', 'Training', 'Analytics', 'Equipment', 'Feedback']
    };
    var colors = {
      operator: 'var(--teal)', training: 'var(--gold)', qa: 'var(--accent)', director: 'var(--gold)',
      msat: 'var(--green)', engineering: 'var(--mid)', admin: 'var(--red)'
    };
    var roleKeys = {
      operator: 'role.operator', training: 'role.training', qa: 'role.qa', director: 'role.director',
      msat: 'role.msat', engineering: 'role.engineering', admin: 'role.admin'
    };

    var badge = document.getElementById('roleBadge');
    if (badge) {
      badge.textContent = (typeof t === 'function' ? t(roleKeys[role] || 'role.operator') : role);
      badge.style.color = colors[role] || 'var(--mid)';
      badge.style.background = 'var(--s3)';
    }

    var un = document.getElementById('titleUser');
    if (un) un.textContent = name;

    var allowed = rules[role] || [];
    document.querySelectorAll('#mainNav .nav-tab').forEach(function (a) {
      a.style.display = allowed.some(function (x) {
        return (a.dataset.navKey || a.textContent.trim()) === x;
      }) ? 'inline-block' : 'none';
    });
  })();

  // ── Sign-out helper ──
  window.ventSignOut = function () {
    ['vent_token', 'vent_role', 'vent_name', 'vent_user_id'].forEach(function (k) {
      localStorage.removeItem(k);
    });
    location.href = 'login.html';
  };

  // ── Smooth page transitions ──
  document.querySelectorAll('#mainNav .nav-tab, .app-name').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (a.classList.contains('active')) return;
      e.preventDefault();
      document.body.classList.add('page-transitioning');
      var href = a.href || a.getAttribute('href');
      setTimeout(function () { window.location.href = href; }, 200);
    });
  });


})();
