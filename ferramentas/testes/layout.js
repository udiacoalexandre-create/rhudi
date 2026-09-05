// Topo compacto do Projeto Dev&Co: titulo, indicadores em uma linha, botoes
// menores, barra da sprint mais baixa e datas em DD/MM nas duas telas.
const fs=require('fs');
const SRC =fs.readFileSync('/Users/acmags/rhudi/comercial.js','utf8');
const HTML=fs.readFileSync('/Users/acmags/rhudi/comercial.html','utf8');
const PUB =fs.readFileSync('/Users/acmags/rhudi/demandas.html','utf8');
const DS  =fs.readFileSync('/Users/acmags/rhudi/udiaco-design-system.css','utf8');
let ok=0, fail=0;
const t=(n,c,x)=>{ if(c){ok++;console.log('  ok   '+n);} else {fail++;console.log('  FALHA '+n+(x?'  -> '+x:''));} };
// le uma propriedade declarada num bloco CSS
const bloco=(css,sel)=>{
  const e=sel.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  // ancora no inicio da regra: sem isto, '.sp-tit' casaria primeiro dentro de
  // '.sp-cab--atual .sp-tit' e a comparacao viraria a regra contra si mesma.
  const m=css.match(new RegExp('(?:^|[\\n,}])\\s*'+e+'\\s*\\{([^}]*)\\}'));
  return m?m[1]:null;
};
const px=(css,sel,prop)=>{
  const b=bloco(css,sel); if(b==null) return null;
  const p=b.match(new RegExp('(?:^|[;\\s])'+prop+'\\s*:\\s*([^;}]+)'));
  return p?p[1].trim():null;
};

// ── carrega comercial.js ─────────────────────────────────────────────────
function mkEl(id){ return { id,_html:'',style:{},className:'',textContent:'',value:'',
  checked:false,disabled:false,dataset:{},children:[],files:[],
  classList:{add(){},remove(){},contains(){return false}},
  get innerHTML(){return this._html}, set innerHTML(v){this._html=String(v)},
  addEventListener(){}, removeEventListener(){}, appendChild(c){return c},
  insertAdjacentHTML(p,h){this._html+=h}, remove(){}, querySelector(){return null},
  querySelectorAll(){return[]}, closest(){return null}, focus(){}, click(){}, select(){},
  getBoundingClientRect(){return{width:100,height:40}},
  setAttribute(){}, getAttribute(){return null} }; }
const NODES={};
const document={ getElementById(id){ return NODES[id]||(NODES[id]=mkEl(id)); },
  querySelector(){return null}, querySelectorAll(){return[]},
  createElement(tg){const e=mkEl('el-'+tg);e.href='';e.download='';return e;},
  addEventListener(){}, removeEventListener(){}, body:mkEl('body'), head:mkEl('head'),
  documentElement:mkEl('html'), cookie:'', readyState:'complete', title:'' };
const window={ _firebaseReady:true,_auth:{},_col:n=>n,_doc:(c,i)=>({c,i}),
  _getDoc:()=>Promise.resolve({exists:()=>false}), _setDoc:()=>Promise.resolve(),
  _deleteDoc:()=>Promise.resolve(), _getDocs:()=>Promise.resolve({forEach(){}}),
  _onSnapshot:()=>()=>{}, _query:()=>({}), _onAuthStateChanged:()=>{},
  addEventListener(){}, removeEventListener(){},
  location:{origin:'https://x',pathname:'/comercial.html'},
  crypto:{getRandomValues:a=>a}, navigator:{}, innerWidth:1400, innerHeight:900 };
window.window=window;
const sandbox={ window, document, location:window.location, navigator:{}, crypto:window.crypto,
  setTimeout:(f,ms)=>{ if(!ms) f(); return 0; }, clearTimeout:()=>{},
  setInterval:()=>0, clearInterval:()=>{}, console, alert:()=>{}, confirm:()=>true, prompt:()=>null,
  CompressionStream:undefined, DecompressionStream:undefined, TextEncoder, TextDecoder,
  btoa:s=>Buffer.from(s,'binary').toString('base64'),
  atob:s=>Buffer.from(s,'base64').toString('binary'),
  escape, unescape, encodeURIComponent, decodeURIComponent, URLSearchParams,
  Blob:function(){}, URL:{createObjectURL:()=>'x',revokeObjectURL(){}},
  Intl,Date,Math,JSON,Object,Array,String,Number,Boolean,RegExp,Error,Promise,Set,Map,
  isNaN,parseInt,parseFloat,Uint8Array,Response:function(){} };
const nomes=Object.keys(sandbox);
const API=['viewDemandas','pintarDemandas','soDataCurta','soData','_retratoDemandas','DM_COLS'];
const exporta='return {'+API.map(n=>n+':(typeof '+n+'!=="undefined"?'+n+':undefined)').join(',')
  +',setDemandas:v=>{demandas=v},setUsuario:v=>{usuario=v},setFiltro:v=>{filtroDem=v}};';
console.log('-- CARGA --');
let APP;
try{ APP=new Function(...nomes, SRC+'\n'+exporta)(...nomes.map(n=>sandbox[n]));
  t('comercial.js carregado',true);
}catch(e){ t('comercial.js carregado',false,e.message); process.exit(1); }
APP.setUsuario({email:'ale@udiaco.com.br'});
APP.setFiltro({q:'',prio:'',status:'',solic:''});

console.log('\n== 1) TITULO ==');
const cab=APP.viewDemandas();
t('titulo e Projeto Dev&Co', /<h2 class="pg-tit pg-tit--sm">Projeto Dev&amp;Co/.test(cab),
  (cab.match(/<h2[^>]*>[^<]*/)||[''])[0]);
t('nao sobrou "Demandas de tecnologia" na tela', !/Demandas de tecnologia/.test(cab));
t('a frase da empresa parceira saiu', !/empresa parceira/.test(cab));
t('nao ficou paragrafo de subtitulo', !/pg-sub/.test(cab), (cab.match(/pg-sub[^"]*/)||[''])[0]);
t('a explicacao continua no "?"', /class="ajuda"/.test(cab));
t('fonte do titulo menor que a padrao',
  parseFloat(px(HTML,'.pg-tit--sm','font-size'))<parseFloat(px(HTML,'.pg-tit','font-size')),
  px(HTML,'.pg-tit--sm','font-size')+' vs '+px(HTML,'.pg-tit','font-size'));

console.log('\n== 2) BOTOES MENORES ==');
['modalCompartilharDemandas','exportarDemandas','modalDemanda(null)'].forEach(f=>{
  const re=new RegExp('class="btn[^"]*btn--sm[^"]*"[^>]*onclick="'+f.replace(/[()]/g,'\\$&'));
  t('botao '+f.replace('(null)','')+' e pequeno', re.test(cab),
    (cab.match(new RegExp('<button[^>]*'+f.replace(/[()]/g,'\\$&')))||[''])[0]);
});
t('btn--sm e mais baixo que o .btn do sistema de design',
  parseFloat(px(HTML,'.btn--sm','height'))<parseFloat(px(DS,'.btn','height')),
  px(HTML,'.btn--sm','height')+' vs '+px(DS,'.btn','height'));
t('nao mexeu no .btn compartilhado com o RH',
  px(DS,'.btn','height')==='38px', px(DS,'.btn','height'));

console.log('\n== 3) INDICADORES EM UMA LINHA ==');
t('a faixa nao quebra linha', px(HTML,'.stats--slim','flex-wrap')==='nowrap',
  px(HTML,'.stats--slim','flex-wrap'));
t('em tela estreita rola de lado', px(HTML,'.stats--slim','overflow-x')==='auto');
t('nenhum item encolhe e desalinha', /\.stats--slim>\*\{ flex-shrink:0 \}/.test(HTML));
t('a faixa publica tambem e de uma linha', px(PUB,'.stats','flex-wrap')==='nowrap',
  px(PUB,'.stats','flex-wrap'));

console.log('\n== 4) BARRA DA SPRINT MAIS BAIXA ==');
const alt=s=>parseFloat(String(s||'').split(/\s+/)[0]);
t('barra normal mais baixa que antes (era 6px)', alt(px(HTML,'.sp-cab','padding'))<6,
  px(HTML,'.sp-cab','padding'));
t('barra da sprint atual mais baixa que antes (era 10px)',
  alt(px(HTML,'.sp-cab--atual','padding'))<10, px(HTML,'.sp-cab--atual','padding'));
t('barra da sprint atual segue com mais peso que as outras',
  alt(px(HTML,'.sp-cab--atual','padding'))>alt(px(HTML,'.sp-cab','padding')));
t('titulo da sprint atual segue maior',
  parseFloat(px(HTML,'.sp-cab--atual .sp-tit','font-size'))>parseFloat(px(HTML,'.sp-tit','font-size')),
  px(HTML,'.sp-cab--atual .sp-tit','font-size')+' vs '+px(HTML,'.sp-tit','font-size'));
t('barra publica tambem mais baixa', alt(px(PUB,'.sp-cab','padding'))<9,
  px(PUB,'.sp-cab','padding'));

console.log('\n== 5) DATAS EM DD/MM ==');
t('DD/MM sem o ano', APP.soDataCurta('2026-09-11')==='11/09', APP.soDataCurta('2026-09-11'));
t('vazio vira travessao', APP.soDataCurta('')==='—' && APP.soDataCurta(null)==='—');
t('data invalida vira travessao', APP.soDataCurta('nada')==='—');
t('o ano continua onde a data e registro', APP.soData('2026-09-11')==='11/09/2026');
APP.setDemandas([{_id:'x', titulo:'Demanda', solicitante:'Leia', area:'TI', prioridade:1,
  status:'desenvolvimento', entrada:'2026-07-01', prazo:'2026-09-11'}]);
APP.pintarDemandas();
const li=NODES['dm-lista']._html;
t('entrega em DD/MM', /class="dt-txt[^"]*"[\s\S]{0,140}>11\/09</.test(li),
  (li.match(/dt-txt[\s\S]{0,150}/)||[''])[0]);
t('entrada em DD/MM', /<td[^>]*>01\/07<\/td>/.test(li),
  (li.match(/<td[^>]*>[0-9\/]+<\/td>/g)||[]).join(' | '));
t('nenhum ano de 4 digitos na tabela', !/\/2026/.test(li),
  (li.match(/[^"]\/2026/g)||[]).join(' | '));
t('a coluna de entrega encolheu (era 122px)',
  parseFloat(APP.DM_COLS[2])<122, APP.DM_COLS[2]);
t('a coluna de entrada encolheu (era 82px)',
  parseFloat(APP.DM_COLS[5])<82, APP.DM_COLS[5]);
t('a folga foi para a Demanda', APP.DM_COLS[0]==='auto');
t('a pagina publica tambem usa DD/MM', /function soDataCurta/.test(PUB)
  && /soDataCurta\(d\.prazo\)/.test(PUB) && /soDataCurta\(d\.entrada\)/.test(PUB));
t('a pagina publica nao mostra mais o ano na tabela',
  !/soData\(d\.prazo\)/.test(PUB) && !/soData\(d\.entrada\)/.test(PUB));

console.log('\n== 6) O RETRATO PUBLICO ACOMPANHA O NOME ==');
const r=APP._retratoDemandas();
t('retrato leva o nome novo', r.titulo==='Projeto Dev&Co', r.titulo);
t('retrato sem a frase da parceira', !/empresa parceira/.test(r.descricao||''), r.descricao);
t('pagina publica se chama Projeto Dev&Co', /<title>Projeto Dev&amp;Co/.test(PUB));
t('barra da pagina publica tambem', /id="p-tit">Projeto Dev&amp;Co</.test(PUB));

console.log('\n== 7) UMA LINHA POR DEMANDA ==');
// O que quebrava a linha era o "faltam 4d" embaixo da data.
t('a plataforma nao desenha mais a linha de dias', !/dt-obs/.test(li),
  (li.match(/dt-obs[\s\S]{0,60}/)||[''])[0]);
t('a pagina publica tambem nao', !/class=\\"dt-obs/.test(PUB) && !/'<div class="dt-obs/.test(PUB),
  (PUB.match(/dt-obs[^\n]{0,60}/g)||[]).join(' | '));
t('o CSS do dt-obs pode ficar, mas nada o usa na plataforma',
  (SRC.match(/dt-obs/g)||[]).length===0, (SRC.match(/dt-obs[\s\S]{0,40}/g)||[]).join(' | '));
t('a informacao dos dias nao se perdeu: esta no title', /faltam \d+ dias/.test(li),
  (li.match(/title="[^"]*"/g)||[]).join(' | ').slice(0,200));
t('e o panorama segue nos indicadores do topo',
  /estimadas em 7 dias/.test(NODES['dm-stats']._html));

console.log('\n== 8) NADA INVADE A COLUNA VIZINHA ==');
const clip=css=>/th\{[^}]*overflow:hidden[^}]*text-overflow:ellipsis/.test(css)
  || /th\{[^}]*text-overflow:ellipsis[^}]*overflow:hidden/.test(css);
t('cabecalho cortado na plataforma', clip(HTML), (HTML.match(/table\.dm th\{[^}]*\}/)||[''])[0]);
t('cabecalho cortado na pagina publica', clip(PUB), (PUB.match(/table\.dm th\{[^}]*\}/)||[''])[0]);
// o cabecalho da pagina publica e montado juntando strings; remonta o HTML
// antes de ler os rotulos, senao os '+' da concatenacao entram no meio
const cabPub=(PUB.match(/const cabecalho=([\s\S]*?);\n/)||['',''])[1]
  .replace(/'\s*\+\s*'/g,'').replace(/^'|'$/g,'');
const rotPub=(cabPub.match(/<th[^>]*>([\s\S]*?)<\/th>/g)||[]).map(x=>x.replace(/<[^>]*>/g,'').trim());
t('a pagina publica usa os mesmos rotulos curtos',
  rotPub.join('|')==='Demanda|Prio.|Entrega|Status|Quem pediu|Entrada|Área', rotPub.join('|'));
t('o nome inteiro da coluna continua acessivel no title',
  /title="Prioridade"/.test(PUB) && /title="Entrega estimada[^"]*"/.test(PUB));
// as duas tabelas tem de caber na largura minima que declaram
const soma=cols=>cols.slice(1).reduce((a,w)=>a+parseFloat(w),0);
const minP=parseFloat((HTML.match(/table\.dm--fixa\{[^}]*min-width:(\d+)px/)||[])[1]);
const minPub=parseFloat((PUB.match(/table\.dm\{[^}]*min-width:(\d+)px/)||[])[1]);
t('sobra largura para a Demanda na plataforma', minP-soma(APP.DM_COLS)>=200,
  'min '+minP+' - fixas '+soma(APP.DM_COLS));
t('sobra largura para a Demanda na pagina publica',
  minPub-(soma(APP.DM_COLS)-40)>=200, 'min '+minPub);

console.log('\n== 9) A FAIXA OCUPA A LINHA INTEIRA ==');
// O div de FORA nao pode ser .stats: sendo flex, a faixa virava item de
// flex e parava na largura do conteudo, no meio da tela.
t('o invólucro dos indicadores não é flex',
  /<div id="dm-stats"><\/div>/.test(cab) && !/class="stats" id="dm-stats"/.test(cab),
  (cab.match(/<div[^>]*dm-stats[^>]*>/)||[''])[0]);
t('a faixa em si é que tem a classe', /class="stats stats--slim"/.test(NODES['dm-stats']._html));
t('a página pública já era um bloco simples', /<div id="stats"><\/div>/.test(PUB));

console.log('\n== 10) NOME E ÁREA CABEM ==');
t('quem pediu ficou mais largo (era 116px)', parseFloat(APP.DM_COLS[4])>116, APP.DM_COLS[4]);
t('área ficou mais larga (era 100px)', parseFloat(APP.DM_COLS[6])>100, APP.DM_COLS[6]);
t('cabe um nome completo em quem pediu',
  parseFloat(APP.DM_COLS[4])/6.4>'MARIZAN PEREIRA DOURADA'.length,
  'cabem ~'+Math.floor(parseFloat(APP.DM_COLS[4])/6.4)+' caracteres');
t('a folga saiu da Demanda, que segue em auto', APP.DM_COLS[0]==='auto');
t('a Demanda tem o balão para o texto inteiro', /data-desc=/.test(li)||/tem-desc/.test(SRC));
t('as duas telas usam as mesmas larguras',
  (PUB.match(/const DM_COLS=\[([^\]]*)\]/)||['',''])[1].replace(/'/g,'')
    === APP.DM_COLS.slice(0,7).join(','),
  (PUB.match(/const DM_COLS=\[[^\]]*\]/)||[''])[0]);

console.log('\n'+(fail?'FALHAS: '+fail+' | ok: '+ok:'TUDO OK ('+ok+' checagens)'));
process.exit(fail?1:0);
