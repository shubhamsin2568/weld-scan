"use client";

import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Coordinate = {
  x: number;
  y: number;
  width: number;
  height: number;
};

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
  coordinates?: Coordinate;
};

type AnalysisResult = {
  overallAssessment?: string;
  imageQuality?: string;
  inspectionSummary?: string;
  provider?: string;
  defects?: Defect[];
};

type WeldInfo = {
  material: string;
  weldingProcess: string;
  jointType: string;
  thickness: string;
};

type NDTMethod = "RT" | "UT";

type ThemeMode = "light" | "dark" | "system";

type AnalysisStage =
  | "idle"
  | "reading"
  | "inspecting"
  | "identifying"
  | "reporting"
  | "done";

const MAX_FILE_SIZE = 15 * 1024 * 1024;

const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
  "image/bmp",
];

function getSeverityRank(severity?: string) {
  const value = severity?.toLowerCase();

  if (value === "high") return 3;
  if (value === "moderate") return 2;
  if (value === "low") return 1;

  return 0;
}

function severityClass(severity?: string) {
  const value = severity?.toLowerCase();

  if (value === "high") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (value === "moderate") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  if (value === "low") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function escapeHtml(value?: string) {
  if (!value) return "";

  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const [dragActive, setDragActive] = useState(false);

  const [result, setResult] = useState<AnalysisResult | null>(null);

  const [error, setError] = useState("");

  const [stage, setStage] = useState<AnalysisStage>("idle");
  const [stageText, setStageText] = useState("");

  const [zoom, setZoom] = useState(100);

  const [viewMode, setViewMode] =
    useState<"original" | "enhanced">("original");

  const [weldInfo, setWeldInfo] = useState<WeldInfo>({
    material: "",
    weldingProcess: "",
    jointType: "",
    thickness: "",
  });

  const [ndtMethod, setNdtMethod] =
    useState<NDTMethod>("RT");

  const [theme, setTheme] =
    useState<ThemeMode>("system");

  const [resolvedTheme, setResolvedTheme] =
    useState<"light" | "dark">("light");

  const isAnalyzing =
    stage !== "idle" && stage !== "done";

  /* =========================
     THEME INITIALIZATION
  ========================= */

  useEffect(() => {
    const savedTheme =
      localStorage.getItem("weldscan-theme");

    const initialTheme: ThemeMode =
      savedTheme === "light" ||
      savedTheme === "dark" ||
      savedTheme === "system"
        ? savedTheme
        : "system";

    setTheme(initialTheme);

    const media = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

    const applyTheme = (mode: ThemeMode) => {
      const dark =
        mode === "dark" ||
        (mode === "system" && media.matches);

      setResolvedTheme(dark ? "dark" : "light");
    };

    applyTheme(initialTheme);

    const handleSystemChange = () => {
      if (initialTheme === "system") {
        applyTheme("system");
      }
    };

    media.addEventListener(
      "change",
      handleSystemChange
    );

    return () => {
      media.removeEventListener(
        "change",
        handleSystemChange
      );
    };
  }, []);

  /* =========================
     SAVE THEME
  ========================= */

  useEffect(() => {
    localStorage.setItem(
      "weldscan-theme",
      theme
    );

    const media = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

    const dark =
      theme === "dark" ||
      (theme === "system" && media.matches);

    setResolvedTheme(dark ? "dark" : "light");
  }, [theme]);

  /* =========================
     PREVIEW CLEANUP
  ========================= */

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const defects = result?.defects || [];

  const highestSeverity = useMemo(() => {
    if (!defects.length) {
      return "None";
    }

    return defects.reduce(
      (highest, defect) => {
        return getSeverityRank(defect.severity) >
          getSeverityRank(highest)
          ? defect.severity || highest
          : highest;
      },
      "Low"
    );
  }, [defects]);

  const inspectionStatus = useMemo(() => {
    if (!result) return "Waiting";

    if (highestSeverity === "High") {
      return "Review Required";
    }

    if (highestSeverity === "Moderate") {
      return "Review Recommended";
    }

    if (defects.length > 0) {
      return "Minor Indications";
    }

    return "No Clear Defect";
  }, [result, highestSeverity, defects.length]);

  /* =========================
     FILE SELECTION
  ========================= */

  function selectFile(selectedFile: File) {
    setError("");

    if (!allowedTypes.includes(selectedFile.type)) {
      setError(
        "Unsupported file type. Please use JPG, PNG, WEBP, TIFF or BMP."
      );
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("File is larger than 15 MB.");
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const url =
      URL.createObjectURL(selectedFile);

    setFile(selectedFile);
    setPreviewUrl(url);
    setResult(null);
    setStage("idle");
    setStageText("");
    setZoom(100);
    setViewMode("original");
  }

  function handleFileInput(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile =
      event.target.files?.[0];

    if (selectedFile) {
      selectFile(selectedFile);
    }

    event.target.value = "";
  }

  function handleDrop(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    setDragActive(false);

    const droppedFile =
      event.dataTransfer.files?.[0];

    if (droppedFile) {
      selectFile(droppedFile);
    }
  }

  function removeImage() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(null);
    setPreviewUrl("");
    setResult(null);
    setError("");
    setStage("idle");
    setStageText("");
    setZoom(100);
    setViewMode("original");
  }

  function replaceImage() {
    fileInputRef.current?.click();
  }

  /* =========================
     FILE TO DATA URL
  ========================= */

  async function fileToDataUrl(
    selectedFile: File
  ) {
    return await new Promise<string>(
      (resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          resolve(String(reader.result));
        };

        reader.onerror = () => {
          reject(
            new Error(
              "Could not read the image."
            )
          );
        };

        reader.readAsDataURL(selectedFile);
      }
    );
  }

  /* =========================
     ANALYZE IMAGE
  ========================= */

  async function analyzeImage() {
    if (!file) {
      setError(
        "Please upload a radiograph first."
      );
      return;
    }

    if (ndtMethod !== "RT") {
      setError(
        "UT inspection is coming soon. RT is currently available."
      );
      return;
    }

    try {
      setError("");
      setResult(null);

      setStage("reading");
      setStageText("Reading image");

      const imageUrl =
        await fileToDataUrl(file);

      setStage("inspecting");
      setStageText("Inspecting weld");

      await new Promise((resolve) =>
        setTimeout(resolve, 700)
      );

      setStage("identifying");
      setStageText(
        "Identifying indications"
      );

      const response = await fetch(
        "/api/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageUrl,
            weldInfo,
            ndtMethod,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Analysis failed. Please try again."
        );
      }

      setStage("reporting");
      setStageText("Preparing report");

      await new Promise((resolve) =>
        setTimeout(resolve, 700)
      );

      setResult(data);

      setStage("done");
      setStageText("Analysis complete");
    } catch (err) {
      console.error(err);

      setStage("idle");

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while analyzing the image."
      );
    }
  }

  /* =========================
     PROFESSIONAL REPORT
  ========================= */

  function generateReport() {
    if (!result) return;

    const reportWindow =
      window.open(
        "",
        "_blank",
        "width=1100,height=850"
      );

    if (!reportWindow) {
      setError(
        "Please allow pop-ups to generate the report."
      );
      return;
    }

    const reportId =
      `WS-${new Date().getFullYear()}-${Date.now()
        .toString()
        .slice(-8)}`;

    const inspectionDate =
      new Date().toLocaleString();

    const defectRows = defects
      .map(
        (defect, index) => `
          <div class="defect-card">
            <div class="defect-header">
              <div>
                <div class="defect-number">
                  INDICATION ${String(index + 1).padStart(
                    2,
                    "0"
                  )}
                </div>

                <h2>
                  ${escapeHtml(
                    defect.defectType ||
                      "Unclassified Indication"
                  )}
                </h2>
              </div>

              <div class="severity">
                ${escapeHtml(
                  defect.severity ||
                    "Unclear"
                )}
              </div>
            </div>

            <div class="grid">
              <div>
                <span>Confidence</span>
                <strong>
                  ${escapeHtml(
                    String(
                      defect.confidence ||
                        "Unclear"
                    )
                  )}
                </strong>
              </div>

              <div>
                <span>Location</span>
                <strong>
                  ${escapeHtml(
                    defect.location ||
                      "Not specified"
                  )}
                </strong>
              </div>
            </div>

            <div class="info-block">
              <h3>Evidence</h3>
              <p>
                ${escapeHtml(
                  defect.evidence ||
                    "Not provided."
                )}
              </p>
            </div>

            <div class="info-block">
              <h3>Description</h3>
              <p>
                ${escapeHtml(
                  defect.description ||
                    "Not provided."
                )}
              </p>
            </div>

            <div class="two-column">
              <div class="info-block">
                <h3>Possible Cause</h3>
                <p>
                  ${escapeHtml(
                    defect.possibleCause ||
                      "Not provided."
                  )}
                </p>
              </div>

              <div class="info-block remedy">
                <h3>Recommended Remedy</h3>
                <p>
                  ${escapeHtml(
                    defect.recommendedRemedy ||
                      "Not provided."
                  )}
                </p>
              </div>
            </div>

            <div class="info-block prevention">
              <h3>Prevention</h3>
              <p>
                ${escapeHtml(
                  defect.prevention ||
                    "Not provided."
                )}
              </p>
            </div>

            ${
              defect.coordinates
                ? `
                  <div class="coordinates">
                    <strong>
                      AI Location Marker:
                    </strong>
                    X: ${defect.coordinates.x},
                    Y: ${defect.coordinates.y},
                    W: ${defect.coordinates.width},
                    H: ${defect.coordinates.height}
                  </div>
                `
                : ""
            }
          </div>
        `
      )
      .join("");

    const statusClass =
      inspectionStatus === "Review Required"
        ? "danger"
        : inspectionStatus ===
          "Review Recommended"
        ? "warning"
        : "normal";

    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />

        <title>
          WeldScan Inspection Report
        </title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            background: #eef2f7;
            color: #172033;
            font-family:
              Arial,
              Helvetica,
              sans-serif;
            line-height: 1.55;
          }

          .page {
            width: 210mm;
            min-height: 297mm;
            margin: 24px auto;
            background: white;
            padding: 28px 34px;
            box-shadow:
              0 8px 35px
              rgba(15, 23, 42, 0.12);
          }

          .topbar {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20px;
            padding-bottom: 20px;
            border-bottom: 3px solid #155eef;
          }

          .brand {
            color: #155eef;
            font-size: 30px;
            font-weight: 900;
            letter-spacing: -1px;
          }

          .subtitle {
            margin-top: 4px;
            color: #64748b;
            font-size: 12px;
            font-weight: 700;
          }

          .report-id {
            text-align: right;
            font-size: 11px;
            color: #64748b;
          }

          .report-id strong {
            display: block;
            color: #172033;
            font-size: 13px;
          }

          .title {
            margin: 26px 0 18px;
          }

          .title h1 {
            margin: 0;
            font-size: 25px;
            color: #172033;
          }

          .title p {
            margin: 5px 0 0;
            color: #64748b;
            font-size: 12px;
          }

          .section-title {
            margin-top: 28px;
            margin-bottom: 10px;
            padding-bottom: 7px;
            border-bottom: 1px solid #dbe2ea;
            color: #172033;
            font-size: 16px;
            font-weight: 900;
          }

          .meta-grid {
            display: grid;
            grid-template-columns:
              repeat(2, 1fr);
            border: 1px solid #dbe2ea;
            border-radius: 10px;
            overflow: hidden;
          }

          .meta-item {
            padding: 12px 14px;
            border-bottom: 1px solid #e2e8f0;
          }

          .meta-item:nth-child(odd) {
            border-right: 1px solid #e2e8f0;
          }

          .meta-item span {
            display: block;
            color: #64748b;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: .5px;
          }

          .meta-item strong {
            display: block;
            margin-top: 3px;
            font-size: 13px;
          }

          .summary-grid {
            display: grid;
            grid-template-columns:
              repeat(4, 1fr);
            gap: 10px;
          }

          .summary-card {
            border: 1px solid #dbe2ea;
            border-radius: 10px;
            padding: 13px;
          }

          .summary-card span {
            display: block;
            color: #64748b;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
          }

          .summary-card strong {
            display: block;
            margin-top: 5px;
            font-size: 14px;
          }

          .status {
            border-radius: 8px;
            padding: 4px 8px;
            display: inline-block;
          }

          .status.normal {
            background: #dcfce7;
            color: #166534;
          }

          .status.warning {
            background: #ffedd5;
            color: #9a3412;
          }

          .status.danger {
            background: #fee2e2;
            color: #991b1b;
          }

          .assessment {
            border-left: 4px solid #155eef;
            background: #eff6ff;
            padding: 16px;
            border-radius: 8px;
          }

          .assessment strong {
            display: block;
            color: #155eef;
            font-size: 11px;
            text-transform: uppercase;
            margin-bottom: 5px;
          }

          .assessment p {
            margin: 0;
            font-size: 13px;
          }

          .defect-card {
            border: 1px solid #dbe2ea;
            border-radius: 12px;
            padding: 18px;
            margin-top: 16px;
            page-break-inside: avoid;
          }

          .defect-header {
            display: flex;
            justify-content: space-between;
            gap: 15px;
            align-items: flex-start;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 12px;
          }

          .defect-number {
            color: #64748b;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: 1px;
          }

          .defect-header h2 {
            margin: 3px 0 0;
            font-size: 18px;
          }

          .severity {
            border-radius: 7px;
            background: #fff7ed;
            color: #c2410c;
            padding: 5px 10px;
            font-size: 11px;
            font-weight: 900;
            text-transform: uppercase;
          }

          .grid {
            display: grid;
            grid-template-columns:
              repeat(2, 1fr);
            gap: 12px;
            margin-top: 14px;
          }

          .grid span {
            display: block;
            color: #64748b;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
          }

          .grid strong {
            display: block;
            margin-top: 3px;
            font-size: 12px;
          }

          .info-block {
            margin-top: 14px;
            padding: 12px;
            background: #f8fafc;
            border-radius: 8px;
          }

          .info-block h3 {
            margin: 0 0 5px;
            font-size: 11px;
            text-transform: uppercase;
            color: #64748b;
          }

          .info-block p {
            margin: 0;
            font-size: 12px;
          }

          .two-column {
            display: grid;
            grid-template-columns:
              repeat(2, 1fr);
            gap: 12px;
          }

          .remedy {
            background: #eff6ff;
          }

          .prevention {
            background: #f0fdf4;
          }

          .coordinates {
            margin-top: 12px;
            padding: 9px 11px;
            background: #fff1f2;
            color: #be123c;
            border-radius: 7px;
            font-size: 10px;
          }

          .no-defect {
            padding: 18px;
            border: 1px solid #bbf7d0;
            background: #f0fdf4;
            color: #166534;
            border-radius: 10px;
            font-size: 13px;
          }

          .disclaimer {
            margin-top: 28px;
            border: 1px solid #fed7aa;
            background: #fff7ed;
            padding: 15px;
            border-radius: 9px;
            font-size: 10px;
            color: #7c2d12;
          }

          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #dbe2ea;
            color: #64748b;
            font-size: 9px;
            text-align: center;
          }

          .print-button {
            position: fixed;
            right: 24px;
            bottom: 24px;
            border: 0;
            border-radius: 9px;
            background: #155eef;
            color: white;
            padding: 12px 18px;
            font-weight: 800;
            cursor: pointer;
            box-shadow:
              0 6px 20px
              rgba(21, 94, 239, .25);
          }

          @media print {
            body {
              background: white;
            }

            .page {
              width: auto;
              min-height: auto;
              margin: 0;
              box-shadow: none;
              padding: 20px;
            }

            .print-button {
              display: none;
            }
          }
        </style>
      </head>

      <body>

        <div class="page">

          <div class="topbar">

            <div>
              <div class="brand">
                WeldScan
              </div>

              <div class="subtitle">
                AI-Assisted Weld Radiograph Inspection
              </div>
            </div>

            <div class="report-id">
              REPORT ID
              <strong>
                ${reportId}
              </strong>

              <div style="margin-top:5px">
                ${escapeHtml(
                  inspectionDate
                )}
              </div>
            </div>

          </div>

          <div class="title">
            <h1>
              Non-Destructive Testing Inspection Report
            </h1>

            <p>
              Preliminary AI-assisted radiographic
              inspection record
            </p>
          </div>

          <div class="section-title">
            Inspection Information
          </div>

          <div class="meta-grid">

            <div class="meta-item">
              <span>NDT Method</span>
              <strong>
                ${escapeHtml(ndtMethod)}
                — Radiographic Testing
              </strong>
            </div>

            <div class="meta-item">
              <span>Image Quality</span>
              <strong>
                ${escapeHtml(
                  result.imageQuality ||
                    "Unclear"
                )}
              </strong>
            </div>

            <div class="meta-item">
              <span>Material</span>
              <strong>
                ${escapeHtml(
                  weldInfo.material ||
                    "Not provided"
                )}
              </strong>
            </div>

            <div class="meta-item">
              <span>Welding Process</span>
              <strong>
                ${escapeHtml(
                  weldInfo.weldingProcess ||
                    "Not provided"
                )}
              </strong>
            </div>

            <div class="meta-item">
              <span>Joint Type</span>
              <strong>
                ${escapeHtml(
                  weldInfo.jointType ||
                    "Not provided"
                )}
              </strong>
            </div>

            <div class="meta-item">
              <span>Thickness</span>
              <strong>
                ${escapeHtml(
                  weldInfo.thickness
                    ? `${weldInfo.thickness} mm`
                    : "Not provided"
                )}
              </strong>
            </div>

          </div>

          <div class="section-title">
            Inspection Summary
          </div>

          <div class="summary-grid">

            <div class="summary-card">
              <span>Indications</span>
              <strong>
                ${defects.length}
              </strong>
            </div>

            <div class="summary-card">
              <span>Highest Severity</span>
              <strong>
                ${escapeHtml(
                  highestSeverity
                )}
              </strong>
            </div>

            <div class="summary-card">
              <span>Status</span>
              <strong>
                <span class="status ${statusClass}">
                  ${escapeHtml(
                    inspectionStatus
                  )}
                </span>
              </strong>
            </div>

            <div class="summary-card">
              <span>AI Provider</span>
              <strong>
                ${escapeHtml(
                  result.provider ||
                    "AI Analysis"
                )}
              </strong>
            </div>

          </div>

          <div class="section-title">
            Overall Assessment
          </div>

          <div class="assessment">

            <strong>
              Preliminary Assessment
            </strong>

            <p>
              ${escapeHtml(
                result.overallAssessment ||
                  "No assessment provided."
              )}
            </p>

          </div>

          <div class="section-title">
            Inspection Narrative
          </div>

          <p style="
            font-size:13px;
            margin-top:0;
          ">
            ${escapeHtml(
              result.inspectionSummary ||
                "No inspection summary was provided."
            )}
          </p>

          <div class="section-title">
            Detected Indications
          </div>

          ${
            defectRows ||
            `
              <div class="no-defect">
                <strong>
                  No Clear Defect
                </strong>

                <div style="margin-top:4px">
                  No significant radiographic
                  indication was confidently identified
                  by the AI system.
                </div>
              </div>
            `
          }

          <div class="disclaimer">

            <strong>
              AI Inspection Disclaimer
            </strong>

            <p>
              WeldScan provides AI-assisted preliminary
              radiographic inspection only. The generated
              findings are intended to support inspection
              review and are not a substitute for qualified
              NDT personnel, applicable inspection procedures,
              acceptance criteria, standards, or certified
              inspection records.
            </p>

            <p>
              Final acceptance, rejection, repair decisions,
              and code-compliance determinations must be made
              by appropriately qualified personnel in
              accordance with the applicable specification
              and inspection procedure.
            </p>

          </div>

          <div class="footer">

            WeldScan — AI-Assisted Weld Radiograph Inspection
            <br />

            Preliminary inspection report •
            Report ID: ${reportId}

          </div>

        </div>

        <button
          class="print-button"
          onclick="window.print()"
        >
          Print / Save as PDF
        </button>

      </body>
      </html>
    `;

    try {
      reportWindow.document.open();
      reportWindow.document.write(
        reportHtml
      );
      reportWindow.document.close();

      setTimeout(() => {
        reportWindow.focus();
        reportWindow.print();
      }, 600);
    } catch (err) {
      console.error(
        "Report generation failed:",
        err
      );

      reportWindow.close();

      setError(
        "Could not generate the inspection report."
      );
    }
  }

  return (
    <main
      data-theme={resolvedTheme}
      className={`min-h-screen transition-colors duration-300 ${
        resolvedTheme === "dark"
          ? "bg-[#05070b] text-slate-100"
          : "bg-slate-50 text-slate-900"
      }`}
    >

      {/* =========================
          GLOBAL DARK THEME
      ========================= */}

      <style jsx global>{`
        [data-theme="dark"] {
          color-scheme: dark;
        }

        [data-theme="dark"] .bg-white {
          background-color: #0f172a !important;
        }

        [data-theme="dark"] .bg-slate-50 {
          background-color: #111827 !important;
        }

        [data-theme="dark"] .bg-slate-100 {
          background-color: #1e293b !important;
        }

        [data-theme="dark"] .border {
          border-color: #334155 !important;
        }

        [data-theme="dark"]
        .border-slate-200,
        [data-theme="dark"]
        .border-slate-300 {
          border-color: #334155 !important;
        }

        [data-theme="dark"]
        .text-slate-900 {
          color: #f8fafc !important;
        }

        [data-theme="dark"]
        .text-slate-800 {
          color: #e2e8f0 !important;
        }

        [data-theme="dark"]
        .text-slate-700 {
          color: #cbd5e1 !important;
        }

        [data-theme="dark"]
        .text-slate-600 {
          color: #94a3b8 !important;
        }

        [data-theme="dark"]
        .text-slate-500 {
          color: #94a3b8 !important;
        }

        [data-theme="dark"]
        .text-slate-400 {
          color: #64748b !important;
        }

        [data-theme="dark"]
        input,
        [data-theme="dark"]
        select {
          background-color: #0f172a !important;
          color: #f8fafc !important;
          border-color: #334155 !important;
        }

        [data-theme="dark"]
        input::placeholder {
          color: #64748b !important;
        }

        [data-theme="dark"] option {
          background-color: #0f172a;
          color: #f8fafc;
        }

        [data-theme="dark"] .bg-blue-50 {
          background-color: #172554 !important;
        }

        [data-theme="dark"]
        .text-blue-950 {
          color: #dbeafe !important;
        }

        [data-theme="dark"]
        .text-blue-800 {
          color: #bfdbfe !important;
        }

        [data-theme="dark"]
        .text-blue-700 {
          color: #93c5fd !important;
        }

        [data-theme="dark"]
        .border-blue-100 {
          border-color: #1e3a8a !important;
        }

        [data-theme="dark"] .bg-green-50 {
          background-color: #052e16 !important;
        }

        [data-theme="dark"]
        .text-green-950 {
          color: #dcfce7 !important;
        }

        [data-theme="dark"]
        .text-green-700 {
          color: #86efac !important;
        }

        [data-theme="dark"]
        .text-green-800 {
          color: #bbf7d0 !important;
        }

        [data-theme="dark"]
        .border-green-200 {
          border-color: #166534 !important;
        }

        [data-theme="dark"] .bg-red-50 {
          background-color: #450a0a !important;
        }

        [data-theme="dark"]
        .text-red-700 {
          color: #fca5a5 !important;
        }

        [data-theme="dark"]
        .border-red-200 {
          border-color: #991b1b !important;
        }

        [data-theme="dark"] .bg-orange-50 {
          background-color: #431407 !important;
        }

        [data-theme="dark"]
        .text-orange-700 {
          color: #fdba74 !important;
        }

        [data-theme="dark"] .bg-slate-950 {
          background-color: #020617 !important;
        }
      `}</style>

      {/* =========================
          HEADER
      ========================= */}

      <header
        className={`border-b ${
          resolvedTheme === "dark"
            ? "border-slate-800 bg-[#0b1120]"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div>
            <div className="text-2xl font-black tracking-tight text-blue-700">
              WeldScan
            </div>

            <div className="text-xs font-semibold text-slate-500">
              AI-Assisted Weld Radiograph Inspection
            </div>
          </div>

          <div className="flex items-center gap-3">

            <div
              className={`flex items-center gap-1 rounded-xl border p-1 ${
                resolvedTheme === "dark"
                  ? "border-slate-700 bg-slate-900"
                  : "border-slate-200 bg-white"
              }`}
            >

              <button
                type="button"
                onClick={() =>
                  setTheme("light")
                }
                title="Day mode"
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  theme === "light"
                    ? "bg-blue-600 text-white"
                    : resolvedTheme === "dark"
                    ? "text-slate-300 hover:bg-slate-800"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                ☀️
              </button>

              <button
                type="button"
                onClick={() =>
                  setTheme("system")
                }
                title="System default"
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  theme === "system"
                    ? "bg-blue-600 text-white"
                    : resolvedTheme === "dark"
                    ? "text-slate-300 hover:bg-slate-800"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                🖥️
              </button>

              <button
                type="button"
                onClick={() =>
                  setTheme("dark")
                }
                title="Dark mode"
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  theme === "dark"
                    ? "bg-blue-600 text-white"
                    : resolvedTheme === "dark"
                    ? "text-slate-300 hover:bg-slate-800"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                🌙
              </button>

            </div>

            <div
              className={`hidden rounded-full border px-4 py-2 text-xs font-bold sm:block ${
                resolvedTheme === "dark"
                  ? "border-blue-900 bg-blue-950 text-blue-300"
                  : "border-blue-100 bg-blue-50 text-blue-700"
              }`}
            >
              {ndtMethod} • AI Inspection
            </div>

          </div>

        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* MAIN GRID */}

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">

          {/* =========================
              LEFT PANEL
          ========================= */}

          <aside className="space-y-6">

            {/* UPLOAD */}

            <section className="rounded-2xl border bg-white p-5 shadow-sm">

              <div className="mb-4">
                <h2 className="text-lg font-bold">
                  Radiographic Image
                </h2>

                <p className="text-sm text-slate-500">
                  Upload the weld radiograph to begin inspection.
                </p>
              </div>

              {!previewUrl ? (
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() =>
                    setDragActive(false)
                  }
                  onDrop={handleDrop}
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${
                    dragActive
                      ? "border-blue-600 bg-blue-50 shadow-lg"
                      : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
                  }`}
                >

                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600">
                    ↑
                  </div>

                  <div className="font-bold">
                    Drag & Drop Radiograph
                  </div>

                  <div className="mt-1 text-sm text-slate-500">
                    or click to select image
                  </div>

                  <div className="mt-4 text-xs text-slate-400">
                    JPG • PNG • WEBP • TIFF • BMP
                  </div>

                  <div className="mt-1 text-xs text-slate-400">
                    Maximum 15 MB
                  </div>

                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border bg-slate-950">

                  <img
                    src={previewUrl}
                    alt="Uploaded weld radiograph"
                    className="max-h-72 w-full object-contain"
                  />

                  <div className="flex gap-2 bg-slate-900 p-3">

                    <button
                      type="button"
                      onClick={replaceImage}
                      className="flex-1 rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-800"
                    >
                      Replace
                    </button>

                    <button
                      type="button"
                      onClick={removeImage}
                      className="flex-1 rounded-lg bg-red-500 px-3 py-2 text-sm font-bold text-white"
                    >
                      Remove
                    </button>

                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/tiff,image/bmp"
                className="hidden"
                onChange={handleFileInput}
              />

            </section>

            {/* WELD INFORMATION */}

            <section className="rounded-2xl border bg-white p-5 shadow-sm">

              <h2 className="text-lg font-bold">
                Weld Information
              </h2>

              <p className="mb-5 text-sm text-slate-500">
                Optional information for better inspection context.
              </p>

              <div className="space-y-4">

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    Material
                  </label>

                  <input
                    value={weldInfo.material}
                    onChange={(e) =>
                      setWeldInfo({
                        ...weldInfo,
                        material:
                          e.target.value,
                      })
                    }
                    placeholder="e.g. Carbon Steel"
                    className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    Welding Process
                  </label>

                  <select
                    value={
                      weldInfo.weldingProcess
                    }
                    onChange={(e) =>
                      setWeldInfo({
                        ...weldInfo,
                        weldingProcess:
                          e.target.value,
                      })
                    }
                    className="w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="">
                      Select
                    </option>
                    <option>SMAW</option>
                    <option>GMAW</option>
                    <option>GTAW</option>
                    <option>FCAW</option>
                    <option>SAW</option>
                    <option>
                      Robotic Welding
                    </option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    Joint Type
                  </label>

                  <select
                    value={
                      weldInfo.jointType
                    }
                    onChange={(e) =>
                      setWeldInfo({
                        ...weldInfo,
                        jointType:
                          e.target.value,
                      })
                    }
                    className="w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="">
                      Select
                    </option>
                    <option>Butt Joint</option>
                    <option>Fillet Joint</option>
                    <option>Lap Joint</option>
                    <option>T-Joint</option>
                    <option>Corner Joint</option>
                    <option>Pipe Joint</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    Thickness
                  </label>

                  <div className="flex">

                    <input
                      value={
                        weldInfo.thickness
                      }
                      onChange={(e) =>
                        setWeldInfo({
                          ...weldInfo,
                          thickness:
                            e.target.value,
                        })
                      }
                      placeholder="e.g. 10"
                      className="min-w-0 flex-1 rounded-l-xl border px-4 py-3 outline-none focus:border-blue-500"
                    />

                    <div className="flex items-center rounded-r-xl border border-l-0 bg-slate-50 px-4 text-sm font-bold text-slate-500">
                      mm
                    </div>

                  </div>
                </div>

              </div>
            </section>

            {/* NDT METHOD */}

            <section className="rounded-2xl border bg-white p-5 shadow-sm">

              <h2 className="text-lg font-bold">
                NDT Method
              </h2>

              <p className="mb-4 text-sm text-slate-500">
                Select the NDT method for this inspection.
              </p>

              <div className="grid grid-cols-2 gap-2">

                {/* RT AVAILABLE */}

                <button
                  type="button"
                  onClick={() =>
                    setNdtMethod("RT")
                  }
                  className={`rounded-xl px-2 py-3 text-center transition ${
                    ndtMethod === "RT"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >

                  <div className="font-black">
                    RT
                  </div>

                  <div className="mt-1 text-[10px]">
                    Radiographic
                  </div>

                  <div className="mt-1 text-[9px] font-semibold">
                    Available
                  </div>

                </button>

                {/* UT COMING SOON */}

                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="UT inspection is coming soon"
                  className="relative cursor-not-allowed rounded-xl bg-slate-100 px-2 py-3 text-center text-slate-400 opacity-80"
                >

                  <div className="font-black">
                    UT
                  </div>

                  <div className="mt-1 text-[10px]">
                    Ultrasonic
                  </div>

                  <div className="mt-1 inline-block rounded-full bg-slate-200 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-500">
                    Coming Soon
                  </div>

                </button>

              </div>

            </section>

            {/* ANALYZE */}

            <button
              type="button"
              onClick={analyzeImage}
              disabled={
                !file || isAnalyzing
              }
              className="w-full rounded-2xl bg-blue-600 px-6 py-4 text-base font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              {isAnalyzing
                ? stageText ||
                  "Analyzing..."
                : "Analyze Radiograph"}
            </button>

            {/* PROGRESS */}

            {isAnalyzing && (
              <section className="rounded-2xl border bg-white p-5 shadow-sm">

                <div className="mb-4 text-sm font-bold text-blue-700">
                  AI Inspection in Progress
                </div>

                <div className="space-y-3">

                  {[
                    [
                      "reading",
                      "Reading image",
                    ],
                    [
                      "inspecting",
                      "Inspecting weld",
                    ],
                    [
                      "identifying",
                      "Identifying indications",
                    ],
                    [
                      "reporting",
                      "Preparing report",
                    ],
                  ].map(
                    ([key, label]) => {

                      const stages = [
                        "reading",
                        "inspecting",
                        "identifying",
                        "reporting",
                      ];

                      const currentIndex =
                        stages.indexOf(stage);

                      const itemIndex =
                        stages.indexOf(key);

                      const active =
                        itemIndex <=
                        currentIndex;

                      return (
                        <div
                          key={key}
                          className={`flex items-center gap-3 ${
                            active
                              ? "text-blue-700"
                              : "text-slate-400"
                          }`}
                        >

                          <div
                            className={`h-3 w-3 rounded-full ${
                              active
                                ? "bg-blue-600"
                                : "bg-slate-200"
                            }`}
                          />

                          <span className="text-sm font-semibold">
                            {label}
                          </span>

                        </div>
                      );
                    }
                  )}

                </div>
              </section>
            )}

            {/* NOTICE */}

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">

              <strong>
                Inspection Notice:
              </strong>{" "}

              WeldScan provides AI-assisted
              preliminary inspection. Results should
              be reviewed by a qualified NDT professional
              and must not be treated as certified
              inspection results or final code-compliance
              decisions.

            </div>

          </aside>

          {/* =========================
              RIGHT SIDE
          ========================= */}

          <section className="space-y-6">

            {/* DASHBOARD */}

            {result && (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">

                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                  <div className="text-xs font-bold uppercase text-slate-400">
                    Image Quality
                  </div>

                  <div className="mt-2 text-xl font-black">
                    {result.imageQuality ||
                      "Unclear"}
                  </div>
                </div>

                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                  <div className="text-xs font-bold uppercase text-slate-400">
                    Indications
                  </div>

                  <div className="mt-2 text-xl font-black">
                    {defects.length}
                  </div>
                </div>

                <div className="rounded-2xl border bg-white p-5 shadow-sm">

                  <div className="text-xs font-bold uppercase text-slate-400">
                    Highest Severity
                  </div>

                  <div
                    className={`mt-2 inline-flex rounded-lg border px-3 py-1 text-sm font-black ${severityClass(
                      highestSeverity
                    )}`}
                  >
                    {highestSeverity}
                  </div>

                </div>

                <div className="rounded-2xl border bg-white p-5 shadow-sm">

                  <div className="text-xs font-bold uppercase text-slate-400">
                    Status
                  </div>

                  <div className="mt-2 text-sm font-black">
                    {inspectionStatus}
                  </div>

                </div>

              </div>
            )}

            {/* VIEWER */}

            <section className="rounded-2xl border bg-white p-5 shadow-sm">

              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">

                <div>
                  <h2 className="text-xl font-black">
                    Radiograph Viewer
                  </h2>

                  <p className="text-sm text-slate-500">
                    {result
                      ? "AI-analyzed radiograph with defect location markers"
                      : "Original uploaded image"}
                  </p>
                </div>

                {previewUrl && (
                  <div className="flex items-center gap-2">

                    <button
                      type="button"
                      onClick={() =>
                        setViewMode(
                          "original"
                        )
                      }
                      className={`rounded-lg px-3 py-2 text-sm font-bold ${
                        viewMode === "original"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100"
                      }`}
                    >
                      Original
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setViewMode(
                          "enhanced"
                        )
                      }
                      className={`rounded-lg px-3 py-2 text-sm font-bold ${
                        viewMode === "enhanced"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100"
                      }`}
                    >
                      Enhanced
                    </button>

                  </div>
                )}

              </div>

              {!previewUrl ? (
                <div className="flex min-h-[500px] items-center justify-center rounded-2xl bg-slate-950 text-center text-slate-400">

                  <div>

                    <div className="text-5xl">
                      ◉
                    </div>

                    <div className="mt-4 font-bold">
                      Upload a radiograph to begin
                    </div>

                  </div>

                </div>
              ) : (
                <div className="overflow-auto rounded-2xl bg-black p-4">

                  <div className="relative mx-auto w-fit max-w-full">

                    <img
                      src={previewUrl}
                      alt="Weld radiograph"
                      style={{
                        width: `${zoom}%`,
                        maxWidth:
                          "none",
                        filter:
                          viewMode ===
                          "enhanced"
                            ? "contrast(1.35) brightness(1.08)"
                            : "none",
                      }}
                      className="block h-auto"
                    />

                    {result?.defects?.map(
                      (
                        defect,
                        index
                      ) => {

                        const c =
                          defect.coordinates;

                        if (!c) {
                          return null;
                        }

                        return (
                          <div
                            key={`marker-${index}`}
                            className="pointer-events-none absolute border-[3px] border-red-500 bg-red-500/10 shadow-[0_0_12px_rgba(239,68,68,0.9)]"
                            style={{
                              left: `${
                                c.x / 10
                              }%`,
                              top: `${
                                c.y / 10
                              }%`,
                              width: `${
                                c.width / 10
                              }%`,
                              height: `${
                                c.height / 10
                              }%`,
                            }}
                          >

                            <div className="absolute -top-8 left-0 whitespace-nowrap rounded-md bg-red-600 px-2 py-1 text-xs font-black text-white shadow-lg">

                              {index + 1}.{" "}

                              {defect.defectType ||
                                "Indication"}

                            </div>

                            <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)]" />

                          </div>
                        );
                      }
                    )}

                  </div>

                </div>
              )}

              {previewUrl && (
                <div className="mt-4 flex items-center justify-center gap-2">

                  <button
                    type="button"
                    onClick={() =>
                      setZoom(
                        Math.max(
                          50,
                          zoom - 10
                        )
                      )
                    }
                    className="rounded-lg border px-4 py-2 font-bold"
                  >
                    −
                  </button>

                  <div className="min-w-20 text-center text-sm font-bold">
                    {zoom}%
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setZoom(
                        Math.min(
                          200,
                          zoom + 10
                        )
                      )
                    }
                    className="rounded-lg border px-4 py-2 font-bold"
                  >
                    +
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setZoom(100)
                    }
                    className="rounded-lg border px-4 py-2 font-bold"
                  >
                    Fit
                  </button>

                </div>
              )}

            </section>

            {/* RESULTS */}

            {result && (
              <section className="rounded-2xl border bg-white p-6 shadow-sm">

                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">

                  <div>
                    <h2 className="text-2xl font-black">
                      Inspection Results
                    </h2>

                    <p className="text-sm text-slate-500">
                      AI-generated preliminary
                      radiographic assessment
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      generateReport
                    }
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700"
                  >
                    Generate Inspection Report
                  </button>

                </div>

                {/* OVERALL */}

                <div className="mb-6 rounded-2xl bg-blue-50 p-5">

                  <div className="text-xs font-black uppercase tracking-wide text-blue-700">
                    Overall Assessment
                  </div>

                  <p className="mt-2 font-semibold text-slate-800">
                    {result.overallAssessment ||
                      "No assessment provided."}
                  </p>

                </div>

                {/* SUMMARY */}

                <div className="mb-8">

                  <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Inspection Summary
                  </div>

                  <p className="mt-2 leading-7 text-slate-700">
                    {result.inspectionSummary ||
                      "No inspection summary provided."}
                  </p>

                </div>

                {/* DEFECTS */}

                <div>

                  <div className="mb-4 flex items-center justify-between">

                    <div>
                      <h3 className="text-lg font-black">
                        Detected Indications
                      </h3>

                      <p className="text-sm text-slate-500">
                        Red markers correspond to AI-provided
                        image coordinates.
                      </p>
                    </div>

                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                      {defects.length} indication
                      {defects.length === 1
                        ? ""
                        : "s"}
                    </div>

                  </div>

                  {defects.length === 0 ? (
                    <div className="rounded-2xl border border-green-200 bg-green-50 p-6">

                      <div className="text-lg font-black text-green-700">
                        No Clear Defect
                      </div>

                      <p className="mt-1 text-sm text-green-800">
                        No significant radiographic
                        indication was confidently
                        identified by the AI.
                      </p>

                    </div>
                  ) : (
                    <div className="space-y-5">

                      {defects.map(
                        (
                          defect,
                          index
                        ) => (
                          <article
                            key={index}
                            className="rounded-2xl border p-5"
                          >

                            <div className="flex flex-wrap items-start justify-between gap-4">

                              <div>

                                <div className="flex flex-wrap items-center gap-2">

                                  <span className="rounded-lg bg-red-50 px-3 py-1 text-sm font-black text-red-700">
                                    {index + 1}
                                  </span>

                                  <h4 className="text-lg font-black">
                                    {defect.defectType ||
                                      "Unclassified Indication"}
                                  </h4>

                                  {defect.coordinates && (
                                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                                      📍 Marked on image
                                    </span>
                                  )}

                                </div>

                                <p className="mt-2 text-sm text-slate-500">
                                  {defect.location ||
                                    "Location not specified"}
                                </p>

                              </div>

                              <div
                                className={`rounded-lg border px-3 py-1 text-sm font-black ${severityClass(
                                  defect.severity
                                )}`}
                              >
                                {defect.severity ||
                                  "Unclear"}
                              </div>

                            </div>

                            {/* CONFIDENCE */}

                            <div className="mt-5">

                              <div className="mb-2 flex justify-between text-xs font-bold">

                                <span>
                                  AI Confidence
                                </span>

                                <span>
                                  {defect.confidence ||
                                    "Unclear"}
                                </span>

                              </div>

                              <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                                <div
                                  className="h-full rounded-full bg-blue-600"
                                  style={{
                                    width:
                                      typeof defect.confidence ===
                                      "number"
                                        ? `${Math.max(
                                            0,
                                            Math.min(
                                              100,
                                              defect.confidence
                                            )
                                          )}%`
                                        : `${Math.max(
                                            0,
                                            Math.min(
                                              100,
                                              Number.parseFloat(
                                                String(
                                                  defect.confidence ||
                                                    "0"
                                                )
                                              ) || 0
                                            )
                                          )}%`,
                                  }}
                                />

                              </div>

                            </div>

                            <div className="mt-6 grid gap-4 md:grid-cols-2">

                              <div className="rounded-xl bg-slate-50 p-4">

                                <div className="text-xs font-black uppercase text-slate-400">
                                  Evidence
                                </div>

                                <p className="mt-2 text-sm leading-6">
                                  {defect.evidence ||
                                    "Not provided."}
                                </p>

                              </div>

                              <div className="rounded-xl bg-slate-50 p-4">

                                <div className="text-xs font-black uppercase text-slate-400">
                                  Description
                                </div>

                                <p className="mt-2 text-sm leading-6">
                                  {defect.description ||
                                    "Not provided."}
                                </p>

                              </div>

                              <div className="rounded-xl bg-slate-50 p-4">

                                <div className="text-xs font-black uppercase text-slate-400">
                                  Possible Cause
                                </div>

                                <p className="mt-2 text-sm leading-6">
                                  {defect.possibleCause ||
                                    "Not provided."}
                                </p>

                              </div>

                              <div className="rounded-xl bg-blue-50 p-4">

                                <div className="text-xs font-black uppercase text-blue-600">
                                  Recommended Remedy
                                </div>

                                <p className="mt-2 text-sm leading-6 text-blue-950">
                                  {defect.recommendedRemedy ||
                                    "Not provided."}
                                </p>

                              </div>

                              <div className="rounded-xl bg-green-50 p-4 md:col-span-2">

                                <div className="text-xs font-black uppercase text-green-700">
                                  Prevention
                                </div>

                                <p className="mt-2 text-sm leading-6 text-green-950">
                                  {defect.prevention ||
                                    "Not provided."}
                                </p>

                              </div>

                            </div>

                            {defect.coordinates && (
                              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-700">

                                <strong>
                                  AI Location Marker:
                                </strong>{" "}

                                x={
                                  defect.coordinates.x
                                }
                                , y={
                                  defect.coordinates.y
                                }
                                , width={
                                  defect.coordinates.width
                                }
                                , height={
                                  defect.coordinates.height
                                }

                              </div>
                            )}

                          </article>
                        )
                      )}

                    </div>
                  )}

                </div>

              </section>
            )}

            {/* EMPTY STATE */}

            {!result && previewUrl && (
              <section className="rounded-2xl border bg-white p-6 shadow-sm">

                <h2 className="text-lg font-bold">
                  Ready for Inspection
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Your radiograph is ready. Review the
                  image and weld information, then start
                  the AI-assisted inspection.
                </p>

                <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">

                  <strong>
                    Current Method:
                  </strong>{" "}
                  Radiographic Testing (RT)

                </div>

              </section>
            )}

          </section>

        </div>

        {/* FOOTER */}

        <footer className="mt-10 border-t pt-6 text-center text-xs leading-6 text-slate-400">

          WeldScan AI-assisted preliminary inspection.
          Results must be reviewed by a qualified NDT
          professional. This system does not provide
          certified inspection or final code-compliance
          decisions.

        </footer>

      </div>

    </main>
  );
}