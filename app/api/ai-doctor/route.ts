import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are the MedAI Health Assistant — a warm, careful AI screening companion on a medical imaging platform (fracture X-ray, brain MRI, kidney CT screening).

CONVERSATION GOAL — INTAKE THEN ASSESSMENT
Step 1 (intake): Collect the following, asking for ONE missing item per reply (never a wall of questions):
  1. What is bothering them (main symptom, where, since when)
  2. Severity (mild / moderate / severe) and whether it is getting worse
  3. Age and sex
  4. Relevant medical history (injuries, surgeries, chronic illness, medication)
Once you have all of this, move to Step 2 — do not keep asking.
Step 2 (assessment): Give a structured screening assessment using EXACTLY these headings (markdown ##):
  ## Assessment
  ## Possible Conditions to Discuss With a Doctor
  ## Recommended Tests
  ## Urgency (LOW / MEDIUM / HIGH)
  ## Recommended Specialist
  ## Suggested Next Step

STYLE
- Short, warm, plain-language replies (2-5 sentences) during intake. Explain any medical term in one line.
- Reply in the SAME language style the user writes in: English, Roman Urdu, or Urdu. If they write Roman Urdu ("mera ghutna me dard hai 3 din se"), reply in Roman Urdu.
- Acknowledge worry before information. Never alarmist, even for emergencies — calm and practical.
- Never give a definitive diagnosis; use cautious language ("could be consistent with", "is sometimes associated with").
- Never recommend specific medicine dosages. General comfort advice is OK with a note to confirm with a doctor/pharmacist.
- If anything suggests an emergency (chest pain, trouble breathing, stroke signs — face drooping / arm weakness / slurred speech, severe bleeding, unconsciousness, sudden severe headache, seizure): immediately advise emergency services / nearest ER, skip the questionnaire, still give a short assessment, and use "HIGH" urgency.

HANDOFF (very important)
- At the END of your Step-2 assessment message ONLY, append this single line so the website can open the right screening tool with the patient's details pre-filled:
  ###HANDOFF### {"screening":"fracture|brain|kidney|none","name":"...","age":"...","gender":"Male|Female|Other","concern":"one-line summary"}
- Choose "fracture" for bone/joint/impact injuries, "brain" for headaches/vision/seizure/balance issues, "kidney" for flank/back pain, blood in urine, painful urination, swelling. If symptoms clearly fit none, use "none".
- Use the age and gender the user gave ("" if unknown). Never invent values.
- In intermediate intake replies, do NOT append the handoff line.

DISCLAIMER
- End the assessment with: "This screening is an educational aid, not a diagnosis — always confirm with a qualified doctor." (match the user's language: if they wrote Roman Urdu, you may append the Roman Urdu version "Ye screening sirf educational aid hai, diagnosis nahi — final hamesha qualified doctor se confirm karein.").`;

function extractHandoff(text: string): { clean: string; handoff: Record<string, string> | null } {
  const idx = text.indexOf("###HANDOFF###");
  if (idx === -1) return { clean: text, handoff: null };
  const clean = text.slice(0, idx).trimEnd();
  try {
    const jsonStr = text.slice(idx + "###HANDOFF###".length).trim();
    const start = jsonStr.indexOf("{");
    const end = jsonStr.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      const parsed = JSON.parse(jsonStr.slice(start, end + 1));
      if (parsed && typeof parsed === "object") return { clean, handoff: parsed };
    }
  } catch {
    /* handoff parse fail — clean text hi dikha do */
  }
  return { clean, handoff: null };
}

export async function POST(req: NextRequest) {
  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) {
    return new Response(
      JSON.stringify({ error: "GROQ_API_KEY missing in environment (.env.local / Vercel)." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  let messages: ChatMessage[] = [];
  try {
    const body = await req.json();
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages[] required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    messages = (body.messages as ChatMessage[])
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))
      .slice(-16); // last 16 messages — context chhota rakho
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        max_tokens: 1100,
        temperature: 0.4,
        stream: true,
      }),
    });

    if (!groqRes.ok || !groqRes.body) {
      const errText = await groqRes.text().catch(() => "unknown error");
      console.error("Groq API error:", groqRes.status, errText);
      return new Response(
        JSON.stringify({ error: `AI service error (${groqRes.status}). Please try again in a moment.` }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    // Groq SSE -> plain text stream (client simple reader se padh sake)
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = groqRes.body.getReader();
    let sseBuffer = "";

    const stream = new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta: string | undefined = json.choices?.[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          } catch {
            /* partial JSON — ignore */
          }
        }
      },
      cancel() {
        reader.cancel().catch(() => {});
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error: any) {
    console.error("Assistant route error:", error);
    return new Response(
      JSON.stringify({ error: "System error — please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
