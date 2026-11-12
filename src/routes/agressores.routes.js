// CRUD de agressores (nao rastreados) + zona de restricao opcional.
const router = require('express').Router();
const { query } = require('../config/db');
const { registrar } = require('../middlewares/auditoria');
const wrap = require('../utils/wrap');

router.get('/', wrap(async (req, res) => {
  const r = await query(`
    SELECT a.id, a.nome, a.possui_medida_protetiva, a.numero_processo,
           v.nome AS vitima_nome, v.id AS vitima_id,
           z.raio_metros, z.descricao AS zona_descricao
    FROM agressores a
    JOIN vitimas v ON v.id = a.vitima_id
    LEFT JOIN LATERAL (SELECT raio_metros, descricao FROM zonas_restricao WHERE agressor_id = a.id ORDER BY id DESC LIMIT 1) z ON TRUE
    WHERE v.excluido_em IS NULL
    ORDER BY a.nome`);
  res.json(r.rows);
}));

router.post('/', wrap(async (req, res) => {
  const { vitima_id, nome, possui_medida_protetiva, numero_processo } = req.body;
  if (!vitima_id) return res.status(400).json({ erro: 'vitima_id e obrigatorio' });
  const r = await query(
    `INSERT INTO agressores (vitima_id, nome, possui_medida_protetiva, numero_processo)
     VALUES ($1,$2,COALESCE($3,FALSE),$4) RETURNING *`,
    [vitima_id, nome, possui_medida_protetiva, numero_processo]
  );
  await registrar(req, 'criar', 'agressor', r.rows[0].id);
  res.status(201).json(r.rows[0]);
}));

router.put('/:id', wrap(async (req, res) => {
  const { nome, possui_medida_protetiva, numero_processo } = req.body;
  const r = await query(
    `UPDATE agressores SET nome=$1, possui_medida_protetiva=$2, numero_processo=$3 WHERE id=$4 RETURNING *`,
    [nome, possui_medida_protetiva, numero_processo, req.params.id]
  );
  if (!r.rows[0]) return res.status(404).json({ erro: 'Agressor nao encontrado' });
  await registrar(req, 'editar', 'agressor', req.params.id);
  res.json(r.rows[0]);
}));

router.delete('/:id', wrap(async (req, res) => {
  const r = await query('DELETE FROM agressores WHERE id=$1 RETURNING id', [req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ erro: 'Agressor nao encontrado' });
  await registrar(req, 'excluir', 'agressor', req.params.id);
  res.json({ ok: true });
}));

module.exports = router;
