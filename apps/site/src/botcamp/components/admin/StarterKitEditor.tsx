"use client"

import { Plus, RotateCcw, Trash2 } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { Input } from "@/botcamp/components/ui/input"
import { Label } from "@/botcamp/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/botcamp/components/ui/select"
import { Textarea } from "@/botcamp/components/ui/textarea"
import { SCORING_CRITERIA, SQUAD_RULES } from "@/botcamp/lib/hackathon-squads"
import {
  POSITION_MODES,
  SHUTDOWN_POLICIES,
  type PositionMode,
  type RaceHost,
  type ShutdownPolicy,
  type StarterKit,
  type StarterKitMarket,
} from "@/botcamp/lib/hackathon-starter-kit"

// Lists are edited as raw text and split without trimming, so what the admin
// types round-trips exactly; the API trims and drops blanks on save.
const splitComma = (value: string) => (value ? value.split(",") : [])
const splitLines = (value: string) => (value ? value.split("\n") : [])

interface StarterKitEditorProps {
  kit: StarterKit
  isDefault: boolean
  onChange: (kit: StarterKit) => void
  onReset: () => void
  hosts: RaceHost[]
  onHostsChange: (hosts: RaceHost[]) => void
}

export function StarterKitEditor({
  kit,
  isDefault,
  onChange,
  onReset,
  hosts,
  onHostsChange,
}: StarterKitEditorProps) {
  const set = <K extends keyof StarterKit>(key: K, value: StarterKit[K]) => onChange({ ...kit, [key]: value })
  const setMarket = (index: number, patch: Partial<StarterKitMarket>) =>
    set(
      "markets",
      kit.markets.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    )
  const setHost = (index: number, patch: Partial<RaceHost>) =>
    onHostsChange(hosts.map((h, i) => (i === index ? { ...h, ...patch } : h)))

  return (
    <Card>
      <CardHeader className="space-y-bc-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Starter Kit</CardTitle>
          {!isDefault && (
            <Button type="button" variant="outline" size="sm" onClick={onReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to default
            </Button>
          )}
        </div>
        {isDefault && (
          <p className="rounded-bc-md border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning">
            Using the default kit (sponsor venues, any pair, no model set). Set the model and review
            the venues before registration closes — editing anything makes it this hackathon&apos;s
            own kit when you save.
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          The values every agent must use, published on the Resources page. Starting capital (
          {SQUAD_RULES.startingCapitalAmount}) and scoring (
          {SCORING_CRITERIA.map((c) => `${c.label} ${c.weight}%`).join(", ")}) come from the
          leaderboard config and aren&apos;t edited here.
        </p>
      </CardHeader>
      <CardContent className="space-y-bc-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-bc-2">
            <Label htmlFor="kit-provider">LLM provider</Label>
            <Input
              id="kit-provider"
              value={kit.llmProvider}
              onChange={(e) => set("llmProvider", e.target.value)}
              placeholder="OpenRouter"
            />
          </div>
          <div className="space-y-bc-2">
            <Label htmlFor="kit-botname">Bot name pattern</Label>
            <Input
              id="kit-botname"
              value={kit.botNamePattern}
              onChange={(e) => set("botNamePattern", e.target.value)}
              placeholder="{team}-{agent}"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              <code>{"{team}"}</code> and <code>{"{agent}"}</code> fill with the team and strategy slugs.
            </p>
          </div>
          <div className="space-y-bc-2">
            <Label htmlFor="kit-position-mode">Position mode (perps)</Label>
            <Select value={kit.positionMode} onValueChange={(v) => set("positionMode", v as PositionMode)}>
              <SelectTrigger id="kit-position-mode" className="font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POSITION_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode} className="font-mono">
                    {mode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Account-wide on a connector, so every agent sharing an account must use the same one.
            </p>
          </div>
          <div className="space-y-bc-2">
            <Label htmlFor="kit-shutdown">Shutdown policy</Label>
            <Select value={kit.shutdownPolicy} onValueChange={(v) => set("shutdownPolicy", v as ShutdownPolicy)}>
              <SelectTrigger id="kit-shutdown" className="font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHUTDOWN_POLICIES.map((policy) => (
                  <SelectItem key={policy} value={policy} className="font-mono">
                    {policy}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              <code>on_kill_switch</code> in each agent&apos;s shutdown.md — what a wind-down closes.
            </p>
          </div>
        </div>

        <div className="space-y-bc-2">
          <Label htmlFor="kit-models">Approved models (one `agent_key` per line)</Label>
          <Textarea
            id="kit-models"
            value={kit.approvedModels.join("\n")}
            onChange={(e) => set("approvedModels", splitLines(e.target.value))}
            placeholder="openrouter:deepseek/deepseek-v4.1-flash"
            rows={3}
            className="font-mono text-sm"
          />
        </div>

        <div className="space-y-bc-3">
          <div className="flex items-center justify-between">
            <Label>Allowed venues and pairs</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => set("markets", [...kit.markets, { venue: "", connectors: [], pairs: [] }])}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add venue
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Connectors are Hummingbot connector names as they appear in `connector_name`. Leave pairs
            empty to allow any pair. Comma-separated.
          </p>
          {kit.markets.map((market, i) => (
            <div key={i} className="grid gap-2 rounded-bc-lg border border-border p-3 md:grid-cols-[10rem_1fr_1fr_auto]">
              <Input
                value={market.venue}
                onChange={(e) => setMarket(i, { venue: e.target.value })}
                placeholder="Venue"
                aria-label="Venue"
              />
              <Input
                value={market.connectors.join(",")}
                onChange={(e) => setMarket(i, { connectors: splitComma(e.target.value) })}
                placeholder="gate_io, gate_io_perpetual"
                aria-label="Connectors"
                className="font-mono text-sm"
              />
              <Input
                value={market.pairs.join(",")}
                onChange={(e) => setMarket(i, { pairs: splitComma(e.target.value) })}
                placeholder="Any pair"
                aria-label="Pairs"
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => set("markets", kit.markets.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Remove venue</span>
              </Button>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-bc-2">
            <Label htmlFor="kit-support-label">Support channel</Label>
            <Input
              id="kit-support-label"
              value={kit.supportLabel}
              onChange={(e) => set("supportLabel", e.target.value)}
              placeholder="#hackathon on the Hummingbot Discord"
            />
          </div>
          <div className="space-y-bc-2">
            <Label htmlFor="kit-support-url">Support link</Label>
            <Input
              id="kit-support-url"
              value={kit.supportUrl}
              onChange={(e) => set("supportUrl", e.target.value)}
              placeholder="https://discord.gg/hummingbot"
            />
          </div>
        </div>

        <div className="space-y-bc-2">
          <Label htmlFor="kit-notes">Notes (markdown)</Label>
          <Textarea
            id="kit-notes"
            value={kit.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Anything else every racer needs to know."
            rows={3}
            className="text-sm"
          />
        </div>

        <div className="space-y-bc-3 border-t border-border pt-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Race hosts ({hosts.length})</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Only shown to builders holding a finals seat, on their hackathon dashboard. The name
                is what they set as `server_name`.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onHostsChange([...hosts, { name: "", address: "", note: "" }])}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add host
            </Button>
          </div>
          {hosts.map((host, i) => (
            <div key={i} className="grid gap-2 rounded-bc-lg border border-border p-3 md:grid-cols-[12rem_1fr_1fr_auto]">
              <Input
                value={host.name}
                onChange={(e) => setHost(i, { name: e.target.value })}
                placeholder="server_name"
                aria-label="Host name"
                className="font-mono text-sm"
              />
              <Input
                value={host.address}
                onChange={(e) => setHost(i, { address: e.target.value })}
                placeholder="Address"
                aria-label="Host address"
                className="font-mono text-sm"
              />
              <Input
                value={host.note}
                onChange={(e) => setHost(i, { note: e.target.value })}
                placeholder="Note (e.g. which teams)"
                aria-label="Host note"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onHostsChange(hosts.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Remove host</span>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
