'use client';

import { useState, useEffect } from 'react';
import { MapPin, ChevronDown, Check } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import municipalitiesData from '@/data/municipalities.json';

export interface Municipality {
    id: string;
    name: string;
    domain: string;
    kana: string;
    type: 'pref' | 'ward' | 'city' | 'town' | 'village';
}

const municipalities = municipalitiesData as Municipality[];

export const specialOptions: Municipality[] = [
    { id: 'all', name: 'すべて（都＋全市区町村）', domain: '', kana: 'すべて', type: 'pref' },
    { id: 'all_no_tokyo', name: '東京都を除く（全市区町村のみ）', domain: '', kana: 'とうきょうとをのぞく', type: 'pref' },
    { id: 'tokyo', name: '東京都庁のみ', domain: 'www.metro.tokyo.lg.jp', kana: 'とうきょうとちょうのみ', type: 'pref' },
];

const wards = municipalities.filter(m => m.type === 'ward');
const cities = municipalities.filter(m => m.type === 'city');
const townsVillages = municipalities.filter(m => m.type === 'town' || m.type === 'village');

interface RegionSelectorProps {
    onSelect: (municipality: Municipality) => void;
    selectedId?: string;
    includeMetro: boolean;
    onToggleMetro: (included: boolean) => void;
}

export function RegionSelector({ onSelect, selectedId, includeMetro, onToggleMetro }: RegionSelectorProps) {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<Municipality | null>(null);

    useEffect(() => {
        if (selectedId === 'all') {
            setSelected(specialOptions[0]);
        } else if (selectedId === 'all_no_tokyo') {
            setSelected(specialOptions[1]);
        } else if (selectedId === 'tokyo') {
            setSelected(specialOptions[2]);
        } else if (selectedId) {
            const m = municipalities.find(item => item.id === selectedId);
            if (m) setSelected(m);
        } else {
            // Default to Hachioji if nothing set
            const hachioji = municipalities.find(item => item.id === 'hachioji');
            if (hachioji) setSelected(hachioji);
        }
    }, [selectedId]);

    const handleSelect = (m: Municipality) => {
        setSelected(m);
        onSelect(m);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full md:w-[320px] justify-between h-12 text-lg border-2 border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all shadow-sm rounded-xl"
                >
                    <div className="flex items-center gap-2 truncate">
                        <MapPin className="h-5 w-5 text-primary shrink-0" />
                        <span className="font-bold text-foreground">
                            {selected ? `${selected.name}` : "地域を選択"}
                        </span>
                    </div>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[620px] max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl">
                <DialogHeader className="p-6 pb-2">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                <MapPin className="h-6 w-6 text-primary" />
                                検索対象の地域を選択
                            </DialogTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                広域検索または特定の自治体を選択してください。
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-2 p-3 bg-primary/5 rounded-xl border border-primary/10">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">東京都のサイト検索</span>
                            <Button
                                variant={includeMetro ? "default" : "outline"}
                                size="sm"
                                onClick={() => onToggleMetro(!includeMetro)}
                                className={`h-8 px-3 rounded-full text-xs transition-all ${!includeMetro ? "border-primary/30 text-primary" : ""}`}
                            >
                                {includeMetro ? "含める" : "含めない"}
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <Tabs defaultValue="all" className="flex-1 flex flex-col overflow-hidden px-6 pb-6">
                    <TabsList className="grid w-full grid-cols-4 mb-4">
                        <TabsTrigger value="all">全体</TabsTrigger>
                        <TabsTrigger value="ward">23区</TabsTrigger>
                        <TabsTrigger value="city">市部</TabsTrigger>
                        <TabsTrigger value="town">町村</TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-hidden border rounded-xl bg-gray-50/50">
                        <TabsContent value="all" className="h-full m-0">
                            <ScrollArea className="h-[400px] p-4">
                                <div className="flex flex-col gap-3">
                                    {specialOptions.map((m) => (
                                        <Button
                                            key={m.id}
                                            variant={selected?.id === m.id ? "default" : "outline"}
                                            className={`h-14 justify-start text-lg font-bold transition-all px-6 ${selected?.id === m.id ? "ring-2 ring-primary ring-offset-2" : "bg-white"
                                                }`}
                                            onClick={() => handleSelect(m)}
                                        >
                                            {selected?.id === m.id && <Check className="mr-3 h-5 w-5 shrink-0" />}
                                            {m.name}
                                        </Button>
                                    ))}
                                    <div className="mt-4 p-4 bg-primary/5 rounded-lg text-sm text-muted-foreground">
                                        各市区町村を選択すると、その自治体と東京都のサイトを同時に検索します。
                                    </div>
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="ward" className="h-full m-0">
                            <ScrollArea className="h-[400px] p-4">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {wards.map((m) => (
                                        <MunicipalityButton
                                            key={m.id}
                                            m={m}
                                            isSelected={selected?.id === m.id}
                                            onClick={() => handleSelect(m)}
                                        />
                                    ))}
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="city" className="h-full m-0">
                            <ScrollArea className="h-[400px] p-4">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {cities.map((m) => (
                                        <MunicipalityButton
                                            key={m.id}
                                            m={m}
                                            isSelected={selected?.id === m.id}
                                            onClick={() => handleSelect(m)}
                                        />
                                    ))}
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="town" className="h-full m-0">
                            <ScrollArea className="h-[400px] p-4">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {townsVillages.map((m) => (
                                        <MunicipalityButton
                                            key={m.id}
                                            m={m}
                                            isSelected={selected?.id === m.id}
                                            onClick={() => handleSelect(m)}
                                        />
                                    ))}
                                </div>
                            </ScrollArea>
                        </TabsContent>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

function MunicipalityButton({ m, isSelected, onClick }: { m: Municipality, isSelected: boolean, onClick: () => void }) {
    return (
        <Button
            variant={isSelected ? "default" : "outline"}
            className={`h-12 justify-start font-medium transition-all ${isSelected
                ? "ring-2 ring-primary ring-offset-2"
                : "hover:bg-white hover:border-primary/50 hover:text-primary"
                }`}
            onClick={onClick}
        >
            {isSelected && <Check className="mr-2 h-4 w-4 shrink-0" />}
            <span className="truncate">{m.name}</span>
        </Button>
    );
}
