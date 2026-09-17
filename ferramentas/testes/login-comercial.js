// O login do Comercial precisa dizer POR QUE barrou: sem cadastro, inativo,
// plataforma nao liberada ou falha de leitura. Tratar tudo como "sem acesso"
// mandava embora quem tinha acesso e escondia o motivo real.
const fs=require('fs');
const SRC=fs.readFileSync('/Users/acmags/rhudi/comercial.js','utf8');
let ok=0, fail=0;
const t=(n,c,x)=>{ if(c){ok++;console.log('  ok   '+n);} else {fail++;console.log('  FALHA '+n+(x?'  -> '+x:''));} };

// Sandbox minimo: so o que carregarUsuario/motivoLogin encostam.
function montar(doc, {erro, erroPrimeiro}={}){
  let chamadas=0;
  const sandbox={
    window:{
      _doc:(c,i)=>({c,i}),
      _getDoc:async ref=>{
        chamadas++;
        if(erro) throw Object.assign(new Error('permission-denied'),{code:'permission-denied'});
        if(erroPrimeiro && chamadas===1) throw Object.assign(new Error('unavailable'),{code:'unavailable'});
        const d=doc&&doc[ref.i];
        return { exists:()=>!!d, data:()=>d };
      },
      _signOut:async()=>{},
    },
    setTimeout:(f)=>{ f(); return 0; },
    console, Promise, String, Object, Date, Math, JSON,
  };
  const nomes=Object.keys(sandbox);
  const corpo=[
    "const MASTER_BOOTSTRAP=['alexandre.magalhaes@udiaco.com.br'];",
    'let usuario=null;',
    SRC.match(/function temComercial\(d\)\{[\s\S]*?\n\}/)[0],
    SRC.match(/let _ultimoErroLogin[\s\S]*?\nfunction motivoLogin\(r, mail\)\{[\s\S]*?\n\}/)[0],
    'return {carregarUsuario, motivoLogin, quem:()=>usuario, chamadas:()=>0};',
  ].join('\n\n');
  const app=new Function(...nomes, corpo)(...nomes.map(n=>sandbox[n]));
  return {app, vezes:()=>chamadas};
}

const JULIA={'julia.fernandes@udiaco.com.br':{nome:'Julia Fernandes',email:'julia.fernandes@udiaco.com.br',
  papel:'corporativo', ativo:true, plataformas:{projetos:true, comercial:true}}};

console.log('-- LOGIN DO COMERCIAL --');

(async()=>{
  console.log('\n== 1) QUEM TEM ACESSO ENTRA ==');
  let {app}=montar(JULIA);
  t('quem está liberado entra', await app.carregarUsuario('julia.fernandes@udiaco.com.br')==='ok');
  t('e o nome do cadastro vai para a tela', (app.quem()||{}).nome==='Julia Fernandes');
  t('o e-mail é normalizado (maiúsculas não barram)',
    await app.carregarUsuario('  JULIA.Fernandes@Udiaco.com.br ')==='ok');

  console.log('\n== 2) CADA BLOQUEIO COM SEU MOTIVO ==');
  ({app}=montar({}));
  const r1=await app.carregarUsuario('ninguem@udiaco.com.br');
  t('sem cadastro é "sem-cadastro"', r1==='sem-cadastro', r1);
  t('e a mensagem diz o e-mail que chegou',
    /ninguem@udiaco\.com\.br.*não está cadastrado/.test(app.motivoLogin(r1,'ninguem@udiaco.com.br')),
    app.motivoLogin(r1,'ninguem@udiaco.com.br'));

  ({app}=montar({'x@udiaco.com.br':{ativo:false,papel:'corporativo',plataformas:{comercial:true}}}));
  const r2=await app.carregarUsuario('x@udiaco.com.br');
  t('cadastro desativado é "inativo"', r2==='inativo', r2);
  t('e a mensagem fala em acesso desativado', /desativado/.test(app.motivoLogin(r2,'x@udiaco.com.br')));

  ({app}=montar({'y@udiaco.com.br':{ativo:true,papel:'corporativo',plataformas:{projetos:true}}}));
  const r3=await app.carregarUsuario('y@udiaco.com.br');
  t('sem a plataforma marcada é "sem-plataforma"', r3==='sem-plataforma', r3);
  t('e a mensagem manda pedir ao Master', /Acessos/.test(app.motivoLogin(r3,'y@udiaco.com.br')));

  console.log('\n== 3) FALHA DE LEITURA NÃO É FALTA DE ACESSO ==');
  ({app}=montar(JULIA,{erroPrimeiro:true}));
  const r4=await app.carregarUsuario('julia.fernandes@udiaco.com.br');
  t('uma falha passageira é vencida na segunda tentativa', r4==='ok', r4);

  let vezes;
  ({app, vezes}=montar(JULIA,{erro:true}));
  const r5=await app.carregarUsuario('julia.fernandes@udiaco.com.br');
  t('falha que persiste vira "erro-leitura", não "sem acesso"', r5==='erro-leitura', r5);
  t('tentou duas vezes antes de desistir', vezes()===2, 'tentativas: '+vezes());
  t('a mensagem diz que é para tentar de novo',
    /Tente de novo/.test(app.motivoLogin(r5,'julia.fernandes@udiaco.com.br')),
    app.motivoLogin(r5,'julia.fernandes@udiaco.com.br'));
  t('e mostra o erro técnico, para dar para investigar',
    /permission-denied/.test(app.motivoLogin(r5,'julia.fernandes@udiaco.com.br')));

  console.log('\n== 4) O MASTER SEMPRE ENTRA ==');
  ({app}=montar({}));
  t('o master do bootstrap entra mesmo sem doc',
    await app.carregarUsuario('alexandre.magalhaes@udiaco.com.br')==='ok');
  ({app}=montar({'chefe@udiaco.com.br':{ativo:true,papel:'master'}}));
  t('e o master não precisa da marcação da plataforma',
    await app.carregarUsuario('chefe@udiaco.com.br')==='ok');

  console.log('\n== 5) O QUE A TELA FAZ ==');
  t('erro de leitura não desloga a pessoa', /if\(r!=='erro-leitura'\) await window\._signOut\(\)/.test(SRC));
  t('a mensagem da tela vem de motivoLogin', /erroLogin\(motivoLogin\(r, /.test(SRC));
  t('o catch mudo saiu do login', !/sem permissão de leitura = sem acesso/.test(SRC));

  console.log('\n'+(fail?('FALHAS: '+fail+' | ok: '+ok):('TUDO OK ('+ok+' checagens)')));
  process.exit(fail?1:0);
})();
