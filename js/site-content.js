(function () {
  var TOKEN_KEY = 'ss_admin_token';
  var EDIT_PARAM = 'edit';
  var isEditMode = false;
  var meta = null;
  var activePopup = null;

  function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }

  function isEditRequested() {
    try {
      var params = new URLSearchParams(window.location.search);
      return params.get(EDIT_PARAM) === '1';
    } catch (e) { return false; }
  }

  function authHeaders() {
    return { 'Authorization': 'Bearer ' + getToken() };
  }

  function hideFallbackText() {
    if (!isEditMode) return;
    var el = document.getElementById('site-content-fallback-notice');
    if (el) el.style.display = 'none';
  }

  function showFallbackText() {
    if (!isEditMode) return;
    var el = document.getElementById('site-content-fallback-notice');
    if (el) el.style.display = '';
  }

  /* ---------- Public: populate from API ---------- */
  function populateContent(content) {
    var elements = document.querySelectorAll('[data-site-key]');
    var foundAny = false;
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      var key = el.getAttribute('data-site-key');
      if (content[key] !== undefined) {
        el.textContent = content[key];
        foundAny = true;
      }
    }
    return foundAny;
  }

  function fetchAndPopulate() {
    fetch('/api/site-content')
      .then(function (r) {
        if (!r.ok) { showFallbackText(); return; }
        return r.json();
      })
      .then(function (data) {
        if (!data || !data.content) { showFallbackText(); return; }
        meta = data.meta;
        var found = populateContent(data.content);
        if (!found) { showFallbackText(); }
        else { hideFallbackText(); }
      })
      .catch(function () { showFallbackText(); });
  }

  /* ---------- Edit mode ---------- */
  function verifyAdmin() {
    var token = getToken();
    if (!token) return Promise.resolve(false);
    return fetch('/api/admin/verify', {
      method: 'GET',
      headers: authHeaders()
    }).then(function (r) { return r.ok; }).catch(function () { return false; });
  }

  function createEditBar() {
    var bar = document.createElement('div');
    bar.className = 'edit-mode-bar';
    bar.innerHTML =
      '<div class="edit-mode-bar-left">' +
        '<a href="admin.html#content" class="edit-mode-bar-back" data-no-transition>&larr; Back to Admin</a>' +
        '<span class="edit-mode-bar-label">Site Content Editing</span>' +
      '</div>' +
      '<button class="edit-mode-bar-done" id="edit-mode-done">Done Editing</button>';
    document.body.insertBefore(bar, document.body.firstChild);
    document.getElementById('edit-mode-done').addEventListener('click', function () {
      // window.close() is blocked unless opened by script; fall back to admin.
      try { window.close(); } catch (e) {}
      setTimeout(function () {
        try { window.location.assign('admin.html#content'); } catch (e) {}
      }, 120);
    });
    document.body.classList.add('edit-mode-active');
  }

  function ensureEditFrame() {
    if (document.querySelector('.edit-mode-frame')) return;
    var frame = document.createElement('div');
    frame.className = 'edit-mode-frame';
    document.body.appendChild(frame);
  }

  function createInlinePopup(target, key, currentValue, maxChars) {
    closePopup();

    var overlay = document.createElement('div');
    overlay.className = 'edit-popup-overlay';
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closePopup();
    });

    var popup = document.createElement('div');
    popup.className = 'edit-popup';

    var keyLabel = document.createElement('div');
    keyLabel.className = 'edit-popup-key';
    keyLabel.textContent = key;

    var textarea = document.createElement('textarea');
    textarea.className = 'edit-popup-textarea';
    textarea.value = currentValue;
    textarea.setAttribute('data-max-chars', String(maxChars));

    var footer = document.createElement('div');
    footer.className = 'edit-popup-footer';

    var counter = document.createElement('span');
    counter.className = 'edit-popup-counter';

    function updateCounter() {
      var len = textarea.value.length;
      counter.textContent = len + '/' + maxChars;
      if (len > maxChars) {
        counter.classList.add('over');
      } else {
        counter.classList.remove('over');
      }
    }
    updateCounter();

    var error = document.createElement('span');
    error.className = 'edit-popup-error';

    var actions = document.createElement('div');
    actions.className = 'edit-popup-actions';

    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'edit-popup-btn edit-popup-btn-cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', closePopup);

    var saveBtn = document.createElement('button');
    saveBtn.className = 'edit-popup-btn edit-popup-btn-save';
    saveBtn.textContent = 'Save';

    textarea.addEventListener('input', function () {
      updateCounter();
      var len = textarea.value.length;
      if (len > maxChars) {
        error.textContent = 'Text exceeds design frame. Max ' + maxChars + ' characters. Current: ' + len + '.';
        saveBtn.disabled = true;
      } else {
        error.textContent = '';
        saveBtn.disabled = false;
      }
    });

    saveBtn.addEventListener('click', function () {
      var val = textarea.value;
      if (val.length > maxChars) return;
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      fetch('/api/admin/site-content', {
        method: 'PUT',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
        body: JSON.stringify({ content_key: key, content_value: val })
      }).then(function (r) {
        if (!r.ok && r.status === 401) {
          error.textContent = 'Session expired. Please log in again.';
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save';
          return null;
        }
        return r.json().then(function (data) { return { ok: r.ok, data: data }; });
      }).then(function (result) {
        if (!result) return;
        if (!result.ok) {
          error.textContent = result.data.error || 'Save failed';
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save';
          return;
        }
        target.textContent = val;
        closePopup();
      }).catch(function () {
        error.textContent = 'Network error';
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
      });
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    footer.appendChild(counter);
    footer.appendChild(error);
    footer.appendChild(actions);
    popup.appendChild(keyLabel);
    popup.appendChild(textarea);
    popup.appendChild(footer);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    activePopup = { overlay: overlay, target: target };

    var rect = target.getBoundingClientRect();
    var top = rect.bottom + 8;
    var left = rect.left;
    if (top + 280 > window.innerHeight) {
      top = rect.top - 280;
      if (top < 80) top = 80;
    }
    if (left + 380 > window.innerWidth) left = window.innerWidth - 400;
    if (left < 10) left = 10;
    popup.style.top = top + 'px';
    popup.style.left = left + 'px';

    textarea.focus();
  }

  function closePopup() {
    if (!activePopup) return;
    activePopup.target.classList.remove('edit-active');
    activePopup.overlay.remove();
    activePopup = null;
  }

  function activateEditMode() {
    isEditMode = true;
    document.documentElement.classList.add('is-edit-mode');
    createEditBar();
    ensureEditFrame();

    var elements = document.querySelectorAll('[data-site-key]');
    for (var i = 0; i < elements.length; i++) {
      (function (el) {
        el.classList.add('editable');
        el.addEventListener('click', function (e) {
          if (activePopup) {
            if (activePopup.target === el) return;
            closePopup();
          }
          el.classList.add('edit-active');
          var key = el.getAttribute('data-site-key');
          var maxChars = 300;
          if (meta) {
            for (var j = 0; j < meta.length; j++) {
              if (meta[j].content_key === key) {
                maxChars = meta[j].max_chars;
                break;
              }
            }
          }
          createInlinePopup(el, key, el.textContent, maxChars);
          e.stopPropagation();
        });
      })(elements[i]);
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && activePopup) {
        closePopup();
        e.stopPropagation();
      }
    });

    window.addEventListener('resize', function () {
      if (!activePopup) return;
      var popup = activePopup.overlay.firstChild;
      var target = activePopup.target;
      var rect = target.getBoundingClientRect();
      var top = rect.bottom + 8;
      var left = rect.left;
      if (top + 280 > window.innerHeight) {
        top = rect.top - 280;
        if (top < 80) top = 80;
      }
      if (left + 380 > window.innerWidth) left = window.innerWidth - 400;
      if (left < 10) left = 10;
      popup.style.top = top + 'px';
      popup.style.left = left + 'px';
    });
  }

  /* ---------- Edit mode: append ?edit=1 to nav links ---------- */
  function patchNavLinks() {
    if (!isEditMode) return;
    var links = document.querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      var href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http')) continue;
      try {
        var url = new URL(link.href, window.location.href);
        if (url.origin !== window.location.origin) continue;
        url.searchParams.set(EDIT_PARAM, '1');
        var relative = url.pathname + url.search;
        link.setAttribute('href', relative);
      } catch (e) {}
    }
  }

  /* ---------- Init ---------- */
  function init() {
    if (isEditRequested()) {
      verifyAdmin().then(function (valid) {
        if (valid) {
          fetch('/api/site-content')
            .then(function (r) { return r.json(); })
            .then(function (data) {
              if (data && data.content) {
                meta = data.meta;
                populateContent(data.content);
              }
              try { sessionStorage.setItem('ss_skip_maun', '1'); } catch (e) {}
              activateEditMode();
              patchNavLinks();
            })
            .catch(function () {
              fetchAndPopulate();
            });
        } else {
          fetchAndPopulate();
        }
      });
    } else {
      fetchAndPopulate();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();