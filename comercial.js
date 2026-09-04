// ============================================================
// COMERCIAL — duas funcionalidades
//   1) Painéis de BI: sobe o HTML pelo navegador e navega no painel
//      sem precisar publicar nada.
//   2) Demandas de tecnologia com a empresa parceira: o que foi pedido,
//      quem pediu, prioridade e prazo de entrega.
//
// Login e controle de acesso são os mesmos do Sistema de RH (coleção
// 'usuarios', campo plataformas.comercial). Só as coleções são novas.
// ============================================================

const COL_PAINEL = 'cm_paineis';        // metadados do painel (leve, para a lista)
const COL_DADOS  = 'cm_painel_dados';  // o HTML em pedaços (pesado, lido só ao abrir)
const COL_DEM    = 'cm_demandas';
// Compartilhamento público: uma CÓPIA do painel sob um token aleatório. É a
// cópia que fica legível sem login — o painel privado continua fechado, e o id
// dele não abre nada. Assim o segredo é o link, e só o link.
const COL_PUB    = 'cm_publico';
const COL_PUBDAD = 'cm_publico_dados';

const MASTER_BOOTSTRAP = ['alexandre.magalhaes@udiaco.com.br'];

// O Firestore aceita ~1 MB por documento. O HTML vai comprimido (gzip) e em
// pedaços de 600 KB de texto, o que deixa folga para o resto do documento.
const CHUNK = 600 * 1024;
const LIMITE_MB = 20;                   // acima disso, a leitura fica lenta demais

let usuario = null;
let aba = 'paineis';
let paineis = [], demandas = [];
let unsubs = [];
let filtroDem = {q:'', prio:'', status:'', solic:''};

const $ = id => document.getElementById(id);
const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const ajuda = t => '<span class="ajuda" title="'+esc(t).replace(/"/g,'&quot;')+'">?</span>';

function toast(msg, tipo){
  const t=$('toast'); if(!t) return;
  t.textContent=msg; t.className='show '+(tipo||'ok');
  clearTimeout(t._t); t._t=setTimeout(()=>t.className='', 4000);
}
function agora(){ return new Date().toISOString(); }
function quem(){ return (usuario && (usuario.email||usuario.nome)) || '(não identificado)'; }
function dataHora(iso){
  const d=iso?new Date(iso):null;
  if(!d || isNaN(d)) return '—';
  return d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
}
function soData(iso){
  const m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[3]+'/'+m[2]+'/'+m[1] : '—';
}
function hoje0(){ const d=new Date(); d.setHours(0,0,0,0); return d; }
function diasAte(iso){
  const m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(!m) return null;
  return Math.round((new Date(+m[1],+m[2]-1,+m[3]) - hoje0())/86400000);
}
function tamanho(bytes){
  const b=Number(bytes)||0;
  if(b<1024) return b+' B';
  if(b<1024*1024) return (b/1024).toFixed(0)+' KB';
  return (b/1048576).toFixed(1)+' MB';
}

// ── Compressão ────────────────────────────────────────────────────────────
// gzip pelo próprio navegador (CompressionStream). HTML comprime muito bem —
// costuma cair para 1/5 do tamanho —, o que é o que torna guardar no Firestore
// viável. Navegador sem suporte grava o texto puro; o painel continua
// funcionando, só ocupa mais.
const TEM_GZIP = typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

async function comprimir(texto){
  if(!TEM_GZIP) return {b64:btoa(unescape(encodeURIComponent(texto))), gzip:false};
  const cs=new CompressionStream('gzip');
  const w=cs.writable.getWriter();
  w.write(new TextEncoder().encode(texto)); w.close();
  const buf=await new Response(cs.readable).arrayBuffer();
  return {b64:bytesParaB64(new Uint8Array(buf)), gzip:true};
}
async function descomprimir(b64, gzip){
  if(!gzip) return decodeURIComponent(escape(atob(b64)));
  const bytes=b64ParaBytes(b64);
  const ds=new DecompressionStream('gzip');
  const w=ds.writable.getWriter();
  w.write(bytes); w.close();
  return await new Response(ds.readable).text();
}
// btoa direto estoura a pilha com arquivo grande: vai em blocos.
function bytesParaB64(bytes){
  let s='';
  for(let i=0;i<bytes.length;i+=0x8000) s+=String.fromCharCode.apply(null, bytes.subarray(i,i+0x8000));
  return btoa(s);
}
function b64ParaBytes(b64){
  const s=atob(b64), a=new Uint8Array(s.length);
  for(let i=0;i<s.length;i++) a[i]=s.charCodeAt(i);
  return a;
}
function picar(txt){
  const out=[];
  for(let i=0;i<txt.length;i+=CHUNK) out.push(txt.slice(i,i+CHUNK));
  return out;
}
// Token do link público: 32 caracteres de aleatoriedade real (crypto), não
// Math.random. É ele que protege o painel, então precisa ser impossível de
// adivinhar ou de chegar por tentativa.
function novoToken(){
  const b=new Uint8Array(16);
  (window.crypto||crypto).getRandomValues(b);
  return Array.from(b).map(x=>x.toString(16).padStart(2,'0')).join('');
}
function linkPublico(token){
  return location.origin+location.pathname.replace(/[^/]*$/,'')+'painel.html?p='+token;
}

// ── Auditoria ─────────────────────────────────────────────────────────────
// Mesma regra do RH: toda inclusão, edição e exclusão fica registrada com data,
// hora, usuário e o que mudou. É o que permite responder "quem mexeu nisso".
const CAMPOS_DEM = {titulo:'demanda', descricao:'descrição', solicitante:'quem pediu',
  area:'área', prioridade:'prioridade', status:'status', entrada:'entrada da demanda',
  prazo:'entrega estimada', obs:'observação'};

function diffDem(antes, depois){
  const mud=[];
  Object.keys(CAMPOS_DEM).forEach(k=>{
    const de=antes?antes[k]:undefined, para=depois[k];
    if((de||'')===(para||'')) return;
    const dt = k==='prazo'||k==='entrada';
    mud.push({campo:k, rotulo:CAMPOS_DEM[k],
      de:dt?(de?soData(de):'—'):(de||'—'), para:dt?(para?soData(para):'—'):(para||'—')});
  });
  return mud;
}
function logDem(hist, acao, mudancas, obs){
  const l=(hist||[]).slice();
  l.push({acao, mudancas:mudancas||[], obs:obs||'', em:agora(), por:quem()});
  return l;
}
function histHTML(hist){
  const l=(hist||[]).slice().reverse();
  if(!l.length) return '<div style="padding:10px;font-size:12px;color:var(--text-secondary)">Sem registros.</div>';
  return '<table class="hist-t"><thead><tr><th>Quando</th><th>Ação</th><th>O que foi feito</th><th>Quem</th></tr></thead><tbody>'
    +l.map(x=>{
      const o = x.obs ? esc(x.obs)
        : (x.mudancas||[]).map(m=>esc(m.rotulo)+': '+esc(m.de)+' → '+esc(m.para)).join(' · ');
      return '<tr><td style="white-space:nowrap">'+dataHora(x.em)+'</td>'
        +'<td>'+esc(x.acao)+'</td><td>'+(o||'—')+'</td>'
        +'<td style="color:var(--text-secondary)">'+esc(x.por||'—')+'</td></tr>';
    }).join('')+'</tbody></table>';
}

// ── Login e acesso ────────────────────────────────────────────────────────
function mostrarLogin(){ $('tela-login').style.display='flex'; $('tela-app').style.display='none'; }
function mostrarApp(){
  $('tela-login').style.display='none'; $('tela-app').style.display='block';
  $('quem').textContent=usuario.nome||usuario.email;
  render();
}
function erroLogin(msg){
  mostrarLogin();
  const el=$('login-erro'); el.textContent=msg; el.style.display='block';
}
// Quem entra: o Master sempre; os demais só se o Master marcou 'Comercial' na
// tela de Acessos do RH (plataformas.comercial).
function temComercial(d){
  if(!d || d.ativo===false || d.papel==='um989') return false;
  if(d.papel==='master') return true;
  return !!(d.plataformas && d.plataformas.comercial===true);
}
async function carregarUsuario(email){
  const mail=(email||'').toLowerCase().trim();
  let d=null;
  try{
    const snap=await window._getDoc(window._doc('usuarios', mail));
    if(snap.exists()) d=snap.data();
  }catch(e){ /* sem permissão de leitura = sem acesso */ }
  if(!d && MASTER_BOOTSTRAP.includes(mail)) d={email:mail,nome:mail,papel:'master',ativo:true};
  if(!d || d.ativo===false || d.papel==='um989') return 'sem-acesso';
  if(!temComercial(d)) return 'sem-plataforma';
  usuario={email:mail, nome:d.nome||mail, papel:d.papel||'corporativo'};
  return 'ok';
}
async function entrar(){
  const email=($('login-email').value||'').trim().toLowerCase();
  const senha=$('login-senha').value||'';
  if(!email||!senha){ erroLogin('Preencha e-mail e senha.'); return; }
  const btn=$('btn-entrar'); btn.disabled=true; btn.textContent='Entrando...';
  try{
    await window._signIn(email, senha);
    $('login-erro').style.display='none';
  }catch(e){
    const m=String(e&&e.code||'');
    erroLogin(m.includes('invalid-credential')||m.includes('wrong-password')||m.includes('user-not-found')
      ? 'E-mail ou senha incorretos.'
      : (m.includes('too-many-requests')?'Muitas tentativas. Tente de novo em alguns minutos.'
                                        :'Não foi possível entrar: '+m));
  }finally{ btn.disabled=false; btn.textContent='Entrar'; }
}
async function resetarSenha(){
  const email=($('login-email').value||'').trim().toLowerCase();
  if(!email){ erroLogin('Digite seu e-mail primeiro.'); return; }
  try{ await window._resetSenha(email); toast('Enviamos um link de redefinição para '+email,'ok'); }
  catch(e){ erroLogin('Não foi possível enviar o e-mail de redefinição.'); }
}

// ── Dados ao vivo ─────────────────────────────────────────────────────────
function assinarDados(){
  unsubs.forEach(u=>{ try{ u(); }catch(e){} });
  unsubs=[];
  unsubs.push(window._onSnapshot(window._col(COL_PAINEL), snap=>{
    paineis=[]; snap.forEach(d=>paineis.push(Object.assign({_id:d.id}, d.data())));
    paineis.sort((a,b)=>String(b.atualizadoEm||'').localeCompare(String(a.atualizadoEm||'')));
    if(aba==='paineis') render();
  }, e=>toast('Erro ao ler painéis: '+e.message,'erro')));
  unsubs.push(window._onSnapshot(window._col(COL_DEM), snap=>{
    demandas=[]; snap.forEach(d=>demandas.push(Object.assign({_id:d.id}, d.data())));
    if(aba==='demandas') render();
  }, e=>toast('Erro ao ler demandas: '+e.message,'erro')));
}

// ── Casca ─────────────────────────────────────────────────────────────────
const ABAS=[
  {id:'paineis',  icone:'chart-pie',      label:'Painéis de BI'},
  {id:'demandas', icone:'clipboard-list', label:'Demandas'},
];
function irAba(id){ aba=id; render(); }
function render(){
  const ab=$('abas');
  if(ab) ab.innerHTML=ABAS.map(a=>'<button class="aba'+(aba===a.id?' aba--on':'')+'" '
    +'onclick="irAba(\''+a.id+'\')"><i class="ti ti-'+a.icone+'"></i> '+a.label+'</button>').join('');
  const v=$('view'); if(!v) return;
  v.innerHTML = aba==='paineis' ? viewPaineis() : viewDemandas();
  if(aba==='demandas') pintarDemandas();
}

// ══════════════════════════════════════════════════════════════════════════
// PAINÉIS DE BI
// ══════════════════════════════════════════════════════════════════════════
function viewPaineis(){
  const cards = paineis.map(p=>
    '<div class="pn-card" onclick="abrirPainel(\''+p._id+'\')">'
    +'<div class="pn-card__ic"><i class="ti ti-chart-histogram"></i></div>'
    +'<div class="pn-card__t">'+esc(p.titulo||'(sem título)')+'</div>'
    +'<div class="pn-card__d">'+esc(p.descricao||'')+'</div>'
    +'<div class="pn-card__f">'
      +'<span>'+tamanho(p.bytes)+' · '+dataHora(p.atualizadoEm)
        +(p.token?' · <span style="color:var(--brand);font-weight:700">público</span>':'')+'</span>'
      +'<span class="pn-acts">'
        +'<button title="'+(p.token?'Link público ativo':'Compartilhar por link')+'" '
          +'onclick="event.stopPropagation();modalCompartilhar(\''+p._id+'\')">'
          +'<i class="ti ti-'+(p.token?'world-share':'share')+'"'
          +(p.token?' style="color:var(--brand)"':'')+'></i></button>'
        +'<button title="Editar título e descrição" onclick="event.stopPropagation();editarPainel(\''+p._id+'\')"><i class="ti ti-pencil"></i></button>'
        +'<button title="Substituir o arquivo" onclick="event.stopPropagation();trocarArquivo(\''+p._id+'\')"><i class="ti ti-upload"></i></button>'
        +'<button title="Excluir painel" onclick="event.stopPropagation();excluirPainel(\''+p._id+'\')"><i class="ti ti-trash"></i></button>'
      +'</span></div></div>').join('');
  return '<div class="pg-head">'
      +'<div><h2 class="pg-tit">Painéis de BI</h2>'
      +'<p class="pg-sub">Painéis de teste, com dados fictícios'
        +ajuda('Suba o HTML do painel e ele fica disponível na hora, sem publicação. O painel abre isolado: '
              +'não enxerga nem altera nada do sistema.')+'</p></div>'
      +'<div class="acoes"><button class="btn btn--primary" onclick="subirPainel()">'
        +'<i class="ti ti-upload"></i> Subir painel</button></div></div>'
    +(paineis.length
      ? '<div class="pn-grid">'+cards+'</div>'
      : '<div class="vazio"><div class="vazio__ic"><i class="ti ti-chart-pie"></i></div>'
        +'<p>Nenhum painel ainda. Clique em <strong>Subir painel</strong> e escolha o arquivo HTML.</p></div>');
}

function subirPainel(){ modalPainel(null); }
function editarPainel(id){ modalPainel(paineis.find(p=>p._id===id), 'meta'); }
function trocarArquivo(id){ modalPainel(paineis.find(p=>p._id===id), 'arquivo'); }

// Modal único: novo painel, editar título/descrição ou trocar o arquivo.
function modalPainel(p, modo){
  const novo=!p;
  const soMeta = modo==='meta';
  const soArq  = modo==='arquivo';
  const tit = novo?'Subir painel':(soArq?'Substituir o arquivo':'Editar painel');
  $('camada').innerHTML='<div class="mod" id="mod-pn">'
    +'<div class="mod__cx"><div class="mod__h"><b>'+tit+'</b>'
      +'<button class="mod__x" onclick="fecharMod()">&times;</button></div>'
    +'<div class="mod__b">'
    +(soArq?'':'<div class="fg" style="margin-bottom:12px"><label>Título</label>'
      +'<input type="text" id="pn-tit" maxlength="80" placeholder="Ex.: Funil de vendas — teste" '
      +'value="'+esc(p?p.titulo:'')+'"></div>'
      +'<div class="fg" style="margin-bottom:12px"><label>Descrição</label>'
      +'<textarea id="pn-desc" rows="2" maxlength="240" '
      +'placeholder="O que o painel mostra, e o que você quer que testem">'+esc(p?p.descricao:'')+'</textarea></div>')
    +(soMeta?'':'<div class="fg"><label>Arquivo HTML'
      +ajuda('Um único arquivo .html. Se o painel usa bibliotecas de fora (CDN), elas continuam '
            +'carregando normalmente. Limite de '+LIMITE_MB+' MB.')+'</label>'
      +'<div class="solta" id="pn-solta">'
        +'<div class="solta__ic"><i class="ti ti-file-code"></i></div>'
        +'<div style="font-weight:600;font-size:13px;margin-top:6px">Clique ou arraste o arquivo aqui</div>'
        +'<div style="font-size:11.5px;color:var(--text-secondary)" id="pn-arq">.html</div>'
      +'</div>'
      +'<input type="file" id="pn-file" accept=".html,.htm" style="display:none"></div>')
    +'<div id="pn-prog" style="margin-top:10px;font-size:12px"></div>'
    +'</div>'
    +'<div class="mod__f"><button class="btn" onclick="fecharMod()">Cancelar</button>'
      +'<button class="btn btn--primary" id="pn-ok" onclick="salvarPainel(\''+(p?p._id:'')+'\',\''+(modo||'')+'\')">'
      +'<i class="ti ti-check"></i> '+(novo?'Subir':'Salvar')+'</button></div>'
    +'</div></div>';
  if(!soMeta){
    const z=$('pn-solta'), f=$('pn-file');
    z.onclick=()=>f.click();
    f.onchange=()=>{ if(f.files[0]) $('pn-arq').textContent=f.files[0].name+' · '+tamanho(f.files[0].size); };
    ['dragenter','dragover'].forEach(ev=>z.addEventListener(ev,e=>{
      e.preventDefault(); z.classList.add('solta--on'); }));
    ['dragleave','drop'].forEach(ev=>z.addEventListener(ev,e=>{
      e.preventDefault(); z.classList.remove('solta--on'); }));
    z.addEventListener('drop',e=>{
      const arq=e.dataTransfer.files[0];
      if(arq){ f.files=e.dataTransfer.files; $('pn-arq').textContent=arq.name+' · '+tamanho(arq.size); }
    });
  }
  setTimeout(()=>{ const t=$('pn-tit'); if(t) t.focus(); },50);
}
function fecharMod(){ $('camada').innerHTML=''; }

async function salvarPainel(id, modo){
  const soMeta = modo==='meta';
  const soArq  = modo==='arquivo';
  const p = id ? paineis.find(x=>x._id===id) : null;
  const titulo = soArq ? (p?p.titulo:'') : ($('pn-tit').value||'').trim();
  const descricao = soArq ? (p?p.descricao:'') : ($('pn-desc').value||'').trim();
  const arq = soMeta ? null : ($('pn-file').files[0]||null);

  if(!soArq && !titulo){ toast('Dê um título ao painel.','aviso'); return; }
  if(!id && !arq){ toast('Escolha o arquivo HTML do painel.','aviso'); return; }
  if(arq && arq.size > LIMITE_MB*1048576){
    toast('O arquivo tem '+tamanho(arq.size)+'. O limite é '+LIMITE_MB+' MB.','erro'); return;
  }
  const btn=$('pn-ok'); btn.disabled=true;
  const prog=m=>{ const e=$('pn-prog'); if(e) e.innerHTML=m; };

  try{
    const docId = id || ('pn_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7));
    let meta={titulo, descricao, atualizadoEm:agora(), atualizadoPor:quem()};

    if(arq){
      prog('<i class="ti ti-loader"></i> Lendo o arquivo...');
      const texto=await arq.text();
      prog('<i class="ti ti-loader"></i> Comprimindo...');
      const {b64,gzip}=await comprimir(texto);
      const pedacos=picar(b64);
      prog('Gravando '+pedacos.length+' pedaço(s)...');
      // Apaga os pedaços antigos antes de gravar os novos, senão sobra lixo
      // quando o arquivo novo é menor que o anterior.
      if(p && p.chunks) await apagarPedacos(docId, p.chunks);
      for(let i=0;i<pedacos.length;i+=1){
        await window._setDoc(window._doc(COL_DADOS, docId+'__'+i), {p:pedacos[i]});
        prog('Gravando pedaço '+(i+1)+' de '+pedacos.length+'...');
      }
      meta.arquivo=arq.name; meta.bytes=arq.size; meta.chunks=pedacos.length; meta.gzip=gzip;
      meta.comprimido=b64.length;
    }
    const antes=p?{titulo:p.titulo,descricao:p.descricao,arquivo:p.arquivo}:null;
    const dep={titulo:meta.titulo, descricao:meta.descricao, arquivo:meta.arquivo||(p?p.arquivo:'')};
    const mud=[];
    if(!p) mud.push({rotulo:'painel', de:'—', para:titulo});
    else {
      if((antes.titulo||'')!==(dep.titulo||'')) mud.push({rotulo:'título',de:antes.titulo||'—',para:dep.titulo});
      if((antes.descricao||'')!==(dep.descricao||'')) mud.push({rotulo:'descrição',de:antes.descricao||'—',para:dep.descricao||'—'});
      if(arq) mud.push({rotulo:'arquivo',de:antes.arquivo||'—',para:arq.name});
    }
    meta.historico=logDem(p?p.historico:[], p?'Edição':'Inclusão', mud);
    if(!p){ meta.criadoEm=agora(); meta.criadoPor=quem(); }
    await window._setDoc(window._doc(COL_PAINEL, docId), Object.assign({}, p||{}, meta));

    // Painel com link público ativo: a cópia pública tem de acompanhar, senão
    // quem abre pelo link continua vendo a versão velha.
    if(p && p.token){
      prog('Atualizando a cópia pública...');
      await atualizarPublico(Object.assign({}, p, meta, {_id:docId}), !!arq);
    }
    fecharMod();
    toast(p?'Painel atualizado.':'Painel publicado.','ok');
  }catch(e){
    prog('');
    toast('Erro ao salvar: '+e.message,'erro');
  }finally{ if($('pn-ok')) $('pn-ok').disabled=false; }
}
async function apagarPedacos(id, n){
  for(let i=0;i<n;i+=1){
    try{ await window._deleteDoc(window._doc(COL_DADOS, id+'__'+i)); }catch(e){}
  }
}
async function excluirPainel(id){
  const p=paineis.find(x=>x._id===id); if(!p) return;
  if(!confirm('Excluir o painel "'+(p.titulo||'')+'"?\n\nO arquivo é apagado e não dá para desfazer.'
    +(p.token?'\nO link público para de funcionar.':''))) return;
  try{
    if(p.token) await apagarPublico(p.token, p.chunks||0);   // não deixa cópia pública órfã
    await apagarPedacos(id, p.chunks||0);
    await window._deleteDoc(window._doc(COL_PAINEL, id));
    toast('Painel excluído.','ok');
  }catch(e){ toast('Erro ao excluir: '+e.message,'erro'); }
}

// ── Compartilhar por link público ─────────────────────────────────────────
function modalCompartilhar(id){
  const p=paineis.find(x=>x._id===id); if(!p) return;
  const on=!!p.token;
  const link=on?linkPublico(p.token):'';
  $('camada').innerHTML='<div class="mod" id="mod-sh">'
    +'<div class="mod__cx" style="max-width:560px"><div class="mod__h"><b>Compartilhar painel</b>'
      +'<button class="mod__x" onclick="fecharMod()">&times;</button></div>'
    +'<div class="mod__b">'
    +'<div style="font-weight:600;font-size:14px;margin-bottom:2px">'+esc(p.titulo||'')+'</div>'
    +'<div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px">'+esc(p.descricao||'')+'</div>'
    +(on
      ? '<div class="fg"><label>Link público'
          +ajuda('Quem tiver este link abre o painel sem login. O endereço é o segredo: '
                +'ele tem 32 caracteres aleatórios e não aparece em buscas.')+'</label>'
        +'<div style="display:flex;gap:8px">'
          +'<input type="text" id="sh-link" readonly value="'+esc(link)+'" '
            +'style="flex:1;font-size:12px" onclick="this.select()">'
          +'<button class="btn btn--primary" onclick="copiarLink()"><i class="ti ti-copy"></i> Copiar</button>'
        +'</div></div>'
        +'<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">'
          +'<a class="btn" href="'+esc(link)+'" target="_blank" rel="noopener">'
            +'<i class="ti ti-external-link"></i> Abrir como visitante</a>'
          +'<button class="btn" onclick="renovarLink(\''+id+'\')">'
            +'<i class="ti ti-refresh"></i> Gerar novo link</button>'
        +'</div>'
        +'<div style="margin-top:14px;padding:10px 12px;background:#fffbeb;border:1px solid #fde68a;'
          +'border-radius:10px;font-size:12px;color:#92400e">'
          +'<i class="ti ti-alert-triangle"></i> Qualquer pessoa com o link vê este painel, '
          +'sem login. Publicado em '+dataHora(p.publicadoEm)+' por '+esc(p.publicadoPor||'—')+'.'
        +'</div>'
      : '<p style="font-size:13px;color:var(--text-secondary);margin:0 0 4px">'
        +'Gera um endereço que qualquer pessoa abre <strong>sem login</strong>, com uma cópia '
        +'deste painel. Use só com dados fictícios.</p>'
        +'<p style="font-size:12px;color:var(--text-muted);margin:0">'
        +'O painel privado continua fechado, e dá para desativar o link quando quiser.</p>')
    +'<div id="sh-prog" style="margin-top:10px;font-size:12px"></div>'
    +'</div>'
    +'<div class="mod__f">'
    +(on?'<button class="btn" style="color:var(--cm-alta)" onclick="despublicar(\''+id+'\')">'
          +'<i class="ti ti-world-off"></i> Desativar link</button>'
        :'<span></span>')
    +'<span style="display:flex;gap:8px"><button class="btn" onclick="fecharMod()">Fechar</button>'
    +(on?'':'<button class="btn btn--primary" id="sh-ok" onclick="publicar(\''+id+'\')">'
          +'<i class="ti ti-world"></i> Gerar link público</button>')
    +'</span></div></div></div>';
}
function copiarLink(){
  const el=$('sh-link'); if(!el) return;
  el.select();
  const txt=el.value;
  const ok=()=>toast('Link copiado.','ok');
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(ok, ()=>{ document.execCommand('copy'); ok(); });
  } else { document.execCommand('copy'); ok(); }
}
// Publica: copia os pedaços do painel sob o token e cria o documento público
// com os metadados. Só a cópia é legível sem login.
async function publicar(id, tokenAntigo){
  const p=paineis.find(x=>x._id===id); if(!p) return;
  const btn=$('sh-ok'); if(btn) btn.disabled=true;
  const prog=m=>{ const e=$('sh-prog'); if(e) e.innerHTML=m; };
  try{
    const token=novoToken();
    prog('<i class="ti ti-loader"></i> Preparando a cópia pública...');
    for(let i=0;i<(p.chunks||0);i+=1){
      const s=await window._getDoc(window._doc(COL_DADOS, id+'__'+i));
      if(!s.exists()) throw new Error('pedaço '+(i+1)+' do arquivo não encontrado');
      await window._setDoc(window._doc(COL_PUBDAD, token+'__'+i), {p:(s.data()||{}).p||''});
      prog('Copiando pedaço '+(i+1)+' de '+p.chunks+'...');
    }
    await window._setDoc(window._doc(COL_PUB, token), {
      painel:id, titulo:p.titulo||'', descricao:p.descricao||'',
      chunks:p.chunks||0, gzip:!!p.gzip, bytes:p.bytes||0,
      publicadoEm:agora(), publicadoPor:quem()
    });
    // Link novo entra no ar antes de o antigo sair, para não ficar um instante
    // sem nada funcionando quando é renovação.
    if(tokenAntigo) await apagarPublico(tokenAntigo, p.chunks||0);
    const mud=[{rotulo:'link público', de:tokenAntigo?'link anterior':'—',
      para:tokenAntigo?'novo link gerado':'ativado'}];
    await window._setDoc(window._doc(COL_PAINEL, id), Object.assign({}, p, {
      token, publicadoEm:agora(), publicadoPor:quem(),
      historico:logDem(p.historico, tokenAntigo?'Edição':'Inclusão', mud,
        tokenAntigo?'link público renovado (o anterior deixou de funcionar)':'link público ativado')
    }));
    toast(tokenAntigo?'Link novo gerado. O anterior parou de funcionar.':'Link público criado.','ok');
    modalCompartilhar(id);
  }catch(e){
    prog('');
    toast('Erro ao publicar: '+e.message,'erro');
    if($('sh-ok')) $('sh-ok').disabled=false;
  }
}
// async e devolvendo a promessa: quem chama precisa saber quando terminou,
// senão a tela se redesenha antes de a troca do link estar gravada.
async function renovarLink(id){
  const p=paineis.find(x=>x._id===id); if(!p) return;
  if(!confirm('Gerar um link novo para "'+(p.titulo||'')+'"?\n\n'
    +'O link atual para de funcionar na hora. Use isto se o endereço vazou.')) return;
  return publicar(id, p.token);
}
async function despublicar(id){
  const p=paineis.find(x=>x._id===id); if(!p || !p.token) return;
  if(!confirm('Desativar o link público de "'+(p.titulo||'')+'"?\n\n'
    +'Quem tiver o endereço deixa de conseguir abrir. O painel continua aqui.')) return;
  try{
    await apagarPublico(p.token, p.chunks||0);
    const semToken=Object.assign({}, p);
    delete semToken.token; delete semToken.publicadoEm; delete semToken.publicadoPor;
    semToken.historico=logDem(p.historico,'Exclusão',
      [{rotulo:'link público', de:'ativo', para:'—'}], 'link público desativado');
    await window._setDoc(window._doc(COL_PAINEL, id), semToken);
    fecharMod();
    toast('Link público desativado.','ok');
  }catch(e){ toast('Erro ao desativar: '+e.message,'erro'); }
}
async function apagarPublico(token, chunks){
  // Apaga com folga: se o painel encolheu, ainda há pedaços de antes.
  for(let i=0;i<Math.max(chunks,1)+40;i+=1){
    try{ await window._deleteDoc(window._doc(COL_PUBDAD, token+'__'+i)); }catch(e){}
  }
  try{ await window._deleteDoc(window._doc(COL_PUB, token)); }catch(e){}
}
// Reflete no link público o que mudou no painel: sempre os metadados, e os
// pedaços só quando o arquivo foi trocado.
async function atualizarPublico(p, arquivoNovo){
  if(!p || !p.token) return;
  if(arquivoNovo){
    for(let i=0;i<(p.chunks||0);i+=1){
      const s=await window._getDoc(window._doc(COL_DADOS, p._id+'__'+i));
      if(!s.exists()) throw new Error('pedaço '+(i+1)+' não encontrado');
      await window._setDoc(window._doc(COL_PUBDAD, p.token+'__'+i), {p:(s.data()||{}).p||''});
    }
  }
  await window._setDoc(window._doc(COL_PUB, p.token), {
    painel:p._id, titulo:p.titulo||'', descricao:p.descricao||'',
    chunks:p.chunks||0, gzip:!!p.gzip, bytes:p.bytes||0,
    publicadoEm:p.publicadoEm||agora(), publicadoPor:p.publicadoPor||quem(),
    atualizadoEm:agora(), atualizadoPor:quem()
  });
}

// Abre o painel em tela cheia, dentro de um iframe ISOLADO: sandbox sem
// allow-same-origin, então o painel roda os scripts dele mas não alcança o
// Firebase, o login nem os dados do sistema.
async function abrirPainel(id){
  const p=paineis.find(x=>x._id===id); if(!p) return;
  $('camada').innerHTML='<div class="visor" id="visor">'
    +'<div class="visor__bar">'
      +'<button class="btn" onclick="fecharMod()"><i class="ti ti-arrow-left"></i> Voltar</button>'
      +'<span class="visor__t">'+esc(p.titulo||'')+'</span>'
      +'<span style="flex:1"></span>'
      +'<span style="font-size:11.5px;color:var(--text-secondary)">'+tamanho(p.bytes)
        +' · '+esc(p.arquivo||'')+'</span>'
    +'</div>'
    +'<div id="visor-corpo" style="flex:1;display:flex;align-items:center;justify-content:center;'
      +'font-size:13px;color:var(--text-secondary)"><i class="ti ti-loader"></i>&nbsp; Carregando o painel...</div>'
    +'</div>';
  try{
    const partes=[];
    for(let i=0;i<(p.chunks||0);i+=1){
      const s=await window._getDoc(window._doc(COL_DADOS, id+'__'+i));
      if(!s.exists()) throw new Error('pedaço '+(i+1)+' do arquivo não encontrado');
      partes.push((s.data()||{}).p||'');
    }
    const html=await descomprimir(partes.join(''), !!p.gzip);
    const corpo=$('visor-corpo'); if(!corpo) return;    // fechou antes de carregar
    corpo.style.display='block';
    corpo.innerHTML='<iframe class="visor__f" sandbox="allow-scripts allow-popups allow-forms" '
      +'style="height:100%" title="'+esc(p.titulo||'')+'"></iframe>';
    corpo.querySelector('iframe').srcdoc=html;
  }catch(e){
    const corpo=$('visor-corpo');
    if(corpo) corpo.innerHTML='<div style="text-align:center;padding:30px">'
      +'<div style="font-size:30px;color:var(--cm-alta)"><i class="ti ti-alert-triangle"></i></div>'
      +'<p>Não foi possível abrir o painel.<br><span style="font-size:12px">'+esc(e.message)+'</span></p></div>';
  }
}

// ══════════════════════════════════════════════════════════════════════════
// DEMANDAS DE TECNOLOGIA (empresa parceira)
// ══════════════════════════════════════════════════════════════════════════
// Prioridade é o número que a parceira usa na planilha (coluna T), não um
// nível traduzido: 0, 1, 2, 4, 10... e em muitas linhas vem vazio. Guardar o
// número evita inventar uma escala que a planilha não declara.
function prioTxt(v){ return (v===''||v==null) ? '—' : String(v); }
// Vazio vai para o FIM. Sem o teste explícito, Number('') daria 0 e a
// prioridade em branco passaria na frente da mais urgente.
function prioNum(v){
  if(v===''||v==null) return 9999;
  const n=Number(v);
  return isFinite(n)?n:9999;
}
const STATUS=[
  {v:'fila',      l:'Na fila',      cor:'var(--cm-fila)'},
  {v:'andamento', l:'Em andamento', cor:'var(--cm-andamento)'},
  {v:'pausada',   l:'Pausada',      cor:'var(--cm-pausada)'},
  {v:'entregue',  l:'Entregue',     cor:'var(--cm-entregue)'},
];

const sInfo=v=>STATUS.find(s=>s.v===v)||{v,l:v||'—',cor:'var(--cm-fila)'};
const pill=(txt,cor)=>'<span class="pill" style="background:'+cor+'">'+esc(txt)+'</span>';

// ── Sprints ───────────────────────────────────────────────────────────────
// A planilha não traz sprint, só a entrega estimada. Então a sprint é uma
// JANELA sobre essa data, e a cadência é escolhida na tela — assim não sou eu
// chutando se a Udiaço trabalha em semana, quinzena ou mês.
let sprintModo='quinzenal';
const SPRINT_DIAS={semanal:7, quinzenal:14};
const SEG_REF=new Date(2026,0,5);        // 05/01/2026, uma segunda-feira
function _dl(iso){ const m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m?new Date(+m[1],+m[2]-1,+m[3]):null; }
function sprintDe(iso){
  const d=_dl(iso); if(!d) return null;
  if(sprintModo==='mensal'){
    const ini=new Date(d.getFullYear(),d.getMonth(),1);
    const fim=new Date(d.getFullYear(),d.getMonth()+1,0);
    return {ini,fim,chave:ini.getFullYear()+'-'+String(ini.getMonth()+1).padStart(2,'0')};
  }
  const n=SPRINT_DIAS[sprintModo]||14;
  const bloco=Math.floor(Math.round((d-SEG_REF)/86400000)/n);
  const ini=new Date(SEG_REF); ini.setDate(SEG_REF.getDate()+bloco*n);
  const fim=new Date(ini);     fim.setDate(ini.getDate()+n-1);
  return {ini,fim,chave:ini.getFullYear()+'-'+String(ini.getMonth()+1).padStart(2,'0')+'-'+String(ini.getDate()).padStart(2,'0')};
}
const MES3=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
function sprintTitulo(sp){
  if(!sp) return 'Sem prazo definido';
  if(sprintModo==='mensal') return MES3[sp.ini.getMonth()]+'/'+sp.ini.getFullYear();
  const f=d=>String(d.getDate()).padStart(2,'0')+' '+MES3[d.getMonth()];
  return f(sp.ini)+' a '+f(sp.fim);
}
function irSprintModo(m){ sprintModo=m; pintarDemandas(); }

function viewDemandas(){
  const solicitantes=[...new Set(demandas.map(d=>d.solicitante||'').filter(Boolean))].sort();
  const prios=[...new Set(demandas.map(d=>d.prioridade).filter(v=>v!==''&&v!=null))]
    .sort((a,b)=>prioNum(a)-prioNum(b)).map(v=>({v:String(v),l:String(v)}));
  const opt=(arr,sel,vazio)=>'<option value="">'+vazio+'</option>'
    +arr.map(o=>'<option value="'+esc(o.v)+'"'+(sel===o.v?' selected':'')+'>'+esc(o.l)+'</option>').join('');
  return '<div class="pg-head">'
      +'<div><h2 class="pg-tit">Demandas de tecnologia</h2>'
      +'<p class="pg-sub">Projetos com a empresa parceira'
        +ajuda('Cada linha é uma demanda: o que foi pedido, quem pediu, a prioridade e o prazo de entrega. '
              +'Toda alteração fica registrada com data, hora e usuário.')+'</p></div>'
      +'<div class="acoes"><button class="btn" onclick="exportarDemandas()">'
        +'<i class="ti ti-file-spreadsheet"></i> CSV</button>'
        +'<button class="btn btn--primary" onclick="modalDemanda(null)">'
        +'<i class="ti ti-plus"></i> Nova demanda</button></div></div>'
    +'<div class="stats" id="dm-stats"></div>'
    +'<div class="filtros">'
      +'<div class="fg" style="flex:1;min-width:180px"><label>Buscar</label>'
        +'<input type="text" id="dm-q" placeholder="Demanda, quem pediu, área..." value="'+esc(filtroDem.q)+'" oninput="filtrarDem()"></div>'
      +'<div class="fg"><label>Prioridade</label><select id="dm-prio" onchange="filtrarDem()">'
        +opt(prios, filtroDem.prio, 'Todas')+'</select></div>'
      +'<div class="fg"><label>Status</label><select id="dm-status" onchange="filtrarDem()">'
        +opt(STATUS, filtroDem.status, 'Todos')+'</select></div>'
      +'<div class="fg"><label>Sprint'
        +ajuda('A planilha não traz sprint, só a entrega estimada. Escolha a cadência que a Udiaço usa e as demandas se agrupam nessas janelas.')
        +'</label><select onchange="irSprintModo(this.value)">'
        +['semanal','quinzenal','mensal'].map(m=>'<option value="'+m+'"'
          +(sprintModo===m?' selected':'')+'>'+m.charAt(0).toUpperCase()+m.slice(1)+'</option>').join('')
        +'</select></div>'
      +'<div class="fg"><label>Quem pediu</label><select id="dm-solic" onchange="filtrarDem()">'
        +opt(solicitantes.map(s=>({v:s,l:s})), filtroDem.solic, 'Todos')+'</select></div>'
    +'</div>'
    +'<div id="dm-lista"></div>';
}
function filtrarDem(){
  filtroDem={q:($('dm-q')?.value||'').toLowerCase().trim(),
    prio:$('dm-prio')?.value||'', status:$('dm-status')?.value||'',
    solic:$('dm-solic')?.value||''};
  pintarDemandas();
}
function demandasFiltradas(){
  return demandas.filter(d=>{
    if(filtroDem.prio && String(d.prioridade)!==filtroDem.prio) return false;
    if(filtroDem.status && d.status!==filtroDem.status) return false;
    if(filtroDem.solic && d.solicitante!==filtroDem.solic) return false;
    if(filtroDem.q){
      const alvo=[d.titulo,d.descricao,d.solicitante,d.area].join(' ').toLowerCase();
      if(!alvo.includes(filtroDem.q)) return false;
    }
    return true;
  }).sort((a,b)=>{
    // Entregues descem; o resto sobe por prazo mais apertado.
    const ea=a.status==='entregue'?1:0, eb=b.status==='entregue'?1:0;
    if(ea!==eb) return ea-eb;
    const pa=a.prazo||'9999', pb=b.prazo||'9999';
    if(pa!==pb) return pa<pb?-1:1;
    return prioNum(a.prioridade)-prioNum(b.prioridade);
  });
}
function pintarDemandas(){
  const lista=demandasFiltradas();
  const st=$('dm-stats');
  if(st){
    const abertas=demandas.filter(d=>d.status!=='entregue');
    const atrasadas=abertas.filter(d=>{ const n=diasAte(d.prazo); return n!==null && n<0; });
    const semana=abertas.filter(d=>{ const n=diasAte(d.prazo); return n!==null && n>=0 && n<=7; });
    st.innerHTML=[
      ['<span style="color:var(--text)">'+abertas.length+'</span>','em aberto',''],
      ['<span style="color:var(--cm-alta)">'+atrasadas.length+'</span>','com prazo vencido',
        'Prazo de entrega já passou e a demanda não está como Entregue.'],
      ['<span style="color:var(--cm-media)">'+semana.length+'</span>','vencem em 7 dias',''],
      ['<span style="color:var(--text)">'+abertas.filter(d=>!d.prazo).length+'</span>',
        'sem prazo definido',
        'Sem entrega estimada na planilha: não entram na conta de vencidas nem de 7 dias.'],
    ].map(([n,l,h])=>'<div><div class="stat__n">'+n+'</div>'
      +'<div class="stat__l">'+l+(h?ajuda(h):'')+'</div></div>').join('');
  }
  const el=$('dm-lista'); if(!el) return;
  if(!lista.length){
    el.innerHTML='<div class="vazio"><div class="vazio__ic"><i class="ti ti-clipboard-list"></i></div>'
      +'<p>'+(demandas.length?'Nenhuma demanda com os filtros atuais.'
        :'Nenhuma demanda ainda. Clique em <strong>Nova demanda</strong>.')+'</p></div>';
    return;
  }
  // Agrupa pela sprint da entrega estimada. Quem não tem prazo vai para um
  // grupo no fim — são a maioria hoje, e esconder isso seria pior.
  const grupos=new Map();
  lista.forEach(d=>{
    const sp=sprintDe(d.prazo);
    const k=sp?sp.chave:'zz-sem-prazo';
    if(!grupos.has(k)) grupos.set(k,{sp, itens:[]});
    grupos.get(k).itens.push(d);
  });
  const ordenadas=[...grupos.entries()].sort((a,b)=>a[0]<b[0]?-1:1);
  const hojeISO=new Date().toISOString().slice(0,10);

  el.innerHTML=ordenadas.map(([chave,g])=>{
    // Dentro da sprint: prioridade primeiro (menor número na frente, vazio no
    // fim), e entre iguais a entrega mais próxima.
    const itens=g.itens.slice().sort((a,b)=>{
      const p=prioNum(a.prioridade)-prioNum(b.prioridade);
      if(p) return p;
      return String(a.prazo||'9999').localeCompare(String(b.prazo||'9999'));
    });
    const vencida=g.sp && g.sp.fim.toISOString().slice(0,10)<hojeISO;
    const abertas=itens.filter(d=>d.status!=='entregue').length;
    return '<div class="sp-bloco">'
      +'<div class="sp-cab'+(vencida?' sp-cab--venc':'')+(g.sp?'':' sp-cab--sem')+'">'
        +'<span class="sp-tit">'+esc(sprintTitulo(g.sp))+'</span>'
        +'<span class="sp-n">'+itens.length+(abertas!==itens.length?' · '+abertas+' em aberto':'')+'</span>'
      +'</div>'
      +'<div class="tbl-wrap"><table class="dm"><thead><tr>'
        +'<th>Demanda</th><th style="text-align:center">Prioridade</th>'
        +'<th>Entrega estimada</th><th>Status</th><th>Quem pediu</th>'
        +'<th>Entrada</th><th>Área</th><th style="text-align:center">Editar</th>'
      +'</tr></thead><tbody>'
      +itens.map(d=>{
        const n=diasAte(d.prazo);
        const entregue=d.status==='entregue';
        const cls = entregue||n===null ? '' : (n<0?'prazo-venc':(n<=7?'prazo-perto':''));
        const quando = d.prazo
          ? soData(d.prazo)+(entregue||n===null?'':' <span style="font-size:10.5px">('
              +(n<0?(-n)+'d atrasado':(n===0?'hoje':n+'d'))+')</span>')
          : '—';
        // Descritivo no hover do nome: o texto completo sem ocupar coluna.
        const desc=String(d.descricao||'').trim();
        const tip=desc?esc(desc).replace(/\n/g,'&#10;'):'';
        return '<tr class="clicavel"'+(entregue?' style="opacity:.62"':'')
          +' onclick="modalDemanda(\''+d._id+'\')">'
          +'<td style="font-weight:600;min-width:240px">'
            +'<span'+(tip?' title="'+tip+'" class="tem-desc"':'')+'>'
            +esc(d.titulo||'(sem título)')+'</span></td>'
          +'<td style="text-align:center;font-weight:700;font-variant-numeric:tabular-nums">'
            +prioTxt(d.prioridade)+'</td>'
          +'<td class="'+cls+'">'+quando+'</td>'
          +'<td>'+pill(sInfo(d.status).l, sInfo(d.status).cor)+'</td>'
          +'<td>'+esc(d.solicitante||'—')+'</td>'
          +'<td style="color:var(--text-secondary);white-space:nowrap">'+(d.entrada?soData(d.entrada):'—')+'</td>'
          +'<td style="color:var(--text-secondary)">'+esc(d.area||'—')+'</td>'
          +'<td style="text-align:center"><button class="btn-ed" title="Editar esta demanda" '
            +'onclick="event.stopPropagation();modalDemanda(\''+d._id+'\')">'
            +'<i class="ti ti-pencil"></i></button></td>'
          +'</tr>';
      }).join('')+'</tbody></table></div></div>';
  }).join('')
    +'<div style="font-size:11.5px;color:var(--text-secondary);margin-top:8px">'
    +lista.length+' de '+demandas.length+' demanda(s) em '+ordenadas.length+' sprint(s)</div>';
}

function modalDemanda(id){
  const d = id ? demandas.find(x=>x._id===id) : null;
  const sel=(arr,v)=>arr.map(o=>'<option value="'+o.v+'"'+(v===o.v?' selected':'')+'>'+o.l+'</option>').join('');
  $('camada').innerHTML='<div class="mod" id="mod-dm">'
    +'<div class="mod__cx"><div class="mod__h"><b>'+(d?'Demanda':'Nova demanda')+'</b>'
      +'<button class="mod__x" onclick="fecharMod()">&times;</button></div>'
    +'<div class="mod__b">'
    +'<div class="fg" style="margin-bottom:12px"><label>Demanda</label>'
      +'<input type="text" id="dm-tit" maxlength="120" placeholder="O que foi pedido" '
      +'value="'+esc(d?d.titulo:'')+'"></div>'
    +'<div class="grid2" style="margin-bottom:12px">'
      +'<div class="fg"><label>Quem pediu</label><input type="text" id="dm-solic" maxlength="80" '
        +'placeholder="Nome de quem solicitou" value="'+esc(d?d.solicitante:'')+'"></div>'
      +'<div class="fg"><label>Área</label><input type="text" id="dm-area" maxlength="60" '
        +'placeholder="Ex.: Comercial, Diretoria" value="'+esc(d?d.area:'')+'"></div>'
      +'<div class="fg"><label>Prioridade'
        +ajuda('O número que a parceira usa na planilha (coluna T). Vazio = sem prioridade definida.')
        +'</label><input type="number" id="dm-f-prio" step="1" placeholder="—" '
        +'value="'+esc(d&&d.prioridade!=null?d.prioridade:'')+'"></div>'
      +'<div class="fg"><label>Entrada da demanda'
        +ajuda('Quando o pedido chegou. É o que permite ver há quanto tempo a demanda está aberta.')
        +'</label><input type="date" id="dm-entrada" value="'+esc(d?d.entrada:'')+'"></div>'
      +'<div class="fg"><label>Entrega estimada</label><input type="date" id="dm-prazo" '
        +'value="'+esc(d?d.prazo:'')+'"></div>'
      +'<div class="fg"><label>Status</label><select id="dm-f-status">'+sel(STATUS,d?d.status:'fila')+'</select></div>'
    +'</div>'
    +'<div class="fg" style="margin-top:12px"><label>Descritivo'
      +ajuda('O texto completo como veio da planilha. A demanda acima é o resumo.')
      +'</label><textarea id="dm-desc" rows="6" placeholder="Texto completo da demanda">'
      +esc(d?d.descricao:'')+'</textarea></div>'
    +(d?'<div style="margin-top:14px"><div class="fg" style="margin-bottom:6px"><label>Histórico'
        +ajuda('Toda inclusão, edição e exclusão fica registrada com data, hora e usuário.')+'</label></div>'
      +'<div class="hist">'+histHTML(d.historico)+'</div></div>':'')
    +'</div>'
    +'<div class="mod__f">'
    +(d?'<button class="btn" style="color:var(--cm-alta)" onclick="excluirDemanda(\''+d._id+'\')">'
        +'<i class="ti ti-trash"></i> Excluir</button>':'<span></span>')
    +'<span style="display:flex;gap:8px"><button class="btn" onclick="fecharMod()">Cancelar</button>'
    +'<button class="btn btn--primary" id="dm-ok" onclick="salvarDemanda(\''+(d?d._id:'')+'\')">'
      +'<i class="ti ti-check"></i> Salvar</button></span>'
    +'</div></div></div>';
  setTimeout(()=>{ const t=$('dm-tit'); if(t) t.focus(); },50);
}
async function salvarDemanda(id){
  const dep={
    titulo:($('dm-tit').value||'').trim(),
    descricao:($('dm-desc').value||'').trim(),
    solicitante:($('dm-solic').value||'').trim(),
    area:($('dm-area').value||'').trim(),
    prioridade:($('dm-f-prio').value||'').trim(),
    entrada:$('dm-entrada').value||'',
    prazo:$('dm-prazo').value||'',
    status:$('dm-f-status').value||'fila',
  };
  if(!dep.titulo){ toast('Diga qual é a demanda.','aviso'); return; }
  if(!dep.solicitante){ toast('Informe quem pediu.','aviso'); return; }
  const d = id ? demandas.find(x=>x._id===id) : null;
  const mud = d ? diffDem(d, dep) : [{rotulo:'demanda', de:'—', para:dep.titulo}];
  if(d && !mud.length){ fecharMod(); toast('Nada mudou.','info'); return; }
  const btn=$('dm-ok'); if(btn) btn.disabled=true;
  try{
    const docId = id || ('dm_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7));
    const dados=Object.assign({}, d||{}, dep, {
      atualizadoEm:agora(), atualizadoPor:quem(),
      historico:logDem(d?d.historico:[], d?'Edição':'Inclusão', mud)
    });
    if(!d){ dados.criadoEm=agora(); dados.criadoPor=quem(); }
    await window._setDoc(window._doc(COL_DEM, docId), dados);
    fecharMod();
    toast(d?'Demanda atualizada.':'Demanda criada.','ok');
  }catch(e){ toast('Erro ao salvar: '+e.message,'erro'); }
  finally{ if($('dm-ok')) $('dm-ok').disabled=false; }
}
async function excluirDemanda(id){
  const d=demandas.find(x=>x._id===id); if(!d) return;
  if(!confirm('Excluir a demanda "'+(d.titulo||'')+'"?\n\nO histórico dela vai junto.')) return;
  try{
    await window._deleteDoc(window._doc(COL_DEM, id));
    fecharMod();
    toast('Demanda excluída.','ok');
  }catch(e){ toast('Erro ao excluir: '+e.message,'erro'); }
}
function exportarDemandas(){
  const lista=demandasFiltradas();
  const cab=['Demanda','Prioridade','Entrega estimada','Status','Quem pediu',
    'Entrada da demanda','Área','Descritivo','Criada em','Criada por',
    'Última alteração','Por'];
  const linhas=lista.map(d=>[d.titulo||'', prioTxt(d.prioridade), d.prazo||'',
    sInfo(d.status).l, d.solicitante||'', d.entrada||'', d.area||'', d.descricao||'',
    dataHora(d.criadoEm), d.criadoPor||'', dataHora(d.atualizadoEm), d.atualizadoPor||'']);
  const csv=[cab].concat(linhas)
    .map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(';')).join('\r\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'}));
  a.download='Demandas_Tecnologia.csv';
  a.click(); URL.revokeObjectURL(a.href);
  toast('CSV exportado.','ok');
}

// ── Início ────────────────────────────────────────────────────────────────
function iniciar(){
  $('btn-entrar').onclick=entrar;
  $('login-senha').addEventListener('keydown',e=>{ if(e.key==='Enter') entrar(); });
  $('link-reset').onclick=e=>{ e.preventDefault(); resetarSenha(); };
  $('btn-sair').onclick=async()=>{ await window._signOut(); location.reload(); };
  $('btn-portal').onclick=()=>{ location.href='index.html'; };
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') fecharMod(); });
  window._onAuthStateChanged(window._auth, async user=>{
    if(!user){ mostrarLogin(); return; }
    const r=await carregarUsuario(user.email);
    if(r!=='ok'){
      erroLogin(r==='sem-plataforma'
        ? 'Seu acesso ao sistema está ativo, mas a plataforma Comercial não foi liberada para você. Peça ao Master (Sistema de RH > Acessos).'
        : 'Seu e-mail não tem acesso liberado a este sistema. Procure o administrador.');
      await window._signOut();
      return;
    }
    mostrarApp();
    assinarDados();
  });
}
if(window._firebaseReady) iniciar();
else window.addEventListener('firebaseReady', iniciar, {once:true});
