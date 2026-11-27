/**
 * A percentage (0-100) for display, or null when it is 0: views leave 0% statistics
 * out. A non-zero value too small to show at this precision reads "<1%" / "<0.1%",
 * never "0%".
 */
export function formatPercent(value: number, decimals = 0): string | null {
  if (!(value > 0)) return null
  const text = value.toFixed(decimals)
  if (Number(text) === 0) return `<${(10 ** -decimals).toFixed(decimals)}%`
  return `${text}%`
}
