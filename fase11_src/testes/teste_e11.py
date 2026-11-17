#!/usr/bin/env python3
"""teste_e11.py — E11 da fase 11: subir de nível na ficha.

Uso: python teste_e11.py
Regras (autor): cada nível = +3 raça +4 classe +1d4 rolado pelo jogador; nível máximo 5.
Também: atributo de ataque +3, Vontade máx +1, +2 pontos de caminho; travado em combate; dado rola uma vez.
"""
import re, subprocess, sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[1]
OUT = SRC.parent / 'ficha_d4_fase11.html'
CAPT = SRC / 'testes' / 'capturas'; CAPT.mkdir(exist_ok=True)
falhas = 0

def check(nome, ok, det=''):
    global falhas
    falhas += 0 if ok else 1
    print(f"{'OK   ' if ok else 'FALHA'} {nome}" + (f" — {det}" if det else ''))

r = subprocess.run([sys.executable, str(SRC / 'montar_ficha.py')], capture_output=True, text=True)
check('montar_ficha.py roda', r.returncode == 0, (r.stdout + r.stderr).strip()[-200:])
js = re.findall(r'<script>(.*?)</script>', OUT.read_text(encoding='utf8'), re.S)[0]
Path('/tmp/f11e11.js').write_text(js, encoding='utf8')
r = subprocess.run(['node', '-e', "new Function(require('fs').readFileSync('/tmp/f11e11.js','utf8'))"], capture_output=True, text=True)
check('sintaxe JS', r.returncode == 0, r.stderr[:200])

from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for w, h in ((390, 844), (1440, 900)):
        pg = b.new_context(viewport={'width': w, 'height': h}).new_page(); erros = []
        _clique = pg.click   # E18: como o jogador, fecha o popup de dado (Esc) antes de clicar
        pg.click = lambda *a, **k: (pg.keyboard.press('Escape'), _clique(*a, **k))[1]
        pg.on('console', lambda m: m.type == 'error' and erros.append(m.text))
        pg.on('pageerror', lambda e: erros.append(str(e)))
        pg.goto(OUT.as_uri()); pg.wait_for_timeout(200)
        ev = pg.evaluate
        dado = lambda v: ev(f"Math.random = () => ({v} - 0.5) / 4")
        clk = lambda sel: (pg.click(sel), pg.wait_for_timeout(40))
        folha = lambda: pg.inner_text('#folhas') if pg.locator('#folhas .folha').count() else ''
        P = f'{w}px:'
        ev("""(() => { usarNovoPersonagem(montarPersonagem({ nome: 'Nv', rId: 'anao', cId: 'soldado', hId: 'sabio',
            assocId: 'none', nivel: 1, rolls: { raca: 1, idade: 1, pf: 1 },
            caminhos: MAHOU.filter(h => h.classe === 'soldado' && h.tipo === 'base').map(h => h.id) })); irPara('ficha'); })()""")
        if w < 1024: clk('[data-f=aba][data-v=ficha]')
        ch0 = ev("({ hp: currentChar.hpMax, cur: currentHp, FOR: currentChar.attrs.FOR, vm: currentChar.vontMax, v: currentVont, pts: currentChar.pontosCaminho })")
        check(f'{P} seção Nível 1 de 5', 'Nível 1 de 5' in pg.inner_text('#tela-ficha') and pg.locator('[data-f=nivel]').count() == 1)

        # Travado em combate
        clk('#btn-entrar-combate')
        if w >= 1024: check(f'{P} em combate: botão desabilitado', pg.locator('#tela-ficha [data-f=nivel]').is_disabled())
        clk('#btn-sair-combate'); clk('[data-c=sairOk]')
        if w < 1024: clk('[data-f=aba][data-v=ficha]')
        check(f'{P} fora do combate: botão ativo', not pg.locator('[data-f=nivel]').is_disabled())

        clk('[data-f=nivel]')
        t = folha()
        check(f'{P} popup: 3 raça + 4 classe + 1d4', 'Subir de nível' in t and '3 raça + 4 classe + 1d4' in t and 'Nível 1 → 2' in t, t[:200])
        check(f'{P} popup: FOR +3, Vontade, pontos', '+3 FOR' in t and f"{ch0['vm']} → 3" in t and f"{ch0['pts']} → 8" in t, t)
        check(f'{P} confirmar travado sem dado', pg.locator('[data-f=confirmarNivel]').is_disabled())
        dado(2); clk('[data-f=rolarNivel]')
        t = folha()
        check(f'{P} dado 2 → +9', '+9' in t and '1d4[2]' in t and f"{ch0['hp']} → {ch0['hp'] + 9}" in t, t)
        check(f'{P} rola uma vez', pg.locator('[data-f=rolarNivel]').count() == 0)
        # Fechar e reabrir mantém o dado (salvo)
        clk('#folhas [data-f=fechar]'); clk('[data-f=nivel]')
        check(f'{P} reabrir mantém o dado', '1d4[2]' in folha() and ev("lerSaves()['Nv'].char.dadoNivel") == 2)
        pg.screenshot(path=str(CAPT / f'e11_{w}_popup.png'))
        clk('[data-f=confirmarNivel]')
        ch1 = ev("({ n: currentChar.nivel, hp: currentChar.hpMax, cur: currentHp, FOR: currentChar.attrs.FOR, vm: currentChar.vontMax, v: currentVont, pts: currentChar.pontosCaminho, dv: currentChar.dadosVida, dn: currentChar.dadoNivel })")
        check(f'{P} nível 2', ch1['n'] == 2 and 'nível 2' in pg.inner_text('#ficha-linha'))
        check(f'{P} vida máx e atual +9', ch1['hp'] == ch0['hp'] + 9 and ch1['cur'] == ch0['cur'] + 9, str(ch1))
        check(f'{P} FOR +3, Vontade +1, pontos 8', ch1['FOR'] == ch0['FOR'] + 3 and ch1['vm'] == 3 and ch1['v'] == ch0['v'] + 1 and ch1['pts'] == 8, str(ch1))
        check(f'{P} dado guardado, pendente limpo', ch1['dv'] == [2] and ch1['dn'] is None)
        check(f'{P} abre Habilidades em Editar', ev("fichaUi.editando") is True and '5 de 8 pontos' in pg.inner_text('#tela-ficha'))
        check(f'{P} salvo', ev("lerSaves()['Nv'].char.nivel") == 2 and ev("lerSaves()['Nv'].char.hpMax") == ch1['hp'])

        # Até o 5: botão some
        for d in (1, 4, 3):
            if w < 1024: clk('[data-f=aba][data-v=ficha]')
            clk('[data-f=nivel]'); dado(d); clk('[data-f=rolarNivel]'); clk('[data-f=confirmarNivel]')
        if w < 1024: clk('[data-f=aba][data-v=ficha]')
        check(f'{P} nível 5: máximo', ev("currentChar.nivel") == 5 and pg.locator('[data-f=nivel]').count() == 0 and 'Nível máximo.' in pg.inner_text('#tela-ficha'))
        check(f'{P} vida 5 + 4×7 + (2+1+4+3)', ev("currentChar.hpMax") == 5 + 28 + 10, str(ev("currentChar.hpMax")))
        check(f'{P} podeSubir falso no 5', ev("podeSubir()") is False)
        pg.screenshot(path=str(CAPT / f'e11_{w}_nivel5.png'), full_page=w < 1024)
        check(f'{P} sem erros no console', not erros, '; '.join(erros[:3]))
    b.close()

print(f'\n{falhas} falha(s).')
sys.exit(1 if falhas else 0)
