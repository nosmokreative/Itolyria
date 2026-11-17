#!/usr/bin/env python3
"""teste_e14.py — E14 da fase 11: campo de duração (P2 passo 2) e recarga em rodadas (P2 passo 4, D78).

Uso: python teste_e14.py [validar_ficha.py] [_Compendio_Mecanico.md]   (argumentos ignorados)
Regras conferidas:
- folha Adicionar tem 1d4 × multiplicador, Rolar e resultado; resultado digitado (mestre) vira a duração;
- Rolar com multiplicador N rola N × 1d4 e mostra o resultado; vazio com 1 = a ficha rola 1d4;
- recarga: usou na rodada R, volta na rodada R+3, conta mesmo com turno perdido; texto dos nós em rodadas.
"""
import re, subprocess, sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[1]
OUT = SRC.parent / 'ficha_d4_fase11.html'
falhas = 0

def check(nome, ok, det=''):
    global falhas
    falhas += 0 if ok else 1
    print(f"{'OK   ' if ok else 'FALHA'} {nome}" + (f" — {det}" if det and not ok else ''))

r = subprocess.run([sys.executable, str(SRC / 'montar_ficha.py')], capture_output=True, text=True)
check('montar_ficha.py roda', r.returncode == 0, (r.stdout + r.stderr).strip()[-200:])

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
        txt = lambda: pg.inner_text('#tela-combate')
        clk = lambda sel: (pg.click(sel), pg.wait_for_timeout(40))
        cond = lambda cid: ev(f"(turnoState.conds.find(c => c.id === '{cid}') || null)")
        P = f'{w}px:'
        ev("""(() => { localStorage.removeItem('d4_sessao_turno'); turnoState = null;
            usarNovoPersonagem(montarPersonagem({ nome: 'Dur', rId: 'elfo', cId: 'mago', hId: 'sabio', assocId: 'none', nivel: 1,
            rolls: { raca: 1, idade: 1, pf: 1 }, caminhos: MAHOU.filter(h => h.classe === 'mago' && h.tipo === 'base').map(h => h.id) })); irPara('ficha'); })()""")
        pg.click('#btn-entrar-combate'); pg.wait_for_timeout(80)

        # ── Campo de duração ──
        clk('[data-c=abrirCond]')
        f = pg.inner_text('#folhas')
        check(f'{P} folha tem 1d4 ×, multiplicador, Rolar e resultado', '1d4 ×' in f and pg.locator('#cb-dur-mult').count() == 1
              and pg.locator('#cb-dur-res').count() == 1 and pg.locator('[data-c=rolarDur]').count() == 1)
        pg.fill('#cb-dur-res', '3'); clk('[data-c=addCond][data-v=lentidao]')
        c = cond('lentidao')
        check(f'{P} resultado do mestre vira a duração', c and c['dur'] == 3 and c['rol'] == ['mestre 3'] and 'mestre 3' in txt(), str(c))
        clk('[data-c=abrirCond]')
        check(f'{P} resultado limpa após aplicar', pg.input_value('#cb-dur-res') == '')
        pg.fill('#cb-dur-mult', '2'); dado(3); clk('[data-c=rolarDur]')
        check(f'{P} Rolar 2 × 1d4 = 6 no resultado', pg.input_value('#cb-dur-res') == '6' and '2d4[3+3]' in pg.inner_text('#folhas'))
        clk('[data-c=addCond][data-v=vulneravel]')
        c = cond('vulneravel')
        check(f'{P} duração rolada no campo aplicada', c['dur'] == 6 and c['rol'] == ['2d4[3+3]'], str(c))
        clk('[data-c=abrirCond]')
        check(f'{P} multiplicador fica lembrado', pg.input_value('#cb-dur-mult') == '2')
        pg.fill('#cb-dur-mult', '1'); dado(2); clk('[data-c=addCond][data-v=marcado]')
        c = cond('marcado')
        check(f'{P} campo vazio com 1: a ficha rola 1d4', c['dur'] == 2 and c['rol'] == [2], str(c))
        clk('[data-c=abrirCond]'); pg.fill('#cb-dur-res', '1'); clk('[data-c=addCond][data-v=lentidao]')
        c = cond('lentidao')
        check(f'{P} campo soma na mesma condição', c['dur'] == 4 and c['rol'] == ['mestre 3', 'mestre 1'], str(c))
        clk('[data-c=abrirCond]'); dado(4); pg.fill('#cb-dur-res', '2'); clk('[data-c=addCond][data-v=surpreso]')
        check(f'{P} Surpreso ignora o campo (sem 1d4)', cond('surpreso')['dur'] == 1)
        ev("tirarCond('surpreso'); salvarCombate(); renderCombate()")

        # ── Recarga em rodadas ──
        R = ev("turnoState.turno")
        clk('[data-v=mago_vetor_de_pressao]'); clk('[data-c=exec]')
        if ev("turnoState.res && turnoState.res.pend"): clk('[data-c=errou]')
        check(f'{P} usou na rodada {R}: volta na {R + 3}', f'volta na rodada {R + 3}' in txt(), txt()[-300:])
        ev("porCond('bloqueado', 'ficha', null, turnoState.turno + 1); salvarCombate(); renderCombate()")
        clk('[data-c=encerrar]')
        check(f'{P} turno perdido (Bloqueado) também conta', ev("temCond('bloqueado')") and ev("turnoState.rec.mago_vetor_de_pressao") == 2)
        clk('[data-c=encerrar]')
        check(f'{P} rodada {R + 2}: ainda em recarga', pg.locator('[data-v=mago_vetor_de_pressao]').count() == 0)
        ev("tirarCond('bloqueado'); salvarCombate(); renderCombate()")
        clk('[data-c=encerrar]')
        check(f'{P} rodada {R + 3}: pronta', pg.locator('[data-v=mago_vetor_de_pressao]').count() == 1)
        ev("sairDoCombate()"); ev("fichaAba = 'hab'; fichaLadoAba = 'hab'; renderFicha()")
        t = pg.inner_text('#tela-ficha')
        check(f'{P} ficha: recarga em rodadas', 'Recarga 3 rodadas' in t and 'Recarga 3 turnos' not in t, t[:200])

        check(f'{P} sem erro de console', not erros, '; '.join(erros[:3]))
        ev("irPara('combate')"); clk('[data-c=abrirCond]')
        pg.screenshot(path=str(SRC / 'testes' / 'capturas' / f'e14_{w}_duracao.png'), full_page=True)
    b.close()

print(f'\n{falhas} falha(s)')
sys.exit(1 if falhas else 0)
