// Link publico de LEITURA das demandas: retrato, gravacao, revogacao,
// paridade do calculo de sprint com a plataforma e ausencia de edicao.
const fs=require('fs');
const SRC =fs.readFileSync('/Users/acmags/rhudi/comercial.js','utf8');
const PUB =fs.readFileSync('/Users/acmags/rhudi/demandas.html','utf8');
const PAIN=fs.readFileSync('/Users/acmags/rhudi/painel.html','utf8');
const RULES=fs.readFileSync('/Users/acmags/rhudi/firestore.rules','utf8');
let ok=0, fail=0;
const t=(n,c,x)=>{ if(c){ok++;console.log('  ok   '+n);} else {fail++;console.log('  FALHA '+n+(x?'  -> '+x:''));} };

// ── sandbox comum ────────────────────────────────────────────────────────
function mkEl(id){ return { id,_html:'',style:{},className:'',textContent:'',value:'',
  checked:false,disabled:false,dataset:{},children:[],files:[],
  classList:{add(){},remove(){},contains(){return false}},
  get innerHTML(){return this._html}, set innerHTML(v){this._html=String(v)},
  addEventListener(){}, removeEventListener(){}, appendChild(c){return c},
  insertAdjacentHTML(p,h){this._html+=h}, remove(){}, querySelector(){return null},
  querySelectorAll(){return[]}, closest(){return null}, focus(){}, click(){},
  select(){}, getBoundingClientRect(){return{width:100,height:40}},
  setAttribute(){}, getAttribute(){return null} }; }
function mkAmbiente(pathname){
  const NODES={};
  const timers=[];
  const document={ getElementById(id){ return NODES[id]||(NODES[id]=mkEl(id)); },
    querySelector(){return null}, querySelectorAll(){return[]},
    createElement(tg){const e=mkEl('el-'+tg);e.href='';e.download='';return e;},
    addEventListener(){}, removeEventListener(){}, body:mkEl('body'), head:mkEl('head'),
    documentElement:mkEl('html'), cookie:'', readyState:'complete', title:'' };
  const gravou=[], apagou=[];
  const window={ _firebaseReady:true,_auth:{},_col:n=>n,_doc:(c,i)=>({c,i}),
    _getDoc:()=>Promise.resolve({exists:()=>false}),
    _setDoc:(ref,dados)=>{ gravou.push({col:ref.c,id:ref.i,dados}); return Promise.resolve(); },
    _deleteDoc:ref=>{ apagou.push({col:ref.c,id:ref.i}); return Promise.resolve(); },
    _getDocs:()=>Promise.resolve({forEach(){}}),
    _onSnapshot:()=>()=>{}, _query:()=>({}), _onAuthStateChanged:()=>{},
    addEventListener(){}, removeEventListener(){},
    location:{origin:'https://udiaco-beneficios.web.app',pathname},
    crypto:{getRandomValues:a=>{ for(let i=0;i<a.length;i++) a[i]=i*7%256; return a; }},
    navigator:{}, innerWidth:1400, innerHeight:900 };
  window.window=window;
  const sandbox={ window, document, location:window.location, navigator:{}, crypto:window.crypto,
    setTimeout:(f,ms)=>{ timers.push(f); return timers.length; },
    clearTimeout:i=>{ if(i) timers[i-1]=null; },
    setInterval:()=>0, clearInterval:()=>{},
    console, alert:()=>{}, confirm:()=>true, prompt:()=>null,
    CompressionStream:undefined, DecompressionStream:undefined, TextEncoder, TextDecoder,
    btoa:s=>Buffer.from(s,'binary').toString('base64'),
    atob:s=>Buffer.from(s,'base64').toString('binary'),
    escape, unescape, encodeURIComponent, decodeURIComponent, URLSearchParams,
    Blob:function(){}, URL:{createObjectURL:()=>'x',revokeObjectURL(){}},
    Intl,Date,Math,JSON,Object,Array,String,Number,Boolean,RegExp,Error,Promise,Set,Map,
    isNaN,parseInt,parseFloat,Uint8Array,Response:function(){} };
  return {sandbox, gravou, apagou, timers, NODES,
    // roda os timers pendentes (o retrato tem espera de 900ms)
    correTimers(){ const l=timers.slice(); timers.length=0; l.forEach(f=>f&&f()); }};
}

// ── carrega comercial.js ─────────────────────────────────────────────────
const A=mkAmbiente('/comercial.html');
const nomes=Object.keys(A.sandbox);
const API=['publicarDemandas','renovarLinkDemandas','despublicarDemandas','linkPublicoDemandas',
  'modalCompartilharDemandas','copiarLinkDemandas','atualizarDemPub','assinarDemPub',
  '_retratoDemandas','_itensPublicos','novoToken','viewDemandas','irSprintModo',
  'sprintDe','sprintTitulo','prioNum','CFG_DEM_PUB','COL_PUB'];
const exporta='return {'+API.map(n=>n+':(typeof '+n+'!=="undefined"?'+n+':undefined)').join(',')
  +',setDemandas:v=>{demandas=v},setUsuario:v=>{usuario=v},setFiltro:v=>{filtroDem=v}'
  +',setPub:v=>{demPub=v},getPub:()=>demPub,setAba:v=>{aba=v}};';
let APP;
console.log('── CARGA ──');
try{ APP=new Function(...nomes, SRC+'\n'+exporta)(...nomes.map(n=>A.sandbox[n]));
  t('comercial.js carregado',true);
}catch(e){ t('comercial.js carregado',false,e.message); process.exit(1); }
APP.setUsuario({email:'alexandre.magalhaes@udiaco.com.br'});
APP.setFiltro({q:'',prio:'',status:'',solic:''});
APP.setAba('demandas');

const DEMS=[
  {_id:'a', titulo:'Integrar folha com o Senior', descricao:'Texto longo da parceira',
   solicitante:'Leia', area:'RH', prioridade:2, status:'desenvolvimento',
   entrada:'2026-07-01', prazo:'2026-09-11',
   historico:[{quem:'ale@udiaco.com.br',quando:'2026-08-01T10:00:00Z',mud:[]}],
   criadoPor:'ale@udiaco.com.br', origem:'planilha da parceira'},
  {_id:'b', titulo:'Painel de vendedores', descricao:'', solicitante:'Leia', area:'Comercial',
   prioridade:1, status:'andamento', entrada:'2026-07-05', prazo:'2026-09-11'},
  {_id:'c', titulo:'Sem prazo nenhum', solicitante:'', area:'', prioridade:'',
   status:'entregue', entrada:'', prazo:''},
];

(async()=>{

console.log('\n== 1) RETRATO PUBLICO ==');
APP.setDemandas(DEMS);
const r=APP._retratoDemandas();
t('tipo marcado como demandas', r.tipo==='demandas', JSON.stringify(r.tipo));
t('traz as 3 demandas', r.itens.length===3, String(r.itens.length));
t('leva a lista de status (rotulo e cor)',
  Array.isArray(r.status) && r.status.length>=6 && !!r.status[0].l && !!r.status[0].cor);
t('leva a cadencia escolhida', r.cadencia==='quinzenal', r.cadencia);
t('tem data de atualizacao', typeof r.atualizadoEm==='string' && r.atualizadoEm.length>10);
const campos=Object.keys(r.itens[0]).sort().join(',');
t('item so com o que se le na tela',
  campos==='area,descricao,entrada,prazo,prioridade,solicitante,status,titulo', campos);
t('NAO vaza o historico de auditoria', r.itens.every(i=>!('historico' in i)));
t('NAO vaza quem criou', r.itens.every(i=>!('criadoPor' in i)));
t('NAO vaza o id interno da demanda', r.itens.every(i=>!('_id' in i)));
t('status antigo sai normalizado',
  r.itens.some(i=>i.status==='desenvolvimento') && r.itens.every(i=>i.status!=='andamento'),
  r.itens.map(i=>i.status).join('|'));
t('campo vazio vira string, nao undefined',
  r.itens.every(i=>typeof i.solicitante==='string' && typeof i.area==='string'));

console.log('\n== 2) PUBLICAR ==');
A.gravou.length=0; A.apagou.length=0;
await APP.publicarDemandas();
const pub=A.gravou.find(g=>g.col==='cm_publico');
const cfg=A.gravou.find(g=>g.col==='cm_config');
t('gravou o retrato em cm_publico', !!pub);
t('token com 32 caracteres hex', !!pub && /^[0-9a-f]{32}$/.test(pub.id), pub&&pub.id);
t('retrato gravado tem os itens', !!pub && pub.dados.itens.length===3);
t('registrou o token em cm_config/demandasPublicas',
  !!cfg && cfg.id==='demandasPublicas', cfg&&cfg.id);
t('config guarda o mesmo token', !!cfg && cfg.dados.token===pub.id);
t('config registra quem publicou e quando',
  !!cfg && /@udiaco/.test(cfg.dados.publicadoPor||'') && !!cfg.dados.publicadoEm,
  cfg&&JSON.stringify(cfg.dados));
t('o token NAO fica numa colecao publica', APP.CFG_DEM_PUB!==APP.COL_PUB,
  APP.CFG_DEM_PUB+' / '+APP.COL_PUB);
t('nao apagou nada ao publicar do zero', A.apagou.length===0);

console.log('\n== 3) O LINK ==');
APP.setPub({token:'0123456789abcdef0123456789abcdef', publicadoEm:'2026-09-04T12:00:00Z',
  publicadoPor:'alexandre.magalhaes@udiaco.com.br'});
const link=APP.linkPublicoDemandas();
t('aponta para demandas.html', /\/demandas\.html\?p=/.test(link), link);
t('leva o token na query', link.endsWith('=0123456789abcdef0123456789abcdef'), link);
t('nao aponta para comercial.html', !/comercial\.html/.test(link), link);
APP.setPub(null);
t('sem publicacao, nao ha link', APP.linkPublicoDemandas()==='');

console.log('\n== 4) RETRATO ACOMPANHA AS MUDANCAS ==');
A.gravou.length=0;
APP.setPub(null);
APP.atualizarDemPub(); A.correTimers();
t('sem link publicado, nao grava nada', A.gravou.length===0, JSON.stringify(A.gravou));
APP.setPub({token:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', publicadoEm:'x', publicadoPor:'y'});
A.gravou.length=0;
APP.atualizarDemPub();
t('espera antes de gravar (nao grava na hora)', A.gravou.length===0);
APP.atualizarDemPub(); APP.atualizarDemPub(); APP.atualizarDemPub();
A.correTimers();
t('4 alteracoes seguidas = 1 gravacao', A.gravou.length===1, String(A.gravou.length));
t('gravou no token publicado', A.gravou[0].id==='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
A.gravou.length=0;
APP.setDemandas(DEMS.slice(0,2));
APP.atualizarDemPub(); A.correTimers();
t('retrato reflete a lista de agora', A.gravou[0].dados.itens.length===2,
  String(A.gravou[0].dados.itens.length));
APP.setDemandas(DEMS);
// o gatilho real: o onSnapshot da colecao de demandas
t('o onSnapshot de cm_demandas chama atualizarDemPub',
  /_onSnapshot\(window\._col\(COL_DEM\)[\s\S]{0,600}?atualizarDemPub\(\)/.test(SRC));
t('trocar a cadencia tambem reescreve o retrato',
  /function irSprintModo[\s\S]{0,200}?atualizarDemPub\(\)/.test(SRC));
A.gravou.length=0;
APP.irSprintModo('semanal'); A.correTimers();
t('retrato gravado com a cadencia nova',
  A.gravou.length===1 && A.gravou[0].dados.cadencia==='semanal',
  JSON.stringify(A.gravou.map(g=>g.dados&&g.dados.cadencia)));
APP.irSprintModo('quinzenal'); A.correTimers();

console.log('\n== 5) RENOVAR E DESATIVAR ==');
APP.setPub({token:'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', publicadoEm:'x', publicadoPor:'y'});
A.gravou.length=0; A.apagou.length=0;
await APP.renovarLinkDemandas();
const novo=A.gravou.find(g=>g.col==='cm_publico');
t('renovar grava um token novo', !!novo && novo.id!=='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', novo&&novo.id);
t('renovar apaga o retrato do token antigo',
  A.apagou.some(a=>a.col==='cm_publico'&&a.id==='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'),
  JSON.stringify(A.apagou));
t('renovar aponta a config para o token novo',
  A.gravou.some(g=>g.col==='cm_config'&&g.dados.token===novo.id));

APP.setPub({token:'cccccccccccccccccccccccccccccccc', publicadoEm:'x', publicadoPor:'y'});
A.gravou.length=0; A.apagou.length=0;
await APP.despublicarDemandas();
t('desativar apaga o retrato publico',
  A.apagou.some(a=>a.col==='cm_publico'&&a.id==='cccccccccccccccccccccccccccccccc'),
  JSON.stringify(A.apagou));
t('desativar apaga a config',
  A.apagou.some(a=>a.col==='cm_config'&&a.id==='demandasPublicas'));
t('desativar nao grava nada', A.gravou.length===0, JSON.stringify(A.gravou));

console.log('\n== 6) TELA DA PLATAFORMA ==');
APP.setPub(null);
const html=APP.viewDemandas();
t('botao Compartilhar no cabecalho', /modalCompartilharDemandas\(\)/.test(html));
t('sem link ativo mostra o icone comum', /ti-share/.test(html));
APP.setPub({token:'dddddddddddddddddddddddddddddddd', publicadoEm:'2026-09-04T12:00:00Z',
  publicadoPor:'alexandre.magalhaes@udiaco.com.br'});
const html2=APP.viewDemandas();
t('com link ativo o icone muda', /ti-world-share/.test(html2));

APP.modalCompartilharDemandas();
const mod=A.NODES['camada'].innerHTML;
t('modal mostra o link', /demandas\.html\?p=dddddddddddddddddddddddddddddddd/.test(mod));
t('modal deixa copiar', /copiarLinkDemandas\(\)/.test(mod));
t('modal deixa gerar link novo', /renovarLinkDemandas\(\)/.test(mod));
t('modal deixa desativar', /despublicarDemandas\(\)/.test(mod));
t('modal diz que e so leitura', /leitura/i.test(mod) && /sem login/i.test(mod));
t('modal avisa quantas demandas ficam visiveis', /3 demandas/.test(mod), mod.slice(0,0)||'');
t('modal registra quem publicou', /alexandre\.magalhaes@udiaco\.com\.br/.test(mod));
t('link no modal e somente leitura (readonly)', /id="shd-link" readonly/.test(mod));
APP.setPub(null);
APP.modalCompartilharDemandas();
const mod0=A.NODES['camada'].innerHTML;
t('sem link, oferece gerar', /publicarDemandas\(\)/.test(mod0));
t('sem link, nao oferece desativar', !/despublicarDemandas\(\)/.test(mod0));

console.log('\n== 7) PAGINA PUBLICA: SO LEITURA ==');
t('sem firebase-auth', !/firebase-auth/.test(PUB));
t('sem onAuthStateChanged', !/onAuthStateChanged/.test(PUB));
t('nao importa setDoc/updateDoc/deleteDoc/addDoc',
  !/\b(setDoc|updateDoc|deleteDoc|addDoc|writeBatch)\b/.test(PUB));
t('nao importa getDocs (nao lista colecao)', !/getDocs/.test(PUB));
t('le apenas cm_publico', (PUB.match(/_pub\.get\('([a-z_]+)'/g)||[]).join()==="_pub.get('cm_publico'",
  (PUB.match(/_pub\.get\('([a-z_]+)'/g)||[]).join());
const semCom=PUB.replace(/\/\/[^\n]*/g,'').replace(/<!--[\s\S]*?-->/g,'');
t('nao toca em cm_demandas', !/cm_demandas/.test(semCom));
t('nao toca em cm_config', !/cm_config/.test(semCom));
t('sem campo de edicao na tabela', !/<input|<select|<textarea/.test(PUB));
t('sem onchange em lugar nenhum', !/onchange/.test(PUB));
t('sem modal de demanda', !/modalDemanda/.test(PUB));
t('sem botao de excluir', !/excluir/i.test(PUB));
t('noindex', /noindex/.test(PUB));
t('no-referrer', /no-referrer/.test(PUB));
t('avisa que e somente leitura', /Somente leitura/.test(PUB));
t('rodape explica onde se altera', /somente na plataforma/.test(PUB));
t('valida o formato do token antes de buscar', /\[a-z0-9\]\{16,64\}/.test(PUB));

console.log('\n== 8) PARIDADE DO CALCULO DE SPRINT ==');
// A pagina publica agrupa com o 'hoje' de quem olha, entao repete a conta.
// Esta secao existe para as duas contas nao se separarem no tempo.
const blocos=PUB.match(/<script>([\s\S]*?)<\/script>/g)||[];
const corpo=blocos.map(b=>b.replace(/^<script>/,'').replace(/<\/script>$/,'')).join('\n');
t('achou o script da pagina publica', corpo.length>2000, String(corpo.length));
const B=mkAmbiente('/demandas.html');
const nomesB=Object.keys(B.sandbox);
let PUBAPP;
try{
  PUBAPP=new Function(...nomesB, corpo
    +'\nreturn {sprintDe,sprintTitulo,prioNum,pintar,setCad:v=>{cadencia=v},'
    +'setItens:(i,s)=>{itens=i;STATUS=s},getCad:()=>cadencia,DM_COLS};')
    (...nomesB.map(n=>B.sandbox[n]));
  t('script da pagina publica roda', true);
}catch(e){ t('script da pagina publica roda', false, e.message); }

if(PUBAPP){
  const DATAS=['2026-01-05','2026-01-04','2026-08-28','2026-09-11','2026-09-12','2026-09-13',
    '2026-09-14','2026-09-15','2026-12-31','2027-03-01','2025-11-20','','abc'];
  ['quinzenal','semanal','mensal'].forEach(cad=>{
    APP.irSprintModo(cad); PUBAPP.setCad(cad);
    const dif=DATAS.filter(d=>{
      const a=APP.sprintDe(d), b=PUBAPP.sprintDe(d);
      if(!a||!b) return !!a!==!!b;
      return a.chave!==b.chave || +a.ini!==+b.ini || +a.fim!==+b.fim
        || APP.sprintTitulo(a)!==PUBAPP.sprintTitulo(b);
    });
    t('mesma janela e mesmo titulo em '+cad, dif.length===0, dif.join(','));
  });
  APP.irSprintModo('quinzenal'); PUBAPP.setCad('quinzenal');
  t('prioridade vazia vai para o fim nas duas',
    APP.prioNum('')===PUBAPP.prioNum('') && PUBAPP.prioNum('')===9999);
  t('prioridade 0 continua sendo 0 nas duas',
    APP.prioNum(0)===0 && PUBAPP.prioNum(0)===0);
  t('mesmas larguras de coluna, menos a de editar',
    JSON.stringify(PUBAPP.DM_COLS)===JSON.stringify(APP.sprintDe?['auto','46px','66px','128px','176px','62px','148px']:null),
    JSON.stringify(PUBAPP.DM_COLS));

  console.log('\n== 9) PAGINA PUBLICA PINTA O QUADRO ==');
  const ST=[{v:'briefing',l:'Briefing',cor:'var(--cm-briefing)'},
    {v:'desenvolvimento',l:'Em desenvolvimento',cor:'var(--cm-andamento)'},
    {v:'entregue',l:'Entregue',cor:'var(--cm-entregue)'}];
  PUBAPP.setItens(APP._itensPublicos(), ST);
  PUBAPP.pintar();
  const q=B.NODES['lista'].innerHTML, st=B.NODES['stats'].innerHTML;
  t('desenhou tabela', /<table class="dm">/.test(q));
  t('agrupou em sprint', /sp-bloco/.test(q));
  t('mostra o titulo da demanda', /Integrar folha com o Senior/.test(q));
  t('mostra quem pediu', /Leia/.test(q));
  t('mostra o status por extenso', /Em desenvolvimento/.test(q));
  t('prioridade 1 antes da 2 na sprint',
    q.indexOf('Painel de vendedores')<q.indexOf('Integrar folha'), 'ordem trocada');
  t('sem prazo tem bloco proprio', /Sem prazo definido/.test(q));
  t('descritivo no hover', /data-desc="/.test(q));
  t('demanda sem descritivo e titulo curto nao tem balao',
    (q.match(/data-desc=/g)||[]).length===1, String((q.match(/data-desc=/g)||[]).length));
  t('nenhum campo editavel no que foi pintado', !/<input|<select/.test(q));
  t('indicador de total', /tickets no total/.test(st));
  t('indicador por status', /st-tot__n/.test(st));
  t('conta 3 tickets', /<span class="stat1__n">3<\/span>/.test(st));
  t('rodape do bloco conta as demandas', /3 demanda\(s\) em \d+ sprint\(s\)/.test(q));
}

console.log('\n== 10) REGRAS DO FIRESTORE ==');
t('cm_config exige a plataforma Comercial',
  /match \/cm_config\/\{id\}\s*\{ allow read, write: if podeComercial\(\); \}/.test(RULES),
  (RULES.match(/cm_config[^\n]*/)||[''])[0]);
t('cm_publico continua so com get (sem list)',
  /match \/cm_publico\/\{token\}\s*\{ allow get: if true;/.test(RULES));
t('cm_demandas continua fechado',
  /match \/cm_demandas\/\{id\}\s*\{ allow read, write: if podeComercial\(\); \}/.test(RULES));
t('cm_config NAO e publico', !/cm_config[^\n]*allow (get|read): if true/.test(RULES));
t('regra explica por que cm_config fica fora do publico',
  /segredo do link/.test(RULES.replace(/\n\s*\/\/\s*/g,' ')));

console.log('\n== 11) LINK NA PAGINA ERRADA ==');
t('painel.html manda demandas para demandas.html',
  /tipo==='demandas'[\s\S]{0,120}location\.replace\('demandas\.html/.test(PAIN));
t('demandas.html manda painel para painel.html',
  /tipo!=='demandas'[\s\S]{0,120}location\.replace\('painel\.html/.test(PUB));

console.log('\n'+(fail?'FALHAS: '+fail+' | ok: '+ok:'TUDO OK ('+ok+' checagens)'));
process.exit(fail?1:0);
})();
