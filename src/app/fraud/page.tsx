'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, Phone, AlertTriangle, ListOrdered, Info, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Footer } from '@/components/Footer';
import { Navigation } from '@/components/Navigation';
import {
    FraudRankingFile,
    FraudRankingView,
    FraudContact,
} from '@/types/fraud';
import {
    fetchFraudRanking,
    fetchFraudMethods,
    fetchFraudContacts,
    joinRankingWithMethods,
    formatAmountJa,
} from '@/utils/fraudApi';

export default function FraudPage() {
    const [ranking, setRanking] = useState<FraudRankingFile | null>(null);
    const [views, setViews] = useState<FraudRankingView[]>([]);
    const [contacts, setContacts] = useState<FraudContact[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        async function load() {
            const [rankingFile, methods, contactList] = await Promise.all([
                fetchFraudRanking(),
                fetchFraudMethods(),
                fetchFraudContacts(),
            ]);
            setRanking(rankingFile);
            setContacts(contactList);
            if (rankingFile) {
                setViews(joinRankingWithMethods(rankingFile.items, methods));
            }
            setLoaded(true);
        }
        load();
    }, []);

    // 説明本体がある手口だけカード表示（ランキング上位順を維持）
    const methodCards = views.filter((v) => v.method);

    return (
        <main className="min-h-screen bg-slate-50/50 flex flex-col items-center text-[17px] leading-relaxed">
            {/* Header */}
            <div className="w-full bg-white border-b border-slate-200 shadow-sm pt-8 pb-4">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <ShieldAlert className="w-8 h-8 text-red-500" />
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">最新の詐欺手口と対策</h1>
                    </div>
                    <p className="text-base text-muted-foreground">あやしい電話・メールは、まず相談を。詐欺の被害をなくすために。</p>
                    <Navigation />
                </div>
            </div>

            <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-10">

                {/* 最重要：相談先を最上部に大きく */}
                <section className="bg-white rounded-2xl border-2 border-red-200 shadow-sm p-6">
                    <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2 mb-1">
                        <Phone className="w-6 h-6 text-red-500" />
                        まず、ここに相談してください
                    </h2>
                    <p className="text-sm text-slate-500 mb-4">お金を渡す前に、一人で決めず必ず相談を。相談は無料です。</p>
                    <div className="grid sm:grid-cols-3 gap-3">
                        {contacts.map((c) => (
                            <div key={c.name} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-center">
                                <p className="text-sm font-bold text-slate-600">{c.name}</p>
                                <p className="text-3xl font-black text-red-600 my-1 tracking-tight">{c.tel}</p>
                                {c.note && <p className="text-xs text-slate-500 leading-snug">{c.note}</p>}
                            </div>
                        ))}
                    </div>
                </section>

                {/* 手口別ランキング */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                            <ListOrdered className="w-6 h-6 text-primary" />
                            被害の多い手口（全国）
                        </h2>
                        {ranking && (
                            <span className="text-xs text-muted-foreground">{ranking.period}・認知件数の多い順</span>
                        )}
                    </div>

                    <p className="flex items-center gap-2 text-sm font-bold text-primary bg-primary/5 border border-primary/10 rounded-lg px-4 py-2.5">
                        <ChevronRight className="w-4 h-4 shrink-0" />
                        手口名を押すと、その「対策・やること」が見られます。
                    </p>

                    {!loaded ? (
                        <div className="py-16 text-center text-slate-400">読み込み中...</div>
                    ) : views.length > 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
                            {views.map((v) => {
                                const inner = (
                                    <div className="flex items-center gap-4 p-4 hover:bg-slate-50/60 transition-colors">
                                        <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-black ${v.rank <= 3 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {v.rank}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-800 underline decoration-primary/30 underline-offset-4 group-hover:decoration-primary">
                                                {v.methodName}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                                認知 {v.count.toLocaleString()} 件 ／ 被害 {formatAmountJa(v.amountYen)}
                                            </p>
                                        </div>
                                        {v.method && (
                                            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 group-hover:bg-primary group-hover:text-white transition-colors">
                                                対策を見る
                                                <ChevronRight className="w-4 h-4" />
                                            </span>
                                        )}
                                    </div>
                                );
                                return v.method ? (
                                    <a key={v.methodKey} href={`#${v.methodKey}`} className="group block">{inner}</a>
                                ) : (
                                    <div key={v.methodKey}>{inner}</div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-500">
                            データを読み込めませんでした。
                        </div>
                    )}
                    {ranking && (
                        <p className="text-xs text-muted-foreground">
                            出典：
                            <a href={ranking.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                {ranking.source}
                            </a>
                        </p>
                    )}
                </section>

                {/* 手口ごとの対策カード */}
                <section className="space-y-4">
                    <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                        <AlertTriangle className="w-6 h-6 text-orange-500" />
                        手口と対策（こんな連絡が来たら）
                    </h2>
                    <div className="grid gap-4">
                        {methodCards.map((v) => {
                            const m = v.method!;
                            return (
                                <Card key={m.key} id={m.key} className="scroll-mt-24 bg-white border-slate-200">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-bold">
                                                第{v.rank}位
                                            </Badge>
                                            <CardTitle className="text-lg font-extrabold text-slate-900">{m.name}</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <p className="text-slate-700">{m.summary}</p>

                                        <div className="rounded-lg bg-amber-50/60 border border-amber-100 p-3">
                                            <p className="text-sm font-bold text-amber-700 mb-1">⚠️ こんな連絡が来たら注意</p>
                                            <p className="text-sm text-slate-700">{m.signsText}</p>
                                        </div>

                                        <div>
                                            <p className="text-sm font-bold text-slate-700 mb-2">✅ まず、こうしてください</p>
                                            <ul className="space-y-1.5">
                                                {m.firstActions.map((a, i) => (
                                                    <li key={i} className="flex gap-2 text-slate-700">
                                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                                        <span>{a}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <p className="text-xs text-muted-foreground">
                                            出典：
                                            <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                                {m.sourceLabel}
                                            </a>
                                        </p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </section>

                {/* 東京の地域情報への導線 */}
                <section className="bg-primary/5 rounded-xl p-6 border border-primary/10">
                    <h3 className="text-base font-bold text-primary mb-1 flex items-center gap-2">
                        <Info className="w-5 h-5" />
                        お住まいの地域の注意喚起
                    </h3>
                    <p className="text-sm text-slate-700">
                        東京都内の市区町村別の不審者・詐欺などの注意喚起は{' '}
                        <a href="/alerts" className="text-primary font-bold hover:underline">メールけいしちょうDB</a>
                        {' '}でご確認いただけます。
                    </p>
                </section>

                {/* 情報ノート */}
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-600 mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        この情報について
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        手口別の件数は警察庁の特殊詐欺統計（全国）をもとに作成しています。手口の説明・対策は警察庁等の公開情報を要約したものです。
                        最新かつ正確な情報は各公式サイトをご確認ください。当サイトは行政機関とは無関係の、民間が作成した情報まとめページです。
                        相談先（188・#9110）は無料でご利用いただけます。
                    </p>
                </div>
            </div>

            <Footer />
        </main>
    );
}
