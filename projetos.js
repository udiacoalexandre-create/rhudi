/* ============================================================
   PROJETOS ESTRATÉGICOS — Udiaço
   SPA em JS puro sobre o mesmo projeto Firebase do rhudi
   (udiaco-beneficios): os logins (Auth) e o controle de acesso
   (coleção 'usuarios') são os mesmos; as coleções deste app são
   novas e levam o prefixo 'pe_'.

   Modelo de dados
   ---------------
   pe_projetos/{id}   nome, descricao, status, lider, criadoPor, criadoEm
   pe_tarefas/{id}    projetoId, titulo, descricao, responsavel, prazo,
                      status, tipo ('tarefa'|'solicitacao'), paiId,
                      solicitante, criadoPor, criadoEm, concluidaEm,
                      ultimaMsgEm, lidoPor{chaveEmail: dataISO}
   pe_mensagens/{id}  tarefaId, projetoId, autor, autorNome, texto,
                      tipo ('msg'|'sistema'), anexos[], criadoEm

   O fluxo de troca de responsável (o coração do sistema): quando eu
   preciso de algo de alguém para seguir, crio uma SOLICITAÇÃO — uma
   tarefa filha para essa pessoa. A minha tarefa fica 'aguardando';
   quando a pessoa responde e devolve, a resposta entra no chat da
   minha tarefa e ela volta para 'checar'.
   ============================================================ */

const COL_PROJ = 'pe_projetos';
const COL_TAR  = 'pe_tarefas';
const COL_MSG  = 'pe_mensagens';

const MASTER_BOOTSTRAP = ['alexandre.magalhaes@udiaco.com.br'];

const STATUS = {
  a_fazer:    { label:'A fazer',            badge:'neutral', icone:'circle' },
  andamento:  { label:'Em andamento',       badge:'accent',  icone:'player-play' },
  aguardando: { label:'Aguardando terceiro',badge:'warning', icone:'hourglass' },
  checar:     { label:'A checar',           badge:'purple',  icone:'eye-check' },
  concluida:  { label:'Concluída',          badge:'success', icone:'circle-check' },
};
// Ordem em que os grupos aparecem na agenda.
const GRUPOS = [
  { id:'checar',    titulo:'A checar (voltou para você)', classe:'checar' },
  { id:'atrasada',  titulo:'Atrasadas',                   classe:'atrasada' },
  { id:'hoje',      titulo:'Hoje',                        classe:'hoje' },
  { id:'semana',    titulo:'Esta semana',                 classe:'' },
  { id:'proxima',   titulo:'Próxima semana',              classe:'' },
  { id:'depois',    titulo:'Mais para frente',            classe:'' },
  { id:'sem',       titulo:'Sem prazo definido',          classe:'' },
  { id:'aguardando',titulo:'Aguardando terceiro',         classe:'aguardando' },
];

// ---------- Estado ----------
let usuario   = null;   // {email, nome, papel}
let usuarios  = [];     // pessoas com acesso (para os seletores de responsável)
let projetos  = [];     // [{_id, ...}]
let tarefas   = [];     // [{_id, ...}]
let aba       = 'agenda';
let projetoAberto = null;   // id do projeto aberto na aba Projetos
let pessoaAberta  = null;   // email da pessoa aberta na aba Equipe
let tarefaAberta  = null;   // id da tarefa aberta no painel lateral
let mensagens = [];         // mensagens da tarefa aberta
let paraAnexar = [];        // anexos na fila do compositor
let unsubTarefas = null, unsubProjetos = null, unsubMsgs = null;

// ============================================================
// UTILITÁRIOS
// ============================================================
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

function toast(msg, tipo){
  const t = $('toast');
  t.textContent = msg;
  t.style.background = tipo === 'erro' ? 'var(--danger)' : (tipo === 'ok' ? 'var(--success)' : 'var(--text)');
  t.classList.add('on');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('on'), 2600);
}

// ---------- Datas (sempre no fuso local; ISO curto 'AAAA-MM-DD') ----------
const pad = n => String(n).padStart(2, '0');
function iso(d){ return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); }
function hoje(){ return iso(new Date()); }
function maisDias(n){ const d = new Date(); d.setDate(d.getDate()+n); return iso(d); }
// Domingo que fecha a semana atual (a semana começa na segunda).
function fimDaSemana(){
  const d = new Date();
  const dow = (d.getDay() + 6) % 7;      // 0 = segunda ... 6 = domingo
  d.setDate(d.getDate() + (6 - dow));
  return iso(d);
}
function fimDaProximaSemana(){
  const d = new Date(fimDaSemana() + 'T12:00:00');
  d.setDate(d.getDate() + 7);
  return iso(d);
}
function dataBR(isoStr){
  if(!isoStr) return '';
  const p = String(isoStr).slice(0,10).split('-');
  return p.length === 3 ? p[2] + '/' + p[1] : isoStr;
}
function dataHoraBR(isoStr){
  if(!isoStr) return '';
  const d = new Date(isoStr);
  if(isNaN(d)) return '';
  const mesmoDia = iso(d) === hoje();
  const hora = pad(d.getHours()) + ':' + pad(d.getMinutes());
  return mesmoDia ? 'hoje ' + hora : pad(d.getDate()) + '/' + pad(d.getMonth()+1) + ' ' + hora;
}
// Em que grupo da agenda a tarefa cai, pelo prazo da próxima ação.
function grupoDoPrazo(prazo){
  if(!prazo) return 'sem';
  const h = hoje();
  if(prazo < h) return 'atrasada';
  if(prazo === h) return 'hoje';
  if(prazo <= fimDaSemana()) return 'semana';
  if(prazo <= fimDaProximaSemana()) return 'proxima';
  return 'depois';
}
function prazoTexto(prazo){
  if(!prazo) return 'sem prazo';
  const h = hoje();
  if(prazo === h) return 'hoje';
  if(prazo === maisDias(1)) return 'amanhã';
  if(prazo === maisDias(-1)) return 'ontem';
  if(prazo < h){
    const dias = Math.round((new Date(h+'T12:00:00') - new Date(prazo+'T12:00:00')) / 86400000);
    return dataBR(prazo) + ' (' + dias + 'd atrás)';
  }
  return dataBR(prazo);
}

// ---------- Pessoas ----------
function nomeDe(email){
  if(!email) return '—';
  const u = usuarios.find(u => u.email === email);
  if(u && u.nome) return u.nome;
  return email.split('@')[0].replace(/[._]/g, ' ');
}
function iniciais(email){
  const n = nomeDe(email).trim().split(/\s+/);
  return ((n[0]||'?')[0] + (n.length > 1 ? n[n.length-1][0] : '')).toUpperCase();
}
function avatar(email, cls){
  return '<span class="avatar ' + (cls||'') + '" title="' + esc(nomeDe(email)) + '">' + esc(iniciais(email)) + '</span>';
}
function primeiroNome(email){ return nomeDe(email).trim().split(/\s+/)[0]; }
// Chave de e-mail usável como nome de campo no Firestore (não aceita ponto).
function chaveEmail(email){ return String(email||'').replace(/[.@]/g, '_'); }
function ehMaster(){ return usuario && usuario.papel === 'master'; }

// ---------- Consultas em memória ----------
function projetoDe(id){ return projetos.find(p => p._id === id) || null; }
function tarefaDe(id){ return tarefas.find(t => t._id === id) || null; }
function tarefasDoProjeto(id){ return tarefas.filter(t => t.projetoId === id); }
function filhasDe(id){ return tarefas.filter(t => t.paiId === id); }
function abertas(arr){ return arr.filter(t => t.status !== 'concluida'); }
function temNaoLida(t){
  if(!t.ultimaMsgEm) return false;
  const lido = (t.lidoPor || {})[chaveEmail(usuario.email)];
  return !lido || lido < t.ultimaMsgEm;
}

// ============================================================
// AUTENTICAÇÃO E ACESSO
// ============================================================
function iniciar(){
  $('btn-entrar').onclick = entrar;
  $('login-senha').onkeydown = e => { if(e.key === 'Enter') entrar(); };
  $('login-email').onkeydown = e => { if(e.key === 'Enter') $('login-senha').focus(); };
  $('link-reset').onclick = e => { e.preventDefault(); resetarSenha(); };
  $('btn-sair').onclick = () => window._signOut();
  $('backdrop').onclick = fecharPainel;
  document.onkeydown = e => {
    if(e.key !== 'Escape') return;
    if($('modal').classList.contains('modal--on')) fecharModal();
    else if(tarefaAberta) fecharPainel();
  };
  window._onAuthStateChanged(window._auth, async user => {
    if(!user){ mostrarLogin(); return; }
    const r = await carregarUsuario(user.email);
    if(r !== 'ok'){
      erroLogin(r === 'sem-plataforma'
        ? 'Seu acesso ao sistema está ativo, mas a plataforma Projetos Estratégicos não foi liberada para você. Peça ao Master (Sistema de RH > Acessos).'
        : 'Seu e-mail não tem acesso liberado a este sistema. Procure o administrador.');
      await window._signOut();
      return;
    }
    mostrarApp();
    assinarDados();
  });
}

async function entrar(){
  const email = ($('login-email').value || '').trim().toLowerCase();
  const senha = $('login-senha').value || '';
  if(!email || !senha){ erroLogin('Preencha e-mail e senha.'); return; }
  const btn = $('btn-entrar');
  btn.disabled = true; btn.textContent = 'Entrando...';
  try{
    await window._signIn(email, senha);
    $('login-erro').style.display = 'none';
  }catch(e){
    const m = String(e && e.code || '');
    erroLogin(m.includes('invalid-credential') || m.includes('wrong-password') || m.includes('user-not-found')
      ? 'E-mail ou senha incorretos.'
      : (m.includes('too-many-requests') ? 'Muitas tentativas. Tente de novo em alguns minutos.' : 'Não foi possível entrar: ' + m));
  }finally{
    btn.disabled = false; btn.textContent = 'Entrar';
  }
}

async function resetarSenha(){
  const email = ($('login-email').value || '').trim().toLowerCase();
  if(!email){ erroLogin('Digite seu e-mail primeiro.'); return; }
  try{
    await window._resetSenha(email);
    toast('Enviamos um link de redefinição para ' + email, 'ok');
  }catch(e){ erroLogin('Não foi possível enviar o e-mail de redefinição.'); }
}

function erroLogin(msg){
  mostrarLogin();
  const el = $('login-erro');
  el.textContent = msg; el.style.display = 'block';
}

// Quem entra nesta plataforma: o Master sempre; os demais só se o Master tiver
// marcado 'Projetos Estratégicos' para eles na tela de Acessos do Sistema de RH
// (campo plataformas.projetos no doc de 'usuarios'). Plataforma nova nasce
// fechada — por isso aqui a falta da marcação nega, e não libera.
function temProjetos(d){
  if(!d || d.ativo === false || d.papel === 'um989') return false;
  if(d.papel === 'master') return true;
  return !!(d.plataformas && d.plataformas.projetos === true);
}

// Lê o papel na coleção 'usuarios' (a mesma do rhudi; doc = e-mail).
// Retorna 'ok', 'sem-acesso' (não é usuário do sistema) ou 'sem-plataforma'
// (é usuário, mas esta plataforma não foi liberada para ele).
async function carregarUsuario(email){
  const mail = (email || '').toLowerCase().trim();
  let d = null;
  try{
    const snap = await window._getDoc(window._doc('usuarios', mail));
    if(snap.exists()) d = snap.data();
  }catch(e){ /* sem permissão de leitura = sem acesso */ }
  if(!d && MASTER_BOOTSTRAP.includes(mail)) d = { email:mail, nome:mail, papel:'master', ativo:true };
  if(!d || d.ativo === false || d.papel === 'um989') return 'sem-acesso';
  if(!temProjetos(d)) return 'sem-plataforma';
  usuario = { email:mail, nome:d.nome || mail, papel:d.papel || 'corporativo' };
  await carregarPessoas();
  return 'ok';
}

// Pessoas que podem receber tarefas: só quem também tem esta plataforma
// liberada — não faz sentido delegar para quem não consegue abrir o sistema.
async function carregarPessoas(){
  usuarios = [];
  try{
    const snap = await window._getDocs(window._col('usuarios'));
    snap.forEach(d => {
      const u = d.data() || {};
      if(!temProjetos(u)) return;
      usuarios.push({ email:(u.email || d.id).toLowerCase(), nome:u.nome || d.id, papel:u.papel || '' });
    });
  }catch(e){ /* mantém ao menos o próprio usuário */ }
  if(!usuarios.some(u => u.email === usuario.email)){
    usuarios.push({ email:usuario.email, nome:usuario.nome, papel:usuario.papel });
  }
  usuarios.sort((a,b) => nomeDe(a.email).localeCompare(nomeDe(b.email), 'pt-BR'));
}

function mostrarLogin(){
  $('tela-app').style.display = 'none';
  $('tela-login').style.display = 'flex';
  fecharPainel();
  if(unsubTarefas){ unsubTarefas(); unsubTarefas = null; }
  if(unsubProjetos){ unsubProjetos(); unsubProjetos = null; }
}
function mostrarApp(){
  $('tela-login').style.display = 'none';
  $('tela-app').style.display = 'block';
  $('user-info').textContent = usuario.nome;
}

// ============================================================
// DADOS EM TEMPO REAL
// ============================================================
// O volume é pequeno (uma área, dezenas de projetos), então vale ouvir as
// duas coleções inteiras: qualquer alteração de qualquer pessoa aparece na
// hora, sem recarregar a página e sem precisar de índice composto.
function assinarDados(){
  if(unsubProjetos) unsubProjetos();
  if(unsubTarefas) unsubTarefas();
  unsubProjetos = window._onSnapshot(window._col(COL_PROJ), snap => {
    projetos = [];
    snap.forEach(d => projetos.push(Object.assign({ _id:d.id }, d.data())));
    projetos.sort((a,b) => String(a.nome||'').localeCompare(String(b.nome||''), 'pt-BR'));
    render();
  }, erroFirestore);
  unsubTarefas = window._onSnapshot(window._col(COL_TAR), snap => {
    tarefas = [];
    snap.forEach(d => tarefas.push(Object.assign({ _id:d.id }, d.data())));
    render();
    if(tarefaAberta) renderPainel();
  }, erroFirestore);
}
function erroFirestore(e){
  console.error(e);
  toast('Erro de acesso ao banco: ' + (e && e.code || e), 'erro');
}

// ---------- Escritas ----------
async function criarDoc(col, dados){
  const ref = await window._addDoc(window._col(col), dados);
  return ref.id;
}
function atualizarTarefa(id, dados){
  return window._updateDoc(window._doc(COL_TAR, id), dados);
}
// Mensagem no chat da tarefa. tipo 'sistema' = registro automático do fluxo.
async function postarMensagem(tarefaId, texto, tipo, anexos){
  const t = tarefaDe(tarefaId);
  const agora = new Date().toISOString();
  await criarDoc(COL_MSG, {
    tarefaId, projetoId: t ? t.projetoId : null,
    autor: usuario.email, autorNome: usuario.nome,
    texto: texto || '', tipo: tipo || 'msg',
    anexos: anexos || [], criadoEm: agora
  });
  const patch = { ultimaMsgEm: agora };
  // Quem escreveu já leu.
  patch['lidoPor.' + chaveEmail(usuario.email)] = agora;
  await atualizarTarefa(tarefaId, patch).catch(()=>{});
}

// ============================================================
// NAVEGAÇÃO E RENDERIZAÇÃO
// ============================================================
function irPara(novaAba){
  aba = novaAba;
  if(novaAba !== 'projetos') projetoAberto = null;
  if(novaAba !== 'equipe') pessoaAberta = null;
  render();
  window.scrollTo(0, 0);
}

function render(){
  if(!usuario) return;
  renderNav();
  const v = $('view');
  if(aba === 'agenda')        v.innerHTML = viewAgenda(usuario.email, true);
  else if(aba === 'projetos') v.innerHTML = projetoAberto ? viewProjeto(projetoAberto) : viewProjetos();
  else if(aba === 'equipe')   v.innerHTML = pessoaAberta ? viewPessoa(pessoaAberta) : viewEquipe();
}

function renderNav(){
  const minhas = abertas(tarefas.filter(t => t.responsavel === usuario.email));
  const urgentes = minhas.filter(t => {
    const g = t.status === 'checar' ? 'checar' : (t.status === 'aguardando' ? 'aguardando' : grupoDoPrazo(t.prazo));
    return g === 'checar' || g === 'atrasada' || g === 'hoje';
  }).length;
  const itens = [
    { id:'agenda',   icone:'calendar-check', label:'Minhas tarefas', count:urgentes },
    { id:'projetos', icone:'folders',        label:'Projetos',       count:projetos.filter(p => p.status !== 'concluido').length },
    { id:'equipe',   icone:'users',          label:'Equipe',         count:0 },
  ];
  $('nav').innerHTML = itens.map(i =>
    '<button class="nav__item' + (aba === i.id ? ' nav__item--active' : '') + '" onclick="irPara(\'' + i.id + '\')">' +
      '<i class="ti ti-' + i.icone + '"></i> ' + i.label +
      (i.count ? ' <span class="nav__count">' + i.count + '</span>' : '') +
    '</button>').join('');
}

// ---------- Linha de tarefa (usada em todas as listas) ----------
function linhaTarefa(t, opcoes){
  const o = opcoes || {};
  const g = t.status === 'checar' ? 'checar' : (t.status === 'aguardando' ? 'aguardando' : grupoDoPrazo(t.prazo));
  const cls = ['tarefa'];
  if(t.status === 'concluida') cls.push('tarefa--concluida');
  else if(g === 'checar' || g === 'aguardando' || g === 'atrasada' || g === 'hoje') cls.push('tarefa--' + g);
  const st = STATUS[t.status] || STATUS.a_fazer;
  const proj = projetoDe(t.projetoId);
  const filhasAbertas = abertas(filhasDe(t._id)).length;
  const sub = [];
  if(o.mostrarProjeto !== false && proj) sub.push('<span><i class="ti ti-folder"></i> ' + esc(proj.nome) + '</span>');
  sub.push('<span class="dot"></span><span><i class="ti ti-clock"></i> ' + esc(prazoTexto(t.prazo)) + '</span>');
  if(t.tipo === 'solicitacao' && t.solicitante)
    sub.push('<span class="dot"></span><span><i class="ti ti-arrow-forward-up"></i> pedido de ' + esc(primeiroNome(t.solicitante)) + '</span>');
  if(filhasAbertas)
    sub.push('<span class="dot"></span><span><i class="ti ti-hourglass"></i> ' + filhasAbertas + ' pedido(s) em aberto</span>');
  return '<button class="' + cls.join(' ') + '" onclick="abrirTarefa(\'' + t._id + '\')">' +
    (o.mostrarResponsavel !== false ? avatar(t.responsavel, 'avatar--sm') : '') +
    '<span class="tarefa__main">' +
      '<span class="tarefa__titulo">' + esc(t.titulo) +
        (temNaoLida(t) ? ' <span class="pill-nova">novo</span>' : '') + '</span>' +
      '<span class="tarefa__sub">' + sub.join(' ') + '</span>' +
    '</span>' +
    '<span class="tarefa__dir"><span class="badge badge--' + st.badge + '">' + st.label + '</span></span>' +
  '</button>';
}

function grupoHTML(titulo, lista, opcoes){
  if(!lista.length) return '';
  return '<section class="grupo">' +
    '<div class="grupo__head"><span class="grupo__titulo">' + esc(titulo) + '</span>' +
    '<span class="nav__count">' + lista.length + '</span></div>' +
    '<div class="lista">' + lista.map(t => linhaTarefa(t, opcoes)).join('') + '</div></section>';
}

// ============================================================
// ABA 1 — MINHAS TAREFAS (a agenda)
// ============================================================
// Cada tarefa cai num grupo pelo PRAZO DA PRÓXIMA AÇÃO. Duas exceções, que
// valem mais que a data: o que voltou de terceiro ('checar') vem primeiro,
// porque é ação sua agora; e o que está travado esperando alguém
// ('aguardando') sai da agenda do dia e vai para o fim da lista.
function viewAgenda(email, propria){
  const minhas = abertas(tarefas.filter(t => t.responsavel === email));
  const porGrupo = {};
  GRUPOS.forEach(g => porGrupo[g.id] = []);
  minhas.forEach(t => {
    const g = t.status === 'checar' ? 'checar' : (t.status === 'aguardando' ? 'aguardando' : grupoDoPrazo(t.prazo));
    porGrupo[g].push(t);
  });
  Object.keys(porGrupo).forEach(k => porGrupo[k].sort(ordenarPorPrazo));

  const hojeCount = porGrupo.hoje.length + porGrupo.atrasada.length + porGrupo.checar.length;
  const stats =
    '<div class="stat-grid" style="margin-bottom:var(--space-6)">' +
      statCard('Para hoje', hojeCount, 'sun', hojeCount ? 'accent' : 'success') +
      statCard('Atrasadas', porGrupo.atrasada.length, 'alert-triangle', porGrupo.atrasada.length ? 'danger' : 'success') +
      statCard('Esta semana', porGrupo.semana.length, 'calendar-week', 'accent') +
      statCard('Próxima semana', porGrupo.proxima.length, 'calendar-plus', 'purple') +
      statCard('Aguardando terceiro', porGrupo.aguardando.length, 'hourglass', 'warning') +
    '</div>';

  let corpo = GRUPOS.map(g => grupoHTML(g.titulo, porGrupo[g.id])).join('');

  // O que eu pedi para outras pessoas e ainda não voltou.
  if(propria){
    const meusPedidos = abertas(tarefas.filter(t => t.tipo === 'solicitacao' && t.solicitante === email));
    if(meusPedidos.length){
      corpo += '<section class="grupo"><div class="grupo__head">' +
        '<span class="grupo__titulo">Pedidos que eu fiz e estou esperando</span>' +
        '<span class="nav__count">' + meusPedidos.length + '</span></div><div class="lista">' +
        meusPedidos.sort(ordenarPorPrazo).map(t => linhaTarefa(t)).join('') + '</div></section>';
    }
  }
  if(!corpo) corpo = vazio('calendar-off', 'Nada na sua agenda', 'Quando alguém te definir como responsável de uma tarefa, ela aparece aqui pelo prazo da próxima ação.');

  const titulo = propria ? 'Minhas tarefas' : 'Tarefas de ' + esc(nomeDe(email));
  return '<div class="wrap">' +
    '<div class="row--between" style="margin-bottom:var(--space-5)">' +
      '<div>' +
        (propria ? '' : '<button class="btn" style="margin-bottom:var(--space-3)" onclick="pessoaAberta=null;render()"><i class="ti ti-arrow-left"></i> Equipe</button>') +
        '<h1 class="page-title">' + titulo + '</h1>' +
        '<p class="page-subtitle">' + agendaSubtitulo(hojeCount, propria) + '</p>' +
      '</div>' +
      (propria ? '<button class="btn btn--primary" onclick="modalNovaTarefa()"><i class="ti ti-plus"></i> Nova tarefa</button>' : '') +
    '</div>' + stats + corpo + '</div>';
}
function agendaSubtitulo(n, propria){
  const dia = new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long' });
  if(!propria) return 'Visão da agenda desta pessoa.';
  return dia.charAt(0).toUpperCase() + dia.slice(1) + ' · ' + (n ? n + ' item(ns) pedindo ação hoje' : 'nada pendente para hoje');
}
function ordenarPorPrazo(a, b){
  const pa = a.prazo || '9999-99-99', pb = b.prazo || '9999-99-99';
  return pa === pb ? String(a.titulo||'').localeCompare(String(b.titulo||''), 'pt-BR') : (pa < pb ? -1 : 1);
}
function statCard(label, valor, icone, cor){
  return '<div class="stat"><div class="stat__chip chip--' + cor + '"><i class="ti ti-' + icone + '"></i></div>' +
    '<div class="stat__value">' + valor + '</div><div class="stat__label">' + esc(label) + '</div></div>';
}
function vazio(icone, titulo, texto){
  return '<div class="vazio"><i class="ti ti-' + icone + '"></i><div style="font-weight:500;color:var(--text)">' +
    esc(titulo) + '</div><div class="small" style="margin-top:4px">' + esc(texto||'') + '</div></div>';
}

// ============================================================
// ABA 2 — PROJETOS
// ============================================================
function viewProjetos(){
  const ativos = projetos.filter(p => p.status !== 'concluido');
  const fechados = projetos.filter(p => p.status === 'concluido');
  const card = p => {
    const ts = tarefasDoProjeto(p._id);
    const ab = abertas(ts).length;
    const atrasadas = abertas(ts).filter(t => t.prazo && t.prazo < hoje()).length;
    const pct = ts.length ? Math.round((ts.length - ab) / ts.length * 100) : 0;
    return '<button class="proj-card" onclick="abrirProjeto(\'' + p._id + '\')">' +
      '<div class="row--between"><div class="proj-card__nome">' + esc(p.nome) + '</div>' +
      (p.status === 'concluido' ? '<span class="badge badge--success">Concluído</span>' :
       p.status === 'pausado' ? '<span class="badge badge--warning">Pausado</span>' : '') + '</div>' +
      '<div class="proj-card__desc">' + (esc(p.descricao) || '<span class="muted">Sem descrição</span>') + '</div>' +
      '<div class="proj-card__pes">' +
        '<div><b>' + ab + '</b>em aberto</div>' +
        '<div><b' + (atrasadas ? ' style="color:var(--danger)"' : '') + '>' + atrasadas + '</b>atrasadas</div>' +
        '<div><b>' + pct + '%</b>concluído</div>' +
      '</div>' +
      '<div class="progresso"><div class="progresso__fill" style="width:' + pct + '%"></div></div>' +
      '<div class="small muted" style="margin-top:var(--space-3)"><i class="ti ti-user"></i> ' +
        esc(nomeDe(p.lider)) + '</div>' +
    '</button>';
  };
  return '<div class="wrap">' +
    '<div class="row--between" style="margin-bottom:var(--space-5)">' +
      '<div><h1 class="page-title">Projetos</h1>' +
      '<p class="page-subtitle">' + ativos.length + ' em andamento · ' + abertas(tarefas).length + ' tarefas em aberto</p></div>' +
      '<button class="btn btn--primary" onclick="modalNovoProjeto()"><i class="ti ti-plus"></i> Novo projeto</button>' +
    '</div>' +
    (ativos.length ? '<div class="proj-grid">' + ativos.map(card).join('') + '</div>'
      : vazio('folder-plus', 'Nenhum projeto ainda', 'Crie o primeiro projeto para começar a organizar as tarefas da área.')) +
    (fechados.length ? '<div class="section-label">Concluídos</div><div class="proj-grid">' + fechados.map(card).join('') + '</div>' : '') +
  '</div>';
}

function abrirProjeto(id){ projetoAberto = id; aba = 'projetos'; render(); window.scrollTo(0,0); }

function viewProjeto(id){
  const p = projetoDe(id);
  if(!p) return '<div class="wrap">' + vazio('alert-circle', 'Projeto não encontrado') + '</div>';
  const ts = tarefasDoProjeto(id);
  const ordem = ['checar','a_fazer','andamento','aguardando','concluida'];
  const blocos = ordem.map(s => {
    const lista = ts.filter(t => t.status === s).sort(ordenarPorPrazo);
    return grupoHTML(STATUS[s].label, lista, { mostrarProjeto:false });
  }).join('');
  const podeEditar = ehMaster() || p.criadoPor === usuario.email || p.lider === usuario.email;
  return '<div class="wrap">' +
    '<button class="btn" style="margin-bottom:var(--space-4)" onclick="projetoAberto=null;render()">' +
      '<i class="ti ti-arrow-left"></i> Todos os projetos</button>' +
    '<div class="row--between" style="margin-bottom:var(--space-5)">' +
      '<div><h1 class="page-title">' + esc(p.nome) + '</h1>' +
        '<p class="page-subtitle">' + (esc(p.descricao) || 'Sem descrição') + '</p>' +
        '<div class="small muted" style="margin-top:6px"><i class="ti ti-user"></i> Líder: ' + esc(nomeDe(p.lider)) +
        ' · criado por ' + esc(nomeDe(p.criadoPor)) + ' em ' + esc(dataBR(p.criadoEm)) + '</div>' +
      '</div>' +
      '<div class="row">' +
        (podeEditar ? '<button class="btn" onclick="modalNovoProjeto(\'' + id + '\')"><i class="ti ti-pencil"></i> Editar</button>' : '') +
        '<button class="btn btn--primary" onclick="modalNovaTarefa(\'' + id + '\')"><i class="ti ti-plus"></i> Nova tarefa</button>' +
      '</div>' +
    '</div>' +
    (ts.length ? blocos : vazio('list-check', 'Nenhuma tarefa neste projeto', 'Crie a primeira tarefa, defina o responsável e o prazo da próxima ação.')) +
  '</div>';
}

// ============================================================
// ABA 3 — EQUIPE (carga de cada pessoa)
// ============================================================
function viewEquipe(){
  const linhas = usuarios.map(u => {
    const minhas = abertas(tarefas.filter(t => t.responsavel === u.email));
    const c = { atrasada:0, hoje:0, semana:0, proxima:0, aguardando:0, checar:0 };
    minhas.forEach(t => {
      const g = t.status === 'checar' ? 'checar' : (t.status === 'aguardando' ? 'aguardando' : grupoDoPrazo(t.prazo));
      if(c[g] != null) c[g]++;
    });
    return { u, minhas, c };
  }).sort((a,b) => b.minhas.length - a.minhas.length);
  const cel = (n, cor) => '<td class="num"' + (n && cor ? ' style="color:var(--' + cor + ');font-weight:600"' : '') + '>' + (n || '—') + '</td>';
  return '<div class="wrap">' +
    '<h1 class="page-title">Equipe</h1>' +
    '<p class="page-subtitle">Carga de cada pessoa pelo prazo da próxima ação. Clique para ver a agenda dela.</p>' +
    '<div class="card" style="margin-top:var(--space-5);overflow:hidden">' +
    '<table class="table"><thead><tr><th>Pessoa</th><th style="text-align:right">A checar</th>' +
    '<th style="text-align:right">Atrasadas</th><th style="text-align:right">Hoje</th>' +
    '<th style="text-align:right">Esta semana</th><th style="text-align:right">Próxima</th>' +
    '<th style="text-align:right">Aguardando</th><th style="text-align:right">Total aberto</th></tr></thead><tbody>' +
    linhas.map(l =>
      '<tr style="cursor:pointer" onclick="pessoaAberta=\'' + l.u.email + '\';render()">' +
      '<td><div class="person">' + avatar(l.u.email) +
        '<div><div class="person__name">' + esc(nomeDe(l.u.email)) + '</div>' +
        '<div class="person__sub">' + esc(l.u.email) + '</div></div></div></td>' +
      cel(l.c.checar, 'purple') + cel(l.c.atrasada, 'danger') + cel(l.c.hoje, 'accent') +
      cel(l.c.semana) + cel(l.c.proxima) + cel(l.c.aguardando, 'warning') +
      '<td class="num"><b>' + l.minhas.length + '</b></td></tr>').join('') +
    '</tbody></table></div></div>';
}
function viewPessoa(email){ return viewAgenda(email, false); }

// ============================================================
// PAINEL LATERAL DO TICKET
// ============================================================
function abrirTarefa(id){
  tarefaAberta = id;
  paraAnexar = [];
  mensagens = [];
  $('backdrop').classList.add('backdrop--on');
  $('drawer').classList.add('drawer--on');
  assinarMensagens(id);
  marcarLida(id);
  renderPainel();
}
function fecharPainel(){
  tarefaAberta = null;
  paraAnexar = [];
  if(unsubMsgs){ unsubMsgs(); unsubMsgs = null; }
  $('backdrop').classList.remove('backdrop--on');
  $('drawer').classList.remove('drawer--on');
  $('drawer').innerHTML = '';
}
function marcarLida(id){
  const patch = {};
  patch['lidoPor.' + chaveEmail(usuario.email)] = new Date().toISOString();
  atualizarTarefa(id, patch).catch(()=>{});
}
// Sem orderBy no servidor de propósito: 'where + orderBy' exigiria índice
// composto no Firestore. O volume por tarefa é pequeno; ordenamos aqui.
function assinarMensagens(id){
  if(unsubMsgs) unsubMsgs();
  unsubMsgs = window._onSnapshot(
    window._query(window._col(COL_MSG), window._where('tarefaId', '==', id)),
    snap => {
      const antes = mensagens.length;
      mensagens = [];
      snap.forEach(d => mensagens.push(Object.assign({ _id:d.id }, d.data())));
      mensagens.sort((a,b) => String(a.criadoEm||'').localeCompare(String(b.criadoEm||'')));
      renderPainel(mensagens.length !== antes);
    },
    erroFirestore
  );
}

function renderPainel(rolarChat){
  if(!tarefaAberta) return;
  const t = tarefaDe(tarefaAberta);
  const d = $('drawer');
  if(!t){ d.innerHTML = '<div class="drawer__body">' + vazio('trash', 'Esta tarefa foi excluída') + '</div>'; return; }

  // Preserva o que a pessoa já estava digitando antes do redesenho.
  const rascunho = $('msg-texto') ? $('msg-texto').value : '';
  const chatEl = $('chat-scroll');
  const estavaNoFim = chatEl ? (chatEl.scrollHeight - chatEl.scrollTop - chatEl.clientHeight < 80) : true;

  const st = STATUS[t.status] || STATUS.a_fazer;
  const proj = projetoDe(t.projetoId);
  const pai = t.paiId ? tarefaDe(t.paiId) : null;
  const filhas = filhasDe(t._id);
  const filhasAbertas = abertas(filhas);
  const ehSolic = t.tipo === 'solicitacao';
  const souResponsavel = t.responsavel === usuario.email;
  const podeExcluir = ehMaster() || t.criadoPor === usuario.email;

  const opcoesPessoa = sel => usuarios.map(u =>
    '<option value="' + esc(u.email) + '"' + (u.email === sel ? ' selected' : '') + '>' + esc(nomeDe(u.email)) + '</option>').join('');
  const opcoesStatus = sel => Object.keys(STATUS).map(k =>
    '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + STATUS[k].label + '</option>').join('');

  let acoes = '';
  if(t.status !== 'concluida'){
    if(ehSolic && souResponsavel){
      acoes = '<button class="btn btn--success" onclick="modalResponder(\'' + t._id + '\')">' +
              '<i class="ti ti-corner-up-left"></i> Responder e devolver</button>';
    }else{
      acoes = '<button class="btn btn--primary" onclick="modalSolicitar(\'' + t._id + '\')">' +
                '<i class="ti ti-user-plus"></i> Preciso de alguém</button>' +
              '<button class="btn btn--success" onclick="concluirTarefa(\'' + t._id + '\')">' +
                '<i class="ti ti-check"></i> Concluir</button>';
    }
  }else{
    acoes = '<button class="btn" onclick="reabrirTarefa(\'' + t._id + '\')"><i class="ti ti-rotate"></i> Reabrir</button>';
  }

  d.innerHTML =
  '<div class="drawer__head">' +
    '<div class="row--between" style="margin-bottom:var(--space-3)">' +
      '<div class="small muted">' +
        (proj ? '<i class="ti ti-folder"></i> ' + esc(proj.nome) : '<i class="ti ti-folder-off"></i> sem projeto') +
        (ehSolic ? ' · <span class="badge badge--accent">Solicitação</span>' : '') +
      '</div>' +
      '<button class="icon-btn" onclick="fecharPainel()" title="Fechar"><i class="ti ti-x"></i></button>' +
    '</div>' +
    '<div class="row--between">' +
      '<div style="font-size:16px;font-weight:600;line-height:1.35">' + esc(t.titulo) + '</div>' +
      '<span class="badge badge--' + st.badge + '" style="flex-shrink:0">' + st.label + '</span>' +
    '</div>' +
    (pai ? '<div class="small muted" style="margin-top:6px">Pedido dentro de: ' +
      '<a href="#" onclick="abrirTarefa(\'' + pai._id + '\');return false">' + esc(pai.titulo) + '</a></div>' : '') +
  '</div>' +

  '<div class="drawer__body" id="chat-scroll">' +
    '<div class="campos">' +
      '<div class="campo"><div class="campo__label">Responsável</div>' +
        '<select onchange="mudarResponsavel(\'' + t._id + '\',this.value)">' + opcoesPessoa(t.responsavel) + '</select></div>' +
      '<div class="campo"><div class="campo__label">Prazo da próxima ação</div>' +
        '<input type="date" value="' + esc(t.prazo || '') + '" onchange="mudarPrazo(\'' + t._id + '\',this.value)"></div>' +
      '<div class="campo"><div class="campo__label">Status</div>' +
        '<select onchange="mudarStatus(\'' + t._id + '\',this.value)">' + opcoesStatus(t.status) + '</select></div>' +
      '<div class="campo"><div class="campo__label">Criada por</div>' +
        '<div style="font-size:13px;padding-top:6px">' + esc(nomeDe(t.criadoPor)) + '<span class="muted small"> · ' + esc(dataBR(t.criadoEm)) + '</span></div></div>' +
    '</div>' +

    (t.descricao ? '<div class="section-label" style="margin-top:0">Descrição</div>' +
      '<div style="font-size:13px;white-space:pre-wrap;color:var(--text-secondary)">' + esc(t.descricao) + '</div>' : '') +

    (ehSolic && t.solicitante ? '<div class="banner banner--info" style="margin-top:var(--space-4)">' +
      '<i class="ti ti-arrow-forward-up"></i><div>' + esc(nomeDe(t.solicitante)) +
      ' precisa disto para seguir com a tarefa dele. Ao responder e devolver, a resposta vai para o chat da tarefa dele.</div></div>' : '') +

    (filhas.length ? '<div class="section-label">Pedidos feitos a partir desta tarefa</div><div class="lista">' +
      filhas.sort(ordenarPorPrazo).map(f => linhaTarefa(f, { mostrarProjeto:false })).join('') + '</div>' : '') +

    (filhasAbertas.length && t.status === 'aguardando'
      ? '<div class="banner banner--warning" style="margin-top:var(--space-4)"><i class="ti ti-hourglass"></i><div>Travada esperando ' +
        esc(filhasAbertas.map(f => primeiroNome(f.responsavel)).join(', ')) + '.</div></div>' : '') +

    '<div class="row" style="margin-top:var(--space-5);flex-wrap:wrap">' + acoes +
      (podeExcluir ? '<span class="spacer"></span><button class="icon-btn" title="Excluir tarefa" onclick="excluirTarefa(\'' + t._id + '\')"><i class="ti ti-trash"></i></button>' : '') +
    '</div>' +

    '<div class="section-label">Conversa</div>' +
    '<div class="chat">' + (mensagens.length ? mensagens.map(msgHTML).join('')
      : '<div class="small muted" style="text-align:center;padding:var(--space-4)">Nenhuma mensagem ainda. Use o campo abaixo para registrar a evolução.</div>') + '</div>' +
  '</div>' +

  '<div class="drawer__foot">' +
    '<div class="compositor">' +
      '<div class="anexos-fila" id="anexos-fila">' + filaAnexosHTML() + '</div>' +
      '<textarea id="msg-texto" placeholder="Escreva a evolução, uma dúvida, um combinado... (Ctrl+Enter envia)"></textarea>' +
      '<div class="row">' +
        '<button class="btn" onclick="document.getElementById(\'arq-input\').click()" title="Anexar arquivo pequeno"><i class="ti ti-paperclip"></i></button>' +
        '<button class="btn" onclick="modalLink()" title="Anexar link do Drive"><i class="ti ti-link"></i></button>' +
        '<input type="file" id="arq-input" multiple style="display:none" onchange="anexarArquivos(this)">' +
        '<span class="spacer"></span>' +
        '<button class="btn btn--primary" onclick="enviarMensagem()"><i class="ti ti-send"></i> Enviar</button>' +
      '</div>' +
    '</div>' +
  '</div>';

  const ta = $('msg-texto');
  ta.value = rascunho;
  ta.onkeydown = e => { if(e.key === 'Enter' && (e.ctrlKey || e.metaKey)) enviarMensagem(); };
  const sc = $('chat-scroll');
  if(sc && (rolarChat || estavaNoFim)) sc.scrollTop = sc.scrollHeight;
}

function msgHTML(m){
  if(m.tipo === 'sistema')
    return '<div class="msg msg--sys"><i class="ti ti-info-circle"></i> ' + esc(m.texto) +
           ' <span class="muted">· ' + esc(dataHoraBR(m.criadoEm)) + '</span></div>';
  const minha = m.autor === usuario.email;
  return '<div class="msg' + (minha ? ' msg--mine' : '') + '">' +
    '<div class="msg__meta">' + esc(minha ? 'Você' : (m.autorNome || nomeDe(m.autor))) + ' · ' + esc(dataHoraBR(m.criadoEm)) + '</div>' +
    (m.texto ? '<div class="msg__texto">' + esc(m.texto) + '</div>' : '') +
    (m.anexos && m.anexos.length ? '<div>' + m.anexos.map(anexoHTML).join('') + '</div>' : '') +
  '</div>';
}
function anexoHTML(a){
  if(a.tipo === 'link')
    return '<a class="anexo" href="' + esc(a.url) + '" target="_blank" rel="noopener">' +
      '<i class="ti ti-external-link"></i>' + esc(a.nome || a.url) + '</a>';
  return '<a class="anexo" href="' + esc(a.dados) + '" download="' + esc(a.nome) + '">' +
    '<i class="ti ti-file-download"></i>' + esc(a.nome) + '<span class="muted"> ' + kb(a.tamanho) + '</span></a>';
}
function kb(n){ return n ? '(' + (n > 1024*1024 ? (n/1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n/1024)) + ' KB') + ')' : ''; }

// ---------- Anexos ----------
// Sem Cloud Storage no projeto: arquivo pequeno vai embutido no documento da
// mensagem (o limite do Firestore é 1 MB por documento) e o resto entra como
// link do Drive.
const LIMITE_ARQ = 500 * 1024;     // por arquivo
const LIMITE_MSG = 800 * 1024;     // somado, por mensagem

function filaAnexosHTML(){
  return paraAnexar.map((a, i) =>
    '<span class="anexo" onclick="removerAnexo(' + i + ')" title="Remover">' +
    '<i class="ti ti-' + (a.tipo === 'link' ? 'link' : 'file') + '"></i>' + esc(a.nome) +
    ' <i class="ti ti-x muted"></i></span>').join('');
}
function atualizarFila(){ const el = $('anexos-fila'); if(el) el.innerHTML = filaAnexosHTML(); }
function removerAnexo(i){ paraAnexar.splice(i, 1); atualizarFila(); }

function anexarArquivos(input){
  const arquivos = Array.from(input.files || []);
  input.value = '';
  arquivos.forEach(f => {
    if(f.size > LIMITE_ARQ){
      toast('"' + f.name + '" tem ' + kb(f.size).replace(/[()]/g,'') + '. Acima de 500 KB, suba no Drive e anexe o link.', 'erro');
      return;
    }
    const total = paraAnexar.reduce((s, a) => s + (a.tamanho || 0), 0);
    if(total + f.size > LIMITE_MSG){ toast('Muitos arquivos nesta mensagem. Envie em duas mensagens.', 'erro'); return; }
    const fr = new FileReader();
    fr.onload = () => {
      paraAnexar.push({ tipo:'arquivo', nome:f.name, mime:f.type || '', tamanho:f.size, dados:fr.result });
      atualizarFila();
    };
    fr.readAsDataURL(f);
  });
}

async function enviarMensagem(){
  const ta = $('msg-texto');
  const texto = (ta.value || '').trim();
  if(!texto && !paraAnexar.length){ toast('Escreva algo ou anexe um arquivo.'); return; }
  const anexos = paraAnexar.slice();
  ta.value = ''; paraAnexar = []; atualizarFila();
  try{
    await postarMensagem(tarefaAberta, texto, 'msg', anexos);
  }catch(e){
    toast('Não foi possível enviar: ' + (e && e.code || e), 'erro');
    ta.value = texto; paraAnexar = anexos; atualizarFila();
  }
}

// ============================================================
// AÇÕES SOBRE A TAREFA
// ============================================================
async function mudarResponsavel(id, novo){
  const t = tarefaDe(id);
  if(!t || t.responsavel === novo) return;
  const antigo = t.responsavel;
  await atualizarTarefa(id, { responsavel:novo, atualizadoEm:new Date().toISOString() });
  await postarMensagem(id, 'Responsável passou de ' + nomeDe(antigo) + ' para ' + nomeDe(novo) + '.', 'sistema');
  toast('Agora é ' + primeiroNome(novo) + ' quem responde por esta tarefa.', 'ok');
}
async function mudarPrazo(id, prazo){
  const t = tarefaDe(id);
  if(!t || (t.prazo || '') === (prazo || '')) return;
  await atualizarTarefa(id, { prazo:prazo || null, atualizadoEm:new Date().toISOString() });
  await postarMensagem(id, 'Prazo da próxima ação: ' + (prazo ? dataBR(prazo) : 'removido') + '.', 'sistema');
}
async function mudarStatus(id, novo){
  const t = tarefaDe(id);
  if(!t || t.status === novo) return;
  if(novo === 'concluida'){ concluirTarefa(id); renderPainel(); return; }
  await atualizarTarefa(id, { status:novo, concluidaEm:null, atualizadoEm:new Date().toISOString() });
  await postarMensagem(id, 'Status: ' + (STATUS[novo] || {}).label + '.', 'sistema');
}
async function concluirTarefa(id){
  const t = tarefaDe(id);
  if(!t) return;
  // Solicitação se encerra respondendo — é a resposta que destrava quem pediu.
  if(t.tipo === 'solicitacao' && t.status !== 'concluida'){ modalResponder(id); return; }
  const pendentes = abertas(filhasDe(id));
  if(pendentes.length && !confirm('Esta tarefa tem ' + pendentes.length + ' pedido(s) em aberto com outras pessoas. Concluir mesmo assim?')) return;
  await atualizarTarefa(id, { status:'concluida', concluidaEm:new Date().toISOString() });
  await postarMensagem(id, 'Tarefa concluída por ' + usuario.nome + '.', 'sistema');
  toast('Tarefa concluída.', 'ok');
}
async function reabrirTarefa(id){
  await atualizarTarefa(id, { status:'a_fazer', concluidaEm:null });
  await postarMensagem(id, 'Tarefa reaberta por ' + usuario.nome + '.', 'sistema');
}
async function excluirTarefa(id){
  const t = tarefaDe(id);
  if(!t) return;
  if(filhasDe(id).length){ toast('Exclua primeiro os pedidos criados a partir desta tarefa.', 'erro'); return; }
  if(!confirm('Excluir "' + t.titulo + '" e toda a conversa dela? Isso não tem volta.')) return;
  try{
    const snap = await window._getDocs(window._query(window._col(COL_MSG), window._where('tarefaId','==',id)));
    const b = window._batch();
    snap.forEach(d => b.delete(window._doc(COL_MSG, d.id)));
    b.delete(window._doc(COL_TAR, id));
    await b.commit();
    fecharPainel();
    toast('Tarefa excluída.', 'ok');
  }catch(e){ toast('Não foi possível excluir: ' + (e && e.code || e), 'erro'); }
}

// ============================================================
// MODAIS
// ============================================================
function abrirModal(html){
  $('modal-card').innerHTML = html;
  $('modal').classList.add('modal--on');
  const p = $('modal-card').querySelector('input,select,textarea');
  if(p) setTimeout(() => p.focus(), 40);
}
function fecharModal(){
  $('modal').classList.remove('modal--on');
  $('modal-card').innerHTML = '';
}
function selPessoas(id, sel){
  return '<select id="' + id + '">' + usuarios.map(u =>
    '<option value="' + esc(u.email) + '"' + (u.email === sel ? ' selected' : '') + '>' +
    esc(nomeDe(u.email)) + '</option>').join('') + '</select>';
}
function molduraModal(titulo, corpo, botao, acao){
  return '<div class="modal__head">' + esc(titulo) + '</div>' +
    '<div class="modal__body">' + corpo + '</div>' +
    '<div class="modal__foot"><button class="btn" onclick="fecharModal()">Cancelar</button>' +
    '<button class="btn btn--primary" onclick="' + acao + '">' + esc(botao) + '</button></div>';
}

// ---------- Projeto ----------
function modalNovoProjeto(id){
  const p = id ? projetoDe(id) : null;
  abrirModal(molduraModal(p ? 'Editar projeto' : 'Novo projeto',
    '<div class="fg"><label>Nome do projeto</label><input id="p-nome" value="' + esc(p ? p.nome : '') + '" placeholder="Ex.: Implantação do ponto eletrônico"></div>' +
    '<div class="fg"><label>Descrição / objetivo</label><textarea id="p-desc" placeholder="O que este projeto precisa entregar">' + esc(p ? p.descricao : '') + '</textarea></div>' +
    '<div class="fg"><label>Líder do projeto</label>' + selPessoas('p-lider', p ? p.lider : usuario.email) + '</div>' +
    '<div class="fg"><label>Situação</label><select id="p-status">' +
      ['ativo','pausado','concluido'].map(s => '<option value="' + s + '"' + (p && p.status === s ? ' selected' : '') + '>' +
        ({ativo:'Em andamento',pausado:'Pausado',concluido:'Concluído'})[s] + '</option>').join('') + '</select></div>',
    p ? 'Salvar' : 'Criar projeto', 'salvarProjeto(' + (id ? '\'' + id + '\'' : 'null') + ')'));
}
async function salvarProjeto(id){
  const nome = ($('p-nome').value || '').trim();
  if(!nome){ toast('Dê um nome ao projeto.', 'erro'); return; }
  const dados = {
    nome, descricao:($('p-desc').value || '').trim(),
    lider:$('p-lider').value, status:$('p-status').value,
    atualizadoEm:new Date().toISOString()
  };
  try{
    if(id){
      await window._updateDoc(window._doc(COL_PROJ, id), dados);
      toast('Projeto atualizado.', 'ok');
    }else{
      dados.criadoPor = usuario.email;
      dados.criadoEm = new Date().toISOString();
      const novo = await criarDoc(COL_PROJ, dados);
      toast('Projeto criado.', 'ok');
      projetoAberto = novo; aba = 'projetos';
    }
    fecharModal(); render();
  }catch(e){ toast('Erro ao salvar: ' + (e && e.code || e), 'erro'); }
}

// ---------- Tarefa ----------
function modalNovaTarefa(projetoId){
  if(!projetos.length){
    toast('Crie um projeto antes de lançar tarefas.');
    aba = 'projetos'; render(); modalNovoProjeto();
    return;
  }
  const ativos = projetos.filter(p => p.status !== 'concluido');
  const lista = ativos.length ? ativos : projetos;
  abrirModal(molduraModal('Nova tarefa',
    '<div class="fg"><label>Projeto</label><select id="t-proj">' + lista.map(p =>
      '<option value="' + p._id + '"' + (p._id === (projetoId || projetoAberto) ? ' selected' : '') + '>' +
      esc(p.nome) + '</option>').join('') + '</select></div>' +
    '<div class="fg"><label>O que precisa ser feito</label><input id="t-titulo" placeholder="Ex.: Levantar as bases de horas extras de julho"></div>' +
    '<div class="fg"><label>Detalhes (opcional)</label><textarea id="t-desc" placeholder="Contexto, links, o que se espera de resultado"></textarea></div>' +
    '<div class="fg"><label>Responsável</label>' + selPessoas('t-resp', usuario.email) + '</div>' +
    '<div class="fg"><label>Prazo da próxima ação</label><input type="date" id="t-prazo" value="' + hoje() + '"></div>',
    'Criar tarefa', 'salvarTarefa()'));
}
async function salvarTarefa(){
  const titulo = ($('t-titulo').value || '').trim();
  if(!titulo){ toast('Descreva o que precisa ser feito.', 'erro'); return; }
  const agora = new Date().toISOString();
  try{
    const id = await criarDoc(COL_TAR, {
      projetoId:$('t-proj').value, titulo,
      descricao:($('t-desc').value || '').trim(),
      responsavel:$('t-resp').value, prazo:$('t-prazo').value || null,
      status:'a_fazer', tipo:'tarefa', paiId:null, solicitante:null,
      criadoPor:usuario.email, criadoEm:agora, atualizadoEm:agora,
      ultimaMsgEm:null, lidoPor:{}
    });
    fecharModal();
    toast('Tarefa criada.', 'ok');
    abrirTarefa(id);
  }catch(e){ toast('Erro ao criar: ' + (e && e.code || e), 'erro'); }
}

// ---------- Solicitação: o "preciso de alguém para seguir" ----------
function modalSolicitar(id){
  const t = tarefaDe(id);
  if(!t) return;
  const outros = usuarios.filter(u => u.email !== usuario.email);
  const padrao = (outros[0] || usuarios[0] || {}).email;
  abrirModal(molduraModal('Preciso de alguém para seguir',
    '<div class="banner banner--info" style="margin-bottom:var(--space-4)"><i class="ti ti-info-circle"></i>' +
      '<div>Isso cria uma solicitação na agenda da pessoa e deixa <b>' + esc(t.titulo) +
      '</b> como <b>aguardando terceiro</b>. Quando ela responder, a resposta cai na sua conversa e a tarefa volta para <b>a checar</b>.</div></div>' +
    '<div class="fg"><label>De quem você precisa</label>' + selPessoas('s-quem', padrao) + '</div>' +
    '<div class="fg"><label>O que você precisa dela</label><textarea id="s-texto" placeholder="Ex.: Preciso do parecer jurídico sobre a cláusula 4 para fechar o contrato"></textarea></div>' +
    '<div class="fg"><label>Para quando</label><input type="date" id="s-prazo" value="' + maisDias(2) + '"></div>',
    'Criar solicitação', 'salvarSolicitacao(\'' + id + '\')'));
}
async function salvarSolicitacao(paiId){
  const pai = tarefaDe(paiId);
  const quem = $('s-quem').value;
  const texto = ($('s-texto').value || '').trim();
  const prazo = $('s-prazo').value || null;
  if(!pai) return;
  if(!texto){ toast('Escreva o que você precisa.', 'erro'); return; }
  const resumo = texto.split('\n')[0].slice(0, 90);
  const agora = new Date().toISOString();
  try{
    const filhaId = await criarDoc(COL_TAR, {
      projetoId:pai.projetoId,
      titulo:resumo,
      descricao:texto,
      responsavel:quem, prazo,
      status:'a_fazer', tipo:'solicitacao',
      paiId, solicitante:usuario.email,
      criadoPor:usuario.email, criadoEm:agora, atualizadoEm:agora,
      ultimaMsgEm:agora, lidoPor:{}
    });
    // A tarefa de quem pediu sai da agenda do dia e fica travada.
    await atualizarTarefa(paiId, { status:'aguardando', atualizadoEm:agora });
    await postarMensagem(filhaId, usuario.nome + ' pediu isto a partir da tarefa "' + pai.titulo + '".', 'sistema');
    await postarMensagem(filhaId, texto, 'msg');
    await postarMensagem(paiId, 'Solicitado a ' + nomeDe(quem) + (prazo ? ' para ' + dataBR(prazo) : '') + ': ' + resumo, 'sistema');
    fecharModal();
    toast('Solicitação enviada para ' + primeiroNome(quem) + '.', 'ok');
  }catch(e){ toast('Erro ao solicitar: ' + (e && e.code || e), 'erro'); }
}

// ---------- Responder e devolver ----------
function modalResponder(id){
  const t = tarefaDe(id);
  if(!t) return;
  const pai = t.paiId ? tarefaDe(t.paiId) : null;
  abrirModal(molduraModal('Responder e devolver',
    '<div class="banner banner--info" style="margin-bottom:var(--space-4)"><i class="ti ti-corner-up-left"></i>' +
      '<div>Sua resposta entra na conversa' + (pai ? ' de "' + esc(pai.titulo) + '"' : '') +
      ' e devolve a ação para ' + esc(nomeDe(t.solicitante)) + '.</div></div>' +
    '<div class="fg"><label>Sua resposta</label><textarea id="r-texto" placeholder="O que você apurou, decidiu ou entregou"></textarea></div>' +
    '<div class="small muted">Precisa mandar arquivo? Feche esta janela, anexe na conversa da solicitação e depois responda — o anexo fica registrado no pedido.</div>',
    'Responder e devolver', 'salvarResposta(\'' + id + '\')'));
}
async function salvarResposta(id){
  const t = tarefaDe(id);
  const texto = ($('r-texto').value || '').trim();
  if(!t) return;
  if(!texto){ toast('Escreva a resposta.', 'erro'); return; }
  const agora = new Date().toISOString();
  try{
    await postarMensagem(id, texto, 'msg');
    await atualizarTarefa(id, { status:'concluida', concluidaEm:agora, atualizadoEm:agora });
    const pai = t.paiId ? tarefaDe(t.paiId) : null;
    if(pai){
      await postarMensagem(pai._id, usuario.nome + ' respondeu ao pedido "' + t.titulo + '": ' + texto, 'sistema');
      // Só destrava quando não sobrar nenhum outro pedido em aberto.
      const aindaAbertos = abertas(filhasDe(pai._id)).filter(f => f._id !== id);
      if(!aindaAbertos.length && pai.status !== 'concluida'){
        await atualizarTarefa(pai._id, { status:'checar', atualizadoEm:agora });
        await postarMensagem(pai._id, 'Todos os pedidos voltaram — tarefa liberada para checar.', 'sistema');
      }
    }
    fecharModal();
    toast('Respondido. A ação voltou para ' + primeiroNome(t.solicitante) + '.', 'ok');
  }catch(e){ toast('Erro ao responder: ' + (e && e.code || e), 'erro'); }
}

// ---------- Anexo por link ----------
function modalLink(){
  abrirModal(molduraModal('Anexar link',
    '<div class="fg"><label>Link (Google Drive, planilha, pasta...)</label><input id="l-url" placeholder="https://drive.google.com/..."></div>' +
    '<div class="fg"><label>Como chamar este link</label><input id="l-nome" placeholder="Ex.: Planilha de horas — julho"></div>',
    'Anexar', 'salvarLink()'));
}
function salvarLink(){
  const url = ($('l-url').value || '').trim();
  if(!/^https?:\/\//i.test(url)){ toast('Cole um link começando com http:// ou https://', 'erro'); return; }
  paraAnexar.push({ tipo:'link', url, nome:($('l-nome').value || '').trim() || url.replace(/^https?:\/\//,'').slice(0, 40) });
  fecharModal();
  atualizarFila();
}

// ============================================================
// PARTIDA
// ============================================================
if(window._firebaseReady) iniciar();
else window.addEventListener('firebaseReady', iniciar);
