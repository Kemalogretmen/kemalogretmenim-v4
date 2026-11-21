const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const origin = process.env.AGENDA_ORIGIN || 'http://127.0.0.1:8776';
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'agenda-desk-'));

(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, timezoneId: 'Europe/Istanbul' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('dialog', dialog => dialog.accept());
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) return route.abort();
        if (/\/js\/(site|site-data|user-auth)\.js/.test(url.pathname)) return route.fulfill({ body: '', contentType: 'application/javascript' });
        return route.continue();
      });
      await page.clock.setFixedTime(new Date('2026-11-10T08:30:00+03:00'));
      await page.addInitScript(() => {
        if (localStorage.getItem('kemalOgretmenAjandasi.v1')) return;
        localStorage.setItem('kemalOgretmenAjandasi.v1', JSON.stringify({
          teacher: { name: 'Deniz Öğretmen' },
          classes: [{ id: 'a', name: '2-A', year: '2026-2027' }, { id: 'b', name: '3-B' }], activeClassId: 'a', exams: [],
          students: [
            { id: 'a1', firstName: 'Ada', lastName: 'Kaya', schoolNo: '21', classId: 'a' },
            { id: 'a2', firstName: 'Ege', lastName: 'Deniz', schoolNo: '2', classId: 'a' },
            { id: 'b1', firstName: 'Başka', lastName: 'Sınıf', classId: 'b' }
          ],
          teacherTasks: [{ id: 'old', classId: 'a', title: 'Okuma föylerini hazırla', type: 'prep', due: '2026-11-09', done: false }],
          calendarEvents: [{ id: 'event', classId: 'a', title: 'Veli görüşmesi', date: '2026-11-10', time: '13:30', type: 'meeting' },
            { id: 'next', classId: 'a', title: 'Sınıf kitaplığı', date: '2026-11-12', time: '10:00', type: 'note' }]
        }));
      });
      const dashboard = page.locator('#dashboardView');
      const tracking = page.locator('#trackingView');
      const day = page.locator('#attendanceDate');
      const readState = () => page.evaluate(() => JSON.parse(localStorage.getItem('kemalOgretmenAjandasi.v1')));
      const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.goto(origin + '/ogretmen-ajandasi/');
      assert.equal(await page.locator('#dashboardWeek button').count(), 7);
      assert.match(await dashboard.locator('#dashboardTasks').textContent(), /Gecikti.*09/);
      assert.match(await dashboard.locator('#dashboardTodayAgenda').textContent(), /Veli görüşmesi/);
      assert.match(await dashboard.locator('#dashboardUpcoming').textContent(), /Sınıf kitaplığı/);
      await noOverflow();
      await page.screenshot({ path: path.join(folder, `today-${width}.png`) });
      await page.locator('[data-agenda-date="2026-11-12"]').click();
      assert.match(await page.locator('#selectedDayEvents').textContent(), /Sınıf kitaplığı/);
      await page.locator('.nav [data-view="dashboardView"]').click();
      await dashboard.locator('[data-open-task]').click();
      await page.locator('#agendaTaskTitle').fill('Matematik ödevini hazırla');
      await page.locator('#agendaTaskType').selectOption('homework');
      await page.locator('#agendaTaskDue').fill('2026-11-10');
      await page.locator('#agendaTaskNote').fill('Kesirler çalışma sayfası');
      await page.locator('#agendaTaskSubmit').click();
      const newTask = (await readState()).teacherTasks.find(task => task.type === 'homework');
      assert.equal(newTask.classId, 'a');
      await dashboard.getByRole('checkbox', { name: /Matematik ödevini/ }).click();
      assert.equal((await readState()).teacherTasks.find(task => task.id === newTask.id).done, true);
      await dashboard.locator('[data-open-tracking="tasks"]').click();
      await tracking.locator('#agendaTaskFilter').selectOption('done');
      await tracking.locator(`[data-edit-task="${newTask.id}"]`).click();
      await page.locator('#agendaTaskTitle').fill('Kesirler ödevi');
      await page.locator('#agendaTaskSubmit').click();
      assert.match(await tracking.locator('#agendaTaskList').textContent(), /Kesirler ödevi/);
      await tracking.getByRole('checkbox', { name: /Kesirler ödevi/ }).click();
      await tracking.locator('#agendaTaskFilter').selectOption('open');
      assert.match(await tracking.locator('#agendaTaskList').textContent(), /Kesirler ödevi/);

      await tracking.locator('[data-tracking-tab="attendance"]').click();
      const attendanceIds = () => page.locator('#attendanceList select').evaluateAll(selects => selects.map(select => select.dataset.attendanceStudent));
      assert.equal(await page.locator('#attendanceList').getAttribute('data-layout'), 'photos');
      assert.equal(await page.locator('#attendanceList .agenda-attendance-avatar').count(), 2);
      assert.deepEqual(await attendanceIds(), ['a2', 'a1']);
      await page.locator('#attendanceSort').selectOption('name');
      assert.deepEqual(await attendanceIds(), ['a1', 'a2']);
      for (const layout of ['cards', 'list', 'photos']) {
        await page.locator(`button[data-attendance-layout="${layout}"]`).click();
        assert.equal(await page.locator('#attendanceList').getAttribute('data-layout'), layout);
        assert.equal(await page.locator('#attendanceList .agenda-attendance-avatar').count(), layout === 'photos' ? 2 : 0);
        await noOverflow();
      }
      assert.equal(await page.locator('#attendanceSave').isDisabled(), true);
      await page.locator('[data-attendance-student="a1"]').selectOption('late');
      await page.locator('#attendanceMarkAll').click();
      assert.equal(await page.locator('[data-attendance-student="a1"]').inputValue(), 'late');
      assert.equal(await page.locator('[data-attendance-student="a2"]').inputValue(), 'present');
      assert.match(await page.locator('#attendanceSummary').textContent(), /1 Geç/);
      await page.locator('#attendanceBulkStatus').selectOption('sick');
      assert.equal(await page.locator('#attendanceMarkAll').isDisabled(), true, 'Default scope preserves marked students');
      await page.locator('#attendanceBulkScope').selectOption('all');
      await page.locator('#attendanceMarkAll').click();
      assert.match(await page.locator('#attendanceSummary').textContent(), /2 Hasta/);
      await page.locator('[data-attendance-student="a1"]').selectOption('late');
      assert.match(await page.locator('#attendanceSummary').textContent(), /1 Hasta/);
      await page.locator('#attendanceSave').click();
      assert.match(await page.locator('#attendanceSaveStatus').textContent(), /Cihaza kaydedildi/);
      assert.ok((await readState()).attendanceRecords.find(row => row.date === '2026-11-10').confirmedAt);
      await page.locator('[data-attendance-student="a2"]').selectOption('absent');
      assert.equal(await page.locator('#attendanceSaveStatus').getAttribute('data-confirmed'), 'false');
      await page.locator('[data-attendance-student="a2"]').selectOption('sick');
      await page.locator('#attendanceSave').click();
      await day.fill('2026-11-09');
      assert.equal(await page.locator('[data-attendance-student="a1"]').inputValue(), '');
      assert.equal(await page.locator('#attendanceSave').isDisabled(), true);
      await page.locator('[data-attendance-student="a1"]').selectOption('excused');
      await page.locator('#attendanceToday').click();
      assert.equal(await page.locator('[data-attendance-student="a1"]').inputValue(), 'late');
      await page.locator('#activeClassSelect').selectOption('b');
      assert.equal(await page.locator('[data-attendance-student="a1"]').count(), 0);
      assert.equal(await page.locator('[data-attendance-student="b1"]').inputValue(), '');
      await tracking.locator('[data-tracking-tab="tasks"]').click();
      assert.doesNotMatch(await tracking.locator('#agendaTaskList').textContent(), /Kesirler|föylerini/);
      await page.locator('#activeClassSelect').selectOption('a');

      await page.reload();
      assert.match(await dashboard.locator('#dashboardAttendance').textContent(), /Yoklama kaydedildi/);
      await dashboard.locator('[data-open-tracking="attendance"]').click();
      assert.equal(await page.locator('[data-attendance-student="a1"]').inputValue(), 'late');
      assert.equal(await page.locator('#attendanceSort').inputValue(), 'name');
      assert.equal(await page.locator('#attendanceSaveStatus').getAttribute('data-confirmed'), 'true');
      const excelEvent = page.waitForEvent('download');
      await page.locator('#attendanceExport').click();
      const excelPath = path.join(folder, `attendance-${width}.xlsx`);
      await (await excelEvent).saveAs(excelPath);
      const rows = await page.evaluate(bytes => {
        const workbook = XLSX.read(new Uint8Array(bytes), { type: 'array' });
        return XLSX.utils.sheet_to_json(workbook.Sheets.Yoklama, { header: 1 });
      }, [...fs.readFileSync(excelPath)]);
      assert.deepEqual(rows.slice(2), [['21', 'Ada Kaya', 'Geç'], ['2', 'Ege Deniz', 'Hasta']]);

      await page.locator('[data-theme-switch]').click();
      await page.locator('html[data-theme="dark"]:not(.theme-changing)').waitFor();
      await noOverflow();
      await page.screenshot({ path: path.join(folder, `attendance-dark-${width}.png`) });
      await page.evaluate(() => {
        const header = document.createElement('div');
        header.id = 'kemalNavMount';
        header.style.cssText = 'height:109px;position:sticky;top:0;z-index:1100;background:#fff';
        document.body.prepend(header);
        setCloudSyncError('Cihazdaki kayıt korunuyor. Yedek alın ve son bulut kaydını kontrol edin.');
      });
      const headerOrder = () => page.evaluate(() => {
        const rect = selector => document.querySelector(selector).getBoundingClientRect();
        return [rect('.topbar').bottom, rect('.main > .agenda-save-warning').top, rect('.main > .agenda-save-warning').bottom, rect('.content-view.active').top];
      });
      for (const view of ['trackingView', 'calendarView', 'scheduleView']) {
        await page.locator(`.nav [data-view="${view}"]`).click();
        const [headerBottom, warningTop, warningBottom, viewTop] = await headerOrder();
        assert.ok(headerBottom <= warningTop && warningBottom <= viewTop, `${view}: heading, warning and content do not overlap`);
      }
      await page.screenshot({ path: path.join(folder, `warning-${width}.png`) });
      await page.evaluate(() => { document.getElementById('kemalNavMount').remove(); setCloudSyncStatus('local', 'Yerel mod', ''); });
      await page.locator('.nav [data-view="backupView"]').click();
      const backupEvent = page.waitForEvent('download');
      await page.locator('#exportBackupBtn').click();
      const backupPath = path.join(folder, `backup-${width}.json`);
      await (await backupEvent).saveAs(backupPath);
      const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      assert.equal(backup.attendanceRecords.length, 2);
      assert.equal(backup.teacherTasks.length, 2);
      await page.locator('.nav [data-view="trackingView"]').click();
      await tracking.locator('[data-tracking-tab="tasks"]').click();
      await tracking.locator(`[data-edit-task="${newTask.id}"]`).click();
      await page.locator('#agendaTaskDelete').click();
      assert.equal((await readState()).teacherTasks.length, 1);
      await page.locator('.nav [data-view="backupView"]').click();
      await page.locator('#backupFile').setInputFiles(backupPath);
      await page.locator('#importBackupBtn').click();
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('kemalOgretmenAjandasi.v1')).teacherTasks.length === 2);
      assert.equal((await readState()).attendanceRecords.length, 2);
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}: today, calendar, task lifecycle, class/date isolation, reload, Excel and backup restoration`);
      await page.close();
    }
  } finally { await browser.close(); }
  console.log('Evidence: ' + folder);
})().catch(error => { console.error(error); process.exitCode = 1; });
