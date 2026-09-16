#!/usr/bin/env node
// Testa as regras do Firestore de Projetos (escrita) SEM tocar no banco:
// usa a API TestRuleset do Firebase, que roda casos contra o texto local das
// regras, com mocks do get()/exists() da coleção usuarios.
'use strict';
const fs = require('fs'), path = require('path'), https = require('https'), crypto = require('crypto');
const RAIZ = path.join(__dirname, '..', '..');
const RAIZ_PRIV = path.join(process.env.HOME || '', 'udiaco-dados-privados');
function acharChave(){
  if(process.env.UDIACO_SA) return process.env.UDIACO_SA;
  const cabe = f => /firebase-adminsdk.*\.json$/i.test(f);
  let itens = []; try{ itens = fs.readdirSync(RAIZ_PRIV, {withFileTypes:true}); }catch(e){ return null; }
  const d = itens.find(i => i.isFile() && cabe(i.name));
  if(d) return path.join(RAIZ_PRIV, d.name);
  for(const i of itens){ if(!i.isDirectory() || i.name.startsWith('.')) continue;
    try{ const f = fs.readdirSync(path.join(RAIZ_PRIV, i.name)).find(cabe);
      if(f) return path.join(RAIZ_PRIV, i.name, f); }catch(e){} }
  return null;
}
function req(metodo, url, corpo, token){
  return new Promise((res, rej) => { const u = new URL(url);
    const d = corpo == null ? null : Buffer.from(typeof corpo === 'string' ? corpo : JSON.stringify(corpo));
    const r = https.request({ hostname:u.hostname, path:u.pathname + u.search, method:metodo,
      headers:Object.assign({}, token ? {Authorization:'Bearer ' + token} : {},
        d ? {'Content-Type':typeof corpo === 'string' ? 'application/x-www-form-urlencoded':'application/json','Content-Length':d.length} : {}) },
      resp => { let b = ''; resp.on('data', x => b += x); resp.on('end', () => {
        let j = null; try{ j = JSON.parse(b); }catch(e){}
        if(resp.statusCode >= 300) rej(new Error(resp.statusCode + ' ' + ((j && j.error && j.error.message) || b).slice(0, 400)));
        else res(j); }); });
    r.on('error', rej); if(d) r.write(d); r.end(); });
}
const DB = '/databases/(default)/documents';
const MAILJ = 'julia.fernandes@udiaco.com.br';
const MAILA = 'alexandre.magalhaes@udiaco.com.br';   // master-bootstrap (não precisa de doc)
// Mock do doc de usuarios da Julia: autorizada, tem a plataforma, perfil usuário.
const mocksJulia = [
  { function:'get',    args:[{exactValue:DB + '/usuarios/' + MAILJ}], result:{value:{data:{ativo:true, papel:'corporativo', perfilProjetos:'usuario', plataformas:{projetos:true}}}} },
  { function:'exists', args:[{exactValue:DB + '/usuarios/' + MAILJ}], result:{value:true} },
];
const auth = mail => ({ uid:mail, token:{ email:mail, email_verified:true } });
const T = '2026-09-11T18:00:00Z';

function caso(nome, expectation, request, resource, functionMocks){
  return { nome, tc:{ expectation, request:Object.assign({time:T}, request),
    ...(resource ? {resource} : {}), ...(functionMocks ? {functionMocks} : {}) } };
}
const projAlex = { data:{ nome:'Sigiloso', dono:MAILA, criadoPor:MAILA, visibilidade:'privado' } };

const casos = [
  // MENSAGENS — forjar autor
  caso('Julia manda recado como ELA MESMA', 'ALLOW',
    { auth:auth(MAILJ), method:'create', path:DB + '/pe_mensagens/m1',
      resource:{data:{autor:MAILJ, autorNome:'Julia', texto:'oi', tipo:'msg'}} }, null, mocksJulia),
  caso('Julia tenta FORJAR recado no nome do Alex', 'DENY',
    { auth:auth(MAILJ), method:'create', path:DB + '/pe_mensagens/m2',
      resource:{data:{autor:MAILA, autorNome:'Alexandre', texto:'falso', tipo:'msg'}} }, null, mocksJulia),
  // MENSAGENS — curtir (update mantém autor) deve continuar
  caso('Julia curte uma mensagem (autor preservado)', 'ALLOW',
    { auth:auth(MAILJ), method:'update', path:DB + '/pe_mensagens/m3',
      resource:{data:{autor:MAILA, texto:'x', curtidas:[MAILJ]}} },
    { data:{autor:MAILA, texto:'x', curtidas:[]} }, mocksJulia),
  caso('Julia tenta reescrever o autor de uma mensagem', 'DENY',
    { auth:auth(MAILJ), method:'update', path:DB + '/pe_mensagens/m4',
      resource:{data:{autor:MAILJ, texto:'x', curtidas:[]}} },
    { data:{autor:MAILA, texto:'x', curtidas:[]} }, mocksJulia),
  // PROJETOS — excluir
  caso('Julia (não dona) tenta EXCLUIR projeto do Alex', 'DENY',
    { auth:auth(MAILJ), method:'delete', path:DB + '/pe_projetos/p1' }, projAlex, mocksJulia),
  caso('Alex (dono) exclui o próprio projeto', 'ALLOW',
    { auth:auth(MAILA), method:'delete', path:DB + '/pe_projetos/p1' }, projAlex, null),
  // PROJETOS — reatribuir dono
  caso('Julia tenta TOMAR o dono do projeto do Alex', 'DENY',
    { auth:auth(MAILJ), method:'update', path:DB + '/pe_projetos/p1',
      resource:{data:{nome:'Sigiloso', dono:MAILJ, criadoPor:MAILA}} }, projAlex, mocksJulia),
  // PROJETOS — edição normal (dono preservado) precisa CONTINUAR
  caso('Julia edita descrição do projeto (dono intacto)', 'ALLOW',
    { auth:auth(MAILJ), method:'update', path:DB + '/pe_projetos/p1',
      resource:{data:{nome:'Sigiloso', descricao:'nova', dono:MAILA, criadoPor:MAILA}} }, projAlex, mocksJulia),
];

(async () => {
  const chave = acharChave();
  if(!chave){ console.error('não achei a chave da conta de serviço (UDIACO_SA=...)'); process.exit(2); }
  const sa = JSON.parse(fs.readFileSync(chave, 'utf8')), PROJ = sa.project_id;
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const ag = Math.floor(Date.now() / 1000);
  const cab = b64({alg:'RS256', typ:'JWT'});
  const pay = b64({ iss:sa.client_email, scope:'https://www.googleapis.com/auth/cloud-platform',
    aud:'https://oauth2.googleapis.com/token', iat:ag, exp:ag + 3600 });
  const ass = crypto.createSign('RSA-SHA256').update(cab + '.' + pay).sign(sa.private_key, 'base64url');
  const token = (await req('POST', 'https://oauth2.googleapis.com/token',
    'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + cab + '.' + pay + '.' + ass)).access_token;

  const content = fs.readFileSync(path.join(RAIZ, 'firestore.rules'), 'utf8');
  const body = { source:{files:[{name:'firestore.rules', content}]},
    testSuite:{ testCases:casos.map(c => c.tc) } };
  const r = await req('POST', 'https://firebaserules.googleapis.com/v1/projects/' + PROJ + ':test', body, token);
  const results = r.testResults || [];
  let falhas = 0;
  results.forEach((res, i) => {
    const esperado = casos[i].tc.expectation, ok = res.state === 'SUCCESS';
    if(!ok) falhas++;
    console.log((ok ? '  ok   ' : '  FALHA') + ' [' + esperado.padEnd(5) + '] ' + casos[i].nome +
      (ok ? '' : '  -> ' + (res.state || '?') + ' ' + JSON.stringify(res.errors || res.debugMessages || '').slice(0,160)));
  });
  console.log('\n  ' + (falhas ? falhas + ' FALHA(S)' : 'todos os ' + results.length + ' casos passaram'));
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error('erro:', e.message); process.exit(2); });
