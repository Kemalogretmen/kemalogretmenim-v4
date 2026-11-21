(function(root) {
  'use strict';

  const table = 'reading_academy_activities';
  const levels = { temel: '1–2. sınıf', akici: '3–4. sınıf', anlama: '5–8. sınıf' };
  const categories = { decoding: 'Hece ve kelime', attention: 'Dikkat ve görsel takip', fluency: 'Akıcılık ve tempo', comprehension: 'Anlama ve yorumlama' };
  const types = { quiz: 'Çoktan seçmeli', repeat: 'İki okumalı çalışma', writing: 'Yazılı öz değerlendirme' };
  const categoryIcons = { decoding: 'puzzle', attention: 'search', fluency: 'timer', comprehension: 'clipboard' };
  const columns = 'id,level_key,category,activity_type,title,skill,body,is_published,updated_at';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function required(value, limit, message) {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text || text.length > limit) throw new Error(message);
    return text;
  }

  function normalize(row) {
    if (!Object.hasOwn(levels, row.level_key) || !Object.hasOwn(categories, row.category) || !Object.hasOwn(types, row.activity_type)) {
      throw new Error('Sınıf, çalışma alanı ve tür seçin.');
    }
    const body = row.body || {};
    const title = required(row.title, 120, 'Çalışma adı zorunlu (en çok 120 karakter).');
    const skill = required(row.skill, 100, 'Kazanım zorunlu (en çok 100 karakter).');
    const normalized = { task: required(body.task, 500, 'Öğrenci yönergesi zorunlu (en çok 500 karakter).') };
    if (body.passage?.paragraphs?.length) {
      if (!Array.isArray(body.passage.paragraphs) || body.passage.paragraphs.length > 20) throw new Error('En fazla 20 paragraf ekleyin.');
      normalized.passage = {
        title: required(body.passage.title || title, 120, 'Metin başlığı çok uzun.'),
        paragraphs: body.passage.paragraphs.map(p => required(p, 1800, 'Paragraflar en çok 1800 karakter olabilir.')),
      };
    }
    if (row.activity_type !== 'quiz' && !normalized.passage) throw new Error('Bu çalışma türünde okuma metni zorunlu.');
    if (row.activity_type === 'repeat') normalized.secondTask = required(body.secondTask, 500, 'İkinci okuma yönergesini ekleyin.');
    if (row.activity_type === 'writing') {
      normalized.sample = required(body.sample, 1800, 'Örnek yanıtı ekleyin (en çok 1800 karakter).');
      if (!Array.isArray(body.criteria) || !body.criteria.length || body.criteria.length > 6) throw new Error('1–6 kontrol maddesi ekleyin.');
      normalized.criteria = body.criteria.map(item => required(item, 180, 'Kontrol maddeleri en çok 180 karakter olabilir.'));
    } else {
      if (!Array.isArray(body.questions) || !body.questions.length || body.questions.length > 12) throw new Error('1–12 soru ekleyin.');
      normalized.questions = body.questions.map((item, index) => {
        const label = (index + 1) + '. soru: ';
        if (!Array.isArray(item.options) || item.options.length < 2 || item.options.length > 4) throw new Error(label + '2–4 seçenek ekleyin.');
        const options = item.options.map(option => required(option, 240, label + 'seçenekler boş olamaz.'));
        if (new Set(options).size !== options.length) throw new Error(label + 'seçenekler farklı olmalı.');
        if (!Number.isInteger(item.correct) || item.correct < 0 || item.correct >= options.length) throw new Error(label + 'doğru seçeneği belirleyin.');
        return {
          prompt: required(item.prompt, 450, label + 'soru metnini yazın.'),
          options, correct: item.correct,
          explanation: item.explanation?.trim() ? required(item.explanation, 500, label + 'yanıt açıklaması en fazla 500 karakter olabilir.') : '',
        };
      });
    }
    return { title, skill, category: row.category, level_key: row.level_key, activity_type: row.activity_type, body: normalized };
  }

  function toActivity(row) {
    if (!/^[a-f0-9-]{36}$/i.test(row.id || '')) return null;
    try {
      const clean = normalize(row);
      return { id: 'academy-' + row.id, levelKey: clean.level_key, title: clean.title, skill: clean.skill,
        category: clean.category, icon: categoryIcons[clean.category], repeat: clean.activity_type === 'repeat', ...clean.body };
    } catch (_) { return null; }
  }

  async function loadPublished(config, request = fetch) {
    const url = new URL('/rest/v1/' + table, config.supabaseUrl);
    url.search = new URLSearchParams({ select: columns, is_published: 'eq.true', order: 'updated_at.desc,id.asc', limit: '200' });
    const response = await request(url, { headers: { apikey: config.supabaseAnonKey }, cache: 'no-store', signal: AbortSignal.timeout(6000) });
    if (!response.ok) throw new Error('Yayınlanan çalışmalar yüklenemedi.');
    return (await response.json()).filter(row => row.is_published === true).map(toActivity).filter(Boolean);
  }

  const api = { table, columns, levels, categories, types, escapeHtml, normalize, toActivity, loadPublished };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ReadingAcademyContent = api;
})(globalThis);
