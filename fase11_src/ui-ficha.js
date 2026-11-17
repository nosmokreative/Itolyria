// ═══════════════════════════════════════════
// UI — FICHA (E2): faixa vital, atributos, perícias, habilidades, itens, notas.
// Reaproveita da fase 10: calcEquipBonuses, danoFormula, efeitoTxt, PERICIAS, MAHOU, EQUIPAMENTOS.
// ═══════════════════════════════════════════
const FICHA_ABAS = [['ficha', 'Ficha'], ['hab', 'Habilidades'], ['itens', 'Itens'], ['notas', 'Notas']];
const DADO_ATRIBUTO = 4;   // E10 (autor): teste de atributo = sempre 1d4 + atributo (perícia segue 1d8)
const DADO_VONTADE = 4;    // passagem (protótipo aprovado): Vontade rola 1d4 + VONT
const PENTA_POS = {        // posições do protótipo (caixa 300×260)
  chama: [115, 0], mares: [230, 84], raiz: [186, 214], sopro: [44, 214], veu: [0, 84],
};
let fichaAba = 'ficha';
let fichaLadoAba = 'hab';   // E4: aba da coluna direita na Ficha larga (≥ 1024px)
let fichaUi = { attrs: false, caminho: 'todos', editando: false, roll: null, folha: null, entrada: '', item: -1 };
let notasTimer = null;
// E11 (autor): subir de nível = +3 raça +4 classe +1d4 rolado pelo jogador; nível máximo 5.
const NIVEL_MAX = 5;

const dN = n => 1 + Math.floor(Math.random() * n);

// ── Cálculos de apoio ──
// E14 (D78): recarga em rodadas — dados.js segue com "3 turnos" (teste_e0 compara com a fase 10); a troca é só na exibição.
function recargaRodadas(t) { return String(t || '').replace(/turno(s?)/g, 'rodada$1'); }
// E15 (P2 passo 3; D64 Q4, D68, D70, D84): exibição do efeito em rodadas. dados.js intacto (textos novos: P5).
function efeitoRodadas(t) {
  return String(t || '')
    .replace(/\(1 turno( cada)?\)/g, '(1d4 rodadas$1)')
    .replace(/por 1 turno/g, 'por 1d4 rodadas')
    .replace(/(`[a-z_]+`) (neste turno|até o início do próximo turno|até o próximo turno|no próximo turno)/g, '$1 (1d4 rodadas)')
    .replace(/neste ataque/g, 'no próximo ataque')
    .replace(/duração 2 turnos/g, 'duração 1d4 rodadas')
    .replace(/duram 1d4\+1/g, 'duram 1d4 rodadas')
    .replace(/Dura até fim do próximo turno/g, 'Dura 1d4 rodadas');
}
function hpMaxFicha() { return currentChar.hpMax + calcEquipBonuses().hp; }
function slotsTotal() { return (currentChar.attrs.FOR || 0) * 3; }
function slotsUsados() {
  return inventario.reduce((s, it) => s + (it && EQUIPAMENTOS[it.itemKey] ? EQUIPAMENTOS[it.itemKey].slots : 0), 0);
}
function bonusItem(eq) {
  const b = [];
  if (eq.dano) b.push(`+${eq.dano} dano`);
  if (eq.defesa) b.push(`+${eq.defesa} Defesa`);
  if (eq.hp) b.push(`+${eq.hp} vida`);
  if (eq.ataque) b.push(`+${eq.ataque} ataque`);
  if (eq.consumivel) b.push('cura 1d4 + VIG');
  return b.join(', ');
}
// R4: habilidades travadas enquanto houver combate em andamento deste personagem.
function emCombateAtivo() {
  if (turnoState && turnoState.nomePersonagem === currentChar.nome) return true;
  try {
    const s = JSON.parse(localStorage.getItem(TURNO_STORAGE_KEY));
    return !!(s && s.nomePersonagem === currentChar.nome);
  } catch (e) { return false; }
}
function arvoreClasse() { return arvoreDe(currentChar.cId); }
// E6b: árvore ordenada por caminho de origem (Chama, Marés, Raiz, Sopro, Véu): base e depois os
// aprimoramentos que saem dela. No vault, os "X para Chama" vêm no bloco da Chama; aqui vão para o caminho X.
function arvoreDe(cId) {
  const ordem = Object.keys(CAMINHOS), pos = k => ordem.indexOf(k);
  return MAHOU.filter(h => h.classe === cId).sort((a, b) =>
    pos(a.caminho) - pos(b.caminho) || (a.tipo === 'base' ? -1 : b.tipo === 'base' ? 1 : 0)
    || pos(a.transicao ? a.transicao.para : a.caminho) - pos(b.transicao ? b.transicao.para : b.caminho));
}
function baseDe(h, arv) {
  return arv.find(b => b.tipo === 'base' && (h.prereq ? b.nome === h.prereq : b.caminho === h.caminho));
}
function tipoHab(h) {
  return h.transicao ? `${CAMINHOS[h.transicao.de].nome} para ${CAMINHOS[h.transicao.para].nome}` : `Base de ${CAMINHOS[h.caminho].nome}`;
}
function metaHab(h) {
  const dano = h.formula ? `Dano ${danoFormula(currentChar.cId, currentChar.attrs)}, ação` : 'Sem dano, ação livre';
  return `${dano}. Alvo: ${h.alvo}. Recarga ${recargaRodadas(h.recarga)}.`;
}

// ── Rolagens ──
// ── Subir de nível (E11) ──
function ganhoFixoNivel() { return (RACAS[currentChar.rId].hpNivel || 0) + HP_CLASSE_NIVEL; }
// Ficha ao lado do combate (≥1024) é desenhada antes de a sessão começar: a tela atual também conta.
function emCombateOuTela() { return emCombateAtivo() || telaAtual === 'combate'; }
function podeSubir() { return currentChar.nivel < NIVEL_MAX && !emCombateOuTela(); }
function rolarDadoNivel() {
  if (currentChar.dadoNivel || !podeSubir()) return;      // R6: rola uma vez (fica salvo até confirmar)
  currentChar.dadoNivel = dN(4);
  dadoPop({ rotulo: `Vida do nível ${currentChar.nivel + 1}`, face: currentChar.dadoNivel,
    bonus: [['raça', RACAS[currentChar.rId].hpNivel || 0], ['classe', HP_CLASSE_NIVEL]] });
  salvarPersonagem(); renderFolhaFicha();
}
function confirmarNivel() {
  const ch = currentChar, d = ch.dadoNivel;
  if (!d || !podeSubir()) return;
  const ganho = ganhoFixoNivel() + d, soma = CLASSES[ch.cId].somaNivel;
  ch.nivel += 1;
  Object.keys(soma).forEach(k => { ch.attrs[k] += soma[k]; });     // REG-PROG-ATR
  ch.hpMax += ganho; currentHp += ganho;
  ch.vontMax = calcVontMax(ch.nivel); currentVont += 1;
  ch.pontosCaminho = 4 + 2 * ch.nivel;
  ch.dadosVida = (ch.dadosVida || []).concat(d);
  delete ch.dadoNivel;
  salvarPersonagem();
  fichaUi.folha = null; fichaUi.editando = true; fichaUi.caminho = 'todos';
  if (layoutAtual() === 'ficha2') fichaLadoAba = 'hab'; else fichaAba = 'hab';
  renderFicha(); window.scrollTo(0, 0);
  showToast(`Nível ${ch.nivel}. Escolha 2 habilidades.`);
}
function htmlFolhaNivel() {
  const ch = currentChar, n = ch.nivel, d = ch.dadoNivel, fixo = ganhoFixoNivel();
  const atk = Object.entries(CLASSES[ch.cId].somaNivel).map(([k, v]) => `+${v} ${k}`).join(', ');
  const vida = d
    ? `<span class="num fc-niv-v">+${fixo + d}</span><span class="suave num">${RACAS[ch.rId].hpNivel} raça + ${HP_CLASSE_NIVEL} classe + 1d4[${d}]. Vida máxima ${ch.hpMax} → ${ch.hpMax + fixo + d}.</span>`
    : `<span class="suave num">${RACAS[ch.rId].hpNivel} raça + ${HP_CLASSE_NIVEL} classe + 1d4.</span>
       <button type="button" class="btn btn-cheio fc-niv-rolar" data-f="rolarNivel">Rolar 1d4 de vida</button>`;
  return `<span class="num suave">Nível ${n} → ${n + 1}</span>
    <div class="fc-niv"><div class="fc-niv-l"><strong>Vida</strong>${vida}</div>
      <div class="fc-niv-l"><strong>Atributo de ataque</strong><span class="num">${esc(atk)}</span></div>
      <div class="fc-niv-l"><strong>Vontade máxima</strong><span class="num">${ch.vontMax} → ${calcVontMax(n + 1)}</span></div>
      <div class="fc-niv-l"><strong>Pontos de caminho</strong><span class="num">${ch.pontosCaminho} → ${4 + 2 * (n + 1)}. Escolha 2 habilidades.</span></div></div>
    <button type="button" class="fc-ap cura" data-f="confirmarNivel" ${d ? '' : 'disabled'}>${d ? `Confirmar nível ${n + 1}` : 'Role o dado de vida'}</button>`;
}
function htmlSecNivel() {
  const n = currentChar.nivel, max = n >= NIVEL_MAX, comb = emCombateOuTela();
  const nota = max ? 'Nível máximo.' : comb ? 'Em combate: suba de nível depois de sair.'
    : `Próximo nível: +${ganhoFixoNivel()} + 1d4 de vida, atributo de ataque e 2 pontos de caminho.`;
  return `<section class="fc-sec fc-nivel"><div class="fc-linha"><h2 class="fc-h2">Nível <span class="num">${n} de ${NIVEL_MAX}</span></h2>
      ${max ? '' : `<button type="button" class="btn fc-subir" data-f="nivel" ${comb ? 'disabled' : ''}>Subir de nível</button>`}</div>
    <p class="suave fc-p">${nota}</p></section>`;
}

function rolarFicha(rotulo, dado, bonus, det) {
  const r = dN(dado), total = r + bonus;
  const partes = [`1d${dado}[${r}]`].concat(det || [`${bonus}`]);
  let txt = `${rotulo}: ${partes.join(' + ')} = ${total}`;
  if (dado === 8 && r === 8) txt += '. 8 natural: sucesso automático.';
  fichaUi.roll = { total: String(total), txt, repetir: { rotulo, dado, bonus, det } };
  dadoPop({ rotulo, lados: dado, face: r, bonus: dpPartes(det || [`${bonus}`]), total,
    nota: dado === 8 && r === 8 ? '8 natural: sucesso automático.' : '' });
  renderRolagemFicha();
}
function rolarAtaqueFicha() {
  const a = currentChar.c.atkAttr, v = attrEfetivo(a), eq = calcEquipBonuses();
  const det = [`${a} ${v}`]; if (eq.ataque) det.push(`equipamento ${eq.ataque}`);
  rolarComEfeitos(`Ataque ${a}`, 4, v + eq.ataque, det, 'ataque', a);
}
// E6: soma os efeitos ativos (e consome os de "próximo"); "Rolar de novo" não reaplica.
function rolarComEfeitos(rotulo, dado, bonus, det, tipo, attr) {
  const m = modsRolagem(tipo, attr);
  if (m.det.length) salvarEfeitos();
  rolarFicha(rotulo, dado, bonus + m.soma, det.concat(m.det.map(x => x.replace(/^\+ /, ''))));
  if (fichaUi.roll) { fichaUi.roll.repetir = { rotulo, dado, bonus, det }; fichaUi.roll.txt = fichaUi.roll.txt.replace(/ \+ −/g, ' −'); }
  renderFicha();
}
function perVal(p) { return Math.floor((attrEfetivo(p.a) + attrEfetivo(p.b)) / 2); }

// ── Vida e moedas (teclado) ──
function aplicarTeclado(acao) {
  const n = parseInt(fichaUi.entrada, 10) || 0;
  const max = hpMaxFicha();
  let total, txt;
  if (acao === 'dano') {
    let perda = n;
    const notas = [];
    if (n > 0 && temCond('absorcao_total')) {
      tirarCond('absorcao_total'); perda = 0; notas.push('Absorção Total anulou o dano');
    } else if (n > 0 && temCond('reducao_dano')) {
      const r = dN(4); tirarCond('reducao_dano'); perda = Math.max(0, n - r);
      dadoPop({ rotulo: 'Redução de Dano', face: r, nota: `Absorveu ${n - perda} de ${n}. Você perde ${perda}.` });
      notas.push(`Redução de Dano 1d4[${r}] absorveu ${n - perda}`);
    }
    currentHp = Math.max(0, currentHp - perda);
    total = '−' + perda;
    txt = `Dano recebido${notas.length ? '. ' + notas.join('. ') : ''}. Vida ${currentHp}/${max}`;
    if (currentHp === 0) txt += '. Vida 0: entre em combate para a queda.';
  } else if (acao === 'cura') {
    currentHp = Math.min(max, currentHp + n);
    total = '+' + n; txt = `Cura aplicada. Vida ${currentHp}/${max}`;
  } else {
    const ganho = acao === 'ganhar';
    moedas = Math.max(0, moedas + (ganho ? n : -n));
    total = (ganho ? '+' : '−') + n; txt = `Moedas: ${moedas}`;
  }
  fichaUi.folha = null; fichaUi.roll = { total, txt };
  salvarEfeitos();
  renderFicha();
}

// ── Habilidades ──
function alternarNo(id) {
  if (emCombateAtivo()) return;
  currentChar.caminhos = alternarNoLista([...(currentChar.caminhos || [])], id, arvoreClasse(), currentChar.pontosCaminho);
  salvarPersonagem();
  renderFicha();
}

// ── Itens ──
function adicionarItem(key) {
  const eq = EQUIPAMENTOS[key];
  if (!eq || slotsUsados() + eq.slots > slotsTotal()) return;
  const i = inventario.indexOf(null);
  const antes = hpMaxFicha();
  if (i >= 0) inventario[i] = { itemKey: key }; else inventario.push({ itemKey: key });
  currentHp += Math.max(0, hpMaxFicha() - antes);   // E6: vida extra do item entra na vida atual
  fichaUi.folha = null; fichaUi.roll = null;
  salvarPersonagem(); renderFicha(); showToast(`${eq.nome} adicionado.`);
}
function removerItem(i) {
  const it = inventario[i]; if (!it) return;
  inventario[i] = null; fichaUi.folha = null; fichaUi.roll = null;
  currentHp = Math.min(currentHp, hpMaxFicha());
  salvarPersonagem(); renderFicha(); showToast(`${EQUIPAMENTOS[it.itemKey].nome} removido.`);
}
function usarConsumivelFicha(i) {
  const it = inventario[i]; if (!it || !EQUIPAMENTOS[it.itemKey].consumivel) return;
  const vig = currentChar.attrs.VIG, r = dN(4), cura = r + vig, max = hpMaxFicha();
  currentHp = Math.min(max, currentHp + cura);
  inventario[i] = null; fichaUi.folha = null;
  dadoPop({ rotulo: EQUIPAMENTOS[it.itemKey].nome, face: r, bonus: [['VIG', vig]], nota: `Vida ${currentHp}/${max}.` });
  fichaUi.roll = { total: '+' + cura, txt: `${EQUIPAMENTOS[it.itemKey].nome}: 1d4[${r}] + VIG ${vig} = ${cura}. Vida ${currentHp}/${max}` };
  salvarPersonagem(); renderFicha();
}

// ── Eventos ──
function iniciarFicha() {
  const tela = document.getElementById('tela-ficha');
  tela.addEventListener('click', cliqueFicha);
  tela.addEventListener('input', e => {
    if (e.target.id !== 'fc-notas') return;
    notasTexto = e.target.value;
    clearTimeout(notasTimer);
    notasTimer = setTimeout(salvarPersonagem, 400);
  });
  document.getElementById('btn-entrar-combate').addEventListener('click', () => {
    fichaUi.editando = false; fichaUi.roll = null; irPara('combate');
  });
  document.getElementById('btn-personagens').addEventListener('click', abrirPersonagens);
}

function cliqueFicha(e) {
  const b = e.target.closest('[data-f]');
  if (!b || b.disabled) return;
  const v = b.dataset.v;
  switch (b.dataset.f) {
    case 'aba':
      if (layoutAtual() === 'ficha2') { fichaLadoAba = v; fichaUi.editando = false; renderFicha(); return; }
      fichaAba = v; fichaUi.editando = false; renderFicha(); window.scrollTo(0, 0);
      document.getElementById('tela-ficha').scrollTop = 0; return;
    case 'attrs': fichaUi.attrs = !fichaUi.attrs; renderFicha(); return;
    case 'attr': { const a = attrEfetivo(v); rolarComEfeitos(v, DADO_ATRIBUTO, a, [`${v} ${a}`], 'attr', v); return; }
    case 'atk': rolarAtaqueFicha(); return;
    case 'vont': { const a = attrEfetivo('VONT'); rolarComEfeitos('Vontade', DADO_VONTADE, a, [`VONT ${a}`], 'attr', 'VONT'); return; }
    case 'per': { const p = PERICIAS[+v], val = perVal(p);
      rolarComEfeitos(p.nome, 8, val, [`${val}`], 'pericia'); return; }
    case 'denovo': { const r = fichaUi.roll && fichaUi.roll.repetir; if (r) rolarFicha(r.rotulo, r.dado, r.bonus, r.det); return; }
    case 'fecharRoll': fichaUi.roll = null; renderRolagemFicha(); return;
    case 'caminho': fichaUi.caminho = v; renderFicha(); return;
    case 'editar': if (!emCombateAtivo()) { fichaUi.editando = !fichaUi.editando; renderFicha(); } return;
    case 'no': alternarNo(v); return;
    case 'vida': fichaUi.folha = 'vida'; fichaUi.entrada = ''; renderFolhaFicha(); return;
    case 'moedas': fichaUi.folha = 'moedas'; fichaUi.entrada = ''; renderFolhaFicha(); return;
    case 'item': fichaUi.folha = 'item'; fichaUi.item = +v; renderFolhaFicha(); return;
    case 'addItem': fichaUi.folha = 'add'; renderFolhaFicha(); return;
    case 'nivel': if (podeSubir()) { fichaUi.folha = 'nivel'; renderFolhaFicha(); } return;
  }
}

function cliqueFolhaFicha(e) {
  const f = document.getElementById('folhas');
  const fechar = () => { fichaUi.folha = null; f.innerHTML = ''; };
  if (e.target.classList.contains('folha-fundo')) { fechar(); return; }
  const b = e.target.closest('[data-f]');
  if (!b || b.disabled) return;
  const v = b.dataset.v;
  switch (b.dataset.f) {
    case 'fechar': fechar(); return;
    case 'tecla':
      if (v === 'Apagar') fichaUi.entrada = fichaUi.entrada.slice(0, -1);
      else if (v === 'Limpar') fichaUi.entrada = '';
      else fichaUi.entrada = (fichaUi.entrada + v).replace(/^0+(?=\d)/, '').slice(0, 3);
      document.getElementById('fc-entrada').textContent = fichaUi.entrada || '0';
      return;
    case 'aplicar': aplicarTeclado(v); return;
    case 'add': adicionarItem(v); return;
    case 'remover': removerItem(fichaUi.item); return;
    case 'usar': usarConsumivelFicha(fichaUi.item); return;
    case 'rolarNivel': rolarDadoNivel(); return;
    case 'confirmarNivel': confirmarNivel(); return;
  }
}

// ── Render ──
function renderFicha() {
  const ch = currentChar;
  const av = document.getElementById('ficha-avatar');
  av.innerHTML = currentPhotoDataUrl ? `<img src="${currentPhotoDataUrl}" alt="">` : esc(ch.nome[0] || '?');
  document.getElementById('ficha-nome').textContent = ch.nome;
  document.getElementById('ficha-linha').textContent = linhaPersonagem(ch);
  document.getElementById('ficha-vital').innerHTML = htmlVital();
  const abas = { ficha: htmlAbaFicha, hab: htmlAbaHab, itens: htmlAbaItens, notas: htmlAbaNotas };
  const nav = (lista, atual) => lista.map(([id, nome]) =>
    `<button type="button" data-f="aba" data-v="${id}" aria-current="${atual === id ? 'page' : 'false'}">${nome}</button>`).join('');
  const lado = document.getElementById('ficha-lado-corpo'), duas = layoutAtual() === 'ficha2';
  // E4: na Ficha larga, a aba Ficha fica à esquerda e Habilidades, Itens e Notas em abas à direita.
  const aba = duas ? 'ficha' : fichaAba;
  document.getElementById('ficha-nav').innerHTML = duas ? '' : nav(FICHA_ABAS, fichaAba);
  document.getElementById('ficha-lado-nav').innerHTML = duas ? nav(FICHA_ABAS.slice(1), fichaLadoAba) : '';
  document.getElementById('ficha-corpo').innerHTML = abas[aba]();
  lado.innerHTML = duas ? abas[fichaLadoAba]() : '';
  if (aba === 'notas' || (duas && fichaLadoAba === 'notas')) document.getElementById('fc-notas').value = notasTexto;
  renderRolagemFicha();
  renderFolhaFicha();
}

function htmlVital() {
  const max = hpMaxFicha(), a = currentChar.c.atkAttr, eq = calcEquipBonuses();
  const atk = attrEfetivo(a) + eq.ataque, vont = attrEfetivo('VONT'), def = defesaEfetiva();
  const cls = currentHp <= 0 ? 'zero' : (currentHp <= max * 0.4 ? 'baixa' : '');
  return `<button type="button" class="fc-v fc-vida ${cls}" data-f="vida" aria-label="Vida ${currentHp} de ${max}. Tocar para dano ou cura">
      <span class="num fc-v-n">${currentHp}/${max}</span><span class="fc-v-r">Vida</span></button>
    <button type="button" class="fc-v fc-atk" data-f="atk" aria-label="Rolar ataque, 1d4 mais ${a} ${atk}">
      <span class="num fc-v-n">${atk}</span><span class="fc-v-r">Ataque ${a}</span></button>
    <button type="button" class="fc-v fc-vont" data-f="vont" aria-label="Rolar Vontade, 1d${DADO_VONTADE} mais VONT ${vont}">
      <span class="num fc-v-n">${vont}</span><span class="fc-v-r">Vontade</span></button>
    <div class="fc-v fc-def" role="status" aria-label="Defesa ${def.total}${def.notas.length ? ', ' + def.notas.join(', ') : ''}">
      <span class="num fc-v-n">${def.total}</span><span class="fc-v-r">Defesa</span></div>`;
}

function htmlAbaFicha() {
  const A = {}, atk = currentChar.c.atkAttr, ab = fichaUi.attrs;
  ATTRS.forEach(k => { A[k] = attrEfetivo(k); });
  const resumo = ab ? `Toque em um atributo para rolar 1d${DADO_ATRIBUTO} + valor` : ATTRS.map(k => `${k} ${A[k]}`).join(', ');
  const grade = ab ? `<div class="fc-attrs" role="group" aria-label="Atributos">${ATTRS.map(k =>
    `<button type="button" class="fc-attr${k === atk ? ' atk' : ''}" data-f="attr" data-v="${k}" aria-label="Rolar ${k}, 1d${DADO_ATRIBUTO} mais ${A[k]}">
      <span class="fc-attr-k">${k}</span><span class="num fc-attr-v">${A[k]}</span>
      ${notaAttr(k).length ? `<span class="fc-attr-ef num">${esc(notaAttr(k).join(', '))}</span>` : ''}
      ${k === atk ? '<span class="fc-attr-tag">Ataque</span>' : ''}</button>`).join('')}</div>` : '';
  const per = PERICIAS.map((p, i) => {
    const v = perVal(p);
    return `<div class="fc-per"><span class="fc-per-n" title="${esc(p.ex)}">${esc(p.nome)}</span><span class="num fc-per-v">+${v}</span>
      <button type="button" class="fc-per-b" data-f="per" data-v="${i}" aria-label="Rolar ${esc(p.nome)}, 1d8 mais ${v}">Rolar</button></div>`;
  }).join('');
  // E6: efeitos ativos visíveis na ficha (os de combate e os que sobraram dele).
  const efs = condsAtivas().filter(condValendo).map(c => nomeCond(c.id) + (c.val != null ? ` ${COND_VALOR.includes(c.id) && DEBUFFS[c.id] ? '−' : '+'}${c.val}` : '')
    + (DUR_ATE_USAR.includes(c.id) ? ' (próximo uso)' : ''));
  const efHtml = efs.length ? `<section class="fc-sec fc-efeitos" role="status"><h2 class="fc-h2">Efeitos em você</h2>
      <p class="num fc-p">${esc(efs.join(' · '))}</p></section>` : '';
  return `${efHtml}<section class="fc-sec">
      <button type="button" class="fc-attrs-topo${ab ? ' aberto' : ''}" data-f="attrs" aria-expanded="${ab}">
        <span class="fc-attrs-tit"><span class="fc-h2">Atributos</span><span class="num suave">${resumo}</span></span>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 16 16"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>${grade}</section>
    <section class="fc-sec"><h2 class="fc-h2">Perícias</h2>
      <p class="suave fc-p">Cada teste rola 1d8 + o valor da perícia. Só fora de combate.</p>
      <div class="fc-pers">${per}</div></section>${htmlSecNivel()}`;
}

// Pentagrama de filtro e lista de nós: usados na ficha (Editar) e na criação (Ofício).
// attr: nome do atributo de ação ('data-f' na ficha, 'data-cr' na criação).
function htmlPentaCaminhos(atual, attr) {
  const botoes = Object.keys(PENTA_POS).map(id => {
    const [x, y] = PENTA_POS[id], on = atual === id;
    return `<button type="button" class="fc-cam${on ? ' on' : ''}" style="left:${x}px;top:${y}px;--c:var(--${id})" ${attr}="caminho" data-v="${id}" aria-pressed="${on}" title="${nomeCaminho(id)}">${CAMINHOS[id].nome}</button>`;
  }).join('');
  const todos = atual === 'todos';
  return `<div class="fc-penta">
      <svg aria-hidden="true" width="300" height="260" viewBox="0 0 300 260">
        <polygon points="150,22 268,108 223,238 77,238 32,108" fill="none" stroke="var(--linha)" stroke-width="1.5"/>
        <polyline points="150,22 223,238 32,108 268,108 77,238 150,22" fill="none" stroke="var(--linha-fraca)" stroke-width="1"/></svg>
      ${botoes}<button type="button" class="fc-cam fc-todos${todos ? ' on' : ''}" style="left:110px;top:112px;width:80px;--c:var(--tinta)" ${attr}="caminho" data-v="todos" aria-pressed="${todos}">Todos</button></div>`;
}
// nos: nós a mostrar (já filtrados); arv: árvore inteira da classe; sel: ids escolhidos; pts: pontos; acao: atributo do botão.
function htmlListaNos(nos, arv, sel, pts, acao) {
  const varios = new Set(nos.map(h => h.caminho)).size > 1;
  return `<div class="fc-nos">${nos.map((h, i) => {
    const cab = varios && (i === 0 || nos[i - 1].caminho !== h.caminho)
      ? `<h3 class="fc-nos-cam" style="--c:var(--${h.caminho})">${nomeCaminho(h.caminho)}</h3>` : '';
    const on = sel.includes(h.id), base = h.tipo === 'base' ? null : baseDe(h, arv);
    const trav = !!base && !sel.includes(base.id), cheio = !on && sel.length >= pts, dis = trav || cheio;
    const marca = on ? 'Escolhida' : (trav ? 'Requer ' + base.nome : (cheio ? 'Sem pontos' : 'Escolher'));
    return `${cab}<button type="button" class="fc-no${on ? ' on' : ''}${base ? ' apr' : ''}" style="--c:var(--${h.caminho})" ${acao} data-v="${h.id}" aria-pressed="${on}" ${dis ? 'disabled' : ''}>
      <span class="fc-no-dot" aria-hidden="true"></span>
      <span class="fc-no-txt"><strong>${esc(h.nome)}</strong><span class="suave">${tipoHab(h)}${h.formula ? ', causa dano' : ''}</span></span>
      <span class="fc-no-m">${marca}</span></button>`;
  }).join('')}</div>`;
}
// Escolha de nó (mesma regra na ficha e na criação): tirar base tira os aprimoramentos dela;
// aprimoramento exige a base; não passa dos pontos. Devolve a nova lista.
function alternarNoLista(sel, id, arv, pts) {
  const h = arv.find(x => x.id === id);
  if (!h) return sel;
  if (sel.includes(id)) {
    sel = sel.filter(x => x !== id);
    if (h.tipo === 'base') sel = sel.filter(x => { const m = arv.find(k => k.id === x); return !(m && m.tipo !== 'base' && baseDe(m, arv) === h); });
    return sel;
  }
  if (sel.length >= pts) return sel;
  if (h.tipo !== 'base' && !sel.includes((baseDe(h, arv) || {}).id)) return sel;
  return [...sel, id];
}

function htmlAbaHab() {
  const arv = arvoreClasse(), esc_ = currentChar.caminhos || [], pts = currentChar.pontosCaminho;
  const travado = emCombateAtivo(), filtro = h => fichaUi.caminho === 'todos' || h.caminho === fichaUi.caminho;
  if (travado) fichaUi.editando = false;
  const todos = fichaUi.caminho === 'todos';
  const penta = htmlPentaCaminhos(fichaUi.caminho, 'data-f');
  const ed = fichaUi.editando;
  const topo = `<div class="fc-linha"><span class="num fc-pontos">${esc_.length} de ${pts} pontos de caminho</span>
      <button type="button" class="btn${ed ? ' btn-cheio' : ''} fc-editar" data-f="editar" aria-pressed="${ed}" ${travado ? 'disabled' : ''}>${ed ? 'Concluir' : 'Editar'}</button></div>
    <p class="suave fc-p fc-trava"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14"><rect x="2.5" y="6" width="9" height="6.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
      ${travado ? 'Em combate: habilidades travadas até sair do combate.' : 'Troca livre fora de combate. Ao entrar em combate, a escolha trava.'}</p>`;
  let lista;
  if (ed) {
    lista = htmlListaNos(arv.filter(filtro), arv, esc_, pts, 'data-f="no"');
  } else {
    const habs = arv.filter(h => esc_.includes(h.id) && filtro(h));
    const rec = turnoState && turnoState.rec ? turnoState.rec : {};
    lista = `<div class="fc-habs">${habs.length ? '' : '<p class="suave">Nenhuma habilidade deste caminho escolhida. Toque em Editar para escolher.</p>'}
      ${habs.map(h => `<article class="card fc-hab">
        <div class="fc-hab-topo"><span class="chip ${h.caminho}">${tipoHab(h)}</span><h3>${esc(h.nome)}</h3>
          <span class="fc-pronta${rec[h.id] > 0 ? ' rec' : ''}">${rec[h.id] > 0 ? `Recarga ${rec[h.id]}` : 'Pronta'}</span></div>
        <p class="fc-hab-ef">${efeitoTxt(efeitoRodadas(h.efeito))}</p>
        <span class="num suave fc-hab-meta">${esc(metaHab(h))}</span></article>`).join('')}
      ${todos ? htmlRaciais() : ''}</div>`;
  }
  return `<section class="fc-sec"><h2 class="fc-h2">Caminhos</h2>${penta}${topo}${lista}</section>`;
}

function htmlRaciais() {
  const rh = currentChar.r && currentChar.r.habRacial;
  if (!rh) return '';
  const a = currentChar.c.atkAttr, b = Math.floor((currentChar.attrs[a] || 0) / 3);
  return `<h3 class="fc-h3">Da raça</h3>` + [rh, rh.ofensiva].filter(x => x && x.nome).map(x => `<article class="card fc-hab">
      <div class="fc-hab-topo"><span class="chip">${esc(currentChar.r.nome)}</span><h3>${esc(x.nome)}</h3></div>
      <p class="fc-hab-ef">${esc(x.efeito)}</p>
      <span class="num suave fc-hab-meta">1d4${b ? ' + ' + b : ''}. Alvo: ${esc(x.alvo)}.</span></article>`).join('');
}

function htmlAbaItens() {
  const tot = slotsTotal(), us = slotsUsados(), forv = currentChar.attrs.FOR || 0;
  const linhas = inventario.map((it, i) => {
    if (!it) return '';
    const eq = EQUIPAMENTOS[it.itemKey]; if (!eq) return '';
    const semFor = eq.reqFOR && forv < eq.reqFOR;
    return `<button type="button" class="fc-item" data-f="item" data-v="${i}">
      <span>${esc(eq.nome)}${semFor ? ` <span class="fc-aviso">requer FOR ${eq.reqFOR}</span>` : ''}</span>
      <span class="num suave">${esc(bonusItem(eq))}</span></button>`;
  }).join('');
  return `<section class="fc-sec"><h2 class="fc-h2">Itens</h2>
    <div class="fc-slots" aria-hidden="true"><div style="width:${tot ? Math.min(100, Math.round(us / tot * 100)) : 0}%"></div></div>
    <span class="num suave fc-p">${us} de ${tot} slots ocupados (FOR × 3)</span>
    <div class="card fc-itens">${linhas}
      <button type="button" class="fc-item" data-f="moedas"><span>Moedas</span><span class="num suave">${moedas}</span></button></div>
    <button type="button" class="fc-add" data-f="addItem">Adicionar item</button></section>`;
}

function htmlAbaNotas() {
  const cr = currentChar && currentChar.rId ? crCronicaDe(currentChar) : [];   // E7: recalculada das escolhas salvas
  return (cr.length ? `<section class="fc-sec fc-cronica"><h2 class="fc-h2">Crônica</h2>
    ${cr.map(t => `<p class="narrativa">${esc(t)}</p>`).join('')}</section>` : '') +
    `<section class="fc-sec"><label for="fc-notas" class="fc-h2">Notas da sessão</label>
    <textarea id="fc-notas" class="fc-notas" rows="10" placeholder="O que aconteceu, quem vocês conheceram, o que ficou pendente"></textarea>
    <span class="suave fc-p">Salvo sozinho neste aparelho.</span></section>`;
}

function renderRolagemFicha() {
  const el = document.getElementById('ficha-rolagem'), r = fichaUi.roll;
  document.getElementById('tela-ficha').classList.toggle('com-rolagem', !!r);   // abre espaço no fim da rolagem
  if (!r) { el.innerHTML = ''; el.classList.add('oculto'); return; }
  el.classList.remove('oculto');
  el.innerHTML = `<div class="fc-roll-n"><span>Número</span><strong class="num">${esc(r.total)}</strong></div>
    <div class="fc-roll-t"><span>Resultado da rolagem</span><span class="num">${esc(r.txt)}</span></div>
    <div class="fc-roll-b">${r.repetir ? '<button type="button" class="fc-denovo" data-f="denovo">Rolar de novo</button>' : ''}
      <button type="button" class="fc-roll-x" data-f="fecharRoll" aria-label="Fechar resultado">${X_SVG}</button></div>`;
}

function renderFolhaFicha() {
  if (!fichaVisivel()) return;
  const f = document.getElementById('folhas'), fu = fichaUi;
  if (!fu.folha) { if (f.dataset.dono === 'ficha') { f.innerHTML = ''; f.onclick = null; } return; }
  const topo = t => `<div class="fc-linha"><h2 class="fc-h2">${t}</h2><button type="button" class="btn btn-texto" data-f="fechar">Fechar</button></div>`;
  let h = '';
  if (fu.folha === 'vida' || fu.folha === 'moedas') {
    const vida = fu.folha === 'vida';
    const teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Limpar', '0', 'Apagar']
      .map(k => `<button type="button" class="fc-tecla" data-f="tecla" data-v="${k}">${k}</button>`).join('');
    const acoes = vida
      ? '<button type="button" class="fc-ap dano" data-f="aplicar" data-v="dano">Receber dano</button><button type="button" class="fc-ap cura" data-f="aplicar" data-v="cura">Curar</button>'
      : '<button type="button" class="fc-ap dano" data-f="aplicar" data-v="gastar">Gastar</button><button type="button" class="fc-ap cura" data-f="aplicar" data-v="ganhar">Ganhar</button>';
    h = `${topo(vida ? `Vida ${currentHp}/${hpMaxFicha()}` : `Moedas ${moedas}`)}
      <span class="num fc-entrada" id="fc-entrada">${fu.entrada || '0'}</span>
      <div class="fc-teclado">${teclas}</div><div class="fc-duas">${acoes}</div>
      ${vida ? '<p class="suave fc-p">Redução de Dano e Absorção Total ativas são descontadas sozinhas.</p>' : ''}`;
  } else if (fu.folha === 'item') {
    const it = inventario[fu.item], eq = it && EQUIPAMENTOS[it.itemKey];
    if (!eq) { fu.folha = null; f.innerHTML = ''; return; }
    h = `${topo(esc(eq.nome))}<span class="num">${esc(bonusItem(eq)) || 'Sem bônus'}. Ocupa ${eq.slots} ${eq.slots > 1 ? 'slots' : 'slot'}.</span>
      ${eq.reqFOR ? `<span class="suave">Requer FOR ${eq.reqFOR}; abaixo disso não dá bônus.</span>` : ''}
      <div class="fc-duas">${eq.consumivel ? '<button type="button" class="fc-ap cura" data-f="usar">Usar</button>' : ''}
        <button type="button" class="fc-ap fantasma" data-f="remover">Remover</button></div>`;
  } else if (fu.folha === 'nivel') {
    if (!podeSubir()) { fu.folha = null; f.innerHTML = ''; return; }
    h = `${topo('Subir de nível')}${htmlFolhaNivel()}`;
  } else if (fu.folha === 'add') {
    const livre = slotsTotal() - slotsUsados(), forv = currentChar.attrs.FOR || 0;
    h = `${topo('Adicionar item')}<span class="suave num">${livre} ${livre === 1 ? 'slot livre' : 'slots livres'}.</span>
      <div class="fc-itens-add">${Object.entries(EQUIPAMENTOS).map(([k, eq]) => {
        const falta = eq.slots > livre, semFor = eq.reqFOR && forv < eq.reqFOR;
        const nota = falta ? 'Sem espaço' : (semFor ? `Requer FOR ${eq.reqFOR}` : `${eq.slots} ${eq.slots > 1 ? 'slots' : 'slot'}`);
        return `<button type="button" class="fc-item" data-f="add" data-v="${k}" ${falta ? 'disabled' : ''}>
          <span class="fc-no-txt"><strong>${esc(eq.nome)}</strong><span class="suave">${esc(bonusItem(eq))}</span></span>
          <span class="num fc-no-m">${nota}</span></button>`;
      }).join('')}</div>`;
  }
  f.dataset.dono = 'ficha';
  f.innerHTML = `<div class="folha-fundo"><div class="folha" role="dialog" aria-label="${fu.folha === 'vida' ? 'Alterar vida' : fu.folha === 'moedas' ? 'Moedas' : fu.folha === 'nivel' ? 'Subir de nível' : 'Itens'}">${h}</div></div>`;
  f.onclick = cliqueFolhaFicha;
}

function abrirPersonagens() {
  fichaUi.folha = null;
  const saves = lerSaves();
  const itens = Object.keys(saves).map(n => {
    const s = saves[n], ch = s.char, emUso = currentChar && n === currentChar.nome;
    const av = s.photo ? `<img src="${s.photo}" alt="">` : esc(n[0] || '?');
    return `<button type="button" class="card fc-perso${emUso ? ' uso' : ''}" data-abrir="${encodeURIComponent(n)}">
      <span class="avatar" aria-hidden="true">${av}</span>
      <span class="fc-no-txt"><strong>${esc(n)}</strong><span class="suave">${esc(linhaPersonagem(ch))}</span></span>
      <span class="fc-no-m">${emUso ? 'Em uso' : 'Abrir'}</span></button>`;
  }).join('');
  const f = document.getElementById('folhas');
  f.dataset.dono = 'pers';
  f.innerHTML = `<div class="folha-fundo" data-fechar><div class="folha" role="dialog" aria-label="Personagens">
    <div class="fc-linha"><h2 class="fc-h2">Personagens</h2>
      <button type="button" class="btn btn-texto" data-fechar>Fechar</button></div>
    ${itens}
    <button type="button" class="btn btn-cheio" data-novo style="border-radius:14px;min-height:52px">Criar novo personagem</button>
    <button type="button" class="btn" data-acao="tema" data-tema-rotulo style="border-radius:14px"></button>
    <p class="suave fc-p">Raça, origem, personalidade e ofício não mudam depois de criados. Na ficha você troca habilidades (fora de combate), itens e notas.</p>
  </div></div>`;
  aplicarTema(document.documentElement.dataset.tema);
  f.onclick = e => {
    const abrir = e.target.closest('[data-abrir]');
    if (abrir) {
      f.innerHTML = ''; fichaUi = { ...fichaUi, roll: null, editando: false, folha: null };
      carregarPersonagem(decodeURIComponent(abrir.dataset.abrir)); irPara('ficha'); return;
    }
    if (e.target.closest('[data-novo]')) { f.innerHTML = ''; irPara('criacao'); return; }
    if (e.target.matches('[data-fechar]') || e.target.closest('button[data-fechar]')) f.innerHTML = '';
  };
}
