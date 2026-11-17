# Testes

Playwright (Python), larguras 390–1920 px. Cada script imprime `OK`/`FALHA` por checagem e sai com código 1 se houver falha. Capturas em `fase11_src/testes/capturas/` (fora do git).

## Requisitos

```bash
pip install playwright
playwright install chromium
python fase11_src/montar_ficha.py
```

Dependências externas (vault Obsidian, fora deste repo):
- `04 - Livro Basico/validar_ficha.py`
- `04 - Livro Basico/_Compendio_Mecanico.md`
- HTML da fase 10 (só `teste_e0.py`)

## Suíte

| Script | Cobre |
|---|---|
| `teste_e0.py` | módulos, montagem, tokens, navegação, tema noite; extração igual à fase 10 |
| `teste_e1.py` | tela de combate |
| `teste_e2.py` | tela ficha |
| `teste_e3.py` | criação: 4 etapas, interlúdios, crônica |
| `teste_e4.py` | desktop: larguras, colunas, janelas, foco, atalhos |
| `teste_e5.py` | ponta a ponta no navegador |
| `teste_e6.py` | efeitos de habilidades, armas, armaduras |
| `teste_e11.py` | subir de nível |
| `teste_e13.py` | rodadas (v1.15) — 57 checagens |
| `teste_e14.py` | campo de duração, recarga em rodadas — 31 |
| `teste_e15.py` | buffs, morte, bônus racial, nomes de caminho — 55 |
| `teste_e18.py` | popup de dado — 54 |

## Rodar

```bash
cd fase11_src/testes
V="../../../04 - Livro Basico/validar_ficha.py"
C="../../../04 - Livro Basico/_Compendio_Mecanico.md"
python teste_e0.py <fase10.html> "$V" "$C"
for t in e1 e2 e3 e4 e5 e6 e11 e13 e14 e15 e18; do python teste_$t.py "$V" "$C"; done
```

Último resultado (13/11/2026): **0 falhas**, validador incluído.

## Disciplina

- Mudança cirúrgica → rebuild → suíte com 0 falhas antes de entregar.
- Sintaxe: `new Function()` no Node sobre o JS concatenado.
- Toda ruling registrada em `PROGRESSO.md`.
