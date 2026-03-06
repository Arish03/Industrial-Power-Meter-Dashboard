"use client"

import { useState } from "react"
import { Send, Bot } from "lucide-react"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function AIPage() {
    const [messages, setMessages] = useState([
        { role: "assistant", content: "Hello! I am your power analytics assistant. How can I help you understand your industrial meter data today?" }
    ])
    const [input, setInput] = useState("")

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim()) return

        const newMsgs = [...messages, { role: "user", content: input }]
        setMessages(newMsgs)
        setInput("")

        // Mock AI response
        setTimeout(() => {
            setMessages([...newMsgs, { role: "assistant", content: "I'm analyzing the recent power trends. Your Phase A current seems to have spiked briefly 5 minutes ago, but otherwise values are well within normal operating thresholds." }])
        }, 1000)
    }

    return (
        <div className="flex h-[calc(100vh-8rem)] w-full max-w-4xl mx-auto flex-col gap-4">
            <Card className="flex flex-1 flex-col overflow-hidden">
                <CardHeader className="border-b bg-muted/20 pb-4">
                    <CardTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-primary" />
                        Power AI Assistant
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full p-4">
                        <div className="flex flex-col gap-4">
                            {messages.map((m, i) => (
                                <div
                                    key={i}
                                    className={`flex w-fit max-w-[80%] flex-col gap-2 rounded-lg px-4 py-3 text-sm ${m.role === "user"
                                            ? "ml-auto bg-primary text-primary-foreground"
                                            : "bg-muted text-foreground"
                                        }`}
                                >
                                    {m.content}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
                <CardFooter className="border-t bg-muted/20 p-4">
                    <form onSubmit={handleSend} className="flex w-full items-center gap-2">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about your phase imbalance or peak demands..."
                            className="flex-1"
                        />
                        <Button type="submit" size="icon">
                            <Send className="h-4 w-4" />
                            <span className="sr-only">Send</span>
                        </Button>
                    </form>
                </CardFooter>
            </Card>
        </div>
    )
}
