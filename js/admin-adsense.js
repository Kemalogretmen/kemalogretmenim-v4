(function() {
  'use strict';

  const table = 'site_adsense_settings';
  const columns = 'enabled,publisher_id,slot_id,article_ids,placements,revision';
  const field = id => document.getElementById('adsense' + id);
  const form = field('Form');
  const placements = Array.from(form.querySelectorAll('[name="adsensePlacement"]'));
  let client;
  let settings;
  let busy = false;

  function parseArticleIds(value) {
    const ids = new Set();
    for (const line of value.split(/\n/).map(line => line.trim()).filter(Boolean)) {
      let id = line;
      if (line.includes('?')) {
        const url = new URL(line, 'https://kemalogretmenim.com.tr');
        if (!['https://kemalogretmenim.com.tr', 'https://www.kemalogretmenim.com.tr'].includes(url.origin) || !['/makale', '/makale.html'].includes(url.pathname)) {
          throw new Error('Yalnızca sitedeki makale bağlantılarını ekle.');
        }
        id = url.searchParams.get('id') || '';
      }
      if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) {
        throw new Error('Her satıra geçerli bir makale bağlantısı veya kimliği gir.');
      }
      ids.add(id.toLowerCase());
    }
    return [...ids];
  }

  function updateControls() {
    const ready = settings?.publisher_id && settings?.slot_id && (settings.placements.length || settings.article_ids.length);
    field('Fields').disabled = busy || !settings;
    field('Enable').disabled = busy || !ready || settings.enabled;
    field('Disable').disabled = busy || !settings;
  }

  async function run(query) {
    if (busy) return;
    busy = true;
    updateControls();
    field('Status').textContent = 'Reklam ayarı kontrol ediliyor…';
    try {
      const result = await query();
      if (result.error) throw result.error;
      settings = result.data;
      field('Publisher').value = settings.publisher_id;
      field('Slot').value = settings.slot_id;
      field('Articles').value = settings.article_ids.map(id => '/makale.html?id=' + id).join('\n');
      placements.forEach(input => { input.checked = settings.placements.includes(input.value); });
      field('Status').textContent = settings.enabled
        ? 'Reklam yayını açık. Seçili alanlarda izin veren ziyaretçilere reklam istenir.'
        : 'Reklam yayını kapalı.';
    } catch (error) {
      field('Status').textContent = error?.code === 'PGRST116'
        ? 'Ayar başka bir oturumda değişmiş olabilir. Google Reklamları bölümünü yeniden aç.'
        : 'Reklam ayarı okunamadı veya kaydedilemedi. Ana yönetici yetkisini ve Supabase kurulumunu kontrol et.';
    } finally {
      busy = false;
      updateControls();
    }
  }

  function save(values, requireCurrent) {
    return run(() => {
      let query = client.from(table).update({ ...values, revision: crypto.randomUUID() }).eq('id', 1);
      if (requireCurrent) query = query.eq('revision', settings.revision);
      return query.select(columns).single();
    });
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!settings || busy) return;
    try {
      const publisherId = field('Publisher').value.trim().replace(/^pub-/, 'ca-pub-');
      const slotId = field('Slot').value.trim();
      if (publisherId && !/^ca-pub-[0-9]{16}$/.test(publisherId)) throw new Error('Geçerli bir AdSense yayıncı kimliği gir.');
      if (slotId && !/^[0-9]{1,20}$/.test(slotId)) throw new Error('Reklam birimi kimliği yalnızca rakamlardan oluşmalı.');
      save({
        publisher_id: publisherId,
        slot_id: slotId,
        article_ids: parseArticleIds(field('Articles').value),
        placements: placements.filter(input => input.checked).map(input => input.value),
        enabled: false,
      }, true);
    } catch (error) {
      field('Status').textContent = error.message;
    }
  });
  field('Enable').addEventListener('click', () => save({ enabled: true }, true));
  field('Disable').addEventListener('click', () => save({ enabled: false }, false));

  window.KemalAdminAdSense = {
    open(adminClient) {
      client = adminClient;
      return run(() => client.from(table).select(columns).eq('id', 1).single());
    },
  };
})();
