// Monta a aplicacao Express: seguranca, rotas da API e arquivos estaticos do front.
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const { autenticar, exigirAdmin } = require('./middlewares/auth');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false })); // CSP desligada para servir o front simples
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Limita tentativas de login (protege contra forca bruta).
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

// ---- Rotas publicas ----
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/localizacoes', require('./routes/localizacoes.routes')); // autenticacao por token de dispositivo

// ---- Rotas protegidas (exigem login) ----
app.use('/api/dashboard', autenticar, require('./routes/dashboard.routes'));
app.use('/api/mapa', autenticar, require('./routes/mapa.routes'));
app.use('/api/relatorios', autenticar, require('./routes/relatorios.routes'));
app.use('/api/vitimas', autenticar, require('./routes/vitimas.routes'));
app.use('/api/agressores', autenticar, require('./routes/agressores.routes'));
app.use('/api/dispositivos', autenticar, require('./routes/dispositivos.routes'));
app.use('/api/geocercas', autenticar, require('./routes/geocercas.routes'));
app.use('/api/alertas', autenticar, require('./routes/alertas.routes'));

// ---- Rotas restritas a administradores ----
app.use('/api/usuarios', autenticar, exigirAdmin, require('./routes/usuarios.routes'));
app.use('/api/auditoria', autenticar, exigirAdmin, require('./routes/auditoria.routes'));

// ---- Front-end estatico ----
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', notFound);
app.use(errorHandler);

module.exports = app;
