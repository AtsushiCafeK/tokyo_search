/**
 * 「最新の詐欺手口と対策」ページの型定義。
 *
 * 設計原則（高ステークス）:
 * - 事実（件数・相談先・初動）は出典から逐語。AIは平易化のみ。
 * - 件数ランキング(fraud_ranking.json)は警察庁CSVから自動生成。
 * - 手口の説明(fraud_methods.json)・相談先(fraud_contacts.json)は人がレビューする本体。
 */

/** 手口別ランキングの1項目（警察庁CSV由来・自動生成）。 */
export interface FraudRankingItem {
  rank: number;
  methodKey: string;     // 手口キー（fraud_methods.json と突合）
  methodName: string;    // 手口和名
  count: number;         // 認知件数
  amountYen: number | null; // 被害額（円）
  period: string;        // 対象期間ラベル（例: 令和8年1月～4月）
}

/** data/fraud_ranking.json のトップレベル構造。 */
export interface FraudRankingFile {
  generated_at: string;
  source: string;
  sourceUrl: string;
  period: string;
  total: { methodKey: string; methodName: string; count: number; amountYen: number | null; period: string } | null;
  items: FraudRankingItem[];
}

/** 手口ごとの説明・初動（人がレビュー・編集する本体）。 */
export interface FraudMethod {
  key: string;             // methodKey と一致
  name: string;            // 手口和名
  summary: string;         // 何をする詐欺か（1〜2文・平易）
  signsText: string;       // 「こんな連絡が来たら」サイン
  firstActions: string[];  // その場の初動（箇条書き）
  sourceLabel: string;     // 出典名
  sourceUrl: string;       // 出典URL
}

/** data/fraud_methods.json のトップレベル構造。 */
export interface FraudMethodsFile {
  updated_at: string;
  methods: FraudMethod[];
}

/** 共通の相談先（固定・逐語）。 */
export interface FraudContact {
  name: string;
  tel: string;
  note?: string;
}

/** data/fraud_contacts.json のトップレベル構造。 */
export interface FraudContactsFile {
  updated_at: string;
  contacts: FraudContact[];
}

/** ランキング項目に説明本体を結合した表示用型。 */
export interface FraudRankingView extends FraudRankingItem {
  method?: FraudMethod;
}
