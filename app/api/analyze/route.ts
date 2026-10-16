import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const geminiKey = process.env.GEMINI_API_KEY;
const openRouterKey = process.env.OPENROUTER_API_KEY;

const gemini = geminiKey
  ? new GoogleGenAI({ apiKey: geminiKey })
  : null;

/*
 * This is a guidance taxonomy, NOT a closed list.
 * The model may report "Other Indication" when an indication
 * does not confidently fit one of these categories.
 */
const WELD_TAXONOMY = `
POROSITY / GAS-RELATED:
- Gas porosity
- Uniform porosity
- Scattered porosity
- Cluster porosity
- Linear porosity
- Elongated porosity
- Wormhole / elongated cavity
- Piping / wormhole indication
- Surface-connected porosity

INCLUSIONS:
- Slag inclusion
- Linear slag inclusion
- Clustered slag inclusion
- Isolated slag inclusion
- Tungsten inclusion
- Oxide inclusion
- Metallic inclusion
- Flux inclusion
- Foreign-material inclusion

FUSION / BONDING:
- Lack of fusion
- Side-wall lack of fusion
- Inter-run lack of fusion
- Root lack of fusion
- Incomplete fusion
- Cold lap / cold shut indication
- Incomplete bonding

PENETRATION / ROOT:
- Lack of penetration
- Incomplete penetration
- Incomplete root penetration
- Incomplete joint penetration
- Excessive penetration
- Burn-through
- Root burn-through
- Root concavity

CRACKS:
- Longitudinal crack
- Transverse crack
- Centerline crack
- Longitudinal centerline crack
- Transverse crack
- Crater crack
- Toe crack
- Root crack
- HAZ crack
- Weld-metal crack
- Hot crack
- Solidification crack
- Hydrogen / cold crack
- Delayed crack
- Branching crack
- Star crack
- Microcrack indication

CAVITIES / LOCALIZED METAL LOSS:
- Cavity
- Elongated cavity
- Crater
- Crater cavity
- Localized metal loss
- Excessive root erosion

WELD PROFILE / GEOMETRY:
- Undercut
- Internal undercut
- External undercut
- Overlap
- Excessive convexity
- Excessive concavity
- Excessive reinforcement
- Insufficient reinforcement
- Excessive root reinforcement
- Insufficient root reinforcement
- Irregular weld profile
- Uneven bead profile
- Misalignment
- Hi-low / mismatch
- Excessive root gap indication
- Incomplete weld profile

ARC / PROCESS-RELATED:
- Arc strike
- Spatter indication
- Tungsten arc contamination
- Electrode inclusion
- Wire inclusion
- Start-stop indication
- Crater-related indication
- Welding interruption indication

DISTORTION / DIMENSIONAL:
- Weld distortion indication
- Misalignment
- Angular distortion
- Excessive weld width
- Irregular weld width
- Localized profile variation

OTHER RADIOGRAPHIC INDICATIONS:
- Linear indication
- Rounded indication
- Diffuse indication
- Localized density variation
- Multiple indications
- Combined indications
- Clustered indications
- Unclassified indication
- Other indication

IMAGE / INSPECTION ARTIFACTS:
- Film artifact
- Digital image artifact
- Scratch
- Processing artifact
- Geometric artifact
- Foreign object / marker
- Image noise
- Exposure-related artifact
- Image unclear

FINAL STATES:
- No clear defect
- No significant indication
- Image unclear
`;

const PROMPT = `
You are WeldScan, an AI-assisted weld radiograph inspection system.

Analyze the COMPLETE radiographic image carefully.

Your purpose is preliminary inspection support. You are NOT a certified
NDT inspector and must not claim certification, code compliance, or
absolute certainty from an image alone.

==================================================
CORE INSTRUCTION
==================================================

Identify ALL reasonably visible weld discontinuities/indications.

A single radiograph can contain:
- zero defects
- one defect
- multiple different defects
- multiple instances of the same defect

Do NOT stop after finding the first indication.

Inspect:
1. Weld metal
2. Fusion boundaries
3. Root region
4. Heat affected region when visible
5. Surrounding material
6. Density variations
7. Shape, size, orientation and distribution of indications

==================================================
IMPORTANT: OPEN CLASSIFICATION
==================================================

The taxonomy below is a GUIDANCE LIST, NOT A CLOSED LIST.

You MAY classify an indication that is not explicitly listed.

If the appearance supports a specific defect, report the most appropriate
specific name.

If the indication cannot be confidently classified:
use "Other Indication", "Linear Indication", "Rounded Indication",
"Unclassified Indication", or another descriptive classification.

NEVER force an indication into an incorrect category merely because
the category exists in the list.

==================================================
WELD RADIOGRAPHY TAXONOMY
==================================================

${WELD_TAXONOMY}

==================================================
RADIOGRAPHIC REASONING
==================================================

Consider:

- shape
- size
- distribution
- density
- orientation
- sharpness
- continuity
- location relative to weld centerline
- location relative to root and fusion boundaries
- clustering
- linearity
- rounded appearance
- elongated appearance
- branching appearance

Do NOT treat every dark/light variation as a defect.

Ignore:
- image borders
- labels
- arrows
- identification markers
- obvious text
- film/digital artifacts
- scratches
- exposure artifacts

unless they affect the interpretation.

==================================================
NO HALLUCINATION RULE
==================================================

DO NOT invent a defect.

If the image does not provide enough evidence:

"Image Unclear"

If the weld appears free from a clearly identifiable discontinuity:

"No Clear Defect"

If there is an unusual indication but it cannot be classified:

"Other Indication"

==================================================
CONFIDENCE
==================================================

Give an individual confidence for every indication.

Confidence must reflect visual evidence.

Use values such as:
55%, 63%, 72%, 81%, 89%, 94%

Do NOT use fake precision such as 99.97%.

==================================================
SEVERITY
==================================================

Use only:

Low
Moderate
High
Unclear

Severity is an AI-assisted preliminary assessment only.

Do not state that an indication is rejectable/acceptable unless the
required code, specification, weld thickness, material and acceptance
criteria are actually available.

==================================================
LOCATION
==================================================

Give the best visual location available, for example:

- Weld center
- Root region
- Fusion boundary
- Left side of weld
- Right side of weld
- Upper weld region
- Lower weld region
- HAZ
- Approximate position along weld

Do NOT invent exact measurements.

==================================================
CAUSE / REMEDY / PREVENTION
==================================================

Give technically reasonable possibilities.

If the cause cannot be determined from radiography alone, say:

"Cause cannot be determined from the radiograph alone."

Do not pretend that the radiograph proves a manufacturing cause.

==================================================
MULTIPLE DEFECTS
==================================================

Return EVERY reasonably supported indication.

For example:

Porosity
+
Slag Inclusion
+
Lack of Fusion

must be returned as three separate objects if all are supported.

==================================================
OUTPUT
==================================================

Return ONLY valid JSON.

Use exactly:

{
  "overallAssessment": "string",
  "imageQuality": "Good | Acceptable | Poor | Unclear",
  "inspectionSummary": "string",
  "defects": [
    {
      "defectType": "string",
      "confidence": "number%",
      "severity": "Low | Moderate | High | Unclear",
      "location": "string",
      "evidence": "string",
      "description": "string",
      "possibleCause": "string",
      "recommendedRemedy": "string",
      "prevention": "string"
    }
  ]
}

If no reliable defect is detected:

{
  "overallAssessment": "No Clear Defect",
  "imageQuality": "Good",
  "inspectionSummary": "No significant radiographic indication was confidently identified.",
  "defects": []
}

If the image cannot be meaningfully evaluated:

{
  "overallAssessment": "Image Unclear",
  "imageQuality": "Unclear",
  "inspectionSummary": "The image quality is insufficient for reliable preliminary interpretation.",
  "defects": []
}
`;

function cleanJson(text: string) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalizeResult(data: any) {
  const defects = Array.isArray(data?.defects)
    ? data.defects
    : [];

  return {
    overallAssessment:
      typeof data?.overallAssessment === "string"
        ? data.overallAssessment
        : "Analysis completed",

    imageQuality:
      typeof data?.imageQuality === "string"
        ? data.imageQuality
        : "Unclear",

    inspectionSummary:
      typeof data?.inspectionSummary === "string"
        ? data.inspectionSummary
        : "No inspection summary available.",

    defects: defects.map((d: any) => ({
      defectType:
        typeof d?.defectType === "string"
          ? d.defectType
          : "Other Indication",

      confidence:
        typeof d?.confidence === "string"
          ? d.confidence
          : "N/A",

      severity:
        typeof d?.severity === "string"
          ? d.severity
          : "Unclear",

      location:
        typeof d?.location === "string"
          ? d.location
          : "Not determined",

      evidence:
        typeof d?.evidence === "string"
          ? d.evidence
          : "Not determined from the available image.",

      description:
        typeof d?.description === "string"
          ? d.description
          : "No description available.",

      possibleCause:
        typeof d?.possibleCause === "string"
          ? d.possibleCause
          : "Cause cannot be determined from the radiograph alone.",

      recommendedRemedy:
        typeof d?.recommendedRemedy === "string"
          ? d.recommendedRemedy
          : "Review using the applicable NDT procedure and acceptance criteria.",

      prevention:
        typeof d?.prevention === "string"
          ? d.prevention
          : "Follow the applicable qualified welding procedure and inspection controls.",
    })),
  };
}

function parseAIResponse(text: string) {
  const cleaned = cleanJson(text);

  try {
    return normalizeResult(JSON.parse(cleaned));
  } catch {
    return {
      overallAssessment: "AI Response Could Not Be Parsed",
      imageQuality: "Unclear",
      inspectionSummary: cleaned || "No usable response returned.",
      defects: [],
    };
  }
}

async function analyzeWithGemini(
  mimeType: string,
  base64Data: string
) {
  if (!gemini) {
    throw new Error("Gemini API key is not configured.");
  }

  console.log("WeldScan: Trying Gemini...");

  const response = await gemini.models.generateContent({
    model: "gemini-3.6-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: PROMPT,
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

  const text = response.text?.trim() || "";

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return parseAIResponse(text);
}

async function analyzeWithOpenRouter(imageUrl: string) {
  if (!openRouterKey) {
    throw new Error(
      "OpenRouter API key is not configured."
    );
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
                text: PROMPT,
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
        `OpenRouter failed with status ${response.status}`
    );
  }

  const text =
    data?.choices?.[0]?.message?.content?.trim() || "";

  if (!text) {
    throw new Error(
      "OpenRouter returned an empty response."
    );
  }

  return parseAIResponse(text);
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

    /*
     * PRIMARY:
     * Gemini
     */
    try {
      const result = await analyzeWithGemini(
        mimeType,
        base64Data
      );

      return NextResponse.json({
        ...result,
        provider: "Gemini",
      });
    } catch (error) {
      console.error(
        "Gemini failed. Switching to OpenRouter:",
        error
      );
    }

    /*
     * FALLBACK:
     * OpenRouter
     */
    try {
      const result = await analyzeWithOpenRouter(
        imageUrl
      );

      return NextResponse.json({
        ...result,
        provider: "OpenRouter",
      });
    } catch (error) {
      console.error(
        "OpenRouter also failed:",
        error
      );
    }

    return NextResponse.json(
      {
        error:
          "Both AI servers are temporarily unavailable. Please try again shortly.",
      },
      {
        status: 503,
      }
    );
  } catch (error) {
    console.error(
      "WeldScan API error:",
      error
    );

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