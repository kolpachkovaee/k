/* ═══════════════════════════════════════════════
   Елизавета Колпачкова — логика лендинга
   Без библиотек: язык, раскрытие роз по скроллу,
   появление текста, курсор.
   ═══════════════════════════════════════════════ */
(() => {
'use strict';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;

/* инерция прокрутки сцены: чем меньше, тем «тяжелее» движение */
const LERP = 0.085;

/* ─── 1. ЯЗЫК ──────────────────────────────── */

const META = {
  ru: {
    title: 'Елизавета Колпачкова — предприниматель, продуктовый менеджер и дизайнер',
    desc:  'Помогаю компаниям и стартапам превращать идеи в продукты, которые готовы к рынку, пользователям и инвестициям.'
  },
  en: {
    title: 'Elizaveta Kolpachkova — entrepreneur, product manager and designer',
    desc:  'I help companies and startups turn ideas into products that are ready for the market, users and investment.'
  }
};

let lang = localStorage.getItem('ek-lang')
        || ((navigator.language || 'ru').toLowerCase().startsWith('ru') ? 'ru' : 'en');

/* «*слово*» в data-атрибуте → выделенный курсивной антиквой фрагмент */
function splitWords(el, text) {
  const words = String(text).trim().split(/\s+/);
  el.innerHTML = words.map((w, i) => {
    const em = w.indexOf('*') !== -1;
    const clean = w.replace(/\*/g, '')
                   .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<span class="w"><span class="wi${em ? ' em' : ''}" style="--i:${i}">${clean}</span></span>`;
  }).join(' ');
}

function renderLang(next) {
  lang = next;
  localStorage.setItem('ek-lang', lang);
  document.documentElement.lang = lang;
  document.title = META[lang].title;
  const md = document.querySelector('meta[name="description"]');
  if (md) md.setAttribute('content', META[lang].desc);

  document.querySelectorAll('[data-ru]').forEach(el => {
    const val = el.getAttribute('data-' + lang) ?? el.getAttribute('data-ru');
    if (el.classList.contains('split')) splitWords(el, val);
    else el.textContent = val;
  });

  document.querySelectorAll('.lang button').forEach(b => {
    const on = b.dataset.lang === lang;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', String(on));
  });
}

document.querySelectorAll('.lang button').forEach(b => {
  b.addEventListener('click', () => {
    if (b.dataset.lang === lang) return;
    renderLang(b.dataset.lang);
  });
});

renderLang(lang);

/* ─── 2. ПОЯВЛЕНИЕ БЛОКОВ ──────────────────── */

function startReveals() {
  const targets = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    targets.forEach(t => t.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => e.target.classList.toggle('in', e.isIntersecting));
  }, { rootMargin: '-12% 0px -12% 0px', threshold: 0 });
  targets.forEach(t => io.observe(t));
}

/* ─── 3. КАДРЫ СЦЕНЫ ───────────────────────── */

const smallScreen = innerWidth < 900 || (navigator.maxTouchPoints > 0 && innerWidth < 1100);
const saveData = !!(navigator.connection && navigator.connection.saveData);
const SET = (smallScreen || saveData) ? { dir: 'lo', n: 49 } : { dir: 'hi', n: 81 };

/* пропорции исходного кадра */
const RATIO = 648 / 1152;

const frames = new Array(SET.n);

const preloader = document.getElementById('preloader');
const preBar = document.getElementById('preBar');
const preNum = document.getElementById('preNum');

function pad3(i) { return String(i).padStart(3, '0'); }

function loadFrames() {
  return new Promise(resolve => {
    let next = 0, done = 0;
    const CONC = 8;

    const step = () => {
      done++;
      const pct = Math.round(done / SET.n * 100);
      preNum.textContent = String(pct).padStart(3, '0');
      preBar.style.width = pct + '%';
      if (done === SET.n) resolve();
      else if (next < SET.n) fire(next++);
    };

    const fire = i => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { frames[i] = img; step(); };
      img.onerror = step;
      img.src = `assets/roses/${SET.dir}/${pad3(i + 1)}.webp`;
    };

    const first = Math.min(CONC, SET.n);
    for (; next < first; next++) fire(next);
  });
}

/* ─── 4. ОТРИСОВКА ─────────────────────────── */

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d', { alpha: true });

let W = 0, H = 0, dpr = 1;
function resize() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/* прогресс прокрутки */
let target = 0, cur = 0;
function readScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  target = max > 0 ? clamp(scrollY / max) : 0;
}

/* курсор */
let mx = 0, my = 0, mxs = 0, mys = 0;
let gx = innerWidth / 2, gy = innerHeight / 2, gxs = gx, gys = gy;
const glow = document.getElementById('glow');

if (finePointer && !reduced) {
  document.body.classList.add('has-pointer');
  addEventListener('pointermove', e => {
    mx = (e.clientX / innerWidth - .5) * 2;
    my = (e.clientY / innerHeight - .5) * 2;
    gx = e.clientX; gy = e.clientY;
  }, { passive: true });
}

const railDot = document.getElementById('railDot');
const bloomNum = document.getElementById('bloomNum');
const railTrackH = () => {
  const t = document.querySelector('.rail-track');
  return t ? t.clientHeight - 5 : 0;
};

/* кадры идут строго по порядку: прокрутка = раскрытие роз */
function frameIndex(p) {
  return clamp(Math.round(p * (SET.n - 1)), 0, SET.n - 1);
}

/* доля ширины колонны, растворяемая по краям */
const FEATHER = 0.30;

function paint(p) {
  ctx.clearRect(0, 0, W, H);
  const img = frames[frameIndex(p)] || frames[0];
  if (!img) return;

  // колонна чуть подрастает и подъезжает от правой трети к центру
  const ph = H * (1.06 + 0.10 * p);
  const pw = ph * RATIO;
  const cx = W * (0.61 - 0.10 * p) + mxs * 26;
  const cy = H * 0.5 + (0.03 - 0.06 * p) * H + mys * 16;

  const x = cx - pw / 2, y = cy - ph / 2;

  // притухание в середине, чтобы текст читался
  const alpha = 1 - 0.18 * Math.sin(Math.PI * clamp((p - 0.02) / 0.74));

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, x, y, pw, ph);

  // растворяем боковые края колонны в фоне страницы
  const fw = pw * FEATHER;
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'destination-out';

  const left = ctx.createLinearGradient(x, 0, x + fw, 0);
  left.addColorStop(0, 'rgba(0,0,0,1)');
  left.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = left;
  ctx.fillRect(x, y, fw, ph);

  const right = ctx.createLinearGradient(x + pw, 0, x + pw - fw, 0);
  right.addColorStop(0, 'rgba(0,0,0,1)');
  right.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = right;
  ctx.fillRect(x + pw - fw, y, fw, ph);

  ctx.restore();
}

function tick() {
  cur += (target - cur) * LERP;
  if (Math.abs(target - cur) < 0.00015) cur = target;

  mxs += (mx - mxs) * 0.06;
  mys += (my - mys) * 0.06;

  if (glow) {
    gxs += (gx - gxs) * 0.12;
    gys += (gy - gys) * 0.12;
    glow.style.transform = `translate3d(${gxs}px, ${gys}px, 0)`;
  }

  paint(cur);

  if (railDot) railDot.style.transform = `translateY(${cur * railTrackH()}px)`;
  if (bloomNum) bloomNum.textContent = String(Math.round(cur * 100)).padStart(2, '0');

  requestAnimationFrame(tick);
}

/* ─── 5. СТАРТ ─────────────────────────────── */

resize();
readScroll();
cur = target;

addEventListener('resize', () => { resize(); readScroll(); if (reduced) paint(cur); }, { passive: true });
addEventListener('scroll', readScroll, { passive: true });

loadFrames().then(() => {
  document.body.classList.add('ready');
  setTimeout(startReveals, 240);

  if (reduced) {
    paint(cur);
    addEventListener('scroll', () => { readScroll(); cur = target; paint(cur); }, { passive: true });
  } else {
    requestAnimationFrame(tick);
  }

  setTimeout(() => { if (preloader) preloader.remove(); }, 1200);
});

/* мягкий переход по якорям при отключённом smooth-scroll */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const el = document.querySelector(a.getAttribute('href'));
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  });
});

})();
