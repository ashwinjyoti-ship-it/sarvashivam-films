(function () {
  var WORDS = ['सृजन', 'दृष्टि', 'मौन', 'शिवम्'];
  fetch('/api/transition-words')
    .then(function (r) { return r.json(); })
    .then(function (w) { if (Array.isArray(w) && w.length) WORDS = w; })
    .catch(function () {});
  const KEY = 'ss_transition_index';
  const JUST_NAV_KEY = 'ss_just_navigated';
  const SKIP_MAUN_KEY = 'ss_skip_maun';
  const COVER_COLOR = '#020202';
  const NAV_DELAY_MS = 2400;

  function paintRootDark() {
    document.documentElement.style.backgroundColor = COVER_COLOR;
    document.documentElement.style.colorScheme = 'dark';
  }

  function unlockPage() {
    document.documentElement.classList.add('is-ready');
    document.querySelectorAll('.reveal').forEach(function (el) {
      el.classList.add('in-view');
    });
    var hero = document.querySelector('[data-home-hero]');
    if (hero) {
      hero.style.opacity = '1';
      hero.style.transform = 'none';
    }
  }

  function bindReveals() {
    const items = document.querySelectorAll('.reveal:not(.in-view)');
    if (!items.length) return;
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (item) { observer.observe(item); });
    setTimeout(function () {
      items.forEach(function (item) {
        item.classList.add('in-view');
      });
    }, 800);
  }

  function applyWorkFilter(filter) {
    document.querySelectorAll('.work-card').forEach(function (card) {
      var matches = filter === 'all' || card.dataset.category === filter;
      card.classList.toggle('work-filtered', !matches);
    });
  }

  /* expose so work.js can call it after dynamic render */
  window._applyWorkFilter = applyWorkFilter;

  function bindFilters() {
    const buttons = document.querySelectorAll('[data-filter]');
    if (!buttons.length) return;
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        buttons.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        applyWorkFilter(btn.dataset.filter);
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
  }

  function bindTransitions() {
    var isEdit = window.location.search.indexOf('edit=1') !== -1;
    const links = document.querySelectorAll('a[href]');
    links.forEach(function (link) {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http')) return;
      link.addEventListener('click', function (event) {
        const url = new URL(link.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname) return;
        event.preventDefault();

        try {
          sessionStorage.setItem(JUST_NAV_KEY, '1');
          sessionStorage.setItem(SKIP_MAUN_KEY, '1');
        } catch (e) {}

        var targetUrl = url.href;
        if (isEdit) {
          var nu = new URL(targetUrl);
          nu.searchParams.set('edit', '1');
          targetUrl = nu.href;
        }

        if (link.hasAttribute('data-no-transition') || isEdit) {
          paintRootDark();
          window.location.assign(targetUrl);
          return;
        }

        var word;
        if (link.hasAttribute('data-transition-word')) {
          word = link.getAttribute('data-transition-word');
        } else {
          var index = Number(localStorage.getItem(KEY) || '0');
          word = WORDS[index % WORDS.length];
          localStorage.setItem(KEY, String((index + 1) % WORDS.length));
        }
        createTransitionOverlay(word);

        setTimeout(function () {
          paintRootDark();
          window.location.assign(targetUrl);
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
    try {
      if (sessionStorage.getItem(JUST_NAV_KEY) === '1') {
        sessionStorage.removeItem(JUST_NAV_KEY);
        unlockPage();
      }
    } catch (e) {}

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
})();
