export type AppUpdate = { version: string; versionCode: number; url: string; publishedAt: string };
const REPOSITORY = '/Kemalogretmen/kemalogretmenim-v4/';

export function compareVersions(a: string, b: string) {
  if (!/^\d+\.\d+\.\d+$/.test(a) || !/^\d+\.\d+\.\d+$/.test(b)) return 0;
  const left = a.split('.').map(Number), right = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
  return 0;
}

export function safeApkUrl(value: unknown) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.port || url.username || url.password || url.search || url.hash || !url.pathname.startsWith(`${REPOSITORY}releases/download/`) || !/\/[^/]+\.apk$/i.test(url.pathname)) return null;
    return url.href;
  } catch { return null; }
}

export function availableUpdate(raw: unknown, currentVersion: string, currentCode: number): AppUpdate | null {
  if (!Array.isArray(raw)) return null;
  const updates: AppUpdate[] = [];
  for (const release of raw.slice(0, 30)) {
    if (!release || release.draft || release.prerelease || typeof release.tag_name !== 'string' || !/^mobile-v(?:\d+|\d+\.\d+\.\d+)$/.test(release.tag_name)) continue;
    // The stable mobile-v4 URL may be reused. Publishing must add this explicit
    // metadata marker; a release's upload timestamp alone is never a version.
    const marker = typeof release.body === 'string' ? release.body.match(/<!--\s*kemal-mobile-version:\s*(\d+\.\d+\.\d+)\s*;\s*android-code:\s*(\d+)\s*-->/) : null;
    const version = marker?.[1];
    const versionCode = Number(marker?.[2]);
    if (!version || !Number.isSafeInteger(versionCode) || versionCode <= currentCode || compareVersions(version, currentVersion) <= 0) continue;
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const asset = assets.find((value: Record<string, unknown>) => {
      if (typeof value?.name !== 'string') return false;
      return (value.name === 'kemal-ogretmenim-v4.apk' || value.name === `Kemal-Ogretmenim-${version}-Android-ARM64-Test.apk` || value.name === `kemal-ogretmenim-${version}.apk`) && safeApkUrl(value.browser_download_url);
    });
    const url = safeApkUrl(asset?.browser_download_url);
    if (url) updates.push({ version, versionCode, url, publishedAt: typeof release.published_at === 'string' ? release.published_at : '' });
  }
  return updates.sort((a, b) => b.versionCode - a.versionCode)[0] || null;
}
