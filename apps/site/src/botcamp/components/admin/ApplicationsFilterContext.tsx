"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

export type ApplicationsFilterValue = "all" | "DRAFT" | "FINALIZED" | "REVIEWED" | "selected"

interface ApplicationsFilterContextValue {
  filter: ApplicationsFilterValue
  setFilter: (value: ApplicationsFilterValue) => void
}

// Lets the dashboard's top stat cards (Applications/Selected/Needs Review)
// and AdminApplicationsTable's own tab pills drive the same filter, even
// though a "Current Hackathon" card's static content sits between them in
// the JSX tree. Optional: AdminApplicationsTable falls back to its own local
// state when rendered outside a Provider (the per-hackathon Applications
// page has no stat cards to sync with).
const ApplicationsFilterContext = createContext<ApplicationsFilterContextValue | null>(null)

export function ApplicationsFilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<ApplicationsFilterValue>("all")
  return (
    <ApplicationsFilterContext.Provider value={{ filter, setFilter }}>
      {children}
    </ApplicationsFilterContext.Provider>
  )
}

export function useApplicationsFilter() {
  return useContext(ApplicationsFilterContext)
}
