'use client';

import { MessageSquare, ExternalLink } from 'lucide-react';

export function Footer() {
    return (
        <footer className="w-full py-12 text-center text-sm text-muted-foreground border-t mt-auto bg-white flex-shrink-0 font-sans">
            <div className="max-w-5xl mx-auto px-4 space-y-8">
                {/* Main Links */}
                <div className="flex flex-col md:flex-row justify-center items-center gap-6 md:gap-10">
                    <a
                        href="https://forms.gle/sdD4n9DHBGoYXGq16"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-primary hover:underline font-medium bg-primary/5 px-5 py-2.5 rounded-full transition-colors"
                    >
                        <MessageSquare className="w-4 h-4" />
                        サービス改善アンケートにご協力ください
                    </a>                </div>

                {/* Sub Links */}
                <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-3 text-xs tracking-tight text-slate-500">
                    <div className="flex items-center gap-1">
                        <span>運営者:</span>
                        <a
                            href="https://it-libero.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary hover:underline decoration-primary/30 transition-colors flex items-center gap-0.5"
                        >
                            IT LIBERO
                            <ExternalLink className="w-3 h-3 opacity-50" />
                        </a>
                    </div>
                    <a href="/policy" className="hover:text-primary transition-colors underline underline-offset-4 decoration-slate-300">
                        サイトポリシー
                    </a>
                    <a href="/fraud" className="hover:text-primary transition-colors underline underline-offset-4 decoration-slate-300">
                        詐欺対策
                    </a>
                    <a href="/roadmap" className="hover:text-primary transition-colors underline underline-offset-4 decoration-slate-300">
                        開発ロードマップ
                    </a>
                    <a href="/alerts" className="hover:text-primary transition-colors underline underline-offset-4 decoration-slate-300">
                        メールけいしちょうDB
                    </a>
                </div>

                {/* Copyright & QR */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-8 pt-4 border-t border-slate-50">
                    <div className="space-y-2 max-w-xs">
                        <p className="text-[11px] opacity-80">© 2026 IT Libero</p>
                        <p className="text-[10px] leading-relaxed opacity-60">
                            このサイトは自治体とは無関係の独自に作成されたGoogle検索ページです
                        </p>
                    </div>

                    {/* QR Code Induction (PC Only) */}
                    <div className="hidden md:flex items-center gap-4 pl-8 border-l border-slate-100">
                        <div className="text-right space-y-1">
                            <p className="text-[10px] font-medium text-slate-500">モバイル版はこちら</p>
                            <p className="text-[9px] text-slate-400 leading-tight">スマホからQRコードで<br />アクセスできます。</p>
                        </div>
                        <div className="p-1.5 bg-white border border-slate-100 rounded-lg shadow-sm">
                            <img
                                src="/qrcode_hazimeru_net.png"
                                alt="QR Code for hazimeru.net"
                                className="w-16 h-16 opacity-80"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
