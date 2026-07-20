"use client";

import { useState } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** 候補(メンバー名など) */
  suggestions: string[];
  /** 候補から隠す名前(使用済みなど) */
  exclude?: string[];
  placeholder?: string;
  className?: string;
  onEnter?: () => void;
}

/**
 * 名前入力 + 自前の候補ドロップダウン。
 * HTML の datalist はスマホ(特に iOS Safari)や日本語IMEで候補が出ないことが
 * あるため使わない。欄にフォーカスした時点で全候補を表示し、タップで選択できる。
 */
export function NameSuggestInput({
  value,
  onChange,
  suggestions,
  exclude = [],
  placeholder,
  className,
  onEnter,
}: Props) {
  const [open, setOpen] = useState(false);

  const excludeSet = new Set(exclude.map((s) => s.trim()).filter(Boolean));
  const v = value.trim();
  // 件数上限は設けない(全登録メンバーから選べる。リストはスクロール)
  const list = suggestions
    .filter((s) => !excludeSet.has(s))
    .filter((s) => !v || s.toLowerCase().includes(v.toLowerCase()));
  // 入力値と完全一致の候補1件だけなら選択済みとみなして隠す
  const show = open && list.length > 0 && !(list.length === 1 && list[0] === v);

  return (
    <div className="relative min-w-0 flex-1">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        placeholder={placeholder}
        className={className}
      />
      {show && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-line bg-surface shadow-lg">
          {list.map((s) => {
            const pick = () => {
              onChange(s);
              setOpen(false);
            };
            return (
              <button
                key={s}
                type="button"
                // mousedown + preventDefault: 入力欄の blur より先に確定させる。
                // click はフォールバック(2回呼ばれても同値なので無害)
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick();
                }}
                onClick={pick}
                className="block w-full border-b border-line px-3.5 py-2.5 text-left text-sm font-bold last:border-none hover:bg-bg"
              >
                {s}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
