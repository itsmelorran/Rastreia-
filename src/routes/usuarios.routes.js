// CRUD de usuarios. Todas as rotas exigem papel de administrador (aplicado em app.js).
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { registrar } = require('../middlewares/auditoria');
const wrap = require('../utils/wrap');

router.get('/', wrap(async (req, res) => {
  const r = await query(
    'SELECT id, nome, email, papel, ativo, criado_em FROM usuarios ORDER BY nome'
  );
  res.json(r.rows);
}));

router.post('/', wrap(async (req, res) => {
  const { nome, email, senha, papel } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ erro: 'nome, email e senha sao obrigatorios' });
  const hash = await bcrypt.hash(senha, 10);
  const r = await query(
    `INSERT INTO usuarios (nome, email, senha_hash, papel)
     VALUES ($1,$2,$3,COALESCE($4::papel_usuario,'operador')) RETURNING id, nome, email, papel, ativo`,
    [nome, email, hash, papel]
  );
  await registrar(req, 'criar', 'usuario', r.rows[0].id, { email });
  res.status(201).json(r.rows[0]);
}));

router.put('/:id', wrap(async (req, res) => {
  const { nome, email, papel, ativo, senha } = req.body;
  let hashClause = '';
  const params = [nome, email, papel, ativo, req.params.id];
  if (senha) {
    const hash = await bcrypt.hash(senha, 10);
    hashClause = ', senha_hash = $6';
    params.push(hash);
  }
  const r = await query(
    `UPDATE usuarios SET nome=$1, email=$2, papel=$3::papel_usuario, ativo=$4 ${hashClause}
     WHERE id=$5 RETURNING id, nome, email, papel, ativo`,
    params
  );
  if (!r.rows[0]) return res.status(404).json({ erro: 'Usuario nao encontrado' });
  await registrar(req, 'editar', 'usuario', req.params.id);
  res.json(r.rows[0]);
}));

router.delete('/:id', wrap(async (req, res) => {
  if (Number(req.params.id) === req.usuario.id) {
    return res.status(400).json({ erro: 'Nao e possivel excluir o proprio usuario' });
  }
  const r = await query('UPDATE usuarios SET ativo=FALSE WHERE id=$1 RETURNING id', [req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ erro: 'Usuario nao encontrado' });
  await registrar(req, 'desativar', 'usuario', req.params.id);
  res.json({ ok: true });
}));

module.exports = router;
