import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/botcamp/lib/auth"
import { validateAgentPackage } from "@/botcamp/lib/agent-package"
import { packageReadLimitError, readAgentUpload } from "@/botcamp/lib/agent-upload"
import { venuesInPackage } from "@/botcamp/lib/agent-package-venues"
import { getExistingValues, resolveToExisting } from "@/botcamp/lib/strategy-tags"

// POST /api/user/agent-packages/check - Run the structure check on an agent
// package without storing anything: the same zipped agent folder (multipart
// `file`) the upload takes, read and checked the same way.
// Lets the New Agent flow show what Condor will install, what it leaves out
// and what has to be fixed before anything goes to review. Nothing is stored,
// so it doesn't count toward the daily upload limit — but reading a package
// is capped per hour (packageReadLimitError).
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      const limited = await packageReadLimitError(session.user.id)
      if (limited) return limited
    }

    const read = await readAgentUpload(request)
    if (read.error) return read.error
    const { files, source, sourceRef } = read.upload

    const report = validateAgentPackage(files)
    // Where it trades, as the site's own exchanges, to prefill the page —
    // read from every file uploaded, left-out configs included. Venues the
    // site doesn't list are left for the author to pick.
    const exchanges = report.ok
      ? resolveToExisting(venuesInPackage(files), (await getExistingValues()).exchanges).resolved
      : []
    return NextResponse.json({
      data: report.ok
        ? {
            ok: true,
            manifest: report.manifest,
            description: report.description,
            exchanges,
            warnings: report.warnings,
            tree: report.tree,
            source,
            sourceRef,
          }
        : { ok: false, errors: report.errors, warnings: report.warnings, tree: report.tree, source, sourceRef },
    })
  } catch (error) {
    console.error("Error checking agent package:", error)
    return NextResponse.json({ error: "Failed to check the agent package" }, { status: 500 })
  }
}
