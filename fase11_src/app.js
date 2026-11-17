// ═══════════════════════════════════════════
// APP — personagem, salvamento, navegação, tema (fase 11)
// Estado global (currentChar, currentHp, inventario…) vem de calculo.js, igual à fase 10.
// ═══════════════════════════════════════════
const SAVE_KEY = 'd4_chars';          // mesmo formato da fase 10
const EM_USO_KEY = 'd4_em_uso';       // nome do personagem aberto
const TEMA_KEY = 'd4_tema';           // 'dia' | 'noite'
let notasTexto = '';
let condDados = [];                     // E6: efeitos com turno e valor (ids seguem em conditions)
let moedas = 0;                        // REG-EQUIP-INI: kit inicial traz 15
let telaAtual = null;

function showToast(m) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = m; el.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove('show'), 2500);
}

// E15 (P2 passo 8, P1 §Idioma): nomes dos caminhos sinalizados até o autor escolher. Só exibição; IDs intactos.
const CAMINHO_SINAL = {
  chama: 'Chama/Akauger', mares: 'Marés/Nagamerer/Nagaflu', raiz: 'Raiz/Okiberger/Okiberga',
  sopro: 'Sopro/Aralufer/Aralufa', veu: 'Véu/Kashiwir/Kashitiefer/Makosetz',
};
function nomeCaminho(id) { return CAMINHO_SINAL[id] || (CAMINHOS[id] || {}).nome || id; }
// E15 (D79, D83): ciclo racial = +1 de dano por nível contra a raça que sofre, somado depois da Defesa.
// RACAS[x].sofre = raça que sofre o bônus de x. dados.js (danoBonus: 3) fica intacto: o valor vem do nível.
function bonusRacial(ch) {
  const r = ch && RACAS[ch.rId], alvo = r && RACAS[r.sofre];
  return alvo ? { alvo: alvo.nome, v: ch.nivel || 1 } : null;
}

// E16 (REG-CRIA-01, REG-CRIA-BON, D80; livro cap. 13): base 1d4 em cada atributo; raça +1 fixo;
// idade +1d4; Ponto Fraco −1d4; piso 1 depois de tudo. Rolls sem base (fase 10, saves e testes
// antigos: { raca, idade, pf }) seguem pela calcAttrs da fase 10 (base 2 + raça 1d4).
function calcAttrsV15(rId, cId, hId, idadeId, assocId, estId, motId, rolls, nivel, semPiso) {
  const rv = rolls || {};
  if (rv.FOR === undefined && rv.raca !== undefined) return calcAttrs(rId, cId, hId, idadeId, assocId, estId, motId, rolls, nivel);
  const a = {}; ATTRS.forEach(k => { a[k] = rv[k] || 0; });
  const ra = RACAS[rId]; if (ra) a[ra.attrRaca] += 1;
  const hi = HISTORICOS[hId]; if (hi) a[hi.attr] += hi.bonus;
  const id = idadeId ? IDADES[idadeId] : null; if (id) a[id.attr] += rv.idade || 0;
  const es = estId ? ESTILOS[estId] : null; if (es) a[es.attr] += es.bonus;
  const mo = motId ? MOTIVACOES[motId] : null;
  if (mo) { a[mo.attr] += 1; const pf = PONTOS_FRACOS[mo.pfId]; if (pf) a[pf.attr] -= rv.pf || 0; }
  const as = assocId && assocId !== 'none' ? ASSOCIACOES[assocId] : null;
  if (as && as.attr) a[as.attr] += as.bonus;
  const cl = CLASSES[cId], nv = parseInt(nivel) || 1;
  if (cl && nv > 1) Object.keys(cl.somaNivel).forEach(k => { a[k] += cl.somaNivel[k] * (nv - 1); });
  if (!semPiso) ATTRS.forEach(k => { a[k] = Math.max(1, a[k]); });
  return a;
}

// ── Personagem ──
// Núcleo puro do gerarFicha da fase 10: recebe as escolhas, devolve o personagem.
function montarPersonagem(sel) {
  const nivel = parseInt(sel.nivel) || 1;
  const attrs = calcAttrsV15(sel.rId, sel.cId, sel.hId, sel.idadeId, sel.assocId, sel.estId, sel.motId, sel.rolls, nivel);
  const mot = sel.motId ? MOTIVACOES[sel.motId] : null;
  return {
    nome: (sel.nome || '').trim() || 'Personagem',
    rId: sel.rId, cId: sel.cId, hId: sel.hId, idadeId: sel.idadeId, assocId: sel.assocId,
    estId: sel.estId, motId: sel.motId,
    nivel, attrs,
    hpMax: calcHP(sel.rId, attrs, nivel),
    defesa: calcDefesa(sel.rId, sel.cId),
    vontMax: calcVontMax(nivel),
    caminhos: sel.caminhos || [],
    pontosCaminho: 4 + 2 * nivel,
    rolls: { ...(sel.rolls || {}) },
    r: RACAS[sel.rId], c: CLASSES[sel.cId], h: HISTORICOS[sel.hId],
    idade: sel.idadeId ? IDADES[sel.idadeId] : null,
    assoc: sel.assocId && sel.assocId !== 'none' ? ASSOCIACOES[sel.assocId] : null,
    est: sel.estId ? ESTILOS[sel.estId] : null,
    mot, pf: mot ? PONTOS_FRACOS[mot.pfId] : null,
  };
}

// Abre um personagem recém-criado: vida e Vontade cheias, kit inicial (REG-EQUIP-INI, D23).
function usarNovoPersonagem(char, foto) {
  currentChar = char;
  currentHp = char.hpMax;
  currentVont = char.vontMax;
  conditions = [];
  condDados = [];
  salvacaoUsada = false;
  morteState = { suc:0, meio:0 };
  inventario = Array(9).fill(null);
  inventario[0] = { itemKey:'armadura_leve' };
  inventario[1] = { itemKey:'arma_media' };
  currentPhotoDataUrl = foto || null;
  notasTexto = '';
  moedas = 15;
  salvarPersonagem();
}

// Ilwen, elfo mago nível 1: o personagem de exemplo do protótipo.
function personagemExemplo() {
  return montarPersonagem({
    nome: 'Ilwen', rId: 'elfo', cId: 'mago', hId: 'sabio', assocId: 'none', nivel: 1,
    rolls: { raca: 1, idade: 1, pf: 1 },
    caminhos: MAHOU.filter(h => h.classe === 'mago' && h.tipo === 'base').map(h => h.id),
  });
}

function linhaPersonagem(ch) {
  return `${ch.r.nome} ${ch.c.nome.toLowerCase()}, nível ${ch.nivel}`;
}

// ── Salvamento (localStorage) ──
function lerSaves() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); } catch (e) { return {}; }
}

function salvarPersonagem() {
  if (!currentChar) return;
  try {
    const saves = lerSaves();
    saves[currentChar.nome] = {
      char: currentChar, hp: currentHp, vont: currentVont,
      conditions, condDados, salvacaoUsada, morteState, inventario, photo: currentPhotoDataUrl,
      notas: notasTexto, moedas,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
    localStorage.setItem(EM_USO_KEY, currentChar.nome);
  } catch (e) { showToast('Erro ao salvar.'); }
}

function carregarPersonagem(nome) {
  const s = lerSaves()[nome];
  if (!s) return false;
  currentChar = s.char;
  currentHp = s.hp;
  currentVont = s.vont || currentChar.vontMax;
  conditions = s.conditions || [];
  condDados = s.condDados || [];
  salvacaoUsada = s.salvacaoUsada || false;
  morteState = s.morteState || { suc:0, meio:0 };
  inventario = s.inventario || Array(9).fill(null);
  currentPhotoDataUrl = s.photo || null;
  notasTexto = s.notas || '';
  moedas = s.moedas != null ? s.moedas : 15;   // saves sem o campo vieram com o kit
  try { localStorage.setItem(EM_USO_KEY, nome); } catch (e) {}
  return true;
}

// ── Navegação ──
const TELAS = {
  criacao: { id: 'tela-criacao', render: () => renderCriacao() },
  ficha:   { id: 'tela-ficha',   render: () => renderFicha() },
  combate: { id: 'tela-combate', render: () => renderCombate() },
};

function irPara(tela) {
  const t = TELAS[tela];
  if (!t) return;
  if ((tela === 'ficha' || tela === 'combate') && !currentChar) tela = 'criacao';
  telaAtual = tela;
  ladoFoco = tela === 'ficha' ? 'ficha' : 'combate';
  document.querySelectorAll('.tela').forEach(el => el.classList.toggle('ativa', el.id === TELAS[tela].id));
  aplicarLayout();
  if (layoutAtual() === 'duplo') renderFicha();     // ficha ao lado do combate
  TELAS[tela].render();
  window.scrollTo(0, 0);
  document.querySelectorAll('.tela').forEach(el => { el.scrollTop = 0; });
}

// ── Layout por largura (E4) ──
// < 600: protótipo (uma coluna). 600–1023: coluna larga, folhas como janelas.
// ≥ 1024: Ficha em 2 colunas ('ficha2'); Combate com a ficha ao lado ('duplo'). ≥ 1440: centrado, máx. 1360.
const MQ_LARGA = window.matchMedia('(min-width: 1024px)');
let ladoFoco = 'ficha';

function layoutAtual() {
  if (!MQ_LARGA.matches) return 'estreito';
  if (telaAtual === 'combate') return 'duplo';
  if (telaAtual === 'ficha') return 'ficha2';
  return 'largo';
}
const fichaVisivel = () => telaAtual === 'ficha' || layoutAtual() === 'duplo';

function aplicarLayout() {
  const lay = layoutAtual();
  document.body.dataset.layout = lay;
  document.getElementById('tela-ficha').classList.toggle('lado', lay === 'duplo');
  marcarFoco();
}

// Painel em foco normal, o outro esmaecido (~45%) até receber clique ou foco.
function marcarFoco() {
  const duplo = layoutAtual() === 'duplo';
  document.getElementById('tela-ficha').classList.toggle('esmaecida', duplo && ladoFoco !== 'ficha');
  document.getElementById('tela-combate').classList.toggle('esmaecida', duplo && ladoFoco !== 'combate');
}

function painelDe(el) {
  if (!el || !el.closest) return null;
  if (el.closest('#tela-ficha')) return 'ficha';
  if (el.closest('#tela-combate')) return 'combate';
  const f = el.closest('#folhas');
  return f ? (f.dataset.dono === 'combate' ? 'combate' : 'ficha') : null;
}

// No modo duplo, o que muda num painel (vida, itens, condições) aparece no outro.
// O painel é lido na captura, antes do clique trocar de tela ou fechar a folha.
let syncAntes = null;
function marcarOrigem(e) { syncAntes = layoutAtual() === 'duplo' ? painelDe(e.target) : null; }
function sincronizarLados(e) {
  const p = e.type === 'click' ? syncAntes : (layoutAtual() === 'duplo' ? painelDe(e.target) : null);
  syncAntes = null;
  if (!p || layoutAtual() !== 'duplo') return;
  if (p !== ladoFoco) { ladoFoco = p; marcarFoco(); }
  if (e.type !== 'click') return;
  if (p === 'ficha') renderCombate(); else renderFicha();
}

// Atalhos no combate: R rola, Enter confirma, E encerra o turno.
function atalhosCombate(e) {
  if (telaAtual !== 'combate' || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest && e.target.closest('input, textarea, select')) return;
  const k = e.key.toLowerCase();
  const visivel = sel => [...document.querySelectorAll(sel)].find(b => b.offsetParent && !b.disabled);
  const folhaCombate = document.getElementById('folhas').dataset.dono === 'combate' && document.querySelector('#folhas .folha-fundo');
  let alvo = null;
  if (k === 'r') alvo = visivel('#folhas [data-c="morte"]') || (!folhaCombate && (visivel('#tela-combate [data-c="iniciativa"]') || visivel('#tela-combate [data-c="exec"]')));
  else if (k === 'enter' && !(e.target.closest && e.target.closest('button, a'))) alvo = !folhaCombate && visivel('#tela-combate [data-c="exec"]');
  else if (k === 'e') alvo = !folhaCombate && visivel('#tela-combate [data-c="encerrar"]');
  if (!alvo) return;
  e.preventDefault();
  alvo.click();
}

// ── Tema ──
const ICONE_LUA = '<svg aria-hidden="true" viewBox="0 0 20 20"><path d="M15.5 12.5A6.5 6.5 0 0 1 7.5 4.5a6.5 6.5 0 1 0 8 8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
const ICONE_SOL = '<svg aria-hidden="true" viewBox="0 0 20 20"><circle cx="10" cy="10" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

function aplicarTema(tema) {
  const noite = tema === 'noite';
  document.documentElement.dataset.tema = noite ? 'noite' : 'dia';
  document.querySelectorAll('.btn-tema').forEach(b => {
    b.innerHTML = noite ? ICONE_SOL : ICONE_LUA;
    b.setAttribute('aria-pressed', noite ? 'true' : 'false');
    b.setAttribute('aria-label', noite ? 'Voltar ao modo dia' : 'Ativar modo noite');
  });
  document.querySelectorAll('[data-tema-rotulo]').forEach(b => {
    b.setAttribute('aria-pressed', noite ? 'true' : 'false');
    b.textContent = noite ? 'Modo noite: ligado' : 'Modo noite: desligado';
  });
}

function alternarTema() {
  const novo = document.documentElement.dataset.tema === 'noite' ? 'dia' : 'noite';
  try { localStorage.setItem(TEMA_KEY, novo); } catch (e) {}
  aplicarTema(novo);
}

function temaInicial() {
  try { const t = localStorage.getItem(TEMA_KEY); if (t) return t; } catch (e) {}
  return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'noite' : 'dia';
}

// ── Início ──
function iniciarApp() {
  aplicarTema(temaInicial());
  document.addEventListener('click', e => {
    if (e.target.closest('[data-acao="tema"]')) alternarTema();
  });
  iniciarCriacao();
  iniciarFicha();
  iniciarCombateUI();
  iniciarDadoPop();
  document.addEventListener('click', marcarOrigem, true);
  document.addEventListener('click', sincronizarLados);
  document.addEventListener('focusin', sincronizarLados);
  document.addEventListener('keydown', atalhosCombate);
  // E8: folha aberta esconde aviso anterior (ex.: "X foi criado." cobria a legenda da queda em 390px).
  new MutationObserver(() => {
    if (document.querySelector('#folhas .folha-fundo')) {
      clearTimeout(showToast._t);
      document.getElementById('toast')?.classList.remove('show');
    }
  }).observe(document.getElementById('folhas'), { childList: true });
  MQ_LARGA.addEventListener('change', () => { if (telaAtual) irPara(telaAtual); });
  let emUso = null;
  try { emUso = localStorage.getItem(EM_USO_KEY); } catch (e) {}
  irPara(emUso && carregarPersonagem(emUso) ? 'ficha' : 'criacao');
}
document.addEventListener('DOMContentLoaded', iniciarApp);
