/**
 * Shared formatting utilities for consistent date, time, and file size display
 */

/**
 * Format a date to a human-readable string
 * @param date - Date object or string
 * @param options - Intl.DateTimeFormatOptions for customization
 * @returns Formatted date string (e.g., "Jan 15, 2025")
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  }
): string {
  // Event dates are stored as midnight UTC (date-only semantics). Format in UTC
  // so they don't shift to the previous day in negative-offset timezones.
  return new Date(date).toLocaleDateString("en-US", { timeZone: "UTC", ...options })
}

/**
 * Format a date with time
 * @param date - Date object or string
 * @returns Formatted date with time string (e.g., "Jan 15, 2025 at 3:30 PM")
 */
export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

/**
 * Format a date relative to now (e.g., "2 days ago", "in 3 hours")
 * @param date - Date object or string
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const target = new Date(date)
  const diffMs = target.getTime() - now.getTime()
  const diffSeconds = Math.floor(Math.abs(diffMs) / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  const isPast = diffMs < 0
  const suffix = isPast ? "ago" : "from now"

  if (diffDays > 30) {
    return formatDate(date)
  } else if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ${suffix}`
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ${suffix}`
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ${suffix}`
  } else {
    return "just now"
  }
}

/**
 * Format duration in minutes to human-readable string
 * @param minutes - Duration in minutes
 * @returns Formatted duration (e.g., "1h 30m", "45m", "2h")
 */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return "0m"

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

/**
 * Format file size in bytes to human-readable string
 * @param bytes - File size in bytes
 * @returns Formatted file size (e.g., "1.5 MB", "500 KB", "128 B")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 0) return "0 B"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

/**
 * Format a number with thousands separators
 * @param num - Number to format
 * @returns Formatted number string (e.g., "1,234,567")
 */
export function formatNumber(num: number): string {
  return num.toLocaleString("en-US")
}

/**
 * Format a percentage
 * @param value - Value (0-1 or 0-100)
 * @param isDecimal - Whether value is decimal (0-1) or percentage (0-100)
 * @returns Formatted percentage string (e.g., "75%")
 */
export function formatPercentage(value: number, isDecimal = true): string {
  const percentage = isDecimal ? value * 100 : value
  return `${Math.round(percentage)}%`
}

/**
 * Format currency amount
 * @param amount - Amount in dollars
 * @param currency - Currency code (default: USD)
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount)
}

/**
 * Format price in cents to human-readable string
 * @param cents - Price in cents
 * @returns Formatted price string (e.g., "Free", "$29", "$1,500")
 */
export function formatPriceCents(cents: number): string {
  if (cents === 0) return "Free"
  const dollars = cents / 100
  // Use integer format for whole dollars, decimal for fractional
  if (Number.isInteger(dollars)) {
    return `$${dollars.toLocaleString("en-US")}`
  }
  return `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
