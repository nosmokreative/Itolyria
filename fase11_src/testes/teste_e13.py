#!/usr/bin/env python3
"""teste_e13.py — E13 da fase 11: rodadas (Compêndio v1.15, D63–D72, D84, D85). Substitui a contagem da E6.

Uso: python teste_e13.py [validar_ficha.py] [_Compendio_Mecanico.md]   (argumentos ignorados; mesma chamada da suíte)
Regras conferidas:
- contador "Rodada N"; registro e exportação em rodadas;
- duração = 1d4 rodadas; imposta na rodada R com d, vale de R+1 ao fim de R+d (COND-DUR);
- na hora: Enraizado, movimento e debuffs de ação (D69); buff de dano/defesa espera a rodada seguinte;
- mesma condição soma rodadas, sem limite; efeito não soma (D65, D85); defesa bem-sucedida → metade do que resta;
- Surpreso: 1 turno inteiro, sem 1d4 (D71); Envenenado: 1º dano na rodada seguinte, até 1d4 (D66, D68);
- buff de consumo: acaba ao usar ou no fim do 1d4 (D68);
- debuff da habilidade no alvo: a ficha rola o 1d4 do atacante (D67), uma rolagem por efeito.
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
Path('/tmp/f11e13.js').write_text(js, encoding='utf8')
r = subprocess.run(['node', '-e', "new Function(require('fs').readFileSync('/tmp/f11e13.js','utf8'))"], capture_output=True, text=True)
check('sintaxe JS', r.returncode == 0, r.stderr[:200])
check('E6 "em qualquer turno" saiu do combate', 'em qualquer turno' not in (SRC / 'ui-combate.js').read_text(encoding='utf8'))

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
        enc = lambda n=1: [clk('[data-c=encerrar]') for _ in range(n)]
        add = lambda cid: (clk('[data-c=abrirCond]'), clk(f'[data-c=addCond][data-v={cid}]'))
        cond = lambda cid: ev(f"(turnoState.conds.find(c => c.id === '{cid}') || null)")
        P = f'{w}px:'
        novo = lambda cls, rid='elfo': ev(f"""(() => {{ localStorage.removeItem('d4_sessao_turno'); turnoState = null;
            usarNovoPersonagem(montarPersonagem({{ nome: 'R{cls}', rId: '{rid}', cId: '{cls}', hId: 'sabio',
            assocId: 'none', nivel: 1, rolls: {{ raca: 1, idade: 1, pf: 1 }},
            caminhos: MAHOU.filter(h => h.classe === '{cls}' && h.tipo === 'base').map(h => h.id) }})); irPara('ficha'); }})()""")

        novo('soldado'); pg.click('#btn-entrar-combate'); pg.wait_for_timeout(80)
        check(f'{P} contador "Rodada 1"', pg.inner_text('#combate-turno') == 'Rodada 1')

        # ── Rodada seguinte × na hora ──
        dado(2); add('lentidao')
        c = cond('lentidao')
        check(f'{P} Lentidão: 1d4[2], vale das rodadas 2 a 3', c['apartir'] == 2 and c['dur'] == 2 and not ev("temCond('lentidao')")
              and 'a partir da rodada 2' in txt() and 'até o fim da rodada 3' in txt() and '1d4[2]' in txt(), str(c))
        dado(1); add('exausto')
        check(f'{P} Exausto (debuff de ação) vale na hora', ev("temCond('exausto')") and 'Bloqueado: Exausto' in txt())
        enc()
        check(f'{P} rodada 2: Lentidão vale, Exausto ainda (1d4[1] → fim da 2)', ev("temCond('lentidao')") and ev("temCond('exausto')"))
        enc()
        check(f'{P} rodada 3: Exausto saiu, Lentidão fica', not ev("temCond('exausto')") and ev("temCond('lentidao')"))
        enc()
        check(f'{P} rodada 4: Lentidão saiu', not cond('lentidao') and 'Lentidão expirou' in txt())

        # ── Soma sem limite; efeito não soma; defesa → metade ──
        dado(3); add('bonus_defesa'); v0 = cond('bonus_defesa')['val']
        dado(4); add('bonus_defesa'); dado(4); add('bonus_defesa')
        c = cond('bonus_defesa')
        check(f'{P} mesma condição soma rodadas sem limite (3+4+4)', c['dur'] == 11 and c['rol'] == [3, 4, 4] and len([x for x in ev("turnoState.conds") if x['id'] == 'bonus_defesa']) == 1, str(c))
        check(f'{P} efeito não soma (valor fica o primeiro)', c['val'] == v0)
        R = ev("turnoState.turno"); resta = c['t'] + c['dur'] - R
        clk('[data-c=abrirCond]')
        check(f'{P} folha mostra a regra e o botão "defendi"', 'soma rodadas' in pg.inner_text('#folhas') and pg.locator('[data-c=defCond][data-v=bonus_defesa]').count() == 1)
        clk('[data-c=defCond][data-v=bonus_defesa]')
        c = cond('bonus_defesa')
        check(f'{P} defendeu: resta cai à metade, para baixo', c['t'] + c['dur'] - R == resta // 2 and 'metade' in txt(), f'{resta} → {c["t"] + c["dur"] - R}')
        ev("tirarCond('bonus_defesa'); salvarCombate(); renderCombate()")

        # ── Surpreso: 1 turno inteiro, sem 1d4 ──
        novo('soldado'); pg.click('#btn-entrar-combate'); pg.wait_for_timeout(80)
        dado(4); add('surpreso')
        c = cond('surpreso')
        check(f'{P} Surpreso no início: perde a rodada 1, sem 1d4', ev("temCond('surpreso')") and c['dur'] == 1 and 'rol' not in c and 'Bloqueado: Surpreso' in txt(), str(c))
        enc()
        check(f'{P} rodada 2: Surpreso acabou', not cond('surpreso'))
        add('surpreso')
        check(f'{P} Surpreso no meio: perde o próximo turno', not ev("temCond('surpreso')") and cond('surpreso')['apartir'] == 3)
        enc()
        check(f'{P} rodada 3: turno bloqueado', ev("temCond('surpreso')"))
        enc()
        check(f'{P} rodada 4: livre', not cond('surpreso'))

        # ── Envenenado: 1º dano na rodada seguinte, dura 1d4 (não mais 3) ──
        hp = ev("currentHp"); dado(4); add('envenenado')
        check(f'{P} Envenenado: sem dano na rodada em que entrou', ev("currentHp") == hp)
        enc(4)
        check(f'{P} Envenenado 1d4[4]: 4 de vida nas rodadas seguintes', ev("currentHp") == hp - 4, f'{hp} → {ev("currentHp")}')
        enc()
        check(f'{P} Envenenado acabou após 4 rodadas', not cond('envenenado') and ev("currentHp") == hp - 4)

        # ── Buff de consumo: até usar ou fim do 1d4 ──
        dado(1); add('bonus_dano')
        check(f'{P} Bônus de Dano: "até usar ou até o fim da rodada"', 'até usar ou até o fim da rodada' in txt())
        enc()
        check(f'{P} Bônus de Dano vale na rodada seguinte', ev("temCond('bonus_dano')"))
        enc()
        check(f'{P} sem uso, Bônus de Dano cai no fim do 1d4', not cond('bonus_dano'))

        # ── Habilidade com debuff no alvo: a ficha rola o 1d4 do atacante ──
        novo('mago'); pg.click('#btn-entrar-combate'); pg.wait_for_timeout(80)
        hab = ev("""(() => { const o = opcoesCombate().find(o => o.hab && (o.hab.efeitos || []).some(id => DEBUFFS[id] && id !== 'surpreso')); return o ? o.key : null; })()""")
        check(f'{P} mago tem habilidade com debuff', hab is not None)
        if hab:
            dado(3); clk(f'[data-v="{hab}"]'); clk('[data-c=exec]')
            if ev("turnoState.res && turnoState.res.pend"): clk('[data-c=acertou]')
            t = txt()
            check(f'{P} "No alvo" mostra 1d4 rolado e as rodadas', 'No alvo:' in t and '1d4[3]' in t and 'rodadas 1 a 4' in t, t[-400:])

        # ── Registro em rodadas ──
        check(f'{P} registro marca rodadas', ev("turnoState.log.every(e => typeof e.turno === 'number')") and 'Rodada' in ev("turnoState.log.map(e => e.msg).join(' ') + document.getElementById('combate-turno').textContent"))
        enc()
        check(f'{P} "Rodada 2 iniciada" no registro', any('Rodada 2 iniciada' in e['msg'] for e in ev("turnoState.log")))

        # ── Save antigo (E6, sem rol/apartir) não quebra ──
        ev("turnoState.conds.push({ id: 'vulneravel', dur: 1, t: 1, origem: 'ficha' }); salvarCombate(); renderCombate()")
        check(f'{P} save antigo: Vulnerável sem rol/apartir aparece', 'Vulnerável' in txt())

        check(f'{P} sem erro de console', not erros, '; '.join(erros[:3]))
        pg.screenshot(path=str(SRC / 'testes' / 'capturas' / f'e13_{w}_combate.png'), full_page=True)
        clk('[data-c=abrirCond]'); pg.screenshot(path=str(SRC / 'testes' / 'capturas' / f'e13_{w}_condicao.png'), full_page=True)
    b.close()

print(f'\n{falhas} falha(s)')
sys.exit(1 if falhas else 0)
