"use client";

import { type ReactNode, useRef } from "react";

import { useWhyUs } from "@/lib/animations/use-why-us";

/*
  The scroll run of A3: the only client part of the section. It holds the ref and runs the motion
  (src/lib/animations/use-why-us.ts); the markup inside comes rendered from the server.
*/
export function WhyUsRun({ className, children }: { className?: string; children: ReactNode }) {
  const run = useRef<HTMLDivElement>(null);
  useWhyUs(run);

  return (
    <div ref={run} className={className} data-run data-state="pending">
      {children}
    </div>
  );
}
