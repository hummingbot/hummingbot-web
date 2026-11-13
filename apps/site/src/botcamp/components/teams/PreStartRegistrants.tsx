import { BuildersMap } from "@/botcamp/components/hackathons/BuildersMap"
import { EmptyState } from "@/botcamp/components/ui/empty-state"
import { Avatar, AvatarFallback, AvatarImage } from "@/botcamp/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/botcamp/components/ui/table"
import { formatRelativeTime } from "@/botcamp/lib/format"
import { Map } from "lucide-react"

interface RegistrantUser {
  id: string
  name: string | null
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
}

interface Registrant {
  id: string
  createdAt: string
  user: RegistrantUser
}

function getDisplayName(user: RegistrantUser): string {
  if (user.name) return user.name
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`
  if (user.firstName) return user.firstName
  return "Unknown"
}

function getInitials(user: RegistrantUser): string {
  return getDisplayName(user)
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Pre-hackathon-start view: builders who picked this sponsor when
 * registering (`HackathonEntry.sponsorTeamId`), shown on the map plus a
 * plain list underneath (the map only plots entries with coordinates).
 */
export function PreStartRegistrants({ registrants }: { registrants: Registrant[] }) {
  if (registrants.length === 0) {
    return (
      <EmptyState
        icon={Map}
        title="No registrants yet"
        description="Builders who pick your team as their sponsor at registration will show up here."
        variant="card"
      />
    )
  }

  const mapBuilders = registrants.map((r) => ({
    id: r.id,
    name: getDisplayName(r.user),
    tagline: null,
    avatarUrl: r.user.avatarUrl,
    strategyDescription: null,
    location: r.user.location,
    latitude: r.user.latitude,
    longitude: r.user.longitude,
  }))

  return (
    <div className="space-y-bc-4">
      <BuildersMap builders={mapBuilders} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Builder</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Registered</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {registrants.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={r.user.avatarUrl || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(r.user)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{getDisplayName(r.user)}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {r.user.location || "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatRelativeTime(r.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p className="text-sm text-muted-foreground">
        {registrants.length} registrant{registrants.length === 1 ? "" : "s"} racing for
        your team so far.
      </p>
    </div>
  )
}
