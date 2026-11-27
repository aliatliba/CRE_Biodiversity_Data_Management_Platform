/** Longest side of an uploaded photo, in pixels: sharp on a wide screen, light to store. */
export const PHOTO_MAX_DIMENSION = 1920
const QUALITY = 0.85
/** Files above this are refused before decoding (decoding a huge image can freeze the tab). */
export const PHOTO_MAX_INPUT_BYTES = 30 * 1024 * 1024
export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp'

export interface PreparedPhoto {
  blob: Blob
  width: number
  height: number
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY))
}

/**
 * Shrink and re-encode a chosen photo before upload: at most PHOTO_MAX_DIMENSION
 * pixels on the longest side, WebP (JPEG where the browser cannot encode WebP).
 * Typically turns a 5-10 MB camera file into a few hundred KB. Re-encoding also
 * drops the file's metadata (EXIF, including any GPS position).
 *
 * Throws an Error with a user-facing message when the file is not a usable image.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file (JPEG, PNG or WebP).')
  }
  if (file.size > PHOTO_MAX_INPUT_BYTES) {
    throw new Error('This image is too large (max 30 MB).')
  }

  let bitmap: ImageBitmap
  try {
    // Applies the EXIF orientation, so phone photos are not sideways.
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('This image could not be read. Use a JPEG, PNG or WebP file.')
  }

  try {
    const scale = Math.min(1, PHOTO_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Your browser could not process this image.')
    // JPEG has no transparency: transparent PNG areas would otherwise turn black.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)

    // Browsers that cannot encode WebP silently return a PNG instead.
    let blob = await toBlob(canvas, 'image/webp')
    if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg')
    if (!blob) throw new Error('Your browser could not process this image.')
    return { blob, width, height }
  } finally {
    bitmap.close()
  }
}
