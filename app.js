
// ============================================================
// STATUS DE COLABORADORES — regras de beneficios
// ============================================================
const STATUS_LIST = [
  {v:'Trabalhando',    label:'Trabalhando',        cor:'#065F46', bg:'#D1FAE5'},
  {v:'Ferias',        label:'Ferias',              cor:'#1D4ED8', bg:'#DBEAFE'},
  {v:'Ferias Coletiva',label:'Ferias Coletiva',    cor:'#1D4ED8', bg:'#DBEAFE'},
  {v:'Afastado',      label:'Afastado',            cor:'#92400E', bg:'#FEF3C7'},
  {v:'Auxilio Doenca',label:'Auxilio Doenca',      cor:'#92400E', bg:'#FEF3C7'},
  {v:'Acidente Trabalho',label:'Acidente Trabalho',cor:'#92400E', bg:'#FEF3C7'},
  {v:'Lic. Maternidade',label:'Lic. Maternidade',  cor:'#6D28D9', bg:'#EDE9FE'},
  {v:'Lic. Paternidade',label:'Lic. Paternidade',  cor:'#6D28D9', bg:'#EDE9FE'},
  {v:'Auxilio Reclusao',label:'Auxilio Reclusao',  cor:'#7F1D1D', bg:'#FEE2E2'},
  {v:'Demitido',      label:'Demitido',            cor:'#374151', bg:'#F3F4F6'},
  {v:'N/A',           label:'N/A',                 cor:'#6B7280', bg:'#F9FAFB'},
];

// Grupos de status para regras de beneficios
const STATUS_RECEBE_TUDO    = ['Trabalhando','Ferias','Ferias Coletiva'];
const STATUS_SO_CESTA       = ['Afastado','Auxilio Doenca','Acidente Trabalho',
                               'Lic. Maternidade','Lic. Paternidade','Auxilio Reclusao'];
const STATUS_NAO_RECEBE     = ['Demitido','N/A'];

function getStatusInfo(v){
  return STATUS_LIST.find(s=>s.v===v) || {v,label:v,cor:'#6B7280',bg:'#F9FAFB'};
}


// ============================================================
// DADOS & ESTADO GLOBAL
// ============================================================
const VT_LINHAS = [
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

function getEmpresaList(){
  const g2={};
  colaboradores.forEach(c=>{
    const p=String(c.mat||'').substring(0,4);
    if(p.length===4) g2[p]=(g2[p]||0)+1;
  });
  return Object.keys(g2).sort().map(p=>({cod:p,qtd:g2[p]}));
}

function getDeptoList(){
  return [...new Set(colaboradores.map(c=>c.depto||'').filter(d=>d))].sort();
}

function inferMob(c){
  if(['vt','combustivel','perto','carro_empresa'].includes(c.mobilidade)) return c.mobilidade;
  if([1,2,3,4].some(n=>fnum(c['vt'+n])>0)) return 'vt';
  if(fnum(c.comb)>0) return 'combustivel';
  return 'perto';
}

function mobBadge(c){
  const m=inferMob(c);
  if(m==='perto') return '<span class="mob-tag mob-perto">🏠 Mora perto</span>';
  if(m==='carro_empresa') return '<span class="mob-tag mob-carro">🚘 Carro empresa</span>';
  if(m==='combustivel') return '<span class="mob-tag mob-comb">Comb '+brl(c.comb)+'/mes</span>';
  const vt=[1,2,3,4].filter(n=>fnum(c['vt'+n])>0)
    .map(n=>'<span class="tag-'+(c['tp'+n]||'pec').toLowerCase()+'">'+(c['tp'+n]||'VT')+'</span>').join(' ');
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
        <div class="fg"><label>Data de vencimento das férias</label><input type="date" id="${prefix}-fer-venc" value="${c?.ferVenc||''}"></div>
        <div class="fg"><label>Data de agendamento das férias</label><input type="date" id="${prefix}-fer-agend" value="${c?.ferAgend||''}" oninput="atualizarMesFerias('${prefix}')"></div>
        <div class="fg"><label>Saldo de dias acumulados</label><input type="number" id="${prefix}-fer-saldo" min="0" max="90" value="${c?.ferSaldo!=null?c.ferSaldo:''}" placeholder="30"></div>
        <div class="fg"><label>Mês agendado</label><input type="text" id="${prefix}-fer-mes-label" value="${c?.ferMes||''}" readonly style="background:var(--surface2)"><span style="font-size:10px;color:var(--text3);margin-top:2px">Definido automaticamente pela data de agendamento.</span></div>
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
    <div class="card" id="${prefix}-card-mob" style="display:none">
      <div class="card-title">Tipo de Transporte</div>
      <div class="form-grid" style="margin-bottom:12px">
        <div class="fg span2"><label>Tipo</label>
          <select id="${prefix}-mobilidade" onchange="toggleMob('${prefix}')">
            <option value="vt" ${mob==='vt'?'selected':''}>Vale Transporte (VT)</option>
            <option value="combustivel" ${mob==='combustivel'?'selected':''}>Combust\u00EDvel</option>
            <option value="perto" ${mob==='perto'?'selected':''}>Mora perto</option>
            <option value="carro_empresa" ${mob==='carro_empresa'?'selected':''}>Carro da empresa</option>
          </select>
        </div>
      </div>
      <div id="${prefix}-bloco-comb" style="display:${mob==='combustivel'?'block':'none'}">
        <div class="form-grid"><div class="fg"><label>Combust\u00EDvel Mensal (R$)</label><input type="number" id="${prefix}-comb" step="0.01" min="0" value="${fnum(c?.comb)||''}"></div></div>
      </div>
      <div id="${prefix}-bloco-vt" style="display:${mob==='vt'?'block':'none'}">
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
      </div>
    </div>`;
}

function elegCheckHTML(prefix, c){
  const eleg=c?.elegibilidade||{};
  const items=[
    {id:'vr',    label:'Vale Refeicao',      checked:eleg.vr!==undefined?eleg.vr:fnum(c?.vr)>0},
    {id:'cafe',  label:'Cafe da Manha',        checked:eleg.cafe!==undefined?eleg.cafe:fnum(c?.cafe)>0},
    {id:'mobilidade',label:'Mobilidade',       checked:eleg.mobilidade!==undefined?eleg.mobilidade:(fnum(c?.comb)>0||[1,2,3,4].some(n=>fnum(c?.['vt'+n])>0))},
    {id:'folha', label:'Folha de Pagamento',   checked:eleg.folha!==undefined?eleg.folha:true},
    {id:'premio', label:'Premio Assiduidade',  checked:eleg.premio!==undefined?eleg.premio:true},
    {id:'ferias', label:'Controle de Ferias',  checked:eleg.ferias!==undefined?eleg.ferias:true},
  ];
  return items.map(item=>`
    <label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1.5px solid ${item.checked?'var(--blue)':'var(--border)'};border-radius:var(--radius-sm);cursor:pointer;background:${item.checked?'var(--blue-light)':'var(--surface2)'};transition:all .15s" onclick="toggleEleg(this)">
      <input type="checkbox" name="${prefix}-eleg-${item.id}" id="${prefix}-eleg-${item.id}" ${item.checked?'checked':''}
        onchange="onElegChange('${prefix}','${item.id}',this.checked)" style="accent-color:var(--blue);width:15px;height:15px">
      <span style="font-size:13px;font-weight:500">${item.label}</span>
    </label>`).join('');
}

function toggleEleg(label){
  const cb=label.querySelector('input[type=checkbox]');
  if(!cb) return;
  label.style.borderColor=cb.checked?'var(--blue)':'var(--border)';
  label.style.background=cb.checked?'var(--blue-light)':'var(--surface2)';
}

function onElegChange(prefix, tipo, checked){
  if(tipo==='vr') document.getElementById(prefix+'-card-vr').style.display=checked?'block':'none';
  if(tipo==='cafe') document.getElementById(prefix+'-card-cafe').style.display=checked?'block':'none';
  if(tipo==='mobilidade'){
    document.getElementById(prefix+'-card-mob').style.display=checked?'block':'none';
    if(checked) toggleMob(prefix);
  }
  if(tipo==='ferias'){
    const el=document.getElementById(prefix+'-card-fer');
    if(el) el.style.display=checked?'block':'none';
  }
}

// Atualiza o rotulo "Mes agendado" a partir da data de agendamento (cadastro)
function atualizarMesFerias(prefix){
  const ag=document.getElementById(prefix+'-fer-agend')?.value||'';
  const lbl=document.getElementById(prefix+'-fer-mes-label');
  if(lbl) lbl.value=ag?mesNomeFerias(ag):'';
}

function toggleMob(prefix){
  const v=document.getElementById(prefix+'-mobilidade')?.value||'perto';
  const bc=document.getElementById(prefix+'-bloco-comb');
  const bv=document.getElementById(prefix+'-bloco-vt');
  if(bc) bc.style.display=v==='combustivel'?'block':'none';
  if(bv) bv.style.display=v==='vt'?'block':'none';
}

function initFormDisplay(prefix){
  ['vr','cafe','mobilidade','ferias'].forEach(t=>onElegChange(prefix,t,document.getElementById(prefix+'-eleg-'+t)?.checked||false));
}

function getColabFromForm(prefix){
  const mob=document.getElementById(prefix+'-mobilidade')?.value||'perto';
  const eleg={
    vr:      document.getElementById(prefix+'-eleg-vr')?.checked||false,
    cafe:    document.getElementById(prefix+'-eleg-cafe')?.checked||false,
    mobilidade: document.getElementById(prefix+'-eleg-mobilidade')?.checked||false,
    folha:   document.getElementById(prefix+'-eleg-folha')?.checked!==false,
    premio:  document.getElementById(prefix+'-eleg-premio')?.checked!==false,
    ferias:  document.getElementById(prefix+'-eleg-ferias')?.checked!==false,
  };
  return {
    mat:    document.getElementById(prefix+'-mat')?.value.trim()||'',
    nome:   (document.getElementById(prefix+'-nome')?.value||'').trim().toUpperCase(),
    cpf:    document.getElementById(prefix+'-cpf')?.value.trim()||'',
    admissao: document.getElementById(prefix+'-admissao')?.value||'',
    cargo:  (document.getElementById(prefix+'-cargo')?.value||'').trim().toUpperCase(),
    depto:  document.getElementById(prefix+'-depto')?.value.trim()||'',
    status: document.getElementById(prefix+'-status')?.value||'Ativo',
    diasFixos: fnum(document.getElementById(prefix+'-dias-fixos')?.value)||null,
    filtro: document.getElementById(prefix+'-filtro')?.value||'OK',
    ferVenc:  document.getElementById(prefix+'-fer-venc')?.value||'',
    ferAgend: document.getElementById(prefix+'-fer-agend')?.value||'',
    ferSaldo: (()=>{const v=document.getElementById(prefix+'-fer-saldo')?.value; return (v!==''&&v!=null&&v!==undefined)?fnum(v):null;})(),
    mobilidade:mob, elegibilidade:eleg,
    vr:   eleg.vr?fnum(document.getElementById(prefix+'-vr')?.value):0,
    cafe: eleg.cafe?fnum(document.getElementById(prefix+'-cafe')?.value):0,
    comb: (eleg.mobilidade&&mob==='combustivel')?fnum(document.getElementById(prefix+'-comb')?.value):0,
    vt1:(eleg.mobilidade&&mob==='vt')?fnum(document.getElementById(prefix+'-vt1')?.value):0,
    v1: (eleg.mobilidade&&mob==='vt')?fnum(document.getElementById(prefix+'-v1')?.value):0,
    vt2:(eleg.mobilidade&&mob==='vt')?fnum(document.getElementById(prefix+'-vt2')?.value):0,
    v2: (eleg.mobilidade&&mob==='vt')?fnum(document.getElementById(prefix+'-v2')?.value):0,
    vt3:(eleg.mobilidade&&mob==='vt')?fnum(document.getElementById(prefix+'-vt3')?.value):0,
    v3: (eleg.mobilidade&&mob==='vt')?fnum(document.getElementById(prefix+'-v3')?.value):0,
    vt4:(eleg.mobilidade&&mob==='vt')?fnum(document.getElementById(prefix+'-vt4')?.value):0,
    v4: (eleg.mobilidade&&mob==='vt')?fnum(document.getElementById(prefix+'-v4')?.value):0,
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
  if(c.mat&&colaboradores.some(x=>x.mat===c.mat)){if(!confirm('Matr\u00EDcula '+c.mat+' j\u00E1 existe. Continuar?'))return;}
  const id=c.mat||(c.nome.replace(/[^A-Za-z0-9]/g,'_').substr(0,20)+'_'+Date.now());
  c._id=id; c.mobilidade=c.mobilidade||inferMob(c);
  syncFeriasAgendamento(c); // deriva ferMes da data de agendamento, se informada

  // Sugerir mes de ferias (ponto 5): primeiro verifica vaga deixada
  // por demissao na mesma funcao/depto, senao usa o mes mais comum
  if(!c.ferMes && c.cargo){
    let mesSugerido=await consultarVagaFerias(c.cargo, c.depto);
    if(!mesSugerido) mesSugerido=sugerirMesFeriasNovo(c.cargo);
    if(mesSugerido){
      c.ferMes=mesSugerido;
      toast('Mes de ferias sugerido automaticamente: '+mesSugerido,'success');
    }
  }

  try{await fsSet('colaboradores',id,c);colaboradores.push(c);toast('Colaborador salvo!','success');limparFormColab('f');}
  catch(e){toast('Erro: '+e.message,'error');}
}

function limparFormColab(prefix){
  ['mat','nome','cpf','cargo','depto','vr','cafe','comb','vt1','v1','vt2','v2','vt3','v3','vt4','v4','fer-venc','fer-agend','fer-saldo','fer-mes-label'].forEach(f=>{
    const el=document.getElementById(prefix+'-'+f); if(el) el.value='';
  });
  const st=document.getElementById(prefix+'-status'); if(st) st.value='Ativo';
  const fi=document.getElementById(prefix+'-filtro'); if(fi) fi.value='OK';
  const mob=document.getElementById(prefix+'-mobilidade'); if(mob) mob.value='perto';
  ['vr','cafe','mobilidade'].forEach(t=>onElegChange(prefix,t,false));
  onElegChange(prefix,'ferias',document.getElementById(prefix+'-eleg-ferias')?.checked||false);
  const folha=document.getElementById(prefix+'-eleg-folha');
  if(folha){folha.checked=true;toggleEleg(folha.closest('label'));}
  const dal=document.getElementById(prefix+'-duplic-alert'); if(dal) dal.innerHTML='';
}

function abrirEditar(id){
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

async function salvarColabModal(){
  if(!editColabId) return;
  const idx=colaboradores.findIndex(x=>x._id===editColabId); if(idx<0) return;
  const dados=getColabFromForm('e');
  dados._id=editColabId;
  dados.mobilidade=dados.mobilidade||inferMob(dados);

  // Se o colaborador esta sendo marcado como Demitido e tinha mes de ferias agendado,
  // registrar a vaga para sugerir ao substituto da mesma funcao (ponto 4.3)
  const statusAnterior=colaboradores[idx].status;
  if(dados.status==='Demitido' && statusAnterior!=='Demitido' && colaboradores[idx].ferMes){
    registrarVagaFerias(colaboradores[idx]);
  }

  Object.assign(colaboradores[idx],dados);
  syncFeriasAgendamento(colaboradores[idx]); // mantem ferMes coerente com a data de agendamento
  try{
    await fsSet('colaboradores',editColabId,colaboradores[idx]);
    closeModal('modal-colab');editColabId=null;
    if(currentPage==='base-lista') renderColabList();
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
    {id:'base-lista',icon:'',label:'Colaboradores'},
    {id:'base-atualizacao',icon:'',label:'Atualizacao Mensal'},
    {id:'base-import',icon:'',label:'Importar / Sync'},
    {id:'base-novo',icon:'',label:'Novo Colaborador'},
  ]},
  beneficios:{pages:[
    {id:'ben-lancamento',icon:'',label:'Lan\u00E7amento Mensal'},
    {id:'ben-importar',icon:'',label:'Importar Faltas'},
    {id:'ben-exportar-caju',icon:'',label:'Exportar Caju & VT'},
    {id:'ben-exportar-senior',icon:'',label:'Exportar Senior'},
    {id:'ben-historico',icon:'',label:'Hist\u00F3rico'},
    {id:'ben-config',icon:'',label:'Configura\u00E7\u00F5es'},
  ]},
  folha:{pages:[
    {id:'folha-import',icon:'',label:'Importar Relat\u00F3rio'},
    {id:'folha-view',icon:'',label:'Visualizar Folha'},
  ]},
  ferias:{pages:[
    {id:'fer-radar',icon:'',label:'Radar de F\u00E9rias'},
    {id:'fer-agendadas',icon:'',label:'F\u00E9rias Agendadas'},
    {id:'fer-import',icon:'',label:'Importar Dados'},
  ]},
  premio:{pages:[
    {id:'premio-main',icon:'',label:'Premio Assiduidade'},
  ]},
  dashboard:{pages:[
    {id:'dash-main',icon:'',label:'Dashboard Geral'},
    {id:'teste-senior',icon:'',label:'Teste Senior API'},
  ]}
};

function switchModule(mod){
  currentModule=mod;
  document.querySelectorAll('.mod-tab').forEach(t=>t.classList.remove('active'));
  const tabEl=document.getElementById('tab-'+mod);
  if(tabEl) tabEl.classList.add('active');
  buildSidebar(mod);
  if(MODULES[mod]) showPage(MODULES[mod].pages[0].id);
}

function buildSidebar(mod){
  const nav=document.getElementById('sidebar-nav');
  if(!nav) return;
  const pages=MODULES[mod]?.pages||[];
  nav.innerHTML=pages.map(p=>{
    const onclick='showPage(\''+p.id+'\')';
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
  afterRender(id);
}

function renderPage(id){
  const pages={
    'base-lista':pgBaseLista,'base-sync':pgBaseSync,'base-carga':pgBaseCarga,'base-import':pgBaseImport,'base-novo':pgBaseNovo,'base-atualizacao':pgBaseAtualizacao,'premio-main':pgPremioAssiduidade,
    'ben-lancamento':pgBenLancamento,'ben-importar':pgBenImportar,
    'ben-exportar-caju':pgBenExportarCaju,'ben-exportar-senior':pgBenExportarSenior,
    'ben-historico':pgBenHistorico,'ben-config':pgBenConfig,
    'folha-import':pgFolhaImport,'folha-view':pgFolhaView,
    'fer-radar':pgFerRadar,'fer-agendadas':pgFeriasAgendadas,'fer-import':pgFerImport,
    'dash-main':pgDashMain,'teste-senior':pgTesteSenior,
  };
  const fn=pages[id];
  if(fn) return fn();
  return '<div class="empty-state"><div class="empty-icon"></div><p>P\u00E1gina em constru\u00E7\u00E3o</p></div>';
}

function afterRender(id){
  if(id==='base-lista') renderColabList();
  if(id==='base-novo') setTimeout(()=>{initDeptoAutocomplete('f');initFormDisplay('f');},100);
  if(id==='ben-lancamento'){ popularLanFiltros(); renderLancamento(); }
  if(id==='ben-historico') renderHistorico();
  if(id==='folha-view') setTimeout(()=>renderFolhaView(), 50);
  if(id==='fer-radar') renderFerRadar();
  if(id==='fer-agendadas') renderFeriasAgendadas();
  if(id==='dash-main') renderDashMain();
  if(id==='premio-main') afterRenderPremio();
  if(id==='teste-senior') {} // sem afterRender especifico
}

// ============================================================
// BASE: LISTA DE COLABORADORES
// ============================================================
function pgBaseLista(){
  const empresas=getEmpresaList();
  const deptos=getDeptoList();
  return `
    <div class="page-header">
      <h2> Base de Colaboradores</h2>
      <p>Gerencie todos os colaboradores da empresa</p>
    </div>
    <div class="filter-bar">
      <div class="filter-group" style="flex:1">
        <label> Buscar</label>
        <input type="text" id="bl-q" placeholder="Nome, matr\u00EDcula ou CPF..." oninput="renderColabList()">
      </div>
      <div class="filter-group">
        <label> Empresa</label>
        <select id="bl-emp" onchange="renderColabList()">
          <option value="">Todas</option>
          ${empresas.map(e=>`<option value="${e.cod}">${e.cod} (${e.qtd})</option>`).join('')}
        </select>
      </div>
      <div class="filter-group">
        <label> Departamento</label>
        <select id="bl-dep" onchange="renderColabList()">
          <option value="">Todos</option>
          ${deptos.map(d=>`<option value="${d}">${d}</option>`).join('')}
        </select>
      </div>
      <div class="filter-group">
        <label>Status</label>
        <select id="bl-status" onchange="renderColabList()">
          <option value="">Todos</option>
          <option value="Ativo">Ativo</option>
          <option value="Inativo">Inativo</option>
          <option value="Férias">F\u00E9rias</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Benef\u00EDcio</label>
        <select id="bl-ben" onchange="renderColabList()">
          <option value="">Todos</option>
          <option value="vr">VR</option>
          <option value="cafe">Caf\u00E9</option>
          <option value="comb">Combust\u00EDvel</option>
          <option value="vt">VT</option>
          <option value="sem">Sem benef\u00EDcio</option>
          <option disabled>\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500</option>
          <option value="comb_vt">Comb+VT (erro?)</option>
          <option value="sem_mob">Sem mobilidade</option>
        </select>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="limparFiltrosColab()">\u2716</button>
      <button class="btn btn-ghost btn-sm" onclick="exportarColabExcel()"> Excel</button>
      <button class="btn btn-ghost btn-sm" onclick="exportarBase()"> Base</button>
    </div>
    <div id="bl-count" class="text-sm text-muted" style="margin-bottom:8px"></div>
    <div class="tbl-wrap">
      <table class="tbl">
        <thead><tr>
          <th>Matr\u00EDcula</th><th>Nome</th><th>CPF</th><th>Admiss\u00E3o</th><th>Departamento</th>
          <th>Status</th><th>Tipo</th><th>Elegibilidade</th><th>VR/dia</th><th>Caf\u00E9/dia</th>
          <th>Transporte</th><th>F\u00E9rias</th><th>A\u00E7\u00F5es</th>
        </tr></thead>
        <tbody id="bl-tbody"></tbody>
      </table>
    </div>`;
}

function filtrarColabs(){
  const q=(g('bl-q')||'').toLowerCase();
  const empF=g('bl-emp'),depF=g('bl-dep'),stF=g('bl-status'),benF=g('bl-ben');
  let f=colaboradores.filter(c=>
    c.nome.toLowerCase().includes(q)||(c.mat||'').toLowerCase().includes(q)||(c.cpf||'').includes(q));
  if(empF) f=f.filter(c=>String(c.mat||'').startsWith(empF));
  if(depF) f=f.filter(c=>(c.depto||'')===depF);
  if(stF) f=f.filter(c=>c.status===stF);
  if(benF==='vr') f=f.filter(c=>fnum(c.vr)>0);
  else if(benF==='cafe') f=f.filter(c=>fnum(c.cafe)>0);
  else if(benF==='comb') f=f.filter(c=>fnum(c.comb)>0);
  else if(benF==='vt') f=f.filter(c=>[1,2,3,4].some(n=>fnum(c['vt'+n])>0));
  else if(benF==='sem') f=f.filter(c=>fnum(c.vr)===0&&fnum(c.cafe)===0&&fnum(c.comb)===0&&[1,2,3,4].every(n=>fnum(c['vt'+n])===0));
  else if(benF==='comb_vt') f=f.filter(c=>fnum(c.comb)>0&&[1,2,3,4].some(n=>fnum(c['vt'+n])>0));
  else if(benF==='sem_mob') f=f.filter(c=>['perto','carro_empresa'].includes(c.mobilidade));
  return f;
}

function limparFiltrosColab(){
  ['bl-q','bl-emp','bl-dep','bl-status','bl-ben'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  renderColabList();
}

function elegBadges(c){
  const eleg=c.elegibilidade||{};
  const tags=[];
  if(eleg.vr!==false&&fnum(c.vr)>0) tags.push('<span class="badge badge-orange" style="font-size:10px">VR</span>');
  if(eleg.cafe!==false&&fnum(c.cafe)>0) tags.push('<span class="badge badge-yellow" style="font-size:10px">Caf\u00E9</span>');
  if(eleg.mobilidade!==false&&(fnum(c.comb)>0||[1,2,3,4].some(n=>fnum(c['vt'+n])>0))) tags.push('<span class="badge badge-green" style="font-size:10px">Mob.</span>');
  if(eleg.folha!==false) tags.push('<span class="badge badge-purple" style="font-size:10px">Folha</span>');
  return tags.length?tags.join(' '):'<span class="badge badge-gray" style="font-size:10px">Nenhum</span>';
}

// Resumo de ferias na lista da base: vencimento + agendamento (mesmos dados do modulo de Ferias)
function ferResumoCelula(c){
  if(c.elegibilidade?.ferias===false) return '<span class="text-muted">N/A</span>';
  const f=getFarol(c);
  const venc=(f.vencStr&&f.vencStr!=='—')?f.vencStr:'—';
  let agend='—';
  if(c.ferAgend){
    const d=new Date(c.ferAgend.length===10?c.ferAgend+'T00:00:00':c.ferAgend);
    agend=isNaN(d.getTime())?(c.ferMes||'—'):d.toLocaleDateString('pt-BR');
  } else if(c.ferMes){ agend=c.ferMes; }
  return '<span class="text-muted">Venc:</span> '+venc+'<br><span class="text-muted">Agend:</span> '+agend;
}

function renderColabList(){
  const f=filtrarColabs();
  const cnt=document.getElementById('bl-count');
  if(cnt) cnt.textContent=f.length+' de '+colaboradores.length+' colaboradores';
  const tbody=document.getElementById('bl-tbody'); if(!tbody) return;
  if(f.length===0){
    tbody.innerHTML='<tr><td colspan="13"><div class="empty-state"><div class="empty-icon"></div><p>Nenhum resultado.</p></div></td></tr>';
    return;
  }
  tbody.innerHTML=f.map(c=>`<tr>
    <td><code>${c.mat||'\u2014'}</code></td>
    <td><strong style="font-size:13px">${c.nome}</strong>${c.cargo?'<br><span class="text-xs text-muted">'+c.cargo+'</span>':''}</td>
    <td><code style="font-size:10px">${c.cpf||'\u2014'}</code></td>
    <td class="text-xs text-muted">${c.admissao||'\u2014'}</td>
    <td class="text-sm text-muted">${c.depto||'\u2014'}</td>
    <td>${statusBadge(c.status)}</td>
    <td>${filtroBadge(c.filtro||'OK')}</td>
    <td>${elegBadges(c)}</td>
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
// BASE: SYNC SENIOR
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
      elegibilidade:{vr:false,cafe:false,mobilidade:false,folha:true},
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
      <div id="carga-preview" style="margin-top:14px"></div>
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
        elegibilidade:{vr:fnum(r[iVR])>0,cafe:fnum(r[iCafe])>0,mobilidade:fnum(r[iComb])>0,folha:true}
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
  const prev=document.getElementById('carga-preview'); if(!prev) return;

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
            <td>${statusBadge(c.status)}</td>
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
    <button class="btn btn-ghost" onclick="document.getElementById('carga-preview').innerHTML=''">Cancelar</button>
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
  const prev=document.getElementById('carga-preview');
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
  document.getElementById('carga-preview').innerHTML=`<div class="alert alert-success">\u2705 <strong>${n} colaboradores importados!</strong></div>`;
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

  // N/A e Demitido: nada
  if(STATUS_NAO_RECEBE.includes(st)) return {vr:0,cafe:0,comb:0,vt:0,cesta:0};

  // Afastados: só cesta
  if(STATUS_SO_CESTA.includes(st)) return {vr:0,cafe:0,comb:0,vt:0,cesta:185};

  // Trabalhando, Ferias, Ferias Coletiva: cálculo normal
  const cfg=getCfg();
  const eleg=c.elegibilidade||{};
  const mob=inferMob(c);
  const vr   = (eleg.vr!==false&&fnum(c.vr)>0)   ? (cfg.vr==='mult'?fnum(c.vr)*dr:fnum(c.vr))   : 0;
  const cafe  = (eleg.cafe!==false&&fnum(c.cafe)>0)? (cfg.cafe==='mult'?fnum(c.cafe)*dr:fnum(c.cafe)) : 0;
  let comb=0;
  if(eleg.mobilidade!==false&&mob==='combustivel'&&fnum(c.comb)>0){
    if(cfg.comb==='fixo') comb=fnum(c.comb);
    else comb=calcMob(fnum(c.comb),dr,du);
  }
  const vt=(eleg.mobilidade!==false&&mob==='vt')
    ? (cfg.vt==='mult'?calcVT(c,dr):calcVT(c,1)) : 0;
  return {vr,cafe,comb,vt,cesta:185};
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
  const colab=colaboradores.find(c=>c.mat===mat);
  if(colab?.diasFixos) return fnum(colab.diasFixos);
  // 2. Se foi definido manualmente no lancamento, usa esse
  const l=lancamento[mat]||{};
  return l.duteis!==undefined?fnum(l.duteis):defaultDU;
}
function getLanDR(mat, defaultDU){
  const du=getLanDU(mat,defaultDU);
  const l=lancamento[mat]||{};
  return Math.max(0,du-fnum(l.faltas)-fnum(l.ferias)+fnum(l.extras));
}

// ============================================================
// BENEF\u00CDCIOS: LAN\u00C7AMENTO MENSAL
// ============================================================
function pgBenLancamento(){
  const empresas=getEmpresaList();
  const deptos=getDeptoList();
  return `
    <div class="page-header">
      <h2> Lan\u00E7amento Mensal</h2>
      <p>Informe faltas, f\u00E9rias e dias extras para calcular os benef\u00EDcios.</p>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
      <div class="card" style="margin-bottom:0">
        <div class="card-title"> Compet\u00EAncia & Dias</div>
        <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">
          <div class="fg"><label>M\u00EAs/Ano</label>
            <input type="text" id="lan-comp" placeholder="MM/AAAA" style="width:120px" oninput="renderLancamento()">
          </div>
          <div class="fg"><label>Dias \u00DAteis</label>
            <input type="number" id="lan-du" value="22" min="1" max="31" style="width:70px" onchange="renderLancamento()">
          </div>
          <button class="btn btn-primary btn-sm" onclick="aplicarDiasUteis()">\u2705 Aplicar a todos</button>
          <button class="btn btn-success btn-sm" onclick="fecharCompetencia()">[lock] Fechar Compet\u00EAncia</button>
        </div>
      </div>
      <div class="card" style="margin-bottom:0" id="lan-resumo-card">
        <div class="card-title">$ Totais da Sele\u00E7\u00E3o</div>
        <div id="lan-resumo-vals" style="font-size:12px;color:var(--text2)">Carregando...</div>
      </div>
    </div>

    <div class="filter-bar">
      <div class="filter-group">
        <label> Empresa</label>
        <select id="lan-emp" onchange="renderLancamento()">
          <option value="">Todas</option>
          ${empresas.map(e=>`<option value="${e.cod}">${e.cod} (${e.qtd})</option>`).join('')}
        </select>
      </div>
      <div class="filter-group" style="flex:1">
        <label> Buscar</label>
        <input type="text" id="lan-q" placeholder="Nome ou matr\u00EDcula..." oninput="renderLancamento()">
      </div>
      <div class="filter-group">
        <label> Departamento</label>
        <select id="lan-dep" onchange="renderLancamento()">
          <option value="">Todos</option>
          ${deptos.map(d=>`<option value="${d}">${d}</option>`).join('')}
        </select>
      </div>
      <div class="filter-group">
        <label>$ Benef\u00EDcio</label>
        <select id="lan-ben" onchange="renderLancamento()">
          <option value="">Todos</option>
          <option value="vr">VR\uFE0F VR</option>
          <option value="cafe">\u2615 Caf\u00E9</option>
          <option value="comb">\u26FD Combust\u00EDvel</option>
          <option value="vt">VT</option>
        </select>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="limparFiltrosLan()">\u2716</button>
      <button class="btn btn-ghost btn-sm" onclick="exportarLancamentoExcel()"> Excel</button>
    </div>

    <div class="tbl-wrap">
      <table class="tbl launch-tbl">
        <thead><tr>
          <th>Mat.</th><th>Nome</th><th title="Travar dias">[lock]</th>
          <th>Dias \u00DAteis</th><th>Faltas</th><th>F\u00E9rias</th><th>Extras</th><th>Dias Reais</th>
          <th>VR</th><th>Caf\u00E9</th><th>Comb.</th><th>VT</th><th>Total</th>
        </tr></thead>
        <tbody id="lan-tbody"></tbody>
        <tfoot id="lan-tfoot" style="display:none">
          <tr class="total-row-label">
            <td colspan="3"> <span id="lan-tot-label"></span></td>
            <td colspan="5" style="text-align:center">\u2014</td>
            <td style="text-align:center">VR</td>
            <td style="text-align:center">Caf\u00E9</td>
            <td style="text-align:center">Comb.</td>
            <td style="text-align:center">VT</td>
            <td style="text-align:center">Total</td>
          </tr>
          <tr class="total-row">
            <td colspan="3"><span id="lan-tot-colab" style="font-size:11px;opacity:.8"></span></td>
            <td colspan="5" style="opacity:.4;text-align:center">\u2014</td>
            <td id="lan-tot-vr" style="text-align:right"></td>
            <td id="lan-tot-cafe" style="text-align:right"></td>
            <td id="lan-tot-comb" style="text-align:right"></td>
            <td id="lan-tot-vt" style="text-align:right"></td>
            <td id="lan-tot-geral" style="text-align:right;font-size:13px;color:#86EFAC"></td>
          </tr>
        </tfoot>
      </table>
    </div>`;
}

function popularLanFiltros(){
  const hoje=new Date();
  const elComp=document.getElementById('lan-comp');
  if(elComp&&!elComp.value)
    elComp.value=String(hoje.getMonth()+1).padStart(2,'0')+'/'+hoje.getFullYear();
  // Verificar colaboradores em ferias e exibir alerta
  setTimeout(()=>verificarColabsEmFerias(), 300);
}

function verificarColabsEmFerias(){
  const emFerias=colaboradores.filter(c=>c.status==='Ferias'||c.status==='F\u00E9rias');
  if(emFerias.length===0) return;

  // Mostrar banner de alerta no topo do lancamento
  const area=document.getElementById('ferias-alert-area');
  if(!area) return;

  area.innerHTML=`
    <div style="background:#FEF3C7;border:1.5px solid #FDE68A;border-radius:var(--radius);
      padding:14px 18px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
      <div>
        <div style="font-weight:700;font-size:14px;color:#92400E;margin-bottom:6px">
          Atencao: ${emFerias.length} colaborador${emFerias.length>1?'es':''}  em ferias nesta competencia
        </div>
        <div style="font-size:12px;color:#92400E;margin-bottom:10px">
          Deseja retornar algum deles para Ativo?
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;max-height:200px;overflow-y:auto">
          ${emFerias.map((c,i)=>`
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;\n              background:rgba(255,255,255,.6);padding:6px 10px;border-radius:6px">
              <input type="checkbox" id="fer-retorno-${i}" data-id="${c._id}"
                style="accent-color:var(--blue);width:15px;height:15px">
              <strong>${c.nome}</strong>
              <span style="color:var(--text2);font-size:11px">${c.mat||''} | ${c.depto||''}</span>
              ${c.ferFim?'<span style="font-size:11px;color:var(--text2)">Prev. retorno: '+c.ferFim+'</span>':''}
            </label>`).join('')}
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-primary btn-sm" onclick="retornarColabsFerias()">
            Marcar selecionados como Ativo
          </button>
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('ferias-alert-area').innerHTML=''">
            Ignorar por agora
          </button>
          <button class="btn btn-ghost btn-sm" onclick="selecionarTodosRetorno(true)">Selecionar todos</button>
          <button class="btn btn-ghost btn-sm" onclick="selecionarTodosRetorno(false)">Desmarcar todos</button>
        </div>
      </div>
    </div>`;
}

function selecionarTodosRetorno(sel){
  document.querySelectorAll('[id^="fer-retorno-"]').forEach(cb=>cb.checked=sel);
}

async function retornarColabsFerias(){
  const checks=document.querySelectorAll('[id^="fer-retorno-"]:checked');
  if(checks.length===0){toast('Nenhum colaborador selecionado','error');return;}

  const b=window._writeBatch(window._db);
  let n=0;
  checks.forEach(cb=>{
    const id=cb.dataset.id;
    const c=colaboradores.find(x=>x._id===id);
    if(!c) return;
    c.status='Ativo';
    b.set(window._doc('colaboradores',id),c);
    n++;
  });
  await b.commit();
  toast(n+' colaborador'+( n>1?'es retornaram':' retornou')+' de ferias!','success');
  document.getElementById('ferias-alert-area').innerHTML='';
  renderLancamento();
}

function limparFiltrosLan(){
  ['lan-q','lan-emp','lan-dep','lan-ben'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  renderLancamento();
}

function getLanAtivos(){
  const du=fnum(g('lan-du'))||22;
  const q=(g('lan-q')||'').toLowerCase();
  const empF=g('lan-emp'),depF=g('lan-dep'),benF=g('lan-ben');
  let f=colaboradores.filter(c=>!STATUS_NAO_RECEBE.includes(c.status));
  if(empF) f=f.filter(c=>String(c.mat||'').startsWith(empF));
  if(q) f=f.filter(c=>c.nome.toLowerCase().includes(q)||(c.mat||'').toLowerCase().includes(q));
  if(depF) f=f.filter(c=>(c.depto||'')===depF);
  if(benF==='vr') f=f.filter(c=>fnum(c.vr)>0&&c.elegibilidade?.vr!==false);
  if(benF==='cafe') f=f.filter(c=>fnum(c.cafe)>0&&c.elegibilidade?.cafe!==false);
  if(benF==='comb') f=f.filter(c=>fnum(c.comb)>0&&inferMob(c)==='combustivel');
  if(benF==='vt') f=f.filter(c=>inferMob(c)==='vt'&&[1,2,3,4].some(n=>fnum(c['vt'+n])>0));
  return f;
}

function renderLancamento(){
  const du=fnum(g('lan-du'))||22;
  const ativos=getLanAtivos();
  let tVR=0,tCafe=0,tCesta=0,tComb=0,tVT=0;
  ativos.forEach(c=>{
    const dr=getLanDR(c.mat,du);
    const {vr,cafe,comb,vt,cesta}=calcBen(c,dr,getLanDU(c.mat,du));
    tVR+=vr;tCafe+=cafe;tCesta=(tCesta||0)+cesta;tComb+=comb;tVT+=vt;
  });
  // Atualizar rodap\u00E9
  const tfoot=document.getElementById('lan-tfoot');
  if(tfoot){
    tfoot.style.display=ativos.length>0?'table-footer-group':'none';
    const empF=g('lan-emp');
    const totalAtivos=colaboradores.filter(c=>c.status!=='Inativo').length;
    document.getElementById('lan-tot-label').textContent=
      empF?`Empresa ${empF} \u2014 ${ativos.length} colaboradores`
      :ativos.length===totalAtivos?'Totais do m\u00EAs':`Sele\u00E7\u00E3o (${ativos.length})`;
    document.getElementById('lan-tot-colab').textContent=`${ativos.length} colaborador${ativos.length!==1?'es':''}`;
    document.getElementById('lan-tot-vr').textContent=tVR>0?brl(tVR):'\u2014';
    document.getElementById('lan-tot-cafe').textContent=tCafe>0?brl(tCafe):'\u2014';
    document.getElementById('lan-tot-comb').textContent=tComb>0?brl(tComb):'\u2014';
    document.getElementById('lan-tot-vt').textContent=tVT>0?brl(tVT):'\u2014';
    document.getElementById('lan-tot-geral').textContent=brl(tVR+tCafe+tComb+tVT);
  }
  // Atualizar resumo card
  const resumo=document.getElementById('lan-resumo-vals');
  if(resumo) resumo.innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px">
      <div>VR\uFE0F VR: <strong>${brl(tVR)}</strong></div>
      <div>\u2615 Caf\u00E9: <strong>${brl(tCafe)}</strong></div>
      <div>\u26FD Comb.: <strong>${brl(tComb)}</strong></div>
      <div>VT: <strong>${brl(tVT)}</strong></div>
      <div style="grid-column:1/-1;padding-top:4px;border-top:1px solid var(--border)">
        $ Total: <strong style="color:var(--green);font-size:14px">${brl(tVR+tCafe+tComb+tVT)}</strong>
      </div>
    </div>`;

  const tbody=document.getElementById('lan-tbody'); if(!tbody) return;
  if(ativos.length===0){
    tbody.innerHTML=`<tr><td colspan="13"><div class="empty-state"><div class="empty-icon"></div><p>Nenhum resultado.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML=ativos.map((c,i)=>{
    const l=lancamento[c.mat]||{};
    const du2=l.duteis!==undefined?fnum(l.duteis):du;
    const fat=fnum(l.faltas),fev=fnum(l.ferias),ext=fnum(l.extras);
    const dr=Math.max(0,du2-fat-fev+ext);
    const {vr,cafe,comb,vt,cesta}=calcBen(c,dr,du2);
    const total=vr+cafe+comb+vt+cesta;
    return `<tr>
      <td><code style="font-size:10px">${c.mat||'\u2014'}</code></td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;font-size:12px" title="${c.nome}">${c.nome}</td>
      <td><input type="number" value="${du2}" min="0" max="31" class="input-du" onchange="setLan('${c.mat}','duteis',this.value)"></td>
      <td><input type="number" value="${fat}" min="0" max="31" class="input-falta" onchange="setLan('${c.mat}','faltas',this.value)"></td>
      <td><input type="number" value="${fev}" min="0" max="31" class="input-ferias" onchange="setLan('${c.mat}','ferias',this.value)"></td>
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
  lancamento[mat][campo]=fnum(val);
  try{ await fsSetLan(mat,lancamento[mat]); }catch(e){}
  renderLancamento();
}

async function aplicarDiasUteis(){
  const du=fnum(g('lan-du'));
  const b=window._writeBatch(window._db);
  let travados=0;
  colaboradores.forEach(c=>{
    if(c.diasFixos){travados++;return;} // pula colaboradores com dias fixos no cadastro
    if(!lancamento[c.mat]) lancamento[c.mat]={};
    lancamento[c.mat].duteis=du;
    b.set(window._doc('lancamento',c.mat),lancamento[c.mat]);
  });
  await b.commit();
  renderLancamento();
  toast(`\u2705 Dias (${du}) aplicados.`+(travados?` ${travados} travados mantidos.`:''),'success');
}

async function fecharCompetencia(){
  const comp=g('lan-comp');
  if(!comp){toast('Informe a compet\u00EAncia (MM/AAAA)','error');return;}
  if(!confirm(`Fechar compet\u00EAncia ${comp}? Isso salva um snapshot dos dados atuais.`)) return;
  const du=fnum(g('lan-du'))||22;
  const ativos=colaboradores.filter(c=>c.status!=='Inativo');
  let tVR=0,tCafe=0,tCesta=0,tComb=0,tVT=0;
  const detalhes=ativos.map(c=>{
    const du2=getLanDU(c.mat,du);
    const dr=getLanDR(c.mat,du);
    const {vr,cafe,comb,vt,cesta}=calcBen(c,dr,du2);
    tVR+=vr;tCafe+=cafe;tCesta=(tCesta||0)+cesta;tComb+=comb;tVT+=vt;
    return {mat:c.mat,nome:c.nome,cpf:c.cpf||'',depto:c.depto||'',
      du:du2,faltas:fnum(lancamento[c.mat]?.faltas),ferias:fnum(lancamento[c.mat]?.ferias),
      extras:fnum(lancamento[c.mat]?.extras),dr,vr,cafe,comb,vt,total:vr+cafe+comb+vt};
  });
  try{
    await fsSet('historico',comp.replace('/','_'),{
      competencia:comp,fechadoEm:new Date().toISOString(),totalColaboradores:ativos.length,
      totais:{vr:tVR,cafe:tCafe,comb:tComb,vt:tVT,geral:tVR+tCafe+tComb+tVT},detalhes
    });
    toast(`\u2705 Compet\u00EAncia ${comp} fechada!`,'success');
  }catch(e){toast('Erro: '+e.message,'error');}
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
        b.set(window._doc('lancamento',mat),lancamento[mat]); ok++;
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
      <div class="export-card"><div class="ex-icon">VT</div><h3>Vale Transporte</h3><p>Com PEC/TOP e c\u00F3digos</p><button class="btn btn-accent btn-sm" onclick="exportarVT()">\u2B07 Exportar VT</button></div>
      <div class="export-card"><div class="ex-icon"></div><h3>Tudo de uma vez</h3><p>Todos separados</p><button class="btn btn-primary btn-sm" onclick="exportarTudo()">\u2B07 Todos</button></div>
      <div class="export-card"><div class="ex-icon"></div><h3>Por Empresa</h3><p>Um arquivo por empresa</p><button class="btn btn-warning btn-sm" onclick="exportarPorEmpresa()">\u2B07 Por Empresa</button></div>
    </div>`;
}

function fmtValCaju(v){ return (parseFloat(v)||0).toFixed(2); }

function getCajuAtivos(empSel){
  let f=colaboradores.filter(c=>!STATUS_NAO_RECEBE.includes(c.status));
  if(empSel) f=f.filter(c=>String(c.mat||'').startsWith(empSel));
  return f;
}

function exportarCajuCompleto(){
  const comp=g('lan-comp')||'MES';
  const empSel=g('exp-emp');
  const du=fnum(g('lan-du'))||22;
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
  const comp=g('lan-comp')||'MES';
  const empSel=g('exp-emp');
  const du=fnum(g('lan-du'))||22;
  const nomes={vr:'VR',cafe:'Cafe',comb:'Mobilidade'};
  const rows=[['CPF','Matr\u00EDcula','Valor']];
  getCajuAtivos(empSel).forEach(c=>{
    const dr=getLanDR(c.mat,du);
    const {vr,cafe,comb}=calcBen(c,dr,getLanDU(c.mat,du));
    const val=tipo==='vr'?vr:tipo==='cafe'?cafe:comb;
    if(val>0) rows.push([c.cpf||'',c.mat||'',val]);
  });
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),nomes[tipo]);
  XLSX.writeFile(wb,nomes[tipo]+'_'+comp.replace('/','_')+(empSel?'_'+empSel:'')+'.xlsx');
  toast('\u2705 Exportado!','success');
}

function exportarVT(){
  const comp=g('lan-comp')||'MES';
  const empSel=g('exp-emp');
  const du=fnum(g('lan-du'))||22;
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
  setTimeout(()=>exportarVT(),1200);
  setTimeout(()=>toast('\u2705 Todos exportados!','success'),1600);
}

function exportarPorEmpresa(){
  const comp=g('lan-comp')||'MES';
  const du=fnum(g('lan-du'))||22;
  const cfg=getCfg();
  const empresas=getEmpresaList();
  empresas.forEach((emp,i)=>{
    setTimeout(()=>{
      const wb=XLSX.utils.book_new();
      ['vr','cafe','comb'].forEach(tipo=>{
        const nomes={vr:'Vale Refeicao',cafe:'Cafe Manha',comb:'Mobilidade'};
        const rows=[['CPF','Matr\u00EDcula','Valor']];
        colaboradores.filter(c=>c.status!=='Inativo'&&String(c.mat||'').startsWith(emp.cod)).forEach(c=>{
          const dr=getLanDR(c.mat,du);
          const {vr,cafe,comb}=calcBen(c,dr,getLanDU(c.mat,du));
          const val=tipo==='vr'?vr:tipo==='cafe'?cafe:comb;
          if(val>0) rows.push([c.cpf||'',c.mat||'',val]);
        });
        XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),nomes[tipo]);
      });
      const vtRows=[['CPF','NOME','C\u00D3DIGO','BENEF\u00CDCIO','TIPO','VALOR','VIAGENS/DIA','DIAS']];
      colaboradores.filter(c=>c.status!=='Inativo'&&String(c.mat||'').startsWith(emp.cod)&&inferMob(c)==='vt').forEach(c=>{
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
  const comp=g('lan-comp')||'MES';
  const du=fnum(g('lan-du'))||22;
  const header=['CPF','Matricula (opcional)','Valor Fixo em Auxilio Alimentacao','Mobilidade','Valor Fixo em Mobilidade','Cultura','Valor Fixo em Cultura','Saude','Valor Fixo em Saude','Educacao','Valor Fixo em Educacao','Home Office','Valor Fixo em Home Office'].join(SEP);
  const empresas=getEmpresaList();
  empresas.forEach((emp,i)=>{
    setTimeout(()=>{
      const linhas=[header];
      colaboradores.filter(c=>c.status!=='Inativo'&&String(c.mat||'').startsWith(emp.cod)).forEach(c=>{
        const dr=getLanDR(c.mat,du);
        const {vr,cafe,comb,vt,cesta}=calcBen(c,dr,getLanDU(c.mat,du));
        const alim=vr+cafe,mob=comb+vt;
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
      <div class="export-card"><div class="ex-icon">VT</div><h3>VT \u2014 Senior</h3><p>CSV</p><button class="btn btn-warning btn-sm" onclick="exportarSenior('vt')">\u2B07 VT_Senior.csv</button></div>
      <div class="export-card"><div class="ex-icon"></div><h3>Tudo Senior</h3><p>4 CSVs de uma vez</p><button class="btn btn-success btn-sm" onclick="exportarTodosSenior()">\u2B07 Todos</button></div>
    </div>`;
}

function exportarSenior(tipo){
  const comp=g('lan-comp')||'MES';
  const empSel=document.getElementById('exp-senior-emp')?.value||'';
  const du=fnum(g('lan-du'))||22;
  const nomes={vr:'VR',cafe:'Cafe_Manha',comb:'Mobilidade',vt:'VT',cesta:'Cesta_Basica'};
  const linhas=['CPF,Empresa,Valor'];
  let f=colaboradores.filter(c=>!STATUS_NAO_RECEBE.includes(c.status));
  if(empSel) f=f.filter(c=>String(c.mat||'').startsWith(empSel));
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
  const items=[]; snap.forEach(d=>items.push(d.data()));
  items.sort((a,b)=>b.fechadoEm.localeCompare(a.fechadoEm));
  const el=document.getElementById('hist-lista'); if(!el) return;
  if(items.length===0){
    el.innerHTML='<div class="empty-state"><div class="empty-icon">\uFE0F</div><p>Nenhuma compet\u00EAncia fechada ainda.</p></div>';
    return;
  }
  el.innerHTML=items.map(h=>`
    <div class="card" style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
        <div>
          <div style="font-weight:700;font-size:16px;color:var(--blue)"> ${h.competencia}</div>
          <div class="text-sm text-muted" style="margin-top:2px">${h.totalColaboradores} colaboradores \u00B7 ${new Date(h.fechadoEm).toLocaleDateString('pt-BR')}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
            <span class="badge badge-orange">VR\uFE0F ${brl(h.totais.vr)}</span>
            <span class="badge badge-yellow">\u2615 ${brl(h.totais.cafe)}</span>
            <span class="badge badge-green">\u26FD ${brl(h.totais.comb)}</span>
            <span class="badge badge-blue">VT ${brl(h.totais.vt)}</span>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:700;font-size:18px;color:var(--green)">${brl(h.totais.geral)}</div>
          <div style="display:flex;gap:6px;margin-top:8px">
            <button class="btn btn-ghost btn-sm" onclick="exportarHistExcel('${h.competencia}')"> Excel</button>
            <button class="btn btn-danger btn-sm" onclick="excluirHist('${h.competencia}')"></button>
          </div>
        </div>
      </div>
    </div>`).join('');
}

async function excluirHist(comp){
  if(!confirm(`Excluir hist\u00F3rico de ${comp}?`)) return;
  await fsDel('historico',comp.replace('/','_'));
  toast('Removido.','error');
  renderHistorico();
}

async function exportarHistExcel(comp){
  const snap=await window._getDocs(window._col('historico'));
  let h=null; snap.forEach(d=>{if(d.id===comp.replace('/','_'))h=d.data();});
  if(!h){toast('N\u00E3o encontrado','error');return;}
  const rows=[['Compet\u00EAncia: '+h.competencia,'Fechado: '+new Date(h.fechadoEm).toLocaleDateString('pt-BR')],
    ['Matr\u00EDcula','Nome','CPF','Departamento','Dias \u00DAteis','Faltas','Ferias','Extras','Dias Reais','VR','Caf\u00E9','Combust\u00EDvel','VT','Total'],
    ...h.detalhes.map(r=>[r.mat,r.nome,r.cpf,r.depto,r.du,r.faltas,r.ferias,r.extras,r.dr,r.vr,r.cafe,r.comb,r.vt,r.total]),
    [],['','','','','','','','','Total',h.totais.vr,h.totais.cafe,h.totais.comb,h.totais.vt,h.totais.geral]];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Hist\u00F3rico '+comp);
  XLSX.writeFile(wb,'Historico_'+comp.replace('/','_')+'.xlsx');
  toast('\u2705 Excel baixado!','success');
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
        ].map((r,i)=>`
          <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;${i<3?'border-bottom:1px solid var(--border)':''};${i%2===1?'background:var(--surface2)':''}">
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
    </div>

    <div class="card">
      <div class="card-title">\uFE0F Base de Dados</div>
      <p class="text-sm text-muted" style="margin-bottom:14px">Exporte a base completa para backup ou migra\u00E7\u00E3o.</p>
      <div class="btn-row" style="margin-top:0">
        <button class="btn btn-ghost" onclick="exportarBase()"> Exportar base completa (.xlsx)</button>
        <button class="btn btn-ghost" onclick="document.getElementById('import-base-file').click()"> Importar base</button>
        <input type="file" id="import-base-file" accept=".xlsx,.xls" style="display:none" onchange="importarBase(event)">
      </div>
    </div>`;
}

async function salvarConfig(){
  const cfg={
    tipoVR: document.querySelector('input[name="cfg-vr"]:checked')?.value||'mult',
    tipoCafe:document.querySelector('input[name="cfg-cafe"]:checked')?.value||'fixo',
    tipoComb:document.querySelector('input[name="cfg-comb"]:checked')?.value||'prop',
    tipoVT: document.querySelector('input[name="cfg-vt"]:checked')?.value||'mult',
  };
  try{ await fsSet('config','calculo',cfg); toast('\u2705 Configura\u00E7\u00E3o salva!','success'); }
  catch(e){ console.error(e); }
}

function exportarBase(){
  const rows=[['Matr\u00EDcula','Nome','CPF','Cargo','Departamento','Status','Mobilidade','VR/dia','Caf\u00E9/dia','Combust\u00EDvel',
    'VT L1','Viag L1','Tipo L1','Cod L1','VT L2','Viag L2','Tipo L2','Cod L2',
    'VT L3','Viag L3','Tipo L3','Cod L3','VT L4','Viag L4','Tipo L4','Cod L4',
    'Admiss\u00E3o','Eleg.VR','Eleg.Caf\u00E9','Eleg.Mob','Eleg.Folha'],
    ...colaboradores.map(c=>{
      const e=c.elegibilidade||{};
      return [c.mat,c.nome,c.cpf||'',c.cargo||'',c.depto||'',c.status,c.mobilidade||'perto',
        fnum(c.vr),fnum(c.cafe),fnum(c.comb),
        fnum(c.vt1),fnum(c.v1),c.tp1||'',c.cod1||'',
        fnum(c.vt2),fnum(c.v2),c.tp2||'',c.cod2||'',
        fnum(c.vt3),fnum(c.v3),c.tp3||'',c.cod3||'',
        fnum(c.vt4),fnum(c.v4),c.tp4||'',c.cod4||'',
        c.admissao||'',e.vr?'SIM':'N\u00C3O',e.cafe?'SIM':'N\u00C3O',e.mobilidade?'SIM':'N\u00C3O',e.folha!==false?'SIM':'N\u00C3O'];
    })];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Colaboradores');
  XLSX.writeFile(wb,'Base_Completa_Udiaco.xlsx');
  toast('\u2705 Base exportada!','success');
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
  const du=fnum(g('lan-du'))||22;
  const comp=g('lan-comp')||'MES';
  const empF=g('lan-emp');
  const ativos=getLanAtivos();
  const rows=[['Matr\u00EDcula','Nome','CPF','Departamento','Dias \u00DAteis','Faltas','Ferias','Extras','Dias Reais','VR','Caf\u00E9','Combust\u00EDvel','VT','Total'],
    ...ativos.map(c=>{
      const du2=getLanDU(c.mat,du);
      const dr=getLanDR(c.mat,du);
      const {vr,cafe,comb,vt,cesta}=calcBen(c,dr,du2);
      return [c.mat,c.nome,c.cpf||'',c.depto||'',du2,fnum(lancamento[c.mat]?.faltas),fnum(lancamento[c.mat]?.ferias),fnum(lancamento[c.mat]?.extras),dr,vr,cafe,comb,vt,vr+cafe+comb+vt];
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
        elegibilidade:{vr:fnum(r[iVR])>0,cafe:fnum(r[iCafe])>0,mobilidade:fnum(r[iComb])>0,folha:true}};
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
function pgFerImport(){
  return `
    <div class="page-header"><h2> Importar Dados de F\u00E9rias</h2><p>Atualize as datas de f\u00E9rias a partir do relat\u00F3rio da Senior.</p></div>
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
  const du=fnum(g('lan-du'))||22;
  const hoje=new Date(); hoje.setHours(0,0,0,0);
  const em30=new Date(hoje); em30.setDate(em30.getDate()+30);
  const ativos=colaboradores.filter(c=>c.status==='Ativo');
  const emFerias=colaboradores.filter(c=>c.status==='Férias'||c.status==='Férias');
  const inativos=colaboradores.filter(c=>c.status==='Inativo');

  // Totais benef\u00EDcios
  let tVR=0,tCafe=0,tCesta=0,tComb=0,tVT=0;
  colaboradores.filter(c=>c.status!=='Inativo').forEach(c=>{
    const dr=getLanDR(c.mat,du);
    const {vr,cafe,comb,vt,cesta}=calcBen(c,dr,getLanDU(c.mat,du));
    tVR+=vr;tCafe+=cafe;tCesta=(tCesta||0)+cesta;tComb+=comb;tVT+=vt;
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

  const comp=g('lan-comp')||'\u2014';
  const el=document.getElementById('dash-content');
  if(!el) return;
  el.innerHTML=`
    <div class="dash-section">
      <div class="dash-section-title"> Colaboradores</div>
      <div class="stats-grid">
        <div class="stat-card blue"><div class="stat-val">${colaboradores.length}</div><div class="stat-label">Total na Base</div></div>
        <div class="stat-card green"><div class="stat-val" style="color:var(--green)">${ativos.length}</div><div class="stat-label">Ativos</div></div>
        <div class="stat-card blue"><div class="stat-val" style="color:var(--blue)">${emFerias.length}</div><div class="stat-label">Em F\u00E9rias</div></div>
        <div class="stat-card red"><div class="stat-val" style="color:var(--red)">${inativos.length}</div><div class="stat-label">Inativos</div></div>
      </div>
    </div>

    <div class="dash-section">
      <div class="dash-section-title"> Benef\u00EDcios \u2014 Compet\u00EAncia ${comp}</div>
      <div class="stats-grid">
        <div class="stat-card orange"><div class="stat-val" style="font-size:18px;color:var(--orange)">${brl(tVR)}</div><div class="stat-label">VR\uFE0F Vale Refei\u00E7\u00E3o</div><div class="stat-sub">${colaboradores.filter(c=>fnum(c.vr)>0).length} colaboradores</div></div>
        <div class="stat-card yellow"><div class="stat-val" style="font-size:18px;color:var(--yellow)">${brl(tCafe)}</div><div class="stat-label">\u2615 Caf\u00E9 da Manh\u00E3</div><div class="stat-sub">${colaboradores.filter(c=>fnum(c.cafe)>0).length} colaboradores</div></div>
        <div class="stat-card orange"><div class="stat-val" style="font-size:18px;color:var(--orange)">${brl(tComb)}</div><div class="stat-label">\u26FD Combust\u00EDvel</div><div class="stat-sub">${colaboradores.filter(c=>fnum(c.comb)>0).length} colaboradores</div></div>
        <div class="stat-card blue"><div class="stat-val" style="font-size:18px;color:var(--blue)">${brl(tVT)}</div><div class="stat-label">VT Vale Transporte</div><div class="stat-sub">${colaboradores.filter(c=>[1,2,3,4].some(n=>fnum(c['vt'+n])>0)).length} colaboradores</div></div>
        <div class="stat-card green" style="grid-column:1/-1"><div class="stat-val" style="font-size:24px;color:var(--green)">${brl(tVR+tCafe+tComb+tVT)}</div><div class="stat-label">$ Total Geral de Benef\u00EDcios</div></div>
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
          <thead><tr><th>Empresa</th><th>Total</th><th>Ativos</th><th>Inativos</th><th>Em F\u00E9rias</th><th>Total Benef\u00EDcios</th></tr></thead>
          <tbody>
            ${getEmpresaList().map(emp=>{
              const fc=colaboradores.filter(c=>String(c.mat||'').startsWith(emp.cod));
              const fa=fc.filter(c=>c.status==='Ativo').length;
              const fi=fc.filter(c=>c.status==='Inativo').length;
              const ff=fc.filter(c=>c.status==='Férias'||c.status==='Férias').length;
              let tot=0;
              fc.filter(c=>c.status!=='Inativo').forEach(c=>{
                const dr=getLanDR(c.mat,du);
                const {vr,cafe,comb,vt,cesta}=calcBen(c,dr,getLanDU(c.mat,du));
                tot+=vr+cafe+comb+vt;
              });
              return `<tr>
                <td><strong>${emp.cod}</strong></td>
                <td>${emp.qtd}</td>
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
    const semMob=[];
    snap.forEach(d=>{
      const c={...d.data(),_id:d.id};
      if(!['vt','combustivel','perto','carro_empresa'].includes(c.mobilidade)){
        c.mobilidade=inferMob(c); semMob.push(c);
      }
      colaboradores.push(c);
    });
    if(colaboradores.length===0){
      setSS('\u2705 0 colaboradores','ok');
    } else {
      setSS('\u2705 '+colaboradores.length+' colaboradores','ok');
      // Salvar mobilidade inferida no Firebase
      if(semMob.length>0){
        for(let i=0;i<semMob.length;i+=400){
          const b=window._writeBatch(window._db);
          semMob.slice(i,i+400).forEach(c=>b.set(window._doc('colaboradores',c._id),c));
          await b.commit();
        }
      }
    }
  }catch(e){
    setSS('\u274C Erro','err');
    toast('Erro ao carregar: '+e.message,'error');
  }
}

async function loadLancamento(){
  try{
    const snap=await window._getDocs(window._col('lancamento'));
    lancamento={};
    snap.forEach(d=>lancamento[d.id]=d.data());
  }catch(e){ console.error('Erro lancamento:',e); }
}

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
  await fsSet('lancamento',mat,data);
}

function initApp(user){
  document.getElementById('login-screen').style.display='none';
  document.getElementById('app-screen').style.display='flex';
  document.getElementById('user-name').textContent=user.email;
  Promise.all([loadColaboradores(),loadLancamento(),loadConfig()]).then(()=>{
    switchModule('base');
    setTimeout(()=>{
      const el=document.getElementById('lan-comp');
      if(el&&!el.value){
        const hoje=new Date();
        el.value=String(hoje.getMonth()+1).padStart(2,'0')+'/'+hoje.getFullYear();
      }
    },500);
  });
}

function waitFirebase(cb){ if(window._firebaseReady)cb(); else window.addEventListener('firebaseReady',cb,{once:true}); }

waitFirebase(()=>{
  window._onAuthStateChanged(window._auth, user=>{
    if(user) initApp(user);
    else {
      document.getElementById('login-screen').style.display='flex';
      document.getElementById('app-screen').style.display='none';
    }
  });
});


// ════════════════════════════════════════════════════════════════
// BASE: IMPORTAR / SYNC (unificado)
// ════════════════════════════════════════════════════════════════
function pgBaseImport(){
  return `
    <div class="page-header">
      <h2> Importar / Sincronizar Base</h2>
      <p>Dois modos: Sync Senior (status/demissoes/ferias) ou Carga Completa (reconciliacao total).</p>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Modo de importacao</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <label style="display:flex;align-items:center;gap:8px;padding:12px 18px;border:2px solid var(--blue);border-radius:var(--radius);cursor:pointer;background:var(--blue-light);flex:1;min-width:220px">
          <input type="radio" name="import-modo" value="sync" checked style="accent-color:var(--blue)">
          <div>
            <div style="font-weight:600;font-size:14px">Sync Senior</div>
            <div class="text-xs text-muted">Apenas Matricula + Nome + CPF. Detecta novos, demissoes e ferias.</div>
          </div>
        </label>
        <label style="display:flex;align-items:center;gap:8px;padding:12px 18px;border:1.5px solid var(--border);border-radius:var(--radius);cursor:pointer;background:var(--surface2);flex:1;min-width:220px">
          <input type="radio" name="import-modo" value="carga" style="accent-color:var(--blue)">
          <div>
            <div style="font-weight:600;font-size:14px">Carga Completa</div>
            <div class="text-xs text-muted">Todos os campos. Reconciliacao completa: novos, excluir, duplicatas CLT+MEI.</div>
          </div>
        </label>
      </div>
    </div>
    <div class="card">
      <div class="alert alert-info" style="margin-bottom:14px" id="import-hint">
        <strong>Sync Senior:</strong> Colunas esperadas: Matricula (ou Cadastro), Nome, CPF.
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
  if(modo==='sync') processarSync(event);
  else processarCarga(event);
}

// Atualizar hint ao mudar modo
document.addEventListener('change', function(e){
  if(e.target.name==='import-modo'){
    const hint=document.getElementById('import-hint');
    if(!hint) return;
    if(e.target.value==='sync'){
      hint.innerHTML='<strong>Sync Senior:</strong> Colunas: Matricula (ou Cadastro), Nome, CPF.';
    } else {
      hint.innerHTML='<strong>Carga Completa:</strong> Colunas: Matricula, Nome, CPF, Cargo, Departamento, Status, Filtro (OK/DUP/MEI/SOC/PART), VR/dia, Cafe/dia, Combustivel, Mobilidade.';
    }
  }
});

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
      +'<td style="text-align:right;font-weight:600;color:var(--green);font-family:monospace">'+(d.status==='SIM'?brl(226):'-')+'</td>'
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
    const du=fnum(document.getElementById('lan-du')?.value)||22;
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
  if(empF) f=f.filter(d=>String(d.mat||'').startsWith(empF));
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
    <div class="page-header"><h2>Radar de Ferias</h2><p>Farol de vencimento por colaborador.</p></div>
    <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:6px;font-size:12px"><div style="width:14px;height:14px;border-radius:50%;background:var(--green)"></div>Nao vencida</div>
        <div style="display:flex;align-items:center;gap:6px;font-size:12px"><div style="width:14px;height:14px;border-radius:50%;background:var(--yellow)"></div>Vencida 1-9 meses</div>
        <div style="display:flex;align-items:center;gap:6px;font-size:12px"><div style="width:14px;height:14px;border-radius:50%;background:var(--orange)"></div>Vencida 10-12 meses</div>
        <div style="display:flex;align-items:center;gap:6px;font-size:12px"><div style="width:14px;height:14px;border-radius:50%;background:var(--red)"></div>Vencida +12 meses</div>
        <div style="display:flex;align-items:center;gap:6px;font-size:12px"><div style="width:14px;height:14px;border-radius:50%;background:var(--border)"></div>Sem dados</div>
      </div>
      <div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap">
        <select id="fer-emp" onchange="renderFerRadar()" style="padding:7px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:12px">
          <option value="">Todas as empresas</option>
          ${getEmpresaList().map(e=>'<option value="'+e.cod+'">'+e.cod+'</option>').join('')}
        </select>
        <select id="fer-dep" onchange="renderFerRadar()" style="padding:7px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:12px">
          <option value="">Todos os deptos</option>
          ${getDeptoList().map(d=>'<option value="'+d+'">'+d+'</option>').join('')}
        </select>
        <select id="fer-status-filter" onchange="renderFerRadar()" style="padding:7px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:12px">
          <option value="">Todos</option>
          <option value="verde">Verde - OK</option>
          <option value="amarelo">Amarelo 1-9m</option>
          <option value="laranja">Laranja 10-12m</option>
          <option value="vermelho">Vermelho +12m</option>
          <option value="sem">Sem dados</option>
        </select>
        <button class="btn btn-ghost btn-sm" onclick="exportarFeriasExcel()">Excel</button>
      </div>
    </div>
    <div id="fer-stats" style="margin-bottom:16px"></div>
    <div id="fer-radar-grid"></div>
    <div id="fer-tabela" style="margin-top:20px"></div>`;
}

// ── Férias: meses e sincronização agendamento <-> mês ────────────
const MESES_FER=['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// Converte uma data (yyyy-mm-dd) no nome do mes usado nas telas de ferias.
// Forca horario local (T00:00:00) para nao escorregar de mes em fusos negativos.
function mesNomeFerias(dateStr){
  if(!dateStr) return '';
  const d=new Date(dateStr.length===10?dateStr+'T00:00:00':dateStr);
  if(isNaN(d.getTime())) return '';
  return MESES_FER[d.getMonth()]||'';
}

// Mantem ferMes coerente com ferAgend (a data de agendamento e a fonte da verdade).
// Se houver data de agendamento, o mes e derivado dela; senao preserva o mes ja definido.
function syncFeriasAgendamento(c){
  if(c && c.ferAgend){
    const m=mesNomeFerias(c.ferAgend);
    if(m) c.ferMes=m;
  }
  return c;
}

function getFarol(c){
  // Nao se aplica - socios/consultores
  if(c.elegibilidade?.ferias===false){
    return {cor:'na',cls:'dot-na',meses:0,label:'N/A',vencStr:'\u2014',dias:0};
  }
  // Prioridade: dados de ferVenc (importados) ou calcular por admissao
  const hoje=new Date(); hoje.setHours(0,0,0,0);

  let vencDate=null;
  if(c.ferVenc){
    try{ vencDate=new Date(c.ferVenc); }catch(e){}
  } else if(c.admissao){
    // Calcular: admissao + 1 ano = primeiro vencimento
    try{
      const adm=new Date(c.admissao);
      // Vencimento = aniversario de admissao + 12 meses aquisitivos
      vencDate=new Date(adm);
      vencDate.setFullYear(vencDate.getFullYear()+1);
      // Se ja passou, calcular proximo ciclo
      while(vencDate < hoje){
        vencDate.setFullYear(vencDate.getFullYear()+1);
      }
      // O vencimento "real" e o anterior (que venceu)
      const prevVenc=new Date(vencDate);
      prevVenc.setFullYear(prevVenc.getFullYear()-1);
      vencDate=prevVenc < hoje ? prevVenc : vencDate;
    }catch(e){}
  }

  if(!vencDate) return {cor:'sem',cls:'dot-sem',meses:0,label:'Sem dados',vencStr:'—',dias:0};

  const diffMs=hoje-vencDate;
  const meses=Math.round(diffMs/(1000*60*60*24*30));
  const vencStr=vencDate.toLocaleDateString('pt-BR');
  const diasDisp=c.ferDias||30;

  if(meses<0) return {cor:'verde',cls:'dot-verde',meses:Math.abs(meses),label:'OK',vencStr,dias:diasDisp};
  if(meses<=9) return {cor:'amarelo',cls:'dot-amarelo',meses,label:meses+'m',vencStr,dias:diasDisp};
  if(meses<=12) return {cor:'laranja',cls:'dot-laranja',meses,label:meses+'m',vencStr,dias:diasDisp};
  return {cor:'vermelho',cls:'dot-vermelho',meses,label:meses+'m',vencStr,dias:diasDisp};
}

function renderFerRadar(){
  const empF=document.getElementById('fer-emp')?.value||'';
  const depF=document.getElementById('fer-dep')?.value||'';

  // Sempre busca da base de colaboradores (Firebase) atualizada em memoria
  let f=colaboradores.filter(c=>!STATUS_NAO_RECEBE.includes(c.status) && c.status!=='Inativo');
  if(empF) f=f.filter(c=>String(c.mat||'').startsWith(empF));
  if(depF) f=f.filter(c=>(c.depto||'')===depF);

  const comFarol=f.map(c=>({...c,farol:getFarol(c)}));

  renderFarois(comFarol);
  renderAlertasFeriasMes(comFarol);

  // Stats
  const stats={verde:0,amarelo:0,laranja:0,vermelho:0,sem:0,na:0};
  comFarol.forEach(c=>stats[c.farol.cor]=(stats[c.farol.cor]||0)+1);
  const statsEl=document.getElementById('fer-stats');
  if(statsEl) statsEl.innerHTML=`
    <div class="stats-grid" style="margin-bottom:0">
      <div class="stat-card green"><div class="stat-val" style="color:var(--green)">${stats.verde}</div><div class="stat-label">Ferias OK</div></div>
      <div class="stat-card yellow"><div class="stat-val" style="color:var(--yellow)">${stats.amarelo}</div><div class="stat-label">Vencida 1-9m</div></div>
      <div class="stat-card orange"><div class="stat-val" style="color:var(--orange)">${stats.laranja}</div><div class="stat-label">Vencida 10-12m</div></div>
      <div class="stat-card red"><div class="stat-val" style="color:var(--red)">${stats.vermelho}</div><div class="stat-label">Vencida +12m</div></div>
      <div class="stat-card"><div class="stat-val" style="color:var(--text2)">${stats.sem}</div><div class="stat-label">Sem dados</div></div>
      <div class="stat-card"><div class="stat-val" style="color:#9CA3AF">${stats.na}</div><div class="stat-label">N/A</div></div>
    </div>`;
}

function renderFarois(dados){
  const corMap={verde:'var(--green)',amarelo:'var(--yellow)',laranja:'var(--orange)',vermelho:'var(--red)',sem:'var(--text3)',na:'#9CA3AF'};
  const bgMap={verde:'#ECFDF5',amarelo:'#FEFCE8',laranja:'#FFF7ED',vermelho:'#FEF2F2',sem:'#F9FAFB',na:'#F3F4F6'};

  const colunas=[
    {cor:'verde',titulo:'Ferias OK',icone:''},
    {cor:'amarelo',titulo:'Vencida 1-9m',icone:''},
    {cor:'laranja',titulo:'Vencida 10-12m',icone:''},
    {cor:'vermelho',titulo:'Vencida +12m',icone:''},
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
            return '<div style="background:#fff;border:1px solid '+corMap[col.cor]+'44;border-radius:6px;padding:7px 9px;cursor:pointer" '
              +'onclick="abrirDetalheFerias(\''+c._id+'\')" title="Clique para detalhes">'
              +'<div style="font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+c.nome+'</div>'
              +'<div style="font-size:10px;color:var(--text2);margin-top:2px">'
              +(f.cor!=='sem'?'Venc: '+f.vencStr:'Sem admissao/venc.')
              +(c.ferMes?' &middot; Agendado: '+c.ferMes:'')
              +'</div>'
              +(c.ferSaldo?'<div style="font-size:10px;color:'+corMap[col.cor]+';font-weight:700;margin-top:2px">Saldo: '+c.ferSaldo+' dias</div>':'')
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

  if(tbl) tbl.innerHTML='<div style="margin-bottom:8px;font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase">Tabela Detalhada</div>'
    +'<div style="overflow-x:auto;border-radius:var(--radius);border:1px solid var(--border)">'
    +'<table style="width:100%;border-collapse:collapse;font-size:12px">'
    +'<thead><tr style="background:var(--blue-dark);color:#fff">'
    +'<th style="padding:9px 10px;text-align:left">Status</th>'
    +'<th style="padding:9px 10px;text-align:left">Matricula</th>'
    +'<th style="padding:9px 10px;text-align:left">Nome</th>'
    +'<th style="padding:9px 10px;text-align:left">Departamento</th>'
    +'<th style="padding:9px 10px;text-align:left">Admissao</th>'
    +'<th style="padding:9px 10px;text-align:left">Vencimento</th>'
    +'<th style="padding:9px 10px;text-align:right">Saldo (dias)</th>'
    +'<th style="padding:9px 10px;text-align:left">Mes Agendado</th>'
    +'<th style="padding:9px 10px;text-align:center">Acoes</th>'
    +'</tr></thead><tbody>'
    +sorted.map((c,i)=>{
      const f=c.farol;
      const cor=corMap[f.cor];
      return '<tr style="border-bottom:1px solid var(--border);background:'+(i%2===0?'#F8F9FB':'')+'">'
        +'<td style="padding:8px 10px"><div style="width:18px;height:18px;border-radius:50%;background:'+cor+';display:inline-block;vertical-align:middle"></div></td>'
        +'<td style="padding:8px 10px"><code style="font-size:10px">'+(c.mat||'\u2014')+'</code></td>'
        +'<td style="padding:8px 10px;font-weight:500">'+c.nome+'</td>'
        +'<td style="padding:8px 10px;font-size:11px;color:var(--text2)">'+(c.depto||'\u2014')+'</td>'
        +'<td style="padding:8px 10px;font-size:11px">'+(c.admissao||'\u2014')+'</td>'
        +'<td style="padding:8px 10px;font-size:11px;font-weight:600;color:'+cor+'">'+f.vencStr+'</td>'
        +'<td style="padding:8px 10px;text-align:right;font-weight:600">'+(c.ferSaldo!=null?c.ferSaldo:f.dias)+'</td>'
        +'<td style="padding:8px 10px;font-size:11px">'+(c.ferMes||'\u2014')+'</td>'
        +'<td style="padding:8px 10px;text-align:center"><button class="btn btn-ghost btn-sm" onclick="abrirDetalheFerias(\''+c._id+'\')">Editar</button></td>'
        +'</tr>';
    }).join('')+'</tbody></table></div>';
}

// ── Modal de detalhe/edicao de ferias de um colaborador ─────────
function abrirDetalheFerias(id){
  const c=colaboradores.find(x=>x._id===id); if(!c) return;
  const f=getFarol(c);
  const meses=['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  // Remove modal anterior se ainda existir (evita duplicatas)
  document.getElementById('modal-ferias-detalhe')?.remove();

  const html=`
    <div class="modal-overlay" id="modal-ferias-detalhe" data-dynamic="1" onclick="if(event.target===this) closeModal('modal-ferias-detalhe')">
      <div class="modal" style="max-width:520px">
        <div class="modal-title">F\u00E9rias \u2014 ${c.nome}</div>
        <div class="modal-sub">Matricula ${c.mat||'\u2014'} &middot; Vencimento atual: ${f.vencStr} (${f.label})</div>
        <div class="form-grid cols2">
          <div class="fg">
            <label>Data de admissao</label>
            <input type="date" id="ferd-admissao" value="${c.admissao||''}">
          </div>
          <div class="fg">
            <label>Data de vencimento (proximo ciclo)</label>
            <input type="date" id="ferd-venc" value="${c.ferVenc||''}">
          </div>
          <div class="fg">
            <label>Saldo de dias acumulados</label>
            <input type="number" id="ferd-saldo" value="${c.ferSaldo!=null?c.ferSaldo:30}" min="0" max="90">
          </div>
          <div class="fg">
            <label>Data de agendamento das ferias</label>
            <input type="date" id="ferd-agend" value="${c.ferAgend||''}" oninput="onFerAgendDetalhe()">
          </div>
          <div class="fg">
            <label>Mes agendado para tirar ferias</label>
            <select id="ferd-mes">
              <option value="">-- Nao agendado --</option>
              ${meses.map(m=>'<option value="'+m+'" '+(c.ferMes===m?'selected':'')+'>'+m+'</option>').join('')}
            </select>
            <span class="text-xs text-muted" style="margin-top:2px">Se informar a data acima, o mes e definido por ela.</span>
          </div>
        </div>
        <p class="text-xs text-muted" style="margin-top:10px">A data de vencimento, se deixada em branco, e calculada automaticamente a partir da admissao.</p>
        <div id="ferd-alertas" style="margin-top:10px"></div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('modal-ferias-detalhe')">Cancelar</button>
          <button class="btn btn-primary" onclick="salvarDetalheFerias('${id}')">Salvar</button>
        </div>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('modal-ferias-detalhe')?.classList.add('open');
  verificarAlertasFerias(id);
}

// Verifica se ha conflito de funcao no mesmo mes ao mudar o agendamento
function verificarAlertasFerias(id){
  const sel=document.getElementById('ferd-mes');
  if(!sel) return;
  sel.addEventListener('change', ()=>{
    const c=colaboradores.find(x=>x._id===id);
    const novoMes=sel.value;
    const alertasEl=document.getElementById('ferd-alertas');
    if(!novoMes||!c){ alertasEl.innerHTML=''; return; }

    // Verificar outros colaboradores da mesma funcao/cargo no mesmo mes
    const mesmoCargo=colaboradores.filter(x=>
      x._id!==id &&
      x.cargo && c.cargo &&
      x.cargo.toUpperCase()===c.cargo.toUpperCase() &&
      x.ferMes===novoMes &&
      !STATUS_NAO_RECEBE.includes(x.status)
    );

    if(mesmoCargo.length>0){
      alertasEl.innerHTML='<div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:6px;padding:8px 10px;font-size:12px;color:#92400E">'
        +'<strong>Atencao:</strong> '+mesmoCargo.length+' colaborador(es) com a mesma funcao ja estao agendados para '+novoMes+': '
        +mesmoCargo.map(x=>x.nome).join(', ')
        +'</div>';
    } else {
      alertasEl.innerHTML='';
    }
  });
}

// No modal de ferias, ao informar a data de agendamento, sincroniza o select de mes
function onFerAgendDetalhe(){
  const ag=document.getElementById('ferd-agend')?.value||'';
  const sel=document.getElementById('ferd-mes');
  if(sel && ag){ const m=mesNomeFerias(ag); if(m) sel.value=m; }
}

async function salvarDetalheFerias(id){
  const c=colaboradores.find(x=>x._id===id); if(!c) return;
  const saldo=fnum(document.getElementById('ferd-saldo')?.value);
  const mes=document.getElementById('ferd-mes')?.value||'';
  const venc=document.getElementById('ferd-venc')?.value||'';
  const agend=document.getElementById('ferd-agend')?.value||'';
  const admissao=document.getElementById('ferd-admissao')?.value||'';

  c.ferSaldo=saldo;
  c.ferVenc=venc||'';
  c.ferAgend=agend||'';
  // Se houver data de agendamento, o mes deriva dela; senao usa o mes escolhido no select
  c.ferMes=agend?(mesNomeFerias(agend)||mes):mes;
  c.admissao=admissao||c.admissao||'';

  try{
    await fsSet('colaboradores',id,c);
    toast('Ferias atualizadas!','success');
    closeModal('modal-ferias-detalhe');
    if(currentPage==='fer-radar') renderFerRadar();
    if(currentPage==='fer-agendadas') renderFeriasAgendadas();
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
  baseAtualizada: false,
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
      <h2>Premio de Assiduidade</h2>
      <p>Siga os 7 passos para calcular e exportar o premio. Valor fixo: R$ 226,00</p>
    </div>
    <div id="premio-wizard"></div>`;
}

function afterRenderPremio(){
  renderPremioWizard();
}

function renderPremioWizard(){
  const el = document.getElementById('premio-wizard');
  if(!el) return;

  const passos = [
    {n:1, label:'Atualizar Base'},
    {n:2, label:'Iniciar Apuracao'},
    {n:3, label:'Importar Apontamentos'},
    {n:4, label:'Analise dos Dados'},
    {n:5, label:'Aplicar Regras'},
    {n:55, label:'Revisao MEI'},
    {n:6, label:'Exportar Caju'},
    {n:7, label:'Fechar Competencia'},
  ];

  const atual = premioState.passo;
  const passoAtualStr = String(atual);

  // Barra de progresso
  const barraHtml = '<div style="display:flex;gap:0;margin-bottom:24px;border-radius:var(--radius);overflow:hidden;border:1px solid var(--border)">'
    + passos.map(p=>{
        const pn = String(p.n);
        const done = (pn < passoAtualStr && pn !== '55') || (passoAtualStr === '6' && pn === 55) || (passoAtualStr === '7' && pn === 55);
        const active = pn === passoAtualStr;
        const bg = done?'var(--green)':active?'var(--blue)':'var(--surface2)';
        const color = (done||active)?'#fff':'var(--text3)';
        return '<div style="flex:1;padding:8px 4px;background:'+bg+';text-align:center;cursor:'+(done?'pointer':'default')+';border-right:1px solid rgba(0,0,0,.1)" '
          +(done?'onclick="premioIrPasso('+p.n+')"':'')+'>'
          +'<div style="font-size:11px;font-weight:700;color:'+color+'">'+p.n+'</div>'
          +'<div style="font-size:9px;color:'+color+';opacity:.85">'+p.label+'</div>'
          +'</div>';
      }).join('')
    + '</div>';

  let conteudo = '';

  if(atual === 1){
    // ── PASSO 1: Atualizar Base ──
    const afastadosBase = colaboradores.filter(c=>c.status==='Afastado').length;
    const ativos = colaboradores.filter(c=>c.status==='Ativo').length;

    conteudo = `
      <div class="card">
        <div class="card-title" style="color:var(--blue)">Passo 1 — Atualizar Base de Colaboradores</div>
        <p class="text-sm text-muted" style="margin-bottom:16px">
          Importe o relatorio de afastados da Senior para atualizar o status dos colaboradores antes de iniciar o calculo.
        </p>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px">
          <div class="stat-card green"><div class="stat-val" style="color:var(--green)">${ativos}</div><div class="stat-label">Ativos na base</div></div>
          <div class="stat-card blue"><div class="stat-val" style="color:var(--blue)">${afastadosBase}</div><div class="stat-label">Ja marcados afastados</div></div>
          <div class="stat-card"><div class="stat-val" style="color:var(--text2)">${colaboradores.length}</div><div class="stat-label">Total na base</div></div>
        </div>

        <div style="background:#FEF3C7;border:1.5px solid #FDE68A;border-radius:var(--radius);padding:14px;margin-bottom:16px">
          <div style="font-weight:600;font-size:13px;color:#92400E;margin-bottom:6px">Deseja atualizar a base com o relatorio de afastados?</div>
          <p class="text-xs" style="color:#92400E;margin-bottom:12px">
          O sistema vai marcar como Afastado os colaboradores que constam no relatorio.<br>
          <strong>Importante:</strong> Colaboradores com filtro SOC, PART serao automaticamente N/A.
          Colaboradores Afastados serao automaticamente NAO no premio.
        </p>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <div>
              <div style="font-size:11px;font-weight:600;margin-bottom:6px;color:var(--text2)">PDF de Afastados (Senior):</div>
              <label class="btn btn-primary btn-sm" style="cursor:pointer">
                Selecionar PDF de Afastados
                <input type="file" id="premio-afastados-file" accept=".pdf,.xlsx,.xls" style="display:none" onchange="processarAfastadosPremio(event)">
              </label>
            </div>
          </div>
          <div id="premio-afastados-preview" style="margin-top:12px"></div>
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button class="btn btn-ghost" onclick="premioIrPasso(2)">Pular (base ja esta atualizada)</button>
          <button class="btn btn-primary" onclick="premioConfirmarBase()" ${premioState.baseAtualizada?'':'disabled'} id="btn-passo1-ok">
            Base atualizada — Ir para Passo 2
          </button>
        </div>
      </div>`;

  } else if(atual === 2){
    // ── PASSO 2: Competência ──
    const anos=[2024,2025,2026,2027];
    const anoAtual=new Date().getFullYear();
    const mesAtual=new Date().getMonth()+1;
    const meses=[{v:1,l:'Janeiro'},{v:2,l:'Fevereiro'},{v:3,l:'Marco'},{v:4,l:'Abril'},
      {v:5,l:'Maio'},{v:6,l:'Junho'},{v:7,l:'Julho'},{v:8,l:'Agosto'},
      {v:9,l:'Setembro'},{v:10,l:'Outubro'},{v:11,l:'Novembro'},{v:12,l:'Dezembro'}];

    conteudo = `
      <div class="card">
        <div class="card-title" style="color:var(--blue)">Passo 2 — Definir Competencia</div>
        <p class="text-sm text-muted" style="margin-bottom:16px">Selecione o mes e ano de referencia para o calculo do premio.</p>
        <div style="display:flex;gap:16px;align-items:flex-end;flex-wrap:wrap;margin-bottom:20px">
          <div class="fg">
            <label>Mes</label>
            <select id="premio-mes" style="padding:9px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;min-width:140px">
              ${meses.map(m=>'<option value="'+m.v+'" '+(m.v===mesAtual?'selected':'')+'>'+m.l+'</option>').join('')}
            </select>
          </div>
          <div class="fg">
            <label>Ano</label>
            <select id="premio-ano" style="padding:9px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px">
              ${anos.map(a=>'<option value="'+a+'" '+(a===anoAtual?'selected':'')+'>'+a+'</option>').join('')}
            </select>
          </div>
        </div>
        <div style="display:flex;gap:10px;justify-content:space-between">
          <button class="btn btn-ghost" onclick="premioIrPasso(1)">Voltar</button>
          <button class="btn btn-primary" onclick="premioIniciarApuracao()">Iniciar Apuracao — Ir para Passo 3</button>
        </div>
      </div>`;

  } else if(atual === 3){
    // ── PASSO 3: Importar PDF ──
    conteudo = `
      <div class="card">
        <div class="card-title" style="color:var(--blue)">Passo 3 — Importar Apontamentos</div>
        <div style="background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:var(--radius);padding:12px;margin-bottom:16px">
          <strong style="font-size:13px">Competencia: ${premioState.competencia}</strong>
          <p class="text-xs text-muted" style="margin-top:4px">Importe o relatorio "Apuracao Colaborador" gerado pela Senior (PDF).</p>
        </div>
        <div style="background:#F0FDF4;border:1.5px solid #A7F3D0;border-radius:var(--radius);padding:12px;margin-bottom:16px;font-size:12px">
          <strong>De/Para dos codigos do relatorio:</strong><br>
          014 = Atestado &nbsp;|&nbsp; 015 = Faltas &nbsp;|&nbsp; 020 = Atestado Horas &nbsp;|&nbsp;
          064 = Atestado Noturno &nbsp;|&nbsp; 101 = Saida Antecipada &nbsp;|&nbsp;
          103 = Atraso &nbsp;|&nbsp; 107 = Falta Parcial &nbsp;|&nbsp; 108 = Abono Gestor
        </div>
        <div class="upload-zone" onclick="document.getElementById('premio-apuracao-file').click()">
          <input type="file" id="premio-apuracao-file" accept=".pdf,.xlsx,.xls,.txt,.csv" style="display:none" onchange="processarApuracaoPremio(event)">
          <div style="font-size:28px;margin-bottom:8px">&#8679;</div>
          <div class="upload-text">Selecionar PDF de Apuracao</div>
          <div class="upload-sub">Relatorio "HRAP001.APU" da Senior — PDF ou Excel</div>
        </div>
        <div id="premio-apuracao-preview" style="margin-top:14px"></div>
        <div style="display:flex;gap:10px;justify-content:space-between;margin-top:16px">
          <button class="btn btn-ghost" onclick="premioIrPasso(2)">Voltar</button>
        </div>
      </div>`;

  } else if(atual === 4){
    // ── PASSO 4: Tabela de análise ──
    conteudo = renderPremioTabelaHTML();

  } else if(atual === 5){
    // ── PASSO 5: Regras aplicadas ──
    conteudo = renderPremioTabelaHTML(true);

  } else if(atual === 55){
    // ── PASSO 5b: Revisão MEI ──
    const meis = premioState.tabela.filter(r=>r.situacao==='MEI');
    if(meis.length === 0){
      premioState.passo = 6;
      renderPremioWizard();
      return;
    }
    conteudo = `
      <div class="card">
        <div class="card-title" style="color:var(--blue)">Revisao dos Colaboradores MEI (${meis.length})</div>
        <p class="text-sm text-muted" style="margin-bottom:12px">
          MEI recebem por padrao. Mude para NAO os que perderam por apontamentos externos.
        </p>
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <input type="text" id="mei-q" placeholder="Buscar nome ou matricula..."
            oninput="filtrarTabelaMei()"
            style="flex:1;padding:8px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px">
          <div style="background:#EFF6FF;border-radius:var(--radius-sm);padding:8px 14px;font-size:13px;color:var(--blue);white-space:nowrap" id="mei-resumo">
            ${meis.filter(r=>r.recebe==='SIM').length} SIM &nbsp;|&nbsp; ${meis.filter(r=>r.recebe==='NAO').length} NAO &nbsp;|&nbsp; ${brl(meis.filter(r=>r.recebe==='SIM').length*226)}
          </div>
        </div>
        <div style="overflow:auto;border-radius:var(--radius);border:1px solid var(--border);max-height:420px;margin-bottom:14px">
          <table style="border-collapse:collapse;font-size:12px;width:100%">
            <thead>
              <tr style="background:#1E3A8A;color:#fff;position:sticky;top:0;z-index:2">
                <th style="padding:9px 12px;text-align:left;min-width:80px">Matricula</th>
                <th style="padding:9px 12px;text-align:left;min-width:180px">Nome</th>
                <th style="padding:9px 12px;text-align:center;min-width:65px">Atraso</th>
                <th style="padding:9px 12px;text-align:center;min-width:65px">Saida</th>
                <th style="padding:9px 12px;text-align:center;min-width:65px">Atestado</th>
                <th style="padding:9px 12px;text-align:center;min-width:65px">Faltas</th>
                <th style="padding:9px 12px;text-align:center;min-width:65px">Abono</th>
                <th style="padding:9px 12px;text-align:center;min-width:90px;background:#1B5E20">Recebe</th>
              </tr>
            </thead>
            <tbody id="mei-tbody">
              ${renderMeiLinhas(meis)}
            </tbody>
          </table>
        </div>
        <div style="display:flex;gap:10px;justify-content:space-between">
          <button class="btn btn-ghost" onclick="premioIrPasso(5)">Voltar</button>
          <button class="btn btn-primary" onclick="premioIrPasso(6)">Confirmar e Ver Lista Completa</button>
        </div>
      </div>`;

  } else if(atual === 6){
    // ── PASSO 6: Lista completa + Exportar Caju ──
    const sim = premioState.tabela.filter(r=>r.recebe==='SIM');
    const nao = premioState.tabela.filter(r=>r.recebe==='NAO');

    conteudo = `
      <div class="card">
        <div class="card-title" style="color:var(--blue)">Passo 6 — Lista Final e Exportar Caju</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
          <div class="stat-card green"><div class="stat-val" style="color:var(--green)">${sim.length}</div><div class="stat-label">Receberao</div></div>
          <div class="stat-card red"><div class="stat-val" style="color:var(--red)">${nao.length}</div><div class="stat-label">Nao receberao</div></div>
          <div class="stat-card green"><div class="stat-val" style="color:var(--green);font-size:16px">${brl(sim.length*226)}</div><div class="stat-label">Total a pagar</div></div>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
          <input type="text" id="passo6-q" placeholder="Buscar nome ou matricula..."
            oninput="filtrarPasso6()"
            style="flex:1;min-width:200px;padding:8px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px">
          <select id="passo6-f" onchange="filtrarPasso6()"
            style="padding:8px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px">
            <option value="">Todos</option>
            <option value="SIM">SIM</option>
            <option value="NAO">NAO</option>
            <option value="MEI">MEI</option>
          </select>
        </div>
        <div style="overflow:auto;border-radius:var(--radius);border:1px solid var(--border);max-height:380px;margin-bottom:14px">
          <table style="border-collapse:collapse;font-size:11px;width:100%">
            <thead>
              <tr style="background:#1E3A8A;color:#fff;position:sticky;top:0;z-index:2">
                <th style="padding:8px 10px;text-align:left;min-width:70px">Matricula</th>
                <th style="padding:8px 10px;text-align:left;min-width:160px">Nome</th>
                <th style="padding:8px 10px;text-align:left;min-width:80px">Situacao</th>
                <th style="padding:8px 10px;text-align:center;min-width:90px;background:#1B5E20">Recebe</th>
                <th style="padding:8px 10px;text-align:right;min-width:80px;background:#1B5E20">Valor</th>
              </tr>
            </thead>
            <tbody id="passo6-tbody">
              ${renderPasso6Linhas(premioState.tabela)}
            </tbody>
          </table>
        </div>
        <div style="display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap">
          <div style="display:flex;gap:8px">
            <button class="btn btn-ghost" onclick="premioIrPasso(55)">Voltar para MEI</button>
            <button class="btn btn-ghost btn-sm" onclick="exportarPremioExcel()">Excel (completo)</button>
            <button class="btn btn-ghost btn-sm" onclick="exportarDiagnosticoPremio()">Diagnostico</button>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-success" onclick="exportarPremioCaju()">Exportar CSV Caju (${sim.length} colaboradores)</button>
            <button class="btn btn-primary" onclick="premioIrPasso(7)">Fechar Competencia</button>
          </div>
        </div>
      </div>`;

  } else if(atual === 7){
    // ── PASSO 7: Fechar competência ──
    const sim = premioState.tabela.filter(r=>r.recebe==='SIM').length;
    conteudo = `
      <div class="card">
        <div class="card-title" style="color:var(--blue)">Passo 7 — Fechar Competencia</div>
        <div style="background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:var(--radius);padding:14px;margin-bottom:16px">
          <div style="font-size:15px;font-weight:700">Competencia: ${premioState.competencia}</div>
          <div style="font-size:13px;margin-top:6px">${premioState.tabela.length} colaboradores analisados</div>
          <div style="font-size:13px">${sim} receberao o premio — Total: ${brl(sim*226)}</div>
        </div>
        <p class="text-sm text-muted" style="margin-bottom:16px">
          Ao fechar, os dados serao salvos no historico e estarao disponiveis para o dashboard e indicadores.
          Esta acao nao impede novas importacoes para a mesma competencia.
        </p>
        <div style="display:flex;gap:10px;justify-content:space-between">
          <button class="btn btn-ghost" onclick="premioIrPasso(6)">Voltar</button>
          <button class="btn btn-success" onclick="fecharCompetencionPremio()">Fechar Competencia ${premioState.competencia}</button>
        </div>
      </div>`;
  }

  el.innerHTML = barraHtml + conteudo;
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

  prevEl.innerHTML='<div class="alert alert-success"><strong>'+apontamentos.length+'</strong> colaboradores lidos. '
    +'<button class="btn btn-primary btn-sm" onclick="premioIrPasso(4)" style="margin-left:10px">Ver Tabela (Passo 4)</button></div>';
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
      nome: c.nome,
      cpf: c.cpf||'',
      situacao,
      statusBase: statusNorm||'',
      filtro: c.filtro||'OK',
      recebe: '',  // será preenchido ao aplicar regras
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
  if(!t||t.length===0) return '<div class="alert alert-warning">Nenhum dado. Volte ao Passo 3 e importe os apontamentos.</div>';

  const sim = t.filter(r=>r.recebe==='SIM').length;
  const nao = t.filter(r=>r.recebe==='NAO').length;
  const analisar = t.filter(r=>r.recebe==='ANALISAR').length;
  const vazio = t.filter(r=>!r.recebe).length;

  return `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:14px">
        <div>
          <div class="card-title" style="color:var(--blue)">Passo ${comRegras?'5 — Regras Aplicadas':'4 — Analise dos Dados'}</div>
          <div class="text-sm text-muted">Competencia: <strong>${premioState.competencia}</strong> | ${t.length} colaboradores</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${comRegras?'<button class="btn btn-primary btn-sm" onclick="premioIrPasso(55)">Ir para Revisao MEI</button>':''}
          <button class="btn btn-warning btn-sm" onclick="aplicarRegrasPremio()">Aplicar Regras Automaticas</button>
          <button class="btn btn-ghost btn-sm" onclick="exportarDiagnosticoPremio()">Exportar diagnostico</button>
          <button class="btn btn-ghost btn-sm" onclick="premioIrPasso(${comRegras?4:2})">Voltar</button>
        </div>
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">
        <div class="stat-card green" style="padding:8px 12px"><div style="font-size:18px;font-weight:700;color:var(--green)">${sim}</div><div style="font-size:11px">Sim</div></div>
        <div class="stat-card red" style="padding:8px 12px"><div style="font-size:18px;font-weight:700;color:var(--red)">${nao}</div><div style="font-size:11px">Nao</div></div>

        <div class="stat-card" style="padding:8px 12px"><div style="font-size:18px;font-weight:700;color:var(--text3)">${vazio}</div><div style="font-size:11px">Pendente</div></div>
        <div class="stat-card green" style="padding:8px 12px"><div style="font-size:14px;font-weight:700;color:var(--green)">${brl(sim*226)}</div><div style="font-size:11px">Total</div></div>
      </div>

      ${(()=>{
        const meis=t.filter(r=>r.situacao==="MEI"&&r.recebe==="SIM");
        if(!meis.length) return "";
        return '<div style="background:#FEF3C7;border:1.5px solid #FDE68A;border-radius:8px;padding:12px 16px;margin-bottom:12px">'
          +'<div style="font-weight:700;font-size:13px;color:#92400E;margin-bottom:6px">MEI — Revisao Manual Necessaria ('+meis.length+')</div>'
          +'<p style="font-size:12px;color:#92400E;margin-bottom:8px">Verifique os apontamentos externos e altere para NAO os que perderam o premio.</p>'
          +'<div style="display:flex;flex-wrap:wrap;gap:6px">'
          +meis.map(r=>'<span style="background:#fff;border:1px solid #FDE68A;border-radius:6px;padding:4px 10px;font-size:12px"><strong>'+r.nome.split(" ")[0]+' '+r.nome.split(" ").slice(-1)[0]+'</strong> <code style="font-size:10px;color:#999">'+r.mat+'</code></span>').join("")
          +'</div></div>';
      })()}

      <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
        <input type="text" id="premio-q" placeholder="Buscar nome ou matricula..." oninput="filtrarTabelaPremio()"
          style="flex:1;min-width:200px;padding:7px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px">
        <select id="premio-f-sit" onchange="filtrarTabelaPremio()"
          style="padding:7px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px">
          <option value="">Todas as situacoes</option>
          <option value="Ativo">Ativo</option>
          <option value="Ativo">Ativo</option>
          <option value="Afastado">Afastado</option>
          <option value="MEI">MEI</option>
          <option value="DUP">DUP</option>
          <option value="N/A">N/A</option>
        </select>
        <select id="premio-f-rec" onchange="filtrarTabelaPremio()"
          style="padding:7px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px">
          <option value="">Todos os resultados</option>
          <option value="SIM">Recebe</option>
          <option value="NAO">Nao recebe</option>

          <option value="">Pendente</option>
        </select>
      </div>

      <div style="overflow:auto;border-radius:var(--radius);border:1px solid var(--border);max-height:520px">
        <table style="border-collapse:collapse;font-size:11px;width:100%">
          <thead>
            <tr style="background:#1E3A8A;color:#fff;position:sticky;top:0;z-index:2">
              <th style="padding:9px 8px;text-align:left;position:sticky;left:0;background:#1E3A8A;min-width:70px">Mat.</th>
              <th style="padding:9px 8px;text-align:left;position:sticky;left:70px;background:#1E3A8A;min-width:180px">Nome</th>
              <th style="padding:9px 8px;min-width:100px">CPF</th>
              <th style="padding:9px 8px;min-width:90px">Situacao</th>
              <th style="padding:9px 8px;min-width:80px">Status Base</th>
              <th style="padding:9px 8px;min-width:90px;background:#1B5E20">Recebe</th>
              <th style="padding:9px 8px;min-width:70px">Atraso</th>
              <th style="padding:9px 8px;min-width:70px">Saida Ant.</th>
              <th style="padding:9px 8px;min-width:70px">Atestado</th>
              <th style="padding:9px 8px;min-width:70px">Ates.Horas</th>
              <th style="padding:9px 8px;min-width:70px">Ates.Not.</th>
              <th style="padding:9px 8px;min-width:70px">Faltas</th>
              <th style="padding:9px 8px;min-width:70px">Ft.Parcial</th>
              <th style="padding:9px 8px;min-width:70px">Abono</th>
            </tr>
          </thead>
          <tbody id="premio-tbody">
            ${renderPremioLinhas(t)}
          </tbody>
        </table>
      </div>
    </div>`;
}

function renderPremioLinhas(dados){
  return dados.map((r,i)=>{
    const bg = i%2===0?'#F8F9FB':'';
    const corRec = r.recebe==='SIM'?'var(--green)':r.recebe==='NAO'?'var(--red)':r.recebe==='ANALISAR'?'var(--yellow)':'var(--text3)';
    const badgeRec = r.recebe==='SIM'?'badge-green':r.recebe==='NAO'?'badge-red':r.recebe==='ANALISAR'?'badge-yellow':'badge-gray';
    const labelRec = r.recebe||'—';

    const corCampo = (v,limite)=> v>limite?'color:var(--red);font-weight:700':v>0?'color:var(--yellow)':'color:#ccc';

    return '<tr style="border-bottom:1px solid var(--border);background:'+bg+'" id="premio-row-'+i+'">'
      +'<td style="padding:8px;position:sticky;left:0;background:'+( bg||'#fff')+'"><code style="font-size:10px">'+r.mat+'</code></td>'
      +'<td style="padding:8px;position:sticky;left:70px;background:'+( bg||'#fff')+';font-weight:500;max-width:180px;overflow:hidden;text-overflow:ellipsis" title="'+r.nome+'">'+r.nome+'</td>'
      +'<td style="padding:8px;font-size:10px">'+r.cpf+'</td>'
      +'<td style="padding:8px"><span class="badge '+(r.situacao==='Ativo'?'badge-green':r.situacao==='Afastado'?'badge-red':r.situacao==='MEI'?'badge-yellow':'badge-gray')+'">'+r.situacao+'</span></td>'
      +'<td style="padding:8px;background:'+(bg?'#F0FFF4':'#E8FFF0')+';text-align:center">'
        +'<select onchange="editarRecebeRow('+i+',this.value)" style="padding:3px 6px;border:1px solid var(--border);border-radius:4px;font-size:11px;background:transparent;color:'+corRec+';font-weight:700">'
        +'<option value="" '+(r.recebe===''?'selected':'')+'>—</option>'
        +'<option value="SIM" '+(r.recebe==='SIM'?'selected':'')+'>SIM</option>'
        +'<option value="NAO" '+(r.recebe==='NAO'?'selected':'')+'>NAO</option>'

        +'</select>'
      +'</td>'
      +'<td style="padding:8px;text-align:center;'+corCampo(r.atraso,10)+'">'+min2str(r.atraso)+'</td>'
      +'<td style="padding:8px;text-align:center;'+corCampo(r.saida,10)+'">'+min2str(r.saida)+'</td>'
      +'<td style="padding:8px;text-align:center;'+corCampo(r.atestado,0)+'">'+min2str(r.atestado)+'</td>'
      +'<td style="padding:8px;text-align:center;'+corCampo(r.aHoras,0)+'">'+min2str(r.aHoras)+'</td>'
      +'<td style="padding:8px;text-align:center;'+corCampo(r.aNoturno,0)+'">'+min2str(r.aNoturno)+'</td>'
      +'<td style="padding:8px;text-align:center;'+corCampo(r.faltas,0)+'">'+min2str(r.faltas)+'</td>'
      +'<td style="padding:8px;text-align:center;'+corCampo(r.faltaParcial,0)+'">'+min2str(r.faltaParcial)+'</td>'
      +'<td style="padding:8px;text-align:center;'+corCampo(r.abono,59)+'">'+min2str(r.abono)+'</td>'
      +'</tr>';
  }).join('');
}

function filtrarTabelaPremio(){
  const q = (document.getElementById('premio-q')?.value||'').toLowerCase();
  const fSit = document.getElementById('premio-f-sit')?.value||'';
  const fRec = document.getElementById('premio-f-rec')?.value||'';
  let dados = premioState.tabela;
  if(q) dados = dados.filter(r=>r.nome.toLowerCase().includes(q)||r.mat.includes(q));
  if(fSit) dados = dados.filter(r=>r.situacao===fSit);
  if(fRec) dados = dados.filter(r=>r.recebe===fRec);
  const tbody = document.getElementById('premio-tbody');
  if(tbody) tbody.innerHTML = renderPremioLinhas(dados);
}


function atualizarMeiRow(sel){
  sel.style.color = sel.value==='SIM'?'var(--green)':'var(--red)';
  // Atualizar o resumo
  const meis = premioState.tabela.filter(r=>r.situacao==='MEI');
  const sim = meis.filter(r=>r.recebe==='SIM').length;
  const nao = meis.filter(r=>r.recebe==='NAO').length;
  // Tentar atualizar o resumo na tela
  const resumo = document.querySelector('[data-mei-resumo]');
  if(resumo) resumo.textContent = sim+' MEI receberao ('+brl(sim*226)+') | '+nao+' nao receberao';
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
    if(r.situacao==='N/A'||statusBaseNAO||statusBaseCesta||
       STATUS_SO_CESTA.some(s=>r.situacao===s)||r.situacao==='Demitido'){
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
    linhas.push([cpf,r.mat||'','226.00','0','0','0','0','0','0','0','0','0','0'].join(';'));
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
      r.recebe==='SIM'?226:0])
  ];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Premio Assiduidade');
  XLSX.writeFile(wb,'Premio_Assiduidade_'+premioState.competencia.replace('/','_')+'.xlsx');
  toast('Excel exportado!','success');
}

async function fecharCompetencionPremio(){
  if(!premioState.tabela.length){toast('Nenhum dado para fechar','error');return;}
  if(!confirm('Fechar competencia '+premioState.competencia+'?')) return;
  const sim=premioState.tabela.filter(r=>r.recebe==='SIM');
  const snap={
    competencia:premioState.competencia,
    modulo:'premio',
    fechadoEm:new Date().toISOString(),
    totalColaboradores:premioState.tabela.length,
    totalElegiveis:sim.length,
    totalNaoElegiveis:premioState.tabela.filter(r=>r.recebe==='NAO').length,
    totalAnalisar:premioState.tabela.filter(r=>r.recebe==='ANALISAR').length,
    valorTotal:sim.length*226,
    detalhes:premioState.tabela,
  };
  try{
    await fsSet('historico','premio_'+premioState.competencia.replace('/','_'),snap);
    toast('Competencia '+premioState.competencia+' fechada!','success');
    // Reset estado para novo processo
    premioState={passo:1,competencia:'',baseAtualizada:false,afastados:[],apontamentos:[],tabela:[]};
    renderPremioWizard();
  }catch(e){toast('Erro: '+e.message,'error');}
}

// ================================================================
// ATUALIZAÇÃO MENSAL DA BASE — Excel da Senior
// ================================================================

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

    const novos=[], demitidos=[], mudancas=[];
    let iguais=0;

    // Novos: estão na Senior mas não na base
    Object.values(seniorMap).forEach(s=>{
      if(!baseMap[s.mat]){
        novos.push(s);
      } else {
        const c=baseMap[s.mat];
        if(c.status!==s.status){
          mudancas.push({colab:c, novoStatus:s.status, statusAnterior:c.status});
        } else {
          iguais++;
        }
      }
    });

    // Demitidos: estão na base como Trabalhando mas não aparecem na Senior
    colaboradores.filter(c=>c.mat&&c.status==='Trabalhando').forEach(c=>{
      if(!seniorMap[c.mat]) demitidos.push(c);
    });

    atuPendente={novos,demitidos,mudancas,iguais};
    renderAtuPreview(novos,demitidos,mudancas,iguais);
    event.target.value='';
  };
  reader.readAsBinaryString(file);
}

function renderAtuPreview(novos,demitidos,mudancas,iguais){
  const prev=document.getElementById('atu-preview'); if(!prev) return;

  let html=`
    <div class="stats-grid" style="margin-bottom:16px">
      <div class="stat-card green"><div class="stat-val" style="color:var(--green)">${iguais}</div><div class="stat-label">Sem alteracao</div></div>
      <div class="stat-card blue"><div class="stat-val" style="color:var(--blue)">${novos.length}</div><div class="stat-label">Novos admitidos</div></div>
      <div class="stat-card red"><div class="stat-val" style="color:var(--red)">${demitidos.length}</div><div class="stat-label">Possiveis demissoes</div></div>
      <div class="stat-card yellow"><div class="stat-val" style="color:var(--yellow)">${mudancas.length}</div><div class="stat-label">Mudancas de status</div></div>
    </div>`;

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
      mobilidade:'perto',elegibilidade:{vr:false,cafe:false,mobilidade:false,folha:true}};
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

  prev.innerHTML=`<div class="alert alert-success">
    Atualizacao concluida!<br>
    <strong>${nMud}</strong> status atualizados &middot;
    <strong>${nNov}</strong> novos incluidos &middot;
    <strong>${nDem}</strong> marcados como Demitido<br>
    Base atual: <strong>${colaboradores.length}</strong> colaboradores
  </div>`;

  setSS('${colaboradores.length} colaboradores','ok');
  toast('Base atualizada!','success');
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
  if(el) el.innerHTML = sim+' SIM &nbsp;|&nbsp; '+nao+' NAO &nbsp;|&nbsp; '+brl(sim*226);
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
      +'<td style="padding:7px 10px;text-align:right;font-weight:600;font-family:monospace;color:var(--green)">'+(r.recebe==='SIM'?brl(226):'—')+'</td>'
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
      <h2>F\u00E9rias Agendadas</h2>
      <p>Visualize quais colaboradores est\u00E3o com f\u00E9rias agendadas em cada m\u00EAs.</p>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
      <div style="display:flex;gap:8px;flex-wrap:wrap;flex:1">
        <input type="text" id="feragd-q" placeholder="Buscar por nome, matr\u00EDcula, departamento ou cargo..." oninput="renderFeriasAgendadas()"
          style="padding:7px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:12px;flex:1;min-width:220px">
        <select id="feragd-dep" onchange="renderFeriasAgendadas()" style="padding:7px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:12px">
          <option value="">Todos os deptos</option>
          ${getDeptoList().map(d=>'<option value="'+d+'">'+d+'</option>').join('')}
        </select>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="exportarFeriasAgendadasExcel()">Excel</button>
    </div>
    <div id="feragd-resumo" style="margin-bottom:14px"></div>
    <div id="feragd-grid"></div>
    <div id="feragd-sem" style="margin-top:20px"></div>`;
}

function renderFeriasAgendadas(){
  const meses=['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const q=(document.getElementById('feragd-q')?.value||'').toLowerCase();
  const depF=document.getElementById('feragd-dep')?.value||'';

  let base=colaboradores.filter(c=>!STATUS_NAO_RECEBE.includes(c.status) && c.status!=='Inativo');
  if(depF) base=base.filter(c=>(c.depto||'')===depF);
  if(q) base=base.filter(c=>
    c.nome.toLowerCase().includes(q) ||
    (c.mat||'').toLowerCase().includes(q) ||
    (c.depto||'').toLowerCase().includes(q) ||
    (c.cargo||'').toLowerCase().includes(q)
  );

  const agendados=base.filter(c=>c.ferMes);
  const semAgenda=base.filter(c=>!c.ferMes);

  // Reordena os meses comecando pelo mes atual (visao "proximos meses primeiro")
  const mesAtualIdx=new Date().getMonth();
  const mesesOrdenados=[...meses.slice(mesAtualIdx),...meses.slice(0,mesAtualIdx)];

  // Resumo
  const resumoEl=document.getElementById('feragd-resumo');
  if(resumoEl){
    resumoEl.innerHTML=`<div class="alert alert-info">
      <strong>${agendados.length}</strong> colaborador(es) com f\u00E9rias agendadas &middot;
      <strong>${semAgenda.length}</strong> sem m\u00EAs definido (de ${base.length} no total)
    </div>`;
  }

  // Grid por mes — mesmo padrao visual do kanban de vencimento (renderFarois)
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
          +'<span style="font-size:12px;font-weight:700;color:'+cor+'">'+mes.substring(0,3)+(isAtual?' \u2022':'')+'</span>'
          +'<span style="background:'+cor+';color:#fff;font-size:12px;font-weight:700;border-radius:20px;padding:2px 9px;min-width:24px;text-align:center">'+itens.length+'</span>'
          +'</div>'
          +'<div style="display:flex;flex-direction:column;gap:6px;max-height:480px;overflow-y:auto">'
          +(itens.length===0
            ? '<div class="text-xs text-muted" style="padding:4px 2px">\u2014</div>'
            : itens.map(c=>{
                const f=getFarol(c);
                const corMap={verde:'var(--green)',amarelo:'var(--yellow)',laranja:'var(--orange)',vermelho:'var(--red)',sem:'var(--text3)',na:'#9CA3AF'};
                return '<div style="background:#fff;border:1px solid '+cor+'44;border-radius:6px;padding:7px 9px;cursor:pointer" '
                  +'onclick="abrirDetalheFerias(\''+c._id+'\')" title="'+c.nome+' \u2014 '+(c.cargo||'\u2014')+' \u2014 '+(c.depto||'\u2014')+' \u2014 Venc: '+f.vencStr+' (clique para editar)">'
                  +'<div style="font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+c.nome+'</div>'
                  +'<div style="font-size:10px;color:var(--text2);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(c.depto||'\u2014')+'</div>'
                  +'<div style="font-size:10px;margin-top:2px;color:'+corMap[f.cor]+';font-weight:600">Saldo: '+(c.ferSaldo!=null?c.ferSaldo:f.dias)+'d</div>'
                  +'</div>';
              }).join(''))
          +'</div></div>';
      }).join('')
      +'</div>';
  }

  // Lista de colaboradores sem mes definido
  const semEl=document.getElementById('feragd-sem');
  if(semEl){
    if(semAgenda.length===0){
      semEl.innerHTML='';
    } else {
      semEl.innerHTML='<div style="margin-bottom:8px;font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase">Sem m\u00EAs de f\u00E9rias definido ('+semAgenda.length+')</div>'
        +'<div style="overflow-x:auto;border-radius:var(--radius);border:1px solid var(--border)">'
        +'<table style="width:100%;border-collapse:collapse;font-size:12px">'
        +'<thead><tr style="background:var(--blue-dark);color:#fff">'
        +'<th style="padding:8px 10px;text-align:left">Matricula</th>'
        +'<th style="padding:8px 10px;text-align:left">Nome</th>'
        +'<th style="padding:8px 10px;text-align:left">Cargo</th>'
        +'<th style="padding:8px 10px;text-align:left">Departamento</th>'
        +'<th style="padding:8px 10px;text-align:center">A\u00E7\u00F5es</th>'
        +'</tr></thead><tbody>'
        +semAgenda.sort((a,b)=>a.nome.localeCompare(b.nome)).map((c,i)=>
          '<tr style="border-bottom:1px solid var(--border);background:'+(i%2===0?'#F8F9FB':'')+'">'
          +'<td style="padding:8px 10px"><code style="font-size:10px">'+(c.mat||'\u2014')+'</code></td>'
          +'<td style="padding:8px 10px;font-weight:500">'+c.nome+'</td>'
          +'<td style="padding:8px 10px;font-size:11px;color:var(--text2)">'+(c.cargo||'\u2014')+'</td>'
          +'<td style="padding:8px 10px;font-size:11px;color:var(--text2)">'+(c.depto||'\u2014')+'</td>'
          +'<td style="padding:8px 10px;text-align:center"><button class="btn btn-ghost btn-sm" onclick="abrirDetalheFerias(\''+c._id+'\')">Agendar</button></td>'
          +'</tr>'
        ).join('')+'</tbody></table></div>';
    }
  }
}

function exportarFeriasAgendadasExcel(){
  const meses=['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const base=colaboradores.filter(c=>!STATUS_NAO_RECEBE.includes(c.status) && c.status!=='Inativo');
  const rows=[['Mes Agendado','Matricula','Nome','CPF','Cargo','Departamento','Saldo (dias)','Vencimento']];
  base.filter(c=>c.ferMes).sort((a,b)=>{
    const ia=meses.indexOf(a.ferMes), ib=meses.indexOf(b.ferMes);
    return ia!==ib ? ia-ib : a.nome.localeCompare(b.nome);
  }).forEach(c=>{
    const f=getFarol(c);
    rows.push([c.ferMes,c.mat||'',c.nome,c.cpf||'',c.cargo||'',c.depto||'',c.ferSaldo!=null?c.ferSaldo:f.dias,f.vencStr]);
  });
  base.filter(c=>!c.ferMes).sort((a,b)=>a.nome.localeCompare(b.nome)).forEach(c=>{
    const f=getFarol(c);
    rows.push(['Sem mes definido',c.mat||'',c.nome,c.cpf||'',c.cargo||'',c.depto||'',c.ferSaldo!=null?c.ferSaldo:f.dias,f.vencStr]);
  });
  const wb=XLSX.utils.book_new();
  const ws=XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb,ws,'Ferias Agendadas');
  XLSX.writeFile(wb,'Ferias_Agendadas.xlsx');
  toast('\u2705 Excel gerado!','success');
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

// ── Sugestao de mes para novo colaborador (ponto 5) ───────────────
// Chamada ao salvar um NOVO colaborador (cadastro)
function sugerirMesFeriasNovo(cargo){
  if(!cargo) return null;
  // Buscar colaboradores da mesma funcao que tem mes agendado
  const mesmosCargo=colaboradores.filter(c=>
    c.cargo && c.cargo.toUpperCase()===cargo.toUpperCase() &&
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
  if(!colab.ferMes || !colab.cargo) return;
  try{
    const key=colab.cargo.toUpperCase()+'|'+(colab.depto||'');
    const snap=await window._getDoc(window._doc('config','feriasVagas'));
    const vagas=snap.exists()?(snap.data().vagas||{}):{};
    vagas[key]=colab.ferMes;
    await fsSet('config','feriasVagas',{vagas});
  }catch(e){ console.error('Erro ao registrar vaga:', e); }
}

async function consultarVagaFerias(cargo, depto){
  try{
    const key=(cargo||'').toUpperCase()+'|'+(depto||'');
    const snap=await window._getDoc(window._doc('config','feriasVagas'));
    if(!snap.exists()) return null;
    const vagas=snap.data().vagas||{};
    return vagas[key]||null;
  }catch(e){ return null; }
}
