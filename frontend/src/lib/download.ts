/** Save a Blob as a file through a temporary <a download> link. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoking synchronously can cancel the download in Firefox and Safari.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
