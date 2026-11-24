import { NextResponse } from "next/server"
import { auth } from "@/botcamp/lib/auth"
import { createConnectCode } from "@/botcamp/lib/connect-code"

// POST /api/condor/connect-code - The signed-in person generates the code
// they paste into Condor to connect it (src/lib/connect-code.ts). Any earlier
// unused code stops working.
export async function POST(): Promise<NextResponse> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await createConnectCode(session.user.id)
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        {
          status: result.status,
          ...(result.retryAfterSeconds && { headers: { "Retry-After": String(result.retryAfterSeconds) } }),
        },
      )
    }
    return NextResponse.json(
      { data: { code: result.code, expiresAt: result.expiresAt.toISOString() } },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("Error creating Condor connect code:", error)
    return NextResponse.json({ error: "Failed to create a code" }, { status: 500 })
  }
}
