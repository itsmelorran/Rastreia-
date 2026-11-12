// Recebe coordenadas GPS do dispositivo. Autentica pelo token do dispositivo.
// Aceita de duas formas:
//   1) POST  com header X-Device-Token + corpo JSON  (usado pelo tracker.html do navegador)
//   2) GET   /api/localizacoes?token=...&lat=...&lng=...&bat=...  (simples, para apps Kodular/MIT)
const router = require('express').Router();
const { query } = require('../config/db');
const wrap = require('../utils/wrap');

async function processar(token, latitude, longitude, precisao_m, bateria) {
  if (!token) return { status: 401, body: { erro: 'Token do dispositivo ausente' } };
  if (latitude == null || longitude == null || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return { status: 400, body: { erro: 'latitude e longitude sao obrigatorias' } };
  }

  const d = await query('SELECT id, vitima_id FROM dispositivos WHERE token_acesso=$1', [token]);
  const disp = d.rows[0];
  if (!disp) return { status: 401, body: { erro: 'Dispositivo nao reconhecido' } };

  const loc = await query(
    `INSERT INTO localizacoes (dispositivo_id, latitude, longitude, precisao_m, bateria)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, registrado_em`,
    [disp.id, latitude, longitude, precisao_m, bateria]
  );
  await query('UPDATE dispositivos SET online=TRUE, ultimo_ping=now(), bateria=$2 WHERE id=$1', [disp.id, bateria]);

  const cercas = await query('SELECT nome, tipo, latitude, longitude, raio_metros FROM geocercas WHERE vitima_id=$1 AND ativa=TRUE', [disp.vitima_id]);
  for (const c of cercas.rows) {
    const dist = haversine(latitude, longitude, Number(c.latitude), Number(c.longitude));
    const dentro = dist <= c.raio_metros;
    if (c.tipo === 'risco' && dentro) {
      await criarAlerta(disp.vitima_id, 'proximidade', 'critico', `Vitima entrou na zona de risco "${c.nome}" (${Math.round(dist)}m)`, loc.rows[0].id);
    }
    if (c.tipo === 'segura' && !dentro) {
      await criarAlerta(disp.vitima_id, 'geocerca', 'alto', `Vitima saiu da zona segura "${c.nome}"`, loc.rows[0].id);
    }
  }
  return { status: 201, body: { ok: true, localizacao_id: loc.rows[0].id } };
}

function num(v) { return v == null || v === '' ? null : Number(v); }

router.post('/', wrap(async (req, res) => {
  const b = req.body || {};
  const token = req.headers['x-device-token'] || b.token;
  const r = await processar(token, num(b.latitude), num(b.longitude), num(b.precisao_m), num(b.bateria));
  res.status(r.status).json(r.body);
}));

router.get('/', wrap(async (req, res) => {
  const q = req.query;
  const r = await processar(q.token, num(q.lat), num(q.lng), num(q.prec), num(q.bat));
  res.status(r.status).json(r.body);
}));

async function criarAlerta(vitimaId, tipo, sev, msg, locId) {
  const existe = await query(
    `SELECT 1 FROM alertas WHERE vitima_id=$1 AND tipo=$2 AND resolvido=FALSE AND criado_em > now() - interval '5 minutes' LIMIT 1`,
    [vitimaId, tipo]
  );
  if (existe.rows[0]) return;
  await query(
    `INSERT INTO alertas (vitima_id, tipo, severidade, mensagem, localizacao_id) VALUES ($1,$2,$3::severidade,$4,$5)`,
    [vitimaId, tipo, sev, msg, locId]
  );
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

module.exports = router;