(function () {
  'use strict';

  const layout = window.KemalExamWorkspace;
  let scriptPromise;
  let workerPromise;
  let scanQueue = Promise.resolve();

  function getWorker() {
    if (!scriptPromise) {
      scriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';
        script.onload = resolve;
        script.onerror = () => {
          script.remove();
          reject(new Error('OCR kütüphanesi yüklenemedi.'));
        };
        document.head.append(script);
      }).catch(error => {
        scriptPromise = null;
        throw error;
      });
    }
    if (!workerPromise) {
      workerPromise = scriptPromise.then(() => window.Tesseract.createWorker(['tur', 'eng'], 1, {
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js'
      })).catch(error => {
        workerPromise = null;
        throw error;
      });
    }
    return workerPromise;
  }

  function scanImage(image, count, isCurrent) {
    const run = scanQueue.then(async () => {
      if (!isCurrent()) return {};
      await image.decode();
      const worker = await getWorker();
      if (!isCurrent()) return {};
      await worker.setParameters({ tessedit_pageseg_mode: '11' });
      const { data } = await worker.recognize(image.currentSrc || image.src, {}, { blocks: true });
      return layout.detectOptions(data.blocks, image.naturalWidth, image.naturalHeight, count);
    });
    scanQueue = run.catch(() => {});
    return run;
  }

  function mount(host, { source, count, initial, auto = false, onBusy = () => {} }) {
    const letters = 'ABCDEF'.slice(0, count).split('');
    const positions = layout.normalizeOptions(initial, count);
    let active = letters.find(letter => !positions[letter]) || letters[0];
    let dragging = null;
    let scanVersion = 0;
    host.innerHTML = `
      <div class="exam-layout-tools">
        <div class="exam-layout-letters" role="group" aria-label="Yerleştirilecek şık"></div>
        <button type="button" class="btn btn-sm btn-outline" data-detect>Şıkları algıla</button>
        <button type="button" class="btn btn-sm btn-outline" data-remove>Konumu sil</button>
        <button type="button" class="btn btn-sm btn-outline" data-skip hidden>Taramayı geç</button>
      </div>
      <p class="text-xs text-muted" data-status role="status">Şıkkı seçip görseldeki harfe dokunun. Konumu sürükleyerek veya ok tuşlarıyla düzeltebilirsiniz.</p>
      <div class="exam-layout-stage">
        <img alt="Yerleştirme için soru görseli" draggable="false">
        <div class="exam-layout-points"></div>
      </div>`;
    const image = host.querySelector('img');
    image.src = source;
    const stage = host.querySelector('.exam-layout-stage');
    const points = host.querySelector('.exam-layout-points');
    const status = host.querySelector('[data-status]');
    const scan = host.querySelector('[data-detect]');
    const remove = host.querySelector('[data-remove]');
    const skip = host.querySelector('[data-skip]');
    const letterButtons = letters.map(letter => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = letter;
      button.addEventListener('click', () => { active = letter; update(); });
      return button;
    });
    host.querySelector('.exam-layout-letters').append(...letterButtons);

    function update() {
      letters.forEach((letter, index) => {
        const point = positions[letter];
        const button = letterButtons[index];
        button.setAttribute('aria-pressed', String(active === letter));
        button.setAttribute('aria-label', `${letter} şıkkı${point ? ', konumu var' : ', konumu yok'}`);
        const marker = points.children[index];
        marker.hidden = !point;
        if (point) {
          marker.style.left = `${point.x * 100}%`;
          marker.style.top = `${point.y * 100}%`;
        }
      });
      remove.disabled = !positions[active];
    }

    for (const letter of letters) {
      const marker = document.createElement('button');
      marker.type = 'button';
      marker.className = 'exam-layout-marker';
      marker.textContent = letter;
      marker.setAttribute('aria-label', `${letter} işaretçisi. Ok tuşlarıyla taşı.`);
      marker.addEventListener('pointerdown', () => { active = letter; update(); });
      marker.addEventListener('keydown', event => {
        const steps = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
        const step = steps[event.key];
        if (!step) return;
        event.preventDefault();
        scanVersion++;
        const point = positions[letter];
        const amount = event.shiftKey ? .02 : .005;
        positions[letter] = {
          x: Math.max(0, Math.min(1, point.x + step[0] * amount)),
          y: Math.max(0, Math.min(1, point.y + step[1] * amount))
        };
        update();
      });
      points.append(marker);
    }

    function place(event) {
      const bounds = stage.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      positions[active] = {
        x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
        y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height))
      };
      update();
    }

    stage.addEventListener('pointerdown', event => {
      if (event.button !== 0 || dragging !== null || !image.naturalWidth) return;
      scanVersion++;
      dragging = event.pointerId;
      stage.setPointerCapture?.(dragging);
      if (event.target === image) place(event);
    });
    stage.addEventListener('pointermove', event => {
      if (dragging === event.pointerId) place(event);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      stage.addEventListener(type, event => {
        if (dragging === event.pointerId) dragging = null;
      });
    }
    remove.addEventListener('click', () => {
      scanVersion++;
      delete positions[active];
      update();
    });
    function unlock() {
      skip.hidden = true;
      onBusy(false);
    }
    skip.addEventListener('click', () => {
      scanVersion++;
      status.textContent = 'Tarama geçildi. Harfleri görselden elle yerleştirebilirsiniz.';
      unlock();
    });
    scan.addEventListener('click', async () => {
      const version = ++scanVersion;
      const isCurrent = () => host.isConnected && version === scanVersion;
      scan.disabled = true;
      skip.hidden = false;
      onBusy(true);
      status.textContent = 'Şık harfleri taranıyor…';
      try {
        const suggestions = await scanImage(image, count, isCurrent);
        if (!host.isConnected) return;
        if (!isCurrent()) {
          status.textContent = 'Elle yaptığınız yerleştirmeler korundu.';
          return;
        }
        for (const [letter, point] of Object.entries(suggestions)) {
          if (!positions[letter]) positions[letter] = point;
        }
        const total = Object.keys(positions).length;
        status.textContent = total
          ? `${total}/${count} konum hazır. İşaretçileri kontrol edip gerekirse taşıyın.`
          : 'Belirgin şık harfi bulunamadı. Harflerin yerini görselden seçebilirsiniz.';
        update();
      } catch (error) {
        if (host.isConnected) status.textContent = 'Otomatik algılama tamamlanamadı. Şıkları görselden elle yerleştirebilirsiniz.';
      } finally {
        scan.disabled = false;
        unlock();
      }
    });
    update();
    if (auto) scan.click();
    return () => layout.normalizeOptions(positions, count);
  }

  window.KemalExamOptionEditor = { mount };
})();
