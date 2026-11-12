// Geracao e download de relatorios de alertas, filtrados por periodo/data/vitima/agressor.
// Formatos: CSV (abre no Excel) e PDF.
const router = require('express').Router();
const PDFDocument = require('pdfkit');
const { query } = require('../config/db');
const { registrar } = require('../middlewares/auditoria');
const wrap = require('../utils/wrap');

// Monta a consulta de alertas aplicando os filtros recebidos.
async function buscarDados(q) {
  const cond = [];
  const params = [];
  if (q.de)        { params.push(q.de);        cond.push(`a.criado_em >= $${params.length}`); }
  if (q.ate)       { params.push(q.ate);       cond.push(`a.criado_em < ($${params.length}::date + interval '1 day')`); }
  if (q.vitima_id) { params.push(q.vitima_id); cond.push(`a.vitima_id = $${params.length}`); }
  if (q.agressor_id) {
    params.push(q.agressor_id);
    cond.push(`a.vitima_id = (SELECT vitima_id FROM agressores WHERE id = $${params.length})`);
  }
  const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
  const r = await query(`
    SELECT a.id, a.tipo, a.severidade, a.mensagem, a.resolvido, a.criado_em,
           v.nome AS vitima_nome
    FROM alertas a
    JOIN vitimas v ON v.id = a.vitima_id
    ${where}
    ORDER BY a.criado_em DESC`, params);
  return r.rows;
}

function periodoTexto(q) {
  if (q.vitima_nome) return 'Vítima: ' + q.vitima_nome;
  if (q.agressor_nome) return 'Agressor: ' + q.agressor_nome;
  if (q.de || q.ate) return `Período: ${q.de || '...'} até ${q.ate || '...'}`;
  return 'Todos os registros';
}

// GET /api/relatorios?formato=csv|pdf&de=&ate=&vitima_id=&agressor_id=
router.get('/', wrap(async (req, res) => {
  const q = req.query;
  const dados = await buscarDados(q);
  await registrar(req, 'exportar', 'relatorio', null, { formato: q.formato, filtros: q });
  const nomeBase = 'relatorio-rastreia-' + new Date().toISOString().slice(0, 10);

  if (q.formato === 'pdf') {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeBase}.pdf"`);
    doc.pipe(res);

    doc.fontSize(18).fillColor('#17202e').text('Rastreia+ — Relatório de alertas', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#64748b').text(periodoTexto(q));
    doc.text('Gerado em: ' + new Date().toLocaleString('pt-BR'));
    doc.text('Total de registros: ' + dados.length);
    doc.moveDown(0.8);

    // Cabecalho da tabela
    const cols = [
      { t: 'Data', w: 90 }, { t: 'Vítima', w: 110 }, { t: 'Tipo', w: 75 },
      { t: 'Severidade', w: 70 }, { t: 'Status', w: 55 },
    ];
    let x = 40;
    doc.fontSize(9).fillColor('#17202e');
    cols.forEach(c => { doc.text(c.t, x, doc.y, { width: c.w, continued: false }); x += c.w; });
    const headerY = doc.y;
    doc.moveTo(40, headerY + 2).lineTo(555, headerY + 2).strokeColor('#e2e8f1').stroke();
    doc.moveDown(0.4);

    dados.forEach(d => {
      if (doc.y > 770) { doc.addPage(); }
      const y = doc.y; x = 40;
      const linha = [
        new Date(d.criado_em).toLocaleString('pt-BR'),
        d.vitima_nome, d.tipo, d.severidade, d.resolvido ? 'resolvido' : 'aberto',
      ];
      doc.fontSize(8.5).fillColor('#334155');
      linha.forEach((val, i) => { doc.text(String(val), x, y, { width: cols[i].w }); x += cols[i].w; });
      doc.moveDown(0.3);
    });
    doc.end();
    return;
  }

  // CSV (padrao). Usa ; como separador para abrir bem no Excel pt-BR.
  const esc = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const linhas = [['Data', 'Vitima', 'Tipo', 'Severidade', 'Mensagem', 'Status'].join(';')];
  dados.forEach(d => linhas.push([
    new Date(d.criado_em).toLocaleString('pt-BR'),
    d.vitima_nome, d.tipo, d.severidade, d.mensagem || '', d.resolvido ? 'resolvido' : 'aberto',
  ].map(esc).join(';')));
  const csv = '﻿' + linhas.join('\r\n'); // BOM para acentos no Excel
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${nomeBase}.csv"`);
  res.send(csv);
}));

module.exports = router;
