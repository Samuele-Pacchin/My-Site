/* =========================================================
   teovani.it — v2  ·  menu, reveal, workflow dal vivo, form
   ========================================================= */
document.documentElement.classList.add('js');
const yrEl = document.getElementById('yr'); if (yrEl) yrEl.textContent = new Date().getFullYear();
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Header + menu mobile ---------- */
const header = document.getElementById('header');
const onScroll = () => header.classList.toggle('scrolled', scrollY > 20);
addEventListener('scroll', onScroll, { passive: true }); onScroll();

const burger = document.getElementById('burger');
const menu = document.getElementById('menu');
function setMenu(open) {
  menu.classList.toggle('open', open);
  document.documentElement.classList.toggle('menu-open', open);
  burger.setAttribute('aria-expanded', open);
  burger.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
}
burger.addEventListener('click', e => { e.stopPropagation(); setMenu(!menu.classList.contains('open')); });
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('click', e => {
  if (menu.classList.contains('open') && !menu.contains(e.target) && !burger.contains(e.target)) setMenu(false);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); burger.focus(); }
});

/* ---------- Reveal allo scroll (mai sull'H1) ---------- */
const revealTargets = document.querySelectorAll('.h2, .lead, .m-item, .svc, .case, .st-col, .plan, .steps li, .bot-cta, .form');
if (!reduce && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  revealTargets.forEach((el, i) => { el.classList.add('rv'); el.style.transitionDelay = (i % 4) * 70 + 'ms'; io.observe(el); });
}

/* ---------- Workflow dal vivo ----------
   Replica del workflow reale "preventivi noleggio" (n8n + Claude).
   I dati sono simulati: azienda demo, richieste inventate. */
const SCENARI = [
  {
    from: 'm.bianchi@edilbianchi.it',
    out: [
      '"Mi serve un trabattello h 6 m dall\'8 all\'11 ottobre, consegna a Padova"',
      'trabattello 6 m · 3 giorni · Padova',
      'TRB-06 · disponibile',
      '3 gg × tariffa giornaliera + trasporto',
      'bozza pronta in Gmail',
      { label: 'Da inviare', color: 'var(--s-red)' }
    ]
  },
  {
    from: 'acquisti@costruzioniverdi.it',
    out: [
      '"Avete un muletto da 2,5 t per una settimana? Lo ritiriamo noi"',
      'carrello 2,5 t · 7 giorni · ritiro in sede',
      'MUL-25 · portata ok',
      'tariffa settimanale · trasporto 0 €',
      'bozza pronta in Gmail',
      { label: 'Da inviare', color: 'var(--s-red)' }
    ]
  },
  {
    from: 'l.marchetti@impiantimarchetti.it',
    out: [
      '"Ci servirebbe una gru da 40 m a Vicenza a fine mese"',
      'gru 40 m · Vicenza · date da definire',
      'fuori catalogo → da verificare',
      'nessun prezzo: prima verifichiamo',
      'bozza "stiamo verificando"',
      { label: 'In lavorazione', color: 'var(--s-pur)' }
    ]
  },
  {
    from: 'l.marchetti@impiantimarchetti.it',
    out: [
      '"Va bene, procedete con la prenotazione"',
      'conferma del cliente rilevata',
      'trattativa collegata · stesso thread',
      'prezzo già inviato · nessun calcolo',
      'bozza di conferma pronta',
      { label: 'Confermato', color: 'var(--s-grn)' }
    ]
  }
];

const LOG = [
  s => `nuova mail da ${s.from}`,
  () => 'estraggo articoli, date e luogo…',
  () => 'abbino gli articoli al catalogo…',
  () => 'calcolo la combinazione di tariffe più conveniente…',
  () => 'scrivo la risposta al cliente…',
  s => `semaforo aggiornato: ${s.out[5].label}`
];

const nodes = [...document.querySelectorAll('#wfNodes .node')];
const logEl = document.getElementById('wfLog');
const doneEl = document.getElementById('wfDone');
const wf = document.getElementById('wf');

function renderOut(node, val) {
  const o = node.querySelector('.n-out');
  if (typeof val === 'object') {
    o.innerHTML = '';
    const p = document.createElement('span'); p.className = 'pill';
    const i = document.createElement('i'); i.style.background = val.color;
    p.append(i, document.createTextNode(val.label)); o.append(p);
  } else o.textContent = val;
}

const plural = n => n === 1 ? '1 preventivo pronto' : `${n} preventivi pronti`;
let sc = 0, step = 0, done = 0, timer = null, paused = false, visible = true;

function tick() {
  const s = SCENARI[sc];
  if (step === 0) nodes.forEach(n => { n.classList.remove('active', 'done', 'last'); n.querySelector('.n-out').textContent = ''; });
  if (step > 0) { nodes[step - 1].classList.remove('active'); nodes[step - 1].classList.add('done'); }
  if (step < nodes.length) {
    nodes[step].classList.add('active');
    renderOut(nodes[step], s.out[step]);
    logEl.textContent = LOG[step](s);
    step++;
    timer = setTimeout(tick, step === 1 ? 1700 : 1150);
  } else {
    nodes[nodes.length - 1].classList.add('last');
    done++; doneEl.textContent = plural(done);
    logEl.textContent = `fatto. L'ufficio deve solo rileggere e premere invio.`;
    step = 0; sc = (sc + 1) % SCENARI.length;
    timer = setTimeout(tick, 3200);
  }
}
function play() { if (!timer && !paused && visible) tick(); }
function stop() { clearTimeout(timer); timer = null; }


if (!wf || !nodes.length) {
  // questa pagina non ha il workflow animato
} else if (reduce) {
  // stato statico: primo scenario completato
  const s = SCENARI[0];
  nodes.forEach((n, i) => { n.classList.add('done'); renderOut(n, s.out[i]); });
  nodes[nodes.length - 1].classList.add('last');
  logEl.textContent = 'esempio: richiesta letta, preventivo pronto, zero clic manuali.';
  doneEl.textContent = plural(1);
} else {
  // gira solo quando è visibile e la scheda è attiva (risparmia batteria)
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? play() : stop(); }, { threshold: .15 }).observe(wf);
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; visible ? play() : stop(); });
}

/* ---------- Form contatti (Web3Forms) ----------
   1. Vai su https://web3forms.com, inserisci samuelepacchin.swint@gmail.com
   2. Copia la access key che ricevi via mail e incollala qui sotto */
const WEB3FORMS_KEY = 'eebc0645-cdba-48a9-869d-babdbaae607e';

const form = document.getElementById('contactForm');
const status = document.getElementById('formStatus');
if (form) form.addEventListener('submit', async e => {
  e.preventDefault();
  status.className = 'f-status';
  if (!form.checkValidity()) {
    status.classList.add('err');
    status.textContent = 'Completa nome, cognome, email, messaggio e la casella privacy.';
    form.querySelector(':invalid')?.focus();
    return;
  }
  const btn = form.querySelector('button[type=submit]');
  btn.disabled = true; status.textContent = 'Invio in corso…';
  // FormData (senza header JSON): richiesta "semplice", funziona anche aprendo il sito come file
  const data = new FormData(form);
  data.append('name', `${data.get('nome')} ${data.get('cognome')}`.trim()); // nome completo come mittente
  data.append('access_key', WEB3FORMS_KEY);
  data.append('subject', `Nuova richiesta dal sito: ${data.get('servizio')}`);
  data.append('from_name', 'teovani.it');
  try {
    const r = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: data });
    const j = await r.json();
    if (!j.success) throw new Error();
    form.reset();
    status.classList.add('ok');
    status.textContent = 'Ricevuto. Ti rispondo entro un giorno lavorativo.';
  } catch {
    status.classList.add('err');
    status.textContent = 'Invio non riuscito. Scrivimi su WhatsApp o via email.';
  }
  btn.disabled = false;
});

/* ---------- Anteprime live: il sito è reso a larghezza desktop e scalato nel riquadro ---------- */
document.querySelectorAll('.live-vp').forEach(vp => {
  const f = vp.querySelector('iframe');
  const W = +vp.dataset.w || 1280;
  const fit = () => {
    const cw = vp.clientWidth, ch = vp.clientHeight;
    if (cw < 420) {           // telefono: il sito si mostra nella sua versione mobile
      f.style.width = cw + 'px'; f.style.height = ch + 'px'; f.style.transform = 'none';
    } else {
      const k = cw / W;
      f.style.width = W + 'px'; f.style.height = (ch / k) + 'px'; f.style.transform = `scale(${k})`;
    }
  };
  fit();
  new ResizeObserver(fit).observe(vp);
});

/* ---------- Demo nell'iframe: arrivati in fondo (o in cima) la rotella scorre questa pagina ----------
   Un solo movimento morbido che si somma a ogni scatto della rotella, così non ci sono scatti. */
window.teovaniScroll = (() => {
  let target = null, raf = 0;
  const stop = () => { cancelAnimationFrame(raf); raf = 0; target = null; };
  const step = () => {
    const diff = target - scrollY;
    if (Math.abs(diff) < 1) { scrollTo({ top: target, behavior: 'instant' }); stop(); return; }
    scrollTo({ top: scrollY + diff * 0.2, behavior: 'instant' });
    raf = requestAnimationFrame(step);
  };
  addEventListener('wheel', stop, { passive: true });      // la rotella sulla pagina ha la precedenza
  addEventListener('touchstart', stop, { passive: true });
  return dy => {
    const max = document.documentElement.scrollHeight - innerHeight;
    target = Math.max(0, Math.min(max, (target === null ? scrollY : target) + dy));
    if (reduce) { scrollTo({ top: target, behavior: 'instant' }); target = null; return; }
    if (!raf) raf = requestAnimationFrame(step);
  };
})();
addEventListener('message', e => {
  const d = e.data;
  if (!d || typeof d.teovaniScroll !== 'number') return;
  const ok = [...document.querySelectorAll('iframe')].some(f => f.contentWindow === e.source);
  if (ok) window.teovaniScroll(Math.max(-1200, Math.min(1200, d.teovaniScroll)));
});

/* Sito aperto da file (doppio clic): i link alle altre pagine puntano ai file index.html della cartella */
if (location.protocol === 'file:') {
  const css = document.querySelector('link[href$="style.css"]');
  const pre = css ? css.getAttribute('href').replace(/style\.css$/, '') : '';
  document.querySelectorAll('a[href^="/"]').forEach(a => {
    let h = a.getAttribute('href').slice(1), hash = '';
    const i = h.indexOf('#'); if (i >= 0) { hash = h.slice(i); h = h.slice(0, i); }
    if (h === '' || h.endsWith('/')) h += 'index.html';
    a.setAttribute('href', pre + h + hash);
  });
}

/* ---------- Passaggi dell'automazione (pagina progetto): si accendono uno dopo l'altro ---------- */
document.querySelectorAll('.flow').forEach(list => {
  const items = [...list.children];
  if (reduce || !items.length) return;
  let i = 0, t = null;
  const tick = () => {
    items.forEach((x, k) => { x.classList.toggle('on', k === i); x.classList.toggle('done', k < i); });
    i = (i + 1) % (items.length + 1);
    if (i === items.length) { t = setTimeout(() => { items.forEach(x => x.classList.remove('on', 'done')); i = 0; t = setTimeout(tick, 700); }, 1600); return; }
    t = setTimeout(tick, 1100);
  };
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { if (!t) tick(); } else { clearTimeout(t); t = null; }
  }, { threshold: .2 }).observe(list);
});

/* ---------- Ogni link porta all'inizio dell'argomento ----------
   Pagina nuova: si parte dall'alto. Link con #: si arriva all'inizio di quella sezione. */
addEventListener('load', () => {
  const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  if (nav && nav.type === 'back_forward') return;   // tornando indietro resta dove eri
  const id = decodeURIComponent(location.hash.slice(1));
  const el = id && document.getElementById(id);
  if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
  else if (!location.hash) scrollTo({ top: 0, behavior: 'instant' });
});
