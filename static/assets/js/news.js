/** Renders the news feed on /news/ and the top-5 block on the home page. */
import { $, $$, api, esc, relTime, debounce } from './util.js';

const PAGE = 25;

const CAT_LABEL = {
  research: 'Research',
  policy: 'Policy',
  surveillance: 'Surveillance',
  community: 'Community',
  legal: 'Legal',
  general: 'News',
};

function itemHtml(n) {
  const cat = CAT_LABEL[n.category] || 'News';
  return `
<li class="news-item">
  <h3 class="news-title">
    <a href="${esc(n.url)}" target="_blank" rel="noopener nofollow">${esc(n.title)}</a>
  </h3>
  ${n.summary ? `<p class="news-summary">${esc(n.summary)}</p>` : ''}
  <div class="news-meta">
    <span class="news-cat" data-cat="${esc(n.category)}">${esc(cat)}</span>
    <span class="news-source">${esc(n.source)}</span>
    <span>${esc(relTime(n.published_at || n.fetched_at))}</span>
  </div>
</li>`;
}

/* --------------------------------------------------- home page: top five */

const latest = $('[data-news-latest]');
if (latest) {
  const limit = Number(latest.dataset.limit) || 5;
  api(`/api/news?limit=${limit}&window=48`)
    .then(({ items }) => {
      latest.innerHTML = items.length
        ? items.map(itemHtml).join('')
        : '<li class="empty-state">No items in the last 48 hours. The feed refreshes every six hours.</li>';
    })
    .catch(() => {
      latest.innerHTML =
        '<li class="empty-state">The feed is updating. <a href="/news/">Try the full news page</a>.</li>';
    });
}

/* ------------------------------------------------------- full news page */

const feed = $('[data-news-feed]');
if (feed) {
  const moreBtn = $('[data-news-more]');
  const search = $('#news-search');
  const updated = $('[data-news-updated]');

  const state = { category: 'all', q: '', offset: 0, done: false, loading: false };

  async function load(reset = false) {
    if (state.loading) return;
    state.loading = true;
    if (reset) {
      state.offset = 0;
      state.done = false;
      feed.innerHTML = '<li class="news-loading">Loading the feed&hellip;</li>';
    }

    const params = new URLSearchParams({ limit: String(PAGE), offset: String(state.offset) });
    if (state.category !== 'all') params.set('category', state.category);
    if (state.q) params.set('q', state.q);

    try {
      const { items, updated_at } = await api(`/api/news?${params}`);
      if (reset) feed.innerHTML = '';
      if (!items.length && reset) {
        feed.innerHTML = `<li class="empty-state">Nothing matches${
          state.q ? ` "${esc(state.q)}"` : ''
        }. Try a different filter.</li>`;
      } else {
        feed.insertAdjacentHTML('beforeend', items.map(itemHtml).join(''));
      }
      state.offset += items.length;
      state.done = items.length < PAGE;
      if (moreBtn) moreBtn.hidden = state.done;
      if (updated && updated_at) updated.textContent = relTime(updated_at);
    } catch {
      if (reset) {
        feed.innerHTML =
          '<li class="empty-state">Could not reach the feed right now. It refreshes every six hours &mdash; please try again shortly.</li>';
      }
      if (moreBtn) moreBtn.hidden = true;
    } finally {
      state.loading = false;
    }
  }

  $$('[data-category]').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('[data-category]').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      state.category = btn.dataset.category;
      load(true);
    });
  });

  if (search) {
    search.addEventListener(
      'input',
      debounce(() => { state.q = search.value.trim(); load(true); }, 300)
    );
  }

  if (moreBtn) moreBtn.addEventListener('click', () => load(false));

  load(true);
}
