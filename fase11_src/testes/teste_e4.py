#!/usr/bin/env python3
"""teste_e4.py — E4 da fase 11: desktop (larguras, colunas, janelas, foco, atalhos).

Uso: python teste_e4.py <validar_ficha.py> <_Compendio_Mecanico.md>
Larguras: 390, 800, 1024, 1440, 1920. Capturas: testes/capturas/e4_*.png
"""
import re, subprocess, sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[1]
OUT = SRC.parent / 'ficha_d4_fase11.html'
VALID, COMP = map(Path, sys.argv[1:3])
CAPT = SRC / 'testes' / 'capturas'; CAPT.mkdir(exist_ok=True)
falhas = 0

def check(nome, ok, det=''):
    global falhas
    falhas += 0 if ok else 1
    print(f"{'OK   ' if ok else 'FALHA'} {nome}" + (f" — {det}" if det else ''))
    return ok

r = subprocess.run([sys.executable, str(SRC / 'montar_ficha.py')], capture_output=True, text=True)
check('montar_ficha.py roda', r.returncode == 0, (r.stdout + r.stderr).strip()[-200:])
H = OUT.read_text(encoding='utf8')
js = re.findall(r'<script>(.*?)</script>', H, re.S)[0]
Path('/tmp/f11.js').write_text(js, encoding='utf8')
r = subprocess.run(['node', '-e', "new Function(require('fs').readFileSync('/tmp/f11.js','utf8'))"], capture_output=True, text=True)
check('sintaxe JS', r.returncode == 0, r.stderr[:200])
r = subprocess.run([sys.executable, '-I', str(VALID), str(OUT), str(COMP)], capture_output=True, text=True)
check('validar_ficha.py 0 falhas', r.returncode == 0, r.stdout.strip().split('\n')[-1])

from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for w, h in ((390, 844), (800, 1000), (1024, 768), (1440, 900), (1920, 1080)):
        ctx = b.new_context(viewport={'width': w, 'height': h})
        pg = ctx.new_page(); erros = []
        _clique = pg.click   # E18: como o jogador, fecha o popup de dado (Esc) antes de clicar
        pg.click = lambda *a, **k: (pg.keyboard.press('Escape'), _clique(*a, **k))[1]
        pg.on('console', lambda m: m.type == 'error' and erros.append(m.text))
        pg.on('pageerror', lambda e: erros.append(str(e)))
        pg.goto(OUT.as_uri()); pg.wait_for_timeout(200)
        ev = pg.evaluate
        dado = lambda v, n=4: ev(f"Math.random = () => ({v} - 0.5) / {n}")
        box = lambda sel: ev(f"(() => {{ const r = document.querySelector('{sel}').getBoundingClientRect(); return {{x: r.x, y: r.y, w: r.width, h: r.height}}; }})()")
        vis = lambda sel: pg.locator(sel).first.is_visible()
        def clk(sel):
            pg.locator(sel).first.evaluate("e => e.scrollIntoView({block: 'center'})")
            pg.click(sel); pg.wait_for_timeout(40)
        def sem_rolagem_h(onde):
            check(f'{P} sem rolagem horizontal ({onde})', ev("document.documentElement.scrollWidth <= innerWidth + 1"),
                  str(ev("[document.documentElement.scrollWidth, innerWidth]")))
        def toque(onde):
            alvos = ev("""[...document.querySelectorAll('.tela.ativa button, .tela.lado button, #folhas button')]
                .filter(e => e.offsetParent && getComputedStyle(e).visibility !== 'hidden')
                .map(e => [e.id || e.className || e.textContent.trim().slice(0, 20), Math.round(e.getBoundingClientRect().height)])
                .filter(([_, h]) => h < 44)""")
            check(f'{P} toque mínimo 44px ({onde})', not alvos, str(alvos[:4]))
        P = f'{w}px:'
        larga = w >= 1024

        # Criação
        lay = ev("document.body.dataset.layout")
        check(f'{P} layout da criação', lay == ('largo' if larga else 'estreito'), lay)
        pg.fill('#cr-nome', 'Vela'); dado(2); clk('[data-cr=aleatorio]')
        c, rod = box('#criacao-corpo'), box('#cr-rodape')
        if larga:
            check(f'{P} criação: escolhas ≤ 640px', c['w'] <= 641, str(c['w']))
            check(f'{P} criação: prévia à direita', rod['x'] >= c['x'] + c['w'] and rod['y'] < h / 2, f'{rod}')
        else:
            check(f'{P} criação: prévia no rodapé', abs(rod['y'] + rod['h'] - h) < 2, f'{rod}')
        if w == 800: check(f'{P} ofícios em 3 colunas', ev("getComputedStyle(document.querySelector('.cr-classes')).gridTemplateColumns.split(' ').length") == 3)
        pg.screenshot(path=str(CAPT / f'e4_{w}_criacao.png'))
        toque('criação'); sem_rolagem_h('criação')
        clk('#cr-rodape .cr-avancar'); clk('#cr-rodape .cr-avancar'); clk('#cr-rodape [data-cr=criar]')   # E7: interlúdio 3 → crônica → criar
        check(f'{P} criou', ev("telaAtual") == 'ficha')

        # Ficha
        lay = ev("document.body.dataset.layout")
        check(f'{P} layout da ficha', lay == ('ficha2' if larga else 'estreito'), lay)
        if larga:
            fc, ld = box('#ficha-corpo'), box('#ficha-lado')
            check(f'{P} ficha: coluna esquerda ~420px', 400 <= fc['w'] <= 440, str(fc['w']))
            check(f'{P} ficha: lado direito com abas', vis('#ficha-lado') and ld['x'] >= fc['x'] + fc['w'] - 1
                  and pg.locator('#ficha-lado-nav button').count() == 3)
            check(f'{P} ficha: sem navegação inferior', not vis('#ficha-nav button'))
            check(f'{P} ficha: perícias à esquerda, habilidades à direita',
                  pg.locator('#ficha-corpo .fc-per').count() == 10 and 'Caminhos' in pg.inner_text('#ficha-lado-corpo'))
            clk('#ficha-lado-nav [data-v=itens]')
            check(f'{P} aba Itens à direita, Ficha fica', 'Armadura Leve' in pg.inner_text('#ficha-lado-corpo')
                  and pg.locator('#ficha-corpo .fc-per').count() == 10)
            clk('#ficha-lado-nav [data-v=notas]')
            pg.fill('#fc-notas', 'Nota larga'); pg.wait_for_timeout(500)
            check(f'{P} notas salvas pelo lado', ev("lerSaves().Vela.notas") == 'Nota larga')
            clk('#ficha-lado-nav [data-v=hab]')
            if w >= 1440:
                check(f'{P} conteúdo centrado, máx. 1360px', box('#tela-ficha')['w'] <= 1360 and abs(box('#tela-ficha')['x'] - (w - box('#tela-ficha')['w']) / 2) < 2,
                      str(box('#tela-ficha')))
        else:
            check(f'{P} ficha: navegação inferior', pg.locator('#ficha-nav button').count() == 4 and not vis('#ficha-lado'))
            if w == 800:
                check(f'{P} perícias em 3 colunas', ev("getComputedStyle(document.querySelector('.fc-pers')).gridTemplateColumns.split(' ').length") == 3)
        # folha: janela central a partir de 600px
        clk('#btn-personagens'); pg.wait_for_timeout(50)
        fb = box('#folhas .folha')
        if w >= 600:
            check(f'{P} folha vira janela central', abs(fb['x'] + fb['w'] / 2 - w / 2) < 2 and fb['y'] > 0 and fb['w'] <= 520, str(fb))
        else:
            check(f'{P} folha sobe do rodapé', abs(fb['y'] + fb['h'] - h) < 2 and fb['w'] == w, str(fb))
        pg.screenshot(path=str(CAPT / f'e4_{w}_folha.png'))
        clk('#folhas button[data-fechar]')
        pg.screenshot(path=str(CAPT / f'e4_{w}_ficha.png'))
        toque('ficha'); sem_rolagem_h('ficha')

        # Combate
        clk('#btn-entrar-combate'); pg.wait_for_timeout(80)
        lay = ev("document.body.dataset.layout")
        check(f'{P} layout do combate', lay == ('duplo' if larga else 'estreito'), lay)
        check(f'{P} tela ativa = combate', ev("document.querySelector('.tela.ativa').id") == 'tela-combate')
        if larga:
            f, cb = box('#tela-ficha'), box('#tela-combate')
            check(f'{P} ficha ~420px à esquerda do combate', 410 <= f['w'] <= 430 and cb['x'] >= f['x'] + f['w'] - 1 and vis('#tela-ficha'), f'{f} {cb}')
            def op(sel):   # espera a transição de .15s
                pg.wait_for_timeout(220); return float(ev(f"getComputedStyle(document.querySelector('{sel}')).opacity"))
            check(f'{P} combate em foco, ficha esmaecida', op('#tela-combate') == 1 and abs(op('#tela-ficha') - .45) < .01)
            check(f'{P} ficha ao lado sem faixa vital nem botão de combate', not vis('#ficha-vital') and not vis('#btn-entrar-combate'))
            cen, lat = box('.cb-centro'), box('.cb-lateral')
            if w >= 1280:
                check(f'{P} combate: centro e lateral', lat['x'] >= cen['x'] + cen['w'] and vis('.cb-lateral .cb-vital') and vis('.cb-log-lado') and not vis('.cb-log-bt'), f'{cen} {lat}')
            else:   # E12: 1024–1279 uma coluna no combate, Vida em cima, registro em botão
                check(f'{P} E12: combate em uma coluna, Vida em cima', lat['y'] + lat['h'] <= cen['y'] + 1 and cen['w'] >= 500 and vis('.cb-lateral .cb-vital')
                      and vis('.cb-log-bt') and not vis('.cb-log-lado'), f'{cen} {lat}')
            estouro = ev("""[...document.querySelectorAll('#tela-combate *')].filter(e => e.getBoundingClientRect().width
                && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX === 'visible').length""")
            check(f'{P} E12: nada estoura no combate', estouro == 0, str(estouro))
            ra, rc = box('.rodape-acoes'), box('#tela-combate')
            check(f'{P} rodapé só na coluna do combate', ra['x'] >= rc['x'] - 1 and abs(ra['y'] + ra['h'] - h) < 2, f'{ra}')
            # Foco: clicar na ficha
            clk('#ficha-nav [data-v=itens]')
            check(f'{P} clique na ficha: ficha em foco', op('#tela-ficha') == 1 and abs(op('#tela-combate') - .45) < .01)
            check(f'{P} abas da ficha ao lado do combate', 'Armadura Leve' in pg.inner_text('#ficha-corpo'))
            # Sincronia: poção na ficha cura e aparece no combate
            ev("currentHp = 2; inventario[2] = { itemKey: 'pocao_cura' }; renderFicha(); renderCombate()")
            dado(1); clk('#ficha-corpo [data-f=item][data-v="2"]'); clk('#folhas [data-f=usar]')
            vida = pg.inner_text('.cb-vida-n').split('/')[0].strip()
            check(f'{P} poção da ficha atualiza vida do combate', vida == str(ev("currentHp")) and ev("currentHp") > 2, f'{vida} {ev("currentHp")}')
            # Combate: −1 vida, foco volta
            clk('[data-c=menos]')
            check(f'{P} clique no combate: combate em foco', op('#tela-combate') == 1 and abs(op('#tela-ficha') - .45) < .01)
            # Folha do combate e folha da ficha não se apagam
            clk('[data-c=abrirCond]')
            check(f'{P} folha de condição abre', 'Adicionar condição' in pg.inner_text('#folhas'))
            clk('#folhas [data-c=fechar]')
            pg.screenshot(path=str(CAPT / f'e4_{w}_combate.png'))
        else:
            check(f'{P} uma coluna: ficha oculta, registro em botão', not vis('#tela-ficha') and vis('.cb-log-bt') and not vis('.cb-log-lado'))
            ordem = ev("""[...document.querySelectorAll('#combate-corpo .cb-vital, #combate-corpo .cb-slots, #combate-corpo .cb-exec, #combate-corpo .cb-box')].filter(e => e.offsetParent)
                .map(e => [e.className.split(' ')[0], Math.round(e.getBoundingClientRect().y)]).sort((a, b) => a[1] - b[1]).map(e => e[0])""")
            check(f'{P} ordem do protótipo no celular', ordem[:3] == ['cb-vital', 'cb-slots', 'cb-exec'] and ordem[-1] == 'cb-box', str(ordem))
            pg.screenshot(path=str(CAPT / f'e4_{w}_combate.png'), full_page=True)
        toque('combate'); sem_rolagem_h('combate')

        # Atalhos: R rola, Enter confirma, E encerra
        if larga:
            pg.mouse.click(5, 5)   # tira o foco de botões
            t0 = ev("turnoState.turno")
            dado(3); pg.keyboard.press('r'); pg.wait_for_timeout(50)
            check(f'{P} R rola (iniciativa no turno 1)', 'iniciativa' in ev("turnoState.log.map(l => l.msg).join(' ').toLowerCase()"))
            pg.keyboard.press('Enter'); pg.wait_for_timeout(50)
            check(f'{P} Enter confirma (ataque)', ev("turnoState.res && turnoState.res.pend") is True)
            ev("document.activeElement.blur()")
            pg.keyboard.press('e'); pg.wait_for_timeout(50)
            check(f'{P} E encerra o turno', ev("turnoState.turno") == t0 + 1)
            clk('[data-c=abrirVida]'); pg.keyboard.press('e'); pg.wait_for_timeout(50)
            check(f'{P} atalho não age com folha aberta', ev("turnoState.turno") == t0 + 1)
            clk('#folhas [data-c=fechar]')

        # Sair: volta ao layout da ficha
        clk('#btn-sair-combate'); clk('[data-c=sairOk]')
        lay = ev("document.body.dataset.layout")
        check(f'{P} sair do combate volta ao layout da ficha', ev("telaAtual") == 'ficha' and lay == ('ficha2' if larga else 'estreito')
              and ev("getComputedStyle(document.getElementById('tela-ficha')).opacity") == '1', lay)

        # Redimensionar troca o layout
        if w == 1440:
            clk('#btn-entrar-combate')
            pg.set_viewport_size({'width': 800, 'height': 900}); pg.wait_for_timeout(100)
            check(f'{P} encolher para 800 sai do duplo', ev("document.body.dataset.layout") == 'estreito' and not vis('#tela-ficha'))
            pg.set_viewport_size({'width': 1440, 'height': 900}); pg.wait_for_timeout(100)
            check(f'{P} voltar a 1440 retoma o duplo', ev("document.body.dataset.layout") == 'duplo' and vis('#tela-ficha'))
            ev("alternarTema()"); pg.wait_for_timeout(50)
            pg.screenshot(path=str(CAPT / f'e4_{w}_combate_noite.png'))
            ev("alternarTema()")
        check(f'{P} console limpo', not erros, str(erros[:3]))
        ctx.close()
    b.close()
print(f'\n{falhas} falha(s).')
sys.exit(1 if falhas else 0)
