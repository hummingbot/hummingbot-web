import Link from "next/link"
import { ExternalLink, User } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/botcamp/components/ui/avatar"
import { getDisplayName, getInitials, type ReviewApplicant } from "./application-review"

interface ApplicantCardProps {
  user: ReviewApplicant
}

/** Sidebar card showing the applicant's avatar, name, and profile links. */
export function ApplicantCard({ user }: ApplicantCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Applicant</CardTitle>
      </CardHeader>
      <CardContent className="space-y-bc-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatarUrl || undefined} />
            <AvatarFallback>{getInitials(user)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{getDisplayName(user)}</div>
            {user.email ? (
              <div className="text-sm text-muted-foreground">{user.email}</div>
            ) : (
              user.slug && (
                <Link
                  href={`/builders/${user.slug}`}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  @{user.slug}
                </Link>
              )
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {user.slug && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/builders/${user.slug}`}>
                <User className="mr-1 h-3 w-3" />
                Profile
              </Link>
            </Button>
          )}
          {user.github && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={`https://github.com/${user.github}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          )}
          {user.linkedin && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={user.linkedin.startsWith("http") ? user.linkedin : `https://linkedin.com/in/${user.linkedin}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
