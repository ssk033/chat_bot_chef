"use client";

import { FileUpload } from "@/components/ui/file-upload";
import { SurfaceCard } from "@/components/ui/card";

/** Demo only — not linked from production routes. */
export function FileUploadDemo() {
  return (
    <SurfaceCard className="mx-auto min-h-96 w-full max-w-4xl border-dashed border-[color-mix(in_srgb,var(--border-subtle)_88%,var(--accent)_12%)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] backdrop-blur-md">
      <FileUpload />
    </SurfaceCard>
  );
}
