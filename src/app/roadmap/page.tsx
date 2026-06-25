import { ChevronLeft, BarChart3, Rocket, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/Footer';

export const metadata = {
    title: '開発ロードマップ | 東京都+全市区町村 行政情報 横断検索 | hazimeru.net',
    description: 'hazimeru.netの今後の開発予定と進捗状況を公開しています。ユーザーの利便性向上に向けた取り組みをご確認ください。',
};

const IN_PROGRESS_TASKS = [
    {
        name: 'コンテンツ素案の整理と機能拡充', progress: 25, subtasks: [
            '東京都庁・市区町村の情報到達性の改善',
            'タグによるスピーディーな絞り込み機能',
            'お得な暮らしの補助金・助成金情報の統合',
            '警視庁アラート情報（不審者・詐欺）の市区町村別表示（メールけいしちょうDB） — 100% DONE',
            '電車遅延・運行情報の路線別表示（公共交通オープンデータ） — 第1段階公開',
            '感染症トレンド情報・グラフ表現・救急案内',
            '地域別バス路線・時刻表・ニュース検索',
            '交通ルール変更等の行政ルール詳細案内',
            '災害時ハザードマップ・備え・緊急連絡先一覧',
            'ITトレンド・ネットリテラシー解説（世代別）',
            '害獣対策などの生活トラブル解決',
            '議会情報の可視化・アクセス改善',
            '安心・安全に使えるアプリ・通販情報の紹介'
        ]
    }
];

const COMPLETED_TASKS = [
    { name: 'サイト公開', progress: 100 },
    { name: '対応地域を東京都全域へ拡大', progress: 100 },
    { name: 'サイトポリシーページ作成', progress: 100 },
    { name: 'スマホ誘導用QRコードの設置（フッター等）', progress: 100 },
    { name: '地域の自動記憶機能（Cookie/LocalStorage）', progress: 100 },
    { name: '市区町村別 メールけいしちょうDBの実装', progress: 100 },
    { name: '最新の詐欺手口と対策情報（手口別ランキング・相談先）', progress: 100 }
];

const PENDING_TASKS = [
    { name: '流行のIT関連情報の信頼性解説', progress: 0 },
    { name: 'マイナポータルの活用法とトラブル解決', progress: 0 },
    { name: 'SNSリテラシー教育コンテンツ', progress: 0 }
];

function ProgressBar({ progress, colorClass = "bg-primary" }: { progress: number, colorClass?: string }) {
    return (
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
            <div
                className={`h-full ${colorClass} transition-all duration-1000 ease-out`}
                style={{ width: `${progress}%` }}
            />
        </div>
    );
}

export default function RoadmapPage() {
    return (
        <main className="min-h-screen bg-transparent flex flex-col items-center">
            {/* Header */}
            <div className="w-full bg-white border-b border-gray-200 shadow-sm py-6">
                <div className="max-w-4xl mx-auto px-4 flex items-center gap-4">
                    <a href="/">
                        <Button variant="ghost" size="sm" className="gap-1 px-2 text-muted-foreground hover:text-foreground">
                            <ChevronLeft className="w-4 h-4" />
                            戻る
                        </Button>
                    </a>
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-primary" />
                        <h1 className="text-xl font-bold text-foreground tracking-tighter">開発ロードマップ</h1>
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <div className="w-full bg-white border-b border-gray-100 pt-10 pb-16">
                <div className="max-w-4xl mx-auto px-4 text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 text-primary text-xs font-bold uppercase tracking-widest mb-2">
                        Development Status
                    </div>
                    <h2 className="text-3xl font-extrabold text-foreground tracking-tight">より便利で使いやすいサイトへ</h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        ユーザーの皆様の声を反映し、行政情報へのアクセスをよりスマートにするための機能開発を進めています。
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="w-full max-w-4xl mx-auto px-4 py-12 space-y-16">

                {/* In Progress */}
                <section className="space-y-8">
                    <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                        <Rocket className="w-6 h-6 text-orange-500" />
                        <h3 className="text-2xl font-bold tracking-tight">実装決定済み・開発着手</h3>
                    </div>
                    <div className="grid gap-8">
                        {IN_PROGRESS_TASKS.map((task, i) => (
                            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 transition-hover hover:border-primary/20 hover:shadow-md transition-all">
                                <div className="flex justify-between items-end mb-4">
                                    <h4 className="font-bold text-lg text-slate-800 leading-tight">{task.name}</h4>
                                    <span className="text-2xl font-black text-primary font-mono tracking-tighter">{task.progress}%</span>
                                </div>
                                <ProgressBar progress={task.progress} colorClass="bg-gradient-to-r from-primary/80 to-primary" />
                                {task.subtasks && (
                                    <ul className="mt-6 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-muted-foreground border-t border-slate-50 pt-6">
                                        {task.subtasks.map((sub, j) => (
                                            <li key={j} className="flex items-start gap-2">
                                                <span className="text-primary/40 mt-0.5">•</span>
                                                {sub}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Pending */}
                <section className="space-y-8">
                    <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                        <Clock className="w-6 h-6 text-slate-400" />
                        <h3 className="text-2xl font-bold tracking-tight text-slate-700">検討中・開発未着手</h3>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                        {PENDING_TASKS.map((task, i) => (
                            <div key={i} className="bg-slate-50/50 rounded-xl p-5 border border-slate-200/50 flex flex-col justify-between gap-3">
                                <h4 className="font-medium text-slate-700 leading-snug">{task.name}</h4>
                                <div className="flex items-center gap-3">
                                    <ProgressBar progress={0} colorClass="bg-slate-300" />
                                    <span className="text-xs font-bold text-slate-400 font-mono">WAITING</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Completed */}
                <section className="space-y-8">
                    <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        <h3 className="text-2xl font-bold tracking-tight">完了済みタスク</h3>
                    </div>
                    <div className="grid gap-3">
                        {COMPLETED_TASKS.map((task, i) => (
                            <div key={i} className="bg-emerald-50/30 rounded-xl px-6 py-4 border border-emerald-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-1 rounded-full bg-emerald-100 text-emerald-600">
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                    <h4 className="font-bold text-slate-700">{task.name}</h4>
                                </div>
                                <span className="text-xs font-black text-emerald-600 font-mono">100% DONE</span>
                            </div>
                        ))}
                    </div>
                </section>

            </div>

            <Footer />
        </main>
    );
}
