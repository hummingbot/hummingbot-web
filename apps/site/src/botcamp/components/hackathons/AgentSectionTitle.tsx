export function Eyebrow({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-2">
      {children}
    </div>
  )
}

export function SectionTitle({ title }: { title: string }): React.ReactElement {
  return <h2 className="mb-5 text-2xl font-bold tracking-bc-tight">{title}</h2>
}
