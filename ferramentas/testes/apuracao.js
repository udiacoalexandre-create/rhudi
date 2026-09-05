// Import da apuracao de ponto no Premio de Assiduidade: o que o parser le,
// e o que ele faz quando NAO consegue ler o tempo.
const fs=require('fs');
const SRC=fs.readFileSync('/Users/acmags/rhudi/app.js','utf8');
let ok=0, fail=0;
const t=(n,c,x)=>{ if(c){ok++;console.log('  ok   '+n);} else {fail++;console.log('  FALHA '+n+(x?'  -> '+x:''));} };

const NODES={}; const TOASTS=[];
function mkEl(id){ return { id,_html:'',style:{cssText:'',display:''},className:'',textContent:'',value:'',
  checked:false,dataset:{},children:[],
  classList:{add(){},remove(){},contains(){return false}},
  get innerHTML(){return this._html}, set innerHTML(v){this._html=String(v)},
  addEventListener(){},removeEventListener(){},appendChild(c){this.children.push(c);return c},
  insertAdjacentHTML(p,h){this._html+=h},remove(){},
  querySelectorAll(){return[]},querySelector(){return null},closest(){return null},
  focus(){},click(){},setAttribute(){},getAttribute(){return null} }; }
const document={ _body:mkEl('body'),
  getElementById(id){ return NODES[id]||(NODES[id]=mkEl(id)); },
  querySelector(){return null}, querySelectorAll(){return[]},
  createElement(tg){return mkEl('el-'+tg)}, addEventListener(){}, removeEventListener(){},
  get body(){return this._body}, head:mkEl('head'), documentElement:mkEl('html'),
  cookie:'', readyState:'complete' };
const localStorage={_d:{},getItem(k){return this._d[k]??null},setItem(k,v){this._d[k]=String(v)},removeItem(){},clear(){}};
const window={ _firebaseReady:true,_db:{},_auth:{}, _doc:(...a)=>({path:a.join('/')}),
  _writeBatch:()=>({set(){},update(){},delete(){},commit(){return Promise.resolve()}}),
  _setDoc:()=>Promise.resolve(),_getDoc:()=>Promise.resolve({exists:()=>false,data:()=>({})}),
  _getDocs:()=>Promise.resolve({docs:[]}),_deleteDoc:()=>Promise.resolve(),
  _collection:()=>({}),_query:()=>({}),_onAuthStateChanged:()=>{},_signOut:()=>{},
  addEventListener(){},removeEventListener(){},matchMedia:()=>({matches:false,addEventListener(){}}),
  location:{href:''},navigator:{userAgent:'node',clipboard:{writeText:()=>Promise.resolve()}} };
window.window=window;
const sandbox={ window,document,localStorage,sessionStorage:localStorage,
  setTimeout:()=>0,setInterval:()=>0,clearTimeout:()=>{},clearInterval:()=>{},
  console,alert:()=>{},confirm:()=>true,prompt:()=>null,fetch:()=>Promise.reject(new Error('x')),
  XLSX:{utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{}},writeFile:()=>{}},
  ExcelJS:{Workbook:function(){}},JSZip:function(){},pdfjsLib:{},
  navigator:window.navigator,
  Intl,Date,Math,JSON,Object,Array,String,Number,Boolean,RegExp,Error,Promise,Set,Map,
  isNaN,parseInt,parseFloat,encodeURIComponent,decodeURIComponent,
  btoa:s=>Buffer.from(s).toString('base64'),atob:s=>Buffer.from(s,'base64').toString(),
  Blob:function(){},URL:{createObjectURL:()=>'x',revokeObjectURL(){}},FileReader:function(){},
  structuredClone:o=>JSON.parse(JSON.stringify(o)) };
const nomes=Object.keys(sandbox);
const API=['parsearApuracaoTexto','montarTabelaPremio','_apuDiag','_apuAmostraCodigos',
  'hhmm2min','min2str','APURACAO_MAP','renderPremioLinhas','toast',
  '_apuTextoDaPagina','_apuSepararTotais','_apuConferirTotais'];
const exporta='return {'+API.map(n=>n+':(typeof '+n+'!=="undefined"?'+n+':undefined)').join(',')
  +',setColabs:v=>{colaboradores=v},setUsuario:v=>{usuarioAtual=v}'
  +',getState:()=>premioState,setState:v=>{premioState=v}};';
let APP;
console.log('-- CARGA --');
try{ APP=new Function(...nomes, SRC+'\n'+exporta)(...nomes.map(n=>sandbox[n]));
  t('app.js carregado',true);
}catch(e){ t('app.js carregado',false,e.message); process.exit(1); }
APP.setUsuario({email:'ale@udiaco.com.br',papel:'master'});

// base minima: tres pessoas que participam do premio
APP.setColabs([
  {_id:'c1', mat:'10000990', nome:'ANA PAULA SOUZA',   status:'Trabalhando', filtro:'OK', empresa:'1000'},
  {_id:'c2', mat:'10001234', nome:'BRUNO SENA',        status:'Trabalhando', filtro:'OK', empresa:'1000'},
  {_id:'c3', mat:'10005678', nome:'CARLA DIAS',        status:'Trabalhando', filtro:'OK', empresa:'1000'},
]);
const st=APP.getState();
st.competencia='2026-08'; st.passo=3;

const prev=()=>{ NODES['prevv']=mkEl('prevv'); return NODES['prevv']; };
const linhaDe=nome=>APP.getState().tabela.find(r=>r.nome===nome);

// ── o formato que o relatorio da Senior imprime hoje ─────────────────────
const BOM=[
  '1000.0990 ANA PAULA SOUZA Total Colaborador:',
  '103 ATRASOS 000:25 101 SAIDA ANTECIPADA 000:10',
  '1000.1234 BRUNO SENA Total Colaborador:',
  '015 FALTAS 008:00 014 ATESTADO 016:00 108 ABONO 001:00',
  '1000.5678 CARLA DIAS Total Colaborador:',
  '020 ATRASO HORAS 002:30 064 ADIC NOTURNO 000:45 107 FALTA PARCIAL 003:00',
].join(' ');

console.log('\n== 1) O FORMATO ATUAL CONTINUA SENDO LIDO ==');
let p=prev();
APP.parsearApuracaoTexto(BOM, p);
t('cruzou os 3 com a base', APP.getState().apontCasados===3, String(APP.getState().apontCasados));
t('atraso da Ana em minutos', linhaDe('ANA PAULA SOUZA').atraso===25, String(linhaDe('ANA PAULA SOUZA').atraso));
t('saida antecipada da Ana', linhaDe('ANA PAULA SOUZA').saida===10);
t('falta do Bruno (8h)', linhaDe('BRUNO SENA').faltas===480, String(linhaDe('BRUNO SENA').faltas));
t('atestado do Bruno (16h)', linhaDe('BRUNO SENA').atestado===960);
t('abono do Bruno (1h)', linhaDe('BRUNO SENA').abono===60);
t('atraso em horas da Carla', linhaDe('CARLA DIAS').aHoras===150, String(linhaDe('CARLA DIAS').aHoras));
t('adicional noturno da Carla', linhaDe('CARLA DIAS').aNoturno===45);
t('falta parcial da Carla', linhaDe('CARLA DIAS').faltaParcial===180);
t('quem nao tem ocorrencia fica zerado', linhaDe('ANA PAULA SOUZA').faltas===0);
t('a tela avisa quantos tem ocorrencia de ponto', /3<\/strong> com ocorrência de ponto/.test(p.innerHTML),
  p.innerHTML.replace(/<[^>]*>/g,' ').slice(0,200));
t('e diz que importou', /Apuração importada/.test(p.innerHTML));

console.log('\n== 2) CODIGOS SEM TEMPO: NAO PODE PASSAR COMO SUCESSO ==');
// era o furo: nomes lidos, tempos nao, e a tela dizia "importado" em verde
const guardado=JSON.parse(JSON.stringify(APP.getState().tabela.map(r=>({n:r.nome,f:r.faltas}))));
const SEM_TEMPO=[
  '1000.0990 ANA PAULA SOUZA Total Colaborador: 103 ATRASOS 0:25 101 SAIDA ANTECIPADA 0:10',
  '1000.1234 BRUNO SENA Total Colaborador: 015 FALTAS 8:00 014 ATESTADO 16:00',
].join(' ');
p=prev();
APP.parsearApuracaoTexto(SEM_TEMPO, p);
t('nao diz que importou', !/Apuração importada/.test(p.innerHTML));
t('avisa que nenhum tempo foi extraido', /nenhum tempo de ponto<\/strong>/.test(p.innerHTML),
  p.innerHTML.replace(/<[^>]*>/g,' ').slice(0,240));
t('explica a consequencia (prêmio como se nao houvesse ocorrencia)',
  /não houvesse ocorrência/.test(p.innerHTML));
t('mostra o diagnostico', /Diagnóstico da leitura/.test(p.innerHTML));
t('NAO substitui a apuracao boa que ja estava carregada',
  JSON.stringify(APP.getState().tabela.map(r=>({n:r.nome,f:r.faltas})))===JSON.stringify(guardado),
  'a tabela foi sobrescrita');

console.log('\n== 3) O DIAGNOSTICO MOSTRA COMO O CODIGO APARECE ==');
const am=APP._apuAmostraCodigos(SEM_TEMPO);
t('mostra o trecho em volta do codigo', /ATRASOS 0:25/.test(am), am.replace(/<[^>]*>/g,' ').slice(0,200));
t('marca o codigo cujo tempo NAO foi lido', /tempo NÃO lido/.test(am));
t('cita o campo de cada codigo', /atraso|faltas/.test(am));
const am2=APP._apuAmostraCodigos(BOM);
t('no formato bom, marca como lido', /tempo lido/.test(am2) && !/tempo NÃO lido/.test(am2),
  am2.replace(/<[^>]*>/g,' ').slice(0,160));
t('sem nenhum codigo, diz isso', /Nenhum dos códigos/.test(APP._apuAmostraCodigos('texto qualquer 1000.0990 ANA')));
t('a amostra entra no diagnostico', /Como cada código aparece/.test(APP._apuDiag(SEM_TEMPO,'x')));

console.log('\n== 4) AS OUTRAS FALHAS DE LEITURA CONTINUAM AVISANDO ==');
p=prev();
APP.parsearApuracaoTexto('relatorio sem matricula nenhuma 10000990 ANA', p);
t('sem matricula 0000.0000, avisa', /nenhuma matrícula no formato/.test(p.innerHTML),
  p.innerHTML.replace(/<[^>]*>/g,' ').slice(0,160));
t('e mostra o diagnostico', /Diagnóstico da leitura/.test(p.innerHTML));
p=prev();
APP.setColabs([{_id:'z', mat:'99999999', nome:'FORA DA BASE', status:'Trabalhando', filtro:'OK'}]);
APP.parsearApuracaoTexto(BOM, p);
t('matricula que nao bate com a base, avisa', /nenhuma<\/strong> matrícula bateu com a base/.test(p.innerHTML),
  p.innerHTML.replace(/<[^>]*>/g,' ').slice(0,160));

console.log('\n== 5) CONVERSAO DE TEMPO ==');
t('000:25 = 25 min', APP.hhmm2min('000:25')===25);
t('008:00 = 480 min', APP.hhmm2min('008:00')===480);
t('016:00 = 960 min', APP.hhmm2min('016:00')===960);
t('vazio = 0', APP.hhmm2min('')===0 && APP.hhmm2min(null)===0);
t('25 min na tela', APP.min2str(25)==='25min', APP.min2str(25));
t('480 min na tela', APP.min2str(480)==='8h 00min', APP.min2str(480));
t('zero vira travessao', APP.min2str(0)==='—');

console.log('\n== 6) TEXTO FATIADO DO PDF (a causa do problema real) ==');
// O HRAP001.APU sai com o tempo partido em dois pedacos: '024:3' e '0'.
// Juntar com espaco virava '024:3 0' e NENHUM tempo era lido.
const it=(s,x,y,w)=>({str:s, width:w==null?s.length*6:w, transform:[1,0,0,1,x,y]});
const PAGINA=[
  it('1000.0966',16.2,656.04,40), it('ANDRE DA SILVA RODRIGUES',70.9,656.04,110),
  it('015',305,637.68,13), it('Faltas',329.2,637.68,24),
  it('024:3',477.2,637.68,19.7), it('0',496.9,637.68,5),
  it('T',191.3,636.96,7), it('o',198.6,636.96,7), it('t',205.8,636.96,3),
  it('a',209.5,636.96,6), it('l',216,636.96,3),
  it('101',305,626.64,13), it('Sa',329.2,626.64,9), it('í',338.6,626.64,2),
  it('da Antecipada',340.8,626.64,60),
  it('008:2',477.3,626.64,19.6), it('0',496.9,626.64,5),
];
const remont=APP._apuTextoDaPagina(PAGINA);
t('remonta o tempo partido em um só', /024:30/.test(remont), remont.replace(/\n/g,' | '));
t('nao deixa o tempo fatiado', !/024:3 0/.test(remont));
t('cada situacao virou uma linha', remont.split('\n').length===4, remont.split('\n').length+' linhas');
t('codigo e tempo na mesma linha',
  /^015 Faltas 024:30$/m.test(remont) && /^101 Sa.da Antecipada 008:20$/m.test(remont),
  remont.replace(/\n/g,' | '));
t('a matricula fica na propria linha', /^1000\.0966 ANDRE DA SILVA RODRIGUES$/m.test(remont));
t('linha de cima vem primeiro', remont.indexOf('1000.0966')<remont.indexOf('015'));
t('o rotulo colado (letra por letra) nao entra no meio do tempo',
  !/0 2 4/.test(remont) && /Total/.test(remont), remont.replace(/\n/g,' | '));
// o jeito antigo, para deixar registrado que ele NAO servia
const plano=PAGINA.map(i=>i.str).join(' ');
t('o modo antigo produzia o tempo quebrado', /024:3 0/.test(plano));
t('e nao produzia nenhum tempo legivel', !/\b\d{3}:\d{2}\b/.test(plano));
// ponta a ponta: o texto remontado atravessa o parser
p=prev();
APP.setColabs([{_id:'a', mat:'10000966', nome:'ANDRE DA SILVA RODRIGUES',
  status:'Trabalhando', filtro:'OK', empresa:'1000'}]);
APP.parsearApuracaoTexto(remont, p);
t('do PDF fatiado ate a tabela: faltas', linhaDe('ANDRE DA SILVA RODRIGUES').faltas===1470,
  String(linhaDe('ANDRE DA SILVA RODRIGUES').faltas));
t('do PDF fatiado ate a tabela: saida', linhaDe('ANDRE DA SILVA RODRIGUES').saida===500);

console.log('\n== 7) TOTAL GERAL NAO PODE CAIR NO ULTIMO COLABORADOR ==');
// O relatorio fecha com um bloco que repete cada codigo com o somatorio do
// arquivo. Como o fatiamento ia ate o fim do texto, esse bloco entrava no
// ultimo colaborador e DOBRAVA os numeros dele.
const COM_RODAPE=[
  '1000.0453 ADRIANA SOUSA FERREIRA',
  '103 Atraso 005:43',
  'Total Colaborador:',
  '1011.0005 LEONARDO SANTOS DE CARVALHO',
  '015 Faltas 008:00',
  'Total Colaborador:',
  '103 Atraso 000:40',
  'HRAP001.APU - 04/09/2026 - 07:30:41 UDIACO Usuário: daiana.rolim',
  'Apuração Colaborador Pag.: 16',
  '014 Atestado 1555:19',
  'Total Geral:',
  '015 Faltas 1486:22',
  '020 Atestado Horas 023:24',
  '064 Atestado Noturno 232:25',
  '101 Saída Antecipada 105:27',
  '103 Atraso 104:31',
  '107 Falta Parcial 012:48',
  '108 Abono Gestor 017:00',
].join('\n');
const sep=APP._apuSepararTotais(COM_RODAPE);
t('separou o rodape do corpo', !!sep.totais);
t('o corpo nao tem mais o Total Geral', !/Total Geral/.test(sep.corpo));
t('o corpo termina no ultimo colaborador', /103 Atraso 000:40/.test(sep.corpo));
t('o codigo que abre o rodape saiu do corpo', !/1555:19/.test(sep.corpo),
  (sep.corpo.match(/.*1555.*/)||[''])[0]);
t('leu os 8 totais do relatorio', Object.keys(sep.totais).length===8,
  Object.keys(sep.totais).join(','));
t('total de horas com 4 digitos tambem e lido', sep.totais.atestado===1555*60+19,
  String(sep.totais.atestado));
t('total do atraso', sep.totais.atraso===104*60+31, String(sep.totais.atraso));

APP.setColabs([
  {_id:'a', mat:'10000453', nome:'ADRIANA SOUSA FERREIRA', status:'Trabalhando', filtro:'OK'},
  {_id:'l', mat:'10110005', nome:'LEONARDO SANTOS DE CARVALHO', status:'Trabalhando', filtro:'OK'},
]);
p=prev();
APP.parsearApuracaoTexto(COM_RODAPE, p);
const leo=linhaDe('LEONARDO SANTOS DE CARVALHO');
t('o ultimo do relatorio tem o valor DELE, nao o total geral',
  leo.faltas===480 && leo.atraso===40,
  'faltas='+leo.faltas+' atraso='+leo.atraso);
t('nao herdou nada dos outros codigos do rodape',
  leo.aHoras===0 && leo.aNoturno===0 && leo.saida===0 && leo.faltaParcial===0
    && leo.abono===0 && leo.atestado===0,
  JSON.stringify({h:leo.aHoras,n:leo.aNoturno,s:leo.saida,fp:leo.faltaParcial,ab:leo.abono,at:leo.atestado}));
t('o primeiro colaborador segue certo', linhaDe('ADRIANA SOUSA FERREIRA').atraso===343);
t('o rodape nao virou um colaborador', APP.getState().tabela.length===2);

console.log('\n== 8) CONFERENCIA CONTRA O TOTAL GERAL ==');
// so 2 dos 157 do arquivo estao aqui, entao o somatorio NAO deve conferir —
// e a tela tem de dizer isso, em vez de dar sucesso liso.
t('avisa que o somatorio nao confere', /não confere<\/strong>/.test(p.innerHTML),
  p.innerHTML.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,260));
t('diz o que leu contra o que o relatorio traz', /contra .* do relatório/.test(p.innerHTML));
t('mesmo assim importa (o dado lido esta certo)', /Apuração importada/.test(p.innerHTML));
// conferencia batendo: os totais do rodape iguais ao que foi lido
const conf=APP._apuConferirTotais(
  [{atraso:343, faltas:480}], {atraso:343, faltas:480});
t('quando bate, marca ok', conf.ok===true);
t('quando nao bate, aponta o campo',
  APP._apuConferirTotais([{atraso:100}],{atraso:343}).linhas[0].dif===-243);
t('sem rodape, nao inventa conferencia', APP._apuConferirTotais([{atraso:1}],null)===null);
p=prev();
APP.setColabs([{_id:'a', mat:'10000990', nome:'ANA PAULA SOUZA', status:'Trabalhando', filtro:'OK'}]);
APP.parsearApuracaoTexto('1000.0990 ANA PAULA SOUZA\n103 Atraso 000:25', p);
t('arquivo sem Total Geral diz que nao houve como conferir',
  /não houve como conferir/.test(p.innerHTML),
  p.innerHTML.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,200));

console.log('\n'+(fail?'FALHAS: '+fail+' | ok: '+ok:'TUDO OK ('+ok+' checagens)'));
process.exit(fail?1:0);
