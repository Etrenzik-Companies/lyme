/**
 * Server-rendered SVG charts for the case tracker.
 *
 * Everything here runs at build time and emits static SVG, so the tracker is fully
 * readable with JavaScript disabled. The hover/crosshair layer in
 * static/assets/js/tracker.js is a progressive enhancement layered on top.
 *
 * Colors come from CSS custom properties defined in site.css (--series-1..6,
 * --grid, --text-*), so light and dark mode swap in one place instead of being
 * baked into the markup.
 *
 * No dual-axis charts. Cases and incidence are different scales and get their own
 * plot, toggled client-side, never two y-axes on one frame.
 */

const PAD = { top: 28, right: 24, bottom: 42, left: 62 };
const W = 960;
const H = 420;

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fmt = (n) => Number(n).toLocaleString('en-US');

/** Nice round upper bound + tick step for an axis. */
function niceScale(max, targetTicks = 5) {
  if (max <= 0) return { max: 1, step: 1 };
  const raw = max / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  return { max: Math.ceil(max / step) * step, step };
}

/** Catmull-Rom-ish smoothing kept deliberately mild; surveillance data should not look smooth. */
function linePath(points) {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

/* ------------------------------------------------------------------ national */

/**
 * Single-series area + line. One series means no legend box: the title names it.
 * @param {object} data   parsed data/cdc-lyme.json
 * @param {'cases'|'incidence'} metric
 */
export function nationalChart(data, metric = 'cases') {
  const series = data.national.filter((d) => d[metric] !== null);
  const years = series.map((d) => d.year);
  const values = series.map((d) => d[metric]);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const { max: yMax, step } = niceScale(Math.max(...values));

  const x = (year) =>
    PAD.left + ((year - years[0]) / (years[years.length - 1] - years[0])) * plotW;
  const y = (v) => PAD.top + plotH - (v / yMax) * plotH;

  const pts = series.map((d) => ({ ...d, x: x(d.year), y: y(d[metric]) }));
  const path = linePath(pts);
  const area = `${path} L${pts[pts.length - 1].x.toFixed(1)},${(PAD.top + plotH).toFixed(1)} L${pts[0].x.toFixed(1)},${(PAD.top + plotH).toFixed(1)} Z`;

  // y grid + labels
  const gridLines = [];
  for (let v = 0; v <= yMax + 1e-9; v += step) {
    const yy = y(v);
    gridLines.push(
      `<line class="c-grid" x1="${PAD.left}" y1="${yy.toFixed(1)}" x2="${W - PAD.right}" y2="${yy.toFixed(1)}"/>` +
        `<text class="c-axis" x="${PAD.left - 10}" y="${(yy + 4).toFixed(1)}" text-anchor="end">${
          metric === 'cases' ? fmt(v) : v.toFixed(0)
        }</text>`
    );
  }

  // x labels every 4 years, always including the last
  const last = years[years.length - 1];
  const xLabels = years
    .filter((yr, i) => i % 4 === 0 || yr === last)
    .map(
      (yr) =>
        `<text class="c-axis" x="${x(yr).toFixed(1)}" y="${H - PAD.bottom + 22}" text-anchor="middle">${yr}</text>`
    );

  // --- annotations: these are what keep the chart honest -------------------
  const ann = [];
  for (const a of data.annotations) {
    if (a.kind === 'definition-change') {
      const ax = x(a.years[0]) - (plotW / (years.length - 1)) / 2;
      ann.push(
        `<line class="c-ann-line" x1="${ax.toFixed(1)}" y1="${PAD.top - 6}" x2="${ax.toFixed(1)}" y2="${PAD.top + plotH}"/>`,
        `<rect class="c-ann-chip" x="${(ax + 6).toFixed(1)}" y="${PAD.top - 4}" width="212" height="21" rx="4"/>`,
        `<text class="c-ann-text" x="${(ax + 14).toFixed(1)}" y="${PAD.top + 11}">2022: case definition revised</text>`
      );
    }
    if (a.kind === 'artifact') {
      const x1 = x(a.years[0]) - (plotW / (years.length - 1)) / 2;
      const x2 = x(a.years[a.years.length - 1]) + (plotW / (years.length - 1)) / 2;
      ann.push(
        `<rect class="c-ann-band" x="${x1.toFixed(1)}" y="${PAD.top}" width="${(x2 - x1).toFixed(1)}" height="${plotH}"/>`,
        `<text class="c-ann-text c-ann-text--muted" x="${((x1 + x2) / 2).toFixed(1)}" y="${PAD.top + plotH - 10}" text-anchor="middle">COVID-19 reporting gap</text>`
      );
    }
  }

  // Direct-label the endpoint only. Never a number on every point.
  const lastPt = pts[pts.length - 1];
  const endLabel =
    `<circle class="c-dot c-dot--end" cx="${lastPt.x.toFixed(1)}" cy="${lastPt.y.toFixed(1)}" r="5"/>` +
    `<text class="c-endlabel" x="${(lastPt.x - 10).toFixed(1)}" y="${(lastPt.y - 14).toFixed(1)}" text-anchor="end">${
      metric === 'cases' ? fmt(lastPt.cases) : lastPt.incidence.toFixed(1)
    }</text>`;

  const title =
    metric === 'cases'
      ? `Lyme disease cases reported to CDC, ${years[0]}–${last}`
      : `Reported Lyme disease incidence per 100,000 people, ${years[0]}–${last}`;

  return `
<figure class="chart" data-metric="${metric}">
  <svg viewBox="0 0 ${W} ${H}" role="img" class="chart-svg" preserveAspectRatio="xMidYMid meet"
       aria-labelledby="ct-${metric}-title ct-${metric}-desc">
    <title id="ct-${metric}-title">${esc(title)}</title>
    <desc id="ct-${metric}-desc">${esc(
      `Reported cases rose from ${fmt(series[0][metric])} in ${years[0]} to ${fmt(
        lastPt[metric]
      )} in ${last}. A dip in 2020 and 2021 reflects COVID-19 reporting disruption. A step increase in 2022 reflects a revised surveillance case definition, not a change in disease risk. Full figures are in the data table below this chart.`
    )}</desc>
    <g class="c-grid-group">${gridLines.join('')}</g>
    <g class="c-ann-group">${ann.join('')}</g>
    <path class="c-area" d="${area}"/>
    <path class="c-line" d="${path}"/>
    ${endLabel}
    <g class="c-xaxis">${xLabels.join('')}</g>
    <line class="c-baseline" x1="${PAD.left}" y1="${PAD.top + plotH}" x2="${W - PAD.right}" y2="${PAD.top + plotH}"/>
    <g class="c-hover" aria-hidden="true"></g>
  </svg>
</figure>`.trim();
}

/* ------------------------------------------------------------------ regional */

/**
 * Stacked area by census region.
 *
 * There are nine regions in the CDC file. Nine categorical slots cannot be told
 * apart reliably, so the five largest get their own hue in fixed order and the rest
 * fold into "Other" - the standard fold, not a generated ninth color.
 */
export function regionalChart(data) {
  const KEEP = [
    'Middle Atlantic',
    'New England',
    'East North Central',
    'South Atlantic',
    'West North Central',
  ];
  const OTHER = 'Other regions';
  const keys = [...KEEP, OTHER];

  const rows = data.regional.map(({ year, values }) => {
    const out = { year, values: {} };
    let other = 0;
    for (const [k, v] of Object.entries(values)) {
      if (KEEP.includes(k)) out.values[k] = v;
      else other += v;
    }
    for (const k of KEEP) out.values[k] ??= 0;
    out.values[OTHER] = other;
    return out;
  });

  const years = rows.map((r) => r.year);
  const totals = rows.map((r) => keys.reduce((s, k) => s + r.values[k], 0));
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const { max: yMax, step } = niceScale(Math.max(...totals));

  const x = (year) => PAD.left + ((year - years[0]) / (years[years.length - 1] - years[0])) * plotW;
  const y = (v) => PAD.top + plotH - (v / yMax) * plotH;

  // Build cumulative bands, largest at the bottom of the stack.
  const bands = [];
  const running = rows.map(() => 0);
  keys.forEach((key, ki) => {
    const top = rows.map((r, i) => running[i] + r.values[key]);
    const upper = rows.map((r, i) => ({ x: x(r.year), y: y(top[i]) }));
    const lower = rows.map((r, i) => ({ x: x(r.year), y: y(running[i]) })).reverse();
    bands.push({
      key,
      slot: ki + 1,
      d: `${linePath(upper)} ${linePath(lower).replace(/^M/, 'L')} Z`,
      latest: rows[rows.length - 1].values[key],
    });
    rows.forEach((r, i) => { running[i] = top[i]; });
  });

  const gridLines = [];
  for (let v = 0; v <= yMax + 1e-9; v += step) {
    const yy = y(v);
    gridLines.push(
      `<line class="c-grid" x1="${PAD.left}" y1="${yy.toFixed(1)}" x2="${W - PAD.right}" y2="${yy.toFixed(1)}"/>` +
        `<text class="c-axis" x="${PAD.left - 10}" y="${(yy + 4).toFixed(1)}" text-anchor="end">${fmt(v)}</text>`
    );
  }
  const last = years[years.length - 1];
  const xLabels = years
    .filter((yr, i) => i % 3 === 0 || yr === last)
    .map((yr) => `<text class="c-axis" x="${x(yr).toFixed(1)}" y="${H - PAD.bottom + 22}" text-anchor="middle">${yr}</text>`);

  // 2px surface gap between stacked segments: a stroke in the surface color.
  const paths = bands
    .map(
      (b) =>
        `<path class="c-band c-s${b.slot}" d="${b.d}"><title>${esc(b.key)}: ${fmt(b.latest)} cases in ${last}</title></path>`
    )
    .join('');

  const legend = keys
    .map(
      (k, i) =>
        `<li class="legend-item"><span class="legend-swatch c-s${i + 1}"></span>${esc(k)}</li>`
    )
    .join('');

  return `
<figure class="chart chart--regional">
  <svg viewBox="0 0 ${W} ${H}" role="img" class="chart-svg" preserveAspectRatio="xMidYMid meet"
       aria-labelledby="rg-title rg-desc">
    <title id="rg-title">Reported Lyme disease cases by US census region, ${years[0]}–${last}</title>
    <desc id="rg-desc">${esc(
      `Stacked area chart. The Middle Atlantic and New England regions account for most reported cases throughout the period. Exact figures by region and year are available in the data table below.`
    )}</desc>
    <g class="c-grid-group">${gridLines.join('')}</g>
    ${paths}
    <g class="c-xaxis">${xLabels.join('')}</g>
    <line class="c-baseline" x1="${PAD.left}" y1="${PAD.top + plotH}" x2="${W - PAD.right}" y2="${PAD.top + plotH}"/>
  </svg>
  <ul class="legend">${legend}</ul>
</figure>`.trim();
}

/* -------------------------------------------------------------- sparkline */

/** Tiny inline trend mark for stat tiles. No axes, no labels. */
export function sparkline(values, { width = 120, height = 32 } = {}) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * (width - 4) + 2,
    y: height - 3 - ((v - min) / span) * (height - 6),
  }));
  return `<svg class="spark" viewBox="0 0 ${width} ${height}" aria-hidden="true" focusable="false"><path class="spark-line" d="${linePath(pts)}"/></svg>`;
}

/* ------------------------------------------------------------ table views */

/**
 * The table view is not optional. Three of the categorical slots sit below 3:1
 * contrast on the light surface, which triggers the relief rule: a table must exist.
 * It is also the accessible fallback and the thing journalists actually copy from.
 */
export function nationalTable(data) {
  const rows = data.national
    .map(
      (d) =>
        `<tr><th scope="row">${d.year}</th><td>${fmt(d.cases)}</td><td>${
          d.incidence === null ? '—' : d.incidence.toFixed(2)
        }</td></tr>`
    )
    .join('');
  return `
<details class="table-view">
  <summary>View the data as a table</summary>
  <div class="table-scroll">
    <table class="data-table">
      <caption>Lyme disease cases reported to CDC, ${data.national[0].year}–${data.meta.throughYear}. Source: CDC NNDSS.</caption>
      <thead><tr><th scope="col">Year</th><th scope="col">Reported cases</th><th scope="col">Per 100,000</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</details>`.trim();
}

export function stateTable(data) {
  const years = data.stateYears;
  const head = years.map((y) => `<th scope="col">${y}</th>`).join('');
  const rows = data.states
    .map((s) => {
      const cells = years
        .map((y) => `<td>${s.values[y] === null ? '—' : fmt(s.values[y])}</td>`)
        .join('');
      const flag = s.footnoted
        ? ' <abbr class="fn" title="This jurisdiction changed its surveillance method under the 2022 case definition. Counts before and after 2022 are not directly comparable.">&#8224;</abbr>'
        : '';
      return `<tr data-state="${esc(s.state)}"><th scope="row">${esc(s.state)}${flag}</th>${cells}</tr>`;
    })
    .join('');

  return `
<div class="table-scroll" id="state-table-wrap">
  <table class="data-table data-table--sortable" id="state-table">
    <caption>Reported Lyme disease cases by state, ${years[0]}–${years[years.length - 1]}. Source: CDC NNDSS. Click a column heading to sort.</caption>
    <thead><tr><th scope="col" data-sort="text">State</th>${head.replace(/<th scope="col">/g, '<th scope="col" data-sort="num">')}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>`.trim();
}
