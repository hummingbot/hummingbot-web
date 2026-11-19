// Single source of truth for the default email signature (Markdown).
// Used by the admin broadcast composer (/admin/notifications) and every
// transactional email so all Botcamp emails share one footer.
//
// Plain string only (no imports) so it is safe to import from both client
// and server components.
export const DEFAULT_EMAIL_SIGNATURE = `---

Questions? Email us at [operations@botcamp.xyz](mailto:operations@botcamp.xyz) or join us in the **#botcamp** channels in the [Hummingbot Discord](http://discord.gg/hummingbot).`
