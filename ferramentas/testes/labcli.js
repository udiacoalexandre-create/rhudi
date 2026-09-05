// Ferramenta de publicar no Laboratorio pelo terminal: o que ela embute, o
// que ela deixa em paz, e o ciclo publicar -> republicar -> excluir CONTRA O
// FIRESTORE DE VERDADE (num id descartavel).
const fs=require('fs'), path=require('path'), os=require('os'), zlib=require('zlib');
const CLI=require('/Users/acmags/rhudi/ferramentas/lab.js');
const FONTE=fs.readFileSync('/Users/acmags/rhudi/ferramentas/lab.js','utf8');
const FIREBASE=fs.readFileSync('/Users/acmags/rhudi/firebase.json','utf8');
const PROJJS=fs.readFileSync('/Users/acmags/rhudi/projetos.js','utf8');
const PROJHTML=fs.readFileSync('/Users/acmags/rhudi/projetos.html','utf8');
let ok=0, fail=0;
const t=(n,c,x)=>{ if(c){ok++;console.log('  ok   '+n);} else {fail++;console.log('  FALHA '+n+(x?'  -> '+x:''));} };

// ── um site de mentira, com as armadilhas de um site de verdade ──────────
const DIR=fs.mkdtempSync(path.join(os.tmpdir(),'labsite-'));
fs.mkdirSync(path.join(DIR,'css')); fs.mkdirSync(path.join(DIR,'js'));
fs.mkdirSync(path.join(DIR,'img'));
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
fs.writeFileSync(path.join(DIR,'img','ponto.png'), PNG);
fs.writeFileSync(path.join(DIR,'css','estilo.css'),
  'body{font-family:Inter}\n.logo{background:url(../img/ponto.png)}\n');
fs.writeFileSync(path.join(DIR,'js','app.js'), 'console.log("app carregado");\n');
fs.writeFileSync(path.join(DIR,'js','mod.js'), 'export const x=1;\n');
const HTML=[
'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">',
'<title>Site</title>',
'<link rel="stylesheet" href="css/estilo.css">',
'<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">',
'<link rel="stylesheet" href="css/sumiu.css">',
'<link rel="icon" href="img/ponto.png">',
'<style>.fundo{background:url("img/ponto.png") repeat}</style>',
'</head><body>',
'<h1>Olá</h1>',
'<img src="img/ponto.png" alt="p">',
'<img src="https://exemplo.com/remota.png" alt="r">',
'<a href="pagina2.html">outra</a>',
'<script src="js/app.js"></script>',
'<script type="module" src="js/mod.js"></script>',
'<script src="https://cdn.exemplo.com/lib.js"></script>',
'<script>console.log("inline");<\/script>',
'</body></html>'].join('\n');
const ARQ=path.join(DIR,'index.html');
fs.writeFileSync(ARQ, HTML);

console.log('== 1) O QUE ENTRA EMBUTIDO ==');
const r=CLI.embutir(ARQ);
t('CSS local virou <style>', /<style>\s*body\{font-family:Inter/.test(r.html),
  (r.html.match(/<style>[\s\S]{0,60}/)||[''])[0]);
t('JS local virou <script> inline', /<script>\s*console\.log\("app carregado"\)/.test(r.html));
t('imagem local virou data URI', /<img src="data:image\/png;base64,[A-Za-z0-9+/=]+" alt="p">/.test(r.html));
t('url() dentro do CSS embutido tambem', /\.logo\{background:url\(data:image\/png;base64,/.test(r.html));
t('url() no <style> da propria pagina tambem', /\.fundo\{background:url\(data:image\/png;base64,/.test(r.html));
t('module continua module', /<script type="module">\s*export const x=1/.test(r.html),
  (r.html.match(/<script type="module">[\s\S]{0,40}/)||[''])[0]);
t('listou o que embutiu', r.usados.sort().join(',')==='css/estilo.css,img/ponto.png,js/app.js,js/mod.js',
  r.usados.join(','));

console.log('\n== 2) O QUE NAO PODE SER TOCADO ==');
t('CSS de CDN fica como link', /<link rel="stylesheet" href="https:\/\/fonts\.googleapis/.test(r.html));
t('JS de CDN fica como src', /<script src="https:\/\/cdn\.exemplo\.com\/lib\.js"><\/script>/.test(r.html));
t('imagem remota fica como src', /<img src="https:\/\/exemplo\.com\/remota\.png"/.test(r.html));
t('script que ja era inline nao e mexido', /console\.log\("inline"\)/.test(r.html));
t('link de navegacao nao vira nada', /<a href="pagina2\.html">/.test(r.html));
t('externo() reconhece http, //, data e ancora',
  CLI.externo('https://a')&&CLI.externo('//a')&&CLI.externo('data:x')&&CLI.externo('#topo')
  && !CLI.externo('css/a.css'));

console.log('\n== 3) O QUE FALTA E DITO, NAO ESCONDIDO ==');
t('avisou o css que nao existe', r.faltando.includes('css/sumiu.css'), r.faltando.join(','));
t('e ele continua no HTML (nao some em silencio)', /css\/sumiu\.css/.test(r.html));
t('nao inventou que embutiu', !r.usados.includes('css/sumiu.css'));
// imagem grande demais para data URI
const GRANDE=path.join(DIR,'img','grande.png');
fs.writeFileSync(GRANDE, Buffer.alloc(CLI.LIMITE_IMG+10));
fs.writeFileSync(ARQ, HTML.replace('<h1>Olá</h1>','<h1>Olá</h1><img src="img/grande.png">'));
const r2=CLI.embutir(ARQ);
t('imagem grande demais nao vira data URI', /<img src="img\/grande\.png">/.test(r2.html));
t('e o motivo aparece', r2.faltando.some(x=>/grande demais/.test(x)), r2.faltando.join(','));
fs.writeFileSync(ARQ, HTML);

console.log('\n== 4) FATIAR E NOMEAR ==');
const G='x'.repeat(CLI.CHUNK*2+10);
t('pica em pedacos do tamanho certo', CLI.fatiar(G).length===3, String(CLI.fatiar(G).length));
t('nenhum pedaco passa do limite', CLI.fatiar(G).every(p=>p.length<=CLI.CHUNK));
t('junta de volta sem perder nada', CLI.fatiar(G).join('')===G);
t('o id vem do nome do arquivo', CLI.slug('index')==='index');
t('acento e espaco viram hifen', CLI.slug('Meu Site Novo')==='meu-site-novo', CLI.slug('Meu Site Novo'));
t('nome vazio nao gera id quebrado', CLI.slug('')==='teste');
t('tamanho legivel', CLI.tamanho(2048)==='2 KB' && CLI.tamanho(500)==='500 B');

console.log('\n== 5) A CHAVE NAO ENTRA NO REPOSITORIO ==');
t('a chave e procurada fora do repo', /udiaco-dados-privados/.test(CLI.SA) && !/rhudi/.test(CLI.SA),
  CLI.SA);
t('a chave existe onde foi achada', fs.existsSync(CLI.SA), CLI.SA);
t('a ferramenta NAO e publicada no Hosting', /"ferramentas\/\*\*"/.test(FIREBASE),
  FIREBASE.replace(/\s+/g,' '));
t('nenhuma chave privada dentro do arquivo',
  !/PRIVATE KEY|"private_key"|AIza[0-9A-Za-z_-]{20}/.test(FONTE));
t('o caminho da chave pode ser trocado por variavel', /UDIACO_SA/.test(FONTE));

console.log('\n== 6) A TELA CONTA A HISTORIA CERTA ==');
t('cartao marca o que veio do terminal', /origem === 'claude-code'[\s\S]{0,120}do terminal/.test(PROJJS));
t('a tela mostra o comando', /ferramentas\/lab\.js publicar/.test(PROJJS));
t('mostra tambem o --watch', /--watch/.test(PROJJS));
t('explica que republicar atualiza, nao duplica', /atualiza<\/b> o mesmo teste/.test(PROJJS));
t('o upload manual continua existindo', /labModal\(null\)/.test(PROJJS));
t('CSS do bloco de comando existe', /\.lab-cli\{/.test(PROJHTML));
t('CSS da etiqueta de origem existe', /\.lab-tag\{/.test(PROJHTML));

// ── ciclo real contra o Firestore ────────────────────────────────────────
const ID='lab_zzz_teste_automatico';
(async()=>{
console.log('\n== 7) CICLO REAL NO FIRESTORE ==');
try{
  const p1=await CLI.publicar(ARQ, {id:ID, titulo:'Teste automatico', nota:'apagar em seguida'});
  t('publicou', p1.novo===true && p1.id===ID, JSON.stringify({novo:p1.novo,id:p1.id}));
  const reg=await CLI.lerRegistro(ID);
  t('gravou o registro', !!reg && reg.titulo==='Teste automatico', JSON.stringify(reg&&reg.titulo));
  t('marcou a origem', reg.origem==='claude-code', reg.origem);
  t('marcou o dono', reg.dono==='alexandre.magalhaes@udiaco.com.br');
  t('gravou comprimido', reg.gzip===true);
  t('numero de pedacos e inteiro', Number.isInteger(reg.chunks), typeof reg.chunks);
  t('guardou o nome do arquivo de origem', reg.arquivo==='index.html', reg.arquivo);

  // republicar com um arquivo MENOR: o furo classico dos pedacos pendurados
  const MENOR=path.join(DIR,'index.html');
  fs.writeFileSync(MENOR, '<h1>versao 2</h1>');
  const p2=await CLI.publicar(MENOR, {id:ID});
  t('republicar atualiza, nao duplica', p2.novo===false && p2.id===ID);
  const reg2=await CLI.lerRegistro(ID);
  t('manteve o titulo dado antes', reg2.titulo==='Teste automatico', reg2.titulo);
  t('manteve a data de criacao', reg2.criadoEm===reg.criadoEm);
  t('mudou a data de atualizacao', reg2.atualizadoEm!==reg.atualizadoEm);
  t('nada de pedaco pendurado do arquivo maior', reg2.chunks===1, String(reg2.chunks));

  // le como o navegador leria
  const volta=await lerHTML(ID, reg2.chunks);
  t('o HTML volta exatamente como foi publicado', volta==='<h1>versao 2</h1>', volta);

  await CLI.excluir(ID);
  t('excluiu o registro', (await CLI.lerRegistro(ID))===null);
  t('excluiu o pedaco tambem', (await pedacoExiste(ID+'__0'))===false);
}catch(e){
  t('ciclo real no Firestore', false, e.message);
  try{ await CLI.excluir(ID); }catch(_){}
}

fs.rmSync(DIR, {recursive:true, force:true});
console.log('\n'+(fail?'FALHAS: '+fail+' | ok: '+ok:'TUDO OK ('+ok+' checagens)'));
process.exit(fail?1:0);
})();

// le os pedacos pelo mesmo caminho do navegador (get por id)
async function lerHTML(id, n){
  const https=require('https'), crypto=require('crypto');
  const sa=JSON.parse(fs.readFileSync(CLI.SA,'utf8'));
  const b64=o=>Buffer.from(typeof o==='string'?o:JSON.stringify(o)).toString('base64url');
  const req=(m,u,c,tk)=>new Promise((res,rej)=>{const U=new URL(u);
    const d=c?Buffer.from(typeof c==='string'?c:JSON.stringify(c)):null;
    const rq=https.request({hostname:U.hostname,path:U.pathname+U.search,method:m,
      headers:Object.assign({},tk?{Authorization:'Bearer '+tk}:{},
        d?{'Content-Type':'application/x-www-form-urlencoded','Content-Length':d.length}:{})},
      x=>{let b='';x.on('data',q=>b+=q);x.on('end',()=>{let j=null;try{j=JSON.parse(b)}catch(e){};res({s:x.statusCode,j})})});
    rq.on('error',rej); if(d)rq.write(d); rq.end();});
  const ag=Math.floor(Date.now()/1000);
  const c=b64({alg:'RS256',typ:'JWT'});
  const p=b64({iss:sa.client_email,scope:'https://www.googleapis.com/auth/datastore',
    aud:'https://oauth2.googleapis.com/token',iat:ag,exp:ag+3600});
  const a=crypto.createSign('RSA-SHA256').update(c+'.'+p).sign(sa.private_key,'base64url');
  const tk=(await req('POST','https://oauth2.googleapis.com/token',
    'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion='+c+'.'+p+'.'+a)).j.access_token;
  const B='https://firestore.googleapis.com/v1/projects/'+sa.project_id
    +'/databases/(default)/documents/';
  let b='';
  for(let i=0;i<n;i++){
    const d=await req('GET', B+'pe_lab_dados/'+id+'__'+i, null, tk);
    b += d.j.fields.p.stringValue;
  }
  global._tk = { tk, B, req };
  return zlib.gunzipSync(Buffer.from(b,'base64')).toString('utf8');
}
async function pedacoExiste(id){
  const { tk, B, req } = global._tk;
  const d = await req('GET', B+'pe_lab_dados/'+id, null, tk);
  return d.s === 200;
}
