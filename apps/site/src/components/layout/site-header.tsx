import { SiteHeaderClient } from "./site-header-client";

/** Site header. Kept as a server entry point so pages can keep awaiting it. */
export async function SiteHeader() {
  return <SiteHeaderClient />;
}
