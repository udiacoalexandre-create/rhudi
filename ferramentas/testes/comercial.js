// App Comercial: paineis de BI (upload + leitura) e demandas de tecnologia.
const fs=require('fs');
const SRC=fs.readFileSync('/Users/acmags/rhudi/comercial.js','utf8');
const HTML=fs.readFileSync('/Users/acmags/rhudi/comercial.html','utf8');
const APPJS=fs.readFileSync('/Users/acmags/rhudi/app.js','utf8');
const RULES=fs.readFileSync('/Users/acmags/rhudi/firestore.rules','utf8');
let ok=0, fail=0;
const t=(n,c,x)=>{ if(c){ok++;console.log('  ok   '+n);} else {fail++;console.log('  FALHA '+n+(x?'  -> '+x:''));} };

// ── DOM ───────────────────────────────────────────────────────
const NODES={};
function mkEl(id){ const el={ id,_html:'',style:{},className:'',textContent:'',value:'',checked:false,
  disabled:false,dataset:{},children:[],files:[],onclick:null,onchange:null,_lis:{},
  classList:{_s:new Set(),add(...c){c.forEach(x=>this._s.add(x))},remove(...c){c.forEach(x=>this._s.delete(x))},
    contains(c){return this._s.has(c)}},
  get innerHTML(){return this._html}, set innerHTML(v){this._html=String(v)},
  addEventListener(e,f){(this._lis[e]=this._lis[e]||[]).push(f)},
  removeEventListener(){}, appendChild(c){this.children.push(c);return c},
  insertAdjacentHTML(p,h){this._html+=h}, remove(){delete NODES[this.id]},
  querySelector(sel){ return NODES['__iframe']||null }, querySelectorAll(){return[]},
  closest(){return null}, focus(){}, click(){ if(this.onclick) this.onclick(); },
  setAttribute(){}, getAttribute(){return null} };
  return el; }
const document={
  getElementById(id){ return NODES[id]||(NODES[id]=mkEl(id)); },
  querySelector(){return null}, querySelectorAll(){return[]},
  createElement(tg){ const e=mkEl('el-'+tg); e.href=''; e.download=''; return e; },
  addEventListener(){}, removeEventListener(){},
  body:mkEl('body'), head:mkEl('head'), documentElement:mkEl('html'), cookie:'', readyState:'complete' };

// ── Firestore simulado ────────────────────────────────────────
const DB={};   // colecao -> id -> dados
const snapDe=(col,id)=>({exists:()=>!!(DB[col]&&DB[col][id]), data:()=>DB[col]&&DB[col][id]});
const LISTEN={};
function emitir(col){
  (LISTEN[col]||[]).forEach(cb=>cb({forEach:f=>Object.keys(DB[col]||{}).forEach(id=>
    f({id, data:()=>DB[col][id]}))}));
}
let AUTHCB=null;
const window={
  _firebaseReady:true,
  _auth:{}, _col:n=>n, _doc:(c,i)=>({c,i}),
  _getDoc:ref=>Promise.resolve(snapDe(ref.c,ref.i)),
  _getDocs:()=>Promise.resolve({forEach(){}}),
  _setDoc:(ref,d)=>{ (DB[ref.c]=DB[ref.c]||{})[ref.i]=JSON.parse(JSON.stringify(d));
    emitir(ref.c); return Promise.resolve(); },
  _addDoc:()=>Promise.resolve({id:'x'}),
  _updateDoc:(ref,d)=>{ Object.assign(DB[ref.c][ref.i],d); emitir(ref.c); return Promise.resolve(); },
  _deleteDoc:ref=>{ if(DB[ref.c]) delete DB[ref.c][ref.i]; emitir(ref.c); return Promise.resolve(); },
  _onSnapshot:(col,cb)=>{ (LISTEN[col]=LISTEN[col]||[]).push(cb);
    setTimeout(()=>cb({forEach:f=>Object.keys(DB[col]||{}).forEach(id=>f({id,data:()=>DB[col][id]}))}),0);
    return ()=>{}; },
  _query:()=>({}), _where:()=>({}), _orderBy:()=>({}), _batch:()=>({set(){},commit(){return Promise.resolve()}}),
  _signIn:()=>Promise.resolve(), _resetSenha:()=>Promise.resolve(), _signOut:()=>Promise.resolve(),
  _onAuthStateChanged:(a,cb)=>{ AUTHCB=cb; },
  addEventListener(){}, removeEventListener(){}, location:{href:''},
};
window.window=window;
const zlib=require('zlib');
// CompressionStream/DecompressionStream do node 24 existem; se nao, cai no zlib
const temCS=typeof CompressionStream==='function';
const sandbox={ window, document,
  setTimeout:(f,ms)=>{ if(ms===0||ms===undefined) f(); return 0; },
  clearTimeout:()=>{}, setInterval:()=>0, clearInterval:()=>{},
  console, alert:()=>{}, confirm:()=>true, prompt:()=>null,
  CompressionStream: temCS?CompressionStream:undefined,
  DecompressionStream: temCS?DecompressionStream:undefined,
  Response: typeof Response==='function'?Response:undefined,
  TextEncoder, TextDecoder,
  btoa:s=>Buffer.from(s,'binary').toString('base64'),
  atob:s=>Buffer.from(s,'base64').toString('binary'),
  escape, unescape, encodeURIComponent, decodeURIComponent,
  Blob:function(p,o){ this.parts=p; this.type=o&&o.type; },
  URL:{createObjectURL:()=>'blob:x', revokeObjectURL(){}},
  Intl,Date,Math,JSON,Object,Array,String,Number,Boolean,RegExp,Error,Promise,Set,Map,
  isNaN,parseInt,parseFloat,Uint8Array,ArrayBuffer };
const nomes=Object.keys(sandbox);
const exporta='return {'+['temComercial','carregarUsuario','comprimir','descomprimir','picar',
  'bytesParaB64','b64ParaBytes','tamanho','soData','diasAte','dataHora','diffDem','logDem','histHTML',
  'viewPaineis','viewDemandas','modalPainel','salvarPainel','abrirPainel','excluirPainel',
  'modalDemanda','salvarDemanda','excluirDemanda','demandasFiltradas','pintarDemandas',
  'exportarDemandas','filtrarDem','render','irAba','fecharMod','assinarDados','STATUS',
  'prioTxt','prioNum','sprintDe','sprintTitulo','irSprintModo','alternarEncerradas','CHUNK','LIMITE_MB']
  .map(n=>n+':(typeof '+n+'!=="undefined"?'+n+':undefined)').join(',')
  +',setUsuario:v=>{usuario=v},getUsuario:()=>usuario'
  +',setPaineis:v=>{paineis=v},getPaineis:()=>paineis'
  +',setDemandas:v=>{demandas=v},getDemandas:()=>demandas'
  +',setAba:v=>{aba=v},setFiltro:v=>{filtroDem=v}};';
let APP;
try{ APP=new Function(...nomes, SRC+'\n'+exporta)(...nomes.map(n=>sandbox[n]));
  console.log('── CARGA ──'); t('comercial.js carregado', true);
}catch(e){ console.log('── CARGA ──'); t('comercial.js carregado', false, e.message); process.exit(1); }

(async()=>{
console.log('\n══ 1) ACESSO ══');
t('Master entra', APP.temComercial({papel:'master',ativo:true})===true);
t('marcado entra', APP.temComercial({papel:'corporativo',ativo:true,plataformas:{comercial:true}})===true);
t('sem marcação NÃO entra', APP.temComercial({papel:'corporativo',ativo:true,plataformas:{}})===false);
t('nasce fechada (sem plataformas)', APP.temComercial({papel:'corporativo',ativo:true})===false);
t('inativo não entra', APP.temComercial({papel:'master',ativo:false})===false);
t('UM989 não entra', APP.temComercial({papel:'um989',ativo:true,plataformas:{comercial:true}})===false);
t('outra plataforma não serve', APP.temComercial({papel:'corporativo',ativo:true,plataformas:{projetos:true}})===false);
DB.usuarios={'ana@udiaco.com.br':{nome:'Ana',papel:'corporativo',ativo:true,plataformas:{comercial:true}},
             'zé@udiaco.com.br':{nome:'Zé',papel:'corporativo',ativo:true,plataformas:{}}};
t('carregarUsuario libera quem tem', await APP.carregarUsuario('ana@udiaco.com.br')==='ok');
t('carregarUsuario barra quem não tem', await APP.carregarUsuario('zé@udiaco.com.br')==='sem-plataforma');
t('e-mail desconhecido barrado', await APP.carregarUsuario('ninguem@x.com')==='sem-acesso');
APP.setUsuario({email:'ana@udiaco.com.br',nome:'Ana',papel:'corporativo'});

console.log('\n══ 2) COMPRESSÃO E PEDAÇOS ══');
const html='<html><body>'+'<div>painel de teste</div>'.repeat(4000)+'</body></html>';
const {b64,gzip}=await APP.comprimir(html);
t('comprimiu com gzip', gzip===true);
t('ficou bem menor', b64.length < html.length/5, 'orig='+html.length+' b64='+b64.length);
const volta=await APP.descomprimir(b64,gzip);
t('descomprime idêntico', volta===html, 'tam volta='+volta.length);
const ped=APP.picar(b64);
t('pedaços dentro do limite', ped.every(p=>p.length<=APP.CHUNK));
t('juntando dá o original', ped.join('')===b64);
const grande='x'.repeat(APP.CHUNK*2+10);
t('divide corretamente', APP.picar(grande).length===3, 'n='+APP.picar(grande).length);
t('base64 de arquivo grande não estoura a pilha',
  APP.bytesParaB64(new Uint8Array(300000)).length>0);
t('ida e volta de bytes', APP.b64ParaBytes(APP.bytesParaB64(new Uint8Array([1,2,250])))[2]===250);

console.log('\n══ 3) SUBIR UM PAINEL ══');
APP.setAba('paineis');
NODES['pn-tit']=mkEl('pn-tit'); NODES['pn-tit'].value='Funil de vendas';
NODES['pn-desc']=mkEl('pn-desc'); NODES['pn-desc'].value='Teste com dados fictícios';
NODES['pn-file']=mkEl('pn-file');
NODES['pn-file'].files=[{name:'funil.html', size:html.length, text:()=>Promise.resolve(html)}];
NODES['pn-ok']=mkEl('pn-ok'); NODES['pn-prog']=mkEl('pn-prog'); NODES['camada']=mkEl('camada');
await APP.salvarPainel('','');
const ids=Object.keys(DB[ 'cm_paineis' ]||{});
t('gravou o painel', ids.length===1, 'n='+ids.length);
const meta=DB['cm_paineis'][ids[0]];
t('título gravado', meta.titulo==='Funil de vendas');
t('descrição gravada', meta.descricao==='Teste com dados fictícios');
t('guardou o nome do arquivo', meta.arquivo==='funil.html');
t('guardou o tamanho original', meta.bytes===html.length);
t('marcou gzip', meta.gzip===true);
t('registrou quantos pedaços', meta.chunks>=1);
t('quem subiu', meta.criadoPor==='ana@udiaco.com.br');
t('histórico de inclusão', (meta.historico||[]).some(h=>h.acao==='Inclusão'));
t('pedaços gravados na coleção separada',
  Object.keys(DB['cm_painel_dados']||{}).length===meta.chunks,
  'n='+Object.keys(DB['cm_painel_dados']||{}).length);
t('metadado é leve (a lista não puxa o HTML)',
  JSON.stringify(meta).length < 2000, 'tam='+JSON.stringify(meta).length);

console.log('\n── e o painel abre de volta ──');
APP.setPaineis([Object.assign({_id:ids[0]}, meta)]);
NODES['__iframe']=mkEl('__iframe');
await APP.abrirPainel(ids[0]);
const corpo=NODES['visor-corpo'];
t('montou o iframe', /<iframe/.test(corpo._html), corpo._html.slice(0,80));
t('iframe é isolado (sandbox sem allow-same-origin)',
  /sandbox="allow-scripts allow-popups allow-forms"/.test(corpo._html));
t('NÃO tem allow-same-origin', !/allow-same-origin/.test(corpo._html));
t('HTML devolvido igual ao original', NODES['__iframe'].srcdoc===html,
  'tam='+String(NODES['__iframe'].srcdoc||'').length);

console.log('\n── trocar o arquivo apaga os pedaços antigos ──');
const menor='<html>pequeno</html>';
NODES['pn-file'].files=[{name:'menor.html', size:menor.length, text:()=>Promise.resolve(menor)}];
NODES['pn-tit'].value='Funil de vendas'; NODES['pn-desc'].value='Teste com dados fictícios';
await APP.salvarPainel(ids[0],'arquivo');
const meta2=DB['cm_paineis'][ids[0]];
t('sobrescreveu o arquivo', meta2.arquivo==='menor.html');
t('só 1 pedaço agora', meta2.chunks===1);
t('nenhum pedaço órfão', Object.keys(DB['cm_painel_dados']).length===1,
  'n='+Object.keys(DB['cm_painel_dados']).length);
t('histórico registrou a troca',
  meta2.historico.some(h=>(h.mudancas||[]).some(m=>m.rotulo==='arquivo')));

console.log('\n── excluir leva os pedaços junto ──');
APP.setPaineis([Object.assign({_id:ids[0]}, meta2)]);
await APP.excluirPainel(ids[0]);
t('painel apagado', !Object.keys(DB['cm_paineis']).length);
t('pedaços apagados', !Object.keys(DB['cm_painel_dados']).length);

console.log('\n── limites ──');
NODES['pn-file'].files=[{name:'enorme.html', size:(APP.LIMITE_MB+1)*1048576, text:()=>Promise.resolve('x')}];
NODES['pn-tit'].value='Grande';
DB['cm_paineis']={};
await APP.salvarPainel('','');
t('recusa arquivo acima do limite', !Object.keys(DB['cm_paineis']).length);
NODES['pn-file'].files=[]; NODES['pn-tit'].value='';
await APP.salvarPainel('','');
t('exige título', !Object.keys(DB['cm_paineis']).length);

console.log('\n══ 4) DEMANDAS ══');
APP.setAba('demandas');
DB['cm_demandas']={};
const campos=(o)=>{ Object.keys(o).forEach(k=>{ NODES[k]=NODES[k]||mkEl(k); NODES[k].value=o[k]; }); };
campos({'dm-tit':'Integração com o ERP','dm-desc':'Puxar pedidos do Adempiere',
  'dm-f-solic':'Alexandre','dm-area':'Comercial','dm-f-prio':'0',
  'dm-prazo':'2026-10-15','dm-f-status':'nao_iniciado'});
NODES['dm-ok']=mkEl('dm-ok');
await APP.salvarDemanda('');
const dids=Object.keys(DB['cm_demandas']);
t('gravou a demanda', dids.length===1);
const d=DB['cm_demandas'][dids[0]];
t('demanda', d.titulo==='Integração com o ERP');
t('quem pediu', d.solicitante==='Alexandre');
t('prioridade é o número', d.prioridade==='0', 'prio='+d.prioridade);
t('prazo de entrega', d.prazo==='2026-10-15');
t('status inicial', d.status==='nao_iniciado', 'st='+d.status);
t('parceira saiu do modelo', d.parceira===undefined);
t('quem criou', d.criadoPor==='ana@udiaco.com.br');
t('histórico de inclusão', d.historico[0].acao==='Inclusão');

console.log('\n── exige o essencial ──');
DB['cm_demandas']={};
campos({'dm-tit':'','dm-f-solic':'Alguém'});
await APP.salvarDemanda('');
t('sem demanda não grava', !Object.keys(DB['cm_demandas']).length);
campos({'dm-tit':'Algo','dm-f-solic':''});
await APP.salvarDemanda('');
t('sem quem pediu não grava', !Object.keys(DB['cm_demandas']).length);

console.log('\n── editar registra o que mudou ──');
DB['cm_demandas']={};
campos({'dm-tit':'Integração ERP','dm-desc':'x','dm-f-solic':'Alexandre','dm-area':'Comercial',
  'dm-f-prio':'2','dm-prazo':'2026-10-15','dm-f-status':'nao_iniciado'});
await APP.salvarDemanda('');
const id2=Object.keys(DB['cm_demandas'])[0];
APP.setDemandas([Object.assign({_id:id2}, DB['cm_demandas'][id2])]);
campos({'dm-f-prio':'0','dm-f-status':'desenvolvimento','dm-prazo':'2026-11-30'});
await APP.salvarDemanda(id2);
const d2=DB['cm_demandas'][id2];
const ed=d2.historico.find(h=>h.acao==='Edição');
t('gravou linha de edição', !!ed);
t('prioridade 2 → 0', ed.mudancas.some(m=>m.rotulo==='prioridade'&&m.de==='2'&&m.para==='0'),
  JSON.stringify(ed.mudancas));
t('status registrado no histórico', ed.mudancas.some(m=>m.rotulo==='status'));
t('entrega estimada em dd/mm/aaaa no histórico',
  ed.mudancas.some(m=>m.rotulo==='entrega estimada'&&m.para==='30/11/2026'),
  JSON.stringify(ed.mudancas.find(m=>m.rotulo==='entrega estimada')));
t('quem editou', ed.por==='ana@udiaco.com.br');
t('tem data e hora', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(ed.em));

console.log('\n── entrada da demanda ──');
DB['cm_demandas']={};
campos({'dm-tit':'Com entrada','dm-desc':'x','dm-f-solic':'A','dm-area':'C',
  'dm-f-prio':'2','dm-entrada':'2026-07-01','dm-prazo':'2026-10-15','dm-f-status':'nao_iniciado'});
await APP.salvarDemanda('');
const de1=DB['cm_demandas'][Object.keys(DB['cm_demandas'])[0]];
t('gravou a entrada da demanda', de1.entrada==='2026-07-01', 'entrada='+de1.entrada);
APP.setDemandas([Object.assign({_id:'z'},de1)]);
NODES['dm-stats']=mkEl('dm-stats'); NODES['dm-lista']=mkEl('dm-lista');
APP.pintarDemandas();
t('coluna Entrada na tabela', /<th>Entrada<\/th>/.test(NODES['dm-lista']._html));
t('coluna Entrega, com o nome inteiro no title',
  /<th title="Entrega estimada[^"]*">Entrega<\/th>/.test(NODES['dm-lista']._html),
  (NODES['dm-lista']._html.match(/<th[^>]*>[^<]*/g)||[]).join(' | '));
t('data de entrada em DD/MM', /<td[^>]*>01\/07<\/td>/.test(NODES['dm-lista']._html),
  (NODES['dm-lista']._html.match(/<td[^>]*>[0-9\/]+<\/td>/g)||[]).join(' | '));
t('sem o ano na coluna Entrada', !/01\/07\/2026/.test(NODES['dm-lista']._html));

console.log('\n── ordem e filtros ──');
APP.setDemandas([
  {_id:'a',titulo:'Atrasada',solicitante:'A',prioridade:'10',status:'nao_iniciado',prazo:'2026-08-01'},
  {_id:'b',titulo:'Entregue',solicitante:'B',prioridade:'0',status:'entregue',prazo:'2026-08-02'},
  {_id:'c',titulo:'Futura',solicitante:'A',prioridade:'0',status:'desenvolvimento',prazo:'2026-12-01'},
]);
let l=APP.demandasFiltradas();
t('entregue vai para o fim', l[l.length-1]._id==='b', l.map(x=>x._id).join(','));
t('prazo mais apertado primeiro', l[0]._id==='a');
APP.setFiltro({q:'',prio:'0',status:'',solic:''});
t('filtro por prioridade (número)', APP.demandasFiltradas().length===2);
APP.setFiltro({q:'',prio:'',status:'entregue',solic:''});
t('filtro por status', APP.demandasFiltradas().length===1);
APP.setFiltro({q:'',prio:'',status:'',solic:'A'});
t('filtro por quem pediu', APP.demandasFiltradas().length===2);
APP.setFiltro({q:'futura',prio:'',status:'',solic:''});
t('busca por texto', APP.demandasFiltradas().length===1);
APP.setFiltro({q:'',prio:'',status:'',solic:''});

console.log('\n── a tela mostra o que importa ──');
NODES['dm-stats']=mkEl('dm-stats'); NODES['dm-lista']=mkEl('dm-lista');
APP.pintarDemandas();
// sprints encerradas nascem recolhidas: abre para conferir as linhas
APP.alternarEncerradas();
const st=NODES['dm-stats']._html, li=NODES['dm-lista']._html;
t('conta o total de tickets', /tickets no total/.test(st));
t('mostra os totais por status', /st-tot__b/.test(st));
t('conta as que passaram da estimativa', /estimativa passou/.test(st));
t('atraso vira cor na data, nao segunda linha',
  /class="dt-txt prazo-venc"/.test(li) && !/dt-obs/.test(li),
  (li.match(/dt-txt[^"]*/g)||[]).join(' | '));
t('quantos dias passaram fica no title', /title="\d+ dias além da estimativa/.test(li),
  (li.match(/title="[^"]*estimativa[^"]*/g)||[]).join(' | '));
t('prioridade no campo editável', /class="pr-sel"[^>]*value="0"/.test(li)
  && /class="pr-sel"[^>]*value="10"/.test(li),
  (li.match(/class="pr-sel"[^>]{0,60}/g)||[]).join(' | '));
// confere os ROTULOS visiveis, e nao o texto dos title
const rotulos=(li.match(/<th[^>]*>([\s\S]*?)<\/th>/g)||[])
  .slice(0,8).map(x=>x.replace(/<[^>]*>/g,'').trim());
t('colunas na ordem pedida',
  rotulos.join('|')==='Demanda|Prio.|Entrega|Status|Quem pediu|Entrada|Área|',
  rotulos.join('|'));
t('nenhum rotulo comprido o bastante para invadir a vizinha',
  rotulos.every(r=>r.length<=10), rotulos.filter(r=>r.length>10).join('|'));
t('clicar abre a demanda', /modalDemanda\('a'\)/.test(li));

console.log('\n══ 5) CASCA E REGISTRO ══');
t('duas abas', /Painéis de BI/.test(SRC)&&/Demandas/.test(SRC));
t('modal com rodapé travado', /mod__f/.test(HTML)&&/mod__b\{[^}]*overflow-y:auto/.test(HTML));
t('botões do rodapé com largura fixa', /\.mod__f \.btn\{[^}]*min-width:140px/.test(HTML));
t('explicação em "?" e não em parágrafo', /\.ajuda\{/.test(HTML)&&/cursor:help/.test(HTML));
t('cache-busting do js', /comercial\.js\?v='\+Date\.now\(\)/.test(HTML));
t('mesmo projeto Firebase', /udiaco-beneficios/.test(HTML));
t('usa o design system da casa', /udiaco-design-system\.css/.test(HTML));
t('plataforma registrada no rhudi', /comercial:\s*\{label:'Comercial',\s*padrao:false\}/.test(APPJS));
t('nasce fechada', /comercial:\s*\{label:'Comercial',\s*padrao:false\}/.test(APPJS));
t('card no portal', /temPlataforma\('comercial'\)/.test(APPJS)&&/comercial\.html/.test(APPJS));
t('regra do Firestore para painéis', /match \/cm_paineis\/\{id\}/.test(RULES));
t('regra para os pedaços', /match \/cm_painel_dados\/\{id\}/.test(RULES));
t('regra para demandas', /match \/cm_demandas\/\{id\}/.test(RULES));
t('regra usa a plataforma', /function podeComercial\(\)[\s\S]{0,120}temPlataforma\('comercial'\)/.test(RULES));
t('UM989 fora', /podeComercial\(\)[\s\S]{0,120}!isUM989\(\)/.test(RULES));

console.log('\n══ 6) CSV ══');
APP.setDemandas([{_id:'a',titulo:'Com "aspas"',descricao:'d',solicitante:'A',area:'Comercial',
  prioridade:'0',status:'nao_iniciado',prazo:'2026-10-15',parceira:'Alfa',
  criadoEm:'2026-08-31T12:00:00.000Z',criadoPor:'ana@udiaco.com.br'}]);
let baixado=null;
document.createElement=tg=>{ const e=mkEl('el-'+tg); e.click=()=>{baixado=e}; return e; };
APP.exportarDemandas();
t('gerou o arquivo', !!baixado);
t('nome do arquivo', baixado&&baixado.download==='Demandas_Tecnologia.csv', baixado&&baixado.download);

console.log('\n'+(fail?'>>> FALHOU: '+fail+' de '+(ok+fail):'>>> TODOS OS '+ok+' TESTES PASSARAM'));
process.exit(fail?1:0);
})().catch(e=>{ console.error('ERRO', e.stack); process.exit(1); });
