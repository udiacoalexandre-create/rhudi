// Carga de ferias da Senior: os periodos passam a vir prontos, o periodo fica
// travado ate o vencimento, o saldo soma os periodos (podendo ficar negativo
// nas coletivas) e o aviso sai 60 dias antes do ultimo dia para COMECAR.
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
const API=['ferTemCarga','ferDaCarga','ferPeriodosAquisitivos','ferFaixa','ferFaixaInfo',
  'ferUltimoInicio','FER_ANTES_DO_LIMITE','_dataLocal','_hoje0','_diasAte',
  'ferExtrato','ferExtratoCarga','ferFichaHTML','ferCabHTML','ferSituacao','ferSitPeriodo',
  'ferHistoricoDobra','ferAlternarHistorico'];
let APP;
console.log('-- CARGA --');
try{
  APP=new Function(...nomes, SRC+'\nreturn {'
    +API.map(n=>n+':(typeof '+n+'!=="undefined"?'+n+':undefined)').join(',')
    +',setColabs:v=>{colaboradores=v}};')(...nomes.map(n=>sandbox[n]));
  t('app.js carregado',true);
}catch(e){ t('app.js carregado',false,e.message); process.exit(1); }

const HOJE=new Date(2026,8,16);      // 16/09/2026, o dia combinado
// Um colaborador tipico da planilha: periodo vencido com 30 dias em aberto e
// periodo atual ainda em curso.
const base=(per,extra)=>Object.assign({
  _id:'c1', mat:'10000162', nome:'LUIS AUGUSTO PERES', admissao:'2006-11-01',
  status:'Trabalhando', ferSaldo:30,
  feriasBase:Object.assign({ origem:'Senior FPPF001.COL 14/09/2026',
    carregadoEm:'2026-09-16T12:00:00.000Z', periodos:per }, extra||{}),
}, {});

console.log('\n== 1) QUEM TEM CARGA USA A CARGA ==');
const semCarga={_id:'x',mat:'1',nome:'SEM',admissao:'2020-01-01',status:'Trabalhando',ferSaldo:0};
t('sem carga, nao ativa o modelo novo', APP.ferTemCarga(semCarga)===false);
t('e continua calculando pela admissao',
  !!APP.ferPeriodosAquisitivos(semCarga,HOJE) && !APP.ferPeriodosAquisitivos(semCarga,HOJE).daCarga);
const c1=base([
  {ini:'2024-11-01',venc:'2025-10-31',direito:30,debito:0,saldo:30,tipo:'vencido',
   limiteLegal:'2026-10-31'},
  {ini:'2025-11-01',venc:'2026-10-31',direito:30,debito:0,saldo:0,tipo:'atual'},
]);
t('com carga, ativa', APP.ferTemCarga(c1)===true);
const p1=APP.ferPeriodosAquisitivos(c1,HOJE);
t('e o resultado vem da carga', p1.daCarga===true);
t('guarda de onde veio', /FPPF001/.test(p1.origem), p1.origem);
t('dois periodos, nem mais nem menos', p1.ciclos.length===2, 'n='+p1.ciclos.length);

console.log('\n== 2) O PERIODO FICA TRAVADO ATE O VENCIMENTO ==');
t('o vencido (31/10/2025) esta liberado', p1.ciclos[0].liberado===true);
t('o atual (31/10/2026) ainda nao', p1.ciclos[1].liberado===false);
t('e diz quando libera', p1.ciclos[1].liberaEm instanceof Date
  && p1.ciclos[1].liberaEm.getFullYear()===2026 && p1.ciclos[1].liberaEm.getMonth()===9,
  String(p1.ciclos[1].liberaEm));
t('o liberado nao mostra data de liberacao', p1.ciclos[0].liberaEm===null);
t('direito conta so o que ja venceu', p1.direito===30, 'direito='+p1.direito);
t('o periodo em curso e o em formacao', p1.emFormacao===p1.ciclos[1]);

console.log('\n== 3) O SALDO SOMA OS PERIODOS ==');
t('30 + 0 = 30', p1.saldo===30, 'saldo='+p1.saldo);
const c2=base([
  {ini:'2024-11-01',venc:'2025-10-31',direito:30,debito:10,saldo:20,tipo:'vencido'},
  {ini:'2025-11-01',venc:'2026-08-31',direito:30,debito:0,saldo:30,tipo:'atual'},
]);
const p2=APP.ferPeriodosAquisitivos(c2,HOJE);
t('dois vencidos somam 20 + 30 = 50', p2.saldo===50, 'saldo='+p2.saldo);
t('e os dois contam como direito', p2.direito===60, 'direito='+p2.direito);
t('quem ainda tem dias fica em aberto', p2.abertos.length===2);

console.log('\n== 4) COLETIVAS: SALDO NEGATIVO E INFORMACAO, NAO ERRO ==');
const c3=base([
  {ini:'2024-11-01',venc:'2025-10-31',direito:30,debito:30,saldo:0,tipo:'vencido'},
  {ini:'2025-11-01',venc:'2026-08-31',direito:30,debito:45,saldo:-15,tipo:'atual'},
]);
const p3=APP.ferPeriodosAquisitivos(c3,HOJE);
t('saldo fica negativo', p3.saldo===-15, 'saldo='+p3.saldo);
t('e nao e zerado a forca', p3.saldo<0);
t('registra quanto esta devendo', p3.devendo===15, 'devendo='+p3.devendo);
t('quem zerou nao aparece como em aberto',
  p3.abertos.length===0, 'abertos='+p3.abertos.length);

console.log('\n== 5) O PRAZO PARA GOZO ==');
t('o ultimo dia para COMECAR e 30 dias antes do limite', APP.FER_ANTES_DO_LIMITE===30);
const lim=new Date(2026,11,31);                       // limite legal 31/12/2026
const ini=APP.ferUltimoInicio({limite:lim});
t('limite 31/12 -> comecar ate 01/12', ini.getMonth()===11 && ini.getDate()===1,
  ini.toISOString().slice(0,10));
t('sem limite, nao inventa data', APP.ferUltimoInicio({})===null);
// as faixas passam a medir a distancia ate esse ultimo dia de inicio
const comLimite=d=>base([
  {ini:'2024-11-01',venc:'2025-10-31',direito:30,debito:0,saldo:30,tipo:'vencido',limiteLegal:d},
  {ini:'2025-11-01',venc:'2026-10-31',direito:30,debito:0,saldo:0,tipo:'atual'},
]);
const faixaDe=d=>APP.ferFaixa(APP.ferPeriodosAquisitivos(comLimite(d),HOJE),HOJE);
// de 16/09 ate o ultimo dia de inicio (limite menos 30):
t('limite 15/12/2026 -> comecar ate 15/11, 60 dias: e a janela do aviso',
  faixaDe('2026-12-15')==='60d', faixaDe('2026-12-15'));
t('limite 31/12/2026 -> 76 dias, ainda folgado', faixaDe('2026-12-31')==='90d',
  faixaDe('2026-12-31'));
t('limite 15/11/2026 -> 30 dias, ja apertado', faixaDe('2026-11-15')==='30d',
  faixaDe('2026-11-15'));
t('a janela de 60 dias e a que o Ale pediu para ser avisado',
  APP.ferFaixaInfo('60d').lbl==='≤ 60 dias', APP.ferFaixaInfo('60d').lbl);
t('limite 16/10/2026: 30 dias -> aperta', faixaDe('2026-10-16')==='30d', faixaDe('2026-10-16'));
t('limite 01/10/2026: ja passou do dia de comecar -> vencido',
  faixaDe('2026-10-01')==='vencido', faixaDe('2026-10-01'));
t('limite 16/09/2027: mais de 6 meses', faixaDe('2027-09-16')==='6a12m', faixaDe('2027-09-16'));

console.log('\n== 6) SEM SALDO, SEM ALERTA ==');
const zerado=base([
  {ini:'2024-11-01',venc:'2025-10-31',direito:30,debito:30,saldo:0,tipo:'vencido',
   limiteLegal:'2026-10-01'},
  {ini:'2025-11-01',venc:'2026-10-31',direito:30,debito:0,saldo:0,tipo:'atual'},
]);
t('quem nao tem dia a tirar fica em dia',
  APP.ferFaixa(APP.ferPeriodosAquisitivos(zerado,HOJE),HOJE)==='emdia');

console.log('\n== 7) O QUE A CARGA NAO MEXE ==');
t('quem nao e elegivel continua fora',
  APP.ferPeriodosAquisitivos(Object.assign({},c1,{elegibilidade:{ferias:false}}),HOJE)===null);
t('o mes de agendamento nao entra no modelo', !/ferMes/.test(
  (SRC.match(/function ferDaCarga[\s\S]*?\n\}/)||[''])[0]),
  'a carga nao deve tocar em ferMes');

console.log('\n== 8) A FICHA, COM O CASO REAL DO RODRIGO ==');
// 30 dias do periodo vencido, ferias marcadas para 03/11 a 22/11 (20 dias)
// mais 10 vendidos: fecha os 30.
const rodrigo={_id:'r', mat:'10070020', nome:'RODRIGO LEITE MACEDO DE ARAUJO',
  funcao:'VENDEDOR (BALCÃO)', admissao:'2023-01-02', status:'Trabalhando',
  ferMes:'Outubro', ferSaldo:30, ferInicio:'2026-11-03', ferFim:'2026-11-22',
  ferDiasComprados:10,
  feriasLog:[{quando:'2026-09-01T10:00:00.000Z',quem:'julia@udiaco.com.br',
    acao:'Edição',mudancas:[{rotulo:'mês de agendamento',de:'—',para:'Outubro'}]}],
  feriasBase:{origem:'FPPF001.COL 14/09/2026', carregadoEm:'2026-09-16T17:38:00Z',
    limiteLegal:'2027-01-01', proxVenc:'2028-01-01', periodos:[
      {tipo:'vencido',ini:'2025-01-02',venc:'2026-01-01',direito:30,debito:0,saldo:30,
       limiteLegal:'2027-01-01'},
      {tipo:'atual',ini:'2026-01-02',venc:'2027-01-01',direito:0,debito:0,saldo:0}]}};
const exR=APP.ferExtrato(rodrigo,HOJE);
t('o extrato vem da carga', exR.daCarga===true);
t('dois periodos na ficha', exR.periodos.length===2, 'n='+exR.periodos.length);
t('o extrato mantem a ordem cronologica', exR.periodos[1].travado===true);
t('saldo disponivel 30', exR.somaSaldos===30, String(exR.somaSaldos));
t('os 30 dias marcados aparecem como programados',
  exR.periodos[0].programado===30, String(exR.periodos[0].programado));
t('e a venda e reconhecida no periodo', exR.periodos[0].temVenda===true);
t('o gozo passado NAO e recontado (ja esta no debito da carga)',
  exR.periodos[0].usado===0, 'usado='+exR.periodos[0].usado);

const sit=APP.ferSituacao(rodrigo, exR, HOJE);
t('situacao: agendado', sit.k==='agendado', sit.k+' / '+sit.lbl);
const semData=Object.assign({},rodrigo,{ferInicio:'',ferFim:'',ferDiasComprados:0});
t('sem data marcada: nao agendado',
  APP.ferSituacao(semData, APP.ferExtrato(semData,HOJE), HOJE).k==='pendente');
const zerado2=Object.assign({},rodrigo,{ferInicio:'',ferFim:'',ferDiasComprados:0,
  feriasBase:Object.assign({},rodrigo.feriasBase,{periodos:[
    Object.assign({},rodrigo.feriasBase.periodos[0],{debito:30,saldo:0}),
    rodrigo.feriasBase.periodos[1]]})});
t('sem dias a tirar: em dia',
  APP.ferSituacao(zerado2, APP.ferExtrato(zerado2,HOJE), HOJE).k==='emdia');

console.log('\n== 9) O QUE A FICHA MOSTRA ==');
const cab=APP.ferCabHTML(rodrigo,'02/01/23','<strong>Outubro/2026</strong>');
const html=APP.ferFichaHTML(rodrigo, exR, HOJE, cab);
t('o numero de dias em destaque', /fch-saldo__n">30</.test(html),
  (html.match(/fch-saldo__n[^<]*<[^<]*/)||[''])[0]);
t('com a situacao ao lado', /badge--accent[^>]*>agendado/.test(html));
t('os dois periodos com inicio e fim',
  /02\/01\/2025 a 01\/01\/2026/.test(html) && /02\/01\/2026 a 01\/01\/2027/.test(html),
  (html.match(/fch-per__dt">[^<]*/g)||[]).join(' | '));
t('o limite para gozar, um mes antes do legal', /gozar até <b>02\/12\/2026<\/b>/.test(html),
  (html.match(/gozar até <b>[^<]*/)||[''])[0]);
t('a saida e a volta marcadas', /saída → volta[\s\S]{0,60}03\/11 → 22\/11/.test(html),
  (html.match(/fch-mov__r[^<]*<[^>]*>[^<]*/g)||[]).join(' | '));
t('os dias vendidos', /dias vendidos[\s\S]{0,80}−10d/.test(html),
  (html.match(/dias vendidos[\s\S]{0,90}/)||[''])[0].replace(/<[^>]*>/g,' '));
t('o saldo do periodo no fim', /saldo do período/.test(html));
t('o travado diz quando libera', /libera 30 dias em <b>01\/01\/2027<\/b>/.test(html),
  (html.match(/libera[^<]*<b>[^<]*/)||[''])[0]);
t('e nao mostra saldo de periodo que nao venceu',
  (html.match(/saldo do período/g)||[]).length===1,
  'n='+(html.match(/saldo do período/g)||[]).length);
t('o historico fica recolhido', /fch-hist-bt/.test(html) && /display:none/.test(html));
t('e diz quantos registros tem', /Histórico \(1\)/.test(html),
  (html.match(/Histórico \([^)]*\)/)||[''])[0]);

t('quem ja agendou continua com o selo agendado, sem botao',
  !/fch-ag/.test(html) && /agendado/.test(html));
const semAg=Object.assign({}, rodrigo, {ferInicio:'', ferFim:'', ferDiasComprados:0, feriasPeriodos:[]});
const hSD=APP.ferFichaHTML(semAg, APP.ferExtrato(semAg, HOJE), HOJE, cab);
t('com dias e nada marcado, aparece o botao Agendar',
  /fch-ag/.test(hSD) && /Agendar<\/button>/.test(hSD));
t('o conflito nao se repete dentro da ficha', !/fch-conf/.test(html));
t('o saldo fica a direita da identificacao', /fch-topo__id/.test(html)
  && html.indexOf('fch-topo__id') < html.indexOf('fch-topo__sal'));
t('admissao, vencimento e agendamento no topo',
  /ferd-cab/.test(html) && /Mês de agendamento/.test(html));
t('na ficha, o mais recente vem em cima',
  html.indexOf('02/01/2026 a 01/01/2027') < html.indexOf('02/01/2025 a 01/01/2026'),
  (html.match(/fch-per__dt">[^<]*/g)||[]).join(' | '));
t('o periodo com os dias ja marcados diz AGENDADO', /agendado<\/span>/.test(html)
  && !/pendente/.test(html), (html.match(/badge--[a-z]+">[^<]*/g)||[]).join(' | '));
t('um botao de historico, so', (html.match(/class="fch-hist-bt"/g)||[]).length===1,
  'n='+(html.match(/class="fch-hist-bt"/g)||[]).length);
t('sem titulo repetido dentro da dobra',
  !/section-label[^>]*>Histórico/.test(html));
t('o log so aparece ao expandir', /id="fch-hist" style="display:none"/.test(html));
t('matricula e funcao saem do corpo da ficha',
  !/Matrícula/.test(html) && !/Função/.test(html));

console.log('\n== 10) SAIU ANTES DE LIBERAR: SALDO NEGATIVO ==');
const antecipou=Object.assign({},rodrigo,{feriasBase:Object.assign({},rodrigo.feriasBase,
  {periodos:[rodrigo.feriasBase.periodos[0],
    {tipo:'atual',ini:'2026-01-02',venc:'2027-01-01',direito:0,debito:15,saldo:-15}]})});
const exA=APP.ferExtrato(antecipou,HOJE);
t('o saldo total desce', exA.somaSaldos===30, String(exA.somaSaldos));
t('o periodo em curso continua travado', exA.periodos[1].travado===true);
const negativo=Object.assign({},rodrigo,{feriasBase:Object.assign({},rodrigo.feriasBase,
  {periodos:[{tipo:'vencido',ini:'2025-01-02',venc:'2026-01-01',direito:30,debito:45,
    saldo:-15,limiteLegal:'2027-01-01'}, rodrigo.feriasBase.periodos[1]]})});
const exN=APP.ferExtrato(negativo,HOJE);
t('periodo com saldo negativo aparece negativo', exN.periodos[0].aberto===-15);
const hN=APP.ferFichaHTML(negativo, exN, HOJE);
t('sem dias no saldo, nao aparece o botao Agendar', !/fch-ag/.test(hN));
t('e a ficha marca em vermelho', /fch-topo--neg/.test(hN) && /fch-per__sal--neg/.test(hN));
t('dizendo que sao dias em atraso', /dias? em atraso/.test(hN),
  (hN.match(/fch-saldo__l">[^<]*/)||[''])[0]);

console.log('\n'+(fail?'FALHAS: '+fail+' | ok: '+ok:'TUDO OK ('+ok+' checagens)'));
process.exit(fail?1:0);
