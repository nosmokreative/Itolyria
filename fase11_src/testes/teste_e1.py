#!/usr/bin/env python3
"""teste_e1.py — E1 da fase 11: tela de Combate.

Uso: python teste_e1.py <validar_ficha.py> <_Compendio_Mecanico.md>
Monta a ficha, valida e roda os fluxos de combate no navegador (Playwright), 390px e 1440px.
Capturas: testes/capturas/e1_*.png
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
    for w, h in ((390, 844), (1440, 900)):
        ctx = b.new_context(viewport={'width': w, 'height': h})
        pg = ctx.new_page(); erros = []
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

        pg.evaluate("usarNovoPersonagem(personagemExemplo()); irPara('ficha')"); pg.click('#btn-entrar-combate'); pg.wait_for_timeout(100)
        check(f'{P} abre Combate', ev("telaAtual") == 'combate')
        t = txt()
        check(f'{P} topo, vida, defesa', 'Rodada 1' in t and 'Ilwen, elfo mago' in t and 'Vida' in t and 'Defesa' in t)
        check(f'{P} sem Defesa do alvo (R5)', 'Defesa do alvo' not in t and 'Ileso' not in t)
        check(f'{P} 3 ações', pg.locator('.cb-slot').count() == 3)
        n_ops = pg.locator('.cb-opc').count()
        check(f'{P} ataque + 5 bases + 2 raciais', n_ops == 8, str(n_ops))
        pg.screenshot(path=str(CAPT / f'e1_{w}_inicio.png'), full_page=True)
        alvos = ev("""[...document.querySelectorAll('#tela-combate button')].filter(e => e.offsetParent)
            .map(e => [e.dataset.c || e.id || e.className, Math.round(e.getBoundingClientRect().height)]).filter(([_, h]) => h < 44)""")
        check(f'{P} toque mínimo 44px', not alvos, str(alvos))

        # Ataque: INT 4 (elfo + d4 1 → 2+1+1). d4=3 → 3+INT
        intv = ev("currentChar.attrs.INT")
        dado(3); clk('[data-c=exec]')
        check(f'{P} ataque mostra total e pergunta', f'= {3 + intv}' in txt() and 'O que o mestre respondeu?' in txt())
        check(f'{P} ação marcada como usada', ev("turnoState.slots.acao") is True)
        dado(2); clk('[data-c=acertou]')
        check(f'{P} Acertou rola dano bruto 1d4 + arma 2', '4 de dano' in txt() and 'desconta a Defesa' in txt(), txt()[-300:])

        # Habilidade livre (Vetor de Pressão): efeito no alvo, recarga
        clk('[data-v=mago_vetor_de_pressao]'); clk('[data-c=exec]')
        check(f'{P} Vetor: alvo Enraizado (só texto)', 'No alvo: Enraizado' in txt())
        check(f'{P} Vetor em recarga some da lista', pg.locator('[data-v=mago_vetor_de_pressao]').count() == 0 and 'Em recarga: Vetor de Pressão, volta na rodada 4' in txt())
        check(f'{P} Livre usada', ev("turnoState.slots.livre") is True)

        # Desfazer
        clk('[data-c=desfazer]')
        check(f'{P} Desfazer volta a habilidade', pg.locator('[data-v=mago_vetor_de_pressao]').count() == 1 and ev("turnoState.slots.livre") is False)

        # Condição bloqueia movimento
        dado(1); clk('[data-c=abrirCond]'); clk('[data-c=addCond][data-v=enraizado]')
        check(f'{P} Enraizado bloqueia Movimento', 'Bloqueado: Enraizado' in txt())
        check(f'{P} origem "Aplicado pela ficha"', 'Aplicado pela ficha' in txt())
        clk('[data-c=abrirCond]'); clk('[data-c=addCond][data-v=enraizado]')
        check(f'{P} repetir soma rodadas (E13, D65)', ev("turnoState.conds.filter(c=>c.id==='enraizado').length") == 1 and ev("turnoState.conds.find(c=>c.id==='enraizado').dur") == 2 and 'soma' in txt())

        # Leitura de Fórmula: bônus em você, origem habilidade; bônus de ataque entra no próximo ataque
        clk('[data-v=mago_leitura_de_formula]'); clk('[data-c=exec]')
        check(f'{P} Leitura aplica bônus em você', 'Da sua habilidade' in txt() and ev("turnoState.conds.some(c=>c.id==='bonus_ataque')"))

        # Encerrar turno: expira 1 turno, recarga cai, ações liberadas
        clk('[data-c=encerrar]')
        check(f'{P} Rodada 2', 'Rodada 2' in txt() and ev("turnoState.slots.acao") is False)
        # E13: Enraizado (1d4[1] + 1d4[1]) na hora vale até o fim da rodada 3; "próximo ataque" até usar ou fim da duração
        check(f'{P} Enraizado da rodada 1 vale na rodada 2', ev("temCond('enraizado')") and 'até o fim da rodada 3' in txt(), ev("JSON.stringify(turnoState.conds)"))
        check(f'{P} Bônus de Ataque: até usar ou fim', ev("temCond('bonus_ataque')") and 'até usar ou' in txt())
        ev("tirarCond('enraizado'); tirarCond('bonus_ataque'); salvarCombate(); renderCombate()")
        check(f'{P} recarga 3 → 2', ev("turnoState.rec.mago_leitura_de_formula") == 2)

        # Veneno: −1 no início do turno
        hp0 = ev("currentHp")
        clk('[data-c=abrirCond]'); clk('[data-c=addCond][data-v=envenenado]'); clk('[data-c=encerrar]')
        check(f'{P} Envenenado tira 1', ev("currentHp") == hp0 - 1 and 'Envenenado tirou 1 de vida' in txt())
        clk('[data-c=remCond][data-v=envenenado]')

        # Redução de dano no teclado de vida
        clk('[data-c=abrirCond]'); clk('[data-c=addCond][data-v=reducao_dano]'); clk('[data-c=encerrar]')   # E13: vale da rodada seguinte
        hp1 = ev("currentHp"); dado(1)
        clk('[data-c=abrirVida]'); pg.fill('#cb-vida-num', '3'); clk('[data-c=dano]')
        check(f'{P} Redução desconta 1d4', ev("currentHp") == hp1 - 2 and not ev("turnoState.conds.some(c=>c.id==='reducao_dano')"))
        clk('[data-c=abrirCond]'); clk('[data-c=addCond][data-v=absorcao_total]'); clk('[data-c=encerrar]')
        hp2 = ev("currentHp"); clk('[data-c=menos]')
        check(f'{P} Absorção anula', ev("currentHp") == hp2)

        # Queda: Salvação Garantida
        while ev("currentHp") > 0: clk('[data-c=menos]')
        check(f'{P} vida 0 abre queda', pg.locator('[aria-label="Vontade e queda"]').count() == 1)
        check(f'{P} morte sem pedras de Vontade (D76)', pg.locator('.cb-pip').count() == 0 and 'VONT não entra' in pg.inner_text('#folhas'))
        pg.screenshot(path=str(CAPT / f'e1_{w}_queda.png'))
        clk('[data-c=salv]')
        check(f'{P} Salvação: renasceu com 1/3', 'Salvação Garantida' in pg.inner_text('#folhas') and ev("currentHp") == 2)
        pg.screenshot(path=str(CAPT / f'e1_{w}_renasceu.png'))
        clk('[data-c=fecharRen]')

        # Segunda queda: teste de morte D76/D82 (1d4, sem VONT), ajuda = sucesso, atingido = falha
        while ev("currentHp") > 0: clk('[data-c=menos]')
        f = lambda: pg.inner_text('#folhas')
        check(f'{P} sem Salvação mostra teste', 'Teste de morte' in f() and 'Levantar com' not in f())
        dado(3); clk('[data-c=morte]')
        check(f'{P} rolar não gasta Vontade', ev("currentVont") == 2 and 'Rolou 3: sucesso' in f())
        clk('[data-c=atingido]')
        check(f'{P} atingido caído = 1 falha', ev("turnoState.morte.meia") == 1 and 'uma falha' in f())
        clk('[data-c=ajuda]')
        check(f'{P} ajuda = sucesso, levanta', ev("currentVont") == 2 and ev("currentHp") == 2 and 'Você levantou' in f())
        clk('[data-c=fecharRen]')
        while ev("currentHp") > 0: clk('[data-c=menos]')
        dado(2); clk('[data-c=morte]')
        check(f'{P} rolou 2 = 1 falha, segue vivo', ev("turnoState.morte.meia") == 1 and ev("turnoState.morte.morto") is False)
        clk('[data-c=atingido]')
        check(f'{P} segunda falha (atingido): morre', ev("turnoState.morte.morto") is True and 'Ilwen morreu' in f())
        pg.screenshot(path=str(CAPT / f'e1_{w}_morte.png'))
        clk('[data-c=fecharQueda]'); clk('[data-c=desfazer]')
        check(f'{P} Desfazer desfaz a morte', ev("turnoState.morte.morto") is False and ev("turnoState.morte.meia") == 1)
        clk('[data-c=fecharQueda]'); clk('[data-c=mais]')
        check(f'{P} curar fecha queda', ev("currentHp") == 1 and pg.locator('[aria-label="Vontade e queda"]').count() == 0)

        # Persistência: recarregar restaura a sessão
        tno = ev("turnoState.turno")
        pg.reload(); pg.wait_for_timeout(200)
        pg.click('#btn-entrar-combate'); pg.wait_for_timeout(100)
        check(f'{P} sessão restaurada', ev("turnoState.turno") == tno and f'Rodada {tno}' in txt())

        # Registro
        if w < 1024:
            clk('[data-c=abrirLog]')
            check(f'{P} registro tem entradas', pg.locator('.cb-log-l').count() > 10)
            clk('[data-c=fechar]')
        else:   # E4: no desktop o registro fica aberto na lateral
            check(f'{P} registro na lateral', pg.locator('.cb-log-lado .cb-log-l').count() == 12 and pg.is_visible('.cb-log-lado'))

        # Noite
        ev("alternarTema()"); pg.wait_for_timeout(50)
        pg.screenshot(path=str(CAPT / f'e1_{w}_noite.png'), full_page=True)
        ev("alternarTema()")

        # Sair
        clk('#btn-sair-combate'); clk('[data-c=sairOk]')
        check(f'{P} sair volta à ficha e limpa sessão', ev("telaAtual") == 'ficha' and ev("localStorage.getItem('d4_sessao_turno')") is None
              and pg.inner_text('#folhas') == '')

        # 8 classes, níveis 1 e 3
        res = ev("""() => { const out = [];
          for (const cId of Object.keys(CLASSES)) for (const nivel of [1, 3]) {
            const ch = montarPersonagem({ nome: 'T_' + cId + nivel, rId: 'humano', cId, hId: 'sabio', assocId: 'none', nivel,
              rolls: { raca: 2, idade: 1, pf: 1 }, caminhos: MAHOU.filter(h => h.classe === cId && h.tipo === 'base').map(h => h.id) });
            usarNovoPersonagem(ch); turnoState = null; irPara('combate');
            turnoState.sel = 'ataque'; executarCombate(); mestreRespondeu(true);
            out.push([cId, nivel, document.querySelectorAll('.cb-opc').length, turnoState.res.titulo, currentChar.vontMax]);
            sairDoCombate();
          } return out; }""")
        okc = all(n == 8 and t == 'Acertou' and v == nv + 1 for _, nv, n, t, v in res)
        check(f'{P} 8 classes × níveis 1 e 3', len(res) == 16 and okc, str([r for r in res if not (r[2] == 8 and r[3] == 'Acertou')])[:200])
        check(f'{P} console limpo', not erros, '; '.join(erros)[:300])
        ctx.close()
    b.close()

print(f'\n{falhas} falha(s).')
sys.exit(1 if falhas else 0)
