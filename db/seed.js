// Popula o banco com um usuario admin e dados ficticios para demonstracao.
// Rode com: npm run db:seed   (depois de npm run db:schema)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../src/config/db');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ---- Usuarios ----
    const adminEmail = process.env.ADMIN_EMAIL || 'ana.operadora@central.gov.br';
    const adminSenha = process.env.ADMIN_SENHA || '123456';
    const adminHash = await bcrypt.hash(adminSenha, 10);
    const opHash = await bcrypt.hash('123456', 10);

    const admin = await client.query(
      `INSERT INTO usuarios (nome, email, senha_hash, papel)
       VALUES ($1, $2, $3, 'admin') RETURNING id`,
      ['Ana Nunes', adminEmail, adminHash]
    );
    const adminId = admin.rows[0].id;

    await client.query(
      `INSERT INTO usuarios (nome, email, senha_hash, papel)
       VALUES ($1, $2, $3, 'operador')`,
      ['Bruno Lima', 'bruno.l@central.gov.br', opHash]
    );

    // ---- Vitimas ----
    const vitimas = [
      ['Maria Silva', '123.456.789-09', '(11) 90000-0001', 'ativa'],
      ['Ana Costa', '987.654.321-21', '(11) 90000-0002', 'ativa'],
      ['Carla Mendes', '456.789.123-77', '(11) 90000-0003', 'ativa'],
      ['Julia Rocha', '321.654.987-44', '(11) 90000-0004', 'ativa'],
    ];
    const vitimaIds = [];
    for (const [nome, cpf, tel, status] of vitimas) {
      const r = await client.query(
        `INSERT INTO vitimas (nome, cpf, telefone, status, criado_por)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [nome, cpf, tel, status, adminId]
      );
      vitimaIds.push(r.rows[0].id);
    }

    // ---- Consentimentos (as 3 primeiras consentiram) ----
    for (let i = 0; i < 3; i++) {
      await client.query(
        `INSERT INTO consentimentos (vitima_id, concedido, forma, registrado_por)
         VALUES ($1, TRUE, 'termo assinado', $2)`,
        [vitimaIds[i], adminId]
      );
    }

    // ---- Agressores ----
    const ag1 = await client.query(
      `INSERT INTO agressores (vitima_id, nome, possui_medida_protetiva, numero_processo)
       VALUES ($1,'Joao P.', TRUE, '0001234-55.2026.8.26.0100') RETURNING id`,
      [vitimaIds[0]]
    );
    await client.query(
      `INSERT INTO zonas_restricao (agressor_id, descricao, latitude, longitude, raio_metros)
       VALUES ($1, 'Residencia da vitima', -23.5610000, -46.6560000, 300)`,
      [ag1.rows[0].id]
    );
    await client.query(
      `INSERT INTO agressores (vitima_id, nome, possui_medida_protetiva)
       VALUES ($1, 'Carlos M.', TRUE)`,
      [vitimaIds[1]]
    );

    // ---- Dispositivos (com token aleatorio) ----
    const token = () => crypto.randomBytes(24).toString('hex');
    const disp = [
      [vitimaIds[0], 'DEV-00123', 'Samsung A15', true, 78],
      [vitimaIds[1], 'DEV-00088', 'Moto G54', true, 19],
      [vitimaIds[2], 'DEV-00054', 'Xiaomi 13', false, null],
    ];
    const dispIds = [];
    for (const [vid, ident, modelo, online, bat] of disp) {
      const r = await client.query(
        `INSERT INTO dispositivos (vitima_id, identificador, token_acesso, modelo, online, ultimo_ping, bateria)
         VALUES ($1,$2,$3,$4,$5, now(), $6) RETURNING id`,
        [vid, ident, token(), modelo, online, bat]
      );
      dispIds.push(r.rows[0].id);
    }

    // ---- Geo-cercas ----
    await client.query(
      `INSERT INTO geocercas (vitima_id, nome, tipo, latitude, longitude, raio_metros)
       VALUES ($1,'Casa','segura',-23.5500000,-46.6330000,150),
              ($2,'Trabalho','segura',-23.5630000,-46.6540000,200),
              ($1,'Zona do agressor','risco',-23.5610000,-46.6560000,3)`,
      [vitimaIds[0], vitimaIds[1]]
    );

    // ---- Localizacoes + alertas ----
    const loc = await client.query(
      `INSERT INTO localizacoes (dispositivo_id, latitude, longitude, precisao_m, bateria)
       VALUES ($1, -23.5608000, -46.6558000, 5, 78) RETURNING id`,
      [dispIds[0]]
    );
    await client.query(
      `INSERT INTO alertas (vitima_id, tipo, severidade, mensagem, localizacao_id)
       VALUES ($1,'proximidade','critico','Maria Silva entrou na zona de risco (300m)', $2)`,
      [vitimaIds[0], loc.rows[0].id]
    );
    await client.query(
      `INSERT INTO alertas (vitima_id, tipo, severidade, mensagem)
       VALUES ($1,'geocerca','alto','Ana Costa saiu da zona segura'),
              ($2,'offline','atencao','Dispositivo de Carla Mendes offline ha 30 min')`,
      [vitimaIds[1], vitimaIds[2]]
    );
    await client.query(
      `INSERT INTO alertas (vitima_id, tipo, severidade, mensagem, resolvido, resolvido_por, resolvido_em)
       VALUES ($1,'panico','resolvido','Julia Rocha acionou panico - equipe acionada', TRUE, $2, now())`,
      [vitimaIds[3], adminId]
    );

    await client.query('COMMIT');
    console.log('Seed concluido com sucesso.');
    console.log(`Login admin: ${adminEmail} / ${adminSenha}`);
    console.log('Login operador: bruno.l@central.gov.br / 123456');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Falha no seed:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
