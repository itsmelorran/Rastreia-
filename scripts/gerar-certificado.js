// Gera um certificado HTTPS autoassinado em certs/ (para o GPS do navegador funcionar no celular).
// Uso: npm run cert
const fs = require('fs');
const path = require('path');
const selfsigned = require('selfsigned');

const dir = path.join(__dirname, '..', 'certs');
fs.mkdirSync(dir, { recursive: true });

const attrs = [{ name: 'commonName', value: 'rastreia-plus.local' }];
const pems = selfsigned.generate(attrs, {
  days: 365,
  keySize: 2048,
  algorithm: 'sha256',
  extensions: [{ name: 'basicConstraints', cA: true }],
});

fs.writeFileSync(path.join(dir, 'key.pem'), pems.private);
fs.writeFileSync(path.join(dir, 'cert.pem'), pems.cert);
console.log('Certificado gerado em certs/. Agora rode: npm run dev:https');
