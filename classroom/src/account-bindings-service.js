export function normalizePhone(value) {
  const number = value.trim().replace(/[\s()-]/g, '');
  if (!/^\+[1-9]\d{7,14}$/.test(number)) throw Object.assign(new Error(), { code: 'binding/invalid-phone' });
  return number;
}
export function normalizeEmail(value) {
  const email = value.trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error(), { code: 'auth/invalid-email' });
  return email;
}
export function maskPhone(value) { return value ? value.slice(0, 3) + ' •••• ' + value.slice(-4) : ''; }
export function bindingError(error) {
  const messages = {
    'binding/invalid-phone': '请输入包含国家或地区代码的手机号，例如 +852 9123 4567。',
    'auth/invalid-phone-number': '手机号格式不正确，请检查国家或地区代码。',
    'auth/invalid-email': '请输入有效的邮箱地址。',
    'auth/invalid-verification-code': '验证码不正确，请检查后重试。',
    'auth/code-expired': '验证码已过期，请重新发送。',
    'auth/session-expired': '验证码已过期，请重新发送。',
    'auth/credential-already-in-use': '这个手机号已绑定其他账号，请使用其他号码。',
    'auth/provider-already-linked': '当前账号已绑定手机号，请刷新状态。',
    'auth/email-already-in-use': '这个邮箱已被其他账号使用，请换一个邮箱。',
    'auth/requires-recent-login': '请重新验证 Google 登录，然后继续绑定。',
    'auth/operation-not-allowed': '此验证方式暂未开通，请稍后再试。',
    'auth/admin-restricted-operation': '此验证方式暂未开通，请稍后再试。',
    'auth/too-many-requests': '发送次数过多，请稍后再试。',
    'auth/quota-exceeded': '短信发送额度暂时不足，请稍后再试。',
    'auth/billing-not-enabled': '短信验证暂不可用，请稍后再试。',
    'auth/captcha-check-failed': '安全验证未通过，请重试。',
    'auth/invalid-app-credential': '安全验证未通过，请重试。',
    'auth/unauthorized-domain': '当前网址暂不支持验证，请从 puyadao.top 打开。',
    'auth/unauthorized-continue-uri': '当前网址暂不支持验证，请从 puyadao.top 打开。',
    'auth/network-request-failed': '网络连接不稳定，请检查网络后重试。',
    'binding/refresh-failed': '账号状态刷新失败，请重试刷新。',
    'binding/session-changed': '登录账号已变化，请重新打开账号设定。',
  };
  return messages[error?.code] || '验证未完成，请稍后重试。';
}

// Provider SDK is injected so tests cannot accidentally send real messages.
export function createBindingService({ currentUser, sdk, changed, syncProfile }) {
  const member = uid => {
    const user = currentUser();
    if (!user || user.isAnonymous || user.uid !== uid) throw Object.assign(new Error(), {code:'binding/session-changed'});
    return user;
  };
  const finish = async uid => {
    const user = member(uid);
    try {
      await sdk.reload(user); member(uid);
      await user.getIdToken(true); member(uid);
    } catch (error) {
      member(uid); changed();
      throw Object.assign(new Error(), {code:'binding/refresh-failed'});
    }
    changed();
    try { await syncProfile(user); } catch { /* Auth is authoritative; existing sign-in sync retries SQL. */ }
    return user;
  };
  return {
    async sendPhone(uid, value, verifier) {
      const phone = normalizePhone(value), user = member(uid);
      if (user.phoneNumber) throw Object.assign(new Error(), {code:'auth/provider-already-linked'});
      const confirmation = await sdk.linkWithPhoneNumber(user, phone, verifier);
      member(uid);
      return { phone, async confirm(code) {
        if (!/^\d{6}$/.test(code.trim())) throw Object.assign(new Error(), {code:'auth/invalid-verification-code'});
        member(uid); await confirmation.confirm(code.trim()); member(uid);
        return finish(uid);
      } };
    },
    async sendEmail(uid, value, returnUrl) {
      const email = normalizeEmail(value), user = member(uid);
      const settings = { url: returnUrl, handleCodeInApp: false };
      // The provider applies the new email only after the recipient verifies it.
      if (email.toLowerCase() === user.email?.toLowerCase()) await sdk.sendEmailVerification(user, settings);
      else await sdk.verifyBeforeUpdateEmail(user, email, settings);
      member(uid);
      return email;
    },
    refresh: finish,
    async reauthenticate(uid) {
      const user = member(uid);
      await sdk.reauthenticateWithPopup(user, new sdk.GoogleAuthProvider()); member(uid);
      return finish(uid);
    },
  };
}
