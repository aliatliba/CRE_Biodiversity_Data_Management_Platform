import { AxiosError, type AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'
import { getErrorMessage } from './errors'

function axiosError(data: unknown): AxiosError {
  const error = new AxiosError('Request failed')
  error.response = { data, status: 400 } as AxiosResponse
  return error
}

describe('getErrorMessage', () => {
  it('returns a string detail', () => {
    expect(getErrorMessage(axiosError({ detail: 'Nope' }))).toBe('Nope')
  })

  it('reads detail.message', () => {
    expect(getErrorMessage(axiosError({ detail: { message: 'Locked' } }))).toBe('Locked')
  })

  it('joins FastAPI 422 validation messages', () => {
    const err = axiosError({ detail: [{ msg: 'field required' }, { msg: 'too short' }] })
    expect(getErrorMessage(err)).toBe('field required; too short')
  })

  it('never returns [object Object]', () => {
    expect(getErrorMessage(axiosError({ detail: { code: 1 } }), 'fallback')).toBe('fallback')
  })

  it('uses Error.message and falls back for unknown values', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom')
    expect(getErrorMessage(42, 'fallback')).toBe('fallback')
  })
})
