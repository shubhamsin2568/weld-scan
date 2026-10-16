"use client";

import { ChangeEvent, DragEvent, useEffect, useState } from "react";

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

const MAX_FILE_SIZE = 15 * 1024 * 1024;

const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
  "image/bmp",
];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [retrySeconds, setRetrySeconds] = useState(0);

  useEffect(() => {
    if (retrySeconds <= 0) return;

    const timer = setInterval(() => {
      setRetrySeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [retrySeconds]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleSelectedFile = (selectedFile: File) => {
    setError("");
    setResult(null);

    if (!allowedTypes.includes(selectedFile.type)) {
      setError(
        "Please upload a JPG, PNG, WEBP, TIFF or BMP radiograph image."
      );
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("Image size must be less than 15 MB.");
      return;
    }

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];

    if (selectedFile) {
      handleSelectedFile(selectedFile);
    }

    e.target.value = "";
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];

    if (droppedFile) {
      handleSelectedFile(droppedFile);
    }
  };

  const removeImage = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setFile(null);
    setPreview("");
    setResult(null);
    setError("");
  };

  const analyzeImage = async () => {
    if (!file) {
      setError("Please upload a radiograph image first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const imageUrl = await fileToDataUrl(file);

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 503 || response.status === 429) {
          setRetrySeconds(60);
          throw new Error(
            "AI Server Temporarily Unavailable. Please try again shortly."
          );
        }

        throw new Error(
          data?.error || "Unable to analyze the radiograph."
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while analyzing the image."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">

      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">
              W
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-900">
                WeldScan
              </h1>

              <p className="text-xs text-slate-500">
                Radiographic Inspection
              </p>
            </div>
          </div>

          <div className="hidden rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 sm:block">
            AI-Assisted Weld Inspection
          </div>
        </div>
      </header>

      {/* MAIN */}
      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6">

        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
            Weld Radiograph Analyzer
          </p>

          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Inspect weld radiographs with AI
          </h2>

          <p className="mt-3 max-w-3xl text-slate-600">
            Upload a weld radiograph and WeldScan will analyze visible
            indications, possible defects, severity, evidence and recommended
            actions.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">

          {/* UPLOAD CARD */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="mb-5">
              <h3 className="text-lg font-bold text-slate-900">
                Upload Radiograph
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Upload a clear weld radiographic image for preliminary AI
                analysis.
              </p>
            </div>

            {!preview ? (

              /* DRAG DROP AREA */
              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 ${
                  isDragging
                    ? "scale-[1.01] border-blue-600 bg-blue-50"
                    : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40"
                }`}
              >

                <div className="mx-auto flex max-w-md flex-col items-center">

                  <div
                    className={`mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl ${
                      isDragging
                        ? "bg-blue-600 text-white"
                        : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    {isDragging ? "↓" : "↑"}
                  </div>

                  <h4 className="text-lg font-semibold text-slate-800">
                    {isDragging
                      ? "Drop your image here"
                      : "Drag & Drop your radiograph"}
                  </h4>

                  <p className="mt-2 text-sm text-slate-500">
                    or select an image from your device
                  </p>

                  <label className="mt-6 cursor-pointer rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
                    Select Image

                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.tiff,.bmp,image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  <p className="mt-4 text-xs text-slate-400">
                    JPG, PNG, WEBP, TIFF or BMP • Maximum 15 MB
                  </p>

                </div>
              </div>

            ) : (

              /* IMAGE PREVIEW */
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">

                <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {file?.name}
                    </p>

                    <p className="text-xs text-slate-500">
                      {file ? formatFileSize(file.size) : ""}
                    </p>
                  </div>

                  <button
                    onClick={removeImage}
                    className="ml-3 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    Remove
                  </button>

                </div>

                <div className="flex min-h-[360px] items-center justify-center bg-slate-100 p-4">

                  <img
                    src={preview}
                    alt="Uploaded weld radiograph"
                    className="max-h-[520px] max-w-full rounded-lg object-contain shadow-sm"
                  />

                </div>
              </div>
            )}

            {/* ANALYZE BUTTON */}
            <button
              onClick={analyzeImage}
              disabled={!file || loading || retrySeconds > 0}
              className={`mt-5 w-full rounded-xl px-5 py-3.5 text-sm font-semibold text-white transition ${
                !file || loading || retrySeconds > 0
                  ? "cursor-not-allowed bg-slate-300"
                  : "bg-blue-600 shadow-sm hover:bg-blue-700"
              }`}
            >
              {loading
                ? "Analyzing Radiograph..."
                : retrySeconds > 0
                ? `Retry Available in ${formatTime(retrySeconds)}`
                : "Analyze Radiograph"}
            </button>

            {/* ERROR */}
            {error && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">

                <div className="flex gap-3">

                  <div className="text-lg">
                    ⚠️
                  </div>

                  <div>

                    <p className="font-semibold text-amber-900">
                      {retrySeconds > 0
                        ? "AI Server Temporarily Unavailable"
                        : "Analysis Error"}
                    </p>

                    <p className="mt-1 text-sm text-amber-800">
                      {error}
                    </p>

                    {retrySeconds > 0 && (
                      <p className="mt-2 text-xs text-amber-700">
                        Please wait for the retry timer and try again.
                      </p>
                    )}

                  </div>

                </div>
              </div>
            )}

            {/* NOTICE */}
            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">

              <p className="text-xs leading-5 text-blue-800">
                <strong>Inspection Notice:</strong> WeldScan provides
                AI-assisted preliminary inspection. Results should be reviewed
                by a qualified NDT professional and should not be treated as
                certified inspection results.
              </p>

            </div>

          </div>

          {/* RESULTS CARD */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="mb-5 flex items-center justify-between">

              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Inspection Results
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  AI-generated radiograph assessment
                </p>
              </div>

              {result?.provider && (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {result.provider}
                </span>
              )}

            </div>

            {!result ? (

              <div className="flex min-h-[500px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">

                <div>

                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
                    🔍
                  </div>

                  <h4 className="font-semibold text-slate-800">
                    No analysis yet
                  </h4>

                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                    Upload a weld radiograph and click{" "}
                    <strong>Analyze Radiograph</strong> to see the inspection
                    result here.
                  </p>

                </div>

              </div>

            ) : (

              <div className="space-y-5">

                {/* OVERALL */}
                <div
                  className={`rounded-xl border p-5 ${
                    isNoDefect(result)
                      ? "border-green-200 bg-green-50"
                      : "border-blue-100 bg-blue-50"
                  }`}
                >

                  <div className="flex items-start gap-3">

                    <div className="text-xl">
                      {isNoDefect(result) ? "✓" : "🔎"}
                    </div>

                    <div>

                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Overall Assessment
                      </p>

                      <p className="mt-1 font-semibold leading-6 text-slate-900">
                        {result.overallAssessment ||
                          "No overall assessment provided."}
                      </p>

                    </div>

                  </div>

                </div>

                {/* STATS */}
                <div className="grid gap-3 sm:grid-cols-3">

                  <StatCard
                    label="Image Quality"
                    value={result.imageQuality || "Unclear"}
                  />

                  <StatCard
                    label="Indications"
                    value={String(result.defects?.length || 0)}
                  />

                  <StatCard
                    label="AI Provider"
                    value={result.provider || "AI"}
                  />

                </div>

                {/* SUMMARY */}
                {result.inspectionSummary && (
                  <ResultField
                    title="Inspection Summary"
                    value={result.inspectionSummary}
                  />
                )}

                {/* DEFECTS */}
                <div>

                  <div className="mb-3 flex items-center justify-between">

                    <h4 className="font-bold text-slate-900">
                      Detected Indications
                    </h4>

                    <span className="text-xs text-slate-500">
                      {result.defects?.length || 0} found
                    </span>

                  </div>

                  {result.defects && result.defects.length > 0 ? (

                    <div className="space-y-4">

                      {result.defects.map((defect, index) => (
                        <DefectCard
                          key={`${defect.defectType}-${index}`}
                          defect={defect}
                          index={index}
                        />
                      ))}

                    </div>

                  ) : (

                    <div className="rounded-xl border border-green-200 bg-green-50 p-5">

                      <div className="flex gap-3">

                        <div className="text-xl text-green-600">
                          ✓
                        </div>

                        <div>

                          <p className="font-semibold text-green-900">
                            No Clear Defect Detected
                          </p>

                          <p className="mt-1 text-sm leading-6 text-green-800">
                            No significant defect indication was identified in
                            the submitted radiograph.
                          </p>

                        </div>

                      </div>

                    </div>
                  )}

                </div>

              </div>
            )}

          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white">

        <div className="mx-auto max-w-7xl px-6 py-6 text-center text-xs text-slate-500">
          WeldScan • AI-Assisted Weld Radiograph Inspection
        </div>

      </footer>

    </main>
  );
}


/* DEFECT CARD */

function DefectCard({
  defect,
  index,
}: {
  defect: Defect;
  index: number;
}) {
  const severity = (defect.severity || "Unclear").toLowerCase();

  const severityClass =
    severity === "high"
      ? "border-red-200 bg-red-50 text-red-700"
      : severity === "moderate"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : severity === "low"
      ? "border-green-200 bg-green-50 text-green-700"
      : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4">

        <div>

          <p className="text-xs font-medium text-slate-500">
            Indication #{index + 1}
          </p>

          <h5 className="mt-1 text-base font-bold text-slate-900">
            {defect.defectType || "Unclassified Indication"}
          </h5>

        </div>

        <div className="flex items-center gap-2">

          {defect.confidence !== undefined && (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {formatConfidence(defect.confidence)} confidence
            </span>
          )}

          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${severityClass}`}
          >
            {defect.severity || "Unclear"} severity
          </span>

        </div>

      </div>

      <div className="space-y-4 p-4">

        <div className="grid gap-4 sm:grid-cols-2">

          <ResultField
            title="Location"
            value={defect.location}
          />

          <ResultField
            title="Evidence"
            value={defect.evidence}
          />

        </div>

        <ResultField
          title="Description"
          value={defect.description}
        />

        <ResultField
          title="Possible Cause"
          value={defect.possibleCause}
        />

        <ResultField
          title="Recommended Remedy"
          value={defect.recommendedRemedy}
        />

        <ResultField
          title="Prevention"
          value={defect.prevention}
        />

      </div>

    </div>
  );
}


/* RESULT FIELD */

function ResultField({
  title,
  value,
}: {
  title: string;
  value?: string;
}) {
  if (!value) return null;

  return (
    <div>

      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <p className="text-sm leading-6 text-slate-700">
        {value}
      </p>

    </div>
  );
}


/* STAT CARD */

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-bold text-slate-900">
        {value}
      </p>

    </div>
  );
}


/* HELPERS */

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatConfidence(value: string | number) {
  const text = String(value);

  return text.includes("%") ? text : `${text}%`;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

function isNoDefect(result: AnalysisResult) {
  if (!result.defects || result.defects.length === 0) {
    return true;
  }

  return result.defects.every((defect) => {
    const type = (defect.defectType || "").toLowerCase();

    return (
      type.includes("no clear defect") ||
      type.includes("no significant indication")
    );
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Unable to read the selected image."));
      }
    };

    reader.onerror = () => {
      reject(new Error("Unable to read the selected image."));
    };

    reader.readAsDataURL(file);
  });
}