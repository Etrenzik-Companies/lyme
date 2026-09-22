/**
 * Progressive enhancement for the case tracker.
 *
 * The SVG is already rendered and readable before this file runs. Everything here is
 * additive: metric switching, a crosshair + tooltip, and state-table sort/filter.
 */
import { $, $$, fmt, debounce } from './util.js';

const dataEl = fetch('/data/cdc-lyme.json').then((r) => r.json());

/* ------------------------------------------------------- metric toggle */

const panels = {
  cases: $('[data-chart-panel="cases"]'),
  incidence: $('[data-chart-panel="incidence"]'),
};

$$('.metric-toggle .toggle-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const metric = btn.dataset.metric;
    $$('.metric-toggle .toggle-btn').forEach((b) => {
      const on = b === btn;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    Object.entries(panels).forEach(([key, panel]) => {
      if (panel) panel.hidden = key !== metric;
    });
  });
});

/* --------------------------------------------------------- hover layer */

const VIEW_W = 960;
const PAD = { top: 28, right: 24, bottom: 42, left: 62 };

function attachHover(figure, series, metric, annotations) {
  const svg = figure.querySelector('svg');
  const layer = svg.querySelector('.c-hover');
  if (!layer || !series.length) return;

  const stack = figure.closest('.chart-stack') || figure;
  if (getComputedStyle(stack).position === 'static') stack.style.position = 'relative';

  const tip = document.createElement('div');
  tip.className = 'chart-tip';
  tip.hidden = true;
  tip.setAttribute('role', 'tooltip');
  stack.appendChild(tip);

  const plotW = VIEW_W - PAD.left - PAD.right;
  const years = series.map((d) => d.year);
  const xFor = (year) => PAD.left + ((year - years[0]) / (years.at(-1) - years[0])) * plotW;

  const cross = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  cross.setAttribute('class', 'c-cross');
  cross.setAttribute('y1', String(PAD.top));
  cross.setAttribute('y2', String(400 - PAD.bottom + 28));
  cross.style.display = 'none';
  layer.appendChild(cross);

  const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  dot.setAttribute('class', 'c-dot');
  dot.setAttribute('r', '5');
  dot.style.display = 'none';
  layer.appendChild(dot);

  // One generous hit rectangle beats per-point targets on a 28-point series.
  const hit = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  hit.setAttribute('class', 'c-hit');
  hit.setAttribute('x', String(PAD.left));
  hit.setAttribute('y', String(PAD.top));
  hit.setAttribute('width', String(plotW));
  hit.setAttribute('height', String(400 - PAD.top - PAD.bottom + 28));
  layer.appendChild(hit);

  const noteFor = (year) => {
    const a = annotations.find((x) => x.years.includes(year));
    return a ? a.label : '';
  };

  function show(clientX) {
    const box = svg.getBoundingClientRect();
    const scale = VIEW_W / box.width;
    const vx = (clientX - box.left) * scale;
    const t = (vx - PAD.left) / plotW;
    const idx = Math.max(0, Math.min(series.length - 1, Math.round(t * (series.length - 1))));
    const d = series[idx];
    if (d[metric] === null) return;

    const px = xFor(d.year);
    cross.setAttribute('x1', String(px));
    cross.setAttribute('x2', String(px));
    cross.style.display = '';

    // Recover the y pixel from the rendered path rather than recomputing the scale.
    const path = figure.querySelector('.c-line');
    const total = path.getTotalLength();
    let lo = 0, hi = total, pt = path.getPointAtLength(0);
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      pt = path.getPointAtLength(mid);
      if (pt.x < px) lo = mid; else hi = mid;
    }
    dot.setAttribute('cx', String(px));
    dot.setAttribute('cy', String(pt.y));
    dot.style.display = '';

    const value = metric === 'cases' ? fmt(d.cases) : d.incidence.toFixed(2);
    const unit = metric === 'cases' ? 'reported cases' : 'per 100,000 people';
    const note = noteFor(d.year);
    tip.innerHTML =
      `<span class="chart-tip-year">${d.year}</span>${value} ${unit}` +
      (note ? `<span class="chart-tip-note">${note}</span>` : '');
    tip.hidden = false;

    const left = (px / VIEW_W) * box.width + (box.left - stack.getBoundingClientRect().left);
    tip.style.left = `${left}px`;
    tip.style.top = `${(pt.y / 400) * box.height - 12}px`;
  }

  function hide() {
    tip.hidden = true;
    cross.style.display = 'none';
    dot.style.display = 'none';
  }

  hit.addEventListener('pointermove', (e) => show(e.clientX));
  hit.addEventListener('pointerleave', hide);
  svg.addEventListener('blur', hide);
}

dataEl
  .then((data) => {
    Object.entries(panels).forEach(([metric, panel]) => {
      if (!panel) return;
      const figure = panel.querySelector('.chart');
      if (!figure) return;
      const series = data.national.filter((d) => d[metric] !== null);
      attachHover(figure, series, metric, data.annotations);
    });
  })
  .catch(() => { /* chart stays static, which is a perfectly good outcome */ });

/* ------------------------------------------------------- state table */

const table = $('#state-table');
if (table) {
  const tbody = table.tBodies[0];
  const rows = [...tbody.rows];

  // sort
  [...table.tHead.rows[0].cells].forEach((th, colIdx) => {
    th.setAttribute('tabindex', '0');
    const sortType = th.dataset.sort;
    if (!sortType) return;

    const doSort = () => {
      const current = th.getAttribute('aria-sort');
      const dir = current === 'descending' ? 'ascending' : 'descending';
      [...table.tHead.rows[0].cells].forEach((c) => c.removeAttribute('aria-sort'));
      th.setAttribute('aria-sort', dir);

      const sorted = [...rows].sort((a, b) => {
        const av = a.cells[colIdx].textContent.trim();
        const bv = b.cells[colIdx].textContent.trim();
        if (sortType === 'num') {
          const an = Number(av.replace(/[^0-9.-]/g, '')) || 0;
          const bn = Number(bv.replace(/[^0-9.-]/g, '')) || 0;
          return dir === 'ascending' ? an - bn : bn - an;
        }
        return dir === 'ascending' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
      sorted.forEach((r) => tbody.appendChild(r));
    };

    th.addEventListener('click', doSort);
    th.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doSort(); }
    });
  });

  // filter
  const filter = $('#state-filter');
  if (filter) {
    filter.addEventListener(
      'input',
      debounce(() => {
        const q = filter.value.trim().toLowerCase();
        let shown = 0;
        rows.forEach((r) => {
          const match = !q || (r.dataset.state || '').toLowerCase().includes(q);
          r.hidden = !match;
          if (match) shown++;
        });
        filter.setAttribute('aria-label', `Filter states, ${shown} shown`);
      }, 120)
    );
  }
}
