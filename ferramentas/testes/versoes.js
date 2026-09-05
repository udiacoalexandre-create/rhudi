// Versionamento do Laboratorio: cada publicacao guarda uma versao, conteudo
// igual NAO cria versao, o historico e podado, restaurar nao apaga nada, e
// excluir leva tudo junto. Roda CONTRA O FIRESTORE, num id descartavel.
const fs=require('fs'), path=require('path'), os=require('os');
const CLI=require('/Users/acmags/rhudi/ferramentas/lab.js');
const DIFF=require('/Users/acmags/rhudi/lab-diff.js');
const FONTE=fs.readFileSync('/Users/acmags/rhudi/ferramentas/lab.js','utf8');
const PROJJS=fs.readFileSync('/Users/acmags/rhudi/projetos.js','utf8');
const PROJHTML=fs.readFileSync('/Users/acmags/rhudi/projetos.html','utf8');
const RULES=fs.readFileSync('/Users/acmags/rhudi/firestore.rules','utf8');
let ok=0, fail=0;
const t=(n,c,x)=>{ if(c){ok++;console.log('  ok   '+n);} else {fail++;console.log('  FALHA '+n+(x?'  -> '+x:''));} };

const DIR=fs.mkdtempSync(path.join(os.tmpdir(),'labver-'));
const ARQ=path.join(DIR,'pagina.html');
const ID='lab_zzz_versoes_teste';
const escrever = txt => fs.writeFileSync(ARQ, txt);

const V1=['<!doctype html><html><head><title>Site</title></head><body>',
  '<h1>Bem-vindo</h1>','<p>primeiro paragrafo</p>','<p>segundo paragrafo</p>',
  '</body></html>'].join('\n');
const V2=V1.replace('<h1>Bem-vindo</h1>','<h1>Bem-vindo a Udiaco</h1>')
           .replace('<p>segundo paragrafo</p>','<p>segundo paragrafo</p>\n<p>terceiro, novo</p>');
// a LINHA inteira sai, com a quebra junto: trocar só o texto por '' deixaria
// uma linha em branco no lugar, e aí a comparação acusaria 1 entrada + 1 saída
const V3=V2.replace('<p>primeiro paragrafo</p>\n','');

console.log('== 1) A PRIMEIRA PUBLICACAO ==');
(async()=>{
try{
  // limpa qualquer sobra de uma execucao anterior interrompida
  try{ await CLI.excluir(ID); }catch(e){}

  escrever(V1);
  const p1=await CLI.publicar(ARQ, {id:ID, titulo:'Pagina de teste'});
  t('nasce na v1', p1.versao===1, String(p1.versao));
  t('e marcada como nova', p1.novo===true);
  const reg1=await CLI.lerRegistro(ID);
  t('o registro aponta para a v1', reg1.versao===1);
  t('o registro guarda a impressao do conteudo', typeof reg1.hash==='string' && reg1.hash.length>=16);
  const v1doc=await CLI.lerVersao(ID,1);
  t('a versao 1 existe como documento', !!v1doc && v1doc.versao===1);
  t('e sabe de quem e', v1doc.labId===ID);
  t('e de onde veio', v1doc.origem==='claude-code', v1doc.origem);
  t('o conteudo da v1 volta inteiro', (await CLI.lerHTML(ID,1)).includes('<h1>Bem-vindo</h1>'));

  console.log('\n== 2) PUBLICAR IGUAL NAO CRIA VERSAO ==');
  // com --watch, salvar sem alterar nada acontece o tempo todo
  const rep=await CLI.publicar(ARQ, {id:ID});
  t('avisa que e repetida', rep.repetida===true);
  t('devolve a versao que ja existia', rep.versao===1, String(rep.versao));
  t('nao criou a v2', (await CLI.lerVersao(ID,2))===null);
  t('o registro continua na v1', (await CLI.lerRegistro(ID)).versao===1);

  console.log('\n== 3) ALTERAR CRIA VERSAO NOVA, SEM PERDER A ANTIGA ==');
  escrever(V2);
  const p2=await CLI.publicar(ARQ, {id:ID});
  t('virou v2', p2.versao===2 && p2.repetida===false, String(p2.versao));
  t('a v1 continua la', !!(await CLI.lerVersao(ID,1)));
  const t1=await CLI.lerHTML(ID,1), t2=await CLI.lerHTML(ID,2);
  t('a v1 tem o conteudo antigo', /Bem-vindo<\/h1>/.test(t1) && !/terceiro, novo/.test(t1));
  t('a v2 tem o conteudo novo', /Bem-vindo a Udiaco/.test(t2) && /terceiro, novo/.test(t2));
  t('ler sem dizer a versao traz a atual', (await CLI.lerHTML(ID))===t2);
  t('o titulo dado na v1 nao se perde',
    (await CLI.lerRegistro(ID)).titulo==='Pagina de teste');

  console.log('\n== 4) A COMPARACAO DIZ O QUE MUDOU ==');
  const r=DIFF.resumo(t1,t2);
  t('conta 2 linhas que entraram', r.entrou===2, JSON.stringify(r));
  t('e 1 que saiu', r.saiu===1, JSON.stringify(r));
  const blocos=DIFF.trechos(t1,t2,3);
  t('mostra os trechos, nao o arquivo todo', blocos.length>=1 && blocos.length<=2,
    String(blocos.length));
  const texto=blocos.map(b=>b.linhas.map(l=>l.tipo[0]+l.texto).join('|')).join('||');
  t('o titulo novo aparece como entrada', /eBem-vindo a Udiaco/.test(texto.replace(/<[^>]*>/g,'')),
    texto.slice(0,160));
  t('o paragrafo novo tambem', /terceiro, novo/.test(texto));

  console.log('\n== 5) TRES VERSOES, E A COMPARACAO DE QUALQUER PAR ==');
  escrever(V3);
  const p3=await CLI.publicar(ARQ, {id:ID});
  t('virou v3', p3.versao===3);
  const info=await CLI.versoesDe(ID);
  t('lista as 3, da mais nova para a mais velha',
    info.versoes.map(v=>v.versao).join(',')==='3,2,1',
    info.versoes.map(v=>v.versao).join(','));
  const t3=await CLI.lerHTML(ID,3);
  t('v1 -> v3 acumula as duas mudancas',
    DIFF.resumo(t1,t3).saiu>=2, JSON.stringify(DIFF.resumo(t1,t3)));
  t('v2 -> v3 mostra so a remocao',
    DIFF.resumo(t2,t3).entrou===0 && DIFF.resumo(t2,t3).saiu===1,
    JSON.stringify(DIFF.resumo(t2,t3)));
  t('comparar a versao com ela mesma nao acusa nada', DIFF.resumo(t2,t2).mudou===0);

  console.log('\n== 6) RESTAURAR NAO APAGA NADA ==');
  await CLI.restaurar(ID, 1);
  const reg4=await CLI.lerRegistro(ID);
  t('a restaurada entra como v4', reg4.versao===4, String(reg4.versao));
  t('e o conteudo dela e o da v1', (await CLI.lerHTML(ID,4))===t1);
  t('a v3 continua guardada', !!(await CLI.lerVersao(ID,3)));
  t('a v1 tambem', !!(await CLI.lerVersao(ID,1)));
  const v4=await CLI.lerVersao(ID,4);
  t('a versao registra que veio de uma restauracao', /restaurada da v1/.test(v4.origem||''),
    v4.origem);
  // publicar o mesmo conteudo da v4 nao deve criar v5
  escrever(V1);
  const p5=await CLI.publicar(ARQ, {id:ID});
  t('publicar o conteudo que ja e o atual nao cria versao', p5.repetida===true,
    JSON.stringify({repetida:p5.repetida, versao:p5.versao}));

  console.log('\n== 7) O HISTORICO NAO CRESCE PARA SEMPRE ==');
  t('o limite esta declarado', CLI.MAX_VER===20, String(CLI.MAX_VER));
  t('a tela usa o mesmo limite', /LAB_MAX_VER = 20/.test(PROJJS));
  t('a poda existe nos dois lados',
    /async function podar/.test(FONTE) && /labPodarVersoes/.test(PROJJS));
  t('a poda so mexe em versao abaixo do limite',
    /versaoAtual - MAX_VER/.test(FONTE) && /versaoAtual - LAB_MAX_VER/.test(PROJJS));

  console.log('\n== 8) EXCLUIR LEVA O HISTORICO JUNTO ==');
  const antes=await CLI.lerRegistro(ID);
  await CLI.excluir(ID);
  t('o registro sumiu', (await CLI.lerRegistro(ID))===null);
  let sobrou=0;
  for(let v=1; v<=(antes.versao||0); v++) if(await CLI.lerVersao(ID,v)) sobrou++;
  t('nenhuma versao ficou orfa no banco', sobrou===0, sobrou+' sobraram');
}catch(e){
  t('ciclo de versoes', false, e.message + '\n' + String(e.stack||'').split('\n')[1]);
  try{ await CLI.excluir(ID); }catch(_){}
}

console.log('\n== 9) A TELA ==');
t('o cartao mostra a versao', /'<b>v' \+ l\.versao \+ '<\/b> · '/.test(PROJJS));
t('e o botao de historico aparece a partir da 2a', /Number\(l\.versao\) > 1/.test(PROJJS));
t('o painel de versoes existe', /function labVersoes\(/.test(PROJJS));
t('da para escolher o par a comparar', /function labEscolher\(/.test(PROJJS));
t('abre ja comparando a mais nova com a anterior',
  /labVer\.b = labVer\.lista\[0\]\.versao[\s\S]{0,80}labVer\.a = labVer\.lista\[1\]\.versao/.test(PROJJS));
t('da para abrir uma versao antiga', /function labAbrirVersao\(/.test(PROJJS));
t('da para baixar uma versao antiga', /function labBaixarVersao\(/.test(PROJJS));
t('baixar duas versoes nao gera nomes iguais', /'-v' \+ versao \+ '\$1'/.test(PROJJS));
t('da para restaurar', /function labRestaurar\(/.test(PROJJS));
t('restaurar avisa que nada e apagado', /Nada é apagado/.test(PROJJS));
t('o texto ja lido nao e buscado de novo', /labVer\.texto\[v\] != null/.test(PROJJS));
t('CSS do historico existe', /\.lab-ver\{/.test(PROJHTML));
t('CSS do diff existe', /\.lab-dif__l--e\{/.test(PROJHTML) && /\.lab-dif__l--s\{/.test(PROJHTML));
t('excluir avisa quantas versoes vao junto', /versões vão junto/.test(PROJJS));

console.log('\n== 10) UMA CONTA SO, E A REGRA NO LUGAR ==');
t('o terminal usa o mesmo lab-diff da tela', /require\(path\.join\(__dirname, '\.\.', 'lab-diff\.js'\)\)/.test(FONTE));
t('a pagina carrega o mesmo arquivo', /lab-diff\.js\?v=/.test(PROJHTML));
t('pe_lab_versoes so do dono',
  /match \/pe_lab_versoes\/\{id\} \{ allow read, write: if ehDonoLab\(\); \}/.test(RULES),
  (RULES.match(/match \/pe_lab_versoes[^\n]*/)||[''])[0]);
t('o codigo usa a colecao que a regra protege',
  CLI.COL_VER==='pe_lab_versoes' && /COL_LABVER = 'pe_lab_versoes'/.test(PROJJS));
t('a impressao do conteudo e estavel',
  CLI.hashDe('abc')===CLI.hashDe('abc') && CLI.hashDe('abc')!==CLI.hashDe('abd'));
t('o id da versao segue um padrao so',
  CLI.idVersao('lab_x',3)==='lab_x__v3' && /id \+ '__v' \+ v/.test(PROJJS));

fs.rmSync(DIR,{recursive:true,force:true});
console.log('\n'+(fail?'FALHAS: '+fail+' | ok: '+ok:'TUDO OK ('+ok+' checagens)'));
process.exit(fail?1:0);
})();
