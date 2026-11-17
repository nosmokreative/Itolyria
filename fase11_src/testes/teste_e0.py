#!/usr/bin/env python3
"""teste_e0.py — E0 da fase 11: módulos, montagem, tokens, navegação, tema noite.

Uso: python teste_e0.py <fase10.html> <validar_ficha.py> <_Compendio_Mecanico.md>
Saída: uma linha OK/FALHA por checagem; código 1 se houver falha.
Capturas: testes/capturas/e0_*.png
"""
import re, subprocess, sys, json
from pathlib import Path

SRC = Path(__file__).resolve().parents[1]          # fase11_src/
OUT = SRC.parent / 'ficha_d4_fase11.html'
F10, VALID, COMP = map(Path, sys.argv[1:4])
CAPT = SRC / 'testes' / 'capturas'; CAPT.mkdir(exist_ok=True)
falhas = 0

def check(nome, ok, det=''):
    global falhas
    falhas += 0 if ok else 1
    print(f"{'OK   ' if ok else 'FALHA'} {nome}" + (f" — {det}" if det else ''))
    return ok

# 1. Extração idêntica à fase 10 (corpo após a linha de cabeçalho)
f10 = F10.read_text(encoding='utf8').split('\n')
for mod in ('dados.js', 'calculo.js'):
    p = SRC / mod
    if not check(f'{mod} existe', p.exists()): continue
    linhas = p.read_text(encoding='utf8').rstrip('\n').split('\n')
    trechos = re.findall(r'^// @fase10 (\d+)-(\d+)$', '\n'.join(linhas), re.M)
    esperado = []
    for a, b in trechos: esperado += f10[int(a) - 1:int(b)]
    # E9 (autor): Enraizado de habilidade = 1 turno (era 1d4 nas 11); Corrente Espiritual com teste >6 = 2 turnos.
    esperado = [l.replace('`enraizado` (1d4 turnos)', '`enraizado` (1 turno)').replace('Teste >6: duração 1d4+2.', 'Teste >6: duração 2 turnos.').replace('Aliado adjacente: duração 1d4.', 'Aliado adjacente: duração 2 turnos.') for l in esperado]
    # E17 (autor, 13/11): Mercantes +1 AGI para todas as classes — some a exceção Bardo/VONT da fase 10.
    _j = '\n'.join(esperado).replace(" attrBardo:'AGI', attrDemais:'VONT',", '').replace(' // Bardo: AGI, demais: VONT', '  // E17: +1 AGI para todas as classes (canon)')
    _j = _j.replace("""    let attrAssoc = assoc.attr;
    if (assocId === 'merc') {
      attrAssoc = (cId === 'bardo') ? assoc.attrBardo : assoc.attrDemais;
    }
    base[attrAssoc] += assoc.bonus;""", '    base[assoc.attr] += assoc.bonus;   // E17: Mercantes +1 AGI para todos (canon)')
    esperado = _j.split('\n')
    corpo = [l for l in linhas if not l.startswith('// @fase10 ') and not l.startswith('// @gerado')]
    # E3: campos narrativa/frase acrescentados aos dados da criação; o resto segue idêntico à fase 10.
    T = r"narrativa:'(?:[^'\\\\]|\\\\.)*', frase:'(?:[^'\\\\]|\\\\.)*'"
    corpo = [re.sub(' ' + T + ',', '', re.sub(', ' + T + '(?= })', '', l)) for l in corpo]
    check(f'{mod} idêntico às linhas da fase 10', trechos and corpo == esperado,
          f'{len(trechos)} trechos, {len(corpo)} linhas')

_d = (SRC / 'dados.js').read_text(encoding='utf8')
check('E17: Mercantes sem exceção de classe', 'attrBardo' not in _d and 'attrDemais' not in _d)
check('E9: nenhum Enraizado de 1d4 turnos', '1d4 turnos' not in _d and 'duração 1d4.' not in _d)

# 2. Montagem
r = subprocess.run([sys.executable, str(SRC / 'montar_ficha.py')], capture_output=True, text=True)
check('montar_ficha.py roda', r.returncode == 0 and OUT.exists(), (r.stdout + r.stderr).strip()[-200:])
if not OUT.exists():
    print(f'\n{falhas} falha(s).'); sys.exit(1)
H = OUT.read_text(encoding='utf8')
check('sem placeholder sobrando', '/*@' not in H and '<!--@' not in H)
js = re.findall(r'<script>(.*?)</script>', H, re.S)
check('um único <script>', len(js) == 1, str(len(js)))
Path('/tmp/f11.js').write_text(js[0] if js else '', encoding='utf8')
r = subprocess.run(['node', '-e', "new Function(require('fs').readFileSync('/tmp/f11.js','utf8'))"],
                   capture_output=True, text=True)
check('sintaxe JS (new Function)', r.returncode == 0, r.stderr.strip()[:200])

# 3. Validador do livro
r = subprocess.run([sys.executable, '-I', str(VALID), str(OUT), str(COMP)], capture_output=True, text=True)
check('validar_ficha.py 0 falhas', r.returncode == 0, r.stdout.strip().split('\n')[-1])

# 4. Tokens do protótipo no CSS
css = (SRC / 'estilo.css').read_text(encoding='utf8') if (SRC / 'estilo.css').exists() else ''
for t in ('#F3ECDD', '#FBF7EF', '#2A231D', '#5A524A', '#D9CFB8', '#8B2E10', '#F1DDD1', '#DDB9A6',
          '#8A6A1A', '#6A1A1A', '#4E7D5B', '#DCE7D5', '#B0401C', '#2F5D8A', '#3F6B3A', '#5F5853',
          '#7E5F12', '#1E1A16', '#2A241E', '#EDE3D0'):
    check(f'token {t}', t.lower() in css.lower())

# 5. Navegador
from playwright.sync_api import sync_playwright
url = OUT.as_uri()
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for w, h in ((390, 844), (1440, 900)):
        ctx = b.new_context(viewport={'width': w, 'height': h})
        pg = ctx.new_page(); erros = []
        _clique = pg.click   # E18: como o jogador, fecha o popup de dado (Esc) antes de clicar
        pg.click = lambda *a, **k: (pg.keyboard.press('Escape'), _clique(*a, **k))[1]
        pg.on('console', lambda m: m.type == 'error' and erros.append(m.text))
        pg.on('pageerror', lambda e: erros.append(str(e)))
        pg.goto(url); pg.wait_for_timeout(300)
        ativa = lambda: pg.evaluate("document.querySelector('.tela.ativa')?.id")
        check(f'{w}px: sem personagem abre Criação', ativa() == 'tela-criacao', str(ativa()))
        pg.screenshot(path=str(CAPT / f'e0_{w}_criacao.png'))
        pg.evaluate("usarNovoPersonagem(personagemExemplo()); irPara('ficha')"); pg.wait_for_timeout(150)
        check(f'{w}px: exemplo abre Ficha', ativa() == 'tela-ficha', str(ativa()))
        lh = pg.evaluate("document.getElementById('ficha-linha').getBoundingClientRect().height")
        check(f'{w}px: linha do personagem sem quebra', lh < 24, str(lh))
        check(f'{w}px: Ficha mostra nome e linha', 'Ilwen' in pg.inner_text('#tela-ficha')
              and 'Elfo mago, nível 1' in pg.inner_text('#tela-ficha'))
        ch = pg.evaluate("currentChar && [currentChar.attrs.INT, currentChar.hpMax, currentChar.defesa, currentChar.caminhos.length]")
        check(f'{w}px: exemplo calculado pela fase 10', ch == [4, 5, 2, 5], str(ch))
        pg.screenshot(path=str(CAPT / f'e0_{w}_ficha.png'))
        pg.click('#btn-entrar-combate'); pg.wait_for_timeout(150)
        check(f'{w}px: Entrar em combate', ativa() == 'tela-combate', str(ativa()))
        check(f'{w}px: Combate mostra turno e nome', 'Rodada 1' in pg.inner_text('#tela-combate')
              and 'Ilwen' in pg.inner_text('#tela-combate'))
        pg.screenshot(path=str(CAPT / f'e0_{w}_combate.png'))
        pg.click('#btn-sair-combate'); pg.click('[data-c=sairOk]'); pg.wait_for_timeout(150)  # E1: saída pede confirmação
        check(f'{w}px: Sair do combate', ativa() == 'tela-ficha', str(ativa()))
        pg.click('#btn-personagens'); pg.click('.folha [data-tema-rotulo]'); pg.click('.folha button[data-fechar]'); pg.wait_for_timeout(100)
        tema = lambda: pg.evaluate("document.documentElement.dataset.tema")
        fundo = lambda: pg.evaluate("getComputedStyle(document.body).backgroundColor")
        check(f'{w}px: tema noite liga', tema() == 'noite' and fundo() == 'rgb(30, 26, 22)', f'{tema()} {fundo()}')
        pg.screenshot(path=str(CAPT / f'e0_{w}_ficha_noite.png'))
        pg.reload(); pg.wait_for_timeout(300)
        check(f'{w}px: recarregar mantém tema e personagem', tema() == 'noite' and ativa() == 'tela-ficha',
              f'{tema()} {ativa()}')
        pg.click('#btn-personagens'); pg.click('.folha [data-tema-rotulo]'); pg.click('.folha button[data-fechar]'); pg.wait_for_timeout(100)
        check(f'{w}px: tema dia volta', tema() == 'dia' and fundo() == 'rgb(243, 236, 221)', f'{tema()} {fundo()}')
        saves = pg.evaluate("Object.keys(JSON.parse(localStorage.getItem('d4_chars')||'{}'))")
        check(f'{w}px: salvo em d4_chars', saves == ['Ilwen'], str(saves))
        alvos = pg.evaluate("""[...document.querySelectorAll('.tela.ativa button, .tela.ativa a')]
            .filter(e => e.offsetParent).map(e => [e.id || e.className, Math.round(e.getBoundingClientRect().height)])
            .filter(([_, h]) => h < 44)""")
        check(f'{w}px: toque mínimo 44px', not alvos, str(alvos))
        check(f'{w}px: console limpo', not erros, str(erros[:3]))
        ctx.close()
    b.close()

print(f'\n{falhas} falha(s).')
sys.exit(1 if falhas else 0)
