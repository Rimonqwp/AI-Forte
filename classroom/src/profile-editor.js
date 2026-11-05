// Local avatars never overwrite the provider's photo or travel to Google.
const avatarKey = uid => `puyadao.profile-avatar.${uid}`;
export function readProfileAvatar(uid, storage = globalThis.localStorage) {
  try {
    const value = uid && storage.getItem(avatarKey(uid));
    return typeof value === 'string' && /^data:image\/(png|jpeg);base64,/.test(value) && value.length <= 150000 ? value : null;
  } catch { return null; }
}

export async function saveProfileEdits({ uid, displayName, photoURL }, { currentUser, updateName, syncProfile, storage = globalThis.localStorage, changed = () => {} }) {
  const name = displayName.trim();
  if (!name || name.length > 100) throw new Error('profile/invalid-name');
  const user = currentUser();
  if (!user || user.isAnonymous || user.uid !== uid) throw new Error('profile/session-changed');
  if (photoURL !== undefined && (!/^data:image\/(png|jpeg);base64,/.test(photoURL) || photoURL.length > 150000)) throw new Error('profile/invalid-avatar');
  if (name !== user.displayName) await updateName(user, name);
  if (currentUser()?.uid !== uid) throw new Error('profile/session-changed');
  // Notify even when browser storage fails after the name was saved remotely.
  try { if (photoURL !== undefined) storage.setItem(avatarKey(uid), photoURL); }
  finally { changed(); }
  let syncPending = false;
  try { await syncProfile(user); } catch { syncPending = true; }
  return { syncPending };
}

export async function prepareAvatar(file) {
  if (!['image/jpeg', 'image/png'].includes(file.type)) throw new Error('请选择 JPG 或 PNG 图片。');
  if (!file.size || file.size > 5 * 1024 * 1024) throw new Error('请选择不超过 5 MB 的图片。');
  const source = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = source; await image.decode();
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    if (!side || image.naturalWidth * image.naturalHeight > 40000000) throw new Error('invalid-image');
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    canvas.getContext('2d').drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 256, 256);
    const result = canvas.toDataURL('image/jpeg', .85);
    if (result.length > 150000) throw new Error('large-image');
    return result;
  } catch { throw new Error('无法读取这张图片，请换一张 JPG 或 PNG 图片。'); }
  finally { URL.revokeObjectURL(source); }
}
