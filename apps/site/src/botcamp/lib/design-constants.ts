// ============================================
// SHARED DESIGN CONSTANTS
// Centralized styling tokens for consistent UI
// Aligned with Hummingbot Design System
// ============================================

// ============================================
// CORE PRIMITIVES (typography + card interaction)
// Shared across marketing AND dashboard surfaces.
// See DESIGN_GUIDE.md for usage.
// ============================================

// Eyebrow: small mono uppercase kicker above headings — the signature
// Botcamp pattern. Use on every page header and major section.
export const eyebrow =
  "font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-primary"

// Card interaction tiers. Base card styling lives on the <Card> component
// (rounded-bc-xl border bg-card). Layer these on top:
export const cardStyles = {
  // Whole card is a link → lift + shadow on hover.
  interactive:
    "transition-all hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5",
  // Container card with an inner button/link (not fully clickable) →
  // subtle border tint only (honest affordance, no lift).
  hover: "transition-colors hover:border-primary/40",
  // Staggered entrance animation for grids/lists.
  enter: "animate-in fade-in slide-in-from-bottom-4",
}

// ============================================
// BRAND PALETTES
// ============================================

// Hummingbot signature brand colors
export const hbColors = {
  teal: "text-hb-teal",
  yellow: "text-hb-yellow",
  magenta: "text-hb-magenta",
  orange: "text-hb-orange",
  cyan: "text-hb-cyan",
}

// Condor palette (gold/amber theme for hackathons)
export const condorColors = {
  gold: "text-condor-gold",
  goldDeep: "text-condor-gold-deep",
  orange: "text-condor-orange",
  // Badge/status variants
  goldBadge: "bg-condor-gold/10 text-condor-gold border-condor-gold/20",
  orangeBadge: "bg-condor-orange/10 text-condor-orange border-condor-orange/20",
  // Button variants
  primaryButton: "bg-condor-gold text-condor-ink hover:bg-[#ffd60a] transition-colors",
  outlineButton: "border-condor-gold/50 text-condor-gold hover:bg-condor-gold/10 transition-colors",
  // Backgrounds
  heroBg: "bg-gradient-to-br from-condor-gold/10 via-background to-condor-orange/5",
  sectionBg: "bg-gradient-to-b from-condor-gold/5 via-background to-background",
  cardBg: "bg-ink-950 border-ink-800",
}

// Botcamp palette (orange-forward, education)
export const botcampColors = {
  orange: "text-botcamp-orange",
  orangeDeep: "text-botcamp-orange-deep",
  amber: "text-botcamp-amber",
  peach: "text-botcamp-peach",
  lime: "text-botcamp-lime",
  // Badge variants
  orangeBadge: "bg-botcamp-orange/10 text-botcamp-orange border-botcamp-orange/20",
  amberBadge: "bg-botcamp-amber/10 text-botcamp-amber border-botcamp-amber/20",
  limeBadge: "bg-botcamp-lime/10 text-botcamp-lime border-botcamp-lime/20",
}

// ============================================
// STATUS & TYPE COLORS (badge patterns)
// ============================================

// Status colors (cohorts, hackathons, notifications)
export const statusColors: Record<string, string> = {
  // Cohort statuses
  UPCOMING: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  ACTIVE: "bg-green-500/10 text-green-500 border-green-500/20",
  COMPLETED: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  // Hackathon statuses
  DRAFT: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  COMING_SOON: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  REGISTRATION: "bg-green-500/10 text-green-500 border-green-500/20",
  COUNTDOWN: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  JUDGING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  // Notification statuses
  PENDING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  SENT: "bg-green-500/10 text-green-500 border-green-500/20",
  FAILED: "bg-red-500/10 text-red-500 border-red-500/20",
}

// Hackathon entry status colors
export const hackathonEntryStatusColors: Record<string, string> = {
  REGISTERED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  SUBMITTED: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  VERIFIED: "bg-green-500/10 text-green-500 border-green-500/20",
  DISQUALIFIED: "bg-red-500/10 text-red-500 border-red-500/20",
  WINNER: "bg-amber-500/10 text-amber-500 border-amber-500/20",
}

// Condor Cup - Application status colors
export const applicationStatusColors: Record<string, string> = {
  DRAFT: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  FINALIZED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  REVIEWED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
}

// Condor Cup - Racing/podium colors
export const racingColors = {
  gold: "bg-amber-500 text-black",
  silver: "bg-slate-400 text-black",
  bronze: "bg-orange-600 text-white",
  leader: "bg-red-600 text-white",
}

// Race P&L gain / loss, as inline colors (charts and stats read them too).
// Validated against the card's dark (#0a0a0a) and light (#fff) surfaces —
// see the dataviz skill's palette validator. Tailwind's emerald/red-500 fail
// the lightness-band check on the dark surface; these 600-weight steps pass.
export const GAIN_COLOR = "#059669"
export const LOSS_COLOR = "#dc2626"

// Condor Cup - Strategy type colors
export const strategyTypeColors: Record<string, string> = {
  AGENT: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  SCRIPT: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  CONTROLLER: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  V1_STRATEGY: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  OTHER: "bg-gray-500/10 text-gray-500 border-gray-500/20",
}

// Role colors (users)
export const roleColors: Record<string, string> = {
  ADMIN: "bg-red-500/10 text-red-500 border-red-500/20",
  INSTRUCTOR: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  STUDENT: "bg-green-500/10 text-green-500 border-green-500/20",
}

// Level colors (courses)
export const levelColors: Record<string, string> = {
  BASIC: "bg-green-500/10 text-green-500 border-green-500/20",
  INTERMEDIATE: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  ADVANCED: "bg-red-500/10 text-red-500 border-red-500/20",
}

// Notification type colors
export const notificationTypeColors: Record<string, string> = {
  WELCOME: "bg-green-500/10 text-green-500 border-green-500/20",
  COURSE_ENROLLED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  COHORT_ENROLLED: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  NEW_CONTENT: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  WEEK_UPDATED: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  PASSWORD_RESET: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  COHORT_REMINDER: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  BROADCAST: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  COURSE_INACTIVITY_WEEK: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  COURSE_INACTIVITY_MONTH: "bg-orange-500/10 text-orange-500 border-orange-500/20",
}

// Lesson type badge colors (use text-foreground for readability, vary only background)
// VIDEO: Green (primary) - main content type
// ARTICLE: Blue - reading content
// QUIZ: Yellow/amber (warning) - assessment
// CHALLENGE: Purple/magenta (accent) - hands-on work
export const lessonTypeColors: Record<string, string> = {
  VIDEO: "bg-primary/20 text-foreground border-transparent",
  ARTICLE: "bg-blue-500/20 text-foreground border-transparent",
  QUIZ: "bg-warning/20 text-foreground border-transparent",
  CHALLENGE: "bg-accent/20 text-foreground border-transparent",
}

// Strategy status colors (workflow states)
export const strategyStatusColors: Record<string, { icon: string; iconColor: string; border: string; bg: string }> = {
  DRAFT: { icon: "Clock", iconColor: "text-muted-foreground", border: "", bg: "" },
  SUBMITTED: { icon: "Clock", iconColor: "text-blue-500", border: "border-blue-500/50", bg: "bg-blue-500/10" },
  CHANGES_REQUESTED: { icon: "AlertCircle", iconColor: "text-warning", border: "border-warning/50", bg: "bg-warning/10" },
  APPROVED: { icon: "CheckCircle", iconColor: "text-success", border: "border-success/50", bg: "bg-success/10" },
  CERTIFIED: { icon: "Award", iconColor: "text-metric-purple", border: "border-metric-purple/50", bg: "bg-metric-purple/10" },
}

// Condor agent registry review states (AgentVersion.status)
export const agentVersionStatusColors: Record<string, string> = {
  PENDING: "text-blue-500 border-blue-500/50 bg-blue-500/10",
  NEEDS_REVIEW: "text-warning border-warning/50 bg-warning/10",
  APPROVED: "text-success border-success/50 bg-success/10",
  REJECTED: "text-destructive border-destructive/50 bg-destructive/10",
}

// Alert/message box colors
export const alertColors = {
  success: "text-success bg-success/10 border border-success/20",
  error: "text-destructive bg-destructive/10 border border-destructive/20",
  warning: "text-warning bg-warning/10 border border-warning/20",
  info: "text-blue-500 bg-blue-500/10 border border-blue-500/20",
}

// Tag badge colors (for strategies, courses)
export const tagColors = {
  default: "bg-blue-500/10 text-blue-500 border border-blue-500/20",
  exchange: "bg-primary/10 text-primary border border-primary/20",
  certified: "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20",
  hasCode: "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20",
  hasVideo: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
  hasStory: "bg-primary/10 text-primary border border-primary/20",
}

// ============================================
// METRIC CARD COLORS (BotcampStats pattern)
// ============================================

export const metricColors = {
  cyan: {
    border: "border-cyan-500 hover:border-cyan-400 dark:border-cyan-400/70 dark:hover:border-cyan-300",
    icon: "text-cyan-600 dark:text-cyan-400",
    number: "text-cyan-600 dark:text-cyan-400",
    shadow: "hover:shadow-cyan-500/30",
    background: "bg-white dark:bg-slate-900",
  },
  purple: {
    border: "border-purple-500 hover:border-purple-400 dark:border-purple-400/70 dark:hover:border-purple-300",
    icon: "text-purple-600 dark:text-purple-400",
    number: "text-purple-600 dark:text-purple-400",
    shadow: "hover:shadow-purple-500/30",
    background: "bg-white dark:bg-slate-900",
  },
  emerald: {
    border: "border-emerald-500 hover:border-emerald-400 dark:border-emerald-400/70 dark:hover:border-emerald-300",
    icon: "text-emerald-600 dark:text-emerald-400",
    number: "text-emerald-600 dark:text-emerald-400",
    shadow: "hover:shadow-emerald-500/30",
    background: "bg-white dark:bg-slate-900",
  },
}

// ============================================
// LAYOUT CONSTANTS
// ============================================

export const layout = {
  // Sidebar widths
  sidebar: {
    default: "w-64",      // 256px - dashboard, admin
    medium: "w-72",       // 288px - cohort learn
    large: "w-80",        // 320px - lesson, filter sidebars
  },

  // Container classes
  container: {
    default: "container mx-auto px-4",
    narrow: "container mx-auto px-4 max-w-4xl",
    wide: "container mx-auto px-4 max-w-7xl",
  },

  // Main content padding (when in sidebar layouts)
  mainContent: "p-6 lg:p-8",
}

// Legacy export for backward compatibility
export const containers = layout.container

// ============================================
// SPACING CONSTANTS
// ============================================

export const spacing = {
  // Section vertical padding (responsive)
  section: {
    sm: "py-12",                          // 48px
    md: "py-12 md:py-24",                 // 48px -> 96px
    lg: "py-12 md:py-24 lg:py-32",        // 48px -> 96px -> 128px
  },

  // Page content padding
  page: "py-12 md:py-16",

  // Legacy spacing (kept for backward compatibility)
  pageY: "py-12",
  sectionY: "py-16",
  containerX: "px-4",
  cardPadding: "p-6",

  // Gap patterns
  gap: {
    sm: "gap-4",
    md: "gap-6",
    lg: "gap-8",
  },

  // Legacy gap exports
  gapDefault: "gap-6",
  gapLg: "gap-8",
}

// ============================================
// PAGE BACKGROUNDS (gradient presets)
// ============================================

export const pageBackgrounds = {
  // Used on members page
  members: "bg-gradient-to-b from-emerald-50/30 via-teal-50/30 to-cyan-50/30 dark:from-slate-900/60 dark:via-slate-900/30 dark:to-background",

  // Used on strategies page
  strategies: "bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900/60 dark:via-purple-900/30 dark:to-background",

  // Used on cohorts page
  cohorts: "bg-slate-100 dark:bg-slate-950",

  // Used on education page (merged cohorts + courses)
  education: "bg-slate-100 dark:bg-slate-950",

  // Condor/Hackathon pages (gold theme)
  condor: "bg-condor-ink",
  condorHero: "bg-gradient-to-br from-condor-gold/10 via-condor-ink to-condor-orange/5",
  condorSection: "bg-gradient-to-b from-condor-gold/5 via-background to-background",

  // Generic page gradient
  default: "bg-gradient-to-b from-muted/20 to-background",

  // Section backgrounds
  sectionDark: "bg-slate-100 dark:bg-slate-950",
  sectionGradient: "bg-gradient-to-b from-background to-muted/50",
  sectionMuted: "bg-muted/30",
}

// ============================================
// COMPONENT PRESETS
// ============================================

export const presets = {
  // Page header pattern (public pages)
  pageHeader: {
    wrapper: "mb-12",
    eyebrow: eyebrow + " mb-3",
    title: "text-4xl md:text-5xl font-bold tracking-bc-tight mb-4",
    description: "text-muted-foreground text-lg",
  },

  // Centered page header (landing sections)
  pageHeaderCentered: {
    wrapper: "text-center mb-12",
    eyebrow: eyebrow + " mb-3",
    title: "text-4xl md:text-5xl font-bold tracking-bc-tight mb-4",
    description: "text-muted-foreground text-lg max-w-2xl mx-auto",
  },

  // Admin/dashboard page header
  adminPageHeader: {
    wrapper: "flex items-center justify-between gap-4",
    titleWrapper: "",
    eyebrow: eyebrow + " mb-2",
    title: "text-2xl md:text-3xl font-bold tracking-bc-tight",
    description: "text-muted-foreground mt-1",
  },

  // Section title (landing pages)
  sectionHeader: {
    wrapper: "text-center mb-12",
    title: "text-3xl font-bold tracking-bc-tighter sm:text-4xl md:text-5xl mb-4",
    description: "text-muted-foreground max-w-[700px] mx-auto",
  },

  // Stat card (quick stats in dashboards)
  statCard: {
    header: "flex flex-row items-center justify-between pb-2",
    title: "text-sm font-medium",
    icon: "h-4 w-4 text-muted-foreground",
    value: "text-2xl font-bold",
    description: "text-xs text-muted-foreground",
  },

  // List item row (in cards with border)
  listItemRow: "flex items-center justify-between p-4 rounded-bc-lg border border-border",

  // Empty state
  emptyState: {
    wrapper: "flex flex-col items-center justify-center py-12",
    icon: "h-12 w-12 text-muted-foreground mb-4",
    title: "text-lg font-medium mb-2",
    description: "text-muted-foreground text-center mb-4",
  },
}

// ============================================
// GRID PATTERNS
// ============================================

export const grids = {
  // Card grids
  cards: {
    two: "grid grid-cols-1 md:grid-cols-2 gap-6",
    three: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
    four: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6",
  },

  // Stats grids
  stats: {
    three: "grid gap-4 md:grid-cols-3",
    four: "grid gap-4 md:grid-cols-2 lg:grid-cols-4",
  },
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Get badge classes by type
export function getBadgeClasses(
  value: string,
  type: "status" | "role" | "level" | "lessonType" | "notification"
): string {
  switch (type) {
    case "status":
      return statusColors[value] || statusColors.PENDING
    case "role":
      return roleColors[value] || roleColors.STUDENT
    case "level":
      return levelColors[value] || levelColors.BASIC
    case "lessonType":
      return lessonTypeColors[value] || lessonTypeColors.ARTICLE
    case "notification":
      return notificationTypeColors[value] || notificationTypeColors.EMAIL
    default:
      return ""
  }
}
