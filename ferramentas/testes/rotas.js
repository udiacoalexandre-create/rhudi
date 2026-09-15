// Endereco proprio por tela: recarregar a pagina tem de devolver a pessoa
// onde ela estava, e nao ao portal / a primeira aba.
const fs=require('fs');
const RH  =fs.readFileSync('/Users/acmags/rhudi/app.js','utf8');
const COM =fs.readFileSync('/Users/acmags/rhudi/comercial.js','utf8');
const PROJ=fs.readFileSync('/Users/acmags/rhudi/projetos.js','utf8');
let ok=0, fail=0;
const t=(n,c,x)=>{ if(c){ok++;console.log('  ok   '+n);} else {fail++;console.log('  FALHA '+n+(x?'  -> '+x:''));} };

// ── ambiente comum, com um location que se comporta ──────────────────────
function mkAmbiente(pathname){
  const NODES={};
  const loc={ href:'https://x'+pathname, pathname, search:'', hash:'' };
  const HIST=[];
  const history={ replaceState(a,b,url){ HIST.push(url);
    const i=String(url).indexOf('#'); loc.hash = i<0 ? '' : String(url).slice(i); } };
  function mkEl(id){ return { id,_html:'',style:{display:'',cssText:''},className:'',
    textContent:'',value:'',checked:false,dataset:{},children:[],files:[],
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
    cookie:'',readyState:'complete',title:'' };
  const window={ _firebaseReady:false,_db:{},_auth:{},_doc:(...a)=>({path:a.join('/')}),
    _col:n=>n,_collection:()=>({}),_query:()=>({}),_where:()=>({}),_orderBy:()=>({}),
    _setDoc:()=>Promise.resolve(),_getDoc:()=>Promise.resolve({exists:()=>false,data:()=>({})}),
    _getDocs:()=>Promise.resolve({docs:[],forEach(){}}),_deleteDoc:()=>Promise.resolve(),
    _addDoc:()=>Promise.resolve({id:'x'}),_updateDoc:()=>Promise.resolve(),
    _onSnapshot:()=>()=>{},_onAuthStateChanged:()=>{},_signOut:()=>{},_inc:n=>n,
    _batch:()=>({set(){},update(){},delete(){},commit:()=>Promise.resolve()}),
    _writeBatch:()=>({set(){},update(){},delete(){},commit:()=>Promise.resolve()}),
    addEventListener(){},removeEventListener(){},
    matchMedia:()=>({matches:false,addEventListener(){}}),
    location:loc, history, navigator:{userAgent:'node'}, crypto:{getRandomValues:a=>a},
    scrollTo(){}, innerWidth:1400, innerHeight:900 };
  window.window=window;
  const sandbox={ window,document,location:loc,history,
    localStorage:{_d:{},getItem(k){return this._d[k]??null},setItem(k,v){this._d[k]=String(v)},removeItem(){}},
    sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},
    setTimeout:f=>{ if(typeof f==='function') f(); return 0; },
    setInterval:()=>0,clearTimeout:()=>{},clearInterval:()=>{},
    console,alert:()=>{},confirm:()=>true,prompt:()=>null,
    fetch:()=>Promise.reject(new Error('x')),
    XLSX:{utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{}},writeFile:()=>{}},
    ExcelJS:{Workbook:function(){}},JSZip:function(){},pdfjsLib:{},
    CompressionStream:undefined,DecompressionStream:undefined,TextEncoder,TextDecoder,
    Response:function(){},URLSearchParams,
    btoa:s=>Buffer.from(s,'binary').toString('base64'),
    atob:s=>Buffer.from(s,'base64').toString('binary'),
    escape,unescape,encodeURIComponent,decodeURIComponent,
    Blob:function(){},URL:{createObjectURL:()=>'x',revokeObjectURL(){}},
    FileReader:function(){},
    Intl,Date,Math,JSON,Object,Array,String,Number,Boolean,RegExp,Error,Promise,Set,Map,
    isNaN,parseInt,parseFloat,Uint8Array,
    structuredClone:o=>JSON.parse(JSON.stringify(o)) };
  return {sandbox, loc, NODES, HIST, mkEl};
}

console.log('== 1) SISTEMA DE RH ==');
const A=mkAmbiente('/index.html');
const nomesA=Object.keys(A.sandbox);
const apiA=['rotaEscrever','rotaLer','moduloDaPagina','irPelaRota','showPage',
  'switchModule','voltarPortal','MODULES','pagesVisiveis'];
let RHAPP;
try{
  RHAPP=new Function(...nomesA, RH+'\nreturn {'
    +apiA.map(n=>n+':(typeof '+n+'!=="undefined"?'+n+':undefined)').join(',')
    +',setUsuario:v=>{usuarioAtual=v},getPagina:()=>currentPage,getModulo:()=>currentModule};')
    (...nomesA.map(n=>A.sandbox[n]));
  t('app.js carregado',true);
}catch(e){ t('app.js carregado',false,e.message); process.exit(1); }
RHAPP.setUsuario({email:'alexandre.magalhaes@udiaco.com.br',nome:'Alê',papel:'master',
  plataformas:{rh:true}});

t('sem endereço, não há tela pedida', RHAPP.rotaLer()==='');
RHAPP.showPage('base-lista');
t('abrir uma tela escreve o endereço', A.loc.hash==='#/base-lista', A.loc.hash);
RHAPP.showPage('ben-lancamento');
t('e ele acompanha a troca de tela', A.loc.hash==='#/ben-lancamento', A.loc.hash);
t('o endereço leva de volta à mesma tela', RHAPP.rotaLer()==='ben-lancamento');
t('não enche o histórico do navegador (replaceState)',
  /history\.replaceState/.test(RH) && !/location\.hash *= *nova;[\s\S]{0,40}showPage/.test(RH));
t('sabe em que módulo mora cada tela',
  RHAPP.moduloDaPagina('ben-lancamento')==='beneficios'
  && RHAPP.moduloDaPagina('fer-periodos')==='ferias'
  && RHAPP.moduloDaPagina('premio-main')==='premio',
  RHAPP.moduloDaPagina('ben-lancamento')+'/'+RHAPP.moduloDaPagina('fer-periodos'));
t('tela que não existe não tem módulo', RHAPP.moduloDaPagina('nao-existe')==='');

console.log('\n-- recarregando na tela em que estava --');
A.loc.hash='#/fer-periodos';
t('entra direto nela', RHAPP.irPelaRota()===true);
t('e abre o módulo certo junto', RHAPP.getModulo()==='ferias', String(RHAPP.getModulo()));
t('na tela certa', RHAPP.getPagina()==='fer-periodos', String(RHAPP.getPagina()));
A.loc.hash='#/nao-existe';
t('endereço inventado não abre nada', RHAPP.irPelaRota()===false);
A.loc.hash='';
t('sem endereço, o portal continua', RHAPP.irPelaRota()===false);
t('o login tenta o endereço antes do portal',
  /irPelaRota\(\)\) return;[\s\S]{0,200}mostrarPortal\(\);/.test(RH));

console.log('\n-- voltar ao portal --');
RHAPP.showPage('base-lista');
RHAPP.voltarPortal();
t('limpa o endereço', A.loc.hash==='', JSON.stringify(A.loc.hash));
t('assim o F5 no portal continua no portal', RHAPP.rotaLer()==='');

console.log('\n-- o que o papel não vê, o endereço não abre --');
RHAPP.setUsuario({email:'um989@udiaco.com.br',nome:'UM',papel:'um989',plataformas:{rh:true}});
A.loc.hash='#/ben-lancamento';
t('papel restrito não entra por endereço', RHAPP.irPelaRota()===false,
  'entrou em '+RHAPP.getPagina());

console.log('\n-- o carregamento nao pode atropelar a rota --');
// Era o furo: a rota abria a tela certa e, meio segundo depois, o Promise.all
// do login terminava e chamava switchModule('base'). Na tela parecia que a
// URL nao funcionava.
t('o carregamento termina respeitando a tela pedida',
  /const alvo=_rotaAlvo;[\s\S]{0,260}showPage\(alvo\);/.test(RH),
  (RH.match(/window\.__benefLoaded=true;[\s\S]{0,240}/)||[''])[0].replace(/\s+/g,' ').slice(0,200));
t('e so cai na Base quando nao ha tela pedida',
  /\} else switchModule\('base'\);/.test(RH));
t('a tela pedida e guardada ao entrar pela rota', /_rotaAlvo = id;/.test(RH));
t('e zerada depois de usada, para nao voltar sozinha',
  /const alvo=_rotaAlvo; _rotaAlvo='';/.test(RH));
t('a tela guardada tambem passa pela permissao',
  /if\(modAlvo && pagesVisiveis\(modAlvo\)\.some\(p=>p\.id===alvo\)\)/.test(RH));

console.log('\n== 2) COMERCIAL ==');
const B=mkAmbiente('/comercial.html');
const nomesB=Object.keys(B.sandbox);
let COMAPP;
try{
  COMAPP=new Function(...nomesB, COM+'\nreturn {irAba:(typeof irAba!=="undefined"?irAba:undefined),'
    +'rotaAba:(typeof rotaAba!=="undefined"?rotaAba:undefined),'
    +'abaDoEndereco:(typeof abaDoEndereco!=="undefined"?abaDoEndereco:undefined),'
    +'setUsuario:v=>{usuario=v},setDemandas:v=>{demandas=v},setPaineis:v=>{paineis=v},'
    +'setFiltro:v=>{filtroDem=v},getAba:()=>aba};')(...nomesB.map(n=>B.sandbox[n]));
  t('comercial.js carregado',true);
}catch(e){ t('comercial.js carregado',false,e.message); process.exit(1); }
COMAPP.setUsuario({email:'ale@udiaco.com.br'});
COMAPP.setDemandas([]); COMAPP.setPaineis([]);
COMAPP.setFiltro({q:'',prio:'',status:'',solic:'',resp:''});
COMAPP.irAba('demandas');
t('trocar de aba escreve o endereço', B.loc.hash==='#/demandas', B.loc.hash);
t('e o endereço devolve a mesma aba', COMAPP.abaDoEndereco()==='demandas');
COMAPP.irAba('paineis');
t('acompanha a volta', B.loc.hash==='#/paineis', B.loc.hash);
B.loc.hash='#/inventada';
t('aba inventada é ignorada', COMAPP.abaDoEndereco()==='');
t('a abertura respeita o endereço', /abaDoEndereco\(\); if\(doLink\) aba=doLink;/.test(COM));

console.log('\n== 3) PROJETOS ESTRATÉGICOS ==');
const C=mkAmbiente('/projetos.html');
const nomesC=Object.keys(C.sandbox);
let PJ;
try{
  PJ=new Function(...nomesC, PROJ+'\nreturn {irPara:(typeof irPara!=="undefined"?irPara:undefined),'
    +'rotaAba:(typeof rotaAba!=="undefined"?rotaAba:undefined),'
    +'abaDoEndereco:(typeof abaDoEndereco!=="undefined"?abaDoEndereco:undefined),'
    +'setUsuario:v=>{usuario=v},setUsuarios:v=>{usuarios=v},setProjetos:v=>{projetos=v},'
    +'setTarefas:v=>{tarefas=v},getAba:()=>aba};')(...nomesC.map(n=>C.sandbox[n]));
  t('projetos.js carregado',true);
}catch(e){ t('projetos.js carregado',false,e.message); process.exit(1); }
PJ.setUsuario({email:'alexandre.magalhaes@udiaco.com.br',papel:'master'});
PJ.setUsuarios([]); PJ.setProjetos([]); PJ.setTarefas([]);
PJ.irPara('projetos');
t('trocar de aba escreve o endereço', C.loc.hash==='#/projetos', C.loc.hash);
PJ.irPara('agenda');
t('acompanha a volta', C.loc.hash==='#/agenda', C.loc.hash);
t('o endereço devolve a aba', PJ.abaDoEndereco()==='agenda');
t('a aba particular também tem endereço',
  (C.loc.hash='#/lab', PJ.abaDoEndereco()==='lab'));
t('mas só abre para o dono', /doLink!=='lab' \|\| ehDonoLab\(\)/.test(PROJ));

console.log('\n-- o link de tarefa continua mandando --');
C.loc.hash='#t=abc123';
PJ.rotaAba('projetos');
t('endereço de tarefa não é sobrescrito pela aba', C.loc.hash==='#t=abc123', C.loc.hash);
t('quem chega por link de tarefa abre o ticket', /#t=/.test(PROJ) && /abrirDoLink/.test(PROJ));

console.log('\n== 4) CADA APP TEM O SEU ENDEREÇO ==');
const PORTAL=fs.readFileSync('/Users/acmags/rhudi/app.js','utf8');
[['buscador.html','Treinamentos'],['projetos.html','Projetos Estratégicos'],
 ['comercial.html','Comercial']].forEach(([arq,nome])=>{
  t(nome+' abre em página própria', PORTAL.includes(arq),
    (PORTAL.match(new RegExp('[^\\n]*'+arq.replace('.','\\.')+'[^\\n]*'))||[''])[0].trim().slice(0,70));
});
t('e o RH mora no index, com a tela no endereço',
  /rotaEscrever\(id\)/.test(RH) && /function irPelaRota/.test(RH));

console.log('\n== 5) DENTRO DO IFRAME DA UDIACO.COM.BR ==');
// udiaco.com.br/rh embute o sistema num iframe: la a barra de endereco e da
// pagina de fora, e recarregar voltava sempre para a home.
const WRAP=fs.readFileSync('/Users/acmags/rhudi/ferramentas/rh-wrapper.html','utf8');
[['app.js',RH],['comercial.js',COM],['projetos.js',PROJ]].forEach(([nome,src])=>{
  t(nome+' avisa a pagina de fora', /function avisarPagina/.test(src));
  t('  e so quando esta embutido', /if\(window\.parent === window\) return;/.test(src));
  t('  falando so com udiaco.com.br', /PAI_PERMITIDO = 'https:\/\/udiaco\.com\.br'/.test(src));
  t('  a cada troca de tela', /avisarPagina\(\);/.test(src));
});
t('a pagina de fora so aceita mensagem do sistema',
  /ev\.origin !== ORIGEM_APP\) return;/.test(WRAP));
t('e so aceita nome de pagina do proprio sistema',
  (WRAP.match(/\[a-z0-9\._-\]\{1,40\}\\.html/g)||[]).length===2,
  'validacoes='+(WRAP.match(/\[a-z0-9\._-\]\{1,40\}\\.html/g)||[]).length);
t('monta o iframe com a tela pedida', /src = APP \+ telaPedida\(\)/.test(WRAP));
t('e guarda a tela no proprio endereco', /history\.replaceState\(null, '', location\.pathname \+ novo\)/.test(WRAP));
t('diz que o certo e tirar o iframe', /apontar udiaco\.com\.br\/rh direto/.test(WRAP));

console.log('\n'+(fail?'FALHAS: '+fail+' | ok: '+ok:'TUDO OK ('+ok+' checagens)'));
process.exit(fail?1:0);
