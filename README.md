# Chennai Pickleball — Phase 1 (MVP)

チェンナイのピックルボールサークル運営アプリ。認証なし・モバイルファースト。

このリポジトリは仕様書 `pickleball-app-spec.md` の **Phase 1** を実装したものです。

## Phase 1 の実装範囲

- **メンバー登録(名前のみ)** — ログイン不要。端末の localStorage にIDを保存。別端末からは「一覧から選ぶ」で復帰
- **スケジュール・出欠管理**
  - 活動日の作成 / 編集 / 削除(アーカイブ=論理削除、復元可能）
  - 出欠 3択(参加 / 未定 / 不参加)ワンタップ + コメント
  - ホームの「次回の活動日」ヒーロー表示、リスト / カレンダー切り替え
  - 参加者リストのグループ表示、参加回数の集計
- **クイックスコアボード**(サイドアウト式・その場記録)
  - ラリーに勝った側をタップするだけ。サーブ権・サーバー番号・サイドアウトを自動判定
  - スコアコール常時表示(ダブルスは `7-5-2` 形式、開始は `0-0-2`)
  - 点数自由入力(7 / 11 / 15 / 任意)・2点差で終了・デュース続行
  - 現在のサーバーとサーブ位置(左/右)をハイライト、Undo、横画面対応
  - シングルス / ダブルス両対応。終了後に結果を保存可能
- **WhatsApp告知テキスト生成**
  - 活動日から告知テキストを自動生成 → `wa.me` でワンタップ共有 or コピー
  - 出欠の途中経過(参加者リスト)もテキスト化して共有

> 大会管理・コート情報・ルール学習は Phase 2 以降です(`大会`タブはプレースホルダ)。

## 技術構成

- Next.js 15(App Router)+ TypeScript + React 19
- Tailwind CSS(デザイントークンは仕様書 第10章に準拠)
- Supabase(PostgreSQL / Realtime 対応スキーマ)
- Vercel での公開を想定(無料枠運用)

---

## セットアップ手順

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Supabase プロジェクトを作成

1. [supabase.com](https://supabase.com) で無料プロジェクトを作成
2. ダッシュボードの **SQL Editor** を開き、`supabase/schema.sql` の内容を貼り付けて **Run**
   - テーブル(members / events / attendances / matches / audit_logs)、Realtime、RLSポリシーが一括で作成されます
3. **Project Settings > API** から以下をコピー
   - `Project URL`
   - `anon public` キー

### 3. 環境変数の設定

`.env.local.example` を `.env.local` にコピーして値を埋めます。

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> 未設定でもアプリは起動しますが、上部に警告バーが出てデータ保存はできません
> (スコアボードのその場利用のみ可能)。

### 4. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 を開く → 初回は表示名を登録して開始。

### 5. 本番ビルド

```bash
npm run build && npm start
```

---

## Vercel への公開

1. このリポジトリを GitHub に push
2. Vercel で Import
3. Environment Variables に `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_APP_URL`(本番URL)を設定
4. Deploy

> **運用上の注意:** 認証なし方式のため、アプリのURLは非公開でメンバーにのみ共有してください(仕様書 3.2)。
> Supabase 無料枠は1週間アクセスがないと一時停止するため、週1回以上の利用があれば問題ありません。

---

## ディレクトリ構成

```
src/
├─ app/
│  ├─ layout.tsx            ルートレイアウト(ナビ・メンバーゲート)
│  ├─ page.tsx              ホーム(次回活動日 + 出欠 + 最近の試合)
│  ├─ actions.ts            Server Actions(作成・更新・出欠・保存)
│  ├─ schedule/             予定一覧(リスト/カレンダー)
│  ├─ events/[id]/          活動日詳細・編集
│  ├─ events/new/           活動日作成
│  ├─ scoreboard/           スコアボード設定 → /play で全画面
│  ├─ more/                 メンバー一覧・プロフィール
│  └─ tournaments/          大会(Phase 3 プレースホルダ)
├─ components/              UIコンポーネント
└─ lib/
   ├─ scoring.ts            サイドアウト式スコアリングのエンジン
   ├─ whatsapp.ts           告知/参加者リストのテキスト生成
   ├─ data.ts               サーバー側の読み取りクエリ
   ├─ format.ts             日付・時刻フォーマット
   ├─ types.ts              ドメイン型
   └─ supabase/             Supabaseクライアント(server/browser)

supabase/schema.sql          DBスキーマ(SQL Editor で実行)
pickleball-app-handoff/      デザインモック(実装の見た目基準)
```

## スコアリング仕様(参考)

`src/lib/scoring.ts` に純粋関数として実装。サイドアウト式(伝統ルール):

- サーブ権を持つ側のみ得点。得点するとサーブは継続、サーブ位置が左右入れ替わる
- レシーブ側がラリーに勝つとフォルト → ダブルスは #1→#2、#2ならサイドアウト
- ダブルスは開始側が `0-0-2`(サーバー#2)から
- 設定点数に到達し2点差で終了。デュース時は2点差がつくまで続行
