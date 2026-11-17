# SDD ledger — plan: doc "Ficha D4 — Passagem de bastão (fase 11)" (https://claude.ai/artifact/KrxJosBaM6rv4dF4MxYn3o)
Compêndio seguido: v1.15 (D63–D85; E13, E14, E15) (ver `01 - Planos\00 - Mapa.md`). Plano: `01 - Planos\P2 - Ficha.md`.
Spec: mesmo doc (seções Protótipo, Decisões, Plano). Protótipo: canvas 91906058.
Pre-flight: E0 produz módulos/estado/navegação que E1–E3 consomem; nomes de estado global da fase 10 mantidos para reaproveitar funções por script.
E0: Ruling: app.js extra (estado de tela, salvamento, tema) — plano não nomeia módulo para isso — custo se errado: renomear 1 arquivo.
E0: Ruling: gerarFicha dividido; núcleo puro montarPersonagem(sel) em app.js, parte de DOM vai para ui-criacao na E3 — wizard antigo sai — custo: nenhum dado perdido.
E0: Ruling: botão de tema na folha Personagens (ficha) e ícone no topo de Criação/Combate — cabeçalho da ficha quebrava "Elfo mago, nível 1" em 390px — custo: 2 toques para trocar tema na ficha.
E0: Ruling: paleta noite além de fundo/papel/tinta definida por mim (contraste para escuro) — protótipo só dá 3 cores — custo: ajuste de valores.
E0: Ruling: atalho "Usar personagem de exemplo (Ilwen)" na Criação provisória — sem criação até E3 — custo: sai na E3.
Task E0: complete (commit eaec5ef, tests: teste_e0.py → 57/57 OK; validar_ficha.py 0 falhas)
Final review E0: self-review (sem subagente).
E1: Ruling: habilidade com fórmula = rola ataque e gasta Ação; sem fórmula = Ação Livre (padrão do protótipo) — dados MAHOU não têm campo de ação — custo: trocar 1 regra em opcoesCombate.
E1: Ruling: efeitos de habilidade — BUFFS vão para "Em você"; DEBUFFS são do alvo e aparecem só como texto ("No alvo: X. Avise o mestre.") (R5) — custo: nenhum dado.
E1: Ruling: raciais entram em "O que fazer" (fase 10 já tinha recarga para elas): alvo Si = Livre, Alvo = Ação; rolam 1d4 + atributo/3, sem teste de acerto.
E1: Ruling: modificadores automáticos no ataque: bonus_ataque (+1d4, consome), amedrontado (−1d4, consome), cego (−1d4), lentidao (−2 se AGI), enfraquecido/bonus_for (±1d4 se FOR), invisivel some; ataque_extra libera a Ação ao acertar.
E1: Ruling: toque na Vida abre teclado "Receber dano / Curar" (mesmo da Ficha); dano com vida 0 = atingido caído (R3).
E1: Ruling: Salvação Garantida por botão no pop-up de queda (protótipo), não automática como na fase 10.
E1: Ruling: botão "Rolar iniciativa (1d8)" só no turno 1 — protótipo omitia; regra existe (lentidao −2, bonus_defesa +1d4).
E1: Ruling: "Sair do combate" pede confirmação numa folha; registro (log) em folha "Registro do combate", com exportação .txt.
E1: Ruling: Desfazer em pilha de até 30 passos, só em memória (não sobrevive a recarregar a página).
E1: teste_e0.py ajustado: saída do combate agora confirma (sairOk).
Task E1: complete (tests: teste_e1.py → 0 falhas, 390 e 1440px; teste_e0.py → 0 falhas; validar_ficha.py 0 falhas)
Pendente E1: fontes não carregam no sandbox de teste (sem rede); conferir visual com Cinzel/Alegreya no navegador do autor.
E2: Ruling: atributo da ficha rola 1d8 + valor (REG-PER-ATR, fora de combate); protótipo dizia 1d4 — constante DADO_ATRIBUTO em ui-ficha.js — custo: trocar 1 número.
E2: Ruling: Ataque (1d4 + atributo + equipamento) e Vontade (1d4 + VONT) na faixa, como na passagem; ficha não aplica condições à rolagem (isso é do combate).
E2: Ruling: perícia 1d8 + valor (fase 10 rolava 1d4, contra REG-PER-01); 8 natural mostra "sucesso automático" (REG-PER-CRT).
E2: Ruling: teclado de vida desconta Redução de Dano (1d4) e Absorção Total das condições salvas; vida 0 fora de combate só avisa (queda é do combate).
E2: Ruling: moedas viram campo salvo (moedas, 15 no kit; saves antigos sem o campo = 15), editadas pelo mesmo teclado (Gastar/Ganhar).
E2: Ruling: Itens = lista + folha "Adicionar item" (EQUIPAMENTOS, bloqueia sem espaço); tocar no item abre Remover/Usar (poção 1d4 + VIG, consome).
E2: Ruling: raciais aparecem em Habilidades, grupo "Da raça", só no filtro Todos (combate já as usa).
E2: Ruling: R4 — Editar travado enquanto houver sessão de combate deste personagem (turnoState ou d4_sessao_turno); cards mostram "Recarga N" durante o combate.
E2: Ruling: remover base remove os aprimoramentos cuja base (prereq) é ela; aprimoramento exige a base do próprio caminho.
Task E2: complete (tests: teste_e2.py → 0 falhas, 390 e 1440px; teste_e1.py e teste_e0.py → 0 falhas; validar_ficha.py 0 falhas)
Pendente E2: confirmar dado do atributo (1d8 Compêndio x 1d4 protótipo); "Vetor de Pressão" segue com Enraizado 1d4 turnos (pendência antiga).
E3: Ruling: textos narrativos do protótipo viram campos narrativa/frase em RACAS, HISTORICOS, IDADES, ASSOCIACOES, ESTILOS (22 linhas, por script); desc dos históricos mantido.
E3: Ruling: as 10 motivações (protótipo tinha 7); Mercantes segue os dados: +1 VONT, Bardo +1 AGI (protótipo dizia só VONT).
E3: Ruling: cada etapa exige as respostas para seguir (botão diz "Falta: …"); nome obrigatório; topo só abre etapas já liberadas — protótipo deixava pular — custo: afrouxar crPodeIr.
E3: Ruling: tela de história só segue com os dados rolados; sem "Rolar de novo" (R6). Trocar raça/idade/motivação depois mantém o dado já rolado.
E3: Ruling: Ofício só com bases (5 de 6 pontos no máximo); aprimoramentos e ponto que sobra ficam para Editar na ficha. Trocar de ofício zera as bases.
E3: Ruling: Defesa da prévia = raça + classe + 1 da armadura leve do kit (como o protótipo); Vida pela calcHP.
E3: Ruling: Gerar aleatório sorteia nome só se vazio, mantém dados já rolados (R6), 3 bases sorteadas, vai para Ofício.
E3: Ruling: nome repetido bloqueia a criação (não sobrescreve save); foto reduzida a 256px JPEG; Cancelar só aparece com personagem aberto.
E3: Ruling: atalho "Usar personagem de exemplo" saiu; testes e0–e2 abrem Ilwen por personagemExemplo(). teste_e0 ignora narrativa/frase na conferência com a fase 10.
Task E3: complete (tests: teste_e3.py → 0 falhas, 390 e 1440px; teste_e0/e1/e2 → 0 falhas; validar_ficha.py 0 falhas)
Pendente E3: desktop da criação (prévia lateral) fica para E4; rodapé só limitado a 760px.
E4: Ruling: layout por largura em body[data-layout]: estreito (<1024), largo (criação ≥1024), ficha2 (Ficha ≥1024), duplo (Combate ≥1024). 600–1023 = coluna de 760px, grades de 3 (perícias, ofícios) e folhas como janela central (máx. 520px).
E4: Ruling: Ficha ≥1024 — aba Ficha fixa à esquerda (420px), Habilidades/Itens/Notas em abas à direita (fichaLadoAba); navegação inferior some.
E4: Ruling: Combate ≥1024 — ficha completa à esquerda (420px, abas no topo, sem faixa vital nem "Entrar em combate": a vida mora no combate), combate à direita com centro (ações, O que fazer, resultado) e lateral (Vida/Defesa, Em você, aviso, registro aberto com as 12 últimas entradas + exportar). Cada coluna rola sozinha; rodapé fixo só na coluna do combate.
E4: Ruling: foco — painel clicado/focado fica normal, o outro 45%; ao entrar no combate o foco é o combate. Clique num painel re-renderiza o outro (poção na ficha aparece na vida do combate). Painel do clique lido na captura (antes de fechar folha/trocar tela).
E4: Ruling: no celular a ordem do protótipo se mantém (cb-centro/cb-lateral com display: contents e Vida com order −1); aviso foi para depois de "Em você" como antes.
E4: Ruling: #folhas tem dono (ficha/combate/pers); combate não apaga folha da ficha nem trata cliques dela.
E4: Ruling: atalhos só no combate e sem folha aberta: R = teste de morte se caído, senão iniciativa (turno 1) ou Confirmar; Enter = Confirmar (fora de botão focado); E = Encerrar turno. Ignorados em campos de texto.
E4: Ruling: Criação ≥1024 — escolhas em até 640px à esquerda, prévia + botões num card fixo à direita (300px); a história fica centrada na coluna das escolhas.
E4: Ruling: teste_e1 no desktop confere o registro na lateral (o botão de registro só existe abaixo de 1024px).
Task E4: complete (tests: teste_e4.py → 0 falhas em 390, 800, 1024, 1440, 1920px; teste_e0–e3 → 0 falhas; validar_ficha.py 0 falhas)
Pendente E4: fontes reais (Cinzel/Alegreya) só no navegador do autor; conferir ficha ao lado do combate com conteúdo longo de habilidades.
E5: Ruling: teste_e5.py roda sem validar_ficha.py/_Compendio_Mecanico.md (não estão no vault; argumentos opcionais). teste_e0–e4 rodados com caminho falso: única falha em cada é a do validador.
E5: Ruling: nível 3 montado por montarPersonagem (mesmas escolhas do nível 1) — a interface não tem "subir nível" — custo: nenhum, é lacuna de produto, não de teste.
E5: Ruling: raças rodadas pela interface (elfo, humano, anão, demônio) voltando à etapa 2 depois de Gerar aleatório; dados rolados se mantêm (R6).
Task E5: complete (tests: teste_e5.py → 0 falhas, 504 checagens, 390 e 1440px, 8 classes × níveis 1 e 3; teste_e0–e4 → 0 falhas fora do validador)
Achado E5: aviso "X foi criado." continua na tela ao entrar logo no combate e cobre a legenda das faces (2 Meia morte, 3 Sucesso) na folha de queda em 390px.
Achado E5: sem "subir nível" na ficha; nível só muda criando de novo.
Achado E5: vida igual em todas as raças (hpMin 5, hpNivel 3 + 4 da classe = 5 / 12 / 19) — conferir se o vault diferencia por raça.
Pendente E5: validar_ficha.py e _Compendio_Mecanico.md fora do vault; capturas e5_* para revisão do autor.
E5b: Ruling: Ofício na criação usa a mesma escolha da ficha (Editar): pentagrama de filtro + árvore inteira (5 bases + 20 aprimoramentos), 6 pontos, aprimoramento exige a base, tirar base tira os dela. Substitui a ruling E3 "Ofício só com bases". Funções compartilhadas em ui-ficha.js: htmlPentaCaminhos, htmlListaNos, alternarNoLista (ficha e criação usam as mesmas).
Task E5b: complete (tests: teste_e3.py → 0 falhas fora do validador; teste_e0–e2, e4, e5 → 0 falhas fora do validador)
E6: Ruling (autor): todo efeito conta a partir do turno seguinte ao que entrou — cada condição guarda t (turno em que entrou); encerrar turno só desconta se t < turno. 1 turno aplicado no turno N vale até o fim do turno N+1.
E6: Ruling (autor): efeitos de "próximo" (bonus_ataque, bonus_dano, bonus_teste, reducao_dano, amedrontado, desorientado, absorcao_total) duram até serem usados, em qualquer turno — DUR_ATE_USAR em ui-combate.js; dados.js intacto (teste_e0).
E6: Ruling: bonus_defesa, bonus_for e enfraquecido rolam 1d4 ao entrar e guardam val; Defesa mostrada = raça + classe + equip + Bônus − 1 (Vulnerável/Caído); FOR efetivo entra no ataque e no dano das habilidades (attrEfetivo); iniciativa usa o mesmo val.
E6: Ruling: condDados (turno, valor) salvo no personagem junto de conditions; ficha e combate usam as mesmas funções (temCond, tirarCond, modsRolagem). Ficha: faixa com Defesa (4º bloco), "Efeitos em você", atributos/perícias/ataque com efeitos; perícia consome bonus_teste, VONT consome desorientado, AGI sofre lentidão. Substitui ruling E2 "ficha não aplica condições".
E6: Ruling: raciais aplicam em você — Fluxo Arcano (bonus_defesa = resultado, Enraizado só no turno seguinte via apartir), Pulso (cura + Vulnerável), Forja (bonus_dano mín. 2 + Vulnerável), Frenesi (bonus_dano), Grito de Ferro (bonus_ataque). "Aumenta resistência/vigor" fica texto.
E6: Ruling: dano de arma = só a maior (danoArma); item com vida soma na vida atual ao equipar, remove limita ao máximo.
E6: teste_e1 (expiração em 1 turno → vale no turno 2; bonus_ataque até usar) e teste_e2 (Defesa na ficha) ajustados à regra nova.
Task E6: complete (tests: teste_e6.py → 0 falhas, 390 e 1440px; teste_e0–e5 → 0 falhas fora do validador)
E6b: Ruling: árvore ordenada por caminho de origem (arvoreDe): base e depois os aprimoramentos que saem dela, na ordem Chama, Marés, Raiz, Sopro, Véu. Os "X para Chama" (vindos do bloco da Chama no vault) ficam no caminho X. Em "Todos", cabeçalho por caminho. Combate lista as escolhidas na mesma ordem. dados.js intacto.
Task E6b: complete (tests: teste_e6.py → 0 falhas; teste_e0–e5 → 0 falhas fora do validador)
E7: Ruling (autor): interlúdios com uma frase fechada por escolha, tom poético/medieval, sem montagem por peças. Frases em CR_CRONICA (ui-criacao.js), não em dados.js (teste_e0 intacto). Sem gênero: só o nome é sujeito explícito.
E7: Ruling (autor): frases da crônica só nos interlúdios e na crônica; cards de escolha seguem com a narrativa da E3. Caminhos não geram frase.
E7: Ruling: fluxo Ofício → interlúdio 3 ("O ofício", sem dados, botão "Ler a crônica") → Crônica de {Nome} (3 parágrafos + selo, botão "Criar personagem"). Voltar desfaz um passo por vez. crHistoria() removida.
E7: Ruling: crônica não é salva; crCronicaDe(char) recalcula das escolhas e aparece no topo da aba Notas (vale para saves antigos).
E7: teste_e3 ajustado (interlúdios, crônica, Notas); teste_e4/e5 passam por interlúdio 3 e crônica antes de criar.
Task E7: complete (tests: teste_e0–e6 → 0 falhas fora do validador)
E7b: Revisão da E7. Frases sem gênero: "Quer provar, a si e ao mundo…" (forte) e "sem nunca ter conhecido o frio" (herd).
E7b: Ruling: chip do interlúdio 3 mostra a Defesa da prévia (raça + classe + kit), não a defBase da classe.
E7b: Ruling: CSS da E7 num bloco só; interlúdios voltam a 24px (E3), crônica 18px.
E7b: teste_e3 confere Defesa do chip = prévia, ausência de gênero em CR_CRONICA e 24px no interlúdio.
Task E7b: complete (tests: teste_e0–e6 → 0 falhas fora do validador)
E7c: Ruling (autor): cards de escolha sem texto lúdico (raça, histórico, idade, lealdade, estilo): só nome e efeito. Motivação mostra "Fraqueza: x"; painel da fraqueza diz "Peso da fraqueza" (sem pf.desc). O texto se descobre no interlúdio. narrativa/frase seguem em dados.js (teste_e0).
E7c: teste_e3: card sem .cr-opc-txt e sem narrativa.
Task E7c: complete (tests: teste_e0–e6 → 0 falhas fora do validador)
E7d: Ruling: interlúdios e crônica sem aria-live (eram relidos inteiros a cada render). Região #cr-anuncio (.so-leitor, role=status) no shell anuncia só o dado: "Dado de raça: 3.".
E7d: teste_e3: anúncio do dado, ausência de aria-live no interlúdio; caminho Gerar aleatório → interlúdio 3 → crônica (3 parágrafos, nome 1×) → criar.
Pendente E7d: crPainel (cards de escolha) ainda tem aria-live recriado a cada render.
Task E7d: complete (tests: teste_e0–e6 → 0 falhas fora do validador)
E7e: Ruling: crPainel sem aria-live (era recriado a cada render). Escolha anuncia em #cr-anuncio só o efeito: "Anão: +1d4 VIG, rola na próxima tela e Defesa 2."; motivação junta a fraqueza ("…; fraqueza −1d4 VIG, …"). Lido do DOM após o render (queueMicrotask em crPick); seções com data-bloco.
E7e: teste_e3: painel sem aria-live, anúncio da raça e da motivação.
Task E7e: complete (tests: teste_e0–e6 → 0 falhas fora do validador)
E8: Ruling: abrir folha esconde aviso (toast) anterior — MutationObserver em #folhas (app.js). Resolve Achado E5 ("X foi criado." cobria a legenda da queda em 390px). Aviso disparado com a folha aberta segue aparecendo.
E8: teste_e5: aviso forçado antes da queda some ao abrir a folha (falhava 16× sem a correção).
Task E8: complete (tests: teste_e0–e6 → 0 falhas fora do validador)
E9: Ruling (autor): Enraizado aplicado por habilidade = 1 turno, como na tabela de condições. 11 habilidades trocadas em dados.js (Fechamento de Rota, Silêncio Ensaiado, Exploração do Ponto Fraco, Rota Fechada, Fogueira Concentrada, Corrente Espiritual, Ancoragem Projetada, Eco do Vazio, Vetor de Pressão, Interferência Resonante, Desvio de Fluxo). Fecha Pendente E2 (Vetor de Pressão).
E9: Ruling: Corrente Espiritual "Teste >6: duração 1d4+2" → "2 turnos" (mantém o ganho do teste alto) — custo se errado: trocar 1 texto. Onda de Choque "1d4+1" é de lentidão/desorientado, não mudou.
E9: teste_e0 compara com a fase 10 aplicando a troca da E9 e confere ausência de "1d4 turnos".
Task E9: complete (tests: teste_e0–e6 → 0 falhas fora do validador)
E9b: Ruling: Devoção Escalante (aliado adjacente: duração 1d4) → 2 turnos, mesma lógica da Corrente Espiritual — escapou da E9 por estar escrita diferente.
E9b: Vault atualizado: Sistemas/Sistema_de_Mahou_-_SkillTree_v3_corrigido.md — 10× "(1d4 turnos)" → "(1 turno)"; Corrente Espiritual (1 turno; teste >6 → 2 turnos); Devoção Escalante (aliado → 2 turnos). Onda de Choque 1d4+1 mantida.
Task E9b: complete (tests: teste_e0–e6 → 0 falhas fora do validador)
E10: Ruling (autor): teste de atributo = sempre 1d4 + atributo (DADO_ATRIBUTO 4 em ui-ficha.js); perícia segue 1d8. Fecha Pendente E2 (dado do atributo). Sem "natural" no atributo (crítico é só do 8 da perícia).
E10: Ruling (autor): vida não muda por raça. Fecha Achado E5 (vida igual em todas as raças) sem mudança.
E10: teste_e2: atributo 1d4[4] + valor e rótulo "1d4".
Task E10: complete (tests: teste_e0–e6 → 0 falhas fora do validador)
E11: Ruling (autor): subir de nível = vida +3 (raça, todas) +4 (classe, todas) +1d4 rolado pelo jogador; nível máximo 5. Fecha Achado E5 (sem "subir nível").
E11: Ruling: seção "Nível N de 5" no fim da aba Ficha com botão "Subir de nível" (some no 5; travado em combate, inclusive ficha ao lado do combate). Popup (folha 'nivel'): Vida, atributo de ataque (+somaNivel da classe, REG-PROG-ATR), Vontade máx (nível+1), pontos de caminho (4+2×nível). Confirmar só depois do dado.
E11: Ruling: dado de vida rola uma vez — fica em char.dadoNivel (salvo) até confirmar; fechar e reabrir mantém. Ao confirmar: vida máx e atual +ganho, Vontade atual +1, dado vai para char.dadosVida, abre Habilidades em Editar + aviso "Escolha 2 habilidades".
E11: Ruling: calcHP (calculo.js, fase 10) intacto — vale para montarPersonagem em nível >1 (testes, saves antigos). Save antigo sem dadosVida sobe normalmente a partir da vida que tem.
E11: teste_e11.py — 390 e 1440px: popup, trava em combate, dado único, ganhos, salvar, níveis 2→5 (vida 43 com dados 2,1,4,3), máximo. Capturas e11_*.
Task E11: complete (tests: teste_e11.py → 0 falhas; teste_e0–e6 → 0 falhas fora do validador)
E12: Conferência da Pendente E4 (ficha ao lado do combate com conteúdo longo): mago nível 5 com 14 habilidades em 1024, 1279, 1280, 1440px. Em 1024–1279 o centro do combate ficava com ~190px (slots Movimento/Ação/Livre e cards estouravam). ≥1280 sem estouro.
E12: Ruling: 1024–1279 com a ficha ao lado — combate em uma coluna (centro 556px em 1024), Vida/Defesa e Em você no topo, registro em botão como abaixo de 1024. ≥1280 mantém centro + lateral. Só CSS.
E12: teste_e4: em 1024 confere uma coluna (Vida acima, registro em botão); em todas as larguras largas, nada estoura no combate. Fecha Pendente E4 (conteúdo longo); fontes reais seguem com o autor.
Task E12: complete (tests: teste_e0–e6, e11 → 0 falhas fora do validador)
Planos 2026-11-11: projeto dividido em P1 Sistema, P2 Ficha (este), P3 Livro, P4 Painel (`G:\Meu Drive\Obsidian\_Planos\`).
Pendente P2 (bloqueado por P1 v1.14): regras de rodada do autor — rodada = todos na ordem da iniciativa; efeito no adversário e buff de classe valem na rodada seguinte; cura em si na hora; "1 turno" = 1d4 rodadas rolado ao aplicar; mesma condição soma rodadas. Substitui E6. Recarga 3 turnos → rodadas (DV7).
Achado: `validar_ficha.py` existe em `G:\Meu Drive\Obsidian\Livro Basico\` (junto do `_Compendio_Mecanico.md`); não está fora do vault. Pendente P2: apontar teste_e0–e6 para lá.
Aviso P1 (12/11/2026): Compêndio v1.14 publicado — D63 `COND-DUR` em rodadas (1d4, vale de R+1, inclusive Exausto/Bloqueado/Surpreso/Marcado); D64 timing (adversário na rodada seguinte; cura em si na hora; buff de classe na seguinte; "neste próprio ataque" → próximo ataque; 1 ataque/rodada; consumo até usar; condição em R conta para quem age depois); D65 soma rodadas, efeito não; 1 rolagem por efeito; defesa bem-sucedida → duração ÷ 2; D66 veneno/fogo máx. 3 rodadas. Fecha DV6. Ficha segue v1.13 até implementar. ⚑ Q1, Q6, Q7, Q8, R5 abertas no P1.
Divergências com o Compêndio v1.13 (decisão do autor em P1): DV1 atributo 1d4 × 1d8; DV2 nível máx. 5 × 10; DV3 vida +1d4 × fixa; DV4 atingido caído meia morte × falha; DV5 troca de habilidade fora de combate × descanso longo.

Achado (12/11/2026): `estilo.css` perdeu o bloco E12 (`@media 1024–1279`, combate em uma coluna); o HTML montado ainda o tinha. Rebuild dava 2 falhas no teste_e4. Bloco restaurado do HTML; rebuild idêntico (selo 526256f099).
Suíte (12/11/2026, vault reorganizado): teste_e0–e6, e11 → 0 falhas; validar_ficha.py 0 falhas. Args: `04 - Livro Basico\validar_ficha.py`, `_Compendio_Mecanico.md`; fase 10 em `99 - Arquivo\Ficha - fases antigas (etapa2 a fase10)\`. Caminhos relativos de `montar_ficha.py` e testes OK em `05 - Ficha D4\`. Fecha P2 passos 5, 6, 12.

## Ver também

[[00 - Início|Início]] · [[01 - Planos/P2 - Ficha|P2 Ficha]] · [[05 - Ficha D4/plano_ficha_itolyria|Plano da ficha]] · [[04 - Livro Basico/_Compendio_Mecanico|Compêndio]] · [[05 - Ficha D4/Design da Ficha/Estilo|Estilo]]
Aviso P1 (12/11/2026, tarde): Compêndio v1.15 publicado — decisões do autor D67–D85. Rodadas: rola o atacante (D67); todo buff/debuff/efeito/condição = 1d4 rodadas, teto 1d4, consumo acaba ao consumir, veneno/fogo máx. 1d4 (D68, revoga o teto de 3); tudo na rodada seguinte, exceto cura, Enraizado e efeitos de movimento/debuffs de ação (na hora, se a iniciativa permitir), e dano (na hora) (D69); "(1 turno)" dos nós = 1d4 (D70); Surpreso tira 1 turno inteiro, sem 1d4 (D71); combo de Véu na rodada seguinte (D72). DV: atributo 1d4 (D73), nível 5 (D74), vida +3 +4 +1d4 (D75), troca fora de combate (D77) — já iguais à ficha. Mudam na ficha: morte = 2 sucessos levantam, 2 falhas matam, ajudado = sucesso, atacado = falha, sem ligação com VONT (D76); recarga 3 rodadas, conta sempre (D78); bônus racial `danoBonus` 3 → 1 por nível, depois da Defesa (D79); atributo mínimo 1 (D80). Pedido do autor: campo de duração na tela com 1d4, multiplicador de dado e campo de resultado. Confirmações: morte 1 falha · 2 falha · 3 sucesso · 4 revive (D82); +1 racial entra como dano normal, ataque e habilidade (D83); tudo vira 1d4, inclusive "2 turnos" e 1d4+1 (D84); soma de rodadas sem limite (D85). Ficha segue v1.13 + rulings até implementar. Passos: `01 - Planos\P2 - Ficha.md` 1–11.
E13 (12/11/2026, noite): rodadas do Compêndio v1.15 (D63–D72, D84, D85). Substitui a contagem da E6. P2 passo 1. Fecha errata E-20261111-27.
E13: Ruling: contador do topo = "Rodada N" (turnoState.turno segue como nome do campo; 1 turno do personagem por rodada). Registro e exportação em rodadas (R1, [Rodada 1]). Botão "Encerrar turno" mantido: encerra o turno e abre a rodada seguinte.
E13: Ruling: efeito = { dur (rodadas somadas), rol (rolagens 1d4), t (rodada em que entrou), apartir }; vale de apartir ao fim da rodada t + dur (COND-DUR). Duração rolada pela ficha ao aplicar (1d4); valor do mestre entra no passo 2 (campo 1d4 × multiplicador × resultado).
E13: Ruling: na hora (D69) = enraizado, agarrado, caido, exausto, bloqueado, inconsciente. Resto (inclusive buff de dano/defesa e Vulnerável/Lentidão) vale da rodada seguinte. Condição posta pela folha "Adicionar" segue a mesma regra.
E13: Ruling: "até X" (Caído, Agarrado, Inconsciente, Invisível, Reação de Espera) seguem sem 1d4. Buff de consumo (próximo ataque/dano/teste/dano recebido, Absorção Total) = 1d4, acaba ao usar ou no fim (D68).
E13: Ruling: mesma condição soma rodadas sem limite, valor não soma (D65, D85). Folha "Adicionar" ganhou "Defendeu de um efeito igual? Metade do que resta" (botão "X: defendi") — arredonda para baixo.
E13: Ruling: Surpreso sem 1d4 (D71): na rodada 1 sem ação feita, perde a rodada 1; senão, a próxima.
E13: Ruling: debuff de habilidade no alvo — a ficha rola o 1d4 do atacante (D67) e mostra "Enraizado (1d4[3], rodadas 1 a 4)"; uma rolagem por efeito.
E13: Ruling: dados.js intacto (teste_e0 compara com a fase 10); a contagem vive em ui-combate.js (durBase/durCond/fimCond/porCond). Textos "(1 turno)" dos nós ficam para P5/passo 11.
E13: teste_e1 e teste_e6 atualizados para rodadas (repetir soma; Redução/Absorção e Bônus de Defesa/FOR valem na rodada seguinte; Fluxo Arcano soma na Defesa na rodada 2). teste_e13.py novo (57 checagens, 390 e 1440px). Capturas e13_*.
Task E13: complete (tests: teste_e0–e6, e11, e13 → 0 falhas fora do validador; validar_ficha.py 1 falha antiga: REG-PROG-HP espera tabela fixa de HP que a D75 tirou do Compêndio)
E14 (12/11/2026, noite): P2 passos 2 e 4 + validador.
E14: Ruling: campo de duração no topo da folha "Adicionar condição": "1d4 ×" [multiplicador 1–9] [Rolar] = [resultado] rodadas. Resultado preenchido (rolado ali ou digitado = valor do mestre, D67) vira a duração; vazio com multiplicador 1 = a ficha rola 1d4 ao escolher; vazio com N > 1 = rola N × 1d4. Limpa o resultado depois de aplicar; o multiplicador fica. Não vale para Surpreso nem para as "até X". Rótulo na condição: "mestre 3", "2d4[3+3]" ou "1d4[2]".
E14: Ruling: recarga (D78) — contador "volta na rodada R+3" (usou na R; a do uso é a 1ª). Conta sempre: o Encerrar turno avança a recarga mesmo com o turno perdido. Texto "Recarga 3 turnos" dos nós exibido como "3 rodadas" (recargaRodadas em ui-ficha.js); dados.js intacto.
E14: validar_ficha.py (04 - Livro Basico): REG-PROG-HP lê a tabela de componentes da D75 (mínimo 5, raça +3, classe +4) e a linha "HP mínimo" (1d4 = 1); fecha a falha antiga.
E14: teste_e1 ("volta na rodada 4"); teste_e14.py novo (31 checagens, 390 e 1440px). Capturas e14_*.
Task E14: complete (tests: teste_e0–e6, e11, e13, e14 → 0 falhas; validar_ficha.py 0 falhas)
E15 (13/11/2026): P2 passos 3, 5, 6, 7, 8 (Compêndio v1.15). Fecha o passo 10 (cabeçalho e `compendio_seguido` em v1.15).
E15: Ruling: passo 3 — mecânica de buffs já vinha da E13 (rodada seguinte, consumo, teto 1d4, Surpreso). Falta era exibição: `efeitoRodadas` (ui-ficha.js) mostra "(1 turno)", "por 1 turno", "`buff` neste turno/até o próximo turno", "2 turnos", "1d4+1" como 1d4 rodadas e "neste ataque" como "no próximo ataque" (Q4). "Se não se mover neste turno" fica (condição, não duração). dados.js intacto; texto definitivo é do P5.
E15: Ruling: passo 5 (D76, D82) — teste de morte 1d4 sem VONT: 1–2 falha, 3 sucesso, 4 revive (2/5 da vida); 2 falhas matam; ajuda = sucesso; atingido caído = falha. Pedras de Vontade saem da folha de queda; fica a nota "Na mesa, esta regra se chama Vontade. O atributo VONT não entra no teste." Campo interno `morte.meia` mantido (= falhas) para não quebrar saves.
E15: Ruling: passo 6 (D79, D83) — bônus racial = nível do personagem, contra a raça em `RACAS[x].sofre`; aparece no resultado do dano de ataque e de habilidade ("Se o alvo for Demônio: +1 de dano depois da Defesa") e no registro. Ficha não sabe a raça do alvo: o mestre aplica. `danoBonus: 3` em dados.js fica intacto (teste_e0) e não é lido.
E15: Ruling: passo 7 (D80) — já atendido: base 2 e só o Ponto Fraco subtrai, com piso 1 (calcAttrs, fase 10). Sem mudança; teste_e15 confere todas as combinações com Ponto Fraco 4.
E15: Ruling: passo 8 — `CAMINHO_SINAL`/`nomeCaminho` (app.js): cabeçalhos da árvore e sub do combate com o nome sinalizado (ex.: Véu/Kashiwir/Kashitiefer/Makosetz); pentagrama e chips seguem curtos, com o sinalizado no `title`. IDs intactos.
E15: teste_e1, e5, e6 atualizados (morte D76/D82; cabeçalhos sinalizados). teste_e15.py novo (55 checagens, 390 e 1440px). Capturas e15_*; e5_* regeradas (nomes de arquivo "renasceu" mantidos; texto agora "Você reviveu").
Achado E15 (para P1/autor): o recurso Vontade (nível + 1, quadro "Vontade" no topo da ficha) só servia ao teste de morte; com D76 ficou sem uso mecânico. Decidir: tirar o quadro ou dar outro uso.
Achado E15 (para P1): REG-CRIA-01 diz "1d4 em cada um dos cinco" atributos; a ficha (calcAttrs, fase 10) usa base 2 fixa. Confirmar qual vale.
Task E15: complete (tests: teste_e0–e6, e11, e13, e14, e15 → 0 falhas; validar_ficha.py 0 falhas)
Ruling (autor, 13/11/2026): quadro "Vontade" (nível + 1) fica na ficha — o mestre vai usá-lo em testes, mecânica parecida com a Defesa. Fecha o achado E15 do quadro; sem mudança de código.
Ruling (autor, 13/11/2026): atributos seguem o documentado mais atual (Compêndio v1.15 REG-CRIA-01/REG-CRIA-BON e livro cap. 13). Fecha o achado E15 da base.
E16 (13/11/2026): criação pelo REG-CRIA-01 — base 1d4 em cada atributo (FOR, VIG, AGI, INT, VONT); raça +1 fixo no Ponto de Raça (era +1d4); idade +1d4; Ponto Fraco −1d4; piso 1 depois de tudo (D80).
E16: Ruling: `calcAttrsV15` (app.js) substitui `calcAttrs` em montarPersonagem e na prévia. Rolls sem base (`{ raca, idade, pf }`: Ilwen de exemplo, saves e testes antigos) seguem pela calcAttrs da fase 10 — calculo.js intacto (teste_e0).
E16: Ruling: os 5 dados de base rolam no interlúdio "De onde se vem", junto com o dado de idade (cards "FOR · Rolar"); cada um rola uma vez (R6); "Role os N dados para seguir". Prévia mostra "—" no atributo cuja base não foi rolada. Aleatório rola os 5 + idade + fraqueza.
E16: teste_e3 atualizado (6 dados, raça +1, piso 1 com Ponto Fraco 4); teste_e15 confere o piso com base 1 em todas as combinações.
Task E16: complete (tests: teste_e0–e6, e11, e13, e14, e15 → 0 falhas; validar_ficha.py 0 falhas)
E17 (13/11/2026, noite): Bardo/AGI (autor: "tudo sobre a construção de bardo referencia AGI; o contrário está errado"). Achado: Mercantes dava +1 VONT às classes ≠ Bardo (herança da fase 10); canon (vault `Sistema_Core`, Compêndio `merc +1 AGI`, livro cap. 14) = +1 AGI para todos. Ruling: Mercantes +1 AGI sem exceção — `dados.js` (sem attrBardo/attrDemais), `calculo.js`, `app.js`, `ui-criacao.js` (sai o texto "+1 VONT (Bardo: AGI)"). teste_e0 normaliza a linha da fase 10; teste_e3 confere "+1 AGI". Suíte e0–e6, e11, e13, e14, e15: 0 falhas, validador incluído.
E17: Anotações de UX do autor (13/11) registradas como backlog no `01 - Planos\P2 - Ficha.md` (passos 19–30). Estilo visual (fontes, conflitos de design) adiado para o fim do plano.
Task E17: complete (Mercantes AGI)
E18 (13/11/2026, noite): popup central de dado (P2 passo 26, ref. BG3). Módulo novo `ui-dado.js` (`dadoPop`, `dpPartes`, `fecharDadoPop`, `iniciarDadoPop`); `#dado-pop` no `shell.html`; `montar_ficha.py` inclui o módulo. Total no centro, mín/máx abaixo, dado e bônus em linhas; dado gira 650 ms (sem animação com prefers-reduced-motion); face máxima em ouro, face 1 em vermelho. Só exibição: nenhuma regra ou cálculo mudou. Rolagens da mesma ação viram linhas extras do mesmo popup. Fecha com Esc, clique no popup (não aciona o que está embaixo) ou clique fora (que segue valendo). Ligado em: atributo, perícia, ataque, vida do nível, Redução de Dano, consumível (ficha); dados da criação; iniciativa, ataque, dano, racial, Regeneração, duração e valor de condição, campo de duração, morte (combate). Fora: "Gerar aleatório" (7 dados de uma vez) e valores de saves antigos sem valor gravado.
E18: testes antigos (e0–e6, e11, e13–e15) fecham o popup com Esc antes de cada clique, como o jogador. `teste_e18.py` 54 checagens. Suíte e0–e6, e11, e13, e14, e15, e18: 0 falhas, validador incluído.
E18: decisões do autor para os passos 19–22 (13/11): rolagens não mudam se o jogador voltar; interlúdios ficam só com as rolagens, o texto aparece só no final; nome e foto no topo de toda tela da criação; SVGs dos caminhos entram sem simplificar.
Task E18: complete (popup de dado)
