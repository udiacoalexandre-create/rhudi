// Quem foi demitido de uma empresa e recontratado em outra tem DOIS cadastros
// com o mesmo CPF. O desempate olhava so o filtro MEI/SOC: entre o demitido e
// o ativo ficava quem viesse primeiro na lista — e essa ordem nao e garantida.
// A pessoa podia sumir da apuracao por causa de um vinculo encerrado.
const fs=require('fs');
const SRC=fs.readFileSync('/Users/acmags/rhudi/app.js','utf8');
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
const API=['colaboradoresUnicos','_statusKey','statusGrupo'];
let APP;
console.log('-- CARGA --');
try{
  APP=new Function(...nomes, SRC+'\nreturn {'
    +API.map(n=>n+':(typeof '+n+'!=="undefined"?'+n+':undefined)').join(',')
    +',setColabs:v=>{colaboradores=v}};')(...nomes.map(n=>sandbox[n]));
  t('app.js carregado',true);
}catch(e){ t('app.js carregado',false,e.message); process.exit(1); }

const CPF='12345678901';
const demitido={_id:'d',mat:'10000948',nome:'ANTONIO NILTON SOUZA DOS ANJOS',cpf:CPF,
  status:'Demitido',filtro:'OK',vr:46,admissao:'2019-03-01'};
const ativo   ={_id:'a',mat:'10100016',nome:'ANTONIO NILTON SOUZA DOS ANJOS',cpf:CPF,
  status:'Trabalhando',filtro:'OK',vr:46,admissao:'2026-02-01'};

console.log('\n== 1) ENTRE O DEMITIDO E O ATIVO, FICA O ATIVO ==');
// as duas ordens possiveis: antes, o resultado dependia de qual viesse primeiro
APP.setColabs([demitido, ativo]);
let u=APP.colaboradoresUnicos();
t('um registro so para o CPF', u.length===1, 'n='+u.length);
t('demitido primeiro na lista: fica o ativo', u[0].mat==='10100016',
  u[0].mat+' / '+u[0].status);
APP.setColabs([ativo, demitido]);
u=APP.colaboradoresUnicos();
t('ativo primeiro na lista: fica o ativo', u[0].mat==='10100016',
  u[0].mat+' / '+u[0].status);
t('o resultado nao depende mais da ordem', true);

console.log('\n== 2) OUTROS ESTADOS ==');
const fer=Object.assign({},ativo,{_id:'f',mat:'1',status:'Ferias'});
const afa=Object.assign({},ativo,{_id:'g',mat:'2',status:'Afastado'});
const ina=Object.assign({},demitido,{_id:'i',mat:'3',status:'Inativo'});
APP.setColabs([ina, fer]);
t('inativo perde para quem esta de ferias', APP.colaboradoresUnicos()[0].status==='Ferias',
  APP.colaboradoresUnicos()[0].status);
APP.setColabs([demitido, afa]);
t('demitido perde para afastado', APP.colaboradoresUnicos()[0].status==='Afastado');
APP.setColabs([demitido, Object.assign({},demitido,{_id:'d2',mat:'9',admissao:'2020-01-01'})]);
t('dois demitidos: fica o de admissao mais recente',
  APP.colaboradoresUnicos()[0].mat==='9', APP.colaboradoresUnicos()[0].mat);

console.log('\n== 3) O QUE JA FUNCIONAVA CONTINUA ==');
const mei=Object.assign({},ativo,{_id:'m',mat:'4',filtro:'MEI'});
const okk=Object.assign({},ativo,{_id:'o',mat:'5',filtro:'OK'});
APP.setColabs([mei, okk]);
t('MEI perde para OK', APP.colaboradoresUnicos()[0].filtro==='OK');
APP.setColabs([okk, mei]);
t('em qualquer ordem', APP.colaboradoresUnicos()[0].filtro==='OK');
// o filtro so desempata entre iguais em situacao: um OK demitido nao vence um
// MEI ativo, porque vinculo encerrado perde antes
const meiAtivo=Object.assign({},ativo,{_id:'ma',mat:'6',filtro:'MEI'});
const okDemitido=Object.assign({},demitido,{_id:'od',mat:'7',filtro:'OK'});
APP.setColabs([okDemitido, meiAtivo]);
t('a situacao pesa mais que o filtro', APP.colaboradoresUnicos()[0].mat==='6',
  APP.colaboradoresUnicos()[0].mat+' filtro '+APP.colaboradoresUnicos()[0].filtro);

console.log('\n== 3b) MEI VENCE SOCIO ==');
// O cadastro de socio existe para outra finalidade e nao carrega beneficio;
// a cesta esta no de MEI. Antes os dois empatavam e o desempate caia na data
// de admissao — arbitrario, e em quatro pessoas ficava o de socio, sem nada.
const mei2={_id:'m2',mat:'10090002',nome:'AHMAD',cpf:'999',status:'Trabalhando',
  filtro:'MEI',cesta:185,admissao:'2018-07-04'};
const soc2={_id:'s2',mat:'10121000',nome:'AHMAD',cpf:'999',status:'Trabalhando',
  filtro:'SOC',admissao:'2025-11-25'};
APP.setColabs([mei2, soc2]);
t('fica o MEI, mesmo sendo o mais antigo', APP.colaboradoresUnicos()[0].filtro==='MEI',
  APP.colaboradoresUnicos()[0].filtro+' mat '+APP.colaboradoresUnicos()[0].mat);
APP.setColabs([soc2, mei2]);
t('em qualquer ordem', APP.colaboradoresUnicos()[0].filtro==='MEI');
t('e e o que tem a cesta', APP.colaboradoresUnicos()[0].cesta===185);
// data invalida nao pode mais decidir nada
const socVelho=Object.assign({},soc2,{_id:'sv',admissao:'1970-01-01'});
APP.setColabs([socVelho, mei2]);
t('admissao 01/01/1970 nao muda o resultado',
  APP.colaboradoresUnicos()[0].filtro==='MEI');
// e o OK continua na frente dos dois
const ok2=Object.assign({},mei2,{_id:'o2',mat:'10000942',filtro:'OK'});
APP.setColabs([soc2, mei2, ok2]);
t('OK vence MEI e SOCIO', APP.colaboradoresUnicos()[0].filtro==='OK');

console.log('\n== 4) SEM CPF, E POR NOME ==');
const semCpf1={_id:'s1',mat:'8',nome:'MARIA DA SILVA',cpf:'',status:'Demitido',filtro:'OK'};
const semCpf2={_id:'s2',mat:'9',nome:'Maria da Silva',cpf:'',status:'Trabalhando',filtro:'OK'};
APP.setColabs([semCpf1, semCpf2]);
u=APP.colaboradoresUnicos();
t('mesmo nome, um registro so', u.length===1, 'n='+u.length);
t('e fica o ativo', u[0].status==='Trabalhando');

console.log('\n== 5) QUEM NAO E DUPLICADO NAO E TOCADO ==');
APP.setColabs([
  {_id:'x1',mat:'100',nome:'A',cpf:'11111111111',status:'Trabalhando'},
  {_id:'x2',mat:'200',nome:'B',cpf:'22222222222',status:'Demitido'},
  {_id:'x3',mat:'300',nome:'C',cpf:'33333333333',status:'Ferias'},
]);
u=APP.colaboradoresUnicos();
t('tres CPFs, tres registros', u.length===3, 'n='+u.length);
t('o demitido sozinho continua na lista', u.some(x=>x.mat==='200'),
  'a lista devolve todos; quem filtra demitido e o cálculo do benefício');

console.log('\n'+(fail?'FALHAS: '+fail+' | ok: '+ok:'TUDO OK ('+ok+' checagens)'));
process.exit(fail?1:0);
