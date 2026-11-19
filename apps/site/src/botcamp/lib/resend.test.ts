/**
 * Email bodies carry user-controlled text (strategy titles, names) and are
 * sent from our own address. The risk: unescaped markup putting links or a
 * fake form into a staff email — the 2026-10-29 probe's "Mail Probe"
 * strategies tested exactly the new-strategy emails.
 */

import { describe, it, expect } from "vitest"
import { emailTemplates } from "./resend"

const MARKUP = `<a href="https://evil.example">Sign in</a>`

describe("emailTemplates", () => {
  it.each([
    ["strategyCreatedAdmin", emailTemplates.strategyCreatedAdmin({ adminName: "team", authorNames: MARKUP, strategyTitle: MARKUP, adminUrl: "https://www.botcamp.xyz/admin/strategies/1" })],
    ["strategyCreated", emailTemplates.strategyCreated({ userName: MARKUP, strategyTitle: MARKUP, strategyUrl: "https://www.botcamp.xyz/dashboard/strategies/1" })],
    // highlightBox and the preheader interpolate the title too.
    ["strategyStatusUpdate", emailTemplates.strategyStatusUpdate({ userName: "x", strategyTitle: MARKUP, statusLabel: "Approved", message: "m", strategyUrl: "https://www.botcamp.xyz/s" })],
  ])("%s escapes user text in the HTML body", (_name, email) => {
    expect(email.html).not.toContain(MARKUP)
    expect(email.html).toContain("&lt;a href=&quot;https://evil.example&quot;&gt;Sign in&lt;/a&gt;")
  })
})
