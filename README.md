# 🛡️ Rastreia+ — Central de Proteção

> Sistema web de apoio à **proteção de mulheres vítimas de violência**, com monitoramento consentido por geolocalização, geo-cercas, alertas em tempo real e um aplicativo Android que transforma o celular em dispositivo de rastreio.

Projeto acadêmico desenvolvido no contexto do tema *"O impacto dos meios tecnológicos na prevenção da violência contra a mulher no Brasil"*.

---

## 📌 Sobre o projeto

O **Rastreia+** é uma central de proteção que integra, em um único painel, os três lados do problema: a **vítima** (monitorada com consentimento), o **agressor** (cujo perímetro de restrição é registrado para gerar alertas) e a **equipe de segurança** (que recebe e trata as ocorrências).

Quando a vítima, por meio de seu dispositivo, entra em uma zona de risco, o sistema **gera um alerta automaticamente** e exibe sua localização no mapa em tempo real — reduzindo o intervalo entre a ameaça e a chegada do socorro.

> ⚠️ **Decisão ética e legal:** o agressor **não é rastreado**. Registra-se apenas a **zona de restrição** associada à medida protetiva. O monitoramento da vítima ocorre **somente com consentimento**, em conformidade com a Lei Maria da Penha (Lei nº 11.340/2006), a Lei de Perseguição (Lei nº 14.132/2021) e a LGPD (Lei nº 13.709/2018).

---

## ✨ Funcionalidades

- 🔐 **Login com autenticação** (JWT) e controle de acesso por papéis (operador / administrador)
- 👤 **Cadastro de vítimas**, com registro de consentimento
- ⚠️ **Cadastro de agressores** e zonas de restrição (sem rastreá-los)
- 📱 **Cadastro de dispositivos** de rastreio, com token de acesso por aparelho
- 📍 **Geo-cercas**: zonas seguras e zonas de risco
- 🗺️ **Mapa em tempo real** com a localização das vítimas (Leaflet + OpenStreetMap)
- 🚨 **Alertas automáticos** por proximidade (entrada em zona de risco / saída de zona segura)
- 📊 **Relatórios** exportáveis em CSV e PDF (por período, data, vítima ou agressor)
- 👥 **Gestão de usuários** da central
- 🧾 **Auditoria** de ações sensíveis (exigência da LGPD)

---

## 🧰 Tecnologias utilizadas

**Back-end**
- [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/)
- [PostgreSQL](https://www.postgresql.org/)
- JWT (autenticação) · bcrypt (hash de senhas) · Helmet · Rate-limit

**Front-end**
- HTML, CSS e JavaScript
- [Leaflet](https://leafletjs.com/) + [OpenStreetMap](https://www.openstreetmap.org/) (mapa)

**Dispositivo (vítima)**
- Aplicativo Android desenvolvido no [Kodular](https://www.kodular.io/), que envia as coordenadas do GPS ao sistema
- Simulador de dispositivo em Node.js (para testes)

---

## 🚀 Como executar

### Pré-requisitos
- Node.js 18+
- PostgreSQL 14+

### Passos
```bash
# 1. Instalar as dependências
npm install

# 2. Criar o banco de dados
createdb rastreia

# 3. Configurar as variáveis de ambiente
cp .env.example .env     # ajuste DATABASE_URL e JWT_SECRET

# 4. Criar as tabelas e popular com dados de exemplo
npm run db:setup

# 5. Iniciar o servidor
npm run dev
```

Acesse **http://localhost:3000**

**Login de exemplo (criado pelo seed):**

| Papel | E-mail | Senha |
|-------|--------|-------|
| Administrador | ana.operadora@central.gov.br | 123456 |
| Operador | bruno.l@central.gov.br | 123456 |

---

## 📱 Usando o celular como dispositivo

Como o dispositivo físico ainda não existe, o **celular faz o papel dele**: um app (Kodular) lê o GPS do aparelho e envia a localização ao sistema. Ao cadastrar um dispositivo, a central gera um **token** usado pelo app para se autenticar. Quando a vítima entra em uma zona de risco, o alerta dispara automaticamente.

> Para testar sem o celular, use o simulador: `node simulador/dispositivo.js SEU_TOKEN`

---

## 🔒 Segurança e privacidade

- Senhas armazenadas com **hash (bcrypt)** — nunca em texto puro
- Autenticação por **JWT** e rotas protegidas por middleware
- **Controle de acesso por papéis** (RBAC)
- **Consultas parametrizadas** (proteção contra SQL Injection)
- **Auditoria** de acessos a dados sensíveis (LGPD)
- Consentimento obrigatório para vincular um dispositivo a uma vítima

---

## 🗺️ Próximos passos

- [ ] Desenvolvimento de um **dispositivo físico** de alerta para a vítima
- [ ] Monitoramento integrado da **tornozeleira eletrônica** do agressor
- [ ] Atualização em tempo real via **WebSocket**
- [ ] Geração de relatórios com mais indicadores
- [ ] Testes automatizados

---

## 👩‍💻 Autoria

Projeto acadêmico desenvolvido por Sthefanie Sousa e Sergio Gabriel.
Orientação: Augusto Bahia
Instituição: Universidade da Amazônia (UNAMA)

---

## 📄 Licença

Projeto de caráter **acadêmico e educacional**. Utilize apenas dados fictícios.

