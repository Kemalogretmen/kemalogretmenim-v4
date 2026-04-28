(function() {
  'use strict';

  const state = {
    role: 'teacher',
    client: null,
    locations: [],
    selectedSchools: [],
    lastSignupEmail: '',
  };

  function getConfig() {
    if (!window.kemalSiteStore || typeof window.kemalSiteStore.getConfig !== 'function') {
      throw new Error('Site yapılandırması yüklenemedi.');
    }
    return window.kemalSiteStore.getConfig();
  }

  function getClient() {
    if (state.client) {
      return state.client;
    }
    if (!window.supabase) {
      throw new Error('Supabase kütüphanesi yüklenemedi.');
    }
    const config = getConfig();
    state.client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
    return state.client;
  }

  function normalizeEmail(value) {
    return String(value || '').trim().toLocaleLowerCase('tr-TR');
  }

  function normalizePlace(value) {
    return String(value || '').trim().toLocaleUpperCase('tr-TR');
  }

  function escHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setOptions(select, items, placeholder, mapper) {
    if (!select) {
      return;
    }
    const mapItem = mapper || function(item) {
      return { value: item, label: item };
    };
    select.innerHTML = '<option value="">' + escHtml(placeholder) + '</option>' + items.map(function(item) {
      const mapped = mapItem(item);
      return '<option value="' + escHtml(mapped.value) + '">' + escHtml(mapped.label) + '</option>';
    }).join('');
  }

  function setRole(nextRole) {
    state.role = nextRole === 'student' ? 'student' : 'teacher';
    document.querySelectorAll('.role-tab').forEach(function(tab) {
      tab.setAttribute('aria-pressed', tab.dataset.role === state.role ? 'true' : 'false');
    });
    document.querySelectorAll('.teacher-fields').forEach(function(field) {
      field.hidden = state.role !== 'teacher';
    });
    document.querySelectorAll('.student-fields').forEach(function(field) {
      field.hidden = state.role !== 'student';
    });
  }

  function showMessage(type, text, actionHtml) {
    const message = document.getElementById('registerMessage');
    if (!message) {
      return;
    }
    message.className = 'register-message show ' + (type === 'ok' ? 'ok' : 'err');
    message.innerHTML = escHtml(text) + (actionHtml || '');
  }

  async function loadLocations() {
    const response = await fetch('/data/turkey-cities.json', { cache: 'force-cache' });
    if (!response.ok) {
      throw new Error('İl/ilçe listesi yüklenemedi.');
    }
    const rows = await response.json();
    state.locations = Array.isArray(rows) ? rows.map(function(city) {
      return {
        name: normalizePlace(city.name),
        plate: city.plate || '',
        counties: Array.isArray(city.counties)
          ? city.counties.map(normalizePlace).sort(function(a, b) { return a.localeCompare(b, 'tr-TR'); })
          : [],
      };
    }).sort(function(a, b) {
      return a.name.localeCompare(b.name, 'tr-TR');
    }) : [];

    const citySelect = document.getElementById('city');
    setOptions(citySelect, state.locations, 'Şehir seçiniz', function(city) {
      return { value: city.name, label: city.name };
    });
  }

  function updateDistricts() {
    const citySelect = document.getElementById('city');
    const districtSelect = document.getElementById('district');
    const schoolSelect = document.getElementById('school');
    const city = normalizePlace(citySelect && citySelect.value);
    const match = state.locations.find(function(item) { return item.name === city; });
    setOptions(districtSelect, match ? match.counties : [], match ? 'İlçe seçiniz' : 'Önce şehir seçiniz');
    if (districtSelect) {
      districtSelect.disabled = !match;
    }
    setOptions(schoolSelect, [], 'Önce il ve ilçe seçiniz');
    if (schoolSelect) {
      schoolSelect.disabled = true;
    }
    state.selectedSchools = [];
  }

  async function loadSchools() {
    const city = normalizePlace(document.getElementById('city') && document.getElementById('city').value);
    const district = normalizePlace(document.getElementById('district') && document.getElementById('district').value);
    const schoolSelect = document.getElementById('school');
    if (!city || !district || !schoolSelect) {
      return;
    }

    setOptions(schoolSelect, [], 'Okullar yükleniyor...');
    schoolSelect.disabled = true;

    try {
      const result = await getClient()
        .from('schools')
        .select('id,meb_code,name,type')
        .eq('city', city)
        .eq('district', district)
        .eq('active', true)
        .order('name', { ascending: true });

      if (result.error) {
        throw result.error;
      }

      state.selectedSchools = Array.isArray(result.data) ? result.data : [];
      setOptions(schoolSelect, state.selectedSchools, state.selectedSchools.length ? 'Okul seçiniz' : 'Okul bulunamadı, listede yok seçebilirsiniz', function(school) {
        return {
          value: school.id,
          label: school.name + (school.type ? ' - ' + school.type : ''),
        };
      });
      schoolSelect.disabled = false;
    } catch (error) {
      state.selectedSchools = [];
      setOptions(schoolSelect, [], 'Okul listesi henüz hazırlanmadı');
      schoolSelect.disabled = false;
    }
  }

  function syncManualSchool() {
    const checkbox = document.getElementById('schoolMissing');
    const field = document.getElementById('manualSchoolField');
    const input = document.getElementById('manualSchool');
    const schoolSelect = document.getElementById('school');
    const isManual = !!(checkbox && checkbox.checked);
    if (field) {
      field.hidden = !isManual;
    }
    if (input) {
      input.required = isManual;
    }
    if (schoolSelect) {
      schoolSelect.disabled = isManual || !normalizePlace(document.getElementById('district') && document.getElementById('district').value);
    }
  }

  function setBusy(isBusy) {
    const submit = document.getElementById('registerSubmit');
    if (!submit) {
      return;
    }
    submit.disabled = isBusy;
    submit.textContent = isBusy ? 'Kayıt oluşturuluyor...' : 'Kayıt Oluştur';
  }

  function buildProfile(form) {
    const data = new FormData(form);
    const email = normalizeEmail(data.get('email'));
    const fullName = String(data.get('fullName') || '').trim();
    const gradeValue = Number(data.get('gradeLevel') || 0);
    const schoolId = String(data.get('school') || '').trim();
    const matchedSchool = state.selectedSchools.find(function(school) {
      return String(school.id) === schoolId;
    }) || null;
    const schoolMissing = data.get('schoolMissing') === 'on';
    const manualSchool = String(data.get('manualSchool') || '').trim();

    return {
      role: state.role,
      email,
      full_name: fullName,
      city: normalizePlace(data.get('city')),
      district: normalizePlace(data.get('district')),
      school_id: schoolMissing ? null : (schoolId || null),
      school_name: schoolMissing ? manualSchool : (matchedSchool ? matchedSchool.name : ''),
      school_missing: schoolMissing,
      branch: state.role === 'teacher' ? String(data.get('branch') || '').trim() : '',
      grade_level: state.role === 'student' && gradeValue ? gradeValue : null,
      teacher_code: state.role === 'student' ? String(data.get('teacherCode') || '').trim() : '',
      approval_status: state.role === 'teacher' ? 'pending' : 'active',
    };
  }

  async function saveProfile(client, userId, profile) {
    const payload = Object.assign({}, profile, {
      id: userId,
      active: true,
    });
    const result = await client
      .from('user_profiles')
      .upsert(payload, { onConflict: 'id' });
    if (result.error) {
      throw result.error;
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const profile = buildProfile(form);
    const formData = new FormData(form);
    const password = String(formData.get('password') || '');
    const passwordRepeat = String(formData.get('passwordRepeat') || '');

    const hasSchool = profile.school_missing ? profile.school_name : profile.school_id;
    if (!profile.email || !profile.full_name || !profile.city || !profile.district || !hasSchool || password.length < 6) {
      showMessage('err', 'Ad soyad, e-posta, il, ilçe, okul ve en az 6 karakter şifre gerekli.');
      return;
    }
    if (password !== passwordRepeat) {
      showMessage('err', 'Şifre ve şifre tekrarı aynı olmalı.');
      return;
    }

    setBusy(true);
    try {
      const client = getClient();
      const redirectTo = window.location.origin + '/kayit.html';
      const signup = await client.auth.signUp({
        email: profile.email,
        password: password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            full_name: profile.full_name,
            role: profile.role,
            city: profile.city,
            district: profile.district,
            school_id: profile.school_id,
            school_name: profile.school_name,
            school_missing: profile.school_missing,
            branch: profile.branch,
            grade_level: profile.grade_level,
            teacher_code: profile.teacher_code,
          },
        },
      });

      if (signup.error) {
        throw signup.error;
      }

      state.lastSignupEmail = profile.email;
      const user = signup.data && signup.data.user ? signup.data.user : null;
      const session = signup.data && signup.data.session ? signup.data.session : null;
      if (user && user.id && session) {
        await saveProfile(client, user.id, profile);
      }

      form.reset();
      setRole(state.role);
      showMessage('ok', profile.role === 'teacher'
        ? 'Öğretmen kaydı alındı. E-posta doğrulama bağlantısı gelen kutuna gönderildi; doğrulama ve yönetici onayı sonrası öğretmen paneli açılacak.'
        : 'Öğrenci kaydı oluşturuldu. E-posta doğrulama bağlantısı gelen kutuna gönderildi; doğrulama sonrası öğrenci paneli açılacak.',
        '<br><button type="button" id="resendConfirmBtn">Doğrulama mailini tekrar gönder</button>');
    } catch (error) {
      const raw = String(error && error.message ? error.message : error);
      let friendly = raw;
      if (raw.includes('Signups not allowed')) {
        friendly = 'Supabase yeni kullanıcı kaydına izin vermiyor. Authentication > Sign In / Providers ekranında "Allow new users to sign up" ayarını açıp Save changes yapmalısın.';
      } else if (raw.includes('user_profiles') || raw.includes('schools')) {
        friendly = 'Kayıt tabloları henüz hazır değil. supabase-kullanici-profilleri.sql dosyasını Supabase SQL Editor içinde çalıştırmalıyız.';
      }
      showMessage('err', friendly);
    } finally {
      setBusy(false);
    }
  }

  async function resendConfirmation() {
    const email = state.lastSignupEmail || normalizeEmail(document.getElementById('email') && document.getElementById('email').value);
    if (!email) {
      showMessage('err', 'Doğrulama maili göndermek için e-posta adresini yazmalısın.');
      return;
    }

    try {
      const result = await getClient().auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: window.location.origin + '/kayit.html',
        },
      });
      if (result.error) {
        throw result.error;
      }
      state.lastSignupEmail = email;
      showMessage('ok', 'Doğrulama maili tekrar gönderildi. Gelen kutusu, spam ve promosyonlar klasörlerini kontrol et.');
    } catch (error) {
      showMessage('err', String(error && error.message ? error.message : error));
    }
  }

  function init() {
    document.querySelectorAll('.role-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        setRole(tab.dataset.role);
      });
    });

    const form = document.getElementById('registerForm');
    if (form) {
      form.addEventListener('submit', handleSubmit);
    }
    document.addEventListener('click', function(event) {
      if (event.target && event.target.id === 'resendConfirmBtn') {
        resendConfirmation();
      }
    });

    const citySelect = document.getElementById('city');
    const districtSelect = document.getElementById('district');
    const schoolMissing = document.getElementById('schoolMissing');
    if (citySelect) {
      citySelect.addEventListener('change', function() {
        updateDistricts();
        syncManualSchool();
      });
    }
    if (districtSelect) {
      districtSelect.addEventListener('change', function() {
        loadSchools();
        syncManualSchool();
      });
    }
    if (schoolMissing) {
      schoolMissing.addEventListener('change', syncManualSchool);
    }

    setRole('teacher');
    loadLocations().catch(function(error) {
      showMessage('err', error.message || 'İl/ilçe listesi yüklenemedi.');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
