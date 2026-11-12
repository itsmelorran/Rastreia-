// Ponto de entrada. Sobe HTTP por padrao, ou HTTPS com a flag --https
// (HTTPS e necessario para o navegador do celular liberar o GPS fora de localhost).
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const app = require('./app');

const PORT = process.env.PORT || 3000;
const usarHttps = process.argv.includes('--https');

if (usarHttps) {
  const https = require('https');
  const certDir = path.join(__dirname, '..', 'certs');
  const key = path.join(certDir, 'key.pem');
  const cert = path.join(certDir, 'cert.pem');
  if (!fs.existsSync(key) || !fs.existsSync(cert)) {
    console.error('Certificado nao encontrado. Rode antes:  npm run cert');
    process.exit(1);
  }
  const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
  https.createServer({ key: fs.readFileSync(key), cert: fs.readFileSync(cert) }, app)
    .listen(HTTPS_PORT, () => {
      console.log(`Rastreia+ (HTTPS) em https://localhost:${HTTPS_PORT}`);
      console.log('No celular, acesse https://<IP-DO-SEU-PC>:' + HTTPS_PORT + '/tracker.html');
      console.log('(aceite o aviso de certificado — e autoassinado, e normal no ambiente de testes)');
    });
} else {
  app.listen(PORT, () => {
    console.log(`Rastreia+ (HTTP) em http://localhost:${PORT}`);
  });
}
