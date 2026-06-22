'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, AlertTriangle, ShieldAlert, UserX, Info, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Footer } from '@/components/Footer';
import { Navigation } from '@/components/Navigation';
import { CrimeAlert, CrimeCategory } from '@/types/crime';
import { fetchCrimeAlerts, filterByMunicipality, getCrimeStats } from '@/utils/crimeApi';
import municipalitiesData from '@/data/municipalities.json';
import { getCookie, setCookie } from '@/utils/cookies';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

// バッジの色とアイコンの定義
const categoryConfig = {
    fraud: {
        label: '特殊詐欺',
        color: 'bg-red-100 text-red-700 border-red-200',
        icon: <ShieldAlert className="w-3.5 h-3.5" />
    },
    suspicious: {
        label: '不審者情報',
        color: 'bg-orange-100 text-orange-700 border-orange-200',
        icon: <UserX className="w-3.5 h-3.5" />
    },
    crime: {
        label: '犯罪発生',
        color: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: <AlertTriangle className="w-3.5 h-3.5" />
    },
    other: {
        label: 'その他',
        color: 'bg-slate-100 text-slate-700 border-slate-200',
        icon: <Info className="w-3.5 h-3.5" />
    }
};

export default function AlertsPage() {
    const [allAlerts, setAllAlerts] = useState<CrimeAlert[]>([]);
    const [filteredAlerts, setFilteredAlerts] = useState<CrimeAlert[]>([]);
    const [selectedCity, setSelectedCity] = useState('all');
    const [selectedPeriod, setSelectedPeriod] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState<CrimeCategory | 'all'>('all');
    const [showAll, setShowAll] = useState(false);
    const [stats, setStats] = useState({ total: 0, fraud: 0, suspicious: 0, crime: 0, other: 0 });

    const DISPLAY_LIMIT = 5;

    useEffect(() => {
        async function loadData() {
            const data = await fetchCrimeAlerts();
            setAllAlerts(data);

            // 地域設定の復元
            const savedId = getCookie('selected_municipality_id') || localStorage.getItem('selected_municipality_id');
            let initialCity = 'all';
            if (savedId) {
                const found = municipalitiesData.find(m => m.id === savedId);
                if (found) {
                    initialCity = found.name;
                    setSelectedCity(found.name);
                }
            }

            updateFilteredData(data, initialCity, selectedPeriod, selectedCategory);
        }
        loadData();
    }, []);

    const updateFilteredData = (data: CrimeAlert[], city: string, period: string, category: string) => {
        let filtered = filterByMunicipality(data, city);

        // 期間フィルター
        if (period !== 'all') {
            const now = new Date();
            if (period.startsWith('20')) {
                filtered = filtered.filter(alert => alert.datetime.startsWith(period));
            } else {
                const days = parseInt(period);
                filtered = filtered.filter(alert => {
                    const alertDate = new Date(alert.datetime);
                    const diffTime = Math.abs(now.getTime() - alertDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays <= days;
                });
            }
        }

        // カテゴリーフィルター
        if (category !== 'all') {
            filtered = filtered.filter(alert => alert.category === category);
        }

        setFilteredAlerts(filtered);
        setStats(getCrimeStats(filtered));
        setShowAll(false);
    };

    const handleCityChange = (value: string) => {
        setSelectedCity(value);
        // CookieとLocalStorageに保存（ホーム画面と同期）
        const muni = municipalitiesData.find(m => m.name === value);
        if (muni) {
            setCookie('selected_municipality_id', muni.id);
            localStorage.setItem('selected_municipality_id', muni.id);
        } else if (value === 'all') {
            // 'all' の場合は cookie を消すか、特別な値をセットする
            // ここでは一貫性のために ID: all は想定されていないかもしれないが、
            // ホーム画面の挙動に合わせるならそのままにするか削除
        }
        updateFilteredData(allAlerts, value, selectedPeriod, selectedCategory);
    };

    const handlePeriodChange = (value: string) => {
        setSelectedPeriod(value);
        updateFilteredData(allAlerts, selectedCity, value, selectedCategory);
    };

    const handleCategoryToggle = (category: CrimeCategory | 'all') => {
        const nextCategory = selectedCategory === category ? 'all' : category;
        setSelectedCategory(nextCategory);
        updateFilteredData(allAlerts, selectedCity, selectedPeriod, nextCategory);
    };

    const displayedAlerts = showAll ? filteredAlerts : filteredAlerts.slice(0, DISPLAY_LIMIT);

    return (
        <main className="min-h-screen bg-slate-50/50 flex flex-col items-center">
            {/* Header */}
            <div className="w-full bg-white border-b border-slate-200 shadow-sm pt-8 pb-4">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <ShieldAlert className="w-8 h-8 text-red-500" />
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">メールけいしちょうDB</h1>
                    </div>
                    <Navigation />
                </div>
            </div>

            {/* Content Container */}
            <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8">

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-wider">
                        <BarChart2 className="w-4 h-4" />
                        統計・抽出設定
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="hidden md:flex gap-2 border-slate-200 text-slate-600 hover:bg-slate-50">
                                    <BarChart2 className="w-4 h-4" />
                                    地域別の件数表
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col p-6">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-bold">市区町村別の犯罪統計 ({selectedPeriod === 'all' ? '全期間' : `${selectedPeriod}${selectedPeriod.length > 4 ? '' : '日以内'}`})</DialogTitle>
                                </DialogHeader>
                                <div className="mt-4 rounded-md border border-slate-100 max-h-[60vh] overflow-y-auto">
                                    <table className="w-full text-sm text-left border-collapse">
                                        <thead className="bg-slate-50 sticky top-0">
                                            <tr>
                                                <th className="p-3 font-bold text-slate-700 border-b">市区町村</th>
                                                <th className="p-3 font-bold text-slate-700 border-b text-center">合計</th>
                                                <th className="p-3 font-bold text-red-600 border-b text-center">特殊詐欺</th>
                                                <th className="p-3 font-bold text-orange-600 border-b text-center">不審者</th>
                                                <th className="p-3 font-bold text-amber-600 border-b text-center">犯罪発生</th>
                                                <th className="p-3 font-bold text-slate-500 border-b text-center">その他</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {municipalitiesData
                                                .map(m => {
                                                    const muniAlerts = filterByMunicipality(allAlerts, m.name).filter(a => {
                                                        if (selectedPeriod === 'all') return true;
                                                        if (selectedPeriod.startsWith('20')) return a.datetime.startsWith(selectedPeriod);
                                                        const now = new Date();
                                                        const alertDate = new Date(a.datetime);
                                                        const diffDays = Math.ceil(Math.abs(now.getTime() - alertDate.getTime()) / (1000 * 60 * 60 * 24));
                                                        return diffDays <= parseInt(selectedPeriod);
                                                    });
                                                    return { name: m.name, stats: getCrimeStats(muniAlerts) };
                                                })
                                                .sort((a, b) => b.stats.total - a.stats.total)
                                                .map((row, i) => (
                                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="p-3 font-medium text-slate-800">{row.name}</td>
                                                        <td className="p-3 text-center font-bold text-slate-900">{row.stats.total}</td>
                                                        <td className="p-3 text-center text-red-600">{row.stats.fraud}</td>
                                                        <td className="p-3 text-center text-orange-600">{row.stats.suspicious}</td>
                                                        <td className="p-3 text-center text-amber-600">{row.stats.crime}</td>
                                                        <td className="p-3 text-center text-slate-400">{row.stats.other}</td>
                                                    </tr>
                                                ))
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            </DialogContent>
                        </Dialog>
                        <div className="flex-1 md:w-48">
                            <Select value={selectedCity} onValueChange={handleCityChange}>
                                <SelectTrigger className="bg-slate-50 border-slate-200">
                                    <SelectValue placeholder="市区町村" />
                                </SelectTrigger>
                                <SelectContent className="max-h-80">
                                    <SelectItem value="all">すべての地域</SelectItem>
                                    {municipalitiesData.map((m) => (
                                        <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1 md:w-36">
                            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                                <SelectTrigger className="bg-slate-50 border-slate-200">
                                    <SelectValue placeholder="期間" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">全期間</SelectItem>
                                    <SelectItem value="1">本日</SelectItem>
                                    <SelectItem value="3">3日以内</SelectItem>
                                    <SelectItem value="7">1週間以内</SelectItem>
                                    <SelectItem value="30">1ヶ月以内</SelectItem>
                                    <SelectItem value="2024">2024年</SelectItem>
                                    <SelectItem value="2025">2025年</SelectItem>
                                    <SelectItem value="2026">2026年</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Stats Section */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <Card
                        className={`bg-white border-slate-200 shadow-sm cursor-pointer transition-all hover:scale-[1.02] ${selectedCategory === 'all' ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                        onClick={() => handleCategoryToggle('all')}
                    >
                        <div className="p-4 text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">合計件数</p>
                            <p className="text-2xl font-black text-slate-800">{stats.total}</p>
                        </div>
                    </Card>
                    <Card
                        className={`bg-red-50/30 border-red-100 shadow-sm cursor-pointer transition-all hover:scale-[1.02] ${selectedCategory === 'fraud' ? 'ring-2 ring-red-500 ring-offset-2' : ''}`}
                        onClick={() => handleCategoryToggle('fraud')}
                    >
                        <div className="p-4 text-center">
                            <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">特殊詐欺</p>
                            <p className="text-2xl font-black text-red-600">{stats.fraud}</p>
                        </div>
                    </Card>
                    <Card
                        className={`bg-orange-50/30 border-orange-100 shadow-sm cursor-pointer transition-all hover:scale-[1.02] ${selectedCategory === 'suspicious' ? 'ring-2 ring-orange-500 ring-offset-2' : ''}`}
                        onClick={() => handleCategoryToggle('suspicious')}
                    >
                        <div className="p-4 text-center">
                            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-1">不審者</p>
                            <p className="text-2xl font-black text-orange-600">{stats.suspicious}</p>
                        </div>
                    </Card>
                    <Card
                        className={`bg-amber-50/30 border-amber-100 shadow-sm cursor-pointer transition-all hover:scale-[1.02] ${selectedCategory === 'crime' ? 'ring-2 ring-amber-500 ring-offset-2' : ''}`}
                        onClick={() => handleCategoryToggle('crime')}
                    >
                        <div className="p-4 text-center">
                            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">犯罪・事件</p>
                            <p className="text-2xl font-black text-amber-600">{stats.crime}</p>
                        </div>
                    </Card>
                    <Card
                        className={`bg-slate-100/50 border-slate-200 shadow-sm cursor-pointer transition-all hover:scale-[1.02] ${selectedCategory === 'other' ? 'ring-2 ring-slate-400 ring-offset-2' : ''}`}
                        onClick={() => handleCategoryToggle('other')}
                    >
                        <div className="p-4 text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">その他</p>
                            <p className="text-2xl font-black text-slate-600">{stats.other}</p>
                        </div>
                    </Card>
                </div>

                {/* List Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <BarChart2 className="w-5 h-5 text-primary" />
                            最新のアラート一覧
                        </h2>
                        <span className="text-xs text-muted-foreground">
                            {selectedCity === 'all' ? '東京都全域' : selectedCity} / {selectedPeriod === 'all' ? '全期間' : selectedPeriod.startsWith('20') ? `${selectedPeriod}年` : `${selectedPeriod}日以内`}
                        </span>
                    </div>

                    {displayedAlerts.length > 0 ? (
                        <div className="grid gap-3">
                            {displayedAlerts.map((alert) => {
                                const cfg = categoryConfig[alert.category] || categoryConfig.other;
                                return (
                                    <Card key={alert.id} className="overflow-hidden hover:border-primary/30 transition-colors bg-white border-slate-200">
                                        <CardHeader className="pt-3 pb-2 px-5">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="space-y-0.5">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <Badge variant="outline" className={`gap-1 font-bold text-[10px] px-1.5 py-0 ${cfg.color}`}>
                                                            {cfg.icon}
                                                            {cfg.label}
                                                        </Badge>
                                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0 rounded">
                                                            {alert.municipality}
                                                        </span>
                                                    </div>
                                                    <CardTitle className="text-base font-extrabold text-slate-800 leading-tight mb-1">
                                                        {alert.title}
                                                    </CardTitle>
                                                </div>
                                                <time className="text-[10px] font-mono text-slate-400 whitespace-nowrap pt-1">
                                                    {alert.datetime}
                                                </time>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-2 pb-3 px-5 bg-slate-50/20">
                                            <p className="text-sm text-slate-600 leading-relaxed md:line-clamp-none whitespace-pre-wrap">
                                                {alert.content}
                                            </p>
                                        </CardContent>
                                    </Card>
                                );
                            })}

                            {!showAll && filteredAlerts.length > DISPLAY_LIMIT && (
                                <Button
                                    variant="outline"
                                    className="w-full mt-2 border-slate-200 text-slate-500 hover:bg-slate-50 py-6 font-bold flex items-center justify-center gap-2"
                                    onClick={() => setShowAll(true)}
                                >
                                    続きを表示（残り {filteredAlerts.length - DISPLAY_LIMIT} 件）
                                    <ChevronLeft className="w-4 h-4 -rotate-90" />
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="py-20 text-center space-y-4 bg-white rounded-2xl border border-dashed border-slate-200">
                            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                <Info className="w-8 h-8" />
                            </div>
                            <p className="text-slate-500 font-medium">現在、この地域の条件に合致するアラートはありません。</p>
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
                        このページの情報は警視庁「メールけいしちょう」のオープンデータを活用しています。情報は随時更新されますが、最新かつ正確な情報は公式サイトをご確認ください。
                    </p>
                </div>
            </div>

            <Footer />
        </main>
    );
}
