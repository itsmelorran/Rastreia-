-- ============================================================
--  RASTREIA+  ·  Esquema do banco de dados (PostgreSQL)
--  Recria as tabelas do zero. Rode com: npm run db:schema
-- ============================================================

DROP TABLE IF EXISTS auditoria       CASCADE;
DROP TABLE IF EXISTS alertas         CASCADE;
DROP TABLE IF EXISTS localizacoes    CASCADE;
DROP TABLE IF EXISTS geocercas       CASCADE;
DROP TABLE IF EXISTS dispositivos    CASCADE;
DROP TABLE IF EXISTS zonas_restricao CASCADE;
DROP TABLE IF EXISTS agressores      CASCADE;
DROP TABLE IF EXISTS consentimentos  CASCADE;
DROP TABLE IF EXISTS vitimas         CASCADE;
DROP TABLE IF EXISTS usuarios        CASCADE;

DROP TYPE IF EXISTS papel_usuario;
DROP TYPE IF EXISTS severidade;
DROP TYPE IF EXISTS tipo_geocerca;
DROP TYPE IF EXISTS status_vitima;

CREATE TYPE papel_usuario AS ENUM ('operador', 'admin');
CREATE TYPE severidade    AS ENUM ('critico', 'alto', 'atencao', 'resolvido');
CREATE TYPE tipo_geocerca AS ENUM ('segura', 'risco');
CREATE TYPE status_vitima AS ENUM ('ativa', 'inativa', 'arquivada');

-- ---------- Usuarios da central (operadores / admin) ----------
CREATE TABLE usuarios (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(120) NOT NULL,
    email       VARCHAR(160) UNIQUE NOT NULL,
    senha_hash  VARCHAR(255) NOT NULL,
    papel       papel_usuario NOT NULL DEFAULT 'operador',
    ativo       BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Vitimas monitoradas ----------
CREATE TABLE vitimas (
    id                 SERIAL PRIMARY KEY,
    nome               VARCHAR(120) NOT NULL,
    cpf                VARCHAR(14),
    telefone           VARCHAR(20),
    contato_emergencia VARCHAR(160),
    status             status_vitima NOT NULL DEFAULT 'ativa',
    observacoes        TEXT,
    criado_por         INT REFERENCES usuarios(id),
    criado_em          TIMESTAMPTZ NOT NULL DEFAULT now(),
    excluido_em        TIMESTAMPTZ
);

-- ---------- Consentimento de rastreio ----------
CREATE TABLE consentimentos (
    id                 SERIAL PRIMARY KEY,
    vitima_id          INT NOT NULL REFERENCES vitimas(id) ON DELETE CASCADE,
    concedido          BOOLEAN NOT NULL DEFAULT TRUE,
    forma              VARCHAR(80),
    documento_url      VARCHAR(255),
    registrado_por     INT REFERENCES usuarios(id),
    data_consentimento TIMESTAMPTZ NOT NULL DEFAULT now(),
    revogado_em        TIMESTAMPTZ
);

-- ---------- Agressores (nao rastreados) ----------
CREATE TABLE agressores (
    id                      SERIAL PRIMARY KEY,
    vitima_id               INT NOT NULL REFERENCES vitimas(id) ON DELETE CASCADE,
    nome                    VARCHAR(120),
    possui_medida_protetiva BOOLEAN DEFAULT FALSE,
    numero_processo         VARCHAR(60),
    observacoes             TEXT,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Zonas de restricao (perimetro proibido ao agressor) ----------
CREATE TABLE zonas_restricao (
    id          SERIAL PRIMARY KEY,
    agressor_id INT NOT NULL REFERENCES agressores(id) ON DELETE CASCADE,
    descricao   VARCHAR(160),
    latitude    NUMERIC(10,7) NOT NULL,
    longitude   NUMERIC(10,7) NOT NULL,
    raio_metros INT NOT NULL DEFAULT 300,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Dispositivos de rastreio ----------
CREATE TABLE dispositivos (
    id            SERIAL PRIMARY KEY,
    vitima_id     INT NOT NULL REFERENCES vitimas(id) ON DELETE CASCADE,
    identificador VARCHAR(80) UNIQUE NOT NULL,
    token_acesso  VARCHAR(255) UNIQUE NOT NULL,
    modelo        VARCHAR(80),
    online        BOOLEAN NOT NULL DEFAULT FALSE,
    ultimo_ping   TIMESTAMPTZ,
    bateria       SMALLINT,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Geo-cercas (zonas seguras e de risco) ----------
CREATE TABLE geocercas (
    id          SERIAL PRIMARY KEY,
    vitima_id   INT NOT NULL REFERENCES vitimas(id) ON DELETE CASCADE,
    nome        VARCHAR(120) NOT NULL,
    tipo        tipo_geocerca NOT NULL,
    latitude    NUMERIC(10,7) NOT NULL,
    longitude   NUMERIC(10,7) NOT NULL,
    raio_metros INT NOT NULL DEFAULT 150,
    ativa       BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Localizacoes recebidas dos dispositivos ----------
CREATE TABLE localizacoes (
    id             BIGSERIAL PRIMARY KEY,
    dispositivo_id INT NOT NULL REFERENCES dispositivos(id) ON DELETE CASCADE,
    latitude       NUMERIC(10,7) NOT NULL,
    longitude      NUMERIC(10,7) NOT NULL,
    precisao_m     NUMERIC(6,2),
    bateria        SMALLINT,
    registrado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_loc_disp_tempo ON localizacoes (dispositivo_id, registrado_em DESC);

-- ---------- Alertas ----------
CREATE TABLE alertas (
    id             SERIAL PRIMARY KEY,
    vitima_id      INT NOT NULL REFERENCES vitimas(id) ON DELETE CASCADE,
    tipo           VARCHAR(60) NOT NULL,
    severidade     severidade NOT NULL,
    mensagem       TEXT,
    localizacao_id BIGINT REFERENCES localizacoes(id),
    resolvido      BOOLEAN NOT NULL DEFAULT FALSE,
    resolvido_por  INT REFERENCES usuarios(id),
    resolvido_em   TIMESTAMPTZ,
    criado_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_alertas_abertos ON alertas (resolvido, criado_em DESC);

-- ---------- Auditoria (LGPD) ----------
CREATE TABLE auditoria (
    id          BIGSERIAL PRIMARY KEY,
    usuario_id  INT REFERENCES usuarios(id),
    acao        VARCHAR(60) NOT NULL,
    entidade    VARCHAR(60),
    entidade_id INT,
    ip          VARCHAR(45),
    detalhe     JSONB,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_auditoria_tempo ON auditoria (criado_em DESC);
