"use client";

import { ChangeEvent, useEffect, useState } from "react";

type Defect = {
  defectType?: string;
  confidence?: string | number;
  severity?: string;
  location?: string;
  evidence?: string;
  description?: string;
  possibleCause?: string;
  recommendedRemedy?: string;
  prevention?: string;
};

type AnalysisResult = {
  overallAssessment?: string;
  imageQuality?: string;
  inspectionSummary?: string;
  provider?: string;
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

    return () => window.clearInterval(timer);
  }, [retrySeconds]);

  /*
   * ---------------------------------------------------------
   * IMAGE UPLOAD
   * ---------------------------------------------------------
   */

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError(
        "Please select a valid weld radiograph image."
      );
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
      setError(
        "Please upload a weld radiograph first."
      );
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

      const data = await response.json().catch(
        () => ({})
      );

      if (!response.ok) {
        if (response.status === 503) {
          setError(
            "Both AI servers are temporarily unavailable. Please wait a moment and try again."
          );
        } else if (response.status === 429) {
          setError(
            "The AI service is temporarily busy. Please wait a moment and try again."
          );
        } else if (response.status >= 500) {
          setError(
            "The AI server is temporarily unavailable. Please wait a moment and try again."
          );
        } else {
          setError(
            "Unable to complete the analysis right now. Please try again."
          );
        }

        setRetrySeconds(60);
        return;
      }

      setResult(data);
    } catch {
      setError(
        "Unable to connect to the AI server right now. Please wait a moment and try again."
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

  const defects = Array.isArray(result?.defects)
    ? result.defects
    : [];

  /*
   * ---------------------------------------------------------
   * TIMER
   * ---------------------------------------------------------
   */

  const minutes = Math.floor(
    retrySeconds / 60
  );

  const seconds = retrySeconds % 60;

  const formattedTime = `${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(2, "0")}`;

  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-7xl px-6 py-7">

          <p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-400">
            WeldScan
          </p>

          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            AI Weld Radiograph Inspection
          </h1>

          <p className="mt-3 max-w-3xl text-slate-400">
            Upload a weld radiograph and use AI-assisted
            analysis to identify possible radiographic
            indications and weld discontinuities.
          </p>

        </div>
      </header>

      {/* =====================================================
          MAIN
      ====================================================== */}

      <div className="mx-auto max-w-7xl px-6 py-8">

        <div className="grid gap-8 lg:grid-cols-2">

          {/* =================================================
              LEFT
          ================================================== */}

          <section>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">

              <p className="text-sm font-bold uppercase tracking-wider text-cyan-400">
                Step 01
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Upload Radiograph
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Select a weld radiographic image for
                preliminary AI analysis.
              </p>

              {/* UPLOAD */}

              {!imageUrl ? (

                <label className="mt-6 flex min-h-[330px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/60 px-6 text-center transition hover:border-cyan-500">

                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/10 text-3xl">
                    📷
                  </div>

                  <h3 className="text-lg font-semibold">
                    Upload weld radiograph
                  </h3>

                  <p className="mt-2 max-w-md text-sm text-slate-500">
                    JPG, JPEG, PNG, WEBP or another
                    supported image format.
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
                      className="shrink-0 rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
                    >
                      Remove
                    </button>

                  </div>

                  {/* ANALYZE */}

                  <button
                    onClick={analyzeRadiograph}
                    disabled={
                      analyzing ||
                      retrySeconds > 0
                    }
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

              {/* ERROR */}

              {error && (

                <div className="mt-5 overflow-hidden rounded-2xl border border-yellow-500/30 bg-yellow-500/5">

                  <div className="p-6">

                    <div className="flex items-start gap-4">

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-yellow-500/10 text-2xl">
                        ⚠️
                      </div>

                      <div className="min-w-0">

                        <h3 className="text-lg font-bold text-yellow-300">
                          AI Server Temporarily Unavailable
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {error}
                        </p>

                      </div>

                    </div>

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

          {/* =================================================
              RIGHT
          ================================================== */}

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

                    <div className="mb-4 text-5xl">
                      🔬
                    </div>

                    <h3 className="text-lg font-semibold">
                      No analysis yet
                    </h3>

                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                      Upload a radiograph and click
                      Analyze Radiograph to see the
                      inspection result here.
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
                      Examining visible radiographic
                      indications...
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

                  {/* OVERALL */}

                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">

                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Overall Assessment
                        </p>

                        <p className="mt-2 text-xl font-bold">
                          {result.overallAssessment ||
                            "Analysis Completed"}
                        </p>

                      </div>

                      {result.provider && (

                        <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-300">
                          {result.provider}
                        </span>

                      )}

                    </div>

                    {result.inspectionSummary && (

                      <p className="mt-4 text-sm leading-6 text-slate-400">
                        {result.inspectionSummary}
                      </p>

                    )}

                  </div>

                  {/* IMAGE QUALITY */}

                  {result.imageQuality && (

                    <div className="mt-4 grid grid-cols-2 gap-4">

                      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">

                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Image Quality
                        </p>

                        <p className="mt-2 font-bold text-cyan-300">
                          {result.imageQuality}
                        </p>

                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">

                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Indications
                        </p>

                        <p className="mt-1 text-3xl font-bold text-cyan-400">
                          {defects.length}
                        </p>

                      </div>

                    </div>

                  )}

                  {/* NO DEFECT */}

                  {defects.length === 0 && (

                    <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">

                      <div className="flex items-start gap-4">

                        <div className="text-3xl">
                          ✓
                        </div>

                        <div>

                          <h3 className="font-bold text-emerald-300">
                            {result.overallAssessment ===
                            "Image Unclear"
                              ? "Image Unclear"
                              : "No Clear Defect"}
                          </h3>

                          <p className="mt-2 text-sm leading-6 text-slate-400">
                            {result.inspectionSummary ||
                              "No significant radiographic indication was confidently identified."}
                          </p>

                        </div>

                      </div>

                    </div>

                  )}

                  {/* MULTIPLE DEFECTS */}

                  {defects.length > 0 && (

                    <div className="mt-6">

                      <div className="mb-4 flex items-end justify-between">

                        <div>

                          <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                            Detected Indications
                          </p>

                          <h3 className="mt-1 text-xl font-bold">
                            {defects.length} indication
                            {defects.length === 1
                              ? ""
                              : "s"}
                            detected
                          </h3>

                        </div>

                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-400">
                          AI-assisted
                        </span>

                      </div>

                      {/* DEFECT CARDS */}

                      <div className="space-y-5">

                        {defects.map(
                          (defect, index) => (

                            <DefectCard
                              key={`${defect.defectType || "indication"}-${index}`}
                              defect={defect}
                              index={index}
                            />

                          )
                        )}

                      </div>

                    </div>

                  )}

                  {/* INSPECTION NOTICE */}

                  <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5">

                    <p className="text-xs font-bold uppercase tracking-wider text-yellow-400">
                      Inspection Notice
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      This AI result is preliminary inspection
                      support only. It does not replace evaluation
                      by a qualified NDT inspector, radiographer,
                      welding engineer, or applicable welding/NDT
                      code and acceptance criteria.
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
 * DEFECT CARD
 * =============================================================
 */

function DefectCard({
  defect,
  index,
}: {
  defect: Defect;
  index: number;
}) {
  const severity =
    defect.severity || "Unclear";

  const severityClass =
    severity === "High"
      ? "border-red-500/30 bg-red-500/10 text-red-300"
      : severity === "Moderate"
        ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
        : severity === "Low"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : "border-slate-700 bg-slate-800 text-slate-300";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">

      {/* HEADER */}

      <div className="border-b border-slate-800 bg-slate-900 p-5">

        <div className="flex items-start justify-between gap-4">

          <div className="flex gap-4">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 font-bold text-cyan-400">
              {index + 1}
            </div>

            <div>

              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Indication {index + 1}
              </p>

              <h3 className="mt-1 text-xl font-bold">
                {defect.defectType ||
                  "Other Indication"}
              </h3>

            </div>

          </div>

          <span
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${severityClass}`}
          >
            {severity}
          </span>

        </div>

      </div>

      {/* CONTENT */}

      <div className="space-y-5 p-5">

        <div className="grid gap-4 sm:grid-cols-2">

          {defect.confidence !== undefined && (

            <ResultField
              title="Confidence"
              value={String(
                defect.confidence
              )}
              highlight
            />

          )}

          {defect.location && (

            <ResultField
              title="Location"
              value={defect.location}
            />

          )}

        </div>

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
  highlight = false,
}: {
  title: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>

      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {title}
      </p>

      <p
        className={`mt-2 text-sm leading-6 ${
          highlight
            ? "font-bold text-cyan-300"
            : "text-slate-300"
        }`}
      >
        {value}
      </p>

    </div>
  );
}