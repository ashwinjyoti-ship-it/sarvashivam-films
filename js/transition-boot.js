(function () {
  var KEY = 'ss_entry_cover';
  try {
    if (sessionStorage.getItem(KEY) !== '1') return;
    document.documentElement.style.backgroundColor = '#020202';
    document.documentElement.style.colorScheme = 'dark';
    var shield = document.createElement('div');
    shield.id = 'ss-entry-shield';
    shield.setAttribute('aria-hidden', 'true');
    shield.style.cssText =
      'position:fixed;inset:0;min-height:100vh;min-height:100dvh;background:#020202;z-index:2147483646;pointer-events:auto;opacity:1';
    function mount() {
      if (!document.body) {
        requestAnimationFrame(mount);
        return;
      }
      document.body.insertBefore(shield, document.body.firstChild);
    }
    mount();
  } catch (e) {}
})();
