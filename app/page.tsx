"use client";

import { ChangeEvent, useEffect, useState } from "react";

type Defect = {
  type?: string;
  possibleCause?: string;
  severity?: string;
  location?: string;
  confidence?: string | number;
  evidence?: string;
  description?: string;
  recommendedRemedy?: string;
  prevention?: string;
};

type AnalysisResult = {
  overallResult?: string;
  defectType?: string;
  possibleCause?: string;
  severity?: string;
  location?: string;
  confidence?: string | number;
  evidence?: string;
  description?: string;
  recommendedRemedy?: string;
  prevention?: string;
  defects?: Defect[];
};

const POSSIBLE_DEFECT_TYPES = [
  {
    category: "Gas / Cavity Discontinuities",
    types: [
      "Scattered Porosity",
      "Clustered Porosity",
      "Linear Porosity",
      "Aligned Porosity",
      "Elongated Porosity",
      "Wormhole Porosity",
      "Surface-Connected Porosity",
      "Blowhole",
      "Gas Cavity",
      "Pipe",
      "Wormhole",
    ],
  },
  {
    category: "Solid Inclusions",
    types: [
      "Slag Inclusion",
      "Linear Slag Inclusion",
      "Clustered Slag Inclusion",
      "Tungsten Inclusion",
      "Oxide Inclusion",
      "Flux Inclusion",
      "Metallic Inclusion",
    ],
  },
  {
    category: "Cracks",
    types: [
      "Longitudinal Crack",
      "Transverse Crack",
      "Crater Crack",
      "Hot Crack",
      "Cold Crack",
    ],
  },
  {
    category: "Fusion / Penetration",
    types: [
      "Lack of Fusion",
      "Incomplete Fusion",
      "Incomplete Penetration",
      "Lack of Penetration",
    ],
  },
  {
    category: "Geometry / Other",
    types: [
      "Undercut",
      "Overlap",
      "Burn Through",
      "Excess Reinforcement",
      "Concavity",
      "Misalignment",
    ],
  },
];

export default function Home() {
  const [imageUrl, setImageUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [retrySeconds, setRetrySeconds] = useState(0);

  useEffect(() => {
    if (retrySeconds <= 0) return;

    const timer = setInterval(() => {
      setRetrySeconds((seconds) => {
        if (seconds <= 1) {
          clearInterval(timer);
          return 0;
        }

        return seconds - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [retrySeconds]);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setImageUrl(String(reader.result));
      setFileName(file.name);
      setResult(null);
      setError("");
      setRetrySeconds(0);
    };

    reader.onerror = () => {
      setError("Unable to read this image. Please try another image.");
    };

    reader.readAsDataURL(file);
  }

  async function analyzeRadiograph() {
    if (!imageUrl) {
      setError("Please upload a weld radiograph first.");
      return;
    }

    if (retrySeconds > 0) {
      return;
    }

    setAnalyzing(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          typeof data?.error === "string"
            ? data.error
            : "Analysis service is temporarily unavailable.";

        if (response.status === 429) {
          setError(
            "AI service limit reached. Please wait a moment before trying again."
          );
          setRetrySeconds(20);
        } else if (response.status === 503) {
          setError(
            "AI service is temporarily busy. Please wait a moment and try again."
          );
          setRetrySeconds(15);
        } else {
          setError(message);
        }

        return;
      }

      setResult(data);
    } catch {
      setError(
        "Unable to connect to the AI service. Please check your connection and try again."
      );
      setRetrySeconds(10);
    } finally {
      setAnalyzing(false);
    }
  }

  function removeImage() {
    setImageUrl("");
    setFileName("");
    setResult(null);
    setError("");
    setRetrySeconds(0);
  }

  function getDefects(): Defect[] {
    if (result?.defects && Array.isArray(result.defects)) {
      return result.defects;
    }

    if (result?.defectType) {
      return [
        {
          type: result.defectType,
          possibleCause: result.possibleCause,
          severity: result.severity,
          location: result.location,
          confidence: result.confidence,
          evidence: result.evidence,
          description: result.description,
          recommendedRemedy: result.recommendedRemedy,
          prevention: result.prevention,
        },
      ];
    }

    return [];
  }

  const defects = getDefects();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-7xl px-6 py-7">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-400">
            WeldScan
          </p>

          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            AI Weld Radiograph Inspection
          </h1>

          <p className="mt-3 max-w-3xl text-slate-400">
            Upload a weld radiograph and use AI-assisted analysis to identify
            possible radiographic indications and weld discontinuities.
          </p>
        </div>
      </header>

      {/* MAIN */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* LEFT */}
          <section>
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <p className="text-sm font-bold uppercase tracking-wider text-cyan-400">
                Step 01
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Upload Radiograph
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Select a weld radiographic image for preliminary AI analysis.
              </p>

              {!imageUrl ? (
                <label className="mt-6 flex min-h-[330px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/60 px-6 text-center transition hover:border-cyan-500">
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/10 text-3xl">
                    IMG
                  </div>

                  <h3 className="text-lg font-semibold">
                    Upload weld radiograph
                  </h3>

                  <p className="mt-2 max-w-md text-sm text-slate-500">
                    JPG, JPEG, PNG, WEBP or another supported image format.
                  </p>

                  <span className="mt-6 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950">
                    Choose Image
                  </span>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="mt-6">
                  {/* IMAGE */}
                  <div className="overflow-hidden rounded-2xl border border-slate-700 bg-black">
                    <img
                      src={imageUrl}
                      alt="Uploaded weld radiograph"
                      className="max-h-[520px] w-full object-contain"
                    />
                  </div>

                  {/* FILE */}
                  <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Selected Image
                      </p>

                      <p className="mt-1 truncate text-sm font-semibold">
                        {fileName}
                      </p>
                    </div>

                    <button
                      onClick={removeImage}
                      className="shrink-0 rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/10"
                    >
                      Remove
                    </button>
                  </div>

                  {/* ANALYZE */}
                  <button
                    onClick={analyzeRadiograph}
                    disabled={analyzing || retrySeconds > 0}
                    className="mt-5 w-full rounded-xl bg-cyan-400 px-6 py-4 text-base font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {analyzing
                      ? "Analyzing Radiograph..."
                      : retrySeconds > 0
                        ? `Try Again in ${retrySeconds}s`
                        : "Analyze Radiograph"}
                  </button>
                </div>
              )}

              {/* FRIENDLY ERROR */}
              {error && (
                <div className="mt-5 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5">
                  <div className="flex gap-3">
                    <div className="text-xl">âš ï¸</div>

                    <div>
                      <h3 className="font-bold text-yellow-300">
                        AI Analysis Temporarily Unavailable
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {error}
                      </p>

                      {retrySeconds === 0 && (
                        <button
                          onClick={analyzeRadiograph}
                          disabled={analyzing}
                          className="mt-4 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
                        >
                          Try Again
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            </section>

            {/* RIGHT */}
          <section>
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <p className="text-sm font-bold uppercase tracking-wider text-cyan-400">
                Step 02
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                AI Inspection Results
              </h2>

              {/* EMPTY */}
              {!result && !analyzing && (
                <div className="mt-6 flex min-h-[330px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/50 p-8 text-center">
                  <div>
                    <div className="mb-4 text-5xl">RESULT</div>

                    <h3 className="text-lg font-semibold">
                      No analysis yet
                    </h3>

                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                      Upload a radiograph and click Analyze Radiograph to see
                      the inspection result here.
                    </p>
                  </div>
                </div>
              )}

              {/* LOADING */}
              {analyzing && (
                <div className="mt-6 flex min-h-[330px] items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-8 text-center">
                  <div>
                    <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />

                    <h3 className="text-lg font-semibold">
                      Analyzing radiograph
                    </h3>

                    <p className="mt-2 text-sm text-slate-500">
                      Examining visible radiographic indications...
                    </p>

                    <p className="mt-4 text-xs text-slate-600">
                      This may take a few seconds.
                    </p>
                  </div>
                </div>
              )}

              {/* RESULT */}
              {result && !analyzing && (
                <div className="mt-6">
                  {/* OVERALL */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Overall Result
                    </p>

                    <p className="mt-2 text-xl font-bold">
                      {result.overallResult ||
                        (defects.length > 0
                          ? "Defect Detected"
                          : "No Clear Defect")}
                    </p>
                  </div>

                  {/* COUNT */}
                  <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Detected Indications
                    </p>

                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-3xl font-bold text-cyan-400">
                        {defects.length}
                      </p>

                      <span className="text-4xl">SCAN</span>
                    </div>
                  </div>

                  {/* NO DEFECT */}
                  {defects.length === 0 && (
                    <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                      <h3 className="font-bold text-emerald-300">
                        No Clear Defect
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        No weld discontinuity was confidently identified from
                        the available image evidence.
                      </p>
                    </div>
                  )}

                  {/* DEFECTS */}
                  {defects.map((defect, index) => (
                    <div
                      key={`${defect.type || "defect"}-${index}`}
                      className="mt-5 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950"
                    >
                      <div className="border-b border-slate-800 bg-slate-900 p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              Defect {index + 1}
                            </p>

                            <h3 className="mt-1 text-xl font-bold">
                              {defect.type || "Unknown Indication"}
                            </h3>
                          </div>

                          {defect.severity && (
                            <span
                              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                                defect.severity === "High"
                                  ? "bg-red-500/20 text-red-300"
                                  : defect.severity === "Moderate"
                                    ? "bg-yellow-500/20 text-yellow-300"
                                    : defect.severity === "Low"
                                      ? "bg-emerald-500/20 text-emerald-300"
                                      : "bg-slate-700 text-slate-300"
                              }`}
                            >
                              {defect.severity}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-5 p-5">
                        {defect.confidence !== undefined && (
                          <ResultField
                            title="Confidence"
                            value={`${defect.confidence}${
                              typeof defect.confidence === "number"
                                ? "%"
                                : ""
                            }`}
                          />
                        )}

                        {defect.location && (
                          <ResultField
                            title="Location"
                            value={defect.location}
                          />
                        )}

                        {defect.evidence && (
                          <ResultField
                            title="Radiographic Evidence"
                            value={defect.evidence}
                          />
                        )}

                        {defect.description && (
                          <ResultField
                            title="Description"
                            value={defect.description}
                          />
                        )}

                        {defect.possibleCause && (
                          <ResultField
                            title="Possible Cause"
                            value={defect.possibleCause}
                          />
                        )}

                        {defect.recommendedRemedy && (
                          <ResultField
                            title="Recommended Remedy"
                            value={defect.recommendedRemedy}
                          />
                        )}

                        {defect.prevention && (
                          <ResultField
                            title="Prevention"
                            value={defect.prevention}
                          />
                        )}
                      </div>
                    </div>
                  ))}

                  {/* NOTICE */}
                  <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-yellow-400">
                      Inspection Notice
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      This AI result is preliminary inspection support only. It
                      does not replace evaluation by a qualified NDT inspector,
                      radiographer, welding engineer, or applicable
                      welding/NDT code and acceptance criteria.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-slate-800">
        <div className="mx-auto max-w-7xl px-6 py-8 text-center text-sm text-slate-600">
          WeldScan - AI-assisted weld radiograph inspection
        </div>
      </footer>
    </main>
  );
}

function ResultField({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-sm leading-6 text-slate-300">{value}</p>
    </div>
  );
}


