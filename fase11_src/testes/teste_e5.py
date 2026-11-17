#!/usr/bin/env python3
"""teste_e5.py — E5 da fase 11: teste de ponta a ponta no navegador.

Uso: python teste_e5.py [<validar_ficha.py> <_Compendio_Mecanico.md>]
(sem argumentos, pula só a conferência com o validador)

Por largura (390 e 1440px), para cada uma das 8 classes:
  Nível 1 — criação pela interface (Gerar aleatório + ofício + 5 bases + 1 aprimoramento), ficha,
            Editar (6 de 6, resto bloqueado), combate (habilidade com dano e sem dano),
            queda: Salvação Garantida, 2ª queda, rolou 4 = "Você reviveu" (2/5 da vida).
  Nível 3 — mesmo personagem montado no nível 3 (sem subir nível na interface):
            10 pontos, aprimoramentos até "Sem pontos", Vontade 4,
            queda: 3 + atingido + 3 = "Você levantou" (1/3), depois 4 = "Você reviveu". Teste de morte sem VONT (D76, D82).
Capturas: testes/capturas/e5_*.png
"""
import math, re, subprocess, sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[1]
OUT = SRC.parent / 'ficha_d4_fase11.html'
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
if len(sys.argv) >= 3:
    r = subprocess.run([sys.executable, '-I', sys.argv[1], str(OUT), sys.argv[2]], capture_output=True, text=True)
    check('validar_ficha.py 0 falhas', r.returncode == 0, r.stdout.strip().split('\n')[-1])
else:
    print('PULA  validar_ficha.py (não informado)')

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
        dado = lambda v, n=4: ev(f"Math.random = () => ({v} - 0.5) / {n}")
        larga = w >= 1024
        P = f'{w}px'
        folhas = lambda: pg.inner_text('#folhas')
        def clk(sel):
            pg.locator(sel).first.evaluate("e => e.scrollIntoView({block: 'center'})")
            pg.click(sel); pg.wait_for_timeout(30)
        def aba_hab():
            clk('#ficha-lado-nav [data-v=hab]' if larga else '#ficha-nav [data-v=hab]')
            clk('[data-f=caminho][data-v=todos]')
        def pontos():
            return pg.inner_text('.fc-pontos').strip()
        def encher_apr(limite):
            """Escolhe aprimoramentos livres até `limite` pontos. Devolve quantos escolheu."""
            n = 0
            clk('[data-f=editar]')
            while ev("currentChar.caminhos.length") < limite:
                loc = pg.locator('.fc-no.apr:not([disabled]):not(.on)')
                if loc.count() == 0: break
                loc.first.evaluate("e => e.scrollIntoView({block: 'center'})"); loc.first.click(); pg.wait_for_timeout(20); n += 1
            return n
        def derrubar():
            while ev("currentHp") > 0: clk('[data-c=menos]')
        def entrar():
            clk('#btn-entrar-combate'); pg.wait_for_timeout(60)
        def sair():
            for s in ('[data-c=fecharRen]', '[data-c=fecharQueda]'):
                if pg.locator(s).count(): clk(s)
            clk('#btn-sair-combate'); clk('[data-c=sairOk]')

        classes = ev("Object.keys(CLASSES)")
        check(f'{P} 8 classes', len(classes) == 8 and 'bruxo' not in classes and 'cacador' in classes, str(classes))
        resumo = []
        for i, cId in enumerate(classes):
            nome = f'E5 {cId}'
            C = f'{P} {cId}'
            # ── Nível 1: criação pela interface ──
            if i:
                clk('#btn-personagens'); clk('.folha [data-novo]')
            pg.fill('#cr-nome', nome); dado(2 + i % 3)
            clk('[data-cr=aleatorio]')
            raca = ('elfo', 'humano', 'anao', 'demonio')[i % 4]          # roda as 4 raças pela interface
            clk('#cr-etapas button[data-n="2"]'); clk(f'[data-k=rId][data-v={raca}]'); clk('#cr-etapas button[data-n="4"]')
            check(f'{C} nv1: raça {raca} mantém dados rolados', ev("wzSel.rId") == raca and ev("wzSel.etapa") == 4 and all(ev("Object.values(wzSel.rolls)")))
            if ev("wzSel.cId") == cId: ev("wzSel.cId = null")   # força o clique a valer
            clk(f'[data-cr=classe][data-v={cId}]')
            for k in range(5): clk(f'#tela-criacao .fc-no:not(.apr) >> nth={k}')
            clk('#tela-criacao .fc-no.apr:not([disabled])')      # aprimoramento já na criação
            ok = check(f'{C} nv1: 5 bases + 1 aprimoramento na criação', ev("wzSel.caminhos.length") == 6 and ev("wzSel.cId") == cId
                       and pg.locator('#tela-criacao .fc-no:not(.on):not([disabled])').count() == 0)
            if i == 0: pg.screenshot(path=str(CAPT / f'e5_{w}_criacao.png'))
            clk('#cr-rodape .cr-avancar'); clk('#cr-rodape .cr-avancar'); clk('#cr-rodape [data-cr=criar]')   # E7: interlúdio 3 → crônica → criar
            if not check(f'{C} nv1: criou e abriu a ficha', ev("telaAtual") == 'ficha' and ev("currentChar.nome") == nome,
                         f'{ev("telaAtual")} {ev("wzSel.etapa")}'):
                continue
            cn = ev("CLASSES[currentChar.cId].nome.toLowerCase()")
            check(f'{C} nv1: linha da ficha', f'{cn}, nível 1' in pg.inner_text('#tela-ficha'))
            ch = ev("({hp: currentChar.hpMax, v: currentChar.vontMax, p: currentChar.pontosCaminho, at: CLASSES[currentChar.cId].atkAttr})")
            check(f'{C} nv1: 6 pontos, Vontade 2', ch['p'] == 6 and ch['v'] == 2, str(ch))
            aba_hab()
            nrac = ev("opcoesCombate().filter(o => o.racial).length")   # raciais aparecem em Todos, grupo "Da raça"
            check(f'{C} nv1: 6 de 6 e 6 cartões + raciais', pontos().startswith('6 de 6') and pg.locator('.fc-hab').count() == 6 + nrac,
                  f'{pontos()} {pg.locator(".fc-hab").count()}')
            n = encher_apr(6)
            check(f'{C} nv1: Editar abre cheio (6 de 6)', n == 0 and pontos().startswith('6 de 6'), pontos())
            check(f'{C} nv1: cheio bloqueia o resto', pg.locator('.fc-no:not(.on):not([disabled])').count() == 0)
            clk('[data-f=editar]')
            check(f'{C} nv1: salvo com 6', len(ev(f"lerSaves()['{nome}'].char.caminhos")) == 6)
            if i == 0: pg.screenshot(path=str(CAPT / f'e5_{w}_ficha_hab.png'), full_page=not larga)

            # Combate nv1
            entrar()
            nops = ev("opcoesCombate().length")
            check(f'{C} nv1: opções = ataque + 6 + raciais', nops == 1 + 6 + nrac, f'{nops} {nrac}')
            check(f'{C} nv1: Editar travado em combate', ev("emCombateAtivo()") is True)
            com = ev("opcoesCombate().find(o => o.hab && o.dano)?.key || null")
            sem = ev("opcoesCombate().find(o => o.hab && !o.dano)?.key || null")
            if com:
                dado(3); clk(f'[data-c=sel][data-v="{com}"]'); clk('[data-c=exec]'); clk('[data-c=acertou]')
                check(f'{C} nv1: habilidade com dano rola e acerta', ev("turnoState.res && !turnoState.res.pend && turnoState.res.ok") is True
                      and ev(f"turnoState.rec['{com}']") == 3, str(ev("turnoState.res && turnoState.res.titulo")))
            if sem:
                clk(f'[data-c=sel][data-v="{sem}"]'); clk('[data-c=exec]')
                check(f'{C} nv1: habilidade sem dano usa Ação Livre', ev("turnoState.slots.livre") is True and ev(f"turnoState.rec['{sem}']") == 3)
            # Queda: Salvação → 2ª queda → 4 = renasceu
            hpm = ev("hpMaxCombate()")
            ev("showToast('aviso antigo')")
            derrubar()
            check(f'{C} E8: folha de queda esconde aviso', ev("document.getElementById('toast').classList.contains('show')") is False)
            check(f'{C} nv1: queda sem pedras de Vontade (D76)', pg.locator('.cb-pip').count() == 0 and 'Levantar com' in folhas())
            clk('[data-c=salv]')
            check(f'{C} nv1: Salvação volta com 1/3', ev("currentHp") == math.ceil(hpm / 3) and 'Salvação Garantida' in folhas())
            clk('[data-c=fecharRen]')
            derrubar()
            check(f'{C} nv1: 2ª queda pede teste', 'Teste de morte' in folhas() and 'Levantar com' not in folhas())
            if cId in ('soldado', 'mago'): pg.screenshot(path=str(CAPT / f'e5_{w}_{cId}_n1_queda.png'))
            dado(4); clk('[data-c=morte]')
            check(f'{C} nv1: rolou 4 = reviveu com 2/5', 'Você reviveu' in folhas() and ev("currentHp") == math.ceil(hpm * 2 / 5)
                  and ev("currentVont") == 2, f'{ev("currentHp")} de {hpm}')
            if cId in ('soldado', 'mago'): pg.screenshot(path=str(CAPT / f'e5_{w}_{cId}_n1_renasceu.png'))
            sair()
            check(f'{C} nv1: sair volta à ficha', ev("telaAtual") == 'ficha' and ev("emCombateAtivo()") is False)

            # ── Nível 3: mesmo personagem, montado no nível 3 ──
            nome3 = nome + ' n3'
            ev(f"""() => {{ const c = currentChar;
                const ch = montarPersonagem({{ nome: '{nome3}', rId: c.rId, cId: c.cId, hId: c.hId, idadeId: c.idadeId, assocId: c.assocId,
                  estId: c.estId, motId: c.motId, nivel: 3, rolls: c.rolls,
                  caminhos: c.caminhos.filter(id => MAHOU.find(h => h.id === id).tipo === 'base') }});
                usarNovoPersonagem(ch); irPara('ficha'); renderFicha(); }}""")
            pg.wait_for_timeout(60)
            check(f'{C} nv3: linha da ficha', f'{cn}, nível 3' in pg.inner_text('#tela-ficha'))
            ch3 = ev("({hp: currentChar.hpMax, v: currentChar.vontMax, p: currentChar.pontosCaminho})")
            check(f'{C} nv3: 10 pontos, Vontade 4, vida maior', ch3['p'] == 10 and ch3['v'] == 4 and ch3['hp'] > ch['hp'], f'{ch} → {ch3}')
            aba_hab()
            check(f'{C} nv3: 5 de 10', pontos().startswith('5 de 10'), pontos())
            n = encher_apr(10)
            check(f'{C} nv3: 5 aprimoramentos até 10 de 10', n == 5 and pontos().startswith('10 de 10')
                  and 'Sem pontos' in pg.inner_text('.fc-nos'), pontos())
            # remover base remove os aprimoramentos dela
            base1 = ev("currentChar.caminhos[0]")
            dep = ev(f"currentChar.caminhos.filter(id => {{ const m = MAHOU.find(h => h.id === id); return m.tipo !== 'base' && baseDe(m, arvoreClasse())?.id === '{base1}'; }}).length")
            clk(f'[data-f=no][data-v="{base1}"]')
            check(f'{C} nv3: tirar base tira os aprimoramentos dela', ev("currentChar.caminhos.length") == 10 - 1 - dep, f'dep {dep}')
            clk(f'[data-f=no][data-v="{base1}"]')
            while ev("currentChar.caminhos.length") < 10 and pg.locator('.fc-no.apr:not([disabled]):not(.on)').count():
                clk('.fc-no.apr:not([disabled]):not(.on)')
            if ev("fichaUi.editando"): clk('[data-f=editar]')
            check(f'{C} nv3: 10 escolhidas, 10 cartões', ev("currentChar.caminhos.length") == 10 and pg.locator('.fc-hab').count() == 10 + nrac)
            if cId == 'mago': pg.screenshot(path=str(CAPT / f'e5_{w}_mago_n3_ficha.png'), full_page=not larga)

            entrar()
            check(f'{C} nv3: opções = ataque + 10 + raciais', ev("opcoesCombate().length") == 1 + 10 + nrac)
            dado(3); clk('[data-c=sel][data-v=ataque]'); clk('[data-c=exec]'); clk('[data-c=acertou]')
            check(f'{C} nv3: ataque simples acerta', ev("turnoState.res.titulo") == 'Acertou', ev("turnoState.res.titulo"))
            hpm = ev("hpMaxCombate()")
            derrubar(); clk('[data-c=salv]'); clk('[data-c=fecharRen]')
            derrubar()
            check(f'{C} nv3: sem pedras de Vontade (D76)', pg.locator('.cb-pip').count() == 0)
            dado(3); clk('[data-c=morte]')
            clk('[data-c=atingido]')
            check(f'{C} nv3: sucesso + falha, Vontade intacta', ev("turnoState.morte.suc") == 1 and ev("turnoState.morte.meia") == 1 and ev("currentVont") == 4)
            dado(3); clk('[data-c=morte]')
            check(f'{C} nv3: 2º sucesso = levantou com 1/3', 'Você levantou' in folhas() and ev("currentHp") == math.ceil(hpm / 3), f'{ev("currentHp")} de {hpm}')
            clk('[data-c=fecharRen]')
            derrubar()
            check(f'{C} nv3: nova queda zera marcas', ev("turnoState.morte.suc") == 0 and ev("turnoState.morte.meia") == 0)
            dado(4); clk('[data-c=morte]')
            check(f'{C} nv3: rolou 4 = reviveu com 2/5', 'Você reviveu' in folhas() and ev("currentHp") == math.ceil(hpm * 2 / 5))
            if cId == 'mago': pg.screenshot(path=str(CAPT / f'e5_{w}_mago_n3_renasceu.png'))
            sair()
            resumo.append((cId, raca, ch['hp'], ch3['hp'], nrac))

        print(f'{P} resumo (classe, raça, vida nv1, vida nv3, raciais):', resumo)
        check(f'{P} 8 personagens salvos por nível', len([k for k in ev("Object.keys(lerSaves())") if k.startswith('E5 ')]) == 16)
        check(f'{P} console limpo', not erros, '; '.join(erros)[:300])
        ctx.close()
    b.close()
print(f'\n{falhas} falha(s).')
sys.exit(1 if falhas else 0)
