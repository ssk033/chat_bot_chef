"use client";

import { SurfaceCard } from "@/components/ui/card";

/** Showcase stub — keep visuals aligned with the design system if wired into a page later. */
export default function ThreeDCardDemo() {
  return (
    <SurfaceCard className="mx-auto max-w-md border-[var(--border-subtle)] p-8 text-center">
      <p className="text-xl font-semibold text-[var(--foreground)]">3D card demo</p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted-text)]">
        Placeholder panel using shared surface tokens.
      </p>
    </SurfaceCard>
  );
}
