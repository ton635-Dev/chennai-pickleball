// コミュニティごとのブランディング設定。
// 同じリポジトリを別コミュニティ用にデプロイするときは、
// Vercel の環境変数(NEXT_PUBLIC_*)で上書きする。未設定ならチェンナイ版。
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Chennai Pickleball";

export const APP_SHORT_NAME =
  process.env.NEXT_PUBLIC_APP_SHORT_NAME || "Pickleball";

export const APP_DESCRIPTION =
  process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
  "チェンナイ ピックルボールサークルの活動管理アプリ";

/** App Hub 計測ビーコンのアプリ識別子 */
export const BEACON_APP_ID =
  process.env.NEXT_PUBLIC_BEACON_APP || "chennai-pickleball";

/** Googleカレンダー登録に使うタイムゾーン(端末設定に依存させない) */
export const CALENDAR_TZ = process.env.NEXT_PUBLIC_CALENDAR_TZ || "Asia/Kolkata";

/**
 * アプリアイコンのテーマ。"pink" を指定するとピンク背景のアイコン一式
 * (icon-*-pink.png)を使う。ホーム画面で見分けるためのもので、既定は緑。
 * 新しい色を増やすときは scripts/gen-pink-icons.cjs を参考に生成する。
 */
export const ICON_SUFFIX =
  process.env.NEXT_PUBLIC_ICON_THEME === "pink" ? "-pink" : "";
