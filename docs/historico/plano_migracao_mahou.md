# Plano de Migração — Ficha D4 → Sistema de Mahou (SkillTree v3)

> **Objetivo:** manter **100% do frontend** do arquivo `ficha_d4_errosCorrigidos_telaAnterior.html`
> (UI, wizard, design, derivados) e **substituir apenas o sistema de magia/habilidades e as
> inconsistências de dados** pelo que está no vault Obsidian atual.
>
> **Princípio diretor:** não redesenhar nada. Trocar as fontes de dados (objetos JS) e a lógica
> de seleção/render de habilidades. O resto do HTML/CSS permanece intacto.

---

## 0. Contexto para quem assume

### Arquivo alvo
`ficha_d4_errosCorrigidos_telaAnterior.html` — 3136 linhas, arquivo único (HTML+CSS+JS inline).
- **CSS:** linhas 7–891 (design tokens, não mexer)
- **HTML:** linhas 892–1383 (wizard de 9 steps + ficha)
- **JS:** linhas 1384–3134 (dados + lógica)

### Fontes canônicas no vault (Obsidian) — já lidas e válidas (`status: final`)
| Arquivo | O que define |
|---|---|
| `_MOC Sistema.md` | índice mestre |
| `Sistemas/Sistema_Core.md` | campos de ficha, raças, atributos, associações, históricos, estilos, motivações, pontos fracos |
| `Sistemas/Classes.md` | **8 classes**, atributo de ataque, defesa base, progressão, linha mágica/não-mágica |
| `Sistemas/Sistema_de_Mahou_-_SkillTree_v3_corrigido.md` | **ARQUIVO PESADO** — 8 classes × 20 nós = ~160 habilidades, 5 caminhos |
| `Sistemas/Mecânicas/Sistema de Combate.md` | turno, iniciativa, resolução de ataque, defesa |
| `Sistemas/Mecânicas/Buffs, Morte e Debuffs.md` | efeitos canônicos (condições/debuffs/buffs), teste de morte |
| `Sistemas/Sistema de Pericias D8.md` | 10 perícias, fórmula (A+B)/2 |
| `Ficha/Layout da Ficha.md` | ordem de exibição da ficha |

### Fluxo de telas (`screen`) — atual vs. desejado
O HTML tem **3 telas** (`<div class="screen">`): `screen-form` (wizard de 9 steps),
`screen-photo` (foto, tela isolada), `screen-sheet` (ficha completa).

**Fluxo ATUAL:**
```
screen-form (Steps 1..9) ─ Step 9 Revisão → gerarFicha() → screen-photo → screen-sheet
```
- Foto é uma **tela separada** (`screen-photo`, ~linha 1107) que aparece DEPOIS da revisão.
- `gerarFicha()` (~1756) termina com `showScreen('screen-photo')` (~1792).

**Fluxo DESEJADO (mudanças pedidas):**
```
screen-form:
  Step 1 (Nome + FOTO juntos) → Steps 2..8 → Step 9 Revisão
                                                   │
                                                   ▼
  screen-habilidades (NOVA: escolher habilidades de caminho) → screen-sheet (ficha)
```
1. **Foto migra para o Step 1 (Nome):** o upload de avatar passa a ficar **na mesma tela do nome**,
   eliminando a tela isolada `screen-photo` do fluxo (o CSS/markup de foto é reaproveitado).
2. **Nova tela de habilidades após a Revisão:** ao confirmar o Step 9, em vez de ir direto à
   ficha, o usuário vai a uma **tela dedicada de escolha de habilidades** (pontos de caminho) e,
   só então, segue para a ficha completa.

> Implementação detalhada destas duas mudanças está na **Etapa 4** (§7).

---

## 1. Diagnóstico — o que está inconsistente HOJE no HTML

### 1.1 Habilidades amarradas à RAÇA (núcleo do problema)
No HTML, `const CLASSES` define habilidades dentro de `habs: { elfo, humano, anao, demonio }`,
e `renderHabilidades()` busca `c.habs[rId]` (linha ~2165). Ou seja: **a habilidade que o
personagem recebe depende da raça**. Isso é o modelo **antigo** e **não existe** no vault atual.

No vault (Mahou v3), o modelo correto é:
- Habilidade vem da **CLASSE**, não da raça.
- Cada classe tem uma **skill tree de 20 nós** organizada em **5 caminhos**:
  **Chama** (amplificar), **Marés** (controlar posição), **Raiz** (sustentar),
  **Sopro** (desestabilizar), **Véu** (inverter).
- O jogador tem **6 pontos de caminho** (nível 1) para **escolher** habilidades,
  **+2 por nível**, **trocáveis a cada descanso**.
- Estrutura de cada nó: Nome, Tipo (Base / Aprimoramento X→Y), Pré-requisito, Alvo,
  Fórmula (`1d4 + (ATRIB/3)` ou `—`), Efeito (refs a IDs canônicos), Recarga (3 turnos), Sabor.

### 1.2 Lista de classes divergente
- HTML tem: soldado, monge, pastor, barbaro, bardo, **bruxo**, mago, xama.
- Vault tem: soldado, monge, barbaro, pastor, bardo, **cacador**, mago, xama.
- **Ação:** remover `bruxo`; adicionar `cacador` (Caçador, ATQ **AGI**, Def base **1**,
  linha Não Mágica, +2 AGI/nível). A skill tree do Caçador já está pronta no vault.

### 1.3 Defesa base do Mago
- HTML: `mago … defBase:0`. Vault (`Classes.md`): Mago **Def base = 1**. **Corrigir para 1.**
- Conferir todas as defBase contra a tabela de `Classes.md`:
  soldado 2, monge 1, barbaro 2, pastor 1, bardo 1, cacador 1, mago 1, xama 1.
  > ⚠️ HTML atual tem barbaro `defBase:1` — vault diz **2**. Corrigir.

### 1.4 Habilidades raciais
HTML tem `habRacial` (Fluxo Arcano, Pulso de Vontade, Forja Interna, Frenesi Abissal) +
ofensivas. **Não há equivalente no vault atual** (Mahou v3 é por classe). 
**Decisão pendente p/ o dono do sistema** (ver §6, Q1): manter raciais como estão, ou remover.
O plano assume **manter raciais inalteradas** por padrão (são ortogonais ao Mahou) e só trocar
as habilidades de classe — mas marque para validação.

### 1.5 Atributos base / progressão
- Vault (`Classes.md`): base nível 1 = **1d4 em cada** dos 5 atributos; +4 vida/nível;
  +2 pontos de caminho. HTML usa `base = {FOR:2,...}` em `calcAttrs` — **conferir** se a
  representação "pool de dados" do HTML corresponde a 1d4 inicial (provável: o HTML mostra
  contagem de dados, não valor fixo). Validar com o dono (ver §6, Q2). Não alterar sem confirmar.

---

## 2. Estratégia geral de execução

Trabalhar em **etapas isoladas e testáveis**, nesta ordem. O arquivo de Mahou é grande, então
ele tem **uma etapa própria (Etapa 3)**, mas as etapas anteriores **já preparam o terreno** para
recebê-lo (estrutura de dados, render, wizard).

```
Etapa 1  → Estrutura de classes + correções de dados (sem habilidades ainda)
Etapa 2  → Nova arquitetura de habilidades (esquema + render + seleção de caminhos)  ← prepara p/ Mahou
Etapa 3  → IMPORTAÇÃO DO MAHOU (arquivo pesado, 160 habilidades) ← etapa dedicada
Etapa 4  → Wizard: mudanças de fluxo de telas (foto junto ao Nome + tela de habilidades pós-revisão)
Etapa 5  → Validação, QA e conferência numérica contra o vault
```

Cada etapa termina com a ficha **abrindo sem erro de console** e gerando um personagem válido.

---

## 3. Etapa 1 — Estrutura de classes e correções de dados
**Não toca em habilidades ainda. Só arruma o esqueleto de classes.**

1. No objeto `const CLASSES` (linha ~1429):
   - **Remover** a entrada `bruxo`.
   - **Adicionar** `cacador`: `{ nome:'Caçador', atkAttr:'AGI', defBase:1, somaNivel:{AGI:2} }`.
   - **Corrigir** `mago.defBase` → `1`; `barbaro.defBase` → `2`.
   - **Remover temporariamente** o sub-objeto `habs: {...}` de cada classe (será substituído
     pela skill tree na Etapa 3). Deixar as classes "secas" com nome/atkAttr/defBase/somaNivel.
2. Garantir que `calcDefesa` (linha ~1739) e `danoFormula` (~1747) continuem funcionando sem `habs`.
3. Procurar referências a `bruxo` em TODO o arquivo (há 1 fora de CLASSES — `grep -n bruxo`) e
   tratar. Procurar `attrBardo`/`attrDemais` na associação `merc` — continua válido (Bardo usa AGI).
4. **Teste:** abrir a ficha, criar personagem de cada uma das 8 classes; ver que a aba de
   habilidades fica vazia/placeholder sem quebrar (renderHabilidades deve tolerar ausência de habs).

**Saída da etapa:** 8 classes corretas, zero `bruxo`, defBase corrigidas, console limpo.

---

## 4. Etapa 2 — Nova arquitetura de habilidades (preparação para o Mahou)
**Cria o "encaixe" onde os dados pesados do Mahou vão entrar, com dados mínimos de teste.**

### 4.1 Definir o schema de dados de habilidade (novo objeto)
Criar `const MAHOU` com a forma:
```js
const CAMINHOS = {
  chama:  { nome:'Chama',  verbo:'amplificar',         cor:'--rust2' },
  mares:  { nome:'Marés',  verbo:'controlar posição',  cor:'--blue'  },
  raiz:   { nome:'Raiz',   verbo:'sustentar',          cor:'--green' },
  sopro:  { nome:'Sopro',  verbo:'desestabilizar',     cor:'--slate3'},
  veu:    { nome:'Véu',    verbo:'inverter',           cor:'--gold'  },
};

// uma habilidade:
// {
//   id, nome, classe:'soldado', caminho:'chama',
//   tipo:'base' | 'aprimoramento',
//   transicao: null | { de:'chama', para:'mares' },   // p/ aprimoramentos
//   prereq: null | 'id-da-base',
//   alvo:'Alvo'|'Si'|'Área'|'Aliado'|'Atacante',
//   formula:'1d4 + (FOR/3)' | null,
//   efeito:'texto curto com IDs canônicos',
//   recarga:'3 turnos',
//   sabor:'frase narrativa'
// }
const MAHOU = { /* preenchido na Etapa 3 */ };
```
> Mantém o vocabulário do vault. Os efeitos referenciam IDs canônicos que JÁ existem no objeto
> `DEBUFFS` do HTML (enraizado, lentidao, amedrontado, etc.) — ver §4.4.

### 4.2 Reescrever `renderHabilidades()` (linha ~2159)
- Parar de usar `c.habs[rId]`.
- Passar a renderizar as **habilidades escolhidas** pelo personagem (ver `currentChar.caminhos`,
  array de IDs de habilidade selecionadas na tela de habilidades pós-revisão — Etapa 4.B).
- Agrupar por **caminho** (Chama/Marés/Raiz/Sopro/Véu) em vez de "Classe/Racial", reusando
  os componentes visuais existentes (`hab-group-header`, `hab-entry`, `hab-stripe`, `hab-pills`).
  Mapear cada caminho a uma cor já existente nos tokens.
- Manter o card "Ataque Base" (já existe, é independente).
- Manter as habilidades raciais (decisão §1.4) num grupo "Racial" separado.
- A fórmula de dano por habilidade continua `1d4 + Math.floor(attr/3)` usando `c.atkAttr`.

### 4.3 Estado do personagem
- Adicionar a `currentChar` e ao wizard: `caminhos: []` (IDs das habilidades escolhidas) e
  `pontosCaminho` (= 6 no nível 1, +2 por nível → `4 + 2*nivel`; confirmar fórmula em §6 Q3).
- `gerarFicha()` (linha ~1756) deve ler as escolhas e gravá-las em `currentChar`.

### 4.4 Mapa de efeitos canônicos
Conferir que TODOS os IDs citados nos efeitos do Mahou existem no objeto `DEBUFFS`/condições do HTML.
O vault (`Buffs, Morte e Debuffs.md`) define também **buffs** que o HTML ainda não tem como objeto:
`bonus_ataque, bonus_dano, bonus_for, bonus_teste, bonus_esquiva, regeneracao, reducao_dano,
absorcao_total, reacao_espera, ataque_extra`, e a condição **`marcado`** (debuff) e **`surpreso`**.
- **Ação:** criar `const BUFFS = {...}` espelhando a tabela do vault, e **adicionar `marcado`**
  ao objeto `DEBUFFS` (HTML atual não tem). Isso é necessário porque várias habilidades do Mahou
  aplicam `marcado`, `bonus_*`, `reducao_dano`, etc. Sem isso, os tooltips/efeitos ficam órfãos.

### 4.5 Dados mínimos de teste
Preencher `MAHOU` com **apenas as 5 habilidades-base do Soldado** (uma por caminho) para validar
render e seleção, antes de importar tudo. Não avançar para Etapa 3 sem a Etapa 2 verde.

**Saída da etapa:** render por caminhos funcionando com dados de teste; objetos BUFFS e marcado
criados; estado `caminhos`/`pontosCaminho` no personagem.

---

## 5. Etapa 3 — IMPORTAÇÃO DO MAHOU (etapa dedicada, arquivo pesado)
**Esta é a etapa grande e isolada. Só dados. Nenhuma mudança de lógica aqui.**

Fonte: `Sistemas/Sistema_de_Mahou_-_SkillTree_v3_corrigido.md` (ler via Obsidian).
Conteúdo: 8 classes, cada uma com **20 nós** (5 bases + 15 aprimoramentos), em 5 caminhos.

### 5.1 Estrutura observada na fonte (por classe)
- 1 bloco por caminho com **1 Base** + **4 Aprimoramentos** "do caminho para outros 4 caminhos"
  (ex.: Chama→Maré, Chama→Raiz, Chama→Sopro, Chama→Véu).
- 1 bloco "Aprimoramentos → Chama nos outros caminhos" (os 4 retornos para a Chama).
- Atenção: a contagem por classe é **20 nós** (cada classe declara "20 Nós da Skill Tree").

### 5.2 Procedimento de importação (recomendado: gerar via script, não à mão)
1. **Não digitar as 160 habilidades manualmente.** Escrever um pequeno parser/gerador:
   - Ler o markdown do vault.
   - Cada habilidade segue o padrão `**[Nome]** Tipo: ... Pré-requisito: ... Alvo: ...
     Fórmula: ... Efeito: ... Recarga: ... Sabor: ...`.
   - Extrair campos por regex e emitir o objeto JS no schema da §4.1.
   - Derivar `classe` pelo cabeçalho `### CLASSE — 20 Nós`; `caminho` e `transicao` pelo
     `Tipo:` (ex.: `Aprimoramento (Chama → Maré)` → `caminho:'chama', transicao:{de:'chama',para:'mares'}`).
   - Normalizar acentos nos IDs de caminho (Marés→mares, Véu→veu).
2. Validar a contagem: **8 × 20 = 160** objetos. Se alguma classe vier com ≠20, revisar a fonte
   (o Bardo e o Xamã têm formatação ligeiramente diferente — campos em linhas separadas; o parser
   precisa tolerar tanto inline quanto multilinha).
3. Inserir o objeto `MAHOU` gerado no lugar do placeholder da Etapa 2.

### 5.3 Pontos de atenção da fonte (já mapeados)
- **Formatação irregular:** Soldado/Monge/Bárbaro/Pastor/Caçador/Mago/Xamã usam tudo inline;
  **Bardo** e partes do Xamã quebram `Tipo:`, `Alvo:`, `Fórmula:` em linhas separadas. O parser
  deve ser robusto a ambos.
- **Efeitos sem fórmula:** muitas habilidades de Maré/Raiz/Sopro/Véu têm `Fórmula: —` (são
  utilitárias: controle/buff/debuff, sem dano direto). Render deve esconder o pill de fórmula
  quando `formula === null`.
- **Atributo por classe** vem de `Classes.md` (não está em cada nó): FOR (soldado, monge),
  VIG (barbaro, pastor), AGI (bardo, cacador), INT (mago, xama). A fórmula `1d4 + (FOR/3)` no
  texto deve casar com o `atkAttr` da classe — usar o `atkAttr` como fonte de verdade no cálculo.
- **`absorcao_total`** aparece (Mago) e é 1×/combate — garantir que o BUFF existe (§4.4).
- **Efeitos compostos / condicionais** ("se o alvo já tiver X", "1×/turno", "como Ação Livre"):
  manter como **texto** no campo `efeito`. Não tentar automatizar a lógica de combate — a ficha
  é uma referência de jogo, não um motor de regras.

**Saída da etapa:** objeto `MAHOU` com 160 habilidades validadas (8×20), render mostrando a
árvore completa por caminho ao escolher qualquer classe.

---

## 6. Etapa 4 — Wizard: mudanças de fluxo de telas
**Duas mudanças de UX pedidas, independentes entre si. Reaproveitar todo o markup/CSS existente —
nada de redesign.**

### 4.A — Foto junto à tela de Nome (Step 1)
Hoje a foto vive numa tela isolada (`screen-photo`, ~linha 1107) que aparece **depois** da revisão.
Passar o upload de avatar para **dentro do Step 1 (Nome)**.

1. No Step 1 (HTML ~923–929), inserir o bloco de foto **acima ou ao lado** do input de nome,
   reusando o markup/CSS já existentes: `.photo-circle-label`, `.photo-circle`, `#photo-input`,
   `.photo-placeholder`, `.photo-hint`. (Os estilos já estão no CSS, ~linhas 326–342.)
2. Manter a lógica de upload que já existe (`currentPhotoDataUrl`, handler do `#photo-input`).
   Só muda **onde** o bloco é exibido — a captura/preview continua idêntica.
3. **Remover `screen-photo` do fluxo:** em `gerarFicha()` (~1792), trocar
   `showScreen('screen-photo')` pelo encaminhamento à nova tela de habilidades (ver 4.B).
   A `<div id="screen-photo">` pode ser removida do DOM ou mantida oculta sem uso (preferir remover
   para não deixar código morto; conferir que nada mais chama `screen-photo`).
4. A foto continua **opcional**: se o usuário não escolher, usa o placeholder (já implementado no
   header da ficha via `.header-avatar-placeholder`).

> Resultado: o usuário define nome **e** foto na mesma primeira tela; a etapa de foto separada some.

### 4.B — Nova tela de habilidades, após a Revisão (Step 9) e antes da ficha
Hoje, ao confirmar o Step 9 (Revisão), o fluxo gera a ficha e vai direto para `screen-photo`/ficha.
Inserir entre a Revisão e a ficha uma **tela dedicada de escolha de habilidades** (pontos de caminho).

1. Criar uma nova `<div class="screen" id="screen-habilidades">` (irmã de `screen-form`/`screen-sheet`),
   exibida após a confirmação da Revisão.
2. Ajustar o fluxo:
   - Step 9 "Confirmar" → chama a montagem do personagem (atributos já resolvidos) e
     `showScreen('screen-habilidades')` **em vez de** ir à foto/ficha.
   - Dentro de `screen-habilidades`, botão "Concluir →" → `showScreen('screen-sheet')` com a
     ficha já refletindo as habilidades escolhidas. Botão "← Voltar" retorna ao Step 9.
3. Conteúdo da tela (usa o objeto `MAHOU` da Etapa 3 e o estado da Etapa 2):
   - Filtrar habilidades pela **classe** escolhida (`wzSel.classe`).
   - Agrupar visualmente por **caminho** (Chama/Marés/Raiz/Sopro/Véu), reusando os componentes
     `hab-group-header` / `hab-entry` (mesma linguagem visual da ficha).
   - Mostrar as 5 **bases** sempre selecionáveis; **aprimoramentos** bloqueados até a base
     pré-requisito ser marcada (respeitar `prereq`/`transicao`).
   - Contador "Pontos de caminho: X/Y restantes" (Y = pontos do nível; ver §8 Q3).
   - Impedir confirmar com pontos sobrando? **Não** — permitir concluir com pontos não gastos
     (jogador pode guardar / decidir depois); apenas avisar. (Confirmar preferência — §8 Q5.)
4. Gravar seleção em `wzSel.caminhos` → `currentChar.caminhos`; `renderHabilidades()` (Etapa 2)
   já consome esse array para montar a aba de habilidades da ficha.

### 4.C — Card de classe no wizard (Step 3)
Atualizar o card de classe (`renderWizardCards`, ~linha 2841): hoje mostra `hab.desc`/`hab2`
(modelo antigo por raça). Trocar por um **resumo dos 5 caminhos** da classe
(ex.: "Chama: pressão ofensiva · Marés: controle · Raiz: suporte · Sopro: debuff · Véu: reação"),
sem listar habilidades individuais — a escolha detalhada acontece na tela 4.B.

### 4.D — Reescolha por nível (pós-MVP)
Pontos de caminho são **trocáveis a cada descanso** e crescem com o nível. Mínimo viável: ao
mudar de nível na ficha, recalcular `pontosCaminho` e permitir reabrir a tela de habilidades.
Pode ficar para depois do MVP.

**Saída da etapa:** Step 1 com foto integrada; `screen-photo` removida do fluxo; nova
`screen-habilidades` entre Revisão e ficha; criação termina com caminhos escolhidos refletidos na ficha.

---

## 7. Etapa 5 — Validação e QA

1. **Conferência numérica** contra `Relatório de Validação Numérica.md` do vault (existe e é final).
2. **Checklist por classe (8×):** criar personagem, escolher 6 pontos, ver render correto por caminho.
3. **Checklist de efeitos:** todo ID citado em habilidade existe em `DEBUFFS` ou `BUFFS`.
   `grep` dos IDs canônicos vs. chaves dos objetos.
4. **Defesa/HP/Iniciativa:** validar derivados contra `Sistema de Combate.md` e `Sistema_Core.md`
   (Defesa = raça + classe + equip; HP = base + hpMin + 4×(nivel) … confirmar fórmula exata no
   vault e no código atual — não havia divergência aparente, mas conferir).
5. **Console limpo** em todos os fluxos; sem referências a `bruxo`, `habs[rId]`.
6. **Mobile:** o HTML tem viewport/safe-area; testar largura ~380px (o design já é mobile-first).

---

## 8. Perguntas a confirmar com o dono do sistema (bloqueadoras leves)

- **Q1 (raciais):** as habilidades raciais antigas (Fluxo Arcano etc.) permanecem na ficha ou
  saem? Não há fonte no vault atual. *Plano assume manter inalteradas.*
- **Q2 (atributos base):** vault diz "1d4 em cada atributo" no nível 1; o HTML usa pool/contagem
  de dados. Confirmar que a representação atual corresponde (provável que sim) — não alterar sem ok.
- **Q3 (pontos de caminho):** vault diz "6 pontos no nível 1, +2 por nível". Confirmar fórmula:
  é `6 + 2*(nivel-1)` (6 no nv1) ou `4 + 2*nivel` (6 no nv1)? As duas dão 6 no nível 1; divergem
  acima. *Plano usa a leitura literal: nível 1 = 6; cada nível +2.*
- **Q4 (Caçador/atributo da Maré):** algumas tabelas de caminho citam classes em sabores; confirmar
  que não há habilidade faltando para o Caçador (a fonte traz a árvore completa dele — ok).
- **Q5 (pontos sobrando):** na nova tela de habilidades, permitir concluir com pontos de caminho
  não gastos (apenas avisar) ou **bloquear** até gastar todos? *Plano assume permitir + aviso.*

---

## 9. Ordem de toque no arquivo (resumo p/ o executor)

| Etapa | Bloco do HTML | Linhas aprox. | Tipo de mudança |
|---|---|---|---|
| 1 | `const CLASSES` | 1429–1531 | corrigir classes, remover `habs`, remover bruxo, add caçador |
| 1 | refs a `bruxo` | global | limpar |
| 2 | novos `CAMINHOS`/`MAHOU`/`BUFFS` + `marcado` | junto aos data objects (~1429/1633) | criar |
| 2 | `renderHabilidades()` | 2159–2245 | reescrever (agrupar por caminho) |
| 2 | `gerarFicha()` / estado | 1756–1790 | gravar `caminhos`/`pontosCaminho` |
| 3 | `const MAHOU` | placeholder da Etapa 2 | preencher 160 habs via parser |
| 4.A | Step 1 Nome (HTML) + `screen-photo` | 923–929 / 1107 / 1792 | mover foto p/ Step 1; remover `screen-photo` do fluxo |
| 4.B | nova `screen-habilidades` + Step 9 (HTML/JS) | ~1078 / 1756–1792 / 2600 | nova tela entre Revisão e ficha |
| 4.C | render cards de classe | 2841–2855 | trocar resumo raça→caminhos |
| 5 | — | global | QA, grep, testes |

---

## 10. Definição de pronto (DoD)

- [ ] 8 classes do vault (com Caçador, sem Bruxo); defBase corretas.
- [ ] Habilidades vêm da **classe via caminhos**, não da raça.
- [ ] `MAHOU` com 160 habilidades (8×20) importadas e validadas.
- [ ] Foto integrada ao Step 1 (Nome); tela `screen-photo` removida do fluxo.
- [ ] Nova `screen-habilidades` entre a Revisão e a ficha; pontos de caminho gastos respeitando pré-requisitos.
- [ ] Todos os efeitos referenciam IDs canônicos existentes (DEBUFFS/BUFFS).
- [ ] Frontend (CSS/UI/wizard/derivados) **idêntico** ao original — nada de redesign.
- [ ] Console limpo; testado em mobile (~380px).

## Ver também
- Versão anterior deste plano: [[99 - Arquivo/PLANO_Migracao_Mahou_Ficha_D4|PLANO_Migracao_Mahou_Ficha_D4]]
- Estado atual: [[05 - Ficha D4/fase11_src/PROGRESSO|PROGRESSO fase 11]] · [[01 - Planos/P2 - Ficha|P2 Ficha]]
