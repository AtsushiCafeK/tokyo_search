'use client';

import { useState, useEffect } from 'react';
import { Train, AlertTriangle, OctagonX, Info, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectGroup,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Footer } from '@/components/Footer';
import { Navigation } from '@/components/Navigation';
import { TrainStatus, TrainStatusCategory } from '@/types/train';
import {
    fetchTrainStatus,
    fetchTrainHistory,
    filterByRailway,
    filterByPeriod,
    getDelaySummary,
    getOperators,
    RAILWAYS,
} from '@/utils/trainApi';

// 区分ごとの表示設定
const categoryConfig: Record<TrainStatusCategory, { label: string; badge: string; icon: React.ReactNode }> = {
    suspended: {
        label: '運転見合わせ',
        badge: 'bg-red-100 text-red-700 border-red-200',
        icon: <OctagonX className="w-3.5 h-3.5" />,
    },
    delay: {
        label: '遅延',
        badge: 'bg-orange-100 text-orange-700 border-orange-200',
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
    other: {
        label: '運行情報あり',
        badge: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: <Info className="w-3.5 h-3.5" />,
    },
    normal: {
        label: '平常運転',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
};

// 重い順に並べるための優先度
const SEVERITY: Record<TrainStatusCategory, number> = { suspended: 0, delay: 1, other: 2, normal: 3 };

function formatTime(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('ja-JP', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function TrainsPage() {
    const [allStatus, setAllStatus] = useState<TrainStatus[]>([]);
    const [history, setHistory] = useState<TrainStatus[]>([]);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const [selectedRailway, setSelectedRailway] = useState('all');
    const [selectedPeriod, setSelectedPeriod] = useState('now');
    const [generatedAt, setGeneratedAt] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [onlyDisrupted, setOnlyDisrupted] = useState(true);

    const operators = getOperators();
    const isHistoryMode = selectedPeriod !== 'now';

    useEffect(() => {
        async function load() {
            const { items, generatedAt } = await fetchTrainStatus();
            setAllStatus(items);
            setGeneratedAt(generatedAt);
            setLoaded(true);
        }
        load();
    }, []);

    // 履歴は過去期間を初めて選んだときに一度だけ読み込む
    useEffect(() => {
        if (isHistoryMode && !historyLoaded) {
            fetchTrainHistory().then(({ items }) => {
                setHistory(items);
                setHistoryLoaded(true);
            });
        }
    }, [isHistoryMode, historyLoaded]);

    // 表示対象の決定
    let visible: TrainStatus[];
    let summary: ReturnType<typeof getDelaySummary>;

    if (isHistoryMode) {
        const base = filterByPeriod(filterByRailway(history, selectedRailway), selectedPeriod);
        summary = getDelaySummary(base);
        // 履歴は新しい順（fetch時に降順済み）
        visible = base;
    } else {
        const filtered = filterByRailway(allStatus, selectedRailway);
        summary = getDelaySummary(filtered);
        // 「乱れのみ」トグルON時は平常運転を除外し、重い順に並べる
        visible = (onlyDisrupted ? filtered.filter((s) => !s.isNormal) : filtered)
            .slice()
            .sort((a, b) => SEVERITY[a.category] - SEVERITY[b.category]);
    }

    return (
        <main className="min-h-screen bg-slate-50/50 flex flex-col items-center">
            {/* Header */}
            <div className="w-full bg-white border-b border-slate-200 shadow-sm pt-8 pb-4">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Train className="w-8 h-8 text-primary" />
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">電車遅延情報</h1>
                    </div>
                    <p className="text-sm text-muted-foreground">東京圏の鉄道（JR・地下鉄・私鉄）の運行・遅延状況</p>
                    <Navigation />
                </div>
            </div>

            {/* Content Container */}
            <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8">

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-wider">
                        <Train className="w-4 h-4" />
                        路線を選択
                    </div>
                    <div className="flex gap-3 w-full md:w-auto items-center">
                        {!isHistoryMode && (
                            <button
                                type="button"
                                onClick={() => setOnlyDisrupted((v) => !v)}
                                className={`text-xs font-bold px-3 py-2 rounded-lg border transition-colors whitespace-nowrap ${
                                    onlyDisrupted
                                        ? 'bg-primary/10 text-primary border-primary/20'
                                        : 'bg-slate-50 text-slate-500 border-slate-200'
                                }`}
                            >
                                {onlyDisrupted ? '乱れのみ表示中' : 'すべて表示中'}
                            </button>
                        )}
                        <div className="flex-1 md:w-36">
                            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                                <SelectTrigger className="bg-slate-50 border-slate-200">
                                    <SelectValue placeholder="期間" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="now">現在（最新）</SelectItem>
                                    <SelectItem value="1">本日</SelectItem>
                                    <SelectItem value="7">1週間以内</SelectItem>
                                    <SelectItem value="30">1ヶ月以内</SelectItem>
                                    <SelectItem value="2026">2026年</SelectItem>
                                    <SelectItem value="all">全期間</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1 md:w-64">
                            <Select value={selectedRailway} onValueChange={setSelectedRailway}>
                                <SelectTrigger className="bg-slate-50 border-slate-200">
                                    <SelectValue placeholder="路線" />
                                </SelectTrigger>
                                <SelectContent className="max-h-80">
                                    <SelectItem value="all">すべての路線</SelectItem>
                                    {operators.map((op) => (
                                        <SelectGroup key={op.id}>
                                            <SelectLabel>{op.name}</SelectLabel>
                                            {RAILWAYS.filter((r) => r.operator === op.id).map((r) => (
                                                <SelectItem key={r.id} value={r.id}>
                                                    {r.name}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="bg-white border-slate-200 shadow-sm">
                        <div className="p-4 text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                {isHistoryMode ? '記録件数' : '対象路線'}
                            </p>
                            <p className="text-2xl font-black text-slate-800">{summary.total}</p>
                        </div>
                    </Card>
                    <Card className="bg-red-50/30 border-red-100 shadow-sm">
                        <div className="p-4 text-center">
                            <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">運転見合わせ</p>
                            <p className="text-2xl font-black text-red-600">{summary.suspended}</p>
                        </div>
                    </Card>
                    <Card className="bg-orange-50/30 border-orange-100 shadow-sm">
                        <div className="p-4 text-center">
                            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-1">遅延</p>
                            <p className="text-2xl font-black text-orange-600">{summary.delay}</p>
                        </div>
                    </Card>
                    {isHistoryMode ? (
                        <Card className="bg-amber-50/30 border-amber-100 shadow-sm">
                            <div className="p-4 text-center">
                                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">運行情報あり</p>
                                <p className="text-2xl font-black text-amber-600">{summary.other}</p>
                            </div>
                        </Card>
                    ) : (
                        <Card className="bg-emerald-50/30 border-emerald-100 shadow-sm">
                            <div className="p-4 text-center">
                                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">平常運転</p>
                                <p className="text-2xl font-black text-emerald-600">{summary.normal}</p>
                            </div>
                        </Card>
                    )}
                </div>

                {/* List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Train className="w-5 h-5 text-primary" />
                            {isHistoryMode ? '遅延・運行情報の履歴' : '運行状況'}
                        </h2>
                        {!isHistoryMode && generatedAt && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {formatTime(generatedAt)} 時点
                            </span>
                        )}
                    </div>

                    {(isHistoryMode ? !historyLoaded : !loaded) ? (
                        <div className="py-20 text-center text-slate-400">読み込み中...</div>
                    ) : visible.length > 0 ? (
                        <div className="grid gap-3">
                            {visible.map((s) => {
                                const cfg = categoryConfig[s.category];
                                return (
                                    <Card
                                        key={s.id}
                                        className="overflow-hidden hover:border-primary/30 transition-colors bg-white border-slate-200"
                                    >
                                        <CardHeader className="pt-3 pb-2 px-5">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge
                                                            variant="outline"
                                                            className={`gap-1 font-bold text-[10px] px-1.5 py-0 ${cfg.badge}`}
                                                        >
                                                            {cfg.icon}
                                                            {cfg.label}
                                                        </Badge>
                                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0 rounded">
                                                            {s.operatorName}
                                                        </span>
                                                    </div>
                                                    <CardTitle className="text-base font-extrabold text-slate-800 leading-tight flex items-center gap-2">
                                                        <span
                                                            className="inline-block w-1.5 h-4 rounded-sm"
                                                            style={{ backgroundColor: s.color ?? '#cbd5e1' }}
                                                        />
                                                        {s.railwayName}
                                                    </CardTitle>
                                                </div>
                                                <time className="text-[10px] font-mono text-slate-400 whitespace-nowrap pt-1">
                                                    {formatTime(s.updatedAt)}
                                                </time>
                                            </div>
                                        </CardHeader>
                                        {!s.isNormal && (
                                            <CardContent className="pt-1 pb-3 px-5 bg-slate-50/20">
                                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                                                    {s.statusText}
                                                </p>
                                            </CardContent>
                                        )}
                                    </Card>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-20 text-center space-y-4 bg-white rounded-2xl border border-dashed border-slate-200">
                            <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                                {isHistoryMode ? <Info className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
                            </div>
                            <p className="text-slate-500 font-medium">
                                {isHistoryMode
                                    ? 'この期間・路線に該当する遅延の記録はありません。'
                                    : '現在、対象路線に遅延・運転見合わせの情報はありません（平常運転）。'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Info Note */}
                <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
                    <h3 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        この情報について
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        本ページの運行情報は「公共交通オープンデータセンター」のデータを加工して作成しています。
                        情報は約15分ごとに更新されますが、表示に遅れが生じる場合があります。
                        最新かつ正確な運行状況は、必ず各鉄道事業者の公式情報をご確認ください。
                        なお、データ提供範囲の都合により、一部のJR路線は表示されない場合があります。
                    </p>
                </div>
            </div>

            <Footer />
        </main>
    );
}
