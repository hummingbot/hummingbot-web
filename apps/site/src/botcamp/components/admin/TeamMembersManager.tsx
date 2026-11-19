"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/botcamp/components/ui/button"
import { Input } from "@/botcamp/components/ui/input"
import { Loader2, Mail, Plus, X, Search, Users } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/botcamp/components/ui/dialog"

interface MemberUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  slug: string | null
  avatarUrl: string | null
}

interface TeamMember {
  id: string
  userId: string
  user: MemberUser
}

interface TeamInvite {
  id: string
  email: string
}

interface TeamMembersManagerProps {
  teamId: string
  members: TeamMember[]
  invites: TeamInvite[]
}

/**
 * Admin-only version of the team's Manage tab: the same member list, plus
 * adding existing users, inviting emails without an account, and removing
 * members or pending invites.
 */
export function TeamMembersManager({ teamId, members, invites }: TeamMembersManagerProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<MemberUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)

  // When a search matches nobody, a full email address can be invited instead.
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const queryIsEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedQuery)
  const queryAlreadyInvited = invites.some((i) => i.email === normalizedQuery)

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    setError(null)
    try {
      const response = await fetch(`/api/users?search=${encodeURIComponent(query)}&limit=10`)
      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error || "Failed to search users")
      }
      if (!json.data) {
        throw new Error("No data returned from search")
      }

      const memberIds = new Set(members.map((m) => m.userId))
      setSearchResults(json.data.filter((user: MemberUser) => !memberIds.has(user.id)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search users")
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [members])

  // Debounced auto-search when the admin stops typing
  useEffect(() => {
    if (!showAddMemberDialog) return
    const timer = setTimeout(() => searchUsers(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery, showAddMemberDialog, searchUsers])

  async function send(url: string, init: RequestInit, errorMessage: string) {
    const response = await fetch(url, init)
    const json = await response.json()
    if (!response.ok) {
      throw new Error(json.error || errorMessage)
    }
    return json.data
  }

  const handleAddMember = async (userId: string) => {
    setIsAddingMember(true)
    setError(null)
    try {
      await send(
        `/api/admin/teams/${teamId}/members`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) },
        "Failed to add member"
      )
      setSearchResults((prev) => prev.filter((u) => u.id !== userId))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsAddingMember(false)
    }
  }

  // Invite an email address that has no account yet. The server records a
  // TeamInvite and emails a register link; they become a member on signup.
  const handleInviteEmail = async (email: string) => {
    setIsInviting(true)
    setError(null)
    try {
      await send(
        `/api/admin/teams/${teamId}/members`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) },
        "Failed to send invite"
      )
      setSearchQuery("")
      setSearchResults([])
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsInviting(false)
    }
  }

  const handleRevokeInvite = async (inviteId: string) => {
    setRevokingInviteId(inviteId)
    setError(null)
    try {
      await send(`/api/admin/teams/${teamId}/invites/${inviteId}`, { method: "DELETE" }, "Failed to revoke invite")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setRevokingInviteId(null)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    setRemovingMemberId(userId)
    setError(null)
    try {
      await send(`/api/admin/teams/${teamId}/members/${userId}`, { method: "DELETE" }, "Failed to remove member")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setRemovingMemberId(null)
    }
  }

  const closeDialog = () => {
    setShowAddMemberDialog(false)
    setSearchQuery("")
    setSearchResults([])
  }

  return (
    <div className="space-y-bc-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Team Members ({members.length})</h3>
          <p className="text-sm text-muted-foreground">
            Members can edit this team&apos;s info and review and select its applicants.
          </p>
        </div>
        <Button onClick={() => setShowAddMemberDialog(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      {error && <div className="p-3 bg-destructive/10 text-destructive rounded-bc-lg text-sm">{error}</div>}

      {members.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No members yet. Add team members who can review applications.
        </p>
      ) : (
        <div className="space-y-bc-2">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 border rounded-bc-lg">
              <div className="flex items-center gap-3">
                {member.user.avatarUrl ? (
                  <Image
                    src={member.user.avatarUrl}
                    alt={member.user.email}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium">
                    {member.user.firstName} {member.user.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{member.user.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Remove ${member.user.email}`}
                onClick={() => handleRemoveMember(member.userId)}
                disabled={removingMemberId === member.userId}
              >
                {removingMemberId === member.userId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4 text-destructive" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {invites.length > 0 && (
        <div className="space-y-bc-2 pt-2">
          <p className="text-sm font-medium text-muted-foreground">Pending Invites ({invites.length})</p>
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between p-3 border border-dashed rounded-bc-lg"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{invite.email}</p>
                  <p className="text-sm text-muted-foreground">Invited — joins the team when they register</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Revoke invite for ${invite.email}`}
                onClick={() => handleRevokeInvite(invite.id)}
                disabled={revokingInviteId === invite.id}
              >
                {revokingInviteId === invite.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4 text-destructive" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAddMemberDialog} onOpenChange={(open) => (open ? setShowAddMemberDialog(true) : closeDialog())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-bc-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-bc-2 max-h-[300px] overflow-y-auto">
                {searchResults.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded-bc-lg">
                    <div className="flex items-center gap-3">
                      {user.avatarUrl ? (
                        <Image
                          src={user.avatarUrl}
                          alt={user.email}
                          width={32}
                          height={32}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      aria-label={`Add ${user.email}`}
                      onClick={() => handleAddMember(user.id)}
                      disabled={isAddingMember}
                    >
                      {isAddingMember ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {searchQuery && searchResults.length === 0 && !isSearching && (
              queryIsEmail ? (
                queryAlreadyInvited ? (
                  <p className="text-center text-muted-foreground py-4">
                    {normalizedQuery} already has a pending invite.
                  </p>
                ) : (
                  <div className="flex items-center justify-between p-3 border border-dashed rounded-bc-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{normalizedQuery}</p>
                        <p className="text-xs text-muted-foreground">
                          No account yet — send an invite. They&apos;ll join the team when they register
                          with this email.
                        </p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleInviteEmail(normalizedQuery)} disabled={isInviting}>
                      {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invite"}
                    </Button>
                  </div>
                )
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No users found. Enter a full email address to invite someone who doesn&apos;t have an account yet.
                </p>
              )
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
