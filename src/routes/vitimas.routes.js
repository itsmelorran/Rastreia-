// CRUD de vitimas. Exclusao e logica (soft delete).
const router = require('express').Router();
const { query } = require('../config/db');
const { registrar } = require('../middlewares/auditoria');
const wrap = require('../utils/wrap');

const LIST_SQL = `
  SELECT v.id, v.nome, v.cpf, v.telefone, v.status, v.criado_em,
         COALESCE(c.concedido, FALSE) AS consentimento,
         d.online AS dispositivo_online,
         (d.id IS NOT NULL) AS tem_dispositivo
  FROM vitimas v
  LEFT JOIN LATERAL (
    SELECT concedido FROM consentimentos
    WHERE vitima_id = v.id AND revogado_em IS NULL
    ORDER BY data_consentimento DESC LIMIT 1
  ) c ON TRUE
  LEFT JOIN LATERAL (
    SELECT id, online FROM dispositivos WHERE vitima_id = v.id ORDER BY id DESC LIMIT 1
  ) d ON TRUE
  WHERE v.excluido_em IS NULL
  ORDER BY v.nome`;

// GET /api/vitimas
router.get('/', wrap(async (req, res) => {
  const r = await query(LIST_SQL);
  res.json(r.rows);
}));

// GET /api/vitimas/:id
router.get('/:id', wrap(async (req, res) => {
  const r = await query('SELECT * FROM vitimas WHERE id = $1 AND excluido_em IS NULL', [req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ erro: 'Vitima nao encontrada' });
  await registrar(req, 'visualizar', 'vitima', req.params.id);
  res.json(r.rows[0]);
}));

// POST /api/vitimas
router.post('/', wrap(async (req, res) => {
  const { nome, cpf, telefone, contato_emergencia, status, observacoes } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome e obrigatorio' });
  const r = await query(
    `INSERT INTO vitimas (nome, cpf, telefone, contato_emergencia, status, observacoes, criado_por)
     VALUES ($1,$2,$3,$4,COALESCE($5::status_vitima,'ativa'),$6,$7) RETURNING *`,
    [nome, cpf, telefone, contato_emergencia, status, observacoes, req.usuario.id]
  );
  await registrar(req, 'criar', 'vitima', r.rows[0].id, { nome });
  res.status(201).json(r.rows[0]);
}));

// PUT /api/vitimas/:id
router.put('/:id', wrap(async (req, res) => {
  const { nome, cpf, telefone, contato_emergencia, status, observacoes } = req.body;
  const r = await query(
    `UPDATE vitimas SET nome=$1, cpf=$2, telefone=$3, contato_emergencia=$4, status=$5::status_vitima, observacoes=$6
     WHERE id=$7 AND excluido_em IS NULL RETURNING *`,
    [nome, cpf, telefone, contato_emergencia, status, observacoes, req.params.id]
  );
  if (!r.rows[0]) return res.status(404).json({ erro: 'Vitima nao encontrada' });
  await registrar(req, 'editar', 'vitima', req.params.id);
  res.json(r.rows[0]);
}));

// DELETE /api/vitimas/:id  (soft delete)
router.delete('/:id', wrap(async (req, res) => {
  const r = await query(
    'UPDATE vitimas SET excluido_em = now() WHERE id=$1 AND excluido_em IS NULL RETURNING id',
    [req.params.id]
  );
  if (!r.rows[0]) return res.status(404).json({ erro: 'Vitima nao encontrada' });
  await registrar(req, 'excluir', 'vitima', req.params.id);
  res.json({ ok: true });
}));

module.exports = router;
