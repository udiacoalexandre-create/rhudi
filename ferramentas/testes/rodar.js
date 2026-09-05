#!/usr/bin/env node
/*
 * Roda todas as suítes de uma vez.
 *
 *   node ferramentas/testes/rodar.js            todas
 *   node ferramentas/testes/rodar.js lab        só as que casam com "lab"
 *
 * Cada suíte carrega o arquivo real da aplicação (app.js, projetos.js,
 * comercial.js) dentro de um sandbox e exercita as funções de verdade — não
 * confere markup solto. Sai com código 1 se qualquer uma falhar, para servir
 * de porta antes do commit.
 *
 * As suítes moram aqui, e não no diretório temporário da sessão: o temporário
 * é limpo sem aviso e já levou junto as suítes de Férias uma vez.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DIR = __dirname;
const filtro = process.argv[2];
const suites = fs.readdirSync(DIR)
  .filter(f => f.endsWith('.js') && f !== 'rodar.js')
  .filter(f => !filtro || f.includes(filtro))
  .sort();

if(!suites.length){ console.log('nenhuma suíte casou com "' + filtro + '"'); process.exit(1); }

let falharam = [], total = 0;
for(const s of suites){
  let saida = '', erro = false;
  try{
    saida = execFileSync(process.execPath, [path.join(DIR, s)],
      { encoding:'utf8', stdio:['ignore', 'pipe', 'pipe'] });
  }catch(e){
    erro = true;
    saida = String((e.stdout || '') + (e.stderr || ''));
  }
  const linha = (saida.match(/(TUDO OK \(\d+ checagens\)|TODOS OS \d+ TESTES PASSARAM|FALHAS: \d+[^\n]*)/g) || []).pop();
  const n = Number((linha || '').match(/\d+/) || 0);
  if(!erro && linha && !/FALHAS/.test(linha)) total += n;
  else { falharam.push(s); }
  console.log((erro || !linha || /FALHAS/.test(linha) ? '  FALHOU  ' : '  ok      ') +
    s.replace('.js', '').padEnd(16) + (linha || '(não terminou)'));
  if(erro || (linha && /FALHAS/.test(linha)))
    console.log(saida.split('\n').filter(l => /FALHA|Error/.test(l)).slice(0, 8)
      .map(l => '           ' + l.trim()).join('\n'));
}
console.log('\n' + (falharam.length
  ? falharam.length + ' suíte(s) com falha: ' + falharam.join(', ')
  : suites.length + ' suítes, ' + total + ' checagens, tudo passando'));
process.exit(falharam.length ? 1 : 0);
