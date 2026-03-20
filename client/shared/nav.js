// ═══════════════════════════════════════════════════════════════
// VENT — Shared Nav: auth helpers, guard, role filtering
// Loaded on every authenticated page.
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
  if (!window.SKIP_AUTH_GUARD) {
    (async function authGuard() {
      var token = localStorage.getItem('vent_token');
      if (!token) { window.location.replace('/auth/login.html'); return; }
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
        window.location.replace('/auth/login.html');
      }
    })();
  }

  // ── MVP Nav — single source of truth for all page navigation ──
  // Instead of hardcoded tabs in each HTML file, nav.js dynamically builds
  // the nav bar so adding/removing modules is a one-line change here.
  (function applyNavRoles() {
    var role = localStorage.getItem('vent_role') || 'operator';
    var name = localStorage.getItem('vent_name') || '';

    // All MVP navigation tabs (order matters — this is the display order)
    var MVP_TABS = [
      { key: 'Charlie AI',      href: '/operator/query.html',          label: 'Charlie AI' },
      { key: 'My Activity',     href: '/qa/submissions.html',          label: 'My Activity' },
      { key: 'QA Centre',       href: '/qa/qa.html',                   label: 'QA Centre' },
      { key: 'Deviations',      href: '/qa/deviations.html',           label: 'Deviations' },
      { key: 'CAPAs',           href: '/qa/capas.html',                label: 'CAPAs' },
      { key: 'Change Control',  href: '/qa/change-control.html',       label: 'Change Control' },
      { key: 'Doc Control',     href: '/qa/documents.html',            label: 'Doc Control' },
      { key: 'Doc Builder',     href: '/qa/builder.html',              label: 'Doc Builder' },
      { key: 'Analytics',       href: '/management/dashboard.html',    label: 'Analytics' },
      { key: 'Feedback',        href: '/operator/feedback.html',       label: 'Feedback' },
    ];

    // Which tabs each role can see
    var rules = {
      operator:    ['Charlie AI', 'My Activity', 'Feedback'],
      training:    ['Charlie AI', 'My Activity', 'Doc Builder', 'Feedback'],
      qa:          ['Charlie AI', 'My Activity', 'QA Centre', 'Deviations', 'CAPAs', 'Change Control', 'Doc Control', 'Doc Builder', 'Feedback'],
      director:    ['Charlie AI', 'My Activity', 'QA Centre', 'Deviations', 'CAPAs', 'Change Control', 'Doc Control', 'Doc Builder', 'Analytics', 'Feedback'],
      msat:        ['Charlie AI', 'My Activity', 'Doc Builder'],
      engineering: ['Charlie AI', 'My Activity', 'Doc Builder'],
      admin:       ['Charlie AI', 'My Activity', 'QA Centre', 'Deviations', 'CAPAs', 'Change Control', 'Doc Control', 'Doc Builder', 'Analytics', 'Feedback']
    };

    var colors = {
      operator: 'var(--teal)', training: 'var(--gold)', qa: 'var(--accent)', director: 'var(--gold)',
      msat: 'var(--green)', engineering: 'var(--mid)', admin: 'var(--red)'
    };
    var badge = document.getElementById('roleBadge');
    if (badge) {
      badge.textContent = role;
      badge.style.color = colors[role] || 'var(--mid)';
      badge.style.background = 'var(--s3)';
    }

    var un = document.getElementById('titleUser');
    if (un) un.textContent = name;

    // Dynamically rebuild nav tabs from MVP_TABS
    var nav = document.getElementById('mainNav');
    if (nav) {
      var allowed = rules[role] || rules.operator;
      var currentPage = location.pathname;
      var html = '';
      MVP_TABS.forEach(function (tab) {
        if (allowed.indexOf(tab.key) === -1) return;
        var isActive = (currentPage === tab.href || currentPage.startsWith(tab.href.split('?')[0])) ? ' active' : '';
        html += '<a href="' + tab.href + '" class="nav-tab' + isActive + '" data-nav-key="' + tab.key + '">' + tab.label + '</a>';
      });
      nav.innerHTML = html;
    }
  })();

  // ── Sign-out helper ──
  window.ventSignOut = function () {
    ['vent_token', 'vent_role', 'vent_name', 'vent_user_id'].forEach(function (k) {
      localStorage.removeItem(k);
    });
    location.href = '/auth/login.html';
  };

  // ── Smooth page transitions (delegated so it works with dynamic nav) ──
  var navEl = document.getElementById('mainNav');
  if (navEl) {
    navEl.addEventListener('click', function (e) {
      var a = e.target.closest('.nav-tab');
      if (!a || a.classList.contains('active')) return;
      e.preventDefault();
      document.body.classList.add('page-transitioning');
      var href = a.href || a.getAttribute('href');
      setTimeout(function () { window.location.href = href; }, 200);
    });
  }
  document.querySelectorAll('.app-name').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      document.body.classList.add('page-transitioning');
      var href = a.href || a.getAttribute('href');
      setTimeout(function () { window.location.href = href; }, 200);
    });
  });


})();
