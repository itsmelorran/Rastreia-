// CRUD de geo-cercas (zonas seguras e de risco).
const router = require('express').Router();
const { query } = require('../config/db');
const { registrar } = require('../middlewares/auditoria');
const wrap = require('../utils/wrap');

router.get('/', wrap(async (req, res) => {
  const r = await query(`
    SELECT g.id, g.nome, g.tipo, g.latitude, g.longitude, g.raio_metros, g.ativa,
           v.nome AS vitima_nome, v.id AS vitima_id
    FROM geocercas g
    JOIN vitimas v ON v.id = g.vitima_id
    WHERE v.excluido_em IS NULL
    ORDER BY g.tipo, g.nome`);
  res.json(r.rows);
}));

router.post('/', wrap(async (req, res) => {
  const { vitima_id, nome, tipo, latitude, longitude, raio_metros } = req.body;
  if (!vitima_id || !nome || !tipo) return res.status(400).json({ erro: 'vitima_id, nome e tipo sao obrigatorios' });
  const r = await query(
    `INSERT INTO geocercas (vitima_id, nome, tipo, latitude, longitude, raio_metros)
     VALUES ($1,$2,$3::tipo_geocerca,$4,$5,COALESCE($6,150)) RETURNING *`,
    [vitima_id, nome, tipo, latitude || 0, longitude || 0, raio_metros]
  );
  await registrar(req, 'criar', 'geocerca', r.rows[0].id);
  res.status(201).json(r.rows[0]);
}));

router.put('/:id', wrap(async (req, res) => {
  const { nome, tipo, latitude, longitude, raio_metros, ativa } = req.body;
  const r = await query(
    `UPDATE geocercas SET nome=$1, tipo=$2::tipo_geocerca, latitude=$3, longitude=$4, raio_metros=$5, ativa=COALESCE($6,ativa)
     WHERE id=$7 RETURNING *`,
    [nome, tipo, latitude, longitude, raio_metros, ativa, req.params.id]
  );
  if (!r.rows[0]) return res.status(404).json({ erro: 'Geo-cerca nao encontrada' });
  await registrar(req, 'editar', 'geocerca', req.params.id);
  res.json(r.rows[0]);
}));

router.delete('/:id', wrap(async (req, res) => {
  const r = await query('DELETE FROM geocercas WHERE id=$1 RETURNING id', [req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ erro: 'Geo-cerca nao encontrada' });
  await registrar(req, 'excluir', 'geocerca', req.params.id);
  res.json({ ok: true });
}));

module.exports = router;
