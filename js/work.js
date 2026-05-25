(function () {
  function extractYouTubeId(url) {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('?')[0];
      if (u.hostname.includes('youtube.com')) {
        if (u.searchParams.get('v')) return u.searchParams.get('v');
        const parts = u.pathname.split('/');
        const idx = parts.indexOf('embed');
        if (idx !== -1) return parts[idx + 1];
      }
    } catch {}
    return null;
  }

  function categoryLabel(cat) {
    return { 'short-film': 'Short Film', 'music-video': 'Music Video', 'brand-film': 'Brand Film' }[cat] || cat;
  }

  function buildCard(film) {
    const article = document.createElement('article');
    article.className = 'work-card reveal';
    article.dataset.category = film.category;
    if (film.tone) article.dataset.tone = film.tone;

    if (film.video_type === 'upload' && film.video_url) {
      const media = document.createElement('div');
      media.className = 'work-card-media';
      const vid = document.createElement('video');
      vid.src = film.video_url;
      vid.autoplay = true;
      vid.muted = true;
      vid.loop = true;
      vid.playsInline = true;
      vid.preload = 'metadata';
      media.appendChild(vid);
      article.appendChild(media);
      article.classList.add('has-media');
    } else if (film.video_type === 'youtube' && film.video_url) {
      const videoId = extractYouTubeId(film.video_url);
      if (videoId) {
        article.dataset.youtubeId = videoId;
        article.classList.add('has-youtube');
        article.style.backgroundImage = 'url(https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg)';
        article.style.backgroundSize = 'cover';
        article.style.backgroundPosition = 'center';
        const playBtn = document.createElement('div');
        playBtn.className = 'work-card-play';
        playBtn.innerHTML = '<span>&#9654;</span>';
        article.appendChild(playBtn);
      }
    }

    const meta = document.createElement('div');
    meta.className = 'work-meta';
    meta.innerHTML =
      '<div class="work-tag">' + categoryLabel(film.category) + '</div>' +
      '<h2 class="work-title">' + (film.title || '') + '</h2>' +
      '<p class="work-copy">' + (film.description || '') + '</p>';
    article.appendChild(meta);

    if (article.classList.contains('has-youtube')) {
      article.style.cursor = 'pointer';
      article.addEventListener('click', () => openModal(film.video_url));
    }

    return article;
  }

  function openModal(url) {
    const videoId = extractYouTubeId(url);
    if (!videoId) return;
    const modal = document.getElementById('video-modal');
    const frame = document.getElementById('video-modal-frame');
    frame.src = 'https://www.youtube-nocookie.com/embed/' + videoId + '?autoplay=1&rel=0&modestbranding=1';
    modal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const modal = document.getElementById('video-modal');
    const frame = document.getElementById('video-modal-frame');
    frame.src = '';
    modal.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  document.getElementById('video-modal-close').addEventListener('click', closeModal);
  document.getElementById('video-modal').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  async function loadFilms() {
    const grid = document.querySelector('.work-grid');
    try {
      const r = await fetch('/api/films');
      const films = await r.json();
      grid.innerHTML = '';
      films.forEach(film => grid.appendChild(buildCard(film)));

      /* reveal cards immediately (page is already loaded) */
      grid.querySelectorAll('.reveal').forEach(el => el.classList.add('in-view'));

      /* re-run filter so active button state applies to new cards */
      const activeFilter = document.querySelector('.filter-btn.active');
      if (activeFilter && activeFilter.dataset.filter !== 'all') {
        grid.querySelectorAll('.work-card').forEach(card => {
          card.style.display = card.dataset.category === activeFilter.dataset.filter ? '' : 'none';
        });
      }
    } catch (e) {
      console.error('Failed to load films', e);
      /* on error, reveal whatever skeleton cards exist */
      grid.querySelectorAll('.reveal').forEach(el => el.classList.add('in-view'));
    }
  }

  loadFilms();
})();
