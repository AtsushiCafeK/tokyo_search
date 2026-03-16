import { CrimeAlert, RawMailKeishicho, CrimeCategory } from '@/types/crime';
import municipalitiesData from '@/data/municipalities.json';

/**
 * 犯罪種別をタイトルや内容から判別する
 */
export function categorizeCrime(title: string, body: string): CrimeCategory {
    const text = (title + body).toLowerCase();
    if (text.includes('詐欺') || text.includes('アポ電') || text.includes('還付金') || text.includes('サギ')) {
        return 'fraud';
    }
    if (text.includes('不審者') || text.includes('声かけ') || text.includes('つきまとい') || text.includes('触られ')) {
        return 'suspicious';
    }
    if (text.includes('事件') || text.includes('ひったくり') || text.includes('強盗') || text.includes('窃盗') || text.includes('公然わいせつ') || text.includes('盗撮')) {
        return 'crime';
    }
    return 'other';
}

/**
 * 警察署名や本文から市区町村名を抽出する
 */
export function extractMunicipality(subject: string, message: string): string {
    // 1. 警察署名から抽出
    const policeMatch = subject.match(/(.*)警察署/);
    if (policeMatch) {
        const station = policeMatch[1];
        // 警察署名と市区町村名が一致する場合が多い
        const found = municipalitiesData.find(m => station.includes(m.name.replace(/[区市町村]$/, '')));
        if (found) return found.name;
    }

    // 2. 本文の【地図】や特定のフレーズから抽出
    for (const m of municipalitiesData) {
        if (message.includes(m.name)) return m.name;
    }

    return '不明';
}

/**
 * RAWデータを内部形式に変換する
 */
export function transformRawData(raw: RawMailKeishicho, index: number): CrimeAlert {
    const title = raw.subject;
    const body = raw.message;
    return {
        id: `crime-${index}`,
        datetime: raw.send_at.substring(0, 16), // YYYY-MM-DD HH:mm
        type: title,
        title: title,
        content: body,
        municipality: extractMunicipality(title, body),
        category: categorizeCrime(title, body)
    };
}

/**
 * データをフェッチする
 */
export async function fetchCrimeAlerts(sourcePath: string = '/data/mail_keishicho.json'): Promise<CrimeAlert[]> {
    try {
        const response = await fetch(sourcePath);
        if (!response.ok) throw new Error('Network response was not ok');
        const data: RawMailKeishicho[] = await response.json();
        // 重複排除やソートをここで行うことも可能
        return data.map((item, index) => transformRawData(item, index))
            .sort((a, b) => b.datetime.localeCompare(a.datetime));
    } catch (error) {
        console.error('Failed to fetch crime alerts:', error);
        return [];
    }
}

/**
 * 市区町村でフィルタリングする
 */
export function filterByMunicipality(alerts: CrimeAlert[], municipality: string): CrimeAlert[] {
    if (municipality === 'all') return alerts;
    return alerts.filter(alert =>
        alert.municipality === municipality ||
        alert.municipality.includes(municipality) ||
        municipality.includes(alert.municipality)
    );
}

/**
 * 統計情報を取得する
 */
export function getCrimeStats(alerts: CrimeAlert[]) {
    const stats = {
        total: alerts.length,
        fraud: alerts.filter(a => a.category === 'fraud').length,
        suspicious: alerts.filter(a => a.category === 'suspicious').length,
        crime: alerts.filter(a => a.category === 'crime').length,
        other: alerts.filter(a => a.category === 'other').length,
    };
    return stats;
}
