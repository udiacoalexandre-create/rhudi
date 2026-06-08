

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
function closeModal(id){ document.getElementById(id)?.classList.remove('open'); }

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
          <select id="${prefix}-status">
            <option value="Ativo" ${(c?.status||'Ativo')==='Ativo'?'selected':''}>Ativo</option>
            <option value="Inativo" ${c?.status==='Inativo'?'selected':''}>Inativo</option>
            <option value="Férias" ${(c?.status==='Férias'||c?.status==='Férias')?'selected':''}>F\u00E9rias</option>
          </select>
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
    {id:'vr',    label:'VR\uFE0F Vale Refei\u00E7\u00E3o',      checked:eleg.vr!==undefined?eleg.vr:fnum(c?.vr)>0},
    {id:'cafe',  label:'\u2615 Caf\u00E9 da Manh\u00E3',        checked:eleg.cafe!==undefined?eleg.cafe:fnum(c?.cafe)>0},
    {id:'mobilidade',label:'Mob Mobilidade',       checked:eleg.mobilidade!==undefined?eleg.mobilidade:(fnum(c?.comb)>0||[1,2,3,4].some(n=>fnum(c?.['vt'+n])>0))},
    {id:'folha', label:'💰 Folha de Pagamento',   checked:eleg.folha!==undefined?eleg.folha:true},
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
}

function toggleMob(prefix){
  const v=document.getElementById(prefix+'-mobilidade')?.value||'perto';
  const bc=document.getElementById(prefix+'-bloco-comb');
  const bv=document.getElementById(prefix+'-bloco-vt');
  if(bc) bc.style.display=v==='combustivel'?'block':'none';
  if(bv) bv.style.display=v==='vt'?'block':'none';
}

function initFormDisplay(prefix){
  ['vr','cafe','mobilidade'].forEach(t=>onElegChange(prefix,t,document.getElementById(prefix+'-eleg-'+t)?.checked||false));
}

function getColabFromForm(prefix){
  const mob=document.getElementById(prefix+'-mobilidade')?.value||'perto';
  const eleg={
    vr:      document.getElementById(prefix+'-eleg-vr')?.checked||false,
    cafe:    document.getElementById(prefix+'-eleg-cafe')?.checked||false,
    mobilidade: document.getElementById(prefix+'-eleg-mobilidade')?.checked||false,
    folha:   document.getElementById(prefix+'-eleg-folha')?.checked!==false,
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
  try{await fsSet('colaboradores',id,c);colaboradores.push(c);toast('Colaborador salvo!','success');limparFormColab('f');}
  catch(e){toast('Erro: '+e.message,'error');}
}

function limparFormColab(prefix){
  ['mat','nome','cpf','cargo','depto','vr','cafe','comb','vt1','v1','vt2','v2','vt3','v3','vt4','v4'].forEach(f=>{
    const el=document.getElementById(prefix+'-'+f); if(el) el.value='';
  });
  const st=document.getElementById(prefix+'-status'); if(st) st.value='Ativo';
  const fi=document.getElementById(prefix+'-filtro'); if(fi) fi.value='OK';
  const mob=document.getElementById(prefix+'-mobilidade'); if(mob) mob.value='perto';
  ['vr','cafe','mobilidade'].forEach(t=>onElegChange(prefix,t,false));
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
  Object.assign(colaboradores[idx],dados);
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
    {id:'fer-import',icon:'',label:'Importar Dados'},
  ]},
  dashboard:{pages:[
    {id:'dash-main',icon:'',label:'Dashboard Geral'},
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
    'base-lista':pgBaseLista,'base-sync':pgBaseSync,'base-carga':pgBaseCarga,'base-import':pgBaseImport,'base-novo':pgBaseNovo,'premio-main':pgPremioAssiduidade,
    'ben-lancamento':pgBenLancamento,'ben-importar':pgBenImportar,
    'ben-exportar-caju':pgBenExportarCaju,'ben-exportar-senior':pgBenExportarSenior,
    'ben-historico':pgBenHistorico,'ben-config':pgBenConfig,
    'folha-import':pgFolhaImport,'folha-view':pgFolhaView,
    'fer-radar':pgFerRadar,'fer-import':pgFerImport,
    'dash-main':pgDashMain,
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
  if(id==='folha-view') renderFolhaView();
  if(id==='fer-radar') renderFerRadar();
  if(id==='dash-main') renderDashMain();
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
          <th>Transporte</th><th>A\u00E7\u00F5es</th>
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

function renderColabList(){
  const f=filtrarColabs();
  const cnt=document.getElementById('bl-count');
  if(cnt) cnt.textContent=f.length+' de '+colaboradores.length+' colaboradores';
  const tbody=document.getElementById('bl-tbody'); if(!tbody) return;
  if(f.length===0){
    tbody.innerHTML='<tr><td colspan="10"><div class="empty-state"><div class="empty-icon"></div><p>Nenhum resultado.</p></div></td></tr>';
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
    ['Matr\u00EDcula','Nome','CPF','Cargo','Departamento','Status','VR/dia','Caf\u00E9/dia','Combust\u00EDvel','Mobilidade'],
    ['10001234','EXEMPLO DA SILVA','123.456.789-00','MOTORISTA','Motoristas','Ativo',0,0,295,'combustivel'],
    ['10001235','OUTRO EXEMPLO','234.567.890-11','AJUDANTE','Produ\u00E7\u00E3o','Ativo',35,15,0,'vt'],
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
  if(c.status==='Inativo') return {vr:0,cafe:0,comb:0,vt:0};
  const cfg=getCfg();
  const eleg=c.elegibilidade||{};
  const mob=inferMob(c);
  const vr  = (eleg.vr!==false&&fnum(c.vr)>0)  ? (cfg.vr==='mult'?fnum(c.vr)*dr:fnum(c.vr))   : 0;
  const cafe = (eleg.cafe!==false&&fnum(c.cafe)>0)? (cfg.cafe==='mult'?fnum(c.cafe)*dr:fnum(c.cafe)) : 0;
  let comb=0;
  if(eleg.mobilidade!==false&&mob==='combustivel'&&fnum(c.comb)>0){
    if(cfg.comb==='fixo') comb=fnum(c.comb);
    else comb=calcMob(fnum(c.comb),dr,du);
  }
  const vt=(eleg.mobilidade!==false&&mob==='vt')
    ? (cfg.vt==='mult'?calcVT(c,dr):calcVT(c,1)) : 0;
  const cesta=(c.elegibilidade?.cesta!==false&&c.status!=='Inativo')?185:0;
  return {vr,cafe,comb,vt,cesta};
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
}

function limparFiltrosLan(){
  ['lan-q','lan-emp','lan-dep','lan-ben'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  renderLancamento();
}

function getLanAtivos(){
  const du=fnum(g('lan-du'))||22;
  const q=(g('lan-q')||'').toLowerCase();
  const empF=g('lan-emp'),depF=g('lan-dep'),benF=g('lan-ben');
  let f=colaboradores.filter(c=>c.status!=='Inativo');
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
  let tVR=0,tCafe=0,tComb=0,tVT=0;
  ativos.forEach(c=>{
    const dr=getLanDR(c.mat,du);
    const {vr,cafe,comb,vt}=calcBen(c,dr,getLanDU(c.mat,du));
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
    const locked=l.locked||false;
    const du2=l.duteis!==undefined?fnum(l.duteis):du;
    const fat=fnum(l.faltas),fev=fnum(l.ferias),ext=fnum(l.extras);
    const dr=Math.max(0,du2-fat-fev+ext);
    const {vr,cafe,comb,vt,cesta}=calcBen(c,dr,du2);
    const total=vr+cafe+comb+vt+cesta;
    const dis=locked?'disabled':'' ;
    return `<tr>
      <td><code style="font-size:10px">${c.mat||'\u2014'}</code></td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;font-size:12px" title="${c.nome}">${c.nome}</td>
      <td style="text-align:center"><input type="checkbox" ${locked?'checked':''} title="${locked?'Desbloquear':'Travar'}" onchange="toggleLock('${c.mat}',this.checked)" style="cursor:pointer;accent-color:var(--yellow)"></td>
      <td><input type="number" value="${du2}" min="0" max="31" class="input-du ${locked?'cell-locked':''}" ${dis} onchange="setLan('${c.mat}','duteis',this.value)"></td>
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

async function toggleLock(mat,locked){
  if(!lancamento[mat]) lancamento[mat]={};
  lancamento[mat].locked=locked;
  try{ await fsSetLan(mat,lancamento[mat]); }catch(e){}
  renderLancamento();
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
    if(lancamento[c.mat]?.locked||c.diasFixos){travados++;return;} // pula travados e diasFixos
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
  let tVR=0,tCafe=0,tComb=0,tVT=0;
  const detalhes=ativos.map(c=>{
    const du2=getLanDU(c.mat,du);
    const dr=getLanDR(c.mat,du);
    const {vr,cafe,comb,vt}=calcBen(c,dr,du2);
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
  let f=colaboradores.filter(c=>c.status!=='Inativo');
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
    const {vr,cafe,comb,vt}=calcBen(c,dr,getLanDU(c.mat,du));
    const alim=vr+cafe, mob=comb+vt;
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
        const {vr,cafe,comb,vt}=calcBen(c,dr,getLanDU(c.mat,du));
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
  const nomes={vr:'VR',cafe:'Cafe_Manha',comb:'Mobilidade',vt:'VT'};
  const linhas=['CPF,Empresa,Valor'];
  let f=colaboradores.filter(c=>c.status!=='Inativo');
  if(empSel) f=f.filter(c=>String(c.mat||'').startsWith(empSel));
  f.forEach(c=>{
    const dr=getLanDR(c.mat,du);
    const {vr,cafe,comb,vt}=calcBen(c,dr,getLanDU(c.mat,du));
    const val=tipo==='vr'?vr:tipo==='cafe'?cafe:tipo==='comb'?comb:vt;
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
  ['vr','cafe','comb','vt'].forEach((t,i)=>setTimeout(()=>exportarSenior(t),i*400));
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
          {name:'cfg-vr',label:'VR\uFE0F Vale Refei\u00E7\u00E3o',sub:'Valor/dia no cadastro',opts:[{v:'mult',l:'Valor \u00D7 dias trabalhados'},{v:'fixo',l:'Valor fixo mensal'}],def:'mult'},
          {name:'cfg-cafe',label:'\u2615 Caf\u00E9 da Manh\u00E3',sub:'Valor/dia no cadastro',opts:[{v:'mult',l:'Valor \u00D7 dias trabalhados'},{v:'fixo',l:'Valor fixo mensal'}],def:'fixo'},
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
      const {vr,cafe,comb,vt}=calcBen(c,dr,du2);
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
// FOLHA DE PAGAMENTO
// ============================================================
function pgFolhaImport(){
  return `
    <div class="page-header"><h2> Importar Relat\u00F3rio Senior</h2><p>Transforme o relat\u00F3rio de eventos em folha por colaborador.</p></div>
    <div class="card">
      <div class="alert alert-info" style="margin-bottom:14px">
        Formato esperado: <strong>Cadastro | Nome | Evento | Descri\u00E7\u00E3o | Valor</strong>
      </div>
      <div class="upload-zone" onclick="document.getElementById('folha-file').click()">
        <input type="file" id="folha-file" accept=".xlsx,.xls" onchange="processarFolha(event)">
        <div class="upload-icon">$</div>
        <div class="upload-text">Clique para selecionar o relat\u00F3rio de eventos</div>
        <div class="upload-sub">Formato .xlsx ou .xls</div>
      </div>
      <div id="folha-import-preview" style="margin-top:14px"></div>
    </div>`;
}

function pgFolhaView(){
  return `
    <div class="page-header"><h2> Folha de Pagamento</h2><p id="folha-sub">Importe um relat\u00F3rio para visualizar.</p></div>
    <div id="folha-content">
      <div class="alert alert-warning">\u26A0\uFE0F Nenhuma folha importada ainda. Acesse "Importar Relat\u00F3rio" para come\u00E7ar.</div>
    </div>`;
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
    const iEv=hs.findIndex(h=>h==='evento'||(h.includes('evento')&&!h.includes('descri')));
    const iValor=hs.findIndex(h=>h.includes('valor'));
    const porColab={};
    for(let i=hi+1;i<data.length;i++){
      const r=data[i]; if(!r||!r[iMat]) continue;
      const mat=String(r[iMat]||'').trim();
      const nome=String(r[iNome]||'').trim().toUpperCase();
      const ev=String(r[iEv]||'').trim();
      const val=fnum(r[iValor]);
      if(!porColab[mat]) porColab[mat]={mat,nome,eventos:{}};
      if(ev) porColab[mat].eventos[ev]=(porColab[mat].eventos[ev]||0)+val;
    }
    const du=fnum(g('lan-du'))||22;
    Object.keys(porColab).forEach(mat=>{
      const c=colaboradores.find(x=>x.mat===mat);
      if(c){
        porColab[mat].depto=c.depto||''; porColab[mat].cargo=c.cargo||''; porColab[mat].cpf=c.cpf||'';
        const dr=getLanDR(mat,du);
        const {vr,cafe,comb,vt}=calcBen(c,dr,getLanDU(mat,du));
        porColab[mat].ben={vr,cafe,comb,vt};
      }
    });
    folhaData=Object.values(porColab);
    const prev=document.getElementById('folha-import-preview');
    if(prev) prev.innerHTML=`<div class="alert alert-success">
      \u2705 <strong>${folhaData.length} colaboradores</strong> processados.
      <button class="btn btn-primary btn-sm" onclick="switchModule('folha');showPage('folha-view')" style="margin-left:10px">Ver Folha \u2192</button>
    </div>`;
    toast('\u2705 Folha processada: '+folhaData.length+' colaboradores','success');
    event.target.value='';
  };
  reader.readAsBinaryString(file);
}

function renderFolhaView(){
  if(!folhaData||folhaData.length===0) return;
  const todosEv=[...new Set(folhaData.flatMap(d=>Object.keys(d.eventos||{})))].sort((a,b)=>parseInt(a)-parseInt(b));
  const sub=document.getElementById('folha-sub');
  if(sub) sub.textContent=`${folhaData.length} colaboradores \u00B7 ${todosEv.length} tipos de eventos`;
  const cont=document.getElementById('folha-content');
  if(!cont) return;
  cont.innerHTML=`
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center">
      <input type="text" id="folha-q" placeholder=" Buscar..." oninput="filtrarFolha()"
        style="flex:1;min-width:180px;padding:8px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px">
      <button class="btn btn-success btn-sm" onclick="exportarFolhaExcel()"> Exportar Excel</button>
    </div>
    <div id="folha-count" class="text-xs text-muted" style="margin-bottom:8px">${folhaData.length} colaboradores</div>
    <div class="folha-wrap">
      <table class="folha-tbl">
        <thead>
          <tr>
            <th style="min-width:80px;position:sticky;left:0;z-index:2;background:var(--blue-dark)">Matr\u00EDcula</th>
            <th style="min-width:160px;position:sticky;left:80px;z-index:2;background:var(--blue-dark)">Nome</th>
            <th style="min-width:120px">CPF</th>
            <th style="min-width:100px">Departamento</th>
            ${todosEv.map(ev=>`<th title="${EVENTOS_MAP[ev]||ev}" style="min-width:80px">${EVENTOS_MAP[ev]||('Ev.'+ev)}</th>`).join('')}
            <th style="background:#1B5E20;min-width:80px">VR\uFE0F VR</th>
            <th style="background:#1B5E20;min-width:80px">\u2615 Caf\u00E9</th>
            <th style="background:#1B5E20;min-width:80px">\u26FD Comb.</th>
            <th style="background:#1B5E20;min-width:80px">VT</th>
          </tr>
        </thead>
        <tbody id="folha-tbody">
          ${folhaData.map((d,i)=>`<tr style="background:${i%2===0?'#F8F9FB':''}">
            <td style="text-align:left;position:sticky;left:0;background:${i%2===0?'#F8F9FB':'#fff'}"><code>${d.mat}</code></td>
            <td style="text-align:left;position:sticky;left:80px;background:${i%2===0?'#F8F9FB':'#fff'};max-width:160px;overflow:hidden;text-overflow:ellipsis" title="${d.nome}">${d.nome}</td>
            <td style="text-align:left"><code style="font-size:9px">${d.cpf||'\u2014'}</code></td>
            <td style="text-align:left;font-size:10px;max-width:100px;overflow:hidden;text-overflow:ellipsis">${d.depto||'\u2014'}</td>
            ${todosEv.map(ev=>d.eventos[ev]?`<td style="color:${fnum(d.eventos[ev])<0?'var(--red)':'inherit'}">${brl(d.eventos[ev])}</td>`:'<td style="color:#d1d5db">\u2014</td>').join('')}
            <td style="color:var(--orange)">${d.ben?.vr>0?brl(d.ben.vr):'\u2014'}</td>
            <td style="color:var(--yellow)">${d.ben?.cafe>0?brl(d.ben.cafe):'\u2014'}</td>
            <td style="color:var(--orange)">${d.ben?.comb>0?brl(d.ben.comb):'\u2014'}</td>
            <td style="color:var(--blue)">${d.ben?.vt>0?brl(d.ben.vt):'\u2014'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function filtrarFolha(){
  const q=(document.getElementById('folha-q')?.value||'').toLowerCase();
  const rows=document.querySelectorAll('#folha-tbody tr');
  let vis=0;
  rows.forEach(row=>{
    const show=row.textContent.toLowerCase().includes(q);
    row.style.display=show?'':'none';
    if(show)vis++;
  });
  const cnt=document.getElementById('folha-count');
  if(cnt) cnt.textContent=vis+' colaboradores';
}

function exportarFolhaExcel(){
  if(!folhaData||folhaData.length===0){toast('Nenhuma folha','error');return;}
  const todosEv=[...new Set(folhaData.flatMap(d=>Object.keys(d.eventos||{})))].sort((a,b)=>parseInt(a)-parseInt(b));
  const header=['Matr\u00EDcula','Nome','CPF','Departamento',...todosEv.map(ev=>EVENTOS_MAP[ev]||('Evento '+ev)),'VR','Caf\u00E9','Combust\u00EDvel','VT','Total Benef\u00EDcios'];
  const rows=[header,...folhaData.map(d=>{
    const row=[d.mat,d.nome,d.cpf||'',d.depto||''];
    todosEv.forEach(ev=>row.push(d.eventos[ev]||''));
    const b=d.ben||{};
    row.push(b.vr||'',b.cafe||'',b.comb||'',b.vt||'',((b.vr||0)+(b.cafe||0)+(b.comb||0)+(b.vt||0))||'');
    return row;
  })];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Folha por Equipes');
  XLSX.writeFile(wb,'Folha_'+new Date().toLocaleDateString('pt-BR').replace(/\//g,'_')+'.xlsx');
  toast('\u2705 Folha exportada!','success');
}

// ============================================================
// CONTROLE DE F\u00C9RIAS
// ============================================================
function pgFerRadar(){
  return `
    <div class="page-header">
      <h2> Radar de F\u00E9rias</h2>
      <p>Visualiza\u00E7\u00E3o do status de f\u00E9rias por colaborador.</p>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:6px;font-size:12px"><div style="width:14px;height:14px;border-radius:50%;background:var(--green)"></div>F\u00E9rias n\u00E3o vencida</div>
        <div style="display:flex;align-items:center;gap:6px;font-size:12px"><div style="width:14px;height:14px;border-radius:50%;background:var(--yellow)"></div>Vencida (1-10 meses)</div>
        <div style="display:flex;align-items:center;gap:6px;font-size:12px"><div style="width:14px;height:14px;border-radius:50%;background:var(--orange)"></div>Vencida (11-12 meses)</div>
        <div style="display:flex;align-items:center;gap:6px;font-size:12px"><div style="width:14px;height:14px;border-radius:50%;background:var(--red)"></div>Vencida (+12 meses)</div>
      </div>
      <div style="margin-left:auto;display:flex;gap:8px">
        <select id="fer-emp" onchange="renderFerRadar()" style="padding:7px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:12px">
          <option value="">Todas as empresas</option>
          ${getEmpresaList().map(e=>`<option value="${e.cod}">${e.cod}</option>`).join('')}
        </select>
        <select id="fer-dep" onchange="renderFerRadar()" style="padding:7px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:12px">
          <option value="">Todos os deptos</option>
          ${getDeptoList().map(d=>`<option value="${d}">${d}</option>`).join('')}
        </select>
        <button class="btn btn-ghost btn-sm" onclick="exportarFeriasExcel()"> Excel</button>
      </div>
    </div>
    <div id="fer-stats" style="margin-bottom:16px"></div>
    <div id="fer-radar-grid"></div>
    <div id="fer-tabela" style="margin-top:20px"></div>`;
}

function renderFerRadar(){
  const hoje=new Date(); hoje.setHours(0,0,0,0);
  const empF=document.getElementById('fer-emp')?.value||'';
  const depF=document.getElementById('fer-dep')?.value||'';
  let f=colaboradores.filter(c=>c.status!=='Inativo');
  if(empF) f=f.filter(c=>String(c.mat||'').startsWith(empF));
  if(depF) f=f.filter(c=>(c.depto||'')===depF);

  function getDotClass(c){
    if(!c.ferVenc) return null;
    const venc=new Date(c.ferVenc);
    const meses=(hoje-venc)/(1000*60*60*24*30);
    if(meses<0) return {cls:'dot-green',label:'OK',meses:Math.abs(Math.round(meses))};
    if(meses<=10) return {cls:'dot-yellow',label:Math.round(meses)+'m venc.',meses:Math.round(meses)};
    if(meses<=12) return {cls:'dot-orange',label:Math.round(meses)+'m venc.',meses:Math.round(meses)};
    return {cls:'dot-red',label:Math.round(meses)+'m venc.',meses:Math.round(meses)};
  }

  const comFerias=f.filter(c=>c.ferVenc);
  const semFerias=f.filter(c=>!c.ferVenc);
  const stats={verde:0,amarelo:0,laranja:0,vermelho:0};
  comFerias.forEach(c=>{
    const d=getDotClass(c);
    if(d?.cls==='dot-green')stats.verde++;
    else if(d?.cls==='dot-yellow')stats.amarelo++;
    else if(d?.cls==='dot-orange')stats.laranja++;
    else if(d?.cls==='dot-red')stats.vermelho++;
  });

  const statsEl=document.getElementById('fer-stats');
  if(statsEl) statsEl.innerHTML=`
    <div class="stats-grid" style="margin-bottom:0">
      <div class="stat-card green"><div class="stat-val" style="color:var(--green)">${stats.verde}</div><div class="stat-label">\u2705 F\u00E9rias OK</div></div>
      <div class="stat-card yellow"><div class="stat-val" style="color:var(--yellow)">${stats.amarelo}</div><div class="stat-label">\u26A0\uFE0F Vencida 1-10m</div></div>
      <div class="stat-card orange"><div class="stat-val" style="color:var(--orange)">${stats.laranja}</div><div class="stat-label"> Vencida 11-12m</div></div>
      <div class="stat-card red"><div class="stat-val" style="color:var(--red)">${stats.vermelho}</div><div class="stat-label"> Vencida +12m</div></div>
      <div class="stat-card"><div class="stat-val" style="color:var(--text2)">${semFerias.length}</div><div class="stat-label">Sem dados de f\u00E9rias</div></div>
    </div>`;

  const grid=document.getElementById('fer-radar-grid');
  if(grid){
    const comDados=comFerias.sort((a,b)=>{
      const da=getDotClass(a),db=getDotClass(b);
      const order={null:-1,'dot-green':0,'dot-yellow':1,'dot-orange':2,'dot-red':3};
      return (order[db?.cls]||0)-(order[da?.cls]||0);
    });
    grid.innerHTML=`
      <div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px">
        ${comDados.length} colaboradores com dados de f\u00E9rias
      </div>
      <div class="radar-container">
        ${comDados.map(c=>{
          const d=getDotClass(c);
          if(!d) return '';
          const diasDisp=c.ferDias||30;
          return `<div class="radar-item" title="${c.nome} \u2014 Venc: ${c.ferVenc||'\u2014'}">
            <div class="radar-dot ${d.cls}">${d.meses}m</div>
            <div class="radar-name">${c.nome.split(' ')[0]} ${c.nome.split(' ').slice(-1)[0]}</div>
            <div class="radar-venc">Venc: ${c.ferVenc||'\u2014'}</div>
            <div class="radar-dias" style="color:${d.cls==='dot-green'?'var(--green)':d.cls==='dot-yellow'?'var(--yellow)':d.cls==='dot-orange'?'var(--orange)':'var(--red)'}">
              ${diasDisp} dias
            </div>
          </div>`;
        }).join('')}
      </div>`;
  }

  // Tabela
  const tbl=document.getElementById('fer-tabela');
  if(tbl) tbl.innerHTML=`
    <div class="card-title" style="margin-bottom:10px"> Tabela Detalhada</div>
    <div class="tbl-wrap">
      <table class="tbl">
        <thead><tr>
          <th>Status</th><th>Matr\u00EDcula</th><th>Nome</th><th>Departamento</th>
          <th>Em F\u00E9rias</th><th>In\u00EDcio</th><th>Fim</th><th>Vencimento</th><th>Dias Disp.</th>
        </tr></thead>
        <tbody>
          ${f.map((c,i)=>{
            const d=getDotClass(c);
            const dot=d?`<div class="radar-dot ${d.cls}" style="width:24px;height:24px;font-size:9px;margin:0">${d.meses}m</div>`:'<div style="width:24px;height:24px;border-radius:50%;background:var(--border);margin:0"></div>';
            return `<tr>
              <td>${dot}</td>
              <td><code style="font-size:10px">${c.mat||'\u2014'}</code></td>
              <td style="font-size:12px;font-weight:500">${c.nome}</td>
              <td class="text-xs text-muted">${c.depto||'\u2014'}</td>
              <td>${c.status==='Férias'||c.status==='Férias'?'<span class="badge badge-blue">Ferias\uFE0F Sim</span>':'\u2014'}</td>
              <td class="text-xs">${c.ferInicio||'\u2014'}</td>
              <td class="text-xs">${c.ferFim||'\u2014'}</td>
              <td class="text-xs">${c.ferVenc||'\u2014'}</td>
              <td class="text-xs">${c.ferDias||'\u2014'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

function pgFerImport(){
  return `
    <div class="page-header"><h2> Importar Dados de F\u00E9rias</h2><p>Atualize as datas de f\u00E9rias a partir do relat\u00F3rio da Senior.</p></div>
    <div class="card">
      <div class="alert alert-info" style="margin-bottom:14px">
        Colunas esperadas: <strong>Matr\u00EDcula, Nome, Data In\u00EDcio, Data Fim, Data Vencimento, Dias Dispon\u00EDveis</strong>
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
    const iIni=hs.findIndex(h=>h.includes('inicio')||h.includes('in\u00EDcio')||h.includes('ini'));
    const iFim=hs.findIndex(h=>h.includes('fim')||h.includes('retorno'));
    const iVenc=hs.findIndex(h=>h.includes('venc'));
    const iDias=hs.findIndex(h=>h.includes('dias'));
    const b=window._writeBatch(window._db); let ok=0;
    for(let i=hi+1;i<data.length;i++){
      const r=data[i]; if(!r||!r[iMat]) continue;
      const mat=String(r[iMat]||'').trim();
      const c=colaboradores.find(x=>x.mat===mat); if(!c) continue;
      try{
        if(r[iIni]) c.ferInicio=new Date(r[iIni]).toISOString().split('T')[0];
        if(r[iFim])  c.ferFim   =new Date(r[iFim]).toISOString().split('T')[0];
        if(r[iVenc]) c.ferVenc  =new Date(r[iVenc]).toISOString().split('T')[0];
        if(r[iDias]) c.ferDias  =fnum(r[iDias]);
        b.set(window._doc('colaboradores',c._id),c); ok++;
      }catch(err){}
    }
    await b.commit();
    document.getElementById('fer-import-prev').innerHTML=
      `<div class="alert alert-success">\u2705 <strong>${ok} colaboradores</strong> atualizados com dados de f\u00E9rias.</div>`;
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
  let tVR=0,tCafe=0,tComb=0,tVT=0;
  colaboradores.filter(c=>c.status!=='Inativo').forEach(c=>{
    const dr=getLanDR(c.mat,du);
    const {vr,cafe,comb,vt}=calcBen(c,dr,getLanDU(c.mat,du));
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
                const {vr,cafe,comb,vt}=calcBen(c,dr,getLanDU(c.mat,du));
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
let premioData = null;

function pgPremioAssiduidade(){
  return `
    <div class="page-header">
      <h2>Premio de Assiduidade</h2>
      <p>Importar relatorio da Senior e calcular elegibilidade. Valor fixo: R$ 226,00</p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:16px" id="premio-stats">
      <div class="stat-card green"><div class="stat-val" id="ps-elegivel">-</div><div class="stat-label">Tem direito</div></div>
      <div class="stat-card red"><div class="stat-val" id="ps-nao">-</div><div class="stat-label">Nao tem direito</div></div>
      <div class="stat-card yellow"><div class="stat-val" id="ps-analisar">-</div><div class="stat-label">Analisar</div></div>
      <div class="stat-card blue"><div class="stat-val" id="ps-total-val">-</div><div class="stat-label">Total a pagar</div></div>
    </div>

    <div class="card">
      <div class="upload-zone" onclick="document.getElementById('premio-file').click()">
        <input type="file" id="premio-file" accept=".xlsx,.xls" onchange="processarPremio(event)">
        <div class="upload-icon"></div>
        <div class="upload-text">Clique para selecionar o relatorio de assiduidade</div>
        <div class="upload-sub">Colunas: Cadastro, Nome, CPF, Situacao, Atraso, Saida Antecipada, Atestado, Atestado Horas, Atestado Noturno, Faltas, Abono Gestor</div>
      </div>
    </div>

    <div id="premio-content" style="margin-top:14px"></div>`;
}

function parseHora(val){
  if(!val) return 0;
  const s=String(val).trim();
  if(!s) return 0;
  // formato "1:23h" ou "1:23" ou numero
  const m=s.match(/(\d+):(\d+)/);
  if(m) return parseInt(m[1])*60+parseInt(m[2]);
  return parseFloat(s)||0;
}

function processarPremio(event){
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
    const iSit=hs.findIndex(h=>h.includes('situa'));
    const iAtr=hs.findIndex(h=>h.includes('atraso'));
    const iSaida=hs.findIndex(h=>h.includes('saida')||h.includes('saída'));
    const iAtest=hs.findIndex(h=>h.includes('atestado')&&!h.includes('hora')&&!h.includes('notur'));
    const iAHor=hs.findIndex(h=>h.includes('atestado hora'));
    const iANot=hs.findIndex(h=>h.includes('atestado notur'));
    const iFalt=hs.findIndex(h=>h.includes('falta'));
    const iAbono=hs.findIndex(h=>h.includes('abono'));

    const resultado=[];
    for(let i=hi+1;i<data.length;i++){
      const r=data[i]; if(!r||!r[iNome]) continue;
      const mat=String(r[iMat]||'').trim();
      const nome=String(r[iNome]||'').trim().toUpperCase();
      const cpf=String(r[iCPF]||'').trim().replace(/[^0-9]/g,'');
      const sit=String(r[iSit]||'').trim();

      // Excluidos automaticamente
      if(['afastado','inativo','n/a'].some(x=>sit.toLowerCase().includes(x))){
        resultado.push({mat,nome,cpf,sit,status:'NA',motivo:'Situacao: '+sit,
          atraso:0,saida:0,atestado:0,aHoras:0,aNoturno:0,faltas:0,abono:0});
        continue;
      }

      const atraso=parseHora(r[iAtr]);
      const saida=parseHora(r[iSaida]);
      const atestado=parseHora(r[iAtest]);
      const aHoras=parseHora(r[iAHor]);
      const aNoturno=parseHora(r[iANot]);
      const faltas=parseHora(r[iFalt]);
      const abono=parseHora(r[iAbono]);

      let status, motivo='';

      // Nao tem direito automaticamente
      if(atestado>0||aHoras>0||aNoturno>0||abono>0){
        status='NAO';
        const motivos=[];
        if(atestado>0) motivos.push('Atestado');
        if(aHoras>0) motivos.push('Atestado Horas');
        if(aNoturno>0) motivos.push('Atestado Noturno');
        if(abono>0) motivos.push('Abono Gestor');
        motivo=motivos.join(', ');
      }
      // Atraso/saida <= 10 min = tem direito
      else if((atraso===0||atraso<=10)&&(saida===0||saida<=10)){
        status='SIM';
        if(atraso>0) motivo='Atraso ate 10min (OK)';
        if(saida>0) motivo=(motivo?motivo+', ':'')+'Saida antecip. ate 10min (OK)';
      }
      // Atraso/saida > 10 min = analisar
      else if(atraso>10||saida>10){
        status='ANALISAR';
        const motivos=[];
        if(atraso>10) motivos.push('Atraso '+Math.floor(atraso/60)+'h'+String(atraso%60).padStart(2,'0')+'min');
        if(saida>10) motivos.push('Saida antecip. '+Math.floor(saida/60)+'h'+String(saida%60).padStart(2,'0')+'min');
        motivo=motivos.join(', ');
      }
      else { status='SIM'; }

      resultado.push({mat,nome,cpf,sit,status,motivo,atraso,saida,atestado,aHoras,aNoturno,faltas,abono});
    }

    premioData=resultado;
    renderPremioTabela(resultado);
    event.target.value='';
  };
  reader.readAsBinaryString(file);
}

function renderPremioTabela(dados){
  const sim=dados.filter(d=>d.status==='SIM').length;
  const nao=dados.filter(d=>d.status==='NAO').length;
  const analisar=dados.filter(d=>d.status==='ANALISAR').length;
  const total=sim*226;

  const setStat=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val;};
  setStat('ps-elegivel',sim);
  setStat('ps-nao',nao);
  setStat('ps-analisar',analisar);
  setStat('ps-total-val',brl(total));

  const content=document.getElementById('premio-content'); if(!content) return;
  content.innerHTML=`
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center">
      <input type="text" id="premio-q" placeholder="Buscar nome ou matricula..." oninput="filtrarPremio()"
        style="flex:1;min-width:180px;padding:8px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px">
      <select id="premio-filtro" onchange="filtrarPremio()"
        style="padding:8px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px">
        <option value="">Todos</option>
        <option value="SIM">Tem direito</option>
        <option value="NAO">Nao tem direito</option>
        <option value="ANALISAR">Analisar</option>
      </select>
      <button class="btn btn-success btn-sm" onclick="exportarPremioCaju()">Exportar Caju CSV</button>
      <button class="btn btn-ghost btn-sm" onclick="exportarPremioExcel()">Excel</button>
    </div>
    <div class="tbl-wrap">
      <table class="tbl" id="premio-tbl">
        <thead><tr>
          <th>Matricula</th><th>Nome</th><th>CPF</th><th>Situacao</th>
          <th>Atraso</th><th>Saida Antec.</th><th>Atestado</th><th>Ates.Horas</th>
          <th>Ates.Noturn</th><th>Faltas</th><th>Abono Gest.</th>
          <th>Resultado</th><th>Motivo</th><th>Valor</th>
        </tr></thead>
        <tbody id="premio-tbody">
          ${renderPremioRows(dados)}
        </tbody>
      </table>
    </div>`;
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

function filtrarPremio(){
  if(!premioData) return;
  const q=(document.getElementById('premio-q')?.value||'').toLowerCase();
  const f=document.getElementById('premio-filtro')?.value||'';
  let dados=premioData;
  if(q) dados=dados.filter(d=>d.nome.toLowerCase().includes(q)||d.mat.includes(q));
  if(f) dados=dados.filter(d=>d.status===f);
  const tbody=document.getElementById('premio-tbody');
  if(tbody) tbody.innerHTML=renderPremioRows(dados);
}

function exportarPremioCaju(){
  if(!premioData){toast('Nenhum dado carregado','error');return;}
  const NL2=String.fromCharCode(10);
  const header='CPF;Matricula (opcional);Valor Fixo em Auxilio Alimentacao;Mobilidade;Valor Fixo em Mobilidade;Cultura;Valor Fixo em Cultura;Saude;Valor Fixo em Saude;Educacao;Valor Fixo em Educacao;Home Office;Valor Fixo em Home Office';
  const linhas=[header];
  premioData.filter(d=>d.status==='SIM').forEach(d=>{
    const cpf=(d.cpf||'').replace(/[^0-9]/g,'').padStart(11,'0');
    linhas.push([cpf,d.mat||'','226.00','0','0','0','0','0','0','0','0','0','0'].join(';'));
  });
  const blob=new Blob([linhas.join(NL2)],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download='Premio_Assiduidade_Caju.csv';
  a.click(); URL.revokeObjectURL(url);
  toast('CSV Caju exportado!','success');
}

function exportarPremioExcel(){
  if(!premioData){toast('Nenhum dado','error');return;}
  const rows=[['Matricula','Nome','CPF','Situacao','Atraso','Saida Antec.','Atestado','Ates.Horas','Ates.Noturno','Faltas','Abono Gestor','Resultado','Motivo','Valor'],
    ...premioData.map(d=>[d.mat,d.nome,d.cpf,d.sit,fmtMin(d.atraso),fmtMin(d.saida),fmtMin(d.atestado),fmtMin(d.aHoras),fmtMin(d.aNoturno),fmtMin(d.faltas),fmtMin(d.abono),d.status,d.motivo,d.status==='SIM'?226:0])];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Premio Assiduidade');
  XLSX.writeFile(wb,'Premio_Assiduidade.xlsx');
  toast('Excel exportado!','success');
}

// ════════════════════════════════════════════════════════════════
// FOLHA DE PAGAMENTO — 4 TABELAS COM GRUPOS
// ════════════════════════════════════════════════════════════════
const EVENTOS_FOLHA = {"proventos":{"REMUNERA\u00c7\u00c3O FIXA":{"1":"Sal\u00e1rio Normal","1600":"Pr\u00f3-Labore","1952":"Periculosidade","1962":"Diferen\u00e7a de Sal\u00e1rio"},"JORNADAS / HORAS ADICIONAIS":{"301":"Horas Extras 60%","257":"Horas Extras 50%","259":"Horas Extras 100%","391":"Hora Extra Noturno 60%","261":"Hora Extra Noturno 50%","265":"DSR Reflexo H.Extras","1950":"Adicional Noturno","1968":"DSR Adicional Noturno","264":"Horas Extras c/100% Noturno","317":"Diferen\u00e7a Hora Extra","601":"M\u00e9dia H.Extras Abono Pec.","273":"Diferen\u00e7a Horas Extras 60"},"AFASTAMENTOS":{"14":"Atestado at\u00e9 15 dias","13":"Horas Licen\u00e7a Paternidade","9":"Horas Acidente Trabalho"},"F\u00c9RIAS":{"5":"Horas F\u00e9rias Diurnas","104":"Horas F\u00e9rias Noturnas","551":"M\u00e9dia Horas Extras F\u00e9rias","553":"Adic.Noturno F\u00e9rias","555":"Periculosidade F\u00e9rias","558":"1/3 F\u00e9rias","600":"Abono Pecuni\u00e1rio F\u00e9rias","606":"Adic.Noturno Abono Pec. F\u00e9rias","609":"1/3 Abono Pecuni\u00e1rio F\u00e9r"},"13\u00ba SAL\u00c1RIO":{"750":"13o Sal\u00e1rio Adiantado","312":"13o Sal S/variav F\u00e9rias"},"REEMBOLSOS / AJUSTES":{"1701":"Estouro do M\u00eas","307":"Reembolso Desc Indevido","389":"Reembolso de DSR","1753":"Devolu\u00e7\u00e3o de INSS","390":"Reembolso de falta(s)","380":"Bolsa Aux\u00edlio (Faculdade)","2151":"Estouro M\u00eas Anterior"},"RESCIS\u00d3RIOS":{"650":"F\u00e9rias Vencidas Rescis\u00e3o","652":"M\u00e9dia H.Extra F\u00e9rias Resc.","659":"1/3 F\u00e9rias Rescis\u00e3o","851":"M\u00e9dia H.Extras 13\u00ba Prop.","900":"13\u00ba Indenizado Rescis\u00e3o","906":"Adic. Noturno 13\u00ba Inden.","951":"M\u00e9dia Horas Extras A.P.I.","1400":"F\u00e9rias Indenizad. Rescis\u00e3o","1406":"Adic. Not. F\u00e9rias Ind. Resc.","1550":"Saldo de Sal\u00e1rio","651":"F\u00e9rias Proporc. Rescis\u00e3o","656":"Adic. Noturno F\u00e9rias Resc.","850":"13\u00ba Sal\u00e1rio Proporc. Resc.","856":"Adic. Noturno 13\u00ba Prop.","901":"M\u00e9dia H.Extras 13\u00ba Inden.","950":"Aviso Pr\u00e9vio Indenizado","956":"Adic. Noturno A.P.I.","1401":"M\u00e9dia H.Ext. F\u00e9r. Ind. Resc.","1408":"1/3 F\u00e9rias Ind. Rescis\u00e3o"}},"encargos":{"ENCARGOS EMPRESA":{"2500":"FGTS","2505":"FGTS 13o Sal\u00e1rio","1555":"FGTS Rescis\u00e3o Depositado","1556":"FGTS 40% Depositado","1557":"FGTS 13o Sal. Dep\u00f3sito","INSS_PAT":"INSS Patronal"}},"adiantamento":{"ADIANTAMENTO SALARIAL":{"2464":"Desc.Adto Salarial"}},"descontos":{"ENCARGOS OBRIGAT\u00d3RIOS":{"2000":"INSS","2001":"INSS Diretor Carn\u00ea","2003":"INSS 13o Sal\u00e1rio","2004":"IRRF","2006":"IRRF Adto Salarial"},"DESCONTOS JORNADA":{"3":"Faltas Integral","4":"Faltas DSR","2457":"Falta Parcial"},"DESCONTOS BENEF\u00cdCIOS":{"343":"Plano De Saude-depend","2453":"Vale Transporte","324":"Coparticip Pl Saude Amil","2462":"Vale Parcelado","347":"Vale"},"DESCONTOS EMPR\u00c9STIMOS":{"680":"Empr Cred do Trabal - 1","681":"Empr Cred do Trabal - 2","682":"Empr Cred do Trabal - 3","692":"Dif Empr Cred Trabal - 3","683":"Empr Cred do Trabal - 4","693":"Dif Empr Cred Trabal - 4","684":"Empr Cred do Trabal - 5","694":"Dif Empr Cred Trabal - 5","685":"Empr Cred do Trabal - 6","695":"Dif Empr Cred Trabal - 6","686":"Empr Cred do Trabal - 7","696":"Dif Empr Cred Trabal - 7","687":"Empr Cred do Trabal - 8","688":"Dif Empr Cred Trabal - 9","698":"Dif Empr Cred Trabal - 9","690":"Dif Empr Cred Trabal - 1","691":"Dif Empr Cred Trabal - 2"},"DESCONTOS F\u00c9RIAS":{"2014":"IRRF F\u00e9rias","2002":"INSS F\u00e9rias","2251":"Pens\u00e3o Judicial F\u00e9rias","2101":"Desconto Adto F\u00e9rias"},"RESCIS\u00d3RIOS":{"1000":"Aviso Pr\u00e9vio Reavido","2454":"L\u00edquido Rescis\u00e3o"},"SINDICAIS / ASSISTENCIAIS":{"341":"Gremio Recreativo","2050":"Mensalidade Sindicato","2055":"Taxa Assistencial"},"PENS\u00c3O":{"2250":"Pens\u00e3o Judicial"}}};

// Flat map para lookup rapido
const EVENTOS_FLAT = {};
Object.values(EVENTOS_FOLHA).forEach(tab=>Object.values(tab).forEach(g=>Object.assign(EVENTOS_FLAT,g)));

// Eventos nao mapeados (adicionados pelo usuario via sessao)
let eventosCustom = {};

// ════════════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════════════
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


function pgFolhaImport(){
  return `
    <div class="page-header"><h2> Importar Relatorio Senior</h2>
    <p>O relatorio sera classificado em 4 tabelas: Proventos, Encargos, Adiantamento e Descontos.</p></div>
    <div class="card">
      <div class="alert alert-info" style="margin-bottom:14px">
        Formato esperado: <strong>Cadastro | Nome | Evento | Descricao | Valor</strong>
      </div>
      <div class="upload-zone" onclick="document.getElementById('folha-file').click()">
        <input type="file" id="folha-file" accept=".xlsx,.xls" onchange="processarFolha(event)">
        <div class="upload-icon"></div>
        <div class="upload-text">Selecionar relatorio de eventos</div>
        <div class="upload-sub">.xlsx ou .xls</div>
      </div>
      <div id="folha-import-preview" style="margin-top:14px"></div>
    </div>`;
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

    const prev=document.getElementById('folha-import-preview');
    if(prev){
      let html='<div class="alert alert-success">'+folhaData.length+' colaboradores processados. ';
      if(eventosNaoMapeados.size>0){
        html+='<strong>'+eventosNaoMapeados.size+' eventos nao mapeados.</strong>';
      }
      html+='<button class="btn btn-primary btn-sm" onclick="showPage(\'folha-view\')" style="margin-left:10px">Ver Folha</button></div>';
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
      }
      prev.innerHTML=html;
    }
    toast('Folha processada: '+folhaData.length+' colaboradores','success');
    event.target.value='';
  };
  reader.readAsBinaryString(file);
}

function popularGrupos(ev, tab){
  const sel=document.getElementById('ev-grupo-'+ev); if(!sel) return;
  const grupos=tab&&EVENTOS_FOLHA[tab]?Object.keys(EVENTOS_FOLHA[tab]):[];
  sel.innerHTML='<option value="">-- Grupo --</option>'+grupos.map(g=>'<option value="'+g+'">'+g+'</option>').join('');
}

function mapearEvento(ev){
  const tab=document.getElementById('ev-tab-'+ev)?.value;
  const grupo=document.getElementById('ev-grupo-'+ev)?.value;
  const nome=document.getElementById('ev-nome-'+ev)?.value.trim();
  if(!tab||!grupo||!nome){toast('Preencha todos os campos','error');return;}
  if(!EVENTOS_FOLHA[tab][grupo]) EVENTOS_FOLHA[tab][grupo]={};
  EVENTOS_FOLHA[tab][grupo][ev]=nome;
  EVENTOS_FLAT[ev]=nome;
  eventosCustom[ev]=nome;
  toast('Evento '+ev+' ('+nome+') adicionado em '+tab+' > '+grupo,'success');
}

function pgFolhaView(){
  return `
    <div class="page-header"><h2> Folha de Pagamento</h2>
    <p id="folha-sub">Importe um relatorio para visualizar.</p></div>
    <div id="folha-content">
      <div class="alert alert-warning">Nenhuma folha importada. Va em "Importar Relatorio" primeiro.</div>
    </div>`;
}

function renderFolhaView(){
  if(!folhaData||folhaData.length===0) return;

  const sub=document.getElementById('folha-sub');
  if(sub) sub.textContent=folhaData.length+' colaboradores importados';

  const cont=document.getElementById('folha-content'); if(!cont) return;

  // Filtros
  const empresas=getEmpresaList();
  const deptos=getDeptoList();

  cont.innerHTML=`
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:flex-end">
      <div style="display:flex;flex-direction:column;gap:3px;flex:1">
        <label style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase">Buscar</label>
        <input type="text" id="folha-q" placeholder="Nome ou matricula..." oninput="filtrarFolha()"
          style="padding:8px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px">
      </div>
      <div style="display:flex;flex-direction:column;gap:3px">
        <label style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase">Empresa</label>
        <select id="folha-emp" onchange="filtrarFolha()" style="padding:8px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:12px">
          <option value="">Todas</option>${empresas.map(e=>'<option value="'+e.cod+'">'+e.cod+'</option>').join('')}
        </select>
      </div>
      <div style="display:flex;flex-direction:column;gap:3px">
        <label style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase">Aba</label>
        <select id="folha-aba" onchange="filtrarFolha()" style="padding:8px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:12px">
          <option value="proventos">Proventos</option>
          <option value="encargos">Encargos</option>
          <option value="adiantamento">Adiantamento</option>
          <option value="descontos">Descontos</option>
        </select>
      </div>
      <button class="btn btn-success btn-sm" onclick="exportarFolhaExcel()">Excel (modelo completo)</button>
    </div>
    <div id="folha-tabela"></div>`;

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

  // Colunas = todos os eventos desta aba que aparecem nos dados
  const todasCols=[];
  Object.entries(grupos).forEach(([grupo,evs])=>{
    Object.keys(evs).forEach(ev=>{
      if(dados.some(d=>d.eventos&&d.eventos[ev])){
        todasCols.push({grupo,ev,nome:evs[ev]});
      }
    });
    // Eventos custom nesta aba
    Object.entries(eventosCustom).forEach(([ev,nome])=>{
      if(EVENTOS_FOLHA[aba]&&Object.values(EVENTOS_FOLHA[aba]).some(g=>g[ev])&&dados.some(d=>d.eventos&&d.eventos[ev])){
        if(!todasCols.find(c=>c.ev===ev)) todasCols.push({grupo:'OUTROS',ev,nome});
      }
    });
  });

  if(todasCols.length===0){
    tbl.innerHTML='<div class="alert alert-info">Nenhum evento desta aba encontrado nos dados importados.</div>';
    return;
  }

  // Agrupar colunas por grupo
  const colPorGrupo={};
  todasCols.forEach(c=>{
    if(!colPorGrupo[c.grupo]) colPorGrupo[c.grupo]=[];
    colPorGrupo[c.grupo].push(c);
  });

  // Calcular totais por coluna
  const totais={};
  todasCols.forEach(c=>{
    totais[c.ev]=dados.reduce((s,d)=>s+fnum(d.eventos?.[c.ev]),0);
  });

  let html='<div style="overflow-x:auto;border-radius:var(--radius);border:1px solid var(--border)">'
    +'<table style="border-collapse:collapse;font-size:11px;width:100%">';

  // Linha de grupos
  html+='<thead><tr style="background:#0f2d52;color:rgba(255,255,255,.5)">'
    +'<th colspan="4" style="padding:6px 10px;text-align:left;background:#0f2d52;position:sticky;left:0;z-index:3">Colaborador</th>';
  Object.entries(colPorGrupo).forEach(([grupo,cols])=>{
    html+='<th colspan="'+cols.length+'" style="padding:6px 10px;text-align:center;border-left:2px solid rgba(255,255,255,.1);font-size:9px;letter-spacing:.5px">'+grupo+'</th>';
  });
  html+='<th style="padding:6px 10px;text-align:right;background:#1B5E20;color:#fff">TOTAL</th></tr>';

  // Linha de nomes de eventos
  html+='<tr style="background:#1D4ED8;color:#fff">'
    +'<th style="padding:8px 10px;text-align:left;position:sticky;left:0;z-index:3;background:#1D4ED8">Mat.</th>'
    +'<th style="padding:8px 10px;text-align:left;min-width:160px;position:sticky;left:60px;z-index:3;background:#1D4ED8">Nome</th>'
    +'<th style="padding:8px 10px">CPF</th>'
    +'<th style="padding:8px 10px">Depto</th>';
  todasCols.forEach(c=>{
    html+='<th style="padding:6px 8px;font-size:9px;white-space:nowrap;max-width:90px;overflow:hidden;text-overflow:ellipsis" title="'+c.nome+'">'+c.nome+'</th>';
  });
  html+='<th style="padding:8px 10px;text-align:right;background:#1B5E20">Total</th></tr></thead><tbody>';

  // Linhas de dados
  dados.forEach((d,i)=>{
    const rowTotal=todasCols.reduce((s,c)=>s+fnum(d.eventos?.[c.ev]),0);
    html+='<tr style="border-bottom:1px solid var(--border);background:'+(i%2===0?'#F8F9FB':'')+'">'
      +'<td style="padding:7px 10px;position:sticky;left:0;background:'+(i%2===0?'#F8F9FB':'#fff')+'"><code style="font-size:10px">'+d.mat+'</code></td>'
      +'<td style="padding:7px 10px;position:sticky;left:60px;background:'+(i%2===0?'#F8F9FB':'#fff')+';min-width:160px;max-width:180px;overflow:hidden;text-overflow:ellipsis;font-weight:500" title="'+d.nome+'">'+d.nome+'</td>'
      +'<td style="padding:7px 10px;font-size:10px">'+( d.cpf||'—')+'</td>'
      +'<td style="padding:7px 10px;font-size:10px;max-width:100px;overflow:hidden;text-overflow:ellipsis">'+( d.depto||'—')+'</td>';
    todasCols.forEach(c=>{
      const val=fnum(d.eventos?.[c.ev]);
      html+='<td style="padding:7px 8px;text-align:right;font-family:monospace;color:'+(val<0?'var(--red)':val===0?'#ccc':'inherit')+'">'+(val!==0?brl(val):'—')+'</td>';
    });
    html+='<td style="padding:7px 10px;text-align:right;font-weight:700;font-family:monospace;color:var(--blue)">'+(rowTotal!==0?brl(rowTotal):'—')+'</td>'
    +'</tr>';
  });

  // Linha de totais
  html+='<tr style="background:#1D4ED8;color:#fff;font-weight:700;font-family:monospace">'
    +'<td colspan="4" style="padding:8px 10px;font-family:sans-serif;font-size:11px;color:rgba(255,255,255,.7)">'+dados.length+' colaboradores</td>';
  todasCols.forEach(c=>{
    html+='<td style="padding:8px;text-align:right;font-size:10px">'+(totais[c.ev]?brl(totais[c.ev]):'—')+'</td>';
  });
  const totalGeral=todasCols.reduce((s,c)=>s+totais[c.ev],0);
  html+='<td style="padding:8px 10px;text-align:right;background:#1B5E20;color:#86EFAC;font-size:13px">'+brl(totalGeral)+'</td></tr>';

  html+='</tbody></table></div>';
  tbl.innerHTML=html;
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

function getFarol(c){
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
  const hoje=new Date(); hoje.setHours(0,0,0,0);
  const empF=document.getElementById('fer-emp')?.value||'';
  const depF=document.getElementById('fer-dep')?.value||'';
  const stF=document.getElementById('fer-status-filter')?.value||'';

  let f=colaboradores.filter(c=>c.status!=='Inativo');
  if(empF) f=f.filter(c=>String(c.mat||'').startsWith(empF));
  if(depF) f=f.filter(c=>(c.depto||'')===depF);

  const comFarol=f.map(c=>({...c,farol:getFarol(c)}));

  if(stF) {
    const filtered=comFarol.filter(c=>c.farol.cor===stF);
    renderFarois(filtered);
  } else {
    renderFarois(comFarol);
  }

  // Stats
  const stats={verde:0,amarelo:0,laranja:0,vermelho:0,sem:0};
  comFarol.forEach(c=>stats[c.farol.cor]=(stats[c.farol.cor]||0)+1);
  const statsEl=document.getElementById('fer-stats');
  if(statsEl) statsEl.innerHTML=`
    <div class="stats-grid" style="margin-bottom:0">
      <div class="stat-card green"><div class="stat-val" style="color:var(--green)">${stats.verde}</div><div class="stat-label">Verde - OK</div></div>
      <div class="stat-card yellow"><div class="stat-val" style="color:var(--yellow)">${stats.amarelo}</div><div class="stat-label">Amarelo 1-9m</div></div>
      <div class="stat-card orange"><div class="stat-val" style="color:var(--orange)">${stats.laranja}</div><div class="stat-label">Laranja 10-12m</div></div>
      <div class="stat-card red"><div class="stat-val" style="color:var(--red)">${stats.vermelho}</div><div class="stat-label">Vermelho +12m</div></div>
      <div class="stat-card"><div class="stat-val" style="color:var(--text2)">${stats.sem}</div><div class="stat-label">Sem dados</div></div>
    </div>`;
}

function renderFarois(dados){
  // Ordenar: vermelho > laranja > amarelo > verde > sem
  const order={vermelho:0,laranja:1,amarelo:2,verde:3,sem:4};
  const sorted=[...dados].sort((a,b)=>(order[a.farol.cor]||4)-(order[b.farol.cor]||4));

  const corMap={verde:'var(--green)',amarelo:'var(--yellow)',laranja:'var(--orange)',vermelho:'var(--red)',sem:'var(--border)'};

  const grid=document.getElementById('fer-radar-grid');
  if(grid) grid.innerHTML='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px">'+
    sorted.map(c=>{
      const f=c.farol;
      const cor=corMap[f.cor];
      return '<div style="background:var(--surface);border:1.5px solid var(--border);border-radius:var(--radius);padding:14px;text-align:center;cursor:default" title="'+c.nome+' — Venc: '+f.vencStr+'">'
        +'<div style="width:36px;height:36px;border-radius:50%;background:'+cor+';margin:0 auto 8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff">'+f.label+'</div>'
        +'<div style="font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+c.nome.split(' ')[0]+' '+c.nome.split(' ').slice(-1)[0]+'</div>'
        +'<div style="font-size:10px;color:var(--text2)">Venc: '+f.vencStr+'</div>'
        +'<div style="font-size:11px;font-weight:600;margin-top:4px;color:'+cor+'">'+f.dias+' dias</div>'
        +'</div>';
    }).join('')+'</div>';

  // Tabela
  const tbl=document.getElementById('fer-tabela');
  if(tbl) tbl.innerHTML='<div style="margin-bottom:8px;font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase">Tabela Detalhada</div>'
    +'<div style="overflow-x:auto;border-radius:var(--radius);border:1px solid var(--border)">'
    +'<table style="width:100%;border-collapse:collapse;font-size:12px">'
    +'<thead><tr style="background:var(--blue-dark);color:#fff">'
    +'<th style="padding:9px 10px;text-align:left">Status</th>'
    +'<th style="padding:9px 10px;text-align:left">Matricula</th>'
    +'<th style="padding:9px 10px;text-align:left">Nome</th>'
    +'<th style="padding:9px 10px;text-align:left">Departamento</th>'
    +'<th style="padding:9px 10px;text-align:left">Admissao</th>'
    +'<th style="padding:9px 10px;text-align:left">Em Ferias</th>'
    +'<th style="padding:9px 10px;text-align:left">Inicio</th>'
    +'<th style="padding:9px 10px;text-align:left">Fim</th>'
    +'<th style="padding:9px 10px;text-align:left">Vencimento</th>'
    +'<th style="padding:9px 10px;text-align:right">Dias Disp.</th>'
    +'</tr></thead><tbody>'
    +sorted.map((c,i)=>{
      const f=c.farol;
      const cor=corMap[f.cor];
      const emFer=(c.status==='Ferias'||c.status==='Ferias')?'<span class="badge badge-blue">Sim</span>':'—';
      return '<tr style="border-bottom:1px solid var(--border);background:'+(i%2===0?'#F8F9FB':'')+'">'
        +'<td style="padding:8px 10px"><div style="width:20px;height:20px;border-radius:50%;background:'+cor+';display:inline-block;vertical-align:middle;margin-right:6px"></div></td>'
        +'<td style="padding:8px 10px"><code style="font-size:10px">'+(c.mat||'—')+'</code></td>'
        +'<td style="padding:8px 10px;font-weight:500">'+c.nome+'</td>'
        +'<td style="padding:8px 10px;font-size:11px;color:var(--text2)">'+( c.depto||'—')+'</td>'
        +'<td style="padding:8px 10px;font-size:11px">'+( c.admissao||'—')+'</td>'
        +'<td style="padding:8px 10px">'+emFer+'</td>'
        +'<td style="padding:8px 10px;font-size:11px">'+( c.ferInicio||'—')+'</td>'
        +'<td style="padding:8px 10px;font-size:11px">'+( c.ferFim||'—')+'</td>'
        +'<td style="padding:8px 10px;font-size:11px;font-weight:600;color:'+cor+'">'+f.vencStr+'</td>'
        +'<td style="padding:8px 10px;text-align:right;font-weight:600">'+f.dias+'</td>'
        +'</tr>';
    }).join('')+'</tbody></table></div>';
}

// ════════════════════════════════════════════════════════════════
// MODULOS — ADICIONAR PREMIO ASSIDUIDADE
// ════════════════════════════════════════════════════════════════
// Override do MODULES para incluir premio
const MODULES_OVERRIDE = {
  base:{pages:[
    {id:'base-lista',icon:'',label:'Colaboradores'},
    {id:'base-import',icon:'',label:'Importar / Sync'},
    {id:'base-novo',icon:'',label:'Novo Colaborador'},
  ]},
  beneficios:{pages:[
    {id:'ben-lancamento',icon:'',label:'Lancamento Mensal'},
    {id:'ben-importar',icon:'',label:'Importar Faltas'},
    {id:'ben-exportar-caju',icon:'',label:'Exportar Caju e VT'},
    {id:'ben-exportar-senior',icon:'',label:'Exportar Senior'},
    {id:'ben-historico',icon:'',label:'Historico'},
    {id:'ben-config',icon:'',label:'Configuracoes'},
  ]},
  folha:{pages:[
    {id:'folha-import',icon:'',label:'Importar Relatorio'},
    {id:'folha-view',icon:'',label:'Visualizar Folha'},
  ]},
  ferias:{pages:[
    {id:'fer-radar',icon:'',label:'Radar de Ferias'},
    {id:'fer-import',icon:'',label:'Importar Dados'},
  ]},
  premio:{pages:[
    {id:'premio-main',icon:'',label:'Premio Assiduidade'},
  ]},
  dashboard:{pages:[
    {id:'dash-main',icon:'',label:'Dashboard Geral'},
  ]}
};

// Substituir MODULES
Object.assign(MODULES, MODULES_OVERRIDE);

// Novas paginas registradas diretamente (sem override recursivo)


// ════════════════════════════════════════════════════════════════
// FIXES ADICIONAIS
// ════════════════════════════════════════════════════════════════

// ── FIX: Folha com competência + fechar competência ──────────────
let folhaCompetencia = '';

function pgFolhaImport(){
  return `
    <div class="page-header"><h2>Importar Relatorio Senior</h2>
    <p>Classifica os eventos em 4 tabelas: Proventos, Encargos, Adiantamento e Descontos.</p></div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Competencia</div>
      <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">
        <div class="fg"><label>Mes/Ano</label>
          <input type="text" id="folha-comp" placeholder="MM/AAAA" style="width:120px"
            oninput="folhaCompetencia=this.value">
        </div>
        <p class="text-sm text-muted">Defina a competencia antes de importar. Use o botao Fechar Competencia apos verificar os dados.</p>
      </div>
    </div>
    <div class="card">
      <div class="alert alert-info" style="margin-bottom:14px">
        Formato esperado: <strong>Cadastro | Nome | Evento | Descricao | Valor</strong>
      </div>
      <div class="upload-zone" onclick="document.getElementById('folha-file').click()">
        <input type="file" id="folha-file" accept=".xlsx,.xls" onchange="processarFolha(event)">
        <div class="upload-icon"></div>
        <div class="upload-text">Selecionar relatorio de eventos</div>
        <div class="upload-sub">.xlsx ou .xls</div>
      </div>
      <div id="folha-import-preview" style="margin-top:14px"></div>
    </div>`;
}

// ── FIX: Premio com competência ──────────────────────────────────
let premioCompetencia = '';

function pgPremioAssiduidade(){
  return `
    <div class="page-header">
      <h2>Premio de Assiduidade</h2>
      <p>Importar relatorio da Senior. Valor fixo: R$ 226,00</p>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Competencia</div>
      <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">
        <div class="fg"><label>Mes/Ano</label>
          <input type="text" id="premio-comp" placeholder="MM/AAAA" style="width:120px"
            oninput="premioCompetencia=this.value">
        </div>
        <button class="btn btn-success btn-sm" onclick="fecharCompetenциаPremio()">Fechar Competencia</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:16px">
      <div class="stat-card green"><div class="stat-val" id="ps-elegivel">-</div><div class="stat-label">Tem direito</div></div>
      <div class="stat-card red"><div class="stat-val" id="ps-nao">-</div><div class="stat-label">Nao tem direito</div></div>
      <div class="stat-card yellow"><div class="stat-val" id="ps-analisar">-</div><div class="stat-label">Analisar</div></div>
      <div class="stat-card blue"><div class="stat-val" id="ps-total-val">-</div><div class="stat-label">Total a pagar</div></div>
    </div>

    <div class="card">
      <div class="upload-zone" onclick="document.getElementById('premio-file').click()">
        <input type="file" id="premio-file" accept=".xlsx,.xls" onchange="processarPremio(event)">
        <div class="upload-icon"></div>
        <div class="upload-text">Clique para selecionar o relatorio de assiduidade</div>
        <div class="upload-sub">Colunas: Cadastro, Nome, CPF, Situacao, Atraso, Saida Antecipada, Atestado, Atestado Horas, Atestado Noturno, Faltas, Abono Gestor</div>
      </div>
    </div>
    <div id="premio-content" style="margin-top:14px"></div>`;
}

async function fecharCompetenциаPremio(){
  if(!premioData||premioData.length===0){toast('Importe um relatorio primeiro','error');return;}
  const comp=document.getElementById('premio-comp')?.value||premioCompetencia;
  if(!comp){toast('Informe a competencia (MM/AAAA)','error');return;}
  if(!confirm('Fechar competencia '+comp+' do Premio de Assiduidade?')) return;
  const sim=premioData.filter(d=>d.status==='SIM');
  const snap={
    competencia:comp, modulo:'premio',
    fechadoEm:new Date().toISOString(),
    totalElegiveis:sim.length,
    totalNaoElegiveis:premioData.filter(d=>d.status==='NAO').length,
    totalAnalisar:premioData.filter(d=>d.status==='ANALISAR').length,
    valorTotal:sim.length*226,
    detalhes:premioData
  };
  try{
    await fsSet('historico','premio_'+comp.replace('/','_'),snap);
    toast('Competencia '+comp+' fechada!','success');
  }catch(e){toast('Erro: '+e.message,'error');}
}

// ── FIX: Fechar competência da folha ────────────────────────────
async function fecharCompetenciaFolha(){
  if(!folhaData||folhaData.length===0){toast('Importe um relatorio primeiro','error');return;}
  const comp=document.getElementById('folha-comp')?.value||folhaCompetencia;
  if(!comp){toast('Informe a competencia','error');return;}
  if(!confirm('Fechar competencia '+comp+' da Folha?')) return;

  // Calcular totais por aba
  const totais={proventos:0,encargos:0,adiantamento:0,descontos:0};
  folhaData.forEach(d=>{
    Object.entries(EVENTOS_FOLHA).forEach(([aba,grupos])=>{
      Object.values(grupos).forEach(evs=>{
        Object.keys(evs).forEach(ev=>{
          totais[aba]=(totais[aba]||0)+fnum(d.eventos?.[ev]);
        });
      });
    });
  });

  const snap={
    competencia:comp, modulo:'folha',
    fechadoEm:new Date().toISOString(),
    totalColaboradores:folhaData.length,
    totais,
    detalhes:folhaData.map(d=>({mat:d.mat,nome:d.nome,cpf:d.cpf,depto:d.depto,eventos:d.eventos}))
  };
  try{
    await fsSet('historico','folha_'+comp.replace('/','_'),snap);
    toast('Competencia '+comp+' da Folha fechada!','success');
  }catch(e){toast('Erro: '+e.message,'error');}
}

// ── FIX: pgFolhaView com botão fechar competência ───────────────
function pgFolhaView(){
  return `
    <div class="page-header">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px">
        <div>
          <h2>Folha de Pagamento</h2>
          <p id="folha-sub">Importe um relatorio para visualizar.</p>
        </div>
        <button class="btn btn-success btn-sm" onclick="fecharCompetenciaFolha()">Fechar Competencia</button>
      </div>
    </div>
    <div id="folha-content">
      <div class="alert alert-warning">Nenhuma folha importada. Va em "Importar Relatorio" primeiro.</div>
    </div>`;
}

// ── FIX: Controle de férias — Kanban ────────────────────────────
function pgFerRadar(){
  const empresas=getEmpresaList();
  const deptos=getDeptoList();
  return `
    <div class="page-header"><h2>Radar de Ferias</h2><p>Visualizacao kanban por status de vencimento.</p></div>
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:flex-end">
      <div class="filter-group" style="flex:1">
        <label>Buscar</label>
        <input type="text" id="fer-q" placeholder="Nome ou matricula..." oninput="renderFerRadar()"
          style="padding:7px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px;width:100%">
      </div>
      <div class="filter-group">
        <label>Empresa</label>
        <select id="fer-emp" onchange="renderFerRadar()"
          style="padding:7px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px">
          <option value="">Todas</option>
          ${empresas.map(e=>'<option value="'+e.cod+'">'+e.cod+'</option>').join('')}
        </select>
      </div>
      <div class="filter-group">
        <label>Departamento</label>
        <select id="fer-dep" onchange="renderFerRadar()"
          style="padding:7px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px">
          <option value="">Todos</option>
          ${deptos.map(d=>'<option value="'+d+'">'+d+'</option>').join('')}
        </select>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="exportarFeriasExcel()">Excel</button>
    </div>
    <div id="fer-stats" style="margin-bottom:14px"></div>
    <div id="fer-kanban"></div>`;
}

function renderFerRadar(){
  const empF=document.getElementById('fer-emp')?.value||'';
  const depF=document.getElementById('fer-dep')?.value||'';
  const q=(document.getElementById('fer-q')?.value||'').toLowerCase();

  let f=colaboradores.filter(c=>c.status!=='Inativo');
  if(empF) f=f.filter(c=>String(c.mat||'').startsWith(empF));
  if(depF) f=f.filter(c=>(c.depto||'')===depF);
  if(q) f=f.filter(c=>c.nome.toLowerCase().includes(q)||(c.mat||'').includes(q));

  const comFarol=f.map(c=>({...c,farol:getFarol(c)}));

  // Stats
  const stats={verde:0,amarelo:0,laranja:0,vermelho:0,sem:0};
  comFarol.forEach(c=>{ const cor=c.farol.cor; stats[cor]=(stats[cor]||0)+1; });

  const statsEl=document.getElementById('fer-stats');
  if(statsEl) statsEl.innerHTML=`
    <div class="stats-grid" style="margin-bottom:0">
      <div class="stat-card green"><div class="stat-val" style="color:var(--green)">${stats.verde}</div><div class="stat-label">Verde - OK</div></div>
      <div class="stat-card yellow"><div class="stat-val" style="color:var(--yellow)">${stats.amarelo}</div><div class="stat-label">Amarelo 1-9m</div></div>
      <div class="stat-card orange"><div class="stat-val" style="color:var(--orange)">${stats.laranja}</div><div class="stat-label">Laranja 10-12m</div></div>
      <div class="stat-card red"><div class="stat-val" style="color:var(--red)">${stats.vermelho}</div><div class="stat-label">Vermelho +12m</div></div>
      <div class="stat-card"><div class="stat-val" style="color:var(--text3)">${stats.sem}</div><div class="stat-label">Sem dados</div></div>
    </div>`;

  // Kanban
  const kanbanEl=document.getElementById('fer-kanban'); if(!kanbanEl) return;
  const colunas=[
    {id:'verde',label:'Verde — OK',cor:'var(--green)',bg:'var(--green-light)',border:'#A7F3D0'},
    {id:'amarelo',label:'Amarelo — 1 a 9 meses',cor:'var(--yellow)',bg:'var(--yellow-light)',border:'#FDE68A'},
    {id:'laranja',label:'Laranja — 10 a 12 meses',cor:'var(--orange)',bg:'var(--orange-light)',border:'#FED7AA'},
    {id:'vermelho',label:'Vermelho — mais de 12 meses',cor:'var(--red)',bg:'var(--red-light)',border:'#FECACA'},
    {id:'sem',label:'Sem dados de ferias',cor:'var(--text3)',bg:'var(--bg)',border:'var(--border)'},
  ];

  kanbanEl.innerHTML='<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;align-items:start">'
    +colunas.map(col=>{
      const cards=comFarol.filter(c=>c.farol.cor===col.id);
      return '<div style="background:var(--surface);border:1.5px solid '+col.border+';border-radius:var(--radius);overflow:hidden">'
        +'<div style="background:'+col.bg+';padding:10px 12px;border-bottom:1.5px solid '+col.border+';display:flex;justify-content:space-between;align-items:center">'
        +'<span style="font-size:12px;font-weight:700;color:'+col.cor+'">'+col.label+'</span>'
        +'<span style="background:'+col.cor+';color:#fff;border-radius:20px;padding:2px 8px;font-size:11px;font-weight:700">'+cards.length+'</span>'
        +'</div>'
        +'<div style="padding:8px;max-height:500px;overflow-y:auto;display:flex;flex-direction:column;gap:6px">'
        +(cards.length===0?'<div style="text-align:center;padding:16px;font-size:12px;color:var(--text3)">Nenhum</div>'
          :cards.map(c=>{
            const f=c.farol;
            return '<div style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:8px 10px">'
              +'<div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:3px">'+c.nome+'</div>'
              +'<div style="font-size:10px;color:var(--text2)">Mat: '+(c.mat||'—')+' | '+( c.depto||'—')+'</div>'
              +'<div style="font-size:11px;margin-top:5px;display:flex;justify-content:space-between">'
              +'<span style="color:var(--text2)">Venc: <strong>'+f.vencStr+'</strong></span>'
              +'<span style="color:'+col.cor+';font-weight:700">'+f.dias+' dias</span>'
              +'</div>'
              +(c.admissao?'<div style="font-size:10px;color:var(--text3);margin-top:2px">Adm: '+c.admissao+'</div>':'')
              +'</div>';
          }).join(''))
        +'</div></div>';
    }).join('')
    +'</div>';
}

// ── FIX: Dashboard completo ──────────────────────────────────────
function pgDashMain(){
  return `
    <div class="page-header"><h2>Dashboard Geral</h2><p>Visao consolidada de todos os modulos.</p></div>
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:flex-end">
      <div class="filter-group">
        <label>Empresa</label>
        <select id="dash-emp" onchange="renderDashMain()"
          style="padding:7px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px">
          <option value="">Todas</option>
          ${getEmpresaList().map(e=>'<option value="'+e.cod+'">'+e.cod+'</option>').join('')}
        </select>
      </div>
      <div class="filter-group">
        <label>Departamento</label>
        <select id="dash-dep" onchange="renderDashMain()"
          style="padding:7px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px">
          <option value="">Todos</option>
          ${getDeptoList().map(d=>'<option value="'+d+'">'+d+'</option>').join('')}
        </select>
      </div>
      <div class="filter-group">
        <label>Status</label>
        <select id="dash-status" onchange="renderDashMain()"
          style="padding:7px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px">
          <option value="">Todos</option>
          <option value="Ativo">Ativos</option>
          <option value="Inativo">Inativos</option>
          <option value="Ferias">Em Ferias</option>
        </select>
      </div>
    </div>
    <div id="dash-content"></div>`;
}

function renderDashMain(){
  const du=fnum(document.getElementById('lan-du')?.value)||22;
  const empF=document.getElementById('dash-emp')?.value||'';
  const depF=document.getElementById('dash-dep')?.value||'';
  const stF=document.getElementById('dash-status')?.value||'';

  let f=colaboradores;
  if(empF) f=f.filter(c=>String(c.mat||'').startsWith(empF));
  if(depF) f=f.filter(c=>(c.depto||'')===depF);
  if(stF) f=f.filter(c=>c.status===stF);

  const ativos=f.filter(c=>c.status==='Ativo');
  const inativos=f.filter(c=>c.status==='Inativo');
  const emFerias=f.filter(c=>['Ferias','Férias'].includes(c.status));

  // Calcular totais benefícios
  let tVR=0,tCafe=0,tCesta=0,tComb=0,tVT=0;
  f.filter(c=>c.status!=='Inativo').forEach(c=>{
    const dr=getLanDR(c.mat,du);
    const b=calcBen(c,dr,getLanDU(c.mat,du));
    tVR+=b.vr; tCafe+=b.cafe; tCesta+=b.cesta||0; tComb+=b.comb; tVT+=b.vt;
  });
  const tBen=tVR+tCafe+tCesta+tComb+tVT;

  // Farol de férias
  const ferStats={verde:0,amarelo:0,laranja:0,vermelho:0,sem:0};
  f.forEach(c=>{ferStats[getFarol(c).cor]=(ferStats[getFarol(c).cor]||0)+1;});

  // Por empresa
  const empresas=getEmpresaList().filter(e=>!empF||e.cod===empF);

  const el=document.getElementById('dash-content'); if(!el) return;

  el.innerHTML=`
    <!-- COLABORADORES -->
    <div class="dash-section">
      <div class="dash-section-title">Colaboradores</div>
      <div class="stats-grid">
        <div class="stat-card blue"><div class="stat-val">${f.length}</div><div class="stat-label">Total filtrado</div></div>
        <div class="stat-card green"><div class="stat-val" style="color:var(--green)">${ativos.length}</div><div class="stat-label">Ativos</div><div class="stat-sub">${((ativos.length/Math.max(f.length,1))*100).toFixed(0)}% do total</div></div>
        <div class="stat-card blue"><div class="stat-val" style="color:var(--blue)">${emFerias.length}</div><div class="stat-label">Em Ferias</div></div>
        <div class="stat-card red"><div class="stat-val" style="color:var(--red)">${inativos.length}</div><div class="stat-label">Inativos</div></div>
        <div class="stat-card"><div class="stat-val" style="color:var(--text2)">${f.filter(c=>c.filtro==='MEI').length}</div><div class="stat-label">MEI</div></div>
        <div class="stat-card"><div class="stat-val" style="color:var(--text2)">${f.filter(c=>c.filtro==='SOC').length}</div><div class="stat-label">Socios</div></div>
        <div class="stat-card"><div class="stat-val" style="color:var(--text2)">${f.filter(c=>c.filtro==='PART').length}</div><div class="stat-label">Particulares</div></div>
      </div>
    </div>

    <!-- BENEFÍCIOS -->
    <div class="dash-section">
      <div class="dash-section-title">Beneficios — Competencia atual</div>
      <div class="stats-grid">
        <div class="stat-card" style="border-left:4px solid var(--orange)">
          <div class="stat-val" style="font-size:16px;color:var(--orange)">${brl(tVR)}</div>
          <div class="stat-label">Vale Refeicao</div>
          <div class="stat-sub">${f.filter(c=>fnum(c.vr)>0).length} colaboradores</div>
        </div>
        <div class="stat-card" style="border-left:4px solid var(--yellow)">
          <div class="stat-val" style="font-size:16px;color:var(--yellow)">${brl(tCafe)}</div>
          <div class="stat-label">Cafe da Manha</div>
          <div class="stat-sub">${f.filter(c=>fnum(c.cafe)>0).length} colaboradores</div>
        </div>
        <div class="stat-card" style="border-left:4px solid #7B5E00">
          <div class="stat-val" style="font-size:16px;color:#7B5E00">${brl(tCesta)}</div>
          <div class="stat-label">Cesta Basica</div>
          <div class="stat-sub">R$ 185,00 por colaborador</div>
        </div>
        <div class="stat-card" style="border-left:4px solid var(--orange)">
          <div class="stat-val" style="font-size:16px;color:var(--orange)">${brl(tComb)}</div>
          <div class="stat-label">Combustivel</div>
          <div class="stat-sub">${f.filter(c=>fnum(c.comb)>0).length} colaboradores</div>
        </div>
        <div class="stat-card" style="border-left:4px solid var(--blue)">
          <div class="stat-val" style="font-size:16px;color:var(--blue)">${brl(tVT)}</div>
          <div class="stat-label">Vale Transporte</div>
          <div class="stat-sub">${f.filter(c=>[1,2,3,4].some(n=>fnum(c['vt'+n])>0)).length} colaboradores</div>
        </div>
        <div class="stat-card green" style="grid-column:span 2">
          <div class="stat-val" style="font-size:22px;color:var(--green)">${brl(tBen)}</div>
          <div class="stat-label">Total Geral de Beneficios</div>
        </div>
      </div>
    </div>

    <!-- FERIAS FAROL -->
    <div class="dash-section">
      <div class="dash-section-title">Controle de Ferias</div>
      <div class="stats-grid" style="margin-bottom:12px">
        <div class="stat-card green"><div class="stat-val" style="color:var(--green)">${ferStats.verde}</div><div class="stat-label">Verde - OK</div></div>
        <div class="stat-card yellow"><div class="stat-val" style="color:var(--yellow)">${ferStats.amarelo}</div><div class="stat-label">Amarelo 1-9m</div></div>
        <div class="stat-card orange"><div class="stat-val" style="color:var(--orange)">${ferStats.laranja}</div><div class="stat-label">Laranja 10-12m</div></div>
        <div class="stat-card red"><div class="stat-val" style="color:var(--red)">${ferStats.vermelho}</div><div class="stat-label">Vermelho +12m</div></div>
      </div>
      <!-- Mini kanban -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
        ${[
          {id:'vermelho',label:'Urgente (+12m)',cor:'var(--red)',bg:'var(--red-light)'},
          {id:'laranja',label:'Atencao (10-12m)',cor:'var(--orange)',bg:'var(--orange-light)'},
          {id:'amarelo',label:'Vencido (1-9m)',cor:'var(--yellow)',bg:'var(--yellow-light)'},
          {id:'verde',label:'OK',cor:'var(--green)',bg:'var(--green-light)'},
        ].map(col=>{
          const cards=f.map(c=>({...c,farol:getFarol(c)})).filter(c=>c.farol.cor===col.id).slice(0,8);
          return '<div style="background:'+col.bg+';border-radius:var(--radius);padding:10px">'
            +'<div style="font-size:11px;font-weight:700;color:'+col.cor+';margin-bottom:8px">'+col.label+' ('+ferStats[col.id]+')</div>'
            +cards.map(c=>'<div style="background:rgba(255,255,255,.7);border-radius:4px;padding:5px 8px;margin-bottom:4px;font-size:11px">'
              +'<strong>'+c.nome.split(' ')[0]+'</strong> — '+c.farol.vencStr+'</div>').join('')
            +(ferStats[col.id]>8?'<div style="font-size:10px;color:'+col.cor+';text-align:center;margin-top:4px">+mais '+(ferStats[col.id]-8)+'...</div>':'')
            +'</div>';
        }).join('')}
      </div>
    </div>

    <!-- POR EMPRESA -->
    <div class="dash-section">
      <div class="dash-section-title">Por Empresa</div>
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr>
            <th>Empresa</th><th>Total</th><th>Ativos</th><th>Em Ferias</th><th>Inativos</th>
            <th>VR</th><th>Cafe</th><th>Cesta</th><th>Comb.</th><th>VT</th><th>Total Ben.</th>
          </tr></thead>
          <tbody>
            ${empresas.map(emp=>{
              const ec=f.filter(c=>String(c.mat||'').startsWith(emp.cod));
              const ea=ec.filter(c=>c.status==='Ativo').length;
              const ef=ec.filter(c=>['Ferias','Férias'].includes(c.status)).length;
              const ei=ec.filter(c=>c.status==='Inativo').length;
              let evr=0,ecafe=0,ecesta=0,ecomb=0,evt=0;
              ec.filter(c=>c.status!=='Inativo').forEach(c=>{
                const b=calcBen(c,getLanDR(c.mat,du),getLanDU(c.mat,du));
                evr+=b.vr;ecafe+=b.cafe;ecesta+=b.cesta||0;ecomb+=b.comb;evt+=b.vt;
              });
              return '<tr>'
                +'<td><strong>'+emp.cod+'</strong></td>'
                +'<td>'+ec.length+'</td><td>'+ea+'</td><td>'+ef+'</td><td>'+ei+'</td>'
                +'<td class="mono text-right">'+(evr?brl(evr):'—')+'</td>'
                +'<td class="mono text-right">'+(ecafe?brl(ecafe):'—')+'</td>'
                +'<td class="mono text-right">'+(ecesta?brl(ecesta):'—')+'</td>'
                +'<td class="mono text-right">'+(ecomb?brl(ecomb):'—')+'</td>'
                +'<td class="mono text-right">'+(evt?brl(evt):'—')+'</td>'
                +'<td class="mono text-right" style="font-weight:700;color:var(--green)">'+brl(evr+ecafe+ecesta+ecomb+evt)+'</td>'
                +'</tr>';
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}
