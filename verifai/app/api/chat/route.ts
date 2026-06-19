import Anthropic from "@anthropic-ai/sdk";
import { AnthropicStream, StreamingTextResponse } from "ai";

export const runtime = "edge";

type Topic = "uvm" | "sv" | "pcie" | "cxl" | "debug";

type IncomingMessage = {
  role: string;
  content: string;
};

type ChatRequestBody = {
  messages?: IncomingMessage[];
  topic?: string;
};

const BASE_SYSTEM_PROMPT =
  "You are a senior ASIC verification engineer with 10+ years of experience conducting a technical interview prep session. The user is a mid-to-senior engineer (~4-5 years) preparing for interviews at AMD, Intel, Qualcomm, or Samsung. Respond like a knowledgeable colleague, not a textbook. Be concise and direct. Use SystemVerilog code snippets in ```systemverilog blocks when relevant. After each answer ask ONE focused follow-up question. When the user is wrong, correct them clearly but constructively.";

const TOPIC_SEEDS: Record<Topic, string> = {
  uvm: "Focus on UVM component hierarchy, factory, config_db, sequences, TLM ports, RAL model (frontdoor/backdoor), phase mechanisms.",
  sv: "Focus on constraint solving (dist, solve...before, foreach), functional coverage (covergroups, cross), SVA, OOP in SV.",
  pcie: "Focus on PCIe layered architecture, TLP types, flow control, LTSSM states, Gen1-5 bandwidth, verification scenarios.",
  cxl: "Focus on CXL.io/cache/mem, Type 1/2/3 devices, H2D/D2H channels, MESI coherence, flit modes, CXL 2.0 vs 3.0 deltas.",
  debug:
    "Focus on coverage closure, scoreboard architectures, X-propagation debug, waveform analysis, protocol bug patterns."
};

function normalizeTopic(rawTopic: string | undefined): Topic {
  if (rawTopic === "sv") return "sv";
  if (rawTopic === "pcie") return "pcie";
  if (rawTopic === "cxl") return "cxl";
  if (rawTopic === "debug") return "debug";
  return "uvm";
}

function buildSystemPrompt(topic: Topic): string {
  return `${BASE_SYSTEM_PROMPT} ${TOPIC_SEEDS[topic]}`;
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response("Missing ANTHROPIC_API_KEY", { status: 500 });
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const topic = normalizeTopic(body.topic);
  const systemPrompt = buildSystemPrompt(topic);

  const safeMessages = (body.messages ?? [])
    .filter(
      (message: IncomingMessage) =>
        typeof message?.content === "string" &&
        (message?.role === "user" || message?.role === "assistant")
    )
    .map((message: IncomingMessage) => ({
      role: message.role as "user" | "assistant",
      content: message.content
    }));

  const anthropic = new Anthropic({ apiKey });

  try {
    const stream = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      stream: true,
      system: systemPrompt,
      messages: safeMessages
    });

    const responseStream = AnthropicStream(stream);
    return new StreamingTextResponse(responseStream);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate response";
    return new Response(message, { status: 500 });
  }
}
