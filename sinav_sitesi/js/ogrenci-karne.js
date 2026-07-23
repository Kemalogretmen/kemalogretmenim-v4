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
  reportKind: "",
  reportReady: false,
  listReady: false,
  flow: {
    mode: "",
    reportType: "all",
    selectedSubjects: [],
    studentSearch: "",
    listExamKey: "",
    listScope: "all",
    listScopeValue: "",
  },
  rankScope: "all",
  degree: {
    examKey: "",
    scope: "all",
    scopeValue: "",
  },
  progressChart: null,
  benchmarkChart: null,
};

function $(id) {
  return document.getElementById(id);
}

function scrollStudentReportSection(targetId) {
  const target = document.getElementById(targetId) || document.querySelector('[data-report-anchor="' + targetId + '"]');
  if (!target) {
    return;
  }
  const detailsParent = target.closest && target.closest("details");
  if (detailsParent && !detailsParent.open) {
    detailsParent.open = true;
  }
  if (target.tagName === "DETAILS" && !target.open) {
    target.open = true;
  }
  window.requestAnimationFrame(function() {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
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

function gradeLevels() {
  return ["1", "2", "3", "4", "5", "6", "7", "8"];
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
  const scoreScale = Number(row.scoreScale || 0) > 0 ? Number(row.scoreScale) : 100;
  const examScore = Number.isFinite(Number(row.examScore)) ? Number(row.examScore) : Number(row.score || 0);
  const score100 = Number.isFinite(Number(row.score100)) ? Number(row.score100) : Number(row.score || 0);
  return Object.assign({}, row, {
    studentKey,
    correct: Number(row.correct || 0),
    wrong: Number(row.wrong || 0),
    blank: Number(row.blank || 0),
    netCorrect: typeof row.netCorrect === "number" ? row.netCorrect : Number(row.netCorrect || row.correct || 0),
    score: score100,
    score100: score100,
    examScore: Math.round(examScore * 100) / 100,
    scoreScale: scoreScale,
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

function getRankingScore(row) {
  if (!row) return 0;
  const examScore = Number(row.examScore);
  if (Number.isFinite(examScore)) return examScore;
  return Number(row.score100 || row.score || 0);
}

function formatPointValue(value) {
  const num = Math.round((Number(value) || 0) * 100) / 100;
  return Number.isInteger(num) ? String(num) : num.toFixed(2).replace(/\.?0+$/, "");
}

function formatExamScore(row) {
  const scale = Number(row?.scoreScale || 100) || 100;
  return formatPointValue(row?.examScore || 0) + " / " + scale;
}

function averageExamScore(rows) {
  return rows.length
    ? Math.round((rows.reduce(function(total, row) { return total + getRankingScore(row); }, 0) / rows.length) * 100) / 100
    : 0;
}

function isCompletedResult(row) {
  return row && row.status !== "in_progress";
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
      avgPoint: getRankingScore(result),
      rankPercent: 100,
      delta: 0,
      pointDelta: 0,
      participantCount: 1,
    };
  }
  const avgScore = average(cohort.map(function(row) { return row.score || 0; }));
  const avgPoint = averageExamScore(cohort);
  const lowerOrEqual = cohort.filter(function(row) {
    return getRankingScore(row) <= getRankingScore(result);
  }).length;
  const rankPercent = Math.round((lowerOrEqual / cohort.length) * 100);
  return {
    avgScore,
    avgPoint,
    rankPercent,
    delta: Math.round(((result.score || 0) - avgScore) * 10) / 10,
    pointDelta: Math.round((getRankingScore(result) - avgPoint) * 100) / 100,
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
      learningOutcome: String(item?.learningOutcome || "").trim(),
      selectedAnswer,
      correctAnswer,
      outcome,
    };
  });
}

function isOutcomeMode() {
  return S.reportKind === "outcome" || !!S.target?.outcomeMode;
}

function buildOutcomeRows(result) {
  const map = new Map();
  getQuestionEntries(result).forEach(function(entry) {
    const label = String(entry.learningOutcome || "").trim();
    if (!label) {
      return;
    }
    const subject = entry.sectionTitle || result.subject || "Genel";
    const key = subject + "||" + label;
    if (!map.has(key)) {
      map.set(key, {
        subject,
        label,
        total: 0,
        correct: 0,
        wrong: 0,
        blank: 0,
        questions: [],
        correctQuestions: [],
        wrongQuestions: [],
        blankQuestions: [],
      });
    }
    const row = map.get(key);
    row.total += 1;
    row.questions.push(entry.questionNo);
    if (entry.outcome === "D") {
      row.correct += 1;
      row.correctQuestions.push(entry.questionNo);
    } else if (entry.outcome === "Y") {
      row.wrong += 1;
      row.wrongQuestions.push(entry.questionNo);
    } else {
      row.blank += 1;
      row.blankQuestions.push(entry.questionNo);
    }
  });
  return Array.from(map.values()).map(function(row) {
    row.score = row.total ? Math.round((row.correct / row.total) * 100) : 0;
    return row;
  });
}

function buildAllOutcomeRows() {
  return S.reportResults.flatMap(function(result) {
    return buildOutcomeRows(result).map(function(row) {
      return Object.assign({ result }, row);
    });
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
  }).filter(isCompletedResult);
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
        city: getRowCity(row),
        district: getRowDistrict(row),
        school: getRowSchool(row),
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

function getStudentOptionsForGrade(grade, searchText) {
  const previousGrade = S.filters.grade;
  S.filters.grade = grade || "";
  const search = normalizeKeyPart(searchText || "");
  const students = getStudentOptions().filter(function(student) {
    if (!search) {
      return true;
    }
    return normalizeKeyPart(student.firstName + " " + student.lastName).includes(search);
  });
  S.filters.grade = previousGrade;
  return students;
}

function getSelectedStudentResults() {
  return S.allResults.filter(function(row) {
    if (S.filters.grade && String(row.grade) !== String(S.filters.grade)) {
      return false;
    }
    return matchesStudentSelection(row);
  }).sort(function(a, b) {
    return (a.dateObj?.getTime?.() || 0) - (b.dateObj?.getTime?.() || 0);
  });
}

function getAvailableSubjectsForStudent(outcomeOnly) {
  const subjects = new Set();
  getSelectedStudentResults().forEach(function(row) {
    if (outcomeOnly && !buildOutcomeRows(row).length) {
      return;
    }
    subjects.add(row.subject || "Genel");
  });
  return Array.from(subjects).sort(function(a, b) { return a.localeCompare(b, "tr"); });
}

function getListExamOptions() {
  const grade = String(S.filters.grade || "");
  const map = new Map();
  S.allResults.filter(isCompletedResult).forEach(function(row) {
    if (grade && String(row.grade || "") !== grade) {
      return;
    }
    const key = getExamComparisonKey(row);
    if (!map.has(key)) {
      map.set(key, {
        key: key,
        title: row.examTitle || "Sınav",
        subject: row.subject || "Genel",
        grade: row.grade || "",
        dateObj: row.dateObj || null,
        formattedDate: row.formattedDate || "—",
        count: 0,
      });
    }
    const item = map.get(key);
    item.count += 1;
    const time = row.dateObj?.getTime?.() || 0;
    const currentTime = item.dateObj?.getTime?.() || 0;
    if (time > currentTime) {
      item.dateObj = row.dateObj || item.dateObj;
      item.formattedDate = row.formattedDate || item.formattedDate;
      item.title = row.examTitle || item.title;
      item.subject = row.subject || item.subject;
      item.grade = row.grade || item.grade;
    }
  });
  return Array.from(map.values()).sort(function(a, b) {
    return (b.dateObj?.getTime?.() || 0) - (a.dateObj?.getTime?.() || 0);
  });
}

function getListExamRows() {
  if (!S.flow.listExamKey) {
    return [];
  }
  return S.allResults.filter(function(row) {
    if (!isCompletedResult(row) || getExamComparisonKey(row) !== S.flow.listExamKey) {
      return false;
    }
    return !S.filters.grade || String(row.grade || "") === String(S.filters.grade);
  });
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

function renderWorkflow() {
  if (!$("workflowCard")) {
    return;
  }
  if (!S.flow.mode) {
    S.flow.mode = "individual";
  }
  $("modeIndividualBtn").classList.toggle("active", S.flow.mode === "individual");
  $("modeListBtn").classList.toggle("active", S.flow.mode === "list");
  $("individualFlowPane").classList.toggle("active", S.flow.mode === "individual");
  $("listFlowPane").classList.toggle("active", S.flow.mode === "list");

  if (!S.filters.grade) {
    S.filters.grade = S.target?.grade ? String(S.target.grade) : "1";
  }
  setSelectOptions("flowGradeSelect", gradeLevels(), "Sınıf Seç", S.filters.grade, function(grade) {
    return { value: grade, label: grade + ". Sınıf" };
  });
  setSelectOptions("listGradeSelect", gradeLevels(), "Sınıf Seç", S.filters.grade, function(grade) {
    return { value: grade, label: grade + ". Sınıf" };
  });

  const students = getStudentOptionsForGrade(S.filters.grade, S.flow.studentSearch);
  if (S.filters.studentKey && !students.some(function(student) { return student.studentKey === S.filters.studentKey; })) {
    S.filters.studentKey = "";
  }
  setSelectOptions("flowStudentSelect", students, "Öğrenci Seç", S.filters.studentKey, function(student) {
    return {
      value: student.studentKey,
      label: student.firstName + " " + student.lastName + " • " + student.grade + ". Sınıf " + student.sube,
    };
  });
  $("flowStudentSearch").value = S.flow.studentSearch || "";

  $("reportAllBtn").classList.toggle("active", S.flow.reportType === "all");
  $("reportOutcomeBtn").classList.toggle("active", S.flow.reportType === "outcome");
  const subjectOptions = getAvailableSubjectsForStudent(S.flow.reportType === "outcome");
  if (S.flow.reportType === "outcome") {
    if (!S.flow.selectedSubjects.length || S.flow.selectedSubjects.some(function(subject) { return !subjectOptions.includes(subject); })) {
      S.flow.selectedSubjects = subjectOptions.slice();
    }
    $("flowSubjectChecks").style.display = "grid";
    $("flowSubjectChecks").innerHTML = subjectOptions.length
      ? subjectOptions.map(function(subject) {
          const checked = S.flow.selectedSubjects.includes(subject) ? " checked" : "";
          return "<label class=\"subject-check\"><input type=\"checkbox\" value=\"" + esc(subject) + "\"" + checked + "> " + esc(subject) + "</label>";
        }).join("")
      : "<div class=\"flow-note\" style=\"grid-column:1/-1\">Bu öğrenci için kazanım girilmiş sınav bulunamadı.</div>";
    Array.from($("flowSubjectChecks").querySelectorAll("input[type='checkbox']")).forEach(function(input) {
      input.addEventListener("change", function() {
        S.flow.selectedSubjects = Array.from($("flowSubjectChecks").querySelectorAll("input[type='checkbox']:checked")).map(function(item) { return item.value; });
      });
    });
  } else {
    $("flowSubjectChecks").style.display = "none";
    $("flowSubjectChecks").innerHTML = "";
    S.flow.selectedSubjects = [];
  }
  $("generateIndividualBtn").disabled = !S.filters.studentKey || (S.flow.reportType === "outcome" && !subjectOptions.length);
  $("individualFlowNote").textContent = S.flow.reportType === "outcome"
    ? "Kazanım karnesi, yalnızca kazanım / öğrenme çıktısı girilmiş sınavları değerlendirir."
    : "Tüm testler karnesinde öğrencinin girdiği sınavlar listelenir; her satırdan tek sınav karnesine geçilebilir.";

  const listExams = getListExamOptions();
  if (S.flow.listExamKey && !listExams.some(function(item) { return item.key === S.flow.listExamKey; })) {
    S.flow.listExamKey = "";
  }
  if (!S.flow.listExamKey && listExams.length) {
    S.flow.listExamKey = listExams[0].key;
  }
  setSelectOptions("listExamSelect", listExams, "Sınav Seç", S.flow.listExamKey, function(item) {
    return {
      value: item.key,
      label: item.title + " • " + item.subject + " • " + item.formattedDate + " • " + item.count + " öğrenci",
    };
  });
  $("listScopeSelect").value = S.flow.listScope || "all";
  const listRows = getListExamRows();
  const scopeOptions = getDegreeScopeOptions(listRows, S.flow.listScope);
  if (S.flow.listScope === "all") {
    S.flow.listScopeValue = "";
    $("listScopeValueSelect").innerHTML = "<option value=\"\">Tüm kayıtlar</option>";
    $("listScopeValueSelect").disabled = true;
  } else {
    $("listScopeValueSelect").disabled = false;
    if (S.flow.listScopeValue && !scopeOptions.some(function(item) { return item.value === S.flow.listScopeValue; })) {
      S.flow.listScopeValue = "";
    }
    if (!S.flow.listScopeValue && scopeOptions.length) {
      S.flow.listScopeValue = scopeOptions[0].value;
    }
    setSelectOptions("listScopeValueSelect", scopeOptions, "Kapsam Seç", S.flow.listScopeValue, function(item) {
      return { value: item.value, label: item.label + " • " + item.count + " öğrenci" };
    });
  }
  $("generateListBtn").disabled = !S.flow.listExamKey || (S.flow.listScope !== "all" && !S.flow.listScopeValue);
  $("listFlowNote").textContent = listExams.length
    ? "Seçilen sınav için liste kapsamını belirleyip liste oluşturabilirsin."
    : "Bu sınıfa ait tamamlanmış sınav kaydı bulunamadı.";
}

function formatSigned(value) {
  const numeric = Number(value || 0);
  return numeric >= 0 ? "+" + numeric : String(numeric);
}

function getQuestionTotal(row) {
  return Number(row.total || 0) || getQuestionEntries(row).length || (Number(row.correct || 0) + Number(row.wrong || 0) + Number(row.blank || 0));
}

function getReportTotalQuestions() {
  return S.reportResults.reduce(function(total, row) {
    return total + getQuestionTotal(row);
  }, 0);
}

function formatPercent(value) {
  return "%" + Math.round(Number(value || 0));
}

function getStudentFullName(row) {
  return [row?.firstName, row?.lastName].filter(Boolean).join(" ").trim() || "Öğrenci";
}

function getRowCity(row) {
  return String(row?.city || row?.il || row?.province || "").trim();
}

function getRowDistrict(row) {
  return String(row?.district || row?.ilce || row?.county || "").trim();
}

function getRowSchool(row) {
  return String(row?.school || row?.schoolName || row?.okul || row?.institutionName || row?.kurum || "").trim();
}

function getLocationText(row) {
  return [getRowCity(row), getRowDistrict(row), getRowSchool(row)].filter(Boolean).join(" / ") || "—";
}

function normalizeComparable(value) {
  return normalizeKeyPart(value || "");
}

function getExamCohort(result, scope) {
  if (!result) {
    return [];
  }
  const base = S.allResults.filter(function(row) {
    return isCompletedResult(row) && getExamComparisonKey(row) === getExamComparisonKey(result);
  });
  const selectedScope = scope || S.rankScope || "all";
  if (selectedScope === "city") {
    const city = normalizeComparable(getRowCity(result));
    return city ? base.filter(function(row) { return normalizeComparable(getRowCity(row)) === city; }) : base;
  }
  if (selectedScope === "district") {
    const city = normalizeComparable(getRowCity(result));
    const district = normalizeComparable(getRowDistrict(result));
    return district ? base.filter(function(row) {
      return normalizeComparable(getRowDistrict(row)) === district && (!city || normalizeComparable(getRowCity(row)) === city);
    }) : base;
  }
  if (selectedScope === "school") {
    const school = normalizeComparable(getRowSchool(result));
    return school ? base.filter(function(row) { return normalizeComparable(getRowSchool(row)) === school; }) : base;
  }
  if (selectedScope === "class") {
    const grade = String(result.grade || "");
    const sube = normalizeComparable(result.sube);
    const school = normalizeComparable(getRowSchool(result));
    return base.filter(function(row) {
      const sameClass = String(row.grade || "") === grade && normalizeComparable(row.sube) === sube;
      return sameClass && (!school || normalizeComparable(getRowSchool(row)) === school);
    });
  }
  return base;
}

function sortRankingRows(rows) {
  return rows.slice().sort(function(a, b) {
    return (getRankingScore(b) - getRankingScore(a)) ||
      (Number(b.score100 || b.score || 0) - Number(a.score100 || a.score || 0)) ||
      (Number(b.netCorrect || b.correct || 0) - Number(a.netCorrect || a.correct || 0)) ||
      (Number(a.elapsed || 999999) - Number(b.elapsed || 999999)) ||
      getStudentFullName(a).localeCompare(getStudentFullName(b), "tr");
  });
}

function getRankInfo(result, scope) {
  const sorted = sortRankingRows(getExamCohort(result, scope));
  const index = sorted.findIndex(function(row) { return row.id === result?.id; });
  return {
    rank: index >= 0 ? index + 1 : 0,
    total: sorted.length,
    rows: sorted,
  };
}

function getReportTypeTitle() {
  if (S.reportKind === "outcome") {
    return "Kazanım Karnesi";
  }
  if (S.reportKind === "single") {
    return "Tek Sınav Karnesi";
  }
  return "Tüm Testler Karnesi";
}

function buildReportRowsForCurrentSelection(kind, singleResult) {
  if (kind === "single" && singleResult) {
    return [singleResult];
  }
  let rows = getSelectedStudentResults();
  if (kind === "outcome" && S.flow.selectedSubjects.length) {
    rows = rows.filter(function(row) {
      return S.flow.selectedSubjects.includes(row.subject || "Genel");
    });
  }
  if (kind === "outcome") {
    rows = rows.filter(function(row) {
      return buildOutcomeRows(row).length > 0;
    });
  }
  return rows;
}

function generateIndividualReport(kind, singleResult) {
  S.flow.mode = "individual";
  S.reportKind = kind || S.flow.reportType || "all";
  S.reportReady = true;
  S.listReady = false;
  S.filters.subject = "";
  S.filters.examId = "";
  S.reportResults = buildReportRowsForCurrentSelection(S.reportKind, singleResult);
  S.selectedResultId = singleResult?.id || S.reportResults[S.reportResults.length - 1]?.id || "";
  renderWorkflow();
  renderReport();
  const output = $("reportWrap");
  if (output && typeof output.scrollIntoView === "function") {
    output.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function getListScopeTitle(scope) {
  if (scope === "city") return "İl Listesi";
  if (scope === "district") return "İlçe Listesi";
  if (scope === "school") return "Okul Listesi";
  if (scope === "class") return "Sınıf Listesi";
  return "Toplu Liste";
}

function getFilteredListRows() {
  const rows = getListExamRows();
  if (S.flow.listScope === "all") {
    return sortRankingRows(rows);
  }
  return sortRankingRows(rows.filter(function(row) {
    return getDegreeScopeKey(row, S.flow.listScope) === S.flow.listScopeValue;
  }));
}

function buildSubjectBreakdown(row) {
  const entries = getQuestionEntries(row);
  const map = new Map();
  if (!entries.length) {
    const key = row.subject || "Genel";
    map.set(key, {
      label: key,
      correct: Number(row.correct || 0),
      wrong: Number(row.wrong || 0),
      blank: Number(row.blank || 0),
    });
    return Array.from(map.values());
  }
  entries.forEach(function(entry) {
    const key = entry.sectionTitle || row.subject || "Genel";
    if (!map.has(key)) {
      map.set(key, { label: key, correct: 0, wrong: 0, blank: 0 });
    }
    const item = map.get(key);
    if (entry.outcome === "D") item.correct += 1;
    else if (entry.outcome === "Y") item.wrong += 1;
    else item.blank += 1;
  });
  return Array.from(map.values());
}

function renderListReport() {
  const listRows = getFilteredListRows();
  const selectedExam = getListExamOptions().find(function(item) { return item.key === S.flow.listExamKey; }) || null;
  const scopeTitle = getListScopeTitle(S.flow.listScope);
  const scopeText = S.flow.listScope === "all"
    ? "Tüm kayıtlar"
    : ($("listScopeValueSelect")?.selectedOptions?.[0]?.textContent || "Seçili kapsam");
  $("reportWrap").style.display = "none";
  $("emptyReport").style.display = "none";
  $("listWrap").style.display = "block";
  $("listTitle").textContent = scopeTitle;
  $("listMeta").textContent = selectedExam
    ? selectedExam.title + " • " + selectedExam.subject + " • " + selectedExam.formattedDate
    : "Sınav seçilmedi";
  $("listSummary").innerHTML =
    "<span>Liste adı: " + esc(scopeTitle) + "</span>" +
    "<span>Sınıf: " + esc(S.filters.grade || "—") + ". Sınıf</span>" +
    "<span>Kapsam: " + esc(scopeText) + "</span>" +
    "<span>Katılımcı: " + listRows.length + "</span>" +
    "<span>Ortalama başarı: " + formatPercent(average(listRows.map(function(row) { return row.score || 0; }))) + "</span>";

  if (!listRows.length) {
    $("listTableHead").innerHTML = "<tr><th>Bilgi</th></tr>";
    $("listTableBody").innerHTML = "<tr><td style=\"text-align:center;color:var(--muted);padding:18px\">Bu seçim için liste verisi bulunamadı.</td></tr>";
    return;
  }
  const subjectLabels = Array.from(new Set(listRows.flatMap(function(row) {
    return buildSubjectBreakdown(row).map(function(item) { return item.label; });
  })));
  const multiSubject = subjectLabels.length > 1;
  $("listTableHead").innerHTML =
    "<tr>" +
      "<th>Sıra</th><th>Öğrenci</th><th>Sınıf</th>" +
      (multiSubject ? subjectLabels.map(function(label) { return "<th>" + esc(shortTitle(label, 18)) + " D/Y</th>"; }).join("") : "<th>D/Y/B</th>") +
      "<th>Toplam Başarı</th>" +
    "</tr>";
  $("listTableBody").innerHTML = listRows.map(function(row, index) {
    const breakdown = buildSubjectBreakdown(row);
    const bySubject = new Map(breakdown.map(function(item) { return [item.label, item]; }));
    const subjectCells = multiSubject
      ? subjectLabels.map(function(label) {
          const item = bySubject.get(label) || { correct: 0, wrong: 0, blank: 0 };
          return "<td><span style=\"color:var(--ok);font-weight:900\">" + item.correct + "</span> / <span style=\"color:var(--bad);font-weight:900\">" + item.wrong + "</span></td>";
        }).join("")
      : "<td><span style=\"color:var(--ok);font-weight:900\">" + (row.correct || 0) + "</span> / <span style=\"color:var(--bad);font-weight:900\">" + (row.wrong || 0) + "</span> / <span style=\"color:var(--blank);font-weight:900\">" + (row.blank || 0) + "</span></td>";
    return (
      "<tr>" +
        "<td><strong>" + (index + 1) + "</strong></td>" +
        "<td>" + esc(getStudentFullName(row)) + "</td>" +
        "<td>" + esc((row.grade || "—") + ". Sınıf " + (row.sube || "")) + "</td>" +
        subjectCells +
        "<td><span class=\"score-pill\">" + formatPercent(row.score) + "</span></td>" +
      "</tr>"
    );
  }).join("");
}

function generateListReport() {
  S.flow.mode = "list";
  S.listReady = true;
  S.reportReady = false;
  renderWorkflow();
  renderListReport();
  const output = $("listWrap");
  if (output && typeof output.scrollIntoView === "function") {
    output.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function getDegreeExamOptions() {
  const map = new Map();
  S.allResults.filter(isCompletedResult).forEach(function(row) {
    const key = getExamComparisonKey(row);
    if (!map.has(key)) {
      map.set(key, {
        key: key,
        title: row.examTitle || "Sınav",
        subject: row.subject || "Genel",
        grade: row.grade || "",
        dateObj: row.dateObj || null,
        formattedDate: row.formattedDate || "—",
        count: 0,
      });
    }
    const item = map.get(key);
    item.count += 1;
    const time = row.dateObj?.getTime?.() || 0;
    const currentTime = item.dateObj?.getTime?.() || 0;
    if (time > currentTime) {
      item.dateObj = row.dateObj || item.dateObj;
      item.formattedDate = row.formattedDate || item.formattedDate;
      item.title = row.examTitle || item.title;
      item.subject = row.subject || item.subject;
      item.grade = row.grade || item.grade;
    }
  });
  return Array.from(map.values()).sort(function(a, b) {
    return (b.dateObj?.getTime?.() || 0) - (a.dateObj?.getTime?.() || 0);
  });
}

function getDegreeExamRows() {
  if (!S.degree.examKey) {
    return [];
  }
  return S.allResults.filter(function(row) {
    return isCompletedResult(row) && getExamComparisonKey(row) === S.degree.examKey;
  });
}

function getClassScopeKey(row) {
  return [
    normalizeComparable(getRowSchool(row)),
    String(row?.grade || ""),
    normalizeComparable(row?.sube),
  ].join("|");
}

function getDegreeScopeKey(row, scope) {
  if (scope === "city") {
    return normalizeComparable(getRowCity(row));
  }
  if (scope === "district") {
    return [normalizeComparable(getRowCity(row)), normalizeComparable(getRowDistrict(row))].join("|");
  }
  if (scope === "school") {
    return normalizeComparable(getRowSchool(row));
  }
  if (scope === "class") {
    return getClassScopeKey(row);
  }
  return "all";
}

function getDegreeScopeLabel(row, scope) {
  if (scope === "city") {
    return getRowCity(row);
  }
  if (scope === "district") {
    return [getRowCity(row), getRowDistrict(row)].filter(Boolean).join(" / ");
  }
  if (scope === "school") {
    return getRowSchool(row);
  }
  if (scope === "class") {
    return [
      getRowSchool(row),
      (row.grade ? row.grade + ". Sınıf" : "Sınıf") + (row.sube ? " " + row.sube : ""),
    ].filter(Boolean).join(" • ");
  }
  return "Tüm Kullanıcılar";
}

function getDegreeScopeOptions(rows, scope) {
  if (scope === "all") {
    return [];
  }
  const map = new Map();
  rows.forEach(function(row) {
    const key = getDegreeScopeKey(row, scope);
    const label = getDegreeScopeLabel(row, scope);
    if (!key || !label) {
      return;
    }
    if (!map.has(key)) {
      map.set(key, { value: key, label: label, count: 0 });
    }
    map.get(key).count += 1;
  });
  return Array.from(map.values()).sort(function(a, b) {
    return a.label.localeCompare(b.label, "tr");
  });
}

function getDegreeRows() {
  const rows = getDegreeExamRows();
  if (S.degree.scope === "all") {
    return sortRankingRows(rows);
  }
  return sortRankingRows(rows.filter(function(row) {
    return getDegreeScopeKey(row, S.degree.scope) === S.degree.scopeValue;
  }));
}

function syncDegreeSelections() {
  const options = getDegreeExamOptions();
  const selected = getSelectedResult();
  const selectedKey = selected ? getExamComparisonKey(selected) : "";
  if (!S.degree.examKey || !options.some(function(item) { return item.key === S.degree.examKey; })) {
    S.degree.examKey = selectedKey && options.some(function(item) { return item.key === selectedKey; })
      ? selectedKey
      : (options[0]?.key || "");
  }
  if (!S.degree.scope) {
    S.degree.scope = "all";
  }
  const rows = getDegreeExamRows();
  const scopeOptions = getDegreeScopeOptions(rows, S.degree.scope);
  if (S.degree.scope === "all") {
    S.degree.scopeValue = "";
  } else if (!S.degree.scopeValue || !scopeOptions.some(function(item) { return item.value === S.degree.scopeValue; })) {
    S.degree.scopeValue = scopeOptions[0]?.value || "";
  }
  return { options: options, rows: rows, scopeOptions: scopeOptions };
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
  const avgPoint = averageExamScore(S.reportResults);
  const avgBenchmark = average(metrics.map(function(item) { return item.avgScore || 0; }));
  const avgPercentile = average(metrics.map(function(item) { return item.rankPercent || 0; }));
  const totalQuestions = getReportTotalQuestions();
  const latestBenchmark = latest ? getBenchmarkStats(latest) : { avgScore: 0, delta: 0, rankPercent: 0, participantCount: 0 };
  const latestRank = latest ? getRankInfo(latest, "all") : { rank: 0, total: 0 };
  const deltaLabel = formatSigned(latestBenchmark.delta);
  const insight = getReportInsights();

  $("reportYear").textContent = getAcademicYearText() + " Öğretim Yılı";
  $("reportCountPill").textContent = S.reportResults.length + " sınav";
  $("heroStudentName").textContent = student ? student.firstName + " " + student.lastName : "Öğrenci seç";
  $("heroStudentMeta").textContent = student ? student.grade + ". Sınıf " + student.sube + " Şubesi" : "—";
  if ($("heroStudentSchool")) {
    $("heroStudentSchool").textContent = student
      ? (student.school || [student.city, student.district].filter(Boolean).join(" / ") || "Okul bilgisi yok")
      : "Okul bilgisi";
  }
  $("heroStudentChips").innerHTML =
    "<span class=\"student-chip\">" + esc(S.filters.subject || "Tüm Dersler") + "</span>" +
    "<span class=\"student-chip\">" + esc(getReportTypeTitle()) + "</span>" +
    "<span class=\"student-chip\">" + esc(formatDate(S.reportResults[0]?.dateObj || S.reportResults[0]?.date) + " - " + formatDate(S.reportResults[S.reportResults.length - 1]?.dateObj || S.reportResults[S.reportResults.length - 1]?.date)) + "</span>";

  $("heroScore").textContent = "%" + avgScore;
  if ($("heroScoreRing")) {
    $("heroScoreRing").style.setProperty("--score", String(Math.max(0, Math.min(100, avgScore))));
  }
  $("heroScoreNote").textContent =
    "Seçili sınav grubunda ortalama katılım başarısı %" +
    avgBenchmark +
    " ve ortalama puanı " +
    formatPointValue(avgPoint) +
    ". Öğrencinin ortalama yüzdelik dilimi %" +
    avgPercentile +
    ".";
  $("heroHeadline").textContent = student
    ? student.firstName + " için " + getReportTypeTitle()
    : getReportTypeTitle();
  $("heroDescription").textContent = isOutcomeMode()
    ? "Bu rapor, sınava eklenmiş kazanım ve öğrenme çıktıları üzerinden doğru, yanlış ve boş dağılımını gösterir. Ders başlıkları korunur; her kazanım ayrı satırda izlenir."
    : insight.summaryParagraph;
  $("heroComparisonPill").textContent =
    latest
      ? "Seçili sınav: " + (latestRank.rank || "—") + " / " + (latestRank.total || "—") + " sıra · " + formatExamScore(latest) + " · " + deltaLabel + " yüzde fark"
      : "Karşılaştırma verisi bekleniyor";

  $("filterSummaryScore").textContent = latest ? "%" + (latest.score || 0) : "%0";
  $("filterSummaryText").textContent = latest
    ? shortTitle(latest.examTitle, 52) +
      " • Puan " +
      formatExamScore(latest) +
      " • Katılım ort. %" +
      latestBenchmark.avgScore +
      " • Yüzdelik %" +
      latestBenchmark.rankPercent
    : "Filtrelenmiş kayıt bulunmuyor.";

  $("metricExamCount").textContent = String(S.reportResults.length);
  if ($("metricTotalQuestions")) {
    $("metricTotalQuestions").textContent = String(totalQuestions);
  }
  $("metricAvgScore").textContent = "%" + avgScore;
  $("metricAvgBenchmark").textContent = "%" + avgBenchmark;

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
      const active = row.id === S.selectedResultId ? " active" : "";
      const actionLabel = S.reportKind === "single" ? "Açık" : "Bireysel Karnesi";
      return (
        "<tr class=\"history-row" + active + "\" onclick=\"window.selectReportResult('" + row.id + "')\">" +
          "<td>" + esc(row.formattedDate) + "</td>" +
          "<td><div class=\"history-exam-title\">" + esc(shortTitle(row.examTitle, 44)) + "</div><div class=\"history-exam-sub\">Detayı görmek için satıra tıkla</div></td>" +
          "<td>" + esc(row.subject || "—") + "</td>" +
          "<td><span style=\"color:var(--ok);font-weight:900\">" + (row.correct || 0) + "</span> / <span style=\"color:var(--bad);font-weight:900\">" + (row.wrong || 0) + "</span> / <span style=\"color:var(--blank);font-weight:900\">" + (row.blank || 0) + "</span></td>" +
          "<td><span class=\"score-pill\">" + esc(formatExamScore(row)) + "</span></td>" +
          "<td><span class=\"score-pill\">%" + (row.score || 0) + "</span></td>" +
          "<td>%" + benchmark.avgScore + "</td>" +
          "<td><span class=\"delta-pill " + deltaClass + "\">" + deltaLabel + "</span></td>" +
          "<td>%" + benchmark.rankPercent + "</td>" +
          "<td class=\"screen-only\"><button class=\"mini-btn\" onclick=\"event.stopPropagation();window.openSingleReportFromHistory('" + row.id + "')\">" + actionLabel + "</button></td>" +
        "</tr>"
      );
    })
    .join("");
}

function renderDegreePanel() {
  if (!$("degreeCard")) {
    return;
  }
  const synced = syncDegreeSelections();
  const options = synced.options;
  const baseRows = synced.rows;
  const scopeOptions = synced.scopeOptions;
  setSelectOptions("degreeExamSelect", options, "Sınav Seç", S.degree.examKey, function(item) {
    return {
      value: item.key,
      label: item.title + " • " + item.subject + " • " + item.formattedDate + " • " + item.count + " öğrenci",
    };
  });
  $("degreeScopeSelect").value = S.degree.scope || "all";
  const scopeValueSelect = $("degreeScopeValueSelect");
  if (S.degree.scope === "all") {
    scopeValueSelect.innerHTML = "<option value=\"\">Tüm kayıtlar</option>";
    scopeValueSelect.disabled = true;
  } else {
    scopeValueSelect.disabled = false;
    setSelectOptions("degreeScopeValueSelect", scopeOptions, "Kapsam Seç", S.degree.scopeValue, function(item) {
      return { value: item.value, label: item.label + " • " + item.count + " öğrenci" };
    });
  }
  const rows = getDegreeRows();
  const selectedStudentKey = S.filters.studentKey || "";
  const selectedExam = options.find(function(item) { return item.key === S.degree.examKey; }) || null;
  const avgScore = average(rows.map(function(row) { return row.score || 0; }));
  const avgPoint = averageExamScore(rows);
  $("degreeSummary").innerHTML =
    "<span>" + esc(selectedExam ? selectedExam.title : "Sınav seçilmedi") + "</span>" +
    "<span>Katılımcı: " + rows.length + " / " + baseRows.length + "</span>" +
    "<span>Ortalama Başarı: %" + avgScore + "</span>" +
    "<span>Ortalama Puan: " + esc(formatPointValue(avgPoint)) + "</span>" +
    "<span>Kapsam: " + esc(S.degree.scope === "all" ? "Tüm kullanıcılar" : ($("degreeScopeValueSelect")?.selectedOptions?.[0]?.textContent || "—")) + "</span>";
  if (!rows.length) {
    $("degreeTableBody").innerHTML = "<tr><td colspan=\"9\" style=\"text-align:center;color:var(--muted);padding:18px\">Bu sınav ve kapsam için derece verisi bulunamadı.</td></tr>";
    return;
  }
  $("degreeTableBody").innerHTML = rows.map(function(row, index) {
    const isSelf = selectedStudentKey && row.studentKey === selectedStudentKey;
    return (
      "<tr class=\"" + (isSelf ? "self-row" : "") + "\">" +
        "<td><strong>" + (index + 1) + "</strong></td>" +
        "<td>" + esc(getStudentFullName(row)) + (isSelf ? " <span class=\"score-pill\">Seçili Öğrenci</span>" : "") + "</td>" +
        "<td>" + esc((row.grade || "—") + ". Sınıf " + (row.sube || "")) + "</td>" +
        "<td>" + esc([getRowCity(row), getRowDistrict(row)].filter(Boolean).join(" / ") || "—") + "</td>" +
        "<td>" + esc(getRowSchool(row) || "—") + "</td>" +
        "<td><span style=\"color:var(--ok);font-weight:900\">" + (row.correct || 0) + "</span> / <span style=\"color:var(--bad);font-weight:900\">" + (row.wrong || 0) + "</span> / <span style=\"color:var(--blank);font-weight:900\">" + (row.blank || 0) + "</span></td>" +
        "<td>" + esc(String(row.netCorrect ?? row.correct ?? 0)) + "</td>" +
        "<td><span class=\"score-pill\">" + esc(formatExamScore(row)) + "</span></td>" +
        "<td><span class=\"score-pill\">" + formatPercent(row.score) + "</span></td>" +
      "</tr>"
    );
  }).join("");
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
    if ($("outcomeWrap")) $("outcomeWrap").innerHTML = "";
    if ($("wrongQuestionPanel")) $("wrongQuestionPanel").style.display = "none";
    $("selectedExamAction").onclick = null;
    return;
  }
  const benchmark = getBenchmarkStats(result);
  const rankInfo = getRankInfo(result, "all");
  const totalQuestions = result.total || getQuestionEntries(result).length || 0;

  $("selectedExamTitle").textContent = result.examTitle || "Seçili Sınav";
  $("selectedExamMeta").textContent =
    (result.subject || "Genel") +
    " • " +
    formatDateTime(result.dateObj || result.date) +
    " • " +
    totalQuestions +
      " soru • Puan: " + formatExamScore(result) + " • D:" + (result.correct || 0) +
    " Y:" + (result.wrong || 0) +
    " B:" + (result.blank || 0);
  $("selectedBenchmarkPill").textContent = "Puan sırası: " + (rankInfo.rank || "—") + " / " + (rankInfo.total || "—");
  $("selectedScoreValue").textContent = formatExamScore(result);
  $("selectedBenchmarkValue").textContent = formatPointValue(benchmark.avgPoint || 0) + " / " + (result.scoreScale || 100);
  $("selectedPercentileValue").textContent = "%" + benchmark.rankPercent;
  $("selectedExamAction").textContent = S.reportKind === "single" ? "Bu Sınav Açık" : "Tek Sınav Karnesi";
  $("selectedExamAction").onclick = function() {
    generateIndividualReport("single", result);
  };

  renderWrongQuestionPanel(result);
  renderOutcomeMatrix(result);
  renderQuestionMatrix();
}

function renderWrongQuestionPanel(result) {
  if (!$("wrongQuestionPanel") || !$("wrongQuestionList")) {
    return;
  }
  if (S.reportKind !== "single") {
    $("wrongQuestionPanel").style.display = "none";
    $("wrongQuestionList").innerHTML = "";
    return;
  }
  const issues = getQuestionEntries(result).filter(function(entry) {
    return entry.outcome === "Y" || entry.outcome === "B";
  });
  $("wrongQuestionPanel").style.display = "block";
  $("wrongQuestionList").innerHTML = issues.length
    ? issues.map(function(entry) {
        return "<span class=\"wrong-chip\">" + (entry.outcome === "B" ? "Boş" : "Yanlış") + " " + entry.questionNo + ". soru</span>";
      }).join("")
    : "<span class=\"score-pill\" style=\"background:#ecfdf5;color:#047857\">Yanlış veya boş soru yok</span>";
}

function renderQuestionMatrix() {
  if (!S.reportResults.length) {
    $("matrixWrap").innerHTML = "<div class=\"panel-card\" style=\"padding:18px;text-align:center;color:var(--muted);\">Soru bazlı değerlendirme için kayıt bulunamadı.</div>";
    return;
  }
  const matrixResults = S.reportKind === "single" ? [getSelectedResult()].filter(Boolean) : S.reportResults.slice().reverse();
  $("matrixWrap").innerHTML = matrixResults.map(function(result) {
  var examBenchmark = getBenchmarkStats(result);
  var examDeltaLabel = formatSigned(examBenchmark.delta);
  var allEntries = getQuestionEntries(result);
  var examSubject = result.subject || "Genel";
  if (!allEntries.length) {
    return "<div class=\"panel-card\" style=\"padding:18px;text-align:center;color:var(--muted);\">" + esc(shortTitle(result.examTitle, 58)) + " için soru bazlı kayıt bulunamadı.</div>";
  }
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
      "<span style=\"color:var(--slate);margin-left:auto;\">Katılım Ort: %" + examBenchmark.avgScore + " • Yüzdelik: %" + examBenchmark.rankPercent + " • Grup farkı: " + examDeltaLabel + " puan</span>" +
    "</div>";
  return (
    "<div class=\"matrix-card\">" +
      "<div class=\"matrix-card-head\">" +
        "<strong>" + esc(shortTitle(result.examTitle, 58)) + "</strong>" +
        "<span>" + esc(examSubject) + " • " + esc(result.formattedDate || "—") + " • " + allEntries.length + " soru • %" + (result.score || 0) + "</span>" +
      "</div>" +
      "<div class=\"matrix-card-body\">" + rowsHtml + totalRow + "</div>" +
    "</div>"
  );
  }).join("");
}

function renderOutcomeMatrix(result) {
  const rows = S.reportKind === "outcome"
    ? buildAllOutcomeRows()
    : (result ? buildOutcomeRows(result).map(function(row) { return Object.assign({ result: result }, row); }) : []);
  if (!rows.length) {
    $("outcomeWrap").innerHTML = "<div class=\"panel-card\" style=\"padding:18px;text-align:center;color:var(--muted);\">Bu seçimde kazanım / öğrenme çıktısı girilmiş soru bulunamadı.</div>";
    return;
  }
  $("outcomeWrap").innerHTML = rows.map(function(item) {
      const color = item.score >= 70 ? "var(--ok)" : item.score >= 50 ? "var(--amber)" : "var(--bad)";
      const issueQuestions = item.wrongQuestions.concat(item.blankQuestions);
      const owner = item.result || result || {};
      return (
        "<div class=\"outcome-card\">" +
          "<div class=\"outcome-card-head\">" +
            "<div>" +
              "<div class=\"outcome-card-title\">" + esc(item.label) + "</div>" +
              "<div class=\"matrix-sub\">" + esc(owner.examTitle || "Sınav") + " • " + esc(item.subject || owner.subject || "Genel") + " • Sorular: " + esc(item.questions.join(", ")) + "</div>" +
            "</div>" +
            "<span class=\"score-pill\" style=\"color:" + color + "\">%" + item.score + "</span>" +
          "</div>" +
          "<div class=\"outcome-card-meta\">" +
            "<span>Soru sayısı: " + item.total + "</span>" +
            "<span style=\"color:var(--ok)\">Doğru: " + item.correct + "</span>" +
            "<span style=\"color:var(--bad)\">Yanlış: " + item.wrong + "</span>" +
            "<span style=\"color:var(--blank)\">Boş: " + item.blank + "</span>" +
          "</div>" +
          (issueQuestions.length ? "<div class=\"outcome-alert\">Kontrol edilmesi gereken soru(lar): " + esc(issueQuestions.join(", ")) + "</div>" : "") +
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
  if (isOutcomeMode()) {
    const rows = buildAllOutcomeRows();
    if (!rows.length) {
      return "<div class=\"print-empty\">Kazanım odaklı değerlendirme için kayıt bulunamadı.</div>";
    }
    const grouped = new Map();
    rows.forEach(function(row) {
      const title = row.result.examTitle || "Sınav";
      if (!grouped.has(title)) grouped.set(title, []);
      grouped.get(title).push(row);
    });
    return Array.from(grouped.entries()).map(function(pair) {
      const title = pair[0];
      const items = pair[1];
      const result = items[0].result;
      const body = items.map(function(item) {
        return (
          "<div class=\"print-matrix-row\">" +
            "<div class=\"print-matrix-label-wrap\">" +
              "<div class=\"print-matrix-label\">" + esc(item.subject || result.subject || "Genel") + "</div>" +
              "<div class=\"print-matrix-sub\">Sorular: " + esc(item.questions.join(", ")) + "</div>" +
            "</div>" +
            "<div style=\"font-size:12px;line-height:1.55;color:var(--navy)\">" +
              "<strong>" + esc(item.label) + "</strong><br>" +
              "<span style=\"color:#179b66;font-weight:700\">D:" + item.correct + "</span> " +
              "<span style=\"color:#d94d4d;font-weight:700\">Y:" + item.wrong + "</span> " +
              "<span style=\"color:#8391a7;font-weight:700\">B:" + item.blank + "</span> " +
              "<span style=\"font-weight:800\">%" + item.score + "</span>" +
            "</div>" +
          "</div>"
        );
      }).join("");
      return (
        "<div class=\"print-panel break-avoid\">" +
          "<div class=\"print-panel-head dark\"><strong>" + esc(shortTitle(title, 60)) + "</strong><span>" + esc(result.formattedDate || "—") + " • Kazanım / öğrenme çıktısı odaklı analiz</span></div>" +
          "<div class=\"print-panel-body\">" + body + "</div>" +
        "</div>"
      );
    }).join("");
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
          "<td>" + esc(formatExamScore(row)) + "</td>" +
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
  const studentSchool = student
    ? (student.school || [student.city, student.district].filter(Boolean).join(" / ") || "Okul bilgisi yok")
    : "—";
  const selectedSummary = selected
    ? (selected.subject || "Genel") + " • " + formatDateTime(selected.dateObj || selected.date) + " • " + (selected.total || getQuestionEntries(selected).length) + " soru • " + formatExamScore(selected)
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
            "<h1>" + esc(student ? student.firstName + (isOutcomeMode() ? " için kazanım karnesi" : " için gelişim raporu") : (isOutcomeMode() ? "Kazanım odaklı karne" : "Öğrenci gelişim raporu")) + "</h1>" +
            "<p>" + esc(isOutcomeMode() ? "Bu rapor, sınava eklenen kazanım ve öğrenme çıktıları üzerinden öğrencinin doğru, yanlış ve boş dağılımını gösterir." : insight.summaryParagraph) + "</p>" +
            "<div class=\"print-pill\">" + esc(insight.dateRangeText) + "</div>" +
          "</div>" +
          "<div class=\"print-card\">" +
            "<div class=\"print-name\">" + esc(student ? student.firstName + " " + student.lastName : "Öğrenci") + "</div>" +
            "<div class=\"print-meta\">" + esc(student ? student.grade + ". Sınıf " + student.sube + " Şubesi" : "—") + "</div>" +
            "<div class=\"print-meta\" style=\"margin-top:5px\">" + esc(studentSchool) + "</div>" +
            "<div class=\"print-chip-row\">" +
              "<span class=\"print-chip\">" + esc(S.filters.subject || "Tüm Dersler") + "</span>" +
              "<span class=\"print-chip\">" + esc(isOutcomeMode() ? "Kazanım Odaklı" : (S.filters.examId ? "Tekli Karne" : "Toplu Karne")) + "</span>" +
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
          "<div class=\"print-panel\"><div class=\"print-panel-head\"><strong>Son Seçili Sınav Özeti</strong><span>" + esc(selectedSummary) + "</span></div><div class=\"print-panel-body\"><div class=\"print-mini-grid\"><div class=\"print-mini\"><strong>" + esc(selected ? formatExamScore(selected) : "0 / 100") + "</strong><span>Öğrenci Puanı</span></div><div class=\"print-mini\"><strong>" + esc(formatPointValue(latestBenchmark.avgPoint || 0)) + "</strong><span>Katılım Ort. Puan</span></div><div class=\"print-mini\"><strong>%" + latestBenchmark.rankPercent + "</strong><span>Yüzdelik</span></div></div></div></div>" +
        "</div>" +
        "<div class=\"print-chart-grid\">" +
          "<div class=\"print-panel break-avoid\"><div class=\"print-panel-head\"><strong>Sınav Bazlı Başarı Grafiği</strong><span>Başarı ve net gelişimi</span></div><div class=\"print-panel-body\">" + (progressChartImage ? "<img class=\"print-chart\" src=\"" + progressChartImage + "\" alt=\"Başarı grafiği\">" : "<div class=\"print-empty\">Grafik görüntüsü hazırlanamadı.</div>") + "</div></div>" +
          "<div class=\"print-panel break-avoid\"><div class=\"print-panel-head\"><strong>Kıyaslama Grafiği</strong><span>Öğrenci skoru ile grup ortalaması</span></div><div class=\"print-panel-body\">" + (benchmarkChartImage ? "<img class=\"print-chart\" src=\"" + benchmarkChartImage + "\" alt=\"Kıyaslama grafiği\">" : "<div class=\"print-empty\">Grafik görüntüsü hazırlanamadı.</div>") + "</div></div>" +
        "</div>" +
        "<div class=\"print-footer\"><div><strong>By Kemal Öğretmen</strong><br>kemalogretmenim.com.tr</div><div>Profesyonel öğrenci performans özeti</div><div>Sayfa 1 / 2</div></div>" +
      "</section>" +
      "<section class=\"print-sheet\">" +
        "<section class=\"print-panel\"><div class=\"print-panel-head\"><strong>Sınav Geçmişi ve Kıyaslama Tablosu</strong><span>Öğrencinin seçili tüm sınav performansları</span></div><div class=\"print-panel-body\"><div class=\"print-table-wrap\"><table><thead><tr><th>Tarih</th><th>Sınav</th><th>Ders</th><th>Puan</th><th>Başarı</th><th>Katılım Ort.</th><th>Fark</th><th>Yüzdelik</th></tr></thead><tbody>" + buildPrintableHistoryRows() + "</tbody></table></div></div></section>" +
        "<div class=\"print-section-title\">" + esc(isOutcomeMode() ? "🎯 Kazanım Odaklı Değerlendirme" : "🔎 Soru Bazlı Kompakt Değerlendirme") + "</div>" +
        "<div class=\"print-section-sub\">" + esc(isOutcomeMode() ? "Kazanım ve öğrenme çıktıları ders başlığına göre listelenir; her kazanım için doğru, yanlış ve boş dağılımı verilir." : "Tüm denemelerdeki her dersin soru bazlı doğru/yanlış/boş matrisi aşağıda sıralanmaktadır.") + "</div>" +
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
  button.textContent = disabled && label ? label : "📄 PDF Çıktı Al";
}

async function captureReportSheetCanvases() {
  if (typeof window.html2canvas !== "function") {
    throw new Error("html2canvas yüklenemedi");
  }
  var activeWrap = S.listReady ? $("listWrap") : $("reportWrap");
  var sheets = activeWrap ? Array.from(activeWrap.querySelectorAll(".sheet")) : [];
  if (!sheets.length) {
    throw new Error("Çıktı alınacak karne veya liste bulunamadı.");
  }
  var canvases = [];
  document.body.classList.add("report-export-mode");
  try {
    await new Promise(function(resolve) { setTimeout(resolve, 220); });
    for (var i = 0; i < sheets.length; i += 1) {
      var sheet = sheets[i];
      var exportWidth = 2480;
      var sheetWidth = Math.max(sheet.scrollWidth || sheet.offsetWidth || 1, 1);
      var scale = Math.max(2, Math.min(2.8, exportWidth / sheetWidth));
      var canvas = await window.html2canvas(sheet, {
        backgroundColor: "#ffffff",
        scale: scale,
        width: sheet.scrollWidth || sheet.offsetWidth,
        height: sheet.scrollHeight || sheet.offsetHeight,
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 0,
      });
      canvases.push(canvas);
    }
    return canvases;
  } finally {
    document.body.classList.remove("report-export-mode");
  }
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

async function downloadPdfFromCanvases(canvases, fileName) {
  var jsPdfLib = window.jspdf && window.jspdf.jsPDF ? window.jspdf.jsPDF : null;
  if (!jsPdfLib) {
    throw new Error("PDF kütüphanesi yüklenemedi.");
  }
  if (!Array.isArray(canvases) || !canvases.length) {
    throw new Error("PDF için karne sayfası bulunamadı.");
  }

  var pdf = new jsPdfLib({ orientation: "portrait", unit: "mm", format: "a4" });
  canvases.forEach(function(canvas, index) {
    if (index > 0) {
      pdf.addPage("a4", "portrait");
    }
    var pageWidth = pdf.internal.pageSize.getWidth();
    var pageHeight = pdf.internal.pageSize.getHeight();
    var margin = 6;
    var usableWidth = pageWidth - (margin * 2);
    var usableHeight = pageHeight - (margin * 2);
    var ratio = canvas.width / canvas.height;
    var renderWidth = usableWidth;
    var renderHeight = renderWidth / ratio;
    if (renderHeight > usableHeight) {
      renderHeight = usableHeight;
      renderWidth = renderHeight * ratio;
    }
    var offsetX = (pageWidth - renderWidth) / 2;
    var offsetY = (pageHeight - renderHeight) / 2;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", offsetX, offsetY, renderWidth, renderHeight, undefined, "FAST");
  });
  pdf.save(fileName);
}

async function exportReportAsImages(format) {
  if (!S.reportResults.length && !S.listReady) {
    window.alert("Önce karne veya liste oluşturmalısın.");
    return;
  }
  var student = getCurrentStudent();
  var baseName = S.listReady
    ? [sanitizeFileNamePart(getListScopeTitle(S.flow.listScope)), "sinav-listesi"].join("-")
    : [
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
  if (!S.reportResults.length && !S.listReady) {
    window.alert("Önce karne veya liste oluşturmalısın.");
    return;
  }
  var student = getCurrentStudent();
  var fileName = S.listReady
    ? [sanitizeFileNamePart(getListScopeTitle(S.flow.listScope)), "sinav-listesi.pdf"].join("-")
    : [
        sanitizeFileNamePart(student?.firstName || "ogrenci"),
        sanitizeFileNamePart(student?.lastName || "karne-merkezi"),
        "karne-merkezi.pdf",
      ].join("-");
  setPrintButtonState(true, "PDF Hazırlanıyor...");
  try {
    var canvases = await captureReportSheetCanvases();
    await downloadPdfFromCanvases(canvases, fileName);
  } catch (error) {
    console.error(error);
    window.alert("PDF çıktısı hazırlanırken hata oluştu. Lütfen tekrar deneyin.");
  } finally {
    setPrintButtonState(false);
  }
}

function exportExcel() {
  if (S.listReady) {
    exportListExcel();
    return;
  }
  if (!S.reportResults.length) {
    window.alert("Önce karne oluşturmalısın.");
    return;
  }
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
        "Sınav Puanı": getRankingScore(row),
        "Puan Ölçeği": row.scoreScale || 100,
        "Başarı (%)": row.score || 0,
        "Katılım Ortalaması (%)": benchmark.avgScore,
        "Katılım Ort. Puan": benchmark.avgPoint || 0,
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
        "Kazanım / Öğrenme Çıktısı": entry.learningOutcome || "—",
        "Verilen Cevap": entry.selectedAnswer || "Boş",
        "Doğru Cevap": entry.correctAnswer || "—",
        "Sonuç": entry.outcome === "D" ? "Doğru" : entry.outcome === "Y" ? "Yanlış" : "Boş",
      });
    });
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Karne Ozeti");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), "Soru Matris Verisi");
  const outcomeRows = buildAllOutcomeRows().map(function(item) {
    return {
      "Sınav": item.result.examTitle || "—",
      "Ders / Bölüm": item.subject || item.result.subject || "—",
      "Kazanım / Öğrenme Çıktısı": item.label,
      "Soru Sayısı": item.total,
      "Sorular": item.questions.join(", "),
      "Doğru": item.correct,
      "Yanlış": item.wrong,
      "Boş": item.blank,
      "Başarı (%)": item.score,
      "Hatalı / Boş Sorular": item.wrongQuestions.concat(item.blankQuestions).join(", ") || "—",
    };
  });
  if (outcomeRows.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(outcomeRows), "Kazanim Analizi");
  }
  XLSX.writeFile(
    wb,
    (getCurrentStudent()?.firstName || "ogrenci") + "_" + (getCurrentStudent()?.lastName || "karne") + "_sinav_karne_merkezi.xlsx"
  );
}

function exportListExcel() {
  const rows = getFilteredListRows();
  if (!rows.length) {
    window.alert("Önce liste oluşturmalısın.");
    return;
  }
  const selectedExam = getListExamOptions().find(function(item) { return item.key === S.flow.listExamKey; }) || null;
  const scopeLabel = getListScopeTitle(S.flow.listScope);
  const wb = XLSX.utils.book_new();
  const listRows = rows.map(function(row, index) {
    const breakdown = buildSubjectBreakdown(row).map(function(item) {
      return item.label + " D:" + item.correct + " Y:" + item.wrong + " B:" + item.blank;
    }).join(" | ");
    return {
      "Sıra": index + 1,
      "Ad Soyad": getStudentFullName(row),
      "Sınıf": row.grade + ". Sınıf",
      "Şube": row.sube || "—",
      "İl": getRowCity(row) || "—",
      "İlçe": getRowDistrict(row) || "—",
      "Okul": getRowSchool(row) || "—",
      "Ders Dağılımı": breakdown,
      "Doğru": row.correct || 0,
      "Yanlış": row.wrong || 0,
      "Boş": row.blank || 0,
      "Net": row.netCorrect ?? row.correct ?? 0,
      "Sınav Puanı": getRankingScore(row),
      "Puan Ölçeği": row.scoreScale || 100,
      "Başarı (%)": row.score || 0,
      "Sınav": row.examTitle || selectedExam?.title || "—",
      "Liste": scopeLabel,
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(listRows), "Toplu Liste");
  XLSX.writeFile(wb, sanitizeFileNamePart(selectedExam?.title || "sinav") + "_" + sanitizeFileNamePart(scopeLabel) + ".xlsx");
}

function exportDegreeListExcel() {
  const rows = getDegreeRows();
  if (!rows.length) {
    window.alert("Derece listesi için veri bulunamadı.");
    return;
  }
  const selectedExam = getDegreeExamOptions().find(function(item) { return item.key === S.degree.examKey; }) || null;
  const scopeLabel = S.degree.scope === "all"
    ? "Tüm Kullanıcılar"
    : ($("degreeScopeValueSelect")?.selectedOptions?.[0]?.textContent || "Seçili Kapsam");
  const wb = XLSX.utils.book_new();
  const rankingRows = rows.map(function(row, index) {
    return {
      "Sıra": index + 1,
      "Ad Soyad": getStudentFullName(row),
      "Sınıf": row.grade + ". Sınıf",
      "Şube": row.sube || "—",
      "İl": getRowCity(row) || "—",
      "İlçe": getRowDistrict(row) || "—",
      "Okul": getRowSchool(row) || "—",
      "Doğru": row.correct || 0,
      "Yanlış": row.wrong || 0,
      "Boş": row.blank || 0,
      "Net": row.netCorrect ?? row.correct ?? 0,
      "Sınav Puanı": getRankingScore(row),
      "Puan Ölçeği": row.scoreScale || 100,
      "Başarı (%)": row.score || 0,
      "Sınav": row.examTitle || selectedExam?.title || "—",
      "Kapsam": scopeLabel,
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rankingRows), "Sinav Derece Listesi");
  XLSX.writeFile(
    wb,
    sanitizeFileNamePart(selectedExam?.title || "sinav") + "_derece_listesi.xlsx"
  );
}

function renderEmptyState() {
  $("reportWrap").style.display = "none";
  $("listWrap").style.display = "none";
  $("emptyReport").style.display = "block";
}

function renderReport() {
  $("loadingState").style.display = "none";
  $("errorState").style.display = "none";
  $("app").style.display = "block";
  renderFilterMeta();
  renderWorkflow();
  if (S.listReady) {
    renderListReport();
    return;
  }
  if (!S.reportReady) {
    $("reportWrap").style.display = "none";
    $("listWrap").style.display = "none";
    $("emptyReport").style.display = "none";
    return;
  }
  if (!S.reportResults.length) {
    renderEmptyState();
    return;
  }
  $("emptyReport").style.display = "none";
  $("listWrap").style.display = "none";
  $("reportWrap").style.display = "block";
  if ($("matrixTitle")) {
    $("matrixTitle").textContent = S.reportKind === "single" ? "🔎 Tek Sınav Soru Değerlendirme" : (isOutcomeMode() ? "🎯 Kazanım Odaklı Değerlendirme" : "🔎 Soru Bazlı Kompakt Değerlendirme");
  }
  if ($("matrixDescription")) {
    $("matrixDescription").textContent = isOutcomeMode()
      ? "Seçilen derslerde kazanım / öğrenme çıktısı girilmiş sınavlar birlikte değerlendirilir."
      : (S.reportKind === "single"
        ? "Seçilen tek sınavın doğru, yanlış ve boş soru dağılımı gösterilir."
        : "Öğrencinin tüm sınavlarının ders ve bölüm bazlı kompakt matrisi. Her sınav ayrı kartla, doğru yanıtlar yeşil, yanlışlar kırmızı, boşlar gri olarak gösterilir.");
  }
  renderHeader();
  renderCharts();
  renderHistoryTable();
  renderSelectedExam();
}

function refreshReport() {
  syncFilterOptions();
  if (S.reportReady) {
    S.reportResults = buildReportRowsForCurrentSelection(S.reportKind);
    S.selectedResultId = S.reportResults[S.reportResults.length - 1]?.id || "";
  }
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

window.openSingleReportFromHistory = function(id) {
  const result = S.allResults.find(function(row) { return row.id === id; });
  if (!result) {
    return;
  }
  generateIndividualReport("single", result);
};

window.selectReportResult = function(id) {
  if (!S.reportResults.some(function(row) { return row.id === id; })) {
    return;
  }
  S.selectedResultId = id;
  renderHeader();
  renderHistoryTable();
  renderSelectedExam();
  const selectedTop = document.getElementById("selectedExamTitle");
  if (selectedTop && typeof selectedTop.scrollIntoView === "function") {
    selectedTop.scrollIntoView({ behavior: "smooth", block: "center" });
  }
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
  window.scrollStudentReportSection = scrollStudentReportSection;
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
  Array.from(document.querySelectorAll("[data-report-jump]")).forEach(function(button) {
    button.addEventListener("click", function() {
      scrollStudentReportSection(button.getAttribute("data-report-jump"));
    });
  });
  $("modeIndividualBtn").addEventListener("click", function() {
    S.flow.mode = "individual";
    S.listReady = false;
    renderReport();
  });
  $("modeListBtn").addEventListener("click", function() {
    S.flow.mode = "list";
    S.reportReady = false;
    renderReport();
  });
  $("flowGradeSelect").addEventListener("change", function(event) {
    S.filters.grade = event.target.value;
    S.filters.studentKey = "";
    S.flow.selectedSubjects = [];
    S.reportReady = false;
    renderReport();
  });
  $("flowStudentSearch").addEventListener("input", function(event) {
    S.flow.studentSearch = event.target.value || "";
    renderWorkflow();
  });
  $("flowStudentSelect").addEventListener("change", function(event) {
    S.filters.studentKey = event.target.value || "";
    S.flow.selectedSubjects = [];
    S.reportReady = false;
    renderReport();
  });
  $("reportAllBtn").addEventListener("click", function() {
    S.flow.reportType = "all";
    S.flow.selectedSubjects = [];
    renderWorkflow();
  });
  $("reportOutcomeBtn").addEventListener("click", function() {
    S.flow.reportType = "outcome";
    S.flow.selectedSubjects = [];
    renderWorkflow();
  });
  $("generateIndividualBtn").addEventListener("click", function() {
    generateIndividualReport(S.flow.reportType || "all");
  });
  $("listGradeSelect").addEventListener("change", function(event) {
    S.filters.grade = event.target.value;
    S.flow.listExamKey = "";
    S.flow.listScopeValue = "";
    S.listReady = false;
    renderReport();
  });
  $("listExamSelect").addEventListener("change", function(event) {
    S.flow.listExamKey = event.target.value || "";
    S.flow.listScopeValue = "";
    S.listReady = false;
    renderReport();
  });
  $("listScopeSelect").addEventListener("change", function(event) {
    S.flow.listScope = event.target.value || "all";
    S.flow.listScopeValue = "";
    S.listReady = false;
    renderReport();
  });
  $("listScopeValueSelect").addEventListener("change", function(event) {
    S.flow.listScopeValue = event.target.value || "";
    S.listReady = false;
    renderReport();
  });
  $("generateListBtn").addEventListener("click", function() {
    generateListReport();
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
  $("degreeExamSelect").addEventListener("change", function(event) {
    S.degree.examKey = event.target.value || "";
    S.degree.scopeValue = "";
    renderDegreePanel();
  });
  $("degreeScopeSelect").addEventListener("change", function(event) {
    S.degree.scope = event.target.value || "all";
    S.degree.scopeValue = "";
    renderDegreePanel();
  });
  $("degreeScopeValueSelect").addEventListener("change", function(event) {
    S.degree.scopeValue = event.target.value || "";
    renderDegreePanel();
  });
  $("degreeExcelBtn").addEventListener("click", function() {
    exportDegreeListExcel();
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
