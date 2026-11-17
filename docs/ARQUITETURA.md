# Arquitetura

## Build

`montar_ficha.py` lê `shell.html` e substitui 3 placeholders (cada um deve ocorrer exatamente 1 vez):

| Placeholder | Conteúdo |
|---|---|
| `/*@CSS*/` | `estilo.css` |
| `/*@JS*/` | módulos JS concatenados, na ordem abaixo |
| `<!--@VERSAO-->` | `fase11 AAAA-MM-DD <sha1[:10]>` em `<meta name="gerador">` |

Ordem dos módulos: `dados.js` → `calculo.js` → `app.js` → `ui-dado.js` → `ui-criacao.js` → `ui-ficha.js` → `ui-combate.js`.

Falha se faltar módulo, se um placeholder não for único ou se o JS contiver `</script`.
Mesmo conteúdo → mesmo selo (build reproduzível).

## Módulos

| Arquivo | Papel |
|---|---|
| `dados.js` | Objetos de dados (gerado da fase 10, `@fase10 1861-2262`). Só muda por decisão do P1 — Sistema. |
| `calculo.js` | `esc`, `efeitoTxt`, estado global, `calcEquipBonuses`, `calcAttrs`, `calcHP`, `calcDefesa`, `calcVontMax`, `danoFormula`. |
| `app.js` | `montarPersonagem`, `calcAttrsV15`, `bonusRacial`, `nomeCaminho`, salvar/carregar, `irPara`, layout duplo, atalhos, tema. |
| `ui-dado.js` | Popup de dado: total no centro, mín/máx, linhas de dado e bônus, animação. Só exibe. |
| `ui-criacao.js` | 4 etapas (Quem é · Origem · Personalidade · Ofício), interlúdios, crônica. |
| `ui-ficha.js` | Abas Ficha · Habilidades · Itens · Notas; pentagrama; subir de nível; `efeitoRodadas`, `recargaRodadas`. |
| `ui-combate.js` | `turnoState`, rodadas, ações, condições (`COND_NA_HORA`, `durBase`), queda/morte, desfazer, registro. |

## Estado global

Definido em `calculo.js` / `app.js` (nomes mantidos da fase 10):

| Variável | Conteúdo |
|---|---|
| `currentChar` | personagem (raça, classe, atributos, nível, habilidades…) |
| `currentHp`, `currentVont` | Vida e Vontade atuais |
| `conditions`, `condDados` | ids das condições ativas; duração/rodada de início |
| `salvacaoUsada`, `morteState` | Salvação Garantida; testes de morte `{suc, meio}` |
| `inventario` | 9 slots `{ itemKey }` ou `null` |
| `moedas` | moedas (kit inicial: 15) |
| `turnoState` | sessão de combate (rodada, iniciativa, recargas, log) |

## Persistência (`localStorage`)

| Chave | Valor |
|---|---|
| `d4_chars` | `{ [nome]: { char, hp, vont, conditions, condDados, salvacaoUsada, morteState, inventario, photo, notas, moedas } }` |
| `d4_em_uso` | nome do personagem aberto |
| `d4_sessao_turno` | `turnoState` da sessão de combate |
| `d4_tema` | `dia` \| `noite` |

Formato compatível com saves da fase 10 (campos novos têm padrão).

## Telas e layout

- `TELAS`: `criacao` (`#tela-criacao`), `ficha` (`#tela-ficha`), `combate` (`#tela-combate`); troca por `irPara(tela)`.
- `≥ 1024 px`: ficha e combate lado a lado; painel sem foco esmaecido.
- `< 1024 px`: uma tela por vez.
- Combate na ficha: edição de habilidades travada enquanto houver sessão.

## Atalhos (combate)

| Tecla | Ação |
|---|---|
| `R` | rolar (morte, iniciativa ou ação visível) |
| `Enter` | executar ação |
| `E` | encerrar turno |

Ignorados com Ctrl/Meta/Alt ou foco em campo de texto.

## Convenções

- IDs da tela de combate: prefixo `t-`.
- Raciais: `habRacial`, `habRacial.ofensiva`.
- Habilidades de classe: buscar em `MAHOU`, não em `c.habs`.
- Nomes de caminho exibidos na forma sinalizada (`CAMINHO_SINAL`); IDs internos intactos.
- Acessibilidade: anúncios em `#cr-anuncio` (`aria-live`).
