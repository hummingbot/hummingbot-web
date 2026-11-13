'use client'

import { useState, useCallback } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Button } from '@/botcamp/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/botcamp/components/ui/card'
import { Badge } from '@/botcamp/components/ui/badge'
import {
  FileCode,
  Download,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/botcamp/lib/utils'
import { formatFileSize } from '@/botcamp/lib/format'
import { alertColors } from '@/botcamp/lib/design-constants'
import { ReadOnlyHint } from "@/botcamp/components/ui/read-only"

interface StrategyFile {
  id: string
  type: 'FILE' | 'LINK'
  filename: string
  mimeType: string | null
  size: number | null
  url: string | null
  sortOrder: number
}

interface StrategyCodeViewerProps {
  files: StrategyFile[]
  strategySlug: string
}

// MIME types and extensions that can be displayed as code
const CODE_EXTENSIONS = [
  '.py', '.js', '.ts', '.jsx', '.tsx', '.json', '.yaml', '.yml',
  '.txt', '.md', '.csv', '.xml', '.html', '.css', '.sh', '.bash',
  '.toml', '.ini', '.conf', '.config',
]

function isCodeFile(file: StrategyFile): boolean {
  if (file.type === 'LINK') return false
  const ext = file.filename.toLowerCase().slice(file.filename.lastIndexOf('.'))
  return CODE_EXTENSIONS.includes(ext)
}

function getLanguageFromFilename(filename: string): string {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'))
  const languageMap: Record<string, string> = {
    '.py': 'python',
    '.js': 'javascript',
    '.ts': 'typescript',
    '.jsx': 'javascript',
    '.tsx': 'typescript',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.md': 'markdown',
    '.html': 'html',
    '.css': 'css',
    '.sh': 'bash',
    '.bash': 'bash',
  }
  return languageMap[ext] || 'text'
}

// Code file tab component
function CodeFileTab({
  file,
  isActive,
  onClick,
}: {
  file: StrategyFile
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
        isActive
          ? 'border-primary text-primary bg-primary/5'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
      )}
    >
      {file.filename}
    </button>
  )
}

// Code content display
function CodeContent({
  file,
  strategySlug,
}: {
  file: StrategyFile
  strategySlug: string
}) {
  const [content] = useState<string | null>(null)
  const [loading] = useState(false)
  const [error] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  // Read-only preview: strategy code is never served here (Botcamp fetches it
  // from /api/strategies/[slug]/files/[id]/content, behind its sign-in).

  const handleCopy = useCallback(async () => {
    if (!content) return
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      console.error('Failed to copy')
    }
  }, [content])

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(`/api/strategies/${strategySlug}/files/${file.id}/download`)
      if (!response.ok) throw new Error('Failed to download file')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download error:', error)
    }
  }, [file.id, file.filename, strategySlug])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("p-4 text-sm rounded-bc-md", alertColors.error)}>
        {error}
      </div>
    )
  }

  if (content === null) {
    return (
      <div className="px-4 py-12 text-center text-sm text-muted-foreground">
        Code isn&apos;t shown in the read-only preview.
      </div>
    )
  }

  const language = getLanguageFromFilename(file.filename)
  const lineCount = content ? content.split('\n').length : 0
  const showCollapse = lineCount > 50

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {language}
          </Badge>
          {file.size && (
            <span className="text-xs text-muted-foreground">
              {formatFileSize(file.size)}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {lineCount} lines
          </span>
        </div>
        <div className="flex items-center gap-1">
          {showCollapse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Expand
                </>
              ) : (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Collapse
                </>
              )}
            </Button>
          )}
          <ReadOnlyHint><Button variant="ghost" size="sm" onClick={handleCopy} disabled>
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button></ReadOnlyHint>
          <ReadOnlyHint><Button variant="ghost" size="sm" onClick={handleDownload} disabled>
            <Download className="h-4 w-4" />
          </Button></ReadOnlyHint>
        </div>
      </div>

      {/* Code content */}
      <div
        className={cn(
          'overflow-auto rounded-b-bc-md',
          collapsed ? 'max-h-[200px]' : 'max-h-[600px]'
        )}
      >
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          showLineNumbers
          wrapLongLines
          customStyle={{
            margin: 0,
            borderRadius: '0 0 0.375rem 0.375rem',
            fontSize: '0.875rem',
          }}
        >
          {content || ''}
        </SyntaxHighlighter>
      </div>

      {collapsed && showCollapse && (
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#282c34] to-transparent pointer-events-none" />
      )}
    </div>
  )
}

export function StrategyCodeViewer({
  files,
  strategySlug,
}: StrategyCodeViewerProps) {
  // Separate files into categories
  const codeFiles = files.filter(isCodeFile)
  const linkFiles = files.filter((f) => f.type === 'LINK')
  const downloadFiles = files.filter((f) => f.type === 'FILE' && !isCodeFile(f))

  const [activeTab, setActiveTab] = useState<string | null>(
    codeFiles.length > 0 ? codeFiles[0].id : null
  )

  const handleDownload = async (file: StrategyFile) => {
    try {
      const response = await fetch(`/api/strategies/${strategySlug}/files/${file.id}/download`)
      if (!response.ok) throw new Error('Failed to download file')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download error:', error)
    }
  }

  if (files.length === 0) {
    return null
  }

  const hasCodeFiles = codeFiles.length > 0
  const hasLinks = linkFiles.length > 0
  const hasDownloads = downloadFiles.length > 0

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2">
          <FileCode className="h-5 w-5" />
          Strategy Code
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-bc-6">
        {/* Code Files - displayed in tabs */}
        {hasCodeFiles && (
          <div>
            {/* Tab bar */}
            <div className="flex overflow-x-auto border-b mb-0">
              {codeFiles.map((file) => (
                <CodeFileTab
                  key={file.id}
                  file={file}
                  isActive={activeTab === file.id}
                  onClick={() => setActiveTab(file.id)}
                />
              ))}
            </div>

            {/* Active tab content */}
            {activeTab && (
              <CodeContent
                file={codeFiles.find((f) => f.id === activeTab)!}
                strategySlug={strategySlug}
              />
            )}
          </div>
        )}

        {/* Links / Resources */}
        {hasLinks && (
          <div className="space-y-bc-3">
            {(hasCodeFiles || hasDownloads) && (
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Resources
              </h4>
            )}
            {linkFiles.map((file) => (
              <div
                key={file.id}
                className="border rounded-bc-lg p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ExternalLink className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <span className="font-medium">{file.filename}</span>
                    {file.url && (
                      <p className="text-xs text-muted-foreground truncate">
                        {file.url}
                      </p>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild className="shrink-0 ml-4">
                  <a href={file.url || '#'} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open
                  </a>
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Download-only files */}
        {hasDownloads && (
          <div className="space-y-bc-3">
            {(hasCodeFiles || hasLinks) && (
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Download className="h-4 w-4" />
                Downloads
              </h4>
            )}
            {downloadFiles.map((file) => (
              <div
                key={file.id}
                className="border rounded-bc-lg p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileCode className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <span className="font-medium">{file.filename}</span>
                    {file.size && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({formatFileSize(file.size)})
                      </span>
                    )}
                  </div>
                </div>
                <ReadOnlyHint><Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(file)}
                  disabled>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button></ReadOnlyHint>
              </div>
            ))}
          </div>
        )}

        {/* Hummingbot note - only show if there are code files or downloads */}
        {(hasCodeFiles || hasDownloads) && (
          <p className="text-sm text-muted-foreground">
            You can run this strategy using{' '}
            <a
              href="https://hummingbot.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Hummingbot
            </a>
            , the open source framework used by Botcamp members.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
