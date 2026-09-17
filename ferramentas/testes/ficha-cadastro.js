// A ficha do colaborador: quatro blocos, uma tela, sem perder nenhum campo
// que o resto do sistema le ou grava.
const fs=require('fs');
const SRC=fs.readFileSync('/Users/acmags/rhudi/app.js','utf8');
const HTML=fs.readFileSync('/Users/acmags/rhudi/index.html','utf8');
let ok=0, fail=0;
const t=(n,c,x)=>{ if(c){ok++;console.log('  ok   '+n);} else {fail++;console.log('  FALHA '+n+(x?'  -> '+x:''));} };

function mkEl(id){ return { id,_html:'',style:{},className:'',textContent:'',value:'',
  checked:false,dataset:{},files:[],
  classList:{_c:new Set(),add(x){this._c.add(x)},remove(x){this._c.delete(x)},
    toggle(x,v){ v?this._c.add(x):this._c.delete(x) },contains(x){return this._c.has(x)}},
  get innerHTML(){return this._html}, set innerHTML(v){this._html=String(v)},
  addEventListener(){},removeEventListener(){},appendChild(c){return c},
  insertAdjacentHTML(){},remove(){},querySelectorAll(){return[]},querySelector(){return null},
  closest(){return null},focus(){},click(){},setAttribute(){},getAttribute(){return null} }; }
const NODES={};
const document={ getElementById(id){ return NODES[id]||null; },
  querySelector(){return null},querySelectorAll(){return[]},createElement(){return mkEl('el')},
  addEventListener(){},removeEventListener(){},body:mkEl('body'),head:mkEl('head'),
  documentElement:mkEl('html'),cookie:'',readyState:'complete' };
const window={ _firebaseReady:false,_db:{},_auth:{},_doc:(...a)=>({p:a.join('/')}),
  _setDoc:()=>Promise.resolve(),_getDoc:()=>Promise.resolve({exists:()=>false,data:()=>({})}),
  _getDocs:()=>Promise.resolve({docs:[],forEach(){}}),_deleteDoc:()=>Promise.resolve(),
  _collection:()=>({}),_query:()=>({}),_onAuthStateChanged:()=>{},_signOut:()=>{},
  _writeBatch:()=>({set(){},update(){},delete(){},commit:()=>Promise.resolve()}),
  addEventListener(){},removeEventListener(){},matchMedia:()=>({matches:false,addEventListener(){}}),
  location:{href:'',hash:'',pathname:'/',search:''},history:{replaceState(){}},
  navigator:{userAgent:'node'} };
window.window=window;
const sandbox={ window,document,location:window.location,history:window.history,
  localStorage:{_d:{},getItem(k){return this._d[k]??null},setItem(k,v){this._d[k]=String(v)},removeItem(){}},
  sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  setTimeout:()=>0,setInterval:()=>0,clearTimeout:()=>{},clearInterval:()=>{},
  console,alert:()=>{},confirm:()=>true,prompt:()=>null,fetch:()=>Promise.reject(new Error('x')),
  XLSX:{utils:{}},ExcelJS:{Workbook:function(){}},JSZip:function(){},pdfjsLib:{},
  Intl,Date,Math,JSON,Object,Array,String,Number,Boolean,RegExp,Error,Promise,Set,Map,
  isNaN,parseInt,parseFloat,encodeURIComponent,decodeURIComponent,
  btoa:s=>Buffer.from(s).toString('base64'),atob:s=>Buffer.from(s,'base64').toString(),
  Blob:function(){},URL:{createObjectURL:()=>'x',revokeObjectURL(){}},FileReader:function(){},
  structuredClone:o=>JSON.parse(JSON.stringify(o)) };
const nomes=Object.keys(sandbox);
const API=['formColabHTML','elegCheckHTML','getColabFromForm','onElegChange','initFormDisplay',
  'toggleMob','naveColab','VT_LINHAS'];
let APP;
console.log('-- FICHA DO CADASTRO --');
try{
  APP=new Function(...nomes, SRC+'\nreturn {'
    +API.map(n=>n+':(typeof '+n+'!=="undefined"?'+n+':undefined)').join(',')
    +',setColabs:v=>{colaboradores=v}};')(...nomes.map(n=>sandbox[n]));
  t('app.js carregado',true);
}catch(e){ t('app.js carregado',false,e.message); process.exit(1); }

APP.setColabs([]);
const alguem={_id:'x1', mat:'10000001', nome:'MARIA DA SILVA', cpf:'12345678900',
  admissao:'2020-05-04', cargo:'ANALISTA', funcao:'ANALISTA FISCAL', nave:'Nave 02',
  depto:'FISCAL', status:'Trabalhando', filtro:'OK', diasFixos:22,
  ferVenc:'2027-05-03', ferMes:'Julho', ferSaldo:30, ferInicio:'2026-12-01', ferFim:'2026-12-20',
  vr:46, cafe:5, cesta:185, comb:400, vt1:9.6, v1:2, cod1:'', tp1:'', ben1:'',
  elegibilidade:{vr:true,cafe:true,cesta:true,mobilidade:true,vt:false,ferias:true,premio:true}};
const form=APP.formColabHTML('e', alguem);

console.log('\n== 1) NADA SE PERDEU ==');
t('sem ${prefix} cru sobrando no HTML', !/\$\{prefix\}/.test(form),
  (form.match(/\$\{prefix\}[a-z-]*/g)||[]).slice(0,4).join(' | '));
const precisa=['e-mat','e-nome','e-cpf','e-admissao','e-cargo','e-funcao','e-nave','e-depto',
  'e-status','e-filtro','e-dias-fixos','e-duplic-alert','e-fer-venc','e-fer-mes',
  'e-vr','e-cafe','e-cesta','e-mobilidade','e-comb','e-bloco-comb',
  'e-card-fer','e-card-vr','e-card-cafe','e-card-cesta','e-card-mob','e-card-vt']
  .concat([1,2,3,4].flatMap(n=>['e-vt-sel'+n,'e-vt-tp'+n,'e-vt-cod'+n,'e-vt-ben'+n,'e-vt'+n,'e-v'+n]))
  .concat(['vr','cafe','cesta','mobilidade','vt','ferias','premio','folhaCLT','folhaMEI']
    .map(k=>'e-eleg-'+k));
const faltando=precisa.filter(id=>form.indexOf('id="'+id+'"')<0);
t('todos os campos que o sistema lê continuam na ficha', !faltando.length, faltando.join(', '));
t('os valores chegam preenchidos',
  /id="e-mat" value="10000001"/.test(form) && /id="e-vr" value="46"/.test(form)
  && /value="Nave 02" selected/.test(form) && /value="Julho" selected/.test(form));

console.log('\n== 2) O QUE SAIU DA FICHA ==');
t('saldo de férias não se edita mais aqui', form.indexOf('id="e-fer-saldo"')<0);
t('nem o período em gozo',
  form.indexOf('id="e-fer-inicio"')<0 && form.indexOf('id="e-fer-fim"')<0);
t('nem o ano do agendamento, que é calculado', form.indexOf('id="e-fer-ano"')<0);
const blFer=form.slice(form.indexOf('e-card-fer'));
t('o bloco de férias tem função, nave, vencimento e mês — nada mais',
  (blFer.slice(0, blFer.indexOf('</div>\n        </div>'))
    .match(/<input type|<select /g)||[]).length===4,
  (blFer.match(/id="e-[a-z-]+"/g)||[]).join(' '));
t('função e nave saíram da identificação',
  form.indexOf('e-funcao') > form.indexOf('e-card-fer')
  && form.indexOf('e-nave') > form.indexOf('e-card-fer'));

console.log('\n== 3) SALVAR NÃO APAGA O QUE SAIU ==');
// A tela na memoria: so os campos que a ficha nova tem.
Object.keys(NODES).forEach(k=>delete NODES[k]);
const por=(id,v,chk)=>{ const el=mkEl(id); el.value=v==null?'':String(v);
  el.checked=!!chk; NODES[id]=el; return el; };
por('e-mat','10000001'); por('e-nome','maria da silva'); por('e-cpf','12345678900');
por('e-admissao','2020-05-04'); por('e-cargo','analista'); por('e-funcao','analista fiscal');
por('e-nave','Nave 02'); por('e-depto','FISCAL'); por('e-status','Trabalhando');
por('e-filtro','OK'); por('e-dias-fixos','22');
por('e-fer-venc','03/05'); por('e-fer-mes','Julho');
por('e-vr','46'); por('e-cafe','5'); por('e-cesta','185');
por('e-mobilidade','combustivel'); por('e-comb','400');
['vr','cafe','cesta','mobilidade','ferias','premio','folhaCLT'].forEach(k=>por('e-eleg-'+k,'',true));
['vt','folhaMEI'].forEach(k=>por('e-eleg-'+k,'',false));
const d=APP.getColabFromForm('e');
t('saldo, início e fim nem entram no que vai ser gravado',
  !('ferSaldo' in d) && !('ferInicio' in d) && !('ferFim' in d), Object.keys(d).join(','));
t('o resto do cadastro vem completo',
  d.nome==='MARIA DA SILVA' && d.funcao==='ANALISTA FISCAL' && d.nave==='Nave 02'
  && d.ferMes==='Julho' && d.vr===46 && d.comb===400 && d.diasFixos===22,
  JSON.stringify({n:d.nome,f:d.funcao,nv:d.nave,m:d.ferMes,vr:d.vr,cb:d.comb,df:d.diasFixos}));
t('o ano do agendamento é calculado sozinho', typeof d.ferAno==='number' && d.ferAno>=2026, ''+d.ferAno);
// O merge do salvar e Object.assign: o que nao esta na chave fica como estava.
const gravado=Object.assign({}, alguem, d);
t('o que está no Controle de Férias sobrevive ao salvar',
  gravado.ferSaldo===30 && gravado.ferInicio==='2026-12-01' && gravado.ferFim==='2026-12-20');

console.log('\n== 4) A TELA ==');
t('quatro blocos: identificação, férias, elegibilidade e valores',
  (form.match(/cad-bl__t">/g)||[]).length===4,
  (form.match(/cad-bl__t">[^<]*/g)||[]).join(' | '));
t('elegibilidade em fichas, sem os três títulos de grupo',
  /cad-eleg/.test(form) && (form.match(/cad-chip/g)||[]).length>=9
  && !/>Folha<\/div>/.test(form));
t('sem os textos de apoio que só ocupavam altura',
  !/Marque apenas os benefícios/.test(form)
  && !/Dados compartilhados com o módulo/.test(form)
  && !/Em branco: calculado da admissão/.test(form));
t('as explicações viraram mouse over', (form.match(/<label title="/g)||[]).length>=6,
  'labels com title: '+(form.match(/<label title="/g)||[]).length);
t('o estilo novo existe', /\.cad\{/.test(HTML) && /\.cad-chip\{/.test(HTML) && /\.cad-vt\{/.test(HTML));
t('a ficha abre em duas colunas', /\.cad\{ display:grid; grid-template-columns:1\.25fr 1fr/.test(HTML));
t('a grade tem seis colunas, com larguras por campo',
  /grid-template-columns:repeat\(6,1fr\)/.test(HTML) && /\.sp4\{ grid-column:span 4 \}/.test(HTML));
t('os rotulos nao sao mais cortados', !/text-overflow:ellipsis \}\n\.cad/.test(HTML)
  && !/cad-gr \.fg label\{[^}]*white-space:nowrap/.test(HTML));
t('as linhas fecham em seis colunas certinhas',
  (form.match(/class="fg sp(\d)"/g)||[]).length>=9);
t('e vira uma só no celular', /@media \(max-width:880px\)\{ \.cad\{ grid-template-columns:1fr \}/.test(HTML));

console.log('\n== 5) MOSTRAR E ESCONDER ==');
NODES['e-card-vr']=mkEl('e-card-vr'); NODES['e-card-vr'].classList.add('cad-ben');
NODES['e-card-mob']=mkEl('e-card-mob'); NODES['e-card-mob'].classList.add('cad-gr');
NODES['e-card-vt']=mkEl('e-card-vt');
APP.onElegChange('e','vr',true);
t('campo de benefício aparece como campo', NODES['e-card-vr'].style.display==='flex',
  NODES['e-card-vr'].style.display);
APP.onElegChange('e','vr',false);
t('e some quando desmarca', NODES['e-card-vr'].style.display==='none');
APP.onElegChange('e','mobilidade',true);
t('mobilidade aparece como grade', NODES['e-card-mob'].style.display==='grid');
t('e desliga o vale transporte, que é exclusivo',
  NODES['e-card-vt'].style.display==='none' && NODES['e-eleg-vt'].checked===false);

console.log('\n'+(fail?('FALHAS: '+fail+' | ok: '+ok):('TUDO OK ('+ok+' checagens)')));
process.exit(fail?1:0);
