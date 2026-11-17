// ui-dado.js — popup central de dado (E18, P2 passo 26; ref. BG3).
// Só exibe: quem rola continua sendo a ficha, a criação e o combate. Total no centro, mínimo e máximo
// abaixo, dado e bônus detalhados. Rolagens da mesma ação entram como linhas extras do mesmo popup.
// Fecha com Esc, com clique no popup (não aciona o que está embaixo) ou com clique fora (que segue valendo).

const DP_FORMA = { 4: 'M50 8 93 86H7z', 8: 'M50 4 92 50 50 96 8 50z' };
const DP_GIRO_MS = 650;
let dadoPopGiro = null;      // intervalo dos números que giram
let dadoPopLote = false;     // true enquanto a ação que abriu o popup ainda está rodando

// "FOR 3", "equipamento 1", "+ Bônus de Ataque[2]", "− Lentidão 2", "3" → [nome, valor com sinal]
function dpPartes(det) {
  return (det || []).map(s => {
    const m = String(s).match(/^([−+\- ]*)(.*?)\s*\[?(\d+)\]?$/);
    if (!m) return null;
    return [m[2] || 'Bônus', (/[−-]/.test(m[1]) ? -1 : 1) * +m[3]];
  }).filter(Boolean);
}
const dpSinal = v => (v < 0 ? '−' : '+') + Math.abs(v);

// o: { rotulo, lados = 4, face (número ou lista de faces), bonus = [[nome, valor]], total, min, max, nota }
function dadoPop(o) {
  const el = document.getElementById('dado-pop');
  if (!el) return;
  const lados = o.lados || 4, faces = [].concat(o.face), n = faces.length;
  const somaF = faces.reduce((a, b) => a + b, 0), bonus = o.bonus || [], somaB = bonus.reduce((a, b) => a + b[1], 0);
  const total = o.total != null ? o.total : somaF + somaB;
  const dTxt = `${n}d${lados}`, fTxt = faces.join(' + ');
  if (dadoPopLote && !el.classList.contains('oculto')) {       // mesma ação: linha extra
    const ul = el.querySelector('.dp-extras');
    ul.insertAdjacentHTML('beforeend', `<li class="dp-extra"><span>${esc(o.rotulo)}</span><b class="num">${dTxt} → ${fTxt}${bonus.length ? `, total ${total}` : ''}</b></li>`);
    ul.classList.remove('oculto');
    return;
  }
  const min = o.min != null ? o.min : n + somaB, max = o.max != null ? o.max : n * lados + somaB;
  const ponta = n === 1 && faces[0] === lados ? ' alto' : n === 1 && faces[0] === 1 ? ' baixo' : '';
  el.innerHTML = `<div class="dp-cartao${ponta}">
      <p class="dp-rot">${esc(o.rotulo)}</p>
      <div class="dp-dado" data-lados="${lados}">
        <svg aria-hidden="true" viewBox="0 0 100 100"><path d="${DP_FORMA[lados] || DP_FORMA[8]}"/></svg>
        <strong class="dp-total num">${total}</strong><span class="dp-gira num" aria-hidden="true"></span>
      </div>
      <p class="dp-faixa num"><span>mín <b class="dp-min">${min}</b></span><span>máx <b class="dp-max">${max}</b></span></p>
      <ul class="dp-det">
        <li class="dp-lin"><span>${dTxt}</span><b class="num">${fTxt}</b></li>
        ${bonus.map(([nome, v]) => `<li class="dp-lin"><span>${esc(nome)}</span><b class="num">${dpSinal(v)}</b></li>`).join('')}
      </ul>
      <p class="dp-nota${o.nota ? '' : ' oculto'}">${esc(o.nota || '')}</p>
      <ul class="dp-extras oculto"></ul>
      <p class="dp-dica" aria-hidden="true">Toque para fechar</p>
    </div>`;
  el.classList.remove('oculto');
  dadoPopLote = true; setTimeout(() => { dadoPopLote = false; }, 0);
  clearInterval(dadoPopGiro);
  const cartao = el.firstElementChild, gira = el.querySelector('.dp-gira');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { cartao.classList.add('pronto'); return; }
  cartao.classList.add('rolando');
  const fim = Date.now() + DP_GIRO_MS;
  const passo = () => {
    if (!cartao.isConnected) { clearInterval(dadoPopGiro); return; }
    if (Date.now() >= fim) { clearInterval(dadoPopGiro); cartao.classList.remove('rolando'); cartao.classList.add('pronto'); return; }
    gira.textContent = min + Math.floor(Math.random() * (max - min + 1));
  };
  passo(); dadoPopGiro = setInterval(passo, 60);
}

function fecharDadoPop() {
  const el = document.getElementById('dado-pop');
  if (!el || el.classList.contains('oculto')) return false;
  clearInterval(dadoPopGiro);
  el.classList.add('oculto'); el.innerHTML = '';
  return true;
}

function iniciarDadoPop() {
  // Captura: fecha antes de a ação do clique rodar; se o clique caiu no popup, ele não desce para a tela.
  document.addEventListener('click', e => {
    const c = document.querySelector('#dado-pop:not(.oculto) .dp-cartao');
    if (!c) return;
    const r = c.getBoundingClientRect();
    const dentro = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    fecharDadoPop();
    if (dentro) { e.stopPropagation(); e.preventDefault(); }
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharDadoPop(); });
}
