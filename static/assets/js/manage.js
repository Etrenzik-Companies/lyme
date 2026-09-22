/** Delete confirmation on the self-service /api/me page. */
const btn = document.querySelector('[data-delete]');
const status = document.querySelector('.form-status');

if (btn) {
  btn.addEventListener('click', async () => {
    if (!confirm('Delete everything we hold about you? This cannot be undone.')) return;

    btn.disabled = true;
    status.textContent = 'Deleting…';
    status.className = 'form-status';

    try {
      const res = await fetch(`/api/me?t=${encodeURIComponent(btn.dataset.token)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'delete' }),
      });
      if (!res.ok) throw new Error(`Deletion failed (${res.status})`);
      status.textContent = 'Deleted. Nothing about you remains in our database.';
      status.className = 'form-status is-ok';
      btn.remove();
      document.querySelector('[href*="format=json"]')?.remove();
    } catch (err) {
      status.textContent = err.message;
      status.className = 'form-status is-error';
      btn.disabled = false;
    }
  });
}
