// Dados para o mapa: ultima localizacao de cada vitima, status de alerta e geo-cercas.
const router = require('express').Router();
const { query } = require('../config/db');
const wrap = require('../utils/wrap');

// GET /api/mapa
router.get('/', wrap(async (req, res) => {
  // Ultima localizacao conhecida por vitima (via dispositivo), + alerta critico aberto.
  const vitimas = await query(`
    SELECT v.id, v.nome,
           loc.latitude, loc.longitude, loc.precisao_m, loc.registrado_em,
           d.online, d.identificador,
           EXISTS (SELECT 1 FROM alertas a WHERE a.vitima_id = v.id AND a.resolvido = FALSE AND a.severidade = 'critico') AS em_alerta
    FROM vitimas v
    LEFT JOIN LATERAL (SELECT id, online, identificador FROM dispositivos WHERE vitima_id = v.id ORDER BY id DESC LIMIT 1) d ON TRUE
    LEFT JOIN LATERAL (
      SELECT l.latitude, l.longitude, l.precisao_m, l.registrado_em
      FROM localizacoes l WHERE l.dispositivo_id = d.id
      ORDER BY l.registrado_em DESC LIMIT 1
    ) loc ON TRUE
    WHERE v.excluido_em IS NULL`);

  const cercas = await query(`
    SELECT g.id, g.nome, g.tipo, g.latitude, g.longitude, g.raio_metros, v.nome AS vitima_nome
    FROM geocercas g JOIN vitimas v ON v.id = g.vitima_id
    WHERE g.ativa = TRUE AND v.excluido_em IS NULL`);

  res.json({
    vitimas: vitimas.rows.map(v => ({
      ...v,
      latitude: v.latitude != null ? Number(v.latitude) : null,
      longitude: v.longitude != null ? Number(v.longitude) : null,
    })),
    cercas: cercas.rows.map(c => ({
      ...c, latitude: Number(c.latitude), longitude: Number(c.longitude),
    })),
  });
}));

module.exports = router;
