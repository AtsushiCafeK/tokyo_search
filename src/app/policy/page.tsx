import { ChevronLeft, ShieldCheck, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/Footer';

export const metadata = {
    title: 'サイトポリシー | 東京都+全市区町村 行政情報 横断検索 | hazimeru.net',
    description: 'hazimeru.netのサイトポリシーとプライバシーポリシーに関するご案内です。',
};

export default function PolicyPage() {
    return (
        <main className="min-h-screen bg-gray-50/50 flex flex-col items-center">
            {/* Header */}
            <div className="w-full bg-white border-b border-gray-200 shadow-sm py-6">
                <div className="max-w-4xl mx-auto px-4 flex items-center gap-4">
                    <a href="/">
                        <Button variant="ghost" size="sm" className="gap-1 px-2">
                            <ChevronLeft className="w-4 h-4" />
                            戻る
                        </Button>
                    </a>
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-primary" />
                        <h1 className="text-xl font-bold text-foreground tracking-tight">サイトポリシー</h1>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="w-full max-w-4xl mx-auto px-4 py-12">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-10">

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold border-l-4 border-primary pl-4 flex items-center gap-2">
                            運営目的
                        </h2>
                        <p className="text-muted-foreground leading-relaxed">
                            「hazimeru.net」は、東京都内の市区町村および東京都が提供する公式Webサイトの情報を、横断的に素早く検索できるツールとして個人で運営しています。住民の方々が行政サービスや助成金情報などに、よりスムーズにアクセスできるよう支援することを目的としています。
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold border-l-4 border-primary pl-4 flex items-center gap-2">
                            プライバシーポリシー
                        </h2>

                        <div className="space-y-6">
                            <div className="bg-blue-50/50 rounded-xl p-6 border border-blue-100">
                                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                    <Info className="w-5 h-5 text-blue-500" />
                                    Google アナリティクスの利用について
                                </h3>
                                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                                    当サイトでは、サービスの向上および利便性の改善を目的として、Googleによるアクセス解析ツール「Google アナリティクス」を利用しています。
                                </p>
                                <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-2">
                                    <li>Googleアナリティクスは、トラフィックデータの収集のためにクッキー（Cookie）を使用しています。</li>
                                    <li>このトラフィックデータは匿名で収集されており、個人を特定するものではありません。</li>
                                    <li>この機能はブラウザの設定でCookieを無効にすることで、収集を拒否することが可能です。</li>
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <p className="text-muted-foreground leading-relaxed">
                                    Google アナリティクスの規約、およびGoogleのデータの取り扱い方法などの詳細は、以下のページをご覧ください。
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <a
                                        href="https://marketingplatform.google.com/about/analytics/terms/jp/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline text-sm font-medium"
                                    >
                                        Google アナリティクス利用規約 →
                                    </a>
                                    <a
                                        href="https://policies.google.com/technologies/partner-sites?hl=ja"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline text-sm font-medium"
                                    >
                                        Google プライバシー＆規約 →
                                    </a>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold border-l-4 border-primary pl-4 flex items-center gap-2">
                            Cookieの利用について
                        </h2>

                        <div className="space-y-6">
                            <p className="text-muted-foreground leading-relaxed">
                                当サイトでは、利便性向上を目的として Cookie および類似技術（LocalStorage）を利用しています。
                            </p>

                            {/* Site's own cookies */}
                            <div className="bg-green-50/50 rounded-xl p-6 border border-green-100">
                                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                    <Info className="w-5 h-5 text-green-600" />
                                    当サイト独自の Cookie
                                </h3>
                                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                                    当サイトでは、ユーザーの設定を記憶するために以下の Cookie / LocalStorage を使用しています。
                                    個人を特定する情報は一切含まれず、外部に送信されることもありません。
                                </p>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left border-collapse border border-green-100">
                                        <thead className="bg-green-100/50">
                                            <tr>
                                                <th className="p-3 font-bold text-slate-700 border border-green-100">名称</th>
                                                <th className="p-3 font-bold text-slate-700 border border-green-100">目的</th>
                                                <th className="p-3 font-bold text-slate-700 border border-green-100">保存期間</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-green-100">
                                            <tr className="hover:bg-green-50/30">
                                                <td className="p-3 font-mono text-xs text-slate-600 border border-green-100">selected_municipality_id</td>
                                                <td className="p-3 text-slate-600 border border-green-100">最後に選択した市区町村を記憶し、次回アクセス時に自動で設定します。</td>
                                                <td className="p-3 text-slate-500 border border-green-100">365日</td>
                                            </tr>
                                            <tr className="hover:bg-green-50/30">
                                                <td className="p-3 font-mono text-xs text-slate-600 border border-green-100">include_metro_results</td>
                                                <td className="p-3 text-slate-600 border border-green-100">「東京都（東京都庁サイト）を含む」のオン/オフ設定を記憶します。</td>
                                                <td className="p-3 text-slate-500 border border-green-100">365日</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-xs text-slate-400 mt-3">
                                    ※ これらはブラウザの設定でいつでも削除・無効化できます。
                                </p>
                            </div>

                            {/* Google Analytics cookies */}
                            <div className="bg-blue-50/50 rounded-xl p-6 border border-blue-100">
                                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                    <Info className="w-5 h-5 text-blue-500" />
                                    Google アナリティクスの利用について
                                </h3>
                                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                                    当サイトでは、サービスの向上および利便性の改善を目的として、Googleによるアクセス解析ツール「Google アナリティクス」を利用しています。
                                </p>
                                <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-2">
                                    <li>Googleアナリティクスは、トラフィックデータの収集のためにクッキー（Cookie）を使用しています。</li>
                                    <li>このトラフィックデータは匿名で収集されており、個人を特定するものではありません。</li>
                                    <li>この機能はブラウザの設定でCookieを無効にすることで、収集を拒否することが可能です。</li>
                                </ul>
                                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                                    <a
                                        href="https://marketingplatform.google.com/about/analytics/terms/jp/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline text-sm font-medium"
                                    >
                                        Google アナリティクス利用規約 →
                                    </a>
                                    <a
                                        href="https://policies.google.com/technologies/partner-sites?hl=ja"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline text-sm font-medium"
                                    >
                                        Google プライバシー＆規約 →
                                    </a>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold border-l-4 border-primary pl-4 flex items-center gap-2">
                            免責事項
                        </h2>
                        <p className="text-muted-foreground leading-relaxed">
                            当サイトの検索結果はGoogle カスタム検索エンジンによって提供されており、提示される情報の正確性や最新性について当サイト運営者が保証するものではありません。情報の最終的な確認は、必ず各自治体の公式サイト上で行ってください。当サイトを利用したことによって生じたいかなる損害についても、運営者は一切の責任を負いかねます。
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold border-l-4 border-primary pl-4 flex items-center gap-2">
                            運営者
                        </h2>
                        <p className="text-muted-foreground leading-relaxed">
                            IT Libero
                        </p>
                    </section>

                </div>

                <div className="mt-8 text-center">
                    <a href="/">
                        <Button variant="outline" className="rounded-full">
                            メインサイトに戻る
                        </Button>
                    </a>
                </div>
            </div>

            <Footer />
        </main>
    );
}
