"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { IconPhotoScan } from "@tabler/icons-react";
import { FoodTrackerHistorySidebar } from "@/components/food-tracker/food-tracker-history-sidebar";
import { AppNavbar } from "@/components/app-navbar";
import { DashboardLoadingSkeleton } from "@/components/dashboard/dashboard-loading";
import { FileUpload } from "@/components/ui/file-upload";
import { SurfaceCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getStoredUser } from "@/lib/client-auth";
import { cn } from "@/lib/utils";
import {
  clearFoodTrackerHistory,
  fileToThumbnailDataUrl,
  loadFoodTrackerHistory,
  prependFoodTrackerHistory,
  removeFoodTrackerHistoryEntry,
  type FoodTrackerHistoryEntry,
} from "@/lib/food-tracker-history";

function subscribeHtmlDark(cb: () => void) {
  if (typeof document === "undefined") return () => {};
  const el = document.documentElement;
  const obs = new MutationObserver(cb);
  obs.observe(el, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}

function readHtmlIsDark(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}

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

  const [history, setHistory] = useState<FoodTrackerHistoryEntry[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [historyThumbUrl, setHistoryThumbUrl] = useState<string | null>(null);
  const isDark = useSyncExternalStore(subscribeHtmlDark, readHtmlIsDark, () => false);
  const [lightBgSrc, setLightBgSrc] = useState("/dashboard-bg-light.png");
  const [darkBgSrc, setDarkBgSrc] = useState("/dashboard-bg-dark.png");

  useEffect(() => {
    if (!authorized) router.replace("/auth/login?next=/food-tracker");
  }, [authorized, router]);

  useEffect(() => {
    setHistory(loadFoodTrackerHistory());
  }, []);

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

  const displayPreviewSrc = historyThumbUrl ?? previewUrl;

  const applyHistoryEntry = (entry: FoodTrackerHistoryEntry) => {
    setHistoryThumbUrl(entry.thumbDataUrl);
    setResult(entry.result);
    setFile(null);
    setError(null);
    setActiveHistoryId(entry.id);
  };

  const removeHistoryId = (id: string) => {
    setHistory((prev) => removeFoodTrackerHistoryEntry(prev, id));
    if (activeHistoryId === id) {
      setActiveHistoryId(null);
      setHistoryThumbUrl(null);
      setResult(null);
    }
  };

  const clearHistory = () => {
    setHistory(clearFoodTrackerHistory());
    setActiveHistoryId(null);
    setHistoryThumbUrl(null);
    setResult(null);
  };

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
      const nextResult: PredictResult = {
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
      };
      setResult(nextResult);

      void fileToThumbnailDataUrl(file)
        .then((thumb) => {
          const entry: FoodTrackerHistoryEntry = {
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            thumbDataUrl: thumb,
            filename: file.name,
            result: nextResult,
          };
          setHistory((prev) => prependFoodTrackerHistory(prev, entry));
          setActiveHistoryId(entry.id);
        })
        .catch(() => {});
    } catch {
      setError("Network error while analyzing the image.");
    } finally {
      setLoading(false);
    }
  };

  if (!authorized) {
    return <DashboardLoadingSkeleton />;
  }

  return (
    <div className="relative min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Match dashboard: next/image layers + scrim from `--background` (not `--foreground`, which washed dark mode white). */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden suppressHydrationWarning>
        <Image
          alt=""
          src={lightBgSrc}
          fill
          sizes="100vw"
          quality={90}
          className={cn(
            "object-cover object-center transition-opacity duration-300",
            isDark ? "opacity-0" : "opacity-[0.52]"
          )}
          onError={() => setLightBgSrc("/food%20background%20light%20theme.png")}
          priority={false}
        />
        <Image
          alt=""
          src={darkBgSrc}
          fill
          sizes="100vw"
          quality={90}
          className={cn(
            "object-cover object-center transition-opacity duration-300",
            isDark ? "opacity-[0.52]" : "opacity-0"
          )}
          onError={() => setDarkBgSrc("/food%20backgorund%20dark%20theme.png")}
          priority={false}
        />
      </div>
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-[1]",
          isDark
            ? "bg-[color-mix(in_srgb,var(--background)_54%,transparent)]"
            : "bg-[color-mix(in_srgb,var(--background)_48%,transparent)]"
        )}
        aria-hidden
      />
      <AppNavbar />
      <main className="relative z-10 mx-auto w-full max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-8">
          <div className="min-w-0 flex-1 space-y-8">
        <SurfaceCard className="border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-6 backdrop-blur-md md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">Food Tracker</h1>
            <ModelStatusPill loading={loading} showError={Boolean(error)} />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted-text)]">
            Upload a clear photo of your plate. We show a dish name and rough calories, protein, carbs, and fat,
            useful for tracking and not as exact as weighing food.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted-text)]">
            The food AI runs when you tap analyze. It compares your picture to a list of dishes, picks the closest
            match, and fills nutrition from typical servings for that dish.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted-text)]">
            The vision side uses <strong className="font-medium text-[var(--foreground)]">CNNs</strong> (
            <strong className="font-medium text-[var(--foreground)]">convolutional neural networks</strong>), models that
            learn patterns in pixels for images. They are trained or fine-tuned on{" "}
            <strong className="font-medium text-[var(--foreground)]">food photo datasets</strong>,
            with many labelled meal pictures paired with dish names. These often blend large public benchmarks with
            smaller cuisine-focused lists, including Indian plates or broader multi-class menus.
          </p>
        </SurfaceCard>

        <div id="food-tracker-upload-section" className="grid grid-cols-1 gap-6 md:grid-cols-2 scroll-mt-24">
          <SurfaceCard className="flex min-h-[400px] flex-col border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-6 backdrop-blur-md md:min-h-[440px]">
            <h2 className="mb-4 text-lg font-medium text-[var(--foreground)]">Upload image</h2>
            <div className="flex flex-1 flex-col gap-4">
              <div className="overflow-hidden rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface-muted)] ring-1 ring-[var(--border-subtle)]">
                <FileUpload
                  accept={{ "image/*": [] }}
                  multiple={false}
                  onChange={(files) => {
                    const f = files[0] ?? null;
                    setHistoryThumbUrl(null);
                    setActiveHistoryId(null);
                    setFile(f);
                    setResult(null);
                    setError(null);
                  }}
                />
              </div>
              {displayPreviewSrc ? (
                <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] ring-1 ring-[var(--border-subtle)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={displayPreviewSrc} alt="Preview" className="max-h-64 w-full object-contain" />
                </div>
              ) : null}
              <Button
                type="button"
                disabled={!canSubmit}
                onClick={analyze}
                variant="primary"
                className="mt-auto w-full py-3 text-sm shadow-sm"
              >
                {loading ? "Analyzing…" : "Recognize dish & estimate nutrition"}
              </Button>
              {error ? (
                <p className="mt-1 whitespace-pre-line rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 text-sm leading-relaxed text-[var(--foreground)]">
                  {error}
                </p>
              ) : null}
            </div>
          </SurfaceCard>

          <SurfaceCard className="flex min-h-[400px] flex-col border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-6 backdrop-blur-md md:min-h-[440px]">
            <h2 className="mb-4 text-lg font-medium text-[var(--foreground)]">Result</h2>
            {loading ? (
              <FoodTrackerResultSkeleton />
            ) : !result ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 py-8 text-center">
                <IconPhotoScan className="h-11 w-11 text-[var(--muted-text)] opacity-45" stroke={1.25} aria-hidden />
                <h3 className="text-sm font-semibold text-[var(--foreground)]">No data yet</h3>
                <p className="max-w-xs text-sm leading-relaxed text-[var(--muted-text)]">
                  Upload a clear plate photo and tap analyse to see dish name, confidence, and estimated macros.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-1"
                  onClick={() => document.getElementById("food-tracker-upload-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                >
                  Upload a photo
                </Button>
              </div>
            ) : (
              <div className="flex flex-1 flex-col gap-4">
                {result.demoLowConfidence ? (
                  <p className="rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--foreground)_06%,var(--surface-muted))] p-3 text-sm leading-relaxed text-[var(--foreground)]">
                    <strong className="font-medium">Not sure.</strong> This photo did not match strongly enough. Try a clearer, well lit shot with
                    the food in the centre.
                  </p>
                ) : null}
                {result.demoMode && !result.demoLowConfidence ? (
                  <p className="rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--accent)_08%,var(--surface-muted))] p-3 text-sm leading-relaxed text-[var(--muted-text)]">
                    Heads up: you are using a demo setup, so treat the dish name and nutrition as rough guides only.
                  </p>
                ) : null}
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-text)]">Dish</p>
                  <p className="text-lg font-semibold text-[var(--foreground)]">{result.dish}</p>
                  <ConfidenceMarker confidence={result.confidence} lowTrust={Boolean(result.demoLowConfidence)} />
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 shadow-sm transition-all duration-200 hover:border-[color-mix(in_srgb,var(--accent)_22%,var(--border-subtle))] hover:shadow-md motion-safe:hover:scale-[1.01]">
                  <p className="text-xs font-medium text-[var(--muted-text)]">Calories</p>
                  <p className="text-lg font-semibold tracking-tight text-[var(--foreground)]">{result.calories} kcal</p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <MacroStat label="Protein" value={`${result.protein_g} g`} />
                  <MacroStat label="Carbs" value={`${result.carbs_g} g`} />
                  <MacroStat label="Fats" value={`${result.fats_g} g`} />
                </div>
                <p className="text-xs leading-relaxed text-[var(--muted-text)]">
                  Nutrition is for a typical serving of that dish and is not measured from your exact portion.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setReviewModalOpen(true);
                    setReviewThanks(false);
                    setReviewError(null);
                  }}
                  className="mt-auto w-full py-3 text-sm"
                >
                  Review this result
                </Button>
              </div>
            )}
          </SurfaceCard>
        </div>

        {reviewModalOpen && result ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="review-modal-title">
            <button
              type="button"
              className="absolute inset-0 bg-[color-mix(in_srgb,var(--foreground)_42%,transparent)] backdrop-blur-[1px] transition-opacity duration-200"
              aria-label="Close review"
              onClick={() => !reviewSubmitting && setReviewModalOpen(false)}
            />
            <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-xl transition-all duration-200">
              <div className="mb-4 flex items-start justify-between gap-3">
                <h2 id="review-modal-title" className="text-lg font-medium text-[var(--foreground)]">
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
                        className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-200 hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] ${
                          reviewRating === value
                            ? "border-[color-mix(in_srgb,var(--accent)_45%,var(--border-subtle))] bg-[var(--accent)] text-[var(--foreground)]"
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
                    className={cn(inputClass, "mt-1")}
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
                    className={cn(inputClass, "mt-1 resize-y min-h-[88px]")}
                    maxLength={4000}
                  />
                </label>
                <Button
                  type="button"
                  variant="primary"
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
                  className="w-full py-2.5 text-sm shadow-sm"
                >
                  {reviewSubmitting ? "Sending…" : "Submit feedback"}
                </Button>
                {reviewError ? (
                  <p className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 text-sm leading-relaxed text-[var(--foreground)]">
                    {reviewError}
                  </p>
                ) : null}
                {reviewThanks ? (
                  <p className="rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-muted))] p-3 text-sm leading-relaxed text-[var(--muted-text)]">
                    Thanks, your feedback was saved. Close this window or analyse another photo.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
          </div>

          <FoodTrackerHistorySidebar
            className="w-full shrink-0 lg:w-[300px] lg:sticky lg:top-24 lg:self-start"
            entries={history}
            activeId={activeHistoryId}
            onSelect={applyHistoryEntry}
            onRemove={removeHistoryId}
            onClear={clearHistory}
          />
        </div>
      </main>
    </div>
  );
}

function FoodTrackerResultSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4" aria-busy="true" aria-label="Loading food tracker result">
      <div className="space-y-2">
        <Skeleton className="h-3 w-16 rounded-md" />
        <Skeleton className="h-7 w-[85%] max-w-sm rounded-lg" />
        <Skeleton className="h-6 w-32 rounded-md" />
      </div>
      <Skeleton className="h-[4.5rem] w-full rounded-xl" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-[4.25rem] rounded-xl" />
        <Skeleton className="h-[4.25rem] rounded-xl" />
        <Skeleton className="h-[4.25rem] rounded-xl" />
      </div>
      <Skeleton className="mt-auto h-11 w-full rounded-xl" />
    </div>
  );
}

function MacroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 shadow-sm transition-all duration-200 hover:border-[color-mix(in_srgb,var(--accent)_22%,var(--border-subtle))] hover:shadow-md motion-safe:hover:scale-[1.01]">
      <p className="text-xs font-medium text-[var(--muted-text)]">{label}</p>
      <p className="text-sm font-semibold tracking-tight text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function ModelStatusPill({ loading, showError }: { loading: boolean; showError: boolean }) {
  const shell =
    "inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs font-medium transition-all duration-200";
  if (loading) {
    return (
      <span className={`${shell} animate-pulse bg-[var(--surface-muted)] text-[var(--muted-text)]`}>
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color-mix(in_srgb,var(--accent)_55%,var(--muted-text)_45%)] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
        </span>
        Working on your photo…
      </span>
    );
  }
  if (showError) {
    return (
      <span className={`${shell} bg-[color-mix(in_srgb,var(--foreground)_08%,var(--surface-muted))] text-[var(--foreground)]`}>
        <span className="h-2 w-2 rounded-full bg-[var(--muted-text)]" aria-hidden />
        Something went wrong
      </span>
    );
  }
  return (
    <span className={`${shell} bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-muted))] text-[var(--muted-text)]`}>
      <span className="h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden />
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

  const toneText = tone === "low" ? "text-[var(--muted-text)]" : "text-[var(--foreground)]";

  const dot =
    tone === "high"
      ? "bg-[var(--accent)]"
      : tone === "mid"
        ? "bg-[color-mix(in_srgb,var(--accent)_72%,var(--muted-text)_28%)]"
        : "bg-[var(--muted-text)]";

  return (
    <span
      role="status"
      className={`mt-2 inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-2 py-1 text-xs ${toneText}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />
      <span className="font-medium">{label}</span>
      <span className="opacity-90">({pct.toFixed(0)}% sure)</span>
    </span>
  );
}

function parseApiError(data: { error?: string; detail?: unknown }, status: number): string {
  if (typeof data.detail === "string") return data.detail;
  if (typeof data.error === "string") return data.error;
  if (Array.isArray(data.detail) && data.detail[0]?.msg) return String(data.detail[0].msg);
  return `Request failed (${status})`;
}
