(function () {
  const WORDS = ['सृजन', 'दृष्टि', 'मौन', 'शिवम्'];
  const KEY = 'ss_transition_index';
  const ENTRY_KEY = 'ss_entry_cover';
  const SKIP_MAUN_KEY = 'ss_skip_maun';
  const COVER_COLOR = '#020202';
  const NAV_DELAY_MS = 2400;

  function paintRootDark() {
    document.documentElement.style.backgroundColor = COVER_COLOR;
    document.documentElement.style.colorScheme = 'dark';
  }

  function releaseEntryCover(cover) {
    if (!cover || !cover.isConnected) return;

    function finish() {
      if (!cover.isConnected) return;
      cover.remove();
      document.documentElement.style.backgroundColor = '';
    }

    cover.classList.add('fade-out');
    cover.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, 520);
  }

  function makeEntryCover() {
    if (sessionStorage.getItem(ENTRY_KEY) !== '1') return;
    sessionStorage.removeItem(ENTRY_KEY);
    paintRootDark();

    var cover = document.getElementById('ss-entry-shield');
    if (!cover) {
      cover = document.createElement('div');
      cover.id = 'ss-entry-shield';
      cover.className = 'entry-cover active';
      cover.style.backgroundColor = COVER_COLOR;
      cover.style.opacity = '1';
      document.body.insertBefore(cover, document.body.firstChild);
    } else {
      cover.classList.add('entry-cover', 'active');
      cover.style.opacity = '1';
      cover.style.backgroundColor = COVER_COLOR;
    }

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        setTimeout(function () {
          releaseEntryCover(cover);
        }, 60);
      });
    });
  }

  function bindReveals() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    items.forEach(function (item) { observer.observe(item); });
  }

  function bindFilters() {
    const buttons = document.querySelectorAll('[data-filter]');
    const cards = document.querySelectorAll('.work-card');
    if (!buttons.length || !cards.length) return;
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        buttons.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        cards.forEach(function (card) {
          const show = filter === 'all' || card.dataset.category === filter;
          card.style.display = show ? '' : 'none';
        });
      });
    });
  }

  function createTransitionOverlay(wordText) {
    paintRootDark();
    const overlay = document.createElement('div');
    overlay.className = 'transition-overlay active';
    overlay.style.cssText =
      'position:fixed;inset:0;min-height:100vh;min-height:100dvh;display:grid;place-items:center;background:#020202;z-index:2147483647;opacity:1;pointer-events:auto';
    const word = document.createElement('div');
    word.className = 'transition-word show';
    word.style.cssText =
      'font-family:Cormorant Garamond,serif;font-size:clamp(3rem,8vw,5.8rem);letter-spacing:0.22em;color:#f3eee2;opacity:1;transform:translateY(0)';
    word.textContent = wordText;
    overlay.appendChild(word);
    document.body.appendChild(overlay);
    return { overlay: overlay, word: word };
  }

  function bindTransitions() {
    const links = document.querySelectorAll('a[href]');
    links.forEach(function (link) {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http')) return;
      link.addEventListener('click', function (event) {
        const url = new URL(link.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname) return;
        event.preventDefault();

        sessionStorage.setItem(ENTRY_KEY, '1');
        sessionStorage.setItem(SKIP_MAUN_KEY, '1');

        const index = Number(localStorage.getItem(KEY) || '0');
        createTransitionOverlay(WORDS[index % WORDS.length]);
        localStorage.setItem(KEY, String((index + 1) % WORDS.length));

        setTimeout(function () {
          paintRootDark();
          window.location.assign(url.href);
        }, NAV_DELAY_MS);
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

    setTimeout(function () {
      preloader.classList.add('hidden');
      hero.style.opacity = '1';
      hero.style.transform = 'none';
    }, 2400);
    setTimeout(function () { preloader.remove(); }, 3400);
  }

  function init() {
    makeEntryCover();
    bindReveals();
    bindFilters();
    bindTransitions();
    initIndexPreloader();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('load', function () {
    var shield = document.getElementById('ss-entry-shield');
    if (shield && !shield.classList.contains('fade-out')) {
      releaseEntryCover(shield);
    }
  });

  window.addEventListener('pageshow', function (event) {
    if (event.persisted) makeEntryCover();
  });
})();
