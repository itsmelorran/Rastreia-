// Leitura do log de auditoria (restrito a admin em app.js).
const router = require('express').Router();
const { query } = require('../config/db');
const wrap = require('../utils/wrap');

router.get('/', wrap(async (req, res) => {
  const r = await query(`
    SELECT a.id, a.acao, a.entidade, a.entidade_id, a.ip, a.detalhe, a.criado_em,
           u.nome AS usuario_nome, u.papel AS usuario_papel
    FROM auditoria a
    LEFT JOIN usuarios u ON u.id = a.usuario_id
    ORDER BY a.criado_em DESC
    LIMIT 200`);
  res.json(r.rows);
}));

module.exports = router;
