/**
 * dev-progress.js — Floating build progress bar
 * Include on any module page: <script src="/shared/dev-progress.js"></script>
 */
(function() {
  'use strict';

  var modules = [
    { id:'login',         title:'Login',          path:'/login.html',          status:'live' },
    { id:'hub',           title:'Hub',            path:'/hub.html',            status:'live' },
    { id:'charlie',       title:'Charlie AI',     path:'/query.html',          status:'live' },
    { id:'raise-obs',     title:'Observations',   path:'/query.html',          status:'live' },
    { id:'voice',         title:'Voice',          path:'/submit.html',         status:'live' },
    { id:'activity',      title:'My Activity',    path:'/submissions.html',    status:'live' },
    { id:'qa-centre',     title:'QA Centre',      path:'/qa.html',             status:'live' },
    { id:'qa-workflow',   title:'QA Workflow',    path:'/workflow.html',       status:'live' },
    { id:'deviation-mgr', title:'Deviations',     path:'/deviations.html',     status:'live' },
    { id:'capa-tracker',  title:'CAPAs',          path:'/capas.html',          status:'live' },
    { id:'change-control',title:'Change Control', path:'/change-control.html', status:'live' },
    { id:'doc-control',   title:'Doc Control',    path:'/documents.html',      status:'live' },
    { id:'builder',       title:'Doc Builder',    path:'/builder.html',        status:'live' },
    { id:'gdp-check',     title:'GDP Check',      path:'/query.html',          status:'live' },
    { id:'analytics',     title:'Analytics',      path:'/dashboard.html',      status:'live' },
    { id:'feedback',      title:'Feedback',       path:'/feedback.html',       status:'live' },
  ];

  var live    = modules.filter(function(m){ return m.status === 'live'; }).length;
  var wip     = modules.filter(function(m){ return m.status === 'wip'; }).length;
  var planned = modules.filter(function(m){ return m.status === 'planned'; }).length;
  var total   = modules.length;
  var builtPct = Math.round(((live + wip) / total) * 100);

  var currentPath = window.location.pathname;

  var bar = document.createElement('div');
  bar.id = 'dev-progress-bar';

  var navHtml = '';
  modules.forEach(function(m) {
    if (!m.path || m.status !== 'wip') return;
    var isCurrent = currentPath === m.path;
    navHtml += '<a href="' + m.path + '" class="dpb-pill' + (isCurrent ? ' dpb-current' : '') + '">' + m.title + '</a>';
  });

  bar.innerHTML =
    '<div class="dpb-inner">' +
      '<div class="dpb-left">' +
        '<a href="/hub.html" class="dpb-logo" title="Hub">VENT</a>' +
        '<div class="dpb-stats">' +
          '<span class="dpb-stat dpb-live">' + live + ' live</span>' +
          (wip ? '<span class="dpb-stat dpb-wip">' + wip + ' wip</span>' : '') +
          (planned ? '<span class="dpb-stat dpb-planned">' + planned + ' planned</span>' : '') +
        '</div>' +
        '<div class="dpb-bar-track">' +
          '<div class="dpb-bar-live" style="width:' + Math.round((live/total)*100) + '%"></div>' +
          '<div class="dpb-bar-wip" style="width:' + Math.round((wip/total)*100) + '%"></div>' +
        '</div>' +
        '<span class="dpb-pct">' + builtPct + '%</span>' +
      '</div>' +
      '<div class="dpb-nav">' + navHtml + '</div>' +
      '<div class="dpb-right">' +
        '<a href="/hub.html" class="dpb-link">Hub</a>' +
      '</div>' +
    '</div>';

  var style = document.createElement('style');
  style.textContent =
    '#dev-progress-bar{position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#0e0e12;border-top:1px solid #2a2a35;padding:0 1rem;font-family:"DM Sans",system-ui,sans-serif;font-size:.7rem}' +
    '.dpb-inner{display:flex;align-items:center;gap:.75rem;height:36px;max-width:100%;overflow-x:auto}' +
    '.dpb-inner::-webkit-scrollbar{height:0}' +
    '.dpb-left{display:flex;align-items:center;gap:.5rem;flex-shrink:0}' +
    '.dpb-logo{color:#6c5ce7;font-weight:800;font-size:.75rem;text-decoration:none;letter-spacing:.05em}' +
    '.dpb-logo:hover{color:#a29bfe}' +
    '.dpb-stats{display:flex;gap:.4rem;flex-shrink:0}' +
    '.dpb-stat{padding:.1rem .35rem;border-radius:3px;font-size:.6rem;font-weight:600}' +
    '.dpb-live{background:#00b89420;color:#00b894}' +
    '.dpb-wip{background:#fdcb6e20;color:#fdcb6e}' +
    '.dpb-planned{background:#74b9ff15;color:#74b9ff}' +
    '.dpb-bar-track{width:80px;height:4px;background:#1e1e28;border-radius:2px;display:flex;overflow:hidden;flex-shrink:0}' +
    '.dpb-bar-live{background:#00b894;height:100%}' +
    '.dpb-bar-wip{background:#fdcb6e;height:100%}' +
    '.dpb-pct{color:#555;font-size:.6rem;flex-shrink:0}' +
    '.dpb-nav{display:flex;gap:.3rem;flex:1;overflow-x:auto;padding:0 .25rem}' +
    '.dpb-nav::-webkit-scrollbar{height:0}' +
    '.dpb-pill{padding:.2rem .5rem;border-radius:4px;background:#fdcb6e12;border:1px solid #fdcb6e30;color:#fdcb6e;text-decoration:none;white-space:nowrap;font-size:.6rem;transition:all .15s}' +
    '.dpb-pill:hover{background:#fdcb6e25;border-color:#fdcb6e}' +
    '.dpb-pill.dpb-current{background:#6c5ce725;border-color:#6c5ce7;color:#a29bfe}' +
    '.dpb-right{display:flex;gap:.4rem;flex-shrink:0;margin-left:auto}' +
    '.dpb-link{color:#555;text-decoration:none;padding:.2rem .5rem;border-radius:4px;border:1px solid #2a2a35;font-size:.6rem;transition:all .15s}' +
    '.dpb-link:hover{color:#ccc;border-color:#555}';

  document.head.appendChild(style);
  document.body.appendChild(bar);

  document.body.style.paddingBottom = '44px';
})();
