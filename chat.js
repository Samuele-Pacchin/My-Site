/* ================= CHAT WIDGET — Assistente AI di Samuele Pacchin =================
   v3 (ott 2026): il bot raccoglie i dati, compila il form, mostra il riepilogo
   e, alla conferma del lead, invia la richiesta con Web3Forms (stessa chiave del form). */
(function () {
  // Indirizzo del Worker pubblicato su Cloudflare
  const API_URL = "https://assistente-ai-di-samuele.samuelepacchin47.workers.dev";

  const WELCOME = "Ciao! Sono l'assistente AI di Samuele, costruito da lui con Claude. Posso raccontarti servizi, prezzi e progetti e, quando vuoi, compilo io la richiesta e la invio a Samuele per te. Che progetto hai in mente?";
  const FAIL = "Scusa, qualcosa non ha funzionato. Riprova, oppure scrivi a Samuele su WhatsApp o via mail (sezione Contatti).";
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const fab = document.getElementById('chatFab');
  const panel = document.getElementById('chatPanel');
  const closeBtn = document.getElementById('chatClose');
  const body = document.getElementById('chatBody');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatText');
  const openers = [fab, document.getElementById('botOpen')].filter(Boolean);
  const pageForm = document.getElementById('contactForm');

  let history = [];
  let opened = false;
  let busy = false;
  let lastOpener = fab;
  let draft = null;      // ultima richiesta preparata dal bot, in attesa di conferma
  let draftCard = null;

  // "sì, invia", "confermo", "ok vai"... (ma non "sì però cambia l'email")
  const isConfirm = t => {
    const x = t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (x.length > 60 || /\b(no|non|aspetta|cambia|modifica|correggi|sbagliat|invece|pero|ma )\b/.test(x)) return false;
    return /^(si|ok|okay|confermo|conferma|invia|inviala|invialo|manda|mandala|procedi|vai|va bene|perfetto|esatto|giusto|tutto ok|tutto giusto|tutto corretto)\b/.test(x);
  };
  const DRAFT_TXT = "Ecco il riepilogo della tua richiesta: controlla che sia tutto giusto, poi premi «Conferma e invia» oppure scrivimi «sì, invia».";
  const plain = t => String(t).replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#+\s*/gm, '').trim();

  function scrollTo(el, where) {
    if (where === 'top') {
      requestAnimationFrame(() => {
        const b = body.getBoundingClientRect(), r = el.getBoundingClientRect();
        body.scrollTop += (r.top - b.top) - 12;
      });
    } else body.scrollTop = body.scrollHeight;
  }
  function addMsg(text, who, scroll) {
    const el = document.createElement('div');
    el.className = 'chat-msg ' + who;
    el.textContent = who.indexOf('bot') === 0 ? plain(text) : text;
    body.appendChild(el);
    scrollTo(el, scroll);
    return el;
  }
  function say(text) {               // messaggio del bot generato dal sito (non dal modello)
    addMsg(text, 'bot', 'top');
    history.push({ role: 'assistant', content: text });
  }

  function openChat(e) {
    lastOpener = (e && e.currentTarget) || fab;
    panel.hidden = false;
    panel.classList.add('open');
    fab.setAttribute('aria-expanded', 'true');
    if (!opened) { addMsg(WELCOME, 'bot'); opened = true; }
    input.focus();
  }
  // Chiude ma non cancella la cronologia (stand-by)
  function closeChat() {
    panel.hidden = true;
    panel.classList.remove('open');
    fab.setAttribute('aria-expanded', 'false');
    lastOpener.focus();
  }

  openers.forEach(b => b.addEventListener('click', openChat));
  closeBtn.addEventListener('click', closeChat);
  document.addEventListener('click', e => {
    if (panel.hidden) return;
    // e.target.isConnected: i pulsanti del riepilogo vengono rimossi/disattivati al clic
    if (!e.target.isConnected || panel.contains(e.target) || openers.some(b => b.contains(e.target))) return;
    closeChat();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) closeChat(); });

  /* ---------- Compila il form della pagina con i dati del bot ---------- */
  function fillPageForm(d) {
    if (!pageForm) return;
    const set = (name, v) => { const f = pageForm.elements[name]; if (f) f.value = v; };
    set('nome', d.nome); set('cognome', d.cognome); set('email', d.email); set('message', d.messaggio);
    pageForm.querySelectorAll('input[name="servizio"]').forEach(r => { r.checked = (r.value === d.servizio); });
    const p = pageForm.elements['privacy']; if (p) p.checked = !!d.privacy;
  }

  function summaryText(d) {
    return `Riepilogo della richiesta (in attesa di conferma):
Nome: ${d.nome} ${d.cognome}
Email: ${d.email}
Servizio: ${d.servizio}
Progetto: ${d.messaggio}
Privacy: informativa letta e consenso dato.`;
  }

  /* ---------- Scheda riepilogo con Conferma / Modifica ---------- */
  function showDraft(d) {
    if (draftCard) draftCard.classList.add('old');           // il vecchio riepilogo non vale più
    draftCard && draftCard.querySelectorAll('button').forEach(b => b.disabled = true);
    draft = d;
    fillPageForm(d);

    const card = document.createElement('div');
    card.className = 'chat-card';
    card.innerHTML = `<p class="cc-title">Riepilogo della richiesta</p><dl></dl>
      <p class="cc-note">Hai letto l'<a href="privacy.html" target="_blank" rel="noopener">informativa privacy</a>. Ho compilato anche il form nella sezione Contatti.</p>
      <div class="cc-actions"><button type="button" class="cc-ok">Conferma e invia</button><button type="button" class="cc-edit">Modifica</button></div>
      <p class="cc-status" role="status"></p>`;
    const dl = card.querySelector('dl');
    [['Nome', `${d.nome} ${d.cognome}`], ['Email', d.email], ['Servizio', d.servizio], ['Progetto', d.messaggio]].forEach(([k, v]) => {
      const row = document.createElement('div');
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.textContent = v;
      row.append(dt, dd); dl.append(row);
    });
    card.querySelector('.cc-ok').addEventListener('click', () => {
      if (busy || draft !== d) return;
      addMsg('Confermo, invia la richiesta.', 'user');
      history.push({ role: 'user', content: 'Confermo, invia la richiesta.' });
      sendDraft();
    });
    card.querySelector('.cc-edit').addEventListener('click', () => {
      if (busy || draft !== d) return;
      addMsg('Vorrei modificare qualcosa.', 'user');
      history.push({ role: 'user', content: 'Vorrei modificare qualcosa nel riepilogo.' });
      say('Certo: dimmi cosa vuoi cambiare e aggiorno il riepilogo.');
      input.focus();
    });
    body.appendChild(card);
    draftCard = card;
    scrollTo(card, 'top');
  }

  /* ---------- Invio con Web3Forms (come il form della pagina) ---------- */
  async function sendDraft() {
    const d = draft;
    if (!d) { say("Prima preparo il riepilogo della richiesta: dimmi nome, cognome, email e cosa ti serve."); return; }
    if (d.sent) { say('La richiesta è già stata inviata a Samuele: ti risponde entro un giorno lavorativo.'); return; }
    if (!EMAIL_RE.test(d.email)) { say("L'email nel riepilogo non sembra valida: me la riscrivi?"); return; }
    const key = (typeof WEB3FORMS_KEY !== 'undefined') ? WEB3FORMS_KEY : '';
    const card = draftCard, st = card && card.querySelector('.cc-status');
    busy = true;
    card && card.querySelectorAll('button').forEach(b => b.disabled = true);
    if (st) st.textContent = 'Invio in corso…';

    const data = new FormData();
    data.append('access_key', key);
    data.append('subject', `Nuova richiesta dal sito (assistente AI): ${d.servizio}`);
    data.append('from_name', 'teovani.it');
    data.append('name', `${d.nome} ${d.cognome}`);
    data.append('nome', d.nome);
    data.append('cognome', d.cognome);
    data.append('email', d.email);
    data.append('servizio', d.servizio);
    data.append('message', d.messaggio);
    data.append('privacy', 'on');
    data.append('origine', "Compilata dall'assistente AI e confermata dall'utente in chat");
    try {
      const r = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: data });
      const j = await r.json();
      if (!j.success) throw new Error(j.message || 'web3forms');
      d.sent = true;
      if (card) { card.classList.add('sent'); st.textContent = 'Inviata ✓'; }
      if (pageForm) pageForm.reset();
      const fs = document.getElementById('formStatus');
      if (fs) { fs.className = 'f-status ok'; fs.textContent = "Richiesta inviata tramite l'assistente AI. Ti rispondo entro un giorno lavorativo."; }
      say(`Fatto! Ho inviato la tua richiesta a Samuele: ti risponde a ${d.email} entro un giorno lavorativo. Se vuoi accelerare, puoi scrivergli anche su WhatsApp (+39 371 152 2624).`);
    } catch (err) {
      if (st) st.textContent = 'Invio non riuscito';
      card && card.querySelectorAll('button').forEach(b => b.disabled = false);
      say("L'invio non è riuscito. Riprova con «Conferma e invia» oppure scrivi a Samuele su WhatsApp (+39 371 152 2624): il form nella sezione Contatti è già compilato con i tuoi dati.");
    }
    busy = false;
  }

  /* ---------- Conversazione ---------- */
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;
    addMsg(text, 'user');
    history.push({ role: 'user', content: text });
    input.value = '';
    if (draft && !draft.sent && isConfirm(text)) { await sendDraft(); input.focus(); return; }
    busy = true;
    const typing = addMsg('•••', 'bot typing');
    let data = null;
    try {
      const r = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history })
      });
      data = await r.json();
    } catch (err) { data = { error: 'network' }; }
    typing.remove();
    busy = false;

    if (data && data.action === 'draft' && data.draft) {
      const reply = DRAFT_TXT;
      addMsg(reply, 'bot', 'top');
      history.push({ role: 'assistant', content: plain(reply) + '\n\n' + summaryText(data.draft) });
      showDraft(data.draft);
    } else if (data && data.action === 'send') {
      await sendDraft();
    } else if (data && data.reply) {
      addMsg(data.reply, 'bot', 'top');
      history.push({ role: 'assistant', content: plain(data.reply) });
    } else {
      addMsg(data && data.error === 'network'
        ? "Il servizio non risponde in questo momento. Scrivi a Samuele su WhatsApp o via mail: trovi tutto nella sezione Contatti."
        : FAIL, 'bot', 'top');
      history.pop(); // il messaggio non ha avuto risposta: non lo teniamo in cronologia
    }
    input.focus();
  });
})();
