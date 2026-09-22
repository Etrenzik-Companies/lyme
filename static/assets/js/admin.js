/**
 * Moderation console.
 *
 * Every request here goes to /api/admin/*, which sits behind Cloudflare Access and
 * verifies the Access JWT server-side. This file does no authentication of its own and
 * must never be trusted to enforce anything.
 */
import { $, $$, api, esc, relTime, fmt } from './util.js';

/* --------------------------------------------------------------- tabs */

$$('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    $$('.tab').forEach((t) => {
      const on = t === tab;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
    });
    $$('.tab-panel').forEach((p) => { p.hidden = p.dataset.panel !== tab.dataset.tab; });
  });
});

/* -------------------------------------------------------------- header */

async function loadStats() {
  try {
    const s = await api('/api/admin/stats');
    $('[data-admin-identity]').textContent = `Signed in as ${s.actor}`;
    $('[data-admin-stats]').innerHTML = `
      <div class="stat"><div class="stat-value">${fmt(s.signatures_verified)}</div><div class="stat-label">verified signatures</div></div>
      <div class="stat"><div class="stat-value">${fmt(s.signatures_pending)}</div><div class="stat-label">awaiting email confirmation</div></div>
      <div class="stat"><div class="stat-value">${fmt(s.stories_pending)}</div><div class="stat-label">stories in the queue</div></div>
      <div class="stat"><div class="stat-value">${fmt(s.news_last_24h)}</div><div class="stat-label">news items, last 24h</div></div>`;
    $('[data-badge="stories"]').textContent = s.stories_pending;
    $('[data-badge="social"]').textContent = s.social_pending;
    $('[data-badge="signatures"]').textContent = s.signatures_flagged;
  } catch (err) {
    $('[data-admin-identity]').textContent =
      err.status === 403 ? 'Access denied — this console requires Cloudflare Access.' : 'Could not load.';
  }
}

/* ------------------------------------------------------------ stories */

async function act(entity, id, action, note) {
  await api(`/api/admin/${entity}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, action, note }),
  });
}

function storyCard(s) {
  const flags = (s.pii_flags || []).map((f) => `<span class="mod-flag">${esc(f)}</span>`).join('');
  return `
<article class="mod-card${flags ? ' mod-card--flagged' : ''}" data-story="${s.id}">
  <h3>${esc(s.title)}</h3>
  <p class="muted small">${esc(s.display_name)} &middot; ${esc(s.state || 'no state')} &middot;
     ${esc(relTime(s.created_at))} &middot; ${s.body.length} chars
     ${s.consent_social ? '&middot; <strong>social OK</strong>' : ''}</p>
  ${flags ? `<div class="mod-flags">${flags}</div>` : ''}
  <div class="mod-body">${esc(s.body)}</div>
  <div class="mod-actions">
    <button class="btn btn-sm btn-primary" data-act="approve">Approve &amp; publish</button>
    <button class="btn btn-sm btn-ghost" data-act="changes">Request changes</button>
    <button class="btn btn-sm btn-ghost" data-act="reject">Reject</button>
    <input type="text" placeholder="Note to the author (optional)" data-note>
  </div>
</article>`;
}

async function loadStories() {
  const host = $('[data-admin-stories]');
  try {
    const { stories } = await api('/api/admin/stories?status=pending');
    host.innerHTML = stories.length
      ? stories.map(storyCard).join('')
      : '<p class="empty-state">Queue is clear.</p>';

    $$('.mod-card', host).forEach((card) => {
      $$('[data-act]', card).forEach((btn) => {
        btn.addEventListener('click', async () => {
          const note = card.querySelector('[data-note]').value.trim();
          btn.disabled = true;
          try {
            await act('stories', Number(card.dataset.story), btn.dataset.act, note);
            card.remove();
            loadStats();
          } catch (err) {
            btn.disabled = false;
            alert(err.message);
          }
        });
      });
    });
  } catch {
    host.innerHTML = '<p class="empty-state">Could not load the queue.</p>';
  }
}

/* -------------------------------------------------------- social queue */

function socialCard(d) {
  return `
<article class="mod-card" data-social="${d.id}">
  <p class="muted small"><strong>${esc(d.platform.toUpperCase())}</strong> &middot; ${esc(d.kind)}
     &middot; queued ${esc(relTime(d.created_at))} &middot; expires ${esc(relTime(d.expires_at))}</p>
  <textarea class="mod-draft" rows="4" data-body>${esc(d.body)}</textarea>
  ${d.link ? `<p class="muted small">${esc(d.link)}</p>` : ''}
  <div class="mod-actions">
    <button class="btn btn-sm btn-primary" data-act="approve">Approve &amp; post</button>
    <button class="btn btn-sm btn-ghost" data-act="reject">Discard</button>
    <span class="muted small" data-len>${d.body.length} chars</span>
  </div>
</article>`;
}

async function loadSocial() {
  const host = $('[data-admin-social]');
  try {
    const { drafts } = await api('/api/admin/social?status=pending');
    host.innerHTML = drafts.length
      ? drafts.map(socialCard).join('')
      : '<p class="empty-state">No drafts waiting. The worker queues new ones twice a day.</p>';

    $$('.mod-card', host).forEach((card) => {
      const body = card.querySelector('[data-body]');
      const len = card.querySelector('[data-len]');
      body.addEventListener('input', () => { len.textContent = `${body.value.length} chars`; });

      $$('[data-act]', card).forEach((btn) => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          try {
            await api('/api/admin/social', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                id: Number(card.dataset.social),
                action: btn.dataset.act,
                body: body.value,
              }),
            });
            card.remove();
            loadStats();
          } catch (err) {
            btn.disabled = false;
            alert(err.message);
          }
        });
      });
    });
  } catch {
    host.innerHTML = '<p class="empty-state">Could not load the queue.</p>';
  }
}

/* ---------------------------------------------------------- signatures */

async function loadSignatures() {
  const host = $('[data-admin-signatures]');
  try {
    const { signatures } = await api('/api/admin/signatures?filter=statements');
    host.innerHTML = signatures.length
      ? signatures
          .map(
            (s) => `
<article class="mod-card" data-sig="${s.id}">
  <p><strong>${esc(s.name)}</strong> <span class="muted small">${esc(s.state)} &middot; ${esc(relTime(s.created_at))}</span></p>
  <div class="mod-body">${esc(s.statement)}</div>
  <div class="mod-actions">
    <button class="btn btn-sm btn-ghost" data-act="hide">Hide statement</button>
  </div>
</article>`
          )
          .join('')
      : '<p class="empty-state">No public statements to review.</p>';

    $$('.mod-card', host).forEach((card) => {
      card.querySelector('[data-act]').addEventListener('click', async (e) => {
        e.target.disabled = true;
        try {
          await act('signatures', Number(card.dataset.sig), 'hide');
          card.remove();
        } catch (err) {
          e.target.disabled = false;
          alert(err.message);
        }
      });
    });
  } catch {
    host.innerHTML = '<p class="empty-state">Could not load.</p>';
  }
}

/* -------------------------------------------------------- custom draft */

const newDraft = $('[data-new-draft]');
if (newDraft) {
  newDraft.addEventListener('click', async () => {
    const text = prompt('Post text:');
    if (!text) return;
    const platform = prompt('Platform — type x or facebook:', 'x');
    if (!platform) return;
    try {
      await api('/api/admin/social/draft', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body: text, platform: platform.toLowerCase(), kind: 'manual' }),
      });
      loadSocial();
      loadStats();
    } catch (err) {
      alert(err.message);
    }
  });
}

loadStats();
loadStories();
loadSocial();
loadSignatures();
