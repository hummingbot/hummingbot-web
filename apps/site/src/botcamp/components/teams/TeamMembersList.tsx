import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/botcamp/components/ui/avatar"
import { Button } from "@/botcamp/components/ui/button"
import { EmptyState } from "@/botcamp/components/ui/empty-state"
import { User, Users } from "lucide-react"

interface TeamMemberUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  slug: string | null
}

interface TeamMember {
  id: string
  user: TeamMemberUser
}

function getDisplayName(user: TeamMemberUser): string {
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`
  if (user.firstName) return user.firstName
  return user.email
}

function getInitials(user: TeamMemberUser): string {
  const name = getDisplayName(user)
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function TeamMembersList({ members }: { members: TeamMember[] }) {
  return (
    <div className="space-y-bc-4">
      <p className="text-sm text-muted-foreground">
        Need to add or remove a member? Contact the Botcamp admin team — team members
        can&apos;t be managed from here.
      </p>

      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No members yet"
          description="Contact the Botcamp admin team to get added to this team."
          variant="card"
        />
      ) : (
        <div className="space-y-bc-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-bc-lg border border-border p-3"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={member.user.avatarUrl || undefined} />
                <AvatarFallback>{getInitials(member.user)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{getDisplayName(member.user)}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {member.user.email}
                </p>
              </div>
              {member.user.slug && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/builders/${member.user.slug}`}>
                    <User className="mr-1 h-3 w-3" />
                    Profile
                  </Link>
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
