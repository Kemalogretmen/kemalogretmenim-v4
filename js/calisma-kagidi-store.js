(function() {
  'use strict';

  function ensureDocumentStore() {
    if (!window.kemalDocumentStore) {
      throw new Error('kemalDocumentStore bulunamadi.');
    }
    return window.kemalDocumentStore;
  }

  function getPublicClient() {
    return ensureDocumentStore().getPublicClient();
  }

  function parseObject(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value;
    }
    if (typeof value === 'string') {
      try {
        var parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      } catch (error) {
        return {};
      }
    }
    return {};
  }

  function clampNumber(value, min, max, fallback) {
    var numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      numeric = fallback;
    }
    if (Number.isFinite(min)) {
      numeric = Math.max(min, numeric);
    }
    if (Number.isFinite(max)) {
      numeric = Math.min(max, numeric);
    }
    return numeric;
  }

  function normalizeFieldType(value) {
    var raw = String(value || '').trim().toLowerCase();
    if (raw === 'tek-seçim') {
      return 'tek-secim';
    }
    if (raw === 'çoklu-işaretleme' || raw === 'coklu-isaretleme' || raw === 'tik-koy' || raw === 'tik koy') {
      return 'coklu-secim';
    }
    if (raw === 'doğru-yanlış' || raw === 'dogru yanlis') {
      return 'dogru-yanlis';
    }
    if (raw === 'eşleştirme') {
      return 'eslestirme';
    }
    if (['dogru-yanlis', 'tek-secim', 'coklu-secim', 'eslestirme'].includes(raw)) {
      return raw;
    }
    return 'tek-secim';
  }

  function createId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return (prefix || 'id') + '_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
  }

  function normalizeFieldRecord(field, index) {
    var type = normalizeFieldType(field.alan_tipi || field.type);
    var settings = parseObject(field.ayar_json || field.settings);
    var answers = parseObject(field.cevap_json || field.answers);
    return {
      id: field.id || createId('alan'),
      soru_kodu: String(field.soru_kodu || ('alan-' + (index + 1))).trim(),
      soru_etiketi: String(field.soru_etiketi || ('Soru ' + (index + 1))).trim(),
      alan_tipi: type,
      sayfa_no: Math.max(1, parseInt(field.sayfa_no, 10) || 1),
      x: clampNumber(field.x, 0, 1, 0.08),
      y: clampNumber(field.y, 0, 1, 0.08),
      genislik: clampNumber(field.genislik, 0.04, 1, 0.28),
      yukseklik: clampNumber(field.yukseklik, 0.04, 1, 0.14),
      puan: clampNumber(field.puan, 0, null, 10),
      zorunlu: field.zorunlu !== false,
      sira: parseInt(field.sira, 10) || (index + 1),
      ayar_json: settings,
      cevap_json: answers,
    };
  }

  function sanitizeWorksheetPayload(payload) {
    var rawWorksheet = payload && payload.worksheet ? payload.worksheet : {};
    var rawFields = Array.isArray(payload && payload.fields) ? payload.fields : [];
    return {
      worksheet: {
        id: rawWorksheet.id || '',
        yonerge: String(rawWorksheet.yonerge || '').trim(),
        aktif: rawWorksheet.aktif !== false,
        yayinda: Boolean(rawWorksheet.yayinda),
        gecis_notu: Math.round(clampNumber(rawWorksheet.gecis_notu, 0, 100, 60)),
        izinli_deneme: Math.max(0, parseInt(rawWorksheet.izinli_deneme, 10) || 0),
      },
      fields: rawFields.map(function(field, index) {
        return normalizeFieldRecord(field, index);
      }),
    };
  }

  function isNoRowError(error) {
    return Boolean(error && error.code === 'PGRST116');
  }

  function normalizeWorksheetRow(row) {
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      dokuman_id: row.dokuman_id,
      yonerge: row.yonerge || '',
      aktif: row.aktif !== false,
      yayinda: Boolean(row.yayinda),
      gecis_notu: Number(row.gecis_notu || 60),
      izinli_deneme: Number(row.izinli_deneme || 0),
      olusturma_tarihi: row.olusturma_tarihi || '',
      guncelleme_tarihi: row.guncelleme_tarihi || '',
    };
  }

  async function getWorksheetForAdmin(client, documentId) {
    var worksheetResponse = await client
      .from('calisma_kagitlari')
      .select('*')
      .eq('dokuman_id', documentId)
      .maybeSingle();

    if (worksheetResponse.error && !isNoRowError(worksheetResponse.error)) {
      throw worksheetResponse.error;
    }

    if (!worksheetResponse.data) {
      return {
        worksheet: null,
        fields: [],
      };
    }

    var fieldResponse = await client
      .from('calisma_kagidi_alanlari')
      .select('*')
      .eq('calisma_kagidi_id', worksheetResponse.data.id)
      .order('sayfa_no', { ascending: true })
      .order('sira', { ascending: true })
      .order('olusturma_tarihi', { ascending: true });

    if (fieldResponse.error) {
      throw fieldResponse.error;
    }

    return {
      worksheet: normalizeWorksheetRow(worksheetResponse.data),
      fields: (fieldResponse.data || []).map(function(field, index) {
        return normalizeFieldRecord(field, index);
      }),
    };
  }

  async function saveWorksheet(client, documentId, payload) {
    var safe = sanitizeWorksheetPayload(payload);
    var existingResponse = await client
      .from('calisma_kagitlari')
      .select('id')
      .eq('dokuman_id', documentId)
      .maybeSingle();

    if (existingResponse.error && !isNoRowError(existingResponse.error)) {
      throw existingResponse.error;
    }

    var worksheetId = existingResponse.data ? existingResponse.data.id : '';
    var nowIso = new Date().toISOString();
    var worksheetPayload = {
      dokuman_id: documentId,
      yonerge: safe.worksheet.yonerge,
      aktif: safe.worksheet.aktif,
      yayinda: safe.worksheet.yayinda,
      gecis_notu: safe.worksheet.gecis_notu,
      izinli_deneme: safe.worksheet.izinli_deneme,
      guncelleme_tarihi: nowIso,
    };

    if (worksheetId) {
      var updateResponse = await client
        .from('calisma_kagitlari')
        .update(worksheetPayload)
        .eq('id', worksheetId)
        .select('*')
        .single();
      if (updateResponse.error) {
        throw updateResponse.error;
      }
      worksheetId = updateResponse.data.id;
    } else {
      var insertResponse = await client
        .from('calisma_kagitlari')
        .insert(Object.assign({
          olusturma_tarihi: nowIso,
        }, worksheetPayload))
        .select('*')
        .single();
      if (insertResponse.error) {
        throw insertResponse.error;
      }
      worksheetId = insertResponse.data.id;
    }

    var deleteResponse = await client
      .from('calisma_kagidi_alanlari')
      .delete()
      .eq('calisma_kagidi_id', worksheetId);

    if (deleteResponse.error) {
      throw deleteResponse.error;
    }

    if (safe.fields.length) {
      var rows = safe.fields.map(function(field, index) {
        return {
          id: field.id,
          calisma_kagidi_id: worksheetId,
          soru_kodu: field.soru_kodu,
          soru_etiketi: field.soru_etiketi,
          alan_tipi: field.alan_tipi,
          sayfa_no: field.sayfa_no,
          x: field.x,
          y: field.y,
          genislik: field.genislik,
          yukseklik: field.yukseklik,
          puan: field.puan,
          zorunlu: field.zorunlu,
          sira: index + 1,
          ayar_json: field.ayar_json,
          cevap_json: field.cevap_json,
          olusturma_tarihi: nowIso,
          guncelleme_tarihi: nowIso,
        };
      });
      var fieldInsert = await client
        .from('calisma_kagidi_alanlari')
        .insert(rows);

      if (fieldInsert.error) {
        throw fieldInsert.error;
      }
    }

    return getWorksheetForAdmin(client, documentId);
  }

  async function getPublishedWorksheet(documentId) {
    var worksheetResponse = await getPublicClient()
      .from('calisma_kagitlari')
      .select('id,dokuman_id,yonerge,aktif,yayinda,gecis_notu,izinli_deneme,olusturma_tarihi,guncelleme_tarihi')
      .eq('dokuman_id', documentId)
      .eq('aktif', true)
      .eq('yayinda', true)
      .maybeSingle();

    if (worksheetResponse.error && !isNoRowError(worksheetResponse.error)) {
      throw worksheetResponse.error;
    }

    if (!worksheetResponse.data) {
      return null;
    }

    var fieldResponse = await getPublicClient()
      .from('calisma_kagidi_ogrenci_alanlari')
      .select('*')
      .eq('dokuman_id', documentId)
      .order('sayfa_no', { ascending: true })
      .order('sira', { ascending: true });

    if (fieldResponse.error) {
      throw fieldResponse.error;
    }

    return {
      worksheet: normalizeWorksheetRow(worksheetResponse.data),
      fields: (fieldResponse.data || []).map(function(field, index) {
        return normalizeFieldRecord(field, index);
      }),
    };
  }

  async function hasPublishedWorksheet(documentId) {
    var response = await getPublicClient()
      .from('calisma_kagitlari')
      .select('id')
      .eq('dokuman_id', documentId)
      .eq('aktif', true)
      .eq('yayinda', true)
      .maybeSingle();

    if (response.error && !isNoRowError(response.error)) {
      throw response.error;
    }

    return Boolean(response.data && response.data.id);
  }

  async function submitWorksheet(documentId, student, answers) {
    var response = await getPublicClient().rpc('submit_calisma_kagidi', {
      p_dokuman_id: documentId,
      p_ad: String(student && student.ad ? student.ad : '').trim(),
      p_soyad: String(student && student.soyad ? student.soyad : '').trim(),
      p_sinif: parseInt(student && student.sinif ? student.sinif : '0', 10) || 0,
      p_sube: String(student && student.sube ? student.sube : '').trim(),
      p_yanitlar: answers && typeof answers === 'object' ? answers : {},
    });

    if (response.error) {
      throw response.error;
    }

    return response.data || null;
  }

  window.kemalCalismaKagidiStore = {
    createId: createId,
    normalizeFieldType: normalizeFieldType,
    sanitizeWorksheetPayload: sanitizeWorksheetPayload,
    getWorksheetForAdmin: getWorksheetForAdmin,
    saveWorksheet: saveWorksheet,
    getPublishedWorksheet: getPublishedWorksheet,
    hasPublishedWorksheet: hasPublishedWorksheet,
    submitWorksheet: submitWorksheet,
  };
})();
