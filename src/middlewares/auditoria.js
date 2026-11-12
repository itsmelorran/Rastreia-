// Registra uma acao sensivel na tabela de auditoria (exigencia de LGPD).
const { query } = require('../config/db');

async function registrar(req, acao, entidade, entidadeId, detalhe) {
  try {
    await query(
      `INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, ip, detalhe)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        req.usuario ? req.usuario.id : null,
        acao,
        entidade || null,
        entidadeId || null,
        req.ip,
        detalhe ? JSON.stringify(detalhe) : null,
      ]
    );
  } catch (e) {
    // Auditoria nao deve derrubar a requisicao principal; apenas loga.
    console.error('Falha ao registrar auditoria:', e.message);
  }
}

module.exports = { registrar };
