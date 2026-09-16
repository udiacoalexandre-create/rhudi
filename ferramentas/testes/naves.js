// A nave entra na conta das ferias: duas pessoas da mesma funcao so disputam
// cobertura se estiverem na mesma nave. Sem informacao, todo mundo e N/A.
const fs=require('fs');
const SRC=fs.readFileSync('/Users/acmags/rhudi/app.js','utf8');
const HTML=fs.readFileSync('/Users/acmags/rhudi/index.html','utf8');
let ok=0, fail=0;
const t=(n,c,x)=>{ if(c){ok++;console.log('  ok   '+n);} else {fail++;console.log('  FALHA '+n+(x?'  -> '+x:''));} };

function mkEl(id){ return { id,_html:'',style:{},className:'',textContent:'',value:'',
  dataset:{},files:[],classList:{add(){},remove(){},contains(){return false}},
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
const API=['NAVES','naveColab','naveOptions','ferColegas','ferConflitos','ferConflitoHTML',
  'formColabHTML','verificarAlertasFerias'];
let APP;
console.log('-- NAVES --');
try{
  APP=new Function(...nomes, SRC+'\nreturn {'
    +API.map(n=>n+':(typeof '+n+'!=="undefined"?'+n+':undefined)').join(',')
    +',setColabs:v=>{colaboradores=v}};')(...nomes.map(n=>sandbox[n]));
  t('app.js carregado',true);
}catch(e){ t('app.js carregado',false,e.message); process.exit(1); }

console.log('\n== 1) O CAMPO ==');
t('as cinco opcoes pedidas, nesta ordem',
  JSON.stringify(APP.NAVES)===JSON.stringify(['N/A','Nave 01','Nave 02','Nave 03','Circulando']),
  JSON.stringify(APP.NAVES));
t('quem nao tem nave gravada cai em N/A', APP.naveColab({nome:'X'})==='N/A');
t('valor estranho tambem cai em N/A', APP.naveColab({nave:'Galpao 7'})==='N/A');
t('e o que esta gravado e respeitado', APP.naveColab({nave:'Nave 02'})==='Nave 02');
const opt=APP.naveOptions({nave:'Nave 03'});
t('o select marca a nave da pessoa', /value="Nave 03" selected/.test(opt));
t('o select comeca por N/A', opt.indexOf('N/A')<opt.indexOf('Nave 01'));

const form=APP.formColabHTML('n', {nome:'X', nave:'Nave 01'});
t('o cadastro tem o campo Nave', /id="n-nave"/.test(form) && /value="Nave 01" selected/.test(form));
t('e ele fica junto da funcao, antes do departamento',
  form.indexOf('n-funcao') < form.indexOf('n-nave')
  && form.indexOf('n-nave') < form.indexOf('n-depto'));

console.log('\n== 2) QUEM DISPUTA COM QUEM ==');
const P=(id,nome,func,nave,mes,status)=>({_id:id,nome,funcao:func,nave,ferMes:mes,
  status:status||'Trabalhando'});
const lista=[
  P('a','ANA','AJUDANTE GERAL','Nave 01','Dezembro'),
  P('b','BRUNO','AJUDANTE GERAL','Nave 01','Dezembro'),
  P('c','CARLA','AJUDANTE GERAL','Nave 02','Dezembro'),
  P('d','DINA','AJUDANTE GERAL','Nave 01','Março'),
  P('e','EVA','VENDEDOR','Nave 01','Dezembro'),
  P('f','FABIO','AJUDANTE GERAL','Nave 01','Dezembro','Demitido'),
  P('g','GIL','AJUDANTE GERAL','','Dezembro'),
];
APP.setColabs(lista);
const ana=lista[0];
const col=APP.ferColegas(ana, lista).map(x=>x.nome);
t('colega e quem divide funcao E nave', col.includes('BRUNO') && col.includes('DINA'), col.join(','));
t('outra nave nao conta', !col.includes('CARLA'), col.join(','));
t('outra funcao nao conta', !col.includes('EVA'), col.join(','));
t('demitido nao conta', !col.includes('FABIO'), col.join(','));
t('a propria pessoa nao conta', !col.includes('ANA'));

const cf=APP.ferConflitos(ana, lista);
t('o conflito lista so quem esta no mesmo mes', cf.nomes.join(',')==='BRUNO', cf.nomes.join(','));
t('e diz qual mes verificar', cf.mes==='Dezembro');
t('sem mes agendado, nao ha conflito',
  APP.ferConflitos(Object.assign({},ana,{ferMes:''}), lista).nomes.length===0);
t('quem esta sozinho no mes fica limpo',
  APP.ferConflitos(lista[3], lista).nomes.length===0);
t('sem nave, o grupo e o dos N/A',
  APP.ferColegas(lista[6], lista).length===0);

console.log('\n== 3) O QUE APARECE NA TELA ==');
const h=APP.ferConflitoHTML(ana, lista);
t('dois campos: conflito de funcao e mes a verificar',
  /Conflito de função/.test(h) && /Mês a verificar/.test(h));
t('com o nome de quem conflita', /BRUNO/.test(h));
t('e o mes', /Dezembro/.test(h));
t('sem a frase antiga de cobertura', !/Atencao a cobertura/.test(h) && !/seguira coberta/.test(h));
t('sem o painel de distribuicao solto na tela', !/Agendamentos:/.test(h));
t('a distribuicao vira dica do "?"', /fev|Fevereiro|Sem ninguem agendado/i.test(h));
t('quem nao tem conflito nao ve nada', APP.ferConflitoHTML(lista[3], lista)==='');
t('o bloco pode testar outro mes antes de salvar',
  APP.ferConflitoHTML(lista[3], lista, 'Dezembro')!=='' );
t('o estilo do bloco existe', /\.fch-conf\{/.test(HTML));
t('a frase antiga saiu do app', !/Atencao a cobertura/.test(SRC));

console.log('\n'+(fail?('FALHAS: '+fail+' | ok: '+ok):('TUDO OK ('+ok+' checagens)')));
process.exit(fail?1:0);
