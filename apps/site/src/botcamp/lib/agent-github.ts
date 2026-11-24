import { AGENT_PACKAGE_LIMITS, AgentPackageReadError, readAgentZip, type AgentPackageFile } from "@/botcamp/lib/agent-package"

// Fetches an agent package from a GitHub link, pinned to a commit: the ref
// (branch, tag, or SHA; default branch when absent) is resolved to a SHA
// first, and the zipball is taken at that SHA, so the stored snapshot is
// exactly the commit that was checked. A /tree/<ref>/<path> link narrows the
// package to that folder, for repos holding several agents.

export interface GitHubAgentLink {
  owner: string
  repo: string
  ref?: string
  path?: string
}

export function parseGitHubAgentLink(url: string): GitHubAgentLink | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== "github.com") return null
  const [owner, rawRepo, kind, ref, ...rest] = parsed.pathname.split("/").filter(Boolean)
  if (!owner || !rawRepo) return null
  const repo = rawRepo.replace(/\.git$/, "")
  if (!kind) return { owner, repo }
  if (kind !== "tree" || !ref) return null
  return { owner, repo, ref, path: rest.length ? rest.join("/") : undefined }
}

const NAME = /^[A-Za-z0-9_.-]+$/

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": "botcamp-agent-upload",
    Accept: "application/vnd.github+json",
  }
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  return headers
}

// Zipballs often arrive without content-length, so the cap is counted as the
// body streams in rather than trusted from a header.
async function readCapped(res: Response, maxBytes: number): Promise<Buffer> {
  const tooLarge = () =>
    new AgentPackageReadError("Repository archive is too large — link the agent folder instead")
  if (Number(res.headers.get("content-length") ?? 0) > maxBytes) throw tooLarge()
  if (!res.body) return Buffer.alloc(0)
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw tooLarge()
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks)
}

export async function fetchGitHubAgent(
  link: GitHubAgentLink,
): Promise<{ sha: string; files: AgentPackageFile[] }> {
  if (!NAME.test(link.owner) || !NAME.test(link.repo)) {
    throw new AgentPackageReadError("Invalid GitHub owner or repo")
  }
  const repoApi = `https://api.github.com/repos/${link.owner}/${link.repo}`

  // GITHUB_TOKEN only lifts the rate limit. If it can also read private
  // repos, refuse them here so no upload can pull one through it.
  const repoRes = await fetch(repoApi, { headers: githubHeaders() })
  if (repoRes.status === 404) {
    throw new AgentPackageReadError("Repository or ref not found — is the repo public?")
  }
  if (!repoRes.ok) throw new Error(`GitHub repo lookup HTTP ${repoRes.status}`)
  if (((await repoRes.json()) as { private?: boolean }).private !== false) {
    throw new AgentPackageReadError("Only public repositories can be imported")
  }

  const commitRes = await fetch(`${repoApi}/commits/${encodeURIComponent(link.ref ?? "HEAD")}`, {
    headers: githubHeaders(),
  })
  if (commitRes.status === 404 || commitRes.status === 422) {
    throw new AgentPackageReadError("Repository or ref not found — is the repo public?")
  }
  if (!commitRes.ok) throw new Error(`GitHub commit lookup HTTP ${commitRes.status}`)
  const { sha } = (await commitRes.json()) as { sha: string }

  const zipRes = await fetch(`${repoApi}/zipball/${sha}`, { headers: githubHeaders() })
  if (!zipRes.ok) throw new Error(`GitHub zipball HTTP ${zipRes.status}`)
  const all = await readAgentZip(await readCapped(zipRes, AGENT_PACKAGE_LIMITS.maxTotalBytes * 4))

  // GitHub wraps the tree in `<owner>-<repo>-<sha>/`; strip it, then narrow
  // to the linked folder.
  const scope = link.path ? `${link.path.replace(/\/+$/, "")}/` : ""
  const files = all.flatMap((f) => {
    const rel = f.path.slice(f.path.indexOf("/") + 1)
    if (!rel.startsWith(scope)) return []
    return [{ ...f, path: rel.slice(scope.length) }]
  })
  if (scope && files.length === 0) {
    throw new AgentPackageReadError(`Folder ${link.path} not found at ${sha.slice(0, 7)}`)
  }
  return { sha, files }
}
