import {
  RawTrainInformation,
  TrainDelayFile,
  TrainStatus,
  TrainStatusCategory,
  RailwayMaster,
  DelayEvent,
  DelayEventView,
  DelayHistoryFile,
  DelayCause,
} from '@/types/train';
import railwaysData from '@/data/railways.json';

const RAILWAYS = railwaysData as RailwayMaster[];

// 原因区分 → 表示ラベル
export const CAUSE_LABELS: Record<DelayCause, string> = {
  accident: '人身事故',
  sick: '急病人',
  congestion: '混雑',
  vehicle: '車両点検・故障',
  signal: '信号',
  crossing: '踏切',
  weather: '天候',
  earthquake: '地震',
  power: '停電・架線',
  intrusion: '線路内立入',
  other: 'その他',
};

// 路線ID → マスター情報の索引
const RAILWAY_MAP = new Map<string, RailwayMaster>(RAILWAYS.map((r) => [r.id, r]));

/**
 * 運行情報テキスト・状況文字列から区分を判定する。
 */
export function classifyStatus(text: string, status?: string): TrainStatusCategory {
  const t = `${status ?? ''} ${text ?? ''}`;

  // 運転見合わせ・運休系（最も重い）
  if (
    t.includes('見合わせ') ||
    t.includes('運転中止') ||
    t.includes('運休') ||
    t.includes('運転を見合')
  ) {
    return 'suspended';
  }
  // 遅延系
  if (t.includes('遅延') || t.includes('遅れ') || t.includes('直通運転中止') || t.includes('一部列車')) {
    return 'delay';
  }
  // 平常運転
  if (t.includes('平常') || t.includes('通常') || t === ' ' || t.trim() === '') {
    return 'normal';
  }
  // それ以外（情報あり：振替輸送実施中・天候影響の注意喚起など）
  return 'other';
}

/**
 * RAWレコードを内部形式に変換する。マスターに無い路線は除外する。
 */
function transform(raw: RawTrainInformation): TrainStatus | null {
  const master = RAILWAY_MAP.get(raw.railway);
  if (!master) return null;

  const category = classifyStatus(raw.text, raw.status);
  return {
    id: raw.railway,
    operator: raw.operator,
    operatorName: master.operatorName,
    railway: raw.railway,
    railwayName: master.name,
    color: master.color,
    statusText: raw.text?.trim() || '平常運転',
    category,
    isNormal: category === 'normal',
    updatedAt: raw.date,
  };
}

/**
 * 運行情報をフェッチする。
 * マスター(railways.json)の並び順を保持して返す。
 */
export async function fetchTrainStatus(
  sourcePath: string = '/data/train_delay.json'
): Promise<{ items: TrainStatus[]; generatedAt: string | null }> {
  try {
    const response = await fetch(sourcePath, { cache: 'no-store' });
    if (!response.ok) throw new Error('Network response was not ok');
    const data: TrainDelayFile = await response.json();

    const byRailway = new Map<string, TrainStatus>();
    for (const raw of data.items ?? []) {
      const t = transform(raw);
      if (t) byRailway.set(t.railway, t);
    }

    // マスター順に整列。情報が無い路線は「平常運転」として補完する。
    const items: TrainStatus[] = RAILWAYS.map((m) => {
      const existing = byRailway.get(m.id);
      if (existing) return existing;
      return {
        id: m.id,
        operator: m.operator,
        operatorName: m.operatorName,
        railway: m.id,
        railwayName: m.name,
        color: m.color,
        statusText: '平常運転',
        category: 'normal' as TrainStatusCategory,
        isNormal: true,
        updatedAt: data.generated_at ?? '',
      };
    });

    return { items, generatedAt: data.generated_at ?? null };
  } catch (error) {
    console.error('Failed to fetch train status:', error);
    return { items: [], generatedAt: null };
  }
}

/** DelayEvent に路線マスター情報を結合して表示用にする。マスター外は null。 */
function toEventView(ev: DelayEvent): DelayEventView | null {
  const master = RAILWAY_MAP.get(ev.railway);
  if (!master) return null;
  return {
    ...ev,
    operatorName: master.operatorName,
    railwayName: master.name,
    color: master.color,
    causeLabel: CAUSE_LABELS[ev.cause] ?? CAUSE_LABELS.other,
  };
}

/**
 * 遅延イベント履歴をフェッチする。
 * train_delay_history.json（イベント形式）を読み、マスター掲載路線のみ返す（新しい順）。
 */
export async function fetchTrainHistory(
  sourcePath: string = '/data/train_delay_history.json'
): Promise<{ events: DelayEventView[]; generatedAt: string | null }> {
  try {
    const response = await fetch(sourcePath, { cache: 'no-store' });
    if (!response.ok) throw new Error('Network response was not ok');
    const data: DelayHistoryFile = await response.json();

    const events: DelayEventView[] = [];
    for (const ev of data.events ?? []) {
      const v = toEventView(ev);
      if (v) events.push(v);
    }
    // 開始が新しい順
    events.sort((a, b) => (b.startAt || '').localeCompare(a.startAt || ''));

    return { events, generatedAt: data.generated_at ?? null };
  } catch (error) {
    console.error('Failed to fetch train history:', error);
    return { events: [], generatedAt: null };
  }
}

/**
 * 期間でイベントをフィルタリングする（開始日時 startAt 基準）。
 * 'all'=全期間, 数字=N日以内, 4桁=該当年。
 */
export function filterEventsByPeriod(events: DelayEventView[], period: string): DelayEventView[] {
  if (period === 'all') return events;

  if (/^\d{4}$/.test(period)) {
    return events.filter((e) => (e.startAt || '').startsWith(period));
  }

  const days = parseInt(period, 10);
  if (Number.isNaN(days)) return events;
  const now = Date.now();
  return events.filter((e) => {
    const t = new Date(e.startAt).getTime();
    if (Number.isNaN(t)) return false;
    const diffDays = Math.ceil((now - t) / (1000 * 60 * 60 * 24));
    return diffDays <= days;
  });
}

/** イベント配列を路線でフィルタ。'all' は全件。 */
export function filterEventsByRailway(events: DelayEventView[], railwayId: string): DelayEventView[] {
  if (railwayId === 'all') return events;
  return events.filter((e) => e.railway === railwayId);
}

/** イベント配列の集計（最大深刻度ベース）。 */
export function getEventSummary(events: DelayEventView[]) {
  return {
    total: events.length,
    suspended: events.filter((e) => e.maxCategory === 'suspended').length,
    delay: events.filter((e) => e.maxCategory === 'delay').length,
    other: events.filter((e) => e.maxCategory === 'other').length,
  };
}

/**
 * 路線でフィルタリングする（スナップショット用）。'all' は全件。
 */
export function filterByRailway(list: TrainStatus[], railwayId: string): TrainStatus[] {
  if (railwayId === 'all') return list;
  return list.filter((s) => s.railway === railwayId);
}

/**
 * 事業者でフィルタリングする。'all' は全件。
 */
export function filterByOperator(list: TrainStatus[], operatorId: string): TrainStatus[] {
  if (operatorId === 'all') return list;
  return list.filter((s) => s.operator === operatorId);
}

/**
 * 運行状況の集計（サマリーカード用）。
 */
export function getDelaySummary(list: TrainStatus[]) {
  return {
    total: list.length,
    normal: list.filter((s) => s.category === 'normal').length,
    delay: list.filter((s) => s.category === 'delay').length,
    suspended: list.filter((s) => s.category === 'suspended').length,
    other: list.filter((s) => s.category === 'other').length,
  };
}

/**
 * 事業者の一覧（重複排除・マスター順）を返す。フィルタUI用。
 */
export function getOperators(): { id: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const r of RAILWAYS) {
    if (!seen.has(r.operator)) seen.set(r.operator, r.operatorName);
  }
  return [...seen.entries()].map(([id, name]) => ({ id, name }));
}

export { RAILWAYS };
