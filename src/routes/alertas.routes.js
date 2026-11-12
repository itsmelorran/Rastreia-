// Alertas: listar, criar e resolver.
const router = require('express').Router();
const { query } = require('../config/db');
const { registrar } = require('../middlewares/auditoria');
const wrap = require('../utils/wrap');

router.get('/', wrap(async (req, res) => {
  const { resolvido } = req.query;
  const cond = resolvido === 'true' ? 'WHERE a.resolvido = TRUE'
             : resolvido === 'false' ? 'WHERE a.resolvido = FALSE' : '';
  const r = await query(`
    SELECT a.id, a.tipo, a.severidade, a.mensagem, a.resolvido, a.criado_em, a.resolvido_em,
           v.nome AS vitima_nome
    FROM alertas a
    JOIN vitimas v ON v.id = a.vitima_id
    ${cond}
    ORDER BY a.resolvido, a.criado_em DESC`);
  res.json(r.rows);
}));

router.post('/', wrap(async (req, res) => {
  const { vitima_id, tipo, severidade, mensagem } = req.body;
  if (!vitima_id || !tipo || !severidade) return res.status(400).json({ erro: 'vitima_id, tipo e severidade sao obrigatorios' });
  const r = await query(
    `INSERT INTO alertas (vitima_id, tipo, severidade, mensagem) VALUES ($1,$2,$3::severidade,$4) RETURNING *`,
    [vitima_id, tipo, severidade, mensagem]
  );
  await registrar(req, 'criar', 'alerta', r.rows[0].id);
  res.status(201).json(r.rows[0]);
}));

// PATCH /api/alertas/:id/resolver
router.patch('/:id/resolver', wrap(async (req, res) => {
  const r = await query(
    `UPDATE alertas SET resolvido=TRUE, severidade='resolvido', resolvido_por=$1, resolvido_em=now()
     WHERE id=$2 AND resolvido=FALSE RETURNING *`,
    [req.usuario.id, req.params.id]
  );
  if (!r.rows[0]) return res.status(404).json({ erro: 'Alerta nao encontrado ou ja resolvido' });
  await registrar(req, 'resolver alerta', 'alerta', req.params.id);
  res.json(r.rows[0]);
}));

module.exports = router;
