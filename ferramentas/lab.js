#!/usr/bin/env node
/*
 * Publica um HTML direto no Laboratório (aba particular do Projetos
 * Estratégicos), sem passar pelo upload no navegador.
 *
 *   node ferramentas/lab.js publicar site/index.html --titulo "Site novo"
 *   node ferramentas/lab.js publicar site/index.html --watch
 *   node ferramentas/lab.js listar
 *   node ferramentas/lab.js excluir lab_index
 *
 * Como funciona
 * -------------
 * Escreve em pe_lab / pe_lab_dados pela API REST do Firestore, usando a conta
 * de serviço. A conta de serviço é administrativa: ela passa por cima das
 * regras. Por isso a regra do Laboratório continua exigindo o e-mail do dono —
 * nada foi afrouxado no banco para esta ferramenta funcionar.
 *
 * O id do documento vem do nome do arquivo, então publicar de novo ATUALIZA o
 * mesmo teste em vez de criar um segundo. É isso que faz o ciclo "salvei,
 * publiquei, atualizei a aba" funcionar sem lixo acumulado.
 *
 * A chave da conta de serviço NÃO fica no repositório: o caminho abaixo aponta
 * para fora dele, e pode ser trocado pela variável UDIACO_SA.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const https = require('https');
const crypto = require('crypto');

// A chave é procurada, não cravada num caminho: a pasta privada já foi
// reorganizada uma vez e o caminho fixo quebrou. Busca por nome, até dois
// níveis, e nunca dentro do repositório.
const RAIZ_PRIV = path.join(process.env.HOME || '', 'udiaco-dados-privados');
function acharChave(){
  if(process.env.UDIACO_SA) return process.env.UDIACO_SA;
  const cabe = f => /firebase-adminsdk.*\.json$/i.test(f);
  const olhar = dir => {
    let itens = [];
    try{ itens = fs.readdirSync(dir, { withFileTypes:true }); }catch(e){ return null; }
    const direto = itens.find(i => i.isFile() && cabe(i.name));
    if(direto) return path.join(dir, direto.name);
    for(const i of itens){
      if(!i.isDirectory() || i.name === 'node_modules' || i.name.startsWith('.')) continue;
      try{
        const dentro = fs.readdirSync(path.join(dir, i.name)).find(cabe);
        if(dentro) return path.join(dir, i.name, dentro);
      }catch(e){}
    }
    return null;
  };
  return olhar(RAIZ_PRIV) || path.join(RAIZ_PRIV, 'chave-nao-encontrada.json');
}
const SA = acharChave();
const DONO = 'alexandre.magalhaes@udiaco.com.br';
const COL = 'pe_lab';
const COL_DADOS = 'pe_lab_dados';
const CHUNK = 600 * 1024;          // um documento do Firestore para em 1 MB
const LIMITE_MB = 20;
const LIMITE_IMG = 2 * 1024 * 1024; // imagem maior que isto não vira data URI

// ── HTTP ──────────────────────────────────────────────────────────────────
function req(metodo, url, corpo, token){
  return new Promise((res, rej) => {
    const u = new URL(url);
    const dados = corpo == null ? null
      : Buffer.from(typeof corpo === 'string' ? corpo : JSON.stringify(corpo));
    const r = https.request({
      hostname:u.hostname, path:u.pathname + u.search, method:metodo,
      headers:Object.assign({},
        token ? { Authorization:'Bearer ' + token } : {},
        dados ? {
          'Content-Type': typeof corpo === 'string'
            ? 'application/x-www-form-urlencoded' : 'application/json',
          'Content-Length': dados.length
        } : {})
    }, resp => {
      let b = '';
      resp.on('data', d => b += d);
      resp.on('end', () => {
        let j = null; try { j = JSON.parse(b); } catch(e){}
        if(resp.statusCode >= 300)
          rej(new Error(metodo + ' ' + u.pathname + ' -> ' + resp.statusCode + ' ' +
            ((j && j.error && j.error.message) || b).slice(0, 300)));
        else res(j);
      });
    });
    r.on('error', rej);
    if(dados) r.write(dados);
    r.end();
  });
}
let _token = null, _proj = null;
async function autenticar(){
  if(_token) return _token;
  if(!fs.existsSync(SA))
    throw new Error('não achei a chave da conta de serviço em ' + SA +
      '\n  Aponte para ela com: UDIACO_SA=/caminho/da/chave.json');
  const sa = JSON.parse(fs.readFileSync(SA, 'utf8'));
  _proj = sa.project_id;
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const ag = Math.floor(Date.now() / 1000);
  const cab = b64({ alg:'RS256', typ:'JWT' });
  const pay = b64({ iss:sa.client_email, scope:'https://www.googleapis.com/auth/datastore',
    aud:'https://oauth2.googleapis.com/token', iat:ag, exp:ag + 3600 });
  const ass = crypto.createSign('RSA-SHA256').update(cab + '.' + pay)
    .sign(sa.private_key, 'base64url');
  const r = await req('POST', 'https://oauth2.googleapis.com/token',
    'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' +
    cab + '.' + pay + '.' + ass);
  _token = r.access_token;
  return _token;
}
const base = () => 'https://firestore.googleapis.com/v1/projects/' + _proj +
  '/databases/(default)/documents/';

// ── Firestore: tipos ──────────────────────────────────────────────────────
function valor(v){
  if(v === null || v === undefined) return { nullValue:null };
  if(typeof v === 'boolean') return { booleanValue:v };
  if(typeof v === 'number')
    return Number.isInteger(v) ? { integerValue:String(v) } : { doubleValue:v };
  return { stringValue:String(v) };
}
const campos = o => { const f = {}; Object.entries(o).forEach(([k, v]) => f[k] = valor(v)); return { fields:f }; };
function leValor(v){
  if(!v) return null;
  if('stringValue' in v) return v.stringValue;
  if('integerValue' in v) return Number(v.integerValue);
  if('doubleValue' in v) return v.doubleValue;
  if('booleanValue' in v) return v.booleanValue;
  return null;
}
const leCampos = d => {
  const o = {};
  Object.entries((d && d.fields) || {}).forEach(([k, v]) => o[k] = leValor(v));
  return o;
};

// ── Juntar o site num arquivo só ──────────────────────────────────────────
// O visor abre o HTML num iframe com srcdoc e sandbox SEM allow-same-origin:
// caminho relativo não resolve para lugar nenhum ali dentro. Um site com
// style.css e app.js ao lado abriria sem estilo e sem script, e sem dizer por
// quê. Então o que é local entra embutido; o que é de fora (CDN) fica como
// está e continua sendo buscado na hora de abrir.
const MIME = { '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
  '.gif':'image/gif', '.webp':'image/webp', '.svg':'image/svg+xml',
  '.ico':'image/x-icon', '.woff':'font/woff', '.woff2':'font/woff2',
  '.ttf':'font/ttf', '.otf':'font/otf', '.mp4':'video/mp4' };
const externo = u => /^(https?:)?\/\//i.test(u) || /^data:/i.test(u) ||
  /^(mailto|tel|blob):/i.test(u) || u.startsWith('#');

function embutir(arquivo){
  const dir = path.dirname(path.resolve(arquivo));
  let html = fs.readFileSync(arquivo, 'utf8');
  const usados = [];
  const faltando = [];
  const resolver = u => path.resolve(dir, decodeURI(u.split('?')[0].split('#')[0]));

  // url(...) dentro de um CSS que acabou de ser embutido: as imagens e fontes
  // dele também precisam virar data URI, senão o CSS entra e não pinta nada.
  const cssUrls = (css, cssDir) => css.replace(
    /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (todo, asp, u) => {
      if(externo(u)) return todo;
      const p = path.resolve(cssDir, decodeURI(u.split('?')[0].split('#')[0]));
      if(!fs.existsSync(p)){ faltando.push(u); return todo; }
      const buf = fs.readFileSync(p);
      if(buf.length > LIMITE_IMG){ faltando.push(u + ' (grande demais)'); return todo; }
      usados.push(path.relative(dir, p));
      const mime = MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
      return 'url(data:' + mime + ';base64,' + buf.toString('base64') + ')';
    });

  // <link rel="stylesheet" href="...">
  html = html.replace(/<link\b[^>]*>/gi, tag => {
    if(!/rel\s*=\s*['"]?stylesheet/i.test(tag)) return tag;
    const m = tag.match(/href\s*=\s*(['"])(.*?)\1/i);
    if(!m || externo(m[2])) return tag;
    const p = resolver(m[2]);
    if(!fs.existsSync(p)){ faltando.push(m[2]); return tag; }
    usados.push(path.relative(dir, p));
    return '<style>\n' + cssUrls(fs.readFileSync(p, 'utf8'), path.dirname(p)) + '\n</style>';
  });

  // <script src="..."></script>
  html = html.replace(/<script\b([^>]*)>\s*<\/script>/gi, (todo, attrs) => {
    const m = attrs.match(/src\s*=\s*(['"])(.*?)\1/i);
    if(!m || externo(m[2])) return todo;
    const p = resolver(m[2]);
    if(!fs.existsSync(p)){ faltando.push(m[2]); return todo; }
    usados.push(path.relative(dir, p));
    // type="module" só funciona com origem; dentro do srcdoc ele quebraria.
    const tipo = /type\s*=\s*(['"])module\1/i.test(attrs) ? ' type="module"' : '';
    return '<script' + tipo + '>\n' + fs.readFileSync(p, 'utf8') + '\n</script>';
  });

  // <img src="...">, e o mesmo para source/video/audio
  html = html.replace(/<(img|source|video|audio)\b[^>]*>/gi, tag => {
    const m = tag.match(/\bsrc\s*=\s*(['"])(.*?)\1/i);
    if(!m || externo(m[2])) return tag;
    const p = resolver(m[2]);
    if(!fs.existsSync(p)){ faltando.push(m[2]); return tag; }
    const buf = fs.readFileSync(p);
    if(buf.length > LIMITE_IMG){ faltando.push(m[2] + ' (grande demais)'); return tag; }
    usados.push(path.relative(dir, p));
    const mime = MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
    return tag.replace(m[0], 'src="data:' + mime + ';base64,' + buf.toString('base64') + '"');
  });

  // css inline na própria página também pode apontar para arquivo local
  html = html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi,
    (todo, css) => todo.replace(css, cssUrls(css, dir)));

  return { html, usados:[...new Set(usados)], faltando:[...new Set(faltando)] };
}

// ── Publicar ──────────────────────────────────────────────────────────────
const fatiar = txt => {
  const out = [];
  for(let i = 0; i < txt.length; i += CHUNK) out.push(txt.slice(i, i + CHUNK));
  return out;
};
const tamanho = n => n < 1024 ? n + ' B'
  : n < 1048576 ? (n / 1024).toFixed(0) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'teste';

async function lerRegistro(id){
  const token = await autenticar();
  try{
    const d = await req('GET', base() + COL + '/' + id, null, token);
    return leCampos(d);
  }catch(e){
    if(/-> 404/.test(e.message)) return null;
    throw e;
  }
}
async function apagarPedacos(id, n){
  const token = await autenticar();
  for(let i = 0; i < n; i++){
    try{ await req('DELETE', base() + COL_DADOS + '/' + id + '__' + i, null, token); }
    catch(e){ /* já não existe */ }
  }
}

async function publicar(arquivo, opts){
  if(!fs.existsSync(arquivo)) throw new Error('não achei o arquivo ' + arquivo);
  const token = await autenticar();
  const id = opts.id || ('lab_' + slug(path.basename(arquivo, path.extname(arquivo))));
  const antes = await lerRegistro(id);

  const { html, usados, faltando } = embutir(arquivo);
  const bytes = Buffer.byteLength(html);
  if(bytes > LIMITE_MB * 1048576)
    throw new Error('o HTML montado tem ' + tamanho(bytes) + '; o limite é ' + LIMITE_MB + ' MB');

  const b64 = zlib.gzipSync(Buffer.from(html, 'utf8')).toString('base64');
  const pedacos = fatiar(b64);

  // Os pedaços antigos saem ANTES: se a versão nova for menor, o que sobra da
  // anterior fica pendurado e corrompe a leitura.
  if(antes && antes.chunks) await apagarPedacos(id, antes.chunks);
  for(let i = 0; i < pedacos.length; i++)
    await req('PATCH', base() + COL_DADOS + '/' + id + '__' + i,
      campos({ p:pedacos[i], dono:DONO }), token);

  const agora = new Date().toISOString();
  await req('PATCH', base() + COL + '/' + id, campos({
    titulo: opts.titulo || (antes && antes.titulo) || path.basename(arquivo),
    nota: opts.nota != null ? opts.nota
      : (antes && antes.nota) || ('publicado do terminal · ' + path.relative(process.cwd(), arquivo)),
    arquivo: path.basename(arquivo),
    bytes, chunks:pedacos.length, gzip:true, dono:DONO, origem:'claude-code',
    criadoEm: (antes && antes.criadoEm) || agora,
    atualizadoEm: agora
  }), token);

  return { id, novo:!antes, bytes, comprimido:b64.length, pedacos:pedacos.length, usados, faltando };
}

function relatar(r, arquivo){
  console.log((r.novo ? '  publicado ' : '  atualizado ') + r.id +
    '  ' + tamanho(r.bytes) + ' -> ' + tamanho(r.comprimido) +
    ' comprimido, ' + r.pedacos + ' pedaço(s)');
  if(r.usados.length)
    console.log('  embutidos: ' + r.usados.join(', '));
  if(r.faltando.length)
    console.log('  NÃO embutidos (não encontrei): ' + r.faltando.join(', '));
}

// ── Watch ─────────────────────────────────────────────────────────────────
// Republica a cada salvamento. Vigia o arquivo e a pasta dele, porque o que
// foi embutido (css, js, imagem) também muda o resultado.
async function vigiar(arquivo, opts){
  const dir = path.dirname(path.resolve(arquivo));
  let pendente = null, rodando = false;
  const republicar = async () => {
    if(rodando) return;
    rodando = true;
    try{
      const r = await publicar(arquivo, opts);
      const h = new Date().toTimeString().slice(0, 8);
      console.log('[' + h + '] republicado');
      if(r.faltando.length) console.log('  faltando: ' + r.faltando.join(', '));
    }catch(e){ console.error('  erro: ' + e.message); }
    rodando = false;
  };
  fs.watch(dir, { recursive:true }, (ev, nome) => {
    if(!nome || /(^\.|~$|\.swp$)/.test(path.basename(nome))) return;
    clearTimeout(pendente);
    pendente = setTimeout(republicar, 350);   // o editor grava em mais de um passo
  });
  console.log('vigiando ' + dir + ' — Ctrl+C para parar');
}

// ── Comandos ──────────────────────────────────────────────────────────────
async function listar(){
  const token = await autenticar();
  const r = await req('GET', base() + COL + '?pageSize=100', null, token);
  const docs = (r && r.documents) || [];
  if(!docs.length){ console.log('  (o laboratório está vazio)'); return; }
  docs.map(d => Object.assign({ _id:d.name.split('/').pop() }, leCampos(d)))
    .sort((a, b) => String(b.atualizadoEm || '').localeCompare(String(a.atualizadoEm || '')))
    .forEach(l => console.log('  ' + (l._id + '                    ').slice(0, 22) +
      (l.titulo || '(sem título)') + '  · ' + tamanho(l.bytes) +
      ' · ' + String(l.atualizadoEm || '').slice(0, 16).replace('T', ' ') +
      (l.origem === 'claude-code' ? ' · do terminal' : '')));
}
async function excluir(id){
  if(!id) throw new Error('diga qual id excluir (veja com: lab.js listar)');
  const token = await autenticar();
  const antes = await lerRegistro(id);
  if(!antes) throw new Error('não existe nenhum teste com o id ' + id);
  await apagarPedacos(id, antes.chunks || 0);
  await req('DELETE', base() + COL + '/' + id, null, token);
  console.log('  excluído ' + id + ' (' + (antes.titulo || '') + ')');
}

const AJUDA = `
Publica HTML direto no Laboratório do Projetos Estratégicos.

  node ferramentas/lab.js publicar <arquivo.html> [opções]
  node ferramentas/lab.js listar
  node ferramentas/lab.js excluir <id>

Opções de publicar:
  --titulo "Meu site"   nome que aparece no cartão (padrão: nome do arquivo)
  --nota "..."          linha de apoio no cartão
  --id lab_xxx          publica sobre um teste específico
  --watch               republica a cada salvamento

O id vem do nome do arquivo, então publicar de novo ATUALIZA o mesmo teste.
CSS, JS e imagens locais entram embutidos — o visor abre o HTML isolado, e
caminho relativo não resolveria lá dentro. Link de CDN continua funcionando.

Chave da conta de serviço: ${SA}
(troque com a variável UDIACO_SA)
`;

// Chamado como módulo (pelos testes), expõe as peças e não roda nada.
if(require.main !== module){
  module.exports = { embutir, fatiar, slug, tamanho, publicar, listar, excluir,
    lerRegistro, apagarPedacos, SA, CHUNK, LIMITE_MB, LIMITE_IMG, externo, valor, leCampos };
  return;
}

(async () => {
  const arg = process.argv.slice(2);
  const cmd = arg[0];
  const pega = n => { const i = arg.indexOf(n); return i >= 0 ? arg[i + 1] : undefined; };
  const opts = { titulo:pega('--titulo'), nota:pega('--nota'), id:pega('--id') };

  if(cmd === 'publicar'){
    const arquivo = arg[1];
    if(!arquivo || arquivo.startsWith('--')) throw new Error('diga qual arquivo publicar');
    const r = await publicar(arquivo, opts);
    relatar(r, arquivo);
    console.log('  abra em Projetos Estratégicos > Laboratório');
    if(arg.includes('--watch')) await vigiar(arquivo, Object.assign({}, opts, { id:r.id }));
  }
  else if(cmd === 'listar')  await listar();
  else if(cmd === 'excluir') await excluir(arg[1]);
  else console.log(AJUDA);
})().catch(e => { console.error('erro: ' + e.message); process.exit(1); });
