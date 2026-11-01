/* ============================================================
   TASKFLOW — app.js
   Pure vanilla ES6+, no dependencies, localStorage persistence
   ============================================================ */

'use strict';

/* ============================================================
   CONSTANTS
   ============================================================ */

const STORAGE_KEY  = 'taskflow_v6';
const COLUMNS = [
  { id: 'todo',       label: 'Todo',         dot: '#94a3b8' },
  { id: 'analysis',   label: 'Analysis',     dot: '#a78bfa' },
  { id: 'inprogress', label: 'In Progress',  dot: '#60a5fa' },
  { id: 'review',     label: 'Review',       dot: '#f59e0b' },
  { id: 'testing',    label: 'In Testing',   dot: '#f97316' },
  { id: 'done',       label: 'Done',         dot: '#22c55e' },
];

const PRIORITY_META = {
  highest: { label: 'Highest', color: '#ef4444', icon: '⬆⬆' },
  high:    { label: 'High',    color: '#f97316', icon: '⬆'  },
  medium:  { label: 'Medium',  color: '#f59e0b', icon: '▬'  },
  low:     { label: 'Low',     color: '#60a5fa', icon: '⬇'  },
  lowest:  { label: 'Lowest',  color: '#94a3b8', icon: '⬇⬇' },
};

const DEFAULT_TEAM = [];

/* ============================================================
   APP STATE
   ============================================================ */

const AppState = {
  tasks:        [],
  team:         [],
  nextId:       1,
  nextMemberId: 1,
  currentView:  'board',
  darkMode:     false,
  sidebarCollapsed: false,

  filters: {
    search:   '',
    priority: '',
    assignee: '',
    label:    '',
  },

  listSort: { key: 'id', dir: 'asc' },
  openTaskId: null,

  drag: {
    taskId:     null,
    srcColumn:  null,
  },

  undoStack: [],
  selectedTasks: new Set(),
  templates: [],
};

/* ============================================================
   SAMPLE DATA SEED
   ============================================================ */

function getSampleTasks() {
  const today = new Date();
  const d = (daysOffset) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + daysOffset);
    return dt.toISOString().split('T')[0];
  };

  return [
    {
      id: 1,
      title: 'Set up CI/CD pipeline with GitHub Actions',
      description: 'Configure automated testing and deployment workflows. Include lint, unit tests, integration tests, and staging + production deploys.',
      status: 'done',
      priority: 'high',
      assigneeId: 1,
      dueDate: d(-5),
      labels: ['backend', 'devops'],
      points: 8,
      inSprint: true,
      activity: [
        { type: 'created', memberId: 1, timestamp: d(-12) },
        { type: 'status', from: 'todo', to: 'inprogress', memberId: 1, timestamp: d(-10) },
        { type: 'status', from: 'inprogress', to: 'review', memberId: 1, timestamp: d(-7) },
        { type: 'status', from: 'review', to: 'done', memberId: 1, timestamp: d(-5) },
      ],
    },
    {
      id: 2,
      title: 'Design new onboarding flow for mobile',
      description: 'Create high-fidelity mockups for the 5-screen onboarding experience. Focus on progressive disclosure and a smooth first-run experience.',
      status: 'review',
      priority: 'critical',
      assigneeId: 3,
      dueDate: d(-2),
      labels: ['design', 'mobile'],
      points: 13,
      inSprint: true,
      activity: [
        { type: 'created', memberId: 2, timestamp: d(-14) },
        { type: 'status', from: 'todo', to: 'inprogress', memberId: 3, timestamp: d(-8) },
        { type: 'status', from: 'inprogress', to: 'review', memberId: 3, timestamp: d(-3) },
        { type: 'comment', text: 'Initial designs are ready for review!', memberId: 3, timestamp: d(-3) },
      ],
    },
    {
      id: 3,
      title: 'Fix payment gateway timeout bug',
      description: 'Under high load, Stripe webhook processing times out after 30s. Need to move processing to a background job queue (BullMQ recommended).',
      status: 'inprogress',
      priority: 'critical',
      assigneeId: 4,
      dueDate: d(1),
      labels: ['bug', 'backend', 'payments'],
      points: 5,
      inSprint: true,
      activity: [
        { type: 'created', memberId: 2, timestamp: d(-6) },
        { type: 'status', from: 'todo', to: 'inprogress', memberId: 4, timestamp: d(-4) },
        { type: 'comment', text: 'Reproducing locally — it happens at ~500 rps.', memberId: 4, timestamp: d(-3) },
      ],
    },
    {
      id: 4,
      title: 'Implement real-time notifications',
      description: 'Add WebSocket-based push notifications for task assignments, mentions, and due date reminders. Use a pub/sub pattern server-side.',
      status: 'inprogress',
      priority: 'high',
      assigneeId: 1,
      dueDate: d(5),
      labels: ['feature', 'backend', 'frontend'],
      points: 21,
      inSprint: true,
      activity: [
        { type: 'created', memberId: 1, timestamp: d(-8) },
        { type: 'status', from: 'todo', to: 'inprogress', memberId: 1, timestamp: d(-3) },
      ],
    },
    {
      id: 5,
      title: 'Write API documentation with OpenAPI 3.1',
      description: 'Document all REST endpoints, request/response schemas, authentication, and error codes. Publish to Swagger UI.',
      status: 'todo',
      priority: 'medium',
      assigneeId: 5,
      dueDate: d(10),
      labels: ['documentation', 'backend'],
      points: 5,
      inSprint: false,
      activity: [
        { type: 'created', memberId: 2, timestamp: d(-5) },
      ],
    },
    {
      id: 6,
      title: 'Optimize database query performance',
      description: 'Several dashboard queries take 2–5s under load. Add composite indexes, review N+1 issues, and consider caching hot queries with Redis.',
      status: 'todo',
      priority: 'high',
      assigneeId: 4,
      dueDate: d(-3),
      labels: ['backend', 'performance'],
      points: 8,
      inSprint: false,
      activity: [
        { type: 'created', memberId: 4, timestamp: d(-7) },
        { type: 'comment', text: 'Profiling done — 3 queries are the main culprits.', memberId: 4, timestamp: d(-2) },
      ],
    },
    {
      id: 7,
      title: 'Build analytics dashboard UI',
      description: 'Create a responsive analytics page showing MAU, churn, revenue, and cohort retention charts. Reuse existing chart primitives from the design system.',
      status: 'analysis',
      priority: 'medium',
      assigneeId: 2,
      dueDate: d(14),
      labels: ['frontend', 'feature'],
      points: 13,
      inSprint: false,
      activity: [
        { type: 'created', memberId: 2, timestamp: d(-3) },
      ],
    },
    {
      id: 8,
      title: 'Accessibility audit & WCAG 2.1 AA compliance',
      description: 'Run automated (axe) and manual audits. Fix keyboard navigation, ARIA labels, color contrast, and focus management across all major flows.',
      status: 'review',
      priority: 'medium',
      assigneeId: 3,
      dueDate: d(3),
      labels: ['frontend', 'a11y'],
      points: 8,
      inSprint: true,
      activity: [
        { type: 'created', memberId: 3, timestamp: d(-10) },
        { type: 'status', from: 'todo', to: 'inprogress', memberId: 3, timestamp: d(-6) },
        { type: 'status', from: 'inprogress', to: 'review', memberId: 3, timestamp: d(-1) },
      ],
    },
    {
      id: 9,
      title: 'Migrate authentication to Passkeys (WebAuthn)',
      description: 'Replace password-based login with passkey support. Implement credential creation, assertion, and fallback flows. Browser compatibility: Chrome 108+, Safari 16+, Firefox 122+.',
      status: 'todo',
      priority: 'low',
      assigneeId: 5,
      dueDate: d(21),
      labels: ['security', 'backend', 'feature'],
      points: 21,
      inSprint: false,
      activity: [
        { type: 'created', memberId: 5, timestamp: d(-1) },
      ],
    },
    {
      id: 10,
      title: 'Add dark mode to design system tokens',
      description: 'Extend the Figma token library and CSS custom properties to support dark mode. Ensure all components adapt correctly. Update Storybook.',
      status: 'done',
      priority: 'low',
      assigneeId: 3,
      dueDate: d(-8),
      labels: ['design', 'frontend'],
      points: 3,
      inSprint: false,
      activity: [
        { type: 'created', memberId: 3, timestamp: d(-20) },
        { type: 'status', from: 'todo', to: 'done', memberId: 3, timestamp: d(-8) },
      ],
    },
  ];
}

/* ============================================================
   STORAGE
   ============================================================ */

function saveToStorage() {
  const data = {
    tasks:        AppState.tasks,
    team:         AppState.team,
    nextId:       AppState.nextId,
    nextMemberId: AppState.nextMemberId,
    darkMode:     AppState.darkMode,
    sidebarCollapsed: AppState.sidebarCollapsed,
    templates:    AppState.templates,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Storage save failed:', e);
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data && Array.isArray(data.tasks)) {
      AppState.tasks        = data.tasks;
      AppState.team         = Array.isArray(data.team) && data.team.length > 0 ? data.team : [...DEFAULT_TEAM];
      AppState.nextId       = data.nextId || (AppState.tasks.length + 1);
      AppState.nextMemberId = data.nextMemberId || (AppState.team.length + 1);
      AppState.darkMode         = !!data.darkMode;
      AppState.sidebarCollapsed = !!data.sidebarCollapsed;
      AppState.templates = Array.isArray(data.templates) ? data.templates : [];
      return true;
    }
  } catch (e) {
    console.warn('Storage load failed:', e);
  }
  return false;
}

/* ============================================================
   HELPERS
   ============================================================ */

function getTeamMember(id) {
  return AppState.team.find(m => m.id === id) || null;
}

function getTask(id) {
  return AppState.tasks.find(t => t.id === id) || null;
}

function logActivity(task, type, extra = {}) {
  if (!task.activity) task.activity = [];
  task.activity.push({
    type,
    memberId: AppState.team[0]?.id || 1,
    timestamp: new Date().toISOString().split('T')[0],
    ...extra,
  });
}

function generateId() {
  return AppState.nextId++;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + 'T00:00:00');
  return due < today;
}

function isDueSoon(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + 'T00:00:00');
  const diffMs = due - today;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 3;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const past = new Date(dateStr + 'T00:00:00');
  const now  = new Date();
  const diff = Math.floor((now - past) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7)  return `${diff}d ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  return `${Math.floor(diff / 30)}mo ago`;
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ============================================================
   FILTER ENGINE
   ============================================================ */

function filterTasks(tasks) {
  const { search, priority, assignee, label } = AppState.filters;

  return tasks.filter(task => {
    // Search (title + description + id)
    if (search) {
      const q = search.toLowerCase();
      const haystack = [
        task.title,
        task.description,
        `TM-${task.id}`,
        ...(task.labels || []),
      ].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    // Priority
    if (priority && task.priority !== priority) return false;

    // Assignee
    if (assignee) {
      if (assignee === '0') {
        // "Unassigned" filter — show only tasks with no assignee
        if (task.assigneeId != null) return false;
      } else {
        const aid = parseInt(assignee, 10);
        if (task.assigneeId !== aid) return false;
      }
    }

    // Label
    if (label) {
      if (!Array.isArray(task.labels) || !task.labels.includes(label)) return false;
    }

    return true;
  });
}

function hasActiveFilters() {
  const f = AppState.filters;
  return f.search || f.priority || f.assignee || f.label;
}

/* ============================================================
   PRIORITY BADGE HTML
   ============================================================ */

function priorityBadgeHtml(priority) {
  const meta = PRIORITY_META[priority] || PRIORITY_META.medium;
  return `<span class="priority-badge ${escapeHtml(priority)}"><span class="priority-icon">${meta.icon}</span>${escapeHtml(meta.label)}</span>`;
}

/* ============================================================
   STATUS PILL HTML
   ============================================================ */

function statusPillHtml(status) {
  const labels = {
    todo:       'Todo',
    analysis:   'Analysis',
    inprogress: 'In Progress',
    review:     'Review',
    testing:    'In Testing',
    done:       'Done',
  };
  return `<span class="status-pill ${escapeHtml(status)}">${escapeHtml(labels[status] || status)}</span>`;
}

/* ============================================================
   RENDER BOARD
   ============================================================ */

function renderBoard() {
  const board = document.getElementById('board-view');
  board.innerHTML = '';

  const filtered = filterTasks(AppState.tasks);

  COLUMNS.forEach(col => {
    const colTasks = filtered.filter(t => t.status === col.id);
    const allColTasks = AppState.tasks.filter(t => t.status === col.id);

    const colEl = document.createElement('div');
    colEl.className = 'kanban-column';
    colEl.dataset.column = col.id;
    colEl.setAttribute('role', 'region');
    colEl.setAttribute('aria-label', col.label);

    // Drop zone events
    colEl.addEventListener('dragover', handleDragOver);
    colEl.addEventListener('dragleave', handleDragLeave);
    colEl.addEventListener('drop', handleDrop);

    // Empty state (only shown when no filtered tasks in this column)
    const emptyHtml = colTasks.length === 0
      ? `<div class="col-empty">
           <div class="empty-icon">${col.id === 'done' ? '🎉' : col.id === 'todo' ? '📋' : col.id === 'analysis' ? '🔍' : col.id === 'inprogress' ? '⚡' : col.id === 'testing' ? '🧪' : '👁'}</div>
           <p>${hasActiveFilters() ? 'No matches' : 'Drop tasks here'}</p>
         </div>`
      : '';

    const cardsHtml = colTasks.map(t => renderTaskCard(t)).join('');

    colEl.innerHTML = `
      <div class="col-header">
        <span class="col-dot" style="background:${escapeHtml(col.dot)}"></span>
        <span class="col-title">${escapeHtml(col.label)}</span>
        <span class="col-count">${allColTasks.length}</span>
      </div>
      <div class="col-body" id="col-${escapeHtml(col.id)}">
        ${cardsHtml}
        ${emptyHtml}
      </div>
      <button class="col-add-btn" data-column="${escapeHtml(col.id)}" title="Add task to ${escapeHtml(col.label)}">
        ＋ Add task
      </button>
    `;

    board.appendChild(colEl);
  });
}

/* ============================================================
   RENDER TASK CARD
   ============================================================ */

function renderTaskCard(task) {
  const member = getTeamMember(task.assigneeId);
  const overdue = isOverdue(task.dueDate);
  const dueSoon  = !overdue && isDueSoon(task.dueDate);

  const labelsHtml = (task.labels || [])
    .map(l => `<span class="label-chip">${escapeHtml(l)}</span>`)
    .join('');

  const dueDateHtml = task.dueDate
    ? `<span class="meta-item ${overdue ? 'overdue' : dueSoon ? 'due-soon' : ''}">
         ${overdue ? '⚠️' : '📅'} ${formatDate(task.dueDate)}
       </span>`
    : '';

  const assigneeHtml = member
    ? `<span class="card-assignee" title="${escapeHtml(member.name)}" style="border-color:${escapeHtml(member.color)}">${avatarHtml(member, 'sm')}</span>`
    : '';

  const pointsHtml = task.points
    ? `<span class="card-points">${escapeHtml(String(task.points))}sp</span>`
    : '';

  const sprintHtml = task.inSprint
    ? `<span class="sprint-badge">🚀 Sprint</span>`
    : '';

  return `
    <div
      class="task-card ${task.parentId ? 'is-subtask' : ''}"
      data-id="${task.id}"
      data-priority="${escapeHtml(task.priority)}"
      draggable="true"
      role="button"
      tabindex="0"
      aria-label="Task ${task.id}: ${escapeHtml(task.title)}"
    >
      <input type="checkbox" class="card-select-cb" data-id="${task.id}" ${AppState.selectedTasks.has(task.id) ? 'checked' : ''} title="Select task" />
      ${task.parentId ? (() => {
        const parent = getTask(task.parentId);
        return `<div class="card-subtask-of"><span class="card-subtask-label">Subtask</span> ↳ ${parent ? escapeHtml(parent.title) : `TM-${task.parentId}`}</div>`;
      })() : ''}
      <div class="card-top">
        <span class="card-id">TM-${task.id}</span>
        ${priorityBadgeHtml(task.priority)}
        ${overdue ? `<span class="card-overdue-badge">⚠ Overdue</span>` : dueSoon ? `<span class="card-duesoon-badge">🔔 Due soon</span>` : ''}
      </div>
      <div class="card-title">${escapeHtml(task.title)}</div>
      ${task.description ? `<div class="card-desc">${escapeHtml(task.description)}</div>` : ''}
      ${labelsHtml ? `<div class="card-labels">${labelsHtml}</div>` : ''}
      ${(() => { const subs = AppState.tasks.filter(t => t.parentId === task.id); return subs.length ? `<div class="card-subtasks-count">⊞ ${subs.filter(s=>s.status==='done').length}/${subs.length} subtasks</div>` : ''; })()}
      <div class="card-footer">
        <div class="card-meta">
          ${dueDateHtml}
          ${pointsHtml}
          ${sprintHtml}
          ${(task.dependencies?.length || task.blockedBy?.length) ? `<span class="card-dep-indicator" title="Has dependencies">🔗</span>` : ''}
        </div>
        ${assigneeHtml}
      </div>
    </div>
  `;
}

/* ============================================================
   RENDER LIST VIEW
   ============================================================ */

function renderList() {
  const tbody = document.getElementById('list-body');
  const filtered = filterTasks(AppState.tasks);

  // Sort
  const { key, dir } = AppState.listSort;
  const sorted = [...filtered].sort((a, b) => {
    let va = a[key], vb = b[key];
    if (key === 'assignee') {
      const ma = getTeamMember(a.assigneeId);
      const mb = getTeamMember(b.assigneeId);
      va = ma ? ma.name : 'zzz';
      vb = mb ? mb.name : 'zzz';
    }
    if (va == null) va = '';
    if (vb == null) vb = '';
    const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
    return dir === 'asc' ? cmp : -cmp;
  });

  if (sorted.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding:40px; color:var(--text-light);">
          ${hasActiveFilters() ? 'No tasks match your filters.' : 'No tasks yet. Press N to create one!'}
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = sorted.map(task => {
    const member = getTeamMember(task.assigneeId);
    const overdue = isOverdue(task.dueDate);
    return `
      <tr data-id="${task.id}">
        <td class="list-task-id">TM-${task.id}</td>
        <td>
          <div class="list-task-title">${escapeHtml(task.title)}</div>
          ${(task.labels || []).map(l => `<span class="label-chip">${escapeHtml(l)}</span>`).join(' ')}
        </td>
        <td>${statusPillHtml(task.status)}</td>
        <td>${priorityBadgeHtml(task.priority)}</td>
        <td>
          ${member
            ? `<span style="font-size:16px" title="${escapeHtml(member.name)}">${avatarHtml(member)}</span>
               <span style="font-size:12px; color:var(--text-muted); margin-left:6px">${escapeHtml(member.name)}</span>`
            : `<span style="color:var(--text-light)">—</span>`
          }
        </td>
        <td style="color:${overdue ? 'var(--clr-high)' : 'var(--text-muted)'}; font-size:12.5px">
          ${overdue ? '⚠️ ' : ''}${formatDate(task.dueDate)}
        </td>
        <td style="text-align:center">
          ${task.points ? `<span class="card-points">${escapeHtml(String(task.points))}</span>` : '—'}
        </td>
        <td>
          ${task.inSprint ? `<span class="sprint-badge">🚀</span>` : '—'}
        </td>
      </tr>
    `;
  }).join('');

  // Update sort indicators in header
  document.querySelectorAll('.list-table th[data-sort]').forEach(th => {
    th.textContent = th.textContent.replace(/ [▲▼]$/, '');
    if (th.dataset.sort === key) {
      th.textContent += dir === 'asc' ? ' ▲' : ' ▼';
    }
  });
}

/* ============================================================
   RENDER DASHBOARD
   ============================================================ */

function renderDashboard() {
  const view = document.getElementById('dashboard-view');
  const tasks = AppState.tasks;

  const total   = tasks.length;
  const byStatus = { todo: 0, analysis: 0, inprogress: 0, review: 0, testing: 0, done: 0 };
  const byPriority = { highest: 0, high: 0, medium: 0, low: 0, lowest: 0 };
  let overdueCount = 0;
  let sprintCount  = 0;
  let sprintDone   = 0;

  tasks.forEach(t => {
    byStatus[t.status]     = (byStatus[t.status] || 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    if (isOverdue(t.dueDate) && t.status !== 'done') overdueCount++;
    if (t.inSprint) {
      sprintCount++;
      if (t.status === 'done') sprintDone++;
    }
  });

  const sprintPct = sprintCount ? Math.round((sprintDone / sprintCount) * 100) : 0;
  const maxStatus = Math.max(...Object.values(byStatus), 1);
  const maxPri    = Math.max(...Object.values(byPriority), 1);

  const statusLabels = { todo: 'Todo', analysis: 'Analysis', inprogress: 'In Progress', review: 'Review', testing: 'In Testing', done: 'Done' };
  const priorityLabels = { highest: 'Highest', high: 'High', medium: 'Medium', low: 'Low', lowest: 'Lowest' };

  const statusBarsHtml = Object.entries(byStatus).map(([s, count]) => `
    <div class="bar-row">
      <span class="bar-label">${statusLabels[s]}</span>
      <div class="bar-track">
        <div class="bar-fill ${s}" style="width:${Math.round((count / maxStatus) * 100)}%">
          <span class="bar-count">${count}</span>
        </div>
      </div>
    </div>
  `).join('');

  const priorityBarsHtml = Object.entries(byPriority).map(([p, count]) => `
    <div class="bar-row">
      <span class="bar-label">${priorityLabels[p]}</span>
      <div class="bar-track">
        <div class="bar-fill ${p}" style="width:${Math.round((count / maxPri) * 100)}%">
          <span class="bar-count">${count}</span>
        </div>
      </div>
    </div>
  `).join('');

  // Team workload
  const teamWorkload = AppState.team.map(m => {
    const count = tasks.filter(t => t.assigneeId === m.id && t.status !== 'done').length;
    return { member: m, count };
  }).sort((a, b) => b.count - a.count);

  const maxWork = Math.max(...teamWorkload.map(w => w.count), 1);
  const teamBarsHtml = teamWorkload.map(({ member, count }) => `
    <div class="bar-row">
      <span class="bar-label" title="${escapeHtml(member.name)}">${avatarHtml(member, 'sm')} ${escapeHtml(member.name.split(' ')[0])}</span>
      <div class="bar-track">
        <div class="bar-fill inprogress" style="width:${Math.round((count / maxWork) * 100)}%; background: linear-gradient(90deg, ${escapeHtml(member.color)}aa, ${escapeHtml(member.color)})">
          <span class="bar-count">${count}</span>
        </div>
      </div>
    </div>
  `).join('');

  // Recently updated tasks (last 8, sorted by most recent activity)
  const recentTasks = AppState.tasks
    .filter(t => !t.parentId)
    .map(t => {
      const lastAct = (t.activity || []).slice(-1)[0];
      return { task: t, ts: lastAct ? lastAct.timestamp : '' };
    })
    .sort((a, b) => (b.ts > a.ts ? 1 : b.ts < a.ts ? -1 : 0))
    .slice(0, 8);

  const recentHtml = recentTasks.map(({ task: t }) => {
    const member = getTeamMember(t.assigneeId);
    return `
      <div class="recent-task-row" data-id="${t.id}" role="button" tabindex="0">
        ${statusPillHtml(t.status)}
        ${priorityBadgeHtml(t.priority)}
        <span class="recent-task-title">${escapeHtml(t.title)}</span>
        <span class="recent-task-assignee">${member ? avatarHtml(member, 'sm') : '<span style="opacity:.4">—</span>'}</span>
      </div>`;
  }).join('');

  view.innerHTML = `
  <div class="dash-page">
    <div class="dash-grid">
      <div class="stat-card total">
        <span class="stat-icon">📋</span>
        <div class="stat-label">Total Tasks</div>
        <div class="stat-value">${total}</div>
        <div class="stat-sub">${byStatus.todo} in todo</div>
      </div>
      <div class="stat-card progress">
        <span class="stat-icon">⚡</span>
        <div class="stat-label">In Progress</div>
        <div class="stat-value">${byStatus.inprogress}</div>
        <div class="stat-sub">${byStatus.review} in review</div>
      </div>
      <div class="stat-card done">
        <span class="stat-icon">✅</span>
        <div class="stat-label">Completed</div>
        <div class="stat-value">${byStatus.done}</div>
        <div class="stat-sub">${total > 0 ? Math.round((byStatus.done / total) * 100) : 0}% completion rate</div>
      </div>
      <div class="stat-card overdue">
        <span class="stat-icon">⏰</span>
        <div class="stat-label">Overdue</div>
        <div class="stat-value" style="color:${overdueCount > 0 ? 'var(--clr-high)' : 'inherit'}">${overdueCount}</div>
        <div class="stat-sub">${overdueCount > 0 ? 'Need attention' : 'All on track'}</div>
      </div>
      <div class="stat-card sprint">
        <span class="stat-icon">🚀</span>
        <div class="stat-label">Sprint Tasks</div>
        <div class="stat-value">${sprintCount}</div>
        <div class="stat-sub">${sprintDone} completed, ${sprintCount - sprintDone} remaining</div>
      </div>
    </div>

    <div class="dash-charts">
      <div class="chart-card">
        <div class="chart-title">Tasks by Status</div>
        <div class="bar-chart">${statusBarsHtml}</div>
      </div>
      <div class="chart-card">
        <div class="chart-title">Tasks by Priority</div>
        <div class="bar-chart">${priorityBarsHtml}</div>
      </div>
    </div>

    <div class="dash-charts">
      <div class="chart-card">
        <div class="chart-title">Team Workload (active tasks)</div>
        <div class="bar-chart">${teamBarsHtml}</div>
      </div>
      <div class="chart-card">
        <div class="chart-title">Sprint Progress</div>
        <div style="margin-bottom:16px">
          <div style="display:flex; justify-content:space-between; font-size:13px; color:var(--text-muted); margin-bottom:8px">
            <span>Current Sprint</span>
            <strong style="color:var(--text)">${sprintPct}% complete</strong>
          </div>
          <div class="sprint-progress-bar">
            <div class="sprint-progress-fill" style="width:${sprintPct}%"></div>
          </div>
          <div class="sprint-stats">
            <span>🚀 ${sprintCount} total</span>
            <span>✅ ${sprintDone} done</span>
            <span>⏳ ${sprintCount - sprintDone} remaining</span>
          </div>
        </div>
        <div class="divider"></div>
        <div class="chart-title" style="margin-bottom:10px">Priority breakdown</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap">
          ${Object.entries(byPriority).map(([p, c]) =>
            `<div style="display:flex; align-items:center; gap:5px; font-size:12.5px">
               <span style="width:10px;height:10px;border-radius:50%;background:${PRIORITY_META[p].color};display:inline-block"></span>
               <span style="color:var(--text-muted)">${priorityLabels[p]}:</span>
               <strong>${c}</strong>
             </div>`
          ).join('')}
        </div>
      </div>
    </div>

    ${recentTasks.length ? `
    <div class="dash-section">
      <div class="chart-card">
        <div class="chart-title">Recently Updated</div>
        <div class="recent-tasks-list">${recentHtml}</div>
      </div>
    </div>` : ''}
  </div>
  `;

  // Wire up recently updated task clicks
  view.querySelectorAll('.recent-task-row[data-id]').forEach(row => {
    row.addEventListener('click', () => openTaskDetail(parseInt(row.dataset.id, 10)));
    row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTaskDetail(parseInt(row.dataset.id, 10)); } });
  });
}

/* ============================================================
   RENDER SPRINT VIEW
   ============================================================ */

function renderSprint() {
  const view = document.getElementById('sprint-view');
  const sprintTasks = filterTasks(AppState.tasks.filter(t => t.inSprint));

  const done = sprintTasks.filter(t => t.status === 'done').length;
  const total = sprintTasks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const cardsHtml = sprintTasks.length > 0
    ? sprintTasks.map(t => renderTaskCard(t)).join('')
    : `<div class="empty-board-state">
         <svg class="empty-svg" width="80" height="80" viewBox="0 0 80 80" fill="none">
           <circle cx="40" cy="40" r="36" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4"/>
           <path d="M28 40l8 8 16-16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
         </svg>
         <h3>No tasks in sprint</h3>
         <p>Add tasks to the sprint when creating or editing them.</p>
       </div>`;

  view.innerHTML = `
    <div style="padding:24px; max-width:900px">
      <div class="sprint-panel-info">
        <h4>🚀 Current Sprint</h4>
        <p>${total} tasks · ${done} completed · ${pct}% done</p>
        <div class="sprint-progress-bar" style="margin-top:10px">
          <div class="sprint-progress-fill" style="width:${pct}%"></div>
        </div>
      </div>
      <div style="display:flex; flex-direction:column; gap:8px">
        ${cardsHtml}
      </div>
    </div>
  `;
}

/* ============================================================
   TEAM VIEW
   ============================================================ */

function renderTeamView() {
  const view = document.getElementById('team-view');
  if (!view) return;

  const memberCards = AppState.team.map(m => {
    const taskCount  = AppState.tasks.filter(t => t.assigneeId === m.id && t.status !== 'done').length;
    const doneCount  = AppState.tasks.filter(t => t.assigneeId === m.id && t.status === 'done').length;
    const totalCount = taskCount + doneCount;
    const pct        = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
    const avatarInner = m.photo
      ? `<img src="${m.photo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`
      : `<span style="font-size:32px;line-height:1">${escapeHtml(m.avatar)}</span>`;

    return `
      <div class="team-card" data-id="${m.id}">
        <div class="team-card-top">
          <div class="team-card-avatar" style="border-color:${escapeHtml(m.color)}">${avatarInner}</div>
          <div class="team-card-info">
            <div class="team-card-name">${escapeHtml(m.name)}</div>
            <div class="team-card-stats">
              <span class="team-stat-pill active">${taskCount} active</span>
              <span class="team-stat-pill done">${doneCount} done</span>
            </div>
          </div>
        </div>
        ${totalCount ? `
        <div class="team-card-progress-wrap">
          <div class="team-card-progress">
            <div class="team-card-progress-fill" style="width:${pct}%; background:${escapeHtml(m.color)}"></div>
          </div>
          <span class="team-card-pct">${pct}%</span>
        </div>` : '<div class="team-card-no-tasks">No tasks assigned</div>'}
        <div class="team-card-footer">
          <button class="team-card-btn edit" data-id="${m.id}">✏️ Edit</button>
          <button class="team-card-btn remove" data-id="${m.id}">🗑 Remove</button>
        </div>
      </div>`;
  }).join('');

  view.innerHTML = `
    <div class="team-page">
      <div class="team-page-header">
        <div>
          <h2 class="team-page-title">👥 Team</h2>
          <p class="team-page-sub">${AppState.team.length} member${AppState.team.length !== 1 ? 's' : ''}</p>
        </div>
        <button class="btn btn-primary" id="team-add-btn">＋ Add member</button>
      </div>
      <div class="team-cards-grid">
        ${memberCards || '<div class="team-empty">No team members yet.<br>Click <strong>+ Add member</strong> to get started.</div>'}
      </div>
    </div>`;

  document.getElementById('team-add-btn').addEventListener('click', () => openMemberModal(null));

  view.querySelectorAll('.team-card-btn.edit').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); openMemberModal(parseInt(btn.dataset.id, 10)); })
  );
  view.querySelectorAll('.team-card-btn.remove').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); deleteMember(parseInt(btn.dataset.id, 10)); })
  );
}

function openTaskDetail(taskId) {
  const task = getTask(taskId);
  if (!task) return;

  AppState.openTaskId = taskId;

  document.getElementById('panel-id').textContent = `TM-${task.id}`;

  // Editable title in header
  document.getElementById('panel-title').innerHTML =
    `<span class="panel-title-text" contenteditable="true" spellcheck="false" data-task-id="${task.id}">${escapeHtml(task.title)}</span>`;

  const titleSpan = document.getElementById('panel-title').querySelector('.panel-title-text');
  titleSpan.addEventListener('blur', () => {
    const val = titleSpan.textContent.trim();
    const t = getTask(taskId);
    if (t && val && val !== t.title) {
      t.title = val;
      logActivity(t, 'edited', { field: 'title' });
      saveToStorage();
      refreshAll();
      showToast('Title updated', 'success');
    } else if (!val && t) {
      titleSpan.textContent = t.title; // revert if empty
    }
  });
  titleSpan.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); titleSpan.blur(); }
  });

  const overdue = isOverdue(task.dueDate);

  // Build inline selects & inputs
  const statusOptions = COLUMNS.map(c =>
    `<option value="${c.id}" ${task.status === c.id ? 'selected' : ''}>${c.label}</option>`
  ).join('');

  const priorityOptions = Object.entries(PRIORITY_META).map(([k, v]) =>
    `<option value="${k}" ${task.priority === k ? 'selected' : ''}>${v.label}</option>`
  ).join('');

  const assigneeOptions = `<option value="">Unassigned</option>` +
    AppState.team.map(m =>
      `<option value="${m.id}" ${task.assigneeId === m.id ? 'selected' : ''}>${m.avatar} ${m.name}</option>`
    ).join('');

  const activityItems = (task.activity || []).filter(a => a.type !== 'comment').slice().reverse().map(act => {
    const m = getTeamMember(act.memberId);
    let text = '';
    if (act.type === 'created') text = `<strong>${m ? escapeHtml(m.name) : 'Someone'}</strong> created this task`;
    if (act.type === 'status')  text = `<strong>${m ? escapeHtml(m.name) : 'Someone'}</strong> moved from <em>${escapeHtml(act.from)}</em> → <em>${escapeHtml(act.to)}</em>`;
    if (act.type === 'edited')  text = `<strong>${m ? escapeHtml(m.name) : 'Someone'}</strong> updated ${escapeHtml(act.field || 'task')}`;
    return `
      <div class="activity-item">
        <div class="activity-avatar">${m ? avatarHtml(m) : '👤'}</div>
        <div><div class="activity-text">${text}</div><div class="activity-time">${timeAgo(act.timestamp)}</div></div>
      </div>`;
  }).join('');

  document.getElementById('panel-body').innerHTML = `
    <div class="panel-two-col">

      <!-- LEFT: main content -->
      <div class="panel-main">
        <textarea
          class="panel-desc-textarea"
          id="panel-desc-text"
          placeholder="Add a description…"
        >${escapeHtml(task.description || '')}</textarea>

        ${renderDepsSection(task)}
        ${renderSubtasksSection(task)}

        ${activityItems ? `
          <div class="panel-section">
            <div class="panel-section-label">Activity</div>
            <div>${activityItems}</div>
          </div>` : ''}

        ${renderCommentSection(task.id)}
      </div>

      <!-- RIGHT: metadata -->
      <div class="panel-sidebar">
        <div class="panel-meta-row">
          <span class="panel-meta-key">Status</span>
          <select class="panel-meta-val-sel" id="panel-status" data-field="status">${statusOptions}</select>
        </div>
        <div class="panel-meta-row">
          <span class="panel-meta-key">Priority</span>
          <select class="panel-meta-val-sel" id="panel-priority" data-field="priority">${priorityOptions}</select>
        </div>
        <div class="panel-meta-row">
          <span class="panel-meta-key">Assignee</span>
          <select class="panel-meta-val-sel" id="panel-assignee" data-field="assigneeId">${assigneeOptions}</select>
        </div>
        <div class="panel-meta-row">
          <span class="panel-meta-key">Due date</span>
          <input type="date" class="panel-meta-val-input" id="panel-due" value="${task.dueDate || ''}"
            style="color:${overdue ? 'var(--clr-high)' : 'inherit'}" />
        </div>
        <div class="panel-meta-row">
          <span class="panel-meta-key">Story points</span>
          <input type="number" class="panel-meta-val-input" id="panel-points"
            value="${task.points || ''}" min="1" max="100" placeholder="—" />
        </div>
        <div class="panel-meta-row">
          <span class="panel-meta-key">Sprint</span>
          <label class="panel-sprint-toggle">
            <input type="checkbox" id="panel-sprint-check" ${task.inSprint ? 'checked' : ''} />
            <span>In Sprint</span>
          </label>
        </div>
        <div class="panel-meta-row panel-meta-labels">
          <span class="panel-meta-key">Labels</span>
          <div class="panel-labels-wrap" id="panel-labels-wrap">
            ${(task.labels || []).map((l, i) =>
              `<span class="label-chip">${escapeHtml(l)}<button class="remove-panel-label" data-index="${i}">×</button></span>`
            ).join('')}
            <input class="panel-label-input" id="panel-label-input" placeholder="Add…" autocomplete="off" />
          </div>
        </div>
      </div>

    </div>
  `;

  // ---- Wire up inline field changes ----

  // Description auto-save on blur
  const descEl = document.getElementById('panel-desc-text');
  descEl.addEventListener('blur', () => {
    const t = getTask(taskId);
    const val = descEl.value.trim();
    if (t && val !== (t.description || '')) {
      t.description = val;
      logActivity(t, 'edited', { field: 'description' });
      saveToStorage();
      showToast('Description saved', 'success');
    }
  });

  // Selects
  ['panel-status', 'panel-priority', 'panel-assignee'].forEach(id => {
    document.getElementById(id).addEventListener('change', e => {
      const t = getTask(taskId);
      if (!t) return;
      const field = e.target.dataset.field;
      const prev  = t[field];
      if (field === 'assigneeId') {
        t.assigneeId = e.target.value ? parseInt(e.target.value, 10) : null;
      } else if (field === 'status') {
        t.status = e.target.value;
        logActivity(t, 'status', { from: prev, to: t.status });
      } else {
        t[field] = e.target.value;
        logActivity(t, 'edited', { field });
      }
      saveToStorage();
      refreshAll();
      showToast('Saved', 'success');
    });
  });

  // Due date
  document.getElementById('panel-due').addEventListener('change', e => {
    const t = getTask(taskId);
    if (!t) return;
    t.dueDate = e.target.value || null;
    e.target.style.color = isOverdue(t.dueDate) ? 'var(--clr-high)' : 'inherit';
    logActivity(t, 'edited', { field: 'due date' });
    saveToStorage();
    refreshAll();
  });

  // Story points
  document.getElementById('panel-points').addEventListener('change', e => {
    const t = getTask(taskId);
    if (!t) return;
    t.points = parseInt(e.target.value, 10) || null;
    saveToStorage();
    refreshAll();
  });

  // Sprint checkbox
  document.getElementById('panel-sprint-check').addEventListener('change', e => {
    const t = getTask(taskId);
    if (!t) return;
    t.inSprint = e.target.checked;
    saveToStorage();
    refreshAll();
    updateBadges();
    showToast(t.inSprint ? 'Added to sprint' : 'Removed from sprint', 'info');
  });

  // Labels
  const labelsWrap  = document.getElementById('panel-labels-wrap');
  const labelInput  = document.getElementById('panel-label-input');

  labelsWrap.addEventListener('click', e => {
    const btn = e.target.closest('.remove-panel-label');
    if (!btn) return;
    const t = getTask(taskId);
    if (!t) return;
    t.labels = t.labels || [];
    t.labels.splice(parseInt(btn.dataset.index, 10), 1);
    saveToStorage();
    refreshAll();
    openTaskDetail(taskId); // re-render panel
  });

  labelInput.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ',') return;
    e.preventDefault();
    const val = labelInput.value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    if (!val) return;
    const t = getTask(taskId);
    if (!t) return;
    t.labels = t.labels || [];
    if (!t.labels.includes(val) && t.labels.length < 8) {
      t.labels.push(val);
      saveToStorage();
      refreshAll();
      openTaskDetail(taskId);
    }
    labelInput.value = '';
  });

  // Footer — only sprint shortcut + delete
  document.getElementById('panel-footer').innerHTML = `
    <div style="flex:1"></div>
    <button class="btn btn-secondary btn-sm" id="save-template-btn">📋 Save as template</button>
    <button class="btn btn-danger btn-sm" id="panel-delete-btn">🗑 Delete</button>
  `;

  document.getElementById('panel-delete-btn').addEventListener('click', () => {
    showConfirm(`Delete TM-${taskId}? This cannot be undone.`, () => {
      deleteTask(taskId);
      closeDetailPanel();
    });
  });

  const saveTemplateBtn = document.getElementById('save-template-btn');
  if (saveTemplateBtn) {
    saveTemplateBtn.addEventListener('click', () => saveTaskAsTemplate(taskId));
  }

  // Show panel
  document.getElementById('overlay').classList.add('visible');
  document.getElementById('overlay').setAttribute('aria-hidden', 'false');
  document.getElementById('detail-panel').classList.add('open');
  document.getElementById('detail-panel').setAttribute('aria-hidden', 'false');

  attachCommentEvents(task.id);
  attachSubtaskEvents(task.id);
  attachDepsEvents(task.id);
}

function closeDetailPanel() {
  AppState.openTaskId = null;
  const panel = document.getElementById('detail-panel');
  panel.classList.remove('open', 'fullscreen');
  document.getElementById('overlay').classList.remove('visible');
  document.getElementById('overlay').setAttribute('aria-hidden', 'true');
  panel.setAttribute('aria-hidden', 'true');
  const expandBtn = document.getElementById('panel-expand');
  if (expandBtn) { expandBtn.textContent = '⛶'; expandBtn.title = 'Expand (F)'; }
}

/* ============================================================
   TASK MODAL (Create / Edit)
   ============================================================ */

// Tracks labels being edited in the modal
let modalLabels = [];

function openTaskModal(taskId = null) {
  const modalOverlay = document.getElementById('modal-overlay');
  const saveBtn      = document.getElementById('modal-save');
  const deleteBtn    = document.getElementById('modal-delete');
  const topbarId     = document.getElementById('modal-topbar-id');
  const editIdInput  = document.getElementById('edit-task-id');

  // Reset form
  clearModalForm();

  if (taskId !== null) {
    // Edit mode
    const task = getTask(taskId);
    if (!task) return;

    if (topbarId) topbarId.textContent = `TM-${taskId}`;
    saveBtn.textContent = 'Save Changes';
    editIdInput.value   = String(taskId);
    deleteBtn.classList.remove('hidden');

    document.getElementById('field-title').value    = task.title;
    document.getElementById('field-desc').value     = task.description || '';
    document.getElementById('field-status').value   = task.status;
    document.getElementById('field-priority').value = task.priority;
    document.getElementById('field-assignee').value = task.assigneeId ? String(task.assigneeId) : '';
    document.getElementById('field-due').value      = task.dueDate || '';
    document.getElementById('field-points').value   = task.points || '';
    document.getElementById('field-sprint').checked = !!task.inSprint;

    modalLabels = [...(task.labels || [])];
    renderModalLabels();
  } else {
    // Create mode
    if (topbarId) topbarId.textContent = 'New Task';
    saveBtn.textContent = 'Create Task';
    editIdInput.value   = '';
    deleteBtn.classList.add('hidden');
    modalLabels = [];
  }

  modalOverlay.classList.add('visible');
  modalOverlay.setAttribute('aria-hidden', 'false');

  setTimeout(() => document.getElementById('field-title').focus(), 80);
}

function clearModalForm() {
  document.getElementById('field-title').value    = '';
  document.getElementById('field-desc').value     = '';
  document.getElementById('field-status').value   = 'todo';
  document.getElementById('field-priority').value = 'medium';  document.getElementById('field-assignee').value = '';
  document.getElementById('field-due').value      = '';
  document.getElementById('field-points').value   = '';
  document.getElementById('field-sprint').checked = false;
  document.getElementById('labels-input').value   = '';
  modalLabels = [];
  renderModalLabels();
}

function closeTaskModal() {
  document.getElementById('modal-overlay').classList.remove('visible');
  document.getElementById('modal-overlay').setAttribute('aria-hidden', 'true');
}

function renderModalLabels() {
  const wrap = document.getElementById('labels-wrap');
  // Remove existing label tags
  wrap.querySelectorAll('.label-tag').forEach(el => el.remove());

  const input = document.getElementById('labels-input');
  modalLabels.forEach((label, i) => {
    const tag = document.createElement('span');
    tag.className = 'label-tag';
    tag.innerHTML = `${escapeHtml(label)} <span class="remove-label" data-index="${i}">×</span>`;
    wrap.insertBefore(tag, input);
  });
}

function saveTaskFromModal() {
  const title = document.getElementById('field-title').value.trim();
  if (!title) {
    document.getElementById('field-title').focus();
    document.getElementById('field-title').style.borderColor = 'var(--clr-high)';
    setTimeout(() => { document.getElementById('field-title').style.borderColor = ''; }, 1500);
    showToast('Title is required', 'error');
    return;
  }

  const editId = document.getElementById('edit-task-id').value;
  const isEdit = editId !== '';
  const assigneeVal = document.getElementById('field-assignee').value;

  const taskData = {
    title:      title,
    description: document.getElementById('field-desc').value.trim(),
    status:     document.getElementById('field-status').value,
    priority:   document.getElementById('field-priority').value,
    assigneeId: assigneeVal ? parseInt(assigneeVal, 10) : null,
    dueDate:    document.getElementById('field-due').value || null,
    points:     parseInt(document.getElementById('field-points').value, 10) || null,
    inSprint:   document.getElementById('field-sprint').checked,
    labels:     [...modalLabels],
  };

  if (isEdit) {
    const task = getTask(parseInt(editId, 10));
    if (!task) return;
    const prevStatus = task.status;
    Object.assign(task, taskData);
    if (!task.activity) task.activity = [];
    if (prevStatus !== taskData.status) {
      task.activity.push({ type: 'status', from: prevStatus, to: taskData.status, memberId: 1, timestamp: new Date().toISOString().split('T')[0] });
    } else {
      task.activity.push({ type: 'edited', field: 'task', memberId: 1, timestamp: new Date().toISOString().split('T')[0] });
    }
    showToast(`TM-${task.id} updated`, 'success');
  } else {
    const newId = generateId();
    const newTask = {
      id: newId,
      ...taskData,
      activity: [
        { type: 'created', memberId: 1, timestamp: new Date().toISOString().split('T')[0] },
      ],
    };
    AppState.tasks.push(newTask);
    showToast(`TM-${newId} created`, 'success');
  }

  saveToStorage();
  closeTaskModal();
  refreshAll();
}

function deleteTask(taskId) {
  const task = getTask(taskId);
  if (!task) return;
  pushUndo('task', {...task});
  AppState.tasks = AppState.tasks.filter(t => t.id !== taskId);
  saveToStorage();
  refreshAll();
  showToast(`TM-${taskId} deleted`, 'info');
}

function pushUndo(type, data) {
  AppState.undoStack.push({ type, data, timestamp: Date.now() });
  if (AppState.undoStack.length > 10) AppState.undoStack.shift();
}

function updateBulkBar() {
  const bar = document.getElementById('bulk-bar');
  if (!bar) return;
  const count = AppState.selectedTasks.size;
  if (count === 0) { bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');
  document.getElementById('bulk-count').textContent = `${count} selected`;
  const asel = document.getElementById('bulk-assignee-sel');
  asel.innerHTML = '<option value="">Reassign…</option>' + AppState.team.map(m => `<option value="${m.id}">${m.avatar} ${m.name}</option>`).join('');
}

/* ============================================================
   DRAG AND DROP
   ============================================================ */

function handleDragStart(e) {
  const card = e.target.closest('.task-card');
  if (!card) return;
  const taskId = parseInt(card.dataset.id, 10);
  const colEl  = card.closest('.kanban-column');

  AppState.drag.taskId    = taskId;
  AppState.drag.srcColumn = colEl ? colEl.dataset.column : null;

  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(taskId));

  // Defer adding dragging class so the browser snapshot looks normal
  requestAnimationFrame(() => { card.classList.add('dragging'); });
}

function handleDragEnd(e) {
  const card = e.target.closest('.task-card');
  if (card) card.classList.remove('dragging');

  // Remove all drag-over indicators
  document.querySelectorAll('.kanban-column.drag-over').forEach(c => c.classList.remove('drag-over'));

  AppState.drag.taskId    = null;
  AppState.drag.srcColumn = null;
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const col = e.currentTarget;
  col.classList.add('drag-over');
}

function handleDragLeave(e) {
  const col = e.currentTarget;
  // Only remove if leaving the column itself (not entering a child)
  if (!col.contains(e.relatedTarget)) {
    col.classList.remove('drag-over');
  }
}

function handleDrop(e) {
  e.preventDefault();
  const col    = e.currentTarget;
  const colId  = col.dataset.column;
  const taskId = AppState.drag.taskId;

  col.classList.remove('drag-over');

  if (!taskId || !colId) return;

  const task = getTask(taskId);
  if (!task) return;

  const prevStatus = task.status;
  if (prevStatus === colId) return; // No change

  task.status = colId;
  if (!task.activity) task.activity = [];
  task.activity.push({
    type: 'status',
    from: prevStatus,
    to:   colId,
    memberId: 1,
    timestamp: new Date().toISOString().split('T')[0],
  });

  saveToStorage();
  renderBoard();
  updateBadges();
  showToast(`Moved to ${COLUMNS.find(c => c.id === colId)?.label || colId}`, 'info');
}

/* ============================================================
   VIEW SWITCHING
   ============================================================ */

function switchView(viewId) {
  AppState.currentView = viewId;

  const viewTitles = {
    board:     'Kanban',
    list:      'List',
    dashboard: 'Dashboard',
    sprint:    'Kanban',
    team:      'Team',
  };

  // Update title
  document.getElementById('topbar-title').textContent = viewTitles[viewId] || viewId;

  // Toggle views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(`${viewId}-view`);
  if (target) target.classList.add('active');

  // Update nav
  document.querySelectorAll('.nav-item[data-view]').forEach(n => {
    n.classList.toggle('active', n.dataset.view === viewId);
  });

  document.querySelectorAll('.view-btn[data-view]').forEach(b => {
    b.classList.toggle('active', b.dataset.view === viewId);
  });

  // Sync mobile bottom nav
  document.querySelectorAll('#mobile-bottom-nav .mob-nav-btn[data-view]').forEach(b => {
    b.classList.toggle('active', b.dataset.view === viewId);
  });

  // Render the correct view
  if (viewId === 'board')     renderBoard();
  if (viewId === 'list')      renderList();
  if (viewId === 'dashboard') renderDashboard();
  if (viewId === 'sprint')    renderSprint();
  if (viewId === 'team')      renderTeamView();
}

/* ============================================================
   FILTER UI
   ============================================================ */

function buildAssigneeFilterMenu() {
  const menu = document.getElementById('assignee-filter-menu');
  menu.innerHTML = `<div class="item" data-filter="assignee" data-value="">All assignees</div>`;
  AppState.team.forEach(m => {
    const div = document.createElement('div');
    div.className = 'item';
    div.dataset.filter = 'assignee';
    div.dataset.value = String(m.id);
    div.textContent = `${m.avatar} ${m.name}`;
    menu.appendChild(div);
  });
}

function buildLabelFilterMenu() {
  const menu = document.getElementById('label-filter-menu');
  // Collect all unique labels from tasks
  const labels = [...new Set(AppState.tasks.flatMap(t => t.labels || []))].sort();
  menu.innerHTML = `<div class="item" data-filter="label" data-value="">All labels</div>`;
  labels.forEach(l => {
    const div = document.createElement('div');
    div.className = 'item';
    div.dataset.filter = 'label';
    div.dataset.value = l;
    div.textContent = `🏷 ${l}`;
    menu.appendChild(div);
  });
}

function buildAssigneeModalOptions() {
  const sel = document.getElementById('field-assignee');
  while (sel.options.length > 1) sel.remove(1);
  AppState.team.forEach(m => {
    const opt = document.createElement('option');
    opt.value = String(m.id);
    opt.textContent = `${m.avatar} ${m.name}`;
    sel.appendChild(opt);
  });
}

function applyFilter(type, value) {
  AppState.filters[type] = value;
  refreshCurrentView();
  updateFilterUI();
}

function renderTopbarAvatars() {
  const wrap = document.getElementById('topbar-avatars');
  if (!wrap) return;

  const activeId = AppState.filters.assignee;

  // "All" button (person icon)
  const allActive = !activeId;
  const allBtn = `<button class="topbar-avatar-btn ${allActive ? 'active' : ''}" data-member-id="" title="All members" aria-label="Show all">
    <span class="topbar-avatar-inner topbar-avatar-all">👤</span>
  </button>`;

  const memberBtns = AppState.team.map(m => {
    const isActive = activeId === String(m.id);
    // Generate initials fallback label
    const initials = m.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return `<button class="topbar-avatar-btn ${isActive ? 'active' : ''}" data-member-id="${m.id}" title="${escapeHtml(m.name)}" aria-label="Filter by ${escapeHtml(m.name)}">
      <span class="topbar-avatar-inner" style="background:${escapeHtml(m.color)}">${m.photo ? `<img src="${m.photo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />` : escapeHtml(m.avatar)}</span>
    </button>`;
  }).join('');

  wrap.innerHTML = allBtn + memberBtns;
}

function updateFilterUI() {
  renderTopbarAvatars();

  const f = AppState.filters;

  // Priority btn label
  const pb = document.getElementById('priority-filter-btn');
  pb.innerHTML = f.priority
    ? `<span>${PRIORITY_META[f.priority]?.label || 'Priority'}</span> <span>▾</span>`
    : `<span>Priority</span> <span>▾</span>`;
  pb.classList.toggle('active', !!f.priority);

  // Assignee btn label
  const ab = document.getElementById('assignee-filter-btn');
  if (f.assignee) {
    const m = getTeamMember(parseInt(f.assignee, 10));
    ab.innerHTML = `<span>${m ? `${m.avatar} ${m.name.split(' ')[0]}` : 'Assignee'}</span> <span>▾</span>`;
  } else {
    ab.innerHTML = `<span>Assignee</span> <span>▾</span>`;
  }
  ab.classList.toggle('active', !!f.assignee);

  // Label btn label
  const lb = document.getElementById('label-filter-btn');
  lb.innerHTML = f.label
    ? `<span>🏷 ${escapeHtml(f.label)}</span> <span>▾</span>`
    : `<span>Label</span> <span>▾</span>`;
  lb.classList.toggle('active', !!f.label);

  // Clear button
  const clearBtn = document.getElementById('clear-filters-btn');
  clearBtn.classList.toggle('hidden', !hasActiveFilters());

  // Update selected state in menus
  document.querySelectorAll('.filter-dropdown-menu .item').forEach(item => {
    const match = AppState.filters[item.dataset.filter] === item.dataset.value;
    item.classList.toggle('selected', match);
  });
}

function closeAllDropdowns() {
  document.querySelectorAll('.filter-dropdown-menu.open').forEach(m => m.classList.remove('open'));
}

/* ============================================================
   TEAM SIDEBAR
   ============================================================ */

function renderTeamSidebar() {
  // Team list removed from sidebar — managed via Team page only
}

/* ============================================================
   BADGES / COUNTS
   ============================================================ */

function updateBadges() {
  const sprintCount = AppState.tasks.filter(t => t.inSprint).length;
  const sb = document.getElementById('sprint-count-badge');
  if (sb) sb.textContent = String(sprintCount);
}

/* ============================================================
   TOAST
   ============================================================ */

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 280);
  }, 2800);
}

/* ============================================================
   CLOSE ALL MODALS / PANELS
   ============================================================ */

function closeAll() {
  closeDetailPanel();
  closeTaskModal();
  closeAllDropdowns();
  document.getElementById('shortcuts-overlay')?.classList.remove('visible');
}

/* ============================================================
   REFRESH ALL RENDERED VIEWS
   ============================================================ */

function refreshAll() {
  refreshCurrentView();
  updateBadges();
  buildLabelFilterMenu();
  buildAssigneeFilterMenu();
  buildAssigneeModalOptions();
  renderTeamSidebar();
  renderTopbarAvatars();
  if (AppState.currentView === 'team') renderTeamView();
  updateBulkBar();
}

function refreshCurrentView() {
  const v = AppState.currentView;
  if (v === 'board')     renderBoard();
  if (v === 'list')      renderList();
  if (v === 'dashboard') renderDashboard();
  if (v === 'sprint')    renderSprint();
  if (v === 'team')      renderTeamView();
}

/* ============================================================
   DARK MODE
   ============================================================ */

function setDarkMode(dark) {
  AppState.darkMode = dark;
  document.body.classList.toggle('dark', dark);
  const btn = document.getElementById('dark-toggle');
  if (btn) btn.textContent = dark ? '🌙' : '☀️';
  saveToStorage();
}

function toggleDarkMode() {
  setDarkMode(!AppState.darkMode);
}

/* ============================================================
   KEYBOARD SHORTCUTS
   ============================================================ */

function handleKeyboard(e) {
  // Skip if focus is inside an input, textarea, or contenteditable
  const tag  = document.activeElement.tagName.toLowerCase();
  const inInput = tag === 'input' || tag === 'textarea' || tag === 'select'
    || document.activeElement.getAttribute('contenteditable') === 'true';

  // Escape always works
  if (e.key === 'Escape') {
    e.preventDefault();
    closeAll();
    return;
  }

  // Undo (Ctrl/Cmd+Z) — works even in inputs
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    const item = AppState.undoStack.pop();
    if (!item) { showToast('Nothing to undo', 'info'); return; }
    if (item.type === 'task') {
      AppState.tasks.push(item.data);
      saveToStorage(); refreshAll();
      showToast(`Restored TM-${item.data.id}`, 'success');
    }
    return;
  }

  if (inInput) return;

  switch (e.key) {
    case 'n': case 'N':
      e.preventDefault();
      openTaskModal(null);
      break;
    case '/':
      e.preventDefault();
      document.getElementById('search-input').focus();
      break;
    case 'b': case 'B':
      e.preventDefault();
      switchView('board');
      break;
    case 'l': case 'L':
      e.preventDefault();
      switchView('list');
      break;
    case 'd': case 'D':
      e.preventDefault();
      switchView('dashboard');
      break;
    case 't': case 'T':
      e.preventDefault();
      switchView('team');
      break;
    case '?':
      e.preventDefault();
      document.getElementById('shortcuts-overlay').classList.toggle('visible');
      break;
    case 'f': case 'F':
      if (AppState.openTaskId) {
        e.preventDefault();
        document.getElementById('panel-expand').click();
      }
      break;
  }
}

/* ============================================================
   EVENT DELEGATION
   ============================================================ */

function attachEvents() {

  // ---- Sidebar nav items ----
  document.getElementById('sidebar').addEventListener('click', e => {
    const navItem = e.target.closest('.nav-item[data-view]');
    if (navItem) {
      // Switching to Kanban/board clears active filters
      if (navItem.dataset.view === 'board') {
        AppState.filters.assignee = '';
        AppState.filters.priority = '';
        AppState.filters.label    = '';
        updateFilterUI();
      }
      switchView(navItem.dataset.view);
      return;
    }

    // Quick sidebar filters
    if (e.target.closest('#filter-no-assignee')) {
      AppState.filters.assignee = '0';
      updateFilterUI();
      refreshCurrentView();
      showToast('Showing unassigned tasks', 'info');
      return;
    }

    // Team member action buttons (edit/delete) — check BEFORE general member click
    const editBtn = e.target.closest('.edit-member-btn');
    if (editBtn) {
      e.stopPropagation();
      openMemberModal(parseInt(editBtn.dataset.id, 10));
      return;
    }

    const deleteBtn = e.target.closest('.delete-member-btn');
    if (deleteBtn) {
      e.stopPropagation();
      deleteMember(parseInt(deleteBtn.dataset.id, 10));
      return;
    }

    // Team member click → filter by assignee
    const memberEl = e.target.closest('.team-member[data-member-id], .team-member-compact[data-member-id]');
    if (memberEl) {
      const id = memberEl.dataset.memberId;
      if (AppState.filters.assignee === id) {
        applyFilter('assignee', '');
        showToast('Filter cleared', 'info');
      } else {
        applyFilter('assignee', id);
        const m = getTeamMember(parseInt(id, 10));
        showToast(`Filtering by ${m ? m.name : '?'}`, 'info');
        switchView('board');
      }
      return;
    }
  });

  // ---- New task button ----
  document.getElementById('new-task-btn').addEventListener('click', () => openTaskModal(null));

  // ---- Topbar avatar filter ----
  document.getElementById('topbar-avatars').addEventListener('click', e => {
    const btn = e.target.closest('.topbar-avatar-btn');
    if (!btn) return;
    const id = btn.dataset.memberId;
    if (id === AppState.filters.assignee || id === '') {
      applyFilter('assignee', '');
    } else {
      applyFilter('assignee', id);
    }
    renderTopbarAvatars();
  });

  // ---- Dark mode toggle ----
  document.getElementById('dark-toggle').addEventListener('click', toggleDarkMode);

  // ---- View toggle buttons (topbar) ----
  document.querySelectorAll('.view-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // ---- Search ----
  document.getElementById('search-input').addEventListener('input', e => {
    AppState.filters.search = e.target.value;
    refreshCurrentView();
    updateFilterUI();
  });

  // ---- Filter dropdown toggles ----
  ['priority-filter-btn', 'assignee-filter-btn', 'label-filter-btn'].forEach(id => {
    document.getElementById(id).addEventListener('click', e => {
      e.stopPropagation();
      const btn  = document.getElementById(id);
      const wrap = btn.closest('.filter-dropdown');
      const menu = wrap.querySelector('.filter-dropdown-menu');
      const wasOpen = menu.classList.contains('open');
      closeAllDropdowns();
      if (!wasOpen) menu.classList.add('open');
    });
  });

  // ---- Filter menu item clicks ----
  document.addEventListener('click', e => {
    const item = e.target.closest('.filter-dropdown-menu .item');
    if (item) {
      applyFilter(item.dataset.filter, item.dataset.value);
      closeAllDropdowns();
      return;
    }

    // Close dropdowns on outside click
    if (!e.target.closest('.filter-dropdown')) {
      closeAllDropdowns();
    }

    // Close template dropdown on outside click
    if (!e.target.closest('.template-wrap')) {
      document.getElementById('template-dropdown')?.classList.add('hidden');
    }
  });

  // ---- Clear filters ----
  document.getElementById('clear-filters-btn').addEventListener('click', () => {
    AppState.filters = { search: '', priority: '', assignee: '', label: '' };
    document.getElementById('search-input').value = '';
    refreshCurrentView();
    updateFilterUI();
    showToast('Filters cleared', 'info');
  });

  // ---- Board / card events (delegation on #content) ----
  document.getElementById('content').addEventListener('click', e => {
    // Task card click → open detail
    const card = e.target.closest('.task-card');
    if (card && !e.target.closest('.drag-handle') && !e.target.closest('.card-select-cb')) {
      openTaskDetail(parseInt(card.dataset.id, 10));
      return;
    }

    // "Add task" button in column
    const addBtn = e.target.closest('.col-add-btn');
    if (addBtn) {
      openTaskModal(null);
      // Pre-select the status for that column
      setTimeout(() => {
        const statusEl = document.getElementById('field-status');
        if (statusEl) statusEl.value = addBtn.dataset.column;
      }, 50);
      return;
    }

    // List row click → detail
    const listRow = e.target.closest('#list-body tr[data-id]');
    if (listRow) {
      openTaskDetail(parseInt(listRow.dataset.id, 10));
      return;
    }
  });

  // ---- List table sort ----
  document.querySelector('.list-table thead').addEventListener('click', e => {
    const th = e.target.closest('th[data-sort]');
    if (!th) return;
    const key = th.dataset.sort;
    if (AppState.listSort.key === key) {
      AppState.listSort.dir = AppState.listSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
      AppState.listSort = { key, dir: 'asc' };
    }
    renderList();
  });

  // ---- Drag & Drop on board ----
  document.getElementById('board-view').addEventListener('dragstart', handleDragStart);
  document.getElementById('board-view').addEventListener('dragend', handleDragEnd);

  // ---- Bulk selection checkbox on board ----
  document.getElementById('board-view').addEventListener('click', e => {
    const cb = e.target.closest('.card-select-cb');
    if (cb) {
      e.stopPropagation();
      const id = parseInt(cb.dataset.id, 10);
      if (cb.checked) {
        AppState.selectedTasks.add(id);
      } else {
        AppState.selectedTasks.delete(id);
      }
      updateBulkBar();
      return;
    }
  });

  // ---- Bulk bar buttons ----
  document.getElementById('bulk-clear-btn').addEventListener('click', () => {
    AppState.selectedTasks.clear();
    updateBulkBar();
    renderBoard();
  });

  document.getElementById('bulk-status-sel').addEventListener('change', e => {
    const status = e.target.value;
    if (!status) return;
    AppState.selectedTasks.forEach(id => {
      const t = getTask(id);
      if (t) { t.status = status; }
    });
    saveToStorage();
    AppState.selectedTasks.clear();
    updateBulkBar();
    refreshAll();
    showToast(`Status updated for selected tasks`, 'success');
    e.target.value = '';
  });

  document.getElementById('bulk-assignee-sel').addEventListener('change', e => {
    const assigneeId = e.target.value ? parseInt(e.target.value, 10) : null;
    if (!e.target.value) return;
    AppState.selectedTasks.forEach(id => {
      const t = getTask(id);
      if (t) { t.assigneeId = assigneeId; }
    });
    saveToStorage();
    AppState.selectedTasks.clear();
    updateBulkBar();
    refreshAll();
    showToast(`Reassigned selected tasks`, 'success');
    e.target.value = '';
  });

  document.getElementById('bulk-delete-btn').addEventListener('click', () => {
    const count = AppState.selectedTasks.size;
    showConfirm(`Delete ${count} task(s)? This cannot be undone.`, () => {
      AppState.selectedTasks.forEach(id => {
        const t = getTask(id);
        if (t) pushUndo('task', {...t});
      });
      AppState.tasks = AppState.tasks.filter(t => !AppState.selectedTasks.has(t.id));
      AppState.selectedTasks.clear();
      saveToStorage();
      updateBulkBar();
      refreshAll();
      showToast(`${count} task(s) deleted`, 'info');
    });
  });

  // ---- Sidebar collapse / expand ----
  document.getElementById('sidebar-collapse-btn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('collapsed');
    document.getElementById('sidebar-expand-btn').classList.remove('hidden');
    AppState.sidebarCollapsed = true;
    saveToStorage();
  });
  document.getElementById('sidebar-expand-btn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('collapsed');
    document.getElementById('sidebar-expand-btn').classList.add('hidden');
    AppState.sidebarCollapsed = false;
    saveToStorage();
  });

  // ---- Overlay click → close panel ----
  document.getElementById('overlay').addEventListener('click', closeDetailPanel);
  document.getElementById('panel-close').addEventListener('click', closeDetailPanel);

  // ---- Panel expand / fullscreen toggle ----
  document.getElementById('panel-expand').addEventListener('click', () => {
    const panel = document.getElementById('detail-panel');
    const isFs  = panel.classList.toggle('fullscreen');
    document.getElementById('panel-expand').title       = isFs ? 'Exit fullscreen (F)' : 'Expand (F)';
    document.getElementById('panel-expand').textContent = isFs ? '⛶' : '⛶';
    document.getElementById('panel-expand').setAttribute('aria-label', isFs ? 'Exit fullscreen' : 'Expand to fullscreen');
  });

  // ---- Modal close / cancel ----
  document.getElementById('modal-close').addEventListener('click', closeTaskModal);
  document.getElementById('modal-cancel').addEventListener('click', closeTaskModal);

  // ---- Modal overlay background click ----
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeTaskModal();
  });

  // ---- Modal save ----
  document.getElementById('modal-save').addEventListener('click', saveTaskFromModal);

  // ---- Modal delete ----
  document.getElementById('modal-delete').addEventListener('click', () => {
    const editId = parseInt(document.getElementById('edit-task-id').value, 10);
    if (editId) {
    showConfirm(`Delete TM-${editId}? This cannot be undone.`, () => {
        deleteTask(editId);
        closeTaskModal();
      });
    }
  });

  // ---- Labels input in modal ----
  document.getElementById('labels-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = e.target.value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
      if (val && !modalLabels.includes(val) && modalLabels.length < 8) {
        modalLabels.push(val);
        renderModalLabels();
        buildLabelFilterMenu();
      }
      e.target.value = '';
    }

    if (e.key === 'Backspace' && e.target.value === '' && modalLabels.length > 0) {
      modalLabels.pop();
      renderModalLabels();
    }
  });

  // ---- Label tag removal ----
  document.getElementById('labels-wrap').addEventListener('click', e => {
    const removeBtn = e.target.closest('.remove-label');
    if (removeBtn) {
      const idx = parseInt(removeBtn.dataset.index, 10);
      modalLabels.splice(idx, 1);
      renderModalLabels();
    }
  });

  // ---- Keyboard shortcuts ----
  document.addEventListener('keydown', handleKeyboard);

  // ---- Modal Enter key to save ----
  document.getElementById('task-modal').addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      saveTaskFromModal();
    }
  });


  // ---- Member modal events ----
  buildMemberModalPickers();

  document.getElementById('member-modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('member-modal-overlay')) closeMemberModal();
  });
  document.getElementById('member-modal-close').addEventListener('click', closeMemberModal);
  document.getElementById('member-modal-cancel').addEventListener('click', closeMemberModal);
  document.getElementById('member-modal-save').addEventListener('click', saveMemberFromModal);
  document.getElementById('member-modal-delete').addEventListener('click', () => {
    if (memberModalEditId) deleteMember(memberModalEditId);
  });
  document.getElementById('member-name-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); saveMemberFromModal(); }
  });

  // ---- Keyboard navigation for cards ----
  document.getElementById('content').addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('.task-card');
      if (card) {
        e.preventDefault();
        openTaskDetail(parseInt(card.dataset.id, 10));
      }
    }
  });

  // ---- Keyboard Shortcuts overlay ----
  document.getElementById('shortcuts-close').addEventListener('click', () => {
    document.getElementById('shortcuts-overlay').classList.remove('visible');
  });
  document.getElementById('shortcuts-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('shortcuts-overlay'))
      document.getElementById('shortcuts-overlay').classList.remove('visible');
  });

  // ---- Template dropdown ----
  document.getElementById('template-pick-btn').addEventListener('click', e => {
    e.stopPropagation();
    renderTemplateDropdown();
    document.getElementById('template-dropdown').classList.toggle('hidden');
  });

  document.getElementById('template-dropdown').addEventListener('click', e => {
    const item = e.target.closest('.template-item');
    if (!item) return;
    const tplId = parseInt(item.dataset.tplId, 10);
    const tpl = AppState.templates.find(t => t.id === tplId);
    if (tpl) {
      document.getElementById('template-dropdown').classList.add('hidden');
      applyTemplate(tpl);
    }
  });

  // ---- Mobile bottom nav ----
  document.querySelectorAll('#mobile-bottom-nav .mob-nav-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
      document.querySelectorAll('#mobile-bottom-nav .mob-nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  document.getElementById('mob-new-task-btn').addEventListener('click', () => openTaskModal(null));
}

/* ============================================================
   CUSTOM CONFIRM DIALOG
   ============================================================ */

function showConfirm(message, onConfirm, { confirmLabel = 'Delete', danger = true } = {}) {
  const overlay = document.getElementById('confirm-overlay');
  document.getElementById('confirm-message').textContent = message;
  const confirmBtn = document.getElementById('confirm-ok');
  confirmBtn.textContent = confirmLabel;
  confirmBtn.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;

  overlay.classList.add('visible');

  const close = () => overlay.classList.remove('visible');

  const handleOk = () => { close(); onConfirm(); cleanup(); };
  const handleCancel = () => { close(); cleanup(); };

  function cleanup() {
    confirmBtn.removeEventListener('click', handleOk);
    document.getElementById('confirm-cancel').removeEventListener('click', handleCancel);
    overlay.removeEventListener('click', handleBg);
  }
  const handleBg = e => { if (e.target === overlay) handleCancel(); };

  confirmBtn.addEventListener('click', handleOk);
  document.getElementById('confirm-cancel').addEventListener('click', handleCancel);
  overlay.addEventListener('click', handleBg);
}



// Returns HTML for member avatar — photo if available, else emoji
function avatarHtml(m, size = 'md') {
  const s = size === 'sm' ? '20px' : size === 'lg' ? '36px' : '26px';
  if (m && m.photo) {
    return `<img src="${m.photo}" alt="${escapeHtml(m.name)}" style="width:${s};height:${s};border-radius:50%;object-fit:cover;display:inline-block;" />`;
  }
  return m ? escapeHtml(m.avatar) : '👤';
}

const AVATAR_OPTIONS = ['👨‍💻','👩‍💻','👨‍💼','👩‍💼','👨‍🎨','👩‍🎨','🧑‍🔬','👨‍🔬','👩‍🔬','🧑‍💻','👷','🧑‍🎤','👨‍🚀','👩‍🚀','🦸','🧙','🐱‍👤'];
const COLOR_OPTIONS  = ['#6366f1','#ec4899','#f59e0b','#22c55e','#06b6d4','#ef4444','#8b5cf6','#14b8a6','#f97316','#84cc16'];

let memberModalMode = 'add'; // 'add' | 'edit'
let memberModalEditId = null;

function openMemberModal(memberId = null) {
  memberModalMode   = memberId ? 'edit' : 'add';
  memberModalEditId = memberId;

  const overlay = document.getElementById('member-modal-overlay');
  const titleEl = document.getElementById('member-modal-title');
  const nameEl  = document.getElementById('member-name-input');
  const saveBtn = document.getElementById('member-modal-save');
  const delBtn  = document.getElementById('member-modal-delete');

  // Reset
  nameEl.value = '';
  document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
  resetPhotoPreview(null);

  if (memberId) {
    const m = getTeamMember(memberId);
    if (!m) return;
    titleEl.textContent = 'Edit Member';
    saveBtn.textContent = 'Save Changes';
    delBtn.classList.remove('hidden');
    nameEl.value = m.name;
    if (m.photo) {
      setPhotoPreview(m.photo);
    } else {
      const avatarEl = document.querySelector(`.avatar-option[data-avatar="${CSS.escape(m.avatar)}"]`);
      if (avatarEl) avatarEl.classList.add('selected');
    }
    const colorEl = document.querySelector(`.color-option[data-color="${CSS.escape(m.color)}"]`);
    if (colorEl) colorEl.classList.add('selected');
  } else {
    titleEl.textContent = 'Add Member';
    saveBtn.textContent = 'Add Member';
    delBtn.classList.add('hidden');
    const firstAvatar = document.querySelector('.avatar-option');
    const firstColor  = document.querySelector('.color-option');
    if (firstAvatar) firstAvatar.classList.add('selected');
    if (firstColor)  firstColor.classList.add('selected');
  }

  overlay.classList.add('visible');
  overlay.setAttribute('aria-hidden', 'false');
  setTimeout(() => nameEl.focus(), 80);
}

function closeMemberModal() {
  document.getElementById('member-modal-overlay').classList.remove('visible');
  document.getElementById('member-modal-overlay').setAttribute('aria-hidden', 'true');
}

function saveMemberFromModal() {
  const name = document.getElementById('member-name-input').value.trim();
  if (!name) {
    document.getElementById('member-name-input').style.borderColor = 'var(--clr-high)';
    setTimeout(() => { document.getElementById('member-name-input').style.borderColor = ''; }, 1500);
    showToast('Name is required', 'error');
    return;
  }

  const selectedAvatar = document.querySelector('.avatar-option.selected');
  const selectedColor  = document.querySelector('.color-option.selected');
  const avatar = selectedAvatar ? selectedAvatar.dataset.avatar : '👤';
  const color  = selectedColor  ? selectedColor.dataset.color   : '#6366f1';
  const photo  = getCurrentPhoto(); // base64 or null

  if (memberModalMode === 'edit' && memberModalEditId) {
    const m = getTeamMember(memberModalEditId);
    if (m) {
      m.name   = name;
      m.avatar = avatar;
      m.color  = color;
      m.photo  = photo;
      showToast(`${name} updated`, 'success');
    }
  } else {
    const newId = AppState.nextMemberId++;
    AppState.team.push({ id: newId, name, avatar, color, photo });
    showToast(`${name} added to team`, 'success');
  }

  saveToStorage();
  closeMemberModal();
  refreshAll();
}

function deleteMember(memberId) {
  const m = getTeamMember(memberId);
  if (!m) return;
  showConfirm(`Remove ${m.name} from the team? They will be unassigned from all tasks.`, () => {
    AppState.team = AppState.team.filter(t => t.id !== memberId);
    AppState.tasks.forEach(t => { if (t.assigneeId === memberId) t.assigneeId = null; });
    saveToStorage();
    closeMemberModal();
    refreshAll();
    showToast(`${m.name} removed`, 'info');
  }, { confirmLabel: 'Remove', danger: true });
}

function resetPhotoPreview(existingPhoto) {
  const emojiEl = document.getElementById('photo-preview-emoji');
  const imgEl   = document.getElementById('photo-preview-img');
  const removeBtn = document.getElementById('photo-remove-btn');
  const fileInput = document.getElementById('photo-file-input');
  if (fileInput) fileInput.value = '';
  if (existingPhoto) {
    setPhotoPreview(existingPhoto);
  } else {
    if (imgEl)   { imgEl.src = ''; imgEl.classList.add('hidden'); }
    if (emojiEl) emojiEl.classList.remove('hidden');
    if (removeBtn) removeBtn.classList.add('hidden');
  }
}

function setPhotoPreview(src) {
  const emojiEl   = document.getElementById('photo-preview-emoji');
  const imgEl     = document.getElementById('photo-preview-img');
  const removeBtn = document.getElementById('photo-remove-btn');
  if (!imgEl) return;
  imgEl.src = src;
  imgEl.classList.remove('hidden');
  if (emojiEl) emojiEl.classList.add('hidden');
  if (removeBtn) removeBtn.classList.remove('hidden');
}

function getCurrentPhoto() {
  const imgEl = document.getElementById('photo-preview-img');
  if (imgEl && !imgEl.classList.contains('hidden') && imgEl.src && imgEl.src !== window.location.href) {
    return imgEl.src;
  }
  return null;
}

function buildMemberModalPickers() {
  const avatarWrap = document.getElementById('avatar-picker');
  const colorWrap  = document.getElementById('color-picker');

  avatarWrap.innerHTML = AVATAR_OPTIONS.map(a =>
    `<button class="avatar-option" data-avatar="${escapeHtml(a)}" type="button" title="${a}">${a}</button>`
  ).join('');

  colorWrap.innerHTML = COLOR_OPTIONS.map(c =>
    `<button class="color-option" data-color="${escapeHtml(c)}" type="button" style="background:${escapeHtml(c)}"></button>`
  ).join('');

  // Picker events
  avatarWrap.addEventListener('click', e => {
    const btn = e.target.closest('.avatar-option');
    if (!btn) return;
    // Selecting emoji clears photo
    resetPhotoPreview(null);
    avatarWrap.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });

  colorWrap.addEventListener('click', e => {
    const btn = e.target.closest('.color-option');
    if (!btn) return;
    colorWrap.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });

  // Photo upload
  const fileInput = document.getElementById('photo-file-input');
  const removeBtn = document.getElementById('photo-remove-btn');
  const emojiEl   = document.getElementById('photo-preview-emoji');

  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setPhotoPreview(ev.target.result);
      // Deselect emoji picker when photo chosen
      avatarWrap.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
      // Update preview emoji to show photo
      if (emojiEl) emojiEl.textContent = '📷';
    };
    reader.readAsDataURL(file);
  });

  removeBtn.addEventListener('click', () => {
    resetPhotoPreview(null);
    // Re-select first emoji
    const firstAvatar = avatarWrap.querySelector('.avatar-option');
    if (firstAvatar) firstAvatar.classList.add('selected');
  });
}

/* ============================================================
   DEPENDENCIES
   ============================================================ */

function renderDepsHtml(task) {
  const blocks = (task.dependencies || []).map(id => {
    const t = getTask(id);
    return t ? `<div class="dep-item"><span class="dep-badge blocks">blocks</span> <span class="dep-title">TM-${t.id}: ${escapeHtml(t.title)}</span> <button class="dep-remove-btn btn-icon" data-type="blocks" data-id="${t.id}">✕</button></div>` : '';
  }).join('');
  const blockedBy = (task.blockedBy || []).map(id => {
    const t = getTask(id);
    return t ? `<div class="dep-item"><span class="dep-badge blockedby">blocked by</span> <span class="dep-title">TM-${t.id}: ${escapeHtml(t.title)}</span> <button class="dep-remove-btn btn-icon" data-type="blockedBy" data-id="${t.id}">✕</button></div>` : '';
  }).join('');
  return blocks + blockedBy || '<span class="deps-empty">No dependencies</span>';
}

function renderDepsSection(task) {
  return `
    <div class="panel-section" id="deps-section">
      <div class="panel-section-label-row">
        <span class="panel-section-label">Dependencies</span>
        <button class="btn-icon" id="deps-add-btn" title="Add dependency">＋</button>
      </div>
      <div class="deps-list" id="deps-list-${task.id}">
        ${renderDepsHtml(task)}
      </div>
      <div class="deps-add-form hidden" id="deps-form-${task.id}">
        <select class="deps-sel" id="deps-sel-${task.id}">
          <option value="">Select relationship…</option>
          <option value="blocks">This task blocks…</option>
          <option value="blockedBy">This task blocked by…</option>
        </select>
        <select class="deps-task-sel" id="deps-task-sel-${task.id}">
          <option value="">Select task…</option>
          ${AppState.tasks.filter(t => t.id !== task.id && !t.parentId).map(t => `<option value="${t.id}">TM-${t.id}: ${escapeHtml(t.title)}</option>`).join('')}
        </select>
        <div class="subtask-form-actions">
          <button class="btn btn-primary btn-sm" id="deps-save-${task.id}">Add</button>
          <button class="btn btn-secondary btn-sm" id="deps-cancel-${task.id}">Cancel</button>
        </div>
      </div>
    </div>`;
}

function attachDepsEvents(taskId) {
  const depsSection = document.getElementById('deps-section');
  if (!depsSection) return;

  const addBtn = document.getElementById('deps-add-btn');
  const form = document.getElementById(`deps-form-${taskId}`);

  addBtn.addEventListener('click', () => {
    form.classList.toggle('hidden');
  });

  document.getElementById(`deps-cancel-${taskId}`).addEventListener('click', () => {
    form.classList.add('hidden');
  });

  document.getElementById(`deps-save-${taskId}`).addEventListener('click', () => {
    const relType = document.getElementById(`deps-sel-${taskId}`).value;
    const targetId = parseInt(document.getElementById(`deps-task-sel-${taskId}`).value, 10);
    if (!relType || !targetId) return;
    const task = getTask(taskId);
    if (!task) return;
    if (relType === 'blocks') {
      task.dependencies = task.dependencies || [];
      if (!task.dependencies.includes(targetId)) task.dependencies.push(targetId);
    } else {
      task.blockedBy = task.blockedBy || [];
      if (!task.blockedBy.includes(targetId)) task.blockedBy.push(targetId);
    }
    saveToStorage();
    refreshAll();
    rerenderDeps(taskId);
    form.classList.add('hidden');
    showToast('Dependency added', 'success');
  });

  depsSection.addEventListener('click', e => {
    const removeBtn = e.target.closest('.dep-remove-btn');
    if (!removeBtn) return;
    const task = getTask(taskId);
    if (!task) return;
    const depType = removeBtn.dataset.type;
    const depId = parseInt(removeBtn.dataset.id, 10);
    if (depType === 'blocks') {
      task.dependencies = (task.dependencies || []).filter(id => id !== depId);
    } else {
      task.blockedBy = (task.blockedBy || []).filter(id => id !== depId);
    }
    saveToStorage();
    refreshAll();
    rerenderDeps(taskId);
    showToast('Dependency removed', 'info');
  });
}

function rerenderDeps(taskId) {
  const listEl = document.getElementById(`deps-list-${taskId}`);
  if (!listEl) return;
  const task = getTask(taskId);
  if (!task) return;
  listEl.innerHTML = renderDepsHtml(task);
}

/* ============================================================
   SUBTASKS
   ============================================================ */

function renderSubtasksSection(task) {
  const subtasks = AppState.tasks.filter(t => t.parentId === task.id);
  const done     = subtasks.filter(t => t.status === 'done').length;
  const pct      = subtasks.length ? Math.round((done / subtasks.length) * 100) : 0;

  const listHtml = subtasks.map(st => {
    const assignee = getTeamMember(st.assigneeId);
    return `
      <div class="subtask-item" data-id="${st.id}">
        <input type="checkbox" class="subtask-check" data-id="${st.id}" ${st.status === 'done' ? 'checked' : ''} />
        <div class="subtask-body">
          <span class="subtask-title ${st.status === 'done' ? 'done' : ''}">${escapeHtml(st.title)}</span>
          ${st.description ? `<span class="subtask-desc">${escapeHtml(st.description)}</span>` : ''}
        </div>
        <span class="subtask-status">${statusPillHtml(st.status)}</span>
        ${assignee
          ? `<span class="subtask-assignee" title="${escapeHtml(assignee.name)}">${avatarHtml(assignee, 'sm')}</span>`
          : `<span class="subtask-assignee subtask-unassigned" title="Unassigned">👤</span>`}
        <button class="subtask-open-btn" data-id="${st.id}" title="Open">↗</button>
        <button class="subtask-delete-btn" data-id="${st.id}" title="Delete">✕</button>
      </div>`;
  }).join('');

  const progressBar = subtasks.length ? `
    <div class="subtask-progress">
      <div class="subtask-progress-fill" style="width:${pct}%"></div>
    </div>
    <span class="subtask-progress-label">${done}/${subtasks.length}</span>` : '';

  // Assignee options for new subtask form
  const assigneeOpts = `<option value="">Unassigned</option>` +
    AppState.team.map(m => `<option value="${m.id}">${m.avatar} ${m.name}</option>`).join('');

  // Existing tasks that are not already subtasks of this task and not this task itself
  const linkable = AppState.tasks.filter(t => t.id !== task.id && !t.parentId && t.parentId !== task.id);
  const linkOpts = linkable.length
    ? linkable.map(t => `<option value="${t.id}">TM-${t.id}: ${escapeHtml(t.title)}</option>`).join('')
    : `<option disabled>No tasks available</option>`;

  return `
    <div class="panel-section" id="subtasks-section">
      <div class="panel-section-label-row">
        <span class="panel-section-label">Subtasks</span>
        ${progressBar}
        <button class="subtask-add-trigger btn-icon" id="subtask-add-trigger" title="Add subtask">＋</button>
      </div>

      <div class="subtasks-list">${listHtml}</div>

      <!-- New subtask card form (hidden by default) -->
      <div class="subtask-form hidden" id="subtask-form-${task.id}">
        <div class="subtask-form-card">
          <div class="subtask-form-top">
            <span class="subtask-type-badge">↳ Subtask</span>
            <button class="subtask-form-close btn-icon" id="subtask-cancel-${task.id}" title="Cancel">✕</button>
          </div>
          <input class="subtask-name-input" id="subtask-name-${task.id}" placeholder="Name this subtask…" autocomplete="off" />
          <textarea class="subtask-desc-input" id="subtask-desc-${task.id}" placeholder="Add a description…" rows="2"></textarea>
          <div class="subtask-form-meta">
            <div class="subtask-meta-field">
              <span class="subtask-meta-label">👤 Assignee</span>
              <select class="subtask-assignee-sel" id="subtask-assignee-${task.id}">${assigneeOpts}</select>
            </div>
            <div class="subtask-meta-field">
              <span class="subtask-meta-label">📋 Status</span>
              <select class="subtask-status-sel" id="subtask-status-${task.id}">
                ${COLUMNS.map(c => `<option value="${c.id}">${c.label}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="subtask-form-actions">
            <button class="btn btn-primary btn-sm" id="subtask-save-${task.id}">
              <span>⏎</span> Create subtask
            </button>
            <span class="subtask-form-hint">or Ctrl+Enter</span>
          </div>
        </div>
      </div>

      <!-- Link existing task form (hidden by default) -->
      <div class="subtask-link-form hidden" id="subtask-link-form-${task.id}">
        <div class="subtask-form-card">
          <div class="subtask-form-top">
            <span class="subtask-type-badge">🔗 Link existing task</span>
            <button class="btn-icon" id="subtask-link-cancel-${task.id}">✕</button>
          </div>
          <select class="subtask-link-sel" id="subtask-link-sel-${task.id}" size="5">${linkOpts}</select>
          <div class="subtask-form-actions">
            <button class="btn btn-primary btn-sm" id="subtask-link-save-${task.id}">Link as subtask</button>
          </div>
        </div>
      </div>

      <div class="subtask-footer-row" id="subtask-footer-${task.id}">
        <button class="subtask-choose-existing" id="subtask-choose-existing-${task.id}">🔗 Link existing task</button>
      </div>
    </div>`;
}

function attachSubtaskEvents(taskId) {
  const section = document.getElementById('subtasks-section');
  if (!section) return;

  const form       = document.getElementById(`subtask-form-${taskId}`);
  const linkForm   = document.getElementById(`subtask-link-form-${taskId}`);
  const footerRow  = document.getElementById(`subtask-footer-${taskId}`);
  const nameInput  = document.getElementById(`subtask-name-${taskId}`);

  // Show form on ＋ click
  document.getElementById('subtask-add-trigger').addEventListener('click', () => {
    form.classList.remove('hidden');
    linkForm.classList.add('hidden');
    footerRow.classList.remove('hidden');
    nameInput.focus();
  });

  // Cancel form
  document.getElementById(`subtask-cancel-${taskId}`).addEventListener('click', () => {
    form.classList.add('hidden');
    nameInput.value = '';
    document.getElementById(`subtask-desc-${taskId}`).value = '';
  });

  // Save new subtask
  document.getElementById(`subtask-save-${taskId}`).addEventListener('click', () => saveNewSubtask(taskId));
  nameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveNewSubtask(taskId);
    if (e.key === 'Escape') document.getElementById(`subtask-cancel-${taskId}`).click();
  });

  // Show link existing form
  document.getElementById(`subtask-choose-existing-${taskId}`).addEventListener('click', () => {
    linkForm.classList.remove('hidden');
    form.classList.add('hidden');
  });

  document.getElementById(`subtask-link-cancel-${taskId}`).addEventListener('click', () => {
    linkForm.classList.add('hidden');
  });

  document.getElementById(`subtask-link-save-${taskId}`).addEventListener('click', () => {
    const sel = document.getElementById(`subtask-link-sel-${taskId}`);
    const selId = parseInt(sel.value, 10);
    if (!selId) return;
    const t = getTask(selId);
    if (!t) return;
    t.parentId = taskId;
    saveToStorage();
    refreshAll();
    rerenderSubtasks(taskId);
    showToast(`TM-${selId} linked as subtask`, 'success');
  });

  // Checkbox toggle
  section.addEventListener('change', e => {
    const cb = e.target.closest('.subtask-check');
    if (!cb) return;
    const st = getTask(parseInt(cb.dataset.id, 10));
    if (!st) return;
    const prev = st.status;
    st.status = cb.checked ? 'done' : 'todo';
    logActivity(st, 'status', { from: prev, to: st.status });
    saveToStorage();
    refreshAll();
    rerenderSubtasks(taskId);
  });

  // Click actions on subtask items
  section.addEventListener('click', e => {
    if (e.target.closest('.subtask-open-btn, .subtask-title, .subtask-body')) {
      const item = e.target.closest('.subtask-item');
      if (item) { openTaskDetail(parseInt(item.dataset.id, 10)); return; }
    }
    const delBtn = e.target.closest('.subtask-delete-btn');
    if (delBtn) {
      const stId = parseInt(delBtn.dataset.id, 10);
      showConfirm('Delete this subtask?', () => {
        const stTask = getTask(stId);
        if (stTask) pushUndo('task', {...stTask});
        AppState.tasks = AppState.tasks.filter(t => t.id !== stId);
        saveToStorage();
        refreshAll();
        rerenderSubtasks(taskId);
      });
    }
  });
}

function saveNewSubtask(taskId) {
  const nameInput = document.getElementById(`subtask-name-${taskId}`);
  const title = nameInput.value.trim();
  if (!title) { nameInput.focus(); return; }

  const desc     = document.getElementById(`subtask-desc-${taskId}`).value.trim();
  const assignee = document.getElementById(`subtask-assignee-${taskId}`).value;
  const status   = document.getElementById(`subtask-status-${taskId}`).value;
  const newId    = AppState.nextId++;

  AppState.tasks.push({
    id:          newId,
    title,
    description: desc,
    status,
    priority:    'medium',
    assigneeId:  assignee ? parseInt(assignee, 10) : null,
    dueDate:     null,
    labels:      [],
    points:      null,
    inSprint:    false,
    parentId:    taskId,
    activity:    [{ type: 'created', memberId: AppState.team[0]?.id || 1, timestamp: new Date().toISOString().split('T')[0] }],
  });

  saveToStorage();
  refreshAll();
  rerenderSubtasks(taskId);
  showToast(`Subtask TM-${newId} created`, 'success');
}

function rerenderSubtasks(taskId) {
  const section = document.getElementById('subtasks-section');
  if (!section) return;
  const task = getTask(taskId);
  if (!task) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = renderSubtasksSection(task);
  const newSection = tmp.querySelector('#subtasks-section');
  if (newSection) {
    section.replaceWith(newSection);
    attachSubtaskEvents(taskId);
  }
}

/* ============================================================
   COMMENTS & @MENTION
   ============================================================ */

function renderCommentSection(taskId) {
  const task = getTask(taskId);
  if (!task) return '';

  const comments = (task.activity || []).filter(a => a.type === 'comment');

  const commentsHtml = comments.slice().reverse().map(c => {
    const m = getTeamMember(c.memberId);
    const textWithMentions = escapeHtml(c.text).replace(/@([^\s]+(?:\s[^\s@]+)?)/g, (match, name) => {
      const found = AppState.team.find(tm => tm.name === name || tm.name.split(' ')[0] === name);
      return found ? `<span class="mention-tag">${escapeHtml(match)}</span>` : escapeHtml(match);
    });
    return `
      <div class="comment-item" data-comment-ts="${escapeHtml(c.timestamp)}">
        <div class="comment-avatar">${m ? avatarHtml(m) : '👤'}</div>
        <div class="comment-body">
          <div class="comment-meta">
            <strong>${m ? escapeHtml(m.name) : 'Unknown'}</strong>
            <span class="comment-time">${timeAgo(c.timestamp)}</span>
          </div>
          <div class="comment-text">${textWithMentions}</div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="panel-section" id="comments-section">
      <div class="panel-section-label">Comments (${comments.length})</div>
      <div class="comment-input-wrap">
        <div class="comment-input-avatar">${AppState.team[0] ? escapeHtml(AppState.team[0].avatar) : '👤'}</div>
        <div class="comment-editor-wrap">
          <div
            class="comment-input"
            id="comment-input-${taskId}"
            contenteditable="true"
            data-placeholder="Write a comment… use @ to mention someone"
            role="textbox"
            aria-multiline="true"
            aria-label="Write a comment"
          ></div>
          <div class="mention-dropdown hidden" id="mention-dropdown-${taskId}"></div>
          <div class="comment-actions">
            <button class="btn btn-primary btn-sm" id="comment-submit-${taskId}">Post</button>
          </div>
        </div>
      </div>
      ${commentsHtml ? `<div class="comments-list">${commentsHtml}</div>` : '<p class="no-comments">No comments yet. Be the first!</p>'}
    </div>
  `;
}

function attachCommentEvents(taskId) {
  const inputEl   = document.getElementById(`comment-input-${taskId}`);
  const submitBtn = document.getElementById(`comment-submit-${taskId}`);
  const dropdown  = document.getElementById(`mention-dropdown-${taskId}`);
  if (!inputEl || !submitBtn) return;

  let mentionStart = -1;

  inputEl.addEventListener('input', () => {
    const text  = inputEl.textContent;
    const caret = getCaretPosition(inputEl);

    // Check if we're in a @mention context
    const before = text.slice(0, caret);
    const atIdx  = before.lastIndexOf('@');

    if (atIdx !== -1 && (atIdx === 0 || /\s/.test(before[atIdx - 1]))) {
      const query = before.slice(atIdx + 1).toLowerCase();
      const matches = AppState.team.filter(m =>
        m.name.toLowerCase().includes(query) || m.name.split(' ')[0].toLowerCase().startsWith(query)
      );
      if (matches.length > 0 && query.length >= 0) {
        mentionStart = atIdx;
        showMentionDropdown(dropdown, inputEl, matches, taskId);
        return;
      }
    }
    hideMentionDropdown(dropdown);
    mentionStart = -1;
  });

  inputEl.addEventListener('keydown', e => {
    if (!dropdown.classList.contains('hidden')) {
      if (e.key === 'ArrowDown') { e.preventDefault(); moveMentionSelection(dropdown, 1); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); moveMentionSelection(dropdown, -1); return; }
      if (e.key === 'Enter' || e.key === 'Tab') {
        const sel = dropdown.querySelector('.mention-item.active');
        if (sel) { e.preventDefault(); insertMention(inputEl, dropdown, sel.dataset.name, mentionStart); return; }
      }
      if (e.key === 'Escape') { hideMentionDropdown(dropdown); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey && dropdown.classList.contains('hidden')) {
      e.preventDefault();
      postComment(taskId, inputEl, dropdown);
    }
  });

  submitBtn.addEventListener('click', () => postComment(taskId, inputEl, dropdown));

  dropdown.addEventListener('mousedown', e => {
    const item = e.target.closest('.mention-item');
    if (item) {
      e.preventDefault();
      insertMention(inputEl, dropdown, item.dataset.name, mentionStart);
    }
  });
}

function showMentionDropdown(dropdown, inputEl, matches, taskId) {
  dropdown.innerHTML = matches.map((m, i) =>
    `<div class="mention-item${i === 0 ? ' active' : ''}" data-id="${m.id}" data-name="${escapeHtml(m.name)}">
      <span class="mention-avatar">${m.photo ? `<img src="${m.photo}" style="width:18px;height:18px;border-radius:50%;object-fit:cover;vertical-align:middle;" />` : escapeHtml(m.avatar)}</span>
      <span class="mention-name">${escapeHtml(m.name)}</span>
    </div>`
  ).join('');
  dropdown.classList.remove('hidden');
}

function hideMentionDropdown(dropdown) {
  dropdown.classList.add('hidden');
  dropdown.innerHTML = '';
}

function moveMentionSelection(dropdown, dir) {
  const items = [...dropdown.querySelectorAll('.mention-item')];
  const curr  = items.findIndex(i => i.classList.contains('active'));
  items[curr]?.classList.remove('active');
  const next = (curr + dir + items.length) % items.length;
  items[next]?.classList.add('active');
}

function insertMention(inputEl, dropdown, name, atPos) {
  const text   = inputEl.textContent;
  const before = text.slice(0, atPos);
  const after  = text.slice(getCaretPosition(inputEl));

  // Replace the @query with @Name and a space
  inputEl.textContent = before + '@' + name + ' ' + after;
  // Move caret to end of inserted mention
  const newPos = (before + '@' + name + ' ').length;
  setCaretPosition(inputEl, newPos);
  hideMentionDropdown(dropdown);
}

function getCaretPosition(el) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return 0;
  const range = sel.getRangeAt(0).cloneRange();
  range.selectNodeContents(el);
  range.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset);
  return range.toString().length;
}

function setCaretPosition(el, pos) {
  const range = document.createRange();
  const sel   = window.getSelection();
  let node = el.firstChild;
  if (!node) { el.focus(); return; }
  pos = Math.min(pos, node.textContent.length);
  range.setStart(node, pos);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
  el.focus();
}

function postComment(taskId, inputEl, dropdown) {
  const text = inputEl.textContent.trim();
  if (!text) return;

  const task = getTask(taskId);
  if (!task) return;

  hideMentionDropdown(dropdown);
  if (!task.activity) task.activity = [];
  task.activity.push({
    type:      'comment',
    text:      text,
    memberId:  AppState.team[0]?.id || 1,
    timestamp: new Date().toISOString().split('T')[0],
  });

  saveToStorage();
  inputEl.textContent = '';

  // Re-render comment section in place
  const section = document.getElementById('comments-section');
  if (section) {
    const newHtml = renderCommentSection(taskId);
    const tmp = document.createElement('div');
    tmp.innerHTML = newHtml;
    const newSection = tmp.querySelector('#comments-section');
    if (newSection) {
      section.replaceWith(newSection);
      attachCommentEvents(taskId);
    }
  }
  updateBadges();
  showToast('Comment posted', 'success');
}

/* ============================================================
   TASK TEMPLATES
   ============================================================ */

function saveTaskAsTemplate(taskId) {
  const task = getTask(taskId);
  if (!task) return;
  const name = task.title.slice(0, 40);
  AppState.templates.push({
    id: Date.now(),
    name,
    description: task.description || '',
    priority: task.priority,
    labels: [...(task.labels || [])],
    points: task.points,
  });
  saveToStorage();
  showToast('Saved as template', 'success');
}

function applyTemplate(tpl) {
  openTaskModal(null);
  setTimeout(() => {
    document.getElementById('field-title').value = tpl.name;
    document.getElementById('field-desc').value = tpl.description;
    document.getElementById('field-priority').value = tpl.priority;
    document.getElementById('field-points').value = tpl.points || '';
    modalLabels = [...(tpl.labels || [])];
    renderModalLabels();
  }, 100);
}

function renderTemplateDropdown() {
  const dd = document.getElementById('template-dropdown');
  if (!dd) return;
  if (AppState.templates.length === 0) {
    dd.innerHTML = '<div class="template-empty">No templates saved yet</div>';
  } else {
    dd.innerHTML = AppState.templates.map(tpl =>
      `<div class="template-item" data-tpl-id="${tpl.id}">📋 ${escapeHtml(tpl.name)}</div>`
    ).join('');
  }
}

/* ============================================================
   INIT
   ============================================================ */

function init() {
  const hasData = loadFromStorage();

  if (!hasData) {
    AppState.tasks        = [];
    AppState.team         = [];   // empty team
    AppState.nextId       = 1;
    AppState.nextMemberId = 1;
    saveToStorage();
  }

  setDarkMode(AppState.darkMode);

  // Restore sidebar collapsed state
  if (AppState.sidebarCollapsed) {
    document.getElementById('sidebar').classList.add('collapsed');
    document.getElementById('sidebar-expand-btn').classList.remove('hidden');
  }

  buildAssigneeFilterMenu();
  buildLabelFilterMenu();
  buildAssigneeModalOptions();
  renderTeamSidebar();
  updateBadges();

  attachEvents();
  switchView('board');

  console.log('LoyaltyAI initialized. Tasks:', AppState.tasks.length);
}

/* ============================================================
   START
   ============================================================ */

document.addEventListener('DOMContentLoaded', init);
