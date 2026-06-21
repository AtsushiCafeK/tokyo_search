'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShieldAlert, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
    { name: 'トップ', href: '/', icon: Home },
    // 電車遅延情報(/trains)は一旦非公開（リンクのみ削除・ページは残置）
    { name: 'メールけいしちょうDB', href: '/alerts', icon: ShieldAlert },
    { name: '開発ロードマップ', href: '/roadmap', icon: BarChart3 },
];

export function Navigation() {
    const pathname = usePathname();

    return (
        <nav className="flex justify-center items-center gap-1 sm:gap-4 py-4 mb-2">
            {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                            isActive
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
                        )}
                    >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
