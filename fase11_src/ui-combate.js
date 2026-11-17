// ═══════════════════════════════════════════
// UI — COMBATE (E1). Fonte: protótipo Combate (canvas 91906058) + regras R1, R3, R5.
// Estado da sessão em turnoState (chave d4_sessao_turno, como na fase 10).
// Vida, Vontade e Salvação continuam nos globais currentHp, currentVont, salvacaoUsada.
// ═══════════════════════════════════════════
let turnoState = null;
let combateDesfazer = [];               // pilha de cópias do estado (só em memória)
let combateUi = { cond: false, sair: false, vida: false, log: false };
// E14 (P2 passo 2): campo de duração na folha Adicionar — dados (multiplicador de 1d4) e resultado (rolado ou do mestre).
let durCampo = { mult: 1, res: null, rol: null };
const TURNO_STORAGE_KEY = 'd4_sessao_turno';
const DESFAZER_MAX = 30;
const SLOTS_COMBATE = [['mov', 'Movimento'], ['acao', 'Ação'], ['livre', 'Livre']];

// Texto direto de cada condição (protótipo) e o que a ficha faz sozinha ao inseri-la.
// Colunas: nome, grupo, efeito, o que a ficha faz.
const COND_TXT = {
  enraizado:    ['Enraizado', 'cond', 'Você não pode se mover. Ataque e ação livre continuam valendo.', 'movimento bloqueado.'],
  exausto:      ['Exausto', 'cond', 'Você perde a ação livre deste turno.', 'ação livre bloqueada.'],
  surpreso:     ['Surpreso', 'cond', 'Você perde 1 turno inteiro: o primeiro do combate ou, no meio dele, o próximo. Sem 1d4.', 'turno inteiro bloqueado.'],
  bloqueado:    ['Bloqueado', 'cond', 'Você perde o turno inteiro.', 'turno inteiro bloqueado.'],
  envenenado:   ['Envenenado', 'cond', 'Perde 1 de vida no início de cada rodada, sem absorção. No fim do turno, 1d4 + VIG acima de 4 encerra.', 'tira 1 de vida no início de cada rodada.'],
  queimando:    ['Queimando', 'cond', 'Perde 1 de vida no início de cada rodada, sem absorção. 1d4 + AGI acima de 4 apaga; usar o movimento apaga e te derruba.', 'tira 1 de vida no início de cada rodada.'],
  cego:         ['Cego', 'cond', 'Ataques e perícias de visão perdem 1d4. Só ataca a 1 metro.', 'já entra nos seus ataques.'],
  caido:        ['Caído', 'cond', 'Conta como Vulnerável e não se desloca. Levantar gasta o movimento.', 'movimento reservado para levantar.'],
  agarrado:     ['Agarrado', 'cond', 'Sem ação de movimento. Escapar: 1d4 + FOR acima de 4.', 'movimento bloqueado.'],
  invisivel:    ['Invisível', 'cond', 'Quem não sabe onde você está não te vê. Acaba quando você ataca.', 'some quando você atacar.'],
  inconsciente: ['Inconsciente', 'cond', 'Não age nem se move. Rola o teste de morte no início do turno.', 'turno bloqueado e teste de queda aberto.'],
  amedrontado:  ['Amedrontado', 'debuff', 'Seu próximo ataque perde 1d4. Some depois que você ataca ou no fim da duração.', 'já entra no seu próximo ataque.'],
  lentidao:     ['Lentidão', 'debuff', '−2 na iniciativa e nos testes de AGI, inclusive ataque com AGI.', 'já entra na iniciativa e nos ataques com AGI.'],
  enfraquecido: ['Enfraquecido', 'debuff', 'Seu FOR perde 1d4 (rolado ao entrar) enquanto durar.', 'já desconta do FOR no ataque e no dano.'],
  desorientado: ['Desorientado', 'debuff', 'Seu próximo teste de VONT perde 1d4. Some ao usar ou no fim da duração.', 'entra no próximo teste de VONT da ficha.'],
  vulneravel:   ['Vulnerável', 'debuff', 'Sua Defesa cai 1: fica mais fácil te acertar e você absorve menos dano.', 'já desconta 1 da Defesa.'],
  marcado:      ['Marcado', 'debuff', 'Todo aliado do inimigo causa +1 de dano em você.', 'avise o mestre: aliados dele causam +1 em você.'],
  bonus_ataque:   ['Bônus de Ataque', 'buff', 'Seu próximo ataque ganha +1d4. Acaba ao usar ou no fim da duração.', 'já entra no próximo ataque.'],
  bonus_dano:     ['Bônus de Dano', 'buff', 'Seu próximo dano ganha +1d4. Acaba ao usar ou no fim da duração.', 'já entra no próximo dano.'],
  bonus_for:      ['Bônus de FOR', 'buff', 'Seu FOR ganha 1d4 (rolado ao entrar) enquanto durar.', 'já soma no FOR do ataque e do dano.'],
  bonus_teste:    ['Bônus de Teste', 'buff', 'Seu próximo teste de perícia ganha +1d4. Acaba ao usar ou no fim da duração.', 'entra no próximo teste de perícia da ficha.'],
  bonus_defesa:   ['Bônus de Defesa', 'buff', 'Sua Defesa ganha 1d4 (rolado ao entrar); a iniciativa também.', 'já soma no número da Defesa.'],
  reducao_dano:   ['Redução de Dano', 'buff', 'O próximo dano que você sofrer perde 1d4. Acaba ao usar ou no fim da duração.', 'desconta 1d4 do próximo dano.'],
  absorcao_total: ['Absorção Total', 'buff', 'O próximo dano que você sofrer é anulado por inteiro. Uma vez por combate.', 'anula o próximo dano.'],
  regeneracao:    ['Regeneração', 'buff', 'Recupera 1d4 de vida na hora.', 'cura na hora.'],
  reacao_espera:  ['Reação de Espera', 'buff', 'A habilidade dispara uma vez quando o alvo age ou se move.', 'avise o mestre quando o gatilho acontecer.'],
  ataque_extra:   ['Ataque Extra', 'buff', 'Se acertar, faz mais um ataque. Uma vez por rodada.', 'libera outro ataque quando você acertar.'],
};
const COND_GRUPOS = [['cond', 'Condições'], ['debuff', 'Penalidades'], ['buff', 'Bônus']];
const BLOQ_TOTAL = ['bloqueado', 'surpreso', 'inconsciente'];
const BLOQ_SLOT = { mov: ['enraizado', 'agarrado', 'caido'], acao: [], livre: ['exausto'] };

const d4c = () => 1 + Math.floor(Math.random() * 4);
const d8c = () => 1 + Math.floor(Math.random() * 8);

// E13 (Compêndio v1.15, D63–D72, D84, D85): a batalha conta em rodadas. Substitui E6.
// "Próximo X": acaba ao ser usado ou no fim da duração (D68).
const DUR_ATE_USAR = ['bonus_ataque', 'bonus_dano', 'bonus_teste', 'reducao_dano', 'amedrontado', 'desorientado', 'absorcao_total'];
// E6: efeitos com valor fixo: rolam 1d4 uma vez ao entrar e o número aparece na tela.
const COND_VALOR = ['bonus_defesa', 'bonus_for', 'enfraquecido'];
// D69: na hora (mesma rodada, se a iniciativa permitir) — Enraizado, efeitos de movimento e debuffs de ação.
// Dano e cura também são na hora, mas não viram condição. Todo o resto vale da rodada seguinte.
const COND_NA_HORA = ['enraizado', 'agarrado', 'caido', 'exausto', 'bloqueado', 'inconsciente'];

// Duração-base: 'd4' (1d4 rodadas, D68/D70/D84), 1 (Surpreso, D71) ou null (dura até um fato: levantar, escapar, acordar, atacar).
function durBase(id) {
  if (id === 'surpreso') return 1;
  const d = (DEBUFFS[id] || BUFFS[id] || {}).dur || '';
  return /^(até|imediato)/.test(d) ? null : 'd4';
}
// Rola a duração: 1d4 do atacante (D67). Uma rolagem por efeito (D65).
function durCond(id) { const b = durBase(id); return b === 'd4' ? d4c() : b; }
// Última rodada em que o efeito vale. Imposto na rodada R com d: vale até o fim de R+d.
// Rótulo de uma rolagem de duração: número = 1d4 rolado pela ficha; texto = vindo do campo.
function rotRol(r) { return typeof r === 'number' ? `1d4[${r}]` : r; }
// Lê o campo de duração. Resultado preenchido (rolado no campo ou digitado do mestre) vale;
// vazio com multiplicador > 1 rola N × 1d4; vazio com 1 → null (a ficha rola 1d4 como antes).
function lerCampoDur() {
  const em = document.getElementById('cb-dur-mult'), er = document.getElementById('cb-dur-res');
  const mult = Math.max(1, Math.min(9, parseInt(em && em.value) || 1));
  const res = er && er.value !== '' ? Math.max(1, parseInt(er.value) || 1) : null;
  durCampo.mult = mult;
  if (res != null) return { total: res, rol: [durCampo.rol && durCampo.res === res ? durCampo.rol : `mestre ${res}`] };
  if (mult === 1) return null;
  const rs = Array.from({ length: mult }, d4c), t = rs.reduce((a, b) => a + b, 0);
  dadoPop({ rotulo: 'Duração', face: rs });
  return { total: t, rol: [`${mult}d4[${rs.join('+')}]`] };
}
function rolarCampoDur() {
  const em = document.getElementById('cb-dur-mult');
  const mult = Math.max(1, Math.min(9, parseInt(em && em.value) || 1));
  const rs = Array.from({ length: mult }, d4c), t = rs.reduce((a, b) => a + b, 0);
  durCampo = { mult, res: t, rol: `${mult}d4[${rs.join('+')}]` };
  dadoPop({ rotulo: 'Duração', face: rs });
}
function fimCond(c) { return c.dur == null ? null : (c.t || 0) + c.dur; }
function nomeCond(id) { return COND_TXT[id] ? COND_TXT[id][0] : ((DEBUFFS[id] || BUFFS[id] || {}).nome || id); }
// ── Efeitos ativos (E6) — servem à ficha e ao combate ──
// Cada efeito: { id, dur (rodadas somadas), rol (rolagens de 1d4), t (rodada em que entrou),
// apartir (rodada em que passa a valer), val, origem }. Vale de apartir ao fim da rodada t + dur.
function emSessao() { return !!(turnoState && currentChar && turnoState.nomePersonagem === currentChar.nome); }
function turnoAgora() { return emSessao() ? turnoState.turno : 0; }
function condsAtivas() {
  if (emSessao()) return turnoState.conds;
  return (conditions || []).map(id => (condDados || []).find(c => c.id === id) || { id, dur: null, t: 0 });
}
function condValendo(c) { return c.apartir == null || c.apartir <= turnoAgora(); }
function acharCond(id) { return condsAtivas().find(c => c.id === id && condValendo(c)); }
function temCond(id) { return !!acharCond(id); }
function tirarCond(id) {
  if (emSessao()) { turnoState.conds = turnoState.conds.filter(c => c.id !== id); return; }
  conditions = (conditions || []).filter(x => x !== id);
  condDados = (condDados || []).filter(c => c.id !== id);
}
// Valor do efeito: o guardado (rolado ao entrar ou vindo de racial) ou 1d4 na hora.
function valorCond(id) { const c = acharCond(id); return c && c.val != null ? c.val : d4c(); }
// Põe um efeito na sessão. Devolve null (novo), 'somou', 'metade' ou 'manteve'.
// D65/D85: a mesma condição soma rodadas, sem limite; o efeito (valor) não soma.
// Se o alvo se defendeu com sucesso do efeito igual, a duração que resta cai à metade (para baixo).
// dCampo: { total, rol: [rótulos] } do campo de duração (passo 2); sem ele, a ficha rola 1d4.
function porCond(id, origem, val, apartir, defendeu, dCampo) {
  const R = turnoState.turno, ex = turnoState.conds.find(c => c.id === id);
  if (ex) {
    if (ex.dur == null) return 'manteve';
    if (defendeu) {
      const resta = Math.max(0, fimCond(ex) - R);
      ex.dur = R - (ex.t || 0) + Math.floor(resta / 2);
      return 'metade';
    }
    const usa = dCampo && durBase(id) === 'd4', d = usa ? dCampo.total : durCond(id);
    ex.dur += d; ex.rol = (ex.rol || []).concat(usa ? dCampo.rol : d);
    if (!usa && durBase(id) === 'd4') dadoPop({ rotulo: `${nomeCond(id)}: mais rodadas`, face: d });
    return 'somou';
  }
  if (defendeu) return 'manteve';
  const usa = dCampo && durBase(id) === 'd4', dur = usa ? dCampo.total : durCond(id);
  const c = { id, dur, t: R, origem };
  if (durBase(id) === 'd4') c.rol = usa ? dCampo.rol.slice() : [dur];
  if (!usa && durBase(id) === 'd4') dadoPop({ rotulo: `${nomeCond(id)}: rodadas`, face: dur });
  if (val != null) c.val = val; else if (COND_VALOR.includes(id)) { c.val = d4c(); dadoPop({ rotulo: `${nomeCond(id)}: valor`, face: c.val }); }
  if (id === 'surpreso') {   // D71: no início do combate perde este turno; no meio, o próximo
    const ag = R === 1 && !Object.values(turnoState.slots).some(Boolean);
    c.apartir = ag ? R : R + 1; c.t = c.apartir - 1;
  } else c.apartir = apartir != null ? apartir : (COND_NA_HORA.includes(id) ? R : R + 1);
  turnoState.conds.push(c);
  return null;
}
// Grava os efeitos onde estiverem (sessão de combate ou ficha).
function salvarEfeitos() { if (emSessao()) salvarCombate(); else salvarPersonagem(); }

// Atributo com os efeitos de valor fixo (Bônus de FOR, Enfraquecido).
function attrEfetivo(k) {
  let v = currentChar.attrs[k] || 0;
  if (k === 'FOR') {
    if (temCond('bonus_for')) v += valorCondFixo('bonus_for');
    if (temCond('enfraquecido')) v -= valorCondFixo('enfraquecido');
  }
  return Math.max(0, v);
}
function valorCondFixo(id) {             // efeito de valor fixo sem valor (save antigo): fixa agora
  const c = acharCond(id);
  if (c.val == null) c.val = d4c();
  return c.val;
}
function notaAttr(k) {
  const n = [];
  if (k === 'FOR' && temCond('bonus_for')) n.push(`+${valorCondFixo('bonus_for')} Bônus de FOR`);
  if (k === 'FOR' && temCond('enfraquecido')) n.push(`−${valorCondFixo('enfraquecido')} Enfraquecido`);
  return n;
}
// Defesa = raça + classe + equipamento + efeitos (Bônus de Defesa, Vulnerável/Caído −1).
function defesaEfetiva() {
  let v = currentChar.defesa + calcEquipBonuses().defesa;
  const notas = [];
  if (temCond('bonus_defesa')) { const b = valorCondFixo('bonus_defesa'); v += b; notas.push(`+${b} Bônus`); }
  if (temCond('vulneravel') || temCond('caido')) { v -= 1; notas.push('−1 Vulnerável'); }
  return { total: Math.max(0, v), notas };
}
// Dano da arma: só a de maior dano conta (duas armas não somam).
function danoArma() {
  const forv = currentChar.attrs.FOR || 0;
  return inventario.reduce((m, it) => {
    const eq = it && EQUIPAMENTOS[it.itemKey];
    if (!eq || eq.tipo !== 'arma' || (eq.reqFOR && forv < eq.reqFOR)) return m;
    return Math.max(m, eq.dano);
  }, 0);
}
// Modificadores de uma rolagem. tipo: 'ataque' | 'pericia' | 'attr'. Consome os efeitos de "próximo".
function modsRolagem(tipo, attr) {
  let soma = 0; const det = [];
  const d = (id, sinal, consome) => {
    const v = valorCond(id); soma += sinal * v; det.push(`${sinal > 0 ? '+' : '−'} ${nomeCond(id)}[${v}]`);
    if (consome) tirarCond(id);
  };
  if (tipo === 'ataque') {
    if (temCond('bonus_ataque')) d('bonus_ataque', 1, true);
    if (temCond('amedrontado')) d('amedrontado', -1, true);
    if (temCond('cego')) d('cego', -1, false);
    if (temCond('invisivel')) { tirarCond('invisivel'); det.push('(Invisível acabou)'); }
  }
  if (tipo === 'pericia' && temCond('bonus_teste')) d('bonus_teste', 1, true);
  if (tipo === 'attr' && attr === 'VONT' && temCond('desorientado')) d('desorientado', -1, true);
  if ((tipo === 'ataque' || tipo === 'attr') && attr === 'AGI' && temCond('lentidao')) { soma -= 2; det.push('− Lentidão 2'); }
  return { soma, det };
}
// O que entra no próximo ataque e no próximo dano (prévia).
function previaProximo() {
  const v = id => { const c = acharCond(id); return c && c.val != null ? `+${c.val}` : '+1d4'; };
  const a = [], dn = [];
  if (temCond('bonus_ataque')) a.push(`${v('bonus_ataque')} Bônus de Ataque`);
  if (temCond('amedrontado')) a.push('−1d4 Amedrontado');
  if (temCond('cego')) a.push('−1d4 Cego');
  if (temCond('bonus_dano')) dn.push(`${v('bonus_dano')} Bônus de Dano`);
  const p = [];
  if (a.length) p.push('Próximo ataque: ' + a.join(', '));
  if (dn.length) p.push('Próximo dano: ' + dn.join(', '));
  return p.join('. ');
}

// ── Sessão ──
function hpMaxCombate() { return currentChar.hpMax + calcEquipBonuses().hp; }
function atkCombate() { const a = currentChar.c.atkAttr; return { attr: a, val: attrEfetivo(a) }; }

function novaSessao() {
  const conds = (conditions || []).filter(id => COND_TXT[id]).map(id => {
    const g = (condDados || []).find(c => c.id === id) || {};
    const c = { id, dur: g.dur !== undefined ? g.dur : durCond(id), t: 0, origem: g.origem || 'ficha' };
    if (g.rol) c.rol = g.rol; else if (g.dur === undefined && durBase(id) === 'd4') c.rol = [c.dur];
    if (g.val != null) c.val = g.val; else if (COND_VALOR.includes(id)) c.val = d4c();
    return c;
  });
  return {
    nomePersonagem: currentChar.nome, turno: 1,
    slots: { mov: false, acao: false, livre: false },
    conds, rec: {}, sel: 'ataque', res: null, aviso: null, log: [],
    morte: { suc: 0, meia: 0, face: 0, res: null, morto: false },
    queda: false, renasceu: null,
  };
}

function iniciarCombate() {
  let salvo = null;
  try { salvo = JSON.parse(localStorage.getItem(TURNO_STORAGE_KEY)); } catch (e) {}
  if (salvo && salvo.nomePersonagem === currentChar.nome && salvo.conds) {
    turnoState = salvo;
  } else {
    turnoState = novaSessao();
    if (currentHp <= 0) currentHp = hpMaxCombate();
    logCombate('Combate iniciado.');
  }
  combateDesfazer = [];
  combateUi = { cond: false, sair: false, vida: false, log: false };
  salvarCombate();
}

function salvarCombate() {
  try { localStorage.setItem(TURNO_STORAGE_KEY, JSON.stringify(turnoState)); } catch (e) {}
  conditions = turnoState.conds.map(c => c.id);
  condDados = JSON.parse(JSON.stringify(turnoState.conds));
  salvarPersonagem();
}

function sairDoCombate() {
  conditions = turnoState.conds.map(c => c.id);
  condDados = JSON.parse(JSON.stringify(turnoState.conds)).map(c => { delete c.apartir; return c; });
  morteState = { suc: turnoState.morte.suc, meio: turnoState.morte.meia };
  try { localStorage.removeItem(TURNO_STORAGE_KEY); } catch (e) {}
  turnoState = null;
  combateDesfazer = [];
  fecharFolhasCombate();
  document.getElementById('folhas').innerHTML = '';
  salvarPersonagem();
  irPara('ficha');
}

function logCombate(msg) { turnoState.log.push({ turno: turnoState.turno, msg }); }   // turno = nº da rodada

// ── Desfazer: cópia do estado antes de cada ação ──
function guardarEstado() {
  combateDesfazer.push(JSON.stringify({ ts: turnoState, hp: currentHp, vont: currentVont, salv: salvacaoUsada }));
  if (combateDesfazer.length > DESFAZER_MAX) combateDesfazer.shift();
}
function desfazerCombate() {
  const s = combateDesfazer.pop();
  if (!s) return;
  const o = JSON.parse(s);
  turnoState = o.ts; currentHp = o.hp; currentVont = o.vont; salvacaoUsada = o.salv;
  turnoState.aviso = null;
  salvarCombate();
}

// ── Bloqueios ──
function bloqueios() {
  const b = { mov: null, acao: null, livre: null };
  BLOQ_TOTAL.forEach(id => { if (temCond(id)) Object.keys(b).forEach(sl => { if (!b[sl]) b[sl] = nomeCond(id); }); });
  Object.keys(BLOQ_SLOT).forEach(sl => BLOQ_SLOT[sl].forEach(id => { if (!b[sl] && temCond(id)) b[sl] = nomeCond(id); }));
  if (turnoState.morte.morto || currentHp <= 0) Object.keys(b).forEach(sl => { if (!b[sl]) b[sl] = currentHp <= 0 ? 'caído a 0' : 'morto'; });
  return b;
}

// ── Opções de "O que fazer" ──
// Habilidade com fórmula = rola ataque e gasta a Ação; sem fórmula = Ação Livre (protótipo).
function opcoesCombate() {
  const { attr, val } = atkCombate();
  const eqA = calcEquipBonuses().ataque;
  const ops = [{ key: 'ataque', nome: 'Ataque simples', sub: `1d4 + ${attr} ${val}${eqA ? ` + ${eqA}` : ''} contra a Defesa, dano 1d4 + arma ${danoArma()}`, slot: 'acao', cor: 'var(--tinta)', dano: true }];
  const escolhidas = currentChar.caminhos || [];
  arvoreClasse().filter(h => escolhidas.includes(h.id)).forEach(h => {   // E6b: ordem da árvore
    ops.push({ key: h.id, nome: h.nome, subHtml: `${esc(nomeCaminho(h.caminho))}. ${efeitoTxt(efeitoRodadas(h.efeito))}`,
      slot: h.formula ? 'acao' : 'livre', cor: `var(--${h.caminho})`, dano: !!h.formula, hab: h });
  });
  const rh = currentChar.r && currentChar.r.habRacial;
  if (rh) [rh, rh.ofensiva].forEach(x => {
    if (!x || !x.nome) return;
    ops.push({ key: 'racial_' + x.nome, nome: x.nome, sub: `Racial. 1d4 + ${attr}/3. ${x.efeito}`,
      slot: x.alvo === 'Si' ? 'livre' : 'acao', cor: 'var(--tinta-suave)', racial: x });
  });
  return ops;
}

// ── Execução ──
function rolarAtaqueCombate(op) {
  const { attr, val } = atkCombate();
  const eq = calcEquipBonuses();
  const r = d4c(); let total = r + val; const det = [`1d4[${r}] + ${attr} ${val}`];
  const na = notaAttr(attr); if (na.length) det[0] += ` (${na.join(', ')})`;
  if (eq.ataque) { total += eq.ataque; det.push(`equipamento ${eq.ataque}`); }
  const m = modsRolagem('ataque', attr); total += m.soma; det.push(...m.det);
  const linha = det.join(' ').replace(/ \+ −/g, ' −').replace(/ \+ \+/g, ' +') + ` = ${total}`;
  dadoPop({ rotulo: `${op.nome}: ataque`, face: r, total,
    bonus: [[attr, val]].concat(eq.ataque ? [['equipamento', eq.ataque]] : [], dpPartes(m.det)) });
  logCombate(`${op.nome}: ataque ${linha}.`);
  return { titulo: 'Seu ataque', numero: String(total), linhas: [linha, 'Diga o total ao mestre. Ele compara com a Defesa do alvo.'],
    pend: true, ok: false, key: op.key };
}

// Efeitos de uma habilidade: bônus vão para você; condições e penalidades são do alvo (só texto).
function aplicarEfeitosHab(h, linhas) {
  const { val } = atkCombate();
  const noAlvo = [];
  (h.efeitos || []).forEach(id => {
    if (id === 'regeneracao') {
      const r = d4c(), b = Math.floor(val / 3), cura = r + b;
      currentHp = Math.min(hpMaxCombate(), currentHp + cura);
      dadoPop({ rotulo: 'Regeneração', face: r, bonus: [[`${atkCombate().attr}/3`, b]] });
      linhas.push(`Regeneração: 1d4[${r}] + ${b} = ${cura}. Vida ${currentHp}/${hpMaxCombate()}.`);
    } else if (BUFFS[id]) {
      porCond(id, 'hab');
      const c = turnoState.conds.find(x => x.id === id);
      linhas.push(`Em você: ${nomeCond(id)}${c && c.val != null ? ` (${c.val})` : ''}${c && c.dur != null ? `, rodadas ${c.apartir} a ${fimCond(c)}` : ''}.`);
    } else if (DEBUFFS[id]) {   // E13: quem aplica rola a duração (D67), uma rolagem por efeito (D65)
      const b = durBase(id), d = b === 'd4' ? d4c() : b, R = turnoState.turno;
      const ini = COND_NA_HORA.includes(id) ? R : R + 1;
      if (b === 'd4') dadoPop({ rotulo: `${nomeCond(id)} no alvo: rodadas`, face: d });
      noAlvo.push(nomeCond(id) + (id === 'surpreso' ? ' (perde o próximo turno)' : b === 'd4' ? ` (1d4[${d}], rodadas ${ini} a ${R + d})` : ''));
    }
  });
  if (noAlvo.length) linhas.push(`No alvo: ${noAlvo.join(', ')}. Avise o mestre; defesa bem-sucedida contra efeito igual corta à metade.`);
}

// E6: o que cada racial faz em você com o resultado (a parte "no alvo" segue como texto).
function aplicarRacial(nome, v, linhas) {
  const t = turnoState.turno;
  const fx = {
    'Fluxo Arcano':     () => { porCond('bonus_defesa', 'hab', v); porCond('enraizado', 'hab', null, t + 1);
                                linhas.push(`Em você: +${v} na Defesa e na iniciativa. Enraizado no turno ${t + 1}.`); },
    'Pulso de Vontade': () => { currentHp = Math.min(hpMaxCombate(), currentHp + v); porCond('vulneravel', 'hab');
                                linhas.push(`Cura ${v}: vida ${currentHp}/${hpMaxCombate()}. Em você: Vulnerável (−1 Defesa).`); },
    'Forja Interna':    () => { const d = Math.max(2, v); porCond('bonus_dano', 'hab', d); porCond('vulneravel', 'hab');
                                linhas.push(`Em você: +${d} no próximo dano e Vulnerável (−1 Defesa).`); },
    'Frenesi Abissal':  () => { porCond('bonus_dano', 'hab', v);
                                linhas.push(`Em você: +${v} no próximo dano. Se o próximo ataque não for crítico, ele te atinge (avise o mestre).`); },
    'Grito de Ferro':   () => { porCond('bonus_ataque', 'hab', v); linhas.push(`Em você: +${v} no próximo ataque.`); },
  };
  if (fx[nome]) fx[nome]();
}

function executarCombate() {
  const ts = turnoState, b = bloqueios();
  const op = opcoesCombate().find(o => o.key === ts.sel);
  if (!op || ts.rec[op.key] > 0 || ts.slots[op.slot] || b[op.slot]) return;
  guardarEstado();
  if (op.hab || op.racial) ts.rec[op.key] = 3;   // D78: 3 rodadas, a do uso é a 1ª; conta sempre (Encerrar turno avança mesmo com turno perdido)
  ts.slots[op.slot] = true;
  ts.aviso = null;
  if (op.dano) {
    ts.res = rolarAtaqueCombate(op);
  } else if (op.racial) {
    const { attr, val } = atkCombate(); const r = d4c(), bb = Math.floor(val / 3);
    const linha = `1d4[${r}] + ${attr}/3 ${bb} = ${r + bb}`;
    dadoPop({ rotulo: op.nome, face: r, bonus: [[`${attr}/3`, bb]] });
    const linhas = [linha, op.racial.efeito];
    aplicarRacial(op.racial.nome, r + bb, linhas);
    ts.res = { titulo: op.nome, numero: String(r + bb), linhas, ok: true, key: op.key };
    logCombate(`${op.nome}: ${linhas.slice(0, 1).concat(linhas.slice(2)).join(' ')}.`);
  } else {
    const linhas = [];
    aplicarEfeitosHab(op.hab, linhas);
    ts.res = { titulo: op.nome, numero: '', linhas: linhas.length ? linhas : ['Habilidade usada.'], ok: true, key: op.key };
    logCombate(`${op.nome}: ${linhas.join(' ') || 'usada'}.`);
  }
  salvarCombate();
}

function mestreRespondeu(acertou) {
  const ts = turnoState, r0 = ts.res;
  if (!r0 || !r0.pend) return;
  guardarEstado();
  const op = opcoesCombate().find(o => o.key === r0.key) || { nome: 'Ataque', key: r0.key };
  if (!acertou) {
    ts.res = { ...r0, pend: false, ok: false, titulo: 'Errou', linhas: [r0.linhas[0]] };
    logCombate(`${op.nome}: errou.`);
    if (temCond('ataque_extra')) { tirarCond('ataque_extra'); }
    salvarCombate(); return;
  }
  const { attr, val } = atkCombate();
  const rd = d4c(); let bruto = rd; const det = [`1d4[${rd}]`];
  if (op.hab) { const b = Math.floor(val / 3); bruto += b; det.push(`+ ${attr}/3 ${b}`); }
  else { const a = danoArma(); bruto += a; det.push(`+ arma ${a}`); }
  if (temCond('bonus_dano')) { const v = valorCond('bonus_dano'); bruto += v; det.push(`+ Bônus de Dano[${v}]`); tirarCond('bonus_dano'); }
  dadoPop({ rotulo: `Dano: ${op.nome}`, face: rd, total: bruto, bonus: dpPartes(det.slice(1)) });
  const linhas = [r0.linhas[0], `Dano ${det.join(' ')} = ${bruto}`, 'Diga o dano ao mestre. Ele desconta a Defesa do alvo.'];
  const br = bonusRacial(currentChar);   // E15 (D79, D83): ataque e habilidade
  if (br) linhas.push(`Se o alvo for ${br.alvo}: +${br.v} de dano depois da Defesa (ciclo racial).`);
  if (op.hab) aplicarEfeitosHab(op.hab, linhas);
  if (temCond('ataque_extra')) { tirarCond('ataque_extra'); ts.slots.acao = false; linhas.push('Ataque Extra: você pode atacar de novo.'); }
  ts.res = { ...r0, pend: false, ok: true, titulo: 'Acertou', numero: `${bruto} de dano`, linhas };
  logCombate(`${op.nome}: acertou, dano ${det.join(' ')} = ${bruto}${br ? `; contra ${br.alvo} +${br.v} depois da Defesa` : ''}.`);
  salvarCombate();
}

function encerrarTurnoCombate() {
  const ts = turnoState;
  guardarEstado();
  const msgs = [], exp = [], fica = [];
  ts.conds.forEach(c => {   // E13: sai no fim da rodada t + dur
    if (c.dur == null || fimCond(c) > ts.turno) fica.push(c);
    else exp.push(nomeCond(c.id));
  });
  ts.conds = fica;
  if (exp.length) msgs.push(exp.join(' e ') + (exp.length > 1 ? ' expiraram' : ' expirou'));
  Object.keys(ts.rec).forEach(k => { ts.rec[k]--; if (ts.rec[k] <= 0) delete ts.rec[k]; });
  ts.turno++;
  ts.slots = { mov: false, acao: false, livre: false };
  ts.res = null;
  logCombate(`Rodada ${ts.turno} iniciada.`);
  // Envenenado e Queimando: 1 de vida no início da rodada, sem absorção (o 1º na rodada seguinte, D66)
  const hpAntes = currentHp;
  ['envenenado', 'queimando'].forEach(id => {
    if (!temCond(id) || currentHp <= 0) return;
    currentHp = Math.max(0, currentHp - 1);
    msgs.push(`${nomeCond(id)} tirou 1 de vida`);
    logCombate(`${nomeCond(id)}: −1 de vida, sem absorção.`);
  });
  if (currentHp === 0) {
    if (hpAntes > 0) cairCombate();
    ts.queda = true;
  }
  ts.aviso = `Rodada ${ts.turno}. ` + (msgs.length ? msgs.join('. ') + '.' : 'Nada mudou.');
  salvarCombate();
}

// ── Vida ──
function receberDanoCombate(n) {
  const ts = turnoState;
  if (n <= 0) return;
  guardarEstado();
  if (currentHp <= 0) { atingidoCaido(); return; }   // R3
  let dano = n;
  if (temCond('absorcao_total')) { tirarCond('absorcao_total'); dano = 0; ts.aviso = 'Absorção Total anulou o dano.'; }
  else if (temCond('reducao_dano')) {
    const r = d4c(); tirarCond('reducao_dano'); dano = Math.max(0, n - r);
    dadoPop({ rotulo: 'Redução de Dano', face: r, nota: `Absorveu ${n - dano} de ${n}. Você perde ${dano}.` });
    ts.aviso = `Redução de Dano: 1d4[${r}] absorveu ${n - dano}. Você perdeu ${dano}.`;
  } else ts.aviso = null;
  currentHp = Math.max(0, currentHp - dano);
  logCombate(`Recebeu ${n} de dano${dano !== n ? `, perdeu ${dano}` : ''}. Vida ${currentHp}/${hpMaxCombate()}.`);
  if (currentHp === 0) cairCombate();
  salvarCombate();
}

function curarCombate(n) {
  if (n <= 0) return;
  guardarEstado();
  const caido = currentHp <= 0;
  currentHp = Math.min(hpMaxCombate(), currentHp + n);
  if (caido && currentHp > 0) {
    turnoState.queda = false;
    turnoState.morte = { suc: 0, meia: 0, face: 0, res: null, morto: false };
  }
  logCombate(`Curou ${n}. Vida ${currentHp}/${hpMaxCombate()}.`);
  salvarCombate();
}

// ── Condições ──
function adicionarCondCombate(id, defendeu, dCampo) {
  const ts = turnoState;
  guardarEstado();
  combateUi.cond = false;
  if (id === 'regeneracao') {
    const r = d4c(); currentHp = Math.min(hpMaxCombate(), currentHp + r);
    dadoPop({ rotulo: 'Regeneração', face: r, nota: `Vida ${currentHp}/${hpMaxCombate()}.` });
    ts.aviso = `Regeneração: 1d4[${r}], vida ${currentHp}/${hpMaxCombate()}.`;
    logCombate(ts.aviso);
    salvarCombate(); return;
  }
  const k = porCond(id, 'ficha', null, null, defendeu, dCampo);
  durCampo = { mult: durCampo.mult, res: null, rol: null };
  const c = turnoState.conds.find(x => x.id === id);
  const fim = c ? fimCond(c) : null, quando = c && c.apartir > ts.turno ? ` A partir da rodada ${c.apartir}.` : '';
  const ate = fim == null ? '' : ` Até o fim da rodada ${fim}.`;
  const msg = {
    somou: `: soma ${c && c.rol ? rotRol(c.rol[c.rol.length - 1]) : ''} rodadas, efeito não acumula.${ate}`,
    metade: `: defendeu, a duração que resta caiu à metade.${ate}`,
    manteve: defendeu ? ': defendeu, nada muda.' : ': já ativa, nada muda.',
  }[k] || ` aplicada${c && c.rol ? ', ' + rotRol(c.rol[0]) + ' rodadas' : ''}.${quando}${ate} ` + COND_TXT[id][3];
  ts.aviso = nomeCond(id) + (c && c.val != null ? ` (${c.val})` : '') + msg;
  logCombate(nomeCond(id) + msg.replace(' ' + COND_TXT[id][3], ''));
  if (id === 'inconsciente' && currentHp > 0) { currentHp = 0; cairCombate(); }
  salvarCombate();
}

function removerCondCombate(id) {
  guardarEstado();
  tirarCond(id);
  logCombate(`${nomeCond(id)} removida.`);
  salvarCombate();
}

// ── Queda (Salvação Garantida; teste de morte D76/D82: 1d4, 2 sucessos levantam, 2 falhas matam) ──
function cairCombate() {
  turnoState.queda = true;
  turnoState.morte = { suc: 0, meia: 0, face: 0, res: null, morto: false };
  logCombate('Vida 0: você caiu.');
}

function levantarCombate(hp, titulo, txt) {
  const ts = turnoState;
  currentHp = hp;
  tirarCond('inconsciente');
  ts.morte = { suc: 0, meia: 0, face: ts.morte.face, res: null, morto: false };
  ts.queda = false;
  ts.renasceu = { titulo, txt };
  logCombate(`${titulo}: vida ${hp}.`);
}

function usarSalvacao() {
  if (salvacaoUsada || currentHp > 0) return;
  guardarEstado();
  salvacaoUsada = true;
  const v = Math.ceil(hpMaxCombate() / 3);
  levantarCombate(v, 'Salvação Garantida', `Você se recusa a cair. Volta com ${v} de vida.`);
  salvarCombate();
}

function rolarMorteCombate() {         // E15 (D76, D82): sem ligação com o atributo VONT
  const m = turnoState.morte;
  if (m.morto) return;
  guardarEstado();
  const r = d4c(); m.face = r;
  dadoPop({ rotulo: 'Teste de morte', face: r, nota: r <= 2 ? 'Falha.' : r === 3 ? 'Sucesso.' : 'Revive.' });
  const hpMax = hpMaxCombate();
  logCombate(`Teste de morte: 1d4[${r}].`);
  if (r <= 2) { m.meia++; if (m.meia >= 2) morrer(`Rolou ${r}: segunda falha. Você morreu.`); else m.res = `Rolou ${r}: falha.`; }
  else if (r === 3) {
    m.suc++;
    if (m.suc >= 2) { const v = Math.ceil(hpMax / 3); levantarCombate(v, 'Você levantou', `Segundo sucesso. Volta com ${v} de vida.`); }
    else m.res = 'Rolou 3: sucesso.';
  } else { const v = Math.ceil(hpMax * 2 / 5); levantarCombate(v, 'Você reviveu', `Rolou 4. Volta com ${v} de vida.`); }
  salvarCombate();
}

function morrer(msg) {
  const m = turnoState.morte;
  m.morto = true; m.res = msg;
  logCombate(`${currentChar.nome} morreu. ${msg}`);
}

function ajudadoCombate() {                 // R2: conta como sucesso, sem gastar Vontade
  const m = turnoState.morte;
  if (m.morto) return;
  guardarEstado();
  m.suc++; m.face = 0;
  if (m.suc >= 2) { const v = Math.ceil(hpMaxCombate() / 3); levantarCombate(v, 'Você levantou', `Um aliado te puxou de volta. Volta com ${v} de vida.`); }
  else { m.res = 'A ajuda conta como um sucesso.'; logCombate('Aliado ajudou: 1 sucesso.'); }
  salvarCombate();
}

function atingidoCaido() {                  // D76: 1 falha (chamado já com o estado guardado)
  const m = turnoState.morte;
  turnoState.queda = true;
  if (m.morto) return;
  m.meia++; m.face = 0;
  logCombate('Atingido caído: 1 falha.');
  if (m.meia >= 2) morrer('Atingido caído: segunda falha. Você morreu.');
  else m.res = 'Ser atingido caído conta como uma falha.';
  salvarCombate();
}

function rolarIniciativaCombate() {
  guardarEstado();
  const r = d8c(); let t = r; const det = [`1d8[${r}]`];
  if (temCond('lentidao')) { t -= 2; det.push('− Lentidão 2'); }
  if (temCond('bonus_defesa')) { const v = valorCondFixo('bonus_defesa'); t += v; det.push(`+ Bônus de Defesa ${v}`); }
  dadoPop({ rotulo: 'Iniciativa', lados: 8, face: r, total: t, bonus: dpPartes(det.slice(1)) });
  turnoState.aviso = `Iniciativa ${t}: ${det.join(' ')}. Empate: maior AGI (${currentChar.attrs.AGI}).`;
  logCombate(turnoState.aviso);
  salvarCombate();
}

function exportarLog() {
  if (!turnoState || !turnoState.log.length) { showToast('Registro vazio.'); return; }
  const txt = `Registro de combate — ${turnoState.nomePersonagem}\n${'─'.repeat(40)}\n` +
    turnoState.log.map(e => `[Rodada ${e.turno}] ${e.msg}`).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }));
  a.download = `combate_${turnoState.nomePersonagem.toLowerCase().replace(/\s+/g, '_')}.txt`;
  a.click();
}

// ═══════════ Render ═══════════
const X_SVG = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';

function iniciarCombateUI() {
  document.getElementById('btn-sair-combate').addEventListener('click', () => { combateUi.sair = true; renderCombate(); });
  document.getElementById('tela-combate').addEventListener('click', cliqueCombate);
  document.getElementById('folhas').addEventListener('click', e => {
    if (telaAtual === 'combate' && e.currentTarget.dataset.dono === 'combate') cliqueCombate(e);
  });
}

function cliqueCombate(e) {
  const el = e.target.closest('[data-c]');
  if (!el || el.disabled) {
    if (e.target.classList.contains('folha-fundo') && telaAtual === 'combate') { fecharFolhasCombate(); renderCombate(); }
    return;
  }
  const v = el.dataset.v, ts = turnoState;
  const n = () => parseInt(document.getElementById('cb-vida-num').value) || 0;
  const acoes = {
    slot: () => { const b = bloqueios(); if (!b[v]) { guardarEstado(); ts.slots[v] = !ts.slots[v]; salvarCombate(); } },
    sel: () => { ts.sel = v; },
    exec: executarCombate,
    acertou: () => mestreRespondeu(true), errou: () => mestreRespondeu(false),
    encerrar: encerrarTurnoCombate, desfazer: desfazerCombate,
    fecharAviso: () => { ts.aviso = null; },
    abrirCond: () => { combateUi.cond = true; }, addCond: () => adicionarCondCombate(v, false, lerCampoDur()), defCond: () => adicionarCondCombate(v, true),
    rolarDur: rolarCampoDur, limparDur: () => { durCampo = { mult: durCampo.mult, res: null, rol: null }; }, remCond: () => removerCondCombate(v),
    menos: () => receberDanoCombate(1), mais: () => curarCombate(1),
    abrirVida: () => { combateUi.vida = true; },
    dano: () => { const k = n(); combateUi.vida = false; receberDanoCombate(k); },
    curar: () => { const k = n(); combateUi.vida = false; curarCombate(k); },
    salv: usarSalvacao, morte: rolarMorteCombate, ajuda: ajudadoCombate,
    atingido: () => { guardarEstado(); atingidoCaido(); },
    fecharQueda: () => { ts.queda = false; salvarCombate(); },
    fecharRen: () => { ts.renasceu = null; salvarCombate(); },
    iniciativa: rolarIniciativaCombate,
    abrirLog: () => { combateUi.log = true; }, exportar: exportarLog,
    fechar: fecharFolhasCombate,
    sairOk: sairDoCombate,
  };
  if (!acoes[el.dataset.c]) return;
  acoes[el.dataset.c]();
  if (telaAtual === 'combate') renderCombate();
}

function fecharFolhasCombate() { combateUi = { cond: false, sair: false, vida: false, log: false }; }

function renderCombate() {
  if (!turnoState || turnoState.nomePersonagem !== currentChar.nome) iniciarCombate();
  const ts = turnoState, b = bloqueios();
  const hpMax = hpMaxCombate(), eq = calcEquipBonuses();
  document.getElementById('combate-turno').textContent = 'Rodada ' + ts.turno;
  document.getElementById('combate-nome').textContent = `${currentChar.nome}, ${linhaPersonagem(currentChar).replace(/, nível.*/, '').toLowerCase()}`;

  // Vida e Defesa
  const hpCls = currentHp <= 0 ? 'zero' : (currentHp <= hpMax * 0.4 ? 'baixa' : '');
  const { total: def, notas: defNotas } = defesaEfetiva();
  const vital = `<div class="cb-vital">
    <div class="cb-vida ${hpCls}" role="status" aria-label="Vida ${currentHp} de ${hpMax}">
      <button type="button" class="cb-vida-topo" data-c="abrirVida" aria-label="Receber dano ou curar">
        <span class="cb-rot">Vida</span><span class="num cb-vida-n">${currentHp}<small> / ${hpMax}</small></span></button>
      <div class="cb-barra" aria-hidden="true"><div style="width:${Math.round(Math.max(0, currentHp) / hpMax * 100)}%"></div></div>
      <div class="cb-vida-bts">
        <button type="button" data-c="menos" aria-label="Perder 1 de vida">−1</button>
        <button type="button" data-c="mais" aria-label="Recuperar 1 de vida">+1</button>
      </div>
    </div>
    <div class="cb-def" role="status" aria-label="Defesa ${def}"><span class="num cb-def-n">${def}</span><span class="cb-rot">Defesa</span>
      ${defNotas.map(t => `<span class="cb-def-nota">${t}</span>`).join('')}</div>
  </div>`;

  // Ações do turno
  const slots = `<div class="cb-slots" role="group" aria-label="Ações do turno">${SLOTS_COMBATE.map(([id, nome]) => {
    const usado = ts.slots[id] || !!b[id];
    return `<button type="button" class="cb-slot${usado ? ' usado' : ''}" data-c="slot" data-v="${id}" aria-pressed="${usado}">
      <strong>${nome}</strong><span>${b[id] ? 'Bloqueado: ' + esc(b[id]) : (usado ? 'Usado' : 'Disponível')}</span></button>`;
  }).join('')}</div>`;

  // O que fazer
  const ops = opcoesCombate();
  const emRec = ops.filter(o => ts.rec[o.key] > 0);
  const disp = ops.filter(o => !(ts.rec[o.key] > 0));
  if (!disp.some(o => o.key === ts.sel)) ts.sel = 'ataque';
  const opsHtml = disp.map(o => {
    const usado = ts.slots[o.slot] || !!b[o.slot];
    const on = ts.sel === o.key && !usado;
    const status = b[o.slot] ? 'Bloqueado: ' + esc(b[o.slot]) : (ts.slots[o.slot] ? (o.slot === 'acao' ? 'Ação usada' : 'Livre usada') : (o.slot === 'acao' ? 'Ação' : 'Livre'));
    return `<button type="button" class="cb-opc${on ? ' on' : ''}" data-c="sel" data-v="${esc(o.key)}" aria-pressed="${on}" ${usado ? 'disabled' : ''}>
      <span class="cb-dot" style="background:${o.cor}" aria-hidden="true"></span>
      <span class="cb-opc-txt"><strong>${esc(o.nome)}</strong><span>${o.subHtml || esc(o.sub)}</span></span>
      <span class="cb-opc-st">${status}</span></button>`;
  }).join('');
  const recTxt = emRec.length ? `<p class="suave num cb-rec">Em recarga: ${emRec.map(o => `${esc(o.nome)}, volta na rodada ${ts.turno + ts.rec[o.key]}`).join('; ')}.</p>` : '';
  const atual = disp.find(o => o.key === ts.sel);
  const podeExec = atual && !ts.slots[atual.slot] && !b[atual.slot];
  const oque = `<section class="cb-secao">
    <div class="cb-secao-topo"><h2>O que fazer</h2><span class="suave">Habilidades travadas até sair</span></div>
    ${ts.turno === 1 ? '<button type="button" class="btn cb-ini" data-c="iniciativa">Rolar iniciativa (1d8)</button>' : ''}
    ${previaProximo() ? `<p class="cb-prox num" role="status">${esc(previaProximo())}.</p>` : ''}
    <div class="cb-opcs">${opsHtml}</div>${recTxt}</section>
    <button type="button" class="cb-exec" data-c="exec" ${podeExec ? '' : 'disabled'}>${podeExec ? 'Confirmar' : 'Escolha o que fazer'}</button>`;

  // Resultado
  const r = ts.res;
  const res = r ? `<div class="card cb-res" role="status">
    <div class="cb-res-topo"><span class="cb-res-tit ${r.ok ? 'ok' : ''}">${esc(r.titulo)}</span><span class="num cb-res-n">${esc(r.numero)}</span></div>
    ${r.linhas.map(l => `<span class="num cb-res-l">${esc(l)}</span>`).join('')}
    ${r.pend ? `<strong class="cb-res-perg">O que o mestre respondeu?</strong>
      <div class="cb-duas"><button type="button" class="cb-acertou" data-c="acertou">Acertou</button><button type="button" class="cb-fantasma" data-c="errou">Errou</button></div>` : ''}
  </div>` : '';

  // Em você
  const conds = ts.conds.map(c => {
    const t = COND_TXT[c.id] || [nomeCond(c.id), 'cond', '', ''];
    const buff = !!BUFFS[c.id];
    const fim = fimCond(c);
    const dur = (c.apartir > ts.turno ? `a partir da rodada ${c.apartir}, ` : '') + (c.dur == null ? 'até acabar'
      : (DUR_ATE_USAR.includes(c.id) ? 'até usar ou ' : '') + `até o fim da rodada ${fim}`)
      + (c.rol ? ` · ${c.rol.map(rotRol).join(' + ')}` : '') + (c.val != null ? ` · ${c.val}` : '');
    const orig = c.origem === 'hab' ? 'Da sua habilidade, já aplicada.' : 'Aplicado pela ficha: ' + t[3];
    return `<div class="cb-cond"><span class="cb-faixa ${buff ? 'buff' : ''}" aria-hidden="true"></span>
      <div class="cb-cond-txt"><div><strong>${esc(t[0])}</strong> <span class="suave num">${dur}</span></div>
      <span>${esc(t[2])}</span><span class="cb-orig ${c.origem === 'hab' ? '' : 'ficha'}">${esc(orig)}</span></div>
      <button type="button" class="cb-x" data-c="remCond" data-v="${c.id}" aria-label="Remover ${esc(t[0])}">${X_SVG}</button></div>`;
  }).join('');
  const emVoce = `<section class="cb-box">
    <div class="cb-secao-topo"><h2>Em você</h2><button type="button" class="btn btn-texto" data-c="abrirCond">Adicionar</button></div>
    ${conds || '<span class="suave">Nenhuma condição ativa.</span>'}</section>`;

  const aviso = ts.aviso ? `<div class="cb-aviso" role="status"><span>${esc(ts.aviso)}</span>
    <button type="button" data-c="fecharAviso" aria-label="Fechar aviso">${X_SVG}</button></div>` : '';
  const log = `<button type="button" class="btn btn-texto cb-log-bt" data-c="abrirLog">Registro do combate (${ts.log.length})</button>`;
  // E4: no desktop o registro fica aberto na coluna lateral (as 12 entradas mais recentes).
  const logLado = `<section class="cb-box cb-log-lado"><div class="cb-secao-topo"><h2>Registro</h2>
    <button type="button" class="btn btn-texto" data-c="exportar">Exportar .txt</button></div>
    <div class="cb-log">${ts.log.slice(-12).reverse().map(e => `<div class="cb-log-l"><span class="num">R${e.turno}</span>${esc(e.msg)}</div>`).join('')}</div></section>`;

  // Centro (ações) e lateral (vida, condições, registro). No celular as duas caixas somem (display: contents)
  // e a ordem volta à do protótipo: vida, ações, o que fazer, resultado, em você, aviso, registro.
  document.getElementById('combate-corpo').innerHTML =
    `<div class="cb-centro">${slots + oque + res}</div><div class="cb-lateral">${vital + emVoce + aviso + log + logLado}</div>`;
  const desf = document.getElementById('btn-desfazer');
  desf.disabled = !combateDesfazer.length;
  renderFolhasCombate();
}

function renderFolhasCombate() {
  const f = document.getElementById('folhas'), ts = turnoState;
  const folha = (rot, corpo, extra = '') => `<div class="folha-fundo"><div class="folha ${extra}" role="dialog" aria-label="${rot}">${corpo}</div></div>`;
  const topo = (tit, fechar = 'fechar') => `<div class="cb-secao-topo"><h2>${tit}</h2><button type="button" class="btn btn-texto" data-c="${fechar}">Fechar</button></div>`;
  let h = '';
  if (ts.renasceu) {
    h = `<div class="folha-fundo cb-ren-fundo"><div class="cb-ren" role="alertdialog" aria-label="${esc(ts.renasceu.titulo)}">
      <svg aria-hidden="true" width="72" height="72" viewBox="0 0 72 72"><circle cx="36" cy="36" r="33" fill="none" stroke="currentColor" stroke-width="2"/><path d="M36 14v44M22 30l14-16 14 16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <h2>${esc(ts.renasceu.titulo)}</h2><p>${esc(ts.renasceu.txt)}</p>
      <span class="suave num">Vida ${currentHp} / ${hpMaxCombate()}</span>
      <button type="button" class="cb-exec" data-c="fecharRen">Voltar ao combate</button></div></div>`;
  } else if (ts.queda && currentHp <= 0) {
    const m = ts.morte;
    const quad = (n, cls) => [1, 2].map(i => `<span class="${cls}${i <= n ? ' on' : ''}"></span>`).join('');
    const faces = [[1, 'Falha', 'morte'], [2, 'Falha', 'morte'], [3, 'Sucesso', 'suc'], [4, 'Revive', 'ren']]
      .map(([k, t, c]) => `<span class="cb-face${m.face === k ? ' ' + c : ''}">${k} ${t}</span>`).join('');
    const salv = !salvacaoUsada ? `<section class="cb-box">
      <div class="cb-secao-topo"><h3>Salvação Garantida</h3><span class="chip cb-chip-ouro">Disponível</span></div>
      <span>Na primeira queda a 0, você volta sozinho com ${Math.ceil(hpMaxCombate() / 3)} de vida, sem rolar. Ela volta no descanso longo.</span>
      ${m.morto ? '' : '<button type="button" class="cb-salv" data-c="salv">Levantar com Salvação Garantida</button>'}</section>` : '';
    const teste = salvacaoUsada ? `<section class="cb-box cb-morte">
      <h3>Teste de morte</h3>
      <span>No início de cada turno caído, role 1d4. Duas falhas matam; dois sucessos te levantam; 4 revive na hora.</span>
      <div class="cb-duas"><div><strong>Falhas</strong><div class="cb-marcas">${quad(m.meia, 'cb-meia')}</div></div>
        <div><strong>Sucessos</strong><div class="cb-marcas">${quad(m.suc, 'cb-suc')}</div></div></div>
      <div class="cb-faces num">${faces}</div>
      ${m.res ? `<p role="status" class="cb-morte-res">${esc(m.res)}</p>` : ''}
      ${m.morto ? '' : `<button type="button" class="cb-rolar" data-c="morte">Rolar 1d4</button>
        <div class="cb-duas"><button type="button" class="cb-fantasma" data-c="ajuda">Um aliado me ajudou</button>
        <button type="button" class="cb-fantasma" data-c="atingido">Fui atingido caído</button></div>`}
    </section>` : '';
    h = folha('Vontade e queda', `${topo(m.morto ? esc(currentChar.nome) + ' morreu' : 'Você caiu', 'fecharQueda')}
      <p class="suave">Na mesa, esta regra se chama Vontade. O atributo VONT não entra no teste.</p>
      ${salv}${teste}
      ${m.morto ? '<p class="suave">Errou algum toque? Feche e use Desfazer.</p>' : ''}`);
  } else if (combateUi.cond) {
    const campo = `<div class="cb-dur" role="group" aria-label="Duração">
      <h3>Duração</h3>
      <div class="cb-dur-linha"><span class="num cb-dur-dado">1d4 ×</span>
        <input id="cb-dur-mult" class="cb-input num cb-dur-in" type="number" inputmode="numeric" min="1" max="9" value="${durCampo.mult}" aria-label="Multiplicador de dado">
        <button type="button" class="btn" data-c="rolarDur">Rolar</button>
        <span class="num" aria-hidden="true">=</span>
        <input id="cb-dur-res" class="cb-input num cb-dur-in" type="number" inputmode="numeric" min="1" value="${durCampo.res != null ? durCampo.res : ''}" placeholder="—" aria-label="Resultado em rodadas">
        <span class="suave">rodadas</span>
        ${durCampo.res != null ? `<button type="button" class="btn btn-texto" data-c="limparDur">Limpar</button>` : ''}</div>
      <span class="suave num">${durCampo.rol ? esc(durCampo.rol) + '. ' : ''}Quem aplica rola. Se foi o mestre, digite o resultado dele. Vazio: a ficha rola ao escolher.</span></div>`;
    h = folha('Adicionar condição', topo('Adicionar condição') + campo + COND_GRUPOS.map(([g, nome]) => `<div class="cb-grupo"><h3>${nome}</h3><div class="cb-chips">
      ${Object.keys(COND_TXT).filter(id => COND_TXT[id][1] === g).map(id =>
        `<button type="button" class="cb-chip${ts.conds.some(c => c.id === id) ? ' ativo' : ''}" data-c="addCond" data-v="${id}" title="${esc(COND_TXT[id][2])}">${esc(COND_TXT[id][0])}</button>`).join('')}
      </div></div>`).join('') + (() => {   // E13: D65 — defesa bem-sucedida contra efeito igual corta à metade
        const ja = ts.conds.filter(c => c.dur != null && COND_TXT[c.id]);
        return `<p class="suave cb-cond-regra">Duração: 1d4 rodadas, rolado ao aplicar; vale da rodada seguinte (Enraizado, movimento e ação: na hora). A mesma condição de novo soma rodadas.</p>`
          + (ja.length ? `<div class="cb-grupo"><h3>Defendeu de um efeito igual? Metade do que resta</h3><div class="cb-chips">${ja.map(c =>
            `<button type="button" class="cb-chip" data-c="defCond" data-v="${c.id}">${esc(nomeCond(c.id))}: defendi</button>`).join('')}</div></div>` : '');
      })());
  } else if (combateUi.vida) {
    h = folha('Vida', `${topo('Vida')}<span class="suave num">Agora: ${currentHp} / ${hpMaxCombate()}</span>
      <input id="cb-vida-num" class="cb-input num" type="number" inputmode="numeric" min="0" value="1" aria-label="Quantidade">
      <div class="cb-duas"><button type="button" class="cb-exec" data-c="dano">Receber dano</button><button type="button" class="cb-fantasma" data-c="curar">Curar</button></div>
      <span class="suave">Redução de Dano e Absorção Total descontam sozinhas.</span>`);
  } else if (combateUi.log) {
    const ent = ts.log.slice().reverse().map(e => `<div class="cb-log-l"><span class="num">R${e.turno}</span>${esc(e.msg)}</div>`).join('');
    h = folha('Registro do combate', `${topo('Registro do combate')}<button type="button" class="btn" data-c="exportar">Exportar .txt</button>
      <div class="cb-log">${ent || '<span class="suave">Vazio.</span>'}</div>`);
  } else if (combateUi.sair) {
    h = folha('Sair do combate', `${topo('Sair do combate?')}
      <span>Vida, Vontade e condições passam para a ficha. O registro do combate é apagado.</span>
      <div class="cb-duas"><button type="button" class="cb-exec" data-c="sairOk">Sair</button><button type="button" class="cb-fantasma" data-c="fechar">Continuar</button></div>`);
  }
  if (!h && f.dataset.dono !== 'combate') return;      // não apaga folha da ficha aberta ao lado (E4)
  f.dataset.dono = h ? 'combate' : '';
  f.innerHTML = h;
  f.onclick = null;
  if (h) aplicarTema(document.documentElement.dataset.tema);
}
