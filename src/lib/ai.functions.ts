import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openrouter/free";

type Msg = {
  role: "system" | "user" | "assistant";
  content: any;
};

async function callAI(messages: Msg[]): Promise<string> {
  const key = process.env.OPENAI_API_KEY;

  if (!key) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",

      // Recommended by OpenRouter
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Smart Notes",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
    }),
  });

  const json = await res.json();

  if (!res.ok) {
    console.error(json);

    throw new Error(
      json?.error?.message ??
        `OpenRouter Error ${res.status}`
    );
  }

  return json.choices?.[0]?.message?.content ?? "";
}

type Action =
  | "summarize"
  | "key_points"
  | "action_items"
  | "improve"
  | "explain"
  | "title"
  | "tone_professional"
  | "tone_casual"
  | "tone_academic";

const PROMPTS: Record<Action, string> = {
  summarize:
    "Summarize the following note in 3-5 concise sentences. Focus on the main ideas. Reply with only the summary.",

  key_points:
    "Extract the key points from the following note as markdown bullets.",

  action_items:
    "Read the following note and produce a markdown checklist using '- [ ]'. If none exist reply 'No action items found.'",

  improve:
    "Rewrite the following text improving grammar, clarity and flow while preserving meaning.",

  explain:
    "Explain the following text in simple language anyone can understand.",

  title:
    "Generate one short title (maximum 8 words).",

  tone_professional:
    "Rewrite professionally.",

  tone_casual:
    "Rewrite casually.",

  tone_academic:
    "Rewrite academically.",
};

export const runNoteAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { action: Action; text: string }) => i)
  .handler(async ({ data }) => {
    if (!data.text.trim()) {
      throw new Error("Note is empty.");
    }

    const output = await callAI([
      {
        role: "system",
        content:
          "You are a helpful writing assistant for a Smart Notes application.",
      },
      {
        role: "user",
        content: `${PROMPTS[data.action]}

${data.text}`,
      },
    ]);

    return {
      output: output.trim(),
    };
  });

export const chatWithNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (i: {
      noteContent: string;
      history: Msg[];
      question: string;
    }) => i
  )
  .handler(async ({ data }) => {
    const output = await callAI([
      {
        role: "system",
        content: `You are answering questions only using this note.

NOTE:

${data.noteContent}`,
      },
      ...data.history,
      {
        role: "user",
        content: data.question,
      },
    ]);

    return {
      output: output.trim(),
    };
  });

export const scanDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { imageDataUrl: string }) => i)
  .handler(async ({ data }) => {
    const key = process.env.OPENAI_API_KEY;

    if (!key) {
      throw new Error("Missing OPENAI_API_KEY");
    }

    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",

        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Smart Notes",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "Extract every piece of text from this image. Preserve formatting using markdown. Do not add explanations.",
              },
              {
                type: "image_url",
                image_url: {
                  url: data.imageDataUrl,
                },
              },
            ],
          },
        ],
      }),
    });

    const json = await res.json();

console.log("Status:", res.status);
console.log("Response:", JSON.stringify(json, null, 2));

if (!res.ok) {
  throw new Error(
    `${res.status}: ${json?.error?.message || JSON.stringify(json)}`
  );
}

    return {
      output: (json.choices?.[0]?.message?.content ?? "").trim(),
    };
  });