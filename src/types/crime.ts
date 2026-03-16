/**
 * メールけいしちょうのオープンデータおよびアプリ用内部型定義
 */

export type CrimeCategory = 'fraud' | 'suspicious' | 'crime' | 'other';

export interface CrimeAlert {
  id: string;
  datetime: string;     // 発生日時 (YYYY-MM-DD HH:mm)
  type: string;         // 事案種別 (例: 特殊詐欺, 子供に対する声かけ等)
  title: string;        // タイトル
  content: string;      // 内容
  municipality: string; // 市区町村名
  category: CrimeCategory;
}

// 実際のデータ構造 (mail_keishicho.json)
export interface RawMailKeishicho {
  send_at: string;      // 配信日時 (YYYY-MM-DD HH:mm:ss)
  subject: string;      // タイトル/警察署名
  message: string;      // 内容
  send_by: string;      // 送信元
  send_to: string[];    // 送信先リスト
}
