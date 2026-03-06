import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Info, ShieldAlert } from "lucide-react"

interface Alarm {
    _id: string
    ts_ms: number
    severity: "critical" | "warning" | "info"
    code: string
    msg: string
}

interface AlarmsPanelProps {
    alarms: Alarm[]
}

const severityConfig = {
    critical: { icon: ShieldAlert, color: "bg-destructive text-destructive-foreground" },
    warning: { icon: AlertTriangle, color: "bg-warning text-warning-foreground" },
    info: { icon: Info, color: "bg-muted text-muted-foreground" },
}

export function AlarmsPanel({ alarms }: AlarmsPanelProps) {
    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Recent Alarms</CardTitle>
                <CardDescription>Latest system events and alerts</CardDescription>
            </CardHeader>
            <CardContent>
                {alarms.length === 0 ? (
                    <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                        No active alarms
                    </div>
                ) : (
                    <div className="space-y-4">
                        {alarms.slice(0, 5).map((alarm) => {
                            const config = severityConfig[alarm.severity] || severityConfig.info
                            const Icon = config.icon
                            return (
                                <div key={alarm._id} className="flex items-start gap-4 rounded-lg border p-3">
                                    <div className={`rounded-full p-2 ${config.color}`}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium leading-none">{alarm.code}</p>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(alarm.ts_ms).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{alarm.msg}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
