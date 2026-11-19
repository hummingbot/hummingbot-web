/**
 * One mailbox, one new account. The risk: "+tag" and dot spellings of a single
 * inbox each making a fresh account — the 2026-10-29 prober moved to
 * jadenwu39+wv70d@gmail.com once throwaway domains were refused.
 */

import { describe, it, expect } from "vitest"
import { canonicalMailbox } from "./email-alias"

describe("canonicalMailbox", () => {
  it.each([
    ["jadenwu39+wv70d@gmail.com", "jadenwu39@gmail.com"],
    ["Jaden.Wu39@GMAIL.com", "jadenwu39@gmail.com"],
    ["jaden.wu.39+x@googlemail.com", "jadenwu39@gmail.com"],
    // Outside Gmail, dots are part of the address; only the +tag goes.
    ["max.gnesi+bots@hummingbot.org", "max.gnesi@hummingbot.org"],
    ["mike@hummingbot.org", "mike@hummingbot.org"],
  ])("%s → %s", (email, mailbox) => {
    expect(canonicalMailbox(email)).toBe(mailbox)
  })
})
