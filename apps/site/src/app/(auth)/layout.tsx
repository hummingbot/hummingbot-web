import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"

// Sign in / sign up: Botcamp's forms (src/botcamp/components/auth) centered
// between this site's header and footer.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">{children}</main>
      <SiteFooter />
    </>
  )
}
