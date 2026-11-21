(function() {
  'use strict';
  let client;
  function publicQuery(columns) {
    if (!client) {
      const config = window.kemalSiteStore.getReadingConfig();
      client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: { storageKey: 'kemal-hece-public', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) },
      });
    }
    return client.from('syllable_streams').select(columns).eq('status', 'published').eq('visibility', 'public');
  }
  window.HeceAkisiPublic = { publicQuery };
})();
