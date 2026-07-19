import type { DiagramKind } from "@/lib/rules-content";

// 色(デザイントークン)
const LINE = "#0A5C4A";
const KITCHEN = "#D8EC3F";
const NET = "#122B33";
const BALL = "#0E7C63";

const svgProps = {
  width: "100%",
  viewBox: "0 0 460 250",
  role: "img",
  className: "block",
} as const;

// 共通のコート枠(横向き・ネット中央)
function CourtBase({
  highlightKitchen = true,
  noVolleyLabel = false,
}: {
  highlightKitchen?: boolean;
  noVolleyLabel?: boolean;
}) {
  return (
    <g>
      {/* コート面 */}
      <rect x="10" y="20" width="440" height="200" fill="#F4F7F5" stroke={LINE} strokeWidth="3" />
      {/* キッチン(ノンボレーゾーン) */}
      {highlightKitchen && (
        <rect x="160" y="20" width="140" height="200" fill={KITCHEN} opacity="0.35" />
      )}
      {/* キッチンライン */}
      <line x1="160" y1="20" x2="160" y2="220" stroke={LINE} strokeWidth="2" />
      <line x1="300" y1="20" x2="300" y2="220" stroke={LINE} strokeWidth="2" />
      {/* センターライン(キッチン外のみ) */}
      <line x1="10" y1="120" x2="160" y2="120" stroke={LINE} strokeWidth="2" />
      <line x1="300" y1="120" x2="450" y2="120" stroke={LINE} strokeWidth="2" />
      {/* ネット */}
      <line x1="230" y1="14" x2="230" y2="226" stroke={NET} strokeWidth="4" strokeDasharray="6 5" />
      <text x="230" y="242" textAnchor="middle" fontSize="12" fontWeight="700" fill={NET}>
        ネット
      </text>
      {noVolleyLabel && (
        <>
          <text x="195" y="120" textAnchor="middle" fontSize="11" fontWeight="800" fill={LINE}>
            ボレー
          </text>
          <text x="195" y="134" textAnchor="middle" fontSize="11" fontWeight="800" fill={LINE}>
            禁止
          </text>
          <text x="265" y="120" textAnchor="middle" fontSize="11" fontWeight="800" fill={LINE}>
            ボレー
          </text>
          <text x="265" y="134" textAnchor="middle" fontSize="11" fontWeight="800" fill={LINE}>
            禁止
          </text>
        </>
      )}
    </g>
  );
}

function CourtLabeled() {
  return (
    <svg {...svgProps} aria-label="ピックルボールのコート図">
      <CourtBase />
      <text x="85" y="16" textAnchor="middle" fontSize="11" fill="#5F6E67">ベースライン</text>
      <text x="230" y="120" textAnchor="middle" fontSize="11" fontWeight="800" fill={LINE}>キッチン</text>
      <text x="85" y="120" textAnchor="middle" fontSize="10" fill="#5F6E67">サービスコート</text>
      <text x="375" y="120" textAnchor="middle" fontSize="10" fill="#5F6E67">サービスコート</text>
    </svg>
  );
}

function ServeDiagram() {
  return (
    <svg {...svgProps} aria-label="サーブの方向図">
      <CourtBase />
      {/* サーバー位置(右奥) */}
      <circle cx="435" cy="170" r="7" fill={BALL} />
      {/* 対角線のサーブ矢印 */}
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={BALL} />
        </marker>
      </defs>
      <line
        x1="425" y1="168" x2="80" y2="70"
        stroke={BALL} strokeWidth="3" strokeDasharray="7 5" markerEnd="url(#arrow)"
      />
      <text x="435" y="192" textAnchor="middle" fontSize="10" fontWeight="700" fill={BALL}>サーバー</text>
      <text x="70" y="60" textAnchor="middle" fontSize="10" fontWeight="700" fill={BALL}>対角へ</text>
    </svg>
  );
}

function KitchenDiagram() {
  return (
    <svg {...svgProps} aria-label="キッチン(ノンボレーゾーン)図">
      <CourtBase noVolleyLabel />
      <text x="85" y="120" textAnchor="middle" fontSize="10" fill="#5F6E67">ここは可</text>
      <text x="375" y="120" textAnchor="middle" fontSize="10" fill="#5F6E67">ここは可</text>
    </svg>
  );
}

function TwoBounceDiagram() {
  // 側面図: 地面線 + ネット + バウンドの弧
  return (
    <svg width="100%" viewBox="0 0 460 200" role="img" aria-label="ツーバウンドルール図" className="block">
      {/* 地面 */}
      <line x1="20" y1="150" x2="440" y2="150" stroke="#9AA8A2" strokeWidth="2" />
      {/* ネット */}
      <line x1="230" y1="70" x2="230" y2="150" stroke={NET} strokeWidth="4" />
      <text x="230" y="66" textAnchor="middle" fontSize="10" fill={NET}>ネット</text>
      {/* ① サーブの弧 (左→右奥, バウンド) */}
      <path d="M40,150 Q160,60 360,150" fill="none" stroke={BALL} strokeWidth="2.5" />
      <circle cx="360" cy="150" r="6" fill={BALL} />
      <text x="360" y="170" textAnchor="middle" fontSize="10" fontWeight="800" fill={BALL}>①</text>
      {/* ② 返球の弧 (右→左, バウンド) */}
      <path d="M360,150 Q240,70 100,150" fill="none" stroke="#E8A93C" strokeWidth="2.5" strokeDasharray="5 4" />
      <circle cx="100" cy="150" r="6" fill="#E8A93C" />
      <text x="100" y="170" textAnchor="middle" fontSize="10" fontWeight="800" fill="#9A6B14">②</text>
      {/* 説明 */}
      <text x="40" y="140" textAnchor="middle" fontSize="10" fill="#5F6E67">サーブ</text>
      <text x="230" y="192" textAnchor="middle" fontSize="10.5" fill="#5F6E67">
        ①②とも必ずワンバウンド → 3打目からボレー可
      </text>
    </svg>
  );
}

export function Diagram({ kind }: { kind: DiagramKind }) {
  switch (kind) {
    case "court":
      return <CourtLabeled />;
    case "serve":
      return <ServeDiagram />;
    case "kitchen":
      return <KitchenDiagram />;
    case "twobounce":
      return <TwoBounceDiagram />;
  }
}
