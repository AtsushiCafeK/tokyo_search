import {
  FraudRankingFile,
  FraudRankingItem,
  FraudRankingView,
  FraudMethod,
  FraudMethodsFile,
  FraudContact,
  FraudContactsFile,
} from '@/types/fraud';

/** 手口別ランキングを取得（警察庁CSV由来・自動生成）。 */
export async function fetchFraudRanking(
  sourcePath: string = '/data/fraud_ranking.json'
): Promise<FraudRankingFile | null> {
  try {
    const res = await fetch(sourcePath, { cache: 'no-store' });
    if (!res.ok) throw new Error('Network response was not ok');
    return (await res.json()) as FraudRankingFile;
  } catch (error) {
    console.error('Failed to fetch fraud ranking:', error);
    return null;
  }
}

/** 手口の説明本体を取得（人がレビューする本体）。 */
export async function fetchFraudMethods(
  sourcePath: string = '/data/fraud_methods.json'
): Promise<FraudMethod[]> {
  try {
    const res = await fetch(sourcePath, { cache: 'no-store' });
    if (!res.ok) throw new Error('Network response was not ok');
    const data: FraudMethodsFile = await res.json();
    return data.methods ?? [];
  } catch (error) {
    console.error('Failed to fetch fraud methods:', error);
    return [];
  }
}

/** 共通の相談先を取得（固定・逐語）。 */
export async function fetchFraudContacts(
  sourcePath: string = '/data/fraud_contacts.json'
): Promise<FraudContact[]> {
  try {
    const res = await fetch(sourcePath, { cache: 'no-store' });
    if (!res.ok) throw new Error('Network response was not ok');
    const data: FraudContactsFile = await res.json();
    return data.contacts ?? [];
  } catch (error) {
    console.error('Failed to fetch fraud contacts:', error);
    return [];
  }
}

/** ランキング項目に説明本体を methodKey で結合する。説明が無い手口はランキングのみ。 */
export function joinRankingWithMethods(
  items: FraudRankingItem[],
  methods: FraudMethod[]
): FraudRankingView[] {
  const byKey = new Map<string, FraudMethod>(methods.map((m) => [m.key, m]));
  return items.map((it) => ({ ...it, method: byKey.get(it.methodKey) }));
}

/** 被害額（円）を「◯◯億円」「◯◯万円」など読みやすい日本語に整形。 */
export function formatAmountJa(yen: number | null): string {
  if (yen === null || yen < 0) return '—';
  if (yen >= 1_0000_0000) {
    const oku = yen / 1_0000_0000;
    return `約${oku >= 10 ? Math.round(oku) : oku.toFixed(1)}億円`;
  }
  if (yen >= 1_0000) {
    return `約${Math.round(yen / 1_0000).toLocaleString()}万円`;
  }
  return `${yen.toLocaleString()}円`;
}
