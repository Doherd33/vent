// ── TO-DO LIST ──
let _todos = [];
let _collapsedGroups = new Set();

function toggleTodoSidebar() {
  var sb = document.getElementById('todoSidebar');
  if (sb.classList.contains('show')) closeTodoSidebar();
  else openTodoSidebar();
}
function openTodoSidebar() {
  loadTodos();
  document.getElementById('todoSidebar').classList.add('show');
  document.getElementById('todoBackdrop').classList.add('show');
  setTimeout(function(){ document.getElementById('todoNewInput').focus(); }, 280);
}
function closeTodoSidebar() {
  document.getElementById('todoSidebar').classList.remove('show');
  document.getElementById('todoBackdrop').classList.remove('show');
}

async function loadTodos() {
  try {
    var res = await authFetch(SERVER + '/todos?page=builder');
    if (res.ok) _todos = await res.json();
    else _todos = [];
  } catch(e) { _todos = []; }
  renderTodos();
}

function getChildren(todos, parentId) {
  return todos.filter(function(t){ return (t.parent_id || null) === parentId; })
    .sort(function(a, b){ return (a.position - b.position) || (new Date(a.created_at) - new Date(b.created_at)); });
}
function hasChildren(id) { return _todos.some(function(t){ return t.parent_id === id; }); }

function updateProgress() {
  var total = _todos.length;
  var done = _todos.filter(function(t){ return t.done; }).length;
  var pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('todoCount').textContent = total;
  document.getElementById('todoProgressFill').style.width = pct + '%';
  document.getElementById('todoProgressText').textContent = done + ' of ' + total + ' done';
  document.getElementById('todoProgressPct').textContent = pct + '%';
  var fill = document.getElementById('todoProgressFill');
  fill.style.background = pct === 100 ? 'var(--green)' : pct > 50 ? 'var(--accent)' : 'var(--gold)';
}

function toggleCollapse(id) {
  if (_collapsedGroups.has(id)) _collapsedGroups.delete(id);
  else _collapsedGroups.add(id);
  renderTodos();
}

function renderTodoItem(t, depth) {
  var doneClass = t.done ? ' done' : '';
  var checkSvg = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>';
  var kids = hasChildren(t.id);
  var collapsed = _collapsedGroups.has(t.id);

  var collapseBtn = '';
  if (depth < 2 && kids) {
    collapseBtn = '<button class="td-collapse' + (collapsed ? ' closed' : '') + '" onclick="event.stopPropagation(); toggleCollapse(\'' + t.id + '\')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></button>';
  } else if (depth === 0) {
    collapseBtn = '<div class="td-collapse-spacer"></div>';
  }

  var addBtn = depth < 2 ? '<button class="td-act-btn add" onclick="event.stopPropagation(); showAddChild(\'' + t.id + '\')" title="Add sub-task"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>' : '';

  var html = '<div class="td-item" data-id="' + t.id + '">' +
    collapseBtn +
    '<button class="td-check' + doneClass + '" onclick="event.stopPropagation(); toggleTodoDone(\'' + t.id + '\',' + !t.done + ')">' + (t.done ? checkSvg : '') + '</button>' +
    '<span class="td-text depth-' + depth + doneClass + '" contenteditable="true" onblur="editTodoTitle(\'' + t.id + '\', this.textContent)" onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur();}">' + esc(t.title) + '</span>' +
    '<div class="td-actions">' + addBtn +
      '<button class="td-act-btn del" onclick="event.stopPropagation(); deleteTodo(\'' + t.id + '\')" title="Delete"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
    '</div></div>';

  if (depth < 2) {
    html += '<div class="td-add-child" id="addChild-' + t.id + '" style="display:none">' +
      '<input placeholder="' + (depth === 0 ? 'Add sub-task...' : 'Add detail...') + '" onkeydown="if(event.key===\'Enter\'){event.preventDefault();addTodo(this.value,\'' + t.id + '\');this.value=\'\';document.getElementById(\'addChild-' + t.id + '\').style.display=\'none\';}if(event.key===\'Escape\'){this.value=\'\';document.getElementById(\'addChild-' + t.id + '\').style.display=\'none\';}">' +
    '</div>';
  }
  return html;
}

function renderTodos() {
  var list = document.getElementById('todoList');
  if (!_todos.length) {
    list.innerHTML = '<div class="td-empty"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>No tasks yet.<br>Add one below to get started.</div>';
    updateProgress();
    return;
  }
  var topLevel = getChildren(_todos, null);
  var html = '';
  topLevel.forEach(function(parent) {
    var children = getChildren(_todos, parent.id);
    var collapsed = _collapsedGroups.has(parent.id);
    html += '<div class="td-group">';
    html += renderTodoItem(parent, 0);
    if (children.length && !collapsed) {
      html += '<div class="td-branch">';
      children.forEach(function(child) {
        var grandchildren = getChildren(_todos, child.id);
        var childCollapsed = _collapsedGroups.has(child.id);
        html += renderTodoItem(child, 1);
        if (grandchildren.length && !childCollapsed) {
          html += '<div class="td-branch-inner">';
          grandchildren.forEach(function(gc) { html += renderTodoItem(gc, 2); });
          html += '</div>';
        }
      });
      html += '</div>';
    }
    html += '</div>';
  });
  list.innerHTML = html;
  updateProgress();
}

function showAddChild(parentId) {
  var el = document.getElementById('addChild-' + parentId);
  if (el) {
    if (_collapsedGroups.has(parentId)) {
      _collapsedGroups.delete(parentId);
      renderTodos();
      setTimeout(function() {
        var el2 = document.getElementById('addChild-' + parentId);
        if (el2) { el2.style.display = 'flex'; el2.querySelector('input').focus(); }
      }, 50);
      return;
    }
    el.style.display = 'flex';
    el.querySelector('input').focus();
  }
}

function addTodoFromInput() {
  var input = document.getElementById('todoNewInput');
  var title = input.value.trim();
  if (!title) return;
  input.value = '';
  addTodo(title, null);
}

async function addTodo(title, parentId) {
  if (!title.trim()) return;
  try {
    await authFetch(SERVER + '/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), parent_id: parentId, page: 'builder' })
    });
    await loadTodos();
  } catch(e) { console.error('Add todo error:', e); }
}

async function toggleTodoDone(id, done) {
  try {
    await authFetch(SERVER + '/todos/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: done, page: 'builder' })
    });
    var t = _todos.find(function(x){ return x.id === id; });
    if (t) t.done = done;
    renderTodos();
  } catch(e) { console.error('Toggle todo error:', e); }
}

async function editTodoTitle(id, newTitle) {
  var trimmed = newTitle.trim();
  var t = _todos.find(function(x){ return x.id === id; });
  if (!trimmed || (t && t.title === trimmed)) return;
  try {
    await authFetch(SERVER + '/todos/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: trimmed, page: 'builder' })
    });
    if (t) t.title = trimmed;
  } catch(e) { console.error('Edit todo error:', e); }
}

async function deleteTodo(id) {
  try {
    await authFetch(SERVER + '/todos/' + id + '?page=builder', { method: 'DELETE' });
    _todos = _todos.filter(function(t){ return t.id !== id && t.parent_id !== id; });
    renderTodos();
    await loadTodos();
  } catch(e) { console.error('Delete todo error:', e); }
}

// ── BOOT ──
init();
