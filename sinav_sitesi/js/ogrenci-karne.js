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
    parsed.studentKey = parsed.studentKey || buildStudentKey(parsed);
    return parsed;
  } catch (error) {
    return null;
  }
}

function normalizeResult(row) {
  const dateObj = toDateObject(row.date);
  const studentKey = row.studentKey || buildStudentKey(row);
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
      if (S.filters.studentKey && row.studentKey !== S.filters.studentKey) {
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
    if (S.filters.studentKey && row.studentKey !== S.filters.studentKey) {
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
      if (S.filters.studentKey && row.studentKey !== S.filters.studentKey) {
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

function renderHeader() {
  const student = getCurrentStudent();
  const latest = getSelectedResult();
  const metrics = S.reportResults.map(function(row) { return getBenchmarkStats(row); });
  const avgScore = average(S.reportResults.map(function(row) { return row.score || 0; }));
  const avgBenchmark = average(metrics.map(function(item) { return item.avgScore || 0; }));
  const avgPercentile = average(metrics.map(function(item) { return item.rankPercent || 0; }));
  const latestBenchmark = latest ? getBenchmarkStats(latest) : { avgScore: 0, delta: 0, rankPercent: 0, participantCount: 0 };
  const deltaLabel = latestBenchmark.delta >= 0 ? "+" + latestBenchmark.delta : String(latestBenchmark.delta);

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
    "Seçili raporda ortalama katılım başarısı %" +
    avgBenchmark +
    ". Öğrencinin ortalama yüzdelik dilimi %" +
    avgPercentile +
    ".";
  $("heroHeadline").textContent = student ? student.firstName + " için Öğrenci Başarı İlerlemesi" : "Öğrenci Başarı İlerlemesi";
  $("heroDescription").textContent =
    "Bu rapor, öğrencinin seçili sınavlarındaki gelişimini, sınav katılımcı ortalamalarına göre konumunu ve seçili sınavın soru bazlı kompakt değerlendirmesini birlikte sunar.";
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
    "<div class=\"compare-card\"><strong>Katılım Ortalaması</strong><p>Seçili rapordaki sınavlara katılan öğrencilerin ortalama başarısı %" + avgBenchmark + ". Bu değer, öğrencinin norm referanslı konumunu okumayı kolaylaştırır.</p></div>" +
    "<div class=\"compare-card\"><strong>Yüzdelik Dilim</strong><p>Öğrenci, seçili sınav havuzunda ortalama olarak %" + avgPercentile + " yüzdelik dilimde yer alıyor. Bu oran, kendi grubuna göre göreli konumunu gösterir.</p></div>" +
    "<div class=\"compare-card\"><strong>Son Sınav Yorumu</strong><p>Son seçili sınavda öğrenci, aynı sınava giren " + latestBenchmark.participantCount + " kişilik gruba göre " + deltaLabel + " puan farkla konumlandı.</p></div>";
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

  $("matrixWrap").innerHTML = blocks.length
    ? blocks.map(function(block) {
        const rowsHtml = block.rows.map(function(row) {
          const cells = row.items.map(function(entry) {
            const cls = entry.outcome === "D" ? "ok" : entry.outcome === "Y" ? "bad" : "blank";
            const label = entry.outcome === "B" ? "•" : (entry.selectedAnswer || "•");
            return (
              "<div class=\"q-cell\">" +
                "<div class=\"q-cell-num\">" + entry.questionNo + "</div>" +
                "<div class=\"q-bubble " + cls + "\">" + esc(label) + "</div>" +
              "</div>"
            );
          }).join("");
          return (
            "<div class=\"matrix-row\">" +
              "<div><div class=\"matrix-label\">" + esc(row.label) + "</div><div class=\"matrix-sub\">Sorular bu bölümde kompakt matris düzeninde gösterilir.</div></div>" +
              "<div class=\"matrix-cells\">" + cells + "</div>" +
            "</div>"
          );
        }).join("");
        return (
          "<div class=\"matrix-card\">" +
            "<div class=\"matrix-card-head\"><strong>" + esc(shortTitle(result.examTitle, 46)) + "</strong><span>Sorular " + block.start + " - " + block.end + " • Fark " + deltaLabel + " puan</span></div>" +
            "<div class=\"matrix-card-body\">" + rowsHtml + "</div>" +
          "</div>"
        );
      }).join("")
    : "<div class=\"panel-card\">Bu sınava ait soru bazlı kayıt bulunamadı.</div>";
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
    window.print();
  });
  $("excelBtn").addEventListener("click", function() {
    exportExcel();
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
