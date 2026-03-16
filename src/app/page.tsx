'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { SearchBar } from '@/components/SearchBar';
import { RegionSelector, Municipality, specialOptions } from '@/components/RegionSelector';
import { Building, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/Footer';
import { Navigation } from '@/components/Navigation';
import municipalitiesData from '@/data/municipalities.json';
import { setCookie, getCookie } from '@/utils/cookies';

export default function Home() {
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedMunicipality, setSelectedMunicipality] = useState<Municipality | null>(null);
  const [includeMetro, setIncludeMetro] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll detection for back-to-top button
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);

    // Load saved municipality or default to Hachioji
    const cookieId = getCookie('selected_municipality_id');
    const localId = localStorage.getItem('selected_municipality_id');
    const savedId = cookieId || localId;

    const cookieIncludeMetro = getCookie('include_metro_results');
    const localIncludeMetro = localStorage.getItem('include_metro_results');
    const savedIncludeMetro = cookieIncludeMetro || localIncludeMetro;

    if (savedIncludeMetro !== null) {
      setIncludeMetro(savedIncludeMetro === 'true');
    }

    const municipalities = municipalitiesData as Municipality[];
    const allOptions = [...municipalities, ...specialOptions];
    const initial = allOptions.find(m => m.id === (savedId || 'hachioji')) || municipalities[0];
    setSelectedMunicipality(initial);

    // Google Custom Search Engineの初期設定
    const cx = process.env.NEXT_PUBLIC_GOOGLE_CX || 'YOUR_SEARCH_ENGINE_ID_HERE';

    window.__gcse = {
      parsetags: 'explicit',
      initializationCallback: function () {
        if (document.readyState === 'complete') {
          renderSearchElement();
        } else {
          window.google?.setOnLoadCallback(renderSearchElement, true);
        }
      }
    };

    function renderSearchElement() {
      window.google?.search.cse.element.render({
        div: "search-results",
        tag: 'searchresults-only',
        attributes: {
          linktarget: '_blank',
        }
      });
    }

    if (!document.getElementById('gcs-script')) {
      const script = document.createElement('script');
      script.id = 'gcs-script';
      script.src = `https://cse.google.com/cse.js?cx=${cx}`;
      script.async = true;
      document.head.appendChild(script);
    }

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleRegionSelect = (municipality: Municipality) => {
    setSelectedMunicipality(municipality);
    localStorage.setItem('selected_municipality_id', municipality.id);
    setCookie('selected_municipality_id', municipality.id);
  };

  const handleToggleMetro = (included: boolean) => {
    setIncludeMetro(included);
    localStorage.setItem('include_metro_results', String(included));
    setCookie('include_metro_results', String(included));
  };

  const handleSearch = (query: string) => {
    if (!query.trim() || !selectedMunicipality) return;

    setHasSearched(true);

    // Construct query with site filters
    let finalQuery = query;
    const metroDomain = 'www.metro.tokyo.lg.jp';

    if (selectedMunicipality.id === 'all') {
      // Everything (no filters needed if CSE is configured correctly)
      // If includeMetro is false, we might want to exclude metro even here.
      finalQuery = includeMetro ? query : `${query} -site:${metroDomain}`;
    } else if (selectedMunicipality.id === 'all_no_tokyo') {
      // Everything EXCEPT Tokyo Metro (override toggle as the choice itself says "Exclude")
      finalQuery = `${query} -site:${metroDomain}`;
    } else if (selectedMunicipality.id === 'tokyo') {
      // Only Tokyo Metro
      finalQuery = `${query} site:${metroDomain}`;
    } else {
      // Specific Municipality + Tokyo Metro (Respect toggle)
      if (includeMetro) {
        const siteFilters = `site:${selectedMunicipality.domain} OR site:${metroDomain}`;
        finalQuery = `${query} (${siteFilters})`;
      } else {
        finalQuery = `${query} site:${selectedMunicipality.domain}`;
      }
    }

    const url = new URL(window.location.href);
    url.searchParams.set('q', query);
    window.history.pushState({}, '', url);

    if (window.google?.search?.cse) {
      try {
        const element = window.google.search.cse.element.getElement('searchresults-only0');
        if (element) {
          element.execute(finalQuery);
        }
      } catch (e) {
        console.warn("Google CSE execute failed", e);
      }
    }

    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="min-h-screen bg-gray-50/50 flex flex-col items-center">
      <div className={`w-full bg-white border-b border-gray-200 shadow-sm relative transition-all duration-500 ease-in-out ${hasSearched ? 'py-12' : 'flex-grow flex items-center justify-center min-h-[70vh]'} overflow-hidden`}>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
        <div className="w-full max-w-5xl mx-auto px-4 relative z-10 flex flex-col items-center text-center space-y-6">
          <div className="p-4 bg-primary/10 rounded-2xl mb-2">
            <Building className={`text-primary transition-all duration-500 ${hasSearched ? 'w-8 h-8' : 'w-12 h-12'}`} />
          </div>
          <h1 className={`font-extrabold text-foreground tracking-tight py-2 transition-all duration-500 ${hasSearched ? 'text-2xl md:text-3xl' : 'text-3xl md:text-5xl'}`}>
            hazimeru.net <span className="text-primary font-bold text-xl md:text-3xl block md:inline mt-1 md:mt-0">東京都+市区町村 横断検索</span>
          </h1>

          <p className={`text-muted-foreground max-w-2xl transition-all duration-500 ${hasSearched ? 'text-base hidden md:block' : 'text-lg md:text-xl pb-2'}`}>
            東京都内すべての市区町村と東京都の公式Webサイトから、必要な情報を素早く検索します。
          </p>

          <Navigation />

          <div className="w-full max-w-3xl mt-8 space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <RegionSelector
                selectedId={selectedMunicipality?.id}
                onSelect={handleRegionSelect}
                includeMetro={includeMetro}
                onToggleMetro={handleToggleMetro}
              />
              <div className="w-full">
                <SearchBar onSearch={handleSearch} isLoading={false} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={resultsRef}
        className={`w-full max-w-5xl mx-auto px-4 transition-all duration-700 ${hasSearched ? 'opacity-100 py-8 min-h-[50vh]' : 'opacity-0 h-0 overflow-hidden'}`}
      >
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 md:p-6 mb-8 w-full min-h-[80vh] flex flex-col">
          <div id="search-results" className="w-full"></div>

          {!hasSearched && (
            <div className="text-center text-muted-foreground py-12">
              検索を実行するとここに結果が表示されます
            </div>
          )}
        </div>
      </div>

      <Footer />

      {/* Back to top button */}
      <Button
        className={`fixed bottom-8 right-8 rounded-full shadow-2xl transition-all duration-500 z-50 w-20 h-20 bg-slate-900 border-none hover:bg-slate-800 text-white flex flex-col items-center justify-center gap-1 group border-2 border-white/20 ${showScrollTop ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-75 pointer-events-none'
          }`}
        onClick={scrollToTop}
        aria-label="ページ上部へ戻る"
      >
        <ArrowUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
        <span className="text-[11px] font-bold tracking-tighter leading-none">上部へ戻る</span>
      </Button>
    </main>
  );
}
