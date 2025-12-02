
import React, { useState } from 'react';
import { PageData, ComparisonPair } from '../types';
import { Button, cn } from './ui';
import { Link2, ArrowRight, Trash2, Plus } from 'lucide-react';
import { INITIAL_ALIGNMENT } from '../constants';

interface PageMapperProps {
  pagesBefore: PageData[];
  pagesAfter: PageData[];
  pairs: ComparisonPair[];
  setPairs: (pairs: ComparisonPair[]) => void;
  onComplete: () => void;
}

export const PageMapper: React.FC<PageMapperProps> = ({
  pagesBefore,
  pagesAfter,
  pairs,
  setPairs,
  onComplete
}) => {
  const [selectedBeforeId, setSelectedBeforeId] = useState<string | null>(null);

  // Helper to check if a page is already paired
  const isPairedBefore = (id: string) => pairs.some(p => p.beforePage.id === id);
  const isPairedAfter = (id: string) => pairs.some(p => p.afterPage.id === id);

  // Get Pair ID if exists
  const getPairId = (pageId: string, side: 'before' | 'after') => {
    const pair = pairs.find(p => side === 'before' ? p.beforePage.id === pageId : p.afterPage.id === pageId);
    return pair ? pairs.indexOf(pair) + 1 : null;
  };

  const handleSelectBefore = (page: PageData) => {
    if (isPairedBefore(page.id)) return; // Already paired
    setSelectedBeforeId(page.id);
  };

  const handleSelectAfter = (page: PageData) => {
    if (!selectedBeforeId) return;
    if (isPairedAfter(page.id)) return; // Already paired

    const beforePage = pagesBefore.find(p => p.id === selectedBeforeId);
    if (!beforePage) return;

    // Create new Pair
    const newPair: ComparisonPair = {
      id: `pair-${Date.now()}`,
      name: `ページ ${beforePage.pageNumber} - ${page.pageNumber}`,
      beforePage: beforePage,
      afterPage: page,
      alignment: INITIAL_ALIGNMENT,
      results: [],
      totalTokens: 0,
      isAnalyzed: false
    };

    setPairs([...pairs, newPair]);
    setSelectedBeforeId(null);
  };

  const removePair = (pairId: string) => {
    setPairs(pairs.filter(p => p.id !== pairId));
  };

  // Auto-link logic (Simple index matching)
  const autoLink = () => {
    const newPairs: ComparisonPair[] = [];
    const count = Math.min(pagesBefore.length, pagesAfter.length);
    
    for (let i = 0; i < count; i++) {
      // Check if either is already paired
      if (isPairedBefore(pagesBefore[i].id) || isPairedAfter(pagesAfter[i].id)) continue;

      newPairs.push({
        id: `pair-${Date.now()}-${i}`,
        name: `ページ ${pagesBefore[i].pageNumber} - ${pagesAfter[i].pageNumber}`,
        beforePage: pagesBefore[i],
        afterPage: pagesAfter[i],
        alignment: INITIAL_ALIGNMENT,
        results: [],
        totalTokens: 0,
        isAnalyzed: false
      });
    }
    setPairs([...pairs, ...newPairs]);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-6 border-b border-google-border flex items-center justify-between bg-gray-50">
        <div>
          <h2 className="text-xl font-bold text-google-text">ページの紐付け (ペアリング)</h2>
          <p className="text-sm text-google-subtext mt-1">
            変更前と変更後の図面を選択して、比較するペアを作成してください。
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={autoLink}>自動ペアリング (順序)</Button>
          <Button 
            className="bg-google-blue text-white px-6" 
            onClick={onComplete}
            disabled={pairs.length === 0}
          >
            解析画面へ進む ({pairs.length}ペア) <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Column (Before) */}
        <div className="flex-1 border-r border-google-border flex flex-col bg-red-50/30">
          <div className="p-3 font-semibold text-google-subtext border-b border-google-border bg-white sticky top-0">
            変更前 (基準図)
          </div>
          <div className="overflow-y-auto p-4 space-y-4">
            {pagesBefore.map(page => {
              const pairIndex = getPairId(page.id, 'before');
              const isSelected = selectedBeforeId === page.id;
              
              return (
                <div 
                  key={page.id}
                  onClick={() => handleSelectBefore(page)}
                  className={cn(
                    "relative border-2 rounded-lg p-2 cursor-pointer transition-all bg-white hover:shadow-md",
                    isSelected ? "border-google-blue ring-2 ring-google-blue/20" : "border-transparent shadow-sm",
                    pairIndex ? "border-green-400 opacity-80" : "border-gray-200"
                  )}
                >
                  <img src={page.url} className="w-full h-auto object-contain border bg-gray-100" />
                  <div className="mt-2 text-xs font-medium text-center truncate">{page.fileName} (P.{page.pageNumber})</div>
                  
                  {pairIndex && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                      {pairIndex}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Middle Connector Area (Visual Only) */}
        <div className="w-16 flex flex-col items-center justify-center bg-gray-50 border-r border-google-border">
           <Link2 className="text-google-subtext opacity-20" size={32} />
        </div>

        {/* Right Column (After) */}
        <div className="flex-1 border-r border-google-border flex flex-col bg-blue-50/30">
          <div className="p-3 font-semibold text-google-subtext border-b border-google-border bg-white sticky top-0">
            変更後 (対象図)
          </div>
          <div className="overflow-y-auto p-4 space-y-4">
            {pagesAfter.map(page => {
              const pairIndex = getPairId(page.id, 'after');
              
              return (
                <div 
                  key={page.id}
                  onClick={() => handleSelectAfter(page)}
                  className={cn(
                    "relative border-2 rounded-lg p-2 cursor-pointer transition-all bg-white hover:shadow-md",
                    selectedBeforeId && !pairIndex ? "border-dashed border-google-blue bg-blue-50" : "border-transparent shadow-sm",
                    pairIndex ? "border-green-400 opacity-80" : "border-gray-200"
                  )}
                >
                  <img src={page.url} className="w-full h-auto object-contain border bg-gray-100" />
                  <div className="mt-2 text-xs font-medium text-center truncate">{page.fileName} (P.{page.pageNumber})</div>

                  {pairIndex && (
                    <div className="absolute top-2 left-2 bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                      {pairIndex}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Pairs List (Right Sidebar) */}
        <div className="w-72 bg-white flex flex-col border-l border-google-border">
          <div className="p-3 font-semibold text-google-subtext border-b border-google-border">
            作成されたペア ({pairs.length})
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {pairs.length === 0 && (
              <div className="text-center text-gray-400 text-sm mt-10">
                ペアがありません。<br/>左の画像を選択してから<br/>右の画像を選択してください。
              </div>
            )}
            {pairs.map((pair, idx) => (
              <div key={pair.id} className="p-3 bg-gray-50 rounded border border-gray-200 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="text-xs">
                    <div className="font-medium text-gray-700">P.{pair.beforePage.pageNumber} → P.{pair.afterPage.pageNumber}</div>
                    <div className="text-gray-500 truncate w-32 text-[10px]">{pair.beforePage.fileName}</div>
                  </div>
                </div>
                <button 
                  onClick={() => removePair(pair.id)}
                  className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
