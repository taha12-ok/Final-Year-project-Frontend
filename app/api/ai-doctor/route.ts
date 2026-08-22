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
        response: `## ⚠️ Setup Required\nGROQ_API_KEY missing in .env.local file.`
      });
    }

    const prompt = `You are an expert AI medical assistant with years of clinical experience. 
Analyze the following patient information and provide a comprehensive medical assessment.

Patient Information:
- Name: ${name}
- Age: ${age} years
- Gender: ${gender || "Not specified"}
- Medical History: ${history || "None provided"}
- Current Symptoms: ${symptoms}
- Duration of Symptoms: ${duration || "Not specified"}
- Severity: ${severity}

Important safety rules — follow strictly:
- Do NOT state a definitive diagnosis. Use cautious, probabilistic language ("may indicate", "could be consistent with").
- Present "Possible Conditions" as things to discuss with a doctor, never as confirmed findings.
- Always defer final clinical judgment to a qualified human doctor.

Please provide a detailed assessment in this exact format:

## 🔍 Initial Assessment
Write 2-3 sentences summarizing the patient's reported symptoms (not a diagnosis).

## ⚠️ Possible Conditions to Discuss With a Doctor
- Condition 1: explanation
- Condition 2: explanation
- Condition 3: explanation

## 🧪 Recommended Tests & Scans
- Test 1
- Test 2
- Test 3

## 🏥 Which AI Screening Model May Help
Recommend one of these based on symptoms:
- 🦴 Fracture Detection (X-ray)
- 🧠 Brain Tumor (Brain MRI)
- 🫘 Kidney Disease (CT Scan)

## 💊 Immediate Recommendations
- Recommendation 1
- Recommendation 2
- Recommendation 3

## 🚨 Recommended Urgency to Seek Care
HIGH / MEDIUM / LOW — explain why in one sentence.

## 👨‍⚕️ Specialist to Consult
Name the specialist type and why.

---
⚠️ DISCLAIMER: This is an AI-generated screening aid for educational purposes only and is NOT a medical diagnosis. Always consult a qualified doctor for proper diagnosis and treatment.`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1024,
        temperature: 0.3,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq API error:", groqRes.status, errText);
      return NextResponse.json({
        response: `## ⚠️ API Error\nStatus: ${groqRes.status}\n\nDetails: ${errText}\n\n## 🚨 Note\nIf symptoms are severe, please visit a doctor immediately.`
      });
    }

    const data = await groqRes.json();
    const result = data.choices?.[0]?.message?.content;

    if (!result) {
      return NextResponse.json({
        response: `## ⚠️ No Response\nAI model did not return a response. Please try again.`
      });
    }

    return NextResponse.json({ response: result });

  } catch (error: any) {
    console.error("AI Doctor catch error:", error);
    return NextResponse.json({
      response: `## ⚠️ System Error\n${error.message}\n\nPlease try again.`
    });
  }
}
