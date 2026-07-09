/* Smart Parking System — Frontend JS */

let slotsData = [];

// ── Clock ──────────────────────────────────────
function updateClock() {
  document.getElementById('clock').textContent = new Date().toLocaleTimeString();
}
setInterval(updateClock, 1000);
updateClock();

// ── API helper ─────────────────────────────────
async function api(path, method = 'GET') {
  try {
    const res = await fetch(path, { method });
    return await res.json();
  } catch (e) {
    console.error('API error:', e);
    return null;
  }
}

// ── Render metrics ─────────────────────────────
function renderMetrics(stats) {
  document.getElementById('m-total').textContent   = stats.total;
  document.getElementById('m-avail').textContent   = stats.available;
  document.getElementById('m-occ').textContent     = stats.occupied;
  document.getElementById('m-entered').textContent = stats.entered_today;
  document.getElementById('m-exited').textContent  = stats.exited_today;

  const pct = stats.occupancy_pct;
  const fill = document.getElementById('occ-fill');
  fill.style.width = pct + '%';
  fill.style.background = pct >= 90 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#22c55e';
  document.getElementById('occ-pct-label').textContent = pct + '%';

  // display board
  document.getElementById('dp-avail').textContent = stats.available + ' FREE';
  document.getElementById('dp-occ').textContent   = stats.occupied  + ' TAKEN';
  const statusEl = document.getElementById('dp-status');
  statusEl.textContent = stats.status;
  statusEl.className   = 'board-status' + (stats.available === 0 ? ' full' : '');

  drawPie(stats.available, stats.occupied);
}

// ── Render slots grid ──────────────────────────
function renderSlots(slots) {
  slotsData = slots;
  const grid = document.getElementById('slots-grid');
  grid.innerHTML = '';
  slots.forEach(slot => {
    const el = document.createElement('div');
    el.className = 'slot ' + slot.status;
    el.id        = 'slot-' + slot.id;
    el.title     = `Slot ${slot.id}: ${slot.status}`;
    el.textContent = slot.id;
    el.onclick = () => toggleSlot(slot.id);
    grid.appendChild(el);
  });
}

// ── Render log ─────────────────────────────────
function renderLog(entries) {
  const panel = document.getElementById('log-panel');
  if (!entries || entries.length === 0) return;
  panel.innerHTML = '';
  entries.forEach(e => {
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.innerHTML = `
      <span class="log-time">${e.time}</span>
      <span class="log-tag ${e.type}">${e.type === 'enter' ? 'ENTRY' : e.type === 'exit' ? 'EXIT' : 'SYS'}</span>
      <span class="log-msg">${e.message}</span>
    `;
    panel.appendChild(div);
  });
}

// ── Pie chart (canvas) ─────────────────────────
function drawPie(avail, occ) {
  const canvas = document.getElementById('pieChart');
  const ctx    = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 20;

  ctx.clearRect(0, 0, W, H);
  const total = avail + occ;
  if (total === 0) return;

  const data   = [avail, occ];
  const colors = ['#22c55e', '#ef4444'];
  let start    = -Math.PI / 2;

  data.forEach((val, i) => {
    const angle = (val / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = colors[i];
    ctx.fill();
    start += angle;
  });

  // donut hole
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = '#171b26';
  ctx.fill();

  // center text
  ctx.fillStyle = '#e8eaf0';
  ctx.font = 'bold 20px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(Math.round((occ / total) * 100) + '%', cx, cy - 8);
  ctx.fillStyle = '#8b90a0';
  ctx.font = '11px system-ui';
  ctx.fillText('occupied', cx, cy + 12);

  // legend
  const legendEl = document.getElementById('chart-legend');
  legendEl.innerHTML = `
    <span><i style="display:inline-block;width:10px;height:10px;background:#22c55e;border-radius:2px;"></i> Available (${avail})</span>
    <span><i style="display:inline-block;width:10px;height:10px;background:#ef4444;border-radius:2px;"></i> Occupied (${occ})</span>
  `;
}

// ── Gate animation ─────────────────────────────
function openGate(type) {
  const arm    = document.getElementById(type + '-arm');
  const status = document.getElementById(type + '-status');
  arm.classList.add('open');
  status.innerHTML = `<span class="dot open"></span> Open`;
  setTimeout(() => {
    arm.classList.remove('open');
    status.innerHTML = `<span class="dot closed"></span> Closed`;
    api('/api/gate_close', 'POST');
  }, 2400);
}

// ── Flash slot ─────────────────────────────────
function flashSlot(slotId) {
  const el = document.getElementById('slot-' + slotId);
  if (!el) return;
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 500);
}

// ── Actions ────────────────────────────────────
async function triggerEntry() {
  const d = await api('/api/entry', 'POST');
  if (!d) return;
  if (d.success) {
    openGate('entry');
    const status = await api('/api/status');
    if (status) renderSlots(status.slots);
    flashSlot(d.slot);
    renderMetrics(d.stats);
  }
  await refreshLog();
}

async function triggerExit() {
  const d = await api('/api/exit', 'POST');
  if (!d) return;
  if (d.success) {
    openGate('exit');
    const status = await api('/api/status');
    if (status) renderSlots(status.slots);
    flashSlot(d.slot);
    renderMetrics(d.stats);
  }
  await refreshLog();
}

async function toggleSlot(id) {
  const d = await api('/api/toggle_slot/' + id, 'POST');
  if (!d || !d.success) return;
  const el = document.getElementById('slot-' + id);
  if (el) { el.className = 'slot ' + d.status; el.title = `Slot ${id}: ${d.status}`; }
  flashSlot(id);
  renderMetrics(d.stats);
  await refreshLog();
}

async function simulateRandom() {
  const d = await api('/api/simulate_random', 'POST');
  if (!d) return;
  renderSlots(d.slots);
  renderMetrics(d.stats);
  await refreshLog();
}

async function resetSystem() {
  const d = await api('/api/reset', 'POST');
  if (!d) return;
  renderSlots(d.slots);
  renderMetrics(d.stats);
  await refreshLog();
}

async function refreshLog() {
  const d = await api('/api/status');
  if (d) renderLog(d.log);
}

// ── Initial load ───────────────────────────────
async function init() {
  const d = await api('/api/status');
  if (!d) return;
  renderMetrics(d.stats);
  renderSlots(d.slots);
  renderLog(d.log);
}

// ── Auto-refresh every 5 s ─────────────────────
setInterval(async () => {
  const d = await api('/api/status');
  if (d) {
    renderMetrics(d.stats);
    renderLog(d.log);
  }
}, 5000);

init();
