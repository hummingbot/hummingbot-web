"use client"

/* eslint-disable @next/next/no-img-element -- as in Botcamp: images from its API */

import { Github, Linkedin, Globe } from "lucide-react"
import { getAvatarGradient } from "@/botcamp/lib/avatar"

interface ProfilePreviewProps {
  firstName: string
  lastName: string
  email: string
  tagline: string | null
  websiteUrl: string | null
  linkedin: string | null
  github: string | null
  discord: string | null
  isCertified: boolean
  avatarUrl?: string | null
}

export function ProfilePreview({
  firstName,
  lastName,
  email,
  tagline,
  websiteUrl,
  linkedin,
  github,
  discord,
  isCertified,
  avatarUrl,
}: ProfilePreviewProps) {
  const name = [firstName, lastName].filter(Boolean).join(" ") || email
  const hasAnySocialLink = websiteUrl || linkedin || github || discord

  // Extract username from GitHub URL
  const getGithubUsername = (url: string) => {
    return url.split("/").filter(Boolean).pop() || "GitHub"
  }

  return (
    <div className="space-y-bc-6">
      {/* Profile Card - matches /members/[id] left sidebar */}
      <div className="bg-card rounded-bc-lg border p-6">
        {/* Avatar */}
        <div className="flex flex-col items-center space-y-bc-4 mb-6">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-32 h-32 rounded-full border-4 border-border object-cover"
            />
          ) : (
            <div
              className="w-32 h-32 rounded-full border-4 border-border flex items-center justify-center"
              style={getAvatarGradient(name)}
            >
              <span className="text-5xl text-black font-bold">
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          <div className="text-center space-y-bc-3">
            <div>
              <h1 className="text-2xl font-bold mb-1">{name}</h1>
              {tagline && (
                <p className="text-sm text-muted-foreground">{tagline}</p>
              )}
            </div>
            {isCertified && (
              <div className="flex justify-center">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                  Certified
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Connect Section */}
        {hasAnySocialLink && (
          <div>
            <h2 className="font-semibold mb-3">Connect</h2>
            <div className="flex flex-col gap-2">
              {github && (
                <a
                  href={github.startsWith("http") ? github : `https://github.com/${github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Github className="h-4 w-4" />
                  {github.includes("/") ? getGithubUsername(github) : github}
                </a>
              )}
              {linkedin && (
                <a
                  href={linkedin.startsWith("http") ? linkedin : `https://linkedin.com/in/${linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                </a>
              )}
              {websiteUrl && (
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Globe className="h-4 w-4" />
                  Website
                </a>
              )}
              {discord && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.369a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37.07.07 0 0 0 3.647 4.4C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  {discord}
                </div>
              )}
            </div>
          </div>
        )}

        {!hasAnySocialLink && (
          <p className="text-sm text-muted-foreground text-center">
            Add social links to help others connect with you
          </p>
        )}
      </div>

      {/* Preview Notice */}
      <p className="text-xs text-muted-foreground text-center">
        This is how your profile appears on the Members page
      </p>
    </div>
  )
}
