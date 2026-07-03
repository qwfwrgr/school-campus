// 🏫 校园端管理后台 — 主应用

const API = window.location.origin;
let appState = {
  user: null,
  page: 'dashboard',
  activitySinceId: 0,
  chatMessages: [],
};

// ─── Render Functions ───

function render() {
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');
  if (!token || !userData) {
    renderAuth();
    return;
  }
  appState.user = JSON.parse(userData);
  renderApp();
}

function renderAuth() {
  const hash = window.location.hash || '#login';
  document.getElementById('app').innerHTML = hash === '#register' ? getRegisterHtml() : getLoginHtml();
  bindAuthEvents();
}

function renderApp() {
  const hash = window.location.hash || '#dashboard';
  appState.page = hash.slice(1);
  const html = getLayoutHtml();
  document.getElementById('app').innerHTML = html;
  updateSidebarActive();
  loadPage();
  startActivityPoll();
}

function getLayoutHtml() {
  const u = appState.user || {};
  const pages = [
    { id: 'dashboard', icon: '🏠', label: '控制台' },
    { id: 'chat', icon: '🤖', label: 'AI 助手' },
    { id: 'classes', icon: '📋', label: '班级管理' },
    { id: 'courses', icon: '📚', label: '课程管理' },
    { id: 'checkin', icon: '📍', label: '签到管理' },
    { id: 'homework', icon: '📝', label: '作业管理' },
    { id: 'leaves', icon: '📋', label: '请假审批' },
    { id: 'announcements', icon: '📢', label: '公告管理' },
  ];
  const navItems = pages.map(p =>
    `<li><a href="#${p.id}" class="${appState.page === p.id ? 'active' : ''}" data-page="${p.id}">${p.icon} <span>${p.label}</span></a></li>`
  ).join('');

  return `
  <div class="app-layout">
    <nav class="sidebar">
      <div class="sidebar-brand">
        <h2>🏫 <span>校园端</span></h2>
        <small><span>教师管理后台</span></small>
      </div>
      <ul class="sidebar-nav">${navItems}</ul>
      <div class="sidebar-footer">
        <div class="user-info">${u.name || ''}</div>
        <div style="font-size:11px;opacity:0.5">${u.teacher_id || ''}</div>
        <a href="#" id="logoutBtn">🚪 退出登录</a>
      </div>
    </nav>
    <main class="main-content" id="mainContent">
      <div class="page-header">
        <div>
          <h1 id="pageTitle">加载中...</h1>
          <div class="subtitle" id="pageSubtitle"></div>
        </div>
        <div id="pageActions"></div>
      </div>
      <div id="pageContent"><div class="text-center" style="padding:60px"><div class="spinner"></div></div></div>
    </main>
  </div>`;
}

function updateSidebarActive() {
  document.querySelectorAll('.sidebar-nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === appState.page);
  });
}

// ─── Page Loading ───

function loadPage() {
  const titles = {
    dashboard: ['🏠 控制台', '校园数据概览'],
    chat: ['🤖 AI 助手', '通过对话完成所有管理操作'],
    classes: ['📋 班级管理', '创建和管理班级信息'],
    courses: ['📚 课程管理', '创建和管理课程信息'],
    checkin: ['📍 签到管理', '发起签到和查看签到记录'],
    homework: ['📝 作业管理', '发布作业和批改评分'],
    leaves: ['📋 请假审批', '审批学生请假申请'],
    announcements: ['📢 公告管理', '发布班级公告和全校公告'],
  };
  const [t, s] = titles[appState.page] || ['页面', ''];
  document.getElementById('pageTitle').textContent = t;
  document.getElementById('pageSubtitle').textContent = s;

  const actions = {
    classes: '<button class="btn btn-primary btn-sm" onclick="showCreateClassModal()">+ 新建班级</button>',
    courses: '<button class="btn btn-primary btn-sm" onclick="showCreateCourseModal()">+ 新建课程</button>',
    homework: '<button class="btn btn-primary btn-sm" onclick="showCreateHomeworkModal()">+ 发布作业</button>',
    announcements: '<button class="btn btn-primary btn-sm" onclick="showCreateAnnouncementModal()">+ 发布公告</button>',
    checkin: '<button class="btn btn-success btn-sm" onclick="showStartCheckinModal()">📌 发起签到</button>',
  };
  document.getElementById('pageActions').innerHTML = actions[appState.page] || '';

  const loaders = {
    dashboard: loadDashboard,
    chat: loadChat,
    classes: loadClasses,
    courses: loadCourses,
    checkin: loadCheckin,
    homework: loadHomework,
    leaves: loadLeaves,
    announcements: loadAnnouncements,
  };
  (loaders[appState.page] || (() => {}))();
}

// ─── Auth Pages ───

function getLoginHtml() {
  return `
  <div class="auth-page">
    <div class="auth-card">
      <h1>🏫 校园端</h1>
      <p class="subtitle">教师管理后台 · 登录</p>
      <form id="loginForm">
        <div class="form-group">
          <label>手机号 / 工号</label>
          <input type="text" id="loginAccount" placeholder="请输入手机号或工号" required>
        </div>
        <div class="form-group">
          <label>密码</label>
          <input type="password" id="loginPassword" placeholder="请输入密码" required>
        </div>
        <button type="submit" class="btn btn-primary">登 录</button>
      </form>
      <div class="auth-link">还没有账号？<a href="#register">立即注册</a></div>
    </div>
  </div>`;
}

function getRegisterHtml() {
  return `
  <div class="auth-page">
    <div class="auth-card">
      <h1>🏫 校园端</h1>
      <p class="subtitle">教师注册</p>
      <form id="registerForm">
        <div class="form-group">
          <label>姓名</label>
          <input type="text" id="regName" placeholder="请输入真实姓名" required>
        </div>
        <div class="form-group">
          <label>手机号</label>
          <input type="tel" id="regPhone" placeholder="请输入手机号" required>
        </div>
        <div class="form-group">
          <label>密码</label>
          <input type="password" id="regPassword" placeholder="请设置密码（至少6位）" minlength="6" required>
        </div>
        <button type="submit" class="btn btn-primary">注 册</button>
      </form>
      <div class="auth-link">已有账号？<a href="#login">去登录</a></div>
    </div>
  </div>`;
}

function bindAuthEvents() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const account = document.getElementById('loginAccount').value;
      const password = document.getElementById('loginPassword').value;
      const btn = loginForm.querySelector('button');
      btn.textContent = '登录中...'; btn.disabled = true;
      try {
        const res = await fetch('/api/login', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ account, password })
        });
        const data = await res.json();
        if (data.status === 'success') {
          localStorage.setItem('token', data.data.token);
          localStorage.setItem('user', JSON.stringify(data.data));
          showToast('✅', '登录成功', `欢迎回来，${data.data.name}`);
          render();
        } else {
          showToast('❌', '登录失败', data.msg);
        }
      } catch (err) {
        showToast('❌', '网络错误', '请检查服务器是否启动');
      }
      btn.textContent = '登 录'; btn.disabled = false;
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('regName').value;
      const phone = document.getElementById('regPhone').value;
      const password = document.getElementById('regPassword').value;
      const btn = registerForm.querySelector('button');
      btn.textContent = '注册中...'; btn.disabled = true;
      try {
        const res = await fetch('/api/register', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ name, phone, password })
        });
        const data = await res.json();
        if (data.status === 'success') {
          showToast('✅', '注册成功', `工号: ${data.data.teacher_id}，请保存！`);
          window.location.hash = '#login';
          render();
        } else {
          showToast('❌', '注册失败', data.msg);
        }
      } catch (err) {
        showToast('❌', '网络错误', '请检查服务器是否启动');
      }
      btn.textContent = '注 册'; btn.disabled = false;
    });
  }
}

// ─── Dashboard ───

async function loadDashboard() {
  try {
    const res = await fetch('/api/dashboard');
    const data = await res.json();
    if (data.status !== 'success') return;
    const d = data.data;
    document.getElementById('pageContent').innerHTML = `
    <div class="stat-cards">
      <div class="stat-card"><div class="stat-icon">👨‍🎓</div><div class="stat-value">${d.student_count}</div><div class="stat-label">学生总数</div></div>
      <div class="stat-card"><div class="stat-icon">📚</div><div class="stat-value">${d.course_count}</div><div class="stat-label">课程数</div></div>
      <div class="stat-card"><div class="stat-icon">📍</div><div class="stat-value">${d.today_checkins}</div><div class="stat-label">今日签到</div></div>
      <div class="stat-card"><div class="stat-icon">📋</div><div class="stat-value">${d.pending_leaves}</div><div class="stat-label">待审批请假</div></div>
    </div>
    <div class="card">
      <div class="card-header"><h3>⚡ 快捷操作</h3></div>
      <div class="flex gap-3" style="flex-wrap:wrap">
        <button class="btn btn-success" onclick="window.location.hash='#chat'">🤖 AI 助手对话</button>
        <button class="btn btn-primary" onclick="window.location.hash='#checkin'">📍 发起签到</button>
        <button class="btn btn-warning" onclick="window.location.hash='#leaves'">📋 审批请假</button>
        <button class="btn btn-secondary" onclick="window.location.hash='#homework'">📝 批改作业</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3>📖 使用说明</h3></div>
      <div style="font-size:14px;line-height:1.8;color:var(--text-body)">
        <p>🏫 <strong>校园端</strong> 是教师管理后台，通过 <strong>🤖 AI 助手</strong> 对话完成所有管理操作：</p>
        <ul style="padding-left:20px;margin-top:8px">
          <li>📋 创建/管理班级</li>
          <li>📚 创建/管理课程</li>
          <li>📍 发起签到（生成6位签到码）</li>
          <li>📝 发布作业/批改评分</li>
          <li>📋 审批学生请假</li>
          <li>📢 发布公告（全校/班级）</li>
          <li>📊 查看学生数据</li>
        </ul>
        <p style="margin-top:12px;color:var(--text-secondary)">💡 提示：点击左侧 <strong>AI 助手</strong> 开始对话，或直接点击快捷操作按钮。</p>
      </div>
    </div>`;
  } catch (err) {
    document.getElementById('pageContent').innerHTML = '<div class="card"><p style="color:var(--danger)">❌ 加载失败，请检查服务器连接</p></div>';
  }
}

// ─── Chat (AI Agent) ───

function loadChat() {
  document.getElementById('pageContent').innerHTML = `
  <div class="chat-layout">
    <div class="chat-main">
      <div class="chat-messages" id="chatMessages">
        <div class="chat-msg agent">
          👋 你好！我是 <strong>校园 AI 助手</strong>，可以通过对话帮你完成所有管理操作。<br>
          <small style="opacity:0.7">试试说：创建班级、发起签到、发布作业、查看课程...</small>
        </div>
      </div>
      <div class="chat-input-area">
        <input type="text" id="chatInput" placeholder="输入指令，比如：创建班级「高一(1)班」..." autofocus>
        <button class="btn btn-primary" id="chatSendBtn">发送</button>
      </div>
    </div>
    <div class="chat-side">
      <div class="chat-side-header">🔄 实时活动</div>
      <div class="chat-side-list" id="activityList">
        <div class="text-center text-sm text-muted" style="padding:20px">等待活动中...</div>
      </div>
    </div>
  </div>`;

  document.getElementById('chatSendBtn').addEventListener('click', sendChatMessage);
  document.getElementById('chatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
  setTimeout(() => document.getElementById('chatInput').focus(), 100);
}

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

  const container = document.getElementById('chatMessages');
  container.innerHTML += `<div class="chat-msg user">${escapeHtml(text)}</div>`;
  container.scrollTop = container.scrollHeight;
  input.value = '';

  const thinkingId = 'thinking-' + Date.now();
  container.innerHTML += `<div class="chat-msg agent" id="${thinkingId}"><div class="spinner" style="width:16px;height:16px"></div> 思考中...</div>`;
  container.scrollTop = container.scrollHeight;

  try {
    const result = await processCommand(text);
    document.getElementById(thinkingId).outerHTML = `<div class="chat-msg agent">${result}</div>`;
  } catch (err) {
    document.getElementById(thinkingId).outerHTML = `<div class="chat-msg agent" style="color:var(--danger)">❌ 出错了: ${escapeHtml(err.message)}</div>`;
  }
  container.scrollTop = container.scrollHeight;
}

async function processCommand(text) {
  // AI Agent command processing
  const cmds = [
    { match: /创建班级[「""]?(.+?)[」""]?/i, fn: async (m) => {
      const r = await apiPost('/api/classes', { name: m[1], grade: '' });
      return r.status === 'success' ? `✅ ${r.msg}` : `❌ ${r.msg}`;
    }},
    { match: /删除班级[「""]?(.+?)[」""]?/i, fn: async (m) => {
      const classes = await apiGet('/api/classes');
      const cls = classes.data.find(c => c.name.includes(m[1]));
      if (!cls) return `❌ 未找到班级「${m[1]}」`;
      const r = await apiDel('/api/classes/' + cls.id);
      return r.status === 'success' ? `✅ ${r.msg}` : `❌ ${r.msg}`;
    }},
    { match: /创建课程[「""]?(.+?)[」""]?\s*(.+?)?/i, fn: async (m) => {
      const r = await apiPost('/api/courses', { name: m[1], teacher_name: m[2] || '未指定', location: '', day_of_week: 1, start_time: '08:00', end_time: '09:40' });
      return r.status === 'success' ? `✅ ${r.msg}` : `❌ ${r.msg}`;
    }},
    { match: /发起签到/i, fn: async () => {
      const courses = await apiGet('/api/courses');
      if (!courses.data || courses.data.length === 0) return '❌ 暂无课程，请先创建课程';
      // Auto-start checkin for first course
      const r = await apiPost('/api/checkin/start', { course_id: courses.data[0].id });
      if (r.status === 'success') {
        return `✅ ${r.msg}<br><br><strong style="font-size:24px;padding:8px 20px;background:#EEF1FF;border-radius:8px;display:inline-block;margin:8px 0">${r.data.code}</strong><br>课程：${r.data.course_name}，有效期10分钟`;
      }
      return `❌ ${r.msg}`;
    }},
    { match: /发布作业[「""]?(.+?)[」""]?/i, fn: async (m) => {
      const courses = await apiGet('/api/courses');
      if (!courses.data || courses.data.length === 0) return '❌ 暂无课程，请先创建课程';
      const r = await apiPost('/api/homeworks', { title: m[1], course_id: courses.data[0].id, description: '', due_at: '' });
      return r.status === 'success' ? `✅ ${r.msg}` : `❌ ${r.msg}`;
    }},
    { match: /查看课程|课程列表/i, fn: async () => {
      const r = await apiGet('/api/courses');
      if (!r.data || r.data.length === 0) return '📚 暂无课程';
      const days = ['','周一','周二','周三','周四','周五','周六','周日'];
      const list = r.data.map(c => `• ${c.name} — ${days[c.day_of_week] || ''} ${c.start_time}-${c.end_time} ${c.location ? '@'+c.location : ''}`).join('<br>');
      return `📚 当前共有 ${r.data.length} 门课程：<br>${list}`;
    }},
    { match: /查看班级|班级列表/i, fn: async () => {
      const r = await apiGet('/api/classes');
      if (!r.data || r.data.length === 0) return '📋 暂无班级';
      const list = r.data.map(c => `• ${c.name}${c.grade ? ' ('+c.grade+')' : ''}`).join('<br>');
      return `📋 当前共有 ${r.data.length} 个班级：<br>${list}`;
    }},
    { match: /发布公告[「""]?(.+?)[」""]?\s*(.+)?/i, fn: async (m) => {
      const r = await apiPost('/api/announcements', { title: m[1], content: m[2] || '', scope: '全校' });
      return r.status === 'success' ? `✅ ${r.msg}` : `❌ ${r.msg}`;
    }},
    { match: /审批请假/i, fn: async () => {
      const r = await apiGet('/api/leaves');
      const pending = (r.data || []).filter(l => l.status === '待审批');
      if (pending.length === 0) return '📋 暂无待审批的请假申请';
      const list = pending.map(l => `• ${l.student_name} — ${l.course_name || '未指定课程'}<br>  原因: ${l.reason}<br>  <button class="btn btn-xs btn-success" onclick="approveLeave(${l.id},'已批准')">✅ 批准</button> <button class="btn btn-xs btn-danger" onclick="approveLeave(${l.id},'已拒绝')">❌ 拒绝</button>`).join('<br><br>');
      return `📋 待审批请假 (${pending.length})：<br>${list}`;
    }},
    { match: /查看签到|签到记录/i, fn: async () => {
      const r = await apiGet('/api/checkin/records');
      if (!r.data || r.data.length === 0) return '📍 暂无签到记录';
      const list = r.data.slice(0, 10).map(c => `• ${c.student_name} — ${c.course_name} — ${c.status} — ${c.time}`).join('<br>');
      return `📍 最近签到记录 (最近10条)：<br>${list}`;
    }},
  ];

  for (const cmd of cmds) {
    const match = text.match(cmd.match);
    if (match) {
      return await cmd.fn(match);
    }
  }

  // Default: show help
  return `🤖 我没有理解你的指令，试试说：<br><br>
  📋 创建班级「高一(1)班」<br>
  📚 创建课程「高等数学」<br>
  📍 发起签到<br>
  📝 发布作业「课后习题」<br>
  📋 审批请假<br>
  📢 发布公告「明天放假通知」<br>
  👀 查看班级列表 / 查看课程列表 / 查看签到记录`;
}

// ─── Activities Polling ───

let activityTimer = null;

function startActivityPoll() {
  if (activityTimer) clearInterval(activityTimer);
  pollActivities();
  activityTimer = setInterval(pollActivities, 3000);
}

async function pollActivities() {
  try {
    const res = await fetch(`/api/activities?since_id=${appState.activitySinceId}`);
    const data = await res.json();
    if (data.status !== 'success' || !data.data || data.data.length === 0) return;
    const list = document.getElementById('activityList');
    if (!list) return;

    const icons = { checkin: '📍', homework_submit: '📝', leave: '📋' };
    for (const act of data.data) {
      const icon = icons[act.action_type] || '🔄';
      const item = document.createElement('div');
      item.className = 'activity-item';
      item.innerHTML = `<span class="act-icon">${icon}</span><div class="act-text"><strong>${act.student_name}</strong> ${act.content}</div><span class="act-time">${act.time}</span>`;
      list.insertBefore(item, list.firstChild);

      // Also show as toast
      showToast(icon, `${act.student_name}`, act.content);
    }
    appState.activitySinceId = data.latest_id;
  } catch (e) {}
}

// ─── Classes ───

async function loadClasses() {
  try {
    const r = await apiGet('/api/classes');
    const list = r.data || [];
    document.getElementById('pageContent').innerHTML = `
    <div class="card">
      <table>
        <thead><tr><th>ID</th><th>班级名称</th><th>年级</th><th>操作</th></tr></thead>
        <tbody>
          ${list.length === 0 ? '<tr><td colspan="4" class="text-center text-muted">暂无班级，点击右上角「新建班级」创建</td></tr>' : ''}
          ${list.map(c => `<tr><td>${c.id}</td><td><strong>${c.name}</strong></td><td>${c.grade || '-'}</td><td><button class="btn btn-xs btn-danger" onclick="deleteClass(${c.id},'${c.name}')">删除</button></td></tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  } catch (e) {
    document.getElementById('pageContent').innerHTML = '<div class="card"><p style="color:var(--danger)">❌ 加载失败</p></div>';
  }
}

function showCreateClassModal() {
  showModal('新建班级', `
    <div class="form-group"><label>班级名称</label><input type="text" id="newClassName" placeholder="如：高一(1)班"></div>
    <div class="form-group"><label>年级（可选）</label><input type="text" id="newClassGrade" placeholder="如：高一"></div>
    <button class="btn btn-primary w-full" onclick="createClass()">创建班级</button>
  `);
}

async function createClass() {
  const name = document.getElementById('newClassName').value;
  const grade = document.getElementById('newClassGrade').value;
  if (!name) return showToast('❌', '错误', '请输入班级名称');
  const r = await apiPost('/api/classes', { name, grade });
  if (r.status === 'success') showToast('✅', '成功', r.msg);
  else showToast('❌', '失败', r.msg);
  closeModal();
  loadClasses();
}

async function deleteClass(id, name) {
  if (!confirm(`确定删除班级「${name}」吗？`)) return;
  const r = await apiDel(`/api/classes/${id}`);
  if (r.status === 'success') showToast('✅', '已删除', r.msg);
  loadClasses();
}

// ─── Courses ───

async function loadCourses() {
  try {
    const r = await apiGet('/api/courses');
    const list = r.data || [];
    const days = ['','周一','周二','周三','周四','周五','周六','周日'];
    document.getElementById('pageContent').innerHTML = `
    <div class="card">
      <table>
        <thead><tr><th>ID</th><th>课程名称</th><th>教师</th><th>时间</th><th>地点</th><th>操作</th></tr></thead>
        <tbody>
          ${list.length === 0 ? '<tr><td colspan="6" class="text-center text-muted">暂无课程</td></tr>' : ''}
          ${list.map(c => `<tr><td>${c.id}</td><td><strong>${c.name}</strong></td><td>${c.teacher_name || '-'}</td><td>${c.day_label} ${c.start_time}-${c.end_time}</td><td>${c.location || '-'}</td><td><button class="btn btn-xs btn-danger" onclick="deleteCourse(${c.id},'${c.name}')">删除</button></td></tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  } catch (e) {
    document.getElementById('pageContent').innerHTML = '<div class="card"><p style="color:var(--danger)">❌ 加载失败</p></div>';
  }
}

function showCreateCourseModal() {
  showModal('新建课程', `
    <div class="form-group"><label>课程名称</label><input type="text" id="newCourseName" placeholder="如：高等数学"></div>
    <div class="form-group"><label>授课教师</label><input type="text" id="newCourseTeacher" placeholder="如：王教授"></div>
    <div class="form-group"><label>上课地点</label><input type="text" id="newCourseLocation" placeholder="如：教学楼A101"></div>
    <div class="flex gap-2">
      <div class="form-group flex-1"><label>星期</label><select id="newCourseDay"><option value="1">周一</option><option value="2">周二</option><option value="3">周三</option><option value="4">周四</option><option value="5">周五</option></select></div>
      <div class="form-group flex-1"><label>开始</label><input type="time" id="newCourseStart" value="08:00"></div>
      <div class="form-group flex-1"><label>结束</label><input type="time" id="newCourseEnd" value="09:40"></div>
    </div>
    <button class="btn btn-primary w-full" onclick="createCourse()">创建课程</button>
  `);
}

async function createCourse() {
  const name = document.getElementById('newCourseName').value;
  if (!name) return showToast('❌', '错误', '请输入课程名称');
  const r = await apiPost('/api/courses', {
    name, teacher_name: document.getElementById('newCourseTeacher').value,
    location: document.getElementById('newCourseLocation').value,
    day_of_week: parseInt(document.getElementById('newCourseDay').value),
    start_time: document.getElementById('newCourseStart').value,
    end_time: document.getElementById('newCourseEnd').value,
  });
  if (r.status === 'success') showToast('✅', '成功', r.msg);
  else showToast('❌', '失败', r.msg);
  closeModal();
  loadCourses();
}

async function deleteCourse(id, name) {
  if (!confirm(`确定删除课程「${name}」吗？`)) return;
  const r = await apiDel(`/api/courses/${id}`);
  if (r.status === 'success') showToast('✅', '已删除', r.msg);
  loadCourses();
}

// ─── Checkin ───

async function loadCheckin() {
  try {
    const [coursesRes, recordsRes] = await Promise.all([apiGet('/api/courses'), apiGet('/api/checkin/records')]);
    const courses = coursesRes.data || [];
    const records = recordsRes.data || [];
    document.getElementById('pageContent').innerHTML = `
    <div class="flex gap-4" style="flex-wrap:wrap">
      <div class="card" style="flex:1;min-width:300px">
        <div class="card-header"><h3>📌 发起签到</h3></div>
        <div class="form-group"><label>选择课程</label>
          <select id="checkinCourseSelect">
            ${courses.length === 0 ? '<option value="">暂无课程</option>' : ''}
            ${courses.map(c => `<option value="${c.id}">${c.name} (${c.day_label} ${c.start_time})</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-success w-full" onclick="startCheckin()">📌 发起签到</button>
      </div>
      <div class="card" style="flex:2;min-width:400px">
        <div class="card-header"><h3>签到记录</h3></div>
        <table>
          <thead><tr><th>学生</th><th>课程</th><th>状态</th><th>时间</th></tr></thead>
          <tbody>
            ${records.length === 0 ? '<tr><td colspan="4" class="text-center text-muted">暂无签到记录</td></tr>' : ''}
            ${records.map(r => `<tr><td><strong>${r.student_name}</strong></td><td>${r.course_name}</td><td><span class="badge ${r.status === '正常' ? 'badge-success' : 'badge-warning'}">${r.status}</span></td><td>${r.time}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  } catch (e) {
    document.getElementById('pageContent').innerHTML = '<div class="card"><p style="color:var(--danger)">❌ 加载失败</p></div>';
  }
}

function showStartCheckinModal() {
  loadCheckin();
}

async function startCheckin() {
  const sel = document.getElementById('checkinCourseSelect');
  const courseId = parseInt(sel.value);
  if (!courseId) return showToast('❌', '错误', '请选择课程');
  const r = await apiPost('/api/checkin/start', { course_id: courseId });
  if (r.status === 'success') {
    showToast('✅', '签到已发起', `签到码: ${r.data.code}`);
    loadCheckin();
  } else {
    showToast('❌', '失败', r.msg);
  }
}

// ─── Homework ───

async function loadHomework() {
  try {
    const r = await apiGet('/api/homeworks');
    const list = r.data || [];
    document.getElementById('pageContent').innerHTML = `
    <div class="card">
      <table>
        <thead><tr><th>ID</th><th>标题</th><th>课程</th><th>截止</th><th>提交数</th><th>操作</th></tr></thead>
        <tbody>
          ${list.length === 0 ? '<tr><td colspan="6" class="text-center text-muted">暂无作业</td></tr>' : ''}
          ${list.map(h => `<tr><td>${h.id}</td><td><strong>${h.title}</strong></td><td>${h.course_name}</td><td>${h.due_at}</td><td>${h.submissions}</td><td><button class="btn btn-xs btn-primary" onclick="viewSubmissions(${h.id})">查看提交</button></td></tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  } catch (e) {
    document.getElementById('pageContent').innerHTML = '<div class="card"><p style="color:var(--danger)">❌ 加载失败</p></div>';
  }
}

function showCreateHomeworkModal() {
  showModal('发布作业', `
    <div class="form-group"><label>作业标题</label><input type="text" id="newHwTitle" placeholder="如：课后习题第3章"></div>
    <div class="form-group"><label>作业描述</label><textarea id="newHwDesc" rows="3" placeholder="作业描述..."></textarea></div>
    <div class="form-group"><label>截止日期</label><input type="datetime-local" id="newHwDue"></div>
    <button class="btn btn-primary w-full" onclick="createHomework()">发布作业</button>
  `);
}

async function createHomework() {
  const title = document.getElementById('newHwTitle').value;
  if (!title) return showToast('❌', '错误', '请输入作业标题');
  // Get first course for simplicity
  const courses = await apiGet('/api/courses');
  const courseId = (courses.data && courses.data.length > 0) ? courses.data[0].id : 1;
  const r = await apiPost('/api/homeworks', {
    title, course_id: courseId,
    description: document.getElementById('newHwDesc').value,
    due_at: document.getElementById('newHwDue').value || null
  });
  if (r.status === 'success') showToast('✅', '已发布', r.msg);
  else showToast('❌', '失败', r.msg);
  closeModal();
  loadHomework();
}

async function viewSubmissions(homeworkId) {
  const r = await apiGet(`/api/homeworks/${homeworkId}/submissions`);
  const subs = r.data || [];
  const content = subs.length === 0 ? '<p class="text-muted">暂无学生提交</p>' :
    subs.map(s => `
    <div style="border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px">
      <div class="flex justify-between items-center mb-2">
        <strong>${s.student_name}</strong>
        <span class="text-sm text-muted">${s.submitted_at} ${s.graded ? '✅已批改' : '⏳待批改'}</span>
      </div>
      <div class="text-sm mb-2" style="background:var(--bg);padding:8px;border-radius:4px">${s.content}</div>
      ${s.graded ? `<div>评分: <strong>${s.score}</strong> 分 | 评语: ${s.comment || '-'}</div>` : `
      <div class="flex gap-2 items-center">
        <input type="number" id="scoreInput${s.id}" placeholder="分数" style="width:80px;padding:6px;border:1px solid var(--border);border-radius:4px;font-size:13px" min="0" max="100">
        <input type="text" id="commentInput${s.id}" placeholder="评语（可选）" style="flex:1;padding:6px;border:1px solid var(--border);border-radius:4px;font-size:13px">
        <button class="btn btn-xs btn-success" onclick="gradeSubmission(${homeworkId},${s.id})">评分</button>
      </div>`}
    </div>
  `).join('');
  showModal('作业提交', content);
}

async function gradeSubmission(homeworkId, subId) {
  const score = document.getElementById('scoreInput' + subId).value;
  const comment = document.getElementById('commentInput' + subId).value;
  if (!score) return showToast('❌', '错误', '请输入分数');
  const r = await apiPost(`/api/homeworks/${homeworkId}/grade`, { sub_id: subId, score: parseFloat(score), comment });
  if (r.status === 'success') showToast('✅', '已评分', r.msg);
  else showToast('❌', '失败', r.msg);
  viewSubmissions(homeworkId);
}

// ─── Leaves ───

async function loadLeaves() {
  try {
    const r = await apiGet('/api/leaves');
    const list = r.data || [];
    document.getElementById('pageContent').innerHTML = `
    <div class="card">
      <table>
        <thead><tr><th>学生</th><th>课程</th><th>原因</th><th>状态</th><th>时间</th><th>操作</th></tr></thead>
        <tbody>
          ${list.length === 0 ? '<tr><td colspan="6" class="text-center text-muted">暂无请假记录</td></tr>' : ''}
          ${list.map(l => `<tr>
            <td><strong>${l.student_name}</strong></td>
            <td>${l.course_name || '-'}</td>
            <td class="truncate" style="max-width:200px">${l.reason}</td>
            <td><span class="badge ${l.status === '已批准' ? 'badge-success' : l.status === '已拒绝' ? 'badge-danger' : 'badge-warning'}">${l.status}</span></td>
            <td class="text-sm">${l.time}</td>
            <td>${l.status === '待审批' ? `<button class="btn btn-xs btn-success" onclick="approveLeave(${l.id},'已批准')">批准</button> <button class="btn btn-xs btn-danger" onclick="approveLeave(${l.id},'已拒绝')">拒绝</button>` : '-'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  } catch (e) {
    document.getElementById('pageContent').innerHTML = '<div class="card"><p style="color:var(--danger)">❌ 加载失败</p></div>';
  }
}

window.approveLeave = async function(id, status) {
  const r = await apiPost(`/api/leaves/${id}/approve`, { status });
  if (r.status === 'success') {
    showToast('✅', '已处理', r.msg);
    loadLeaves();
    loadChat();
  }
};

// ─── Announcements ───

async function loadAnnouncements() {
  try {
    const r = await apiGet('/api/announcements');
    const list = r.data || [];
    document.getElementById('pageContent').innerHTML = `
    <div class="card">
      <table>
        <thead><tr><th>ID</th><th>标题</th><th>内容</th><th>范围</th><th>时间</th></tr></thead>
        <tbody>
          ${list.length === 0 ? '<tr><td colspan="5" class="text-center text-muted">暂无公告</td></tr>' : ''}
          ${list.map(a => `<tr><td>${a.id}</td><td><strong>${a.title}</strong></td><td class="truncate" style="max-width:300px">${a.content || '-'}</td><td><span class="badge badge-info">${a.scope}</span></td><td class="text-sm">${a.time}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  } catch (e) {
    document.getElementById('pageContent').innerHTML = '<div class="card"><p style="color:var(--danger)">❌ 加载失败</p></div>';
  }
}

function showCreateAnnouncementModal() {
  showModal('发布公告', `
    <div class="form-group"><label>公告标题</label><input type="text" id="newAnnTitle" placeholder="如：明天放假通知"></div>
    <div class="form-group"><label>公告内容</label><textarea id="newAnnContent" rows="4" placeholder="请输入公告内容..."></textarea></div>
    <div class="form-group"><label>发布范围</label>
      <select id="newAnnScope"><option value="全校">全校</option><option value="班级">指定班级</option></select>
    </div>
    <button class="btn btn-primary w-full" onclick="createAnnouncement()">发布公告</button>
  `);
}

async function createAnnouncement() {
  const title = document.getElementById('newAnnTitle').value;
  if (!title) return showToast('❌', '错误', '请输入公告标题');
  const r = await apiPost('/api/announcements', {
    title, content: document.getElementById('newAnnContent').value,
    scope: document.getElementById('newAnnScope').value
  });
  if (r.status === 'success') showToast('✅', '已发布', r.msg);
  else showToast('❌', '失败', r.msg);
  closeModal();
  loadAnnouncements();
}

// ─── Toast ───

function showToast(icon, title, msg) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<div class="toast-icon">${icon}</div><div class="toast-body"><div class="toast-title">${escapeHtml(title)}</div><div class="toast-msg">${escapeHtml(msg)}</div></div>`;
  container.appendChild(t);
  setTimeout(() => { t.classList.add('hiding'); setTimeout(() => t.remove(), 400); }, 4000);
}

// ─── Modal ───

function showModal(title, content) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modalOverlay';
  overlay.innerHTML = `<div class="modal"><h2>${title}</h2><div id="modalBody">${content}</div></div>`;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
}

function closeModal() {
  const m = document.getElementById('modalOverlay');
  if (m) m.remove();
}

// ─── API Helpers ───

async function apiGet(url) {
  const res = await fetch(url);
  return res.json();
}

async function apiPost(url, body) {
  const res = await fetch(url, {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body)
  });
  return res.json();
}

async function apiDel(url) {
  const res = await fetch(url, { method: 'DELETE' });
  return res.json();
}

function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

// ─── Init ───

document.addEventListener('DOMContentLoaded', render);
window.addEventListener('hashchange', render);

// Logout
document.addEventListener('click', (e) => {
  if (e.target.id === 'logoutBtn') {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (activityTimer) clearInterval(activityTimer);
    window.location.hash = '#login';
    render();
  }
});
