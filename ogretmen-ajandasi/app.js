    const STORE_KEY = "kemalOgretmenAjandasi.v1";
    const LESSON_PLANNER_STORE_KEY = "ogretmen_plan_v2";
    const CLOUD_SYNC_TABLE = "teacher_agenda_states";
    const CLOUD_SYNC_MAX_BYTES = 6 * 1024 * 1024;
    const CLOUD_SYNC_DEBOUNCE_MS = 2200;
    const FORM_AUTOSAVE_MS = 700;
    const CLOUD_BACKUP_STORE = "snapshots";
    const SYSTEM_LOGO_SRC = "assets/kemal-kocar-logo-2025.png";
    const today = () => dateKey(new Date());
    const uid = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    const pageMeta = {
      dashboardView: ["Panel", "Sınıfınızı, öğrencilerinizi ve deneme analizlerinizi tek yerden izleyin."],
      studentsView: ["Öğrenciler", "Öğrenci profilleri, veli bilgileri, sağlık durumu ve özel notlar."],
      examsView: ["Sınavlar", "Excel dosyalarından deneme, test ve sınav sonuçlarını içe aktarın."],
      scheduleView: ["Ders Programı", "Ders programı ve haftalık planlama sisteminizi ajanda içinde kullanın."],
      calendarView: ["Akademik Takvim", "Doğum günleri, MEB takvimi, önemli günler ve hatırlatıcılarla günlük planlama yapın."],
      reportsView: ["Analiz ve Karneler", "Sınıf başarısı, sınav karşılaştırmaları ve öğrenci karneleri"],
      backupView: ["Yedek", "Tüm ajanda verinizi güvenle dışa aktarın veya geri yükleyin."]
    };

    let state = loadState();
    let editingStudentId = null;
    let pendingImport = null;
    let examColumnDraft = null;
    let examImportVersion = 0;
    let pendingStudentImport = null;
    let studentRosterWorkbook = null;
    let studentImportVersion = 0;
    let editingManualExamId = null;
    let manualDraft = {};
    let manualDraftClassId = null;
    let manualDraftDirty = false;
    let calendarDraftId = null;
    const studentEntryIds = { notes: null, meetings: null };
    const pendingFormSaves = new Map();
    let localSaveError = "";
    let failedAgendaBackup = null;
    let failedPlannerBackup = null;
    let studentPhotoProcessing = false;
    let teacherPhotoProcessing = false;
    let cropState = null;
    let calendarCursor = new Date();
    let selectedCalendarDate = today();
    let calendarViewMode = 'week';
    let openedLinkedStudent = '';
    let holidayPlannerCache = { raw: undefined, planner: { tatiller: [] }, years: new Set() };
    let activeBirthdayPopups = [];
    let clockTimer = null;
    const selectedStudentIds = new Set();
    const cloudSync = {
      ready: false,
      enabled: false,
      mode: "local",
      status: "Yerel mod",
      detail: "Giriş yapılmazsa veriler bu tarayıcıda kalır.",
      userId: "",
      client: null,
      timer: 0,
      saving: false,
      loading: false,
      saveAgain: false,
      applyingRemote: false,
      lastSavedAt: "",
      lastLoadedAt: "",
      lastError: "",
      pending: false,
      retryCount: 0,
      rowVersion: null,
      rowChecked: false
    };

    const els = {};

    document.addEventListener("DOMContentLoaded", () => {
      bindElements();
      bindEvents();
      ensureInitialClass();
      compactStoredPhotos();
      renderAll();
      initCloudSync();
      setInterval(checkDueReminders, 60000);
    });

    function bindElements() {
      ['newCalendarNoteBtn','calendarComposer','selectedDayTitle','calendarSelectedCount'].forEach(id=>{els[id]=document.getElementById(id);});
      [
        "activeClassSelect", "pageTitle", "pageSubtitle", "statsGrid", "teacherName", "schoolName",
        "className", "classYear", "newClassName", "saveSettingsBtn", "addClassBtn", "deleteClassBtn", "renameClassBtn",
        "classListPanel", "topClockTime", "topClockDate", "cloudSyncBadge", "cloudSyncStatus",
        "cloudSyncDetail", "cloudBackupStatus", "cloudSaveNowBtn", "cloudLoadNowBtn",
        "cloudSaveNowBtnBackup", "cloudLoadNowBtnBackup", "studentSearch", "studentGrid",
        "addStudentBtn", "studentDialog", "studentDialogTitle", "closeStudentDialogBtn", "cancelStudentBtn",
        "saveStudentBtn", "deleteStudentBtn", "studentPhoto", "photoPreview", "studentPhotoFit",
        "studentPhotoX", "studentPhotoY", "centerStudentPhotoBtn", "studentNo", "studentBirth",
        "studentFirstName", "studentLastName", "studentAddress", "motherName", "motherJob", "motherPhone",
        "fatherName", "fatherJob", "fatherPhone", "motherStatus", "fatherStatus", "parentsMaritalStatus",
        "custodyInfo", "backupContactName", "backupContactPhone", "backupContactRelation", "siblingCount",
        "schoolTransport", "homeOwnership", "householdSize", "studyRoomStatus", "studentAchievements",
        "specialPrograms", "healthStatus", "noteDate", "noteText", "addNoteBtn",
        "noteList", "meetingDate", "meetingType", "meetingText", "addMeetingBtn", "meetingList",
        "studentAcademic", "examName", "examDate", "excelFile", "examImportSheet", "importExamBtn", "uploadExamBtn", "importSummary", "downloadExamTemplateBtn", "mapExamColumnsBtn", "examColumnMapping", "mappingHeaderRow", "mappingName", "mappingSchoolNo", "mappingSurname", "mappingSubjects", "addMappingSubjectBtn", "applyExamMappingBtn", "mappingSample", "downloadAnalysisExcelBtn",
        "studentImportPanel", "studentImportClass", "studentRosterFile", "studentImportSheet",
        "previewStudentImportBtn", "downloadStudentTemplateBtn", "exportStudentRosterBtn", "studentImportSummary", "studentImportPreview", "confirmStudentImportBtn",
        "examList", "reportStudent", "reportExam", "subjectPicker", "refreshReportBtn", "reportCard", "analysisOverview", "analysisClassLabel", "classAnalysisOptions", "analysisTarget", "analysisStudentNames",
        "downloadPdfBtn", "downloadPngBtn", "downloadJpegBtn", "shareWhatsappBtn", "exportBackupBtn", "backupFile",
        "importBackupBtn", "clearAllBtn", "recentAcademic", "quickAddClassBtn", "importReviewDialog",
        "importReviewBody", "closeImportReviewBtn", "cancelImportReviewBtn", "confirmImportReviewBtn",
        "allowNewStudents", "manualExamName", "manualExamDate", "manualSubjects", "prepareManualExamBtn",
        "saveManualExamBtn", "manualExamEntry", "examScope", "showRankings", "examWrongPenalty",
        "examSubjectPoints", "examMaxScore", "manualExamScope", "manualShowRankings", "manualWrongPenalty",
        "manualSubjectPoints", "manualMaxScore", "manualExamType", "manualClass", "manualStudent",
        "cancelManualExamBtn", "manualExamStatus", "reportExamPicker", "teacherPhoto", "teacherPhotoPreview", "heroTeacherPhoto", "heroGreeting",
        "heroSummary", "heroClassBadge", "heroTodayLine", "dashboardFocusTitle", "dashboardFocusText",
        "dashboardTodayLabel", "dashboardTodayAgenda", "dashboardUpcoming", "dashboardAttention",
        "dashboardReadinessValue", "dashboardReadinessText", "dashboardReadinessBar",
        "updateExamSelect", "selectAllStudents", "selectedStudentCount",
        "clearStudentSelectionBtn", "deleteSelectedStudentsBtn", "reportType", "classListOptions",
        "classListParents", "rankingReportOptions", "rankingExam", "rankingScope", "rankingClassFilter",
        "rankingSchoolFilter", "rankingProvinceFilter", "meetingReportOptions", "meetingReportStudent", "meetingPicker",
        "studentSummaryOptions", "summaryStudent", "summaryFamily", "summaryAddress", "summaryHealth",
        "summaryFamilyDetails", "summaryNote", "summaryMeeting", "summaryNoteSelect", "summaryMeetingSelect", "schoolLogo",
        "schoolLogoPreview", "reportStudentMeetingsBtn", "studentSummaryReportBtn", "photoCropDialog",
        "closePhotoCropBtn", "cancelPhotoCropBtn", "applyPhotoCropBtn", "cropFrame", "cropImage",
        "cropZoom", "cropCenterBtn", "scheduleDay", "schedulePeriod", "scheduleTime", "scheduleLesson",
        "scheduleGroup", "scheduleRoom", "scheduleColor", "scheduleNote", "saveScheduleItemBtn",
        "clearScheduleFormBtn", "scheduleBoard", "scheduleSummary", "lessonPlannerFrame",
        "lessonPlannerFocusDate", "lessonPlannerFocusInfo", "lessonPlannerPrevWeekBtn",
        "lessonPlannerTodayBtn", "lessonPlannerNextWeekBtn", "prevCalendarMonthBtn",
        "nextCalendarMonthBtn", "todayCalendarBtn", "requestNotificationBtn", "manageHolidaysBtn", "calendarTitle",
        "calendarGrid", "calendarEventDate", "calendarEventType", "calendarEventTime",
        "calendarEventTitle", "calendarReminder", "calendarEventNote", "saveCalendarEventBtn",
        "clearCalendarFormBtn", "selectedDayEvents", "birthdayDialog", "birthdayPopupBody",
        "closeBirthdayDialogBtn", "birthdayLaterBtn", "birthdaySeenBtn"
      ].forEach((id) => { els[id] = document.getElementById(id); });
    }

    function bindEvents() {
      document.querySelectorAll(".nav button").forEach((button) => {
        button.addEventListener("click", () => showView(button.dataset.view));
      });

      document.querySelectorAll("[data-jump]").forEach((button) => {
        button.addEventListener("click", () => showView(button.dataset.jump));
      });

      els.activeClassSelect.addEventListener("change", () => {
        if (!finishClassEditing()) { els.activeClassSelect.value = state.activeClassId; return; }
        resetManualExam();
        state.activeClassId = els.activeClassSelect.value;
        selectedStudentIds.clear();
        saveState();
        renderAll();
      });

      els.quickAddClassBtn.addEventListener("click", () => {
        showView("dashboardView");
        els.newClassName?.focus();
      });
      els.saveSettingsBtn.addEventListener("click", saveSettingsAndClass);
      els.renameClassBtn?.addEventListener('click', () => editClassFromPanel(state.activeClassId));
      els.addClassBtn.addEventListener("click", addClassFromPanel);
      els.teacherPhoto.addEventListener("change", handleTeacherPhotoUpload);
      els.schoolLogo.addEventListener("change", handleSchoolLogoUpload);
      els.deleteClassBtn.addEventListener("click", deleteActiveClass);
      els.studentSearch.addEventListener("input", renderStudents);
      els.addStudentBtn.addEventListener("click", () => openStudentDialog());
      els.studentRosterFile.addEventListener("change", () => clearStudentRosterImport(true));
      els.studentImportClass.addEventListener("change", () => clearStudentRosterImport());
      els.studentImportSheet.addEventListener("change", previewStudentRosterImport);
      els.previewStudentImportBtn.addEventListener("click", previewStudentRosterImport);
      els.confirmStudentImportBtn.addEventListener("click", commitStudentRosterImport);
      els.downloadStudentTemplateBtn.addEventListener("click", downloadStudentRosterTemplate);
      els.exportStudentRosterBtn.addEventListener("click", exportStudentRoster);
      els.excelFile.addEventListener("change", resetExamImport);
      els.uploadExamBtn?.addEventListener('click', () => importExamFromExcel({auto:true}));
      els.mapExamColumnsBtn?.addEventListener('click', openExamColumnMapping);
      els.addMappingSubjectBtn?.addEventListener('click', () => addExamMappingSubject());
      els.applyExamMappingBtn?.addEventListener('click', applyExamColumnMapping);
      els.mappingHeaderRow?.addEventListener('change', renderExamMappingColumns);
      els.downloadAnalysisExcelBtn?.addEventListener('click', downloadAnalysisExcel);
      els.examImportSheet.addEventListener("change", () => { examImportVersion += 1; pendingImport = null; examColumnDraft = null; els.examColumnMapping.hidden = true; els.importSummary.textContent = ''; });
      els.downloadExamTemplateBtn.addEventListener("click", downloadExamTemplate);
      els.selectAllStudents.addEventListener("change", toggleSelectAllStudents);
      els.clearStudentSelectionBtn.addEventListener("click", clearStudentSelection);
      els.deleteSelectedStudentsBtn.addEventListener("click", deleteSelectedStudents);
      els.closeStudentDialogBtn.addEventListener("click", closeStudentEditor);
      els.cancelStudentBtn.addEventListener("click", () => {
        const keys = ["student", "note", "meeting"];
        if (keys.some(key => pendingFormSaves.has(key)) && !confirm("Henüz kaydedilmemiş alanlar bırakılsın mı? Önceden kaydedilen değişiklikler kalır.")) return;
        keys.forEach(clearFormSave);
        els.studentDialog.close();
      });
      els.studentDialog.addEventListener("cancel", (event) => { event.preventDefault(); closeStudentEditor(); });
      els.saveStudentBtn.addEventListener("click", closeStudentEditor);
      els.deleteStudentBtn.addEventListener("click", deleteStudentFromDialog);
      els.studentPhoto.addEventListener("change", handlePhotoUpload);
      els.studentPhotoFit.addEventListener("change", updatePhotoPreviewSettings);
      els.studentPhotoX.addEventListener("input", updatePhotoPreviewSettings);
      els.studentPhotoY.addEventListener("input", updatePhotoPreviewSettings);
      els.centerStudentPhotoBtn.addEventListener("click", centerStudentPhoto);
      els.closePhotoCropBtn.addEventListener("click", cancelPhotoCrop);
      els.cancelPhotoCropBtn.addEventListener("click", cancelPhotoCrop);
      els.applyPhotoCropBtn.addEventListener("click", applyPhotoCrop);
      els.cropCenterBtn.addEventListener("click", centerCropImage);
      els.cropZoom.addEventListener("input", updateCropZoom);
      els.cropFrame.addEventListener("pointerdown", startCropDrag);
      els.photoCropDialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        cancelPhotoCrop();
      });
      els.addNoteBtn.addEventListener("click", addNoteToStudent);
      els.addMeetingBtn.addEventListener("click", addMeetingToStudent);
      els.reportStudentMeetingsBtn.addEventListener("click", reportCurrentStudentMeetings);
      els.studentSummaryReportBtn.addEventListener("click", reportCurrentStudentSummary);
      els.importExamBtn.addEventListener("click", importExamFromExcel);
      els.updateExamSelect.addEventListener("change", handleUpdateExamSelection);
      els.closeImportReviewBtn.addEventListener("click", () => els.importReviewDialog.close());
      els.cancelImportReviewBtn.addEventListener("click", () => els.importReviewDialog.close());
      els.confirmImportReviewBtn.addEventListener("click", commitPendingImport);
      els.prepareManualExamBtn.addEventListener("click", renderManualExamEntry);
      els.saveManualExamBtn.addEventListener("click", saveManualExam);
      els.cancelManualExamBtn.addEventListener("click", () => {
        if (!canDiscardManualExam()) return;
        resetManualExam(); renderManualExamSelectors();
      });
      els.manualClass.addEventListener("change", () => {
        if (!finishClassEditing()) { els.manualClass.value = state.activeClassId; return; }
        resetManualExam();
        state.activeClassId = els.manualClass.value;
        selectedStudentIds.clear();
        saveState();
        renderAll();
        renderManualExamEntry();
      });
      els.manualStudent.addEventListener("change", renderManualExamEntry);
      [els.manualSubjects, els.manualSubjectPoints, els.manualMaxScore, els.manualWrongPenalty].forEach(input => {
        input.addEventListener("change", renderManualExamEntry);
      });
      [els.manualSubjects, els.manualSubjectPoints, els.manualMaxScore, els.manualWrongPenalty,
        els.manualExamName, els.manualExamType, els.manualExamDate, els.manualExamScope, els.manualShowRankings].forEach(input => {
        input.addEventListener("input", queueManualExamSave);
        input.addEventListener("change", queueManualExamSave);
      });
      window.addEventListener('beforeunload', event => {
        flushFormSaves();
        if (!pendingFormSaves.size && !localSaveError && !failedPlannerBackup) return;
        event.preventDefault();
        event.returnValue = '';
      });
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) return;
        flushFormSaves();
        if (cloudSync.pending && cloudSync.ready) void saveCloudNow();
      });
      window.addEventListener("online", retryPendingCloudSave);
      els.reportStudent.addEventListener("change", () => { updateSubjectPicker(); buildReport(); });
      els.reportExam.addEventListener("change", () => { renderReportOptions(); updateSubjectPicker(); buildReport(); });
      document.querySelectorAll('[data-report-mode]').forEach(button => button.addEventListener('click', () => {
        els.reportType.value = button.dataset.reportMode;
        renderReportOptions(); buildReport();
      }));
      document.querySelector('.report-mode-tabs')?.addEventListener('keydown', event => {
        if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
        const tabs=Array.from(document.querySelectorAll('[data-report-mode]'));
        const current=tabs.indexOf(document.activeElement);
        if(current<0)return;
        event.preventDefault();
        const index=event.key==='Home'?0:event.key==='End'?tabs.length-1:(current+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
        tabs[index].focus();tabs[index].click();
      });
      els.analysisTarget?.addEventListener('change', buildReport);
      els.analysisStudentNames?.addEventListener('change', buildReport);
      els.refreshReportBtn.addEventListener("click", buildReport);
      els.reportType.addEventListener("change", () => {
        renderReportOptions();
        updateSubjectPicker();
        buildReport();
      });
      els.classListParents.addEventListener("change", buildReport);
      els.rankingExam.addEventListener("change", () => { renderRankingFilters(); buildReport(); });
      [els.rankingScope, els.rankingClassFilter, els.rankingSchoolFilter, els.rankingProvinceFilter]
        .forEach((input) => input.addEventListener("change", buildReport));
      els.meetingReportStudent.addEventListener("change", () => { renderMeetingPicker(); buildReport(); });
      els.summaryStudent.addEventListener("change", () => { renderSummaryPickers(); buildReport(); });
      [els.summaryFamily, els.summaryAddress, els.summaryHealth, els.summaryFamilyDetails, els.summaryNote, els.summaryMeeting]
        .forEach((input) => input.addEventListener("change", buildReport));
      els.summaryNoteSelect.addEventListener("change", buildReport);
      els.summaryMeetingSelect.addEventListener("change", buildReport);
      els.downloadPdfBtn.addEventListener("click", downloadPdf);
      els.downloadPngBtn.addEventListener("click", () => downloadImage("png"));
      els.downloadJpegBtn.addEventListener("click", () => downloadImage("jpeg"));
      els.shareWhatsappBtn.addEventListener("click", shareReportWhatsapp);
      els.exportBackupBtn.addEventListener("click", exportBackup);
      document.getElementById("exportCloudRecoveryBtn")?.addEventListener("click", exportCloudRecovery);
      document.querySelectorAll("[data-download-agenda-backup]").forEach(button => button.addEventListener("click", exportBackup));
      els.importBackupBtn.addEventListener("click", importBackup);
      els.clearAllBtn.addEventListener("click", clearAllData);
      els.cloudSaveNowBtn?.addEventListener("click", () => saveCloudNow({ manual: true }));
      els.cloudLoadNowBtn?.addEventListener("click", () => loadCloudNow({ manual: true }));
      els.cloudSaveNowBtnBackup?.addEventListener("click", () => saveCloudNow({ manual: true }));
      els.cloudLoadNowBtnBackup?.addEventListener("click", () => loadCloudNow({ manual: true }));
      els.saveScheduleItemBtn?.addEventListener("click", saveScheduleItem);
      els.clearScheduleFormBtn?.addEventListener("click", clearScheduleForm);
      els.lessonPlannerFrame?.addEventListener("load", syncLessonPlannerFrame);
      els.lessonPlannerFocusDate?.addEventListener("change", () => setLessonPlannerFocusDate(els.lessonPlannerFocusDate.value));
      els.lessonPlannerPrevWeekBtn?.addEventListener("click", () => shiftLessonPlannerFocus(-7));
      els.lessonPlannerTodayBtn?.addEventListener("click", () => setLessonPlannerFocusDate(today()));
      els.lessonPlannerNextWeekBtn?.addEventListener("click", () => shiftLessonPlannerFocus(7));
      window.addEventListener("message", handleLessonPlannerMessage);
      els.prevCalendarMonthBtn.addEventListener("click", () => moveCalendarMonth(-1));
      els.nextCalendarMonthBtn.addEventListener("click", () => moveCalendarMonth(1));
      els.todayCalendarBtn.addEventListener("click", goTodayCalendar);
      els.newCalendarNoteBtn?.addEventListener('click',()=>openCalendarComposer(selectedCalendarDate));
      document.querySelectorAll('[data-calendar-mode]').forEach(button=>button.addEventListener('click',()=>{
        calendarViewMode=button.dataset.calendarMode==='month'?'month':'week';renderCalendar();
      }));
      els.manageHolidaysBtn?.addEventListener("click", openHolidayManager);
      els.requestNotificationBtn.addEventListener("click", requestNotificationPermission);
      els.calendarEventDate.addEventListener("change", () => selectCalendarDate(els.calendarEventDate.value || today()));
      els.saveCalendarEventBtn.addEventListener("click", saveCalendarEvent);
      els.clearCalendarFormBtn.addEventListener("click", () => { if (flushFormSave("calendar")) clearCalendarForm(); });
      els.closeBirthdayDialogBtn.addEventListener("click", closeBirthdayDialog);
      els.birthdayLaterBtn.addEventListener("click", closeBirthdayDialog);
      els.birthdaySeenBtn.addEventListener("click", markBirthdayPopupSeen);
      els.birthdayDialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        closeBirthdayDialog();
      });

      document.querySelectorAll(".tab-btn").forEach((button) => {
        button.addEventListener("click", () => activateTab(button.dataset.tab));
      });
      const watch = (fields, key, save) => fields.filter(Boolean).forEach(field => {
        ["input", "change"].forEach(event => field.addEventListener(event, () => queueFormSave(key, save)));
      });
      watch([els.teacherName, els.schoolName, els.className, els.classYear], "settings", () => saveSettingsAndClass({ automatic: true }));
      watch([...els.studentDialog.querySelectorAll("#tabPersonal input:not([type=file]), #tabFamily input, #tabFamily select, #tabFamily textarea, #tabHealth textarea, #tabPersonal select, #tabPersonal textarea")], "student", saveStudentFromDialog);
      watch([els.noteText, els.noteDate], "note", () => addNoteToStudent({ automatic: true }));
      watch([els.meetingText, els.meetingDate, els.meetingType], "meeting", () => addMeetingToStudent({ automatic: true }));
      watch([els.calendarEventDate, els.calendarEventType, els.calendarEventTime, els.calendarEventTitle, els.calendarReminder, els.calendarEventNote], "calendar", () => saveCalendarEvent({ automatic: true }));
    }

    function queueFormSave(key, save) {
      clearTimeout(pendingFormSaves.get(key)?.timer);
      pendingFormSaves.set(key, { save, timer: setTimeout(() => flushFormSave(key), FORM_AUTOSAVE_MS) });
      renderCloudSyncStatus();
    }

    function clearFormSave(key) {
      clearTimeout(pendingFormSaves.get(key)?.timer);
      pendingFormSaves.delete(key);
    }

    function flushFormSave(key) {
      const job = pendingFormSaves.get(key);
      if (!job) return true;
      clearTimeout(job.timer);
      if (job.save() === false) return false;
      clearFormSave(key);
      renderCloudSyncStatus();
      return true;
    }

    function flushFormSaves() {
      for (const key of pendingFormSaves.keys()) flushFormSave(key);
    }

    function loadState() {
      try {
        const parsed = JSON.parse(localStorage.getItem(STORE_KEY));
        if (parsed && Array.isArray(parsed.classes)) return normalizeState(parsed);
      } catch (error) {
        console.warn(error);
      }
      return normalizeState({
        teacher: { name: "Kemal Öğretmen", schoolName: "" },
        classes: [],
        students: [],
        exams: [],
        activeClassId: null,
        updatedAt: null
      });
    }

    function normalizeState(input) {
      input.teacher = input.teacher || { name: "Kemal Öğretmen", schoolName: "" };
      input.classes = Array.isArray(input.classes) ? input.classes : [];
      input.students = Array.isArray(input.students) ? input.students : [];
      input.exams = Array.isArray(input.exams) ? input.exams : [];
      input.scheduleItems = Array.isArray(input.scheduleItems) ? input.scheduleItems : [];
      input.calendarEvents = Array.isArray(input.calendarEvents) ? input.calendarEvents : [];
      input.birthdayReminderLog = input.birthdayReminderLog && typeof input.birthdayReminderLog === "object" ? input.birthdayReminderLog : {};
      input.birthdaySnoozeLog = input.birthdaySnoozeLog && typeof input.birthdaySnoozeLog === "object" ? input.birthdaySnoozeLog : {};
      input.lessonPlannerFocusDate = today();
      input.lessonPlannerAutomaticWeek = calendarMondayKey(new Date());
      return input;
    }

    function saveState(options = {}) {
      if (!options.preserveTimestamp) state.updatedAt = new Date().toISOString();
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(state));
        if (localSaveError && !options.skipCloud && pendingFormSaves.size <= 1) {
          localSaveError = "";
          failedAgendaBackup = null;
          renderCloudSyncStatus();
        }
        if (!options.skipCloud) queueCloudSave();
        return true;
      } catch (error) {
        console.error(error);
        const message = error?.name === "QuotaExceededError"
          ? "Tarayıcı depolama alanı doldu. Sayfayı kapatmadan ajanda yedeğini indirin."
          : "Değişiklikler bu cihaza kaydedilemedi. Sayfayı kapatmadan ajanda yedeğini indirin.";
        if (!options.skipCloud) {
          failedAgendaBackup = buildCloudSnapshot();
          localSaveError = message;
          renderCloudSyncStatus();
        }
        toast(message);
        return false;
      }
    }

    async function initCloudSync() {
      renderCloudSyncStatus();
      if (!window.kemalUserAuth || typeof window.kemalUserAuth.ready !== "function") {
        setCloudSyncStatus("local", "Yerel mod", "Giriş altyapısı yüklenemediği için veriler bu tarayıcıda saklanıyor.");
        return;
      }
      window.addEventListener("kemal-user-auth-changed", () => {
        refreshCloudSyncAuth({ silent: true });
      });
      await refreshCloudSyncAuth();
    }

    async function refreshCloudSyncAuth(options = {}) {
      setCloudSyncStatus("syncing", "Oturum kontrol ediliyor", "Kayıtlı öğretmen hesabı bulunursa bulut senkronu açılır.");
      try {
        const authState = await window.kemalUserAuth.ready();
        const user = authState?.user || null;
        const profile = authState?.profile || {};
        if (!user?.id) {
          disableCloudSync("Yerel mod", "Giriş yapılmadığı için ajanda verileri yalnızca bu tarayıcıda saklanıyor.");
          return;
        }
        if (profile.role !== "teacher" || profile.active === false || (profile.approval_status && profile.approval_status !== "active")) {
          disableCloudSync("Yerel mod", "Bulut senkron yalnızca aktif öğretmen hesaplarında çalışır.");
          return;
        }
        if (cloudSync.userId !== user.id) {
          cloudSync.rowVersion = null; cloudSync.rowChecked = false; cloudSync.ready = false;
          // The owned mobile bootstrap records which server revision produced
          // this local snapshot. A server read alone cannot establish lineage.
          const base = window.__KEMAL_AGENDA_LOCAL_BASE__;
          if (base?.checked && (typeof base.revision === "string" || base.revision === null)) {
            cloudSync.rowVersion = base.revision; cloudSync.rowChecked = true;
          } else restoreCloudVersion(user.id);
        }
        cloudSync.client = window.kemalUserAuth.getClient();
        cloudSync.userId = user.id;
        cloudSync.enabled = true;
        setCloudSyncStatus("syncing", "Bulut kontrol ediliyor", "Ajandanızın son bulut kaydı karşılaştırılıyor.");
        await reconcileCloudState(options);
        openLinkedAgendaStudent();
      } catch (error) {
        console.warn(error);
        disableCloudSync("Yerel mod", "Bulut bağlantısı kurulamadı; yerel kayıt açık kalır.");
      }
    }

    function disableCloudSync(status, detail) {
      const interrupted = cloudSync.enabled && cloudSync.pending;
      clearTimeout(cloudSync.timer);
      cloudSync.saveAgain = false;
      cloudSync.ready = false;
      cloudSync.enabled = false;
      cloudSync.client = null;
      cloudSync.userId = "";
      cloudSync.rowVersion = null;
      cloudSync.rowChecked = false;
      if (interrupted) setCloudSyncError("Bulut oturumu kapandı. Cihazdaki kayıt korunuyor; yeniden giriş yapın veya yedeğini indirin.");
      else setCloudSyncStatus("local", status, detail);
    }

    async function reconcileCloudState(options = {}) {
      const userId = cloudSync.userId;
      try {
        const row = await fetchCloudRow();
        if (userId !== cloudSync.userId || cloudSync.saving || cloudSync.loading) return;
        const owner = localStorage.getItem(`${STORE_KEY}.owner`);
        if (owner && owner !== cloudSync.userId && localHasMeaningfulAgenda()) {
          cloudSync.ready = false;
          setCloudSyncError('Bu cihazdaki ajanda başka hesaba ait. Yerel kayıt korunuyor; Buluttan Al ile kendi ajandanızı açın.');
          return;
        }
        if (!row) {
          acceptCloudVersion(null);
          cloudSync.ready = true;
          if (cloudSync.pending && localHasMeaningfulAgenda()) { queueCloudSave(); return; }
          setCloudSyncStatus("ready", "Bulut hazır", localHasMeaningfulAgenda()
            ? "Bu cihazdaki kayıt ilk değişiklikte buluta aktarılacak. İsterseniz Şimdi Buluta Kaydet düğmesini kullanın."
            : "Bu öğretmen hesabı için henüz bulut ajandası yok.");
          return;
        }

        if (cloudSnapshotMatches(row)) {
          acceptCloudVersion(row);
          cloudSync.ready = true;
          cloudSync.pending = false;
          cloudSync.retryCount = 0;
          cloudSync.lastSavedAt = row.updated_at || row.client_updated_at || "";
          setCloudSyncStatus("ready", "Bulut güncel", `Son kayıt: ${formatCloudDate(row.updated_at || row.client_updated_at)} · ${formatBytes(row.storage_bytes || 0)}.`);
          return;
        }
        if (localHasMeaningfulAgenda() && cloudSync.rowChecked && cloudSync.rowVersion === row.updated_at) {
          cloudSync.ready = true;
          await saveCloudNow({ silent: true });
          return;
        }
        const remoteTime = remoteUpdatedTime(row);
        const localTime = Date.parse(state.updatedAt || "") || 0;
        // Opening the page creates a default class. That initialization must
        // never win against a real cloud record just because its clock is newer.
        if (!localHasMeaningfulAgenda() || (!options.retry && remoteTime && remoteTime > localTime + 2000)) {
          const shouldAsk = localHasMeaningfulAgenda() && localTime;
          const shouldLoad = !shouldAsk || confirm("Bulutta bu cihazdakinden daha yeni bir Öğretmen Ajandası kaydı var. Buluttaki veriyi bu cihaza yükleyelim mi? Mevcut yerel kayıt güvenlik yedeği olarak saklanacak.");
          if (shouldLoad) {
            if (!await applyCloudRow(row)) return;
            cloudSync.ready = true;
            cloudSync.lastLoadedAt = new Date().toISOString();
            setCloudSyncStatus("ready", "Buluttan yüklendi", `Son bulut kaydı bu cihaza alındı. Veri boyutu: ${formatBytes(row.storage_bytes || 0)}.`);
            if (!options.silent) toast("Buluttaki ajanda bu cihaza yüklendi.");
            return;
          }
          cloudSync.ready = false;
          setCloudSyncError("Yerel kayıt korundu. Buluttaki yeni kayıt alınmadı; iki sürümü karşılaştırıp hangisini kullanacağınızı seçin.");
          return;
        }

        // A newer device clock cannot establish the local document's lineage.
        cloudSync.ready = false;
        setCloudSyncError("Bu cihazdaki ajandanın bulut sürümü doğrulanamadı. Yerel kayıt korundu; Yedek bölümünden yedek alıp son bulut kaydını yükleyin. Cihaz saati tek başına buluttaki kaydın üzerine yazılmasına izin vermez.");
      } catch (error) {
        if (userId !== cloudSync.userId) return;
        console.warn(error);
        setCloudSyncError(cloudErrorMessage(error));
        scheduleCloudRetry(error);
      }
    }

    function queueCloudSave() {
      cloudSync.pending = true;
      if (!cloudSync.enabled || !cloudSync.client || !cloudSync.userId || cloudSync.applyingRemote) return;
      // Edits/deletions made during a slow request need a second snapshot.
      if (cloudSync.saving) { cloudSync.saveAgain = true; return; }
      if (!cloudSync.ready) return;
      clearTimeout(cloudSync.timer);
      cloudSync.timer = setTimeout(() => {
        if (cloudSync.pending) void saveCloudNow({ queued: true });
      }, CLOUD_SYNC_DEBOUNCE_MS);
      setCloudSyncStatus("syncing", "Buluta kaydedilecek", "Değişiklikler birkaç saniye içinde öğretmen hesabınıza aktarılır.");
    }

    function retryPendingCloudSave() {
      if (!cloudSync.enabled || !cloudSync.pending || cloudSync.saving || cloudSync.loading || cloudSync.applyingRemote) return;
      clearTimeout(cloudSync.timer);
      // Re-read first: the previous write might have completed after a timeout.
      return reconcileCloudState({ silent: true, retry: true });
    }

    function scheduleCloudRetry(error) {
      if (!cloudSync.pending || !isCloudConnectionError(error) || cloudSync.retryCount >= 3) return;
      const delay = 4000 * (2 ** cloudSync.retryCount++);
      clearTimeout(cloudSync.timer);
      cloudSync.timer = setTimeout(retryPendingCloudSave, delay);
    }

    function isCloudConnectionError(error) {
      return /abort|fetch|network|time.?out|connection|50[234]|522/i.test(String(error?.message || error || ""));
    }

    function cloudRequest(query) {
      if (typeof query.abortSignal !== "function") return query.maybeSingle();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      return Promise.resolve(query.abortSignal(controller.signal).maybeSingle()).finally(() => clearTimeout(timeout));
    }

    async function saveCloudNow(options = {}) {
      if (!cloudSync.enabled || !cloudSync.client || !cloudSync.userId) {
        if (options.manual) toast("Bulut senkron için aktif öğretmen hesabıyla giriş yapılmalı.");
        renderCloudSyncStatus();
        return false;
      }
      if (cloudSync.saving || cloudSync.loading || cloudSync.applyingRemote) return false;
      const userId = cloudSync.userId;
      const client = cloudSync.client;
      clearTimeout(cloudSync.timer);
      cloudSync.saving = true;
      setCloudSyncStatus("syncing", "Buluta kaydediliyor", "Yerel ajanda verisi öğretmen hesabınıza aktarılıyor.");
      try {
        let expectedRevision = cloudSync.rowVersion;
        let checked = cloudSync.rowChecked;
        let snapshot;
        const ownerKey = `${STORE_KEY}.owner`;
        const owner = localStorage.getItem(ownerKey);
        if (owner && owner !== userId) throw new Error('Bu cihazdaki ajanda başka hesaba ait. Yerel yedeği aldıktan sonra Buluttan Al ile kendi ajandanızı açın.');
        if (!options.manual && !cloudSync.ready) return false;
        if (options.manual && (!cloudSync.rowChecked || !cloudSync.ready)) {
          const latest = await fetchCloudRow();
          if (userId !== cloudSync.userId || client !== cloudSync.client) return false;
          if (owner !== localStorage.getItem(ownerKey)) throw new Error("Cihazdaki ajanda hesabı değişti. Yeniden deneyin.");
          if (latest && !cloudSnapshotMatches(latest)) {
            if (!confirm('Cihaz ve bulut ajandaları farklı. Bu cihazdaki sürüm buluttaki sürümün yerine yazılsın mı? İki sürüm de bu cihazda yedeklenecek ve Yedek bölümünden indirilebilecek.')) {
              setCloudSyncError('İşlem iptal edildi. Yerel ve bulut kayıtları değiştirilmedi.');
              return false;
            }
            snapshot = buildCloudSnapshot();
            const storedAgenda = localStorage.getItem(STORE_KEY);
            await writeCloudRecovery(userId, snapshot, latest);
            if (userId !== cloudSync.userId || client !== cloudSync.client) return false;
            if (JSON.stringify(snapshot) !== JSON.stringify(buildCloudSnapshot()) ||
                owner !== localStorage.getItem(ownerKey) || storedAgenda !== localStorage.getItem(STORE_KEY)) {
              throw new Error("Yedek alınırken cihazdaki kayıt değişti. Hiçbir bulut kaydı değiştirilmedi; yeniden deneyin.");
            }
          }
          // A read (even after confirmation) is not a persisted write baseline.
          expectedRevision = latest?.updated_at || null;
          checked = true;
        }
        if (!checked) throw new Error("Bulut kaydı henüz doğrulanmadı. Önce bulut kontrolünün tamamlanmasını bekleyin.");
        snapshot ||= buildCloudSnapshot();
        const bytes = payloadBytes(snapshot);
        if (bytes > CLOUD_SYNC_MAX_BYTES) {
          throw new Error(`Ajanda verisi bulut sınırını aşıyor (${formatBytes(bytes)}). Fotoğrafları küçültüp tekrar deneyin ya da JSON yedek kullanın.`);
        }
        const payload = {
          user_id: userId,
          agenda_state: snapshot.agendaState,
          lesson_planner_state: snapshot.lessonPlannerState,
          app_version: "teacher-agenda-v1",
          storage_bytes: bytes,
          client_updated_at: snapshot.agendaState.updatedAt || new Date().toISOString()
        };
        // Compare the server revision we loaded, not just the client's clock.
        // A second device's work must survive a stale autosave on this device.
        let query = client.from(CLOUD_SYNC_TABLE);
        query = expectedRevision
          ? query.update(payload).eq("user_id", userId).eq("updated_at", expectedRevision)
          : query.insert(payload);
        const result = await cloudRequest(query.select("updated_at,storage_bytes"));
        if (userId !== cloudSync.userId || client !== cloudSync.client) return false;
        if (result.error && result.error.code !== "23505") throw result.error;
        if (!result.data) {
          cloudSync.ready = false;
          throw new Error("Ajanda başka bir cihazda değişti. Yerel çalışmanız korundu; Yedek bölümünden son bulut kaydını yükleyip yeniden deneyin.");
        }
        acceptCloudVersion(result.data);
        cloudSync.ready = true;
        cloudSync.pending = cloudSync.saveAgain;
        cloudSync.retryCount = 0;
        cloudSync.lastSavedAt = result.data?.updated_at || new Date().toISOString();
        setCloudSyncStatus("ready", "Buluta kaydedildi", `Son kayıt: ${formatCloudDate(cloudSync.lastSavedAt)} · Veri: ${formatBytes(result.data?.storage_bytes || bytes)}.`);
        if (options.manual) toast("Ajanda buluta kaydedildi.");
        return true;
      } catch (error) {
        if (userId !== cloudSync.userId || client !== cloudSync.client) return false;
        console.warn(error);
        cloudSync.pending = true;
        setCloudSyncError(cloudErrorMessage(error));
        scheduleCloudRetry(error);
        if (options.manual) toast(cloudErrorMessage(error));
        return false;
      } finally {
        cloudSync.saving = false;
        renderCloudSyncStatus();
        if (cloudSync.saveAgain && userId === cloudSync.userId && client === cloudSync.client) {
          cloudSync.saveAgain = false;
          queueCloudSave();
        }
      }
    }

    async function loadCloudNow(options = {}) {
      if (!cloudSync.enabled || !cloudSync.client || !cloudSync.userId) {
        if (options.manual) toast("Buluttan yüklemek için aktif öğretmen hesabıyla giriş yapılmalı.");
        renderCloudSyncStatus();
        return false;
      }
      if (cloudSync.loading || cloudSync.saving || cloudSync.applyingRemote) return false;
      flushFormSaves();
      if (pendingFormSaves.size || localSaveError || failedPlannerBackup) {
        if (options.manual) toast("Tamamlanmamış veya kaydedilememiş değişiklikler var. Önce onları tamamlayın ya da yedek alın.");
        return false;
      }
      const userId = cloudSync.userId;
      cloudSync.loading = true;
      try {
        setCloudSyncStatus("syncing", "Buluttan alınıyor", "Öğretmen hesabınızdaki son ajanda kaydı okunuyor.");
        const row = await fetchCloudRow();
        if (userId !== cloudSync.userId) return false;
        if (!row) {
          const owner = localStorage.getItem(`${STORE_KEY}.owner`);
          if (owner && owner !== userId && localHasMeaningfulAgenda()) {
            cloudSync.ready = false;
            throw new Error("Bu hesapta bulut ajandası bulunamadı. Bu cihazdaki diğer hesaba ait kayıt korunuyor.");
          }
          acceptCloudVersion(null);
          cloudSync.ready = true;
          setCloudSyncStatus("ready", "Bulut hazır", "Bu hesapta henüz bulut ajandası bulunamadı.");
          if (options.manual) toast("Bulutta kayıtlı ajanda bulunamadı.");
          return false;
        }
        const shouldLoad = !localHasMeaningfulAgenda() || confirm("Buluttaki son ajanda kaydı bu cihaza yüklensin mi? Mevcut yerel kayıt güvenlik yedeği olarak saklanacak.");
        if (!shouldLoad) {
          renderCloudSyncStatus();
          return false;
        }
        if (!await applyCloudRow(row)) return false;
        cloudSync.ready = true;
        cloudSync.lastLoadedAt = new Date().toISOString();
        setCloudSyncStatus("ready", "Buluttan yüklendi", `Son bulut kaydı bu cihaza alındı. Veri boyutu: ${formatBytes(row.storage_bytes || 0)}.`);
        if (options.manual) toast("Buluttaki ajanda yüklendi.");
        return true;
      } catch (error) {
        if (userId !== cloudSync.userId) return false;
        console.warn(error);
        setCloudSyncError(cloudErrorMessage(error));
        if (options.manual) toast(cloudErrorMessage(error));
        return false;
      } finally {
        cloudSync.loading = false;
        renderCloudSyncStatus();
      }
    }

    async function fetchCloudRow() {
      const result = await cloudRequest(cloudSync.client
        .from(CLOUD_SYNC_TABLE)
        .select("agenda_state,lesson_planner_state,client_updated_at,updated_at,storage_bytes")
        .eq("user_id", cloudSync.userId));
      if (result.error) throw result.error;
      if (result.data && (!result.data.agenda_state ||
          !Array.isArray(result.data.agenda_state.classes) || !Array.isArray(result.data.agenda_state.students) ||
          !Array.isArray(result.data.agenda_state.exams) || typeof result.data.updated_at !== "string")) {
        throw new Error("Buluttaki ajanda kaydı geçerli görünmüyor. Yerel kayıt korundu.");
      }
      return result.data || null;
    }

    function acceptCloudVersion(row) {
      cloudSync.rowVersion = row?.updated_at || null;
      cloudSync.rowChecked = true;
      if (cloudSync.userId) {
        try {
          localStorage.setItem(`${STORE_KEY}.base.${cloudSync.userId}`, JSON.stringify({ revision: cloudSync.rowVersion }));
          localStorage.setItem(`${STORE_KEY}.owner`, cloudSync.userId);
        } catch (error) { console.warn('Bulut sürüm bilgisi cihazda saklanamadı.'); }
      }
    }

    function restoreCloudVersion(userId) {
      try {
        if (localStorage.getItem(`${STORE_KEY}.owner`) !== userId) return;
        const base = JSON.parse(localStorage.getItem(`${STORE_KEY}.base.${userId}`));
        if (base && (typeof base.revision === 'string' || base.revision === null)) {
          cloudSync.rowVersion = base.revision;
          cloudSync.rowChecked = true;
        }
      } catch (error) { /* Missing lineage requires an explicit recovery, never an overwrite. */ }
    }

    function cloudSnapshotMatches(row) {
      // Focus/navigation and reminder delivery logs are local UI state. Ignore
      // them when recognizing an otherwise identical saved cloud document.
      function comparableAgenda(value) {
        const copy = normalizeState(JSON.parse(JSON.stringify(value)));
        for (const key of ["updatedAt", "lessonPlannerFocusDate", "lessonPlannerAutomaticWeek", "birthdayReminderLog", "birthdaySnoozeLog"]) delete copy[key];
        return copy;
      }
      function comparablePlanner(value) {
        if (!value || typeof value !== "object") return null;
        const copy = JSON.parse(JSON.stringify(value));
        for (const key of ["currentWeek", "lastFocusDate", "activeSinif"]) delete copy[key];
        // Official defaults are derived; teacher overrides remain part of the cloud document.
        copy.tatiller = (copy.tatiller || []).filter(item => item.source !== 'tr-official' || item.customized || item.disabled);
        return copy;
      }
      function stable(value) {
        if (Array.isArray(value)) return value.map(stable);
        if (!value || typeof value !== "object") return value;
        return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
      }
      return JSON.stringify(stable({ agenda: comparableAgenda(state), planner: comparablePlanner(readLessonPlannerBackup()) })) ===
        JSON.stringify(stable({ agenda: comparableAgenda(row.agenda_state), planner: comparablePlanner(row.lesson_planner_state) }));
    }

    async function applyCloudRow(row) {
      const incoming = row?.agenda_state;
      if (!incoming || !Array.isArray(incoming.classes) || !Array.isArray(incoming.students) || !Array.isArray(incoming.exams)) {
        throw new Error("Buluttaki ajanda kaydı geçerli görünmüyor.");
      }
      if (cloudSync.applyingRemote) return false;
      if (pendingFormSaves.size || localSaveError || failedPlannerBackup) {
        throw new Error("Kaydedilmemiş değişiklikler nedeniyle bulut sürümü yüklenmedi. Cihazdaki kayıt korunuyor.");
      }
      const userId = cloudSync.userId;
      const client = cloudSync.client;
      const ownerKey = `${STORE_KEY}.owner`;
      const owner = localStorage.getItem(ownerKey);
      const snapshot = buildCloudSnapshot();
      const storedAgenda = localStorage.getItem(STORE_KEY);
      const storedPlanner = localStorage.getItem(LESSON_PLANNER_STORE_KEY);
      cloudSync.applyingRemote = true;
      try {
        if (localHasMeaningfulAgenda()) {
          const backupOwner = owner || userId;
          await writeCloudRecovery(backupOwner, snapshot, backupOwner === userId ? row : null);
        }
        if (userId !== cloudSync.userId || client !== cloudSync.client) return false;
        if (pendingFormSaves.size || localSaveError || failedPlannerBackup || localStorage.getItem(ownerKey) !== owner ||
            localStorage.getItem(STORE_KEY) !== storedAgenda ||
            localStorage.getItem(LESSON_PLANNER_STORE_KEY) !== storedPlanner ||
            JSON.stringify(snapshot) !== JSON.stringify(buildCloudSnapshot())) {
          throw new Error("Yedek alınırken cihazdaki kayıt değişti. Buluttaki sürüm yüklenmedi; yeniden deneyin.");
        }
        const next = normalizeState(JSON.parse(JSON.stringify(incoming)));
        ensureAgendaClass(next);
        // A null planner can be a legacy cloud record, not a deletion.
        const planner = row.lesson_planner_state || (owner && owner !== userId ? { siniflar: [], programs: {}, tatiller: [] } : null);
        const entries = [[STORE_KEY, storedAgenda, JSON.stringify(next)]];
        if (planner) entries.push([LESSON_PLANNER_STORE_KEY, storedPlanner, JSON.stringify(planner)]);
        persistCloudDownload(entries);
        state = next;
        if (planner) notifyPlannerRestored(planner);
        ensureInitialClass();
        renderAll();
        acceptCloudVersion(row);
        cloudSync.pending = false;
        cloudSync.retryCount = 0;
        return true;
      } finally {
        cloudSync.applyingRemote = false;
      }
    }

    function persistCloudDownload(entries) {
      // Free space from smaller replacements before writing larger ones.
      const sizeChange = ([, oldValue, nextValue]) => (nextValue?.length || 0) - (oldValue?.length || 0);
      const write = (key, value) => value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value);
      const applied = [];
      try {
        for (const entry of entries.sort((a, b) => sizeChange(a) - sizeChange(b))) {
          if (entry[1] === entry[2]) continue;
          write(entry[0], entry[2]);
          applied.push(entry);
        }
      } catch (error) {
        for (const [key, previous] of applied.reverse()) {
          try { write(key, previous); } catch (rollbackError) { console.warn("Yerel kayıt geri yazılamadı.", rollbackError); }
        }
        throw error;
      }
    }

    function buildCloudSnapshot() {
      return {
        agendaState: JSON.parse(JSON.stringify(state)),
        lessonPlannerState: readLessonPlannerBackup()
      };
    }

    function accessCloudRecovery(owner, record) {
      return new Promise((resolve, reject) => {
        if (!owner || !window.indexedDB) { reject(new Error("Kurtarma deposu açılamadı.")); return; }
        const request = window.indexedDB.open("kemal-ogretmen-ajandasi-recovery", 1);
        request.onupgradeneeded = () => request.result.createObjectStore(CLOUD_BACKUP_STORE);
        request.onerror = () => reject(request.error || new Error("Kurtarma deposu açılamadı."));
        request.onblocked = () => reject(new Error("Kurtarma deposu başka bir sekmede açık."));
        request.onsuccess = () => {
          const db = request.result;
          db.onversionchange = () => db.close();
          try {
            const tx = db.transaction(CLOUD_BACKUP_STORE, record ? "readwrite" : "readonly");
            const store = tx.objectStore(CLOUD_BACKUP_STORE);
            const operation = record ? store.put(record, owner) : store.get(owner);
            tx.oncomplete = () => { db.close(); resolve(operation.result); };
            tx.onabort = tx.onerror = () => { db.close(); reject(tx.error || operation.error || new Error("Kurtarma işlemi tamamlanmadı.")); };
          } catch (error) { db.close(); reject(error); }
        };
      });
    }

    async function writeCloudRecovery(owner, local, remote) {
      try {
        await accessCloudRecovery(owner, {
          local,
          cloud: remote ? { agendaState: remote.agenda_state, lessonPlannerState: remote.lesson_planner_state || null } : null
        });
      } catch (error) {
        console.warn("Ajanda kurtarma yedeği saklanamadı.", error);
        throw new Error("Güvenlik yedeği bu tarayıcıda saklanamadı. Hiçbir sürümün üzerine yazılmadı. Yedek bölümünden yerel JSON yedeğini indirin.");
      }
    }

    function localHasMeaningfulAgenda() {
      return Boolean(
        state.students.length ||
        state.exams.length ||
        state.scheduleItems?.length ||
        state.calendarEvents?.length ||
        (state.classes.length > 1) ||
        state.classes.some(item => item?.name && item.name !== "Sınıfım") ||
        state.teacher?.photo ||
        state.teacher?.schoolLogo ||
        state.teacher?.schoolName ||
        lessonPlannerHasMeaningfulData(readLessonPlannerBackup())
      );
    }

    function lessonPlannerHasMeaningfulData(planner) {
      if (!planner || typeof planner !== "object") return false;
      return Boolean(Object.values(planner.programs || {}).some(days => Object.values(days || {}).some(items => Array.isArray(items) && items.some(item => item?.ders && !item?.isHoliday))) ||
        Object.values(planner.yillikPlanlar || {}).some(items => Array.isArray(items) && items.length) || planner.etutler?.length);
    }

    function payloadBytes(payload) {
      const text = JSON.stringify(payload);
      if (window.TextEncoder) return new TextEncoder().encode(text).length;
      return new Blob([text]).size;
    }

    function remoteUpdatedTime(row) {
      return Date.parse(row?.client_updated_at || row?.agenda_state?.updatedAt || row?.updated_at || "") || 0;
    }

    function setCloudSyncStatus(mode, status, detail) {
      cloudSync.mode = mode;
      cloudSync.status = status;
      cloudSync.detail = detail;
      cloudSync.lastError = mode === "error" ? detail : "";
      renderCloudSyncStatus();
    }

    function setCloudSyncError(message) {
      setCloudSyncStatus("error", "Bulut uyarısı", message);
    }

    function cloudErrorMessage(error) {
      const text = String(error?.message || error || "");
      if (error?.name === "QuotaExceededError") {
        return "Bu tarayıcıda ajanda için yeterli yer yok. Buluttaki kayıt değişmedi; Yedek bölümünden cihazdaki sürümü indirin.";
      }
      if (error?.code === "42P01" || error?.code === "PGRST205") {
        return "Bulut ajanda tablosu henüz Supabase üzerinde kurulmamış. SQL dosyasını çalıştırana kadar yerel kayıt devam eder.";
      }
      if (text.includes("JWT") || error?.code === "42501") {
        return "Oturum doğrulanamadı. Tekrar giriş yaptıktan sonra bulut senkronu deneyin.";
      }
      if (isCloudConnectionError(error)) {
        return "Bulut bağlantısı kesildi. Cihazdaki kayıt korunuyor; bağlantı geri geldiğinde tekrar denenecek.";
      }
      return text || "Bulut senkron sırasında beklenmeyen bir hata oluştu.";
    }

    function renderCloudSyncStatus() {
      const warning = localSaveError || (failedPlannerBackup ? "Ders planı bu cihaza kaydedilemedi. Sayfayı kapatmadan yedeğini indirin." : cloudSync.lastError);
      document.querySelectorAll("[data-agenda-save-warning]").forEach(box => {
        box.hidden = !warning;
        const message = box.querySelector("[data-save-warning-message]");
        if (message.textContent !== warning) message.textContent = warning;
      });
      const indicator = document.getElementById("agendaSaveStatus");
      if (indicator) {
        const text = warning ? "Kayıt uyarısı" : pendingFormSaves.size ? "Düzenleniyor" : cloudSync.enabled
          ? cloudSync.status : "Cihazda kayıt";
        if (indicator.textContent !== text) indicator.textContent = text;
      }
      const badge = els.cloudSyncBadge;
      if (badge) {
        badge.textContent = cloudSync.status || "Yerel mod";
        badge.className = `badge ${cloudBadgeClass()}`;
      }
      if (els.cloudSyncStatus) {
        els.cloudSyncStatus.textContent = cloudSync.enabled
          ? "Değişiklikler öğretmen hesabına otomatik kaydedilir."
          : "Giriş yapılmazsa veriler bu tarayıcıda kalır.";
      }
      if (els.cloudSyncDetail) {
        els.cloudSyncDetail.textContent = cloudSync.detail || "";
      }
      if (els.cloudBackupStatus) {
        els.cloudBackupStatus.textContent = `${cloudSync.status || "Yerel mod"} · ${cloudSync.detail || "Yerel JSON yedek sistemi çalışmaya devam eder."}`;
      }
      [els.cloudSaveNowBtn, els.cloudSaveNowBtnBackup].forEach((button) => {
        if (button) button.disabled = !cloudSync.enabled || cloudSync.saving || cloudSync.loading || cloudSync.applyingRemote;
      });
      [els.cloudLoadNowBtn, els.cloudLoadNowBtnBackup].forEach((button) => {
        if (button) button.disabled = !cloudSync.enabled || cloudSync.saving || cloudSync.loading || cloudSync.applyingRemote;
      });
    }

    function cloudBadgeClass() {
      if (cloudSync.mode === "ready") return "cloud-ready";
      if (cloudSync.mode === "syncing") return "cloud-syncing";
      if (cloudSync.mode === "error") return "cloud-error";
      return "cloud-local";
    }

    function formatCloudDate(value) {
      const date = value ? new Date(value) : null;
      if (!date || Number.isNaN(date.getTime())) return "Henüz yok";
      return date.toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    }

    function formatBytes(value) {
      const bytes = Number(value || 0);
      if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
      if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
      return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
    }

    function ensureAgendaClass(agenda) {
      if (!agenda.classes.length) {
        const classId = uid("class");
        agenda.classes.push({ id: classId, name: "Sınıfım", year: "2025-2026", teacherName: "Kemal Öğretmen" });
      }
      if (!agenda.classes.some((item) => item.id === agenda.activeClassId)) {
        agenda.activeClassId = agenda.classes[0].id;
        return true;
      }
      return false;
    }

    function ensureInitialClass() {
      if (ensureAgendaClass(state)) saveState({ skipCloud: true, preserveTimestamp: true });
      els.examDate.value = today();
      els.manualExamDate.value = today();
      els.manualSubjects.value = "Türkçe, Matematik, Hayat Bilgisi";
      els.examScope.value = "class";
      els.manualExamScope.value = "class";
      els.noteDate.value = today();
      els.meetingDate.value = today();
    }

    function activeClass() {
      return state.classes.find((item) => item.id === state.activeClassId) || null;
    }

    function activeStudents() {
      return state.students
        .filter((student) => student.classId === state.activeClassId)
        .sort((a, b) => naturalStudentKey(a).localeCompare(naturalStudentKey(b), "tr"));
    }

    function activeExams() {
      return state.exams
        .filter((exam) => exam.classId === state.activeClassId)
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    }

    function naturalStudentKey(student) {
      return `${String(student.schoolNo || "").padStart(5, "0")} ${student.firstName || ""} ${student.lastName || ""}`;
    }

    function renderAll() {
      renderClassSelect();
      renderSettings();
      renderDashboard();
      renderStudents();
      renderExams();
      renderManualExamSelectors();
      renderSchedule();
      renderTopClock();
      startClock();
      renderCloudSyncStatus();
      renderLessonPlannerFocus();
      renderCalendar();
      renderUpdateExamSelect();
      renderReportSelectors();
      renderReportOptions();
      updateSubjectPicker();
      buildReport();
      checkDueReminders();
      openLinkedAgendaStudent();
    }

    function openLinkedAgendaStudent() {
      const query = new URLSearchParams(window.location?.search || '');
      const id = query.get('studentId');
      const classId = query.get('classId');
      if (!id || id === openedLinkedStudent || query.get('mobileView') !== 'studentsView') return;
      if (!cloudSync.userId || localStorage.getItem(`${STORE_KEY}.owner`) !== cloudSync.userId) return;
      const student = state.students.find(item => item.id === id && item.classId === classId);
      if (!student || !state.classes.some(item => item.id === classId)) return;
      state.activeClassId = classId;
      renderClassSelect(); renderStudents(); showView('studentsView');
      openedLinkedStudent = id;
      openStudentDialog(id);
    }

    function renderClassSelect() {
      els.activeClassSelect.innerHTML = state.classes.map((item) => (
        `<option value="${escapeHtml(item.id)}" ${item.id === state.activeClassId ? "selected" : ""}>${escapeHtml(classLabel(item))}</option>`
      )).join("");
      const importClass = els.studentImportClass.value;
      els.studentImportClass.innerHTML = els.activeClassSelect.innerHTML;
      els.studentImportClass.value = state.classes.some(item => item.id === importClass) ? importClass : state.activeClassId;
      if (pendingStudentImport && !state.classes.some(item => item.id === pendingStudentImport.classId)) clearStudentRosterImport();
    }

    function renderSettings() {
      const current = activeClass();
      if (!pendingFormSaves.has("settings")) {
        els.teacherName.value = current?.teacherName || state.teacher?.name || "";
        els.schoolName.value = state.teacher?.schoolName || "";
        els.classYear.value = current?.year || "2025-2026";
        els.className.value = current?.name || "";
      }
      renderTeacherPhoto();
      renderSchoolLogo();
      renderClassManager();
    }

    function classLabel(item) {
      return [item?.name || "Sınıfım", item?.year || ""].filter(Boolean).join(" · ");
    }

    function renderClassManager() {
      if (!els.classListPanel) return;
      els.classListPanel.innerHTML = state.classes.map((item) => {
        const studentCount = state.students.filter((student) => student.classId === item.id).length;
        const examCount = state.exams.filter((exam) => exam.classId === item.id).length;
        const isActive = item.id === state.activeClassId;
        const teacher = item.teacherName || state.teacher?.name || "Öğretmen";
        return `
          <div class="class-manager-row ${isActive ? "active" : ""}">
            <div>
              <strong>${escapeHtml(classLabel(item))}</strong>
              <p>${escapeHtml(teacher)}${state.teacher?.schoolName ? ` · ${escapeHtml(state.teacher.schoolName)}` : ""}</p>
              <div class="class-manager-meta">
                <span class="badge blue">${studentCount} öğrenci</span>
                <span class="badge green">${examCount} sınav</span>
                ${isActive ? `<span class="badge gold">Aktif sınıf</span>` : ""}
              </div>
            </div>
            <div class="class-manager-actions">
              <button class="ghost-btn" data-select-class="${escapeHtml(item.id)}" ${isActive ? "disabled" : ""}>Seç</button>
              <button class="primary-btn" data-edit-class="${escapeHtml(item.id)}">Düzenle</button>
            </div>
          </div>
        `;
      }).join("");
      els.classListPanel.querySelectorAll("[data-select-class]").forEach((button) => {
        button.addEventListener("click", () => selectClassFromPanel(button.dataset.selectClass));
      });
      els.classListPanel.querySelectorAll("[data-edit-class]").forEach((button) => {
        button.addEventListener("click", () => editClassFromPanel(button.dataset.editClass));
      });
    }

    function selectClassFromPanel(classId) {
      if (!state.classes.some((item) => item.id === classId) || classId === state.activeClassId || !finishClassEditing()) return;
      resetManualExam();
      state.activeClassId = classId;
      selectedStudentIds.clear();
      saveState();
      renderAll();
    }

    function editClassFromPanel(classId) {
      showView('dashboardView');
      selectClassFromPanel(classId);
      const settings = els.className?.closest('details');
      if (settings) settings.open = true;
      els.className?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      els.className?.focus();
      els.className?.select();
      toast("Sınıf adını ve yılını panelden düzenleyebilirsiniz.");
    }

    function renderDashboard() {
      const students = activeStudents();
      const exams = activeExams();
      const notes = students.reduce((sum, student) => sum + (student.notes?.length || 0), 0);
      const meetings = students.reduce((sum, student) => sum + (student.meetings?.length || 0), 0);
      const current = activeClass();
      const teacherName = current?.teacherName || state.teacher?.name || "Öğretmenim";
      els.heroGreeting.textContent = `${teacherName} için ajanda paneli`;
      els.heroClassBadge.textContent = `${current?.name || "Sınıfım"} · ${current?.year || "Eğitim yılı"}`;
      els.heroSummary.textContent = `${students.length} öğrenci, ${exams.length} sınav/deneme, ${notes} öğretmen notu ve ${meetings} veli görüşmesi bu ajandada izleniyor.`;
      els.heroTeacherPhoto.innerHTML = teacherAvatarHtml();
      els.statsGrid.innerHTML = [
        statTile("Öğrenci", students.length, "tile-mint"),
        statTile("Sınav / Deneme", exams.length, "tile-sky"),
        statTile("Öğretmen Notu", notes, "tile-peach"),
        statTile("Veli Görüşmesi", meetings, "tile-lavender")
      ].join("");
      renderDashboardBriefing(students, exams);

      const recent = exams.slice(0, 5).map((exam) => {
        const count = Object.keys(exam.results || {}).length;
        const avg = totalClassAverage(exam);
        return `<div class="exam-row"><div><h4>${escapeHtml(exam.name)}</h4><p>${formatDate(exam.date)} · ${count} öğrenci · sınıf ort. ${formatPercent(avg)}</p></div><button class="ghost-btn" data-report-exam="${escapeHtml(exam.id)}">Karne</button></div>`;
      }).join("");
      els.recentAcademic.innerHTML = recent || `<div class="empty">Henüz sınav eklenmedi. Excel dosyanızı yükleyince burada sınıf özeti görünecek.</div>`;
      els.recentAcademic.querySelectorAll("[data-report-exam]").forEach((button) => {
        button.addEventListener("click", () => {
          showView("reportsView");
          els.reportExam.value = button.dataset.reportExam;
          updateSubjectPicker();
          buildReport();
        });
      });
    }

    function renderDashboardBriefing(students, exams) {
      const now = new Date();
      const todayKey = dateKey(now);
      const todayEvents = [...calendarEventsForDate(todayKey), ...birthdayEventsForDate(todayKey)].sort(sortCalendarEvents);
      const upcomingEvents = [];
      for (let offset = 1; offset <= 7; offset += 1) {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
        const key = dateKey(date);
        [...calendarEventsForDate(key), ...birthdayEventsForDate(key)].forEach((event) => {
          upcomingEvents.push({ ...event, dashboardDate: date });
        });
      }
      upcomingEvents.sort((a, b) => {
        const dateDiff = calendarEventDateTime(a)?.getTime() - calendarEventDateTime(b)?.getTime();
        return Number.isFinite(dateDiff) ? dateDiff : 0;
      });

      if (els.heroTodayLine) {
        els.heroTodayLine.textContent = now.toLocaleDateString("tr-TR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric"
        });
      }
      if (els.dashboardTodayLabel) {
        els.dashboardTodayLabel.textContent = now.toLocaleDateString("tr-TR", { day: "2-digit", month: "long" });
      }
      if (els.dashboardTodayAgenda) {
        els.dashboardTodayAgenda.innerHTML = todayEvents.length
          ? todayEvents.slice(0, 4).map((event) => dashboardBriefItemHtml(
            calendarEventIcon(event.type),
            event.title,
            [event.time, calendarEventLabel(event.type), event.note].filter(Boolean).join(" · "), event.type || 'note'
          )).join("")
          : dashboardEmptyHtml("Bugün için kayıt görünmüyor. Takvimden not, görüşme veya hatırlatıcı ekleyebilirsiniz.");
      }
      if (els.dashboardUpcoming) {
        els.dashboardUpcoming.innerHTML = upcomingEvents.length
          ? upcomingEvents.slice(0, 4).map((event) => dashboardBriefItemHtml(
            calendarEventIcon(event.type),
            event.title,
            `${dashboardDateLabel(event.dashboardDate)}${event.time ? ` · ${event.time}` : ""}`, event.type || 'note'
          )).join("")
          : dashboardEmptyHtml("Önümüzdeki yedi gün için kayıt yok. Haftanızı planlamak için takvimi kullanabilirsiniz.");
      }

      const latestExam = exams[0] || null;
      const missingResults = latestExam
        ? students.filter((student) => !latestExam.results?.[student.id]).length
        : 0;
      const missingFamilyContact = students.filter((student) => {
        const family = student.family || {};
        return !family.motherPhone && !family.fatherPhone && !family.backupContactPhone;
      }).length;
      const missingBirthDate = students.filter((student) => !student.birthDate).length;
      const dueReminders = activeCalendarEvents().filter(isReminderDue).length;
      const attentionItems = [];
      if (!students.length) {
        attentionItems.push(["👥", "Sınıf listesi bekleniyor", "Excel yükleyebilir veya öğrencileri tek tek ekleyebilirsiniz."]);
      } else {
        if (latestExam && missingResults) attentionItems.push(["📊", `${missingResults} öğrencinin sınav sonucu eksik`, latestExam.name]);
        if (!latestExam) attentionItems.push(["📊", "Henüz sınav eklenmedi", "İlk Excel dosyanızı yükleyerek akademik takibi başlatın."]);
        if (missingFamilyContact) attentionItems.push(["☎️", `${missingFamilyContact} öğrencide veli telefonu yok`, "Öğrenci profillerinden iletişim bilgilerini tamamlayın."]);
        if (missingBirthDate) attentionItems.push(["🎂", `${missingBirthDate} öğrencide doğum tarihi yok`, "Doğum günü hatırlatıcıları için bilgileri tamamlayın."]);
        if (dueReminders) attentionItems.unshift(["🔔", `${dueReminders} hatırlatıcı zamanı geldi`, "Takvim kayıtlarınızı kontrol edin."]);
      }
      if (els.dashboardAttention) {
        els.dashboardAttention.innerHTML = attentionItems.length
          ? attentionItems.slice(0, 4).map((item) => dashboardBriefItemHtml(item[0], item[1], item[2])).join("")
          : dashboardEmptyHtml("Takip gerektiren eksik görünmüyor. Sınıf kayıtlarınız düzenli.");
      }

      const focus = dashboardFocus(todayEvents, upcomingEvents, students, latestExam, missingResults, dueReminders);
      if (els.dashboardFocusTitle) els.dashboardFocusTitle.textContent = focus.title;
      if (els.dashboardFocusText) els.dashboardFocusText.textContent = focus.text;
      renderDashboardReadiness(students, exams);
    }

    function dashboardFocus(todayEvents, upcomingEvents, students, latestExam, missingResults, dueReminders) {
      if (dueReminders) {
        return { title: `${dueReminders} hatırlatıcı bekliyor`, text: "Bugünün takvim kayıtlarını kontrol ederek güne başlayabilirsiniz." };
      }
      if (todayEvents.length) {
        return { title: todayEvents[0].title, text: `Bugün ajandanızda ${todayEvents.length} kayıt bulunuyor.` };
      }
      if (!students.length) {
        return { title: "Sınıfınızı oluşturarak başlayın", text: "Öğrenci listenizi Excel'den yükleyebilir veya tek tek ekleyebilirsiniz." };
      }
      if (latestExam && missingResults) {
        return { title: "Sınav verisini tamamlayın", text: `${latestExam.name} sınavında ${missingResults} öğrencinin sonucu henüz yok.` };
      }
      if (upcomingEvents.length) {
        return { title: `Sıradaki: ${upcomingEvents[0].title}`, text: `${dashboardDateLabel(upcomingEvents[0].dashboardDate)} için planlandı.` };
      }
      return { title: "Sınıf görünümü güncel", text: "Bugün acil takip gerektiren bir kayıt görünmüyor." };
    }

    function renderDashboardReadiness(students, exams) {
      const current = activeClass();
      const familyReady = students.length && students.some((student) => {
        const family = student.family || {};
        return family.motherPhone || family.fatherPhone || family.backupContactPhone;
      });
      const checkpoints = [
        Boolean((current?.teacherName || state.teacher?.name || "").trim()),
        Boolean((state.teacher?.schoolName || "").trim()),
        Boolean(current?.name && current.name !== "Sınıfım"),
        students.length > 0,
        Boolean(familyReady),
        exams.length > 0,
        activeCalendarEvents().length > 0
      ];
      const completed = checkpoints.filter(Boolean).length;
      const percentage = Math.round((completed / checkpoints.length) * 100);
      const missing = [];
      if (!state.teacher?.schoolName) missing.push("okul adı");
      if (!students.length) missing.push("öğrenci listesi");
      if (students.length && !familyReady) missing.push("veli iletişim bilgileri");
      if (!exams.length) missing.push("ilk sınav");
      if (!activeCalendarEvents().length) missing.push("takvim kaydı");
      if (els.dashboardReadinessValue) els.dashboardReadinessValue.textContent = `%${percentage}`;
      if (els.dashboardReadinessBar) els.dashboardReadinessBar.style.width = `${percentage}%`;
      if (els.dashboardReadinessText) {
        els.dashboardReadinessText.textContent = missing.length
          ? `Sıradaki öneri: ${missing.slice(0, 2).join(" ve ")} bilgilerini tamamlayın.`
          : "Temel ajanda bilgileri tamamlandı. Rapor ve takip araçları kullanıma hazır.";
      }
    }

    function dashboardBriefItemHtml(icon, title, detail, noteType) {
      return `
        <div class="dashboard-brief-item ${noteType ? `agenda-sticky event-${calendarNoteType(noteType)}` : ''}">
          <span class="dashboard-brief-icon">${escapeHtml(icon || "•")}</span>
          <span><strong>${escapeHtml(title || "Kayıt")}</strong><small>${escapeHtml(detail || "")}</small></span>
        </div>
      `;
    }

    function dashboardEmptyHtml(message) {
      return `<div class="dashboard-empty">${escapeHtml(message)}</div>`;
    }

    function dashboardDateLabel(date) {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "Tarih yok";
      return date.toLocaleDateString("tr-TR", { weekday: "short", day: "2-digit", month: "short" });
    }

    function renderTeacherPhoto() {
      const html = teacherAvatarHtml();
      els.teacherPhotoPreview.innerHTML = html;
      els.heroTeacherPhoto.innerHTML = html;
    }

    function renderSchoolLogo() {
      els.schoolLogoPreview.innerHTML = state.teacher?.schoolLogo ? `<img src="${escapeHtml(safeImageSource(state.teacher.schoolLogo))}" alt="">` : "Logo";
    }

    function teacherAvatarHtml() {
      if (state.teacher?.photo) return `<img src="${escapeHtml(safeImageSource(state.teacher.photo))}" alt="">`;
      return "KÖ";
    }

    function systemLogoHtml() {
      const source = document.getElementById("agendaBrandLogo")?.src || SYSTEM_LOGO_SRC;
      return `<img data-agenda-brand-logo src="${escapeHtml(source)}" alt="Kemal Öğretmenim logosu">`;
    }

    function statTile(label, value, cls) {
      return `<div class="stat-tile ${cls}"><span>${escapeHtml(label)}</span><b>${escapeHtml(String(value))}</b></div>`;
    }

    function renderStudents() {
      const query = normalize(els.studentSearch.value || "");
      const students = activeStudents().filter((student) => {
        const haystack = normalize(`${student.schoolNo || ""} ${student.firstName || ""} ${student.lastName || ""}`);
        return haystack.includes(query);
      });
      const visibleIds = new Set(students.map((student) => student.id));
      Array.from(selectedStudentIds).forEach((id) => {
        if (!state.students.some((student) => student.id === id && student.classId === state.activeClassId)) selectedStudentIds.delete(id);
      });
      els.studentGrid.innerHTML = students.map(studentCard).join("") || `<div class="empty">Bu sınıfta öğrenci yok. Excel yükleyerek veya elle ekleyerek başlayabilirsiniz.</div>`;
      els.studentGrid.querySelectorAll("[data-open-student]").forEach((button) => {
        button.addEventListener("click", () => openStudentDialog(button.dataset.openStudent));
      });
      els.studentGrid.querySelectorAll("[data-select-student]").forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) selectedStudentIds.add(checkbox.dataset.selectStudent);
          else selectedStudentIds.delete(checkbox.dataset.selectStudent);
          updateStudentBulkControls(visibleIds);
          checkbox.closest(".student-card")?.classList.toggle("selected", checkbox.checked);
        });
      });
      updateStudentBulkControls(visibleIds);
    }

    function studentCard(student) {
      const examCount = activeExams().filter((exam) => exam.results?.[student.id]).length;
      const noteCount = student.notes?.length || 0;
      const selected = selectedStudentIds.has(student.id);
      return `
        <div class="student-card ${selected ? "selected" : ""}">
          <input class="student-select" type="checkbox" data-select-student="${escapeHtml(student.id)}" ${selected ? "checked" : ""} aria-label="${escapeHtml(fullName(student))} seç">
          <button class="student-open" data-open-student="${escapeHtml(student.id)}">
            <div class="avatar">${avatarHtml(student)}</div>
            <div>
              <strong>${escapeHtml(fullName(student))}</strong>
              <p>${student.schoolNo ? `Okul No: ${escapeHtml(String(student.schoolNo))}` : "Okul numarası yok"}</p>
              <div class="badges">
                <span class="badge blue">${examCount} sınav</span>
                <span class="badge green">${noteCount} not</span>
              </div>
            </div>
          </button>
        </div>
      `;
    }

    function updateStudentBulkControls(visibleIds = new Set(activeStudents().map((student) => student.id))) {
      const selectedVisibleCount = Array.from(selectedStudentIds).filter((id) => visibleIds.has(id)).length;
      const selectedCount = selectedStudentIds.size;
      els.selectedStudentCount.textContent = `${selectedCount} öğrenci seçili`;
      els.deleteSelectedStudentsBtn.disabled = selectedCount === 0;
      els.clearStudentSelectionBtn.disabled = selectedCount === 0;
      els.selectAllStudents.checked = visibleIds.size > 0 && selectedVisibleCount === visibleIds.size;
      els.selectAllStudents.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleIds.size;
    }

    function toggleSelectAllStudents() {
      const visibleStudents = activeStudents().filter((student) => {
        const query = normalize(els.studentSearch.value || "");
        const haystack = normalize(`${student.schoolNo || ""} ${student.firstName || ""} ${student.lastName || ""}`);
        return haystack.includes(query);
      });
      visibleStudents.forEach((student) => {
        if (els.selectAllStudents.checked) selectedStudentIds.add(student.id);
        else selectedStudentIds.delete(student.id);
      });
      renderStudents();
    }

    function clearStudentSelection() {
      selectedStudentIds.clear();
      renderStudents();
    }

    function deleteSelectedStudents() {
      const ids = Array.from(selectedStudentIds);
      if (!ids.length) return;
      const names = ids
        .map((id) => state.students.find((student) => student.id === id))
        .filter(Boolean)
        .map(fullName);
      const preview = names.slice(0, 6).join(", ");
      const more = names.length > 6 ? ` ve ${names.length - 6} öğrenci daha` : "";
      if (!confirm(`${names.length} öğrenci silinsin mi? ${preview}${more}. Bu öğrencilerin sınav sonuçları ve kişisel kayıtları da kaldırılır.`)) return;
      deleteStudentsByIds(ids);
      selectedStudentIds.clear();
      renderAll();
      toast(`${names.length} öğrenci silindi.`);
    }

    function deleteStudentsByIds(ids, options = {}) {
      const idSet = new Set(ids);
      const names = new Set(state.students.filter(student => idSet.has(student.id)).map(student => normalize(fullName(student))));
      state.students = state.students.filter((student) => !idSet.has(student.id));
      state.exams.forEach((exam) => {
        ids.forEach((id) => {
          if (exam.results) delete exam.results[id];
        });
        if (Array.isArray(exam.participants)) {
          exam.participants = exam.participants.filter((participant) => !idSet.has(participant.studentId));
        }
        if (exam.importWarnings?.missingStudentIds) {
          exam.importWarnings.missingStudentIds = exam.importWarnings.missingStudentIds.filter((id) => !idSet.has(id));
        }
        if (Array.isArray(exam.importWarnings?.noScoreNames)) exam.importWarnings.noScoreNames = exam.importWarnings.noScoreNames.filter(name => !names.has(normalize(name)));
      });
      for (const log of [state.birthdayReminderLog, state.birthdaySnoozeLog]) {
        for (const key of Object.keys(log || {})) if (ids.some(id => key.slice(5) === `${id}_today` || key.slice(5) === `${id}_before`)) delete log[key];
      }
      if (options.save !== false) saveState();
    }

    function avatarHtml(student) {
      if (student.photo) return `<img src="${escapeHtml(safeImageSource(student.photo))}" alt="" style="${studentPhotoStyle(student)}">`;
      return escapeHtml(initials(student));
    }

    function studentPhotoStyle(student) {
      const fit = ["cover", "contain", "fill", "none", "scale-down"].includes(student.photoFit) ? student.photoFit : "contain";
      const x = clampNumber(student.photoX, 0, 100, 50);
      const y = clampNumber(student.photoY, 0, 100, 50);
      return `object-fit:${fit};object-position:${x}% ${y}%;`;
    }

    function currentPhotoStyle() {
      return studentPhotoStyle({
        photoFit: els.studentPhotoFit.value || "contain",
        photoX: els.studentPhotoX.value || 50,
        photoY: els.studentPhotoY.value || 50
      });
    }

    function clampNumber(value, min, max, fallback) {
      const number = Number(value);
      if (!Number.isFinite(number)) return fallback;
      return Math.max(min, Math.min(max, number));
    }

    function initials(student) {
      const first = (student.firstName || "?").trim()[0] || "?";
      const last = (student.lastName || "").trim()[0] || "";
      return `${first}${last}`.toLocaleUpperCase("tr-TR");
    }

    function openStudentDialog(studentId = null) {
      ["student", "note", "meeting"].forEach(clearFormSave);
      studentEntryIds.notes = studentEntryIds.meetings = null;
      editingStudentId = studentId;
      const student = studentId ? state.students.find((item) => item.id === studentId) : blankStudent();
      if (!student) return;

      els.studentDialogTitle.textContent = studentId ? fullName(student) : "Yeni Öğrenci";
      els.studentNo.value = student.schoolNo || "";
      els.studentBirth.value = student.birthDate || "";
      els.studentFirstName.value = student.firstName || "";
      els.studentLastName.value = student.lastName || "";
      els.studentAddress.value = student.address || "";
      els.motherName.value = student.family?.motherName || "";
      els.motherJob.value = student.family?.motherJob || "";
      els.motherPhone.value = student.family?.motherPhone || "";
      els.fatherName.value = student.family?.fatherName || "";
      els.fatherJob.value = student.family?.fatherJob || "";
      els.fatherPhone.value = student.family?.fatherPhone || "";
      els.motherStatus.value = student.family?.motherStatus || "";
      els.fatherStatus.value = student.family?.fatherStatus || "";
      els.parentsMaritalStatus.value = student.family?.parentsMaritalStatus || "";
      els.custodyInfo.value = student.family?.custodyInfo || "";
      els.backupContactName.value = student.family?.backupContactName || "";
      els.backupContactPhone.value = student.family?.backupContactPhone || "";
      els.backupContactRelation.value = student.family?.backupContactRelation || "";
      els.siblingCount.value = student.family?.siblingCount || "";
      els.schoolTransport.value = student.family?.schoolTransport || "";
      els.homeOwnership.value = student.family?.homeOwnership || "";
      els.householdSize.value = student.family?.householdSize || "";
      els.studyRoomStatus.value = student.family?.studyRoomStatus || "";
      els.studentAchievements.value = student.family?.studentAchievements || "";
      els.specialPrograms.value = student.family?.specialPrograms || "";
      els.healthStatus.value = student.healthStatus || "";
      els.noteDate.value = today();
      els.noteText.value = "";
      els.meetingDate.value = today();
      els.meetingType.value = "Telefon";
      els.meetingText.value = "";
      renderPhoto(student);
      renderStudentNotes(student);
      renderStudentMeetings(student);
      renderStudentAcademic(student);
      activateTab("tabPersonal");
      els.deleteStudentBtn.style.visibility = studentId ? "visible" : "hidden";
      els.studentDialog.showModal();
    }

    function blankStudent() {
      return {
        id: uid("student"),
        classId: state.activeClassId,
        schoolNo: "",
        firstName: "",
        lastName: "",
        birthDate: "",
        address: "",
        photo: "",
        photoFit: "contain",
        photoX: 50,
        photoY: 50,
        family: {},
        healthStatus: "",
        notes: [],
        meetings: []
      };
    }

    function renderPhoto(student) {
      delete els.photoPreview.dataset.photo;
      els.studentPhotoFit.value = student.photoFit || "contain";
      els.studentPhotoX.value = clampNumber(student.photoX, 0, 100, 50);
      els.studentPhotoY.value = clampNumber(student.photoY, 0, 100, 50);
      els.photoPreview.innerHTML = student.photo ? `<img src="${escapeHtml(safeImageSource(student.photo))}" alt="" style="${studentPhotoStyle(student)}">` : "Foto";
      els.studentPhoto.value = "";
    }

    async function handlePhotoUpload(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      studentPhotoProcessing = true;
      els.photoPreview.textContent = "Hazırlanıyor";
      try {
        const dataUrl = await readFileAsDataUrl(file);
        await openPhotoCropper(dataUrl);
      } catch (error) {
        console.error(error);
        toast("Fotoğraf hazırlanamadı. Lütfen farklı bir görsel deneyin.");
        studentPhotoProcessing = false;
        renderPhoto(editingStudentId ? state.students.find((item) => item.id === editingStudentId) || blankStudent() : blankStudent());
      } finally {
        els.studentPhoto.value = "";
      }
    }

    function readFileAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Fotoğraf okunamadı."));
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    }

    function openPhotoCropper(dataUrl) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onerror = () => reject(new Error("Fotoğraf yüklenemedi."));
        image.onload = () => {
          cropState = {
            source: dataUrl,
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
            baseScale: 1,
            zoom: 1,
            x: 0,
            y: 0,
            drag: null
          };
          els.cropImage.src = dataUrl;
          els.cropImage.style.width = `${image.naturalWidth}px`;
          els.cropImage.style.height = `${image.naturalHeight}px`;
          els.cropZoom.value = "1";
          try {
            els.photoCropDialog.showModal();
          } catch (error) {
            els.photoCropDialog.show();
          }
          requestAnimationFrame(() => {
            initializeCropPosition();
            resolve();
          });
        };
        image.src = dataUrl;
      });
    }

    function initializeCropPosition() {
      if (!cropState) return;
      const frame = cropFrameSize();
      cropState.baseScale = Math.max(frame.width / cropState.naturalWidth, frame.height / cropState.naturalHeight);
      cropState.zoom = Number(els.cropZoom.value) || 1;
      centerCropImage();
    }

    function cropFrameSize() {
      const rect = els.cropFrame.getBoundingClientRect();
      return { width: rect.width || 280, height: rect.height || 280 };
    }

    function cropScale() {
      return (cropState?.baseScale || 1) * (cropState?.zoom || 1);
    }

    function centerCropImage() {
      if (!cropState) return;
      const frame = cropFrameSize();
      const scale = cropScale();
      cropState.x = (frame.width - cropState.naturalWidth * scale) / 2;
      cropState.y = (frame.height - cropState.naturalHeight * scale) / 2;
      constrainCropPosition();
      renderCropImage();
    }

    function updateCropZoom() {
      if (!cropState) return;
      const frame = cropFrameSize();
      const oldScale = cropScale();
      const centerX = (frame.width / 2 - cropState.x) / oldScale;
      const centerY = (frame.height / 2 - cropState.y) / oldScale;
      cropState.zoom = Number(els.cropZoom.value) || 1;
      const newScale = cropScale();
      cropState.x = frame.width / 2 - centerX * newScale;
      cropState.y = frame.height / 2 - centerY * newScale;
      constrainCropPosition();
      renderCropImage();
    }

    function startCropDrag(event) {
      if (!cropState) return;
      event.preventDefault();
      els.cropFrame.setPointerCapture?.(event.pointerId);
      cropState.drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: cropState.x,
        originY: cropState.y
      };
      window.addEventListener("pointermove", moveCropDrag);
      window.addEventListener("pointerup", endCropDrag, { once: true });
      window.addEventListener("pointercancel", endCropDrag, { once: true });
    }

    function moveCropDrag(event) {
      if (!cropState?.drag) return;
      cropState.x = cropState.drag.originX + event.clientX - cropState.drag.startX;
      cropState.y = cropState.drag.originY + event.clientY - cropState.drag.startY;
      constrainCropPosition();
      renderCropImage();
    }

    function endCropDrag() {
      if (cropState) cropState.drag = null;
      window.removeEventListener("pointermove", moveCropDrag);
    }

    function constrainCropPosition() {
      if (!cropState) return;
      const frame = cropFrameSize();
      const scale = cropScale();
      const width = cropState.naturalWidth * scale;
      const height = cropState.naturalHeight * scale;
      cropState.x = width <= frame.width ? (frame.width - width) / 2 : Math.min(0, Math.max(frame.width - width, cropState.x));
      cropState.y = height <= frame.height ? (frame.height - height) / 2 : Math.min(0, Math.max(frame.height - height, cropState.y));
    }

    function renderCropImage() {
      if (!cropState) return;
      els.cropImage.style.transform = `translate(${cropState.x}px, ${cropState.y}px) scale(${cropScale()})`;
    }

    function cancelPhotoCrop() {
      cropState = null;
      els.cropImage.removeAttribute("src");
      els.photoCropDialog.close();
      studentPhotoProcessing = false;
      renderPhoto(editingStudentId ? state.students.find((item) => item.id === editingStudentId) || blankStudent() : blankStudent());
    }

    function applyPhotoCrop() {
      if (!cropState) return;
      const frame = cropFrameSize();
      const outputSize = 520;
      const scale = cropScale();
      const sx = Math.max(0, -cropState.x / scale);
      const sy = Math.max(0, -cropState.y / scale);
      const sw = Math.min(cropState.naturalWidth - sx, frame.width / scale);
      const sh = Math.min(cropState.naturalHeight - sy, frame.height / scale);
      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outputSize, outputSize);
      ctx.drawImage(els.cropImage, sx, sy, sw, sh, 0, 0, outputSize, outputSize);
      const dataUrl = canvas.toDataURL("image/jpeg", .84);
      els.photoPreview.innerHTML = `<img src="${escapeHtml(safeImageSource(dataUrl))}" alt="" style="${currentPhotoStyle()}">`;
      els.photoPreview.dataset.photo = dataUrl;
      els.studentPhotoFit.value = "contain";
      els.studentPhotoX.value = 50;
      els.studentPhotoY.value = 50;
      cropState = null;
      els.cropImage.removeAttribute("src");
      els.photoCropDialog.close();
      studentPhotoProcessing = false;
      updatePhotoPreviewSettings();
      queueFormSave("student", saveStudentFromDialog);
    }

    function updatePhotoPreviewSettings() {
      const image = els.photoPreview.querySelector("img");
      if (!image) return;
      image.setAttribute("style", currentPhotoStyle());
    }

    function centerStudentPhoto() {
      els.studentPhotoX.value = 50;
      els.studentPhotoY.value = 50;
      updatePhotoPreviewSettings();
    }

    async function handleTeacherPhotoUpload(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      teacherPhotoProcessing = true;
      els.teacherPhotoPreview.textContent = "Hazırlanıyor";
      try {
        const dataUrl = await compressImageFile(file, { maxSize: 520, quality: .78 });
        state.teacher = state.teacher || {};
        const previousPhoto = state.teacher.photo || "";
        state.teacher.photo = dataUrl;
        if (!saveState()) {
          state.teacher.photo = previousPhoto;
          renderTeacherPhoto();
          return;
        }
        renderTeacherPhoto();
        toast("Öğretmen fotoğrafı kaydedildi.");
      } catch (error) {
        console.error(error);
        toast("Öğretmen fotoğrafı hazırlanamadı.");
        renderTeacherPhoto();
      } finally {
        teacherPhotoProcessing = false;
      }
    }

    async function handleSchoolLogoUpload(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      els.schoolLogoPreview.textContent = "Hazırlanıyor";
      try {
        const dataUrl = await compressImageFile(file, { maxSize: 360, quality: .82 });
        state.teacher = state.teacher || {};
        const previousLogo = state.teacher.schoolLogo || "";
        state.teacher.schoolLogo = dataUrl;
        if (!saveState()) {
          state.teacher.schoolLogo = previousLogo;
          renderSchoolLogo();
          return;
        }
        renderSchoolLogo();
        buildReport();
        toast("Okul logosu rapor antetine eklendi.");
      } catch (error) {
        console.error(error);
        toast("Okul logosu hazırlanamadı.");
        renderSchoolLogo();
      }
    }

    function closeStudentEditor() {
      if (!["student", "note", "meeting"].every(flushFormSave)) {
        if (!localSaveError) toast("Tamamlanmamış alanlar var. Öğrenci için en az ad veya soyad gerekli.");
        return;
      }
      els.studentDialog.close();
    }

    function saveStudentFromDialog() {
      if (studentPhotoProcessing) {
        return false;
      }
      if (!els.studentFirstName.value.trim() && !els.studentLastName.value.trim()) {
        return false;
      }
      const existing = state.students.find(item => item.id === editingStudentId);
      const student = { ...(existing || blankStudent()) };
      student.schoolNo = els.studentNo.value.trim();
      student.firstName = cleanName(els.studentFirstName.value);
      student.lastName = cleanName(els.studentLastName.value).toLocaleUpperCase("tr-TR");
      student.birthDate = els.studentBirth.value;
      student.address = els.studentAddress.value.trim();
      student.photoFit = els.studentPhotoFit.value || "contain";
      student.photoX = clampNumber(els.studentPhotoX.value, 0, 100, 50);
      student.photoY = clampNumber(els.studentPhotoY.value, 0, 100, 50);
      student.family = {
        motherName: els.motherName.value.trim(),
        motherJob: els.motherJob.value.trim(),
        motherPhone: els.motherPhone.value.trim(),
        fatherName: els.fatherName.value.trim(),
        fatherJob: els.fatherJob.value.trim(),
        fatherPhone: els.fatherPhone.value.trim(),
        motherStatus: els.motherStatus.value,
        fatherStatus: els.fatherStatus.value,
        parentsMaritalStatus: els.parentsMaritalStatus.value,
        custodyInfo: els.custodyInfo.value.trim(),
        backupContactName: els.backupContactName.value.trim(),
        backupContactPhone: els.backupContactPhone.value.trim(),
        backupContactRelation: els.backupContactRelation.value.trim(),
        siblingCount: els.siblingCount.value.trim(),
        schoolTransport: els.schoolTransport.value,
        homeOwnership: els.homeOwnership.value,
        householdSize: els.householdSize.value.trim(),
        studyRoomStatus: els.studyRoomStatus.value,
        studentAchievements: els.studentAchievements.value.trim(),
        specialPrograms: els.specialPrograms.value.trim()
      };
      student.healthStatus = els.healthStatus.value.trim();
      if (els.photoPreview.dataset.photo) {
        student.photo = els.photoPreview.dataset.photo;
      }
      if (existing && JSON.stringify(existing) === JSON.stringify(student)) return true;
      const before = state.students;
      state.students = existing ? before.map(item => item === existing ? student : item) : [...before, student];
      if (!saveState()) {
        state.students = before;
        return false;
      }
      editingStudentId = student.id;
      delete els.photoPreview.dataset.photo;
      els.studentDialogTitle.textContent = fullName(student);
      els.deleteStudentBtn.style.visibility = "visible";
      renderStudents();
      renderDashboard();
      renderReportSelectors();
      renderManualExamSelectors();
      return true;
    }

    function deleteStudentFromDialog() {
      if (!editingStudentId) return;
      const student = state.students.find((item) => item.id === editingStudentId);
      if (!student || !confirm(`${fullName(student)} silinsin mi? Bu öğrencinin kişisel bilgileri silinir, sınav geçmişi sınav kayıtlarından da kaldırılır.`)) return;
      ["student", "note", "meeting"].forEach(clearFormSave);
      deleteStudentsByIds([editingStudentId]);
      selectedStudentIds.delete(editingStudentId);
      els.studentDialog.close();
      renderAll();
      toast("Öğrenci silindi.");
    }

    function addNoteToStudent(options = {}) {
      return saveStudentEntry("notes", "note", els.noteText, { date: els.noteDate.value || today() }, options);
    }

    function addMeetingToStudent(options = {}) {
      return saveStudentEntry("meetings", "meeting", els.meetingText, { date: els.meetingDate.value || today(), type: els.meetingType.value }, options);
    }

    function saveStudentEntry(list, key, field, details, options) {
      const text = field.value.trim();
      if (!text) return true;
      if (!editingStudentId && !flushFormSave("student")) return false;
      const student = state.students.find(item => item.id === editingStudentId);
      if (!student) return false;
      const previous = student[list] || [];
      const existing = previous.find(item => item.id === studentEntryIds[list]);
      const entry = { id: existing?.id || uid(key), ...details, text };
      if (!existing || JSON.stringify(existing) !== JSON.stringify(entry)) {
        student[list] = existing ? previous.map(item => item === existing ? entry : item) : [entry, ...previous];
        if (!saveState()) { student[list] = previous; return false; }
      }
      studentEntryIds[list] = options.automatic ? entry.id : null;
      if (!options.automatic) {
        field.value = "";
        clearFormSave(key);
      }
      if (list === "notes") renderStudentNotes(student);
      else renderStudentMeetings(student);
      renderDashboard();
      renderReportSelectors();
      return true;
    }

    function renderStudentNotes(student) {
      const notes = student.notes || [];
      els.noteList.innerHTML = notes.length ? `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Tarih</th><th>Öğretmen Notu</th><th>İşlem</th></tr></thead>
            <tbody>
              ${notes.map((note) => `
                <tr>
                  <td>${formatDate(note.date)}</td>
                  <td>${escapeHtml(note.text)}</td>
                  <td><button class="danger-btn" data-delete-note="${escapeHtml(note.id)}">Sil</button></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : `<div class="empty">Henüz öğretmen notu yok.</div>`;
      els.noteList.querySelectorAll("[data-delete-note]").forEach((button) => {
        button.addEventListener("click", () => deleteNote(student.id, button.dataset.deleteNote));
      });
    }

    function renderStudentMeetings(student) {
      const meetings = student.meetings || [];
      els.meetingList.innerHTML = meetings.length ? `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Tarih</th><th>Tür</th><th>Görüşme Notu</th><th>İşlem</th></tr></thead>
            <tbody>
              ${meetings.map((meeting) => `
                <tr>
                  <td>${formatDate(meeting.date)}</td>
                  <td>${escapeHtml(meeting.type)}</td>
                  <td>${escapeHtml(meeting.text)}</td>
                  <td><button class="danger-btn" data-delete-meeting="${escapeHtml(meeting.id)}">Sil</button></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : `<div class="empty">Henüz veli görüşmesi yok.</div>`;
      els.meetingList.querySelectorAll("[data-delete-meeting]").forEach((button) => {
        button.addEventListener("click", () => deleteMeeting(student.id, button.dataset.deleteMeeting));
      });
    }

    function reportCurrentStudentMeetings() {
      if (!editingStudentId) return;
      els.studentDialog.close();
      showView("reportsView");
      els.reportType.value = "meetings";
      renderReportOptions();
      els.meetingReportStudent.value = editingStudentId;
      renderMeetingPicker();
      buildReport();
    }

    function reportCurrentStudentSummary() {
      if (!editingStudentId) return;
      els.studentDialog.close();
      showView("reportsView");
      els.reportType.value = "studentSummary";
      renderReportOptions();
      els.summaryStudent.value = editingStudentId;
      renderSummaryPickers();
      buildReport();
    }

    function renderStudentAcademic(student) {
      const rows = activeExams()
        .filter((exam) => exam.results?.[student.id])
        .map((exam) => {
          const total = exam.results[student.id].total;
          return `<tr><td>${escapeHtml(exam.name)}</td><td>${formatDate(exam.date)}</td><td>${escapeHtml(total.d)}</td><td>${escapeHtml(total.y)}</td><td>${escapeHtml(total.b)}</td><td>${formatPercent(total.percent)}</td></tr>`;
        }).join("");
      els.studentAcademic.innerHTML = rows
        ? `<div class="table-wrap"><table><thead><tr><th>Sınav</th><th>Tarih</th><th>D</th><th>Y</th><th>B</th><th>Başarı</th></tr></thead><tbody>${rows}</tbody></table></div>`
        : `<div class="empty">Bu öğrenciye ait akademik veri henüz yok.</div>`;
    }

    function activateTab(tabId) {
      document.querySelectorAll(".tab-btn").forEach((button) => button.classList.toggle("active", button.dataset.tab === tabId));
      document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === tabId));
    }

    function saveSettingsAndClass(options = {}) {
      const before = JSON.parse(JSON.stringify(state));
      const teacherName = els.teacherName.value.trim() || "Kemal Öğretmen";
      state.teacher = state.teacher || {};
      state.teacher.name = teacherName;
      state.teacher.schoolName = els.schoolName.value.trim();
      const current = activeClass();
      const oldName = current?.name;
      const planner = readLessonPlannerBackup();
      const plannerClasses = Array.isArray(planner?.siniflar) ? planner.siniflar : [];
      const matches = plannerClasses.filter(item => current?.plannerId ? item.id === current.plannerId : normalize(item.name) === normalize(oldName));
      const uniqueRoster = state.classes.filter(item => normalize(item.name) === normalize(oldName)).length === 1;
      const linkedPlanner = matches.length === 1 && (current?.plannerId || uniqueRoster) ? matches[0] : null;
      if (current) {
        current.name = cleanClassName(els.className.value) || current.name || "Sınıfım";
        current.teacherName = teacherName;
        current.year = els.classYear.value.trim() || current.year || "";
        if (linkedPlanner) current.plannerId = linkedPlanner.id;
      }
      if (JSON.stringify(state) === JSON.stringify(before)) return true;
      if (!saveState()) { state = before; return false; }
      if (linkedPlanner && current.name !== oldName) {
        linkedPlanner.name = current.name;
        restoreLessonPlannerBackup(planner);
      }
      if (!options.automatic) clearFormSave("settings");
      renderClassSelect();
      renderClassManager();
      renderDashboard();
      renderReportSelectors();
      renderManualExamSelectors();
      return true;
    }

    function finishClassEditing() {
      if (!flushFormSave("settings") || !flushFormSave("calendar") || !canDiscardManualExam()) return false;
      if (calendarDraftId) clearCalendarForm();
      return true;
    }

    function addClassFromPanel() {
      if (!finishClassEditing()) return;
      const teacherName = els.teacherName.value.trim() || state.teacher?.name || "Kemal Öğretmen";
      const newClassName = cleanClassName(els.newClassName.value);
      if (!newClassName) {
        toast("Yeni sınıf adını yazın.");
        els.newClassName.focus();
        return;
      }
      const year = els.classYear.value.trim() || "2025-2026";
      const sameClass = state.classes.find((item) => normalize(item.name) === normalize(newClassName) && normalize(item.year || "") === normalize(year));
      if (sameClass && !confirm(`${classLabel(sameClass)} zaten var. Yine de aynı adla yeni sınıf eklensin mi?`)) return;
      const before = JSON.parse(JSON.stringify(state));
      state.teacher = state.teacher || {};
      state.teacher.name = teacherName;
      state.teacher.schoolName = els.schoolName.value.trim();
      const classId = uid("class");
      state.classes.push({
        id: classId,
        name: newClassName,
        year,
        teacherName
      });
      state.activeClassId = classId;
      if (!saveState()) { state = before; return; }
      selectedStudentIds.clear();
      els.newClassName.value = "";
      renderAll();
      toast(`${newClassName} sınıfı eklendi.`);
    }

    function deleteActiveClass() {
      const current = activeClass();
      if (!current || state.classes.length <= 1) {
        toast("En az bir sınıf kalmalı.");
        return;
      }
      if (!confirm(`${current.name} sınıfı ve bu sınıfa ait öğrenciler/sınavlar silinsin mi?`)) return;
      if (!finishClassEditing()) return;
      const before = JSON.parse(JSON.stringify(state));
      deleteStudentsByIds(state.students.filter(student => student.classId === current.id).map(student => student.id), { save: false });
      state.classes = state.classes.filter((item) => item.id !== current.id);
      state.students = state.students.filter((student) => student.classId !== current.id);
      state.exams = state.exams.filter((exam) => exam.classId !== current.id);
      state.scheduleItems = (state.scheduleItems || []).filter((item) => item.classId !== current.id);
      state.calendarEvents = (state.calendarEvents || []).filter((item) => item.classId !== current.id);
      state.activeClassId = state.classes[0].id;
      if (!saveState()) { state = before; return; }
      selectedStudentIds.clear();
      renderAll();
      toast("Sınıf silindi.");
    }

    async function importExamFromExcel(options = {}) {
      const version = ++examImportVersion;
      pendingImport = null;
      const file = els.excelFile.files?.[0];
      const classId = state.activeClassId;
      const selectedExam = state.exams.find((exam) => exam.id === els.updateExamSelect.value);
      const examName = els.examName.value.trim() || selectedExam?.name || "";
      if (!file) {
        toast("Önce Excel dosyasını seçin.");
        return;
      }
      if (!examName) {
        toast("Deneme sınavı adını yazın.");
        return;
      }
      if (!window.XLSX) {
        toast("Excel okuma kütüphanesi yüklenemedi. İnternet bağlantısını kontrol edin.");
        return;
      }

      try {
        const parsed = options.parsed || await parseExcelFile(file, version, {editable:true});
        if (options.parsed && examColumnDraft?.file === file) examColumnDraft.version = version;
        if (version !== examImportVersion || classId !== state.activeClassId) return;
        if (!parsed.students.length) throw new Error("Öğrenci satırı bulunamadı.");

        const existing = selectedExam || state.exams.find((exam) => exam.classId === state.activeClassId && exam.name === examName);
        const maxScore = toNumberOrNull(els.examMaxScore.value);
        if (!isFiniteNumber(maxScore) || maxScore <= 0) throw new Error('Toplam puan sıfırdan büyük bir sayı olmalı.');
        const scoring = scoringOptionsFromInputs(parsed.subjects, els.examSubjectPoints.value, els.examWrongPenalty.checked, maxScore);
        if (els.examSubjectPoints.value.trim() && Object.keys(scoring.subjectPoints).length !== parsed.subjects.length) throw new Error('Ders puanları yazıyorsanız her derse puan girin. Yalnız toplam puanı belirtmek için Toplam puan alanını kullanıp ders puanlarını boş bırakın.');
        if (existing && !confirm("Bu isimde bir sınav zaten var. Tamam derseniz mevcut sınav güncellenir ve yeni Excel verileri aynı sınava işlenir.")) return;

        pendingImport = buildImportPlan(parsed, {
          name: examName,
          date: els.examDate.value || today(),
          sourceFile: file.name,
          scope: els.examScope.value,
          showRankings: els.showRankings.checked,
          scoring,
          classId,
          rosterSignature: studentRosterSignature(classId),
          sheetName: parsed.sheetName,
          formatNote: parsed.formatNote,
          existingExamId: existing?.id || null,
          allowReview: true
        });
        if (options.auto && !existing && pendingImport.rows.every(row=>row.matchId && row.hasScores && !row.errors.length) && !pendingImport.noScoreRows.length) {
          els.allowNewStudents.checked = false;
          commitPendingImport();
          return;
        }
        renderImportReview(pendingImport);
        els.importReviewDialog.showModal();
      } catch (error) {
        if (version !== examImportVersion) return;
        console.error(error);
        els.importSummary.innerHTML = `<div class="empty">Excel okunamadı: ${escapeHtml(error.message || String(error))}</div>`;
      }
    }

    function validImportSubjects(subjects) {
      const values=Object.values(subjects || {});
      return values.length>0 && values.every(item=>item && ['d','y','b'].every(key=>Number.isSafeInteger(item[key])&&item[key]>=0)) && values.some(item=>item.d+item.y+item.b>0);
    }

    function importEditorHtml(plan) {
      const page=plan.reviewPage || 0, pageSize=25;
      const rows=plan.rows.slice(page*pageSize,(page+1)*pageSize);
      const errors=plan.rows.filter(row=>!row.excluded&&row.errors.length).length;
      return `<div class="import-review-toolbar"><strong data-import-review-status>${errors?`${errors} satır düzeltme bekliyor`:'Kontroller tamam · yüklemeye hazır'}</strong><button type="button" class="ghost-btn" data-recheck-import>Düzeltmeleri Kontrol Et</button><span>${page+1} / ${Math.max(1,Math.ceil(plan.rows.length/pageSize))}</span><button type="button" class="ghost-btn" data-import-page="${page-1}" ${page===0?'disabled':''}>‹</button><button type="button" class="ghost-btn" data-import-page="${page+1}" ${(page+1)*pageSize>=plan.rows.length?'disabled':''}>›</button></div>
        <div class="import-edit-grid"><table class="exam-import-results"><thead><tr><th>Al</th><th>Okul no</th><th>Ad</th><th>Soyad</th>${plan.subjects.map(subject=>`<th>${escapeHtml(subject)}<br>D / Y / B</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr class="${row.excluded?'import-row-excluded':row.errors.length?'import-row-error':''}" data-edit-import-row="${row.index}"><td><input type="checkbox" data-import-field="include" aria-label="${escapeHtml(fullName(row.rowStudent))} satırını al" ${row.excluded?'':'checked'}></td>${['schoolNo','firstName','lastName'].map(key=>`<td><input class="identity-input" data-import-field="${key}" aria-label="${escapeHtml(fullName(row.rowStudent)+' '+({schoolNo:'Okul no',firstName:'Ad',lastName:'Soyad'}[key]))}" value="${escapeHtml(row.rowStudent[key] || '')}">${key==='firstName'?`<small class="import-row-status">${escapeHtml(row.errors.join(' · ') || (row.excluded?'Atlandı':row.matchName?`Eşleşti: ${row.matchName}`:'Yeni öğrenci'))}</small>`:''}</td>`).join('')}${plan.subjects.map(subject=>`<td><div class="import-counts">${['d','y','b'].map(key=>`<input data-import-field="${key}" data-import-subject="${escapeHtml(subject)}" inputmode="numeric" aria-label="${escapeHtml(fullName(row.rowStudent)+' '+subject+' '+key.toUpperCase())}" value="${escapeHtml(row.rowStudent.subjects?.[subject]?.[key] ?? '')}">`).join('')}</div></td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }

    function recheckExamImport(page) {
      if (!pendingImport) return;
      const allowNew=els.allowNewStudents.checked;
      const raw=pendingImport.rows.map(row=>JSON.parse(JSON.stringify(row.rowStudent)));
      els.importReviewBody.querySelectorAll('[data-edit-import-row]').forEach(tr=>{
        const row=raw[Number(tr.dataset.editImportRow)];if(!row)return;
        row.excluded=!tr.querySelector('[data-import-field="include"]').checked;
        for(const key of ['schoolNo','firstName','lastName']) row[key]=tr.querySelector(`[data-import-field="${key}"]`).value.trim();
        for(const subject of pendingImport.subjects) {
          const inputs=Array.from(tr.querySelectorAll('[data-import-subject]')).filter(input=>input.dataset.importSubject===subject);
          const values=inputs.map(input=>input.value.trim());
          if(values.every(value=>value==='')) delete row.subjects[subject];
          else row.subjects[subject]=Object.fromEntries(inputs.map(input=>[input.dataset.importField,/^\d+$/.test(input.value.trim())?Number(input.value):input.value.trim()]));
        }
        row.hasScores=Object.keys(row.subjects).length>0;
      });
      const next=buildImportPlan({subjects:pendingImport.subjects,students:raw},pendingImport.meta);
      next.reviewPage=Number.isInteger(page)?page:(pendingImport.reviewPage || 0);
      pendingImport=next;
      renderImportReview(next);
      els.allowNewStudents.checked=allowNew;
    }

    function buildImportPlan(parsed, meta) {
      const currentStudents = activeStudents();
      const matchedExistingIds = new Set();
      const participants = [];
      const identities = new Set();
      const rows = parsed.students.map((rowStudent, index) => {
        let match = null;
        const errors = [];
        if (!rowStudent.excluded) {
          try {match = findStudentMatch(rowStudent, currentStudents);} catch(error) {if(!meta.allowReview) throw error;errors.push(error.message);}
          if (rowStudent.hasScores && !validImportSubjects(rowStudent.subjects)) errors.push('D/Y/B alanları sıfır veya pozitif tam sayı olmalı.');
          if (!fullName(rowStudent).trim()) errors.push('Öğrenci adı gerekli.');
        }
        const key = match?.id || (rowStudent.schoolNo ? `no:${rosterNumber(rowStudent.schoolNo)}` : `name:${normalize(fullName(rowStudent))}`);
        if (!rowStudent.excluded && identities.has(key)) {const message=`${fullName(rowStudent)} için birden fazla satır bulundu. Tekrar eden satırı atlayın.`;if(!meta.allowReview)throw new Error(message);errors.push(message);}
        if (!rowStudent.excluded) identities.add(key);
        if (match && !rowStudent.excluded) matchedExistingIds.add(match.id);
        if (rowStudent.hasScores && !rowStudent.excluded && !errors.length) {
          participants.push(makeParticipantFromRow(rowStudent, index, match?.id || null, meta.scoring));
        }
        return {
          index,
          errors,
          excluded: !!rowStudent.excluded,
          rowStudent,
          matchId: match?.id || null,
          matchName: match ? fullName(match) : "",
          matchType: match ? (rowStudent.schoolNo && String(match.schoolNo || "") === String(rowStudent.schoolNo) ? "Okul no" : "Ad soyad") : "Yeni",
          hasScores: rowStudent.hasScores
        };
      });
      const newRows = rows.filter((row) => !row.excluded && !row.matchId);
      const matchedRows = rows.filter((row) => !row.excluded && row.matchId);
      const noScoreRows = rows.filter((row) => !row.excluded && !row.hasScores);
      const missingStudents = currentStudents.filter((student) => !matchedExistingIds.has(student.id));
      return {
        meta,
        subjects: parsed.subjects,
        participants,
        rows,
        matchedRows,
        newRows,
        noScoreRows,
        missingStudents
      };
    }

    function findStudentMatch(rowStudent, students) {
      if (rowStudent.schoolNo) {
        const matches = students.filter(student => rosterNumber(student.schoolNo) === rosterNumber(rowStudent.schoolNo));
        if (matches.length > 1) throw new Error(`${rowStudent.schoolNo} okul numarası sınıfta birden fazla öğrencide var. Önce öğrenci listesini düzeltin.`);
        const byNo = matches[0];
        if (byNo) {
          if (normalize(fullName(byNo)) !== normalize(fullName(rowStudent))) throw new Error(`${rowStudent.schoolNo} okul numarası ${fullName(byNo)} adına kayıtlı; dosyada ${fullName(rowStudent)} yazıyor. Eşleşmeyi düzeltin.`);
          return byNo;
        }
      }
      const keyName = normalize(`${rowStudent.firstName} ${rowStudent.lastName}`);
      const matches = students.filter(student => normalize(fullName(student)) === keyName);
      if (matches.length > 1) throw new Error(`${fullName(rowStudent)} adı birden fazla öğrencide var. Dosyaya okul numarası ekleyin.`);
      if (matches[0]?.schoolNo && rowStudent.schoolNo && rosterNumber(matches[0].schoolNo) !== rosterNumber(rowStudent.schoolNo)) throw new Error(`${fullName(rowStudent)} için okul numarası farklı. Öğrenci listesini veya dosyayı düzeltin.`);
      return matches[0] || null;
    }

    function renderImportReview(plan) {
      const scored = plan.rows.filter((row) => row.hasScores).length;
      const reviewList = (items, emptyText, mapper) => (
        items.length
          ? `<ul>${items.slice(0, 30).map((item) => `<li>${mapper(item)}</li>`).join("")}${items.length > 30 ? `<li>... ${items.length - 30} kayıt daha</li>` : ""}</ul>`
          : `<p>${escapeHtml(emptyText)}</p>`
      );
      els.importReviewBody.innerHTML = `
        <div class="note-item">
          <strong>${escapeHtml(plan.meta.name)}</strong>
          <p>${formatDate(plan.meta.date)} · ${escapeHtml(plan.meta.sourceFile)} · ${plan.subjects.map(escapeHtml).join(", ")}${plan.meta.existingExamId ? " · mevcut sınav güncellenecek" : ""}</p>
          <p>${escapeHtml(plan.meta.sheetName || '')} · ${escapeHtml(plan.meta.formatNote || 'D/Y/B sütunları okundu.')} Sınıf: ${escapeHtml(classLabel(activeClass()))}</p>
          <p>Yayınevinin puanı ve sıralaması aktarılmaz. Puan ve sıralama burada seçtiğiniz puanlama ve katılımcılara göre hesaplanır.</p>
          <div class="badges">
            <span class="badge green">${plan.matchedRows.length} eşleşen</span>
            <span class="badge blue">${plan.newRows.length} yeni</span>
            <span class="badge red">${plan.missingStudents.length} Excel'de yok</span>
            <span class="badge gold">${scored} sonuçlu kayıt</span>
            <span class="badge blue">${scopeLabel(plan.meta.scope)} kıyas havuzu: ${plan.participants.length}</span>
            ${plan.meta.scoring?.wrongPenalty ? `<span class="badge red">3 yanlış 1 doğru</span>` : ""}
            ${plan.meta.scoring?.pointTotal ? `<span class="badge gold">Puanlı: ${formatNumber(plan.meta.scoring.pointTotal)} puan</span>` : `<span class="badge gold">${formatNumber(plan.meta.scoring?.maxScore || 100)} puan üzerinden değerlendirme</span>`}
          </div>
        </div>
        ${importEditorHtml(plan)}
        <details><summary>Okunan sonuçlar — D: doğru, Y: yanlış, B: boş</summary>
        <div style="overflow:auto;max-height:360px" tabindex="0" aria-label="Okunan sınav sonuçları">
          <table class="exam-import-results"><thead><tr><th>Okul no</th><th>Öğrenci</th>${plan.subjects.map(subject => `<th>${escapeHtml(subject)}<br>D / Y / B</th>`).join('')}</tr></thead>
          <tbody>${plan.rows.slice(0,200).map(row => `<tr><td data-label="Okul no">${escapeHtml(row.rowStudent.schoolNo || '—')}</td><td data-label="Öğrenci">${escapeHtml(fullName(row.rowStudent))}</td>${plan.subjects.map(subject => { const s = row.rowStudent.subjects[subject]; return `<td data-label="${escapeHtml(subject)} (D/Y/B)">${s ? `${escapeHtml(s.d)} / ${escapeHtml(s.y)} / ${escapeHtml(s.b)}` : 'Sonuç yok'}</td>`; }).join('')}</tr>`).join('')}</tbody></table>
        </div>
        </details>
        <div class="review-grid" style="margin-top:12px">
          <div class="review-box">
            <h4>Eşleşen öğrenciler</h4>
            ${reviewList(plan.matchedRows, "Henüz eşleşen öğrenci yok.", (row) => `${escapeHtml(row.rowStudent.schoolNo || "-")} · ${escapeHtml(row.rowStudent.firstName)} ${escapeHtml(row.rowStudent.lastName)} → ${escapeHtml(row.matchName)} (${escapeHtml(row.matchType)})`)}
          </div>
          <div class="review-box">
            <h4>Yeni öğrenci olarak algılananlar</h4>
            ${reviewList(plan.newRows, "Yeni öğrenci bulunmadı.", (row) => `${escapeHtml(row.rowStudent.schoolNo || "-")} · ${escapeHtml(row.rowStudent.firstName)} ${escapeHtml(row.rowStudent.lastName)}`)}
          </div>
          <div class="review-box">
            <h4>Sınıfta var, Excel'de yok</h4>
            ${reviewList(plan.missingStudents, "Sınıftaki tüm öğrenciler Excel dosyasında görünüyor.", (student) => `${escapeHtml(student.schoolNo || "-")} · ${escapeHtml(fullName(student))}`)}
          </div>
          <div class="review-box">
            <h4>Excel'de var ama sonucu boş</h4>
            ${reviewList(plan.noScoreRows, "Sonucu boş görünen öğrenci yok.", (row) => `${escapeHtml(row.rowStudent.schoolNo || "-")} · ${escapeHtml(row.rowStudent.firstName)} ${escapeHtml(row.rowStudent.lastName)}`)}
          </div>
        </div>
        <p style="margin-bottom:0;color:var(--muted)">Onaydan sonra eşleşen öğrencilerin sınav sonucu kaydedilir. Yeni öğrenci seçeneğini kapatırsanız yeni görünen satırlar sınava eklenmez.</p>
      `;
      els.allowNewStudents.checked = plan.meta.scope === "class";
      els.confirmImportReviewBtn.disabled = plan.rows.some(row=>!row.excluded&&row.errors.length>0) || !plan.rows.some(row=>!row.excluded&&row.hasScores);
      els.importReviewBody.querySelectorAll('[data-import-field]').forEach(input=>input.addEventListener('input',()=>{
        pendingImport.dirty = true; els.confirmImportReviewBtn.disabled = true;
        const status=els.importReviewBody.querySelector('[data-import-review-status]');if(status)status.textContent='Düzenlemeler kontrol bekliyor.';
      }));
      els.importReviewBody.querySelector('[data-recheck-import]')?.addEventListener('click',recheckExamImport);
      els.importReviewBody.querySelectorAll('[data-import-page]').forEach(button=>button.addEventListener('click',()=>recheckExamImport(Number(button.dataset.importPage))));
    }

    function commitPendingImport() {
      if (!pendingImport) return;
      if (pendingImport.dirty || pendingImport.rows.some(row=>!row.excluded&&row.errors?.length)) {toast('Önce düzeltmeleri kontrol edin.');return;}
      if (!pendingImport.rows.some(row=>!row.excluded&&row.hasScores)) {toast('Yüklenecek geçerli sınav sonucu yok.');return;}
      if (pendingImport.meta.classId && pendingImport.meta.classId !== state.activeClassId) { pendingImport = null; els.importReviewDialog.close(); toast('Sınıf değişti. Dosyayı yeniden kontrol edin.'); return; }
      if (pendingImport.meta.rosterSignature && pendingImport.meta.rosterSignature !== studentRosterSignature(state.activeClassId)) { pendingImport = null; els.importReviewDialog.close(); toast('Öğrenci listesi değişti. Dosyayı yeniden kontrol edin.'); return; }
      const before = JSON.parse(JSON.stringify(state));
      const allowNew = els.allowNewStudents.checked;
      const results = {};
      let created = 0;
      let matched = 0;
      let skippedNew = 0;
      let scored = 0;
      const wasUpdate = !!pendingImport.meta.existingExamId;

      pendingImport.rows.forEach((row) => {
        if (row.excluded) return;
        let student = row.matchId ? state.students.find((item) => item.id === row.matchId) : null;
        if (student) {
          matched += 1;
          updateStudentBasicsFromRow(student, row.rowStudent);
        } else if (allowNew) {
          student = createStudentFromRow(row.rowStudent);
          const participant = pendingImport.participants.find((item) => item.rowIndex === row.index);
          if (participant) participant.studentId = student.id;
          created += 1;
        } else {
          skippedNew += 1;
        }
        if (student && row.rowStudent.hasScores) {
          results[student.id] = makeResult(row.rowStudent.subjects, pendingImport.meta.scoring);
          scored += 1;
        }
      });

      const examPayload = {
        id: pendingImport.meta.existingExamId || uid("exam"),
        classId: state.activeClassId,
        name: pendingImport.meta.name,
        date: pendingImport.meta.date,
        sourceFile: pendingImport.meta.sourceFile,
        scope: pendingImport.meta.scope,
        showRankings: pendingImport.meta.showRankings,
        scoring: pendingImport.meta.scoring,
        subjects: pendingImport.subjects,
        results,
        participants: pendingImport.participants,
        importWarnings: {
          missingStudentIds: pendingImport.missingStudents.map((student) => student.id),
          noScoreNames: pendingImport.noScoreRows.map((row) => fullName(row.rowStudent)),
          skippedNew
        },
        importedAt: new Date().toISOString()
      };
      if (pendingImport.meta.existingExamId) mergeExamPayload(examPayload);
      else state.exams.push(examPayload);
      if (!saveState()) { state = before; return; }
      els.importSummary.innerHTML = `<div class="note-item"><strong>${escapeHtml(pendingImport.meta.name)}</strong><p>${matched} eşleşen, ${created} yeni öğrenci, ${skippedNew} atlanan yeni öğrenci, ${scored} sınav sonucu ${pendingImport.meta.existingExamId ? "güncellendi" : "eklendi"}. Excel'de görünmeyen sınıf öğrencisi: ${pendingImport.missingStudents.length}.</p></div>`;
      els.excelFile.value = "";
      els.examName.value = "";
      els.updateExamSelect.value = "";
      pendingImport = null;
      els.importReviewDialog.close();
      renderAll();
      toast(wasUpdate ? "Onaylandı ve sınav güncellendi." : "Onaylandı ve sınav sisteme eklendi.");
    }

    function mergeExamPayload(payload) {
      const exam = state.exams.find((item) => item.id === payload.id);
      if (!exam) {
        state.exams.push(payload);
        return;
      }
      exam.date = payload.date || exam.date;
      exam.scope = payload.scope || exam.scope || "class";
      exam.showRankings = payload.showRankings;
      exam.scoring = normalizeScoringOptions(payload.scoring || exam.scoring);
      exam.sourceFile = Array.from(new Set([...(exam.sourceFile || '').split(' + '), payload.sourceFile].filter(Boolean))).join(' + ');
      exam.subjects = Array.from(new Map([...(exam.subjects || []), ...(payload.subjects || [])].map(subject => [normalize(subject), cleanName(subject).toLocaleUpperCase('tr-TR')])).values());
      exam.results = mergeExamResults(exam.results || {}, payload.results || {}, exam.scoring);
      exam.participants = mergeParticipants(exam.participants || [], payload.participants || [], exam.scoring);
      exam.importWarnings = {
        missingStudentIds: Array.from(new Set([...(exam.importWarnings?.missingStudentIds || []), ...(payload.importWarnings?.missingStudentIds || [])])),
        noScoreNames: Array.from(new Set([...(exam.importWarnings?.noScoreNames || []), ...(payload.importWarnings?.noScoreNames || [])])),
        skippedNew: (exam.importWarnings?.skippedNew || 0) + (payload.importWarnings?.skippedNew || 0)
      };
      exam.updatedAt = new Date().toISOString();
    }

    function mergeExamResults(existing, incoming, scoring = {}) {
      const merged = { ...existing };
      Object.entries(incoming).forEach(([studentId, result]) => {
        if (!merged[studentId]) {
          merged[studentId] = makeResult(result.subjects || {}, scoring);
          return;
        }
        merged[studentId] = makeResult(mergeImportedSubjects(merged[studentId].subjects, result.subjects), scoring);
      });
      Object.entries(merged).forEach(([studentId, result]) => {
        merged[studentId] = makeResult(mergeImportedSubjects({}, result.subjects), scoring);
      });
      return merged;
    }

    function mergeImportedSubjects(existing = {}, incoming = {}) {
      const subjects = new Map();
      for (const [name, score] of [...Object.entries(existing), ...Object.entries(incoming)]) subjects.set(normalize(name), [cleanName(name).toLocaleUpperCase('tr-TR'), score]);
      return Object.fromEntries(subjects.values());
    }

    function mergeParticipants(existing, incoming, scoring = {}) {
      const map = new Map();
      existing.forEach((item) => map.set(participantKey(item), item));
      incoming.forEach((item) => {
        const key = participantKey(item);
        const current = map.get(key);
        if (!current) {
          map.set(key, item);
          return;
        }
        map.set(key, {
          ...current,
          ...item,
          result: makeResult(mergeImportedSubjects(current.result?.subjects, item.result?.subjects), scoring)
        });
      });
      return Array.from(map.values()).map((item) => ({
        ...item,
        result: makeResult(mergeImportedSubjects({}, item.result?.subjects), scoring)
      }));
    }

    function participantKey(item) {
      return item.studentId || `${normalize(item.schoolNo || "")}|${normalize(item.name || `${item.firstName || ""} ${item.lastName || ""}`)}`;
    }

    function createStudentFromRow(rowStudent) {
      const student = blankStudent();
      updateStudentBasicsFromRow(student, rowStudent);
      state.students.push(student);
      return student;
    }

    function updateStudentBasicsFromRow(student, rowStudent) {
      student.classId = state.activeClassId;
      student.schoolNo = rowStudent.schoolNo || student.schoolNo || "";
      student.firstName = rowStudent.firstName || student.firstName || "";
      student.lastName = rowStudent.lastName || student.lastName || "";
      student.family = student.family || {};
      student.notes = student.notes || [];
      student.meetings = student.meetings || [];
    }

    function clearStudentRosterImport(dropWorkbook = false) {
      studentImportVersion += 1;
      pendingStudentImport = null;
      els.studentImportSummary.textContent = '';
      els.studentImportPreview.replaceChildren();
      els.confirmStudentImportBtn.disabled = true;
      if (dropWorkbook) {
        studentRosterWorkbook = null;
        els.studentImportSheet.innerHTML = '<option value="">Önce dosya seçin</option>';
        els.studentImportSheet.disabled = true;
      }
    }

    function extractStudentRoster(rows) {
      const aliases = {
        schoolNo: ['NO', 'OKUL NO', 'OKUL NUMARASI', 'OGRENCI NO', 'OGRENCI NUMARASI', 'NUMARA', 'NUMARASI'],
        firstName: ['AD', 'ADI', 'OGRENCI ADI', 'OGRENCININ ADI', 'ISIM'],
        lastName: ['SOYAD', 'SOYADI', 'OGRENCI SOYADI', 'OGRENCININ SOYADI', 'SOYISIM'],
        fullName: ['AD SOYAD', 'ADI SOYADI', 'ADISOYADI', 'AD VE SOYAD', 'ADI VE SOYADI', 'OGRENCI', 'OGRENCI AD SOYAD', 'OGRENCI ADI SOYADI', 'OGRENCININ ADI SOYADI'],
        className: ['SINIF', 'SINIFI', 'SINIF SUBE', 'SINIFI SUBESI', 'SUBE', 'SUBESI']
      };
      let header = null;
      let start = 0;
      for (let index = 0; index < Math.min(rows.length, 30); index += 1) {
        const columns = {};
        (rows[index] || []).forEach((cell, column) => {
          const label = normalize(cell);
          for (const [key, names] of Object.entries(aliases)) if (names.includes(label)) columns[key] = column;
        });
        if (columns.fullName !== undefined || (columns.firstName !== undefined && columns.lastName !== undefined)) {
          header = columns; start = index + 1; break;
        }
      }
      if (!header) throw new Error('Ad ve Soyad veya Ad Soyad başlıkları bulunamadı. Boş Excel şablonunu kullanabilirsiniz.');
      const students = [];
      for (let index = start; index < rows.length; index += 1) {
        const row = rows[index] || [];
        if (!row.some(cell => cleanCell(cell))) continue;
        const read = key => header[key] === undefined ? '' : cleanName(row[header[key]]);
        let firstName = read('firstName');
        let lastName = read('lastName');
        if (!firstName && header.fullName !== undefined) {
          const parts = read('fullName').split(' ').filter(Boolean);
          firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0] || '';
          lastName = parts.length > 1 ? parts.at(-1) : '';
        }
        const name = normalize(`${firstName} ${lastName}`);
        if (['TOPLAM', 'GENEL TOPLAM', 'AD SOYAD', 'ADI SOYADI'].includes(name)) continue;
        students.push({sourceRow: index + 1, schoolNo: read('schoolNo'), firstName, lastName: lastName.toLocaleUpperCase('tr-TR'), className: read('className')});
      }
      if (!students.length) throw new Error('Dosyada öğrenci satırı bulunamadı.');
      return students;
    }

    function rosterNumber(value) {
      const number = cleanCell(value).replace(/\s+/g, '');
      return /^\d+$/.test(number) ? number.replace(/^0+(?=\d)/, '') : normalize(number);
    }

    function studentRosterSignature(classId) {
      return JSON.stringify(state.students.filter(student => student.classId === classId)
        .map(student => [student.id, student.schoolNo, student.firstName, student.lastName]).sort((a,b) => String(a[0]).localeCompare(String(b[0]))));
    }

    function buildStudentRosterPlan(rows, classId) {
      if (!state.classes.some(item => item.id === classId)) throw new Error('Öğrencilerin ekleneceği sınıfı seçin.');
      const students = state.students.filter(student => student.classId === classId);
      const seenNumbers = new Set();
      const seenNames = new Set();
      const matchedStudents = new Set();
      const namesWithNumber = new Set(rows.filter(row => rosterNumber(row.schoolNo)).map(row => normalize(`${row.firstName} ${row.lastName}`)));
      const entries = rows.map(row => {
        const name = normalize(`${row.firstName} ${row.lastName}`);
        const number = rosterNumber(row.schoolNo);
        const entry = {...row, action: 'add', studentId: null, selected: true, reason: 'Eklenecek'};
        const skip = reason => ({...entry, action: 'skip', selected: false, reason});
        if (!row.firstName || [row.firstName, row.lastName, row.schoolNo].some(value => String(value).length > 150)) return skip('Ad eksik veya alan çok uzun');
        if (!number && namesWithNumber.has(name)) return skip('Aynı öğrencinin okul numaralı satırı kullanılacak');
        if ((number && seenNumbers.has(number)) || (!number && seenNames.has(name))) return skip('Dosyada tekrar eden öğrenci');
        if (number) seenNumbers.add(number);
        seenNames.add(name);
        const byNumber = number ? students.filter(student => rosterNumber(student.schoolNo) === number) : [];
        const byName = students.filter(student => normalize(fullName(student)) === name);
        if (byNumber.length > 1 || (!byNumber.length && byName.length > 1)) return skip('Birden fazla kayıt eşleşiyor; elle kontrol edin');
        if (byNumber.length) {
          if (normalize(fullName(byNumber[0])) !== name) return skip('Okul numarası başka bir öğrenciye ait');
          return skip('Bu sınıfta zaten kayıtlı');
        }
        if (byName.length) {
          const student = byName[0];
          if (number && student.schoolNo && rosterNumber(student.schoolNo) !== number) return skip('Aynı isimde farklı okul numarası; elle kontrol edin');
          if (number && !student.schoolNo) {
            if (matchedStudents.has(student.id)) return skip('Aynı öğrenci dosyada birden fazla kez eşleşiyor');
            matchedStudents.add(student.id);
            return {...entry, action:'complete', studentId:student.id, reason:'Eksik okul numarası tamamlanacak'};
          }
          return skip('Bu sınıfta zaten kayıtlı');
        }
        return entry;
      });
      // Two new pupils with the same name and different numbers are ambiguous,
      // but both can be valid. Repeated numbers are never imported twice.
      return {classId, rows, entries, signature: studentRosterSignature(classId)};
    }

    async function previewStudentRosterImport() {
      const file = els.studentRosterFile.files?.[0];
      const version = ++studentImportVersion;
      pendingStudentImport = null;
      els.confirmStudentImportBtn.disabled = true;
      els.studentImportPreview.replaceChildren();
      if (!file) { els.studentImportSummary.textContent = 'Önce öğrenci listesini seçin.'; return; }
      if (file.size > 8 * 1024 * 1024) { els.studentImportSummary.textContent = 'Dosya en fazla 8 MB olabilir.'; return; }
      if (!window.XLSX) { els.studentImportSummary.textContent = 'Excel okuma aracı yüklenemedi. Sayfayı yenileyin.'; return; }
      const classId = els.studentImportClass.value;
      els.studentImportSummary.textContent = 'Dosya inceleniyor…';
      try {
        if (!studentRosterWorkbook || studentRosterWorkbook.file !== file) {
          const buffer = await file.arrayBuffer();
          if (version !== studentImportVersion) return;
          const workbook = XLSX.read(buffer, {type:'array', cellDates:true, sheetRows:5032, cellFormula:false, cellHTML:false});
          studentRosterWorkbook = {file, workbook};
          els.studentImportSheet.innerHTML = workbook.SheetNames.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
          els.studentImportSheet.disabled = workbook.SheetNames.length < 2;
        }
        const workbook = studentRosterWorkbook.workbook;
        const sheet = workbook.Sheets[els.studentImportSheet.value];
        if (!sheet) throw new Error('Çalışma sayfası bulunamadı.');
        const range = sheet['!fullref'] || sheet['!ref'];
        if (range && XLSX.utils.decode_range(range).e.r >= 5031) throw new Error('Tek seferde en fazla 5.000 öğrenci aktarılabilir. Dosyayı bölerek yükleyin.');
        const rows = XLSX.utils.sheet_to_json(sheet, {header:1, defval:'', raw:false});
        const students = extractStudentRoster(rows);
        if (students.length > 5000) throw new Error('Tek seferde en fazla 5.000 öğrenci aktarılabilir.');
        pendingStudentImport = buildStudentRosterPlan(students, classId);
        renderStudentRosterPreview();
      } catch (error) {
        if (version === studentImportVersion) els.studentImportSummary.textContent = error.message || 'Öğrenci listesi okunamadı.';
      }
    }

    function renderStudentRosterPreview() {
      const plan = pendingStudentImport;
      if (!plan) return;
      const classInfo = state.classes.find(item => item.id === plan.classId);
      const eligible = plan.entries.filter(entry => entry.action !== 'skip');
      const refreshSelection = () => {
        const count = plan.entries.filter(entry => entry.selected && entry.action !== 'skip').length;
        els.studentImportSummary.textContent = `${classLabel(classInfo)} · ${count} seçili · ${eligible.length} eklenebilir / tamamlanabilir · ${plan.entries.length - eligible.length} atlanacak`;
        els.confirmStudentImportBtn.disabled = count === 0;
      };
      els.studentImportPreview.innerHTML = `<table><thead><tr><th>Seç</th><th>Satır</th><th>Okul No</th><th>Ad Soyad</th><th>Dosyadaki sınıf</th><th>Durum</th></tr></thead><tbody>${plan.entries.map((entry,index) => `<tr>
        <td><input type="checkbox" data-roster-row="${index}" aria-label="${escapeHtml(`${entry.firstName} ${entry.lastName}`)} seç" ${entry.selected ? 'checked' : ''} ${entry.action === 'skip' ? 'disabled' : ''}></td>
        <td>${entry.sourceRow}</td><td>${escapeHtml(entry.schoolNo || '-')}</td><td>${escapeHtml(`${entry.firstName} ${entry.lastName}`)}</td><td>${escapeHtml(entry.className || '-')}</td><td>${escapeHtml(entry.reason)}</td></tr>`).join('')}</tbody></table>`;
      els.studentImportPreview.querySelectorAll('[data-roster-row]').forEach(input => input.addEventListener('change', () => {
        plan.entries[Number(input.dataset.rosterRow)].selected = input.checked;
        refreshSelection();
      }));
      refreshSelection();
    }

    function commitStudentRosterImport() {
      const plan = pendingStudentImport;
      if (!plan || !state.classes.some(item => item.id === plan.classId)) return;
      if (plan.signature !== studentRosterSignature(plan.classId)) {
        pendingStudentImport = buildStudentRosterPlan(plan.rows, plan.classId);
        renderStudentRosterPreview();
        toast('Sınıf listesi değişti. Önizlemeyi yeniden kontrol edip onaylayın.');
        return;
      }
      const selected = plan.entries.filter(entry => entry.selected && entry.action !== 'skip');
      if (!selected.length) return;
      if (state.activeClassId !== plan.classId && !canDiscardManualExam()) return;
      const previous = state.students;
      const previousClass = state.activeClassId;
      const next = previous.slice();
      let added = 0, completed = 0;
      selected.forEach(entry => {
        if (entry.action === 'complete') {
          const index = next.findIndex(student => student.id === entry.studentId && student.classId === plan.classId);
          next[index] = {...next[index], schoolNo:entry.schoolNo};
          completed += 1;
        } else {
          next.push({...blankStudent(), classId:plan.classId, firstName:entry.firstName, lastName:entry.lastName, schoolNo:entry.schoolNo});
          added += 1;
        }
      });
      state.students = next;
      state.activeClassId = plan.classId;
      if (!saveState()) { state.students = previous; state.activeClassId = previousClass; return; }
      if (previousClass !== plan.classId) resetManualExam();
      selectedStudentIds.clear();
      clearStudentRosterImport();
      renderAll();
      els.studentImportSummary.textContent = `${added} öğrenci eklendi, ${completed} öğrencinin okul numarası tamamlandı.`;
      toast('Öğrenci listesi kaydedildi.');
    }

    function downloadStudentRosterTemplate() {
      if (!window.XLSX) { toast('Excel aracı yüklenemedi.'); return; }
      downloadRosterWorkbook([['Okul No', 'Ad', 'Soyad']], 'ogrenci-listesi-sablonu.xlsx');
    }

    function exportStudentRoster() {
      if (!window.XLSX || !activeStudents().length) { toast('Bu sınıfta dışa aktarılacak öğrenci yok veya Excel aracı yüklenemedi.'); return; }
      const rows = [['Okul No', 'Ad', 'Soyad', 'Sınıf'], ...activeStudents().map(student => [student.schoolNo || '', student.firstName || '', student.lastName || '', classLabel(activeClass())])];
      downloadRosterWorkbook(rows, `ogrenci-listesi-${safeFileName(classLabel(activeClass()))}.xlsx`);
    }

    function downloadRosterWorkbook(rows, fileName) {
      const workbook = XLSX.utils.book_new();
      const sheet = XLSX.utils.aoa_to_sheet(rows);
      sheet['!cols'] = [{wch:12}, {wch:24}, {wch:24}, {wch:24}];
      XLSX.utils.book_append_sheet(workbook, sheet, 'Öğrenciler');
      downloadBlob(new Blob([XLSX.write(workbook, {bookType:'xlsx',type:'array'})], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), fileName);
    }

    function resetExamImport() {
      examImportVersion += 1;
      pendingImport = null;
      examColumnDraft = null;
      if (els.examColumnMapping) els.examColumnMapping.hidden = true;
      els.examImportSheet.innerHTML = '<option value="">Otomatik bul</option>';
      els.examImportSheet.disabled = true;
      els.importSummary.textContent = '';
    }

    async function openExamColumnMapping() {
      const file = els.excelFile.files?.[0];
      if (!file || !window.XLSX) { toast('Önce Excel dosyasını seçin.'); return; }
      const version = ++examImportVersion;
      pendingImport = null;
      try {
        if (file.size > 10 * 1024 * 1024) throw new Error('Dosya 10 MB sınırını aşıyor.');
        const buffer = await file.arrayBuffer();
        if (version !== examImportVersion) return;
        const workbook = XLSX.read(buffer, {type:'array',cellDates:true,sheetRows:5032,cellFormula:false,cellHTML:false});
        const chosen = els.examImportSheet.value;
        els.examImportSheet.innerHTML = '<option value="">Sayfa seçin</option>' + workbook.SheetNames.map(name=>`<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
        els.examImportSheet.disabled = workbook.SheetNames.length <= 1;
        const sheetName = workbook.SheetNames.includes(chosen) ? chosen : workbook.SheetNames.length === 1 ? workbook.SheetNames[0] : '';
        els.examImportSheet.value = sheetName;
        if (!sheetName) throw new Error('Birden fazla sayfa var. Önce Excel sayfasını seçin.');
        const sheet = workbook.Sheets[sheetName];
        const range = sheet['!ref'] && XLSX.utils.decode_range(sheet['!ref']);
        if (!range || range.e.r >= 5031 || range.e.c >= 256) throw new Error('Dosya boş veya 5.000 öğrenci / 256 sütun sınırını aşıyor.');
        const rows = XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',range:0});
        applyMergedCells(rows,sheet['!merges'] || []);
        examColumnDraft = {file,rows,sheetName,columnCount:range.e.c + 1,version};
        els.mappingHeaderRow.value = '1';
        els.mappingSubjects.innerHTML = '';
        els.examColumnMapping.hidden = false;
        renderExamMappingColumns();
        addExamMappingSubject();
      } catch (error) { els.importSummary.textContent = error.message; }
    }

    function examColumnOptions(selected = '') {
      if (!examColumnDraft) return '';
      const headerIndex = Math.max(0,Math.min(29,Number(els.mappingHeaderRow.value || 1)-1));
      const header = examColumnDraft.rows[headerIndex] || [];
      return '<option value="">Seçin</option>' + Array.from({length:examColumnDraft.columnCount},(_,index)=>
        `<option value="${index}" ${String(selected) === String(index) ? 'selected' : ''}>${XLSX.utils.encode_col(index)} · ${escapeHtml(String(header[index] || 'Başlıksız').slice(0,100))}</option>`).join('');
    }

    function renderExamMappingColumns() {
      if (!examColumnDraft) return;
      els.mappingHeaderRow.value = String(Math.max(1,Math.min(30,Math.trunc(Number(els.mappingHeaderRow.value)||1))));
      [els.mappingName,els.mappingSchoolNo,els.mappingSurname,...els.mappingSubjects.querySelectorAll('select')].forEach(select=>{
        const value = select.value;
        select.innerHTML = examColumnOptions(value);
      });
      const start = Number(els.mappingHeaderRow.value)-1;
      els.mappingSample.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Satır</th>${Array.from({length:examColumnDraft.columnCount},(_,c)=>`<th>${XLSX.utils.encode_col(c)}</th>`).join('')}</tr></thead><tbody>${examColumnDraft.rows.slice(start,start+6).map((row,index)=>`<tr><th>${start+index+1}</th>${Array.from({length:examColumnDraft.columnCount},(_,c)=>`<td>${escapeHtml(String(row[c] ?? '').slice(0,200))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }

    function addExamMappingSubject() {
      if (!examColumnDraft || els.mappingSubjects.children.length >= 20) return;
      const row = document.createElement('div');
      row.className = 'mapping-subject-row';
      row.innerHTML = `<label>Ders<input data-mapping-subject placeholder="Ders adı" maxlength="80"></label>${['d','y','b'].map((key,index)=>`<label>${['Doğru','Yanlış','Boş'][index]}<select data-mapping-kind="${key}">${examColumnOptions()}</select></label>`).join('')}<button type="button" class="danger-btn" aria-label="Ders eşleştirmesini kaldır" title="Dersi kaldır">×</button>`;
      row.querySelector('button').addEventListener('click',()=>row.remove());
      els.mappingSubjects.appendChild(row);
    }

    function mappedExamData() {
      const draft = examColumnDraft;
      if (!draft || draft.file !== els.excelFile.files?.[0] || draft.version !== examImportVersion) throw new Error('Dosya veya sayfa değişti. Sütunları yeniden eşleştirin.');
      if (els.mappingName.value === '') throw new Error('Öğrenci adı sütununu seçin.');
      const identity = {order:null,fullName:els.mappingSurname.value === '' ? Number(els.mappingName.value) : null,firstName:els.mappingSurname.value !== '' ? Number(els.mappingName.value) : null,lastName:els.mappingSurname.value === '' ? null : Number(els.mappingSurname.value),schoolNo:els.mappingSchoolNo.value === '' ? null : Number(els.mappingSchoolNo.value),className:null,schoolName:null,provinceName:null};
      const used = new Set();
      Object.values(identity).filter(value=>value !== null).forEach(value=>{if(used.has(value))throw new Error('Kimlik alanları aynı sütun olamaz.');used.add(value);});
      const groups = Array.from(els.mappingSubjects.children).map(row=>{
        const subject = cleanName(row.querySelector('[data-mapping-subject]').value).toLocaleUpperCase('tr-TR');
        if (!subject) throw new Error('Her dersin adını yazın.');
        const group = {subject};
        row.querySelectorAll('select').forEach(select=>{
          if (select.value === '') throw new Error(`${subject}: D/Y/B sütunlarının tümünü seçin.`);
          const column = Number(select.value);
          if (used.has(column)) throw new Error('Bir sütun birden fazla alana atanamaz.');
          used.add(column);group[`${select.dataset.mappingKind}Col`] = column;
        });
        return group;
      });
      if (!groups.length || new Set(groups.map(group=>normalize(group.subject))).size !== groups.length) throw new Error('En az bir ders gerekli; ders adları tekrar edemez.');
      const students = extractExamStudents(draft.rows,{identity,groups,dataStart:Number(els.mappingHeaderRow.value)},{editable:true});
      if (!students.length) throw new Error('Öğrenci satırı bulunamadı. Başlık satırını kontrol edin.');
      return {students,subjects:groups.map(group=>group.subject),sheetName:draft.sheetName,formatNote:'Öğretmenin seçtiği sütun eşleştirmesi uygulandı.'};
    }

    function applyExamColumnMapping() {
      try { const parsed = mappedExamData(); importExamFromExcel({parsed}); }
      catch(error) { toast(error.message); }
    }

    function parseLongExamRows(rows, options = {}) {
      for (let r = 0; r < Math.min(rows.length,30); r++) {
        const labels = (rows[r] || []).map(normalize);
        const subjectCol = labels.findIndex(label=>['DERS','DERS ADI','BRANS','SUBJECT'].includes(label));
        const dCol = labels.findIndex(isD), yCol = labels.findIndex(isY), bCol = labels.findIndex(isB);
        const nameCol = labels.findIndex(label=>['AD SOYAD','ADI SOYADI','OGRENCI','OGRENCI ADI SOYADI','STUDENT'].includes(label));
        if ([subjectCol,dCol,yCol,bCol,nameCol].some(col=>col < 0)) continue;
        const schoolNo = labels.findIndex(label=>['OKUL NO','OGRENCI NO','NUMARA'].includes(label));
        const identity = {fullName:nameCol,schoolNo:schoolNo < 0 ? null : schoolNo};
        const grouped = new Map(), subjects = new Set();
        for (let i=r+1;i<rows.length;i++) {
          const row=rows[i] || [], names=getStudentNamesFromRow(row,identity);
          const subject=cleanName(row[subjectCol]).toLocaleUpperCase('tr-TR');
          if (!names.firstName || !subject || isTotalLabel(subject) || ['ORTALAMA','GENEL ORTALAMA'].includes(normalize(fullName(names)))) continue;
          const number=schoolNo < 0 ? '' : cleanCell(row[schoolNo]);
          const key=JSON.stringify([rosterNumber(number),normalize(fullName(names))]);
          let student=grouped.get(key);
          if(!student) {student={...names,schoolNo:number,subjects:{},hasScores:false,sourceRow:i+1};grouped.set(key,student);}
          if (student.subjects[subject]) throw new Error(`${i+1}. satır: ${fullName(names)} için ${subject} tekrarlanıyor.`);
          const values=[row[dCol],row[yCol],row[bCol]];
          if(values.every(value=>cleanCell(value)==='')) continue;
          const counts=values.map(toNumberOrNull);
          const valid=counts.every(value=>Number.isSafeInteger(value)&&value>=0);
          if(!valid && !options.editable) throw new Error(`${i+1}. satır: D/Y/B pozitif tam sayı veya sıfır olmalı.`);
          student.subjects[subject]=Object.fromEntries(['d','y','b'].map((key,index)=>[key,valid?counts[index]:values[index]]));
          student.hasScores=true;subjects.add(subject);
        }
        return {subjects:Array.from(subjects),students:Array.from(grouped.values())};
      }
      return null;
    }

    function downloadExamTemplate() {
      if (!window.XLSX) { toast('Excel aracı yüklenemedi.'); return; }
      const rows = [['Okul No', 'Ad Soyad', 'Türkçe D', 'Türkçe Y', 'Türkçe B', 'Matematik D', 'Matematik Y', 'Matematik B', 'Hayat Bilgisi D', 'Hayat Bilgisi Y', 'Hayat Bilgisi B']];
      activeStudents().forEach(student => rows.push([student.schoolNo || '', fullName(student)]));
      const workbook = XLSX.utils.book_new();
      const sheet = XLSX.utils.aoa_to_sheet(rows);
      sheet['!cols'] = rows[0].map((_, i) => ({ wch: i === 1 ? 30 : 18 }));
      XLSX.utils.book_append_sheet(workbook, sheet, 'Sınav Sonuçları');
      downloadBlob(new Blob([XLSX.write(workbook, {bookType:'xlsx',type:'array'})], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), 'sinav-sonuclari-sablonu.xlsx');
    }

    async function parseExcelFile(file, version = examImportVersion, options = {}) {
      if (file.size > 10 * 1024 * 1024) throw new Error('Dosya 10 MB sınırını aşıyor. Yalnız sonuç tablosunu içeren bir dosya seçin.');
      const buffer = await file.arrayBuffer();
      if (version !== examImportVersion) throw new Error('Dosya seçimi değişti.');
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, sheetRows: 5032, cellFormula: false, cellHTML: false });
      const chosen = els.examImportSheet?.value || '';
      if (els.examImportSheet) {
        els.examImportSheet.innerHTML = '<option value="">Otomatik bul</option>' + workbook.SheetNames.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
        els.examImportSheet.disabled = workbook.SheetNames.length <= 1;
        els.examImportSheet.value = chosen;
      }
      if (chosen) {
        if (!workbook.SheetNames.includes(chosen)) throw new Error('Seçilen sayfa bu dosyada yok. Dosyayı yeniden seçin.');
        return parseExamSheet(workbook.Sheets[chosen], chosen, options);
      }
      const candidates = [];
      const errors = [];
      for (const name of workbook.SheetNames) {
        try { candidates.push(parseExamSheet(workbook.Sheets[name], name, options)); }
        catch (error) { errors.push(`${name}: ${error.message}`); }
      }
      if (candidates.length > 1) throw new Error('Birden fazla sonuç sayfası bulundu. Excel sayfasını seçip tekrar kontrol edin.');
      if (!candidates.length) throw new Error(errors.slice(0, 3).join(' · '));
      if (els.examImportSheet) els.examImportSheet.value = candidates[0].sheetName;
      return candidates[0];
    }

    function parseExamSheet(sheet, sheetName, options = {}) {
      const range = sheet['!ref'] && XLSX.utils.decode_range(sheet['!ref']);
      if (range && (range.e.r >= 5031 || range.e.c >= 256)) throw new Error('En fazla 5.000 öğrenci ve 256 sütun okunabilir. Dosyayı bölerek yükleyin.');
      // Start at A1 even if the file's used range starts at A2; keep source row numbers.
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', range: 0 });
      applyMergedCells(rows, sheet["!merges"] || []);
      const long = parseLongExamRows(rows, options);
      const structure = long ? null : detectExamStructure(rows);
      const students = long ? long.students : extractExamStudents(rows, structure, options);
      if (!students.length) throw new Error('Öğrenci satırı bulunamadı.');
      const subjects = long ? long.subjects : structure.groups.map(group => group.subject);
      if (new Set(subjects.map(normalize)).size !== subjects.length) throw new Error('Aynı ders birden fazla kez bulundu. Ders başlıklarını kontrol edin.');
      return { subjects, students, sheetName, formatNote: long ? 'Öğrenci / ders satırlarından birleştirildi.' : structure.formatNote || 'D/Y/B sütunları okundu. Yüzde sütunu gerekmez.' };
    }

    function applyMergedCells(rows, merges) {
      merges.forEach((merge) => {
        if (merge.e.r >= 5032 || merge.e.c >= 256) throw new Error('Birleştirilmiş hücre aralığı çok büyük. Yalnız sonuç tablosunu yükleyin.');
        const value = rows[merge.s.r]?.[merge.s.c];
        if (value === undefined || value === "") return;
        for (let r = merge.s.r; r <= merge.e.r; r += 1) {
          rows[r] = rows[r] || [];
          for (let c = merge.s.c; c <= merge.e.c; c += 1) if (rows[r][c] === '' || rows[r][c] === undefined) rows[r][c] = value;
        }
      });
    }

    function detectExamStructure(rows) {
      let subjectRow = -1;
      let subRow = -1;
      let groups = [];
      for (let r = 0; r < rows.length - 1; r += 1) {
        const candidateGroups = detectSubjectGroups(rows[r], rows[r + 1]);
        if (candidateGroups.length) {
          subjectRow = r;
          subRow = r + 1;
          groups = candidateGroups;
          break;
        }
      }
      if (!groups.length) return detectCompactExamStructure(rows) || detectFlatExamStructure(rows);
      const identity = detectIdentityColumns(rows, subjectRow, groups[0].start);
      return { subjectRow, subRow, groups, identity, dataStart: subRow + 1 };
    }

    function detectFlatExamStructure(rows) {
      for (let r = 0; r < rows.length; r += 1) {
        const row = rows[r] || [];
        let identity;
        const found = {};
        row.forEach((cell, c) => {
          const parsed = parseFlatScoreHeader(cell);
          if (!parsed) return;
          found[parsed.subject] = found[parsed.subject] || { subject: parsed.subject };
          found[parsed.subject][`${parsed.metric}Col`] = c;
        });
        const groups = Object.values(found)
          .filter((group) => group.dCol !== undefined && group.yCol !== undefined && group.bCol !== undefined)
          .map((group) => ({ ...group, start: group.dCol }));
        if (groups.length) identity = detectIdentityColumns(rows, r, Math.min(...groups.map(group => group.start)));
        const hasIdentity = identity && (identity.fullName !== null || identity.firstName !== null);
        if (groups.length && hasIdentity) {
          return { subjectRow: r, subRow: r, groups, identity, dataStart: r + 1 };
        }
      }
      throw new Error("Ders başlıkları ve D/Y/B alanları bulunamadı. Ad Soyad ve her ders için Doğru/Yanlış/Boş sütunları ekleyin veya sınav şablonunu kullanın. Okul numarası zorunlu değildir.");
    }

    function parseFlatScoreHeader(value) {
      const raw = cleanCell(value);
      if (!raw) return null;
      const norm = normalize(raw);
      let metric = "";
      if (/\bD\b/.test(norm) || norm.includes("DOGRU")) metric = "d";
      else if (/\bY\b/.test(norm) || norm.includes("YANLIS")) metric = "y";
      else if (/\bB\b/.test(norm) || norm.includes("BOS")) metric = "b";
      else return null;
      let subject = raw
        .replace(/do[ğg]ru|\bD\b/giu, "")
        .replace(/yanl[ıi]ş|yanlis|\bY\b/giu, "")
        .replace(/bo[şs]|bos|\bB\b/giu, "")
        .replace(/[%():_\-/]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!subject) return null;
      if (isIdentityLabel(subject) || isTotalLabel(subject)) return null;
      return { subject: subject.toLocaleUpperCase("tr-TR"), metric };
    }

    function detectSubjectGroups(subjects, subs) {
      const groups = [];
      for (let c = 0; c < Math.max(subjects.length, subs.length) - 2; c += 1) {
        const subject = cleanCell(subjects[c]);
        if (!subject || isTotalLabel(subject)) continue;
        if (isD(subs[c]) && isY(subs[c + 1]) && isB(subs[c + 2])) {
          groups.push({ subject: subject.toLocaleUpperCase('tr-TR'), start: c });
        }
      }
      return groups;
    }

    function detectCompactExamStructure(rows) {
      // A known publisher layout: (question count) subject, then Net / D / Y
      // in one cell. Never guess that an arbitrary three-number cell is D/Y/B.
      const aliases = { TUR: 'TÜRKÇE', TURKCE: 'TÜRKÇE', MAT: 'MATEMATİK', MATEMATIK: 'MATEMATİK', 'HAYAT BILGISI': 'HAYAT BİLGİSİ', FEN: 'FEN BİLİMLERİ', 'FEN BILIMLERI': 'FEN BİLİMLERİ', SOSYAL: 'SOSYAL BİLGİLER', 'SOSYAL BILGILER': 'SOSYAL BİLGİLER', ING: 'İNGİLİZCE', INGILIZCE: 'İNGİLİZCE' };
      for (let r = 0; r < Math.min(rows.length, 30); r++) {
        const groups = [];
        let aggregate = null;
        (rows[r] || []).forEach((cell, c) => {
          const match = cleanName(cell).match(/^\((\d+)\)\s*(.+)$/);
          if (!match) return;
          const count = Number(match[1]);
          const label = normalize(match[2]).replace(/\.$/, '');
          if (['LGS', 'TOPLAM', 'GENEL TOPLAM'].includes(label)) aggregate = { start: c, count };
          else if (aliases[label] && count > 0) groups.push({ subject: aliases[label], start: c, count, compact: true });
        });
        if (!groups.length) continue;
        const identity = detectIdentityColumns(rows, r, Math.min(...groups.map(g => g.start)));
        if (identity.fullName === null) continue;
        if (aggregate && aggregate.count !== groups.reduce((sum, g) => sum + g.count, 0)) throw new Error('Derslerin soru sayısı genel toplamla uyuşmuyor. Eksik ders başlığını kontrol edin.');
        return { groups, identity, dataStart: r + 1, aggregate, formatNote: 'Yayınevi tablosu okundu: net/doğru/yanlış ayrıldı, boş sayıları soru sayısından hesaplandı. LGS toplamı derslere eklenmedi.' };
      }
      return null;
    }

    function detectIdentityColumns(rows, subjectRow, firstScoreCol) {
      const identity = { order: 0, schoolNo: null, firstName: null, lastName: null, fullName: null, className: null, schoolName: null, provinceName: null };
      for (let r = Math.max(0, subjectRow - 4); r <= subjectRow; r += 1) {
        for (let c = 0; c < firstScoreCol; c += 1) {
          const label = normalize(rows[r]?.[c] || "");
          const studentNameLabel = !label.includes("OKUL") && !label.includes("SINIF") && !label.includes("SUBE") && label !== "IL" && !label.includes("IL ADI") && !label.includes("SEHIR");
          if (label === "NO" || label.includes("OKUL NO") || label.includes("OKUL NUMARA") || label.includes("OGRENCI NO") || label.includes("NUMARA")) identity.schoolNo = c;
          if (label === "OKUL" || label.includes("OKUL AD")) identity.schoolName = c;
          if (label === "SINIF" || label.includes("SINIF") || label === "SUBE" || label.includes("SUBE") || label === 'GRP') identity.className = c;
          if (label === "IL" || label === "SEHIR" || label.includes("IL ADI") || label.includes("SEHIR AD")) identity.provinceName = c;
          if (studentNameLabel && ((label.includes("AD") && label.includes("SOYAD")) || (label.includes("OGRENCI") && !label.includes("NO") && !label.includes("NUMARA")))) identity.fullName = c;
          if (studentNameLabel && (label === "AD" || label === "ADI" || label.includes("OGRENCI ADI"))) identity.firstName = c;
          if (studentNameLabel && label.includes("SOYAD") && !label.includes('AD SOYAD') && !label.includes('ADI SOYADI') && !label.includes('AD VE SOYAD')) identity.lastName = c;
        }
      }
      if (identity.fullName === null && identity.firstName === null) {
        // The supplied simple sheet has names in the sole unlabelled column.
        if (firstScoreCol === 1) identity.fullName = 0;
      }
      if (identity.fullName === null && identity.firstName === null) throw new Error('Öğrenci adı sütunu bulunamadı. Ad Soyad başlığı ekleyin veya sınav şablonunu kullanın.');
      return identity;
    }

    function extractExamStudents(rows, structure, options = {}) {
      const students = [];
      for (let r = structure.dataStart; r < rows.length; r += 1) {
        const row = rows[r] || [];
        const names = getStudentNamesFromRow(row, structure.identity);
        const firstName = names.firstName;
        const lastName = names.lastName;
        const schoolNo = names.schoolNo || cleanCell(row[structure.identity.schoolNo]);
        const className = cleanName(row[structure.identity.className]);
        const schoolName = cleanName(row[structure.identity.schoolName]);
        const provinceName = cleanName(row[structure.identity.provinceName]);
        if (!firstName && !lastName) continue;
        if (['ORTALAMA', 'GENEL ORTALAMA', 'TOPLAM', 'GENEL TOPLAM', 'AD SOYAD', 'OGRENCI'].includes(normalize(`${firstName} ${lastName}`))) continue;
        if (!/[A-ZÇĞİÖŞÜ]/i.test(`${firstName} ${lastName}`)) throw new Error(`${r + 1}. satırda öğrenci adı okunamadı.`);

        const subjects = {};
        let hasScores = false;
        structure.groups.forEach((group) => {
          const dCol = group.dCol ?? group.start;
          const yCol = group.yCol ?? group.start + 1;
          const bCol = group.bCol ?? group.start + 2;
          const values = group.compact ? readCompactExamScore(row[group.start], group, r + 1) : [row[dCol], row[yCol], row[bCol]];
          const subjectHasScore = values.some(value => cleanCell(value) !== '');
          if (subjectHasScore) {
            const counts = values.map(toNumberOrNull);
            if (counts.some(value => value === null || !Number.isSafeInteger(value) || value < 0)) {
              if(!options.editable) throw new Error(`${r + 1}. satır, ${group.subject}: D/Y/B alanlarının tümü sıfır veya pozitif tam sayı olmalı. Boş ve okunamayan hücreleri kontrol edin.`);
              subjects[group.subject]={d:values[0],y:values[1],b:values[2]};hasScores=true;return;
            }
            const [safeD, safeY, safeB] = counts;
            const total = safeD + safeY + safeB;
            subjects[group.subject] = {
              d: safeD,
              y: safeY,
              b: safeB,
              percent: total ? safeD * 100 / total : null
            };
            hasScores = true;
          }
        });
        if (structure.aggregate && hasScores) {
          const total = readCompactExamScore(row[structure.aggregate.start], structure.aggregate, r + 1);
          const sum = Object.values(subjects).reduce((a, s) => [a[0] + s.d, a[1] + s.y, a[2] + s.b], [0, 0, 0]);
          if (total.length !== 3 || total.some((value, i) => value !== sum[i])) throw new Error(`${r + 1}. satır: Ders sonuçları LGS toplamıyla uyuşmuyor. Kaynak görselle karşılaştırın.`);
        }

        students.push({ schoolNo, firstName, lastName, className, schoolName, provinceName, subjects, hasScores, sourceRow: r + 1 });
      }
      return students;
    }

    function readCompactExamScore(value, group, sourceRow) {
      const text = cleanName(value);
      if (!text) return [];
      const match = text.match(/^(-?\d+(?:[.,]\d+)?)\s+(\d+)\s+(\d+)$/);
      if (!match) throw new Error(`${sourceRow}. satır, ${group.subject || 'LGS toplamı'}: net/doğru/yanlış okunamadı. Hücreyi kaynak görselle karşılaştırın.`);
      const net = Number(match[1].replace(',', '.')), d = Number(match[2]), y = Number(match[3]);
      const b = group.count - d - y;
      if (b < 0 || (Math.abs(net - d) > .02 && Math.abs(net - (d - y / 3)) > .02 && Math.abs(net - (d - y / 4)) > .02)) throw new Error(`${sourceRow}. satır, ${group.subject || 'LGS toplamı'}: soru sayısı veya net tutarsız. Kaynak görseli kontrol edin.`);
      return [d, y, b];
    }

    function getStudentNamesFromRow(row, identity) {
      if (identity.fullName !== null && identity.fullName !== undefined) {
        let name = cleanName(row[identity.fullName]);
        const combined = name.match(/^(\d+)\s*[-–—]\s*(.+)$/);
        const schoolNo = combined?.[1] || '';
        if (combined) name = combined[2];
        const parts = name.split(" ").filter(Boolean);
        if (parts.length <= 1) return { firstName: parts[0] || "", lastName: "", schoolNo };
        return {
          firstName: parts.slice(0, -1).join(" "),
          lastName: parts.slice(-1).join("").toLocaleUpperCase("tr-TR"), schoolNo
        };
      }
      return {
        firstName: cleanName(row[identity.firstName]),
        lastName: cleanName(row[identity.lastName]).toLocaleUpperCase("tr-TR")
      };
    }

    function upsertStudentFromExcel(rowStudent) {
      const keyName = normalize(`${rowStudent.firstName} ${rowStudent.lastName}`);
      let wasCreated = false;
      let student = state.students.find((item) => (
        item.classId === state.activeClassId &&
        rowStudent.schoolNo &&
        String(item.schoolNo || "") === String(rowStudent.schoolNo)
      ));
      if (!student) {
        student = state.students.find((item) => item.classId === state.activeClassId && normalize(fullName(item)) === keyName);
      }
      if (!student) {
        student = blankStudent();
        state.students.push(student);
        wasCreated = true;
      } else {
        wasCreated = false;
      }
      student.schoolNo = rowStudent.schoolNo || student.schoolNo || "";
      student.firstName = rowStudent.firstName || student.firstName || "";
      student.lastName = rowStudent.lastName || student.lastName || "";
      student.family = student.family || {};
      student.notes = student.notes || [];
      student.meetings = student.meetings || [];
      return { student, wasCreated };
    }

    function scoringOptionsFromInputs(subjects, pointText, wrongPenalty, maxScore = 100) {
      const subjectPoints = parseSubjectPointMap(pointText, subjects);
      return normalizeScoringOptions({
        wrongPenalty: !!wrongPenalty,
        subjectPoints,
        maxScore
      });
    }

    function normalizeScoringOptions(scoring = {}) {
      scoring = scoring || {};
      const subjectPoints = {};
      Object.entries(scoring.subjectPoints || {}).forEach(([subject, point]) => {
        const cleanSubject = cleanName(subject).toLocaleUpperCase("tr-TR");
        const cleanPoint = Number(point);
        if (cleanSubject && Number.isFinite(cleanPoint) && cleanPoint > 0) {
          subjectPoints[cleanSubject] = cleanPoint;
        }
      });
      const pointTotal = Object.values(subjectPoints).reduce((sum, item) => sum + item, 0);
      return {
        wrongPenalty: !!scoring.wrongPenalty,
        subjectPoints,
        pointTotal,
        maxScore: Number.isFinite(Number(scoring.maxScore)) && Number(scoring.maxScore) > 0 ? Number(scoring.maxScore) : 100,
        mode: pointTotal > 0 ? "weighted" : "standard"
      };
    }

    function parseSubjectPointMap(value, subjects = []) {
      const text = cleanCell(value);
      if (!text) return {};
      const subjectMap = new Map(subjects.map((subject) => [normalize(subject), subject]));
      const hasSubjectSyntax = /[=:]|\p{L}/u.test(text);
      const parts = (hasSubjectSyntax
        ? text.split(/[;\n]+/).flatMap((part) => part.split(/,(?=\s*\p{L})/u))
        : text.split(/[,;\n]+/)
      ).map(cleanCell).filter(Boolean);
      const onlyNumbers = parts.map(toNumberOrNull);
      if (parts.length && onlyNumbers.every(isFiniteNumber) && subjects.length) {
        return Object.fromEntries(subjects.slice(0, parts.length).map((subject, index) => [subject, onlyNumbers[index]]));
      }

      const points = {};
      parts.forEach((part) => {
        const explicit = part.match(/^(.+?)(?:=|:)\s*([0-9]+(?:[.,][0-9]+)?)$/);
        const loose = explicit ? null : part.match(/^(.+?)\s+([0-9]+(?:[.,][0-9]+)?)$/);
        const match = explicit || loose;
        if (!match) return;
        const subjectKey = normalize(match[1]);
        const point = toNumberOrNull(match[2]);
        if (!isFiniteNumber(point) || point <= 0) return;
        const subject = subjectMap.get(subjectKey);
        if (!subject && subjects.length) return;
        points[subject || cleanName(match[1]).toLocaleUpperCase("tr-TR")] = point;
      });
      return points;
    }

    function subjectPointText(scoring) {
      const normalized = normalizeScoringOptions(scoring);
      return Object.entries(normalized.subjectPoints)
        .map(([subject, point]) => `${subject}=${formatPointInputNumber(point)}`)
        .join("; ");
    }

    function makeResult(subjects, scoring = {}) {
      const options = normalizeScoringOptions(scoring);
      const result = {
        subjects: {},
        total: { d: 0, y: 0, b: 0, net: 0, questionCount: 0, percent: null, score: null, maxScore: options.pointTotal || options.maxScore }
      };
      let weightedScore = 0;
      Object.entries(subjects || {}).forEach(([name, item]) => {
        const d = Number(item.d) || 0;
        const y = Number(item.y) || 0;
        const b = Number(item.b) || 0;
        const questionCount = d + y + b;
        const rawNet = options.wrongPenalty ? d - (y / 3) : d;
        const net = Math.max(0, rawNet);
        const percent = questionCount ? (net * 100) / questionCount : null;
        const rawPercent = questionCount ? (d * 100) / questionCount : null;
        const subjectPoint = subjectPointFor(options, name);
        const hasPoint = isFiniteNumber(subjectPoint) && subjectPoint > 0;
        const score = hasPoint && questionCount ? Math.max(0, Math.min(subjectPoint, (net / questionCount) * subjectPoint)) : percent;
        result.subjects[name] = {
          ...item,
          d,
          y,
          b,
          net,
          rawPercent,
          percent,
          score,
          maxScore: hasPoint ? subjectPoint : 100
        };
        result.total.d += d;
        result.total.y += y;
        result.total.b += b;
        result.total.net += net;
        result.total.questionCount += questionCount;
        if (hasPoint && isFiniteNumber(score)) weightedScore += score;
      });

      if (options.pointTotal > 0) {
        result.total.score = weightedScore;
        result.total.maxScore = options.pointTotal;
        result.total.percent = options.pointTotal ? (weightedScore * 100) / options.pointTotal : null;
      } else {
        result.total.percent = result.total.questionCount ? (result.total.net * 100) / result.total.questionCount : null;
        result.total.score = isFiniteNumber(result.total.percent) ? result.total.percent * options.maxScore / 100 : null;
        result.total.maxScore = options.maxScore;
      }
      return result;
    }

    function subjectPointFor(scoring, subject) {
      const direct = scoring.subjectPoints?.[subject];
      if (isFiniteNumber(direct)) return direct;
      const target = normalize(subject);
      const found = Object.entries(scoring.subjectPoints || {}).find(([key]) => normalize(key) === target);
      return found ? found[1] : null;
    }

    function makeParticipantFromRow(rowStudent, index, studentId = null, scoring = {}) {
      return {
        id: `p_${index}_${normalize(`${rowStudent.schoolNo || ""} ${rowStudent.firstName} ${rowStudent.lastName}`).replace(/\s+/g, "_")}`,
        rowIndex: index,
        studentId,
        schoolNo: rowStudent.schoolNo || "",
        className: rowStudent.className || "",
        schoolName: rowStudent.schoolName || "",
        provinceName: rowStudent.provinceName || "",
        firstName: rowStudent.firstName || "",
        lastName: rowStudent.lastName || "",
        name: `${rowStudent.firstName || ""} ${rowStudent.lastName || ""}`.replace(/\s+/g, " ").trim(),
        result: makeResult(rowStudent.subjects, scoring)
      };
    }

    function makeParticipantsFromResults(results) {
      return Object.entries(results).map(([studentId, result]) => {
        const student = state.students.find((item) => item.id === studentId) || {};
        const classInfo = state.classes.find((item) => item.id === student.classId) || activeClass();
        return {
          id: studentId,
          studentId,
          schoolNo: student.schoolNo || "",
          className: classInfo?.name || "",
          schoolName: state.teacher?.schoolName || "",
          provinceName: student.provinceName || "",
          firstName: student.firstName || "",
          lastName: student.lastName || "",
          name: fullName(student),
          result
        };
      });
    }

    function scopeLabel(scope) {
      return {
        class: "Sınıf",
        school: "Okul",
        province: "İl",
        turkey: "Türkiye"
      }[scope || "class"] || "Genel";
    }

    function averageScopeLabel(scope) {
      return {
        class: "Tüm Katılımcılar Ort.",
        school: "Okul Geneli Ort.",
        province: "İl Geneli Ort.",
        turkey: "Türkiye Geneli Ort.",
        mixed: "Tüm Sınavlar Ort."
      }[scope || "class"] || "Tüm Katılımcılar Ort.";
    }

    function examScoringSummary(exam) {
      const scoring = normalizeScoringOptions(exam.scoring);
      const parts = [];
      if (scoring.wrongPenalty) parts.push("3Y=1D");
      parts.push(`${formatNumber(scoring.pointTotal || scoring.maxScore)} puanlık`);
      return parts.length ? ` · ${parts.join(" · ")}` : "";
    }

    function resetManualExam() {
      clearFormSave("exam");
      manualDraftDirty = false;
      editingManualExamId = null;
      manualDraft = {};
      manualDraftClassId = null;
      els.manualExamEntry.innerHTML = "";
      els.manualExamName.value = "";
      els.manualExamType.value = "Deneme";
      els.manualExamDate.value = today();
      els.manualSubjects.value = "Türkçe, Matematik, Hayat Bilgisi";
      els.manualSubjectPoints.value = "";
      els.manualMaxScore.value = "500";
      els.manualWrongPenalty.checked = false;
      els.manualShowRankings.checked = true;
      els.manualExamScope.value = "class";
      els.saveManualExamBtn.textContent = "Sınavı Kaydet";
      els.saveManualExamBtn.disabled = false;
      els.manualExamStatus.textContent = "Yeni sınav";
    }

    function canDiscardManualExam() {
      return !manualDraftDirty || flushFormSave("exam") && !manualDraftDirty ||
        confirm('Tamamlanmamış sınav değişiklikleri var. Bu değişiklikler bırakılıp devam edilsin mi?');
    }

    function queueManualExamSave() {
      manualDraftDirty = true;
      queueFormSave("exam", () => saveManualExam({ automatic: true }));
    }

    function renderManualExamSelectors() {
      if (manualDraftClassId && manualDraftClassId !== state.activeClassId) resetManualExam();
      const current = els.manualStudent.value;
      els.manualClass.innerHTML = state.classes.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(classLabel(item))}</option>`).join("");
      els.manualClass.value = state.activeClassId;
      els.manualStudent.innerHTML = `<option value="__all__">Tüm sınıf</option>` + activeStudents().map(student =>
        `<option value="${escapeHtml(student.id)}">${escapeHtml(fullName(student))}</option>`).join("");
      if (activeStudents().some(student => student.id === current)) els.manualStudent.value = current;
    }

    function collectManualExamDraft() {
      if (manualDraftClassId !== state.activeClassId) return;
      els.manualExamEntry.querySelectorAll('[data-manual-student] input[data-kind]').forEach(input => {
        const id = input.closest('[data-manual-student]').dataset.manualStudent;
        manualDraft[id] = manualDraft[id] || {};
        const subject = input.dataset.subject;
        manualDraft[id][subject] = manualDraft[id][subject] || {};
        manualDraft[id][subject][input.dataset.kind] = input.value;
      });
    }

    function manualExamScoring(subjects) {
      const points = parseSubjectPointMap(els.manualSubjectPoints.value, subjects);
      const hasPoints = Object.keys(points).length > 0;
      if (els.manualSubjectPoints.value.trim() && (!hasPoints || subjects.some(subject => !points[subject]))) {
        throw new Error("Ders puanlarını her ders için pozitif sayı olarak girin ya da tümünü boş bırakın.");
      }
      const maxScore = Number(els.manualMaxScore.value || 500);
      if (!hasPoints && (!Number.isFinite(maxScore) || maxScore <= 0)) throw new Error("Toplam puan sıfırdan büyük olmalı.");
      return scoringOptionsFromInputs(subjects, els.manualSubjectPoints.value, els.manualWrongPenalty.checked, maxScore);
    }

    function manualExamResults(subjects, scoring) {
      const results = {};
      activeStudents().forEach(student => {
        const subjectResults = {};
        subjects.forEach(subject => {
          const values = manualDraft[student.id]?.[subject] || {};
          const counts = {};
          for (const kind of ['d', 'y', 'b']) {
            const raw = String(values[kind] ?? '').trim();
            const count = raw === '' ? 0 : Number(raw);
            if (!Number.isSafeInteger(count) || count < 0) throw new Error(`${fullName(student)} / ${subject}: doğru, yanlış ve boş sayıları negatif olmayan tam sayı olmalı.`);
            counts[kind] = count;
          }
          if (counts.d + counts.y + counts.b > 0) subjectResults[subject] = counts;
        });
        if (Object.keys(subjectResults).length) results[student.id] = makeResult(subjectResults, scoring);
      });
      return results;
    }

    function renderManualExamEntry() {
      collectManualExamDraft();
      manualDraftClassId = state.activeClassId;
      const students = activeStudents().filter(student => els.manualStudent.value === '__all__' || student.id === els.manualStudent.value);
      const subjects = parseSubjectList(els.manualSubjects.value);
      if (!students.length || !subjects.length) {
        els.manualExamEntry.innerHTML = `<div class="empty">Önce sınıf, öğrenci ve en az bir ders seçin.</div>`;
        return;
      }
      const subjectHeaders = subjects.map(subject => `<th colspan="5">${escapeHtml(subject)}</th>`).join('');
      const metricHeaders = subjects.map(() => `<th>Doğru</th><th>Yanlış</th><th>Boş</th><th>Net</th><th>%</th>`).join('');
      const rows = students.map(student => `
        <tr data-manual-student="${escapeHtml(student.id)}">
          <th scope="row"><strong>${escapeHtml(fullName(student))}</strong><br><small>${escapeHtml(student.schoolNo || '-')}</small></th>
          ${subjects.map(subject => `
            ${['d', 'y', 'b'].map((kind, index) => `<td><input inputmode="numeric" min="0" step="1" type="number" data-subject="${escapeHtml(subject)}" data-kind="${kind}" value="${escapeHtml(String(manualDraft[student.id]?.[subject]?.[kind] ?? ''))}" aria-label="${escapeHtml(fullName(student))} ${escapeHtml(subject)} ${['doğru', 'yanlış', 'boş'][index]}"></td>`).join('')}
            <td data-net="${escapeHtml(subject)}">-</td><td data-percent="${escapeHtml(subject)}">-</td>`).join('')}
          <td data-total="d">-</td><td data-total="y">-</td><td data-total="b">-</td><td data-total="net">-</td><td data-total="percent">-</td><td data-total="score">-</td><td data-total="rank">-</td>
          <td><button type="button" class="danger-btn" data-clear-result="${escapeHtml(student.id)}">Sonucu kaldır</button></td>
        </tr>`).join('');
      els.manualExamEntry.innerHTML = `<div class="table-wrap manual-results-wrap" tabindex="0" aria-label="Sınav sonuç giriş tablosu"><table class="manual-results-table"><thead>
        <tr><th rowspan="2">Öğrenci</th>${subjectHeaders}<th colspan="7">Toplam</th><th rowspan="2">İşlem</th></tr>
        <tr>${metricHeaders}<th>Doğru</th><th>Yanlış</th><th>Boş</th><th>Net</th><th>%</th><th>Puan</th><th>Sınıf sırası</th></tr>
        </thead><tbody>${rows}</tbody></table></div><div class="manual-results-summary" role="status"></div>`;
      els.manualExamEntry.querySelectorAll('input').forEach(input => input.addEventListener('input', () => {
        queueManualExamSave();
        updateManualExamTotals();
      }));
      els.manualExamEntry.querySelectorAll('[data-clear-result]').forEach(button => button.addEventListener('click', () => {
        if (!confirm('Bu öğrencinin sınav sonucu kaldırılsın mı?')) return;
        button.closest('tr').querySelectorAll('input').forEach(input => { input.value = ''; });
        queueManualExamSave();
        updateManualExamTotals();
      }));
      updateManualExamTotals();
    }

    function updateManualExamTotals() {
      collectManualExamDraft();
      const summary = els.manualExamEntry.querySelector('.manual-results-summary');
      try {
        const subjects = parseSubjectList(els.manualSubjects.value);
        const scoring = manualExamScoring(subjects);
        const results = manualExamResults(subjects, scoring);
        const scores = Object.values(results).map(result => result.total.score);
        els.manualExamEntry.querySelectorAll('[data-manual-student]').forEach(row => {
          const result = results[row.dataset.manualStudent];
          subjects.forEach(subject => {
            row.querySelector(`[data-net="${cssEscape(subject)}"]`).textContent = formatNet(result?.subjects[subject]?.net);
            row.querySelector(`[data-percent="${cssEscape(subject)}"]`).textContent = formatPercent(result?.subjects[subject]?.percent);
          });
          ['d', 'y', 'b', 'net', 'percent', 'score', 'rank'].forEach(kind => {
            const value = result?.total[kind];
            row.querySelector(`[data-total="${kind}"]`).textContent = kind === 'rank'
              ? (result ? `${rankInScores(scores.map(score => ({score})), result.total.score)} / ${scores.length}` : '-')
              : kind === 'score' ? (result ? formatScore(value, result.total.maxScore) : '-')
                : kind === 'percent' ? formatPercent(value) : kind === 'net' ? formatNet(value) : formatNumber(value);
          });
        });
        if (summary) summary.textContent = `${Object.keys(results).length} öğrenci · ${formatNumber(scoring.pointTotal || scoring.maxScore)} puan üzerinden · ${scoring.wrongPenalty ? '3 yanlış 1 doğruyu götürür' : 'Kesinti yok'}`;
        els.saveManualExamBtn.disabled = false;
      } catch (error) {
        if (summary) summary.textContent = error.message;
        els.manualExamEntry.querySelectorAll('[data-net], [data-percent], [data-total]').forEach(cell => { cell.textContent = '-'; });
        els.saveManualExamBtn.disabled = true;
      }
    }

    function editManualExam(examId) {
      const exam = activeExams().find(item => item.id === examId && item.sourceFile === 'Elle giriş');
      if (!exam) return;
      if (!canDiscardManualExam()) return;
      resetManualExam();
      editingManualExamId = exam.id;
      manualDraftClassId = state.activeClassId;
      Object.entries(exam.results || {}).forEach(([studentId, result]) => {
        manualDraft[studentId] = Object.fromEntries(Object.entries(result.subjects || {}).map(([subject, values]) => [subject, {d: values.d, y: values.y, b: values.b}]));
      });
      els.manualExamName.value = exam.name;
      els.manualExamType.value = exam.type || 'Deneme';
      els.manualExamDate.value = exam.date || today();
      els.manualSubjects.value = exam.subjects.join(', ');
      els.manualSubjectPoints.value = subjectPointText(exam.scoring);
      els.manualMaxScore.value = normalizeScoringOptions(exam.scoring).maxScore;
      els.manualWrongPenalty.checked = !!exam.scoring?.wrongPenalty;
      els.manualShowRankings.checked = !!exam.showRankings;
      els.manualExamScope.value = exam.scope || 'class';
      els.manualStudent.value = '__all__';
      els.saveManualExamBtn.textContent = 'Değişiklikleri Kaydet';
      els.manualExamStatus.textContent = `${exam.name} düzenleniyor`;
      renderManualExamEntry();
      els.manualExamName.scrollIntoView({behavior: 'smooth', block: 'center'});
    }

    function saveManualExam(options = {}) {
      const name = els.manualExamName.value.trim();
      const subjects = parseSubjectList(els.manualSubjects.value);
      if (!name) {
        if (!options.automatic) toast("Elle sınav için sınav adını yazın.");
        return false;
      }
      if (!subjects.length) {
        if (!options.automatic) toast("En az bir ders adı yazın.");
        return false;
      }
      if (!els.manualExamEntry.querySelector("[data-manual-student]")) renderManualExamEntry();

      collectManualExamDraft();
      let scoring, results;
      try {
        scoring = manualExamScoring(subjects);
        results = manualExamResults(subjects, scoring);
      } catch (error) { if (!options.automatic) toast(error.message); return false; }
      if (!Object.keys(results).length) { if (!options.automatic) toast('En az bir öğrenci için sonuç girin.'); return false; }

      const missingStudents = activeStudents().filter((student) => !results[student.id]);
      if (!options.automatic && missingStudents.length && manualDraftDirty &&
          !confirm(`${missingStudents.length} öğrencinin sonucu boş. Sınav tamamlanmış olarak kapatılsın mı?`)) return false;

      const existing = activeExams().find(exam => exam.id === editingManualExamId);
      const exam = {
        ...existing,
        id: existing?.id || uid("exam"),
        classId: state.activeClassId,
        name,
        type: els.manualExamType.value.trim() || 'Deneme',
        entryMode: 'manual',
        date: els.manualExamDate.value || today(),
        sourceFile: "Elle giriş",
        scope: els.manualExamScope.value,
        showRankings: els.manualShowRankings.checked,
        scoring,
        subjects,
        results,
        participants: makeParticipantsFromResults(results),
        importWarnings: {
          missingStudentIds: missingStudents.map((student) => student.id),
          noScoreNames: missingStudents.map(fullName),
          skippedNew: 0
        },
        importedAt: existing?.importedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const previousExams = state.exams.slice();
      if (existing) state.exams[state.exams.indexOf(existing)] = exam;
      else state.exams.push(exam);
      if (!saveState()) { state.exams = previousExams; return false; }
      if (options.automatic) {
        editingManualExamId = exam.id;
        manualDraftDirty = false;
        els.manualExamStatus.textContent = `Cihaza kaydedildi · ${Object.keys(results).length} öğrenci`;
        els.saveManualExamBtn.textContent = "Sınavı Bitir";
        renderExams();
        renderDashboard();
        renderReportSelectors();
      } else {
        resetManualExam();
        renderAll();
      }
      return true;
    }

    function parseSubjectList(value) {
      return Array.from(new Set(cleanCell(value)
        .split(/[,;\n]+/)
        .map((item) => cleanName(item).toLocaleUpperCase("tr-TR"))
        .filter(Boolean)));
    }

    function compressImageFile(file, options = {}) {
      const maxSize = options.maxSize || 520;
      const quality = options.quality || .78;
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Fotoğraf okunamadı."));
        reader.onload = () => {
          const image = new Image();
          image.onerror = () => reject(new Error("Fotoğraf yüklenemedi."));
          image.onload = () => {
            const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
            const width = Math.max(1, Math.round(image.naturalWidth * scale));
            const height = Math.max(1, Math.round(image.naturalHeight * scale));
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(image, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", quality));
          };
          image.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    }

    async function compactStoredPhotos() {
      const tasks = [];
      if (state.teacher?.photo && state.teacher.photo.length > 180000) {
        tasks.push(resizeDataUrl(state.teacher.photo).then((photo) => { state.teacher.photo = photo; }));
      }
      if (state.teacher?.schoolLogo && state.teacher.schoolLogo.length > 140000) {
        tasks.push(resizeDataUrl(state.teacher.schoolLogo, { maxSize: 360, quality: .82 }).then((logo) => { state.teacher.schoolLogo = logo; }));
      }
      state.students.forEach((student) => {
        if (student.photo && student.photo.length > 180000) {
          tasks.push(resizeDataUrl(student.photo).then((photo) => { student.photo = photo; }));
        }
      });
      if (!tasks.length) return;
      try {
        await Promise.all(tasks);
        saveState();
        renderAll();
      } catch (error) {
        console.warn("Fotoğraf küçültme tamamlanamadı", error);
      }
    }

    function resizeDataUrl(dataUrl, options = {}) {
      const maxSize = options.maxSize || 520;
      const quality = options.quality || .76;
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onerror = () => reject(new Error("Kayıtlı fotoğraf işlenemedi."));
        image.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
          const width = Math.max(1, Math.round(image.naturalWidth * scale));
          const height = Math.max(1, Math.round(image.naturalHeight * scale));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(image, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        image.src = dataUrl;
      });
    }

    function renderExams() {
      const exams = activeExams();
      els.examList.innerHTML = exams.map((exam) => {
        const resultCount = Object.keys(exam.results || {}).length;
        const missingCount = exam.importWarnings?.missingStudentIds?.length || 0;
        const warningText = missingCount ? ` · ${missingCount} eksik/boş öğrenci uyarısı` : "";
        const scoringText = examScoringSummary(exam);
        return `
          <div class="exam-row">
            <div>
              <h4>${escapeHtml(exam.name)}</h4>
              <p>${formatDate(exam.date)}${exam.type ? ` · ${escapeHtml(exam.type)}` : ''} · ${scopeLabel(exam.scope)} · ${resultCount} öğrenci · kıyas havuzu ${getExamParticipants(exam).length} · ${exam.subjects.map(escapeHtml).join(", ")} · sınıf ort. ${formatPercent(totalClassAverage(exam))}${scoringText}${warningText}</p>
            </div>
            <div class="actions">
              <button class="ghost-btn" data-exam-report="${escapeHtml(exam.id)}">Karne</button>
              ${exam.sourceFile === 'Elle giriş' ? `<button class="ghost-btn" data-exam-edit="${escapeHtml(exam.id)}">Düzenle</button>` : ''}
              <button class="ghost-btn" data-exam-ranking="${escapeHtml(exam.id)}">Sınıf Sıralaması</button>
              <button class="danger-btn" data-exam-delete="${escapeHtml(exam.id)}">Sil</button>
            </div>
          </div>
        `;
      }).join("") || `<div class="empty">Henüz sınav yok. Excel dosyası yüklediğinizde burada listelenecek.</div>`;

      els.examList.querySelectorAll("[data-exam-delete]").forEach((button) => {
        button.addEventListener("click", () => deleteExam(button.dataset.examDelete));
      });
      els.examList.querySelectorAll('[data-exam-edit]').forEach(button => {
        button.addEventListener('click', () => editManualExam(button.dataset.examEdit));
      });
      els.examList.querySelectorAll('[data-exam-ranking]').forEach(button => {
        button.addEventListener('click', () => {
          showView('reportsView');
          els.reportType.value = 'rankingList';
          els.rankingExam.value = button.dataset.examRanking;
          els.rankingScope.value = 'class';
          renderReportOptions();
          renderRankingFilters();
          buildReport();
        });
      });
      els.examList.querySelectorAll("[data-exam-report]").forEach((button) => {
        button.addEventListener("click", () => {
          showView("reportsView");
          els.reportType.value = 'academic';
          els.reportExam.value = button.dataset.examReport;
          renderReportOptions();
          updateSubjectPicker();
          buildReport();
        });
      });
    }

    function renderUpdateExamSelect() {
      const currentValue = els.updateExamSelect.value;
      els.updateExamSelect.innerHTML = `<option value="">Yeni sınav olarak ekle</option>` + activeExams().map((exam) => (
        `<option value="${escapeHtml(exam.id)}">${escapeHtml(exam.name)} · ${formatDate(exam.date)} · ${scopeLabel(exam.scope)}</option>`
      )).join("");
      if (currentValue && state.exams.some((exam) => exam.id === currentValue)) els.updateExamSelect.value = currentValue;
    }

    function handleUpdateExamSelection() {
      const exam = state.exams.find((item) => item.id === els.updateExamSelect.value);
      if (!exam) {
        els.examWrongPenalty.checked = false;
        els.examSubjectPoints.value = "";
        return;
      }
      els.examName.value = exam.name;
      els.examDate.value = exam.date || today();
      els.examScope.value = exam.scope || "class";
      els.showRankings.checked = !!exam.showRankings;
      els.examWrongPenalty.checked = !!exam.scoring?.wrongPenalty;
      els.examSubjectPoints.value = subjectPointText(exam.scoring);
      els.examMaxScore.value = normalizeScoringOptions(exam.scoring).maxScore;
      toast("Seçili sınav yeni Excel verisiyle güncellenecek.");
    }

    function deleteExam(examId) {
      const exam = state.exams.find((item) => item.id === examId);
      if (!exam || !confirm(`${exam.name} sınavı silinsin mi?`)) return;
      const previous = state.exams;
      state.exams = state.exams.filter((item) => item.id !== examId);
      if (!saveState()) { state.exams = previous; return; }
      if (editingManualExamId === examId) resetManualExam();
      renderAll();
      toast("Sınav silindi.");
    }

    function activeScheduleItems() {
      return (state.scheduleItems || []).filter((item) => item.classId === state.activeClassId);
    }

    function saveScheduleItem() {
      const lesson = els.scheduleLesson.value.trim();
      if (!lesson) {
        toast("Ders / etkinlik adını yazın.");
        return;
      }
      state.scheduleItems = state.scheduleItems || [];
      state.scheduleItems.push({
        id: uid("lesson"),
        classId: state.activeClassId,
        day: Number(els.scheduleDay.value),
        period: Number(els.schedulePeriod.value) || 1,
        time: els.scheduleTime.value.trim(),
        lesson,
        group: els.scheduleGroup.value.trim(),
        room: els.scheduleRoom.value.trim(),
        color: els.scheduleColor.value || "sky",
        note: els.scheduleNote.value.trim(),
        createdAt: new Date().toISOString()
      });
      saveState();
      renderSchedule();
      clearScheduleForm(false);
      toast("Ders programa eklendi.");
    }

    function clearScheduleForm(clearLesson = true) {
      els.scheduleDay.value = "1";
      els.schedulePeriod.value = "1";
      els.scheduleTime.value = "";
      if (clearLesson) els.scheduleLesson.value = "";
      els.scheduleGroup.value = "";
      els.scheduleRoom.value = "";
      els.scheduleColor.value = "sky";
      els.scheduleNote.value = "";
    }

    function renderSchedule() {
      if (!els.scheduleBoard) return;
      const days = [
        [1, "Pazartesi"],
        [2, "Salı"],
        [3, "Çarşamba"],
        [4, "Perşembe"],
        [5, "Cuma"],
        [6, "Cumartesi"]
      ];
      const items = activeScheduleItems();
      const periods = Array.from(new Set([1, 2, 3, 4, 5, 6, 7, 8, ...items.map((item) => item.period || 1)])).sort((a, b) => a - b);
      els.scheduleBoard.innerHTML = `
        <table>
          <thead><tr><th>Ders</th>${days.map(([, label]) => `<th>${label}</th>`).join("")}</tr></thead>
          <tbody>
            ${periods.map((period) => `
              <tr>
                <th>${period}. Ders</th>
                ${days.map(([day]) => `<td class="schedule-cell">${scheduleCellHtml(items.filter((item) => item.day === day && item.period === period))}</td>`).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
      els.scheduleBoard.querySelectorAll("[data-delete-schedule]").forEach((button) => {
        button.addEventListener("click", () => deleteScheduleItem(button.dataset.deleteSchedule));
      });
      const todayDay = new Date().getDay();
      const todayItems = items.filter((item) => item.day === todayDay).sort((a, b) => (a.period || 0) - (b.period || 0));
      els.scheduleSummary.innerHTML = todayItems.map((item) => lessonChipHtml(item, false)).join("") || `<div class="empty">Bugün için ders programı kaydı yok.</div>`;
    }

    function renderTopClock() {
      if (!els.topClockTime || !els.topClockDate) return;
      const now = new Date();
      els.topClockTime.textContent = now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
      els.topClockDate.textContent = now.toLocaleDateString("tr-TR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
      });
    }

    function startClock() {
      if (clockTimer) return;
      clockTimer = setInterval(() => { renderTopClock(); checkAutomaticLessonWeek(); }, 30000);
      window.addEventListener('focus', checkAutomaticLessonWeek);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) checkAutomaticLessonWeek(); });
    }

    function calendarMondayKey(date) {
      const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      return dateKey(monday);
    }

    function checkAutomaticLessonWeek() {
      const monday = calendarMondayKey(new Date());
      if (state.lessonPlannerAutomaticWeek === monday) return;
      state.lessonPlannerAutomaticWeek = monday;
      setLessonPlannerFocusDate(today());
    }

    function renderLessonPlannerFocus(info = "") {
      const focusDate = isDateKey(state.lessonPlannerFocusDate) ? state.lessonPlannerFocusDate : today();
      state.lessonPlannerFocusDate = focusDate;
      if (els.lessonPlannerFocusDate) els.lessonPlannerFocusDate.value = focusDate;
      if (els.lessonPlannerFocusInfo) {
        els.lessonPlannerFocusInfo.textContent = info || `${formatDate(focusDate)} haftası`;
      }
    }

    function setLessonPlannerFocusDate(value, options = {}) {
      if (!isDateKey(value)) {
        toast("Ders programı için geçerli bir tarih seçin.");
        renderLessonPlannerFocus();
        return;
      }
      state.lessonPlannerFocusDate = value;
      if (!options.skipSave) saveState();
      renderLessonPlannerFocus();
      syncLessonPlannerFrame();
    }

    function shiftLessonPlannerFocus(dayDelta) {
      const base = parseDateValue(state.lessonPlannerFocusDate) || new Date();
      base.setDate(base.getDate() + dayDelta);
      setLessonPlannerFocusDate(dateKey(base));
    }

    function syncLessonPlannerFrame() {
      if (!els.lessonPlannerFrame?.contentWindow) return;
      const focusDate = isDateKey(state.lessonPlannerFocusDate) ? state.lessonPlannerFocusDate : today();
      const activityPath = document.documentElement.dataset.kemalActivityPath || "";
      const plannerTab = new URLSearchParams(activityPath.split("?")[1] || "").get("plannerTab");
      els.lessonPlannerFrame.contentWindow.postMessage({
        type: "kemal-ajanda-focus-week",
        date: focusDate,
        ...(["tab-program", "tab-plan", "tab-yukle", "tab-tatil"].includes(plannerTab) ? { plannerTab } : {})
      }, window.location.origin === 'null' ? '*' : window.location.origin);
      els.lessonPlannerFrame.contentWindow.postMessage({type:'kemal-ajanda-measure'},window.location.origin === 'null' ? '*' : window.location.origin);
    }

    function handleLessonPlannerMessage(event) {
      if (event.source !== els.lessonPlannerFrame?.contentWindow || event.origin !== window.location.origin) return;
      const data = event.data || {};
      if(data.type==='kemal-lesson-planner-height') {
        if(typeof data.height==='number' && Number.isFinite(data.height) && data.height>=100 && data.height<=20000) els.lessonPlannerFrame.style.height=`${Math.max(420,Math.ceil(data.height))}px`;
        return;
      }
      if (data.type === "kemal-lesson-planner-save-failed" && Array.isArray(data.plannerState?.siniflar)) {
        if (!failedPlannerBackup) toast("Ders planı kaydedilemedi. Ajandadaki uyarıdan JSON yedeğini indirin.");
        failedPlannerBackup = data.plannerState;
        renderCloudSyncStatus();
        return;
      }
      if (data.type === "kemal-lesson-planner-data-changed") {
        failedPlannerBackup = null;
        saveState();
        renderCalendar();
        renderDashboard();
        return;
      }
      if (data.type !== "kemal-lesson-planner-week-changed") return;
      if (isDateKey(data.focusDate)) {
        state.lessonPlannerFocusDate = data.focusDate;
        saveState();
      }
      const parts = [
        data.week ? `${data.week}. hafta` : "",
        data.range || "",
        data.focusDate ? `${formatDate(data.focusDate)} odaklı` : ""
      ].filter(Boolean);
      renderLessonPlannerFocus(parts.slice(0,2).join(' · '));
    }

    function scheduleCellHtml(items) {
      return items.sort((a, b) => String(a.time || "").localeCompare(String(b.time || ""))).map((item) => lessonChipHtml(item, true)).join("");
    }

    function lessonChipHtml(item, deletable) {
      return `
        <div class="lesson-chip" style="background:${scheduleColor(item.color)}">
          <strong>${escapeHtml(item.lesson)}</strong>
          <small>${escapeHtml([item.time, item.group, item.room].filter(Boolean).join(" · ") || `${item.period}. ders`)}</small>
          ${item.note ? `<small>${escapeHtml(item.note)}</small>` : ""}
          ${deletable ? `<button class="mini-delete" data-delete-schedule="${escapeHtml(item.id)}">Sil</button>` : ""}
        </div>
      `;
    }

    function scheduleColor(color) {
      return {
        sky: "#dbeeff",
        mint: "#dff5ea",
        sun: "#fff1bf",
        rose: "#ffdce6",
        lavender: "#ece4ff"
      }[color] || "#dbeeff";
    }

    function deleteScheduleItem(id) {
      state.scheduleItems = (state.scheduleItems || []).filter((item) => item.id !== id);
      saveState();
      renderSchedule();
      toast("Ders programı kaydı silindi.");
    }

    function activeCalendarEvents() {
      return (state.calendarEvents || [])
        .filter((item) => item.classId === state.activeClassId)
        .sort(sortCalendarEvents);
    }

    function selectCalendarDate(value) {
      const date = parseDateValue(value) || new Date();
      selectedCalendarDate = dateKey(date);
      calendarCursor = new Date(date.getFullYear(), date.getMonth(), 1);
      renderCalendar();
    }

    function moveCalendarMonth(delta) {
      if(calendarViewMode==='week') {
        const selected=parseDateValue(selectedCalendarDate) || new Date();selected.setDate(selected.getDate()+delta*7);selectCalendarDate(dateKey(selected));return;
      }
      calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + delta, 1);
      const selected = parseDateValue(selectedCalendarDate);
      if (!selected || selected.getFullYear() !== calendarCursor.getFullYear() || selected.getMonth() !== calendarCursor.getMonth()) {
        selectedCalendarDate = dateKey(calendarCursor);
      }
      renderCalendar();
    }

    function goTodayCalendar() {
      selectCalendarDate(today());
    }

    function renderCalendar() {
      if (!els.calendarGrid) return;
      const cursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
      const selectedDate = parseDateValue(selectedCalendarDate) || new Date();
      selectedCalendarDate = dateKey(selectedDate);
      if (!calendarDraftId && !pendingFormSaves.has("calendar")) els.calendarEventDate.value = selectedCalendarDate;
      const weekly=calendarViewMode==='week';
      document.querySelectorAll('[data-calendar-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.calendarMode===calendarViewMode)));
      els.prevCalendarMonthBtn.setAttribute('aria-label',weekly?'Önceki hafta':'Önceki ay');
      els.nextCalendarMonthBtn.setAttribute('aria-label',weekly?'Sonraki hafta':'Sonraki ay');

      const weekdays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
      const firstDayOffset = (cursor.getDay() + 6) % 7;
      const start = weekly ? parseDateValue(calendarMondayKey(selectedDate)) : new Date(cursor.getFullYear(), cursor.getMonth(), 1 - firstDayOffset);
      const end=new Date(start.getFullYear(),start.getMonth(),start.getDate()+6);
      els.calendarTitle.textContent = weekly ? `${start.toLocaleDateString('tr-TR',{day:'numeric',month:'short'})} – ${end.toLocaleDateString('tr-TR',{day:'numeric',month:'short',year:'numeric'})}` : cursor.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
      els.calendarGrid.classList.toggle('calendar-week-board',weekly);
      const cells = [];
      for (let i = 0; i < (weekly?7:42); i += 1) {
        const cellDate = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const key = dateKey(cellDate);
        const dayEvents = [...calendarEventsForDate(key), ...birthdayEventsForDate(key)].sort(sortCalendarEvents);
        const visible = dayEvents.slice(0,weekly?4:3);
        const classes = [
          "calendar-day",
          !weekly && cellDate.getMonth() !== cursor.getMonth() ? "muted" : "",
          key === today() ? "today" : "",
          key === selectedCalendarDate ? "selected" : ""
        ].filter(Boolean).join(" ");
        if(weekly) {
          cells.push(`<section class="${classes} calendar-week-column" data-week-date="${key}"><button class="calendar-week-heading" data-calendar-date="${key}" aria-pressed="${key===selectedCalendarDate}"><span>${weekdays[i]}</span><strong>${cellDate.getDate()}</strong></button><div class="calendar-week-notes">${visible.map(event=>`<button class="agenda-sticky event-${calendarNoteType(event.type)}" data-calendar-note-date="${key}" aria-label="${escapeHtml(event.title)} — ${formatDate(key)}"><small>${escapeHtml(event.time || calendarEventLabel(event.type))}</small><strong>${escapeHtml(event.title)}</strong>${event.note?`<p>${escapeHtml(event.note)}</p>`:''}</button>`).join('')}${dayEvents.length>visible.length?`<button class="calendar-more" data-calendar-note-date="${key}">+${dayEvents.length-visible.length} kayıt daha</button>`:''}${!dayEvents.length?`<button class="calendar-empty-add" data-add-note-date="${key}" aria-label="${formatDate(key)} için not ekle">+</button>`:''}</div></section>`);
          continue;
        }
        cells.push(`
          <div class="${classes}" data-calendar-date="${key}" role="button" tabindex="0" aria-label="${formatDate(key)}">
            <span class="calendar-day-number">${cellDate.getDate()}</span>
            ${visible.map((event) => `
              <span class="calendar-pill event-${escapeHtml(event.type || "note")}">${calendarEventIcon(event.type)} ${escapeHtml(event.title)}</span>
            `).join("")}
            ${dayEvents.length > visible.length ? `<span class="calendar-pill">+${dayEvents.length - visible.length} kayıt</span>` : ""}
          </div>
        `);
      }
      els.calendarGrid.innerHTML = (weekly?'':weekdays.map((day) => `<div class="calendar-weekday">${day}</div>`).join("")) + cells.join("");
      els.calendarGrid.querySelectorAll('[data-calendar-note-date]').forEach(button=>button.addEventListener('click',()=>{
        selectCalendarDate(button.dataset.calendarNoteDate);document.getElementById('selectedDayPanel')?.scrollIntoView({behavior:'smooth',block:'start'});
      }));
      els.calendarGrid.querySelectorAll('[data-add-note-date]').forEach(button=>button.addEventListener('click',()=>openCalendarComposer(button.dataset.addNoteDate)));
      els.calendarGrid.querySelectorAll("[data-calendar-date]").forEach((day) => {
        day.addEventListener("click", () => {
          selectedCalendarDate = day.dataset.calendarDate;
          renderCalendar();
          els.calendarGrid.querySelector(`[data-calendar-date="${selectedCalendarDate}"]`)?.focus({preventScroll:true});
        });
        day.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectedCalendarDate = day.dataset.calendarDate;
            renderCalendar();
          }
        });
      });
      renderSelectedDayEvents();
    }

    function calendarEventsForDate(value) {
      const key = typeof value === "string" ? value : dateKey(value);
      return [...activeCalendarEvents().filter((event) => event.date === key), ...holidayEventsForDate(key)];
    }

    function holidayEventsForDate(key) {
      const tools = window.KemalAgendaHolidays;
      if (!tools || !tools.validDate(key)) return [];
      let raw;
      try { raw = localStorage.getItem(LESSON_PLANNER_STORE_KEY); } catch { raw = null; }
      if (raw !== holidayPlannerCache.raw) {
        let planner;
        try { planner = JSON.parse(raw); } catch { planner = null; }
        holidayPlannerCache = { raw, planner: planner && typeof planner === 'object' && !Array.isArray(planner) ? planner : { tatiller: [] }, years: new Set() };
      }
      const year = Number(key.slice(0, 4));
      if (!holidayPlannerCache.years.has(year)) {
        tools.ensure(holidayPlannerCache.planner, [year - 1, year, year + 1]);
        holidayPlannerCache.years.add(year);
      }
      return tools.matching(holidayPlannerCache.planner, key).map((item, index) => ({
        id: `holiday_${item.officialId || index}_${key}`, synthetic: true, date: key,
        type: 'holiday', title: item.name + (item.period === 'afternoon' ? ' · Yarım gün' : ''),
        time: item.period === 'afternoon' ? '13:00' : '',
        note: item.customized || !tools.isOfficial(item) ? 'Öğretmen tarafından düzenlenen tatil' : 'Türkiye resmî tatil takvimi'
      }));
    }

    function openHolidayManager() {
      showView('scheduleView');
      els.lessonPlannerFrame?.contentWindow?.postMessage({
        type: 'kemal-ajanda-focus-week', date: selectedCalendarDate, plannerTab: 'tab-tatil'
      }, window.location.origin === 'null' ? '*' : window.location.origin);
    }

    function birthdayEventsForDate(value) {
      const key = typeof value === "string" ? value : dateKey(value);
      const date = parseDateValue(key);
      if (!date) return [];
      const [, month, day] = key.split("-");
      return activeStudents()
        .filter((student) => {
          const parts = String(student.birthDate || "").split("-");
          return parts.length === 3 && parts[1] === month && parts[2] === day;
        })
        .map((student) => {
          const birthYear = Number(String(student.birthDate || "").split("-")[0]);
          const age = Number.isFinite(birthYear) ? date.getFullYear() - birthYear : null;
          return {
            id: `birthday_${student.id}_${key}`,
            synthetic: true,
            classId: student.classId,
            studentId: student.id,
            date: key,
            time: "08:30",
            type: "birthday",
            title: `${fullName(student)} doğum günü${age && age > 0 ? ` (${age} yaş)` : ""}`,
            note: student.schoolNo ? `Okul No: ${student.schoolNo}` : "Öğrenci doğum günü"
          };
        });
    }

    function renderSelectedDayEvents() {
      const events = [...calendarEventsForDate(selectedCalendarDate), ...birthdayEventsForDate(selectedCalendarDate)].sort(sortCalendarEvents);
      if(els.selectedDayTitle)els.selectedDayTitle.textContent = (parseDateValue(selectedCalendarDate) || new Date()).toLocaleDateString('tr-TR',{day:'numeric',month:'long',weekday:'long'});
      if(els.calendarSelectedCount)els.calendarSelectedCount.textContent = `${events.length} kayıt`;
      els.selectedDayEvents.innerHTML = events.length ? events.map((event) => `
        <article class="calendar-event agenda-sticky event-${calendarNoteType(event.type)} ${isReminderDue(event) ? "reminder-due" : ""}">
          <strong>${calendarEventIcon(event.type)} ${escapeHtml(event.title)}</strong>
          <small>${escapeHtml([event.time, calendarEventLabel(event.type), reminderLabel(event.reminder)].filter(Boolean).join(" · "))}</small>
          ${event.note ? `<small>${escapeHtml(event.note)}</small>` : ""}
          ${event.synthetic ? "" : `<button class="mini-delete" data-delete-calendar="${escapeHtml(event.id)}">Sil</button>`}
        </article>
      `).join("") : `<div class="empty">${formatDate(selectedCalendarDate)} için ajanda kaydı yok.</div>`;
      els.selectedDayEvents.querySelectorAll("[data-delete-calendar]").forEach((button) => {
        button.addEventListener("click", () => deleteCalendarEvent(button.dataset.deleteCalendar));
      });
    }

    function calendarNoteType(type) {
      return ['exam','meb','holiday','reminder','meeting','birthday','special'].includes(type)?type:'note';
    }

    function openCalendarComposer(date) {
      if (!flushFormSave("calendar")) return;
      clearCalendarForm(false);
      selectCalendarDate(date);
      if(els.calendarComposer)els.calendarComposer.open=true;
      els.calendarEventTitle?.focus();
      els.calendarComposer?.scrollIntoView({behavior:'smooth',block:'center'});
    }

    function saveCalendarEvent(options = {}) {
      const title = els.calendarEventTitle.value.trim();
      if (!title) {
        if (!options.automatic) toast("Takvim kaydı için başlık yazın.");
        return !els.calendarEventNote.value.trim() && !calendarDraftId;
      }
      const date = els.calendarEventDate.value || selectedCalendarDate || today();
      const previous = state.calendarEvents || [];
      const existing = previous.find(item => item.id === calendarDraftId);
      const event = {
        id: existing?.id || uid("calendar"),
        classId: state.activeClassId,
        date,
        type: els.calendarEventType.value || "note",
        time: els.calendarEventTime.value,
        title,
        reminder: els.calendarReminder.value,
        note: els.calendarEventNote.value.trim(),
        remindedAt: existing?.remindedAt || "",
        createdAt: existing?.createdAt || new Date().toISOString()
      };
      if (!existing || JSON.stringify(event) !== JSON.stringify(existing)) {
        state.calendarEvents = existing ? previous.map(item => item === existing ? event : item) : [...previous, event];
        if (!saveState()) { state.calendarEvents = previous; return false; }
      }
      calendarDraftId = event.id;
      selectedCalendarDate = date;
      calendarCursor = parseDateValue(date) || calendarCursor;
      calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
      if (!options.automatic) clearCalendarForm(false);
      renderCalendar();
      return true;
    }

    function clearCalendarForm(resetDate = true) {
      clearFormSave("calendar");
      calendarDraftId = null;
      if (resetDate) els.calendarEventDate.value = selectedCalendarDate || today();
      els.calendarEventType.value = "note";
      els.calendarEventTime.value = "";
      els.calendarEventTitle.value = "";
      els.calendarReminder.value = "";
      els.calendarEventNote.value = "";
    }

    function deleteCalendarEvent(id) {
      const event = (state.calendarEvents || []).find((item) => item.id === id);
      if (!event || !confirm(`${event.title} takvim kaydı silinsin mi?`)) return;
      const previous = state.calendarEvents;
      state.calendarEvents = (state.calendarEvents || []).filter((item) => item.id !== id);
      if (!saveState()) { state.calendarEvents = previous; return; }
      if (calendarDraftId === id) clearCalendarForm();
      renderCalendar();
      toast("Takvim kaydı silindi.");
    }

    function requestNotificationPermission() {
      if (!("Notification" in window)) {
        toast("Bu tarayıcı bildirim iznini desteklemiyor.");
        return;
      }
      if (Notification.permission === "granted") {
        toast("Bildirim izni zaten açık.");
        return;
      }
      Notification.requestPermission().then((permission) => {
        toast(permission === "granted" ? "Bildirim izni açıldı." : "Bildirim izni verilmedi; hatırlatıcılar uygulama içinde gösterilir.");
      });
    }

    function checkDueReminders() {
      const now = new Date();
      let changed = false;
      (state.calendarEvents || []).forEach((event) => {
        if (!event.reminder || event.remindedAt) return;
        const reminder = reminderDateTime(event);
        const eventTime = calendarEventDateTime(event);
        if (!reminder || !eventTime) return;
        const stillRelevant = eventTime.getTime() >= now.getTime() - 24 * 60 * 60 * 1000;
        if (reminder.getTime() <= now.getTime() && stillRelevant) {
          event.remindedAt = now.toISOString();
          changed = true;
          notifyReminder(`${calendarEventIcon(event.type)} ${event.title}`, `${formatDate(event.date)} ${event.time || ""}`.trim());
        }
      });

      if (changed) saveState();
      checkBirthdayPopups(now);
    }

    function checkBirthdayPopups(now = new Date()) {
      if (!els.birthdayDialog || els.birthdayDialog.open) return;
      const popups = dueBirthdayPopups(now);
      if (!popups.length) return;
      activeBirthdayPopups = popups;
      els.birthdayPopupBody.innerHTML = popups.map((item) => birthdayPopupCard(item)).join("");
      try {
        els.birthdayDialog.showModal();
      } catch (error) {
        els.birthdayDialog.show();
      }
      const first = popups[0];
      notifyReminder(first.phase === "today" ? "🎂 Doğum günü bugün" : "🎂 Doğum günü yarın", popups.map((item) => fullName(item.student)).join(", "));
    }

    function dueBirthdayPopups(now) {
      state.birthdayReminderLog = state.birthdayReminderLog || {};
      state.birthdaySnoozeLog = state.birthdaySnoozeLog || {};
      const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrowDate = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + 1);
      const windows = [
        { phase: "today", date: todayDate, label: "Bugün doğum günü" },
        { phase: "before", date: tomorrowDate, label: "Yarın doğum günü" }
      ];
      return state.students.flatMap((student) => {
        if (!student.birthDate) return [];
        return windows
          .filter((windowInfo) => birthDateMatches(student.birthDate, dateKey(windowInfo.date)))
          .map((windowInfo) => {
            const key = birthdayPopupKey(student, windowInfo.phase, windowInfo.date);
            const snoozeUntil = state.birthdaySnoozeLog[key] ? new Date(state.birthdaySnoozeLog[key]) : null;
            return {
              key,
              student,
              phase: windowInfo.phase,
              date: dateKey(windowInfo.date),
              label: windowInfo.label,
              age: birthdayAge(student.birthDate, windowInfo.date),
              snoozed: snoozeUntil && snoozeUntil.getTime() > now.getTime()
            };
          })
          .filter((item) => !state.birthdayReminderLog[item.key] && !item.snoozed);
      });
    }

    function birthdayPopupCard(item) {
      const student = item.student;
      const classInfo = state.classes.find((classItem) => classItem.id === student.classId);
      const family = student.family || {};
      const detailLines = [
        classInfo ? `${classInfo.name} · ${classInfo.year || ""}` : "",
        student.schoolNo ? `Okul No: ${student.schoolNo}` : "",
        item.age ? `${item.age} yaşına giriyor` : "",
        family.motherName ? `Anne: ${family.motherName}` : "",
        family.fatherName ? `Baba: ${family.fatherName}` : "",
        student.healthStatus ? `Sağlık: ${student.healthStatus}` : ""
      ].filter(Boolean);
      return `
        <div class="birthday-card">
          <div class="avatar">${avatarHtml(student)}</div>
          <div>
            <span class="badge ${item.phase === "today" ? "red" : "gold"}">${escapeHtml(item.label)}</span>
            <h4>${escapeHtml(fullName(student))}</h4>
            <p>${escapeHtml(formatDate(item.date))}</p>
            <p>${escapeHtml(detailLines.join(" · "))}</p>
          </div>
        </div>
      `;
    }

    function closeBirthdayDialog() {
      snoozeBirthdayPopups(60);
      els.birthdayDialog.close();
    }

    function markBirthdayPopupSeen() {
      state.birthdayReminderLog = state.birthdayReminderLog || {};
      activeBirthdayPopups.forEach((item) => {
        state.birthdayReminderLog[item.key] = new Date().toISOString();
      });
      saveState();
      activeBirthdayPopups = [];
      els.birthdayDialog.close();
    }

    function snoozeBirthdayPopups(minutes) {
      state.birthdaySnoozeLog = state.birthdaySnoozeLog || {};
      const until = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      activeBirthdayPopups.forEach((item) => {
        state.birthdaySnoozeLog[item.key] = until;
      });
      saveState();
      activeBirthdayPopups = [];
    }

    function birthdayPopupKey(student, phase, date) {
      return `${date.getFullYear()}_${student.id}_${phase}`;
    }

    function birthdayAge(birthDate, targetDate) {
      const parts = String(birthDate || "").split("-").map(Number);
      if (parts.length !== 3 || !Number.isFinite(parts[0])) return null;
      const age = targetDate.getFullYear() - parts[0];
      return age > 0 ? age : null;
    }

    function calendarEventIcon(type) {
      return {
        birthday: "🎂",
        exam: "📊",
        meb: "🇹🇷",
        holiday: "🇹🇷",
        meeting: "☎️",
        reminder: "🔔",
        special: "⭐",
        note: "📝"
      }[type] || "📝";
    }

    function calendarEventLabel(type) {
      return {
        birthday: "Doğum günü",
        exam: "Sınav / ölçme",
        meb: "MEB akademik takvim",
        holiday: "Resmî / özel tatil",
        meeting: "Görüşme",
        reminder: "Hatırlatıcı",
        special: "Önemli gün",
        note: "Ajanda notu"
      }[type] || "Ajanda notu";
    }

    function reminderLabel(value) {
      return {
        atTime: "Tam zamanında",
        "1h": "1 saat önce",
        "1d": "1 gün önce",
        "1w": "1 hafta önce"
      }[value] || "";
    }

    function sortCalendarEvents(a, b) {
      return `${a.date || ""} ${a.time || "99:99"} ${a.title || ""}`.localeCompare(`${b.date || ""} ${b.time || "99:99"} ${b.title || ""}`, "tr");
    }

    function reminderDateTime(event) {
      const base = calendarEventDateTime(event);
      if (!base) return null;
      const offset = {
        atTime: 0,
        "1h": 60 * 60 * 1000,
        "1d": 24 * 60 * 60 * 1000,
        "1w": 7 * 24 * 60 * 60 * 1000
      }[event.reminder];
      if (offset === undefined) return null;
      return new Date(base.getTime() - offset);
    }

    function calendarEventDateTime(event) {
      const date = parseDateValue(event.date);
      if (!date) return null;
      const [hour, minute] = String(event.time || "09:00").split(":").map(Number);
      date.setHours(Number.isFinite(hour) ? hour : 9, Number.isFinite(minute) ? minute : 0, 0, 0);
      return date;
    }

    function isReminderDue(event) {
      const reminder = reminderDateTime(event);
      return !!reminder && !event.remindedAt && reminder.getTime() <= Date.now();
    }

    function notifyReminder(title, body) {
      toast(body ? `${title} · ${body}` : title);
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(title, { body });
        } catch (error) {
          console.warn(error);
        }
      }
    }

    function parseDateValue(value) {
      const parts = String(value || "").split("-").map(Number);
      if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
      const date = new Date(parts[0], parts[1] - 1, parts[2]);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    function dateKey(value) {
      const date = value instanceof Date ? value : parseDateValue(value);
      const validDate = date && !Number.isNaN(date.getTime()) ? date : new Date();
      return `${validDate.getFullYear()}-${String(validDate.getMonth() + 1).padStart(2, "0")}-${String(validDate.getDate()).padStart(2, "0")}`;
    }

    function isDateKey(value) {
      return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) && !!parseDateValue(value);
    }

    function birthDateMatches(birthDate, targetDate) {
      const birthParts = String(birthDate || "").split("-");
      const targetParts = String(targetDate || "").split("-");
      return birthParts.length === 3 && targetParts.length === 3 && birthParts[1] === targetParts[1] && birthParts[2] === targetParts[2];
    }

    function renderReportSelectors() {
      const students = activeStudents();
      const currentStudent = els.reportStudent.value;
      const currentExam = els.reportExam.value;
      const chosenExams = new Set(Array.from(els.reportExamPicker.querySelectorAll('input:checked')).map(input => input.value));
      const studentOptions = students.map((student) => (
        `<option value="${escapeHtml(student.id)}">${escapeHtml(fullName(student))}${student.schoolNo ? ` · ${escapeHtml(String(student.schoolNo))}` : ""}</option>`
      )).join("");
      els.reportStudent.innerHTML = studentOptions + `<option value="__all__">Tüm sınıfın karneleri</option>`;
      if (currentStudent === '__all__' || students.some(student => student.id === currentStudent)) els.reportStudent.value = currentStudent;
      els.summaryStudent.innerHTML = studentOptions;
      els.meetingReportStudent.innerHTML = `<option value="__all__">Tüm öğrenciler</option>${studentOptions}`;

      const exams = activeExams();
      const currentRankingExam = els.rankingExam?.value || "";
      els.reportExam.innerHTML = `<option value="__all__">Tüm sınavlar</option><option value="__selected__">Seçtiğim sınavlar</option>` + exams.map((exam) => (
        `<option value="${escapeHtml(exam.id)}">${escapeHtml(exam.name)} · ${formatDate(exam.date)}</option>`
      )).join("");
      if (['__all__', '__selected__'].includes(currentExam) || exams.some(exam => exam.id === currentExam)) els.reportExam.value = currentExam;
      els.reportExamPicker.innerHTML = exams.map(exam => `<label class="check-chip"><input type="checkbox" value="${escapeHtml(exam.id)}" ${chosenExams.has(exam.id) ? 'checked' : ''}>${escapeHtml(exam.name)} · ${formatDate(exam.date)}</label>`).join('') || '<span>Sınav yok</span>';
      els.reportExamPicker.querySelectorAll('input').forEach(input => input.addEventListener('change', () => { updateSubjectPicker(); buildReport(); }));
      els.rankingExam.innerHTML = exams.map((exam) => (
        `<option value="${escapeHtml(exam.id)}">${escapeHtml(exam.name)} · ${formatDate(exam.date)}</option>`
      )).join("") || `<option value="">Sınav yok</option>`;
      if (currentRankingExam && exams.some((exam) => exam.id === currentRankingExam)) els.rankingExam.value = currentRankingExam;
      renderSummaryPickers();
      renderMeetingPicker();
      renderRankingFilters();
    }

    function selectedExamSet() {
      const value = els.reportExam.value;
      if (value === "__all__") return activeExams();
      if (value === '__selected__') {
        const chosen = new Set(Array.from(els.reportExamPicker.querySelectorAll('input:checked')).map(input => input.value));
        return activeExams().filter(exam => chosen.has(exam.id));
      }
      const exam = activeExams().find((item) => item.id === value);
      return exam ? [exam] : [];
    }

    function updateSubjectPicker() {
      const subjects = Array.from(new Set(selectedExamSet().flatMap((exam) => exam.subjects || [])));
      els.subjectPicker.innerHTML = subjects.map((subject) => (
        `<label class="check-chip"><input type="checkbox" value="${escapeHtml(subject)}" checked> ${escapeHtml(subject)}</label>`
      )).join("") || `<span class="badge red">Ders verisi yok</span>`;
      els.subjectPicker.querySelectorAll("input").forEach((input) => input.addEventListener("change", buildReport));
    }

    function selectedSubjects() {
      return Array.from(els.subjectPicker.querySelectorAll("input:checked")).map((input) => input.value);
    }

    function renderReportOptions() {
      const type = els.reportType?.value || "academic";
      const usesAcademicSelectors = ['academic', 'comparison', 'classAnalysis'].includes(type);
      if (els.classAnalysisOptions) els.classAnalysisOptions.hidden = type !== 'classAnalysis';
      els.refreshReportBtn.textContent = type === 'classAnalysis' ? 'Analizi Oluştur' : 'Karneyi Oluştur';
      els.downloadAnalysisExcelBtn.style.display = usesAcademicSelectors ? '' : 'none';
      els.shareWhatsappBtn.style.display = type === 'classAnalysis' ? 'none' : '';
      document.querySelectorAll('[data-report-mode]').forEach(button => {button.setAttribute('aria-selected',String(button.dataset.reportMode === type));});
      els.reportExamPicker.hidden = !usesAcademicSelectors || els.reportExam.value !== '__selected__';
      document.querySelectorAll(".report-option-panel").forEach((panel) => panel.classList.remove("active"));
      [els.reportStudent, els.reportExam, els.subjectPicker].forEach((element) => {
        const field = element?.closest(".field");
        if (field) field.style.display = usesAcademicSelectors ? "" : "none";
      });
      if (type === 'classAnalysis') els.reportStudent.closest('.field').style.display = 'none';
      if (type === "classList") els.classListOptions.classList.add("active");
      if (type === "rankingList") els.rankingReportOptions.classList.add("active");
      if (type === "meetings") els.meetingReportOptions.classList.add("active");
      if (type === "studentSummary") els.studentSummaryOptions.classList.add("active");
    }

    function selectedRankingExam() {
      return state.exams.find((exam) => exam.id === els.rankingExam?.value) || activeExams()[0] || null;
    }

    function renderRankingFilters() {
      if (!els.rankingExam) return;
      const exam = selectedRankingExam();
      const rows = exam ? examParticipantRows(exam) : [];
      fillRankingFilter(els.rankingClassFilter, rows.map((row) => row.className), "Tüm sınıflar");
      fillRankingFilter(els.rankingSchoolFilter, rows.map((row) => row.schoolName), "Tüm okullar");
      fillRankingFilter(els.rankingProvinceFilter, rows.map((row) => row.provinceName), "Tüm iller");
    }

    function fillRankingFilter(select, values, allLabel) {
      if (!select) return;
      const current = select.value;
      const unique = Array.from(new Set(values.map(cleanName).filter(Boolean))).sort((a, b) => a.localeCompare(b, "tr"));
      select.innerHTML = `<option value="__all__">${escapeHtml(allLabel)}</option>` + unique.map((value) => (
        `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`
      )).join("");
      if (current && (current === "__all__" || unique.includes(current))) select.value = current;
    }

    function renderMeetingPicker() {
      const studentId = els.meetingReportStudent?.value || "__all__";
      const meetings = allMeetings().filter((item) => studentId === "__all__" || item.student.id === studentId);
      els.meetingPicker.innerHTML = meetings.map((item) => (
        `<label class="check-chip"><input type="checkbox" value="${escapeHtml(item.id)}" checked> ${escapeHtml(formatDate(item.meeting.date))} · ${escapeHtml(fullName(item.student))}</label>`
      )).join("") || `<span class="badge red">Kayıtlı görüşme yok</span>`;
      els.meetingPicker.querySelectorAll("input").forEach((input) => input.addEventListener("change", buildReport));
    }

    function renderSummaryPickers() {
      const student = state.students.find((item) => item.id === els.summaryStudent?.value) || activeStudents()[0];
      if (!student) {
        els.summaryNoteSelect.innerHTML = `<option value="">Not yok</option>`;
        els.summaryMeetingSelect.innerHTML = `<option value="">Görüşme yok</option>`;
        return;
      }
      els.summaryNoteSelect.innerHTML = `<option value="">Seçilmedi</option>` + (student.notes || []).map((note) => (
        `<option value="${escapeHtml(note.id)}">${formatDate(note.date)} · ${escapeHtml(note.text.slice(0, 42))}</option>`
      )).join("");
      els.summaryMeetingSelect.innerHTML = `<option value="">Seçilmedi</option>` + (student.meetings || []).map((meeting) => (
        `<option value="${escapeHtml(meeting.id)}">${formatDate(meeting.date)} · ${escapeHtml(meeting.type)} · ${escapeHtml(meeting.text.slice(0, 32))}</option>`
      )).join("");
    }

    function allMeetings() {
      return activeStudents().flatMap((student) => (student.meetings || []).map((meeting) => ({
        id: `${student.id}__${meeting.id}`,
        student,
        meeting
      }))).sort((a, b) => String(b.meeting.date || "").localeCompare(String(a.meeting.date || "")));
    }

    function letterheadHtml(title, subtitle = "") {
      const current = activeClass();
      const school = state.teacher?.schoolName || "Kemal Öğretmenim";
      return `
        <div class="letterhead">
          <div class="letterhead-logo">${state.teacher?.schoolLogo ? `<img src="${escapeHtml(safeImageSource(state.teacher.schoolLogo))}" alt="">` : systemLogoHtml()}</div>
          <div>
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(school)}${subtitle ? ` · ${escapeHtml(subtitle)}` : ""}</p>
          </div>
          <div class="letterhead-meta">
            <div>${escapeHtml(current?.name || "Sınıf")}</div>
            <div>${escapeHtml(current?.teacherName || state.teacher?.name || "Kemal Öğretmen")}</div>
            <div>${formatDate(today())}</div>
          </div>
        </div>
      `;
    }

    function reportFooterHtml() {
      return `
        <div class="report-footer">
          <div class="report-brand">
            <div class="report-brand-logo">${systemLogoHtml()}</div>
            <div class="report-brand-name">
              <strong>Kemal Öğretmenim</strong>
              <span>Ölçme değerlendirme sistemi</span>
            </div>
          </div>
          <span>By Kemal Öğretmen · kemalogretmenim.com.tr</span>
        </div>
      `;
    }

    function photoBoxHtml(student, className = "class-list-photo") {
      return `<div class="${className}">${student.photo ? `<img src="${escapeHtml(safeImageSource(student.photo))}" alt="" style="${studentPhotoStyle(student)}">` : escapeHtml(initials(student))}</div>`;
    }

    function buildRankingListReport() {
      const exam = selectedRankingExam();
      if (!exam) {
        els.reportCard.innerHTML = `<div class="empty">Sıralama listesi için önce sınav ekleyin.</div>`;
        return;
      }
      const allRows = examParticipantRows(exam).filter((row) => isFiniteNumber(row.score));
      if (!allRows.length) {
        els.reportCard.innerHTML = `<div class="empty">Bu sınavda sıralanabilecek sonuç bulunamadı.</div>`;
        return;
      }
      const weighted = isWeightedExam(exam);
      const filteredRows = filterRankingRows(allRows);
      const rankedRows = rankParticipantRows(filteredRows);
      const currentClass = activeClass();
      const summary = rankingSummaryData(exam, allRows, weighted);
      const scopeTitle = {
        class: "Sınıf Listesi",
        school: "Okul Listesi",
        province: "İl Listesi",
        all: "Tüm Öğrenciler"
      }[els.rankingScope.value || "class"] || "Sıralama Listesi";
      const scoreHeader = weighted ? "<th>Puan</th><th>Başarı</th>" : "<th>Başarı</th>";
      const scoreCells = (row) => weighted
        ? `<td><strong>${formatScore(row.score, row.maxScore)}</strong></td><td>${formatPercent(row.percent)}</td>`
        : `<td><strong>${formatPercent(row.percent)}</strong></td>`;

      els.reportCard.className = "report-card official-report";
      els.reportCard.innerHTML = `
        ${letterheadHtml("Sınav Sıralama Listesi", `${exam.name} · ${formatDate(exam.date)} · ${scopeTitle}`)}
        <div class="report-kpis">
          <div class="report-kpi"><span>Soru Sayısı</span><b>${summary.questionCount || "-"}</b></div>
          <div class="report-kpi"><span>Katılımcı</span><b>${summary.totalCount}</b></div>
          <div class="report-kpi"><span>Yüzdelik Başarı</span><b>${formatPercent(summary.percentAverage)}</b></div>
          <div class="report-kpi"><span>${weighted ? "Ortalama Puan" : "Sınıf Sayısı"}</span><b>${weighted ? formatScore(summary.scoreAverage, summary.maxScore) : summary.classCount}</b></div>
          ${weighted ? `<div class="report-kpi"><span>Sınıf Sayısı</span><b>${summary.classCount}</b></div>` : ""}
        </div>
        <div class="comparison-grid">
          ${rankingInfoCard("Sınıfım", summary.classRows, weighted, summary.maxScore, "Sınıf içi sonuç")}
          ${rankingInfoCard("Okul", summary.schoolRows, weighted, summary.maxScore, summary.schoolRank)}
          ${rankingInfoCard("İl", summary.provinceRows, weighted, summary.maxScore, summary.provinceRank)}
          ${rankingInfoCard("Tüm Katılımcılar", summary.allRows, weighted, summary.maxScore, summary.overallRank)}
        </div>
        <div class="table-wrap">
          <table class="report-table">
            <thead>
              <tr><th>Sıra</th><th>Öğrenci</th><th>Okul No</th><th>Sınıf</th><th>Okul</th><th>İl</th><th>D</th><th>Y</th><th>B</th><th>Net</th>${scoreHeader}</tr>
            </thead>
            <tbody>
              ${rankedRows.map((row) => `
                <tr>
                  <td><strong>${escapeHtml(row.rank)}</strong></td>
                  <td><strong>${escapeHtml(row.name)}</strong></td>
                  <td>${escapeHtml(row.schoolNo || "-")}</td>
                  <td>${escapeHtml(row.className || "-")}</td>
                  <td>${escapeHtml(row.schoolName || "-")}</td>
                  <td>${escapeHtml(row.provinceName || "-")}</td>
                  <td>${escapeHtml(row.d)}</td>
                  <td>${escapeHtml(row.y)}</td>
                  <td>${escapeHtml(row.b)}</td>
                  <td>${formatNet(row.net)}</td>
                  ${scoreCells(row)}
                </tr>
              `).join("") || `<tr><td colspan="${weighted ? 12 : 11}">Seçili filtrelerde öğrenci yok.</td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="feedback-grid">
          <div class="feedback-card"><strong>Liste Notu</strong>${escapeHtml(rankingListNote(filteredRows, allRows))}</div>
          <div class="feedback-card"><strong>Sıralama Kuralı</strong>Aynı görünen puanı alan öğrenciler aynı sırada gösterilir.</div>
        </div>
        ${reportFooterHtml()}
      `;
    }

    function examParticipantRows(exam) {
      const current = activeClass();
      const activeIds = new Set(activeStudents().map((student) => student.id));
      return getExamParticipants(exam).map((participant) => {
        const student = participant.studentId ? state.students.find((item) => item.id === participant.studentId) : null;
        const result = participant.result || (participant.studentId ? exam.results?.[participant.studentId] : null);
        const classInfo = student ? state.classes.find((item) => item.id === student.classId) : null;
        const className = cleanName(participant.className || (student?.classId === state.activeClassId ? current?.name : classInfo?.name) || "");
        const schoolName = cleanName(participant.schoolName || (student?.classId === state.activeClassId ? state.teacher?.schoolName : "") || "");
        const provinceName = cleanName(participant.provinceName || student?.provinceName || "");
        const isOwnClass = !!(student?.classId === state.activeClassId || activeIds.has(participant.studentId) || (className && normalize(className) === normalize(current?.name || "")));
        return {
          id: participant.studentId || participant.id || participantKey(participant),
          name: participant.name || `${participant.firstName || ""} ${participant.lastName || ""}`.replace(/\s+/g, " ").trim() || (student ? fullName(student) : "İsimsiz Öğrenci"),
          schoolNo: participant.schoolNo || student?.schoolNo || "",
          className: className || (isOwnClass ? current?.name || "" : ""),
          schoolName,
          provinceName,
          isOwnClass,
          result,
          score: scoreForRanking(result),
          percent: result?.total?.percent,
          maxScore: result?.total?.maxScore || normalizeScoringOptions(exam.scoring).pointTotal || 100,
          d: result?.total?.d || 0,
          y: result?.total?.y || 0,
          b: result?.total?.b || 0,
          net: result?.total?.net
        };
      }).filter((row) => row.result);
    }

    function filterRankingRows(rows) {
      let filtered = rows.slice();
      const scope = els.rankingScope?.value || "class";
      if (scope === "class") filtered = filtered.filter((row) => row.isOwnClass);
      filtered = applyRankingFilter(filtered, "className", els.rankingClassFilter?.value);
      filtered = applyRankingFilter(filtered, "schoolName", els.rankingSchoolFilter?.value);
      filtered = applyRankingFilter(filtered, "provinceName", els.rankingProvinceFilter?.value);
      return filtered;
    }

    function applyRankingFilter(rows, key, value) {
      if (!value || value === "__all__") return rows;
      const target = normalize(value);
      return rows.filter((row) => normalize(row[key] || "") === target);
    }

    function rankParticipantRows(rows) {
      const scores = rows.map((row) => ({ score: row.score }));
      return rows.map((row) => ({ ...row, rank: rankInScores(scores, row.score) }))
        .sort((a, b) => roundedRankScore(b.score) - roundedRankScore(a.score) || a.name.localeCompare(b.name, "tr"));
    }

    function rankingSummaryData(exam, rows, weighted) {
      const current = activeClass();
      const ownClassRows = rows.filter((row) => row.isOwnClass);
      const ownSchool = cleanName(state.teacher?.schoolName || ownClassRows.find((row) => row.schoolName)?.schoolName || "");
      const ownProvince = cleanName(ownClassRows.find((row) => row.provinceName)?.provinceName || "");
      const schoolRows = ownSchool ? rows.filter((row) => normalize(row.schoolName) === normalize(ownSchool)) : rows;
      const provinceRows = ownProvince ? rows.filter((row) => normalize(row.provinceName) === normalize(ownProvince)) : rows;
      const scoring = normalizeScoringOptions(exam.scoring);
      const maxScore = scoring.pointTotal || scoring.maxScore;
      return {
        questionCount: Math.max(...rows.map((row) => row.result?.total?.questionCount || 0), 0),
        totalCount: rows.length,
        classCount: enteredClassCount(rows),
        percentAverage: average(rows.map((row) => row.percent).filter(isFiniteNumber)),
        scoreAverage: average(rows.map((row) => row.score).filter(isFiniteNumber)),
        maxScore,
        classRows: ownClassRows,
        schoolRows,
        provinceRows,
        allRows: rows,
        schoolRank: classRankText(ownClassRows, schoolRows, weighted),
        provinceRank: classRankText(ownClassRows, provinceRows, weighted),
        overallRank: classRankText(ownClassRows, rows, weighted),
        className: current?.name || "Sınıfım"
      };
    }

    function rankingInfoCard(title, rows, weighted, maxScore, rankText) {
      const count = rows.length;
      const percentAvg = average(rows.map((row) => row.percent).filter(isFiniteNumber));
      const scoreAvg = average(rows.map((row) => row.score).filter(isFiniteNumber));
      const metric = weighted ? formatScore(scoreAvg, maxScore) : formatPercent(percentAvg);
      return `
        <div class="comparison-card">
          <span>${escapeHtml(title)}</span>
          <b>${metric}</b>
          <p style="margin:6px 0 0;color:#667085;font-weight:800">${count} öğrenci${rankText ? ` · ${escapeHtml(rankText)}` : ""}</p>
          <div class="progress-bar"><div class="progress-fill" style="width:${clampPercent(percentAvg)}%"></div></div>
        </div>
      `;
    }

    function classRankText(ownClassRows, scopeRows, weighted) {
      if (!ownClassRows.length || !scopeRows.length) return "Sınıf sırası yok";
      const ownScore = average(ownClassRows.map((row) => weighted ? row.score : row.percent).filter(isFiniteNumber));
      if (!isFiniteNumber(ownScore)) return "Sınıf sırası yok";
      const groups = classGroupScores(scopeRows, weighted);
      const ownKey = normalize(activeClass()?.name || "Sınıfım");
      const directGroups = groups.filter((group) => group.key !== ownKey || group.isOwnClass);
      if (directGroups.length > 1) {
        return `Sınıf sırası ${rankInScores(directGroups, ownScore)} / ${directGroups.length}`;
      }
      const otherRows = scopeRows.filter((row) => !row.isOwnClass);
      const otherAvg = average(otherRows.map((row) => weighted ? row.score : row.percent).filter(isFiniteNumber));
      if (!isFiniteNumber(otherAvg)) return "Sınıf sırası 1 / 1";
      return `Genel ortalamaya göre ${ownScore >= otherAvg ? "1 / 2" : "2 / 2"}`;
    }

    function classGroupScores(rows, weighted = false) {
      const groups = new Map();
      rows.forEach((row) => {
        const label = row.isOwnClass ? (activeClass()?.name || "Sınıfım") : (row.className || row.schoolName || row.provinceName || "Diğer katılımcılar");
        const key = normalize(label);
        if (!groups.has(key)) groups.set(key, { key, label, values: [], isOwnClass: false });
        const group = groups.get(key);
        group.isOwnClass = group.isOwnClass || row.isOwnClass;
        const value = weighted ? row.score : row.percent;
        if (isFiniteNumber(value)) group.values.push(value);
      });
      return Array.from(groups.values())
        .map((group) => ({ ...group, score: average(group.values) }))
        .filter((group) => isFiniteNumber(group.score));
    }

    function enteredClassCount(rows) {
      const classes = new Set(rows.map((row) => cleanName(row.className)).filter(Boolean).map(normalize));
      if (rows.some((row) => row.isOwnClass)) classes.add(normalize(activeClass()?.name || "Sınıfım"));
      return classes.size || "-";
    }

    function isWeightedExam(exam) {
      const scoring = normalizeScoringOptions(exam.scoring);
      return scoring.pointTotal > 0 || scoring.maxScore !== 100;
    }

    function rankingListNote(filteredRows, allRows) {
      if (filteredRows.length === allRows.length) return "Liste tüm katılımcı havuzuna göre hazırlanmıştır.";
      return `${filteredRows.length} öğrenci seçili filtrelerle listelendi. Üst özet kartlarında sınavın genel havuzu ayrıca korunur.`;
    }

    function buildClassListReport() {
      const students = activeStudents().slice().sort((a, b) => naturalStudentKey(a).localeCompare(naturalStudentKey(b), "tr"));
      if (!students.length) {
        els.reportCard.innerHTML = `<div class="empty">Resimli sınıf listesi için önce öğrenci ekleyin.</div>`;
        return;
      }
      const showParents = els.classListParents.checked;
      els.reportCard.className = "report-card official-report";
      els.reportCard.innerHTML = `
        ${letterheadHtml("Resimli Sınıf Listesi", `${students.length} öğrenci`)}
        <div class="class-list-grid">
          ${students.map((student) => `
            <div class="class-list-card">
              ${photoBoxHtml(student)}
              <div>
                <strong>${escapeHtml(fullName(student))}</strong>
                <span>${student.schoolNo ? `Okul No: ${escapeHtml(String(student.schoolNo))}` : "Okul numarası yok"}</span>
                ${showParents ? `<span>Anne: ${escapeHtml(student.family?.motherName || "-")}</span><span>Baba: ${escapeHtml(student.family?.fatherName || "-")}</span>` : ""}
              </div>
            </div>
          `).join("")}
        </div>
        ${reportFooterHtml()}
      `;
    }

    function buildMeetingReport() {
      const selected = new Set(Array.from(els.meetingPicker.querySelectorAll("input:checked")).map((input) => input.value));
      const meetings = allMeetings().filter((item) => selected.has(item.id));
      if (!meetings.length) {
        els.reportCard.innerHTML = `<div class="empty">Raporlamak için görüşme seçin.</div>`;
        return;
      }
      els.reportCard.className = "report-card official-report";
      els.reportCard.innerHTML = `
        ${letterheadHtml("Veli Görüşme Raporu", `${meetings.length} görüşme kaydı`)}
        <div class="table-wrap">
          <table class="meeting-report-table">
            <thead><tr><th>Tarih</th><th>Öğrenci</th><th>Okul No</th><th>Görüşme</th><th>Not</th></tr></thead>
            <tbody>
              ${meetings.map(({ student, meeting }) => `
                <tr>
                  <td>${formatDate(meeting.date)}</td>
                  <td><strong>${escapeHtml(fullName(student))}</strong></td>
                  <td>${escapeHtml(String(student.schoolNo || "-"))}</td>
                  <td>${escapeHtml(meeting.type || "-")}</td>
                  <td>${escapeHtml(meeting.text || "")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        ${reportFooterHtml()}
      `;
    }

    function buildStudentSummaryReport() {
      const student = state.students.find((item) => item.id === els.summaryStudent.value) || activeStudents()[0];
      if (!student) {
        els.reportCard.innerHTML = `<div class="empty">Öğrenci bilgi özeti için önce öğrenci seçin.</div>`;
        return;
      }
      const note = (student.notes || []).find((item) => item.id === els.summaryNoteSelect.value);
      const meeting = (student.meetings || []).find((item) => item.id === els.summaryMeetingSelect.value);
      const family = student.family || {};
      els.reportCard.className = "report-card official-report";
      els.reportCard.innerHTML = `
        ${letterheadHtml("Öğrenci Bilgi Özeti", fullName(student))}
        <div class="summary-hero">
          ${photoBoxHtml(student, "summary-photo")}
          <div>
            <h2 style="margin:0;font-size:28px">${escapeHtml(fullName(student))}</h2>
            <p style="margin:6px 0 0;color:#465364;font-weight:800">${escapeHtml(activeClass()?.name || "-")} · ${escapeHtml(state.teacher?.schoolName || "Okul bilgisi yok")}</p>
            <p style="margin:4px 0 0;color:#667085;font-weight:800">Okul No: ${escapeHtml(String(student.schoolNo || "-"))} · Doğum: ${student.birthDate ? formatDate(student.birthDate) : "-"}</p>
          </div>
        </div>
        <div class="summary-grid">
          ${els.summaryFamily.checked ? `
            <div class="summary-box"><span>Anne</span><b>${escapeHtml(family.motherName || "-")}</b><p>${escapeHtml([family.motherPhone, family.motherStatus].filter(Boolean).join(" · "))}</p></div>
            <div class="summary-box"><span>Baba</span><b>${escapeHtml(family.fatherName || "-")}</b><p>${escapeHtml([family.fatherPhone, family.fatherStatus].filter(Boolean).join(" · "))}</p></div>
          ` : ""}
          ${els.summaryFamilyDetails.checked ? `
            <div class="summary-box"><span>Veli birlikteliği</span><b>${escapeHtml(family.parentsMaritalStatus || "-")}</b><p>${escapeHtml(family.custodyInfo ? `Çocuk: ${family.custodyInfo}` : "")}</p></div>
            <div class="summary-box"><span>Yedek iletişim</span><b>${escapeHtml(family.backupContactName || "-")}</b><p>${escapeHtml([family.backupContactRelation, family.backupContactPhone].filter(Boolean).join(" · "))}</p></div>
            <div class="summary-box"><span>Ev ve ulaşım</span><b>${escapeHtml([family.homeOwnership, family.schoolTransport].filter(Boolean).join(" · ") || "-")}</b><p>${escapeHtml([family.householdSize ? `Evde ${family.householdSize} kişi` : "", family.siblingCount ? `${family.siblingCount} kardeş` : ""].filter(Boolean).join(" · "))}</p></div>
            <div class="summary-box"><span>Çalışma ortamı</span><b>${escapeHtml(family.studyRoomStatus || "-")}</b></div>
            <div class="summary-box full"><span>Kazandığı başarılar</span><p>${escapeHtml(family.studentAchievements || "-")}</p></div>
            <div class="summary-box full"><span>Ek program / özel durumlar</span><p>${escapeHtml(family.specialPrograms || "-")}</p></div>
          ` : ""}
          ${els.summaryAddress.checked ? `<div class="summary-box full"><span>Adres</span><p>${escapeHtml(student.address || "-")}</p></div>` : ""}
          ${els.summaryHealth.checked ? `<div class="summary-box full"><span>Sağlık Bilgileri</span><p>${escapeHtml(student.healthStatus || "-")}</p></div>` : ""}
          ${els.summaryNote.checked ? `<div class="summary-box full"><span>Seçili Öğretmen Notu</span><p>${note ? `${formatDate(note.date)} · ${escapeHtml(note.text)}` : "Seçili not yok."}</p></div>` : ""}
          ${els.summaryMeeting.checked ? `<div class="summary-box full"><span>Seçili Veli Görüşmesi</span><p>${meeting ? `${formatDate(meeting.date)} · ${escapeHtml(meeting.type)} · ${escapeHtml(meeting.text)}` : "Seçili görüşme yok."}</p></div>` : ""}
        </div>
        ${reportFooterHtml()}
      `;
    }

    function comparisonReportHtml(student) {
      const exams = comparisonExamSet(student.id);
      if (exams.length < 2) {
        return `<div class="empty">${escapeHtml(fullName(student))}: karşılaştırmalı karne için seçili sınavlarda en az iki sonuç olmalı.</div>`;
      }
      const snapshots = exams.map((exam) => comparisonSnapshot(exam, student.id));
      const first = snapshots[0];
      const latest = snapshots[snapshots.length - 1];
      const percentDelta = valueDelta(latest.percent, first.percent);
      const subjects = comparisonSubjects(snapshots, selectedSubjects());
      const trendChart = analysisTrendPages(snapshots);
      const examCountChart = buildExamCountStackedBars(snapshots);
      const subjectDeltaCards = buildSubjectDeltaCards(snapshots, subjects);
      const currentClass = activeClass();
      const teacherName = currentClass?.teacherName || state.teacher?.name || "Kemal Öğretmen";
      const feedback = buildComparisonFeedback(snapshots, subjects);

      return `
        <div class="report-header">
          <div>
            <h2>${escapeHtml(fullName(student))}</h2>
            <p>Karşılaştırmalı İzleme Karnesi · ${escapeHtml(currentClass?.name || "")} · ${snapshots.length} deneme</p>
            <p>${escapeHtml(state.teacher?.schoolName || "")} ${state.teacher?.schoolName ? "·" : ""} ${escapeHtml(teacherName)}</p>
          </div>
          <div class="report-photo">${avatarHtml(student)}</div>
        </div>
        <div class="report-kpis">
          <div class="report-kpi"><span>İlk Deneme Başarısı</span><b>${formatPercent(first.percent)}</b><p>${escapeHtml(first.exam.name)} · ${formatDate(first.exam.date)}</p></div>
          <div class="report-kpi"><span>Son Deneme Başarısı</span><b class="${deltaClass(percentDelta)}">${formatPercent(latest.percent)}</b><p>${escapeHtml(latest.exam.name)} · ${formatDate(latest.exam.date)}</p></div>
          <div class="report-kpi"><span>Başarı Değişimi</span><b class="${deltaClass(percentDelta)}">${formatPercentDelta(percentDelta)}</b><p>İlk denemeye göre</p></div>
          <div class="report-kpi"><span>Doğru / Yanlış / Boş</span><b>${escapeHtml(latest.d)} / ${escapeHtml(latest.y)} / ${escapeHtml(latest.b)}</b><p>${countDeltaText(latest.d - first.d, "D")} · ${countDeltaText(latest.y - first.y, "Y")} · ${countDeltaText(latest.b - first.b, "B")}</p></div>
        </div>
        <h3 class="report-section-title">Deneme Başarı Grafiği</h3>
        <div class="chart-panel">
          <div class="chart-panel-title"><strong>Zaman içindeki başarı</strong><span>Deneme deneme gelişim</span></div>
          ${trendChart}
          <div class="badges">
            <span class="badge blue">Mavi: öğrenci başarısı</span>
            <span class="badge gold">Turuncu: sınıf ortalaması</span>
            <span class="badge green">Yeşil artış</span>
            <span class="badge red">Kırmızı düşüş</span>
          </div>
        </div>
        <h3 class="report-section-title">Doğru-Yanlış-Boş Gelişimi</h3>
        <div class="chart-panel">
          <div class="chart-panel-title"><strong>Her denemede cevap dağılımı</strong><span>Yeşil doğru, turuncu yanlış, gri boş</span></div>
          ${examCountChart}
        </div>
        ${subjectDeltaCards ? `
          <h3 class="report-section-title">Ders Gelişim Özeti</h3>
          ${subjectDeltaCards}
        ` : ""}
        <h3 class="report-section-title">Deneme Bazlı Sayısal Özet</h3>
        <div class="table-wrap">
          <table class="report-table">
            <thead>
              <tr><th>Deneme</th><th>Tarih</th><th>Doğru</th><th>Yanlış</th><th>Boş</th><th>Başarı</th><th>Sınıf Ort.</th><th>Tüm Katılımcılar Ort.</th><th>Önceki Denemeye Göre</th></tr>
            </thead>
            <tbody>
              ${snapshots.map((item, index) => {
                const prev = index > 0 ? snapshots[index - 1] : null;
                const delta = prev ? valueDelta(item.percent, prev.percent) : null;
                return `
                  <tr>
                    <td><strong>${escapeHtml(item.exam.name)}</strong></td>
                    <td>${formatDate(item.exam.date)}</td>
                    <td>${escapeHtml(item.d)}</td>
                    <td>${escapeHtml(item.y)}</td>
                    <td>${escapeHtml(item.b)}</td>
                    <td class="${deltaClass(index ? valueDelta(item.percent, first.percent) : 0)}"><strong>${formatPercent(item.percent)}</strong></td>
                    <td>${formatPercent(item.classAverage)}</td>
                    <td>${formatPercent(item.generalAverage)}</td>
                    <td>${prev ? `<span class="delta-pill ${deltaClass(delta)}">${formatPercentDelta(delta)}</span>` : `<span class="delta-pill status-mid">Başlangıç</span>`}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
        <h3 class="report-section-title">Ders Ders Karşılaştırma</h3>
        <div class="table-wrap">
          <table class="report-table">
            <thead>
              <tr><th>Ders</th>${snapshots.map((item) => `<th>${escapeHtml(shortExamLabel(item.exam))}</th>`).join("")}<th>İlk-Son Değişim</th></tr>
            </thead>
            <tbody>
              ${subjects.map((subject) => {
                const firstValue = firstFiniteSubjectPercent(snapshots, subject);
                const lastValue = lastFiniteSubjectPercent(snapshots, subject);
                const delta = valueDelta(lastValue, firstValue);
                return `
                  <tr>
                    <td><strong>${escapeHtml(subject)}</strong></td>
                    ${snapshots.map((item) => {
                      const subjectResult = subjectValue(item.result.subjects,subject);
                      return `<td>${subjectResult ? `<strong>${formatPercent(subjectResult.percent)}</strong><br><span style="color:#667085;font-size:12px">${escapeHtml(subjectResult.d)}D · ${escapeHtml(subjectResult.y)}Y · ${escapeHtml(subjectResult.b)}B</span>` : "-"}</td>`;
                    }).join("")}
                    <td><span class="delta-pill ${deltaClass(delta)}">${formatPercentDelta(delta)}</span></td>
                  </tr>
                `;
              }).join("") || `<tr><td colspan="${snapshots.length + 2}">Seçili derslerde karşılaştırılacak veri yok.</td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="feedback-grid">
          ${feedback.map((item) => `<div class="feedback-card"><strong>${escapeHtml(item.title)}</strong>${escapeHtml(item.text)}</div>`).join("")}
        </div>
        ${reportFooterHtml()}
      `;
    }

    function comparisonExamSet(studentId) {
      return selectedExamSet()
        .filter((exam) => exam.results?.[studentId] && isFiniteNumber(exam.results[studentId].total?.percent))
        .sort((a, b) => `${a.date || ""} ${a.name || ""}`.localeCompare(`${b.date || ""} ${b.name || ""}`, "tr"));
    }

    function comparisonSnapshot(exam, studentId) {
      const result = projectReportResult(exam, exam.results?.[studentId], selectedSubjects()) || { subjects: {}, total: {} };
      return {
        exam,
        result,
        d: result.total?.d || 0,
        y: result.total?.y || 0,
        b: result.total?.b || 0,
        percent: isFiniteNumber(result.total?.percent) ? result.total.percent : null,
        classAverage: average(classResultRows(exam,selectedSubjects()).map(row=>row.result.total.percent)),
        generalAverage: totalParticipantAverage(exam, selectedSubjects())
      };
    }

    function comparisonSubjects(snapshots, selected) {
      const all = [...new Map(snapshots.flatMap(item=>Object.keys(item.result.subjects || {})).map(name=>[normalize(name),name])).values()];
      const pool = selected.length ? all.filter(subject=>selected.some(name=>normalize(name)===normalize(subject))) : all;
      return pool.sort((a, b) => a.localeCompare(b, "tr"));
    }

    function buildComparisonTrendChart(snapshots, classOnly = false) {
      const width = 860;
      const height = 286;
      const left = 72;
      const right = 62;
      const top = 28;
      const bottom = 66;
      const chartWidth = width - left - right;
      const chartHeight = height - top - bottom;
      const y = (value) => top + chartHeight - (clampPercent(value) / 100) * chartHeight;
      const x = (index) => snapshots.length === 1 ? left + chartWidth / 2 : left + (chartWidth * index) / (snapshots.length - 1);
      const segments = key => {
        const groups=[];let current=[];
        snapshots.forEach((item,index)=>{if(isFiniteNumber(item[key])) current.push(`${x(index)},${y(item[key])}`);else if(current.length){groups.push(current);current=[];}});
        if(current.length) groups.push(current);
        return groups.map(points=>`<polyline class="${classOnly?'analysis-class-line':key==='classAverage'?'class-line':'trend-line'}" points="${points.join(' ')}"></polyline>`).join('');
      };
      const grid = [0, 25, 50, 75, 100].map((tick) => {
        const yy = y(tick);
        return `<line class="grid-line" x1="${left}" y1="${yy}" x2="${width - right}" y2="${yy}"></line><text x="8" y="${yy + 4}">%${tick}</text>`;
      }).join("");
      return `
        <svg class="comparison-trend-chart combo-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Denemeler arası başarı değişimini gösterir">
          ${grid}
          ${segments('percent')}
          ${classOnly?'':segments('classAverage')}
          ${snapshots.map((item, index) => {
            const label = shortExamLabel(item.exam);
            return `
              ${isFiniteNumber(item.percent)?`<circle class="trend-dot" cx="${x(index)}" cy="${y(item.percent)}" r="5"></circle><text x="${x(index)}" y="${Math.max(16, y(item.percent) - 12)}" text-anchor="middle">${formatPercent(item.percent)}</text>`:''}
              ${!classOnly&&isFiniteNumber(item.classAverage)?`<circle class="chart-dot-class" cx="${x(index)}" cy="${y(item.classAverage)}" r="4"><title>Sınıf ortalaması: ${formatPercent(item.classAverage)}</title></circle>`:''}
              <text x="${x(index)}" y="${height - 30}" text-anchor="middle">${escapeHtml(label.slice(0,14))}<title>${escapeHtml(item.exam.name)}</title></text>
              <text x="${x(index)}" y="${height - 12}" text-anchor="middle">${formatDate(item.exam.date)}</text>
            `;
          }).join("")}
        </svg>
      `;
    }

    function buildExamCountStackedBars(snapshots) {
      if (!snapshots.length) return `<div class="empty">Deneme dağılımı için veri yok.</div>`;
      return `
        <div class="stacked-analysis">
          ${snapshots.map((item) => stackedCountRowHtml(shortExamLabel(item.exam), item.d, item.y, item.b, formatPercent(item.percent))).join("")}
        </div>
        ${countLegendHtml()}
      `;
    }

    function buildSubjectStackedBars(subjects) {
      if (!subjects.length) return `<div class="empty">Doğru-yanlış-boş dağılımı için seçili ders verisi yok.</div>`;
      return `
        <div class="stacked-analysis">
          ${subjects.map((item) => stackedCountRowHtml(item.name, item.d, item.y, item.b, formatPercent(item.percent))).join("")}
        </div>
        ${countLegendHtml()}
      `;
    }

    function stackedCountRowHtml(label, d, y, b, summary) {
      const total = (d || 0) + (y || 0) + (b || 0);
      const dWidth = percentWidth(d, total);
      const yWidth = percentWidth(y, total);
      const bWidth = percentWidth(b, total);
      return `
        <div class="stacked-row">
          <div class="stacked-label">${escapeHtml(label)}</div>
          <div class="stacked-track" aria-label="${escapeHtml(label)} doğru yanlış boş dağılımı">
            <div class="stacked-segment correct" style="width:${dWidth}%"></div>
            <div class="stacked-segment wrong" style="width:${yWidth}%"></div>
            <div class="stacked-segment blank" style="width:${bWidth}%"></div>
          </div>
          <div class="stacked-values">${summary ? `${escapeHtml(summary)} · ` : ""}${formatNumber(d)}D · ${formatNumber(y)}Y · ${formatNumber(b)}B</div>
        </div>
      `;
    }

    function countLegendHtml() {
      return `
        <div class="chart-legend">
          <span class="legend-pill"><i class="legend-dot correct"></i>Doğru</span>
          <span class="legend-pill"><i class="legend-dot wrong"></i>Yanlış</span>
          <span class="legend-pill"><i class="legend-dot blank"></i>Boş</span>
        </div>
      `;
    }

    function percentWidth(value, total) {
      if (!total || !isFiniteNumber(value)) return 0;
      return Math.max(0, Math.min(100, (value * 100) / total));
    }

    function buildSubjectDeltaCards(snapshots, subjects) {
      const cards = subjects.map((subject) => {
        const firstValue = firstFiniteSubjectPercent(snapshots, subject);
        const lastValue = lastFiniteSubjectPercent(snapshots, subject);
        const delta = valueDelta(lastValue, firstValue);
        if (!isFiniteNumber(firstValue) && !isFiniteNumber(lastValue)) return "";
        return `
          <div class="subject-delta-card">
            <span>${escapeHtml(subject)}</span>
            <strong>${formatPercent(firstValue)} → ${formatPercent(lastValue)}</strong>
            <b class="${deltaClass(delta)}">${formatPercentDelta(delta)}</b>
          </div>
        `;
      }).filter(Boolean);
      return cards.length ? `<div class="subject-delta-grid">${cards.join("")}</div>` : "";
    }

    function shortExamLabel(exam) {
      const name = cleanName(exam?.name || "Deneme");
      return name.length > 16 ? `${name.slice(0, 15)}…` : name;
    }

    function firstFiniteSubjectPercent(snapshots, subject) {
      const item = snapshots.find((snapshot) => isFiniteNumber(subjectValue(snapshot.result.subjects,subject)?.percent));
      return subjectValue(item?.result.subjects,subject)?.percent ?? null;
    }

    function lastFiniteSubjectPercent(snapshots, subject) {
      const item = snapshots.slice().reverse().find((snapshot) => isFiniteNumber(subjectValue(snapshot.result.subjects,subject)?.percent));
      return subjectValue(item?.result.subjects,subject)?.percent ?? null;
    }

    function formatPercentDelta(value) {
      if (!isFiniteNumber(value)) return "-";
      const sign = value > 0 ? "+" : "";
      return `${sign}${formatNumber(value)} puan`;
    }

    function countDeltaText(value, label) {
      if (!isFiniteNumber(value)) return `${label}: -`;
      const sign = value > 0 ? "+" : "";
      return `${label}: ${sign}${formatNumber(value)}`;
    }

    function deltaClass(value) {
      if (!isFiniteNumber(value) || Math.abs(value) < .5) return "status-mid";
      return value > 0 ? "status-high" : "status-low";
    }

    function valueDelta(next, previous) {
      return isFiniteNumber(next) && isFiniteNumber(previous) ? next - previous : null;
    }

    function buildComparisonFeedback(snapshots, subjects) {
      const first = snapshots[0];
      const latest = snapshots[snapshots.length - 1];
      const delta = valueDelta(latest.percent, first.percent);
      const subjectDeltas = subjects.map((subject) => {
        const start = firstFiniteSubjectPercent(snapshots, subject);
        const end = lastFiniteSubjectPercent(snapshots, subject);
        return { subject, delta: isFiniteNumber(start) && isFiniteNumber(end) ? end - start : null, latest: end };
      }).filter((item) => isFiniteNumber(item.delta));
      const best = subjectDeltas.slice().sort((a, b) => b.delta - a.delta)[0];
      const focus = subjectDeltas.slice().filter((item) => isFiniteNumber(item.latest)).sort((a, b) => a.latest - b.latest)[0];
      const trend = delta > .5
        ? `${formatPercentDelta(delta)} artış var. Bu, çalışma düzeninin öğrencide karşılık bulduğunu gösteriyor.`
        : delta < -.5
          ? `${formatPercentDelta(delta)} düşüş görünüyor. Son denemedeki yanlış ve boşlar birlikte incelenmeli.`
          : "İlk ve son deneme başarısı birbirine yakın. Küçük hedeflerle istikrarlı artış yakalanabilir.";
      return [
        { title: "Genel Değişim", text: trend },
        { title: "En İyi Gelişim", text: best ? `${best.subject} dersinde ${formatPercentDelta(best.delta)} değişim var.` : "Ders bazlı gelişim için yeterli veri yok." },
        { title: "Gelişim Odağı", text: focus ? `Son denemede ${focus.subject} ${formatPercent(focus.latest)} seviyesinde. Bu ders için kısa tekrar planı iyi olur.` : "Gelişim odağı için daha fazla sınav verisi eklenebilir." },
        { title: "Veliye Kısa Not", text: "Bu karşılaştırma tek bir sonucu değil, öğrencinin zaman içindeki akademik yolculuğunu gösterir." }
      ];
    }

    function projectReportResult(exam, result, selected = []) {
      if (!result || typeof result !== 'object') return null;
      const entries = Object.entries(result.subjects || {});
      if (entries.length && !entries.some(([,item])=>item && ['d','y','b'].every(key=>Number.isSafeInteger(item[key])&&item[key]>=0) && item.d+item.y+item.b>0)) return null;
      const keys = new Set(selected.map(normalize));
      if (!selected.length || entries.every(([name]) => keys.has(normalize(name)))) {
        if (isFiniteNumber(result.total?.percent) && result.total.percent >= 0 && result.total.percent <= 100) return result;
      }
      const subjects = Object.fromEntries(entries.filter(([name,item]) => (!selected.length || keys.has(normalize(name))) && item && ['d','y','b'].every(k => Number.isSafeInteger(item[k]) && item[k] >= 0) && item.d+item.y+item.b>0));
      if (!Object.keys(subjects).length) return null;
      const options = normalizeScoringOptions(exam.scoring);
      options.subjectPoints = Object.fromEntries(Object.entries(options.subjectPoints).filter(([name]) => Object.keys(subjects).some(subject => normalize(subject) === normalize(name))));
      const projected = makeResult(subjects, options);
      return isFiniteNumber(projected.total.percent) ? projected : null;
    }

    function subjectValue(subjects, name) {
      if (!subjects) return undefined;
      if (Object.hasOwn(subjects,name)) return subjects[name];
      const key = Object.keys(subjects).find(key=>normalize(key)===normalize(name));
      return key === undefined ? undefined : subjects[key];
    }

    function classResultRows(exam, selected = []) {
      if (!exam || exam.classId !== state.activeClassId) return [];
      return activeStudents().map(student => ({ student, result: projectReportResult(exam, exam.results?.[student.id], selected) })).filter(item => item.result);
    }

    function classAnalysis(exams = selectedExamSet(), selected = selectedSubjects()) {
      const own = exams.filter(exam => exam.classId === state.activeClassId).slice().sort((a,b) => `${a.date || ''} ${a.name}`.localeCompare(`${b.date || ''} ${b.name}`, 'tr'));
      const snapshots = own.map(exam => {
        const rows = classResultRows(exam, selected);
        const mean = average(rows.map(item => item.result.total.percent));
        const sums = rows.reduce((sum,{result}) => {for(const k of ['d','y','b','net']) if(isFiniteNumber(result.total[k])) sum[k] += result.total[k];return sum;},{d:0,y:0,b:0,net:0});
        return {exam, rows, percent:mean, classAverage:mean, ...sums};
      });
      const entriesByStudent = new Map();
      snapshots.forEach(snapshot=>snapshot.rows.forEach(row=>{
        if (!entriesByStudent.has(row.student.id)) entriesByStudent.set(row.student.id,[]);
        entriesByStudent.get(row.student.id).push({exam:snapshot.exam,result:row.result});
      }));
      const students = activeStudents().map(student => {
        const entries = entriesByStudent.get(student.id) || [];
        return {student, entries, percent:average(entries.map(entry => entry.result.total.percent))};
      });
      const names = [...new Map(snapshots.flatMap(snapshot=>snapshot.rows.flatMap(row=>Object.keys(row.result.subjects || {}))).map(name=>[normalize(name),name])).values()];
      const subjects = names.map(name => {
        const perExam = snapshots.map(snapshot => average(snapshot.rows.map(({result}) => subjectValue(result.subjects,name)?.percent).filter(isFiniteNumber)));
        const results = snapshots.flatMap(snapshot => snapshot.rows.map(row => subjectValue(row.result.subjects,name)).filter(Boolean));
        return {name,percent:average(perExam.filter(isFiniteNumber)),count:results.filter(item => isFiniteNumber(item.percent)).length,...results.reduce((sum,item) => {for(const k of ['d','y','b']) if(isFiniteNumber(item[k]))sum[k]+=item[k];return sum;},{d:0,y:0,b:0})};
      }).filter(item => isFiniteNumber(item.percent));
      return {snapshots,students,subjects,percent:average(snapshots.map(item=>item.percent).filter(isFiniteNumber)),resultCount:snapshots.reduce((sum,item)=>sum+item.rows.length,0)};
    }

    function renderAnalysisOverview() {
      if (!els.analysisOverview) return;
      const data = classAnalysis();
      const scored = data.students.filter(item => isFiniteNumber(item.percent));
      els.analysisClassLabel.textContent = classLabel(activeClass());
      els.analysisOverview.innerHTML = [
        ['Sınıf başarı ortalaması',formatPercent(data.percent),'Seçili sınavların ortalaması'],
        ['Sınav',data.snapshots.length,`${activeExams().length} kayıtlı sınav`],
        ['Sonucu bulunan öğrenci',`${scored.length} / ${data.students.length}`,'Seçili sınavlarda'],
        ['Geçerli sonuç',data.resultCount,'Eksik sonuçlar ortalamaya katılmaz']
      ].map(([label,value,detail]) => `<div class="analysis-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(detail)}</small></div>`).join('');
    }

    function buildClassAnalysisReport() {
      const data = classAnalysis();
      els.reportCard.className = 'report-card class-analysis-report';
      if (!data.resultCount) {els.reportCard.innerHTML='<div class="empty">Seçili sınıf ve sınavlarda analiz edilecek geçerli sonuç yok.</div>';return;}
      const target = Math.max(0,Math.min(100,Number(els.analysisTarget?.value) || 0));
      const scored = data.students.filter(item => isFiniteNumber(item.percent));
      const bands = [[0,50,'0–49','#b85e58'],[50,70,'50–69','#c28c35'],[70,85,'70–84','#3a91aa'],[85,101,'85–100','#258579']];
      const support = scored.filter(item => item.percent < target).length;
      els.reportCard.innerHTML = `<article data-class-analysis="${escapeHtml(state.activeClassId)}">
        <div class="report-header"><div><h2>${escapeHtml(activeClass()?.name || 'Sınıfım')}</h2><p>Sınıf Analiz Raporu · ${data.snapshots.length} sınav</p><p>${escapeHtml(state.teacher?.schoolName || '')} · ${escapeHtml(activeClass()?.teacherName || state.teacher?.name || '')}</p></div><div class="analysis-report-score"><strong>${formatPercent(data.percent)}</strong><span>Sınıf ortalaması</span></div></div>
        <div class="analysis-summary-line"><span>${scored.length} / ${data.students.length} öğrenci</span><span>${data.resultCount} geçerli sonuç</span><span>Hedef: %${target}</span><span>Hedefin altında: ${support} öğrenci</span></div>
        <section class="analysis-section"><h3>Sınavlara Göre Sınıf Başarısı</h3>${analysisTrendPages(data.snapshots,true)}<p class="analysis-caption">Her sınavda yalnız bu sınıfın geçerli öğrenci sonuçları kullanılır. Genel başarı, seçili sınav ortalamalarının aritmetik ortalamasıdır. Sonucu bulunmayan öğrenciler sıfır sayılmaz.</p></section>
        <section class="analysis-section"><h3>Başarı Dağılımı</h3><div class="analysis-distribution">${bands.map(([min,max,label,color])=>`<div class="analysis-band" style="--band:${color}"><span>%${label}</span><strong>${scored.filter(item=>item.percent>=min&&item.percent<max).length}</strong><small>öğrenci ortalaması</small></div>`).join('')}</div></section>
        <section class="analysis-section"><h3>Ders Bazında Sınıf Analizi</h3>${data.subjects.map(item=>`<div class="analysis-subject"><div><strong>${escapeHtml(item.name)}</strong><small>${item.count} ders sonucu · ${item.d} D / ${item.y} Y / ${item.b} B</small></div><div class="analysis-bar"><i style="width:${clampPercent(item.percent)}%"></i></div><strong>${formatPercent(item.percent)}</strong></div>`).join('')}</section>
        <section class="analysis-section"><h3>Sınav Bazında Katılım ve Başarı</h3><div class="table-wrap"><table class="report-table"><thead><tr><th>Sınav</th><th>Tarih</th><th>Katılım</th><th>Sonuç yok</th><th>Sınıf Ort.</th><th>En düşük</th><th>En yüksek</th></tr></thead><tbody>${data.snapshots.map(item=>`<tr><td>${escapeHtml(item.exam.name)}</td><td>${formatDate(item.exam.date)}</td><td>${item.rows.length} / ${data.students.length}</td><td>${data.students.length-item.rows.length}</td><td><strong>${formatPercent(item.percent)}</strong></td><td>${item.rows.length?formatPercent(Math.min(...item.rows.map(row=>row.result.total.percent))):'—'}</td><td>${item.rows.length?formatPercent(Math.max(...item.rows.map(row=>row.result.total.percent))):'—'}</td></tr>`).join('')}</tbody></table></div></section>
        ${els.analysisStudentNames?.checked ? `<section class="analysis-section"><h3>Öğrenci Bazında Sınav Özeti</h3><div class="table-wrap"><table class="report-table"><thead><tr><th>Öğrenci</th><th>Okul no</th><th>Sonuç</th><th>Ortalama</th><th>Sınıf farkı</th><th>Hedef</th></tr></thead><tbody>${data.students.map(item=>`<tr><td>${escapeHtml(fullName(item.student))}</td><td>${escapeHtml(item.student.schoolNo || '—')}</td><td>${item.entries.length} / ${data.snapshots.length}</td><td>${formatPercent(item.percent)}</td><td>${formatPercentDelta(valueDelta(item.percent,data.percent))}</td><td>${!isFiniteNumber(item.percent)?'Sonuç yok':item.percent>=target?'Hedefe ulaştı':'Destek planı'}</td></tr>`).join('')}</tbody></table></div></section>` : ''}
        ${reportFooterHtml()}</article>`;
    }

    function analysisTrendPages(snapshots, classOnly = false) {
      const pages=[];
      for(let start=0;start<snapshots.length;start+=10) pages.push(`<div class="analysis-chart-scroll">${buildComparisonTrendChart(snapshots.slice(start,start+10),classOnly)}</div>`);
      return pages.join('');
    }

    function buildReport() {
      const type = els.reportType?.value || "academic";
      renderAnalysisOverview();
      if (type === 'classAnalysis') return buildClassAnalysisReport();
      if (type === "classList") return buildClassListReport();
      if (type === "rankingList") return buildRankingListReport();
      if (type === "meetings") return buildMeetingReport();
      if (type === "studentSummary") return buildStudentSummaryReport();
      const students = els.reportStudent.value === '__all__' ? activeStudents() : activeStudents().filter(student => student.id === els.reportStudent.value);
      els.reportCard.className = 'report-card';
      if (!students.length || !selectedExamSet().length) {
        els.reportCard.innerHTML = `<div class="empty">Karne için öğrenci ve en az bir sınav seçin.</div>`;
        return;
      }
      els.reportCard.innerHTML = students.map(student => `<article class="student-report-page" data-report-student="${escapeHtml(student.id)}">${type === 'comparison' ? comparisonReportHtml(student) : academicReportHtml(student)}</article>`).join('');
    }

    function academicReportHtml(student) {
      const exams = selectedExamSet().filter(exam => exam.results?.[student.id]);
      const subjects = selectedSubjects();
      if (!exams.length) return `<div class="empty">${escapeHtml(fullName(student))}: seçili sınavlarda kayıtlı sonuç yok.</div>`;

      const report = aggregateStudentReport(student.id, exams, subjects);
      const currentClass = activeClass();
      const teacherName = currentClass?.teacherName || state.teacher?.name || "Kemal Öğretmen";
      const title = exams.length > 1 ? "Akademik İzleme Karnesi" : exams[0].name;
      const scope = exams.length === 1 ? (exams[0].scope || "class") : "mixed";
      const scopeText = scope === "mixed" ? "Genel" : scopeLabel(scope);
      const averageLabel = averageScopeLabel(scope);
      const rankScopeText = scope === "class" ? "Sınav" : scopeText;
      const ranking = buildRankingSummary(student.id, exams);
      const showRankingBlock = ranking.allowed;
      const feedback = buildFeedback(report);
      const comboChart = buildComboChart(report.subjects, averageLabel);
      const subjectStackedBars = buildSubjectStackedBars(report.subjects);
      const rows = report.subjects.map((item) => {
        const status = compareStatus(item.percent, item.classAverage);
        const generalStatus = compareStatus(item.percent, item.generalAverage);
        return `
          <tr>
            <td><strong>${escapeHtml(item.name)}</strong></td>
            <td>${escapeHtml(item.d)}</td>
            <td>${escapeHtml(item.y)}</td>
            <td>${escapeHtml(item.b)}</td>
            <td>${formatNet(item.net)}</td>
            <td class="${status.className}">${formatPercent(item.percent)}</td>
            <td>${formatPercent(item.classAverage)}</td>
            <td>${formatPercent(item.generalAverage)}</td>
            <td class="${status.className}">${status.label}</td>
            <td class="${generalStatus.className}">${generalStatus.label}</td>
          </tr>
        `;
      }).join("");
      const totalStatus = compareStatus(report.total.percent, report.total.classAverage);
      const totalGeneralStatus = compareStatus(report.total.percent, report.total.generalAverage);

      return `
        <div class="report-header">
          <div>
            <h2>${escapeHtml(fullName(student))}</h2>
            <p>${escapeHtml(title)} · ${escapeHtml(currentClass?.name || "")} · ${formatDate(exams[0].date)}${exams.length > 1 ? ` / ${exams.length} sınav` : ""}</p>
            ${exams.length > 1 ? `<p>Denemeler: ${exams.map(exam => escapeHtml(exam.name)).join(' · ')}</p>` : ''}
            <p>${escapeHtml(state.teacher?.schoolName || "")} ${state.teacher?.schoolName ? "·" : ""} ${escapeHtml(teacherName)}</p>
          </div>
          <div class="report-photo">${avatarHtml(student)}</div>
        </div>
        <div class="report-kpis">
          <div class="report-kpi"><span>Toplam Doğru</span><b>${escapeHtml(report.total.d)}</b></div>
          <div class="report-kpi"><span>Toplam Yanlış</span><b>${escapeHtml(report.total.y)}</b></div>
          <div class="report-kpi"><span>Toplam Boş</span><b>${escapeHtml(report.total.b)}</b></div>
          <div class="report-kpi"><span>Başarı</span><b class="${totalStatus.className}">${formatPercent(report.total.percent)}</b></div>
        </div>
        <div class="comparison-grid">
          <div class="comparison-card">
            <span>Öğrenci Başarısı</span>
            <b class="${totalStatus.className}">${formatPercent(report.total.percent)}</b>
            <div class="progress-bar"><div class="progress-fill" style="width:${clampPercent(report.total.percent)}%"></div></div>
          </div>
          <div class="comparison-card">
            <span>Sınıf Ortalaması</span>
            <b>${formatPercent(report.total.classAverage)}</b>
            <div class="progress-bar"><div class="progress-fill" style="width:${clampPercent(report.total.classAverage)}%"></div></div>
          </div>
          <div class="comparison-card">
            <span>${escapeHtml(averageLabel)}</span>
            <b>${formatPercent(report.total.generalAverage)}</b>
            <div class="progress-bar"><div class="progress-fill" style="width:${clampPercent(report.total.generalAverage)}%"></div></div>
          </div>
        </div>
        ${showRankingBlock ? `
          <div class="ranking-grid">
            <div class="ranking-card"><span>Sınıf Sırası</span><b>${escapeHtml(ranking.classRank || "-")} / ${escapeHtml(ranking.classTotal || "-")}</b></div>
            <div class="ranking-card"><span>${escapeHtml(rankScopeText)} Sırası</span><b>${escapeHtml(ranking.generalRank || "-")} / ${escapeHtml(ranking.generalTotal || "-")}</b></div>
            <div class="ranking-card"><span>Başarı Puanı</span><b>${formatScore(ranking.score, ranking.maxScore)}</b></div>
          </div>
        ` : ""}
        <h3 class="report-section-title">Ders Başarı Grafiği</h3>
        <div class="chart-panel">
          <div class="chart-panel-title"><strong>Ders bazlı başarı ve ortalamalar</strong><span>Öğrenci · Sınıf · ${escapeHtml(averageLabel)}</span></div>
          ${comboChart || `<div class="empty">Grafik için seçili ders verisi yok.</div>`}
          <div class="badges">
            <span class="badge blue">Renkli sütunlar: öğrenci</span>
            <span class="badge gold">Turuncu çizgi: sınıf ort.</span>
            <span class="badge green">Mor kesik çizgi: ${escapeHtml(averageLabel)}</span>
          </div>
        </div>
        <h3 class="report-section-title">Doğru-Yanlış-Boş Dağılımı</h3>
        <div class="chart-panel">
          <div class="chart-panel-title"><strong>Derslerde cevap dağılımı</strong><span>Eksiklerin nereden geldiğini gösterir</span></div>
          ${subjectStackedBars}
        </div>
        <h3 class="report-section-title">Ders Ders Analiz</h3>
        <div class="table-wrap">
          <table class="report-table">
            <thead>
              <tr><th>Ders</th><th>Doğru</th><th>Yanlış</th><th>Boş</th><th>Net</th><th>Başarı</th><th>Sınıf Ort.</th><th>${escapeHtml(averageLabel)}</th><th>Sınıf Kıyas</th><th>Genel Kıyas</th></tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="10">Seçili derslerde veri yok.</td></tr>`}
              <tr>
                <td><strong>TOPLAM</strong></td>
                <td><strong>${escapeHtml(report.total.d)}</strong></td>
                <td><strong>${escapeHtml(report.total.y)}</strong></td>
                <td><strong>${escapeHtml(report.total.b)}</strong></td>
                <td><strong>${formatNet(report.total.net)}</strong></td>
                <td class="${totalStatus.className}"><strong>${formatPercent(report.total.percent)}</strong></td>
                <td><strong>${formatPercent(report.total.classAverage)}</strong></td>
                <td><strong>${formatPercent(report.total.generalAverage)}</strong></td>
                <td class="${totalStatus.className}"><strong>${totalStatus.label}</strong></td>
                <td class="${totalGeneralStatus.className}"><strong>${totalGeneralStatus.label}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="feedback-grid">
          ${feedback.map((item) => `<div class="feedback-card"><strong>${escapeHtml(item.title)}</strong>${escapeHtml(item.text)}</div>`).join("")}
        </div>
        ${reportFooterHtml()}
      `;
    }

    function aggregateStudentReport(studentId, exams, selected) {
      const subjectMap = new Map();
      let total = { d: 0, y: 0, b: 0, net: 0, percent: null, classAverage: null, generalAverage: null };
      const allSubjects = Array.from(new Set(exams.flatMap((exam) => exam.subjects || [])));
      const subjectsToUse = [...new Map((selected.length ? selected : allSubjects).map(name=>[normalize(name),name])).values()];
      const totalPercentSamples = [];
      subjectsToUse.forEach((subject) => subjectMap.set(subject, { name: subject, d: 0, y: 0, b: 0, net: 0, classAverageSamples: [], generalAverageSamples: [] }));

      exams.forEach((exam) => {
        const result = projectReportResult(exam, exam.results?.[studentId], selected);
        if (isFiniteNumber(result?.total?.percent)) totalPercentSamples.push(result.total.percent);
        const averages = classAverages(exam);
        const generalAverages = participantAverages(exam);
        subjectsToUse.forEach((subject) => {
          const item = subjectValue(result?.subjects,subject);
          if (!item) return;
          const target = subjectMap.get(subject);
          target.d += item.d;
          target.y += item.y;
          target.b += item.b;
          target.net += isFiniteNumber(item.net) ? item.net : item.d;
          if (isFiniteNumber(subjectValue(averages,subject))) target.classAverageSamples.push(subjectValue(averages,subject));
          if (isFiniteNumber(subjectValue(generalAverages,subject))) target.generalAverageSamples.push(subjectValue(generalAverages,subject));
        });
      });

      const subjects = Array.from(subjectMap.values()).map((item) => {
        const denom = item.d + item.y + item.b;
        const net = isFiniteNumber(item.net) ? item.net : item.d;
        item.percent = denom ? (net * 100) / denom : null;
        item.classAverage = average(item.classAverageSamples);
        item.generalAverage = average(item.generalAverageSamples);
        delete item.classAverageSamples;
        delete item.generalAverageSamples;
        total.d += item.d;
        total.y += item.y;
        total.b += item.b;
        total.net += net;
        return item;
      }).filter((item) => item.percent !== null);
      const totalDenom = total.d + total.y + total.b;
      total.percent = totalPercentSamples.length ? average(totalPercentSamples) : (totalDenom ? (total.net * 100) / totalDenom : null);
      total.classAverage = average(exams.map(exam=>average(classResultRows(exam, selected).map(row=>row.result.total.percent))).filter(isFiniteNumber));
      total.generalAverage = average(exams.map(exam=>totalParticipantAverage(exam, selected)).filter(isFiniteNumber));
      return { subjects, total };
    }

    function classAverages(exam) {
      const sums = {};
      const counts = {};
      const labels = {};
      classResultRows(exam).forEach(({result}) => {
        Object.entries(result.subjects || {}).forEach(([subject, item]) => {
          if (!isFiniteNumber(item.percent)) return;
          const key=normalize(subject);labels[key]=subject;
          sums[key] = (sums[key] || 0) + item.percent;
          counts[key] = (counts[key] || 0) + 1;
        });
      });
      return Object.fromEntries(Object.keys(sums).map((key) => [labels[key], sums[key] / counts[key]]));
    }

    function totalClassAverage(exam) {
      const scores = classResultRows(exam).map(({result}) => result.total?.percent).filter(isFiniteNumber);
      return average(scores);
    }

    function getExamParticipants(exam) {
      if (Array.isArray(exam.participants) && exam.participants.length) return exam.participants;
      return makeParticipantsFromResults(exam.results || {});
    }

    function participantAverages(exam) {
      const sums = {};
      const counts = {};
      const labels = {};
      getExamParticipants(exam).forEach((participant) => {
        Object.entries(participant.result?.subjects || {}).forEach(([subject, item]) => {
          if (!isFiniteNumber(item.percent)) return;
          const key=normalize(subject);labels[key]=subject;
          sums[key] = (sums[key] || 0) + item.percent;
          counts[key] = (counts[key] || 0) + 1;
        });
      });
      return Object.fromEntries(Object.keys(sums).map((key) => [labels[key], sums[key] / counts[key]]));
    }

    function totalParticipantAverage(exam, selected = []) {
      const scores = getExamParticipants(exam).map((participant) => projectReportResult(exam, participant.result, selected)?.total?.percent).filter(isFiniteNumber);
      return average(scores);
    }

    function buildRankingSummary(studentId, exams) {
      if (exams.length !== 1 || !exams[0].showRankings) return { allowed: false };
      const exam = exams[0];
      const ownResult = exam.results?.[studentId];
      const ownScore = scoreForRanking(ownResult);
      if (!ownResult || !isFiniteNumber(ownScore)) return { allowed: false };
      const classScores = classResultRows(exam)
        .map(({student,result}) => ({ id:student.id, score: scoreForRanking(result) }))
        .filter((item) => isFiniteNumber(item.score));
      const generalScores = getExamParticipants(exam)
        .map((participant) => ({ id: participant.studentId || participant.id, score: scoreForRanking(participant.result), schoolNo: participant.schoolNo, name: participant.name }))
        .filter((item) => isFiniteNumber(item.score));
      return {
        allowed: true,
        score: ownScore,
        maxScore: ownResult.total?.maxScore || 100,
        classRank: rankInScores(classScores, ownScore),
        classTotal: classScores.length,
        generalRank: rankInScores(generalScores, ownScore),
        generalTotal: generalScores.length
      };
    }

    function scoreForRanking(result) {
      return isFiniteNumber(result?.total?.score) ? result.total.score : result?.total?.percent;
    }

    function rankInScores(scores, score) {
      const own = roundedRankScore(score);
      return scores.filter((item) => roundedRankScore(item.score) > own).length + 1;
    }

    function roundedRankScore(value) {
      return isFiniteNumber(value) ? Number(value.toFixed(1)) : -Infinity;
    }

    function buildFeedback(report) {
      const total = report.total.percent;
      const weakest = report.subjects.slice().sort((a, b) => (a.percent || 0) - (b.percent || 0))[0];
      const strongest = report.subjects.slice().sort((a, b) => (b.percent || 0) - (a.percent || 0))[0];
      const main = total >= 85
        ? "Çok güçlü bir çalışma görünümü var. Bu başarıyı korumak için düzenli tekrar ve dikkat çalışmaları yeterli olacaktır."
        : total >= 70
          ? "Genel başarı iyi düzeyde. Küçük tekrarlarla yanlışların azaldığını görmek mümkün."
          : "Bu karne bize gelişim alanlarını net gösteriyor. Kısa, düzenli ve hedefli tekrarlarla hızlı ilerleme beklenir.";
      const focus = weakest
        ? `${weakest.name} dersinde ${formatPercent(weakest.percent)} başarı görünüyor. Bu derste yanlış ve boşlar üzerinden mini tekrar planı iyi olur.`
        : "Seçili derslerde yeterli veri yok; yeni sınavlar eklendikçe daha net dönüt oluşur.";
      const power = strongest
        ? `${strongest.name} güçlü alan olarak öne çıkıyor. Bu özgüven diğer derslere de taşınabilir.`
        : "Güçlü alanı belirlemek için daha fazla akademik veri eklenebilir.";
      return [
        { title: "Öğretmen Dönütü", text: main },
        { title: "Gelişim Odağı", text: focus },
        { title: "Güçlü Yan", text: power },
        { title: "Veliye Kısa Not", text: "Sonuçları sadece puan olarak değil, hangi derste nasıl destek gerektiğini gösteren bir yol haritası olarak değerlendirelim." }
      ];
    }

    function buildComboChart(subjects, averageLabel) {
      if (!subjects.length) return "";
      const width = 860;
      const height = 286;
      const left = 48;
      const right = 22;
      const top = 28;
      const bottom = 58;
      const chartWidth = width - left - right;
      const chartHeight = height - top - bottom;
      const step = chartWidth / subjects.length;
      const barWidth = Math.min(54, step * .46);
      const y = (value) => top + chartHeight - (clampPercent(value) / 100) * chartHeight;
      const x = (index) => left + step * index + step / 2;
      const classPoints = subjects.map((item, index) => `${x(index)},${y(item.classAverage)}`).join(" ");
      const generalPoints = subjects.map((item, index) => `${x(index)},${y(item.generalAverage)}`).join(" ");
      const grid = [0, 25, 50, 75, 100].map((tick) => {
        const yy = y(tick);
        return `<line class="grid-line" x1="${left}" y1="${yy}" x2="${width - right}" y2="${yy}"></line><text x="8" y="${yy + 4}">%${tick}</text>`;
      }).join("");
      const bars = subjects.map((item, index) => {
        const barX = x(index) - barWidth / 2;
        const barY = y(item.percent);
        const barHeight = top + chartHeight - barY;
        const label = item.name.length > 13 ? `${item.name.slice(0, 12)}…` : item.name;
        const color = subjectColor(index);
        return `
          <rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" rx="9" fill="${color}" filter="url(#barShadow)"></rect>
          <text x="${x(index)}" y="${height - 22}" text-anchor="middle">${escapeHtml(label)}</text>
          <text x="${x(index)}" y="${Math.max(16, barY - 8)}" text-anchor="middle">${formatPercent(item.percent)}</text>
        `;
      }).join("");
      return `
        <svg class="combo-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Ders başarılarını sütun ve çizgi grafikle gösterir">
          <defs>
            <filter id="barShadow" x="-20%" y="-20%" width="140%" height="150%">
              <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#23384f" flood-opacity=".14"></feDropShadow>
            </filter>
          </defs>
          ${grid}
          ${bars}
          <polyline class="class-line" points="${classPoints}"></polyline>
          <polyline class="general-line" points="${generalPoints}"></polyline>
          ${subjects.map((item, index) => `<circle class="chart-dot-class" cx="${x(index)}" cy="${y(item.classAverage)}" r="6"></circle><circle class="chart-dot-general" cx="${x(index)}" cy="${y(item.generalAverage)}" r="6"></circle>`).join("")}
          <text x="${left}" y="${height - 5}">Renkli sütunlar: öğrenci başarısı · Turuncu çizgi: sınıf ort. · Mor kesik çizgi: ${escapeHtml(averageLabel)}</text>
        </svg>
      `;
    }

    function subjectColor(index) {
      return ["#2563eb", "#ef4444", "#14b8a6", "#f59e0b", "#8b5cf6", "#06b6d4", "#84cc16"][index % 7];
    }

    function compareStatus(value, averageValue) {
      if (!isFiniteNumber(value) || !isFiniteNumber(averageValue)) return { className: "status-mid", label: "Veri yok" };
      if (value < averageValue - 0.5) return { className: "status-low", label: "Ortalamanın altında" };
      if (value > averageValue + 0.5) return { className: "status-high", label: "Ortalamanın üstünde" };
      return { className: "status-mid", label: "Ortalama" };
    }

    function clampPercent(value) {
      if (!isFiniteNumber(value)) return 0;
      return Math.max(0, Math.min(100, value));
    }

    async function renderReportCanvas(source = els.reportCard) {
      const clone = source.cloneNode(true);
      if (source !== els.reportCard) {
        clone.id = 'reportCard';
        clone.className = source.classList.contains('class-analysis-report') ? 'report-card class-analysis-report' : 'report-card';
      }
      const width = 1000;
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.left = "-10000px";
      iframe.style.top = "0";
      iframe.style.width = `${width}px`;
      iframe.style.height = `${Math.max(source.scrollHeight + 80, 1000)}px`;
      iframe.style.border = "0";
      iframe.style.pointerEvents = "none";
      clone.style.width = `${width}px`;
      clone.style.maxWidth = "none";
      clone.style.margin = "0";
      prepareImagesForExport(clone);
      document.body.appendChild(iframe);
      try {
        const doc = iframe.contentDocument;
        const styles = Array.from(document.styleSheets).map(sheet => {
          try {return Array.from(sheet.cssRules).map(rule=>rule.cssText).join('\n');} catch {return '';}
        }).join('\n');
        doc.open();
        doc.write(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>${styles}\n.analysis-chart-scroll{overflow:visible}.analysis-chart-scroll svg{min-width:0}#reportCard{padding:24px;box-sizing:border-box}</style></head><body style="margin:0;background:#fff">${clone.outerHTML}</body></html>`);
        doc.close();
        await waitForNextFrame();
        const target = doc.querySelector("#reportCard");
        await waitForExportImages(doc.body);
        return await html2canvas(target, {
          scale: Math.min(2, window.devicePixelRatio || 2),
          backgroundColor: "#fffdfa",
          allowTaint: false,
          useCORS: false,
          imageTimeout: 0,
          logging: false
        });
      } finally {
        iframe.remove();
      }
    }

    function waitForNextFrame() {
      return new Promise((resolve) => requestAnimationFrame(() => resolve()));
    }

    function prepareImagesForExport(root) {
      root.querySelectorAll("img").forEach((img) => {
        const source = img.getAttribute("src") || "";
        img.removeAttribute("srcset");
        img.removeAttribute("crossorigin");
        if (source.startsWith("data:") || img.hasAttribute("data-agenda-brand-logo")) return;
        const holder = img.parentElement;
        if (holder) {
          holder.textContent = holder.classList.contains("report-photo") ? "Foto" : "";
        } else {
          img.remove();
        }
      });
    }

    function waitForExportImages(root) {
      const images = Array.from(root.querySelectorAll("img"));
      return Promise.all(images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));
    }

    async function downloadImage(type) {
      if (!window.html2canvas) {
        toast("Görsel dışa aktarma kütüphanesi yüklenemedi.");
        return;
      }
      try {
        const mime = type === "jpeg" ? "image/jpeg" : "image/png";
        for (const target of reportExportTargets()) {
          const canvas = await renderReportCanvas(target);
          const student = state.students.find(item => item.id === target.dataset.reportStudent);
          const link = document.createElement('a');
          link.href = canvas.toDataURL(mime, .94);
          link.download = `karne-${safeFileName(student ? `${fullName(student)}-${selectedReportName()}` : selectedReportName())}.${type === 'jpeg' ? 'jpg' : 'png'}`;
          link.click();
        }
      } catch (error) {
        console.error(error);
        toast("Karne görseli kaydedilemedi. Sayfayı yenileyip tekrar deneyin.");
      }
    }

    async function shareReportWhatsapp() {
      if (els.reportType.value === 'classAnalysis') {toast('Sınıf analizini PDF veya Excel olarak dışa aktarın. Veliye paylaşmak için tek öğrenci karnesi seçin.');return;}
      if (els.reportStudent.value === '__all__' && ['academic', 'comparison'].includes(els.reportType.value)) {
        toast('Veliye göndermek için tek bir öğrenci seçin.');
        return;
      }
      if (!window.html2canvas) {
        toast("Paylaşım için görsel dışa aktarma kütüphanesi yüklenemedi.");
        return;
      }
      try {
        buildReport();
        const canvas = await renderReportCanvas();
        const blob = await canvasToBlob(canvas, "image/png", .94);
        const fileName = `karne-${safeFileName(selectedReportName())}.png`;
        const student = selectedReportStudentForShare();
        const phone = preferredParentPhone(student);
        const text = whatsappShareText(student);
        const file = new File([blob], fileName, { type: "image/png" });

        if (navigator.canShare?.({ files: [file] }) && navigator.share) {
          await navigator.share({ title: "Öğretmen Ajandası Karne", text, files: [file] });
          toast("Karne WhatsApp paylaşımı için hazırlandı.");
          return;
        }

        const copied = await copyImageToClipboard(blob);
        downloadBlob(blob, fileName);
        openWhatsapp(phone, copied ? `${text}\n\nKarne görseli panoya kopyalandı; WhatsApp görüşmesine yapıştırabilirsiniz.` : `${text}\n\nKarne görseli indirildi; WhatsApp görüşmesine dosya olarak ekleyebilirsiniz.`);
        toast(copied ? "Karne panoya kopyalandı ve WhatsApp açıldı." : "Karne indirildi ve WhatsApp açıldı.");
      } catch (error) {
        console.error(error);
        toast("WhatsApp paylaşımı hazırlanamadı. PNG olarak kaydedip elle gönderebilirsiniz.");
      }
    }

    function canvasToBlob(canvas, mime, quality) {
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Görsel dosyası oluşturulamadı."));
        }, mime, quality);
      });
    }

    async function copyImageToClipboard(blob) {
      if (!navigator.clipboard || typeof ClipboardItem === "undefined") return false;
      try {
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        return true;
      } catch (error) {
        console.warn(error);
        return false;
      }
    }

    function downloadBlob(blob, fileName) {
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = fileName;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function analysisWorkbookRows() {
      const data = classAnalysis();
      const sheets = {
        'Sınavlar': [['Sınav','Tarih','Sınıf ortalaması (%)','Katılan','Sınıf mevcudu','Sonuç yok','Doğru','Yanlış','Boş','Net'],
          ...data.snapshots.map(item=>[item.exam.name,item.exam.date,item.percent,item.rows.length,data.students.length,data.students.length-item.rows.length,item.d,item.y,item.b,item.net])],
        'Dersler': [['Ders','Sınıf ortalaması (%)','Geçerli ders sonucu','Doğru','Yanlış','Boş'],...data.subjects.map(item=>[item.name,item.percent,item.count,item.d,item.y,item.b])],
        'Özet': [['Sınıf',classLabel(activeClass())],['Genel başarı (%)',data.percent],['Sınav sayısı',data.snapshots.length],['Geçerli sonuç',data.resultCount],['Hesap','Seçili sınavların sınıf ortalamalarının aritmetik ortalaması. Eksik sonuçlar sıfır sayılmaz. Başarı yüzdesidir; ulusal yüzdelik sıralama değildir.']]
      };
      if (els.analysisStudentNames?.checked) sheets['Öğrenciler'] = [['Okul no','Öğrenci','Sonuç sayısı','Seçili sınav','Başarı (%)','Sınıf farkı (puan)'],...data.students.map(item=>[item.student.schoolNo || '',fullName(item.student),item.entries.length,data.snapshots.length,item.percent,valueDelta(item.percent,data.percent)])];
      return sheets;
    }

    function downloadAnalysisExcel() {
      if (!window.XLSX) {toast('Excel aracı yüklenemedi.');return;}
      if (!classAnalysis().resultCount) {toast('Dışa aktarılacak geçerli sonuç yok.');return;}
      const workbook=XLSX.utils.book_new();
      for(const [name,rows] of Object.entries(analysisWorkbookRows())) {
        const sheet=XLSX.utils.aoa_to_sheet(rows);
        sheet['!cols']=rows[0].map((_,index)=>({wch:index===0?32:24}));
        XLSX.utils.book_append_sheet(workbook,sheet,name);
      }
      downloadBlob(new Blob([XLSX.write(workbook,{bookType:'xlsx',type:'array'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`${safeFileName(activeClass()?.name || 'sinif')}-sinif-analizi.xlsx`);
    }

    function selectedReportStudentForShare() {
      const type = els.reportType?.value || "academic";
      if (type === "rankingList" || type === "classList") return null;
      const id = type === "studentSummary"
        ? els.summaryStudent.value
        : type === "meetings" && els.meetingReportStudent.value !== "__all__"
          ? els.meetingReportStudent.value
          : els.reportStudent.value;
      return activeStudents().find((item) => item.id === id) || null;
    }

    function preferredParentPhone(student) {
      if (!student) return "";
      const family = student.family || {};
      return normalizeWhatsappPhone(family.motherPhone || family.fatherPhone || family.backupContactPhone || "");
    }

    function normalizeWhatsappPhone(value) {
      let digits = String(value || "").replace(/\D/g, "");
      if (!digits) return "";
      if (digits.startsWith("00")) digits = digits.slice(2);
      if (digits.startsWith("0") && digits.length === 11) digits = `90${digits.slice(1)}`;
      if (digits.length === 10 && digits.startsWith("5")) digits = `90${digits}`;
      return digits;
    }

    function whatsappShareText(student) {
      const reportType = els.reportType?.selectedOptions?.[0]?.textContent || "Karne";
      const name = student ? fullName(student) : activeClass()?.name || "Sınıf";
      return `${name} için ${reportType} hazırlandı.\nBy Kemal Öğretmen · kemalogretmenim.com.tr`;
    }

    function openWhatsapp(phone, text) {
      const encodedText = encodeURIComponent(text);
      const url = phone ? `https://wa.me/${phone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
      window.open(url, "_blank", "noopener");
    }

    async function downloadPdf() {
      if (!window.html2canvas || !window.jspdf) {
        toast("PDF dışa aktarma kütüphanesi yüklenemedi.");
        return;
      }
      try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({orientation: 'p', unit: 'mm', format: 'a4', compress: true});
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        let firstPage = true;
        for (const target of reportExportTargets()) {
          const canvas = await renderReportCanvas(target);
          const scale = Math.min((pageWidth - 16) / canvas.width, (pageHeight - 16) / canvas.height);
          const width = canvas.width * scale;
          if (!firstPage) pdf.addPage();
          firstPage = false;
          pdf.addImage(canvas.toDataURL('image/jpeg', .94), 'JPEG', (pageWidth - width) / 2, 8, width, canvas.height * scale);
        }
        pdf.save(`karne-${safeFileName(selectedReportName())}.pdf`);
      } catch (error) {
        console.error(error);
        toast("PDF kaydedilemedi. Sayfayı yenileyip tekrar deneyin.");
      }
    }

    function reportExportTargets() {
      const classReport = els.reportCard.querySelector('[data-class-analysis]');
      if (classReport) {
        const sections = [];
        classReport.querySelectorAll('.analysis-section').forEach(section => {
          const body = section.querySelector('tbody');
          const charts = section.querySelectorAll('.analysis-chart-scroll');
          const rows = body ? Array.from(body.children) : [];
          const count = Math.max(1, charts.length, Math.ceil(rows.length / 20));
          for (let page = 0; page < count; page++) {
            const copy = section.cloneNode(true);
            if (body) Array.from(copy.querySelector('tbody').children).forEach((row,index)=>{if(index < page*20 || index >= (page+1)*20)row.remove();});
            if (charts.length) copy.querySelectorAll('.analysis-chart-scroll').forEach((chart,index)=>{if(index !== page)chart.remove();});
            sections.push(copy);
          }
        });
        return sections.map((section,index)=>{
          const page=document.createElement('article');
          page.className='report-card class-analysis-report';
          page.innerHTML=classReport.querySelector('.report-header').outerHTML + classReport.querySelector('.analysis-summary-line').outerHTML;
          page.appendChild(section);
          page.insertAdjacentHTML('beforeend',`<p class="analysis-caption">${index+1} / ${sections.length}</p>${reportFooterHtml()}`);
          return page;
        });
      }
      const pages = Array.from(els.reportCard.querySelectorAll('.student-report-page'));
      return pages.length ? pages : [els.reportCard];
    }

    function selectedReportName() {
      const type = els.reportType?.value || "academic";
      if (type === "classAnalysis") return `${activeClass()?.name || 'sinif'}-sinif-analizi`;
      if (type === "classList") return `${activeClass()?.name || "sinif"}-resimli-sinif-listesi`;
      if (type === "rankingList") return `${selectedRankingExam()?.name || "sinav"}-siralamasi`;
      if (type === "meetings") return `${activeClass()?.name || "sinif"}-veli-gorusme-raporu`;
      if (type === "studentSummary") {
        const selected = state.students.find((item) => item.id === els.summaryStudent.value) || activeStudents()[0];
        return `${fullName(selected || {})}-ogrenci-bilgi-ozeti`;
      }
      const student = activeStudents().find((item) => item.id === els.reportStudent.value);
      const reportOwner = els.reportStudent.value === '__all__' ? activeClass()?.name || 'sinif' : fullName(student || {});
      if (type === "comparison") return `${reportOwner}-karsilastirmali-karne`;
      const exam = state.exams.find((item) => item.id === els.reportExam.value);
      return `${reportOwner}-${exam?.name || (els.reportExam.value === '__selected__' ? 'secili-sinavlar' : 'tum-sinavlar')}`;
    }

    function exportBackup() {
      flushFormSaves();
      const snapshot = failedAgendaBackup || buildCloudSnapshot();
      downloadAgendaBackup({
        ...snapshot,
        lessonPlannerState: failedPlannerBackup || snapshot.lessonPlannerState
      }, "yedek");
    }

    async function exportCloudRecovery() {
      const userId = cloudSync.userId;
      const version = document.getElementById("cloudRecoveryVersion")?.value === "cloud" ? "cloud" : "local";
      try {
        if (!userId) { toast("Kurtarma yedekleri için ilgili öğretmen hesabıyla giriş yapın."); return; }
        const record = await accessCloudRecovery(userId);
        if (userId !== cloudSync.userId) return;
        const snapshot = record?.[version];
        if (!snapshot) { toast("Bu sürüm için bu cihazda kurtarma yedeği yok."); return; }
        downloadAgendaBackup(snapshot, version === "cloud" ? "kurtarma-bulut" : "kurtarma-cihaz");
      } catch (error) {
        console.warn(error);
        toast("Kurtarma yedeği açılamadı.");
      }
    }

    function downloadAgendaBackup(snapshot, name) {
      const backup = { ...snapshot.agendaState, lessonPlannerBackup: snapshot.lessonPlannerState };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `kemal-ogretmen-ajandasi-${name}-${today()}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    }

    function readLessonPlannerBackup() {
      try {
        const raw = localStorage.getItem(LESSON_PLANNER_STORE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        console.warn(error);
        return null;
      }
    }

    function restoreLessonPlannerBackup(data) {
      if (!data) return;
      try {
        localStorage.setItem(LESSON_PLANNER_STORE_KEY, JSON.stringify(data));
        failedPlannerBackup = null;
        notifyPlannerRestored(data);
      } catch (error) {
        console.warn(error);
        failedPlannerBackup = data;
        renderCloudSyncStatus();
        toast("Ders planı kaydedilemedi. JSON yedeğini indirin.");
      }
    }

    function notifyPlannerRestored(data) {
      els.lessonPlannerFrame?.contentWindow?.postMessage({
        type: "kemal-ajanda-restore-planner",
        plannerState: data,
        date: isDateKey(state.lessonPlannerFocusDate) ? state.lessonPlannerFocusDate : today()
      }, window.location.origin === 'null' ? '*' : window.location.origin);
    }

    function importBackup() {
      const file = els.backupFile.files?.[0];
      if (!file) {
        toast("Önce yedek dosyasını seçin.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported = JSON.parse(reader.result);
          if (!Array.isArray(imported.classes) || !Array.isArray(imported.students) || !Array.isArray(imported.exams)) {
            throw new Error("Yedek biçimi geçerli değil.");
          }
          const lessonPlannerBackup = imported.lessonPlannerBackup || null;
          delete imported.lessonPlannerBackup;
          const next = normalizeState(imported);
          ensureAgendaClass(next);
          next.updatedAt = new Date().toISOString();
          const entries = [[STORE_KEY, localStorage.getItem(STORE_KEY), JSON.stringify(next)]];
          if (lessonPlannerBackup) entries.push([LESSON_PLANNER_STORE_KEY, localStorage.getItem(LESSON_PLANNER_STORE_KEY), JSON.stringify(lessonPlannerBackup)]);
          persistCloudDownload(entries);
          state = next;
          if (lessonPlannerBackup) notifyPlannerRestored(lessonPlannerBackup);
          ensureInitialClass();
          queueCloudSave();
          renderAll();
          toast("Yedek yüklendi.");
        } catch (error) {
          toast(error?.name === "QuotaExceededError" ? "Yedek bu tarayıcıya sığmadı. Mevcut kayıt korundu." : error.message || "Yedek okunamadı.");
        }
      };
      reader.readAsText(file);
    }

    function clearAllData() {
      if (!confirm("Tarayıcıdaki tüm ajanda verisi silinsin mi? Önce yedek aldığınızdan emin olun.")) return;
      localStorage.removeItem(STORE_KEY);
      state = loadState();
      ensureInitialClass();
      renderAll();
      toast("Yerel veri sıfırlandı.");
    }

    function showView(viewId) {
      flushFormSaves();
      document.body.dataset.agendaView=viewId;
      document.querySelectorAll(".content-view").forEach((view) => view.classList.toggle("active", view.id === viewId));
      document.querySelectorAll(".nav button").forEach((button) => button.classList.toggle("active", button.dataset.view === viewId));
      els.pageTitle.textContent = pageMeta[viewId]?.[0] || "";
      els.pageSubtitle.textContent = pageMeta[viewId]?.[1] || "";
      if (viewId === "reportsView") buildReport();
      if (viewId === "scheduleView") {
        renderLessonPlannerFocus();
        syncLessonPlannerFrame();
      }
    }

    function deleteNote(studentId, noteId) {
      const student = state.students.find((item) => item.id === studentId);
      if (!student) return;
      const previous = student.notes;
      student.notes = (student.notes || []).filter((item) => item.id !== noteId);
      if (!saveState()) { student.notes = previous; return; }
      if (studentEntryIds.notes === noteId) {
        studentEntryIds.notes = null; els.noteText.value = ""; clearFormSave("note");
      }
      renderStudentNotes(student);
      renderDashboard();
      renderReportSelectors();
    }

    function deleteMeeting(studentId, meetingId) {
      const student = state.students.find((item) => item.id === studentId);
      if (!student) return;
      const previous = student.meetings;
      student.meetings = (student.meetings || []).filter((item) => item.id !== meetingId);
      if (!saveState()) { student.meetings = previous; return; }
      if (studentEntryIds.meetings === meetingId) {
        studentEntryIds.meetings = null; els.meetingText.value = ""; clearFormSave("meeting");
      }
      renderStudentMeetings(student);
      renderDashboard();
      renderReportSelectors();
    }

    function fullName(student) {
      return `${student.firstName || ""} ${student.lastName || ""}`.replace(/\s+/g, " ").trim() || "İsimsiz Öğrenci";
    }

    function cleanName(value) {
      return cleanCell(value).replace(/\s+/g, " ").trim();
    }

    function cleanClassName(value) {
      return cleanName(value);
    }

    function cleanCell(value) {
      return value === null || value === undefined ? "" : String(value).trim();
    }

    function toNumberOrNull(value) {
      if (value === null || value === undefined || value === "") return null;
      if (typeof value === "number" && Number.isFinite(value)) return value;
      const number = Number(String(value).replace(",", "."));
      return Number.isFinite(number) ? number : null;
    }

    function isD(value) { return normalize(value) === "D" || normalize(value).includes("DOGRU"); }
    function isY(value) { return normalize(value) === "Y" || normalize(value).includes("YANLIS"); }
    function isB(value) { return normalize(value) === "B" || normalize(value).includes("BOS"); }
    function isPercent(value) {
      const label = normalize(value);
      return label === "%" || label.includes("YUZDE") || label.includes("BASARI");
    }
    function isTotalLabel(value) { return normalize(value).includes("TOPLAM"); }
    function isIdentityLabel(value) {
      const label = normalize(value);
      return label.includes("OKUL") || label.includes("NUMARA") || label.includes("AD") || label.includes("SOYAD") || label.includes("OGRENCI");
    }

    function normalize(value) {
      return cleanCell(value)
        .toLocaleUpperCase("tr-TR")
        .replaceAll("İ", "I")
        .replaceAll("İ", "I")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Z0-9%]+/g, " ")
        .trim();
    }

    function formatDate(value) {
      if (!value) return "Tarih yok";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "Geçersiz tarih";
      return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
    }

    function formatPercent(value) {
      return isFiniteNumber(value) ? `%${value.toFixed(1).replace(".", ",")}` : "-";
    }

    function formatNumber(value) {
      if (!isFiniteNumber(value)) return "-";
      const rounded = Math.round(value * 10) / 10;
      const digits = Number.isInteger(rounded) ? 0 : 1;
      return rounded.toFixed(digits).replace(".", ",");
    }

    function formatNet(value) {
      return isFiniteNumber(value) ? value.toLocaleString('tr-TR', {maximumFractionDigits: 2}) : '-';
    }

    function formatPointInputNumber(value) {
      if (!isFiniteNumber(value)) return "";
      const rounded = Math.round(value * 10) / 10;
      const digits = Number.isInteger(rounded) ? 0 : 1;
      return rounded.toFixed(digits);
    }

    function formatScore(value, maxScore = 100) {
      if (!isFiniteNumber(value)) return "-";
      if (!isFiniteNumber(maxScore) || Math.abs(maxScore - 100) < 0.001) return formatPercent(value);
      return `${formatNumber(value)} / ${formatNumber(maxScore)}`;
    }

    function average(values) {
      const nums = values.filter(isFiniteNumber);
      return nums.length ? nums.reduce((sum, item) => sum + item, 0) / nums.length : null;
    }

    function isFiniteNumber(value) {
      return typeof value === "number" && Number.isFinite(value);
    }

    function safeFileName(value) {
      return normalize(value || "karne").toLocaleLowerCase("tr-TR").replace(/\s+/g, "-") || "karne";
    }

    function cssEscape(value) {
      if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
      return String(value).replace(/["\\]/g, "\\$&");
    }

    function safeImageSource(value) {
      if (typeof value !== "string") return "";
      if (/^data:image\/(?:png|jpeg|jpg|gif|webp);base64,[a-zA-Z0-9+/=\s]+$/.test(value)) return value;
      try {
        const url = new URL(value);
        if (url.protocol === "https:" && !url.username && !url.password) return url.href;
      } catch { /* Untrusted imported image fields stay inert. */ }
      return "";
    }

    function escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function toast(message) {
      const box = els.toast || document.getElementById("toast");
      box.textContent = message;
      box.classList.add("show");
      clearTimeout(box._timer);
      box._timer = setTimeout(() => box.classList.remove("show"), 2800);
    }
