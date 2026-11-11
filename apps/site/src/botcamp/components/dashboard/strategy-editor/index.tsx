"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/botcamp/components/ui/card"
import { Label } from "@/botcamp/components/ui/label"
import { Textarea } from "@/botcamp/components/ui/textarea"
import { Input } from "@/botcamp/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/botcamp/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/botcamp/components/ui/select"
import { FileUploadManager } from "@/botcamp/components/ui/file-upload-manager"
import { ImageGalleryUpload } from "@/botcamp/components/strategies/ImageGalleryUpload"
import { StrategyPreview } from "@/botcamp/components/strategies/StrategyPreview"
import { TagInput } from "@/botcamp/components/ui/tag-input"
import { AgentPackageCard, type AgentPackageVersion } from "@/botcamp/components/agents/AgentPackageCard"
import { Eye, Edit, Video, FileText, Tags, Lock, Bot } from "lucide-react"
import { alertColors } from "@/botcamp/lib/design-constants"
import { cn } from "@/botcamp/lib/utils"
import { STRATEGY_FILE_ACCEPT } from "@/botcamp/lib/strategy-file-types"

import { useStrategyForm } from "./useStrategyForm"
import { StrategyHeader } from "./StrategyHeader"
import { StrategyProgressCard } from "./StrategyProgressCard"
import { PageSuggestionsCard } from "./PageSuggestionsCard"
import { AgentReviewCard } from "./AgentReviewCard"
import { NewAgentWizard } from "@/botcamp/components/agents/NewAgentWizard"
import { StrategyStatusCard } from "./StrategyStatusCard"
import { StrategyVisibilityCard } from "./StrategyVisibilityCard"
import { StrategyConfirmDialogs } from "./StrategyConfirmDialogs"
import { StrategyDetailsEditor } from "./StrategyDetailsEditor"
import type { HackathonApplyInfo, HackathonEditInfo, Strategy, StrategyType } from "./types"

// Support both existing strategy and new (unsaved) strategy
type StrategyInput = Strategy | (Omit<Strategy, "id" | "slug"> & { id: null; slug: null })

interface UserStrategyEditorProps {
  strategy: StrategyInput
  hackathonEdit?: HackathonEditInfo
  // Read-only preview: data Botcamp's client components fetch on load, read
  // on the server by the page instead.
  strategyOptions: { tags: string[]; exchanges: string[] }
  hackathonApply: HackathonApplyInfo | null
  agentVersions?: AgentPackageVersion[]
}

const HACKATHON_LOCK_COPY = {
  not_selected: "Submissions are closed. Only agents selected for the finals can be edited",
  finals_code_freeze: "Code is frozen for the finals",
} as const

export function UserStrategyEditor({
  strategy,
  hackathonEdit = { kind: "none" },
  strategyOptions,
  hackathonApply: preloadedHackathonApply,
  agentVersions = [],
}: UserStrategyEditorProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit")
  const isCreateMode = strategy.id === null

  const {
    state,
    actions,
    handlers,
    loading,
    dialogs,
    permissions,
    alerts,
    suggestions,
    hackathonApply,
  } = useStrategyForm(strategy, hackathonEdit, {
    options: strategyOptions,
    hackathonApply: preloadedHackathonApply,
  })

  // A hackathon lock explains itself; otherwise the field is locked by certification.
  const lockedCopy = (certifiedCopy: string) =>
    hackathonEdit.kind === "locked" ? HACKATHON_LOCK_COPY[hackathonEdit.reason] : certifiedCopy

  // Applying requires a saved strategy to pick from on the apply page.
  const applyableHackathon = isCreateMode ? null : hackathonApply
  const goToHackathonApply = () => {
    if (applyableHackathon) router.push(`/hackathons/${applyableHackathon.slug}/apply`)
  }

  // Get author names for preview
  const previewAuthors =
    strategy.authors?.map((a) => ({
      id: a.user.id,
      slug: a.user.slug || a.user.id,
      name:
        [a.user.firstName, a.user.lastName].filter(Boolean).join(" ") ||
        "Unknown",
    })) || []

  // A non-member's page holds only an agent, reviewed per uploaded version
  // rather than through Submit for Review; the API refuses both changes.
  const agentOnly = !!strategy.agentApprovalRequired
  // A saved agent page is done when a version of its package is approved, so
  // details, video and code files are optional and its state is the review's.
  const isAgent = strategy.id !== null && strategy.strategyType === "AGENT"
  // An agent stays an agent (the API refuses the change too).
  const typeLocked = !permissions.canEditContent || agentOnly || isAgent
  const contentOptional = agentOnly || isAgent

  // Check if can submit (all required fields filled). An agent's code is its
  // package, not loose files, so for an agent the code requirement is an
  // approved version.
  const hasCode = isAgent ? !!strategy.hasApprovedAgentVersion : state.files.length > 0
  const canSubmit = !!state.videoURL && !!state.summary && !!state.details && hasCode

  const typeCard = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Strategy Type
          {!agentOnly && <span className="text-destructive">*</span>}
          {typeLocked && (
            <Lock className="h-4 w-4 text-muted-foreground" />
          )}
        </CardTitle>
        <CardDescription>
          {!permissions.canEditContent
            ? lockedCopy("Type is locked after certification")
            : isAgent
              ? "An agent stays an agent: its page and versions are what Condor installs"
              : agentOnly
              ? "Without a cohort or hackathon membership, a page can only hold an agent"
              : "Select the type of strategy you're building"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Select
          value={state.strategyType}
          onValueChange={(value: StrategyType) => actions.setStrategyType(value)}
          disabled={typeLocked}
        >
          <SelectTrigger className={typeLocked ? "opacity-60" : ""}>
            <SelectValue placeholder="Select strategy type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AGENT">Agent - AI/autonomous trading agent</SelectItem>
            <SelectItem value="SCRIPT">Script - Standalone trading script</SelectItem>
            <SelectItem value="CONTROLLER">Controller - Hummingbot v2 controller</SelectItem>
            <SelectItem value="V1_STRATEGY">V1 Strategy - Legacy Hummingbot v1 strategy</SelectItem>
            <SelectItem value="OTHER">Other - General/uncategorized</SelectItem>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  )

  // A new agent starts from its package, not this form: choosing Agent here
  // swaps in the Create Condor Agent flow (package → details → submit),
  // carrying over what was already typed.
  if (isCreateMode && state.strategyType === "AGENT") {
    return (
      <div className="space-y-bc-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-bc-tight md:text-3xl">Create Condor Agent</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            An agent starts from its package: check it, fill in its page, and submit it for review.
          </p>
        </div>
        {typeCard}
        <NewAgentWizard initialTitle={state.title} initialSummary={state.summary} strategyOptions={strategyOptions} />
      </div>
    )
  }

  return (
    <div className="space-y-bc-6">
      {/* Header */}
      <StrategyHeader
        title={state.title}
        originalTitle={strategy.title}
        slug={strategy.slug}
        cohortNumber={strategy.cohortRelation?.number}
        canEditContent={permissions.canEditContent}
        isCertified={permissions.isCertified}
        onTitleChange={actions.setTitle}
        seatTeam={"teamName" in hackathonEdit ? hackathonEdit.teamName : null}
        titleErrorMessage={alerts.titleErrorMessage}
      />

      {/* Alerts */}
      {alerts.error && (
        <div className={cn("p-4 text-sm rounded-bc-md", alertColors.error)}>
          {alerts.error}
        </div>
      )}
      {alerts.success && (
        <div className={cn("p-4 text-sm rounded-bc-md", alertColors.success)}>
          {alerts.success}
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Main Content Area */}
        <div className="min-w-0">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "edit" | "preview")}
          >
            <TabsList className="mb-4 h-10">
              <TabsTrigger value="edit" className="gap-2">
                <Edit className="h-4 w-4" />
                Edit
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
            </TabsList>

            {/* Edit Tab */}
            <TabsContent value="edit" className="space-y-bc-6 mt-0">
              {/* Where the agent's review stands — the first thing its author sees */}
              {isAgent && strategy.latestAgentVersion && (
                <AgentReviewCard
                  version={strategy.latestAgentVersion.version}
                  status={strategy.latestAgentVersion.status}
                  reviewNote={strategy.latestAgentVersion.reviewNote}
                  feedback={strategy.latestAgentVersion.feedback}
                  hasApprovedVersion={!!strategy.hasApprovedAgentVersion}
                />
              )}

              {/* A reviewer's suggested wording, above the fields it changes */}
              {strategy.id !== null && strategy.pageSuggestions && (
                <PageSuggestionsCard
                  strategyId={strategy.id}
                  suggestions={strategy.pageSuggestions}
                  current={{ title: state.title, summary: state.summary, details: state.details }}
                  onAccepted={(field, value) => {
                    if (field === "title") actions.setTitle(value)
                    else if (field === "summary") actions.setSummary(value)
                    else actions.setDetails(value)
                  }}
                  onDone={() => router.refresh()}
                />
              )}

              {/* Strategy Type */}
              {typeCard}

              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Summary
                    {!agentOnly && <span className="text-destructive">*</span>}
                    {!permissions.canEditContent && (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </CardTitle>
                  <CardDescription>
                    {permissions.canEditContent
                      ? "A short summary shown on strategy cards (required)"
                      : lockedCopy("Content is locked after certification")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={state.summary}
                    onChange={(e) => actions.setSummary(e.target.value)}
                    placeholder="What does your strategy do in 1-2 sentences?"
                    rows={3}
                    disabled={!permissions.canEditContent}
                    className={!permissions.canEditContent ? "opacity-60" : ""}
                  />
                </CardContent>
              </Card>

              {/* Detailed Description */}
              <StrategyDetailsEditor
                details={state.details}
                onDetailsChange={actions.setDetails}
                required={!contentOptional}
                disabled={!permissions.canEditContent}
                lockedMessage={lockedCopy("Content is locked after certification")}
              />

              {/* Flowchart & Images Upload — not on an agent, whose page is its
                  package and its text */}
              {isAgent ? null : isCreateMode ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-muted-foreground">
                      Flowchart & Images
                    </CardTitle>
                    <CardDescription>
                      Save your strategy first to upload images
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                <ImageGalleryUpload
                  strategySlug={strategy.slug}
                  images={state.images}
                  onImagesChange={actions.setImages}
                  disabled={!permissions.canEditContent}
                  uploadUrl={`/api/user/strategies/${strategy.id}/images`}
                  title="Flowchart & Images"
                  description={
                    permissions.canEditContent ? (
                      <>
                        Upload flowcharts and images to visualize your strategy. Use{" "}
                        <a
                          href="https://excalidraw.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Excalidraw
                        </a>{" "}
                        to create flowcharts.
                      </>
                    ) : (
                      lockedCopy("Images are locked after certification")
                    )
                  }
                />
              )}

              {/* Code Files — not on an agent, whose code is its reviewed package */}
              {isAgent ? null : isCreateMode ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-muted-foreground">
                      Code Files <span className="text-destructive">*</span>
                    </CardTitle>
                    <CardDescription>
                      Save your strategy first to upload files
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                <FileUploadManager
                  files={state.files}
                  onFilesChange={actions.setFiles}
                  uploadUrl="/api/user/strategy-files"
                  accept={STRATEGY_FILE_ACCEPT}
                  downloadUrlPrefix="/api/user/strategy-files"
                  deleteUrlPrefix="/api/user/strategy-files"
                  entityId={strategy.id}
                  disabled={!permissions.canEditContent}
                  title={
                    <>
                      Code Files {!contentOptional && <span className="text-destructive">*</span>}
                    </>
                  }
                  description={
                    !permissions.canEditContent
                      ? lockedCopy("Files are locked after certification")
                      : contentOptional
                        ? "Optional extra files or links shown in the Code tab — the agent itself goes in the Condor Agent Package below"
                        : "Upload at least one strategy code file or add links to repositories (required)"
                  }
                  inputId="user-file-upload"
                  allowLinks={permissions.canEditContent}
                />
              )}

              {/* Condor agent package — keyed on the saved type, which the upload API checks */}
              {strategy.id !== null && strategy.strategyType === "AGENT" && (
                <div id="agent-package" className="scroll-mt-24">
                  <AgentPackageCard
                    initialVersions={agentVersions}
                    strategyId={strategy.id}
                    strategySlug={strategy.slug}
                    disabled={!permissions.canEditContent}
                    // Re-reads the page, so the progress and status cards follow the review.
                    onReviewChange={() => router.refresh()}
                  />
                </div>
              )}

              {/* An agent's code files from before packages: read only, and
                  hidden on its page once a version is approved. */}
              {isAgent && state.files.length > 0 && (
                <FileUploadManager
                  files={state.files}
                  onFilesChange={actions.setFiles}
                  uploadUrl="/api/user/strategy-files"
                  accept={STRATEGY_FILE_ACCEPT}
                  downloadUrlPrefix="/api/user/strategy-files"
                  deleteUrlPrefix="/api/user/strategy-files"
                  entityId={strategy.id!}
                  disabled
                  title="Earlier Code Files"
                  description={
                    strategy.hasApprovedAgentVersion
                      ? "Uploaded before this agent had a package. They weren't reviewed for Condor, so the agent's page shows its approved package instead."
                      : "Uploaded before this agent had a package. They weren't reviewed for Condor; once a version is approved, the agent's page shows that instead."
                  }
                  inputId="user-file-upload"
                  allowLinks={false}
                />
              )}

              {/* Video URL */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    Video Link
                    {!contentOptional && <span className="text-destructive">*</span>}
                    {!permissions.canEditContent && (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </CardTitle>
                  <CardDescription>
                    {permissions.canEditContent
                      ? `YouTube, Vimeo, Google Drive, or Loom link (${contentOptional ? "optional" : "required"})`
                      : lockedCopy("Content is locked after certification")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Input
                    value={state.videoURL}
                    onChange={(e) => actions.setVideoURL(e.target.value)}
                    placeholder="YouTube, Vimeo, Google Drive, or Loom link"
                    disabled={!permissions.canEditContent}
                    className={!permissions.canEditContent ? "opacity-60" : ""}
                  />
                  {state.videoURL &&
                    !state.videoURL.includes("youtube.com") &&
                    !state.videoURL.includes("youtu.be") &&
                    !state.videoURL.includes("vimeo.com") &&
                    !state.videoURL.includes("drive.google.com") &&
                    !state.videoURL.includes("loom.com") && (
                      <p className="text-xs text-warning mt-2">
                        Supported: YouTube, Vimeo, Google Drive, or Loom
                      </p>
                    )}
                </CardContent>
              </Card>

              {/* Tags & Exchanges */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tags className="h-5 w-5" />
                    Tags & Exchanges
                  </CardTitle>
                  <CardDescription>
                    {permissions.canEditContent
                      ? "Add tags and exchanges to help others find your strategy"
                      : lockedCopy("Tags and exchanges are locked after certification")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-bc-4">
                  <div className="space-y-bc-2">
                    <Label>Tags</Label>
                    <TagInput
                      value={state.tags}
                      onChange={actions.setTags}
                      suggestions={suggestions.tagSuggestions}
                      placeholder="Select tags..."
                      disabled={!permissions.canEditContent}
                      allowCreate={false}
                    />
                  </div>
                  <div className="space-y-bc-2">
                    <Label>Exchanges</Label>
                    <TagInput
                      value={state.exchanges}
                      onChange={actions.setExchanges}
                      suggestions={suggestions.exchangeSuggestions}
                      placeholder="Select exchanges..."
                      disabled={!permissions.canEditContent}
                      allowCreate={false}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="mt-0">
              <StrategyPreview
                title={state.title}
                slug={strategy.slug}
                summary={state.summary}
                details={state.details}
                tags={state.tags}
                exchanges={state.exchanges}
                videoURL={state.videoURL || null}
                // An agent's page shows no resources.
                images={isAgent ? [] : state.images}
                cohortNumber={strategy.cohortRelation?.number}
                files={state.files}
                authors={previewAuthors}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-bc-4 lg:sticky lg:top-20 lg:mt-14 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pb-4">
          {/* Progress & Requirements */}
          {permissions.canEditContent && !permissions.isCertified && (
            <StrategyProgressCard
              title={state.title}
              summary={state.summary}
              details={state.details}
              videoURL={state.videoURL}
              filesCount={state.files.length}
              agent={
                isAgent
                  ? { hasVersion: !!strategy.latestAgentVersion, approved: !!strategy.hasApprovedAgentVersion }
                  : undefined
              }
            />
          )}

          {/* Status Card */}
          <StrategyStatusCard
            status={strategy.status}
            canCertify={permissions.canCertify}
            canSubmit={canSubmit}
            agentOnly={agentOnly}
            hasApprovedAgentVersion={!!strategy.hasApprovedAgentVersion}
            agentReview={isAgent ? { latest: strategy.latestAgentVersion ?? null } : undefined}
            isLoading={loading.isLoading}
            isSubmitting={loading.isSubmitting}
            isCertifying={loading.isCertifying}
            isDiscarding={loading.isDiscarding}
            onSave={handlers.handleSave}
            onOpenSubmitDialog={handlers.handleOpenSubmitDialog}
            onOpenCertifyDialog={() => dialogs.setShowCertifyDialog(true)}
            onOpenDiscardDialog={() => dialogs.setShowDiscardDialog(true)}
            canEditContent={permissions.canEditContent}
            hackathonEdit={hackathonEdit}
            hackathonApply={applyableHackathon}
            onApplyToHackathon={goToHackathonApply}
          />

          {/* Visibility (only when certified) */}
          {permissions.canChangeVisibility && (
            <StrategyVisibilityCard
              visibility={state.visibility}
              isLoading={loading.isLoading}
              onVisibilityChange={actions.setVisibility}
              onSave={handlers.handleSave}
            />
          )}
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <StrategyConfirmDialogs
        showSubmitDialog={dialogs.showSubmitDialog}
        onSubmitDialogChange={dialogs.setShowSubmitDialog}
        isSubmitting={loading.isSubmitting}
        onSubmit={handlers.handleSubmitForReview}
        showCertifyDialog={dialogs.showCertifyDialog}
        onCertifyDialogChange={dialogs.setShowCertifyDialog}
        isCertifying={loading.isCertifying}
        onCertify={handlers.handleCertify}
        showDiscardDialog={dialogs.showDiscardDialog}
        onDiscardDialogChange={dialogs.setShowDiscardDialog}
        isDiscarding={loading.isDiscarding}
        onDiscard={handlers.handleDiscard}
        showApplyHackathonDialog={dialogs.showApplyHackathonDialog}
        onApplyHackathonDialogChange={dialogs.setShowApplyHackathonDialog}
        hackathonTitle={applyableHackathon?.title ?? null}
        onApplyToHackathon={goToHackathonApply}
      />
    </div>
  )
}

// Re-export types for external use
export type { Strategy, FileItem } from "./types"
