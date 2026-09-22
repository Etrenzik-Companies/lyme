import { nationalChart, regionalChart, nationalTable, stateTable, sparkline } from '../chart.js';
import { esc } from '../layout.js';

const fmt = (n) => Number(n).toLocaleString('en-US');

export function home(data) {
  const h = data.headline;
  const recent = data.national.slice(-12).map((d) => d.cases);

  const statTiles = `
<div class="stats" role="list">
  <div class="stat stat--primary" role="listitem">
    <div class="stat-value">${fmt(h.latestCases)}</div>
    <div class="stat-label">cases reported to CDC in ${h.latestYear}</div>
    <div class="stat-note">${sparkline(recent)} <span>last 12 years</span></div>
  </div>

  <div class="stat stat--alarm" role="listitem">
    <div class="stat-value">~${fmt(h.estimatedAnnualDiagnosed)}</div>
    <div class="stat-label">Americans actually diagnosed and treated each year</div>
    <div class="stat-note">
      CDC's own insurance-claims analysis. Roughly <strong>ten times</strong> what the
      surveillance system counts.
      <a href="${h.estimatedSourceUrl}" rel="noopener">Source</a>
    </div>
  </div>

  <div class="stat" role="listitem">
    <div class="stat-value">+${h.growthPct}%</div>
    <div class="stat-label">growth in reported cases since ${h.firstYear}</div>
    <div class="stat-note">${fmt(h.firstCases)} in ${h.firstYear} &rarr; ${fmt(h.latestCases)} in ${h.latestYear}</div>
  </div>

  <div class="stat stat--live" role="listitem">
    <div class="stat-value" data-signature-count aria-live="polite">&mdash;</div>
    <div class="stat-label">verified signatures on the petition</div>
    <div class="stat-note"><a href="/petition/" class="link-strong">Add yours &rarr;</a></div>
  </div>
</div>`;

  const body = `
<section class="hero">
  <div class="wrap">
    <p class="eyebrow">Independent · Sourced · Updated daily</p>
    <h1>Lyme disease cases in America have grown ${h.growthPct}% since ${h.firstYear}.</h1>
    <p class="lede">The official count says ${fmt(h.latestCases)} cases in ${h.latestYear}. The
    government's own claims data says the real number is closer to
    <strong>${fmt(h.estimatedAnnualDiagnosed)} people a year</strong>. This site tracks the data,
    follows the news, publishes the documented federal record, and collects signatures demanding
    the files Congress has already asked for three times.</p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="/petition/">Sign the petition</a>
      <a class="btn btn-ghost" href="/history/">Read the record</a>
    </div>
  </div>
</section>

<section class="section section--tracker">
  <div class="wrap">
    ${statTiles}

    <div class="chart-head">
      <div>
        <h2 id="tracker">Reported cases, ${data.national[0].year}&ndash;${h.latestYear}</h2>
        <p class="muted">Source: CDC National Notifiable Diseases Surveillance System.
        Last refreshed ${esc(data.meta.generatedAt)}.</p>
      </div>
      <div class="metric-toggle" role="group" aria-label="Choose a measure">
        <button type="button" class="toggle-btn is-active" data-metric="cases" aria-pressed="true">Total cases</button>
        <button type="button" class="toggle-btn" data-metric="incidence" aria-pressed="false">Per 100,000</button>
      </div>
    </div>

    <div class="chart-stack">
      <div data-chart-panel="cases">${nationalChart(data, 'cases')}</div>
      <div data-chart-panel="incidence" hidden>${nationalChart(data, 'incidence')}</div>
    </div>

    <div class="annotations">
      ${data.annotations
        .map(
          (a) => `
      <div class="annotation annotation--${esc(a.kind)}">
        <h3>${esc(a.label)} <span class="annotation-years">${a.years.join('&ndash;')}</span></h3>
        <p>${esc(a.detail)}</p>
        ${a.detailUrl ? `<p><a href="${a.detailUrl}" rel="noopener">Read CDC's explanation &rarr;</a></p>` : ''}
      </div>`
        )
        .join('')}
    </div>

    ${nationalTable(data)}
  </div>
</section>

<section class="section section--alt">
  <div class="wrap">
    <h2>Where the cases are</h2>
    <p class="muted measure">Two regions — the Middle Atlantic and New England — have carried the
    majority of reported cases for the entire surveillance period. The four smallest regions are
    folded together so the colors stay distinguishable.</p>
    ${regionalChart(data)}

    <h3 id="by-state">By state, ${data.stateYears[0]}&ndash;${data.stateYears[data.stateYears.length - 1]}</h3>
    <p class="muted measure">Counts marked <abbr class="fn" title="Surveillance method changed under the 2022 case definition">&#8224;</abbr>
    come from jurisdictions that changed surveillance methods under the 2022 case definition;
    figures before and after 2022 are not directly comparable for those states.</p>
    <label class="field field--inline">
      <span class="sr-only">Filter states</span>
      <input type="search" id="state-filter" placeholder="Filter states&hellip;" autocomplete="off">
    </label>
    ${stateTable(data)}
  </div>
</section>

<section class="section">
  <div class="wrap grid-2">
    <div>
      <h2>Latest Lyme disease news</h2>
      <p class="muted">Pulled automatically every six hours from PubMed, ClinicalTrials.gov,
      Congress.gov, the Federal Register, CDC, NIH and the news wire.</p>
      <ul class="news-list" data-news-latest data-limit="5">
        <li class="news-loading">Loading the feed&hellip;</li>
      </ul>
      <p><a class="link-strong" href="/news/">All news &rarr;</a></p>
    </div>
    <div>
      <h2>The question Congress keeps asking</h2>
      <p>Between 1950 and 1975 the US Army ran declassified field trials using insects as
      biological weapon vectors. Congress has three times directed a federal review of whether
      <strong>ticks</strong> were among them, and whether any were released.</p>
      <p>The complete findings have never been published.</p>
      <p>This site does not claim the government created Lyme disease — the bacterium is over five
      thousand years old and was on Long Island by 1945. It asks the narrower question that has a
      real answer sitting in a file somewhere.</p>
      <p><a class="link-strong" href="/history/">See the full timeline with sources &rarr;</a></p>
    </div>
  </div>
</section>

<section class="section section--cta">
  <div class="wrap center">
    <h2>If Lyme disease took something from you, say so on the record.</h2>
    <p class="lede measure-center">Every verified signature is one more documented American. Every
    story is evidence that this is not rare, not imaginary, and not over.</p>
    <div class="hero-actions center-actions">
      <a class="btn btn-primary" href="/petition/">Sign the petition</a>
      <a class="btn btn-ghost" href="/stories/share/">Share your story</a>
    </div>
  </div>
</section>`;

  return {
    title: 'Lyme disease case tracker',
    description: `Independent tracker of US Lyme disease case data from CDC surveillance, ${data.national[0].year}-${h.latestYear}, plus a daily news feed, the documented federal record and a petition to declassify federal tick research.`,
    path: '/',
    ogImage: '/assets/og/tracker.png',
    body,
    scripts: ['/assets/js/tracker.js', '/assets/js/news.js'],
  };
}
