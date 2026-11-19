/**
 * Returns a filename that doesn't collide with anything in `existing`.
 * If `desired` is free, returns it unchanged; otherwise appends " (n)"
 * before the extension: "foo.py" → "foo (1).py" → "foo (2).py" → ...
 */
export function resolveUniqueFilename(desired: string, existing: Set<string>): string {
  if (!existing.has(desired)) return desired

  const dot = desired.lastIndexOf(".")
  const hasExt = dot > 0 && dot < desired.length - 1
  const base = hasExt ? desired.slice(0, dot) : desired
  const ext = hasExt ? desired.slice(dot) : ""

  for (let n = 1; n < 10000; n++) {
    const candidate = `${base} (${n})${ext}`
    if (!existing.has(candidate)) return candidate
  }
  return `${base} (${Date.now()})${ext}`
}

export const MAX_FILENAME_LENGTH = 255

/**
 * An uploaded file's name made safe to store, to use as a path inside a zip,
 * and to send in a download header: control characters (CR/LF would inject
 * headers) and backslashes go, and so do empty, "." and ".." segments, so
 * "../../evil.txt" can't write outside the folder it's extracted to. Folders
 * stay ("controllers/x.py"): agent and fleet imports store them. Null when
 * nothing is left or it's longer than MAX_FILENAME_LENGTH.
 */
export function sanitizeUploadFilename(name: string): string | null {
  const cleaned = name
    .replace(/[\x00-\x1f\x7f]/g, "")
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .join("/")
  if (!cleaned || cleaned.length > MAX_FILENAME_LENGTH) return null
  return cleaned
}

/**
 * A Content-Disposition value that downloads `filename` under its last path
 * segment: an ASCII fallback for old clients, plus the RFC 5987 UTF-8 form.
 * Safe for any stored name, including ones saved before uploads were sanitized.
 */
export function attachmentDisposition(filename: string): string {
  const name = sanitizeUploadFilename(filename)?.split("/").pop() ?? "download"
  const asciiFallback = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_")
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(name)}`
}
