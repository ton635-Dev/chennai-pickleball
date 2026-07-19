// ルール学習の進捗(端末ローカル・localStorage)

const KEY = "cpb.rules";

export interface ChapterProgress {
  completed: boolean; // クイズを1回でも通過(全問正解)したか
  perfect: boolean; // 全問正解でバッジ
}

export type RulesProgress = Record<string, ChapterProgress>;

export function loadProgress(): RulesProgress {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RulesProgress) : {};
  } catch {
    return {};
  }
}

export function markChapter(slug: string, perfect: boolean): RulesProgress {
  const p = loadProgress();
  const prev = p[slug] ?? { completed: false, perfect: false };
  p[slug] = {
    completed: true,
    perfect: prev.perfect || perfect,
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* noop */
  }
  return p;
}
