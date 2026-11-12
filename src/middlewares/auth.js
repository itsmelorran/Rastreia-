// Autenticacao por JWT e controle de acesso por papel (RBAC).
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev-secret';
const EXPIRES = process.env.JWT_EXPIRES || '8h';

function assinarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, nome: usuario.nome, papel: usuario.papel },
    SECRET,
    { expiresIn: EXPIRES }
  );
}

// Exige um token valido. Le do header Authorization: Bearer <token> ou do cookie.
function autenticar(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ')
    ? header.slice(7)
    : (req.cookies && req.cookies.token);

  if (!token) return res.status(401).json({ erro: 'Nao autenticado' });

  try {
    req.usuario = jwt.verify(token, SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ erro: 'Token invalido ou expirado' });
  }
}

// Exige papel de administrador.
function exigirAdmin(req, res, next) {
  if (!req.usuario || req.usuario.papel !== 'admin') {
    return res.status(403).json({ erro: 'Acesso restrito a administradores' });
  }
  next();
}

module.exports = { assinarToken, autenticar, exigirAdmin, SECRET };
