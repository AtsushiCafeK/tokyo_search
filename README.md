# 東京都+全市区町村 行政情報 横断検索

東京都および全市区町村（23区・26市・町村）の公式行政サイトを  
Google Programmable Search Engine (CSE) で一括横断検索できるWebサービス。

## 現在の機能
- 東京都内の都市区町村の公式サイトの横断検索
- メールけいしちょうDB OPEN DATAの閲覧、市区町村別の集計など
- 電車遅延情報（`/trains`）— 東京圏のJR・地下鉄・私鉄の運行/遅延状況を路線別に表示（公共交通オープンデータセンター ODPT を利用）


## 技術スタック

- **Next.js 16** (App Router) + React 19 + TypeScript 5
- **Tailwind CSS 4** + shadcn/ui
- **Google CSE** — 検索ウィジェット埋め込み
- **静的エクスポート** (`output: 'export'`) — さくらインターネット レンタルサーバーへFTPデプロイ

---

## ローカル開発

```bash
npm install
npm run dev
```

`.env.local` に Google CSE の ID を設定してください。検索エンジンの設定で使います。Googleプログラム可能な検索エンジン: https://programmablesearchengine.google.com/intl/ja_jp/about/ このサイトで検索範囲などを設定しています。

```env
NEXT_PUBLIC_GOOGLE_CX=your_cse_id_here
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いて確認します。

---

## ビルド & デプロイ

```bash
npm run build   # /out に静的ファイルを生成
```

`/out` の中身を FTP でさくらサーバーの公開ディレクトリへアップロードします。  
デプロイ先: `/home/hazimeru/www/tokyo_search/`

---

## 警視庁メールデータの自動更新

### 仕組み

さくらサーバー上の cron が毎日自動実行し、公開ディレクトリの JSON を直接更新します。

```
【さくらサーバー cron】毎日 6:05 自動実行
  警視庁オープンデータAPI → CSV取得 → JSONマージ → 公開ディレクトリ直接更新
```

### データソース

警視庁「メールけいしちょう」オープンデータ  
https://mail.keishicho.metro.tokyo.lg.jp/opendata/

取得パラメータ: `format=csv`, `sdate=YYYYMMDD`, `edate=YYYYMMDD`

### 蓄積設計

- `data/mail_keishicho.json` を蓄積マスターとして使用
- 新規CSVを毎日マージ（`send_at` + `subject` をキーに重複除去）
- 過去データは削除せず積み上げ方式（ソース側でデータが消えても履歴を保持）

---

## サーバー構成

### リポジトリ構成

```
tokyo_search/
├── src/
│   ├── app/                        # Next.js App Router ページ
│   ├── components/                 # UIコンポーネント
│   └── data/
│       └── municipalities.json     # 東京都自治体マスターデータ
├── public/
│   └── data/
│       └── mail_keishicho.json     # 警視庁データ（蓄積マスター）
└── scripts/
    ├── csv-to-json.js              # Node.js版 CSV→JSON変換（ローカル用）
    ├── csv_to_json.py              # Python版 CSV→JSON変換（サーバー用）
    └── update_keishicho.sh         # cron用 日次更新シェルスクリプト
```

### さくらサーバー上の構成

```
/home/hazimeru/www/tokyo_search/
├── data/
│   └── mail_keishicho.json         # 蓄積マスター（cronが毎日更新）
├── scripts/
│   ├── update_keishicho.sh         # cron実行スクリプト（chmod 700）
│   ├── csv_to_json.py              # CSV→JSON変換（chmod 600）
│   ├── csv_work/                   # 作業用CSV一時置き場（自動生成）
│   └── logs/
│       └── update_YYYYMM.log       # 月別実行ログ（自動生成）
├── index.html                      # ビルド成果物
├── _next/
└── ...
```

### cron 設定（さくらコントロールパネル）

```
5 6 * * * bash /home/hazimeru/www/tokyo_search/scripts/update_keishicho.sh
```

---

## 電車遅延情報の自動更新（`/trains`）

### 仕組み

公共交通オープンデータセンター（ODPT）の列車運行情報APIを、さくらサーバー上の cron が
約15分ごとに取得し、公開ディレクトリの JSON を上書き更新する。

```
【さくらサーバー cron】約15分ごと
  ODPT TrainInformation API → 対象路線に整形
    ├─ data/train_delay.json          … 現在のスナップショット（上書き）
    └─ data/train_delay_history.json  … 「乱れ」のみ蓄積マージ（履歴）
```

スナップショットはページの「現在（最新）」表示、履歴はページの期間選択（本日／1週間／1ヶ月／年／全期間）で使用する。
履歴は重複除去キー `路線ID + dc:date` でマージ蓄積する（けいしちょうDBの `send_at + subject` と同じ方式）。

### データソース

公共交通オープンデータセンター（ODPT）  
https://www.odpt.org/

- 利用には開発者登録（無料）とコンシューマーキーが必要。
- キーはリポジトリに含めず、cron 行の環境変数 `ODPT_KEY` として渡す。
- 対象路線は `src/data/railways.json` で管理（東京圏のJR主要線・東京メトロ・都営・主要私鉄）。
- ※ JR東日本はODPTの提供範囲が限定的なため、一部路線は表示されない場合がある。

### cron 設定例（さくらコントロールパネル）

```
*/15 * * * * ODPT_KEY=xxxxxxxx bash /home/hazimeru/www/tokyo_search/scripts/update_train_delay.sh
```

### 段階

- **第1段階（実装済み）**: 現在の運行・遅延情報を路線別に一覧表示。
- **第2段階（実装済み）**: cronで「乱れ」を `train_delay_history.json` に蓄積し、ページに期間選択（履歴）を追加。履歴は cron 稼働開始以降に積み上がる。
- **第3段階（予定）**: 簡易路線図に遅延中路線を色付け表示。

---

## npm スクリプト

| コマンド | 内容 |
|---------|------|
| `npm run dev` | ローカル開発サーバー起動 |
| `npm run build` | 静的ファイルを `/out` に生成 |
| `npm run import-csv` | `import_csv/` のCSVを蓄積JSONにマージ（ローカル用） |
