#!/usr/bin/env node
/*
 * Publica o firestore.rules e mostra o que ficou NO AR.
 *
 *   node ferramentas/regras.js            publica e confere
 *   node ferramentas/regras.js --ver      só mostra o que está no ar
 *
 * O deploy do GitHub Actions NÃO publica regras: falta a permissão
 * roles/firebaserules.admin na conta de serviço do CI. Então alterar o
 * firestore.rules e dar push não muda nada no banco — é preciso rodar isto.
 *
 * Depois de publicar, o script relê o release do servidor e compara byte a
 * byte com o arquivo local. Conferir o que se mandou não prova nada; o que
 * vale é o que está valendo.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const RAIZ = path.join(__dirname, '..');
const ARQ = path.join(RAIZ, 'firestore.rules');
const RAIZ_PRIV = path.join(process.env.HOME || '', 'udiaco-dados-privados');

// Mesma busca da ferramenta do Laboratório: a pasta privada já foi
// reorganizada uma vez e caminho fixo quebrou.
function acharChave(){
  if(process.env.UDIACO_SA) return process.env.UDIACO_SA;
  const cabe = f => /firebase-adminsdk.*\.json$/i.test(f);
  let itens = [];
  try{ itens = fs.readdirSync(RAIZ_PRIV, { withFileTypes:true }); }catch(e){ return null; }
  const direto = itens.find(i => i.isFile() && cabe(i.name));
  if(direto) return path.join(RAIZ_PRIV, direto.name);
  for(const i of itens){
    if(!i.isDirectory() || i.name === 'node_modules' || i.name.startsWith('.')) continue;
    try{
      const d = fs.readdirSync(path.join(RAIZ_PRIV, i.name)).find(cabe);
      if(d) return path.join(RAIZ_PRIV, i.name, d);
    }catch(e){}
  }
  return null;
}

function req(metodo, url, corpo, token){
  return new Promise((res, rej) => {
    const u = new URL(url);
    const d = corpo == null ? null
      : Buffer.from(typeof corpo === 'string' ? corpo : JSON.stringify(corpo));
    const r = https.request({ hostname:u.hostname, path:u.pathname + u.search, method:metodo,
      headers:Object.assign({}, token ? { Authorization:'Bearer ' + token } : {},
        d ? { 'Content-Type': typeof corpo === 'string'
              ? 'application/x-www-form-urlencoded' : 'application/json',
            'Content-Length': d.length } : {}) },
      resp => { let b = '';
        resp.on('data', x => b += x);
        resp.on('end', () => {
          let j = null; try{ j = JSON.parse(b); }catch(e){}
          if(resp.statusCode >= 300)
            rej(new Error(resp.statusCode + ' ' + ((j && j.error && j.error.message) || b).slice(0, 300)));
          else res(j);
        }); });
    r.on('error', rej);
    if(d) r.write(d);
    r.end();
  });
}

(async () => {
  const chave = acharChave();
  if(!chave) throw new Error('não achei a chave da conta de serviço em ' + RAIZ_PRIV +
    '\n  Aponte para ela com: UDIACO_SA=/caminho/da/chave.json');
  const sa = JSON.parse(fs.readFileSync(chave, 'utf8'));
  const PROJ = sa.project_id;

  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const ag = Math.floor(Date.now() / 1000);
  const cab = b64({ alg:'RS256', typ:'JWT' });
  const pay = b64({ iss:sa.client_email, scope:'https://www.googleapis.com/auth/cloud-platform',
    aud:'https://oauth2.googleapis.com/token', iat:ag, exp:ag + 3600 });
  const ass = crypto.createSign('RSA-SHA256').update(cab + '.' + pay).sign(sa.private_key, 'base64url');
  const token = (await req('POST', 'https://oauth2.googleapis.com/token',
    'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' +
    cab + '.' + pay + '.' + ass)).access_token;

  const API = 'https://firebaserules.googleapis.com/v1/';
  const local = fs.readFileSync(ARQ, 'utf8');
  const soVer = process.argv.includes('--ver');

  if(!soVer){
    const rs = await req('POST', API + 'projects/' + PROJ + '/rulesets',
      { source:{ files:[{ name:'firestore.rules', content:local }] } }, token);
    await req('PATCH', API + 'projects/' + PROJ + '/releases/cloud.firestore',
      { release:{ name:'projects/' + PROJ + '/releases/cloud.firestore', rulesetName:rs.name } }, token);
    console.log('  publicado: ' + rs.name.split('/').pop());
  }

  const rel = await req('GET', API + 'projects/' + PROJ + '/releases/cloud.firestore', null, token);
  const noAr = await req('GET', API + rel.rulesetName, null, token);
  const conteudo = noAr.source.files[0].content;
  const igual = conteudo === local;
  console.log('  no ar:     ' + rel.rulesetName.split('/').pop());
  console.log('  ' + (igual ? 'confere byte a byte com o firestore.rules local'
    : 'ATENÇÃO: o que está no ar NÃO é igual ao arquivo local'));

  const colecoes = [...conteudo.matchAll(/match \/([a-zA-Z_0-9]+)\/\{[^}]*\}\s*\{([^}]*)\}/g)]
    .map(m => ({ col:m[1], regra:m[2].trim() }));
  console.log('\n  ' + colecoes.length + ' coleções valendo agora:');
  colecoes.forEach(c => console.log('    ' + c.col.padEnd(26) + c.regra.replace(/\s+/g, ' ')));
  const abertas = colecoes.filter(c => /if true/.test(c.regra));
  console.log('\n  ' + (abertas.length
    ? abertas.length + ' aberta(s) sem login: ' + abertas.map(c => c.col).join(', ')
    : 'nenhuma coleção aberta sem login'));
  if(!igual) process.exit(1);
})().catch(e => { console.error('erro: ' + e.message); process.exit(1); });
