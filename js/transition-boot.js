(function () {
  var KEY = 'ss_entry_cover';
  var done = false;

  window.ssDismissEntry = function () {
    if (done) return;
    done = true;
    try { sessionStorage.removeItem(KEY); } catch (e) {}
    var shield = document.getElementById('ss-entry-shield');
    if (shield) {
      shield.style.display = 'none';
      shield.remove();
    }
    document.documentElement.style.backgroundColor = '';
    document.documentElement.classList.add('is-ready');
    var reveals = document.querySelectorAll('.reveal');
    for (var i = 0; i < reveals.length; i++) {
      reveals[i].classList.add('in-view');
    }
  };

  try {
    if (sessionStorage.getItem(KEY) !== '1') return;
  } catch (e) {
    return;
  }

  document.documentElement.style.backgroundColor = '#020202';
  document.documentElement.style.colorScheme = 'dark';

  var shield = document.createElement('div');
  shield.id = 'ss-entry-shield';
  shield.setAttribute('aria-hidden', 'true');
  shield.style.cssText =
    'position:fixed;inset:0;min-height:100vh;min-height:100dvh;background:#020202;z-index:2147483646;pointer-events:none;opacity:1';

  function mount() {
    if (!document.body) {
      requestAnimationFrame(mount);
      return;
    }
    if (!document.getElementById('ss-entry-shield')) {
      document.body.insertBefore(shield, document.body.firstChild);
    }
  }
  mount();

  function scheduleDismiss() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', window.ssDismissEntry, { once: true });
    } else {
      window.ssDismissEntry();
    }
    window.addEventListener('load', window.ssDismissEntry, { once: true });
    window.addEventListener('pageshow', window.ssDismissEntry);
    setTimeout(window.ssDismissEntry, 50);
    setTimeout(window.ssDismissEntry, 280);
    setTimeout(window.ssDismissEntry, 900);
  }
  scheduleDismiss();
})();
