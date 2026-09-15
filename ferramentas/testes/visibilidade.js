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
  'visDoProjeto','ehGestor','VIS_TAREFA','visDaTarefa','vejoTarefa','daDupla',
  'mudarVisTarefa','menuVisTarefa','meuProjetoPessoal','garantirProjetoPessoal','PROJ_PESSOAL'];
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

  console.log('\n== 6) RESTRINGIR A PROPRIA DEMANDA ==');
  // era isto que faltava: dentro de um projeto que a equipe toda enxerga,
  // marcar SO UMA demanda como restrita, sem ter de criar projeto para ela
  const eq={_id:'p1',nome:'Comercial',status:'ativo',visibilidade:'equipe',
    dono:EU.email,criadoPor:EU.email,frentes:[]};
  APP.setProjetos([eq]);
  const base={_id:'t1',projetoId:'p1',titulo:'Assunto sensível',
    criadoPor:EU.email,responsavel:JULIA.email};
  const solta=Object.assign({},base);
  const dupla=Object.assign({},base,{visibilidade:'dupla'});
  const comGestor=Object.assign({},base,{visibilidade:'gestor'});
  t('sem marcação, segue o projeto', APP.visDaTarefa(solta)==='projeto');
  APP.setUsuario(JULIA);
  t('a Júlia vê a comum (projeto é da equipe)', APP.vejoTarefa(solta)===true);
  t('e vê a restrita, porque é a responsável', APP.vejoTarefa(dupla)===true);
  APP.setUsuario(GESTOR);
  t('o gestor vê a comum', APP.vejoTarefa(solta)===true);
  t('NÃO vê a "só nós dois"', APP.vejoTarefa(dupla)===false);
  t('mas vê a que o inclui', APP.vejoTarefa(comGestor)===true);
  APP.setUsuario(EU);
  t('quem criou vê sempre', APP.vejoTarefa(dupla)===true && APP.vejoTarefa(comGestor)===true);
  // a restricao da demanda e mais forte que a do projeto
  APP.setProjetos([Object.assign({},eq,{visibilidade:'equipe'})]);
  APP.setUsuario(JULIA);
  const deOutro=Object.assign({},base,{criadoPor:GESTOR.email,
    responsavel:GESTOR.email,visibilidade:'dupla'});
  t('projeto da equipe não abre demanda restrita de terceiros',
    APP.vejoTarefa(deOutro)===false);
  APP.setUsuario(EU);

  console.log('\n== 7) NO FORMULARIO E DEPOIS ==');
  APP.modalNovaTarefa(null,null);
  const f3=NODES['modal-card'].innerHTML;
  t('o campo aparece SEMPRE, não só ao criar projeto', /id="t-vis"/.test(f3));
  t('com as três opções', ['Como o projeto','Só nós dois e os gestores','Só nós dois']
    .every(l=>f3.includes(l)), Object.values(APP.VIS_TAREFA).map(v=>v.label).join(' | '));
  t('o padrão é seguir o projeto',
    f3.indexOf('Como o projeto') < f3.indexOf('Só nós dois'));
  CRIADOS.length=0;
  NODES['t-proj'].value='p1'; NODES['t-titulo'].value='Restrita';
  NODES['t-desc'].value=''; NODES['t-resp'].value=JULIA.email;
  NODES['f-prazo'].value=''; NODES['f-final'].value='';
  NODES['t-vis'].value='dupla';
  await APP.salvarTarefa(null);
  const tar=CRIADOS.find(c=>c.col==='pe_tarefas');
  t('a demanda nasce restrita', tar && tar.d.visibilidade==='dupla',
    tar?String(tar.d.visibilidade):'não criou');
  t('e não mexeu no projeto', !CRIADOS.some(c=>c.col==='pe_projetos'));
  APP.setTarefas([Object.assign({},base,{_id:'t9',visibilidade:'projeto'})]);
  APP.setUsuario(JULIA);
  await APP.mudarVisTarefa('t9','dupla');
  t('a responsável pode restringir depois', /Quem vê/.test(NODES['toast'].textContent),
    NODES['toast'].textContent);
  APP.setUsuario({email:'estranho@udiaco.com.br',nome:'Outro'});
  NODES['toast'].textContent='';
  await APP.mudarVisTarefa('t9','projeto');
  t('quem não é da dupla não mexe', /não é sua/.test(NODES['toast'].textContent),
    NODES['toast'].textContent);
  APP.setUsuario(EU);

  console.log('\n== 8) MINHAS TAREFAS: O ATALHO ==');
  APP.setProjetos([eq]);
  APP.setUsuario(EU);
  APP.modalNovaTarefa(null,null);
  const f4=NODES['modal-card'].innerHTML;
  t('a opção é a PRIMEIRA da lista de projetos',
    /<select id="t-proj"[^>]*><option value="__pessoal">/.test(f4),
    (f4.match(/<select id="t-proj"[\s\S]{0,120}/)||[''])[0]);
  t('e diz que é só sua', /Minhas tarefas \(só eu\)/.test(f4));
  // escolhendo, o responsavel fecha em mim e nao pede nome de projeto
  NODES['t-proj'].value='__pessoal';
  APP.atualizarFrentesModal();
  t('não pede nome de projeto novo', NODES['t-proj-novo'].style.display==='none');
  t('nem oferece visibilidade de projeto', NODES['t-proj-vis-linha'].style.display==='none');
  t('o responsável fecha em mim',
    (NODES['t-resp'].innerHTML.match(/<option/g)||[]).length===1
    && NODES['t-resp'].innerHTML.includes(EU.email),
    NODES['t-resp'].innerHTML.replace(/<[^>]*>/g,'|'));
  // a primeira demanda cria o projeto pessoal
  CRIADOS.length=0;
  NODES['t-titulo'].value='Coisa minha'; NODES['t-desc'].value='';
  NODES['t-resp'].value=EU.email; NODES['f-prazo'].value=''; NODES['f-final'].value='';
  NODES['t-vis'].value='projeto';
  await APP.salvarTarefa(null);
  const pp=CRIADOS.find(c=>c.col==='pe_projetos');
  t('criou o projeto pessoal', !!pp && pp.d.nome===APP.PROJ_PESSOAL, pp?pp.d.nome:'não criou');
  t('privado', pp && pp.d.visibilidade==='privado');
  t('marcado como pessoal', pp && pp.d.pessoal===true);
  t('e com você como dono', pp && pp.d.dono===EU.email);
  const tp=CRIADOS.find(c=>c.col==='pe_tarefas');
  t('a demanda foi para dentro dele', !!tp);
  // da segunda vez, reaproveita: nao cria outro
  APP.setProjetos([eq, Object.assign({_id:'pp1'}, pp.d)]);
  t('encontra o meu pessoal', APP.meuProjetoPessoal()._id==='pp1');
  CRIADOS.length=0;
  NODES['t-proj'].value='__pessoal'; NODES['t-titulo'].value='Outra coisa minha';
  await APP.salvarTarefa(null);
  t('não cria um segundo', !CRIADOS.some(c=>c.col==='pe_projetos'),
    JSON.stringify(CRIADOS.map(c=>c.col)));
  t('e a demanda vai para o que já existe',
    CRIADOS.find(c=>c.col==='pe_tarefas').d.projetoId==='pp1');
  // o pessoal de um nao aparece para o outro
  APP.setUsuario(JULIA);
  t('o pessoal do outro não é meu', APP.meuProjetoPessoal()===null);
  t('e ela não o enxerga', APP.vejoProjeto(Object.assign({_id:'pp1'}, pp.d))===false);
  APP.modalNovaTarefa(null,null);
  t('a lista dela não mostra o pessoal alheio',
    !/Minhas tarefas \(só eu\)<\/option>[\s\S]{0,40}Minhas tarefas/.test(NODES['modal-card'].innerHTML));
  APP.setUsuario(EU);

  console.log('\n'+(fail?'FALHAS: '+fail+' | ok: '+ok:'TUDO OK ('+ok+' checagens)'));
  process.exit(fail?1:0);
})();
