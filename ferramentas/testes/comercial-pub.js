// Link publico por painel: gerar, ler sem login, renovar, desativar, e manter
// a copia publica em sincronia. Carrega o comercial.js e o painel.html reais.
const fs=require('fs');
const SRC=fs.readFileSync('/Users/acmags/rhudi/comercial.js','utf8');
const PUBH=fs.readFileSync('/Users/acmags/rhudi/painel.html','utf8');
const RULES=fs.readFileSync('/Users/acmags/rhudi/firestore.rules','utf8');
let ok=0, fail=0;
const t=(n,c,x)=>{ if(c){ok++;console.log('  ok   '+n);} else {fail++;console.log('  FALHA '+n+(x?'  -> '+x:''));} };

const NODES={};
function mkEl(id){ const el={ id,_html:'',style:{},className:'',textContent:'',value:'',checked:false,
  disabled:false,dataset:{},children:[],files:[],onclick:null,onchange:null,_lis:{},
  classList:{_s:new Set(),add(...c){c.forEach(x=>this._s.add(x))},remove(...c){c.forEach(x=>this._s.delete(x))},contains(c){return this._s.has(c)}},
  get innerHTML(){return this._html}, set innerHTML(v){this._html=String(v)},
  addEventListener(e,f){(this._lis[e]=this._lis[e]||[]).push(f)}, removeEventListener(){},
  appendChild(c){this.children.push(c);return c}, insertAdjacentHTML(p,h){this._html+=h},
  remove(){delete NODES[this.id]}, querySelector(){return NODES['__iframe']||null},
  querySelectorAll(){return[]}, closest(){return null}, focus(){}, select(){}, click(){},
  setAttribute(){}, getAttribute(){return null} }; return el; }
const document={ getElementById(id){ return NODES[id]||(NODES[id]=mkEl(id)); },
  querySelector(){return null}, querySelectorAll(){return[]},
  createElement(tg){const e=mkEl('el-'+tg);e.href='';e.download='';return e;},
  addEventListener(){}, removeEventListener(){}, execCommand(){return true},
  body:mkEl('body'), head:mkEl('head'), documentElement:mkEl('html'), cookie:'', readyState:'complete' };

const DB={};
const snapDe=(c,i)=>({exists:()=>!!(DB[c]&&DB[c][i]), data:()=>DB[c]&&DB[c][i]});
const LISTEN={};
function emitir(col){ (LISTEN[col]||[]).forEach(cb=>cb({forEach:f=>
  Object.keys(DB[col]||{}).forEach(id=>f({id,data:()=>DB[col][id]}))})); }
let CONFIRMA=true;
const window={ _firebaseReady:true, _auth:{}, _col:n=>n, _doc:(c,i)=>({c,i}),
  _getDoc:r=>Promise.resolve(snapDe(r.c,r.i)),
  _setDoc:(r,d)=>{ (DB[r.c]=DB[r.c]||{})[r.i]=JSON.parse(JSON.stringify(d)); emitir(r.c); return Promise.resolve(); },
  _deleteDoc:r=>{ if(DB[r.c]) delete DB[r.c][r.i]; emitir(r.c); return Promise.resolve(); },
  _getDocs:()=>Promise.resolve({forEach(){}}), _addDoc:()=>Promise.resolve({id:'x'}),
  _updateDoc:(r,d)=>{Object.assign(DB[r.c][r.i],d);return Promise.resolve()},
  _onSnapshot:(col,cb)=>{ (LISTEN[col]=LISTEN[col]||[]).push(cb); return ()=>{}; },
  _query:()=>({}),_where:()=>({}),_orderBy:()=>({}),_batch:()=>({set(){},commit(){return Promise.resolve()}}),
  _signIn:()=>Promise.resolve(),_resetSenha:()=>Promise.resolve(),_signOut:()=>Promise.resolve(),
  _onAuthStateChanged:()=>{}, addEventListener(){}, removeEventListener(){},
  location:{origin:'https://udiaco-beneficios.web.app', pathname:'/comercial.html', href:'', search:''},
  crypto:{ getRandomValues:a=>{ for(let i=0;i<a.length;i++) a[i]=Math.floor(Math.random()*256); return a; } },
  navigator:{ clipboard:{ writeText:()=>Promise.resolve() } },
};
window.window=window;
const temCS=typeof CompressionStream==='function';
const sandbox={ window, document, navigator:window.navigator, crypto:window.crypto, location:window.location,
  setTimeout:(f,ms)=>{ if(!ms) f(); return 0; }, clearTimeout:()=>{}, setInterval:()=>0, clearInterval:()=>{},
  console, alert:()=>{}, confirm:()=>CONFIRMA, prompt:()=>null,
  CompressionStream:temCS?CompressionStream:undefined, DecompressionStream:temCS?DecompressionStream:undefined,
  Response:typeof Response==='function'?Response:undefined, TextEncoder, TextDecoder,
  btoa:s=>Buffer.from(s,'binary').toString('base64'), atob:s=>Buffer.from(s,'base64').toString('binary'),
  escape, unescape, encodeURIComponent, decodeURIComponent,
  Blob:function(p,o){this.parts=p}, URL:{createObjectURL:()=>'blob:x',revokeObjectURL(){}},
  Intl,Date,Math,JSON,Object,Array,String,Number,Boolean,RegExp,Error,Promise,Set,Map,
  isNaN,parseInt,parseFloat,Uint8Array,ArrayBuffer };
const nomes=Object.keys(sandbox);
const exporta='return {'+['novoToken','linkPublico','publicar','despublicar','renovarLink',
  'apagarPublico','atualizarPublico','modalCompartilhar','copiarLink','salvarPainel',
  'excluirPainel','viewPaineis','comprimir','descomprimir','picar','COL_PUB','COL_PUBDAD']
  .map(n=>n+':(typeof '+n+'!=="undefined"?'+n+':undefined)').join(',')
  +',setUsuario:v=>{usuario=v},setPaineis:v=>{paineis=v},getPaineis:()=>paineis,setAba:v=>{aba=v}};';
let APP;
try{ APP=new Function(...nomes, SRC+'\n'+exporta)(...nomes.map(n=>sandbox[n]));
  console.log('── CARGA ──'); t('comercial.js carregado',true);
}catch(e){ console.log('── CARGA ──'); t('comercial.js carregado',false,e.message); process.exit(1); }
APP.setUsuario({email:'ana@udiaco.com.br',nome:'Ana'}); APP.setAba('paineis');
NODES['camada']=mkEl('camada');

(async()=>{
console.log('\n══ 1) O TOKEN ══');
const tk=APP.novoToken();
t('32 caracteres hex', /^[0-9a-f]{32}$/.test(tk), tk);
const muitos=new Set(); for(let i=0;i<500;i++) muitos.add(APP.novoToken());
t('500 tokens, nenhum repetido', muitos.size===500);
t('usa crypto, não Math.random', /getRandomValues/.test(SRC));
t('link aponta para painel.html', APP.linkPublico(tk)
  ==='https://udiaco-beneficios.web.app/painel.html?p='+tk, APP.linkPublico(tk));

console.log('\n══ 2) PUBLICAR ══');
const html='<html><body>'+'<div>vendedores</div>'.repeat(3000)+'</body></html>';
const {b64,gzip}=await APP.comprimir(html);
const ped=APP.picar(b64);
DB['cm_paineis']={pn_1:{titulo:'Vendedores',descricao:'Teste',arquivo:'v.html',
  bytes:html.length,chunks:ped.length,gzip,historico:[]}};
DB['cm_painel_dados']={}; ped.forEach((p,i)=>DB['cm_painel_dados']['pn_1__'+i]={p});
APP.setPaineis([Object.assign({_id:'pn_1'},DB['cm_paineis'].pn_1)]);
await APP.publicar('pn_1');
const meta=DB['cm_paineis'].pn_1;
t('gravou o token no painel', /^[0-9a-f]{32}$/.test(meta.token||''), meta.token);
t('registrou quem publicou', meta.publicadoPor==='ana@udiaco.com.br');
t('histórico registra a ativação',
  (meta.historico||[]).some(h=>/link público ativado/.test(h.obs||'')));
const T=meta.token;
t('criou o documento público', !!(DB['cm_publico']&&DB['cm_publico'][T]));
const pub=DB['cm_publico'][T];
t('cópia tem título e descrição', pub.titulo==='Vendedores'&&pub.descricao==='Teste');
t('cópia sabe quantos pedaços', pub.chunks===ped.length);
t('copiou todos os pedaços',
  Object.keys(DB['cm_publico_dados']).length===ped.length,
  'n='+Object.keys(DB['cm_publico_dados']).length);
t('pedaços sob o TOKEN, não sob o id do painel',
  Object.keys(DB['cm_publico_dados']).every(k=>k.startsWith(T+'__')));
t('o painel privado NÃO virou público', !DB['cm_publico']['pn_1']);

console.log('\n── quem tem o link consegue montar o painel de volta ──');
const partes=[];
for(let i=0;i<pub.chunks;i++) partes.push(DB['cm_publico_dados'][T+'__'+i].p);
const lido=await APP.descomprimir(partes.join(''), pub.gzip);
t('HTML idêntico ao original', lido===html, 'tam='+lido.length);

console.log('\n══ 3) O CARD E O MODAL ══');
APP.setPaineis([Object.assign({_id:'pn_1'},meta)]);
const view=APP.viewPaineis();
t('card marca como público', /público<\/span>/.test(view));
t('card tem o botão de compartilhar', /modalCompartilhar\('pn_1'\)/.test(view));
APP.modalCompartilhar('pn_1');
const mod=NODES['camada']._html;
t('modal mostra o link', mod.includes('painel.html?p='+T));
t('botão de copiar', /copiarLink\(\)/.test(mod));
t('abrir como visitante', /Abrir como visitante/.test(mod));
t('avisa que é sem login', /sem login/.test(mod));
t('diz quem publicou e quando', /Publicado em/.test(mod)&&/ana@udiaco\.com\.br/.test(mod));
t('oferece renovar', /renovarLink\('pn_1'\)/.test(mod));
t('oferece desativar', /despublicar\('pn_1'\)/.test(mod));

console.log('\n══ 4) TROCAR O ARQUIVO ATUALIZA A CÓPIA ══');
const novo='<html><body>versão 2</body></html>';
NODES['pn-tit']=mkEl('pn-tit'); NODES['pn-tit'].value='Vendedores';
NODES['pn-desc']=mkEl('pn-desc'); NODES['pn-desc'].value='Teste';
NODES['pn-file']=mkEl('pn-file');
NODES['pn-file'].files=[{name:'v2.html',size:novo.length,text:()=>Promise.resolve(novo)}];
NODES['pn-ok']=mkEl('pn-ok'); NODES['pn-prog']=mkEl('pn-prog');
await APP.salvarPainel('pn_1','arquivo');
const m2=DB['cm_paineis'].pn_1;
t('token preservado', m2.token===T);
t('painel privado atualizado', m2.arquivo==='v2.html');
const pub2=DB['cm_publico'][T];
t('cópia pública acompanhou os pedaços', pub2.chunks===m2.chunks, 'pub='+pub2.chunks+' priv='+m2.chunks);
const partes2=[];
for(let i=0;i<pub2.chunks;i++) partes2.push(DB['cm_publico_dados'][T+'__'+i].p);
t('o link agora serve a versão 2',
  (await APP.descomprimir(partes2.join(''), pub2.gzip))===novo);
t('sem pedaço público órfão',
  Object.keys(DB['cm_publico_dados']).length===pub2.chunks,
  'n='+Object.keys(DB['cm_publico_dados']).length);

console.log('\n── editar só o título atualiza a cópia sem recopiar o arquivo ──');
APP.setPaineis([Object.assign({_id:'pn_1'},m2)]);
NODES['pn-tit'].value='Vendedores 2026';
NODES['pn-file'].files=[];
await APP.salvarPainel('pn_1','meta');
t('título novo na cópia pública', DB['cm_publico'][T].titulo==='Vendedores 2026',
  DB['cm_publico'][T].titulo);
t('pedaços não mudaram', Object.keys(DB['cm_publico_dados']).length===DB['cm_publico'][T].chunks);

console.log('\n══ 5) RENOVAR O LINK ══');
APP.setPaineis([Object.assign({_id:'pn_1'},DB['cm_paineis'].pn_1)]);
const antigo=DB['cm_paineis'].pn_1.token;
await APP.renovarLink('pn_1');
const T2=DB['cm_paineis'].pn_1.token;
t('token mudou', T2 && T2!==antigo);
t('link antigo morreu', !DB['cm_publico'][antigo]);
t('pedaços do antigo sumiram',
  !Object.keys(DB['cm_publico_dados']).some(k=>k.startsWith(antigo+'__')));
t('link novo funciona', !!DB['cm_publico'][T2]);
t('histórico registra a renovação',
  (DB['cm_paineis'].pn_1.historico||[]).some(h=>/renovado/.test(h.obs||'')));

console.log('\n══ 6) DESATIVAR ══');
APP.setPaineis([Object.assign({_id:'pn_1'},DB['cm_paineis'].pn_1)]);
await APP.despublicar('pn_1');
const m3=DB['cm_paineis'].pn_1;
t('token removido do painel', !m3.token);
t('documento público apagado', !DB['cm_publico'][T2]);
t('pedaços públicos apagados', !Object.keys(DB['cm_publico_dados']).length,
  'sobrou '+Object.keys(DB['cm_publico_dados']).length);
t('painel privado intacto', m3.arquivo==='v2.html' && m3.chunks>=1);
t('pedaços privados intactos', Object.keys(DB['cm_painel_dados']).length>=1);
t('histórico registra a desativação',
  (m3.historico||[]).some(h=>h.acao==='Exclusão'&&/desativado/.test(h.obs||'')));

console.log('\n── recusa desativar sem confirmação ──');
await APP.publicar('pn_1');
APP.setPaineis([Object.assign({_id:'pn_1'},DB['cm_paineis'].pn_1)]);
const T3=DB['cm_paineis'].pn_1.token;
CONFIRMA=false;
await APP.despublicar('pn_1');
t('cancelou e manteve o link', !!DB['cm_publico'][T3]);
CONFIRMA=true;

console.log('\n══ 7) EXCLUIR O PAINEL LEVA A CÓPIA PÚBLICA ══');
APP.setPaineis([Object.assign({_id:'pn_1'},DB['cm_paineis'].pn_1)]);
await APP.excluirPainel('pn_1');
t('painel apagado', !Object.keys(DB['cm_paineis']).length);
t('pedaços privados apagados', !Object.keys(DB['cm_painel_dados']).length);
t('cópia pública apagada', !Object.keys(DB['cm_publico']).length);
t('pedaços públicos apagados', !Object.keys(DB['cm_publico_dados']).length,
  'sobrou '+Object.keys(DB['cm_publico_dados']).length);

console.log('\n══ 8) A PÁGINA PÚBLICA ══');
t('não faz login', !/signIn|onAuthStateChanged/.test(PUBH));
t('não importa firebase-auth', !/firebase-auth/.test(PUBH));
t('só lê as coleções públicas',
  /cm_publico'/.test(PUBH)&&/cm_publico_dados'/.test(PUBH)
  && !/cm_paineis/.test(PUBH) && !/cm_painel_dados/.test(PUBH));
t('só usa getDoc (nunca lista)', /getDoc/.test(PUBH)&&!/getDocs|collection\(/.test(PUBH));
t('fora dos buscadores', /name="robots" content="noindex/.test(PUBH));
t('sem referrer', /name="referrer" content="no-referrer"/.test(PUBH));
t('iframe isolado', /sandbox="allow-scripts allow-popups allow-forms"/.test(PUBH));
t('sem allow-same-origin no atributo', !/sandbox="[^"]*allow-same-origin/.test(PUBH));
t('valida o formato do token', /\[a-z0-9\]\{16,64\}/.test(PUBH));
t('avisa que são dados de teste', /Dados de teste/.test(PUBH));
t('mensagem para link desativado', /compartilhamento foi desativado/.test(PUBH));
t('mensagem para link inválido', /Link inválido/.test(PUBH));

console.log('\n══ 9) REGRAS DO FIRESTORE ══');
t('cm_publico com get público', /match \/cm_publico\/\{token\}\s+\{ allow get: if true;/.test(RULES));
t('cm_publico_dados com get público', /match \/cm_publico_dados\/\{parte\}\s+\{ allow get: if true;/.test(RULES));
t('NUNCA allow read (que incluiria list)',
  !/match \/cm_publico[^{]*\{[^}]*allow read/.test(RULES));
t('escrever só o Comercial',
  /match \/cm_publico\/\{token\}[^}]*allow write: if podeComercial\(\)/.test(RULES));
t('painel privado segue fechado',
  /match \/cm_paineis\/\{id\}\s+\{ allow read, write: if podeComercial\(\); \}/.test(RULES));
t('pedaços privados seguem fechados',
  /match \/cm_painel_dados\/\{id\}\s+\{ allow read, write: if podeComercial\(\); \}/.test(RULES));
t('comentário explica por que get e não read', /list libera varrer a coleção/.test(RULES));

console.log('\n'+(fail?'>>> FALHOU: '+fail+' de '+(ok+fail):'>>> TODOS OS '+ok+' TESTES PASSARAM'));
process.exit(fail?1:0);
})().catch(e=>{ console.error('ERRO', e.stack); process.exit(1); });
