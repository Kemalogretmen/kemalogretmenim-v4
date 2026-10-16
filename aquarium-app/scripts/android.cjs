const { spawnSync } = require('node:child_process');
const { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { homedir } = require('node:os');
const { createHash } = require('node:crypto');
const root = resolve(__dirname, '..');
const env = { ...process.env };
if (!env.JAVA_HOME && process.platform === 'darwin') {
  const bundled = '/Applications/Android Studio.app/Contents/jbr/Contents/Home';
  if (existsSync(bundled)) env.JAVA_HOME = bundled;
}
if (!env.ANDROID_HOME && process.platform === 'darwin') {
  const sdk = join(homedir(), 'Library/Android/sdk');
  if (existsSync(sdk)) env.ANDROID_HOME = sdk;
}
const lint = process.argv.includes('--lint');
const release = process.argv.includes('--release');
if (release && !existsSync(env.AQUARIUM_SIGNING_PROPERTIES || join(homedir(), '.local/share/kemalogretmenim-signing/aquarium-signing.properties'))) {
  throw Error('Önce npm run android:signing-setup ile özel imza oluşturun.');
}
const executable = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const result = spawnSync(executable, ['--no-daemon', lint ? ':app:lintDebug' : release ? ':app:assembleRelease' : ':app:assembleDebug'], {
  cwd: join(root, 'android'), env, stdio: 'inherit', shell: process.platform === 'win32'
});
if (result.error) { console.error(result.error.message); process.exit(1); }
if (result.status !== 0) process.exit(result.status || 1);
if (!lint) {
  const version = JSON.parse(readFileSync(join(root, 'shared/app-config.json'))).version;
  const name = `Sinif-Akvaryumu-${version}${release ? '' : '-deneme'}.apk`;
  const dist = join(root, 'dist'); mkdirSync(dist, { recursive: true });
  copyFileSync(join(root, `android/app/build/outputs/apk/${release ? 'release/app-release.apk' : 'debug/app-debug.apk'}`), join(dist, name));
  const digest = createHash('sha256').update(readFileSync(join(dist, name))).digest('hex');
  writeFileSync(join(dist, name + '.sha256'), `${digest}  ${name}\n`);
  console.log(`\nAndroid ${release ? 'imzalı' : 'deneme'} APK: ${join(dist, name)}\nSHA-256: ${digest}`);
}
