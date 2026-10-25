/* Projects page: enlarge previews */
(function () {
  const box = document.getElementById('lightbox'), img = document.getElementById('lightboxImg');
  if (!box || !box.showModal) return;
  document.querySelectorAll('.shot').forEach(b => b.addEventListener('click', () => {
    img.src = b.dataset.full; img.alt = b.getAttribute('aria-label') || '';
    box.showModal();
  }));
  document.getElementById('lightboxClose').addEventListener('click', () => box.close());
  box.addEventListener('click', e => { if (e.target === box) box.close(); });
})();
