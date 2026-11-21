(function(root) {
  'use strict';
  const byId = id => document.getElementById(id);
  const number = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });
  const formats = { pdf: ['application/pdf', 'pdf'], jpeg: ['image/jpeg', 'jpg'], png: ['image/png', 'png'] };
  const loaders = new Map();

  function dateValue(value) { return Date.parse(value || '') || 0; }

  function previousAttempts(records, userId, current) {
    if (!userId || !dateValue(current.date)) return [];
    const seen = new Map();
    for (const row of records) {
      const meta = row.meta || row.detail_json?.meta;
      if (!meta || meta.accountUid !== userId || (row.user_id && row.user_id !== userId) ||
          (row.type || row.content_type) !== 'reading' || row.status !== 'completed') continue;
      const past = Array.isArray(meta.readingAttempts) ? meta.readingAttempts : [];
      const latest = {
        id: meta.attemptId, mode: meta.readingFlow, date: meta.readingResult?.tarih || row.updatedAt || row.completed_at || row.updated_at,
        speed: meta.wpm, comprehension: Number(meta.total || meta.readingResult?.toplam_soru) > 0 ? meta.comprehensionPercent : null,
      };
      for (const item of [...past, latest]) {
        if (!item || !item.id || item.id === current.id || !dateValue(item.date) || dateValue(item.date) >= dateValue(current.date)) continue;
        if (seen.has(item.id) && dateValue(seen.get(item.id).date) >= dateValue(item.date)) continue;
        seen.set(item.id, { ...item, title: String(row.title || 'Okuma metni') });
      }
    }
    return [...seen.values()].sort((a, b) => dateValue(b.date) - dateValue(a.date)).slice(0, 4);
  }

  function speedValue(item) {
    return item.mode !== 'kelime-otomatik' && Number.isFinite(item.speed) && item.speed > 0 ? item.speed : null;
  }

  function comprehensionValue(item) {
    return Number.isFinite(item.comprehension) && item.comprehension >= 0 && item.comprehension <= 100 ? item.comprehension : null;
  }

  function renderHistory(past, current) {
    if (!past.length) return;
    const chart = byId('karneHistoryChart');
    chart.replaceChildren();
    const list = document.createElement('ol');
    list.className = 'rk-history-list';
    const range = Math.max(1, ...[current, ...past].map(item => speedValue(item) || 0));
    [current, ...past].forEach((item, index) => {
      const entry = document.createElement('li');
      const title = document.createElement('strong');
      title.textContent = (index === 0 ? 'Bu okuma · ' : new Date(item.date).toLocaleDateString('tr-TR') + ' · ') + item.title;
      const measures = document.createElement('div');
      measures.className = 'rk-history-measures';
      [[speedValue(item), range, ' k/dk', item.mode === 'kelime-otomatik' ? 'Otomatik akış' : 'Hız verisi yok'],
        [comprehensionValue(item), 100, '% anlama', 'Anlama verisi yok']].forEach(([value, max, suffix, none]) => {
        const cell = document.createElement('div');
        const text = document.createElement('span');
        text.textContent = value === null ? none : number.format(value) + suffix;
        cell.append(text);
        if (value !== null) {
          const bar = document.createElement('i');
          bar.style.width = (value / max * 100) + '%';
          bar.setAttribute('aria-hidden', 'true');
          cell.append(bar);
        }
        measures.append(cell);
      });
      entry.append(title, measures);
      list.append(entry);
    });
    chart.append(list);
    const average = (get, unit) => {
      const previous = past.map(get).filter(value => value !== null);
      const value = get(current);
      if (!previous.length || value === null) return '';
      const mean = previous.reduce((a, b) => a + b, 0) / previous.length;
      const delta = Math.round(value - mean);
      return (delta > 0 ? '+' : '') + delta + ' ' + unit;
    };
    const changes = [average(speedValue, 'k/dk'), average(comprehensionValue, 'yüzde puan anlama')].filter(Boolean);
    byId('karneHistorySummary').textContent = past.length + ' önceki okuma' + (changes.length ? ' · Önceki ortalamaya göre ' + changes.join(' ve ') : '');
    byId('karneHistory').hidden = false;
  }

  function loadScript(path) {
    if (!loaders.has(path)) {
      loaders.set(path, new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = path;
        script.onload = resolve;
        script.onerror = () => { loaders.delete(path); script.remove(); reject(new Error('Dosya aracı yüklenemedi.')); };
        document.head.append(script);
      }));
    }
    return loaders.get(path);
  }

  async function capture() {
    if (!root.html2canvas) await loadScript('/ogretmen-ajandasi/vendor/html2canvas.min.js');
    await document.fonts?.ready;
    const sheet = byId('karneKart');
    const height = Math.max(1, sheet.scrollHeight);
    const scale = Math.min(2, Math.sqrt(12000000 / (sheet.clientWidth * height)));
    const cuts = [];
    const canvas = await root.html2canvas(sheet, {
      scale, backgroundColor: '#ffffff', logging: false,
      onclone: (_doc, clone) => {
        const top = clone.getBoundingClientRect().top;
        clone.querySelectorAll('[data-report-block]').forEach(node => {
          if (node.getClientRects().length) cuts.push(Math.round((node.getBoundingClientRect().top - top) * scale));
        });
      },
    });
    return { canvas, cuts };
  }

  function pageCuts(height, max, boundaries) {
    const stops = [];
    let start = 0;
    while (start < height) {
      const cap = Math.min(height, start + max);
      const cut = cap < height
        ? boundaries.filter(edge => edge >= start + max * 0.5 && edge <= cap).sort((a, b) => b - a)[0] || cap
        : height;
      stops.push(cut);
      start = cut;
    }
    return stops;
  }

  async function makeFile(format) {
    const [mime, extension] = formats[format];
    const { canvas, cuts } = await capture();
    const name = 'okuma-karnesi.' + extension;
    if (format !== 'pdf') {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, mime, .94));
      if (!blob) throw new Error('Görsel oluşturulamadı.');
      return new File([blob], name, { type: mime });
    }
    if (!root.jspdf?.jsPDF) await loadScript('/ogretmen-ajandasi/vendor/jspdf.umd.min.js');
    const pdf = new root.jspdf.jsPDF('p', 'mm', 'a4');
    const width = 190;
    const factor = width / canvas.width;
    let start = 0;
    pageCuts(canvas.height, Math.max(1, Math.floor(277 / factor)), cuts).forEach((end, index) => {
      const strip = document.createElement('canvas');
      strip.width = canvas.width;
      strip.height = end - start;
      strip.getContext('2d').drawImage(canvas, 0, start, canvas.width, strip.height, 0, 0, strip.width, strip.height);
      if (index !== 0) pdf.addPage();
      pdf.addImage(strip.toDataURL('image/jpeg', .92), 'JPEG', 10, 10, width, strip.height * factor);
      start = end;
    });
    return new File([pdf.output('blob')], name, { type: mime });
  }

  function bindShare(summary) {
    const dialog = byId('karneShareDialog');
    const native = byId('karneNativeShare');
    const pdfButton = byId('karnePdfShare');
    const status = byId('karneShareStatus');
    let pdfFile;
    const encoded = encodeURIComponent(summary);
    byId('karneShareSummary').textContent = summary;
    byId('karneEmail').href = 'mailto:?subject=' + encodeURIComponent('Okuma Karnesi') + '&body=' + encoded;
    byId('karneWhatsapp').href = 'https://wa.me/?text=' + encoded;
    native.hidden = typeof navigator.share !== 'function';
    const pdfSample = new File(['%PDF-'], 'okuma-karnesi.pdf', { type: 'application/pdf' });
    pdfButton.hidden = native.hidden || !navigator.canShare?.({ files: [pdfSample] });
    byId('karnePdfPrivacy').hidden = pdfButton.hidden;
    byId('karneShare').addEventListener('click', () => { status.textContent = ''; dialog.showModal(); });
    native.addEventListener('click', async () => {
      try { await navigator.share({ title: 'Okuma Karnesi', text: summary }); }
      catch (error) {
        if (error.name !== 'AbortError') status.textContent = 'Paylaşım menüsü açılamadı. WhatsApp, e-posta veya kopyalamayı kullanabilirsin.';
      }
    });
    pdfButton.addEventListener('click', async () => {
      try {
        if (pdfFile) {
          await navigator.share({ title: 'Okuma Karnesi', files: [pdfFile] });
          return;
        }
        // Prepare first, then use a fresh user gesture to open the native share sheet.
        pdfButton.disabled = true;
        status.textContent = 'PDF hazırlanıyor…';
        pdfFile = await makeFile('pdf');
        pdfButton.textContent = 'PDF’yi paylaş';
        status.textContent = 'PDF hazır. Paylaşmak için düğmeye dokun.';
      } catch (error) {
        if (error.name !== 'AbortError') status.textContent = 'PDF paylaşılamadı. Karneden indirip dosya olarak gönderebilirsin.';
      } finally { pdfButton.disabled = false; }
    });
    byId('karneCopy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(summary); status.textContent = 'Özet kopyalandı.'; }
      catch (_) { status.textContent = 'Özeti yukarıdan seçip kopyalayabilirsin.'; }
    });
  }

  function bindExport() {
    const buttons = [...document.querySelectorAll('[data-format]')];
    buttons.forEach(button => button.addEventListener('click', async () => {
      const status = byId('karneExportStatus');
      buttons.forEach(item => { item.disabled = true; });
      status.textContent = 'Karne hazırlanıyor…';
      try {
        const file = await makeFile(button.dataset.format);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(file);
        link.download = file.name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 10000);
        status.textContent = 'Karne indirildi.';
      } catch (_) {
        status.textContent = 'Karne indirilemedi. Tekrar deneyebilirsin.';
      } finally { buttons.forEach(item => { item.disabled = false; }); }
    }));
  }

  const api = { previousAttempts, pageCuts, renderHistory, bindShare, bindExport };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ReadingReportTools = api;
})(globalThis);
