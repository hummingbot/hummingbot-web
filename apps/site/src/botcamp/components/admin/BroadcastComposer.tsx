'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/botcamp/components/ui/card'
import { Button } from '@/botcamp/components/ui/button'
import { Input } from '@/botcamp/components/ui/input'
import { Textarea } from '@/botcamp/components/ui/textarea'
import { Label } from '@/botcamp/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/botcamp/components/ui/select'
import { Alert, AlertDescription } from '@/botcamp/components/ui/alert'
import { Loader2, Send, AlertCircle, CheckCircle, Info, Check, ChevronsUpDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/botcamp/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/botcamp/components/ui/command'
import { cn } from '@/botcamp/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/botcamp/components/ui/tabs'
import { marked } from 'marked'
import { DEFAULT_EMAIL_SIGNATURE } from '@/botcamp/lib/email-signature'

// Configure marked for proper rendering
marked.setOptions({
  breaks: true,
  gfm: true,
})

// Available template variables
const TEMPLATE_VARIABLES = [
  { name: '{{FirstName}}', description: "Recipient's first name (defaults to 'there')" },
  { name: '{{LastName}}', description: "Recipient's last name" },
  { name: '{{Email}}', description: "Recipient's email address" },
]

// Default email signature/footer (shared with transactional emails)
const DEFAULT_SIGNATURE = DEFAULT_EMAIL_SIGNATURE

// Template variable definitions
interface TemplateVariable {
  name: string
  placeholder: string
  description: string
}

// Email templates for common broadcasts
const EMAIL_TEMPLATES: {
  id: string
  name: string
  subject: string
  body: string
  variables?: TemplateVariable[]
}[] = [
  {
    id: 'blank',
    name: 'Blank Email',
    subject: '',
    body: '',
  },
  {
    id: 'cohort_welcome',
    name: 'Cohort Welcome (Scholarship)',
    subject: 'Congratulations! You\'ve Been Accepted into Botcamp Cohort 13',
    body: `Hi {{FirstName}},

I'm thrilled to let you know that you've been selected for a **Botcamp Cohort 13 scholarship**! Congratulations!

We received an overwhelming number of applications from the community, and yours stood out.

## What's Next

1. **Join the Hummingbot Discord** — If you haven't already, join us at [discord.gg/hummingbot](https://discord.gg/hummingbot)

2. **Complete the onboarding form** — Fill out this short form to get access to the private Cohort 13 channels on Discord: [Onboarding Form](https://forms.gle/CYsnx1htnmwtC76n7)

3. **Check your calendar** — We've sent calendar invitations for all Cohort 13 sessions to your email

4. **Access your courses** — Log in at [botcamp.xyz](https://www.botcamp.xyz/) to access all 4 courses included with your membership`,
  },
  {
    id: 'cohort_welcome_paid',
    name: 'Cohort Welcome (Paid)',
    subject: 'Welcome to Botcamp Cohort 13!',
    body: `Hi {{FirstName}},

Welcome to **Botcamp Cohort 13**! We're excited to have you join us.

## What's Next

1. **Join the Hummingbot Discord** — If you haven't already, join us at [discord.gg/hummingbot](https://discord.gg/hummingbot)

2. **Complete the onboarding form** — Fill out this short form to get access to the private Cohort 13 channels on Discord: [Onboarding Form](https://forms.gle/CYsnx1htnmwtC76n7)

3. **Check your calendar** — We've sent calendar invitations for all Cohort 13 sessions to your email

4. **Access your courses** — Log in at [botcamp.xyz](https://www.botcamp.xyz/) to access all 4 courses included with your membership`,
  },
  {
    id: 'session_recording',
    name: 'Session Recording Available',
    subject: '[Botcamp] {{SessionTitle}} - Recording Now Available',
    body: `Hi {{FirstName}},

The recording, summary, and transcript for **{{SessionTitle}}** are now available on the Botcamp platform:

- **Video Recording** — Full session replay
- **Summary Notes** — Key takeaways and highlights
- **Transcript** — Searchable text version with timestamps

[View on Botcamp →]({{SessionUrl}})

If you have any questions about the material covered, feel free to ask in the **#botcamp** channels on Discord.

See you at the next session!`,
    variables: [
      { name: 'SessionTitle', placeholder: 'e.g., Week 1: Introduction to Algo Trading', description: 'Title of the session' },
      { name: 'SessionUrl', placeholder: 'e.g., https://botcamp.xyz/cohorts/cohort13/learn/session-1', description: 'Link to the lesson page' },
    ],
  },
]

// Audiences large enough that splitting into an "engaged first" wave and a
// "long tail" wave the next day is worth offering. Mirrors the admin-cc list
// in the broadcast API route.
const GROUP_AUDIENCES = ['all_users', 'all_members', 'course_students', 'cohort', 'hackathon']

interface PreviewRecipient {
  firstName: string | null
  lastName: string | null
  email: string
}

// Parse variables for preview
function parseVariablesForPreview(text: string, recipient: PreviewRecipient): string {
  return text
    .replace(/\{\{FirstName\}\}/gi, recipient.firstName || 'there')
    .replace(/\{\{LastName\}\}/gi, recipient.lastName || '')
    .replace(/\{\{Email\}\}/gi, recipient.email)
}

interface Cohort {
  id: string
  number: number
  title: string | null
  _count: {
    enrollments: number
  }
}

interface Hackathon {
  id: string
  slug: string
  title: string
  _count: {
    entries: number
  }
}

interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
}

interface BroadcastComposerProps {
  cohorts: Cohort[]
  hackathons: Hackathon[]
  users: User[]
  totalUsers: number
  totalMembers: number
  totalCourseStudents: number
  totalAdmins: number
  currentUser: { firstName: string | null; lastName: string | null; email: string } | null
}

export function BroadcastComposer({ cohorts, hackathons, users, totalUsers, totalMembers, totalCourseStudents, totalAdmins, currentUser }: BroadcastComposerProps) {
  // Use current user for preview, fallback to placeholder
  const previewRecipient: PreviewRecipient = currentUser || {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
  }
  const [audienceType, setAudienceType] = useState<string>('myself')
  const [engagementFilter, setEngagementFilter] = useState<string>('all')
  const [category, setCategory] = useState<string>('marketing')
  const [cohortId, setCohortId] = useState<string>('')
  const [hackathonSlug, setHackathonSlug] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [userComboboxOpen, setUserComboboxOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('blank')
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({})
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [signature, setSignature] = useState(DEFAULT_SIGNATURE)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('write')

  // Generate preview HTML from markdown with variables parsed (body + signature).
  // Always includes the signature so the preview matches what recipients receive.
  const previewHtml = useMemo(() => {
    const fullContent = [body, signature].filter(Boolean).join('\n\n')
    if (!fullContent) return ''
    const parsed = parseVariablesForPreview(fullContent, previewRecipient)
    return marked.parse(parsed, { async: false }) as string
  }, [body, signature, previewRecipient])

  const previewSubject = useMemo(() => {
    return parseVariablesForPreview(subject, previewRecipient)
  }, [subject, previewRecipient])

  const getRecipientCount = () => {
    if (audienceType === 'myself') return 1
    if (audienceType === 'all_users') return totalUsers
    if (audienceType === 'all_members') return totalMembers
    if (audienceType === 'course_students') return totalCourseStudents
    if (audienceType === 'admin_users') return totalAdmins
    if (audienceType === 'cohort' && cohortId) {
      const cohort = cohorts.find(c => c.id === cohortId)
      return cohort?._count.enrollments || 0
    }
    if (audienceType === 'hackathon' && hackathonSlug) {
      const hackathon = hackathons.find(h => h.slug === hackathonSlug)
      return hackathon?._count.entries || 0
    }
    if (audienceType === 'specific_user' && userEmail.trim()) return 1
    return 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!subject.trim()) {
      setError('Subject is required')
      return
    }

    if (!body.trim()) {
      setError('Email body is required')
      return
    }

    if (audienceType === 'cohort' && !cohortId) {
      setError('Please select a cohort')
      return
    }

    if (audienceType === 'hackathon' && !hackathonSlug) {
      setError('Please select a hackathon')
      return
    }

    if (audienceType === 'specific_user' && !userEmail.trim()) {
      setError('Please enter a user email')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audienceType,
          engagementFilter: GROUP_AUDIENCES.includes(audienceType) ? engagementFilter : undefined,
          category,
          cohortId: audienceType === 'cohort' ? cohortId : undefined,
          hackathonSlug: audienceType === 'hackathon' ? hackathonSlug : undefined,
          userEmail: audienceType === 'specific_user' ? userEmail.trim() : undefined,
          subject,
          body,
          signature,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send broadcast')
      }

      setSuccess(
        `Successfully sent ${data.sentCount} emails to ${data.recipientCount} recipients` +
        (data.suppressedCount > 0 ? ` (${data.suppressedCount} skipped for bounce/complaint history)` : '')
      )
      setSelectedTemplateId('blank')
      setTemplateVars({})
      setSubject('')
      setBody('')
      setCohortId('')
      setUserEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send broadcast')
    } finally {
      setLoading(false)
    }
  }

  const recipientCount = getRecipientCount()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send Broadcast Email</CardTitle>
        <CardDescription>
          Send emails to segments of your user base via Resend
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-bc-6">
          {/* Audience Selection */}
          <div className="space-y-bc-2">
            <Label htmlFor="audience">Audience</Label>
            <Select value={audienceType} onValueChange={setAudienceType}>
              <SelectTrigger id="audience">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="myself">
                  Myself (test)
                </SelectItem>
                <SelectItem value="all_users">
                  All Users ({totalUsers.toLocaleString()})
                </SelectItem>
                <SelectItem value="all_members">
                  All Cohort Members ({totalMembers.toLocaleString()})
                </SelectItem>
                <SelectItem value="course_students">
                  Course Students Only ({totalCourseStudents.toLocaleString()})
                </SelectItem>
                <SelectItem value="admin_users">
                  Admin Users ({totalAdmins.toLocaleString()})
                </SelectItem>
                <SelectItem value="cohort">
                  Specific Cohort
                </SelectItem>
                <SelectItem value="hackathon">
                  Hackathon Registrants
                </SelectItem>
                <SelectItem value="specific_user">
                  Specific User
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Engagement wave — split a big send into "engaged now, long tail
              later" instead of one blast, to cap any single day's bounce rate */}
          {GROUP_AUDIENCES.includes(audienceType) && (
            <div className="space-y-bc-2">
              <Label htmlFor="engagement">Send to</Label>
              <Select value={engagementFilter} onValueChange={setEngagementFilter}>
                <SelectTrigger id="engagement">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone in this audience</SelectItem>
                  <SelectItem value="engaged">Engaged only (opened an email in the last 90 days)</SelectItem>
                  <SelectItem value="long_tail">Long tail only (hasn&apos;t opened in the last 90 days)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                For a large send, mail &quot;Engaged only&quot; today and &quot;Long tail only&quot; a day later instead of blasting everyone at once — it caps how bad any single day&apos;s bounce rate looks to mailbox providers.
              </p>
            </div>
          )}

          {/* Category — controls which opt-out + unsubscribe link applies */}
          <div className="space-y-bc-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="marketing">Announcements &amp; marketing</SelectItem>
                <SelectItem value="course">Course updates &amp; bundles</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Recipients who unsubscribed from this category are skipped. The
              admin test send ignores opt-outs.
            </p>
          </div>

          {/* Cohort Selection */}
          {audienceType === 'cohort' && (
            <div className="space-y-bc-2">
              <Label htmlFor="cohort">Select Cohort</Label>
              <Select value={cohortId} onValueChange={setCohortId}>
                <SelectTrigger id="cohort">
                  <SelectValue placeholder="Choose a cohort..." />
                </SelectTrigger>
                <SelectContent>
                  {cohorts.map((cohort) => (
                    <SelectItem key={cohort.id} value={cohort.id}>
                      Cohort {cohort.number}: {cohort.title} ({cohort._count.enrollments} members)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Hackathon Selection */}
          {audienceType === 'hackathon' && (
            <div className="space-y-bc-2">
              <Label htmlFor="hackathon">Select Hackathon</Label>
              <Select value={hackathonSlug} onValueChange={setHackathonSlug}>
                <SelectTrigger id="hackathon">
                  <SelectValue placeholder="Choose a hackathon..." />
                </SelectTrigger>
                <SelectContent>
                  {hackathons.map((hackathon) => (
                    <SelectItem key={hackathon.id} value={hackathon.slug}>
                      {hackathon.title} ({hackathon._count.entries} registrants)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Specific User Selection */}
          {audienceType === 'specific_user' && (
            <div className="space-y-bc-2">
              <Label>Select User</Label>
              <Popover open={userComboboxOpen} onOpenChange={setUserComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={userComboboxOpen}
                    className="w-full justify-between font-normal"
                    disabled={loading}
                  >
                    {userEmail
                      ? (() => {
                          const selectedUser = users.find(u => u.email === userEmail)
                          if (selectedUser) {
                            const name = [selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(' ')
                            return name ? `${name} <${selectedUser.email}>` : selectedUser.email
                          }
                          return userEmail
                        })()
                      : "Search by name or email..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search by name or email..." />
                    <CommandList>
                      <CommandEmpty>No user found.</CommandEmpty>
                      <CommandGroup>
                        {users.map((user) => {
                          const name = [user.firstName, user.lastName].filter(Boolean).join(' ')
                          const displayText = name ? `${name} <${user.email}>` : user.email
                          return (
                            <CommandItem
                              key={user.id}
                              value={`${name} ${user.email}`}
                              onSelect={() => {
                                setUserEmail(user.email)
                                setUserComboboxOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  userEmail === user.email ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span>{displayText}</span>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Recipient Count Display */}
          {recipientCount > 0 && (
            <Alert>
              <AlertDescription>
                This email will be sent to <strong>{recipientCount.toLocaleString()}</strong> recipient{recipientCount !== 1 ? 's' : ''}
              </AlertDescription>
            </Alert>
          )}

          {/* Template Selection */}
          <div className="space-y-bc-2">
            <Label htmlFor="template">Email Template</Label>
            <Select
              value={selectedTemplateId}
              onValueChange={(templateId) => {
                const template = EMAIL_TEMPLATES.find(t => t.id === templateId)
                if (template) {
                  setSelectedTemplateId(templateId)
                  setSubject(template.subject)
                  setBody(template.body)
                  // Reset template variables
                  setTemplateVars({})
                }
              }}
            >
              <SelectTrigger id="template">
                <SelectValue placeholder="Start from a template..." />
              </SelectTrigger>
              <SelectContent>
                {EMAIL_TEMPLATES.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select a template to pre-fill subject and body. You can customize after selecting.
            </p>
          </div>

          {/* Template Variables */}
          {(() => {
            const selectedTemplate = EMAIL_TEMPLATES.find(t => t.id === selectedTemplateId)
            if (!selectedTemplate?.variables?.length) return null

            return (
              <div className="space-y-bc-3 p-4 rounded-bc-lg border bg-muted/30">
                <Label className="text-sm font-medium">Template Variables</Label>
                <div className="grid gap-3">
                  {selectedTemplate.variables.map((variable) => (
                    <div key={variable.name} className="space-y-bc-1">
                      <Label htmlFor={`var-${variable.name}`} className="text-xs text-muted-foreground">
                        {`{{${variable.name}}}`} — {variable.description}
                      </Label>
                      <Input
                        id={`var-${variable.name}`}
                        value={templateVars[variable.name] || ''}
                        onChange={(e) => {
                          const newVars = { ...templateVars, [variable.name]: e.target.value }
                          setTemplateVars(newVars)
                          // Update subject and body with new variable values
                          let newSubject = selectedTemplate.subject
                          let newBody = selectedTemplate.body
                          Object.entries(newVars).forEach(([key, value]) => {
                            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
                            newSubject = newSubject.replace(regex, value || `{{${key}}}`)
                            newBody = newBody.replace(regex, value || `{{${key}}}`)
                          })
                          setSubject(newSubject)
                          setBody(newBody)
                        }}
                        placeholder={variable.placeholder}
                        disabled={loading}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Subject */}
          <div className="space-y-bc-2">
            <Label htmlFor="subject">Subject Line</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject..."
              disabled={loading}
            />
          </div>

          {/* Body */}
          <div className="space-y-bc-2">
            <Label>Email Body (Markdown)</Label>

            {/* Variables Help */}
            <div className="flex items-start gap-2 p-3 rounded-bc-md bg-muted/50 text-sm">
              <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium mb-1">Available Variables:</p>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATE_VARIABLES.map((v) => (
                    <code
                      key={v.name}
                      className="px-1.5 py-0.5 rounded bg-background border text-xs cursor-pointer hover:bg-primary/10"
                      title={v.description}
                      onClick={() => {
                        if (activeTab === 'write') {
                          setBody((prev) => prev + v.name)
                        }
                      }}
                    >
                      {v.name}
                    </code>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Click to insert. Supports Markdown formatting.</p>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-2">
                <TabsTrigger value="write">Write</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="write" className="mt-0">
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={`Hi {{FirstName}},

We're excited to share some updates with the Botcamp community.

## What's New

- **Feature 1** — Description here
- **Feature 2** — Another update

Learn more at [botcamp.xyz](https://botcamp.xyz)

Best,
The Botcamp Team`}
                  rows={16}
                  disabled={loading}
                  className="font-mono text-sm"
                />
              </TabsContent>

              <TabsContent value="preview" className="mt-0">
                <div className="space-y-bc-3">
                  <div className="rounded-bc-lg border bg-background p-4">
                    <p className="text-xs text-muted-foreground mb-2">Subject:</p>
                    <p className="font-medium">{previewSubject || '(No subject)'}</p>
                  </div>
                  <div className="rounded-bc-lg border bg-background p-4 min-h-[300px]">
                    <p className="text-xs text-muted-foreground mb-3">
                      Preview as: {previewRecipient.firstName || 'User'} {previewRecipient.lastName || ''} &lt;{previewRecipient.email}&gt;
                    </p>
                    {previewHtml ? (
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3 prose-h3:text-base prose-p:my-2 prose-ul:my-2 prose-ul:list-disc prose-ul:pl-6 prose-li:my-1 prose-a:text-primary prose-a:underline prose-hr:my-4"
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                      />
                    ) : (
                      <p className="text-muted-foreground italic">Start typing to see preview...</p>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Signature */}
          <div className="space-y-bc-2">
            <Label htmlFor="signature">Email Signature (Markdown)</Label>
            <Textarea
              id="signature"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              rows={6}
              disabled={loading}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Appended to every email. Supports Markdown.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="border-green-600 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedTemplateId('blank')
                setTemplateVars({})
                setSubject('')
                setBody('')
                setCohortId('')
                setHackathonSlug('')
                setUserEmail('')
                setEngagementFilter('all')
                setError(null)
                setSuccess(null)
              }}
              disabled={loading}
            >
              Clear
            </Button>
            <Button type="submit" disabled={loading || recipientCount === 0 || !subject.trim() || !body.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Broadcast
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
