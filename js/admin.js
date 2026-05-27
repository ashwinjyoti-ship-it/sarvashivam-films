(function () {
  const TOKEN_KEY = 'ss_admin_token';

  const gateEl = document.getElementById('admin-gate');
  const panelEl = document.getElementById('admin-panel');
  const pwInput = document.getElementById('gate-password');
  const pwBtn = document.getElementById('gate-submit');
  const pwError = document.getElementById('gate-error');
  const logoutBtn = document.getElementById('admin-logout');

  function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
  function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
  function clearToken() { localStorage.removeItem(TOKEN_KEY); }

  function authHeaders() {
    return { 'Authorization': 'Bearer ' + getToken() };
  }

  async function showPanel() {
    gateEl.style.display = 'none';
    panelEl.classList.add('visible');
    await loadFilms();
  }

  function showGate() {
    panelEl.classList.remove('visible');
    gateEl.style.display = '';
    clearToken();
  }

  async function tryLogin(pw) {
    pwBtn.disabled = true;
    pwError.textContent = '';
    try {
      const r = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw })
      });
      const data = await r.json();
      if (!r.ok) { pwError.textContent = data.error || 'Wrong password'; pwBtn.disabled = false; return; }
      setToken(data.token);
      showPanel();
    } catch (e) {
      pwError.textContent = 'Network error. Try again.';
      pwBtn.disabled = false;
    }
  }

  pwBtn.addEventListener('click', () => tryLogin(pwInput.value.trim()));
  pwInput.addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(pwInput.value.trim()); });
  logoutBtn.addEventListener('click', showGate);

  const changePwBtn = document.getElementById('admin-change-pw');
  const pwModal = document.getElementById('pw-modal');
  const pwModalClose = document.getElementById('pw-modal-close');

  changePwBtn.addEventListener('click', () => {
    document.getElementById('pw-new').value = '';
    document.getElementById('pw-confirm').value = '';
    document.getElementById('pw-change-status').className = 'slot-status';
    pwModal.removeAttribute('hidden');
  });
  pwModalClose.addEventListener('click', () => pwModal.setAttribute('hidden', ''));
  pwModal.addEventListener('click', e => { if (e.target === pwModal) pwModal.setAttribute('hidden', ''); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') pwModal.setAttribute('hidden', ''); });

  /* ---------- Load & render film slots ---------- */

  async function loadFilms() {
    try {
      const r = await fetch('/api/films');
      const films = await r.json();
      films.forEach(f => renderSlot(f));
    } catch (e) {
      console.error('Failed to load films', e);
    }
  }

  function renderSlot(film) {
    const slot = document.getElementById('slot-' + film.slot);
    if (!slot) return;

    slot.querySelector('.slot-title-preview').textContent = film.title || 'Untitled';
    slot.querySelector('[name="title"]').value = film.title || '';
    slot.querySelector('[name="description"]').value = film.description || '';
    slot.querySelector('[name="category"]').value = film.category || 'short-film';

    const badge = slot.querySelector('.slot-video-badge');
    const currentBox = slot.querySelector('.video-current');
    const currentUrl = slot.querySelector('.video-current-url');

    if (film.video_type === 'youtube') {
      badge.textContent = 'YouTube';
      badge.style.display = '';
      currentBox.style.display = 'flex';
      currentUrl.textContent = film.video_url || '';
      slot.querySelector('.yt-url-input').value = film.video_url || '';
    } else if (film.video_type === 'upload') {
      badge.textContent = 'Clip';
      badge.style.display = '';
      currentBox.style.display = 'flex';
      currentUrl.textContent = film.video_url || '';
    } else {
      badge.style.display = 'none';
      currentBox.style.display = 'none';
    }

    const removeBtn = slot.querySelector('.btn-remove-video');
    removeBtn.style.display = film.video_type ? '' : 'none';
  }

  /* ---------- Tab switching ---------- */

  document.querySelectorAll('.video-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const slot = btn.closest('.film-slot');
      const target = btn.dataset.tab;
      slot.querySelectorAll('.video-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === target));
      slot.querySelectorAll('.video-tab-pane').forEach(p => p.classList.toggle('active', p.dataset.tab === target));
    });
  });

  /* ---------- Duration check ---------- */

  function getVideoDuration(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const vid = document.createElement('video');
      vid.preload = 'metadata';
      vid.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(vid.duration); };
      vid.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read video file')); };
      vid.src = url;
    });
  }

  /* ---------- File drop areas ---------- */

  document.querySelectorAll('.file-drop').forEach(drop => {
    const input = drop.querySelector('input[type="file"]');
    const chosen = drop.nextElementSibling;

    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;

      chosen.querySelector('.file-chosen-name').textContent = file.name + ' (' + (file.size / 1024 / 1024).toFixed(1) + ' MB)';
      chosen.style.display = 'flex';
      chosen.style.borderColor = '';
      chosen.style.color = '';

      try {
        const duration = await getVideoDuration(file);
        if (duration > 20) {
          chosen.querySelector('.file-chosen-name').textContent =
            'Too long: ' + Math.round(duration) + 's — maximum is 20 seconds';
          chosen.style.borderColor = 'rgba(220,80,80,0.45)';
          chosen.style.color = '#cf8080';
          input.value = '';
        }
      } catch (e) {
        /* If duration can't be read, let the server decide */
      }
    });

    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('dragover'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
    drop.addEventListener('drop', e => {
      e.preventDefault();
      drop.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('change'));
      }
    });
  });

  /* ---------- Save slot ---------- */

  document.querySelectorAll('.slot-save-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const slot = btn.closest('.film-slot');
      const slotNum = slot.dataset.slot;
      const status = slot.querySelector('.slot-status');
      const activeTab = slot.querySelector('.video-tab-btn.active')?.dataset.tab;

      btn.disabled = true;
      status.textContent = 'Saving…';
      status.className = 'slot-status visible';

      try {
        let resp;
        if (activeTab === 'upload') {
          const fileInput = slot.querySelector('input[type="file"]');
          const file = fileInput.files[0];

          if (file) {
            try {
              const duration = await getVideoDuration(file);
              if (duration > 20) {
                throw new Error('Clip is ' + Math.round(duration) + 's — maximum is 20 seconds');
              }
            } catch (e) {
              if (e.message.includes('maximum')) throw e;
              /* unreadable duration — let server handle it */
            }
          }

          const form = new FormData();
          form.append('title', slot.querySelector('[name="title"]').value.trim());
          form.append('description', slot.querySelector('[name="description"]').value.trim());
          form.append('category', slot.querySelector('[name="category"]').value);
          if (file) form.append('file', file);
          resp = await fetch('/api/admin/films/' + slotNum, {
            method: 'PUT',
            headers: authHeaders(),
            body: form
          });
        } else {
          const ytUrl = slot.querySelector('.yt-url-input').value.trim();
          resp = await fetch('/api/admin/films/' + slotNum, {
            method: 'PUT',
            headers: { ...authHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: slot.querySelector('[name="title"]').value.trim(),
              description: slot.querySelector('[name="description"]').value.trim(),
              category: slot.querySelector('[name="category"]').value,
              videoType: ytUrl ? 'youtube' : undefined,
              videoUrl: ytUrl || undefined
            })
          });
        }

        const data = await resp.json();
        if (!resp.ok) {
          if (resp.status === 401) { showGate(); return; }
          throw new Error(data.error || 'Save failed');
        }

        renderSlot(data);
        slot.querySelector('.slot-title-preview').textContent = data.title || 'Untitled';
        status.textContent = 'Saved';
        status.className = 'slot-status visible success';
      } catch (e) {
        status.textContent = e.message;
        status.className = 'slot-status visible error';
      } finally {
        btn.disabled = false;
        setTimeout(() => { status.classList.remove('visible'); }, 3000);
      }
    });
  });

  /* ---------- Remove video ---------- */

  document.querySelectorAll('.btn-remove-video').forEach(btn => {
    btn.addEventListener('click', async () => {
      const slot = btn.closest('.film-slot');
      const slotNum = slot.dataset.slot;
      const status = slot.querySelector('.slot-status');

      btn.disabled = true;
      status.textContent = 'Removing…';
      status.className = 'slot-status visible';

      try {
        const resp = await fetch('/api/admin/films/' + slotNum, {
          method: 'PUT',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: slot.querySelector('[name="title"]').value.trim(),
            description: slot.querySelector('[name="description"]').value.trim(),
            category: slot.querySelector('[name="category"]').value,
            videoType: 'none'
          })
        });
        const data = await resp.json();
        if (!resp.ok) {
          if (resp.status === 401) { showGate(); return; }
          throw new Error(data.error || 'Failed');
        }
        renderSlot(data);
        status.textContent = 'Video removed';
        status.className = 'slot-status visible success';
      } catch (e) {
        status.textContent = e.message;
        status.className = 'slot-status visible error';
      } finally {
        btn.disabled = false;
        setTimeout(() => { status.classList.remove('visible'); }, 3000);
      }
    });
  });

  /* ---------- Change password ---------- */

  const pwChangeBtn = document.getElementById('pw-change-btn');
  const pwNewInput = document.getElementById('pw-new');
  const pwConfirmInput = document.getElementById('pw-confirm');
  const pwChangeStatus = document.getElementById('pw-change-status');

  pwChangeBtn.addEventListener('click', async () => {
    const np = pwNewInput.value.trim();
    const cp = pwConfirmInput.value.trim();
    pwChangeStatus.textContent = '';
    pwChangeStatus.className = 'slot-status';

    if (!np) { pwChangeStatus.textContent = 'Enter a new password'; pwChangeStatus.className = 'slot-status visible error'; return; }
    if (np !== cp) { pwChangeStatus.textContent = 'Passwords do not match'; pwChangeStatus.className = 'slot-status visible error'; return; }

    pwChangeBtn.disabled = true;
    try {
      const resp = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: np })
      });
      const data = await resp.json();
      if (!resp.ok) {
        if (resp.status === 401) { showGate(); return; }
        throw new Error(data.error || 'Failed');
      }
      setToken(btoa(np));
      pwNewInput.value = '';
      pwConfirmInput.value = '';
      pwChangeStatus.textContent = 'Password updated';
      pwChangeStatus.className = 'slot-status visible success';
      setTimeout(() => document.getElementById('pw-modal').setAttribute('hidden', ''), 1400);
    } catch (e) {
      pwChangeStatus.textContent = e.message;
      pwChangeStatus.className = 'slot-status visible error';
    } finally {
      pwChangeBtn.disabled = false;
      setTimeout(() => { pwChangeStatus.classList.remove('visible'); }, 4000);
    }
  });

  /* ---------- Init: check existing session ---------- */

  if (getToken()) {
    fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: atob(getToken()) })
    }).then(r => {
      if (r.ok) showPanel();
      else showGate();
    }).catch(() => showGate());
  }

  /* ---------- Admin tab switching ---------- */

  var currentAdminTab = 'films';

  document.querySelectorAll('.admin-nav-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var target = tab.dataset.tab;
      document.querySelectorAll('.admin-nav-tab').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      document.querySelectorAll('.admin-tab-pane').forEach(function (p) { p.classList.remove('active'); });
      var pane = document.getElementById('admin-tab-' + target);
      if (pane) pane.classList.add('active');
      currentAdminTab = target;
      if (target === 'content') { initContentManager(); initTransitionWords(); }
    });
  });

  /* ---------- Content Manager ---------- */

  var contentData = null;
  var contentMeta = null;
  var contentLoaded = false;
  var contentActivePage = 'index';

  /* If arriving from edit mode, open Content Manager tab */
  try {
    if (window.location.hash === '#content') {
      var contentTab = document.querySelector('.admin-nav-tab[data-tab="content"]');
      if (contentTab) contentTab.click();
    }
  } catch (e) {}

  function getPageLabel(page) {
    var labels = { index: 'Home', about: 'Intent', work: 'Work', narrative: 'Narrative', founder: 'Founder', contact: 'Contact', shared: 'Shared' };
    return labels[page] || page;
  }

  function getSectionLabel(section) {
    if (section === 'hero') return 'Hero section';
    if (section === 'marker') return 'Page marker';
    if (section === 'preloader') return 'Preloader';
    if (section === 'brand') return 'Brand';
    if (section === 'panel1') return 'Panel 1';
    if (section === 'panel2') return 'Panel 2';
    if (section === 'panel') return 'Panel';
    if (section === 'pillars') return 'Pillars section';
    if (section === 'card1') return 'Card 1';
    if (section === 'card2') return 'Card 2';
    if (section === 'card3') return 'Card 3';
    if (section === 'progress') return 'Development slate';
    if (section === 'ring') return 'Ring text';
    if (section === 'bio') return 'Biography';
    if (section === 'channel1') return 'Channel 1';
    if (section === 'channel2') return 'Channel 2';
    if (section === 'channel3') return 'Channel 3';
    if (section === 'channel4') return 'Channel 4';
    if (section === 'quote') return 'Quote';
    if (section === 'footer') return 'Footer';
    if (section === 'nav') return 'Navigation';
    if (section === 'filters') return 'Filter buttons';
    return section;
  }

  function groupBySection(meta) {
    var groups = {};
    for (var i = 0; i < meta.length; i++) {
      var item = meta[i];
      var key = item.page + '::' + item.section;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }

  function renderContentCards(page) {
    var container = document.getElementById('content-cards');
    if (!container) return;
    if (!contentMeta) { container.innerHTML = '<p style="color:#b9af96">Loading content…</p>'; return; }

    var filtered = contentMeta.filter(function (item) { return item.page === page; });
    var groups = groupBySection(filtered);
    var html = '';

    var keys = Object.keys(groups).sort();
    for (var g = 0; g < keys.length; g++) {
      var group = groups[keys[g]];
      var section = group[0].section;
      html += '<div class="content-card" data-section="' + section + '">';
      html += '<div class="content-card-header">';
      html += '<div class="content-card-label">' + getSectionLabel(section) + '</div>';
      html += '<div class="content-card-sub">' + group.length + ' field' + (group.length !== 1 ? 's' : '') + '</div>';
      html += '</div>';

      for (var f = 0; f < group.length; f++) {
        var item = group[f];
        var val = contentData[item.content_key] || '';
        var isLong = val.length > 60 || item.element_type === 'body' || item.element_type === 'lead' || item.element_type === 'list-item';

        html += '<div class="content-field" data-key="' + item.content_key + '">';
        html += '<div class="content-field-key">' + item.content_key.replace(page + '.', '') + '</div>';
        html += '<div class="content-field-row">';
        if (isLong) {
          html += '<textarea class="cm-input" data-max="' + item.max_chars + '" rows="' + (Math.ceil(val.length / 50) || 2) + '">' + escHtml(val) + '</textarea>';
        } else {
          html += '<input class="cm-input" type="text" data-max="' + item.max_chars + '" value="' + escAttr(val) + '">';
        }
        html += '</div>';
        html += '<div class="content-field-counter">' + val.length + '/' + item.max_chars + '</div>';
        html += '</div>';
      }

      html += '<div class="content-card-actions">';
      html += '<button class="content-save-btn" data-section="' + section + '">Save ' + getSectionLabel(section) + '</button>';
      html += '<span class="slot-status cm-status" data-section="' + section + '"></span>';
      html += '</div>';
      html += '</div>';
    }

    if (!html) {
      html = '<p style="color:#b9af96;padding:24px 0">No content fields for this page.</p>';
    }
    container.innerHTML = html;

    /* bind char counters */
    container.querySelectorAll('.cm-input').forEach(function (input) {
      var counter = input.closest('.content-field').querySelector('.content-field-counter');
      var max = parseInt(input.dataset.max, 10);

      function update() {
        var len = input.value.length;
        counter.textContent = len + '/' + max;
        if (len > max) {
          counter.classList.add('over');
          input.classList.add('cm-over');
        } else {
          counter.classList.remove('over');
          input.classList.remove('cm-over');
        }
      }
      input.addEventListener('input', update);
      update();
    });

    /* bind save buttons */
    container.querySelectorAll('.content-save-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var sectionName = btn.dataset.section;
        var card = btn.closest('.content-card');
        var status = card.querySelector('.cm-status');
        var inputs = card.querySelectorAll('.cm-input');
        var updates = [];

        for (var i = 0; i < inputs.length; i++) {
          var inp = inputs[i];
          var field = inp.closest('.content-field');
          var key = field.dataset.key;
          var val = inp.value;
          var max = parseInt(inp.dataset.max, 10);

          if (val.length > max) {
            status.textContent = 'Fix overflow before saving';
            status.className = 'slot-status visible error';
            return;
          }
          updates.push({ content_key: key, content_value: val });
        }

        btn.disabled = true;
        status.textContent = 'Saving…';
        status.className = 'slot-status visible';

        fetch('/api/admin/site-content', {
          method: 'PUT',
          headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
          body: JSON.stringify({ updates: updates })
        }).then(function (r) {
          if (!r.ok && r.status === 401) { showGate(); return null; }
          return r.json().then(function (data) { return { ok: r.ok, data: data }; });
        }).then(function (result) {
          if (!result) return;
          if (!result.ok || (result.data.errors && result.data.errors.length > 0)) {
            var errs = result.data.errors || [];
            status.textContent = errs.length > 0 ? errs[0].error : 'Save failed';
            status.className = 'slot-status visible error';
            return;
          }
          for (var j = 0; j < updates.length; j++) {
            contentData[updates[j].content_key] = updates[j].content_value;
          }
          status.textContent = 'Saved';
          status.className = 'slot-status visible success';
        }).catch(function () {
          status.textContent = 'Network error';
          status.className = 'slot-status visible error';
        }).finally(function () {
          btn.disabled = false;
          setTimeout(function () { status.classList.remove('visible'); }, 3000);
        });
      });
    });
  }

  function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function escAttr(s) {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function initContentManager() {
    if (contentLoaded) return;
    contentLoaded = true;

    fetch('/api/site-content')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.content || !Array.isArray(data.meta)) {
          document.getElementById('content-cards').innerHTML = '<p style="color:#cf8080">No content data found. Ensure the database is configured and migrations have run.</p>';
          return;
        }
        contentData = data.content;
        contentMeta = data.meta;
        renderContentCards(contentActivePage || 'index');
      })
      .catch(function () {
        document.getElementById('content-cards').innerHTML = '<p style="color:#cf8080">Failed to load content data.</p>';
      });

    /* page tab switching */
    document.querySelectorAll('.content-page-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.content-page-tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        contentActivePage = tab.dataset.page || 'index';
        renderContentCards(contentActivePage);
      });
    });
  }

  /* ---------- ITRANS → Devanagari transliterator ---------- */

  function itransToDevanagari(text) {
    /* Consonants — longer sequences first to avoid prefix ambiguity */
    var C = [
      ['ksh','क्ष'],['jny','ज्ञ'],
      ['kh','ख'],['gh','घ'],['Chh','छ'],['chh','छ'],['Ch','छ'],['ch','च'],
      ['jh','झ'],['Th','ठ'],['Dh','ढ'],['th','थ'],['dh','ध'],
      ['ph','फ'],['bh','भ'],['sh','श'],['Sh','ष'],['sh','श'],
      ['k','क'],['g','ग'],['c','च'],['j','ज'],
      ['T','ट'],['D','ड'],['N','ण'],
      ['t','त'],['d','द'],['n','न'],
      ['p','प'],['b','ब'],['m','म'],
      ['y','य'],['r','र'],['l','ल'],['v','व'],['w','व'],
      ['s','स'],['h','ह'],['L','ळ']
    ];
    /* Vowels — longer sequences first */
    var V = [
      ['aa','आ','ा'],['A','आ','ा'],
      ['ii','ई','ी'],['I','ई','ी'],
      ['uu','ऊ','ू'],['U','ऊ','ू'],
      ['RRi','ऋ','ृ'],['ri','ऋ','ृ'],
      ['ai','ऐ','ै'],['au','औ','ौ'],
      ['e','ए','े'],['o','ओ','ो'],
      ['i','इ','ि'],['u','उ','ु'],
      ['a','अ','']
    ];
    var HALANT = '्';

    function matchAt(str, pos, table) {
      for (var k = 0; k < table.length; k++) {
        var seq = table[k][0];
        if (str.substr(pos, seq.length) === seq) return table[k];
      }
      return null;
    }

    var out = '';
    var i = 0;
    var afterConsonant = false;

    while (i < text.length) {
      /* Special chars */
      if (text[i] === 'M') { out += 'ं'; i++; afterConsonant = false; continue; }
      if (text[i] === 'H') { out += 'ः'; i++; afterConsonant = false; continue; }
      if (text[i] === ' ' || text[i] === '-') {
        if (afterConsonant) { /* inherent a already implicit */ }
        out += text[i] === ' ' ? ' ' : '';
        i++; afterConsonant = false; continue;
      }

      var vm = matchAt(text, i, V);
      if (vm) {
        /* vowel */
        if (afterConsonant) {
          out += vm[2]; /* vowel mark; empty string for inherent 'a' */
        } else {
          out += vm[1]; /* standalone vowel */
        }
        i += vm[0].length;
        afterConsonant = false;
        continue;
      }

      var cm = matchAt(text, i, C);
      if (cm) {
        if (afterConsonant) {
          out += HALANT; /* suppress inherent a between consonants */
        }
        out += cm[1];
        i += cm[0].length;
        afterConsonant = true;
        continue;
      }

      /* Unknown char — pass through */
      out += text[i];
      i++;
      afterConsonant = false;
    }

    return out;
  }

  /* ---------- Transition Words manager ---------- */

  var twLoaded = false;

  function initTransitionWords() {
    if (twLoaded) return;
    twLoaded = true;
    loadTransitionWords();

    document.getElementById('tw-roman').addEventListener('input', function () {
      var devanagari = itransToDevanagari(this.value.trim());
      document.getElementById('tw-preview').textContent = devanagari || '—';
    });

    document.getElementById('tw-add-btn').addEventListener('click', function () {
      var roman = document.getElementById('tw-roman').value.trim();
      var word = itransToDevanagari(roman);
      var label = document.getElementById('tw-label').value.trim();
      var status = document.getElementById('tw-status');

      if (!word || word === '—') {
        status.textContent = 'Enter a romanised word first';
        status.className = 'slot-status visible error';
        setTimeout(function () { status.classList.remove('visible'); }, 3000);
        return;
      }

      this.disabled = true;
      status.textContent = 'Adding…';
      status.className = 'slot-status visible';

      fetch('/api/admin/transition-words', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
        body: JSON.stringify({ word: word, label: label })
      }).then(function (r) {
        if (r.status === 401) { showGate(); return null; }
        return r.json().then(function (d) { return { ok: r.ok, data: d }; });
      }).then(function (result) {
        if (!result) return;
        if (!result.ok) {
          status.textContent = result.data.error || 'Failed';
          status.className = 'slot-status visible error';
          return;
        }
        document.getElementById('tw-roman').value = '';
        document.getElementById('tw-label').value = '';
        document.getElementById('tw-preview').textContent = '—';
        status.textContent = 'Added';
        status.className = 'slot-status visible success';
        loadTransitionWords();
      }).catch(function () {
        status.textContent = 'Network error';
        status.className = 'slot-status visible error';
      }).finally(function () {
        document.getElementById('tw-add-btn').disabled = false;
        setTimeout(function () { status.classList.remove('visible'); }, 3000);
      });
    });
  }

  function loadTransitionWords() {
    fetch('/api/admin/transition-words', { headers: authHeaders() })
      .then(function (r) {
        if (r.status === 401) { showGate(); return null; }
        return r.json();
      })
      .then(function (words) {
        if (!words) return;
        renderTransitionWords(words);
      })
      .catch(function () {
        document.getElementById('tw-word-list').innerHTML =
          '<p style="color:#cf8080">Failed to load transition words.</p>';
      });
  }

  function renderTransitionWords(words) {
    var list = document.getElementById('tw-word-list');
    if (!words.length) {
      list.innerHTML = '<p style="color:#b9af96">No words yet.</p>';
      return;
    }
    var html = '';
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      html += '<div class="tw-chip" data-id="' + w.id + '">';
      html += '<span class="tw-chip-word">' + escHtml(w.word) + '</span>';
      if (w.label) html += '<span class="tw-chip-label">' + escHtml(w.label) + '</span>';
      html += '<button class="tw-chip-del" data-id="' + w.id + '" title="Remove">&times;</button>';
      html += '</div>';
    }
    list.innerHTML = html;

    list.querySelectorAll('.tw-chip-del').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = Number(btn.dataset.id);
        btn.disabled = true;
        fetch('/api/admin/transition-words', {
          method: 'DELETE',
          headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
          body: JSON.stringify({ id: id })
        }).then(function (r) {
          if (r.status === 401) { showGate(); return; }
          loadTransitionWords();
        }).catch(function () { btn.disabled = false; });
      });
    });
  }

})();
