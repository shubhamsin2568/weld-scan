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

export default function Home() {
  const [imageUrl, setImageUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [retrySeconds, setRetrySeconds] = useState(0);

  /*
   * ---------------------------------------------------------
   * RETRY COUNTDOWN
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (retrySeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setRetrySeconds((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return seconds - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [retrySeconds]);

  /*
   * ---------------------------------------------------------
   * IMAGE UPLOAD
   * ---------------------------------------------------------
   */

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid weld radiograph image.");
      setRetrySeconds(0);
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
      setError(
        "Unable to read this image. Please select another radiograph."
      );
      setRetrySeconds(0);
    };

    reader.readAsDataURL(file);
  }

  /*
   * ---------------------------------------------------------
   * ANALYZE RADIOGRAPH
   * ---------------------------------------------------------
   */

  async function analyzeRadiograph() {
    if (!imageUrl) {
      setError("Please upload a weld radiograph first.");
      setRetrySeconds(0);
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

      /*
       * -------------------------------------------------------
       * SERVER / AI ERRORS
       * -------------------------------------------------------
       *
       * Do NOT show raw API/Gemini JSON to the user.
       */

      if (!response.ok) {
        if (response.status === 503) {
          setError(
            "The AI server is currently busy. Please wait a moment before trying again."
          );
        } else if (response.status === 429) {
          setError(
            "The AI service is temporarily unavailable. Please wait a moment before trying again."
          );
        } else if (response.status >= 500) {
          setError(
            "The AI server is temporarily unavailable. Please wait a moment before trying again."
          );
        } else {
          setError(
            "Unable to complete the analysis right now. Please try again after a moment."
          );
        }

        /*
         * One-minute retry countdown
         */
        setRetrySeconds(60);

        return;
      }

      setResult(data);
    } catch {
      /*
       * Network / connection error
       */
      setError(
        "Unable to connect to the AI server right now. Please wait a moment before trying again."
      );

      setRetrySeconds(60);
    } finally {
      setAnalyzing(false);
    }
  }

  /*
   * ---------------------------------------------------------
   * REMOVE IMAGE
   * ---------------------------------------------------------
   */

  function removeImage() {
    setImageUrl("");
    setFileName("");
    setResult(null);
    setError("");
    setRetrySeconds(0);
  }

  /*
   * ---------------------------------------------------------
   * GET DEFECTS
   * ---------------------------------------------------------
   */

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

  /*
   * ---------------------------------------------------------
   * TIMER DISPLAY
   * ---------------------------------------------------------
   */

  const minutes = Math.floor(retrySeconds / 60);
  const seconds = retrySeconds % 60;

  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}`;

  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */

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
          {/* =====================================================
              LEFT SECTION
          ====================================================== */}

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

              {/* UPLOAD BOX */}
              {!imageUrl ? (
                <label className="mt-6 flex min-h-[330px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/60 px-6 text-center transition hover:border-cyan-500">
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/10 text-3xl">
                    📷
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
                  {/* IMAGE PREVIEW */}
                  <div className="overflow-hidden rounded-2xl border border-slate-700 bg-black">
                    <img
                      src={imageUrl}
                      alt="Uploaded weld radiograph"
                      className="max-h-[520px] w-full object-contain"
                    />
                  </div>

                  {/* FILE INFORMATION */}
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
                      className="shrink-0 rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
                    >
                      Remove
                    </button>
                  </div>

                  {/* ANALYZE BUTTON */}
                  <button
                    onClick={analyzeRadiograph}
                    disabled={analyzing || retrySeconds > 0}
                    className="mt-5 w-full rounded-xl bg-cyan-400 px-6 py-4 text-base font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {analyzing
                      ? "Analyzing Radiograph..."
                      : retrySeconds > 0
                        ? `Retry Available in ${formattedTime}`
                        : "Analyze Radiograph"}
                  </button>
                </div>
              )}

              {/* =================================================
                  SERVER ERROR CARD
              ================================================== */}

              {error && (
                <div className="mt-5 overflow-hidden rounded-2xl border border-yellow-500/30 bg-yellow-500/5">
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      {/* WARNING ICON */}
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-yellow-500/10 text-2xl">
                        ⚠️
                      </div>

                      {/* ERROR TITLE */}
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-yellow-300">
                          AI Server Temporarily Unavailable
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {error}
                        </p>
                      </div>
                    </div>

                    {/* COUNTDOWN */}
                    {retrySeconds > 0 && (
                      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-5 text-center">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                          Retry Available In
                        </p>

                        <p className="mt-2 text-4xl font-bold tabular-nums text-cyan-400">
                          {formattedTime}
                        </p>

                        <p className="mt-2 text-xs text-slate-600">
                          Please wait until the countdown finishes.
                        </p>
                      </div>
                    )}

                    {/* TRY AGAIN BUTTON */}
                    {retrySeconds === 0 && (
                      <button
                        onClick={analyzeRadiograph}
                        disabled={analyzing}
                        className="mt-5 w-full rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Try Again
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* =====================================================
              RIGHT SECTION
          ====================================================== */}

          <section>
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <p className="text-sm font-bold uppercase tracking-wider text-cyan-400">
                Step 02
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                AI Inspection Results
              </h2>

              {/* EMPTY STATE */}
              {!result && !analyzing && (
                <div className="mt-6 flex min-h-[330px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/50 p-8 text-center">
                  <div>
                    <div className="mb-4 text-5xl">🔬</div>

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

              {/* LOADING STATE */}
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

              {/* =================================================
                  RESULTS
              ================================================== */}

              {result && !analyzing && (
                <div className="mt-6">
                  {/* OVERALL RESULT */}
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

                  {/* DETECTED COUNT */}
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

                  {/* NO CLEAR DEFECT */}
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

                  {/* DEFECT DETAILS */}
                  {defects.map((defect, index) => (
                    <div
                      key={`${defect.type || "defect"}-${index}`}
                      className="mt-5 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950"
                    >
                      {/* DEFECT HEADER */}
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

                      {/* DEFECT INFORMATION */}
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

                  {/* INSPECTION NOTICE */}
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

/*
 * =============================================================
 * RESULT FIELD
 * =============================================================
 */

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