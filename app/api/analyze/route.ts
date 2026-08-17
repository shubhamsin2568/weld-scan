import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const imageUrl = body?.imageUrl;

    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json(
        { error: "No image provided." },
        { status: 400 }
      );
    }

    const match = imageUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);

    if (!match) {
      return NextResponse.json(
        { error: "Image must be a base64 data URL." },
        { status: 400 }
      );
    }

    const mimeType = match[1];
    const base64Data = match[2];

    const prompt = `
Analyze this weld radiograph for inspection support.

Identify:
- defect type
- possible cause
- severity
- location
- confidence
- description
- recommended remedy
- prevention

Possible defect types:
Porosity, Slag Inclusion, Lack of Fusion,
Lack of Penetration, Crack, Undercut,
Incomplete Joint Penetration, or No Clear Defect.

If the image is unclear, say "Image unclear".
Do not invent a defect.

Return ONLY valid JSON:

{
  "defectType": "string",
  "possibleCause": "string",
  "severity": "Low | Moderate | High | Unclear",
  "location": "string",
  "confidence": "number%",
  "description": "string",
  "recommendedRemedy": "string",
  "prevention": "string"
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
    });

    const raw = response.text?.trim() || "";

    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let result;

    try {
      result = JSON.parse(cleaned);
    } catch {
      result = {
        defectType: "AI Analysis",
        possibleCause: cleaned,
        severity: "Unclear",
        location: "Not determined",
        confidence: "N/A",
        description: cleaned,
        recommendedRemedy:
          "Review the indicated area using the applicable inspection code or standard.",
        prevention:
          "Verify the result with a qualified radiographic testing inspector.",
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Gemini analysis error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gemini analysis failed.",
      },
      { status: 500 }
    );
  }
}
