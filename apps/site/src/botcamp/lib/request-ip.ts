// The caller's IP as Vercel reports it (it sets x-forwarded-for itself, so the
// first entry is the client); null when there's no proxy header, as locally.
export function requestIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded || headers.get("x-real-ip")?.trim() || null
}

// What a per-IP limit counts: an IPv4 address as is, an IPv6 address by its
// /64. A home line or a cloud server is handed a whole /64, so counting single
// IPv6 addresses would let one caller rotate past any limit.
export function ipLimitKey(ip: string): string {
  const address = ip.trim().toLowerCase().split("%")[0]
  if (!address.includes(":")) return address
  const mapped = address.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/)
  if (mapped) return mapped[1]

  const [head, tail] = address.split("::")
  const left = head ? head.split(":") : []
  let groups = left
  if (tail !== undefined) {
    const right = tail ? tail.split(":") : []
    // An embedded IPv4 tail (64:ff9b::1.2.3.4) fills two groups.
    const rightWidth = right.length + (right.at(-1)?.includes(".") ? 1 : 0)
    groups = [...left, ...Array(Math.max(0, 8 - left.length - rightWidth)).fill("0"), ...right]
  }
  const prefix = groups.slice(0, 4)
  if (prefix.length < 4 || !prefix.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return address
  return `${prefix.map((g) => parseInt(g, 16).toString(16)).join(":")}::/64`
}
