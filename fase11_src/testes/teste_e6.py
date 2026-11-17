#!/usr/bin/env python3
"""teste_e6.py — E6 da fase 11: efeitos de habilidades, armas e armaduras.

Uso: python teste_e6.py
Regras conferidas (atualizado na E13: rodadas, Compêndio v1.15):
- efeito vale da rodada seguinte (Enraizado/movimento/ação na hora), 1d4 rodadas;
- "próximo ataque/dano/teste/dano recebido" dura até ser usado ou até o fim do 1d4;
- Bônus de Defesa, Bônus de FOR e Enfraquecido rolam ao entrar e aparecem no número;
- Vulnerável/Caído −1 no número da Defesa; Defesa também na faixa da ficha;
- raciais aplicam o resultado em você; só a arma de maior dano conta.
"""
import re, subprocess, sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[1]
OUT = SRC.parent / 'ficha_d4_fase11.html'
falhas = 0

def check(nome, ok, det=''):
    global falhas
    falhas += 0 if ok else 1
    print(f"{'OK   ' if ok else 'FALHA'} {nome}" + (f" — {det}" if det else ''))

r = subprocess.run([sys.executable, str(SRC / 'montar_ficha.py')], capture_output=True, text=True)
check('montar_ficha.py roda', r.returncode == 0, (r.stdout + r.stderr).strip()[-200:])
js = re.findall(r'<script>(.*?)</script>', OUT.read_text(encoding='utf8'), re.S)[0]
Path('/tmp/f11e6.js').write_text(js, encoding='utf8')
r = subprocess.run(['node', '-e', "new Function(require('fs').readFileSync('/tmp/f11e6.js','utf8'))"], capture_output=True, text=True)
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
        dado = lambda v: ev(f"Math.random = () => ({v} - 0.5) / 4")      # força d4 = v
        txt = lambda: pg.inner_text('#tela-combate')
        clk = lambda sel: (pg.click(sel), pg.wait_for_timeout(40))
        P = f'{w}px:'
        novo = lambda cls, rid='elfo': ev(f"""(() => {{ usarNovoPersonagem(montarPersonagem({{ nome: 'T{cls}', rId: '{rid}', cId: '{cls}', hId: 'sabio',
            assocId: 'none', nivel: 1, rolls: {{ raca: 1, idade: 1, pf: 1 }},
            caminhos: MAHOU.filter(h => h.classe === '{cls}' && h.tipo === 'base').map(h => h.id) }})); irPara('ficha'); }})()""")

        # ── Duração: 1d4[1] na hora → rodadas 1 e 2 ──
        novo('soldado'); pg.click('#btn-entrar-combate'); pg.wait_for_timeout(80)
        dado(1); clk('[data-c=abrirCond]'); clk('[data-c=addCond][data-v=enraizado]')
        check(f'{P} Enraizado (rodada 1) mostra fim na rodada 2', 'até o fim da rodada 2' in txt())
        clk('[data-c=encerrar]')
        check(f'{P} rodada 2: Enraizado ainda bloqueia', ev("temCond('enraizado')") and 'Bloqueado: Enraizado' in txt())
        clk('[data-c=encerrar]')
        check(f'{P} rodada 3: Enraizado expirou', not ev("temCond('enraizado')"))

        # ── Pressão Marcial: acerto dá Bônus de Ataque que vale no próximo ataque, em outro turno ──
        dado(3); clk('[data-v=soldado_pressao_marcial]'); clk('[data-c=exec]'); clk('[data-c=acertou]')
        check(f'{P} Pressão Marcial dá Bônus de Ataque (rodada seguinte)', ev("turnoState.conds.some(c => c.id === 'bonus_ataque')") and not ev("temCond('bonus_ataque')"))
        clk('[data-c=encerrar]')
        check(f'{P} prévia do próximo ataque', 'Próximo ataque: +1d4 Bônus de Ataque' in txt())
        clk('[data-c=encerrar]')
        check(f'{P} Bônus de Ataque sobrevive 2 rodadas', ev("temCond('bonus_ataque')") and 'até usar ou' in txt())
        forv = ev("attrEfetivo('FOR')"); eqa = ev("calcEquipBonuses().ataque")
        dado(2); clk('[data-v=ataque]'); clk('[data-c=exec]')
        check(f'{P} próximo ataque soma o bônus', f'= {2 + forv + eqa + 2}' in txt() and 'Bônus de Ataque[2]' in txt(), txt()[-300:])
        check(f'{P} bônus consumido', not ev("temCond('bonus_ataque')"))
        clk('[data-c=errou]')

        # ── Bônus de Dano: próximo dano em outro turno ──
        ev("porCond('bonus_dano', 'ficha'); salvarCombate(); renderCombate()")
        clk('[data-c=encerrar]')
        dado(3); clk('[data-v=ataque]'); clk('[data-c=exec]'); dado(1); clk('[data-c=acertou]')
        arma = ev("danoArma()")
        check(f'{P} próximo dano soma o bônus (outro turno)', f'{1 + arma + 1} de dano' in txt() and 'Bônus de Dano[1]' in txt(), txt()[-300:])

        # ── Defesa visível ──
        base = ev("currentChar.defesa + calcEquipBonuses().defesa")
        dado(3); clk('[data-c=abrirCond]'); clk('[data-c=addCond][data-v=bonus_defesa]')
        dn = lambda: int(pg.inner_text('.cb-def-n'))
        check(f'{P} Bônus de Defesa espera a rodada seguinte', dn() == base, str(dn()))
        clk('[data-c=encerrar]')
        check(f'{P} Bônus de Defesa soma no número', dn() == base + 3, str(dn()))
        clk('[data-c=abrirCond]'); clk('[data-c=addCond][data-v=vulneravel]'); clk('[data-c=encerrar]')
        check(f'{P} Vulnerável desconta 1', dn() == base + 2, str(dn()))
        ev("tirarCond('bonus_defesa'); tirarCond('vulneravel'); salvarCombate(); renderCombate()")

        # ── Bônus de FOR fixo: entra no ataque e aparece no atributo ──
        dado(2); clk('[data-c=abrirCond]'); clk('[data-c=addCond][data-v=bonus_for]'); clk('[data-c=encerrar]')
        check(f'{P} Bônus de FOR fixo no atributo', ev("attrEfetivo('FOR')") == ev("currentChar.attrs.FOR") + 2)
        ev("tirarCond('bonus_for'); salvarCombate(); renderCombate()")

        # ── Arma: só a maior conta ──
        ev("inventario[2] = { itemKey: 'arma_leve' }")
        check(f'{P} duas armas: conta a maior', ev("danoArma()") == 2)
        ev("inventario[2] = null")

        # ── Sair e voltar: efeito de "próximo" passa para a ficha ──
        ev("porCond('bonus_teste', 'ficha'); salvarCombate()")
        ev("sairDoCombate()")
        check(f'{P} ficha mostra Defesa', 'Defesa' in pg.inner_text('#ficha-vital'))
        check(f'{P} ficha mostra efeitos', 'Bônus de Teste' in pg.inner_text('#tela-ficha'))
        dado(4); ev("irPara('ficha')")
        pg.click('[data-f=per]'); pg.wait_for_timeout(60)
        check(f'{P} perícia consome Bônus de Teste', not ev("temCond('bonus_teste')") and not ev("conditions.includes('bonus_teste')"))

        # ── Raciais ──
        novo('mago', 'elfo'); pg.click('#btn-entrar-combate'); pg.wait_for_timeout(80)
        base = ev("currentChar.defesa + calcEquipBonuses().defesa")
        dado(4); clk('[data-v="racial_Fluxo Arcano"]'); clk('[data-c=exec]')
        bonus = ev("turnoState.conds.find(c => c.id === 'bonus_defesa').val")
        check(f'{P} Fluxo Arcano: move agora, Enraizado na rodada 2', not ev("temCond('enraizado')") and 'a partir da rodada 2' in txt())
        clk('[data-c=encerrar]')
        check(f'{P} Fluxo Arcano soma na Defesa (rodada 2)', dn() == base + bonus, f'{dn()} vs {base}+{bonus}')
        check(f'{P} rodada 2: Enraizado vale, 1d4[4] até a 5', ev("temCond('enraizado')") and 'até o fim da rodada 5' in txt())
        for _ in range(4): clk('[data-c=encerrar]')
        check(f'{P} rodada 6: Enraizado acabou', not ev("temCond('enraizado')"))

        novo('soldado', 'anao'); pg.click('#btn-entrar-combate'); pg.wait_for_timeout(80)
        dado(1); clk('[data-v="racial_Forja Interna"]'); clk('[data-c=exec]')
        check(f'{P} Forja Interna: próximo dano +mínimo 2 e Vulnerável',
              ev("turnoState.conds.find(c => c.id === 'bonus_dano').val") >= 2 and ev("turnoState.conds.some(c => c.id === 'vulneravel')"))

        # ── E6b: aprimoramento "X para Chama" fica no caminho X ──
        ordem = ev("arvoreDe('monge').map(h => h.caminho + ':' + (h.transicao ? h.transicao.de : 'base'))")
        check(f'{P} árvore agrupada por caminho de origem', all(c == d or d == 'base' for c, d in (x.split(':') for x in ordem))
              and [x.split(':')[0] for x in ordem] == sorted([x.split(':')[0] for x in ordem], key=['chama','mares','raiz','sopro','veu'].index), str(ordem))
        novo('monge'); ev("fichaAba = 'hab'; fichaLadoAba = 'hab'; fichaUi.caminho = 'chama'; fichaUi.editando = true; renderFicha()")
        t = pg.inner_text('#tela-ficha')
        check(f'{P} filtro Chama sem "Marés para Chama"', 'Fluxo Ardente' not in t and 'Chama Interna' in t)
        ev("fichaUi.caminho = 'mares'; renderFicha()")
        t = pg.inner_text('#tela-ficha')
        check(f'{P} Fluxo Ardente no caminho Marés', 'Fluxo Ardente' in t and 'Desvio de Fluxo' in t)
        ev("fichaUi.caminho = 'todos'; renderFicha()")
        cabs = ev("[...document.querySelectorAll('.fc-nos-cam')].map(e => e.textContent)")
        check(f'{P} Todos: cabeçalho por caminho (nomes sinalizados, E15)', cabs[:5] == ['Chama/Akauger', 'Marés/Nagamerer/Nagaflu', 'Raiz/Okiberger/Okiberga', 'Sopro/Aralufer/Aralufa', 'Véu/Kashiwir/Kashitiefer/Makosetz'], str(cabs))
        pg.screenshot(path=str(SRC / 'testes' / 'capturas' / f'e6b_{w}_arvore.png'), full_page=True)

        check(f'{P} sem erro de console', not erros, '; '.join(erros[:3]))
        pg.screenshot(path=str(SRC / 'testes' / 'capturas' / f'e6_{w}_combate.png'), full_page=True)
    b.close()

print(f'\n{falhas} falha(s)')
sys.exit(1 if falhas else 0)
