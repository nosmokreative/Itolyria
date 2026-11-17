# Regras implementadas

Fonte: Compêndio v1.15 (D63–D85) e decisões do autor. A ficha implementa; não cria regra.

## Criação (E16, REG-CRIA-01)

- Atributos: base 1d4 cada; raça +1 fixo; idade +1d4; Ponto Fraco −1d4; piso 1.
- Mercantes: +1 AGI para todas as classes (E17).
- Dados rolam uma vez; voltar de etapa não rola de novo.
- Nível inicial 1; pontos de caminho `4 + 2 × nível` (6 no nível 1).
- Kit: armadura leve (+1 Defesa), 15 moedas.

## Derivados

| Valor | Fórmula |
|---|---|
| Vida | `hpMin` da raça (5); subir de nível: +3 +4 +1d4 |
| Defesa | raça + classe + equipamento |
| Vontade máx. | nível + 1 |
| Dano básico | `1d4 + ⌊atributo de ataque / 3⌋` |
| Nível máximo | 5 |

## Testes

| Teste | Dado |
|---|---|
| Atributo | 1d4 + atributo |
| Perícia | 1d8 + valor; 8 natural = sucesso automático |
| Iniciativa | 1d8 |
| Ataque | 1d4: 1–2 erra · 3 acerta · 4 crítico |

O jogador não vê a Defesa do alvo; o mestre julga e subtrai.

## Rodadas e duração (E13, E14)

- Batalha em rodadas; contador "Rodada N".
- Efeito no alvo vale a partir da rodada seguinte.
- Na hora: cura, dano, Enraizado, Agarrado, Caído, Exausto, Bloqueado, Inconsciente.
- Duração padrão: 1d4 rodadas, rolada ao aplicar ("1 turno", "2 turnos", "1d4+1" viram 1d4).
- Mesma condição repetida soma rodadas, sem limite.
- Defesa bem-sucedida corta à metade o que resta.
- Surpreso: perde 1 turno inteiro, sem 1d4.
- Envenenado / Queimando: 1d4.
- Buff de consumo: até usar ou fim do 1d4.
- Bônus de "próximo ataque/dano": vale no próximo uso.
- Recarga: 3 rodadas, conta sempre ("volta na rodada R+3").
- Campo de duração manual: 1d4 × multiplicador; valor digitado = valor do mestre.

## Bônus racial (E15)

+1 de dano por nível contra a raça que sofre, somado depois da Defesa, em ataque e habilidade.

## Queda e morte (E15)

- Vida 0 em combate = caído.
- 1d4 por turno: 1–2 falha · 3 sucesso · 4 revive.
- 2 sucessos levantam; 2 falhas matam.
- Ajuda de aliado = sucesso. Atingido caído = falha.
- Salvação Garantida por botão no popup de queda.

## Habilidades

- Troca livre fora de combate; travada em combate.
- Aprimoramento exige a base do próprio caminho; remover base remove seus aprimoramentos.
- Com fórmula: rola ataque e gasta Ação. Sem fórmula: Ação Livre.
- Buffs vão para o personagem; debuffs aparecem como aviso ao mestre.
