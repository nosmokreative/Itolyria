#!/usr/bin/env python3
"""teste_e3.py — E3/E7 da fase 11: tela Criação (4 etapas, 3 interlúdios, crônica).

Uso: python teste_e3.py <validar_ficha.py> <_Compendio_Mecanico.md>
Monta a ficha, valida e roda a criação no navegador (Playwright), 390px e 1440px.
Capturas: testes/capturas/e3_*.png
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
check('sem atalho provisório do exemplo', 'btn-exemplo' not in H and 'chega na etapa E3' not in H)
for campo, n in (('narrativa:', 22), ('frase:', 22)):
    check(f'dados: {n} campos {campo}', js.count(campo) == n, str(js.count(campo)))

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
        corpo = lambda: pg.inner_text('#criacao-corpo')
        rodape = lambda: pg.inner_text('#cr-rodape')
        def clk(sel):
            pg.locator(sel).first.evaluate("e => e.scrollIntoView({block: 'center'})")
            pg.click(sel); pg.wait_for_timeout(30)
        av = '#cr-rodape .cr-avancar'
        desab = lambda: pg.locator(av).is_disabled()
        P = f'{w}px:'

        # Etapa 1
        check(f'{P} abre na Criação', ev("telaAtual") == 'criacao')
        check(f'{P} 4 etapas', pg.locator('#cr-etapas li').count() == 4 and 'Quem é' in pg.inner_text('#cr-etapas'))
        check(f'{P} Cancelar oculto sem personagem', not pg.locator('#cr-cancelar').is_visible())
        check(f'{P} prévia: Vida 5, Defesa —, atributos — até rolar a base', 'Vida 5' in rodape() and 'Defesa —' in rodape()
              and ev("[...document.querySelectorAll('.cr-attrs strong')].map(e=>e.textContent).join()") == '—,—,—,—,—')
        check(f'{P} sem nome não avança', desab() and 'Falta: nome' in rodape())
        check(f'{P} etapas futuras travadas', pg.locator('#cr-etapas button[data-n="2"]').is_disabled())
        pg.screenshot(path=str(CAPT / f'e3_{w}_1_quem.png'))
        pg.fill('#cr-nome', 'Brisa'); pg.wait_for_timeout(30)
        check(f'{P} com nome avança', not desab() and 'Continuar para origem' in rodape())
        clk(av)

        # Etapa 2: Origem
        check(f'{P} Origem: 4 perguntas', pg.locator('.cr-bloco').count() == 4 and 'De onde você vem?' in corpo())
        check(f'{P} sem pré-seleção', pg.locator('.cr-opc.on').count() == 0 and pg.locator('.cr-painel').count() == 0)
        check(f'{P} E17: Mercantes +1 AGI, sem exceção', 'Bardo: AGI' not in corpo() and ev("crImpactoAssoc('merc')") == '+1 AGI')
        clk('[data-k=rId][data-v=anao]')
        check(f'{P} outras raças esmaecem', pg.locator('[data-k=rId].apagada').count() == 3)
        op = ev("getComputedStyle(document.querySelector('[data-k=rId].apagada')).opacity")
        check(f'{P} esmaecido ~45%', abs(float(op) - .45) < .01, op)
        check(f'{P} painel sem rolar', '+1 VIG e Defesa 2' in corpo())
        check(f'{P} E7e: painel sem aria-live, anúncio do efeito', pg.locator('.cr-painel[aria-live]').count() == 0
              and pg.inner_text('#cr-anuncio') == 'Anão: +1 VIG e Defesa 2.', pg.inner_text('#cr-anuncio'))
        check(f'{P} E7c: card sem texto lúdico', 'Permanência.' not in corpo() and pg.locator('[data-k=rId] .cr-opc-txt').count() == 0)
        check(f'{P} faltam 3 perguntas', desab() and 'histórico, idade, lealdade' in rodape())
        clk('[data-k=hId][data-v=sabio]'); clk('[data-k=idadeId][data-v=idoso]'); clk('[data-k=assocId][data-v=merc]')
        check(f'{P} prévia sem número antes da base (E16)', ev("[...document.querySelectorAll('.cr-attrs strong')].map(e=>e.textContent).join()") == '—,—,—,—,—' and 'Anão' in corpo())
        pg.screenshot(path=str(CAPT / f'e3_{w}_2_origem.png'), full_page=True)
        clk(av)

        # História 1
        t = corpo()
        check(f'{P} interlúdio 1: abertura com nome', 'De onde se vem' in t and 'a primeira tinta escreve um nome: Brisa.' in t, t[:160])
        check(f'{P} interlúdio 1: uma frase por escolha', all(x in t for x in ('Veio do sangue dos anões', 'Cresceu no alto de uma torre',
              'Já tem neve nos cabelos', 'Selou pacto com os Mercantes')) and 'Assim se encerra o primeiro capítulo.' in t, t[:300])
        check(f'{P} E16: 6 dados (5 de base + idade)', pg.locator('.cr-rolar').count() == 6 and 'Atributos base: 1d4 em cada' in corpo())
        check(f'{P} Continuar travado sem dados', desab() and 'Role os 6 dados' in rodape())
        dado(2); clk('[data-d=VIG]')
        check(f'{P} base VIG 2', ev("wzSel.rolls.VIG") == 2 and pg.locator('.cr-rolar').count() == 5)
        check(f'{P} E7d: anúncio só do dado, interlúdio sem aria-live', pg.inner_text('#cr-anuncio') == 'VIG base: 2.'
              and pg.locator('.cr-historia[aria-live]').count() == 0)
        check(f'{P} rola uma vez (R6)', pg.locator('[data-d=VIG]').count() == 0 and ev("wzSel.rolls.VIG") == 2)
        for k in ('FOR', 'AGI', 'INT', 'VONT'): dado(1); clk(f'[data-d={k}]')
        check(f'{P} falta 1 dado', 'Role o dado' in rodape())
        dado(2); clk('[data-d=idade]')
        check(f'{P} chips do que mudou (raça +1 fixo)', 'Anão +1 VIG' in corpo() and 'Velha Guarda +2 INT' in corpo() and 'Mercantes +1 AGI' in corpo())
        pg.screenshot(path=str(CAPT / f'e3_{w}_3_historia1.png'))
        clk('#cr-rodape .cr-voltar')
        check(f'{P} Voltar retorna às escolhas', 'Em que sangue' in corpo() and '+1 VIG e Defesa 2' in corpo())
        check(f'{P} frase da crônica não aparece nos cards', 'Veio do sangue' not in corpo() and 'Cresceu no alto' not in corpo())
        clk(av); clk(av)

        # Etapa 3: Personalidade
        check(f'{P} Personalidade', 'Como você age?' in corpo() and pg.locator('.cr-bloco').count() == 2)
        check(f'{P} 10 motivações', pg.locator('[data-k=motId]').count() == 10)
        clk('[data-k=estId][data-v=protetor]'); clk('[data-k=motId][data-v=magia]')
        check(f'{P} E7e: motivação anuncia fraqueza', pg.inner_text('#cr-anuncio').startswith(pg.inner_text('[data-k=motId][data-v=magia] strong') + ': +1 ')
              and '; fraqueza −1d4 ' in pg.inner_text('#cr-anuncio'), pg.inner_text('#cr-anuncio'))
        t = corpo()
        check(f'{P} fraqueza vem da motivação', 'E o que te trava: isolamento' in t and '−1d4 VIG, rola na próxima tela' in t)
        clk(av)
        t = corpo()
        check(f'{P} interlúdio 2', 'O coração' in t and 'Diante do perigo, põe o próprio corpo' in t and 'Persegue uma magia' in t
              and 'Mas pedir ajuda lhe queima a garganta' in t, t[:300])
        dado(4); clk('[data-d=pf]')
        A = ev("crAttrs()")
        check(f'{P} peso da fraqueza com piso 1 (D80)', A['VIG'] == 1 and 'Isolamento −3 VIG' in corpo(), f'{A}')   # base 2 + raça 1 + estilo 1 − 4 → 1
        pg.screenshot(path=str(CAPT / f'e3_{w}_4_historia2.png'))
        clk(av)

        # Etapa 4: Ofício
        check(f'{P} 8 ofícios', pg.locator('.cr-classe').count() == 8 and 'Bruxo' not in corpo())
        check(f'{P} Criar travado sem ofício', desab() and 'Falta: ofício' in rodape())
        clk('[data-cr=classe][data-v=bardo]')
        check(f'{P} E17: Mercantes +1 AGI no Bardo', ev("crAttrs().AGI") == 2 and ev("crAttrs().VONT") == 1)
        B, A_ = '#tela-criacao .fc-no:not(.apr)', '#tela-criacao .fc-no.apr'
        check(f'{P} árvore inteira: 5 bases + 20 aprimoramentos', pg.locator(B).count() == 5 and pg.locator(A_).count() == 20 and '0 de 6 pontos' in corpo())
        check(f'{P} aprimoramento travado sem base', pg.locator(A_ + '[disabled]').count() == 20 and 'Requer ' in corpo())
        check(f'{P} atributo de ataque sublinhado', pg.inner_text('.cr-attrs .atk span') == 'AGI')
        check(f'{P} Defesa = raça + classe + armadura do kit', 'Defesa 4' in rodape())
        for i in range(5): clk(f'{B} >> nth={i}')
        check(f'{P} 5 de 6 pontos', '5 de 6 pontos' in corpo() and pg.locator(B + '.on').count() == 5)
        clk(f'{B} >> nth=4')
        check(f'{P} desmarcar base', '4 de 6 pontos' in corpo())
        clk(A_ + ':not([disabled])')
        check(f'{P} aprimoramento na criação', '5 de 6 pontos' in corpo() and pg.locator(A_ + '.on').count() == 1)
        clk(A_ + ':not([disabled]):not(.on)')
        check(f'{P} 6 de 6: o resto bloqueia', '6 de 6 pontos' in corpo() and pg.locator('#tela-criacao .fc-no:not(.on):not([disabled])').count() == 0)
        base0 = ev("wzSel.caminhos[0]")
        dep = ev(f"wzSel.caminhos.filter(id => {{ const m = MAHOU.find(h => h.id === id); return m.tipo !== 'base' && baseDe(m, MAHOU.filter(x => x.classe === 'bardo')).id === '{base0}'; }}).length")
        clk(f'#tela-criacao [data-cr=base][data-v="{base0}"]')
        check(f'{P} tirar base tira os aprimoramentos dela', ev("wzSel.caminhos.length") == 5 - dep, f'dep {dep}')
        clk(f'#tela-criacao [data-cr=base][data-v="{base0}"]')
        clk('[data-cr=caminho][data-v=chama]')
        check(f'{P} filtro do pentagrama', pg.locator('#tela-criacao .fc-no').count() == 5 and ev("wzSel.filtro") == 'chama')
        clk('[data-cr=caminho][data-v=todos]')
        pg.screenshot(path=str(CAPT / f'e3_{w}_5_oficio.png'), full_page=True)
        n_cr = ev("wzSel.caminhos.length")
        esperado = ev("calcAttrsV15('anao','bardo','sabio','idoso','merc','protetor','magia',{FOR:1,VIG:2,AGI:1,INT:1,VONT:1,idade:2,pf:4},1)")
        check(f'{P} frase do ofício não aparece na escolha', 'ofício de bardo' not in corpo())
        clk(av)

        # Interlúdio 3: ofício (sem dados; caminhos não geram frase)
        t = corpo()
        check(f'{P} interlúdio 3', 'O ofício' in t and 'Escolheu o ofício de bardo' in t and 'Assim se encerra o terceiro capítulo.' in t
              and pg.locator('.cr-rolar').count() == 0 and 'aprendeu a Chama' not in t, t[:300])
        check(f'{P} interlúdio 3 segue sem dado', not desab() and 'Ler a crônica' in rodape())
        check(f'{P} interlúdio 3: Defesa do chip = prévia', 'Defesa 4' in t and 'Defesa 4' in rodape() and 'Defesa 1' not in t, t[:300])
        check(f'{P} E7b: frases sem gênero', ev("!JSON.stringify(CR_CRONICA).match(/\\bo move\\b|apresentad[oa]|sozinh[oa]/)"))
        check(f'{P} E7b: interlúdio mantém 24px', ev("getComputedStyle(document.querySelector('.cr-historia .cr-hist-txt')).fontSize") == '24px')
        pg.screenshot(path=str(CAPT / f'e3_{w}_5b_historia3.png'))
        clk(av)

        # Crônica
        t = corpo()
        check(f'{P} crônica: título e 1º parágrafo com nome', 'Crônica de Brisa' in t and 'Brisa veio do sangue dos anões' in t, t[:200])
        check(f'{P} crônica: 3 capítulos + selo', pg.locator('.cr-cronica .cr-hist-txt').count() == 3 and 'E aqui a tinta para' in t
              and 'Persegue uma magia' in t and 'Escolheu o ofício de bardo' in t and 'Abre-se o livro' not in t)
        check(f'{P} crônica: botão Criar', 'Criar personagem' in rodape())
        pg.screenshot(path=str(CAPT / f'e3_{w}_5c_cronica.png'), full_page=True)
        clk('#cr-rodape .cr-voltar')
        check(f'{P} Voltar da crônica → interlúdio 3', 'Escolheu o ofício de bardo' in corpo() and 'Crônica de' not in corpo())
        clk(av); clk(av)

        # Ficha
        check(f'{P} Criar abre a Ficha', ev("telaAtual") == 'ficha')
        ch = ev("({a: currentChar.attrs, n: currentChar.nivel, c: currentChar.caminhos.length, hp: currentChar.hpMax, d: currentChar.defesa, cid: currentChar.cId, r: currentChar.rolls})")
        check(f'{P} personagem montado', ch['a'] == esperado and ch['n'] == 1 and ch['c'] == n_cr and ch['hp'] == 5 and ch['d'] == 3 and ch['cid'] == 'bardo', str(ch))
        check(f'{P} Ficha mostra nome e linha', 'Brisa' in pg.inner_text('#tela-ficha') and 'Anão bardo, nível 1' in pg.inner_text('#tela-ficha'))
        check(f'{P} kit inicial', ev("inventario.filter(Boolean).length") == 2 and ev("moedas") == 15)
        check(f'{P} salvo', 'Brisa' in ev("Object.keys(lerSaves())"))
        check(f'{P} crônica nas Notas', ev("htmlAbaNotas().includes('Brisa veio do sangue dos anões')"))

        # Criar novo: Cancelar, nome repetido, Gerar aleatório
        clk('#btn-personagens'); clk('.folha [data-novo]')
        check(f'{P} Criar novo zera a criação', ev("telaAtual") == 'criacao' and ev("wzSel.etapa") == 1 and pg.input_value('#cr-nome') == '')
        check(f'{P} Cancelar visível com personagem', pg.locator('#cr-cancelar').is_visible())
        clk('#cr-cancelar')
        check(f'{P} Cancelar volta à Ficha', ev("telaAtual") == 'ficha' and ev("currentChar.nome") == 'Brisa')
        clk('#btn-personagens'); clk('.folha [data-novo]')
        pg.fill('#cr-nome', 'Brisa'); dado(1)
        clk('[data-cr=aleatorio]')
        s = ev("wzSel")
        check(f'{P} Gerar aleatório preenche tudo', s['etapa'] == 4 and all(s[k] for k in ('rId','hId','idadeId','assocId','estId','motId','cId'))
              and all(s['rolls'].values()) and len(s['caminhos']) == 3 and s['nome'] == 'Brisa', str(s)[:200])
        clk(av)
        t = corpo(); cl = ev("CLASSES[wzSel.cId].nome.toLowerCase()")
        check(f'{P} aleatório → interlúdio 3', 'O ofício' in t and f'ofício de {cl}' in t and 'Ler a crônica' in rodape(), t[:200])
        clk(av)
        t = corpo()
        check(f'{P} aleatório → crônica completa', 'Crônica de Brisa' in t and pg.locator('.cr-cronica .cr-hist-txt').count() == 3
              and t.count('Brisa veio do sangue') == 1 and 'Criar personagem' in rodape(), t[:200])
        clk(av)
        check(f'{P} nome repetido bloqueado', ev("telaAtual") == 'criacao' and ev("wzSel.etapa") == 1 and ev("currentChar.nome") == 'Brisa')
        pg.fill('#cr-nome', 'Brisa II'); clk('#cr-etapas button[data-n="4"]')
        check(f'{P} etapa direta pelo topo', ev("wzSel.etapa") == 4)
        clk(av); clk(av); clk(av)
        check(f'{P} segundo personagem criado', ev("telaAtual") == 'ficha' and ev("currentChar.nome") == 'Brisa II'
              and sorted(ev("Object.keys(lerSaves())")) == ['Brisa', 'Brisa II'])

        # Noite e toque
        clk('#btn-personagens'); clk('.folha [data-novo]')
        ev("alternarTema()"); pg.fill('#cr-nome', 'Noite'); clk(av)
        clk('[data-k=rId][data-v=elfo]')
        pg.screenshot(path=str(CAPT / f'e3_{w}_6_noite.png'))
        ev("alternarTema()")
        alvos = ev("""[...document.querySelectorAll('.tela.ativa button, .tela.ativa a, .tela.ativa label.cr-foto')]
            .filter(e => e.offsetParent).map(e => [e.id || e.className || e.textContent, Math.round(e.getBoundingClientRect().height)])
            .filter(([_, h]) => h < 44)""")
        check(f'{P} toque mínimo 44px', not alvos, str(alvos))
        larg = ev("document.documentElement.scrollWidth <= innerWidth")
        check(f'{P} sem rolagem horizontal', larg)
        check(f'{P} console limpo', not erros, str(erros[:3]))
        ctx.close()
    b.close()
print(f'\n{falhas} falha(s).')
sys.exit(1 if falhas else 0)
