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

// ============================================================================
// 第3段階: 遅延リスク可視化のためのイベントベース蓄積
// ============================================================================

/** 遅延の主な原因の区分。テキストからキーワード判定する。 */
export type DelayCause =
  | 'accident'      // 人身事故・接触
  | 'sick'          // 急病人
  | 'congestion'    // 混雑・乗降時間
  | 'vehicle'       // 車両点検・故障
  | 'signal'        // 信号確認・故障
  | 'crossing'      // 踏切
  | 'weather'       // 強風・大雨・雪 等の天候
  | 'earthquake'    // 地震
  | 'power'         // 停電・架線
  | 'intrusion'     // 線路内立入・支障物
  | 'other';        // その他・不明

/**
 * 蓄積される「遅延イベント」1件。
 * 路線が乱れ始めてから正常復帰するまでを1イベントとして記録する。
 * data/train_delay_history.json は { generated_at, events: DelayEvent[] }。
 */
export interface DelayEvent {
  id: string;                        // 一意キー (railway + '__' + startAt)
  railway: string;                   // 路線ID
  operator: string;                  // 事業者ID
  startAt: string;                   // 乱れを最初に観測した日時 (ISO8601)
  endAt: string | null;              // 正常復帰した日時。継続中は null
  durationMin: number | null;        // 継続時間(分)。継続中は null
  maxCategory: Exclude<TrainStatusCategory, 'normal'>; // 期間中の最大深刻度
  cause: DelayCause;                 // 推定原因
  latestText: string;                // 最後に観測した運行情報テキスト
  lastSeenAt: string;                // 最後に乱れを観測した日時 (停滞クローズ判定用)
  ongoing: boolean;                  // 継続中かどうか (endAt === null)
}

/** data/train_delay_history.json のトップレベル構造（イベントベース）。 */
export interface DelayHistoryFile {
  generated_at: string;
  events: DelayEvent[];
}

/**
 * クライアントで扱う、路線マスター情報を結合したイベント表示用型。
 */
export interface DelayEventView extends DelayEvent {
  operatorName: string;
  railwayName: string;
  color?: string;
  causeLabel: string;
}

/**
 * data/train_observation_log.json のトップレベル構造。
 * 遅延「率」を出すための分母（cronが実際に観測した回数）を日別に記録する。
 */
export interface ObservationLogFile {
  generated_at: string;
  days: Record<string, number>; // "YYYY-MM-DD" -> その日のcron実行回数
}
