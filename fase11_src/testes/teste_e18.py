#!/usr/bin/env python3
"""teste_e18.py — E18 da fase 11: popup central de dado (P2 passo 26, ref. BG3).

Uso: python teste_e18.py [validar_ficha.py] [_Compendio_Mecanico.md]   (argumentos ignorados; mesma chamada da suíte)
Conferido:
- toda rolagem abre #dado-pop no centro: rótulo, total no centro, mínimo e máximo abaixo, dado e bônus detalhados;
- o dado gira (classe "rolando") e para no total (classe "pronto"); sem animação com prefers-reduced-motion;
- fecha com Esc, com clique no próprio popup (sem acionar o que está embaixo) e com clique fora (que segue valendo);
- rolagens da mesma ação entram como linhas extras do mesmo popup;
- ficha (atributo, perícia, nível), combate (iniciativa, ataque, dano, morte, condição) e criação.
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
Path('/tmp/f11e18.js').write_text(js, encoding='utf8')
r = subprocess.run(['node', '-e', "new Function(require('fs').readFileSync('/tmp/f11e18.js','utf8'))"], capture_output=True, text=True)
check('sintaxe JS', r.returncode == 0, r.stderr[:200])

from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for w, h in ((390, 844), (1440, 900)):
        pg = b.new_context(viewport={'width': w, 'height': h}).new_page(); erros = []
        pg.on('console', lambda m: m.type == 'error' and erros.append(m.text))
        pg.on('pageerror', lambda e: erros.append(str(e)))
        pg.goto(OUT.as_uri()); pg.wait_for_timeout(200)
        ev = pg.evaluate
        P = f'{w}px:'
        dado = lambda v, n=4: ev(f"Math.random = () => ({v} - 0.5) / {n}")      # força 1dN = v
        clk = lambda sel: (pg.click(sel), pg.wait_for_timeout(40))
        aberto = lambda: ev("(() => { const e = document.getElementById('dado-pop'); return !!e && !e.classList.contains('oculto'); })()")
        pop = lambda: ev("""(() => { const e = document.getElementById('dado-pop'), q = s => (e.querySelector(s) || {}).textContent || '';
            return { rot: q('.dp-rot'), total: q('.dp-total'), min: q('.dp-min'), max: q('.dp-max'), nota: q('.dp-nota'),
                     lin: [...e.querySelectorAll('.dp-lin')].map(x => x.textContent.replace(/\\s+/g, ' ').trim()),
                     extra: [...e.querySelectorAll('.dp-extra')].map(x => x.textContent.replace(/\\s+/g, ' ').trim()),
                     lados: e.querySelector('.dp-dado') ? e.querySelector('.dp-dado').dataset.lados : '' }; })()""")
        pronto = lambda: pg.wait_for_selector('#dado-pop .dp-cartao.pronto', timeout=3000)
        esc = lambda: (pg.keyboard.press('Escape'), pg.wait_for_timeout(40))
        novo = lambda cls, rid='elfo', nivel=1: ev(f"""(() => {{ localStorage.removeItem('d4_sessao_turno'); turnoState = null;
            usarNovoPersonagem(montarPersonagem({{ nome: 'P{cls}', rId: '{rid}', cId: '{cls}', hId: 'sabio',
            assocId: 'none', nivel: {nivel}, rolls: {{ raca: 1, idade: 1, pf: 1 }},
            caminhos: MAHOU.filter(h => h.classe === '{cls}' && h.tipo === 'base').map(h => h.id) }})); irPara('ficha'); }})()""")

        novo('soldado')
        check(f'{P} popup existe e começa fechado', ev("!!document.getElementById('dado-pop')") and not aberto())

        # ── Ficha: teste de atributo ──
        clk('[data-f=attrs]')
        FOR = ev("attrEfetivo('FOR')")
        dado(3); clk('[data-f=attr][data-v=FOR]')
        check(f'{P} atributo abre o popup', aberto())
        check(f'{P} o dado gira antes de parar', ev("document.querySelector('#dado-pop .dp-cartao').classList.contains('rolando')"))
        pronto(); p = pop()
        check(f'{P} atributo: rótulo e total no centro', p['rot'] == 'FOR' and p['total'] == str(3 + FOR), str(p))
        check(f'{P} atributo: mínimo e máximo', p['min'] == str(1 + FOR) and p['max'] == str(4 + FOR), str(p))
        check(f'{P} atributo: dado e bônus detalhados', p['lados'] == '4' and any('1d4' in l and '3' in l for l in p['lin'])
              and any('FOR' in l and str(FOR) in l for l in p['lin']), str(p['lin']))
        check(f'{P} total igual ao da barra da ficha', pg.inner_text('#ficha-rolagem .fc-roll-n strong') == p['total'])
        box = ev("""(() => { const r = document.querySelector('#dado-pop .dp-cartao').getBoundingClientRect();
            return [r.left + r.width / 2, r.top + r.height / 2, innerWidth, innerHeight]; })()""")
        check(f'{P} popup no centro da tela', abs(box[0] - box[2] / 2) < 2 and abs(box[1] - box[3] / 2) < 2, str(box))
        check(f'{P} anunciado a leitor de tela', ev("document.getElementById('dado-pop').getAttribute('role')") == 'status')
        esc(); check(f'{P} Esc fecha', not aberto())

        # ── Fechar: clique no popup não aciona o que está embaixo; clique fora segue valendo ──
        dado(2); clk('[data-f=attr][data-v=FOR]'); pronto()
        antes = ev("JSON.stringify([fichaAba, fichaUi.folha, fichaUi.attrs, telaAtual, fichaUi.roll && fichaUi.roll.total])")
        pg.mouse.click(box[0], box[1]); pg.wait_for_timeout(60)
        check(f'{P} clique no popup fecha', not aberto())
        check(f'{P} clique no popup não aciona a ficha',
              ev("JSON.stringify([fichaAba, fichaUi.folha, fichaUi.attrs, telaAtual, fichaUi.roll && fichaUi.roll.total])") == antes)
        dado(2); clk('[data-f=attr][data-v=FOR]'); pronto()
        clk('[data-f=fecharRoll]')
        check(f'{P} clique fora fecha e segue valendo', not aberto() and ev('fichaUi.roll === null'))

        # ── Perícia: 1d8 ──
        val = ev('perVal(PERICIAS[0])')
        dado(8, 8); clk('[data-f=per][data-v="0"]'); pronto(); p = pop()
        check(f'{P} perícia: 1d8, mínimo e máximo', p['lados'] == '8' and p['total'] == str(8 + val) and p['min'] == str(1 + val)
              and p['max'] == str(8 + val), str(p))
        check(f'{P} perícia: 8 natural na nota', '8 natural' in p['nota'], p['nota'])
        esc()

        # ── Sem animação com prefers-reduced-motion ──
        pg.emulate_media(reduced_motion='reduce')
        dado(1); clk('[data-f=attr][data-v=FOR]')
        check(f'{P} movimento reduzido: para na hora', ev("document.querySelector('#dado-pop .dp-cartao').classList.contains('pronto')")
              and pop()['total'] == str(1 + FOR))
        pg.emulate_media(reduced_motion='no-preference'); esc(); clk('[data-f=fecharRoll]')

        # ── Nível: dado de vida ──
        clk('[data-f=nivel]'); dado(4); clk('[data-f=rolarNivel]'); pronto(); p = pop()
        fixo = ev('ganhoFixoNivel()')
        check(f'{P} nível: vida no popup', p['total'] == str(fixo + 4) and p['min'] == str(fixo + 1) and p['max'] == str(fixo + 4)
              and ev('currentChar.dadoNivel') == 4, str(p))
        esc(); clk('[data-f=confirmarNivel]')

        # ── Combate ──
        novo('soldado'); pg.click('#btn-entrar-combate'); pg.wait_for_timeout(80)
        dado(5, 8); clk('[data-c=iniciativa]'); pronto(); p = pop()
        check(f'{P} iniciativa: 1d8', p['lados'] == '8' and p['total'] == '5' and p['min'] == '1' and p['max'] == '8'
              and 'Iniciativa' in p['rot'], str(p))
        esc()
        atk = ev('atkCombate().val + calcEquipBonuses().ataque')
        dado(3); clk('[data-c=sel][data-v=ataque]'); clk('[data-c=exec]'); pronto(); p = pop()
        check(f'{P} ataque: total, mínimo e máximo', p['total'] == str(3 + atk) and p['min'] == str(1 + atk) and p['max'] == str(4 + atk), str(p))
        check(f'{P} ataque: total igual ao do combate', ev('turnoState.res.numero') == p['total'])
        esc()
        arma = ev('danoArma()')
        dado(4); clk('[data-c=acertou]'); pronto(); p = pop()
        check(f'{P} dano: total e arma detalhada', p['total'] == str(4 + arma) and 'Dano' in p['rot']
              and any('arma' in l for l in p['lin']), str(p))
        esc()
        # habilidade com efeito no alvo: duração entra como linha extra do mesmo popup
        novo('barbaro'); pg.click('#btn-entrar-combate'); pg.wait_for_timeout(80)
        dado(3); clk('[data-c=sel][data-v=barbaro_investida_brutal]'); clk('[data-c=exec]'); esc()
        dado(2); clk('[data-c=acertou]'); pronto(); p = pop()
        check(f'{P} habilidade: duração do efeito como linha extra', 'Dano' in p['rot']
              and any('Lentidão' in x and '1d4' in x and '2' in x for x in p['extra']), str(p))
        esc()
        # condição com valor e duração
        dado(3); clk('[data-c=abrirCond]'); clk('[data-c=addCond][data-v=lentidao]'); pronto(); p = pop()
        check(f'{P} condição: duração 1d4 no popup', 'Lentidão' in p['rot'] and p['total'] == '3' and p['min'] == '1' and p['max'] == '4', str(p))
        esc()
        # morte
        ev("salvacaoUsada = true; receberDanoCombate(999); renderCombate()"); pg.wait_for_timeout(60)
        dado(3); clk('[data-c=morte]'); pronto(); p = pop()
        check(f'{P} morte: face e sentido', p['total'] == '3' and 'sucesso' in p['nota'].lower() and 'morte' in p['rot'].lower(), str(p))
        esc()

        # ── Criação: dado do interlúdio ──
        ev("localStorage.clear()"); pg.goto(OUT.as_uri()); pg.wait_for_timeout(200)
        ev("""(() => { Object.assign(wzSel, { nome: 'Teste', rId: 'elfo', hId: 'sabio', idadeId: 'idoso', assocId: 'merc', etapa: 2, historia: true });
            renderCriacao(); })()""")
        pg.wait_for_timeout(60)
        dado(2); clk('[data-cr=rolar][data-d=FOR]'); pronto(); p = pop()
        check(f'{P} criação: dado base no popup', p['total'] == '2' and p['min'] == '1' and p['max'] == '4' and 'FOR' in p['rot']
              and ev('wzSel.rolls.FOR') == 2, str(p))
        esc()
        check(f'{P} sem erros de console', not erros, '; '.join(erros)[:300])
    b.close()

print(f'\n{falhas} falha(s)')
sys.exit(1 if falhas else 0)
