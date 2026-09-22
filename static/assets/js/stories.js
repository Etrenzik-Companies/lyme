/** Approved story listing with state and text filters. */
import { $, api, esc, relTime, debounce } from './util.js';

const list = $('[data-story-list]');
if (list) {
  const moreBtn = $('[data-story-more]');
  const stateSel = $('#story-state');
  const search = $('#story-search');
  const PAGE = 12;
  const state = { offset: 0, state: '', q: '', loading: false };

  function card(s) {
    const meta = [s.state, s.onset_year ? `since ${s.onset_year}` : '', relTime(s.approved_at)]
      .filter(Boolean)
      .map((x) => `<span>${esc(x)}</span>`)
      .join('');
    return `
<article class="story-card">
  <h3>${esc(s.title)}</h3>
  <div class="story-meta"><span>${esc(s.display_name)}</span>${meta}</div>
  <p class="story-excerpt">${esc(s.excerpt)}&hellip;</p>
  <a class="story-more" href="/stories/${esc(s.slug)}/">Read the full story &rarr;</a>
</article>`;
  }

  async function load(reset = false) {
    if (state.loading) return;
    state.loading = true;
    if (reset) {
      state.offset = 0;
      list.innerHTML = '<p class="news-loading">Loading stories&hellip;</p>';
    }

    const params = new URLSearchParams({ limit: String(PAGE), offset: String(state.offset) });
    if (state.state) params.set('state', state.state);
    if (state.q) params.set('q', state.q);

    try {
      const { stories } = await api(`/api/stories?${params}`);
      if (reset) list.innerHTML = '';
      if (!stories.length && reset) {
        list.innerHTML =
          '<p class="empty-state">No stories published yet that match. <a href="/stories/share/">Be the first to share one</a>.</p>';
      } else {
        list.insertAdjacentHTML('beforeend', stories.map(card).join(''));
      }
      state.offset += stories.length;
      if (moreBtn) moreBtn.hidden = stories.length < PAGE;
    } catch {
      if (reset) list.innerHTML = '<p class="empty-state">Could not load stories right now.</p>';
      if (moreBtn) moreBtn.hidden = true;
    } finally {
      state.loading = false;
    }
  }

  if (stateSel) stateSel.addEventListener('change', () => { state.state = stateSel.value; load(true); });
  if (search) {
    search.addEventListener('input', debounce(() => { state.q = search.value.trim(); load(true); }, 300));
  }
  if (moreBtn) moreBtn.addEventListener('click', () => load(false));

  load(true);
}
