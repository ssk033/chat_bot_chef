"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AppNavbar } from "@/components/app-navbar";
import { getStoredUser } from "@/lib/client-auth";

type PredictResult = {
  dish: string;
  confidence: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  demoMode?: boolean;
  backend?: "keras" | "foodx" | "clip";
  demoLowConfidence?: boolean;
  demoHint?: string;
  suppressedGuess?: string;
  clipLabelCount?: number;
};

export default function FoodTrackerPage() {
  const router = useRouter();
  const authorized = useSyncExternalStore(
    () => () => {},
    () => Boolean(getStoredUser()),
    () => false
  );
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictResult | null>(null);

  const [reviewRating, setReviewRating] = useState<number | null>(null);
  const [reviewCorrectedDish, setReviewCorrectedDish] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewThanks, setReviewThanks] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  useEffect(() => {
    if (!authorized) router.replace("/auth/login?next=/food-tracker");
  }, [authorized, router]);

  useEffect(() => {
    setReviewRating(null);
    setReviewCorrectedDish("");
    setReviewComment("");
    setReviewThanks(false);
    setReviewError(null);
    setReviewModalOpen(false);
  }, [result?.dish, result?.confidence, result?.demoLowConfidence, result?.backend]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const canSubmit = useMemo(() => Boolean(file) && !loading, [file, loading]);

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const fd = new FormData();
    fd.append("image", file);
    try {
      const res = await fetch("/api/food-ai/predict", { method: "POST", body: fd });
      const data = (await res.json()) as PredictResult & { error?: string; detail?: unknown; backend?: string };
      if (!res.ok) {
        let msg = parseApiError(data, res.status);
        if (/no model file at/i.test(msg)) {
          msg += `\n\n→ Quick placeholder: npm run food-ai:init-demo-model, then restart npm run food-ai:dev.`;
        }
        setError(msg);
        return;
      }
      const backend =
        data.backend === "foodx" || data.backend === "keras" || data.backend === "clip"
          ? data.backend
          : undefined;
      const ext = data as {
        demoLowConfidence?: boolean;
        demoHint?: string;
        suppressedGuess?: string;
        clipLabelCount?: number;
        backend?: string;
      };
      const bk =
        ext.backend === "foodx" || ext.backend === "keras" || ext.backend === "clip"
          ? ext.backend
          : backend;
      setResult({
        dish: data.dish,
        confidence: data.confidence,
        calories: data.calories,
        protein_g: data.protein_g,
        carbs_g: data.carbs_g,
        fats_g: data.fats_g,
        demoMode: Boolean((data as { demoMode?: boolean }).demoMode),
        backend: bk,
        demoLowConfidence: Boolean(ext.demoLowConfidence),
        demoHint: typeof ext.demoHint === "string" ? ext.demoHint : undefined,
        suppressedGuess: typeof ext.suppressedGuess === "string" ? ext.suppressedGuess : undefined,
        clipLabelCount: typeof ext.clipLabelCount === "number" ? ext.clipLabelCount : undefined,
      });
    } catch {
      setError("Network error while analyzing the image.");
    } finally {
      setLoading(false);
    }
  };

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--muted-text)]">
        Checking account…
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat dark:hidden"
        style={{ backgroundImage: "url('/food%20background%20light%20theme.png')" }}
      />
      <div
        className="pointer-events-none absolute inset-0 hidden bg-cover bg-center bg-no-repeat dark:block"
        style={{ backgroundImage: "url('/food%20backgorund.png')" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-white/35 dark:bg-black/50" />
      <AppNavbar />
      <main className="relative z-10 mx-auto w-full max-w-4xl px-4 py-10">
        <div className="theme-panel mb-6 rounded-2xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-3xl font-bold">Food Tracker</h1>
            <ModelStatusPill loading={loading} showError={Boolean(error)} />
          </div>
          <p className="mt-2 text-sm text-justify text-[var(--muted-text)]">
            Upload a clear photo of your plate. We show a dish name and rough calories, protein, carbs, and fat,
            useful for tracking and not as exact as weighing food.
          </p>
          <p className="mt-2 text-sm text-justify text-[var(--muted-text)]">
            The food AI runs when you tap analyze. It compares your picture to a list of dishes, picks the closest
            match, and fills nutrition from typical servings for that dish.
          </p>
          <p className="mt-2 text-sm text-justify text-[var(--muted-text)]">
            The vision side uses <strong>CNNs</strong> (<strong>convolutional neural networks</strong>), models that
            learn patterns in pixels for images. They are trained or fine-tuned on <strong>food photo datasets</strong>,
            with many labelled meal pictures paired with dish names. These often blend large public benchmarks with
            smaller cuisine-focused lists, including Indian plates or broader multi-class menus.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="theme-panel rounded-2xl p-5">
            <h2 className="mb-3 text-lg font-semibold">Upload image</h2>
            <input
              type="file"
              accept="image/*"
              className="w-full text-sm text-[var(--muted-text)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--user-bubble-bg)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--user-bubble-fg)]"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                setResult(null);
                setError(null);
              }}
            />
            {previewUrl ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border-subtle)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Preview" className="max-h-64 w-full object-contain" />
              </div>
            ) : null}
            <button
              type="button"
              disabled={!canSubmit}
              onClick={analyze}
              className="btn-solid mt-4 w-full rounded-lg bg-[var(--user-bubble-bg)] px-4 py-2 text-sm font-medium text-[var(--user-bubble-fg)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Analyzing…" : "Recognize dish & estimate nutrition"}
            </button>
            {error ? (
              <p className="mt-3 whitespace-pre-line text-justify rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                {error}
              </p>
            ) : null}
          </section>

          <section className="theme-panel rounded-2xl p-5">
            <h2 className="mb-3 text-lg font-semibold">Result</h2>
            {!result ? (
              <p className="text-sm text-justify text-[var(--muted-text)]">
                Results appear here after analysis.
              </p>
            ) : (
              <div className="space-y-4">
                {result.demoLowConfidence ? (
                  <p className="rounded-lg border border-red-400/45 bg-red-500/10 p-3 text-sm text-justify text-red-800 dark:text-red-200">
                    <strong>Not sure.</strong> This photo did not match strongly enough. Try a clearer, well lit shot with
                    the food in the centre.
                  </p>
                ) : null}
                {result.demoMode && !result.demoLowConfidence ? (
                  <p className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-justify text-amber-950 dark:text-amber-200">
                    Heads up: you are using a demo setup, so treat the dish name and nutrition as rough guides only.
                  </p>
                ) : null}
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--muted-text)]">Dish</p>
                  <p className="text-2xl font-bold">{result.dish}</p>
                  <ConfidenceMarker confidence={result.confidence} lowTrust={Boolean(result.demoLowConfidence)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Metric label="Calories" value={`${result.calories} kcal`} />
                  <Metric label="Protein" value={`${result.protein_g} g`} />
                  <Metric label="Carbs" value={`${result.carbs_g} g`} />
                  <Metric label="Fats" value={`${result.fats_g} g`} />
                </div>
                <p className="text-xs text-justify text-[var(--muted-text)]">
                  Nutrition is for a typical serving of that dish and is not measured from your exact portion.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setReviewModalOpen(true);
                    setReviewThanks(false);
                    setReviewError(null);
                  }}
                  className="btn-solid mt-4 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
                >
                  Review this result
                </button>
              </div>
            )}
          </section>
        </div>

        {reviewModalOpen && result ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="review-modal-title">
            <button
              type="button"
              className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
              aria-label="Close review"
              onClick={() => !reviewSubmitting && setReviewModalOpen(false)}
            />
            <div className="theme-panel relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6 shadow-xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <h2 id="review-modal-title" className="text-lg font-semibold">
                  Review this result
                </h2>
                <button
                  type="button"
                  disabled={reviewSubmitting}
                  onClick={() => setReviewModalOpen(false)}
                  className="rounded-lg px-2 py-1 text-sm text-[var(--muted-text)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] disabled:opacity-40"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <p className="mb-4 text-sm text-justify text-[var(--muted-text)]">
                If this guess felt wrong, tell us. Your note is saved to improve the food AI. Your photo is not stored.
              </p>
              <div className="space-y-4">
                <p className="text-sm text-[var(--foreground)]">
                  You were shown <span className="font-semibold">{result.dish}</span>.
                </p>
                <div>
                  <p className="mb-2 text-sm font-medium text-[var(--foreground)]">How accurate was this? (required)</p>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        [1, "Poor"],
                        [2, "Below average"],
                        [3, "OK"],
                        [4, "Good"],
                        [5, "Excellent"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        title={`${value}/5`}
                        onClick={() => {
                          setReviewRating(value);
                          setReviewThanks(false);
                          setReviewError(null);
                        }}
                        disabled={reviewSubmitting}
                        className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition hover:opacity-90 disabled:opacity-50 ${
                          reviewRating === value
                            ? "border-[var(--user-bubble-bg)] bg-[var(--user-bubble-bg)] text-[var(--user-bubble-fg)]"
                            : "border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--foreground)]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted-text)]">
                    Pick the option closest to how the prediction felt.
                  </p>
                </div>
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  What dish was it actually? <span className="font-normal text-[var(--muted-text)]">(optional)</span>
                  <input
                    type="text"
                    value={reviewCorrectedDish}
                    onChange={(e) => setReviewCorrectedDish(e.target.value)}
                    disabled={reviewSubmitting}
                    placeholder="e.g. masala dosa"
                    className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--input-border-focus)] focus:ring-2 focus:ring-[var(--ring-focus)] disabled:opacity-50"
                    maxLength={512}
                  />
                </label>
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Notes for our team <span className="font-normal text-[var(--muted-text)]">(optional)</span>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    disabled={reviewSubmitting}
                    rows={4}
                    placeholder="Lighting, multiple dishes on plate, wrong cuisine…"
                    className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--input-border-focus)] focus:ring-2 focus:ring-[var(--ring-focus)] disabled:opacity-50"
                    maxLength={4000}
                  />
                </label>
                <button
                  type="button"
                  disabled={reviewRating === null || reviewSubmitting}
                  onClick={async () => {
                    const account = getStoredUser();
                    if (!account?.email || !result || reviewRating === null) return;
                    setReviewSubmitting(true);
                    setReviewError(null);
                    try {
                      const res = await fetch("/api/food-tracker/reviews", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          reviewerEmail: account.email,
                          predictedDish: result.dish,
                          predictedConfidence: result.confidence,
                          backend: result.backend ?? undefined,
                          rating: reviewRating,
                          correctedDish: reviewCorrectedDish.trim() || undefined,
                          comment: reviewComment.trim() || undefined,
                          demoLowConfidence: Boolean(result.demoLowConfidence),
                        }),
                      });
                      const data = (await res.json()) as { error?: string };
                      if (!res.ok) {
                        setReviewError(data.error ?? "Could not save review.");
                        return;
                      }
                      setReviewThanks(true);
                    } catch {
                      setReviewError("Network error while sending review.");
                    } finally {
                      setReviewSubmitting(false);
                    }
                  }}
                  className="btn-solid w-full rounded-lg bg-[var(--user-bubble-bg)] px-4 py-2 text-sm font-medium text-[var(--user-bubble-fg)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {reviewSubmitting ? "Sending…" : "Submit feedback"}
                </button>
                {reviewError ? (
                  <p className="rounded-lg border border-red-400/45 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-200">
                    {reviewError}
                  </p>
                ) : null}
                {reviewThanks ? (
                  <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-900 dark:text-emerald-100">
                    Thanks, your feedback was saved. Close this window or analyse another photo.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function ModelStatusPill({ loading, showError }: { loading: boolean; showError: boolean }) {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/35 bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-950 dark:text-amber-100">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
        </span>
        Working on your photo…
      </span>
    );
  }
  if (showError) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-900 dark:text-red-100">
        <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden />
        Something went wrong
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-900 dark:text-emerald-100">
      <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
      Food AI ready
    </span>
  );
}

type ConfidenceTone = "high" | "mid" | "low";

function toneForConfidence(conf: number, lowTrust: boolean): ConfidenceTone {
  if (lowTrust) return "low";
  if (conf >= 0.8) return "high";
  if (conf >= 0.6) return "mid";
  return "low";
}

function ConfidenceMarker({ confidence, lowTrust }: { confidence: number; lowTrust: boolean }) {
  const pct = confidence * 100;
  const tone = toneForConfidence(confidence, lowTrust);
  const label =
    tone === "high" ? "High confidence" : tone === "mid" ? "Medium confidence" : "Low confidence";

  const styles =
    tone === "high"
      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-950 dark:border-emerald-500/35 dark:bg-emerald-950/30 dark:text-emerald-50"
      : tone === "mid"
        ? "border-amber-500/45 bg-amber-500/12 text-amber-950 dark:border-amber-500/35 dark:bg-amber-950/25 dark:text-amber-50"
        : "border-red-500/45 bg-red-500/12 text-red-900 dark:border-red-500/35 dark:bg-red-950/30 dark:text-red-50";

  const dot =
    tone === "high"
      ? "bg-emerald-500"
      : tone === "mid"
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <p
      className={`mt-2 inline-flex max-w-full flex-wrap items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm ${styles}`}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
      <span className="font-medium">{label}</span>
      <span className="opacity-90">({pct.toFixed(0)}% sure)</span>
    </p>
  );
}

function parseApiError(data: { error?: string; detail?: unknown }, status: number): string {
  if (typeof data.detail === "string") return data.detail;
  if (typeof data.error === "string") return data.error;
  if (Array.isArray(data.detail) && data.detail[0]?.msg) return String(data.detail[0].msg);
  return `Request failed (${status})`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3">
      <p className="text-xs text-[var(--muted-text)]">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
