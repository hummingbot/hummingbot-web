import Link from 'next/link'
import Image from 'next/image'
import { Card, CardHeader, CardContent } from "@/botcamp/components/ui/card"
import { ArrowRight } from 'lucide-react'
import { getAvatarGradient } from '@/botcamp/lib/avatar'
import { YouTubeFacade } from '@/components/ui/youtube-facade'

interface HomeMemberProfileCardProps {
  name: string
  location: string
  bio: string
  avatarURL: string | null
  slug: string
  storyVideoId?: string
}

export function HomeMemberProfileCard({ name, location, bio, avatarURL, slug, storyVideoId }: HomeMemberProfileCardProps) {
  return (
    <Card className="bg-card/50 backdrop-blur-xs border-border h-full flex flex-col">
      <CardHeader className="flex flex-col items-center pb-2">
        <div className="relative w-16 h-16 mb-3">
          {avatarURL ? (
            <div className="w-16 h-16 rounded-full border-2 border-border overflow-hidden">
              <Image
                src={avatarURL}
                alt={name}
                width={64}
                height={64}
                // Remote avatars skip the optimizer: this site configures no image hosts.
                unoptimized
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div
              className="w-16 h-16 rounded-full border-2 border-border flex items-center justify-center"
              style={getAvatarGradient(name)}
            >
              <span className="text-2xl text-black font-bold">
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <h3 className="text-lg font-bold text-card-foreground">{name}</h3>
        <p className="text-primary text-xs">{location}</p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-0">
        <p className="text-foreground text-center text-sm mb-3 flex-1">{bio}</p>

        {storyVideoId && (
          <YouTubeFacade
            videoId={storyVideoId}
            title={`${name}'s Story`}
            className="rounded-bc-lg mb-3 border border-border"
          />
        )}

        <Link href={`/builders/${slug}`} className="flex items-center justify-center text-sm text-primary hover:underline font-medium">
          View Member Profile
          <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  )
}
