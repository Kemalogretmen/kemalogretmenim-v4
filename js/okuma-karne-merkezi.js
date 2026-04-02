(function() {
  'use strict';

  const SELECTED_RESULT_KEY = 'kemal_okuma_karne_selected_result_v1';
  const MOTI = [
    '"Kitap okuyan biri hicbir zaman yalniz degildir. Harikasin!"',
    '"Her hikaye seni biraz daha buyutuyor. Cok iyi gidiyorsun!"',
    '"Okudukca kesfediyorsun, sinirlarin yok senin!"',
    '"Kelimeler senin super gucun. Devam et!"',
    '"Her sayfada yeni bir dunyaya adim atiyorsun!"',
    '"Dusunen, okuyan, anlayan bir ogrenci olarak gurur veriyorsun!"',
    '"Okumanin gucuyle her kapiyi acabilirsin!"'
  ];

  let allData = [];
  let suggestions = [];
  let speedChart = null;
  let anlamaChart = null;
  let currentStudent = '';
  let autoSelectionDone = false;

  function getClient() {
    return window.kemalAdminAuth.getClient();
  }

  function str(value) {
    return (value || '').toString().trim();
  }

  function num(value) {
    const parsed = parseFloat(str(value).replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function normName(name) {
    return str(name).replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
  }

  function prettyName(name) {
    return str(name).split(' ').map(function(part) {
      return part ? part[0].toLocaleUpperCase('tr-TR') + part.slice(1).toLocaleLowerCase('tr-TR') : '';
    }).join(' ').trim();
  }

  function safeName() {
    return prettyName(currentStudent || 'Ogrenci')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_ÇçĞğİıÖöŞşÜü]/g, '');
  }

  function toMs(value) {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value.getTime();
    }
    if (typeof value === 'number') {
      return value > 100000000000 ? value : (value - 25569) * 86400 * 1000;
    }
    if (typeof value === 'object') {
      if (typeof value.toDate === 'function') {
        return value.toDate().getTime();
      }
      if (typeof value.seconds === 'number') {
        return value.seconds * 1000;
      }
    }
    const raw = value.toString().trim();
    const match = raw.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (match) {
      return new Date(match[3] + '-' + match[2] + '-' + match[1]).getTime();
    }
    const parsed = new Date(raw).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }

  function fmtDate(date) {
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  function fmtDateShort(ms) {
    if (!ms) {
      return '—';
    }
    return new Date(ms).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
  }

  function fmtSure(seconds) {
    if (!seconds) {
      return '—';
    }
    const total = Math.round(seconds);
    const minutes = Math.floor(total / 60);
    const rest = total % 60;
    return minutes > 0 ? minutes + 'dk ' + rest + 'sn' : rest + 'sn';
  }

  function setStatus(message, type) {
    const bar = document.getElementById('status-bar');
    bar.textContent = message;
    bar.className = 'status-bar' + (type ? ' ' + type : '');
  }

  function escHtml(value) {
    return str(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function dl(canvas, mime, filename, quality) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = quality ? canvas.toDataURL(mime, quality) : canvas.toDataURL(mime);
    link.click();
  }

  function getClassKey(item) {
    if (!item || !item.sinif) {
      return '';
    }
    return item.sube ? item.sinif + '-' + item.sube : String(item.sinif);
  }

  function getSourceLabel(source) {
    if (source === 'new') {
      return 'Yeni Excel';
    }
    if (source === 'old') {
      return 'Eski Excel';
    }
    if (source === 'db') {
      return 'Veritabani';
    }
    return 'Kaynak';
  }

  function setZoneState(kind, count) {
    const zone = document.getElementById('uz-' + kind);
    const icon = document.getElementById('uz-' + kind + '-icon');
    const text = document.getElementById('uz-' + kind + '-text');
    if (!zone || !icon || !text) {
      return;
    }
    if (count > 0) {
      zone.classList.add('active');
      icon.textContent = '✅';
      text.textContent = count + ' kayit yüklendi';
    }
  }

  function updateMergeBadge() {
    const badge = document.getElementById('merge-badge');
    const sourceCount = new Set(allData.map(function(item) { return item.src; }).filter(Boolean)).size;
    badge.classList.toggle('visible', sourceCount > 1);
  }

  function getPendingSelection() {
    try {
      const raw = localStorage.getItem(SELECTED_RESULT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function clearPendingSelection() {
    localStorage.removeItem(SELECTED_RESULT_KEY);
  }

  function seedPendingSelection() {
    const pending = getPendingSelection();
    if (!pending) {
      return;
    }
    const fullName = str(pending.fullName || ((pending.ad || '') + ' ' + (pending.soyad || '')).trim());
    if (!fullName) {
      return;
    }
    const seeded = {
      id: pending.id || 'pending-' + Date.now(),
      fullName: prettyName(fullName),
      normKey: normName(fullName),
      metin: str(pending.metin_adi || pending.metin || 'Okuma Kaydi'),
      wpm: num(pending.dakika_kelime || pending.wpm),
      hedef: num(pending.hedef_hiz || pending.hedef),
      sure: num(pending.okuma_suresi_sn || pending.sure),
      dogru: num(pending.dogru_sayisi || pending.dogru),
      yanlis: num(pending.yanlis_sayisi || pending.yanlis),
      anlama: num(
        pending.toplam_soru > 0
          ? pending.anlama_yuzdesi
          : (pending.anlama_yuzdesi || pending.anlama)
      ),
      tarih: toMs(pending.olusturma_tarihi || pending.tarih || pending.date),
      sinif: str(pending.sinif),
      sube: str(pending.sube),
      src: 'db'
    };
    allData = allData.filter(function(item) {
      return !(item.src === 'db' && item.id === seeded.id);
    }).concat(seeded);
  }

  function getActivePool() {
    const classValue = document.getElementById('class-filter').value;
    return allData.filter(function(item) {
      return !classValue || getClassKey(item) === classValue;
    });
  }

  function rebuildUI() {
    const classSelect = document.getElementById('class-filter');
    const currentValue = classSelect.value;
    const classMap = new Map();

    allData.forEach(function(item) {
      const key = getClassKey(item);
      if (!key) {
        return;
      }
      if (!classMap.has(key)) {
        classMap.set(key, item);
      }
    });

    classSelect.innerHTML = '<option value="">Tum Siniflar</option>';
    Array.from(classMap.keys()).sort(function(a, b) {
      return a.localeCompare(b, 'tr');
    }).forEach(function(key) {
      const item = classMap.get(key);
      const option = document.createElement('option');
      option.value = key;
      option.textContent = item.sube ? (item.sinif + '. Sinif / ' + item.sube + ' Subesi') : (item.sinif + '. Sinif');
      classSelect.appendChild(option);
    });
    if (currentValue && Array.from(classMap.keys()).includes(currentValue)) {
      classSelect.value = currentValue;
    }

    const suggestionMap = new Map();
    getActivePool().forEach(function(item) {
      if (!suggestionMap.has(item.normKey)) {
        suggestionMap.set(item.normKey, { key: item.normKey, label: prettyName(item.fullName) });
      }
    });
    suggestions = Array.from(suggestionMap.values()).sort(function(a, b) {
      return a.label.localeCompare(b.label, 'tr');
    });

    setZoneState('new', allData.filter(function(item) { return item.src === 'new'; }).length);
    setZoneState('old', allData.filter(function(item) { return item.src === 'old'; }).length);
    setZoneState('db', allData.filter(function(item) { return item.src === 'db'; }).length);
  }

  function autoFmt(headers, hint, firstRaw) {
    const isNew = headers.some(function(header) {
      return ['WPM', 'Hedef WPM', 'Anlama %', 'Metin'].includes(String(header));
    }) || (firstRaw && firstRaw.true !== undefined);
    const isOld = headers.some(function(header) {
      return String(header).includes('Ogrenci Adi') || String(header).includes('Ogrenci Adi_Soyadi') || String(header).includes('Hikaye');
    });
    if (isNew) {
      return 'new';
    }
    if (isOld) {
      return 'old';
    }
    return hint;
  }

  function processRows(rows, fmt) {
    const added = [];
    rows.forEach(function(row) {
      let fullName;
      let metin;
      let wpm;
      let hedef;
      let sure;
      let dogru;
      let yanlis;
      let anlama;
      let tarih;
      let sinif;
      let sube;

      if (fmt === 'new') {
        const ad = str(row.Ad || row.ad || '');
        const soyad = str(row.Soyad || row.soyad || '');
        fullName = (ad + ' ' + soyad).trim();
        if (!fullName) {
          return;
        }
        metin = str(row.Metin || row.metin || '');
        wpm = num(row.WPM || row.Hiz || 0);
        hedef = num(row['Hedef WPM'] || row.HedefWPM || 0);
        sure = num(row['Sure (sn)'] || row.Sure || row['Süre (sn)'] || row['Süre'] || 0);
        dogru = num(row.__dogru__ !== undefined ? row.__dogru__ : (row.Dogru || row['Doğru'] || row.true || row.TRUE || 0));
        yanlis = num(row.__yanlis__ !== undefined ? row.__yanlis__ : (row.Yanlis || row['Yanlış'] || row.false || row.FALSE || 0));
        anlama = num(row['Anlama %'] || row.Anlama || row.Basari || row['Başarı'] || 0);
        tarih = toMs(row.Tarih || row.tarih || '');
        sinif = str(row.Sinif || row['Sınıf'] || row.sinif || '');
        sube = str(row.Sube || row['Şube'] || row.sube || '');
      } else {
        fullName = str(row['Öğrenci Adı_Soyadı'] || row['Öğrenci Adı Soyadı'] || row['Ad Soyad'] || '');
        if (!fullName) {
          return;
        }
        metin = str(row['Hikaye Adı'] || row.Hikaye || row.Metin || '');
        wpm = num(row['Hız (Kelime/Dk)'] || row.WPM || row.Hiz || 0);
        hedef = 0;
        sure = num(row['Okuma Süresi (Sn)'] || row['Süre (Sn)'] || row.Sure || 0);
        dogru = num(row['Doğru Sayısı'] || row['Doğru'] || 0);
        yanlis = num(row['Yanlış Sayısı'] || row['Yanlış'] || 0);
        anlama = num(row['Başarı Yüzdesi (%)'] || row['Başarı Yüzdesi'] || row['Başarı %'] || row['Başarı'] || 0);
        tarih = toMs(row['Zaman damgası'] || row.Tarih || '');
        sinif = str(row['Sınıf'] || '');
        sube = str(row['Şube'] || '');
      }

      if (!metin && !wpm) {
        return;
      }

      added.push({
        fullName: prettyName(fullName),
        normKey: normName(fullName),
        metin: metin,
        wpm: wpm,
        hedef: hedef,
        sure: sure,
        dogru: dogru,
        yanlis: yanlis,
        anlama: anlama,
        tarih: tarih,
        sinif: sinif,
        sube: sube,
        src: fmt
      });
    });

    if (added.length) {
      allData = allData.filter(function(item) { return item.src !== fmt; }).concat(added);
      rebuildUI();
      updateMergeBadge();
      maybeAutoSelect();
      setStatus('✅ ' + allData.length + ' kayit hazir. Ogrenci secip karne olusturabilirsin.', 'ok');
    }
  }

  function parseCSV(text, src) {
    let safeText = text;
    if (safeText.charCodeAt(0) === 0xFEFF) {
      safeText = safeText.slice(1);
    }
    const lines = safeText.split(/\r?\n/).filter(function(line) { return line.trim(); });
    if (!lines.length) {
      return;
    }
    const separator = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(separator).map(function(header) {
      return header.replace(/"/g, '').trim();
    });
    const rows = lines.slice(1).map(function(line) {
      const cells = line.split(separator).map(function(cell) { return cell.replace(/"/g, '').trim(); });
      const row = {};
      headers.forEach(function(header, index) {
        row[header] = cells[index] || '';
      });
      return row;
    });
    processRows(rows, autoFmt(headers, src, null));
  }

  function parseExcel(buffer, src) {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
    const merged = rows.map(function(row, index) {
      const rawRow = rawRows[index] || {};
      if (rawRow.true !== undefined) {
        row.__dogru__ = rawRow.true;
      }
      if (rawRow.false !== undefined) {
        row.__yanlis__ = rawRow.false;
      }
      return row;
    });
    processRows(merged, autoFmt(Object.keys(rows[0] || {}), src, rawRows[0]));
  }

  function readFiles(files, src) {
    Array.from(files || []).forEach(function(file) {
      const extension = file.name.split('.').pop().toLowerCase();
      const reader = new FileReader();
      if (extension === 'csv') {
        reader.onload = function(event) {
          parseCSV(event.target.result, src);
        };
        reader.readAsText(file, 'UTF-8');
      } else {
        reader.onload = function(event) {
          parseExcel(event.target.result, src);
        };
        reader.readAsArrayBuffer(file);
      }
    });
  }

  function mapDbRow(row) {
    const fullName = prettyName(((row.ad || '') + ' ' + (row.soyad || '')).trim());
    return {
      id: row.id,
      fullName: fullName,
      normKey: normName(fullName),
      metin: str(row.metin_adi || ''),
      wpm: num(row.dakika_kelime || 0),
      hedef: num(row.hedef_hiz || 0),
      sure: num(row.okuma_suresi_sn || 0),
      dogru: num(row.dogru_sayisi || 0),
      yanlis: num(row.yanlis_sayisi || 0),
      anlama: num((row.toplam_soru || 0) > 0 ? row.anlama_yuzdesi : 0),
      tarih: toMs(row.olusturma_tarihi || row.created_at),
      sinif: str(row.sinif || ''),
      sube: str(row.sube || ''),
      src: 'db'
    };
  }

  async function loadDatabaseRecords(silent) {
    const dbText = document.getElementById('uz-db-text');
    const dbIcon = document.getElementById('uz-db-icon');
    dbIcon.textContent = '⏳';
    dbText.textContent = 'Canli veriler yukleniyor...';
    if (!silent) {
      setStatus('⏳ Veritabanindaki okuma kayitlari yukleniyor...');
    }
    const response = await getClient()
      .from('sonuclar')
      .select('*')
      .order('olusturma_tarihi', { ascending: true });
    if (response.error) {
      dbIcon.textContent = '⚠️';
      dbText.textContent = 'Veritabanina ulasilamadi';
      if (!silent) {
        setStatus('⚠️ Veritabani verileri yuklenemedi: ' + response.error.message, 'err');
      }
      maybeAutoSelect();
      return;
    }
    const mapped = (response.data || []).map(mapDbRow).filter(function(item) {
      return item.fullName && (item.metin || item.wpm);
    });
    allData = allData.filter(function(item) { return item.src !== 'db'; }).concat(mapped);
    rebuildUI();
    updateMergeBadge();
    maybeAutoSelect();
    setStatus('✅ Veritabanindan ' + mapped.length + ' kayit yüklendi.', 'ok');
  }

  function showSuggestions() {
    const query = normName(document.getElementById('search-input').value);
    const list = document.getElementById('sug-list');
    list.innerHTML = '';
    if (!query) {
      list.classList.remove('open');
      return;
    }
    const matches = suggestions.filter(function(item) {
      return item.key.includes(query);
    }).slice(0, 10);
    if (!matches.length) {
      list.classList.remove('open');
      return;
    }
    matches.forEach(function(item) {
      const div = document.createElement('div');
      div.className = 'sug-item';
      const escaped = document.getElementById('search-input').value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(escaped, 'gi');
      div.innerHTML = item.label.replace(pattern, '<mark>$&</mark>');
      const srcs = Array.from(new Set(getActivePool().filter(function(row) {
        return row.normKey === item.key;
      }).map(function(row) {
        return row.src;
      })));
      div.innerHTML += '<span class="sug-src">' + srcs.map(getSourceLabel).join(' + ') + '</span>';
      div.addEventListener('mousedown', function() {
        document.getElementById('search-input').value = item.label;
        list.classList.remove('open');
      });
      list.appendChild(div);
    });
    list.classList.add('open');
  }

  function setPhoto(src) {
    const image = document.getElementById('k1-photo');
    const fallback = document.getElementById('k1-nophoto');
    if (src) {
      image.src = src;
      image.style.display = 'block';
      fallback.style.display = 'none';
      return;
    }
    image.style.display = 'none';
    fallback.style.display = 'block';
  }

  function fillTableBody(tbodyId, rows, showNumber, startNo) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = '';
    rows.forEach(function(item, index) {
      const percentClass = item.anlama >= 80 ? 'pbg' : (item.anlama >= 60 ? 'pby' : 'pbr');
      const scoreFlag = item.anlama >= 80 ? '⭐' : (item.anlama >= 60 ? '🔶' : '🔴');
      const reference = item.hedef || Math.max(item.wpm, 30);
      const speedClass = item.wpm >= (item.hedef || 30) ? 'spill-hi' : (item.wpm < 15 ? 'spill-lo' : 'spill-norm');
      const barWidth = Math.min(100, Math.round(item.wpm / reference * 100));
      const barColor = item.wpm >= (item.hedef || 30) ? 'var(--sage-lt)' : (item.wpm < 15 ? 'var(--rose-lt)' : 'var(--amber-lt)');
      const targetText = item.hedef ? item.hedef : '—';
      const dyText = (item.dogru === 0 && item.yanlis === 0) ? '—' : (item.dogru + 'D/' + item.yanlis + 'Y');
      const srcColor = item.src === 'new' ? 'var(--sky)' : item.src === 'old' ? 'var(--amber)' : 'var(--sage)';
      const numberCell = showNumber ? '<td style="font-size:9px;color:var(--gray-400);font-weight:700">' + ((startNo || 1) + index) + '</td>' : '';
      tbody.innerHTML += '<tr>' +
        numberCell +
        '<td title="' + escHtml(item.metin) + '">' + escHtml(item.metin.length > 22 ? item.metin.substring(0, 22) + '…' : item.metin) + '<span class="src-dot" style="background:' + srcColor + '" title="' + getSourceLabel(item.src) + '"></span></td>' +
        '<td><span class="spill ' + speedClass + '">' + item.wpm + '</span><div class="wbar-wrap"><div class="wbar" style="width:' + barWidth + '%;background:' + barColor + '"></div></div></td>' +
        '<td style="font-size:9px;color:var(--gray-400)">' + targetText + '</td>' +
        '<td style="font-size:9.5px">' + fmtSure(item.sure) + '</td>' +
        '<td style="font-weight:800;font-size:9.5px">' + dyText + '</td>' +
        '<td><span class="pbadge ' + percentClass + '">%' + item.anlama + '</span>' + scoreFlag + '</td>' +
        '<td style="font-size:9px;color:var(--gray-400)">' + fmtDateShort(item.tarih) + '</td>' +
      '</tr>';
    });
  }

  function drawCharts(uniqueRows, targetWpm) {
    if (speedChart) {
      speedChart.destroy();
    }
    if (anlamaChart) {
      anlamaChart.destroy();
    }

    const labels = uniqueRows.map(function(item) {
      return item.metin.length > 11 ? item.metin.substring(0, 11) + '…' : item.metin;
    });
    const wpms = uniqueRows.map(function(item) { return item.wpm; });
    const comprehension = uniqueRows.map(function(item) { return item.anlama; });
    const speedSets = [{
      label: 'Hiz',
      data: wpms,
      borderColor: '#b45309',
      backgroundColor: 'rgba(180,83,9,0.08)',
      fill: true,
      tension: 0.4,
      pointRadius: 4.5,
      pointBackgroundColor: '#b45309',
      pointBorderColor: 'white',
      pointBorderWidth: 1.5,
      borderWidth: 2.5
    }];
    if (targetWpm) {
      speedSets.push({
        label: 'Hedef',
        data: wpms.map(function() { return targetWpm; }),
        borderColor: 'rgba(245,158,11,0.6)',
        borderDash: [5, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false
      });
    }

    speedChart = new Chart(document.getElementById('k1-speed').getContext('2d'), {
      type: 'line',
      data: { labels: labels, datasets: speedSets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: false, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 8 }, color: '#78716c' } },
          x: { grid: { display: false }, ticks: { font: { size: 7.5 }, maxRotation: 38, minRotation: 30, color: '#78716c' } }
        }
      }
    });

    anlamaChart = new Chart(document.getElementById('k1-anlama').getContext('2d'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: comprehension,
          backgroundColor: comprehension.map(function(value) {
            return value >= 80 ? '#2d6a4f' : (value >= 60 ? '#b45309' : '#e11d48');
          }),
          borderRadius: 5,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { max: 100, beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 8 }, color: '#78716c', callback: function(value) { return value + '%'; } } },
          x: { grid: { display: false }, ticks: { font: { size: 7.5 }, maxRotation: 38, minRotation: 30, color: '#78716c' } }
        }
      }
    });
  }

  function fillKarne(data) {
    const sorted = data.slice().sort(function(a, b) {
      return (a.tarih || 0) - (b.tarih || 0);
    });
    const metinMap = {};
    sorted.forEach(function(item) {
      metinMap[item.metin.toLocaleLowerCase('tr-TR')] = item;
    });
    const uniqueRows = Object.values(metinMap);
    const wpms = uniqueRows.map(function(item) { return item.wpm; });
    const comprehensions = uniqueRows.map(function(item) { return item.anlama; });
    const avgWpm = Math.round(wpms.reduce(function(sum, value) { return sum + value; }, 0) / wpms.length);
    const maxWpm = Math.max.apply(null, wpms);
    const avgComprehension = Math.round(comprehensions.reduce(function(sum, value) { return sum + value; }, 0) / comprehensions.length);
    const firstWpm = wpms[0];
    const lastWpm = wpms[wpms.length - 1];
    const totalCorrect = uniqueRows.reduce(function(sum, item) { return sum + item.dogru; }, 0);
    const totalWrong = uniqueRows.reduce(function(sum, item) { return sum + item.yanlis; }, 0);
    const totalQuestions = totalCorrect + totalWrong;
    const totalDuration = uniqueRows.reduce(function(sum, item) { return sum + item.sure; }, 0);
    const targetWpm = data.find(function(item) { return item.hedef; })?.hedef || 0;
    const classEntry = data.find(function(item) { return item.sinif; });
    const sourceSet = Array.from(new Set(data.map(function(item) { return item.src; })));

    const page2Needed = uniqueRows.length > 15;
    document.getElementById('page1').style.display = 'block';
    document.getElementById('page2').style.display = page2Needed ? 'block' : 'none';

    const prettyStudent = prettyName(currentStudent);
    document.getElementById('k1-sub').textContent = classEntry
      ? classEntry.sinif + '. Sinif · ' + (classEntry.sube ? classEntry.sube + ' Subesi · ' : '') + '2025–2026 Ogretim Yili'
      : '2025–2026 Ogretim Yili · Kemal Ogretmen';
    document.getElementById('k1-name').textContent = prettyStudent;
    document.getElementById('k1-metin-tag').textContent = uniqueRows.length + ' Metin';
    document.getElementById('k1-merged-tag').style.display = sourceSet.length > 1 ? 'block' : 'none';
    document.getElementById('k1-sinif').textContent = classEntry
      ? ('📚 ' + classEntry.sinif + (classEntry.sube ? '-' + classEntry.sube : ''))
      : ('📚 ' + uniqueRows.length + ' Metin');

    const dates = sorted.map(function(item) { return item.tarih; }).filter(Boolean);
    if (dates.length) {
      const minDate = new Date(Math.min.apply(null, dates));
      const maxDate = new Date(Math.max.apply(null, dates));
      document.getElementById('k1-tarih').textContent = '📅 ' + fmtDate(minDate) + '–' + fmtDate(maxDate);
    } else {
      document.getElementById('k1-tarih').textContent = '📅 —';
    }
    document.getElementById('k1-sure').textContent = '⏱️ ' + fmtSure(totalDuration);

    document.getElementById('k1-avghiz').textContent = avgWpm + ' wpm';
    document.getElementById('k1-maxhiz').textContent = maxWpm + ' wpm';
    document.getElementById('k1-avganlama').textContent = '%' + avgComprehension;
    document.getElementById('k1-doran').textContent = '%' + (totalQuestions > 0 ? Math.round(totalCorrect / totalQuestions * 100) : 0);

    const speedDiff = lastWpm - firstWpm;
    document.getElementById('k1-hizgel').textContent = (speedDiff >= 0 ? '+' : '') + speedDiff + ' wpm';
    document.getElementById('k1-hizgel-sub').textContent = firstWpm + ' → ' + lastWpm + ' kelime/dk';
    document.getElementById('k1-hizbar').style.width = Math.min(100, Math.round(avgWpm / (targetWpm || Math.max(avgWpm, 40)) * 100)) + '%';
    document.getElementById('k1-anlamagel').textContent = '%' + avgComprehension;
    document.getElementById('k1-anlamabar').style.width = avgComprehension + '%';
    document.getElementById('k1-metingel').textContent = uniqueRows.length;
    document.getElementById('k1-metingel-sub').textContent = targetWpm ? ('Hedef: ' + targetWpm + ' wpm') : 'adet tamamlandi';
    document.getElementById('k1-metinbar').style.width = Math.min(100, uniqueRows.length / 20 * 100) + '%';
    document.getElementById('k1-moti').textContent = MOTI[Math.floor(Math.random() * MOTI.length)];
    document.getElementById('k1-sayfa-bilgi').textContent = page2Needed ? 'Sayfa 1 / 2' : 'Sayfa 1 / 1';

    drawCharts(uniqueRows, targetWpm);
    fillTableBody('k1-tbody', uniqueRows.slice(0, 15), false, 1);

    if (page2Needed) {
      const parts = prettyStudent.split(' ');
      const lastName = parts[parts.length - 1] || '';
      const firstNames = parts.slice(0, -1).join(' ') || lastName;
      document.getElementById('k2-name').innerHTML = escHtml(firstNames) + ' <span>' + escHtml(lastName) + '</span>';
      document.getElementById('k2-toplam').textContent = uniqueRows.length;
      document.getElementById('k2-avgwpm').textContent = avgWpm + ' wpm';
      document.getElementById('k2-avganlama').textContent = '%' + avgComprehension;
      fillTableBody('k2-tbody', uniqueRows.slice(15), true, 16);

      const maxComprehensionRow = uniqueRows.reduce(function(best, item) {
        return !best || item.anlama >= best.anlama ? item : best;
      }, null);
      const maxSpeedRow = uniqueRows.reduce(function(best, item) {
        return !best || item.wpm >= best.wpm ? item : best;
      }, null);
      document.getElementById('k2-en-hizli-metin').textContent = maxSpeedRow ? (maxSpeedRow.metin.length > 18 ? maxSpeedRow.metin.substring(0, 18) + '…' : maxSpeedRow.metin) : '—';
      document.getElementById('k2-en-yuksek-anlama').textContent = maxComprehensionRow ? ('%' + maxComprehensionRow.anlama) : '—';
      document.getElementById('k2-toplam-sure').textContent = fmtSure(totalDuration);
      document.getElementById('k2-toplam-dogru').textContent = totalCorrect + ' dogru';
      document.getElementById('k2-toplam-yanlis').textContent = totalWrong + ' yanlis';

      const successful = uniqueRows.filter(function(item) { return item.anlama >= 80; }).length;
      const medium = uniqueRows.filter(function(item) { return item.anlama >= 60 && item.anlama < 80; }).length;
      const low = uniqueRows.filter(function(item) { return item.anlama < 60; }).length;
      const hitTarget = targetWpm ? uniqueRows.filter(function(item) { return item.wpm >= targetWpm; }).length : 0;
      document.getElementById('k2-basarili').textContent = successful + ' metin';
      document.getElementById('k2-orta').textContent = medium + ' metin';
      document.getElementById('k2-dusuk').textContent = low + ' metin';
      document.getElementById('k2-hedefe').textContent = targetWpm ? (hitTarget + ' / ' + uniqueRows.length) : '—';
      document.getElementById('k2-genel-durum').textContent =
        avgComprehension >= 80 ? '🏆 Mukemmel' :
        avgComprehension >= 65 ? '👍 Iyi' :
        '📈 Gelisiyor';
    }
  }

  function buildKarne() {
    const query = normName(document.getElementById('search-input').value);
    if (!query) {
      setStatus('⚠️ Ogrenci adini girin.', 'err');
      return;
    }
    if (!allData.length) {
      setStatus('⚠️ Once Excel veya veritabani verisi yukleyin.', 'err');
      return;
    }
    let data = getActivePool().filter(function(item) {
      return item.normKey === query;
    });
    if (!data.length) {
      data = getActivePool().filter(function(item) {
        return item.normKey.includes(query);
      });
    }
    if (!data.length) {
      setStatus('❌ "' + document.getElementById('search-input').value + '" icin kayit bulunamadi.', 'err');
      return;
    }
    currentStudent = data[0].fullName;
    fillKarne(data);
    ['btn-pdf', 'btn-jpg', 'btn-png'].forEach(function(id) {
      document.getElementById(id).disabled = false;
    });
    setStatus('✅ "' + prettyName(currentStudent) + '" icin karne olusturuldu.', 'ok');
    window.scrollTo({ top: document.getElementById('karne-stack').offsetTop - 20, behavior: 'smooth' });
  }

  async function capturePage(id) {
    const element = document.getElementById(id);
    return html2canvas(element, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    });
  }

  async function downloadPDF() {
    setStatus('⏳ PDF hazirlaniyor...');
    const jsPDF = window.jspdf && window.jspdf.jsPDF ? window.jspdf.jsPDF : null;
    if (!jsPDF) {
      setStatus('❌ PDF kutuphanesi yuklenemedi.', 'err');
      return;
    }
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const canvas1 = await capturePage('page1');
    pdf.addImage(canvas1.toDataURL('image/jpeg', 1.0), 'JPEG', 0, 0, 210, 297);
    if (document.getElementById('page2').style.display !== 'none') {
      pdf.addPage();
      const canvas2 = await capturePage('page2');
      pdf.addImage(canvas2.toDataURL('image/jpeg', 1.0), 'JPEG', 0, 0, 210, 297);
    }
    pdf.save(safeName() + '_OkumaKarnesi.pdf');
    setStatus('✅ PDF indirildi!', 'ok');
  }

  async function downloadJPEG() {
    setStatus('⏳ JPEG hazirlaniyor...');
    const canvas1 = await capturePage('page1');
    dl(canvas1, 'image/jpeg', safeName() + '_s1.jpg', 0.96);
    if (document.getElementById('page2').style.display !== 'none') {
      const canvas2 = await capturePage('page2');
      dl(canvas2, 'image/jpeg', safeName() + '_s2.jpg', 0.96);
    }
    setStatus('✅ JPEG indirildi!', 'ok');
  }

  async function downloadPNG() {
    setStatus('⏳ PNG hazirlaniyor...');
    const canvas1 = await capturePage('page1');
    dl(canvas1, 'image/png', safeName() + '_s1.png');
    if (document.getElementById('page2').style.display !== 'none') {
      const canvas2 = await capturePage('page2');
      dl(canvas2, 'image/png', safeName() + '_s2.png');
    }
    setStatus('✅ PNG indirildi!', 'ok');
  }

  function maybeAutoSelect() {
    if (autoSelectionDone) {
      return;
    }
    const pending = getPendingSelection();
    if (!pending) {
      return;
    }
    const fullName = str(pending.fullName || ((pending.ad || '') + ' ' + (pending.soyad || '')).trim());
    if (!fullName) {
      clearPendingSelection();
      return;
    }
    document.getElementById('search-input').value = prettyName(fullName);
    if (pending.sinif) {
      const key = pending.sube ? (pending.sinif + '-' + pending.sube) : String(pending.sinif);
      document.getElementById('class-filter').value = key;
    }
    autoSelectionDone = true;
    clearPendingSelection();
    buildKarne();
  }

  async function doLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPass').value;
    const errorEl = document.getElementById('loginErr');

    if (!email || !password) {
      errorEl.style.display = 'block';
      errorEl.textContent = '❌ E-posta ve sifre zorunlu.';
      return;
    }

    try {
      await window.kemalAdminAuth.signIn(email, password);
      errorEl.style.display = 'none';
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      await loadDatabaseRecords(true);
      maybeAutoSelect();
    } catch (error) {
      errorEl.style.display = 'block';
      errorEl.textContent = '❌ ' + window.kemalAdminAuth.humanizeError(error);
      document.getElementById('loginPass').value = '';
    }
  }

  async function doLogout() {
    try {
      await window.kemalAdminAuth.signOut();
    } finally {
      window.location.reload();
    }
  }

  async function initAuth() {
    seedPendingSelection();
    rebuildUI();
    updateMergeBadge();
    try {
      const session = await window.kemalAdminAuth.getSession();
      if (session) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        await loadDatabaseRecords(true);
        maybeAutoSelect();
        return;
      }
    } catch (error) {
      console.warn('Oturum okunamadi:', error);
    }
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  }

  document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('file-new').addEventListener('change', function(event) {
      readFiles(event.target.files, 'new');
    });
    document.getElementById('file-old').addEventListener('change', function(event) {
      readFiles(event.target.files, 'old');
    });
    document.getElementById('photo-input').addEventListener('change', function(event) {
      const file = event.target.files[0];
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = function(loadEvent) {
        document.getElementById('photo-preview').src = loadEvent.target.result;
        document.getElementById('photo-preview').style.display = 'block';
        document.getElementById('photo-label').textContent = '✅ Fotograf secildi';
        setPhoto(loadEvent.target.result);
      };
      reader.readAsDataURL(file);
    });
    document.getElementById('search-input').addEventListener('input', showSuggestions);
    document.getElementById('search-input').addEventListener('blur', function() {
      setTimeout(function() {
        document.getElementById('sug-list').classList.remove('open');
      }, 150);
    });
    document.getElementById('class-filter').addEventListener('change', function() {
      rebuildUI();
      showSuggestions();
    });
    document.getElementById('loginEmail').addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
        doLogin();
      }
    });
    document.getElementById('loginPass').addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
        doLogin();
      }
    });
    initAuth();
  });

  window.doLogin = doLogin;
  window.doLogout = doLogout;
  window.veritabaniYukle = function() {
    loadDatabaseRecords(false);
  };
  window.buildKarne = buildKarne;
  window.downloadPDF = downloadPDF;
  window.downloadJPEG = downloadJPEG;
  window.downloadPNG = downloadPNG;
})();
