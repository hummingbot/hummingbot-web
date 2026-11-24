"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/botcamp/components/ui/button"
import { Input } from "@/botcamp/components/ui/input"
import { Label } from "@/botcamp/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/botcamp/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/botcamp/components/ui/select"
import { Plus, Loader2, Search } from "lucide-react"
import { cn } from "@/botcamp/lib/utils"
import { alertColors } from "@/botcamp/lib/design-constants"

interface Cohort {
  id: string
  number: number
  title: string | null
  status: string
}

interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
}

export function AdminCreateStrategyButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState("")
  const [cohortId, setCohortId] = useState("")
  const [authorId, setAuthorId] = useState("")

  // Data for selects
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [userSearch, setUserSearch] = useState("")
  const [loadingCohorts, setLoadingCohorts] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Fetch cohorts when dialog opens
  useEffect(() => {
    if (open && cohorts.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- as in Botcamp (its ESLint predates this rule)
      setLoadingCohorts(true)
      fetch("/api/admin/cohorts")
        .then((res) => res.json())
        .then((data) => {
          if (data.data) {
            setCohorts(data.data)
          }
        })
        .catch(console.error)
        .finally(() => setLoadingCohorts(false))
    }
  }, [open, cohorts.length])

  // Search users
  useEffect(() => {
    if (userSearch.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- as in Botcamp (its ESLint predates this rule)
      setUsers([])
      return
    }

    const timer = setTimeout(() => {
      setLoadingUsers(true)
      fetch(`/api/admin/users?search=${encodeURIComponent(userSearch)}&limit=10`)
        .then((res) => res.json())
        .then((data) => {
          if (data.data) {
            setUsers(data.data)
          }
        })
        .catch(console.error)
        .finally(() => setLoadingUsers(false))
    }, 300)

    return () => clearTimeout(timer)
  }, [userSearch])

  const handleCreate = async () => {
    if (!title.trim()) {
      setError("Title is required")
      return
    }
    if (!cohortId) {
      setError("Please select a cohort")
      return
    }
    if (!authorId) {
      setError("Please select an author")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          cohortId,
          authorId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create strategy")
      }

      const { data } = await response.json()
      setOpen(false)
      router.push(`/admin/strategies/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create strategy")
    } finally {
      setIsLoading(false)
    }
  }

  const selectedUser = users.find((u) => u.id === authorId)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Strategy
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Strategy</DialogTitle>
          <DialogDescription>
            Create a new strategy and assign it to a cohort and author.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-bc-4 py-4">
          {error && (
            <div className={cn("p-3 text-sm rounded-bc-md", alertColors.error)}>
              {error}
            </div>
          )}

          <div className="space-y-bc-2">
            <Label htmlFor="title">Strategy Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Grid Trading Strategy"
            />
          </div>

          <div className="space-y-bc-2">
            <Label htmlFor="cohort">Cohort</Label>
            <Select value={cohortId} onValueChange={setCohortId}>
              <SelectTrigger>
                <SelectValue placeholder={loadingCohorts ? "Loading..." : "Select a cohort"} />
              </SelectTrigger>
              <SelectContent>
                {cohorts.map((cohort) => (
                  <SelectItem key={cohort.id} value={cohort.id}>
                    {cohort.number === 0 ? "Example" : `Cohort ${cohort.number}`}
                    {cohort.title && cohort.number !== 0 ? `: ${cohort.title}` : ""}
                    {" "}({cohort.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-bc-2">
            <Label htmlFor="author">Author</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="author"
                value={selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName} (${selectedUser.email})` : userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value)
                  setAuthorId("")
                }}
                placeholder="Search by name or email..."
                className="pl-9"
              />
            </div>
            {loadingUsers && (
              <p className="text-xs text-muted-foreground">Searching...</p>
            )}
            {users.length > 0 && !authorId && (
              <div className="border rounded-bc-md max-h-40 overflow-auto">
                {users.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex justify-between items-center"
                    onClick={() => {
                      setAuthorId(user.id)
                      setUserSearch("")
                    }}
                  >
                    <span>
                      {user.firstName} {user.lastName}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {user.email}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {userSearch.length >= 2 && users.length === 0 && !loadingUsers && (
              <p className="text-xs text-muted-foreground">No users found</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Create Strategy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
