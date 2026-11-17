#!/usr/bin/env python3
"""extrair_fase10.py — gera dados.js e calculo.js copiando trechos da fase 10, sem redigitar.

Uso (uma vez, na E0): python extrair_fase10.py <ficha_d4_fase10_compendio.html>
Cada trecho é localizado por marcadores de início e fim que precisam ocorrer exatamente 1 vez.
Cada trecho recebe uma linha "// @fase10 A-B" com as linhas de origem (o teste da E0 confere).
"""
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent
L = Path(sys.argv[1]).read_text(encoding='utf8').split('\n')

def linha(marca):
    hits = [i for i, l in enumerate(L) if l.startswith(marca)]
    if len(hits) != 1:
        sys.exit(f'marcador {marca!r}: {len(hits)} ocorrências (esperado 1)')
    return hits[0]

def trecho(a, b):
    """Linhas 1-indexadas [a, b], sem linhas vazias no fim."""
    while not L[b - 1].strip(): b -= 1
    return a, b

def escrever(nome, titulo, partes):
    out = [f'// @gerado por extrair_fase10.py — {titulo}']
    for a, b in partes:
        out.append(f'// @fase10 {a}-{b}')
        out += L[a - 1:b]
    (SRC / nome).write_text('\n'.join(out) + '\n', encoding='utf8')
    print(f'{nome}: {sum(b - a + 1 for a, b in partes)} linhas de {len(partes)} trecho(s)')

# dados.js — RACAS … EQUIPAMENTOS (inclui MAHOU, DEBUFFS, BUFFS, CAMINHOS)
# Réguas "// ═══" ficam 1 linha acima de cada título de seção.
r = lambda marca: linha(marca)                 # índice 0 do título = nº 1-indexado da régua acima

# dados.js — RACAS … EQUIPAMENTOS (inclui MAHOU, DEBUFFS, BUFFS, CAMINHOS)
escrever('dados.js', 'objetos de dados da fase 10',
         [trecho(r('// DATA — RAÇAS'), r('// STATE') - 1)])

# calculo.js — esc + efeitoTxt, STATE, CALC (equipamento, atributos, HP, Defesa, Vontade, dano)
escrever('calculo.js', 'utilitários, estado e cálculos da fase 10', [
    trecho(linha('function esc(') + 1, linha('function showToast(')),
    trecho(linha('const ATTRS = ') + 1, linha('let inventario = ') + 1),
    trecho(r('// CALC — Bônus de equipamento'), r('// GERAR FICHA') - 1),
])
