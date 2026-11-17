---
tipo: ficha
sistema: mahou
status: final
parent: "[[_MOC Sistema]]"
tags:
  - tipo/ficha
  - sistema/mahou
  - status/final
---

# Estilo — Identidade Visual da Ficha HTML

#### Identidade Visual

O arquivo implementa uma interface de **gerenciador de fichas de RPG** com uma estética deliberadamente **medieval-manuscrita**. A linguagem visual evoca pergaminhos, tintas envelhecidas e ornamentos de livros antigos — sem nunca recorrer a imagens ou texturas externas, apenas CSS puro.

---

#### Paleta de Cores

A paleta é construída inteiramente em variáveis CSS (`:root`) e segue uma lógica de **tons terrosos e orgânicos**:

- **Pergaminho** (`--parch` a `--parch4`): quatro gradações de bege-amarelado (`#f5f0e8` até `#d9cfb8`), usadas como fundos de painéis, cards e inputs — simulando papel envelhecido.
- **Ferrugem/Vinho** (`--rust`, `--rust2`): um vermelho-tijolo profundo (`#8b2e10`, `#c04020`), cor dominante para títulos, destaques, botões primários e estados ativos. Define o "acento" quente da interface.
- **Ouro** (`--gold`, `--gold2`): tons âmbar (`#a07820`, `#c8a040`), usados para divisores decorativos, tags, estados concluídos na barra de progresso e elementos premium.
- **Ardósia** (`--slate` a `--slate3`): escala de cinzas-marrons (`#3a3530` a `#7a706a`) para textos secundários e bordas sutis.
- **Azul, Verde, Vermelho escuro** (`--blue`, `--green`, `--red`): cores funcionais usadas exclusivamente em tags temáticas (defesa, bônus, ataque) e estados de erro/perigo.

O `body` recebe dois gradientes radiais sutilíssimos (`rgba` com apenas 6% de opacidade) em ferrugem e ouro nos cantos, criando uma atmosfera quente sem ser invasiva.

---

#### Tipografia

Duas fontes do Google Fonts definem a hierarquia:

- **Cinzel** (serifa romana, pesos 400/600/700): usada em todos os títulos, labels, botões, navegação e elementos de interface. Remete às inscrições em pedra e capas de livros medievais. Todas as letras em `text-transform: uppercase` com `letter-spacing` generoso.
- **Crimson Pro** (serifa elegante, itálicos e pesos finos): usada no corpo do texto, subtítulos e descrições. A combinação com itálico reforça o tom literário/manuscrito.

---

#### Componentes e Padrões de Design

**Header fixo** (`position: sticky`): faixa de pergaminho claro com logo em Cinzel (ferrugem + ouro bichromático), sombra leve e navegação em botões fantasma de borda fina.

**Painéis** (`.panel`): cards de fundo bege com borda `1px solid` em pergaminho escuro, `border-radius: 9px` e sombra discreta. Os títulos de painel têm fundo ligeiramente mais escuro, texto em ferrugem e caixa alta — padrão consistente em toda a UI.

**Botões**: três variantes principais:

- `.btn-primary`: fundo ferrugem sólido, texto bege, fonte Cinzel em negrito — ação principal.
- `.btn-ghost`: transparente com borda sutil — ação secundária.
- `.btn-danger`: borda e texto em vermelho escuro, com hover que preenche de vermelho. Todos têm `min-height: 46px` e `touch-action: manipulation` para otimização mobile.

**Wizard de criação de personagem**: barra de progresso com pontos circulares (`wz-dot`) — cinza para pendente, ouro para concluído, ferrugem com halo brilhante para o passo atual. Linhas conectoras mudam de cor conforme o avanço. Animação de entrada suave (`translateY + opacity`) a cada troca de passo.

**Cards de seleção** (`.wz-card`): grid responsivo com `auto-fill / minmax(165px, 1fr)`. Estado selecionado adiciona borda ferrugem, fundo levemente tingido e um ícone de check circular no canto superior direito.

**Skill Tree**: grid de 5 colunas com nós clicáveis. Nós base têm `border-top: 2px solid var(--gold)` como marcação especial. Nós bloqueados ficam com `opacity: 0.4` e cursor proibido. A seleção aplica borda ferrugem.

**Overlay modal**: fundo escuro semitransparente (`rgba(14,13,11,.82)`), caixa centralizada com `border-radius: 11px`, scroll interno e sombra dramática — usado para a Skill Tree Mahou.

**Toast de notificação**: posicionado no rodapé, centralizado, aparece via transição de opacidade. Suporta `env(safe-area-inset-bottom)` para notch de iPhone.

**Divisores decorativos** (`.hub-divider`, `.wz-header-div`): linhas finas com `linear-gradient(90deg, transparent, var(--gold), transparent)` — detalhe ornamental que remete a iluminuras medievais.

---

#### Responsividade

Dois breakpoints via `@media`:

- **640px**: colapsa grids de 3 para 2 colunas (atributos, derivados), oculta labels da barra de progresso, reduz a skill tree para 2 colunas.
- **480px**: cards do wizard vão para 2 colunas, cards wide para 1 coluna.

Toda a UI usa `box-sizing: border-box` global, rem para espaçamentos e `max-width` nos containers (900px padrão, 1100px wide).

---

#### Síntese

O resultado é uma interface funcional e moderna com **verniz de manuscrito medieval**: tons de pergaminho, ouro e ferrugem, tipografia romana clássica, ornamentos lineares e sem nenhum elemento anacrônico como sombras neon ou gradientes sintéticos. O CSS é altamente sistemático, baseado em variáveis semânticas, e o design escala bem do mobile ao desktop.

---

Layout estrutural em [[05 - Ficha D4/Design da Ficha/Layout da Ficha|Layout da Ficha]]. Implementação: `Arquivos finais sistemas/HTML - Ficha final/ficha.html` e `ficha_wizard.html`.
