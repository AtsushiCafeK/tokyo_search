import {
  RawTrainInformation,
  TrainDelayFile,
  TrainStatus,
  TrainStatusCategory,
  RailwayMaster,
} from '@/types/train';
import railwaysData from '@/data/railways.json';

const RAILWAYS = railwaysData as RailwayMaster[];

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

/**
 * 履歴（蓄積された「乱れ」レコード）をフェッチする。
 * train_delay_history.json を読み、マスターに載っている路線のみ返す（新しい順）。
 */
export async function fetchTrainHistory(
  sourcePath: string = '/data/train_delay_history.json'
): Promise<{ items: TrainStatus[]; generatedAt: string | null }> {
  try {
    const response = await fetch(sourcePath, { cache: 'no-store' });
    if (!response.ok) throw new Error('Network response was not ok');
    const data: TrainDelayFile = await response.json();

    const items: TrainStatus[] = [];
    for (const raw of data.items ?? []) {
      const t = transform(raw);
      if (t) items.push(t);
    }
    // 新しい順（日時降順）
    items.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

    return { items, generatedAt: data.generated_at ?? null };
  } catch (error) {
    console.error('Failed to fetch train history:', error);
    return { items: [], generatedAt: null };
  }
}

/**
 * 期間でフィルタリングする。
 * 'all'=全期間, '1'=本日, '3'/'7'/'30'=N日以内, '2026'等=該当年。
 * updatedAt（ISO8601）を基準に判定する。
 */
export function filterByPeriod(list: TrainStatus[], period: string): TrainStatus[] {
  if (period === 'all') return list;

  if (/^\d{4}$/.test(period)) {
    return list.filter((s) => (s.updatedAt || '').startsWith(period));
  }

  const days = parseInt(period, 10);
  if (Number.isNaN(days)) return list;
  const now = Date.now();
  return list.filter((s) => {
    const t = new Date(s.updatedAt).getTime();
    if (Number.isNaN(t)) return false;
    const diffDays = Math.ceil((now - t) / (1000 * 60 * 60 * 24));
    return diffDays <= days;
  });
}

/**
 * 路線でフィルタリングする。'all' は全件。
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
