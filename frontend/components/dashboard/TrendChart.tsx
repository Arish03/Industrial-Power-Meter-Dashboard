"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"

interface TelemetryPoint {
    ts_ms: number
    p_kw: { total: number }
    [key: string]: any
}

interface TrendChartProps {
    data: TelemetryPoint[]
}

const formatTime = (tickItem: number) => {
    return new Date(tickItem).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function TrendChart({ data }: TrendChartProps) {
    // Map data to chart format
    const chartData = data.map((d) => ({
        time: d.ts_ms,
        power: d.elec?.p_kw?.total || 0,
    }))

    return (
        <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
                <CardTitle>Total Power Trend</CardTitle>
                <CardDescription>Live power consumption over the last 60 seconds (kW)</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                {chartData.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                        Waiting for data...
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
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
                                tick={{ fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                labelFormatter={(label) => new Date(label).toLocaleTimeString()}
                                formatter={(value: any) => [Number(value).toFixed(2), "kW"]}
                                contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}
                            />
                            <Area
                                type="monotone"
                                dataKey="power"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorPower)"
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    )
}
