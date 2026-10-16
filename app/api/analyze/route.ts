import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const geminiKey = process.env.GEMINI_API_KEY;
const openRouterKey = process.env.OPENROUTER_API_KEY;

const ai = geminiKey
  ? new GoogleGenAI({
      apiKey: geminiKey,
    })
  : null;

const ANALYSIS_PROMPT = `
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

Return ONLY valid JSON in exactly this structure:

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

function cleanJson(raw: string) {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseResult(raw: string) {
  const cleaned = cleanJson(raw);

  try {
    return JSON.parse(cleaned);
  } catch {
    return {
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
}

async function analyzeWithGemini(
  mimeType: string,
  base64Data: string
) {
  if (!ai) {
    throw new Error("Gemini API key is not configured.");
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: ANALYSIS_PROMPT,
          },
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

  if (!raw) {
    throw new Error("Gemini returned an empty response.");
  }

  return parseResult(raw);
}

async function analyzeWithOpenRouter(
  imageUrl: string
) {
  if (!openRouterKey) {
    throw new Error("OpenRouter API key is not configured.");
  }

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: ANALYSIS_PROMPT,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("OpenRouter error:", data);

    throw new Error(
      data?.error?.message ||
        `OpenRouter request failed with status ${response.status}`
    );
  }

  const raw =
    data?.choices?.[0]?.message?.content?.trim() || "";

  if (!raw) {
    throw new Error("OpenRouter returned an empty response.");
  }

  return parseResult(raw);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const imageUrl = body?.imageUrl;

    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json(
        {
          error: "No image provided.",
        },
        {
          status: 400,
        }
      );
    }

    const match = imageUrl.match(
      /^data:(image\/[^;]+);base64,(.+)$/
    );

    if (!match) {
      return NextResponse.json(
        {
          error: "Image must be a base64 data URL.",
        },
        {
          status: 400,
        }
      );
    }

    const mimeType = match[1];
    const base64Data = match[2];

    // ------------------------------------------------
    // 1. TRY GEMINI FIRST
    // ------------------------------------------------

    try {
      console.log("Trying Gemini...");

      const result = await analyzeWithGemini(
        mimeType,
        base64Data
      );

      console.log("Gemini analysis successful.");

      return NextResponse.json({
        ...result,
        provider: "Gemini",
      });
    } catch (geminiError) {
      console.error(
        "Gemini failed. Trying OpenRouter...",
        geminiError
      );
    }

    // ------------------------------------------------
    // 2. GEMINI FAILED → TRY OPENROUTER
    // ------------------------------------------------

    try {
      console.log("Trying OpenRouter...");

      const result = await analyzeWithOpenRouter(
        imageUrl
      );

      console.log("OpenRouter analysis successful.");

      return NextResponse.json({
        ...result,
        provider: "OpenRouter",
      });
    } catch (openRouterError) {
      console.error(
        "OpenRouter also failed:",
        openRouterError
      );

      return NextResponse.json(
        {
          error:
            "Both AI servers are temporarily unavailable. Please try again shortly.",
        },
        {
          status: 503,
        }
      );
    }
  } catch (error) {
    console.error("Analysis API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Analysis failed.",
      },
      {
        status: 500,
      }
    );
  }
}