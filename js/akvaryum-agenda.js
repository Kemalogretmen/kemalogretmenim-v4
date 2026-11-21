(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./akvaryum-core.js'));
  else root.AquariumAgenda = factory(root.AquariumCore);
})(typeof window === 'object' ? window : globalThis, function (C) {
  'use strict';

  const cleanName = value => C.clean((value || '').normalize('NFC').replace(/\s+/g, ' '));
  const nameKey = value => cleanName(value).toLocaleLowerCase('tr-TR');

  function studentDetails(entry, source) {
    if (!C.validAgendaStudentId(source.id)) return null;
    const firstName = typeof source.firstName === 'string' ? cleanName(source.firstName) : '';
    const name = cleanName(entry.name);
    const date = typeof source.birthDate === 'string' ? source.birthDate : '';
    let birthday = null;
    if (/^[1-9]\d{3}-\d{2}-\d{2}$/.test(date)) {
      const parsed = new Date(date + 'T00:00:00Z');
      if (Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date) {
        birthday = { day: parsed.getUTCDate(), month: parsed.getUTCMonth() + 1 };
      }
    }
    return { id: source.id, name, firstName, birthday, schoolNo: C.clean(source.schoolNo, 16) };
  }

  function plan(students, roster) {
    const named = students.map(student => ({ student, name: nameKey(student.name) }));
    const sources = roster.map(source => ({ source, name: nameKey(source.name), first: nameKey(source.firstName) }));
    const candidates = sources.map(({ source, name, first }) => {
      const linked = named.filter(s => s.student.agendaStudentId === source.id);
      const exact = named.filter(s => s.name === name);
      const short = first ? named.filter(s => s.name === first) : [];
      const matches = linked.length ? linked : exact.length ? exact : short;
      const uniqueId = sources.filter(row => row.source.id === source.id).length === 1;
      const uniqueName = sources.filter(row => row.name === name).length === 1;
      const uniqueFirst = sources.filter(row => row.first === first).length === 1;
      const target = matches[0]?.student;
      const ambiguous = !uniqueId || matches.length > 1 || (!linked.length && (
        !uniqueName || (short.length && (!exact.length || first===name) && !uniqueFirst) || (target && target.agendaStudentId !== undefined)
      ));
      return { source, target, linked: linked.length > 0, exact: exact.length > 0, ambiguous,
        newName: uniqueFirst && source.firstName ? source.firstName : source.name };
    });

    return candidates.map(row => {
      const { source, target, newName } = row;
      const otherMatches = target ? candidates.filter(other => other !== row && !other.ambiguous && other.target?.id === target.id) : [];
      // A saved link or an exact full name takes precedence over a first-name guess.
      const ambiguous = row.ambiguous || otherMatches.some(other => other.linked || !row.linked && (other.exact || !row.exact));
      const unchanged = !source.birthday || (target?.birthday?.day === source.birthday.day && target.birthday.month === source.birthday.month);
      const kind = ambiguous ? 'ambiguous' : !target ? 'add' : !unchanged ? 'update' : row.linked ? 'same' : 'link';
      return { source, kind, newName, targetId: target?.id, targetName: target?.name, previous: target?.birthday };
    });
  }

  function setLink(student, source) {
    const id = source?.id ?? null;
    const previous = student.agendaStudentId;
    const birthday = source?.birthday;
    const changedDate = birthday && (student.birthday?.day !== birthday.day || student.birthday?.month !== birthday.month);
    if (previous === id && !changedDate) return false;
    student.agendaStudentId = id;
    if (birthday) student.birthday = { ...birthday };
    else if (source && previous && previous !== id) delete student.birthday;
    return true;
  }

  function synchronize(classes, sources) {
    const roster = sources.flatMap(source => source.students);
    const byId = new Map();
    for (const source of roster) byId.set(source.id, byId.has(source.id) ? null : source);
    let changed = false;
    for (const cls of classes) {
      const named = sources.filter(source => nameKey(source.name) === nameKey(cls.name));
      const source = cls.agendaClassId ? sources.find(c => c.id === cls.agendaClassId) : named.length === 1 ? named[0] : null;
      const suggestions = source ? plan(cls.students, source.students) : [];
      const links = new Map(suggestions.filter(row => row.kind === 'link' || row.kind === 'update').map(row => [row.targetId, row.source.id]));
      for (const student of cls.students) {
        const id = student.agendaStudentId === undefined ? links.get(student.id) : student.agendaStudentId;
        if (!id || cls.students.some(other => other !== student && other.agendaStudentId === id)) continue;
        const match = byId.get(id);
        if (match && setLink(student, match)) changed = true;
      }
    }
    return changed;
  }

  async function newStudent(classId, row) {
    const student = C.newStudent(row.newName);
    // Two devices importing the same agenda pupil into the same class converge
    // on one record. The public fish ID does not expose the agenda identifier.
    const input = new TextEncoder().encode(JSON.stringify([classId, row.source.id]));
    const digest = await globalThis.crypto.subtle.digest('SHA-256', input);
    student.id = 'agenda-' + Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    student.agendaStudentId = row.source.id;
    if (row.source.birthday) student.birthday = { ...row.source.birthday };
    return student;
  }

  return { studentDetails, plan, newStudent, setLink, synchronize };
});
