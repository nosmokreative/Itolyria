#!/usr/bin/env python3
"""montar_ficha.py — junta os módulos de fase11_src/ em ../ficha_d4_fase11.html.

Uso: python montar_ficha.py [saída.html]
O HTML gerado nunca é editado à mão: edite os módulos e monte de novo.
Falha se um placeholder do shell não ocorrer exatamente 1 vez ou se faltar módulo.
"""
import sys, hashlib, datetime
from pathlib import Path

SRC = Path(__file__).resolve().parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else SRC.parent / 'ficha_d4_fase11.html'
JS = ['dados.js', 'calculo.js', 'app.js', 'ui-dado.js', 'ui-criacao.js', 'ui-ficha.js', 'ui-combate.js']

def ler(nome):
    p = SRC / nome
    if not p.exists(): sys.exit(f'falta o módulo {nome}')
    return p.read_text(encoding='utf8').rstrip('\n')

def trocar(txt, marca, valor):
    n = txt.count(marca)
    if n != 1: sys.exit(f'placeholder {marca}: {n} ocorrências (esperado 1)')
    return txt.replace(marca, valor)

css = ler('estilo.css')
js = '\n\n'.join(f'// ▓▓▓▓ {m} ▓▓▓▓\n' + ler(m) for m in JS)
if '</script' in js.lower(): sys.exit('"</script" dentro do JS quebraria o HTML')
html = ler('shell.html')
html = trocar(html, '/*@CSS*/', css)
html = trocar(html, '/*@JS*/', js)
selo = hashlib.sha1((css + js).encode('utf8')).hexdigest()[:10]
html = trocar(html, '<!--@VERSAO-->', f'fase11 {datetime.date.today().isoformat()} {selo}')
OUT.write_text(html + '\n', encoding='utf8')
print(f'{OUT.name}: {len(html.splitlines())} linhas, {len(html.encode("utf8")) // 1024} KB, selo {selo}')
