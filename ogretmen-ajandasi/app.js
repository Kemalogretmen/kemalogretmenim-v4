    const STORE_KEY = "kemalOgretmenAjandasi.v1";
    const LESSON_PLANNER_STORE_KEY = "ogretmen_plan_v2";
    const CLOUD_SYNC_TABLE = "teacher_agenda_states";
    const CLOUD_SYNC_MAX_BYTES = 6 * 1024 * 1024;
    const CLOUD_SYNC_DEBOUNCE_MS = 2200;
    const SYSTEM_LOGO_SRC = "assets/kemal-kocar-logo-2025.png";
    const SYSTEM_LOGO_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAKMGlDQ1BJQ0MgUHJvZmlsZQAAeJydlndUVNcWh8+9d3qhzTAUKUPvvQ0gvTep0kRhmBlgKAMOMzSxIaICEUVEBBVBgiIGjIYisSKKhYBgwR6QIKDEYBRRUXkzslZ05eW9l5ffH2d9a5+99z1n733WugCQvP25vHRYCoA0noAf4uVKj4yKpmP7AQzwAAPMAGCyMjMCQj3DgEg+Hm70TJET+CIIgDd3xCsAN428g+h08P9JmpXBF4jSBInYgs3JZIm4UMSp2YIMsX1GxNT4FDHDKDHzRQcUsbyYExfZ8LPPIjuLmZ3GY4tYfOYMdhpbzD0i3pol5IgY8RdxURaXky3iWyLWTBWmcUX8VhybxmFmAoAiie0CDitJxKYiJvHDQtxEvBQAHCnxK47/igWcHIH4Um7pGbl8bmKSgK7L0qOb2doy6N6c7FSOQGAUxGSlMPlsult6WgaTlwvA4p0/S0ZcW7qoyNZmttbWRubGZl8V6r9u/k2Je7tIr4I/9wyi9X2x/ZVfej0AjFlRbXZ8scXvBaBjMwDy97/YNA8CICnqW/vAV/ehieclSSDIsDMxyc7ONuZyWMbigv6h/+nwN/TV94zF6f4oD92dk8AUpgro4rqx0lPThXx6ZgaTxaEb/XmI/3HgX5/DMISTwOFzeKKIcNGUcXmJonbz2FwBN51H5/L+UxP/YdiftDjXIlEaPgFqrDGQGqAC5Nc+gKIQARJzQLQD/dE3f3w4EL+8CNWJxbn/LOjfs8Jl4iWTm/g5zi0kjM4S8rMW98TPEqABAUgCKlAAKkAD6AIjYA5sgD1wBh7AFwSCMBAFVgEWSAJpgA+yQT7YCIpACdgBdoNqUAsaQBNoASdABzgNLoDL4Dq4AW6DB2AEjIPnYAa8AfMQBGEhMkSBFCBVSAsygMwhBuQIeUD+UAgUBcVBiRAPEkL50CaoBCqHqqE6qAn6HjoFXYCuQoPQPWgUmoJ+h97DCEyCqbAyrA2bwAzYBfaDw+CVcCK8Gs6DC+HtcBVcDx+D2+EL8HX4NjwCP4dnEYAQERqihhghDMQNCUSikQSEj6xDipFKpB5pQbqQXuQmMoJMI+9QGBQFRUcZoexR3qjlKBZqNWodqhRVjTqCakf1oG6iRlEzqE9oMloJbYC2Q/ugI9GJ6Gx0EboS3YhuQ19C30aPo99gMBgaRgdjg/HGRGGSMWswpZj9mFbMecwgZgwzi8ViFbAGWAdsIJaJFWCLsHuxx7DnsEPYcexbHBGnijPHeeKicTxcAa4SdxR3FjeEm8DN46XwWng7fCCejc/Fl+Eb8F34Afw4fp4gTdAhOBDCCMmEjYQqQgvhEuEh4RWRSFQn2hKDiVziBmIV8TjxCnGU+I4kQ9InuZFiSELSdtJh0nnSPdIrMpmsTXYmR5MF5O3kJvJF8mPyWwmKhLGEjwRbYr1EjUS7xJDEC0m8pJaki+QqyTzJSsmTkgOS01J4KW0pNymm1DqpGqlTUsNSs9IUaTPpQOk06VLpo9JXpSdlsDLaMh4ybJlCmUMyF2XGKAhFg+JGYVE2URoolyjjVAxVh+pDTaaWUL+j9lNnZGVkLWXDZXNka2TPyI7QEJo2zYeWSiujnaDdob2XU5ZzkePIbZNrkRuSm5NfIu8sz5Evlm+Vvy3/XoGu4KGQorBToUPhkSJKUV8xWDFb8YDiJcXpJdQl9ktYS4qXnFhyXwlW0lcKUVqjdEipT2lWWUXZSzlDea/yReVpFZqKs0qySoXKWZUpVYqqoypXtUL1nOozuizdhZ5Kr6L30GfUlNS81YRqdWr9avPqOurL1QvUW9UfaRA0GBoJGhUa3RozmqqaAZr5ms2a97XwWgytJK09Wr1ac9o62hHaW7Q7tCd15HV8dPJ0mnUe6pJ1nXRX69br3tLD6DH0UvT2693Qh/Wt9JP0a/QHDGADawOuwX6DQUO0oa0hz7DecNiIZORilGXUbDRqTDP2Ny4w7jB+YaJpEm2y06TX5JOplWmqaYPpAzMZM1+zArMus9/N9c1Z5jXmtyzIFp4W6y06LV5aGlhyLA9Y3rWiWAVYbbHqtvpobWPNt26xnrLRtImz2WczzKAyghiljCu2aFtX2/W2p23f2VnbCexO2P1mb2SfYn/UfnKpzlLO0oalYw7qDkyHOocRR7pjnONBxxEnNSemU73TE2cNZ7Zzo/OEi55Lsssxlxeupq581zbXOTc7t7Vu590Rdy/3Yvd+DxmP5R7VHo891T0TPZs9Z7ysvNZ4nfdGe/t57/Qe9lH2Yfk0+cz42viu9e3xI/mF+lX7PfHX9+f7dwXAAb4BuwIeLtNaxlvWEQgCfQJ3BT4K0glaHfRjMCY4KLgm+GmIWUh+SG8oJTQ29GjomzDXsLKwB8t1lwuXd4dLhseEN4XPRbhHlEeMRJpEro28HqUYxY3qjMZGh0c3Rs+u8Fixe8V4jFVMUcydlTorc1ZeXaW4KnXVmVjJWGbsyTh0XETc0bgPzEBmPXM23id+X/wMy421h/Wc7cyuYE9xHDjlnIkEh4TyhMlEh8RdiVNJTkmVSdNcN24192Wyd3Jt8lxKYMrhlIXUiNTWNFxaXNopngwvhdeTrpKekz6YYZBRlDGy2m717tUzfD9+YyaUuTKzU0AV/Uz1CXWFm4WjWY5ZNVlvs8OzT+ZI5/By+nL1c7flTuR55n27BrWGtaY7Xy1/Y/7oWpe1deugdfHrutdrrC9cP77Ba8ORjYSNKRt/KjAtKC94vSliU1ehcuGGwrHNXpubiySK+EXDW+y31G5FbeVu7d9msW3vtk/F7OJrJaYllSUfSlml174x+6bqm4XtCdv7y6zLDuzA7ODtuLPTaeeRcunyvPKxXQG72ivoFcUVr3fH7r5aaVlZu4ewR7hnpMq/qnOv5t4dez9UJ1XfrnGtad2ntG/bvrn97P1DB5wPtNQq15bUvj/IPXi3zquuvV67vvIQ5lDWoacN4Q293zK+bWpUbCxp/HiYd3jkSMiRniabpqajSkfLmuFmYfPUsZhjN75z/66zxailrpXWWnIcHBcef/Z93Pd3Tvid6D7JONnyg9YP+9oobcXtUHtu+0xHUsdIZ1Tn4CnfU91d9l1tPxr/ePi02umaM7Jnys4SzhaeXTiXd272fMb56QuJF8a6Y7sfXIy8eKsnuKf/kt+lK5c9L1/sdek9d8XhyumrdldPXWNc67hufb29z6qv7Sern9r6rfvbB2wGOm/Y3ugaXDp4dshp6MJN95uXb/ncun572e3BO8vv3B2OGR65y747eS/13sv7WffnH2x4iH5Y/EjqUeVjpcf1P+v93DpiPXJm1H2070nokwdjrLHnv2T+8mG88Cn5aeWE6kTTpPnk6SnPqRvPVjwbf57xfH666FfpX/e90H3xw2/Ov/XNRM6Mv+S/XPi99JXCq8OvLV93zwbNPn6T9mZ+rvitwtsj7xjvet9HvJ+Yz/6A/VD1Ue9j1ye/Tw8X0hYW/gUDmPP8uaxzGQAAGKtJREFUeNrVe3mUVdWV9++cc99Y9WouoIACFJAWjAJi2w6drhKHRo1GO1U4xCFxIAZFBWSlg1pF+7nSRpdGje0QOw5pMRa90mKMs1QhxjRh0hJBpECQYqjxDfe9O55z9vfHew+qoJikNN9317rrPYq7zn37t/f+7X323gf4Zi/W1NQkmpubDSIyiIgJIcAY6/8QY+Ccg4gYEYnm5majqalJAGD4//BiTU1NgojE/oLmriCAMgAjSktLR0UikZEAKgCEB3qYiHhDQ4PxTYExaIs2NDTwmpoaPn36dKm1zv+5+Kabbpo8efLk04ZVVU0pKy0bG4lGh4VD4WJhGGHOmdCatFLSdV3XtC27I5lKbN3T0dG6vrV11eOPP74WQGcfMERjYyMtWrRI/z+lcSISff5dfPfdd1+xdOlrTevWfbxrT0cnaep/aSKSisiXmqQiUvs/QEQ9vQlq/XR975tvvvXGAw88cDOAqr5ANDQ08L+55E1NTXvNvLq6euxvf/vbB1avWbvDTFt7BbFsV6cztp8yM34ylZbJVFolU2k9wK0SSVMlU2lppi3fsl2VB8Z1fWr99LOel19+5TcXXHDB1L5A/K14ghNRXgNV//ncc7/asGGjmRc6YzkymUrLRNLUKTNDZto66jtlZigHjExnbJkHo23LVtnUtOSlKVOmnAgAQgh8q9bQV+s/v6fhJ6vWrOsgInJ9TYlUxu9NmDqRylAilaFk6uiFT6XSZCZNSqfSlE6lyUyZZCZNSsaTOpVI+a7tEhHRxs82ZB576OFFAEI5DjK+ceGbm5vzLxn53rtv/4lIEhGR8mxfOpbWvkPad0h5NhFJ8jxJyaOxgFSabF9RmoiSOncTUSp3m7nPJJGUOS5ZsWbt6ssuvnhqziWMbywKNDc3G7W1tfJfZs6c3Jhw4YtJzxj++H8tk0nHFYZh9FuHNGFYSRi3XVWDSRPGwbJdcH7oV5FSMAoKsPuz9Ui+ugQs3gsIDggDEKLfzYQBxRgFlFT6xJOM5Oix9gd/+uMt9zQ2vpALvxoAHYlcR4QYERmMMXnrrbdff+fcO55N2Uqc/eNHJFBgQLADX8UZ4PhY9skOfPjMbJSWVUBKHwfJC0BKIVgQxc7NmxCfdQ0quvaAhUL7VET5V2S/EBGIiHGCEbdt1Tbzusi1dy18vqi4+DjGWOPRgGAcieYZY/JnP/v5nNvmzHl0eNVQmv/LFzUQNUJlUUipBmbJWBhf7kxh1fqtuPT8KiRND2IAAIgIgYCBeMZCzz0LUGUmoIcPB4jAOM/ZKNtnqlnhAa0hNWGM74nX/rqSMq6rZt96W4MiVsoYuz2nNHU4EIwjMfv58xfcNHfunY8Wl5QprSUXwuCMEZTSUHrg9QkajAMy//900HACNxzGV43zMGT9WuiKSjDSYEKAcQaw3J3XvgaYJkgAJaTwJgui8vqb2PFDKoUnlX/rrbPnKCKPMXZX3nK/FgBNTU2itrZWXnPNjy6efevsZ8rLK1RvIsUrymIsp4gjcJ3DkIxSYEWF2PKbp1G69BUYFRUgACxggAuRdSXG8l6QXVBpKACFRNjgEjbNuBQLrv4hlJTMlzIgIhH/llk3z08m47sYY4/klXjQeH6wtPbKK69UkydPHn/n3NtfGjN6FJnpNDMMMWhJBymFQFEhvmxuRujxXyJaWgrNGLghwA0BZnAwQ4AJAQiecwcGYgxBAHHPx59OOg033Ho7DNKQSkEIAdu2jXAkKm+84caHr7766vPPOeccmdtYHTEArLGxkSmlAv/2f+5/ecrkU4qSqbQWQvDBE14jGI1g15at8BoWoCRgQBkGeF+heXbXmPUAts+kiCB8Hy9XVuOSuXdhZHkZbNcD59mfJ4Rg6XSajx5VTbNnz3kxGo0Orauro4MlS3yg3RdjTD3w4IP3XHzRhaemM7YUQohBEz5PepaN7p/PRWWiByp6CNLrl+ll/X4pQqi6cTbOOe1UJM00joaThRDcdjx96tRTx82eM+cixhg1NDSIfgA0NjZyAKi/4orrjj9utPB8Xw2W9gUAn3F8dd89GPLpGlBJjvQMcRDSy/q91BoxpbDSVei4pB5XX3YZzHQGXycgSSmpKFZA59ZOvyEnL/UFgAFQAAITT5x4edZi9eDEfKWBWDG2L34Bpa81QZRXACxPegP4fc5dlNIIKY1220XLtH/ETTfPgvK8r138ISIhlWbjxo+vra6uHs45V3nl87q6Os4Yo0suuWTq2LHjxjquT4yxYwaAtAaiUexu/RjiqV8hWlwCzbDX7A8kvazfa63BtIZ0XDSNGIcr75yP0oIoPCm/Nidxzpnr+WrcuHHRa6+99jwi2ltF4j/96U8ZAJx77vnTh1cNg5RyUMyfEQGhEJy3X0dR2oQKhcA5zwo/EOnl/F5rQtRz8VK4GKfPmYfvHD8G6Ww4PjYeVorCoQBOnjz5vL5uwGtqaggARo8ZcxZjgNZ6UJyfkPXloYkekBBZRfN8Ts/3y/Tyfk8o9D28gyjKb5qNi/7xbKRSaQxGIpqvYQ4fPmIaAGEYhgLAeO5LoHJI5cTB7hUgC2hOTpZdmQ2wZSQNpTVCvosdIop7x9SjsPw4MGjIAoG7duvXgx93D//SJ1wHoIy1nNTU18HwUqb6+/rvvvve+EyrKzvc2SBX1RWtVLjc3N9u7+S1ScMYYw/fy//fhhx9mSCrZt8l0rRZrk+1KZTDjm9hclUyldQ9FTkoqcp1JHl2r0rNSomlaSMrMeg7fIaKQnl27KF7IuDJ+5Eokbdq48XG5HkSPwU0ZfujQIfz73/9GZ2cnJk2aBLfbjR07duDjjz/GzTffjJCQEGzdupXhw4dj9erVCAgIQFVVFfbv349ly5YhJSUFa9asweHDhwFg5MiR8PLywh//+EeMGjUKZ86cgUqlQps2bTBhwgSMHz8e0dHR2Lp1K1auXIkjR45g+fLlWL58OY4dO4axY8fi9OnTePbZZ3HkyBE8/PDDmDBhAm655RYMGDAA1dXVWLJkCfbs2YMyMjIwZMgQHD16FLt27cL06dMxY8YM3L59G9u3b8eECRPw9fUFgAEDBqCwsBCbN2/Gpk2b8N133+Hq1at49NFH8frrr+O5557D3Llz8eSTT2L06NGYPHkyVq9ejZUrV2L58uVYs2YNBg0ahAULFqB///74+OOP8dlnn2HAgAFYt24dpk2bhhdeeAHHjx/HokWL8PTpUzz55JOYMGECJk+ejC1btqB58+Y4fvw4unTpgu7du6O0tBQzZsxAZmYmBg8ejMTERKxcuRKrVq3CjBkz8Nlnn+HLL7/Eo48+ij179mD+/PkYMWIEunTpguHDh+PJJ5/EokWL8Pnnn+PSpUv4+OOP8fzzz+P555/HhAkTcOedd+Lw4cPYtm0bNmzYgK5du+L999/H+vXr8eyzz+L777/HqFGj8Nprr2Hq1KlYuHAhpk+fjgULFuD8+fPYtWsXHn/8cQwZMgTbtm3Drl278Oabb2LRokUYP348nnjiCZw9exYHDx7EsmXL8Pjjj2P8+PGYOXMmFixYgOXLl+PQoUM4fvw4Jk2ahIULF+LDDz/EqFGj8NBDD2H69Ol48skn8cILL+CKK67A4sWL8frrr+Pll1/GkSNH8Oijj+Lw4cPYvXs3Nm7ciKFDh+L555/HsGHD8OCDD+LQoUMYMWIEBg8ejODgYHz77bfYuHEjHn/8cWzatAkjR47EkiVL8Nprr2Hw4MF4+OGH8eyzz2L27NmYOHEiVq1ahf379+P111/Hrl27MHnyZLz88stYu3YtBg8ejK5du+L999/H4cOH8e677+LXX3/FmDFj8OCDD+LQoUMYMWIEtm/fjv379+P555/Hxo0b8fjjj+PQoUP4+uuv8eSTT+Lw4cPYu3cvrrjiCixatAjPPvss3n33XQwYMAA///wzbr31VowZMwYbN27E4sWL8eSTT+LkyZPYuHEjHn/8cSxatAiLFy/Gs88+i8TERHzzzTfYuHEjRo0ahU2bNuH48eOYOHEiBg8ejB49emD+/PkoKChAly5d8NRTT+H555/HsGHD8OCDD2LlypUYP348hg0bht69e+P999/H3Llz8cgjj+D111/HmTNn8OCDD+Lll1/G8uXL8fzzz+PQoUP44osv8OCDD2L27NmYPXs2Bg8ejL179+L999/H+vXr8eSTT2LlypWYPXs2Bg8ejL179+L999/H+vXr8eSTT2LlypWYPXs2Bg8ejL179+L999/H+vXr8eSTT2LlypWYPXs2Bg8ejL179+L999/H+vXr8eSTT2LlypWYPXs2Bg8ejL179+L999/H+vXr8eSTT2LlypWYPXs2Bg8ejL179+L999/H+vXr8eSTT2LlypWYPXs2Bg8ejL179+L999/H+vXr8eSTT2LlypWYPXs2Bg8ejL179+L999/H+vXr8eSTT2LlypWYPXs2Bg8ejL179+L999/H+vXr8eSTT2LlypWYPXs2Bg8ejL179+L999/H+vXr8eSTT2LlypWYODf5f8BUkRqbtB0q6MAAAAASUVORK5CYII=";
    const today = () => new Date().toISOString().slice(0, 10);
    const uid = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    const pageMeta = {
      dashboardView: ["Panel", "Sınıfınızı, öğrencilerinizi ve deneme analizlerinizi tek yerden izleyin."],
      studentsView: ["Öğrenciler", "Öğrenci profilleri, veli bilgileri, sağlık durumu ve özel notlar."],
      examsView: ["Sınavlar", "Excel dosyalarından deneme, test ve sınav sonuçlarını içe aktarın."],
      scheduleView: ["Ders Programı", "Ders programı ve haftalık planlama sisteminizi ajanda içinde kullanın."],
      calendarView: ["Akademik Takvim", "Doğum günleri, MEB takvimi, önemli günler ve hatırlatıcılarla günlük planlama yapın."],
      reportsView: ["Karneler", "Öğrenciye özel akademik karneleri PDF, PNG veya JPEG olarak kaydedin."],
      backupView: ["Yedek", "Tüm ajanda verinizi güvenle dışa aktarın veya geri yükleyin."]
    };

    let state = loadState();
    let editingStudentId = null;
    let pendingImport = null;
    let studentPhotoProcessing = false;
    let teacherPhotoProcessing = false;
    let cropState = null;
    let calendarCursor = new Date();
    let selectedCalendarDate = today();
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
      applyingRemote: false,
      lastSavedAt: "",
      lastLoadedAt: "",
      lastError: ""
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
      [
        "activeClassSelect", "pageTitle", "pageSubtitle", "statsGrid", "teacherName", "schoolName",
        "className", "classYear", "newClassName", "saveSettingsBtn", "addClassBtn", "deleteClassBtn",
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
        "studentAcademic", "examName", "examDate", "excelFile", "importExamBtn", "importSummary",
        "examList", "reportStudent", "reportExam", "subjectPicker", "refreshReportBtn", "reportCard",
        "downloadPdfBtn", "downloadPngBtn", "downloadJpegBtn", "shareWhatsappBtn", "exportBackupBtn", "backupFile",
        "importBackupBtn", "clearAllBtn", "recentAcademic", "quickAddClassBtn", "importReviewDialog",
        "importReviewBody", "closeImportReviewBtn", "cancelImportReviewBtn", "confirmImportReviewBtn",
        "allowNewStudents", "manualExamName", "manualExamDate", "manualSubjects", "prepareManualExamBtn",
        "saveManualExamBtn", "manualExamEntry", "examScope", "showRankings", "examWrongPenalty",
        "examSubjectPoints", "manualExamScope", "manualShowRankings", "manualWrongPenalty",
        "manualSubjectPoints", "teacherPhoto", "teacherPhotoPreview", "heroTeacherPhoto", "heroGreeting",
        "heroSummary", "heroClassBadge", "updateExamSelect", "selectAllStudents", "selectedStudentCount",
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
        "nextCalendarMonthBtn", "todayCalendarBtn", "requestNotificationBtn", "calendarTitle",
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
      els.addClassBtn.addEventListener("click", addClassFromPanel);
      els.teacherPhoto.addEventListener("change", handleTeacherPhotoUpload);
      els.schoolLogo.addEventListener("change", handleSchoolLogoUpload);
      els.deleteClassBtn.addEventListener("click", deleteActiveClass);
      els.studentSearch.addEventListener("input", renderStudents);
      els.addStudentBtn.addEventListener("click", () => openStudentDialog());
      els.selectAllStudents.addEventListener("change", toggleSelectAllStudents);
      els.clearStudentSelectionBtn.addEventListener("click", clearStudentSelection);
      els.deleteSelectedStudentsBtn.addEventListener("click", deleteSelectedStudents);
      els.closeStudentDialogBtn.addEventListener("click", () => els.studentDialog.close());
      els.cancelStudentBtn.addEventListener("click", () => els.studentDialog.close());
      els.saveStudentBtn.addEventListener("click", saveStudentFromDialog);
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
      els.reportStudent.addEventListener("change", () => { updateSubjectPicker(); buildReport(); });
      els.reportExam.addEventListener("change", () => { updateSubjectPicker(); buildReport(); });
      els.refreshReportBtn.addEventListener("click", buildReport);
      els.reportType.addEventListener("change", () => {
        if (els.reportType.value === "comparison") els.reportExam.value = "__all__";
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
      els.requestNotificationBtn.addEventListener("click", requestNotificationPermission);
      els.calendarEventDate.addEventListener("change", () => selectCalendarDate(els.calendarEventDate.value || today()));
      els.saveCalendarEventBtn.addEventListener("click", saveCalendarEvent);
      els.clearCalendarFormBtn.addEventListener("click", clearCalendarForm);
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
      input.lessonPlannerFocusDate = isDateKey(input.lessonPlannerFocusDate) ? input.lessonPlannerFocusDate : today();
      return input;
    }

    function saveState(options = {}) {
      state.updatedAt = new Date().toISOString();
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(state));
        if (!options.skipCloud) queueCloudSave();
        return true;
      } catch (error) {
        console.error(error);
        const message = error?.name === "QuotaExceededError"
          ? "Tarayıcı depolama alanı doldu. Fotoğraflar artık otomatik küçültülüyor; eski büyük fotoğrafları yenileriyle değiştirip tekrar deneyin veya Yedek bölümünden yedek alıp veriyi temizleyin."
          : "Veriler kaydedilemedi. Lütfen tekrar deneyin.";
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
        cloudSync.client = window.kemalUserAuth.getClient();
        cloudSync.userId = user.id;
        cloudSync.enabled = true;
        setCloudSyncStatus("syncing", "Bulut kontrol ediliyor", "Ajandanızın son bulut kaydı karşılaştırılıyor.");
        await reconcileCloudState(options);
      } catch (error) {
        console.warn(error);
        disableCloudSync("Yerel mod", "Bulut bağlantısı kurulamadı; yerel kayıt açık kalır.");
      }
    }

    function disableCloudSync(status, detail) {
      clearTimeout(cloudSync.timer);
      cloudSync.ready = false;
      cloudSync.enabled = false;
      cloudSync.client = null;
      cloudSync.userId = "";
      setCloudSyncStatus("local", status, detail);
    }

    async function reconcileCloudState(options = {}) {
      try {
        const row = await fetchCloudRow();
        if (!row) {
          cloudSync.ready = true;
          setCloudSyncStatus("ready", "Bulut hazır", localHasMeaningfulAgenda()
            ? "Bu cihazdaki kayıt ilk değişiklikte buluta aktarılacak. İsterseniz Şimdi Buluta Kaydet düğmesini kullanın."
            : "Bu öğretmen hesabı için henüz bulut ajandası yok.");
          return;
        }

        const remoteTime = remoteUpdatedTime(row);
        const localTime = Date.parse(state.updatedAt || "") || 0;
        if (remoteTime && remoteTime > localTime + 2000) {
          const shouldAsk = localHasMeaningfulAgenda() && localTime;
          const shouldLoad = !shouldAsk || confirm("Bulutta bu cihazdakinden daha yeni bir Öğretmen Ajandası kaydı var. Buluttaki veriyi bu cihaza yükleyelim mi? Mevcut yerel kayıt güvenlik yedeği olarak saklanacak.");
          if (shouldLoad) {
            applyCloudRow(row);
            cloudSync.ready = true;
            cloudSync.lastLoadedAt = new Date().toISOString();
            setCloudSyncStatus("ready", "Buluttan yüklendi", `Son bulut kaydı bu cihaza alındı. Veri boyutu: ${formatBytes(row.storage_bytes || 0)}.`);
            if (!options.silent) toast("Buluttaki ajanda bu cihaza yüklendi.");
            return;
          }
          cloudSync.ready = true;
          setCloudSyncStatus("ready", "Yerel kayıt korunuyor", "Buluttaki yeni kayıt alınmadı. İsterseniz Yedek bölümünden daha sonra buluttan yükleyebilirsiniz.");
          return;
        }

        if (localTime && localTime > remoteTime + 2000) {
          await saveCloudNow({ silent: true });
          return;
        }

        cloudSync.ready = true;
        cloudSync.lastSavedAt = row.updated_at || row.client_updated_at || "";
        setCloudSyncStatus("ready", "Bulut güncel", `Son kayıt: ${formatCloudDate(row.updated_at || row.client_updated_at)} · ${formatBytes(row.storage_bytes || 0)}.`);
      } catch (error) {
        console.warn(error);
        setCloudSyncError(cloudErrorMessage(error));
      }
    }

    function queueCloudSave() {
      if (!cloudSync.enabled || !cloudSync.client || !cloudSync.userId || cloudSync.applyingRemote) return;
      clearTimeout(cloudSync.timer);
      cloudSync.timer = setTimeout(() => {
        saveCloudNow({ queued: true });
      }, CLOUD_SYNC_DEBOUNCE_MS);
      setCloudSyncStatus("syncing", "Buluta kaydedilecek", "Değişiklikler birkaç saniye içinde öğretmen hesabınıza aktarılır.");
    }

    async function saveCloudNow(options = {}) {
      if (!cloudSync.enabled || !cloudSync.client || !cloudSync.userId) {
        if (options.manual) toast("Bulut senkron için aktif öğretmen hesabıyla giriş yapılmalı.");
        renderCloudSyncStatus();
        return false;
      }
      if (cloudSync.saving) return false;
      clearTimeout(cloudSync.timer);
      cloudSync.saving = true;
      setCloudSyncStatus("syncing", "Buluta kaydediliyor", "Yerel ajanda verisi öğretmen hesabınıza aktarılıyor.");
      try {
        const snapshot = buildCloudSnapshot();
        const bytes = payloadBytes(snapshot);
        if (bytes > CLOUD_SYNC_MAX_BYTES) {
          throw new Error(`Ajanda verisi bulut sınırını aşıyor (${formatBytes(bytes)}). Fotoğrafları küçültüp tekrar deneyin ya da JSON yedek kullanın.`);
        }
        const payload = {
          user_id: cloudSync.userId,
          agenda_state: snapshot.agendaState,
          lesson_planner_state: snapshot.lessonPlannerState,
          app_version: "teacher-agenda-v1",
          storage_bytes: bytes,
          client_updated_at: snapshot.agendaState.updatedAt || new Date().toISOString()
        };
        const result = await cloudSync.client
          .from(CLOUD_SYNC_TABLE)
          .upsert(payload, { onConflict: "user_id" })
          .select("updated_at,storage_bytes")
          .maybeSingle();
        if (result.error) throw result.error;
        cloudSync.ready = true;
        cloudSync.lastSavedAt = result.data?.updated_at || new Date().toISOString();
        setCloudSyncStatus("ready", "Buluta kaydedildi", `Son kayıt: ${formatCloudDate(cloudSync.lastSavedAt)} · ${formatBytes(bytes)}.`);
        if (options.manual) toast("Ajanda buluta kaydedildi.");
        return true;
      } catch (error) {
        console.warn(error);
        setCloudSyncError(cloudErrorMessage(error));
        if (options.manual) toast(cloudErrorMessage(error));
        return false;
      } finally {
        cloudSync.saving = false;
        renderCloudSyncStatus();
      }
    }

    async function loadCloudNow(options = {}) {
      if (!cloudSync.enabled || !cloudSync.client || !cloudSync.userId) {
        if (options.manual) toast("Buluttan yüklemek için aktif öğretmen hesabıyla giriş yapılmalı.");
        renderCloudSyncStatus();
        return false;
      }
      try {
        setCloudSyncStatus("syncing", "Buluttan alınıyor", "Öğretmen hesabınızdaki son ajanda kaydı okunuyor.");
        const row = await fetchCloudRow();
        if (!row) {
          setCloudSyncStatus("ready", "Bulut hazır", "Bu hesapta henüz bulut ajandası bulunamadı.");
          if (options.manual) toast("Bulutta kayıtlı ajanda bulunamadı.");
          return false;
        }
        const shouldLoad = !localHasMeaningfulAgenda() || confirm("Buluttaki son ajanda kaydı bu cihaza yüklensin mi? Mevcut yerel kayıt güvenlik yedeği olarak saklanacak.");
        if (!shouldLoad) {
          renderCloudSyncStatus();
          return false;
        }
        applyCloudRow(row);
        cloudSync.ready = true;
        cloudSync.lastLoadedAt = new Date().toISOString();
        setCloudSyncStatus("ready", "Buluttan yüklendi", `Son bulut kaydı bu cihaza alındı. Veri boyutu: ${formatBytes(row.storage_bytes || 0)}.`);
        if (options.manual) toast("Buluttaki ajanda yüklendi.");
        return true;
      } catch (error) {
        console.warn(error);
        setCloudSyncError(cloudErrorMessage(error));
        if (options.manual) toast(cloudErrorMessage(error));
        return false;
      }
    }

    async function fetchCloudRow() {
      const result = await cloudSync.client
        .from(CLOUD_SYNC_TABLE)
        .select("agenda_state,lesson_planner_state,client_updated_at,updated_at,storage_bytes")
        .eq("user_id", cloudSync.userId)
        .maybeSingle();
      if (result.error) throw result.error;
      return result.data || null;
    }

    function applyCloudRow(row) {
      const incoming = row?.agenda_state;
      if (!incoming || !Array.isArray(incoming.classes) || !Array.isArray(incoming.students) || !Array.isArray(incoming.exams)) {
        throw new Error("Buluttaki ajanda kaydı geçerli görünmüyor.");
      }
      writeLocalBackupBeforeCloud();
      cloudSync.applyingRemote = true;
      try {
        state = normalizeState(JSON.parse(JSON.stringify(incoming)));
        restoreLessonPlannerBackup(row.lesson_planner_state || null);
        ensureInitialClass();
        saveState({ skipCloud: true });
        renderAll();
      } finally {
        cloudSync.applyingRemote = false;
      }
    }

    function buildCloudSnapshot() {
      return {
        agendaState: JSON.parse(JSON.stringify(state)),
        lessonPlannerState: readLessonPlannerBackup()
      };
    }

    function writeLocalBackupBeforeCloud() {
      try {
        const backup = {
          ...state,
          lessonPlannerBackup: readLessonPlannerBackup(),
          savedBeforeCloudLoadAt: new Date().toISOString()
        };
        localStorage.setItem(`${STORE_KEY}.bulut-oncesi-yedek`, JSON.stringify(backup));
      } catch (error) {
        console.warn("Bulut öncesi yerel yedek saklanamadı", error);
      }
    }

    function localHasMeaningfulAgenda() {
      return Boolean(
        state.students.length ||
        state.exams.length ||
        state.scheduleItems?.length ||
        state.calendarEvents?.length ||
        (state.classes.length > 1) ||
        state.teacher?.photo ||
        state.teacher?.schoolLogo ||
        state.teacher?.schoolName ||
        readLessonPlannerBackup()
      );
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
      if (error?.code === "42P01" || text.includes(CLOUD_SYNC_TABLE)) {
        return "Bulut ajanda tablosu henüz Supabase üzerinde kurulmamış. SQL dosyasını çalıştırana kadar yerel kayıt devam eder.";
      }
      if (text.includes("JWT") || text.includes("auth")) {
        return "Oturum doğrulanamadı. Tekrar giriş yaptıktan sonra bulut senkronu deneyin.";
      }
      return text || "Bulut senkron sırasında beklenmeyen bir hata oluştu.";
    }

    function renderCloudSyncStatus() {
      const badge = els.cloudSyncBadge;
      if (badge) {
        badge.textContent = cloudSync.status || "Yerel mod";
        badge.className = `badge ${cloudBadgeClass()}`;
      }
      if (els.cloudSyncStatus) {
        els.cloudSyncStatus.textContent = cloudSync.enabled
          ? "Kayıtlı öğretmen hesabı ile bulut senkron açık."
          : "Giriş yapılmazsa veriler bu tarayıcıda kalır.";
      }
      if (els.cloudSyncDetail) {
        els.cloudSyncDetail.textContent = cloudSync.detail || "";
      }
      if (els.cloudBackupStatus) {
        els.cloudBackupStatus.textContent = `${cloudSync.status || "Yerel mod"} · ${cloudSync.detail || "Yerel JSON yedek sistemi çalışmaya devam eder."}`;
      }
      [els.cloudSaveNowBtn, els.cloudSaveNowBtnBackup].forEach((button) => {
        if (button) button.disabled = !cloudSync.enabled || cloudSync.saving;
      });
      [els.cloudLoadNowBtn, els.cloudLoadNowBtnBackup].forEach((button) => {
        if (button) button.disabled = !cloudSync.enabled || cloudSync.saving;
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

    function ensureInitialClass() {
      if (!state.classes.length) {
        const classId = uid("class");
        state.classes.push({ id: classId, name: "Sınıfım", year: "2025-2026", teacherName: "Kemal Öğretmen" });
        state.activeClassId = classId;
        saveState();
      }
      if (!state.activeClassId || !state.classes.some((item) => item.id === state.activeClassId)) {
        state.activeClassId = state.classes[0].id;
        saveState();
      }
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
    }

    function renderClassSelect() {
      els.activeClassSelect.innerHTML = state.classes.map((item) => (
        `<option value="${escapeHtml(item.id)}" ${item.id === state.activeClassId ? "selected" : ""}>${escapeHtml(classLabel(item))}</option>`
      )).join("");
    }

    function renderSettings() {
      const current = activeClass();
      els.teacherName.value = current?.teacherName || state.teacher?.name || "";
      els.schoolName.value = state.teacher?.schoolName || "";
      els.classYear.value = current?.year || "2025-2026";
      els.className.value = current?.name || "";
      els.newClassName.value = "";
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
      if (!state.classes.some((item) => item.id === classId)) return;
      state.activeClassId = classId;
      selectedStudentIds.clear();
      saveState();
      renderAll();
    }

    function editClassFromPanel(classId) {
      selectClassFromPanel(classId);
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

    function renderTeacherPhoto() {
      const html = teacherAvatarHtml();
      els.teacherPhotoPreview.innerHTML = html;
      els.heroTeacherPhoto.innerHTML = html;
    }

    function renderSchoolLogo() {
      els.schoolLogoPreview.innerHTML = state.teacher?.schoolLogo ? `<img src="${state.teacher.schoolLogo}" alt="">` : "Logo";
    }

    function teacherAvatarHtml() {
      if (state.teacher?.photo) return `<img src="${state.teacher.photo}" alt="">`;
      return "KÖ";
    }

    function systemLogoHtml() {
      return `<img src="${SYSTEM_LOGO_DATA_URL}" alt="Kemal Kocar logo">`;
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

    function deleteStudentsByIds(ids) {
      const idSet = new Set(ids);
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
      });
      saveState();
    }

    function avatarHtml(student) {
      if (student.photo) return `<img src="${student.photo}" alt="" style="${studentPhotoStyle(student)}">`;
      return escapeHtml(initials(student));
    }

    function studentPhotoStyle(student) {
      const fit = student.photoFit || "contain";
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
      els.photoPreview.innerHTML = student.photo ? `<img src="${student.photo}" alt="" style="${studentPhotoStyle(student)}">` : "Foto";
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
      els.photoPreview.innerHTML = `<img src="${dataUrl}" alt="" style="${currentPhotoStyle()}">`;
      els.photoPreview.dataset.photo = dataUrl;
      els.studentPhotoFit.value = "contain";
      els.studentPhotoX.value = 50;
      els.studentPhotoY.value = 50;
      cropState = null;
      els.cropImage.removeAttribute("src");
      els.photoCropDialog.close();
      studentPhotoProcessing = false;
      updatePhotoPreviewSettings();
      toast("Fotoğraf kırpıldı. Kaydet düğmesiyle öğrenciye işleyebilirsiniz.");
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

    function saveStudentFromDialog() {
      if (studentPhotoProcessing) {
        toast("Fotoğraf hazırlanıyor. Lütfen birkaç saniye sonra tekrar kaydedin.");
        return;
      }
      if (!els.studentFirstName.value.trim() && !els.studentLastName.value.trim()) {
        toast("Öğrencinin adını veya soyadını yazın.");
        return;
      }
      let student = editingStudentId ? state.students.find((item) => item.id === editingStudentId) : null;
      const createdNow = !student;
      if (!student) {
        student = blankStudent();
        state.students.push(student);
        editingStudentId = student.id;
      }
      student.classId = state.activeClassId;
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
        delete els.photoPreview.dataset.photo;
      }
      if (!saveState()) {
        if (createdNow) {
          state.students = state.students.filter((item) => item.id !== student.id);
          editingStudentId = null;
        }
        return;
      }
      toast("Öğrenci kaydedildi.");
      els.studentDialog.close();
      renderAll();
    }

    function deleteStudentFromDialog() {
      if (!editingStudentId) return;
      const student = state.students.find((item) => item.id === editingStudentId);
      if (!student || !confirm(`${fullName(student)} silinsin mi? Bu öğrencinin kişisel bilgileri silinir, sınav geçmişi sınav kayıtlarından da kaldırılır.`)) return;
      deleteStudentsByIds([editingStudentId]);
      selectedStudentIds.delete(editingStudentId);
      els.studentDialog.close();
      renderAll();
      toast("Öğrenci silindi.");
    }

    function addNoteToStudent() {
      const student = state.students.find((item) => item.id === editingStudentId);
      if (!student || !els.noteText.value.trim()) return;
      student.notes = student.notes || [];
      student.notes.unshift({ id: uid("note"), date: els.noteDate.value || today(), text: els.noteText.value.trim() });
      els.noteText.value = "";
      saveState();
      renderStudentNotes(student);
      renderDashboard();
      renderReportSelectors();
      toast("Not eklendi.");
    }

    function addMeetingToStudent() {
      const student = state.students.find((item) => item.id === editingStudentId);
      if (!student || !els.meetingText.value.trim()) return;
      student.meetings = student.meetings || [];
      student.meetings.unshift({
        id: uid("meeting"),
        date: els.meetingDate.value || today(),
        type: els.meetingType.value,
        text: els.meetingText.value.trim()
      });
      els.meetingText.value = "";
      saveState();
      renderStudentMeetings(student);
      renderDashboard();
      renderReportSelectors();
      toast("Veli görüşmesi eklendi.");
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
          return `<tr><td>${escapeHtml(exam.name)}</td><td>${formatDate(exam.date)}</td><td>${total.d}</td><td>${total.y}</td><td>${total.b}</td><td>${formatPercent(total.percent)}</td></tr>`;
        }).join("");
      els.studentAcademic.innerHTML = rows
        ? `<div class="table-wrap"><table><thead><tr><th>Sınav</th><th>Tarih</th><th>D</th><th>Y</th><th>B</th><th>Başarı</th></tr></thead><tbody>${rows}</tbody></table></div>`
        : `<div class="empty">Bu öğrenciye ait akademik veri henüz yok.</div>`;
    }

    function activateTab(tabId) {
      document.querySelectorAll(".tab-btn").forEach((button) => button.classList.toggle("active", button.dataset.tab === tabId));
      document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === tabId));
    }

    function saveSettingsAndClass() {
      const teacherName = els.teacherName.value.trim() || "Kemal Öğretmen";
      state.teacher = state.teacher || {};
      state.teacher.name = teacherName;
      state.teacher.schoolName = els.schoolName.value.trim();
      const current = activeClass();
      if (current) {
        current.name = cleanClassName(els.className.value) || current.name || "Sınıfım";
        current.teacherName = teacherName;
        current.year = els.classYear.value.trim() || current.year || "";
      }
      saveState();
      renderAll();
      toast("Aktif sınıf bilgileri güncellendi.");
    }

    function addClassFromPanel() {
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
      selectedStudentIds.clear();
      saveState();
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
      state.classes = state.classes.filter((item) => item.id !== current.id);
      state.students = state.students.filter((student) => student.classId !== current.id);
      state.exams = state.exams.filter((exam) => exam.classId !== current.id);
      state.scheduleItems = (state.scheduleItems || []).filter((item) => item.classId !== current.id);
      state.calendarEvents = (state.calendarEvents || []).filter((item) => item.classId !== current.id);
      state.activeClassId = state.classes[0].id;
      selectedStudentIds.clear();
      saveState();
      renderAll();
      toast("Sınıf silindi.");
    }

    async function importExamFromExcel() {
      const file = els.excelFile.files?.[0];
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
        const parsed = await parseExcelFile(file);
        if (!parsed.students.length) throw new Error("Öğrenci satırı bulunamadı.");

        const scoring = scoringOptionsFromInputs(parsed.subjects, els.examSubjectPoints.value, els.examWrongPenalty.checked);
        const existing = selectedExam || state.exams.find((exam) => exam.classId === state.activeClassId && exam.name === examName);
        if (existing && !confirm("Bu isimde bir sınav zaten var. Tamam derseniz mevcut sınav güncellenir ve yeni Excel verileri aynı sınava işlenir.")) return;

        pendingImport = buildImportPlan(parsed, {
          name: examName,
          date: els.examDate.value || today(),
          sourceFile: file.name,
          scope: els.examScope.value,
          showRankings: els.showRankings.checked,
          scoring,
          existingExamId: existing?.id || null
        });
        renderImportReview(pendingImport);
        els.importReviewDialog.showModal();
      } catch (error) {
        console.error(error);
        els.importSummary.innerHTML = `<div class="empty">Excel okunamadı: ${escapeHtml(error.message || String(error))}</div>`;
      }
    }

    function buildImportPlan(parsed, meta) {
      const currentStudents = activeStudents();
      const matchedExistingIds = new Set();
      const participants = [];
      const rows = parsed.students.map((rowStudent, index) => {
        const match = findStudentMatch(rowStudent, currentStudents);
        if (match) matchedExistingIds.add(match.id);
        if (rowStudent.hasScores) {
          participants.push(makeParticipantFromRow(rowStudent, index, match?.id || null, meta.scoring));
        }
        return {
          index,
          rowStudent,
          matchId: match?.id || null,
          matchName: match ? fullName(match) : "",
          matchType: match ? (rowStudent.schoolNo && String(match.schoolNo || "") === String(rowStudent.schoolNo) ? "Okul no" : "Ad soyad") : "Yeni",
          hasScores: rowStudent.hasScores
        };
      });
      const newRows = rows.filter((row) => !row.matchId);
      const matchedRows = rows.filter((row) => row.matchId);
      const noScoreRows = rows.filter((row) => !row.hasScores);
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
        const byNo = students.find((student) => String(student.schoolNo || "") === String(rowStudent.schoolNo));
        if (byNo) return byNo;
      }
      const keyName = normalize(`${rowStudent.firstName} ${rowStudent.lastName}`);
      return students.find((student) => normalize(fullName(student)) === keyName) || null;
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
          <div class="badges">
            <span class="badge green">${plan.matchedRows.length} eşleşen</span>
            <span class="badge blue">${plan.newRows.length} yeni</span>
            <span class="badge red">${plan.missingStudents.length} Excel'de yok</span>
            <span class="badge gold">${scored} sonuçlu kayıt</span>
            <span class="badge blue">${scopeLabel(plan.meta.scope)} kıyas havuzu: ${plan.participants.length}</span>
            ${plan.meta.scoring?.wrongPenalty ? `<span class="badge red">3 yanlış 1 doğru</span>` : ""}
            ${plan.meta.scoring?.pointTotal ? `<span class="badge gold">Puanlı: ${formatNumber(plan.meta.scoring.pointTotal)} puan</span>` : `<span class="badge gold">100 puanlık otomatik değerlendirme</span>`}
          </div>
        </div>
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
        <p style="margin-bottom:0;color:#667085">Onaydan sonra eşleşen öğrencilerin sınav sonucu kaydedilir. Yeni öğrenci seçeneğini kapatırsanız yeni görünen satırlar sınava eklenmez.</p>
      `;
      els.allowNewStudents.checked = plan.meta.scope === "class";
    }

    function commitPendingImport() {
      if (!pendingImport) return;
      const allowNew = els.allowNewStudents.checked;
      const results = {};
      let created = 0;
      let matched = 0;
      let skippedNew = 0;
      let scored = 0;
      const wasUpdate = !!pendingImport.meta.existingExamId;

      pendingImport.rows.forEach((row) => {
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
      saveState();
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
      exam.sourceFile = [exam.sourceFile, payload.sourceFile].filter(Boolean).join(" + ");
      exam.subjects = Array.from(new Set([...(exam.subjects || []), ...(payload.subjects || [])]));
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
        merged[studentId] = makeResult({
          ...(merged[studentId].subjects || {}),
          ...(result.subjects || {})
        }, scoring);
      });
      Object.entries(merged).forEach(([studentId, result]) => {
        merged[studentId] = makeResult(result.subjects || {}, scoring);
      });
      return merged;
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
          result: makeResult({
            ...(current.result?.subjects || {}),
            ...(item.result?.subjects || {})
          }, scoring)
        });
      });
      return Array.from(map.values()).map((item) => ({
        ...item,
        result: makeResult(item.result?.subjects || {}, scoring)
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

    async function parseExcelFile(file) {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      applyMergedCells(rows, sheet["!merges"] || []);
      const structure = detectExamStructure(rows);
      const students = extractExamStudents(rows, structure);
      return { subjects: structure.groups.map((group) => group.subject), students };
    }

    function applyMergedCells(rows, merges) {
      merges.forEach((merge) => {
        const value = rows[merge.s.r]?.[merge.s.c];
        if (value === undefined || value === "") return;
        for (let r = merge.s.r; r <= merge.e.r; r += 1) {
          rows[r] = rows[r] || [];
          for (let c = merge.s.c; c <= merge.e.c; c += 1) rows[r][c] = rows[r][c] || value;
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
      if (!groups.length) return detectFlatExamStructure(rows);
      const identity = detectIdentityColumns(rows, subjectRow, groups[0].start);
      return { subjectRow, subRow, groups, identity, dataStart: subRow + 1 };
    }

    function detectFlatExamStructure(rows) {
      for (let r = 0; r < rows.length; r += 1) {
        const row = rows[r] || [];
        const identity = detectIdentityColumns([row], 0, row.length);
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
        const hasIdentity = identity.fullName !== null || identity.firstName !== null || identity.lastName !== null;
        if (groups.length && hasIdentity) {
          return { subjectRow: r, subRow: r, groups, identity, dataStart: r + 1 };
        }
      }
      throw new Error("Ders başlıkları ve D/Y/B alanları bulunamadı. Dosyada okul no, ad-soyad ve ders doğru/yanlış/boş sütunları olmalı.");
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
      for (let c = 0; c < Math.max(subjects.length, subs.length) - 3; c += 1) {
        const subject = cleanCell(subjects[c]);
        if (!subject || isTotalLabel(subject)) continue;
        if (isD(subs[c]) && isY(subs[c + 1]) && isB(subs[c + 2]) && isPercent(subs[c + 3])) {
          groups.push({ subject, start: c });
        }
      }
      return groups;
    }

    function detectIdentityColumns(rows, subjectRow, firstScoreCol) {
      const identity = { order: 0, schoolNo: null, firstName: null, lastName: null, fullName: null, className: null, schoolName: null, provinceName: null };
      for (let r = Math.max(0, subjectRow - 4); r <= subjectRow; r += 1) {
        for (let c = 0; c < firstScoreCol; c += 1) {
          const label = normalize(rows[r]?.[c] || "");
          const studentNameLabel = !label.includes("OKUL") && !label.includes("SINIF") && !label.includes("SUBE") && label !== "IL" && !label.includes("IL ADI") && !label.includes("SEHIR");
          if (label === "NO" || label.includes("OKUL NO") || label.includes("OKUL NUMARA") || label.includes("OGRENCI NO") || label.includes("NUMARA")) identity.schoolNo = c;
          if (label === "OKUL" || label.includes("OKUL AD")) identity.schoolName = c;
          if (label === "SINIF" || label.includes("SINIF") || label === "SUBE" || label.includes("SUBE")) identity.className = c;
          if (label === "IL" || label === "SEHIR" || label.includes("IL ADI") || label.includes("SEHIR AD")) identity.provinceName = c;
          if (studentNameLabel && ((label.includes("AD") && label.includes("SOYAD")) || (label.includes("OGRENCI") && !label.includes("NO") && !label.includes("NUMARA")))) identity.fullName = c;
          if (studentNameLabel && (label === "AD" || label === "ADI" || label.includes("OGRENCI ADI"))) identity.firstName = c;
          if (studentNameLabel && label.includes("SOYAD")) identity.lastName = c;
        }
      }
      if (identity.firstName === null || identity.lastName === null) {
        if (firstScoreCol >= 4) {
          identity.schoolNo = identity.schoolNo ?? 1;
          identity.firstName = 2;
          identity.lastName = 3;
        } else if (firstScoreCol >= 3) {
          identity.schoolNo = identity.schoolNo ?? 0;
          identity.firstName = 1;
          identity.lastName = 2;
        } else {
          identity.firstName = 0;
          identity.lastName = 1;
        }
      }
      return identity;
    }

    function extractExamStudents(rows, structure) {
      const students = [];
      for (let r = structure.dataStart; r < rows.length; r += 1) {
        const row = rows[r] || [];
        const names = getStudentNamesFromRow(row, structure.identity);
        const firstName = names.firstName;
        const lastName = names.lastName;
        const schoolNo = cleanCell(row[structure.identity.schoolNo]);
        const className = cleanName(row[structure.identity.className]);
        const schoolName = cleanName(row[structure.identity.schoolName]);
        const provinceName = cleanName(row[structure.identity.provinceName]);
        if (!firstName && !lastName) continue;

        const subjects = {};
        let hasScores = false;
        structure.groups.forEach((group) => {
          const dCol = group.dCol ?? group.start;
          const yCol = group.yCol ?? group.start + 1;
          const bCol = group.bCol ?? group.start + 2;
          const d = toNumberOrNull(row[dCol]);
          const y = toNumberOrNull(row[yCol]);
          const b = toNumberOrNull(row[bCol]);
          const subjectHasScore = d !== null || y !== null || b !== null;
          if (subjectHasScore) {
            const safeD = d || 0;
            const safeY = y || 0;
            const safeB = b || 0;
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

        students.push({ schoolNo, firstName, lastName, className, schoolName, provinceName, subjects, hasScores });
      }
      return students;
    }

    function getStudentNamesFromRow(row, identity) {
      if (identity.fullName !== null && identity.fullName !== undefined) {
        const parts = cleanName(row[identity.fullName]).split(" ").filter(Boolean);
        if (parts.length <= 1) return { firstName: parts[0] || "", lastName: "" };
        return {
          firstName: parts.slice(0, -1).join(" "),
          lastName: parts.slice(-1).join("").toLocaleUpperCase("tr-TR")
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

    function scoringOptionsFromInputs(subjects, pointText, wrongPenalty) {
      const subjectPoints = parseSubjectPointMap(pointText, subjects);
      return normalizeScoringOptions({
        wrongPenalty: !!wrongPenalty,
        subjectPoints
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
        total: { d: 0, y: 0, b: 0, net: 0, questionCount: 0, percent: null, score: null, maxScore: options.pointTotal || 100 }
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
        result.total.score = result.total.percent;
        result.total.maxScore = 100;
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
      parts.push(scoring.pointTotal ? `${formatNumber(scoring.pointTotal)} puanlık` : "100 puanlık");
      return parts.length ? ` · ${parts.join(" · ")}` : "";
    }

    function renderManualExamEntry() {
      const students = activeStudents();
      const subjects = parseSubjectList(els.manualSubjects.value);
      if (!students.length) {
        els.manualExamEntry.innerHTML = `<div class="empty">Elle sınav girişi için önce sınıfa öğrenci ekleyin.</div>`;
        return;
      }
      if (!subjects.length) {
        toast("En az bir ders adı yazın.");
        return;
      }
      const subjectHeaders = subjects.map((subject) => `<th colspan="3">${escapeHtml(subject)}</th>`).join("");
      const metricHeaders = subjects.map(() => `<th>D</th><th>Y</th><th>B</th>`).join("");
      const rows = students.map((student) => `
        <tr data-manual-student="${escapeHtml(student.id)}">
          <td><strong>${escapeHtml(fullName(student))}</strong><br><span class="badge">${escapeHtml(student.schoolNo || "-")}</span></td>
          ${subjects.map((subject) => `
            <td><input inputmode="numeric" min="0" type="number" data-subject="${escapeHtml(subject)}" data-kind="d" aria-label="${escapeHtml(fullName(student))} ${escapeHtml(subject)} doğru"></td>
            <td><input inputmode="numeric" min="0" type="number" data-subject="${escapeHtml(subject)}" data-kind="y" aria-label="${escapeHtml(fullName(student))} ${escapeHtml(subject)} yanlış"></td>
            <td><input inputmode="numeric" min="0" type="number" data-subject="${escapeHtml(subject)}" data-kind="b" aria-label="${escapeHtml(fullName(student))} ${escapeHtml(subject)} boş"></td>
          `).join("")}
        </tr>
      `).join("");
      els.manualExamEntry.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th rowspan="2">Öğrenci</th>${subjectHeaders}</tr>
              <tr>${metricHeaders}</tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    }

    function saveManualExam() {
      const name = els.manualExamName.value.trim();
      const subjects = parseSubjectList(els.manualSubjects.value);
      if (!name) {
        toast("Elle sınav için sınav adını yazın.");
        return;
      }
      if (!subjects.length) {
        toast("En az bir ders adı yazın.");
        return;
      }
      if (!els.manualExamEntry.querySelector("[data-manual-student]")) renderManualExamEntry();

      const scoring = scoringOptionsFromInputs(subjects, els.manualSubjectPoints.value, els.manualWrongPenalty.checked);
      const results = {};
      els.manualExamEntry.querySelectorAll("[data-manual-student]").forEach((row) => {
        const studentId = row.dataset.manualStudent;
        const subjectResults = {};
        subjects.forEach((subject) => {
          const d = toNumberOrNull(row.querySelector(`[data-subject="${cssEscape(subject)}"][data-kind="d"]`)?.value) || 0;
          const y = toNumberOrNull(row.querySelector(`[data-subject="${cssEscape(subject)}"][data-kind="y"]`)?.value) || 0;
          const b = toNumberOrNull(row.querySelector(`[data-subject="${cssEscape(subject)}"][data-kind="b"]`)?.value) || 0;
          if (d || y || b) {
            const total = d + y + b;
            subjectResults[subject] = { d, y, b, percent: total ? d * 100 / total : null };
          }
        });
        if (Object.keys(subjectResults).length) results[studentId] = makeResult(subjectResults, scoring);
      });

      const missingStudents = activeStudents().filter((student) => !results[student.id]);
      if (missingStudents.length && !confirm(`${missingStudents.length} öğrencinin bu sınavda sonucu boş görünüyor. Yine de kaydedilsin mi?`)) return;

      state.exams.push({
        id: uid("exam"),
        classId: state.activeClassId,
        name,
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
        importedAt: new Date().toISOString()
      });
      saveState();
      els.manualExamName.value = "";
      els.manualExamEntry.innerHTML = `<div class="note-item"><strong>Elle sınav kaydedildi.</strong><p>${Object.keys(results).length} öğrencinin sonucu eklendi. Sonucu boş öğrenci: ${missingStudents.length}.</p></div>`;
      renderAll();
      toast("Elle sınav sisteme eklendi.");
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
              <p>${formatDate(exam.date)} · ${scopeLabel(exam.scope)} · ${resultCount} öğrenci · kıyas havuzu ${getExamParticipants(exam).length} · ${exam.subjects.map(escapeHtml).join(", ")} · sınıf ort. ${formatPercent(totalClassAverage(exam))}${scoringText}${warningText}</p>
            </div>
            <div class="actions">
              <button class="ghost-btn" data-exam-report="${escapeHtml(exam.id)}">Karne</button>
              <button class="danger-btn" data-exam-delete="${escapeHtml(exam.id)}">Sil</button>
            </div>
          </div>
        `;
      }).join("") || `<div class="empty">Henüz sınav yok. Excel dosyası yüklediğinizde burada listelenecek.</div>`;

      els.examList.querySelectorAll("[data-exam-delete]").forEach((button) => {
        button.addEventListener("click", () => deleteExam(button.dataset.examDelete));
      });
      els.examList.querySelectorAll("[data-exam-report]").forEach((button) => {
        button.addEventListener("click", () => {
          showView("reportsView");
          els.reportExam.value = button.dataset.examReport;
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
      toast("Seçili sınav yeni Excel verisiyle güncellenecek.");
    }

    function deleteExam(examId) {
      const exam = state.exams.find((item) => item.id === examId);
      if (!exam || !confirm(`${exam.name} sınavı silinsin mi?`)) return;
      state.exams = state.exams.filter((item) => item.id !== examId);
      saveState();
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
      clockTimer = setInterval(renderTopClock, 30000);
    }

    function renderLessonPlannerFocus(info = "") {
      const focusDate = isDateKey(state.lessonPlannerFocusDate) ? state.lessonPlannerFocusDate : today();
      state.lessonPlannerFocusDate = focusDate;
      if (els.lessonPlannerFocusDate) els.lessonPlannerFocusDate.value = focusDate;
      if (els.lessonPlannerFocusInfo) {
        els.lessonPlannerFocusInfo.textContent = info || `${formatDate(focusDate)} tarihinin haftası açılacak. En son seçilen hafta tarayıcıda hatırlanır.`;
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
      els.lessonPlannerFrame.contentWindow.postMessage({
        type: "kemal-ajanda-focus-week",
        date: focusDate
      }, "*");
    }

    function handleLessonPlannerMessage(event) {
      const data = event.data || {};
      if (data.type === "kemal-lesson-planner-data-changed") {
        saveState();
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
      renderLessonPlannerFocus(parts.length ? `Ders programı ${parts.join(" · ")} olarak hatırlandı.` : "");
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
      els.calendarEventDate.value = selectedCalendarDate;
      els.calendarTitle.textContent = cursor.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });

      const weekdays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
      const firstDayOffset = (cursor.getDay() + 6) % 7;
      const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1 - firstDayOffset);
      const cells = [];
      for (let i = 0; i < 42; i += 1) {
        const cellDate = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const key = dateKey(cellDate);
        const dayEvents = [...calendarEventsForDate(key), ...birthdayEventsForDate(key)].sort(sortCalendarEvents);
        const visible = dayEvents.slice(0, 3);
        const classes = [
          "calendar-day",
          cellDate.getMonth() !== cursor.getMonth() ? "muted" : "",
          key === today() ? "today" : "",
          key === selectedCalendarDate ? "selected" : ""
        ].filter(Boolean).join(" ");
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
      els.calendarGrid.innerHTML = weekdays.map((day) => `<div class="calendar-weekday">${day}</div>`).join("") + cells.join("");
      els.calendarGrid.querySelectorAll("[data-calendar-date]").forEach((day) => {
        day.addEventListener("click", () => {
          selectedCalendarDate = day.dataset.calendarDate;
          renderCalendar();
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
      return activeCalendarEvents().filter((event) => event.date === key);
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
      els.selectedDayEvents.innerHTML = events.length ? events.map((event) => `
        <div class="calendar-event event-${escapeHtml(event.type || "note")} ${isReminderDue(event) ? "reminder-due" : ""}">
          <strong>${calendarEventIcon(event.type)} ${escapeHtml(event.title)}</strong>
          <small>${escapeHtml([event.time, calendarEventLabel(event.type), reminderLabel(event.reminder)].filter(Boolean).join(" · "))}</small>
          ${event.note ? `<small>${escapeHtml(event.note)}</small>` : ""}
          ${event.synthetic ? "" : `<button class="mini-delete" data-delete-calendar="${escapeHtml(event.id)}">Sil</button>`}
        </div>
      `).join("") : `<div class="empty">${formatDate(selectedCalendarDate)} için ajanda kaydı yok.</div>`;
      els.selectedDayEvents.querySelectorAll("[data-delete-calendar]").forEach((button) => {
        button.addEventListener("click", () => deleteCalendarEvent(button.dataset.deleteCalendar));
      });
    }

    function saveCalendarEvent() {
      const title = els.calendarEventTitle.value.trim();
      if (!title) {
        toast("Takvim kaydı için başlık yazın.");
        return;
      }
      const date = els.calendarEventDate.value || selectedCalendarDate || today();
      state.calendarEvents = state.calendarEvents || [];
      state.calendarEvents.push({
        id: uid("calendar"),
        classId: state.activeClassId,
        date,
        type: els.calendarEventType.value || "note",
        time: els.calendarEventTime.value,
        title,
        reminder: els.calendarReminder.value,
        note: els.calendarEventNote.value.trim(),
        remindedAt: "",
        createdAt: new Date().toISOString()
      });
      selectedCalendarDate = date;
      calendarCursor = parseDateValue(date) || calendarCursor;
      calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
      saveState();
      clearCalendarForm(false);
      renderCalendar();
      toast("Takvim kaydı eklendi.");
    }

    function clearCalendarForm(resetDate = true) {
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
      state.calendarEvents = (state.calendarEvents || []).filter((item) => item.id !== id);
      saveState();
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
      const studentOptions = students.map((student) => (
        `<option value="${escapeHtml(student.id)}">${escapeHtml(fullName(student))}${student.schoolNo ? ` · ${escapeHtml(String(student.schoolNo))}` : ""}</option>`
      )).join("");
      els.reportStudent.innerHTML = studentOptions;
      els.summaryStudent.innerHTML = studentOptions;
      els.meetingReportStudent.innerHTML = `<option value="__all__">Tüm öğrenciler</option>${studentOptions}`;

      const exams = activeExams();
      const currentRankingExam = els.rankingExam?.value || "";
      els.reportExam.innerHTML = `<option value="__all__">Tüm sınavların toplam akademik özeti</option>` + exams.map((exam) => (
        `<option value="${escapeHtml(exam.id)}">${escapeHtml(exam.name)} · ${formatDate(exam.date)}</option>`
      )).join("");
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
      const exam = state.exams.find((item) => item.id === value);
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
      const usesAcademicSelectors = type === "academic" || type === "comparison";
      document.querySelectorAll(".report-option-panel").forEach((panel) => panel.classList.remove("active"));
      [els.reportStudent, els.reportExam, els.subjectPicker].forEach((element) => {
        const field = element?.closest(".field");
        if (field) field.style.display = usesAcademicSelectors ? "" : "none";
      });
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
          <div class="letterhead-logo">${state.teacher?.schoolLogo ? `<img src="${state.teacher.schoolLogo}" alt="">` : systemLogoHtml()}</div>
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
          <span>By Kemal Öğretmen · kemalogretmen.com.tr</span>
        </div>
      `;
    }

    function photoBoxHtml(student, className = "class-list-photo") {
      return `<div class="${className}">${student.photo ? `<img src="${student.photo}" alt="" style="${studentPhotoStyle(student)}">` : escapeHtml(initials(student))}</div>`;
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
              <tr><th>Sıra</th><th>Öğrenci</th><th>Okul No</th><th>Sınıf</th><th>Okul</th><th>İl</th><th>D</th><th>Y</th><th>B</th>${scoreHeader}</tr>
            </thead>
            <tbody>
              ${rankedRows.map((row) => `
                <tr>
                  <td><strong>${row.rank}</strong></td>
                  <td><strong>${escapeHtml(row.name)}</strong></td>
                  <td>${escapeHtml(row.schoolNo || "-")}</td>
                  <td>${escapeHtml(row.className || "-")}</td>
                  <td>${escapeHtml(row.schoolName || "-")}</td>
                  <td>${escapeHtml(row.provinceName || "-")}</td>
                  <td>${row.d}</td>
                  <td>${row.y}</td>
                  <td>${row.b}</td>
                  ${scoreCells(row)}
                </tr>
              `).join("") || `<tr><td colspan="${weighted ? 11 : 10}">Seçili filtrelerde öğrenci yok.</td></tr>`}
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
          b: result?.total?.b || 0
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
      const maxScore = normalizeScoringOptions(exam.scoring).pointTotal || 100;
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
      return normalizeScoringOptions(exam.scoring).pointTotal > 0;
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

    function buildComparisonReport() {
      const student = state.students.find((item) => item.id === els.reportStudent.value) || activeStudents()[0];
      if (!student) {
        els.reportCard.className = "report-card";
        els.reportCard.innerHTML = `<div class="empty">Karşılaştırmalı karne için önce öğrenci ekleyin.</div>`;
        return;
      }
      const exams = comparisonExamSet(student.id);
      if (exams.length < 2) {
        els.reportCard.className = "report-card";
        els.reportCard.innerHTML = `<div class="empty">Karşılaştırmalı karne için bu öğrencinin en az iki sınav sonucu olmalı. Sınav filtresini "Tüm sınavlar" yaparak tekrar deneyebilirsiniz.</div>`;
        return;
      }
      const snapshots = exams.map((exam) => comparisonSnapshot(exam, student.id));
      const first = snapshots[0];
      const latest = snapshots[snapshots.length - 1];
      const percentDelta = valueDelta(latest.percent, first.percent);
      const subjects = comparisonSubjects(snapshots, selectedSubjects());
      const trendChart = buildComparisonTrendChart(snapshots);
      const examCountChart = buildExamCountStackedBars(snapshots);
      const subjectDeltaCards = buildSubjectDeltaCards(snapshots, subjects);
      const currentClass = activeClass();
      const teacherName = currentClass?.teacherName || state.teacher?.name || "Kemal Öğretmen";
      const feedback = buildComparisonFeedback(snapshots, subjects);

      els.reportCard.className = "report-card";
      els.reportCard.innerHTML = `
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
          <div class="report-kpi"><span>Doğru / Yanlış / Boş</span><b>${latest.d} / ${latest.y} / ${latest.b}</b><p>${countDeltaText(latest.d - first.d, "D")} · ${countDeltaText(latest.y - first.y, "Y")} · ${countDeltaText(latest.b - first.b, "B")}</p></div>
        </div>
        <h3 class="report-section-title">Deneme Başarı Grafiği</h3>
        <div class="chart-panel">
          <div class="chart-panel-title"><strong>Zaman içindeki başarı</strong><span>Deneme deneme gelişim</span></div>
          ${trendChart}
          <div class="badges">
            <span class="badge blue">Çizgi: öğrencinin deneme başarı yüzdesi</span>
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
                    <td>${item.d}</td>
                    <td>${item.y}</td>
                    <td>${item.b}</td>
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
                      const subjectResult = item.result.subjects?.[subject];
                      return `<td>${subjectResult ? `<strong>${formatPercent(subjectResult.percent)}</strong><br><span style="color:#667085;font-size:12px">${subjectResult.d}D · ${subjectResult.y}Y · ${subjectResult.b}B</span>` : "-"}</td>`;
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
      const result = exam.results?.[studentId] || { subjects: {}, total: {} };
      return {
        exam,
        result,
        d: result.total?.d || 0,
        y: result.total?.y || 0,
        b: result.total?.b || 0,
        percent: isFiniteNumber(result.total?.percent) ? result.total.percent : null,
        classAverage: totalClassAverage(exam),
        generalAverage: totalParticipantAverage(exam)
      };
    }

    function comparisonSubjects(snapshots, selected) {
      const all = Array.from(new Set(snapshots.flatMap((item) => Object.keys(item.result.subjects || {}))));
      const pool = selected.length ? selected.filter((subject) => all.includes(subject)) : all;
      return pool.sort((a, b) => a.localeCompare(b, "tr"));
    }

    function buildComparisonTrendChart(snapshots) {
      const width = 860;
      const height = 286;
      const left = 50;
      const right = 28;
      const top = 28;
      const bottom = 66;
      const chartWidth = width - left - right;
      const chartHeight = height - top - bottom;
      const y = (value) => top + chartHeight - (clampPercent(value) / 100) * chartHeight;
      const x = (index) => snapshots.length === 1 ? left + chartWidth / 2 : left + (chartWidth * index) / (snapshots.length - 1);
      const points = snapshots.map((item, index) => `${x(index)},${y(item.percent)}`).join(" ");
      const area = `${left},${top + chartHeight} ${points} ${x(snapshots.length - 1)},${top + chartHeight}`;
      const grid = [0, 25, 50, 75, 100].map((tick) => {
        const yy = y(tick);
        return `<line class="grid-line" x1="${left}" y1="${yy}" x2="${width - right}" y2="${yy}"></line><text x="8" y="${yy + 4}">%${tick}</text>`;
      }).join("");
      return `
        <svg class="comparison-trend-chart combo-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Denemeler arası başarı değişimini gösterir">
          ${grid}
          <polygon class="trend-area" points="${area}"></polygon>
          <polyline class="trend-line" points="${points}"></polyline>
          ${snapshots.map((item, index) => {
            const label = shortExamLabel(item.exam);
            return `
              <circle class="trend-dot" cx="${x(index)}" cy="${y(item.percent)}" r="7"></circle>
              <text x="${x(index)}" y="${Math.max(16, y(item.percent) - 12)}" text-anchor="middle">${formatPercent(item.percent)}</text>
              <text x="${x(index)}" y="${height - 30}" text-anchor="middle">${escapeHtml(label)}</text>
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
      const item = snapshots.find((snapshot) => isFiniteNumber(snapshot.result.subjects?.[subject]?.percent));
      return item?.result.subjects?.[subject]?.percent ?? null;
    }

    function lastFiniteSubjectPercent(snapshots, subject) {
      const item = snapshots.slice().reverse().find((snapshot) => isFiniteNumber(snapshot.result.subjects?.[subject]?.percent));
      return item?.result.subjects?.[subject]?.percent ?? null;
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

    function buildReport() {
      const type = els.reportType?.value || "academic";
      if (type === "classList") return buildClassListReport();
      if (type === "rankingList") return buildRankingListReport();
      if (type === "meetings") return buildMeetingReport();
      if (type === "studentSummary") return buildStudentSummaryReport();
      if (type === "comparison") return buildComparisonReport();
      const student = state.students.find((item) => item.id === els.reportStudent.value) || activeStudents()[0];
      const exams = selectedExamSet();
      const subjects = selectedSubjects();
      if (!student || !exams.length) {
        els.reportCard.className = "report-card";
        els.reportCard.innerHTML = `<div class="empty">Karne için önce öğrenci ve sınav verisi ekleyin.</div>`;
        return;
      }

      const report = aggregateStudentReport(student.id, exams, subjects);
      const currentClass = activeClass();
      const teacherName = currentClass?.teacherName || state.teacher?.name || "Kemal Öğretmen";
      const title = els.reportExam.value === "__all__" ? "Akademik İzleme Karnesi" : exams[0].name;
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
            <td>${item.d}</td>
            <td>${item.y}</td>
            <td>${item.b}</td>
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

      els.reportCard.className = "report-card";
      els.reportCard.innerHTML = `
        <div class="report-header">
          <div>
            <h2>${escapeHtml(fullName(student))}</h2>
            <p>${escapeHtml(title)} · ${escapeHtml(currentClass?.name || "")} · ${formatDate(exams[0].date)}${exams.length > 1 ? ` / ${exams.length} sınav` : ""}</p>
            <p>${escapeHtml(state.teacher?.schoolName || "")} ${state.teacher?.schoolName ? "·" : ""} ${escapeHtml(teacherName)}</p>
          </div>
          <div class="report-photo">${avatarHtml(student)}</div>
        </div>
        <div class="report-kpis">
          <div class="report-kpi"><span>Toplam Doğru</span><b>${report.total.d}</b></div>
          <div class="report-kpi"><span>Toplam Yanlış</span><b>${report.total.y}</b></div>
          <div class="report-kpi"><span>Toplam Boş</span><b>${report.total.b}</b></div>
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
            <div class="ranking-card"><span>Sınıf Sırası</span><b>${ranking.classRank || "-"} / ${ranking.classTotal || "-"}</b></div>
            <div class="ranking-card"><span>${escapeHtml(rankScopeText)} Sırası</span><b>${ranking.generalRank || "-"} / ${ranking.generalTotal || "-"}</b></div>
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
              <tr><th>Ders</th><th>Doğru</th><th>Yanlış</th><th>Boş</th><th>Başarı</th><th>Sınıf Ort.</th><th>${escapeHtml(averageLabel)}</th><th>Sınıf Kıyas</th><th>Genel Kıyas</th></tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="9">Seçili derslerde veri yok.</td></tr>`}
              <tr>
                <td><strong>TOPLAM</strong></td>
                <td><strong>${report.total.d}</strong></td>
                <td><strong>${report.total.y}</strong></td>
                <td><strong>${report.total.b}</strong></td>
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
      const subjectsToUse = selected.length ? selected : allSubjects;
      const usesFullSubjectSet = !selected.length || (selected.length === allSubjects.length && allSubjects.every((subject) => selected.includes(subject)));
      const totalPercentSamples = [];
      subjectsToUse.forEach((subject) => subjectMap.set(subject, { name: subject, d: 0, y: 0, b: 0, net: 0, classAverageSamples: [], generalAverageSamples: [] }));

      exams.forEach((exam) => {
        const result = exam.results?.[studentId];
        if (usesFullSubjectSet && isFiniteNumber(result?.total?.percent)) totalPercentSamples.push(result.total.percent);
        const averages = classAverages(exam);
        const generalAverages = participantAverages(exam);
        subjectsToUse.forEach((subject) => {
          const item = result?.subjects?.[subject];
          if (!item) return;
          const target = subjectMap.get(subject);
          target.d += item.d;
          target.y += item.y;
          target.b += item.b;
          target.net += isFiniteNumber(item.net) ? item.net : item.d;
          if (isFiniteNumber(averages[subject])) target.classAverageSamples.push(averages[subject]);
          if (isFiniteNumber(generalAverages[subject])) target.generalAverageSamples.push(generalAverages[subject]);
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
      total.classAverage = average(exams.map(totalClassAverage).filter(isFiniteNumber));
      total.generalAverage = average(exams.map(totalParticipantAverage).filter(isFiniteNumber));
      return { subjects, total };
    }

    function classAverages(exam) {
      const sums = {};
      const counts = {};
      Object.values(exam.results || {}).forEach((result) => {
        Object.entries(result.subjects || {}).forEach(([subject, item]) => {
          if (!isFiniteNumber(item.percent)) return;
          sums[subject] = (sums[subject] || 0) + item.percent;
          counts[subject] = (counts[subject] || 0) + 1;
        });
      });
      return Object.fromEntries(Object.keys(sums).map((subject) => [subject, sums[subject] / counts[subject]]));
    }

    function totalClassAverage(exam) {
      const scores = Object.values(exam.results || {}).map((result) => result.total?.percent).filter(isFiniteNumber);
      return average(scores);
    }

    function getExamParticipants(exam) {
      if (Array.isArray(exam.participants) && exam.participants.length) return exam.participants;
      return makeParticipantsFromResults(exam.results || {});
    }

    function participantAverages(exam) {
      const sums = {};
      const counts = {};
      getExamParticipants(exam).forEach((participant) => {
        Object.entries(participant.result?.subjects || {}).forEach(([subject, item]) => {
          if (!isFiniteNumber(item.percent)) return;
          sums[subject] = (sums[subject] || 0) + item.percent;
          counts[subject] = (counts[subject] || 0) + 1;
        });
      });
      return Object.fromEntries(Object.keys(sums).map((subject) => [subject, sums[subject] / counts[subject]]));
    }

    function totalParticipantAverage(exam) {
      const scores = getExamParticipants(exam).map((participant) => participant.result?.total?.percent).filter(isFiniteNumber);
      return average(scores);
    }

    function buildRankingSummary(studentId, exams) {
      if (exams.length !== 1 || !exams[0].showRankings) return { allowed: false };
      const exam = exams[0];
      const ownResult = exam.results?.[studentId];
      const ownScore = scoreForRanking(ownResult);
      if (!ownResult || !isFiniteNumber(ownScore)) return { allowed: false };
      const classScores = Object.entries(exam.results || {})
        .map(([id, result]) => ({ id, score: scoreForRanking(result) }))
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

    async function renderReportCanvas() {
      const clone = els.reportCard.cloneNode(true);
      const width = els.reportCard.offsetWidth || 900;
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.left = "-10000px";
      iframe.style.top = "0";
      iframe.style.width = `${width}px`;
      iframe.style.height = `${Math.max(els.reportCard.scrollHeight + 80, 1000)}px`;
      iframe.style.border = "0";
      iframe.style.pointerEvents = "none";
      clone.style.width = `${width}px`;
      clone.style.maxWidth = "none";
      clone.style.margin = "0";
      prepareImagesForExport(clone);
      document.body.appendChild(iframe);
      try {
        const doc = iframe.contentDocument;
        const styles = Array.from(document.querySelectorAll("style")).map((style) => style.textContent).join("\n");
        doc.open();
        doc.write(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>${styles}</style></head><body style="margin:0;background:#fffdfa">${clone.outerHTML}</body></html>`);
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
        if (source.startsWith("data:")) return;
        if (img.parentElement?.classList.contains("report-brand-logo") || img.closest(".report-brand-logo")) {
          img.setAttribute("src", SYSTEM_LOGO_DATA_URL);
          return;
        }
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
        const canvas = await renderReportCanvas();
        const mime = type === "jpeg" ? "image/jpeg" : "image/png";
        const link = document.createElement("a");
        link.href = canvas.toDataURL(mime, .94);
        link.download = `karne-${safeFileName(selectedReportName())}.${type === "jpeg" ? "jpg" : "png"}`;
        link.click();
      } catch (error) {
        console.error(error);
        toast("Karne görseli kaydedilemedi. Sayfayı yenileyip tekrar deneyin.");
      }
    }

    async function shareReportWhatsapp() {
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

    function selectedReportStudentForShare() {
      const type = els.reportType?.value || "academic";
      if (type === "rankingList" || type === "classList") return null;
      const id = type === "studentSummary"
        ? els.summaryStudent.value
        : type === "meetings" && els.meetingReportStudent.value !== "__all__"
          ? els.meetingReportStudent.value
          : els.reportStudent.value;
      return state.students.find((item) => item.id === id) || activeStudents()[0] || null;
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
        const canvas = await renderReportCanvas();
        const image = canvas.toDataURL("image/png");
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF("p", "mm", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
        const width = canvas.width * ratio;
        const height = canvas.height * ratio;
        pdf.addImage(image, "PNG", (pageWidth - width) / 2, 8, width, height);
        pdf.save(`karne-${safeFileName(selectedReportName())}.pdf`);
      } catch (error) {
        console.error(error);
        toast("PDF kaydedilemedi. Sayfayı yenileyip tekrar deneyin.");
      }
    }

    function selectedReportName() {
      const type = els.reportType?.value || "academic";
      if (type === "classList") return `${activeClass()?.name || "sinif"}-resimli-sinif-listesi`;
      if (type === "rankingList") return `${selectedRankingExam()?.name || "sinav"}-siralamasi`;
      if (type === "meetings") return `${activeClass()?.name || "sinif"}-veli-gorusme-raporu`;
      if (type === "studentSummary") {
        const selected = state.students.find((item) => item.id === els.summaryStudent.value) || activeStudents()[0];
        return `${fullName(selected || {})}-ogrenci-bilgi-ozeti`;
      }
      const student = state.students.find((item) => item.id === els.reportStudent.value);
      if (type === "comparison") return `${fullName(student || {})}-karsilastirmali-karne`;
      const exam = state.exams.find((item) => item.id === els.reportExam.value);
      return `${fullName(student || {})}-${exam?.name || "tum-sinavlar"}`;
    }

    function exportBackup() {
      const backup = {
        ...state,
        lessonPlannerBackup: readLessonPlannerBackup()
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `kemal-ogretmen-ajandasi-yedek-${today()}.json`;
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
      } catch (error) {
        console.warn(error);
        toast("Ders planlama yedeği geri yüklenemedi; ajanda verileri yüklendi.");
      }
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
          state = normalizeState(imported);
          restoreLessonPlannerBackup(lessonPlannerBackup);
          ensureInitialClass();
          saveState();
          renderAll();
          toast("Yedek yüklendi.");
        } catch (error) {
          toast(error.message || "Yedek okunamadı.");
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
      student.notes = (student.notes || []).filter((item) => item.id !== noteId);
      saveState();
      renderStudentNotes(student);
      renderDashboard();
      renderReportSelectors();
    }

    function deleteMeeting(studentId, meetingId) {
      const student = state.students.find((item) => item.id === studentId);
      if (!student) return;
      student.meetings = (student.meetings || []).filter((item) => item.id !== meetingId);
      saveState();
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
      if (Number.isNaN(date.getTime())) return value;
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
