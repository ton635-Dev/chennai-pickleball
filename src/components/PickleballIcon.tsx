// ピックルボールのアイコン(角丸長方形のパドル + 穴あきボール)。currentColor で着色。

export function PickleballIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {/* パドルの面(角丸長方形) */}
      <rect x="4.3" y="2.8" width="9.4" height="12" rx="2.8" fill="currentColor" />
      {/* グリップ */}
      <rect x="7.5" y="14" width="3" height="7.4" rx="1.5" fill="currentColor" />
      {/* ボール(穴あき) */}
      <circle cx="17.4" cy="17.2" r="3.6" fill="currentColor" />
      <circle cx="16.4" cy="16.1" r="0.66" fill="#fff" />
      <circle cx="18.4" cy="16.5" r="0.66" fill="#fff" />
      <circle cx="17.2" cy="18.3" r="0.66" fill="#fff" />
    </svg>
  );
}

/** 線画版(下部タブナビなど、他アイコンと線の太さを揃える用) */
export function PickleballLineIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* パドルの面(角丸長方形) */}
      <rect x="4.5" y="3" width="9" height="11.5" rx="2.6" />
      {/* グリップ */}
      <path d="M9 14.5V21.5" />
      {/* ボール */}
      <circle cx="17.5" cy="17.5" r="2.3" />
    </svg>
  );
}
