// Remuneracao Variavel: faixas, planilha da lista, percentuais, total e Caju.
const fs=require('fs');
const SRC=fs.readFileSync('/Users/acmags/rhudi/app.js','utf8');
const RULES=fs.readFileSync('/Users/acmags/rhudi/firestore.rules','utf8');
let ok=0, fail=0;
const t=(n,c,x)=>{ if(c){ok++;console.log('  ok   '+n);} else {fail++;console.log('  FALHA '+n+(x?'  -> '+x:''));} };

const NODES={};
const AUTO=/^(rv-|rvinc-)/;
function mkEl(id){ return { id,_html:'',style:{},className:'',textContent:'',value:'',checked:false,
  disabled:false,dataset:{},children:[],files:[],
  classList:{add(){},remove(){},contains(){return false}},
  get innerHTML(){return this._html}, set innerHTML(v){this._html=String(v)},
  addEventListener(){},removeEventListener(){},appendChild(c){return c},
  insertAdjacentHTML(p,h){this._html+=h},remove(){delete NODES[this.id]},
  querySelector(){return null},querySelectorAll(){return[]},closest(){return null},
  focus(){},click(){},setAttribute(){},getAttribute(){return null} }; }
const document={ getElementById(id){ if(NODES[id])return NODES[id]; if(AUTO.test(id))return (NODES[id]=mkEl(id)); return null; },
  querySelector(){return null}, querySelectorAll(){return[]},
  createElement(tg){const e=mkEl('el-'+tg);e.href='';e.download='';return e;},
  addEventListener(){}, removeEventListener(){}, body:mkEl('body'), head:mkEl('head'),
  documentElement:mkEl('html'), cookie:'', readyState:'complete' };
document.body.insertAdjacentHTML=function(p,h){this._html+=h};
const DB={}, GRAV=[];
const EXCEL={}, CSV={};
const window={ _firebaseReady:false,_db:{},_auth:{},_doc:(c,i)=>({c,i}),
  _setDoc:(r,d)=>{ (DB[r.c]=DB[r.c]||{})[r.i]=JSON.parse(JSON.stringify(d)); GRAV.push({c:r.c,i:r.i}); return Promise.resolve(); },
  _getDoc:r=>Promise.resolve({exists:()=>!!(DB[r.c]&&DB[r.c][r.i]), data:()=>DB[r.c]&&DB[r.c][r.i]}),
  _getDocs:()=>Promise.resolve({docs:[],forEach(){}}), _deleteDoc:()=>Promise.resolve(),
  _writeBatch:()=>({set(){},commit(){return Promise.resolve()}}),
  _collection:()=>({}),_query:()=>({}),_onAuthStateChanged:()=>{},_signOut:()=>{},
  addEventListener(){},removeEventListener(){},matchMedia:()=>({matches:false,addEventListener(){}}),
  location:{href:''},navigator:{userAgent:'node'} };
window.window=window;
const sandbox={ window, document, localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  sessionStorage:{getItem:()=>null,setItem(){}},
  setTimeout:(f,ms)=>{ if(!ms) f(); return 0; }, clearTimeout:()=>{}, setInterval:()=>0, clearInterval:()=>{},
  console, alert:()=>{}, confirm:()=>true, prompt:()=>null, fetch:()=>Promise.reject(new Error('x')),
  XLSX:{ utils:{ book_new:()=>({}), aoa_to_sheet:r=>{EXCEL.rows=r;return{}},
      book_append_sheet:()=>{}, sheet_to_json:()=>EXCEL.entrada||[] },
    writeFile:(w,n)=>{EXCEL.nome=n}, read:()=>({SheetNames:['a'],Sheets:{a:{}}}) },
  ExcelJS:{Workbook:function(){}}, JSZip:function(){}, pdfjsLib:{},
  FileReader:function(){ this.readAsArrayBuffer=()=>{ this.onload({target:{result:new Uint8Array(1)}}); }; },
  Blob:function(p){ CSV.txt=String(p&&p[0]||''); }, URL:{createObjectURL:()=>'x',revokeObjectURL(){}},
  Intl,Date,Math,JSON,Object,Array,String,Number,Boolean,RegExp,Error,Promise,Set,Map,
  isNaN,parseInt,parseFloat,encodeURIComponent,decodeURIComponent,
  btoa:s=>Buffer.from(s,'binary').toString('base64'), atob:s=>Buffer.from(s,'base64').toString('binary'),
  structuredClone:o=>JSON.parse(JSON.stringify(o)), Uint8Array, ArrayBuffer };
const nomes=Object.keys(sandbox);
const exporta='return {'+['RV_FAIXAS','rvValor','rvTotal','rvComValor','rvSemPercentual','rvFaixa',
  '_rvPct','pgRemVariavel','renderRV','rvIrPasso','rvDefinirComp','_rvAplicarPlanilha','rvRemover',
  'rvIncluir','rvSetPct','rvAplicarTodos','rvFecharCompetencia','rvExportarCaju','rvExportarExcel',
  'rvSalvar','rvCarregar','_rvBasePop','rvRenderPct','rvRenderPessoas','rvRenderFim','rvBaixarModelo',
  'MODULES','PAGES','CAJU_CSV_HEADER','fmtValCaju','brl','_rvForaDaPop','_rvSeloStatus','rvAbrirIncluir']
  .map(n=>n+':(typeof '+n+'!=="undefined"?'+n+':undefined)').join(',')
  +',getRV:()=>rvState,setRV:v=>{rvState=v}'
  +',setColabs:v=>{colaboradores=v},setUsuario:v=>{usuarioAtual=v}'
  +',setBases:v=>{basesSalvasList=v},setPage:v=>{currentPage=v}};';
let APP;
try{ APP=new Function(...nomes, SRC+'\n'+exporta)(...nomes.map(n=>sandbox[n]));
  console.log('── CARGA ──'); t('app.js carregado',true);
}catch(e){ console.log('── CARGA ──'); t('app.js carregado',false,e.message); process.exit(1); }
APP.setUsuario({email:'ana@udiaco.com.br',papel:'master'});
APP.setBases([{competencia:'8/2026',salvoEm:'2026-09-01T10:00:00Z'}]);
APP.setColabs([
  {_id:'1',mat:'10001149',nome:'Julia Santos',cpf:'40887471862',status:'Trabalhando',depto:'COP',filtro:'OK',elegibilidade:{}},
  {_id:'2',mat:'10002222',nome:'Bruno Lima',cpf:'11122233344',status:'Trabalhando',depto:'PCP',filtro:'OK',elegibilidade:{}},
  {_id:'3',mat:'10003333',nome:'Carla Souza',cpf:'55566677788',status:'Trabalhando',depto:'ADM',filtro:'OK',elegibilidade:{}},
  {_id:'4',mat:'10004444',nome:'Demitido Fora',cpf:'99988877766',status:'Demitido',depto:'ADM',filtro:'OK',elegibilidade:{}},
]);

(async()=>{
console.log('\n══ 1) AS FAIXAS ══');
t('três faixas declaradas', APP.RV_FAIXAS.length===3);
t('0% = R$ 0,00', APP.rvValor({percentual:0})===0);
t('50% = R$ 85,00', APP.rvValor({percentual:0.5})===85, 'v='+APP.rvValor({percentual:0.5}));
t('100% = R$ 270,00', APP.rvValor({percentual:1})===270, 'v='+APP.rvValor({percentual:1}));
t('NÃO interpola: 75% não vale nada', APP.rvValor({percentual:0.75})===0,
  'v='+APP.rvValor({percentual:0.75})+' (faixa não declarada)');
t('percentual vazio vale zero', APP.rvValor({percentual:''})===0);
t('sem percentual vale zero', APP.rvValor({})===0);
t('0,5 como texto também casa', APP.rvValor({percentual:'0.5'})===85);
t('exibe como porcentagem', APP._rvPct(0.5)==='50%', APP._rvPct(0.5));
t('100% sem decimal', APP._rvPct(1)==='100%');

console.log('\n══ 2) BASE E COMPETÊNCIA ══');
t('demitido fora da base', !APP._rvBasePop().some(c=>c.mat==='10004444'));
t('3 elegíveis', APP._rvBasePop().length===3, 'n='+APP._rvBasePop().length);
APP.setRV({passo:2,competencia:'',fechado:false,pessoas:[]});
NODES['rv-mes']=mkEl('rv-mes'); NODES['rv-mes'].value='9';
NODES['rv-ano']=mkEl('rv-ano'); NODES['rv-ano'].value='2026';
NODES['rv-conteudo']=mkEl('rv-conteudo'); NODES['rv-rodape']=mkEl('rv-rodape');
NODES['rv-tabs']=mkEl('rv-tabs');
APP.rvDefinirComp();
t('competência definida', APP.getRV().competencia==='9/2026', APP.getRV().competencia);

console.log('\n══ 3) PLANILHA DA LISTA INICIAL ══');
APP._rvAplicarPlanilha([
  ['Matricula','CPF','Nome','Percentual'],
  ['10001149','','Julia','1'],
  ['','11122233344','Bruno','0,5'],
  ['10003333','','Carla',''],
  ['99999999','','Ninguém','1'],
]);
const rv=APP.getRV();
t('3 casaram com a base', rv.pessoas.length===3, 'n='+rv.pessoas.length);
t('casou por matrícula', rv.pessoas.some(p=>p.mat==='10001149'));
t('casou por CPF', rv.pessoas.some(p=>p.mat==='10002222'));
t('percentual 1 aproveitado', rv.pessoas.find(p=>p.mat==='10001149').percentual===1);
t('percentual 0,5 com vírgula aproveitado', rv.pessoas.find(p=>p.mat==='10002222').percentual===0.5);
t('sem percentual fica vazio', rv.pessoas.find(p=>p.mat==='10003333').percentual==='');
t('quem não existe na base é avisado', /não encontrado/.test(NODES['rv-import-aviso']._html),
  NODES['rv-import-aviso']._html.slice(0,120));
t('total = 270 + 85', APP.rvTotal()===355, 'total='+APP.rvTotal());

console.log('\n── percentual em escala cheia (50 e 100) ──');
APP._rvAplicarPlanilha([['Matricula','Percentual'],['10001149','100'],['10002222','50']]);
t('100 vira 1', APP.getRV().pessoas.find(p=>p.mat==='10001149').percentual===1);
t('50 vira 0,5', APP.getRV().pessoas.find(p=>p.mat==='10002222').percentual===0.5);
t('total 355', APP.rvTotal()===355);

console.log('\n── planilha sem coluna reconhecível ──');
const antes=APP.getRV().pessoas.length;
APP._rvAplicarPlanilha([['Colaborador','Meta'],['Julia','1']]);
t('não mexe na lista', APP.getRV().pessoas.length===antes);

console.log('\n══ 4) ADICIONAR E REMOVER ══');
APP.rvIncluir('10003333');
t('incluiu', APP.getRV().pessoas.some(p=>p.mat==='10003333'));
APP.rvIncluir('10003333');
t('não duplica', APP.getRV().pessoas.filter(p=>p.mat==='10003333').length===1);
APP.rvRemover('10003333');
t('removeu', !APP.getRV().pessoas.some(p=>p.mat==='10003333'));

console.log('\n══ 5) PERCENTUAIS E TOTAL ══');
APP.rvSetPct('10001149',0.5);
t('trocou para 50%', APP.getRV().pessoas.find(p=>p.mat==='10001149').percentual===0.5);
t('total virou 170', APP.rvTotal()===170, 'total='+APP.rvTotal());
APP.rvSetPct('10001149','');
t('limpou o percentual', APP.getRV().pessoas.find(p=>p.mat==='10001149').percentual==='');
t('total caiu para 85', APP.rvTotal()===85);
t('conta quem está sem percentual', APP.rvSemPercentual()===1, 'n='+APP.rvSemPercentual());
APP.rvAplicarTodos(1);
t('aplicou 100% a todos', APP.getRV().pessoas.every(p=>p.percentual===1));
t('total 2 x 270', APP.rvTotal()===540, 'total='+APP.rvTotal());
APP.rvRenderPct();
const hp=NODES['rv-lista-pct']._html;
t('tabela mostra o valor por pessoa', /R\$\s?270,00/.test(hp), (hp.match(/R\$[^<]*/)||[''])[0]);
t('tem linha de total', /Total de 9\/2026/.test(hp));
t('percentual é lista suspensa', /<select onchange="rvSetPct/.test(hp));
t('só as faixas declaradas nas opções', (hp.match(/<option value="/g)||[]).length===2*4,
  'n='+(hp.match(/<option value="/g)||[]).length);

console.log('\n══ 6) FECHAR ══');
GRAV.length=0;
await APP.rvFecharCompetencia();
t('marcou como fechada', APP.getRV().fechado===true);
t('gravou a competência', !!(DB.remVariavel && DB.remVariavel['9_2026']));
const doc=DB.remVariavel['9_2026'];
t('guardou as pessoas', (doc.pessoas||[]).length===2);
t('guardou o total', doc.total===540);
t('guardou as faixas usadas', (doc.faixas||[]).length===3);
t('registrou quem fechou', !!doc.atualizadoPor);
t('entrou no histórico', !!(DB.historico && DB.historico['rv_9_2026']));
const h=DB.historico['rv_9_2026'];
t('histórico com rótulo próprio', h.beneficioLabel==='Remuneração Variável');
t('histórico com total e quantidade', h.total===540 && h.qtd===2);
t('histórico com o detalhe por pessoa', (h.detalhe||[]).length===2);

console.log('\n── fechada não deixa alterar ──');
APP.rvSetPct('10001149',0.5);
t('percentual travado', APP.getRV().pessoas.find(p=>p.mat==='10001149').percentual===1);
APP.rvRemover('10001149');
t('remoção travada', APP.getRV().pessoas.length===2);

console.log('\n══ 7) EXPORT CAJU ══');
CSV.txt='';
APP.rvExportarCaju();
const linhas=CSV.txt.replace(/^﻿/,'').split(String.fromCharCode(10));
t('cabeçalho igual ao dos outros benefícios', linhas[0]===APP.CAJU_CSV_HEADER);
t('2 linhas de dados', linhas.length===3, 'n='+(linhas.length-1));
const c1=linhas[1].split(';');
t('CPF com 11 dígitos', /^\d{11}$/.test(c1[0]), c1[0]);
t('matrícula na 2ª coluna', c1[1]==='10001149'||c1[1]==='10002222', c1[1]);
t('valor na coluna de Auxílio Alimentação', c1[2]==='270', 'v='+c1[2]);
t('13 colunas', c1.length===13, 'n='+c1.length);
t('demais benefícios em zero', c1.slice(3).every(x=>x==='0'));

console.log('\n── quem está em zero não vai para o Caju ──');
APP.setRV({passo:5,competencia:'9/2026',fechado:true,pessoas:[
  {mat:'1',nome:'Com valor',cpf:'11122233344',percentual:1},
  {mat:'2',nome:'Sem valor',cpf:'55566677788',percentual:0},
  {mat:'3',nome:'Sem percentual',cpf:'40887471862',percentual:''}]});
CSV.txt='';
APP.rvExportarCaju();
const l2=CSV.txt.replace(/^﻿/,'').split(String.fromCharCode(10));
t('só 1 linha de dados', l2.length===2, 'n='+(l2.length-1));
t('é o que tem valor', l2[1].startsWith('11122233344'));

console.log('\n══ 8) EXCEL E MODELO ══');
APP.rvExportarExcel();
t('nome do arquivo com a competência', /Remuneracao_Variavel_9_2026\.xlsx/.test(EXCEL.nome), EXCEL.nome);
t('cabeçalho tem Atingimento e Valor',
  EXCEL.rows[1].includes('Atingimento')&&EXCEL.rows[1].includes('Valor'));
t('primeira linha diz a competência', /Competência: 9\/2026/.test(EXCEL.rows[0][0]));
t('linha de total no fim', EXCEL.rows[EXCEL.rows.length-1].includes('Total'));
APP.rvBaixarModelo();
t('modelo baixa', /Modelo_Remuneracao_Variavel\.xlsx/.test(EXCEL.nome));
t('modelo pede matrícula ou CPF',
  EXCEL.rows[0].includes('Matricula')&&EXCEL.rows[0].includes('CPF'));

console.log('\n══ 9) REGISTRO NO APP ══');
t('página no menu de Premiação', APP.MODULES.premio.pages.some(p=>p.id==='rv-main'),
  JSON.stringify(APP.MODULES.premio.pages.map(p=>p.id)));
t('logo após o Prêmio Assiduidade',
  APP.MODULES.premio.pages.findIndex(p=>p.id==='rv-main')===1);
t('rota registrada', /'rv-main':pgRemVariavel/.test(SRC));
t('hook de abertura', /if\(id==='rv-main'\) afterRenderRV\(\)/.test(SRC));
t('regra do Firestore', /match \/remVariavel\/\{id\}/.test(RULES));
t('página usa o rodapé travado', /rv-rodape/.test(APP.pgRemVariavel())&&/lan-conteudo/.test(APP.pgRemVariavel()));
t('faixas explicadas no "?"', /class="ajuda"/.test(APP.pgRemVariavel()));
t('5 passos', /Base[\s\S]{0,400}Competência[\s\S]{0,200}Colaboradores[\s\S]{0,200}Percentuais[\s\S]{0,200}Fechar/.test(SRC));

console.log('\n══ 10) DEMITIDO NA PLANILHA — o caso da Marizan ══');
// ela existe na base, mas como Demitida
APP.setColabs([
  {_id:'1',mat:'10001149',nome:'Julia Santos',cpf:'40887471862',status:'Trabalhando',depto:'COP',filtro:'OK',elegibilidade:{}},
  {_id:'m',mat:'10070006',nome:'MARIZAN PEREIRA DOURADA',cpf:'42815737809',status:'Demitido',depto:'CAR 3',filtro:'OK',elegibilidade:{}},
  {_id:'af',mat:'10080088',nome:'Afastado Alguem',cpf:'12312312312',status:'Auxilio Doenca',depto:'PCP',filtro:'OK',elegibilidade:{}},
]);
APP.setRV({passo:3,competencia:'8/2026',fechado:false,pessoas:[]});
APP._rvAplicarPlanilha([['Matricula','Percentual'],['10001149','1'],['10070006','1'],['10080088','0,5']]);
const r2=APP.getRV();
t('os 3 entraram, inclusive a demitida', r2.pessoas.length===3, 'n='+r2.pessoas.length);
t('Marizan está na lista', r2.pessoas.some(p=>p.mat==='10070006'));
t('guardou o status dela', r2.pessoas.find(p=>p.mat==='10070006').status==='Demitido');
t('o percentual da planilha foi aproveitado', r2.pessoas.find(p=>p.mat==='10070006').percentual===1);
t('entra no total', APP.rvTotal()===270+270+85, 'total='+APP.rvTotal());
const av=NODES['rv-import-aviso']._html;
t('NÃO diz mais "não encontrado" para ela', !/não encontrado/.test(av), av.slice(0,200));
t('avisa que há status que normalmente não recebe', /normalmente não recebe/.test(av));
t('nomeia quem é, com o status', /MARIZAN PEREIRA DOURADA \(Demitido\)/.test(av),
  (av.match(/MARIZAN[^,·<]*/)||[''])[0]);
t('cita o afastado também', /Afastado Alguem \(Auxílio Doença\)/.test(av),
  (av.match(/Afastado Alguem[^,·<]*/)||[''])[0]);
t('alerta é de atenção, não de sucesso', /alert-warning/.test(av));

console.log('\n── o selo aparece nas telas ──');
t('demitido tem selo', /badge--danger/.test(APP._rvSeloStatus({status:'Demitido'})));
t('afastado tem selo', /badge--warning/.test(APP._rvSeloStatus({status:'Auxilio Doenca'})));
t('quem trabalha não tem selo', APP._rvSeloStatus({status:'Trabalhando'})==='');
APP.rvRenderPessoas();
t('passo 3 mostra o selo', /MARIZAN PEREIRA DOURADA <span class="badge badge--danger/.test(NODES['rv-lista-pessoas']._html),
  (NODES['rv-lista-pessoas']._html.match(/MARIZAN[^<]*<span[^>]*>[^<]*/)||[''])[0]);
APP.rvRenderPct();
t('passo 4 mostra o selo', /MARIZAN[^<]*<span class="badge/.test(NODES['rv-lista-pct']._html));
APP.rvRenderFim();
t('passo 5 mostra o selo', /MARIZAN[^<]*<span class="badge/.test(NODES['rv-lista-fim']._html));
t('passo 4 conta os demitidos/afastados', /demitido\/afastado/.test(SRC));

console.log('\n── quem não existe mesmo continua sendo avisado ──');
APP._rvAplicarPlanilha([['Matricula','Percentual'],['10001149','1'],['99999999','1']]);
t('1 entrou', APP.getRV().pessoas.length===1);
t('avisa o não encontrado', /não encontrado/.test(NODES['rv-import-aviso']._html));
t('cita a matrícula', /99999999/.test(NODES['rv-import-aviso']._html));

console.log('\n── o picker também oferece demitido, com selo ──');
APP.setRV({passo:3,competencia:'8/2026',fechado:false,pessoas:[]});
document.body._html='';
APP.rvAbrirIncluir();
const pk=document.body._html;
t('oferece a demitida', /MARIZAN PEREIRA DOURADA/.test(pk));
t('com o selo do status', /MARIZAN[^<]*<span class="badge badge--danger/.test(pk));
APP.rvIncluir('10070006');
t('dá para incluir', APP.getRV().pessoas.some(p=>p.mat==='10070006'));

console.log('\n══ 11) A ABA DO MENU SUPERIOR ══');
const IHTML=fs.readFileSync('/Users/acmags/rhudi/index.html','utf8');
t('aba do módulo virou "Prêmios"', /tab-premio[\s\S]{0,140}> Prêmios\s/.test(IHTML),
  (IHTML.match(/tab-premio[\s\S]{0,150}/)||[''])[0].replace(/\s+/g,' ').slice(0,120));
t('não sobrou "Premio Assiduidade" na aba', !/mod-icon[^>]*>[^<]*<\/span> Premio Assiduidade/.test(IHTML));
t('a PÁGINA continua Premio Assiduidade',
  APP.MODULES.premio.pages.some(p=>p.id==='premio-main'&&/Premio Assiduidade/.test(p.label)),
  JSON.stringify(APP.MODULES.premio.pages.map(p=>p.label)));
t('e Remuneração Variável ao lado',
  APP.MODULES.premio.pages.some(p=>p.id==='rv-main'&&/Remuneração Variável/.test(p.label)));
t('elegibilidade do benefício segue com o nome cheio', /label:'Prêmio Assiduidade'/.test(SRC));
t('histórico segue rotulando o benefício', /Prêmio Assiduidade/.test(SRC));

console.log('\n'+(fail?'>>> FALHOU: '+fail+' de '+(ok+fail):'>>> TODOS OS '+ok+' TESTES PASSARAM'));
process.exit(fail?1:0);
})().catch(e=>{console.error("ERRO",e.stack);process.exit(1)});
