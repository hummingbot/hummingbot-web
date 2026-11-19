import { NextResponse } from "next/server"
import JSZip from "jszip"
import { STARTER_AGENT_DIR, STARTER_EMPTY_DIRS, buildStarterAgent } from "@/botcamp/lib/agent-starter-package"

// GET /api/agent-starter - The starter agent as a zip: a complete example in
// the layout Condor installs, with docs/README.md walking through every file. The
// same for everyone and holds nothing private, so it's public and cacheable.
export async function GET(): Promise<NextResponse> {
  try {
    const zip = new JSZip()
    for (const dir of STARTER_EMPTY_DIRS) zip.folder(dir)
    for (const file of buildStarterAgent()) zip.file(file.path, file.content)
    const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${STARTER_AGENT_DIR}.zip"`,
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error) {
    console.error("Failed to build the starter agent:", error)
    return NextResponse.json({ error: "Failed to build the starter agent" }, { status: 500 })
  }
}
