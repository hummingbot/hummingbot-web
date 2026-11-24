/**
 * The key per-IP limits count. The risk: counting single IPv6 addresses, when
 * one caller holds a whole /64 and can rotate through it past any limit.
 */

import { describe, it, expect } from "vitest"
import { ipLimitKey } from "./request-ip"

describe("ipLimitKey", () => {
  it("keeps IPv4 addresses as they are", () => {
    expect(ipLimitKey("38.47.1.2")).toBe("38.47.1.2")
    expect(ipLimitKey("::ffff:38.47.1.2")).toBe("38.47.1.2")
  })

  it("counts every address in an IPv6 /64 as one", () => {
    const key = "2001:db8:aa:1::/64"
    expect(ipLimitKey("2001:db8:aa:1::1")).toBe(key)
    expect(ipLimitKey("2001:0db8:00aa:0001:dead:beef:0:7")).toBe(key)
    expect(ipLimitKey("2001:DB8:AA:1:ffff:ffff:ffff:ffff")).toBe(key)
    expect(ipLimitKey("2001:db8:aa:1::5%eth0")).toBe(key)
  })

  it("expands :: wherever it sits", () => {
    expect(ipLimitKey("2001:db8::1")).toBe("2001:db8:0:0::/64")
    expect(ipLimitKey("::1")).toBe("0:0:0:0::/64")
    expect(ipLimitKey("64:ff9b::1.2.3.4")).toBe("64:ff9b:0:0::/64")
  })

  it("keeps different /64s apart", () => {
    expect(ipLimitKey("2001:db8:aa:1::1")).not.toBe(ipLimitKey("2001:db8:aa:2::1"))
  })

  it("leaves anything it can't read as it is", () => {
    expect(ipLimitKey("not:an:ip")).toBe("not:an:ip")
  })
})
