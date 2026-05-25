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
})();
