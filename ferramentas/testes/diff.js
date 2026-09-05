// Comparacao de versoes: o diff tem de estar CERTO, senao a pessoa olha uma
// alteracao que nao aconteceu. Cada caso confere contra o resultado esperado,
// e no fim ha uma bateria aleatoria que reconstroi um texto a partir do outro.
const D=require('/Users/acmags/rhudi/lab-diff.js');
let ok=0, fail=0;
const t=(n,c,x)=>{ if(c){ok++;console.log('  ok   '+n);} else {fail++;console.log('  FALHA '+n+(x?'  -> '+x:''));} };
// resultado em forma curta: "=a -b +c"
const curto=r=>r.map(x=>(x.tipo==='igual'?'=':x.tipo==='saiu'?'-':'+')+x.texto).join(' ');
// reconstroi os dois lados a partir do diff — se isto falhar, o diff mente
const ladoA=r=>r.filter(x=>x.tipo!=='entrou').map(x=>x.texto).join('\n');
const ladoB=r=>r.filter(x=>x.tipo!=='saiu').map(x=>x.texto).join('\n');

console.log('== 1) O BASICO ==');
t('texto igual nao acusa mudanca',
  curto(D.comparar('a\nb\nc','a\nb\nc'))==='=a =b =c', curto(D.comparar('a\nb\nc','a\nb\nc')));
t('linha acrescentada no fim',
  curto(D.comparar('a\nb','a\nb\nc'))==='=a =b +c', curto(D.comparar('a\nb','a\nb\nc')));
t('linha removida do fim',
  curto(D.comparar('a\nb\nc','a\nb'))==='=a =b -c', curto(D.comparar('a\nb\nc','a\nb')));
t('linha acrescentada no comeco',
  curto(D.comparar('b\nc','a\nb\nc'))==='+a =b =c', curto(D.comparar('b\nc','a\nb\nc')));
t('linha trocada no meio',
  curto(D.comparar('a\nX\nc','a\nY\nc'))==='=a -X +Y =c', curto(D.comparar('a\nX\nc','a\nY\nc')));
// texto vazio e uma linha vazia, nao zero linhas: sai '-' da vazia e '+a'
t('de vazio para conteudo', curto(D.comparar('','a'))==='- +a', curto(D.comparar('','a')));
t('tudo trocado, sem nenhuma linha em comum',
  curto(D.comparar('a\nb','x\ny'))==='-a -b +x +y', curto(D.comparar('a\nb','x\ny')));

console.log('\n== 2) O DIFF NAO PODE MENTIR ==');
// reconstrucao: a soma das linhas '=' e '-' tem de dar o texto A, e '=' e '+' o B
[['a\nb\nc','a\nb\nc'], ['','x'], ['a','' ], ['a\nb\nc\nd','d\nc\nb\na'],
 ['um\ndois\ntres','um\ntres'], ['x\nx\nx','x\nx\nx\nx'],
 ['<div>\n<p>oi</p>\n</div>','<div>\n<p>ola</p>\n<span>novo</span>\n</div>']
].forEach(([A,B],i)=>{
  const r=D.comparar(A,B);
  t('caso '+(i+1)+': reconstroi o lado A', ladoA(r)===A, JSON.stringify(ladoA(r)));
  t('caso '+(i+1)+': reconstroi o lado B', ladoB(r)===B, JSON.stringify(ladoB(r)));
});

console.log('\n== 3) LINHA REPETIDA NAO CONFUNDE ==');
// chave e linha em branco aparecem dezenas de vezes num HTML: nao servem de
// ancora, e o patience justamente as ignora
const A3=['<style>','.a{','  cor:1','}','.b{','  cor:2','}','</style>'].join('\n');
const B3=['<style>','.a{','  cor:9','}','.b{','  cor:2','}','</style>'].join('\n');
const r3=D.comparar(A3,B3);
t('so a linha que mudou aparece como mudanca',
  r3.filter(x=>x.tipo!=='igual').map(x=>x.texto.trim()).join('|')==='cor:1|cor:9',
  r3.filter(x=>x.tipo!=='igual').map(x=>x.tipo+x.texto).join('|'));
t('as chaves repetidas continuam iguais',
  r3.filter(x=>x.texto==='}').every(x=>x.tipo==='igual'));
t('resumo conta 1 para cada lado',
  JSON.stringify(D.resumo(A3,B3))===JSON.stringify({entrou:1,saiu:1,mudou:2}),
  JSON.stringify(D.resumo(A3,B3)));

console.log('\n== 4) BLOCO MOVIDO ==');
const A4='cab\num\ndois\ntres\nrod';
const B4='cab\ntres\num\ndois\nrod';
const r4=D.comparar(A4,B4);
t('reconstroi os dois lados', ladoA(r4)===A4 && ladoB(r4)===B4);
t('nao marca o arquivo inteiro como mudado',
  r4.filter(x=>x.tipo==='igual').length>=3,
  r4.filter(x=>x.tipo==='igual').map(x=>x.texto).join(','));

console.log('\n== 5) SO OS TRECHOS QUE INTERESSAM ==');
const grandeA=Array.from({length:200},(_,i)=>'linha '+i).join('\n');
const grandeB=grandeA.replace('linha 100','linha 100 MEXIDA');
const bl=D.trechos(grandeA,grandeB,3);
t('um bloco so', bl.length===1, String(bl.length));
t('o bloco e pequeno, nao o arquivo todo', bl[0].linhas.length<=9,
  String(bl[0].linhas.length));
t('a mudanca esta dentro dele',
  bl[0].linhas.some(x=>x.tipo==='entrou'&&/MEXIDA/.test(x.texto)));
t('e vem com contexto em volta',
  bl[0].linhas.filter(x=>x.tipo==='igual').length>=4,
  String(bl[0].linhas.filter(x=>x.tipo==='igual').length));
t('sem mudanca, nenhum bloco', D.trechos(grandeA,grandeA,3).length===0);
const bl2=D.trechos(grandeA, grandeA.replace('linha 10','L10').replace('linha 150','L150'), 3);
t('duas mudancas distantes viram dois blocos', bl2.length===2, String(bl2.length));

console.log('\n== 6) TAMANHO DE VERDADE, SEM TRAVAR ==');
// uma pagina de 4 mil linhas com uma edicao no meio: o caminho comum do uso
const g1=Array.from({length:4000},(_,i)=>'<div class=\"l'+i+'\">conteudo '+i+'</div>').join('\n');
const g2=g1.replace('conteudo 2000','conteudo 2000 alterado')
           .replace('<div class=\"l3000\">conteudo 3000</div>','');
const t0=Date.now();
const rg=D.comparar(g1,g2);
const ms=Date.now()-t0;
t('terminou rapido', ms<1500, ms+'ms');
t('reconstroi os dois lados', ladoA(rg)===g1 && ladoB(rg)===g2);
t('achou pouca mudanca, nao o arquivo inteiro',
  rg.filter(x=>x.tipo!=='igual').length<=6,
  String(rg.filter(x=>x.tipo!=='igual').length)+' linhas mudadas');
// pior caso: nada em comum
const p1=Array.from({length:1500},(_,i)=>'a'+i).join('\n');
const p2=Array.from({length:1500},(_,i)=>'b'+i).join('\n');
const t1=Date.now(); const rp=D.comparar(p1,p2); const ms2=Date.now()-t1;
t('pior caso tambem termina', ms2<1500, ms2+'ms');
t('e reconstroi certo', ladoA(rp)===p1 && ladoB(rp)===p2);

console.log('\n== 7) BATERIA ALEATORIA ==');
// gera pares parecidos e exige a reconstrucao em todos: e o que pega o caso
// que eu nao pensei
let semente=12345;
const rnd=()=>{ semente=(semente*1103515245+12345)&0x7fffffff; return semente/0x7fffffff; };
let falhou=0, casos=300;
for(let c=0;c<casos;c++){
  const n=2+Math.floor(rnd()*25);
  const base=Array.from({length:n},()=>'l'+Math.floor(rnd()*8));
  const alvo=base.slice();
  const mexidas=1+Math.floor(rnd()*4);
  for(let m=0;m<mexidas;m++){
    const p=Math.floor(rnd()*Math.max(1,alvo.length));
    const acao=rnd();
    if(acao<0.34) alvo.splice(p,0,'novo'+Math.floor(rnd()*5));
    else if(acao<0.67) alvo.splice(p,1);
    else alvo[p]='mudou'+Math.floor(rnd()*5);
  }
  const A=base.join('\n'), B=alvo.join('\n');
  const r=D.comparar(A,B);
  if(ladoA(r)!==A || ladoB(r)!==B){
    falhou++;
    if(falhou===1) console.log('    primeiro caso ruim: '+JSON.stringify({A,B}));
  }
}
t(casos+' pares aleatorios reconstroem os dois lados', falhou===0, falhou+' falharam');

console.log('\n== 8) UM ARQUIVO SO PARA OS DOIS LADOS ==');
const fs=require('fs');
const FONTE=fs.readFileSync('/Users/acmags/rhudi/lab-diff.js','utf8');
const PROJHTML=fs.readFileSync('/Users/acmags/rhudi/projetos.html','utf8');
t('serve para o navegador e para o node (UMD)',
  /module\.exports/.test(FONTE) && /raiz\.LabDiff/.test(FONTE));
t('a pagina carrega o mesmo arquivo', /lab-diff\.js/.test(PROJHTML),
  (PROJHTML.match(/lab-diff[^\n]*/)||[''])[0]);
t('e carrega com versao, como o resto', /lab-diff\.js\?v=/.test(PROJHTML));
t('nao ha uma segunda copia da conta em projetos.js',
  !/function maiorCrescente/.test(fs.readFileSync('/Users/acmags/rhudi/projetos.js','utf8')));

console.log('\n'+(fail?'FALHAS: '+fail+' | ok: '+ok:'TUDO OK ('+ok+' checagens)'));
process.exit(fail?1:0);
