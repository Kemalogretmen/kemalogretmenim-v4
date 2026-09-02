const FIREBASE_PROJECT_ID = 'kemalogretmen-2c986';
const FIREBASE_WEB_API_KEY = 'AIzaSyBs2RPc-Vr7tETmkta5xXt6YDs70JnutxI';
const SITE_ORIGIN = 'https://kemalogretmenim.com.tr';
const DEFAULT_IMAGE = SITE_ORIGIN + '/gorseller/logo.png';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function firestoreValue(value) {
  if (!value || typeof value !== 'object') return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if (value.arrayValue) return (value.arrayValue.values || []).map(firestoreValue);
  if (value.mapValue) return decodeFields(value.mapValue.fields || {});
  return null;
}

function decodeFields(fields) {
  return Object.fromEntries(
    Object.entries(fields || {}).map(([key, value]) => [key, firestoreValue(value)])
  );
}

function getExamGrades(exam) {
  const raw = Array.isArray(exam.grades) && exam.grades.length ? exam.grades : [exam.grade];
  return [...new Set(raw.map(Number).filter((grade) => grade >= 1 && grade <= 8))].sort((a, b) => a - b);
}

function renderPage({ examId, exam }) {
  const targetUrl = SITE_ORIGIN + '/sinav_sitesi/index.html?examId=' + encodeURIComponent(examId);
  const shareUrl = SITE_ORIGIN + '/sinav/' + encodeURIComponent(examId);
  const grades = getExamGrades(exam);
  const gradeText = grades.map((grade) => grade + '. Sınıf').join(', ');
  const title = exam.title || 'Sınav';
  const subject = exam.subject || 'Genel';
  const questionText = exam.questionCount ? exam.questionCount + ' soru' : 'Online sınav';
  const description = [gradeText, subject, questionText, exam.duration ? exam.duration + ' dakika' : 'Sınırsız süre']
    .filter(Boolean)
    .join(' · ');
  const requestedImage = String(exam.coverImageUrl || '');
  const image = /^https:\/\//i.test(requestedImage) ? requestedImage : DEFAULT_IMAGE;

  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)} — Kemal Öğretmenim</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(shareUrl)}">
  <meta property="og:locale" content="tr_TR">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Kemal Öğretmenim">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(shareUrl)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:image:alt" content="${escapeHtml(title + ' kapak görseli')}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f3ff;color:#0f172a;font-family:Arial,sans-serif}
    main{width:min(560px,calc(100% - 32px));padding:32px;border-radius:24px;background:#fff;box-shadow:0 18px 50px rgba(15,23,42,.12);text-align:center}
    img{width:100%;max-height:280px;object-fit:cover;border-radius:16px;margin-bottom:20px}
    h1{font-size:25px;line-height:1.25;margin:0 0 10px}p{color:#64748b;line-height:1.6}
    a{display:inline-block;margin-top:10px;padding:13px 22px;border-radius:999px;background:#6c3ded;color:#fff;text-decoration:none;font-weight:700}
  </style>
</head>
<body>
  <main>
    <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    <a href="${escapeHtml(targetUrl)}">Sınavı Aç</a>
  </main>
  <script>window.location.replace(${JSON.stringify(targetUrl)});</script>
</body>
</html>`;
}

exports.handler = async function handler(event) {
  const examId = String(event.queryStringParameters?.examId || '').trim();
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(examId)) {
    return { statusCode: 400, body: 'Geçersiz sınav bağlantısı.' };
  }

  try {
    const endpoint = 'https://firestore.googleapis.com/v1/projects/' + FIREBASE_PROJECT_ID
      + '/databases/(default)/documents/exams/' + encodeURIComponent(examId)
      + '?key=' + encodeURIComponent(FIREBASE_WEB_API_KEY);
    const response = await fetch(endpoint);
    if (!response.ok) {
      return { statusCode: 404, body: 'Sınav bulunamadı.' };
    }
    const document = await response.json();
    const exam = decodeFields(document.fields || {});
    if (exam.published !== true || (exam.status && exam.status !== 'active')) {
      return { statusCode: 404, body: 'Sınav aktif değil.' };
    }
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
      },
      body: renderPage({ examId, exam }),
    };
  } catch (error) {
    console.error('Exam share preview failed:', error);
    return { statusCode: 503, body: 'Sınav önizlemesi şu an hazırlanamadı.' };
  }
};
