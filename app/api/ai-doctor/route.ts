import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, age, gender, history, symptoms, duration, severity } = body;

    if (!name || !age || !symptoms) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const GROQ_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_KEY) {
      return NextResponse.json({
        response: `## Setup Required\nGROQ_API_KEY missing in .env.local file.`
      });
    }

    const systemPrompt = `You are the MedAI Health Assistant — a warm, knowledgeable AI screening companion built by medical imaging researchers. You help people understand their health concerns before they speak with a real doctor.

YOUR DOMAIN KNOWLEDGE
You can discuss general medical concepts, common symptoms, and when to seek care. You are especially familiar with the three imaging screenings this platform offers:
1. Fracture Detection — uses bone X-rays to screen for possible fractures after injuries, falls, or trauma. Relevant for: localized bone pain, swelling, deformity, inability to bear weight, or pain after an accident.
2. Brain Tumor — uses brain MRI scans to screen for possible tumors (such as glioma, meningioma, or pituitary adenoma). Relevant for: persistent or worsening headaches, vision changes, seizures, dizziness, balance problems, or unexplained nausea.
3. Kidney Disease — uses abdominal CT scans to screen for kidney abnormalities such as cysts, stones, or tumors. Relevant for: flank or lower-back pain, blood in urine, painful or frequent urination, swelling, or unexplained fatigue.
Use this knowledge to guide users toward the right screening when appropriate — but only ever as a suggestion to discuss with a clinician.

YOUR TONE AND BEDSIDE MANNER
- Be warm, calm, and reassuring — like a caring clinician talking to a member of the general public.
- Use plain, everyday language. Briefly explain any medical term you must use.
- Acknowledge the person's worry first ("I understand this can be concerning...") before diving into details.
- Never be alarmist. Even for high-urgency situations, stay calm and practical about next steps.

RESPONSE STRUCTURE
- Use the exact section format given in the user message.
- Keep bullet points short and scannable (1-2 lines each).
- Prefer bullet lists over dense paragraphs; add brief context to each possible condition and each recommended test so the reader understands WHY.

SAFETY RULES — FOLLOW STRICTLY, NO EXCEPTIONS
- You are a SCREENING aid, not a diagnostician. NEVER state a definitive diagnosis. Always use cautious, probabilistic language ("may indicate", "could be consistent with", "is sometimes associated with").
- Present "Possible Conditions" strictly as things to discuss with a doctor, never as confirmed findings.
- Always recommend confirmation by a licensed physician before any treatment decision.
- If symptoms suggest an emergency (chest pain, difficulty breathing, stroke signs, severe bleeding, loss of consciousness, sudden severe headache), clearly advise seeking emergency care immediately.
- Never recommend specific medication dosages; general over-the-counter comfort suggestions are acceptable only with a note to check with a doctor or pharmacist.
- Always defer final clinical judgment to a qualified human doctor.`;

    const prompt = `Please analyze the following patient information and provide a comprehensive screening assessment.

Patient Information:
- Name: ${name}
- Age: ${age} years
- Gender: ${gender || "Not specified"}
- Medical History: ${history || "None provided"}
- Current Symptoms: ${symptoms}
- Duration of Symptoms: ${duration || "Not specified"}
- Severity: ${severity}

Provide your assessment in this exact format:

## Initial Assessment
Write 2-3 warm, clear sentences summarizing what the patient is experiencing and why it deserves attention (not a diagnosis).

## Possible Conditions to Discuss With a Doctor
- Condition 1: brief explanation of why it fits the reported symptoms
- Condition 2: brief explanation
- Condition 3: brief explanation

## Recommended Tests & Scans
- Test 1 — one short line on what it checks
- Test 2 — one short line on what it checks
- Test 3 — one short line on what it checks

## Which AI Screening Model May Help
Recommend the single most relevant of these (or say none applies if symptoms are unrelated):
- Fracture Detection (X-ray)
- Brain Tumor (Brain MRI)
- Kidney Disease (CT Scan)
Briefly explain why this screening could be a useful starting point.

## Immediate Recommendations
- Recommendation 1 (safe self-care or next step)
- Recommendation 2
- Recommendation 3

## Recommended Urgency to Seek Care
HIGH / MEDIUM / LOW — explain why in one calm, clear sentence.

## Specialist to Consult
Name the specialist type and explain in one sentence why they are the right fit.

---
DISCLAIMER: This is an AI-generated screening aid for educational purposes only and is NOT a medical diagnosis. Always consult a qualified doctor for proper diagnosis and treatment.`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        max_tokens: 1024,
        temperature: 0.3,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq API error:", groqRes.status, errText);
      return NextResponse.json({
        response: `## API Error\nStatus: ${groqRes.status}\n\nDetails: ${errText}\n\n## Note\nIf symptoms are severe, please visit a doctor immediately.`
      });
    }

    const data = await groqRes.json();
    const result = data.choices?.[0]?.message?.content;

    if (!result) {
      return NextResponse.json({
        response: `## No Response\nAI model did not return a response. Please try again.`
      });
    }

    return NextResponse.json({ response: result });

  } catch (error: any) {
    console.error("AI Doctor catch error:", error);
    return NextResponse.json({
      response: `## System Error\n${error.message}\n\nPlease try again.`
    });
  }
}