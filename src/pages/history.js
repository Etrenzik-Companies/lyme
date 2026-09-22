import { esc, tier } from '../layout.js';
import { TIMELINE, COUNTER_EVIDENCE, DEMANDS } from '../content/timeline.js';

export function history() {
  const entries = [...TIMELINE].sort((a, b) => a.sort - b.sort);

  const items = entries
    .map((e) => {
      const sources = e.sources
        .map((s) => `<li><a href="${esc(s.url)}" rel="noopener nofollow">${esc(s.label)}</a></li>`)
        .join('');
      return `
<li class="tl-item tl-item--${e.tier}${e.key ? ' tl-item--key' : ''}" id="tl-${esc(String(e.sort).replace('.', '-'))}">
  <div class="tl-marker" aria-hidden="true"></div>
  <div class="tl-body">
    <div class="tl-meta">
      <span class="tl-when">${esc(e.when)}</span>
      ${tier(e.tier)}
    </div>
    <h3 class="tl-title">${esc(e.title)}</h3>
    <div class="tl-text">${e.body}</div>
    <details class="tl-sources">
      <summary>Sources (${e.sources.length})</summary>
      <ul>${sources}</ul>
    </details>
  </div>
</li>`;
    })
    .join('');

  const counts = entries.reduce((acc, e) => ((acc[e.tier] = (acc[e.tier] || 0) + 1), acc), {});

  const demands = DEMANDS.map(
    (d) => `
<li class="demand" id="demand-${esc(d.id)}">
  <h3>${esc(d.title)}</h3>
  <p>${esc(d.body)}</p>
</li>`
  ).join('');

  const body = `
<section class="page-head">
  <div class="wrap">
    <p class="eyebrow">The record</p>
    <h1>Where Lyme disease came from, and what the government still won't release</h1>
    <p class="lede measure">Everything on this page is sourced and sorted into one of three tiers.
    We do not blur the line between them, because the moment this site treats a book's claim like a
    declassified document, everything else on it stops counting.</p>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="tier-key">
      <h2 class="sr-only">How claims on this page are rated</h2>
      <div class="tier-key-item">
        ${tier('documented')}
        <p>Primary sources, peer-reviewed research, declassified records or public law.
        <span class="muted">${counts.documented || 0} entries</span></p>
      </div>
      <div class="tier-key-item">
        ${tier('contested')}
        <p>A real open question with official government activity behind it.
        <span class="muted">${counts.contested || 0} entries</span></p>
      </div>
      <div class="tier-key-item">
        ${tier('allegation')}
        <p>A claim from a book or from reporting that has <strong>not</strong> been substantiated.
        <span class="muted">${counts.allegation || 0} entries</span></p>
      </div>
    </div>
  </div>
</section>

<section class="section section--counter">
  <div class="wrap">
    <aside class="callout callout--counter" role="note">
      <h2 class="callout-head">${esc(COUNTER_EVIDENCE.head)}</h2>
      ${COUNTER_EVIDENCE.body}
      <ul class="callout-links">
        ${COUNTER_EVIDENCE.links
          .map((l) => `<li><a href="${esc(l.url)}" rel="noopener nofollow">${esc(l.label)}</a></li>`)
          .join('')}
      </ul>
    </aside>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <h2>Timeline</h2>
    <div class="tl-filters" role="group" aria-label="Filter timeline by evidence tier">
      <button type="button" class="toggle-btn is-active" data-tier="all" aria-pressed="true">All</button>
      <button type="button" class="toggle-btn" data-tier="documented" aria-pressed="false">Documented</button>
      <button type="button" class="toggle-btn" data-tier="contested" aria-pressed="false">Under investigation</button>
      <button type="button" class="toggle-btn" data-tier="allegation" aria-pressed="false">Allegation</button>
    </div>
    <ol class="timeline">${items}</ol>
  </div>
</section>

<section class="section section--alt">
  <div class="wrap">
    <h2>What we're actually asking for</h2>
    <p class="lede measure">Not an admission. Not a theory. Four specific, answerable demands.</p>
    <ol class="demands">${demands}</ol>
    <p><a class="btn btn-primary" href="/petition/">Sign in support of these demands</a></p>
  </div>
</section>

<section class="section">
  <div class="wrap measure">
    <h2>Open questions we can't answer yet</h2>
    <ul class="qlist">
      <li>What is the complete scope of the Army's arthropod-vector research between 1950 and 1975,
      beyond the three operations already declassified?</li>
      <li>Were <em>Ixodes</em> ticks specifically studied as vectors, and if so, with which agents?</li>
      <li>Did any experimental arthropod release occur outside a laboratory, by accident or design?</li>
      <li>What did Willy Burgdorfer's pre-1981 tick pathogen work for the Army actually consist of?</li>
      <li>Why has no complete federal report been published after three congressional directives?</li>
    </ul>
    <p class="muted">If you have documents, FOIA responses or firsthand knowledge relevant to any of
    these, we want them. Corrections are published on the
    <a href="/legal/sources/">sources and corrections</a> page.</p>
  </div>
</section>`;

  return {
    title: 'The documented record',
    description:
      'A sourced timeline of Lyme disease origins and the US government record, with every claim ' +
      'rated documented, under investigation, or allegation — including the evidence against a ' +
      'laboratory origin.',
    path: '/history/',
    ogImage: '/assets/og/history.png',
    body,
    scripts: ['/assets/js/timeline.js'],
  };
}
