// ピックルボールのアイコン(パドル + 穴あきボール)。currentColor で着色。

export function PickleballIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {/* パドルの面 */}
      <ellipse cx="8.6" cy="8" rx="6" ry="6.8" fill="currentColor" />
      {/* グリップ */}
      <rect x="6.8" y="13.4" width="3.6" height="8.2" rx="1.8" fill="currentColor" />
      {/* ボール(穴あき) */}
      <circle cx="18" cy="16.8" r="4.1" fill="currentColor" />
      <circle cx="16.7" cy="15.6" r="0.72" fill="#fff" />
      <circle cx="19.1" cy="15.9" r="0.72" fill="#fff" />
      <circle cx="17.6" cy="18.1" r="0.72" fill="#fff" />
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
      {/* パドルの面 */}
      <ellipse cx="9" cy="8.5" rx="5.8" ry="6.5" />
      {/* グリップ */}
      <path d="M9 15v6.2" />
      {/* ボール */}
      <circle cx="18" cy="17" r="2.4" />
    </svg>
  );
}
