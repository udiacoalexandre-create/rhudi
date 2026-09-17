// Ferias Agendadas: a aba serve para achar conflito de cobertura — mesma
// funcao e mesma nave no mesmo mes. Verde esta livre, vermelho precisa olhar.
const fs=require('fs');
const SRC=fs.readFileSync('/Users/acmags/rhudi/app.js','utf8');
const HTML=fs.readFileSync('/Users/acmags/rhudi/index.html','utf8');
let ok=0, fail=0;
const t=(n,c,x)=>{ if(c){ok++;console.log('  ok   '+n);} else {fail++;console.log('  FALHA '+n+(x?'  -> '+x:''));} };

function mkEl(id){ return { id,_html:'',style:{},className:'',textContent:'',value:'',
  checked:false,dataset:{},files:[],
  classList:{_c:new Set(),add(x){this._c.add(x)},remove(x){this._c.delete(x)},
    toggle(x,v){ v?this._c.add(x):this._c.delete(x) },contains(x){return this._c.has(x)}},
  get innerHTML(){return this._html}, set innerHTML(v){this._html=String(v)},
  addEventListener(){},removeEventListener(){},appendChild(c){return c},
  insertAdjacentHTML(){},remove(){},querySelectorAll(){return[]},querySelector(){return null},
  closest(){return null},focus(){},click(){},setAttribute(){},getAttribute(){return null} }; }
const NODES={};
const document={ getElementById(id){ return NODES[id]||(NODES[id]=mkEl(id)); },
  querySelector(){return null},querySelectorAll(){return[]},createElement(){return mkEl('el')},
  addEventListener(){},removeEventListener(){},body:mkEl('body'),head:mkEl('head'),
  documentElement:mkEl('html'),cookie:'',readyState:'complete' };
const window={ _firebaseReady:false,_db:{},_auth:{},_doc:(...a)=>({p:a.join('/')}),
  _setDoc:()=>Promise.resolve(),_getDoc:()=>Promise.resolve({exists:()=>false,data:()=>({})}),
  _getDocs:()=>Promise.resolve({docs:[],forEach(){}}),_deleteDoc:()=>Promise.resolve(),
  _collection:()=>({}),_query:()=>({}),_onAuthStateChanged:()=>{},_signOut:()=>{},
  _writeBatch:()=>({set(){},update(){},delete(){},commit:()=>Promise.resolve()}),
  addEventListener(){},removeEventListener(){},matchMedia:()=>({matches:false,addEventListener(){}}),
  location:{href:'',hash:'',pathname:'/',search:''},history:{replaceState(){}},
  navigator:{userAgent:'node'} };
window.window=window;
const sandbox={ window,document,location:window.location,history:window.history,
  localStorage:{_d:{},getItem(k){return this._d[k]??null},setItem(k,v){this._d[k]=String(v)},removeItem(){}},
  sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  setTimeout:()=>0,setInterval:()=>0,clearTimeout:()=>{},clearInterval:()=>{},
  console,alert:()=>{},confirm:()=>true,prompt:()=>null,fetch:()=>Promise.reject(new Error('x')),
  XLSX:{utils:{}},ExcelJS:{Workbook:function(){}},JSZip:function(){},pdfjsLib:{},
  Intl,Date,Math,JSON,Object,Array,String,Number,Boolean,RegExp,Error,Promise,Set,Map,
  isNaN,parseInt,parseFloat,encodeURIComponent,decodeURIComponent,
  btoa:s=>Buffer.from(s).toString('base64'),atob:s=>Buffer.from(s,'base64').toString(),
  Blob:function(){},URL:{createObjectURL:()=>'x',revokeObjectURL(){}},FileReader:function(){},
  structuredClone:o=>JSON.parse(JSON.stringify(o)) };
const nomes=Object.keys(sandbox);
const API=['ferChaveCobertura','ferConflitosDoMes','renderFeriasAgendadas','pgFeriasAgendadas',
  'naveColab','funcaoColab'];
let APP;
console.log('-- FERIAS AGENDADAS --');
try{
  APP=new Function(...nomes, SRC+'\nreturn {'
    +API.map(n=>n+':(typeof '+n+'!=="undefined"?'+n+':undefined)').join(',')
    +',setColabs:v=>{colaboradores=v}};')(...nomes.map(n=>sandbox[n]));
  t('app.js carregado',true);
}catch(e){ t('app.js carregado',false,e.message); process.exit(1); }

console.log('\n== 1) QUEM CONFLITA COM QUEM ==');
const P=(id,nome,func,nave,mes)=>({_id:id,nome,funcao:func,nave,ferMes:mes,
  status:'Trabalhando',cargo:func});
const gente=[
  P('a','ANA','AJUDANTE GERAL','Nave 01','Outubro'),
  P('b','BRUNO','AJUDANTE GERAL','Nave 01','Outubro'),   // conflita com ANA
  P('c','CARLA','AJUDANTE GERAL','Nave 02','Outubro'),   // outra nave: livre
  P('d','DINA','VENDEDOR','Nave 01','Outubro'),          // outra funcao: livre
  P('e','EVA','AJUDANTE GERAL','Nave 01','Marco'),        // outro mes: livre
];
const outubro=gente.filter(c=>c.ferMes==='Outubro');
const conta=APP.ferConflitosDoMes(outubro);
t('a chave cruza função e nave', APP.ferChaveCobertura(gente[0])==='AJUDANTE GERAL | Nave 01');
t('duas pessoas da mesma função e nave contam como conflito',
  conta['AJUDANTE GERAL | Nave 01']===2, JSON.stringify(conta));
t('quem está em outra nave não conflita', conta['AJUDANTE GERAL | Nave 02']===1);
t('quem tem outra função não conflita', conta['VENDEDOR | Nave 01']===1);
t('o mês de outra pessoa não entra na conta',
  Object.values(conta).reduce((a,b)=>a+b,0)===4);

console.log('\n== 2) O QUE A TELA MOSTRA ==');
APP.setColabs(gente);
let erro='';
try{ APP.renderFeriasAgendadas(); }catch(e){ erro=e.message; }
const grid=NODES['feragd-grid']?NODES['feragd-grid'].innerHTML:'';
t('a tela monta', !erro && grid.length>200, erro||('len='+grid.length));
const cards=grid.match(/<div class="ag-card[^"]*"[\s\S]*?<\/div><\/div>/g)||[];
t('um card por pessoa agendada', (grid.match(/class="ag-card[ "]/g)||[]).length===5,
  ''+(grid.match(/class="ag-card[ "]/g)||[]).length);
const daAna=grid.slice(grid.indexOf('ANA')-200, grid.indexOf('ANA')+200);
t('quem conflita fica vermelho', /ag-card--bate/.test(daAna), daAna.slice(0,90));
const daCarla=grid.slice(Math.max(0,grid.indexOf('CARLA')-200), grid.indexOf('CARLA')+200);
t('quem não conflita fica verde', !/ag-card--bate[^"]*"[^>]*>[^<]*<div class="ag-card__n">CARLA/.test(grid)
  && /ag-card"[^>]*>\s*<div class="ag-card__n">CARLA/.test(grid), daCarla.slice(0,120));
t('vermelhos são exatamente dois', (grid.match(/ag-card--bate/g)||[]).length===2,
  ''+(grid.match(/ag-card--bate/g)||[]).length);

console.log('\n== 3) O CARD TEM SÓ TRÊS LINHAS ==');
t('nome, função e nave', /ag-card__n/.test(grid) && /ag-card__f/.test(grid) && /ag-card__v/.test(grid));
t('sem saldo de dias no card', !/rad-saldo/.test(grid) && !/\d+d<\/span>/.test(grid));
t('sem data de vencimento no card', !/rad-venc/.test(grid) && !/Vence /.test(grid));
t('sem departamento no card', !/rad-agend/.test(grid));
t('a nave aparece escrita', /Nave 01/.test(grid) && /Nave 02/.test(grid));

console.log('\n== 4) O RESUMO ==');
const res=NODES['feragd-resumo']?NODES['feragd-resumo'].innerHTML:'';
t('conta quantos estão em conflito', /Em conflito/.test(res));
t('e quantos estão livres', /Sem conflito/.test(res));
t('e quem ainda não tem mês', /Sem mês definido/.test(res));
t('sem os contadores que não são desta aba',
  !/Afastados/.test(res) && !/Não se aplicam/.test(res), res.slice(0,200));

console.log('\n== 5) O ESTILO ==');
t('card verde por padrão', /\.ag-card\{ border:1\.5px solid var\(--green\)/.test(HTML));
t('e vermelho quando bate', /\.ag-card--bate\{ border-color:var\(--red\)/.test(HTML));
t('a aba explica para que serve', /Confere conflito de cobertura/.test(APP.pgFeriasAgendadas()));

console.log('\n'+(fail?('FALHAS: '+fail+' | ok: '+ok):('TUDO OK ('+ok+' checagens)')));
process.exit(fail?1:0);
