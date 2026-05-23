(function () {
  const WORDS = ['सृजन', 'दृष्टि', 'मौन', 'शिवम्'];
  const KEY = 'ss_transition_index';
  const ENTRY_KEY = 'ss_entry_cover';
  const SKIP_MAUN_KEY = 'ss_skip_maun';

  function makeEntryCover() {
    if (!sessionStorage.getItem(ENTRY_KEY)) return;
    sessionStorage.removeItem(ENTRY_KEY);
    const cover = document.createElement('div');
    cover.className = 'entry-cover active';
    document.body.appendChild(cover);
    requestAnimationFrame(() => {
      setTimeout(() => {
        cover.classList.add('fade-out');
        setTimeout(() => cover.remove(), 560);
      }, 220);
    });
  }

  function bindReveals() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    items.forEach((item) => observer.observe(item));
  }

  function bindFilters() {
    const buttons = document.querySelectorAll('[data-filter]');
    const cards = document.querySelectorAll('.work-card');
    if (!buttons.length || !cards.length) return;
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        cards.forEach((card) => {
          const show = filter === 'all' || card.dataset.category === filter;
          card.style.display = show ? '' : 'none';
        });
      });
    });
  }

  function bindTransitions() {
    const links = document.querySelectorAll('a[href]');
    links.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http')) return;
      link.addEventListener('click', (event) => {
        const url = new URL(link.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        event.preventDefault();

        const overlay = document.createElement('div');
        overlay.className = 'transition-overlay active';
        const word = document.createElement('div');
        word.className = 'transition-word';
        const index = Number(localStorage.getItem(KEY) || '0');
        word.textContent = WORDS[index % WORDS.length];
        localStorage.setItem(KEY, String((index + 1) % WORDS.length));
        overlay.appendChild(word);
        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
          setTimeout(() => word.classList.add('show'), 200);
          setTimeout(() => word.classList.remove('show'), 1800);
        });

        sessionStorage.setItem(ENTRY_KEY, '1');
        sessionStorage.setItem(SKIP_MAUN_KEY, '1');
        setTimeout(() => {
          window.location.href = url.href;
        }, 2500);
      });
    });
  }

  function initIndexPreloader() {
    const preloader = document.querySelector('[data-maun-preloader]');
    const hero = document.querySelector('[data-home-hero]');
    if (!preloader || !hero) return;

    const skip = sessionStorage.getItem(SKIP_MAUN_KEY) === '1';
    sessionStorage.removeItem(SKIP_MAUN_KEY);

    if (skip) {
      preloader.remove();
      hero.style.opacity = '1';
      hero.style.transform = 'none';
      return;
    }

    hero.style.opacity = '0';
    hero.style.transform = 'translateY(12px)';
    hero.style.transition = 'opacity .8s ease, transform .8s ease';

    setTimeout(() => {
      preloader.classList.add('hidden');
      hero.style.opacity = '1';
      hero.style.transform = 'none';
    }, 2400);
    setTimeout(() => preloader.remove(), 3400);
  }

  document.addEventListener('DOMContentLoaded', () => {
    makeEntryCover();
    bindReveals();
    bindFilters();
    bindTransitions();
    initIndexPreloader();
  });
})();
