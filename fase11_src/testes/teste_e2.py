#!/usr/bin/env python3
"""teste_e2.py — E2 da fase 11: tela Ficha.

Uso: python teste_e2.py <validar_ficha.py> <_Compendio_Mecanico.md>
Monta a ficha, valida e roda os fluxos da Ficha no navegador (Playwright), 390px e 1440px.
Capturas: testes/capturas/e2_*.png
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
        dado = lambda v, n=4: ev(f"Math.random = () => ({v} - 0.5) / {n}")    # força dN = v
        txt = lambda: pg.inner_text('#tela-ficha')
        roll = lambda: pg.inner_text('#ficha-rolagem')
        def clk(sel):   # centraliza antes: a rolagem e o botão flutuante cobrem o rodapé, como no celular
            pg.locator(sel).first.evaluate("e => e.scrollIntoView({block: 'center'})")
            pg.click(sel); pg.wait_for_timeout(40)
        P = f'{w}px:'

        pg.evaluate("usarNovoPersonagem(personagemExemplo()); irPara('ficha')"); pg.wait_for_timeout(100)
        check(f'{P} abre Ficha', ev("telaAtual") == 'ficha')
        t = txt()
        check(f'{P} faixa: Vida, Ataque INT, Vontade', '5/5' in t and 'Ataque INT' in t and 'Vontade' in t)
        check(f'{P} Defesa na faixa da ficha (E6)', 'Defesa' in pg.inner_text('#ficha-vital'))
        check(f'{P} sem texto provisório', 'etapa E2' not in t)
        A = ev("currentChar.attrs")
        resumo = ', '.join(f'{k} {A[k]}' for k in ['FOR', 'VIG', 'AGI', 'INT', 'VONT'])
        check(f'{P} atributos fechados mostram resumo', resumo in t and pg.locator('.fc-attr').count() == 0)
        check(f'{P} 10 perícias', pg.locator('.fc-per').count() == 10)
        pg.screenshot(path=str(CAPT / f'e2_{w}_ficha.png'), full_page=True)
        alvos = ev("""[...document.querySelectorAll('#tela-ficha button')].filter(e => e.offsetParent)
            .map(e => [e.dataset.f || e.id || e.className, Math.round(e.getBoundingClientRect().height)]).filter(([_, h]) => h < 44)""")
        check(f'{P} toque mínimo 44px (ficha)', not alvos, str(alvos))

        # Ataque e Vontade (1d4)
        dado(3); clk('[data-f=atk]')
        check(f'{P} ataque 1d4 + INT', f"= {3 + A['INT']}" in roll() and 'Ataque INT' in roll(), roll())
        dado(2); clk('[data-f=denovo]')
        check(f'{P} rolar de novo', f"1d4[2]" in roll() and f"= {2 + A['INT']}" in roll(), roll())
        dado(1); clk('[data-f=vont]')
        check(f'{P} Vontade 1d4 + VONT', f"1d4[1] + VONT {A['VONT']} = {1 + A['VONT']}" in roll(), roll())
        clk('[data-f=fecharRoll]')
        check(f'{P} fechar resultado', not pg.is_visible('#ficha-rolagem'))

        # Atributos abertos, ataque marcado, 1d4 (E10)
        clk('[data-f=attrs]')
        check(f'{P} atributos abertos: 5, INT com faixa Ataque', pg.locator('.fc-attr').count() == 5
              and pg.locator('.fc-attr.atk[data-v=INT] .fc-attr-tag').count() == 1)
        dado(4, 4); clk('[data-f=attr][data-v=FOR]')
        check(f'{P} E10: atributo 1d4 + valor, sem "natural"', f"1d4[4] + FOR {A['FOR']}" in roll() and 'natural' not in roll(), roll())
        check(f'{P} E10: rótulo 1d4', 'Rolar FOR, 1d4' in (pg.get_attribute('[data-f=attr][data-v=FOR]', 'aria-label') or ''))
        clk('[data-f=attrs]')
        check(f'{P} atributos recolhem', pg.locator('.fc-attr').count() == 0)

        # Perícia: Arcanismo = floor((INT+VONT)/2)
        arc = (A['INT'] + A['VONT']) // 2
        dado(5, 8); clk('[data-f=per][data-v="9"]')
        check(f'{P} perícia 1d8 + valor', f"Arcanismo: 1d8[5] + {arc} = {5 + arc}" in roll(), roll())
        clk('[data-f=fecharRoll]')

        # Vida: teclado, dano, cura, redução
        clk('[data-f=vida]')
        check(f'{P} teclado de vida', pg.locator('.fc-tecla').count() == 12 and 'Receber dano' in pg.inner_text('#folhas'))
        teclas = ev("""[...document.querySelectorAll('#folhas button')].map(e => Math.round(e.getBoundingClientRect().height)).filter(h => h < 44)""")
        check(f'{P} toque mínimo 44px (teclado)', not teclas, str(teclas))
        clk('[data-f=tecla][data-v="3"]'); clk('[data-f=aplicar][data-v=dano]')
        check(f'{P} dano 3 → vida 2', ev("currentHp") == 2 and '2/5' in pg.inner_text('#ficha-vital') and pg.locator('.fc-vida.baixa').count() == 1)
        clk('[data-f=vida]'); clk('[data-f=tecla][data-v="9"]'); clk('[data-f=aplicar][data-v=cura]')
        check(f'{P} cura limita ao máximo', ev("currentHp") == 5)
        ev("conditions = ['reducao_dano']"); dado(2)
        clk('[data-f=vida]'); clk('[data-f=tecla][data-v="3"]'); clk('[data-f=aplicar][data-v=dano]')
        check(f'{P} Redução de Dano desconta e é consumida', ev("currentHp") == 4 and ev("conditions.length") == 0, roll())
        ev("conditions = ['absorcao_total']")
        clk('[data-f=vida]'); clk('[data-f=tecla][data-v="4"]'); clk('[data-f=aplicar][data-v=dano]')
        check(f'{P} Absorção Total anula', ev("currentHp") == 4 and 'Absorção Total' in roll())
        clk('[data-f=vida]'); clk('[data-f=tecla][data-v="9"]'); clk('[data-f=aplicar][data-v=dano]')
        check(f'{P} vida para em 0', ev("currentHp") == 0 and pg.locator('.fc-vida.zero').count() == 1)
        clk('[data-f=vida]'); clk('[data-f=tecla][data-v="5"]'); clk('[data-f=aplicar][data-v=cura]')
        clk('[data-f=fecharRoll]')

        # Habilidades
        clk('[data-f=aba][data-v=hab]')
        check(f'{P} pentagrama 5 + Todos', pg.locator('.fc-cam').count() == 6)
        check(f'{P} 5 bases, 6 pontos', pg.locator('.fc-hab').count() == 5 + 2 and '5 de 6 pontos de caminho' in txt())
        check(f'{P} raciais em "Da raça"', 'Da raça' in txt() and 'Fluxo Arcano' in txt())
        check(f'{P} efeito com nome legível', '`' not in pg.inner_text('#ficha-corpo'))
        clk('[data-f=caminho][data-v=mares]')
        check(f'{P} filtro Marés', pg.locator('.fc-hab').count() == 1 and 'Vetor de Pressão' in txt() and 'Da raça' not in txt())
        pg.screenshot(path=str(CAPT / f'e2_{w}_hab.png'), full_page=True)
        clk('[data-f=editar]')
        check(f'{P} editar Marés: 5 nós', pg.locator('.fc-no').count() == 5)
        clk('[data-f=caminho][data-v=todos]')
        check(f'{P} editar Todos: 25 nós', pg.locator('.fc-no').count() == 25)
        pg.screenshot(path=str(CAPT / f'e2_{w}_arvore.png'), full_page=True)
        apr = ev("MAHOU.find(h => h.classe === 'mago' && h.caminho === 'mares' && h.tipo !== 'base').id")
        apr2 = ev("MAHOU.filter(h => h.classe === 'mago' && h.caminho === 'chama' && h.tipo !== 'base')[0].id")
        clk(f'[data-f=no][data-v={apr}]')
        check(f'{P} escolhe aprimoramento (6/6)', '6 de 6' in txt() and apr in ev("currentChar.caminhos"))
        check(f'{P} sem pontos trava o resto', pg.locator(f'[data-f=no][data-v={apr2}]').is_disabled() and 'Sem pontos' in txt())
        clk('[data-f=no][data-v=mago_vetor_de_pressao]')
        cs = ev("currentChar.caminhos")
        check(f'{P} remover base remove dependente', 'mago_vetor_de_pressao' not in cs and apr not in cs and len(cs) == 4, str(cs))
        check(f'{P} aprimoramento travado sem base', pg.locator(f'[data-f=no][data-v={apr}]').is_disabled() and 'Requer Vetor de Pressão' in txt())
        clk('[data-f=no][data-v=mago_vetor_de_pressao]'); clk('[data-f=editar]')
        check(f'{P} concluir volta aos cards', pg.locator('.fc-no').count() == 0 and pg.locator('.fc-hab').count() == 7)

        # Trava em combate (R4)
        clk('#btn-entrar-combate'); pg.wait_for_timeout(80)
        check(f'{P} habilidades da ficha chegam ao combate', pg.locator('.cb-opc').count() == 8)
        ev("fichaAba = 'hab'; irPara('ficha')"); pg.wait_for_timeout(60)
        check(f'{P} em combate: Editar travado', pg.locator('[data-f=editar]').is_disabled() and 'travadas até sair' in txt())
        ev("irPara('combate')"); clk('#btn-sair-combate'); clk('[data-c=sairOk]')
        check(f'{P} fora de combate: Editar livre', ev("telaAtual") == 'ficha' and not pg.locator('[data-f=editar]').is_disabled())

        # Itens
        clk('[data-f=aba][data-v=itens]')
        tot = A['FOR'] * 3
        check(f'{P} kit inicial e slots', 'Armadura Leve' in txt() and 'Arma Média' in txt() and f'2 de {tot} slots' in txt() and 'Moedas' in txt() and '15' in txt())
        clk('[data-f=addItem]')
        check(f'{P} folha adicionar', pg.locator('#folhas .fc-item').count() == ev("Object.keys(EQUIPAMENTOS).length"))
        clk('[data-f=add][data-v=pocao_cura]')
        check(f'{P} poção adicionada', 'Poção de Cura' in txt() and f'3 de {tot} slots' in txt())
        ev("currentHp = 1; renderFicha()"); dado(2)
        idx = ev("inventario.findIndex(i => i && i.itemKey === 'pocao_cura')")
        clk(f'[data-f=item][data-v="{idx}"]'); clk('[data-f=usar]')
        check(f'{P} usar poção cura 1d4 + VIG e consome', ev("currentHp") == min(5, 1 + 2 + A['VIG']) and 'Poção de Cura' not in pg.inner_text('#ficha-corpo'))
        clk('[data-f=fecharRoll]')
        livres = tot - 2
        if livres < 3:
            clk('[data-f=addItem]')
            check(f'{P} item maior que o espaço desabilitado', pg.locator('#folhas [data-v=arma_real]').is_disabled())
            pg.click('#folhas .folha-fundo', position={'x': 5, 'y': 5}); pg.wait_for_timeout(40)
        idx = ev("inventario.findIndex(i => i && i.itemKey === 'arma_media')")
        clk(f'[data-f=item][data-v="{idx}"]'); clk('[data-f=remover]')
        check(f'{P} remover item', 'Arma Média' not in txt() and ev("calcEquipBonuses().dano") == 0)
        clk('[data-f=moedas]'); clk('[data-f=tecla][data-v="5"]'); clk('[data-f=aplicar][data-v=gastar]')
        check(f'{P} moedas gastar', ev("moedas") == 10)
        pg.screenshot(path=str(CAPT / f'e2_{w}_itens.png'), full_page=True)

        # Notas
        clk('[data-f=aba][data-v=notas]')
        pg.fill('#fc-notas', 'Encontramos o ferreiro de Vel.'); pg.wait_for_timeout(500)
        salvo = ev("JSON.parse(localStorage.getItem('d4_chars'))[currentChar.nome].notas")
        check(f'{P} notas salvas sozinhas', salvo == 'Encontramos o ferreiro de Vel.')

        # Recarregar: tudo persiste
        pg.reload(); pg.wait_for_timeout(200)
        check(f'{P} recarregar mantém notas, moedas, itens', ev("notasTexto").startswith('Encontramos') and ev("moedas") == 10
              and ev("calcEquipBonuses().dano") == 0 and len(ev("currentChar.caminhos")) == 5)

        # Personagens
        clk('#btn-personagens')
        check(f'{P} folha Personagens', 'Em uso' in pg.inner_text('#folhas') and 'Criar novo personagem' in pg.inner_text('#folhas'))
        pg.click('#folhas [data-fechar].btn'); pg.wait_for_timeout(40)

        # Modo noite
        ev("aplicarTema('noite'); fichaAba = 'ficha'; renderFicha()")
        dado(3); clk('[data-f=atk]')
        pg.screenshot(path=str(CAPT / f'e2_{w}_noite.png'), full_page=True)
        ev("aplicarTema('dia')")

        # 8 classes, níveis 1 e 3
        r8 = ev("""(() => { const out = [];
          for (const cId of Object.keys(CLASSES)) for (const nv of [1, 3]) {
            const ch = montarPersonagem({ nome: 'T' + cId + nv, rId: 'humano', cId, hId: Object.keys(HISTORICOS)[0], assocId: 'none', nivel: nv,
              rolls: { raca: 1, idade: 1, pf: 1 }, caminhos: MAHOU.filter(h => h.classe === cId && h.tipo === 'base').map(h => h.id) });
            usarNovoPersonagem(ch); fichaAba = 'hab'; fichaUi.editando = true; fichaUi.caminho = 'todos'; irPara('ficha');
            const nos = document.querySelectorAll('.fc-no').length;
            const pts = document.querySelector('.fc-pontos').textContent;
            fichaUi.editando = false; renderFicha();
            out.push([cId, nv, nos, pts, document.querySelectorAll('.fc-hab').length]);
          } return out; })()""")
        ruins = [x for x in r8 if x[2] != 25 or x[3] != f'5 de {4 + 2 * x[1]} pontos de caminho' or x[4] < 5]
        check(f'{P} 8 classes × níveis 1 e 3', not ruins and len(r8) == 16, str(ruins or r8[:2]))
        check(f'{P} console limpo', not erros, '; '.join(erros[:3]))
        ctx.close()
    b.close()

print(f'\n{falhas} falha(s).')
sys.exit(1 if falhas else 0)
