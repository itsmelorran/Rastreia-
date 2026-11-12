// Numeros-resumo do dashboard.
const router = require('express').Router();
const { query } = require('../config/db');
const wrap = require('../utils/wrap');

router.get('/', wrap(async (req, res) => {
  const r = await query(`
    SELECT
      (SELECT COUNT(*) FROM vitimas WHERE excluido_em IS NULL AND status='ativa') AS vitimas_ativas,
      (SELECT COUNT(DISTINCT a.vitima_id) FROM agressores a WHERE a.possui_medida_protetiva) AS casos_com_medida,
      (SELECT COUNT(*) FROM dispositivos WHERE online) AS dispositivos_online,
      (SELECT COUNT(*) FROM alertas WHERE resolvido=FALSE AND criado_em::date = CURRENT_DATE) AS alertas_hoje
  `);
  res.json(r.rows[0]);
}));

module.exports = router;
