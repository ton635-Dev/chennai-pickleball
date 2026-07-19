"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CHAPTERS } from "@/lib/rules-content";
import { loadProgress, type RulesProgress } from "@/lib/rules-progress";

export function RulesIndex() {
  const [progress, setProgress] = useState<RulesProgress>({});

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const doneCount = CHAPTERS.filter((c) => progress[c.slug]?.completed).length;
  const pct = Math.round((doneCount / CHAPTERS.length) * 100);

  return (
    <div className="mx-auto w-full max-w-2xl pt-1">
      <h1 className="text-[22px] font-extrabold">ルールを学ぶ</h1>
      <p className="mt-1 text-xs text-muted">
        初心者向けに7章で基本ルールをマスター。各章の最後にクイズがあります。
      </p>

      {/* 早見表 */}
      <Link
        href="/rules/quick"
        className="mt-4 flex items-center gap-3 rounded-card bg-navy p-4 text-white"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-xl text-navy">
          ⚡
        </span>
        <div className="flex-1">
          <b className="block text-[15px]">ルール早見表</b>
          <span className="text-xs opacity-75">試合中にサッと確認したいときはこちら</span>
        </div>
        <span className="text-lg opacity-60">›</span>
      </Link>

      {/* 進捗 */}
      <div className="mt-4 rounded-card border border-line bg-surface p-4">
        <div className="mb-2 flex justify-between text-[13px] font-extrabold">
          学習の進み具合
          <span className="font-normal text-muted">
            {doneCount} / {CHAPTERS.length} 章 完了
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded bg-[#EDF1EF]">
          <div
            className="h-full rounded bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* 章一覧 */}
      <div className="mt-4 space-y-2.5">
        {CHAPTERS.map((c) => {
          const p = progress[c.slug];
          const done = p?.completed;
          const perfect = p?.perfect;
          return (
            <Link
              key={c.slug}
              href={`/rules/${c.slug}`}
              className="flex items-center gap-3 rounded-card border border-line bg-surface p-3.5"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[15px] font-extrabold ${
                  done ? "bg-primary text-white" : "bg-[#EDF4F1] text-primary-dark"
                }`}
              >
                {done ? "✓" : c.no}
              </span>
              <div className="flex-1">
                <b className="block text-sm">
                  {c.no}. {c.title}
                </b>
                <span className="text-[11px] text-muted">{c.subtitle}</span>
              </div>
              {perfect ? (
                <span className="shrink-0 rounded-pill bg-accent px-2.5 py-1 text-[11px] font-extrabold text-navy">
                  クイズ満点!
                </span>
              ) : done ? (
                <span className="shrink-0 text-[11px] font-extrabold text-primary-dark">
                  完了
                </span>
              ) : (
                <span className="shrink-0 text-[11px] font-bold text-muted">未学習</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
