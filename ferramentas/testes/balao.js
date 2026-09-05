// O hover do descritivo, disparando EVENTOS de verdade em vez de conferir
// markup. Simula closest(), addEventListener e o despacho no documento.
const fs=require('fs');
const SRC=fs.readFileSync('/Users/acmags/rhudi/comercial.js','utf8');
const HTML=fs.readFileSync('/Users/acmags/rhudi/comercial.html','utf8');
let ok=0, fail=0;
const t=(n,c,x)=>{ if(c){ok++;console.log('  ok   '+n);} else {fail++;console.log('  FALHA '+n+(x?'  -> '+x:''));} };

const NODES={};
function mkEl(id){ return { id,_html:'',style:{},className:'',textContent:'',value:'',
  _attrs:{}, _pai:null, dataset:{}, files:[],
  classList:{_s:new Set(),add(...c){c.forEach(x=>this._s.add(x))},
    remove(...c){c.forEach(x=>this._s.delete(x))}, contains(c){return this._s.has(c)}},
  get innerHTML(){return this._html}, set innerHTML(v){this._html=String(v)},
  offsetWidth:300, offsetHeight:120,
  setAttribute(k,v){this._attrs[k]=String(v)}, getAttribute(k){return this._attrs[k]??null},
  // closest sobe pela cadeia de pais, como no navegador
  closest(sel){
    const m=String(sel).match(/^\[([^\]=]+)\]$/);
    let n=this;
    while(n){ if(m && n._attrs && n._attrs[m[1]]!==undefined) return n; n=n._pai; }
    return null;
  },
  addEventListener(){}, removeEventListener(){}, appendChild(c){c._pai=this;return c},
  insertAdjacentHTML(){}, remove(){}, querySelector(){return null}, querySelectorAll(){return[]},
  focus(){}, click(){} }; }

// documento com despacho de eventos
const OUVINTES={};
const document={
  getElementById(id){ return NODES[id]||null; },
  createElement(tg){ return mkEl('novo-'+tg); },
  addEventListener(tipo,fn){ (OUVINTES[tipo]=OUVINTES[tipo]||[]).push(fn); },
  removeEventListener(){},
  querySelector(){return null}, querySelectorAll(){return[]},
  body:mkEl('body'), head:mkEl('head'), documentElement:mkEl('html'),
  cookie:'', readyState:'complete',
  disparar(tipo, ev){ (OUVINTES[tipo]||[]).forEach(f=>f(ev)); }
};
document.body.appendChild=e=>{ NODES[e.id]=e; e._pai=document.body; return e; };
const window={ _firebaseReady:false,_auth:{},_col:n=>n,_doc:(c,i)=>({c,i}),
  _getDoc:()=>Promise.resolve({exists:()=>false}), _setDoc:()=>Promise.resolve(),
  _deleteDoc:()=>Promise.resolve(), _getDocs:()=>Promise.resolve({forEach(){}}),
  _onSnapshot:()=>()=>{}, _query:()=>({}), _onAuthStateChanged:()=>{},
  _signIn:()=>Promise.resolve(), _resetSenha:()=>Promise.resolve(), _signOut:()=>Promise.resolve(),
  addEventListener(){}, removeEventListener(){},
  innerWidth:1280, innerHeight:800,
  location:{origin:'',pathname:'/comercial.html'}, crypto:{getRandomValues:a=>a}, navigator:{} };
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
const exporta='return {'+['ligarBalao','mostrarDesc','moverDesc','esconderDesc','balao',
  'pintarDemandas','iniciar']
  .map(n=>n+':(typeof '+n+'!=="undefined"?'+n+':undefined)').join(',')
  +',setDemandas:v=>{demandas=v},setUsuario:v=>{usuario=v},setFiltro:v=>{filtroDem=v}};';
let APP;
try{ APP=new Function(...nomes, SRC+'\n'+exporta)(...nomes.map(n=>sandbox[n]));
  console.log('── CARGA ──'); t('comercial.js carregado',true);
}catch(e){ console.log('── CARGA ──'); t('comercial.js carregado',false,e.message); process.exit(1); }

console.log('\n══ 1) SEM ATRIBUTO INLINE ══');
t('nada de onmouseenter no HTML gerado', !/onmouseenter=/.test(SRC));
t('nada de onmouseleave', !/onmouseleave=/.test(SRC));
t('marca só com data-desc', /data-desc=/.test(SRC));
t('ligarBalao é chamado no início', /ligarBalao\(\);/.test(SRC));

console.log('\n══ 2) OS OUVINTES SÃO REGISTRADOS ══');
APP.setUsuario({email:'a@b.c'});
APP.ligarBalao();
t('mouseover registrado', (OUVINTES.mouseover||[]).length===1);
t('mouseout registrado', (OUVINTES.mouseout||[]).length===1);
t('mousemove registrado', (OUVINTES.mousemove||[]).length===1);

console.log('\n══ 3) O HOVER DE VERDADE ══');
APP.setDemandas([
  {_id:'d1',titulo:'Com texto',solicitante:'A',prioridade:0,status:'andamento',
   prazo:'2026-09-08',descricao:'primeira linha\nsegunda linha'},
  {_id:'d2',titulo:'Sem texto',solicitante:'A',prioridade:1,status:'andamento',prazo:'2026-09-08'},
]);
// monta a cadeia como no DOM: span dentro de td dentro de tr
const span=mkEl('span1'); span.setAttribute('data-desc','d1');
const td=mkEl('td1'); const tr=mkEl('tr1');
span._pai=td; td._pai=tr; tr._pai=document.body;
const textoNo=mkEl('texto'); textoNo._pai=span;   // o mouse cai no nó de texto

document.disparar('mouseover', {target:textoNo, clientX:200, clientY:300});
const b=NODES['balao'];
t('balão criado no primeiro hover', !!b);
t('ficou visível', b.classList.contains('balao--on'));
t('traz título e descritivo', b.textContent==='Com texto'+String.fromCharCode(10,10)+'primeira linha\nsegunda linha',
  JSON.stringify(b.textContent));
t('posicionado perto do mouse', b.style.left==='214px', 'left='+b.style.left);
t('e abaixo do cursor', b.style.top==='314px', 'top='+b.style.top);

console.log('\n── acompanha o mouse ──');
document.disparar('mousemove', {target:textoNo, clientX:400, clientY:200});
t('seguiu', b.style.left==='414px', 'left='+b.style.left);

console.log('\n── vira para cima quando não cabe embaixo ──');
document.disparar('mousemove', {target:textoNo, clientX:400, clientY:750});
t('subiu', Number(String(b.style.top).replace('px',''))<750, 'top='+b.style.top);

console.log('\n── não escapa pela direita ──');
document.disparar('mousemove', {target:textoNo, clientX:1270, clientY:300});
t('encaixou na tela', Number(String(b.style.left).replace('px',''))<=1280-300-14,
  'left='+b.style.left);

console.log('\n── sai ao afastar ──');
document.disparar('mouseout', {target:textoNo, clientX:400, clientY:300});
t('escondeu', !b.classList.contains('balao--on'));

console.log('\n── quem não tem descritivo não abre ──');
const span2=mkEl('span2');   // sem data-desc
span2._pai=td;
document.disparar('mouseover', {target:span2, clientX:100, clientY:100});
t('segue escondido', !b.classList.contains('balao--on'));
// e com data-desc de quem não tem texto
// sem descritivo o balão ainda serve para o título; o que evita ruído é a
// linha não ser marcada quando o título é curto (coberto em sprints.js)
const span3=mkEl('span3'); span3.setAttribute('data-desc','d2'); span3._pai=td;
document.disparar('mouseover', {target:span3, clientX:100, clientY:100});
t('com data-desc e só título, mostra o título', NODES['balao'].textContent==='Sem texto',
  JSON.stringify(NODES['balao'].textContent));
document.disparar('mouseout', {target:span3, clientX:100, clientY:100});

console.log('\n── mousemove longe do nome fecha ──');
document.disparar('mouseover', {target:textoNo, clientX:200, clientY:300});
t('abriu de novo', b.classList.contains('balao--on'));
document.disparar('mousemove', {target:span2, clientX:600, clientY:400});
t('fechou ao passar por fora', !b.classList.contains('balao--on'));

console.log('\n── um balão só, reaproveitado ──');
let criados=0;
const criarOrig=document.createElement;
document.createElement=tg=>{ criados++; return criarOrig(tg); };
document.disparar('mouseover', {target:textoNo, clientX:200, clientY:300});
document.disparar('mouseout', {target:textoNo, clientX:200, clientY:300});
document.disparar('mouseover', {target:textoNo, clientX:200, clientY:300});
t('não cria um novo a cada hover', criados===0, 'criados='+criados);

console.log('\n══ 4) SEGURANÇA E CSS ══');
t('texto entra por textContent', /b\.textContent=txt/.test(SRC));
t('não usa innerHTML no balão', !/\bb\.innerHTML/.test(SRC));
t('CSS do balão existe', /\.balao\{/.test(HTML));
t('só aparece com a classe --on', /\.balao--on\{ opacity:1 \}/.test(HTML));
t('nasce fora da tela', /\.balao\{[\s\S]{0,400}left:-9999px/.test(HTML));

console.log('\n'+(fail?'>>> FALHOU: '+fail+' de '+(ok+fail):'>>> TODOS OS '+ok+' TESTES PASSARAM'));
process.exit(fail?1:0);
