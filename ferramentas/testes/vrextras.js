// Dias extras SO de Vale Refeicao, lancados no passo de fechar.
// Aqui cada checagem vale dinheiro: o acrescimo tem de entrar no VR e em
// lugar nenhum mais, e tem de valer igual na tela, nas exportacoes e no
// fechamento — senao o arquivo do Caju paga um valor e o banco registra outro.
const fs=require('fs');
const SRC=fs.readFileSync('/Users/acmags/rhudi/app.js','utf8');
let ok=0, fail=0;
const t=(n,c,x)=>{ if(c){ok++;console.log('  ok   '+n);} else {fail++;console.log('  FALHA '+n+(x?'  -> '+x:''));} };

const NODES={}; const GRAVADO=[]; const PLANILHAS=[];
function mkEl(id){ return { id,_html:'',style:{cssText:'',display:''},className:'',
  textContent:'',value:'',checked:false,dataset:{},children:[],files:[],
  classList:{add(){},remove(){},contains(){return false}},
  get innerHTML(){return this._html}, set innerHTML(v){this._html=String(v)},
  addEventListener(){},removeEventListener(){},appendChild(c){return c},
  insertAdjacentHTML(p,h){this._html+=h},remove(){},
  querySelectorAll(){return[]},querySelector(){return null},closest(){return null},
  focus(){},click(){},setAttribute(){},getAttribute(){return null} }; }
// getCfg() le os radios da tela de configuracao. Sem responder por eles, o
// teste ficaria preso nos padroes e nunca cobriria o VR de valor fixo.
const CFG={};
const document={ getElementById(id){ return NODES[id]||(NODES[id]=mkEl(id)); },
  querySelector(sel){ const m=String(sel).match(/name="cfg-(\w+)"/);
    return m && CFG[m[1]] ? {value:CFG[m[1]]} : null; },
  querySelectorAll(){return[]},
  createElement(){return mkEl('el')},addEventListener(){},removeEventListener(){},
  body:mkEl('body'),head:mkEl('head'),documentElement:mkEl('html'),
  cookie:'',readyState:'complete' };
const window={ _firebaseReady:true,_db:{},_auth:{},_doc:(...a)=>({path:a.join('/')}),
  _writeBatch:()=>({set(){},update(){},delete(){},commit:()=>Promise.resolve()}),
  _setDoc:(r,d)=>{ GRAVADO.push({ref:r&&r.path,dados:d}); return Promise.resolve(); },
  _getDoc:()=>Promise.resolve({exists:()=>false,data:()=>({})}),
  _getDocs:()=>Promise.resolve({docs:[],forEach(){}}),_deleteDoc:()=>Promise.resolve(),
  _collection:()=>({}),_query:()=>({}),_onAuthStateChanged:()=>{},_signOut:()=>{},
  addEventListener(){},removeEventListener(){},
  matchMedia:()=>({matches:false,addEventListener(){}}),
  location:{href:''},navigator:{userAgent:'node'} };
window.window=window;
const sandbox={ window,document,
  localStorage:{_d:{},getItem(k){return this._d[k]??null},setItem(k,v){this._d[k]=String(v)},removeItem(){}},
  sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  setTimeout:()=>0,setInterval:()=>0,clearTimeout:()=>{},clearInterval:()=>{},
  console,alert:()=>{},confirm:()=>true,prompt:()=>null,
  fetch:()=>Promise.reject(new Error('x')),
  XLSX:{utils:{book_new:()=>({}),aoa_to_sheet:a=>{PLANILHAS.push(a);return{};},
    book_append_sheet:()=>{}},writeFile:()=>{}},
  ExcelJS:{Workbook:function(){}},JSZip:function(){},pdfjsLib:{},
  Intl,Date,Math,JSON,Object,Array,String,Number,Boolean,RegExp,Error,Promise,Set,Map,
  isNaN,parseInt,parseFloat,encodeURIComponent,decodeURIComponent,
  btoa:s=>Buffer.from(s).toString('base64'),atob:s=>Buffer.from(s,'base64').toString(),
  Blob:function(p){ this.p=p; },URL:{createObjectURL:()=>'x',revokeObjectURL(){}},
  FileReader:function(){},structuredClone:o=>JSON.parse(JSON.stringify(o)) };
const nomes=Object.keys(sandbox);
const API=['calcBen','getLanDR','getLanDU','getLanDRVR','setLan','renderTabelaBenef',
  'fecharCompetencia','exportarLancamentoExcel','getLanAtivos','getCfg','fnum','brl'];
const exporta='return {'+API.map(n=>n+':(typeof '+n+'!=="undefined"?'+n+':undefined)').join(',')
  +',setLanc:v=>{lancamento=v},getLanc:()=>lancamento'
  +',setBase:v=>{baseApuracao=v},setColabs:v=>{colaboradores=v}'
  +',setComp:(c,du)=>{lanComp=c;lanDU=du},setStep:(n,b)=>{lanStep=n;lanStep4Ben=b}'
  +',setUsuario:v=>{usuarioAtual=v}};';
let APP;
console.log('-- CARGA --');
try{ APP=new Function(...nomes, SRC+'\n'+exporta)(...nomes.map(n=>sandbox[n]));
  t('app.js carregado',true);
}catch(e){ t('app.js carregado',false,e.message); process.exit(1); }

// ── cenario: 22 dias uteis, VR de R$ 30/dia ──────────────────────────────
const DU=22;
const PESSOAS=[
  // 22 dias cheios
  {_id:'a',mat:'1001',nome:'ANA',cpf:'11111111111',status:'Trabalhando',filtro:'OK',
   empresa:'1000',vr:30,cafe:0,comb:0,cesta:0,elegibilidade:{vr:true,cafe:false,mobilidade:false,vt:false,cesta:false}},
  // 2 faltas -> 20 dias
  {_id:'b',mat:'1002',nome:'BRUNO',cpf:'22222222222',status:'Trabalhando',filtro:'OK',
   empresa:'1000',vr:30,cafe:0,comb:0,cesta:0,elegibilidade:{vr:true,cafe:false,mobilidade:false,vt:false,cesta:false}},
  // recebe cafe tambem, para provar que o extra de VR nao encosta nele
  {_id:'c',mat:'1003',nome:'CARLA',cpf:'33333333333',status:'Trabalhando',filtro:'OK',
   empresa:'1000',vr:30,cafe:10,comb:0,cesta:0,elegibilidade:{vr:true,cafe:true,mobilidade:false,vt:false,cesta:false}},
];
APP.setUsuario({email:'ale@udiaco.com.br',papel:'master'});
APP.setColabs(PESSOAS);
APP.setBase({competencia:'09/2026',colaboradores:PESSOAS});
APP.setComp('09/2026', DU);
APP.setLanc({ '1002':{faltas:2} });
const setCfg=o=>{ Object.keys(CFG).forEach(k=>delete CFG[k]); Object.assign(CFG,o); };
// cafe TAMBEM por dia: assim, se o extra de VR vazasse, o cafe mudaria junto
// e o teste veria. Com cafe fixo, o vazamento passaria despercebido.
setCfg({vr:'mult',cafe:'mult',comb:'mult',vt:'mult'});
const dr=m=>APP.getLanDR(m,DU);
const val=(m,k)=>{ const c=PESSOAS.find(p=>p.mat===m);
  return APP.calcBen(c, dr(m), APP.getLanDU(m,DU))[k]; };

console.log('\n== 1) SEM EXCECAO, NADA MUDA ==');
t('ANA tem os 22 dias da conferencia', dr('1001')===22, String(dr('1001')));
t('BRUNO perdeu 2 por falta', dr('1002')===20, String(dr('1002')));
t('os dias de VR sao os mesmos', APP.getLanDRVR('1001',dr('1001'))===22
  && APP.getLanDRVR('1002',dr('1002'))===20);
t('VR da ANA = 22 x 30', val('1001','vr')===660, String(val('1001','vr')));
t('VR do BRUNO = 20 x 30', val('1002','vr')===600, String(val('1002','vr')));

console.log('\n== 2) O ACRESCIMO ENTRA SO NO VR ==');
APP.getLanc()['1003']={extrasVr:3};
t('os dias da conferencia NAO mudam', dr('1003')===22, String(dr('1003')));
t('mas os dias de VR sim', APP.getLanDRVR('1003',dr('1003'))===25,
  String(APP.getLanDRVR('1003',dr('1003'))));
t('o VR e pago por 25 dias', val('1003','vr')===750, String(val('1003','vr')));
t('o CAFE continua nos 22 dias', val('1003','cafe')===220, String(val('1003','cafe')));
t('e ninguem mais foi afetado', val('1001','vr')===660 && val('1002','vr')===600);

console.log('\n== 3) SOMA SOBRE O LIQUIDO, NAO SOBRE A JORNADA ==');
// quem faltou e ganhou excecao parte dos dias que sobraram, nao dos 22
APP.getLanc()['1002']={faltas:2, extrasVr:2};
t('BRUNO: 20 liquidos + 2 = 22 de VR', APP.getLanDRVR('1002',dr('1002'))===22,
  String(APP.getLanDRVR('1002',dr('1002'))));
t('e nao 24', APP.getLanDRVR('1002',dr('1002'))!==24);
t('VR do BRUNO = 22 x 30', val('1002','vr')===660, String(val('1002','vr')));
t('os dias da conferencia dele seguem 20', dr('1002')===20);

console.log('\n== 4) NUMERO ESTRANHO NAO VIRA VALOR ESTRANHO ==');
APP.getLanc()['1001']={extrasVr:-30};
t('negativo nao deixa os dias abaixo de zero', APP.getLanDRVR('1001',dr('1001'))===0,
  String(APP.getLanDRVR('1001',dr('1001'))));
t('e o VR fica zerado, nao negativo', val('1001','vr')===0, String(val('1001','vr')));
APP.getLanc()['1001']={extrasVr:'abc'};
t('texto conta como zero', APP.getLanDRVR('1001',dr('1001'))===22);
t('e o VR volta ao normal', val('1001','vr')===660);
delete APP.getLanc()['1001'];
t('sem o campo, comporta como antes', APP.getLanDRVR('1001',dr('1001'))===22
  && val('1001','vr')===660);

console.log('\n== 5) VR DE VALOR FIXO IGNORA DIAS ==');
setCfg({vr:'fixo',cafe:'mult',comb:'mult',vt:'mult'});
APP.getLanc()['1003']={extrasVr:5};
t('valor fixo nao multiplica por dia', val('1003','vr')===30, String(val('1003','vr')));
setCfg({vr:'mult',cafe:'mult',comb:'mult',vt:'mult'});
t('de volta ao por dia', val('1003','vr')===30*27, String(val('1003','vr')));
APP.getLanc()['1003']={extrasVr:3};

console.log('\n== 6) QUEM NAO RECEBE VR CONTINUA SEM ==');
const semVr=Object.assign({},PESSOAS[0],{mat:'1004',elegibilidade:{vr:false}});
t('inelegivel nao ganha VR nem com extra',
  (APP.getLanc()['1004']={extrasVr:10},
   APP.calcBen(semVr, 22, 22).vr===0));
const part=Object.assign({},PESSOAS[0],{mat:'1005',filtro:'PART',cesta:185});
t('PART continua so com cesta',
  (APP.getLanc()['1005']={extrasVr:10},
   JSON.stringify(APP.calcBen(part,22,22))==='{"vr":0,"cafe":0,"comb":0,"vt":0,"cesta":185}'),
  JSON.stringify(APP.calcBen(part,22,22)));

console.log('\n== 7) A TELA DO PASSO 6 ==');
APP.setStep(6,'vr');
NODES['lan-tab-benef']=mkEl('lan-tab-benef');
NODES['lan-total-benef']=mkEl('lan-total-benef');
APP.renderTabelaBenef();
const tv=NODES['lan-tab-benef'].innerHTML;
t('mostra os dias uteis da conferencia', /<th style="text-align:center">Dias úteis/.test(tv),
  (tv.match(/<th[^>]*>[^<]*/g)||[]).join(' | ').slice(0,200));
t('e a coluna de extras do VR', /<th style="text-align:center">Extras VR/.test(tv));
t('e o total de dias que vale para o VR', /<th style="text-align:center">Dias VR/.test(tv));
t('o campo de extras e editavel', /onchange="setLan\('1003','extrasVr',this\.value\)"/.test(tv),
  (tv.match(/setLan\([^)]*extrasVr[^)]*\)/g)||[]).join(' | '));
t('traz o que ja estava lancado', /value="3"/.test(tv));
t('e mostra 22 + 3 = 25', />25<\/td>/.test(tv),
  (tv.match(/text-align:center[^>]*>\d+<\/td>/g)||[]).join(' '));
t('um campo por colaborador', (tv.match(/class="input-extras"/g)||[]).length===3,
  'campos='+(tv.match(/class="input-extras"/g)||[]).length);
t('quem nao tem excecao fica com o campo vazio',
  (tv.match(/value=""/g)||[]).length===1,
  'vazios='+(tv.match(/value=""/g)||[]).length);
t('e quem tem aparece destacado',
  (tv.match(/background:#FEF3C7/g)||[]).length===2,
  'destacados='+(tv.match(/background:#FEF3C7/g)||[]).length);
t('o rodape soma os dias extras lancados (2 + 3)', /<td style="text-align:center;font-weight:700">5<\/td>/.test(tv),
  (tv.match(/total-row[\s\S]{0,200}/)||[''])[0].replace(/<[^>]*>/g,' '));
t('o "?" explica que nao mexe nos outros beneficios',
  /Não altera os outros benefícios/.test(tv));

console.log('\n-- os outros beneficios seguem com uma coluna de dias --');
APP.setStep(6,'cafe');
APP.renderTabelaBenef();
const tc=NODES['lan-tab-benef'].innerHTML;
t('cafe nao ganhou coluna de extras', !/Extras VR/.test(tc));
t('nem campo editavel', !/extrasVr/.test(tc));
t('continua com a coluna Dias', /<th style="text-align:center">Dias<\/th>/.test(tc));

console.log('\n== 8) VR FIXO AVISA QUE DIA NAO IMPORTA ==');
setCfg({vr:'fixo',cafe:'mult',comb:'mult',vt:'mult'});
APP.setStep(6,'vr'); APP.renderTabelaBenef();
t('avisa que esta como valor fixo', /valor fixo/.test(NODES['lan-tab-benef'].innerHTML),
  NODES['lan-tab-benef'].innerHTML.replace(/<[^>]*>/g,' ').slice(0,160));
setCfg({vr:'mult',cafe:'mult',comb:'mult',vt:'mult'});

console.log('\n== 9) O CAMPO VAZIO NAO SUJA O BANCO ==');
(async()=>{
  await APP.setLan('1001','extrasVr','4');
  t('lancou 4', APP.getLanc()['1001'].extrasVr===4, JSON.stringify(APP.getLanc()['1001']));
  await APP.setLan('1001','extrasVr','');
  t('apagando, o campo sai do registro', !('extrasVr' in (APP.getLanc()['1001']||{})),
    JSON.stringify(APP.getLanc()['1001']));
  await APP.setLan('1001','extrasVr','0');
  t('zero tambem nao fica guardado', !('extrasVr' in (APP.getLanc()['1001']||{})),
    JSON.stringify(APP.getLanc()['1001']));

  console.log('\n== 10) O QUE FOI PAGO FICA REGISTRADO ==');
  GRAVADO.length=0;
  APP.setStep(6,'vr');
  NODES['lan-fechar-ben']=mkEl('lan-fechar-ben');
  NODES['lan-fechar-ben'].value='vr';
  await APP.fecharCompetencia();
  const g=GRAVADO.find(x=>/historico/.test(x.ref||''));
  t('gravou o fechamento de VR', !!g && g.dados.beneficio==='vr',
    JSON.stringify(g&&{ref:g.ref,ben:g.dados.beneficio}));
  const carla=(g.dados.detalhes||[]).find(d=>d.mat==='1003');
  t('registrou os dias da conferencia', carla && carla.dr===22, JSON.stringify(carla));
  t('registrou o acrescimo de VR', carla && carla.extrasVr===3);
  t('e os dias que de fato valeram', carla && carla.dias===25);
  t('com o valor batendo com eles', carla && carla.valor===25*30, String(carla&&carla.valor));
  const ana=(g.dados.detalhes||[]).find(d=>d.mat==='1001');
  t('quem nao teve excecao fica com extras zero', ana && ana.extrasVr===0
    && ana.dias===ana.dr, JSON.stringify(ana));

  GRAVADO.length=0;
  NODES['lan-fechar-ben'].value='todos';
  await APP.fecharCompetencia();
  const g2=GRAVADO.find(x=>/historico/.test(x.ref||''));
  const carla2=(g2.dados.detalhes||[]).find(d=>d.mat==='1003');
  t('o fechamento geral tambem guarda', carla2 && carla2.extrasVr===3 && carla2.drVr===25,
    JSON.stringify(carla2&&{extrasVr:carla2.extrasVr,drVr:carla2.drVr,dr:carla2.dr}));
  t('e o VR dela sai por 25 dias', carla2 && carla2.vr===750, String(carla2&&carla2.vr));
  t('sem mexer no cafe dela', carla2 && carla2.cafe===220, String(carla2&&carla2.cafe));

  console.log('\n== 11) O EXCEL EXPLICA O VALOR ==');
  PLANILHAS.length=0;
  APP.exportarLancamentoExcel();
  const linhas=PLANILHAS[0]||[];
  const cab=linhas[0]||[];
  t('tem coluna de extras de VR', cab.includes('Extras VR'), JSON.stringify(cab));
  t('e de dias de VR', cab.includes('Dias VR'));
  t('na ordem: dias reais, extras VR, dias VR',
    cab.indexOf('Dias Reais')<cab.indexOf('Extras VR')
    && cab.indexOf('Extras VR')<cab.indexOf('Dias VR'));
  const lc=linhas.find(l=>l[0]==='1003');
  t('a linha da CARLA mostra 22, 3 e 25',
    lc && lc[cab.indexOf('Dias Reais')]===22 && lc[cab.indexOf('Extras VR')]===3
    && lc[cab.indexOf('Dias VR')]===25, JSON.stringify(lc));
  t('e o VR dela bate', lc && lc[cab.indexOf('VR')]===750, String(lc&&lc[cab.indexOf('VR')]));

  console.log('\n'+(fail?'FALHAS: '+fail+' | ok: '+ok:'TUDO OK ('+ok+' checagens)'));
  process.exit(fail?1:0);
})();
