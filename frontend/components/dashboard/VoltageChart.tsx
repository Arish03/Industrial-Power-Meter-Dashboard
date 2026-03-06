"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"

interface TelemetryPoint {
    ts_ms: number
    elec?: {
        v_ln_rms?: {
            A: number
            B: number
            C: number
        }
    }
    [key: string]: any
}

interface VoltageChartProps {
    data: TelemetryPoint[]
}

const formatTime = (tickItem: number) => {
    return new Date(tickItem).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function VoltageChart({ data }: VoltageChartProps) {
    // Map data to chart format
    const chartData = data.map((d) => ({
        time: d.ts_ms,
        voltageA: d.elec?.v_ln_rms?.A || 0,
        voltageB: d.elec?.v_ln_rms?.B || 0,
        voltageC: d.elec?.v_ln_rms?.C || 0,
    }))

    return (
        <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
                <CardTitle>Phase Voltages Trend</CardTitle>
                <CardDescription>Live phase voltages over the last 60 seconds (V)</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                {chartData.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                        Waiting for data...
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                            <XAxis
                                dataKey="time"
                                tickFormatter={formatTime}
                                tick={{ fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={30}
                            />
                            <YAxis
                                domain={['auto', 'auto']}
                                tick={{ fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                labelFormatter={(label) => new Date(label).toLocaleTimeString()}
                                formatter={(value: any, name: any) => [
                                    `${Number(value).toFixed(1)} V`,
                                    name === 'voltageA' ? 'Phase A' : name === 'voltageB' ? 'Phase B' : 'Phase C'
                                ]}
                                contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="voltageA"
                                name="Phase A"
                                stroke="#ef4444"
                                strokeWidth={2}
                                isAnimationActive={false}
                                dot={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="voltageB"
                                name="Phase B"
                                stroke="#eab308"
                                strokeWidth={2}
                                isAnimationActive={false}
                                dot={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="voltageC"
                                name="Phase C"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                isAnimationActive={false}
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    )
}
