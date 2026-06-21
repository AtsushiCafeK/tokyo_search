/**
 * 公共交通オープンデータセンター(ODPT) 列車運行情報の型定義およびアプリ用内部型
 *
 * 第1段階: 「現在の遅延・運行情報」のスナップショットを扱う。
 * 第2段階で履歴蓄積（期間選択）へ拡張する想定。
 */

export type TrainStatusCategory = 'normal' | 'delay' | 'suspended' | 'other';

/**
 * さくらサーバー上の取り込みスクリプト(fetch_train_delay.py)が書き出す
 * 静的JSON (data/train_delay.json) の1レコード。
 * ODPT `odpt:TrainInformation` から必要項目だけを整形したもの。
 */
export interface RawTrainInformation {
  railway: string;          // 路線ID (例: odpt.Railway:JR-East.Yamanote)
  operator: string;         // 事業者ID (例: odpt.Operator:JR-East)
  text: string;             // 運行情報テキスト (odpt:trainInformationText の ja)
  status?: string;          // 運行状況の区分文字列 (odpt:trainInformationStatus, 任意)
  date: string;             // 情報の更新日時 (ISO8601, dc:date)
}

/**
 * data/train_delay.json のトップレベル構造。
 * 生成時刻のメタ情報と、運行情報の配列を持つ。
 */
export interface TrainDelayFile {
  generated_at: string;            // JSON生成時刻 (ISO8601)
  items: RawTrainInformation[];
}

/**
 * アプリ内部で扱う整形済みの運行ステータス。
 */
export interface TrainStatus {
  id: string;               // 一意キー (railway をそのまま使用)
  operator: string;         // 事業者ID
  operatorName: string;     // 事業者和名
  railway: string;          // 路線ID
  railwayName: string;      // 路線和名
  color?: string;           // 路線カラー (任意)
  statusText: string;       // 運行情報テキスト
  category: TrainStatusCategory;
  isNormal: boolean;        // 平常運転かどうか
  updatedAt: string;        // 情報の更新日時 (ISO8601)
}

/**
 * src/data/railways.json の1エントリ（路線マスター）。
 */
export interface RailwayMaster {
  id: string;           // ODPT 路線ID
  name: string;         // 路線和名
  operator: string;     // ODPT 事業者ID
  operatorName: string; // 事業者和名
  color?: string;       // 路線カラー(HEX, 任意)
}
