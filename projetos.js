/* ============================================================
   PROJETOS ESTRATÉGICOS — Udiaço
   SPA em JS puro sobre o mesmo projeto Firebase do rhudi
   (udiaco-beneficios): os logins (Auth) e o controle de acesso
   (coleção 'usuarios') são os mesmos; as coleções deste app
   levam o prefixo 'pe_'.

   Modelo de dados
   ---------------
   pe_projetos/{id}      nome, descricao, status, lider, criadoPor, criadoEm
   pe_tarefas/{id}       projetoId, titulo, descricao, responsavel,
                         prazo, prazoFinal, status, tipo, paiId,
                         solicitante, criadoPor, criadoEm, concluidaEm,
                         ultimaMsgEm, lidoPor{chaveEmail: dataISO}
   pe_mensagens/{id}     tarefaId, projetoId, autor, autorNome, texto,
                         tipo ('msg'|'sistema'), mencoes[], anexos[], criadoEm
   pe_notificacoes/{id}  para, de, deNome, tipo, texto, tarefaId,
                         tarefaTitulo, criadoEm, lida
   usuarios/{email}      (coleção do rhudi) + campo 'foto' (dataURL 128px)

   OS DOIS PRAZOS (a distinção pedida pelo Alê)
   --------------------------------------------
   prazoFinal  = deadline. Quem pede define: "preciso disso até terça".
                 Não muda porque a pessoa se reprogramou.
   prazo       = próxima ação. Quando o RESPONSÁVEL planeja mexer nisso.
                 É esse que monta a agenda do "Minhas tarefas".
   Uma demanda que chega cai com próxima ação = hoje (para a pessoa ver e
   triar hoje); ela reprograma a próxima ação para quando vai fazer, e o
   deadline continua de pé. Se a próxima ação passar do deadline, a data
   aparece em âmbar — planejamento furando o combinado.

   FLUXO DE TROCA DE RESPONSÁVEL
   -----------------------------
   Quando preciso de algo de alguém para seguir, crio uma SOLICITAÇÃO —
   tarefa filha para essa pessoa. A minha fica 'aguardando'; quando ela
   responde e devolve, a resposta entra no meu chat e a tarefa volta
   para 'checar'.
   ============================================================ */

const COL_PROJ  = 'pe_projetos';
const COL_TAR   = 'pe_tarefas';
const COL_MSG   = 'pe_mensagens';
const COL_NOTIF = 'pe_notificacoes';

const MASTER_BOOTSTRAP = ['alexandre.magalhaes@udiaco.com.br'];

const STATUS = {
  a_fazer:    { label:'A fazer',      badge:'neutral', icone:'circle' },
  andamento:  { label:'Trabalhando',  badge:'accent',  icone:'player-play' },
  aguardando: { label:'Aguardando',   badge:'warning', icone:'hourglass' },
  checar:     { label:'A checar',     badge:'purple',  icone:'eye-check' },
  concluida:  { label:'Concluída',    badge:'success', icone:'circle-check' },
};
const TIPOS = {
  tarefa:      { label:'Tarefa',      icone:'point' },
  subtarefa:   { label:'Subtarefa',   icone:'corner-down-right' },
  solicitacao: { label:'Solicitação', icone:'arrow-forward-up' },
};
// Ordem dos grupos na agenda.
const GRUPOS = [
  { id:'checar',    titulo:'A checar (voltou para você)' },
  { id:'atrasada',  titulo:'Atrasadas' },
  { id:'hoje',      titulo:'Hoje' },
  { id:'semana',    titulo:'Esta semana' },
  { id:'proxima',   titulo:'Próxima semana' },
  { id:'depois',    titulo:'Mais para frente' },
  { id:'sem',       titulo:'Sem próxima ação definida' },
  { id:'aguardando',titulo:'Aguardando terceiro' },
];

// ---------- Estado ----------
let usuario   = null;   // {email, nome, papel}
let usuarios  = [];     // pessoas com acesso a esta plataforma (com foto)
let projetos  = [];
let tarefas   = [];
let notificacoes = [];
let aba = 'agenda';
let projetoAberto = null;
let pessoaAberta  = null;
let tarefaAberta  = null;
let mensagens = [];
let paraAnexar = [];        // anexos na fila do compositor
let paraMarcar = [];        // pessoas marcadas na próxima mensagem
let recolhidos = {};        // projetos recolhidos na tabela (só nesta sessão)
let expandidos = {};        // tarefas com as filhas abertas na tabela
let unsubs = [];

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
  t._t = setTimeout(() => t.classList.remove('on'), 3000);
}

// ---------- Datas (fuso local; ISO curto 'AAAA-MM-DD') ----------
const pad = n => String(n).padStart(2, '0');
function iso(d){ return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); }
function hoje(){ return iso(new Date()); }
function maisDias(n){ const d = new Date(); d.setDate(d.getDate()+n); return iso(d); }
function fimDaSemana(){                      // domingo que fecha a semana atual
  const d = new Date();
  const dow = (d.getDay() + 6) % 7;          // 0 = segunda ... 6 = domingo
  d.setDate(d.getDate() + (6 - dow));
  return iso(d);
}
function fimDaProximaSemana(){
  const d = new Date(fimDaSemana() + 'T12:00:00');
  d.setDate(d.getDate() + 7);
  return iso(d);
}
function dataBR(s){
  if(!s) return '';
  const p = String(s).slice(0,10).split('-');
  return p.length === 3 ? p[2] + '/' + p[1] : s;
}
function dataHoraBR(s){
  if(!s) return '';
  const d = new Date(s);
  if(isNaN(d)) return '';
  const hora = pad(d.getHours()) + ':' + pad(d.getMinutes());
  if(iso(d) === hoje()) return 'hoje ' + hora;
  if(iso(d) === maisDias(-1)) return 'ontem ' + hora;
  return pad(d.getDate()) + '/' + pad(d.getMonth()+1) + ' ' + hora;
}
function diasEntre(a, b){
  return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
}
// Em qual grupo da agenda a tarefa cai — pela PRÓXIMA AÇÃO.
function grupoDoPrazo(prazo){
  if(!prazo) return 'sem';
  const h = hoje();
  if(prazo < h) return 'atrasada';
  if(prazo === h) return 'hoje';
  if(prazo <= fimDaSemana()) return 'semana';
  if(prazo <= fimDaProximaSemana()) return 'proxima';
  return 'depois';
}
function grupoDaTarefa(t){
  if(t.status === 'checar') return 'checar';
  if(t.status === 'aguardando') return 'aguardando';
  return grupoDoPrazo(t.prazo);
}
function prazoTexto(prazo){
  if(!prazo) return 'sem data';
  const h = hoje();
  if(prazo === h) return 'hoje';
  if(prazo === maisDias(1)) return 'amanhã';
  if(prazo === maisDias(-1)) return 'ontem';
  if(prazo < h) return dataBR(prazo) + ' (' + diasEntre(prazo, h) + 'd atrás)';
  return dataBR(prazo);
}
// Classe da célula de data: vencida, hoje, ou próxima ação furando o deadline.
function classeData(data, t, ehFinal){
  if(!data || (t && t.status === 'concluida')) return '';
  const h = hoje();
  if(data < h) return 'data-cel--vencida';
  if(data === h) return 'data-cel--hoje';
  if(!ehFinal && t && t.prazoFinal && data > t.prazoFinal) return 'data-cel--risco';
  return '';
}
function deadlineEstourado(t){
  return !!(t.prazoFinal && t.status !== 'concluida' && t.prazoFinal < hoje());
}
function planejadoDepoisDoDeadline(t){
  return !!(t.prazo && t.prazoFinal && t.status !== 'concluida' && t.prazo > t.prazoFinal);
}

// ---------- Pessoas e fotos ----------
function pessoaDe(email){ return usuarios.find(u => u.email === email) || null; }
function nomeDe(email){
  if(!email) return '—';
  const u = pessoaDe(email);
  if(u && u.nome && u.nome.includes('@') === false) return u.nome;
  return email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function primeiroNome(email){ return nomeDe(email).trim().split(/\s+/)[0]; }
function iniciais(email){
  const n = nomeDe(email).trim().split(/\s+/);
  return ((n[0]||'?')[0] + (n.length > 1 ? n[n.length-1][0] : '')).toUpperCase();
}
// Miniatura: mostra o rosto quando a pessoa tem foto no cadastro; se não
// tiver, cai nas iniciais.
function avatar(email, cls){
  const u = pessoaDe(email);
  const dentro = u && u.foto
    ? '<img src="' + esc(u.foto) + '" alt="">'
    : esc(iniciais(email));
  return '<span class="avatar ' + (cls || '') + '" title="' + esc(nomeDe(email)) + '">' + dentro + '</span>';
}
function pessoaMini(email, cls){
  return '<span class="mini-pes">' + avatar(email, cls || 'avatar--sm') +
    '<span>' + esc(primeiroNome(email)) + '</span></span>';
}
function chaveEmail(email){ return String(email || '').replace(/[.@]/g, '_'); }
function ehMaster(){ return usuario && usuario.papel === 'master'; }

// ---------- Consultas em memória ----------
function projetoDe(id){ return projetos.find(p => p._id === id) || null; }
function tarefaDe(id){ return tarefas.find(t => t._id === id) || null; }
function tarefasDoProjeto(id){ return tarefas.filter(t => t.projetoId === id); }
function filhasDe(id){ return tarefas.filter(t => t.paiId === id); }
function pedidosDe(id){ return filhasDe(id).filter(t => t.tipo === 'solicitacao'); }
function subtarefasDe(id){ return filhasDe(id).filter(t => t.tipo !== 'solicitacao'); }
function abertas(arr){ return arr.filter(t => t.status !== 'concluida'); }
function temNaoLida(t){
  if(!t.ultimaMsgEm) return false;
  const lido = (t.lidoPor || {})[chaveEmail(usuario.email)];
  return !lido || lido < t.ultimaMsgEm;
}
function ordenarPorPrazo(a, b){
  const pa = a.prazo || '9999-99-99', pb = b.prazo || '9999-99-99';
  return pa === pb ? String(a.titulo||'').localeCompare(String(b.titulo||''), 'pt-BR') : (pa < pb ? -1 : 1);
}
// Quem acompanha a tarefa (recebe notificação de nova mensagem).
function envolvidos(t){
  const s = new Set([t.responsavel, t.criadoPor, t.solicitante].filter(Boolean));
  const pai = t.paiId ? tarefaDe(t.paiId) : null;
  if(pai){ if(pai.responsavel) s.add(pai.responsavel); if(pai.solicitante) s.add(pai.solicitante); }
  return Array.from(s);
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
  $('btn-sino').onclick = e => { e.stopPropagation(); alternarNotificacoes(); };
  $('btn-minha-foto').onclick = () => escolherMinhaFoto();
  $('backdrop').onclick = fecharPainel;
  document.addEventListener('click', e => {
    const p = $('notif-painel');
    if(p.classList.contains('notif-painel--on') && !p.contains(e.target)) p.classList.remove('notif-painel--on');
  });
  document.onkeydown = e => {
    if(e.key !== 'Escape') return;
    if($('modal').classList.contains('modal--on')) fecharModal();
    else if(tarefaAberta) fecharPainel();
    else $('notif-painel').classList.remove('notif-painel--on');
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

// Quem entra nesta plataforma: o Master sempre; os demais só se o Master
// marcou 'Projetos Estratégicos' na tela de Acessos (plataformas.projetos).
function temProjetos(d){
  if(!d || d.ativo === false || d.papel === 'um989') return false;
  if(d.papel === 'master') return true;
  return !!(d.plataformas && d.plataformas.projetos === true);
}
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
  return 'ok';
}
// Pessoas que podem receber tarefas: só quem também tem esta plataforma.
// Fica em snapshot para a foto nova aparecer sem recarregar a página.
function assinarPessoas(){
  unsubs.push(window._onSnapshot(window._col('usuarios'), snap => {
    usuarios = [];
    snap.forEach(d => {
      const u = d.data() || {};
      if(!temProjetos(u)) return;
      usuarios.push({ email:(u.email || d.id).toLowerCase(), nome:u.nome || d.id,
                      papel:u.papel || '', foto:u.foto || null });
    });
    if(usuario && !usuarios.some(u => u.email === usuario.email))
      usuarios.push({ email:usuario.email, nome:usuario.nome, papel:usuario.papel, foto:null });
    usuarios.sort((a,b) => nomeDe(a.email).localeCompare(nomeDe(b.email), 'pt-BR'));
    render();
    renderMinhaFoto();
    if(tarefaAberta) renderPainel();
  }, erroFirestore));
}

function mostrarLogin(){
  $('tela-app').style.display = 'none';
  $('tela-login').style.display = 'flex';
  fecharPainel();
  unsubs.forEach(f => { try{ f(); }catch(e){} });
  unsubs = [];
}
function mostrarApp(){
  $('tela-login').style.display = 'none';
  $('tela-app').style.display = 'block';
  $('user-info').textContent = usuario.nome;
}

// ============================================================
// DADOS EM TEMPO REAL
// ============================================================
// O volume é pequeno (uma área), então vale ouvir as coleções inteiras:
// qualquer alteração de qualquer pessoa aparece na hora e sem índice composto.
function assinarDados(){
  unsubs.forEach(f => { try{ f(); }catch(e){} });
  unsubs = [];
  assinarPessoas();
  unsubs.push(window._onSnapshot(window._col(COL_PROJ), snap => {
    projetos = [];
    snap.forEach(d => projetos.push(Object.assign({ _id:d.id }, d.data())));
    projetos.sort((a,b) => String(a.nome||'').localeCompare(String(b.nome||''), 'pt-BR'));
    render();
  }, erroFirestore));
  unsubs.push(window._onSnapshot(window._col(COL_TAR), snap => {
    tarefas = [];
    snap.forEach(d => tarefas.push(Object.assign({ _id:d.id }, d.data())));
    render();
    if(tarefaAberta) renderPainel();
  }, erroFirestore));
  // Notificações: só as minhas (filtro no servidor, ordenação no cliente).
  unsubs.push(window._onSnapshot(
    window._query(window._col(COL_NOTIF), window._where('para', '==', usuario.email)),
    snap => {
      const antesNaoLidas = notificacoes.filter(n => !n.lida).length;
      notificacoes = [];
      snap.forEach(d => notificacoes.push(Object.assign({ _id:d.id }, d.data())));
      notificacoes.sort((a,b) => String(b.criadoEm||'').localeCompare(String(a.criadoEm||'')));
      const agora = notificacoes.filter(n => !n.lida).length;
      renderSino();
      if($('notif-painel').classList.contains('notif-painel--on')) renderNotificacoes();
      // Avisa na hora quando chega algo novo com a tela aberta.
      if(agora > antesNaoLidas){
        const n = notificacoes.find(x => !x.lida);
        if(n) toast(textoNotificacao(n), 'ok');
      }
    }, erroFirestore));
  limparNotificacoesAntigas();
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
// Cria uma notificação para cada pessoa (menos para quem fez a ação).
async function notificar(paras, tipo, texto, t){
  const agora = new Date().toISOString();
  const alvos = Array.from(new Set((paras || []).filter(e => e && e !== usuario.email)));
  await Promise.all(alvos.map(para => criarDoc(COL_NOTIF, {
    para, de:usuario.email, deNome:usuario.nome, tipo, texto,
    tarefaId: t ? t._id : null, tarefaTitulo: t ? t.titulo : '',
    projetoId: t ? t.projetoId : null, criadoEm:agora, lida:false
  }).catch(()=>{})));
}
// Mensagem no chat. tipo 'sistema' = registro automático do fluxo.
async function postarMensagem(tarefaId, texto, tipo, anexos, mencoes){
  const t = tarefaDe(tarefaId);
  const agora = new Date().toISOString();
  await criarDoc(COL_MSG, {
    tarefaId, projetoId: t ? t.projetoId : null,
    autor: usuario.email, autorNome: usuario.nome,
    texto: texto || '', tipo: tipo || 'msg',
    anexos: anexos || [], mencoes: mencoes || [], criadoEm: agora
  });
  const patch = { ultimaMsgEm: agora };
  patch['lidoPor.' + chaveEmail(usuario.email)] = agora;   // quem escreveu já leu
  await atualizarTarefa(tarefaId, patch).catch(()=>{});
  return t;
}

// ============================================================
// FOTO DO PERFIL
// ============================================================
// A foto vai reduzida (128px, JPEG) para dentro do doc de 'usuarios' — some
// alguns KB, aparece em todas as miniaturas e não exige Cloud Storage. Cada
// pessoa troca a própria; o Master troca a de qualquer um, na tela Acessos.
function renderMinhaFoto(){
  const b = $('btn-minha-foto');
  if(b && usuario) b.innerHTML = avatar(usuario.email, 'avatar--sm');
}
function escolherMinhaFoto(){
  const inp = $('foto-input');
  inp.value = '';
  inp.onchange = () => {
    const f = inp.files && inp.files[0];
    if(!f) return;
    reduzirImagem(f, 128, async dataUrl => {
      try{
        await window._setDoc(window._doc('usuarios', usuario.email), { foto:dataUrl }, { merge:true });
        toast('Foto atualizada.', 'ok');
      }catch(e){ toast('Não foi possível salvar a foto: ' + (e && e.code || e), 'erro'); }
    });
  };
  inp.click();
}
// Recorta no centro, redimensiona e devolve dataURL JPEG.
function reduzirImagem(file, lado, cb){
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = lado;
      const ctx = c.getContext('2d');
      const m = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - m)/2, (img.height - m)/2, m, m, 0, 0, lado, lado);
      cb(c.toDataURL('image/jpeg', 0.78));
    };
    img.onerror = () => toast('Não consegui ler esta imagem.', 'erro');
    img.src = fr.result;
  };
  fr.readAsDataURL(file);
}

// ============================================================
// NOTIFICAÇÕES
// ============================================================
const ICONE_NOTIF = {
  solicitacao:'arrow-forward-up', resposta:'corner-up-left', mensagem:'message',
  mencao:'at', atribuicao:'user-check', prazo:'clock'
};
function textoNotificacao(n){
  const quem = primeiroNome(n.de);
  if(n.tipo === 'solicitacao') return quem + ' pediu algo para você';
  if(n.tipo === 'resposta')    return quem + ' respondeu seu pedido';
  if(n.tipo === 'mencao')      return quem + ' marcou você';
  if(n.tipo === 'atribuicao')  return quem + ' passou uma tarefa para você';
  return quem + ' comentou em uma tarefa sua';
}
function naoLidas(){ return notificacoes.filter(n => !n.lida); }
function renderSino(){
  const b = $('sino-badge');
  const n = naoLidas().length;
  b.textContent = n > 9 ? '9+' : n;
  b.style.display = n ? 'flex' : 'none';
}
function alternarNotificacoes(){
  const p = $('notif-painel');
  const abrindo = !p.classList.contains('notif-painel--on');
  p.classList.toggle('notif-painel--on', abrindo);
  if(abrindo) renderNotificacoes();
}
function renderNotificacoes(){
  const p = $('notif-painel');
  const lista = notificacoes.slice(0, 40);
  const n = naoLidas().length;
  p.innerHTML =
    '<div class="row--between" style="padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--border)">' +
      '<b style="font-size:13px">Notificações' + (n ? ' (' + n + ')' : '') + '</b>' +
      (n ? '<button class="btn" style="height:28px;font-size:12px" onclick="marcarTodasLidas()">Marcar todas como lidas</button>' : '') +
    '</div>' +
    (lista.length ? lista.map(x =>
      '<button class="notif' + (x.lida ? '' : ' notif--nova') + '" onclick="abrirNotificacao(\'' + x._id + '\')">' +
        avatar(x.de, 'avatar--sm') +
        '<span class="notif__txt">' +
          '<b style="font-weight:600">' + esc(textoNotificacao(x)) + '</b>' +
          (x.texto ? '<div style="margin-top:2px;color:var(--text-secondary)">' + esc(recorta(x.texto, 120)) + '</div>' : '') +
          '<div class="notif__sub">' + (x.tarefaTitulo ? esc(recorta(x.tarefaTitulo, 60)) + ' · ' : '') +
            esc(dataHoraBR(x.criadoEm)) + '</div>' +
        '</span>' +
        '<i class="ti ti-' + (ICONE_NOTIF[x.tipo] || 'bell') + ' muted"></i>' +
      '</button>').join('')
      : '<div class="vazio" style="padding:var(--space-6)"><i class="ti ti-bell-off"></i>' +
        '<div class="small">Nenhuma notificação</div></div>');
}
function recorta(s, n){ s = String(s || ''); return s.length > n ? s.slice(0, n-1) + '…' : s; }
async function abrirNotificacao(id){
  const n = notificacoes.find(x => x._id === id);
  $('notif-painel').classList.remove('notif-painel--on');
  if(!n) return;
  if(!n.lida) window._updateDoc(window._doc(COL_NOTIF, id), { lida:true }).catch(()=>{});
  if(n.tarefaId && tarefaDe(n.tarefaId)) abrirTarefa(n.tarefaId);
  else toast('A tarefa desta notificação não existe mais.');
}
async function marcarTodasLidas(){
  const abertas = naoLidas();
  if(!abertas.length) return;
  const b = window._batch();
  abertas.slice(0, 400).forEach(n => b.update(window._doc(COL_NOTIF, n._id), { lida:true }));
  try{ await b.commit(); }catch(e){ toast('Erro: ' + (e && e.code || e), 'erro'); }
}
// Higiene: notificação lida com mais de 21 dias não serve para nada.
async function limparNotificacoesAntigas(){
  setTimeout(async () => {
    const limite = maisDias(-21);
    const velhas = notificacoes.filter(n => n.lida && String(n.criadoEm||'').slice(0,10) < limite);
    if(!velhas.length) return;
    const b = window._batch();
    velhas.slice(0, 300).forEach(n => b.delete(window._doc(COL_NOTIF, n._id)));
    try{ await b.commit(); }catch(e){}
  }, 8000);
}

// ============================================================
// NAVEGAÇÃO
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
  renderSino();
  const v = $('view');
  if(aba === 'agenda')        v.innerHTML = viewAgenda(usuario.email, true);
  else if(aba === 'projetos') v.innerHTML = viewProjetos();
  else if(aba === 'equipe')   v.innerHTML = pessoaAberta ? viewAgenda(pessoaAberta, false) : viewEquipe();
}
function renderNav(){
  const minhas = abertas(tarefas.filter(t => t.responsavel === usuario.email));
  const urgentes = minhas.filter(t => ['checar','atrasada','hoje'].includes(grupoDaTarefa(t))).length;
  const itens = [
    { id:'agenda',   icone:'calendar-check', label:'Minhas tarefas', count:urgentes },
    { id:'projetos', icone:'table',          label:'Projetos',       count:projetos.filter(p => p.status !== 'concluido').length },
    { id:'equipe',   icone:'users',          label:'Equipe',         count:0 },
  ];
  $('nav').innerHTML = itens.map(i =>
    '<button class="nav__item' + (aba === i.id ? ' nav__item--active' : '') + '" onclick="irPara(\'' + i.id + '\')">' +
      '<i class="ti ti-' + i.icone + '"></i> ' + i.label +
      (i.count ? ' <span class="nav__count">' + i.count + '</span>' : '') +
    '</button>').join('');
}
function vazio(icone, titulo, texto){
  return '<div class="vazio"><i class="ti ti-' + icone + '"></i><div style="font-weight:500;color:var(--text)">' +
    esc(titulo) + '</div><div class="small" style="margin-top:4px">' + esc(texto||'') + '</div></div>';
}
function statCard(label, valor, icone, cor){
  return '<div class="stat"><div class="stat__chip chip--' + cor + '"><i class="ti ti-' + icone + '"></i></div>' +
    '<div class="stat__value">' + valor + '</div><div class="stat__label">' + esc(label) + '</div></div>';
}

// ============================================================
// ABA 1 — MINHAS TAREFAS (agenda pela PRÓXIMA AÇÃO)
// ============================================================
// Cada linha traz o deadline ao lado e um campo para a pessoa REPROGRAMAR a
// próxima ação sem abrir a tarefa: é assim que a demanda que chegou para hoje
// vai para segunda sem mexer no prazo final combinado.
function itemAgenda(t, opcoes){
  const o = opcoes || {};
  const g = grupoDaTarefa(t);
  const cls = ['item'];
  if(t.status === 'concluida') cls.push('item--concluida');
  else if(['checar','aguardando','atrasada','hoje'].includes(g)) cls.push('item--' + g);
  const st = STATUS[t.status] || STATUS.a_fazer;
  const proj = projetoDe(t.projetoId);
  const pai = t.paiId ? tarefaDe(t.paiId) : null;
  const pedAbertos = abertas(pedidosDe(t._id)).length;

  const sub = [];
  if(proj) sub.push('<span><i class="ti ti-folder"></i> ' + esc(proj.nome) + '</span>');
  if(t.tipo === 'solicitacao' && t.solicitante)
    sub.push('<span class="dot"></span><span><i class="ti ti-arrow-forward-up"></i> pedido de ' + esc(primeiroNome(t.solicitante)) + '</span>');
  else if(t.tipo === 'subtarefa' && pai)
    sub.push('<span class="dot"></span><span><i class="ti ti-corner-down-right"></i> ' + esc(recorta(pai.titulo, 40)) + '</span>');
  if(t.prazoFinal){
    const c = deadlineEstourado(t) ? 'style="color:var(--danger-text);font-weight:600"'
            : (planejadoDepoisDoDeadline(t) ? 'style="color:var(--warning-text);font-weight:600"' : '');
    sub.push('<span class="dot"></span><span ' + c + '><i class="ti ti-flag"></i> prazo final ' +
      esc(dataBR(t.prazoFinal)) + (deadlineEstourado(t) ? ' (vencido)' : '') + '</span>');
  }
  if(pedAbertos) sub.push('<span class="dot"></span><span><i class="ti ti-hourglass"></i> ' + pedAbertos + ' pedido(s) em aberto</span>');
  if(planejadoDepoisDoDeadline(t))
    sub.push('<span class="dot"></span><span style="color:var(--warning-text)">próxima ação depois do prazo final</span>');

  const podeReprog = t.responsavel === usuario.email && t.status !== 'concluida' && o.reprogramar !== false;
  return '<div class="' + cls.join(' ') + '" onclick="abrirTarefa(\'' + t._id + '\')">' +
    (o.avatar === false ? '' : avatar(t.responsavel, 'avatar--sm')) +
    '<div class="item__main">' +
      '<div class="item__tit">' + esc(t.titulo) +
        (temNaoLida(t) ? ' <span class="pill pill--nova">novo</span>' : '') + '</div>' +
      '<div class="item__sub">' + sub.join(' ') + '</div>' +
    '</div>' +
    '<div class="row" onclick="event.stopPropagation()" style="flex-shrink:0">' +
      (podeReprog ? '<label class="reprog" title="Quando você vai mexer nisso"><i class="ti ti-calendar-event"></i>' +
        '<input type="date" value="' + esc(t.prazo || '') + '" onchange="mudarPrazo(\'' + t._id + '\',this.value)"></label>' : '') +
      '<span class="badge badge--' + st.badge + '">' + st.label + '</span>' +
    '</div>' +
  '</div>';
}
function grupoHTML(titulo, lista, opcoes){
  if(!lista.length) return '';
  return '<section class="grupo">' +
    '<div class="grupo__head"><span class="grupo__titulo">' + esc(titulo) + '</span>' +
    '<span class="nav__count">' + lista.length + '</span></div>' +
    '<div class="lista">' + lista.map(t => itemAgenda(t, opcoes)).join('') + '</div></section>';
}

function viewAgenda(email, propria){
  const minhas = abertas(tarefas.filter(t => t.responsavel === email));
  const porGrupo = {};
  GRUPOS.forEach(g => porGrupo[g.id] = []);
  minhas.forEach(t => porGrupo[grupoDaTarefa(t)].push(t));
  Object.keys(porGrupo).forEach(k => porGrupo[k].sort(ordenarPorPrazo));

  const hojeCount = porGrupo.hoje.length + porGrupo.atrasada.length + porGrupo.checar.length;
  const vencidos = minhas.filter(deadlineEstourado).length;
  const stats = '<div class="stat-grid" style="margin-bottom:var(--space-6)">' +
      statCard('Para hoje', hojeCount, 'sun', hojeCount ? 'accent' : 'success') +
      statCard('Atrasadas', porGrupo.atrasada.length, 'alert-triangle', porGrupo.atrasada.length ? 'danger' : 'success') +
      statCard('Prazo final vencido', vencidos, 'flag', vencidos ? 'danger' : 'success') +
      statCard('Esta semana', porGrupo.semana.length, 'calendar-week', 'accent') +
      statCard('Próxima semana', porGrupo.proxima.length, 'calendar-plus', 'purple') +
      statCard('Aguardando terceiro', porGrupo.aguardando.length, 'hourglass', 'warning') +
    '</div>';

  let corpo = GRUPOS.map(g => grupoHTML(g.titulo, porGrupo[g.id], { reprogramar:propria })).join('');
  if(propria){
    const meusPedidos = abertas(tarefas.filter(t => t.tipo === 'solicitacao' && t.solicitante === email));
    if(meusPedidos.length){
      corpo += '<section class="grupo"><div class="grupo__head">' +
        '<span class="grupo__titulo">Pedidos que eu fiz e estou esperando</span>' +
        '<span class="nav__count">' + meusPedidos.length + '</span></div><div class="lista">' +
        meusPedidos.sort(ordenarPorPrazo).map(t => itemAgenda(t, { reprogramar:false })).join('') + '</div></section>';
    }
  }
  if(!corpo) corpo = vazio('calendar-off', 'Nada na agenda',
    'Quando alguém te definir como responsável, a tarefa aparece aqui pelo prazo da próxima ação.');

  const dia = new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long' });
  return '<div class="wrap">' +
    '<div class="row--between" style="margin-bottom:var(--space-5)">' +
      '<div>' +
        (propria ? '' : '<button class="btn" style="margin-bottom:var(--space-3)" onclick="pessoaAberta=null;render()"><i class="ti ti-arrow-left"></i> Equipe</button>') +
        '<h1 class="page-title">' + (propria ? 'Minhas tarefas' : 'Tarefas de ' + esc(nomeDe(email))) + '</h1>' +
        '<p class="page-subtitle">' + (propria
          ? dia.charAt(0).toUpperCase() + dia.slice(1) + ' · ' + (hojeCount ? hojeCount + ' item(ns) pedindo ação hoje' : 'nada pendente para hoje')
          : 'Agenda desta pessoa, pelo prazo da próxima ação.') + '</p>' +
      '</div>' +
      (propria ? '<button class="btn btn--primary" onclick="modalNovaTarefa()"><i class="ti ti-plus"></i> Nova tarefa</button>' : '') +
    '</div>' + stats + corpo + '</div>';
}

// ============================================================
// ABA 2 — PROJETOS (uma tabela por projeto)
// ============================================================
// Cada projeto é um bloco com sua tabela: uma linha por demanda, e as
// subtarefas e os pedidos entram recuados como sublinhas da tarefa mãe.
let mostrarConcluidas = false;

function viewProjetos(){
  const ativos = projetos.filter(p => p.status !== 'concluido');
  const fechados = projetos.filter(p => p.status === 'concluido');
  const total = abertas(tarefas).length;
  const cabecalho =
    '<div class="row--between" style="margin-bottom:var(--space-5);flex-wrap:wrap">' +
      '<div><h1 class="page-title">Projetos</h1>' +
      '<p class="page-subtitle">' + ativos.length + ' em andamento · ' + total + ' demandas em aberto</p></div>' +
      '<div class="row">' +
        '<label class="chip chip--plain" style="cursor:pointer"><input type="checkbox"' +
          (mostrarConcluidas ? ' checked' : '') + ' onchange="mostrarConcluidas=this.checked;render()"> Mostrar concluídas</label>' +
        '<button class="btn btn--primary" onclick="modalNovoProjeto()"><i class="ti ti-plus"></i> Novo projeto</button>' +
      '</div>' +
    '</div>';
  if(!projetos.length)
    return '<div class="wrap">' + cabecalho + vazio('folder-plus', 'Nenhum projeto ainda',
      'Crie o primeiro projeto para começar a organizar as demandas da área.') + '</div>';
  return '<div class="wrap">' + cabecalho +
    ativos.map(blocoProjeto).join('') +
    (fechados.length ? '<div class="section-label">Projetos concluídos</div>' + fechados.map(blocoProjeto).join('') : '') +
  '</div>';
}

function blocoProjeto(p){
  const ts = tarefasDoProjeto(p._id);
  const ab = abertas(ts);
  const atrasadas = ab.filter(t => t.prazo && t.prazo < hoje()).length;
  const vencidos = ab.filter(deadlineEstourado).length;
  const pct = ts.length ? Math.round((ts.length - ab.length) / ts.length * 100) : 0;
  const recolhido = !!recolhidos[p._id];
  const podeEditar = ehMaster() || p.criadoPor === usuario.email || p.lider === usuario.email;

  // Árvore: só as raízes na primeira volta; as filhas entram recuadas.
  const raizes = ts.filter(t => !t.paiId || !tarefaDe(t.paiId)).sort(ordenarPorPrazo);
  const corpo = raizes.map(t => linhasComFilhas(t, 0)).join('');

  return '<section class="proj-bloco" id="proj-' + p._id + '">' +
    '<div class="proj-bloco__head">' +
      '<button class="proj-bloco__nome" onclick="alternarProjeto(\'' + p._id + '\')">' +
        '<i class="ti ti-chevron-' + (recolhido ? 'right' : 'down') + '"></i>' + esc(p.nome) + '</button>' +
      (p.status === 'concluido' ? '<span class="badge badge--success">Concluído</span>' :
       p.status === 'pausado'   ? '<span class="badge badge--warning">Pausado</span>' : '') +
      '<span class="small muted">' + ab.length + ' em aberto' +
        (atrasadas ? ' · <span style="color:var(--danger-text)">' + atrasadas + ' atrasada(s)</span>' : '') +
        (vencidos ? ' · <span style="color:var(--danger-text)">' + vencidos + ' com prazo final vencido</span>' : '') +
        ' · ' + pct + '% concluído</span>' +
      '<span class="spacer"></span>' +
      '<span class="small muted" title="Líder do projeto">' + pessoaMini(p.lider) + '</span>' +
      (podeEditar ? '<button class="icon-btn" title="Editar projeto" onclick="modalNovoProjeto(\'' + p._id + '\')"><i class="ti ti-pencil"></i></button>' : '') +
      '<button class="btn" onclick="modalNovaTarefa(\'' + p._id + '\')"><i class="ti ti-plus"></i> Demanda</button>' +
    '</div>' +
    (recolhido ? '' :
      (corpo ? '<div class="tab-wrap"><table class="tab">' +
        '<thead><tr><th class="cel-dem">Demanda</th><th>Responsável</th><th>Status</th>' +
        '<th>Próxima ação</th><th>Prazo final</th></tr></thead>' +
        '<tbody>' + corpo + '</tbody></table></div>'
      : vazio('list-check', 'Nenhuma demanda neste projeto',
              'Clique em "Demanda" para criar a primeira, com responsável, próxima ação e prazo final.'))) +
  '</section>';
}
function alternarProjeto(id){ recolhidos[id] = !recolhidos[id]; render(); }
function alternarFilhas(id, ev){ if(ev) ev.stopPropagation(); expandidos[id] = expandidos[id] === false; render(); }

// Uma linha + (recursivamente) as sublinhas dela.
function linhasComFilhas(t, nivel){
  if(t.status === 'concluida' && !mostrarConcluidas) return '';
  const filhas = filhasDe(t._id)
    .filter(f => mostrarConcluidas || f.status !== 'concluida')
    .sort((a,b) => (a.tipo === 'solicitacao' ? 1 : 0) - (b.tipo === 'solicitacao' ? 1 : 0) || ordenarPorPrazo(a,b));
  const aberto = expandidos[t._id] !== false;
  return linhaTabela(t, nivel, filhas.length, aberto) +
    (aberto && nivel < 2 ? filhas.map(f => linhasComFilhas(f, nivel+1)).join('') : '');
}

function linhaTabela(t, nivel, qtdFilhas, aberto){
  const st = STATUS[t.status] || STATUS.a_fazer;
  const sub = [];
  if(t.tipo === 'solicitacao' && t.solicitante) sub.push('pedido de ' + primeiroNome(t.solicitante));
  else if(t.tipo === 'subtarefa') sub.push('subtarefa');
  if(qtdFilhas) sub.push(qtdFilhas + ' sublinha(s)');
  if(planejadoDepoisDoDeadline(t)) sub.push('próxima ação depois do prazo final');
  const ramo = nivel > 0
    ? '<i class="ti ti-' + (t.tipo === 'solicitacao' ? 'arrow-forward-up' : 'corner-down-right') + ' ramo"></i>'
    : '';
  const toggle = qtdFilhas
    ? '<button class="icon-btn" style="width:20px;height:20px;font-size:14px;margin-right:-2px" title="Mostrar/ocultar sublinhas" ' +
      'onclick="alternarFilhas(\'' + t._id + '\',event)"><i class="ti ti-chevron-' + (aberto ? 'down' : 'right') + '"></i></button>'
    : '';
  return '<tr class="nivel-' + nivel + (t.status === 'concluida' ? ' lin--concluida' : '') +
      '" onclick="abrirTarefa(\'' + t._id + '\')">' +
    '<td class="cel-dem"><div class="demanda">' + toggle + ramo +
      '<div><div class="demanda__tit">' + esc(t.titulo) +
        (temNaoLida(t) ? ' <span class="pill pill--nova">novo</span>' : '') + '</div>' +
        (sub.length ? '<div class="demanda__sub">' + esc(sub.join(' · ')) + '</div>' : '') +
      '</div></div></td>' +
    '<td class="cel-resp">' + pessoaMini(t.responsavel) + '</td>' +
    '<td><span class="badge badge--' + st.badge + '">' + st.label + '</span></td>' +
    '<td class="data-cel ' + classeData(t.prazo, t, false) + '">' + esc(t.prazo ? prazoTexto(t.prazo) : '—') + '</td>' +
    '<td class="data-cel ' + classeData(t.prazoFinal, t, true) + '">' + esc(t.prazoFinal ? dataBR(t.prazoFinal) : '—') + '</td>' +
  '</tr>';
}

// ============================================================
// ABA 3 — EQUIPE
// ============================================================
function viewEquipe(){
  const linhas = usuarios.map(u => {
    const minhas = abertas(tarefas.filter(t => t.responsavel === u.email));
    const c = { atrasada:0, hoje:0, semana:0, proxima:0, aguardando:0, checar:0 };
    minhas.forEach(t => { const g = grupoDaTarefa(t); if(c[g] != null) c[g]++; });
    return { u, minhas, c, vencidos:minhas.filter(deadlineEstourado).length };
  }).sort((a,b) => b.minhas.length - a.minhas.length);
  const cel = (n, cor) => '<td class="data-cel" style="text-align:right' +
    (n && cor ? ';color:var(--' + cor + ');font-weight:600' : '') + '">' + (n || '—') + '</td>';
  return '<div class="wrap">' +
    '<h1 class="page-title">Equipe</h1>' +
    '<p class="page-subtitle">Carga de cada pessoa pela próxima ação. Clique para ver a agenda dela.</p>' +
    '<div class="proj-bloco" style="margin-top:var(--space-5)"><div class="tab-wrap"><table class="tab">' +
    '<thead><tr><th>Pessoa</th><th style="text-align:right">A checar</th>' +
    '<th style="text-align:right">Atrasadas</th><th style="text-align:right">Hoje</th>' +
    '<th style="text-align:right">Esta semana</th><th style="text-align:right">Próxima</th>' +
    '<th style="text-align:right">Aguardando</th><th style="text-align:right">Prazo final vencido</th>' +
    '<th style="text-align:right">Total aberto</th></tr></thead><tbody>' +
    linhas.map(l =>
      '<tr onclick="pessoaAberta=\'' + l.u.email + '\';render()">' +
      '<td><div class="person">' + avatar(l.u.email) +
        '<div><div class="person__name">' + esc(nomeDe(l.u.email)) + '</div>' +
        '<div class="person__sub">' + esc(l.u.email) + '</div></div></div></td>' +
      cel(l.c.checar, 'purple') + cel(l.c.atrasada, 'danger') + cel(l.c.hoje, 'accent') +
      cel(l.c.semana) + cel(l.c.proxima) + cel(l.c.aguardando, 'warning') + cel(l.vencidos, 'danger') +
      '<td class="data-cel" style="text-align:right"><b>' + l.minhas.length + '</b></td></tr>').join('') +
    '</tbody></table></div></div></div>';
}

// ============================================================
// PAINEL DO TICKET
// ============================================================
// Organização: (1) cabeçalho enxuto — contexto, título e chips de resumo;
// (2) SITUAÇÃO, com o estado atual em uma frase e os botões de virada
// (trabalhando / preciso de alguém / aguardando / concluir); (3) detalhes
// editáveis; (4) sublinhas (subtarefas e pedidos); (5) conversa, com o
// compositor no topo e a atualização mais nova em primeiro lugar.
let unsubMsgs = null;

function abrirTarefa(id){
  tarefaAberta = id;
  paraAnexar = []; paraMarcar = []; mensagens = [];
  $('backdrop').classList.add('backdrop--on');
  $('drawer').classList.add('drawer--on');
  assinarMensagens(id);
  marcarLida(id);
  renderPainel();
}
function fecharPainel(){
  tarefaAberta = null;
  paraAnexar = []; paraMarcar = [];
  if(unsubMsgs){ unsubMsgs(); unsubMsgs = null; }
  $('backdrop').classList.remove('backdrop--on');
  $('drawer').classList.remove('drawer--on');
  $('drawer').innerHTML = '';
}
function marcarLida(id){
  const patch = {};
  patch['lidoPor.' + chaveEmail(usuario.email)] = new Date().toISOString();
  atualizarTarefa(id, patch).catch(()=>{});
  // Notificações daquela tarefa deixam de ser novidade.
  naoLidas().filter(n => n.tarefaId === id).forEach(n =>
    window._updateDoc(window._doc(COL_NOTIF, n._id), { lida:true }).catch(()=>{}));
}
// Sem orderBy no servidor de propósito: 'where + orderBy' exigiria índice
// composto. O volume por tarefa é pequeno; ordenamos aqui.
function assinarMensagens(id){
  if(unsubMsgs) unsubMsgs();
  unsubMsgs = window._onSnapshot(
    window._query(window._col(COL_MSG), window._where('tarefaId', '==', id)),
    snap => {
      mensagens = [];
      snap.forEach(d => mensagens.push(Object.assign({ _id:d.id }, d.data())));
      mensagens.sort((a,b) => String(b.criadoEm||'').localeCompare(String(a.criadoEm||'')));  // mais nova primeiro
      renderPainel();
    }, erroFirestore);
}

function renderPainel(){
  if(!tarefaAberta) return;
  const t = tarefaDe(tarefaAberta);
  const d = $('drawer');
  if(!t){ d.innerHTML = '<div class="sec">' + vazio('trash', 'Esta tarefa foi excluída') + '</div>'; return; }

  const rascunho = $('msg-texto') ? $('msg-texto').value : '';
  const st = STATUS[t.status] || STATUS.a_fazer;
  const proj = projetoDe(t.projetoId);
  const pai = t.paiId ? tarefaDe(t.paiId) : null;
  const subs = subtarefasDe(t._id);
  const peds = pedidosDe(t._id);
  const podeExcluir = ehMaster() || t.criadoPor === usuario.email;

  d.innerHTML =
  // ---------- 1. Cabeçalho ----------
  '<div class="tk-head">' +
    '<div class="row--between">' +
      '<div class="tk-ctx">' +
        '<i class="ti ti-' + TIPOS[t.tipo || 'tarefa'].icone + '"></i>' + esc(TIPOS[t.tipo || 'tarefa'].label) +
        (proj ? ' <span class="dot"></span> <span>' + esc(proj.nome) + '</span>' : '') +
        (pai ? ' <span class="dot"></span> <a href="#" onclick="abrirTarefa(\'' + pai._id + '\');return false">' +
               esc(recorta(pai.titulo, 34)) + '</a>' : '') +
      '</div>' +
      '<button class="icon-btn" onclick="fecharPainel()" title="Fechar"><i class="ti ti-x"></i></button>' +
    '</div>' +
    '<div class="tk-tit">' + esc(t.titulo) +
      '<button class="icon-btn tk-tit__edit" title="Renomear" onclick="modalRenomear(\'' + t._id + '\')">' +
      '<i class="ti ti-pencil"></i></button></div>' +
    '<div class="tk-chips">' +
      '<span class="badge badge--' + st.badge + '">' + st.label + '</span>' +
      '<span class="chip" onclick="focarCampo(\'c-resp\')">' + avatar(t.responsavel, 'avatar--sm') +
        '<b>' + esc(primeiroNome(t.responsavel)) + '</b></span>' +
      '<span class="chip chip--plain" onclick="focarCampo(\'c-prazo\')"><i class="ti ti-calendar-event"></i>' +
        'próxima ação <b class="' + classeData(t.prazo, t, false) + '">' + esc(t.prazo ? prazoTexto(t.prazo) : 'definir') + '</b></span>' +
      '<span class="chip chip--plain" onclick="focarCampo(\'c-final\')"><i class="ti ti-flag"></i>' +
        'prazo final <b class="' + classeData(t.prazoFinal, t, true) + '">' +
        esc(t.prazoFinal ? dataBR(t.prazoFinal) : 'definir') + '</b></span>' +
    '</div>' +
  '</div>' +

  '<div class="drawer__body">' +

  // ---------- 2. Situação ----------
  '<div class="sec">' +
    '<div class="sec__lab">Situação</div>' +
    '<div class="sit">' +
      '<div class="sit__topo">' +
        '<span class="marca-sys" style="width:30px;height:30px"><i class="ti ti-' + st.icone + '"></i></span>' +
        '<span class="sit__txt">' + fraseSituacao(t) + '</span>' +
      '</div>' +
      '<div class="sit__acoes">' + acoesSituacao(t) + '</div>' +
    '</div>' +
    (planejadoDepoisDoDeadline(t) ? '<div class="banner banner--warning" style="margin-top:var(--space-3)">' +
      '<i class="ti ti-alert-triangle"></i><div>A próxima ação (' + esc(dataBR(t.prazo)) +
      ') está depois do prazo final (' + esc(dataBR(t.prazoFinal)) + ').</div></div>' : '') +
    (deadlineEstourado(t) ? '<div class="banner banner--warning" style="margin-top:var(--space-3)">' +
      '<i class="ti ti-flag"></i><div>Prazo final venceu em ' + esc(dataBR(t.prazoFinal)) +
      ' (' + diasEntre(t.prazoFinal, hoje()) + ' dia(s) atrás).</div></div>' : '') +
  '</div>' +

  // ---------- 3. Detalhes ----------
  '<div class="sec">' +
    '<div class="sec__lab">Detalhes</div>' +
    '<div class="campos">' +
      '<div class="campo"><div class="campo__label">Responsável</div>' +
        '<select id="c-resp" onchange="mudarResponsavel(\'' + t._id + '\',this.value)">' +
        opcoesPessoa(t.responsavel) + '</select></div>' +
      '<div class="campo"><div class="campo__label">Status</div>' +
        '<select onchange="mudarStatus(\'' + t._id + '\',this.value)">' + opcoesStatus(t.status) + '</select></div>' +
      '<div class="campo"><div class="campo__label" title="Quando o responsável planeja mexer nisso">' +
        'Próxima ação</div><input type="date" id="c-prazo" value="' + esc(t.prazo || '') +
        '" onchange="mudarPrazo(\'' + t._id + '\',this.value)"></div>' +
      '<div class="campo"><div class="campo__label" title="Deadline combinado com quem pediu">' +
        'Prazo final</div><input type="date" id="c-final" value="' + esc(t.prazoFinal || '') +
        '" onchange="mudarPrazoFinal(\'' + t._id + '\',this.value)"></div>' +
    '</div>' +
    '<div style="margin-top:var(--space-3)">' +
      (t.descricao
        ? '<div style="font-size:13px;white-space:pre-wrap;color:var(--text-secondary)">' + esc(t.descricao) + '</div>'
        : '<span class="small muted">Sem descrição.</span>') +
      ' <button class="btn" style="height:26px;font-size:12px;margin-left:6px" onclick="modalDescricao(\'' + t._id + '\')">' +
        '<i class="ti ti-pencil"></i> ' + (t.descricao ? 'editar' : 'adicionar') + '</button>' +
    '</div>' +
    '<div class="small muted" style="margin-top:var(--space-3)">Criada por ' + esc(nomeDe(t.criadoPor)) +
      ' em ' + esc(dataBR(t.criadoEm)) +
      (t.concluidaEm ? ' · concluída em ' + esc(dataBR(t.concluidaEm)) : '') +
      (podeExcluir ? ' · <a href="#" onclick="excluirTarefa(\'' + t._id + '\');return false" ' +
        'style="color:var(--danger-text)">excluir</a>' : '') + '</div>' +
  '</div>' +

  // ---------- 4. Sublinhas ----------
  '<div class="sec">' +
    '<div class="row--between" style="margin-bottom:var(--space-3)">' +
      '<span class="sec__lab" style="margin:0">Subtarefas' + (subs.length ? ' (' + subs.length + ')' : '') + '</span>' +
      '<button class="btn" style="height:30px;font-size:12px" onclick="modalNovaSubtarefa(\'' + t._id + '\')">' +
        '<i class="ti ti-plus"></i> Subtarefa</button>' +
    '</div>' +
    (subs.length ? '<div class="mini-lista">' + subs.sort(ordenarPorPrazo).map(miniLinha).join('') + '</div>'
                 : '<div class="small muted">Nenhuma subtarefa. Use para quebrar a demanda em passos.</div>') +
    (peds.length ? '<div class="sec__lab" style="margin-top:var(--space-5)">Pedidos a outras pessoas (' + peds.length + ')</div>' +
      '<div class="mini-lista">' + peds.sort(ordenarPorPrazo).map(miniLinha).join('') + '</div>' : '') +
  '</div>' +

  // ---------- 5. Conversa ----------
  '<div class="sec" style="border-bottom:none">' +
    '<div class="sec__lab">Conversa</div>' +
    '<div class="compositor">' +
      (paraMarcar.length ? '<div class="fila">' + paraMarcar.map((e,i) =>
        '<span class="tag-pessoa" onclick="desmarcarPessoa(' + i + ')">@' + esc(primeiroNome(e)) +
        ' <i class="ti ti-x"></i></span>').join('') + '</div>' : '') +
      (paraAnexar.length ? '<div class="fila" id="fila-anexos">' + filaAnexosHTML() + '</div>' : '<div class="fila" id="fila-anexos"></div>') +
      '<textarea id="msg-texto" placeholder="Registre a evolução, uma dúvida, um combinado... (Ctrl+Enter envia)"></textarea>' +
      '<div class="row">' +
        '<button class="btn" title="Anexar arquivo pequeno" onclick="document.getElementById(\'arq-input\').click()">' +
          '<i class="ti ti-paperclip"></i></button>' +
        '<button class="btn" title="Anexar link do Drive" onclick="modalLink()"><i class="ti ti-link"></i></button>' +
        '<button class="btn" title="Marcar alguém (ela recebe notificação)" onclick="modalMarcar()">' +
          '<i class="ti ti-at"></i></button>' +
        '<input type="file" id="arq-input" multiple style="display:none" onchange="anexarArquivos(this)">' +
        '<span class="spacer"></span>' +
        '<button class="btn btn--primary" onclick="enviarMensagem()"><i class="ti ti-send"></i> Enviar</button>' +
      '</div>' +
    '</div>' +
    (mensagens.length ? '<div class="linha-tempo">' + mensagens.map((m,i) => eventoHTML(m, i === mensagens.length-1)).join('') + '</div>'
      : '<div class="small muted" style="text-align:center;padding:var(--space-5)">' +
        'Nada registrado ainda. O que for escrito aqui fica com data, autor e anexos.</div>') +
  '</div>' +

  '</div>';

  const ta = $('msg-texto');
  ta.value = rascunho;
  ta.onkeydown = e => { if(e.key === 'Enter' && (e.ctrlKey || e.metaKey)) enviarMensagem(); };
}
function focarCampo(id){ const e = $(id); if(e){ e.focus(); if(e.showPicker) try{ e.showPicker(); }catch(x){} } }
function opcoesPessoa(sel){
  return usuarios.map(u => '<option value="' + esc(u.email) + '"' + (u.email === sel ? ' selected' : '') + '>' +
    esc(nomeDe(u.email)) + '</option>').join('');
}
function opcoesStatus(sel){
  return Object.keys(STATUS).map(k => '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' +
    STATUS[k].label + '</option>').join('');
}

// Frase única que explica o estado atual — o que antes ficava espalhado.
function fraseSituacao(t){
  const pedAbertos = abertas(pedidosDe(t._id));
  if(t.status === 'concluida')
    return 'Concluída' + (t.concluidaEm ? ' em ' + esc(dataBR(t.concluidaEm)) : '') + '.';
  if(t.status === 'aguardando')
    return pedAbertos.length
      ? 'Travada esperando <b>' + esc(pedAbertos.map(f => primeiroNome(f.responsavel)).join(', ')) + '</b>.'
      : 'Aguardando algo de fora. Registre na conversa o que está esperando.';
  if(t.status === 'checar')
    return 'Voltou para <b>você</b> conferir e seguir.';
  if(t.status === 'andamento')
    return '<b>' + esc(primeiroNome(t.responsavel)) + '</b> está trabalhando nisso' +
      (t.prazo ? ', com próxima ação em <b>' + esc(prazoTexto(t.prazo)) + '</b>' : '') + '.';
  return 'Na fila de <b>' + esc(primeiroNome(t.responsavel)) + '</b>' +
    (t.prazo ? ', próxima ação <b>' + esc(prazoTexto(t.prazo)) + '</b>' : ' (sem próxima ação definida)') + '.';
}
function acoesSituacao(t){
  const id = t._id;
  const meu = t.responsavel === usuario.email;
  if(t.status === 'concluida')
    return '<button class="acao" onclick="reabrirTarefa(\'' + id + '\')"><i class="ti ti-rotate"></i> Reabrir</button>';
  const b = [];
  if(t.tipo === 'solicitacao' && meu){
    b.push('<button class="acao acao--ok" onclick="modalResponder(\'' + id + '\')">' +
      '<i class="ti ti-corner-up-left"></i> Responder e devolver</button>');
  }
  b.push('<button class="acao' + (t.status === 'andamento' ? ' acao--ativa' : '') +
    '" onclick="mudarStatus(\'' + id + '\',\'andamento\')"><i class="ti ti-player-play"></i> Estou trabalhando</button>');
  b.push('<button class="acao" onclick="modalSolicitar(\'' + id + '\')">' +
    '<i class="ti ti-user-plus"></i> Preciso de alguém</button>');
  b.push('<button class="acao' + (t.status === 'aguardando' ? ' acao--ativa' : '') +
    '" onclick="mudarStatus(\'' + id + '\',\'aguardando\')"><i class="ti ti-hourglass"></i> Aguardando algo</button>');
  if(!(t.tipo === 'solicitacao' && meu))
    b.push('<button class="acao acao--ok" onclick="concluirTarefa(\'' + id + '\')">' +
      '<i class="ti ti-check"></i> Concluir</button>');
  return b.join('');
}
function miniLinha(t){
  const st = STATUS[t.status] || STATUS.a_fazer;
  return '<div class="mini" onclick="abrirTarefa(\'' + t._id + '\')">' +
    avatar(t.responsavel, 'avatar--sm') +
    '<span class="mini__tit">' + esc(t.titulo) + (temNaoLida(t) ? ' <span class="pill pill--nova">novo</span>' : '') + '</span>' +
    (t.prazo ? '<span class="small ' + classeData(t.prazo, t, false) + '">' + esc(prazoTexto(t.prazo)) + '</span>' : '') +
    '<span class="badge badge--' + st.badge + '">' + st.label + '</span>' +
  '</div>';
}

// ---------- Linha do tempo da conversa (mais nova no topo) ----------
function eventoHTML(m, ehUltima){
  const sys = m.tipo === 'sistema';
  const nova = !sys && m.autor !== usuario.email &&
    (!m.criadoEm || m.criadoEm > ((tarefaDe(tarefaAberta) || {}).lidoPor || {})[chaveEmail(usuario.email)] || '');
  return '<div class="ev' + (sys ? ' ev--sys' : '') + (nova ? ' ev--nova' : '') + '">' +
    '<div class="ev__col">' +
      (sys ? '<span class="marca-sys"><i class="ti ti-' + (m.icone || 'info-circle') + '"></i></span>'
           : avatar(m.autor, 'avatar--sm')) +
      (ehUltima ? '' : '<div class="ev__linha"></div>') +
    '</div>' +
    '<div class="ev__corpo">' +
      '<div class="ev__meta">' +
        (sys ? '' : '<span class="ev__nome">' + esc(m.autor === usuario.email ? 'Você' : (m.autorNome || nomeDe(m.autor))) + '</span>') +
        '<span>' + esc(dataHoraBR(m.criadoEm)) + '</span>' +
        (m.mencoes && m.mencoes.length ? m.mencoes.map(e =>
          '<span class="tag-pessoa" style="cursor:default">@' + esc(primeiroNome(e)) + '</span>').join('') : '') +
      '</div>' +
      (sys
        ? '<div class="ev__texto">' + esc(m.texto) + '</div>'
        : '<div class="ev__caixa">' +
            (m.texto ? '<div class="ev__texto">' + esc(m.texto) + '</div>' : '') +
            (m.anexos && m.anexos.length ? '<div class="fila" style="margin-top:6px">' +
              m.anexos.map(anexoHTML).join('') + '</div>' : '') +
          '</div>') +
    '</div>' +
  '</div>';
}
function anexoHTML(a){
  if(a.tipo === 'link')
    return '<a class="anexo" href="' + esc(a.url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">' +
      '<i class="ti ti-external-link"></i>' + esc(a.nome || a.url) + '</a>';
  return '<a class="anexo" href="' + esc(a.dados) + '" download="' + esc(a.nome) + '" onclick="event.stopPropagation()">' +
    '<i class="ti ti-file-download"></i>' + esc(a.nome) + '<span class="muted"> ' + kb(a.tamanho) + '</span></a>';
}
function kb(n){ return n ? '(' + (n > 1048576 ? (n/1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n/1024)) + ' KB') + ')' : ''; }

// ---------- Anexos e menções do compositor ----------
const LIMITE_ARQ = 500 * 1024;
const LIMITE_MSG = 800 * 1024;
function filaAnexosHTML(){
  return paraAnexar.map((a, i) =>
    '<span class="anexo" onclick="removerAnexo(' + i + ')" title="Remover">' +
    '<i class="ti ti-' + (a.tipo === 'link' ? 'link' : 'file') + '"></i>' + esc(a.nome) +
    ' <i class="ti ti-x muted"></i></span>').join('');
}
function atualizarFila(){ const el = $('fila-anexos'); if(el) el.innerHTML = filaAnexosHTML(); }
function removerAnexo(i){ paraAnexar.splice(i, 1); atualizarFila(); }
function desmarcarPessoa(i){ paraMarcar.splice(i, 1); renderPainel(); }
function anexarArquivos(input){
  const arquivos = Array.from(input.files || []);
  input.value = '';
  arquivos.forEach(f => {
    if(f.size > LIMITE_ARQ){
      toast('"' + f.name + '" tem ' + kb(f.size).replace(/[()]/g,'') + '. Acima de 500 KB, suba no Drive e anexe o link.', 'erro');
      return;
    }
    const total = paraAnexar.reduce((s, a) => s + (a.tamanho || 0), 0);
    if(total + f.size > LIMITE_MSG){ toast('Muitos arquivos nesta mensagem. Envie em duas.', 'erro'); return; }
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
  const anexos = paraAnexar.slice(), marcados = paraMarcar.slice();
  ta.value = ''; paraAnexar = []; paraMarcar = []; atualizarFila();
  try{
    const t = await postarMensagem(tarefaAberta, texto, 'msg', anexos, marcados);
    if(t){
      await notificar(marcados, 'mencao', texto, t);
      await notificar(envolvidos(t).filter(e => !marcados.includes(e)), 'mensagem', texto, t);
    }
  }catch(e){
    toast('Não foi possível enviar: ' + (e && e.code || e), 'erro');
    ta.value = texto; paraAnexar = anexos; paraMarcar = marcados; atualizarFila();
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
  await notificar([novo], 'atribuicao', t.titulo, t);
  toast('Agora é ' + primeiroNome(novo) + ' quem responde por esta tarefa.', 'ok');
}
// PRÓXIMA AÇÃO: quando o responsável planeja mexer. Não mexe no deadline.
async function mudarPrazo(id, prazo){
  const t = tarefaDe(id);
  if(!t || (t.prazo || '') === (prazo || '')) return;
  await atualizarTarefa(id, { prazo:prazo || null, atualizadoEm:new Date().toISOString() });
  await postarMensagem(id, 'Próxima ação reprogramada para ' + (prazo ? dataBR(prazo) : 'sem data') + '.', 'sistema');
  if(prazo && t.prazoFinal && prazo > t.prazoFinal)
    toast('Reprogramado — atenção: passou do prazo final (' + dataBR(t.prazoFinal) + ').');
}
// PRAZO FINAL: o deadline combinado. Quem pediu fica sabendo da mudança.
async function mudarPrazoFinal(id, prazo){
  const t = tarefaDe(id);
  if(!t || (t.prazoFinal || '') === (prazo || '')) return;
  await atualizarTarefa(id, { prazoFinal:prazo || null, atualizadoEm:new Date().toISOString() });
  await postarMensagem(id, 'Prazo final ' + (prazo ? 'definido para ' + dataBR(prazo) : 'removido') + '.', 'sistema');
  await notificar(envolvidos(t), 'mensagem', 'Prazo final agora é ' + (prazo ? dataBR(prazo) : 'sem data'), t);
}
async function mudarStatus(id, novo){
  const t = tarefaDe(id);
  if(!t) return;
  if(novo === 'concluida'){ concluirTarefa(id); return; }
  if(t.status === novo){ renderPainel(); return; }
  await atualizarTarefa(id, { status:novo, concluidaEm:null, atualizadoEm:new Date().toISOString() });
  await postarMensagem(id, 'Situação: ' + (STATUS[novo] || {}).label + '.', 'sistema');
}
async function concluirTarefa(id){
  const t = tarefaDe(id);
  if(!t) return;
  // Solicitação se encerra respondendo — é a resposta que destrava quem pediu.
  if(t.tipo === 'solicitacao' && t.responsavel === usuario.email && t.status !== 'concluida'){ modalResponder(id); return; }
  const pendentes = abertas(filhasDe(id));
  if(pendentes.length && !confirm('Esta tarefa tem ' + pendentes.length +
    ' sublinha(s) em aberto (subtarefa ou pedido). Concluir mesmo assim?')) return;
  await atualizarTarefa(id, { status:'concluida', concluidaEm:new Date().toISOString() });
  await postarMensagem(id, 'Concluída por ' + usuario.nome + '.', 'sistema');
  await notificar(envolvidos(t), 'mensagem', 'Tarefa concluída: ' + t.titulo, t);
  toast('Tarefa concluída.', 'ok');
}
async function reabrirTarefa(id){
  await atualizarTarefa(id, { status:'a_fazer', concluidaEm:null });
  await postarMensagem(id, 'Reaberta por ' + usuario.nome + '.', 'sistema');
}
async function excluirTarefa(id){
  const t = tarefaDe(id);
  if(!t) return;
  if(filhasDe(id).length){ toast('Exclua primeiro as sublinhas desta tarefa.', 'erro'); return; }
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
function moldura(titulo, corpo, botao, acao){
  return '<div class="modal__head">' + esc(titulo) + '</div>' +
    '<div class="modal__body">' + corpo + '</div>' +
    '<div class="modal__foot"><button class="btn" onclick="fecharModal()">Cancelar</button>' +
    '<button class="btn btn--primary" onclick="' + acao + '">' + esc(botao) + '</button></div>';
}
function selPessoas(id, sel){
  return '<select id="' + id + '">' + opcoesPessoa(sel) + '</select>';
}
// Os dois campos de data, sempre com a explicação do que cada um significa.
function camposPrazos(prazo, final){
  return '<div class="fg-dupla">' +
    '<div class="fg"><label>Próxima ação</label><input type="date" id="f-prazo" value="' + esc(prazo || '') + '">' +
      '<div class="ajuda">Quando o responsável vai mexer nisso. É o que monta a agenda dele.</div></div>' +
    '<div class="fg"><label>Prazo final</label><input type="date" id="f-final" value="' + esc(final || '') + '">' +
      '<div class="ajuda">O deadline combinado. Não muda quando a pessoa se reprograma.</div></div>' +
  '</div>';
}

// ---------- Projeto ----------
function modalNovoProjeto(id){
  const p = id ? projetoDe(id) : null;
  abrirModal(moldura(p ? 'Editar projeto' : 'Novo projeto',
    '<div class="fg"><label>Nome do projeto</label><input id="p-nome" value="' + esc(p ? p.nome : '') +
      '" placeholder="Ex.: Implantação do ponto eletrônico"></div>' +
    '<div class="fg"><label>Descrição / objetivo</label><textarea id="p-desc" placeholder="O que este projeto precisa entregar">' +
      esc(p ? p.descricao : '') + '</textarea></div>' +
    '<div class="fg"><label>Líder do projeto</label>' + selPessoas('p-lider', p ? p.lider : usuario.email) + '</div>' +
    '<div class="fg"><label>Situação</label><select id="p-status">' +
      ['ativo','pausado','concluido'].map(s => '<option value="' + s + '"' + (p && p.status === s ? ' selected' : '') + '>' +
        ({ativo:'Em andamento',pausado:'Pausado',concluido:'Concluído'})[s] + '</option>').join('') + '</select></div>',
    p ? 'Salvar' : 'Criar projeto', 'salvarProjeto(' + (id ? '\'' + id + '\'' : 'null') + ')'));
}
async function salvarProjeto(id){
  const nome = ($('p-nome').value || '').trim();
  if(!nome){ toast('Dê um nome ao projeto.', 'erro'); return; }
  const dados = { nome, descricao:($('p-desc').value || '').trim(),
    lider:$('p-lider').value, status:$('p-status').value, atualizadoEm:new Date().toISOString() };
  try{
    if(id){
      await window._updateDoc(window._doc(COL_PROJ, id), dados);
      toast('Projeto atualizado.', 'ok');
    }else{
      dados.criadoPor = usuario.email; dados.criadoEm = new Date().toISOString();
      await criarDoc(COL_PROJ, dados);
      aba = 'projetos';
      toast('Projeto criado.', 'ok');
    }
    fecharModal(); render();
  }catch(e){ toast('Erro ao salvar: ' + (e && e.code || e), 'erro'); }
}

// ---------- Tarefa / subtarefa ----------
function modalNovaTarefa(projetoId){
  if(!projetos.length){
    toast('Crie um projeto antes de lançar demandas.');
    aba = 'projetos'; render(); modalNovoProjeto();
    return;
  }
  const ativos = projetos.filter(p => p.status !== 'concluido');
  const lista = ativos.length ? ativos : projetos;
  abrirModal(moldura('Nova demanda',
    '<div class="fg"><label>Projeto</label><select id="t-proj">' + lista.map(p =>
      '<option value="' + p._id + '"' + (p._id === projetoId ? ' selected' : '') + '>' + esc(p.nome) + '</option>').join('') +
      '</select></div>' +
    '<div class="fg"><label>Demanda</label><input id="t-titulo" placeholder="Ex.: Levantar as bases de horas extras de julho"></div>' +
    '<div class="fg"><label>Detalhes (opcional)</label><textarea id="t-desc" placeholder="Contexto, links, o que se espera de resultado"></textarea></div>' +
    '<div class="fg"><label>Responsável</label>' + selPessoas('t-resp', usuario.email) + '</div>' +
    camposPrazos(hoje(), ''),
    'Criar demanda', 'salvarTarefa(null)'));
}
function modalNovaSubtarefa(paiId){
  const pai = tarefaDe(paiId);
  if(!pai) return;
  abrirModal(moldura('Nova subtarefa',
    '<div class="banner banner--info" style="margin-bottom:var(--space-4)"><i class="ti ti-corner-down-right"></i>' +
      '<div>Entra como sublinha de <b>' + esc(pai.titulo) + '</b>, na tabela do projeto.</div></div>' +
    '<div class="fg"><label>O passo</label><input id="t-titulo" placeholder="Ex.: Conferir as marcações do relógio"></div>' +
    '<div class="fg"><label>Detalhes (opcional)</label><textarea id="t-desc"></textarea></div>' +
    '<div class="fg"><label>Responsável</label>' + selPessoas('t-resp', pai.responsavel) + '</div>' +
    camposPrazos(hoje(), pai.prazoFinal || ''),
    'Criar subtarefa', 'salvarTarefa(\'' + paiId + '\')'));
}
async function salvarTarefa(paiId){
  const titulo = ($('t-titulo').value || '').trim();
  if(!titulo){ toast('Descreva a demanda.', 'erro'); return; }
  const pai = paiId ? tarefaDe(paiId) : null;
  const resp = $('t-resp').value;
  const agora = new Date().toISOString();
  try{
    const id = await criarDoc(COL_TAR, {
      projetoId: pai ? pai.projetoId : $('t-proj').value,
      titulo, descricao:($('t-desc').value || '').trim(),
      responsavel:resp,
      prazo:$('f-prazo').value || null,
      prazoFinal:$('f-final').value || null,
      status:'a_fazer', tipo: pai ? 'subtarefa' : 'tarefa',
      paiId: paiId || null, solicitante:null,
      criadoPor:usuario.email, criadoEm:agora, atualizadoEm:agora,
      ultimaMsgEm:null, lidoPor:{}
    });
    fecharModal();
    if(resp !== usuario.email)
      await notificar([resp], 'atribuicao', titulo, { _id:id, titulo, projetoId: pai ? pai.projetoId : $('t-proj') && $('t-proj').value });
    toast(pai ? 'Subtarefa criada.' : 'Demanda criada.', 'ok');
    abrirTarefa(id);
  }catch(e){ toast('Erro ao criar: ' + (e && e.code || e), 'erro'); }
}

// ---------- Renomear / descrição ----------
function modalRenomear(id){
  const t = tarefaDe(id);
  if(!t) return;
  abrirModal(moldura('Renomear', '<div class="fg"><label>Demanda</label><input id="r-tit" value="' +
    esc(t.titulo) + '"></div>', 'Salvar', 'salvarRenomear(\'' + id + '\')'));
}
async function salvarRenomear(id){
  const v = ($('r-tit').value || '').trim();
  if(!v){ toast('O título não pode ficar vazio.', 'erro'); return; }
  await atualizarTarefa(id, { titulo:v, atualizadoEm:new Date().toISOString() });
  fecharModal();
}
function modalDescricao(id){
  const t = tarefaDe(id);
  if(!t) return;
  abrirModal(moldura('Detalhes da demanda', '<div class="fg"><label>Descrição</label><textarea id="d-txt" style="min-height:140px">' +
    esc(t.descricao) + '</textarea></div>', 'Salvar', 'salvarDescricao(\'' + id + '\')'));
}
async function salvarDescricao(id){
  await atualizarTarefa(id, { descricao:($('d-txt').value || '').trim(), atualizadoEm:new Date().toISOString() });
  fecharModal();
}

// ---------- Solicitação: "preciso de alguém para seguir" ----------
function modalSolicitar(id){
  const t = tarefaDe(id);
  if(!t) return;
  const outros = usuarios.filter(u => u.email !== usuario.email);
  const padrao = (outros[0] || usuarios[0] || {}).email;
  abrirModal(moldura('Preciso de alguém para seguir',
    '<div class="banner banner--info" style="margin-bottom:var(--space-4)"><i class="ti ti-info-circle"></i>' +
      '<div>Cria uma solicitação na agenda da pessoa <b>para hoje</b> (para ela ver e se programar) com o ' +
      '<b>prazo final</b> que você definir. <b>' + esc(recorta(t.titulo, 40)) +
      '</b> fica aguardando; quando ela responder, volta para você em "a checar".</div></div>' +
    '<div class="fg"><label>De quem você precisa</label>' + selPessoas('s-quem', padrao) + '</div>' +
    '<div class="fg"><label>O que você precisa dela</label><textarea id="s-texto" ' +
      'placeholder="Ex.: Preciso do parecer jurídico sobre a cláusula 4 para fechar o contrato"></textarea></div>' +
    '<div class="fg-dupla">' +
      '<div class="fg"><label>Prazo final (preciso até)</label><input type="date" id="s-final" value="' + maisDias(2) + '">' +
        '<div class="ajuda">O deadline que você combina com ela.</div></div>' +
      '<div class="fg"><label>Cai na agenda dela em</label><input type="date" id="s-prazo" value="' + hoje() + '">' +
        '<div class="ajuda">Ela pode reprogramar; o prazo final continua de pé.</div></div>' +
    '</div>',
    'Criar solicitação', 'salvarSolicitacao(\'' + id + '\')'));
}
async function salvarSolicitacao(paiId){
  const pai = tarefaDe(paiId);
  const quem = $('s-quem').value;
  const texto = ($('s-texto').value || '').trim();
  const final = $('s-final').value || null;
  const prazo = $('s-prazo').value || hoje();
  if(!pai) return;
  if(!texto){ toast('Escreva o que você precisa.', 'erro'); return; }
  const resumo = texto.split('\n')[0].slice(0, 90);
  const agora = new Date().toISOString();
  try{
    const filhaId = await criarDoc(COL_TAR, {
      projetoId:pai.projetoId, titulo:resumo, descricao:texto,
      responsavel:quem, prazo, prazoFinal:final,
      status:'a_fazer', tipo:'solicitacao',
      paiId, solicitante:usuario.email,
      criadoPor:usuario.email, criadoEm:agora, atualizadoEm:agora,
      ultimaMsgEm:agora, lidoPor:{}
    });
    await atualizarTarefa(paiId, { status:'aguardando', atualizadoEm:agora });
    await postarMensagem(filhaId, usuario.nome + ' pediu isto a partir de "' + pai.titulo + '".', 'sistema');
    await postarMensagem(filhaId, texto, 'msg');
    await postarMensagem(paiId, 'Solicitado a ' + nomeDe(quem) +
      (final ? ' com prazo final ' + dataBR(final) : '') + ': ' + resumo, 'sistema');
    await notificar([quem], 'solicitacao', resumo + (final ? ' (até ' + dataBR(final) + ')' : ''),
      { _id:filhaId, titulo:resumo, projetoId:pai.projetoId });
    fecharModal();
    toast('Solicitação enviada para ' + primeiroNome(quem) + '.', 'ok');
  }catch(e){ toast('Erro ao solicitar: ' + (e && e.code || e), 'erro'); }
}

// ---------- Responder e devolver ----------
function modalResponder(id){
  const t = tarefaDe(id);
  if(!t) return;
  const pai = t.paiId ? tarefaDe(t.paiId) : null;
  abrirModal(moldura('Responder e devolver',
    '<div class="banner banner--info" style="margin-bottom:var(--space-4)"><i class="ti ti-corner-up-left"></i>' +
      '<div>Sua resposta entra na conversa' + (pai ? ' de "' + esc(recorta(pai.titulo, 40)) + '"' : '') +
      ' e devolve a ação para ' + esc(nomeDe(t.solicitante)) + '.</div></div>' +
    '<div class="fg"><label>Sua resposta</label><textarea id="r-texto" ' +
      'placeholder="O que você apurou, decidiu ou entregou"></textarea></div>' +
    '<div class="small muted">Precisa mandar arquivo? Feche esta janela, anexe na conversa e responda depois — ' +
      'o anexo fica registrado no pedido.</div>',
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
      const aindaAbertos = abertas(pedidosDe(pai._id)).filter(f => f._id !== id);
      if(!aindaAbertos.length && pai.status !== 'concluida'){
        await atualizarTarefa(pai._id, { status:'checar', atualizadoEm:agora });
        await postarMensagem(pai._id, 'Todos os pedidos voltaram — liberada para checar.', 'sistema');
      }
      await notificar([pai.responsavel, t.solicitante], 'resposta', texto, pai);
    }else{
      await notificar([t.solicitante], 'resposta', texto, t);
    }
    fecharModal();
    toast('Respondido. A ação voltou para ' + primeiroNome(t.solicitante) + '.', 'ok');
  }catch(e){ toast('Erro ao responder: ' + (e && e.code || e), 'erro'); }
}

// ---------- Anexo por link / marcar pessoas ----------
function modalLink(){
  abrirModal(moldura('Anexar link',
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
function modalMarcar(){
  const outros = usuarios.filter(u => u.email !== usuario.email);
  abrirModal(moldura('Marcar quem precisa ver',
    '<div class="banner banner--info" style="margin-bottom:var(--space-4)"><i class="ti ti-at"></i>' +
      '<div>Quem for marcado recebe notificação desta mensagem. Para pedir uma ação com prazo, ' +
      'use "Preciso de alguém" — aí vira tarefa na agenda da pessoa.</div></div>' +
    (outros.length ? outros.map(u =>
      '<label style="display:flex;align-items:center;gap:10px;padding:8px 4px;cursor:pointer">' +
      '<input type="checkbox" class="chk-marcar" value="' + esc(u.email) + '"' +
      (paraMarcar.includes(u.email) ? ' checked' : '') + '> ' + avatar(u.email, 'avatar--sm') +
      ' <span>' + esc(nomeDe(u.email)) + '</span></label>').join('')
      : '<div class="small muted">Ninguém mais tem acesso a esta plataforma ainda.</div>'),
    'Marcar', 'salvarMarcar()'));
}
function salvarMarcar(){
  paraMarcar = Array.from(document.querySelectorAll('.chk-marcar'))
    .filter(c => c.checked).map(c => c.value);
  fecharModal();
  renderPainel();
}

// ============================================================
// PARTIDA
// ============================================================
if(window._firebaseReady) iniciar();
else window.addEventListener('firebaseReady', iniciar);
