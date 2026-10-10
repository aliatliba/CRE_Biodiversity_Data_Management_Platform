import axios from 'axios'

interface ValidationIssue {
  msg?: unknown
}

function fromDetail(detail: unknown): string | null {
  if (typeof detail === 'string') return detail.trim() || null

  // FastAPI 422: [{ loc: [...], msg: '...', type: '...' }, ...]
  if (Array.isArray(detail)) {
    const messages = detail
      .map((issue: ValidationIssue) => (typeof issue?.msg === 'string' ? issue.msg : null))
      .filter((m): m is string => Boolean(m))
    return messages.length > 0 ? messages.join('; ') : null
  }

  if (detail && typeof detail === 'object' && 'message' in detail) {
    const message = (detail as { message: unknown }).message
    return typeof message === 'string' ? message : null
  }

  return null
}

/**
 * Turn any thrown value into a message that is safe to show to the user:
 * Axios errors (string `detail`, `detail.message`, FastAPI 422 arrays), plain
 * Errors, and anything else (-> `fallback`). Never returns "[object Object]".
 */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { detail?: unknown } | undefined
    return fromDetail(data?.detail) ?? fallback
  }
  if (err instanceof Error && err.message) return err.message
  return fallback
}
