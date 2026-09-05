/*
 * Comparação de versões do Laboratório.
 *
 * Um arquivo só, usado pelos dois lados: o navegador carrega por <script> e o
 * terminal por require. Duas cópias da mesma conta acabariam divergindo, e um
 * diff que discorda de si mesmo é pior do que não ter diff.
 *
 * O algoritmo é o "patience": em vez de comparar tudo contra tudo, procura as
 * linhas que aparecem UMA única vez dos dois lados e usa essas como âncora.
 * Numa página HTML isso costuma ser a tag com id, o texto de um parágrafo, a
 * regra de CSS — justamente o que a pessoa reconhece. O resultado fica mais
 * perto de "o que eu mexi" do que o LCS clássico, que adora casar chaves e
 * linhas em branco soltas, e não precisa de matriz n×m para não travar num
 * arquivo grande.
 */
(function(raiz, definir){
  if(typeof module === 'object' && module.exports) module.exports = definir();
  else raiz.LabDiff = definir();
})(typeof self !== 'undefined' ? self : this, function(){
  'use strict';

  const linhas = txt => String(txt == null ? '' : txt).split(/\r?\n/);

  // Maior subsequência crescente, por índice. É o que transforma "linhas em
  // comum" em "linhas em comum que estão na mesma ordem nos dois lados".
  function maiorCrescente(pares){
    if(!pares.length) return [];
    const cauda = [], antes = new Array(pares.length).fill(-1);
    const idx = [];
    for(let i = 0; i < pares.length; i++){
      const v = pares[i].b;
      let lo = 0, hi = cauda.length;
      while(lo < hi){ const m = (lo + hi) >> 1; if(cauda[m] < v) lo = m + 1; else hi = m; }
      cauda[lo] = v;
      idx[lo] = i;
      antes[i] = lo > 0 ? idx[lo - 1] : -1;
    }
    const out = [];
    for(let i = idx[cauda.length - 1]; i >= 0; i = antes[i]) out.push(pares[i]);
    return out.reverse();
  }

  // Linhas que aparecem exatamente uma vez dos dois lados, na mesma ordem.
  function ancoras(a, b, ia, fa, ib, fb){
    const contaA = new Map(), contaB = new Map();
    for(let i = ia; i < fa; i++) contaA.set(a[i], (contaA.get(a[i]) || 0) + 1);
    for(let i = ib; i < fb; i++) contaB.set(b[i], (contaB.get(b[i]) || 0) + 1);
    const posB = new Map();
    for(let i = ib; i < fb; i++) if(contaB.get(b[i]) === 1) posB.set(b[i], i);
    const pares = [];
    for(let i = ia; i < fa; i++){
      if(contaA.get(a[i]) !== 1) continue;
      const j = posB.get(a[i]);
      if(j !== undefined) pares.push({ a:i, b:j });
    }
    return maiorCrescente(pares);
  }

  // Devolve uma lista de trechos: {tipo:'igual'|'entrou'|'saiu', a, b, texto}
  function comparar(textoA, textoB){
    const a = linhas(textoA), b = linhas(textoB);
    const saida = [];
    const emitir = (tipo, texto, ia, ib) => saida.push({ tipo, texto, a:ia, b:ib });

    (function recursao(ia, fa, ib, fb){
      // Prefixo e sufixo iguais saem na frente: é o que mantém isto rápido
      // num arquivo onde só um pedaço mudou.
      while(ia < fa && ib < fb && a[ia] === b[ib]){ emitir('igual', a[ia], ia, ib); ia++; ib++; }
      const fim = [];
      while(ia < fa && ib < fb && a[fa - 1] === b[fb - 1]){
        fa--; fb--; fim.unshift({ tipo:'igual', texto:a[fa], a:fa, b:fb });
      }
      if(ia === fa && ib === fb){ fim.forEach(x => saida.push(x)); return; }

      const anc = (ia < fa && ib < fb) ? ancoras(a, b, ia, fa, ib, fb) : [];
      if(!anc.length){
        // Sem nenhuma âncora: o trecho foi trocado por inteiro.
        for(let i = ia; i < fa; i++) emitir('saiu', a[i], i, null);
        for(let j = ib; j < fb; j++) emitir('entrou', b[j], null, j);
      } else {
        let pa = ia, pb = ib;
        anc.forEach(p => {
          recursao(pa, p.a, pb, p.b);
          emitir('igual', a[p.a], p.a, p.b);
          pa = p.a + 1; pb = p.b + 1;
        });
        recursao(pa, fa, pb, fb);
      }
      fim.forEach(x => saida.push(x));
    })(0, a.length, 0, b.length);

    return saida;
  }

  // Quanto mudou, para caber num rótulo.
  function resumo(textoA, textoB){
    let entrou = 0, saiu = 0;
    comparar(textoA, textoB).forEach(t => {
      if(t.tipo === 'entrou') entrou++;
      else if(t.tipo === 'saiu') saiu++;
    });
    return { entrou, saiu, mudou:entrou + saiu };
  }

  // Só os pedaços que mudaram, com algumas linhas de contexto em volta. Ver o
  // arquivo inteiro para achar três linhas alteradas não ajuda ninguém.
  function trechos(textoA, textoB, contexto){
    const ctx = contexto == null ? 3 : contexto;
    const lista = comparar(textoA, textoB);
    const interessa = new Array(lista.length).fill(false);
    lista.forEach((t, i) => {
      if(t.tipo === 'igual') return;
      for(let k = Math.max(0, i - ctx); k <= Math.min(lista.length - 1, i + ctx); k++)
        interessa[k] = true;
    });
    const blocos = [];
    let atual = null;
    lista.forEach((t, i) => {
      if(interessa[i]){
        if(!atual){ atual = { linhas:[], pulou:0 }; blocos.push(atual); }
        atual.linhas.push(t);
      } else if(atual){
        atual = null;
      }
    });
    return blocos;
  }

  return { comparar, resumo, trechos, linhas };
});
