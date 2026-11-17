// @gerado por extrair_fase10.py — utilitários, estado e cálculos da fase 10
// @fase10 1846-1853
function esc(s) { const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; }
// Texto de efeito para o jogador: `id_interno` -> nome legível (DEBUFFS/BUFFS)
function efeitoTxt(s) {
  return esc(s).replace(/`([a-z_]+)`/g, (m, id) => {
    const d = (typeof DEBUFFS !== 'undefined' && DEBUFFS[id]) || (typeof BUFFS !== 'undefined' && BUFFS[id]);
    return d ? d.nome : id.replace(/_/g, ' ');
  });
}
// @fase10 2267-2275
const ATTRS = ['FOR','VIG','AGI','INT','VONT'];
let currentChar = null;
let currentHp = 0;
let currentVont = 0;
let conditions = [];
let salvacaoUsada = false;
let morteState = { suc:0, meio:0 };
let currentPhotoDataUrl = null;
let inventario = Array(9).fill(null); // cada slot: null ou { itemKey }
// @fase10 2277-2375
// ═══════════════════════════════════════════
// CALC — Bônus de equipamento
// ═══════════════════════════════════════════
function calcEquipBonuses() {
  const forVal = currentChar ? currentChar.attrs.FOR : 0;
  let defesa = 0, dano = 0, hp = 0, ataque = 0;
  inventario.forEach(slot => {
    if (!slot) return;
    const eq = EQUIPAMENTOS[slot.itemKey];
    if (!eq) return;
    if (eq.reqFOR && forVal < eq.reqFOR) return; // req não atendido
    defesa += eq.defesa;
    dano   += eq.dano;
    hp     += eq.hp;
    ataque += eq.ataque;
  });
  return { defesa, dano, hp, ataque };
}

// ═══════════════════════════════════════════
// CALC — Atributos base (escala 1–5)
// ═══════════════════════════════════════════
function calcAttrs(rId, cId, hId, idadeId, assocId, estId, motId, rolls, nivel) {
  // rolls = { raca, idade, pf } — default 1 para retrocompat
  const rv = rolls || {};
  const rollRaca = rv.raca != null ? rv.raca : 1;
  const rollIdade = rv.idade != null ? rv.idade : 1;
  const rollPf   = rv.pf   != null ? rv.pf   : 1;

  // Base: 2 em todos
  const base = { FOR:2, VIG:2, AGI:2, INT:2, VONT:2 };

  // Ponto de Raça (1d4 rolado)
  const raca = RACAS[rId];
  if (raca) base[raca.attrRaca] += rollRaca;

  // Histórico +1
  const h = HISTORICOS[hId];
  if (h) base[h.attr] += h.bonus;

  // Idade (1d4 rolado)
  const idade = idadeId ? IDADES[idadeId] : null;
  if (idade) base[idade.attr] += rollIdade;

  // Estilo +1
  const est = estId ? ESTILOS[estId] : null;
  if (est) base[est.attr] += est.bonus;

  // Motivação +1
  const mot = motId ? MOTIVACOES[motId] : null;
  if (mot) base[mot.attr] += 1;

  // Ponto fraco (1d4 rolado, mínimo 1 no atributo resultante)
  if (mot) {
    const pf = PONTOS_FRACOS[mot.pfId];
    if (pf) base[pf.attr] = Math.max(1, base[pf.attr] - rollPf);
  }

  // Associação +1
  const assoc = assocId && assocId !== 'none' ? ASSOCIACOES[assocId] : null;
  if (assoc && assoc.attr) {
    base[assoc.attr] += assoc.bonus;   // E17: Mercantes +1 AGI para todos (canon)
  }

  // REG-PROG-ATR (D31): atributo de ataque da classe +3 fixo por nível acima do 1
  const cls = CLASSES[cId];
  const nv = parseInt(nivel) || 1;
  if (cls && nv > 1) Object.keys(cls.somaNivel).forEach(k => { base[k] += cls.somaNivel[k] * (nv - 1); });

  return base;
}

// REG-PROG-HP: HP fixo = 5 + (raça +3, classe +4) × (nível − 1). VIG não entra.
const HP_CLASSE_NIVEL = 4;
function calcHP(rId, attrs, nivel) {
  const r = RACAS[rId];
  const nv = parseInt(nivel) || 1;
  return r.hpMin + (r.hpNivel + HP_CLASSE_NIVEL) * (nv - 1);
}

// Defesa Total = raça + classe (sem armadura por padrão)
function calcDefesa(rId, cId) {
  return RACAS[rId].defesa + CLASSES[cId].defBase;
}

// Vontade Máxima = nível + 1
function calcVontMax(nivel) { return nivel + 1; }

// Bônus de dano fórmula: 1d4 + (attrVal / 3)
function danoFormula(cId, attrs) {
  const c = CLASSES[cId];
  const val = attrs[c.atkAttr];
  const bonus = Math.floor(val / 3);
  return bonus > 0 ? `1d4 + ${bonus}` : '1d4';
}
