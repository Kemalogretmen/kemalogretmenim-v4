(function() {
  'use strict';

  const state = {
    role: 'student',
    client: null,
    locations: [],
    selectedSchools: [],
    lastSignupEmail: '',
    completeMode: new URLSearchParams(window.location.search).get('profil') === 'tamamla',
    existingUser: null,
    existingProfile: null,
  };
  const TEACHER_VERIFICATION_BUCKET = 'teacher-verifications';
  const MAX_IMAGE_EDGE = 1600;
  const IMAGE_QUALITY = 0.72;
  const MAX_PDF_SIZE = 12 * 1024 * 1024;
  const SCHOOL_MISSING_VALUE = '__manual_school__';

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

  async function loadExternalSchools(city, district) {
    if (!window.kemalMebSchools || typeof window.kemalMebSchools.loadSchools !== 'function') {
      return [];
    }
    return window.kemalMebSchools.loadSchools({
      city: city,
      district: district,
    });
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

  function appendManualSchoolOption(select) {
    if (!select) {
      return;
    }
    select.insertAdjacentHTML('beforeend', '<option value="' + SCHOOL_MISSING_VALUE + '">Okulum listede yok</option>');
  }

  function setRole(nextRole) {
    state.role = nextRole === 'teacher' || nextRole === 'parent' ? nextRole : 'student';
    document.querySelectorAll('.role-tab').forEach(function(tab) {
      tab.setAttribute('aria-pressed', tab.dataset.role === state.role ? 'true' : 'false');
    });
    document.querySelectorAll('.teacher-fields').forEach(function(field) {
      field.hidden = state.role !== 'teacher';
    });
    document.querySelectorAll('.student-fields').forEach(function(field) {
      field.hidden = state.role !== 'student';
    });
    document.querySelectorAll('.parent-fields').forEach(function(field) {
      field.hidden = state.role !== 'parent';
    });
    const isParent = state.role === 'parent';
    const city = document.getElementById('city');
    const district = document.getElementById('district');
    const districtWrap = district && district.closest ? district.closest('.form-field') : null;
    const schoolRow = document.querySelector('.school-row');
    const manualSchoolField = document.getElementById('manualSchoolField');
    const schoolMissing = document.getElementById('schoolMissing');
    const schoolSelect = document.getElementById('school');
    const manualSchool = document.getElementById('manualSchool');
    if (districtWrap) districtWrap.hidden = isParent;
    if (schoolRow) schoolRow.hidden = isParent;
    if (manualSchoolField && isParent) manualSchoolField.hidden = true;
    if (district) {
      district.required = !isParent;
      district.disabled = isParent || !(city && city.value);
    }
    if (schoolSelect && isParent) schoolSelect.disabled = true;
    if (schoolMissing) schoolMissing.disabled = isParent;
    if (manualSchool && isParent) {
      manualSchool.required = false;
      manualSchool.disabled = true;
    }
    const verificationFile = document.getElementById('teacherVerificationFile');
    if (verificationFile) {
      const hasExistingFile = !!(state.existingProfile && state.existingProfile.verification_file_path);
      verificationFile.required = state.role === 'teacher' && !hasExistingFile;
    }
    if (!isParent) {
      syncManualSchool();
    }
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
      state.selectedSchools = await loadExternalSchools(city, district);
      if (state.selectedSchools.length) {
        setOptions(schoolSelect, state.selectedSchools, 'Okul seçiniz', function(school) {
          return {
            value: school.id,
            label: school.name + (school.type ? ' - ' + school.type : ''),
          };
        });
        appendManualSchoolOption(schoolSelect);
        schoolSelect.disabled = false;
        return;
      }

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
      appendManualSchoolOption(schoolSelect);
      schoolSelect.disabled = false;
    } catch (error) {
      state.selectedSchools = await loadExternalSchools(city, district);
      setOptions(schoolSelect, state.selectedSchools, state.selectedSchools.length ? 'Okul seçiniz' : 'Okul listesi henüz hazırlanmadı', function(school) {
        return {
          value: school.id,
          label: school.name + (school.type ? ' - ' + school.type : ''),
        };
      });
      appendManualSchoolOption(schoolSelect);
      schoolSelect.disabled = false;
    }
  }

  function syncManualSchool() {
    const checkbox = document.getElementById('schoolMissing');
    const field = document.getElementById('manualSchoolField');
    const input = document.getElementById('manualSchool');
    const schoolSelect = document.getElementById('school');
    const isManual = !!(checkbox && checkbox.checked) || (schoolSelect && schoolSelect.value === SCHOOL_MISSING_VALUE);
    if (checkbox) {
      checkbox.checked = isManual;
    }
    if (field) {
      field.hidden = !isManual;
    }
    if (input) {
      input.required = isManual;
      input.disabled = !isManual;
      if (!isManual) {
        input.value = '';
      }
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

  function sanitizeFileName(name) {
    const base = String(name || 'ogretmen-belgesi')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
    return base || 'ogretmen-belgesi';
  }

  function getVerificationFile() {
    const input = document.getElementById('teacherVerificationFile');
    return input && input.files && input.files[0] ? input.files[0] : null;
  }

  function loadImage(file) {
    return new Promise(function(resolve, reject) {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = function() {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = function() {
        URL.revokeObjectURL(url);
        reject(new Error('Belge görseli okunamadı.'));
      };
      image.src = url;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise(function(resolve, reject) {
      canvas.toBlob(function(blob) {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Belge sıkıştırılamadı.'));
        }
      }, type, quality);
    });
  }

  async function compressImageFile(file) {
    const image = await loadImage(file);
    const ratio = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
    const width = Math.max(1, Math.round((image.naturalWidth || image.width) * ratio));
    const height = Math.max(1, Math.round((image.naturalHeight || image.height) * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    const blob = await canvasToBlob(canvas, 'image/jpeg', IMAGE_QUALITY);
    return {
      blob,
      fileName: sanitizeFileName(file.name || 'ogretmen-belgesi.jpg').replace(/\.[^.]+$/, '') + '.jpg',
      contentType: 'image/jpeg',
    };
  }

  async function prepareVerificationFile(file) {
    if (!file) {
      return null;
    }
    const type = String(file.type || '').toLowerCase();
    if (type === 'image/jpeg' || type === 'image/png') {
      return compressImageFile(file);
    }
    if (type === 'application/pdf' || /\.pdf$/i.test(file.name || '')) {
      if (file.size > MAX_PDF_SIZE) {
        throw new Error('PDF belge 12 MB altında olmalı. Lütfen dosyayı küçültüp tekrar yükleyin.');
      }
      return {
        blob: file,
        fileName: sanitizeFileName(file.name || 'ogretmen-belgesi.pdf'),
        contentType: 'application/pdf',
      };
    }
    throw new Error('Öğretmen belgesi için JPEG, PNG veya PDF yükleyebilirsin.');
  }

  async function uploadTeacherVerification(client, userId, file) {
    const prepared = await prepareVerificationFile(file);
    if (!prepared) {
      return null;
    }
    const path = userId + '/' + Date.now() + '-' + prepared.fileName;
    const upload = await client
      .storage
      .from(TEACHER_VERIFICATION_BUCKET)
      .upload(path, prepared.blob, {
        cacheControl: '3600',
        contentType: prepared.contentType,
        upsert: true,
      });
    if (upload.error) {
      throw upload.error;
    }
    const update = await client
      .from('user_profiles')
      .update({
        verification_status: 'submitted',
        verification_file_path: path,
        verification_file_name: prepared.fileName,
        verification_file_type: prepared.contentType,
        verification_submitted_at: new Date().toISOString(),
        approval_status: 'pending',
      })
      .eq('id', userId);
    if (update.error) {
      throw update.error;
    }
    return path;
  }

  function buildProfile(form) {
    const data = new FormData(form);
    const email = normalizeEmail(data.get('email'));
    const firstName = String(data.get('firstName') || '').trim();
    const lastName = String(data.get('lastName') || '').trim();
    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    const gradeValue = Number(data.get('gradeLevel') || 0);
    const schoolId = String(data.get('school') || '').trim();
    const matchedSchool = state.selectedSchools.find(function(school) {
      return String(school.id) === schoolId;
    }) || null;
    const isExternalSchool = matchedSchool && matchedSchool.external;
    const schoolMissing = data.get('schoolMissing') === 'on' || schoolId === SCHOOL_MISSING_VALUE;
    const manualSchool = String(data.get('manualSchool') || '').trim();

    return {
      role: state.role,
      email,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      city: normalizePlace(data.get('city')),
      district: state.role === 'parent' ? '' : normalizePlace(data.get('district')),
      school_id: state.role === 'parent' || schoolMissing || isExternalSchool ? null : (schoolId || null),
      school_name: state.role === 'parent' ? '' : (schoolMissing ? manualSchool : (matchedSchool ? matchedSchool.name : '')),
      school_missing: state.role === 'parent' ? false : schoolMissing,
      branch: state.role === 'teacher'
        ? String(data.get('branch') || '').trim()
        : String(data.get('studentBranch') || '').trim().toLocaleUpperCase('tr-TR'),
      grade_level: state.role === 'student' && gradeValue ? gradeValue : null,
      teacher_code: state.role === 'student' ? String(data.get('teacherCode') || '').trim() : '',
      parent_link_code: state.role === 'parent' ? String(data.get('parentLinkCode') || '').trim().toLocaleUpperCase('tr-TR') : '',
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

  async function findExistingProfileByEmail(client, email) {
    const result = await client
      .from('user_profiles')
      .select('id,email,role')
      .eq('email', email)
      .maybeSingle();
    if (result.error) {
      return null;
    }
    return result.data || null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const profile = buildProfile(form);
    const formData = new FormData(form);
    const password = String(formData.get('password') || '');
    const passwordRepeat = String(formData.get('passwordRepeat') || '');
    const verificationFile = getVerificationFile();

    const isParent = profile.role === 'parent';
    const hasSchool = profile.school_missing ? profile.school_name : profile.school_id;
    if (!profile.email || !profile.first_name || !profile.last_name || !profile.city || (!isParent && (!profile.district || !hasSchool)) || (profile.role === 'student' && !profile.grade_level) || (!state.completeMode && password.length < 6)) {
      showMessage('err', isParent
        ? 'Veli kaydı için ad, soyad, e-posta, şehir ve en az 6 karakter şifre gerekli.'
        : 'Ad, soyad, e-posta, sınıf, il, ilçe, okul ve en az 6 karakter şifre gerekli.');
      return;
    }
    if (profile.role === 'teacher' && !profile.branch) {
      showMessage('err', 'Öğretmen kaydı için branş seçimi gerekli.');
      return;
    }
    if (profile.role === 'teacher' && !verificationFile && !(state.existingProfile && state.existingProfile.verification_file_path)) {
      showMessage('err', 'Öğretmen hesabı için öğretmen kimliği veya çalışma belgesi yüklemelisin.');
      return;
    }
    if (!state.completeMode && password !== passwordRepeat) {
      showMessage('err', 'Şifre ve şifre tekrarı aynı olmalı.');
      return;
    }

    setBusy(true);
    try {
      const client = getClient();
      if (state.completeMode && state.existingUser && state.existingUser.id) {
        await saveProfile(client, state.existingUser.id, profile);
        if (profile.role === 'teacher' && verificationFile) {
          await uploadTeacherVerification(client, state.existingUser.id, verificationFile);
        }
        showMessage('ok', profile.role === 'teacher'
          ? 'Öğretmen başvurun kaydedildi. Yönetici onayından sonra öğretmen panelin aktif olacak.'
          : (profile.role === 'parent' ? 'Veli profilin kaydedildi. Veli paneline yönlendiriliyorsun.' : 'Profil bilgilerin kaydedildi. Öğrenci paneline yönlendiriliyorsun.'));
        window.setTimeout(function() {
          window.location.href = profile.role === 'teacher' ? '/ogretmen-paneli.html' : (profile.role === 'parent' ? '/veli-paneli.html' : '/ogrenci-paneli.html');
        }, 700);
        return;
      }

      const existingProfile = await findExistingProfileByEmail(client, profile.email);
      if (existingProfile) {
        showMessage('err', 'Bu e-posta adresiyle daha önce kayıt oluşturulmuş. Lütfen yeni kayıt yerine giriş yap.', '<br><button type="button" onclick="window.location.href=\'/giris.html\'">Giriş sayfasına git</button>');
        return;
      }

      const redirectTo = window.location.origin + '/kayit.html';
      const signup = await client.auth.signUp({
        email: profile.email,
        password: password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            first_name: profile.first_name,
            last_name: profile.last_name,
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
            parent_link_code: profile.parent_link_code,
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
        if (profile.role === 'teacher' && verificationFile) {
          await uploadTeacherVerification(client, user.id, verificationFile);
        }
      }

      form.reset();
      setRole(state.role);
      const teacherMessage = user && user.id && session
        ? 'Öğretmen kaydı ve doğrulama belgesi alındı. E-posta doğrulama ve yönetici onayı sonrası öğretmen paneli aktif olacak.'
        : 'Öğretmen kaydı alındı. E-posta doğrulamasından sonra giriş yapıp öğretmen panelindeki belge alanından doğrulama belgeni gönderebilirsin.';
      showMessage('ok', profile.role === 'teacher'
        ? teacherMessage
        : (profile.role === 'parent'
          ? 'Veli kaydı oluşturuldu. E-posta doğrulama bağlantısı gelen kutuna gönderildi; doğrulama sonrası veli paneli açılacak.'
          : 'Öğrenci kaydı oluşturuldu. E-posta doğrulama bağlantısı gelen kutuna gönderildi; doğrulama sonrası öğrenci paneli açılacak.'),
        '<br><button type="button" id="resendConfirmBtn">Doğrulama mailini tekrar gönder</button>');
    } catch (error) {
      const raw = String(error && error.message ? error.message : error);
      let friendly = raw;
      if (raw.includes('Signups not allowed')) {
        friendly = 'Supabase yeni kullanıcı kaydına izin vermiyor. Authentication > Sign In / Providers ekranında "Allow new users to sign up" ayarını açıp Save changes yapmalısın.';
      } else if (raw.includes('teacher-verifications') || raw.includes('Bucket not found') || raw.includes('storage')) {
        friendly = 'Öğretmen belge alanı henüz Supabase içinde hazır değil. supabase-ogretmen-paneli.sql dosyasını tekrar çalıştırmalıyız.';
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

  async function continueWithGoogle() {
    try {
      const result = await getClient().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/kayit.html?profil=tamamla',
        },
      });
      if (result.error) throw result.error;
    } catch (error) {
      showMessage('err', String(error && error.message ? error.message : error));
    }
  }

  function setInputValue(id, value) {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null) {
      el.value = value;
    }
  }

  function splitName(value) {
    const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
    return {
      firstName: parts.slice(0, Math.max(1, parts.length - 1)).join(' '),
      lastName: parts.length > 1 ? parts.slice(-1).join(' ') : '',
    };
  }

  async function loadCompletionProfile() {
    if (!state.completeMode) {
      return;
    }
    try {
      const sessionResult = await getClient().auth.getSession();
      const session = sessionResult && sessionResult.data ? sessionResult.data.session : null;
      state.existingUser = session ? session.user : null;
      if (!state.existingUser) {
        showMessage('err', 'Profil tamamlamak için önce giriş yapmalısın.');
        return;
      }
      const profileResult = await getClient()
        .from('user_profiles')
        .select('*')
        .eq('id', state.existingUser.id)
        .maybeSingle();
      const profile = profileResult.data || {};
      state.existingProfile = profile;
      const meta = state.existingUser.user_metadata || {};
      const split = splitName(profile.full_name || meta.full_name || meta.name || '');
      setRole(profile.role === 'teacher' ? 'teacher' : (profile.role === 'parent' ? 'parent' : 'student'));
      setInputValue('firstName', profile.first_name || meta.first_name || split.firstName);
      setInputValue('lastName', profile.last_name || meta.last_name || split.lastName);
      setInputValue('email', profile.email || state.existingUser.email || '');
      setInputValue('city', profile.city || '');
      updateDistricts();
      setInputValue('district', profile.district || '');
      setInputValue('gradeLevel', profile.grade_level || '');
      setInputValue('studentBranch', profile.branch || '');
      setInputValue('branch', profile.branch || '');
      setInputValue('parentLinkCode', profile.parent_link_code || '');
      setInputValue('manualSchool', profile.school_name || '');
      const schoolMissing = document.getElementById('schoolMissing');
      if (schoolMissing && profile.school_name) {
        schoolMissing.checked = true;
        syncManualSchool();
      }
      ['password', 'passwordRepeat'].forEach(function(id) {
        const field = document.getElementById(id);
        if (field) {
          field.required = false;
          const wrap = field.closest('.form-field');
          if (wrap) wrap.hidden = true;
        }
      });
      const emailField = document.getElementById('email');
      if (emailField) emailField.readOnly = true;
      const submit = document.getElementById('registerSubmit');
      if (submit) submit.textContent = 'Profilimi Kaydet';
      showMessage('ok', 'Google hesabınla giriş yapıldı. Devam etmek için eksik profil bilgilerini tamamla.');
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
    const schoolSelect = document.getElementById('school');
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
      schoolMissing.addEventListener('change', function() {
        const schoolSelect = document.getElementById('school');
        if (!schoolMissing.checked && schoolSelect && schoolSelect.value === SCHOOL_MISSING_VALUE) {
          schoolSelect.value = '';
        }
        syncManualSchool();
      });
    }
    if (schoolSelect) {
      schoolSelect.addEventListener('change', syncManualSchool);
    }

    const googleBtn = document.getElementById('registerGoogleBtn');
    if (googleBtn) {
      googleBtn.addEventListener('click', continueWithGoogle);
    }

    setRole('student');
    loadLocations()
      .then(loadCompletionProfile)
      .catch(function(error) {
        showMessage('err', error.message || 'İl/ilçe listesi yüklenemedi.');
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
