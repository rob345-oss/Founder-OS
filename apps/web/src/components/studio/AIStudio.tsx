"use client";

import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import { STUDIO_AI_FEATURES } from "./nav";

export function AIStudio() {
  const [prompt, setPrompt] = useState(
    "Make me a 45-second Instagram Reel about protecting older adults from phone scams.",
  );

  return (
    <div className="space-y-8 px-8 py-8">
      <section className="studio-panel overflow-hidden">
        <div className="studio-subtle-grid border-b border-[var(--studio-border)] px-6 py-8">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--studio-accent)]">
              AI Assembly
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Describe the video you need</h2>
            <p className="mt-2 text-sm text-[var(--studio-text-secondary)]">
              Studio will search hooks, bodies, CTAs, and B-roll from your local library. Inference is not connected in
              this release.
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="min-h-[88px] flex-1 resize-y rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-4 py-3 text-sm text-[var(--studio-text-primary)]"
            />
            <button
              type="button"
              disabled
              title="AI assembly pipeline coming soon"
              className="inline-flex h-fit items-center justify-center gap-2 rounded-[var(--studio-radius-md)] bg-[var(--studio-accent)] px-5 py-3 text-sm font-medium text-white opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              Generate edit
            </button>
          </div>
        </div>
        <div className="grid gap-0 md:grid-cols-7">
          {["Search", "Hooks", "Bodies", "CTA", "B-roll", "Timeline", "Review"].map((step, i) => (
            <div
              key={step}
              className="border-t border-[var(--studio-border)] px-4 py-4 md:border-t-0 md:border-l md:first:border-l-0"
            >
              <p className="text-[10px] uppercase tracking-wider text-[var(--studio-text-tertiary)]">Step {i + 1}</p>
              <p className="mt-1 text-sm font-medium text-[var(--studio-text-primary)]">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {STUDIO_AI_FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <article
              key={feature.title}
              className="group rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5 transition-colors hover:border-[var(--studio-border-strong)]"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-3)] p-2 text-[var(--studio-accent)]">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-[var(--studio-text-primary)]">{feature.title}</h3>
                  <p className="mt-1 text-sm text-[var(--studio-text-secondary)]">{feature.description}</p>
                  <p className="mt-4 inline-flex items-center gap-1 text-xs text-[var(--studio-text-tertiary)]">
                    Preview interface{" "}
                    <ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="studio-panel p-6">
        <h3 className="text-sm font-medium text-[var(--studio-text-primary)]">Content multiplication</h3>
        <p className="mt-2 max-w-2xl text-sm text-[var(--studio-text-secondary)]">
          Future assemblies combine modular clips: for example 5 hooks × 4 bodies × 3 CTAs → 60 unique edits from the
          same footage library.
        </p>
        <div className="mt-6 flex flex-wrap gap-6 text-center">
          {[
            { label: "Hooks", value: "5" },
            { label: "Bodies", value: "4" },
            { label: "CTAs", value: "3" },
            { label: "Potential outputs", value: "60" },
          ].map((m) => (
            <div key={m.label}>
              <p className="text-3xl font-semibold tabular-nums text-[var(--studio-accent)]">{m.value}</p>
              <p className="mt-1 text-xs text-[var(--studio-text-tertiary)]">{m.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-[var(--studio-text-tertiary)]">Illustrative math only · not live inventory</p>
      </section>
    </div>
  );
}
