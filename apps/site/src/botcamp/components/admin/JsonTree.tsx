// A JSON value laid out key by key, with each value's type and size, so the
// structure behind a stored blob can be read without opening the database.
// Native <details> elements keep it a server component.

// Past this many items an array shows a count instead of every element.
const MAX_ITEMS = 50
const MAX_STRING = 200

export function jsonTypeLabel(value: unknown): string {
  if (value === null) return "null"
  if (Array.isArray(value)) return `array · ${value.length}`
  if (typeof value === "object") return `object · ${Object.keys(value as object).length}`
  return typeof value
}

function isContainer(value: unknown): value is object {
  return typeof value === "object" && value !== null
}

function Primitive({ value }: { value: unknown }): React.ReactElement {
  if (value === null) return <span className="text-muted-foreground">null</span>
  if (typeof value === "string") {
    const shown = value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value
    return <span className="break-all text-emerald-600 dark:text-emerald-400">&quot;{shown}&quot;</span>
  }
  return <span className="text-sky-600 dark:text-sky-400">{String(value)}</span>
}

function JsonNode({ name, value, depth }: { name: string; value: unknown; depth: number }): React.ReactElement {
  if (!isContainer(value)) {
    return (
      <div className="flex flex-wrap items-baseline gap-x-3 py-0.5 pl-4">
        <span className="font-semibold text-foreground">{name}</span>
        <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{jsonTypeLabel(value)}</span>
        <Primitive value={value} />
      </div>
    )
  }
  const entries = Array.isArray(value) ? value.map((v, i) => [String(i), v] as const) : Object.entries(value)
  const shown = entries.slice(0, MAX_ITEMS)
  return (
    <details open={depth < 1} className="py-0.5">
      <summary className="cursor-pointer select-none hover:text-primary">
        <span className="font-semibold text-foreground">{name}</span>
        <span className="ml-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{jsonTypeLabel(value)}</span>
      </summary>
      <div className="ml-3 border-l border-border pl-2">
        {entries.length === 0 && <div className="py-0.5 pl-4 text-muted-foreground">empty</div>}
        {shown.map(([key, child]) => (
          <JsonNode key={key} name={key} value={child} depth={depth + 1} />
        ))}
        {entries.length > shown.length && (
          <div className="py-0.5 pl-4 text-muted-foreground">… {entries.length - shown.length} more</div>
        )}
      </div>
    </details>
  )
}

export function JsonTree({ value }: { value: unknown }): React.ReactElement {
  const entries = isContainer(value) ? Object.entries(value) : []
  return (
    <div className="font-mono text-xs leading-relaxed">
      {entries.map(([key, child]) => (
        <JsonNode key={key} name={key} value={child} depth={0} />
      ))}
    </div>
  )
}
