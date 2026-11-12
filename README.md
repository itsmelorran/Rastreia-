# Rastreia+ — Central de proteção a vítimas

Sistema web de apoio ao monitoramento consentido de vítimas de violência, com login,
cadastro de vítimas, agressores (apenas zona de restrição), dispositivos, geo-cercas,
alertas, relatórios (CSV/PDF), usuários e auditoria (LGPD). Inclui **mapa real** e a
possibilidade de usar **um celular como dispositivo de rastreio** (GPS do navegador).

Stack: **Node.js + Express + PostgreSQL**, front-end em HTML/CSS/JS + **Leaflet** (mapa).

> Projeto acadêmico (TCC). Use apenas dados fictícios. O agressor **não é rastreado**:
> registra-se somente a zona de restrição definida por medida protetiva.

---

## 1. Pré-requisitos
- Node.js 18+ (recomendado 20/22)
- PostgreSQL 14+ rodando localmente

## 2. Instalação
```bash
npm install
createdb rastreia                # ou CREATE DATABASE rastreia; no psql
cp .env.example .env             # ajuste DATABASE_URL e JWT_SECRET
npm run db:setup                 # cria tabelas + dados de exemplo
npm run dev                      # http://localhost:3000
```

### Logins criados pelo seed
| Papel | E-mail | Senha |
|-------|--------|-------|
| Administrador | ana.operadora@central.gov.br | 123456 |
| Operador | bruno.l@central.gov.br | 123456 |

(Usuários e Auditoria só aparecem para o administrador.)

---

## 3. Mapa em tempo real
O mapa usa **Leaflet + OpenStreetMap** (gratuito, sem chave de API). Ele mostra:
- a última localização de cada vítima (verde = OK, **vermelho = em alerta**);
- as geo-cercas (círculo verde = zona segura, **vermelho tracejado = zona de risco**);
- atualização automática a cada 8 segundos.

### Trocar pelo Google Maps (opcional)
Se o orientador exigir o Google Maps, obtenha uma chave em console.cloud.google.com
(Maps JavaScript API) e substitua, em `public/app.js`, o bloco `L.tileLayer(...)` pela
camada do Google. O restante da lógica (marcadores, geo-cercas, alertas) continua igual.
O Leaflet é a opção recomendada porque funciona hoje, sem cadastro nem faturamento.

---

## 4. Usar o celular como dispositivo de rastreio

Como ainda não existe o dispositivo físico, o **celular faz o papel dele**: o navegador
do celular lê o GPS real e envia para a central. Quando o celular entra numa zona de
risco, o sistema gera o alerta e o mapa mostra a vítima em vermelho.

> O GPS do navegador só é liberado em **HTTPS** (ou em localhost). Por isso, para o
> celular enviar a posição, rode o servidor em HTTPS:

```bash
npm run cert          # gera um certificado autoassinado (uma vez)
npm run dev:https     # sobe em https://localhost:3443
```

Passo a passo da demonstração:
1. No sistema (no PC), vá em **Dispositivos → Registrar dispositivo** e vincule a uma
   vítima **com consentimento ativo**. Aparece um **QR code** e um **link do rastreador**.
2. Descubra o IP do seu PC na rede (ex.: `ipconfig` no Windows → algo como `192.168.0.10`).
3. No **celular**, na mesma rede Wi-Fi, abra:
   `https://192.168.0.10:3443/tracker.html?token=SEU_TOKEN`
   (ou escaneie o QR). Aceite o aviso de certificado (é autoassinado, normal em teste).
4. Toque em **Autorizar e iniciar** e permita a localização.
5. Volte ao sistema no PC: o celular aparece no mapa. Se ele estiver dentro de uma
   geo-cerca de risco, dispara o **alerta** e o marcador fica **vermelho**.

### Alternativa sem celular: simulador
```bash
node simulador/dispositivo.js SEU_TOKEN
```
Envia coordenadas automaticamente a cada 10s (útil para testar sem o celular).

---

## 5. Relatórios (download)
Na tela **Relatórios → Gerar relatório** você escolhe:
- **filtro**: por período, por data, por vítima ou por agressor;
- **formato**: CSV (abre no Excel) ou PDF.

O arquivo é gerado no back-end e baixado na hora.

---

## 6. Estrutura do projeto
```
rastreia-plus/
├── db/            schema.sql + seed.js
├── scripts/       gerar-certificado.js (HTTPS do celular)
├── simulador/     dispositivo.js (envia GPS de teste)
├── src/
│   ├── config/    db.js (pool Postgres)
│   ├── middlewares/ auth (JWT/RBAC), auditoria, erros
│   ├── routes/    auth, dashboard, mapa, relatorios, vitimas,
│   │              agressores, dispositivos, geocercas, alertas,
│   │              usuarios, auditoria, localizacoes
│   ├── app.js     monta o Express
│   └── server.js  sobe HTTP (ou HTTPS com --https)
├── public/        front-end (index.html, app.js, styles.css,
│                  tracker.html, vendor/leaflet)
└── .env.example
```

## 7. Principais endpoints
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/login` | Login (JWT) |
| GET | `/api/dashboard` | Números-resumo |
| GET | `/api/mapa` | Vítimas (última posição) + geo-cercas |
| GET | `/api/relatorios?formato=csv\|pdf&de=&ate=&vitima_id=&agressor_id=` | Download do relatório |
| CRUD | `/api/vitimas` `/api/agressores` `/api/dispositivos` `/api/geocercas` | Cadastros |
| GET/POST, PATCH `/:id/resolver` | `/api/alertas` | Alertas |
| GET | `/api/dispositivos/:id/tracker` | Token p/ abrir o rastreador |
| CRUD | `/api/usuarios` (admin) · GET `/api/auditoria` (admin) | Usuários / auditoria |
| POST | `/api/localizacoes` | Recebe GPS (header `X-Device-Token`) |

## 8. Segurança
Senhas em hash (bcrypt), JWT, RBAC (admin × operador), queries parametrizadas,
rate-limit no login, helmet, auditoria de ações (LGPD) e consentimento obrigatório
para vincular dispositivo.

## 9. Próximos passos sugeridos
- Mapa com Google Maps (se exigido) — ver seção 3.
- WebSocket para atualização instantânea (hoje é a cada 8s por polling).
- App Android nativo no lugar do navegador (mesmo conceito, via FusedLocationProvider).
- Testes automatizados (Jest + Supertest).
