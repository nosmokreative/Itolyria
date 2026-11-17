# Dados (`dados.js`)

| Objeto | Qtde | Chave / campos |
|---|---|---|
| `RACAS` | 4 | `nome, defesa, hpMin, pontosRaca, attrRaca, hpNivel, danoBonus, sofre, narrativa, frase, habRacial` |
| `CLASSES` | 8 | `nome, atkAttr, defBase, somaNivel` |
| `HISTORICOS` | 5 | origem (onde cresceu) |
| `IDADES` | 3 | fase da vida |
| `ASSOCIACOES` | 5 | lealdade |
| `ESTILOS` | 5 | estilo |
| `MOTIVACOES` | 10 | o que move |
| `PONTOS_FRACOS` | 5 | problema |
| `PERICIAS` | 10 | `nome, a, b, ex` (dois atributos) |
| `DEBUFFS` | 17 | `nome, tipo, efeito, dur, attrs` |
| `BUFFS` | 10 | idem |
| `CAMINHOS` | 5 | `nome, verbo, cor` |
| `MAHOU` | 200 | habilidades (25 por classe) |
| `EQUIPAMENTOS` | 11 | `nome, tipo, slots, dano, defesa, hp, ataque` |

## Raças

| ID | Defesa | Vida inicial | Atributo | Bônus racial contra |
|---|---|---|---|---|
| `elfo` | 1 | 5 | INT | demônio |
| `humano` | 1 | 5 | VONT | anão |
| `anao` | 2 | 5 | VIG | elfo |
| `demonio` | 1 | 5 | FOR | humano |

## Classes

| ID | Ataque | Defesa base |
|---|---|---|
| `soldado` | FOR | 2 |
| `monge` | FOR | 1 |
| `pastor` | VIG | 1 |
| `barbaro` | VIG | 2 |
| `bardo` | AGI | 1 |
| `cacador` | AGI | 1 |
| `mago` | INT | 1 |
| `xama` | INT | 1 |

## Caminhos

| ID | Nome exibido | Verbo |
|---|---|---|
| `chama` | Chama/Akauger | amplificar |
| `mares` | Marés/Nagamerer/Nagaflu | controlar posição |
| `raiz` | Raiz/Okiberger/Okiberga | sustentar |
| `sopro` | Sopro/Aralufer/Aralufa | desestabilizar |
| `veu` | Véu/Kashiwir/Kashitiefer/Makosetz | inverter |

## Habilidade (`MAHOU[n]`)

```js
{
  id: 'soldado_pressao_marcial',
  nome: 'Pressão Marcial',
  classe: 'soldado',
  caminho: 'chama',
  tipo: 'base' | 'aprimoramento',
  transicao: null | { de: 'chama', para: 'mares' },
  prereq: null | 'Pressão Marcial',
  alvo: 'Alvo' | 'Si' | 'Si/Alvo',
  formula: '1d4 + (FOR/3)' | null,
  efeito: 'Texto com `id_de_buff_ou_debuff`.',
  recarga: '3 turnos',          // exibido como "3 rodadas"
  sabor: 'Texto narrativo.',
  efeitos: ['bonus_ataque'],
}
```

Por classe: 5 bases (1 por caminho) + 20 aprimoramentos (transição para os outros 4 caminhos).
Texto do efeito: `` `id` `` vira o nome legível via `efeitoTxt`.

## Condições

- **Debuffs:** enraizado, lentidao, amedrontado, enfraquecido, desorientado, vulneravel, exausto, inconsciente, surpreso, bloqueado, marcado, envenenado, caido, cego, agarrado, queimando, invisivel.
- **Buffs:** bonus_ataque, bonus_dano, bonus_for, bonus_teste, bonus_defesa, regeneracao, reducao_dano, absorcao_total, reacao_espera (removido da árvore), ataque_extra.

## Pendências de dados

- `recarga: '3 turnos'` e `(1 turno)` nos 200 nós: conversão só na exibição. Texto definitivo depende do P5 — Habilidades.
- `danoBonus: 3` em `RACAS` sem uso (bônus vem do nível).
