import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ReactNode } from "react"

interface MetricsCardProps {
    title: string
    value: string | number
    unit: string
    icon: ReactNode
    description?: string
}

export function MetricsCard({ title, value, unit, icon, description }: MetricsCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {value !== undefined && value !== null ? value : "--"} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
                </div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                )}
            </CardContent>
        </Card>
    )
}
