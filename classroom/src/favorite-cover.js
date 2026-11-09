export async function prepareFolderCover(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('请选择 JPG、PNG 或 WebP 图片。');
  if (!file.size || file.size > 5 * 1024 * 1024) throw new Error('请选择不超过 5 MB 的图片。');
  const source = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = source; await image.decode();
    const width = image.naturalWidth, height = image.naturalHeight;
    if (!width || !height || width * height > 40000000) throw new Error('invalid-image');
    const cropWidth = Math.min(width, height * 2), cropHeight = cropWidth / 2;
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 320;
    canvas.getContext('2d').drawImage(image, (width - cropWidth) / 2, (height - cropHeight) / 2, cropWidth, cropHeight, 0, 0, 640, 320);
    const result = canvas.toDataURL('image/jpeg', .85);
    if (result.length > 400000) throw new Error('large-image');
    return result;
  } catch { throw new Error('无法读取这张图片，请换一张图片。'); }
  finally { URL.revokeObjectURL(source); }
}
