// Rotas de autenticacao: login e dados do usuario logado.
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { assinarToken, autenticar } = require('../middlewares/auth');
const { registrar } = require('../middlewares/auditoria');
const wrap = require('../utils/wrap');

// POST /api/auth/login
router.post('/login', wrap(async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: 'Informe email e senha' });

  const r = await query('SELECT * FROM usuarios WHERE email = $1 AND ativo = TRUE', [email]);
  const usuario = r.rows[0];
  if (!usuario) return res.status(401).json({ erro: 'Credenciais invalidas' });

  const ok = await bcrypt.compare(senha, usuario.senha_hash);
  if (!ok) return res.status(401).json({ erro: 'Credenciais invalidas' });

  const token = assinarToken(usuario);
  req.usuario = usuario;
  await registrar(req, 'login', 'usuario', usuario.id);

  res.json({
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel },
  });
}));

// GET /api/auth/me
router.get('/me', autenticar, (req, res) => {
  res.json({ usuario: req.usuario });
});

module.exports = router;
