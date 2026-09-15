// Escolher quem ve o projeto no proprio formulario da demanda.
// O atalho "criar projeto novo" nascia SEMPRE visivel para a equipe: quem
// queria algo so seu descobria depois, com o assunto ja a vista de todos.
const fs=require('fs');
const SRC=fs.readFileSync('/Users/acmags/rhudi/projetos.js','utf8');
let ok=0, fail=0;
const t=(n,c,x)=>{ if(c){ok++;console.log('  ok   '+n);} else {fail++;console.log('  FALHA '+n+(x?'  -> '+x:''));} };

const NODES={}; const CRIADOS=[];
function mkEl(id){ return { id,_html:'',style:{display:''},className:'',textContent:'',
  value:'',checked:false,dataset:{},children:[],files:[],
  classList:{_c:new Set(),add(x){this._c.add(x)},remove(x){this._c.delete(x)},contains(x){return this._c.has(x)}},
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
  cookie:'',readyState:'complete' };
const window={ _firebaseReady:false,_db:{},_auth:{},_doc:(...a)=>({path:a.join('/')}),
  _writeBatch:()=>({set(){},update(){},delete(){},commit:()=>Promise.resolve()}),
  _setDoc:()=>Promise.resolve(),_getDoc:()=>Promise.resolve({exists:()=>false,data:()=>({})}),
  _getDocs:()=>Promise.resolve({docs:[]}),_deleteDoc:()=>Promise.resolve(),
  _addDoc:(col,d)=>{ CRIADOS.push({col,d}); return Promise.resolve({id:'novo'+CRIADOS.length}); },
  _updateDoc:()=>Promise.resolve(),
  _col:n=>n,_collection:()=>({}),_query:()=>({}),_where:()=>({}),_orderBy:()=>({}),
  _onSnapshot:()=>()=>{},_onAuthStateChanged:()=>{},_signOut:()=>{},_inc:n=>n,
  _batch:()=>({set(){},update(){},delete(){},commit:()=>Promise.resolve()}),
  addEventListener(){},removeEventListener(){},
  matchMedia:()=>({matches:false,addEventListener(){}}),
  location:{href:'',search:''},navigator:{userAgent:'node'} };
window.window=window;
const sandbox={ window,document,
  localStorage:{_d:{},getItem(k){return this._d[k]??null},setItem(k,v){this._d[k]=String(v)},removeItem(){}},
  sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  setTimeout:f=>{ if(typeof f==='function') f(); return 0; },
  setInterval:()=>0,clearTimeout:()=>{},clearInterval:()=>{},
  console,alert:()=>{},confirm:()=>true,prompt:()=>null,
  fetch:()=>Promise.reject(new Error('x')),
  Intl,Date,Math,JSON,Object,Array,String,Number,Boolean,RegExp,Error,Promise,Set,Map,
  isNaN,parseInt,parseFloat,encodeURIComponent,decodeURIComponent,
  btoa:s=>Buffer.from(s).toString('base64'),atob:s=>Buffer.from(s,'base64').toString(),
  Blob:function(){},URL:{createObjectURL:()=>'x',revokeObjectURL(){}},
  FileReader:function(){},structuredClone:o=>JSON.parse(JSON.stringify(o)) };
const nomes=Object.keys(sandbox);
const API=['modalNovaTarefa','atualizarFrentesModal','salvarTarefa','opcoesPessoa',
  'pessoasPorVisibilidade','pessoasDoProjeto','VISIBILIDADES','vejoProjeto',
  'visDoProjeto','ehGestor'];
const exporta='return {'+API.map(n=>n+':(typeof '+n+'!=="undefined"?'+n+':undefined)').join(',')
  +',setUsuario:v=>{usuario=v},setUsuarios:v=>{usuarios=v}'
  +',setProjetos:v=>{projetos=v},setTarefas:v=>{tarefas=v}};';
let APP;
console.log('-- CARGA --');
try{ APP=new Function(...nomes, SRC+'\n'+exporta)(...nomes.map(n=>sandbox[n]));
  t('projetos.js carregado',true);
}catch(e){ t('projetos.js carregado',false,e.message); process.exit(1); }

const EU={email:'alexandre.magalhaes@udiaco.com.br',nome:'Alexandre',papel:'master'};
const JULIA={email:'julia@udiaco.com.br',nome:'Júlia',perfilProjetos:'usuario'};
const GESTOR={email:'leia@udiaco.com.br',nome:'Leia',perfilProjetos:'gestor'};
APP.setUsuario(EU);
APP.setUsuarios([EU,JULIA,GESTOR]);
APP.setProjetos([]); APP.setTarefas([]);

console.log('\n== 1) A ESCOLHA VOLTOU AO FORMULARIO DA DEMANDA ==');
APP.modalNovaTarefa(null,null);
const form=NODES['modal-card'].innerHTML;
t('o formulario oferece quem vê', /id="t-proj-vis"/.test(form),
  (form.match(/t-proj-vis[^>]*/)||[''])[0]);
t('com as três opções de sempre',
  ['Toda a equipe','Só eu e os gestores','Só eu'].every(l=>form.includes(l)),
  Object.values(APP.VISIBILIDADES).map(v=>v.label).join(' | '));
t('e explica que vale para o projeto novo', /Quem vê o projeto novo/.test(form));
t('diz que dá para mudar depois', /mudar depois na aba Projetos/.test(form));

console.log('\n== 2) SÓ APARECE AO CRIAR PROJETO NOVO ==');
// sem projeto nenhum, o formulario ja abre no "projeto novo"
t('sem projeto, já vem aberto',
  /id="t-proj-vis-linha" style="margin-top:8px;display:block"/.test(form),
  (form.match(/t-proj-vis-linha[^>]*/)||[''])[0]);
APP.setProjetos([{_id:'p1',nome:'Comercial',status:'ativo',visibilidade:'equipe',
  dono:EU.email,criadoPor:EU.email,frentes:[]}]);
APP.modalNovaTarefa(null,null);
const form2=NODES['modal-card'].innerHTML;
t('com projeto existente, começa escondido',
  /id="t-proj-vis-linha" style="margin-top:8px;display:none"/.test(form2),
  (form2.match(/t-proj-vis-linha[^>]*/)||[''])[0]);
NODES['t-proj'].value='__novo';
APP.atualizarFrentesModal();
t('escolhendo "projeto novo", aparece', NODES['t-proj-vis-linha'].style.display==='block',
  NODES['t-proj-vis-linha'].style.display);
NODES['t-proj'].value='p1';
APP.atualizarFrentesModal();
t('voltando para um projeto existente, some',
  NODES['t-proj-vis-linha'].style.display==='none', NODES['t-proj-vis-linha'].style.display);

console.log('\n== 3) QUEM PODE RECEBER A DEMANDA ==');
t('equipe: todo mundo', APP.pessoasPorVisibilidade('equipe').length===3);
t('só eu e gestores: eu e a Leia',
  APP.pessoasPorVisibilidade('individual').map(u=>u.email).sort().join(',')
  ===[EU.email,GESTOR.email].sort().join(','),
  APP.pessoasPorVisibilidade('individual').map(u=>u.email).join(','));
t('só eu: ninguém mais',
  APP.pessoasPorVisibilidade('privado').map(u=>u.email).join(',')===EU.email);
// e a lista da tela acompanha a escolha
NODES['t-proj'].value='__novo';
NODES['t-proj-vis'].value='privado';
APP.atualizarFrentesModal();
t('escolhendo "Só eu", a lista de responsáveis fecha em mim',
  (NODES['t-resp'].innerHTML.match(/<option/g)||[]).length===1
  && NODES['t-resp'].innerHTML.includes(EU.email),
  NODES['t-resp'].innerHTML.replace(/<[^>]*>/g,'|'));
NODES['t-proj-vis'].value='equipe';
APP.atualizarFrentesModal();
t('voltando para "Toda a equipe", todos voltam',
  (NODES['t-resp'].innerHTML.match(/<option/g)||[]).length===3);
t('o seletor avisa a tela quando muda', /id="t-proj-vis" onchange="atualizarFrentesModal\(\)"/.test(form),
  (form.match(/t-proj-vis"[^>]*/)||[''])[0]);

console.log('\n== 4) A ESCOLHA CHEGA NO PROJETO CRIADO ==');
(async()=>{
  const preparar=vis=>{
    NODES['t-proj'].value='__novo';
    NODES['t-proj-novo'].value='Projeto Pessoal';
    NODES['t-proj-vis'].value=vis;
    NODES['t-frente'].value='';
    NODES['t-titulo'].value='Primeira demanda';
    NODES['t-desc'].value='';
    NODES['t-resp'].value=EU.email;
    NODES['f-prazo'].value=''; NODES['f-final'].value='';
  };
  for(const vis of ['privado','individual','equipe']){
    CRIADOS.length=0;
    preparar(vis);
    await APP.salvarTarefa(null);
    const proj=CRIADOS.find(c=>c.col==='pe_projetos');
    t('projeto criado como "'+vis+'"', !!proj && proj.d.visibilidade===vis,
      proj?String(proj.d.visibilidade):'não criou');
    t('  e com você como dono', !!proj && proj.d.dono===EU.email);
  }
  CRIADOS.length=0;
  preparar('privado');
  NODES['t-proj-vis'].value='';          // seletor sumido/vazio
  await APP.salvarTarefa(null);
  const p=CRIADOS.find(c=>c.col==='pe_projetos');
  t('sem escolha, cai no visível para a equipe', p && p.d.visibilidade==='equipe',
    p?String(p.d.visibilidade):'não criou');

  console.log('\n== 5) O PROJETO PRIVADO CONTINUA INVISÍVEL PARA OS OUTROS ==');
  const priv={_id:'p9',nome:'Pessoal',status:'ativo',visibilidade:'privado',
    dono:EU.email,criadoPor:EU.email,frentes:[]};
  const indiv=Object.assign({},priv,{_id:'p8',visibilidade:'individual'});
  APP.setUsuario(EU);
  t('eu vejo o meu privado', APP.vejoProjeto(priv)===true);
  APP.setUsuario(JULIA);
  t('a Júlia não vê', APP.vejoProjeto(priv)===false);
  t('nem o individual', APP.vejoProjeto(indiv)===false);
  APP.setUsuario(GESTOR);
  t('o gestor vê o individual (é a alçada)', APP.vejoProjeto(indiv)===true);
  t('mas NÃO vê o privado', APP.vejoProjeto(priv)===false);
  APP.setUsuario(EU);

  console.log('\n'+(fail?'FALHAS: '+fail+' | ok: '+ok:'TUDO OK ('+ok+' checagens)'));
  process.exit(fail?1:0);
})();
