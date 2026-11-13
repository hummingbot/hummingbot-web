// Where cohort, sponsorship and liquidity inquiries go. These are plain
// mailto: links rather than a web form: the public form was the one endpoint
// that let anyone send our team email without an account, and on 2026-10-29 a
// prober rotated IPs through it. A person's own mail client sends from their
// real address, through the receiving side's spam filtering.
export const OPERATIONS_EMAIL = "operations@botcamp.xyz"

/** A mailto: link to operations with the subject filled in. */
export function operationsMailto(subject: string): string {
  return `mailto:${OPERATIONS_EMAIL}?subject=${encodeURIComponent(subject)}`
}
