export function getBrowserInfo(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  const browsers = [
    ['Edg', 'Edge'],
    ['OPR', 'Opera'],
    ['Chrome', 'Chrome'],
    ['Safari', 'Safari'],
    ['Firefox', 'Firefox'],
    ['MSIE', 'IE'],
  ];
  for (const [token, name] of browsers) {
    const idx = ua.indexOf(token);
    if (idx >= 0) {
      const rest = ua.slice(idx + token.length + 1);
      const verMatch = rest.match(/^(\d+(\.\d+)*)/);
      return verMatch ? `${name}/${verMatch[1]}` : name;
    }
  }
  if (ua.includes('Safari')) return 'Safari';
  return 'Other';
}

export function getOSInfo(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (ua.includes('Windows NT 10')) return 'Windows 10+';
  if (ua.includes('Windows NT 6.3')) return 'Windows 8.1';
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS X')) {
    const m = ua.match(/Mac OS X (\d+[._]\d+)/);
    return m ? `macOS ${m[1].replace('_', '.')}` : 'macOS';
  }
  if (ua.includes('Android')) {
    const m = ua.match(/Android (\d+[\.\d]*)/);
    return m ? `Android ${m[1]}` : 'Android';
  }
  if (ua.includes('iPhone OS') || ua.includes('iPad')) {
    const m = ua.match(/OS (\d+_\d+)/);
    return m ? `iOS ${m[1].replace('_', '.')}` : 'iOS';
  }
  if (ua.includes('Linux')) return 'Linux';
  return 'Other';
}

export function getDeviceInfo(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (ua.includes('iPad') || ua.includes('Tablet')) return 'Tablet';
  if (ua.includes('Mobile') || ua.includes('Android')) return 'Mobile';
  return 'Desktop';
}

export function generateFingerprint(): string {
  if (typeof window === 'undefined') return 'server';
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fingerprint', 2, 2);
  }
  const canvasData = canvas.toDataURL().slice(-50);

  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    canvasData,
  ];

  let hash = 0;
  const str = components.join('|');
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function getScreenInfo(): string {
  if (typeof screen === 'undefined') return 'unknown';
  return `${screen.width}x${screen.height}`;
}
