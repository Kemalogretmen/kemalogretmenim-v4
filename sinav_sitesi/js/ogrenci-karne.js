import { app, db } from "./firebase.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, doc, getDoc, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const TARGET_STORAGE_KEY = "kemal_exam_student_report_target_v1";
const SINGLE_EXAM_STORAGE_KEY = "kemal_exam_admin_karne_result_v1";

const S = {
  target: null,
  allResults: [],
  reportResults: [],
  filters: {
    grade: "",
    studentKey: "",
    subject: "",
    examId: "",
  },
  selectedResultId: "",
  progressChart: null,
  benchmarkChart: null,
};

function $(id) {
  return document.getElementById(id);
}

function esc(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeKeyPart(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildStudentKey(source) {
  return [
    normalizeKeyPart(source?.firstName),
    normalizeKeyPart(source?.lastName),
    normalizeKeyPart(source?.grade),
    normalizeKeyPart(source?.sube),
  ].filter(Boolean).join("|");
}

function buildStudentNameKey(source) {
  return [
    normalizeKeyPart(source?.firstName),
    normalizeKeyPart(source?.lastName),
  ].filter(Boolean).join("|");
}

function getStudentIdentityKey(source) {
  const accountUid = String(source?.accountUid || source?.userId || "").trim();
  if (accountUid) {
    return "uid:" + accountUid;
  }
  const explicitKey = String(source?.studentKey || "").trim();
  if (explicitKey.indexOf("uid:") === 0) {
    return explicitKey;
  }
  return buildStudentKey(source) || explicitKey;
}

function shouldUseTargetNameFallback() {
  if (!S.target || !S.filters.studentKey) {
    return false;
  }
  if (String(S.filters.studentKey) !== String(S.target.studentKey || "")) {
    return false;
  }
  return !String(S.target.accountUid || "").trim();
}

function matchesStudentSelection(row) {
  if (!S.filters.studentKey) {
    return true;
  }
  if (row.studentKey === S.filters.studentKey) {
    return true;
  }
  if (!shouldUseTargetNameFallback()) {
    return false;
  }
  const targetNameKey = buildStudentNameKey(S.target);
  return !!targetNameKey && buildStudentNameKey(row) === targetNameKey;
}

function getAcademicYearText() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  return month >= 8 ? year + " - " + (year + 1) : (year - 1) + " - " + year;
}

function toDateObject(value) {
  if (!value) {
    return null;
  }
  if (typeof value.toDate === "function") {
    return value.toDate();
  }
  if (typeof value === "object" && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value) {
  const date = value instanceof Date ? value : toDateObject(value);
  return date ? date.toLocaleDateString("tr-TR") : "—";
}

function formatDateTime(value) {
  const date = value instanceof Date ? value : toDateObject(value);
  return date
    ? date.toLocaleString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
}

function shortTitle(title, size) {
  const safe = String(title || "Sınav");
  const limit = size || 34;
  return safe.length > limit ? safe.slice(0, limit - 3) + "..." : safe;
}

function average(values) {
  return values.length
    ? Math.round(values.reduce(function(total, value) { return total + value; }, 0) / values.length)
    : 0;
}

function parseStoredTarget() {
  try {
    const parsed = JSON.parse(localStorage.getItem(TARGET_STORAGE_KEY) || "null");
    if (!parsed) {
      return null;
    }
    parsed.studentKey = getStudentIdentityKey(parsed);
    return parsed;
  } catch (error) {
    return null;
  }
}

function normalizeResult(row) {
  const dateObj = toDateObject(row.date);
  const studentKey = getStudentIdentityKey(row);
  return Object.assign({}, row, {
    studentKey,
    correct: Number(row.correct || 0),
    wrong: Number(row.wrong || 0),
    blank: Number(row.blank || 0),
    netCorrect: typeof row.netCorrect === "number" ? row.netCorrect : Number(row.netCorrect || row.correct || 0),
    score: Number(row.score || 0),
    total: Number(row.total || 0),
    elapsed: Number(row.elapsed || 0),
    answerDetails: Array.isArray(row.answerDetails) ? row.answerDetails : [],
    questionSections: Array.isArray(row.questionSections) ? row.questionSections : [],
    examId: row.examId || "",
    examTitle: row.examTitle || "Sınav",
    subject: row.subject || "Genel",
    dateObj,
    formattedDate: formatDate(dateObj || row.date),
    formattedDateTime: formatDateTime(dateObj || row.date),
  });
}

function showError(title, detail) {
  $("loadingState").style.display = "none";
  $("app").style.display = "none";
  $("errorState").style.display = "flex";
  $("errorTitle").textContent = title;
  $("errorDetail").textContent = detail;
}

function setLoading(message) {
  $("loadingText").textContent = message;
}

async function isAdminUser(user) {
  try {
    const snap = await getDoc(doc(db, "admins", user.uid));
    return snap.exists();
  } catch (error) {
    return false;
  }
}

function getExamComparisonKey(result) {
  if (result.examId) {
    return "exam:" + result.examId;
  }
  return [
    "fallback",
    normalizeKeyPart(result.grade),
    normalizeKeyPart(result.subject),
    normalizeKeyPart(result.examTitle),
  ].join("|");
}

function getBenchmarkStats(result) {
  const cohort = S.allResults.filter(function(row) {
    return getExamComparisonKey(row) === getExamComparisonKey(result);
  });
  if (!cohort.length) {
    return {
      avgScore: result.score || 0,
      rankPercent: 100,
      delta: 0,
      participantCount: 1,
    };
  }
  const avgScore = average(cohort.map(function(row) { return row.score || 0; }));
  const lowerOrEqual = cohort.filter(function(row) {
    return (row.score || 0) <= (result.score || 0);
  }).length;
  const rankPercent = Math.round((lowerOrEqual / cohort.length) * 100);
  return {
    avgScore,
    rankPercent,
    delta: Math.round(((result.score || 0) - avgScore) * 10) / 10,
    participantCount: cohort.length,
  };
}

function getQuestionEntries(result) {
  return (Array.isArray(result.answerDetails) ? result.answerDetails : []).map(function(item, index) {
    const questionNo = parseInt(item?.questionNo, 10) || index + 1;
    const selectedAnswer = String(item?.selectedAnswer || "").trim();
    const correctAnswer = String(item?.correctAnswer || "").trim();
    const outcome = item?.outcome || (selectedAnswer ? (selectedAnswer === correctAnswer ? "D" : "Y") : "B");
    return {
      questionNo,
      sectionTitle: String(item?.sectionTitle || result.subject || "Genel").trim(),
      selectedAnswer,
      correctAnswer,
      outcome,
    };
  });
}

function buildMatrixBlocks(result) {
  const entries = getQuestionEntries(result);
  if (!entries.length) {
    return [];
  }
  const blocks = [];
  const blockSize = 20;
  for (let start = 0; start < entries.length; start += blockSize) {
    const slice = entries.slice(start, start + blockSize);
    const rowMap = new Map();
    const rows = [];
    slice.forEach(function(entry) {
      const key = entry.sectionTitle || result.subject || "Genel";
      if (!rowMap.has(key)) {
        const row = { label: key, items: [] };
        rowMap.set(key, row);
        rows.push(row);
      }
      rowMap.get(key).items.push(entry);
    });
    blocks.push({
      start: slice[0].questionNo,
      end: slice[slice.length - 1].questionNo,
      rows,
    });
  }
  return blocks;
}

async function loadAllResults() {
  let docs = [];
  try {
    const snap = await getDocs(query(collection(db, "results"), orderBy("date", "desc")));
    docs = snap.docs;
  } catch (error) {
    const snap = await getDocs(collection(db, "results"));
    docs = snap.docs;
  }
  return docs.map(function(docSnap) {
    return normalizeResult(Object.assign({ id: docSnap.id }, docSnap.data()));
  });
}

function getUniqueGrades() {
  return Array.from(new Set(S.allResults.map(function(row) { return String(row.grade || ""); }).filter(Boolean)))
    .sort(function(a, b) { return Number(a) - Number(b); });
}

function getStudentOptions() {
  const source = S.allResults.filter(function(row) {
    return !S.filters.grade || String(row.grade) === String(S.filters.grade);
  });
  const map = new Map();
  source.forEach(function(row) {
    if (!row.studentKey) {
      return;
    }
    if (!map.has(row.studentKey)) {
      map.set(row.studentKey, {
        studentKey: row.studentKey,
        firstName: row.firstName || "",
        lastName: row.lastName || "",
        grade: row.grade || "",
        sube: row.sube || "",
      });
    }
  });
  return Array.from(map.values()).sort(function(a, b) {
    return (a.firstName + " " + a.lastName).localeCompare(b.firstName + " " + b.lastName, "tr");
  });
}

function getSubjectOptions() {
  return Array.from(new Set(S.allResults
    .filter(function(row) {
      if (S.filters.grade && String(row.grade) !== String(S.filters.grade)) {
        return false;
      }
      if (!matchesStudentSelection(row)) {
        return false;
      }
      return true;
    })
    .map(function(row) { return row.subject || ""; })
    .filter(Boolean)))
    .sort(function(a, b) { return a.localeCompare(b, "tr"); });
}

function getExamOptions() {
  const map = new Map();
  S.allResults.forEach(function(row) {
    if (S.filters.grade && String(row.grade) !== String(S.filters.grade)) {
      return;
    }
    if (!matchesStudentSelection(row)) {
      return;
    }
    if (S.filters.subject && row.subject !== S.filters.subject) {
      return;
    }
    const key = row.examId || [row.examTitle, row.subject, row.grade].join("|");
    if (!map.has(key)) {
      map.set(key, {
        examId: row.examId || key,
        label: shortTitle(row.examTitle, 40) + " • " + row.formattedDate,
      });
    }
  });
  return Array.from(map.values());
}

function setSelectOptions(selectId, options, placeholder, selectedValue, mapper) {
  const select = $(selectId);
  select.innerHTML = "<option value=\"\">" + esc(placeholder) + "</option>" +
    options.map(function(option) {
      const item = mapper(option);
      return "<option value=\"" + esc(item.value) + "\"" + (String(item.value) === String(selectedValue) ? " selected" : "") + ">" + esc(item.label) + "</option>";
    }).join("");
}

function syncFilterOptions() {
  const grades = getUniqueGrades();
  if (!S.filters.grade || !grades.includes(String(S.filters.grade))) {
    S.filters.grade = S.target?.grade ? String(S.target.grade) : (grades[0] || "");
  }

  const students = getStudentOptions();
  if (!S.filters.studentKey || !students.some(function(student) { return student.studentKey === S.filters.studentKey; })) {
    const preferredKey = S.target?.studentKey;
    const fallbackStudent = students.find(function(student) { return student.studentKey === preferredKey; }) || students[0] || null;
    S.filters.studentKey = fallbackStudent ? fallbackStudent.studentKey : "";
  }

  const subjects = getSubjectOptions();
  if (S.filters.subject && !subjects.includes(S.filters.subject)) {
    S.filters.subject = "";
  }

  const exams = getExamOptions();
  if (S.filters.examId && !exams.some(function(exam) { return String(exam.examId) === String(S.filters.examId); })) {
    S.filters.examId = "";
  }

  setSelectOptions("gradeFilter", grades, "Tüm Sınıflar", S.filters.grade, function(grade) {
    return { value: grade, label: grade + ". Sınıf" };
  });
  setSelectOptions("studentFilter", students, "Öğrenci Seç", S.filters.studentKey, function(student) {
    return {
      value: student.studentKey,
      label: student.firstName + " " + student.lastName + " • " + student.grade + ". Sınıf " + student.sube,
    };
  });
  setSelectOptions("subjectFilter", subjects, "Tüm Dersler", S.filters.subject, function(subject) {
    return { value: subject, label: subject };
  });
  setSelectOptions("examFilter", exams, "Tüm Sınavlar", S.filters.examId, function(exam) {
    return { value: exam.examId, label: exam.label };
  });
}

function applyFilters() {
  S.reportResults = S.allResults
    .filter(function(row) {
      if (S.filters.grade && String(row.grade) !== String(S.filters.grade)) {
        return false;
      }
      if (!matchesStudentSelection(row)) {
        return false;
      }
      if (S.filters.subject && row.subject !== S.filters.subject) {
        return false;
      }
      if (S.filters.examId) {
        const key = row.examId || [row.examTitle, row.subject, row.grade].join("|");
        return String(key) === String(S.filters.examId);
      }
      return true;
    })
    .sort(function(a, b) {
      return (a.dateObj?.getTime?.() || 0) - (b.dateObj?.getTime?.() || 0);
    });

  if (S.reportResults.some(function(row) { return row.id === S.selectedResultId; })) {
    return;
  }
  if (S.target?.focusResultId && S.reportResults.some(function(row) { return row.id === S.target.focusResultId; })) {
    S.selectedResultId = S.target.focusResultId;
    return;
  }
  S.selectedResultId = S.reportResults.length ? S.reportResults[S.reportResults.length - 1].id : "";
}

function getSelectedResult() {
  return S.reportResults.find(function(row) { return row.id === S.selectedResultId; }) || S.reportResults[S.reportResults.length - 1] || null;
}

function getCurrentStudent() {
  return getStudentOptions().find(function(student) { return student.studentKey === S.filters.studentKey; }) || null;
}

function renderFilterMeta() {
  const student = getCurrentStudent();
  const parts = [];
  if (student) {
    parts.push(student.firstName + " " + student.lastName);
  }
  if (S.filters.subject) {
    parts.push(S.filters.subject);
  }
  if (S.filters.examId) {
    const exam = getExamOptions().find(function(item) { return String(item.examId) === String(S.filters.examId); });
    if (exam) {
      parts.push(exam.label);
    }
  }
  $("filterMeta").textContent = parts.length
    ? "Aktif rapor: " + parts.join(" • ")
    : "Önce filtreleri seçerek rapor kapsamını belirle.";
}

function formatSigned(value) {
  const numeric = Number(value || 0);
  return numeric >= 0 ? "+" + numeric : String(numeric);
}

function buildSubjectPerformanceSummary() {
  const map = new Map();
  S.reportResults.forEach(function(row) {
    const label = row.subject || "Genel";
    if (!map.has(label)) {
      map.set(label, {
        label: label,
        exams: 0,
        totalScore: 0,
        totalCorrect: 0,
        totalWrong: 0,
        totalBlank: 0,
      });
    }
    const item = map.get(label);
    item.exams += 1;
    item.totalScore += Number(row.score || 0);
    item.totalCorrect += Number(row.correct || 0);
    item.totalWrong += Number(row.wrong || 0);
    item.totalBlank += Number(row.blank || 0);
  });
  return Array.from(map.values())
    .map(function(item) {
      return Object.assign(item, {
        avgScore: item.exams ? Math.round(item.totalScore / item.exams) : 0,
      });
    })
    .sort(function(a, b) { return b.avgScore - a.avgScore; });
}

function getReportInsights() {
  const student = getCurrentStudent();
  const latest = getSelectedResult();
  const metrics = S.reportResults.map(function(row) { return getBenchmarkStats(row); });
  const avgScore = average(S.reportResults.map(function(row) { return row.score || 0; }));
  const avgBenchmark = average(metrics.map(function(item) { return item.avgScore || 0; }));
  const avgPercentile = average(metrics.map(function(item) { return item.rankPercent || 0; }));
  const avgDelta = metrics.length
    ? Math.round((metrics.reduce(function(total, item) { return total + Number(item.delta || 0); }, 0) / metrics.length) * 10) / 10
    : 0;
  const first = S.reportResults[0] || null;
  const last = S.reportResults[S.reportResults.length - 1] || latest || null;
  const scoreDelta = first && last ? Math.round(((last.score || 0) - (first.score || 0)) * 10) / 10 : 0;
  const scores = S.reportResults.map(function(row) { return Number(row.score || 0); });
  const scoreRange = scores.length ? Math.max.apply(null, scores) - Math.min.apply(null, scores) : 0;
  const subjects = buildSubjectPerformanceSummary();
  const strongestSubject = subjects[0] || null;
  const focusSubject = subjects.length > 1 ? subjects[subjects.length - 1] : strongestSubject;
  const improvementText = S.reportResults.length <= 1
    ? "Henüz tek sınav verisi olduğu için gelişim eğilimi sınırlı okunabiliyor."
    : scoreDelta >= 5
      ? "İlk sınavdan son sınava " + formatSigned(scoreDelta) + " puanlık güçlü bir yükseliş görülüyor."
      : scoreDelta <= -5
        ? "İlk sınavdan son sınava " + formatSigned(scoreDelta) + " puanlık düşüş var; son dönemde konu tekrarı önemli görünüyor."
        : "İlk sınavdan son sınava puan çizgisi genel olarak dengeli seyrediyor.";
  const consistencyText = scoreRange <= 8
    ? "Performans çizgisi oldukça istikrarlı."
    : scoreRange <= 18
      ? "Performans genel olarak dengeli, ancak sınavlar arasında hissedilir oynamalar var."
      : "Sınavlar arasında belirgin performans farkları oluşmuş; çalışma ritmini daha sabit tutmak faydalı olabilir.";
  const benchmarkText = avgDelta >= 0
    ? "Öğrenci, seçili raporda katılım ortalamasının ortalama " + formatSigned(avgDelta) + " puan üzerinde seyrediyor."
    : "Öğrenci, seçili raporda katılım ortalamasının ortalama " + formatSigned(avgDelta) + " puan altında kalıyor.";
  const summaryParagraph = student
    ? student.firstName + " için hazırlanan bu raporda " + S.reportResults.length + " sınav üzerinden ortalama %" + avgScore + " başarı görülüyor. " +
      (strongestSubject ? "En güçlü alan " + strongestSubject.label + " (%" + strongestSubject.avgScore + "). " : "") +
      (focusSubject && strongestSubject && focusSubject.label !== strongestSubject.label ? "Daha fazla destek gerektiren alan " + focusSubject.label + " (%" + focusSubject.avgScore + "). " : "") +
      improvementText
    : "Seçili rapor için profesyonel öğrenci değerlendirmesi hazırlanıyor.";
  const recommendationText = focusSubject
    ? focusSubject.label + " alanında kısa tekrarlar, yanlış yapılan soruların yeniden çözülmesi ve benzer yeni sorularla pekiştirme yapılması sonraki sınavlarda fark oluşturabilir."
    : "Düzenli tekrar, soru çözümü ve yanlış analizi ile performans daha da güçlendirilebilir.";
  const dateRangeText = S.reportResults.length
    ? formatDate(S.reportResults[0]?.dateObj || S.reportResults[0]?.date) + " - " + formatDate(S.reportResults[S.reportResults.length - 1]?.dateObj || S.reportResults[S.reportResults.length - 1]?.date)
    : "—";
  return {
    student: student,
    latest: latest,
    avgScore: avgScore,
    avgBenchmark: avgBenchmark,
    avgPercentile: avgPercentile,
    avgDelta: avgDelta,
    first: first,
    last: last,
    scoreDelta: scoreDelta,
    scoreRange: scoreRange,
    strongestSubject: strongestSubject,
    focusSubject: focusSubject,
    dateRangeText: dateRangeText,
    summaryParagraph: summaryParagraph,
    improvementText: improvementText,
    consistencyText: consistencyText,
    benchmarkText: benchmarkText,
    recommendationText: recommendationText,
  };
}

function renderHeader() {
  const student = getCurrentStudent();
  const latest = getSelectedResult();
  const metrics = S.reportResults.map(function(row) { return getBenchmarkStats(row); });
  const avgScore = average(S.reportResults.map(function(row) { return row.score || 0; }));
  const avgBenchmark = average(metrics.map(function(item) { return item.avgScore || 0; }));
  const avgPercentile = average(metrics.map(function(item) { return item.rankPercent || 0; }));
  const latestBenchmark = latest ? getBenchmarkStats(latest) : { avgScore: 0, delta: 0, rankPercent: 0, participantCount: 0 };
  const deltaLabel = formatSigned(latestBenchmark.delta);
  const insight = getReportInsights();

  $("reportYear").textContent = getAcademicYearText() + " Öğretim Yılı";
  $("reportCountPill").textContent = S.reportResults.length + " sınav";
  $("heroStudentName").textContent = student ? student.firstName + " " + student.lastName : "Öğrenci seç";
  $("heroStudentMeta").textContent = student ? student.grade + ". Sınıf " + student.sube + " Şubesi" : "—";
  $("heroStudentChips").innerHTML =
    "<span class=\"student-chip\">" + esc(S.filters.subject || "Tüm Dersler") + "</span>" +
    "<span class=\"student-chip\">" + esc(S.filters.examId ? "Tek Sınav Görünümü" : "Toplu Görünüm") + "</span>" +
    "<span class=\"student-chip\">" + esc(formatDate(S.reportResults[0]?.dateObj || S.reportResults[0]?.date) + " - " + formatDate(S.reportResults[S.reportResults.length - 1]?.dateObj || S.reportResults[S.reportResults.length - 1]?.date)) + "</span>";

  $("heroScore").textContent = "%" + avgScore;
  $("heroScoreNote").textContent =
    "Seçili sınav grubunda ortalama katılım başarısı %" +
    avgBenchmark +
    ". Öğrencinin ortalama yüzdelik dilimi %" +
    avgPercentile +
    ".";
  $("heroHeadline").textContent = student ? student.firstName + " için Öğrenci Başarı İlerlemesi" : "Öğrenci Başarı İlerlemesi";
  $("heroDescription").textContent = insight.summaryParagraph;
  $("heroComparisonPill").textContent =
    latest
      ? "Son seçili sınavda grup ortalamasına göre " + deltaLabel + " puan fark"
      : "Karşılaştırma verisi bekleniyor";

  $("filterSummaryScore").textContent = latest ? "%" + (latest.score || 0) : "%0";
  $("filterSummaryText").textContent = latest
    ? shortTitle(latest.examTitle, 52) +
      " • Katılım ort. %" +
      latestBenchmark.avgScore +
      " • Yüzdelik %" +
      latestBenchmark.rankPercent
    : "Filtrelenmiş kayıt bulunmuyor.";

  $("metricExamCount").textContent = String(S.reportResults.length);
  $("metricAvgScore").textContent = "%" + avgScore;
  $("metricAvgBenchmark").textContent = "%" + avgBenchmark;
  $("metricAvgPercentile").textContent = "%" + avgPercentile;

  $("compareStrip").innerHTML =
    "<div class=\"compare-card\"><strong>Genel Performans</strong><p>Seçili " + S.reportResults.length + " sınavda ortalama başarı %" + avgScore + ". " + insight.benchmarkText + "</p></div>" +
    "<div class=\"compare-card\"><strong>Gelişim Eğilimi</strong><p>" + insight.improvementText + " " + insight.consistencyText + "</p></div>" +
    "<div class=\"compare-card\"><strong>Çalışma Odağı</strong><p>" + insight.recommendationText + "</p></div>";

  if ($("footerCenterPage1")) {
    $("footerCenterPage1").textContent = insight.summaryParagraph;
  }
  if ($("footerCenterPage2")) {
    $("footerCenterPage2").textContent = insight.recommendationText;
  }
}

function renderCharts() {
  const labels = S.reportResults.map(function(row) {
    return shortTitle(row.examTitle, 18);
  });
  const scores = S.reportResults.map(function(row) { return row.score || 0; });
  const nets = S.reportResults.map(function(row) { return row.netCorrect || 0; });
  const benchmarks = S.reportResults.map(function(row) { return getBenchmarkStats(row).avgScore || 0; });

  if (S.progressChart) {
    S.progressChart.destroy();
  }
  if (S.benchmarkChart) {
    S.benchmarkChart.destroy();
  }

  S.progressChart = new Chart($("progressChart"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Başarı (%)",
          data: scores,
          borderColor: "#3457d5",
          backgroundColor: "rgba(52,87,213,.12)",
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: "#3457d5",
        },
        {
          label: "Net",
          data: nets,
          borderColor: "#159669",
          backgroundColor: "transparent",
          tension: 0.3,
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) { return value; },
          },
        },
      },
    },
  });

  S.benchmarkChart = new Chart($("benchmarkChart"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Öğrenci Başarısı",
          data: scores,
          borderColor: "#3457d5",
          backgroundColor: "rgba(52,87,213,.08)",
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: "#3457d5",
        },
        {
          label: "Katılım Ortalaması",
          data: benchmarks,
          borderColor: "#e55252",
          backgroundColor: "rgba(229,82,82,.08)",
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: "#e55252",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function(value) { return value + "%"; },
          },
        },
      },
    },
  });
}

function renderHistoryTable() {
  $("historyTableBody").innerHTML = S.reportResults
    .slice()
    .reverse()
    .map(function(row) {
      const benchmark = getBenchmarkStats(row);
      const deltaClass = benchmark.delta >= 0 ? "good" : "warn";
      const deltaLabel = benchmark.delta >= 0 ? "+" + benchmark.delta : String(benchmark.delta);
      return (
        "<tr>" +
          "<td>" + esc(row.formattedDate) + "</td>" +
          "<td>" + esc(shortTitle(row.examTitle, 34)) + "</td>" +
          "<td>" + esc(row.subject || "—") + "</td>" +
          "<td><span class=\"score-pill\">%" + (row.score || 0) + "</span></td>" +
          "<td>%" + benchmark.avgScore + "</td>" +
          "<td><span class=\"delta-pill " + deltaClass + "\">" + deltaLabel + "</span></td>" +
          "<td>%" + benchmark.rankPercent + "</td>" +
          "<td class=\"screen-only\"><button class=\"mini-btn\" onclick=\"window.openExamKarneFromStudentReport('" + row.id + "')\">Tek Sınav</button></td>" +
        "</tr>"
      );
    })
    .join("");
}

function renderSelectedExam() {
  const result = getSelectedResult();
  if (!result) {
    $("selectedExamTitle").textContent = "Seçili Sınav";
    $("selectedExamMeta").textContent = "Rapor oluşturmak için öğrenci seç.";
    $("selectedScoreValue").textContent = "%0";
    $("selectedBenchmarkValue").textContent = "%0";
    $("selectedPercentileValue").textContent = "%0";
    $("matrixWrap").innerHTML = "";
    $("selectedExamAction").onclick = null;
    return;
  }
  const benchmark = getBenchmarkStats(result);
  const deltaLabel = benchmark.delta >= 0 ? "+" + benchmark.delta : String(benchmark.delta);
  const blocks = buildMatrixBlocks(result);

  $("selectedExamTitle").textContent = result.examTitle || "Seçili Sınav";
  $("selectedExamMeta").textContent =
    (result.subject || "Genel") +
    " • " +
    formatDateTime(result.dateObj || result.date) +
    " • " +
    (result.total || getQuestionEntries(result).length) +
    " soru";
  $("selectedBenchmarkPill").textContent = "Katılımcı sayısı: " + benchmark.participantCount;
  $("selectedScoreValue").textContent = "%" + (result.score || 0);
  $("selectedBenchmarkValue").textContent = "%" + benchmark.avgScore;
  $("selectedPercentileValue").textContent = "%" + benchmark.rankPercent;
  $("selectedExamAction").onclick = function() {
    window.openExamKarneFromStudentReport(result.id);
  };

  // Tüm sınavların matrisini göster
  if (!S.reportResults.length) {
    $("matrixWrap").innerHTML = "<div class=\"panel-card\" style=\"padding:22px;text-align:center;color:var(--muted);\">Sınav kaydı bulunamadı.</div>";
    return;
  }
  $("matrixWrap").innerHTML = S.reportResults.slice().reverse().map(function(examResult) {
    var examBenchmark = getBenchmarkStats(examResult);
    var examDeltaLabel = formatSigned(examBenchmark.delta);
    var allEntries = getQuestionEntries(examResult);
    var examDate = examResult.formattedDate || "—";
    var examSubject = examResult.subject || "Genel";
    var headerHtml =
      "<div class=\"matrix-card-head\">" +
        "<strong>" + esc(shortTitle(examResult.examTitle, 52)) + "</strong>" +
        "<span>" + esc(examSubject) + " • " + esc(examDate) +
          " • " + (examResult.total || allEntries.length) + " soru" +
          " • %" + (examResult.score || 0) +
          " • Grup farkı: " + examDeltaLabel + " puan</span>" +
      "</div>";
    if (!allEntries.length) {
      return (
        "<div class=\"matrix-card\">" +
          headerHtml +
          "<div class=\"matrix-card-body\"><p style=\"padding:8px 0;color:var(--muted);font-size:13px;\">Bu sınava ait soru bazlı kayıt bulunamadı.</p></div>" +
        "</div>"
      );
    }
    // Ders/bölüm bazında grupla
    var sectionMap = new Map();
    var sectionOrder = [];
    allEntries.forEach(function(entry) {
      var key = entry.sectionTitle || examSubject;
      if (!sectionMap.has(key)) {
        sectionMap.set(key, []);
        sectionOrder.push(key);
      }
      sectionMap.get(key).push(entry);
    });
    var totalD = allEntries.filter(function(e) { return e.outcome === "D"; }).length;
    var totalY = allEntries.filter(function(e) { return e.outcome === "Y"; }).length;
    var totalB = allEntries.filter(function(e) { return e.outcome === "B"; }).length;
    var rowsHtml = sectionOrder.map(function(secLabel) {
      var items = sectionMap.get(secLabel);
      var secD = items.filter(function(e) { return e.outcome === "D"; }).length;
      var secY = items.filter(function(e) { return e.outcome === "Y"; }).length;
      var secB = items.filter(function(e) { return e.outcome === "B"; }).length;
      var cells = items.map(function(entry) {
        var cls = entry.outcome === "D" ? "ok" : entry.outcome === "Y" ? "bad" : "blank";
        var lbl = entry.outcome === "B" ? "•" : (entry.selectedAnswer || "•");
        return (
          "<div class=\"q-cell\">" +
            "<div class=\"q-cell-num\">" + entry.questionNo + "</div>" +
            "<div class=\"q-bubble " + cls + "\">" + esc(lbl) + "</div>" +
          "</div>"
        );
      }).join("");
      return (
        "<div class=\"matrix-row\">" +
          "<div>" +
            "<div class=\"matrix-label\">" + esc(secLabel) + "</div>" +
            "<div class=\"matrix-sub\">" + items.length + " soru — " +
              "<span style=\"color:var(--ok);font-weight:800;\">D:" + secD + "</span> " +
              "<span style=\"color:var(--bad);font-weight:800;\">Y:" + secY + "</span> " +
              "<span style=\"color:var(--blank);font-weight:800;\">B:" + secB + "</span>" +
            "</div>" +
          "</div>" +
          "<div class=\"matrix-cells\">" + cells + "</div>" +
        "</div>"
      );
    }).join("");
    var totalRow =
      "<div style=\"display:flex;align-items:center;gap:16px;padding:10px 0 2px;border-top:2px solid var(--border);margin-top:6px;font-size:12px;font-weight:800;flex-wrap:wrap;\">" +
        "<span style=\"color:var(--slate);\">TOPLAM → " + allEntries.length + " soru</span>" +
        "<span style=\"color:var(--ok);\">✓ Doğru: " + totalD + "</span>" +
        "<span style=\"color:var(--bad);\">✗ Yanlış: " + totalY + "</span>" +
        "<span style=\"color:var(--blank);\">○ Boş: " + totalB + "</span>" +
        "<span style=\"color:var(--slate);margin-left:auto;\">Katılım Ort: %" + examBenchmark.avgScore + " • Yüzdelik: %" + examBenchmark.rankPercent + "</span>" +
      "</div>";
    return (
      "<div class=\"matrix-card\">" +
        headerHtml +
        "<div class=\"matrix-card-body\">" + rowsHtml + totalRow + "</div>" +
      "</div>"
    );
  }).join("");
}

function getChartImage(chart, canvasId) {
  if (chart && typeof chart.toBase64Image === "function") {
    return chart.toBase64Image();
  }
  const canvas = $(canvasId);
  return canvas && typeof canvas.toDataURL === "function" ? canvas.toDataURL("image/png") : "";
}

function renderPrintableMatrix(result) {
  var benchmark = getBenchmarkStats(result);
  var deltaLabel = formatSigned(benchmark.delta);
  var allEntries = getQuestionEntries(result);
  var examSubject = result.subject || "Genel";
  if (!allEntries.length) {
    return "<div class=\"print-empty\">Bu sınav için soru bazlı detay bulunamadı.</div>";
  }
  var sectionMap = new Map();
  var sectionOrder = [];
  allEntries.forEach(function(entry) {
    var key = entry.sectionTitle || examSubject;
    if (!sectionMap.has(key)) { sectionMap.set(key, []); sectionOrder.push(key); }
    sectionMap.get(key).push(entry);
  });
  var totalD = allEntries.filter(function(e) { return e.outcome === "D"; }).length;
  var totalY = allEntries.filter(function(e) { return e.outcome === "Y"; }).length;
  var totalB = allEntries.filter(function(e) { return e.outcome === "B"; }).length;
  var rowsHtml = sectionOrder.map(function(secLabel) {
    var items = sectionMap.get(secLabel);
    var secD = items.filter(function(e) { return e.outcome === "D"; }).length;
    var secY = items.filter(function(e) { return e.outcome === "Y"; }).length;
    var secB = items.filter(function(e) { return e.outcome === "B"; }).length;
    var cells = items.map(function(entry) {
      var cls = entry.outcome === "D" ? "ok" : entry.outcome === "Y" ? "bad" : "blank";
      var lbl = entry.outcome === "B" ? "\u2022" : (entry.selectedAnswer || "\u2022");
      return (
        "<div class=\"print-q-cell\">" +
          "<div class=\"print-q-num\">" + entry.questionNo + "</div>" +
          "<div class=\"print-q-bubble " + cls + "\">" + esc(lbl) + "</div>" +
        "</div>"
      );
    }).join("");
    return (
      "<div class=\"print-matrix-row\">" +
        "<div class=\"print-matrix-label-wrap\">" +
          "<div class=\"print-matrix-label\">" + esc(secLabel) + "</div>" +
          "<div class=\"print-matrix-sub\">" + items.length + " soru — " +
            "<span style=\"color:#179b66\">D:" + secD + "</span> " +
            "<span style=\"color:#d94d4d\">Y:" + secY + "</span> " +
            "<span style=\"color:#8391a7\">B:" + secB + "</span>" +
          "</div>" +
        "</div>" +
        "<div class=\"print-matrix-cells\">" + cells + "</div>" +
      "</div>"
    );
  }).join("");
  var totalsRow =
    "<div class=\"print-matrix-totals\">" +
      "<span>TOPLAM: " + allEntries.length + " soru</span>" +
      "<span style=\"color:#179b66\">\u2713 Dogru: " + totalD + "</span>" +
      "<span style=\"color:#d94d4d\">\u2717 Yanlis: " + totalY + "</span>" +
      "<span style=\"color:#8391a7\">\u25cb Bos: " + totalB + "</span>" +
      "<span style=\"margin-left:auto\">Grup farki: " + deltaLabel + " puan \u2022 Yuzdelik: %" + benchmark.rankPercent + "</span>" +
    "</div>";
  return (
    "<div class=\"print-panel break-avoid\">" +
      "<div class=\"print-panel-head dark\">" +
        "<strong>" + esc(shortTitle(result.examTitle, 60)) + "</strong>" +
        "<span>" + esc(examSubject) + " \u2022 " + esc(result.formattedDate || "\u2014") + " \u2022 " + allEntries.length + " soru \u2022 %" + (result.score || 0) + "</span>" +
      "</div>" +
      "<div class=\"print-panel-body\">" + rowsHtml + totalsRow + "</div>" +
    "</div>"
  );
}

function buildAllPrintableMatrices() {
  if (!S.reportResults.length) {
    return "<div class=\"print-empty\">Soru bazli degerlendirme icin kayit bulunamadi.</div>";
  }
  return S.reportResults.slice().reverse().map(function(examResult) {
    return renderPrintableMatrix(examResult);
  }).join("");
}

function buildPrintableHistoryRows() {
  return S.reportResults
    .slice()
    .reverse()
    .map(function(row) {
      const benchmark = getBenchmarkStats(row);
      const deltaLabel = formatSigned(benchmark.delta);
      return (
        "<tr>" +
          "<td>" + esc(row.formattedDate) + "</td>" +
          "<td>" + esc(row.examTitle || "Sınav") + "</td>" +
          "<td>" + esc(row.subject || "—") + "</td>" +
          "<td><strong>%" + (row.score || 0) + "</strong></td>" +
          "<td>%" + benchmark.avgScore + "</td>" +
          "<td>" + esc(deltaLabel) + "</td>" +
          "<td>%" + benchmark.rankPercent + "</td>" +
        "</tr>"
      );
    })
    .join("");
}

function buildPrintDocument() {
  const student = getCurrentStudent();
  const selected = getSelectedResult();
  const insight = getReportInsights();
  const latestBenchmark = selected ? getBenchmarkStats(selected) : { avgScore: 0, delta: 0, rankPercent: 0, participantCount: 0 };
  const progressChartImage = getChartImage(S.progressChart, "progressChart");
  const benchmarkChartImage = getChartImage(S.benchmarkChart, "benchmarkChart");
  const strongest = insight.strongestSubject
    ? insight.strongestSubject.label + " (%" + insight.strongestSubject.avgScore + ")"
    : "—";
  const focus = insight.focusSubject
    ? insight.focusSubject.label + " (%" + insight.focusSubject.avgScore + ")"
    : "—";
  const selectedSummary = selected
    ? (selected.subject || "Genel") + " • " + formatDateTime(selected.dateObj || selected.date) + " • " + (selected.total || getQuestionEntries(selected).length) + " soru"
    : "Seçili sınav bulunamadı";
  return "<!DOCTYPE html>" +
    "<html lang=\"tr\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">" +
    "<title>Karne - " + esc((student ? student.firstName + " " + student.lastName : "Öğrenci")) + "</title>" +
    "<style>" +
      ":root{--navy:#14243f;--blue:#3457d5;--green:#0f5d4e;--slate:#5f6f86;--muted:#8391a7;--border:#dbe4ef;--ok:#179b66;--bad:#d94d4d;--blank:#c7d2de;}" +
      "*{box-sizing:border-box} html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact;margin:0;padding:0;background:#eef2f7;color:var(--navy);font-family:Arial,sans-serif}" +
      "@page{size:A4;margin:10mm} body{padding:0} .print-wrap{max-width:1024px;margin:0 auto;padding:12px 0}" +
      ".print-sheet{background:#fff;border:1px solid var(--border);border-radius:24px;padding:28px 30px;margin:0 0 16px;page-break-after:always}" +
      ".print-sheet:last-child{page-break-after:auto} .print-top{display:grid;grid-template-columns:1.15fr .85fr;gap:16px;margin-bottom:16px}" +
      ".print-cover{background:linear-gradient(135deg,#143b34,#1c6956);color:#fff;border-radius:22px;padding:24px 26px;min-height:210px}" +
      ".print-kicker{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.7);font-weight:700}" +
      ".print-cover h1{font-size:34px;line-height:1.05;margin:10px 0 0;font-family:Arial,sans-serif}" +
      ".print-cover p{font-size:14px;line-height:1.7;color:rgba(255,255,255,.88);margin:14px 0 0}" +
      ".print-pill{display:inline-block;background:rgba(255,255,255,.16);padding:8px 12px;border-radius:999px;font-size:12px;font-weight:700;margin-top:18px}" +
      ".print-card{border:1px solid var(--border);border-radius:22px;padding:20px;background:#fff}" +
      ".print-name{font-size:28px;font-weight:800;margin:0 0 4px} .print-meta{font-size:13px;color:var(--slate)}" +
      ".print-chip-row{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 16px} .print-chip{padding:7px 10px;border-radius:999px;background:#edf2ff;color:#4057bb;font-size:12px;font-weight:700}" +
      ".print-score-kicker{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:700} .print-score{font-size:56px;font-weight:900;color:var(--blue);line-height:1;margin-top:8px}" +
      ".print-note{font-size:13px;line-height:1.7;color:var(--slate);margin-top:8px}" +
      ".print-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}" +
      ".print-metric{border:1px solid var(--border);border-radius:18px;padding:16px;text-align:center;background:#fff} .print-metric strong{display:block;font-size:30px} .print-metric span{display:block;margin-top:6px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:700}" +
      ".print-analysis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px} .print-analysis-card{border:1px solid var(--border);border-radius:18px;padding:16px;background:#f8fbff}" +
      ".print-analysis-card strong{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#4661c7;margin-bottom:10px} .print-analysis-card p{font-size:14px;line-height:1.7;color:var(--slate);margin:0}" +
      ".print-chart-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px} .print-panel{border:1px solid var(--border);border-radius:20px;background:#fff;overflow:hidden}" +
      ".print-panel-head{padding:14px 16px;border-bottom:1px solid var(--border);background:#f8fbff} .print-panel-head.dark{background:linear-gradient(135deg,#143b34,#1c6956);color:#fff;border-bottom:none}" +
      ".print-panel-head strong{display:block;font-size:19px} .print-panel-head span{display:block;margin-top:4px;font-size:12px;color:inherit;opacity:.82}" +
      ".print-panel-body{padding:16px} .print-chart{width:100%;display:block;border-radius:12px;border:1px solid var(--border);background:#fff}" +
      ".print-table-wrap{border:1px solid var(--border);border-radius:18px;overflow:hidden;margin-bottom:16px} table{width:100%;border-collapse:collapse} thead th{background:#f8fbff;padding:12px 10px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--slate);text-align:left}" +
      "tbody td{padding:11px 10px;border-top:1px solid #ebf0f6;font-size:12px;color:var(--navy)}" +
      ".print-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}" +
      ".print-mini-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px} .print-mini{padding:12px;border-radius:16px;background:#f8fbff;border:1px solid var(--border)} .print-mini strong{display:block;font-size:26px} .print-mini span{display:block;margin-top:6px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:700}" +
      ".print-focus-list{display:grid;grid-template-columns:repeat(2,1fr);gap:10px} .print-focus-item{border:1px solid var(--border);border-radius:18px;padding:14px;background:#fff}" +
      ".print-focus-item strong{display:block;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:8px} .print-focus-item p{margin:0;font-size:16px;line-height:1.6;color:var(--navy)}" +
      ".print-matrix-row{display:grid;grid-template-columns:170px 1fr;gap:12px;padding:10px 0;border-bottom:1px dashed #e7edf3}.print-matrix-row:last-child{border-bottom:none}" +
      ".print-matrix-label{font-size:15px;font-weight:800;color:var(--navy)}" +
      ".print-matrix-sub{font-size:11px;color:var(--slate);margin-top:3px}" +
      ".print-matrix-cells{display:flex;flex-wrap:wrap;gap:5px}" +
      ".print-matrix-totals{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:8px 0 0;border-top:2px solid var(--border);margin-top:6px;font-size:11px;font-weight:800;color:var(--slate)}" +
      ".print-section-title{font-family:Arial,sans-serif;font-size:18px;font-weight:900;color:var(--navy);margin:18px 0 4px}" +
      ".print-section-sub{font-size:12px;line-height:1.6;color:var(--slate);margin-bottom:10px}" +
      ".print-q-cell{width:28px;display:flex;flex-direction:column;align-items:center;gap:3px}.print-q-num{font-size:10px;color:var(--slate);font-weight:700}" +
      ".print-q-bubble{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800}.print-q-bubble.ok{background:var(--ok)}.print-q-bubble.bad{background:var(--bad)}.print-q-bubble.blank{background:var(--blank);color:#526274}" +
      ".print-footer{display:flex;justify-content:space-between;gap:16px;align-items:flex-end;border-top:1px solid var(--border);padding-top:12px;margin-top:18px;font-size:12px;color:var(--slate)} .break-avoid{break-inside:avoid}" +
      ".print-empty{padding:22px;border:1px dashed var(--border);border-radius:16px;background:#fff;color:var(--slate);font-size:14px;line-height:1.7}" +
      "@media print{.print-wrap{padding:0}.print-sheet{margin:0 0 8mm;box-shadow:none}} @media screen{body{background:#e9eef6}}" +
    "</style></head><body><div class=\"print-wrap\">" +
      "<section class=\"print-sheet\">" +
        "<div class=\"print-top\">" +
          "<div class=\"print-cover\">" +
            "<div class=\"print-kicker\">Sınav Karne Merkezi</div>" +
            "<h1>" + esc(student ? student.firstName + " için gelişim raporu" : "Öğrenci gelişim raporu") + "</h1>" +
            "<p>" + esc(insight.summaryParagraph) + "</p>" +
            "<div class=\"print-pill\">" + esc(insight.dateRangeText) + "</div>" +
          "</div>" +
          "<div class=\"print-card\">" +
            "<div class=\"print-name\">" + esc(student ? student.firstName + " " + student.lastName : "Öğrenci") + "</div>" +
            "<div class=\"print-meta\">" + esc(student ? student.grade + ". Sınıf " + student.sube + " Şubesi" : "—") + "</div>" +
            "<div class=\"print-chip-row\">" +
              "<span class=\"print-chip\">" + esc(S.filters.subject || "Tüm Dersler") + "</span>" +
              "<span class=\"print-chip\">" + esc(S.filters.examId ? "Tekli Karne" : "Toplu Karne") + "</span>" +
              "<span class=\"print-chip\">" + esc(S.reportResults.length + " sınav") + "</span>" +
            "</div>" +
            "<div class=\"print-score-kicker\">Seçili raporun ortalama başarı yüzdesi</div>" +
            "<div class=\"print-score\">%" + insight.avgScore + "</div>" +
            "<div class=\"print-note\">Katılım ortalaması %" + insight.avgBenchmark + " ve ortalama yüzdelik dilim %" + insight.avgPercentile + ". " + esc(insight.benchmarkText) + "</div>" +
          "</div>" +
        "</div>" +
        "<div class=\"print-metrics\">" +
          "<div class=\"print-metric\"><strong>" + S.reportResults.length + "</strong><span>Toplam Sınav</span></div>" +
          "<div class=\"print-metric\"><strong>%" + insight.avgScore + "</strong><span>Ortalama Başarı</span></div>" +
          "<div class=\"print-metric\"><strong>" + formatSigned(insight.scoreDelta) + "</strong><span>İlk - Son Fark</span></div>" +
          "<div class=\"print-metric\"><strong>%" + insight.avgPercentile + "</strong><span>Ort. Yüzdelik</span></div>" +
        "</div>" +
        "<div class=\"print-analysis\">" +
          "<div class=\"print-analysis-card\"><strong>Genel Değerlendirme</strong><p>" + esc(insight.benchmarkText) + "</p></div>" +
          "<div class=\"print-analysis-card\"><strong>Gelişim Eğilimi</strong><p>" + esc(insight.improvementText + " " + insight.consistencyText) + "</p></div>" +
          "<div class=\"print-analysis-card\"><strong>Çalışma Önerisi</strong><p>" + esc(insight.recommendationText) + "</p></div>" +
        "</div>" +
        "<div class=\"print-detail-grid break-avoid\">" +
          "<div class=\"print-panel\"><div class=\"print-panel-head\"><strong>Akademik Odak Özeti</strong><span>Raporun en belirgin kuvvetli ve gelişebilir alanları</span></div><div class=\"print-panel-body\"><div class=\"print-focus-list\"><div class=\"print-focus-item\"><strong>Güçlü Alan</strong><p>" + esc(strongest) + "</p></div><div class=\"print-focus-item\"><strong>Odaklanılacak Alan</strong><p>" + esc(focus) + "</p></div></div></div></div>" +
          "<div class=\"print-panel\"><div class=\"print-panel-head\"><strong>Son Seçili Sınav Özeti</strong><span>" + esc(selectedSummary) + "</span></div><div class=\"print-panel-body\"><div class=\"print-mini-grid\"><div class=\"print-mini\"><strong>%" + (selected ? selected.score || 0 : 0) + "</strong><span>Öğrenci Skoru</span></div><div class=\"print-mini\"><strong>%" + latestBenchmark.avgScore + "</strong><span>Katılım Ort.</span></div><div class=\"print-mini\"><strong>%" + latestBenchmark.rankPercent + "</strong><span>Yüzdelik</span></div></div></div></div>" +
        "</div>" +
        "<div class=\"print-chart-grid\">" +
          "<div class=\"print-panel break-avoid\"><div class=\"print-panel-head\"><strong>Sınav Bazlı Başarı Grafiği</strong><span>Başarı ve net gelişimi</span></div><div class=\"print-panel-body\">" + (progressChartImage ? "<img class=\"print-chart\" src=\"" + progressChartImage + "\" alt=\"Başarı grafiği\">" : "<div class=\"print-empty\">Grafik görüntüsü hazırlanamadı.</div>") + "</div></div>" +
          "<div class=\"print-panel break-avoid\"><div class=\"print-panel-head\"><strong>Kıyaslama Grafiği</strong><span>Öğrenci skoru ile grup ortalaması</span></div><div class=\"print-panel-body\">" + (benchmarkChartImage ? "<img class=\"print-chart\" src=\"" + benchmarkChartImage + "\" alt=\"Kıyaslama grafiği\">" : "<div class=\"print-empty\">Grafik görüntüsü hazırlanamadı.</div>") + "</div></div>" +
        "</div>" +
        "<div class=\"print-footer\"><div><strong>By Kemal Öğretmen</strong><br>kemalogretmenim.com.tr</div><div>Profesyonel öğrenci performans özeti</div><div>Sayfa 1 / 2</div></div>" +
      "</section>" +
      "<section class=\"print-sheet\">" +
        "<section class=\"print-panel\"><div class=\"print-panel-head\"><strong>Sınav Geçmişi ve Kıyaslama Tablosu</strong><span>Öğrencinin seçili tüm sınav performansları</span></div><div class=\"print-panel-body\"><div class=\"print-table-wrap\"><table><thead><tr><th>Tarih</th><th>Sınav</th><th>Ders</th><th>Başarı</th><th>Katılım Ort.</th><th>Fark</th><th>Yüzdelik</th></tr></thead><tbody>" + buildPrintableHistoryRows() + "</tbody></table></div></div></section>" +
        "<div class=\"print-section-title\">🔎 Soru Bazlı Kompakt Değerlendirme</div>" +
        "<div class=\"print-section-sub\">Tüm denemelerdeki her dersin soru bazlı doğru/yanlış/boş matrisi aşağıda sıralanmaktadır.</div>" +
        "<div style=\"display:flex;flex-direction:column;gap:14px;margin-top:12px;\">" + buildAllPrintableMatrices() + "</div>" +
        "<div class=\"print-footer\"><div><strong>By Kemal Öğretmen</strong><br>kemalogretmenim.com.tr</div><div>" + esc(insight.recommendationText) + "</div><div>Sayfa 2 / 2</div></div>" +
      "</section>" +
    "</div>" +
    "<script>(function(){var imgs=Array.prototype.slice.call(document.images||[]); Promise.all(imgs.map(function(img){ return img.complete ? Promise.resolve() : new Promise(function(resolve){ img.onload=img.onerror=resolve; }); })).then(function(){ setTimeout(function(){ window.print(); }, 250); }); window.addEventListener('afterprint', function(){ setTimeout(function(){ window.close(); }, 120); }); })();<\/script>" +
    "</body></html>";
}

function sanitizeFileNamePart(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "karne";
}

function setExportButtonsState(disabled, label) {
  [
    { id: "pngBtn", original: "🖼️ PNG İndir" },
    { id: "jpegBtn", original: "🖼️ JPEG İndir" },
  ].forEach(function(item) {
    var button = $(item.id);
    if (!button) {
      return;
    }
    button.disabled = !!disabled;
    button.style.opacity = disabled ? "0.7" : "1";
    button.style.cursor = disabled ? "wait" : "pointer";
    button.textContent = disabled && label ? label : item.original;
  });
}

function setPrintButtonState(disabled, label) {
  var button = $("printBtn");
  if (!button) {
    return;
  }
  button.disabled = !!disabled;
  button.style.opacity = disabled ? "0.7" : "1";
  button.style.cursor = disabled ? "wait" : "pointer";
  button.textContent = disabled && label ? label : "🖨️ Yazdır / PDF";
}

async function captureReportSheetCanvases() {
  if (typeof window.html2canvas !== "function") {
    throw new Error("html2canvas yüklenemedi");
  }
  var sheets = Array.from(document.querySelectorAll("#reportWrap .sheet"));
  var canvases = [];
  for (var i = 0; i < sheets.length; i += 1) {
    var sheet = sheets[i];
    var targetWidth = 1240;
    var sheetWidth = Math.max(sheet.offsetWidth || 1, 1);
    var scale = Math.max(2, Math.min(3, targetWidth / sheetWidth));
    var canvas = await window.html2canvas(sheet, {
      backgroundColor: "#ffffff",
      scale: scale,
      useCORS: true,
      allowTaint: true,
      logging: false,
      imageTimeout: 0,
    });
    canvases.push(canvas);
  }
  return canvases;
}

function buildA4ImagePrintDocument(imageUrls) {
  var printFrameId = "karne-print-frame";
  return "<!DOCTYPE html>" +
    "<html lang=\"tr\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">" +
    "<title>Sınav Karne Merkezi PDF</title>" +
    "<style>" +
      "@page{size:A4 portrait;margin:0}" +
      "html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact;margin:0;padding:0;background:#fff}" +
      "body{font-family:Arial,sans-serif}" +
      ".pdf-page{width:210mm;height:297mm;display:flex;align-items:center;justify-content:center;page-break-after:always;background:#fff;overflow:hidden}" +
      ".pdf-page:last-child{page-break-after:auto}" +
      ".pdf-image{width:210mm;height:297mm;display:block;object-fit:contain;background:#fff}" +
      "@media screen{body{background:#dde5f2}.pdf-page{margin:0 auto 12px;box-shadow:0 10px 30px rgba(15,23,42,.12)}}" +
    "</style></head><body>" +
    imageUrls.map(function(url) {
      return "<section class=\"pdf-page\"><img class=\"pdf-image\" src=\"" + url + "\" alt=\"Karne sayfası\"></section>";
    }).join("") +
    "<script>(function(){var imgs=Array.prototype.slice.call(document.images||[]); Promise.all(imgs.map(function(img){ return img.complete ? Promise.resolve() : new Promise(function(resolve){ img.onload=img.onerror=resolve; }); })).then(function(){ setTimeout(function(){ window.print(); }, 250); }); window.addEventListener('afterprint', function(){ setTimeout(function(){ try { if (window.frameElement && window.parent && window.parent.document) { var frame = window.parent.document.getElementById('" + printFrameId + "'); if (frame) { frame.remove(); } return; } } catch (error) {} try { window.close(); } catch (error) {} }, 120); }); })();<\/script>" +
    "</body></html>";
}

function removePrintFrame() {
  var existingFrame = document.getElementById("karne-print-frame");
  if (existingFrame) {
    existingFrame.remove();
  }
}

function createPrintFrame() {
  removePrintFrame();
  var frame = document.createElement("iframe");
  frame.id = "karne-print-frame";
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.opacity = "0";
  frame.style.pointerEvents = "none";
  frame.style.border = "0";
  document.body.appendChild(frame);
  return frame;
}

function downloadCanvasFile(canvas, fileName, format) {
  return new Promise(function(resolve, reject) {
    var mime = format === "jpeg" ? "image/jpeg" : "image/png";
    var quality = format === "jpeg" ? 0.96 : 1;
    function finish(url) {
      var link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function() {
        resolve();
      }, 120);
    }
    if (canvas.toBlob) {
      canvas.toBlob(function(blob) {
        if (!blob) {
          reject(new Error("Dosya oluşturulamadı."));
          return;
        }
        var url = URL.createObjectURL(blob);
        finish(url);
        setTimeout(function() {
          URL.revokeObjectURL(url);
        }, 1500);
      }, mime, quality);
      return;
    }
    try {
      finish(canvas.toDataURL(mime, quality));
    } catch (error) {
      reject(error);
    }
  });
}

async function exportReportAsImages(format) {
  if (!S.reportResults.length) {
    return;
  }
  var student = getCurrentStudent();
  var baseName = [
    sanitizeFileNamePart(student?.firstName || "ogrenci"),
    sanitizeFileNamePart(student?.lastName || "karne-merkezi"),
    "karne-merkezi",
  ].join("-");
  setExportButtonsState(true, format === "jpeg" ? "JPEG Hazırlanıyor..." : "PNG Hazırlanıyor...");
  try {
    var canvases = await captureReportSheetCanvases();
    for (var i = 0; i < canvases.length; i += 1) {
      var canvas = canvases[i];
      await downloadCanvasFile(
        canvas,
        baseName + "-sayfa-" + (i + 1) + "." + (format === "jpeg" ? "jpg" : "png"),
        format
      );
      await new Promise(function(resolve) { setTimeout(resolve, 180); });
    }
  } catch (error) {
    console.error(error);
    window.alert("Görsel çıktı hazırlanırken bir hata oluştu. Lütfen tekrar deneyin.");
  } finally {
    setExportButtonsState(false);
  }
}

async function printReport() {
  if (!S.reportResults.length) {
    window.print();
    return;
  }
  setPrintButtonState(true, "PDF Hazırlanıyor...");
  try {
    var printDoc = buildPrintDocument();
    var printWindow = null;
    try {
      printWindow = window.open("about:blank", "_blank");
    } catch (openErr) {
      printWindow = null;
    }
    if (printWindow) {
      try { printWindow.opener = null; } catch (e) {}
      printWindow.document.open();
      printWindow.document.write(printDoc);
      printWindow.document.close();
    } else {
      var printFrame = createPrintFrame();
      var frameDoc = printFrame.contentWindow ? printFrame.contentWindow.document : null;
      if (!frameDoc) {
        removePrintFrame();
        window.alert("Yazdırma penceresi açılamadı. Tarayıcınızda pop-up engelleyiciyi kapatıp tekrar deneyin.");
        return;
      }
      frameDoc.open();
      frameDoc.write(printDoc);
      frameDoc.close();
    }
  } catch (error) {
    console.error(error);
    window.alert("PDF çıktısı hazırlanırken hata oluştu. Lütfen tekrar deneyin.");
  } finally {
    setPrintButtonState(false);
  }
}

function exportExcel() {
  const summaryRows = S.reportResults
    .slice()
    .reverse()
    .map(function(row) {
      const benchmark = getBenchmarkStats(row);
      return {
        "Ad": row.firstName,
        "Soyad": row.lastName,
        "Sınıf": row.grade + ". Sınıf",
        "Şube": row.sube || "—",
        "Ders": row.subject || "—",
        "Sınav": row.examTitle || "—",
        "Tarih": row.formattedDateTime,
        "Doğru": row.correct || 0,
        "Yanlış": row.wrong || 0,
        "Boş": row.blank || 0,
        "Net": row.netCorrect ?? row.correct ?? 0,
        "Başarı (%)": row.score || 0,
        "Katılım Ortalaması (%)": benchmark.avgScore,
        "Puan Farkı": benchmark.delta,
        "Yüzdelik Dilim (%)": benchmark.rankPercent,
      };
    });

  const detailRows = [];
  S.reportResults.forEach(function(row) {
    const benchmark = getBenchmarkStats(row);
    getQuestionEntries(row).forEach(function(entry) {
      detailRows.push({
        "Ad": row.firstName,
        "Soyad": row.lastName,
        "Sınıf": row.grade + ". Sınıf",
        "Şube": row.sube || "—",
        "Ders": row.subject || "—",
        "Sınav": row.examTitle || "—",
        "Tarih": row.formattedDateTime,
        "Katılım Ortalaması (%)": benchmark.avgScore,
        "Yüzdelik Dilim (%)": benchmark.rankPercent,
        "Soru No": entry.questionNo,
        "Bölüm": entry.sectionTitle || row.subject || "—",
        "Verilen Cevap": entry.selectedAnswer || "Boş",
        "Doğru Cevap": entry.correctAnswer || "—",
        "Sonuç": entry.outcome === "D" ? "Doğru" : entry.outcome === "Y" ? "Yanlış" : "Boş",
      });
    });
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Karne Ozeti");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), "Soru Matris Verisi");
  XLSX.writeFile(
    wb,
    (getCurrentStudent()?.firstName || "ogrenci") + "_" + (getCurrentStudent()?.lastName || "karne") + "_sinav_karne_merkezi.xlsx"
  );
}

function renderEmptyState() {
  $("reportWrap").style.display = "none";
  $("emptyReport").style.display = "block";
}

function renderReport() {
  $("loadingState").style.display = "none";
  $("errorState").style.display = "none";
  $("app").style.display = "block";
  renderFilterMeta();
  if (!S.reportResults.length) {
    renderEmptyState();
    return;
  }
  $("emptyReport").style.display = "none";
  $("reportWrap").style.display = "block";
  renderHeader();
  renderCharts();
  renderHistoryTable();
  renderSelectedExam();
}

function refreshReport() {
  syncFilterOptions();
  applyFilters();
  renderReport();
}

window.openExamKarneFromStudentReport = function(id) {
  const result = S.allResults.find(function(row) { return row.id === id; });
  if (!result || !result.examId) {
    return;
  }
  localStorage.setItem(SINGLE_EXAM_STORAGE_KEY, JSON.stringify(result));
  window.open("/sinav_sitesi/sinav.html?examId=" + encodeURIComponent(result.examId) + "&adminKarne=1", "_blank");
};

async function initApp() {
  S.target = parseStoredTarget();
  $("reportYear").textContent = getAcademicYearText() + " Öğretim Yılı";

  const auth = getAuth(app);
  onAuthStateChanged(auth, async function(user) {
    if (!user) {
      showError("Yönetici oturumu bulunamadı", "Önce sınav yönetim panelinden yetkili hesabınla giriş yapman gerekiyor.");
      return;
    }
    const admin = await isAdminUser(user);
    if (!admin) {
      showError("Yetki doğrulanamadı", "Bu ekran yalnızca sınav yöneticileri için açıktır.");
      return;
    }

    try {
      setLoading("Sınav sonuçları ve filtre verileri yükleniyor...");
      S.allResults = await loadAllResults();
      if (!S.allResults.length) {
        showError("Kayıt bulunamadı", "Sınav sonuçları oluştuğunda karne merkezi otomatik veri göstermeye başlayacak.");
        return;
      }

      S.filters.grade = S.target?.grade ? String(S.target.grade) : "";
      S.filters.studentKey = S.target?.studentKey || "";
      S.filters.subject = "";
      S.filters.examId = S.target?.examId || "";
      refreshReport();
    } catch (error) {
      console.error(error);
      showError("Karne merkezi yüklenemedi", "Veriler alınırken beklenmeyen bir hata oluştu. Lütfen tekrar dene.");
    }
  });
}

document.addEventListener("DOMContentLoaded", function() {
  $("backBtn").addEventListener("click", function() {
    window.location.href = "/sinav_sitesi/admin.html";
  });
  $("printBtn").addEventListener("click", function() {
    printReport();
  });
  $("excelBtn").addEventListener("click", function() {
    exportExcel();
  });
  $("pngBtn").addEventListener("click", function() {
    exportReportAsImages("png");
  });
  $("jpegBtn").addEventListener("click", function() {
    exportReportAsImages("jpeg");
  });
  $("gradeFilter").addEventListener("change", function(event) {
    S.filters.grade = event.target.value;
    S.filters.studentKey = "";
    S.filters.subject = "";
    S.filters.examId = "";
    refreshReport();
  });
  $("studentFilter").addEventListener("change", function(event) {
    S.filters.studentKey = event.target.value;
    S.filters.subject = "";
    S.filters.examId = "";
    refreshReport();
  });
  $("subjectFilter").addEventListener("change", function(event) {
    S.filters.subject = event.target.value;
    S.filters.examId = "";
    refreshReport();
  });
  $("examFilter").addEventListener("change", function(event) {
    S.filters.examId = event.target.value;
    refreshReport();
  });
  $("clearFiltersBtn").addEventListener("click", function() {
    S.filters.grade = S.target?.grade ? String(S.target.grade) : "";
    S.filters.studentKey = S.target?.studentKey || "";
    S.filters.subject = "";
    S.filters.examId = "";
    refreshReport();
  });
  initApp();
});
