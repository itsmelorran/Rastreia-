/* ====================================================================
   Rastreia+ · front-end (consome a API REST em /api)
   ==================================================================== */
const App = {
  token: null,
  me: null,
};
try { App.token = localStorage.getItem('rp-token'); } catch (e) {}

/* ---------- cliente HTTP ---------- */
async function api(path, options = {}) {
  const opt = { headers: { 'Content-Type': 'application/json' }, ...options };
  if (App.token) opt.headers.Authorization = 'Bearer ' + App.token;
  if (opt.body && typeof opt.body !== 'string') opt.body = JSON.stringify(opt.body);
  const res = await fetch('/api' + path, opt);
  if (res.status === 401) { logout(); throw new Error('Sessão expirada'); }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.erro) || 'Erro na requisição');
  return data;
}

/* ---------- utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const iniciais = (nome) => (nome || '?').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
function toast(msg, erro) {
  const t = $('#toast');
  t.className = erro ? 'err show' : 'show';
  t.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px">${erro ? 'error' : 'check_circle'}</span>${esc(msg)}`;
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2800);
}
function hora(ts) { return ts ? new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'; }
function dataHora(ts) { return ts ? new Date(ts).toLocaleString('pt-BR') : '—'; }

/* ---------- login ---------- */
$('#togglePass').onclick = (e) => {
  const i = $('#lpass'); const show = i.type === 'password';
  i.type = show ? 'text' : 'password'; e.target.textContent = show ? 'visibility_off' : 'visibility';
};
$('#loginForm').onsubmit = async (e) => {
  e.preventDefault();
  $('#loginErr').textContent = '';
  $('#loginBtn').textContent = 'Entrando…';
  try {
    const r = await api('/auth/login', { method: 'POST', body: { email: $('#lemail').value, senha: $('#lpass').value } });
    App.token = r.token; App.me = r.usuario;
    try { localStorage.setItem('rp-token', r.token); } catch (e) {}
    enterApp();
  } catch (err) {
    $('#loginErr').textContent = err.message;
  } finally {
    $('#loginBtn').textContent = 'Entrar';
  }
};
function logout() {
  try { MapCtl.destroy(); } catch (e) {}
  App.token = null; App.me = null;
  try { localStorage.removeItem('rp-token'); } catch (e) {}
  $('#app').hidden = true; $('#login').hidden = false;
}
$('#logoutBtn').onclick = logout;

/* ---------- entrada no app ---------- */
async function enterApp() {
  if (!App.me) {
    try { App.me = (await api('/auth/me')).usuario; } catch (e) { return logout(); }
  }
  $('#login').hidden = true; $('#app').hidden = false;
  $('#meAvatar').textContent = iniciais(App.me.nome);
  const admin = App.me.papel === 'admin';
  document.querySelectorAll('.admin-only').forEach(a => a.classList.toggle('show', admin));
  showView(location.hash.slice(1) || 'dashboard');
}

/* ---------- navegação ---------- */
const TITLES = { dashboard: 'Início', vitimas: 'Vítimas', agressores: 'Agressores', dispositivos: 'Dispositivos', geocercas: 'Geo-cercas', alertas: 'Alertas', relatorios: 'Relatórios', usuarios: 'Usuários', auditoria: 'Auditoria' };
const RENDER = {};
function go(v) { location.hash = v; }
async function showView(v) {
  if (!TITLES[v]) v = 'dashboard';
  if ((v === 'usuarios' || v === 'auditoria') && App.me.papel !== 'admin') v = 'dashboard';
  MapCtl.destroy(); // encerra o mapa/temporizador da tela anterior
  $('#viewTitle').textContent = TITLES[v];
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.v === v));
  toggleMenu(false);
  $('#content').innerHTML = '<div class="empty">Carregando…</div>';
  try { await RENDER[v](); } catch (e) { $('#content').innerHTML = `<div class="empty">Erro: ${esc(e.message)}</div>`; }
}
window.addEventListener('hashchange', () => { if (!$('#app').hidden) showView(location.hash.slice(1)); });

/* ---------- menu mobile / tema ---------- */
function toggleMenu(open) { $('#sidebar').classList.toggle('open', open); $('#scrim').classList.toggle('show', open); }
$('#hamb').onclick = () => toggleMenu(true);
$('#scrim').onclick = () => toggleMenu(false);
$('#themeBtn').onclick = () => {
  const r = document.documentElement;
  const dark = r.getAttribute('data-theme') === 'dark' || (!r.getAttribute('data-theme') && matchMedia('(prefers-color-scheme:dark)').matches);
  const next = dark ? 'light' : 'dark';
  r.setAttribute('data-theme', next);
  $('#themeIc').textContent = next === 'dark' ? 'light_mode' : 'dark_mode';
  try { localStorage.setItem('rp-theme', next); } catch (e) {}
};
(function () { try { const t = localStorage.getItem('rp-theme'); if (t) document.documentElement.setAttribute('data-theme', t); } catch (e) {} })();

/* ---------- mapa estilizado ---------- */
function mapSvg(pins, fences) {
  let f = '';
  if (fences) f = `
    <circle cx="160" cy="112" r="60" fill="var(--ok)" fill-opacity="0.16" stroke="var(--ok)" stroke-width="2"/>
    <circle cx="520" cy="230" r="55" fill="var(--ok)" fill-opacity="0.16" stroke="var(--ok)" stroke-width="2"/>
    <circle cx="370" cy="130" r="50" fill="var(--crit)" fill-opacity="0.14" stroke="var(--crit)" stroke-width="2" stroke-dasharray="6 4"/>`;
  let p = '';
  (pins || []).forEach((c, idx) => {
    const spots = [[.46, .4], [.24, .32], [.77, .68], [.58, .23], [.38, .68], [.85, .3], [.14, .55], [.66, .5]];
    const [px, py] = spots[idx % spots.length];
    const x = px * 660, y = py * 300; const col = c === 'crit' ? 'var(--crit)' : 'var(--ok)'; const r = c === 'crit' ? 15 : 13;
    p += `<g transform="translate(${x},${y})"><path d="M0,${-r} C${r * .6},${-r} ${r * .9},${-r * .6} ${r * .9},${-r * .3} C${r * .9},${r * .2} 0,${r * .8} 0,${r * .8} C0,${r * .8} ${-r * .9},${r * .2} ${-r * .9},${-r * .3} C${-r * .9},${-r * .6} ${-r * .6},${-r} 0,${-r} Z" fill="${col}"/><circle cx="0" cy="${-r * .3}" r="${r * .24}" fill="#fff"/></g>`;
  });
  return `<svg viewBox="0 0 660 300" role="img"><title>Mapa</title>
    <rect x="0" y="0" width="660" height="300" fill="var(--map-ground)"/>
    <rect x="40" y="26" width="160" height="90" fill="var(--map-park)"/><rect x="470" y="180" width="160" height="110" fill="var(--map-park)"/>
    <rect x="0" y="0" width="80" height="300" fill="var(--map-water)" opacity="0.6"/>
    <path d="M0,152 H660" stroke="var(--map-road)" stroke-width="16"/><path d="M0,152 H660" stroke="var(--map-hwy)" stroke-width="4"/>
    <path d="M250,0 V300" stroke="var(--map-road)" stroke-width="14"/><path d="M460,0 V300" stroke="var(--map-road)" stroke-width="10"/>
    <path d="M0,72 H660" stroke="var(--map-road)" stroke-width="7"/><path d="M0,240 H660" stroke="var(--map-road)" stroke-width="7"/>
    ${f}${p}</svg>`;
}

/* ---------- mapa real (Leaflet + OpenStreetMap) ----------
   Para trocar pelo Google Maps: substitua o tileLayer abaixo pela Google Maps
   JavaScript API (precisa de chave). O restante da lógica é o mesmo. */
const MapCtl = {
  map: null, layer: null, timer: null,
  async init(containerId, opts = {}) {
    this.destroy();
    const el = document.getElementById(containerId);
    if (!el || !window.L) return;
    this.map = L.map(el, { zoomControl: true, attributionControl: true }).setView([-23.5558, -46.6396], 13);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19, attribution: 'Tiles © Esri',
    }).addTo(this.map);
        this.layer = L.layerGroup().addTo(this.map);
    const expandCtl = L.control({ position: 'topright' });
    expandCtl.onAdd = () => {
      const d = L.DomUtil.create('div', 'leaflet-bar');
      d.innerHTML = '<a href="#" title="Expandir mapa" style="font-weight:bold;font-size:17px;text-align:center;text-decoration:none">⤢</a>';
      L.DomEvent.on(d, 'click', (e) => { L.DomEvent.stop(e); toggleMapExpand(); });
      return d;
    };
    expandCtl.addTo(this.map);
    await this.refresh(opts);
    // Atualiza sozinho para refletir o celular em movimento / novos alertas.
    this.timer = setInterval(() => this.refresh(opts), 2500);
    setTimeout(() => this.map && this.map.invalidateSize(), 200);
  },
  async refresh(opts = {}) {
    if (!this.map) return;
    let data;
    try { data = await api('/mapa'); } catch (e) { return; }
    this.layer.clearLayers();
    const bounds = [];
    // Geo-cercas
    (data.cercas || []).forEach(c => {
      if (!c.latitude) return;
      const risco = c.tipo === 'risco';
      L.circle([c.latitude, c.longitude], {
        radius: c.raio_metros, color: risco ? '#e24b4a' : '#1d9e75',
        weight: 1.5, fillColor: risco ? '#e24b4a' : '#1d9e75', fillOpacity: 0.12,
        dashArray: risco ? '6 5' : null,
      }).bindPopup(`<b>${esc(c.nome)}</b><br>${c.tipo} · ${c.raio_metros}m<br>${esc(c.vitima_nome)}`).addTo(this.layer);
      bounds.push([c.latitude, c.longitude]);
    });
    // Vítimas com localização conhecida
    let comLoc = 0;
    (data.vitimas || []).forEach(v => {
      if (v.latitude == null) return;
      comLoc++;
      const cor = v.em_alerta ? '#e24b4a' : '#1d9e75';
      const m = L.circleMarker([v.latitude, v.longitude], {
        radius: v.em_alerta ? 11 : 8, color: '#fff', weight: 2, fillColor: cor, fillOpacity: 1,
      }).bindPopup(`<b>${esc(v.nome)}</b><br>${v.em_alerta ? '<span style="color:#e24b4a">⚠ EM ALERTA</span>' : 'situação normal'}<br>GPS ±${v.precisao_m || '?'}m · ${v.registrado_em ? new Date(v.registrado_em).toLocaleTimeString('pt-BR') : ''}`);
      m.addTo(this.layer);
      bounds.push([v.latitude, v.longitude]);
    });
    if (opts.onStats) opts.onStats({ comLoc, total: (data.vitimas || []).length });
    if (bounds.length && !this._fitted) { this.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 }); this._fitted = true; }
  },
  destroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.map) { this.map.remove(); this.map = null; }
        this.layer = null; this.timer = null; this._fitted = false;
  },
};
function toggleMapExpand() {
  const el = MapCtl.map && MapCtl.map.getContainer();
  if (!el) return;
  el.classList.toggle('map-expanded');
  setTimeout(() => MapCtl.map && MapCtl.map.invalidateSize(), 60);
}
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const el = MapCtl.map && MapCtl.map.getContainer();
  if (el && el.classList.contains('map-expanded')) {
    el.classList.remove('map-expanded');
    setTimeout(() => MapCtl.map && MapCtl.map.invalidateSize(), 60);
  }
});

/* ==================== VIEWS ==================== */

RENDER.dashboard = async function () {
  const [stats, alertas] = await Promise.all([api('/dashboard'), api('/alertas')]);
  const abertos = alertas.filter(a => !a.resolvido).slice(0, 4);
  $('#content').innerHTML = `
    <div class="metrics">
      <div class="metric"><div class="lbl">Vítimas ativas</div><div class="val">${stats.vitimas_ativas}</div></div>
      <div class="metric" style="border-left-color:var(--purple)"><div class="lbl">Casos com medida</div><div class="val">${stats.casos_com_medida}</div></div>
      <div class="metric" style="border-left-color:var(--ok)"><div class="lbl">Dispositivos online</div><div class="val">${stats.dispositivos_online}</div></div>
      <div class="metric" style="border-left-color:var(--crit)"><div class="lbl">Alertas hoje</div><div class="val">${stats.alertas_hoje}</div></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-title">Mapa em tempo real <span style="font-size:12px;color:var(--faint);font-weight:400" id="mapStats">carregando…</span></div>
        <div id="leafmap" class="leafmap"></div>
        <div style="font-size:11px;color:var(--muted);margin-top:7px;display:flex;gap:14px"><span><span class="dot" style="background:var(--ok)"></span> vítima OK</span><span><span class="dot" style="background:var(--crit)"></span> em alerta</span><span>círculo vermelho = zona de risco</span></div>
      </div>
      <div class="card">
        <div class="card-title">Alertas ativos</div>
        <div class="alist">${abertos.length ? abertos.map(a => `
          <div class="arow"><span class="dot" style="background:${sevColor(a.severidade)}"></span><span class="sev" style="color:${sevColor(a.severidade)}">${sevLabel(a.severidade)}</span><span class="msg">${esc(a.mensagem || a.tipo)}</span><span class="t">${hora(a.criado_em)}</span></div>
        `).join('') : '<div class="empty">Nenhum alerta aberto.</div>'}</div>
      </div>
    </div>
    <div class="card" style="margin-top:14px">
      <div class="card-title">Ações rápidas</div>
      <div class="qa">
        <button style="background:var(--accent)" onclick="formVitima()"><span class="material-symbols-outlined">person_add</span>Cadastrar vítima</button>
        <button style="background:var(--purple)" onclick="go('agressores')"><span class="material-symbols-outlined">wrong_location</span>Agressores</button>
        <button style="background:var(--ok)" onclick="formDispositivo()"><span class="material-symbols-outlined">add_to_queue</span>Registrar dispositivo</button>
        <button style="background:var(--warn)" onclick="formGeocerca()"><span class="material-symbols-outlined">add_location_alt</span>Criar geo-cerca</button>
        <button style="background:#5b6b82" onclick="go('relatorios')"><span class="material-symbols-outlined">summarize</span>Relatórios</button>
      </div>
    </div>`;
  MapCtl.init('leafmap', { onStats: s => { const el = $('#mapStats'); if (el) el.textContent = `${s.comLoc} localizadas · ${s.total} vítimas`; } });
};

function sevColor(s) { return s === 'critico' ? 'var(--crit)' : s === 'resolvido' ? 'var(--ok)' : 'var(--warn)'; }
function sevLabel(s) { return { critico: 'Crítico', alto: 'Alto', atencao: 'Atenção', resolvido: 'Resolvido' }[s] || s; }

RENDER.vitimas = async function () {
  const rows = await api('/vitimas');
  $('#content').innerHTML = `
    <div class="toolbar">
      <div class="search-lg"><span class="material-symbols-outlined">search</span><input id="q" placeholder="Buscar por nome ou CPF…" oninput="filterRows()"></div>
      <button class="btn btn-primary" style="width:auto" onclick="formVitima()"><span class="material-symbols-outlined">add</span>Cadastrar vítima</button>
    </div>
    <div class="table-wrap"><table><thead><tr><th>Vítima</th><th>CPF</th><th>Consentimento</th><th>Dispositivo</th><th>Ações</th></tr></thead>
    <tbody id="tbody">${rows.map(v => `<tr data-s="${esc(v.nome + ' ' + (v.cpf || ''))}">
      <td><div class="person"><span class="ini p-${v.consentimento ? 'ok' : 'mut'}">${iniciais(v.nome)}</span>${esc(v.nome)}</div></td>
      <td style="color:var(--muted)">${esc(v.cpf || '—')}</td>
      <td><span class="pill ${v.consentimento ? 'p-ok' : 'p-mut'}">${v.consentimento ? 'ativo' : 'pendente'}</span></td>
      <td>${v.tem_dispositivo ? `<span class="st" style="color:${v.dispositivo_online ? 'var(--ok)' : 'var(--faint)'}"><span class="dot" style="background:${v.dispositivo_online ? 'var(--ok)' : 'var(--faint)'}"></span>${v.dispositivo_online ? 'online' : 'offline'}</span>` : '<span style="color:var(--faint);font-size:12px">sem vínculo</span>'}</td>
      <td><button class="rowbtn" onclick="formVitima(${v.id})" title="Editar"><span class="material-symbols-outlined" style="font-size:18px">edit</span></button><button class="rowbtn del" onclick="delVitima(${v.id},'${esc(v.nome)}')" title="Excluir"><span class="material-symbols-outlined" style="font-size:18px">delete</span></button></td>
    </tr>`).join('') || '<tr><td colspan="5"><div class="empty">Nenhuma vítima cadastrada.</div></td></tr>'}</tbody></table></div>`;
};

RENDER.agressores = async function () {
  const rows = await api('/agressores');
  $('#content').innerHTML = `
    <div class="note warn"><span class="material-symbols-outlined">info</span>O agressor não é rastreado. Registra-se apenas a zona de restrição definida por medida protetiva.</div>
    <div class="toolbar">
      <div class="search-lg"><span class="material-symbols-outlined">search</span><input id="q" placeholder="Buscar agressor ou vítima…" oninput="filterRows()"></div>
      <button class="btn" style="background:var(--purple);color:#fff;width:auto" onclick="formAgressor()"><span class="material-symbols-outlined">add</span>Registrar agressor</button>
    </div>
    <div class="table-wrap"><table><thead><tr><th>Agressor</th><th>Vítima vinculada</th><th>Medida</th><th>Zona de restrição</th><th>Ações</th></tr></thead>
    <tbody id="tbody">${rows.map(a => `<tr data-s="${esc((a.nome || '') + ' ' + a.vitima_nome)}">
      <td>${esc(a.nome || '—')}</td><td style="color:var(--muted)">${esc(a.vitima_nome)}</td>
      <td><span class="pill ${a.possui_medida_protetiva ? 'p-ok' : 'p-mut'}">${a.possui_medida_protetiva ? 'sim' : 'não'}</span></td>
      <td style="color:var(--muted);font-size:12px">${a.raio_metros ? `<span class="material-symbols-outlined" style="font-size:15px;vertical-align:-3px;color:var(--crit)">wrong_location</span> ${a.raio_metros}m` : 'sem zona'}</td>
      <td><button class="rowbtn del" onclick="delAgressor(${a.id})" title="Excluir"><span class="material-symbols-outlined" style="font-size:18px">delete</span></button></td>
    </tr>`).join('') || '<tr><td colspan="5"><div class="empty">Nenhum agressor registrado.</div></td></tr>'}</tbody></table></div>`;
};

RENDER.dispositivos = async function () {
  const rows = await api('/dispositivos');
  const on = rows.filter(d => d.online).length;
  $('#content').innerHTML = `
    <div class="metrics" style="grid-template-columns:repeat(3,1fr)">
      <div class="metric" style="border-left-color:var(--ok)"><div class="lbl">Online</div><div class="val">${on}</div></div>
      <div class="metric" style="border-left-color:var(--faint)"><div class="lbl">Offline</div><div class="val">${rows.length - on}</div></div>
      <div class="metric" style="border-left-color:var(--warn)"><div class="lbl">Bateria baixa</div><div class="val">${rows.filter(d => d.bateria != null && d.bateria < 20).length}</div></div>
    </div>
    <div class="toolbar">
      <div class="search-lg"><span class="material-symbols-outlined">search</span><input id="q" placeholder="Buscar por ID ou vítima…" oninput="filterRows()"></div>
      <button class="btn" style="background:var(--ok);color:#fff;width:auto" onclick="formDispositivo()"><span class="material-symbols-outlined">add</span>Registrar dispositivo</button>
    </div>
    <div class="table-wrap"><table><thead><tr><th>Identificador</th><th>Vítima</th><th>Status</th><th>Último ping</th><th>Bateria</th><th>Ações</th></tr></thead>
    <tbody id="tbody">${rows.map(d => `<tr data-s="${esc(d.identificador + ' ' + d.vitima_nome)}">
      <td class="mono" style="font-size:12px">${esc(d.identificador)}</td><td style="color:var(--muted)">${esc(d.vitima_nome)}</td>
      <td><span class="st" style="color:${d.online ? 'var(--ok)' : 'var(--faint)'}"><span class="dot" style="background:${d.online ? 'var(--ok)' : 'var(--faint)'}"></span>${d.online ? 'online' : 'offline'}</span></td>
      <td style="color:var(--muted);font-size:12px">${hora(d.ultimo_ping)}</td>
      <td style="font-size:12px;color:${d.bateria == null ? 'var(--faint)' : d.bateria < 20 ? 'var(--warn)' : 'var(--ok)'}">${d.bateria == null ? '—' : d.bateria + '%'}</td>
      <td><button class="rowbtn" onclick="abrirTracker(${d.id})" title="Abrir no celular"><span class="material-symbols-outlined" style="font-size:18px">qr_code_2</span></button><button class="rowbtn del" onclick="delDispositivo(${d.id})" title="Excluir"><span class="material-symbols-outlined" style="font-size:18px">delete</span></button></td>
    </tr>`).join('') || '<tr><td colspan="6"><div class="empty">Nenhum dispositivo.</div></td></tr>'}</tbody></table></div>`;
};

RENDER.geocercas = async function () {
  const rows = await api('/geocercas');
  $('#content').innerHTML = `
    <div class="toolbar"><h2 style="font-size:16px;margin-right:auto">Zonas seguras e de risco</h2>
      <button class="btn" style="background:var(--warn);color:#fff;width:auto" onclick="formGeocerca()"><span class="material-symbols-outlined">add</span>Criar geo-cerca</button></div>
    <div class="grid-2b">
      <div class="card"><div class="card-title">Mapa</div><div id="leafmap" class="leafmap"></div></div>
      <div style="display:flex;flex-direction:column;gap:9px">${rows.map(g => `
        <div class="gc ${g.tipo}"><div class="top"><span class="nm">${esc(g.nome)} — ${esc(g.vitima_nome)}</span><span class="pill ${g.tipo === 'risco' ? 'p-crit' : 'p-ok'}">${g.tipo}</span></div>
        <div class="meta">raio ${g.raio_metros}m · ${g.ativa ? 'ativa' : 'inativa'} · ${g.tipo === 'risco' ? 'alerta ao entrar' : 'alerta ao sair'} <button class="rowbtn del" style="float:right" onclick="delGeocerca(${g.id})"><span class="material-symbols-outlined" style="font-size:16px">delete</span></button></div></div>
      `).join('') || '<div class="empty">Nenhuma geo-cerca.</div>'}</div>
    </div>`;
  MapCtl.init('leafmap');
};

let alertFilter = 'all';
RENDER.alertas = async function () {
  const rows = await api('/alertas');
  window._alertas = rows;
  $('#content').innerHTML = `
    <div class="toolbar"><h2 style="font-size:16px;margin-right:auto">Alertas</h2>
      <span class="chip ${alertFilter === 'all' ? 'on' : ''}" onclick="setAlertFilter('all')">Todos</span>
      <span class="chip crit ${alertFilter === 'crit' ? 'on' : ''}" onclick="setAlertFilter('crit')">Críticos</span>
      <span class="chip ${alertFilter === 'done' ? 'on' : ''}" onclick="setAlertFilter('done')">Resolvidos</span>
    </div><div id="alertList" style="display:flex;flex-direction:column;gap:9px"></div>`;
  paintAlerts();
};
function setAlertFilter(f) { alertFilter = f; document.querySelectorAll('#content .chip').forEach(c => c.classList.remove('on')); event.target.classList.add('on'); paintAlerts(); }
function paintAlerts() {
  const rows = (window._alertas || []).filter(a => alertFilter === 'all' || (alertFilter === 'crit' && a.severidade === 'critico' && !a.resolvido) || (alertFilter === 'done' && a.resolvido));
  $('#alertList').innerHTML = rows.map(a => `
    <div class="acard ${a.severidade}" ${a.resolvido ? 'style="opacity:.72"' : ''}>
      <span class="pill ${a.severidade === 'critico' ? 'p-crit' : a.resolvido ? 'p-ok' : 'p-warn'}">${sevLabel(a.severidade)}</span>
      <div class="body"><div class="ttl">${esc(a.mensagem || a.tipo)}</div><div class="sub">${esc(a.tipo)} · ${esc(a.vitima_nome)} · ${dataHora(a.criado_em)}</div></div>
      ${a.resolvido ? '<span class="material-symbols-outlined" style="color:var(--ok)">check_circle</span>'
        : `<button class="btn ${a.severidade === 'critico' ? '' : 'btn-ghost'}" style="width:auto;padding:7px 14px;${a.severidade === 'critico' ? 'background:var(--crit)' : ''}" onclick="resolverAlerta(${a.id})">${a.severidade === 'critico' ? 'Acionar / resolver' : 'Resolver'}</button>`}
    </div>`).join('') || '<div class="empty">Nenhum alerta.</div>';
}
async function resolverAlerta(id) {
  try { await api('/alertas/' + id + '/resolver', { method: 'PATCH' }); toast('Alerta resolvido'); RENDER.alertas(); }
  catch (e) { toast(e.message, true); }
}

RENDER.relatorios = async function () {
  const rows = await api('/alertas');
  const tot = rows.length, crit = rows.filter(a => a.severidade === 'critico').length, res = rows.filter(a => a.resolvido).length;
  const porTipo = {}; rows.forEach(a => porTipo[a.tipo] = (porTipo[a.tipo] || 0) + 1);
  const max = Math.max(1, ...Object.values(porTipo));
  const cores = { proximidade: 'var(--crit)', geocerca: 'var(--warn)', offline: 'var(--purple)', panico: 'var(--ok)' };
  $('#content').innerHTML = `
    <div class="toolbar"><h2 style="font-size:16px;margin-right:auto">Relatórios</h2>
      <button class="btn btn-primary" style="width:auto" onclick="formRelatorio()"><span class="material-symbols-outlined">download</span>Gerar relatório</button></div>
    <div class="metrics">
      <div class="metric"><div class="lbl">Alertas</div><div class="val">${tot}</div></div>
      <div class="metric" style="border-left-color:var(--crit)"><div class="lbl">Críticos</div><div class="val">${crit}</div></div>
      <div class="metric" style="border-left-color:var(--ok)"><div class="lbl">Resolvidos</div><div class="val">${res}</div></div>
      <div class="metric" style="border-left-color:var(--purple)"><div class="lbl">Taxa resolução</div><div class="val">${tot ? Math.round(res / tot * 100) : 0}%</div></div>
    </div>
    <div class="card"><div class="card-title">Alertas por tipo</div><div class="barrow">
      ${Object.entries(porTipo).map(([k, n]) => `<div><div style="display:flex;justify-content:space-between;color:var(--muted);margin-bottom:3px"><span>${esc(k)}</span><span>${n}</span></div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(n / max * 100)}%;background:${cores[k] || 'var(--accent)'}"></div></div></div>`).join('') || '<div class="empty">Sem dados.</div>'}
    </div></div>`;
};

RENDER.usuarios = async function () {
  const rows = await api('/usuarios');
  $('#content').innerHTML = `
    <div class="toolbar"><h2 style="font-size:16px;margin-right:auto">Usuários</h2>
      <button class="btn btn-primary" style="width:auto" onclick="formUsuario()"><span class="material-symbols-outlined">add</span>Novo usuário</button></div>
    <div class="table-wrap"><table><thead><tr><th>Usuário</th><th>Papel</th><th>Status</th><th>Criado em</th><th>Ações</th></tr></thead>
    <tbody>${rows.map(u => `<tr>
      <td><div class="person"><span class="ini p-mut">${iniciais(u.nome)}</span><div><div>${esc(u.nome)}</div><div style="color:var(--faint);font-size:11px">${esc(u.email)}</div></div></div></td>
      <td><span class="pill ${u.papel === 'admin' ? 'p-pur' : 'p-mut'}">${u.papel}</span></td>
      <td><span class="st" style="color:${u.ativo ? 'var(--ok)' : 'var(--faint)'}"><span class="dot" style="background:${u.ativo ? 'var(--ok)' : 'var(--faint)'}"></span>${u.ativo ? 'ativo' : 'inativo'}</span></td>
      <td style="color:var(--muted);font-size:12px">${dataHora(u.criado_em)}</td>
      <td><button class="rowbtn" onclick='formUsuario(${JSON.stringify(u)})' title="Editar"><span class="material-symbols-outlined" style="font-size:18px">edit</span></button>${u.id !== App.me.id ? `<button class="rowbtn del" onclick="delUsuario(${u.id})" title="Desativar"><span class="material-symbols-outlined" style="font-size:18px">block</span></button>` : ''}</td>
    </tr>`).join('')}</tbody></table></div>`;
};

RENDER.auditoria = async function () {
  const rows = await api('/auditoria');
  $('#content').innerHTML = `
    <div class="note ok"><span class="material-symbols-outlined">lock</span>Registro imutável de acessos · exigência de LGPD.</div>
    <div class="table-wrap"><table><thead><tr><th>Usuário</th><th>Ação</th><th>Entidade</th><th>IP</th><th>Data/hora</th></tr></thead>
    <tbody>${rows.map(r => `<tr>
      <td>${esc(r.usuario_nome || '—')}</td>
      <td><span class="pill ${acaoCor(r.acao)}" style="border-radius:6px">${esc(r.acao)}</span></td>
      <td style="color:var(--muted)">${esc(r.entidade || '—')}${r.entidade_id ? ' #' + r.entidade_id : ''}</td>
      <td class="mono" style="font-size:12px;color:var(--muted)">${esc(r.ip || '—')}</td>
      <td style="color:var(--faint)">${dataHora(r.criado_em)}</td></tr>`).join('') || '<tr><td colspan="5"><div class="empty">Sem registros.</div></td></tr>'}</tbody></table></div>`;
};
function acaoCor(a) { return /excluir|desativar/.test(a) ? 'p-crit' : /criar/.test(a) ? 'p-ok' : /editar/.test(a) ? 'p-warn' : 'p-acc'; }

/* ---------- busca em tabela ---------- */
function filterRows() {
  const q = ($('#q').value || '').toLowerCase();
  document.querySelectorAll('#tbody tr').forEach(tr => { tr.style.display = (tr.dataset.s || tr.textContent).toLowerCase().includes(q) ? '' : 'none'; });
}

/* ==================== MODAIS / FORMULÁRIOS ==================== */
function modal(html) { $('#modalRoot').innerHTML = `<div class="overlay" onclick="if(event.target===this)closeModal()"><div class="modal">${html}</div></div>`; }
function closeModal() { $('#modalRoot').innerHTML = ''; }

async function selectVitimas(sel) {
  const vs = await api('/vitimas');
  return vs.map(v => `<option value="${v.id}" ${sel == v.id ? 'selected' : ''}>${esc(v.nome)}</option>`).join('');
}

async function formVitima(id) {
  let v = { nome: '', cpf: '', telefone: '', contato_emergencia: '', status: 'ativa' };
  if (id) v = await api('/vitimas/' + id);
  modal(`
    <div class="modal-head"><span class="material-symbols-outlined" style="color:var(--accent)">person_add</span><h2>${id ? 'Editar' : 'Cadastrar'} vítima</h2><button class="x" onclick="closeModal()"><span class="material-symbols-outlined">close</span></button></div>
    <form id="f">
      <div class="form-grid">
        <div class="full"><span class="lbl-sm">Nome completo *</span><input class="inp" name="nome" value="${esc(v.nome)}" required></div>
        <div><span class="lbl-sm">CPF</span><input class="inp" name="cpf" value="${esc(v.cpf || '')}"></div>
        <div><span class="lbl-sm">Telefone</span><input class="inp" name="telefone" value="${esc(v.telefone || '')}"></div>
        <div class="full"><span class="lbl-sm">Contato de emergência</span><input class="inp" name="contato_emergencia" value="${esc(v.contato_emergencia || '')}"></div>
        <div><span class="lbl-sm">Status</span><select class="inp" name="status"><option value="ativa" ${v.status === 'ativa' ? 'selected' : ''}>ativa</option><option value="inativa" ${v.status === 'inativa' ? 'selected' : ''}>inativa</option><option value="arquivada" ${v.status === 'arquivada' ? 'selected' : ''}>arquivada</option></select></div>
      </div>
      <div class="modal-foot"><button type="button" class="btn btn-ghost" style="width:auto" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" style="width:auto">${id ? 'Salvar' : 'Cadastrar'}</button></div>
    </form>`);
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    try { await api('/vitimas' + (id ? '/' + id : ''), { method: id ? 'PUT' : 'POST', body }); closeModal(); toast(id ? 'Vítima atualizada' : 'Vítima cadastrada'); showView('vitimas'); }
    catch (err) { toast(err.message, true); }
  };
}
async function delVitima(id, nome) {
  if (!await confirmBox(`Excluir a vítima "${nome}"? A exclusão é lógica e fica registrada na auditoria.`)) return;
  try { await api('/vitimas/' + id, { method: 'DELETE' }); toast('Vítima excluída'); showView('vitimas'); } catch (e) { toast(e.message, true); }
}

async function formAgressor() {
  const opts = await selectVitimas();
  modal(`
    <div class="modal-head"><span class="material-symbols-outlined" style="color:var(--purple)">wrong_location</span><h2>Registrar agressor</h2><button class="x" onclick="closeModal()"><span class="material-symbols-outlined">close</span></button></div>
    <div class="note warn"><span class="material-symbols-outlined">shield</span>O agressor não é rastreado — registra-se apenas a medida e a zona de restrição.</div>
    <form id="f"><div class="form-grid">
      <div class="full"><span class="lbl-sm">Vítima vinculada *</span><select class="inp" name="vitima_id" required>${opts}</select></div>
      <div class="full"><span class="lbl-sm">Nome do agressor</span><input class="inp" name="nome"></div>
      <div><span class="lbl-sm">Nº do processo</span><input class="inp" name="numero_processo"></div>
      <div><span class="lbl-sm">Medida protetiva</span><select class="inp" name="possui_medida_protetiva"><option value="true">sim</option><option value="false">não</option></select></div>
    </div><div class="modal-foot"><button type="button" class="btn btn-ghost" style="width:auto" onclick="closeModal()">Cancelar</button><button class="btn" style="background:var(--purple);color:#fff;width:auto">Registrar</button></div></form>`);
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const b = Object.fromEntries(new FormData(e.target)); b.possui_medida_protetiva = b.possui_medida_protetiva === 'true';
    try { await api('/agressores', { method: 'POST', body: b }); closeModal(); toast('Agressor registrado'); showView('agressores'); } catch (err) { toast(err.message, true); }
  };
}
async function delAgressor(id) { if (!await confirmBox('Excluir este agressor?')) return; try { await api('/agressores/' + id, { method: 'DELETE' }); toast('Excluído'); showView('agressores'); } catch (e) { toast(e.message, true); } }

async function formDispositivo() {
  const opts = await selectVitimas();
  modal(`
    <div class="modal-head"><span class="material-symbols-outlined" style="color:var(--ok)">smartphone</span><h2>Registrar dispositivo</h2><button class="x" onclick="closeModal()"><span class="material-symbols-outlined">close</span></button></div>
    <form id="f"><div class="form-grid">
      <div><span class="lbl-sm">Identificador (IMEI/UUID) *</span><input class="inp mono" name="identificador" value="DEV-${Math.floor(Math.random()*90000+10000)}" required></div>
      <div><span class="lbl-sm">Modelo</span><input class="inp" name="modelo" placeholder="Samsung A15"></div>
      <div class="full"><span class="lbl-sm">Vítima vinculada *</span><select class="inp" name="vitima_id" required>${opts}</select></div>
    </div>
    <div class="note warn"><span class="material-symbols-outlined">shield</span>Só vincula se a vítima tiver consentimento ativo de rastreio.</div>
    <div class="modal-foot"><button type="button" class="btn btn-ghost" style="width:auto" onclick="closeModal()">Cancelar</button><button class="btn" style="background:var(--ok);color:#fff;width:auto">Salvar e parear</button></div></form>`);
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const b = Object.fromEntries(new FormData(e.target));
    try {
      const d = await api('/dispositivos', { method: 'POST', body: b });
      closeModal(); tokenModal(d.token_acesso); showView('dispositivos');
    } catch (err) { toast(err.message, true); }
  };
}
function tokenModal(token) {
  const base = location.origin.replace(/^http:/, 'https:').replace(/:(\d+)$/, ':3443'); // sugere HTTPS p/ o GPS
  const url = base + '/tracker.html?token=' + token;
  modal(`<div class="modal-head"><span class="material-symbols-outlined" style="color:var(--ok)">smartphone</span><h2>Abrir no celular</h2><button class="x" onclick="closeModal()"><span class="material-symbols-outlined">close</span></button></div>
    <p style="font-size:13px;color:var(--muted);margin-top:0">Abra este endereço no celular que vai servir de dispositivo e autorize a localização. O celular passa a enviar o GPS para a central.</p>
    <div style="text-align:center"><div id="qrbox" style="display:inline-block;background:#fff;padding:10px;border-radius:12px"></div></div>
    <span class="lbl-sm" style="margin-top:12px">Link do rastreador</span>
    <div class="mono" style="font-size:11px;background:var(--surface-2);padding:8px 12px;border-radius:8px;word-break:break-all">${esc(url)}</div>
    <span class="lbl-sm" style="margin-top:10px">Token</span>
    <div class="mono" style="font-size:11px;background:var(--surface-2);padding:8px 12px;border-radius:8px;word-break:break-all">${esc(token)}</div>
    <div class="note warn" style="margin-top:12px"><span class="material-symbols-outlined">info</span>O GPS do navegador exige HTTPS. Rode <b>npm run dev:https</b> e use o IP do PC no lugar de localhost (ex.: https://192.168.0.10:3443/tracker.html).</div>
    <div class="modal-foot"><button class="btn btn-ghost" style="width:auto" onclick="copiar('${esc(url)}')">Copiar link</button><button class="btn btn-primary" style="width:auto" onclick="closeModal()">Concluir</button></div>`);
  try { new QRCode(document.getElementById('qrbox'), { text: url, width: 150, height: 150 }); } catch (e) {}
}
function copiar(t) { if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => toast('Copiado')).catch(() => {}); }
async function abrirTracker(id) {
  try { const r = await api('/dispositivos/' + id + '/tracker'); tokenModal(r.token); } catch (e) { toast(e.message, true); }
}
async function delDispositivo(id) { if (!await confirmBox('Remover este dispositivo?')) return; try { await api('/dispositivos/' + id, { method: 'DELETE' }); toast('Removido'); showView('dispositivos'); } catch (e) { toast(e.message, true); } }

async function formGeocerca() {
  const opts = await selectVitimas();
  modal(`
    <div class="modal-head"><span class="material-symbols-outlined" style="color:var(--warn)">add_location_alt</span><h2>Criar geo-cerca</h2><button class="x" onclick="closeModal()"><span class="material-symbols-outlined">close</span></button></div>
    <form id="f"><div class="form-grid">
      <div class="full"><span class="lbl-sm">Vítima *</span><select class="inp" name="vitima_id" required>${opts}</select></div>
      <div><span class="lbl-sm">Nome *</span><input class="inp" name="nome" placeholder="Casa, Trabalho…" required></div>
      <div><span class="lbl-sm">Tipo *</span><select class="inp" name="tipo"><option value="segura">segura</option><option value="risco">risco</option></select></div>
      <div><span class="lbl-sm">Latitude</span><input class="inp" name="latitude" value="-23.55"></div>
      <div><span class="lbl-sm">Longitude</span><input class="inp" name="longitude" value="-46.63"></div>
      <div><span class="lbl-sm">Raio (m)</span><input class="inp" name="raio_metros" type="number" value="150"></div>
    </div><div class="modal-foot"><button type="button" class="btn btn-ghost" style="width:auto" onclick="closeModal()">Cancelar</button><button class="btn" style="background:var(--warn);color:#fff;width:auto">Criar</button></div></form>`);
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    try { await api('/geocercas', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); closeModal(); toast('Geo-cerca criada'); showView('geocercas'); } catch (err) { toast(err.message, true); }
  };
}
async function delGeocerca(id) { if (!await confirmBox('Excluir esta geo-cerca?')) return; try { await api('/geocercas/' + id, { method: 'DELETE' }); toast('Excluída'); showView('geocercas'); } catch (e) { toast(e.message, true); } }

async function formUsuario(u) {
  const edit = u && u.id;
  modal(`
    <div class="modal-head"><span class="material-symbols-outlined" style="color:var(--accent)">${edit ? 'manage_accounts' : 'person_add'}</span><h2>${edit ? 'Editar' : 'Novo'} usuário</h2><button class="x" onclick="closeModal()"><span class="material-symbols-outlined">close</span></button></div>
    <form id="f"><div class="form-grid">
      <div><span class="lbl-sm">Nome *</span><input class="inp" name="nome" value="${edit ? esc(u.nome) : ''}" required></div>
      <div><span class="lbl-sm">E-mail *</span><input class="inp" name="email" type="email" value="${edit ? esc(u.email) : ''}" required></div>
      <div><span class="lbl-sm">Papel</span><select class="inp" name="papel"><option value="operador" ${edit && u.papel === 'operador' ? 'selected' : ''}>operador</option><option value="admin" ${edit && u.papel === 'admin' ? 'selected' : ''}>admin</option></select></div>
      <div><span class="lbl-sm">Senha ${edit ? '(deixe em branco p/ manter)' : '*'}</span><input class="inp" name="senha" type="password" ${edit ? '' : 'required'}></div>
      ${edit ? `<div class="full" style="display:flex;justify-content:space-between;align-items:center"><span class="lbl-sm" style="margin:0">Usuário ativo</span><input type="checkbox" name="ativo" ${u.ativo ? 'checked' : ''}></div>` : ''}
    </div><div class="modal-foot"><button type="button" class="btn btn-ghost" style="width:auto" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" style="width:auto">${edit ? 'Salvar' : 'Criar'}</button></div></form>`);
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target); const b = Object.fromEntries(fd);
    if (edit) b.ativo = fd.get('ativo') === 'on';
    if (edit && !b.senha) delete b.senha;
    try { await api('/usuarios' + (edit ? '/' + u.id : ''), { method: edit ? 'PUT' : 'POST', body: b }); closeModal(); toast(edit ? 'Usuário atualizado' : 'Usuário criado'); showView('usuarios'); } catch (err) { toast(err.message, true); }
  };
}
async function delUsuario(id) { if (!await confirmBox('Desativar este usuário?')) return; try { await api('/usuarios/' + id, { method: 'DELETE' }); toast('Usuário desativado'); showView('usuarios'); } catch (e) { toast(e.message, true); } }

async function formRelatorio() {
  const [vits, ags] = await Promise.all([api('/vitimas'), api('/agressores')]);
  const hoje = new Date().toISOString().slice(0, 10);
  const seteDias = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);
  modal(`
    <div class="modal-head"><span class="material-symbols-outlined" style="color:var(--accent)">summarize</span><h2>Gerar relatório</h2><button class="x" onclick="closeModal()"><span class="material-symbols-outlined">close</span></button></div>
    <span class="lbl-sm">Passo 1 · Filtrar por</span>
    <div class="opt-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:14px">
      <div class="opt sel" data-r="periodo" onclick="pickRel(this)"><span class="material-symbols-outlined">date_range</span>Período</div>
      <div class="opt" data-r="data" onclick="pickRel(this)"><span class="material-symbols-outlined">event</span>Data</div>
      <div class="opt" data-r="vitima" onclick="pickRel(this)"><span class="material-symbols-outlined">person</span>Vítima</div>
      <div class="opt" data-r="agressor" onclick="pickRel(this)"><span class="material-symbols-outlined">gpp_maybe</span>Agressor</div>
    </div>
    <div id="relStep2"></div>
    <span class="lbl-sm" style="margin-top:14px">Passo 3 · Formato</span>
    <div class="opt-grid" style="grid-template-columns:repeat(2,1fr)">
      <div class="opt sel" data-fmt="csv" onclick="pickFmt(this)"><span class="material-symbols-outlined" style="color:var(--ok)">table_view</span>CSV / Excel</div>
      <div class="opt" data-fmt="pdf" onclick="pickFmt(this)"><span class="material-symbols-outlined" style="color:var(--crit)">picture_as_pdf</span>PDF</div>
    </div>
    <div class="modal-foot"><button class="btn btn-ghost" style="width:auto" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" style="width:auto" id="relBtn"><span class="material-symbols-outlined">download</span>Baixar</button></div>`);
  window._relData = {
    hoje, seteDias,
    vitOpts: vits.map(v => `<option value="${v.id}">${esc(v.nome)}</option>`).join(''),
    agOpts: ags.map(a => `<option value="${a.id}">${esc(a.nome || 'Agressor')} — ${esc(a.vitima_nome)}</option>`).join(''),
  };
  relStep2('periodo');
  $('#relBtn').onclick = baixarRelatorio;
}
function pickRel(el) { el.parentElement.querySelectorAll('.opt').forEach(o => o.classList.remove('sel')); el.classList.add('sel'); relStep2(el.dataset.r); }
function pickFmt(el) { el.parentElement.querySelectorAll('.opt').forEach(o => o.classList.remove('sel')); el.classList.add('sel'); }
function relStep2(tipo) {
  const d = window._relData;
  const box = {
    periodo: `<span class="lbl-sm">Passo 2 · Intervalo</span><div style="display:flex;gap:8px"><input class="inp" type="date" id="relDe" value="${d.seteDias}"><input class="inp" type="date" id="relAte" value="${d.hoje}"></div>`,
    data: `<span class="lbl-sm">Passo 2 · Data</span><input class="inp" type="date" id="relData" value="${d.hoje}">`,
    vitima: `<span class="lbl-sm">Passo 2 · Vítima</span><select class="inp" id="relVit">${d.vitOpts}</select>`,
    agressor: `<span class="lbl-sm">Passo 2 · Agressor</span><select class="inp" id="relAg">${d.agOpts}</select>`,
  };
  $('#relStep2').innerHTML = box[tipo];
}
async function baixarRelatorio() {
  const tipo = $('#modalRoot .opt[data-r].sel').dataset.r;
  const fmt = $('#modalRoot .opt[data-fmt].sel').dataset.fmt;
  const p = new URLSearchParams({ formato: fmt });
  if (tipo === 'periodo') { p.set('de', $('#relDe').value); p.set('ate', $('#relAte').value); }
  else if (tipo === 'data') { p.set('de', $('#relData').value); p.set('ate', $('#relData').value); }
  else if (tipo === 'vitima') p.set('vitima_id', $('#relVit').value);
  else if (tipo === 'agressor') p.set('agressor_id', $('#relAg').value);
  try {
    const res = await fetch('/api/relatorios?' + p.toString(), { headers: { Authorization: 'Bearer ' + App.token } });
    if (!res.ok) throw new Error('Falha ao gerar relatório');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'relatorio-rastreia-' + new Date().toISOString().slice(0, 10) + (fmt === 'pdf' ? '.pdf' : '.csv');
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    closeModal(); toast('Relatório baixado');
  } catch (e) { toast(e.message, true); }
}

/* ---------- confirm custom (o confirm nativo pode ser bloqueado) ---------- */
function confirmBox(msg) {
  return new Promise(resolve => {
    modal(`<div class="modal-head"><span class="material-symbols-outlined" style="color:var(--warn)">help</span><h2>Confirmar</h2></div>
      <p style="font-size:14px;color:var(--muted)">${esc(msg)}</p>
      <div class="modal-foot"><button class="btn btn-ghost" style="width:auto" id="cNo">Cancelar</button><button class="btn" style="background:var(--crit);width:auto" id="cYes">Confirmar</button></div>`);
    $('#cNo').onclick = () => { closeModal(); resolve(false); };
    $('#cYes').onclick = () => { closeModal(); resolve(true); };
  });
}

/* ---------- boot ---------- */
if (App.token) enterApp(); else { $('#login').hidden = false; }
