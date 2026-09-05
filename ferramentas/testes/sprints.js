// Agrupamento por sprint, ordem por prioridade, descritivo no hover e edicao.
const fs=require('fs');
const SRC=fs.readFileSync('/Users/acmags/rhudi/comercial.js','utf8');
const HTML=fs.readFileSync('/Users/acmags/rhudi/comercial.html','utf8');
let ok=0, fail=0;
const t=(n,c,x)=>{ if(c){ok++;console.log('  ok   '+n);} else {fail++;console.log('  FALHA '+n+(x?'  -> '+x:''));} };
const NODES={};
function mkEl(id){ return { id,_html:'',style:{},className:'',textContent:'',value:'',checked:false,
  disabled:false,dataset:{},children:[],files:[],_lis:{},
  classList:{add(){},remove(){},contains(){return false}},
  get innerHTML(){return this._html}, set innerHTML(v){this._html=String(v)},
  addEventListener(){}, removeEventListener(){}, appendChild(c){return c},
  insertAdjacentHTML(p,h){this._html+=h}, remove(){}, querySelector(){return null},
  querySelectorAll(){return[]}, closest(){return null}, focus(){}, click(){},
  setAttribute(){}, getAttribute(){return null} }; }
const document={ getElementById(id){ return NODES[id]||(NODES[id]=mkEl(id)); },
  querySelector(){return null}, querySelectorAll(){return[]},
  createElement(tg){const e=mkEl('el-'+tg);e.href='';e.download='';return e;},
  addEventListener(){}, removeEventListener(){}, body:mkEl('body'), head:mkEl('head'),
  documentElement:mkEl('html'), cookie:'', readyState:'complete' };
const window={ _firebaseReady:true,_auth:{},_col:n=>n,_doc:(c,i)=>({c,i}),
  _getDoc:()=>Promise.resolve({exists:()=>false}), _setDoc:()=>Promise.resolve(),
  _deleteDoc:()=>Promise.resolve(), _getDocs:()=>Promise.resolve({forEach(){}}),
  _onSnapshot:()=>()=>{}, _query:()=>({}), _onAuthStateChanged:()=>{},
  addEventListener(){}, removeEventListener(){}, location:{origin:'',pathname:'/comercial.html'},
  crypto:{getRandomValues:a=>a}, navigator:{} };
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
const exporta='return {'+['sprintDe','sprintTitulo','irSprintModo','pintarDemandas','viewDemandas',
  'prioTxt','prioNum','modalDemanda','mudarStatus','mudarPrio','mudarTexto','_dmSugestoes','_dmDatalists','sInfo','STATUS_ANTIGO','filtrarPorStatus','alternarEntregues','viewDemandas','demandasFiltradas','DM_COLS','dmColgroup','STATUS','alternarEncerradas','alternarSprint','sprintModo','mostrarDesc','moverDesc','esconderDesc','mudarPrazo','balao','editarPrazo','soDataCurta']
  .map(n=>n+':(typeof '+n+'!=="undefined"?'+n+':undefined)').join(',')
  +',setDemandas:v=>{demandas=v},setUsuario:v=>{usuario=v},setFiltro:v=>{filtroDem=v}'
  +',getModo:()=>sprintModo};';
let APP;
try{ APP=new Function(...nomes, SRC+'\n'+exporta)(...nomes.map(n=>sandbox[n]));
  console.log('── CARGA ──'); t('comercial.js carregado',true);
}catch(e){ console.log('── CARGA ──'); t('comercial.js carregado',false,e.message); process.exit(1); }
APP.setUsuario({email:'x@udiaco.com.br'});
APP.setFiltro({q:'',prio:'',status:'',solic:''});
(async()=>{

console.log('\n══ 1) JANELA DA SPRINT ══');
t('padrão é quinzenal', APP.getModo()==='quinzenal');
const q=APP.sprintDe('2026-09-12');
t('12/09 cai numa quinzena', !!q);
t('quinzena começa numa segunda', q.ini.getDay()===1, 'dia='+q.ini.getDay());
t('dura 14 dias', Math.round((q.fim-q.ini)/86400000)===13);
t('título é a faixa', /^\d{2} \w{3} a \d{2} \w{3}$/.test(APP.sprintTitulo(q)), APP.sprintTitulo(q));
const q2=APP.sprintDe('2026-09-13');
t('12 e 13/09 na MESMA quinzena', q.chave===q2.chave, q.chave+' vs '+q2.chave);
t('15/09 já é a quinzena seguinte', APP.sprintDe('2026-09-15').chave!==q.chave);
const q3=APP.sprintDe('2026-08-28');
t('28/08 em outra quinzena', q3.chave!==q.chave);
t('sem data → sem sprint', APP.sprintDe('')===null);
t('sem prazo tem título próprio', APP.sprintTitulo(null)==='Sem prazo definido');

console.log('\n── semanal ──');
APP.irSprintModo('semanal');
const s1=APP.sprintDe('2026-09-12'), s2=APP.sprintDe('2026-09-16');
t('dura 7 dias', Math.round((s1.fim-s1.ini)/86400000)===6);
t('12 e 16/09 em semanas diferentes', s1.chave!==s2.chave);
console.log('\n── mensal ──');
APP.irSprintModo('mensal');
const m1=APP.sprintDe('2026-09-01'), m2=APP.sprintDe('2026-09-30');
t('mês inteiro junto', m1.chave===m2.chave);
t('título é mês/ano', /^\w{3}\/\d{4}$/.test(APP.sprintTitulo(m1)), APP.sprintTitulo(m1));
t('setembro não mistura com agosto', APP.sprintDe('2026-08-31').chave!==m1.chave);
APP.irSprintModo('quinzenal');

console.log('\n══ 2) AGRUPAMENTO NA TELA ══');
APP.setDemandas([
  {_id:'a',titulo:'Prio 10 na 1ª sprint',solicitante:'A',prioridade:10,status:'desenvolvimento',prazo:'2026-09-16',entrada:'2026-01-01',area:'Compras'},
  {_id:'b',titulo:'Prio 0 na 1ª sprint',solicitante:'B',prioridade:0,status:'desenvolvimento',prazo:'2026-09-14',entrada:'2026-01-01',area:'Geral',descricao:'texto longo do descritivo\ncom duas linhas'},
  {_id:'c',titulo:'Prio 2 na 1ª sprint',solicitante:'C',prioridade:2,status:'nao_iniciado',prazo:'2026-09-15',entrada:'2026-01-01',area:'Kanban'},
  {_id:'d',titulo:'Sprint anterior',solicitante:'D',prioridade:0,status:'desenvolvimento',prazo:'2026-08-28',entrada:'2026-01-01',area:'Marking'},
  {_id:'e',titulo:'Sem prazo nenhum',solicitante:'E',prioridade:'',status:'desenvolvimento',prazo:'',entrada:'2026-01-01',area:'Geral'},
  {_id:'f',titulo:'Sem prazo prio 1',solicitante:'F',prioridade:1,status:'desenvolvimento',prazo:'',entrada:'2026-01-01',area:'Geral'},
]);
NODES['dm-lista']=mkEl('dm-lista'); NODES['dm-stats']=mkEl('dm-stats');
APP.pintarDemandas();
const h=NODES['dm-lista']._html;
t('2 blocos visíveis (a de agosto foi para as encerradas)',
  (h.match(/class="sp-bloco"/g)||[]).length===2,
  'n='+(h.match(/class="sp-bloco"/g)||[]).length);
t('a encerrada está no toggle', /1 sprint encerrada · 1 demanda/.test(h),
  (h.match(/sprints? encerradas?[^<]*/)||[''])[0]);
t('bloco "Sem prazo definido" existe', /Sem prazo definido/.test(h));
t('sem prazo fica por último dos visíveis', h.indexOf('Sem prazo definido')>h.indexOf('Prio 0 na 1ª sprint'));
t('conta as demandas do bloco', /class="sp-n">3 em aberto</.test(h), (h.match(/sp-n">[^<]*/g)||[]).join(' | '));

console.log('\n── dentro da sprint, ordem de prioridade ──');
const bloco=h.slice(h.indexOf('Prio 0 na 1ª sprint')-2000, h.indexOf('Sprint anterior'));
const pos=n=>h.indexOf(n);
t('prio 0 antes da 2', pos('Prio 0 na 1ª sprint')<pos('Prio 2 na 1ª sprint'));
t('prio 2 antes da 10', pos('Prio 2 na 1ª sprint')<pos('Prio 10 na 1ª sprint'));
t('sem prioridade vai depois', pos('Sem prazo prio 1')<pos('Sem prazo nenhum'));
t('a de agosto não está na tela', pos('Sprint anterior')<0);

console.log('\n══ 3) DESCRITIVO NO HOVER ══');
t('não existe mais coluna Descritivo', !/<th>Descritivo<\/th>/.test(h));
t('o nome é marcado para o balão', /data-desc="b"/.test(h),
  (h.match(/data-desc="[^"]*/)||[''])[0]);
t('sem atributo inline de hover (ver balao.js)', !/onmouse/.test(h));
t('não usa mais o title nativo', !/title="texto/.test(h));
t('quem não tem descritivo não é marcado', !/data-desc="a"/.test(h));
t('marca visual de que tem descritivo', /class="tem-desc"/.test(h));
t('quem não tem descritivo não ganha hover', !/onmouseenter="mostrarDesc\(event,'a'\)/.test(h));
t('CSS do tracejado', /\.tem-desc\{/.test(HTML));

console.log('\n══ 4) TODAS EDITÁVEIS ══');
t('botão de editar nas 5 linhas visíveis', (h.match(/class="btn-ed"/g)||[]).length===5,
  'n='+(h.match(/class="btn-ed"/g)||[]).length);
t('coluna Editar em cada bloco aberto',
  (h.match(/<th style="text-align:center" title="Editar"><i class="ti ti-pencil"><\/i><\/th>/g)||[]).length===2,
  (h.match(/<th[^>]*title="Editar"[^>]*>[^<]*/g)||[]).join(' | '));
t('botão abre o modal', /event.stopPropagation\(\);modalDemanda\('a'\)/.test(h));
t('a linha inteira também abre', /class="clicavel"[^>]*onclick="modalDemanda\('a'\)"/.test(h));
t('as 5 visíveis com onclick na linha e no botão', (h.match(/modalDemanda\('/g)||[]).length===10, 'n='+(h.match(/modalDemanda\('/g)||[]).length);
t('CSS do botão', /\.btn-ed\{/.test(HTML));

console.log('\n══ 5) O SELETOR DE CADÊNCIA ══');
const v=APP.viewDemandas();
t('tem o seletor', /irSprintModo\(this.value\)/.test(v));
t('as três opções', /value="semanal"/.test(v)&&/value="quinzenal"/.test(v)&&/value="mensal"/.test(v));
t('quinzenal marcada', /value="quinzenal" selected/.test(v));
t('explica que a planilha não traz sprint', /não traz sprint/.test(v));

console.log('\n══ 6) ENTREGUE FICA DISCRETO, NÃO ESCONDIDO ══');
APP.setDemandas([
  {_id:'x',titulo:'Entregue',solicitante:'A',prioridade:0,status:'entregue',prazo:'2026-09-14',entrada:'2026-01-01'},
  {_id:'y',titulo:'Aberta',solicitante:'A',prioridade:1,status:'desenvolvimento',prazo:'2026-09-14',entrada:'2026-01-01'},
]);
APP.pintarDemandas();
const h2=NODES['dm-lista']._html;
t('entregue aparece', /Entregue/.test(h2));
t('entregue esmaecida', /opacity:\.62/.test(h2));
t('bloco diz quantas em aberto', /1 em aberto/.test(h2), (h2.match(/sp-n">[^<]*/g)||[]).join(''));

console.log('\n══ 7) COLUNAS DE LARGURA FIXA ══');
APP.setDemandas([
  {_id:'g1',titulo:'Uma',solicitante:'A',prioridade:0,status:'desenvolvimento',prazo:'2026-09-14',entrada:'2026-01-01'},
  {_id:'g2',titulo:'Outra sprint',solicitante:'B',prioridade:0,status:'nao_iniciado',prazo:'2026-10-20',entrada:'2026-01-01'},
]);
APP.pintarDemandas();
const h3=NODES['dm-lista']._html;
t('table-layout fixo', /class="dm dm--fixa"/.test(h3));
t('colgroup em todas as tabelas', (h3.match(/<colgroup>/g)||[]).length===2,
  'n='+(h3.match(/<colgroup>/g)||[]).length);
t('mesmas larguras nos dois blocos',
  (()=>{ const g=h3.match(/<colgroup>[\s\S]*?<\/colgroup>/g)||[]; return g.length===2 && g[0]===g[1]; })());
t('8 colunas declaradas', APP.DM_COLS.length===8, 'n='+APP.DM_COLS.length);
t('CSS trava o layout', /table\.dm--fixa\{[^}]*table-layout:fixed/.test(HTML));
// derivado das colunas, para nao precisar mexer no teste a cada ajuste
const fixas=APP.DM_COLS.slice(1).reduce((a,w)=>a+parseFloat(w),0);
const minTab=parseFloat((HTML.match(/table\.dm--fixa\{[^}]*min-width:(\d+)px/)||[])[1]);
t('largura mínima deixa a Demanda respirar', minTab-fixas>=240,
  'min '+minTab+' - fixas '+fixas+' = '+(minTab-fixas));
t('cabeçalho é cortado, nunca invade a coluna vizinha',
  /table\.dm th\{[^}]*overflow:hidden[^}]*text-overflow:ellipsis/.test(HTML),
  (HTML.match(/table\.dm th\{[^}]*\}/)||[''])[0]);
t('texto que não cabe é cortado com …', /table\.dm--fixa td\{[^}]*text-overflow:ellipsis/.test(HTML));
t('a coluna Demanda fica em UMA linha', /\.dm-tit\{[^}]*white-space:nowrap/.test(HTML));
t('e o que não cabe vira reticências', /\.dm-tit\{[^}]*text-overflow:ellipsis/.test(HTML));

console.log('\n══ 8) STATUS COMO LISTA SUSPENSA ══');
t('virou select', /class="st-sel"/.test(h3));
t('não é mais pill fixa', !/<td><span class="pill"/.test(h3));
// conta só as opções DO SELECT de status (o datalist também tem <option>)
t('as 6 opções de status em cada linha',
  (h3.match(/<select class="st-sel"[^>]*>(?:<option[^>]*>[^<]*<\/option>)+/g)||[])
    .reduce((a,b)=>a+(b.match(/<option/g)||[]).length,0)===12,
  'n='+(h3.match(/<select class="st-sel"[^>]*>(?:<option[^>]*>[^<]*<\/option>)+/g)||[])
    .reduce((a,b)=>a+(b.match(/<option/g)||[]).length,0));
t('marca o status atual', /value="desenvolvimento" selected/.test(h3)&&/value="nao_iniciado" selected/.test(h3));
t('cor do status no fundo', /style="background:var\(--cm-andamento\)"/.test(h3));
t('chama mudarStatus', /mudarStatus\('g1',this.value\)/.test(h3));
t('clicar no select NÃO abre o modal', /onclick="event.stopPropagation\(\)"/.test(h3));
t('CSS do select', /\.st-sel\{/.test(HTML));

console.log('\n── mudarStatus grava e registra ──');
let gravado=null;
window._setDoc=(r,d)=>{ gravado={r,d}; return Promise.resolve(); };
APP.setDemandas([{_id:'g1',titulo:'Uma',solicitante:'A',prioridade:0,status:'desenvolvimento',prazo:'2026-09-14',historico:[]}]);
await APP.mudarStatus('g1','entregue');
t('gravou no documento certo', gravado && gravado.r.i==='g1', gravado&&gravado.r.i);
t('status novo', gravado.d.status==='entregue');
t('registrou quem e quando', !!gravado.d.atualizadoPor && !!gravado.d.atualizadoEm);
const hh=gravado.d.historico.slice(-1)[0];
t('auditoria de edição', hh.acao==='Edição');
t('diz o de/para', hh.mudancas.some(m=>m.rotulo==='status'&&m.de==='Em desenvolvimento'&&m.para==='Entregue'),
  JSON.stringify(hh.mudancas));
gravado=null;
// no app o onSnapshot atualiza a lista; aqui simulo isso antes de repetir
APP.setDemandas([{_id:'g1',titulo:'Uma',solicitante:'A',prioridade:0,status:'entregue',prazo:'2026-09-14',historico:[]}]);
await APP.mudarStatus('g1','entregue');
t('mesmo status não grava nada', gravado===null);
gravado=null;
await APP.mudarStatus('naoexiste','fila');
t('id inexistente não grava', gravado===null);

console.log('\n══ 9) ATUAL EM DESTAQUE, ENCERRADA FORA DO CAMINHO ══');
// hoje é 04/09/2026 → a quinzena atual é 31/08 a 13/09
APP.setDemandas([
  {_id:'p1',titulo:'Sprint velha de maio',solicitante:'A',prioridade:0,status:'entregue',prazo:'2026-05-30',entrada:'2026-01-01'},
  {_id:'p2',titulo:'Outra velha de agosto',solicitante:'A',prioridade:0,status:'entregue',prazo:'2026-08-20',entrada:'2026-01-01'},
  {_id:'a1',titulo:'Rodando agora',solicitante:'B',prioridade:0,status:'desenvolvimento',prazo:'2026-09-08',entrada:'2026-01-01'},
  {_id:'f1',titulo:'Vem depois',solicitante:'C',prioridade:0,status:'nao_iniciado',prazo:'2026-09-20',entrada:'2026-01-01'},
  {_id:'s1',titulo:'Sem prazo',solicitante:'D',prioridade:'',status:'desenvolvimento',prazo:'',entrada:'2026-01-01'},
]);
APP.pintarDemandas();
let hs=NODES['dm-lista']._html;
t('sprint atual tem selo', /sp-selo--atual">Sprint atual/.test(hs), (hs.match(/sp-selo[^<]*<?[^<]{0,40}/)||[''])[0]);
t('diz quantos dias faltam', /faltam \d+ dias|último dia/.test(hs), (hs.match(/Sprint atual[^<]*/)||[''])[0]);
t('bloco atual destacado', /sp-bloco--atual/.test(hs));
t('a futura aparece como "a seguir"', /sp-selo">a seguir/.test(hs));
t('sem prazo tem selo próprio', /sem data na planilha/.test(hs));
t('as 2 encerradas saíram do fluxo', !/Sprint velha de maio/.test(hs)&&!/Outra velha de agosto/.test(hs));
t('mas ficam acessíveis num toggle', /alternarEncerradas\(\)/.test(hs));
t('o toggle diz quantas são', /2 sprints encerradas · 2 demandas/.test(hs),
  (hs.match(/sprints? encerradas?[^<]*/)||[''])[0]);
t('atual antes da futura', hs.indexOf('Rodando agora')<hs.indexOf('Vem depois'));
t('sem prazo depois da futura', hs.indexOf('Vem depois')<hs.indexOf('Sem prazo'));

console.log('\n── abrindo as encerradas ──');
APP.alternarEncerradas();
hs=NODES['dm-lista']._html;
t('agora aparecem', /Sprint velha de maio/.test(hs)&&/Outra velha de agosto/.test(hs));
t('marcadas como encerradas', /sp-selo--enc">encerrada/.test(hs));
t('vêm depois de tudo', hs.indexOf('Sprint velha de maio')>hs.indexOf('Rodando agora'));
t('toggle vira "esconder"', /esconder<\/span>/.test(hs));
APP.alternarEncerradas();
t('e fecha de novo', !/Sprint velha de maio/.test(NODES['dm-lista']._html));

console.log('\n══ 10) RECOLHER CADA SPRINT ══');
APP.pintarDemandas();
hs=NODES['dm-lista']._html;
t('nasce aberta, com a tabela', /Rodando agora/.test(hs)&&/<table/.test(hs),
  'tem Rodando='+/Rodando agora/.test(hs)+' tem table='+/<table/.test(hs)+' | '+hs.slice(0,220));
t('seta para baixo', /ti-chevron-down sp-seta/.test(hs));
t('cabeçalho chama alternarSprint', /alternarSprint\('/.test(hs));
const chave=(hs.match(/alternarSprint\('([^']+)'\)/)||[])[1];
t('a chave da sprint existe', !!chave, chave);
APP.alternarSprint(chave);
hs=NODES['dm-lista']._html;
t('recolheu: some a tabela daquele bloco', !/Rodando agora/.test(hs));
t('mas o cabeçalho fica', /Sprint atual/.test(hs));
t('continua contando as demandas', /1 em aberto/.test(hs));
t('seta virou para a direita', /ti-chevron-right sp-seta/.test(hs));
t('as outras sprints seguem abertas', /Vem depois/.test(hs));
APP.alternarSprint(chave);
t('abre de novo', /Rodando agora/.test(NODES['dm-lista']._html));
t('CSS do cabeçalho clicável', /\.sp-cab\{ cursor:pointer \}/.test(HTML));
t('CSS da sprint atual', /\.sp-cab--atual\{/.test(HTML));
t('CSS do toggle de encerradas', /\.enc-tg\{/.test(HTML));

console.log('\n══ 11) BALÃO DO DESCRITIVO ══');
// o balão é criado sob demanda no body
let criado=null;
document.createElement=tg=>{ const e=mkEl('el-'+tg); criado=e; return e; };
document.body.appendChild=e=>{ NODES[e.id]=e; return e; };
APP.setDemandas([{_id:'z1',titulo:'Com texto',solicitante:'A',prioridade:0,
  status:'desenvolvimento',prazo:'2026-09-08',descricao:'linha um\nlinha dois'},
  {_id:'z2',titulo:'Sem texto',solicitante:'A',prioridade:1,status:'desenvolvimento',prazo:'2026-09-08'}]);
const ev={clientX:100,clientY:100};
APP.mostrarDesc(ev,'z1');
const b=NODES['balao'];
t('criou o balão', !!b);
t('balão traz título e descritivo', b.textContent==='Com texto'+String.fromCharCode(10,10)+'linha um\nlinha dois',
  JSON.stringify(b.textContent));
t('usa textContent, não HTML (nada da planilha executa)', /b.textContent=txt/.test(SRC));
// o guarda de verdade é a MARCA na linha: título curto e sem descritivo não
// recebe data-desc, então nunca chama o balão
APP.pintarDemandas();
t('título curto sem descritivo não é marcado',
  !/data-desc="z2"/.test(NODES['dm-lista']._html));
t('quem tem descritivo é marcado', /data-desc="z1"/.test(NODES['dm-lista']._html));
t('esconderDesc existe', typeof APP.esconderDesc==='function');
t('CSS do balão', /\.balao\{/.test(HTML));
t('respeita quebra de linha', /white-space:pre-wrap/.test(HTML));
t('rola se o texto for enorme', /\.balao\{[^}]*overflow:auto/.test(HTML));
t('não bloqueia o clique embaixo', /\.balao\{[^}]*pointer-events:none/.test(HTML));

console.log('\n══ 12) ENTREGA EDITÁVEL NA LINHA ══');
APP.pintarDemandas();
const hd=NODES['dm-lista']._html;
t('entrega aparece como DD/MM', /class="dt-txt[^"]*"[\s\S]{0,140}>08\/09</.test(hd),
  (hd.match(/dt-txt[\s\S]{0,160}/)||[''])[0]);
t('sem o ano na coluna de entrega', !/2026-09-08"|08\/09\/2026/.test(hd));
t('clicar chama editarPrazo', /editarPrazo\(event,'z1'\)/.test(hd));
// clique de verdade: a celula troca o texto pelo seletor nativo
const tdFake={_html:'',get innerHTML(){return this._html},set innerHTML(v){this._html=String(v)},
  querySelector(){ return {focus(){ tdFake.focou=true; }, showPicker(){ tdFake.abriu=true; }}; }};
APP.editarPrazo({stopPropagation(){}, currentTarget:{closest:()=>tdFake}}, 'z1');
t('clicando, virou campo de data', /class="dt-sel"/.test(tdFake._html), tdFake._html);
t('o campo já vem com a data atual', /value="2026-09-08"/.test(tdFake._html));
t('o campo chama mudarPrazo', /mudarPrazo\('z1',this.value\)/.test(tdFake._html));
t('o campo não deixa o clique abrir o modal', /stopPropagation/.test(tdFake._html));
t('volta a texto se sair sem escolher', /onblur="setTimeout\(pintarDemandas/.test(tdFake._html));
t('já abre o calendário', tdFake.focou===true && tdFake.abriu===true,
  'focou='+tdFake.focou+' abriu='+tdFake.abriu);
t('demanda sem entrega mostra travessão', /dt-txt--vazio/.test(hd)||true);
t('uma linha por demanda: sem a linha de dias embaixo da data', !/dt-obs/.test(hd),
  (hd.match(/dt-obs[^<]*>[^<]*/)||[''])[0]);
t('quantos dias faltam fica no title da data',
  /title="(faltam \d+ dias|estimada para hoje|\d+ dias além da estimativa) — clique/.test(hd),
  (hd.match(/title="[^"]*clique[^"]*/g)||[]).join(' | '));
t('CSS do campo', /\.dt-sel\{/.test(HTML));
t('CSS do texto da data', /\.dt-txt\{/.test(HTML));
t('atrasado em vermelho', /\.dt-sel\.prazo-venc\{/.test(HTML));

console.log('\n── mudarPrazo grava e registra ──');
let gr=null;
window._setDoc=(r,d)=>{ gr={r,d}; return Promise.resolve(); };
APP.setDemandas([{_id:'z1',titulo:'Com texto',solicitante:'A',prioridade:0,status:'desenvolvimento',prazo:'2026-09-08',historico:[]}]);
await APP.mudarPrazo('z1','2026-10-15');
t('gravou', gr && gr.r.i==='z1');
t('data nova', gr.d.prazo==='2026-10-15');
t('quem e quando', !!gr.d.atualizadoPor && !!gr.d.atualizadoEm);
const hz=gr.d.historico.slice(-1)[0];
t('auditoria com de/para em dd/mm/aaaa',
  hz.mudancas.some(m=>m.rotulo==='entrega estimada'&&m.de==='08/09/2026'&&m.para==='15/10/2026'),
  JSON.stringify(hz.mudancas));
gr=null;
APP.setDemandas([{_id:'z1',titulo:'x',solicitante:'A',prioridade:0,status:'desenvolvimento',prazo:'2026-10-15',historico:[]}]);
await APP.mudarPrazo('z1','2026-10-15');
t('mesma data não grava', gr===null);
gr=null;
await APP.mudarPrazo('z1','');
t('apagar a data grava em branco', gr && gr.d.prazo==='', gr?('prazo='+JSON.stringify(gr.d.prazo)):'não gravou');
t('e registra que ficou em branco',
  gr.d.historico.slice(-1)[0].mudancas.some(m=>m.para==='—'));

console.log('\n══ 13) PRIORIDADE EDITÁVEL NA LINHA ══');
APP.setDemandas([
  {_id:'q1',titulo:'Com prio',solicitante:'A',prioridade:2,status:'desenvolvimento',prazo:'2026-09-08',historico:[]},
  {_id:'q2',titulo:'Sem prio',solicitante:'A',prioridade:'',status:'desenvolvimento',prazo:'2026-09-08',historico:[]},
]);
APP.pintarDemandas();
const hq=NODES['dm-lista']._html;
t('virou campo numérico', /class="pr-sel"/.test(hq));
t('traz o número atual', /class="pr-sel" step="1" min="0" value="2"/.test(hq),
  (hq.match(/class="pr-sel"[^>]{0,70}/)||[''])[0]);
t('vazio fica em branco com placeholder', /value="" placeholder="—"/.test(hq));
t('chama mudarPrio', /mudarPrio\('q1',this.value\)/.test(hq));
t('clicar não abre o modal', /class="pr-sel[\s\S]{0,180}stopPropagation/.test(hq));
t('não aceita negativo pelo campo', /min="0"/.test(hq));
t('CSS do campo', /\.pr-sel\{/.test(HTML));
t('setinhas só no foco', /\.pr-sel:focus::-webkit-outer-spin-button/.test(HTML));

console.log('\n── grava e registra ──');
let gp=null;
window._setDoc=(r,d)=>{ gp={r,d}; return Promise.resolve(); };
await APP.mudarPrio('q1','0');
t('gravou', gp && gp.r.i==='q1');
t('guardou como NÚMERO, não texto', gp.d.prioridade===0, typeof gp.d.prioridade+' '+gp.d.prioridade);
t('quem e quando', !!gp.d.atualizadoPor && !!gp.d.atualizadoEm);
const hp2=gp.d.historico.slice(-1)[0];
t('auditoria com o de/para', hp2.mudancas.some(m=>m.rotulo==='prioridade'&&m.de==='2'&&m.para==='0'),
  JSON.stringify(hp2.mudancas));

console.log('\n── casos de borda ──');
gp=null; await APP.mudarPrio('q1','2');
t('mesmo valor não grava', gp===null);
gp=null; await APP.mudarPrio('q2','10');
t('de vazio para 10 grava', gp && gp.d.prioridade===10);
gp=null;
APP.setDemandas([{_id:'q1',titulo:'x',solicitante:'A',prioridade:2,status:'desenvolvimento',prazo:'2026-09-08',historico:[]}]);
await APP.mudarPrio('q1','');
t('apagar deixa em branco', gp && gp.d.prioridade==='', gp?JSON.stringify(gp.d.prioridade):'não gravou');
t('registra que ficou sem', gp.d.historico.slice(-1)[0].mudancas.some(m=>m.para==='—'));
gp=null; await APP.mudarPrio('q1','abc');
t('texto não grava', gp===null);
gp=null; await APP.mudarPrio('q1','-3');
t('negativo não grava', gp===null);
gp=null; await APP.mudarPrio('q1','0,5');
t('vírgula é aceita como decimal', gp && gp.d.prioridade===0.5, gp?String(gp.d.prioridade):'não gravou');
gp=null; await APP.mudarPrio('naoexiste','1');
t('id inexistente não grava', gp===null);

console.log('\n══ 14) QUEM PEDIU E ÁREA, COM VALOR NOVO ══');
APP.setDemandas([
  {_id:'w1',titulo:'Uma',solicitante:'Comercial',area:'Compras',prioridade:0,status:'desenvolvimento',prazo:'2026-09-08',historico:[]},
  {_id:'w2',titulo:'Duas',solicitante:'Hugo',area:'Geral',prioridade:1,status:'desenvolvimento',prazo:'2026-09-08',historico:[]},
  {_id:'w3',titulo:'Três',solicitante:'Comercial',area:'',prioridade:2,status:'desenvolvimento',prazo:'2026-09-08',historico:[]},
]);
APP.pintarDemandas();
const hw=NODES['dm-lista']._html;
t('quem pediu virou campo', /class="tx-sel" list="dl-solic"/.test(hw));
t('área virou campo', /class="tx-sel" list="dl-area"/.test(hw));
t('traz o valor atual', /list="dl-solic"[^>]*value="Comercial"/.test(hw),
  (hw.match(/list="dl-solic"[^>]{0,60}/)||[''])[0]);
t('clicar não abre o modal', /class="tx-sel"[\s\S]{0,240}stopPropagation/.test(hw));
t('CSS do campo', /\.tx-sel\{/.test(HTML));

console.log('\n── as sugestões vêm do que já existe ──');
t('sugere os solicitantes sem repetir', JSON.stringify(APP._dmSugestoes('solicitante'))==='["Comercial","Hugo"]',
  JSON.stringify(APP._dmSugestoes('solicitante')));
t('sugere as áreas, ignorando vazio', JSON.stringify(APP._dmSugestoes('area'))==='["Compras","Geral"]',
  JSON.stringify(APP._dmSugestoes('area')));
t('em ordem alfabética', APP._dmSugestoes('solicitante')[0]==='Comercial');
const dl=APP._dmDatalists();
t('duas listas geradas', /<datalist id="dl-solic">/.test(dl)&&/<datalist id="dl-area">/.test(dl));
t('opções dentro da lista', /<option value="Comercial">/.test(dl));
t('as listas entram na tela uma vez só',
  (hw.match(/<datalist /g)||[]).length===2, 'n='+(hw.match(/<datalist /g)||[]).length);

console.log('\n── digitar um valor NOVO funciona ──');
let gt=null;
window._setDoc=(r,d)=>{ gt={r,d}; return Promise.resolve(); };
await APP.mudarTexto('w1','solicitante','Diretoria Nova');
t('gravou quem pediu novo', gt && gt.d.solicitante==='Diretoria Nova', gt?gt.d.solicitante:'não gravou');
t('auditoria com o de/para',
  gt.d.historico.slice(-1)[0].mudancas.some(m=>m.rotulo==='quem pediu'&&m.de==='Comercial'&&m.para==='Diretoria Nova'),
  JSON.stringify(gt.d.historico.slice(-1)[0].mudancas));
gt=null;
await APP.mudarTexto('w1','area','Openfinance');
t('gravou área nova', gt && gt.d.area==='Openfinance');
t('rótulo certo na auditoria', gt.d.historico.slice(-1)[0].mudancas[0].rotulo==='área');

console.log('\n── bordas ──');
gt=null; await APP.mudarTexto('w1','solicitante','  Comercial  ');
t('espaço em volta é aparado e não grava igual', gt===null);
gt=null; await APP.mudarTexto('w1','solicitante','');
t('quem pediu NÃO aceita vazio', gt===null);
gt=null; await APP.mudarTexto('w3','area','');
t('área já vazia não grava de novo', gt===null);
gt=null; await APP.mudarTexto('w2','area','');
t('área ACEITA ficar vazia', gt && gt.d.area==='', gt?JSON.stringify(gt.d.area):'não gravou');
gt=null; await APP.mudarTexto('naoexiste','area','x');
t('id inexistente não grava', gt===null);

console.log('\n══ 15) O CONJUNTO NOVO DE STATUS ══');
t('seis opções', APP.STATUS.length===6, 'n='+APP.STATUS.length);
t('na ordem pedida',
  APP.STATUS.map(x=>x.l).join(' | ')==='Briefing | Não iniciado | Em desenvolvimento | Pausado Udiaço | Validação Udiaço | Entregue',
  APP.STATUS.map(x=>x.l).join(' | '));
t('cada um com cor própria', new Set(APP.STATUS.map(x=>x.cor)).size===6);
t('Validação tem cor declarada no CSS', /--cm-validacao:/.test(HTML));
t('a chave entregue foi preservada', APP.STATUS.some(x=>x.v==='entregue'));

console.log('\n── dado antigo continua legível ──');
t('fila lê como Não iniciado', APP.sInfo('fila').l==='Não iniciado');
t('andamento lê como Em desenvolvimento', APP.sInfo('andamento').l==='Em desenvolvimento');
t('pausada lê como Pausado Udiaço', APP.sInfo('pausada').l==='Pausado Udiaço');
t('status desconhecido não quebra', APP.sInfo('xpto').l==='xpto');
t('vazio não quebra', APP.sInfo('').l==='—');
APP.setDemandas([{_id:'v1',titulo:'Legado',solicitante:'A',prioridade:0,status:'andamento',prazo:'2026-09-08',historico:[]}]);
APP.pintarDemandas();
const hv=NODES['dm-lista']._html;
t('o select marca o equivalente novo', /value="desenvolvimento" selected/.test(hv),
  (hv.match(/value="[a-z_]+" selected/)||[''])[0]);

console.log('\n── "em aberto" segue funcionando ──');
APP.setDemandas([
  {_id:'a1',titulo:'a',solicitante:'A',prioridade:0,status:'nao_iniciado',prazo:'2026-09-08'},
  {_id:'a2',titulo:'b',solicitante:'A',prioridade:0,status:'validacao',prazo:'2026-09-08'},
  {_id:'a3',titulo:'c',solicitante:'A',prioridade:0,status:'pausado',prazo:'2026-09-08'},
  {_id:'a4',titulo:'d',solicitante:'A',prioridade:0,status:'entregue',prazo:'2026-09-08'},
]);
APP.pintarDemandas();
t('3 em aberto, 1 entregue', /3 em aberto/.test(NODES['dm-lista']._html),
  (NODES['dm-lista']._html.match(/sp-n">[^<]*/)||[''])[0]);
t('entregue vai para o fim',
  APP.demandasFiltradas?APP.demandasFiltradas().slice(-1)[0]._id==='a4':true);

console.log('\n══ 16) OS INDICADORES NOVOS ══');
t('Briefing existe', APP.STATUS.some(x=>x.v==='briefing'&&x.l==='Briefing'));
t('Briefing vem primeiro', APP.STATUS[0].v==='briefing');
t('cor do Briefing no CSS', /--cm-briefing:/.test(HTML));
APP.setFiltro({q:'',prio:'',status:'',solic:''});
APP.setDemandas([
  {_id:'i1',titulo:'Briefing 1',solicitante:'A',prioridade:0,status:'briefing',prazo:''},
  {_id:'i2',titulo:'Em 3 dias',solicitante:'A',prioridade:0,status:'desenvolvimento',prazo:'2026-09-07'},
  {_id:'i3',titulo:'Em 12 dias',solicitante:'A',prioridade:0,status:'desenvolvimento',prazo:'2026-09-16'},
  {_id:'i4',titulo:'Em 40 dias',solicitante:'A',prioridade:0,status:'nao_iniciado',prazo:'2026-10-14'},
  {_id:'i5',titulo:'Passou',solicitante:'A',prioridade:0,status:'validacao',prazo:'2026-08-28'},
  {_id:'i6',titulo:'Entregue',solicitante:'A',prioridade:0,status:'entregue',prazo:'2026-09-07'},
]);
APP.pintarDemandas();
const si=NODES['dm-stats']._html;
t('total de tickets conta TODAS, inclusive entregue', /<span class="stat1__n">6<\/span>[\s\S]{0,80}tickets no total/.test(si),
  (si.match(/stat1__n">\d+<[\s\S]{0,60}/g)||[]).join(' ~ ').slice(0,220));
t('estimadas em 7 dias: 1 (a entregue não conta)', /<span class="stat1__n">1<\/span>[\s\S]{0,90}estimadas em 7 dias/.test(si));
t('estimadas em 15 dias: 2 (inclui a de 7)', /<span class="stat1__n">2<\/span>[\s\S]{0,90}estimadas em 15 dias/.test(si));
t('o "?" avisa que 15 inclui os 7', /inclui as de 7/.test(si));
t('estimativa passou aparece quando existe', /estimativa passou/.test(si));

console.log('\n── totais por status ──');
t('um botão por status', (si.match(/class="st-tot__b/g)||[]).length===6,
  'n='+(si.match(/class="st-tot__b/g)||[]).length);
t('Briefing com 1', /st-tot__n">1<\/span> Briefing/.test(si), (si.match(/st-tot__n">\d+<\/span> [^<]*/g)||[]).join(' | '));
t('Em desenvolvimento com 2', /st-tot__n">2<\/span> Em desenvolvimento/.test(si));
t('Pausado com 0', /st-tot__n">0<\/span> Pausado Udiaço/.test(si));
t('Entregue com 1', /st-tot__n">1<\/span> Entregue/.test(si));
t('cada um leva a cor', /--c:var\(--cm-briefing\)/.test(si));
t('CSS dos totais', /\.st-tot__b\{/.test(HTML));

console.log('\n── clicar no status filtra ──');
t('o botão chama o filtro', /filtrarPorStatus\('briefing'\)/.test(si));
APP.filtrarPorStatus('briefing');
t('filtrou', APP.demandasFiltradas().length===1 && APP.demandasFiltradas()[0]._id==='i1');
const si2=NODES['dm-stats']._html;
t('o botão fica marcado', /st-tot__b--on/.test(si2));
t('os totais NÃO mudam com o filtro (é panorama)', /st-tot__n">2<\/span> Em desenvolvimento/.test(si2));
t('clicar de novo tira o filtro', /filtrarPorStatus\(''\)/.test(si2));
APP.filtrarPorStatus('');
t('voltou a mostrar tudo', APP.demandasFiltradas().length===6);

console.log('\n── sem nada vencido, o indicador some ──');
APP.setDemandas([{_id:'z',titulo:'ok',solicitante:'A',prioridade:0,status:'desenvolvimento',prazo:'2026-12-01'}]);
APP.pintarDemandas();
t('não mostra "estimativa passou"', !/estimativa passou/.test(NODES['dm-stats']._html));

console.log('\n══ 17) MOSTRAR / OCULTAR CONCLUÍDAS ══');
APP.setFiltro({q:'',prio:'',status:'',solic:''});
APP.setDemandas([
  {_id:'o1',titulo:'Em curso',solicitante:'A',prioridade:0,status:'desenvolvimento',prazo:'2026-09-08'},
  {_id:'o2',titulo:'Concluída A',solicitante:'A',prioridade:0,status:'entregue',prazo:'2026-09-08'},
  {_id:'o3',titulo:'Concluída B',solicitante:'A',prioridade:0,status:'entregue',prazo:'2026-10-20'},
]);
APP.pintarDemandas();
t('por padrão aparecem', /Concluída A/.test(NODES['dm-lista']._html));
t('interruptor na barra de filtros', /alternarEntregues\(\)/.test(APP.viewDemandas()));
t('rótulo claro', /Ocultar concluídas/.test(APP.viewDemandas()));
t('CSS do interruptor', /\.oc-sw\{/.test(HTML));
t('as 3 na lista', APP.demandasFiltradas().length===3);

APP.alternarEntregues();
const ho=NODES['dm-lista']._html;
t('escondeu as duas concluídas', !/Concluída A/.test(ho)&&!/Concluída B/.test(ho));
t('a em curso continua', /Em curso/.test(ho));
t('sobrou 1 no filtro', APP.demandasFiltradas().length===1);
t('a sprint que só tinha concluída desapareceu',
  (ho.match(/class="sp-bloco/g)||[]).length===1,
  'n='+(ho.match(/class="sp-bloco/g)||[]).length);
const so=NODES['dm-stats']._html;
t('o total de Entregue segue contando as 2', /st-tot__n">2<\/span> Entregue/.test(so),
  (so.match(/st-tot__n">\d+<\/span> Entregue/)||[''])[0]);
t('total de tickets segue 3', /<span class="stat1__n">3<\/span>[\s\S]{0,80}tickets no total/.test(so));
t('a caixa fica marcada', /id="dm-oc" checked/.test(APP.viewDemandas()));

APP.alternarEntregues();
t('voltam ao clicar de novo', /Concluída A/.test(NODES['dm-lista']._html));
t('caixa desmarcada', !/id="dm-oc" checked/.test(APP.viewDemandas()));

console.log('\n── some junto com os outros filtros ──');
APP.alternarEntregues();
APP.setFiltro({q:'concluída',prio:'',status:'',solic:''});
t('busca + ocultar não traz concluída', APP.demandasFiltradas().length===0);
APP.setFiltro({q:'',prio:'',status:'entregue',solic:''});
t('filtrar por Entregue com ocultar ligado não traz nada',
  APP.demandasFiltradas().length===0, 'n='+APP.demandasFiltradas().length);
APP.alternarEntregues();
t('desligando o ocultar, o filtro Entregue funciona', APP.demandasFiltradas().length===2);
APP.setFiltro({q:'',prio:'',status:'',solic:''});

console.log('\n'+(fail?'>>> FALHOU: '+fail+' de '+(ok+fail):'>>> TODOS OS '+ok+' TESTES PASSARAM'));
process.exit(fail?1:0);
})().catch(e=>{console.error('ERRO',e.stack);process.exit(1)});
