/* Native shell adaptation. Account credentials stay in HTTPS WebView storage.
   Only an explicit parent-code share/copy or backup uses the origin-bound port. */
(function () {
  'use strict';
  if (window.__aquariumShellInstalled) return;
  if (!['kemalogretmenim.com.tr','www.kemalogretmenim.com.tr'].includes(location.hostname) || location.protocol !== 'https:') return;
  window.__aquariumShellInstalled = true;
  document.documentElement.classList.add('aquarium-native');
  var style = document.createElement('style');
  style.id = 'aquariumNativeStyle';
  style.textContent = [
    '.aquarium-native body{overscroll-behavior:none}',
    '.aquarium-native .topbar .home-link,.aquarium-native .topbar .brand-mark,.aquarium-native .topbar .brand,.aquarium-native .header-divider,.aquarium-native .live-pill{display:none!important}',
    '.aquarium-native .topbar{padding:8px 12px;min-height:56px;gap:8px;flex-wrap:nowrap}',
    '.aquarium-native .class-label{min-width:0;flex:1}.aquarium-native .class-label select{max-width:100%;width:100%;padding-right:22px}',
    '.aquarium-native .header-actions{margin-left:0;flex-shrink:0;gap:6px}',
    '.aquarium-native .header-actions .button{padding:10px;min-height:44px;font-size:12px}',
    '.aquarium-native #modal{max-height:calc(100dvh - 16px);width:min(1120px,calc(100% - 20px));overscroll-behavior:contain;scrollbar-gutter:stable}',
    '.aquarium-native #modal :is(.species-grid,.finder-results,.group-students,.leaderboard,.parent-history-list){max-height:none;overflow:visible}',
    '.aquarium-native #modal .modal-toolbar{position:sticky;top:-1px;z-index:8;background:#103a49;display:flex;justify-content:space-between;align-items:center;padding:6px 0;margin:0 0 10px}',
    '.aquarium-native #modal .modal-back{margin:0;min-height:40px}.aquarium-native #modal .modal-toolbar>.icon-button{width:40px;height:40px}',
    '.aquarium-native .header-actions .button,.aquarium-native .class-label select{transition:background-color .16s ease,color .16s ease}',
    '.aquarium-native #kemalNavMount,.aquarium-native #shortcutDock{display:none!important}',
    '.aquarium-native #googleLoginBtn{display:none!important}',
    '.aquarium-native .login-page{padding:24px 16px;min-height:100dvh;background:linear-gradient(160deg,#082f3d,#0d6574)}',
    '.aquarium-native .login-card{max-width:440px;border-radius:24px}',
    '.aquarium-native .login-card>h1{color:#0b4c59}',
    '.aquarium-native .login-form button{background:#0b6070!important}',
    '@media(max-width:400px){.aquarium-native .header-actions .button{font-size:11px;padding:9px 7px}.aquarium-native .class-label select{font-size:12px}}',
    '@media(orientation:landscape) and (max-height:500px){',
    '.aquarium-native #aquariumApp{height:100dvh;min-height:0;overflow:hidden}',
    '.aquarium-native #aquarium{flex:1 1 0;min-height:0!important;height:auto!important;padding:0}',
    '.aquarium-native .topbar{min-height:48px;padding:2px 10px}',
    '.aquarium-native .class-label select{padding:9px 24px 9px 12px;font-size:12px}',
    '.aquarium-native .demo-banner{padding:4px 12px;font-size:10px}',
    '.aquarium-native .save-line,.aquarium-native .scene-footer,.aquarium-native .scene-heading .eyebrow,.aquarium-native .scene-heading p{display:none}',
    '.aquarium-native #aquarium .scene-heading{top:8px;left:12px;max-width:calc(100% - 330px)}',
    '.aquarium-native .scene-heading h2{font-size:18px;margin:4px 0}',
    '.aquarium-native #aquarium .scene-controls{top:8px;left:auto;right:12px;gap:6px}',
    '.aquarium-native .finder-button span{display:none}.aquarium-native .finder-button{width:40px;padding:0;justify-content:center}',
    '.aquarium-native #aquarium #swimArea{inset:62px 8px 20px;height:auto;min-height:0}',
    '.aquarium-native #aquarium #eggBed{inset:0 8px 6px;height:auto}',
    '.aquarium-native #aquarium .class-pearl{top:auto;bottom:3px;width:96px}',
    '.aquarium-native #modal{padding:10px 16px}.aquarium-native #modal .modal-heading{margin-bottom:10px}.aquarium-native #modal .modal-heading h2{font-size:21px;margin-top:3px}',
    '.aquarium-native .student-panel{position:absolute;inset:8px 8px 8px auto;width:min(340px,calc(100% - 16px));max-height:calc(100% - 16px);margin:0}',
    '.aquarium-native .welcome{top:38%;left:5%;width:90%}.aquarium-native .welcome h2{font-size:26px;margin:8px 0}.aquarium-native .welcome p{font-size:12px;line-height:1.4}.aquarium-native .welcome-tag,.aquarium-native .welcome-footnote{display:none}.aquarium-native .welcome-actions{margin-top:8px}',
    '}'
  ].join('\n');
  document.head.appendChild(style);
  if (/^\/giris(?:\.html)?\/?$/.test(location.pathname)) {
    var intro = document.querySelector('.login-card>p');
    if (intro) intro.textContent = 'Öğretmen hesabınızla akvaryumunuza devam edin. E-posta ve şifrenizle giriş yapabilirsiniz.';
    var hint = document.createElement('p');
    hint.style.cssText = 'font:13px/1.6 system-ui;color:#526773;margin:14px 0';
    hint.textContent = 'Google hesabınızla kayıt olduysanız “Şifremi unuttum” ile bu hesap için şifre oluşturabilirsiniz. Tarayıcı ve uygulama oturumları ayrı saklanır.';
    document.querySelector('.login-help-row')?.after(hint);
  }
  var exportPort = null;
  window.addEventListener('message', function (event) {
    if (event.isTrusted && event.source == null && event.data === 'aquarium-shell-port' && event.ports && event.ports[0]) {
      if (exportPort) exportPort.close();
      exportPort = event.ports[0];
    }
  });
  function send(message) {
    if (window.webkit?.messageHandlers?.aquariumShell) {
      window.webkit.messageHandlers.aquariumShell.postMessage(message);return true;
    }
    if (exportPort) { exportPort.postMessage(JSON.stringify(message));return true; }
    return false;
  }
  function parentAction(access,type,option) {
    if (!/^\/ogretmen\/akvaryum(?:\.html)?\/?$/.test(location.pathname)) return false;
    if (window.navigator?.userActivation && !window.navigator.userActivation.isActive) return false;
    var payload={type:type,studentName:access.studentName,className:access.className,code:access.code,url:access.url};
    payload[type==='shareParent'?'target':'format']=option;
    return send(payload);
  }
  window.AquariumNativeShare = Object.freeze({
    share:function(access,target){return parentAction(access,'shareParent',target||'system');},
    copy:function(access,format){return parentAction(access,'copyParent',format||'message');}
  });
  document.addEventListener('click', async function (event) {
    var link = event.target.closest('a[download]');
    if (!link || !link.href.startsWith('blob:' + location.origin + '/') || (!exportPort && !window.webkit?.messageHandlers?.aquariumShell)) return;
    event.preventDefault();
    try {
      var response = await fetch(link.href), blob = await response.blob();
      if (blob.size > 5 * 1024 * 1024) throw Error('Yedek çok büyük. Tarayıcıdan yedek indirmeyi deneyin.');
      var contents = await blob.text();
      JSON.parse(contents);
      send({ type: 'exportBackup', name: link.download || 'sinif-akvaryumu-yedek.json', contents: contents });
    } catch (error) { window.alert(error.message || 'Yedek hazırlanamadı.'); }
  }, true);
})();
