const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom');

test('public analytics text cannot inject markup or event attributes into the admin dashboard',()=>{
  const source=fs.readFileSync('admin/oyunlar-admin.html','utf8');
  const helpers=source.slice(source.indexOf('function formatAnalyticsNumber'),source.indexOf('async function loadGameAnalytics'));
  const escape=source.match(/function esc\(s\)\{[^\n]+\}/)[0];
  const {document}=parseHTML('<div id="gameAnalyticsStatus"></div><div id="gameAnalyticsContent"></div><div id="gameAnalyticsSummary"></div><div id="gameAnalyticsList"></div>');
  const context={document};vm.createContext(context);vm.runInContext(helpers+'\n'+escape,context);
  const path='/oyun/evil" onmouseover="alert(1)',title='<img src=x onerror=alert(1)>';
  context.renderGameAnalytics({games:[{game_path:path,page_title:title,opens:1}]});
  assert.equal(document.querySelector('[onmouseover],[onerror],img'),null);
  assert.equal(document.querySelector('[title]').getAttribute('title'),path);
  assert.ok(document.getElementById('gameAnalyticsList').textContent.includes(title));
});
