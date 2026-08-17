"use client";

import { useRef, useState } from "react";

type AnalysisResult = {
  defectType: string;
  possibleCause: string;
  severity: string;
  location: string;
  confidence: string;
  description: string;
  recommendedRemedy: string;
  prevention: string;
};

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");

  const handleFile = (file?: File) => {
    if (!file) return;

    setError("");
    setResult(null);

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid radiograph image.");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError("Maximum file size is 15 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImage(reader.result);
        setFileName(file.name);
      }
    };

    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImage(null);
    setFileName("");
    setResult(null);
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const analyzeRadiograph = async () => {
    if (!image) {
      setError("Please upload a radiograph first.");
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
          imageUrl: image,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI analysis failed.");
      }

      setResult({
        defectType: data.defectType || "Not determined",
        possibleCause: data.possibleCause || "Not determined",
        severity: data.severity || "Unclear",
        location: data.location || "Not determined",
        confidence: data.confidence || "N/A",
        description: data.description || "No description available.",
        recommendedRemedy:
          data.recommendedRemedy || "No remedy available.",
        prevention:
          data.prevention || "No prevention guidance available.",
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to AI."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <header className="border-b border-slate-800 bg-[#081522]">
        <div className="mx-auto max-w-7xl px-6 py-7">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
            Radiographic Inspection
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            Weld Radiograph Analyzer
          </h1>

          <p className="mt-2 text-slate-400">
            AI-assisted weld defect inspection and reporting
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-2">

          <div className="rounded-3xl border border-slate-800 bg-[#0b1929] p-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
              Step 01
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              Upload Radiograph
            </h2>

            <p className="mt-3 text-slate-400">
              Upload a radiographic image for AI analysis.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            {!image ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-6 flex min-h-[350px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-cyan-500/50 bg-[#081522] hover:border-cyan-300"
              >
                <div className="text-5xl">☢️</div>

                <h3 className="mt-5 text-2xl font-bold">
                  Choose Radiograph
                </h3>

                <p className="mt-3 text-slate-400">
                  JPG, PNG, WEBP, TIFF or BMP
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Maximum 15 MB
                </p>
              </button>
            ) : (
              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-700 bg-[#081522]">
                <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
                  <p className="truncate text-sm text-slate-300">
                    {fileName}
                  </p>

                  <button
                    type="button"
                    onClick={removeImage}
                    className="font-semibold text-red-400"
                  >
                    Remove
                  </button>
                </div>

                <div className="flex min-h-[350px] items-center justify-center bg-black p-4">
                  <img
                    src={image}
                    alt="Uploaded radiograph"
                    className="max-h-[500px] max-w-full object-contain"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={analyzeRadiograph}
              disabled={!image || analyzing}
              className="mt-6 w-full rounded-2xl bg-cyan-500 px-6 py-5 text-lg font-bold text-slate-950 disabled:opacity-40"
            >
              {analyzing
                ? "AI Analysis in Progress..."
                : "Analyze Radiograph"}
            </button>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-[#0b1929] p-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
              Step 02–04
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              AI Inspection Results
            </h2>

            {!result && !analyzing && (
              <div className="mt-6 rounded-2xl border border-slate-800 bg-[#081522] p-6 text-slate-400">
                Upload a radiograph and click Analyze Radiograph.
              </div>
            )}

            {analyzing && (
              <div className="mt-6 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-6">
                <p className="font-semibold text-cyan-300">
                  AI is analyzing the radiograph...
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  Please wait.
                </p>
              </div>
            )}

            {result && !analyzing && (
              <div className="mt-6 space-y-4">
                <ResultCard
                  title="Defect Type"
                  value={result.defectType}
                />

                <ResultCard
                  title="Confidence"
                  value={result.confidence}
                />

                <ResultCard
                  title="Severity"
                  value={result.severity}
                />

                <ResultCard
                  title="Location"
                  value={result.location}
                />

                <ResultCard
                  title="Possible Cause"
                  value={result.possibleCause}
                />

                <ResultCard
                  title="Description"
                  value={result.description}
                />

                <ResultCard
                  title="Recommended Remedy"
                  value={result.recommendedRemedy}
                />

                <ResultCard
                  title="Prevention"
                  value={result.prevention}
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
          <p className="text-sm leading-6 text-amber-200">
            AI results are inspection support only and should be
            verified by a qualified NDT inspector using the applicable
            inspection standard.
          </p>
        </div>
      </section>
    </main>
  );
}

function ResultCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#081522] p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </p>

      <p className="mt-2 leading-6 text-slate-200">
        {value}
      </p>
    </div>
  );
}