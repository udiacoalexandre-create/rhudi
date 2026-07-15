# Guia de design — Udiaço (rhudi)

Estilo escolhido: **SaaS moderno com cor**. A ideia é manter 100% da lógica e da
estrutura do sistema e trocar só a camada visual, aplicando um conjunto de tokens
(cores, espaçamento, tipografia) e classes de componente consistentes em todas as telas.

O arquivo `udiaco-design-system.css` contém tudo pronto para colar.

---

## Como aplicar (passo a passo)

1. **Adicione a fonte** no `<head>` do `index.html`:
   ```html
   <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
   ```

2. **Cole o conteúdo de `udiaco-design-system.css`** dentro do `<style>` do
   `index.html` (de preferência no topo, para as variáveis valerem em todo o CSS).

3. **Troque as classes/estilos antigos** pelas novas classes de componente,
   tela por tela. O Claude Code faz isso bem se você pedir uma tela por vez.

---

## Princípios (o que muda vs. o atual)

| Item | Antes | Agora |
|------|-------|-------|
| Barra superior | Azul-marinho saturado | Branca, com borda fina embaixo |
| Cabeçalho de tabela | Azul-marinho saturado | Cinza claro, texto maiúsculo discreto |
| Cards de status | Borda-esquerda colorida grossa | Borda fina + chip de ícone colorido |
| Ícones | Emoji (🎁 🏆 🏖️ 💰) | Biblioteca de ícones (ex.: Lucide / Tabler) |
| Status | Texto colorido solto | Badge com fundo suave da cor |
| Linha de colaborador | Só texto | Avatar com iniciais + nome + subtítulo |
| Cor | Muitas cores decorativas | Cor só com significado (status) |
| Tipografia | Fonte padrão do sistema | Inter, com escala e pesos definidos |

**Regra de ouro da cor:** neutro domina; cor só quando carrega significado
(verde = ok/trabalhando, âmbar = atenção/férias, vermelho = afastado/vencido,
azul = ação/destaque, roxo = sócios). Evite cor como enfeite.

---

## Mapa rápido de classes

- Barra do topo → `.topbar`, `.topbar__brand`, `.topbar__logo`
- Abas → `.nav`, `.nav__item`, `.nav__item--active`
- Cartão de número → `.stat` + `.stat__chip .chip--success/warning/danger/accent`,
  `.stat__value`, `.stat__label`; grade `.stat-grid`; variação sólida `.stat--accent`
- Status → `.badge .badge--success/warning/danger/accent/purple/neutral`
- Elegibilidade (Cesta, Folha CLT) → `.tag .tag--accent/neutral`
- Linha de pessoa → `.person`, `.avatar` (+ `--success/warning/danger`), `.person__name`, `.person__sub`
- Tabela → `.table` (usa `<th>`/`<td>`; célula numérica com `.num`)
- Busca / inputs → `.search`, `.input`
- Botões → `.btn`, `.btn--primary/success/danger`
- Avisos → `.banner .banner--warning/info`
- Títulos → `.page-title`, `.page-subtitle`, `.section-label`

---

## Prompt pronto para o Claude Code

Cole isto no Claude Code (junto com os dois arquivos), ajustando a tela a cada rodada:

> Estou modernizando o visual do sistema rhudi (SPA em JavaScript/CSS puro, tudo no
> `index.html` + `app.js`). Anexei um sistema de design (`udiaco-design-system.css`)
> e um guia (`GUIA-DESIGN.md`).
>
> Faça o seguinte, sem alterar nenhuma lógica de negócio, chamadas ao Firestore,
> nem o comportamento do app:
>
> 1. Adicione o `<link>` da fonte Inter no `<head>` (conforme o guia).
> 2. Cole os tokens e classes do `udiaco-design-system.css` no `<style>` do `index.html`.
> 3. Refatore **apenas a tela "Base de Colaboradores"** para usar as novas classes:
>    - Topbar com `.topbar`; abas com `.nav`.
>    - Cards de status com `.stat` + chip de ícone colorido (nada de borda-esquerda).
>    - Tabela com `.table` (cabeçalho claro); coluna de nome com `.person` + `.avatar`
>      de iniciais e subtítulo com cargo/matrícula.
>    - Status e elegibilidade como `.badge` / `.tag`.
>    - Troque todos os emojis por ícones de uma biblioteca (Tabler ou Lucide via CDN).
>
> Preserve todos os `id`, `data-*` e event handlers existentes — só mude marcação/classe
> e CSS. Ao final, liste o que mudou e o que ainda falta migrar nas outras telas.

Depois é só repetir a etapa 3 para as outras telas (Benefícios, Controle de Férias,
Dashboard), uma de cada vez, apontando por screenshot o que ajustar.

---

## Sobre os ícones (importante)

Trocar emoji por ícones é a mudança de maior impacto. Sugestão de biblioteca leve via
CDN (combina com "sem build step"): **Tabler Icons** ou **Lucide**. Peça ao Claude Code
para incluir o CDN e substituir cada emoji pelo ícone equivalente
(ex.: 🎁 → `gift`, 🏆 → `trophy`, 🏖️ → `umbrella`, 💰 → `cash`, 📊 → `chart-bar`,
✅ → `circle-check`).

---

## Modo escuro (opcional, para depois)

Os tokens estão centralizados em `:root`, então dá para adicionar um tema escuro
redefinindo as mesmas variáveis dentro de `[data-theme="dark"]` mais tarde, sem mexer
nos componentes. Deixe para uma segunda fase.
