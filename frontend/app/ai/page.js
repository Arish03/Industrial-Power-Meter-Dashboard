"use client";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Sparkles } from "lucide-react";
import { useState } from "react";

const SAMPLE_RESPONSES = {
    "power factor": "Current power factor is 0.914. To improve it, consider adding power factor correction capacitors at the load side.",
    "overcurrent": "The OVERCURRENT alarm was triggered on Phase A (47.2A vs threshold 45A). Check the load connected to Phase A.",
    "thd": "THD-V is currently 2.4% which is within acceptable limits (<5%). THD-I at 10.9% is slightly elevated — check for non-linear loads.",
    "energy": "Total imported energy is 12,543 kWh. Based on current consumption of ~11.86 kW, daily usage is approximately 284 kWh.",
    default: "I can help you analyze power quality, diagnose alarms, optimize energy consumption, and explain electrical measurements. Ask me anything about your power meter data!",
};

export default function AIPage() {
    const [messages, setMessages] = useState([
        { role: "assistant", text: "Hello! I'm your AI Power Analyst. I can help you interpret your power meter data, diagnose alarms, and optimize energy usage. What would you like to know?" },
    ]);
    const [input, setInput] = useState("");

    function handleSend() {
        if (!input.trim()) return;
        const userMsg = { role: "user", text: input };
        const lower = input.toLowerCase();
        const key = Object.keys(SAMPLE_RESPONSES).find((k) => lower.includes(k)) || "default";
        const botMsg = { role: "assistant", text: SAMPLE_RESPONSES[key] };
        setMessages((prev) => [...prev, userMsg, botMsg]);
        setInput("");
    }

    function handleKey(e) {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    }

    return (
        <div className="flex flex-col h-full">
            <header className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
                <SidebarTrigger className="-ml-1 shrink-0" />
                <Separator orientation="vertical" className="h-4" />
                <Bot className="size-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                    <h1 className="text-sm font-semibold">AI Assistant</h1>
                    <p className="text-xs text-muted-foreground hidden sm:block">Power analytics &amp; diagnostics</p>
                </div>
                <Badge variant="secondary" className="gap-1 text-xs shrink-0">
                    <Sparkles className="size-3" />
                    <span className="hidden sm:inline">AI Powered</span>
                </Badge>
            </header>

            <ScrollArea className="flex-1 p-4">
                <div className="max-w-2xl mx-auto space-y-4">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    <div className="mt-4">
                        <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
                        <div className="flex flex-wrap gap-2">
                            {["Explain power factor", "Why is THD high?", "Analyze energy usage", "What caused the alarm?"].map((q) => (
                                <button key={q} onClick={() => setInput(q)} className="text-xs px-2.5 py-1 rounded-full border border-border hover:bg-muted transition-colors">
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </ScrollArea>

            <div className="p-4 border-t border-border shrink-0">
                <div className="max-w-2xl mx-auto flex gap-2">
                    <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey}
                        placeholder="Ask about your power meter data…" className="flex-1" />
                    <Button onClick={handleSend} size="icon"><Send className="size-4" /></Button>
                </div>
            </div>
        </div>
    );
}
