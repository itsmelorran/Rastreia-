// CRUD de dispositivos. O token de acesso e gerado no cadastro e usado pelo app simulador.
const router = require('express').Router();
const crypto = require('crypto');
const { query } = require('../config/db');
const { registrar } = require('../middlewares/auditoria');
const wrap = require('../utils/wrap');

router.get('/', wrap(async (req, res) => {
  const r = await query(`
    SELECT d.id, d.identificador, d.modelo, d.online, d.ultimo_ping, d.bateria,
           v.nome AS vitima_nome, v.id AS vitima_id
    FROM dispositivos d
    JOIN vitimas v ON v.id = d.vitima_id
    WHERE v.excluido_em IS NULL
    ORDER BY d.identificador`);
  res.json(r.rows);
}));

router.post('/', wrap(async (req, res) => {
  const { vitima_id, identificador, modelo } = req.body;
  if (!vitima_id || !identificador) return res.status(400).json({ erro: 'vitima_id e identificador sao obrigatorios' });

  // Regra de negocio: so vincula se a vitima tiver consentimento ativo.
  const c = await query(
    `SELECT 1 FROM consentimentos WHERE vitima_id=$1 AND concedido=TRUE AND revogado_em IS NULL LIMIT 1`,
    [vitima_id]
  );
  if (!c.rows[0]) return res.status(422).json({ erro: 'Vitima sem consentimento ativo de rastreio' });

  const token = crypto.randomBytes(24).toString('hex');
  const r = await query(
    `INSERT INTO dispositivos (vitima_id, identificador, token_acesso, modelo)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [vitima_id, identificador, token, modelo]
  );
  await registrar(req, 'criar', 'dispositivo', r.rows[0].id);
  res.status(201).json(r.rows[0]); // retorna o token so neste momento
}));

// GET /api/dispositivos/:id/tracker  -> token para abrir o rastreador no celular
router.get('/:id/tracker', wrap(async (req, res) => {
  const r = await query('SELECT token_acesso FROM dispositivos WHERE id=$1', [req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ erro: 'Dispositivo nao encontrado' });
  res.json({ token: r.rows[0].token_acesso });
}));

router.delete('/:id', wrap(async (req, res) => {
  const r = await query('DELETE FROM dispositivos WHERE id=$1 RETURNING id', [req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ erro: 'Dispositivo nao encontrado' });
  await registrar(req, 'excluir', 'dispositivo', req.params.id);
  res.json({ ok: true });
}));

module.exports = router;
