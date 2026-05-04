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

  const file = files[0];

  return (
    <div className={cn("w-full", className)} {...getRootProps()}>
      <motion.div
        onClick={handleClick}
        whileHover="animate"
        className={cn(
          "group/file relative block w-full cursor-pointer overflow-hidden rounded-xl",
          file ? "p-4 md:p-5" : "p-6 md:p-8",
        )}
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

        {!file ? (
          <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]">
            <GridPattern />
          </div>
        ) : (
          <div
            className="pointer-events-none absolute inset-0 bg-[color-mix(in_srgb,var(--surface-muted)_35%,transparent)] dark:bg-[color-mix(in_srgb,var(--surface)_40%,transparent)]"
            aria-hidden
          />
        )}

        <div className="relative z-20 flex w-full flex-col">
          {!file ? (
            <>
              <div className="flex flex-col gap-4">
                <div className="text-left">
                  <p className="text-base font-semibold text-[var(--foreground)]">Upload photo</p>
                  <p className="mt-1 max-w-md text-sm leading-snug text-[var(--muted-text)]">
                    Drag and drop here or click to choose an image
                  </p>
                </div>

                <div className="relative mx-auto flex min-h-[8rem] w-full justify-center pt-2 md:mt-4 md:min-h-[9rem]">
                  <motion.div
                    layoutId="file-upload"
                    variants={mainVariant}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                    }}
                    className={cn(
                      "relative z-40 flex h-32 w-full max-w-[8rem] items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] group-hover/file:shadow-xl dark:bg-[color-mix(in_srgb,var(--surface-muted)_55%,var(--surface)_45%)]",
                      "shadow-[0px_10px_40px_color-mix(in_srgb,var(--foreground)_12%,transparent)]",
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

                  <motion.div
                    variants={secondaryVariant}
                    className="pointer-events-none absolute inset-x-0 top-2 z-30 mx-auto flex h-32 w-full max-w-[8rem] items-center justify-center rounded-lg border border-dashed border-[color-mix(in_srgb,var(--accent)_42%,var(--border)_58%)] bg-transparent opacity-0"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-3 rounded-xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-3 py-3 shadow-sm dark:bg-[color-mix(in_srgb,var(--surface-muted)_55%,var(--surface)_45%)]">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--accent)_14%,var(--surface-muted))] text-[var(--accent)] ring-1 ring-[var(--border-subtle)]">
                  <IconUpload className="h-5 w-5" stroke={1.75} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Photo selected</p>
                  <p className="mt-0.5 truncate text-xs text-[var(--foreground)]" title={file.name}>
                    {file.name}
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-[var(--muted-text)]">
                    {formatFileSize(file.size)}
                    <span className="mx-1 text-[var(--border)]">·</span>
                    {shortMime(file.type)}
                    <span className="mx-1 text-[var(--border)]">·</span>
                    <span className="tabular-nums">{new Date(file.lastModified).toLocaleDateString()}</span>
                  </p>
                </div>
              </div>
              <p className="text-center text-xs text-[var(--muted-text)]">Click this area to choose a different photo.</p>
            </div>
          )}
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
                  : "bg-[color-mix(in_srgb,var(--surface-muted)_55%,var(--surface)_45%)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--foreground)_06%,transparent)] dark:bg-[color-mix(in_srgb,var(--surface)_35%,var(--surface-muted)_65%)]",
              )}
            />
          );
        }),
      )}
    </div>
  );
}
