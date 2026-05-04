"use client";

import { FileUpload } from "@/components/ui/file-upload";
import { useState } from "react";

export default function FileUploadDemo() {
  const [files, setFiles] = useState<File[]>([]);
  const handleFileUpload = (next: File[]) => {
    setFiles(next);
  };

  return (
    <div className="mx-auto min-h-96 w-full max-w-4xl rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--border)_85%,var(--accent)_15%)] bg-[color-mix(in_srgb,var(--surface)_82%,transparent)] shadow-[0_12px_36px_-14px_rgba(15,23,42,0.14)] ring-1 ring-black/[0.04] backdrop-blur-md dark:bg-[color-mix(in_srgb,var(--surface)_78%,transparent)] dark:shadow-[0_14px_40px_-12px_rgba(0,0,0,0.45)] dark:ring-white/[0.06]">
      <FileUpload onChange={handleFileUpload} />
      {files.length > 0 ? (
        <p className="border-t border-[var(--border)] px-6 py-3 text-center text-xs text-[var(--muted-text)]">
          {files.length} file{files.length === 1 ? "" : "s"} selected (demo).
        </p>
      ) : null}
    </div>
  );
}
