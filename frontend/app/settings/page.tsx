"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Save } from "lucide-react"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { fetchSettings, saveSettings } from "@/lib/api"

export default function SettingsPage() {
    const { theme, setTheme } = useTheme()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [appSettings, setAppSettings] = useState({
        timezone: "UTC",
        data_retention_days: 30,
        enable_audio_alarms: false
    })

    useEffect(() => {
        fetchSettings()
            .then(data => {
                if (data) {
                    setAppSettings({
                        timezone: data.timezone || "UTC",
                        data_retention_days: data.data_retention_days || 30,
                        enable_audio_alarms: data.enable_audio_alarms || false
                    })
                }
            })
            .catch(err => console.error("Error loading app settings:", err))
            .finally(() => setLoading(false))
    }, [])

    const handleSave = async () => {
        setSaving(true)
        try {
            await saveSettings(appSettings)
            alert("Settings saved successfully!")
        } catch (err) {
            alert("Failed to save settings.")
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div>Loading settings...</div>

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">App Settings</h2>
                <p className="text-muted-foreground">Manage your personal preferences for this dashboard.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>Customize how the dashboard looks on your device.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Theme Preference</Label>
                            <p className="text-sm text-muted-foreground">Select between light and dark mode manually.</p>
                        </div>
                        <Select value={theme} onValueChange={setTheme}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select Theme" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="light">Light</SelectItem>
                                <SelectItem value="dark">Dark</SelectItem>
                                <SelectItem value="system">System</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Preferences</CardTitle>
                    <CardDescription>General dashboard behavior and alerts.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Audio Alarms</Label>
                            <p className="text-sm text-muted-foreground">Play a sound when a critical alarm triggers.</p>
                        </div>
                        <Switch
                            checked={appSettings.enable_audio_alarms}
                            onCheckedChange={(c) => setAppSettings(prev => ({ ...prev, enable_audio_alarms: c }))}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Display Timezone</Label>
                            <p className="text-sm text-muted-foreground">Format timestamps globally.</p>
                        </div>
                        <Select
                            value={appSettings.timezone}
                            onValueChange={(v) => setAppSettings(prev => ({ ...prev, timezone: v }))}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="UTC">Coordinated Universal Time (UTC)</SelectItem>
                                <SelectItem value="Local">Local Browser Time</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end pt-6">
                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <span className="animate-spin mr-2">◓</span>}
                        <Save className="mr-2 h-4 w-4" />
                        Save Settings
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
