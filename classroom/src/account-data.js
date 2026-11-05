export function mergeAccountValue(key, current, guest) {
  if (Array.isArray(guest)) {
    const merged = [...new Set([...(Array.isArray(current) ? current : []), ...guest])];
    return key === 'checkins' ? merged.sort().slice(-1000) : merged.slice(0, 1000);
  }
  // A returning member's saved practice position wins over a guest position.
  return current === undefined ? guest : current;
}

export function cacheKey(uid, key) { return `puyadao.cloud.${uid}.${key}`; }

export function authErrorMessage(error) {
  const messages = {
    'auth/popup-closed-by-user': '登录窗口已关闭，你可以重新选择登录。',
    'auth/cancelled-popup-request': '请在已打开的登录窗口中继续。',
    'auth/popup-blocked': '浏览器阻止了登录窗口，请允许此网站弹出窗口后重试。',
    'auth/network-request-failed': '网络连接不稳定，请检查网络后重试。',
    'auth/account-exists-with-different-credential': '此邮箱已通过其他方式注册，请使用原来的登录方式。',
    'auth/operation-not-allowed': '此登录方式暂未开放，请选择其他方式。',
    'auth/unauthorized-domain': '当前网址暂未开通登录，请从 puyadao.top 打开。',
    'auth/merge-incomplete': '账号已登录，但部分访客记录尚未合并。请保留当前页面并重试同步。',
    'auth/guest-sync-pending': '访客记录尚未同步，请联网后重试，避免遗漏收藏和进度。',
  };
  return messages[error?.code] || '操作暂未完成，请检查网络后重试。';
}
