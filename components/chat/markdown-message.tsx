"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sanitizeAssistantDisplayText } from "@/lib/sanitize-chat-display";
import { cn } from "@/lib/utils";

type MarkdownMessageProps = {
  content: string;
  className?: string;
};

export function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  const text = sanitizeAssistantDisplayText(content);

  return (
    <div
      className={cn(
        "recipe-markdown min-w-0 max-w-[800px] break-words text-[15px] leading-[1.65] text-[var(--foreground)]",
        "[&_h1]:mb-3 [&_h1]:mt-4 [&_h1]:text-[22px] [&_h1]:font-bold [&_h1]:first:mt-0",
        "[&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-base [&_h2]:font-semibold",
        "[&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold",
        "[&_p]:mb-3 [&_p:last-child]:mb-0",
        "[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5",
        "[&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5",
        "[&_li]:break-words",
        "[&_hr]:my-5 [&_hr]:border-[var(--border)]",
        "[&_pre]:mb-4 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-[color-mix(in_srgb,var(--surface)_90%,var(--background))] [&_pre]:p-3 [&_pre]:text-sm",
        "[&_code]:break-words [&_code]:rounded [&_code]:bg-[color-mix(in_srgb,var(--surface)_90%,var(--background))] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
