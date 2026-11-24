"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface RegistrantFunnelContextValue {
  open: boolean
  toggle: () => void
}

// Lets the "Registrants" stat card (inside the stats grid) toggle a panel
// that renders as a sibling further down the tree — same split-context
// pattern as ApplicationsFilterContext, since the panel needs to span full
// width below the grid rather than living inside one grid cell.
const RegistrantFunnelContext = createContext<RegistrantFunnelContextValue | null>(null)

export function RegistrantFunnelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <RegistrantFunnelContext.Provider value={{ open, toggle: () => setOpen((v) => !v) }}>
      {children}
    </RegistrantFunnelContext.Provider>
  )
}

export function useRegistrantFunnel() {
  return useContext(RegistrantFunnelContext)
}
