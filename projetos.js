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

// A cor é o sinal mais forte da interface: o status vira bloco de cor cheia
// (na tabela) ou pílula sólida (nas listas), como nas referências visuais.
// Os seis status são as seis colunas do kanban de "Minhas tarefas", na ordem.
// 'label' é a versão curta (pílula, tabela); 'coluna' é o título da coluna.
const STATUS = {
  a_fazer:    { label:'Não iniciado', coluna:'NÃO INICIADO',        cor:'var(--st-a_fazer)',    icone:'circle',
                dica:'Acabou de chegar para você e ainda não teve trabalho nenhum.' },
  andamento:  { label:'Em andamento', coluna:'EM ANDAMENTO',        cor:'var(--st-andamento)',  icone:'player-play',
                dica:'Você está trabalhando nisso agora ou hoje.' },
  futuro:     { label:'Ação futura',  coluna:'AÇÃO FUTURA',         cor:'var(--st-futuro)',     icone:'clock-pause',
                dica:'Não é para agora e não é prioridade — fica parada, mas visível.' },
  aguardando: { label:'Aguardando',   coluna:'AGUARDANDO TERCEIROS',cor:'var(--st-aguardando)', icone:'hourglass',
                dica:'Você pediu algo para alguém e está esperando a resposta.' },
  checar:     { label:'Verificar',    coluna:'VERIFICAR / REVISAR', cor:'var(--st-checar)',     icone:'eye-check',
                dica:'Estava com terceiros e voltou respondida: veja o que mudou e siga.' },
  concluida:  { label:'Finalizado',   coluna:'FINALIZADO',          cor:'var(--st-concluida)',  icone:'circle-check',
                dica:'Encerrada.' },
};
const COLUNAS = ['a_fazer','andamento','futuro','aguardando','checar','concluida'];
function st(t){ return STATUS[t && t.status] || STATUS.a_fazer; }
// Pílula sólida (listas, ticket, sublinhas).
function stPill(t){
  const s = st(t);
  return '<span class="st" style="background:' + s.cor + '">' + s.label + '</span>';
}
// Célula inteira preenchida (tabela do projeto): a cor é do <td>, então vai de
// borda a borda e o hover da linha não a apaga.
function stCelula(t){
  const s = st(t);
  return '<td class="cel-st" style="background:' + s.cor + '">' + s.label + '</td>';
}
const TIPOS = {
  tarefa:      { label:'Tarefa',      icone:'point' },
  subtarefa:   { label:'Subtarefa',   icone:'corner-down-right' },
  solicitacao: { label:'Solicitação', icone:'arrow-forward-up' },
};
// ---------- Estado ----------
let usuario   = null;   // {email, nome, papel}
let usuarios  = [];     // pessoas com acesso a esta plataforma (com foto)
let projetos  = [];
let tarefas   = [];
let notificacoes = [];
let aba = 'agenda';
let projetoAberto = null;
let tarefaAberta  = null;
let mensagens = [];
let paraAnexar = [];        // anexos na fila do compositor
let paraMarcar = [];        // pessoas marcadas na próxima mensagem
let recolhidos = {};        // projetos recolhidos na tabela (só nesta sessão)
let frentesFechadas = {};  // frentes recolhidas (chave 'projetoId:frenteId')
let filtro = '';           // busca da barra de ferramentas
let abaTicket = 'upd';     // aba do ticket: upd | arq | hist
let respondendo = null;    // id da atualização que está com a caixa de resposta aberta
let rascunhoResp = '';     // o que já foi digitado nessa caixa
let soMinhas = false;      // filtro "só as minhas" na aba Projetos
let expandidos = {};        // tarefas com as filhas abertas na tabela
let unsubs = [];
let primeiroSnapNotif = true;

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
// "agora há pouco" / "há 2 h" para o que é recente; data e hora para o resto.
function quando(s){
  if(!s) return '';
  const d = new Date(s);
  if(isNaN(d)) return '';
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if(min < 1) return 'agora há pouco';
  if(min < 60) return 'há ' + min + ' min';
  if(min < 300) return 'há ' + Math.round(min/60) + ' h';
  return dataHoraBR(s);
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
// FRENTES: subdivisões do projeto, que não são tarefa. Um projeto do comercial
// se divide em SDR, CRÉDITO, ORÇAMENTO, e cada frente tem suas tarefas (e as
// subtarefas delas). Ficam dentro do próprio doc do projeto — são poucas, e
// assim renomear ou reordenar é uma escrita só.
const CORES_FRENTE = ['var(--accent)','var(--purple)','var(--cyan)','var(--st-aguardando)',
                      'var(--st-concluida)','#be185d','#4338ca','#b45309'];
function frentesDe(projetoId){
  const p = projetoDe(projetoId);
  return (p && Array.isArray(p.frentes)) ? p.frentes : [];
}
function frenteDe(projetoId, frenteId){
  return frentesDe(projetoId).find(f => f.id === frenteId) || null;
}
function nomeFrente(projetoId, frenteId){
  const f = frenteDe(projetoId, frenteId);
  return f ? f.nome : '';
}
function corFrente(projetoId, frenteId){
  const i = frentesDe(projetoId).findIndex(f => f.id === frenteId);
  return i < 0 ? 'var(--text-muted)' : CORES_FRENTE[i % CORES_FRENTE.length];
}
function novoId(){ return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// Pasta do projeto no Drive da empresa: o arquivo pesado vive lá, e a tarefa
// guarda o link. É o que dispensa subir arquivo grande para dentro do sistema.
function pastaDoProjeto(projetoId){
  const p = projetoDe(projetoId);
  return (p && p.driveUrl) ? p.driveUrl : '';
}
function botaoPasta(projetoId, texto, cls){
  const url = pastaDoProjeto(projetoId);
  if(!url) return '';
  return '<a class="' + (cls || 'btn') + '" href="' + esc(url) + '" target="_blank" rel="noopener" ' +
    'onclick="event.stopPropagation()" title="Abrir a pasta deste projeto no Google Drive">' +
    '<i class="ti ti-brand-google-drive"></i>' + (texto ? ' ' + esc(texto) : '') + '</a>';
}
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
// Ordem manual dentro do grupo (frente ou sublinhas de uma demanda). Enquanto
// ninguém arrastou nada, o grupo segue ordenado por prazo; no primeiro arraste
// todo o grupo ganha número e passa a respeitar a ordem escolhida.
function ordenarNaTabela(arr){
  if(!arr.some(t => typeof t.ordem === 'number')) return arr.slice().sort(ordenarPorPrazo);
  return arr.slice().sort((a, b) => {
    const oa = typeof a.ordem === 'number' ? a.ordem : 1e9;
    const ob = typeof b.ordem === 'number' ? b.ordem : 1e9;
    return oa === ob ? ordenarPorPrazo(a, b) : oa - ob;
  });
}
function ordenarProjetos(arr){
  if(!arr.some(p => typeof p.ordem === 'number'))
    return arr.slice().sort((a,b) => String(a.nome||'').localeCompare(String(b.nome||''), 'pt-BR'));
  return arr.slice().sort((a, b) => {
    const oa = typeof a.ordem === 'number' ? a.ordem : 1e9;
    const ob = typeof b.ordem === 'number' ? b.ordem : 1e9;
    return oa === ob ? String(a.nome||'').localeCompare(String(b.nome||''), 'pt-BR') : oa - ob;
  });
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
    const m = $('menu-ticket');
    if(m && m.classList.contains('menu--on') && !m.contains(e.target)) m.classList.remove('menu--on');
    const p2 = $('pop');
    if(p2 && p2.classList.contains('pop--on') && !p2.contains(e.target)) fecharPop();
  });
  document.onkeydown = e => {
    if(e.key !== 'Escape') return;
    if($('pop').classList.contains('pop--on')) fecharPop();
    else if($('modal').classList.contains('modal--on')) fecharModal();
    else if(tarefaAberta) fecharPainel();
    else $('notif-painel').classList.remove('notif-painel--on');
  };
  checarVersao();
  setInterval(checarVersao, 5 * 60 * 1000);
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
    projetos = ordenarProjetos(projetos);
    render();
  }, erroFirestore));
  unsubs.push(window._onSnapshot(window._col(COL_TAR), snap => {
    tarefas = [];
    snap.forEach(d => tarefas.push(Object.assign({ _id:d.id }, d.data())));
    render();
    if(tarefaAberta) renderPainel();
    abrirDoLink();
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
      // Avisa na hora quando chega algo novo com a tela aberta. O primeiro
      // snapshot é o histórico que já estava lá — esse não vira aviso.
      if(primeiroSnapNotif){ primeiroSnapNotif = false; }
      else if(agora > antesNaoLidas){
        const n = notificacoes.find(x => !x.lida);
        if(n) toast(textoNotificacao(n), 'ok');
      }
    }, erroFirestore));
  limparNotificacoesAntigas();
}
// Quem recebeu um link '#t=ID' cai direto no ticket, assim que os dados chegam.
let linkJaAberto = false;
function abrirDoLink(){
  if(linkJaAberto || tarefaAberta) return;
  const m = String(location.hash || '').match(/^#t=(.+)$/);
  if(!m) { linkJaAberto = true; return; }
  const t = tarefaDe(m[1]);
  if(!t) return;                 // ainda pode estar carregando
  linkJaAberto = true;
  abrirTarefa(m[1]);
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
async function postarMensagem(tarefaId, texto, tipo, anexos, mencoes, respostaDe){
  const t = tarefaDe(tarefaId);
  const agora = new Date().toISOString();
  await criarDoc(COL_MSG, {
    tarefaId, projetoId: t ? t.projetoId : null,
    autor: usuario.email, autorNome: usuario.nome,
    texto: texto || '', tipo: tipo || 'msg',
    anexos: anexos || [], mencoes: mencoes || [],
    respostaDe: respostaDe || null, curtidas: [], criadoEm: agora
  });
  const patch = { ultimaMsgEm: agora };
  patch['lidoPor.' + chaveEmail(usuario.email)] = agora;   // quem escreveu já leu
  // Guarda contra janela de cache: se a página em memória for a antiga (sem
  // _inc), a mensagem ainda é enviada — só não incrementa o contador.
  if(window._inc) patch.msgs = window._inc(1);
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
    (versaoTexto() ? '<div class="small muted" style="padding:6px var(--space-4);text-align:right;' +
      'border-bottom:1px solid var(--border)">' + esc(versaoTexto()) + '</div>' : '') +
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
  render();
  window.scrollTo(0, 0);
}
function render(){
  if(!usuario) return;
  renderNav();
  renderSino();
  const v = $('view');
  if(aba === 'projetos') v.innerHTML = viewProjetos();
  else                  v.innerHTML = viewAgenda();
}
function renderNav(){
  const minhas = abertas(tarefas.filter(t => t.responsavel === usuario.email));
  const urgentes = minhas.filter(t => ['checar','atrasada','hoje'].includes(grupoDaTarefa(t))).length;
  const itens = [
    { id:'agenda',   icone:'layout-kanban', label:'Minhas tarefas',
      count:urgentes, dica:urgentes ? urgentes + ' item(ns) pedindo ação hoje' : 'Seu quadro e sua agenda' },
    { id:'projetos', icone:'table',         label:'Projetos',
      count:projetos.filter(p => p.status !== 'concluido').length, dica:'Projetos, frentes e demandas' },
  ];
  $('abas').innerHTML = itens.map(i =>
    '<button class="aba' + (aba === i.id ? ' aba--on' : '') + '" title="' + esc(i.dica) + '" ' +
      'onclick="irPara(\'' + i.id + '\')">' +
      '<i class="ti ti-' + i.icone + '"></i>' + i.label +
      (i.count ? '<span class="aba__n">' + i.count + '</span>' : '') +
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
// ABA 1 — MINHAS TAREFAS: agenda (esquerda) + kanban (direita)
// ============================================================
// Duas leituras da mesma lista, e é essa a ideia:
//   · à ESQUERDA, a agenda por dia — organizada pelo prazo da PRÓXIMA AÇÃO,
//     isto é, pelo dia em que a pessoa decidiu mexer naquilo. É planejamento:
//     arrastar um card para outro dia reprograma a próxima ação.
//   · à DIREITA, o kanban por ESTADO, nas seis colunas. Arrastar entre colunas
//     muda o status (e registra na conversa da tarefa, como qualquer mudança).
// Quem não pode editar (agenda de outra pessoa, sem ser Master) vê tudo, mas
// sem arrastar.

// ---------- Célula de data (usada aqui e na tabela dos projetos) ----------
// Mostra a data em texto e só vira campo quando a pessoa clica.
function celulaData(t, campo){
  const valor = campo === 'prazo' ? t.prazo : t.prazoFinal;
  const cls = classeData(valor, t, campo !== 'prazo');
  const texto = valor ? (campo === 'prazo' ? prazoTexto(valor) : dataBR(valor)) : '—';
  const podeEditar = (t.responsavel === usuario.email || ehMaster()) && t.status !== 'concluida';
  if(!podeEditar) return '<td class="data-cel ' + cls + '">' + esc(texto) + '</td>';
  return '<td class="data-cel cel-edit ' + cls + '" title="' +
    (campo === 'prazo' ? 'Clique para reprogramar a próxima ação' : 'Clique para mudar o prazo final') +
    '" onclick="editarData(\'' + t._id + '\',\'' + campo + '\',event)">' +
    '<span class="cel-edit__txt">' + esc(texto) + '</span></td>';
}
function editarData(id, campo, ev){
  ev.stopPropagation();
  const td = ev.currentTarget;
  const t = tarefaDe(id);
  if(!t || td.querySelector('input')) return;
  const valor = (campo === 'prazo' ? t.prazo : t.prazoFinal) || '';
  const fn = campo === 'prazo' ? 'mudarPrazo' : 'mudarPrazoFinal';
  td.innerHTML = '<input type="date" value="' + esc(valor) + '" onclick="event.stopPropagation()" ' +
    'onchange="' + fn + '(\'' + id + '\',this.value)" onblur="render()">';
  const inp = td.querySelector('input');
  inp.focus();
  try{ inp.showPicker(); }catch(e){}
}
function indicadorConversa(t){
  const n = t.msgs || 0;
  if(!n && !t.ultimaMsgEm) return '';
  return '<span class="chat-ind' + (temNaoLida(t) ? ' chat-ind--novo' : '') + '">' +
    '<i class="ti ti-message-circle-2"></i>' + (n || '') + '</span>';
}
function tickHTML(t){
  const c = t.status === 'concluida';
  return '<button class="tick' + (c ? ' tick--ok' : '') + '" title="' + (c ? 'Reabrir' : 'Concluir') +
    '" onclick="event.stopPropagation();' + (c ? 'reabrirTarefa' : 'concluirTarefa') +
    '(\'' + t._id + '\')"><i class="ti ti-check"></i></button>';
}

// ---------- ARRASTAR E SOLTAR ----------
let arrastando = null;
let ultimoArrasteEm = 0;
// Em alguns navegadores solta-e-clica dispara o clique no card de origem, o
// que abriria o ticket logo depois de arrastar. Este atalho engole o clique
// que vem colado no fim de um arraste.
function cliqueCard(id, ev){
  if(Date.now() - ultimoArrasteEm < 300){ if(ev) ev.preventDefault(); return; }
  abrirTarefa(id);
}
function arrastarInicio(ev, id){
  arrastando = id;
  try{ ev.dataTransfer.setData('text/plain', id); ev.dataTransfer.effectAllowed = 'move'; }catch(e){}
  if(ev.currentTarget) ev.currentTarget.classList.add('card--arrasta');
}
function arrastarFim(ev){
  arrastando = null;
  ultimoArrasteEm = Date.now();
  if(ev.currentTarget) ev.currentTarget.classList.remove('card--arrasta');
  document.querySelectorAll('.col--alvo,.dia__lista--alvo')
    .forEach(el => el.classList.remove('col--alvo', 'dia__lista--alvo'));
}
function sobreAlvo(ev, el, cls){
  ev.preventDefault();
  try{ ev.dataTransfer.dropEffect = 'move'; }catch(e){}
  el.classList.add(cls);
}
function saiuAlvo(el, cls){ el.classList.remove(cls); }
function idArrastado(ev){
  let id = '';
  try{ id = ev.dataTransfer.getData('text/plain'); }catch(e){}
  return id || arrastando || '';
}
// Soltar numa coluna = mudar o estado da tarefa.
function soltarNaColuna(ev, status, el){
  ev.preventDefault();
  el.classList.remove('col--alvo');
  const id = idArrastado(ev);
  arrastando = null;
  if(id) mudarStatus(id, status);
}
// Soltar num dia = reprogramar a próxima ação (o planejamento).
function soltarNoDia(ev, data, el){
  ev.preventDefault();
  el.classList.remove('dia__lista--alvo');
  const id = idArrastado(ev);
  arrastando = null;
  if(id) mudarPrazo(id, data || '');
}

// ---------- AGENDA LATERAL (planejamento por dia) ----------
const SEMANA = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
function diasDaAgenda(lista){
  const h = hoje();
  const dias = [];
  const pega = f => lista.filter(f).sort(ordenarPorPrazo);
  dias.push({ id:'atras', titulo:'Atrasadas', cor:'var(--danger)', data:null, semSolta:true,
              tarefas:pega(t => t.prazo && t.prazo < h) });
  dias.push({ id:'hoje', titulo:'Hoje · ' + dataBR(h), cor:'var(--accent)', data:h,
              tarefas:pega(t => t.prazo === h) });
  const amanha = maisDias(1);
  dias.push({ id:'d1', titulo:'Amanhã · ' + dataBR(amanha), cor:'var(--text-secondary)', data:amanha,
              tarefas:pega(t => t.prazo === amanha) });
  // Resto desta semana, dia a dia (a semana fecha no domingo).
  const fimSem = fimDaSemana();
  for(let i = 2; i <= 8; i++){
    const d = maisDias(i);
    if(d > fimSem) break;
    const dow = new Date(d + 'T12:00:00').getDay();
    dias.push({ id:'d' + i, titulo:SEMANA[dow] + ' · ' + dataBR(d), cor:'var(--text-secondary)', data:d,
                tarefas:pega(t => t.prazo === d) });
  }
  const fimProx = fimDaProximaSemana();
  dias.push({ id:'prox', titulo:'Próxima semana', cor:'var(--purple)', data:proximaSegunda(),
              tarefas:pega(t => t.prazo && t.prazo > fimSem && t.prazo <= fimProx) });
  dias.push({ id:'depois', titulo:'Mais para frente', cor:'var(--text-muted)', data:null, semSolta:true,
              tarefas:pega(t => t.prazo && t.prazo > fimProx) });
  dias.push({ id:'semdata', titulo:'Para planejar', cor:'var(--warning)', data:'',
              tarefas:pega(t => !t.prazo) });
  return dias;
}
function proximaSegunda(){
  const d = new Date(fimDaSemana() + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return iso(d);
}
// Item da agenda: uma LINHA, não um card. A agenda responde "o que eu me
// programei para cada dia"; o quadro de cima responde "em que estado está
// cada coisa". Dois quadros de card na mesma tela competiam entre si.
function itemDoDia(t, podeEditar){
  const proj = projetoDe(t.projetoId);
  const alerta = deadlineEstourado(t)
    ? '<i class="ti ti-flag it__alerta" title="Prazo final vencido em ' + esc(dataBR(t.prazoFinal)) + '"></i>'
    : (planejadoDepoisDoDeadline(t)
      ? '<i class="ti ti-alert-triangle it__risco" title="Depois do prazo final (' + esc(dataBR(t.prazoFinal)) + ')"></i>'
      : '');
  const dica = t.titulo + (proj ? ' — ' + proj.nome : '') + ' — ' + STATUS[t.status].label +
    (t.prazoFinal ? ' — prazo final ' + dataBR(t.prazoFinal) : '');
  return '<div class="it"' +
    (podeEditar ? ' draggable="true" ondragstart="arrastarInicio(event,\'' + t._id + '\')" ondragend="arrastarFim(event)"' : '') +
    ' onclick="cliqueCard(\'' + t._id + '\',event)" title="' + esc(dica) + '">' +
    '<span class="it__ponto" style="background:' + st(t).cor + '"></span>' +
    '<span class="it__tit">' + esc(t.titulo) + '</span>' +
    alerta +
  '</div>';
}
// A agenda fica embaixo do quadro, com os dias em grade: cada dia é uma caixa
// que recebe card. Ler de relance "o que eu me programei para cada dia" é o
// contraponto do kanban, que mostra o ESTADO de cada coisa.
// A agenda fica em COLUNAS por dia, com os itens em linha (bullet + título) —
// não em card. A faixa verde e as colunas sem caixa separam de vez este painel
// do quadro de estado que fica acima.
function agendaRodape(lista, podeEditar){
  const dias = diasDaAgenda(lista);
  return '<section class="ag">' +
    '<div class="ag__faixa">' +
      '<i class="ti ti-calendar-week"></i>' +
      '<b>Agenda de planejamento</b>' +
      '<span class="ag__sub">o dia em que você decidiu mexer em cada coisa' +
        (podeEditar ? ' · arraste um item para outro dia para reprogramar' : '') + '</span>' +
    '</div>' +
    '<div class="ag__cols">' +
    dias.map(d => {
      const solta = podeEditar && !d.semSolta;
      return '<div class="ag__col' + (d.tarefas.length ? '' : ' ag__col--vazia') + '">' +
        '<div class="ag__cab" style="color:' + d.cor + '">' +
          '<span class="ag__nome">' + esc(d.titulo) + '</span>' +
          (d.tarefas.length ? '<span class="ag__n">' + d.tarefas.length + '</span>' : '') +
        '</div>' +
        '<div class="ag__itens"' +
          (solta ? ' ondragover="sobreAlvo(event,this,\'ag__itens--alvo\')"' +
                   ' ondragleave="saiuAlvo(this,\'ag__itens--alvo\')"' +
                   ' ondrop="soltarNoDia(event,\'' + d.data + '\',this)"' : '') + '>' +
          (d.tarefas.length ? d.tarefas.map(t => itemDoDia(t, podeEditar)).join('')
            : '<div class="ag__livre">' + (solta ? 'livre' : '—') + '</div>') +
        '</div>' +
      '</div>';
    }).join('') +
    '</div>' +
  '</section>';
}

// ---------- KANBAN (estado) ----------
// Card com ALTURA FIXA: título em até duas linhas e uma única linha de rodapé.
// Antes o rodapé embrulhava em duas ou três linhas e cada card ficava de um
// tamanho, o que atrapalhava a leitura da coluna.
function cardKanban(t, podeEditar){
  const proj = projetoDe(t.projetoId);
  const filhas = filhasDe(t._id);
  const feitas = filhas.filter(f => f.status === 'concluida').length;
  const fr = t.frenteId ? nomeFrente(t.projetoId, t.frenteId) : '';
  const esperando = abertas(pedidosDe(t._id));
  // Rodapé: contexto (projeto/frente) à esquerda, datas e sinais à direita.
  const ctx = fr
    ? '<span class="card__ctx" style="color:' + corFrente(t.projetoId, t.frenteId) + '">' + esc(fr) + '</span>'
    : (proj ? '<span class="card__ctx">' + esc(proj.nome) + '</span>' : '<span class="card__ctx">—</span>');
  const sinais =
    (filhas.length ? '<span title="' + feitas + ' de ' + filhas.length + ' sublinha(s) concluída(s)">' +
      '<i class="ti ti-subtask"></i>' + feitas + '/' + filhas.length + '</span>' : '') +
    (esperando.length && t.status === 'aguardando'
      ? '<span title="Esperando ' + esc(esperando.map(f => primeiroNome(f.responsavel)).join(', ')) + '">' +
        '<i class="ti ti-hourglass"></i></span>' : '') +
    ((deadlineEstourado(t) || planejadoDepoisDoDeadline(t))
      ? '<span class="' + (deadlineEstourado(t) ? 'card__alerta' : 'card__risco') +
        '" title="Prazo final ' + esc(dataBR(t.prazoFinal)) + '"><i class="ti ti-flag"></i>' +
        esc(dataBR(t.prazoFinal)) + '</span>' : '') +
    (t.prazo ? '<span class="' + classeData(t.prazo, t, false) + '" title="Próxima ação ' +
      esc(prazoTexto(t.prazo)) + '">' + esc(dataBR(t.prazo)) + '</span>' : '');
  const dica = t.titulo + (proj ? ' — ' + proj.nome : '') + (fr ? ' / ' + fr : '') +
    (t.tipo === 'solicitacao' && t.solicitante ? ' — pedido de ' + primeiroNome(t.solicitante) : '');
  return '<div class="card' + (t.status === 'concluida' ? ' card--concluido' : '') +
    '" style="border-top-color:' + st(t).cor + '" title="' + esc(dica) + '"' +
    (podeEditar ? ' draggable="true" ondragstart="arrastarInicio(event,\'' + t._id + '\')" ondragend="arrastarFim(event)"' : '') +
    ' onclick="cliqueCard(\'' + t._id + '\',event)">' +
    '<div class="card__tit">' +
      (t.tipo === 'solicitacao' ? '<i class="ti ti-arrow-forward-up" style="opacity:.6"></i> ' : '') +
      esc(t.titulo) + '</div>' +
    '<div class="card__meta">' + ctx + '<span class="spacer"></span>' + indicadorConversa(t) + sinais + '</div>' +
  '</div>';
}
const LIMITE_FINALIZADO = 15;
function kanbanHTML(lista, podeEditar){
  return '<div class="kanban">' + COLUNAS.map(k => {
    const s = STATUS[k];
    let ts = lista.filter(t => t.status === k);
    let mais = 0;
    if(k === 'concluida'){
      ts = ts.sort((a,b) => String(b.concluidaEm||'').localeCompare(String(a.concluidaEm||'')));
      if(ts.length > LIMITE_FINALIZADO){ mais = ts.length - LIMITE_FINALIZADO; ts = ts.slice(0, LIMITE_FINALIZADO); }
    }else{
      ts = ts.sort(ordenarPorPrazo);
    }
    return '<section class="col"' +
        (podeEditar ? ' ondragover="sobreAlvo(event,this,\'col--alvo\')"' +
                      ' ondragleave="saiuAlvo(this,\'col--alvo\')"' +
                      ' ondrop="soltarNaColuna(event,\'' + k + '\',this)"' : '') + '>' +
      '<div class="col__head">' +
        '<span class="col__marca" style="background:' + s.cor + '"></span>' +
        '<span class="col__tit" style="color:' + s.cor + '" title="' + esc(s.dica) + '">' + esc(s.coluna) + '</span>' +
        '<span class="col__n">' + (lista.filter(t => t.status === k).length) + '</span>' +
      '</div>' +
      '<div class="col__corpo">' +
        (ts.length ? ts.map(t => cardKanban(t, podeEditar)).join('')
          : '<div class="dia__vazio">' + (podeEditar ? 'solte um card aqui' : 'vazio') + '</div>') +
        (mais ? '<div class="mais-col">+ ' + mais + ' finalizada(s) mais antiga(s)</div>' : '') +
      '</div>' +
    '</section>';
  }).join('') + '</div>';
}

function viewAgenda(){
  const email = usuario.email;
  const todas = tarefas.filter(t => t.responsavel === email);
  const emAberto = abertas(todas);
  const atrasadas = emAberto.filter(t => t.prazo && t.prazo < hoje()).length;
  const vencidos = emAberto.filter(deadlineEstourado).length;
  const hojeN = emAberto.filter(t => t.prazo === hoje()).length;
  const semData = emAberto.filter(t => !t.prazo).length;

  const chip = (n, texto, cor, icone) => n
    ? '<span class="chip chip--plain" style="color:' + cor + ';border-color:currentColor">' +
      '<i class="ti ti-' + icone + '"></i> <b style="color:inherit">' + n + '</b> ' + texto + '</span>' : '';

  return '<div class="wrap wrap--largo">' +
    '<div class="row--between" style="margin-bottom:var(--space-4);flex-wrap:wrap">' +
      '<div>' +
        '<h1 class="page-title">Minhas tarefas</h1>' +
        '<p class="page-subtitle">' + emAberto.length + ' em aberto · ' + hojeN + ' para hoje</p>' +
      '</div>' +
      '<div class="row" style="flex-wrap:wrap">' +
        chip(atrasadas, 'atrasada(s)', 'var(--danger-text)', 'alert-triangle') +
        chip(vencidos, 'fora do prazo final', 'var(--danger-text)', 'flag') +
        chip(semData, 'sem data', 'var(--warning-text)', 'calendar-question') +
        '<button class="btn btn--primary" onclick="modalNovaTarefa()"><i class="ti ti-plus"></i> Nova tarefa</button>' +
      '</div>' +
    '</div>' +
    (todas.length
      ? kanbanHTML(todas, true) + agendaRodape(emAberto, true)
      : vazio('checkbox', 'Nada por aqui ainda',
          'Quando alguém te definir como responsável — ou você criar uma tarefa — ela aparece no quadro e na agenda.')) +
  '</div>';
}


// ============================================================
// ABA 2 — PROJETOS (uma tabela por projeto)
// ============================================================
// Cada projeto é um bloco com sua tabela: uma linha por demanda, subtarefas e
// pedidos recuados como sublinhas. O status é bloco de cor cheia, o círculo à
// esquerda conclui sem abrir a tarefa e a barra de ferramentas filtra tudo.
let mostrarConcluidas = false;

function passaFiltro(t){
  if(soMinhas && t.responsavel !== usuario.email) return false;
  if(!filtro) return true;
  const f = filtro.toLowerCase();
  return String(t.titulo||'').toLowerCase().includes(f)
      || String(t.descricao||'').toLowerCase().includes(f)
      || nomeDe(t.responsavel).toLowerCase().includes(f)
      || String(nomeFrente(t.projetoId, t.frenteId) || '').toLowerCase().includes(f);
}
// A linha fica visível se ela passa no filtro ou se alguma sublinha passa —
// senão o filtro esconderia a mãe e deixaria a filha órfã.
function visivel(t, prof){
  if(t.status === 'concluida' && !mostrarConcluidas) return false;
  if(passaFiltro(t)) return true;
  if((prof || 0) > 4) return false;
  return filhasDe(t._id).some(f => visivel(f, (prof || 0) + 1));
}

function viewProjetos(){
  const ativos = projetos.filter(p => p.status !== 'concluido');
  const fechados = projetos.filter(p => p.status === 'concluido');
  const cabecalho =
    '<div class="row--between" style="margin-bottom:var(--space-4);flex-wrap:wrap">' +
      '<div><h1 class="page-title">Projetos</h1>' +
      '<p class="page-subtitle">' + ativos.length + ' em andamento · ' + abertas(tarefas).length +
      ' demandas em aberto</p></div>' +
      '<button class="btn btn--primary" onclick="modalNovoProjeto()"><i class="ti ti-plus"></i> Novo projeto</button>' +
    '</div>' + barraFerramentas();
  if(!projetos.length)
    return '<div class="wrap">' + cabecalho + vazio('folder-plus', 'Nenhum projeto ainda',
      'Crie o primeiro projeto para começar a organizar as demandas da área.') + '</div>';
  const blocos = ativos.map(blocoProjeto).join('');
  const blocosFim = fechados.map(blocoProjeto).join('');
  return '<div class="wrap">' + cabecalho +
    (blocos || (filtro || soMinhas ? vazio('search-off', 'Nada encontrado',
      'Nenhuma demanda combina com o filtro atual.') : '')) +
    (blocosFim ? '<div class="section-label">Projetos concluídos</div>' + blocosFim : '') +
  '</div>';
}

function barraFerramentas(){
  const alt = (ligado, icone, texto, acao) =>
    '<button class="alterna' + (ligado ? ' alterna--on' : '') + '" onclick="' + acao + '">' +
    '<i class="ti ti-' + icone + '"></i> ' + texto + '</button>';
  return '<div class="toolbar">' +
    '<label class="busca"><i class="ti ti-search"></i>' +
      '<input id="busca-input" placeholder="Buscar demanda ou pessoa..." value="' + esc(filtro) +
      '" oninput="filtrar(this.value)">' +
      (filtro ? '<i class="ti ti-x" style="cursor:pointer" onclick="filtrar(\'\')"></i>' : '') +
    '</label>' +
    alt(soMinhas, 'user', 'Só as minhas', 'soMinhas=!soMinhas;render()') +
    alt(mostrarConcluidas, 'circle-check', 'Mostrar concluídas', 'mostrarConcluidas=!mostrarConcluidas;render()') +
  '</div>';
}
// Re-renderiza a cada tecla, então devolve o foco e o cursor para a busca.
function filtrar(v){
  filtro = v;
  render();
  const el = $('busca-input');
  if(el){ el.focus(); try{ el.setSelectionRange(el.value.length, el.value.length); }catch(e){} }
}

function blocoProjeto(p){
  const ts = tarefasDoProjeto(p._id);
  const ab = abertas(ts);
  const atrasadas = ab.filter(t => t.prazo && t.prazo < hoje()).length;
  const vencidos = ab.filter(deadlineEstourado).length;
  const pct = ts.length ? Math.round((ts.length - ab.length) / ts.length * 100) : 0;
  const recolhido = !!recolhidos[p._id];
  const podeEditar = ehMaster() || p.criadoPor === usuario.email || p.lider === usuario.email;

  const raizes = ts.filter(t => (!t.paiId || !tarefaDe(t.paiId)) && visivel(t)).sort(ordenarPorPrazo);
  // As demandas entram agrupadas pelas FRENTES do projeto; o que não tem
  // frente cai em "Geral", que só aparece quando existe algo lá.
  const frentes = frentesDe(p._id);
  const grupos = frentes.map(f => ({
    frente:f, cor:corFrente(p._id, f.id),
    raizes:raizes.filter(t => t.frenteId === f.id)
  }));
  const semFrente = raizes.filter(t => !t.frenteId || !frenteDe(p._id, t.frenteId));
  if(semFrente.length || !frentes.length)
    grupos.push({ frente:null, cor:'var(--text-muted)', raizes:semFrente });
  const corpo = grupos.map(g => linhasDaFrente(p, g)).join('');
  const temLinha = grupos.some(g => g.raizes.length);
  // Com filtro ligado, projeto sem nenhuma linha visível sai da tela.
  if(!temLinha && (filtro || soMinhas)) return '';

  return '<section class="proj-bloco" id="proj-' + p._id + '"' +
      ' ondragover="sobreProjeto(event,this,\'' + p._id + '\')" ondragleave="saiuProjeto(this)"' +
      ' ondrop="soltarNoProjeto(event,\'' + p._id + '\',this)">' +
    '<div class="proj-bloco__head">' +
      '<span class="alca alca--proj" draggable="true" title="Arraste para mudar a ordem dos projetos" ' +
        'ondragstart="arrastarProjeto(event,\'' + p._id + '\')" ondragend="fimProjeto()">' +
        '<i class="ti ti-grip-vertical"></i></span>' +
      '<button class="proj-bloco__nome" onclick="alternarProjeto(\'' + p._id + '\')">' +
        '<i class="ti ti-chevron-' + (recolhido ? 'right' : 'down') + ' muted"></i>' + esc(p.nome) + '</button>' +
      (p.status === 'concluido' ? '<span class="badge badge--success">Concluído</span>' :
       p.status === 'pausado'   ? '<span class="badge badge--warning">Pausado</span>' : '') +
      pilhaStatus(ts, pct) +
      '<span class="small muted">' + pct + '% · ' + ab.length + ' em aberto' +
        (atrasadas ? ' · <span style="color:var(--danger-text);font-weight:600">' + atrasadas + ' atrasada</span>' : '') +
        (vencidos ? ' · <span style="color:var(--danger-text);font-weight:600">' + vencidos + ' fora do prazo</span>' : '') +
      '</span>' +
      '<span class="spacer"></span>' +
      // Só o avatar do líder (o nome ia embora com o espaço que os dois botões
      // precisam); o nome fica na dica.
      '<span title="Líder: ' + esc(nomeDe(p.lider)) + '">' + avatar(p.lider, 'avatar--sm') + '</span>' +
      '<button class="btn btn--primary" onclick="modalNovaTarefa(\'' + p._id + '\')">' +
        '<i class="ti ti-plus"></i> Demanda</button>' +
      (podeEditar ? '<button class="btn" title="Criar uma subdivisão do projeto" ' +
        'onclick="modalFrente(\'' + p._id + '\')"><i class="ti ti-layout-rows"></i> Frente</button>' : '') +
      // Pasta do Drive e editar projeto seguem no menu: são menos frequentes.
      '<button class="icon-btn" title="Mais ações do projeto" onclick="popProjeto(\'' + p._id + '\',event)">' +
        '<i class="ti ti-dots"></i></button>' +
    '</div>' +
    (recolhido ? '' :
      (temLinha || frentes.length ? '<div class="tab-wrap"><table class="tab tab--fixa">' +
        '<colgroup><col style="width:46%"><col style="width:14%"><col style="width:12%">' +
        '<col style="width:14%"><col style="width:14%"></colgroup>' +
        '<thead><tr><th class="cel-dem">Demanda</th><th>Responsável</th><th style="text-align:center">Status</th>' +
        '<th>Próxima ação</th><th>Prazo final</th></tr></thead>' +
        '<tbody>' + corpo + '</tbody></table></div>'
      : vazio('list-check', 'Nenhuma demanda neste projeto',
              'Clique em "Demanda" para criar a primeira, com responsável, próxima ação e prazo final.'))) +
  '</section>';
}
// Distribuição das demandas por status, em uma barra só — dá o retrato do
// projeto de relance, como a barra empilhada da referência.
function pilhaStatus(ts, pct){
  if(!ts.length) return '';
  const ordem = ['concluida','andamento','checar','aguardando','futuro','a_fazer'];
  const partes = ordem.map(k => {
    const n = ts.filter(t => t.status === k).length;
    return n ? '<span style="width:' + (n / ts.length * 100) + '%;background:' + STATUS[k].cor +
      '" title="' + n + ' ' + STATUS[k].label + '"></span>' : '';
  }).join('');
  return '<span class="pilha" title="' + pct + '% concluído">' + partes + '</span>';
}
// Cabeçalho da frente dentro da tabela (uma linha atravessando as colunas) e
// as demandas dela embaixo.
function linhasDaFrente(p, g){
  const chave = p._id + ':' + (g.frente ? g.frente.id : 'geral');
  const fechada = !!frentesFechadas[chave];
  const nome = g.frente ? g.frente.nome : 'Geral';
  const emAberto = g.raizes.filter(t => t.status !== 'concluida').length;
  const podeEditar = ehMaster() || p.criadoPor === usuario.email || p.lider === usuario.email;
  const cab = '<tr class="fr" onclick="alternarFrente(\'' + chave + '\')"' +
    ' ondragover="sobreFrente(event,this)" ondragleave="this.classList.remove(\'fr-alvo\')"' +
    ' ondrop="soltarNaFrente(event,\'' + p._id + '\',\'' + (g.frente ? g.frente.id : '') + '\',this)">' +
    '<td colspan="5"><div class="fr__linha">' +
      '<i class="ti ti-chevron-' + (fechada ? 'right' : 'down') + '" style="color:' + g.cor + '"></i>' +
      '<span class="fr__nome" style="color:' + g.cor + '">' + esc(nome) + '</span>' +
      '<span class="fr__n">' + g.raizes.length + (g.raizes.length === 1 ? ' demanda' : ' demandas') +
        (emAberto !== g.raizes.length ? ' · ' + emAberto + ' em aberto' : '') + '</span>' +
      '<span class="spacer"></span>' +
      '<button class="fr__acao" title="Nova demanda nesta frente" onclick="event.stopPropagation();' +
        'modalNovaTarefa(\'' + p._id + '\',\'' + (g.frente ? g.frente.id : '') + '\')">' +
        '<i class="ti ti-plus"></i> Demanda</button>' +
      ((g.frente && podeEditar) ? '<button class="fr__acao" title="Renomear ou excluir esta frente" ' +
        'onclick="event.stopPropagation();modalFrente(\'' + p._id + '\',\'' + g.frente.id + '\')">' +
        '<i class="ti ti-pencil"></i></button>' : '') +
    '</div></td></tr>';
  if(fechada) return cab;
  const linhas = ordenarNaTabela(g.raizes).map(t => linhasComFilhas(t, 0)).join('');
  return cab + (linhas || '<tr class="fr-vazia"><td colspan="5">' +
    (g.frente ? 'Nenhuma demanda nesta frente ainda.' : 'Nenhuma demanda fora das frentes.') + '</td></tr>');
}
function alternarFrente(chave){ frentesFechadas[chave] = !frentesFechadas[chave]; render(); }

// ============================================================
// ORDEM MANUAL (arrastar para reordenar)
// ============================================================
// Arrasta-se pela alça (⠿), não pela linha inteira: a linha continua clicável
// para abrir o ticket. Soltar na metade de cima entra antes; na de baixo,
// depois. Ao soltar, o grupo inteiro é renumerado numa transação só — com
// poucas linhas por grupo isso é mais simples e mais estável que ranking
// fracionário.
let linhaArrastada = null;
function arrastarLinha(ev, id){
  ev.stopPropagation();
  linhaArrastada = id;
  ultimoArrasteEm = Date.now();
  try{
    ev.dataTransfer.setData('text/plain', 'linha:' + id);
    ev.dataTransfer.effectAllowed = 'move';
    const tr = ev.currentTarget.closest('tr');
    if(tr) ev.dataTransfer.setDragImage(tr, 24, 12);
  }catch(e){}
}
function fimLinha(){
  linhaArrastada = null;
  ultimoArrasteEm = Date.now();
  document.querySelectorAll('.alvo-cima,.alvo-baixo,.fr-alvo')
    .forEach(el => el.classList.remove('alvo-cima','alvo-baixo','fr-alvo'));
}
function sobreLinha(ev, tr, id){
  if(!linhaArrastada || linhaArrastada === id) return;
  ev.preventDefault();
  const r = tr.getBoundingClientRect();
  const cima = (ev.clientY - r.top) < r.height / 2;
  tr.classList.toggle('alvo-cima', cima);
  tr.classList.toggle('alvo-baixo', !cima);
}
function saiuLinha(tr){ tr.classList.remove('alvo-cima','alvo-baixo'); }
async function soltarNaLinha(ev, id, tr){
  if(!linhaArrastada || linhaArrastada === id){ fimLinha(); return; }
  ev.preventDefault(); ev.stopPropagation();
  const r = tr.getBoundingClientRect();
  const antes = (ev.clientY - r.top) < r.height / 2;
  const arrastada = tarefaDe(linhaArrastada);
  const destino = tarefaDe(id);
  fimLinha();
  if(!arrastada || !destino) return;
  // Reordenar só faz sentido entre irmãs. Cair em outro nível/frente vira
  // "passar para o grupo do destino", mantendo a posição escolhida.
  const irmas = tarefas.filter(t =>
    t.projetoId === destino.projetoId &&
    (t.paiId || null) === (destino.paiId || null) &&
    (t.frenteId || null) === (destino.frenteId || null));
  const lista = ordenarNaTabela(irmas).filter(t => t._id !== arrastada._id);
  const i = lista.findIndex(t => t._id === destino._id);
  lista.splice(antes ? i : i + 1, 0, arrastada);
  try{
    const b = window._batch();
    lista.forEach((t, k) => {
      const patch = { ordem:k };
      if(t._id === arrastada._id){
        patch.projetoId = destino.projetoId;
        patch.paiId = destino.paiId || null;
        patch.frenteId = destino.frenteId || null;
        if(arrastada.tipo !== 'solicitacao') patch.tipo = destino.paiId ? 'subtarefa' : 'tarefa';
        patchDescendentes(b, arrastada._id,
          { projetoId:destino.projetoId, frenteId:destino.frenteId || null });
      }
      b.update(window._doc(COL_TAR, t._id), patch);
    });
    await b.commit();
    const mudouGrupo = (arrastada.paiId || null) !== (destino.paiId || null) ||
                       (arrastada.frenteId || null) !== (destino.frenteId || null);
    if(mudouGrupo){
      const pai = destino.paiId ? tarefaDe(destino.paiId) : null;
      await postarMensagem(arrastada._id, pai
        ? 'Passou a ser sublinha de "' + pai.titulo + '".'
        : 'Passou a ser demanda principal' +
          (destino.frenteId ? ' da frente "' + nomeFrente(destino.projetoId, destino.frenteId) + '"' : '') + '.', 'sistema');
    }
  }catch(e){ toast('Não foi possível reordenar: ' + (e && e.code || e), 'erro'); }
}
// Soltar sobre o cabeçalho da frente = mandar a demanda para o fim daquela frente.
function sobreFrente(ev, tr){
  if(!linhaArrastada) return;
  ev.preventDefault();
  tr.classList.add('fr-alvo');
}
async function soltarNaFrente(ev, projetoId, frenteId, tr){
  if(!linhaArrastada){ fimLinha(); return; }
  ev.preventDefault(); ev.stopPropagation();
  const id = linhaArrastada;
  fimLinha();
  const t = tarefaDe(id);
  if(!t || t.projetoId !== projetoId) return;
  try{
    const b = window._batch();
    b.update(window._doc(COL_TAR, id), { paiId:null, ordem:1e6, frenteId:frenteId || null,
      tipo:t.tipo === 'solicitacao' ? 'solicitacao' : 'tarefa' });
    patchDescendentes(b, id, { frenteId:frenteId || null });
    await b.commit();
  }catch(e){ toast('Erro ao mover: ' + (e && e.code || e), 'erro'); return; }
  await postarMensagem(id, 'Movida para a frente "' + (frenteId ? nomeFrente(projetoId, frenteId) : 'Geral') + '".', 'sistema');
}
// Clique na linha (com a guarda do arraste, como nos cards do kanban).
function cliqueLinha(id, ev){
  if(Date.now() - ultimoArrasteEm < 300){ if(ev) ev.preventDefault(); return; }
  abrirTarefa(id);
}

// ---------- Ordem dos projetos ----------
let projArrastado = null;
function arrastarProjeto(ev, id){
  ev.stopPropagation();
  projArrastado = id;
  ultimoArrasteEm = Date.now();
  try{
    ev.dataTransfer.setData('text/plain', 'proj:' + id);
    const bloco = ev.currentTarget.closest('.proj-bloco');
    if(bloco) ev.dataTransfer.setDragImage(bloco, 30, 20);
  }catch(e){}
}
function fimProjeto(){
  projArrastado = null;
  ultimoArrasteEm = Date.now();
  document.querySelectorAll('.pj-cima,.pj-baixo').forEach(el => el.classList.remove('pj-cima','pj-baixo'));
}
function sobreProjeto(ev, el, id){
  if(!projArrastado || projArrastado === id) return;
  ev.preventDefault();
  const r = el.getBoundingClientRect();
  const cima = (ev.clientY - r.top) < r.height / 2;
  el.classList.toggle('pj-cima', cima);
  el.classList.toggle('pj-baixo', !cima);
}
function saiuProjeto(el){ el.classList.remove('pj-cima','pj-baixo'); }
async function soltarNoProjeto(ev, id, el){
  if(!projArrastado || projArrastado === id){ fimProjeto(); return; }
  ev.preventDefault();
  const r = el.getBoundingClientRect();
  const antes = (ev.clientY - r.top) < r.height / 2;
  const arrastado = projetoDe(projArrastado);
  fimProjeto();
  if(!arrastado) return;
  const lista = ordenarProjetos(projetos).filter(p => p._id !== arrastado._id);
  const i = lista.findIndex(p => p._id === id);
  if(i < 0) return;
  lista.splice(antes ? i : i + 1, 0, arrastado);
  try{
    const b = window._batch();
    lista.forEach((p, k) => b.update(window._doc(COL_PROJ, p._id), { ordem:k }));
    await b.commit();
  }catch(e){ toast('Não foi possível reordenar: ' + (e && e.code || e), 'erro'); }
}
function popProjeto(id, ev){
  ev.stopPropagation();
  const p = projetoDe(id);
  if(!p) return;
  const podeEditar = ehMaster() || p.criadoPor === usuario.email || p.lider === usuario.email;
  const itens = [];
  if(p.driveUrl)
    itens.push('<a href="' + esc(p.driveUrl) + '" target="_blank" rel="noopener" onclick="fecharPop()">' +
      '<i class="ti ti-brand-google-drive"></i> Abrir a pasta no Drive</a>');
  if(podeEditar){
    itens.push('<button onclick="fecharPop();modalNovoProjeto(\'' + id + '\')">' +
      '<i class="ti ti-pencil"></i> Editar projeto' + (p.driveUrl ? '' : ' (e vincular pasta)') + '</button>');
    itens.push('<hr><button class="perigo" onclick="fecharPop();excluirProjeto(\'' + id + '\')">' +
      '<i class="ti ti-trash"></i> Excluir projeto</button>');
  }
  if(!itens.length) itens.push('<div class="pop__lab">Sem ações disponíveis</div>');
  abrirPop(ev, itens.join(''));
}
function alternarProjeto(id){ recolhidos[id] = !recolhidos[id]; render(); }
function alternarFilhas(id, ev){ if(ev) ev.stopPropagation(); expandidos[id] = expandidos[id] === false; render(); }

// Uma linha + (recursivamente) as sublinhas dela.
function linhasComFilhas(t, nivel){
  const filhas = ordenarNaTabela(filhasDe(t._id).filter(f => visivel(f)));
  const aberto = expandidos[t._id] !== false;
  const nivelFilha = Math.min(nivel + 1, 2);   // o recuo para em 2 níveis
  return linhaTabela(t, nivel, filhas, aberto) +
    (aberto ? filhas.map(f => linhasComFilhas(f, nivelFilha)).join('') : '');
}

function linhaTabela(t, nivel, filhas, aberto){
  const fs = filhas || [];
  const feitas = fs.filter(f => f.status === 'concluida').length;
  const concluida = t.status === 'concluida';
  const ramo = nivel > 0
    ? '<i class="ti ti-' + (t.tipo === 'solicitacao' ? 'arrow-forward-up' : 'corner-down-right') +
      ' ramo" title="' + (t.tipo === 'solicitacao'
        ? 'Pedido' + (t.solicitante ? ' de ' + esc(nomeDe(t.solicitante)) : '')
        : 'Subtarefa') + '"></i>'
    : '';
  const chevron = fs.length
    ? '<button class="chevron" title="Mostrar/ocultar sublinhas" onclick="alternarFilhas(\'' + t._id + '\',event)">' +
      '<i class="ti ti-chevron-' + (aberto ? 'down' : 'right') + '"></i></button>'
    : '';
  // A antiga segunda linha virou sinal curto: o tipo está no ícone do ramo, o
  // responsável e as datas já têm coluna, e o risco de prazo vira um alerta.
  const marcas =
    indicadorConversa(t) +
    (fs.length ? '<span class="sub-cont" title="' + feitas + ' de ' + fs.length +
      ' sublinha(s) concluída(s)">' + feitas + '/' + fs.length + '</span>' : '') +
    (planejadoDepoisDoDeadline(t)
      ? '<i class="ti ti-alert-triangle" style="color:var(--warning);flex-shrink:0" ' +
        'title="Próxima ação depois do prazo final"></i>' : '');

  return '<tr class="nivel-' + nivel + (concluida ? ' lin--concluida' : '') +
      '" onclick="cliqueLinha(\'' + t._id + '\',event)"' +
      ' ondragover="sobreLinha(event,this,\'' + t._id + '\')"' +
      ' ondragleave="saiuLinha(this)"' +
      ' ondrop="soltarNaLinha(event,\'' + t._id + '\',this)">' +
    '<td class="cel-dem" style="border-left-color:' + st(t).cor + '"><div class="demanda">' +
      '<span class="alca" draggable="true" title="Arraste para reordenar ou mover" ' +
        'onclick="event.stopPropagation()" ondragstart="arrastarLinha(event,\'' + t._id + '\')" ' +
        'ondragend="fimLinha()"><i class="ti ti-grip-vertical"></i></span>' +
      tickHTML(t) + ramo + chevron +
      '<span class="demanda__tit" title="' + esc(t.titulo) + '">' + esc(t.titulo) + '</span>' +
      marcas +
      // Criar subtarefa dentro desta tarefa, sem sair da tabela do projeto.
      ((nivel < 2 && t.tipo !== 'solicitacao')
        ? '<button class="linha-add" title="Criar subtarefa dentro desta" ' +
          'onclick="event.stopPropagation();modalNovaSubtarefa(\'' + t._id + '\')"><i class="ti ti-plus"></i></button>'
        : '') +
      ((ehMaster() || t.criadoPor === usuario.email)
        ? '<button class="linha-del" title="Excluir esta demanda" ' +
          'onclick="event.stopPropagation();excluirTarefa(\'' + t._id + '\')"><i class="ti ti-trash"></i></button>'
        : '') +
    '</div></td>' +
    '<td class="cel-resp">' + pessoaMini(t.responsavel) + '</td>' +
    stCelula(t) +
    celulaData(t, 'prazo') +
    celulaData(t, 'final') +
  '</tr>';
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
let lidoAoAbrir = '';   // até onde eu já tinha lido quando abri o ticket

function abrirTarefa(id){
  const t0 = tarefaDe(id);
  lidoAoAbrir = (t0 && (t0.lidoPor || {})[chaveEmail(usuario.email)]) || '';
  tarefaAberta = id;
  abaTicket = 'upd';
  respondendo = null; rascunhoResp = '';
  paraAnexar = []; paraMarcar = []; mensagens = [];
  try{ history.replaceState(null, '', '#t=' + id); }catch(e){}
  $('backdrop').classList.add('backdrop--on');
  $('drawer').classList.add('drawer--on');
  assinarMensagens(id);
  marcarLida(id);
  renderPainel();
}
function fecharPainel(){
  tarefaAberta = null;
  paraAnexar = []; paraMarcar = [];
  try{ if(location.hash) history.replaceState(null, '', location.pathname + location.search); }catch(e){}
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
  if($('resp-campo')) rascunhoResp = $('resp-campo').value;
  const proj = projetoDe(t.projetoId);
  const pai = t.paiId ? tarefaDe(t.paiId) : null;
  const subs = subtarefasDe(t._id);
  const peds = pedidosDe(t._id);
  const podeExcluir = ehMaster() || t.criadoPor === usuario.email;

  d.innerHTML =
  // ---------- 1. Cabeçalho: contexto, título e os chips ----------
  // Os quatro campos que importam (status, responsável, próxima ação e prazo
  // final) vivem SÓ aqui, e se editam clicando no próprio chip — antes eles
  // apareciam de novo num bloco "Detalhes", repetindo tudo.
  '<div class="tk-head">' +
    '<div class="row--between">' +
      '<div class="tk-ctx">' +
        '<i class="ti ti-' + TIPOS[t.tipo || 'tarefa'].icone + '"></i>' + esc(TIPOS[t.tipo || 'tarefa'].label) +
        (proj ? ' <span class="dot"></span> <span>' + esc(proj.nome) + '</span>' +
          (t.frenteId && nomeFrente(t.projetoId, t.frenteId)
            ? ' <span class="dot"></span> <span style="color:' + corFrente(t.projetoId, t.frenteId) +
              ';font-weight:600">' + esc(nomeFrente(t.projetoId, t.frenteId)) + '</span>' : '') +
          (proj.driveUrl ? ' ' + botaoPasta(proj._id, '', 'ctx-drive') : '') : '') +
        (pai ? ' <span class="dot"></span> <a href="#" onclick="abrirTarefa(\'' + pai._id + '\');return false">' +
               esc(recorta(pai.titulo, 34)) + '</a>' : '') +
      '</div>' +
      '<div class="row" style="gap:0">' +
        '<div class="menu-wrap">' +
          '<button class="icon-btn" title="Mais ações" onclick="alternarMenuTicket(event)"><i class="ti ti-dots"></i></button>' +
          '<div class="menu" id="menu-ticket">' +
            '<button onclick="copiarLinkTarefa(\'' + t._id + '\')"><i class="ti ti-link"></i> Copiar link da tarefa</button>' +
            '<button onclick="modalRenomear(\'' + t._id + '\')"><i class="ti ti-pencil"></i> Renomear</button>' +
            '<button onclick="modalDescricao(\'' + t._id + '\')"><i class="ti ti-align-left"></i> ' +
              (t.descricao ? 'Editar descrição' : 'Adicionar descrição') + '</button>' +
            '<button onclick="modalNovaSubtarefa(\'' + t._id + '\')"><i class="ti ti-corner-down-right"></i> Nova subtarefa</button>' +
            (podeExcluir ? '<hr><button class="perigo" onclick="excluirTarefa(\'' + t._id + '\')">' +
              '<i class="ti ti-trash"></i> Excluir tarefa</button>' : '') +
          '</div>' +
        '</div>' +
        '<button class="icon-btn" onclick="fecharPainel()" title="Fechar"><i class="ti ti-x"></i></button>' +
      '</div>' +
    '</div>' +
    '<div class="tk-tit">' + esc(t.titulo) +
      '<button class="icon-btn tk-tit__edit" title="Renomear" onclick="modalRenomear(\'' + t._id + '\')">' +
      '<i class="ti ti-pencil"></i></button></div>' +
    '<div class="tk-chips">' + chipStatus(t) + chipPessoa(t) +
      chipData(t, 'prazo') + chipData(t, 'final') + chipFrente(t) + chipPai(t) + '</div>' +
  '</div>' +

  '<div class="drawer__body">' +

  // ---------- 2. Situação: com quem está e o que dá para fazer agora ----------
  '<div class="sec">' +
    '<div class="sec__lab">Situação</div>' +
    '<div class="sit" style="border-left-color:' + st(t).cor + '">' +
      '<div class="sit__topo">' +
        '<span class="marca-sys" style="width:30px;height:30px;color:' + st(t).cor + '">' +
          '<i class="ti ti-' + st(t).icone + '"></i></span>' +
        '<span class="sit__txt">' + fraseSituacao(t) + '</span>' +
      '</div>' +
      acoesSituacao(t) +
    '</div>' +
    (planejadoDepoisDoDeadline(t) ? '<div class="banner banner--warning" style="margin-top:var(--space-3)">' +
      '<i class="ti ti-alert-triangle"></i><div>A próxima ação (' + esc(dataBR(t.prazo)) +
      ') está depois do prazo final (' + esc(dataBR(t.prazoFinal)) + ').</div></div>' : '') +
    (deadlineEstourado(t) ? '<div class="banner banner--warning" style="margin-top:var(--space-3)">' +
      '<i class="ti ti-flag"></i><div>Prazo final venceu em ' + esc(dataBR(t.prazoFinal)) +
      ' (' + diasEntre(t.prazoFinal, hoje()) + ' dia(s) atrás).</div></div>' : '') +
    (t.descricao ? '<div style="margin-top:var(--space-4);font-size:13px;white-space:pre-wrap;' +
      'color:var(--text-secondary)"><span class="sec__lab">Descrição</span>' + esc(t.descricao) + '</div>' : '') +
  '</div>' +

  // ---------- 3. Sublinhas (curtas, para não empurrar a conversa) ----------
  ((subs.length || peds.length) ?
    '<div class="sec">' +
      '<div class="row--between" style="margin-bottom:var(--space-3)">' +
        '<span class="sec__lab" style="margin:0">Subtarefas e pedidos</span>' +
        '<button class="btn" style="height:30px;font-size:12px" onclick="modalNovaSubtarefa(\'' + t._id + '\')">' +
          '<i class="ti ti-plus"></i> Subtarefa</button>' +
      '</div>' +
      '<div class="mini-lista">' +
        subs.sort(ordenarPorPrazo).map(miniLinha).join('') +
        peds.sort(ordenarPorPrazo).map(miniLinha).join('') +
      '</div>' +
    '</div>'
    : '<div class="sec" style="padding-top:0;border-bottom:1px solid var(--border)">' +
      '<button class="btn" style="height:30px;font-size:12px" onclick="modalNovaSubtarefa(\'' + t._id + '\')">' +
        '<i class="ti ti-plus"></i> Criar subtarefa</button></div>') +

  // ---------- 4. Atualizações: o coração do ticket ----------
  abasTicket() +
  '<div class="conv">' + conteudoAbaTicket(t) + '</div>' +

  '<div class="sec" style="border-bottom:none;padding-top:var(--space-3)">' +
    '<div class="small muted">Criada por ' + esc(nomeDe(t.criadoPor)) + ' em ' + esc(dataBR(t.criadoEm)) +
    (t.concluidaEm ? ' · concluída em ' + esc(dataBR(t.concluidaEm)) : '') + '</div>' +
  '</div>' +

  '</div>';

  const ta = $('msg-texto');
  if(ta){
    ta.value = rascunho;
    ta.onkeydown = e => { if(e.key === 'Enter' && (e.ctrlKey || e.metaKey)) enviarMensagem(); };
  }
  const rc = $('resp-campo');
  if(rc){
    rc.value = rascunhoResp;
    rc.onkeydown = e => { if(e.key === 'Enter' && (e.ctrlKey || e.metaKey)) enviarResposta(respondendo); };
  }
}

// ---------- Chips do cabeçalho (editáveis no lugar) ----------
function chipStatus(t){
  const s = st(t);
  return '<span class="chip chip--st" style="background:' + s.cor + ';border-color:' + s.cor +
    '" title="Clique para mudar a situação" onclick="popStatus(\'' + t._id + '\',event)">' +
    esc(s.label) + ' <i class="ti ti-chevron-down"></i></span>';
}
function chipPessoa(t){
  return '<span class="chip" title="Clique para trocar o responsável" onclick="popPessoa(\'' + t._id + '\',event)">' +
    avatar(t.responsavel, 'avatar--sm') + '<b>' + esc(primeiroNome(t.responsavel)) + '</b>' +
    '<i class="ti ti-chevron-down"></i></span>';
}
// Frente da demanda: só aparece quando o projeto tem frentes definidas.
function chipFrente(t){
  const fs = frentesDe(t.projetoId);
  if(!fs.length) return '';
  const nome = nomeFrente(t.projetoId, t.frenteId) || 'Geral';
  const cor = t.frenteId ? corFrente(t.projetoId, t.frenteId) : 'var(--text-muted)';
  return '<span class="chip chip--plain" title="Frente do projeto — clique para mover" ' +
    'onclick="popFrente(\'' + t._id + '\',event)">' +
    '<span class="pop__ponto" style="background:' + cor + '"></span>' +
    '<b>' + esc(nome) + '</b> <i class="ti ti-chevron-down"></i></span>';
}
// "Dentro de": move a demanda para debaixo de outra (ou a promove a principal).
// É o transferir de uma demanda para outra, por clique.
function chipPai(t){
  if(t.tipo === 'solicitacao') return '';          // pedido pertence a quem pediu
  const pai = t.paiId ? tarefaDe(t.paiId) : null;
  return '<span class="chip chip--plain" title="Transferir esta demanda para dentro de outra" ' +
    'onclick="popPai(\'' + t._id + '\',event)"><i class="ti ti-corner-down-right"></i>' +
    (pai ? 'dentro de <b>' + esc(recorta(pai.titulo, 24)) + '</b>' : 'demanda principal') +
    ' <i class="ti ti-chevron-down"></i></span>';
}
function popPai(id, ev){
  ev.stopPropagation();
  const t = tarefaDe(id);
  if(!t) return;
  const proibidos = subarvore(id);               // não pode virar filha de si mesma
  const candidatas = tarefas.filter(x => x.projetoId === t.projetoId &&
    !proibidos.includes(x._id) && x.tipo !== 'solicitacao' && !x.paiId);
  abrirPop(ev, '<div class="pop__lab">Transferir para dentro de</div>' +
    '<button class="' + (!t.paiId ? 'pop--sel' : '') + '" onclick="fecharPop();mudarPai(\'' + id + '\',\'\')">' +
      '<i class="ti ti-arrow-up-left"></i> Nenhuma — deixar como demanda principal</button>' +
    (candidatas.length ? ordenarNaTabela(candidatas).map(x =>
      '<button class="' + (t.paiId === x._id ? 'pop--sel' : '') +
      '" onclick="fecharPop();mudarPai(\'' + id + '\',\'' + x._id + '\')">' +
      '<span class="pop__ponto" style="background:' + st(x).cor + '"></span>' + esc(recorta(x.titulo, 34)) + '</button>').join('')
      : '<div class="pop__lab">Nenhuma outra demanda neste projeto</div>'));
}
async function mudarPai(id, novoPai){
  const t = tarefaDe(id);
  if(!t || (t.paiId || '') === novoPai) return;
  const pai = novoPai ? tarefaDe(novoPai) : null;
  if(novoPai && !pai) return;
  try{
    const novaFrente = pai ? (pai.frenteId || null) : (t.frenteId || null);
    const b = window._batch();
    b.update(window._doc(COL_TAR, id), {
      paiId: novoPai || null,
      tipo: novoPai ? 'subtarefa' : 'tarefa',
      frenteId: novaFrente,
      ordem: 1e6,
      atualizadoEm: new Date().toISOString()
    });
    patchDescendentes(b, id, { frenteId:novaFrente });
    await b.commit();
    await postarMensagem(id, pai
      ? 'Transferida para dentro de "' + pai.titulo + '".'
      : 'Passou a ser demanda principal.', 'sistema');
    toast(pai ? 'Transferida para "' + recorta(pai.titulo, 30) + '".' : 'Agora é demanda principal.', 'ok');
  }catch(e){ toast('Erro: ' + (e && e.code || e), 'erro'); }
}

function popFrente(id, ev){
  ev.stopPropagation();
  const t = tarefaDe(id);
  if(!t) return;
  const fs = frentesDe(t.projetoId);
  abrirPop(ev, '<div class="pop__lab">Mover para a frente</div>' +
    ['', ].concat(fs.map(f => f.id)).map(fid => {
      const nome = fid ? nomeFrente(t.projetoId, fid) : 'Geral (sem frente)';
      const cor = fid ? corFrente(t.projetoId, fid) : 'var(--text-muted)';
      return '<button class="' + ((t.frenteId || '') === fid ? 'pop--sel' : '') +
        '" onclick="fecharPop();mudarFrente(\'' + id + '\',\'' + fid + '\')">' +
        '<span class="pop__ponto" style="background:' + cor + '"></span>' + esc(nome) + '</button>';
    }).join(''));
}
// Mover a demanda de frente leva as sublinhas com ela — elas pertencem à mesma
// frente por definição.
async function mudarFrente(id, frenteId){
  const t = tarefaDe(id);
  if(!t || (t.frenteId || '') === frenteId) return;
  const nome = frenteId ? nomeFrente(t.projetoId, frenteId) : 'Geral';
  try{
    const b = window._batch();
    b.update(window._doc(COL_TAR, id), { frenteId:frenteId || null, atualizadoEm:new Date().toISOString() });
    patchDescendentes(b, id, { frenteId:frenteId || null });
    await b.commit();
    await postarMensagem(id, 'Movida para a frente "' + nome + '".', 'sistema');
    toast('Movida para ' + nome + '.', 'ok');
  }catch(e){ toast('Erro: ' + (e && e.code || e), 'erro'); }
}

function chipData(t, campo){
  const valor = campo === 'prazo' ? t.prazo : t.prazoFinal;
  const cls = classeData(valor, t, campo !== 'prazo');
  const rot = campo === 'prazo' ? 'próxima ação' : 'prazo final';
  const ico = campo === 'prazo' ? 'calendar-event' : 'flag';
  const txt = valor ? (campo === 'prazo' ? prazoTexto(valor) : dataBR(valor)) : 'definir';
  return '<span class="chip chip--plain" title="Clique para ' +
    (campo === 'prazo' ? 'reprogramar a próxima ação' : 'mudar o prazo final') + '" ' +
    'onclick="editarChipData(\'' + t._id + '\',\'' + campo + '\',event)">' +
    '<i class="ti ti-' + ico + '"></i>' + rot + ' <b class="' + cls + '">' + esc(txt) + '</b></span>';
}
function editarChipData(id, campo, ev){
  ev.stopPropagation();
  const el = ev.currentTarget;
  const t = tarefaDe(id);
  if(!t || el.querySelector('input')) return;
  const valor = (campo === 'prazo' ? t.prazo : t.prazoFinal) || '';
  const fn = campo === 'prazo' ? 'mudarPrazo' : 'mudarPrazoFinal';
  el.innerHTML = '<input type="date" value="' + esc(valor) + '" onclick="event.stopPropagation()" ' +
    'onchange="' + fn + '(\'' + id + '\',this.value)" onblur="renderPainel()">';
  const inp = el.querySelector('input');
  inp.focus();
  try{ inp.showPicker(); }catch(e){}
}

// ---------- Popover ----------
function abrirPop(ev, html){
  const p = $('pop');
  p.innerHTML = html;
  p.classList.add('pop--on');
  const r = ev.currentTarget.getBoundingClientRect();
  p.style.top = Math.min(r.bottom + 6, window.innerHeight - 320) + 'px';
  p.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 240)) + 'px';
}
function fecharPop(){
  const p = $('pop');
  if(p){ p.classList.remove('pop--on'); p.innerHTML = ''; }
}
function popStatus(id, ev){
  ev.stopPropagation();
  const t = tarefaDe(id);
  if(!t) return;
  abrirPop(ev, '<div class="pop__lab">Mover para</div>' + COLUNAS.map(k =>
    '<button class="' + (t.status === k ? 'pop--sel' : '') + '" onclick="fecharPop();mudarStatus(\'' + id + '\',\'' + k + '\')">' +
    '<span class="pop__ponto" style="background:' + STATUS[k].cor + '"></span>' + esc(STATUS[k].coluna) + '</button>').join(''));
}
function popPessoa(id, ev){
  ev.stopPropagation();
  const t = tarefaDe(id);
  if(!t) return;
  abrirPop(ev, '<div class="pop__lab">Responsável</div>' + usuarios.map(u =>
    '<button class="' + (t.responsavel === u.email ? 'pop--sel' : '') + '" onclick="fecharPop();mudarResponsavel(\'' + id + '\',\'' + esc(u.email) + '\')">' +
    avatar(u.email, 'avatar--sm') + esc(nomeDe(u.email)) + '</button>').join(''));
}

function atualizacoes(){ return mensagens.filter(m => m.tipo !== 'sistema' && !m.respostaDe); }
function respostasDe(id){
  return mensagens.filter(m => m.respostaDe === id)
    .sort((a,b) => String(a.criadoEm||'').localeCompare(String(b.criadoEm||'')));   // resposta é conversa: mais antiga primeiro
}
function eventosSistema(){ return mensagens.filter(m => m.tipo === 'sistema'); }
function todosAnexos(){
  const fora = [];
  mensagens.filter(m => m.tipo !== 'sistema').forEach(m => (m.anexos || []).forEach(a =>
    fora.push(Object.assign({}, a, { autor:m.autor, criadoEm:m.criadoEm }))));
  return fora;
}
function abasTicket(){
  const abas = [
    { id:'upd',  icone:'message-circle-2', label:'Atualizações', n:atualizacoes().length },
    { id:'arq',  icone:'paperclip',        label:'Arquivos',     n:todosAnexos().length },
    { id:'hist', icone:'history',          label:'Histórico',    n:eventosSistema().length },
  ];
  return '<div class="tk-abas">' + abas.map(a =>
    '<button class="tk-aba' + (abaTicket === a.id ? ' tk-aba--on' : '') + '" onclick="trocarAbaTicket(\'' + a.id + '\')">' +
    '<i class="ti ti-' + a.icone + '"></i>' + a.label + (a.n ? ' <span>' + a.n + '</span>' : '') + '</button>').join('') + '</div>';
}
function trocarAbaTicket(id){ abaTicket = id; renderPainel(); }

function conteudoAbaTicket(t){
  if(abaTicket === 'arq'){
    const arqs = todosAnexos();
    const pasta = pastaDoProjeto(t.projetoId);
    // A pasta do projeto vem primeiro: é lá que o arquivo de verdade mora.
    const cabecalhoPasta = pasta
      ? '<a class="arq arq--pasta" href="' + esc(pasta) + '" target="_blank" rel="noopener">' +
        '<span class="arq__ico" style="background:var(--success-bg);color:var(--success-text)">' +
          '<i class="ti ti-brand-google-drive"></i></span>' +
        '<span class="arq__nome">Pasta deste projeto no Drive' +
          '<div class="small muted" style="font-weight:400">Todos os arquivos do projeto ficam aqui</div></span>' +
        '<i class="ti ti-external-link muted"></i></a>'
      : '<div class="banner banner--info" style="margin-bottom:var(--space-3)"><i class="ti ti-folder-off"></i>' +
        '<div>Este projeto ainda não tem pasta do Drive vinculada. Dá para vincular no cabeçalho do projeto, ' +
        'na aba Projetos.</div></div>';
    if(!arqs.length) return cabecalhoPasta +
      '<div class="small muted" style="text-align:center;padding:var(--space-5)">' +
      'Nenhum anexo nesta tarefa ainda. Suba o arquivo na pasta do projeto e cole o link aqui pelo botão de link.</div>';
    return cabecalhoPasta + '<div class="arq-lista" style="margin-top:var(--space-3)">' + arqs.map(a =>
      '<a class="arq" ' + (a.tipo === 'link'
          ? 'href="' + esc(a.url) + '" target="_blank" rel="noopener"'
          : 'href="' + esc(a.dados) + '" download="' + esc(a.nome) + '"') + '>' +
        '<span class="arq__ico"><i class="ti ti-' + (a.tipo === 'link' ? 'external-link' : 'file') + '"></i></span>' +
        '<span class="arq__nome">' + esc(a.nome) + '</span>' +
        '<span class="small muted" style="white-space:nowrap">' + esc(primeiroNome(a.autor)) + ' · ' +
          esc(dataBR(a.criadoEm)) + ' ' + (a.tipo === 'link' ? '' : kb(a.tamanho)) + '</span>' +
      '</a>').join('') + '</div>';
  }
  if(abaTicket === 'hist'){
    const evs = eventosSistema();
    if(!evs.length) return '<div class="small muted" style="text-align:center;padding:var(--space-5)">' +
      'Sem movimentações registradas ainda.</div>';
    return evs.map(m =>
      '<div class="hist"><span class="marca-sys" style="width:22px;height:22px;font-size:12px">' +
      '<i class="ti ti-info-circle"></i></span><div style="flex:1"><div>' + esc(m.texto) + '</div>' +
      '<div class="small muted">' + esc(quando(m.criadoEm)) + '</div></div></div>').join('');
  }
  // Aba padrão: as atualizações escritas por pessoas, mais nova no topo.
  const upds = atualizacoes();
  return '<div class="comp">' + avatar(usuario.email, 'avatar--sm') + '<div class="comp__corpo">' +
      (paraMarcar.length ? '<div class="fila">' + paraMarcar.map((e,i) =>
        '<span class="tag-pessoa" onclick="desmarcarPessoa(' + i + ')">@' + esc(primeiroNome(e)) +
        ' <i class="ti ti-x"></i></span>').join('') + '</div>' : '') +
      '<div class="fila" id="fila-anexos">' + filaAnexosHTML() + '</div>' +
      '<textarea id="msg-texto" placeholder="Escreva uma atualização e marque quem precisa ver com @ (Ctrl+Enter envia)"></textarea>' +
      '<div class="row">' +
        '<button class="comp__ico" title="Marcar alguém (ela recebe notificação)" onclick="modalMarcar()">' +
          '<i class="ti ti-at"></i></button>' +
        '<button class="comp__ico" title="Anexar arquivo pequeno" onclick="document.getElementById(\'arq-input\').click()">' +
          '<i class="ti ti-paperclip"></i></button>' +
        '<button class="comp__ico" title="Anexar link do Drive" onclick="modalLink()"><i class="ti ti-link"></i></button>' +
        '<input type="file" id="arq-input" multiple style="display:none" onchange="anexarArquivos(this)">' +
        '<span class="spacer"></span>' +
        '<button class="btn btn--primary" onclick="enviarMensagem()"><i class="ti ti-send"></i> Enviar</button>' +
      '</div>' +
    '</div></div>' +
    (upds.length ? '<div style="margin-top:var(--space-4)">' + upds.map(cartaoUpd).join('') + '</div>'
      : '<div class="small muted" style="text-align:center;padding:var(--space-5)">' +
        'Nada escrito ainda. O que for registrado aqui fica com autor, data e anexos.</div>');
}

// Cartão de atualização, como na referência: autor, hora, texto, e um rodapé
// com Curtir e Responder. A resposta fica aninhada no próprio cartão — é ali
// que a conversa acontece, sem perder de vista a que atualização ela responde.
function cartaoUpd(m){
  const nova = m.autor !== usuario.email && String(m.criadoEm || '') > lidoAoAbrir;
  const curtidas = m.curtidas || [];
  const euCurti = curtidas.includes(usuario.email);
  const resp = respostasDe(m._id);
  return '<div class="upd' + (nova ? ' upd--nova' : '') + '">' +
    cabecalhoUpd(m) +
    '<div class="upd__corpo">' + esc(m.texto) +
      ((m.anexos && m.anexos.length) ? '<div class="fila" style="margin-top:9px">' +
        m.anexos.map(anexoHTML).join('') + '</div>' : '') +
    '</div>' +
    '<div class="upd__pe">' +
      '<button class="upd__acao' + (euCurti ? ' upd__acao--on' : '') + '" onclick="curtir(\'' + m._id + '\')">' +
        '<i class="ti ti-thumb-up"></i> Curtir' + (curtidas.length ? ' · ' + curtidas.length : '') + '</button>' +
      '<button class="upd__acao" onclick="abrirResposta(\'' + m._id + '\')">' +
        '<i class="ti ti-corner-up-left"></i> Responder' + (resp.length ? ' · ' + resp.length : '') + '</button>' +
      (curtidas.length ? '<span class="spacer"></span><span class="small muted">' +
        esc(curtidas.map(e => e === usuario.email ? 'você' : primeiroNome(e)).join(', ')) +
        (curtidas.length > 1 ? ' curtiram' : ' curtiu') + '</span>' : '') +
    '</div>' +
    (resp.length ? '<div class="upd__resp">' + resp.map(r =>
      '<div class="resp">' + avatar(r.autor, 'avatar--sm') +
        '<div><div class="resp__meta"><b>' + esc(r.autor === usuario.email ? 'Você' : (r.autorNome || nomeDe(r.autor))) +
          '</b> ' + esc(quando(r.criadoEm)) + '</div>' +
          '<div class="resp__txt">' + esc(r.texto) + '</div></div>' +
      '</div>').join('') + '</div>' : '') +
    (respondendo === m._id
      ? '<div class="upd__resp"><div class="resp">' + avatar(usuario.email, 'avatar--sm') +
        '<div style="flex:1"><textarea class="resp__campo" id="resp-campo" ' +
          'placeholder="Escreva uma resposta (Ctrl+Enter envia)"></textarea>' +
        '<div class="row" style="margin-top:6px">' +
          '<button class="btn btn--primary" style="height:30px;font-size:12px" onclick="enviarResposta(\'' + m._id + '\')">' +
            '<i class="ti ti-send"></i> Responder</button>' +
          '<button class="btn" style="height:30px;font-size:12px" onclick="fecharResposta()">Cancelar</button>' +
        '</div></div></div></div>'
      : '') +
  '</div>';
}
function cabecalhoUpd(m){
  return '<div class="upd__head">' + avatar(m.autor, 'avatar--sm') +
    '<span class="upd__nome">' + esc(m.autor === usuario.email ? 'Você' : (m.autorNome || nomeDe(m.autor))) + '</span>' +
    '<span class="upd__hora">' + esc(quando(m.criadoEm)) + '</span>' +
    ((m.mencoes && m.mencoes.length) ? m.mencoes.map(e =>
      '<span class="tag-pessoa" style="cursor:default">@' + esc(primeiroNome(e)) + '</span>').join('') : '') +
  '</div>';
}
function abrirResposta(id){
  respondendo = (respondendo === id) ? null : id;
  rascunhoResp = '';
  renderPainel();
  const c = $('resp-campo');
  if(c){
    c.focus();
    c.onkeydown = e => { if(e.key === 'Enter' && (e.ctrlKey || e.metaKey)) enviarResposta(id); };
  }
}
function fecharResposta(){ respondendo = null; rascunhoResp = ''; renderPainel(); }
async function enviarResposta(id){
  const c = $('resp-campo');
  const texto = (c && c.value || '').trim();
  if(!texto){ toast('Escreva a resposta.'); return; }
  const mae = mensagens.find(m => m._id === id);
  respondendo = null; rascunhoResp = '';
  try{
    const t = await postarMensagem(tarefaAberta, texto, 'msg', [], [], id);
    if(t){
      const alvos = envolvidos(t);
      if(mae) alvos.push(mae.autor);
      await notificar(alvos, 'mensagem', texto, t);
    }
  }catch(e){ toast('Não foi possível responder: ' + (e && e.code || e), 'erro'); }
}
// Curtir é o reconhecimento rápido: "vi e concordo", sem virar mensagem nova.
async function curtir(id){
  const m = mensagens.find(x => x._id === id);
  if(!m) return;
  const atuais = m.curtidas || [];
  const novas = atuais.includes(usuario.email)
    ? atuais.filter(e => e !== usuario.email)
    : atuais.concat([usuario.email]);
  try{ await window._updateDoc(window._doc(COL_MSG, id), { curtidas:novas }); }
  catch(e){ toast('Erro: ' + (e && e.code || e), 'erro'); }
}

function alternarMenuTicket(ev){
  if(ev) ev.stopPropagation();
  const m = $('menu-ticket');
  if(m) m.classList.toggle('menu--on');
}
// Link direto para a tarefa: cola no chat/e-mail e a pessoa cai no ticket.
function copiarLinkTarefa(id){
  const url = location.origin + location.pathname + '#t=' + id;
  const ok = () => toast('Link copiado.', 'ok');
  if(navigator.clipboard && navigator.clipboard.writeText)
    navigator.clipboard.writeText(url).then(ok, () => toast(url));
  else toast(url);
  const m = $('menu-ticket'); if(m) m.classList.remove('menu--on');
}
function focarCampo(id){ const e = $(id); if(e){ e.focus(); if(e.showPicker) try{ e.showPicker(); }catch(x){} } }
function opcoesPessoa(sel){
  return usuarios.map(u => '<option value="' + esc(u.email) + '"' + (u.email === sel ? ' selected' : '') + '>' +
    esc(nomeDe(u.email)) + '</option>').join('');
}

// A situação responde duas coisas: COM QUEM a tarefa está agora, e o que dá
// para fazer daqui. Trocar status à mão saiu daqui — isso é o chip do topo (ou
// arrastar no kanban); aqui ficam só as viradas de verdade.
function quemChip(email){
  const eu = email === usuario.email;
  return '<span class="sit__quem">' + avatar(email, 'avatar--sm') +
    (eu ? 'você' : esc(primeiroNome(email))) + '</span>';
}
function fraseSituacao(t){
  const com = quemChip(t.responsavel);
  const pedAbertos = abertas(pedidosDe(t._id));
  if(t.status === 'concluida')
    return 'Finalizada' + (t.concluidaEm ? ' em ' + esc(dataBR(t.concluidaEm)) : '') + '. Estava com ' + com + '.';
  if(t.status === 'aguardando')
    return pedAbertos.length
      ? 'Parada com ' + com + ', esperando ' + pedAbertos.map(f => quemChip(f.responsavel)).join(' ') + '.'
      : 'Parada com ' + com + ', esperando algo de fora.';
  if(t.status === 'checar')
    return 'Voltou respondida e está com ' + com + ', para conferir e seguir.';
  if(t.status === 'andamento')
    return 'Está com ' + com + ', em andamento' +
      (t.prazo ? ' (próxima ação ' + esc(prazoTexto(t.prazo)) + ')' : '') + '.';
  if(t.status === 'futuro')
    return 'Parada de propósito com ' + com + ' — ação futura' +
      (t.prazo ? ', prevista para ' + esc(prazoTexto(t.prazo)) : ' e sem data') + '.';
  return 'Na fila de ' + com +
    (t.prazo ? ', próxima ação ' + esc(prazoTexto(t.prazo)) : ' (sem próxima ação definida)') + '.';
}
function acoesSituacao(t){
  const id = t._id;
  const meu = t.responsavel === usuario.email;
  const b = [];
  if(t.status === 'concluida'){
    // Pedido finalizado que não resolveu: comento e devolvo para a pessoa.
    if(t.tipo === 'solicitacao' && t.paiId && (t.solicitante === usuario.email || ehMaster()))
      b.push('<button class="acao acao--ativa" onclick="modalReabrirPedido(\'' + id + '\')">' +
        '<i class="ti ti-rotate"></i> Comentar e devolver para ' + esc(primeiroNome(t.responsavel)) + '</button>');
    b.push('<button class="acao" onclick="reabrirTarefa(\'' + id + '\')"><i class="ti ti-rotate"></i> Reabrir</button>');
  }else{
    // Pedido que é meu: encerra respondendo, e é a resposta que destrava quem pediu.
    if(t.tipo === 'solicitacao' && meu)
      b.push('<button class="acao acao--ok" onclick="modalResponder(\'' + id + '\')">' +
        '<i class="ti ti-corner-up-left"></i> Responder e devolver</button>');
    // Sempre disponível: virar um pedido para outra pessoa.
    b.push('<button class="acao" onclick="modalSolicitar(\'' + id + '\')">' +
      '<i class="ti ti-user-plus"></i> Preciso de alguém</button>');
    // Tarefa que eu criei para outra pessoa e que não está no meu quadro:
    // passa a ser acompanhada (vira pedido, e nasce a minha em aguardando).
    if(!t.paiId && t.tipo !== 'solicitacao' && t.criadoPor === usuario.email && !meu)
      b.push('<button class="acao" onclick="acompanharTarefa(\'' + id + '\')">' +
        '<i class="ti ti-eye"></i> Acompanhar no meu quadro</button>');
    // Concluir só aparece para quem está com a tarefa na mão.
    if(meu && t.tipo !== 'solicitacao')
      b.push('<button class="acao acao--ok" onclick="concluirTarefa(\'' + id + '\')">' +
        '<i class="ti ti-check"></i> Concluir</button>');
  }
  return b.length ? '<div class="sit__acoes">' + b.join('') + '</div>' : '';
}
function miniLinha(t){
  const podeDevolver = t.tipo === 'solicitacao' && t.status === 'concluida' && t.paiId &&
    (t.solicitante === usuario.email || ehMaster());
  return '<div class="mini" style="border-left-color:' + st(t).cor +
      '" onclick="abrirTarefa(\'' + t._id + '\')">' +
    avatar(t.responsavel, 'avatar--sm') +
    '<span class="mini__tit">' + esc(t.titulo) + (temNaoLida(t) ? ' <span class="pill pill--nova">novo</span>' : '') + '</span>' +
    (podeDevolver ? '<button class="mini__acao" title="Comentar e devolver para ' + esc(nomeDe(t.responsavel)) + '" ' +
      'onclick="event.stopPropagation();modalReabrirPedido(\'' + t._id + '\')">' +
      '<i class="ti ti-rotate"></i> devolver</button>' : '') +
    (t.prazo ? '<span class="small ' + classeData(t.prazo, t, false) + '">' + esc(prazoTexto(t.prazo)) + '</span>' : '') +
    stPill(t) +
  '</div>';
}

// ---------- Linha do tempo da conversa (mais nova no topo) ----------
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
  // Estar "aguardando terceiros" sem ter pedido nenhum em aberto é um estado
  // que não diz nada: quem está esperando o quê, de quem? Então cair nessa
  // coluna abre o pedido, e é a criação dele que muda o status.
  if(novo === 'aguardando' && !abertas(pedidosDe(id)).length){
    modalSolicitar(id);
    renderPainel();
    return;
  }
  if(t.status === novo){ renderPainel(); return; }
  await atualizarTarefa(id, { status:novo, concluidaEm:null, atualizadoEm:new Date().toISOString() });
  await postarMensagem(id, 'Situação: ' + (STATUS[novo] || {}).label + '.', 'sistema');
  // Pedido que sai de finalizado volta a travar quem pediu.
  if(t.tipo === 'solicitacao' && t.status === 'concluida' && t.paiId)
    await travarPai(t, 'O pedido "' + t.titulo + '" foi reaberto — aguardando ' + nomeDe(t.responsavel) + ' de novo.');
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
  // Se era um pedido, quem pediu tem de recuperar a tarefa dele.
  if(t.tipo === 'solicitacao' && t.paiId) await devolverAoPai(t, 'Pedido concluído por ' + usuario.nome + '.');
  toast('Tarefa concluída.', 'ok');
}

// O contrário do devolverAoPai: um pedido que volta a ficar aberto trava de
// novo a tarefa de quem pediu — ela não pode seguir enquanto a resposta não
// vier. É o que faz o ciclo funcionar nos dois sentidos.
async function travarPai(filha, aviso){
  const pai = filha.paiId ? tarefaDe(filha.paiId) : null;
  if(!pai || pai.status === 'concluida') return;
  if(pai.status !== 'aguardando')
    await atualizarTarefa(pai._id, { status:'aguardando', atualizadoEm:new Date().toISOString() });
  await postarMensagem(pai._id, aviso || 'Pedido reaberto — aguardando terceiros de novo.', 'sistema');
}

// Destrava a tarefa de quem pediu: quando não sobra nenhum pedido em aberto,
// ela volta para VERIFICAR / REVISAR — é lá que a pessoa confere o que mudou.
async function devolverAoPai(filha, aviso){
  const pai = filha.paiId ? tarefaDe(filha.paiId) : null;
  if(!pai) return;
  const aindaAbertos = abertas(pedidosDe(pai._id)).filter(f => f._id !== filha._id);
  if(aviso) await postarMensagem(pai._id, aviso, 'sistema');
  if(aindaAbertos.length){
    await postarMensagem(pai._id, 'Ainda falta(m) ' + aindaAbertos.length + ' pedido(s) para liberar.', 'sistema');
    return;
  }
  if(pai.status === 'concluida') return;
  await atualizarTarefa(pai._id, { status:'checar', atualizadoEm:new Date().toISOString() });
  await postarMensagem(pai._id, 'Voltou para verificar/revisar.', 'sistema');
  await notificar([pai.responsavel, filha.solicitante], 'resposta',
    'Pode conferir: ' + recorta(pai.titulo, 60), pai);
}
async function reabrirTarefa(id){
  const t = tarefaDe(id);
  await atualizarTarefa(id, { status:'a_fazer', concluidaEm:null });
  await postarMensagem(id, 'Reaberta por ' + usuario.nome + '.', 'sistema');
  if(t && t.tipo === 'solicitacao' && t.paiId){
    await atualizarTarefa(id, { prazo:hoje() }).catch(()=>{});   // volta para a agenda de hoje da pessoa
    await travarPai(t, 'O pedido "' + t.titulo + '" foi reaberto — aguardando ' + nomeDe(t.responsavel) + ' de novo.');
    await notificar([t.responsavel], 'solicitacao', 'Reaberto: ' + t.titulo, t);
  }
}
// Exclui a demanda e tudo que pende dela (subtarefas, pedidos e as conversas),
// porque travar e pedir para apagar uma a uma só empurrava o trabalho.
// Ao mover uma demanda de grupo, as sublinhas vão com ela: pertencem ao mesmo
// projeto e à mesma frente por definição.
function patchDescendentes(b, id, patch){
  subarvore(id).filter(x => x !== id).forEach(x => b.update(window._doc(COL_TAR, x), patch));
}
function subarvore(id, prof){
  const fora = [id];
  if((prof || 0) > 4) return fora;
  filhasDe(id).forEach(f => fora.push.apply(fora, subarvore(f._id, (prof || 0) + 1)));
  return fora;
}
async function excluirTarefa(id){
  const t = tarefaDe(id);
  if(!t) return;
  const ids = subarvore(id);
  const nFilhas = ids.length - 1;
  if(!confirm('Excluir "' + t.titulo + '"' +
    (nFilhas ? ' e as ' + nFilhas + ' sublinha(s) dela (subtarefas e pedidos)' : '') +
    ', com as conversas? Isso não tem volta.')) return;
  try{
    const b = window._batch();
    const snaps = await Promise.all(ids.map(x =>
      window._getDocs(window._query(window._col(COL_MSG), window._where('tarefaId','==',x)))));
    snaps.forEach(s => s.forEach(d => b.delete(window._doc(COL_MSG, d.id))));
    ids.forEach(x => b.delete(window._doc(COL_TAR, x)));
    await b.commit();
    if(tarefaAberta && ids.includes(tarefaAberta)) fecharPainel();
    toast(nFilhas ? 'Demanda e sublinhas excluídas.' : 'Demanda excluída.', 'ok');
  }catch(e){ toast('Não foi possível excluir: ' + (e && e.code || e), 'erro'); }
}

// Excluir o projeto leva as demandas e as conversas. É a ação mais destrutiva
// do sistema, então o aviso diz exatamente o tamanho do estrago.
async function excluirProjeto(id){
  const p = projetoDe(id);
  if(!p) return;
  const ts = tarefasDoProjeto(id);
  if(!confirm('Excluir o projeto "' + p.nome + '"?' +
    (ts.length ? '\n\nIsso apaga as ' + ts.length + ' demanda(s) dele e todas as conversas.' : '') +
    '\n\nNão tem volta.')) return;
  if(ts.length > 5 && !confirm('Confirma mesmo? São ' + ts.length + ' demandas neste projeto.')) return;
  try{
    const b = window._batch();
    const snaps = await Promise.all(ts.map(t =>
      window._getDocs(window._query(window._col(COL_MSG), window._where('tarefaId','==',t._id)))));
    snaps.forEach(s => s.forEach(d => b.delete(window._doc(COL_MSG, d.id))));
    ts.forEach(t => b.delete(window._doc(COL_TAR, t._id)));
    b.delete(window._doc(COL_PROJ, id));
    await b.commit();
    if(tarefaAberta && ts.some(t => t._id === tarefaAberta)) fecharPainel();
    toast('Projeto excluído.', 'ok');
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
    '<div class="fg"><label>Pasta do projeto no Google Drive</label>' +
      '<input id="p-drive" value="' + esc(p ? (p.driveUrl || '') : '') +
      '" placeholder="https://drive.google.com/drive/folders/..."></div>' +
      '<div class="ajuda" style="margin:-10px 0 var(--space-4)">Abra a pasta do projeto no Drive da Udiaço, ' +
      'copie o endereço da barra e cole aqui. Os arquivos do projeto passam a viver lá e as tarefas guardam o link.</div>' +
    '<div class="fg"><label>Situação</label><select id="p-status">' +
      ['ativo','pausado','concluido'].map(s => '<option value="' + s + '"' + (p && p.status === s ? ' selected' : '') + '>' +
        ({ativo:'Em andamento',pausado:'Pausado',concluido:'Concluído'})[s] + '</option>').join('') + '</select></div>',
    p ? 'Salvar' : 'Criar projeto', 'salvarProjeto(' + (id ? '\'' + id + '\'' : 'null') + ')'));
}
async function salvarProjeto(id){
  const nome = ($('p-nome').value || '').trim();
  if(!nome){ toast('Dê um nome ao projeto.', 'erro'); return; }
  const drive = ($('p-drive').value || '').trim();
  if(drive && !/^https?:\/\//i.test(drive)){ toast('O link da pasta precisa começar com https://', 'erro'); return; }
  const dados = { nome, descricao:($('p-desc').value || '').trim(),
    lider:$('p-lider').value, status:$('p-status').value, driveUrl:drive || null,
    atualizadoEm:new Date().toISOString() };
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

// ---------- Frentes do projeto ----------
function modalFrente(projetoId, frenteId){
  const f = frenteId ? frenteDe(projetoId, frenteId) : null;
  abrirModal(moldura(f ? 'Editar frente' : 'Nova frente do projeto',
    '<div class="banner banner--info" style="margin-bottom:var(--space-4)"><i class="ti ti-layout-rows"></i>' +
      '<div>Frente é uma subdivisão do projeto — não é tarefa. Ex.: um projeto do comercial dividido ' +
      'em <b>SDR</b>, <b>Crédito</b> e <b>Orçamento</b>, cada uma com suas demandas.</div></div>' +
    '<div class="fg"><label>Nome da frente</label><input id="fr-nome" value="' + esc(f ? f.nome : '') +
      '" placeholder="Ex.: SDR"></div>' +
    (f ? '<div class="small muted">Ao excluir, as demandas desta frente não são apagadas: elas voltam ' +
      'para "Geral".</div>' : ''),
    f ? 'Salvar' : 'Criar frente',
    'salvarFrente(\'' + projetoId + '\',' + (frenteId ? '\'' + frenteId + '\'' : 'null') + ')') +
    (f ? '<div style="padding:0 var(--space-5) var(--space-5);margin-top:-8px">' +
      '<button class="btn btn--danger" onclick="excluirFrente(\'' + projetoId + '\',\'' + frenteId + '\')">' +
      '<i class="ti ti-trash"></i> Excluir frente</button></div>' : ''));
}
async function salvarFrente(projetoId, frenteId){
  const nome = ($('fr-nome').value || '').trim();
  if(!nome){ toast('Dê um nome à frente.', 'erro'); return; }
  const atuais = frentesDe(projetoId).slice();
  if(frenteId){
    const i = atuais.findIndex(x => x.id === frenteId);
    if(i < 0) return;
    atuais[i] = Object.assign({}, atuais[i], { nome });
  }else{
    atuais.push({ id:novoId(), nome });
  }
  try{
    await window._updateDoc(window._doc(COL_PROJ, projetoId), { frentes:atuais, atualizadoEm:new Date().toISOString() });
    fecharModal();
    toast(frenteId ? 'Frente atualizada.' : 'Frente criada.', 'ok');
  }catch(e){ toast('Erro ao salvar: ' + (e && e.code || e), 'erro'); }
}
// Excluir a frente não apaga demanda: elas voltam para "Geral".
async function excluirFrente(projetoId, frenteId){
  const f = frenteDe(projetoId, frenteId);
  const dentro = tarefas.filter(t => t.projetoId === projetoId && t.frenteId === frenteId);
  if(!f) return;
  if(!confirm('Excluir a frente "' + f.nome + '"?' +
    (dentro.length ? '\nAs ' + dentro.length + ' demanda(s) dela voltam para "Geral".' : ''))) return;
  try{
    const b = window._batch();
    dentro.forEach(t => b.update(window._doc(COL_TAR, t._id), { frenteId:null }));
    b.update(window._doc(COL_PROJ, projetoId), { frentes:frentesDe(projetoId).filter(x => x.id !== frenteId) });
    await b.commit();
    fecharModal();
    toast('Frente excluída.', 'ok');
  }catch(e){ toast('Erro ao excluir: ' + (e && e.code || e), 'erro'); }
}

// ---------- Tarefa / subtarefa ----------
function opcoesFrente(projetoId, sel){
  const fs = frentesDe(projetoId);
  return '<option value="">Geral (sem frente)</option>' + fs.map(f =>
    '<option value="' + esc(f.id) + '"' + (f.id === sel ? ' selected' : '') + '>' + esc(f.nome) + '</option>').join('');
}
// Trocar o projeto no formulário troca a lista de frentes.
// A caixa de acompanhamento só faz sentido quando o responsável é outra pessoa.
function atualizarAcompanhar(){
  const linha = $('t-acomp-linha'), sel = $('t-resp');
  if(!linha || !sel) return;
  linha.style.display = (sel.value && sel.value !== usuario.email) ? 'block' : 'none';
}
function atualizarFrentesModal(){
  const sel = $('t-frente');
  if(sel) sel.innerHTML = opcoesFrente($('t-proj').value, '');
}
function modalNovaTarefa(projetoId, frenteId){
  if(!projetos.length){
    toast('Crie um projeto antes de lançar demandas.');
    aba = 'projetos'; render(); modalNovoProjeto();
    return;
  }
  const ativos = projetos.filter(p => p.status !== 'concluido');
  const lista = ativos.length ? ativos : projetos;
  const projSel = projetoId || (lista[0] && lista[0]._id);
  abrirModal(moldura('Nova demanda',
    '<div class="fg"><label>Projeto</label><select id="t-proj" onchange="atualizarFrentesModal()">' + lista.map(p =>
      '<option value="' + p._id + '"' + (p._id === projetoId ? ' selected' : '') + '>' + esc(p.nome) + '</option>').join('') +
      '</select></div>' +
    '<div class="fg"><label>Frente</label><select id="t-frente">' + opcoesFrente(projSel, frenteId || '') + '</select></div>' +
    '<div class="fg"><label>Demanda</label><input id="t-titulo" placeholder="Ex.: Levantar as bases de horas extras de julho"></div>' +
    '<div class="fg"><label>Detalhes (opcional)</label><textarea id="t-desc" placeholder="Contexto, links, o que se espera de resultado"></textarea></div>' +
    '<div class="fg"><label>Responsável</label>' +
      '<select id="t-resp" onchange="atualizarAcompanhar()">' + opcoesPessoa(usuario.email) + '</select></div>' +
    // Delegar é diferente de entregar: por padrão a demanda que vai para outra
    // pessoa fica no MEU quadro como acompanhamento, em aguardando terceiros, e
    // volta para verificar quando ela concluir.
    '<div class="fg" id="t-acomp-linha" style="display:none">' +
      '<label style="display:flex;align-items:center;gap:9px;cursor:pointer">' +
      '<input type="checkbox" id="t-acomp" checked> Acompanhar no meu quadro</label>' +
      '<div class="ajuda">Fica em <b>aguardando terceiros</b> para você e volta para ' +
      '<b>verificar / revisar</b> quando a pessoa concluir. Desmarque para entregar de vez.</div></div>' +
    camposPrazos(hoje(), ''),
    'Criar demanda', 'salvarTarefa(null)'));
  atualizarAcompanhar();
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
  const projetoId = pai ? pai.projetoId : $('t-proj').value;
  const frenteId = pai ? (pai.frenteId || null) : (($('t-frente') && $('t-frente').value) || null);
  const descricao = ($('t-desc').value || '').trim();
  const prazo = $('f-prazo').value || null;
  const prazoFinal = $('f-final').value || null;
  const agora = new Date().toISOString();
  const acompanhar = !pai && resp !== usuario.email && !!($('t-acomp') && $('t-acomp').checked);
  const base = { projetoId, frenteId, titulo, descricao, criadoPor:usuario.email,
                 criadoEm:agora, atualizadoEm:agora, ultimaMsgEm:null, lidoPor:{} };
  try{
    if(acompanhar){
      // Delegar com acompanhamento: nasce o par. A minha fica travada em
      // aguardando terceiros; a dela é o pedido, e concluir devolve a minha
      // para verificar / revisar (o mesmo caminho do "Preciso de alguém").
      const meuId = await criarDoc(COL_TAR, Object.assign({}, base, {
        responsavel:usuario.email, status:'aguardando', tipo:'tarefa', paiId:null, solicitante:null,
        prazo: prazoFinal || prazo, prazoFinal
      }));
      const delaId = await criarDoc(COL_TAR, Object.assign({}, base, {
        responsavel:resp, status:'a_fazer', tipo:'solicitacao', paiId:meuId, solicitante:usuario.email,
        prazo, prazoFinal
      }));
      fecharModal();
      await postarMensagem(meuId, 'Delegada a ' + nomeDe(resp) +
        (prazoFinal ? ' com prazo final ' + dataBR(prazoFinal) : '') + '. Fica aguardando a resposta.', 'sistema');
      if(descricao) await postarMensagem(delaId, descricao, 'msg');
      await notificar([resp], 'solicitacao', titulo + (prazoFinal ? ' (até ' + dataBR(prazoFinal) + ')' : ''),
        { _id:delaId, titulo, projetoId });
      toast('Delegada a ' + primeiroNome(resp) + '. Fica no seu quadro em aguardando terceiros.', 'ok');
      abrirTarefa(meuId);
      return;
    }
    const id = await criarDoc(COL_TAR, Object.assign({}, base, {
      responsavel:resp, prazo, prazoFinal,
      status:'a_fazer', tipo: pai ? 'subtarefa' : 'tarefa',
      paiId: paiId || null, solicitante:null
    }));
    fecharModal();
    if(resp !== usuario.email)
      await notificar([resp], 'atribuicao', titulo, { _id:id, titulo, projetoId });
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
      projetoId:pai.projetoId, frenteId:pai.frenteId || null, titulo:resumo, descricao:texto,
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

// Passa a acompanhar uma tarefa que já está com outra pessoa: nasce a minha
// em aguardando terceiros e a dela vira o pedido ligado a ela. Serve para as
// demandas delegadas antes de existir a caixa "acompanhar no meu quadro".
async function acompanharTarefa(id){
  const t = tarefaDe(id);
  if(!t || t.paiId || t.tipo === 'solicitacao') return;
  const agora = new Date().toISOString();
  try{
    const meuId = await criarDoc(COL_TAR, {
      projetoId:t.projetoId, frenteId:t.frenteId || null, titulo:t.titulo, descricao:t.descricao || '',
      responsavel:usuario.email, status:'aguardando', tipo:'tarefa', paiId:null, solicitante:null,
      prazo:t.prazoFinal || hoje(), prazoFinal:t.prazoFinal || null,
      criadoPor:usuario.email, criadoEm:agora, atualizadoEm:agora, ultimaMsgEm:null, lidoPor:{}
    });
    await atualizarTarefa(id, { paiId:meuId, tipo:'solicitacao', solicitante:usuario.email, atualizadoEm:agora });
    await postarMensagem(meuId, 'Acompanhando a demanda com ' + nomeDe(t.responsavel) + '.', 'sistema');
    await postarMensagem(id, usuario.nome + ' passou a acompanhar esta demanda: ao concluir, ela volta para ele conferir.', 'sistema');
    toast('Agora está no seu quadro, em aguardando terceiros.', 'ok');
    abrirTarefa(meuId);
  }catch(e){ toast('Erro: ' + (e && e.code || e), 'erro'); }
}

// ---------- Reabrir o pedido e devolver ao terceiro ----------
// Quando a resposta veio incompleta: comento o que ainda falta e o pedido
// volta para NÃO INICIADO na agenda da pessoa (para hoje), enquanto a minha
// tarefa volta para AGUARDANDO TERCEIROS.
function modalReabrirPedido(id){
  const t = tarefaDe(id);
  if(!t) return;
  abrirModal(moldura('Devolver para ' + nomeDe(t.responsavel),
    '<div class="banner banner--info" style="margin-bottom:var(--space-4)"><i class="ti ti-rotate"></i>' +
      '<div>O pedido volta para <b>não iniciado</b> na agenda de ' + esc(primeiroNome(t.responsavel)) +
      ' (para hoje) e a sua tarefa volta para <b>aguardando terceiros</b>.</div></div>' +
    '<div class="fg"><label>O que ainda falta</label><textarea id="rb-texto" ' +
      'placeholder="Ex.: Faltou o parecer sobre a cláusula 7, que era o principal"></textarea></div>' +
    '<div class="fg"><label>Novo prazo final (opcional)</label>' +
      '<input type="date" id="rb-final" value="' + esc(t.prazoFinal || '') + '"></div>',
    'Devolver', 'salvarReabertura(\'' + id + '\')'));
}
async function salvarReabertura(id){
  const t = tarefaDe(id);
  const texto = ($('rb-texto').value || '').trim();
  const final = $('rb-final').value || null;
  if(!t) return;
  if(!texto){ toast('Escreva o que ainda falta.', 'erro'); return; }
  try{
    await postarMensagem(id, texto, 'msg');
    await atualizarTarefa(id, { status:'a_fazer', concluidaEm:null, prazo:hoje(),
                                prazoFinal:final, atualizadoEm:new Date().toISOString() });
    await postarMensagem(id, usuario.nome + ' devolveu o pedido: ainda falta algo.', 'sistema');
    await travarPai(t, 'Devolvido a ' + nomeDe(t.responsavel) + ': ' + texto);
    await notificar([t.responsavel], 'solicitacao', texto, t);
    fecharModal();
    toast('Devolvido para ' + primeiroNome(t.responsavel) + '.', 'ok');
  }catch(e){ toast('Erro ao devolver: ' + (e && e.code || e), 'erro'); }
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
    if(t.paiId){
      await devolverAoPai(t, usuario.nome + ' respondeu ao pedido "' + t.titulo + '": ' + texto);
    }else{
      await notificar([t.solicitante], 'resposta', texto, t);
    }
    fecharModal();
    toast('Respondido. A ação voltou para ' + primeiroNome(t.solicitante) + '.', 'ok');
  }catch(e){ toast('Erro ao responder: ' + (e && e.code || e), 'erro'); }
}

// ---------- Anexo por link / marcar pessoas ----------
function modalLink(){
  const t = tarefaDe(tarefaAberta);
  const pasta = t ? pastaDoProjeto(t.projetoId) : '';
  abrirModal(moldura('Anexar link',
    (pasta
      ? '<div class="banner banner--info" style="margin-bottom:var(--space-4)"><i class="ti ti-brand-google-drive"></i>' +
        '<div>Suba o arquivo na pasta do projeto, copie o link dele e cole abaixo.<br>' +
        '<a href="' + esc(pasta) + '" target="_blank" rel="noopener"><b>Abrir a pasta deste projeto no Drive</b></a></div></div>'
      : '') +
    '<div class="fg"><label>Link do arquivo ou da pasta</label>' +
      '<input id="l-url" placeholder="https://drive.google.com/..."></div>' +
    '<div class="fg"><label>Como chamar este link</label>' +
      '<input id="l-nome" placeholder="Ex.: Contrato assinado — v3"></div>',
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
// VERSÃO NO AR
// ============================================================
// O GitHub Pages guarda os arquivos por 10 minutos, então a aba que já está
// aberta continua rodando a versão antiga depois de uma publicação — e o
// sintoma é "mexeram no sistema e não mudou nada". Em vez de depender de
// alguém lembrar de recarregar, o app compara de tempos em tempos a data do
// próprio projetos.js com a que ele carregou e avisa quando muda.
let versaoCarregada = '';
async function checarVersao(){
  try{
    const r = await fetch('projetos.js', { method:'HEAD', cache:'no-store' });
    const v = r.headers.get('last-modified') || r.headers.get('etag') || '';
    if(!v) return;
    if(!versaoCarregada){ versaoCarregada = v; return; }
    if(v !== versaoCarregada) avisarVersaoNova();
  }catch(e){ /* sem rede: tenta de novo no próximo ciclo */ }
}
function versaoTexto(){
  if(!versaoCarregada) return '';
  const d = new Date(versaoCarregada);
  return isNaN(d) ? '' : 'versão de ' + pad(d.getDate()) + '/' + pad(d.getMonth()+1) + ' ' +
    pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function avisarVersaoNova(){
  if($('aviso-versao')) return;
  const el = document.createElement('div');
  el.id = 'aviso-versao';
  el.className = 'aviso-versao';
  el.innerHTML = '<i class="ti ti-refresh"></i><span>Saiu uma versão nova do sistema.</span>' +
    '<button class="btn" onclick="location.reload()">Recarregar agora</button>' +
    '<button class="icon-btn" title="Depois" onclick="this.parentNode.remove()"><i class="ti ti-x"></i></button>';
  document.body.appendChild(el);
}

// ============================================================
// PARTIDA
// ============================================================
if(window._firebaseReady) iniciar();
else window.addEventListener('firebaseReady', iniciar);
