import JSZip from "jszip"

// The agent folder an author picks or drops in the browser, zipped there and
// uploaded as one file: the upload routes take a zip (readAgentUpload), and
// the package check runs on it exactly as before. Browser-only.

/** A file from the picked folder, with its path inside it. */
export interface FolderFile {
  path: string
  file: File
}

// Never part of an agent: version control, dependencies, caches. Skipped
// before zipping so a repo's .git can't blow the size limit; the package
// check ignores them too (IGNORED_SEGMENTS in agent-package.ts).
const SKIPPED_SEGMENTS = new Set([
  ".git", "node_modules", "__pycache__", ".venv", ".pytest_cache", "__MACOSX", ".DS_Store",
])

// Far above any real agent; stops a wrong folder (a home directory) from
// being read into memory before the zip's own size check.
const MAX_FOLDER_BYTES = 20 * 1024 * 1024
const MAX_FOLDER_FILES = 2000

export class FolderTooLargeError extends Error {}

function keep(path: string): boolean {
  return !path.split("/").some((segment) => SKIPPED_SEGMENTS.has(segment))
}

/** The files of a folder picked with `<input webkitdirectory>`. */
export function filesFromFolderInput(list: FileList): FolderFile[] {
  return Array.from(list)
    .map((file) => ({ path: file.webkitRelativePath || file.name, file }))
    .filter((f) => keep(f.path))
}

// FileSystemEntry API, which a dropped folder is read through.
interface Entry {
  isFile: boolean
  isDirectory: boolean
  name: string
  file?: (resolve: (file: File) => void, reject: (error: unknown) => void) => void
  createReader?: () => { readEntries: (resolve: (entries: Entry[]) => void, reject: (error: unknown) => void) => void }
}

async function readEntry(entry: Entry, prefix: string, into: FolderFile[]): Promise<void> {
  const path = prefix ? `${prefix}/${entry.name}` : entry.name
  if (!keep(path)) return
  if (into.length > MAX_FOLDER_FILES) throw new FolderTooLargeError("That folder has too many files to be an agent")
  if (entry.isFile && entry.file) {
    const file = await new Promise<File>((resolve, reject) => entry.file!(resolve, reject))
    into.push({ path, file })
  } else if (entry.isDirectory && entry.createReader) {
    const reader = entry.createReader()
    // readEntries hands back the folder in batches until an empty one.
    for (;;) {
      const batch = await new Promise<Entry[]>((resolve, reject) => reader.readEntries(resolve, reject))
      if (batch.length === 0) break
      for (const child of batch) await readEntry(child, path, into)
    }
  }
}

/**
 * The files of a folder dropped on the page, or null when what was dropped
 * isn't a folder (a single file, a zip, text).
 */
export async function filesFromDrop(transfer: DataTransfer): Promise<FolderFile[] | null> {
  const entries = Array.from(transfer.items)
    .map((item) => (item.webkitGetAsEntry?.() as Entry | null) ?? null)
    .filter((entry): entry is Entry => entry !== null)
  if (entries.length !== 1 || !entries[0].isDirectory) return null
  const files: FolderFile[] = []
  await readEntry(entries[0], "", files)
  return files
}

/** The folder's name: the first segment its files share. */
export function folderName(files: FolderFile[]): string {
  return files[0]?.path.split("/")[0] || "agent"
}

/** Zips the folder's files, keeping their paths, for the upload routes. */
export async function zipFolder(files: FolderFile[]): Promise<Blob> {
  const total = files.reduce((sum, f) => sum + f.file.size, 0)
  if (files.length > MAX_FOLDER_FILES || total > MAX_FOLDER_BYTES) {
    throw new FolderTooLargeError("That folder is too large to be an agent — is it the agent's own folder?")
  }
  const zip = new JSZip()
  for (const { path, file } of files) zip.file(path, file)
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" })
}
