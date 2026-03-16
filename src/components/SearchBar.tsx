'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SearchBarProps {
    onSearch: (query: string) => void;
    isLoading?: boolean;
}

const QUICK_TAGS = ['ふるさと納税', '住民票', '引越し', '健康保険', '年金', 'ゴミ', '害獣', '税金', '令和8年予算', '補助金', '保育園', '給付金'];

export function SearchBar({ onSearch, isLoading = false }: SearchBarProps) {
    const [query, setQuery] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query.trim());
        }
    };

    const handleTagClick = (tag: string) => {
        setQuery(tag);
        onSearch(tag);
    };

    return (
        <div className="w-full max-w-3xl mx-auto space-y-6">
            <form onSubmit={handleSubmit} className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                </div>
                <Input
                    type="search"
                    placeholder="自治体の情報を検索する（例: 耐震診断 補助金）"
                    className="pl-10 pr-24 py-6 text-lg rounded-full shadow-sm border-muted-foreground/20 focus-visible:ring-primary/50 transition-all bg-background/80 backdrop-blur-sm"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={isLoading}
                />
                <div className="absolute inset-y-1 right-1 flex items-center">
                    <Button
                        type="submit"
                        disabled={isLoading || !query.trim()}
                        className="rounded-full px-6 transition-all"
                        size="sm"
                    >
                        {isLoading ? '検索中...' : '検索'}
                    </Button>
                </div>
            </form>

            <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-sm text-muted-foreground mr-2 font-medium">よく検索されるキーワード:</span>
                {QUICK_TAGS.map((tag) => (
                    <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors px-3 py-1 text-sm rounded-full"
                        onClick={() => handleTagClick(tag)}
                    >
                        {tag}
                    </Badge>
                ))}
            </div>
        </div>
    );
}
