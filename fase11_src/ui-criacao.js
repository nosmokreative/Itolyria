// ═══════════════════════════════════════════
// UI — CRIAÇÃO (fase 11, E3/E7): 4 etapas, 3 interlúdios e a crônica.
// Protótipo: canvas 91906058 (Criacao.dc.html). Regras: R6 (dados rolam uma vez), nível sempre 1.
// ═══════════════════════════════════════════
const CR_ETAPAS = ['Quem é', 'Origem', 'Personalidade', 'Ofício'];
const CR_PONTOS = 4 + 2 * 1;                         // pontos de caminho no nível 1
const CR_KIT_DEFESA = 1;                             // armadura leve do kit inicial (REG-EQUIP-INI)
const CR_NOMES = ['Ilwen', 'Tarek', 'Brunna', 'Maelis', 'Doran', 'Yara', 'Kesh', 'Corvo', 'Lisandra', 'Oto'];
const CR_CAMINHOS = ['chama', 'mares', 'raiz', 'sopro', 'veu'];
const CR_DIVISOR = '<svg aria-hidden="true" class="cr-div" viewBox="0 0 120 16"><path d="M2 8h46M72 8h46" stroke="currentColor" stroke-width="1.5"/><path d="M60 2l6 6-6 6-6-6z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
let wzSel = novaSelecao();

function novaSelecao() {
  return { etapa: 1, historia: false, cronica: false, nome: '', foto: null,
    rId: null, hId: null, idadeId: null, assocId: null, estId: null, motId: null, cId: null,
    caminhos: [], rolls: { FOR: null, VIG: null, AGI: null, INT: null, VONT: null, idade: null, pf: null } };   // E16: base 1d4 por atributo
}
const crD4 = () => 1 + Math.floor(Math.random() * 4);
const crSorteia = obj => { const k = Object.keys(obj); return k[Math.floor(Math.random() * k.length)]; };
const crMin = t => t ? t.charAt(0).toLowerCase() + t.slice(1) : '';

// E17: associação dá +1 no atributo dela para qualquer classe (Mercantes = AGI).
function crAttrAssoc(id, cId) {
  const a = ASSOCIACOES[id];
  if (!a || !a.attr) return null;
  return a.attr;
}
function crImpactoAssoc(id) {
  if (id === 'none') return 'sem bônus';
  return `+1 ${ASSOCIACOES[id].attr}`;
}
const crPf = () => wzSel.motId ? PONTOS_FRACOS[MOTIVACOES[wzSel.motId].pfId] : null;

// Atributos da prévia: dado não rolado conta 0. Piso 1 (D80) só quando a base já foi rolada.
function crAttrs(rolls) {
  const r = rolls || wzSel.rolls;
  const s = wzSel, v = { idade: r.idade || 0, pf: r.pf || 0 };
  ATTRS.forEach(k => { v[k] = r[k] || 0; });
  return calcAttrsV15(s.rId, s.cId, s.hId, s.idadeId, s.assocId, s.estId, s.motId, v, 1, ATTRS.some(k => !r[k]));
}
function crPerdaPf() {
  const pf = crPf();
  if (!pf || !wzSel.rolls.pf) return 0;
  return crAttrs({ ...wzSel.rolls, pf: 0 })[pf.attr] - crAttrs()[pf.attr];
}

// ── O que falta em cada etapa ──
function crFaltas(n) {
  const s = wzSel, f = [];
  if (n === 1 && !s.nome.trim()) f.push('nome');
  if (n === 2) {
    if (!s.rId) f.push('raça'); if (!s.hId) f.push('histórico');
    if (!s.idadeId) f.push('idade'); if (!s.assocId) f.push('lealdade');
  }
  if (n === 3) { if (!s.estId) f.push('estilo'); if (!s.motId) f.push('motivação'); }
  if (n === 4) { if (!s.cId) f.push('ofício'); else if (!s.caminhos.length) f.push('uma habilidade'); }
  return f;
}
function crDadosPendentes(n) {
  const r = wzSel.rolls;
  if (n === 2) return ATTRS.filter(k => !r[k]).length + (wzSel.idadeId && !r.idade ? 1 : 0);
  if (n === 3) return wzSel.motId && !r.pf ? 1 : 0;
  return 0;
}
const crEtapaOk = n => !crFaltas(n).length && !crDadosPendentes(n);
const crPodeIr = n => { for (let i = 1; i < n; i++) if (!crEtapaOk(i)) return false; return true; };

// ── Crônica (E7) ──
// Uma frase fechada por escolha; só aparece nos interlúdios e na crônica, nunca nos cards.
// Caminhos não geram frase. Frases sem gênero: o nome é o único sujeito explícito.
const CR_CRONICA = {
  abre: {
    2: 'Abre-se o livro das crônicas, e a primeira tinta escreve um nome: {N}.',
    3: 'Vira-se a página, e o cronista molha a pena para falar do que move e do que trava.',
    4: 'Na última página ainda em branco, o cronista escreve o que essas mãos escolheram fazer.',
  },
  fecha: { 2: 'Assim se encerra o primeiro capítulo.', 3: 'Assim se encerra o segundo capítulo.', 4: 'Assim se encerra o terceiro capítulo.' },
  titulo: { 2: 'De onde se vem', 3: 'O coração', 4: 'O ofício' },
  selo: 'E aqui a tinta para, porque o resto ainda não aconteceu. O que vier depois será escrito à mesa, a cada rolar de dados.',
  raca: {
    elfo:    'Veio do sangue dos elfos, e a magia lhe corre nas veias como regato de degelo: mansa, contínua, sem nunca secar.',
    humano:  'Veio do sangue dos homens, sem herança de feitiço alguma, só uma teimosia que já dobrou ferro que magia nenhuma dobrou.',
    anao:    'Veio do sangue dos anões, gente talhada na pedra da montanha; onde pisa, o chão aprende a não ceder.',
    demonio: 'Veio do sangue do abismo, e as velas tremem quando entra no salão; há quem se ajoelhe, há quem fuja, mas ninguém fica indiferente.',
  },
  hist: {
    sabio:  'Cresceu no alto de uma torre, entre pergaminhos amarelados e velhos ranzinzas que discutiam estrelas até a última vela.',
    work:   'Cresceu entre o arado e a colheita, e aprendeu cedo que a terra só dá a quem lhe dá as mãos.',
    runner: 'Cresceu na estrada, dormindo sob carroças e constelações, e conhece mais tavernas do que muito rei conhece vassalos.',
    atleta: 'Cresceu na vida boêmia, entre alaúdes, dados e canecas, e sempre pagou a conta da noite com um sorriso.',
    herd:   'Cresceu atrás de muros de família, com brasão bordado no peito e mesa farta, sem nunca ter conhecido o frio.',
  },
  idade: {
    jovem:  'Ainda é broto novo; a espada pesa mais do que deveria, e cada dia traz uma lição que arde.',
    adulto: 'Está no verão da vida, quando o braço é firme e a estrada já não assusta.',
    idoso:  'Já tem neve nos cabelos e cicatrizes que contam histórias; viu reis subirem e caírem, e pouca coisa ainda espanta esses olhos.',
  },
  assoc: {
    none:      'Não jurou bandeira a senhor algum; o vento é seu único suserano, e a estrada, sua única lei.',
    imperio:   'Dobrou o joelho diante da Coroa e carrega o nome do Império como escudo pesado demais para soltar.',
    merc:      'Selou pacto com os Mercantes, onde toda palavra tem preço e toda lealdade cabe numa balança.',
    demon:     'Bebeu do mesmo cálice que os demônios, e sabe que esse vinho, cedo ou tarde, cobra a taça inteira.',
    tribo_elf: 'Senta-se ao fogo da Tribo Anciã, guardiã de costumes que já eram velhos quando os primeiros reinos ainda eram aldeias.',
  },
  est: {
    analitico:   'Diante do perigo, observa antes de mover um dedo; conta as sombras, mede os passos e só então decide.',
    agressivo:   'Diante do perigo, não espera o segundo aviso; a lâmina sai da bainha antes que a pergunta termine.',
    protetor:    'Diante do perigo, põe o próprio corpo entre a fera e os pequenos, muralha que ninguém mandou erguer.',
    preciso:     'Diante do perigo, guarda a flecha até o instante exato, porque um golpe certeiro vale mais que dez desesperados.',
    diplomatico: 'Diante do perigo, tenta primeiro a palavra, que já abriu mais portões de castelo que qualquer aríete.',
  },
  mot: {
    forte:     'Quer provar, a si e ao mundo, que tem força bastante para que seu nome não caia no esquecimento.',
    perdido:   'Caminha atrás de algo, ou de alguém, que se perdeu, e procura em cada rosto, cada ruína, cada estalagem.',
    magia:     'Persegue uma magia que nenhum mestre soube explicar, escrita em runas que ainda parecem rir de quem as lê.',
    proteger:  'Jurou ser abrigo de quem não tem abrigo, e esse juramento pesa mais que qualquer armadura.',
    horizonte: 'Tem fome do que existe além do último mapa, onde os cartógrafos desenhavam dragões por falta de coragem de ir ver.',
    legado:    'Carrega uma missão herdada, passada de mão em mão como espada de família, e não aceita ser o elo que se quebra.',
    perda:     'Carrega uma perda que nenhum inverno curou, e caminha para que essa dor um dia vire canção, não ferida.',
    entender:  'Quer entender o desenho do mundo e descobrir em que canto dessa tapeçaria foi bordado o próprio nome.',
    treino:    'Treina antes do galo e depois da lua, porque não aceita que suor algum seja maior que o seu.',
    seguir:    'Segue em frente custe o que custar; se houver muro, escala; se houver rei, contorna; se houver abismo, salta.',
  },
  pf: {
    orgulho:    'Mas o orgulho é pedra no sapato; na hora em que mais precisa curvar a cabeça, ela teima em ficar erguida.',
    impulso:    'Mas, quando alguém querido grita por socorro, o juízo se cala e as pernas correm antes do plano.',
    isolamento: 'Mas pedir ajuda lhe queima a garganta, e prefere carregar o fardo sem ninguém ao lado.',
    medo:       'Mas mora em seu peito um medo antigo, o de vacilar justamente quando o destino olhar em sua direção.',
    recolhe:    'Mas, quando a tempestade aperta, fecha as portas da alma e some, como bicho que se esconde na toca.',
  },
  classe: {
    soldado: 'Ergueu escudo e lança no ofício de soldado, onde a disciplina é oração e a fileira é família.',
    monge:   'Abraçou o ofício de monge e fez do próprio corpo um mosteiro; cada golpe é prece, cada respiro é regra.',
    pastor:  'Tomou o cajado do ofício de pastor, e sua voz guarda o rebanho tanto quanto condena os lobos.',
    barbaro: 'Seguiu o ofício de bárbaro, e cada ferida recebida vira lenha na fogueira da próxima investida.',
    bardo:   'Escolheu o ofício de bardo e luta como quem compõe, com ritmo, com pausa, com a nota certa na hora certa.',
    cacador: 'Seguiu o ofício de caçador, lendo rastros na lama e silêncios na mata, e sabe esperar mais que a própria presa.',
    mago:    'Entrou no ofício de mago e estuda a magia como quem doma cavalo bravo, com paciência, até que ela obedeça.',
    xama:    'Aceitou o ofício de xamã e conversa com espíritos que dançam onde os outros só enxergam fumaça.',
  },
};

// Frases do capítulo (2 Origem, 3 Coração, 4 Ofício) para uma seleção ou personagem salvo.
function crCapitulo(n, sel) {
  const C = CR_CRONICA, mot = sel.motId && MOTIVACOES[sel.motId];
  const f = n === 2 ? [C.raca[sel.rId], C.hist[sel.hId], C.idade[sel.idadeId], C.assoc[sel.assocId]]
          : n === 3 ? [C.est[sel.estId], mot && C.mot[sel.motId], mot && C.pf[mot.pfId]]
          : n === 4 ? [C.classe[sel.cId]] : [];
  return f.filter(Boolean);
}
// Crônica inteira: 3 parágrafos + selo. O 1º começa pelo nome.
function crCronicaDe(sel) {
  const nome = (sel.nome || '').trim() || 'Seu personagem';
  const p = [2, 3, 4].map(n => crCapitulo(n, sel).join(' ')).filter(Boolean);
  if (p[0]) p[0] = `${nome} ${crMin(p[0])}`;
  return p.concat(CR_CRONICA.selo);
}
const crAbre = n => CR_CRONICA.abre[n].replace('{N}', wzSel.nome.trim() || 'Seu personagem');

const crDadoTxt = (r, k) => r ? `+${r} ${k} (dado ${r})` : `+1d4 ${k}, rola na próxima tela`;

// ── Render ──
function renderCriacao() {
  const s = wzSel;
  document.getElementById('cr-cancelar').classList.toggle('oculto', !currentChar);
  document.getElementById('cr-etapas').innerHTML = CR_ETAPAS.map((nome, i) => {
    const n = i + 1, cur = n === s.etapa, feita = n < s.etapa;
    return `<li><span aria-hidden="true" class="cr-barra${cur ? ' cur' : feita ? ' feita' : ''}"></span>
      <button type="button" data-cr="ir" data-n="${n}" ${cur ? 'aria-current="step"' : ''} ${crPodeIr(n) ? '' : 'disabled'}>${nome}</button></li>`;
  }).join('');
  const corpo = document.getElementById('criacao-corpo');
  corpo.innerHTML = s.cronica ? htmlCronicaCr() : s.historia ? htmlHistoriaCr()
    : s.etapa === 1 ? htmlQuemCr() : s.etapa === 4 ? htmlOficioCr() : htmlNarrativaCr();
  renderRodapeCr();
}

function htmlQuemCr() {
  const s = wzSel;
  return `<h2 class="cr-h1">Quem é você?</h2>
    <div class="cr-campo">
      <label for="cr-nome" class="suave">Nome do personagem</label>
      <input id="cr-nome" type="text" maxlength="40" autocomplete="off" value="${esc(s.nome)}" placeholder="Como vão te chamar na mesa">
    </div>
    <label class="cr-foto${s.foto ? ' com' : ''}">
      ${s.foto ? `<img src="${s.foto}" alt="Foto do personagem">` : 'Adicionar foto'}
      <input type="file" accept="image/*" id="cr-foto" class="cr-arquivo">
    </label>
    ${s.foto ? '<button type="button" class="btn btn-texto cr-tirar" data-cr="semfoto">Tirar foto</button>' : ''}`;
}

// E7c: card só com nome e efeito; o texto lúdico se descobre no interlúdio.
function crCard(chave, id, nome, texto, impacto) {
  const on = wzSel[chave] === id, algum = !!wzSel[chave];
  return `<button type="button" class="cr-opc${on ? ' on' : algum ? ' apagada' : ''}" data-cr="pick" data-k="${chave}" data-v="${id}" aria-pressed="${on}">
    <span class="cr-opc-topo"><strong>${esc(nome)}</strong><span class="cr-imp num">${esc(impacto)}</span></span>
    ${texto ? `<span class="suave cr-opc-txt">${esc(texto)}</span>` : ''}</button>`;
}
function crPainel(rotulo, efeito, neg) {
  return `<div class="cr-painel${neg ? ' neg' : ''}"><span class="cr-faixa" aria-hidden="true"></span>
    <div><span class="cr-pn-rot">${esc(rotulo)}</span><span class="cr-pn-ef num">${esc(efeito)}</span></div></div>`;
}
function crBloco(pergunta, chave, opcoes, efeito) {
  return `<section class="cr-bloco" data-bloco="${chave}"><h3>${pergunta}</h3>
    ${opcoes.map(o => crCard(chave, ...o)).join('')}
    ${wzSel[chave] ? crPainel('O que isso muda em você', efeito(wzSel[chave])) : ''}</section>`;
}

function htmlNarrativaCr() {
  const s = wzSel, r = s.rolls;
  if (s.etapa === 2) {
    return `<h2 class="cr-h1">De onde você vem?</h2>` +
      crBloco('Em que sangue você nasceu?', 'rId',
        Object.entries(RACAS).map(([id, x]) => [id, x.nome, null, `+1 ${x.attrRaca}, Defesa ${x.defesa}`]),
        id => `+1 ${RACAS[id].attrRaca} e Defesa ${RACAS[id].defesa}`) +
      crBloco('Como você cresceu?', 'hId',
        Object.entries(HISTORICOS).map(([id, x]) => [id, x.nome, null, `+${x.bonus} ${x.attr}`]),
        id => `+${HISTORICOS[id].bonus} ${HISTORICOS[id].attr}`) +
      crBloco('Em que fase da vida você está?', 'idadeId',
        Object.entries(IDADES).map(([id, x]) => [id, x.nome, null, `+1d4 ${x.attr}`]),
        id => crDadoTxt(r.idade, IDADES[id].attr)) +
      crBloco('A quem você deve lealdade?', 'assocId',
        Object.entries(ASSOCIACOES).map(([id, x]) => [id, x.nome, null, crImpactoAssoc(id)]),
        id => id === 'none' ? 'Nenhum atributo muda' : crImpactoAssoc(id));
  }
  const pf = crPf();
  let h = `<h2 class="cr-h1">Como você age?</h2>` +
    crBloco('Como você enfrenta um problema?', 'estId',
      Object.entries(ESTILOS).map(([id, x]) => [id, x.nome, null, `+${x.bonus} ${x.attr}`]),
      id => `+${ESTILOS[id].bonus} ${ESTILOS[id].attr}`) +
    crBloco('O que te move?', 'motId',
      Object.entries(MOTIVACOES).map(([id, x]) => {
        const p = PONTOS_FRACOS[x.pfId];
        return [id, x.texto, `Fraqueza: ${p.nome.toLowerCase()}`, `+1 ${x.attr}, −1d4 ${p.attr}`];
      }),
      id => `+1 ${MOTIVACOES[id].attr}`);
  if (pf) {
    h += `<section class="cr-bloco" data-bloco="pf"><h3>E o que te trava: ${esc(pf.nome.toLowerCase())}</h3>
      ${crPainel('Peso da fraqueza', r.pf ? `−${crPerdaPf()} ${pf.attr} (dado ${r.pf})` : `−1d4 ${pf.attr}, rola na próxima tela`, true)}</section>`;
  }
  return h;
}

function crDadoCard(rotulo, attr, val, chave, neg, base) {
  return `<div class="cr-dado${neg ? ' neg' : ''}"><strong>${esc(rotulo)}</strong>
    ${val ? `<span class="cr-dado-v num">${base ? '' : neg ? '−' : '+'}${val}${base ? '' : ' ' + attr}</span>`
          : `<button type="button" class="btn btn-cheio cr-rolar" data-cr="rolar" data-d="${chave}"${base ? ` aria-label="Rolar 1d4 para ${attr}">Rolar` : `>Rolar 1d4 para ${attr}`}</button>`}</div>`;
}
function htmlHistoriaCr() {
  const s = wzSel, r = s.rolls, pf = crPf();
  let chips = [], dados = [], base = [];
  if (s.etapa === 2) {
    const ra = RACAS[s.rId], id = IDADES[s.idadeId], aA = crAttrAssoc(s.assocId, s.cId);
    chips.push([`${ra.nome} +1 ${ra.attrRaca}`]);
    chips.push([`${HISTORICOS[s.hId].nome} +${HISTORICOS[s.hId].bonus} ${HISTORICOS[s.hId].attr}`]);
    if (r.idade) chips.push([`${id.nome} +${r.idade} ${id.attr}`]);
    if (aA) chips.push([`${ASSOCIACOES[s.assocId].nome} +1 ${aA}`]);
    base = ATTRS.map(k => crDadoCard(k, k, r[k], k, false, true));   // E16: REG-CRIA-01
    dados = [crDadoCard(`Dado de idade (${id.nome})`, id.attr, r.idade, 'idade')];
  } else if (s.etapa === 3) {
    chips.push([`${ESTILOS[s.estId].nome} +${ESTILOS[s.estId].bonus} ${ESTILOS[s.estId].attr}`]);
    chips.push([`Motivação +1 ${MOTIVACOES[s.motId].attr}`]);
    if (r.pf) chips.push([`${pf.nome} −${crPerdaPf()} ${pf.attr}`, true]);
    dados = [crDadoCard(`Peso da fraqueza (${pf.nome})`, pf.attr, r.pf ? crPerdaPf() : 0, 'pf', true)];
  } else {
    const c = CLASSES[s.cId], n = s.caminhos.length;
    chips.push([`${c.nome}, ataca com ${c.atkAttr}`], [`Defesa ${calcDefesa(s.rId, s.cId) + CR_KIT_DEFESA}`],   // E7b: mesmo número da prévia
      [`${n} ${n === 1 ? 'habilidade' : 'habilidades'}`]);
  }
  return `<section class="cr-historia">${CR_DIVISOR}
    <h2>${CR_CRONICA.titulo[s.etapa]}</h2>
    <p class="narrativa cr-hist-abre">${esc(crAbre(s.etapa))}</p>
    <p class="narrativa cr-hist-txt">${esc(crCapitulo(s.etapa, s).join(' '))}</p>
    <p class="narrativa cr-hist-fecha">${esc(CR_CRONICA.fecha[s.etapa])}</p>
    <div class="cr-chips">${chips.map(([t, neg]) => `<span class="cr-chip num${neg ? ' neg' : ''}">${esc(t)}</span>`).join('')}</div>
    ${base.length ? `<h3 class="cr-dados-tit">Atributos base: 1d4 em cada</h3><div class="cr-dados cr-dados-base">${base.join('')}</div>` : ''}
    ${dados.length ? `<div class="cr-dados">${dados.join('')}</div>
    <p class="suave cr-nota">Cada dado rola uma vez.</p>` : ''}${CR_DIVISOR}</section>`;
}
function htmlCronicaCr() {
  const s = wzSel, p = crCronicaDe(s), selo = p.pop();
  return `<section class="cr-historia cr-cronica">${CR_DIVISOR}
    <h2>Crônica de ${esc(s.nome.trim())}</h2>
    ${p.map(t => `<p class="narrativa cr-hist-txt">${esc(t)}</p>`).join('')}
    <p class="narrativa cr-hist-fecha">${esc(selo)}</p>${CR_DIVISOR}</section>`;
}

function htmlOficioCr() {
  const s = wzSel;
  let h = `<h2 class="cr-h1">Qual é o seu ofício?</h2><div class="cr-classes">` +
    Object.entries(CLASSES).map(([id, c]) => {
      const on = s.cId === id, algum = !!s.cId;
      return `<button type="button" class="cr-classe${on ? ' on' : algum ? ' apagada' : ''}" data-cr="classe" data-v="${id}" aria-pressed="${on}">
        <strong>${c.nome}</strong><span>Ataca com ${c.atkAttr}, Defesa ${c.defBase}</span></button>`;
    }).join('') + '</div>';
  if (!s.cId) return h + '<p class="suave">Escolha um ofício para ver as habilidades iniciais.</p>';
  const arv = arvoreDe(s.cId), f = s.filtro || 'todos';
  const nos = arv.filter(x => f === 'todos' || x.caminho === f);
  h += `<section class="cr-bloco"><div class="cr-hab-topo"><h3>Habilidades iniciais</h3>
    <span class="num suave cr-pontos">${s.caminhos.length} de ${CR_PONTOS} pontos</span></div>
    ${htmlPentaCaminhos(f, 'data-cr')}
    ${htmlListaNos(nos, arv, s.caminhos, CR_PONTOS, 'data-cr="base"')}
    <p class="suave cr-nota">Aprimoramento exige a base do caminho. Troca livre depois, na ficha, fora de combate.</p></section>`;
  return h;
}

function renderRodapeCr() {
  const s = wzSel, A = crAttrs(), atk = s.cId ? CLASSES[s.cId].atkAttr : null;
  const vida = s.rId ? calcHP(s.rId, A, 1) : 5;
  const def = s.rId && s.cId ? calcDefesa(s.rId, s.cId) + CR_KIT_DEFESA : '—';
  let principal;
  if (s.cronica) {
    const ok = [1, 2, 3, 4].every(crEtapaOk);
    principal = `<button type="button" class="btn btn-cheio cr-avancar" data-cr="criar" ${ok ? '' : 'disabled'}>Criar personagem</button>`;
  } else if (s.historia) {
    const pend = crDadosPendentes(s.etapa);
    principal = `<button type="button" class="btn btn-cheio cr-avancar" data-cr="avancar" ${pend ? 'disabled' : ''}>${pend ? (pend > 1 ? `Role os ${pend} dados para seguir` : 'Role o dado para seguir') : s.etapa === 4 ? 'Ler a crônica' : 'Continuar'}</button>`;
  } else {
    const f = crFaltas(s.etapa);
    principal = `<button type="button" class="btn btn-cheio cr-avancar" data-cr="avancar" ${f.length ? 'disabled' : ''}>${
      f.length ? 'Falta: ' + f.join(', ') : (s.etapa === 1 ? 'Continuar para origem' : 'Continuar')}</button>`;
  }
  document.getElementById('cr-rodape').innerHTML = `
    <div class="cr-previa" aria-label="Prévia do personagem">
      <div class="cr-attrs">${ATTRS.map(k => `<div class="${k === atk ? 'atk' : ''}"><span>${k}</span><strong class="num">${wzSel.rolls[k] ? A[k] : '—'}</strong></div>`).join('')}</div>
      <div class="cr-vd num"><span>Vida ${vida}</span><span>Defesa ${def}</span></div>
    </div>
    <div class="cr-acoes">${s.etapa > 1 || s.historia || s.cronica ? '<button type="button" class="btn cr-voltar" data-cr="voltar">Voltar</button>' : ''}${principal}</div>`;
}

// ── Ações ──
function crAvancar() {
  const s = wzSel;
  if (s.etapa >= 2 && !s.historia) { s.historia = true; return; }   // escolhas → interlúdio
  if (s.etapa === 4) { s.cronica = true; return; }                  // interlúdio 3 → crônica
  s.historia = false;
  s.etapa = Math.min(4, s.etapa + 1);
}
function crVoltar() {
  if (wzSel.cronica) wzSel.cronica = false;
  else if (wzSel.historia) wzSel.historia = false;
  else wzSel.etapa = Math.max(1, wzSel.etapa - 1);
}
function crPick(chave, v) {
  wzSel[chave] = v;
  // E7e: painel sem aria-live; anuncia só o efeito da escolha depois do render.
  queueMicrotask(() => {
    const el = document.getElementById('cr-anuncio');
    if (!el) return;
    const txt = k => document.querySelector(`[data-bloco="${k}"] .cr-pn-ef`)?.textContent.trim();
    const nome = document.querySelector(`[data-k="${chave}"][data-v="${v}"] strong`)?.textContent.trim();
    const partes = [txt(chave), chave === 'motId' ? txt('pf') && `fraqueza ${txt('pf')}` : null].filter(Boolean);
    if (nome && partes.length) el.textContent = `${nome}: ${partes.join('; ')}.`;
  });
}
function crClasse(id) {
  if (wzSel.cId === id) return;
  wzSel.cId = id; wzSel.caminhos = []; wzSel.filtro = 'todos';
}
function crBase(id) {
  wzSel.caminhos = alternarNoLista(wzSel.caminhos, id, MAHOU.filter(x => x.classe === wzSel.cId), CR_PONTOS);
}
const CR_DADO_NOME = { idade: 'Dado de idade', pf: 'Peso da fraqueza', FOR: 'FOR base', VIG: 'VIG base', AGI: 'AGI base', INT: 'INT base', VONT: 'VONT base' };
function crRolar(chave) {
  if (wzSel.rolls[chave]) return;              // R6: cada dado rola uma vez
  wzSel.rolls[chave] = crD4();
  dadoPop({ rotulo: CR_DADO_NOME[chave], face: wzSel.rolls[chave] });
  // E7d: anuncia só o resultado; o interlúdio não é relido a cada dado.
  const el = document.getElementById('cr-anuncio');
  if (el) el.textContent = `${CR_DADO_NOME[chave]}: ${wzSel.rolls[chave]}.`;
}

function crAleatorio() {
  const s = wzSel;
  if (!s.nome.trim()) s.nome = CR_NOMES[Math.floor(Math.random() * CR_NOMES.length)];
  s.rId = crSorteia(RACAS); s.hId = crSorteia(HISTORICOS); s.idadeId = crSorteia(IDADES);
  s.assocId = crSorteia(ASSOCIACOES); s.estId = crSorteia(ESTILOS); s.motId = crSorteia(MOTIVACOES);
  s.cId = crSorteia(CLASSES);
  // R6: dado já rolado continua; só rola o que falta.
  [...ATTRS, 'idade', 'pf'].forEach(k => { if (!s.rolls[k]) s.rolls[k] = crD4(); });
  const bases = MAHOU.filter(x => x.classe === s.cId && x.tipo === 'base').map(x => x.id);
  s.caminhos = [];
  while (s.caminhos.length < 3) s.caminhos.push(bases.splice(Math.floor(Math.random() * bases.length), 1)[0]);
  s.etapa = 4; s.historia = false; s.cronica = false;
}

function crCriar() {
  const s = wzSel;
  for (let n = 1; n <= 4; n++) if (!crEtapaOk(n)) { s.etapa = n; s.historia = false; s.cronica = false; return; }
  const nome = s.nome.trim();
  if (lerSaves()[nome]) { showToast('Já existe um personagem com esse nome.'); s.etapa = 1; s.historia = false; s.cronica = false; return; }
  const char = montarPersonagem({ ...s, nome, nivel: 1, rolls: { ...s.rolls }, caminhos: [...s.caminhos] });
  usarNovoPersonagem(char, s.foto);
  wzSel = novaSelecao();
  irPara('ficha');
  showToast(`${nome} foi criado.`);
  return true;
}

// Foto: reduz para 256px para caber no localStorage.
function crFoto(arq) {
  if (!arq || !/^image\//.test(arq.type)) return;
  const leitor = new FileReader();
  leitor.onload = () => {
    const img = new Image();
    img.onload = () => {
      const lado = 256, k = Math.min(1, lado / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      wzSel.foto = cv.toDataURL('image/jpeg', .85);
      renderCriacao();
    };
    img.onerror = () => showToast('Não deu para ler essa imagem.');
    img.src = leitor.result;
  };
  leitor.readAsDataURL(arq);
}

function iniciarCriacao() {
  const tela = document.getElementById('tela-criacao');
  tela.addEventListener('click', e => {
    const b = e.target.closest('[data-cr]');
    if (!b || b.disabled) return;
    const a = b.dataset.cr, s = wzSel;
    if (a === 'ir') { const n = +b.dataset.n; if (crPodeIr(n)) { s.etapa = n; s.historia = false; s.cronica = false; } }
    else if (a === 'pick') crPick(b.dataset.k, b.dataset.v);
    else if (a === 'classe') crClasse(b.dataset.v);
    else if (a === 'base') crBase(b.dataset.v);
    else if (a === 'caminho') s.filtro = b.dataset.v;
    else if (a === 'rolar') crRolar(b.dataset.d);
    else if (a === 'avancar') crAvancar();
    else if (a === 'voltar') crVoltar();
    else if (a === 'aleatorio') crAleatorio();
    else if (a === 'semfoto') s.foto = null;
    else if (a === 'cancelar') { wzSel = novaSelecao(); irPara('ficha'); return; }
    else if (a === 'criar') { if (crCriar()) return; }
    const rolar = a === 'avancar' || a === 'voltar' || a === 'ir' || a === 'aleatorio' || a === 'criar';
    renderCriacao();
    if (rolar) window.scrollTo(0, 0);
  });
  tela.addEventListener('input', e => {
    if (e.target.id !== 'cr-nome') return;
    wzSel.nome = e.target.value;
    renderRodapeCr();
    document.querySelectorAll('#cr-etapas button').forEach(bt => { bt.disabled = !crPodeIr(+bt.dataset.n); });
  });
  tela.addEventListener('change', e => { if (e.target.id === 'cr-foto') crFoto(e.target.files[0]); });
  tela.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.id === 'cr-nome' && crEtapaOk(1)) { crAvancar(); renderCriacao(); }
  });
}
