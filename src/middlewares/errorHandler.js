// Tratamento central de erros. Mantem as respostas em JSON e evita vazar stack trace.
function notFound(req, res) {
  res.status(404).json({ erro: 'Rota nao encontrada' });
}

function errorHandler(err, req, res, _next) {
  console.error('Erro:', err.message);
  // 23505 = violacao de unique no Postgres
  if (err.code === '23505') {
    return res.status(409).json({ erro: 'Registro duplicado', detalhe: err.detail });
  }
  res.status(err.status || 500).json({ erro: err.message || 'Erro interno' });
}

module.exports = { notFound, errorHandler };
