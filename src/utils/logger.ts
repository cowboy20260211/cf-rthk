import { getBrowserInfo, getOSInfo, getDeviceInfo, generateFingerprint, getScreenInfo } from './fingerprint';

let hasLogged = false;

export function sendAccessLog(path?: string) {
  if (hasLogged || typeof window === 'undefined') return;
  hasLogged = true;

  const data = {
    browser: getBrowserInfo(),
    os: getOSInfo(),
    device: getDeviceInfo(),
    fingerprint: generateFingerprint(),
    screen: getScreenInfo(),
    lang: navigator.language || '',
    path: path || window.location.pathname,
    referrer: document.referrer || '',
  };

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/log', JSON.stringify(data));
    } else {
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true,
      }).catch(() => {});
    }
  } catch (e) {}
}
