"use client";
import { useState, useEffect, useRef } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bot, Send, Sparkles, Trash2, User, AlertTriangle, Loader2 } from "lucide-react";
import { getSocket } from "@/lib/socket";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

const QUICK_PROMPTS = [
    "What is my current power factor?",
    "Is my THD level acceptable?",
    "Explain the active alarms",
    "How can I improve energy efficiency?",
    "What does the current load look like?",
    "Is my voltage balanced across phases?",
];

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
    return (
        <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                    <span
                        key={i}
                        className="size-2 rounded-full bg-muted-foreground/60 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                    />
                ))}
            </div>
        </div>
    );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function Message({ msg }) {
    const isUser = msg.role === "user";
    return (
        <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
            <div className={`size-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${isUser ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"}`}>
                {msg.text}
            </div>
        </div>
    );
}

// ── Main AI Page ──────────────────────────────────────────────────────────────
export default function AIPage() {
    const [messages, setMessages] = useState([
        {
            role: "assistant",
            text: "Hello! I'm your AI Power Analyst powered by Azure OpenAI.\n\nI have access to your live power meter data — ask me anything about voltage, current, power factor, energy consumption, alarms, or how to improve your electrical system.",
        },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [telemetry, setTelemetry] = useState(null);
    const [alarms, setAlarms] = useState([]);
    const [info, setInfo] = useState(null);
    const bottomRef = useRef(null);

    // Subscribe to live telemetry for context
    useEffect(() => {
        const socket = getSocket();
        socket.on("telemetry", setTelemetry);
        socket.on("alarms:history", setAlarms);
        socket.on("alarm", (a) => setAlarms(p => [a, ...p].slice(0, 20)));
        socket.on("info", setInfo);
        return () => {
            socket.off("telemetry", setTelemetry);
            socket.off("alarms:history", setAlarms);
            socket.off("alarm");
            socket.off("info", setInfo);
        };
    }, []);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    async function sendMessage(text) {
        const userText = (text || input).trim();
        if (!userText || loading) return;

        setInput("");
        setError(null);
        const userMsg = { role: "user", text: userText };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);

        try {
            const res = await fetch(`${BACKEND}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userText,
                    history: messages.slice(-10),
                    telemetry,
                    alarms,
                    info,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.hint) {
                    setError(`${data.error} — ${data.hint}`);
                } else {
                    setError(data.error || "Something went wrong");
                }
                return;
            }

            setMessages(prev => [...prev, { role: "assistant", text: data.reply }]);
        } catch {
            setError("Could not reach the backend. Is it running on port 3001?");
        } finally {
            setLoading(false);
        }
    }

    function handleKey(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    function clearChat() {
        setMessages([{
            role: "assistant",
            text: "Chat cleared. How can I help you analyse your power meter data?",
        }]);
        setError(null);
    }

    const hasData = !!telemetry;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
                <SidebarTrigger className="-ml-1 shrink-0" />
                <Separator orientation="vertical" className="h-4" />
                <Bot className="size-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                    <h1 className="text-sm font-semibold">AI Assistant</h1>
                    <p className="text-xs text-muted-foreground hidden sm:block">Powered by Azure OpenAI</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={hasData ? "default" : "secondary"} className="gap-1 text-xs">
                        <Sparkles className="size-3" />
                        <span className="hidden sm:inline">{hasData ? "Live data" : "No data"}</span>
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={clearChat} className="size-8" title="Clear chat">
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            </header>

            {/* Error banner */}
            {error && (
                <Alert className="mx-4 mt-3 border-yellow-500/30 bg-yellow-500/10 text-yellow-400 shrink-0">
                    <AlertTriangle className="size-4" />
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 px-4 py-4">
                <div className="max-w-2xl mx-auto space-y-4">
                    {messages.map((msg, i) => (
                        <Message key={i} msg={msg} />
                    ))}
                    {loading && <TypingIndicator />}

                    {/* Quick prompts — only at start */}
                    {messages.length === 1 && !loading && (
                        <div className="pt-2">
                            <p className="text-xs text-muted-foreground mb-2 text-center">Try asking:</p>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {QUICK_PROMPTS.map((q) => (
                                    <button
                                        key={q}
                                        onClick={() => sendMessage(q)}
                                        className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors text-left"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t border-border shrink-0">
                <div className="max-w-2xl mx-auto flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder={hasData ? "Ask about your live power data…" : "Ask anything about power quality…"}
                        className="flex-1 text-sm"
                        disabled={loading}
                    />
                    <Button onClick={() => sendMessage()} size="icon" disabled={!input.trim() || loading}>
                        {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-1.5">
                    Press <kbd className="px-1 py-0.5 text-xs border rounded">Enter</kbd> to send ·
                    <kbd className="px-1 py-0.5 text-xs border rounded ml-1">Shift+Enter</kbd> for new line
                </p>
            </div>
        </div>
    );
}
