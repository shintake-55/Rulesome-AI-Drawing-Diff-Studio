
import React, { useState } from 'react';
import { 
  Move, Search, Layers, Upload,
  ZoomIn, RotateCw, FileInput, AlertCircle, CheckCircle2, FileText, Zap, Cpu, Settings
} from 'lucide-react';
import { Button, Slider, SectionHeader, Badge, cn } from './ui';
import { AlignmentState, DetectionSettings, DiffItem, ChangeType, ComparisonPair } from '../types';

interface SidebarProps {
  width: number;
  setWidth: (w: number) => void;
  // Current Active Pair Props
  activePair: ComparisonPair | null;
  updateActivePairAlignment: (fn: (prev: AlignmentState) => AlignmentState) => void;
  
  settings: DetectionSettings;
  setSettings: (s: DetectionSettings) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  
  selectedResultId: number | null;
  onSelectResult: (id: number) => void;
  
  // Navigation
  onReconfigure: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  width, setWidth,
  activePair, updateActivePairAlignment,
  settings, setSettings,
  onAnalyze, isAnalyzing,
  selectedResultId, onSelectResult,
  onReconfigure
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'analysis'>('analysis');
  const [isResizing, setIsResizing] = useState(false);

  // Resize logic
  const startResizing = React.useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = Math.min(Math.max(e.clientX, 300), 800);
        setWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setWidth]);

  if (!activePair) return <div style={{ width }} className="bg-white border-r border-google-border"></div>;

  const results = activePair.results;
  const alignment = activePair.alignment;
  const totalTokens = activePair.totalTokens;

  const adjustAlignment = (key: keyof AlignmentState, delta: number) => {
    updateActivePairAlignment(prev => ({ ...prev, [key]: prev[key] + delta }));
  };

  const resetAlignment = () => {
    updateActivePairAlignment(prev => ({ ...prev, x: 0, y: 0, scale: 1, rotation: 0 }));
  }

  const stats = {
    total: results.length,
    added: results.filter(r => r.type === ChangeType.ADDED).length,
    removed: results.filter(r => r.type === ChangeType.REMOVED).length,
    other: results.filter(r => r.type === ChangeType.MODIFIED || r.type === ChangeType.MOVED).length
  };

  return (
    <div 
      className="h-full bg-white border-r border-google-border flex flex-col relative shadow-xl z-20"
      style={{ width }}
    >
      {/* Tabs */}
      <div className="flex border-b border-google-border bg-google-gray/30">
        <button 
          onClick={() => setActiveTab('analysis')}
          className={cn("flex-1 py-3 text-xs font-medium flex flex-col items-center gap-1 border-b-2 transition-colors", activeTab === 'analysis' ? "border-google-blue text-google-blue bg-white" : "border-transparent text-google-subtext hover:bg-white/50")}
        >
          <Search size={16} />
          解析・補正
        </button>
        <button 
          onClick={() => setActiveTab('info')}
          className={cn("flex-1 py-3 text-xs font-medium flex flex-col items-center gap-1 border-b-2 transition-colors", activeTab === 'info' ? "border-google-blue text-google-blue bg-white" : "border-transparent text-google-subtext hover:bg-white/50")}
        >
          <Settings size={16} />
          ペア情報
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-0">
        
        {/* PAIR INFO TAB */}
        {activeTab === 'info' && (
          <div className="p-4 space-y-6">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
               <h3 className="font-bold text-sm text-blue-900 mb-2">{activePair.name}</h3>
               <div className="space-y-2 text-xs text-blue-800">
                  <div className="flex justify-between">
                     <span>変更前:</span>
                     <span className="font-mono">{activePair.beforePage.fileName} (P.{activePair.beforePage.pageNumber})</span>
                  </div>
                  <div className="flex justify-between">
                     <span>変更後:</span>
                     <span className="font-mono">{activePair.afterPage.fileName} (P.{activePair.afterPage.pageNumber})</span>
                  </div>
               </div>
            </div>

            <Button variant="secondary" className="w-full" onClick={onReconfigure}>
               ペア構成を変更する
            </Button>
          </div>
        )}

        {/* ANALYSIS TAB */}
        {activeTab === 'analysis' && (
          <div className="pb-20">
            {/* 1. Alignment Section (Top) */}
            <div className="p-4 border-b border-google-border bg-white">
               <div className="flex items-center justify-between mb-3">
                 <h4 className="text-xs font-semibold text-google-subtext flex items-center gap-2">
                   <Move size={12}/> 位置補正・重ね合わせ
                 </h4>
                 <span className="text-[10px] font-mono font-medium text-google-subtext bg-gray-100 px-2 py-0.5 rounded">
                   X:{alignment.x > 0 ? '+' : ''}{alignment.x.toFixed(0)} Y:{alignment.y > 0 ? '+' : ''}{alignment.y.toFixed(0)}
                 </span>
               </div>
               
               {/* Directional Pad */}
               <div className="grid grid-cols-3 gap-2 mb-4">
                 <div className="col-span-3 flex justify-center gap-2">
                    <Button variant="secondary" onClick={() => adjustAlignment('y', -1)}>↑</Button>
                 </div>
                 <div className="col-span-3 flex justify-center gap-2">
                    <Button variant="secondary" onClick={() => adjustAlignment('x', -1)}>←</Button>
                    <Button variant="secondary" onClick={resetAlignment} title="Reset">●</Button>
                    <Button variant="secondary" onClick={() => adjustAlignment('x', 1)}>→</Button>
                 </div>
                 <div className="col-span-3 flex justify-center gap-2">
                    <Button variant="secondary" onClick={() => adjustAlignment('y', 1)}>↓</Button>
                 </div>
               </div>
               
               <div className="space-y-4">
                  <Slider label="拡大率" value={alignment.scale} min={0.800} max={1.200} step={0.001} unit="x" onChange={(v) => updateActivePairAlignment(prev => ({ ...prev, scale: v }))} />
                  <Slider label="回転" value={alignment.rotation} min={-10} max={10} step={0.1} unit="°" onChange={(v) => updateActivePairAlignment(prev => ({ ...prev, rotation: v }))} />
                  <Slider label="透明度" value={alignment.opacity} min={0} max={1} step={0.05} unit="" onChange={(v) => updateActivePairAlignment(prev => ({ ...prev, opacity: v }))} />
               </div>
            </div>

            {/* 2. Detection Controls */}
            <div className="p-4 border-b border-google-border bg-google-gray/10">
              <h4 className="text-xs font-semibold text-google-subtext mb-3 flex items-center gap-2"><Search size={12}/> 検出設定</h4>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Button 
                  className={cn("h-12 text-xs flex flex-col gap-1", settings.mode === 'MACRO' ? "ring-2 ring-google-blue" : "opacity-70")}
                  variant={settings.mode === 'MACRO' ? 'primary' : 'secondary'}
                  onClick={() => setSettings({ ...settings, mode: 'MACRO' })}
                >
                  <span className="font-bold">全体 / マクロ</span>
                  <span className="text-[9px] font-normal opacity-80">部屋・構造変更</span>
                </Button>
                <Button 
                  className={cn("h-12 text-xs flex flex-col gap-1", settings.mode === 'MICRO' ? "ring-2 ring-google-blue" : "opacity-70")}
                  variant={settings.mode === 'MICRO' ? 'primary' : 'secondary'}
                  onClick={() => setSettings({ ...settings, mode: 'MICRO' })}
                >
                  <span className="font-bold flex items-center gap-1"><Zap size={10}/> 詳細 / ミクロ</span>
                  <span className="text-[9px] font-normal opacity-80">設備・電気・配線</span>
                </Button>
              </div>

              <Button 
                className="w-full h-10 font-bold shadow-md bg-gradient-to-r from-google-blue to-indigo-600 hover:from-google-blueHover hover:to-indigo-700 text-white border-none" 
                onClick={onAnalyze}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? "解析中..." : "現在のペアを解析"}
              </Button>
            </div>

            {/* 3. Results List */}
            {results.length > 0 && (
              <div>
                <SectionHeader title={`検出結果 (${stats.total}件)`} icon={<Layers size={14} />} />
                
                <div className="flex text-[10px] font-medium text-white">
                  <div className="bg-green-500 h-1" style={{ width: `${(stats.added/stats.total)*100}%` }}></div>
                  <div className="bg-red-500 h-1" style={{ width: `${(stats.removed/stats.total)*100}%` }}></div>
                  <div className="bg-blue-500 h-1" style={{ width: `${(stats.other/stats.total)*100}%` }}></div>
                </div>

                <div className="divide-y divide-google-border">
                  {results.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => onSelectResult(item.id)}
                      className={cn(
                        "p-4 cursor-pointer transition-colors hover:bg-google-gray/50 group",
                        selectedResultId === item.id ? "bg-blue-50 border-l-4 border-l-google-blue" : "border-l-4 border-l-transparent"
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-google-subtext font-bold">{item.displayId}</span>
                          <Badge type={item.type} />
                          {item.category === 'WIRING' && <span className="text-[10px] bg-gray-100 px-1 rounded border border-gray-200 text-gray-600">配線</span>}
                        </div>
                      </div>
                      <h4 className="text-sm font-medium text-google-text mb-1 group-hover:text-google-blue transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-xs text-google-subtext leading-normal line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>

                {totalTokens !== undefined && (
                   <div className="p-4 text-center border-t border-google-border">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-[10px] text-gray-500">
                        <Cpu size={10} /> 推定消費トークン: {totalTokens.toLocaleString()} tokens
                      </div>
                   </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div 
        className={cn(
          "absolute top-0 bottom-0 right-0 w-1 cursor-ew-resize hover:bg-google-blue/50 z-30 transition-colors",
          isResizing ? "bg-google-blue" : "bg-transparent"
        )}
        onMouseDown={startResizing}
      />
    </div>
  );
};
