// Minhas tarefas: a agenda de planejamento ao lado ESQUERDO do quadro, com
// botao para esconder. Antes ela ficava embaixo, e so aparecia depois de rolar
// o kanban inteiro.
const fs=require('fs');
const SRC =fs.readFileSync('/Users/acmags/rhudi/projetos.js','utf8');
const HTML=fs.readFileSync('/Users/acmags/rhudi/projetos.html','utf8');
let ok=0, fail=0;
const t=(n,c,x)=>{ if(c){ok++;console.log('  ok   '+n);} else {fail++;console.log('  FALHA '+n+(x?'  -> '+x:''));} };

const NODES={}; const PREFS={};
function mkEl(id){ return { id,_html:'',style:{display:''},className:'',textContent:'',
  value:'',checked:false,dataset:{},children:[],files:[],
  classList:{_c:new Set(),add(x){this._c.add(x)},remove(x){this._c.delete(x)},
    contains(x){return this._c.has(x)},toggle(){}},
  get innerHTML(){return this._html},
  set innerHTML(v){ this._html=String(v);
    (this._html.match(/id="([^"]+)"/g)||[]).forEach(m=>{ const k=m.slice(4,-1);
      if(!NODES[k]) NODES[k]=mkEl(k); }); },
  addEventListener(){},removeEventListener(){},appendChild(c){return c},
  insertAdjacentHTML(p,h){this._html+=h},remove(){},
  querySelectorAll(){return[]},querySelector(){return null},closest(){return null},
  focus(){},click(){},setAttribute(){},getAttribute(){return null} }; }
const document={ getElementById(id){ return NODES[id]||(NODES[id]=mkEl(id)); },
  querySelector(){return null},querySelectorAll(){return[]},
  createElement(){return mkEl('el')},addEventListener(){},removeEventListener(){},
  body:mkEl('body'),head:mkEl('head'),documentElement:mkEl('html'),
  cookie:'',readyState:'complete' };
const window={ _firebaseReady:false,_db:{},_auth:{},_doc:(...a)=>({path:a.join('/')}),
  _col:n=>n,_collection:()=>({}),_query:()=>({}),_where:()=>({}),_orderBy:()=>({}),
  _setDoc:()=>Promise.resolve(),_getDoc:()=>Promise.resolve({exists:()=>false,data:()=>({})}),
  _getDocs:()=>Promise.resolve({docs:[]}),_deleteDoc:()=>Promise.resolve(),
  _addDoc:()=>Promise.resolve({id:'x'}),_updateDoc:()=>Promise.resolve(),
  _onSnapshot:()=>()=>{},_onAuthStateChanged:()=>{},_signOut:()=>{},_inc:n=>n,
  _batch:()=>({set(){},update(){},delete(){},commit:()=>Promise.resolve()}),
  _writeBatch:()=>({set(){},update(){},delete(){},commit:()=>Promise.resolve()}),
  addEventListener(){},removeEventListener(){},
  matchMedia:()=>({matches:false,addEventListener(){}}),
  location:{href:'',search:'',hash:'',pathname:'/projetos.html'},
  history:{replaceState(){}}, navigator:{userAgent:'node'}, scrollTo(){} };
window.window=window;
const sandbox={ window,document,location:window.location,history:window.history,
  localStorage:{ getItem:k=>(k in PREFS?PREFS[k]:null), setItem:(k,v)=>{PREFS[k]=String(v)},
    removeItem:k=>{delete PREFS[k]} },
  sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  setTimeout:f=>{ if(typeof f==='function') f(); return 0; },
  setInterval:()=>0,clearTimeout:()=>{},clearInterval:()=>{},
  console,alert:()=>{},confirm:()=>true,prompt:()=>null,
  fetch:()=>Promise.reject(new Error('x')),
  Intl,Date,Math,JSON,Object,Array,String,Number,Boolean,RegExp,Error,Promise,Set,Map,
  isNaN,parseInt,parseFloat,encodeURIComponent,decodeURIComponent,
  btoa:s=>Buffer.from(s).toString('base64'),atob:s=>Buffer.from(s,'base64').toString(),
  Blob:function(){},URL:{createObjectURL:()=>'x',revokeObjectURL(){}},
  FileReader:function(){},structuredClone:o=>JSON.parse(JSON.stringify(o)) };
const nomes=Object.keys(sandbox);
const API=['viewAgenda','agendaLado','kanbanHTML','alternarAgenda','lerPref','gravarPref',
  'hoje','diasDaAgenda'];
let APP;
console.log('-- CARGA --');
try{
  APP=new Function(...nomes, SRC+'\nreturn {'
    +API.map(n=>n+':(typeof '+n+'!=="undefined"?'+n+':undefined)').join(',')
    +',setUsuario:v=>{usuario=v},setUsuarios:v=>{usuarios=v},setProjetos:v=>{projetos=v}'
    +',setTarefas:v=>{tarefas=v},setAba:v=>{aba=v},getVerAgenda:()=>verAgenda};')
    (...nomes.map(n=>sandbox[n]));
  t('projetos.js carregado',true);
}catch(e){ t('projetos.js carregado',false,e.message); process.exit(1); }

const EU={email:'alexandre.magalhaes@udiaco.com.br',nome:'Alê',papel:'master'};
APP.setUsuario(EU); APP.setUsuarios([EU]);
APP.setProjetos([{_id:'p1',nome:'Comercial',status:'ativo',visibilidade:'equipe',
  dono:EU.email,criadoPor:EU.email,frentes:[]}]);
APP.setTarefas([
  {_id:'t1',projetoId:'p1',titulo:'Fazer hoje',responsavel:EU.email,status:'a_fazer',
   prazo:APP.hoje(),criadoPor:EU.email},
  {_id:'t2',projetoId:'p1',titulo:'Em andamento',responsavel:EU.email,status:'andamento',
   prazo:APP.hoje(),criadoPor:EU.email},
  {_id:'t3',projetoId:'p1',titulo:'Sem data',responsavel:EU.email,status:'a_fazer',
   criadoPor:EU.email},
]);

console.log('\n== 1) A AGENDA FICA AO LADO, A ESQUERDA ==');
let v=APP.viewAgenda();
t('as duas metades existem', /mt-split/.test(v) && /mt-quadro/.test(v));
t('a agenda vem ANTES do quadro (esquerda)',
  v.indexOf('ag--lado') < v.indexOf('mt-quadro'),
  'agenda em '+v.indexOf('ag--lado')+', quadro em '+v.indexOf('mt-quadro'));
t('e as duas dentro do mesmo bloco',
  v.indexOf('mt-split') < v.indexOf('ag--lado'));
t('o quadro continua inteiro', /class="kanban/.test(v));
t('a agenda continua mostrando os dias', /ag__cols/.test(v) && /ag__col/.test(v));
t('e as tarefas nela', /Fazer hoje/.test(v));

console.log('\n== 2) DA PARA ESCONDER E TRAZER DE VOLTA ==');
t('começa aparecendo', APP.getVerAgenda()===true);
t('tem botão no topo', /onclick="alternarAgenda\(\)"/.test(v));
t('e outro na própria agenda', (v.match(/alternarAgenda\(\)/g)||[]).length===2,
  'n='+(v.match(/alternarAgenda\(\)/g)||[]).length);
APP.alternarAgenda();
v=APP.viewAgenda();
t('escondida, some da tela', !/ag--lado/.test(v));
t('mas o quadro continua', /class="kanban/.test(v) && /mt-quadro/.test(v));
t('e o botão do topo convida a trazer de volta',
  /Mostrar a agenda de planejamento/.test(v));
t('com o ícone virado', /ti-layout-sidebar-left-expand/.test(v));
APP.alternarAgenda();
v=APP.viewAgenda();
t('voltando, ela reaparece', /ag--lado/.test(v));

console.log('\n== 3) A ESCOLHA FICA GUARDADA ==');
APP.alternarAgenda();
t('gravou no navegador', PREFS['pe_ver_agenda']==='0', JSON.stringify(PREFS['pe_ver_agenda']));
APP.alternarAgenda();
t('e volta a gravar quando reaparece', PREFS['pe_ver_agenda']==='1');
t('é lida na abertura', /lerPref\('pe_ver_agenda', true\)/.test(SRC));
t('o padrão é aparecer', /let verAgenda = lerPref\('pe_ver_agenda', true\)/.test(SRC));

console.log('\n== 4) O QUE SAIU DO CAMINHO ==');
t('a agenda não fica mais embaixo do quadro', !/agendaRodape/.test(SRC),
  (SRC.match(/agendaRodape[^\n]*/)||[''])[0]);
t('o texto de apoio virou tooltip do botão',
  !/ag__sub">o dia em que/.test(SRC) && /arraste um item para outro dia/.test(SRC));

console.log('\n== 5) O CSS ==');
t('as duas colunas lado a lado', /\.mt-split\{[^}]*display:flex/.test(HTML));
t('o quadro ocupa o resto', /\.mt-quadro\{[^}]*flex:1 1 auto/.test(HTML));
t('a agenda tem largura fixa', /\.ag--lado\{[^}]*flex:0 0 \d+px/.test(HTML),
  (HTML.match(/\.ag--lado\{[^}]*\}/)||[''])[0].replace(/\s+/g,' ').slice(0,90));
t('e acompanha a rolagem (sticky)', /\.ag--lado\{[^}]*position:sticky/.test(HTML));
t('os dias empilham na coluna estreita',
  /\.ag--lado \.ag__cols\{[^}]*display:block/.test(HTML));
t('em tela estreita, a agenda volta para cima',
  /@media \(max-width:1100px\)\{[\s\S]{0,300}\.mt-split\{ flex-direction:column \}/.test(HTML));
t('e lá volta a ser uma faixa de dias',
  /@media \(max-width:1100px\)\{[\s\S]{0,400}\.ag--lado \.ag__cols\{ display:grid/.test(HTML));

console.log('\n'+(fail?'FALHAS: '+fail+' | ok: '+ok:'TUDO OK ('+ok+' checagens)'));
process.exit(fail?1:0);
