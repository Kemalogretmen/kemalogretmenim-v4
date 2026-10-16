// One-time owner signing identity. Never write its secrets inside the website.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const directory = path.join(os.homedir(), '.local/share/kemalogretmenim-signing');
const properties = path.join(directory, 'aquarium-signing.properties');
const keystore = path.join(directory, 'aquarium-release.p12');
if (fs.existsSync(properties)) { console.log('Mevcut uygulama imzası korunuyor: ' + directory); process.exit(0); }
if (fs.existsSync(keystore)) throw Error('Mevcut imza dosyası korunuyor. Parola dosyasını yedekten geri getirin.');
fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
const javaHome = process.env.JAVA_HOME || (process.platform === 'darwin' ? '/Applications/Android Studio.app/Contents/jbr/Contents/Home' : '');
const password = crypto.randomBytes(32).toString('hex');
const keytool = javaHome ? path.join(javaHome, 'bin', process.platform === 'win32' ? 'keytool.exe' : 'keytool') : 'keytool';
const result = spawnSync(keytool, ['-genkeypair', '-noprompt', '-keystore', keystore, '-storetype', 'PKCS12', '-alias', 'aquarium', '-keyalg', 'RSA', '-keysize', '3072', '-sigalg', 'SHA256withRSA', '-validity', '10000', '-dname', 'CN=Kemal Ogretmenim, O=Kemal Ogretmenim, C=TR', '-storepass:env', 'AQUARIUM_KEY_PASSWORD', '-keypass:env', 'AQUARIUM_KEY_PASSWORD'], {
  env: { ...process.env, AQUARIUM_KEY_PASSWORD: password }, stdio: ['ignore', 'pipe', 'pipe']
});
if (result.error || result.status !== 0) throw Error('İmza anahtarı oluşturulamadı: ' + (result.error?.message || result.stderr.toString()));
fs.chmodSync(keystore, 0o600);
fs.writeFileSync(properties, `storeFile=${keystore.replaceAll('\\', '/') }\nstorePassword=${password}\nkeyAlias=aquarium\nkeyPassword=${password}\n`, { mode: 0o600 });
console.log('Uygulama imzası hazır. Gizli dosyaları güvenli şekilde yedekleyin: ' + directory);
