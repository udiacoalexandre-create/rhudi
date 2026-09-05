// Reproduz o bug do "informe quem pediu": no navegador o FILTRO e o CAMPO do
// formulario coexistem, e getElementById devolve o primeiro do documento.
const fs=require('fs');
const SRC=fs.readFileSync('/Users/acmags/rhudi/comercial.js','utf8');
let ok=0, fail=0;
const t=(n,c,x)=>{ if(c){ok++;console.log('  ok   '+n);} else {fail++;console.log('  FALHA '+n+(x?'  -> '+x:''));} };

console.log('── TRAVA: nenhum id gerado duas vezes ──');
const ids=[...SRC.matchAll(/id=\\?"([a-z0-9-]+)\\?"/g)].map(m=>m[1]);
const cont={}; ids.forEach(i=>cont[i]=(cont[i]||0)+1);
const dup=Object.entries(cont).filter(([,n])=>n>1);
t('sem id repetido no arquivo', dup.length===0, JSON.stringify(dup));
t('filtro e formulário têm ids distintos para quem pediu',
  cont['dm-solic']===1 && cont['dm-f-solic']===1,
  'filtro='+cont['dm-solic']+' campo='+cont['dm-f-solic']);
t('mesma separação para prioridade', cont['dm-prio']===1 && cont['dm-f-prio']===1);
t('mesma separação para status', cont['dm-status']===1 && cont['dm-f-status']===1);

// ── o cenário real: filtro na página, formulário no modal ──
const NODES={};
function mkEl(id){ return { id,_html:'',style:{},className:'',value:'',textContent:'',
  disabled:false,dataset:{},files:[],_attrs:{},
  classList:{add(){},remove(){},contains(){return false}},
  get innerHTML(){return this._html}, set innerHTML(v){this._html=String(v)},
  setAttribute(k,v){this._attrs[k]=v}, getAttribute(k){return this._attrs[k]??null},
  addEventListener(){}, removeEventListener(){}, appendChild(c){return c},
  insertAdjacentHTML(){}, remove(){}, querySelector(){return null},
  querySelectorAll(){return[]}, closest(){return null}, focus(){}, click(){} }; }
// getElementById devolve o PRIMEIRO registrado com aquele id, como o navegador
const ORDEM=[];
const document={
  getElementById(id){ const n=ORDEM.find(x=>x.id===id); return n||null; },
  registrar(n){ ORDEM.push(n); NODES[n.id]=n; return n; },
  createElement(tg){return mkEl('novo-'+tg)}, addEventListener(){}, removeEventListener(){},
  querySelector(){return null}, querySelectorAll(){return[]},
  body:mkEl('body'), head:mkEl('head'), documentElement:mkEl('html'),
  cookie:'', readyState:'complete' };
document.body.appendChild=e=>{ document.registrar(e); return e; };
const GRAV=[];
const window={ _firebaseReady:false,_auth:{},_col:n=>n,_doc:(c,i)=>({c,i}),
  _getDoc:()=>Promise.resolve({exists:()=>false}),
  _setDoc:(r,d)=>{ GRAV.push({r,d}); return Promise.resolve(); },
  _deleteDoc:()=>Promise.resolve(), _getDocs:()=>Promise.resolve({forEach(){}}),
  _onSnapshot:()=>()=>{}, _query:()=>({}), _onAuthStateChanged:()=>{},
  _signIn:()=>Promise.resolve(), _resetSenha:()=>Promise.resolve(), _signOut:()=>Promise.resolve(),
  addEventListener(){}, removeEventListener(){}, innerWidth:1280, innerHeight:800,
  location:{origin:'',pathname:'/comercial.html'}, crypto:{getRandomValues:a=>a}, navigator:{} };
window.window=window;
const sandbox={ window, document, location:window.location, navigator:{}, crypto:window.crypto,
  setTimeout:(f,ms)=>{ if(!ms) f(); return 0; }, clearTimeout:()=>{}, setInterval:()=>0, clearInterval:()=>{},
  console, alert:()=>{}, confirm:()=>true, prompt:()=>null,
  CompressionStream:undefined, DecompressionStream:undefined, TextEncoder, TextDecoder,
  btoa:s=>Buffer.from(s,'binary').toString('base64'), atob:s=>Buffer.from(s,'base64').toString('binary'),
  escape, unescape, encodeURIComponent, decodeURIComponent,
  Blob:function(){}, URL:{createObjectURL:()=>'x',revokeObjectURL(){}},
  Intl,Date,Math,JSON,Object,Array,String,Number,Boolean,RegExp,Error,Promise,Set,Map,
  isNaN,parseInt,parseFloat,Uint8Array };
const nomes=Object.keys(sandbox);
const exporta='return {salvarDemanda:(typeof salvarDemanda!=="undefined"?salvarDemanda:undefined)'
  +',setDemandas:v=>{demandas=v},setUsuario:v=>{usuario=v}};';
const APP=new Function(...nomes, SRC+'\n'+exporta)(...nomes.map(n=>sandbox[n]));
APP.setUsuario({email:'ana@udiaco.com.br'});

console.log('\n── o bug: filtro ANTES do formulário no documento ──');
// 1) a barra de filtros entra primeiro, como na página
const filtro=mkEl('dm-solic'); filtro.value='';        // nenhum filtro escolhido
document.registrar(filtro);
// 2) depois o modal, com o campo preenchido
[['dm-tit','Integração com o ERP'],['dm-desc','texto'],['dm-f-solic','Alexandre'],
 ['dm-area','Comercial'],['dm-f-prio','0'],['dm-entrada','2026-07-01'],
 ['dm-prazo','2026-10-15'],['dm-f-status','andamento'],['dm-ok','']]
  .forEach(([id,v])=>{ const n=mkEl(id); n.value=v; document.registrar(n); });

APP.setDemandas([{_id:'d1',titulo:'Integração com o ERP',descricao:'texto',
  solicitante:'Alexandre',area:'Comercial',prioridade:0,entrada:'2026-07-01',
  prazo:'2026-10-15',status:'fila',historico:[]}]);

(async()=>{
GRAV.length=0;
await APP.salvarDemanda('d1');
t('SALVOU (antes barrava dizendo "informe quem pediu")', GRAV.length===1,
  'gravações='+GRAV.length);
t('quem pediu veio do FORMULÁRIO, não do filtro',
  GRAV.length===1 && GRAV[0].d.solicitante==='Alexandre',
  GRAV.length?('solicitante='+JSON.stringify(GRAV[0].d.solicitante)):'não gravou');
t('a alteração de status foi gravada', GRAV.length===1 && GRAV[0].d.status==='andamento');

console.log('\n── e o pior caso: filtro COM valor não contamina o cadastro ──');
filtro.value='Hugo';                    // filtrando por outra pessoa
document.getElementById('dm-f-solic').value='Alexandre';
GRAV.length=0;
APP.setDemandas([{_id:'d1',titulo:'Integração com o ERP',descricao:'texto',
  solicitante:'Alexandre',area:'Comercial',prioridade:0,entrada:'2026-07-01',
  prazo:'2026-10-15',status:'fila',historico:[]}]);
await APP.salvarDemanda('d1');
t('não gravou "Hugo" no lugar de "Alexandre"',
  GRAV.length===1 && GRAV[0].d.solicitante==='Alexandre',
  GRAV.length?('solicitante='+JSON.stringify(GRAV[0].d.solicitante)):'não gravou');

console.log('\n── validação continua valendo quando o campo está vazio ──');
document.getElementById('dm-f-solic').value='';
GRAV.length=0;
await APP.salvarDemanda('d1');
t('campo vazio de verdade barra', GRAV.length===0);

console.log('\n'+(fail?'>>> FALHOU: '+fail+' de '+(ok+fail):'>>> TODOS OS '+ok+' TESTES PASSARAM'));
process.exit(fail?1:0);
})().catch(e=>{console.error('ERRO',e.stack);process.exit(1)});
