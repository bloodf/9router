import { DefaultExecutor } from "./default.js";
import { getCachedKimchiModelMetadata } from "../services/kimchiModels.js";

const TOP_LEVEL_OPENAI_GATEWAY_DROPS = [
  "anthropic_version",
  "anthropic_beta",
  "client_metadata",
  "mcp_servers",
  "stop_sequences",
  "thinking",
  "top_k",
];

function systemToText(system) {
  if (typeof system === "string") return system;
  if (Array.isArray(system)) {
    return system
      .map((part) => {
        if (typeof part === "string") return part;
        if (typeof part?.text === "string") return part.text;
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function mergeTopLevelSystem(body) {
  if (!body?.system || !Array.isArray(body.messages)) return;
  const text = systemToText(body.system).trim();
  if (!text) return;

  const existing = body.messages.find((msg) => msg?.role === "system");
  if (!existing) {
    body.messages.unshift({ role: "system", content: text });
    return;
  }

  if (typeof existing.content === "string") {
    existing.content = `${text}\n\n${existing.content}`;
  } else if (Array.isArray(existing.content)) {
    existing.content.unshift({ type: "text", text });
  }
}

function stripMessageArtifacts(body) {
  if (!Array.isArray(body?.messages)) return;
  for (const msg of body.messages) {
    if (!msg || typeof msg !== "object") continue;
    delete msg.cache_control;
    if (!Array.isArray(msg.content)) continue;
    msg.content = msg.content.map((part) => {
      if (!part || typeof part !== "object") return part;
      const { cache_control, signature, ...clean } = part;
      return clean;
    });
  }
}

function stripToolArtifacts(body) {
  if (!Array.isArray(body?.tools)) return;
  body.tools = body.tools.map((tool) => {
    if (!tool || typeof tool !== "object") return tool;
    const { cache_control, ...clean } = tool;
    return clean;
  });
}

// Strip `reasoning_content` echoed by clients on assistant messages.
// When 9Router streams a thinking model (e.g. minimax-m3, deepseek-r1) back
// to a client, the response carries a full `reasoning_content` scratch block.
// If the client echoes the whole history on the next turn (the default for
// most OpenAI-compatible SDKs), Kimchi's upstream counts that scratch as
// input tokens — multi-turn conversations balloon to 100k+ input tokens and
// the model starts returning empty content. Stripping the field here keeps
// `content` (the actual answer) for context while shedding the scratch.
function stripReasoningContent(body) {
  if (!Array.isArray(body?.messages)) return;
  for (const msg of body.messages) {
    if (msg && msg.role === "assistant" && "reasoning_content" in msg) {
      delete msg.reasoning_content;
    }
  }
}

function isAnthropicBackedKimchiModel(model) {
  const meta = getCachedKimchiModelMetadata(model);
  if (meta?.provider === "anthropic" || meta?.upstreamProvider === "anthropic") return true;
  return /(^|[-_/])(?:claude|anthropic)(?:[-_/]|$)/i.test(String(model || ""));
}

export class KimchiExecutor extends DefaultExecutor {
  constructor() {
    super("kimchi");
  }

  transformRequest(model, body, stream, credentials) {
    const transformed = super.transformRequest(model, body, stream, credentials);
    if (!transformed || typeof transformed !== "object") return transformed;

    mergeTopLevelSystem(transformed);
    for (const key of TOP_LEVEL_OPENAI_GATEWAY_DROPS) {
      if (transformed[key] !== undefined) delete transformed[key];
    }
    delete transformed.system;

    if (isAnthropicBackedKimchiModel(model)) {
      delete transformed.reasoning_effort;
      delete transformed.reasoning;
      delete transformed.thinking;
    }

    stripMessageArtifacts(transformed);
    stripToolArtifacts(transformed);
    stripReasoningContent(transformed);
    return transformed;
  }
}

export default KimchiExecutor;
