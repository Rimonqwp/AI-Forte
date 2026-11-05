// Keep account transitions separate from the provider SDK so failure paths can
// be verified without real third-party accounts or credentials.
export async function authenticateProvider({ user, openPopup, prepareGuest, credentialFromError, signInCredential, rememberMerge, resumeData }) {
  const guest = user?.isAnonymous ? user : null;
  const backup = guest ? prepareGuest(guest.uid).then(records => ({ records }), error => ({ error })) : null;
  let result;
  try { result = await openPopup(guest); }
  catch (error) {
    if (!guest || error.code !== 'auth/credential-already-in-use') throw error;
    const prepared = await backup;
    if (prepared.error) throw prepared.error;
    const credential = credentialFromError(error);
    if (!credential) throw error;
    result = await signInCredential(credential);
    rememberMerge(result.user.uid, prepared.records);
  }
  await resumeData(result.user);
  return { user: result.user, changedUid: !!guest && guest.uid !== result.user.uid };
}

// Password sign-in must not accidentally register a new account by linking a guest.
export async function authenticatePassword({ user, email, password, prepareGuest, signIn, rememberMerge, resumeData }) {
  const guest = user?.isAnonymous ? user : null;
  const records = guest ? await prepareGuest(guest.uid) : null;
  const result = await signIn(email, password);
  const changedUid = !!guest && guest.uid !== result.user.uid;
  if (changedUid) rememberMerge(result.user.uid, records);
  await resumeData(result.user);
  return {user:result.user, changedUid};
}
