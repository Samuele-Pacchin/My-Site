/* ================= CHAT WIDGET — Assistente AI di Samuele Pacchin ================= */
(function () {
  // ⚠️ DOPO aver pubblicato il Worker su Cloudflare, incolla qui il suo indirizzo:
  const API_URL = "https://assistente-ai-di-samuele.samuelepacchin47.workers.dev";

  const WELCOME = "Buongiorno, sono l'assistente di Samuele Pacchin. Samuele si occupa di sviluppo web, di automazione dei processi e di soluzioni AI su misura per le aziende. Come posso esserle utile?";

  const fab = document.getElementById('chatFab');
  const panel = document.getElementById('chatPanel');
  const closeBtn = document.getElementById('chatClose');
  const body = document.getElementById('chatBody');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatText');

  let history = [];      // solo i turni realmente scambiati con l'API (resta in memoria = stand-by)
  let opened = false;
  let busy = false;

  // scroll = 'bottom' (default) oppure 'top' (porta in cima al messaggio appena aggiunto)
  function addMsg(text, who, scroll) {
    const el = document.createElement('div');
    el.className = 'chat-msg ' + who;
    el.textContent = text;
    body.appendChild(el);
    if (scroll === 'top') {
      // posiziona la chat sulla PRIMA riga di questo messaggio
      requestAnimationFrame(() => {
        const bodyRect = body.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        body.scrollTop += (elRect.top - bodyRect.top) - 12;
      });
    } else {
      body.scrollTop = body.scrollHeight;
    }
    return el;
  }

  function openChat() {
    panel.classList.add('open');
    fab.classList.add('hidden');
    if (!opened) { addMsg(WELCOME, 'bot'); opened = true; }
    input.focus();
  }
  // Chiude la chat ma NON cancella la cronologia: riaprendola trovi tutto (stand-by)
  function closeChat() {
    panel.classList.remove('open');
    fab.classList.remove('hidden');
  }

  fab.addEventListener('click', openChat);
  closeBtn.addEventListener('click', closeChat);

  // Chiusura cliccando fuori dalla chat (ma non sul pulsante che la apre)
  document.addEventListener('click', (e) => {
    if (!panel.classList.contains('open')) return;
    if (panel.contains(e.target) || fab.contains(e.target)) return;
    closeChat();
  });
  // Chiusura anche con il tasto ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('open')) closeChat();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;

    addMsg(text, 'user');                 // il messaggio dell'utente scrolla in fondo
    history.push({ role: 'user', content: text });
    input.value = '';
    busy = true;

    const typing = addMsg('•••', 'bot typing');

    try {
      const r = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history })
      });
      const data = await r.json();
      const reply = (data && data.reply)
        ? data.reply
        : "Mi scuso, si è verificato un problema. La invito a riprovare o a scrivere una mail a Samuele.";
      typing.remove();
      addMsg(reply, 'bot', 'top');        // la risposta si posiziona sulla prima riga
      history.push({ role: 'assistant', content: reply });
    } catch (err) {
      typing.remove();
      addMsg("Mi scuso, il servizio non è raggiungibile al momento. La invito a scrivere una mail a Samuele.", 'bot', 'top');
    }

    busy = false;
    input.focus();
  });
})();
