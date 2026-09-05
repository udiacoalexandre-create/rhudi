// Aba particular Laboratorio (Projetos Estrategicos): quem enxerga, quem
// consegue mexer, e o ciclo subir -> abrir -> trocar -> excluir.
const fs=require('fs');
const SRC  =fs.readFileSync('/Users/acmags/rhudi/projetos.js','utf8');
const HTML =fs.readFileSync('/Users/acmags/rhudi/projetos.html','utf8');
const RULES=fs.readFileSync('/Users/acmags/rhudi/firestore.rules','utf8');
let ok=0, fail=0;
const t=(n,c,x)=>{ if(c){ok++;console.log('  ok   '+n);} else {fail++;console.log('  FALHA '+n+(x?'  -> '+x:''));} };

const NODES={}; const TOASTS=[]; const CRIADOS=[];
function mkEl(id){ const e={ id,_html:'',style:{},className:'',textContent:'',value:'',
  files:[],dataset:{},children:[],href:'',download:'',
  classList:{_c:new Set(),add(x){this._c.add(x)},remove(x){this._c.delete(x)},contains(x){return this._c.has(x)}},
  get innerHTML(){return this._html},
  // O app cria o visor e depois busca $('lab-corpo'), que so existe dentro
  // deste HTML. Registra os filhos com id para o getElementById achar.
  set innerHTML(v){ this._html=String(v);
    (this._html.match(/id="([^"]+)"/g)||[]).forEach(m=>{
      const id=m.slice(4,-1);
      if(!NODES[id] || NODES[id]===this) NODES[id]=mkEl(id);
    }); },
  addEventListener(){},removeEventListener(){},
  appendChild(c){ this.children.push(c); if(c.id) NODES[c.id]=c; return c; },
  insertAdjacentHTML(p,h){this._html+=h},
  remove(){ delete NODES[this.id]; CRIADOS.splice(CRIADOS.indexOf(this),1); },
  querySelector(s){
    if(String(s)==='iframe' && /<iframe/.test(this._html))
      return (this._iframe = this._iframe || {srcdoc:''});
    return this._iframe || null;
  },
  querySelectorAll(){return[]},closest(){return null},
  focus(){},click(){ this.clicado=true },setAttribute(){},getAttribute(){return null} };
  return e; }
const document={ getElementById(id){ return NODES[id]||null },
  querySelector(){return null},querySelectorAll(){return[]},
  createElement(tg){ const e=mkEl('el-'+tg+'-'+CRIADOS.length); e._tag=tg; CRIADOS.push(e); return e; },
  addEventListener(){},removeEventListener(){},
  body:{ children:[], appendChild(c){ this.children.push(c); if(c.id) NODES[c.id]=c;
    // o visor injeta o iframe via innerHTML; simula o querySelector dele
    return c; } },
  head:mkEl('head'),documentElement:mkEl('html'),cookie:'',readyState:'complete' };
['abas','view','modal','modal-card','toast','sino','notif-painel','btn-sino',
 'sino-badge','notif-lista','backdrop','minha-foto','btn-minha-foto'].forEach(id=>NODES[id]=mkEl(id));
NODES['notif-painel'].classList.contains=()=>false;

const DB={};            // colecao -> id -> dados
const APAGADOS=[];
// false de proposito: com true o arquivo chama iniciar() na carga e amarra
// onclick em elementos que este harness nao tem.
const window={ _firebaseReady:false,_db:{},_auth:{},
  _col:n=>n, _doc:(c,i)=>({c,i}),
  _setDoc:(r,d)=>{ (DB[r.c]=DB[r.c]||{})[r.i]=d; return Promise.resolve(); },
  _getDoc:r=>Promise.resolve({ exists:()=>!!(DB[r.c]&&DB[r.c][r.i]), data:()=>DB[r.c][r.i] }),
  _getDocs:()=>Promise.resolve({docs:[],forEach(){}}),
  _addDoc:()=>Promise.resolve({id:'x'}),
  _updateDoc:()=>Promise.resolve(),
  _deleteDoc:r=>{ APAGADOS.push(r.c+'/'+r.i); if(DB[r.c]) delete DB[r.c][r.i]; return Promise.resolve(); },
  _onSnapshot:()=>()=>{}, _query:()=>({}), _where:()=>({}), _orderBy:()=>({}),
  _batch:()=>({set(){},update(){},delete(){},commit:()=>Promise.resolve()}),
  _inc:n=>n, _onAuthStateChanged:()=>{}, _signOut:()=>{},
  addEventListener(){},removeEventListener(){},
  matchMedia:()=>({matches:false,addEventListener(){}}),
  location:{href:'',search:'',origin:'https://x',pathname:'/projetos.html'},
  navigator:{userAgent:'node'}, crypto:{getRandomValues:a=>a} };
window.window=window;
const sandbox={ window,document,
  localStorage:{_d:{},getItem(k){return this._d[k]??null},setItem(k,v){this._d[k]=String(v)},removeItem(){}},
  setTimeout:(f)=>{ if(typeof f==='function') f(); return 0; },
  setInterval:()=>0,clearTimeout:()=>{},clearInterval:()=>{},
  console,alert:()=>{},confirm:()=>true,prompt:()=>null,
  fetch:()=>Promise.reject(new Error('sem rede')),
  CompressionStream:undefined, DecompressionStream:undefined,
  TextEncoder,TextDecoder,Response:function(){},
  btoa:s=>Buffer.from(s,'binary').toString('base64'),
  atob:s=>Buffer.from(s,'base64').toString('binary'),
  escape,unescape,encodeURIComponent,decodeURIComponent,
  Blob:function(p,o){ this.partes=p; this.type=o&&o.type; },
  URL:{createObjectURL:()=>'blob:x',revokeObjectURL(){}},
  File:function(){},FileReader:function(){},
  Intl,Date,Math,JSON,Object,Array,String,Number,Boolean,RegExp,Error,Promise,Set,Map,
  isNaN,parseInt,parseFloat,Uint8Array,
  structuredClone:o=>JSON.parse(JSON.stringify(o)) };
const nomes=Object.keys(sandbox);
const API=['ehDonoLab','viewLab','labModal','labSalvar','labAbrir','labFechar','labExcluir','labAlternarCli',
  'labBaixar','labLerHTML','labComprimir','labDescomprimir','labPicar','labTamanho',
  'labQuando','labApagarPedacos','renderNav','render','COL_LAB','COL_LABDAD',
  'DONO_LAB','LAB_CHUNK','LAB_LIMITE_MB'];
const exporta='return {'+API.map(n=>n+':(typeof '+n+'!=="undefined"?'+n+':undefined)').join(',')
  +',setUsuario:v=>{usuario=v},setLabs:v=>{labs=v},getLabs:()=>labs'
  +',setAba:v=>{aba=v},getAba:()=>aba,setProjetos:v=>{projetos=v},setTarefas:v=>{tarefas=v}};';
let APP;
console.log('-- CARGA --');
try{ APP=new Function(...nomes, SRC+'\n'+exporta)(...nomes.map(n=>sandbox[n]));
  t('projetos.js carregado',true);
}catch(e){ t('projetos.js carregado',false,e.message); process.exit(1); }
APP.setProjetos([]); APP.setTarefas([]);

const ALE={email:'alexandre.magalhaes@udiaco.com.br',nome:'Alexandre',papel:'master'};
const OUTRO={email:'daiana.rolim@udiaco.com.br',nome:'Daiana',papel:'master'};

(async()=>{

console.log('\n== 1) QUEM ENXERGA A ABA ==');
APP.setUsuario(ALE);
t('o dono e reconhecido', APP.ehDonoLab()===true);
APP.renderNav();
t('a aba aparece para o dono', /irPara\('lab'\)/.test(NODES['abas'].innerHTML),
  NODES['abas'].innerHTML.replace(/<[^>]*>/g,'|').slice(0,120));
t('com o nome Laboratório', /Laboratório/.test(NODES['abas'].innerHTML));

APP.setUsuario(OUTRO);
t('outra pessoa NAO e dona', APP.ehDonoLab()===false);
APP.renderNav();
t('a aba nao aparece para outro master', !/irPara\('lab'\)/.test(NODES['abas'].innerHTML),
  NODES['abas'].innerHTML.replace(/<[^>]*>/g,'|').slice(0,120));
t('e-mail com maiuscula tambem entra',
  (APP.setUsuario({email:'ALEXANDRE.MAGALHAES@UDIACO.COM.BR'}), APP.ehDonoLab()===true));
t('sem usuario nao entra', (APP.setUsuario(null), APP.ehDonoLab()===false));
t('e-mail parecido nao entra',
  (APP.setUsuario({email:'alexandre.magalhaes@udiaco.com.br.br'}), APP.ehDonoLab()===false));

console.log('\n== 2) A TELA NAO ABRE PARA QUEM NAO E DONO ==');
APP.setUsuario(OUTRO);
APP.setAba('lab');
APP.render();
t('a aba cai para agenda se nao for o dono', APP.getAba()==='agenda', APP.getAba());
t('e mesmo chamada direto, a view nega', /Área particular/.test(APP.viewLab()),
  APP.viewLab().replace(/<[^>]*>/g,' ').slice(0,90));
// as acoes tambem, nao so a tela
const antesDB=JSON.stringify(DB);
await APP.labSalvar('');
APP.labModal(null);
await APP.labExcluir('qualquer');
await APP.labBaixar('qualquer');
await APP.labAbrir('qualquer');
t('nenhuma acao grava nada', JSON.stringify(DB)===antesDB);
t('nenhuma acao abre modal', NODES['modal-card'].innerHTML==='');
t('nenhuma acao abre o visor', !NODES['lab-visor']);

console.log('\n== 3) SUBIR UM HTML ==');
APP.setUsuario(ALE);
APP.setAba('lab'); APP.setLabs([]);
NODES['lab-tit']=mkEl('lab-tit'); NODES['lab-nota']=mkEl('lab-nota');
NODES['lab-file']=mkEl('lab-file'); NODES['lab-prog']=mkEl('lab-prog');
const HTML_TESTE='<h1>protótipo</h1><script>console.log(1)<\/script>';
NODES['lab-tit'].value='Protótipo do painel';
NODES['lab-nota'].value='rascunho da tela nova';
NODES['lab-file'].files=[{ name:'proto.html', size:HTML_TESTE.length,
  text:()=>Promise.resolve(HTML_TESTE) }];
await APP.labSalvar('');
const ids=Object.keys(DB['pe_lab']||{});
t('gravou o registro em pe_lab', ids.length===1, JSON.stringify(ids));
const reg=DB['pe_lab'][ids[0]];
t('guardou o titulo', reg.titulo==='Protótipo do painel');
t('guardou a nota', reg.nota==='rascunho da tela nova');
t('guardou o nome do arquivo', reg.arquivo==='proto.html');
t('guardou o dono', reg.dono===ALE.email);
t('marcou quando criou e quando atualizou', !!reg.criadoEm && !!reg.atualizadoEm);
t('gravou o conteudo em pe_lab_dados', Object.keys(DB['pe_lab_dados']||{}).length===1,
  JSON.stringify(Object.keys(DB['pe_lab_dados']||{})));
t('o pedaco leva o dono junto', DB['pe_lab_dados'][ids[0]+'__0'].dono===ALE.email);
t('o id do pedaco e id__n', !!DB['pe_lab_dados'][ids[0]+'__0']);
t('registrou quantos pedacos', reg.chunks===1, String(reg.chunks));
t('fechou o modal', NODES['modal'].classList.contains('modal--on')===false);
t('avisou', /no ar/i.test(NODES['toast'].textContent), NODES['toast'].textContent.replace(/<[^>]*>/g,' '));

console.log('\n== 4) DE VOLTA: O HTML SAI IGUAL AO QUE ENTROU ==');
const salvo=Object.assign({_id:ids[0]}, reg);
const volta=await APP.labLerHTML(salvo);
t('o conteudo volta byte a byte', volta===HTML_TESTE, JSON.stringify(volta).slice(0,80));
t('sem gzip no ambiente, gravou texto puro', reg.gzip===false);
// com arquivo grande, tem de picar em mais de um pedaco
const GRANDE='x'.repeat(APP.LAB_CHUNK*2+10);
t('pica em pedacos de 600 KB', APP.labPicar(GRANDE).length===3,
  String(APP.labPicar(GRANDE).length));
t('nenhum pedaco passa do limite',
  APP.labPicar(GRANDE).every(p=>p.length<=APP.LAB_CHUNK));
t('junta de volta sem perder nada', APP.labPicar(GRANDE).join('')===GRANDE);

console.log('\n== 5) VALIDACOES DO FORMULARIO ==');
NODES['lab-tit'].value='';
NODES['lab-file'].files=[{name:'a.html',size:10,text:()=>Promise.resolve('<p>a</p>')}];
const antes5=Object.keys(DB['pe_lab']).length;
await APP.labSalvar('');
t('sem titulo nao grava', Object.keys(DB['pe_lab']).length===antes5);
t('e diz por que', /título/i.test(NODES['toast'].textContent));
NODES['lab-tit'].value='Sem arquivo';
NODES['lab-file'].files=[];
await APP.labSalvar('');
t('teste novo sem arquivo nao grava', Object.keys(DB['pe_lab']).length===antes5);
t('e diz por que', /arquivo/i.test(NODES['toast'].textContent));
NODES['lab-file'].files=[{name:'g.html',size:APP.LAB_LIMITE_MB*1048576+1,
  text:()=>Promise.resolve('x')}];
await APP.labSalvar('');
t('arquivo acima do limite nao grava', Object.keys(DB['pe_lab']).length===antes5);
t('e diz o tamanho e o limite',
  /MB/.test(NODES['toast'].textContent) && /limite/i.test(NODES['toast'].textContent),
  NODES['toast'].textContent.replace(/<[^>]*>/g,' '));

console.log('\n== 6) TROCAR O ARQUIVO ==');
APP.setLabs([salvo]);
// arquivo novo MENOR, que antes deixava pedaco velho pendurado
DB['pe_lab_dados'][ids[0]+'__1']={p:'lixo antigo'};
DB['pe_lab'][ids[0]].chunks=2;
APP.setLabs([Object.assign({}, salvo, {chunks:2})]);
NODES['lab-tit'].value='Protótipo v2';
NODES['lab-nota'].value='';
NODES['lab-file'].files=[{name:'proto2.html',size:9,text:()=>Promise.resolve('<p>v2</p>')}];
APAGADOS.length=0;
await APP.labSalvar(ids[0]);
t('nao criou registro novo', Object.keys(DB['pe_lab']).length===antes5,
  JSON.stringify(Object.keys(DB['pe_lab'])));
t('trocou o titulo', DB['pe_lab'][ids[0]].titulo==='Protótipo v2');
t('trocou o arquivo', DB['pe_lab'][ids[0]].arquivo==='proto2.html');
t('apagou os pedacos antigos ANTES de gravar',
  APAGADOS.includes('pe_lab_dados/'+ids[0]+'__1'), APAGADOS.join(','));
t('nao sobrou pedaco pendurado', !DB['pe_lab_dados'][ids[0]+'__1'],
  JSON.stringify(Object.keys(DB['pe_lab_dados'])));
t('agora tem 1 pedaco so', DB['pe_lab'][ids[0]].chunks===1);
const v2=await APP.labLerHTML(Object.assign({_id:ids[0]}, DB['pe_lab'][ids[0]]));
t('le a versao nova, nao a antiga', v2==='<p>v2</p>', v2);

console.log('\n== 7) ABRIR ISOLADO ==');
APP.setLabs([Object.assign({_id:ids[0]}, DB['pe_lab'][ids[0]])]);
await APP.labAbrir(ids[0]);
const visor=NODES['lab-visor'];
t('abriu o visor', !!visor);
const corpo=NODES['lab-corpo'];
t('desenhou o iframe', !!corpo && /<iframe/.test(corpo.innerHTML),
  corpo?corpo.innerHTML.slice(0,120):'sem corpo');
t('o iframe e SANDBOX', /sandbox="allow-scripts allow-popups allow-forms"/.test(corpo.innerHTML));
t('NAO tem allow-same-origin (nao alcanca o Firestore nem a sessao)',
  !/allow-same-origin/.test(corpo.innerHTML));
t('a barra tem o botao de voltar', /labFechar\(\)/.test(visor.innerHTML));
APP.labFechar();
t('fecha e some da tela', !NODES['lab-visor']);

console.log('\n== 8) EXCLUIR ==');
APAGADOS.length=0;
APP.setLabs([Object.assign({_id:ids[0]}, DB['pe_lab'][ids[0]])]);
await APP.labExcluir(ids[0]);
t('apagou o pedaco', APAGADOS.includes('pe_lab_dados/'+ids[0]+'__0'), APAGADOS.join(','));
t('apagou o registro', APAGADOS.includes('pe_lab/'+ids[0]));
t('o pedaco vai ANTES do registro (senao sobra lixo sem dono)',
  APAGADOS.indexOf('pe_lab_dados/'+ids[0]+'__0') < APAGADOS.indexOf('pe_lab/'+ids[0]),
  APAGADOS.join(' -> '));
t('nao sobrou nada em pe_lab', !DB['pe_lab'][ids[0]]);

console.log('\n== 9) A TELA ==');
APP.setUsuario(ALE);
APP.setLabs([]);
const vazia=APP.viewLab();
t('vazio aponta os dois caminhos',
  /Publique do terminal/.test(vazia) && /suba um arquivo/i.test(vazia),
  vazia.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,140));
t('o botao de subir esta la', /labModal\(null\)/.test(vazia));
t('com a lista vazia, o comando ja vem aberto', /lab\.js publicar/.test(vazia),
  vazia.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,180));
APP.setLabs([{_id:'l1', titulo:'Painel novo', nota:'em teste', arquivo:'p.html',
  bytes:2048, gzip:true, chunks:1, atualizadoEm:'2026-09-04T14:30:00.000Z'}]);
const cheia=APP.viewLab();
t('mostra o titulo', /Painel novo/.test(cheia));
t('mostra a nota', /em teste/.test(cheia));
t('mostra tamanho legivel', /2 KB/.test(cheia), (cheia.match(/lab-card__m">[^<]*/)||[''])[0]);
t('mostra quando foi atualizado', /04\/09\/2026/.test(cheia));
t('tem abrir, editar, baixar e excluir',
  /labAbrir\('l1'\)/.test(cheia) && /labModal\('l1'\)/.test(cheia)
  && /labBaixar\('l1'\)/.test(cheia) && /labExcluir\('l1'\)/.test(cheia));
t('diz que nao ha link para compartilhar', /não há link para compartilhar/.test(cheia));
t('com teste na lista, o comando fica recolhido',
  !/lab\.js publicar/.test(cheia) && /como\?/.test(cheia),
  (cheia.match(/lab-cli__x[^<]*<\/span>/)||[''])[0]);
APP.labAlternarCli();
t('e abre quando se pede', /lab\.js publicar --watch|--watch/.test(APP.viewLab()));
APP.labAlternarCli();
t('e fecha de novo', !/lab\.js publicar/.test(APP.viewLab()));
t('cartao do terminal ganha etiqueta',
  (APP.setLabs([{_id:'l2',titulo:'X',origem:'claude-code',bytes:1,chunks:1,
    atualizadoEm:'2026-09-05T10:00:00.000Z'}]), /lab-tag">do terminal/.test(APP.viewLab())),
  (APP.viewLab().match(/lab-card__m">Atualizado[^<]*<?[^>]*>?[^<]*/)||[''])[0]);
t('cartao de upload manual nao ganha',
  (APP.setLabs([{_id:'l3',titulo:'Y',bytes:1,chunks:1,atualizadoEm:'2026-09-05T10:00:00.000Z'}]),
   !/do terminal/.test(APP.viewLab())));
// so o CODIGO: comentario falando de 'publicar' nao e oferta de link
const codLab=(SRC.split('ABA PARTICULAR')[1]||'').replace(/\/\/[^\n]*/g,'');
// 'publicar' aqui quer dizer publicar do TERMINAL. O que nao pode existir e
// endereco compartilhavel: token, colecao publica ou pagina de visitante.
t('NAO oferece link publico',
  !/linkPublico|novoToken|cm_publico|painel\.html|demandas\.html|\btoken\b/i.test(codLab),
  (codLab.match(/.{0,40}(token|publico|\.html\?).{0,40}/i)||[''])[0]);
t('CSS dos cartoes existe', /\.lab-card\{/.test(HTML));
t('CSS do visor existe', /\.lab-visor\{/.test(HTML));
t('o visor cobre a tela', /\.lab-visor\{[^}]*position:fixed[^}]*inset:0/.test(HTML));

console.log('\n== 9b) A PAGINA BUSCA A VERSAO NOVA ==');
// O Hosting serve o .js com max-age=3600. Sem cache-busting, o deploy sai e
// o navegador segue rodando a versao de ate uma hora atras.
t('projetos.html nao carrega o js com src fixo',
  !/<script src="projetos\.js"/.test(HTML),
  (HTML.match(/<script src="projetos[^>]*/)||[''])[0]);
t('carrega com versao', /projetos\.js\?v='\+Date\.now\(\)/.test(HTML),
  (HTML.match(/projetos\.js[^']{0,30}/)||[''])[0]);

console.log('\n== 10) REGRAS DO FIRESTORE ==');
t('pe_lab so do dono',
  /match \/pe_lab\/\{id\}\s*\{ allow read, write: if ehDonoLab\(\); \}/.test(RULES),
  (RULES.match(/match \/pe_lab\/[^\n]*/)||[''])[0]);
t('pe_lab_dados so do dono',
  /match \/pe_lab_dados\/\{id\}\s*\{ allow read, write: if ehDonoLab\(\); \}/.test(RULES));
t('a regra e por e-mail, nao por papel',
  /function ehDonoLab\(\)[\s\S]{0,160}email\(\) == 'alexandre\.magalhaes@udiaco\.com\.br'/.test(RULES));
t('nao basta ser Master', !/ehDonoLab\(\)[\s\S]{0,160}isMaster/.test(RULES));
t('nao basta ter a plataforma', !/ehDonoLab\(\)[\s\S]{0,160}temPlataforma/.test(RULES));
t('nao e publico', !/pe_lab[^\n]*if true/.test(RULES));
t('o codigo usa as mesmas colecoes da regra',
  APP.COL_LAB==='pe_lab' && APP.COL_LABDAD==='pe_lab_dados',
  APP.COL_LAB+' / '+APP.COL_LABDAD);
t('o e-mail do codigo e o mesmo da regra',
  RULES.indexOf("email() == '"+APP.DONO_LAB+"'")>0, APP.DONO_LAB);

console.log('\n'+(fail?'FALHAS: '+fail+' | ok: '+ok:'TUDO OK ('+ok+' checagens)'));
process.exit(fail?1:0);
})();
