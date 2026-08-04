document.getElementById('yr').textContent = new Date().getFullYear();

// Nav scroll + mobile menu
const header = document.getElementById('header');
addEventListener('scroll', () => header.classList.toggle('scrolled', scrollY > 30));
const burger = document.getElementById('burger'), menu = document.getElementById('menu');
burger.addEventListener('click', (e) => { e.stopPropagation(); menu.classList.toggle('open'); });
// chiudi il menù quando si clicca una voce
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.classList.remove('open')));
// chiudi il menù cliccando in un punto qualsiasi dello schermo (fuori dal menù)
document.addEventListener('click', (e) => {
  if (!menu.classList.contains('open')) return;
  if (menu.contains(e.target) || burger.contains(e.target)) return;
  menu.classList.remove('open');
});
// chiudi il menù anche con il tasto ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') menu.classList.remove('open');
});

// Reveal on scroll
const io = new IntersectionObserver((es) => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: .12 });
document.querySelectorAll('.reveal').forEach((el, i) => { el.style.transitionDelay = (i % 5 * 60) + 'ms'; io.observe(el); });

// ---- Animated network background (nodes + links = automation) ----
const c = document.getElementById('net'), x = c.getContext('2d');
let w, h, pts, DPR = Math.min(devicePixelRatio || 1, 2);

function size() {
  w = c.width = innerWidth * DPR;
  h = c.height = innerHeight * DPR;
  c.style.width = innerWidth + 'px';
  c.style.height = innerHeight + 'px';
}
function init() {
  size();
  const count = Math.min(70, Math.floor(innerWidth / 22));
  pts = Array.from({ length: count }, () => ({
    x: Math.random() * w, y: Math.random() * h,
    vx: (Math.random() - .5) * .28 * DPR, vy: (Math.random() - .5) * .28 * DPR,
    r: (Math.random() * 1.6 + .6) * DPR
  }));
}
const mouse = { x: -9999, y: -9999 };
addEventListener('mousemove', e => { mouse.x = e.clientX * DPR; mouse.y = e.clientY * DPR; });
addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

function draw() {
  x.clearRect(0, 0, w, h);
  for (const p of pts) {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0 || p.x > w) p.vx *= -1;
    if (p.y < 0 || p.y > h) p.vy *= -1;
  }
  const maxd = 135 * DPR;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i], b = pts[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
      if (d < maxd) {
        const o = (1 - d / maxd) * .5;
        x.strokeStyle = 'rgba(90,150,255,' + o + ')';
        x.lineWidth = DPR * .6;
        x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke();
      }
    }
    const dxm = pts[i].x - mouse.x, dym = pts[i].y - mouse.y, dm = Math.hypot(dxm, dym);
    if (dm < 170 * DPR) {
      x.strokeStyle = 'rgba(47,243,224,' + (1 - dm / (170 * DPR)) * .55 + ')';
      x.lineWidth = DPR * .7;
      x.beginPath(); x.moveTo(pts[i].x, pts[i].y); x.lineTo(mouse.x, mouse.y); x.stroke();
    }
  }
  for (const p of pts) {
    x.fillStyle = 'rgba(180,210,255,.75)';
    x.beginPath(); x.arc(p.x, p.y, p.r, 0, 7); x.fill();
  }
  requestAnimationFrame(draw);
}
init(); draw();
let rt;
addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(init, 180); });
