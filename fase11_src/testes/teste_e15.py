#!/usr/bin/env python3
"""teste_e15.py — E15 da fase 11: P2 passos 3, 5, 6, 7, 8 (Compêndio v1.15).

Uso: python teste_e15.py [validar_ficha.py] [_Compendio_Mecanico.md]   (argumentos ignorados)
Regras conferidas:
- passo 3 (D64 Q4, D68, D70, D84): efeitos exibidos em rodadas; "neste ataque" → próximo ataque; buff vale da rodada seguinte;
- passo 5 (D76, D82): teste de morte 1d4 sem VONT; 1-2 falha, 3 sucesso, 4 revive; 2 falhas matam; ajuda = sucesso; atingido = falha;
- passo 6 (D79, D83): +1 de dano por nível contra a raça que sofre, depois da Defesa, em ataque e habilidade;
- passo 7 (D80): atributo mínimo 1 depois do Ponto Fraco;
- passo 8: nomes dos caminhos sinalizados só na exibição; IDs intactos.
"""
import subprocess, sys
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
        fol = lambda: pg.inner_text('#folhas')
        clk = lambda sel: (pg.click(sel), pg.wait_for_timeout(40))
        P = f'{w}px:'
        novo = lambda rId, cId, nivel=1, cams=None: ev(f"""(() => {{ localStorage.removeItem('d4_sessao_turno'); turnoState = null;
            usarNovoPersonagem(montarPersonagem({{ nome: 'E15', rId: '{rId}', cId: '{cId}', hId: Object.keys(HISTORICOS)[0], assocId: 'none', nivel: {nivel},
            rolls: {{ raca: 1, idade: 1, pf: 1 }}, caminhos: {cams or f"MAHOU.filter(h => h.classe === '{cId}' && h.tipo === 'base').map(h => h.id)"} }})); irPara('ficha'); }})()""")

        # ── Passo 3: textos em rodadas ──
        resto = ev("MAHOU.map(h => efeitoRodadas(h.efeito)).filter(t => /\\(1 turno|por 1 turno|2 turnos|1d4\\+1|neste ataque/.test(t))")
        check(f'{P} 200 nós: nenhum "(1 turno)", "2 turnos", "1d4+1" ou "neste ataque" exibido', resto == [], str(resto[:3]))
        check(f'{P} dados.js intacto (texto original)', ev("MAHOU.find(h => h.id === 'soldado_contra_posicao').efeito.includes('neste turno')"))
        check(f'{P} "neste ataque" → "no próximo ataque"',
              'no próximo ataque' in ev("efeitoRodadas(MAHOU.find(h => h.nome === 'Onda de Fogo').efeito)"))
        check(f'{P} "não se mover neste turno" fica (é condição, não duração)',
              'neste turno' in ev("efeitoRodadas(MAHOU.find(h => h.id === 'soldado_postura_de_trincheira').efeito)"))
        novo('elfo', 'soldado', 1, "['soldado_fechamento_de_rota','soldado_contra_posicao','soldado_pressao_marcial']")
        ev("fichaAba = 'hab'; fichaLadoAba = 'hab'; renderFicha()")
        t = pg.inner_text('#tela-ficha')
        check(f'{P} ficha: Contra-Posição em rodadas', 'Defesa (1d4 rodadas)' in t and 'Enraizado (1d4 rodadas)' in t, t[:300])

        # ── Passo 6: bônus racial ──
        pg.click('#btn-entrar-combate'); pg.wait_for_timeout(80)
        clk('[data-v=ataque]'); dado(4); clk('[data-c=exec]'); clk('[data-c=acertou]')
        check(f'{P} ataque: Elfo nv1 +1 contra Demônio depois da Defesa', 'Se o alvo for Demônio: +1 de dano depois da Defesa' in txt(), txt()[-400:])
        log = ev("turnoState.log.map(e => e.msg).join(' | ')")
        check(f'{P} registro com o bônus racial', 'contra Demônio +1 depois da Defesa' in log)
        clk('[data-c=encerrar]')
        clk('[data-v=soldado_pressao_marcial]'); clk('[data-c=exec]'); clk('[data-c=acertou]')
        check(f'{P} habilidade também leva o bônus (D83)', 'Se o alvo for Demônio: +1' in txt())
        clk('[data-c=encerrar]')
        clk('[data-v=soldado_contra_posicao]'); clk('[data-c=exec]')
        c = ev("turnoState.conds.find(c => c.id === 'bonus_defesa')")
        check(f'{P} buff de defesa vale da rodada seguinte (D69)', c and c['apartir'] == ev("turnoState.turno") + 1, str(c))
        ev("sairDoCombate()")
        for rId, alvo in (('humano', 'Anão'), ('anao', 'Elfo'), ('demonio', 'Humano')):
            novo(rId, 'mago', 3)
            br = ev("bonusRacial(currentChar)")
            check(f'{P} {rId} nv3: +3 contra {alvo}', br == {'alvo': alvo, 'v': 3}, str(br))

        # ── Passo 5: morte sem VONT ──
        novo('elfo', 'soldado', 3)
        pg.click('#btn-entrar-combate'); pg.wait_for_timeout(80)
        vont = ev("currentVont")
        ev("salvacaoUsada = true; salvarCombate()")
        while ev("currentHp") > 0: clk('[data-c=menos]')
        f = fol()
        check(f'{P} faces 1 Falha · 2 Falha · 3 Sucesso · 4 Revive', all(x in f for x in ('1 Falha', '2 Falha', '3 Sucesso', '4 Revive')), f[:400])
        check(f'{P} sem pedras de Vontade; VONT fora do teste', pg.locator('.cb-pip').count() == 0 and 'VONT não entra' in f)
        dado(1); clk('[data-c=morte]')
        check(f'{P} rolou 1: falha (não é mais morte imediata)', ev("turnoState.morte.meia") == 1 and not ev("turnoState.morte.morto"))
        check(f'{P} rolar não gasta Vontade', ev("currentVont") == vont)
        dado(3); clk('[data-c=morte]'); clk('[data-c=ajuda]')
        check(f'{P} sucesso + ajuda = 2 sucessos, levanta 1/3', 'Você levantou' in fol() and ev("currentHp") == -(-ev("hpMaxCombate()") // 3))
        clk('[data-c=fecharRen]')
        while ev("currentHp") > 0: clk('[data-c=menos]')
        check(f'{P} nova queda zera marcas', ev("turnoState.morte.suc") == 0 and ev("turnoState.morte.meia") == 0)
        dado(2); clk('[data-c=morte]'); clk('[data-c=atingido]')
        check(f'{P} falha + atingido = 2 falhas, morre', ev("turnoState.morte.morto") is True and 'morreu' in fol())
        pg.screenshot(path=str(SRC / 'testes' / 'capturas' / f'e15_{w}_morte.png'))
        clk('[data-c=fecharQueda]'); clk('[data-c=desfazer]')
        check(f'{P} Desfazer volta a 1 falha', ev("turnoState.morte.meia") == 1 and not ev("turnoState.morte.morto"))
        dado(4); clk('[data-c=morte]')
        check(f'{P} 4 revive na hora com 2/5', 'Você reviveu' in fol() and ev("currentHp") == -(-2 * ev("hpMaxCombate()") // 5))
        clk('[data-c=fecharRen]'); ev("sairDoCombate()")

        # ── Passo 7: atributo mínimo 1 ──
        menor = ev("""(() => { let m = 99;
            for (const r of Object.keys(RACAS)) for (const c of Object.keys(CLASSES)) for (const mo of Object.keys(MOTIVACOES))
              for (const hi of Object.keys(HISTORICOS)) for (const id of Object.keys(IDADES)) {
                const a = calcAttrsV15(r, c, hi, id, 'none', null, mo, { FOR: 1, VIG: 1, AGI: 1, INT: 1, VONT: 1, idade: 1, pf: 4 }, 1);
                m = Math.min(m, ...Object.values(a)); }
            return m; })()""")
        check(f'{P} atributo mínimo 1 com Ponto Fraco 4 em todas as combinações (D80)', menor == 1, str(menor))

        # ── Passo 8: nomes sinalizados ──
        novo('elfo', 'mago')
        ev("fichaAba = 'hab'; fichaLadoAba = 'hab'; fichaUi.caminho = 'todos'; fichaUi.editando = true; renderFicha()")
        cabs = ev("[...document.querySelectorAll('.fc-nos-cam')].map(e => e.textContent)")
        check(f'{P} cabeçalhos sinalizados', cabs[:5] == [ev(f"CAMINHO_SINAL.{k}") for k in ('chama', 'mares', 'raiz', 'sopro', 'veu')], str(cabs))
        check(f'{P} pentagrama: nome curto + título sinalizado',
              ev("[...document.querySelectorAll('.fc-cam[data-v=veu]')].every(e => e.textContent === 'Véu' && e.title === 'Véu/Kashiwir/Kashitiefer/Makosetz')"))
        check(f'{P} IDs dos caminhos intactos', ev("Object.keys(CAMINHOS).join()") == 'chama,mares,raiz,sopro,veu')
        estouro = ev("[...document.querySelectorAll('.fc-nos-cam')].some(e => e.scrollWidth > e.clientWidth + 1 || e.getBoundingClientRect().right > innerWidth)")
        check(f'{P} nome longo não estoura', not estouro)
        pg.screenshot(path=str(SRC / 'testes' / 'capturas' / f'e15_{w}_caminhos.png'), full_page=True)

        check(f'{P} sem erro de console', not erros, '; '.join(erros[:3]))
    b.close()

print(f'\n{falhas} falha(s)')
sys.exit(1 if falhas else 0)
