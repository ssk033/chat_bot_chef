"use client";

import dynamic from "next/dynamic";

/** Deferred load so the floating guide does not inflate the initial document JS. */
export const SiteGuideAssistantRoot = dynamic(
  () => import("@/components/site-guide-assistant").then((m) => ({ default: m.SiteGuideAssistant })),
  { ssr: false },
);
