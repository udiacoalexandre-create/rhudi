// Sprint encerrada levava junto o que NAO foi entregue: a demanda sumia do
// controle sem ninguem decidir nada sobre ela. Agora so o que acabou fica na
// sprint encerrada; o resto sobe para um bloco "A reclassificar".
const fs=require('fs');
const SRC =fs.readFileSync('/Users/acmags/rhudi/comercial.js','utf8');
const HTML=fs.readFileSync('/Users/acmags/rhudi/comercial.html','utf8');
let ok=0, fail=0;
const t=(n,c,x)=>{ if(c){ok++;console.log('  ok   '+n);} else {fail++;console.log('  FALHA '+n+(x?'  -> '+x:''));} };

// dia congelado: o agrupamento depende de que dia e hoje
const _CONGELADO=new Date(2026,8,15,12,0,0,0).getTime();
class HOJE extends Date {
  constructor(...a){ if(a.length===0) super(_CONGELADO); else super(...a); }
  static now(){ return _CONGELADO; }
}
const NODES={};
function mkEl(id){ return { id,_html:'',style:{},className:'',textContent:'',value:'',
  checked:false,dataset:{},children:[],files:[],
  classList:{add(){},remove(){},contains(){return false}},
  get innerHTML(){return this._html}, set innerHTML(v){this._html=String(v)},
  addEventListener(){},removeEventListener(){},appendChild(c){return c},
  insertAdjacentHTML(p,h){this._html+=h},remove(){},
  querySelectorAll(){return[]},querySelector(){return null},closest(){return null},
  focus(){},click(){},setAttribute(){},getAttribute(){return null} }; }
const document={ getElementById(id){ return NODES[id]||(NODES[id]=mkEl(id)); },
  querySelector(){return null},querySelectorAll(){return[]},
  createElement(){return mkEl('el')},addEventListener(){},removeEventListener(){},
  body:mkEl('body'),head:mkEl('head'),documentElement:mkEl('html'),
  cookie:'',readyState:'complete' };
const window={ _firebaseReady:false,_auth:{},_col:n=>n,_doc:(c,i)=>({c,i}),
  _getDoc:()=>Promise.resolve({exists:()=>false}),_setDoc:()=>Promise.resolve(),
  _deleteDoc:()=>Promise.resolve(),_getDocs:()=>Promise.resolve({forEach(){}}),
  _onSnapshot:()=>()=>{},_query:()=>({}),_onAuthStateChanged:()=>{},
  addEventListener(){},removeEventListener(){},
  location:{origin:'https://x',pathname:'/comercial.html',hash:''},
  history:{replaceState(){}}, crypto:{getRandomValues:a=>a}, navigator:{},
  innerWidth:1400,innerHeight:900 };
window.window=window;
const sandbox={ window,document,location:window.location,history:window.history,
  navigator:{},crypto:window.crypto,
  setTimeout:(f,ms)=>{ if(!ms&&typeof f==='function') f(); return 0; },clearTimeout:()=>{},
  setInterval:()=>0,clearInterval:()=>{},console,alert:()=>{},confirm:()=>true,prompt:()=>null,
  CompressionStream:undefined,DecompressionStream:undefined,TextEncoder,TextDecoder,
  btoa:s=>Buffer.from(s,'binary').toString('base64'),
  atob:s=>Buffer.from(s,'base64').toString('binary'),
  escape,unescape,encodeURIComponent,decodeURIComponent,URLSearchParams,
  Blob:function(){},URL:{createObjectURL:()=>'x',revokeObjectURL(){}},
  Date:HOJE,
  Intl,Math,JSON,Object,Array,String,Number,Boolean,RegExp,Error,Promise,Set,Map,
  isNaN,parseInt,parseFloat,Uint8Array,Response:function(){} };
const nomes=Object.keys(sandbox);
const API=['pintarDemandas','tabelaDm','sprintDe','sprintTitulo','alternarEncerradas',
  'prioNum','sInfo','STATUS','diasAte','hoje0'];
let APP;
console.log('-- CARGA --');
try{
  APP=new Function(...nomes, SRC+'\nreturn {'
    +API.map(n=>n+':(typeof '+n+'!=="undefined"?'+n+':undefined)').join(',')
    +',setDemandas:v=>{demandas=v},setUsuario:v=>{usuario=v},setFiltro:v=>{filtroDem=v}'
    +',setOcultar:v=>{ocultarEntregues=v}};')(...nomes.map(n=>sandbox[n]));
  t('comercial.js carregado',true);
}catch(e){ t('comercial.js carregado',false,e.message); process.exit(1); }
APP.setUsuario({email:'ale@udiaco.com.br'});
APP.setFiltro({q:'',prio:'',status:'',solic:'',resp:''});

// datas ancoradas no dia congelado (15/09/2026)
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const dias=n=>{ const d=new HOJE(); d.setHours(12,0,0,0); d.setDate(d.getDate()+n); return iso(d); };
const spHoje=APP.sprintDe(dias(0));
const ANTES=(()=>{ const d=new Date(spHoje.ini); d.setDate(d.getDate()-3); return iso(d); })();
const DEPOIS=(()=>{ const d=new Date(spHoje.fim); d.setDate(d.getDate()+2); return iso(d); })();

const D=[
  // sprint JA ENCERRADA
  {_id:'v1',titulo:'Atrasada em desenvolvimento',solicitante:'A',prioridade:1,
   status:'desenvolvimento',prazo:ANTES,entrada:'2026-01-01'},
  {_id:'v2',titulo:'Atrasada em validação',solicitante:'B',prioridade:2,
   status:'validacao',prazo:ANTES,entrada:'2026-01-01'},
  {_id:'e1',titulo:'Entregue na sprint que passou',solicitante:'C',prioridade:0,
   status:'entregue',prazo:ANTES,entrada:'2026-01-01'},
  // sprint em andamento e futura
  {_id:'a1',titulo:'Rodando agora',solicitante:'D',prioridade:0,
   status:'desenvolvimento',prazo:dias(1),entrada:'2026-01-01'},
  {_id:'f1',titulo:'A seguir',solicitante:'E',prioridade:0,
   status:'nao_iniciado',prazo:DEPOIS,entrada:'2026-01-01'},
  {_id:'s1',titulo:'Sem prazo',solicitante:'F',prioridade:'',
   status:'briefing',prazo:'',entrada:'2026-01-01'},
];
APP.setDemandas(D);
NODES['dm-lista']=mkEl('dm-lista'); NODES['dm-stats']=mkEl('dm-stats');
APP.pintarDemandas();
const h=()=>NODES['dm-lista']._html;
const antesDe=(a,b)=>h().indexOf(a)>=0 && h().indexOf(b)>=0 && h().indexOf(a)<h().indexOf(b);

console.log('\n== 1) O QUE NAO FOI ENTREGUE NAO SOME MAIS ==');
t('existe o bloco A reclassificar', /vc-bloco/.test(h()),
  (h().match(/sp-tit">[^<]*/g)||[]).join(' | '));
t('a demanda em desenvolvimento esta nele', /Atrasada em desenvolvimento/.test(h()));
t('e a em validação também', /Atrasada em validação/.test(h()));
t('as duas contadas no cabeçalho', /2 em aberto/.test(h()),
  (h().match(/vc-cab[\s\S]{0,400}?sp-n">[^<]*/)||[''])[0].slice(-40));
t('diz há quantos dias venceu a mais antiga', /venceu há \d+d/.test(h()),
  (h().match(/venceu há \d+d/)||[''])[0]);

console.log('\n== 2) E FICA NO ALTO, ANTES DE TUDO ==');
t('antes da sprint em andamento', antesDe('A reclassificar','Rodando agora'));
t('antes da sprint seguinte', antesDe('A reclassificar','A seguir'));
t('antes do bloco das encerradas', antesDe('A reclassificar','sprint encerrada'));
t('o bloco nasce ABERTO, com a tabela à vista',
  /vc-bloco[\s\S]{0,700}<table class="dm/.test(h()));
t('e não recolhe com um clique (não é sprint)',
  !/vc-cab[^>]*onclick=/.test(h()), (h().match(/vc-cab[^>]*/)||[''])[0]);

console.log('\n== 3) A SPRINT ENCERRADA GUARDA SO O QUE ACABOU ==');
// ela esta recolhida nas encerradas; o que importa e nao estar no bloco
const _b=h().slice(h().indexOf('vc-bloco'), h().indexOf('</table></div>', h().indexOf('vc-bloco'))+14);
t('a entregue não subiu para o bloco', !/Entregue na sprint que passou/.test(_b),
  _b.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,120));
t('o toggle das encerradas conta só ela', /1 sprint encerrada · 1 demanda/.test(h()),
  (h().match(/sprints? encerradas?[^<]*/)||[''])[0]);
APP.alternarEncerradas();
t('abrindo, ela aparece', /Entregue na sprint que passou/.test(h()));
t('e as atrasadas NÃO estão lá dentro',
  (h().match(/Atrasada em desenvolvimento/g)||[]).length===1,
  'aparições=' +(h().match(/Atrasada em desenvolvimento/g)||[]).length);
APP.alternarEncerradas();

console.log('\n== 4) DA PARA RECLASSIFICAR DALI MESMO ==');
const _i=h().indexOf('vc-bloco');
const bloco=h().slice(_i, h().indexOf('</table></div>', _i)+14);
t('a entrega é editável na linha', /editarPrazo\(event,'v1'\)/.test(bloco));
t('o status também', /mudarStatus\('v1'/.test(bloco));
t('e a prioridade', /mudarPrio\('v1'/.test(bloco));
t('mesmas colunas da tabela de sempre',
  (bloco.match(/<th[ >]/g)||[]).length===9, 'n='+(bloco.match(/<th[ >]/g)||[]).length);
t('o "?" explica o que fazer',
  /Mude a entrega estimada para reprogramá-las/.test(h()));

console.log('\n== 5) SEM ATRASO, SEM BLOCO ==');
APP.setDemandas(D.filter(d=>!/^v/.test(d._id)));
APP.pintarDemandas();
t('nenhuma vencida, nenhum bloco', !/vc-bloco/.test(h()));
t('e o rodapé não fala em reclassificar', !/a reclassificar/.test(h()),
  (h().match(/\d+ de \d+ demanda[^<]*/)||[''])[0]);
APP.setDemandas(D);
APP.pintarDemandas();
t('com vencidas, o rodapé conta', /2 a reclassificar/.test(h()),
  (h().match(/\d+ de \d+ demanda[^<]*/)||[''])[0]);

console.log('\n== 6) O INTERRUPTOR DE CONCLUIDAS NAO MEXE NELAS ==');
APP.setOcultar(true);
APP.pintarDemandas();
t('as vencidas continuam (não são concluídas)', /Atrasada em desenvolvimento/.test(h()));
t('a entregue sumiu', !/Entregue na sprint que passou/.test(h()));
APP.setOcultar(false);

console.log('\n== 7) O CSS ==');
t('o bloco tem estilo próprio', /\.vc-bloco\{/.test(HTML));
t('em vermelho, para puxar o olho', /\.vc-cab\{[^}]*var\(--cm-alta\)/.test(HTML),
  (HTML.match(/\.vc-cab\{[^}]*\}/)||[''])[0]);
t('e o cabeçalho não parece clicável', /\.vc-cab\{[^}]*cursor:default/.test(HTML));

console.log('\n'+(fail?'FALHAS: '+fail+' | ok: '+ok:'TUDO OK ('+ok+' checagens)'));
process.exit(fail?1:0);
