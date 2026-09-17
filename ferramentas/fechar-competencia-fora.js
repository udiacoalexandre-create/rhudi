// Fecha a competencia 08/2026 a partir dos arquivos que o Ale gerou fora do
// sistema: as matrizes CC x Eventos e os CSVs de lancamento. Le a matriz com
// a propria funcao do app (_lcLerCCxEventos) e confere cada CSV contra ela.
// Sem --aplicar, so mostra.
const fs=require('fs'), path=require('path');
const https=require('https'), crypto=require('crypto');
const XLSX=require('xlsx');
const APLICAR=process.argv.includes('--aplicar');
const BASE='/private/tmp/claude-501/-Users-acmags/703eb81e-32f4-413d-91b1-b69574e0ec17/scratchpad/ago26';
const MM='08', AAAA='2026', ABREV='AGO';
const QUEM='alexandre.magalhaes@udiaco.com.br';

// ── as funcoes do app ────────────────────────────────────────────────────
const SRC=fs.readFileSync('/Users/acmags/rhudi/app.js','utf8');
function mkEl(id){ return { id,_html:'',style:{},className:'',textContent:'',value:'',checked:false,
  dataset:{},files:[],classList:{add(){},remove(){},toggle(){},contains(){return false}},
  get innerHTML(){return this._html}, set innerHTML(v){this._html=String(v)},
  addEventListener(){},removeEventListener(){},appendChild(c){return c},
  insertAdjacentHTML(){},remove(){},querySelectorAll(){return[]},querySelector(){return null},
  closest(){return null},focus(){},click(){},setAttribute(){},getAttribute(){return null} }; }
const NODES={};
const document={ getElementById(id){ return NODES[id]||(NODES[id]=mkEl(id)); },
  querySelector(){return null},querySelectorAll(){return[]},createElement(){return mkEl('el')},
  addEventListener(){},removeEventListener(){},body:mkEl('body'),head:mkEl('head'),
  documentElement:mkEl('html'),cookie:'',readyState:'complete' };
const window={ _firebaseReady:false,_db:{},_auth:{},_doc:(...a)=>({}),_setDoc:()=>Promise.resolve(),
  _getDoc:()=>Promise.resolve({exists:()=>false,data:()=>({})}),_getDocs:()=>Promise.resolve({docs:[],forEach(){}}),
  _deleteDoc:()=>Promise.resolve(),_collection:()=>({}),_col:()=>({}),_query:()=>({}),
  _onAuthStateChanged:()=>{},_signOut:()=>{},
  _writeBatch:()=>({set(){},update(){},delete(){},commit:()=>Promise.resolve()}),
  addEventListener(){},removeEventListener(){},matchMedia:()=>({matches:false,addEventListener(){}}),
  location:{href:'',hash:'',pathname:'/',search:''},history:{replaceState(){}},navigator:{userAgent:'node'} };
window.window=window;
const sandbox={ window,document,location:window.location,history:window.history,
  localStorage:{_d:{},getItem(k){return this._d[k]??null},setItem(k,v){this._d[k]=String(v)},removeItem(){}},
  sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  setTimeout:()=>0,setInterval:()=>0,clearTimeout:()=>{},clearInterval:()=>{},
  console,alert:()=>{},confirm:()=>true,prompt:()=>null,fetch:()=>Promise.reject(new Error('x')),
  XLSX,ExcelJS:{Workbook:function(){}},JSZip:function(){},pdfjsLib:{},
  Intl,Date,Math,JSON,Object,Array,String,Number,Boolean,RegExp,Error,Promise,Set,Map,
  isNaN,parseInt,parseFloat,encodeURIComponent,decodeURIComponent,
  btoa:s=>Buffer.from(s).toString('base64'),atob:s=>Buffer.from(s,'base64').toString(),
  Blob:function(){},URL:{createObjectURL:()=>'x',revokeObjectURL(){}},FileReader:function(){},
  structuredClone:o=>JSON.parse(JSON.stringify(o)) };
const nomes=Object.keys(sandbox);
const API=['_lcLerCCxEventos','_lcResolveSigla','_lcNomeSaida','_ecNormCod'];
const APP=new Function(...nomes, SRC+'\nreturn {'+API.map(n=>n+':'+n).join(',')+'};')(...nomes.map(n=>sandbox[n]));

// ── empresa: codigo e nome, como ja gravados em 07/2026 ──────────────────
const EMPRESAS={
  'Carapicuiba':{code:'1000',nome:'UDIAÇO COMERCIO E IND. DE FERRO E AÇO LT'},
  'SNPL':{code:'1001',nome:'SNPL PRESTADORA DE SERVICOS EMP. LTDA'},
  'TREVIZ':{code:'1002',nome:'TREVIZ PRESTADORA DE SERV. EMP. LTDA'},
  'Mzolli':{code:'1003',nome:'MZOLLI PREST. DE SER. EMPRESARIAIS LTDA'},
  'Francis':{code:'1004',nome:'FRANCIS BF PREST. DE SERV. EMPRES. LTDA'},
  'MLS':{code:'1005',nome:'MLS PRESTADORA DE SERVICOS EMPRESARIAIS'},
  'MJP':{code:'1006',nome:'MJP PREST. DE SERV. EMPRESARIAIS LTDA'},
  'CR':{code:'1007',nome:'CR PRESTADORA DE SERVICOS LTDA'},
  'AGS':{code:'1008',nome:'AGS PRESTADORA DE SERV. EMPRES. LTD'},
  'G.SILVA':{code:'1010',nome:'PRESTADORA DE SERVICOS EMPRESARIAIS G.'},
  'Udbens':{code:'1011',nome:'UDBENS ADMINISTRACAO E LOCACOES LTDA'},
  'SHW':{code:'1012',nome:'SHW PRESTADORA DE SERVICOS LTDA'},
};

// ── os CSVs entregues ────────────────────────────────────────────────────
const num=s=>Number(String(s).replace(/"/g,'').replace(/\./g,'').replace(',','.'))||0;
function lerCsv(arq){
  const L=fs.readFileSync(arq,'utf8').split(/\r?\n/).filter(x=>x.trim());
  let dr=0, cr=0; const orgs=new Set(), contas=new Set(), ccs=new Set();
  L.slice(1).forEach(l=>{
    const c=(l.match(/("[^"]*"|[^,]+)/g)||[]).map(x=>x.replace(/"/g,''));
    orgs.add(c[0]); contas.add(c[2]); ccs.add(c[3]);
    dr+=num(c[4]); cr+=num(c[5]);
  });
  return {linhas:L.length-1, dr, cr, balanceado:Math.abs(dr-cr)<0.005,
    org:[...orgs][0]||'', contas:contas.size, ccs:ccs.size};
}
const csvs={};
fs.readdirSync(BASE+'/csvs').filter(f=>f.endsWith('.csv')).forEach(f=>{
  csvs[f]=Object.assign({arquivo:f}, lerCsv(BASE+'/csvs/'+f));
});

// ── as matrizes CC x Eventos ─────────────────────────────────────────────
const itens=[];
fs.readdirSync(BASE+'/files').filter(f=>/\.xlsx$/i.test(f)).sort().forEach(f=>{
  const wb=XLSX.readFile(BASE+'/files/'+f);
  const aba=wb.SheetNames.find(n=>/cc\s*x\s*eventos/i.test(n))||wb.SheetNames[0];
  const rows=XLSX.utils.sheet_to_json(wb.Sheets[aba],{header:1,raw:true,defval:null});
  const dados=APP._lcLerCCxEventos(rows);

  // Total geral do proprio relatorio: serve de conferencia da leitura. Soma so
  // as colunas de evento — a ultima coluna da matriz e o TOTAL da linha.
  const cab=rows[3]||[];
  const colEvento=c=>/^\d+/.test(String((cab[c]==null?'':cab[c])).trim());
  const linTotal=rows.find(r=>String((r||[])[0]||'').trim().toUpperCase().startsWith('TOTAL GERAL'))||[];
  let agregado=0;
  for(let c=1;c<linTotal.length;c++){ if(!colEvento(c)) continue;
    const v=Number(linTotal[c]); if(isFinite(v)) agregado+=v; }

  // Periodo: vem escrito no cabecalho da propria matriz.
  const per=String((rows[1]||[]).filter(Boolean).join(' ')).match(/(\d{2}\/\d{2}\/\d{4})\s*a\s*(\d{2}\/\d{2}\/\d{4})/);

  let totalGeral=0; const eventos=new Set();
  dados.linhas.forEach(l=>l.celulas.forEach(cel=>{
    const v=Number(cel.valor); if(!isFinite(v)||v===0) return;
    totalGeral+=v; eventos.add(APP._ecNormCod(cel.cod));
  }));

  const sigla=APP._lcResolveSigla(f);
  const chave=x=>String(x).toUpperCase().replace(/[^A-Z0-9]/g,'');
  const esperado=APP._lcNomeSaida(sigla,MM,AAAA);
  const csv=csvs[esperado]
    || Object.values(csvs).find(c=>chave(c.arquivo)===chave(esperado));
  const dif=agregado?totalGeral-agregado:null;
  itens.push({arquivo:f, sigla, dados, totalGeral, agregado:agregado||null, dif,
    periodoIni:per?per[1]:'01/'+MM+'/'+AAAA, periodoFim:per?per[2]:'31/'+MM+'/'+AAAA,
    status: agregado? (Math.abs(dif)<0.01?'OK':'DIVERGENTE') : 'SEM_AGREGADO',
    qtdCCs:dados.linhas.length, qtdEventos:eventos.size, eventos, csv});
});

// ── o que aparece na tela ────────────────────────────────────────────────
const brl=v=>v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
console.log((APLICAR?'== GRAVANDO ==':'== PREVIA (rode com --aplicar) ==')+'   competencia '+MM+'/'+AAAA+'\n');
console.log('cod  empresa'.padEnd(16)+'CCs'.padStart(4)+'ev'.padStart(4)
  +'  total da folha'.padStart(16)+'  conf'.padEnd(7)+' linhas'.padStart(7)
  +'      lancado'.padStart(15)+'  bal  nao lancado');
let tGeral=0, tLanc=0, tLinhas=0; const semCsv=[], semEmp=[];
itens.sort((a,b)=>String((EMPRESAS[a.sigla]||{}).code||'').localeCompare(String((EMPRESAS[b.sigla]||{}).code||'')))
  .forEach(x=>{
  const e=EMPRESAS[x.sigla]; if(!e){ semEmp.push(x.sigla); }
  if(!x.csv) semCsv.push(x.sigla);
  tGeral+=x.totalGeral; if(x.csv){ tLanc+=x.csv.dr; tLinhas+=x.csv.linhas; }
  const fora=x.csv?(x.totalGeral-x.csv.dr):null;
  console.log(((e?e.code:'????')+' '+x.sigla).padEnd(16)
    +String(x.qtdCCs).padStart(4)+String(x.qtdEventos).padStart(4)
    +brl(x.totalGeral).padStart(16)+'  '+x.status.padEnd(7)
    +(x.csv?String(x.csv.linhas).padStart(7)+brl(x.csv.dr).padStart(15)
      +(x.csv.balanceado?'   ok':'  NAO')+'  '+(Math.abs(fora)<0.01?'—':brl(fora))
      :'   SEM CSV'));
});
console.log('\n  '+itens.length+' empresas · folhas '+brl(tGeral)+' · CSVs '+tLinhas+' linhas · lançado '+brl(tLanc));
console.log('  diferença folha × lançado: '+brl(tGeral-tLanc)
  +(Math.abs(tGeral-tLanc)<0.01?'  (tudo lançado)':'  (eventos sem lançamento contábil)'));
console.log('  empresas sem código conhecido: '+(semEmp.length?semEmp.join(', '):'nenhuma'));
console.log('  empresas sem CSV: '+(semCsv.length?semCsv.join(', '):'nenhuma'));
const sobra=Object.keys(csvs).filter(f=>!itens.some(x=>x.csv&&x.csv.arquivo===f));
console.log('  CSV sem planilha: '+(sobra.length?sobra.join(', '):'nenhum'));
if(!APLICAR){ console.log('\nnada foi gravado.'); process.exit(0); }
if(semEmp.length||semCsv.length){ console.error('\nresolva as pendencias acima antes de gravar.'); process.exit(1); }

// ── grava o historico, no formato do assistente ──────────────────────────
const R=path.join(process.env.HOME,'udiaco-dados-privados');
const cabe=x=>/firebase-adminsdk.*\.json$/i.test(x);
let K=null;
for(const i of fs.readdirSync(R,{withFileTypes:true})){
  if(i.isFile()&&cabe(i.name)){K=path.join(R,i.name);break;}
  if(i.isDirectory()&&i.name!=='node_modules'){
    try{ const x=fs.readdirSync(path.join(R,i.name)).find(cabe); if(x){K=path.join(R,i.name,x);break;} }catch(e){}
  }
}
const sa=JSON.parse(fs.readFileSync(K,'utf8'));
const b64=o=>Buffer.from(typeof o==='string'?o:JSON.stringify(o)).toString('base64url');
const req=(m,u,c,t)=>new Promise((res,rej)=>{const U=new URL(u);
  const d=c?Buffer.from(typeof c==='string'?c:JSON.stringify(c)):null;
  const r=https.request({hostname:U.hostname,path:U.pathname+U.search,method:m,
    headers:Object.assign({},t?{Authorization:'Bearer '+t}:{},
      d?{'Content-Type':typeof c==='string'?'application/x-www-form-urlencoded':'application/json','Content-Length':d.length}:{})},
    x=>{let b='';x.on('data',q=>b+=q);x.on('end',()=>{let j=null;try{j=JSON.parse(b)}catch(e){};
      x.statusCode>=300?rej(new Error(x.statusCode+' '+String(b).slice(0,300))):res(j)})});
  r.on('error',rej); if(d)r.write(d); r.end();});
function val(v){
  if(v===null||v===undefined) return {nullValue:null};
  if(typeof v==='boolean') return {booleanValue:v};
  if(typeof v==='number') return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};
  if(Array.isArray(v)) return {arrayValue:{values:v.map(val)}};
  if(typeof v==='object') return {mapValue:campos(v)};
  return {stringValue:String(v)};
}
const campos=o=>{const f={};Object.entries(o).forEach(([k,v])=>f[k]=val(v));return {fields:f};};

(async()=>{
  const ag=Math.floor(Date.now()/1000);
  const c=b64({alg:'RS256',typ:'JWT'});
  const p=b64({iss:sa.client_email,scope:'https://www.googleapis.com/auth/datastore',
    aud:'https://oauth2.googleapis.com/token',iat:ag,exp:ag+3600});
  const a=crypto.createSign('RSA-SHA256').update(c+'.'+p).sign(sa.private_key,'base64url');
  const tk=(await req('POST','https://oauth2.googleapis.com/token',
    'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion='+c+'.'+p+'.'+a)).access_token;
  const B='https://firestore.googleapis.com/v1/projects/'+sa.project_id+'/databases/(default)/documents/';
  const quando=new Date().toISOString();
  let n=0;
  for(const x of itens){
    const e=EMPRESAS[x.sigla];
    const doc={
      competencia:MM+'/'+AAAA,
      periodoIni:x.periodoIni, periodoFim:x.periodoFim,
      empresaCodigo:e.code, empresaNome:x.dados.empresaNome||e.nome,
      sigla:x.sigla,
      qtdCCs:x.qtdCCs, qtdEventos:x.qtdEventos,
      totalGeral:x.totalGeral, agregado:x.agregado, diferenca:x.dif,
      statusReconciliacao:x.status,
      linhasCsv:x.csv.linhas, totalLancado:x.csv.dr, balanceado:x.csv.balanceado,
      semMapeamento:[],
      arquivoCsv:x.csv.arquivo, arquivoOrigem:x.arquivo,
      processadoEm:quando, usuario:QUEM,
      geradoFora:true,
      observacao:'Fechamento gerado fora da plataforma; log registrado a partir das matrizes CC x Eventos e dos CSVs entregues.'
    };
    await req('PATCH', B+'contabilizacao_historico/'+AAAA+'-'+MM+'__'+e.code, campos(doc), tk);
    n++;
  }
  console.log('\n  '+n+' registros gravados');
  const conf=await req('GET', B+'contabilizacao_historico?pageSize=300', null, tk);
  const doMes=(conf.documents||[]).filter(d=>d.name.includes('/'+AAAA+'-'+MM+'__'));
  console.log('  no banco, competência '+MM+'/'+AAAA+': '+doMes.length+' empresa(s)');
})().catch(e=>{ console.error('erro:', e.message); process.exit(1); });
