import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

type WeldInfo = {
  material?: string;
  weldingProcess?: string;
  jointType?: string;
  thickness?: string;
};

type Coordinate = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Defect = {
  defectType: string;
  confidence: string;
  severity: string;
  location: string;
  evidence: string;
  description: string;
  possibleCause: string;
  recommendedRemedy: string;
  prevention: string;
  coordinates?: Coordinate;
};

const geminiKey = process.env.GEMINI_API_KEY;
const openRouterKey = process.env.OPENROUTER_API_KEY;

function cleanJson(text: string) {
  let cleaned = text.trim();

  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "");
    cleaned = cleaned.replace(/\s*```$/i, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/i, "");
    cleaned = cleaned.replace(/\s*```$/i, "");
  }

  return cleaned.trim();
}

function normalizeConfidence(value: unknown): string {
  if (typeof value === "number") {
    return `${Math.max(0, Math.min(100, value))}%`;
  }

  if (typeof value === "string") {
    const number = Number.parseFloat(value);

    if (!Number.isNaN(number)) {
      return `${Math.max(0, Math.min(100, number))}%`;
    }

    return value;
  }

  return "Unclear";
}

function normalizeSeverity(value: unknown): string {
  const text = String(value || "").trim().toLowerCase();

  if (text.includes("high")) return "High";
  if (text.includes("moderate")) return "Moderate";
  if (text.includes("medium")) return "Moderate";
  if (text.includes("low")) return "Low";

  return "Unclear";
}

function normalizeCoordinates(value: unknown): Coordinate | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const c = value as Record<string, unknown>;

  const x = Number(c.x);
  const y = Number(c.y);
  const width = Number(c.width);
  const height = Number(c.height);

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    return undefined;
  }

  if (width <= 0 || height <= 0) {
    return undefined;
  }

  return {
    x: Math.max(0, Math.min(1000, x)),
    y: Math.max(0, Math.min(1000, y)),
    width: Math.max(1, Math.min(1000, width)),
    height: Math.max(1, Math.min(1000, height)),
  };
}

function normalizeDefects(value: unknown): Defect[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const defect = (item || {}) as Record<string, unknown>;

    return {
      defectType: String(
        defect.defectType || "Unclassified Indication"
      ),

      confidence: normalizeConfidence(defect.confidence),

      severity: normalizeSeverity(defect.severity),

      location: String(
        defect.location || "Location not confidently determined"
      ),

      evidence: String(
        defect.evidence || "No specific radiographic evidence reported."
      ),

      description: String(
        defect.description || "No additional description provided."
      ),

      possibleCause: String(
        defect.possibleCause || "Possible cause not determined."
      ),

      recommendedRemedy: String(
        defect.recommendedRemedy ||
          "Review the indication using qualified NDT procedures."
      ),

      prevention: String(
        defect.prevention ||
          "Follow the applicable welding procedure and inspection controls."
      ),

      coordinates: normalizeCoordinates(defect.coordinates),
    };
  });
}

function normalizeResult(
  raw: Record<string, unknown>,
  provider: string
) {
  return {
    overallAssessment: String(
      raw.overallAssessment ||
        "The radiograph was analyzed for visible weld indications."
    ),

    imageQuality: String(
      raw.imageQuality || "Unclear"
    ),

    inspectionSummary: String(
      raw.inspectionSummary ||
        "AI-assisted preliminary radiographic assessment completed."
    ),

    defects: normalizeDefects(raw.defects),

    provider,
  };
}

function buildPrompt(
  weldInfo: WeldInfo,
  ndtMethod: string
) {
  return `
You are WeldScan, an AI-assisted weld radiograph inspection system.

Analyze the uploaded radiographic image carefully.

IMPORTANT:
This is a PRELIMINARY AI inspection.
Do not claim certified inspection, code compliance, acceptance/rejection,
or final engineering approval.

NDT METHOD:
${ndtMethod || "RT"}

WELD INFORMATION:
Material: ${weldInfo.material || "Not provided"}
Welding Process: ${weldInfo.weldingProcess || "Not provided"}
Joint Type: ${weldInfo.jointType || "Not provided"}
Thickness: ${weldInfo.thickness || "Not provided"}

YOUR TASK:

1. Inspect the COMPLETE radiograph.
2. Determine image quality.
3. Identify visible weld indications or possible defects.
4. Do NOT invent defects.
5. Ignore obvious UI elements, labels, borders, text, scratches outside the weld,
   camera reflections, screen artifacts and other non-weld objects.
6. Consider indication shape, size, orientation, density, distribution and location.
7. Multiple defects may exist.
8. If no significant defect can be confidently identified, return an empty defects array.
9. If the image is unclear, explain that clearly.

DEFECT CATEGORIES MAY INCLUDE:

- Porosity
- Clustered porosity
- Linear porosity
- Wormhole
- Slag inclusion
- Linear slag inclusion
- Tungsten inclusion
- Oxide inclusion
- Lack of fusion
- Side-wall lack of fusion
- Inter-run lack of fusion
- Root lack of fusion
- Lack of penetration
- Incomplete root penetration
- Excessive penetration
- Burn-through
- Undercut
- Overlap
- Crack
- Longitudinal crack
- Transverse crack
- Centerline crack
- Crater crack
- HAZ crack
- Root crack
- Cold crack
- Hot crack
- Root concavity
- Excessive reinforcement
- Irregular weld profile
- Misalignment
- Distortion
- Arc strike
- Spatter
- Other indication
- Unclassified indication

====================================================
VERY IMPORTANT: DEFECT COORDINATES
====================================================

For EVERY defect that you can confidently locate in the actual radiograph,
provide approximate normalized coordinates.

The coordinate system is:

x = horizontal position of the TOP-LEFT of the defect
y = vertical position of the TOP-LEFT of the defect
width = width of defect region
height = height of defect region

ALL values MUST be between 0 and 1000.

Example:

{
  "coordinates": {
    "x": 420,
    "y": 380,
    "width": 80,
    "height": 120
  }
}

Meaning:

- x = 420 / 1000 = 42% from left
- y = 380 / 1000 = 38% from top

IMPORTANT:
Coordinates refer ONLY to the uploaded radiograph image.

Do NOT create coordinates around:
- text
- labels
- borders
- UI
- screen reflections
- camera reflections
- black background outside the radiograph
- scratches that are clearly not weld indications

If the exact location cannot be determined confidently,
DO NOT invent coordinates.
Simply omit the coordinates field.

The coordinates should tightly cover the visible indication,
not the entire weld.

====================================================
OUTPUT FORMAT
====================================================

Return ONLY valid JSON.

Do not use markdown.
Do not use code fences.
Do not write explanations outside JSON.

Use exactly this structure:

{
  "overallAssessment": "Short overall assessment",
  "imageQuality": "Good | Acceptable | Poor | Unclear",
  "inspectionSummary": "Short inspection summary",
  "defects": [
    {
      "defectType": "Slag Inclusion",
      "confidence": "87%",
      "severity": "High | Moderate | Low | Unclear",
      "location": "Near weld centerline, approximately middle-left region",
      "evidence": "Dark elongated indication inside the weld region",
      "description": "Description of the radiographic appearance",
      "possibleCause": "Possible welding cause",
      "recommendedRemedy": "Recommended inspection/repair action",
      "prevention": "Possible prevention method",
      "coordinates": {
        "x": 420,
        "y": 380,
        "width": 80,
        "height": 120
      }
    }
  ]
}

If there are no confidently identifiable defects:

{
  "overallAssessment": "No clear defect identified",
  "imageQuality": "Good",
  "inspectionSummary": "No significant radiographic indication could be confidently identified.",
  "defects": []
}

Remember:
Never invent coordinates.
Never invent defects.
`;
}

async function analyzeWithGemini(
  imageUrl: string,
  weldInfo: WeldInfo,
  ndtMethod: string
) {
  if (!geminiKey) {
    throw new Error("Gemini API key is not configured.");
  }

  console.log("WeldScan: Trying Gemini...");

  const gemini = new GoogleGenAI({
    apiKey: geminiKey,
  });

  const response = await gemini.models.generateContent({
    model: "gemini-3.6-flash",

    contents: [
      {
        role: "user",
        parts: [
          {
            text: buildPrompt(weldInfo, ndtMethod),
          },
          {
            inlineData: {
              mimeType:
                imageUrl.match(/^data:(image\/[^;]+);/)?.[1] ||
                "image/jpeg",
              data: imageUrl.replace(/^data:image\/[^;]+;base64,/, ""),
            },
          },
        ],
      },
    ],

    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  });

  const text = response.text || "";

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  const parsed = JSON.parse(cleanJson(text));

  return normalizeResult(parsed, "Gemini");
}

async function analyzeWithOpenRouter(
  imageUrl: string,
  weldInfo: WeldInfo,
  ndtMethod: string
) {
  if (!openRouterKey) {
    throw new Error("OpenRouter API key is not configured.");
  }

  console.log("WeldScan: Trying OpenRouter...");

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://weld-scan.vercel.app",
        "X-Title": "WeldScan",
      },

      body: JSON.stringify({
        model: "openrouter/free",

        messages: [
          {
            role: "user",

            content: [
              {
                type: "text",
                text: buildPrompt(weldInfo, ndtMethod),
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

        temperature: 0.1,

        response_format: {
          type: "json_object",
        },
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("OpenRouter error:", data);

    throw new Error(
      data?.error?.message ||
        `OpenRouter failed with status ${response.status}`
    );
  }

  const text =
    data?.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("OpenRouter returned an empty response.");
  }

  const parsed = JSON.parse(cleanJson(text));

  return normalizeResult(parsed, "OpenRouter");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const imageUrl = body?.imageUrl;
    const weldInfo: WeldInfo = body?.weldInfo || {};
    const ndtMethod = body?.ndtMethod || "RT";

    if (!imageUrl) {
      return NextResponse.json(
        {
          error: "Radiograph image is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (typeof imageUrl !== "string") {
      return NextResponse.json(
        {
          error: "Invalid image data.",
        },
        {
          status: 400,
        }
      );
    }

    let result;

    try {
      result = await analyzeWithGemini(
        imageUrl,
        weldInfo,
        ndtMethod
      );
    } catch (geminiError) {
      console.error(
        "Gemini failed. Switching to OpenRouter:",
        geminiError
      );

      try {
        result = await analyzeWithOpenRouter(
          imageUrl,
          weldInfo,
          ndtMethod
        );
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
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("WeldScan analysis error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      },
      {
        status: 500,
      }
    );
  }
}