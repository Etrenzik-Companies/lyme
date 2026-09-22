const CATEGORIES = [
  ['all', 'Everything'],
  ['research', 'Research'],
  ['policy', 'Policy & government'],
  ['surveillance', 'Outbreak & surveillance'],
  ['community', 'Patient community'],
  ['legal', 'Legal'],
];

export function news() {
  const filters = CATEGORIES.map(
    ([v, l], i) =>
      `<button type="button" class="toggle-btn${i === 0 ? ' is-active' : ''}" data-category="${v}" aria-pressed="${i === 0}">${l}</button>`
  ).join('');

  const body = `
<section class="page-head">
  <div class="wrap">
    <p class="eyebrow">Updated every six hours</p>
    <h1>Lyme disease news</h1>
    <p class="lede measure">Aggregated automatically from PubMed, ClinicalTrials.gov,
    Congress.gov, the Federal Register, CDC, NIH, patient organizations and the news wire.
    Headlines and links only — click through to read at the source.</p>
    <p class="muted small">
      <a href="/feed.xml">Subscribe by RSS</a> ·
      Last update <span data-news-updated>&mdash;</span>
    </p>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="filters">
      <div class="toggle-group" role="group" aria-label="Filter by category">${filters}</div>
      <label class="field field--inline">
        <span class="sr-only">Search headlines</span>
        <input type="search" id="news-search" placeholder="Search headlines&hellip;" autocomplete="off">
      </label>
    </div>

    <ul class="news-list news-list--full" data-news-feed>
      <li class="news-loading">Loading the feed&hellip;</li>
    </ul>

    <div class="center">
      <button class="btn btn-ghost" type="button" data-news-more hidden>Load more</button>
    </div>

    <details class="table-view">
      <summary>How this feed works, and what it will not do</summary>
      <div class="prose">
        <p>A scheduled job runs every six hours and queries each source's public API or RSS feed.
        Results are de-duplicated two ways — by a hash of the canonical URL, and by headline
        similarity, because the wire services and the aggregators surface the same story under
        slightly different titles.</p>
        <p>Each item is scored on keyword relevance, source authority and recency. Items below the
        relevance threshold are held back rather than shown, so an article that merely mentions
        ticks in passing does not end up in a feed about Lyme disease.</p>
        <p><strong>We store headlines, sources, dates, canonical links and our own one-line
        summary. We do not copy article text.</strong> Publishers get the click. If you are a
        publisher and want your outlet excluded, email us and it is done that day.</p>
      </div>
    </details>
  </div>
</section>`;

  return {
    title: 'Daily Lyme disease news',
    description:
      'Automatically aggregated Lyme disease news from PubMed, ClinicalTrials.gov, Congress.gov, ' +
      'the Federal Register, CDC, NIH and the news wire. Updated every six hours.',
    path: '/news/',
    ogImage: '/assets/og/news.png',
    body,
    scripts: ['/assets/js/news.js'],
  };
}
