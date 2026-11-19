"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/botcamp/components/ui/card"

export interface WelcomeSeriesStepStat {
  day: number
  label: string
  sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
}

interface WelcomeSeriesStatsProps {
  steps: WelcomeSeriesStepStat[]
}

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return "—"
  return `${Math.round((numerator / denominator) * 100)}%`
}

export function WelcomeSeriesStats({ steps }: WelcomeSeriesStatsProps) {
  const totalSent = steps.reduce((sum, s) => sum + s.sent, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome Series</CardTitle>
        <CardDescription>
          Automated drip sent on days 0/3/7/14/21/28 after signup, via the daily{" "}
          <code className="text-xs">/api/cron/welcome-series</code> job. Delivered/opened/clicked
          columns populate once the Resend webhook is receiving events.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {totalSent === 0 ? (
          <p className="text-sm text-muted-foreground">
            No welcome-series emails sent yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Step</th>
                  <th className="py-2 pr-4 font-medium text-right">Sent</th>
                  <th className="py-2 pr-4 font-medium text-right">Delivered</th>
                  <th className="py-2 pr-4 font-medium text-right">Opened</th>
                  <th className="py-2 pr-4 font-medium text-right">Clicked</th>
                  <th className="py-2 pr-4 font-medium text-right">Bounced</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((s) => (
                  <tr key={s.day} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{s.label}</td>
                    <td className="py-2 pr-4 text-right">{s.sent.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right">
                      {s.delivered.toLocaleString()}{" "}
                      <span className="text-muted-foreground">({pct(s.delivered, s.sent)})</span>
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {s.opened.toLocaleString()}{" "}
                      <span className="text-muted-foreground">({pct(s.opened, s.delivered)})</span>
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {s.clicked.toLocaleString()}{" "}
                      <span className="text-muted-foreground">({pct(s.clicked, s.delivered)})</span>
                    </td>
                    <td className="py-2 pr-4 text-right">{s.bounced.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
