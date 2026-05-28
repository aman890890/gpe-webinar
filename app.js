(function() {
  'use strict';

  const CFG = typeof GPE_WEBINAR_CONFIG !== 'undefined' ? GPE_WEBINAR_CONFIG : {};
  const GAS_URL = (CFG.GAS_EXEC_URL || '').replace(/\/$/, '');
  const MAX_FILE_MB = CFG.MAX_FILE_MB || 10;
  const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  let tgUser = { id: '', username: '', first_name: '' };

  if (tg) {
    try {
      tg.ready();
      tg.expand();
      try {
        tg.setHeaderColor('#000814');
        tg.setBackgroundColor('#000814');
      } catch (e) {}

      const init = tg.initDataUnsafe || {};
      if (init.user) {
        tgUser = {
          id: init.user.id || '',
          username: init.user.username || '',
          first_name: init.user.first_name || ''
        };
      }
    } catch (err) {
      console.warn('Telegram WebApp init failed:', err);
    }
  }

  const $ = (id) => document.getElementById(id);
  const tgUserEl = $('tg-user');
  const alertBox = $('alert-box');
  const form = $('reg-form');
  const adminSel = $('adminPic');
  const fileInput = $('screenshot');
  const fileWrap = $('file-wrapper');
  const fileLabel = $('file-label');
  const fileHint = $('file-hint');
  const filePrev = $('file-preview');
  const previewImg = $('preview-img');
  const submitBtn = $('submit-btn');
  const btnText = $('btn-text');

  if (fileHint) {
    fileHint.textContent = 'Format: JPG / PNG / WEBP - Maks ' + MAX_FILE_MB + 'MB';
  }

  if (new URLSearchParams(window.location.search).get('debug') === '1') {
    const panel = $('diag-panel');
    if (panel) panel.classList.remove('hidden');
    renderDiagnostic();
  }

  function renderDiagnostic() {
    const out = $('diag-output');
    if (!out) return;
    const initRaw = tg ? (tg.initData || '') : '';
    const initUnsafe = tg ? (tg.initDataUnsafe || {}) : {};
    const lines = [
      'host: GitHub Pages (bukan GAS iframe)',
      'GAS_EXEC_URL: ' + (GAS_URL ? GAS_URL.substring(0, 60) + '...' : 'BELUM SET'),
      'window.Telegram: ' + (window.Telegram ? 'YA' : 'TIDAK'),
      'tg.initData length: ' + initRaw.length,
      'tg.initDataUnsafe.user: ' + JSON.stringify(initUnsafe.user || null),
      'location.hash: ' + (window.location.hash || 'KOSONG').substring(0, 80),
      'top !== self (iframe?): ' + (window.top !== window.self)
    ];
    out.textContent = lines.join('\n');
  }

  if (!GAS_URL || GAS_URL.indexOf('YOUR_DEPLOYMENT') >= 0) {
    showError('Sila edit config.js - set GAS_EXEC_URL kepada URL /exec Apps Script anda.');
  }

  if (tgUser.id) {
    let label = '';
    if (tgUser.username) label = '@' + tgUser.username;
    else if (tgUser.first_name) label = tgUser.first_name;
    else label = 'ID ' + tgUser.id;
    tgUserEl.textContent = label;
  } else {
    tgUserEl.textContent = '(Buka dari Menu Button bot di Telegram)';
    showError('Sila buka borang ini dari Menu Button bot @gpeviprobot di Telegram (bukan pautan terus).');
  }

  window.onAdminsLoaded = function(data) {
    cleanupAdminsScript();
    if (!data || !data.ok || !data.admins || !data.admins.length) {
      adminSel.innerHTML = '<option value="">(Tiada admin aktif)</option>';
      showError('Tiada admin aktif. Sila hubungi admin.');
      return;
    }
    let html = '<option value="">-- Pilih Admin PIC --</option>';
    for (let i = 0; i < data.admins.length; i++) {
      const adm = data.admins[i];
      const label = adm.username ? (adm.name + ' (' + adm.username + ')') : adm.name;
      html += '<option value="' + escapeHtmlAttr(adm.name) + '">' + escapeHtml(label) + '</option>';
    }
    adminSel.innerHTML = html;
    adminSel.disabled = false;
    if (tgUser.id) submitBtn.disabled = false;
  };

  function loadAdminList() {
    if (!GAS_URL) return;
    const cb = 'onAdminsLoaded';
    const script = document.createElement('script');
    script.id = 'admins-jsonp';
    script.src = GAS_URL + '?action=get_admins&callback=' + cb + '&_=' + Date.now();
    script.onerror = function() {
      cleanupAdminsScript();
      adminSel.innerHTML = '<option value="">(Gagal memuatkan)</option>';
      showError('Gagal memuatkan senarai admin. Semak GAS_EXEC_URL dalam config.js.');
    };
    document.body.appendChild(script);
  }

  function cleanupAdminsScript() {
    const old = document.getElementById('admins-jsonp');
    if (old && old.parentNode) old.parentNode.removeChild(old);
  }

  loadAdminList();

  let fileBase64 = '';
  let fileMime = '';
  let fileName = '';

  fileInput.addEventListener('change', function(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      resetFile();
      return;
    }
    if (!/^image\//i.test(file.type)) {
      showError('Hanya fail imej (JPG/PNG/WEBP) dibenarkan.');
      resetFile();
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      showError('Saiz fail melebihi ' + MAX_FILE_MB + 'MB.');
      resetFile();
      return;
    }
    fileName = file.name;
    fileMime = file.type;
    fileLabel.textContent = file.name + ' (' + Math.round(file.size / 1024) + ' KB)';
    fileWrap.classList.add('has-file');
    hideAlerts();

    const reader = new FileReader();
    reader.onload = function(ev) {
      const dataUrl = ev.target.result || '';
      const idx = dataUrl.indexOf(',');
      fileBase64 = idx >= 0 ? dataUrl.substring(idx + 1) : '';
      previewImg.src = dataUrl;
      filePrev.classList.add('show');
    };
    reader.onerror = function() {
      showError('Gagal membaca fail.');
      resetFile();
    };
    reader.readAsDataURL(file);
  });

  function resetFile() {
    fileBase64 = '';
    fileMime = '';
    fileName = '';
    fileInput.value = '';
    fileLabel.textContent = 'Tap untuk pilih screenshot';
    fileWrap.classList.remove('has-file');
    filePrev.classList.remove('show');
    previewImg.src = '';
  }

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    hideAlerts();

    if (!tg || !tg.initData) {
      showError('initData Telegram tidak tersedia. Buka semula dari Menu Button bot.');
      return;
    }
    if (!fileBase64) {
      showError('Sila pilih screenshot deposit MT5.');
      return;
    }
    if (!adminSel.value) {
      showError('Sila pilih Admin PIC.');
      return;
    }
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const payload = {
      namaPenuh: $('namaPenuh').value.trim(),
      noTelefon: $('noTelefon').value.trim(),
      noMT5: $('noMT5').value.trim(),
      broker: $('broker').value.trim(),
      ib: $('ib').value.trim(),
      adminPicName: adminSel.value,
      screenshot: {
        base64: fileBase64,
        mimeType: fileMime,
        fileName: fileName
      }
    };

    setLoading(true);

    const postForm = document.createElement('form');
    postForm.method = 'POST';
    postForm.action = GAS_URL;
    postForm.acceptCharset = 'UTF-8';

    function addField(name, value) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      postForm.appendChild(input);
    }

    addField('type', 'register');
    addField('initDataB64', toBase64Utf8_(tg.initData));
    addField('payload', JSON.stringify(payload));

    document.body.appendChild(postForm);
    postForm.submit();
  });

  function setLoading(loading) {
    if (loading) {
      submitBtn.disabled = true;
      btnText.innerHTML = '<span class="spinner"></span>MENGHANTAR...';
    } else {
      submitBtn.disabled = !tgUser.id;
      btnText.textContent = 'HANTAR PERMOHONAN';
    }
  }

  function showError(msg) {
    alertBox.textContent = msg;
    alertBox.classList.add('show');
    if (tg && tg.HapticFeedback) {
      try { tg.HapticFeedback.notificationOccurred('error'); } catch (e) {}
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function hideAlerts() {
    alertBox.classList.remove('show');
    alertBox.textContent = '';
  }

  function toBase64Utf8_(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function escapeHtmlAttr(s) { return escapeHtml(s); }

})();
