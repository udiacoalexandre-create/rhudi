// Remuneracao Variavel: rodape travado, e o passo de VALORES por competencia.
// O valor de cada percentual e o que multiplica todo mundo, entao cada regra
// aqui vale dinheiro: numero invalido nao pode entrar, competencia fechada nao
// pode mudar, e o que foi pago tem de ficar registrado com a tabela usada.
const fs=require('fs');
const SRC=fs.readFileSync('/Users/acmags/rhudi/app.js','utf8');
const HTML=fs.readFileSync('/Users/acmags/rhudi/index.html','utf8');
let ok=0, fail=0;
const t=(n,c,x)=>{ if(c){ok++;console.log('  ok   '+n);} else {fail++;console.log('  FALHA '+n+(x?'  -> '+x:''));} };

const NODES={}; const GRAVADO=[];
function mkEl(id){ return { id,_html:'',style:{cssText:'',display:''},className:'',
  textContent:'',value:'',checked:false,dataset:{},children:[],files:[],
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
const AVISOS=[];
const sandbox={ window,document,
  localStorage:{_d:{},getItem(k){return this._d[k]??null},setItem(k,v){this._d[k]=String(v)},removeItem(){}},
  sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  setTimeout:()=>0,setInterval:()=>0,clearTimeout:()=>{},clearInterval:()=>{},
  console,alert:()=>{},confirm:()=>true,prompt:()=>null,
  fetch:()=>Promise.reject(new Error('x')),
  XLSX:{utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{}},writeFile:()=>{}},
  ExcelJS:{Workbook:function(){}},JSZip:function(){},pdfjsLib:{},
  Intl,Date,Math,JSON,Object,Array,String,Number,Boolean,RegExp,Error,Promise,Set,Map,
  isNaN,parseInt,parseFloat,encodeURIComponent,decodeURIComponent,
  btoa:s=>Buffer.from(s).toString('base64'),atob:s=>Buffer.from(s,'base64').toString(),
  Blob:function(){},URL:{createObjectURL:()=>'x',revokeObjectURL(){}},FileReader:function(){},
  structuredClone:o=>JSON.parse(JSON.stringify(o)) };
const nomes=Object.keys(sandbox);
const API=['renderRV','pgRemVariavel','rvFaixas','rvFaixa','rvValor','rvTotal','rvComValor',
  'rvSetFaixaValor','rvAddFaixa','rvRemFaixa','rvIrPasso','rvSalvar','rvGravarHistorico',
  'rvFecharCompetencia','rvAplicarTodos','_rvPct','_rvNum','_rvLerNum','rvRenderPct',
  'RV_FAIXAS_PADRAO','RV_PASSOS','toast','brl','fnum'];
const exporta='return {'+API.map(n=>n+':(typeof '+n+'!=="undefined"?'+n+':undefined)').join(',')
  +',setUsuario:v=>{usuarioAtual=v},getState:()=>rvState,setState:v=>{rvState=v}'
  +',setColabs:v=>{colaboradores=v}};';
let APP;
console.log('-- CARGA --');
try{ APP=new Function(...nomes, SRC+'\n'+exporta)(...nomes.map(n=>sandbox[n]));
  t('app.js carregado',true);
}catch(e){ t('app.js carregado',false,e.message); process.exit(1); }
APP.setUsuario({email:'ale@udiaco.com.br',papel:'master'});
APP.setColabs([]);
const st=()=>APP.getState();
const tela=()=>NODES['rv-conteudo']?NODES['rv-conteudo'].innerHTML:'';
const rod=()=>NODES['rv-rodape']?NODES['rv-rodape'].innerHTML:'';

console.log('\n== 1) O RODAPE NAO ROLA COM A PAGINA ==');
t('o rodape e sticky, grudado embaixo',
  /\.ds \.lan-rodape \{[^}]*position: sticky[^}]*bottom: 0/.test(HTML),
  (HTML.match(/\.ds \.lan-rodape \{[^}]*\}/)||[''])[0].replace(/\s+/g,' ').slice(0,150));
t('e nao mais position:relative', !/\.ds \.lan-rodape \{[^}]*position: relative/.test(HTML));
t('tem fundo opaco (o conteudo nao aparece atras)',
  /\.ds \.lan-rodape \{[^}]*background: var\(--surface\)/.test(HTML));
t('fica acima do conteudo', /\.ds \.lan-rodape \{[^}]*z-index: 20/.test(HTML));
const shell=APP.pgRemVariavel();
t('o titulo da RV ficou DENTRO do .bl-page',
  shell.indexOf('bl-page') < shell.indexOf('page-title'),
  shell.replace(/\s+/g,' ').slice(0,140));
t('e dentro da area que rola', shell.indexOf('lan-conteudo') < shell.indexOf('page-title'));
t('o rodape esta FORA da area que rola',
  shell.indexOf('rv-rodape') > shell.lastIndexOf('</div>\n    <div id="rv-rodape"')-1
  && /<\/div>\s*<div id="rv-rodape">/.test(shell), shell.replace(/\s+/g,' ').slice(-160));
t('as abas tambem ficam dentro', /lan-top[\s\S]*rv-tabs/.test(shell));
// o Premio ja seguia o padrao; garante que continua
t('o Premio tambem mantem o rodape fora do rolavel',
  /<div id="premio-wizard"><\/div>\s*<\/div>\s*<div id="premio-rodape">/.test(SRC),
  (SRC.match(/premio-wizard[\s\S]{0,120}/)||[''])[0].replace(/\s+/g,' '));

console.log('\n== 2) O PASSO NOVO ESTA NO LUGAR ==');
t('sao 6 passos', APP.RV_PASSOS.length===6, String(APP.RV_PASSOS.length));
t('e Valores vem depois de Colaboradores',
  APP.RV_PASSOS.map(p=>p.label).join(' > ')
  ==='Base > Competência > Colaboradores > Valores > Percentuais > Fechar',
  APP.RV_PASSOS.map(p=>p.label).join(' > '));
t('numerados de 1 a 6', APP.RV_PASSOS.map(p=>p.n).join(',')==='1,2,3,4,5,6');

console.log('\n== 3) OS VALORES SAO DA COMPETENCIA, NAO DO CODIGO ==');
t('o padrao continua 0 / 85 / 270',
  APP.RV_FAIXAS_PADRAO.map(f=>f.p+':'+f.v).join(' ')==='0:0 0.5:85 1:270',
  APP.RV_FAIXAS_PADRAO.map(f=>f.p+':'+f.v).join(' '));
t('e a competencia comeca com ele', APP.rvFaixas().map(f=>f.v).join(',')==='0,85,270');
st().competencia='9/2026'; st().passo=4;
APP.renderRV();
t('o passo 4 desenha a tabela de valores', /Quanto vale cada percentual/.test(tela()),
  tela().replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,140));
t('mostra a competencia no titulo', /em 9\/2026/.test(tela()));
t('cada faixa tem campo de valor editavel',
  (tela().match(/onchange="rvSetFaixaValor\(/g)||[]).length===3,
  String((tela().match(/onchange="rvSetFaixaValor\(/g)||[]).length));
t('os valores vem preenchidos', /value="270"/.test(tela()) && /value="85"/.test(tela()),
  (tela().match(/value="\d+"/g)||[]).join(','));
t('e o rodape leva para os percentuais', /rvIrPasso\(5\)/.test(rod()), rod().replace(/<[^>]*>/g,' '));
t('com volta para colaboradores', /rvIrPasso\(3\)/.test(rod()));

console.log('\n== 4) MUDAR O VALOR MUDA O QUE SE PAGA ==');
st().pessoas=[
  {mat:'1',nome:'A',cpf:'1',percentual:1},
  {mat:'2',nome:'B',cpf:'2',percentual:1},
  {mat:'3',nome:'C',cpf:'3',percentual:0.5},
  {mat:'4',nome:'D',cpf:'4',percentual:0},
  {mat:'5',nome:'E',cpf:'5',percentual:''},
];
t('total com a tabela atual', APP.rvTotal()===270*2+85, String(APP.rvTotal()));
APP.rvSetFaixaValor(1, '300');
t('mudou o valor de 100%', APP.rvFaixa(1).v===300, JSON.stringify(APP.rvFaixa(1)));
t('e o total acompanha', APP.rvTotal()===300*2+85, String(APP.rvTotal()));
APP.rvSetFaixaValor(0.5, '90,50');
t('aceita virgula decimal', APP.rvFaixa(0.5).v===90.5, String(APP.rvFaixa(0.5).v));
APP.rvSetFaixaValor(1, 'R$ 1.200,00');
t('aceita R$ e separador de milhar', APP.rvFaixa(1).v===1200, String(APP.rvFaixa(1).v));
APP.rvSetFaixaValor(1, '270');
t('e volta ao normal', APP.rvFaixa(1).v===270);
t('quem esta sem percentual continua em zero',
  APP.rvValor({percentual:''})===0 && APP.rvValor({percentual:null})===0);
t('percentual fora das faixas nao inventa valor', APP.rvValor({percentual:0.75})===0);
// devolve a tabela ao 0 / 85 / 270 de 08/2026: as secoes 8 e 10 conferem
// contra esses valores
APP.rvSetFaixaValor(0.5, '85');
t('tabela de volta ao 0 / 85 / 270', APP.rvFaixas().map(f=>f.v).join(',')==='0,85,270',
  APP.rvFaixas().map(f=>f.v).join(','));

console.log('\n== 5) VALOR INVALIDO NAO ENTRA ==');
const antes=APP.rvFaixa(1).v;
['abc','','-50','R$ -1'].forEach(ruim=>{
  APP.rvSetFaixaValor(1, ruim);
  t('recusa '+JSON.stringify(ruim), APP.rvFaixa(1).v===antes, String(APP.rvFaixa(1).v));
});
t('e avisa por que', /inválido/i.test(NODES['toast']?NODES['toast'].textContent:''),
  NODES['toast']?NODES['toast'].textContent:'(sem toast)');
t('zero e valido (e o caso da faixa de 0%)',
  (APP.rvSetFaixaValor(0,'0'), APP.rvFaixa(0).v===0));

console.log('\n== 6) INCLUIR E REMOVER FAIXA ==');
NODES['rv-nova-p']=mkEl('rv-nova-p'); NODES['rv-nova-v']=mkEl('rv-nova-v');
NODES['rv-nova-p'].value='75'; NODES['rv-nova-v'].value='180';
APP.rvAddFaixa();
t('incluiu a faixa de 75%', !!APP.rvFaixa(0.75), JSON.stringify(APP.rvFaixas()));
t('75 digitado virou 0,75', APP.rvFaixa(0.75).v===180);
t('e ela entra na ordem certa',
  APP.rvFaixas().map(f=>f.p).join(',')==='0,0.5,0.75,1', APP.rvFaixas().map(f=>f.p).join(','));
NODES['rv-nova-p'].value='0,25'; NODES['rv-nova-v'].value='40';
APP.rvAddFaixa();
t('aceita tambem a fracao 0,25', !!APP.rvFaixa(0.25), APP.rvFaixas().map(f=>f.p).join(','));
NODES['rv-nova-p'].value='75'; NODES['rv-nova-v'].value='999';
APP.rvAddFaixa();
t('faixa repetida e recusada', APP.rvFaixa(0.75).v===180, String(APP.rvFaixa(0.75).v));
t('e o aviso manda alterar a existente', /Já existe faixa/.test(NODES['toast'].textContent),
  NODES['toast'].textContent);
NODES['rv-nova-p'].value='150'; NODES['rv-nova-v'].value='10';
APP.rvAddFaixa();
t('acima de 100% e recusado', !APP.rvFaixa(1.5), APP.rvFaixas().map(f=>f.p).join(','));
NODES['rv-nova-p'].value=''; NODES['rv-nova-v'].value='10';
APP.rvAddFaixa();
t('sem o atingimento nao inclui', APP.rvFaixas().length===5, String(APP.rvFaixas().length));
NODES['rv-nova-p'].value='30'; NODES['rv-nova-v'].value='';
APP.rvAddFaixa();
t('sem o valor nao inclui', !APP.rvFaixa(0.3), APP.rvFaixas().map(f=>f.p).join(','));
APP.rvRemFaixa(0.25); APP.rvRemFaixa(0.75);
t('removeu as duas', APP.rvFaixas().map(f=>f.p).join(',')==='0,0.5,1',
  APP.rvFaixas().map(f=>f.p).join(','));

console.log('\n== 7) A TELA MOSTRA O EFEITO DA MUDANCA ==');
st().passo=4; APP.renderRV();
t('conta as pessoas de cada faixa', /<th style="text-align:center">Pessoas<\/th>/.test(tela()));
t('e o subtotal', /Subtotal/.test(tela()));
t('2 pessoas em 100%', /<td style="text-align:center">2<\/td>/.test(tela()),
  (tela().match(/<td style="text-align:center">[^<]*<\/td>/g)||[]).join(' '));
st().pessoas=st().pessoas.map(p=>Object.assign({},p,{percentual:''}));
APP.renderRV();
t('sem ninguem marcado, nao mostra coluna de gente', !/Subtotal/.test(tela()));
st().pessoas=[{mat:'1',nome:'A',cpf:'1',percentual:1}];

console.log('\n== 8) O PASSO 5 DIZ DE ONDE VEM O VALOR ==');
st().passo=5; APP.renderRV();
// brl() separa com espaco NAO quebravel, dai o \s
t('mostra a tabela usada', /100% = R\$\s270,00/.test(tela()),
  (tela().match(/\d+% = R\$[^<]*/g)||[]).join(' · '));
t('com atalho para alterar', /rvIrPasso\(4\)/.test(tela()));
t('e os botoes de aplicar em massa saem das faixas',
  (tela().match(/rvAplicarTodos\(/g)||[]).length===3,
  String((tela().match(/rvAplicarTodos\(/g)||[]).length));

console.log('\n== 9) COMPETENCIA FECHADA NAO MUDA DE VALOR ==');
st().fechado=true; st().passo=4; APP.renderRV();
t('os campos viram texto', !/rvSetFaixaValor/.test(tela()),
  (tela().match(/rvSetFaixaValor[^"]*/)||[''])[0]);
t('nao oferece incluir faixa', !/rvAddFaixa/.test(tela()));
t('nem remover', !/rvRemFaixa/.test(tela()));
t('e diz por que', /Competência fechada/.test(tela()));
const trav=APP.rvFaixa(1).v;
APP.rvSetFaixaValor(1,'999');
t('mesmo chamado direto, nao altera', APP.rvFaixa(1).v===trav, String(APP.rvFaixa(1).v));
APP.rvAddFaixa();
t('nem inclui', APP.rvFaixas().length===3, String(APP.rvFaixas().length));
APP.rvRemFaixa(1);
t('nem remove', !!APP.rvFaixa(1));
st().fechado=false;

console.log('\n== 10) O QUE FOI PAGO FICA REGISTRADO COM A TABELA ==');
GRAVADO.length=0;
st().competencia='9/2026';
st().pessoas=[{mat:'1',nome:'A',cpf:'111',percentual:1},{mat:'2',nome:'B',cpf:'222',percentual:0.5}];
(async()=>{
  await APP.rvSalvar();
  const g=GRAVADO.find(x=>/remVariavel/.test(x.ref||''));
  t('a competencia guarda as faixas', !!g && Array.isArray(g.dados.faixas),
    JSON.stringify(g&&Object.keys(g.dados)));
  t('com os valores em vigor', JSON.stringify(g.dados.faixas.map(f=>f.v))==='[0,85,270]',
    JSON.stringify(g.dados.faixas));
  t('e o total conferindo com elas', g.dados.total===355, String(g.dados.total));
  GRAVADO.length=0;
  await APP.rvGravarHistorico();
  const h=GRAVADO.find(x=>/historico/.test(x.ref||''));
  t('o historico tambem guarda a tabela usada', !!h && Array.isArray(h.dados.faixas),
    JSON.stringify(h&&Object.keys(h.dados)));
  t('senao nao havia como reconstruir o valor de cada um',
    JSON.stringify(h.dados.faixas.map(f=>f.p+':'+f.v))==='["0:0","0.5:85","1:270"]',
    JSON.stringify(h.dados.faixas));
  t('e o detalhe traz o valor de cada pessoa',
    h.dados.detalhe.map(d=>d.valor).join(',')==='270,85',
    JSON.stringify(h.dados.detalhe));
  t('a ajuda do titulo nao promete valor fixo',
    !/85|270/.test(APP.pgRemVariavel()), APP.pgRemVariavel().replace(/\s+/g,' ').slice(0,200));

  console.log('\n'+(fail?'FALHAS: '+fail+' | ok: '+ok:'TUDO OK ('+ok+' checagens)'));
  process.exit(fail?1:0);
})();
