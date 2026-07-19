import Link from "next/link";

const QUICK: { icon: string; title: string; points: string[] }[] = [
  {
    icon: "🎾",
    title: "サーブ",
    points: [
      "アンダーハンド・腰より下で打つ",
      "ベースライン後方から対角のサービスコートへ",
      "キッチン(ライン含む)はフォルト",
      "サーブは1回のみ・ネットインも有効",
    ],
  },
  {
    icon: "②",
    title: "ツーバウンド",
    points: [
      "サーブ→レシーブは必ずワンバウンド",
      "その返球もワンバウンド(最初の2打)",
      "3打目からノーバウンド(ボレー)可",
    ],
  },
  {
    icon: "🚫",
    title: "キッチン(ノンボレーゾーン)",
    points: [
      "ゾーン内でボレー(ノーバウンド)は禁止",
      "ラインを踏んでのボレーもフォルト",
      "勢いでゾーンに入ってもフォルト",
      "ワンバウンド後なら入って打ってOK",
    ],
  },
  {
    icon: "🔢",
    title: "スコア",
    points: [
      "サーブ側のみ得点・11点先取2点差",
      "コールは 自分-相手-サーバー番号",
      "開始は 0-0-2(ダブルス)",
      "得点したらサーブは左右入れ替え",
    ],
  },
  {
    icon: "⚠️",
    title: "よくあるフォルト",
    points: [
      "自陣で2バウンド",
      "ネットに体・パドルが触れる",
      "アウト(ラインは基本イン)",
      "早すぎるボレー(ツーバウンド違反)",
    ],
  },
];

export default function QuickReferencePage() {
  return (
    <div className="mx-auto w-full max-w-2xl pt-1">
      <div className="mb-3 flex items-center gap-3">
        <Link
          href="/rules"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-lg"
        >
          ‹
        </Link>
        <h1 className="text-lg font-extrabold">ルール早見表</h1>
      </div>
      <p className="mb-4 text-xs text-muted">
        試合中にサッと確認できる要点まとめ。
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {QUICK.map((g) => (
          <div key={g.title} className="card p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EDF4F1] text-base">
                {g.icon}
              </span>
              <b className="text-[15px]">{g.title}</b>
            </div>
            <ul className="space-y-1.5">
              {g.points.map((p, i) => (
                <li key={i} className="flex gap-2 text-[13px] leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <Link
        href="/rules"
        className="btn-pill mt-4 block bg-primary py-3 text-center text-[15px] text-white"
      >
        章ごとに詳しく学ぶ
      </Link>
    </div>
  );
}
