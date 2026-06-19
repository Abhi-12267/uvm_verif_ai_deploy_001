"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "ai/react";
import type { Message } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

type TopicId = "uvm" | "sv" | "pcie" | "cxl" | "debug";

type TopicItem = {
  id: TopicId;
  label: string;
  active: string;
  text: string;
};

const TOPICS: TopicItem[] = [
  { id: "uvm", label: "UVM Architecture", active: "bg-blue-600", text: "text-blue-400" },
  { id: "sv", label: "SystemVerilog", active: "bg-violet-600", text: "text-violet-400" },
  { id: "pcie", label: "PCIe Protocol", active: "bg-orange-600", text: "text-orange-400" },
  { id: "cxl", label: "CXL Protocol", active: "bg-emerald-600", text: "text-emerald-400" },
  { id: "debug", label: "Debug & Coverage", active: "bg-rose-600", text: "text-rose-400" }
];

export default function ChatPage() {
  const [topic, setTopic] = useState<TopicId>("uvm");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const {
    messages,
    input,
    setInput,
    append,
    isLoading,
    setMessages
  } = useChat({
    api: "/api/chat",
    body: { topic }
  });

  const activeTopic = useMemo(
    () => TOPICS.find((item) => item.id === topic) ?? TOPICS[0],
    [topic]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const onTopicChange = (newId: TopicId) => {
    if (newId === topic) return;
    setMessages([]);
    setTopic(newId);
  };

  const submitCurrentMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    await append({
      role: "user",
      content: trimmed
    });
  };

  const onTextareaKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await submitCurrentMessage();
    }
  };

  const onFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitCurrentMessage();
  };

  return (
    <main className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <header className="px-4 py-3 border-b border-zinc-800 flex items-center gap-3">
        <h1 className="font-semibold tracking-wide">VerifAI</h1>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-mono text-white ${activeTopic.active}`}
        >
          {activeTopic.label}
        </span>
      </header>

      <section className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-2 border-b border-zinc-800">
        {TOPICS.map((item) => {
          const isActive = item.id === topic;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTopicChange(item.id)}
              className={[
                "rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                isActive ? `${item.active} text-white` : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              ].join(" ")}
            >
              {item.label}
            </button>
          );
        })}
      </section>

      <section className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !isLoading ? (
          <div className="h-full flex items-center justify-center text-zinc-600 text-sm text-center">
            Ask something like: "How would you structure a UVM env for a PCIe endpoint with RAL + scoreboard?"
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message: Message) => {
              const isUser = message.role === "user";
              return (
                <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={[
                      "max-w-[80%] px-4 py-3 text-sm",
                      isUser
                        ? "bg-zinc-700 rounded-2xl rounded-tr-sm"
                        : "bg-zinc-800 rounded-2xl rounded-tl-sm"
                    ].join(" ")}
                  >
                    <div className="markdown-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading ? (
              <div className="flex justify-start">
                <div className="max-w-[80%] px-4 py-3 text-sm bg-zinc-800 rounded-2xl rounded-tl-sm">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce" />
                    <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce dot-delay-150" />
                    <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce dot-delay-300" />
                  </div>
                </div>
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>
        )}
      </section>

      <form onSubmit={onFormSubmit} className="border-t border-zinc-800 px-4 py-3 flex gap-2">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={onTextareaKeyDown}
          rows={2}
          placeholder="Ask a question or describe a scenario..."
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-600"
        />
        <button
          type="submit"
          disabled={isLoading || input.trim() === ""}
          className="bg-zinc-700 hover:bg-zinc-600 rounded-xl px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </form>
    </main>
  );
}
