"use client";

import { cn } from "@/lib/utils";
import { IconUpload } from "@tabler/icons-react";
import { motion } from "motion/react";
import { useId, useRef, useState } from "react";
import type { Accept } from "react-dropzone";
import { useDropzone } from "react-dropzone";

const mainVariant = {
  initial: {
    x: 0,
    y: 0,
  },
  animate: {
    x: 20,
    y: -20,
    opacity: 0.9,
  },
};

const secondaryVariant = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
  },
};

const defaultAccept: Accept = { "image/*": [] };

export type FileUploadProps = {
  onChange?: (files: File[]) => void;
  /** Dropzone accept map; default accepts images only. */
  accept?: Accept;
  multiple?: boolean;
  className?: string;
};

export function FileUpload({ onChange, accept = defaultAccept, multiple = false, className }: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reactId = useId();
  const inputId = `${reactId}-file-upload-handle`;

  const handleFileChange = (newFiles: File[]) => {
    setFiles((prev) => (multiple ? [...prev, ...newFiles] : newFiles));
    onChange?.(newFiles);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const { getRootProps, isDragActive } = useDropzone({
    multiple,
    noClick: true,
    accept,
    onDrop: handleFileChange,
    onDropRejected: () => {},
  });

  return (
    <div className={cn("w-full", className)} {...getRootProps()}>
      <motion.div
        onClick={handleClick}
        whileHover="animate"
        className="group/file relative block w-full cursor-pointer overflow-hidden rounded-xl p-6 md:p-8"
      >
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          multiple={multiple}
          accept={accept ? Object.keys(accept).join(",") : undefined}
          onChange={(e) => handleFileChange(Array.from(e.target.files || []))}
          className="hidden"
        />
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]">
          <GridPattern />
        </div>
        <div className="relative z-20 flex w-full flex-col gap-4">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1 text-left">
              <p className="text-base font-semibold text-[var(--foreground)]">Upload photo</p>
              <p className="mt-1 max-w-md text-sm leading-snug text-[var(--muted-text)]">
                Drag and drop here or click to choose an image
              </p>
            </div>
            {files.length > 0 ? (
              <div className="flex shrink-0 flex-col items-end gap-1.5 self-end sm:self-start">
                {files.map((file, idx) => (
                  <CompactFileMeta key={`${file.name}-${file.lastModified}-${idx}`} file={file} />
                ))}
              </div>
            ) : null}
          </div>

          <div
            className={cn(
              "relative mx-auto flex w-full justify-center",
              files.length > 0 ? "mt-2 min-h-[5rem] pt-1" : "mt-6 min-h-[8rem] md:mt-8",
            )}
          >
            {!files.length ? (
              <motion.div
                layoutId="file-upload"
                variants={mainVariant}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                }}
                className={cn(
                  "relative z-40 flex h-32 w-full max-w-[8rem] items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_90%,transparent)] group-hover/file:shadow-xl dark:bg-[color-mix(in_srgb,var(--surface-muted)_55%,var(--surface)_45%)]",
                  "shadow-[0px_10px_40px_rgba(15,23,42,0.12)] dark:shadow-[0px_12px_36px_rgba(0,0,0,0.35)]",
                )}
              >
                {isDragActive ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-1 text-sm font-medium text-[var(--accent)]"
                  >
                    Drop it
                    <IconUpload className="h-5 w-5 text-[var(--accent)]" stroke={1.75} aria-hidden />
                  </motion.p>
                ) : (
                  <IconUpload className="h-5 w-5 text-[color-mix(in_srgb,var(--accent)_85%,var(--muted-text)_15%)]" stroke={1.75} aria-hidden />
                )}
              </motion.div>
            ) : (
              <div className="relative z-40 flex flex-col items-center gap-2 rounded-lg border border-dashed border-[color-mix(in_srgb,var(--accent)_35%,var(--border-subtle)_65%)] bg-[color-mix(in_srgb,var(--accent-muted)_22%,transparent)] px-6 py-4">
                <IconUpload className="h-5 w-5 text-[var(--accent)]" stroke={1.75} aria-hidden />
                <p className="text-center text-xs text-[var(--muted-text)]">Click or drop to replace image</p>
              </div>
            )}

            {!files.length ? (
              <motion.div
                variants={secondaryVariant}
                className="pointer-events-none absolute inset-0 z-30 mx-auto flex h-32 w-full max-w-[8rem] items-center justify-center rounded-lg border border-dashed border-[color-mix(in_srgb,var(--accent)_42%,var(--border-subtle)_58%)] bg-transparent opacity-0"
              />
            ) : null}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 512 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function shortMime(mime: string): string {
  if (!mime) return "image";
  const part = mime.split("/")[1];
  if (!part) return mime;
  return part.replace("+xml", "").toUpperCase().slice(0, 8);
}

function CompactFileMeta({ file }: { file: File }) {
  return (
    <div
      className={cn(
        "max-w-[min(100vw-3rem,17rem)] rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-2.5 py-2 shadow-sm ring-1 ring-black/[0.04]",
        "dark:bg-[color-mix(in_srgb,var(--surface-muted)_75%,var(--surface)_25%)] dark:ring-white/[0.06]",
      )}
    >
      <p className="truncate text-xs font-medium text-[var(--foreground)]" title={file.name}>
        {file.name}
      </p>
      <div className="mt-1 flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5 text-[11px] leading-tight text-[var(--muted-text)]">
        <span className="tabular-nums">{formatFileSize(file.size)}</span>
        <span className="rounded border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--accent-muted)_55%,transparent)] px-1 py-px font-medium text-[var(--foreground)]">
          {shortMime(file.type)}
        </span>
        <span className="tabular-nums opacity-90">{new Date(file.lastModified).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

export function GridPattern() {
  const columns = 41;
  const rows = 11;
  return (
    <div className="flex shrink-0 scale-105 flex-wrap items-center justify-center gap-px bg-[color-mix(in_srgb,var(--surface-muted)_72%,var(--surface)_28%)] dark:bg-[color-mix(in_srgb,var(--surface-muted)_40%,var(--surface)_60%)]">
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: columns }).map((_, col) => {
          const index = row * columns + col;
          const even = index % 2 === 0;
          return (
            <div
              key={`${col}-${row}`}
              className={cn(
                "flex h-10 w-10 shrink-0 rounded-[2px]",
                even
                  ? "bg-[color-mix(in_srgb,var(--surface-muted)_55%,var(--surface)_45%)] dark:bg-[color-mix(in_srgb,var(--surface)_35%,var(--surface-muted)_65%)]"
                  : "bg-[color-mix(in_srgb,var(--surface-muted)_55%,var(--surface)_45%)] shadow-[0px_0px_1px_2px_rgba(255,255,255,0.85)_inset] dark:bg-[color-mix(in_srgb,var(--surface)_35%,var(--surface-muted)_65%)] dark:shadow-[0px_0px_1px_2px_rgba(0,0,0,0.35)_inset]",
              )}
            />
          );
        }),
      )}
    </div>
  );
}
