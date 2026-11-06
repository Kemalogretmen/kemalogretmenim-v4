(function(root) {
  'use strict';
  var KEY = 'kemalOgretmenAjandasi.v1';
  function owner(state) {
    var p = state && state.profile;
    return state && state.user && p && p.role === 'teacher' && p.active !== false &&
      (!p.approval_status || p.approval_status === 'active') ? state.user.id : '';
  }
  function roster(data, details) {
    if(!data || !Array.isArray(data.classes) || !Array.isArray(data.students)) return [];
    return data.classes.filter(function(c) { return c && typeof c.id === 'string'; }).slice(0, 100).map(function(c) {
      var students = data.students.filter(function(s) { return s && s.classId === c.id; }).slice(0, 200).map(function(s, i) {
        var entry = { id: String(s.id || i), name: [s.firstName, s.lastName].filter(function(v) { return typeof v === 'string'; }).join(' ').trim().replace(/[\r\n,;]/g, ' ').slice(0, 120) };
        return details ? details(entry, s) : entry;
      }).filter(function(s) { return s && s.name; });
      return { id: c.id, name: String(c.name || 'Sınıf').slice(0, 80), students: students, active: data.activeClassId === c.id };
    }).filter(function(c) { return c.students.length; });
  }
  async function load(auth, storage, { details, signal } = {}) {
    if(!auth) return { classes: [], status: 'guest' };
    var state = await auth.ready(), id = owner(state);
    if(!id) return { classes: [], status: 'guest' };
    function current() { return owner(auth.getState()) === id; }
    function local() {
      try { return storage.getItem(KEY + '.owner') === id ? roster(JSON.parse(storage.getItem(KEY)), details) : []; }
      catch(error) { return []; }
    }
    try {
      var query = auth.getClient().from('teacher_agenda_states').select('agenda_state').eq('user_id', id).maybeSingle();
      var result = await (signal && query.abortSignal ? query.abortSignal(signal) : query);
      if(!current()) return { classes: [], status: 'guest' };
      if(result.error) throw result.error;
      if(!result.data) { var cached = local(); if(cached.length) return { classes: cached, status: 'local', owner: id }; }
      return { classes: roster(result.data && result.data.agenda_state, details), status: 'cloud', owner: id };
    } catch(error) {
      if(!current()) return { classes: [], status: 'guest' };
      var classes = local();
      if(classes.length) return { classes: classes, status: 'local', owner: id };
      return { classes: [], status: 'error', owner: id };
    }
  }
  root.SmartboardRoster = { load: load, roster: roster, owner: owner };
  if(typeof module !== 'undefined' && module.exports) module.exports = root.SmartboardRoster;
})(typeof window !== 'undefined' ? window : globalThis);
