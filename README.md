# 東京都+全市区町村 行政情報 横断検索

東京都および全市区町村（23区・26市・町村）の公式行政サイトを  
Google Programmable Search Engine (CSE) で一括横断検索できるWebサービス。

## 現在の機能
- 東京都内の都市区町村の公式サイトの横断検索
- メールけいしちょうDB OPEN DATAの閲覧、市区町村別の集計など
- 電車遅延情報（`/trains`）— 東京圏のJR・地下鉄・私鉄の運行/遅延状況を路線別に表示（公共交通オープンデータセンター ODPT を利用）
- 詐欺対策（`/fraud`）— 高齢者向けに、被害の多い詐欺手口ランキング（全国）・各手口の対策・相談先(188/#9110)を表示（警察庁 特殊詐欺統計を利用）


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
    ├─ data/train_delay.json            … 現在のスナップショット（上書き）
    ├─ data/train_delay_history.json    … 遅延「イベント」を蓄積（履歴・リスク分析用）
    └─ data/train_observation_log.json  … 日別cron実行回数（遅延率の分母）
```

スナップショットはページの「現在（最新）」表示、履歴はページの期間選択（本日／1週間／1ヶ月／年／全期間）で使用する。

**履歴はイベントベースで蓄積する。** 路線が乱れ始めてから正常復帰するまでを1イベントとし、
`開始 / 終了 / 継続分 / 最大深刻度 / 原因 / 最新テキスト` を記録する。各cron実行で:

- 乱れ継続中で開イベントあり → 更新（最終観測時刻・最新テキスト・最大深刻度・原因）
- 乱れ開始（開イベントなし）   → 新規イベントを開く
- 正常復帰（開イベントあり）   → イベントを終了し継続時間を確定
- 最終観測が3時間以上前の開イベント → 停滞とみなし最終観測時刻で終了（cron欠損の保険）

この設計により、路線別の**遅延回数・平均継続時間・時間帯傾向・原因内訳・遅延率**が算出可能になる
（＝遅延リスクの可視化。第3段階の土台）。**過去履歴は遡及取得できない**ため、cron稼働開始以降に積み上がる。

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
- **第2段階（実装済み）**: cronで遅延を**イベントベース**で `train_delay_history.json` に蓄積し、ページに期間選択（履歴）を追加。履歴では各遅延の継続時間・原因を表示。履歴は cron 稼働開始以降に積み上がる。
- **第3段階（予定）**: 蓄積データの集計・可視化（路線別の遅延回数ランキング、時間帯ヒートマップ、原因内訳、遅延率）。簡易路線図への色付けも候補。

---

## 詐欺対策ページのデータ更新（`/fraud`）

### 仕組み

警察庁の特殊詐欺統計CSV（全国・手口別）から、手口別ランキングJSONを生成する。
手口の説明・初動・相談先は**人がレビュー・編集するコンテンツ本体**で、自動更新しない。

```
【データの種類】
  data/fraud_ranking.json   … 手口別ランキング（自動生成・上書き）
  data/fraud_methods.json   … 手口の説明・初動（人がレビュー・編集する本体）
  data/fraud_contacts.json  … 共通の相談先 188/#9110/110（固定・逐語）
```

### 運用フロー

```
1. scripts/fetch_fraud_ranking.py を実行 → fraud_ranking.json を更新
2. （必要なら）fraud_methods.json を編集してレビュー
3. npm run build → out をFTPアップロード
```

さくらcronで自動化する場合の例（週1回）:

```
20 6 * * 1 bash /home/hazimeru/www/tokyo_search/scripts/update_fraud.sh
```

### データソースと出典

- 警察庁「特殊詐欺の認知・検挙状況等について」 https://www.npa.go.jp/publications/statistics/sousa/sagi.html
  - CSV: `.../tokusyusagi/hurikomesagi_toukei.csv`（**Shift_JIS**・手口ごとのセクション積み）
  - 利用規約（[公共データ利用規約 PDL1.0](https://www.npa.go.jp/rules/)）に基づき、**出典明記で再配布可**。
- 相談先・各手口の対策は警察庁 特殊詐欺対策（SOS47）等の公開情報を要約。

### 設計原則（重要）

- **事実（件数・相談先・初動）は出典から逐語。AIは平易化のみ**。相談先・初動は固定データ。
- 各項目に出典リンクを表示。公開前にユーザーがレビューする前提。
- ランキングは全国ベース（東京の手口別はPDFのみで断念）。地域の注意喚起は `/alerts` へ導線。

---

## npm スクリプト

| コマンド | 内容 |
|---------|------|
| `npm run dev` | ローカル開発サーバー起動 |
| `npm run build` | 静的ファイルを `/out` に生成 |
| `npm run import-csv` | `import_csv/` のCSVを蓄積JSONにマージ（ローカル用） |
