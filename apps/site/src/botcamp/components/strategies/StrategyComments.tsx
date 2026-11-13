'use client'

/* eslint-disable @next/next/no-img-element -- as in Botcamp: images from its API */

import { useState} from 'react'
import { Button } from '@/botcamp/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/botcamp/components/ui/select'
import { MessageSquare, Send, Pencil, Trash2, X, Check, Globe, Lock, UserCheck, ChevronDown, ChevronUp } from 'lucide-react'
import { getAvatarGradient } from '@/botcamp/lib/avatar'
import { formatRelativeTime } from '@/botcamp/lib/format'
import { useSession } from '@/botcamp/lib/preview-session-client'
import { ReadOnlyHint } from "@/botcamp/components/ui/read-only"

type CommentVisibility = 'PUBLIC' | 'AUTHOR' | 'ADMIN'

const VISIBILITY_OPTIONS: { value: CommentVisibility; label: string; icon: typeof Globe }[] = [
  { value: 'PUBLIC', label: 'Public', icon: Globe },
  { value: 'AUTHOR', label: 'Author', icon: UserCheck },
  { value: 'ADMIN', label: 'Admins', icon: Lock },
]

/** Comments beyond this stay collapsed behind "Show earlier comments" so a
 *  long thread never pushes the compose box (and Post Comment) out of view. */
const COLLAPSED_COMMENT_COUNT = 3

const VISIBILITY_BADGE: Record<Exclude<CommentVisibility, 'PUBLIC'>, { label: string; icon: typeof Lock; className: string }> = {
  ADMIN: { label: 'Admins only', icon: Lock, className: 'bg-red-500/10 text-red-500 border border-red-500/20' },
  AUTHOR: { label: 'To author', icon: UserCheck, className: 'bg-blue-500/10 text-blue-500 border border-blue-500/20' },
}

interface CommentAuthor {
  id: string
  firstName: string | null
  lastName: string | null
  role: string
  avatarUrl: string | null
  hasAvatar?: boolean
}

export interface Comment {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  author: CommentAuthor
  visibility: CommentVisibility
}

interface StrategyCommentsProps {
  strategySlug: string
  /** Read-only preview: the comments, read on the server (Botcamp fetches them from its API). */
  initialComments: Comment[]
}

function getAuthorName(author: CommentAuthor): string {
  if (author.firstName && author.lastName) {
    return `${author.firstName} ${author.lastName}`
  }
  if (author.firstName) return author.firstName
  return 'Anonymous'
}

// Avatar component that tries API first, falls back to gradient initial
function AvatarImage({ author, size = 40 }: { author: CommentAuthor; size?: number }) {
  const [hasError, setHasError] = useState(false)
  const name = getAuthorName(author)

  // Try loading from API
  if (!hasError) {
    return (
      <img
        src={`/api/users/${author.id}/avatar`}
        alt={name}
        className="rounded-full border border-border object-cover shrink-0"
        style={{ width: size, height: size }}
        onError={() => setHasError(true)}
      />
    )
  }

  // Fallback to gradient initial
  return (
    <div
      className="rounded-full border border-border flex items-center justify-center shrink-0"
      style={{ ...getAvatarGradient(name), width: size, height: size }}
    >
      <span className="text-black font-bold" style={{ fontSize: size * 0.4 }}>
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  )
}

export function StrategyComments({ strategySlug, initialComments }: StrategyCommentsProps) {
  const { data: previewSession } = useSession()
  // Read-only preview: comments come from the server and the viewer from the
  // preview session; nothing is fetched (Botcamp loads both from its API).
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [newVisibility, setNewVisibility] = useState<CommentVisibility>('PUBLIC')
  const [submitting, setSubmitting] = useState(false)
  const [showAllComments, setShowAllComments] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [canComment, setCanComment] = useState(!!previewSession?.user)
  const [currentUserId, setCurrentUserId] = useState<string | null>(previewSession?.user.id ?? null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(previewSession?.user.role ?? null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')


  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/session')
      if (response.ok) {
        const session = await response.json()
        if (session?.user) {
          setCurrentUserId(session.user.id)
          setCurrentUserRole(session.user.role)
          // Admins can always comment
          if (session.user.role === 'ADMIN') {
            setCanComment(true)
          }
        }
      }
    } catch (err) {
      console.error('Failed to check session:', err)
    }
  }

  const fetchCommentsFromApi = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/strategies/${strategySlug}/comments`)

      if (response.status === 401) {
        setError('Sign in to view comments')
        setComments([])
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch comments')
      }

      const data = await response.json()
      setComments(data.data || [])
      setError(null)

      // Check if user can comment (they'll get 403 when trying if not allowed)
      // For now, we'll let them try and show error if not allowed
      const session = await fetch('/api/auth/session').then(r => r.json())
      if (session?.user) {
        setCanComment(true) // Will be validated server-side
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err)
      setError('Failed to load comments')
    } finally {
      setLoading(false)
    }
  }

  // Botcamp's loaders, unused in the read-only preview.
  void fetchCommentsFromApi
  void checkSession

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || submitting) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/strategies/${strategySlug}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim(), visibility: newVisibility })
      })

      if (response.status === 403) {
        setError('Only authors, admins, and reviewing teams can comment')
        setCanComment(false)
        return
      }

      if (!response.ok) {
        throw new Error('Failed to post comment')
      }

      const data = await response.json()
      setComments(prev => [...prev, data.data])
      setNewComment('')
      setNewVisibility('PUBLIC')
      setError(null)
    } catch (err) {
      console.error('Failed to post comment:', err)
      setError('Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return

    try {
      const response = await fetch(`/api/strategies/${strategySlug}/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim() })
      })

      if (!response.ok) {
        throw new Error('Failed to update comment')
      }

      const data = await response.json()
      setComments(prev => prev.map(c => c.id === commentId ? data.data : c))
      setEditingId(null)
      setEditContent('')
    } catch (err) {
      console.error('Failed to update comment:', err)
      setError('Failed to update comment')
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      const response = await fetch(`/api/strategies/${strategySlug}/comments/${commentId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete comment')
      }

      setComments(prev => prev.filter(c => c.id !== commentId))
    } catch (err) {
      console.error('Failed to delete comment:', err)
      setError('Failed to delete comment')
    }
  }

  const canModifyComment = (comment: Comment): boolean => {
    if (!currentUserId) return false
    if (currentUserRole === 'ADMIN') return true
    return comment.author.id === currentUserId
  }

  const startEditing = (comment: Comment) => {
    setEditingId(comment.id)
    setEditContent(comment.content)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditContent('')
  }

  return (
    <div className="bg-card rounded-bc-lg border p-4 sm:p-6 min-w-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(v => !v)}
        className="flex w-full items-center gap-2 mb-4 text-left"
      >
        <MessageSquare className="h-5 w-5 shrink-0" />
        <h2 className="text-lg font-semibold">Discussion</h2>
        <span className="text-muted-foreground text-sm">({comments.length})</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
        )}
      </button>

      {error && (
        <div className="text-sm text-amber-500 mb-4 p-3 bg-amber-500/10 rounded-bc-lg">
          {error}
        </div>
      )}

      {isExpanded && (loading ? (
        <div className="space-y-bc-4">
          {[1, 2].map(i => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="w-10 h-10 rounded-full bg-muted" />
              <div className="flex-1">
                <div className="h-4 bg-muted rounded w-32 mb-2" />
                <div className="h-16 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Comments List — collapsed to the most recent few when long, so
              the compose box below never gets pushed far out of view. */}
          <div className="space-y-bc-6 mb-8 max-h-96 overflow-y-auto pr-1">
            {comments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No comments yet. Be the first to start the discussion!
              </p>
            ) : (
              <>
                {!showAllComments && comments.length > COLLAPSED_COMMENT_COUNT && (
                  <button
                    onClick={() => setShowAllComments(true)}
                    className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
                  >
                    Show {comments.length - COLLAPSED_COMMENT_COUNT} earlier comment
                    {comments.length - COLLAPSED_COMMENT_COUNT === 1 ? '' : 's'}
                  </button>
                )}
                {(showAllComments ? comments : comments.slice(-COLLAPSED_COMMENT_COUNT)).map(comment => (
                <div key={comment.id} className="flex gap-3">
                  {/* Avatar */}
                  <AvatarImage author={comment.author} size={40} />

                  {/* Comment Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium">{getAuthorName(comment.author)}</span>
                      {comment.author.role === 'ADMIN' && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                          Admin
                        </span>
                      )}
                      {comment.visibility !== 'PUBLIC' && (() => {
                        const badge = VISIBILITY_BADGE[comment.visibility]
                        const Icon = badge.icon
                        return (
                          <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${badge.className}`}>
                            <Icon className="h-3 w-3" />
                            {badge.label}
                          </span>
                        )
                      })()}
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                      {comment.createdAt !== comment.updatedAt && (
                        <span className="text-xs text-muted-foreground">(edited)</span>
                      )}
                    </div>

                    {editingId === comment.id ? (
                      <div className="space-y-bc-2">
                        <textarea
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          className="w-full p-3 rounded-bc-lg border bg-background text-foreground resize-none focus:outline-hidden focus:ring-2 focus:ring-primary"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <ReadOnlyHint><Button size="sm" onClick={() => handleEdit(comment.id)} disabled>
                            <Check className="h-4 w-4 mr-1" />
                            Save
                          </Button></ReadOnlyHint>
                          <Button size="sm" variant="ghost" onClick={cancelEditing}>
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-foreground whitespace-pre-wrap break-words">
                          {comment.content}
                        </p>
                        {canModifyComment(comment) && (
                          <div className="flex gap-2 mt-2">
                            <ReadOnlyHint><button
                              onClick={() => startEditing(comment)}
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 disabled:pointer-events-none disabled:opacity-50"
                              disabled>
                              <Pencil className="h-3 w-3" />
                              Edit
                            </button></ReadOnlyHint>
                            <ReadOnlyHint><button
                              onClick={() => handleDelete(comment.id)}
                              className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 disabled:pointer-events-none disabled:opacity-50"
                              disabled>
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </button></ReadOnlyHint>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                ))}
              </>
            )}
          </div>
        </>
      ))}

      {/* New Comment Form — always visible, even collapsed, so posting
          never requires expanding the history first. */}
      {canComment && (
        <form onSubmit={handleSubmit} className={isExpanded ? "border-t pt-6" : undefined}>
          <textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full p-4 rounded-bc-lg border bg-background text-foreground resize-none focus:outline-hidden focus:ring-2 focus:ring-primary"
            rows={3}
          />
          <div className="flex items-center justify-between gap-2 mt-3">
            {currentUserRole === 'ADMIN' && (
              <Select value={newVisibility} onValueChange={v => setNewVisibility(v as CommentVisibility)}>
                <SelectTrigger className="h-9 w-auto min-w-0 gap-1.5 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISIBILITY_OPTIONS.map(opt => {
                    const Icon = opt.icon
                    return (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          {opt.label}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}
            <ReadOnlyHint className="ml-auto"><Button type="submit" disabled>
              <Send className="h-4 w-4 mr-2" />
              {submitting ? 'Posting...' : 'Post Comment'}
            </Button></ReadOnlyHint>
          </div>
        </form>
      )}
    </div>
  )
}
