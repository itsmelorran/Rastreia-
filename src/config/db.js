// Camada de acesso ao banco: cria o pool de conexoes e expoe um helper query().
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Erro inesperado no pool do Postgres:', err.message);
});

// Executa uma query parametrizada (protege contra SQL injection).
async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
