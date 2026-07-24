
// ============================================================
// STATUS DE COLABORADORES — regras de beneficios
// ============================================================
const STATUS_LIST = [
  {v:'Trabalhando',    label:'Trabalhando',        cor:'#065F46', bg:'#D1FAE5'},
  {v:'Ferias',        label:'Férias',              cor:'#1D4ED8', bg:'#DBEAFE'},
  {v:'Ferias Coletiva',label:'Férias Coletiva',    cor:'#1D4ED8', bg:'#DBEAFE'},
  {v:'Afastado',      label:'Afastado',            cor:'#92400E', bg:'#FEF3C7'},
  {v:'Afastado Definitivo',label:'Afastado Definitivo',cor:'#9F1239', bg:'#FFE4E6'},
  {v:'Auxilio Doenca',label:'Auxílio Doença',      cor:'#92400E', bg:'#FEF3C7'},
  {v:'Acidente Trabalho',label:'Acidente Trabalho',cor:'#92400E', bg:'#FEF3C7'},
  {v:'Lic. Maternidade',label:'Lic. Maternidade',  cor:'#6D28D9', bg:'#EDE9FE'},
  {v:'Lic. Paternidade',label:'Lic. Paternidade',  cor:'#6D28D9', bg:'#EDE9FE'},
  {v:'Auxilio Reclusao',label:'Auxílio Reclusão',  cor:'#7F1D1D', bg:'#FEE2E2'},
  {v:'Demitido',      label:'Demitido',            cor:'#374151', bg:'#F3F4F6'},
  {v:'N/A',           label:'N/A',                 cor:'#6B7280', bg:'#F9FAFB'},
];

// Grupos de status para regras de beneficios
const STATUS_RECEBE_TUDO    = ['Trabalhando','Ferias','Ferias Coletiva'];
const STATUS_SO_CESTA       = ['Afastado','Afastado Definitivo','Auxilio Doenca','Acidente Trabalho',
                               'Lic. Maternidade','Lic. Paternidade','Auxilio Reclusao'];
const STATUS_NAO_RECEBE     = ['Demitido','N/A'];

function getStatusInfo(v){
  return STATUS_LIST.find(s=>s.v===v) || {v,label:v,cor:'#6B7280',bg:'#F9FAFB'};
}

// Normaliza status legados para os valores canônicos
function normalizarStatus(s){
  const low=(s||'').trim().toLowerCase();
  if(low==='ativo') return 'Trabalhando';
  if(low==='inativo') return 'Afastado';
  return (s||'').trim();
}

// Status sem acento/caixa, para comparacoes tolerantes a variacoes de escrita.
function _statusKey(s){ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().trim(); }
// Classifica o status em um grupo de regra de beneficio, tolerante a variantes
// (ex.: "Acidente de Trabalho" vs "Acidente Trabalho", com/sem acento).
function statusGrupo(s){
  const k=_statusKey(s);
  if(!k) return 'trabalhando';
  if(k.includes('DEMIT') || k==='N/A' || k==='NA') return 'nao_recebe';
  if(k.includes('FERIAS')) return 'ferias';
  if(k.includes('AFAST')||k.includes('DOENC')||k.includes('ACIDENT')||k.includes('MATERN')
     ||k.includes('PATERN')||k.includes('RECLUS')||k.includes('LICEN')||k.includes('INSS')||k.includes('SUSPEN'))
    return 'so_cesta';
  return 'trabalhando';
}


// ============================================================
// DADOS & ESTADO GLOBAL
// ============================================================
let CESTA_PADRAO = 185;   // valor padrao da Cesta (config)
let PREMIO_VAL = 226;     // valor do Premio Assiduidade (config)
let VR_PADRAO = 0;        // valor padrao de referencia do VR/dia (config)
let CAFE_PADRAO = 0;      // valor padrao de referencia do Cafe/dia (config)
let VT_LINHAS = [
  {cod:"",nome:"Selecione a linha",tipo:""},
  {cod:"40115",nome:"40115 - TOP - TREM/METRO - INTERMUNICIPAL - CARTAO TOP",tipo:"TOP"},
  {cod:"42468",nome:"42468 - OSASCO - MUNICIPAL - URUBUPUNGA - BEM",tipo:"PEC"},
  {cod:"50132",nome:"50132 - CARAPICUIBA - MUNICIPAL - AETUR - PEC",tipo:"PEC"},
  {cod:"50128",nome:"50128 - BARUERI - MUNICIPAL - BENFACIL",tipo:"PEC"},
  {cod:"07001",nome:"07001 - SAO PAULO - SPTRANS - BILHETE UNICO - ONIBUS",tipo:"PEC"},
  {cod:"07201",nome:"07201 - SAO PAULO - SPTRANS - BILHETE UNICO - INTEGRACAO",tipo:"PEC"},
  {cod:"07203",nome:"07203 - SAO PAULO - SPTRANS - BILHETE UNICO - TREM",tipo:"PEC"},
  {cod:"40114",nome:"40114 - SAO PAULO - INTERMUNICIPAL - CARTAO TOP",tipo:"TOP"},
  {cod:"50140",nome:"50140 - ITAPEVI - MUNICIPAL - BENFACIL",tipo:"PEC"},
  {cod:"50136",nome:"50136 - FRANCISCO MOURATO - MUNICIPAL - MORATENSE",tipo:"PEC"},
  {cod:"51200",nome:"51200 - SAO PAULO - MUNICIPAL - CARTAO TOP - TREM",tipo:"TOP"},
];

const EVENTOS_MAP = {"1":"Salario Normal","1600":"Pro-Labore","1952":"Periculosidade","301":"Horas Extras 60%","257":"Horas Extras 50%","259":"Horas Extras 100%","391":"H.Extra Noturno 60%","261":"H.Extra Noturno 50%","265":"DSR H.Extras","1950":"Adicional Noturno","1968":"DSR Adic.Noturno","264":"H.Extras 100% Not.","317":"Dif. Hora Extra","14":"Atestado 15 dias","13":"Lic. Paternidade","9":"Acid. Trabalho","5":"Ferias Diurnas","551":"Media H.Ext. Ferias","553":"Adic.Not. Ferias","555":"Periculosidade Ferias","558":"1/3 Ferias","600":"Abono Pecuniario","609":"1/3 Abono Pec.","1701":"Estouro Mes","2151":"Estouro Mes Ant.","389":"Reembolso DSR","1753":"Dev. INSS","390":"Reembolso Falta","380":"Bolsa Auxilio","2500":"FGTS","2505":"FGTS 13o","2000":"INSS","2001":"INSS Diretor","2004":"IRRF","2006":"IRRF Adto","3":"Faltas Integral","4":"Faltas DSR","2457":"Falta Parcial","343":"Plano Saude","2453":"VT Desconto","324":"Copart. Saude","680":"Emprestimo 1","681":"Emprestimo 2","682":"Emprestimo 3","683":"Emprestimo 4","684":"Emprestimo 5","685":"Emprestimo 6","2014":"IRRF Ferias","2002":"INSS Ferias","2101":"Desc. Adto Ferias","341":"Gremio","2050":"Sind. Mensalidade","2055":"Taxa Assistencial","2250":"Pensao Judicial","950":"Aviso Previo Ind.","650":"Ferias Vencidas Resc.","651":"Ferias Prop. Resc.","850":"13o Prop. Resc.","900":"13o Inden. Resc.","1400":"Ferias Inden. Resc.","1550":"Saldo Salario","347":"Vale"};

let colaboradores = [];
let lancamento = {};

// Estado persistente do lancamento mensal: competencia e dias uteis padrao.
// Antes era lido do campo de tela (id=lan-du/lan-comp), que so existe na tela
// de Lancamento — na Exportacao caia no default 22 e os valores divergiam.
// Agora vive em estado + localStorage, compartilhado por todas as telas.
let lanComp = '';
let lanDU = 22;
let lanStep = 1;        // passo atual do fichario de Lancamento (1..4)
let lanStep4Ben = 'vt'; // beneficio em conferencia no passo 4
function loadLanCtx(){
  try{
    lanComp = localStorage.getItem('rhudi_lanComp') || '';
    const d = parseInt(localStorage.getItem('rhudi_lanDU'), 10);
    if(Number.isFinite(d) && d>0) lanDU = d;
  }catch(e){}
}
function setLanComp(v){ lanComp=String(v==null?'':v).trim(); try{localStorage.setItem('rhudi_lanComp',lanComp);}catch(e){} }
function setLanDU(v){ const n=fnum(v); lanDU = n>0?n:22; try{localStorage.setItem('rhudi_lanDU',String(lanDU));}catch(e){} }

// Bases de colaboradores salvas por competencia (log versionado) e a base
// atualmente IMPORTADA para a apuracao (congelada). A apuracao de beneficios
// trabalha sobre baseApuracao, nao sobre a base ao vivo (colaboradores).
let basesSalvasList = [];   // [{_id, competencia, salvoEm, salvoPor, totalColaboradores, colaboradores:[]}]
let um989List = [];         // colaboradores da UM989 (só controle de férias)
let um989Ficha = null;      // id do colaborador aberto na ficha (ou null = lista)
let baseApuracao = null;    // base importada para a apuracao
// Fonte da apuracao: a base importada quando houver, senao a base ao vivo.
// Aplica o escopo do papel (esconde empresas fora do papel) tambem na base
// congelada — a base ao vivo ja e filtrada em aplicarEscopoColaboradores().
function colsApuracao(){
  const arr = baseApuracao && Array.isArray(baseApuracao.colaboradores) ? baseApuracao.colaboradores : colaboradores;
  return escopoUsuario()==='all' ? arr : arr.filter(c=>empresaPermitida(c.mat));
}
let currentModule = 'base';
let currentPage = '';
let editColabId = null;
let seniorPendente = [];
let folhaData = null;
let cargaPendente = [];
let premioData = null;
let folhaCompetencia = '';
let premioCompetencia = '';
let eventosCustom = {};
let deParaPendente = null;

// ============================================================
// CONTROLE DE ACESSO (papéis por empresa)
// ============================================================
const PAPEIS = {
  master:      {label:'Master',      escopo:'all', gerencia:true},
  corporativo: {label:'Corporativo', escopo:'all'},
  carapicuiba: {label:'Carapicuíba', empresas:['1000','1001','1002','1003','1004','1005','1006','1007','1008','1009','1010','1011','1012']},
  guaruja:     {label:'Guarujá',     empresas:['2001','2002','2004','2005']},
  saocarlos:   {label:'São Carlos',  empresas:['3000','3001','3002','3003']},
  resende:     {label:'Resende',     empresas:['4000']},
  um989:       {label:'UM989 (só férias UM989)', escopo:'um989'},
};
// E-mail(s) que são sempre Master (bootstrap inicial do sistema)
const MASTER_BOOTSTRAP = ['alexandre.magalhaes@udiaco.com.br'];
let usuarioAtual = null; // {email, nome, papel}

function escopoUsuario(){
  const pi = usuarioAtual && PAPEIS[usuarioAtual.papel];
  if(!pi) return [];
  return pi.escopo==='all' ? 'all' : (pi.empresas||[]);
}
function empresaPermitida(mat){
  const e=escopoUsuario();
  return e==='all' ? true : e.includes(String(mat||'').substring(0,4));
}
function podeGerenciarUsuarios(){ return !!(usuarioAtual && PAPEIS[usuarioAtual.papel]?.gerencia); }
function aplicarEscopoColaboradores(){
  if(escopoUsuario()==='all') return;
  colaboradores = colaboradores.filter(c=>empresaPermitida(c.mat));
}

// Carrega o papel do usuário logado (Firestore 'usuarios', doc = e-mail)
async function carregarUsuarioAtual(email){
  const mail=(email||'').toLowerCase().trim();
  let d=null;
  try{ const snap=await window._getDoc(window._doc('usuarios',mail)); if(snap.exists()) d=snap.data(); }catch(e){}
  if(!d && MASTER_BOOTSTRAP.includes(mail)){
    d={email:mail,nome:mail,papel:'master',ativo:true};
    try{ await window._setDoc(window._doc('usuarios',mail),d); }catch(e){}
  }
  if(!d || d.ativo===false || !PAPEIS[d.papel]){ usuarioAtual=null; return false; }
  usuarioAtual={email:mail,nome:d.nome||mail,papel:d.papel};
  return true;
}



// ============================================================
// UTILS & CONSTANTES
// ============================================================
const NL = String.fromCharCode(10);
const SEP = ';';

const brl = v => (parseFloat(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const fnum = v => parseFloat(v)||0;
const g = id => document.getElementById(id)?.value?.trim()||'';

function toast(msg, tipo='info', dur=3000){
  const t=document.getElementById('toast');
  if(!t) return;
  t.textContent=msg; t.className='show '+tipo;
  clearTimeout(t._t);
  t._t=setTimeout(()=>t.className='',dur);
}

function setSS(txt,cls){
  const e=document.getElementById('sync-status');
  if(e){e.textContent=txt;e.className='topbar-sync '+(cls||'');}
}

function openModal(id){ document.getElementById(id)?.classList.add('open'); }
function closeModal(id){
  const el=document.getElementById(id);
  if(!el) return;
  if(el.dataset.dynamic==='1'){ el.remove(); }
  else { el.classList.remove('open'); }
}

// Chave de empresa de um colaborador: particulares (filtro PART) NÃO pertencem
// a nenhuma empresa → agrupados como 'PART' ("Particulares"). Os demais usam o
// prefixo de 4 dígitos da matrícula.
function _empresaKey(c){
  if(c && c.filtro==='PART') return 'PART';
  const p=String(c&&c.mat||'').substring(0,4);
  return p.length===4 ? p : '';
}
function _empresaLabel(cod){ return cod==='PART' ? 'Particulares' : cod; }
// Um colaborador combina com a seleção de empresas (array de códigos)?
function _empresaMatch(c, sel){
  return sel.some(e=> e==='PART'
    ? (c.filtro==='PART')
    : (c.filtro!=='PART' && String(c.mat||'').startsWith(e)) );
}
function getEmpresaList(){
  const g2={};
  colaboradores.forEach(c=>{ const k=_empresaKey(c); if(k) g2[k]=(g2[k]||0)+1; });
  return Object.keys(g2).sort((a,b)=> a==='PART'?1:(b==='PART'?-1:a.localeCompare(b))).map(p=>({cod:p,qtd:g2[p]}));
}

function getDeptoList(){
  return [...new Set(colaboradores.map(c=>c.depto||'').filter(d=>d))].sort();
}

// Funcoes distintas (usa funcao, cai para cargo) — para o filtro do Radar de Ferias
function getFuncaoList(){
  return [...new Set(colaboradores.map(c=>funcaoColab(c)).filter(f=>f))].sort();
}

function inferMob(c){
  if(['vt','combustivel','perto','carro_empresa'].includes(c.mobilidade)) return c.mobilidade;
  if([1,2,3,4].some(n=>fnum(c['vt'+n])>0)) return 'vt';
  if(fnum(c.comb)>0) return 'combustivel';
  return 'perto';
}

function mobBadge(c){
  const tr=elegTransporte(c);
  if(!tr.vt && !tr.mob) return '<span class="mob-tag" style="background:var(--surface2);color:var(--text3)">N/A</span>';
  const m=inferMob(c);
  if(m==='perto') return '<span class="mob-tag mob-perto">🏠 Mora perto</span>';
  if(m==='carro_empresa') return '<span class="mob-tag mob-carro">🚘 Carro empresa</span>';
  if(m==='combustivel') return '<span class="mob-tag mob-comb">Comb '+brl(c.comb)+'/mes</span>';
  const vt=[1,2,3,4].filter(n=>fnum(c['vt'+n])>0)
    .map(n=>'<span class="tag-'+(c['tp'+n]||'pec').toLowerCase()+'" title="'+(c['tp'+n]||'')+'">'+(c['cod'+n]||c['tp'+n]||'VT')+'</span>').join(' ');
  return vt||'<span class="mob-tag mob-vt">🚌 VT</span>';
}

function statusBadge(s){
  if(s==='Ativo') return '<span class="badge badge-green">● Ativo</span>';
  if(s==='Inativo') return '<span class="badge badge-gray">● Inativo</span>';
  if(s==='Férias'||s==='Férias') return '<span class="badge badge-blue">🏖️ Férias</span>';
  return '<span class="badge badge-gray">'+(s||'\u2014')+'</span>';
}

function filtroBadge(f){
  const map={
    'OK':'<span class="badge badge-green">✅ OK</span>',
    'DUP':'<span class="badge badge-purple">🔀 DUP</span>',
    'MEI':'<span class="badge badge-yellow">🟡 MEI</span>',
    'SOC':'<span class="badge badge-blue">🔵 SOC</span>',
    'TER':'<span class="badge badge-orange">🟠 Terceiros</span>',
    'DIR':'<span class="badge badge-red">👑 Diretoria</span>',
    'PART':'<span class="badge" style="background:#CCFBF1;color:#0F766E">👤 Particular</span>',
  };
  return map[f]||'<span class="badge badge-gray">'+(f||'OK')+'</span>';
}

function vtOptions(selCod){
  return VT_LINHAS.map(l=>'<option value="'+l.cod+'" data-tipo="'+l.tipo+'" '+(l.cod===selCod?'selected':'')+'>'+l.nome+'</option>').join('');
}

function onVTSelect(n,prefix){
  const sel=document.getElementById(prefix+'-vt-sel'+n); if(!sel) return;
  const l=VT_LINHAS.find(x=>x.cod===sel.value)||{cod:'',nome:'',tipo:''};
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v;};
  set(prefix+'-vt-cod'+n,l.cod);
  set(prefix+'-vt-ben'+n,l.nome);
  set(prefix+'-vt-tp'+n,l.tipo);
}



// ============================================================
// FORMUL\u00C1RIO DE COLABORADOR
// ============================================================

function buildStatusSelect(prefix, c){
  var opts = STATUS_LIST.map(function(s){
    var sel = (c && c.status === s.v) ? ' selected' : '';
    return '<option value="' + s.v + '"' + sel + '>' + s.label + '</option>';
  }).join('');
  return '<select id="' + prefix + '-status">' + opts + '</select>';
}

function formColabHTML(prefix, c){
  const mob=c?inferMob(c):'perto';
  const fil=c?.filtro||'OK';
  return `
    <div class="card">
      <div class="card-title">Dados Pessoais</div>
      <div class="form-grid">
        <div class="fg"><label>Matr\u00EDcula</label><input type="text" id="${prefix}-mat" value="${c?.mat||''}" oninput="verificarDuplic('${prefix}')"></div>
        <div class="fg span2"><label>Nome Completo *</label><input type="text" id="${prefix}-nome" value="${c?.nome||''}" oninput="verificarDuplic('${prefix}')"></div>
        <div class="fg"><label>CPF</label><input type="text" id="${prefix}-cpf" value="${c?.cpf||''}" oninput="verificarDuplic('${prefix}')"></div>
        <div class="fg"><label>Data de Admiss\u00E3o</label><input type="date" id="${prefix}-admissao" value="${c?.admissao||''}"></div>
        <div class="fg span2"><label>Cargo</label><input type="text" id="${prefix}-cargo" value="${c?.cargo||''}"></div>
        <div class="fg span2"><label>Função <span style="font-weight:400;color:var(--text3);font-size:11px">(controla as férias)</span></label><input type="text" id="${prefix}-funcao" value="${c?.funcao||''}" placeholder="Ex.: Operador de Empilhadeira"></div>
        <div class="fg span2"><label>Departamento</label><input type="text" id="${prefix}-depto" value="${c?.depto||''}"></div>
        <div class="fg"><label>Status</label>
          ${buildStatusSelect(prefix, c)}
        </div>
        <div class="fg"><label>Filtro / Tipo</label>
          <select id="${prefix}-filtro">
            <option value="OK" ${fil==='OK'?'selected':''}>OK \u2014 CLT normal</option>
            <option value="DUP" ${fil==='DUP'?'selected':''}>DUP \u2014 CLT com MEI/S\u00F3cio</option>
            <option value="MEI" ${fil==='MEI'?'selected':''}>MEI \u2014 Contrato MEI</option>
            <option value="SOC" ${fil==='SOC'?'selected':''}>SOC \u2014 S\u00F3cio</option>
            <option value="TER" ${fil==='TER'?'selected':''}>TER \u2014 Terceiros</option>
            <option value="DIR" ${fil==='DIR'?'selected':''}>DIR \u2014 Diretoria</option>
            <option value="PART" ${fil==='PART'?'selected':''}>PART \u2014 Particular (s\u00f3cio)</option>
          </select>
        </div>
        <div class="fg">
          <label>Dias Fixos (travar jornada)</label>
          <input type="number" id="${prefix}-dias-fixos" min="0" max="31"
            value="${c?.diasFixos||''}" placeholder="Opcional - trava os dias deste colab."
            title="Se preenchido, este colaborador sempre usara este numero de dias independente do botao Aplicar a todos">
          <span style="font-size:10px;color:var(--text3);margin-top:2px">Deixe vazio para usar os dias uteis do mes. Preenchido = jornada travada.</span>
        </div>
      </div>
      <div id="${prefix}-duplic-alert"></div>
    </div>
    <div class="card">
      <div class="card-title">Elegibilidade a Benef\u00EDcios</div>
      <p class="text-sm text-muted" style="margin-bottom:10px">Marque apenas os benef\u00EDcios aos quais este colaborador tem direito.</p>
      <div style="display:flex;flex-wrap:wrap;gap:10px">
        ${elegCheckHTML(prefix,c)}
      </div>
    </div>
    <div class="card" id="${prefix}-card-fer" style="display:none">
      <div class="card-title">Controle de Férias</div>
      <p class="text-sm text-muted" style="margin-bottom:10px">Dados compartilhados com o módulo de Controle de Férias — qualquer alteração aqui reflete lá e vice-versa.</p>
      <div class="form-grid">
        <div class="fg"><label>Vencimento (próximo ciclo) — dia/mês</label><input type="text" id="${prefix}-fer-venc" placeholder="DD/MM" maxlength="5" value="${_vencCampoDDMM(c)}"><span style="font-size:10px;color:var(--text3);margin-top:2px">Em branco: calculado da admissão (véspera do aniversário). O ano do próximo vencimento é gerido pelo sistema.</span></div>
        <div class="fg"><label>Mês de agendamento das férias</label>
          <select id="${prefix}-fer-mes">
            <option value="">-- Não agendado --</option>
            ${MESES_FER.map(m=>'<option value="'+m+'" '+(c?.ferMes===m?'selected':'')+'>'+m+'</option>').join('')}
          </select>
        </div>
        <div class="fg"><label>Ano do agendamento</label>
          <select id="${prefix}-fer-ano">
            ${(()=>{const ay=new Date().getFullYear();const ac=anoAgendadoColab(c||{});const cur=(c&&c.ferAno&&+c.ferAno>=ay)?+c.ferAno:(typeof ac==='number'?ac:ay);return [ay,ay+1,ay+2,ay+3].map(a=>'<option value="'+a+'" '+(a===cur?'selected':'')+'>'+a+'</option>').join('');})()}
          </select>
        </div>
        <div class="fg"><label>Saldo de dias a tirar</label><input type="number" id="${prefix}-fer-saldo" min="-90" max="90" value="${c?.ferSaldo!=null?c.ferSaldo:''}" placeholder="30"><span style="font-size:10px;color:var(--text3);margin-top:2px">Pode ser negativo (férias antecipadas).</span></div>
        <div class="fg"><label>Início das férias (período atual)</label><input type="date" id="${prefix}-fer-inicio" value="${c?.ferInicio||''}"></div>
        <div class="fg"><label>Término das férias</label><input type="date" id="${prefix}-fer-fim" value="${c?.ferFim||''}"><span style="font-size:10px;color:var(--text3);margin-top:2px">Define se o colaborador está de férias e reflete nos benefícios da competência. Ao entrar em Férias, também pode ser informado na janela que abre.</span></div>
      </div>
    </div>
    <div class="card" id="${prefix}-card-vr" style="display:none">
      <div class="card-title">Vale Refei\u00E7\u00E3o</div>
      <div class="form-grid"><div class="fg"><label>Valor/dia (R$)</label><input type="number" id="${prefix}-vr" step="0.01" min="0" value="${fnum(c?.vr)||''}"></div></div>
    </div>
    <div class="card" id="${prefix}-card-cafe" style="display:none">
      <div class="card-title">Caf\u00E9 da Manh\u00E3</div>
      <div class="form-grid"><div class="fg"><label>Valor/dia (R$)</label><input type="number" id="${prefix}-cafe" step="0.01" min="0" value="${fnum(c?.cafe)||''}"></div></div>
    </div>
    <div class="card" id="${prefix}-card-cesta" style="display:none">
      <div class="card-title">Cesta B\u00E1sica</div>
      <div class="form-grid"><div class="fg"><label>Valor/m\u00EAs (R$) \u2014 valor fixo, n\u00E3o depende dos dias trabalhados</label><input type="number" id="${prefix}-cesta" step="0.01" min="0" value="${fnum(c?.cesta)||''}" placeholder="185,00"></div></div>
    </div>
    <div class="card" id="${prefix}-card-mob" style="display:none">
      <div class="card-title">Mobilidade / Combust\u00EDvel</div>
      <div class="form-grid" style="margin-bottom:12px">
        <div class="fg span2"><label>Tipo</label>
          <select id="${prefix}-mobilidade" onchange="toggleMob('${prefix}')">
            <option value="combustivel" ${mob==='combustivel'?'selected':''}>Combust\u00EDvel</option>
            <option value="perto" ${mob==='perto'?'selected':''}>Mora perto</option>
            <option value="carro_empresa" ${mob==='carro_empresa'?'selected':''}>Carro da empresa</option>
          </select>
        </div>
      </div>
      <div id="${prefix}-bloco-comb" style="display:${mob==='combustivel'?'block':'none'}">
        <div class="form-grid"><div class="fg"><label>Combust\u00EDvel Mensal (R$)</label><input type="number" id="${prefix}-comb" step="0.01" min="0" value="${fnum(c?.comb)||''}"></div></div>
      </div>
    </div>
    <div class="card" id="${prefix}-card-vt" style="display:none">
      <div class="card-title">Vale Transporte</div>
      <table class="vt-tbl">
        <thead><tr><th>Linha</th><th>Linha de Transporte</th><th>Valor (R$)</th><th>Viagens/dia</th></tr></thead>
        <tbody>${[1,2,3,4].map(n=>`<tr>
          <td style="font-weight:700;color:var(--blue)">L${n}</td>
          <td><select id="${prefix}-vt-sel${n}" onchange="onVTSelect(${n},'${prefix}')" style="width:100%">${vtOptions(c?c['cod'+n]||'':'')}</select>
            <input type="hidden" id="${prefix}-vt-tp${n}" value="${c?c['tp'+n]||'':''}">
            <input type="hidden" id="${prefix}-vt-cod${n}" value="${c?c['cod'+n]||'':''}">
            <input type="hidden" id="${prefix}-vt-ben${n}" value="${c?c['ben'+n]||'':''}">
          </td>
          <td><input type="number" id="${prefix}-vt${n}" step="0.01" min="0" value="${c?fnum(c['vt'+n])||'':''}" style="width:90px"></td>
          <td><input type="number" id="${prefix}-v${n}" min="0" value="${c?fnum(c['v'+n])||'':''}" style="width:60px"></td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;
}

// Deriva o estado dos toggles de transporte (mutuamente exclusivos) a partir
// do colaborador, com retrocompatibilidade para dados antigos (so eleg.mobilidade).
function elegTransporte(c){
  const eleg=c?.elegibilidade||{};
  const tipo=c?inferMob(c):'perto';
  if(eleg.vt!==undefined){ // dados novos: flags explicitas
    let vt=!!eleg.vt, mob=(eleg.mobilidade===true);
    if(vt) mob=false;
    return {vt,mob};
  }
  // dados antigos / sem dados: infere pelo tipo e pelos valores
  const temComb=fnum(c?.comb)>0;
  const temVT=[1,2,3,4].some(n=>fnum(c?.['vt'+n])>0);
  const temTransporte = (eleg.mobilidade!==undefined) ? (eleg.mobilidade===true) : (temComb||temVT);
  let vt = temTransporte && tipo==='vt';
  let mob = temTransporte && ['combustivel','perto','carro_empresa'].includes(tipo);
  if(vt) mob=false; // VT e Mobilidade/Combustivel nao coexistem
  return {vt,mob};
}

function elegItemHTML(prefix,item){
  return `
    <label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1.5px solid ${item.checked?'var(--blue)':'var(--border)'};border-radius:var(--radius-sm);cursor:pointer;background:${item.checked?'var(--blue-light)':'var(--surface2)'};transition:all .15s" onclick="toggleEleg(this)">
      <input type="checkbox" name="${prefix}-eleg-${item.id}" id="${prefix}-eleg-${item.id}" ${item.checked?'checked':''}
        onchange="onElegChange('${prefix}','${item.id}',this.checked)" style="accent-color:var(--blue);width:15px;height:15px">
      <span style="font-size:13px;font-weight:500">${item.label}</span>
    </label>`;
}

function elegGrupoHTML(prefix,titulo,items){
  return `<div style="flex:1;min-width:190px">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:8px;padding-bottom:4px;border-bottom:1.5px solid var(--border)">${titulo}</div>
    <div style="display:flex;flex-direction:column;gap:8px">${items.map(i=>elegItemHTML(prefix,i)).join('')}</div>
  </div>`;
}

function elegCheckHTML(prefix, c){
  const eleg=c?.elegibilidade||{};
  const tr=elegTransporte(c);
  const folhaCLT= {id:'folhaCLT', label:'Folha CLT (Senior)',        checked:eleg.folhaCLT!==undefined?eleg.folhaCLT:(eleg.folha!==false)};
  const folhaMEI= {id:'folhaMEI', label:'Folha MEI (extra-sistema)', checked:eleg.folhaMEI!==undefined?eleg.folhaMEI:false};
  const ferias= {id:'ferias',label:'Férias',              checked:eleg.ferias!==undefined?eleg.ferias:true};
  const premio= {id:'premio',label:'Prêmio Assiduidade',  checked:eleg.premio!==undefined?eleg.premio:true};
  const vr    = {id:'vr',     label:'Vale Refeição',       checked:eleg.vr!==undefined?eleg.vr:fnum(c?.vr)>0};
  const cafe  = {id:'cafe',   label:'Café da Manhã',       checked:eleg.cafe!==undefined?eleg.cafe:fnum(c?.cafe)>0};
  const mob   = {id:'mobilidade',label:'Mobilidade / Combustível', checked:tr.mob};
  const vt    = {id:'vt',     label:'Vale Transporte',     checked:tr.vt};
  const cesta = {id:'cesta',  label:'Cesta Básica',        checked:eleg.cesta!==undefined?eleg.cesta:true};
  return `<div style="display:flex;flex-wrap:wrap;gap:24px;width:100%">
    ${elegGrupoHTML(prefix,'Folha',[folhaCLT,folhaMEI,ferias])}
    ${elegGrupoHTML(prefix,'Prêmio',[premio])}
    ${elegGrupoHTML(prefix,'Benefícios',[vr,cafe,mob,vt,cesta])}
  </div>`;
}

function toggleEleg(label){
  const cb=label.querySelector('input[type=checkbox]');
  if(!cb) return;
  label.style.borderColor=cb.checked?'var(--blue)':'var(--border)';
  label.style.background=cb.checked?'var(--blue-light)':'var(--surface2)';
}

// Marca/desmarca um checkbox de elegibilidade e atualiza o estilo do pill
function setElegCheckbox(prefix,id,val){
  const cb=document.getElementById(prefix+'-eleg-'+id);
  if(!cb) return;
  cb.checked=val;
  const lbl=cb.closest('label'); if(lbl) toggleEleg(lbl);
}

function onElegChange(prefix, tipo, checked){
  const show=(card,vis)=>{const el=document.getElementById(prefix+'-card-'+card); if(el) el.style.display=vis?'block':'none';};
  if(tipo==='vr')    show('vr',checked);
  if(tipo==='cafe')  show('cafe',checked);
  if(tipo==='cesta') show('cesta',checked);
  if(tipo==='ferias')show('fer',checked);
  if(tipo==='mobilidade'){
    if(checked){ setElegCheckbox(prefix,'vt',false); show('vt',false); } // exclusivo com VT
    show('mob',checked);
    if(checked) toggleMob(prefix);
  }
  if(tipo==='vt'){
    if(checked){ setElegCheckbox(prefix,'mobilidade',false); show('mob',false); } // exclusivo com Mobilidade
    show('vt',checked);
  }
}

// Atualiza o ano calculado de agendamento conforme o mes escolhido
function atualizarAnoFerias(prefix){
  const mes=document.getElementById(prefix+'-fer-mes')?.value||'';
  const adm=document.getElementById(prefix+'-admissao')?.value||'';
  const lbl=document.getElementById(prefix+'-fer-ano-label');
  if(lbl) lbl.textContent=mes?anoAgendadoColab({ferMes:mes,admissao:adm}):'—';
}

function toggleMob(prefix){
  const v=document.getElementById(prefix+'-mobilidade')?.value||'combustivel';
  const bc=document.getElementById(prefix+'-bloco-comb');
  if(bc) bc.style.display=v==='combustivel'?'block':'none';
}

function initFormDisplay(prefix){
  ['vr','cafe','cesta','mobilidade','vt','ferias'].forEach(t=>onElegChange(prefix,t,document.getElementById(prefix+'-eleg-'+t)?.checked||false));
}

function getColabFromForm(prefix){
  const mobSel=document.getElementById(prefix+'-mobilidade')?.value||'combustivel';
  const eleg={
    vr:      document.getElementById(prefix+'-eleg-vr')?.checked||false,
    cafe:    document.getElementById(prefix+'-eleg-cafe')?.checked||false,
    cesta:   document.getElementById(prefix+'-eleg-cesta')?.checked!==false,
    mobilidade: document.getElementById(prefix+'-eleg-mobilidade')?.checked||false,
    vt:      document.getElementById(prefix+'-eleg-vt')?.checked||false,
    folhaCLT: document.getElementById(prefix+'-eleg-folhaCLT')?.checked!==false,
    folhaMEI: document.getElementById(prefix+'-eleg-folhaMEI')?.checked||false,
    premio:  document.getElementById(prefix+'-eleg-premio')?.checked!==false,
    ferias:  document.getElementById(prefix+'-eleg-ferias')?.checked!==false,
  };
  eleg.folha = eleg.folhaCLT||eleg.folhaMEI; // compat: "esta na folha" = CLT ou MEI
  if(eleg.vt) eleg.mobilidade=false; // VT e Mobilidade/Combustivel sao exclusivos
  // Tipo de transporte resultante (um unico por colaborador)
  const mob = eleg.vt ? 'vt' : (eleg.mobilidade ? mobSel : 'perto');
  return {
    mat:    document.getElementById(prefix+'-mat')?.value.trim()||'',
    nome:   (document.getElementById(prefix+'-nome')?.value||'').trim().toUpperCase(),
    cpf:    document.getElementById(prefix+'-cpf')?.value.trim()||'',
    admissao: document.getElementById(prefix+'-admissao')?.value||'',
    cargo:  (document.getElementById(prefix+'-cargo')?.value||'').trim().toUpperCase(),
    funcao: (document.getElementById(prefix+'-funcao')?.value||'').trim().toUpperCase(),
    depto:  document.getElementById(prefix+'-depto')?.value.trim()||'',
    status: document.getElementById(prefix+'-status')?.value||'Ativo',
    diasFixos: fnum(document.getElementById(prefix+'-dias-fixos')?.value)||null,
    filtro: document.getElementById(prefix+'-filtro')?.value||'OK',
    ferVenc:  _resolveVencInput(document.getElementById(prefix+'-fer-venc')?.value||'', (prefix==='e'&&editColabId)?(colaboradores.find(x=>x._id===editColabId)?.ferVenc||''):''),
    ferMes:   document.getElementById(prefix+'-fer-mes')?.value||'',
    ferAno:   (()=>{const mm=document.getElementById(prefix+'-fer-mes')?.value||''; return mm?(fnum(document.getElementById(prefix+'-fer-ano')?.value)||''):'';})(),
    ferInicio: document.getElementById(prefix+'-fer-inicio')?.value||'',
    ferFim:    document.getElementById(prefix+'-fer-fim')?.value||'',
    ferSaldo: (()=>{const v=document.getElementById(prefix+'-fer-saldo')?.value; return (v!==''&&v!=null&&v!==undefined)?fnum(v):null;})(),
    mobilidade:mob, elegibilidade:eleg,
    vr:   eleg.vr?fnum(document.getElementById(prefix+'-vr')?.value):0,
    cafe: eleg.cafe?fnum(document.getElementById(prefix+'-cafe')?.value):0,
    cesta: eleg.cesta?fnum(document.getElementById(prefix+'-cesta')?.value):0,
    comb: (eleg.mobilidade&&mob==='combustivel')?fnum(document.getElementById(prefix+'-comb')?.value):0,
    vt1:eleg.vt?fnum(document.getElementById(prefix+'-vt1')?.value):0,
    v1: eleg.vt?fnum(document.getElementById(prefix+'-v1')?.value):0,
    vt2:eleg.vt?fnum(document.getElementById(prefix+'-vt2')?.value):0,
    v2: eleg.vt?fnum(document.getElementById(prefix+'-v2')?.value):0,
    vt3:eleg.vt?fnum(document.getElementById(prefix+'-vt3')?.value):0,
    v3: eleg.vt?fnum(document.getElementById(prefix+'-v3')?.value):0,
    vt4:eleg.vt?fnum(document.getElementById(prefix+'-vt4')?.value):0,
    v4: eleg.vt?fnum(document.getElementById(prefix+'-v4')?.value):0,
    tp1:document.getElementById(prefix+'-vt-tp1')?.value||'',
    cod1:document.getElementById(prefix+'-vt-cod1')?.value||'',
    ben1:document.getElementById(prefix+'-vt-ben1')?.value||'',
    tp2:document.getElementById(prefix+'-vt-tp2')?.value||'',
    cod2:document.getElementById(prefix+'-vt-cod2')?.value||'',
    ben2:document.getElementById(prefix+'-vt-ben2')?.value||'',
    tp3:document.getElementById(prefix+'-vt-tp3')?.value||'',
    cod3:document.getElementById(prefix+'-vt-cod3')?.value||'',
    ben3:document.getElementById(prefix+'-vt-ben3')?.value||'',
    tp4:document.getElementById(prefix+'-vt-tp4')?.value||'',
    cod4:document.getElementById(prefix+'-vt-cod4')?.value||'',
    ben4:document.getElementById(prefix+'-vt-ben4')?.value||'',
  };
}

function verificarDuplic(prefix){
  const mat=document.getElementById(prefix+'-mat')?.value.trim()||'';
  const nome=(document.getElementById(prefix+'-nome')?.value||'').trim().toUpperCase();
  const cpf=(document.getElementById(prefix+'-cpf')?.value||'').trim();
  const alertas=[];
  if(mat){const ex=colaboradores.find(c=>c.mat===mat&&c._id!==editColabId);if(ex)alertas.push('Matr\u00EDcula <strong>'+mat+'</strong> j\u00E1 cadastrada para <strong>'+ex.nome+'</strong>.');}
  if(nome.length>3){const ex=colaboradores.find(c=>c.nome.toUpperCase()===nome&&c._id!==editColabId);if(ex)alertas.push('Nome j\u00E1 existe (Mat: '+ex.mat+')');}
  if(cpf.length>8){const cl=cpf.replace(/[^0-9]/g,'');const ex=colaboradores.find(c=>(c.cpf||'').replace(/[^0-9]/g,'')===cl&&c._id!==editColabId);if(ex)alertas.push('CPF j\u00E1 cadastrado para <strong>'+ex.nome+'</strong>.');}
  const el=document.getElementById(prefix+'-duplic-alert');
  if(!el) return;
  el.innerHTML=alertas.length>0?'<div class="alert alert-warning" style="margin-top:8px">'+alertas.join('<br>')+'</div>':'';
}

async function salvarNovoColab(){
  const c=getColabFromForm('f');
  if(!c.nome){toast('Nome \u00E9 obrigat\u00F3rio','error');return;}
  // Particular sem matr\u00EDcula: usa o CPF como identificador (mat).
  if(c.filtro==='PART' && !c.mat){
    const d=(c.cpf||'').replace(/\D/g,'');
    if(!d){toast('Particular precisa de CPF (usado como identificador).','error');return;}
    c.mat=d;
  }
  if(c.mat&&colaboradores.some(x=>x.mat===c.mat)){if(!confirm('Matr\u00EDcula '+c.mat+' j\u00E1 existe. Continuar?'))return;}
  const id=c.mat||(c.nome.replace(/[^A-Za-z0-9]/g,'_').substr(0,20)+'_'+Date.now());
  c._id=id; c.mobilidade=c.mobilidade||inferMob(c);

  // Sugerir mes de ferias: primeiro verifica vaga deixada por demissao na
  // mesma FUNCAO/depto (sucessao), senao usa o mes mais comum da funcao
  const func=funcaoColab(c);
  if(!c.ferMes && func){
    let mesSugerido=await consultarVagaFerias(func, c.depto);
    if(!mesSugerido) mesSugerido=sugerirMesFeriasNovo(func);
    if(mesSugerido){
      c.ferMes=mesSugerido;
      toast('Mes de ferias sugerido automaticamente (funcao coberta): '+mesSugerido,'success');
    }
  }

  try{await fsSet('colaboradores',id,c);colaboradores.push(c);toast('Colaborador salvo!','success');limparFormColab('f');}
  catch(e){toast('Erro: '+e.message,'error');}
}

function limparFormColab(prefix){
  ['mat','nome','cpf','cargo','funcao','depto','vr','cafe','cesta','comb','vt1','v1','vt2','v2','vt3','v3','vt4','v4','fer-venc','fer-saldo'].forEach(f=>{
    const el=document.getElementById(prefix+'-'+f); if(el) el.value='';
  });
  const fm=document.getElementById(prefix+'-fer-mes'); if(fm) fm.value='';
  const fa=document.getElementById(prefix+'-fer-ano-label'); if(fa) fa.textContent='—';
  const st=document.getElementById(prefix+'-status'); if(st) st.value='Ativo';
  const fi=document.getElementById(prefix+'-filtro'); if(fi) fi.value='OK';
  const mob=document.getElementById(prefix+'-mobilidade'); if(mob) mob.value='combustivel';
  ['vr','cafe','cesta','mobilidade','vt'].forEach(t=>onElegChange(prefix,t,false));
  onElegChange(prefix,'ferias',document.getElementById(prefix+'-eleg-ferias')?.checked||false);
  const fclt=document.getElementById(prefix+'-eleg-folhaCLT');
  if(fclt){fclt.checked=true;toggleEleg(fclt.closest('label'));}
  const fmei=document.getElementById(prefix+'-eleg-folhaMEI');
  if(fmei){fmei.checked=false;toggleEleg(fmei.closest('label'));}
  const dal=document.getElementById(prefix+'-duplic-alert'); if(dal) dal.innerHTML='';
}

function abrirEditar(id){
  admissaoSync=null; // garante que nao confunde com admissao da sincronizacao
  editColabId=id;
  const c=colaboradores.find(x=>x._id===id); if(!c) return;
  const body=document.getElementById('modal-colab-body');
  const title=document.getElementById('modal-colab-title');
  if(!body||!title) return;
  title.textContent='Editar: '+c.nome;
  body.innerHTML=formColabHTML('e',c);
  setTimeout(()=>initFormDisplay('e'),50);
  openModal('modal-colab');
}

// Tela ao entrar em afastamento: marca quais benefícios o colaborador continua
// recebendo enquanto afastado. Retorna array de chaves (['cesta',...]) ou null
// se cancelar. Pré-marca conforme a regra atual (só cesta) ou o afastBen atual.
function abrirAfastExcecaoModal(c){
  return new Promise(resolve=>{
    document.getElementById('modal-afast-exc')?.remove();
    const e=c.elegibilidade||{};
    const mob=inferMob(c);
    const elegVT=(e.vt!==undefined)?e.vt:(e.mobilidade!==false);
    const itens=[
      {k:'cesta', l:'Cesta Básica',             ok:e.cesta!==false},
      {k:'vr',    l:'Vale Refeição',            ok:e.vr!==false && fnum(c.vr)>0},
      {k:'cafe',  l:'Café da Manhã',            ok:e.cafe!==false && fnum(c.cafe)>0},
      {k:'comb',  l:'Combustível (Mobilidade)', ok:e.mobilidade!==false && mob==='combustivel'},
      {k:'vt',    l:'Vale Transporte',          ok:elegVT && mob==='vt'},
      {k:'premio',l:'Prêmio Assiduidade',       ok:e.premio!==false},
    ].filter(x=>x.ok);
    const atual=Array.isArray(c.afastBen)?c.afastBen:['cesta'];
    const checks=itens.length
      ? itens.map(x=>'<label class="ms-opt" style="display:flex;align-items:center;gap:8px;padding:7px 2px;font-size:13px"><input type="checkbox" id="afx-'+x.k+'" '+(atual.includes(x.k)?'checked':'')+'> '+x.l+'</label>').join('')
      : '<span class="text-muted">Sem benefícios elegíveis.</span>';
    const html='<div class="modal-overlay open" id="modal-afast-exc" data-dynamic="1">'
      +'<div class="modal" style="max-width:460px"><div class="modal-title">Benefícios durante o afastamento</div>'
      +'<div class="modal-sub">'+(c.nome||'')+' — marque o que ele <strong>continua recebendo</strong> enquanto afastado. Ao voltar para Trabalhando, isto é desfeito automaticamente.</div>'
      +'<div style="margin:12px 0">'+checks+'</div>'
      +'<div class="modal-footer"><button class="btn btn-ghost" id="afx-cancel">Cancelar</button><button class="btn btn-primary" id="afx-ok">Confirmar</button></div>'
      +'</div></div>';
    document.body.insertAdjacentHTML('beforeend',html);
    const close=v=>{document.getElementById('modal-afast-exc')?.remove();resolve(v);};
    document.getElementById('afx-cancel').onclick=()=>close(null);
    document.getElementById('afx-ok').onclick=()=>close(itens.filter(x=>document.getElementById('afx-'+x.k)?.checked).map(x=>x.k));
  });
}

// Tela ao DEMITIR: marca quais benefícios continuar pagando (aviso prévio /
// acordo) e por quantos meses, a partir de qual competência. Retorna
// {benef:[], meses:N, comp:'MM/AAAA'} ou null (cancelar).
function abrirDemissaoBeneficiosModal(c){
  return new Promise(resolve=>{
    document.getElementById('modal-dem-ben')?.remove();
    const e=c.elegibilidade||{};
    const mob=inferMob(c);
    const elegVT=(e.vt!==undefined)?e.vt:(e.mobilidade!==false);
    const itens=[
      {k:'cesta', l:'Cesta Básica',             ok:e.cesta!==false},
      {k:'vr',    l:'Vale Refeição',            ok:e.vr!==false && fnum(c.vr)>0},
      {k:'cafe',  l:'Café da Manhã',            ok:e.cafe!==false && fnum(c.cafe)>0},
      {k:'comb',  l:'Combustível (Mobilidade)', ok:e.mobilidade!==false && mob==='combustivel'},
      {k:'vt',    l:'Vale Transporte',          ok:elegVT && mob==='vt'},
    ].filter(x=>x.ok);
    const hoje=new Date();
    const compDef=/^\d{2}\/\d{4}$/.test(lanComp)?lanComp:(String(hoje.getMonth()+1).padStart(2,'0')+'/'+hoje.getFullYear());
    const checks=itens.length
      ? itens.map(x=>'<label class="ms-opt" style="display:flex;align-items:center;gap:8px;padding:6px 2px;font-size:13px"><input type="checkbox" id="db-'+x.k+'"> '+x.l+'</label>').join('')
      : '<span class="text-muted">Sem benefícios elegíveis.</span>';
    const html='<div class="modal-overlay open" id="modal-dem-ben" data-dynamic="1">'
      +'<div class="modal" style="max-width:480px"><div class="modal-title">Demissão — manter algum benefício?</div>'
      +'<div class="modal-sub">'+(c.nome||'')+' — marque os benefícios que continuam sendo pagos (aviso prévio / acordo) e por quantos meses. Deixe tudo desmarcado se não paga mais nada.</div>'
      +'<div style="margin:12px 0">'+checks+'</div>'
      +'<div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:6px">'
        +'<div class="fg"><label>Por quantos meses</label><input type="number" id="db-meses" value="1" min="1" max="12" style="width:90px"></div>'
        +'<div class="fg"><label>A partir da competência</label><input type="text" id="db-comp" value="'+compDef+'" placeholder="MM/AAAA" style="width:110px"></div>'
      +'</div>'
      +'<div class="modal-footer"><button class="btn btn-ghost" id="db-cancel">Cancelar</button><button class="btn btn-primary" id="db-ok">Confirmar</button></div>'
      +'</div></div>';
    document.body.insertAdjacentHTML('beforeend',html);
    const close=v=>{document.getElementById('modal-dem-ben')?.remove();resolve(v);};
    document.getElementById('db-cancel').onclick=()=>close(null);
    document.getElementById('db-ok').onclick=()=>{
      const benef=itens.filter(x=>document.getElementById('db-'+x.k)?.checked).map(x=>x.k);
      const meses=Math.max(1,fnum(document.getElementById('db-meses')?.value)||1);
      const comp=(document.getElementById('db-comp')?.value||'').trim();
      close({benef,meses,comp});
    };
  });
}

// Atualiza o "novo saldo" na tela de gozo de férias.
function _fgUpd(saldo){
  const ini=document.getElementById('fg-inicio')?.value||'';
  const fim=document.getElementById('fg-fim')?.value||'';
  const g=(ini&&fim&&fim>=ini)?_diasCorridos(ini,fim):0;
  const c=fnum(document.getElementById('fg-comprados')?.value);
  const fa=fnum(document.getElementById('fg-faltas')?.value);
  const gl=document.getElementById('fg-gozados-lbl'); if(gl) gl.textContent=g;
  const el=document.getElementById('fg-novo'); if(el) el.textContent=(saldo-g-c-fa)+' dias';
}
// Tela ao ENTRAR em Férias: mostra o saldo, pede dias gozados (tirados) e
// comprados (abono), e o mês/ano do gozo. Retorna {gozados,comprados,mes,ano}
// ou null (cancelar). Abate do saldo e gera o log fora daqui.
function abrirFeriasGozoModal(c, saldoAtual){
  return new Promise(resolve=>{
    document.getElementById('modal-fer-gozo')?.remove();
    const h=new Date();
    const iniIso=c.ferInicio||_isoLocal(h);
    const fimIso=c.ferFim||'';
    const html='<div class="modal-overlay open" id="modal-fer-gozo" data-dynamic="1">'
      +'<div class="modal" style="max-width:480px"><div class="modal-title">Férias — '+(c.nome||'')+'</div>'
      +'<div class="modal-sub">Saldo atual: <strong>'+saldoAtual+' dias</strong>. Informe o <strong>período</strong> (início e término); os dias gozados são calculados em dias corridos.</div>'
      +'<div class="form-grid cols2" style="margin-top:10px">'
        +'<div class="fg"><label>Início das férias</label><input type="date" id="fg-inicio" value="'+iniIso+'" oninput="_fgUpd('+saldoAtual+')"></div>'
        +'<div class="fg"><label>Término (volta no dia seguinte)</label><input type="date" id="fg-fim" value="'+fimIso+'" oninput="_fgUpd('+saldoAtual+')"></div>'
        +'<div class="fg"><label>Dias comprados (abono)</label><input type="number" id="fg-comprados" value="'+(fnum(c.ferDiasComprados)||0)+'" min="0" max="30" oninput="_fgUpd('+saldoAtual+')"></div>'
        +'<div class="fg"><label>Dias de faltas (a descontar)</label><input type="number" id="fg-faltas" value="0" min="0" max="60" oninput="_fgUpd('+saldoAtual+')"></div>'
      +'</div>'
      +'<p class="text-sm" style="margin-top:10px">Dias gozados (corridos): <strong id="fg-gozados-lbl">0</strong> &middot; Novo saldo: <strong id="fg-novo">'+saldoAtual+' dias</strong>.</p>'
      +'<div class="modal-footer"><button class="btn btn-ghost" id="fg-cancel">Cancelar</button><button class="btn btn-primary" id="fg-ok">Confirmar</button></div>'
      +'</div></div>';
    document.body.insertAdjacentHTML('beforeend',html);
    setTimeout(()=>_fgUpd(saldoAtual),0);
    const close=v=>{document.getElementById('modal-fer-gozo')?.remove();resolve(v);};
    document.getElementById('fg-cancel').onclick=()=>close(null);
    document.getElementById('fg-ok').onclick=()=>{
      const inicio=document.getElementById('fg-inicio')?.value||'';
      const fim=document.getElementById('fg-fim')?.value||'';
      if(!inicio||!fim){ toast('Informe início e término das férias.','error'); return; }
      if(fim<inicio){ toast('O término não pode ser antes do início.','error'); return; }
      const d=_dataLocal(inicio);
      close({
        inicio, fim,
        gozados:_diasCorridos(inicio,fim),
        comprados:Math.max(0,fnum(document.getElementById('fg-comprados')?.value)),
        faltas:Math.max(0,fnum(document.getElementById('fg-faltas')?.value)),
        mes:d?MESES_FER[d.getMonth()]:MESES_FER[h.getMonth()],
        ano:d?d.getFullYear():h.getFullYear()
      });
    };
  });
}

async function salvarColabModal(){
  if(admissaoSync) return salvarAdmissaoSync(); // modal aberto para admissao da sincronizacao
  if(!editColabId) return;
  const idx=colaboradores.findIndex(x=>x._id===editColabId); if(idx<0) return;
  const dados=getColabFromForm('e');
  dados._id=editColabId;
  dados.mobilidade=dados.mobilidade||inferMob(dados);
  // Particular sem matrícula: usa o CPF como identificador (mat).
  if(dados.filtro==='PART' && !dados.mat){ dados.mat=(dados.cpf||'').replace(/\D/g,''); }

  // Se o colaborador esta sendo marcado como Demitido e tinha mes de ferias agendado,
  // registrar a vaga para sugerir ao substituto da mesma funcao (ponto 4.3)
  const statusAnterior=colaboradores[idx].status;
  if(dados.status==='Demitido' && statusAnterior!=='Demitido' && colaboradores[idx].ferMes){
    registrarVagaFerias(colaboradores[idx]);
  }

  // Ao ENTRAR em Ferias: tela com o saldo atual; informa dias GOZADOS (tirados)
  // e COMPRADOS (abono). Abate ambos do saldo, guarda comprados p/ a mobilidade
  // e registra um LOG de férias (mês/ano/dias).
  const ehFer=s=>s==='Ferias'||s==='Férias';
  if(ehFer(dados.status) && !ehFer(statusAnterior)){
    const saldoAtual=(dados.ferSaldo!=null?dados.ferSaldo:(colaboradores[idx].ferSaldo!=null?colaboradores[idx].ferSaldo:0));
    const r=await abrirFeriasGozoModal(dados, saldoAtual);
    if(r===null) return; // cancelou: não salva
    dados.ferInicio=r.inicio;   // período oficial das férias
    dados.ferFim=r.fim;
    dados.ferMes=dados.ferMes||r.mes;
    dados.ferDiasComprados=r.comprados;
    dados.ferSaldo=saldoAtual - r.gozados - r.comprados - r.faltas;
    const log=Array.isArray(colaboradores[idx].feriasLog)?colaboradores[idx].feriasLog.slice():[];
    log.push({tipo:'entrada', inicio:r.inicio, fim:r.fim, mes:r.mes, ano:r.ano, gozados:r.gozados, comprados:r.comprados, faltas:r.faltas, em:new Date().toISOString()});
    dados.feriasLog=log;
  } else if(!ehFer(dados.status) && ehFer(statusAnterior)){
    // Saiu de férias: zera comprados e limpa o período.
    dados.ferDiasComprados=0;
    dados.ferInicio='';
    dados.ferFim='';
  }

  // Ao ENTRAR em afastamento: abre tela para marcar quais benefícios ele
  // continua recebendo enquanto afastado. Ao SAIR, zera (volta ao normal).
  const ehAfast=s=>statusGrupo(s)==='so_cesta';
  if(ehAfast(dados.status) && !ehAfast(statusAnterior)){
    const sel=await abrirAfastExcecaoModal(dados);
    if(sel===null) return; // cancelou: não salva
    dados.afastBen=sel;
  } else if(!ehAfast(dados.status) && ehAfast(statusAnterior)){
    dados.afastBen=[];
  }

  // Ao DEMITIR: tela para manter benefícios por X meses (aviso prévio/acordo).
  // Ao sair de Demitido (readmissão), limpa.
  const ehDem=s=>_statusKey(s).includes('DEMIT');
  if(ehDem(dados.status) && !ehDem(statusAnterior)){
    const r=await abrirDemissaoBeneficiosModal(dados);
    if(r===null) return; // cancelou: não salva
    dados.demBen=r.benef; dados.demMeses=r.meses; dados.demCompBase=r.comp;
    dados.demitidoEm=r.comp; // log do mês de demissão
  } else if(!ehDem(dados.status) && ehDem(statusAnterior)){
    dados.demBen=[]; dados.demMeses=0; dados.demCompBase='';
  }

  Object.assign(colaboradores[idx],dados);
  const savedId=editColabId;
  try{
    await fsSet('colaboradores',editColabId,colaboradores[idx]);
    // Reflete a edição no snapshot da apuração (Lançamento), se houver
    if(baseApuracao&&Array.isArray(baseApuracao.colaboradores)){
      const cb=baseApuracao.colaboradores.find(x=>x._id===savedId||(x.cpf&&x.cpf===colaboradores[idx].cpf));
      if(cb) Object.assign(cb,dados);
    }
    closeModal('modal-colab');editColabId=null;
    if(currentPage==='base-lista') renderColabList();
    if(currentPage==='ben-lancamento') showPage('ben-lancamento');
    toast('Atualizado!','success');
  }catch(e){toast('Erro: '+e.message,'error');}
}

async function excluirColab(id,nome){
  if(!confirm('Excluir "'+nome+'"?')) return;
  try{
    await fsDel('colaboradores',id);
    colaboradores=colaboradores.filter(c=>c._id!==id);
    renderColabList();toast('Removido.','error');
  }catch(e){toast('Erro: '+e.message,'error');}
}

// ============================================================
// NAVEGA\u00C7\u00C3O & ROTEAMENTO
// ============================================================
const MODULES = {
  base:{pages:[
    {id:'base-lista',icon:'<i class="ti ti-users"></i>',label:'Colaboradores'},
    {id:'base-atualizar',icon:'<i class="ti ti-refresh"></i>',label:'Atualizar Base',action:'abrirAtualizarBase()'},
    {id:'base-versoes',icon:'<i class="ti ti-database"></i>',label:'Históricos'},
    {id:'base-dash',icon:'<i class="ti ti-chart-bar"></i>',label:'Dashboard'},
  ]},
  beneficios:{pages:[
    {id:'ben-lancamento',icon:'<i class="ti ti-clipboard-list"></i>',label:'Lan\u00E7amento Mensal'},
    {id:'ben-historico',icon:'<i class="ti ti-history"></i>',label:'Hist\u00F3rico'},
    {id:'ben-dash',icon:'<i class="ti ti-chart-bar"></i>',label:'Dashboard'},
  ]},
  folha:{pages:[
    {id:'folha-import',icon:'<i class="ti ti-file-import"></i>',label:'Importar Relat\u00F3rio'},
    {id:'folha-view',icon:'<i class="ti ti-report-money"></i>',label:'Visualizar Folha'},
  ]},
  ferias:{pages:[
    {id:'fer-radar',icon:'<i class="ti ti-radar-2"></i>',label:'Radar de F\u00E9rias'},
    {id:'fer-agendadas',icon:'<i class="ti ti-calendar-event"></i>',label:'F\u00E9rias Agendadas'},
    {id:'fer-um989',icon:'<i class="ti ti-users"></i>',label:'F\u00E9rias UM989'},
  ]},
  premio:{pages:[
    {id:'premio-main',icon:'<i class="ti ti-trophy"></i>',label:'Premio Assiduidade'},
    {id:'premio-historico',icon:'<i class="ti ti-history"></i>',label:'Histórico'},
    {id:'premio-dash',icon:'<i class="ti ti-chart-bar"></i>',label:'Dashboard'},
  ]},
  dashboard:{pages:[
    {id:'dash-main',icon:'<i class="ti ti-layout-dashboard"></i>',label:'Dashboard Geral'},
    {id:'teste-senior',icon:'<i class="ti ti-plug"></i>',label:'Teste Senior API'},
  ]},
  config:{pages:[
    {id:'config-main',icon:'<i class="ti ti-settings"></i>',label:'Configurações'},
  ]}
};

// Papel restrito da UM989: só enxerga a aba de Férias UM989.
function ehUM989(){ return !!(usuarioAtual && usuarioAtual.papel==='um989'); }
// Páginas visíveis do módulo conforme o papel do usuário.
function pagesVisiveis(mod){
  return (MODULES[mod]?.pages||[])
    .filter(p=>!p.master||podeGerenciarUsuarios())
    // Férias UM989: só o master e o próprio papel UM989 enxergam.
    .filter(p=> p.id==='fer-um989' ? (podeGerenciarUsuarios()||ehUM989()) : true)
    .filter(p=> ehUM989() ? p.id==='fer-um989' : true);
}
// Esconde os módulos que o papel UM989 não pode ver (mostra só Férias).
function aplicarVisibModulos(){
  const so=ehUM989();
  ['base','beneficios','folha','premio','dashboard'].forEach(m=>{
    const t=document.getElementById('tab-'+m); if(t) t.style.display=so?'none':'';
  });
  // Configurações: engrenagem no cabeçalho, exclusiva do master
  const bc=document.getElementById('btn-config');
  if(bc) bc.style.display = (!so && podeGerenciarUsuarios()) ? '' : 'none';
}
function abrirConfig(){ if(!podeGerenciarUsuarios()) return; switchModule('config'); }

function switchModule(mod){
  currentModule=mod;
  document.querySelectorAll('.mod-tab').forEach(t=>t.classList.remove('active'));
  const tabEl=document.getElementById('tab-'+mod);
  if(tabEl) tabEl.classList.add('active');
  buildSidebar(mod);
  const ps=pagesVisiveis(mod);
  if(ps[0]) showPage(ps[0].id);
}

function buildSidebar(mod){
  const nav=document.getElementById('sidebar-nav');
  if(!nav) return;
  const pages=pagesVisiveis(mod);
  nav.innerHTML=pages.map(p=>{
    const onclick=p.action||('showPage(\''+p.id+'\')');
    const icon=p.icon?'<span class="s-icon">'+p.icon+'</span> ':'';
    return '<button class="sidebar-btn" id="snav-'+p.id+'" onclick="'+onclick+'">'+icon+p.label+'</button>';
  }).join('');
}

function showPage(id){
  currentPage=id;
  document.querySelectorAll('.sidebar-btn').forEach(b=>b.classList.remove('active'));
  const snav=document.getElementById('snav-'+id);
  if(snav) snav.classList.add('active');
  const main=document.getElementById('main-area');
  if(!main) return;
  main.innerHTML=renderPage(id);
  main.classList.add('ds'); // design system em todas as telas
  afterRender(id);
}

function renderPage(id){
  const pages={
    'base-lista':pgBaseLista,'base-sync':pgBaseSync,'base-carga':pgBaseCarga,'base-import':pgBaseImport,'base-defpara':pgBaseDePara,'base-novo':pgBaseNovo,'base-atualizacao':pgBaseAtualizacao,'base-versoes':pgBaseVersoes,'premio-main':pgPremioAssiduidade,
    'ben-lancamento':pgBenLancamento,'ben-importar':pgBenImportar,
    'ben-historico':pgBenHistorico,'ben-config':pgBenConfig,'config-main':pgConfiguracoes,'base-dash':pgBaseDashboard,'ben-dash':pgBenDashboard,
    'folha-import':pgFolhaImport,'folha-view':pgFolhaView,
    'fer-radar':pgFerRadar,'fer-agendadas':pgFeriasAgendadas,'fer-um989':pgFerUM989,'fer-import':pgFerImport,
    'dash-main':pgDashMain,'teste-senior':pgTesteSenior,'usuarios':pgUsuarios,
    'premio-dash':pgPremioDashboard,'premio-historico':pgPremioHistorico,
  };
  if(id==='usuarios' && !podeGerenciarUsuarios()) return '<div class="empty-state"><div class="empty-icon"></div><p>Acesso restrito.</p></div>';
  const fn=pages[id];
  if(fn) return fn();
  return '<div class="empty-state"><div class="empty-icon"></div><p>P\u00E1gina em constru\u00E7\u00E3o</p></div>';
}

function afterRender(id){
  if(id==='base-lista') renderColabList();
  if(id==='base-novo') setTimeout(()=>{initDeptoAutocomplete('f');initFormDisplay('f');},100);
  if(id==='ben-lancamento'){ popularLanFiltros(); lanAutoImportBase().then(imported=>{ if(imported) showPage('ben-lancamento'); else renderLancamento(); }); }
  if(id==='base-versoes') loadBasesSalvas().then(renderBasesSalvas);
  if(id==='ben-historico') renderHistorico();
  if(id==='folha-view') setTimeout(()=>renderFolhaView(), 50);
  if(id==='fer-radar') renderFerRadar();
  if(id==='base-dash') renderBaseDashboard();
  if(id==='ben-dash') renderBenDashboard();
  if(id==='config-main'){
    const s=configSub||'beneficios';
    if(s==='acessos') renderUsuarios();
    else if(s==='um989') loadUM989().then(renderUM989);
    else loadConfig().then(()=>{ const set=(id,v)=>{const e=document.getElementById(id); if(e)e.value=v;}; set('cfg-val-vr',VR_PADRAO); set('cfg-val-cafe',CAFE_PADRAO); set('cfg-val-cesta',CESTA_PADRAO); set('cfg-val-premio',PREMIO_VAL); renderConfigVT(); });
  }
  if(id==='fer-agendadas') renderFeriasAgendadas();
  if(id==='fer-um989') loadUM989().then(renderUM989);
  if(id==='dash-main') renderDashMain();
  if(id==='premio-main') afterRenderPremio();
  if(id==='premio-dash') afterRenderPremioDash();
  if(id==='premio-historico') renderPremioHistorico();
  if(id==='usuarios') renderUsuarios();
  if(id==='teste-senior') {} // sem afterRender especifico
}

// ============================================================
// BASE: LISTA DE COLABORADORES
// ============================================================
function pgBaseLista(){
  const empresas=getEmpresaList();
  const deptos=getDeptoList();
  const statusSet=[...new Set(colaboradores.map(c=>c.status||'').filter(Boolean))].sort();
  const benOpts=[{value:'vr',label:'VR'},{value:'cafe',label:'Café'},{value:'comb',label:'Combustível'},{value:'vt',label:'VT'},{value:'cesta',label:'Cesta Básica'},{value:'sem',label:'Sem benefício'},{value:'comb_vt',label:'Comb+VT (erro?)'},{value:'sem_mob',label:'Sem mobilidade'}];
  return `
   <div class="bl-page ds">
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
      <div>
        <h2 class="page-title">Base de Colaboradores</h2>
        <p class="page-subtitle">Gerencie todos os colaboradores da empresa</p>
      </div>
      <button class="refresh-btn" onclick="abrirAtualizarBase()"><i class="ti ti-refresh"></i> Atualizar Base</button>
    </div>
    <div class="section-label">Indicadores</div>
    <div class="ds-zone">
      <div id="bl-status-resumo"></div>
      <div id="bl-tipo-resumo"></div>
    </div>
    <div class="section-label">Colaboradores</div>
    <div class="filter-bar" style="align-items:flex-end">
      <div class="filter-group" style="flex:1">
        <label> Buscar</label>
        <input type="text" id="bl-q" placeholder="Nome, matrícula ou CPF..." oninput="renderColabList()">
      </div>
      <div class="filter-group"><label> Empresa</label>${msDropdown('emp','Empresa',empresas.map(e=>({value:e.cod,label:_empresaLabel(e.cod)+' ('+e.qtd+')'})))}</div>
      <div class="filter-group"><label> Departamento</label>${msDropdown('dep','Departamento',deptos.map(d=>({value:d,label:d})))}</div>
      <div class="filter-group"><label>Status</label>${msDropdown('status','Status',statusSet.map(x=>({value:x,label:x})))}</div>
      <div class="filter-group"><label>Tipo</label>${msDropdown('tipo','Tipo',[{value:'OK',label:'OK — CLT normal'},{value:'DUP',label:'DUP — CLT com MEI/Sócio'},{value:'MEI',label:'MEI — Contrato MEI'},{value:'SOC',label:'SOC — Sócio'},{value:'TER',label:'TER — Terceiros'},{value:'DIR',label:'DIR — Diretoria'},{value:'PART',label:'PART — Particular'}])}</div>
      <div class="filter-group"><label>Benefício</label>${msDropdown('ben','Benefício',benOpts)}</div>
      <div class="filter-group"><label>Jornada</label>${msDropdown('jornada','Jornada',[{value:'trava',label:'Travada (dias fixos)'},{value:'normal',label:'Dias úteis do mês'}])}</div>
      <button class="btn btn-ghost btn-sm" onclick="exportarBase(filtrarColabs())"><i class="ti ti-file-spreadsheet"></i> Excel</button>
      <button class="btn btn-ghost btn-sm" onclick="limparFiltrosColab()" title="Limpar filtros">Limpar</button>
    </div>
    <div id="bl-count" style="margin:0 0 8px"></div>
    <div class="tbl-wrap bl-scroll">
      <table class="tbl colab-tbl">
        <thead><tr>
          <th>Matr\u00EDcula</th><th>Nome</th><th>CPF</th><th>Admiss\u00E3o</th><th>Departamento</th>
          <th>Status</th><th>Tipo</th><th>Elegibilidade</th><th>VR/dia</th><th>Caf\u00E9/dia</th>
          <th>Transporte</th><th>F\u00E9rias</th><th>A\u00E7\u00F5es</th>
        </tr></thead>
        <tbody id="bl-tbody"></tbody>
      </table>
    </div>
   </div>`;
}

function benMatchColab(c,b){
  switch(b){
    case 'vr': return fnum(c.vr)>0;
    case 'cafe': return fnum(c.cafe)>0;
    case 'comb': return fnum(c.comb)>0;
    case 'vt': return [1,2,3,4].some(n=>fnum(c['vt'+n])>0);
    case 'cesta': return c.elegibilidade?.cesta!==false;
    case 'sem': return fnum(c.vr)===0&&fnum(c.cafe)===0&&fnum(c.comb)===0&&[1,2,3,4].every(n=>fnum(c['vt'+n])===0);
    case 'comb_vt': return fnum(c.comb)>0&&[1,2,3,4].some(n=>fnum(c['vt'+n])>0);
    case 'sem_mob': return ['perto','carro_empresa'].includes(c.mobilidade);
    default: return true;
  }
}

function filtrarColabs(){
  const q=(g('bl-q')||'').toLowerCase();
  const emp=getMs('emp'), dep=getMs('dep'), st=getMs('status'), tipo=getMs('tipo'), ben=getMs('ben'), jor=getMs('jornada');
  let f=colaboradores.filter(c=>
    c.nome.toLowerCase().includes(q)||(c.mat||'').toLowerCase().includes(q)||(c.cpf||'').includes(q));
  if(emp.length) f=f.filter(c=>_empresaMatch(c,emp));
  if(dep.length) f=f.filter(c=>dep.includes(c.depto||''));
  if(st.length)  f=f.filter(c=>st.includes(c.status));
  if(tipo.length) f=f.filter(c=>tipo.includes((c.filtro||'OK').toUpperCase()));
  if(ben.length) f=f.filter(c=>ben.some(b=>benMatchColab(c,b)));
  if(jor.length) f=f.filter(c=>jor.includes(c.diasFixos?'trava':'normal'));
  return f;
}

function limparFiltrosColab(){
  const q=document.getElementById('bl-q'); if(q) q.value='';
  document.querySelectorAll('.ms-emp,.ms-dep,.ms-status,.ms-tipo,.ms-ben,.ms-jornada').forEach(cb=>cb.checked=false);
  renderColabList();
}

// ── Multi-select dropdown (checkboxes) para os filtros da base ───
function msDropdown(key,titulo,options,onChangeFn){
  const cb=onChangeFn||'renderColabList';
  const items=options.map(o=>{
    const v=String(o.value).replace(/"/g,'&quot;');
    return '<label class="ms-opt"><input type="checkbox" class="ms-'+key+'" value="'+v+'" onchange="'+cb+'()">'+o.label+'</label>';
  }).join('');
  return '<div class="ms-wrap">'
    +'<button type="button" id="ms-btn-'+key+'" class="ms-btn" data-titulo="'+titulo+'" data-cb="'+cb+'" onclick="toggleMs(\''+key+'\')">'
      +'<span id="ms-lbl-'+key+'">'+titulo+'</span><span class="ms-caret">&#9662;</span></button>'
    +'<div id="ms-panel-'+key+'" class="ms-panel">'
      +'<div class="ms-head"><span id="ms-hd-'+key+'">'+titulo+'</span>'
        +'<button type="button" class="ms-clear" onclick="clearMs(\''+key+'\')">Limpar</button></div>'
      +(items||'<div class="ms-empty">Sem opções</div>')
    +'</div></div>';
}

function toggleMs(key){
  const alvo=document.getElementById('ms-panel-'+key);
  const abrir=alvo && !alvo.classList.contains('open');
  document.querySelectorAll('.ms-panel.open').forEach(p=>p.classList.remove('open'));
  if(abrir) alvo.classList.add('open');
}

function getMs(key){ return [...document.querySelectorAll('.ms-'+key+':checked')].map(c=>c.value); }

function clearMs(key){
  document.querySelectorAll('.ms-'+key).forEach(cb=>cb.checked=false);
  const btn=document.getElementById('ms-btn-'+key);
  const fn=btn?.dataset.cb||'renderColabList';
  if(typeof window[fn]==='function') window[fn]();
}

// Fecha os paineis de filtro ao clicar fora (vinculado uma unica vez)
function bindMsOutside(){
  if(window._msOutsideBound) return;
  window._msOutsideBound=true;
  document.addEventListener('click',ev=>{
    if(ev.target.closest('.ms-wrap')) return;
    document.querySelectorAll('.ms-panel.open').forEach(p=>p.classList.remove('open'));
  });
}

function updateMsCounts(){
  document.querySelectorAll('[id^="ms-btn-"]').forEach(btn=>{
    const key=btn.id.slice('ms-btn-'.length);
    const base=btn.dataset.titulo||'';
    const n=getMs(key).length;
    const lbl=document.getElementById('ms-lbl-'+key);
    if(lbl) lbl.textContent = n ? base+' ('+n+')' : base;
    btn.classList.toggle('active', n>0);
    const hd=document.getElementById('ms-hd-'+key);
    if(hd) hd.textContent = n ? n+' selecionado'+(n>1?'s':'') : base;
  });
}

function elegBadges(c){
  const eleg=c.elegibilidade||{};
  const tags=[];
  if(eleg.vr!==false&&fnum(c.vr)>0) tags.push('<span class="badge badge-orange" style="font-size:10px">VR</span>');
  if(eleg.cafe!==false&&fnum(c.cafe)>0) tags.push('<span class="badge badge-yellow" style="font-size:10px">Caf\u00E9</span>');
  const tr=elegTransporte(c);
  if(tr.mob&&fnum(c.comb)>0) tags.push('<span class="badge badge-green" style="font-size:10px">Mob.</span>');
  if(tr.vt&&[1,2,3,4].some(n=>fnum(c['vt'+n])>0)) tags.push('<span class="badge badge-blue" style="font-size:10px">VT</span>');
  if(eleg.cesta!==false) tags.push('<span class="badge badge-green" style="font-size:10px">Cesta</span>');
  const fclt=eleg.folhaCLT!==undefined?eleg.folhaCLT:(eleg.folha!==false);
  const fmei=eleg.folhaMEI===true;
  if(fclt) tags.push('<span class="badge badge-purple" style="font-size:10px">Folha CLT</span>');
  if(fmei) tags.push('<span class="badge badge-purple" style="font-size:10px">Folha MEI</span>');
  return tags.length?tags.join(' '):'<span class="badge badge-gray" style="font-size:10px">Nenhum</span>';
}

// Resumo de ferias na lista da base: vencimento + agendamento (mesmos dados do modulo de Ferias)
function ferResumoCelula(c){
  if(c.elegibilidade?.ferias===false) return '<span class="text-muted">N/A</span>';
  const f=getFarol(c);
  const venc=(f.vencStr&&f.vencStr!=='—')?f.vencStr:'—';
  const agend=c.ferMes?agendamentoLabel(c):'—';
  return '<span class="text-muted">Venc:</span> '+venc+'<br><span class="text-muted">Agend:</span> '+agend;
}

// Colaboradores únicos: dedup por CPF (fallback nome), preferindo o registro
// principal (CLT: OK/DUP) sobre os duplicados MEI/Sócio.
function colaboradoresUnicos(){
  const byKey={};
  const ehDup=x=>['MEI','SOC'].includes((x.filtro||'').toUpperCase())?1:0;
  colaboradores.forEach(c=>{
    const cpf=(c.cpf||'').replace(/[^0-9]/g,'');
    const key=cpf||('nome:'+_normNome(c.nome));
    const ex=byKey[key];
    if(!ex || ehDup(c)<ehDup(ex)) byKey[key]=c;
  });
  return Object.values(byKey);
}

// Card branco padrao (mesmo visual do Radar/Ferias Agendadas).
function _resumoCard(n, label, cls, valColor){
  return '<div class="stat-card'+(cls?' '+cls:'')+'">'
    +'<div class="stat-val"'+(valColor?' style="color:'+valColor+'"':'')+'>'+n+'</div>'
    +'<div class="stat-label">'+label+'</div></div>';
}
// Card do design system (chip de icone Tabler + valor + rotulo). Escopo .ds.
// click (opcional): expressao JS chamada ao clicar (filtra a tabela).
function _dsStat(icon, chip, val, label, click){
  const attr=click?(' onclick="'+click+'" style="cursor:pointer" title="Filtrar a lista por '+label+'"'):'';
  return '<div class="stat"'+attr+'><div class="stat__chip chip--'+chip+'"><i class="ti ti-'+icon+'"></i></div>'
    +'<div class="stat__value">'+val+'</div><div class="stat__label">'+label+'</div></div>';
}
function _dsStatAccent(icon, val, label, click){
  const attr=click?(' onclick="'+click+'" style="cursor:pointer" title="'+label+'"'):'';
  return '<div class="stat stat--accent"'+attr+'><div class="stat__chip"><i class="ti ti-'+icon+'"></i></div>'
    +'<div class="stat__value">'+val+'</div><div class="stat__label">'+label+'</div></div>';
}
// ── Helpers de marcacao (design system) usados so na tabela da Base ──
function _iniciais(nome){
  const p=String(nome||'').trim().split(/\s+/).filter(Boolean);
  return (((p[0]||'')[0]||'')+((p.length>1?p[p.length-1]:'')[0]||'')).toUpperCase()||'?';
}
function _dsAvatarVar(status){
  const g=statusGrupo(status);
  return g==='trabalhando'?'success':g==='ferias'?'warning':g==='so_cesta'?'danger':'neutral';
}
function dsPersonCell(c){
  const tip=[c.cargo,c.funcao?('Função: '+c.funcao):''].filter(Boolean).join(' — ').replace(/"/g,'&quot;');
  const trava=c.diasFixos?' <i class="ti ti-lock" title="Jornada travada: '+c.diasFixos+' dias fixos" style="color:var(--accent);font-size:12px"></i>':'';
  return '<div class="person-name"'+(tip?' title="'+tip+'"':'')+'>'
    +'<span class="person__name">'+c.nome+trava+'</span>'
    +(c.cargo?'<span class="person__sub">'+c.cargo+'</span>':'')
    +'</div>';
}
function dsStatusBadge(status){
  const g=statusGrupo(status);
  const v=g==='trabalhando'?'success':g==='ferias'?'warning':g==='so_cesta'?'danger':'neutral';
  return '<span class="badge badge--'+v+'">'+(getStatusInfo(status).label||status||'—')+'</span>';
}
function dsTipoBadge(f){
  const map={OK:['neutral','OK'],DUP:['purple','DUP'],MEI:['purple','MEI'],SOC:['purple','Sócio'],
    TER:['warning','Terceiro'],DIR:['danger','Diretoria'],PART:['accent','Particular']};
  const m=map[(f||'OK').toUpperCase()]||['neutral',f||'OK'];
  return '<span class="badge badge--'+m[0]+'">'+m[1]+'</span>';
}
function dsElegTags(c){
  const eleg=c.elegibilidade||{}; const t=[];
  const add=(cls,txt)=>t.push('<span class="tag tag--'+cls+'">'+txt+'</span>');
  if(eleg.vr!==false&&fnum(c.vr)>0) add('accent','VR');
  if(eleg.cafe!==false&&fnum(c.cafe)>0) add('accent','Café');
  const tr=elegTransporte(c);
  if(tr.mob&&fnum(c.comb)>0) add('accent','Mob.');
  if(tr.vt&&[1,2,3,4].some(n=>fnum(c['vt'+n])>0)) add('accent','VT');
  if(eleg.cesta!==false) add('neutral','Cesta');
  const fclt=eleg.folhaCLT!==undefined?eleg.folhaCLT:(eleg.folha!==false);
  if(fclt) add('neutral','Folha CLT');
  if(eleg.folhaMEI===true) add('neutral','Folha MEI');
  return t.length?t.join(''):'<span class="tag tag--neutral">Nenhum</span>';
}

// Resumo por SITUACAO (pessoas unicas, exceto Particulares).
// Afastados agrupa TODOS os motivos (Afastado, Aux. Doenca, Acidente, etc.).
// Demitidos NAO entram (ficam so no historico). Total de ativos = Trabalhando + Ferias + Afastados.
function renderStatusResumo(){
  const el=document.getElementById('bl-status-resumo'); if(!el) return;
  const unicos=colaboradoresUnicos().filter(c=>(c.filtro||'').toUpperCase()!=='PART');
  const ehNA=c=>{ const k=_statusKey(c.status); return k==='N/A'||k==='NA'; };
  const nTrab=unicos.filter(c=>statusGrupo(c.status)==='trabalhando' && !ehNA(c)).length;
  const nFer =unicos.filter(c=>statusGrupo(c.status)==='ferias').length;
  const nAfa =unicos.filter(c=>statusGrupo(c.status)==='so_cesta').length;
  const nNA  =unicos.filter(ehNA).length;
  const nAtivos=nTrab+nFer+nAfa;
  el.innerHTML='<div class="stat-grid">'
    +_dsStat('user-check','success',nTrab,'Trabalhando',"blFiltroStatus('trabalhando')")
    +_dsStat('umbrella','warning',nFer,'Férias',"blFiltroStatus('ferias')")
    +_dsStat('heartbeat','danger',nAfa,'Afastados',"blFiltroStatus('so_cesta')")
    +_dsStat('circle-minus','neutral',nNA,'N/A',"blFiltroStatus('na')")
    +_dsStatAccent('users',nAtivos,'Total de ativos',"blFiltroStatus('')")
    +'</div>';
}
// Clicar num indicador de situacao aplica o filtro de status na tabela.
function blFiltroStatus(grupo){
  document.querySelectorAll('.ms-status').forEach(cb=>cb.checked=false);
  document.querySelectorAll('.ms-tipo').forEach(cb=>cb.checked=false);
  const statusSet=[...new Set(colaboradores.map(c=>c.status||'').filter(Boolean))];
  const ehNA=s=>/^N\/?A$/i.test(String(s).trim());
  let alvos=[];
  if(grupo==='trabalhando') alvos=statusSet.filter(s=>statusGrupo(s)==='trabalhando' && !ehNA(s));
  else if(grupo==='ferias')  alvos=statusSet.filter(s=>statusGrupo(s)==='ferias');
  else if(grupo==='so_cesta')alvos=statusSet.filter(s=>statusGrupo(s)==='so_cesta');
  else if(grupo==='na')      alvos=statusSet.filter(ehNA);
  alvos.forEach(s=>{ const cb=document.querySelector('.ms-status[value="'+s+'"]'); if(cb) cb.checked=true; });
  renderColabList();
}
// Clicar num indicador de tipo de contrato aplica o filtro de tipo.
function blFiltroTipo(cod){
  document.querySelectorAll('.ms-status').forEach(cb=>cb.checked=false);
  document.querySelectorAll('.ms-tipo').forEach(cb=>{ cb.checked=(cb.value===cod); });
  renderColabList();
}

// Resumo por TIPO de contrato (base ativa, sem demitidos).
// Diretoria (DIR), Terceiros (TER), Socios (SOC) e Duplicados (registros MEI/Socio
// que compartilham CPF com o cadastro principal — colapsados no dedup).
function renderTipoResumo(){
  const el=document.getElementById('bl-tipo-resumo'); if(!el) return;
  const ativos=colaboradores.filter(c=>!_statusKey(c.status).includes('DEMIT'));
  const cont={};
  ativos.forEach(c=>{ const t=(c.filtro||'OK').toUpperCase(); cont[t]=(cont[t]||0)+1; });
  const seen=new Set(); let dup=0;
  ativos.forEach(c=>{ const cpf=(c.cpf||'').replace(/[^0-9]/g,'')||('nome:'+_normNome(c.nome)); if(seen.has(cpf)) dup++; else seen.add(cpf); });
  el.innerHTML='<div class="section-label">Por tipo de contrato</div><div class="stat-grid">'
    +_dsStat('crown','danger',cont.DIR||0,'Diretoria',"blFiltroTipo('DIR')")
    +_dsStat('briefcase','warning',cont.TER||0,'Terceiros',"blFiltroTipo('TER')")
    +_dsStat('user-star','purple',cont.SOC||0,'Sócios',"blFiltroTipo('SOC')")
    +_dsStat('copy','accent',dup,'Duplicados')
    +'</div>';
}

function renderColabList(){
  bindMsOutside();
  updateMsCounts();
  renderStatusResumo();
  renderTipoResumo();
  const f=filtrarColabs();
  const cnt=document.getElementById('bl-count');
  if(cnt){
    const plural=f.length===1?'':'s';
    cnt.innerHTML='<span style="display:inline-block;background:var(--blue-light);color:var(--blue-dark);font-weight:700;padding:5px 14px;border-radius:20px;font-size:13px">'
      +f.length+' colaborador'+(f.length===1?'':'es')+' selecionado'+plural+'</span>'
      +' <span class="text-xs text-muted">de '+colaboradores.length+' no total</span>';
  }
  const tbody=document.getElementById('bl-tbody'); if(!tbody) return;
  if(f.length===0){
    tbody.innerHTML='<tr><td colspan="13"><div class="empty-state"><div class="empty-icon"></div><p>Nenhum resultado.</p></div></td></tr>';
    return;
  }
  tbody.innerHTML=f.map(c=>`<tr>
    <td><code>${c.mat||'\u2014'}</code></td>
    <td>${dsPersonCell(c)}</td>
    <td><code style="font-size:10px">${c.cpf||'\u2014'}</code></td>
    <td class="text-xs text-muted">${c.admissao||'\u2014'}</td>
    <td class="text-sm text-muted">${c.depto||'\u2014'}</td>
    <td>${dsStatusBadge(c.status)}${(_statusKey(c.status).includes('DEMIT')&&c.demitidoEm)?'<br><span class="text-xs text-muted">dem. '+c.demitidoEm+'</span>':''}</td>
    <td>${dsTipoBadge(c.filtro||'OK')}</td>
    <td>${dsElegTags(c)}</td>
    <td class="text-sm">${fnum(c.vr)>0?brl(c.vr):'\u2014'}</td>
    <td class="text-sm">${fnum(c.cafe)>0?brl(c.cafe):'\u2014'}</td>
    <td>${mobBadge(c)}</td>
    <td class="text-xs">${ferResumoCelula(c)}</td>
    <td>
      <button class="btn btn-ghost btn-xs" onclick="abrirEditar('${c._id}')">\u270F\uFE0F</button>
      <button class="btn btn-danger btn-xs" onclick="excluirColab('${c._id}','${c.nome.replace(/'/g,"\\'")}')"></button>
    </td>
  </tr>`).join('');
}

// ============================================================
// BASE: DE/PARA — Importar Funcao, Admissao e Agendamento de Ferias
// Casa cada linha da planilha por NOME + MATRICULA contra a base
// e preenche funcao, admissao e mes de agendamento (ferMes).
// Nada e gravado antes do preview ser confirmado.
// ============================================================
function pgBaseDePara(){
  return `
    <div class="page-header"><h2>Importar Função / Admissão / Férias</h2>
      <p>De/para por <strong>nome</strong> e <strong>matrícula</strong>. Preenche Função, Data de Admissão e o Mês de agendamento de férias.</p></div>
    <div class="card">
      <div class="alert alert-info" style="margin-bottom:14px">
        Colunas reconhecidas em qualquer aba: <strong>NOME</strong>, <strong>MATRICULA</strong>, <strong>FUNÇÃO</strong>, <strong>ADMISSÃO</strong> e a coluna de mês de férias (ex.: "DATA PARA TIRAR FÉRIAS").<br>
        Nada é gravado antes de você revisar o preview e clicar em confirmar.
      </div>
      <div class="upload-zone" onclick="document.getElementById('defpara-file').click()">
        <input type="file" id="defpara-file" accept=".xlsx,.xls" onchange="importarDePara(event)">
        <div class="upload-icon"></div>
        <div class="upload-text">Clique para selecionar a planilha</div>
        <div class="upload-sub">.xlsx ou .xls</div>
      </div>
      <div id="import-preview" style="margin-top:14px"></div>
    </div>`;
}

// ── normalizacoes e parsers ──────────────────────────────────────
function _normNome(s){ return String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim(); }
function _normMatDigits(s){
  let t=String(s==null?'':s).trim();
  if(/^\d+\.0+$/.test(t)) t=t.split('.')[0]; // artefato de numero "10010173.0"
  return t.replace(/\D/g,'');
}
const _MESES_NORM={JANEIRO:'Janeiro',FEVEREIRO:'Fevereiro',MARCO:'Marco',ABRIL:'Abril',MAIO:'Maio',JUNHO:'Junho',JULHO:'Julho',AGOSTO:'Agosto',SETEMBRO:'Setembro',OUTUBRO:'Outubro',NOVEMBRO:'Novembro',DEZEMBRO:'Dezembro'};
function _fmtDataIso(d){
  if(!(d instanceof Date)||isNaN(d.getTime())) return '';
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function _parseDataCelula(v){
  if(v==null||v==='') return '';
  if(v instanceof Date) return _fmtDataIso(v);
  const s=String(v).trim();
  let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m) return m[1]+'-'+m[2]+'-'+m[3];
  m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if(m){ const yy=m[3].length===2?'20'+m[3]:m[3]; return yy+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'); }
  return '';
}
// Retorna {mes, raw}: mes = nome do mes (MESES_FER) ou '' se nao reconhecido
function _parseMesFerias(v){
  if(v==null||v==='') return {mes:'',raw:''};
  if(v instanceof Date) return {mes:MESES_FER[v.getMonth()]||'', raw:_fmtDataIso(v)};
  const raw=String(v).trim();
  const norm=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  for(const k in _MESES_NORM){ if(norm.includes(k)) return {mes:_MESES_NORM[k], raw}; }
  const iso=_parseDataCelula(raw);
  if(iso){ const d=new Date(iso+'T00:00:00'); if(!isNaN(d.getTime())) return {mes:MESES_FER[d.getMonth()]||'', raw}; }
  return {mes:'', raw};
}

async function importarDePara(event){
  const file=event.target.files[0]; if(!file) return;
  const prev=document.getElementById('import-preview');
  if(prev) prev.innerHTML='<div class="alert alert-info">Processando planilha...</div>';
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const wb=XLSX.read(e.target.result,{type:'binary',cellDates:true});
      const porNome={}, porMat={};
      colaboradores.forEach(c=>{
        const n=_normNome(c.nome); if(n){(porNome[n]=porNome[n]||[]).push(c);}
        const md=_normMatDigits(c.mat); if(md){(porMat[md]=porMat[md]||[]).push(c);}
      });
      const atualizar=[], jaOk=[], naoEnc=[], ambiguos=[], feriasNaoRec=[];
      const vistos=new Set();
      wb.SheetNames.forEach(sn=>{
        const rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1});
        let hi=-1;
        for(let i=0;i<Math.min(8,rows.length);i++){
          const low=(rows[i]||[]).map(x=>String(x||'').toLowerCase());
          if(low.some(h=>h.includes('nome'))&&low.some(h=>h.includes('matr'))){ hi=i; break; }
        }
        if(hi<0) return; // aba sem estrutura reconhecida
        const hs=rows[hi].map(h=>String(h||'').toLowerCase().trim());
        const iNome=hs.findIndex(h=>h.includes('nome'));
        const iMat=hs.findIndex(h=>h.includes('matr'));
        const iFunc=hs.findIndex(h=>h.includes('fun'));
        const iAdm=hs.findIndex(h=>h.includes('admiss'));
        const iFer=hs.findIndex(h=>h.includes('tirar')||h.includes('ferias')||h.includes('férias'));
        for(let i=hi+1;i<rows.length;i++){
          const r=rows[i]; if(!r) continue;
          const nomeCel=iNome>=0?r[iNome]:''; if(!nomeCel||!String(nomeCel).trim()) continue;
          const nome=String(nomeCel).trim();
          const rNomeN=_normNome(nome);
          const rMatRaw=iMat>=0?r[iMat]:'';
          const rMatD=_normMatDigits(rMatRaw);
          const func=iFunc>=0?String(r[iFunc]||'').trim().toUpperCase():'';
          const admIso=iAdm>=0?_parseDataCelula(r[iAdm]):'';
          const fer=iFer>=0?_parseMesFerias(r[iFer]):{mes:'',raw:''};

          // de/para: matricula tem prioridade; depois nome; desambigua com o outro
          let alvo=null, via='';
          const byMat=rMatD?(porMat[rMatD]||[]):[];
          const byNome=porNome[rNomeN]||[];
          if(byMat.length===1){ alvo=byMat[0]; via='matrícula'; }
          else if(byNome.length===1){ alvo=byNome[0]; via='nome'; }
          else if(byNome.length>1){
            const inter=byNome.filter(c=>rMatD&&_normMatDigits(c.mat)===rMatD);
            if(inter.length===1){ alvo=inter[0]; via='nome+matrícula'; }
            else { ambiguos.push({nome,mat:String(rMatRaw||''),motivo:byNome.length+' homônimos na base'}); continue; }
          }
          else if(byMat.length>1){
            const inter=byMat.filter(c=>_normNome(c.nome)===rNomeN);
            if(inter.length===1){ alvo=inter[0]; via='matrícula+nome'; }
            else { ambiguos.push({nome,mat:String(rMatRaw||''),motivo:byMat.length+' matrículas iguais'}); continue; }
          }
          else { naoEnc.push({nome,mat:String(rMatRaw||'')}); continue; }

          if(vistos.has(alvo._id)) continue; // ja tratado em aba anterior
          vistos.add(alvo._id);

          if(iFer>=0 && fer.raw && !fer.mes) feriasNaoRec.push({nome,valor:fer.raw});

          const ch=[];
          if(func && _normNome(func)!==_normNome(alvo.funcao||'')) ch.push({campo:'Função',de:alvo.funcao||'—',para:func});
          if(admIso && admIso!==(alvo.admissao||'')) ch.push({campo:'Admissão',de:alvo.admissao||'—',para:admIso});
          if(fer.mes && fer.mes!==(alvo.ferMes||'')) ch.push({campo:'Mês férias',de:alvo.ferMes||'—',para:fer.mes});

          const reg={id:alvo._id,nome:alvo.nome,via,func,admIso,mes:fer.mes,ch};
          if(ch.length) atualizar.push(reg); else jaOk.push(reg);
        }
      });
      deParaPendente={atualizar,jaOk,naoEnc,ambiguos,feriasNaoRec};
      renderDeParaPreview();
    }catch(err){
      if(prev) prev.innerHTML='<div class="alert alert-error">Erro ao ler a planilha: '+err.message+'</div>';
    }
  };
  reader.readAsBinaryString(file);
  event.target.value='';
}

function renderDeParaPreview(){
  const prev=document.getElementById('import-preview'); if(!prev||!deParaPendente) return;
  const {atualizar,jaOk,naoEnc,ambiguos,feriasNaoRec}=deParaPendente;
  const card=(cor,n,lbl)=>`<div class="stat-card ${cor}" style="padding:10px 12px"><div class="stat-val" style="font-size:20px">${n}</div><div class="stat-label" style="font-size:11px">${lbl}</div></div>`;
  let html=`<div class="stats-grid" style="margin-bottom:14px">
    ${card('green',atualizar.length,'A atualizar')}
    ${card('blue',jaOk.length,'Já corretos')}
    ${card('red',naoEnc.length,'Não encontrados')}
    ${card('yellow',ambiguos.length,'Ambíguos')}
    ${card('orange',feriasNaoRec.length,'Férias não reconhecida')}
  </div>`;

  if(atualizar.length){
    const linhas=atualizar.slice(0,150).map(r=>`<tr>
      <td style="font-weight:500">${r.nome}</td>
      <td class="text-xs text-muted">${r.via}</td>
      <td class="text-xs">${r.ch.map(c=>c.campo+': <strong>'+c.de+'</strong> → <strong style="color:var(--green)">'+c.para+'</strong>').join('<br>')}</td>
    </tr>`).join('');
    html+=`<div style="font-weight:700;font-size:12px;margin:6px 0">A atualizar (${atualizar.length}${atualizar.length>150?' — mostrando 150':''})</div>
      <div class="tbl-wrap" style="max-height:340px;overflow:auto;margin-bottom:12px"><table class="tbl"><thead><tr><th>Nome</th><th>Match</th><th>Mudanças</th></tr></thead><tbody>${linhas}</tbody></table></div>`;
  }
  if(naoEnc.length){
    html+=`<details style="margin-bottom:10px"><summary style="cursor:pointer;font-weight:700;font-size:12px;color:var(--red)">Não encontrados na base (${naoEnc.length}) — planilha tem, base não</summary>
      <div class="text-xs" style="margin-top:6px;max-height:200px;overflow:auto">${naoEnc.map(x=>x.nome+(x.mat?' ('+x.mat+')':'')).join('<br>')}</div></details>`;
  }
  if(ambiguos.length){
    html+=`<details style="margin-bottom:10px"><summary style="cursor:pointer;font-weight:700;font-size:12px;color:var(--yellow)">Ambíguos — revisar manualmente (${ambiguos.length})</summary>
      <div class="text-xs" style="margin-top:6px;max-height:200px;overflow:auto">${ambiguos.map(x=>x.nome+(x.mat?' ('+x.mat+')':'')+' — '+x.motivo).join('<br>')}</div></details>`;
  }
  if(feriasNaoRec.length){
    html+=`<details style="margin-bottom:10px"><summary style="cursor:pointer;font-weight:700;font-size:12px;color:var(--orange)">Mês de férias não reconhecido (${feriasNaoRec.length}) — função/admissão são aplicadas, mês fica em branco</summary>
      <div class="text-xs" style="margin-top:6px;max-height:200px;overflow:auto">${feriasNaoRec.map(x=>x.nome+': "'+x.valor+'"').join('<br>')}</div></details>`;
  }

  html+=`<div class="btn-row" style="margin-top:8px">
    <button class="btn btn-primary" onclick="aplicarDePara()" ${atualizar.length?'':'disabled'}>Confirmar e gravar ${atualizar.length} atualização(ões)</button>
    ${_btnExportPend()}
    <button class="btn btn-ghost" onclick="deParaPendente=null;document.getElementById('import-preview').innerHTML=''">Cancelar</button>
  </div>`;
  prev.innerHTML=html;
}

// Botao de exportar pendencias (nao encontrados / ambiguos / ferias nao reconhecida)
function _btnExportPend(){
  if(!deParaPendente) return '';
  const n=(deParaPendente.naoEnc||[]).length+(deParaPendente.ambiguos||[]).length+(deParaPendente.feriasNaoRec||[]).length;
  if(!n) return '';
  return '<button class="btn btn-ghost" onclick="exportarDeParaPendentes()">Exportar pendências (Excel) — '+n+'</button>';
}

// Gera um Excel com as linhas que precisam de tratamento manual
function exportarDeParaPendentes(){
  if(!deParaPendente){ toast('Nada para exportar','error'); return; }
  const {naoEnc=[],ambiguos=[],feriasNaoRec=[]}=deParaPendente;
  const wb=XLSX.utils.book_new();
  const add=(nome,header,rows)=>{
    const ws=XLSX.utils.aoa_to_sheet([header,...rows]);
    XLSX.utils.book_append_sheet(wb,ws,nome);
  };
  add('Nao Encontrados',['Nome','Matricula'], naoEnc.map(x=>[x.nome,x.mat||'']));
  add('Ambiguos',['Nome','Matricula','Motivo'], ambiguos.map(x=>[x.nome,x.mat||'',x.motivo||'']));
  add('Ferias Nao Reconhecida',['Nome','Valor original'], feriasNaoRec.map(x=>[x.nome,x.valor||'']));
  XLSX.writeFile(wb,'DePara_Pendencias.xlsx');
  toast('✅ Excel de pendências gerado!','success');
}

async function aplicarDePara(){
  if(!deParaPendente||!deParaPendente.atualizar.length) return;
  const lista=deParaPendente.atualizar.slice();
  const prev=document.getElementById('import-preview');
  if(prev) prev.innerHTML='<div class="alert alert-info">Gravando '+lista.length+' atualização(ões)...</div>';
  let ok=0;
  try{
    for(let i=0;i<lista.length;i+=400){
      const fatia=lista.slice(i,i+400);
      const b=window._writeBatch(window._db);
      fatia.forEach(r=>{
        const c=colaboradores.find(x=>x._id===r.id); if(!c) return;
        if(r.func) c.funcao=r.func;
        if(r.admIso) c.admissao=r.admIso;
        if(r.mes) c.ferMes=r.mes;
        b.set(window._doc('colaboradores',c._id),c); ok++;
      });
      await b.commit();
    }
    toast('✅ '+ok+' colaboradores atualizados','success');
    // Mantem as pendencias (nao encontrados/ambiguos) para exportacao manual
    if(deParaPendente) deParaPendente.atualizar=[];
    const btn=_btnExportPend();
    if(prev) prev.innerHTML='<div class="alert alert-success">✅ <strong>'+ok+' colaboradores</strong> atualizados (função, admissão e/ou mês de férias).</div>'
      +(btn?'<div style="margin-top:10px">Há linhas que precisam de tratamento manual:<div class="btn-row" style="margin-top:6px">'+btn+'</div></div>':'');
    if(currentPage==='base-lista') renderColabList();
  }catch(err){
    if(prev) prev.innerHTML='<div class="alert alert-error">Erro ao gravar: '+err.message+'</div>';
  }
}

// ════════════════════════════════════════════════════════════════
// BASE: SINCRONIZAR COM SENIOR (por status, confirmacao item a item)
// ════════════════════════════════════════════════════════════════
let syncStatusPendente=null;
let admissaoSync=null; // admissao em edicao no modal de colaborador

// Classifica o status escrito da planilha em categoria + status canonico do sistema
function classificarStatusSenior(raw){
  const s=_normNome(raw); // maiusculas, sem acento
  if(!s) return null;
  if(s.includes('DEMIT')||s.includes('RESCIS')||s.includes('DESLIG')) return {cat:'demitido', status:'Demitido'};
  if(s.includes('FERIAS')) return {cat:'ferias', status:s.includes('COLETIV')?'Ferias Coletiva':'Ferias'};
  if(s.includes('MATERN')) return {cat:'afastado', status:'Lic. Maternidade'};
  if(s.includes('PATERN')) return {cat:'afastado', status:'Lic. Paternidade'};
  if(s.includes('ACIDENT')) return {cat:'afastado', status:'Acidente Trabalho'};
  if(s.includes('DOENC')) return {cat:'afastado', status:'Auxilio Doenca'};
  if(s.includes('RECLUS')) return {cat:'afastado', status:'Auxilio Reclusao'};
  if(s.includes('AFAST')||s.includes('INSS')||s.includes('LICENC')) return {cat:'afastado', status:'Afastado'};
  if(s.includes('TRABALH')||s.includes('ATIVO')||s.includes('NORMAL')) return {cat:'trabalhando', status:'Trabalhando'};
  return {cat:'outro', status:raw};
}
function categoriaStatusBase(c){
  const st=c.status||'';
  if(st==='Demitido') return 'demitido';
  if(st==='Ferias'||st==='Ferias Coletiva') return 'ferias';
  if(STATUS_SO_CESTA.includes(st)) return 'afastado';
  if(st==='Trabalhando'||st==='Ativo') return 'trabalhando';
  return 'outro';
}

function processarSyncStatus(event){
  const file=event.target.files[0]; if(!file) return;
  const prev=document.getElementById('import-preview');
  if(prev) prev.innerHTML='<div class="alert alert-info">Processando...</div>';
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const wb=XLSX.read(e.target.result,{type:'binary'});
      const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1});
      let hi=-1;
      for(let i=0;i<Math.min(8,rows.length);i++){
        const low=(rows[i]||[]).map(x=>String(x||'').toLowerCase());
        if(low.some(h=>h.includes('nome'))&&low.some(h=>h.includes('status')||h.includes('situac'))){hi=i;break;}
      }
      if(hi<0){ if(prev) prev.innerHTML='<div class="alert alert-error">Não encontrei o cabeçalho com colunas <strong>Nome</strong> e <strong>Status</strong>.</div>'; return; }
      const hs=rows[hi].map(h=>String(h||'').toLowerCase().trim());
      const iMat=hs.findIndex(h=>h.includes('matr')||h.includes('cadastro'));
      const iNome=hs.findIndex(h=>h.includes('nome'));
      const iStat=hs.findIndex(h=>h.includes('status')||h.includes('situac'));

      const porMat={}, porNome={};
      colaboradores.forEach(c=>{ const m=_normMatDigits(c.mat); if(m)(porMat[m]=porMat[m]||[]).push(c); const n=_normNome(c.nome); if(n)(porNome[n]=porNome[n]||[]).push(c); });

      const admissoes=[], demissoes=[], ferias=[], afastamentos=[], retornos=[], naoRec=[];
      for(let i=hi+1;i<rows.length;i++){
        const r=rows[i]; if(!r) continue;
        const nome=iNome>=0?String(r[iNome]||'').trim():''; if(!nome) continue;
        const matD=iMat>=0?_normMatDigits(r[iMat]):'';
        const cls=classificarStatusSenior(r[iStat]);
        if(!cls) continue;
        let c=null;
        if(matD&&porMat[matD]&&porMat[matD].length===1) c=porMat[matD][0];
        else { const bn=porNome[_normNome(nome)]||[]; if(bn.length===1) c=bn[0]; else if(bn.length>1&&matD){ const f=bn.filter(x=>_normMatDigits(x.mat)===matD); if(f.length===1)c=f[0]; } }
        const reg={mat:String(r[iMat]||'').trim(), nome, statusRaw:String(r[iStat]||'').trim(), cls, colab:c||null};
        if(cls.cat==='outro'){ naoRec.push(reg); continue; }
        if(!c){ if(cls.cat==='trabalhando') admissoes.push(reg); continue; }
        if(categoriaStatusBase(c)===cls.cat) continue; // sem mudanca
        if(cls.cat==='demitido') demissoes.push(reg);
        else if(cls.cat==='ferias') ferias.push(reg);
        else if(cls.cat==='afastado') afastamentos.push(reg);
        else if(cls.cat==='trabalhando') retornos.push(reg);
      }
      syncStatusPendente={admissoes,demissoes,ferias,afastamentos,retornos,naoRec};
      renderSyncStatusPreview();
    }catch(err){ if(prev) prev.innerHTML='<div class="alert alert-error">Erro: '+err.message+'</div>'; }
  };
  reader.readAsBinaryString(file);
  event.target.value='';
}

function renderSyncStatusPreview(){
  const prev=document.getElementById('import-preview'); if(!prev||!syncStatusPendente) return;
  const S=syncStatusPendente;
  const card=(cor,n,lbl)=>'<div class="stat-card '+cor+'" style="padding:10px 12px"><div class="stat-val" style="font-size:20px">'+n+'</div><div class="stat-label" style="font-size:11px">'+lbl+'</div></div>';
  const total=S.admissoes.length+S.demissoes.length+S.ferias.length+S.afastamentos.length+S.retornos.length;
  let html='<div class="stats-grid" style="margin-bottom:14px">'
    +card('green',S.admissoes.length,'Admissões')+card('red',S.demissoes.length,'Demissões')
    +card('blue',S.ferias.length,'Férias')+card('yellow',S.afastamentos.length,'Afastamentos')
    +card('green',S.retornos.length,'Retornos')+'</div>';
  if(total===0) html+='<div class="alert alert-success">Nenhuma mudança de status detectada — base já sincronizada.</div>';
  if(S.demissoes.length) html+='<div class="alert alert-warning" style="margin-bottom:10px">⚠️ As demissões <strong>removem</strong> o colaborador da base. Garanta que a competência do mês anterior já foi fechada (o snapshot fica no Histórico).</div>';
  const sec=(titulo,cor,arr,tipo,acao)=>{
    if(!arr.length) return '';
    const linhas=arr.map((r,idx)=>'<tr><td style="font-weight:500">'+r.nome+'</td><td class="text-xs text-muted">'+(r.mat||'—')+'</td>'
      +'<td class="text-xs">'+(r.colab?'era '+(r.colab.status||'—')+' → ':'')+'<strong>'+r.statusRaw+'</strong></td>'
      +'<td style="text-align:right;white-space:nowrap"><button class="btn btn-primary btn-xs" onclick="syncConfirmar(\''+tipo+'\','+idx+')">'+acao+'</button> '
      +'<button class="btn btn-ghost btn-xs" onclick="syncIgnorar(\''+tipo+'\','+idx+')">Ignorar</button></td></tr>').join('');
    const acaoTodos=tipo==='adm'
      ? '<span class="text-xs text-muted">cadastre um a um</span>'
      : '<button class="btn btn-ghost btn-xs" onclick="syncConfirmarTodos(\''+tipo+'\')">Confirmar todos ('+arr.length+')</button>';
    const head='<div style="display:flex;justify-content:space-between;align-items:center;margin:6px 0">'
      +'<span style="font-weight:700;font-size:12px;color:'+cor+'">'+titulo+' ('+arr.length+')</span>'+acaoTodos+'</div>';
    return head+'<div class="tbl-wrap" style="margin-bottom:14px"><table class="tbl"><tbody>'+linhas+'</tbody></table></div>';
  };
  html+=sec('Admissões — confirmar e cadastrar','var(--green)',S.admissoes,'adm','Admitir...');
  html+=sec('Demissões — remover da base','var(--red)',S.demissoes,'dem','Confirmar e remover');
  html+=sec('Entraram de férias','var(--blue)',S.ferias,'fer','Confirmar férias');
  html+=sec('Afastamentos','var(--yellow)',S.afastamentos,'afa','Confirmar afastamento');
  html+=sec('Retornos ao trabalho','var(--green)',S.retornos,'ret','Confirmar retorno');
  if(S.naoRec&&S.naoRec.length){
    html+='<details style="margin-top:6px"><summary style="cursor:pointer;font-weight:700;font-size:12px;color:var(--text2)">Status não reconhecido ('+S.naoRec.length+')</summary>'
      +'<div class="text-xs text-muted" style="margin-top:6px">'+S.naoRec.map(r=>r.nome+': "'+r.statusRaw+'"').join('<br>')+'</div></details>';
  }
  prev.innerHTML=html;
}

function _syncArr(tipo){ const m={adm:'admissoes',dem:'demissoes',fer:'ferias',afa:'afastamentos',ret:'retornos'}; return syncStatusPendente?syncStatusPendente[m[tipo]]:null; }

function syncIgnorar(tipo,idx){ const arr=_syncArr(tipo); if(arr){ arr.splice(idx,1); renderSyncStatusPreview(); } }

async function syncConfirmar(tipo,idx){
  const arr=_syncArr(tipo); if(!arr) return;
  const item=arr[idx]; if(!item) return;
  if(tipo==='adm'){ abrirAdmissaoSync(item); return; } // remove ao salvar
  const c=item.colab;
  if(tipo==='dem'){
    if(!c){ arr.splice(idx,1); renderSyncStatusPreview(); return; }
    if(!confirm('Marcar '+c.nome+' como Demitido? Ele permanece na base (histórico), sem benefícios.')) return;
    c.status='Demitido'; c.demitidoEm=_compAtual();
    try{ await fsSet('colaboradores',c._id,c); arr.splice(idx,1); toast(c.nome+': Demitido ('+c.demitidoEm+')','success'); renderSyncStatusPreview(); if(currentPage==='base-lista')renderColabList(); }
    catch(e){ toast('Erro: '+e.message,'error'); }
    return;
  }
  if(!c){ arr.splice(idx,1); renderSyncStatusPreview(); return; }
  c.status=item.cls.status;
  try{ await fsSet('colaboradores',c._id,c); arr.splice(idx,1); toast(c.nome+': '+c.status,'success'); renderSyncStatusPreview(); if(currentPage==='base-lista')renderColabList(); }
  catch(e){ toast('Erro: '+e.message,'error'); }
}

// Aplica todos os itens de uma categoria de uma vez (exceto admissoes, que sao individuais)
async function syncConfirmarTodos(tipo){
  const arr=_syncArr(tipo); if(!arr||!arr.length||tipo==='adm') return;
  if(tipo==='dem' && !confirm('Marcar '+arr.length+' colaborador(es) como Demitido? Permanecem na base (histórico), sem benefícios.')) return;
  const itens=arr.filter(i=>i.colab);
  const compDem=_compAtual();
  try{
    for(let i=0;i<itens.length;i+=400){
      const fatia=itens.slice(i,i+400);
      const b=window._writeBatch(window._db);
      fatia.forEach(item=>{
        const c=item.colab;
        if(tipo==='dem'){ c.status='Demitido'; c.demitidoEm=compDem; b.set(window._doc('colaboradores',c._id),c); }
        else { c.status=item.cls.status; b.set(window._doc('colaboradores',c._id),c); }
      });
      await b.commit();
    }
    arr.length=0;
    toast(itens.length+' colaborador(es) atualizado(s)','success');
    renderSyncStatusPreview();
    if(currentPage==='base-lista') renderColabList();
  }catch(e){ toast('Erro: '+e.message,'error'); }
}

// Admissao: abre o cadastro pre-preenchido; salvar cria o colaborador
function abrirAdmissaoSync(item){
  admissaoSync=item; editColabId=null;
  const body=document.getElementById('modal-colab-body');
  const title=document.getElementById('modal-colab-title');
  if(!body||!title) return;
  title.textContent='Admitir: '+item.nome;
  body.innerHTML=formColabHTML('e',{mat:item.mat,nome:item.nome,status:'Trabalhando',filtro:'OK'});
  setTimeout(()=>initFormDisplay('e'),50);
  openModal('modal-colab');
}

async function salvarAdmissaoSync(){
  const c=getColabFromForm('e');
  if(!c.nome){toast('Nome é obrigatório','error');return;}
  const id=c.mat||(c.nome.replace(/[^A-Za-z0-9]/g,'_').substr(0,20)+'_'+Date.now());
  if(colaboradores.some(x=>x._id===id)){toast('Já existe colaborador com esta matrícula','error');return;}
  c._id=id; c.mobilidade=c.mobilidade||inferMob(c);
  try{
    await fsSet('colaboradores',id,c); colaboradores.push(c);
    if(syncStatusPendente&&admissaoSync){ const a=syncStatusPendente.admissoes, ix=a.indexOf(admissaoSync); if(ix>=0)a.splice(ix,1); }
    admissaoSync=null;
    closeModal('modal-colab');
    toast('Admitido: '+c.nome,'success');
    renderSyncStatusPreview();
    if(currentPage==='base-lista')renderColabList();
  }catch(e){toast('Erro: '+e.message,'error');}
}

// ============================================================
// BASE: SYNC SENIOR (legado)
// ============================================================
function pgBaseSync(){
  return `
    <div class="page-header">
      <h2> Sincroniza\u00E7\u00E3o com Senior</h2>
      <p>Importe o relat\u00F3rio da Senior para atualizar a base.</p>
    </div>
    <div class="card">
      <div class="alert alert-info" style="margin-bottom:14px">
        Colunas esperadas: <strong>Matr\u00EDcula (ou Cadastro), Nome, CPF</strong>
      </div>
      <div class="upload-zone" onclick="document.getElementById('sync-file').click()">
        <input type="file" id="sync-file" accept=".xlsx,.xls" onchange="processarSync(event)">
        <div class="upload-icon"></div>
        <div class="upload-text">Clique para selecionar o relat\u00F3rio</div>
        <div class="upload-sub">.xlsx ou .xls</div>
      </div>
      <div id="sync-preview" style="margin-top:14px"></div>
    </div>`;
}

// ============================================================
// BASE: NOVO COLABORADOR (p\u00E1gina inline)
// ============================================================
function pgBaseNovo(){
  return `
    <div class="page-header"><h2>\u2795 Novo Colaborador</h2><p>Defina a elegibilidade a cada benef\u00EDcio.</p></div>
    <div id="novo-alert"></div>
    ${formColabHTML('f', null)}
    <div class="btn-row">
      <button class="btn btn-primary" onclick="salvarNovoColab()">Salvar</button>
      <button class="btn btn-ghost" onclick="limparFormColab('f')">\u2716 Limpar</button>
    </div>`;
}


function processarSync(event){
  const file=event.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    const wb=XLSX.read(e.target.result,{type:'binary'});
    const data=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1});
    let hi=0;
    for(let i=0;i<Math.min(5,data.length);i++){
      if(data[i].some(v=>String(v||'').toLowerCase().includes('nome'))){hi=i;break;}
    }
    const hs=data[hi].map(h=>String(h||'').toLowerCase().trim());
    const iMat=hs.findIndex(h=>h.includes('cadastro')||h.includes('matr'));
    const iNome=hs.findIndex(h=>h.includes('nome'));
    const iCPF=hs.findIndex(h=>h.includes('cpf'));
    const seniorMats=new Set();
    const seniorData=[];
    for(let i=hi+1;i<data.length;i++){
      const r=data[i]; if(!r||!r[iNome]) continue;
      const mat=String(r[iMat]||'').trim();
      const nome=String(r[iNome]||'').trim().toUpperCase();
      if(mat){seniorMats.add(mat);seniorData.push({mat,nome,cpf:String(r[iCPF]||'').trim()});}
    }
    const acoes=[];
    seniorData.forEach(s=>{if(!colaboradores.find(c=>c.mat===s.mat))acoes.push({tipo:'novo',dados:s});});
    colaboradores.filter(c=>c.status==='Ativo'&&c.mat).forEach(c=>{if(!seniorMats.has(c.mat))acoes.push({tipo:'demitido',dados:c});});
    colaboradores.filter(c=>['Ferias','Ferias'].includes(c.status)&&c.mat).forEach(c=>{if(seniorMats.has(c.mat))acoes.push({tipo:'voltou',dados:c});});
    seniorPendente=acoes;
    renderSyncPreview(seniorData.length);
    event.target.value='';
  };
  reader.readAsBinaryString(file);
}

function renderSyncPreview(total){
  const novos=seniorPendente.filter(a=>a.tipo==='novo');
  const demitidos=seniorPendente.filter(a=>a.tipo==='demitido');
  const voltaram=seniorPendente.filter(a=>a.tipo==='voltou');
  const prev=document.getElementById('sync-preview'); if(!prev) return;
  if(seniorPendente.length===0){prev.innerHTML='<div class="alert alert-success">Base sincronizada! '+total+' colaboradores no relat\u00F3rio.</div>';return;}
  let h='<div class="alert alert-info"><strong>'+total+'</strong> no relat\u00F3rio &middot; <strong>'+novos.length+'</strong> novos &middot; <strong>'+demitidos.length+'</strong> demiss\u00F5es &middot; <strong>'+voltaram.length+'</strong> retornos</div>';
  h+='<div style="max-height:380px;overflow-y:auto">';
  novos.forEach((a,i)=>{h+='<div class="sync-card sync-novo"><div class="sync-card-text"><strong>Novo:</strong> '+a.dados.nome+' <code>'+a.dados.mat+'</code></div><div class="sync-card-btns"><button class="btn btn-success btn-sm" onclick="syncAcao(\'novo\','+i+')">Cadastrar</button><button class="btn btn-ghost btn-sm" onclick="syncIgnorar(\'novo\','+i+')">Ignorar</button></div></div>';});
  demitidos.forEach((a,i)=>{h+='<div class="sync-card sync-demitido"><div class="sync-card-text"><strong>N\u00E3o encontrado:</strong> '+a.dados.nome+' <code>'+a.dados.mat+'</code></div><div class="sync-card-btns"><button class="btn btn-danger btn-sm" onclick="syncAcao(\'demitido\','+i+')">Inativo</button><button class="btn btn-warning btn-sm" onclick="syncAcaoFerias('+i+')">F\u00E9rias</button><button class="btn btn-ghost btn-sm" onclick="syncIgnorar(\'demitido\','+i+')">Ignorar</button></div></div>';});
  voltaram.forEach((a,i)=>{h+='<div class="sync-card sync-ferias-out"><div class="sync-card-text"><strong>Voltou?</strong> '+a.dados.nome+' <code>'+a.dados.mat+'</code></div><div class="sync-card-btns"><button class="btn btn-primary btn-sm" onclick="syncAcao(\'voltou\','+i+')">Marcar Ativo</button><button class="btn btn-ghost btn-sm" onclick="syncIgnorar(\'voltou\','+i+')">Ignorar</button></div></div>';});
  h+='</div>';
  prev.innerHTML=h;
}

async function syncAcao(tipo, idx){
  const item=seniorPendente.filter(a=>a.tipo===tipo)[idx];
  if(!item) return;
  if(tipo==='novo'){
    const d=item.dados;
    const id=d.mat||(d.nome.replace(/[^A-Za-z0-9]/g,'_').substr(0,20)+'_'+Date.now());
    const c={_id:id,mat:d.mat,nome:d.nome,cpf:d.cpf||'',status:'Ativo',mobilidade:'perto',
      elegibilidade:{vr:false,cafe:false,mobilidade:false,folha:true,folhaCLT:true,folhaMEI:false},
      vr:0,cafe:0,comb:0,vt1:0,v1:0,vt2:0,v2:0,vt3:0,v3:0,vt4:0,v4:0,cargo:'',depto:''};
    await fsSet('colaboradores',id,c);
    colaboradores.push(c);
    toast('\u2705 '+d.nome+' cadastrado!','success');
  } else if(tipo==='demitido'){
    const c=colaboradores.find(x=>x.mat===item.dados.mat); if(!c) return;
    c.status='Inativo';
    await fsSet('colaboradores',c._id,c);
    toast(c.nome+' marcado como Inativo.','warning');
  } else if(tipo==='voltou'){
    const c=colaboradores.find(x=>x._id===item.dados._id); if(!c) return;
    c.status='Ativo';
    await fsSet('colaboradores',c._id,c);
    toast(c.nome+' voltou \u00E0s atividades!','success');
  }
  seniorPendente=seniorPendente.filter(a=>!(a.tipo===tipo&&a===item));
  renderSyncPreview(0);
}

async function syncAcaoFerias(idx){
  const item=seniorPendente.filter(a=>a.tipo==='demitido')[idx];
  if(!item) return;
  const c=colaboradores.find(x=>x.mat===item.dados.mat); if(!c) return;
  c.status='Ferias';
  await fsSet('colaboradores',c._id,c);
  seniorPendente=seniorPendente.filter(a=>a!==item);
  toast(c.nome+' colocado em F\u00E9rias.','info');
  renderSyncPreview(0);
}

function syncIgnorar(tipo, idx){
  const arr=seniorPendente.filter(a=>a.tipo===tipo);
  const item=arr[idx];
  seniorPendente=seniorPendente.filter(a=>a!==item);
  renderSyncPreview(0);
}

// ============================================================
// BASE: CARGA EM LOTE
// ============================================================
function pgBaseCarga(){
  return `
    <div class="page-header">
      <h2> Importar & Reconciliar Base</h2>
      <p>Importe uma planilha completa de colaboradores. O sistema compara com a base atual e prop\u00F5e as a\u00E7\u00F5es necess\u00E1rias.</p>
    </div>
    <div class="card">
      <div class="alert alert-info" style="margin-bottom:14px">
        <strong>Como funciona:</strong><br>
        1\uFE0F\u20E3 Colaboradores que j\u00E1 existem \u2192 sem altera\u00E7\u00E3o<br>
        2\uFE0F\u20E3 Na base atual mas n\u00E3o na planilha \u2192 pergunta se quer excluir<br>
        3\uFE0F\u20E3 Na planilha mas n\u00E3o na base \u2192 pergunta se quer incluir<br>
        4\uFE0F\u20E3 Mesmo CPF com matr\u00EDculas diferentes \u2192 identifica duplicata (CLT+MEI)
      </div>
      <div class="upload-zone" onclick="document.getElementById('carga-file').click()">
        <input type="file" id="carga-file" accept=".xlsx,.xls" onchange="processarCarga(event)">
        <div class="upload-icon"></div>
        <div class="upload-text">Clique para selecionar a planilha de colaboradores</div>
        <div class="upload-sub">Colunas: Matr\u00EDcula, Nome, CPF, Cargo, Departamento, Status, Filtro (OK/DUP/MEI/SOC), VR/dia, Caf\u00E9/dia, Combust\u00EDvel, Mobilidade</div>
      </div>
      <div id="import-preview" style="margin-top:14px"></div>
    </div>
    <div class="card">
      <div class="card-title">Modelo de planilha</div>
      <button class="btn btn-success btn-sm" onclick="gerarModeloCarga()">\u2B07 Baixar modelo</button>
    </div>`;
}

// Estado da reconcilia\u00E7\u00E3o
let reconcPlanilha = [];   // todos da planilha
let reconcAcoes = {};      // {mat+cpf: 'incluir'|'excluir'|'ok'|'duplic'}

function processarCarga(event){
  const file=event.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    const wb=XLSX.read(e.target.result,{type:'binary'});
    const data=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1});
    let hi=0;
    for(let i=0;i<Math.min(5,data.length);i++){if(data[i].some(v=>String(v||'').toLowerCase().includes('nome'))){hi=i;break;}}
    const hs=data[hi].map(h=>String(h||'').toLowerCase().trim());
    const col=(...keys)=>hs.findIndex(h=>keys.some(k=>h.includes(k)));
    const iMat=col('matr'),iNome=col('nome'),iCPF=col('cpf'),iCargo=col('cargo');
    const iDepto=col('depart','depto'),iStat=col('status'),iMob=col('mobil');
    const iFiltro=col('filtro','tipo');
    const iAdm=col('admiss','admis');
    const iVR=col('vr/d','vr_d','vr dia','vr'),iCafe=col('caf\u00E9','cafe'),iComb=col('comb','combusti');

    reconcPlanilha=[];
    reconcAcoes={};

    for(let i=hi+1;i<data.length;i++){
      const r=data[i]; if(!r||!r[iNome]||!String(r[iNome]).trim()) continue;
      const mat=String(r[iMat]||'').trim();
      const cpf=String(r[iCPF]||'').trim().replace(/[^0-9]/g,'');
      const nome=String(r[iNome]||'').trim().toUpperCase();
      const filtro=String(r[iFiltro]||'OK').trim().toUpperCase();
      reconcPlanilha.push({
        mat,nome,cpf,filtro,
        cargo:String(r[iCargo]||'').trim().toUpperCase(),
        depto:String(r[iDepto]||'').trim(),
        status:String(r[iStat]||'Ativo').trim(),
        admissao:r[iAdm]?new Date(r[iAdm]).toISOString().split('T')[0]:'',
        mobilidade:String(r[iMob]||'perto').trim().toLowerCase(),
        vr:fnum(r[iVR]),cafe:fnum(r[iCafe]),comb:fnum(r[iComb]),
        elegibilidade:{vr:fnum(r[iVR])>0,cafe:fnum(r[iCafe])>0,mobilidade:fnum(r[iComb])>0,folha:true,folhaCLT:true,folhaMEI:false}
      });
    }

    // Chave de identifica\u00E7\u00E3o: mat+cpf
    const chave=(mat,cpf)=>(mat||'')+'|'+(cpf||'').replace(/[^0-9]/g,'');
    const planilhaKeys=new Set(reconcPlanilha.map(c=>chave(c.mat,c.cpf)));
    const baseKeys=new Set(colaboradores.map(c=>chave(c.mat,(c.cpf||'').replace(/[^0-9]/g,''))));

    // Identificar grupos
    const jaExistem=[];
    const paraIncluir=[];
    const paraExcluir=[];
    const duplicatas=[];

    // CPFs que aparecem mais de uma vez na planilha = duplicatas CLT+MEI
    const cpfCount={};
    reconcPlanilha.forEach(c=>{if(c.cpf)cpfCount[c.cpf]=(cpfCount[c.cpf]||0)+1;});

    reconcPlanilha.forEach(c=>{
      const k=chave(c.mat,c.cpf);
      if(baseKeys.has(k)){
        jaExistem.push(c);
        reconcAcoes[k]='ok';
      } else if(c.cpf&&cpfCount[c.cpf]>1){
        duplicatas.push(c);
        reconcAcoes[k]='duplic_pendente';
      } else {
        paraIncluir.push(c);
        reconcAcoes[k]='incluir'; // padr\u00E3o: incluir
      }
    });

    colaboradores.forEach(c=>{
      const k=chave(c.mat,(c.cpf||''));
      if(!planilhaKeys.has(k)){
        paraExcluir.push(c);
        reconcAcoes[k]='manter'; // padr\u00E3o: manter (n\u00E3o excluir)
      }
    });

    renderReconciliacao(jaExistem,paraIncluir,paraExcluir,duplicatas);
    event.target.value='';
  };
  reader.readAsBinaryString(file);
}

function renderReconciliacao(jaExistem,paraIncluir,paraExcluir,duplicatas){
  const chave=(mat,cpf)=>(mat||'')+'|'+(cpf||'').replace(/[^0-9]/g,'');
  const prev=document.getElementById('import-preview'); if(!prev) return;

  let html=`
    <div class="stats-grid" style="margin-bottom:16px">
      <div class="stat-card green"><div class="stat-val" style="color:var(--green)">${jaExistem.length}</div><div class="stat-label">J\u00E1 existem (sem altera\u00E7\u00E3o)</div></div>
      <div class="stat-card blue"><div class="stat-val" style="color:var(--blue)">${paraIncluir.length}</div><div class="stat-label">Novos para incluir</div></div>
      <div class="stat-card red"><div class="stat-val" style="color:var(--red)">${paraExcluir.length}</div><div class="stat-label">Na base mas n\u00E3o na planilha</div></div>
      <div class="stat-card purple"><div class="stat-val" style="color:var(--purple)">${duplicatas.length}</div><div class="stat-label">Duplicatas (CLT+MEI)</div></div>
    </div>`;

  // INCLUIR
  if(paraIncluir.length>0){
    html+=`<div class="card" style="margin-bottom:12px">
      <div class="card-title" style="color:var(--blue)"> Novos colaboradores \u2014 selecione os que deseja incluir</div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <button class="btn btn-ghost btn-sm" onclick="selecionarTodosIncluir(true)">\u2705 Selecionar todos</button>
        <button class="btn btn-ghost btn-sm" onclick="selecionarTodosIncluir(false)">\u2610 Desmarcar todos</button>
      </div>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th style="width:36px"></th><th>Matr\u00EDcula</th><th>Nome</th><th>CPF</th><th>Departamento</th><th>Filtro</th></tr></thead>
        <tbody>
          ${paraIncluir.map((c,i)=>`<tr>
            <td><input type="checkbox" id="inc-${i}" class="inc-check" data-idx="${i}" checked style="accent-color:var(--blue)"></td>
            <td><code>${c.mat||'\u2014'}</code></td>
            <td>${c.nome}</td>
            <td><code style="font-size:10px">${c.cpf||'\u2014'}</code></td>
            <td class="text-sm text-muted">${c.depto||'\u2014'}</td>
            <td>${filtroBadge(c.filtro||'OK')}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
  }

  // EXCLUIR
  if(paraExcluir.length>0){
    html+=`<div class="card" style="margin-bottom:12px">
      <div class="card-title" style="color:var(--red)">\u26A0\uFE0F Est\u00E3o na base mas n\u00E3o na planilha \u2014 selecione os que deseja EXCLUIR</div>
      <div class="alert alert-warning" style="margin-bottom:10px">Por padr\u00E3o NENHUM est\u00E1 marcado para exclus\u00E3o. Marque apenas os que confirmar que sa\u00EDram.</div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <button class="btn btn-ghost btn-sm" onclick="selecionarTodosExcluir(true)">\u26A0\uFE0F Marcar todos para excluir</button>
        <button class="btn btn-ghost btn-sm" onclick="selecionarTodosExcluir(false)">\u2610 Desmarcar todos</button>
      </div>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th style="width:36px">Excluir?</th><th>Matr\u00EDcula</th><th>Nome</th><th>CPF</th><th>Departamento</th><th>Status atual</th></tr></thead>
        <tbody>
          ${paraExcluir.map((c,i)=>`<tr>
            <td><input type="checkbox" id="exc-${i}" class="exc-check" data-idx="${i}" style="accent-color:var(--red)"></td>
            <td><code>${c.mat||'\u2014'}</code></td>
            <td>${c.nome}</td>
            <td><code style="font-size:10px">${c.cpf||'\u2014'}</code></td>
            <td class="text-sm text-muted">${c.depto||'\u2014'}</td>
            <td>${statusBadge(c.status)}${(_statusKey(c.status).includes('DEMIT')&&c.demitidoEm)?'<br><span class="text-xs text-muted">dem. '+c.demitidoEm+'</span>':''}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
  }

  // DUPLICATAS
  if(duplicatas.length>0){
    html+=`<div class="card" style="margin-bottom:12px">
      <div class="card-title" style="color:var(--purple)">DUP Poss\u00EDveis duplicatas (mesmo CPF, matr\u00EDculas diferentes) \u2014 CLT + MEI/S\u00F3cio</div>
      <div class="alert alert-info" style="margin-bottom:10px">Para cada duplicata, selecione o tipo correto para classificar no campo Filtro.</div>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Incluir?</th><th>Matr\u00EDcula</th><th>Nome</th><th>CPF</th><th>Classificar como</th></tr></thead>
        <tbody>
          ${duplicatas.map((c,i)=>`<tr>
            <td><input type="checkbox" id="dup-${i}" class="dup-check" data-idx="${i}" checked style="accent-color:var(--purple)"></td>
            <td><code>${c.mat||'\u2014'}</code></td>
            <td>${c.nome}</td>
            <td><code style="font-size:10px">${c.cpf||'\u2014'}</code></td>
            <td>
              <select id="dup-filtro-${i}" style="padding:4px 8px;border:1.5px solid var(--border);border-radius:4px;font-size:12px">
                <option value="OK" ${c.filtro==='OK'?'selected':''}>OK \u2014 CLT normal</option>
                <option value="DUP" ${c.filtro==='DUP'||!c.filtro?'selected':''}>DUP \u2014 CLT com MEI/S\u00F3cio</option>
                <option value="MEI" ${c.filtro==='MEI'?'selected':''}>MEI \u2014 Contrato MEI</option>
                <option value="SOC" ${c.filtro==='SOC'?'selected':''}>SOC \u2014 S\u00F3cio</option>
              </select>
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
  }

  // BOT\u00C3O APLICAR
  html+=`<div class="btn-row">
    <button class="btn btn-ghost" onclick="document.getElementById('import-preview').innerHTML=''">Cancelar</button>
    <button class="btn btn-primary" onclick="aplicarReconciliacao()">
      Aplicar alteracoes selecionadas
    </button>
  </div>`;

  prev.innerHTML=html;
  // Guardar arrays para uso no apply
  window._reconcIncluir=paraIncluir;
  window._reconcExcluir=paraExcluir;
  window._reconcDuplic=duplicatas;
}

function selecionarTodosIncluir(sel){
  document.querySelectorAll('.inc-check').forEach(cb=>cb.checked=sel);
}
function selecionarTodosExcluir(sel){
  document.querySelectorAll('.exc-check').forEach(cb=>cb.checked=sel);
}

async function aplicarReconciliacao(){
  const prev=document.getElementById('import-preview');
  const paraIncluir=window._reconcIncluir||[];
  const paraExcluir=window._reconcExcluir||[];
  const duplicatas=window._reconcDuplic||[];
  const dupIdxs=duplicatas.map((_,i)=>i);

  // Coletar selecionados para incluir
  const aIncluir=paraIncluir.filter((_,i)=>document.getElementById('inc-'+i)?.checked);
  // Coletar selecionados para excluir
  const aExcluir=paraExcluir.filter((_,i)=>document.getElementById('exc-'+i)?.checked);
  // Duplicatas marcadas para incluir com filtro selecionado
  const aDuplic=duplicatas.filter((_,i)=>document.getElementById('dup-'+i)?.checked).map((c,i)=>{
    const idx=dupIdxs[i];
    const filtroSel=document.getElementById('dup-filtro-'+i)?.value||'DUP';
    return {...c,filtro:filtroSel};
  });

  const b=window._writeBatch(window._db);
  let nInc=0,nExc=0,nDup=0;

  // Incluir novos
  [...aIncluir,...aDuplic].forEach(c=>{
    const id=c.mat||(c.nome.replace(/[^A-Za-z0-9]/g,'_').substr(0,20)+'_'+Date.now()+nInc);
    c._id=id;
    c.mobilidade=c.mobilidade||inferMob(c);
    b.set(window._doc('colaboradores',id),c);
    colaboradores.push(c);
    nInc++;
    if(aDuplic.includes(c)) nDup++;
  });

  // Excluir selecionados
  aExcluir.forEach(c=>{
    if(c._id){
      b.delete(window._doc('colaboradores',c._id));
      colaboradores=colaboradores.filter(x=>x._id!==c._id);
      nExc++;
    }
  });

  await b.commit();

  prev.innerHTML=`<div class="alert alert-success">
    \u2705 Reconcilia\u00E7\u00E3o conclu\u00EDda!<br>
    <strong>${nInc}</strong> inclu\u00EDdos (${nDup} duplicatas classificadas) \u00B7
    <strong>${nExc}</strong> exclu\u00EDdos \u00B7
    Base atual: <strong>${colaboradores.length}</strong> colaboradores
  </div>`;

  setSS('\u2705 '+colaboradores.length,'ok');
  toast('\u2705 Base reconciliada com sucesso!','success');
}

async function importarSemDuplic(){
  if(cargaPendente.length===0){toast('Nenhum novo colaborador.','warning');return;}
  const b=window._writeBatch(window._db); let n=0;
  cargaPendente.forEach(c=>{
    const id=c.mat||(c.nome.replace(/[^A-Za-z0-9]/g,'_').substr(0,20)+'_'+Date.now()+n);
    c._id=id; b.set(window._doc('colaboradores',id),c); colaboradores.push(c); n++;
  });
  await b.commit(); cargaPendente=[];
  document.getElementById('import-preview').innerHTML=`<div class="alert alert-success">\u2705 <strong>${n} colaboradores importados!</strong></div>`;
  toast('\u2705 '+n+' importados!','success');
}

function gerarModeloCarga(){
  const wb=XLSX.utils.book_new();
  const ws=XLSX.utils.aoa_to_sheet([
    ['Matr\u00EDcula','Nome','CPF','Cargo','Departamento','Status','Admiss\u00E3o','VR/dia','Caf\u00E9/dia','Combust\u00EDvel','Mobilidade'],
    ['10001234','EXEMPLO DA SILVA','123.456.789-00','MOTORISTA','Motoristas','Ativo','2023-01-15',0,0,295,'combustivel'],
    ['10001235','OUTRO EXEMPLO','234.567.890-11','AJUDANTE','Produ\u00E7\u00E3o','Ativo','2024-06-03',35,15,0,'vt'],
  ]);
  XLSX.utils.book_append_sheet(wb,ws,'Modelo');
  XLSX.writeFile(wb,'Modelo_Carga_Colaboradores.xlsx');
  toast('\u2705 Modelo baixado!','success');
}

// ============================================================
// C\u00C1LCULO DE BENEF\u00CDCIOS
// ============================================================
function getCfg(){
  return {
    vr:  document.querySelector('input[name="cfg-vr"]:checked')?.value||'mult',
    cafe:document.querySelector('input[name="cfg-cafe"]:checked')?.value||'fixo',
    comb:document.querySelector('input[name="cfg-comb"]:checked')?.value||'prop',
    vt:  document.querySelector('input[name="cfg-vt"]:checked')?.value||'mult',
  };
}

function calcBen(c, dr, du){
  const st = c.status||'Trabalhando';
  const grp = statusGrupo(st); // tolerante a variantes/acentos

  // Valor de cesta: fixo, configuravel por colaborador (padrao 185), gated por elegibilidade
  const cestaVal = (c.elegibilidade?.cesta!==false) ? (fnum(c.cesta)||CESTA_PADRAO) : 0;

  // Particulares (PART, rastreados por CPF): recebem APENAS cesta básica, nada mais.
  if((c.filtro||'').toUpperCase()==='PART'){
    const cVal = (grp==='nao_recebe') ? 0 : (fnum(c.cesta)||CESTA_PADRAO);
    return {vr:0,cafe:0,comb:0,vt:0,cesta:cVal};
  }

  const cfg=getCfg();
  const eleg=c.elegibilidade||{};
  const mob=inferMob(c);
  const elegVT = (eleg.vt!==undefined) ? eleg.vt : (eleg.mobilidade!==false); // retrocompat

  // Valores "cheios" de cada benefício (como se trabalhasse o período dr)
  const vVR  = (eleg.vr!==false&&fnum(c.vr)>0)    ? (cfg.vr==='mult'?fnum(c.vr)*dr:fnum(c.vr))     : 0;
  const vCafe= (eleg.cafe!==false&&fnum(c.cafe)>0)? (cfg.cafe==='mult'?fnum(c.cafe)*dr:fnum(c.cafe)) : 0;
  const vComb= (eleg.mobilidade!==false&&mob==='combustivel'&&fnum(c.comb)>0) ? (cfg.comb==='fixo'?fnum(c.comb):calcMob(fnum(c.comb),dr,du)) : 0;
  const vVT  = (elegVT&&mob==='vt') ? (cfg.vt==='mult'?calcVT(c,dr):calcVT(c,1)) : 0;

  // N/A e Demitido: nada — EXCETO Demitido com benefícios mantidos por X meses
  // (aviso prévio / acordo), definidos na tela ao mudar o status p/ Demitido.
  if(grp==='nao_recebe'){
    if(_statusKey(st).includes('DEMIT') && Array.isArray(c.demBen) && c.demBen.length && fnum(c.demMeses)>0 && c.demCompBase){
      const el=_mesesEntreComp(c.demCompBase, lanComp);
      if(el!=null && el>=0 && el<fnum(c.demMeses)){
        const db=c.demBen;
        return {
          vr:   db.includes('vr')?vVR:0,
          cafe: db.includes('cafe')?vCafe:0,
          comb: db.includes('comb')?vComb:0,
          vt:   db.includes('vt')?vVT:0,
          cesta:db.includes('cesta')?cestaVal:0
        };
      }
    }
    return {vr:0,cafe:0,comb:0,vt:0,cesta:0};
  }

  // Afastados: recebe só os benefícios marcados em afastBen (tela ao entrar em
  // afastamento). Sem afastBen (dados legados) = só cesta, regra antiga.
  if(grp==='so_cesta'){
    const ab=Array.isArray(c.afastBen)?c.afastBen:['cesta'];
    return {
      vr:   ab.includes('vr')?vVR:0,
      cafe: ab.includes('cafe')?vCafe:0,
      comb: ab.includes('comb')?vComb:0,
      vt:   ab.includes('vt')?vVT:0,
      cesta:ab.includes('cesta')?cestaVal:0
    };
  }

  // Férias: NÃO é mais caso especial aqui. Os dias de férias que caem na
  // competência entram no campo "férias" do Passo 5 (automático, via
  // feriasLancamento) e reduzem os dias úteis líquidos (dr). Cada benefício
  // segue a sua regra sobre dr: VR/VT/combustível reduzem; café/cesta (fixos)
  // seguem cheios. Cai no cálculo normal abaixo.

  // Trabalhando (e Férias, proporcional via dr): cálculo normal
  return {vr:vVR,cafe:vCafe,comb:vComb,vt:vVT,cesta:cestaVal};
}

function calcMob(val,dr,du){
  if(dr>=du) return val;
  const raw=(val/30)*dr;
  const fl=Math.floor(raw);
  return (raw-fl)<=0.5?fl:fl+1;
}

function calcVT(c,dr){ return [1,2,3,4].reduce((s,n)=>s+fnum(c['vt'+n])*fnum(c['v'+n]),0)*dr; }

function getLanDU(mat, defaultDU){
  // 1. Se tem diasFixos no cadastro, usa sempre esse valor
  const colab=colsApuracao().find(c=>c.mat===mat);
  if(colab?.diasFixos) return fnum(colab.diasFixos);
  // 2. Se foi definido manualmente no lancamento, usa esse
  const l=lancamento[mat]||{};
  return l.duteis!==undefined?fnum(l.duteis):defaultDU;
}
function getLanDR(mat, defaultDU){
  const du=getLanDU(mat,defaultDU);
  const l=lancamento[mat]||{};
  return Math.max(0,du-fnum(l.faltas)-feriasLancamento(mat,du)+fnum(l.extras));
}
// Dias de ferias do Passo 5: valor MANUAL se o usuario informou (l.ferias definido);
// senao, calculado automaticamente do periodo de ferias que cai na competencia.
function feriasLancamento(mat, du){
  const l=lancamento[mat]||{};
  if(l.ferias!==undefined && l.ferias!==null && l.ferias!=='') return fnum(l.ferias);
  const c=colsApuracao().find(x=>x.mat===mat);
  return c?feriasDiasUteisAuto(c, lanComp, du):0;
}
// Dias uteis de ferias na competencia (auto). Sem datas, mas status Ferias = mes inteiro
// (preserva o comportamento antigo de nao pagar VR cheio a quem esta de ferias).
function feriasDiasUteisAuto(c, comp, du){
  if(!c || c.elegibilidade?.ferias===false) return 0;
  if(c.ferInicio && c.ferFim) return feriasDiasUteisNaComp(c, comp);
  if(c.status==='Ferias'||c.status==='Férias') return fnum(du);
  return 0;
}

// ============================================================
// BENEF\u00CDCIOS: LAN\u00C7AMENTO MENSAL
// ============================================================
function pgBenLancamento(){
  // Conta apenas quem realmente aparece na apuração (mesmo filtro do getLanAtivos):
  // exclui Demitido/N/A e quem não é elegível a nenhum benefício. Assim o número
  // ao lado da empresa bate com o que o filtro mostra.
  const _base=colsApuracao().filter(c=>!STATUS_NAO_RECEBE.includes(c.status) && elegivelBeneficios(c));
  const empresas=(()=>{const gg={};_base.forEach(c=>{const p=_empresaKey(c);if(p)gg[p]=(gg[p]||0)+1;});return Object.keys(gg).sort((a,b)=>a==='PART'?1:(b==='PART'?-1:a.localeCompare(b))).map(p=>({cod:p,qtd:gg[p]}));})();
  const deptos=[...new Set(_base.map(c=>c.depto||'').filter(Boolean))].sort();
  const passos=[
    {n:1,label:'Importar base'},
    {n:2,label:'Competência e dias'},
    {n:3,label:'Faltas e extras'},
    {n:4,label:'Conferir e fechar'},
  ];
  const tabs='<div class="lan-tabs">'+passos.map(p=>{
    const cls=p.n===lanStep?' lan-tab--active':(p.n<lanStep?' lan-tab--done':'');
    return '<button class="lan-tab'+cls+'" onclick="lanIrPasso('+p.n+')"><span class="lan-tab__n">'+(p.n<lanStep?'✓':p.n)+'</span> '+p.label+'</button>';
  }).join('')+'</div>';
  const nav=(prev,next)=>'<div class="lan-navbtns">'
    +(prev?'<button class="btn btn-ghost btn-sm" onclick="lanIrPasso('+prev+')"><i class="ti ti-arrow-left"></i> Voltar</button>':'<span></span>')
    +(next?'<button class="btn btn-primary btn-sm" onclick="lanIrPasso('+next+')">Próximo <i class="ti ti-arrow-right"></i></button>':'<span></span>')
    +'</div>';
  const head=(n,t,d)=>'<div class="lan-step__head"><span class="lan-step__num">'+n+'</span><div><div class="lan-step__t">'+t+'</div><div class="lan-step__d">'+d+'</div></div></div>';
  const semBase='<div class="alert alert-warning" style="margin-bottom:12px"><i class="ti ti-alert-triangle"></i> Nenhuma base importada. Volte ao <strong>Passo 1</strong> para importar. <button class="btn btn-ghost btn-sm" style="margin-left:8px" onclick="lanIrPasso(1)">Ir ao Passo 1</button></div>';
  const temBase=!!baseApuracao;

  const filtros='<div class="filter-bar" style="align-items:flex-end;margin-bottom:12px">'
    +'<div class="filter-group" style="flex:1"><label>Buscar</label><input type="text" id="lan-q" placeholder="Nome ou matrícula..." oninput="renderLancamento()"></div>'
    +'<div class="filter-group"><label>Empresa</label>'+msDropdown('lemp','Empresa',empresas.map(e=>({value:e.cod,label:_empresaLabel(e.cod)+' ('+e.qtd+')'})),'renderLancamento')+'</div>'
    +'<div class="filter-group"><label>Departamento</label>'+msDropdown('ldep','Departamento',deptos.map(d=>({value:d,label:d})),'renderLancamento')+'</div>'
    +'<div class="filter-group"><label>Benefício</label>'+msDropdown('lben','Benefício',[{value:'vr',label:'VR'},{value:'cafe',label:'Café'},{value:'cesta',label:'Cesta'},{value:'comb',label:'Combustível'},{value:'vt',label:'VT'}],'renderLancamento')+'</div>'
    +'<button class="btn btn-ghost btn-sm" onclick="limparFiltrosLan()" title="Limpar filtros">Limpar</button>'
    +'<button class="btn btn-ghost btn-sm" onclick="exportarLancamentoExcel()"><i class="ti ti-file-spreadsheet"></i> Excel</button>'
    +'</div>';

  const tabela='<div class="tbl-wrap bl-scroll">'
    +'<table class="tbl launch-tbl"><thead><tr>'
    +'<th>Mat.</th><th>Nome</th>'
    +'<th title="Jornada: especial travada no cadastro, ou dias úteis do mês">Dias da Jornada</th><th title="Faltas do mês anterior (−)">Faltas</th><th title="Férias/abono comprados (−)">Férias</th><th title="Dias extras (+)">Extras</th><th title="Jornada + extras − faltas − férias = base do cálculo">Dias Úteis Líquidos</th>'
    +'<th>VR</th><th>Café</th><th>Cesta</th><th>Comb.</th><th>VT</th><th>Total</th>'
    +'</tr></thead><tbody id="lan-tbody"></tbody>'
    +'<tfoot id="lan-tfoot" style="display:none">'
    +'<tr class="total-row-label"><td colspan="7"> <span id="lan-tot-label"></span></td>'
    +'<td style="text-align:center">VR</td><td style="text-align:center">Café</td><td style="text-align:center">Cesta</td><td style="text-align:center">Comb.</td><td style="text-align:center">VT</td><td style="text-align:center">Total</td></tr>'
    +'<tr class="total-row"><td colspan="7"><span id="lan-tot-colab" style="font-size:11px;opacity:.8"></span></td>'
    +'<td id="lan-tot-vr" style="text-align:right"></td><td id="lan-tot-cafe" style="text-align:right"></td><td id="lan-tot-cesta" style="text-align:right"></td><td id="lan-tot-comb" style="text-align:right"></td><td id="lan-tot-vt" style="text-align:right"></td><td id="lan-tot-geral" style="text-align:right;font-size:13px;color:#86EFAC"></td></tr>'
    +'</tfoot></table></div>';

  // mini-tabela para os passos 2 (ferias) e 3 (afastados)
  const miniLista=(lista,tipo)=>{
    if(!lista.length) return '<div class="alert alert-info">'+(tipo==='ferias'?'Ninguém em férias nesta base.':'Ninguém afastado nesta base.')+'</div>';
    return '<div style="overflow-x:auto;border-radius:var(--radius);border:1px solid var(--border)">'
      +'<table class="tbl" style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>'
      +'<th style="padding:8px 10px;text-align:left">Colaborador</th><th style="padding:8px 10px;text-align:left">Departamento</th>'
      +(tipo==='ferias'?'<th style="padding:8px 10px;text-align:left">Situação</th><th style="padding:8px 10px;text-align:right">Dias comprados</th>':'<th style="padding:8px 10px;text-align:left">Motivo</th><th style="padding:8px 10px;text-align:center">Ação</th>')
      +'</tr></thead><tbody>'
      +lista.sort((a,b)=>(a.nome||'').localeCompare(b.nome||'')).map(c=>{
        const cel='<td style="padding:8px 10px"><div style="font-weight:500">'+c.nome+'</div><div class="text-xs text-muted"><code style="font-size:10px">'+(c.mat||'—')+'</code></div></td>'
          +'<td style="padding:8px 10px;font-size:11px;color:var(--text2)">'+(c.depto||'—')+'</td>';
        if(tipo==='ferias') return '<tr>'+cel+'<td style="padding:8px 10px"><span class="badge badge--warning">Férias</span></td><td style="padding:8px 10px;text-align:right;font-weight:600">'+(c.ferDiasComprados!=null?c.ferDiasComprados:0)+'d</td></tr>';
        return '<tr>'+cel+'<td style="padding:8px 10px"><span class="badge badge--danger">'+getStatusInfo(c.status).label+'</span></td>'
          +'<td style="padding:8px 10px;text-align:center"><button class="btn btn-ghost btn-sm" onclick="lanReativarAfastado(\''+c._id+'\')"><i class="ti ti-arrow-back-up"></i> Reativar</button></td></tr>';
      }).join('')+'</tbody></table></div>';
  };

  let corpo='';
  if(lanStep===1){
    corpo='<div class="lan-step">'
      +head(1,'Importar e conferir a base','A última base salva é importada automaticamente. Confira a <strong>versão</strong> e a <strong>data</strong>, e siga para a apuração — ou recarregue outra versão.')
      +'<div id="lan-base-info"></div>'
      +'</div>'
      +(temBase?('<div id="lan-resumo" style="margin-bottom:12px"></div>'+filtros):'');
  } else if(lanStep===2){
    corpo='<div class="lan-step">'
      +head(2,'Competência e dias úteis','Defina o mês/ano e os dias úteis e aplique à tabela importada (exceto jornadas travadas no cadastro).')
      +'<div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">'
        +'<div class="fg"><label>Mês/Ano</label><input type="text" id="lan-comp" placeholder="MM/AAAA" style="width:120px" value="'+lanComp+'" onchange="onLanCompChange(this.value)"></div>'
        +'<div class="fg"><label>Dias úteis do mês</label><input type="number" id="lan-du" value="'+lanDU+'" min="1" max="31" style="width:100px" onchange="setLanDU(this.value);renderLancamento()"></div>'
        +'<button class="btn btn-primary btn-sm" onclick="aplicarDiasUteis()">Aplicar a todos</button>'
      +'</div>'
      +nav(1,3)+'</div>';
  } else if(lanStep===3){
    corpo='<div class="lan-step">'
      +head(3,'Faltas e dias extras (manual)','Preencha, na tabela abaixo, as <strong>faltas</strong> e os <strong>dias extras</strong> de cada colaborador. Faltas e férias descontam; extras somam. As <strong>férias</strong> vêm automáticas do período cadastrado na Base.')
      +nav(2,4)+'</div>'
      +'<div id="lan-resumo" style="margin-bottom:12px"></div>'+filtros;
  } else {
    corpo='<div class="lan-step">'
      +head(4,'Conferir, fechar e exportar','Confira o benefício na tabela, feche a competência e gere os arquivos de exportação.')
      +'<div class="lan-sub"><div class="lan-sub__t">4.1 · Escolha o benefício</div>'
        +'<div class="lan-sub__d">Escolha o benefício que deseja executar — a tabela abaixo mostra só ele, com os totais.</div>'
        +'<select id="lan-fechar-ben" onchange="onLanStep4Ben(this.value)" style="padding:7px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px;max-width:300px">'
        +[['vt','Vale Transporte'],['comb','Combustível (Mobilidade)'],['cesta','Cesta Básica'],['vr','Vale Refeição'],['cafe','Café da Manhã'],['todos','Todos (só Histórico)']].map(o=>'<option value="'+o[0]+'"'+(lanStep4Ben===o[0]?' selected':'')+'>'+o[1]+'</option>').join('')
        +'</select></div>'
      +'<div class="lan-sub"><div class="lan-sub__t">4.2 · Fechar competência</div>'
        +'<div class="lan-sub__d">Feche a competência para salvar o histórico no sistema.</div>'
        +'<button class="btn btn-success btn-sm" onclick="fecharCompetencia()"><i class="ti ti-lock"></i> Fechar competência</button></div>'
      +'<div class="lan-sub"><div class="lan-sub__t">4.3 · Exportar arquivos</div>'
        +'<div class="lan-sub__d">Gere os arquivos de exportação para o sistema de pagamento (VT → Via Nova; demais → Caju) e para a Senior.</div>'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary btn-sm" id="lan-btn-export3" onclick="exportarPedidoBenef()"><i class="ti ti-download"></i> Exportar (pagamento)</button>'
        +'<button class="btn btn-warning btn-sm" onclick="exportarSeniorBenef()"><i class="ti ti-download"></i> Exportar Senior</button></div></div>'
      +'<div class="lan-navbtns"><button class="btn btn-ghost btn-sm" onclick="lanIrPasso(3)"><i class="ti ti-arrow-left"></i> Voltar</button><span></span></div>'
      +'</div>'
      +'<div id="lan-resumo" style="margin-bottom:12px"></div>';
  }

  return `
   <div class="bl-page">
    <div style="flex:0 0 auto">
      <div class="page-header" style="margin-bottom:10px">
        <h2 class="page-title">Lançamento Mensal</h2>
        <p class="page-subtitle">Siga os passos para apurar e fechar os benefícios do mês.</p>
      </div>
      ${tabs}
      ${corpo}
    </div>
    ${(temBase && (lanStep===1||lanStep===3||lanStep===4))?tabela:''}
   </div>`;
}
function lanIrPasso(n){ lanStep=n; showPage('ben-lancamento'); }
function onLanStep4Ben(v){ lanStep4Ben=v; try{ atualizarBotoesExport(); }catch(e){} renderLancamento(); }
async function lanReativarAfastado(id){
  const cLive=colaboradores.find(x=>x._id===id);
  if(cLive){ cLive.status='Trabalhando'; try{ await fsSet('colaboradores',cLive._id,cLive); }catch(e){ toast('Erro: '+e.message,'error'); return; } }
  if(baseApuracao&&Array.isArray(baseApuracao.colaboradores)){
    const cb=baseApuracao.colaboradores.find(x=>x._id===id||(cLive&&x.cpf&&x.cpf===cLive.cpf));
    if(cb) cb.status='Trabalhando';
  }
  toast((cLive?cLive.nome:'Colaborador')+' reativado (Trabalhando).','success');
  showPage('ben-lancamento');
}

// ── Passo 2/3: listas de férias e afastados com busca/filtro ─────
function _lanEmpresasDe(lista){ return [...new Set(lista.map(c=>_empresaKey(c)).filter(Boolean))].sort((a,b)=>a==='PART'?1:(b==='PART'?-1:a.localeCompare(b))); }
function _lanFiltraLista(grupo, qId, empId){
  const q=(document.getElementById(qId)?.value||'').toLowerCase().trim();
  const emp=document.getElementById(empId)?.value||'';
  return colsApuracao().filter(c=>statusGrupo(c.status)===grupo).filter(c=>{
    if(q && !((c.nome||'').toLowerCase().includes(q)||(c.mat||'').toLowerCase().includes(q)||(c.depto||'').toLowerCase().includes(q))) return false;
    if(emp && !_empresaMatch(c,[emp])) return false;
    return true;
  }).sort((a,b)=>(a.nome||'').localeCompare(b.nome||''));
}
function _lanFerRows(lista){
  if(!lista.length) return '<tr><td colspan="6" style="padding:14px;text-align:center;color:var(--text-muted)">Ninguém em férias com os filtros atuais.</td></tr>';
  return lista.slice().sort((a,b)=>(a.nome||'').localeCompare(b.nome||'')).map(c=>
    '<tr><td><div style="font-weight:500">'+c.nome+'</div><div class="text-xs text-muted"><code style="font-size:10px">'+(c.mat||'—')+'</code></div></td>'
    +'<td class="text-sm">'+(c.depto||'—')+'</td>'
    +'<td class="text-sm">'+_empresaLabel(_empresaKey(c))+'</td>'
    +'<td><span class="badge badge--warning">Férias</span></td>'
    +'<td style="text-align:right;font-weight:600">'+(c.ferDiasComprados!=null?c.ferDiasComprados:0)+'d</td>'
    +'<td style="text-align:center"><button class="btn btn-ghost btn-sm" onclick="abrirDetalheFerias(\''+c._id+'\')"><i class="ti ti-edit"></i> Editar</button></td></tr>'
  ).join('');
}
function _lanAfaRows(lista){
  if(!lista.length) return '<tr><td colspan="5" style="padding:14px;text-align:center;color:var(--text-muted)">Ninguém afastado com os filtros atuais.</td></tr>';
  return lista.slice().sort((a,b)=>(a.nome||'').localeCompare(b.nome||'')).map(c=>
    '<tr><td><div style="font-weight:500">'+c.nome+'</div><div class="text-xs text-muted"><code style="font-size:10px">'+(c.mat||'—')+'</code></div></td>'
    +'<td class="text-sm">'+(c.depto||'—')+'</td>'
    +'<td class="text-sm">'+_empresaLabel(_empresaKey(c))+'</td>'
    +'<td><span class="badge badge--danger">'+getStatusInfo(c.status).label+'</span></td>'
    +'<td style="text-align:center;white-space:nowrap"><button class="btn btn-ghost btn-sm" onclick="abrirEditar(\''+c._id+'\')"><i class="ti ti-edit"></i> Editar</button> '
      +'<button class="btn btn-ghost btn-sm" onclick="lanReativarAfastado(\''+c._id+'\')"><i class="ti ti-arrow-back-up"></i> Reativar</button></td></tr>'
  ).join('');
}
function renderLanFerList(){ const el=document.getElementById('lan-fer-tbody'); if(el) el.innerHTML=_lanFerRows(_lanFiltraLista('ferias','lf2-q','lf2-emp')); }
function renderLanAfaList(){ const el=document.getElementById('lan-afa-tbody'); if(el) el.innerHTML=_lanAfaRows(_lanFiltraLista('so_cesta','lf3-q','lf3-emp')); }

// ── Incluir colaborador em férias / afastados (muda base + controle férias) ──
function abrirIncluirStatus(tipo){
  const cands=colsApuracao().filter(c=>statusGrupo(c.status)==='trabalhando').sort((a,b)=>(a.nome||'').localeCompare(b.nome||''));
  document.getElementById('modal-incluir-status')?.remove();
  const titulo = tipo==='ferias'?'Incluir colaborador em férias':'Incluir colaborador afastado';
  const rows = cands.length ? cands.map(c=>'<div class="incl-row" onclick="aplicarIncluirStatus(\''+c._id+'\',\''+tipo+'\')" style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;cursor:pointer" data-busca="'+((c.nome||'')+' '+(c.mat||'')+' '+(c.depto||'')).toLowerCase().replace(/"/g,'')+'"><div><div style="font-weight:600">'+c.nome+'</div><div class="text-xs text-muted"><code style="font-size:10px">'+(c.mat||'—')+'</code> · '+(c.depto||'—')+'</div></div><span class="btn btn-ghost btn-sm"><i class="ti ti-plus"></i></span></div>').join('') : '<div class="empty-state"><p>Nenhum colaborador trabalhando disponível.</p></div>';
  const html='<div class="modal-overlay ds open" id="modal-incluir-status" data-dynamic="1" onclick="if(event.target===this)this.remove()">'
    +'<div class="modal" style="max-width:520px"><div class="modal-title">'+titulo+'</div>'
    +'<div class="modal-sub">Selecione o colaborador. A mudança vale na Base de Colaboradores e no Controle de Férias.</div>'
    +'<input type="text" id="incl-q" placeholder="Buscar nome, matrícula ou departamento..." oninput="filtrarIncluir()" style="width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px;margin:10px 0">'
    +'<div id="incl-lista" style="max-height:50vh;overflow:auto">'+rows+'</div>'
    +'<div class="modal-footer"><button class="btn btn-ghost" onclick="document.getElementById(\'modal-incluir-status\').remove()">Fechar</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}
function filtrarIncluir(){
  const q=(document.getElementById('incl-q')?.value||'').toLowerCase();
  document.querySelectorAll('#incl-lista .incl-row').forEach(r=>{ r.style.display=(!q||(r.dataset.busca||'').includes(q))?'':'none'; });
}
async function aplicarIncluirStatus(id,tipo){
  const cLive=colaboradores.find(x=>x._id===id); if(!cLive) return;
  cLive.status = tipo==='ferias'?'Ferias':'Afastado';
  if(tipo==='afastado' && !(Array.isArray(cLive.afastBen)&&cLive.afastBen.length)) cLive.afastBen=['cesta'];
  try{ await fsSet('colaboradores',id,cLive); }catch(e){ toast('Erro: '+e.message,'error'); return; }
  if(baseApuracao&&Array.isArray(baseApuracao.colaboradores)){
    const cb=baseApuracao.colaboradores.find(x=>x._id===id||(x.cpf&&x.cpf===cLive.cpf));
    if(cb){ cb.status=cLive.status; if(tipo==='afastado') cb.afastBen=cLive.afastBen; }
  }
  document.getElementById('modal-incluir-status')?.remove();
  toast(cLive.nome+' incluído em '+(tipo==='ferias'?'férias':'afastados')+'.','success');
  showPage('ben-lancamento');
}

function popularLanFiltros(){
  const hoje=new Date();
  const elComp=document.getElementById('lan-comp');
  if(elComp&&!elComp.value)
    elComp.value=String(hoje.getMonth()+1).padStart(2,'0')+'/'+hoje.getFullYear();
  // Verificar colaboradores em ferias e exibir alerta
  setTimeout(()=>verificarColabsEmFerias(), 300);
}

// ============================================================
// BASES SALVAS POR COMPETENCIA (log versionado) + IMPORT p/ apuracao
// ============================================================
async function loadBasesSalvas(){
  try{
    const snap=await window._getDocs(window._col('basesSalvas'));
    basesSalvasList=[]; snap.forEach(d=>basesSalvasList.push(Object.assign({_id:d.id},d.data())));
    basesSalvasList.sort((a,b)=>String(b.salvoEm||'').localeCompare(String(a.salvoEm||'')));
  }catch(e){ console.error('Erro basesSalvas:',e); }
  return basesSalvasList;
}

// Grava uma versao da base em 'basesSalvas' para a competencia MM/AAAA.
async function salvarBaseComp(comp, silent){
  if(!/^\d{2}\/\d{4}$/.test(comp)){ toast('Competência inválida (use MM/AAAA).','error'); return false; }
  if(!colaboradores.length){ toast('Base vazia — nada para salvar.','error'); return false; }
  const id=comp.replace('/','_')+'__'+Date.now();
  const payload={
    competencia:comp,
    salvoEm:new Date().toISOString(),
    salvoPor:(usuarioAtual&&(usuarioAtual.email||usuarioAtual.nome))||'',
    totalColaboradores:colaboradores.length,
    colaboradores:colaboradores.map(c=>Object.assign({},c))
  };
  try{
    await fsSet('basesSalvas',id,payload);
    await loadBasesSalvas();
    if(currentPage==='base-versoes') renderBasesSalvas();
    if(!silent) toast('Base de '+comp+' salva ('+colaboradores.length+' colaboradores).','success');
    return true;
  }catch(e){ toast('Erro ao salvar base: '+e.message,'error'); return false; }
}
async function salvarBaseCompetencia(){
  const comp=(document.getElementById('bsv-comp')?.value||'').trim();
  if(!/^\d{2}\/\d{4}$/.test(comp)){ toast('Informe a competência no formato MM/AAAA.','error'); return; }
  if(!confirm('Salvar uma nova versão da base ('+colaboradores.length+' colaboradores) para '+comp+'?')) return;
  await salvarBaseComp(comp);
}

function excluirBaseSalva(id,label){ abrirExcluirHistorico('basesSalvas',id,'Base '+(label||'')+' (histórico)','base'); }

function pgBaseVersoes(){
  const hoje=new Date();
  const compHoje=String(hoje.getMonth()+1).padStart(2,'0')+'/'+hoje.getFullYear();
  return `
    <div class="page-header"><h2 class="page-title">Históricos</h2>
      <p class="page-subtitle">Versões congeladas da base por competência. A apuração de benefícios parte de uma dessas versões.</p></div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Salvar versão da base</div>
      <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">
        <div class="fg"><label>Competência (MM/AAAA)</label><input type="text" id="bsv-comp" value="${compHoje}" placeholder="MM/AAAA" style="width:120px"></div>
        <button class="btn btn-success btn-sm" onclick="salvarBaseCompetencia()">&#128190; Salvar base atual</button>
      </div>
      <div class="text-xs text-muted" style="margin-top:8px">Grava um snapshot de toda a base de colaboradores atual, com data/hora. Cada salvamento gera uma nova versão (o log mantém o histórico).</div>
    </div>
    <div id="bsv-lista"></div>`;
}

function renderBasesSalvas(){
  const el=document.getElementById('bsv-lista'); if(!el) return;
  if(!basesSalvasList.length){ el.innerHTML='<div class="empty-state"><div class="empty-icon">🗂️</div><p>Nenhuma base salva ainda.</p></div>'; return; }
  const latestId=basesSalvasList[0]?._id;
  el.innerHTML='<div style="font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Log de versões</div>'
    +basesSalvasList.map(b=>{
      const dt=b.salvoEm?new Date(b.salvoEm).toLocaleString('pt-BR'):'';
      const atual=b._id===latestId?' <span class="badge badge-green" style="font-size:10px">mais recente</span>':'';
      return '<div class="card" style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">'
        +'<div><div style="font-weight:700;color:var(--blue)">'+b.competencia+atual+'</div>'
        +'<div class="text-xs text-muted">'+dt+' · '+(b.totalColaboradores||0)+' colaboradores'+(b.salvoPor?' · '+b.salvoPor:'')+'</div></div>'
        +'<button class="btn btn-danger btn-xs" onclick="excluirBaseSalva(\''+b._id+'\',\''+String(b.competencia||'').replace(/'/g,'')+'\')">Excluir</button>'
        +'</div></div>';
    }).join('');
}

// ── Import da base para a apuracao (no Lancamento Mensal) ─────────
function renderBaseApuracaoInfo(){
  const el=document.getElementById('lan-base-info'); if(!el) return;
  if(baseApuracao){
    const dt=baseApuracao.salvoEm?new Date(baseApuracao.salvoEm).toLocaleString('pt-BR'):'—';
    const n=baseApuracao.totalColaboradores||(baseApuracao.colaboradores||[]).length;
    const latest=basesSalvasList[0];
    const desatualizada = latest && latest._id!==baseApuracao._id && String(latest.salvoEm||'')>String(baseApuracao.salvoEm||'');
    el.innerHTML='<div class="alert alert-success" style="display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;margin-bottom:12px">'
      +'<span><i class="ti ti-database-import"></i> <strong>Base importada automaticamente</strong></span>'
      +'<span>Versão: <strong>'+baseApuracao.competencia+'</strong></span>'
      +'<span>Data da versão: <strong>'+dt+'</strong></span>'
      +'<span>'+n+' colaboradores</span></div>'
      +(desatualizada?'<div class="alert alert-warning" style="margin-bottom:12px"><i class="ti ti-alert-triangle"></i> Existe uma versão mais recente da base ('+(latest.salvoEm?new Date(latest.salvoEm).toLocaleString('pt-BR'):'')+'). '
        +'<button class="btn btn-warning btn-sm" style="margin-left:8px" onclick="importarBaseApuracao(\''+latest._id+'\')">Usar a mais recente</button></div>':'')
      +'<div class="lan-navbtns"><button class="btn btn-ghost btn-sm" onclick="abrirImportarBase()"><i class="ti ti-refresh"></i> Recarregar nova base</button>'
      +'<button class="btn btn-primary btn-sm" onclick="lanIrPasso(2)">Confirmar e avançar <i class="ti ti-arrow-right"></i></button></div>';
  } else {
    el.innerHTML='<div class="alert alert-warning" style="margin-bottom:12px"><i class="ti ti-alert-triangle"></i> Nenhuma base salva encontrada. Salve uma versão em <strong>Base de Colaboradores → Históricos</strong>.'
      +'<button class="btn btn-primary btn-sm" style="margin-left:8px" onclick="abrirImportarBase()">Importar base</button></div>';
  }
}

// Importa automaticamente a última base salva quando ainda não há base na apuração.
// Retorna true se importou algo agora (para re-montar a página com a tabela).
async function lanAutoImportBase(){
  if(baseApuracao) return false;
  if(!basesSalvasList.length){ try{ await loadBasesSalvas(); }catch(e){} }
  const latest=basesSalvasList[0];
  if(latest){ baseApuracao=latest; setLanComp(latest.competencia); try{ await loadLancamento(); }catch(e){} return true; }
  return false;
}

async function abrirImportarBase(){
  await loadBasesSalvas();
  document.getElementById('modal-importar-base')?.remove();
  const latestId=basesSalvasList[0]?._id;
  const linhas = basesSalvasList.length
    ? basesSalvasList.map(b=>{
        const dt=b.salvoEm?new Date(b.salvoEm).toLocaleString('pt-BR'):'';
        const tag=b._id===latestId?' <span class="badge badge-green" style="font-size:10px">mais recente</span>':'';
        return '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;border:1px solid var(--border);border-radius:8px;padding:8px 10px;margin-bottom:6px">'
          +'<div><div style="font-weight:700">'+b.competencia+tag+'</div><div class="text-xs text-muted">'+dt+' · '+(b.totalColaboradores||0)+' colaboradores</div></div>'
          +'<button class="btn btn-primary btn-sm" onclick="importarBaseApuracao(\''+b._id+'\')">Importar</button></div>';
      }).join('')
    : '<div class="empty-state"><p>Nenhuma base salva. Salve uma versão em <strong>Base → Bases Salvas</strong>.</p></div>';
  const html='<div class="modal-overlay open" id="modal-importar-base" data-dynamic="1" onclick="if(event.target===this)this.remove()">'
    +'<div class="modal" style="max-width:560px"><div class="modal-title">Importar base de colaboradores</div>'
    +'<div class="modal-sub">Escolha a versão salva que servirá de base para a apuração.</div>'
    +'<div style="max-height:50vh;overflow:auto;margin-top:10px">'+linhas+'</div>'
    +'<div class="modal-footer"><button class="btn btn-ghost" onclick="document.getElementById(\'modal-importar-base\').remove()">Fechar</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function importarBaseApuracao(id){
  const b=basesSalvasList.find(x=>x._id===id); if(!b){ toast('Versão não encontrada.','error'); return; }
  const latestId=basesSalvasList[0]?._id;
  if(id!==latestId){
    const dt=b.salvoEm?new Date(b.salvoEm).toLocaleString('pt-BR'):'';
    if(!confirm('Esta NÃO é a versão mais recente salva.\n\nSeguir mesmo assim com a base de '+b.competencia+' ('+dt+')?')) return;
  }
  baseApuracao=b;
  setLanComp(b.competencia);
  document.getElementById('modal-importar-base')?.remove();
  toast('Base importada: '+b.competencia+' ('+(b.totalColaboradores||(b.colaboradores||[]).length)+' colaboradores).','success');
  // Carrega o lancamento DESSA competencia (começa limpo se for nova) e re-renderiza.
  loadLancamento().then(()=>{ if(currentPage==='ben-lancamento') showPage('ben-lancamento'); });
}

function verificarColabsEmFerias(){
  const area=document.getElementById('ferias-alert-area');
  if(!area) return;
  const hoje=new Date();
  const base=colsApuracao();
  const pendentes=base.filter(c=>feriasSituacao(c,hoje)==='retorno_pendente');
  const emFerias=base.filter(c=>feriasSituacao(c,hoje)==='em_ferias');
  if(!pendentes.length && !emFerias.length){ area.innerHTML=''; return; }

  let html='<div style="background:#FEF3C7;border:1.5px solid #FDE68A;border-radius:var(--radius);padding:14px 18px;margin-bottom:14px">';

  if(pendentes.length){
    html+=`<div style="font-weight:700;font-size:14px;color:#92400E;margin-bottom:4px">Retorno pendente: ${pendentes.length} colaborador${pendentes.length>1?'es':''} j\u00E1 deveria${pendentes.length>1?'m':''} ter voltado</div>`
      +`<div style="font-size:12px;color:#92400E;margin-bottom:10px">A data de t\u00E9rmino j\u00E1 passou. Confirme quem tirou as f\u00E9rias (volta a Trabalhando) ou marque quem <strong>n\u00E3o</strong> tirou (cancela o per\u00EDodo).</div>`
      +'<div style="display:flex;flex-direction:column;gap:6px;max-height:220px;overflow-y:auto">'
      +pendentes.map((c,i)=>`<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;background:rgba(255,255,255,.6);padding:6px 10px;border-radius:6px">
          <input type="checkbox" id="fer-retorno-${i}" data-id="${c._id}" checked style="accent-color:var(--blue);width:15px;height:15px">
          <strong>${c.nome}</strong>
          <span style="color:var(--text2);font-size:11px">${c.mat||''} | ${c.depto||''}</span>
          ${c.ferInicio&&c.ferFim?'<span style="font-size:11px;color:var(--text2)">'+_ddmm(_dataLocal(c.ferInicio))+'\u2192'+_ddmm(_dataLocal(c.ferFim))+'</span>':''}
        </label>`).join('')
      +'</div>'
      +'<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">'
        +'<button class="btn btn-primary btn-sm" onclick="retornarColabsFerias(false)">Confirmar retorno (tiraram)</button>'
        +'<button class="btn btn-ghost btn-sm" onclick="retornarColabsFerias(true)">N\u00E3o tiraram (cancelar f\u00E9rias)</button>'
        +'<button class="btn btn-ghost btn-sm" onclick="selecionarTodosRetorno(true)">Todos</button>'
        +'<button class="btn btn-ghost btn-sm" onclick="selecionarTodosRetorno(false)">Nenhum</button>'
      +'</div>';
  }

  if(emFerias.length){
    html+=`<div style="font-size:12px;color:#92400E;margin-top:${pendentes.length?'14px':'0'};padding-top:${pendentes.length?'10px':'0'};${pendentes.length?'border-top:1px solid #FDE68A;':''}">`
      +`<strong>Em f\u00E9rias agora (${emFerias.length}):</strong> `
      +emFerias.map(c=>`${c.nome}${c.ferFim?' (at\u00E9 '+_ddmm(_dataLocal(c.ferFim))+')':''}`).join(' &middot; ')
      +'</div>';
  }

  html+='</div>';
  area.innerHTML=html;
}

function selecionarTodosRetorno(sel){
  document.querySelectorAll('[id^="fer-retorno-"]').forEach(cb=>cb.checked=sel);
}

// naoTirou=false: confirmou que tirou -> volta a Trabalhando, fecha o per\u00EDodo (mant\u00E9m o log).
// naoTirou=true: n\u00E3o tirou -> cancela as f\u00E9rias, restaura o saldo abatido e limpa o per\u00EDodo.
async function retornarColabsFerias(naoTirou){
  const checks=document.querySelectorAll('[id^="fer-retorno-"]:checked');
  if(checks.length===0){toast('Nenhum colaborador selecionado','error');return;}
  const b=window._writeBatch(window._db);
  let n=0;
  checks.forEach(cb=>{
    const c=colaboradores.find(x=>x._id===cb.dataset.id);
    if(!c) return;
    c.status='Trabalhando';
    const log=Array.isArray(c.feriasLog)?c.feriasLog.slice():[];
    if(naoTirou){
      const ult=[...log].reverse().find(l=>l.tipo==='entrada');
      if(ult) c.ferSaldo=fnum(c.ferSaldo)+fnum(ult.gozados)+fnum(ult.comprados)+fnum(ult.faltas);
      log.push({tipo:'cancelado', inicio:c.ferInicio||'', fim:c.ferFim||'', em:new Date().toISOString(), por:(usuarioAtual&&(usuarioAtual.email||usuarioAtual.nome))||''});
    } else {
      log.push({tipo:'retorno', inicio:c.ferInicio||'', fim:c.ferFim||'', em:new Date().toISOString(), por:(usuarioAtual&&(usuarioAtual.email||usuarioAtual.nome))||''});
    }
    c.feriasLog=log;
    c.ferInicio=''; c.ferFim=''; c.ferDiasComprados=0;
    b.set(window._doc('colaboradores',c._id),c);
    n++;
  });
  await b.commit();
  toast(n+' colaborador'+(n>1?'es':'')+(naoTirou?' \u2014 f\u00E9rias canceladas':' de volta ao trabalho')+'.','success');
  const area=document.getElementById('ferias-alert-area'); if(area) area.innerHTML='';
  renderLancamento();
}

function limparFiltrosLan(){
  const q=document.getElementById('lan-q'); if(q) q.value='';
  document.querySelectorAll('.ms-lemp,.ms-ldep,.ms-lben').forEach(cb=>cb.checked=false);
  renderLancamento();
}

// Elegível a algum benefício (VR, Café, Cesta, Mobilidade/Comb. ou VT)
function elegivelBeneficios(c){
  // Particulares (filtro PART, rastreados por CPF) recebem APENAS cesta básica.
  if((c.filtro||'').toUpperCase()==='PART') return true;
  const e=c.elegibilidade||{};
  const tr=elegTransporte(c);
  const vr   = e.vr!==undefined?e.vr:fnum(c.vr)>0;
  const cafe = e.cafe!==undefined?e.cafe:fnum(c.cafe)>0;
  const cesta= e.cesta!==false;
  return !!(vr||cafe||cesta||tr.mob||tr.vt);
}

function lanBenMatch(c,b){
  if(b==='vr') return fnum(c.vr)>0&&c.elegibilidade?.vr!==false;
  if(b==='cafe') return fnum(c.cafe)>0&&c.elegibilidade?.cafe!==false;
  if(b==='cesta') return (c.elegibilidade?.cesta!==false) || (c.filtro||'').toUpperCase()==='PART';
  if(b==='comb') return fnum(c.comb)>0&&inferMob(c)==='combustivel';
  if(b==='vt') return inferMob(c)==='vt'&&[1,2,3,4].some(n=>fnum(c['vt'+n])>0);
  return true;
}

function getLanAtivos(){
  const q=(g('lan-q')||'').toLowerCase();
  const emp=getMs('lemp'), dep=getMs('ldep');
  let ben=getMs('lben');
  if(lanStep===4 && lanStep4Ben && lanStep4Ben!=='todos') ben=[lanStep4Ben];
  let f=colsApuracao().filter(c=>!STATUS_NAO_RECEBE.includes(c.status) && elegivelBeneficios(c));
  if(emp.length) f=f.filter(c=>_empresaMatch(c,emp));
  if(q) f=f.filter(c=>c.nome.toLowerCase().includes(q)||(c.mat||'').toLowerCase().includes(q));
  if(dep.length) f=f.filter(c=>dep.includes(c.depto||''));
  if(ben.length) f=f.filter(c=>ben.some(b=>lanBenMatch(c,b)));
  return f;
}

function renderLancamento(){
  bindMsOutside();
  updateMsCounts();
  atualizarBotoesExport();
  renderBaseApuracaoInfo();
  // Apuracao exige uma base importada (congelada) antes de comecar.
  if(!baseApuracao){
    const tb=document.getElementById('lan-tbody');
    if(tb) tb.innerHTML='<tr><td colspan="13"><div class="empty-state"><div class="empty-icon">📥</div><p>Importe uma base salva para iniciar a apuração.<br><button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="abrirImportarBase()">Importar base de colaboradores</button></p></div></td></tr>';
    const tf=document.getElementById('lan-tfoot'); if(tf) tf.style.display='none';
    const rs=document.getElementById('lan-resumo'); if(rs) rs.innerHTML='';
    return;
  }
  const du=lanDU;
  const ativos=getLanAtivos();
  let tVR=0,tCafe=0,tCesta=0,tComb=0,tVT=0;
  const _pk=c=>(c.cpf||'').replace(/[^0-9]/g,'')||('nome:'+_normNome(c.nome));
  const sVR=new Set(),sCafe=new Set(),sCesta=new Set(),sComb=new Set(),sVT=new Set(),sTot=new Set();
  ativos.forEach(c=>{
    const dr=getLanDR(c.mat,du);
    const {vr,cafe,comb,vt,cesta}=calcBen(c,dr,getLanDU(c.mat,du));
    tVR+=vr;tCafe+=cafe;tCesta+=cesta;tComb+=comb;tVT+=vt;
    const k=_pk(c); sTot.add(k);
    if(vr>0)sVR.add(k); if(cafe>0)sCafe.add(k); if(cesta>0)sCesta.add(k); if(comb>0)sComb.add(k); if(vt>0)sVT.add(k);
  });
  const nVR=sVR.size,nCafe=sCafe.size,nCesta=sCesta.size,nComb=sComb.size,nVT=sVT.size;
  const tfoot=document.getElementById('lan-tfoot');
  if(tfoot){
    tfoot.style.display=ativos.length>0?'table-footer-group':'none';
    const totalAtivos=colsApuracao().filter(c=>c.status!=='Inativo'&&elegivelBeneficios(c)).length;
    document.getElementById('lan-tot-label').textContent=ativos.length===totalAtivos?'Totais do mês':`Seleção (${ativos.length})`;
    document.getElementById('lan-tot-colab').textContent=`${ativos.length} colaborador${ativos.length!==1?'es':''}`;
    document.getElementById('lan-tot-vr').textContent=tVR>0?brl(tVR):'—';
    document.getElementById('lan-tot-cafe').textContent=tCafe>0?brl(tCafe):'—';
    document.getElementById('lan-tot-cesta').textContent=tCesta>0?brl(tCesta):'—';
    document.getElementById('lan-tot-comb').textContent=tComb>0?brl(tComb):'—';
    document.getElementById('lan-tot-vt').textContent=tVT>0?brl(tVT):'—';
    document.getElementById('lan-tot-geral').textContent=brl(tVR+tCafe+tCesta+tComb+tVT);
  }
  const resumo=document.getElementById('lan-resumo');
  if(resumo){
    const item=(label,n,tot,cor)=>`<div style="flex:1;min-width:135px;background:var(--surface);border:1px solid var(--border);border-left:3px solid ${cor};border-radius:var(--radius);padding:9px 12px">
      <div style="font-size:10px;color:var(--text2);text-transform:uppercase;font-weight:700;letter-spacing:.3px">${label}</div>
      <div style="font-size:15px;font-weight:700;color:${cor}">${brl(tot)}</div>
      <div style="font-size:11px;color:var(--text3)">${n} colaborador${n!==1?'es':''}</div>
    </div>`;
    resumo.innerHTML='<div style="display:flex;gap:10px;flex-wrap:wrap">'
      +item('Vale Refeição',nVR,tVR,'var(--orange)')
      +item('Café da Manhã',nCafe,tCafe,'var(--yellow)')
      +item('Cesta Básica',nCesta,tCesta,'var(--green)')
      +item('Combustível',nComb,tComb,'var(--orange)')
      +item('Vale Transporte',nVT,tVT,'var(--blue)')
      +item('Total Geral',sTot.size,tVR+tCafe+tCesta+tComb+tVT,'var(--green)')
      +'</div>';
  }
  const tbody=document.getElementById('lan-tbody'); if(!tbody) return;
  if(ativos.length===0){
    tbody.innerHTML=`<tr><td colspan="13"><div class="empty-state"><div class="empty-icon"></div><p>Nenhum resultado.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML=ativos.map((c,i)=>{
    const l=lancamento[c.mat]||{};
    const locked=!!c.diasFixos;
    const du2=getLanDU(c.mat,du);
    const fat=fnum(l.faltas),fev=feriasLancamento(c.mat,du2),ext=fnum(l.extras);
    const ferAuto=(l.ferias===undefined||l.ferias===null||l.ferias==='');
    const dr=getLanDR(c.mat,du);
    const {vr,cafe,comb,vt,cesta}=calcBen(c,dr,du2);
    const total=vr+cafe+comb+vt+cesta;
    const duCell = locked
      ? `<span style="display:inline-flex;align-items:center;gap:4px;font-weight:700;color:var(--blue)" title="Jornada travada no cadastro - nao afetada pelo Aplicar a todos">&#128274; ${du2}</span>`
      : `<input type="number" value="${du2}" min="0" max="31" class="input-du" onchange="setLan('${c.mat}','duteis',this.value)">`;
    return `<tr${locked?' class="linha-travada"':''}>
      <td><code style="font-size:10px">${c.mat||'\u2014'}</code></td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;font-size:12px" title="${c.nome}">${c.nome}</td>
      <td>${duCell}</td>
      <td><input type="number" value="${fat}" min="0" max="31" class="input-falta" onchange="setLan('${c.mat}','faltas',this.value)"></td>
      <td><input type="number" value="${fev}" min="0" max="31" class="input-ferias" onchange="setLan('${c.mat}','ferias',this.value)" title="${ferAuto?'Preenchido automaticamente pelos dias úteis de férias na competência. Edite para sobrescrever.':'Valor informado manualmente. Apague para voltar ao automático.'}" style="${ferAuto&&fev>0?'background:#EFF6FF':''}"></td>
      <td><input type="number" value="${ext}" min="0" max="31" class="input-extras" onchange="setLan('${c.mat}','extras',this.value)" title="Dias extras"></td>
      <td class="dias-reais">${dr}</td>
      <td class="total-cell">${vr>0?brl(vr):'\u2014'}</td>
      <td class="total-cell">${cafe>0?brl(cafe):'\u2014'}</td>
      <td class="total-cell">${cesta>0?brl(cesta):'\u2014'}</td>
      <td class="total-cell">${comb>0?brl(comb):'\u2014'}</td>
      <td class="total-cell">${vt>0?brl(vt):'\u2014'}</td>
      <td class="total-cell" style="color:var(--blue);font-weight:700">${brl(total)}</td>
    </tr>`;
  }).join('');
}



async function setLan(mat,campo,val){
  if(!lancamento[mat]) lancamento[mat]={};
  if(campo==='ferias' && (val===''||val===null||val===undefined)){
    delete lancamento[mat].ferias;   // campo vazio: volta ao cálculo automático
  } else {
    lancamento[mat][campo]=fnum(val);
  }
  try{ await fsSetLan(mat,lancamento[mat]); }catch(e){}
  renderLancamento();
}

async function aplicarDiasUteis(){
  const du=lanDU;
  const b=window._writeBatch(window._db);
  let travados=0;
  colsApuracao().forEach(c=>{
    if(c.diasFixos){travados++;return;} // pula colaboradores com dias fixos no cadastro
    if(!lancamento[c.mat]) lancamento[c.mat]={};
    lancamento[c.mat].duteis=du;
    b.set(window._doc('lancamento',_lanKey(lanComp,c.mat)),lancamento[c.mat]);
  });
  await b.commit();
  renderLancamento();
  toast(`\u2705 Dias (${du}) aplicados.`+(travados?` ${travados} travados mantidos.`:''),'success');
}

const BENEF_LABELS={todos:'Todos os benefícios',vr:'Vale Refeição',cafe:'Café da Manhã',cesta:'Cesta Básica',comb:'Combustível',vt:'Vale Transporte'};

// Proxima competencia (MM/AAAA -> MM/AAAA do mes seguinte)
function _proxComp(comp){
  const m=String(comp).match(/^(\d{1,2})\/(\d{4})$/); if(!m) return comp;
  let mm=+m[1]+1, yy=+m[2]; if(mm>12){mm=1;yy++;}
  return String(mm).padStart(2,'0')+'/'+yy;
}
// MM/AAAA -> índice de mês absoluto; diferença em meses entre duas competências.
function _compMes(comp){ const m=String(comp||'').match(/^(\d{1,2})\/(\d{4})$/); return m?(+m[2])*12+(+m[1]-1):null; }
function _mesesEntreComp(a,b){ const ca=_compMes(a), cb=_compMes(b); return (ca==null||cb==null)?null:cb-ca; }
// Competência atual (a do lançamento, senão o mês corrente) — usada como log.
function _compAtual(){ const h=new Date(); return /^\d{2}\/\d{4}$/.test(lanComp)?lanComp:(String(h.getMonth()+1).padStart(2,'0')+'/'+h.getFullYear()); }

// Modal de escolha quando a competencia/beneficio ja foi fechada com valores
// diferentes: substituir o fechamento, jogar p/ competencia futura, ou cancelar.
function escolhaFechamento(comp, benefLabel, oldTotal, novoTotal){
  return new Promise(resolve=>{
    document.getElementById('modal-fechamento-dup')?.remove();
    const prox=_proxComp(comp);
    const html=`<div class="modal-overlay open" id="modal-fechamento-dup" data-dynamic="1">
      <div class="modal" style="max-width:500px">
        <div class="modal-title">Competência já fechada</div>
        <div class="modal-sub">${comp} — ${benefLabel} já tem um fechamento, e os valores atuais estão diferentes.</div>
        <div class="text-sm" style="margin:10px 0;display:flex;gap:18px">
          <div>Fechado: <strong>${brl(oldTotal)}</strong></div>
          <div>Atual: <strong style="color:var(--blue)">${brl(novoTotal)}</strong></div>
        </div>
        <p class="text-sm" style="margin:10px 0 12px">O que deseja fazer com a alteração?</p>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-warning" id="fdup-sub">Substituir o fechamento de ${comp} (re-fechar com os valores atuais)</button>
          <button class="btn btn-primary" id="fdup-fut">Manter ${comp} e considerar para a próxima competência (${prox})</button>
          <button class="btn btn-ghost" id="fdup-cancel">Cancelar</button>
        </div>
      </div></div>`;
    document.body.insertAdjacentHTML('beforeend',html);
    const close=v=>{document.getElementById('modal-fechamento-dup')?.remove();resolve(v);};
    document.getElementById('fdup-sub').onclick=()=>close('substituir');
    document.getElementById('fdup-fut').onclick=()=>close('futura');
    document.getElementById('fdup-cancel').onclick=()=>close('cancelar');
  });
}

async function fecharCompetencia(){
  const comp=lanComp;
  if(!comp){toast('Informe a competência (MM/AAAA)','error');return;}
  const benef=document.getElementById('lan-fechar-ben')?.value||'todos';
  const labels=BENEF_LABELS;
  const du=lanDU;
  const cfg=getCfg();
  if(!baseApuracao){ toast('Importe uma base de colaboradores antes de fechar a competência.','error'); return; }
  const ativos=colsApuracao().filter(c=>c.status!=='Inativo' && elegivelBeneficios(c));

  // Monta o snapshot (VT guarda dr/linhas para a planilha por empresa sair igual)
  const docId = benef==='todos' ? comp.replace('/','_') : comp.replace('/','_')+'_'+benef;
  let payload, novoTotal, novoCount;
  if(benef==='todos'){
    let tVR=0,tCafe=0,tCesta=0,tComb=0,tVT=0;
    const detalhes=ativos.map(c=>{
      const du2=getLanDU(c.mat,du); const dr=getLanDR(c.mat,du);
      const {vr,cafe,comb,vt,cesta}=calcBen(c,dr,du2);
      tVR+=vr;tCafe+=cafe;tCesta+=cesta;tComb+=comb;tVT+=vt;
      return {mat:c.mat,nome:c.nome,cpf:c.cpf||'',depto:c.depto||'',du:du2,faltas:fnum(lancamento[c.mat]?.faltas),ferias:feriasLancamento(c.mat,du2),extras:fnum(lancamento[c.mat]?.extras),dr,vr,cafe,cesta,comb,vt,total:vr+cafe+comb+vt+cesta};
    });
    novoTotal=tVR+tCafe+tCesta+tComb+tVT; novoCount=ativos.length;
    payload={competencia:comp,beneficio:'todos',fechadoEm:new Date().toISOString(),totalColaboradores:ativos.length,totais:{vr:tVR,cafe:tCafe,cesta:tCesta,comb:tComb,vt:tVT,geral:novoTotal},detalhes};
  } else {
    let tot=0; const detalhes=[];
    ativos.forEach(c=>{
      const du2=getLanDU(c.mat,du); const dr=getLanDR(c.mat,du);
      const v=calcBen(c,dr,du2)[benef]||0;
      if(v>0){
        tot+=v;
        const reg={mat:c.mat,nome:c.nome,cpf:c.cpf||'',depto:c.depto||'',filtro:c.filtro||'OK',valor:v};
        if(benef==='vt'){
          reg.dias = cfg.vt==='mult'?dr:1;
          reg.linhas=[1,2,3,4]
            .map(n=>({cod:c['cod'+n]||'',ben:c['ben'+n]||'',tp:c['tp'+n]||'',val:fnum(c['vt'+n]),viag:fnum(c['v'+n])}))
            .filter(l=>l.val>0&&l.viag>0);
        }
        detalhes.push(reg);
      }
    });
    novoTotal=tot; novoCount=detalhes.length;
    payload={competencia:comp,beneficio:benef,beneficioLabel:labels[benef],fechadoEm:new Date().toISOString(),totalColaboradores:detalhes.length,total:tot,detalhes};
  }

  // Ja existe fechamento dessa competencia/beneficio?
  let existing=null;
  try{ const s=await window._getDoc(window._doc('historico',docId)); if(s.exists()) existing=s.data(); }catch(e){}
  if(existing){
    const oldTotal = benef==='todos' ? (existing.totais?.geral||0) : (existing.total||0);
    const oldCount = existing.totalColaboradores||0;
    const diverge = Math.abs(oldTotal-novoTotal)>0.005 || oldCount!==novoCount;
    if(diverge){
      const escolha = await escolhaFechamento(comp, labels[benef], oldTotal, novoTotal);
      if(escolha==='cancelar') return;
      if(escolha==='futura'){
        const prox=_proxComp(comp);
        setLanComp(prox);
        renderLancamento();
        toast('Fechamento de '+comp+' mantido. Competência avançada para '+prox+'.','success');
        return;
      }
      // 'substituir' segue e regrava o snapshot
    } else if(!confirm(`Competência ${comp} — ${labels[benef]} já fechada com os mesmos valores. Re-fechar mesmo assim?`)){
      return;
    }
  } else if(!confirm(`Fechar competência ${comp} — ${labels[benef]}? Salva um snapshot no Histórico.`)){
    return;
  }

  try{
    await fsSet('historico',docId,payload);
    toast(`Competência ${comp} — ${labels[benef]} fechada!`,'success');
    if(currentPage==='ben-historico') renderHistorico();
  }catch(e){toast('Erro: '+e.message,'error');}
}

// ── Exportacao a partir do SNAPSHOT fechado (fonte unica de verdade) ──────
async function _snapshotBenef(comp,benef){
  const id=comp.replace('/','_')+'_'+benef;
  try{ const s=await window._getDoc(window._doc('historico',id)); return s.exists()?s.data():null; }catch(e){ return null; }
}
function _baixarXlsx(rows, sheetName, fileName){
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),sheetName);
  XLSX.writeFile(wb,fileName);
}
// CSV com BOM (UTF-8) e separador ; — formato de importacao do Caju.
function _baixarCsvBom(text, fileName){
  const blob=new Blob(['﻿'+text],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=fileName; a.click(); URL.revokeObjectURL(url);
}
// Cabecalho do CSV de importacao do Caju (13 colunas)
const CAJU_CSV_HEADER='CPF;Matricula (opcional);Valor Fixo em Auxilio Alimentacao;Mobilidade;Valor Fixo em Mobilidade;Cultura;Valor Fixo em Cultura;Saude;Valor Fixo em Saude;Educacao;Valor Fixo em Educacao;Home Office;Valor Fixo em Home Office';
// Códigos do benefício no Senior (preencher quando o usuário enviar).
const SENIOR_BENEF_COD={vt:'',comb:'',vr:'',cafe:'',cesta:''};
// Valor no formato pt-BR "0.000,00" (ponto de milhar, vírgula decimal, 2 casas).
function _valSenior(v){ return fnum(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _empDe(mat){ return String(mat||'').substring(0,4)||'0000'; }
// Grupo do arquivo por empresa: particulares (PART) vão num grupo próprio.
function _grupoExport(d){ return d.filtro==='PART' ? 'PART' : _empDe(d.mat); }

// O botao 3 muda de rotulo conforme o beneficio: VT -> Via Nova, demais -> Caju.
function atualizarBotoesExport(){
  const benef=document.getElementById('lan-fechar-ben')?.value||'';
  const b=document.getElementById('lan-btn-export3');
  if(b) b.innerHTML = (benef==='vt') ? '&#11015; 3 · Via Nova' : '&#11015; 3 · Caju';
}

// Exporta o pedido do beneficio selecionado: VT vai para o Via Nova
// (planilha PEDIDO, 1 por empresa); os demais vao para o Caju.
async function exportarPedidoBenef(){
  const benef=document.getElementById('lan-fechar-ben')?.value||'';
  if(!benef||benef==='todos'){ toast('Selecione um benefício específico (VR, Café, Cesta, Combustível ou VT).','error'); return; }
  const comp=lanComp;
  const destino=benef==='vt'?'Via Nova':'Caju';
  const snap=await _snapshotBenef(comp,benef);
  if(!snap){ toast('Feche a competência de '+BENEF_LABELS[benef]+' antes de exportar para o '+destino+'.','error'); return; }
  const det=snap.detalhes||[];
  if(!det.length){ toast('Sem ocorrências de '+BENEF_LABELS[benef]+' nessa competência.','info'); return; }
  const tag=comp.replace('/','_');

  if(benef==='vt'){
    // VIA NOVA — planilha PEDIDO, 1 por empresa com ocorrencia.
    // Cabecalho com quebra de linha conforme o modelo (sem coluna TIPO).
    const header=['CPF','NOME','CÓDIGO\nBENEFÍCIO','BENEFÍCIO','VALOR\nUNITÁRIO','QUANTIDADE\nPOR DIA','DIAS\nTRABALHADOS'];
    const grupos=[...new Set(det.map(_grupoExport))].sort();
    let n=0;
    grupos.forEach((g,i)=>{
      const rows=[header];
      det.filter(d=>_grupoExport(d)===g).forEach(d=>{
        (d.linhas||[]).forEach(l=>rows.push([d.cpf||'',d.nome||'',l.cod||'',l.ben||'',l.val,l.viag,d.dias!=null?d.dias:'']));
      });
      if(rows.length>1){ n++; setTimeout(()=>_baixarXlsx(rows,'PEDIDO','ViaNova_PEDIDO_'+g+'_'+tag+'.xlsx'), i*350); }
    });
    toast('Via Nova (VT): '+n+' planilha(s) — uma por empresa/grupo.','success');
    return;
  }
  if(benef==='comb'){
    // Mobilidade: CSV de importação do Caju (modelo), 1 arquivo por empresa.
    // Particulares saem num arquivo próprio (grupo PART). Valor inteiro na
    // coluna "Mobilidade"; CPF com 11 dígitos.
    const grupos=[...new Set(det.map(_grupoExport))].sort();
    let n=0;
    grupos.forEach((g,i)=>{
      const linhas=[CAJU_CSV_HEADER];
      det.filter(d=>_grupoExport(d)===g).forEach(d=>{
        const cpf=(d.cpf||'').replace(/\D/g,'').padStart(11,'0');
        const val=Math.round(fnum(d.valor));
        if(val>0) linhas.push(cpf+';;;'+val+';;;;;;;;;');
      });
      if(linhas.length>1){ n++; setTimeout(()=>_baixarCsvBom(linhas.join(NL),'caju_import_mobilidade_'+tag+'_'+g+'.csv'), i*350); }
    });
    toast('Mobilidade (Caju): '+n+' arquivo(s) CSV — um por empresa/grupo.','success');
    return;
  }
  // VR, Café, Cesta: CSV do Caju, planilha única (todas as empresas).
  // Valor (inteiro) na coluna "Valor Fixo em Auxilio Alimentacao"; demais 0.
  const nomes={vr:'vr',cafe:'cafe',cesta:'cesta'};
  const linhas=[CAJU_CSV_HEADER];
  det.forEach(d=>{
    const cpf=(d.cpf||'').replace(/\D/g,'').padStart(11,'0');
    const val=Math.round(fnum(d.valor));
    if(val>0) linhas.push(cpf+';;'+val+';0;0;0;0;0;0;0;0;0;0');
  });
  if(linhas.length<2){ toast('Sem valores de '+BENEF_LABELS[benef]+' para exportar.','info'); return; }
  _baixarCsvBom(linhas.join(NL),'caju_import_'+nomes[benef]+'_'+tag+'.csv');
  toast(BENEF_LABELS[benef]+': CSV do Caju (Auxílio Alimentação) exportado.','success');
}

async function exportarSeniorBenef(){
  const benef=document.getElementById('lan-fechar-ben')?.value||'';
  if(!benef||benef==='todos'){ toast('Selecione um benefício específico para exportar o Senior.','error'); return; }
  const comp=lanComp;
  const snap=await _snapshotBenef(comp,benef);
  if(!snap){ toast('Feche a competência de '+BENEF_LABELS[benef]+' antes de exportar o Senior.','error'); return; }
  const det=snap.detalhes||[];
  if(!det.length){ toast('Sem ocorrências de '+BENEF_LABELS[benef]+' nessa competência.','info'); return; }
  const nomes={vr:'VR',cafe:'Cafe_Manha',cesta:'Cesta_Basica',comb:'Mobilidade',vt:'VT'};
  // Senior: 1 arquivo por benefício (todas as empresas). Colunas: CPF (11
  // dígitos), código do benefício, valor "0.000,00". CSV separado por vírgula;
  // o valor vai entre aspas porque contém a vírgula decimal.
  const cod=SENIOR_BENEF_COD[benef]||'';
  const linhas=[];
  det.forEach(d=>{
    if(fnum(d.valor)<=0) return;
    const cpf=(d.cpf||'').replace(/[^0-9]/g,'').padStart(11,'0');
    linhas.push(cpf+','+cod+',"'+_valSenior(d.valor)+'"');
  });
  if(!linhas.length){ toast('Sem valores para exportar.','info'); return; }
  const blob=new Blob([linhas.join(NL)],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download='Senior_'+nomes[benef]+'_'+comp.replace('/','_')+'.csv';
  a.click(); URL.revokeObjectURL(url);
  toast('Senior — '+BENEF_LABELS[benef]+' exportado'+(cod?'':' (código em branco até você enviar)')+'.','success');
}

// ============================================================
// BENEF\u00CDCIOS: IMPORTAR FALTAS
// ============================================================
function pgBenImportar(){
  return `
    <div class="page-header"><h2>Importar Faltas</h2><p>Upload da planilha de faltas para atualizar o lan\u00E7amento.</p></div>
    <div class="card">
      <div class="upload-zone" onclick="document.getElementById('faltas-file').click()">
        <input type="file" id="faltas-file" accept=".xlsx,.xls" onchange="importarFaltas(event)">
        <div class="upload-icon"></div>
        <div class="upload-text">Clique para selecionar a planilha de faltas</div>
        <div class="upload-sub">Colunas: Matr\u00EDcula | Nome | CPF | N\u00BA de Faltas</div>
      </div>
      <div id="faltas-preview" style="margin-top:14px"></div>
    </div>
    <div class="card">
      <div class="card-title">Modelo</div>
      <button class="btn btn-success btn-sm" onclick="gerarModeloFaltas()">\u2B07 Baixar modelo</button>
    </div>`;
}

async function importarFaltas(event){
  const file=event.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=async e=>{
    const wb=XLSX.read(e.target.result,{type:'binary'});
    const data=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1});
    let hi=-1;
    for(let i=0;i<Math.min(6,data.length);i++){if(data[i].some(v=>String(v||'').toLowerCase().includes('falta'))){hi=i;break;}}
    if(hi<0){toast('Coluna "Faltas" n\u00E3o encontrada','error');return;}
    const hs=data[hi].map(h=>String(h||'').toLowerCase());
    const iMat=hs.findIndex(h=>h.includes('matr')),iFal=hs.findIndex(h=>h.includes('falta'));
    const b=window._writeBatch(window._db); let ok=0;
    for(let i=hi+1;i<data.length;i++){
      const row=data[i]; if(!row||row.every(v=>!v)) continue;
      const mat=String(row[iMat]||'').trim(); if(!mat) continue;
      if(colaboradores.find(c=>c.mat===mat)){
        if(!lancamento[mat]) lancamento[mat]={};
        lancamento[mat].faltas=fnum(row[iFal]);
        b.set(window._doc('lancamento',_lanKey(lanComp,mat)),lancamento[mat]); ok++;
      }
    }
    await b.commit();
    document.getElementById('faltas-preview').innerHTML=
      `<div class="alert alert-success">\u2705 <strong>${ok} colaboradores</strong> atualizados.</div>`;
    toast(`\u2705 ${ok} faltas atualizadas`,'success');
    event.target.value='';
  };
  reader.readAsBinaryString(file);
}

function gerarModeloFaltas(){
  const wb=XLSX.utils.book_new();
  const rows=[['Matr\u00EDcula','Nome Completo','CPF','N\u00BA de Faltas'],
    ...colaboradores.filter(c=>c.status!=='Inativo').map(c=>[c.mat||'',c.nome,c.cpf||'',0])];
  const ws=XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb,ws,'Faltas');
  XLSX.writeFile(wb,'Modelo_Faltas.xlsx');
  toast('\u2705 Modelo baixado!','success');
}

// ============================================================
// BENEF\u00CDCIOS: EXPORTAR CAJU
// ============================================================
function pgBenExportarCaju(){
  const empresas=getEmpresaList();
  return `
    <div class="page-header"><h2> Exportar \u2014 Caju & VT</h2><p>Gere os arquivos de pagamento de benef\u00EDcios.</p></div>

    <div class="card" style="border:2px solid var(--green);background:var(--green-light)">
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div style="font-size:36px"></div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:15px;color:var(--green)">Exportar para o Caju \u2014 Arquivo Oficial</div>
          <div class="text-sm text-muted" style="margin-top:4px">
            Gera o CSV no formato exato do Caju: <strong>VR + Caf\u00E9 \u2192 Aux\u00EDlio Alimenta\u00E7\u00E3o</strong> \u00B7 <strong>Combust\u00EDvel + VT \u2192 Mobilidade</strong>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-success" onclick="exportarCajuCompleto()">\u2B07 pedidos_caju.csv</button>
          <button class="btn btn-ghost btn-sm" onclick="exportarPorEmpresaCaju()"> Um por empresa</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Filtrar por empresa</div>
      <div class="filter-group" style="max-width:280px">
        <label>Empresa</label>
        <select id="exp-emp">
          <option value="">Todas as empresas</option>
          ${empresas.map(e=>`<option value="${e.cod}">${e.cod} (${e.qtd} colab.)</option>`).join('')}
        </select>
      </div>
    </div>

    <div style="font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Exportar individualmente:</div>
    <div class="export-grid">
      <div class="export-card"><div class="ex-icon">VR\uFE0F</div><h3>Vale Refei\u00E7\u00E3o</h3><p>Confer\u00EAncia individual</p><button class="btn btn-ghost btn-sm" onclick="exportarCajuTipo('vr')">\u2B07 VR</button></div>
      <div class="export-card"><div class="ex-icon">\u2615</div><h3>Caf\u00E9 da Manh\u00E3</h3><p>Confer\u00EAncia individual</p><button class="btn btn-ghost btn-sm" onclick="exportarCajuTipo('cafe')">\u2B07 Caf\u00E9</button></div>
      <div class="export-card"><div class="ex-icon">\u26FD</div><h3>Combust\u00EDvel</h3><p>Confer\u00EAncia individual</p><button class="btn btn-ghost btn-sm" onclick="exportarCajuTipo('comb')">\u2B07 Comb.</button></div>
      <div class="export-card"><div class="ex-icon">\uD83E\uDDFA</div><h3>Cesta B\u00E1sica</h3><p>Confer\u00EAncia individual</p><button class="btn btn-ghost btn-sm" onclick="exportarCajuTipo('cesta')">\u2B07 Cesta</button></div>
      <div class="export-card"><div class="ex-icon">VT</div><h3>Vale Transporte</h3><p>Com PEC/TOP e c\u00F3digos</p><button class="btn btn-accent btn-sm" onclick="exportarVT()">\u2B07 Exportar VT</button></div>
      <div class="export-card"><div class="ex-icon"></div><h3>Tudo de uma vez</h3><p>Todos separados</p><button class="btn btn-primary btn-sm" onclick="exportarTudo()">\u2B07 Todos</button></div>
      <div class="export-card"><div class="ex-icon"></div><h3>Por Empresa</h3><p>Um arquivo por empresa</p><button class="btn btn-warning btn-sm" onclick="exportarPorEmpresa()">\u2B07 Por Empresa</button></div>
    </div>`;
}

function fmtValCaju(v){ return (parseFloat(v)||0).toFixed(2); }

function getCajuAtivos(empSel){
  let f=colaboradores.filter(c=>!STATUS_NAO_RECEBE.includes(c.status));
  if(empSel) f=f.filter(c=>_empresaMatch(c,[empSel]));
  return f;
}

function exportarCajuCompleto(){
  const comp=lanComp||'MES';
  const empSel=g('exp-emp');
  const du=lanDU;
  const header=['CPF','Matricula (opcional)','Valor Fixo em Auxilio Alimentacao','Mobilidade','Valor Fixo em Mobilidade','Cultura','Valor Fixo em Cultura','Saude','Valor Fixo em Saude','Educacao','Valor Fixo em Educacao','Home Office','Valor Fixo em Home Office'].join(SEP);
  const linhas=[header];
  getCajuAtivos(empSel).forEach(c=>{
    const dr=getLanDR(c.mat,du);
    const {vr,cafe,comb,vt,cesta}=calcBen(c,dr,getLanDU(c.mat,du));
    const alim=vr+cafe+cesta, mob=comb+vt;
    if(alim===0&&mob===0) return;
    const cpf=(c.cpf||'').replace(/[^0-9]/g,'').padStart(11,'0');
    linhas.push([cpf,c.mat||'',fmtValCaju(alim),'0',fmtValCaju(mob),'0','0','0','0','0','0','0','0'].join(SEP));
  });
  const blob=new Blob([linhas.join(NL)],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download='pedidos_caju_'+comp.replace('/','_')+(empSel?'_'+empSel:'')+'.csv';
  a.click(); URL.revokeObjectURL(url);
  toast('\u2705 Arquivo Caju exportado!','success');
}

function exportarCajuTipo(tipo){
  const comp=lanComp||'MES';
  const empSel=g('exp-emp');
  const du=lanDU;
  const nomes={vr:'VR',cafe:'Cafe',comb:'Mobilidade',cesta:'Cesta_Basica'};
  const rows=[['CPF','Matr\u00EDcula','Valor']];
  getCajuAtivos(empSel).forEach(c=>{
    const dr=getLanDR(c.mat,du);
    const {vr,cafe,comb,cesta}=calcBen(c,dr,getLanDU(c.mat,du));
    const val=tipo==='vr'?vr:tipo==='cafe'?cafe:tipo==='cesta'?cesta:comb;
    if(val>0) rows.push([c.cpf||'',c.mat||'',val]);
  });
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),nomes[tipo]);
  XLSX.writeFile(wb,nomes[tipo]+'_'+comp.replace('/','_')+(empSel?'_'+empSel:'')+'.xlsx');
  toast('\u2705 Exportado!','success');
}

function exportarVT(){
  const comp=lanComp||'MES';
  const empSel=g('exp-emp');
  const du=lanDU;
  const cfg=getCfg();
  const rows=[['CPF','NOME','C\u00D3DIGO BENEF\u00CDCIO','BENEF\u00CDCIO','TIPO','VALOR UNIT\u00C1RIO','QUANTIDADE POR DIA','DIAS TRABALHADOS']];
  getCajuAtivos(empSel).filter(c=>inferMob(c)==='vt').forEach(c=>{
    const dr=cfg.vt==='mult'?getLanDR(c.mat,du):1;
    [1,2,3,4].forEach(n=>{
      const val=fnum(c['vt'+n]),viag=fnum(c['v'+n]);
      if(val>0&&viag>0) rows.push([c.cpf||'',c.nome,c['cod'+n]||'',c['ben'+n]||'',c['tp'+n]||'',val,viag,dr]);
    });
  });
  const wb=XLSX.utils.book_new();
  const ws=XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb,ws,'PEDIDO');
  XLSX.writeFile(wb,'VT_'+comp.replace('/','_')+(empSel?'_'+empSel:'')+'.xlsx');
  toast('\u2705 VT exportado!','success');
}

function exportarTudo(){
  exportarCajuTipo('vr');
  setTimeout(()=>exportarCajuTipo('cafe'),400);
  setTimeout(()=>exportarCajuTipo('comb'),800);
  setTimeout(()=>exportarCajuTipo('cesta'),1200);
  setTimeout(()=>exportarVT(),1600);
  setTimeout(()=>toast('\u2705 Todos exportados!','success'),2000);
}

function exportarPorEmpresa(){
  const comp=lanComp||'MES';
  const du=lanDU;
  const cfg=getCfg();
  const empresas=getEmpresaList();
  empresas.forEach((emp,i)=>{
    setTimeout(()=>{
      const wb=XLSX.utils.book_new();
      ['vr','cafe','comb'].forEach(tipo=>{
        const nomes={vr:'Vale Refeicao',cafe:'Cafe Manha',comb:'Mobilidade'};
        const rows=[['CPF','Matr\u00EDcula','Valor']];
        colaboradores.filter(c=>c.status!=='Inativo'&&_empresaMatch(c,[emp.cod])).forEach(c=>{
          const dr=getLanDR(c.mat,du);
          const {vr,cafe,comb}=calcBen(c,dr,getLanDU(c.mat,du));
          const val=tipo==='vr'?vr:tipo==='cafe'?cafe:comb;
          if(val>0) rows.push([c.cpf||'',c.mat||'',val]);
        });
        XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),nomes[tipo]);
      });
      const vtRows=[['CPF','NOME','C\u00D3DIGO','BENEF\u00CDCIO','TIPO','VALOR','VIAGENS/DIA','DIAS']];
      colaboradores.filter(c=>c.status!=='Inativo'&&_empresaMatch(c,[emp.cod])&&inferMob(c)==='vt').forEach(c=>{
        const dr=cfg.vt==='mult'?getLanDR(c.mat,du):1;
        [1,2,3,4].forEach(n=>{
          const val=fnum(c['vt'+n]),viag=fnum(c['v'+n]);
          if(val>0&&viag>0) vtRows.push([c.cpf||'',c.nome,c['cod'+n]||'',c['ben'+n]||'',c['tp'+n]||'',val,viag,dr]);
        });
      });
      XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(vtRows),'VT');
      XLSX.writeFile(wb,'Beneficios_'+emp.cod+'_'+comp.replace('/','_')+'.xlsx');
    },i*600);
  });
  setTimeout(()=>toast('\u2705 '+empresas.length+' arquivos gerados!','success'),empresas.length*600+300);
}

function exportarPorEmpresaCaju(){
  const comp=lanComp||'MES';
  const du=lanDU;
  const header=['CPF','Matricula (opcional)','Valor Fixo em Auxilio Alimentacao','Mobilidade','Valor Fixo em Mobilidade','Cultura','Valor Fixo em Cultura','Saude','Valor Fixo em Saude','Educacao','Valor Fixo em Educacao','Home Office','Valor Fixo em Home Office'].join(SEP);
  const empresas=getEmpresaList();
  empresas.forEach((emp,i)=>{
    setTimeout(()=>{
      const linhas=[header];
      colaboradores.filter(c=>c.status!=='Inativo'&&_empresaMatch(c,[emp.cod])).forEach(c=>{
        const dr=getLanDR(c.mat,du);
        const {vr,cafe,comb,vt,cesta}=calcBen(c,dr,getLanDU(c.mat,du));
        const alim=vr+cafe+cesta,mob=comb+vt;
        if(alim===0&&mob===0) return;
        const cpf=(c.cpf||'').replace(/[^0-9]/g,'').padStart(11,'0');
        linhas.push([cpf,c.mat||'',fmtValCaju(alim),'0',fmtValCaju(mob),'0','0','0','0','0','0','0','0'].join(SEP));
      });
      const blob=new Blob([linhas.join(NL)],{type:'text/csv;charset=utf-8;'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url; a.download='pedidos_caju_'+emp.cod+'_'+comp.replace('/','_')+'.csv';
      a.click(); URL.revokeObjectURL(url);
    },i*500);
  });
  setTimeout(()=>toast('\u2705 '+empresas.length+' CSVs Caju gerados!','success'),empresas.length*500+300);
}

// ============================================================
// BENEF\u00CDCIOS: EXPORTAR SENIOR
// ============================================================
function pgBenExportarSenior(){
  const empresas=getEmpresaList();
  return `
    <div class="page-header"><h2> Exportar \u2014 Sistema Senior</h2><p>CSVs para integra\u00E7\u00E3o com o Senior.</p></div>
    <div class="alert alert-info">Formato: CPF (11 d\u00EDgitos com zeros \u00E0 esquerda) | Empresa (4 d\u00EDgitos) | Valor (0,00)</div>
    <div class="card" style="margin-top:14px">
      <div class="card-title">Filtrar por empresa</div>
      <div class="filter-group" style="max-width:280px">
        <label>Empresa</label>
        <select id="exp-senior-emp">
          <option value="">Todas</option>
          ${empresas.map(e=>`<option value="${e.cod}">${e.cod}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="export-grid">
      <div class="export-card"><div class="ex-icon">VR\uFE0F</div><h3>VR \u2014 Senior</h3><p>CSV</p><button class="btn btn-primary btn-sm" onclick="exportarSenior('vr')">\u2B07 VR_Senior.csv</button></div>
      <div class="export-card"><div class="ex-icon">\u2615</div><h3>Caf\u00E9 \u2014 Senior</h3><p>CSV</p><button class="btn btn-primary btn-sm" onclick="exportarSenior('cafe')">\u2B07 Cafe_Senior.csv</button></div>
      <div class="export-card"><div class="ex-icon">\u26FD</div><h3>Mobilidade \u2014 Senior</h3><p>CSV</p><button class="btn btn-primary btn-sm" onclick="exportarSenior('comb')">\u2B07 Mob_Senior.csv</button></div>
      <div class="export-card"><div class="ex-icon">\uD83E\uDDFA</div><h3>Cesta B\u00E1sica \u2014 Senior</h3><p>CSV</p><button class="btn btn-primary btn-sm" onclick="exportarSenior('cesta')">\u2B07 Cesta_Basica_Senior.csv</button></div>
      <div class="export-card"><div class="ex-icon">VT</div><h3>VT \u2014 Senior</h3><p>CSV</p><button class="btn btn-warning btn-sm" onclick="exportarSenior('vt')">\u2B07 VT_Senior.csv</button></div>
      <div class="export-card"><div class="ex-icon"></div><h3>Tudo Senior</h3><p>5 CSVs de uma vez</p><button class="btn btn-success btn-sm" onclick="exportarTodosSenior()">\u2B07 Todos</button></div>
    </div>`;
}

function exportarSenior(tipo){
  const comp=lanComp||'MES';
  const empSel=document.getElementById('exp-senior-emp')?.value||'';
  const du=lanDU;
  const nomes={vr:'VR',cafe:'Cafe_Manha',comb:'Mobilidade',vt:'VT',cesta:'Cesta_Basica'};
  const linhas=['CPF,Empresa,Valor'];
  let f=colaboradores.filter(c=>!STATUS_NAO_RECEBE.includes(c.status));
  if(empSel) f=f.filter(c=>_empresaMatch(c,[empSel]));
  f.forEach(c=>{
    const dr=getLanDR(c.mat,du);
    const {vr,cafe,comb,vt,cesta}=calcBen(c,dr,getLanDU(c.mat,du));
    const val=tipo==='vr'?vr:tipo==='cafe'?cafe:tipo==='comb'?comb:tipo==='cesta'?cesta:vt;
    if(val>0){
      const cpf=(c.cpf||'').replace(/[^0-9]/g,'').padStart(11,'0');
      const emp=String(c.mat||'').substring(0,4)||'0000';
      linhas.push(cpf+','+emp+','+val.toFixed(2).replace('.',','));
    }
  });
  const blob=new Blob([linhas.join(NL)],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=nomes[tipo]+'_Senior_'+comp.replace('/','_')+'.csv';
  a.click(); URL.revokeObjectURL(url);
  toast('\u2705 '+nomes[tipo]+' Senior exportado!','success');
}

function exportarTodosSenior(){
  ['vr','cafe','comb','vt','cesta'].forEach((t,i)=>setTimeout(()=>exportarSenior(t),i*400));
  setTimeout(()=>toast('\u2705 Todos os CSVs Senior!','success'),1800);
}

// ============================================================
// BENEF\u00CDCIOS: HIST\u00D3RICO
// ============================================================
function pgBenHistorico(){
  return `
    <div class="page-header"><h2>\uFE0F Hist\u00F3rico de Compet\u00EAncias</h2><p>Compet\u00EAncias fechadas \u2014 compare m\u00EAs a m\u00EAs.</p></div>
    <div id="hist-lista"><div class="empty-state"><div class="empty-icon">\uFE0F</div><p>Carregando...</p></div></div>`;
}

async function renderHistorico(){
  const snap=await window._getDocs(window._col('historico'));
  const items=[]; snap.forEach(d=>items.push(Object.assign({_id:d.id},d.data())));
  items.sort((a,b)=>String(b.fechadoEm||'').localeCompare(String(a.fechadoEm||'')));
  const el=document.getElementById('hist-lista'); if(!el) return;
  if(items.length===0){
    el.innerHTML='<div class="empty-state"><div class="empty-icon"></div><p>Nenhuma competência fechada ainda.</p></div>';
    return;
  }
  el.innerHTML=items.map(h=>{
    const data=h.fechadoEm?new Date(h.fechadoEm).toLocaleDateString('pt-BR'):'';
    const lbl=((h.competencia||'')+' — '+(h.beneficioLabel||(h.modulo==='premio'?'Prêmio Assiduidade':(h.beneficio==='todos'||h.totais?'Todos':h.beneficio||'')))).replace(/'/g,'');
    const acoes='<div style="display:flex;gap:6px;margin-top:8px;justify-content:flex-end">'
      +'<button class="btn btn-ghost btn-sm" onclick="exportarHistExcel(\''+h._id+'\')">Excel</button>'
      +'<button class="btn btn-danger btn-sm" onclick="excluirHist(\''+h._id+'\',\''+lbl+'\')">Excluir</button></div>';
    if(h.beneficio && h.beneficio!=='todos'){
      return `<div class="card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <div><div style="font-weight:700;font-size:16px;color:var(--blue)">${h.competencia} — ${h.beneficioLabel||h.beneficio}</div>
        <div class="text-sm text-muted" style="margin-top:2px">${h.totalColaboradores||0} colaboradores · ${data}</div></div>
        <div style="text-align:right"><div style="font-weight:700;font-size:18px;color:var(--green)">${brl(h.total||0)}</div>${acoes}</div>
      </div></div>`;
    }
    if(h.modulo==='premio'){
      const acoesP='<div style="display:flex;gap:6px;margin-top:8px;justify-content:flex-end">'
        +'<button class="btn btn-ghost btn-sm" onclick="switchModule(\'premio\');showPage(\'premio-dash\')">Ver no dashboard</button>'
        +'<button class="btn btn-danger btn-sm" onclick="excluirHist(\''+h._id+'\',\''+lbl+'\')">Excluir</button></div>';
      return `<div class="card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
        <div><div style="font-weight:700;font-size:16px;color:var(--blue)">${h.competencia} — Prêmio Assiduidade</div>
        <div class="text-sm text-muted" style="margin-top:2px">${h.totalElegiveis||0} de ${h.totalColaboradores||0} receberam · ${data}</div></div>
        <div style="text-align:right"><div style="font-weight:700;font-size:18px;color:var(--green)">${brl(h.valorTotal||0)}</div>${acoesP}</div>
      </div></div>`;
    }
    if(h.totais){
      return `<div class="card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
        <div><div style="font-weight:700;font-size:16px;color:var(--blue)">${h.competencia} — Todos</div>
        <div class="text-sm text-muted" style="margin-top:2px">${h.totalColaboradores||0} colaboradores · ${data}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
          <span class="badge badge-orange">VR ${brl(h.totais.vr)}</span>
          <span class="badge badge-yellow">Café ${brl(h.totais.cafe)}</span>
          <span class="badge badge-green">Cesta ${brl(h.totais.cesta||0)}</span>
          <span class="badge badge-green">Comb ${brl(h.totais.comb)}</span>
          <span class="badge badge-blue">VT ${brl(h.totais.vt)}</span>
        </div></div>
        <div style="text-align:right"><div style="font-weight:700;font-size:18px;color:var(--green)">${brl(h.totais.geral)}</div>${acoes}</div>
      </div></div>`;
    }
    return '';
  }).join('');
}

function excluirHist(id,label){ abrirExcluirHistorico('historico',id,label||'este registro','historico'); }

async function exportarHistExcel(id){
  const snap=await window._getDocs(window._col('historico'));
  let h=null; snap.forEach(d=>{if(d.id===id)h=Object.assign({_id:d.id},d.data());});
  if(!h){toast('Não encontrado','error');return;}
  let rows;
  if(h.beneficio && h.beneficio!=='todos'){
    rows=[['Competência: '+h.competencia,'Benefício: '+(h.beneficioLabel||h.beneficio),'Fechado: '+new Date(h.fechadoEm).toLocaleDateString('pt-BR')],
      ['Matrícula','Nome','CPF','Departamento','Valor'],
      ...(h.detalhes||[]).map(r=>[r.mat,r.nome,r.cpf||'',r.depto||'',r.valor]),
      [],['','','','Total',h.total||0]];
  } else {
    rows=[['Competência: '+h.competencia,'Fechado: '+new Date(h.fechadoEm).toLocaleDateString('pt-BR')],
      ['Matrícula','Nome','CPF','Departamento','Dias Úteis','Faltas','Ferias','Extras','Dias Reais','VR','Café','Cesta','Combustível','VT','Total'],
      ...(h.detalhes||[]).map(r=>[r.mat,r.nome,r.cpf,r.depto,r.du,r.faltas,r.ferias,r.extras,r.dr,r.vr,r.cafe,r.cesta||0,r.comb,r.vt,r.total]),
      [],['','','','','','','','','Total',h.totais.vr,h.totais.cafe,h.totais.cesta||0,h.totais.comb,h.totais.vt,h.totais.geral]];
  }
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Historico');
  XLSX.writeFile(wb,'Historico_'+String(h.competencia||'').replace('/','_')+(h.beneficio&&h.beneficio!=='todos'?'_'+h.beneficio:'')+'.xlsx');
  toast('Excel baixado!','success');
}

// ============================================================
// BENEF\u00CDCIOS: CONFIGURA\u00C7\u00D5ES
// ============================================================
function pgBenConfig(){
  return `
    <div class="page-header"><h2>\u2699\uFE0F Configura\u00E7\u00F5es de C\u00E1lculo</h2><p>Define como cada benef\u00EDcio \u00E9 calculado. Salvo no Firebase para todos os usu\u00E1rios.</p></div>
    <div class="card">
      <div class="card-title">$ Tipo de c\u00E1lculo por benef\u00EDcio</div>
      <div style="border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
        ${[
          {name:'cfg-vr',label:'Vale Refeicao',sub:'Valor/dia no cadastro',opts:[{v:'mult',l:'Valor \u00D7 dias trabalhados'},{v:'fixo',l:'Valor fixo mensal'}],def:'mult'},
          {name:'cfg-cafe',label:'Cafe da Manha',sub:'Valor/dia no cadastro',opts:[{v:'mult',l:'Valor \u00D7 dias trabalhados'},{v:'fixo',l:'Valor fixo mensal'}],def:'fixo'},
          {name:'cfg-comb',label:'\u26FD Combust\u00EDvel',sub:'L\u00F3gica proporcional /30 com arredondamento especial',opts:[{v:'prop',l:'Proporcional \u00F730 (recomendado)'},{v:'fixo',l:'Sempre fixo'}],def:'prop'},
          {name:'cfg-vt',label:'VT Vale Transporte',sub:'(Val linha \u00D7 viagens) \u00D7 dias',opts:[{v:'mult',l:'Valor \u00D7 dias trabalhados'},{v:'fixo',l:'Valor fixo mensal'}],def:'mult'},
          {name:'cfg-cesta',label:'Cesta B\u00E1sica',sub:'Valor fixo mensal (definido no cadastro)',opts:[{v:'fixo',l:'Valor fixo mensal'}],def:'fixo'},
        ].map((r,i)=>`
          <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;${i<4?'border-bottom:1px solid var(--border)':''};${i%2===1?'background:var(--surface2)':''}">
            <div>
              <div style="font-weight:600;font-size:14px">${r.label}</div>
              <div class="text-xs text-muted">${r.sub}</div>
            </div>
            <div style="display:flex;gap:16px">
              ${r.opts.map(o=>`<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
                <input type="radio" name="${r.name}" id="${r.name}-${o.v}" value="${o.v}" ${o.v===r.def?'checked':''} onchange="salvarConfig()" style="accent-color:var(--blue)">
                ${o.l}</label>`).join('')}
            </div>
          </div>`).join('')}
      </div>
      <div class="alert alert-success" style="margin-top:14px;margin-bottom:0"> Configura\u00E7\u00F5es salvas automaticamente no Firebase.</div>
    </div>`;
}

async function salvarConfig(){
  const cfg={
    tipoVR: document.querySelector('input[name="cfg-vr"]:checked')?.value||'mult',
    tipoCafe:document.querySelector('input[name="cfg-cafe"]:checked')?.value||'fixo',
    tipoComb:document.querySelector('input[name="cfg-comb"]:checked')?.value||'prop',
    tipoVT: document.querySelector('input[name="cfg-vt"]:checked')?.value||'mult',
    cestaPadrao: CESTA_PADRAO,
    premioValor: PREMIO_VAL,
    vrPadrao: VR_PADRAO,
    cafePadrao: CAFE_PADRAO,
  };
  try{ await fsSet('config','calculo',cfg); toast('\u2705 Configura\u00E7\u00E3o salva!','success'); }
  catch(e){ console.error(e); }
}

function exportarBase(lista){
  const base=Array.isArray(lista)?lista:colaboradores;
  const sim=b=>b?'SIM':'N\u00C3O';
  const header=[
    'Matr\u00EDcula','Nome','CPF','Cargo','Fun\u00E7\u00E3o','Departamento','Status','Tipo/Filtro','Admiss\u00E3o','Dias Fixos',
    'Eleg. Folha CLT','Eleg. Folha MEI','Eleg. Pr\u00EAmio Assiduidade','Eleg. F\u00E9rias',
    'Eleg. Vale Refei\u00E7\u00E3o','Eleg. Caf\u00E9','Eleg. Mobilidade/Combust\u00EDvel','Eleg. Vale Transporte','Eleg. Cesta B\u00E1sica',
    'VR/dia','Caf\u00E9/dia','Cesta/m\u00EAs','Tipo Mobilidade','Combust\u00EDvel/m\u00EAs',
    'VT L1 Valor','VT L1 Viagens','VT L1 Tipo','VT L1 C\u00F3digo','VT L1 Linha',
    'VT L2 Valor','VT L2 Viagens','VT L2 Tipo','VT L2 C\u00F3digo','VT L2 Linha',
    'VT L3 Valor','VT L3 Viagens','VT L3 Tipo','VT L3 C\u00F3digo','VT L3 Linha',
    'VT L4 Valor','VT L4 Viagens','VT L4 Tipo','VT L4 C\u00F3digo','VT L4 Linha',
    'M\u00EAs Agendado F\u00E9rias','Ano Agendado (calc)','Vencimento F\u00E9rias','Saldo Dias F\u00E9rias'
  ];
  const rows=[header, ...base.map(c=>{
    const e=c.elegibilidade||{};
    const tr=elegTransporte(c);
    const elegVR  = e.vr!==undefined?e.vr:fnum(c.vr)>0;
    const elegCafe= e.cafe!==undefined?e.cafe:fnum(c.cafe)>0;
    const elegFCLT= e.folhaCLT!==undefined?e.folhaCLT:(e.folha!==false);
    const elegFMEI= e.folhaMEI===true;
    const cestaVal= (e.cesta!==false) ? (fnum(c.cesta)||CESTA_PADRAO) : 0;
    const vtCols=[1,2,3,4].reduce((a,n)=>a.concat([fnum(c['vt'+n]),fnum(c['v'+n]),c['tp'+n]||'',c['cod'+n]||'',c['ben'+n]||'']),[]);
    return [
      c.mat||'',c.nome||'',c.cpf||'',c.cargo||'',c.funcao||'',c.depto||'',c.status||'',c.filtro||'OK',c.admissao||'',c.diasFixos!=null?c.diasFixos:'',
      sim(elegFCLT),sim(elegFMEI),sim(e.premio!==false),sim(e.ferias!==false),
      sim(elegVR),sim(elegCafe),sim(tr.mob),sim(tr.vt),sim(e.cesta!==false),
      fnum(c.vr),fnum(c.cafe),cestaVal,(!tr.vt&&!tr.mob)?'N/A':(c.mobilidade||'perto'),fnum(c.comb),
      ...vtCols,
      c.ferMes||'', c.ferMes?anoAgendadoColab(c):'', c.ferVenc||'', c.ferSaldo!=null?c.ferSaldo:''
    ];
  })];
  const wb=XLSX.utils.book_new();
  const ws=XLSX.utils.aoa_to_sheet(rows);
  ws['!cols']=header.map((h,i)=>({wch: i===1?34 : (h.length<8?10:16)}));
  XLSX.utils.book_append_sheet(wb,ws,'Colaboradores');
  XLSX.writeFile(wb,'Base_Completa_Udiaco.xlsx');
  toast('\u2705 Planilha completa exportada ('+base.length+' colaboradores)!','success');
}

function exportarColabExcel(){
  const f=filtrarColabs();
  const rows=[['Matr\u00EDcula','Nome','CPF','Cargo','Departamento','Status','Mobilidade','VR/dia','Caf\u00E9/dia'],
    ...f.map(c=>[c.mat,c.nome,c.cpf||'',c.cargo||'',c.depto||'',c.status,c.mobilidade||'perto',fnum(c.vr),fnum(c.cafe)])];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Colaboradores');
  XLSX.writeFile(wb,'Colaboradores_Selecionados.xlsx');
  toast('\u2705 Excel exportado!','success');
}

function exportarLancamentoExcel(){
  const du=lanDU;
  const comp=lanComp||'MES';
  const empF=getMs('lemp').join('-');
  const ativos=getLanAtivos();
  const rows=[['Matr\u00EDcula','Nome','CPF','Departamento','Dias \u00DAteis','Faltas','Ferias','Extras','Dias Reais','VR','Caf\u00E9','Cesta','Combust\u00EDvel','VT','Total'],
    ...ativos.map(c=>{
      const du2=getLanDU(c.mat,du);
      const dr=getLanDR(c.mat,du);
      const {vr,cafe,comb,vt,cesta}=calcBen(c,dr,du2);
      return [c.mat,c.nome,c.cpf||'',c.depto||'',du2,fnum(lancamento[c.mat]?.faltas),fnum(lancamento[c.mat]?.ferias),fnum(lancamento[c.mat]?.extras),dr,vr,cafe,cesta,comb,vt,vr+cafe+comb+vt+cesta];
    })];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Lancamento');
  XLSX.writeFile(wb,'Lancamento_'+comp.replace('/','_')+(empF?'_'+empF:'')+'.xlsx');
  toast('\u2705 Excel exportado!','success');
}

async function importarBase(event){
  const file=event.target.files[0]; if(!file) return;
  if(!confirm('Vai ADICIONAR colaboradores novos sem apagar os existentes. Continuar?')) return;
  const reader=new FileReader();
  reader.onload=async e=>{
    const wb=XLSX.read(e.target.result,{type:'binary'});
    const data=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1});
    let hi=0;
    for(let i=0;i<Math.min(5,data.length);i++){if(data[i].some(v=>String(v||'').toLowerCase().includes('nome'))){hi=i;break;}}
    const hs=data[hi].map(h=>String(h||'').toLowerCase().trim());
    const col=(...keys)=>hs.findIndex(h=>keys.some(k=>h.includes(k)));
    const iMat=col('matr'),iNome=col('nome'),iCPF=col('cpf'),iCargo=col('cargo');
    const iDepto=col('depart','depto'),iStat=col('status'),iMob=col('mobil');
    const iVR=col('vr/d','vr_d','vr dia','vr'),iCafe=col('caf\u00E9','cafe');
    const iComb=col('comb','combusti');
    const b=window._writeBatch(window._db); let novos=0,ign=0;
    for(let i=hi+1;i<data.length;i++){
      const r=data[i]; if(!r||!r[iNome]||!String(r[iNome]).trim()) continue;
      const mat=String(r[iMat]||'').trim();
      if(mat&&colaboradores.some(c=>c.mat===mat)){ign++;continue;}
      const c={mat,nome:String(r[iNome]).trim().toUpperCase(),cpf:String(r[iCPF]||'').trim(),
        cargo:String(r[iCargo]||'').trim().toUpperCase(),depto:String(r[iDepto]||'').trim(),
        status:String(r[iStat]||'Ativo').trim(),mobilidade:String(r[iMob]||'perto').trim().toLowerCase(),
        vr:fnum(r[iVR]),cafe:fnum(r[iCafe]),comb:fnum(r[iComb]),
        elegibilidade:{vr:fnum(r[iVR])>0,cafe:fnum(r[iCafe])>0,mobilidade:fnum(r[iComb])>0,folha:true,folhaCLT:true,folhaMEI:false}};
      const id=mat||(c.nome.replace(/[^A-Za-z0-9]/g,'_').substr(0,20)+'_'+Date.now()+novos);
      c._id=id; b.set(window._doc('colaboradores',id),c); colaboradores.push(c); novos++;
    }
    await b.commit();
    toast('\u2705 '+novos+' importados, '+ign+' ignorados.','success');
    event.target.value='';
  };
  reader.readAsBinaryString(file);
}

// ============================================================
// CONTROLE DE F\u00C9RIAS
// ============================================================
// ════════════════════════════════════════════════════════════════
// FÉRIAS UM989 (agência de marketing — só controle de férias)
// ════════════════════════════════════════════════════════════════
async function loadUM989(){
  try{
    const snap=await window._getDocs(window._col('um989'));
    um989List=[]; snap.forEach(d=>um989List.push(Object.assign({_id:d.id},d.data())));
    um989List.sort((a,b)=>String(a.nome||'').localeCompare(String(b.nome||'')));
    // Backfill: grava o próximo vencimento concreto p/ quem está sem (o alerta
    // de +30 depende de um ferVenc armazenado).
    const hoje=new Date(); hoje.setHours(0,0,0,0);
    for(const c of um989List){
      if(!c.ferVenc && c.admissao){
        const adm=_dataLocal(c.admissao);
        if(adm){ c.ferVenc=_isoLocal(_proxVenc(adm.getDate(),adm.getMonth()+1,hoje)); try{ await fsSet('um989',c._id,c); }catch(e){} }
      }
    }
  }catch(e){ console.error('Erro um989:',e); }
  return um989List;
}
// Próximo vencimento = aniversário de admissão (a cada ano, +30).
function _um989Venc(c){
  if(c.ferVenc) return _dataLocal(c.ferVenc);
  const adm=_dataLocal(c.admissao); if(!adm) return null;
  const hoje=new Date(); hoje.setHours(0,0,0,0);
  return _proxVenc(adm.getDate(), adm.getMonth()+1, hoje);
}

function pgFerUM989(){
  // Acesso restrito: só o master e o papel UM989 podem ver o controle de férias da UM989.
  if(!(podeGerenciarUsuarios()||ehUM989())){
    return '<div class="page-header"><h2 class="page-title">Férias — UM989</h2></div>'
      +'<div class="empty-state"><div class="empty-icon">🔒</div><p>Acesso restrito ao usuário master e à equipe da UM989.</p></div>';
  }
  return `
    <div class="page-header"><h2 class="page-title">Férias — UM989</h2>
      <p class="page-subtitle">Controle de férias da agência UM989 (sem vínculo trabalhista). A cada ano de admissão, +30 dias de saldo.</p></div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Novo colaborador</div>
      <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">
        <div class="fg" style="flex:1;min-width:220px"><label>Nome</label><input type="text" id="um-nome" placeholder="Nome do colaborador"></div>
        <div class="fg"><label>Admissão</label><input type="date" id="um-adm"></div>
        <div class="fg"><label>Saldo inicial (dias)</label><input type="number" id="um-saldo" value="0" min="-90" max="90" style="width:120px"></div>
        <button class="btn btn-primary btn-sm" onclick="salvarNovoUM989()">Adicionar</button>
      </div>
      <div class="text-xs text-muted" style="margin-top:8px">O saldo pode ser negativo (férias antecipadas). Use "+30" a cada aniversário para creditar o novo ciclo.</div>
    </div>
    <div id="um989-alerta" style="margin-bottom:12px"></div>
    <div class="filter-bar" style="align-items:flex-end;margin-bottom:12px">
      <div class="filter-group" style="flex:1"><label>Buscar</label><input type="text" id="um-q" placeholder="Nome..." oninput="renderUM989()"></div>
    </div>
    <div id="um989-lista"></div>`;
}

function renderUM989(){
  const el=document.getElementById('um989-lista'); if(!el) return;
  const hoje=new Date(); hoje.setHours(0,0,0,0);

  // Modo FICHA (página do colaborador)
  if(um989Ficha){ el.innerHTML=fichaUM989HTML(um989Ficha); return; }

  const q=(document.getElementById('um-q')?.value||'').toLowerCase().trim();
  // Sem busca: só Trabalhando. Com busca: inclui Desligados (para o histórico).
  let lista=um989List.filter(c=> q ? true : (c.status||'Trabalhando')!=='Desligado');
  if(q) lista=lista.filter(c=>(c.nome||'').toLowerCase().includes(q));

  // Alerta automático: vencimento atingido (+30) e agendamentos que chegaram.
  const alertaEl=document.getElementById('um989-alerta');
  if(alertaEl){
    const ativo=c=>(c.status||'Trabalhando')!=='Desligado';
    const due=um989List.filter(c=>ativo(c) && c.ferVenc && _dataLocal(c.ferVenc)<=hoje);
    const agend=um989List.filter(c=>ativo(c) && c.agendaInicio && _dataLocal(c.agendaInicio)<=hoje);
    let html='';
    if(due.length){
      html+='<div class="alert alert-warning" style="margin-bottom:8px">🔔 <strong>Vencimento de férias atingido</strong> — creditar +30 dias: '
        +due.map(c=>'<button class="btn btn-warning btn-xs" style="margin:2px" onclick="abrirCreditarCicloUM989(\''+c._id+'\')">'+c.nome+' — creditar +30</button>').join(' ')+'</div>';
    }
    if(agend.length){
      html+='<div class="alert alert-info">🗓️ Férias agendadas que já chegaram: '+agend.map(c=>c.nome+' ('+_dataLocal(c.agendaInicio).toLocaleDateString('pt-BR')+')').join(', ')+'</div>';
    }
    alertaEl.innerHTML=html;
  }

  if(!lista.length){ el.innerHTML='<div class="empty-state"><div class="empty-icon">🏖️</div><p>'+(q?'Nenhum resultado.':'Nenhum colaborador ativo na UM989.')+'</p></div>'; return; }

  el.innerHTML='<div style="overflow-x:auto;border-radius:var(--radius);border:1px solid var(--border)">'
    +'<table class="tbl" style="width:100%;border-collapse:collapse;font-size:12px">'
    +'<thead><tr>'
    +'<th style="padding:9px 10px;text-align:left">Nome</th>'
    +'<th style="padding:9px 10px;text-align:left">Admissão</th>'
    +'<th style="padding:9px 10px;text-align:left">Próx. venc.</th>'
    +'<th style="padding:9px 10px;text-align:right">Saldo</th>'
    +'<th style="padding:9px 10px;text-align:left">Status</th>'
    +'<th style="padding:9px 10px;text-align:left">Agendamento</th>'
    +'<th style="padding:9px 10px;text-align:center">Ações</th>'
    +'</tr></thead><tbody>'
    +lista.map((c,i)=>{
      const venc=_um989Venc(c);
      const saldo=fnum(c.ferSaldo);
      const desligado=(c.status||'Trabalhando')==='Desligado';
      const agenda=(c.agendaInicio&&c.agendaFim)?(_dataLocal(c.agendaInicio).toLocaleDateString('pt-BR')+' a '+_dataLocal(c.agendaFim).toLocaleDateString('pt-BR')):'—';
      return '<tr style="border-bottom:1px solid var(--border);background:'+(i%2===0?'#F8F9FB':'')+(desligado?';opacity:.6':'')+'">'
        +'<td style="padding:8px 10px;font-weight:600">'+(c.nome||'—')+'</td>'
        +'<td style="padding:8px 10px">'+(c.admissao?_dataLocal(c.admissao).toLocaleDateString('pt-BR'):'—')+'</td>'
        +'<td style="padding:8px 10px">'+(venc?_ddmm(venc):'—')+'</td>'
        +'<td style="padding:8px 10px;text-align:right;font-weight:700;color:'+(saldo<0?'var(--red)':'var(--blue)')+'">'+saldo+' d</td>'
        +'<td style="padding:8px 10px">'+(desligado?'<span class="badge badge-gray">Desligado</span>':'<span class="badge badge-green">Trabalhando</span>')+'</td>'
        +'<td style="padding:8px 10px">'+agenda+'</td>'
        +'<td style="padding:8px 10px;text-align:center;white-space:nowrap">'
          +'<button class="btn btn-primary btn-xs" onclick="abrirGozarUM989(\''+c._id+'\')" title="Registrar gozo">Gozar</button> '
          +'<button class="btn btn-ghost btn-xs" onclick="abrirAgendarUM989(\''+c._id+'\')">Agendar</button> '
          +'<button class="btn btn-ghost btn-xs" onclick="abrirFichaUM989(\''+c._id+'\')" title="Ficha / histórico">Editar</button>'
        +'</td></tr>';
    }).join('')+'</tbody></table></div>';
}

// Ficha (página) do colaborador: dados editáveis + ações + histórico.
function fichaUM989HTML(id){
  const c=um989List.find(x=>x._id===id);
  if(!c) return '<div style="margin-bottom:10px"><button class="btn btn-ghost btn-sm" onclick="voltarUM989()">← Voltar</button></div><p class="text-muted">Colaborador não encontrado.</p>';
  const venc=_um989Venc(c);
  const st=c.status||'Trabalhando';
  const log=Array.isArray(c.feriasLog)?c.feriasLog.slice().reverse():[];
  const logHtml=log.length ? log.map(l=>{
    if(l.tipo==='ciclo') return '<div style="border-bottom:1px solid var(--border);padding:6px 2px;font-size:12px"><strong style="color:var(--green)">+'+(l.dias||30)+'</strong> novo ciclo'+(l.desconto?' (−'+l.desconto+' desconto)':'')+(l.justificativa?' · '+l.justificativa:'')+' <span class="text-muted">('+new Date(l.em).toLocaleDateString('pt-BR')+')</span></div>';
    const per=(l.inicio?_dataLocal(l.inicio).toLocaleDateString('pt-BR'):'')+(l.fim?' a '+_dataLocal(l.fim).toLocaleDateString('pt-BR'):'');
    return '<div style="border-bottom:1px solid var(--border);padding:6px 2px;font-size:12px"><strong style="color:var(--red)">-'+l.dias+'d</strong> gozados '+per+(l.justificativa?' · '+l.justificativa:'')+' <span class="text-muted">('+new Date(l.em).toLocaleDateString('pt-BR')+')</span></div>';
  }).join('') : '<div class="text-muted">Sem registros.</div>';
  return `
    <div style="margin-bottom:10px"><button class="btn btn-ghost btn-sm" onclick="voltarUM989()">← Voltar</button></div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Ficha — ${c.nome||''}</div>
      <div class="form-grid cols2">
        <div class="fg"><label>Nome</label><input type="text" id="fic-nome" value="${(c.nome||'').replace(/"/g,'&quot;')}"></div>
        <div class="fg"><label>Admissão</label><input type="date" id="fic-adm" value="${c.admissao||''}"></div>
        <div class="fg"><label>Status</label><select id="fic-status"><option value="Trabalhando" ${st!=='Desligado'?'selected':''}>Trabalhando</option><option value="Desligado" ${st==='Desligado'?'selected':''}>Desligado</option></select></div>
        <div class="fg"><label>Saldo (dias)</label><input type="number" id="fic-saldo" value="${fnum(c.ferSaldo)}" min="-90" max="120"></div>
        <div class="fg"><label>Próx. vencimento (dia/mês)</label><input type="text" id="fic-venc" value="${venc?_ddmm(venc):''}" placeholder="DD/MM" maxlength="5"></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;align-items:center">
        <button class="btn btn-primary btn-sm" onclick="salvarFichaUM989('${id}')">Salvar</button>
        <button class="btn btn-primary btn-sm" onclick="abrirGozarUM989('${id}')">Gozar férias</button>
        <button class="btn btn-ghost btn-sm" onclick="abrirAgendarUM989('${id}')">Agendar</button>
        <button class="btn btn-danger btn-sm" style="margin-left:auto" onclick="excluirUM989('${id}')">Excluir</button>
      </div>
    </div>
    <div class="card"><div class="card-title">Histórico de férias</div>${logHtml}</div>`;
}
function abrirFichaUM989(id){ um989Ficha=id; renderUM989(); }
function voltarUM989(){ um989Ficha=null; renderUM989(); }
async function salvarFichaUM989(id){
  const c=um989List.find(x=>x._id===id); if(!c) return;
  c.nome=(document.getElementById('fic-nome')?.value||'').trim()||c.nome;
  c.admissao=document.getElementById('fic-adm')?.value||'';
  c.status=document.getElementById('fic-status')?.value||'Trabalhando';
  c.ferSaldo=fnum(document.getElementById('fic-saldo')?.value);
  c.ferVenc=_resolveVencInput(document.getElementById('fic-venc')?.value||'', c.ferVenc);
  try{ await fsSet('um989',id,c); toast('Ficha salva.','success'); renderUM989(); }
  catch(e){ toast('Erro: '+e.message,'error'); }
}

async function salvarNovoUM989(){
  const nome=(document.getElementById('um-nome')?.value||'').trim();
  const adm=document.getElementById('um-adm')?.value||'';
  const saldo=fnum(document.getElementById('um-saldo')?.value);
  if(!nome){ toast('Informe o nome.','error'); return; }
  const id='um_'+Date.now();
  let ferVenc='';
  if(adm){ const a=_dataLocal(adm); const h=new Date(); h.setHours(0,0,0,0); if(a) ferVenc=_isoLocal(_proxVenc(a.getDate(),a.getMonth()+1,h)); }
  const c={_id:id,nome,admissao:adm,status:'Trabalhando',ferSaldo:saldo,ferVenc,agendaInicio:'',agendaFim:'',feriasLog:[],criadoEm:new Date().toISOString()};
  try{
    await fsSet('um989',id,c); um989List.push(c);
    document.getElementById('um-nome').value=''; document.getElementById('um-adm').value=''; document.getElementById('um-saldo').value='0';
    toast('Colaborador adicionado.','success'); renderUM989();
  }catch(e){ toast('Erro: '+e.message,'error'); }
}

async function excluirUM989(id){
  const c=um989List.find(x=>x._id===id);
  if(!confirm('Excluir '+((c&&c.nome)||'este colaborador')+' da UM989?')) return;
  try{ await fsDel('um989',id); um989List=um989List.filter(x=>x._id!==id); um989Ficha=null; toast('Removido.','success'); renderUM989(); }
  catch(e){ toast('Erro: '+e.message,'error'); }
}

// Alerta de vencimento: credita +30 (com opção de desconto + justificativa) e
// rola o próximo vencimento +1 ano.
function abrirCreditarCicloUM989(id){
  const c=um989List.find(x=>x._id===id); if(!c) return;
  const venc=_um989Venc(c);
  document.getElementById('modal-um-ciclo')?.remove();
  const html='<div class="modal-overlay open" id="modal-um-ciclo" data-dynamic="1">'
    +'<div class="modal" style="max-width:460px"><div class="modal-title">Vencimento de férias — '+(c.nome||'')+'</div>'
    +'<div class="modal-sub">Vencimento '+(venc?_ddmm(venc):'—')+' atingido. Serão acrescidos <strong>+30 dias</strong> ao saldo (atual: '+fnum(c.ferSaldo)+').</div>'
    +'<div class="form-grid cols2" style="margin-top:10px">'
      +'<div class="fg"><label>Dias de desconto</label><input type="number" id="uc-desc" value="0" min="0" max="30"></div>'
      +'<div class="fg"><label>Novo saldo</label><input type="text" id="uc-novo" value="'+(fnum(c.ferSaldo)+30)+' dias" disabled></div>'
    +'</div>'
    +'<div class="fg" style="margin-top:8px"><label>Justificativa do desconto (se houver)</label><input type="text" id="uc-just" placeholder="Ex.: faltas / acordo"></div>'
    +'<div class="modal-footer"><button class="btn btn-ghost" id="uc-cancel">Cancelar</button>'
      +'<button class="btn btn-primary" id="uc-ok">Creditar +30</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
  const upd=()=>{const d=Math.max(0,fnum(document.getElementById('uc-desc')?.value));const el=document.getElementById('uc-novo');if(el)el.value=(fnum(c.ferSaldo)+30-d)+' dias';};
  document.getElementById('uc-desc').oninput=upd;
  document.getElementById('uc-cancel').onclick=()=>document.getElementById('modal-um-ciclo')?.remove();
  document.getElementById('uc-ok').onclick=()=>salvarCreditarCicloUM989(id);
}
async function salvarCreditarCicloUM989(id){
  const c=um989List.find(x=>x._id===id); if(!c) return;
  const venc=_um989Venc(c); if(!venc){ toast('Sem vencimento.','error'); return; }
  const desc=Math.max(0,fnum(document.getElementById('uc-desc')?.value));
  const just=(document.getElementById('uc-just')?.value||'').trim();
  c.ferSaldo=fnum(c.ferSaldo)+30-desc;
  const nv=new Date(venc); nv.setFullYear(nv.getFullYear()+1); c.ferVenc=_isoLocal(nv);
  c.feriasLog=Array.isArray(c.feriasLog)?c.feriasLog:[];
  c.feriasLog.push({tipo:'ciclo',dias:30,desconto:desc,justificativa:just,em:new Date().toISOString()});
  try{ await fsSet('um989',id,c); document.getElementById('modal-um-ciclo')?.remove(); toast('Ciclo creditado. Saldo: '+c.ferSaldo+' dias.','success'); renderUM989(); }
  catch(e){ toast('Erro: '+e.message,'error'); }
}

function abrirAgendarUM989(id){
  const c=um989List.find(x=>x._id===id); if(!c) return;
  document.getElementById('modal-um-agenda')?.remove();
  const html='<div class="modal-overlay open" id="modal-um-agenda" data-dynamic="1">'
    +'<div class="modal" style="max-width:440px"><div class="modal-title">Agendar férias — '+(c.nome||'')+'</div>'
    +'<div class="form-grid cols2" style="margin-top:10px">'
      +'<div class="fg"><label>Início</label><input type="date" id="uma-ini" value="'+(c.agendaInicio||'')+'"></div>'
      +'<div class="fg"><label>Fim</label><input type="date" id="uma-fim" value="'+(c.agendaFim||'')+'"></div>'
    +'</div>'
    +'<div class="modal-footer"><button class="btn btn-ghost" onclick="document.getElementById(\'modal-um-agenda\').remove()">Cancelar</button>'
      +'<button class="btn btn-primary" onclick="salvarAgendarUM989(\''+id+'\')">Salvar</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}
async function salvarAgendarUM989(id){
  const c=um989List.find(x=>x._id===id); if(!c) return;
  c.agendaInicio=document.getElementById('uma-ini')?.value||'';
  c.agendaFim=document.getElementById('uma-fim')?.value||'';
  try{ await fsSet('um989',id,c); document.getElementById('modal-um-agenda')?.remove(); toast('Agendamento salvo.','success'); renderUM989(); }
  catch(e){ toast('Erro: '+e.message,'error'); }
}

function abrirGozarUM989(id){
  const c=um989List.find(x=>x._id===id); if(!c) return;
  document.getElementById('modal-um-gozar')?.remove();
  const html='<div class="modal-overlay open" id="modal-um-gozar" data-dynamic="1">'
    +'<div class="modal" style="max-width:460px"><div class="modal-title">Gozar férias — '+(c.nome||'')+'</div>'
    +'<div class="modal-sub">Saldo atual: <strong>'+fnum(c.ferSaldo)+' dias</strong>. Informe o período, os dias gozados e a justificativa.</div>'
    +'<div class="form-grid cols2" style="margin-top:10px">'
      +'<div class="fg"><label>Início</label><input type="date" id="umg-ini" value="'+(c.agendaInicio||'')+'"></div>'
      +'<div class="fg"><label>Fim</label><input type="date" id="umg-fim" value="'+(c.agendaFim||'')+'"></div>'
      +'<div class="fg"><label>Dias gozados</label><input type="number" id="umg-dias" value="0" min="0" max="60"></div>'
    +'</div>'
    +'<div class="fg" style="margin-top:8px"><label>Justificativa</label><input type="text" id="umg-just" placeholder="Ex.: férias agendadas / antecipação"></div>'
    +'<div class="modal-footer"><button class="btn btn-ghost" onclick="document.getElementById(\'modal-um-gozar\').remove()">Cancelar</button>'
      +'<button class="btn btn-primary" onclick="salvarGozarUM989(\''+id+'\')">Registrar</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}
async function salvarGozarUM989(id){
  const c=um989List.find(x=>x._id===id); if(!c) return;
  const dias=Math.max(0,fnum(document.getElementById('umg-dias')?.value));
  if(dias<=0){ toast('Informe os dias gozados.','error'); return; }
  const ini=document.getElementById('umg-ini')?.value||'';
  const fim=document.getElementById('umg-fim')?.value||'';
  const just=(document.getElementById('umg-just')?.value||'').trim();
  c.ferSaldo=fnum(c.ferSaldo)-dias;
  c.feriasLog=Array.isArray(c.feriasLog)?c.feriasLog:[];
  c.feriasLog.push({tipo:'gozo',dias,inicio:ini,fim,justificativa:just,em:new Date().toISOString()});
  c.agendaInicio=''; c.agendaFim='';
  try{ await fsSet('um989',id,c); document.getElementById('modal-um-gozar')?.remove(); toast('Gozo registrado. Saldo: '+c.ferSaldo+' dias.','success'); renderUM989(); }
  catch(e){ toast('Erro: '+e.message,'error'); }
}

function pgFerImport(){
  return `
    <div class="page-header"><h2 class="page-title">Importar Dados de F\u00E9rias</h2><p class="page-subtitle">Atualize as datas de f\u00E9rias a partir do relat\u00F3rio da Senior.</p></div>
    <div class="card">
      <div class="alert alert-info" style="margin-bottom:14px">
        Colunas esperadas: <strong>Matr\u00EDcula, Nome, Data Admiss\u00E3o (opcional), Data In\u00EDcio, Data Fim, Data Vencimento, Dias Dispon\u00EDveis</strong><br>
        Se a coluna <strong>Admiss\u00E3o</strong> estiver presente, ela ser\u00E1 usada para calcular automaticamente o vencimento dos colaboradores que ainda nao tem essa informa\u00E7\u00E3o.
      </div>
      <div class="upload-zone" onclick="document.getElementById('fer-file').click()">
        <input type="file" id="fer-file" accept=".xlsx,.xls" onchange="importarFeriasData(event)">
        <div class="upload-icon">Ferias\uFE0F</div>
        <div class="upload-text">Clique para selecionar o relat\u00F3rio de f\u00E9rias</div>
        <div class="upload-sub">Formato .xlsx ou .xls</div>
      </div>
      <div id="fer-import-prev" style="margin-top:14px"></div>
    </div>`;
}

async function importarFeriasData(event){
  const file=event.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=async e=>{
    const wb=XLSX.read(e.target.result,{type:'binary'});
    const data=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1});
    let hi=0;
    for(let i=0;i<Math.min(5,data.length);i++){if(data[i].some(v=>String(v||'').toLowerCase().includes('nome'))){hi=i;break;}}
    const hs=data[hi].map(h=>String(h||'').toLowerCase().trim());
    const iMat=hs.findIndex(h=>h.includes('matr')||h.includes('cadastro'));
    const iAdm=hs.findIndex(h=>h.includes('admiss'));
    const iIni=hs.findIndex(h=>h.includes('inicio')||h.includes('in\u00EDcio')||h.includes('ini'));
    const iFim=hs.findIndex(h=>h.includes('fim')||h.includes('retorno'));
    const iVenc=hs.findIndex(h=>h.includes('venc'));
    const iDias=hs.findIndex(h=>h.includes('dias'));
    const b=window._writeBatch(window._db); let ok=0,admOk=0;
    for(let i=hi+1;i<data.length;i++){
      const r=data[i]; if(!r||!r[iMat]) continue;
      const mat=String(r[iMat]||'').trim();
      const c=colaboradores.find(x=>x.mat===mat); if(!c) continue;
      try{
        if(iAdm>=0&&r[iAdm]&&!c.admissao){ c.admissao=new Date(r[iAdm]).toISOString().split('T')[0]; admOk++; }
        if(r[iIni]) c.ferInicio=new Date(r[iIni]).toISOString().split('T')[0];
        if(r[iFim])  c.ferFim   =new Date(r[iFim]).toISOString().split('T')[0];
        if(r[iVenc]) c.ferVenc  =new Date(r[iVenc]).toISOString().split('T')[0];
        if(r[iDias]) c.ferDias  =fnum(r[iDias]);
        // Alinha o status ao período: se hoje está dentro das férias e a pessoa
        // está trabalhando, marca Férias (reflete no Controle de Férias e no cálculo).
        if(c.ferInicio && c.ferFim && feriasSituacao(c,new Date())==='em_ferias' && statusGrupo(c.status)==='trabalhando'){ c.status='Ferias'; }
        b.set(window._doc('colaboradores',c._id),c); ok++;
      }catch(err){}
    }
    await b.commit();
    document.getElementById('fer-import-prev').innerHTML=
      `<div class="alert alert-success">\u2705 <strong>${ok} colaboradores</strong> atualizados com dados de f\u00E9rias`
      +(admOk>0?` (${admOk} com data de admiss\u00E3o preenchida)`:'')+`.</div>`;
    toast('\u2705 F\u00E9rias importadas: '+ok,'success');
    event.target.value='';
  };
  reader.readAsBinaryString(file);
}

function exportarFeriasExcel(){
  const wb=XLSX.utils.book_new();
  const rows=[['Matr\u00EDcula','Nome','CPF','Departamento','Status','In\u00EDcio F\u00E9rias','Fim F\u00E9rias','Vencimento','Dias Dispon\u00EDveis'],
    ...colaboradores.map(c=>[c.mat||'',c.nome,c.cpf||'',c.depto||'',c.status,c.ferInicio||'',c.ferFim||'',c.ferVenc||'',c.ferDias||''])];
  const ws=XLSX.utils.aoa_to_sheet(rows);
  ws['!cols']=[{wch:14},{wch:35},{wch:16},{wch:20},{wch:10},{wch:14},{wch:14},{wch:14},{wch:14}];
  XLSX.utils.book_append_sheet(wb,ws,'Ferias');
  XLSX.writeFile(wb,'Controle_Ferias.xlsx');
  toast('\u2705 Excel exportado!','success');
}

// ============================================================
// DASHBOARD GERAL
// ============================================================
function pgDashMain(){
  return `
    <div class="page-header"><h2> Dashboard Geral</h2><p>Vis\u00E3o consolidada de todos os m\u00F3dulos.</p></div>
    <div id="dash-content"><div class="empty-state"><div class="empty-icon"></div><p>Carregando...</p></div></div>`;
}

function renderDashMain(){
  const du=lanDU;
  const hoje=new Date(); hoje.setHours(0,0,0,0);
  const em30=new Date(hoje); em30.setDate(em30.getDate()+30);
  const unicos=colaboradoresUnicos(); // dedup por pessoa (MEI/Sócio 1x)
  const ehFerias=s=>s==='Ferias'||s==='Ferias Coletiva';
  const trabalhando=unicos.filter(c=>c.status==='Trabalhando');
  const emFerias=unicos.filter(c=>ehFerias(c.status));
  const afastados=unicos.filter(c=>STATUS_SO_CESTA.includes(c.status));

  // Somas em R$ sobre os registros que recebem; contagem por pessoa única
  let tVR=0,tCafe=0,tCesta=0,tComb=0,tVT=0;
  const pk=c=>(c.cpf||'').replace(/[^0-9]/g,'')||('nome:'+_normNome(c.nome));
  const setVR=new Set(),setCafe=new Set(),setComb=new Set(),setVT=new Set();
  colaboradores.filter(c=>!STATUS_NAO_RECEBE.includes(c.status)).forEach(c=>{
    const dr=getLanDR(c.mat,du);
    const {vr,cafe,comb,vt,cesta}=calcBen(c,dr,getLanDU(c.mat,du));
    tVR+=vr;tCafe+=cafe;tCesta=(tCesta||0)+cesta;tComb+=comb;tVT+=vt;
    const k=pk(c);
    if(vr>0)setVR.add(k); if(cafe>0)setCafe.add(k); if(comb>0)setComb.add(k); if([1,2,3,4].some(n=>fnum(c['vt'+n])>0))setVT.add(k);
  });

  // F\u00E9rias stats
  let ferOk=0,ferAm=0,ferLar=0,ferVerm=0;
  colaboradores.forEach(c=>{
    if(!c.ferVenc) return;
    const venc=new Date(c.ferVenc);
    const meses=(hoje-venc)/(1000*60*60*24*30);
    if(meses<0)ferOk++;
    else if(meses<=10)ferAm++;
    else if(meses<=12)ferLar++;
    else ferVerm++;
  });

  const comp=lanComp||'\u2014';
  const el=document.getElementById('dash-content');
  if(!el) return;
  el.innerHTML=`
    <div class="dash-section">
      <div class="dash-section-title"> Colaboradores</div>
      <div class="stats-grid">
        <div class="stat-card blue"><div class="stat-val">${unicos.length}</div><div class="stat-label">Total na Base</div></div>
        <div class="stat-card green"><div class="stat-val" style="color:var(--green)">${trabalhando.length}</div><div class="stat-label">Trabalhando</div></div>
        <div class="stat-card blue"><div class="stat-val" style="color:var(--blue)">${emFerias.length}</div><div class="stat-label">Em F\u00E9rias</div></div>
        <div class="stat-card red"><div class="stat-val" style="color:var(--red)">${afastados.length}</div><div class="stat-label">Afastados</div></div>
      </div>
    </div>

    <div class="dash-section">
      <div class="dash-section-title"> Benef\u00EDcios \u2014 Compet\u00EAncia ${comp}</div>
      <div class="stats-grid">
        <div class="stat-card orange"><div class="stat-val" style="font-size:18px;color:var(--orange)">${brl(tVR)}</div><div class="stat-label">VR\uFE0F Vale Refei\u00E7\u00E3o</div><div class="stat-sub">${setVR.size} colaboradores</div></div>
        <div class="stat-card yellow"><div class="stat-val" style="font-size:18px;color:var(--yellow)">${brl(tCafe)}</div><div class="stat-label">\u2615 Caf\u00E9 da Manh\u00E3</div><div class="stat-sub">${setCafe.size} colaboradores</div></div>
        <div class="stat-card orange"><div class="stat-val" style="font-size:18px;color:var(--orange)">${brl(tComb)}</div><div class="stat-label">\u26FD Combust\u00EDvel</div><div class="stat-sub">${setComb.size} colaboradores</div></div>
        <div class="stat-card blue"><div class="stat-val" style="font-size:18px;color:var(--blue)">${brl(tVT)}</div><div class="stat-label">VT Vale Transporte</div><div class="stat-sub">${setVT.size} colaboradores</div></div>
        <div class="stat-card green" style="grid-column:1/-1"><div class="stat-val" style="font-size:24px;color:var(--green)">${brl(tVR+tCafe+tCesta+tComb+tVT)}</div><div class="stat-label">$ Total Geral de Benef\u00EDcios</div></div>
      </div>
    </div>

    <div class="dash-section">
      <div class="dash-section-title">Ferias\uFE0F Controle de F\u00E9rias</div>
      <div class="stats-grid">
        <div class="stat-card green"><div class="stat-val" style="color:var(--green)">${ferOk}</div><div class="stat-label">\u2705 F\u00E9rias OK</div></div>
        <div class="stat-card yellow"><div class="stat-val" style="color:var(--yellow)">${ferAm}</div><div class="stat-label">\u26A0\uFE0F Vencida 1-10m</div></div>
        <div class="stat-card orange"><div class="stat-val" style="color:var(--orange)">${ferLar}</div><div class="stat-label"> Vencida 11-12m</div></div>
        <div class="stat-card red"><div class="stat-val" style="color:var(--red)">${ferVerm}</div><div class="stat-label"> Vencida +12m</div></div>
      </div>
    </div>

    <div class="dash-section">
      <div class="dash-section-title"> Por Empresa</div>
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>Empresa</th><th>Total</th><th>Trabalhando</th><th>Afastados</th><th>Em F\u00E9rias</th><th>Total Benef\u00EDcios</th></tr></thead>
          <tbody>
            ${getEmpresaList().map(emp=>{
              const fcAll=colaboradores.filter(c=>_empresaMatch(c,[emp.cod]));
              const fc=unicos.filter(c=>_empresaMatch(c,[emp.cod]));
              const fa=fc.filter(c=>c.status==='Trabalhando').length;
              const fi=fc.filter(c=>STATUS_SO_CESTA.includes(c.status)).length;
              const ff=fc.filter(c=>ehFerias(c.status)).length;
              let tot=0;
              fcAll.filter(c=>!STATUS_NAO_RECEBE.includes(c.status)).forEach(c=>{
                const dr=getLanDR(c.mat,du);
                const {vr,cafe,comb,vt,cesta}=calcBen(c,dr,getLanDU(c.mat,du));
                tot+=vr+cafe+comb+vt+cesta;
              });
              return `<tr>
                <td><strong>${emp.cod}</strong></td>
                <td>${fc.length}</td>
                <td>${fa}</td>
                <td>${fi}</td>
                <td>${ff}</td>
                <td class="mono" style="text-align:right;font-weight:600;color:var(--green)">${brl(tot)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ============================================================
// INIT
// ============================================================

// ============================================================
// FIREBASE \u2014 CARREGAR DADOS
// ============================================================
async function loadColaboradores(){
  setSS('\u23F3 Carregando...','');
  try{
    const snap=await window._getDocs(window._col('colaboradores'));
    colaboradores=[];
    const corrigidos=new Set();
    snap.forEach(d=>{
      const c={...d.data(),_id:d.id};
      if(!['vt','combustivel','perto','carro_empresa'].includes(c.mobilidade)){
        c.mobilidade=inferMob(c); corrigidos.add(c);
      }
      const stNorm=normalizarStatus(c.status); // Ativo->Trabalhando, Inativo->Afastado
      if(stNorm!==c.status){ c.status=stNorm; corrigidos.add(c); }
      colaboradores.push(c);
    });
    aplicarEscopoColaboradores(); // restringe \u00e0s empresas do papel do usu\u00e1rio
    if(colaboradores.length===0){
      setSS('\u2705 0 colaboradores','ok');
    } else {
      setSS('\u2705 '+colaboradores.length+' colaboradores','ok');
      // Persistir corre\u00e7\u00f5es (mobilidade/status) no Firebase, dentro do escopo
      const aSalvar=[...corrigidos].filter(c=>colaboradores.includes(c));
      if(aSalvar.length>0){
        for(let i=0;i<aSalvar.length;i+=400){
          const b=window._writeBatch(window._db);
          aSalvar.slice(i,i+400).forEach(c=>b.set(window._doc('colaboradores',c._id),c));
          await b.commit();
        }
      }
    }
  }catch(e){
    setSS('\u274C Erro','err');
    toast('Erro ao carregar: '+e.message,'error');
  }
}

// Lancamento agora e POR COMPETENCIA: docs no Firestore com id `MM_AAAA__mat`.
// Em memoria, `lancamento` guarda so a competencia atual (lanComp), keyed por mat.
function _lanKey(comp,mat){ return String(comp||'').replace('/','_')+'__'+mat; }
async function loadLancamento(){
  lancamento={};
  const pref=String(lanComp||'').replace('/','_')+'__';
  if(!lanComp) return;
  try{
    const snap=await window._getDocs(window._col('lancamento'));
    snap.forEach(d=>{ if(d.id.indexOf(pref)===0) lancamento[d.id.slice(pref.length)]=d.data(); });
  }catch(e){ console.error('Erro lancamento:',e); }
}
// Recarrega o lancamento ao trocar a competencia no campo do Lancamento.
async function onLanCompChange(v){ setLanComp(v); await loadLancamento(); renderLancamento(); }

async function loadConfig(){
  try{
    const snap=await window._getDocs(window._col('config'));
    snap.forEach(d=>{
      if(d.id==='calculo'){
        const c=d.data();
        const setR=(nm,v)=>{const el=document.querySelector('input[name="'+nm+'"][value="'+v+'"]');if(el)el.checked=true;};
        setR('cfg-vr',c.tipoVR||'mult');
        setR('cfg-cafe',c.tipoCafe||'fixo');
        setR('cfg-comb',c.tipoComb||'prop');
        setR('cfg-vt',c.tipoVT||'mult');
        if(c.cestaPadrao!=null && fnum(c.cestaPadrao)>0) CESTA_PADRAO=fnum(c.cestaPadrao);
        if(c.premioValor!=null && fnum(c.premioValor)>0) PREMIO_VAL=fnum(c.premioValor);
        if(c.vrPadrao!=null) VR_PADRAO=fnum(c.vrPadrao);
        if(c.cafePadrao!=null) CAFE_PADRAO=fnum(c.cafePadrao);
      }
      if(d.id==='vtLinhas'){
        const c=d.data();
        if(Array.isArray(c.linhas) && c.linhas.length) VT_LINHAS=c.linhas;
      }
    });
  }catch(e){ console.error('Erro config:',e); }
}

async function fsSet(col,id,data){
  await window._setDoc(window._doc(col,id),data);
}

async function fsDel(col,id){
  await window._deleteDoc(window._doc(col,id));
}

async function fsSetLan(mat,data){
  await fsSet('lancamento',_lanKey(lanComp,mat),data);
}

async function initApp(user){
  const _hs=document.getElementById('home-screen'); if(_hs) _hs.style.display='none';
  const _ls=document.getElementById('login-screen'); if(_ls) _ls.style.display='none';
  const ok=await carregarUsuarioAtual(user.email);
  if(!ok){
    // usuário sem acesso liberado
    window._signOut();
    document.getElementById('app-screen').style.display='none';
    document.getElementById('login-screen').style.display='flex';
    const errEl=document.getElementById('login-error');
    if(errEl){ errEl.textContent='Usuário sem acesso liberado. Procure o administrador (Master).'; errEl.style.display='block'; }
    return;
  }
  // Login único: cai no PORTAL (lançador) e a pessoa escolhe a plataforma.
  mostrarPortal();
}

// Portal pós-login: ícones das PLATAFORMAS que o papel acessa.
// "Sistema de RH" abre o app completo (os módulos permitidos ficam juntos lá
// dentro); "Treinamentos" abre a outra plataforma. O que não tem acesso não aparece.
function mostrarPortal(){
  const hs=document.getElementById('home-screen');
  const ls=document.getElementById('login-screen');
  const as=document.getElementById('app-screen');
  if(ls) ls.style.display='none';
  if(as) as.style.display='none';
  const pi=PAPEIS[usuarioAtual.papel]||{label:usuarioAtual.papel};
  const body=document.getElementById('portal-body');
  if(body){
    const tiles=[];
    tiles.push('<div class="home-card" onclick="entrarBeneficios()">'
      +'<div class="hc-ico"><i class="ti ti-briefcase"></i></div>'
      +'<div class="hc-tit">Sistema de RH</div>'
      +'<div class="hc-desc">'+(ehUM989()?'Controle de Férias UM989.':'Colaboradores, benefícios, férias, folha, prêmio e dashboard.')+'</div>'
      +'<div class="hc-cta"><i class="ti ti-arrow-right"></i> Acessar</div></div>');
    if(!ehUM989()){   // Treinamentos: todos os papéis, exceto UM989
      tiles.push('<div class="home-card" onclick="window.location.href=\'buscador.html\'">'
        +'<div class="hc-ico hc-ico--blue"><i class="ti ti-movie"></i></div>'
        +'<div class="hc-tit">Treinamentos</div>'
        +'<div class="hc-desc">Catálogo de vídeos de treinamento.</div>'
        +'<div class="hc-cta hc-cta--blue">Acessar <i class="ti ti-arrow-right"></i></div></div>');
    }
    body.innerHTML=tiles.join('');
  }
  const info=document.getElementById('portal-user');
  if(info) info.textContent=usuarioAtual.nome+' · '+pi.label;
  if(hs) hs.style.display='flex';
}

function voltarPortal(){
  const as=document.getElementById('app-screen'); if(as) as.style.display='none';
  mostrarPortal();
}

// Abre o app COMPLETO de RH (os módulos permitidos aparecem na barra de módulos).
function entrarBeneficios(){
  const hs=document.getElementById('home-screen'); if(hs) hs.style.display='none';
  document.getElementById('app-screen').style.display='flex';
  const pi=PAPEIS[usuarioAtual.papel];
  document.getElementById('user-name').textContent=usuarioAtual.nome+' · '+pi.label;
  aplicarVisibModulos();
  // UM989: acesso restrito — vai direto para a aba de férias UM989.
  if(ehUM989()){ switchModule('ferias'); return; }
  if(window.__benefLoaded){ switchModule(currentModule||'base'); return; }
  loadLanCtx();
  if(!lanComp){
    const hoje=new Date();
    setLanComp(String(hoje.getMonth()+1).padStart(2,'0')+'/'+hoje.getFullYear());
  }
  Promise.all([loadColaboradores(),loadLancamento(),loadConfig(),loadBasesSalvas()]).then(()=>{
    window.__benefLoaded=true;
    switchModule('base');
    checarRetornosFeriasBoot();
  });
}

// Ao abrir o sistema: avisa se há colaboradores cujo término de férias já passou.
function checarRetornosFeriasBoot(){
  try{
    const hoje=new Date();
    const pend=(colaboradores||[]).filter(c=>feriasSituacao(c,hoje)==='retorno_pendente');
    if(pend.length) toast(pend.length+' colaborador'+(pend.length>1?'es com retorno de férias pendente':' com retorno de férias pendente')+' — confira no Lançamento de Benefícios.','info',7000);
  }catch(e){}
}

function waitFirebase(cb){ if(window._firebaseReady)cb(); else window.addEventListener('firebaseReady',cb,{once:true}); }

waitFirebase(()=>{
  window._onAuthStateChanged(window._auth, user=>{
    if(user) initApp(user);
    else {
      // Deslogado: o portal é pós-login, então mostramos direto o login.
      const hs=document.getElementById('home-screen'); if(hs) hs.style.display='none';
      const as=document.getElementById('app-screen'); if(as) as.style.display='none';
      const ls=document.getElementById('login-screen'); if(ls) ls.style.display='flex';
    }
  });
});
// Tela inicial: navegar entre a home e o login.
function mostrarLogin(){
  const hs=document.getElementById('home-screen'); if(hs) hs.style.display='none';
  const ls=document.getElementById('login-screen'); if(ls) ls.style.display='flex';
  setTimeout(()=>document.getElementById('login-email')?.focus(),50);
}
function voltarHome(){
  const ls=document.getElementById('login-screen'); if(ls) ls.style.display='none';
  const hs=document.getElementById('home-screen'); if(hs) hs.style.display='flex';
}


// ════════════════════════════════════════════════════════════════
// BASE: IMPORTAR / SYNC (unificado)
// ════════════════════════════════════════════════════════════════
function pgBaseImport(){
  return `
    <div class="page-header">
      <h2> Importar</h2>
      <p>Três modos de importação a partir de planilhas (.xlsx).</p>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Modo de importação</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <label class="imp-modo" style="flex:1;min-width:220px"><input type="radio" name="import-modo" value="sync" checked style="accent-color:var(--blue)">
          <div><div style="font-weight:600;font-size:14px">Sincronizar com Senior</div>
            <div class="text-xs text-muted">Por status: detecta admissões, demissões, férias e afastamentos — confirma item a item.</div></div></label>
        <label class="imp-modo" style="flex:1;min-width:220px"><input type="radio" name="import-modo" value="carga" style="accent-color:var(--blue)">
          <div><div style="font-weight:600;font-size:14px">Carga Completa</div>
            <div class="text-xs text-muted">Todos os campos. Reconciliação total: novos, excluir, duplicatas CLT+MEI.</div></div></label>
        <label class="imp-modo" style="flex:1;min-width:220px"><input type="radio" name="import-modo" value="defpara" style="accent-color:var(--blue)">
          <div><div style="font-weight:600;font-size:14px">Função / Admissão / Férias</div>
            <div class="text-xs text-muted">De/para por nome+matrícula: preenche função, admissão e mês de férias.</div></div></label>
        <label class="imp-modo" style="flex:1;min-width:220px"><input type="radio" name="import-modo" value="novos" style="accent-color:var(--blue)">
          <div><div style="font-weight:600;font-size:14px">Novos Colaboradores (modelo RH)</div>
            <div class="text-xs text-muted">Sobe a planilha modelo preenchida pelo RH. Cria só os novos (ignora quem já existe).</div></div></label>
      </div>
    </div>
    <div class="card">
      <div class="alert alert-info" style="margin-bottom:14px" id="import-hint">
        <strong>Sincronizar com Senior:</strong> Colunas esperadas: Matrícula (ou Cadastro), Nome, Status. O status define a ação (Trabalhando = admissão, Demitido = remoção, Férias, Afastado...).
      </div>
      <div class="upload-zone" onclick="document.getElementById('import-file').click()">
        <input type="file" id="import-file" accept=".xlsx,.xls" onchange="processarImport(event)">
        <div class="upload-icon"></div>
        <div class="upload-text">Clique para selecionar o arquivo</div>
        <div class="upload-sub">.xlsx ou .xls</div>
      </div>
      <div id="import-preview" style="margin-top:14px"></div>
    </div>
    <div class="card">
      <div class="card-title">Modelo de planilha para Carga Completa</div>
      <button class="btn btn-success btn-sm" onclick="gerarModeloCarga()">Baixar modelo</button>
    </div>`;
}

function processarImport(event){
  const file=event.target.files[0]; if(!file) return;
  const modo=document.querySelector('input[name="import-modo"]:checked')?.value||'sync';
  if(modo==='sync') processarSyncStatus(event);
  else if(modo==='defpara') importarDePara(event);
  else if(modo==='novos') processarNovos(event);
  else processarCarga(event);
}

// Atualizar hint ao mudar modo
document.addEventListener('change', function(e){
  if(e.target.name==='import-modo'){
    const hint=document.getElementById('import-hint');
    if(!hint) return;
    if(e.target.value==='sync'){
      hint.innerHTML='<strong>Sincronizar com Senior:</strong> Colunas: Matrícula (ou Cadastro), Nome, Status. O status define a ação (Trabalhando = admissão, Demitido = remoção, Férias, Afastado...).';
    } else if(e.target.value==='defpara'){
      hint.innerHTML='<strong>Função / Admissão / Férias:</strong> Colunas: Nome, Matrícula, Função, Admissão e a coluna de mês de férias. Casa por nome+matrícula e preenche esses campos.';
    } else if(e.target.value==='novos'){
      hint.innerHTML='<strong>Novos Colaboradores (modelo RH):</strong> Use a planilha modelo preenchida (função, benefícios Sim/Não + valor, linhas de VT, férias). O sistema cria apenas os novos e ignora quem já existe (mesma matrícula/CPF).';
    } else {
      hint.innerHTML='<strong>Carga Completa:</strong> Colunas: Matrícula, Nome, CPF, Cargo, Departamento, Status, Filtro (OK/DUP/MEI/SOC), VR/dia, Café/dia, Combustível, Mobilidade.';
    }
    const pv=document.getElementById('import-preview'); if(pv) pv.innerHTML='';
  }
});

// ════════════════════════════════════════════════════════════════
// IMPORTAR NOVOS COLABORADORES (modelo RH preenchido pelo RH)
// Lê a planilha modelo, mostra preview (novos × já existem × erros)
// e cria APENAS os novos. Colunas casadas pelo texto do cabeçalho.
// ════════════════════════════════════════════════════════════════
let novosPendentes=[];

const _normH=s=>String(s==null?'':s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim();

// Localiza a aba e a linha de cabeçalho (a que tem "matricula" e "nome").
function _acharAbaNovos(wb){
  for(const name of wb.SheetNames){
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,blankrows:false,cellDates:true});
    for(let i=0;i<Math.min(8,rows.length);i++){
      const H=(rows[i]||[]).map(_normH);
      if(H.some(h=>h.includes('matricula')) && H.some(h=>h.includes('nome'))) return {rows,hi:i};
    }
  }
  return null;
}

// Converte data (Date do Excel, dd/mm/aaaa ou aaaa-mm-dd) para ISO local.
function _dataParaISO(v){
  if(v==null||v==='') return '';
  if(v instanceof Date && !isNaN(v)) return _isoLocal(v);
  const s=String(v).trim();
  let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if(m){ let y=+m[3]; if(y<100)y+=2000; return y+'-'+String(+m[2]).padStart(2,'0')+'-'+String(+m[1]).padStart(2,'0'); }
  m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(m) return m[1]+'-'+String(+m[2]).padStart(2,'0')+'-'+String(+m[3]).padStart(2,'0');
  const d=new Date(s); return isNaN(d)?'':_isoLocal(d);
}

// Casa o texto da linha de VT contra VT_LINHAS (por nome completo ou código).
function _vtDoTexto(txt){
  const s=String(txt||'').trim();
  if(!s) return null;
  let l=VT_LINHAS.find(x=>x.nome===s);
  if(!l){ const cod=s.split(/[\s\-]/)[0].trim(); l=VT_LINHAS.find(x=>x.cod&&x.cod===cod); }
  return l||null;
}

function processarNovos(event){
  const file=event.target.files[0]; if(!file) return;
  const prev=document.getElementById('import-preview');
  if(prev) prev.innerHTML='<div class="alert alert-info">Processando planilha...</div>';
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const wb=XLSX.read(e.target.result,{type:'binary',cellDates:true});
      const achou=_acharAbaNovos(wb);
      if(!achou){ prev.innerHTML='<div class="alert alert-error">Não encontrei o cabeçalho (colunas Matrícula e Nome). Use a planilha modelo.</div>'; return; }
      const {rows,hi}=achou;
      const H=rows[hi].map(_normH);
      const col=(...subs)=>H.findIndex(h=>subs.every(s=>h.includes(s)));
      const iMat=col('matricula'), iNome=col('nome'), iCPF=col('cpf'), iAdm=col('admiss'),
            iCargo=col('cargo'), iFunc=col('funcao'), iDepto=col('departamento'),
            iStatus=col('status'), iFiltro=col('tipo','filtro'),
            iVenc=col('vencimento'), iAgen=col('agendamento'),
            iVR=col('vr','?'), iVRv=col('vr','valor'),
            iCafe=col('cafe','?'), iCafev=col('cafe','valor'),
            iCesta=col('cesta','?'), iCestav=col('cesta','valor'),
            iMob=col('mobilidade','?'), iMobT=col('tipo mobilidade'), iComb=col('combustivel','valor'),
            iVT=col('transporte','?'),
            iL1=col('vt linha 1'), iL1v=col('vt l1','valor'), iL1g=col('vt l1','viagens'),
            iL2=col('vt linha 2'), iL2v=col('vt l2','valor'), iL2g=col('vt l2','viagens'),
            iL3=col('vt linha 3'), iL3v=col('vt l3','valor'), iL3g=col('vt l3','viagens'),
            iFCLT=col('folha clt'), iFMEI=col('folha mei'), iPrem=col('premio'), iFerEl=col('elegivel');

      // Sim/Não com valor padrão quando em branco
      const flag=(r,idx,def)=>{ if(idx<0) return def; const v=_normH(r[idx]); if(v==='') return def; if(v.startsWith('sim')||v==='s') return true; if(v.startsWith('nao')||v==='n') return false; return def; };
      const get=(r,idx)=>idx>=0?r[idx]:undefined;

      const FILTROS=['OK','DUP','MEI','SOC','TER','DIR','PART'];
      const chave=(mat,cpf)=>(String(mat||'').trim())+'|'+String(cpf||'').replace(/\D/g,'');
      const baseKeys=new Set(colaboradores.map(c=>chave(c.mat,c.cpf)));
      const baseMat=new Set(colaboradores.map(c=>String(c.mat||'').trim()).filter(Boolean));

      const novos=[], existentes=[], erros=[];
      const vistosNestaPlanilha=new Set();

      for(let i=hi+1;i<rows.length;i++){
        const r=rows[i]; if(!r) continue;
        const nome=String(get(r,iNome)||'').trim();
        const matRaw=String(get(r,iMat)||'').trim();
        // ignora linhas totalmente vazias
        if(!nome && !matRaw && !String(get(r,iCPF)||'').trim()) continue;
        if(!nome){ erros.push({linha:i+1, motivo:'Sem nome', mat:matRaw}); continue; }

        let filtro=String(get(r,iFiltro)||'').trim();
        filtro = filtro ? filtro.split(/[—\-]/)[0].trim().toUpperCase() : 'OK';
        if(!FILTROS.includes(filtro)) filtro='OK';

        const cpf=String(get(r,iCPF)||'').trim();
        let mat=matRaw;
        if(!mat && filtro==='PART') mat=cpf.replace(/\D/g,''); // PART usa CPF como matrícula
        if(!mat){ erros.push({linha:i+1, motivo:'Sem matrícula (obrigatória, exceto PART com CPF)', nome}); continue; }

        const k=chave(mat,cpf);
        if(baseKeys.has(k) || baseMat.has(mat)){ existentes.push({nome,mat}); continue; }
        if(vistosNestaPlanilha.has(mat)){ erros.push({linha:i+1, motivo:'Matrícula repetida na planilha', nome, mat}); continue; }
        vistosNestaPlanilha.add(mat);

        const eleg={
          vr:flag(r,iVR,false), cafe:flag(r,iCafe,false), cesta:flag(r,iCesta,true),
          mobilidade:flag(r,iMob,false), vt:flag(r,iVT,false),
          folhaCLT:flag(r,iFCLT,true), folhaMEI:flag(r,iFMEI,false),
          premio:flag(r,iPrem,true), ferias:flag(r,iFerEl,true),
        };
        if(eleg.vt) eleg.mobilidade=false; // exclusivos
        eleg.folha=eleg.folhaCLT||eleg.folhaMEI;

        const mobTxt=_normH(get(r,iMobT));
        const mobSel = mobTxt.includes('perto')?'perto':(mobTxt.includes('carro')?'carro_empresa':'combustivel');
        const mob = eleg.vt?'vt':(eleg.mobilidade?mobSel:'perto');

        const c={
          mat, nome:nome.toUpperCase(), cpf,
          admissao:_dataParaISO(get(r,iAdm)),
          cargo:String(get(r,iCargo)||'').trim().toUpperCase(),
          funcao:String(get(r,iFunc)||'').trim().toUpperCase(),
          depto:String(get(r,iDepto)||'').trim(),
          status:normalizarStatus(String(get(r,iStatus)||'Trabalhando').trim())||'Trabalhando',
          filtro, diasFixos:null,
          ferVenc:_resolveVencInput(String(get(r,iVenc)||''),''),
          ferMes:(()=>{ const m=String(get(r,iAgen)||'').trim(); return MESES_FER.includes(m)?m:''; })(),
          ferSaldo:null,
          mobilidade:mob, elegibilidade:eleg,
          vr:   eleg.vr?fnum(get(r,iVRv)):0,
          cafe: eleg.cafe?fnum(get(r,iCafev)):0,
          cesta:eleg.cesta?fnum(get(r,iCestav)):0,
          comb: (eleg.mobilidade&&mob==='combustivel')?fnum(get(r,iComb)):0,
        };
        // Linhas de VT (até 3 na planilha; 4ª fica zerada)
        const linhas=[[iL1,iL1v,iL1g],[iL2,iL2v,iL2g],[iL3,iL3v,iL3g]];
        for(let n=1;n<=4;n++){
          const src=linhas[n-1];
          const l=(eleg.vt&&src)?_vtDoTexto(get(r,src[0])):null;
          c['cod'+n]=l?l.cod:''; c['ben'+n]=l?l.nome:''; c['tp'+n]=l?l.tipo:'';
          c['vt'+n]=(eleg.vt&&src&&l)?fnum(get(r,src[1])):0;
          c['v'+n] =(eleg.vt&&src&&l)?fnum(get(r,src[2])):0;
        }
        novos.push(c);
      }

      novosPendentes=novos;
      renderNovosPreview(novos, existentes, erros);
    }catch(err){
      if(prev) prev.innerHTML='<div class="alert alert-error">Erro ao ler a planilha: '+err.message+'</div>';
    }
  };
  reader.readAsBinaryString(file);
}

function _resumoBen(c){
  const e=c.elegibilidade||{}; const t=[];
  if(e.vr) t.push('VR '+brl(c.vr)); if(e.cafe) t.push('Café '+brl(c.cafe));
  if(e.cesta) t.push('Cesta '+brl(c.cesta));
  if(e.mobilidade&&c.mobilidade==='combustivel') t.push('Comb '+brl(c.comb));
  else if(e.mobilidade) t.push(c.mobilidade==='perto'?'Mora perto':'Carro empresa');
  if(e.vt){ const nl=[1,2,3,4].filter(n=>c['cod'+n]).length; t.push('VT ('+nl+' linha'+(nl!==1?'s':'')+')'); }
  return t.join(' · ')||'—';
}

function renderNovosPreview(novos, existentes, erros){
  const prev=document.getElementById('import-preview'); if(!prev) return;
  let html='<div class="stat-row" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">'
    +'<div class="stat-card green"><div class="stat-val" style="color:var(--green)">'+novos.length+'</div><div class="stat-label">Novos (serão criados)</div></div>'
    +'<div class="stat-card"><div class="stat-val">'+existentes.length+'</div><div class="stat-label">Já existem (ignorados)</div></div>'
    +'<div class="stat-card red"><div class="stat-val" style="color:var(--red)">'+erros.length+'</div><div class="stat-label">Com erro (ignorados)</div></div>'
    +'</div>';

  if(novos.length){
    const lin=novos.slice(0,200).map(c=>'<tr>'
      +'<td style="font-weight:600">'+c.nome+'</td>'
      +'<td class="text-xs text-muted">'+c.mat+'</td>'
      +'<td class="text-xs">'+(c.funcao||'—')+'</td>'
      +'<td class="text-xs">'+(c.depto||'—')+'</td>'
      +'<td class="text-xs">'+(c.admissao||'—')+'</td>'
      +'<td class="text-xs">'+c.filtro+'</td>'
      +'<td class="text-xs">'+_resumoBen(c)+'</td>'
    +'</tr>').join('');
    html+='<div class="tbl-wrap" style="max-height:360px;overflow:auto;margin-bottom:12px"><table class="tbl">'
      +'<thead><tr><th>Nome</th><th>Matrícula</th><th>Função</th><th>Depto</th><th>Admissão</th><th>Tipo</th><th>Benefícios</th></tr></thead>'
      +'<tbody>'+lin+'</tbody></table></div>'
      +(novos.length>200?'<div class="text-xs text-muted" style="margin-bottom:8px">Mostrando 200 de '+novos.length+'. Todos serão importados.</div>':'');
  }

  if(existentes.length){
    html+='<details style="margin-bottom:10px"><summary style="cursor:pointer;font-weight:700;font-size:12px">Já existem na base ('+existentes.length+') — serão ignorados</summary>'
      +'<div class="text-xs text-muted" style="margin-top:6px">'+existentes.map(x=>x.nome+' ('+x.mat+')').join(' · ')+'</div></details>';
  }
  if(erros.length){
    html+='<details style="margin-bottom:10px" open><summary style="cursor:pointer;font-weight:700;font-size:12px;color:var(--red)">Linhas com erro ('+erros.length+')</summary>'
      +'<div class="text-xs" style="margin-top:6px">'+erros.map(x=>'Linha '+x.linha+': '+x.motivo+(x.nome?' — '+x.nome:'')+(x.mat?' ('+x.mat+')':'')).join('<br>')+'</div></details>';
  }

  html+='<div class="btn-row" style="margin-top:6px">'
    +'<button class="btn btn-primary" onclick="importarNovos()" '+(novos.length?'':'disabled')+'>Importar '+novos.length+' novo'+(novos.length!==1?'s':'')+'</button>'
    +'</div>';
  prev.innerHTML=html;
}

async function importarNovos(){
  if(!novosPendentes.length){ toast('Nenhum novo colaborador para importar.','warning'); return; }
  const prev=document.getElementById('import-preview');
  const lista=novosPendentes.slice();
  try{
    // Grava em lotes (limite de 500 por batch do Firestore)
    let ok=0;
    for(let i=0;i<lista.length;i+=400){
      const chunk=lista.slice(i,i+400);
      const b=window._writeBatch(window._db);
      chunk.forEach(c=>{
        c._id=c.mat;
        c.mobilidade=c.mobilidade||inferMob(c);
        b.set(window._doc('colaboradores',c._id),c);
      });
      await b.commit();
      chunk.forEach(c=>colaboradores.push(c));
      ok+=chunk.length;
    }
    novosPendentes=[];
    if(prev) prev.innerHTML='<div class="alert alert-success">✅ <strong>'+ok+'</strong> colaborador'+(ok!==1?'es':'')+' criado'+(ok!==1?'s':'')+'! Base atual: <strong>'+colaboradores.length+'</strong>.</div>';
    toast('✅ '+ok+' novos importados!','success');
    setSS('✅ '+colaboradores.length,'ok');
  }catch(e){
    if(prev) prev.innerHTML='<div class="alert alert-error">Erro ao gravar: '+e.message+'</div>';
    toast('Erro ao gravar: '+e.message,'error');
  }
}

// ════════════════════════════════════════════════════════════════
// BASE: DROPDOWN DE DEPARTAMENTO (autocomplete)
// ════════════════════════════════════════════════════════════════
function initDeptoAutocomplete(prefix){
  const input=document.getElementById(prefix+'-depto');
  if(!input) return;
  const deptos=getDeptoList();
  if(deptos.length===0) return;

  // Criar datalist
  let dl=document.getElementById('depto-datalist');
  if(!dl){
    dl=document.createElement('datalist');
    dl.id='depto-datalist';
    document.body.appendChild(dl);
  }
  dl.innerHTML=deptos.map(d=>'<option value="'+d+'">').join('');
  input.setAttribute('list','depto-datalist');
  input.setAttribute('autocomplete','off');
}

// ════════════════════════════════════════════════════════════════
// PREMIO ASSIDUIDADE
// ════════════════════════════════════════════════════════════════


function parseHora(val){
  if(!val) return 0;
  const s=String(val).trim();
  if(!s) return 0;
  // formato "1:23h" ou "1:23" ou numero
  const m=s.match(/(\d+):(\d+)/);
  if(m) return parseInt(m[1])*60+parseInt(m[2]);
  return parseFloat(s)||0;
}

function fmtMin(min){
  if(!min) return '-';
  const h=Math.floor(min/60), m=min%60;
  return h>0?h+'h'+String(m).padStart(2,'0')+'min':m+'min';
}

function renderPremioRows(dados){
  return dados.map((d,i)=>{
    const cor=d.status==='SIM'?'var(--green)':d.status==='NAO'?'var(--red)':'var(--yellow)';
    const badge=d.status==='SIM'?'badge-green':d.status==='NAO'?'badge-red':d.status==='ANALISAR'?'badge-yellow':'badge-gray';
    const label=d.status==='SIM'?'Sim':d.status==='NAO'?'Nao':d.status==='ANALISAR'?'Analisar':'N/A';
    return '<tr style="background:'+( i%2===0?'#F8F9FB':'')+'">'
      +'<td><code style="font-size:10px">'+d.mat+'</code></td>'
      +'<td style="font-size:12px;font-weight:500">'+d.nome+'</td>'
      +'<td style="font-size:10px">'+d.cpf+'</td>'
      +'<td style="font-size:11px">'+d.sit+'</td>'
      +'<td style="text-align:center;font-size:11px;color:'+(d.atraso>10?'var(--red)':d.atraso>0?'var(--yellow)':'var(--text3)')+'">'+fmtMin(d.atraso)+'</td>'
      +'<td style="text-align:center;font-size:11px;color:'+(d.saida>10?'var(--red)':d.saida>0?'var(--yellow)':'var(--text3)')+'">'+fmtMin(d.saida)+'</td>'
      +'<td style="text-align:center;font-size:11px;color:'+(d.atestado?'var(--red)':'var(--text3)')+'">'+fmtMin(d.atestado)+'</td>'
      +'<td style="text-align:center;font-size:11px;color:'+(d.aHoras?'var(--red)':'var(--text3)')+'">'+fmtMin(d.aHoras)+'</td>'
      +'<td style="text-align:center;font-size:11px;color:'+(d.aNoturno?'var(--red)':'var(--text3)')+'">'+fmtMin(d.aNoturno)+'</td>'
      +'<td style="text-align:center;font-size:11px;color:'+(d.faltas?'var(--red)':'var(--text3)')+'">'+fmtMin(d.faltas)+'</td>'
      +'<td style="text-align:center;font-size:11px;color:'+(d.abono?'var(--red)':'var(--text3)')+'">'+fmtMin(d.abono)+'</td>'
      +'<td style="text-align:center"><span class="badge '+badge+'">'+label+'</span></td>'
      +'<td style="font-size:11px;max-width:180px;overflow:hidden;text-overflow:ellipsis" title="'+d.motivo+'">'+d.motivo+'</td>'
      +'<td style="text-align:right;font-weight:600;color:var(--green);font-family:monospace">'+(d.status==='SIM'?brl(PREMIO_VAL):'-')+'</td>'
    +'</tr>';
  }).join('');
}

function fazerLogin(){
  const email=document.getElementById('login-email')?.value.trim()||'';
  const senha=document.getElementById('login-senha')?.value||'';
  const errEl=document.getElementById('login-error');
  if(errEl) errEl.style.display='none';
  if(!email||!senha){
    if(errEl){errEl.textContent='Preencha e-mail e senha.';errEl.style.display='block';}
    return;
  }
  window._signIn(email,senha).catch(e=>{
    const msgs={'auth/wrong-password':'Senha incorreta.','auth/user-not-found':'E-mail nao cadastrado.','auth/too-many-requests':'Muitas tentativas. Aguarde.'};
    if(errEl){errEl.textContent=msgs[e.code]||'E-mail ou senha incorretos.';errEl.style.display='block';}
  });
}

// Auto-atendimento: qualquer usuario pode pedir redefinicao de senha pelo
// e-mail cadastrado. Usa o recurso nativo do Firebase Auth (sem backend).
function esqueciSenha(){
  const email=document.getElementById('login-email')?.value.trim()||'';
  const errEl=document.getElementById('login-error');
  const infoEl=document.getElementById('login-info');
  if(errEl) errEl.style.display='none';
  if(infoEl) infoEl.style.display='none';
  if(!email){
    if(errEl){errEl.textContent='Digite seu e-mail no campo acima para redefinir a senha.';errEl.style.display='block';}
    return;
  }
  const okMsg=()=>{ if(infoEl){infoEl.textContent='Se o e-mail estiver cadastrado, enviamos um link para redefinir a senha. Confira a caixa de entrada (e o spam).';infoEl.style.display='block';} };
  window._resetSenha(email).then(okMsg).catch(e=>{
    // Nao revela se o e-mail existe (evita enumeracao de contas).
    if(e.code==='auth/user-not-found'){ okMsg(); return; }
    const msgs={'auth/invalid-email':'E-mail invalido.','auth/too-many-requests':'Muitas tentativas. Aguarde alguns minutos.'};
    if(errEl){errEl.textContent=msgs[e.code]||'Nao foi possivel enviar. Tente novamente.';errEl.style.display='block';}
  });
}

function fazerLogout(){
  window._signOut();
  document.getElementById('app-screen').style.display='none';
  document.getElementById('login-screen').style.display='flex';
}


function processarFolha(event){
  const file=event.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    const wb=XLSX.read(e.target.result,{type:'binary'});
    const data=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1});
    let hi=0;
    for(let i=0;i<Math.min(5,data.length);i++){
      if(data[i].some(v=>String(v||'').toLowerCase().includes('cadastro')||String(v||'').toLowerCase().includes('evento'))){hi=i;break;}
    }
    const hs=data[hi].map(h=>String(h||'').toLowerCase().trim());
    const iMat=hs.findIndex(h=>h.includes('cadastro')||h.includes('matr'));
    const iNome=hs.findIndex(h=>h.includes('nome'));
    const iEv=hs.findIndex(h=>h==='evento'||(h.includes('evento')&&!h.includes('desc')));
    const iValor=hs.findIndex(h=>h.includes('valor'));

    const porColab={};
    const eventosNaoMapeados=new Set();

    for(let i=hi+1;i<data.length;i++){
      const r=data[i]; if(!r||!r[iMat]) continue;
      const mat=String(r[iMat]||'').trim();
      const nome=String(r[iNome]||'').trim().toUpperCase();
      const ev=String(r[iEv]||'').trim();
      const val=fnum(r[iValor]);
      if(!porColab[mat]) porColab[mat]={mat,nome,eventos:{}};
      if(ev){
        porColab[mat].eventos[ev]=(porColab[mat].eventos[ev]||0)+val;
        if(!EVENTOS_FLAT[ev]&&!eventosCustom[ev]) eventosNaoMapeados.add(ev);
      }
    }

    // Enriquecer com dados da base
    const du=lanDU;
    Object.keys(porColab).forEach(mat=>{
      const c=colaboradores.find(x=>x.mat===mat);
      if(c){
        porColab[mat].depto=c.depto||''; porColab[mat].cargo=c.cargo||'';
        porColab[mat].cpf=c.cpf||''; porColab[mat].filtro=c.filtro||'OK';
        porColab[mat].equipe=c.depto||'';
        const dr=getLanDR(mat,du);
        const ben=calcBen(c,dr,getLanDU(mat,du));
        porColab[mat].ben=ben;
      }
    });

    folhaData=Object.values(porColab);

    folhaCompetencia=getFolhaComp();
    const prev=document.getElementById('folha-import-preview');
    if(prev){
      let html='<div class="alert alert-success">Folha '+folhaCompetencia+' importada: <strong>'+folhaData.length+' colaboradores</strong>. ';
      if(eventosNaoMapeados.size>0){
        html+='<strong>'+eventosNaoMapeados.size+' evento(s) nao mapeado(s).</strong>';
      }
      html+='</div>';
      html+='<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">';
      html+='<button class="btn btn-primary btn-sm" onclick="showPage(\'folha-view\')">Ver Folha</button>';
      html+='<button class="btn btn-warning btn-sm" onclick="document.getElementById(\'folha-file\').click()">Reimportar (sobrepor)</button>';
      html+='<button class="btn btn-danger btn-sm" onclick="deletarFolhaCompetencia()">Deletar competencia</button>';
      html+='</div>';
      if(eventosNaoMapeados.size>0){
        html+='<div class="card" style="margin-top:12px"><div class="card-title" style="color:var(--red)">Eventos nao mapeados — clique para classificar</div>';
        eventosNaoMapeados.forEach(ev=>{
          html+='<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">'
            +'<code style="min-width:60px">'+ev+'</code>'
            +'<select id="ev-tab-'+ev+'" style="padding:5px;border:1px solid var(--border);border-radius:4px;font-size:12px">'
            +'<option value="">-- Aba --</option>'
            +'<option value="proventos">Proventos</option>'
            +'<option value="encargos">Encargos</option>'
            +'<option value="adiantamento">Adiantamento</option>'
            +'<option value="descontos">Descontos</option>'
            +'</select>'
            +'<select id="ev-grupo-'+ev+'" style="padding:5px;border:1px solid var(--border);border-radius:4px;font-size:12px">'
            +'<option value="">-- Grupo --</option>'
            +'</select>'
            +'<input type="text" id="ev-nome-'+ev+'" placeholder="Nome do evento" style="flex:1;padding:5px;border:1px solid var(--border);border-radius:4px;font-size:12px">'
            +'<button class="btn btn-primary btn-xs" onclick="mapearEvento(\''+ev+'\')">Salvar</button>'
            +'</div>';
          // Popular grupos ao mudar aba
          html+='<script>document.getElementById("ev-tab-'+ev+'").addEventListener("change",function(){popularGrupos("'+ev+'",this.value)});<\/script>';
        });
        html+='</div>';
        // Card para adicionar evento manual
        html+='<div class="card" style="margin-top:12px"><div class="card-title">Adicionar evento manualmente</div>';
        html+='<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">';
        html+='<div class="fg"><label>Codigo</label><input type="text" id="novo-ev-cod" placeholder="ex: 999" style="width:90px;padding:6px 8px;border:1.5px solid var(--border);border-radius:4px;font-size:13px"></div>';
        html+='<div class="fg"><label>Nome</label><input type="text" id="novo-ev-nome" placeholder="ex: Bonus" style="min-width:180px;padding:6px 8px;border:1.5px solid var(--border);border-radius:4px;font-size:13px"></div>';
        html+='<div class="fg"><label>Aba</label><select id="novo-ev-tab" onchange="popularGrupos(\'novo-ev\',this.value)" style="padding:6px 8px;border:1.5px solid var(--border);border-radius:4px;font-size:13px">';
        html+='<option value="">-- Aba --</option><option value="proventos">Proventos</option><option value="encargos">Encargos</option><option value="adiantamento">Adiantamento</option><option value="descontos">Descontos</option></select></div>';
        html+='<div class="fg"><label>Grupo</label><select id="novo-ev-grupo" style="padding:6px 8px;border:1.5px solid var(--border);border-radius:4px;font-size:13px"><option value="">-- Grupo --</option></select></div>';
        html+='<button class="btn btn-primary btn-sm" onclick="adicionarEventoManual()">Adicionar</button>';
        html+='</div></div>';
      }
      prev.innerHTML=html;
    }
    toast('Folha processada: '+folhaData.length+' colaboradores','success');
    event.target.value='';
  };
  reader.readAsBinaryString(file);
}

function popularGrupos(ev, tab){
  // Suporta 'novo-ev' como prefix especial
  const selId=ev==='novo-ev'?'novo-ev-grupo':'ev-grupo-'+ev;
  const sel=document.getElementById(selId); if(!sel) return;
  const grupos=tab&&EVENTOS_FOLHA[tab]?Object.keys(EVENTOS_FOLHA[tab]):[];
  sel.innerHTML='<option value="">-- Grupo --</option>'+grupos.map(g=>'<option value="'+g+'">'+g+'</option>').join('');
}

function mapearEvento(ev){
  const tab=document.getElementById('ev-tab-'+ev)?.value;
  const grupo=document.getElementById('ev-grupo-'+ev)?.value;
  const nome=document.getElementById('ev-nome-'+ev)?.value.trim();
  if(!tab||!grupo||!nome){toast('Preencha todos os campos','error');return;}
  if(!EVENTOS_FOLHA[tab]) EVENTOS_FOLHA[tab]={};
  if(!EVENTOS_FOLHA[tab][grupo]) EVENTOS_FOLHA[tab][grupo]={};
  EVENTOS_FOLHA[tab][grupo][ev]=nome;
  EVENTOS_FLAT[ev]=nome;
  eventosCustom[ev]={aba:tab,grupo,nome};
  // Remover da lista de nao mapeados
  const row=document.getElementById('ev-row-'+ev);
  if(row) row.style.background='#F0FDF4';
  toast('Evento '+ev+' salvo em '+tab+' > '+grupo,'success');
}

function adicionarEventoManual(){
  const tab=document.getElementById('novo-ev-tab')?.value;
  const grupo=document.getElementById('novo-ev-grupo')?.value;
  const cod=document.getElementById('novo-ev-cod')?.value.trim();
  const nome=document.getElementById('novo-ev-nome')?.value.trim();
  if(!tab||!grupo||!cod||!nome){toast('Preencha todos os campos','error');return;}
  if(!EVENTOS_FOLHA[tab]) EVENTOS_FOLHA[tab]={};
  if(!EVENTOS_FOLHA[tab][grupo]) EVENTOS_FOLHA[tab][grupo]={};
  EVENTOS_FOLHA[tab][grupo][cod]=nome;
  EVENTOS_FLAT[cod]=nome;
  eventosCustom[cod]={aba:tab,grupo,nome};
  toast('Evento '+cod+' ('+nome+') adicionado!','success');
  document.getElementById('novo-ev-cod').value='';
  document.getElementById('novo-ev-nome').value='';
}

function renderFolhaView(){
  if(!folhaData||folhaData.length===0) return;
  // Atualizar subtitle
  const sub=document.getElementById('folha-sub');
  if(sub) sub.textContent=folhaData.length+' colaboradores | '+folhaCompetencia;
  // Renderizar a tabela diretamente no folha-tabela
  renderTabelaFolha();
}

function filtrarFolha(){
  renderTabelaFolha();
}

function getFolhaFiltrada(){
  if(!folhaData) return [];
  const q=(document.getElementById('folha-q')?.value||'').toLowerCase();
  const empF=document.getElementById('folha-emp')?.value||'';
  let f=folhaData;
  if(q) f=f.filter(d=>d.nome.toLowerCase().includes(q)||d.mat.includes(q));
  if(empF) f=f.filter(d=>_empresaMatch(d,[empF]));
  return f;
}

function renderTabelaFolha(){
  const dados=getFolhaFiltrada();
  const aba=document.getElementById('folha-aba')?.value||'proventos';
  const grupos=EVENTOS_FOLHA[aba]||{};
  const tbl=document.getElementById('folha-tabela'); if(!tbl) return;

  const coresGrupo={
    "REMUNERACAO FIXA":{bg:"#DBEAFE",text:"#1E3A8A"},
    "JORNADAS / HORAS ADICIONAIS":{bg:"#EDE9FE",text:"#4C1D95"},
    "AFASTAMENTOS":{bg:"#FCE7F3",text:"#831843"},
    "FERIAS":{bg:"#D1FAE5",text:"#064E3B"},
    "13o SALARIO":{bg:"#FEF3C7",text:"#78350F"},
    "REEMBOLSOS / AJUSTES":{bg:"#CFFAFE",text:"#164E63"},
    "RESCISORIOS":{bg:"#FEE2E2",text:"#7F1D1D"},
    "ENCARGOS EMPRESA":{bg:"#F3E8FF",text:"#4A044E"},
    "ADIANTAMENTO SALARIAL":{bg:"#FFEDD5",text:"#7C2D12"},
    "ENCARGOS OBRIGATORIOS":{bg:"#FEE2E2",text:"#7F1D1D"},
    "DESCONTOS JORNADA":{bg:"#FEF9C3",text:"#713F12"},
    "DESCONTOS BENEFICIOS":{bg:"#DBEAFE",text:"#1E3A8A"},
    "DESCONTOS EMPRESTIMOS":{bg:"#EDE9FE",text:"#4C1D95"},
    "DESCONTOS FERIAS":{bg:"#D1FAE5",text:"#064E3B"},
    "SINDICAIS / ASSISTENCIAIS":{bg:"#F3F4F6",text:"#374151"},
    "PENSAO":{bg:"#FEE2E2",text:"#7F1D1D"},
    "OUTROS":{bg:"#F9FAFB",text:"#374151"}
  };
  const getCor=(g)=>coresGrupo[g]||{bg:"#F3F4F6",text:"#374151"};

  // Montar colunas agrupadas
  const colsPorGrupo={};
  Object.entries(grupos).forEach(([grupo,evs])=>{
    Object.keys(evs).forEach(ev=>{
      if(dados.some(d=>d.eventos&&d.eventos[ev])){
        if(!colsPorGrupo[grupo]) colsPorGrupo[grupo]=[];
        colsPorGrupo[grupo].push({ev,nome:evs[ev]});
      }
    });
  });
  // Eventos customizados desta aba
  Object.entries(eventosCustom).forEach(([ev,info])=>{
    if(info.aba===aba&&dados.some(d=>d.eventos&&d.eventos[ev])){
      const g=info.grupo||'OUTROS';
      if(!colsPorGrupo[g]) colsPorGrupo[g]=[];
      if(!colsPorGrupo[g].find(c=>c.ev===ev)) colsPorGrupo[g].push({ev,nome:info.nome});
    }
  });

  const todasCols=Object.values(colsPorGrupo).flat();
  if(todasCols.length===0){
    tbl.innerHTML='<div class="alert alert-info">Nenhum evento desta aba nos dados importados.</div>';
    return;
  }

  // Totais por coluna
  const totCols={};
  todasCols.forEach(c=>{ totCols[c.ev]=dados.reduce((s,d)=>s+fnum(d.eventos?.[c.ev]),0); });

  // Totais por grupo
  const totGrupos={};
  Object.entries(colsPorGrupo).forEach(([g,cols])=>{
    totGrupos[g]=cols.reduce((s,c)=>s+totCols[c.ev],0);
  });
  const totalGeral=todasCols.reduce((s,c)=>s+totCols[c.ev],0);

  // ── Totalizadores no topo ──
  const totalCards=Object.entries(colsPorGrupo).map(([g,cols])=>{
    const cor=coresGrupo[g]||'#374151';
    const tot=totGrupos[g];
    const cg=getCor(g);
    return '<div style="border-left:4px solid '+cg.text+';background:'+cg.bg+';border-radius:var(--radius-sm);'+
      'padding:10px 14px;min-width:160px">'+
      '<div style="font-size:10px;font-weight:700;color:'+cg.text+';text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">'+g+'</div>'+
      '<div style="font-size:15px;font-weight:700;color:'+cg.text+';font-family:monospace">'+brl(tot)+'</div>'+
      '<div style="font-size:10px;color:'+cg.text+';opacity:.7">'+cols.length+' evento(s)</div></div>';
  }).join('');

  // ── Tabela com sticky header ──
  let thead='<thead>';
  // Linha 1: grupos (cor)
  // Linha 1: grupos — sticky no topo (top:0)
  thead+='<tr>';
  thead+='<th colspan="4" style="background:#1E3A8A;color:#fff;position:sticky;top:0;left:0;z-index:6;padding:8px 10px;font-size:11px">Colaborador</th>';
  Object.entries(colsPorGrupo).forEach(([g,cols])=>{
    const c2=getCor(g);
    thead+='<th colspan="'+cols.length+'" style="background:'+c2.bg+';color:'+c2.text+';text-align:center;'
      +'position:sticky;top:0;z-index:2;'
      +'border-left:2px solid rgba(0,0,0,.08);font-size:10px;font-weight:700;letter-spacing:.4px;'
      +'white-space:nowrap;padding:8px 6px">'+g+'</th>';
  });
  thead+='<th style="background:#1B5E20;color:#fff;position:sticky;top:0;right:0;z-index:3;padding:8px 10px">TOTAL</th></tr>';
  // Linha 2: eventos — sticky no topo (top:37px = altura da linha 1)
  thead+='<tr>';
  thead+='<th style="background:#1E3A8A;color:#fff;padding:8px 10px;font-size:11px;font-weight:600;position:sticky;top:37px;left:0;z-index:5;min-width:70px">Mat.</th>';
  thead+='<th style="background:#1E3A8A;color:#fff;padding:8px 10px;font-size:11px;font-weight:600;position:sticky;top:37px;left:70px;z-index:5;min-width:160px">Nome</th>';
  thead+='<th style="background:#1E3A8A;color:#fff;padding:8px 10px;font-size:11px;font-weight:600;position:sticky;top:37px;z-index:2;min-width:100px">CPF</th>';
  thead+='<th style="background:#1E3A8A;color:#fff;padding:8px 10px;font-size:11px;font-weight:600;position:sticky;top:37px;z-index:2;min-width:120px">Departamento</th>';
  todasCols.forEach(c=>{
    const grupoEntry=Object.entries(colsPorGrupo).find(([g,cols])=>cols.find(x=>x.ev===c.ev));
    const c3=grupoEntry?getCor(grupoEntry[0]):{bg:"#F3F4F6",text:"#374151"};
    thead+='<th style="background:'+c3.bg+';color:'+c3.text+';font-size:9px;white-space:nowrap;'+
      'max-width:90px;overflow:hidden;text-overflow:ellipsis;padding:6px 5px;'+
      'border-left:1px solid rgba(0,0,0,.06);font-weight:600" title="'+c.nome+'">'+c.nome+'</th>';
  });
  thead+='<th style="background:#1B5E20;position:sticky;right:0;min-width:90px">Total</th></tr>';
  thead+='</thead>';

  // Linhas de dados
  let tbody='<tbody>';
  dados.forEach((d,i)=>{
    const rowTot=todasCols.reduce((s,c)=>s+fnum(d.eventos?.[c.ev]),0);
    tbody+='<tr style="border-bottom:1px solid var(--border);background:'+(i%2===0?'#F8F9FB':'')+'">';
    tbody+='<td style="padding:7px 10px;position:sticky;left:0;background:'+(i%2===0?'#F8F9FB':'#fff')+'"><code style="font-size:10px">'+(d.mat||'—')+'</code></td>';
    tbody+='<td style="padding:7px 10px;position:sticky;left:70px;background:'+(i%2===0?'#F8F9FB':'#fff')+';font-weight:500;min-width:160px;max-width:180px;overflow:hidden;text-overflow:ellipsis" title="'+d.nome+'">'+d.nome+'</td>';
    tbody+='<td style="padding:7px 10px;font-size:10px">'+(d.cpf||'—')+'</td>';
    tbody+='<td style="padding:7px 10px;font-size:10px;max-width:100px;overflow:hidden;text-overflow:ellipsis">'+(d.depto||'—')+'</td>';
    todasCols.forEach(c=>{
      const v=fnum(d.eventos?.[c.ev]);
      tbody+='<td style="padding:7px 8px;text-align:right;font-family:monospace;font-size:11px;color:'+(v<0?'var(--red)':v===0?'#ccc':'inherit')+'">'+( v!==0?brl(v):'—')+'</td>';
    });
    tbody+='<td style="padding:7px 10px;text-align:right;font-weight:700;font-family:monospace;color:var(--blue);position:sticky;right:0;background:'+(i%2===0?'#F0F4FF':'#E8EEFF')+'">'+brl(rowTot)+'</td>';
    tbody+='</tr>';
  });

  // Linha de totais
  tbody+='<tr style="background:#1D4ED8;color:#fff;font-weight:700;font-family:monospace">';
  tbody+='<td colspan="4" style="padding:8px 10px;font-family:sans-serif;font-size:11px;color:rgba(255,255,255,.7)">'+dados.length+' colaboradores</td>';
  todasCols.forEach(c=>{
    tbody+='<td style="padding:8px;text-align:right;font-size:10px">'+(totCols[c.ev]?brl(totCols[c.ev]):'—')+'</td>';
  });
  tbody+='<td style="padding:8px 10px;text-align:right;background:#1B5E20;color:#86EFAC;font-size:13px;position:sticky;right:0">'+brl(totalGeral)+'</td>';
  tbody+='</tr></tbody>';

  tbl.innerHTML=
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;padding:12px;background:var(--surface);border-radius:var(--radius);border:1px solid var(--border)">'+
    totalCards+
    '<div style="border-left:4px solid var(--green);background:var(--surface);border-radius:var(--radius-sm);padding:10px 14px;min-width:160px">'+
    '<div style="font-size:10px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">TOTAL GERAL</div>'+
    '<div style="font-size:18px;font-weight:700;color:var(--green);font-family:monospace">'+brl(totalGeral)+'</div></div></div>'+
    '<div style="overflow:auto;border-radius:var(--radius);border:1px solid var(--border);max-height:520px">'+
    '<table style="border-collapse:collapse;font-size:11px;width:100%">'+thead+tbody+'</table></div>';
}

function exportarFolhaExcel(){
  if(!folhaData||folhaData.length===0){toast('Nenhuma folha','error');return;}
  const wb=XLSX.utils.book_new();

  // Gerar uma aba por seção
  ['proventos','encargos','adiantamento','descontos'].forEach(aba=>{
    const grupos=EVENTOS_FOLHA[aba]||{};
    const todasCols=[];
    Object.entries(grupos).forEach(([grupo,evs])=>{
      Object.keys(evs).forEach(ev=>{
        if(folhaData.some(d=>d.eventos&&d.eventos[ev])){
          todasCols.push({grupo,ev,nome:evs[ev]});
        }
      });
    });
    if(todasCols.length===0) return;

    const header=['Filtro','Equipe','Matricula','Nome','CPF','Cargo',...todasCols.map(c=>c.nome),'TOTAL'];
    const rows=[header];
    folhaData.forEach(d=>{
      const row=[d.filtro||'OK',d.equipe||'',d.mat,d.nome,d.cpf||'',d.cargo||''];
      let tot=0;
      todasCols.forEach(c=>{const v=fnum(d.eventos?.[c.ev]);row.push(v||'');tot+=v;});
      row.push(tot||'');
      rows.push(row);
    });
    // Total row
    const totRow=['','','','','',''];
    todasCols.forEach(c=>totRow.push(folhaData.reduce((s,d)=>s+fnum(d.eventos?.[c.ev]),0)||''));
    totRow.push(folhaData.reduce((s,d)=>s+todasCols.reduce((s2,c)=>s2+fnum(d.eventos?.[c.ev]),0),0)||'');
    rows.push(totRow);

    const ws=XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb,ws,aba.charAt(0).toUpperCase()+aba.slice(1));
  });

  XLSX.writeFile(wb,'Folha_'+new Date().toLocaleDateString('pt-BR').replace(/\//g,'_')+'.xlsx');
  toast('Folha exportada em 4 abas!','success');
}

// ════════════════════════════════════════════════════════════════
// CONTROLE DE FERIAS — FAROL POR ADMISSAO
// ════════════════════════════════════════════════════════════════
function pgFerRadar(){
  return `
    <div class="page-header"><h2 class="page-title">Radar de Férias</h2><p class="page-subtitle">Vencimento e agendamento de férias por colaborador. Cada coluna é um estágio de vencimento; o número no topo é o total.</p></div>
    <div class="filter-bar" style="align-items:flex-end;margin-bottom:16px">
      <div class="filter-group" style="flex:1"><label>Buscar</label>
        <input type="text" id="rq" placeholder="Nome, matrícula, depto ou função..." oninput="renderFerRadar()"></div>
      <div class="filter-group"><label>Empresa</label>${msDropdown('remp','Empresa',getEmpresaList().map(e=>({value:e.cod,label:_empresaLabel(e.cod)})),'renderFerRadar')}</div>
      <div class="filter-group"><label>Departamento</label>${msDropdown('rdep','Departamento',getDeptoList().map(d=>({value:d,label:d})),'renderFerRadar')}</div>
      <div class="filter-group"><label>Função</label>${msDropdown('rfunc','Função',getFuncaoList().map(f=>({value:f,label:f})),'renderFerRadar')}</div>
      <div class="filter-group"><label>Status</label>${msDropdown('rstatus','Status',[{value:'trabalhando',label:'Trabalhando'},{value:'ferias',label:'Férias'},{value:'so_cesta',label:'Afastado'}],'renderFerRadar')}</div>
      <div class="filter-group"><label>Situação</label>${msDropdown('rcor','Situação',[{value:'vermelho',label:'Vencido'},{value:'laranja',label:'Vence ≤3m'},{value:'amarelo',label:'Vence 4-6m'},{value:'verde',label:'Vence +6m'},{value:'sem',label:'Sem dados'},{value:'na',label:'N/A'}],'renderFerRadar')}</div>
      <div class="filter-group"><label>Agendamento</label>${msDropdown('ragend','Agendamento',[{value:'ok',label:'No prazo'},{value:'bad',label:'Fora do prazo'},{value:'none',label:'Sem agendamento'}],'renderFerRadar')}</div>
      <div class="filter-group"><label>Mês agendado</label>${msDropdown('rmes','Mês agendado',MESES_FER.map(m=>({value:m,label:m})),'renderFerRadar')}</div>
      <button class="btn btn-ghost btn-sm" onclick="exportarFeriasExcel()"><i class="ti ti-file-spreadsheet"></i> Excel</button>
    </div>
    <div id="fer-radar-grid"></div>
    <div id="fer-tabela" style="margin-top:20px"></div>`;
}

// ── Férias: meses, ano calculado e função ────────────────────────
const MESES_FER=['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// Funcao que controla as ferias (cai para o cargo quando ainda nao preenchida).
function funcaoColab(c){
  return ((c&&(c.funcao||c.cargo))||'').trim().toUpperCase();
}

// Ano de agendamento CALCULADO: proxima ocorrencia do mes a partir de uma
// data de referencia (hoje, por padrao). Se o mes ja passou neste ano, vai
// para o ano seguinte — assim o ano "se atualiza" conforme o tempo passa.
function anoAgendado(ferMesNome, ref){
  if(!ferMesNome) return '—';
  const idx=MESES_FER.indexOf(ferMesNome);
  if(idx<0) return '—';
  const base=ref||new Date();
  const ano=base.getFullYear();
  return idx>=base.getMonth() ? ano : ano+1;
}

// Referência do agendamento: o mês agendado cai a partir de quando o
// colaborador PODE tirar férias = max(hoje, admissão + 1 ano). Assim um
// recém-admitido (ex.: admissão 06/2026) agenda para o ano correto (2027).
function _refAgenda(c){
  const hoje=new Date(); hoje.setHours(0,0,0,0);
  let ref=hoje;
  const adm=_dataLocal(c&&c.admissao);
  if(adm){ const ent=new Date(adm); ent.setFullYear(ent.getFullYear()+1); if(ent>ref) ref=ent; }
  return ref;
}
function anoAgendadoColab(c){
  const cy=new Date().getFullYear();
  if(c && c.ferAno && +c.ferAno>=cy) return +c.ferAno;   // ano informado explicitamente
  return (c&&c.ferMes) ? anoAgendado(c.ferMes, _refAgenda(c)) : '—';
}

// Rotulo "Mes/Ano" para exibicao do agendamento
function agendamentoLabel(c){
  if(!c||!c.ferMes) return '—';
  return c.ferMes+'/'+anoAgendadoColab(c);
}

// Parser local de datas ISO (YYYY-MM-DD) em horario local, evitando o
// deslocamento de fuso do new Date('YYYY-MM-DD') (que assume UTC).
function _dataLocal(s){
  if(!s) return null;
  const m=String(s).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m) return new Date(+m[1],+m[2]-1,+m[3]);
  const d=new Date(s);
  return isNaN(d.getTime())?null:d;
}
// Diferenca em meses (assinada) entre duas datas: de -> ate.
function _mesesEntre(de, ate){
  let m=(ate.getFullYear()-de.getFullYear())*12 + (ate.getMonth()-de.getMonth());
  if(ate.getDate() < de.getDate()) m-=1;
  return m;
}
// Dias CORRIDOS (calendario) entre inicio e fim (ISO), inclusive.
function _diasCorridos(iniIso, fimIso){
  const a=_dataLocal(iniIso), b=_dataLocal(fimIso);
  if(!a||!b) return 0;
  return Math.max(0, Math.round((b-a)/86400000)+1);
}
// Dias UTEIS (seg-sex) do periodo de ferias [ferInicio,ferFim] que caem no mes
// da competencia comp (MM/AAAA). Nao considera feriados (nao ha calendario).
function feriasDiasUteisNaComp(c, comp){
  const m=String(comp||'').match(/^(\d{2})\/(\d{4})$/); if(!m) return 0;
  const ini=_dataLocal(c.ferInicio), fim=_dataLocal(c.ferFim); if(!ini||!fim) return 0;
  const mes=+m[1]-1, ano=+m[2];
  const mIni=new Date(ano,mes,1), mFim=new Date(ano,mes+1,0);
  const a=ini>mIni?ini:mIni, b=fim<mFim?fim:mFim;
  if(a>b) return 0;
  let dias=0; const d=new Date(a);
  while(d<=b){ const wd=d.getDay(); if(wd!==0&&wd!==6) dias++; d.setDate(d.getDate()+1); }
  return dias;
}
// Situacao das ferias em relacao a hoje: 'em_ferias' | 'retorno_pendente' | null.
function feriasSituacao(c, hoje){
  const ref=hoje||new Date(); const h=new Date(ref.getFullYear(),ref.getMonth(),ref.getDate());
  const emFerias=c.status==='Ferias'||c.status==='Férias';
  const ini=_dataLocal(c.ferInicio), fim=_dataLocal(c.ferFim);
  if(ini&&fim){
    if(h>=ini && h<=fim) return 'em_ferias';
    if(emFerias && h>fim) return 'retorno_pendente';
  }
  if(emFerias && (!ini||!fim)) return 'em_ferias';
  return null;
}
// Data do agendamento de ferias: 1o dia do mes agendado, no ano calculado.
function agendamentoDate(c){
  if(!c||!c.ferMes) return null;
  const idx=MESES_FER.indexOf(c.ferMes);
  if(idx<0) return null;
  const ano=anoAgendadoColab(c);
  if(typeof ano!=='number') return null;
  return new Date(ano, idx, 1);
}
// Bolinha do card: a referencia e o LIMITE de uso = vencimento + 12 meses
// (data em que as ferias dobrariam). Verde = agendado ate esse limite (no
// prazo); vermelha = agendado apos o limite (dobra); preta = sem agendamento;
// cinza = sem vencimento p/ comparar.
// Chave do status de agendamento p/ filtro: none (sem), bad (fora do prazo), ok (no prazo).
function _agKey(c, vencDate){
  if(!c||!c.ferMes) return 'none';
  return agendamentoStatus(c, vencDate).cor==='vermelha' ? 'bad' : 'ok';
}
function agendamentoStatus(c, vencDate){
  if(!c||!c.ferMes) return {cor:'preta', tip:'Sem agendamento'};
  const ag=agendamentoDate(c);
  if(!ag||!vencDate) return {cor:'cinza', tip:'Agendado '+c.ferMes+' (sem vencimento p/ comparar)'};
  const limite=new Date(vencDate); limite.setFullYear(limite.getFullYear()+1);
  return ag<=limite
    ? {cor:'verde', tip:'Agendado no prazo, antes da dobra ('+agendamentoLabel(c)+')'}
    : {cor:'vermelha', tip:'Agendado APOS o limite (dobra) ('+agendamentoLabel(c)+')'};
}

// \u2500\u2500 Helpers de vencimento por ciclo (dia/mes) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function _ddmm(d){ return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0'); }
function _isoLocal(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
// Proxima ocorrencia de dia/mes >= ref (hoje).
function _proxVenc(dia,mes,ref){ let d=new Date(ref.getFullYear(),mes-1,dia); if(d<ref) d=new Date(ref.getFullYear()+1,mes-1,dia); return d; }
// Resolve o que gravar em ferVenc a partir do input dd/mm. Se o dd/mm nao mudou
// em relacao ao atual, mantem a data atual (preserva ano e estado "vencido");
// se mudou, projeta para a proxima ocorrencia >= hoje.
function _resolveVencInput(novoStr, atualIso){
  const m=String(novoStr||'').trim().match(/^(\d{1,2})\/(\d{1,2})$/);
  if(!m) return '';
  const atual=_dataLocal(atualIso);
  if(atual && atual.getDate()===+m[1] && (atual.getMonth()+1)===+m[2]) return atualIso;
  const hoje=new Date(); hoje.setHours(0,0,0,0);
  return _isoLocal(_proxVenc(+m[1],+m[2],hoje));
}
function _vencCampoDDMM(c){ const d=c&&c.ferVenc?_dataLocal(c.ferVenc):null; return d?_ddmm(d):''; }

function getFarol(c){
  // Nao se aplica - socios/consultores
  if(c.elegibilidade?.ferias===false){
    return {cor:'na',meses:0,label:'N/A',vencStr:'\u2014',vencDate:null,dias:0};
  }
  const hoje=new Date(); hoje.setHours(0,0,0,0);

  // Proximo vencimento (data completa). ferVenc (dd/mm -> data) tem prioridade;
  // em branco, deriva da admissao: vencimento = vespera do aniversario
  // (admissao - 1 dia), projetado para a proxima ocorrencia.
  let vencDate=null;
  if(c.ferVenc){
    vencDate=_dataLocal(c.ferVenc);
  } else if(c.admissao){
    const adm=_dataLocal(c.admissao);
    if(adm){ const v=new Date(adm); v.setDate(v.getDate()-1); vencDate=_proxVenc(v.getDate(),v.getMonth()+1,hoje); }
  }

  if(!vencDate) return {cor:'sem',meses:0,label:'Sem dados',vencStr:'—',vencDate:null,dias:0};

  // meses ate o vencimento: positivo = falta esse tanto; negativo = ja venceu.
  const meses=_mesesEntre(hoje,vencDate);
  const vencStr=_ddmm(vencDate);
  const saldo=(c.ferSaldo!=null?c.ferSaldo:30);

  // Coluna/cor por PROXIMIDADE do proximo vencimento.
  if(meses<0)  return {cor:'vermelho',meses,label:'Vencido',vencStr,vencDate,dias:saldo};
  if(meses<=3) return {cor:'laranja', meses,label:meses<=0?'Vence este mês':'Vence em '+meses+'m',vencStr,vencDate,dias:saldo};
  if(meses<=6) return {cor:'amarelo', meses,label:'Vence em '+meses+'m',vencStr,vencDate,dias:saldo};
  return {cor:'verde',meses,label:'Vence em '+meses+'m',vencStr,vencDate,dias:saldo};
}

// Fecha um ciclo: +30 dias ao saldo (uma vez), pergunta faltas a descontar, e
// joga o proximo vencimento para a PROXIMA ocorrencia futura do dia/mes — assim
// um clique tira o colaborador de "vencido" mesmo se estava atrasado +1 ano.
// Saldo pode ficar negativo (antecipacao).
async function fecharCicloFerias(id){
  const c=colaboradores.find(x=>x._id===id); if(!c) return;
  const f=getFarol(c);
  if(!f.vencDate){ toast('Sem data de vencimento para fechar ciclo.','error'); return; }
  const r=prompt('Fechar ciclo de '+c.nome+' (venceu em '+f.vencStr+').\n\n+30 dias serão somados ao saldo.\nQuantos dias de FALTA descontar neste ciclo? (0 se nenhuma)','0');
  if(r===null) return;
  const faltas=Math.max(0,fnum(r));
  const novoSaldo=(c.ferSaldo!=null?c.ferSaldo:0)+30-faltas;
  const hoje=new Date(); hoje.setHours(0,0,0,0);
  const nv=_proxVenc(f.vencDate.getDate(), f.vencDate.getMonth()+1, hoje);
  c.ferSaldo=novoSaldo; c.ferVenc=_isoLocal(nv);
  try{
    await fsSet('colaboradores',id,c);
    toast('Ciclo fechado: +30'+(faltas?(' −'+faltas+' falta(s)'):'')+'. Saldo: '+novoSaldo+' dias. Próx. venc.: '+_ddmm(nv),'success');
    if(currentPage==='fer-radar') renderFerRadar();
    if(currentPage==='fer-agendadas') renderFeriasAgendadas();
    if(currentPage==='ben-lancamento') showPage('ben-lancamento');
  }catch(e){ toast('Erro: '+e.message,'error'); }
}

function renderFerRadar(){
  bindMsOutside();
  updateMsCounts();
  const empF=getMs('remp');   // empresa (prefixo da matricula)
  const depF=getMs('rdep');   // departamento
  const funcF=getMs('rfunc'); // funcao
  const corF=getMs('rcor');   // situacao do farol (cor)
  const agF=getMs('ragend');  // status do agendamento (ok/bad/none)
  const mesF=getMs('rmes');   // mes de agendamento
  const statusF=getMs('rstatus'); // status do colaborador (trabalhando/ferias/so_cesta)
  const q=(document.getElementById('rq')?.value||'').toLowerCase().trim();

  // Pessoa única (dedup por CPF; mantém o cadastro principal) — evita
  // duplicidade CLT + MEI/Sócio no radar. Férias são controladas por 1 cadastro.
  let f=colaboradoresUnicos().filter(c=>!STATUS_NAO_RECEBE.includes(c.status) && c.status!=='Inativo');
  if(empF.length) f=f.filter(c=>_empresaMatch(c,empF));
  if(depF.length) f=f.filter(c=>depF.includes(c.depto||''));
  if(funcF.length) f=f.filter(c=>funcF.includes(funcaoColab(c)));
  if(statusF.length) f=f.filter(c=>statusF.includes(statusGrupo(c.status)));
  if(q) f=f.filter(c=>(c.nome||'').toLowerCase().includes(q)||(c.mat||'').toLowerCase().includes(q)||(c.depto||'').toLowerCase().includes(q)||funcaoColab(c).toLowerCase().includes(q));

  let comFarol=f.map(c=>({...c,farol:getFarol(c)}));
  if(corF.length) comFarol=comFarol.filter(c=>corF.includes(c.farol.cor));
  if(mesF.length) comFarol=comFarol.filter(c=>mesF.includes(c.ferMes||''));
  if(agF.length) comFarol=comFarol.filter(c=>agF.includes(_agKey(c,c.farol.vencDate)));

  renderFarois(comFarol);
  renderAlertasFeriasMes(comFarol);

  // Stats
  const stats={verde:0,amarelo:0,laranja:0,vermelho:0,sem:0,na:0};
  comFarol.forEach(c=>stats[c.farol.cor]=(stats[c.farol.cor]||0)+1);
  const statsEl=document.getElementById('fer-stats');
  if(statsEl) statsEl.innerHTML='<div class="stat-grid">'
      +_dsStat('alert-triangle','danger',stats.vermelho,'Vencido')
      +_dsStat('clock-hour-4','warning',stats.laranja,'Vence ≤3m')
      +_dsStat('calendar-event','accent',stats.amarelo,'Vence 4-6m')
      +_dsStat('circle-check','success',stats.verde,'Vence +6m')
      +_dsStat('help','neutral',stats.sem,'Sem dados')
      +_dsStat('circle-minus','neutral',stats.na,'N/A')
    +'</div>';
}

function renderFarois(dados){
  const corMap={verde:'var(--green)',amarelo:'var(--yellow)',laranja:'var(--orange)',vermelho:'var(--red)',sem:'var(--text3)',na:'#9CA3AF'};
  const bgMap={verde:'#ECFDF5',amarelo:'#FEFCE8',laranja:'#FFF7ED',vermelho:'#FEF2F2',sem:'#F9FAFB',na:'#F3F4F6'};
  const farolVar={vermelho:'danger',laranja:'warning',amarelo:'accent',verde:'success',sem:'neutral',na:'neutral'};
  const ddmmaa=d=>d?(String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+String(d.getFullYear()).slice(-2)):'';
  const agTag=c=>{
    if(!c.ferMes) return '<span class="rad-tag rad-tag--none">Sem agendamento</span>';
    const ag=agendamentoStatus(c,getFarol(c).vencDate);
    const cls=ag.cor==='verde'?'rad-tag--ok':(ag.cor==='vermelha'?'rad-tag--bad':'rad-tag--neu');
    const lbl=ag.cor==='verde'?'no prazo':(ag.cor==='vermelha'?'fora do prazo':'agendado');
    return '<span class="rad-tag '+cls+'">'+lbl+'</span>';
  };

  const colunas=[
    {cor:'vermelho',titulo:'Vencido',icone:''},
    {cor:'laranja',titulo:'Vence em ≤3m',icone:''},
    {cor:'amarelo',titulo:'Vence em 4-6m',icone:''},
    {cor:'verde',titulo:'Vence em +6m',icone:''},
    {cor:'sem',titulo:'Sem dados',icone:''},
    {cor:'na',titulo:'N/A',icone:''},
  ];

  const grid=document.getElementById('fer-radar-grid');
  if(grid){
    grid.innerHTML='<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;align-items:start">'
      +colunas.map(col=>{
        const itens=dados.filter(c=>c.farol.cor===col.cor);
        return '<div style="background:'+bgMap[col.cor]+';border:1.5px solid '+corMap[col.cor]+'33;border-radius:var(--radius);padding:10px;min-height:120px">'
          +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:8px;border-bottom:1.5px solid '+corMap[col.cor]+'33">'
          +'<span style="font-size:12px;font-weight:700;color:'+corMap[col.cor]+'">'+col.titulo+'</span>'
          +'<span style="background:'+corMap[col.cor]+';color:#fff;font-size:12px;font-weight:700;border-radius:20px;padding:2px 9px;min-width:24px;text-align:center">'+itens.length+'</span>'
          +'</div>'
          +'<div style="display:flex;flex-direction:column;gap:6px;max-height:480px;overflow-y:auto">'
          +itens.map(c=>{
            const f=c.farol;
            const saldo=(f.dias!=null?f.dias:30);
            const dd=ddmmaa(f.vencDate);
            const vencTxt = f.cor==='sem' ? 'Sem venc.'
              : (f.meses<0 ? 'Venceu '+dd : 'Vence '+dd);
            const agLinha = c.ferMes
              ? (c.ferMes.substring(0,3)+'/'+anoAgendadoColab(c)+' '+agTag(c))
              : agTag(c);
            return '<div class="rad-card" onclick="abrirDetalheFerias(\''+c._id+'\')" title="Clique para detalhes">'
              +'<div class="rad-card__top"><span class="rad-card__name">'+c.nome+'</span>'
                +'<span class="rad-saldo'+(saldo<0?' neg':'')+'" title="Saldo de dias a tirar">'+saldo+'d</span></div>'
              +'<div class="rad-venc" style="color:'+corMap[col.cor]+'">'+vencTxt+'</div>'
              +'<div class="rad-agend">'+agLinha+'</div>'
              +'</div>';
          }).join('')
          +'</div></div>';
      }).join('')
      +'</div>';
  }

  // Tabela detalhada
  const tbl=document.getElementById('fer-tabela');
  const order={vermelho:0,laranja:1,amarelo:2,verde:3,sem:4};
  const sorted=[...dados].sort((a,b)=>(order[a.farol.cor]||4)-(order[b.farol.cor]||4));

  if(tbl) tbl.innerHTML='<div class="section-label" style="margin-bottom:8px">Tabela detalhada</div>'
    +'<div style="overflow-x:auto;border-radius:var(--radius);border:1px solid var(--border)">'
    +'<table class="tbl" style="width:100%;border-collapse:collapse;font-size:12px">'
    +'<thead><tr>'
    +'<th style="padding:9px 10px;text-align:left">Situa\u00e7\u00e3o</th>'
    +'<th style="padding:9px 10px;text-align:left">Colaborador</th>'
    +'<th style="padding:9px 10px;text-align:left">Departamento</th>'
    +'<th style="padding:9px 10px;text-align:left">Vencimento</th>'
    +'<th style="padding:9px 10px;text-align:right">Saldo</th>'
    +'<th style="padding:9px 10px;text-align:left">Agendamento</th>'
    +'<th style="padding:9px 10px;text-align:center">A\u00e7\u00f5es</th>'
    +'</tr></thead><tbody>'
    +sorted.map(c=>{
      const f=c.farol; const cor=corMap[f.cor]; const dd=ddmmaa(f.vencDate);
      const vencCell = f.cor==='sem' ? '\u2014' : (f.meses<0 ? 'Venceu '+dd : 'Vence '+dd);
      const agCell = c.ferMes ? (agendamentoLabel(c)+' '+agTag(c)) : agTag(c);
      return '<tr>'
        +'<td style="padding:8px 10px"><span class="badge badge--'+farolVar[f.cor]+'">'+f.label+'</span></td>'
        +'<td style="padding:8px 10px"><div style="font-weight:500">'+c.nome+'</div><div class="text-xs text-muted"><code style="font-size:10px">'+(c.mat||'\u2014')+'</code></div></td>'
        +'<td style="padding:8px 10px;font-size:11px;color:var(--text2)">'+(c.depto||'\u2014')+'</td>'
        +'<td style="padding:8px 10px;font-size:11px;font-weight:600;color:'+cor+'">'+vencCell+'</td>'
        +'<td style="padding:8px 10px;text-align:right;font-weight:600">'+(c.ferSaldo!=null?c.ferSaldo:f.dias)+'d</td>'
        +'<td style="padding:8px 10px;font-size:11px">'+agCell+'</td>'
        +'<td style="padding:8px 10px;text-align:center"><button class="btn btn-ghost btn-sm" onclick="abrirDetalheFerias(\''+c._id+'\')">Editar</button></td>'
        +'</tr>';
    }).join('')+'</tbody></table></div>';
}

// ── Modal de detalhe/edicao de ferias de um colaborador ─────────
function abrirDetalheFerias(id){
  const c=colaboradores.find(x=>x._id===id); if(!c) return;
  const f=getFarol(c);
  const meses=['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  document.getElementById('modal-ferias-detalhe')?.remove();

  const corMap={verde:'var(--green)',amarelo:'var(--yellow)',laranja:'var(--orange)',vermelho:'var(--red)',sem:'var(--text3)',na:'#9CA3AF'};
  const farolVar={vermelho:'danger',laranja:'warning',amarelo:'accent',verde:'success',sem:'neutral',na:'neutral'};
  const fmt=d=>d?(String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+String(d.getFullYear()).slice(-2)):'—';
  const dd=fmt(f.vencDate);
  const vencTxt=f.cor==='sem'?'Sem vencimento':(f.meses<0?'Venceu em '+dd:'Vence em '+dd);
  let agHtml;
  if(!c.ferMes){ agHtml='<span class="badge badge--neutral">Sem agendamento</span>'; }
  else { const ag=agendamentoStatus(c,f.vencDate);
    const bcls=ag.cor==='vermelha'?'danger':(ag.cor==='verde'||ag.cor==='cinza'?'success':'accent');
    const blbl=ag.cor==='vermelha'?'fora do prazo':(ag.cor==='verde'||ag.cor==='cinza'?'no prazo':'agendado');
    agHtml='<strong>'+agendamentoLabel(c)+'</strong> <span class="badge badge--'+bcls+'">'+blbl+'</span>'; }
  const saldo=(c.ferSaldo!=null?c.ferSaldo:30);
  const admTxt=fmt(_dataLocal(c.admissao));
  const logHtml=(Array.isArray(c.feriasLog)&&c.feriasLog.length)?c.feriasLog.slice().reverse().map(l=>{
    const quando=l.em?new Date(l.em).toLocaleDateString('pt-BR'):((l.mes||'—')+'/'+(l.ano||''));
    let desc;
    if(l.tipo==='aniversario') desc='+'+(l.dias||30)+'d (aniversário de admissão) → '+l.para+'d';
    else if(l.tipo==='retorno') desc='Retorno · '+(l.gozados||0)+'d gozados'+(l.comprados?' · '+l.comprados+'d comprados':'')+' → '+l.para+'d';
    else if(l.tipo==='entrada') desc='Entrada · '+(l.gozados||0)+'d gozados'+(l.comprados?' · '+l.comprados+'d comprados':'');
    else if(l.tipo==='coletiva') desc='Coletivas · −'+(l.dias||0)+'d → '+l.para+'d';
    else if(l.tipo==='ajuste_manual') desc='Ajuste manual · '+l.de+' → '+l.para+'d'+(l.justificativa?' ('+l.justificativa+')':'');
    else desc=(l.gozados||0)+'d gozados'+(l.comprados?' · '+l.comprados+'d comprados':'')+(l.faltas?' · '+l.faltas+'d faltas':'');
    return '<div class="ferd-log"><span style="white-space:nowrap">'+quando+'</span><span class="text-muted" style="text-align:right">'+desc+(l.por?' · '+l.por:'')+'</span></div>';
  }).join(''):'';

  const html=`
    <div class="modal-overlay ds" id="modal-ferias-detalhe" data-dynamic="1" onclick="if(event.target===this) closeModal('modal-ferias-detalhe')">
      <div class="modal" style="max-width:540px;padding:0;overflow:hidden">
        <div style="background:var(--brand);color:#fff;padding:14px 20px;display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px"><i class="ti ti-umbrella"></i> ${c.nome}</div>
          <button onclick="closeModal('modal-ferias-detalhe')" title="Fechar" style="background:transparent;border:none;color:#fff;font-size:22px;cursor:pointer;line-height:1">&times;</button>
        </div>
        <div style="padding:20px;max-height:70vh;overflow-y:auto">
          <div class="modal-sub" style="margin-top:0">Matrícula ${c.mat||'—'} &middot; Função: <strong>${funcaoColab(c)||'—'}</strong></div>

          <div id="ferd-view">
            <div class="ferd-resumo">
              <div class="ferd-item"><span class="ferd-lbl">Situação</span><span><span class="badge badge--${farolVar[f.cor]}">${f.label}</span></span></div>
              <div class="ferd-item"><span class="ferd-lbl">Vencimento</span><span class="ferd-val" style="color:${corMap[f.cor]}">${vencTxt}</span></div>
              <div class="ferd-item"><span class="ferd-lbl">Agendamento</span><span>${agHtml}</span></div>
              <div class="ferd-item"><span class="ferd-lbl">Saldo atual</span><span class="ferd-val"${saldo<0?' style="color:var(--danger-text)"':''}>${saldo} dias</span></div>
              <div class="ferd-item"><span class="ferd-lbl">Admissão</span><span class="ferd-val" style="font-weight:600">${admTxt}</span></div>
            </div>
          </div>

          <div id="ferd-edit" style="display:none">
            <div class="section-label">Editar dados de férias</div>
            <div class="form-grid cols2">
              <div class="fg"><label>Data de admissão</label><input type="date" id="ferd-admissao" value="${c.admissao||''}"></div>
              <div class="fg"><label>Vencimento (dia/mês)</label><input type="text" id="ferd-venc" placeholder="DD/MM" maxlength="5" value="${_vencCampoDDMM(c)}"></div>
              <div class="fg"><label>Saldo de dias a tirar</label><input type="number" id="ferd-saldo" value="${saldo}" min="-90" max="90"></div>
              <div class="fg"><label>Mês agendado</label>
                <select id="ferd-mes" onchange="atualizarAnoFerd()">
                  <option value="">-- Não agendado --</option>
                  ${meses.map(m=>'<option value="'+m+'" '+(c.ferMes===m?'selected':'')+'>'+m+'</option>').join('')}
                </select>
                <span class="text-xs text-muted" style="margin-top:2px">Ano calculado: <strong id="ferd-ano">${c.ferMes?anoAgendadoColab(c):'—'}</strong></span>
              </div>
            </div>
            <p class="text-xs text-muted" style="margin-top:8px">A alteração vale para este colaborador em todo o sistema. Vencimento em dia/mês (o ano é gerido pelo sistema). Saldo pode ser negativo (antecipação).</p>
          </div>

          ${logHtml?`<div style="margin-top:16px"><div class="section-label" style="margin-bottom:6px">Histórico</div><div style="max-height:180px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius);padding:4px 10px">${logHtml}</div></div>`:''}
          <div id="ferd-alertas" style="margin-top:10px"></div>

          <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px;padding-top:14px;border-top:1px solid var(--border)">
            <span id="ferd-foot-view" style="display:inline-flex;gap:10px">
              <button class="btn btn-ghost" onclick="closeModal('modal-ferias-detalhe')">Fechar</button>
              <button class="btn btn-primary" onclick="ferdEdit(true)"><i class="ti ti-edit"></i> Editar</button>
            </span>
            <span id="ferd-foot-edit" style="display:none;gap:10px">
              <button class="btn btn-ghost" onclick="ferdEdit(false)">Cancelar</button>
              <button class="btn btn-primary" onclick="salvarDetalheFerias('${id}')"><i class="ti ti-check"></i> Salvar</button>
            </span>
          </div>
        </div>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('modal-ferias-detalhe')?.classList.add('open');
  verificarAlertasFerias(id);
}
function ferdEdit(on){
  const v=document.getElementById('ferd-view'), e=document.getElementById('ferd-edit');
  const fv=document.getElementById('ferd-foot-view'), fe=document.getElementById('ferd-foot-edit');
  if(v) v.style.display=on?'none':'';
  if(e) e.style.display=on?'':'none';
  if(fv) fv.style.display=on?'none':'inline-flex';
  if(fe) fe.style.display=on?'inline-flex':'none';
}

// Avisa sobre cobertura da FUNCAO ao agendar/trocar ferias e mostra a
// distribuicao dos agendamentos da funcao por mes (nao bloqueia).
function verificarAlertasFerias(id){
  const sel=document.getElementById('ferd-mes');
  if(!sel) return;
  const render=()=>{
    const c=colaboradores.find(x=>x._id===id);
    const alertasEl=document.getElementById('ferd-alertas');
    if(!c||!alertasEl) return;
    const func=funcaoColab(c);
    const novoMes=sel.value;
    if(!func){ alertasEl.innerHTML=''; return; }

    // Colegas da mesma funcao (exclui este e quem nao recebe ferias)
    const colegas=colaboradores.filter(x=>
      x._id!==id && funcaoColab(x)===func && !STATUS_NAO_RECEBE.includes(x.status)
    );

    let html='';
    if(novoMes){
      const mesmoMes=colegas.filter(x=>x.ferMes===novoMes);
      if(mesmoMes.length>0){
        html+='<div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:6px;padding:8px 10px;font-size:12px;color:#92400E">'
          +'<strong>Atencao a cobertura:</strong> '+mesmoMes.length+' colaborador(es) da funcao "'+func+'" ja estao em '+novoMes+': '
          +mesmoMes.map(x=>x.nome).join(', ')+'. Verifique se a funcao seguira coberta.'
          +'</div>';
      }
    }
    // Painel de cobertura da funcao por mes
    if(colegas.length>0){
      const dist={};
      colegas.forEach(x=>{ if(x.ferMes) dist[x.ferMes]=(dist[x.ferMes]||0)+1; });
      const linhas=MESES_FER.filter(m=>dist[m]).map(m=>m.substring(0,3)+': '+dist[m]).join(' · ');
      html+='<div style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-size:11px;color:var(--text2);margin-top:6px">'
        +'<strong>Funcao "'+func+'"</strong> — '+(colegas.length+1)+' pessoa(s) no total. Agendamentos: '+(linhas||'nenhum')
        +'</div>';
    }
    alertasEl.innerHTML=html;
  };
  sel.addEventListener('change', render);
  render(); // estado inicial ao abrir o modal
}

// Atualiza o ano calculado exibido no modal de ferias
function atualizarAnoFerd(){
  const sel=document.getElementById('ferd-mes');
  const ano=document.getElementById('ferd-ano');
  const adm=document.getElementById('ferd-admissao')?.value||'';
  if(ano&&sel) ano.textContent=sel.value?anoAgendadoColab({ferMes:sel.value,admissao:adm}):'—';
}

async function salvarDetalheFerias(id){
  const c=colaboradores.find(x=>x._id===id); if(!c) return;
  const saldo=fnum(document.getElementById('ferd-saldo')?.value);
  const mes=document.getElementById('ferd-mes')?.value||'';
  const venc=document.getElementById('ferd-venc')?.value||'';
  const admissao=document.getElementById('ferd-admissao')?.value||'';

  c.ferSaldo=saldo;
  c.ferVenc=_resolveVencInput(venc, c.ferVenc);
  c.ferMes=mes;
  c.admissao=admissao||c.admissao||'';

  try{
    await fsSet('colaboradores',id,c);
    toast('Ferias atualizadas!','success');
    closeModal('modal-ferias-detalhe');
    if(currentPage==='fer-radar') renderFerRadar();
    if(currentPage==='fer-agendadas') renderFeriasAgendadas();
    if(currentPage==='ben-lancamento') showPage('ben-lancamento');
  }catch(e){ toast('Erro: '+e.message,'error'); }
}

// ════════════════════════════════════════════════════════════════
// MODULOS — ADICIONAR PREMIO ASSIDUIDADE
// ════════════════════════════════════════════════════════════════
// Override do MODULES para incluir premio


// Novas paginas registradas diretamente (sem override recursivo)


// ════════════════════════════════════════════════════════════════
// MODULOS — ADICIONAR PREMIO ASSIDUIDADE
// ════════════════════════════════════════════════════════════════
// Override do MODULES para incluir premio


// Novas paginas registradas diretamente (sem override recursivo)


// ════════════════════════════════════════════════════════════════
// FIXES ADICIONAIS
// ════════════════════════════════════════════════════════════════

// ── FIX: Folha com competência + fechar competência ──────────────


function pgFolhaImport(){
  const anos=[2024,2025,2026,2027];
  const anoAtual=new Date().getFullYear();
  const mesAtual=new Date().getMonth()+1;
  const meses=[{v:1,l:'Janeiro'},{v:2,l:'Fevereiro'},{v:3,l:'Marco'},{v:4,l:'Abril'},
    {v:5,l:'Maio'},{v:6,l:'Junho'},{v:7,l:'Julho'},{v:8,l:'Agosto'},
    {v:9,l:'Setembro'},{v:10,l:'Outubro'},{v:11,l:'Novembro'},{v:12,l:'Dezembro'}];

  return `
    <div class="page-header"><h2>Folha de Pagamento</h2>
    <p>Importe o relatorio de eventos da Senior por competencia.</p></div>

    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Selecione a competencia</div>
      <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">
        <div class="fg">
          <label>Mes</label>
          <select id="folha-mes" style="padding:8px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px;min-width:130px">
            ${meses.map(m=>'<option value="'+m.v+'" '+(m.v===mesAtual?'selected':'')+'>'+m.l+'</option>').join('')}
          </select>
        </div>
        <div class="fg">
          <label>Ano</label>
          <select id="folha-ano" style="padding:8px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px">
            ${anos.map(a=>'<option value="'+a+'" '+(a===anoAtual?'selected':'')+'>'+a+'</option>').join('')}
          </select>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="carregarFolhaSalva()">Carregar salva</button>
      </div>
    </div>

    <div id="folha-competencia-info"></div>

    <div class="card">
      <div class="card-title">Importar relatorio</div>
      <div class="alert alert-info" style="margin-bottom:14px">
        Formato: <strong>Cadastro | Nome | Evento | Descricao | Valor</strong>
      </div>
      <div class="upload-zone" onclick="document.getElementById('folha-file').click()">
        <input type="file" id="folha-file" accept=".xlsx,.xls" onchange="processarFolha(event)">
        <div style="font-size:28px;margin-bottom:8px">&#8679;</div>
        <div class="upload-text">Clique para selecionar o relatorio</div>
        <div class="upload-sub">.xlsx ou .xls</div>
      </div>
      <div id="folha-import-preview" style="margin-top:14px"></div>
    </div>`;
}

function getFolhaComp(){
  const mes=document.getElementById('folha-mes')?.value||String(new Date().getMonth()+1);
  const ano=document.getElementById('folha-ano')?.value||String(new Date().getFullYear());
  return String(mes).padStart(2,'0')+'/'+ano;
}

async function carregarFolhaSalva(){
  const comp=getFolhaComp();
  try{
    const snap=await window._getDocs(window._col('historico'));
    let found=null;
    snap.forEach(d=>{ if(d.id==='folha_'+comp.replace('/','_')) found=d.data(); });
    if(!found){ toast('Nenhuma folha salva para '+comp,'warning'); return; }
    folhaData=found.detalhes||[];
    folhaCompetencia=comp;
    toast('Folha '+comp+' carregada!','success');
    showPage('folha-view');
  }catch(e){ toast('Erro: '+e.message,'error'); }
}

// Salva a folha atualmente carregada em memoria como snapshot fechado
async function fecharCompetenciaFolha(){
  if(!folhaData||folhaData.length===0){ toast('Nenhuma folha carregada para fechar.','warning'); return; }
  const comp=folhaCompetencia||getFolhaComp();
  if(!confirm('Fechar a competencia '+comp+'? Isso salva um snapshot permanente da folha atual.')) return;
  try{
    await fsSet('historico','folha_'+comp.replace('/','_'),{
      tipo:'folha',competencia:comp,fechadoEm:new Date().toISOString(),
      totalColaboradores:folhaData.length,detalhes:folhaData
    });
    toast('\u2705 Folha '+comp+' fechada e salva!','success');
  }catch(e){ toast('Erro: '+e.message,'error'); }
}

// Remove a folha da competencia atual (memoria + historico salvo, se houver)
async function deletarFolhaCompetencia(){
  const comp=folhaCompetencia||getFolhaComp();
  if(!confirm('Deletar a folha da competencia '+comp+'? Esta acao remove os dados carregados e, se houver, o snapshot salvo no historico.')) return;
  try{
    await fsDel('historico','folha_'+comp.replace('/','_')).catch(()=>{});
    folhaData=null;
    folhaCompetencia='';
    toast('\u2705 Folha '+comp+' removida.','success');
    showPage('folha-view');
  }catch(e){ toast('Erro: '+e.message,'error'); }
}


// ── FIX: Premio com competência ──────────────────────────────────


function pgFolhaView(){
  const empresas=getEmpresaList();
  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:10px">
      <div>
        <h2 style="font-size:20px;font-weight:700">${folhaCompetencia?'Folha '+folhaCompetencia:'Folha de Pagamento'}</h2>
        <p id="folha-sub" class="text-sm text-muted">Importe um relatorio para visualizar.</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm" onclick="showPage('folha-import')">Importar nova</button>
        <button class="btn btn-danger btn-sm" onclick="deletarFolhaCompetencia()">Deletar</button>
        <button class="btn btn-success btn-sm" onclick="fecharCompetenciaFolha()">Fechar competencia</button>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:flex-end">
      <div style="display:flex;flex-direction:column;gap:3px;flex:1">
        <label style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase">Buscar</label>
        <input type="text" id="folha-q" placeholder="Nome ou matricula..." oninput="filtrarFolha()"
          style="padding:8px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px">
      </div>
      <div style="display:flex;flex-direction:column;gap:3px">
        <label style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase">Empresa</label>
        <select id="folha-emp" onchange="filtrarFolha()" style="padding:8px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px">
          <option value="">Todas</option>${empresas.map(e=>'<option value="'+e.cod+'">'+e.cod+'</option>').join('')}
        </select>
      </div>
      <div style="display:flex;flex-direction:column;gap:3px">
        <label style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase">Tabela</label>
        <select id="folha-aba" onchange="filtrarFolha()" style="padding:8px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px">
          <option value="proventos">Proventos</option>
          <option value="encargos">Encargos</option>
          <option value="adiantamento">Adiantamento</option>
          <option value="descontos">Descontos</option>
        </select>
      </div>
      <button class="btn btn-success btn-sm" onclick="exportarFolhaExcel()">Excel (4 abas)</button>
    </div>
    <div id="folha-tabela"></div>`;
}


// ================================================================
// PREMIO DE ASSIDUIDADE — FLUXO 7 PASSOS
// ================================================================

// Estado do processo
let premioState = {
  passo: 1,
  competencia: '',
  compLabel: '',
  baseAtualizada: false,
  fechado: false,     // competência fechada (passo 7)
  afastados: [],      // lidos do PDF de afastados
  apontamentos: [],   // lidos do PDF de apuração
  tabela: [],         // tabela final com regras aplicadas
};

// Códigos do PDF de apuração → campo
const APURACAO_MAP = {
  '014': 'atestado',
  '015': 'faltas',
  '020': 'aHoras',
  '064': 'aNoturno',
  '101': 'saida',
  '103': 'atraso',
  '107': 'faltaParcial',
  '108': 'abono',
};

// Converter "HHH:MM" em minutos
function hhmm2min(s){
  if(!s) return 0;
  const m = String(s).trim().match(/(\d+):(\d+)/);
  if(!m) return 0;
  return parseInt(m[1])*60 + parseInt(m[2]);
}

// Formatar minutos em "Xh MMmin"
function min2str(min){
  if(!min) return '—';
  const h=Math.floor(min/60), m=min%60;
  if(h>0) return h+'h '+String(m).padStart(2,'0')+'min';
  return m+'min';
}

// ── Página principal — wizard de 7 passos ────────────────────────
function pgPremioAssiduidade(){
  return `
    <div class="page-header">
      <h2 class="page-title">Prêmio de Assiduidade</h2>
      <p class="page-subtitle">Siga os passos (abas acima) para calcular e exportar o prêmio. Valor fixo: R$ 226,00.</p>
    </div>
    <div id="premio-wizard"></div>`;
}

function afterRenderPremio(){
  if(!basesSalvasList.length){ loadBasesSalvas().then(()=>renderPremioWizard()).catch(()=>renderPremioWizard()); }
  else renderPremioWizard();
}

function renderPremioWizard(){
  const el = document.getElementById('premio-wizard');
  if(!el) return;

  const passos = [
    {n:1,  label:'Base'},
    {n:2,  label:'Competência'},
    {n:3,  label:'Apuração'},
    {n:4,  label:'Análise'},
    {n:5,  label:'Regras'},
    {n:55, label:'MEI'},
    {n:7,  label:'Conferir e fechar'},
  ];
  const ordem=[1,2,3,4,5,55,7];
  const atual = premioState.passo;
  const curIdx = ordem.indexOf(atual);

  const barraHtml = '<div class="lan-tabs">'
    + passos.map((p,i)=>{
        const done=i<curIdx, active=p.n===atual;
        const cls=active?' lan-tab--active':(done?' lan-tab--done':'');
        const num=done?'✓':(i+1);
        const clickable=i<=curIdx;
        return '<button class="lan-tab'+cls+'" '+(clickable?'onclick="premioIrPasso('+p.n+')"':'disabled style="opacity:.45;cursor:default"')+'>'
          +'<span class="lan-tab__n">'+num+'</span> '+p.label+'</button>';
      }).join('')
    + '</div>';

  const head=(n,t,d)=>'<div class="lan-step__head"><span class="lan-step__num">'+n+'</span><div><div class="lan-step__t">'+t+'</div><div class="lan-step__d">'+d+'</div></div></div>';
  const nav=(prev,next,nextLabel)=>'<div class="lan-navbtns">'
    +(prev?'<button class="btn btn-ghost btn-sm" onclick="premioIrPasso('+prev+')"><i class="ti ti-arrow-left"></i> Voltar</button>':'<span></span>')
    +(next?'<button class="btn btn-primary btn-sm" onclick="premioIrPasso('+next+')">'+(nextLabel||'Próximo')+' <i class="ti ti-arrow-right"></i></button>':'<span></span>')
    +'</div>';

  let conteudo = '';

  if(atual === 1){
    // ── PASSO 1: Base importada + filtros + tabela ──
    const base = _premioBasePop();
    const _ver=basesSalvasList[0];
    const _verDt=_ver&&_ver.salvoEm?new Date(_ver.salvoEm).toLocaleString('pt-BR'):'—';
    const _verLinha=_ver
      ? '<span>Versão: <strong>'+_ver.competencia+'</strong></span><span>Data da versão: <strong>'+_verDt+'</strong></span>'
      : '<span class="text-muted">Sem versão salva em Históricos</span>';
    const emps=[...new Set(base.map(c=>_empresaKey(c)).filter(Boolean))].sort((a,b)=>a==='PART'?1:(b==='PART'?-1:a.localeCompare(b)));
    const selSt='padding:7px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px';
    conteudo = '<div class="lan-step">'
      + head(1,'Importar e conferir a base','A última base salva é importada automaticamente. Confira a tabela abaixo — recarregue outra versão ou confirme para avançar. Afastados podem ser reativados na própria tabela.')
      + '<div class="alert alert-success" style="display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;margin-bottom:12px"><span><i class="ti ti-database-import"></i> <strong>Base importada automaticamente</strong></span>'+_verLinha+'<span>'+base.length+' colaboradores</span></div>'
      // Botões ACIMA dos filtros
      + '<div class="lan-navbtns" style="margin-bottom:12px"><button class="btn btn-ghost btn-sm" onclick="premioImportarBase()"><i class="ti ti-refresh"></i> Recarregar nova base</button>'
        + '<button class="btn btn-primary btn-sm" onclick="premioIrPasso(2)">Confirmar e avançar <i class="ti ti-arrow-right"></i></button></div>'
      // Filtros
      + '<div class="filter-bar" style="align-items:flex-end;margin-bottom:12px">'
        + '<div class="filter-group" style="flex:1"><label>Buscar</label><input type="text" id="pb-q" placeholder="Nome, matrícula ou departamento..." oninput="renderPremioBaseTabela()"></div>'
        + '<div class="filter-group"><label>Empresa</label><select id="pb-emp" onchange="renderPremioBaseTabela()" style="'+selSt+'"><option value="">Todas</option>'+emps.map(e=>'<option value="'+e+'">'+_empresaLabel(e)+'</option>').join('')+'</select></div>'
        + '<div class="filter-group"><label>Situação</label><select id="pb-sit" onchange="renderPremioBaseTabela()" style="'+selSt+'"><option value="">Todas</option><option value="trabalhando">Trabalhando</option><option value="ferias">Férias</option><option value="afastado">Afastado</option></select></div>'
      + '</div>'
      // Tabela importada
      + '<div class="tbl-wrap" style="max-height:460px"><table class="tbl"><thead><tr><th>Matrícula</th><th>Nome</th><th>Empresa</th><th>Departamento</th><th>Situação</th><th style="text-align:center">Ação</th></tr></thead>'
        + '<tbody id="premio-base-tbody">'+_premioBaseRows(base)+'</tbody></table></div>'
      + '</div>';

  } else if(atual === 2){
    // ── PASSO 2: Competência ──
    const anos=[2024,2025,2026,2027];
    const anoAtual=new Date().getFullYear();
    const mesAtual=new Date().getMonth()+1;
    const meses=[{v:1,l:'Janeiro'},{v:2,l:'Fevereiro'},{v:3,l:'Março'},{v:4,l:'Abril'},
      {v:5,l:'Maio'},{v:6,l:'Junho'},{v:7,l:'Julho'},{v:8,l:'Agosto'},
      {v:9,l:'Setembro'},{v:10,l:'Outubro'},{v:11,l:'Novembro'},{v:12,l:'Dezembro'}];
    const selSt='padding:9px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px';
    conteudo = '<div class="lan-step">'
      + head(2,'Mês e ano de referência','Selecione a competência (mês/ano) para o cálculo do prêmio.')
      + '<div style="display:flex;gap:16px;align-items:flex-end;flex-wrap:wrap;margin-bottom:8px">'
        + '<div class="filter-group"><label>Mês</label><select id="premio-mes" style="'+selSt+';min-width:150px">'
          + meses.map(m=>'<option value="'+m.v+'"'+(m.v===mesAtual?' selected':'')+'>'+m.l+'</option>').join('')+'</select></div>'
        + '<div class="filter-group"><label>Ano</label><select id="premio-ano" style="'+selSt+'">'
          + anos.map(a=>'<option value="'+a+'"'+(a===anoAtual?' selected':'')+'>'+a+'</option>').join('')+'</select></div>'
      + '</div>'
      + '<div class="lan-navbtns"><button class="btn btn-ghost btn-sm" onclick="premioIrPasso(1)"><i class="ti ti-arrow-left"></i> Voltar</button>'
        + '<button class="btn btn-primary btn-sm" onclick="premioIniciarApuracao()">Iniciar apuração <i class="ti ti-arrow-right"></i></button></div>'
      + '</div>';

  } else if(atual === 3){
    // ── PASSO 3: Importar PDF de apuração ──
    conteudo = '<div class="lan-step">'
      + head(3,'Importar apuração da Senior','Competência <strong>'+premioState.competencia+'</strong>. Importe o relatório de apuração de colaboradores (PDF/Excel). Ao ler, mostramos quantos colaboradores foram identificados.')
      + '<div class="upload-zone" onclick="document.getElementById(\'premio-apuracao-file\').click()">'
        + '<input type="file" id="premio-apuracao-file" accept=".pdf,.xlsx,.xls,.txt,.csv" style="display:none" onchange="processarApuracaoPremio(event)">'
        + '<div style="font-size:26px;margin-bottom:6px"><i class="ti ti-file-upload"></i></div>'
        + '<div class="upload-text">Selecionar arquivo de apuração</div>'
        + '<div class="upload-sub">Relatório "HRAP001.APU" da Senior — PDF ou Excel</div>'
      + '</div>'
      + '<div id="premio-apuracao-preview" style="margin-top:14px"></div>'
      + '<details style="margin-top:12px"><summary class="text-xs text-muted" style="cursor:pointer">Ver códigos do relatório (de/para)</summary>'
        + '<div class="text-xs text-muted" style="margin-top:6px">014 Atestado · 015 Faltas · 020 Atestado Horas · 064 Atestado Noturno · 101 Saída Antecipada · 103 Atraso · 107 Falta Parcial · 108 Abono Gestor</div></details>'
      + '<div class="lan-navbtns"><button class="btn btn-ghost btn-sm" onclick="premioIrPasso(2)"><i class="ti ti-arrow-left"></i> Voltar</button><span></span></div>'
      + '</div>';

  } else if(atual === 4){
    // ── PASSO 4: Análise dos dados ──
    conteudo = renderPremioTabelaHTML(false);

  } else if(atual === 5){
    // ── PASSO 5: Regras aplicadas ──
    conteudo = renderPremioTabelaHTML(true);

  } else if(atual === 55){
    // ── PASSO 6 (interno 55): Revisão MEI ──
    const meis = premioState.tabela.filter(r=>r.situacao==='MEI');
    if(meis.length === 0){ premioState.passo = 7; renderPremioWizard(); return; }
    conteudo = '<div class="lan-step">'
      + head(6,'Revisão dos MEI ('+meis.length+')','MEI recebem por padrão. Ajuste para NÃO os que perderam o prêmio por apontamentos externos.')
      + '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">'
        + '<input type="text" id="mei-q" placeholder="Buscar nome ou matrícula..." oninput="filtrarTabelaMei()" style="flex:1;min-width:200px;padding:8px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px">'
        + '<div class="badge badge--accent" id="mei-resumo" style="padding:8px 14px">'+meis.filter(r=>r.recebe==='SIM').length+' SIM · '+meis.filter(r=>r.recebe==='NAO').length+' NÃO · '+brl(meis.filter(r=>r.recebe==='SIM').length*PREMIO_VAL)+'</div>'
      + '</div>'
      + '<div class="tbl-wrap" style="max-height:440px;margin-bottom:14px"><table class="tbl"><thead><tr>'
        + '<th>Matrícula</th><th>Nome</th><th style="text-align:center">Atraso</th><th style="text-align:center">Saída</th><th style="text-align:center">Atestado</th><th style="text-align:center">Faltas</th><th style="text-align:center">Abono</th><th style="text-align:center">Recebe</th>'
        + '</tr></thead><tbody id="mei-tbody">'+renderMeiLinhas(meis)+'</tbody></table></div>'
      + '<div class="lan-navbtns"><button class="btn btn-ghost btn-sm" onclick="premioIrPasso(5)"><i class="ti ti-arrow-left"></i> Voltar</button>'
        + '<button class="btn btn-primary btn-sm" onclick="premioIrPasso(7)">Conferir e fechar <i class="ti ti-arrow-right"></i></button></div>'
      + '</div>';

  } else if(atual === 7){
    // ── PASSO 7: Conferir, fechar e exportar ──
    conteudo = renderPremioPasso7HTML();
  }

  el.innerHTML = barraHtml + conteudo;
}

function _premioHead(n,t,d){ return '<div class="lan-step__head"><span class="lan-step__num">'+n+'</span><div><div class="lan-step__t">'+t+'</div><div class="lan-step__d">'+d+'</div></div></div>'; }

// ── Filtros compartilhados (passo 5 e 7) ─────────────────────────
function _premioEmpresas(){ const s=new Set(); (premioState.tabela||[]).forEach(r=>{ if(r.empresa) s.add(r.empresa); }); return [...s].sort(); }
function _premioFiltros(prefix){
  const emps=_premioEmpresas();
  return '<div class="filter-bar" style="align-items:flex-end;margin-bottom:12px">'
    +'<div class="filter-group" style="flex:1"><label>Buscar</label><input type="text" id="'+prefix+'-q" placeholder="Nome ou matrícula..." oninput="'+prefix+'Filtrar()"></div>'
    +'<div class="filter-group"><label>Situação</label><select id="'+prefix+'-rec" onchange="'+prefix+'Filtrar()"><option value="">Todas</option><option value="SIM">Recebe</option><option value="NAO">Não recebe</option><option value="__PEND">Pendente</option></select></div>'
    +'<div class="filter-group"><label>Empresa</label><select id="'+prefix+'-emp" onchange="'+prefix+'Filtrar()"><option value="">Todas</option>'+emps.map(e=>'<option value="'+e+'">'+_empresaLabel(e)+'</option>').join('')+'</select></div>'
    +'<button class="btn btn-ghost btn-sm" onclick="'+prefix+'Limpar()">Limpar</button>'
    +'</div>';
}
function _premioAplicarFiltro(prefix){
  const q=(document.getElementById(prefix+'-q')?.value||'').toLowerCase();
  const rec=document.getElementById(prefix+'-rec')?.value||'';
  const emp=document.getElementById(prefix+'-emp')?.value||'';
  return (premioState.tabela||[]).filter(r=>{
    if(q && !((r.nome||'').toLowerCase().includes(q)||(r.mat||'').includes(q))) return false;
    if(emp && r.empresa!==emp) return false;
    if(rec==='__PEND'){ if(r.recebe!=='') return false; }
    else if(rec && r.recebe!==rec) return false;
    return true;
  });
}
function p5Filtrar(){ const el=document.getElementById('p5-tbody'); if(el) el.innerHTML=renderPremioLinhas(_premioAplicarFiltro('p5')); }
function p5Limpar(){ ['p5-q','p5-rec','p5-emp'].forEach(id=>{const e=document.getElementById(id); if(e)e.value='';}); p5Filtrar(); }
function p7Filtrar(){ const el=document.getElementById('p7-tbody'); if(el) el.innerHTML=renderPasso7Linhas(_premioAplicarFiltro('p7')); }
function p7Limpar(){ ['p7-q','p7-rec','p7-emp'].forEach(id=>{const e=document.getElementById(id); if(e)e.value='';}); p7Filtrar(); }

// ── Passo 7: conferir, fechar e exportar ─────────────────────────
function _premioValorDe(r){ return (r.valorPago!=null && r.valorPago!=='') ? fnum(r.valorPago) : PREMIO_VAL; }
function renderPremioPasso7HTML(){
  const t = premioState.tabela;
  if(!t||!t.length) return '<div class="alert alert-warning">Nenhum dado. Volte ao Passo 3 e importe a apuração.</div>';
  const sim = t.filter(r=>r.recebe==='SIM');
  const nao = t.filter(r=>r.recebe==='NAO');
  const total = sim.reduce((s,r)=>s+_premioValorDe(r),0);
  const fechado = !!premioState.fechado;

  let acoes;
  if(fechado){
    acoes = '<div class="alert alert-success" style="margin-bottom:12px"><i class="ti ti-lock-check"></i> Competência <strong>'+premioState.competencia+'</strong> fechada e salva no Histórico.</div>'
      + '<div class="lan-navbtns"><button class="btn btn-ghost btn-sm" onclick="premioNovaCompetencia()"><i class="ti ti-refresh"></i> Iniciar nova competência</button>'
      + '<button class="btn btn-success btn-sm" onclick="exportarPremioCaju()"><i class="ti ti-download"></i> Exportar CSV Caju ('+sim.length+')</button></div>';
  } else {
    acoes = '<div class="lan-sub" style="margin-top:6px"><div class="lan-sub__t">Ajuste de valores (opcional)</div>'
      + '<div class="lan-sub__d">Altere o valor de um colaborador apenas se precisar pagar um valor retroativo/diferente. Ao alterar, preencha a justificativa abaixo — ela será gravada no histórico.</div>'
      + '<textarea id="p7-justif" rows="2" placeholder="Justificativa (obrigatória se algum valor for alterado)" style="width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px;resize:vertical"></textarea></div>'
      + '<div class="lan-navbtns"><button class="btn btn-ghost btn-sm" onclick="premioIrPasso(55)"><i class="ti ti-arrow-left"></i> Voltar</button>'
      + '<button class="btn btn-success btn-sm" onclick="fecharCompetencionPremio()"><i class="ti ti-lock"></i> Fechar competência '+premioState.competencia+'</button></div>';
  }

  return '<div class="lan-step">'
    + _premioHead(7,'Conferir e fechar','Confira a lista final, feche a competência (salva no Histórico com log) e exporte o CSV do Caju.')
    + '<div class="stat-grid" style="margin-bottom:6px">'
      + _dsStat('user-check','success',sim.length,'Receberão')
      + _dsStat('user-x','danger',nao.length,'Não receberão')
      + _dsStatAccent('cash',brl(total),'Total a pagar')
    + '</div>'
    + _premioFiltros('p7')
    + '<div class="tbl-wrap" style="max-height:420px;margin-bottom:14px"><table class="tbl"><thead><tr>'
      + '<th>Matrícula</th><th>Nome</th><th>Empresa</th><th>Situação</th><th style="text-align:center">Recebe</th><th style="text-align:right">Valor</th>'
      + '</tr></thead><tbody id="p7-tbody">'+renderPasso7Linhas(t)+'</tbody></table></div>'
    + acoes
    + '</div>';
}
function renderPasso7Linhas(dados){
  const fechado=!!premioState.fechado;
  return dados.map(r=>{
    const idx = premioState.tabela.indexOf(r);
    const corRec = r.recebe==='SIM'?'var(--brand)':'var(--danger)';
    const sitBadge = r.situacao==='MEI'?'warning':r.situacao==='N/A'?'neutral':r.situacao==='Trabalhando'?'success':'accent';
    const val=_premioValorDe(r);
    const alterado = r.valorPago!=null && r.valorPago!=='' && Math.abs(fnum(r.valorPago)-PREMIO_VAL)>0.001;
    let celValor;
    if(r.recebe!=='SIM'){ celValor='<span class="text-muted">—</span>'; }
    else if(fechado){ celValor=brl(val)+(alterado?' <i class="ti ti-pencil" title="Valor alterado" style="color:var(--warning)"></i>':''); }
    else { celValor='<input type="number" step="0.01" min="0" value="'+val+'" onchange="editarValorPremio('+idx+',this.value)" style="width:96px;padding:3px 6px;border:1px solid '+(alterado?'var(--warning)':'var(--border)')+';border-radius:4px;font-size:12px;text-align:right">'; }
    return '<tr>'
      + '<td><code style="font-size:11px">'+(r.mat||'—')+'</code></td>'
      + '<td style="font-weight:500">'+r.nome+'</td>'
      + '<td class="text-sm">'+(r.empresa||'—')+'</td>'
      + '<td><span class="badge badge--'+sitBadge+'">'+r.situacao+'</span></td>'
      + '<td style="text-align:center;font-weight:700;color:'+corRec+'">'+(r.recebe||'—')+'</td>'
      + '<td style="text-align:right;font-family:monospace">'+celValor+'</td>'
      + '</tr>';
  }).join('');
}
function editarValorPremio(idx,v){
  if(!premioState.tabela[idx]) return;
  premioState.tabela[idx].valorPago = (v===''?null:fnum(v));
  // recomputa total no topo
  const total = premioState.tabela.filter(r=>r.recebe==='SIM').reduce((s,r)=>s+_premioValorDe(r),0);
  const box=document.querySelectorAll('#premio-wizard .stat--accent .stat__value')[0];
  if(box) box.textContent=brl(total);
}
function premioImportarBase(){
  loadColaboradores().then(()=>{ toast('Base recarregada: '+colaboradores.length+' colaboradores.','success'); renderPremioWizard(); });
}
// População da base considerada no prêmio (dedup por CPF, exclui demitidos/N/A/inativos)
function _premioBasePop(){ return colaboradoresUnicos().filter(c=>statusGrupo(c.status)!=='nao_recebe' && _statusKey(c.status)!=='INATIVO'); }
function _premioBaseFiltrada(){
  const q=(document.getElementById('pb-q')?.value||'').toLowerCase().trim();
  const emp=document.getElementById('pb-emp')?.value||'';
  const sit=document.getElementById('pb-sit')?.value||'';
  return _premioBasePop().filter(c=>{
    if(q && !((c.nome||'').toLowerCase().includes(q)||(c.mat||'').toLowerCase().includes(q)||(c.depto||'').toLowerCase().includes(q))) return false;
    if(emp && !_empresaMatch(c,[emp])) return false;
    if(sit){ const g=statusGrupo(c.status); if(sit==='trabalhando'&&g!=='trabalhando') return false; if(sit==='afastado'&&g!=='so_cesta') return false; if(sit==='ferias'&&g!=='ferias') return false; }
    return true;
  });
}
function _premioBaseRows(lista){
  if(!lista.length) return '<tr><td colspan="6" style="padding:16px;text-align:center;color:var(--text-muted)">Nenhum colaborador com os filtros atuais.</td></tr>';
  return lista.slice().sort((a,b)=>(a.nome||'').localeCompare(b.nome||'')).map(c=>{
    const g=statusGrupo(c.status);
    const badge=g==='trabalhando'?'success':g==='so_cesta'?'warning':g==='ferias'?'accent':'neutral';
    const acao=g==='so_cesta'?'<button class="btn btn-ghost btn-sm" onclick="premioReativarAfastado(\''+c._id+'\')"><i class="ti ti-arrow-back-up"></i> Reativar</button>':'';
    return '<tr><td><code style="font-size:10px">'+(c.mat||'—')+'</code></td>'
      +'<td style="font-weight:500">'+c.nome+'</td>'
      +'<td class="text-sm">'+_empresaLabel(_empresaKey(c))+'</td>'
      +'<td class="text-sm">'+(c.depto||'—')+'</td>'
      +'<td><span class="badge badge--'+badge+'">'+getStatusInfo(c.status).label+'</span></td>'
      +'<td style="text-align:center">'+acao+'</td></tr>';
  }).join('');
}
function renderPremioBaseTabela(){ const el=document.getElementById('premio-base-tbody'); if(el) el.innerHTML=_premioBaseRows(_premioBaseFiltrada()); }
async function premioReativarAfastado(id){
  const c=colaboradores.find(x=>x._id===id); if(!c) return;
  c.status='Trabalhando';
  try{ await fsSet('colaboradores',c._id,c); }catch(e){ toast('Erro: '+e.message,'error'); return; }
  toast((c.nome||'Colaborador')+' reativado (Trabalhando).','success');
  renderPremioWizard();
}
function premioNovaCompetencia(){
  premioState={passo:1,competencia:'',compLabel:'',baseAtualizada:false,fechado:false,afastados:[],apontamentos:[],tabela:[]};
  renderPremioWizard();
}

function premioIrPasso(n){
  premioState.passo = n;
  renderPremioWizard();
}

function premioIniciarApuracao(){
  const mes = document.getElementById('premio-mes')?.value;
  const ano = document.getElementById('premio-ano')?.value;
  if(!mes||!ano){toast('Selecione mes e ano','error');return;}
  const nomeMes = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][parseInt(mes)-1];
  premioState.competencia = String(mes).padStart(2,'0')+'/'+ano;
  premioState.compLabel = nomeMes+' '+ano;
  premioState.passo = 3;
  renderPremioWizard();
}

function premioConfirmarBase(){
  premioState.passo = 2;
  renderPremioWizard();
}

// ── Processar PDF de afastados (texto extraído ou xlsx) ──────────
async function processarAfastadosPremio(event){
  const file = event.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = async e => {
    let afastados = [];
    if(file.name.endsWith('.pdf')){
      // PDF lido como texto — extrair matrículas e nomes
      const text = e.target.result;
      const linhas = text.split('\n');
      const re = /(\d{4}\.\d{4})\s+([A-Z][A-Z\s]+?)\s+[\d.,]+\s+[A-Z]/;
      linhas.forEach(l=>{
        const m = l.match(/(\d{4})\.(\d{4})\s+(.+?)(?:\s+[\d.,]+\s)/);
        if(m){
          afastados.push({mat:m[1]+'.'+m[2], nome:m[3].trim()});
        }
      });
    } else {
      // Excel
      const wb = XLSX.read(e.target.result,{type:'binary'});
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1});
      data.forEach(row=>{
        if(row[0]&&String(row[0]).match(/\d{4}\.\d{4}/))
          afastados.push({mat:String(row[0]).trim(), nome:String(row[1]||'').trim()});
      });
    }

    // Atualizar status no Firebase
    if(afastados.length===0){
      document.getElementById('premio-afastados-preview').innerHTML=
        '<div class="alert alert-warning">Nenhum afastado identificado. Verifique o arquivo.</div>';
      return;
    }

    const b = window._writeBatch(window._db);
    let atualizados = 0;
    afastados.forEach(af=>{
      const mat = af.mat.replace('.','');
      // Tentar encontrar pelo formato completo ou só o número
      const c = colaboradores.find(x=>x.mat===af.mat||x.mat===mat||x.mat===af.mat.split('.')[0]+af.mat.split('.')[1]);
      if(c&&c.status==='Ativo'){
        c.status='Afastado';
        b.set(window._doc('colaboradores',c._id),c);
        atualizados++;
      }
    });
    await b.commit();

    premioState.afastados = afastados;
    premioState.baseAtualizada = true;
    document.getElementById('premio-afastados-preview').innerHTML=
      '<div class="alert alert-success"><strong>'+afastados.length+'</strong> afastados identificados. <strong>'+atualizados+'</strong> atualizados na base.</div>';
    const btn = document.getElementById('btn-passo1-ok');
    if(btn) btn.removeAttribute('disabled');
    event.target.value='';
  };
  if(file.name.endsWith('.pdf')) reader.readAsText(file);
  else reader.readAsBinaryString(file);
}

// ── Processar PDF de apuração ────────────────────────────────────
function processarApuracaoPremio(event){
  const file = event.target.files[0]; if(!file) return;
  const prev = document.getElementById('premio-apuracao-preview');
  prev.innerHTML='<div class="alert alert-info">Lendo PDF... aguarde.</div>';

  const reader = new FileReader();
  reader.onload = async e => {
    try{
      let textoCompleto = '';

      if(file.name.toLowerCase().endsWith('.pdf')){
        // Verificar se PDF.js esta disponivel
        if(!window.pdfjsLib){
          prev.innerHTML='<div class="alert alert-warning">PDF.js nao carregou. Recarregue a pagina e tente novamente.</div>';
          return;
        }
        const arrayBuf = e.target.result;
        const loadingTask = pdfjsLib.getDocument({data: new Uint8Array(arrayBuf)});
        const pdf = await loadingTask.promise;

        for(let p=1; p<=pdf.numPages; p++){
          const page = await pdf.getPage(p);
          const content = await page.getTextContent();
          // Juntar items mantendo espacamento
          const pageText = content.items.map(item=>item.str).join(' ');
          textoCompleto += pageText + '\n';
        }
      } else {
        // Excel
        const wb = XLSX.read(e.target.result,{type:'binary'});
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1});
        textoCompleto = data.map(r=>r.join(' ')).join('\n');
      }

      parsearApuracaoTexto(textoCompleto, prev);
    }catch(err){
      prev.innerHTML='<div class="alert alert-warning">Erro ao ler: '+err.message+'</div>';
      console.error('Erro PDF:', err);
    }
    event.target.value='';
  };

  if(file.name.toLowerCase().endsWith('.pdf'))
    reader.readAsArrayBuffer(file);
  else
    reader.readAsBinaryString(file);
}


function parsearApuracaoTexto(texto, prevEl){
  // Normalizar espacos
  texto = texto.replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();

  const resultado = {};
  const MAP = {'014':'atestado','015':'faltas','020':'aHoras','064':'aNoturno',
               '101':'saida','103':'atraso','107':'faltaParcial','108':'abono'};

  // Encontrar todas as matriculas e suas posicoes
  const reMAT = /\d{4}\.\d{4}/g;
  const posicoes = [];
  let m;
  while((m = reMAT.exec(texto)) !== null){
    posicoes.push({pos: m.index, mat: m[0]});
  }

  console.log('Matriculas encontradas:', posicoes.length);

  if(posicoes.length === 0){
    prevEl.innerHTML='<div class="alert alert-warning">PDF lido mas nenhuma matricula encontrada (formato XXXX.XXXX).</div>';
    return;
  }

  // Fatiar o texto entre posicoes de matriculas
  posicoes.forEach((item, i) => {
    const inicio = item.pos;
    const fim = i+1 < posicoes.length ? posicoes[i+1].pos : texto.length;
    const bloco = texto.substring(inicio, fim).trim();
    const mat = item.mat;

    // Extrair nome: texto entre a matricula e o primeiro codigo conhecido
    const reNome = new RegExp('^' + mat.replace('.', '\\.') + '\\s+(.+?)(?=\\s+(?:014|015|020|064|101|103|107|108)\\s)');
    const mNome = bloco.match(reNome);
    const nome = mNome ? mNome[1].trim() : bloco.substring(mat.length).split(/\d{3}\s/)[0].trim();

    if(!nome || nome.length < 2) return;

    if(!resultado[mat]){
      resultado[mat] = {
        mat,
        matNum: mat.replace('.',''),
        nome,
        atestado:0, faltas:0, aHoras:0, aNoturno:0,
        saida:0, atraso:0, faltaParcial:0, abono:0
      };
    }

    // Extrair apontamentos: codigo + tempo no formato DDD:DD
    const reApont = /\b(014|015|020|064|101|103|107|108)\b[^0-9]{0,50}?(\d{3}:\d{2})/g;
    let a;
    while((a = reApont.exec(bloco)) !== null){
      const campo = MAP[a[1]];
      const min = hhmm2min(a[2]);
      if(campo && min > 0){
        resultado[mat][campo] = (resultado[mat][campo]||0) + min;
      }
    }
  });

  const apontamentos = Object.values(resultado).filter(a => a.nome && a.nome.length > 1);
  console.log('Apontamentos processados:', apontamentos.length);
  if(apontamentos.length > 0){
    console.log('Exemplo:', apontamentos[0]);
  }

  if(apontamentos.length === 0){
    const amostra = texto.substring(0,600).replace(/</g,'&lt;').replace(/>/g,'&gt;');
    prevEl.innerHTML='<div class="alert alert-warning">Nao foi possivel identificar colaboradores.</div>'
      +'<div class="card"><div class="card-title" style="color:var(--red)">Texto extraido (debug):</div>'
      +'<pre style="font-size:10px;background:#F9FAFB;padding:10px;border-radius:6px;overflow:auto;max-height:200px;white-space:pre-wrap">'+amostra+'</pre></div>';
    return;
  }

  premioState.apontamentos = apontamentos;
  montarTabelaPremio();

  prevEl.innerHTML='<div class="alert alert-success" style="font-size:14px"><i class="ti ti-circle-check"></i> Apuração importada com sucesso — <strong>'+apontamentos.length+'</strong> colaboradores lidos e cruzados com a base ('+premioState.tabela.length+' na tabela).'
    +'<div style="margin-top:8px"><button class="btn btn-primary btn-sm" onclick="premioIrPasso(4)">Ir para a análise (Passo 4) <i class="ti ti-arrow-right"></i></button></div></div>';
  toast(apontamentos.length+' colaboradores lidos.','success');
}


function montarTabelaPremio(){
  // Cruzar apontamentos com base de colaboradores
  // Todos da base ativa + afastados são incluídos
  // Incluir apenas quem participa do premio (excluir Demitido e N/A)
  // Debug: contar quem tem premio=false
  const semPremio = colaboradores.filter(c=>c.elegibilidade?.premio===false);
  console.log('Colaboradores sem premio:', semPremio.length, semPremio.map(c=>c.nome));
  const base = colaboradores.filter(c=>
    c.status!=='Inativo' &&
    !STATUS_NAO_RECEBE.includes(c.status) &&
    c.elegibilidade?.premio!==false
  );
  console.log('Base para premio:', base.length);

  const tabela = base.map(c=>{
    // Normalizar status legado
    const statusNorm = c.status==='Ativo'?'Trabalhando':c.status;
    // Buscar apontamentos pelo número da matrícula
    const mat = c.mat||'';
    // Formato da matrícula na base: "10000990" ou "1000.0990"
    const apont = premioState.apontamentos.find(a=>{
      return a.mat===mat || a.matNum===mat ||
        a.mat===mat.substring(0,4)+'.'+mat.substring(4) ||
        a.matNum===mat.replace('.','');
    });

    // Situação para o prêmio — baseada no status do colaborador
    // elegibilidade.premio===true explícito sobrescreve regra de filtro SOC/PART
        // SOC/PART: só recebe se premio===true explícito (marcado manualmente)
    // MEI/OK/DUP: recebe por padrão (premio!==false)
    const ehSOC = c.filtro==='SOC'||c.filtro==='PART';
    const premioExplicito = ehSOC
      ? c.elegibilidade?.premio === true          // SOC precisa de marcação explícita
      : c.elegibilidade?.premio !== false;        // outros: padrão é receber
    let situacao = 'Trabalhando';
    if(c.elegibilidade?.premio===false){
      situacao = 'N/A';
    } else if(!premioExplicito && (STATUS_NAO_RECEBE.includes(statusNorm)||c.filtro==='SOC'||c.filtro==='PART')){
      situacao = 'N/A';
    } else if(STATUS_SO_CESTA.includes(statusNorm)){
      situacao = c.status;
    } else if(c.filtro==='MEI'){
      situacao = 'MEI';
    } else if(c.filtro==='DUP'){
      situacao = 'DUP';
    } else {
      situacao = statusNorm||'Trabalhando';
    }

    return {
      _id: c._id,
      mat: mat,
      empresa: _empresaKey(c),
      nome: c.nome,
      cpf: c.cpf||'',
      situacao,
      statusBase: statusNorm||'',
      filtro: c.filtro||'OK',
      // afastado que mantém o prêmio nesta competência (marcado na tela de afastamento)
      afastComPremio: Array.isArray(c.afastBen) && c.afastBen.includes('premio'),
      recebe: '',  // será preenchido ao aplicar regras
      valorPago: null,  // valor pago (null = valor padrão); alterável no passo 7
      atestado: apont?.atestado||0,
      faltas: apont?.faltas||0,
      aHoras: apont?.aHoras||0,
      aNoturno: apont?.aNoturno||0,
      saida: apont?.saida||0,
      atraso: apont?.atraso||0,
      faltaParcial: apont?.faltaParcial||0,
      abono: apont?.abono||0,
      editavel: false,
    };
  });

  premioState.tabela = tabela;
}

// ── Renderizar tabela de análise (Passo 4 e 5) ──────────────────
function renderPremioTabelaHTML(comRegras){
  const t = premioState.tabela;
  if(!t||!t.length) return '<div class="alert alert-warning">Nenhum dado. Volte ao Passo 3 e importe a apuração.</div>';
  const sim = t.filter(r=>r.recebe==='SIM').length;
  const nao = t.filter(r=>r.recebe==='NAO').length;
  const pend = t.filter(r=>!r.recebe).length;
  const n = comRegras?5:4;
  const titulo = comRegras?'Regras aplicadas':'Análise dos dados';
  const desc = comRegras
    ? 'Resultado das regras (recebe / não recebe). Ajuste manualmente se necessário e siga para a revisão dos MEI.'
    : 'Confira os apontamentos importados da Senior. Clique em <strong>Aplicar regras automáticas</strong> para calcular quem recebe o prêmio.';
  const acaoPrim = comRegras
    ? '<button class="btn btn-primary btn-sm" onclick="premioIrPasso(55)">Revisar MEI <i class="ti ti-arrow-right"></i></button>'
    : '<button class="btn btn-primary btn-sm" onclick="aplicarRegrasPremio()"><i class="ti ti-wand"></i> Aplicar regras automáticas</button>';
  return '<div class="lan-step">'
    + _premioHead(n,titulo,desc)
    + '<div class="stat-grid" style="margin-bottom:6px">'
      + _dsStat('user-check','success',sim,'Recebe')
      + _dsStat('user-x','danger',nao,'Não recebe')
      + _dsStat('clock','neutral',pend,'Pendente')
    + '</div>'
    + _premioFiltros('p5')
    + '<div class="tbl-wrap" style="max-height:520px"><table class="tbl"><thead><tr>'
      + '<th>Mat.</th><th>Nome</th><th>Empresa</th><th>Situação</th><th style="text-align:center">Recebe</th>'
      + '<th style="text-align:center">Atraso</th><th style="text-align:center">Saída</th><th style="text-align:center">Atestado</th><th style="text-align:center">At.Horas</th><th style="text-align:center">At.Not.</th><th style="text-align:center">Faltas</th><th style="text-align:center">Ft.Parc.</th><th style="text-align:center">Abono</th>'
      + '</tr></thead><tbody id="p5-tbody">'+renderPremioLinhas(t)+'</tbody></table></div>'
    + '<div class="lan-navbtns"><button class="btn btn-ghost btn-sm" onclick="premioIrPasso('+(comRegras?4:3)+')"><i class="ti ti-arrow-left"></i> Voltar</button>'+acaoPrim+'</div>'
    + '</div>';
}

function renderPremioLinhas(dados){
  const corCampo=(v,lim)=> v>lim?'color:var(--danger);font-weight:700':v>0?'color:var(--warning)':'color:var(--text-muted)';
  return dados.map(r=>{
    const idx = premioState.tabela.indexOf(r);
    const corRec = r.recebe==='SIM'?'var(--brand)':r.recebe==='NAO'?'var(--danger)':'var(--text-muted)';
    const sitBadge = r.situacao==='MEI'?'warning':r.situacao==='N/A'?'neutral':r.situacao==='Trabalhando'?'success':r.situacao==='DUP'?'purple':'accent';
    return '<tr>'
      + '<td><code style="font-size:10px">'+(r.mat||'—')+'</code></td>'
      + '<td style="font-weight:500">'+r.nome+'</td>'
      + '<td class="text-sm">'+(r.empresa||'—')+'</td>'
      + '<td><span class="badge badge--'+sitBadge+'">'+r.situacao+'</span></td>'
      + '<td style="text-align:center"><select onchange="editarRecebeRow('+idx+',this.value)" style="padding:3px 6px;border:1px solid var(--border);border-radius:4px;font-size:11px;font-weight:700;color:'+corRec+';background:transparent">'
        + '<option value=""'+(r.recebe===''?' selected':'')+'>—</option>'
        + '<option value="SIM"'+(r.recebe==='SIM'?' selected':'')+'>SIM</option>'
        + '<option value="NAO"'+(r.recebe==='NAO'?' selected':'')+'>NÃO</option>'
        + '</select></td>'
      + '<td style="text-align:center;'+corCampo(r.atraso,10)+'">'+min2str(r.atraso)+'</td>'
      + '<td style="text-align:center;'+corCampo(r.saida,10)+'">'+min2str(r.saida)+'</td>'
      + '<td style="text-align:center;'+corCampo(r.atestado,0)+'">'+min2str(r.atestado)+'</td>'
      + '<td style="text-align:center;'+corCampo(r.aHoras,0)+'">'+min2str(r.aHoras)+'</td>'
      + '<td style="text-align:center;'+corCampo(r.aNoturno,0)+'">'+min2str(r.aNoturno)+'</td>'
      + '<td style="text-align:center;'+corCampo(r.faltas,0)+'">'+min2str(r.faltas)+'</td>'
      + '<td style="text-align:center;'+corCampo(r.faltaParcial,0)+'">'+min2str(r.faltaParcial)+'</td>'
      + '<td style="text-align:center;'+corCampo(r.abono,59)+'">'+min2str(r.abono)+'</td>'
      + '</tr>';
  }).join('');
}

function filtrarTabelaPremio(){ p5Filtrar(); }


function atualizarMeiRow(sel){
  sel.style.color = sel.value==='SIM'?'var(--green)':'var(--red)';
  // Atualizar o resumo
  const meis = premioState.tabela.filter(r=>r.situacao==='MEI');
  const sim = meis.filter(r=>r.recebe==='SIM').length;
  const nao = meis.filter(r=>r.recebe==='NAO').length;
  // Tentar atualizar o resumo na tela
  const resumo = document.querySelector('[data-mei-resumo]');
  if(resumo) resumo.textContent = sim+' MEI receberao ('+brl(sim*PREMIO_VAL)+') | '+nao+' nao receberao';
}

function editarRecebeRow(idx, valor){
  if(premioState.tabela[idx]) premioState.tabela[idx].recebe = valor;
}

function aplicarRegrasPremio(){
  premioState.tabela = premioState.tabela.map(r=>{
    let recebe = 'SIM';
    let motivo = '';

    // Nao recebe automaticamente
    // NAO: N/A, afastados de qualquer tipo, ou status base que indica afastamento
    const statusBaseNAO = STATUS_NAO_RECEBE.includes(r.statusBase)||r.statusBase==='Inativo';
    const statusBaseCesta = STATUS_SO_CESTA.includes(r.statusBase);
    // Afastado mantém o prêmio se foi marcado na tela de afastamento
    const ehAfastSit = statusBaseCesta || STATUS_SO_CESTA.some(s=>r.situacao===s);
    if(r.situacao==='N/A'||statusBaseNAO||r.situacao==='Demitido'||(ehAfastSit && !r.afastComPremio)){
      recebe='NAO'; motivo='Situacao: '+r.situacao;
    } else if(r.atestado>0){
      recebe='NAO'; motivo='Atestado';
    } else if(r.aHoras>0){
      recebe='NAO'; motivo='Atestado Horas';
    } else if(r.aNoturno>0){
      recebe='NAO'; motivo='Atestado Noturno';
    } else if((r.faltas>0||r.faltaParcial>0) && r.situacao!=='MEI'){
      recebe='NAO'; motivo=r.faltas>0?'Faltas':'Falta Parcial';
    } else if(r.abono>=60){
      recebe='NAO'; motivo='Abono >= 1h';
    } else if(r.atraso>10){
      recebe='NAO'; motivo='Atraso '+min2str(r.atraso);
    } else if(r.saida>10){
      recebe='NAO'; motivo='Saida antecip. '+min2str(r.saida);
    }

    return {...r, recebe, motivo};
  });

  premioState.passo = 5;
  renderPremioWizard();
  toast('Regras aplicadas com sucesso!','success');
}


function exportarDiagnosticoPremio(){
  if(!premioState.tabela.length){toast('Nenhum dado','error');return;}
  // Mostrar apenas os SIM para verificação
  const sim = premioState.tabela.filter(r=>r.recebe==='SIM');
  const rows=[
    ['Matricula','Nome','CPF','Situacao','Status na Base','Filtro',
     'Atraso','Saida Ant.','Atestado','Ates.Horas','Ates.Not.','Faltas','Abono','Recebe'],
    ...premioState.tabela.map(r=>[
      r.mat,r.nome,r.cpf,r.situacao,r.statusBase||'',r.filtro||'',
      min2str(r.atraso),min2str(r.saida),min2str(r.atestado),
      min2str(r.aHoras),min2str(r.aNoturno),min2str(r.faltas),min2str(r.abono),
      r.recebe||'pendente'
    ])
  ];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Diagnostico');
  XLSX.writeFile(wb,'Premio_Diagnostico_'+premioState.competencia.replace('/','_')+'.xlsx');
  toast('Diagnostico exportado!','success');
}

function exportarPremioCaju(){
  const sim = premioState.tabela.filter(r=>r.recebe==='SIM');
  if(sim.length===0){toast('Nenhum colaborador elegivel','error');return;}
  const NL2=String.fromCharCode(10);
  const header='CPF;Matricula (opcional);Valor Fixo em Auxilio Alimentacao;Mobilidade;Valor Fixo em Mobilidade;Cultura;Valor Fixo em Cultura;Saude;Valor Fixo em Saude;Educacao;Valor Fixo em Educacao;Home Office;Valor Fixo em Home Office';
  const linhas=[header];
  sim.forEach(r=>{
    const cpf=(r.cpf||'').replace(/[^0-9]/g,'').padStart(11,'0');
    const val=_premioValorDe(r);
    linhas.push([cpf,r.mat||'',val.toFixed(2),'0','0','0','0','0','0','0','0','0','0'].join(';'));
  });
  const blob=new Blob([linhas.join(NL2)],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download='Premio_Assiduidade_Caju_'+premioState.competencia.replace('/','_')+'.csv';
  a.click(); URL.revokeObjectURL(url);
  toast('CSV Caju exportado: '+sim.length+' colaboradores','success');
}

function exportarPremioExcel(){
  if(!premioState.tabela.length){toast('Nenhum dado','error');return;}
  const rows=[
    ['Competencia: '+premioState.competencia],
    ['Matricula','Nome','CPF','Situacao','Recebe','Atraso','Saida Antec.','Atestado','Ates.Horas','Ates.Not.','Faltas','Ft.Parcial','Abono','Valor'],
    ...premioState.tabela.map(r=>[r.mat,r.nome,r.cpf,r.situacao,r.recebe,
      min2str(r.atraso),min2str(r.saida),min2str(r.atestado),min2str(r.aHoras),
      min2str(r.aNoturno),min2str(r.faltas),min2str(r.faltaParcial),min2str(r.abono),
      r.recebe==='SIM'?PREMIO_VAL:0])
  ];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Premio Assiduidade');
  XLSX.writeFile(wb,'Premio_Assiduidade_'+premioState.competencia.replace('/','_')+'.xlsx');
  toast('Excel exportado!','success');
}

async function fecharCompetencionPremio(){
  if(!premioState.tabela.length){toast('Nenhum dado para fechar','error');return;}
  const sim=premioState.tabela.filter(r=>r.recebe==='SIM');
  // Alterações de valor (retroativo) exigem justificativa
  const alteracoes=sim.filter(r=>r.valorPago!=null && r.valorPago!=='' && Math.abs(fnum(r.valorPago)-PREMIO_VAL)>0.001)
    .map(r=>({mat:r.mat,nome:r.nome,de:PREMIO_VAL,para:fnum(r.valorPago)}));
  const justif=(document.getElementById('p7-justif')?.value||'').trim();
  if(alteracoes.length && !justif){
    toast('Há '+alteracoes.length+' valor(es) alterado(s). Informe a justificativa para gravar no histórico.','warning');
    document.getElementById('p7-justif')?.focus();
    return;
  }
  const valorTotal=sim.reduce((s,r)=>s+_premioValorDe(r),0);
  const snap={
    competencia:premioState.competencia,
    modulo:'premio',
    fechadoEm:new Date().toISOString(),
    fechadoPor:(usuarioAtual&&(usuarioAtual.email||usuarioAtual.nome))||'',
    totalColaboradores:premioState.tabela.length,
    totalElegiveis:sim.length,
    totalNaoElegiveis:premioState.tabela.filter(r=>r.recebe==='NAO').length,
    valorPadrao:PREMIO_VAL,
    valorTotal,
    alteracoes,
    justificativa:justif,
    detalhes:premioState.tabela,
  };
  try{
    await fsSet('historico','premio_'+premioState.competencia.replace('/','_'),snap);
    premioState.fechado=true;
    toast('Competência '+premioState.competencia+' fechada e salva no Histórico!','success');
    renderPremioWizard();
  }catch(e){toast('Erro: '+e.message,'error');}
}

// ================================================================
// ATUALIZAÇÃO MENSAL DA BASE — Excel da Senior
// ================================================================

// ================================================================
// DASHBOARD — PRÊMIO DE ASSIDUIDADE
// Reproduz o relatório mensal/comparativo (mesma identidade visual).
// Fonte de dados: entrada manual persistida em 'premioDados' (id MM_YYYY)
// + competências fechadas do wizard (historico premio_*). Gráficos em SVG.
// ================================================================
const PC={GREEN:'#1D9E75',GREEN_DARK:'#085041',GREEN_BG:'#E1F5EE',ORANGE:'#D85A30',RED_DARK:'#993C1D',BLUE:'#378ADD',GRAY:'#888780',PURPLE:'#534AB7',PINK:'#D4537E',AMBER:'#BA7517',RED:'#E24B4A',TEXT:'#2C2C2A',MUTED:'#888780',LGRAY:'#F1EFE8',MGRAY:'#D3D1C7'};
const _P=(n,t)=>t>0?Math.round(n/t*100):0;
const _num=v=>{const n=Number(String(v==null?'':v).replace(/[^\d.-]/g,''));return isNaN(n)?0:n;};
const _brl0=n=>'R$ '+Math.round(n).toLocaleString('pt-BR');

let premioDadosList=[];              // registros de premioDados + snapshots fechados
let premioDashView='mensal';         // 'mensal' | 'comparativo' | 'entrada'

// Garante o CSS de impressão (1 página A4, só o dashboard) — injetado via JS.
function ensurePremioPrintCSS(){
  if(document.getElementById('premio-print-css')) return;
  const st=document.createElement('style'); st.id='premio-print-css';
  st.textContent='@media print{body *{visibility:hidden!important}'
    +'#premio-print-area,#premio-print-area *{visibility:visible!important}'
    +'#premio-print-area{position:absolute;left:0;top:0;width:100%;padding:0;margin:0}'
    +'.no-print{display:none!important}@page{size:A4;margin:10mm}}';
  document.head.appendChild(st);
}

// Ordena competências MM/YYYY desc
function _compKey(c){ const m=String(c||'').match(/(\d{1,2})\/(\d{4})/); return m?(+m[2]*100+ +m[1]):0; }

async function carregarPremioDados(){
  const map={};
  // 1) entrada manual (premioDados)
  try{ const s=await window._getDocs(window._col('premioDados')); s.forEach(d=>{ const x=d.data(); map[x.competencia]=_premioNormalizar(x); }); }catch(e){}
  // 2) competências fechadas do wizard (historico premio_*) — não sobrescreve a manual
  try{ const s=await window._getDocs(window._col('historico')); s.forEach(d=>{ if(d.id.startsWith('premio_')){ const x=d.data(); if(x.competencia && !map[x.competencia]) map[x.competencia]=_premioAggSnap(x); } }); }catch(e){}
  premioDadosList=Object.values(map).sort((a,b)=>_compKey(b.competencia)-_compKey(a.competencia));
}

// Normaliza um registro de premioDados (garante campos)
function _premioNormalizar(x){
  const ex=x.excecoes||{};
  const fx=k=>({atraso:_num((ex[k]||{}).atraso),saida:_num((ex[k]||{}).saida)});
  return {
    competencia:x.competencia, compLabel:x.compLabel||x.competencia, periodo:x.periodo||'',
    valor:_num(x.valor)||226, fonte:x.fonte||'manual',
    total:_num(x.total), receberam:_num(x.receberam), naoReceberam:_num(x.naoReceberam),
    afastados:_num(x.afastados), naoAplica:_num(x.naoAplica), montante:_num(x.montante),
    causas:{atestado:_num((x.causas||{}).atestado),faltas:_num((x.causas||{}).faltas),atraso:_num((x.causas||{}).atraso),saida:_num((x.causas||{}).saida),abono:_num((x.causas||{}).abono),outros:_num((x.causas||{}).outros)},
    criterioAtraso:_num(x.criterioAtraso)||10, criterioSaida:_num(x.criterioSaida)||10,
    excecoes:{f10_30:fx('f10_30'),f30_60:fx('f30_60'),f1_2h:fx('f1_2h'),f2h:fx('f2h')},
  };
}

// Montante: usa o valor pago explícito (ex.: retroativo no Caju) ou receberam × valor
function _montanteOf(d){ return d.montante>0 ? d.montante : d.receberam*(d.valor||226); }

// Rótulo do critério em minutos → ">10min", ">1h", ">1h30min"
function _critLbl(prefix,min){
  min=_num(min)||10; let t;
  if(min<60) t='>'+min+'min';
  else { const h=Math.floor(min/60), r=min%60; t='>'+h+'h'+(r?r+'min':''); }
  return prefix+' '+t;
}

// Deriva a agregação a partir de um snapshot fechado do wizard (detalhes por colaborador)
function _premioAggSnap(snap){
  const det=Array.isArray(snap.detalhes)?snap.detalhes:[];
  // Fechamento com agregados já gravados (log manual, sem detalhes por colaborador)
  if(!det.length && snap.receberam!=null){
    const comp0=snap.competencia; const mm=String(comp0).match(/(\d{1,2})\/(\d{4})/);
    return _premioNormalizar(Object.assign({}, snap, {fonte:'apuracao',
      compLabel:snap.compLabel||(mm?MESES_FER[(+mm[1])-1]+' '+mm[2]:comp0),
      periodo:snap.periodo||_premioPeriodo(comp0)}));
  }
  const soCesta=(typeof STATUS_SO_CESTA!=='undefined')?STATUS_SO_CESTA:[];
  let receberam=0,naoReceberam=0,afastados=0,naoAplica=0;
  const causas={atestado:0,faltas:0,atraso:0,saida:0,abono:0,outros:0};
  const ex={f10_30:{atraso:0,saida:0},f30_60:{atraso:0,saida:0},f1_2h:{atraso:0,saida:0},f2h:{atraso:0,saida:0}};
  const faixa=m=>m<=30?'f10_30':m<=60?'f30_60':m<=120?'f1_2h':'f2h';
  det.forEach(r=>{
    const sit=r.situacao||'';
    if(sit==='N/A'){ naoAplica++; return; }
    if(soCesta.includes(sit)){ afastados++; return; }
    const atr=_num(r.atraso), sai=_num(r.saida), abo=_num(r.abono);
    const temAtest=_num(r.atestado)>0||_num(r.aNoturno)>0||_num(r.aHoras)>0;
    const temFalta=_num(r.faltas)>0||_num(r.faltaParcial)>0;
    if(r.recebe==='SIM'){
      receberam++;
      if(atr>10){ ex[faixa(atr)].atraso++; }   // exceção: recebeu apesar do atraso
      if(sai>10){ ex[faixa(sai)].saida++; }
      return;
    }
    // não recebeu — causa primária por prioridade
    naoReceberam++;
    if(temAtest) causas.atestado++;
    else if(temFalta) causas.faltas++;
    else if(atr>10) causas.atraso++;
    else if(sai>10) causas.saida++;
    else if(abo>=60) causas.abono++;
    else causas.outros++;
  });
  const comp=snap.competencia; const m=String(comp).match(/(\d{1,2})\/(\d{4})/);
  const nome=m?MESES_FER[(+m[1])-1]+' '+m[2]:comp;
  return {competencia:comp,compLabel:nome,periodo:_premioPeriodo(comp),valor:226,fonte:'apuracao',montante:0,
    total:det.length,receberam,naoReceberam,afastados,naoAplica,causas,criterioAtraso:10,criterioSaida:10,excecoes:ex};
}

// Período 21 do mês anterior a 20 do mês da competência
function _premioPeriodo(comp){
  const m=String(comp).match(/(\d{1,2})\/(\d{4})/); if(!m) return '';
  let mm=+m[1], yy=+m[2]; let pm=mm-1, py=yy; if(pm<1){pm=12;py--;}
  const p=n=>String(n).padStart(2,'0');
  return '21/'+p(pm)+'/'+py+' – 20/'+p(mm)+'/'+yy;
}

// ── Página ───────────────────────────────────────────────────────
function pgPremioDashboard(){
  return `
    <div class="page-header no-print"><h2>Dashboard — Prêmio de Assiduidade</h2>
      <p>Painel mensal e comparativo no padrão do relatório. Valor do benefício: R$ 226,00.</p></div>
    <div class="no-print" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px">
      <div style="display:flex;gap:4px;background:var(--surface2);padding:4px;border-radius:10px">
        <button class="btn btn-sm" id="pdv-mensal" onclick="setPremioView('mensal')">Mensal</button>
        <button class="btn btn-sm" id="pdv-comparativo" onclick="setPremioView('comparativo')">Comparativo</button>
        <button class="btn btn-sm" id="pdv-entrada" onclick="setPremioView('entrada')">Entrada de dados</button>
      </div>
      <div id="premio-dash-controls" style="flex:1;display:flex;gap:8px;flex-wrap:wrap;align-items:center"></div>
      <button class="btn btn-ghost btn-sm" onclick="printPremioDash()">🖨️ Imprimir / PDF</button>
    </div>
    <div id="premio-dash-body"><div class="alert alert-info">Carregando...</div></div>`;
}

async function afterRenderPremioDash(){
  ensurePremioPrintCSS();
  await carregarPremioDados();
  setPremioView(premioDadosList.length?'mensal':'entrada');
}

function setPremioView(v){
  premioDashView=v;
  ['mensal','comparativo','entrada'].forEach(k=>{
    const b=document.getElementById('pdv-'+k); if(b){ b.className='btn btn-sm'+(k===v?' btn-primary':' btn-ghost'); }
  });
  renderPremioControls();
  renderPremioDashBody();
}

function renderPremioControls(){
  const el=document.getElementById('premio-dash-controls'); if(!el) return;
  const opts=(sel)=>premioDadosList.map(d=>'<option value="'+d.competencia+'"'+(d.competencia===sel?' selected':'')+'>'+d.compLabel+(d.fonte==='apuracao'?' (apuração)':'')+'</option>').join('');
  if(premioDashView==='mensal'){
    if(!premioDadosList.length){ el.innerHTML=''; return; }
    el.innerHTML='<label style="font-size:12px;color:var(--text2)">Competência</label>'
      +'<select id="pd-sel-a" onchange="renderPremioDashBody()" style="padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:13px">'+opts(premioDadosList[0].competencia)+'</select>';
  }else if(premioDashView==='comparativo'){
    if(premioDadosList.length<2){ el.innerHTML='<span class="text-xs text-muted">Precisa de pelo menos 2 competências salvas.</span>'; return; }
    const asc=premioDadosList.slice().sort((a,b)=>_compKey(a.competencia)-_compKey(b.competencia));
    const optAsc=(sel)=>asc.map(d=>'<option value="'+d.competencia+'"'+(d.competencia===sel?' selected':'')+'>'+d.compLabel+'</option>').join('');
    const sty='padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:13px';
    el.innerHTML='<label style="font-size:12px;color:var(--text2)">Período de</label>'
      +'<select id="pd-sel-de" onchange="renderPremioDashBody()" style="'+sty+'">'+optAsc(asc[0].competencia)+'</select>'
      +'<label style="font-size:12px;color:var(--text2)">até</label>'
      +'<select id="pd-sel-ate" onchange="renderPremioDashBody()" style="'+sty+'">'+optAsc(asc[asc.length-1].competencia)+'</select>';
  }else{ el.innerHTML=''; }
}

function _findComp(c){ return premioDadosList.find(d=>d.competencia===c); }

function renderPremioDashBody(){
  const el=document.getElementById('premio-dash-body'); if(!el) return;
  if(premioDashView==='entrada'){ el.innerHTML=renderPremioEntrada(); return; }
  if(!premioDadosList.length){ el.innerHTML='<div class="alert alert-info">Nenhuma competência ainda. Vá em <strong>Entrada de dados</strong> para adicionar (ou use o botão de exemplo).</div>'; return; }
  if(premioDashView==='comparativo'){
    if(premioDadosList.length<2){ el.innerHTML='<div class="alert alert-warning">Salve pelo menos 2 competências para comparar.</div>'; return; }
    const asc=premioDadosList.slice().sort((a,b)=>_compKey(a.competencia)-_compKey(b.competencia));
    let de=_compKey(document.getElementById('pd-sel-de')?.value||asc[0].competencia);
    let ate=_compKey(document.getElementById('pd-sel-ate')?.value||asc[asc.length-1].competencia);
    if(de>ate){ const t=de; de=ate; ate=t; }
    const months=asc.filter(d=>{const k=_compKey(d.competencia); return k>=de&&k<=ate;});
    if(months.length<2){ el.innerHTML='<div class="alert alert-warning">Selecione um intervalo com pelo menos 2 competências.</div>'; return; }
    el.innerHTML='<div id="premio-print-area">'+renderPremioComparativo(months)+'</div>';
    return;
  }
  const d=_findComp(document.getElementById('pd-sel-a')?.value)||premioDadosList[0];
  el.innerHTML='<div id="premio-print-area">'+renderPremioMensal(d)+'</div>';
}

// ── Helpers de UI ────────────────────────────────────────────────
function _kpi(label,val,valColor,sub,bg){
  return '<div style="flex:1;min-width:110px;background:'+(bg||PC.LGRAY)+';border-radius:10px;padding:12px 14px">'
    +'<div style="font-size:10.5px;color:'+PC.MUTED+';text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">'+label+'</div>'
    +'<div style="font-size:23px;font-weight:800;color:'+(valColor||PC.TEXT)+';line-height:1">'+val+'</div>'
    +(sub?'<div style="font-size:11px;color:'+PC.MUTED+';margin-top:4px">'+sub+'</div>':'')+'</div>';
}
function _legenda(items){
  return '<div style="display:flex;flex-direction:column;gap:4px">'+items.filter(i=>i.val>0||i.always).map(i=>
    '<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:#5F5E5A"><span style="width:10px;height:10px;border-radius:2px;background:'+i.color+';display:inline-block;flex:none"></span>'+i.label+' — <strong>'+i.val+'</strong>'+(i.pct!=null?' ('+i.pct+'%)':'')+'</div>').join('')+'</div>';
}
function _card(titulo,inner){
  return '<div style="background:var(--surface);border:1px solid '+PC.MGRAY+';border-radius:12px;padding:14px 16px">'
    +(titulo?'<div style="font-size:12px;font-weight:700;color:'+PC.TEXT+';margin-bottom:10px">'+titulo+'</div>':'')+inner+'</div>';
}

// Donut SVG com números brancos nas fatias e total no centro
function _svgDonut(segs, centerNum, centerLbl, size){
  size=size||150; const R=size/2, cx=R, cy=R, hole=R*0.62, lblR=R*0.81;
  const total=segs.reduce((s,x)=>s+x.value,0)||1; let ang=-90;
  let body='';
  segs.forEach(s=>{
    if(s.value<=0) return;
    const sweep=s.value/total*360;
    const a0=ang*Math.PI/180, a1=(ang+sweep)*Math.PI/180;
    const x0=cx+R*Math.cos(a0), y0=cy+R*Math.sin(a0);
    const x1=cx+R*Math.cos(a1), y1=cy+R*Math.sin(a1);
    const large=sweep>180?1:0;
    body+='<path d="M '+cx+' '+cy+' L '+x0.toFixed(2)+' '+y0.toFixed(2)+' A '+R+' '+R+' 0 '+large+' 1 '+x1.toFixed(2)+' '+y1.toFixed(2)+' Z" fill="'+s.color+'"/>';
    if(s.value/total*100>=4){
      const mid=(ang+sweep/2)*Math.PI/180; const lx=cx+lblR*Math.cos(mid), ly=cy+lblR*Math.sin(mid);
      body+='<text x="'+lx.toFixed(2)+'" y="'+ly.toFixed(2)+'" text-anchor="middle" dominant-baseline="central" font-size="'+(size*0.093).toFixed(1)+'" font-weight="700" fill="#fff">'+s.value+'</text>';
    }
    ang+=sweep;
  });
  body+='<circle cx="'+cx+'" cy="'+cy+'" r="'+hole.toFixed(1)+'" fill="#fff"/>';
  body+='<text x="'+cx+'" y="'+(cy-2)+'" text-anchor="middle" dominant-baseline="central" font-size="'+(size*0.17).toFixed(1)+'" font-weight="800" fill="'+PC.TEXT+'">'+centerNum+'</text>';
  body+='<text x="'+cx+'" y="'+(cy+size*0.13)+'" text-anchor="middle" font-size="'+(size*0.078).toFixed(1)+'" fill="'+PC.MUTED+'">'+centerLbl+'</text>';
  return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'">'+body+'</svg>';
}

// Barras verticais agrupadas (2 séries). cats:[], sa/sb:[], sufixo p/ rótulo topo opcional
function _svgBarsAgrupadas(cats, sa, sb, corA, corB, sufixo){
  const w=Math.max(300, cats.length*54), h=180, pad={l:8,r:8,t:10,b:44};
  const iw=w-pad.l-pad.r, ih=h-pad.t-pad.b; const max=Math.max(1,...sa,...sb);
  const gw=iw/cats.length, bw=Math.min(20, gw*0.34);
  let body='';
  cats.forEach((c,i)=>{
    const gx=pad.l+gw*i+gw/2;
    [[sa[i],corA,-1],[sb[i],corB,1]].forEach(([v,col,side])=>{
      const bh=Math.max(0,(v/max)*ih); const x=gx+(side<0?-bw-1:1); const y=pad.t+ih-bh;
      body+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw+'" height="'+bh.toFixed(1)+'" rx="2" fill="'+col+'"/>';
      if(v>0){ const inside=bh>16; const ty=inside?(y+bh/2):(y-4);
        body+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+ty.toFixed(1)+'" text-anchor="middle" dominant-baseline="central" font-size="9" font-weight="700" fill="'+(inside?'#fff':PC.TEXT)+'">'+(v+(sufixo||''))+'</text>'; }
    });
    // rótulo categoria (rotacionado)
    body+='<text x="'+gx.toFixed(1)+'" y="'+(pad.t+ih+8)+'" text-anchor="end" font-size="8.5" fill="#5F5E5A" transform="rotate(-32 '+gx.toFixed(1)+' '+(pad.t+ih+8)+')">'+c+'</text>';
  });
  return '<svg width="100%" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="xMidYMid meet" style="max-width:'+w+'px">'+body+'</svg>';
}

// Barras empilhadas por faixa (Atraso + Saída)
function _svgBarsEmpilhadas(cats, atrasos, saidas){
  const w=320,h=170,pad={l:8,r:8,t:10,b:34}; const iw=w-pad.l-pad.r, ih=h-pad.t-pad.b;
  const tot=cats.map((_,i)=>atrasos[i]+saidas[i]); const max=Math.max(1,...tot);
  const gw=iw/cats.length, bw=Math.min(34, gw*0.5);
  let body='';
  cats.forEach((c,i)=>{
    const gx=pad.l+gw*i+gw/2; const x=gx-bw/2; let yb=pad.t+ih;
    [[atrasos[i],PC.AMBER],[saidas[i],PC.ORANGE]].forEach(([v,col])=>{
      if(v<=0) return; const bh=(v/max)*ih; yb-=bh;
      body+='<rect x="'+x.toFixed(1)+'" y="'+yb.toFixed(1)+'" width="'+bw+'" height="'+bh.toFixed(1)+'" fill="'+col+'"/>';
      if(bh>13) body+='<text x="'+gx.toFixed(1)+'" y="'+(yb+bh/2).toFixed(1)+'" text-anchor="middle" dominant-baseline="central" font-size="9" font-weight="700" fill="#fff">'+v+'</text>';
    });
    body+='<text x="'+gx.toFixed(1)+'" y="'+(pad.t+ih+14)+'" text-anchor="middle" font-size="8.5" fill="#5F5E5A">'+c+'</text>';
  });
  return '<svg width="100%" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="xMidYMid meet" style="max-width:'+w+'px">'+body+'</svg>';
}

// ── Relatório MENSAL ─────────────────────────────────────────────
function renderPremioMensal(d){
  const total=d.total, receb=d.receberam, naoReceb=d.naoReceberam, afast=d.afastados, na=d.naoAplica;
  const valor=d.valor||226, montante=_montanteOf(d), excl=naoReceb+afast+na;
  const c=d.causas;
  const cab='<div style="margin-bottom:14px"><div style="font-size:19px;font-weight:800;color:'+PC.TEXT+'">Premiação por Assiduidade — '+d.compLabel+'</div>'
    +'<div style="font-size:12px;color:'+PC.MUTED+'">Udiaco Comércio e Ind. de Ferro e Aço'+(d.periodo?' · Período: '+d.periodo:'')+'</div></div>';
  const kpis='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">'
    +_kpi('Total de colaboradores',total,PC.TEXT,'')
    +_kpi('Receberam',receb,PC.GREEN,_P(receb,total)+'%')
    +_kpi('Não receberam',naoReceb,PC.ORANGE,_P(naoReceb,total)+'%')
    +_kpi('Afastados / N/A',afast+' / '+na,PC.BLUE,_P(afast,total)+'% / '+_P(na,total)+'%')
    +_kpi('Montante pago',_brl0(montante),PC.GREEN_DARK,receb+' × '+_brl0(valor)+((d.montante>0&&d.montante!==receb*valor)?' + ajuste':''),PC.GREEN_BG)
    +'</div>';
  // Donut distribuição
  const seg1=[{value:receb,color:PC.GREEN,label:'Receberam'},{value:naoReceb,color:PC.ORANGE,label:'Não receberam'},{value:afast,color:PC.BLUE,label:'Afastados'},{value:na,color:PC.GRAY,label:'Não se aplica'}];
  const leg1=_legenda(seg1.map(s=>({color:s.color,label:s.label,val:s.value,pct:_P(s.value,total)})));
  const g1=_card('Distribuição geral','<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">'+_svgDonut(seg1,total,'total',150)+'<div style="flex:1;min-width:150px">'+leg1+'</div></div>');
  // Donut causas
  const seg2=[{value:c.atestado,color:PC.PURPLE,label:'Atestado'},{value:c.faltas,color:PC.PINK,label:'Faltas'},{value:c.atraso,color:PC.AMBER,label:_critLbl('Atraso',d.criterioAtraso)},{value:c.saida,color:PC.ORANGE,label:_critLbl('Saída ant.',d.criterioSaida)},{value:c.abono,color:PC.RED_DARK,label:'Abono ≥1h'},{value:c.outros||0,color:'#A8A69E',label:'Outros'},{value:afast,color:PC.BLUE,label:'Afastados'},{value:na,color:PC.GRAY,label:'Não se aplica'}];
  const leg2=_legenda(seg2.map(s=>({color:s.color,label:s.label,val:s.value,pct:_P(s.value,excl)})));
  const g2=_card('Motivos de não recebimento','<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">'+_svgDonut(seg2,excl,'excluídos',150)+'<div style="flex:1;min-width:150px">'+leg2+'</div></div>');
  const graficos='<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">'+g1+g2+'</div>';
  // Exceções
  let exSec='';
  const ex=d.excecoes; const faixas=[['f10_30','10–30min',PC.GREEN],['f30_60','30–60min',PC.AMBER],['f1_2h','1h–2h',PC.ORANGE],['f2h','acima 2h',PC.RED_DARK]];
  const exTot=faixas.reduce((s,[k])=>s+ex[k].atraso+ex[k].saida,0);
  if(exTot>0){
    const minis='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'+faixas.map(([k,lbl,col])=>{
      const v=ex[k].atraso+ex[k].saida;
      return '<div style="flex:1;min-width:90px;border-top:3px solid '+col+';background:'+PC.LGRAY+';border-radius:0 0 8px 8px;padding:8px 10px"><div style="font-size:10px;color:'+PC.MUTED+'">'+lbl+'</div><div style="font-size:20px;font-weight:800;color:'+PC.TEXT+'">'+v+'</div></div>';
    }).join('')+'</div>';
    const segF=faixas.map(([k,lbl,col])=>({value:ex[k].atraso+ex[k].saida,color:col,label:lbl}));
    const dF=_svgDonut(segF,exTot,'exceções',140);
    const bF=_svgBarsEmpilhadas(faixas.map(f=>f[1]),faixas.map(f=>ex[f[0]].atraso),faixas.map(f=>ex[f[0]].saida));
    const legTipo='<div style="display:flex;gap:14px;font-size:11px;color:#5F5E5A;margin-top:4px"><span><span style="display:inline-block;width:10px;height:10px;background:'+PC.AMBER+';border-radius:2px"></span> Atraso</span><span><span style="display:inline-block;width:10px;height:10px;background:'+PC.ORANGE+';border-radius:2px"></span> Saída antecipada</span></div>';
    exSec=_card('Exceções aplicadas este mês','<div style="font-size:12px;color:#5F5E5A;margin-bottom:10px">'+exTot+' colaborador(es) receberam o benefício mesmo com atraso/saída acima de 10 min, por decisão da gestão.</div>'+minis+'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:center">'+dF+'<div>'+bF+legTipo+'</div></div>');
    exSec='<div style="margin-bottom:16px">'+exSec+'</div>';
  }
  // Regra oficial
  const impeditivos=['Qualquer atestado (diurno, noturno ou horas)','Faltas injustificadas','Atraso acima de 10 minutos','Saída antecipada acima de 10 minutos','Afastamento INSS','Abono gestor igual ou acima de 1 hora'];
  const colE='<div><div style="font-size:12px;font-weight:700;color:'+PC.TEXT+';margin-bottom:8px">Critérios impeditivos</div>'+impeditivos.map(t=>'<div style="font-size:11.5px;color:#5F5E5A;margin-bottom:4px"><span style="color:'+PC.RED+';font-weight:700">✗</span> '+t+'</div>').join('')+'</div>';
  const colD='<div><div style="font-size:12px;font-weight:700;color:'+PC.TEXT+';margin-bottom:8px">Leitura dos dados</div>'+_leituraMensal(d).map(b=>'<div style="font-size:11.5px;color:#5F5E5A;margin-bottom:5px">• '+b+'</div>').join('')+'</div>';
  const regra=_card('Regra oficial','<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">'+colE+colD+'</div>');
  const rodape='<div style="margin-top:14px;text-align:right;font-size:10.5px;color:'+PC.MUTED+'">Valor do benefício: '+_brl0(valor)+' por colaborador · Total pago: '+_brl0(montante)+(d.periodo?' · Período: '+d.periodo:'')+'</div>';
  return '<div style="max-width:900px">'+cab+kpis+graficos+exSec+regra+rodape+'</div>';
}

function _leituraMensal(d){
  const c=d.causas, total=d.total, excl=d.naoReceberam+d.afastados+d.naoAplica;
  const cand=[['Atestado',c.atestado],['Faltas',c.faltas],[_critLbl('Atraso',d.criterioAtraso),c.atraso],[_critLbl('Saída antecipada',d.criterioSaida),c.saida],['Abono gestor ≥1h',c.abono],['Outros',c.outros||0],['Afastamentos',d.afastados],['Não se aplica',d.naoAplica]];
  cand.sort((a,b)=>b[1]-a[1]);
  const out=[];
  out.push('Taxa de recebimento: <strong>'+_P(d.receberam,total)+'%</strong> ('+d.receberam+' de '+total+').');
  if(cand[0][1]>0) out.push('Principal causa de exclusão: <strong>'+cand[0][0]+'</strong> ('+cand[0][1]+' casos, '+_P(cand[0][1],excl)+'% das exclusões).');
  if(cand[1] && cand[1][1]>0) out.push('Segunda causa: '+cand[1][0]+' ('+cand[1][1]+' casos).');
  const ex=d.excecoes; const exTot=['f10_30','f30_60','f1_2h','f2h'].reduce((s,k)=>s+ex[k].atraso+ex[k].saida,0);
  out.push(exTot>0?('Exceções concedidas pela gestão: <strong>'+exTot+'</strong> colaborador(es).'):'Nenhuma exceção concedida neste mês.');
  return out;
}

// ── Relatório COMPARATIVO ────────────────────────────────────────
function _kpiCmp(label,cur,prev,betterUp,fmt){
  const f=fmt||(x=>x); const diff=cur-prev; const up=diff>0;
  const melhora= diff===0?null:(betterUp?up:!up);
  const arrow= diff===0?'—':(up?'▲':'▼');
  const col= melhora==null?PC.MUTED:(melhora?PC.GREEN:PC.ORANGE);
  return '<div style="flex:1;min-width:110px;background:'+PC.LGRAY+';border-radius:10px;padding:12px 14px">'
    +'<div style="font-size:10.5px;color:'+PC.MUTED+';text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">'+label+'</div>'
    +'<div style="font-size:22px;font-weight:800;color:'+PC.TEXT+';line-height:1">'+f(cur)+'</div>'
    +'<div style="font-size:11px;margin-top:4px;color:'+PC.MUTED+'">vs '+f(prev)+' <span style="color:'+col+';font-weight:700">'+arrow+' '+f(Math.abs(diff))+'</span></div></div>';
}
// Abreviação do mês: "04/2026" → "Abr/26"
function _mesAbrev(m){ const x=String(m.competencia).match(/(\d{1,2})\/(\d{4})/); return x?MESES_FER[(+x[1])-1].slice(0,3)+'/'+x[2].slice(2):(m.compLabel||m.competencia); }
const _CORES_MES=[PC.GREEN,PC.PURPLE,PC.AMBER,PC.BLUE,PC.PINK,PC.ORANGE,PC.GREEN_DARK,PC.RED_DARK,'#A8A69E'];
function _corMes(i){ return _CORES_MES[i%_CORES_MES.length]; }

// Gráfico de linha (1 série) — labels no eixo x, valores nos pontos
function _svgLinha(labels, values, color, opts){
  opts=opts||{}; const suf=opts.sufixo||'';
  const w=Math.max(320, labels.length*72), h=172, pad={l:12,r:14,t:20,b:26};
  const iw=w-pad.l-pad.r, ih=h-pad.t-pad.b, n=labels.length;
  const max=Math.max(1,...values), min=Math.min(0,...values);
  const X=i=> n>1 ? pad.l+iw*i/(n-1) : pad.l+iw/2;
  const Y=v=> pad.t+ih-(v-min)/((max-min)||1)*ih;
  const pts=values.map((v,i)=>X(i).toFixed(1)+','+Y(v).toFixed(1)).join(' ');
  let body='<polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="2.5"/>';
  values.forEach((v,i)=>{
    body+='<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(v).toFixed(1)+'" r="3.4" fill="'+color+'"/>';
    body+='<text x="'+X(i).toFixed(1)+'" y="'+(Y(v)-8).toFixed(1)+'" text-anchor="middle" font-size="9.5" font-weight="700" fill="'+PC.TEXT+'">'+v+suf+'</text>';
    body+='<text x="'+X(i).toFixed(1)+'" y="'+(h-8)+'" text-anchor="middle" font-size="8.5" fill="#5F5E5A">'+labels[i]+'</text>';
  });
  return '<svg width="100%" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="xMidYMid meet" style="max-width:'+w+'px">'+body+'</svg>';
}

// Barras agrupadas com N séries. cats:[], series:[{color,values}]
function _svgBarsN(cats, series){
  const w=Math.max(360, cats.length*Math.max(56, series.length*15+18)), h=200, pad={l:8,r:8,t:12,b:48};
  const iw=w-pad.l-pad.r, ih=h-pad.t-pad.b;
  let max=1; series.forEach(s=>s.values.forEach(v=>{if(v>max)max=v;}));
  const gw=iw/cats.length, bw=Math.min(15,(gw*0.72)/series.length);
  let body='';
  cats.forEach((c,ci)=>{
    const gx0=pad.l+gw*ci+(gw-bw*series.length)/2;
    series.forEach((s,si)=>{
      const v=s.values[ci]||0, bh=(v/max)*ih, x=gx0+si*bw, y=pad.t+ih-bh;
      body+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+(bw-1.4).toFixed(1)+'" height="'+bh.toFixed(1)+'" fill="'+s.color+'"/>';
      if(v>0&&bh>13) body+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(y+bh/2).toFixed(1)+'" text-anchor="middle" dominant-baseline="central" font-size="7.5" font-weight="700" fill="#fff">'+v+'</text>';
    });
    const cx=pad.l+gw*ci+gw/2;
    body+='<text x="'+cx.toFixed(1)+'" y="'+(pad.t+ih+10)+'" text-anchor="end" font-size="8.5" fill="#5F5E5A" transform="rotate(-30 '+cx.toFixed(1)+' '+(pad.t+ih+10)+')">'+c+'</text>';
  });
  return '<svg width="100%" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="xMidYMid meet" style="max-width:'+w+'px">'+body+'</svg>';
}
function _legendaMeses(series){
  return '<div style="display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:#5F5E5A;margin-top:6px">'+series.map(s=>'<span><span style="display:inline-block;width:10px;height:10px;background:'+s.color+';border-radius:2px"></span> '+s.name+'</span>').join('')+'</div>';
}

// Tabela comparativa: meses nas colunas, métricas nas linhas, + Δ do período
function _tabelaComparativa(months){
  const f=months[0], l=months[months.length-1];
  const rows=[
    {l:'Total colaboradores', v:m=>m.total},
    {l:'Receberam', v:m=>m.receberam},
    {l:'% Receberam', v:m=>_P(m.receberam,m.total), fmt:x=>x+'%', pp:true},
    {l:'Não receberam', v:m=>m.naoReceberam, inv:true},
    {l:'Afastados', v:m=>m.afastados, inv:true},
    {l:'Não se aplica', v:m=>m.naoAplica, inv:true},
    {l:'Montante pago', v:m=>_montanteOf(m), fmt:_brl0},
    {l:'— Atestado', v:m=>m.causas.atestado, inv:true, sub:true},
    {l:'— Faltas', v:m=>m.causas.faltas, inv:true, sub:true},
    {l:'— Atraso', v:m=>m.causas.atraso, inv:true, sub:true},
    {l:'— Saída ant.', v:m=>m.causas.saida, inv:true, sub:true},
    {l:'— Abono ≥1h', v:m=>m.causas.abono, inv:true, sub:true},
    {l:'— Outros', v:m=>m.causas.outros||0, inv:true, sub:true},
  ];
  const th='padding:6px 8px;font-size:11px;font-weight:700;color:'+PC.TEXT+';border-bottom:1.5px solid '+PC.MGRAY;
  const head='<tr><th style="'+th+';text-align:left">Métrica</th>'
    +months.map(m=>'<th style="'+th+';text-align:center">'+_mesAbrev(m)+'</th>').join('')
    +'<th style="'+th+';text-align:center">Δ período</th></tr>';
  const body=rows.map(r=>{
    const fmt=r.fmt||(x=>x);
    const cells=months.map(m=>'<td style="padding:5px 8px;text-align:center;font-size:11.5px;color:'+(r.sub?'#5F5E5A':PC.TEXT)+'">'+fmt(r.v(m))+'</td>').join('');
    const d=r.v(l)-r.v(f);
    const melhora= d===0?null:(r.inv? d<0 : d>0);
    const col= melhora==null?PC.MUTED:(melhora?PC.GREEN:PC.ORANGE);
    const arrow= d===0?'—':(d>0?'▲':'▼');
    const dTxt= d===0?'—':(arrow+' '+(r.pp?((d>0?'+':'')+d+' p.p.'):fmt(Math.abs(d))));
    return '<tr style="'+(r.sub?'':'background:'+PC.LGRAY)+'"><td style="padding:5px 8px;text-align:left;font-size:11.5px;'+(r.sub?'color:#5F5E5A':'font-weight:600;color:'+PC.TEXT)+'">'+r.l+'</td>'+cells
      +'<td style="padding:5px 8px;text-align:center;font-size:11px;font-weight:700;color:'+col+'">'+dTxt+'</td></tr>';
  }).join('');
  return _card('Tabela comparativa','<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:'+(180+months.length*70)+'px"><thead>'+head+'</thead><tbody>'+body+'</tbody></table></div>');
}

function _leituraPeriodo(months){
  const f=months[0], l=months[months.length-1], out=[];
  out.push('Período: <strong>'+months.length+'</strong> competências ('+_mesAbrev(f)+' a '+_mesAbrev(l)+').');
  const tf=_P(f.receberam,f.total), tl=_P(l.receberam,l.total), dt=tl-tf;
  out.push('Taxa de recebimento: '+tf+'% → '+tl+'% (<strong>'+(dt>=0?'+':'')+dt+' p.p.</strong> no período).');
  const bt=months.map(m=>({m,t:_P(m.receberam,m.total)}));
  const best=bt.reduce((a,b)=>b.t>a.t?b:a), worst=bt.reduce((a,b)=>b.t<a.t?b:a);
  out.push('Melhor taxa: '+_mesAbrev(best.m)+' ('+best.t+'%) · pior: '+_mesAbrev(worst.m)+' ('+worst.t+'%).');
  const mf=_montanteOf(f), ml=_montanteOf(l);
  out.push('Montante pago: '+_brl0(mf)+' → '+_brl0(ml)+' ('+((ml-mf)>=0?'+':'')+_brl0(ml-mf)+').');
  const crits=[...new Set(months.map(m=>m.criterioAtraso||10))];
  if(crits.length>1) out.push('Houve mudança na regra de atraso/saída no período (critérios: '+crits.map(c=>c<60?c+'min':(c%60?((c/60).toFixed(1)+'h'):(c/60)+'h')).join(' → ')+').');
  return out;
}

// Comparativo multi-mês (months = array em ordem cronológica asc)
function renderPremioComparativo(months){
  const f=months[0], l=months[months.length-1];
  const labels=months.map(_mesAbrev);
  const cab='<div style="margin-bottom:14px"><div style="font-size:19px;font-weight:800;color:'+PC.TEXT+'">Comparativo — Prêmio de Assiduidade</div>'
    +'<div style="font-size:12px;color:'+PC.MUTED+'">Udiaco · '+f.compLabel+' a '+l.compLabel+' ('+months.length+' competências)</div></div>';
  // Tendências (linhas)
  const taxa=months.map(m=>_P(m.receberam,m.total));
  const montK=months.map(m=>Math.round(_montanteOf(m)/1000));
  const cardTaxa=_card('Taxa de recebimento (%)',_svgLinha(labels,taxa,PC.GREEN,{sufixo:'%'}));
  const cardMont=_card('Montante pago (R$ mil)',_svgLinha(labels,montK,PC.GREEN_DARK,{sufixo:'k'}));
  const trend='<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">'+cardTaxa+cardMont+'</div>';
  // Causas por mês (barras N séries)
  const causasCats=['Atestado','Faltas','Atraso','Saída','Abono','Outros'];
  const series=months.map((m,i)=>({color:_corMes(i),name:_mesAbrev(m),values:[m.causas.atestado,m.causas.faltas,m.causas.atraso,m.causas.saida,m.causas.abono,m.causas.outros||0]}));
  const cardCausas=_card('Causas de não recebimento por mês',_svgBarsN(causasCats,series)+_legendaMeses(series));
  // Tabela + leitura
  const tabela=_tabelaComparativa(months);
  const leitura=_card('Leitura do período','<div>'+_leituraPeriodo(months).map(x=>'<div style="font-size:11.5px;color:#5F5E5A;margin-bottom:5px">• '+x+'</div>').join('')+'</div>');
  const rodape='<div style="margin-top:14px;text-align:right;font-size:10.5px;color:'+PC.MUTED+'">Período '+_mesAbrev(f)+' → '+_mesAbrev(l)+' · Valor do benefício: R$ 226,00</div>';
  return '<div style="max-width:900px">'+cab+trend+cardCausas+'<div style="margin-bottom:16px">'+tabela+'</div>'+leitura+rodape+'</div>';
}

// ── ENTRADA DE DADOS ─────────────────────────────────────────────
function renderPremioEntrada(){
  const hoje=new Date(); const mesAtual=hoje.getMonth()+1, anoAtual=hoje.getFullYear();
  const anos=[2024,2025,2026,2027,2028];
  const mesSel=MESES_FER.map((m,i)=>'<option value="'+(i+1)+'"'+((i+1)===mesAtual?' selected':'')+'>'+m+'</option>').join('');
  const anoSel=anos.map(a=>'<option value="'+a+'"'+(a===anoAtual?' selected':'')+'>'+a+'</option>').join('');
  const inp=(id,ph,val)=>'<input type="number" id="'+id+'" min="0" step="1" placeholder="'+(ph||'0')+'" value="'+(val!=null?val:'')+'" style="width:100%;padding:7px 9px;border:1.5px solid var(--border);border-radius:7px;font-size:13px">';
  const fg=(lbl,el)=>'<div style="flex:1;min-width:120px"><label style="font-size:11px;color:var(--text2);display:block;margin-bottom:4px">'+lbl+'</label>'+el+'</div>';
  const salvas=premioDadosList.length?('<div style="margin-top:16px"><div style="font-size:12px;font-weight:700;margin-bottom:6px">Competências salvas</div>'+premioDadosList.map(d=>'<div style="display:flex;align-items:center;gap:8px;font-size:12px;padding:5px 0;border-bottom:1px solid var(--border)"><span style="flex:1">'+d.compLabel+' — '+d.receberam+'/'+d.total+' receberam'+(d.fonte==='apuracao'?' <span class="badge badge-blue">apuração</span>':'')+'</span>'+(d.fonte!=='apuracao'?'<button class="btn btn-ghost btn-xs" onclick="editarPremioDados(\''+d.competencia+'\')">Editar</button><button class="btn btn-danger btn-xs" onclick="excluirPremioDados(\''+d.competencia+'\')">Excluir</button>':'')+'</div>').join('')+'</div>'):'';
  return '<div style="max-width:820px">'
    +'<div class="card" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div class="card-title" style="margin:0">Entrada / edição de competência</div><button class="btn btn-ghost btn-sm" onclick="carregarExemploPremio()">Carregar exemplo (Maio/2026)</button></div>'
    +'<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">'
      +fg('Mês','<select id="pd-mes" style="width:100%;padding:7px 9px;border:1.5px solid var(--border);border-radius:7px;font-size:13px">'+mesSel+'</select>')
      +fg('Ano','<select id="pd-ano" style="width:100%;padding:7px 9px;border:1.5px solid var(--border);border-radius:7px;font-size:13px">'+anoSel+'</select>')
      +fg('Período (texto)','<input type="text" id="pd-periodo" placeholder="21/04/2026 – 20/05/2026" style="width:100%;padding:7px 9px;border:1.5px solid var(--border);border-radius:7px;font-size:13px">')
      +fg('Valor do benefício (R$)',inp('pd-valor','226',226))
      +fg('Critério atraso (min)',inp('pd-crit-atr','10',10))
      +fg('Critério saída (min)',inp('pd-crit-sai','10',10))
    +'</div>'
    +'<div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;margin:8px 0 6px">Totais</div>'
    +'<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">'
      +fg('Total colaboradores',inp('pd-total'))+fg('Receberam',inp('pd-receb'))+fg('Não receberam',inp('pd-naoreceb'))+fg('Afastados',inp('pd-afast'))+fg('Não se aplica',inp('pd-na'))
      +fg('Montante pago (R$, opcional)',inp('pd-montante','vazio = receberam × valor'))
    +'</div>'
    +'<div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;margin:8px 0 6px">Causas de não recebimento</div>'
    +'<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">'
      +fg('Atestado',inp('pd-atestado'))+fg('Faltas',inp('pd-faltas'))+fg('Atraso',inp('pd-atraso'))+fg('Saída ant.',inp('pd-saida'))+fg('Abono ≥1h',inp('pd-abono'))+fg('Outros',inp('pd-outros'))
    +'</div>'
    +'<div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;margin:8px 0 6px">Exceções por faixa (opcional) — nº de colaboradores</div>'
    +_faixaRow('10–30min','10_30')+_faixaRow('30–60min','30_60')+_faixaRow('1h–2h','1_2h')+_faixaRow('acima 2h','2h')
    +'<div style="margin-top:14px"><button class="btn btn-primary" onclick="salvarPremioDados()">Salvar competência</button></div>'
    +'</div>'+salvas+'</div>';
}
function _faixaRow(lbl,k){
  const inp=id=>'<input type="number" id="pd-e-'+id+'" min="0" step="1" placeholder="0" style="width:80px;padding:6px 8px;border:1.5px solid var(--border);border-radius:7px;font-size:13px">';
  return '<div style="display:flex;gap:10px;align-items:center;margin-bottom:6px;font-size:12px"><span style="width:80px;color:var(--text2)">'+lbl+'</span>'
    +'<span>Atraso '+inp(k+'-atr')+'</span><span>Saída '+inp(k+'-sai')+'</span></div>';
}

function carregarExemploPremio(){
  const set=(id,v)=>{const e=document.getElementById(id); if(e) e.value=v;};
  set('pd-mes',5); set('pd-ano',2026); set('pd-periodo','21/04/2026 – 20/05/2026'); set('pd-valor',226);
  set('pd-total',497); set('pd-receb',302); set('pd-naoreceb',163); set('pd-afast',13); set('pd-na',18);
  set('pd-atestado',80); set('pd-faltas',20); set('pd-atraso',34); set('pd-saida',16); set('pd-abono',6);
  toast('Exemplo carregado. Clique em Salvar para ver o dashboard.','success');
}

function editarPremioDados(comp){
  const d=_findComp(comp); if(!d){ setPremioView('entrada'); return; }
  setPremioView('entrada');
  setTimeout(()=>{
    const m=String(comp).match(/(\d{1,2})\/(\d{4})/); const set=(id,v)=>{const e=document.getElementById(id); if(e) e.value=v;};
    if(m){ set('pd-mes',+m[1]); set('pd-ano',+m[2]); }
    set('pd-periodo',d.periodo); set('pd-valor',d.valor); set('pd-total',d.total); set('pd-receb',d.receberam);
    set('pd-naoreceb',d.naoReceberam); set('pd-afast',d.afastados); set('pd-na',d.naoAplica);
    set('pd-atestado',d.causas.atestado); set('pd-faltas',d.causas.faltas); set('pd-atraso',d.causas.atraso); set('pd-saida',d.causas.saida); set('pd-abono',d.causas.abono); set('pd-outros',d.causas.outros||'');
    set('pd-montante',d.montante||''); set('pd-crit-atr',d.criterioAtraso||10); set('pd-crit-sai',d.criterioSaida||10);
    const ex=d.excecoes; const map={'10_30':'f10_30','30_60':'f30_60','1_2h':'f1_2h','2h':'f2h'};
    Object.keys(map).forEach(k=>{ set('pd-e-'+k+'-atr',ex[map[k]].atraso||''); set('pd-e-'+k+'-sai',ex[map[k]].saida||''); });
  },60);
}

async function salvarPremioDados(){
  const v=id=>_num(document.getElementById(id)?.value);
  const mes=String(v('pd-mes')).padStart(2,'0'), ano=document.getElementById('pd-ano')?.value||'';
  if(!ano){ toast('Selecione o ano','error'); return; }
  const comp=mes+'/'+ano; const id=mes+'_'+ano;
  const exc=(k)=>({atraso:v('pd-e-'+k+'-atr'),saida:v('pd-e-'+k+'-sai')});
  const doc={
    competencia:comp, compLabel:MESES_FER[(+mes)-1]+' '+ano,
    periodo:document.getElementById('pd-periodo')?.value.trim()||_premioPeriodo(comp),
    valor:v('pd-valor')||226, fonte:'manual', montante:v('pd-montante'),
    total:v('pd-total'), receberam:v('pd-receb'), naoReceberam:v('pd-naoreceb'),
    afastados:v('pd-afast'), naoAplica:v('pd-na'),
    causas:{atestado:v('pd-atestado'),faltas:v('pd-faltas'),atraso:v('pd-atraso'),saida:v('pd-saida'),abono:v('pd-abono'),outros:v('pd-outros')},
    criterioAtraso:v('pd-crit-atr')||10, criterioSaida:v('pd-crit-sai')||10,
    excecoes:{f10_30:exc('10_30'),f30_60:exc('30_60'),f1_2h:exc('1_2h'),f2h:exc('2h')},
    atualizadoEm:new Date().toISOString(),
  };
  try{
    await fsSet('premioDados',id,doc);
    toast('Competência '+doc.compLabel+' salva!','success');
    await carregarPremioDados();
    premioDashView='mensal'; setPremioView('mensal');
    setTimeout(()=>{ const sel=document.getElementById('pd-sel-a'); if(sel){ sel.value=comp; renderPremioDashBody(); } },40);
  }catch(e){ toast('Erro: '+e.message,'error'); }
}

async function excluirPremioDados(comp){
  const m=String(comp).match(/(\d{1,2})\/(\d{4})/); if(!m) return;
  if(!confirm('Excluir a competência '+comp+'?')) return;
  try{ await fsDel('premioDados',m[1].padStart(2,'0')+'_'+m[2]); toast('Excluída.','success'); await carregarPremioDados(); renderPremioEntradaRefresh(); }
  catch(e){ toast('Erro: '+e.message,'error'); }
}
function renderPremioEntradaRefresh(){ const el=document.getElementById('premio-dash-body'); if(el&&premioDashView==='entrada') el.innerHTML=renderPremioEntrada(); renderPremioControls(); }

function printPremioDash(){
  if(premioDashView==='entrada'){ toast('Abra o Mensal ou o Comparativo para imprimir.','warning'); return; }
  ensurePremioPrintCSS();
  window.print();
}


function pgBaseAtualizacao(){
  const anos=[2024,2025,2026,2027];
  const anoAtual=new Date().getFullYear();
  const mesAtual=new Date().getMonth()+1;
  const meses=[{v:1,l:'Janeiro'},{v:2,l:'Fevereiro'},{v:3,l:'Marco'},{v:4,l:'Abril'},
    {v:5,l:'Maio'},{v:6,l:'Junho'},{v:7,l:'Julho'},{v:8,l:'Agosto'},
    {v:9,l:'Setembro'},{v:10,l:'Outubro'},{v:11,l:'Novembro'},{v:12,l:'Dezembro'}];

  return `
    <div class="page-header">
      <h2>Atualizacao Mensal da Base</h2>
      <p>Importe o Excel da Senior para sincronizar admissoes, demissoes e afastamentos.</p>
    </div>

    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Competencia de referencia</div>
      <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">
        <div class="fg"><label>Mes</label>
          <select id="atu-mes" style="padding:8px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px">
            ${meses.map(m=>'<option value="'+m.v+'" '+(m.v===mesAtual?'selected':'')+'>'+m.l+'</option>').join('')}
          </select>
        </div>
        <div class="fg"><label>Ano</label>
          <select id="atu-ano" style="padding:8px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px">
            ${anos.map(a=>'<option value="'+a+'" '+(a===anoAtual?'selected':'')+'>'+a+'</option>').join('')}
          </select>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Importar relatorio da Senior</div>
      <div class="alert alert-info" style="margin-bottom:12px">
        <strong>Colunas esperadas:</strong> Cadastro (matricula), Nome, Situacao/Status<br>
        O sistema vai comparar com a base atual e identificar: novos, demitidos, mudancas de status.
      </div>
      <div class="upload-zone" onclick="document.getElementById('atu-file').click()">
        <input type="file" id="atu-file" accept=".xlsx,.xls" style="display:none" onchange="processarAtualizacao(event)">
        <div style="font-size:28px;margin-bottom:8px">&#8679;</div>
        <div class="upload-text">Selecionar Excel da Senior</div>
        <div class="upload-sub">.xlsx ou .xls</div>
      </div>
      <div id="atu-preview" style="margin-top:14px"></div>
    </div>`;
}

// Mapeamento de status da Senior para o sistema
function mapearStatusSenior(statusSenior){
  if(!statusSenior) return 'Trabalhando';
  const s = String(statusSenior).toLowerCase().trim();
  if(s.includes('auxilio doenca')||s.includes('auxílio doença')||s==='003') return 'Auxilio Doenca';
  if(s.includes('acidente')||s==='004') return 'Acidente Trabalho';
  if(s.includes('maternidade')) return 'Lic. Maternidade';
  if(s.includes('paternidade')) return 'Lic. Paternidade';
  if(s.includes('reclusao')||s.includes('reclusão')||s==='028') return 'Auxilio Reclusao';
  if(s.includes('ferias coletiva')||s.includes('férias coletiva')) return 'Ferias Coletiva';
  if(s.includes('ferias')||s.includes('férias')) return 'Ferias';
  if(s.includes('afasta')) return 'Afastado';
  if(s.includes('ativo')||s.includes('trabalhando')||s.includes('normal')) return 'Trabalhando';
  if(s.includes('demit')||s.includes('rescis')) return 'Demitido';
  return 'Trabalhando';
}

let atuPendente = {novos:[],demitidos:[],mudancas:[],iguais:0};

async function processarAtualizacao(event){
  const file=event.target.files[0]; if(!file) return;
  const prev=document.getElementById('atu-preview');
  prev.innerHTML='<div class="alert alert-info">Processando...</div>';

  const reader=new FileReader();
  reader.onload=async e=>{
    const wb=XLSX.read(e.target.result,{type:'binary'});
    const data=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1});

    // Detectar header
    let hi=0;
    for(let i=0;i<Math.min(5,data.length);i++){
      if(data[i].some(v=>String(v||'').toLowerCase().includes('nome'))){hi=i;break;}
    }
    const hs=data[hi].map(h=>String(h||'').toLowerCase().trim());
    const iMat=hs.findIndex(h=>h.includes('cadastro')||h.includes('matr'));
    const iNome=hs.findIndex(h=>h.includes('nome'));
    const iSit=hs.findIndex(h=>h.includes('situa')||h.includes('status'));
    const iAdm=hs.findIndex(h=>h.includes('admiss'));

    if(iMat<0||iNome<0){
      prev.innerHTML='<div class="alert alert-warning">Colunas Cadastro/Nome nao encontradas. Verifique o arquivo.</div>';
      return;
    }

    // Ler dados do Excel
    const seniorMap={};
    for(let i=hi+1;i<data.length;i++){
      const r=data[i]; if(!r||!r[iMat]||!r[iNome]) continue;
      const matRaw=String(r[iMat]).trim();
      // Normalizar matrícula: pode vir como "1000.0162" ou "10000162"
      const mat=matRaw.includes('.')?matRaw:matRaw.substring(0,4)+'.'+matRaw.substring(4);
      const nome=String(r[iNome]).trim().toUpperCase();
      const statusRaw=iSit>=0?String(r[iSit]||'').trim():'';
      const status=mapearStatusSenior(statusRaw);
      const admissao=iAdm>=0&&r[iAdm]?new Date(r[iAdm]).toISOString().split('T')[0]:'';
      seniorMap[mat]={mat,nome,status,admissao};
    }

    // Comparar com base atual
    const baseMap={};
    colaboradores.forEach(c=>{ if(c.mat) baseMap[c.mat]=c; });

    // Afastados definitivos: apartados dos demais — o relatório NUNCA altera o status
    // deles (só muda por ação manual na Base).
    const ehDefinitivo=c=>_statusKey(c.status)==='AFASTADO DEFINITIVO';
    const afastadosDef=colaboradores.filter(c=>c.mat && ehDefinitivo(c));

    // Em férias (por data): o relatório mensal NÃO reverte — o ciclo de férias é
    // governado pelas datas e pelo fluxo de retorno (Controle de Férias).
    const hojeAtu=new Date();
    const emFeriasLock=c=>{ const s=feriasSituacao(c,hojeAtu); return s==='em_ferias'||s==='retorno_pendente'; };
    const feriasLista=colaboradores.filter(c=>c.mat && !ehDefinitivo(c) && emFeriasLock(c));

    const novos=[], demitidos=[], mudancas=[];
    let iguais=0;

    // Novos: estão na Senior mas não na base
    Object.values(seniorMap).forEach(s=>{
      const c=baseMap[s.mat];
      if(!c){ novos.push(s); return; }
      if(ehDefinitivo(c)) return;                 // travado: ignora o que o relatório indicar
      if(emFeriasLock(c)) return;                 // em férias: governado por datas, não pelo relatório
      if(c.status!==s.status){
        mudancas.push({colab:c, novoStatus:s.status, statusAnterior:c.status});
      } else {
        iguais++;
      }
    });

    // Demitidos: estão na base como Trabalhando mas não aparecem na Senior
    colaboradores.filter(c=>c.mat&&c.status==='Trabalhando').forEach(c=>{
      if(!seniorMap[c.mat]) demitidos.push(c);
    });

    atuPendente={novos,demitidos,mudancas,iguais,afastadosDef,feriasLista};
    renderAtuPreview(novos,demitidos,mudancas,iguais,afastadosDef,feriasLista);
    event.target.value='';
  };
  reader.readAsBinaryString(file);
}

function renderAtuPreview(novos,demitidos,mudancas,iguais,afastadosDef,feriasLista){
  const prev=document.getElementById('atu-preview'); if(!prev) return;
  afastadosDef=afastadosDef||[];
  feriasLista=feriasLista||[];

  let html=`
    <div class="stats-grid" style="margin-bottom:16px">
      <div class="stat-card green"><div class="stat-val" style="color:var(--green)">${iguais}</div><div class="stat-label">Sem alteracao</div></div>
      <div class="stat-card blue"><div class="stat-val" style="color:var(--blue)">${novos.length}</div><div class="stat-label">Novos admitidos</div></div>
      <div class="stat-card red"><div class="stat-val" style="color:var(--red)">${demitidos.length}</div><div class="stat-label">Possiveis demissoes</div></div>
      <div class="stat-card yellow"><div class="stat-val" style="color:var(--yellow)">${mudancas.length}</div><div class="stat-label">Mudancas de status</div></div>
    </div>`;

  // Afastados definitivos — apartados dos demais: informativo, o relatório não os altera.
  if(afastadosDef.length>0){
    html+=`<div class="card" style="margin-bottom:12px;border-left:3px solid #9F1239">
      <div class="card-title" style="color:#9F1239">Afastados definitivos — mantidos (${afastadosDef.length})</div>
      <div class="alert alert-info" style="margin-bottom:8px">Marcados como <strong>Afastado Definitivo</strong> e <strong>apartados</strong>: o relatorio da Senior nao altera o status deles. Para mudar, faca manualmente na Base.</div>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Matricula</th><th>Nome</th><th>Departamento</th><th>Status</th></tr></thead>
        <tbody>${afastadosDef.map(c=>`<tr>
          <td><code>${c.mat||'—'}</code></td>
          <td>${c.nome}</td>
          <td class="text-sm text-muted">${c.depto||'—'}</td>
          <td>${statusBadge(c.status)}</td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>`;
  }

  // Em férias (por data) — apartados: o relatório não altera; o retorno é pelo Controle de Férias.
  if(feriasLista.length>0){
    html+=`<div class="card" style="margin-bottom:12px;border-left:3px solid var(--blue)">
      <div class="card-title" style="color:var(--blue)">Em férias — mantidos (${feriasLista.length})</div>
      <div class="alert alert-info" style="margin-bottom:8px">Estão de férias pelo período informado. O relatório da Senior <strong>não</strong> altera o status deles — o retorno é confirmado pelo Controle de Férias (ou no aviso de retorno pendente).</div>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Matricula</th><th>Nome</th><th>Período</th><th>Status</th></tr></thead>
        <tbody>${feriasLista.map(c=>`<tr>
          <td><code>${c.mat||'—'}</code></td>
          <td>${c.nome}</td>
          <td class="text-sm text-muted">${c.ferInicio&&c.ferFim?_ddmm(_dataLocal(c.ferInicio))+'→'+_ddmm(_dataLocal(c.ferFim)):'—'}</td>
          <td>${statusBadge(c.status)}</td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>`;
  }

  // Mudanças de status
  if(mudancas.length>0){
    html+=`<div class="card" style="margin-bottom:12px">
      <div class="card-title" style="color:var(--yellow)">Mudancas de Status (${mudancas.length})</div>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <button class="btn btn-ghost btn-sm" onclick="selecionarTodosMudancas(true)">Selecionar todos</button>
        <button class="btn btn-ghost btn-sm" onclick="selecionarTodosMudancas(false)">Desmarcar todos</button>
      </div>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Aplicar?</th><th>Matricula</th><th>Nome</th><th>Status Atual</th><th>Novo Status</th></tr></thead>
        <tbody>${mudancas.map((m,i)=>`<tr>
          <td><input type="checkbox" id="mud-${i}" class="mud-check" checked style="accent-color:var(--blue)"></td>
          <td><code>${m.colab.mat}</code></td>
          <td>${m.colab.nome}</td>
          <td>${statusBadge(m.statusAnterior)}</td>
          <td>${statusBadge(m.novoStatus)}</td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>`;
  }

  // Novos admitidos
  if(novos.length>0){
    html+=`<div class="card" style="margin-bottom:12px">
      <div class="card-title" style="color:var(--blue)">Novos Admitidos (${novos.length})</div>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <button class="btn btn-ghost btn-sm" onclick="selecionarTodosNovos(true)">Selecionar todos</button>
        <button class="btn btn-ghost btn-sm" onclick="selecionarTodosNovos(false)">Desmarcar todos</button>
      </div>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Incluir?</th><th>Matricula</th><th>Nome</th><th>Status</th><th>Admissao</th></tr></thead>
        <tbody>${novos.map((n,i)=>`<tr>
          <td><input type="checkbox" id="nov-${i}" class="nov-check" checked style="accent-color:var(--blue)"></td>
          <td><code>${n.mat}</code></td>
          <td>${n.nome}</td>
          <td>${statusBadge(n.status)}</td>
          <td>${n.admissao||'—'}</td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>`;
  }

  // Possíveis demitidos
  if(demitidos.length>0){
    html+=`<div class="card" style="margin-bottom:12px">
      <div class="card-title" style="color:var(--red)">Nao aparecem no relatorio (${demitidos.length})</div>
      <div class="alert alert-warning" style="margin-bottom:8px">Estes estavam como Trabalhando na base mas nao constam no relatorio. Marque os que foram demitidos.</div>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <button class="btn btn-ghost btn-sm" onclick="selecionarTodosDemitidos(true)">Marcar todos como Demitido</button>
        <button class="btn btn-ghost btn-sm" onclick="selecionarTodosDemitidos(false)">Desmarcar todos</button>
      </div>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Demitido?</th><th>Matricula</th><th>Nome</th><th>Departamento</th><th>Status atual</th></tr></thead>
        <tbody>${demitidos.map((d,i)=>`<tr>
          <td><input type="checkbox" id="dem-${i}" class="dem-check" style="accent-color:var(--red)"></td>
          <td><code>${d.mat}</code></td>
          <td>${d.nome}</td>
          <td class="text-sm text-muted">${d.depto||'—'}</td>
          <td>${statusBadge(d.status)}</td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>`;
  }

  html+=`<div class="btn-row">
    <button class="btn btn-ghost" onclick="document.getElementById('atu-preview').innerHTML=''">Cancelar</button>
    <button class="btn btn-primary" onclick="aplicarAtualizacao()">Aplicar alteracoes selecionadas</button>
  </div>`;

  prev.innerHTML=html;
  prev._novos=novos;
  prev._demitidos=demitidos;
  prev._mudancas=mudancas;
}

function selecionarTodosMudancas(sel){ document.querySelectorAll('.mud-check').forEach(c=>c.checked=sel); }
function selecionarTodosNovos(sel){ document.querySelectorAll('.nov-check').forEach(c=>c.checked=sel); }
function selecionarTodosDemitidos(sel){ document.querySelectorAll('.dem-check').forEach(c=>c.checked=sel); }

async function aplicarAtualizacao(){
  const prev=document.getElementById('atu-preview');
  const novos=prev._novos||[];
  const demitidos=prev._demitidos||[];
  const mudancas=prev._mudancas||[];

  const b=window._writeBatch(window._db);
  let nMud=0, nNov=0, nDem=0;

  // Aplicar mudancas de status
  mudancas.forEach((m,i)=>{
    if(!document.getElementById('mud-'+i)?.checked) return;
    m.colab.status=m.novoStatus;
    b.set(window._doc('colaboradores',m.colab._id),m.colab);
    const idx=colaboradores.findIndex(c=>c._id===m.colab._id);
    if(idx>=0) colaboradores[idx].status=m.novoStatus;
    nMud++;
  });

  // Incluir novos
  novos.forEach((n,i)=>{
    if(!document.getElementById('nov-'+i)?.checked) return;
    const id=n.mat.replace('.','_')+'_'+Date.now()+'_'+i;
    const c={_id:id,mat:n.mat,nome:n.nome,status:n.status,admissao:n.admissao||'',
      filtro:'OK',cargo:'',depto:'',cpf:'',vr:0,cafe:0,comb:0,
      mobilidade:'perto',elegibilidade:{vr:false,cafe:false,mobilidade:false,folha:true,folhaCLT:true,folhaMEI:false}};
    b.set(window._doc('colaboradores',id),c);
    colaboradores.push(c);
    nNov++;
  });

  // Marcar demitidos
  demitidos.forEach((d,i)=>{
    if(!document.getElementById('dem-'+i)?.checked) return;
    d.status='Demitido';
    b.set(window._doc('colaboradores',d._id),d);
    const idx=colaboradores.findIndex(c=>c._id===d._id);
    if(idx>=0) colaboradores[idx].status='Demitido';
    nDem++;
  });

  await b.commit();

  // Grava um snapshot da base atualizada nos Históricos (basesSalvas), para que a
  // apuração de Benefícios importe SEMPRE a versão mais recente e fique o log da atualização.
  let versaoMsg='';
  const houveMudanca = (nMud+nNov+nDem) > 0;
  if(houveMudanca){
    const mes=String(document.getElementById('atu-mes')?.value||'').padStart(2,'0');
    const ano=String(document.getElementById('atu-ano')?.value||'');
    const comp=(mes && ano)?(mes+'/'+ano):'';
    if(comp){
      const ok=await salvarBaseComp(comp,true);
      versaoMsg = ok
        ? `<br>Nova versão salva nos <strong>Históricos</strong> (competência ${comp}) — os Benefícios já importam esta base.`
        : `<br><span style="color:var(--red)">Atenção: a base foi atualizada, mas não consegui salvar a versão nos Históricos.</span>`;
    } else {
      versaoMsg = `<br><span style="color:var(--red)">Atenção: selecione mês e ano da competência para gerar a versão nos Históricos.</span>`;
    }
  }

  prev.innerHTML=`<div class="alert alert-success">
    Atualizacao concluida!<br>
    <strong>${nMud}</strong> status atualizados &middot;
    <strong>${nNov}</strong> novos incluidos &middot;
    <strong>${nDem}</strong> marcados como Demitido<br>
    Base atual: <strong>${colaboradores.length}</strong> colaboradores${versaoMsg}
  </div>`;

  setSS('${colaboradores.length} colaboradores','ok');
  toast(houveMudanca?'Base atualizada e versão salva nos Históricos!':'Base atualizada!','success');
}

// ── Funções auxiliares do wizard MEI e Passo 6 ──────────────────

function renderMeiLinhas(dados){
  return dados.map((r,i)=>{
    const idx = premioState.tabela.findIndex(x=>x.mat===r.mat);
    const corRec = r.recebe==='SIM'?'var(--green)':'var(--red)';
    return '<tr style="border-bottom:1px solid var(--border);background:'+(i%2===0?'#F8F9FB':'')+'" data-mat="'+r.mat+'" data-nome="'+r.nome.toLowerCase()+'">'
      +'<td style="padding:8px 12px"><code style="font-size:11px">'+r.mat+'</code></td>'
      +'<td style="padding:8px 12px;font-weight:500">'+r.nome+'</td>'
      +'<td style="padding:8px 12px;text-align:center;font-size:11px;color:'+(r.atraso>10?'var(--red)':r.atraso>0?'var(--yellow)':'#ccc')+'">'+min2str(r.atraso)+'</td>'
      +'<td style="padding:8px 12px;text-align:center;font-size:11px;color:'+(r.saida>10?'var(--red)':r.saida>0?'var(--yellow)':'#ccc')+'">'+min2str(r.saida)+'</td>'
      +'<td style="padding:8px 12px;text-align:center;font-size:11px;color:'+(r.atestado>0?'var(--red)':'#ccc')+'">'+min2str(r.atestado)+'</td>'
      +'<td style="padding:8px 12px;text-align:center;font-size:11px;color:'+(r.faltas>0||r.faltaParcial>0?'var(--red)':'#ccc')+'">'+min2str(r.faltas+r.faltaParcial)+'</td>'
      +'<td style="padding:8px 12px;text-align:center;font-size:11px;color:'+(r.abono>=60?'var(--red)':'#ccc')+'">'+min2str(r.abono)+'</td>'
      +'<td style="padding:8px 12px;text-align:center;background:'+(i%2===0?'#F0FFF4':'#E8FFF0')+'">'
        +'<select onchange="editarRecebeRow('+idx+',this.value);atualizarResumoMei()" '
        +'style="padding:4px 8px;border:1.5px solid var(--border);border-radius:6px;font-size:12px;font-weight:700;color:'+corRec+';background:transparent;cursor:pointer">'
        +'<option value="SIM" '+(r.recebe==='SIM'?'selected':'')+'>SIM</option>'
        +'<option value="NAO" '+(r.recebe==='NAO'?'selected':'')+'>NAO</option>'
        +'</select>'
      +'</td>'
      +'</tr>';
  }).join('');
}

function filtrarTabelaMei(){
  const q = (document.getElementById('mei-q')?.value||'').toLowerCase();
  const rows = document.querySelectorAll('#mei-tbody tr');
  rows.forEach(row=>{
    const mat = row.dataset.mat||'';
    const nome = row.dataset.nome||'';
    row.style.display = (!q||mat.includes(q)||nome.includes(q)) ? '' : 'none';
  });
}

function atualizarResumoMei(){
  const meis = premioState.tabela.filter(r=>r.situacao==='MEI');
  const sim = meis.filter(r=>r.recebe==='SIM').length;
  const nao = meis.filter(r=>r.recebe==='NAO').length;
  const el = document.getElementById('mei-resumo');
  if(el) el.innerHTML = sim+' SIM &nbsp;|&nbsp; '+nao+' NAO &nbsp;|&nbsp; '+brl(sim*PREMIO_VAL);
}

function renderPasso6Linhas(dados){
  return dados.map((r,i)=>{
    const idx = premioState.tabela.findIndex(x=>x.mat===r.mat);
    const corRec = r.recebe==='SIM'?'var(--green)':'var(--red)';
    const bgRec = r.recebe==='SIM'?'#F0FFF4':'#FFF0F0';
    return '<tr style="border-bottom:1px solid var(--border);background:'+(i%2===0?'#F8F9FB':'')+'" data-mat="'+r.mat+'" data-nome="'+r.nome.toLowerCase()+'" data-recebe="'+r.recebe+'" data-sit="'+r.situacao+'">'
      +'<td style="padding:7px 10px"><code style="font-size:10px">'+r.mat+'</code></td>'
      +'<td style="padding:7px 10px;font-weight:500;max-width:180px;overflow:hidden;text-overflow:ellipsis">'+r.nome+'</td>'
      +'<td style="padding:7px 10px"><span style="background:'+(r.situacao==='MEI'?'#FEF3C7':r.situacao==='Trabalhando'?'#D1FAE5':'#F3F4F6')+';color:'+(r.situacao==='MEI'?'#78350F':r.situacao==='Trabalhando'?'#065F46':'#374151')+';padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600">'+r.situacao+'</span></td>'
      +'<td style="padding:7px 10px;text-align:center;background:'+bgRec+'">'
        +'<select onchange="editarRecebeRow('+idx+',this.value);this.style.color=this.value===\'SIM\'?\'var(--green)\":\'var(--red)\';this.closest(\'tr\').dataset.recebe=this.value;filtrarPasso6()" '
        +'style="padding:3px 6px;border:1px solid var(--border);border-radius:4px;font-size:11px;font-weight:700;color:'+corRec+';background:transparent;cursor:pointer">'
        +'<option value="SIM" '+(r.recebe==='SIM'?'selected':'')+'>SIM</option>'
        +'<option value="NAO" '+(r.recebe==='NAO'?'selected':'')+'>NAO</option>'
        +'</select>'
      +'</td>'
      +'<td style="padding:7px 10px;text-align:right;font-weight:600;font-family:monospace;color:var(--green)">'+(r.recebe==='SIM'?brl(PREMIO_VAL):'—')+'</td>'
      +'</tr>';
  }).join('');
}

function filtrarPasso6(){
  const q = (document.getElementById('passo6-q')?.value||'').toLowerCase();
  const f = document.getElementById('passo6-f')?.value||'';
  const rows = document.querySelectorAll('#passo6-tbody tr');
  rows.forEach(row=>{
    const mat = row.dataset.mat||'';
    const nome = row.dataset.nome||'';
    const recebe = row.dataset.recebe||'';
    const sit = row.dataset.sit||'';
    const matchQ = !q||mat.includes(q)||nome.includes(q);
    const matchF = !f||(f==='MEI'?sit==='MEI':recebe===f);
    row.style.display = (matchQ&&matchF)?'':'none';
  });
}


// ================================================================
// TESTE DE CONEXAO WEB SERVICE SENIOR (SOAP)
// ================================================================

async function testarConexaoSenior(){
  const url = "https://ocweb08s1p.seniorcloud.com.br:30331/g5-senior-services/rubi_Synccom_senior_g5_rh_fp_bi";
  const user = document.getElementById('senior-user')?.value || '';
  const pass = document.getElementById('senior-pass')?.value || '';

  if(!user || !pass){
    toast('Preencha usuario e senha','error');
    return;
  }

  const body = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:ser="http://services.senior.com.br" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <ser:getEmpresa>
      <user>${user}</user>
      <password>${pass}</password>
      <encryption>0</encryption>
      <parameters>
        <eNumEmp></eNumEmp>
      </parameters>
    </ser:getEmpresa>
  </soapenv:Body>
</soapenv:Envelope>`;

  const resultDiv = document.getElementById('senior-test-result');
  resultDiv.innerHTML = '<div class="alert alert-info">Testando conexao...</div>';

  try{
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'getEmpresa'
      },
      body: body
    });

    const text = await resp.text();

    if(resp.ok){
      resultDiv.innerHTML = '<div class="alert alert-success">'
        +'<strong>Conexao OK!</strong> Status: '+resp.status+'<br>'
        +'<pre style="font-size:10px;background:#F9FAFB;padding:10px;border-radius:6px;overflow:auto;max-height:300px;white-space:pre-wrap;margin-top:8px">'
        +text.substring(0,2000).replace(/</g,'&lt;').replace(/>/g,'&gt;')
        +'</pre></div>';
    } else {
      resultDiv.innerHTML = '<div class="alert alert-warning">'
        +'<strong>Erro HTTP '+resp.status+'</strong><br>'
        +'<pre style="font-size:10px;background:#F9FAFB;padding:10px;border-radius:6px;overflow:auto;max-height:300px;white-space:pre-wrap;margin-top:8px">'
        +text.substring(0,1000).replace(/</g,'&lt;').replace(/>/g,'&gt;')
        +'</pre></div>';
    }
  }catch(err){
    let msg = err.message;
    let dica = '';
    if(msg.includes('CORS')||msg.includes('Failed to fetch')){
      dica = '<br><strong>Possivel causa:</strong> O servidor Senior nao permite chamadas de outros dominios (CORS). '
        +'Sera necessario um proxy/intermediario para fazer essa chamada.';
    }
    resultDiv.innerHTML = '<div class="alert alert-warning">'
      +'<strong>Erro de conexao:</strong> '+msg+dica
      +'</div>';
  }
}

// ============================================================
// GESTÃO DE USUÁRIOS (somente Master)
// ============================================================
function pgUsuarios(){
  const opts=Object.keys(PAPEIS).map(k=>'<option value="'+k+'">'+PAPEIS[k].label+'</option>').join('');
  // Referência: perfis (papéis) e tipos de cadastro
  const escDesc=p=> p.escopo==='all'?'Todas as empresas' : (p.escopo==='um989'?'Somente Férias UM989' : ((p.empresas||[]).join(', ')||'—'));
  const perfisRows=Object.keys(PAPEIS).map(k=>{const p=PAPEIS[k];
    return '<tr style="border-bottom:1px solid var(--border)"><td style="padding:7px 10px;font-weight:600">'+p.label+'</td>'
      +'<td style="padding:7px 10px">'+escDesc(p)+'</td>'
      +'<td style="padding:7px 10px;text-align:center">'+(p.gerencia?'✅':'—')+'</td></tr>';
  }).join('');
  const TIPOS=[['OK','CLT normal'],['DUP','CLT com duplicidade (MEI/Sócio)'],['MEI','Contrato MEI'],['SOC','Sócio'],['TER','Terceiros'],['DIR','Diretoria'],['PART','Particular (funcionários dos sócios)']];
  const tiposRows=TIPOS.map(([k,d])=>'<tr style="border-bottom:1px solid var(--border)"><td style="padding:7px 10px">'+filtroBadge(k)+'</td><td style="padding:7px 10px">'+d+'</td></tr>').join('');
  return `
    <div class="page-header"><h2>Acessos</h2><p>Gerencie os usuários e consulte os perfis e tipos de cadastro. Apenas o Master vê esta página.</p></div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Novo usuário</div>
      <div class="form-grid">
        <div class="fg"><label>Nome</label><input type="text" id="usr-nome"></div>
        <div class="fg"><label>E-mail (login)</label><input type="email" id="usr-email" placeholder="nome@udiaco.com.br"></div>
        <div class="fg"><label>Senha inicial</label><input type="text" id="usr-senha" placeholder="mínimo 6 caracteres"></div>
        <div class="fg"><label>Papel</label><select id="usr-papel">${opts}</select></div>
      </div>
      <div class="btn-row"><button class="btn btn-primary" onclick="criarUsuario()">Criar usuário</button></div>
      <div id="usr-msg" style="margin-top:8px"></div>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Usuários com acesso</div>
      <div id="usr-lista">Carregando...</div>
    </div>
    <div style="display:flex;gap:14px;flex-wrap:wrap">
      <div class="card" style="flex:1;min-width:300px;margin-bottom:0">
        <div class="card-title">Perfis de acesso (referência)</div>
        <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:var(--surface2)"><th style="padding:7px 10px;text-align:left">Perfil</th><th style="padding:7px 10px;text-align:left">Escopo</th><th style="padding:7px 10px;text-align:center">Gerencia acessos</th></tr></thead>
          <tbody>${perfisRows}</tbody></table></div>
      </div>
      <div class="card" style="flex:1;min-width:280px;margin-bottom:0">
        <div class="card-title">Tipos de cadastro (referência)</div>
        <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:var(--surface2)"><th style="padding:7px 10px;text-align:left">Tipo</th><th style="padding:7px 10px;text-align:left">Descrição</th></tr></thead>
          <tbody>${tiposRows}</tbody></table></div>
      </div>
    </div>`;
}

async function renderUsuarios(){
  const el=document.getElementById('usr-lista'); if(!el) return;
  el.innerHTML='Carregando...';
  let docs=[];
  try{ const snap=await window._getDocs(window._col('usuarios')); snap.forEach(d=>docs.push(Object.assign({_id:d.id},d.data()))); }
  catch(e){ el.innerHTML='<div class="alert alert-error">Erro: '+e.message+'</div>'; return; }
  docs.sort((a,b)=>String(a.nome||a._id).localeCompare(String(b.nome||b._id)));
  if(!docs.length){ el.innerHTML='<div class="text-sm text-muted">Nenhum usuário cadastrado ainda.</div>'; return; }
  const opts=p=>Object.keys(PAPEIS).map(k=>'<option value="'+k+'" '+(p===k?'selected':'')+'>'+PAPEIS[k].label+'</option>').join('');
  el.innerHTML='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Empresas</th><th>Status</th><th>Ações</th></tr></thead><tbody>'
    +docs.map(u=>{
      const pi=PAPEIS[u.papel]; const esc=pi?(pi.escopo==='all'?'Todas':(pi.empresas||[]).join(', ')):'—';
      const ativo=u.ativo!==false;
      return '<tr><td>'+(u.nome||'—')+'</td><td class="text-xs">'+u._id+'</td>'
        +'<td><select onchange="alterarPapelUsuario(\''+u._id+'\',this.value)" style="font-size:12px;padding:4px 6px;border:1.5px solid var(--border);border-radius:var(--radius-sm)">'+opts(u.papel)+'</select></td>'
        +'<td class="text-xs text-muted" style="max-width:220px">'+esc+'</td>'
        +'<td>'+(ativo?'<span class="badge badge-green">Ativo</span>':'<span class="badge badge-gray">Inativo</span>')+'</td>'
        +'<td style="white-space:nowrap">'
          +'<button class="btn btn-ghost btn-xs" onclick="resetSenhaUsuario(\''+u._id+'\')">Redefinir senha</button> '
          +'<button class="btn btn-ghost btn-xs" onclick="toggleAtivoUsuario(\''+u._id+'\','+(!ativo)+')">'+(ativo?'Desativar':'Ativar')+'</button> '
          +'<button class="btn btn-danger btn-xs" onclick="excluirUsuario(\''+u._id+'\')">Excluir</button>'
        +'</td></tr>';
    }).join('')+'</tbody></table></div>';
}

async function criarUsuario(){
  if(!podeGerenciarUsuarios()){ toast('Sem permissão','error'); return; }
  const nome=document.getElementById('usr-nome')?.value.trim()||'';
  const email=(document.getElementById('usr-email')?.value||'').toLowerCase().trim();
  const senha=document.getElementById('usr-senha')?.value||'';
  const papel=document.getElementById('usr-papel')?.value||'';
  const msg=document.getElementById('usr-msg');
  const showErr=t=>{ if(msg) msg.innerHTML='<div class="alert alert-error">'+t+'</div>'; };
  if(!email||!email.includes('@')){ showErr('E-mail inválido.'); return; }
  if(senha.length<6){ showErr('A senha deve ter ao menos 6 caracteres.'); return; }
  if(!PAPEIS[papel]){ showErr('Selecione um papel.'); return; }
  if(msg) msg.innerHTML='<div class="alert alert-info">Criando usuário...</div>';
  try{
    await window._criarUsuarioAuth(email,senha); // cria login sem deslogar o Master
  }catch(e){
    if(!String(e.message||e).includes('email-already-in-use')){ showErr('Erro ao criar login: '+e.message); return; }
  }
  try{
    await window._setDoc(window._doc('usuarios',email),{email,nome:nome||email,papel,ativo:true});
    if(msg) msg.innerHTML='<div class="alert alert-success">Usuário liberado: '+email+'</div>';
    ['usr-nome','usr-email','usr-senha'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
    renderUsuarios();
  }catch(e){ showErr('Erro ao salvar papel: '+e.message); }
}

async function alterarPapelUsuario(email,papel){
  if(!podeGerenciarUsuarios()||!PAPEIS[papel]) return;
  try{ await window._setDoc(window._doc('usuarios',email),{papel},{merge:true}); toast('Papel atualizado','success'); renderUsuarios(); }
  catch(e){ toast('Erro: '+e.message,'error'); }
}

async function toggleAtivoUsuario(email,ativo){
  if(!podeGerenciarUsuarios()) return;
  if(!ativo && (email===usuarioAtual?.email||MASTER_BOOTSTRAP.includes(email))){ toast('Não é possível desativar este usuário.','error'); return; }
  try{ await window._setDoc(window._doc('usuarios',email),{ativo},{merge:true}); toast(ativo?'Ativado':'Desativado','success'); renderUsuarios(); }
  catch(e){ toast('Erro: '+e.message,'error'); }
}

// Master dispara o e-mail de redefinicao para qualquer usuario cadastrado.
async function resetSenhaUsuario(email){
  if(!podeGerenciarUsuarios()) return;
  if(!confirm('Enviar e-mail de redefinição de senha para '+email+'?')) return;
  try{
    await window._resetSenha(email);
    toast('E-mail de redefinição enviado para '+email,'success');
  }catch(e){
    toast('Erro ao enviar: '+(e.code||e.message),'error');
  }
}

async function excluirUsuario(email){
  if(!podeGerenciarUsuarios()) return;
  if(email===usuarioAtual?.email){ toast('Você não pode excluir o próprio acesso.','error'); return; }
  if(MASTER_BOOTSTRAP.includes(email)){ toast('Este Master não pode ser removido.','error'); return; }
  if(!confirm('Excluir o acesso de '+email+'?\n(A conta de login continua existindo, mas sem acesso ao sistema.)')) return;
  try{ await window._deleteDoc(window._doc('usuarios',email)); toast('Acesso removido.','success'); renderUsuarios(); }
  catch(e){ toast('Erro: '+e.message,'error'); }
}

function pgTesteSenior(){
  return `
    <div class="page-header">
      <h2>Teste de Conexao - Web Service Senior</h2>
      <p>Testa a conectividade direta com o servico SOAP da Senior (getEmpresa).</p>
    </div>
    <div class="card">
      <div class="card-title">Credenciais</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px">
        <div class="fg"><label>Usuario</label>
          <input type="text" id="senior-user" placeholder="ex: ahmad.samir"
            style="padding:8px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px;min-width:200px">
        </div>
        <div class="fg"><label>Senha</label>
          <input type="password" id="senior-pass" placeholder="senha"
            style="padding:8px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px;min-width:200px">
        </div>
      </div>
      <button class="btn btn-primary" onclick="testarConexaoSenior()">Testar Conexao</button>
      <div id="senior-test-result" style="margin-top:14px"></div>
    </div>`;
}

// ── Filtro de busca na tabela de ferias ──────────────────────────
function filtrarTabelaFerias(){
  const q=(document.getElementById('fer-q')?.value||'').toLowerCase();
  const rows=document.querySelectorAll('#fer-tabela tbody tr');
  rows.forEach(row=>{
    const txt=row.textContent.toLowerCase();
    row.style.display = (!q||txt.includes(q)) ? '' : 'none';
  });
}

// ════════════════════════════════════════════════════════════════
// FERIAS AGENDADAS — visao por mes
// ════════════════════════════════════════════════════════════════
function pgFeriasAgendadas(){
  return `
    <div class="page-header">
      <h2 class="page-title">Férias Agendadas</h2>
      <p class="page-subtitle">Quem está com férias agendadas em cada mês. Clique num colaborador para ver/editar.</p>
    </div>
    <div class="filter-bar" style="align-items:flex-end;margin-bottom:16px">
      <div class="filter-group" style="flex:1"><label>Buscar</label>
        <input type="text" id="feragd-q" placeholder="Nome, matrícula ou departamento..." oninput="renderFeriasAgendadas()"></div>
      <div class="filter-group"><label>Empresa</label>${msDropdown('faemp','Empresa',getEmpresaList().map(e=>({value:e.cod,label:_empresaLabel(e.cod)})),'renderFeriasAgendadas')}</div>
      <div class="filter-group"><label>Departamento</label>${msDropdown('fadep','Departamento',getDeptoList().map(d=>({value:d,label:d})),'renderFeriasAgendadas')}</div>
      <div class="filter-group"><label>Função</label>${msDropdown('fafunc','Função',getFuncaoList().map(f=>({value:f,label:f})),'renderFeriasAgendadas')}</div>
      <div class="filter-group"><label>Situação</label>${msDropdown('fasit','Situação',[{value:'agendado',label:'Agendado'},{value:'sem_mes',label:'Sem mês definido'},{value:'afastado',label:'Afastado'},{value:'nao_aplica',label:'Não se aplica'}],'renderFeriasAgendadas')}</div>
      <div class="filter-group"><label>Vencimento</label>${msDropdown('favenc','Vencimento',[{value:'vermelho',label:'Vencido'},{value:'laranja',label:'Vence ≤3m'},{value:'amarelo',label:'Vence 4-6m'},{value:'verde',label:'Vence +6m'},{value:'sem',label:'Sem dados'},{value:'na',label:'N/A'}],'renderFeriasAgendadas')}</div>
      <div class="filter-group"><label>Agendamento</label>${msDropdown('faagend','Agendamento',[{value:'ok',label:'No prazo'},{value:'bad',label:'Fora do prazo'},{value:'none',label:'Sem agendamento'}],'renderFeriasAgendadas')}</div>
      <div class="filter-group"><label>Mês agendado</label>${msDropdown('fames','Mês agendado',MESES_FER.map(m=>({value:m,label:m})),'renderFeriasAgendadas')}</div>
      <button class="btn btn-ghost btn-sm" onclick="exportarFeriasAgendadasExcel()"><i class="ti ti-file-spreadsheet"></i> Excel</button>
    </div>
    <div id="feragd-resumo" style="margin-bottom:14px"></div>
    <div id="feragd-grid"></div>
    <div id="feragd-sem" style="margin-top:20px"></div>`;
}

// Situacao de agendamento de ferias (categorias exclusivas):
//   nao_aplica -> nao elegivel a ferias (socio/consultor com ferias off)
//   afastado   -> status do grupo "so_cesta" (Afastado, Aux. Doenca, etc.)
//   agendado   -> tem mes de ferias definido (ferMes)
//   sem_mes    -> elegivel e trabalhando, mas sem mes definido
function _sitAgenda(c){
  if(c.elegibilidade?.ferias===false) return 'nao_aplica';
  if(statusGrupo(c.status)==='so_cesta') return 'afastado';
  return c.ferMes ? 'agendado' : 'sem_mes';
}

function renderFeriasAgendadas(){
  bindMsOutside();
  updateMsCounts();
  const meses=['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const q=(document.getElementById('feragd-q')?.value||'').toLowerCase().trim();
  const empF=getMs('faemp');   // empresa (prefixo da matricula)
  const depF=getMs('fadep');   // departamento
  const funcF=getMs('fafunc'); // funcao
  const sitF=getMs('fasit');   // situacao de agendamento
  const corF=getMs('favenc');  // situacao de vencimento (cor do farol)
  const agF=getMs('faagend');  // status do agendamento (ok/bad/none)
  const mesF=getMs('fames');   // mes de agendamento

  // Pessoa unica (dedup por CPF; mantem o cadastro principal) — evita duplicidade
  // CLT + MEI/Socio. Demitidos / N/A EXCLUIDOS (statusGrupo pega variacoes de escrita).
  let base=colaboradoresUnicos().filter(c=>statusGrupo(c.status)!=='nao_recebe' && _statusKey(c.status)!=='INATIVO');
  if(empF.length)  base=base.filter(c=>_empresaMatch(c,empF));
  if(depF.length)  base=base.filter(c=>depF.includes(c.depto||''));
  if(funcF.length) base=base.filter(c=>funcF.includes(funcaoColab(c)));
  if(q) base=base.filter(c=>
    (c.nome||'').toLowerCase().includes(q) ||
    (c.mat||'').toLowerCase().includes(q) ||
    (c.depto||'').toLowerCase().includes(q)
  );
  if(sitF.length) base=base.filter(c=>sitF.includes(_sitAgenda(c)));
  if(corF.length) base=base.filter(c=>corF.includes(getFarol(c).cor));
  if(mesF.length) base=base.filter(c=>mesF.includes(c.ferMes||''));
  if(agF.length)  base=base.filter(c=>agF.includes(_agKey(c,getFarol(c).vencDate)));

  const agendados =base.filter(c=>_sitAgenda(c)==='agendado');
  const afastados =base.filter(c=>_sitAgenda(c)==='afastado');
  const naoAplicam=base.filter(c=>_sitAgenda(c)==='nao_aplica');
  const semAgenda =base.filter(c=>_sitAgenda(c)==='sem_mes');

  // Reordena os meses comecando pelo mes atual (visao "proximos meses primeiro")
  const mesAtualIdx=new Date().getMonth();
  const mesesOrdenados=[...meses.slice(mesAtualIdx),...meses.slice(0,mesAtualIdx)];

  // Resumo em cards (mesmo padrao visual do Radar de Ferias):
  // agendadas · afastados · nao se aplicam · pendentes (sem mes)
  const resumoEl=document.getElementById('feragd-resumo');
  if(resumoEl){
    resumoEl.innerHTML='<div class="stat-grid">'
      +_dsStat('circle-check','success',agendados.length,'Com férias agendadas')
      +_dsStat('first-aid-kit','warning',afastados.length,'Afastados')
      +_dsStat('circle-minus','neutral',naoAplicam.length,'Não se aplicam')
      +_dsStat('alert-triangle','danger',semAgenda.length,'Pendentes')
      +'</div>';
  }

  // Grid por mes (kanban) — apenas os AGENDADOS
  const grid=document.getElementById('feragd-grid');
  if(grid){
    grid.innerHTML='<div style="display:grid;grid-template-columns:repeat(12,minmax(150px,1fr));gap:10px;align-items:start;overflow-x:auto;padding-bottom:6px">'
      +mesesOrdenados.map(mes=>{
        const itens=agendados.filter(c=>c.ferMes===mes).sort((a,b)=>a.nome.localeCompare(b.nome));
        const isAtual=meses[mesAtualIdx]===mes;
        const cor=isAtual?'var(--blue)':'var(--text3)';
        const bg=isAtual?'var(--blue-light)':'var(--surface2)';
        return '<div style="background:'+bg+';border:1.5px solid '+cor+'33;border-radius:var(--radius);padding:10px;min-height:120px">'
          +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:8px;border-bottom:1.5px solid '+cor+'33">'
          +'<span style="font-size:12px;font-weight:700;color:'+cor+'">'+mes.substring(0,3)+(isAtual?' •':'')+'</span>'
          +'<span style="background:'+cor+';color:#fff;font-size:12px;font-weight:700;border-radius:20px;padding:2px 9px;min-width:24px;text-align:center">'+itens.length+'</span>'
          +'</div>'
          +'<div style="display:flex;flex-direction:column;gap:6px;max-height:480px;overflow-y:auto">'
          +(itens.length===0
            ? '<div class="text-xs text-muted" style="padding:4px 2px">—</div>'
            : itens.map(c=>{
                const f=getFarol(c);
                const corMap={verde:'var(--green)',amarelo:'var(--yellow)',laranja:'var(--orange)',vermelho:'var(--red)',sem:'var(--text3)',na:'#9CA3AF'};
                const saldo=(c.ferSaldo!=null?c.ferSaldo:f.dias);
                const dd=f.vencDate?(String(f.vencDate.getDate()).padStart(2,'0')+'/'+String(f.vencDate.getMonth()+1).padStart(2,'0')+'/'+String(f.vencDate.getFullYear()).slice(-2)):'';
                const vencTxt=f.cor==='sem'?'Sem venc.':(f.meses<0?'Venceu '+dd:'Vence '+dd);
                return '<div class="rad-card" onclick="abrirDetalheFerias(\''+c._id+'\')" title="Clique para ver/editar">'
                  +'<div class="rad-card__top"><span class="rad-card__name">'+c.nome+'</span>'
                    +'<span class="rad-saldo'+(saldo<0?' neg':'')+'" title="Saldo de dias">'+saldo+'d</span></div>'
                  +'<div class="rad-venc" style="color:'+corMap[f.cor]+'">'+vencTxt+'</div>'
                  +(c.depto?'<div class="rad-agend">'+c.depto+'</div>':'')
                  +'</div>';
              }).join(''))
          +'</div></div>';
      }).join('')
      +'</div>';
  }

  // Lista de baixo: DOIS campos separados. Demitidos nao entram em nenhum.
  //   1) Sem ferias agendadas (pendentes, sem mes definido)
  //   2) Afastados (Afastado, Aux. Doenca, Acidente Trabalho, etc.) com tag do status
  const semEl=document.getElementById('feragd-sem');
  if(semEl){
    // Monta uma tabela para uma lista. tipo='afastado' inclui a coluna Situacao.
    const tabela=(titulo, lista, tipo)=>{
      if(!lista.length) return '';
      const temSit = tipo==='afastado';
      const acao = tipo==='afastado' ? 'Detalhes' : 'Agendar';
      return '<div class="section-label" style="margin:0 0 8px">'+titulo+' ('+lista.length+')</div>'
        +'<div style="overflow-x:auto;border-radius:var(--radius);border:1px solid var(--border);margin-bottom:22px">'
        +'<table class="tbl" style="width:100%;border-collapse:collapse;font-size:12px">'
        +'<thead><tr>'
        +'<th style="padding:8px 10px;text-align:left">Colaborador</th>'
        +'<th style="padding:8px 10px;text-align:left">Cargo</th>'
        +'<th style="padding:8px 10px;text-align:left">Departamento</th>'
        +(temSit?'<th style="padding:8px 10px;text-align:left">Situação</th>':'')
        +'<th style="padding:8px 10px;text-align:center">Ações</th>'
        +'</tr></thead><tbody>'
        +lista.slice().sort((a,b)=>a.nome.localeCompare(b.nome)).map(c=>{
          let sitCell='';
          if(temSit){ sitCell='<td style="padding:8px 10px"><span class="badge badge--danger">'+getStatusInfo(c.status).label+'</span></td>'; }
          return '<tr>'
            +'<td style="padding:8px 10px"><div style="font-weight:500">'+c.nome+'</div><div class="text-xs text-muted"><code style="font-size:10px">'+(c.mat||'—')+'</code></div></td>'
            +'<td style="padding:8px 10px;font-size:11px;color:var(--text2)">'+(c.cargo||'—')+'</td>'
            +'<td style="padding:8px 10px;font-size:11px;color:var(--text2)">'+(c.depto||'—')+'</td>'
            +sitCell
            +'<td style="padding:8px 10px;text-align:center"><button class="btn btn-ghost btn-sm" onclick="abrirDetalheFerias(\''+c._id+'\')">'+acao+'</button></td>'
            +'</tr>';
        }).join('')+'</tbody></table></div>';
    };
    semEl.innerHTML = tabela('Sem férias agendadas', semAgenda, 'sem_mes')
                    + tabela('Afastados', afastados, 'afastado');
  }
}

function exportarFeriasAgendadasExcel(){
  const meses=['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  // Mesma base da tela: pessoa unica, sem demitidos/N/A/Inativo.
  const base=colaboradoresUnicos().filter(c=>statusGrupo(c.status)!=='nao_recebe' && _statusKey(c.status)!=='INATIVO');
  const rows=[['Situacao','Mes Agendado','Matricula','Nome','CPF','Cargo','Departamento','Saldo (dias)','Vencimento']];
  const ordem={agendado:0,sem_mes:1,afastado:2,nao_aplica:3};
  base.slice().sort((a,b)=>{
    const sa=_sitAgenda(a), sb=_sitAgenda(b);
    if(ordem[sa]!==ordem[sb]) return ordem[sa]-ordem[sb];
    if(sa==='agendado'){ const ia=meses.indexOf(a.ferMes), ib=meses.indexOf(b.ferMes); if(ia!==ib) return ia-ib; }
    return a.nome.localeCompare(b.nome);
  }).forEach(c=>{
    const f=getFarol(c);
    const sit=_sitAgenda(c);
    const sitTxt = sit==='afastado' ? getStatusInfo(c.status).label
                 : sit==='agendado' ? 'Agendado'
                 : sit==='sem_mes'  ? 'Sem mes definido' : 'Nao se aplica';
    rows.push([sitTxt, sit==='agendado'?(c.ferMes||''):'', c.mat||'', c.nome, c.cpf||'', c.cargo||'', c.depto||'', c.ferSaldo!=null?c.ferSaldo:f.dias, f.vencStr]);
  });
  const wb=XLSX.utils.book_new();
  const ws=XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb,ws,'Ferias Agendadas');
  XLSX.writeFile(wb,'Ferias_Agendadas.xlsx');
  toast('✅ Excel gerado!','success');
}

// ── Alertas mensais no topo do Radar de Ferias ───────────────────
function renderAlertasFeriasMes(dados){
  const el=document.getElementById('fer-alertas-mes');
  if(!el) return;

  const vencidas=dados.filter(c=>['amarelo','laranja','vermelho'].includes(c.farol.cor));
  const aVencer=dados.filter(c=>{
    if(!c.ferVenc||c.farol.cor!=='verde') return false;
    const venc=new Date(c.ferVenc);
    const hoje=new Date();
    const diffMeses=(venc-hoje)/(1000*60*60*24*30);
    return diffMeses<=2 && diffMeses>=0; // vence nos proximos 2 meses
  });

  const mesAtualNome=['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][new Date().getMonth()];
  const agendadosMes=dados.filter(c=>c.ferMes===mesAtualNome);

  if(vencidas.length===0 && aVencer.length===0 && agendadosMes.length===0){
    el.innerHTML='';
    return;
  }

  let html='<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">';

  if(vencidas.length>0){
    html+='<div style="background:#FEF2F2;border:1.5px solid #FECACA;border-radius:var(--radius);padding:10px 14px;font-size:13px;color:#991B1B">'
      +'<strong>'+vencidas.length+' colaborador(es) com ferias vencidas</strong> ou a vencer em breve. Verifique o Kanban abaixo.'
      +'</div>';
  }

  if(aVencer.length>0){
    html+='<div style="background:#FEFCE8;border:1.5px solid #FDE68A;border-radius:var(--radius);padding:10px 14px;font-size:13px;color:#92400E">'
      +'<strong>'+aVencer.length+' colaborador(es)</strong> terao ferias vencendo nos proximos 2 meses: '
      +aVencer.map(c=>c.nome.split(' ')[0]+' '+c.nome.split(' ').slice(-1)[0]).join(', ')
      +'</div>';
  }

  if(agendadosMes.length>0){
    html+='<div style="background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:var(--radius);padding:10px 14px;font-size:13px;color:#1E3A8A">'
      +'<strong>'+agendadosMes.length+' colaborador(es) agendados para tirar ferias em '+mesAtualNome+':</strong> '
      +agendadosMes.map(c=>c.nome.split(' ')[0]+' '+c.nome.split(' ').slice(-1)[0]).join(', ')
      +'</div>';
  }

  html+='</div>';
  el.innerHTML=html;
}

// ── Sugestao de mes para novo colaborador ─────────────────────────
// Chamada ao salvar um NOVO colaborador (cadastro). Baseada na FUNCAO.
function sugerirMesFeriasNovo(funcao){
  const fn=(funcao||'').trim().toUpperCase();
  if(!fn) return null;
  // Buscar colaboradores da mesma funcao que tem mes agendado
  const mesmosCargo=colaboradores.filter(c=>
    funcaoColab(c)===fn &&
    c.ferMes &&
    !STATUS_NAO_RECEBE.includes(c.status)
  );
  if(mesmosCargo.length===0) return null;
  // Retornar o mes mais comum entre eles
  const contagem={};
  mesmosCargo.forEach(c=>{ contagem[c.ferMes]=(contagem[c.ferMes]||0)+1; });
  const maisComum=Object.entries(contagem).sort((a,b)=>b[1]-a[1])[0];
  return maisComum ? maisComum[0] : null;
}

// ── Sucessao de vaga (ponto 4.3) ─────────────────────────────────
// Quando um colaborador e marcado como Demitido, guarda o mes de ferias
// vago para sugerir ao substituto da mesma funcao. Salvo no Firebase
// na colecao 'config', doc 'feriasVagas'.
async function registrarVagaFerias(colab){
  const func=funcaoColab(colab);
  if(!colab.ferMes || !func) return;
  try{
    const key=func+'|'+(colab.depto||'');
    const snap=await window._getDoc(window._doc('config','feriasVagas'));
    const vagas=snap.exists()?(snap.data().vagas||{}):{};
    vagas[key]=colab.ferMes;
    await fsSet('config','feriasVagas',{vagas});
  }catch(e){ console.error('Erro ao registrar vaga:', e); }
}

async function consultarVagaFerias(funcao, depto){
  try{
    const key=(funcao||'').trim().toUpperCase()+'|'+(depto||'');
    const snap=await window._getDoc(window._doc('config','feriasVagas'));
    if(!snap.exists()) return null;
    const vagas=snap.data().vagas||{};
    return vagas[key]||null;
  }catch(e){ return null; }
}

// ============================================================
// ASSISTENTE: ATUALIZAR BASE (passo a passo)
// ============================================================
const WIZ_STEPS=[
  {id:'contratacoes', label:'Contratações', icon:'<i class="ti ti-user-plus"></i>'},
  {id:'demissoes',    label:'Demissões',    icon:'<i class="ti ti-user-minus"></i>'},
  {id:'afastados',    label:'Afastados',    icon:'<i class="ti ti-first-aid-kit"></i>'},
  {id:'ferias',       label:'Férias',       icon:'<i class="ti ti-umbrella"></i>'},
];
const WIZ_META={
  contratacoes:'Adicione novos colaboradores, individualmente ou em lote.',
  demissoes:'Selecione quem foi desligado — o status muda para Demitido.',
  afastados:'Reative quem voltou e registre novos afastamentos.',
  ferias:'Retornos, entradas do mês, férias coletivas e ajustes de saldo.',
};
let wizState=null;

function abrirAtualizarBase(){
  wizState={idx:0, mode:'intro', contMode:'menu',
    demSel:new Set(), afaReSel:new Set(), afaAddSel:new Set(),
    rev:{}, doneDem:[], doneAfa:[], contBaseline:null,
    demConfirmar:false, afaConfirmar:null, afaMotivo:'',
    ferTab:'retorno', ferAnivDone:false, ferMesRef:null,
    entFeitos:new Set(), retFeitos:new Set()};
  if(!document.getElementById('wiz-overlay')){
    const ov=document.createElement('div');
    ov.id='wiz-overlay';
    ov.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.55);display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow-y:auto';
    document.body.appendChild(ov);
  }
  renderWizard();
}
function fecharWizard(concluido){
  document.getElementById('wiz-overlay')?.remove();
  wizState=null;
  if(currentPage==='base-lista') renderColabList();
  if(concluido) toast('Atualização da base concluída!','success');
}
function wizSeguir(){ wizState.mode='work'; wizState.contMode='menu'; renderWizard(); }
function wizPular(){ wizAvancar(); }
function wizAvancar(){
  if(wizState.idx < WIZ_STEPS.length-1){ wizState.idx++; wizState.mode='intro'; renderWizard(); }
  else { wizState.mode='fim'; renderWizard(); }
}
function wizContModo(m){ wizState.contMode=m; renderWizard(); }
function wizToggle(setName,id){
  const s=wizState[setName]; if(s.has(id)) s.delete(id); else s.add(id);
  const map={demSel:'dem',afaReSel:'afaRe',afaAddSel:'afaAdd'}; wizUpdSelCount(map[setName]);
}
function wizUpdSelCount(key){
  const map={dem:['demSel','wiz-dem-count'],afaRe:['afaReSel','wiz-afare-count'],afaAdd:['afaAddSel','wiz-afaadd-count']};
  const cfg=map[key]; if(!cfg) return;
  const el=document.getElementById(cfg[1]); if(!el) return;
  const n=wizState[cfg[0]].size;
  el.textContent = n ? (n+' selecionado'+(n>1?'s':'')) : '';
}

function wizPanel(title, right, body){
  return '<div class="wiz-panel"><div class="wiz-panel__head"><div class="wiz-panel__title">'+title+'</div>'+(right||'<span></span>')+'</div>'
    +'<div class="wiz-panel__body">'+body+'</div></div>';
}
function wizSearchHTML(id,ph){
  const cb={'wiz-dem-q':'wizRenderDemList','wiz-afare-q':'wizRenderAfaReList','wiz-afaadd-q':'wizRenderAfaAddList','ent-q':'wizFerRenderEntList','aj-q':'wizFerAjusteList'}[id];
  return '<div class="wiz-search"><i class="ti ti-search"></i>'
    +'<input type="text" id="'+id+'" class="wiz-input" placeholder="'+ph+'" oninput="'+cb+'()"></div>';
}

function renderWizard(){
  const ov=document.getElementById('wiz-overlay'); if(!ov||!wizState) return;
  const step=WIZ_STEPS[wizState.idx];
  const stepper=WIZ_STEPS.map((s,i)=>{
    const done=(wizState.mode==='fim')||i<wizState.idx, cur=wizState.mode!=='fim'&&i===wizState.idx;
    const bg=(cur||done)?'var(--brand)':'#E5E7EB';
    const col=(cur||done)?'#fff':'#6B7280';
    return '<div style="display:flex;align-items:center;gap:6px">'
      +'<div style="width:28px;height:28px;border-radius:50%;background:'+bg+';color:'+col+';display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700">'+(done?'✓':(i+1))+'</div>'
      +'<span style="font-size:12px;font-weight:'+(cur?'700':'500')+';color:'+(cur?'var(--text)':'var(--text2)')+'">'+s.label+'</span>'
      +(i<WIZ_STEPS.length-1?'<span style="width:20px;height:2px;background:'+(done?'var(--brand)':'#E5E7EB')+';margin:0 2px"></span>':'')
      +'</div>';
  }).join('');
  const body = wizState.mode==='intro' ? wizIntroHTML(step) : (wizState.mode==='fim' ? wizFinalizarHTML() : wizWorkHTML(step));
  ov.innerHTML='<div class="ds" style="background:var(--surface,#fff);border-radius:16px;max-width:940px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3);overflow:hidden;margin:auto">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;padding:15px 22px;background:var(--brand);color:#fff">'
      +'<div style="font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px"><i class="ti ti-refresh"></i> Atualizar Base'
        +(wizState.mode==='work'?'<span style="opacity:.85;font-weight:500;font-size:14px"> · '+step.label+'</span>':'')+'</div>'
      +'<button onclick="fecharWizard(false)" title="Fechar" style="background:transparent;border:none;color:#fff;font-size:24px;cursor:pointer;line-height:1">&times;</button>'
    +'</div>'
    +'<div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;padding:14px 22px;border-bottom:1px solid var(--border);background:var(--surface2,#F8F9FB)">'+stepper+'</div>'
    +'<div style="padding:22px;max-height:66vh;overflow-y:auto">'+body+'</div>'
    +'</div>';
  if(wizState.mode==='work'){
    if(step.id==='contratacoes'){
      if(!wizState.contBaseline) wizState.contBaseline=new Set(colaboradores.map(c=>c._id));
      if(wizState.contMode==='individual'){ try{ initDeptoAutocomplete('f'); initFormDisplay('f'); }catch(e){} }
    }
    if(step.id==='demissoes' && !wizState.rev.demissoes && !wizState.demConfirmar) wizRenderDemList();
    if(step.id==='afastados' && !wizState.rev.afastados && !wizState.afaConfirmar){ wizRenderAfaReList(); wizRenderAfaDefList(); wizRenderAfaAddList(); }
    if(step.id==='ferias'){
      if(!wizState.ferAnivDone){ wizState.ferAnivDone=true; wizRodarAniversarios(); }
      wizFerRenderBody();
    }
  }
}

function wizIntroHTML(step){
  return '<div style="text-align:center;padding:26px 10px">'
    +'<div class="wiz-intro-ic">'+step.icon+'</div>'
    +'<h3 class="wiz-intro-title">Etapa: '+step.label+'</h3>'
    +'<p class="wiz-intro-sub">'+WIZ_META[step.id]+'</p>'
    +'<p class="wiz-intro-q">Deseja seguir com esta etapa ou pular para a próxima?</p>'
    +'<div class="wiz-actions" style="justify-content:center">'
      +'<button class="btn btn-ghost" onclick="wizPular()">Pular etapa</button>'
      +'<button class="btn btn-primary" onclick="wizSeguir()">Seguir &raquo;</button>'
    +'</div></div>';
}
function wizFooter(){
  const ultima = wizState.idx===WIZ_STEPS.length-1;
  return '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:6px;padding-top:16px;border-top:1px solid var(--border)">'
    +'<button class="btn btn-ghost" onclick="fecharWizard(false)">Salvar e encerrar</button>'
    +'<button class="btn btn-primary" onclick="wizAvancar()">'+(ultima?'Concluir':'Salvar e seguir &raquo;')+'</button>'
    +'</div>';
}
function wizFinalizarHTML(){
  const now=new Date(); const anoAtual=now.getFullYear();
  const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const mesSel='<select id="wiz-fim-mes" class="wiz-sel">'+meses.map((m,i)=>'<option value="'+String(i+1).padStart(2,'0')+'" '+(i===now.getMonth()?'selected':'')+'>'+m+'</option>').join('')+'</select>';
  const anoSel='<select id="wiz-fim-ano" class="wiz-sel">'+[anoAtual-1,anoAtual,anoAtual+1].map(a=>'<option value="'+a+'" '+(a===anoAtual?'selected':'')+'>'+a+'</option>').join('')+'</select>';
  return '<div style="text-align:center;padding:8px 10px 4px"><div class="wiz-intro-ic"><i class="ti ti-circle-check"></i></div>'
    +'<h3 class="wiz-intro-title">Atualização concluída!</h3>'
    +'<p class="wiz-intro-sub">Escolha a competência e salve esta versão da base — ela ficará disponível na aba <strong>Bases Salvas</strong>.</p></div>'
    + wizPanel('<i class="ti ti-device-floppy"></i> Salvar base','',
        '<div class="wiz-fields" style="margin-top:0">'
        +'<div class="wiz-field"><label>Mês (competência)</label>'+mesSel+'</div>'
        +'<div class="wiz-field"><label>Ano</label>'+anoSel+'</div>'
        +'<div class="wiz-field"><label>Registros</label><div class="wiz-val">'+colaboradores.length+' colaboradores</div></div>'
        +'</div>')
    + '<div class="wiz-actions" style="justify-content:flex-end;border-top:1px solid var(--border);padding-top:16px">'
    + '<button class="btn btn-ghost" onclick="fecharWizard(false)">Encerrar sem salvar</button>'
    + '<button class="btn btn-primary" onclick="wizSalvarBaseFinal()"><i class="ti ti-device-floppy"></i> Salvar base</button></div>';
}
async function wizSalvarBaseFinal(){
  const mes=document.getElementById('wiz-fim-mes')?.value||'';
  const ano=document.getElementById('wiz-fim-ano')?.value||'';
  const ok=await salvarBaseComp(mes+'/'+ano, true);
  if(ok){ fecharWizard(false); toast('Base de '+mes+'/'+ano+' salva em Bases Salvas.','success'); }
}
function wizWorkHTML(step){
  let inner='';
  if(step.id==='contratacoes') inner=wizContratacoesHTML();
  else if(step.id==='demissoes') inner=wizDemissoesHTML();
  else if(step.id==='afastados') inner=wizAfastadosHTML();
  else if(step.id==='ferias') inner=wizFeriasHTML();
  return '<p class="wiz-desc">'+WIZ_META[step.id]+'</p>'+inner+wizFooter();
}

function wizRow(setName,c){
  const checked=wizState[setName].has(c._id)?'checked':'';
  return '<label class="wiz-item">'
    +'<input type="checkbox" '+checked+' onchange="wizToggle(\''+setName+'\',\''+c._id+'\')">'
    +'<span class="wiz-item__main"><span class="wiz-item__name">'+c.nome+'</span> '
      +'<span class="wiz-item__sub">'+(c.mat||'—')+' &middot; '+(c.depto||'—')+'</span></span>'
    +dsStatusBadge(c.status)
    +'</label>';
}
function wizBusca(c,q){
  return (c.nome||'').toLowerCase().includes(q)||(c.mat||'').toLowerCase().includes(q)||(c.depto||'').toLowerCase().includes(q);
}
function wizConfItem(id,c,tipo){
  return '<div class="wiz-item"><span class="wiz-item__main"><span class="wiz-item__name">'+c.nome+'</span> '
    +'<span class="wiz-item__sub">'+(c.mat||'—')+' &middot; '+(c.depto||'—')+'</span></span>'
    +dsStatusBadge(c.status)
    +'<button class="btn btn-ghost btn-sm" onclick="'+tipo+'"><i class="ti ti-x"></i> Excluir</button></div>';
}

// ── Revisao pos-acao (Demissoes / Afastados) ─────────────────────
function wizRevHTML(step){
  const done = step==='demissoes'?wizState.doneDem:wizState.doneAfa;
  const rows = done.length ? done.map((e,i)=>
      '<div class="wiz-item"><span class="wiz-item__main"><span class="wiz-item__name">'+e.nome+'</span> '
        +(e.info?'<span class="wiz-item__sub">'+e.info+'</span>':'')+'</span>'
      +dsStatusBadge(e.para)
      +'<button class="btn btn-ghost btn-sm" onclick="wizDesfazer(\''+step+'\','+i+')"><i class="ti ti-arrow-back-up"></i> Desfazer</button></div>').join('')
    : '<div class="wiz-empty">Nada registrado nesta etapa.</div>';
  return '<div class="alert alert-success" style="margin-bottom:14px"><i class="ti ti-circle-check"></i> <strong>'+done.length+'</strong> registrado(s) nesta etapa. Desfaça algum ou adicione mais antes de seguir.</div>'
    + wizPanel('<i class="ti ti-list-check"></i> Registrados nesta etapa','<span class="wiz-pill">'+done.length+'</span>','<div class="wiz-list wiz-list--scroll">'+rows+'</div>')
    + '<div class="wiz-actions" style="justify-content:flex-end"><button class="btn btn-primary btn-sm" onclick="wizRevSair(\''+step+'\')"><i class="ti ti-plus"></i> Adicionar mais</button></div>';
}
function wizRevSair(step){ wizState.rev[step]=false; renderWizard(); }
async function wizDesfazer(step,i){
  const arr = step==='demissoes'?wizState.doneDem:wizState.doneAfa;
  const e=arr[i]; if(!e) return;
  const c=colaboradores.find(x=>x._id===e.id);
  if(c){
    c.status=e.de;
    if(step==='demissoes' && 'demitidoEm' in c) delete c.demitidoEm;
    try{ await fsSet('colaboradores',e.id,c); }catch(err){ toast('Erro: '+err.message,'error'); return; }
  }
  arr.splice(i,1);
  toast('Desfeito: '+e.nome,'success');
  renderWizard();
}

// ── ETAPA 1: CONTRATACOES ────────────────────────────────────────
function wizContAdicionados(){
  if(!wizState.contBaseline) return [];
  return colaboradores.filter(c=>!wizState.contBaseline.has(c._id)).sort((a,b)=>(a.nome||'').localeCompare(b.nome||''));
}
function wizContratacoesHTML(){
  const m=wizState.contMode||'menu';
  if(m==='individual'){
    return '<button class="btn btn-ghost btn-sm" onclick="wizContModo(\'menu\')"><i class="ti ti-arrow-left"></i> Voltar</button>'
      +'<div style="margin-top:10px">'+pgBaseNovo()+'</div>';
  }
  if(m==='lote'){
    return '<button class="btn btn-ghost btn-sm" onclick="wizContModo(\'menu\')"><i class="ti ti-arrow-left"></i> Voltar</button>'
      + wizPanel('<i class="ti ti-file-spreadsheet"></i> Importar planilha modelo','',
          '<p class="wiz-note">Suba a planilha <strong>modelo-novos-colaboradores</strong> preenchida. O sistema cria só os novos (ignora quem já existe).</p>'
          +'<div class="wiz-upload" onclick="document.getElementById(\'import-file\').click()">'
            +'<input type="file" id="import-file" accept=".xlsx,.xls" style="display:none" onchange="processarNovos(event)">'
            +'<div style="font-size:26px;color:var(--brand);margin-bottom:6px"><i class="ti ti-upload"></i></div>'
            +'<div style="font-weight:600">Selecionar planilha modelo</div><div class="wiz-item__sub">.xlsx ou .xls</div>'
          +'</div>'
          +'<div id="import-preview" style="margin-top:14px"></div>');
  }
  const add=wizContAdicionados();
  let painel='';
  if(add.length){
    painel=wizPanel('<i class="ti ti-user-check"></i> Adicionados nesta etapa','<span class="wiz-pill">'+add.length+'</span>',
      '<div class="wiz-list wiz-list--scroll">'
      +add.map(c=>'<div class="wiz-item"><span class="wiz-item__main"><span class="wiz-item__name">'+c.nome+'</span> '
        +'<span class="wiz-item__sub">'+(c.mat||'—')+' &middot; '+(c.depto||'—')+'</span></span>'
        +'<button class="btn btn-ghost btn-sm" onclick="wizExcluirContratacao(\''+c._id+'\')"><i class="ti ti-trash"></i> Excluir</button></div>').join('')
      +'</div>');
  }
  return '<div class="wiz-opts">'
      +'<button class="wiz-optcard" onclick="wizContModo(\'individual\')"><span class="wiz-optcard__ic"><i class="ti ti-user-plus"></i></span>'
        +'<span><span class="wiz-optcard__t">Adicionar individual</span><span class="wiz-optcard__d">Abre o formulário de novo colaborador.</span></span></button>'
      +'<button class="wiz-optcard" onclick="wizContModo(\'lote\')"><span class="wiz-optcard__ic"><i class="ti ti-file-spreadsheet"></i></span>'
        +'<span><span class="wiz-optcard__t">Adicionar em lote</span><span class="wiz-optcard__d">Importa a planilha modelo do RH.</span></span></button>'
    +'</div>'+painel;
}
async function wizExcluirContratacao(id){
  const c=colaboradores.find(x=>x._id===id); if(!c) return;
  if(!confirm('Excluir "'+c.nome+'" da base? (foi adicionado nesta etapa)')) return;
  try{ await fsDel('colaboradores',id); colaboradores=colaboradores.filter(x=>x._id!==id); toast('Removido: '+c.nome,'success'); renderWizard(); }
  catch(e){ toast('Erro: '+e.message,'error'); }
}

// ── ETAPA 2: DEMISSOES ───────────────────────────────────────────
function wizDemissoesHTML(){
  if(wizState.rev.demissoes) return wizRevHTML('demissoes');
  if(wizState.demConfirmar) return wizDemConfirmHTML();
  return wizPanel('<i class="ti ti-user-minus"></i> Selecionar quem foi desligado','<span id="wiz-dem-count" class="wiz-pill"></span>',
      wizSearchHTML('wiz-dem-q','Buscar por nome, matrícula ou departamento...')
      +'<div id="wiz-dem-list" class="wiz-list wiz-list--scroll"></div>')
    +'<div class="wiz-actions" style="justify-content:flex-end"><button class="btn btn-primary btn-sm" onclick="wizDemRevisar()">Revisar selecionados <i class="ti ti-arrow-right"></i></button></div>';
}
function wizRenderDemList(){
  const cont=document.getElementById('wiz-dem-list'); if(!cont) return;
  const q=(document.getElementById('wiz-dem-q')?.value||'').toLowerCase().trim();
  let lista=colaboradoresUnicos().filter(c=>statusGrupo(c.status)!=='nao_recebe');
  if(q) lista=lista.filter(c=>wizBusca(c,q));
  lista=lista.sort((a,b)=>a.nome.localeCompare(b.nome)).slice(0,300);
  cont.innerHTML = lista.length ? lista.map(c=>wizRow('demSel',c)).join('') : '<div class="wiz-empty">Nenhum colaborador encontrado.</div>';
  wizUpdSelCount('dem');
}
function wizDemRevisar(){
  if(!wizState.demSel.size){ toast('Selecione ao menos um colaborador.','warning'); return; }
  wizState.demConfirmar=true; renderWizard();
}
function wizDemConfirmHTML(){
  const ids=[...wizState.demSel];
  const rows=ids.map(id=>{ const c=colaboradores.find(x=>x._id===id); if(!c) return '';
    return wizConfItem(id,c,'wizDemExcluir(\''+id+'\')'); }).join('');
  return '<div class="alert alert-warning" style="margin-bottom:14px"><i class="ti ti-alert-triangle"></i> Confira os <strong>'+ids.length+'</strong> colaborador(es) que serão marcados como <strong>Demitido</strong>.</div>'
    + wizPanel('<i class="ti ti-user-minus"></i> Confirmar demissões','<span class="wiz-pill">'+ids.length+'</span>','<div class="wiz-list wiz-list--scroll">'+rows+'</div>')
    + '<div class="wiz-actions" style="justify-content:space-between"><button class="btn btn-ghost btn-sm" onclick="wizDemAddMais()"><i class="ti ti-plus"></i> Adicionar mais</button>'
    + '<button class="btn btn-danger btn-sm" onclick="wizDemitir()"><i class="ti ti-user-minus"></i> Confirmar demissão ('+ids.length+')</button></div>';
}
function wizDemAddMais(){ wizState.demConfirmar=false; renderWizard(); }
function wizDemExcluir(id){ wizState.demSel.delete(id); if(!wizState.demSel.size) wizState.demConfirmar=false; renderWizard(); }
async function wizDemitir(){
  const ids=[...wizState.demSel];
  if(!ids.length){ toast('Selecione ao menos um colaborador.','warning'); return; }
  const comp=_compAtual();
  const b=window._writeBatch(window._db); const afet=[];
  ids.forEach(id=>{ const c=colaboradores.find(x=>x._id===id); if(!c) return;
    const de=c.status; c.status='Demitido'; c.demitidoEm=comp; b.set(window._doc('colaboradores',id),c);
    afet.push(c); wizState.doneDem.push({id,nome:c.nome,de,para:'Demitido',info:'dem. '+comp}); });
  if(!afet.length){ toast('Nada a atualizar.','warning'); return; }
  try{
    await b.commit();
    for(const c of afet){ try{ await registrarVagaFerias(c); }catch(e){} }
    wizState.demSel.clear(); wizState.demConfirmar=false; wizState.rev.demissoes=true;
    toast(afet.length+' colaborador(es) marcados como Demitido.','success');
    renderWizard();
  }catch(e){ toast('Erro: '+e.message,'error'); }
}

// ── ETAPA 3: AFASTADOS ───────────────────────────────────────────
function wizAfastadosHTML(){
  if(wizState.rev.afastados) return wizRevHTML('afastados');
  if(wizState.afaConfirmar) return wizAfaConfirmHTML(wizState.afaConfirmar);
  const opts=STATUS_SO_CESTA.map(s=>'<option value="'+s+'">'+getStatusInfo(s).label+'</option>').join('');
  const p1=wizPanel('<i class="ti ti-arrow-back-up"></i> Tirar de afastamento','<span id="wiz-afare-count" class="wiz-pill"></span>',
      wizSearchHTML('wiz-afare-q','Buscar afastado...')
      +'<div id="wiz-afare-list" class="wiz-list wiz-list--scroll"></div>'
      +'<div class="wiz-actions" style="justify-content:flex-end"><button class="btn btn-primary btn-sm" onclick="wizAfaRevisar(\'reativar\')">Revisar <i class="ti ti-arrow-right"></i></button></div>');
  const pdef=wizPanel('<i class="ti ti-lock"></i> Afastados definitivos','<span id="wiz-afadef-count" class="wiz-pill"></span>',
      '<p class="wiz-note" style="margin:0 0 8px">Apartados: não entram em "Tirar de afastamento". Para mudar o status de um deles, edite na Base.</p>'
      +'<div id="wiz-afadef-list" class="wiz-list wiz-list--scroll"></div>');
  const p2=wizPanel('<i class="ti ti-first-aid-kit"></i> Adicionar afastamento','<span id="wiz-afaadd-count" class="wiz-pill"></span>',
      '<div class="wiz-fields" style="margin:0 0 12px"><div class="wiz-field"><label>Motivo</label><select id="wiz-afa-status" class="wiz-sel">'+opts+'</select></div></div>'
      +wizSearchHTML('wiz-afaadd-q','Buscar quem afastar...')
      +'<div id="wiz-afaadd-list" class="wiz-list wiz-list--scroll"></div>'
      +'<div class="wiz-actions" style="justify-content:flex-end"><button class="btn btn-primary btn-sm" onclick="wizAfaRevisar(\'afastar\')">Revisar <i class="ti ti-arrow-right"></i></button></div>');
  return p1+pdef+p2;
}
// Lista (apartada, somente leitura) dos afastados definitivos.
function wizRenderAfaDefList(){
  const cont=document.getElementById('wiz-afadef-list'); if(!cont) return;
  const lista=colaboradoresUnicos().filter(c=>_statusKey(c.status)==='AFASTADO DEFINITIVO').sort((a,b)=>a.nome.localeCompare(b.nome));
  const cnt=document.getElementById('wiz-afadef-count'); if(cnt) cnt.textContent=lista.length||'';
  cont.innerHTML = lista.length ? lista.map(c=>'<div class="wiz-item" style="cursor:default">'
    +'<span class="wiz-item__main"><span class="wiz-item__name">'+c.nome+'</span> <span class="wiz-item__sub">'+(c.mat||'—')+' · '+(c.depto||'—')+'</span></span>'
    +dsStatusBadge(c.status)+'</div>').join('') : '<div class="wiz-empty">Nenhum afastado definitivo.</div>';
}
function wizRenderAfaReList(){
  const cont=document.getElementById('wiz-afare-list'); if(!cont) return;
  const q=(document.getElementById('wiz-afare-q')?.value||'').toLowerCase().trim();
  let lista=colaboradoresUnicos().filter(c=>statusGrupo(c.status)==='so_cesta' && _statusKey(c.status)!=='AFASTADO DEFINITIVO');
  if(q) lista=lista.filter(c=>wizBusca(c,q));
  lista=lista.sort((a,b)=>a.nome.localeCompare(b.nome));
  cont.innerHTML = lista.length ? lista.map(c=>wizRow('afaReSel',c)).join('') : '<div class="wiz-empty">Ninguém afastado no momento.</div>';
  wizUpdSelCount('afaRe');
}
function wizRenderAfaAddList(){
  const cont=document.getElementById('wiz-afaadd-list'); if(!cont) return;
  const q=(document.getElementById('wiz-afaadd-q')?.value||'').toLowerCase().trim();
  let lista=colaboradoresUnicos().filter(c=>statusGrupo(c.status)==='trabalhando');
  if(q) lista=lista.filter(c=>wizBusca(c,q));
  lista=lista.sort((a,b)=>a.nome.localeCompare(b.nome)).slice(0,300);
  cont.innerHTML = lista.length ? lista.map(c=>wizRow('afaAddSel',c)).join('') : '<div class="wiz-empty">Nenhum colaborador encontrado.</div>';
  wizUpdSelCount('afaAdd');
}
function wizAfaRevisar(tipo){
  if(tipo==='reativar'){ if(!wizState.afaReSel.size){ toast('Selecione ao menos um afastado.','warning'); return; } }
  else { if(!wizState.afaAddSel.size){ toast('Selecione ao menos um colaborador.','warning'); return; }
    wizState.afaMotivo=document.getElementById('wiz-afa-status')?.value||'Afastado'; }
  wizState.afaConfirmar=tipo; renderWizard();
}
function wizAfaConfirmHTML(tipo){
  const isRe=tipo==='reativar';
  const set=isRe?wizState.afaReSel:wizState.afaAddSel;
  const ids=[...set];
  const alvo=isRe?'Trabalhando':(wizState.afaMotivo||'Afastado');
  const rows=ids.map(id=>{ const c=colaboradores.find(x=>x._id===id); if(!c) return '';
    return wizConfItem(id,c,'wizAfaExcluir(\''+tipo+'\',\''+id+'\')'); }).join('');
  const titulo=isRe?'Confirmar reativação':'Confirmar afastamento';
  const ic=isRe?'arrow-back-up':'first-aid-kit';
  const acao=isRe?'<button class="btn btn-success btn-sm" onclick="wizReativar()"><i class="ti ti-check"></i> Reativar ('+ids.length+')</button>'
                 :'<button class="btn btn-warning btn-sm" onclick="wizAfastar()"><i class="ti ti-first-aid-kit"></i> Afastar ('+ids.length+')</button>';
  return '<div class="alert alert-info" style="margin-bottom:14px"><i class="ti ti-info-circle"></i> <strong>'+ids.length+'</strong> colaborador(es) → <strong>'+(isRe?'Trabalhando':getStatusInfo(alvo).label)+'</strong>. Revise antes de confirmar.</div>'
    + wizPanel('<i class="ti ti-'+ic+'"></i> '+titulo,'<span class="wiz-pill">'+ids.length+'</span>','<div class="wiz-list wiz-list--scroll">'+rows+'</div>')
    + '<div class="wiz-actions" style="justify-content:space-between"><button class="btn btn-ghost btn-sm" onclick="wizAfaAddMais()"><i class="ti ti-plus"></i> Adicionar mais</button>'+acao+'</div>';
}
function wizAfaAddMais(){ wizState.afaConfirmar=null; renderWizard(); }
function wizAfaExcluir(tipo,id){ const set=tipo==='reativar'?wizState.afaReSel:wizState.afaAddSel; set.delete(id); if(!set.size) wizState.afaConfirmar=null; renderWizard(); }
async function wizReativar(){
  const ids=[...wizState.afaReSel];
  if(!ids.length){ toast('Selecione ao menos um afastado.','warning'); return; }
  const b=window._writeBatch(window._db); const afet=[];
  ids.forEach(id=>{ const c=colaboradores.find(x=>x._id===id); if(!c) return;
    const de=c.status; c.status='Trabalhando'; b.set(window._doc('colaboradores',id),c);
    afet.push(c); wizState.doneAfa.push({id,nome:c.nome,de,para:'Trabalhando',info:'reativado'}); });
  if(!afet.length){ toast('Nada a atualizar.','warning'); return; }
  try{ await b.commit(); wizState.afaReSel.clear(); wizState.afaConfirmar=null; wizState.rev.afastados=true;
    toast(afet.length+' colaborador(es) reativados.','success'); renderWizard();
  }catch(e){ toast('Erro: '+e.message,'error'); }
}
async function wizAfastar(){
  const ids=[...wizState.afaAddSel];
  if(!ids.length){ toast('Selecione ao menos um colaborador.','warning'); return; }
  const st=wizState.afaMotivo||'Afastado';
  const lbl=getStatusInfo(st).label;
  const b=window._writeBatch(window._db); const afet=[];
  ids.forEach(id=>{ const c=colaboradores.find(x=>x._id===id); if(!c) return;
    const de=c.status; c.status=st; b.set(window._doc('colaboradores',id),c);
    afet.push(c); wizState.doneAfa.push({id,nome:c.nome,de,para:st,info:lbl}); });
  if(!afet.length){ toast('Nada a atualizar.','warning'); return; }
  try{ await b.commit(); wizState.afaAddSel.clear(); wizState.afaConfirmar=null; wizState.rev.afastados=true;
    toast(afet.length+' colaborador(es) afastados ('+lbl+').','success'); renderWizard();
  }catch(e){ toast('Erro: '+e.message,'error'); }
}

// ── ETAPA 4: FERIAS ──────────────────────────────────────────────
function wizFeriasHTML(){
  const tab=wizState.ferTab||'retorno';
  const big=(id,icon,label)=>'<button class="wiz-tab'+(tab===id?' wiz-tab--active':'')+'" onclick="wizFerTab(\''+id+'\')"><i class="ti ti-'+icon+'"></i> '+label+'</button>';
  const sec=(id,icon,label)=>'<button class="wiz-secbtn'+(tab===id?' wiz-secbtn--active':'')+'" onclick="wizFerTab(\''+id+'\')"><i class="ti ti-'+icon+'"></i> '+label+'</button>';
  return '<div id="wiz-fer-aniv"></div>'
    +'<div class="wiz-fer-nav">'
      +'<div class="wiz-tabs">'+big('retorno','arrow-back-up','Retorno de férias')+big('entrada','umbrella','Entrada de férias')+'</div>'
      +'<div class="wiz-fer-sec">'+sec('coletiva','users-group','Coletivas')+sec('ajuste','adjustments-horizontal','Ajuste de saldo')+'</div>'
    +'</div>'
    +'<div id="wiz-fer-body"></div>';
}
function wizFerTab(t){ wizState.ferTab=t; renderWizard(); }
function wizFerRenderBody(){
  const body=document.getElementById('wiz-fer-body'); if(!body) return;
  const tab=wizState.ferTab||'retorno';
  if(tab==='retorno'){ body.innerHTML=wizFerBodyRetorno(); wizFerRenderRetList(); }
  else if(tab==='entrada'){ body.innerHTML=wizFerBodyEntrada(); wizFerRenderEntList(); }
  else if(tab==='coletiva') body.innerHTML=wizFerBodyColetiva();
  else if(tab==='ajuste'){ body.innerHTML=wizFerBodyAjuste(); wizFerAjusteList(); }
}
const _wizPor=()=> (usuarioAtual&&(usuarioAtual.email||usuarioAtual.nome))||'';

function wizFerConfirmedRow(c,tipo){
  const dias = tipo==='entrada' ? ((c.ferDiasGozados||0)+' gozados, '+(c.ferDiasComprados||0)+' comprados')
                                : ('novo saldo '+(c.ferSaldo!=null?c.ferSaldo:0)+'d');
  return '<div id="'+(tipo==='entrada'?'ent':'ret')+'-row-'+c._id+'" class="wiz-row wiz-row--ok">'
    +'<div class="wiz-row__top"><i class="ti ti-circle-check" style="color:var(--brand);font-size:17px"></i>'
      +'<span style="flex:1;min-width:0">'+c.nome+' <span class="wiz-item__sub">'+dias+'</span></span>'
      +dsStatusBadge(c.status)+'<span style="color:var(--brand);font-weight:700;font-size:12px">Confirmado</span></div></div>';
}

function _aniversariosNoIntervalo(adm, desde, ate){
  let n=0;
  for(let y=desde.getFullYear(); y<=ate.getFullYear(); y++){
    const aniv=new Date(y, adm.getMonth(), adm.getDate()); aniv.setHours(0,0,0,0);
    if(aniv>desde && aniv<=ate) n++;
  }
  return n;
}
async function aplicarAniversariosFerias(){
  let cfg={};
  try{ const snap=await window._getDoc(window._doc('config','feriasAniv')); if(snap.exists()) cfg=snap.data()||{}; }
  catch(e){ return {erro:e.message}; }
  const hoje=new Date(); hoje.setHours(0,0,0,0);
  const hojeISO=_isoLocal(hoje);
  if(!cfg.ultimaData){ try{ await fsSet('config','feriasAniv',{ultimaData:hojeISO}); }catch(e){} return {baseline:true}; }
  const desde=_dataLocal(cfg.ultimaData);
  if(!desde || desde>=hoje) return {credited:0};
  const por='sistema (aniversario)';
  let mudou=0, totalDias=0; const alterados=[];
  colaboradores.forEach(c=>{
    if(c.elegibilidade?.ferias===false) return;
    if(_statusKey(c.status).includes('DEMIT')) return;
    const adm=_dataLocal(c.admissao); if(!adm) return;
    const n=_aniversariosNoIntervalo(adm, desde, hoje);
    if(n>0){
      const de=(c.ferSaldo!=null?c.ferSaldo:0);
      c.ferSaldo=de+30*n;
      c.feriasLog=Array.isArray(c.feriasLog)?c.feriasLog:[];
      c.feriasLog.push({tipo:'aniversario',dias:30*n,de,para:c.ferSaldo,em:new Date().toISOString(),por});
      alterados.push(c); mudou++; totalDias+=30*n;
    }
  });
  try{
    for(let i=0;i<alterados.length;i+=400){
      const b=window._writeBatch(window._db);
      alterados.slice(i,i+400).forEach(c=>b.set(window._doc('colaboradores',c._id),c));
      await b.commit();
    }
    await fsSet('config','feriasAniv',{ultimaData:hojeISO});
  }catch(e){ return {erro:e.message}; }
  return {credited:mudou, dias:totalDias};
}
async function wizRodarAniversarios(){
  const el=document.getElementById('wiz-fer-aniv');
  if(el) el.innerHTML='<div class="wiz-note">Verificando aniversários de admissão (+30)…</div>';
  const res=await aplicarAniversariosFerias();
  if(!el) return;
  if(res.baseline) el.innerHTML='<div class="alert alert-info" style="margin-bottom:12px">Controle de aniversários inicializado. A partir de agora, cada <strong>aniversário de admissão</strong> credita <strong>+30 dias</strong> ao saldo automaticamente.</div>';
  else if(res.erro) el.innerHTML='<div class="alert alert-error" style="margin-bottom:12px">Não foi possível verificar aniversários: '+res.erro+'</div>';
  else if(res.credited){ el.innerHTML='<div class="alert alert-success" style="margin-bottom:12px"><i class="ti ti-gift"></i> <strong>+'+res.dias+'</strong> dias creditados a <strong>'+res.credited+'</strong> colaborador(es) por aniversário.</div>'; if(currentPage==='fer-radar'){ try{ renderFerRadar(); }catch(e){} } }
  else el.innerHTML='<div class="wiz-note"><i class="ti ti-check" style="color:var(--brand)"></i> Aniversários em dia — nenhum crédito pendente.</div>';
}

// ---- Retorno ----
function wizFerBodyRetorno(){
  return wizPanel('<i class="ti ti-arrow-back-up"></i> Retorno de férias','',
    '<p class="wiz-q" style="margin-top:0">Confirma os dados abaixo e o retorno de férias destes colaboradores?</p>'
    +'<div id="ret-list"></div>');
}
function wizFerRenderRetList(){
  const cont=document.getElementById('ret-list'); if(!cont) return;
  let lista=colaboradoresUnicos().filter(c=>statusGrupo(c.status)==='ferias' || wizState.retFeitos.has(c._id));
  lista=lista.sort((a,b)=>a.nome.localeCompare(b.nome));
  cont.innerHTML = lista.length ? lista.map(c=>wizFerRetRow(c)).join('') : '<div class="wiz-empty">Ninguém com status Férias no momento.</div>';
}
function wizFerRetRow(c){
  if(wizState.retFeitos.has(c._id)) return wizFerConfirmedRow(c,'retorno');
  const saldo=(c.ferSaldo!=null?c.ferSaldo:0);
  const temPeriodo = !!(c.ferInicio && c.ferFim);
  const gozadoNum = temPeriodo ? _diasCorridos(c.ferInicio,c.ferFim) : (c.ferDiasGozados||0);
  const resumoGozo = temPeriodo
    ? _ddmm(_dataLocal(c.ferInicio))+'→'+_ddmm(_dataLocal(c.ferFim))+' ('+gozadoNum+'d gozados)'
    : (gozadoNum+'d gozados'+(c.ferDiasComprados?' · '+c.ferDiasComprados+'d comprados':''));
  const anoAtual=new Date().getFullYear();
  const anoProx=anoAgendadoColab(c); const anoSel=(typeof anoProx==='number')?anoProx:anoAtual;
  const anos=[anoAtual,anoAtual+1,anoAtual+2,anoAtual+3];
  return '<div id="ret-row-'+c._id+'" class="wiz-row">'
    +'<div class="wiz-row__top">'+c.nome+' <span class="wiz-item__sub">'+(c.depto||'—')+'</span></div>'
    +'<div class="wiz-fields">'
      +'<div class="wiz-field"><label>'+(temPeriodo?'Período gozado':'Gozo')+'</label><div class="wiz-val">'+resumoGozo+'</div></div>'
      +'<div class="wiz-field"><label>Saldo atual</label><div class="wiz-val">'+saldo+'d</div></div>'
      +'<div class="wiz-field"><label>Próximo agend. — mês</label><select id="ret-rm-'+c._id+'" class="wiz-sel">'
        +'<option value="">-- nenhum --</option>'
        +MESES_FER.map(m=>'<option value="'+m+'" '+(c.ferMes===m?'selected':'')+'>'+m+'</option>').join('')
      +'</select></div>'
      +'<div class="wiz-field"><label>Ano</label><select id="ret-ry-'+c._id+'" class="wiz-sel">'
        +anos.map(a=>'<option value="'+a+'" '+(a===anoSel?'selected':'')+'>'+a+'</option>').join('')
      +'</select></div>'
      +'<button class="btn btn-primary btn-sm" onclick="wizFerConfirmarRetorno(\''+c._id+'\')"><i class="ti ti-check"></i> Confirmar</button>'
      +'<button class="btn btn-ghost btn-sm" onclick="wizFerRetCorrigir(\''+c._id+'\')"><i class="ti ti-pencil"></i> Corrigir dias/saldo</button>'
    +'</div>'
    +'<div id="ret-corr-'+c._id+'" style="display:none;margin-top:8px;padding:8px 10px;border:1px dashed var(--border);border-radius:8px">'
      +'<div class="wiz-fields" style="margin:0">'
        +'<div class="wiz-field"><label>Dias gozados</label><input type="number" id="ret-cg-'+c._id+'" class="wiz-num" min="0" value="'+gozadoNum+'"></div>'
        +'<div class="wiz-field"><label>Dias comprados</label><input type="number" id="ret-cc-'+c._id+'" class="wiz-num" min="0" value="'+(c.ferDiasComprados||0)+'"></div>'
        +'<div class="wiz-field"><label>Saldo</label><input type="number" id="ret-cs-'+c._id+'" class="wiz-num" value="'+saldo+'"></div>'
        +'<div class="wiz-field" style="flex:1;min-width:180px"><label>Justificativa (obrigatória)</label><input type="text" id="ret-cj-'+c._id+'" class="wiz-input" style="height:34px" placeholder="Motivo da correção"></div>'
        +'<button class="btn btn-primary btn-sm" onclick="wizFerRetAplicarCorrecao(\''+c._id+'\')"><i class="ti ti-check"></i> Aplicar correção</button>'
      +'</div>'
    +'</div></div>';
}
function wizFerRetCorrigir(id){ const el=document.getElementById('ret-corr-'+id); if(el) el.style.display=(el.style.display==='none'?'block':'none'); }
async function wizFerRetAplicarCorrecao(id){
  const c=colaboradores.find(x=>x._id===id); if(!c) return;
  const g=Math.max(0,fnum(document.getElementById('ret-cg-'+id)?.value));
  const comp=Math.max(0,fnum(document.getElementById('ret-cc-'+id)?.value));
  const s=fnum(document.getElementById('ret-cs-'+id)?.value);
  const j=(document.getElementById('ret-cj-'+id)?.value||'').trim();
  if(!j){ toast('Justificativa é obrigatória para corrigir.','warning'); return; }
  const deS=(c.ferSaldo!=null?c.ferSaldo:0), deG=(c.ferDiasGozados||0), deC=(c.ferDiasComprados||0);
  c.ferDiasGozados=g; c.ferDiasComprados=comp; c.ferSaldo=s;
  c.feriasLog=Array.isArray(c.feriasLog)?c.feriasLog:[];
  c.feriasLog.push({tipo:'ajuste_manual',de:deS,para:s,justificativa:'[correção no retorno] gozados '+deG+'→'+g+' · comprados '+deC+'→'+comp+' · '+j,em:new Date().toISOString(),por:_wizPor()});
  try{ await fsSet('colaboradores',id,c); toast('Correção aplicada para '+c.nome+'.','success'); wizFerRenderRetList(); }
  catch(e){ toast('Erro: '+e.message,'error'); }
}
async function wizFerConfirmarRetorno(id){
  const c=colaboradores.find(x=>x._id===id); if(!c) return;
  const temPeriodo=!!(c.ferInicio && c.ferFim);
  const de=(c.ferSaldo!=null?c.ferSaldo:0);
  const g = temPeriodo ? _diasCorridos(c.ferInicio,c.ferFim) : fnum(c.ferDiasGozados);
  const comp = fnum(c.ferDiasComprados);
  // Período: saldo já foi abatido na ENTRADA (não reabate). Legado (sem período):
  // abate agora com os dias já registrados na entrada.
  if(!temPeriodo){ c.ferSaldo=de-g-comp; }
  // Próximo agendamento: mês e ano informados separadamente ('' = sem agendamento).
  const novoMes=document.getElementById('ret-rm-'+id)?.value||'';
  c.ferMes=novoMes;
  c.ferAno= novoMes ? (fnum(document.getElementById('ret-ry-'+id)?.value)||'') : '';
  c.status='Trabalhando';
  c.feriasLog=Array.isArray(c.feriasLog)?c.feriasLog:[];
  c.feriasLog.push({tipo:'retorno',inicio:c.ferInicio||'',fim:c.ferFim||'',gozados:g,comprados:comp,de,para:c.ferSaldo,ferMes:c.ferMes,em:new Date().toISOString(),por:_wizPor()});
  c.ferInicio=''; c.ferFim=''; c.ferDiasComprados=0;   // fecha o período
  try{
    await fsSet('colaboradores',id,c);
    wizState.retFeitos.add(id);
    const row=document.getElementById('ret-row-'+id); if(row) row.outerHTML=wizFerConfirmedRow(c,'retorno');
    toast('Retorno de '+c.nome+' confirmado. Saldo: '+c.ferSaldo+'d.','success');
  }catch(e){ toast('Erro: '+e.message,'error'); }
}

// ---- Entradas ----
function wizFerBodyEntrada(){
  const ref=wizState.ferMesRef||MESES_FER[new Date().getMonth()];
  const sel='<select onchange="wizState.ferMesRef=this.value;wizFerRenderEntList()" class="wiz-sel">'
    +MESES_FER.map(m=>'<option value="'+m+'" '+(m===ref?'selected':'')+'>'+m+'</option>').join('')+'</select>';
  return wizPanel('<i class="ti ti-umbrella"></i> Entrada de férias','',
    '<p class="wiz-q" style="margin-top:0">Confirma a entrada de férias destes colaboradores?</p>'
    +'<div class="wiz-actions" style="margin:0 0 10px"><span class="wiz-item__sub" style="font-weight:600">Mês de referência:</span>'+sel+'</div>'
    +'<p class="wiz-note">Informe o <strong>período</strong> (início/término); os dias gozados são calculados em dias corridos e abatidos do saldo. O status muda para Férias e o período reflete nos benefícios da competência.</p>'
    +wizSearchHTML('ent-q','Buscar (qualquer mês) para antecipar alguém...')
    +'<div id="ent-list" style="margin-top:10px"></div>');
}
function wizFerRenderEntList(){
  const cont=document.getElementById('ent-list'); if(!cont) return;
  const ref=wizState.ferMesRef||MESES_FER[new Date().getMonth()];
  const q=(document.getElementById('ent-q')?.value||'').toLowerCase().trim();
  let lista, info='';
  if(q){
    lista=colaboradoresUnicos().filter(c=>(statusGrupo(c.status)==='trabalhando'||wizState.entFeitos.has(c._id)) && wizBusca(c,q));
    info='<p class="wiz-note">Busca em <strong>todos os meses</strong> — dá para antecipar quem está agendado para outro mês.</p>';
  } else {
    lista=colaboradoresUnicos().filter(c=>c.ferMes===ref && (statusGrupo(c.status)==='trabalhando'||wizState.entFeitos.has(c._id)));
  }
  lista=lista.sort((a,b)=>a.nome.localeCompare(b.nome)).slice(0,300);
  cont.innerHTML = info + (lista.length ? lista.map(c=>wizFerEntRow(c,ref)).join('')
    : '<div class="wiz-empty">Ninguém '+(q?'encontrado':'agendado para '+ref+' aguardando entrada')+'.</div>');
}
function wizFerEntRow(c,ref){
  if(wizState.entFeitos.has(c._id)) return wizFerConfirmedRow(c,'entrada');
  const saldo=(c.ferSaldo!=null?c.ferSaldo:0);
  const outroMes = c.ferMes && c.ferMes!==ref ? ' <span class="badge badge--warning">agend.: '+c.ferMes+'</span>' : '';
  return '<div id="ent-row-'+c._id+'" class="wiz-row">'
    +'<div class="wiz-row__top">'+c.nome+outroMes+' <span class="wiz-item__sub">'+(c.depto||'—')+'</span></div>'
    +'<div class="wiz-fields">'
      +'<div class="wiz-field"><label>Início</label><input type="date" id="ent-i-'+c._id+'" class="wiz-num" value="'+(c.ferInicio||'')+'"></div>'
      +'<div class="wiz-field"><label>Término</label><input type="date" id="ent-f-'+c._id+'" class="wiz-num" value="'+(c.ferFim||'')+'"></div>'
      +'<div class="wiz-field"><label>Dias comprados</label><input type="number" id="ent-c-'+c._id+'" class="wiz-num" min="0" value="'+(fnum(c.ferDiasComprados)||'')+'"></div>'
      +'<div class="wiz-field"><label>Saldo atual</label><div class="wiz-val">'+saldo+'d</div></div>'
      +'<button class="btn btn-primary btn-sm" onclick="wizFerConfirmarEntrada(\''+c._id+'\')"><i class="ti ti-check"></i> Confirmar</button>'
    +'</div></div>';
}
async function wizFerConfirmarEntrada(id){
  const c=colaboradores.find(x=>x._id===id); if(!c) return;
  const inicio=document.getElementById('ent-i-'+id)?.value||'';
  const fim=document.getElementById('ent-f-'+id)?.value||'';
  const comp=Math.max(0,fnum(document.getElementById('ent-c-'+id)?.value));
  if(!inicio||!fim){ toast('Informe início e término das férias.','error'); return; }
  if(fim<inicio){ toast('O término não pode ser antes do início.','error'); return; }
  const g=_diasCorridos(inicio,fim);
  const de=(c.ferSaldo!=null?c.ferSaldo:0);
  c.ferInicio=inicio; c.ferFim=fim; c.ferDiasGozados=g; c.ferDiasComprados=comp;
  c.ferSaldo=de-g-comp; c.status='Ferias';   // abate na ENTRADA (período conhecido)
  const d=_dataLocal(inicio); if(d && !c.ferMes) c.ferMes=MESES_FER[d.getMonth()];
  c.feriasLog=Array.isArray(c.feriasLog)?c.feriasLog:[];
  c.feriasLog.push({tipo:'entrada',inicio,fim,gozados:g,comprados:comp,de,para:c.ferSaldo,em:new Date().toISOString(),por:_wizPor()});
  try{
    await fsSet('colaboradores',id,c);
    wizState.entFeitos.add(id);
    const row=document.getElementById('ent-row-'+id); if(row) row.outerHTML=wizFerConfirmedRow(c,'entrada');
    toast(c.nome+' entrou de Férias ('+g+' dias gozados, '+comp+' comprados).','success');
  }catch(e){ toast('Erro: '+e.message,'error'); }
}

// ---- Ferias coletivas ----
function wizFerBodyColetiva(){
  const deptos=getDeptoList();
  return wizPanel('<i class="ti ti-users-group"></i> Férias coletivas','',
    '<p class="wiz-note" style="margin-top:0">Baixa de dias no saldo de um grupo. O saldo <strong>pode ficar negativo</strong> até o próximo vencimento.</p>'
    +'<div class="wiz-fields" style="margin-top:0">'
      +'<div class="wiz-field"><label>Dias a abater</label><input type="number" id="col-dias" class="wiz-num" min="0"></div>'
      +'<div class="wiz-field"><label>Escopo</label><select id="col-dep" class="wiz-sel"><option value="">Todos os ativos</option>'+deptos.map(d=>'<option value="'+d+'">Depto: '+d+'</option>').join('')+'</select></div>'
      +'<label class="wiz-item__sub" style="display:flex;align-items:center;gap:6px;height:34px"><input type="checkbox" id="col-status" style="accent-color:var(--brand)"> Mudar status para Férias</label>'
      +'<button class="btn btn-warning btn-sm" onclick="wizFerColetiva()"><i class="ti ti-users-group"></i> Aplicar</button>'
    +'</div>');
}
async function wizFerColetiva(){
  const dias=Math.max(0,fnum(document.getElementById('col-dias')?.value));
  if(!dias){ toast('Informe os dias a abater.','warning'); return; }
  const dep=document.getElementById('col-dep')?.value||'';
  const mudarStatus=!!document.getElementById('col-status')?.checked;
  let alvo=colaboradoresUnicos().filter(c=>statusGrupo(c.status)!=='nao_recebe' && c.elegibilidade?.ferias!==false);
  if(dep) alvo=alvo.filter(c=>(c.depto||'')===dep);
  if(!alvo.length){ toast('Nenhum colaborador no escopo.','warning'); return; }
  if(!confirm('Aplicar férias coletivas de '+dias+' dia(s) a '+alvo.length+' colaborador(es)?'+(mudarStatus?'\nO status mudará para Férias.':''))) return;
  const por=_wizPor(); let ok=0;
  try{
    for(let i=0;i<alvo.length;i+=400){
      const chunk=alvo.slice(i,i+400); const b=window._writeBatch(window._db);
      chunk.forEach(c=>{
        const de=(c.ferSaldo!=null?c.ferSaldo:0);
        c.ferSaldo=de-dias;
        if(mudarStatus) c.status='Ferias';
        c.feriasLog=Array.isArray(c.feriasLog)?c.feriasLog:[];
        c.feriasLog.push({tipo:'coletiva',dias,de,para:c.ferSaldo,em:new Date().toISOString(),por});
        b.set(window._doc('colaboradores',c._id),c);
      });
      await b.commit(); ok+=chunk.length;
    }
    toast('Férias coletivas aplicadas a '+ok+' colaborador(es).','success');
    wizFerRenderBody();
  }catch(e){ toast('Erro: '+e.message,'error'); }
}

// ---- Ajuste manual ----
function wizFerBodyAjuste(){
  return wizPanel('<i class="ti ti-adjustments-horizontal"></i> Ajuste manual de saldo','',
    '<p class="wiz-note" style="margin-top:0">Exceções. Exige <strong>justificativa</strong> e registra quem fez.</p>'
    +wizSearchHTML('aj-q','Buscar colaborador por nome, matrícula ou depto...')
    +'<div id="aj-list" style="margin-top:10px"></div>');
}
function wizFerAjusteList(){
  const cont=document.getElementById('aj-list'); if(!cont) return;
  const q=(document.getElementById('aj-q')?.value||'').toLowerCase().trim();
  if(!q){ cont.innerHTML='<div class="wiz-empty">Digite para buscar o colaborador.</div>'; return; }
  let lista=colaboradoresUnicos().filter(c=>statusGrupo(c.status)!=='nao_recebe' && wizBusca(c,q));
  lista=lista.sort((a,b)=>a.nome.localeCompare(b.nome)).slice(0,40);
  if(!lista.length){ cont.innerHTML='<div class="wiz-empty">Nenhum colaborador encontrado.</div>'; return; }
  cont.innerHTML=lista.map(c=>{
    const saldo=(c.ferSaldo!=null?c.ferSaldo:0);
    return '<div class="wiz-row">'
      +'<div class="wiz-row__top">'+c.nome+' <span class="wiz-item__sub">'+(c.depto||'—')+' &middot; saldo atual '+saldo+'d</span></div>'
      +'<div class="wiz-fields">'
        +'<div class="wiz-field"><label>Novo saldo</label><input type="number" id="aj-s-'+c._id+'" class="wiz-num" value="'+saldo+'"></div>'
        +'<div class="wiz-field" style="flex:1;min-width:200px"><label>Justificativa (obrigatória)</label><input type="text" id="aj-j-'+c._id+'" class="wiz-input" style="height:34px" placeholder="Motivo do ajuste"></div>'
        +'<button class="btn btn-primary btn-sm" onclick="wizFerAjustar(\''+c._id+'\')"><i class="ti ti-check"></i> Aplicar</button>'
      +'</div></div>';
  }).join('');
}
async function wizFerAjustar(id){
  const c=colaboradores.find(x=>x._id===id); if(!c) return;
  const el=document.getElementById('aj-s-'+id);
  if(!el || el.value===''){ toast('Informe o novo saldo.','warning'); return; }
  const novo=fnum(el.value);
  const just=(document.getElementById('aj-j-'+id)?.value||'').trim();
  if(!just){ toast('Justificativa é obrigatória.','warning'); return; }
  const de=(c.ferSaldo!=null?c.ferSaldo:0);
  c.ferSaldo=novo;
  c.feriasLog=Array.isArray(c.feriasLog)?c.feriasLog:[];
  c.feriasLog.push({tipo:'ajuste_manual',de,para:novo,justificativa:just,em:new Date().toISOString(),por:_wizPor()});
  try{ await fsSet('colaboradores',id,c); toast('Saldo de '+c.nome+' ajustado: '+de+' → '+novo+'d.','success'); wizFerAjusteList(); }
  catch(e){ toast('Erro: '+e.message,'error'); }
}

// ============================================================
// CONFIGURACOES (aba propria, apos o Dashboard) — somente master
// Sub-abas: Beneficios · Acessos e permissoes · UM989
// ============================================================
let configSub = 'beneficios';
function configIrSub(s){ configSub=s; showPage('config-main'); }

function pgConfiguracoes(){
  if(!podeGerenciarUsuarios()){
    return '<div class="page-header"><h2 class="page-title">Configurações</h2></div>'
      +'<div class="empty-state"><div class="empty-icon">🔒</div><p>Acesso restrito ao usuário master.</p></div>';
  }
  const sub=configSub||'beneficios';
  const tb=(id,icon,label)=>'<button class="lan-tab'+(sub===id?' lan-tab--active':'')+'" onclick="configIrSub(\''+id+'\')"><i class="ti ti-'+icon+'"></i> '+label+'</button>';
  const tabs='<div class="lan-tabs">'+tb('beneficios','gift','Benefícios')+tb('acessos','user-cog','Acessos e permissões')+tb('um989','users','UM989')+'</div>';
  let corpo='';
  if(sub==='acessos') corpo=pgUsuarios();
  else if(sub==='um989') corpo=pgFerUM989();
  else corpo=_configBeneficiosHTML();
  return '<div class="page-header"><h2 class="page-title">Configurações</h2><p class="page-subtitle">Central de configurações do sistema — acesso exclusivo do master.</p></div>'
    +tabs+'<div>'+corpo+'</div>';
}

function _configBeneficiosHTML(){
  const inp='padding:6px 9px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px;width:130px';
  const modos={
    vr:[['mult','Valor × dias'],['fixo','Valor fixo mensal']],
    cafe:[['mult','Valor × dias'],['fixo','Valor fixo mensal']],
    comb:[['prop','Proporcional ÷30'],['fixo','Sempre fixo']],
    vt:[['mult','Valor × dias'],['fixo','Valor fixo mensal']],
  };
  const defMode={vr:'mult',cafe:'fixo',comb:'prop',vt:'mult'};
  const radios=(name)=>modos[name].map(o=>'<label style="display:flex;align-items:center;gap:5px;font-size:12.5px;cursor:pointer;white-space:nowrap"><input type="radio" name="cfg-'+name+'" value="'+o[0]+'"'+(o[0]===defMode[name]?' checked':'')+' onchange="salvarConfigTudo()" style="accent-color:var(--brand)"> '+o[1]+'</label>').join('');
  const rows=[
    {key:'vr',label:'Vale Refeição',calc:radios('vr'),val:VR_PADRAO},
    {key:'cafe',label:'Café da Manhã',calc:radios('cafe'),val:CAFE_PADRAO},
    {key:'cesta',label:'Cesta Básica',calc:'<span class="badge badge--neutral">Valor fixo mensal</span>',val:CESTA_PADRAO},
    {key:'comb',label:'Combustível',calc:radios('comb'),val:null},
    {key:'vt',label:'Vale Transporte',calc:radios('vt'),val:null},
    {key:'premio',label:'Prêmio Assiduidade',calc:'<span class="badge badge--neutral">Valor fixo</span>',val:PREMIO_VAL},
  ];
  const linhas=rows.map((r,i)=>'<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:14px 18px;'+(i<rows.length-1?'border-bottom:1px solid var(--border)':'')+'">'
    +'<div style="flex:1;min-width:150px"><div style="font-weight:600;font-size:14px">'+r.label+'</div></div>'
    +'<div style="display:flex;gap:14px;flex-wrap:wrap;min-width:200px">'+r.calc+'</div>'
    +'<div style="min-width:150px">'+(r.val!=null?'<label class="text-xs text-muted" style="display:block;margin-bottom:2px">Valor padrão (R$)</label><input type="number" step="0.01" min="0" id="cfg-val-'+r.key+'" value="'+r.val+'" style="'+inp+'">':'<span class="text-xs text-muted">valor por colaborador</span>')+'</div>'
    +'</div>').join('');
  return '<div class="card"><div class="card-title">Benefícios — cálculo e valores</div>'
    +'<div style="border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">'+linhas+'</div>'
    +'<div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="btn btn-primary btn-sm" onclick="salvarConfigTudo()"><i class="ti ti-check"></i> Salvar configuração</button></div>'
    +'<div class="text-xs text-muted" style="margin-top:8px">Para cada benefício você define o tipo de cálculo e o valor padrão. VR e Café: valor de referência por dia. Cesta: valor mensal usado quando o colaborador não tem valor próprio. Prêmio: valor pago a cada colaborador. Combustível e VT usam o valor por colaborador/linha.</div>'
    +'</div>'
    +'<div class="card"><div class="card-title">Linhas de Vale Transporte</div><div id="config-vt"></div></div>';
}

function renderConfigVT(){
  const el=document.getElementById('config-vt'); if(!el) return;
  const inp='padding:7px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px';
  const linhas=VT_LINHAS.filter(l=>l && l.cod);
  const rows=linhas.length?linhas.map(l=>
    '<tr><td style="padding:8px 10px"><code style="font-size:11px">'+l.cod+'</code></td>'
    +'<td style="padding:8px 10px">'+(l.nome||'—')+'</td>'
    +'<td style="padding:8px 10px"><span class="badge badge--'+(l.tipo==='TOP'?'accent':'purple')+'">'+(l.tipo||'—')+'</span></td>'
    +'<td style="padding:8px 10px;text-align:center;white-space:nowrap">'
      +'<button class="btn btn-ghost btn-sm" title="Editar" onclick="vtEditarLinha(\''+l.cod+'\')"><i class="ti ti-edit"></i></button> '
      +'<button class="btn btn-ghost btn-sm" title="Excluir" onclick="vtExcluirLinha(\''+l.cod+'\')"><i class="ti ti-trash"></i></button></td></tr>'
  ).join(''):'<tr><td colspan="4" style="padding:16px;text-align:center;color:var(--text-muted)">Nenhuma linha cadastrada.</td></tr>';
  el.innerHTML='<div style="overflow-x:auto;border-radius:var(--radius);border:1px solid var(--border);margin-bottom:14px">'
    +'<table class="tbl" style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>'
    +'<th style="padding:8px 10px;text-align:left">Código</th><th style="padding:8px 10px;text-align:left">Descrição</th><th style="padding:8px 10px;text-align:left">Tipo</th><th style="padding:8px 10px;text-align:center">Ações</th>'
    +'</tr></thead><tbody>'+rows+'</tbody></table></div>'
    +'<div class="section-label">Adicionar / editar linha</div>'
    +'<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">'
      +'<div class="fg"><label>Código</label><input type="text" id="vt-f-cod" style="width:120px;'+inp+'" placeholder="40115"></div>'
      +'<div class="fg" style="flex:1;min-width:240px"><label>Descrição</label><input type="text" id="vt-f-nome" style="width:100%;'+inp+'" placeholder="40115 - TOP - INTERMUNICIPAL"></div>'
      +'<div class="fg"><label>Tipo</label><select id="vt-f-tipo" style="'+inp+'"><option value="PEC">PEC</option><option value="TOP">TOP</option></select></div>'
      +'<button class="btn btn-primary btn-sm" onclick="vtSalvarLinha()"><i class="ti ti-plus"></i> Salvar linha</button>'
      +'<button class="btn btn-ghost btn-sm" onclick="vtLimparForm()">Limpar</button>'
    +'</div>'
    +'<div class="text-xs text-muted" style="margin-top:8px">Para editar, informe um código já existente. Estas linhas alimentam o seletor de VT no cadastro do colaborador.</div>';
}
async function _vtPersist(){ try{ await fsSet('config','vtLinhas',{linhas:VT_LINHAS}); }catch(e){ toast('Erro ao salvar linhas: '+e.message,'error'); } }
async function vtSalvarLinha(){
  const cod=(document.getElementById('vt-f-cod')?.value||'').trim();
  const nome=(document.getElementById('vt-f-nome')?.value||'').trim();
  const tipo=(document.getElementById('vt-f-tipo')?.value||'PEC');
  if(!cod){ toast('Informe o código da linha.','warning'); return; }
  if(!nome){ toast('Informe a descrição da linha.','warning'); return; }
  const i=VT_LINHAS.findIndex(l=>l && l.cod===cod);
  if(i>=0) VT_LINHAS[i]={cod,nome,tipo}; else VT_LINHAS.push({cod,nome,tipo});
  await _vtPersist(); vtLimparForm(); renderConfigVT(); toast('Linha '+cod+' salva.','success');
}
async function vtExcluirLinha(cod){
  if(!confirm('Excluir a linha de VT '+cod+'?')) return;
  VT_LINHAS=VT_LINHAS.filter(l=>!(l && l.cod===cod));
  await _vtPersist(); renderConfigVT(); toast('Linha '+cod+' excluída.','success');
}
function vtEditarLinha(cod){
  const l=VT_LINHAS.find(x=>x && x.cod===cod); if(!l) return;
  const s=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v;};
  s('vt-f-cod',l.cod); s('vt-f-nome',l.nome||''); s('vt-f-tipo',l.tipo||'PEC');
}
function vtLimparForm(){ ['vt-f-cod','vt-f-nome'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';}); const t=document.getElementById('vt-f-tipo'); if(t)t.value='PEC'; }
async function salvarConfigTudo(){
  const g=id=>{const e=document.getElementById(id); return e && e.value!==''?fnum(e.value):null;};
  const vr=g('cfg-val-vr'), cf=g('cfg-val-cafe'), ce=g('cfg-val-cesta'), pr=g('cfg-val-premio');
  if(vr!=null) VR_PADRAO=vr;
  if(cf!=null) CAFE_PADRAO=cf;
  if(ce!=null && ce>0) CESTA_PADRAO=ce;
  if(pr!=null && pr>0) PREMIO_VAL=pr;
  await salvarConfig();
}
// compat
async function salvarValoresConfig(){ return salvarConfigTudo(); }

// ============================================================
// DASHBOARDS (Base e Beneficios) — comparativo por competencia/periodo
// ============================================================
let dashBaseDe='', dashBaseAte='', dashBenDe='', dashBenAte='';
function _dashCompKey(c){ const m=String(c||'').match(/^(\d{2})\/(\d{4})$/); return m?(m[2]+m[1]):'000000'; }
function _dashCompSort(a,b){ return _dashCompKey(a)-_dashCompKey(b); }
function _periodoSelects(id,comps,de,ate){
  const opt=(v,sel)=>'<option value="'+v+'"'+(v===sel?' selected':'')+'>'+v+'</option>';
  return '<div class="filter-bar" style="align-items:flex-end;margin-bottom:16px">'
    +'<div class="filter-group"><label>De (competência)</label><select id="'+id+'-de" onchange="'+id+'Change()" style="padding:7px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px">'+comps.map(c=>opt(c,de)).join('')+'</select></div>'
    +'<div class="filter-group"><label>Até (competência)</label><select id="'+id+'-ate" onchange="'+id+'Change()" style="padding:7px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px">'+comps.map(c=>opt(c,ate)).join('')+'</select></div>'
    +'</div>';
}

// ── BASE: dashboard (a partir dos Historicos salvos) ─────────────
function pgBaseDashboard(){
  return `<div class="page-header"><h2 class="page-title">Dashboard da Base</h2><p class="page-subtitle">Comparativo das competências salvas em Históricos. Filtre por período.</p></div><div id="base-dash-body"></div>`;
}
function baseDashChange(){ dashBaseDe=document.getElementById('baseDash-de')?.value||dashBaseDe; dashBaseAte=document.getElementById('baseDash-ate')?.value||dashBaseAte; renderBaseDashboardBody(); }
async function renderBaseDashboard(){ await loadBasesSalvas(); renderBaseDashboardBody(true); }
function renderBaseDashboardBody(initFiltro){
  const el=document.getElementById('base-dash-body'); if(!el) return;
  const porComp={};
  basesSalvasList.forEach(b=>{ const c=b.competencia; if(!c) return; if(!porComp[c] || String(b.salvoEm||'')>String(porComp[c].salvoEm||'')) porComp[c]=b; });
  const comps=Object.keys(porComp).sort(_dashCompSort);
  if(!comps.length){ el.innerHTML='<div class="alert alert-info">Nenhum histórico salvo ainda. Salve uma versão da base ao concluir o assistente de atualização.</div>'; return; }
  if(initFiltro || !dashBaseDe || comps.indexOf(dashBaseDe)<0) dashBaseDe=comps[0];
  if(initFiltro || !dashBaseAte || comps.indexOf(dashBaseAte)<0) dashBaseAte=comps[comps.length-1];
  const kDe=_dashCompKey(dashBaseDe), kAte=_dashCompKey(dashBaseAte);
  const sel=comps.filter(c=>_dashCompKey(c)>=Math.min(kDe,kAte) && _dashCompKey(c)<=Math.max(kDe,kAte));
  const stat=b=>{
    const cs=(b.colaboradores||[]).filter(c=>{const k=_statusKey(c.status);return !k.includes('DEMIT')&&k!=='N/A'&&k!=='NA'&&k!=='INATIVO';});
    let trab=0,fer=0,afa=0; cs.forEach(c=>{const g=statusGrupo(c.status); if(g==='trabalhando')trab++; else if(g==='ferias')fer++; else if(g==='so_cesta')afa++;});
    return {total:cs.length,trab,fer,afa};
  };
  const ult=stat(porComp[sel[sel.length-1]]);
  const kpis='<div class="stat-grid">'
    +_dsStat('users','accent',ult.total,'Ativos ('+sel[sel.length-1]+')')
    +_dsStat('user-check','success',ult.trab,'Trabalhando')
    +_dsStat('umbrella','warning',ult.fer,'Em férias')
    +_dsStat('first-aid-kit','danger',ult.afa,'Afastados')
    +'</div>';
  const linhas=sel.map(c=>{const s=stat(porComp[c]);return '<tr><td style="padding:8px 10px;font-weight:600">'+c+'</td>'
    +'<td style="padding:8px 10px;text-align:right">'+s.total+'</td><td style="padding:8px 10px;text-align:right">'+s.trab+'</td>'
    +'<td style="padding:8px 10px;text-align:right">'+s.fer+'</td><td style="padding:8px 10px;text-align:right">'+s.afa+'</td></tr>';}).join('');
  el.innerHTML=_periodoSelects('baseDash',comps,dashBaseDe,dashBaseAte)+kpis
    +'<div class="section-label">Comparativo por competência</div>'
    +'<div style="overflow-x:auto;border-radius:var(--radius);border:1px solid var(--border)"><table class="tbl" style="width:100%;border-collapse:collapse;font-size:13px">'
    +'<thead><tr><th style="padding:8px 10px;text-align:left">Competência</th><th style="padding:8px 10px;text-align:right">Ativos</th><th style="padding:8px 10px;text-align:right">Trabalhando</th><th style="padding:8px 10px;text-align:right">Férias</th><th style="padding:8px 10px;text-align:right">Afastados</th></tr></thead>'
    +'<tbody>'+linhas+'</tbody></table></div>';
}

// ── BENEFICIOS: dashboard (a partir dos fechamentos em historico) ─
function pgBenDashboard(){
  return `<div class="page-header"><h2 class="page-title">Dashboard de Benefícios</h2><p class="page-subtitle">Comparativo dos fechamentos por competência. Filtre por período.</p></div><div id="ben-dash-body"></div>`;
}
function benDashChange(){ dashBenDe=document.getElementById('benDash-de')?.value||dashBenDe; dashBenAte=document.getElementById('benDash-ate')?.value||dashBenAte; renderBenDashboardBody(); }
let _benDashData={};
async function renderBenDashboard(){
  _benDashData={};
  try{
    const snap=await window._getDocs(window._col('historico'));
    snap.forEach(d=>{ const x=d.data(); const comp=x.competencia; if(!comp) return;
      if(d.id.startsWith('folha_')||d.id.startsWith('premio_')) return;
      const r=_benDashData[comp]||(_benDashData[comp]={vr:0,cafe:0,cesta:0,comb:0,vt:0,total:0,count:0});
      if(x.beneficio==='todos' && x.totais){ r.vr=x.totais.vr||0;r.cafe=x.totais.cafe||0;r.cesta=x.totais.cesta||0;r.comb=x.totais.comb||0;r.vt=x.totais.vt||0;r.total=x.totais.geral||0;r.count=x.totalColaboradores||r.count; }
      else if(x.beneficio && x.total!=null){ r[x.beneficio]=x.total; r.total=(r.vr+r.cafe+r.cesta+r.comb+r.vt); if(x.totalColaboradores>r.count)r.count=x.totalColaboradores; }
    });
  }catch(e){ console.error(e); }
  renderBenDashboardBody(true);
}
function renderBenDashboardBody(initFiltro){
  const el=document.getElementById('ben-dash-body'); if(!el) return;
  const comps=Object.keys(_benDashData).sort(_dashCompSort);
  if(!comps.length){ el.innerHTML='<div class="alert alert-info">Nenhum fechamento no Histórico ainda. Feche uma competência no Lançamento Mensal (passo 6).</div>'; return; }
  if(initFiltro || comps.indexOf(dashBenDe)<0) dashBenDe=comps[0];
  if(initFiltro || comps.indexOf(dashBenAte)<0) dashBenAte=comps[comps.length-1];
  const kDe=_dashCompKey(dashBenDe), kAte=_dashCompKey(dashBenAte);
  const sel=comps.filter(c=>_dashCompKey(c)>=Math.min(kDe,kAte) && _dashCompKey(c)<=Math.max(kDe,kAte));
  const ult=_benDashData[sel[sel.length-1]];
  const kpis='<div class="stat-grid">'
    +_dsStatAccent('cash',brl(ult.total),'Total ('+sel[sel.length-1]+')')
    +_dsStat('users','accent',ult.count,'Colaboradores')
    +_dsStat('receipt','success',brl(ult.vr+ult.cafe),'VR + Café')
    +_dsStat('gift','warning',brl(ult.cesta+ult.comb+ult.vt),'Cesta+Comb+VT')
    +'</div>';
  const linhas=sel.map(c=>{const r=_benDashData[c];return '<tr><td style="padding:8px 10px;font-weight:600">'+c+'</td>'
    +'<td style="padding:8px 10px;text-align:right">'+brl(r.vr)+'</td><td style="padding:8px 10px;text-align:right">'+brl(r.cafe)+'</td>'
    +'<td style="padding:8px 10px;text-align:right">'+brl(r.cesta)+'</td><td style="padding:8px 10px;text-align:right">'+brl(r.comb)+'</td>'
    +'<td style="padding:8px 10px;text-align:right">'+brl(r.vt)+'</td><td style="padding:8px 10px;text-align:right;font-weight:700">'+brl(r.total)+'</td></tr>';}).join('');
  el.innerHTML=_periodoSelects('benDash',comps,dashBenDe,dashBenAte)+kpis
    +'<div class="section-label">Comparativo por competência</div>'
    +'<div style="overflow-x:auto;border-radius:var(--radius);border:1px solid var(--border)"><table class="tbl" style="width:100%;border-collapse:collapse;font-size:13px">'
    +'<thead><tr><th style="padding:8px 10px;text-align:left">Competência</th><th style="padding:8px 10px;text-align:right">VR</th><th style="padding:8px 10px;text-align:right">Café</th><th style="padding:8px 10px;text-align:right">Cesta</th><th style="padding:8px 10px;text-align:right">Comb.</th><th style="padding:8px 10px;text-align:right">VT</th><th style="padding:8px 10px;text-align:right">Total</th></tr></thead>'
    +'<tbody>'+linhas+'</tbody></table></div>';
}

// ================================================================
// HISTÓRICO — PRÊMIO DE ASSIDUIDADE (competências fechadas)
// ================================================================
let _premioHistList=[];
function pgPremioHistorico(){
  return '<div class="page-header"><h2 class="page-title">Histórico do Prêmio</h2>'
    +'<p class="page-subtitle">Competências fechadas do prêmio de assiduidade — com log de fechamento e valores.</p></div>'
    +'<div id="premio-hist-body"><div class="alert alert-info">Carregando...</div></div>';
}
async function renderPremioHistorico(){
  const el=document.getElementById('premio-hist-body'); if(!el) return;
  _premioHistList=[];
  try{
    const snap=await window._getDocs(window._col('historico'));
    snap.forEach(d=>{ if(d.id.startsWith('premio_')){ _premioHistList.push(Object.assign({_id:d.id},d.data())); } });
  }catch(e){ el.innerHTML='<div class="alert alert-warning">Erro ao carregar: '+e.message+'</div>'; return; }
  _premioHistList.sort((a,b)=>String(b.fechadoEm||'').localeCompare(String(a.fechadoEm||'')));
  if(!_premioHistList.length){ el.innerHTML='<div class="empty-state"><div class="empty-icon">🗂️</div><p>Nenhuma competência fechada ainda. Feche uma competência no passo 7 do Prêmio.</p></div>'; return; }
  const fmtDt=iso=>{ if(!iso) return '—'; try{ const d=new Date(iso); return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear(); }catch(_){ return '—'; } };
  const rows=_premioHistList.map((h,i)=>{
    const alt=Array.isArray(h.alteracoes)?h.alteracoes.length:0;
    const altBadge=alt?'<span class="badge badge--warning" title="'+(h.alteracoes.map(a=>a.nome+': '+brl(a.de)+'→'+brl(a.para)).join(' | ').replace(/"/g,''))+'">'+alt+' alterado(s)</span>':'<span class="text-muted">—</span>';
    return '<tr>'
      +'<td style="font-weight:600">'+(h.competencia||'—')+'</td>'
      +'<td class="text-sm">'+fmtDt(h.fechadoEm)+'</td>'
      +'<td class="text-sm">'+(h.fechadoPor||'—')+'</td>'
      +'<td style="text-align:right">'+(h.totalElegiveis!=null?h.totalElegiveis:'—')+'</td>'
      +'<td style="text-align:right;font-weight:600">'+brl(h.valorTotal||0)+'</td>'
      +'<td style="text-align:center">'+altBadge+'</td>'
      +'<td style="text-align:center">'+(h.justificativa?'<i class="ti ti-note" title="'+String(h.justificativa).replace(/"/g,'')+'"></i>':'—')+'</td>'
      +'<td style="text-align:center;white-space:nowrap"><button class="btn btn-ghost btn-sm" onclick="exportarCajuHistorico('+i+')"><i class="ti ti-download"></i> Caju</button> '
        +'<button class="btn btn-ghost btn-sm" title="Excluir" onclick="excluirPremioHist(\''+h._id+'\',\''+String(h.competencia||'').replace(/'/g,'')+' — Prêmio\')"><i class="ti ti-trash" style="color:var(--danger)"></i></button></td>'
      +'</tr>';
  }).join('');
  el.innerHTML='<div class="tbl-wrap"><table class="tbl"><thead><tr>'
    +'<th>Competência</th><th>Fechado em</th><th>Por</th><th style="text-align:right">Elegíveis</th><th style="text-align:right">Total pago</th><th style="text-align:center">Alterações</th><th style="text-align:center">Justif.</th><th style="text-align:center">Ação</th>'
    +'</tr></thead><tbody>'+rows+'</tbody></table></div>';
}
function exportarCajuHistorico(idx){
  const h=_premioHistList[idx]; if(!h){ toast('Registro não encontrado','error'); return; }
  const det=Array.isArray(h.detalhes)?h.detalhes:[];
  const sim=det.filter(r=>r.recebe==='SIM');
  if(!sim.length){ toast('Sem colaboradores elegíveis neste histórico','error'); return; }
  const padrao=h.valorPadrao||PREMIO_VAL;
  const NL2=String.fromCharCode(10);
  const header='CPF;Matricula (opcional);Valor Fixo em Auxilio Alimentacao;Mobilidade;Valor Fixo em Mobilidade;Cultura;Valor Fixo em Cultura;Saude;Valor Fixo em Saude;Educacao;Valor Fixo em Educacao;Home Office;Valor Fixo em Home Office';
  const linhas=[header];
  sim.forEach(r=>{
    const cpf=(r.cpf||'').replace(/[^0-9]/g,'').padStart(11,'0');
    const val=(r.valorPago!=null&&r.valorPago!=='')?fnum(r.valorPago):padrao;
    linhas.push([cpf,r.mat||'',val.toFixed(2),'0','0','0','0','0','0','0','0','0','0'].join(';'));
  });
  const blob=new Blob([linhas.join(NL2)],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download='Premio_Assiduidade_Caju_'+String(h.competencia||'').replace('/','_')+'.csv';
  a.click(); URL.revokeObjectURL(url);
  toast('CSV Caju exportado: '+sim.length+' colaboradores','success');
}

// ================================================================
// EXCLUSÃO DE HISTÓRICO COM JUSTIFICATIVA (todas as abas) + log
// ================================================================
let _exclState=null;
function abrirExcluirHistorico(col,id,label,refreshKey){
  _exclState={col,id,label,refreshKey};
  let ov=document.getElementById('modal-excluir');
  if(!ov){ ov=document.createElement('div'); ov.id='modal-excluir'; ov.className='modal-overlay'; document.body.appendChild(ov); }
  const lbl=String(label||'este registro').replace(/</g,'&lt;');
  ov.innerHTML='<div class="modal" style="max-width:480px">'
    +'<div class="modal-title" style="color:var(--danger)"><i class="ti ti-trash"></i> Excluir do histórico</div>'
    +'<div style="padding:2px 0 6px"><p class="text-sm">Você está excluindo <strong>'+lbl+'</strong>. A ação é registrada em log e não pode ser desfeita.</p>'
    +'<label class="text-xs text-muted" style="display:block;margin:10px 0 4px">Justificativa (obrigatória)</label>'
    +'<textarea id="excl-justif" rows="3" placeholder="Explique o motivo da exclusão..." style="width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px;resize:vertical"></textarea></div>'
    +'<div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal(\'modal-excluir\')">Cancelar</button>'
    +'<button class="btn btn-danger" onclick="confirmarExcluirHistorico()"><i class="ti ti-trash"></i> Excluir</button></div>'
    +'</div>';
  openModal('modal-excluir');
  setTimeout(()=>document.getElementById('excl-justif')?.focus(),60);
}
async function confirmarExcluirHistorico(){
  if(!_exclState) return;
  const just=(document.getElementById('excl-justif')?.value||'').trim();
  if(!just){ toast('Informe a justificativa para excluir.','warning'); document.getElementById('excl-justif')?.focus(); return; }
  const {col,id,label,refreshKey}=_exclState;
  try{
    await fsSet('logsExclusao','excl_'+new Date().toISOString().replace(/[^0-9]/g,'')+'_'+id,{
      colecao:col, docId:id, label:label||'', justificativa:just,
      excluidoPor:(usuarioAtual&&(usuarioAtual.email||usuarioAtual.nome))||'', excluidoEm:new Date().toISOString()
    });
    await fsDel(col,id);
    toast('“'+(label||'registro')+'” excluído do histórico.','success');
  }catch(e){ toast('Erro ao excluir: '+e.message,'error'); return; }
  closeModal('modal-excluir'); _exclState=null;
  if(refreshKey==='historico') renderHistorico();
  else if(refreshKey==='base') loadBasesSalvas().then(()=>{ if(typeof renderBasesSalvas==='function') renderBasesSalvas(); });
  else if(refreshKey==='premio') renderPremioHistorico();
}
// wrappers usados nos botões
function excluirPremioHist(id,label){ abrirExcluirHistorico('historico',id,label,'premio'); }
