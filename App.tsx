
import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ImageViewer } from './components/ImageViewer';
import { PageMapper } from './components/PageMapper';
import { INITIAL_ALIGNMENT, INITIAL_VIEW } from './constants';
import { AlignmentState, DetectionSettings, ViewState, DiffItem, AppPhase, PageData, ComparisonPair } from './types';
import { Eye, EyeOff, LayoutTemplate, Upload, CheckCircle2, ChevronDown, Download, Layers } from 'lucide-react';
import { Button, cn } from './components/ui';
import { analyzeImageDiff, downloadCompositeImage, processFileToPages, generateBatchZip } from './utils';

// --- Canvas Ripple Effect Component (Kept as is) ---
const CanvasRipple = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ripplesRef = useRef<{x: number, y: number, radius: number, alpha: number}[]>([]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const addRipple = (e: MouseEvent) => {
      ripplesRef.current.push({
        x: e.clientX,
        y: e.clientY,
        radius: 1,
        alpha: 0.5
      });
    };
    window.addEventListener('mousemove', addRipple);

    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
        const r = ripplesRef.current[i];
        r.radius += 3;
        r.alpha -= 0.01;

        if (r.alpha <= 0) {
          ripplesRef.current.splice(i, 1);
        } else {
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(6, 182, 212, ${r.alpha})`; 
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = `rgba(6, 182, 212, ${r.alpha * 0.1})`;
          ctx.fill();
        }
      }
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', addRipple);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />;
};

export default function App() {
  const [phase, setPhase] = useState<AppPhase>('UPLOAD');
  const [sidebarWidth, setSidebarWidth] = useState(360);
  
  // Data State
  const [pagesBefore, setPagesBefore] = useState<PageData[]>([]);
  const [pagesAfter, setPagesAfter] = useState<PageData[]>([]);
  const [pairs, setPairs] = useState<ComparisonPair[]>([]);
  const [activePairId, setActivePairId] = useState<string | null>(null);

  // View State
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [selectedResultId, setSelectedResultId] = useState<number | null>(null);
  const [view, setView] = useState<ViewState>(INITIAL_VIEW);
  
  // Settings & Toggles
  const [settings, setSettings] = useState<DetectionSettings>({
    sensitivity: 75,
    minArea: 100,         
    mergeDistance: 40, 
    mode: 'MICRO'         
  });
  const [showBefore, setShowBefore] = useState(true);
  const [showAfter, setShowAfter] = useState(true);
  const [showDiff, setShowDiff] = useState(true);

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string>("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const activePair = pairs.find(p => p.id === activePairId) || null;

  // --- Handlers ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const allPages: PageData[] = [];
      
      for (const file of files) {
        const pages = await processFileToPages(file);
        allPages.push(...pages);
      }

      if (type === 'before') setPagesBefore(prev => [...prev, ...allPages]);
      else setPagesAfter(prev => [...prev, ...allPages]);
    }
  };

  const handleMappingComplete = () => {
    setPhase('ANALYSIS');
    if (pairs.length > 0) {
      setActivePairId(pairs[0].id);
    }
  };

  const handleReconfigure = () => {
    setPhase('MAPPING');
    setActivePairId(null);
  };

  const updateActivePairAlignment = (fn: (prev: AlignmentState) => AlignmentState) => {
    if (!activePairId) return;
    setPairs(prev => prev.map(p => {
      if (p.id === activePairId) {
        return { ...p, alignment: fn(p.alignment) };
      }
      return p;
    }));
  };

  const handleAnalyzeActivePair = async () => {
    if (!activePair) return;

    abortControllerRef.current = new AbortController();
    setIsAnalyzing(true);
    setProgressMsg(`ペア ${activePair.name} を解析中...`);
    
    // Clear previous results for this pair
    setPairs(prev => prev.map(p => p.id === activePair.id ? { ...p, results: [], totalTokens: 0 } : p));
    setSelectedResultId(null);

    try {
      await new Promise(r => requestAnimationFrame(r));
      
      const { items, totalTokens } = await analyzeImageDiff(
        activePair.beforePage.url, 
        activePair.afterPage.url, 
        activePair.alignment,
        settings.mode === 'ELECTRICAL' ? 'MICRO' : settings.mode as 'MACRO' | 'MICRO',
        settings.mergeDistance,
        (msg) => setProgressMsg(msg),
        abortControllerRef.current.signal
      );

      if (items.length === 0) alert("差分が検出されませんでした。");
      
      setPairs(prev => prev.map(p => {
        if (p.id === activePair.id) {
          return { ...p, results: items, totalTokens, isAnalyzed: true };
        }
        return p;
      }));
      setShowDiff(true);

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Analysis error:", error);
        alert("解析中にエラーが発生しました。");
      }
    } finally {
      setIsAnalyzing(false);
      abortControllerRef.current = null;
    }
  };

  const handleExportCurrent = () => {
    if (!activePair) return;
    downloadCompositeImage(
      activePair.beforePage.url, 
      activePair.afterPage.url, 
      activePair.alignment, 
      activePair.results
    );
    setShowExportMenu(false);
  };

  const handleExportBatch = () => {
    generateBatchZip(pairs);
    setShowExportMenu(false);
  };

  const handleRequestCancel = () => setShowCancelConfirm(true);

  const confirmCancel = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setIsAnalyzing(false);
    setShowCancelConfirm(false);
  };

  const ignoreCancel = () => setShowCancelConfirm(false);

  const handleSelectResult = (id: number) => {
    setSelectedResultId(id);
    const item = activePair?.results.find(r => r.id === id);
    
    if (item && imageSize.width > 0 && imageSize.height > 0) {
      const cx = item.box.x + item.box.width / 2;
      const cy = item.box.y + item.box.height / 2;
      const targetZoom = 1.6;
      const imgCenterX = imageSize.width / 2;
      const imgCenterY = imageSize.height / 2;
      
      setView({
        zoom: targetZoom,
        panX: -(cx - imgCenterX) * targetZoom,
        panY: -(cy - imgCenterY) * targetZoom
      });
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.shiftKey && activePairId) {
         const delta = 1;
         // Note: direct usage of setPairs here might be complex due to closure stale state
         // Handled via updateActivePairAlignment in Sidebar usually, but global shortcuts need care.
         // Omitting specific shortcut impl here for brevity, rely on Sidebar buttons.
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePairId]);

  return (
    <div className="flex flex-col h-screen bg-white text-google-text font-sans">
      <header className="h-14 border-b border-google-border bg-white flex items-center justify-between px-4 z-30 shrink-0">
        <div className="flex items-center gap-3">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 2L3.87564 9V23L16 30L28.1244 23V9L16 2Z" fill="#FBC02D" stroke="#FBC02D" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M16 16V30M3.87564 9L16 16L28.1244 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 16L28.1244 9V23L16 30V16Z" fill="white" fillOpacity="0.2"/>
            <path d="M16 16L3.87564 9V23L16 30V16Z" fill="black" fillOpacity="0.05"/>
          </svg>
          <div>
            <h1 className="text-lg font-bold text-gray-800 tracking-tight">Rulesome AI Drawing Diff Studio</h1>
          </div>
        </div>

        {/* Phase Indicator or Tabs */}
        {phase === 'ANALYSIS' && (
           <div className="flex-1 flex justify-center px-4 overflow-x-auto">
             <div className="flex gap-1">
               {pairs.map((pair, idx) => (
                 <button
                   key={pair.id}
                   onClick={() => setActivePairId(pair.id)}
                   className={cn(
                     "px-3 py-1.5 text-xs font-medium rounded-t-md border-b-2 transition-colors flex items-center gap-2",
                     activePairId === pair.id 
                       ? "border-google-blue text-google-blue bg-blue-50/50" 
                       : "border-transparent text-gray-500 hover:bg-gray-50"
                   )}
                 >
                   <span className="bg-gray-200 text-gray-600 rounded-full w-4 h-4 flex items-center justify-center text-[9px]">{idx + 1}</span>
                   {pair.name}
                 </button>
               ))}
             </div>
           </div>
        )}

        {/* View Controls & Export */}
        <div className="flex items-center gap-2">
           {phase === 'ANALYSIS' && (
             <div className="flex bg-gray-100 rounded-md p-1 gap-1 mr-4">
               <button onClick={() => setShowBefore(!showBefore)} className={cn("px-2 py-1 text-xs rounded flex items-center gap-1.5", showBefore ? "bg-white shadow-sm text-google-blue" : "text-google-subtext")}>
                 {showBefore ? <Eye size={12}/> : <EyeOff size={12}/>} Before
               </button>
               <button onClick={() => setShowAfter(!showAfter)} className={cn("px-2 py-1 text-xs rounded flex items-center gap-1.5", showAfter ? "bg-white shadow-sm text-google-blue" : "text-google-subtext")}>
                 {showAfter ? <Eye size={12}/> : <EyeOff size={12}/>} After
               </button>
               <button onClick={() => setShowDiff(!showDiff)} className={cn("px-2 py-1 text-xs rounded flex items-center gap-1.5 font-medium", showDiff ? "bg-purple-600 text-white shadow-sm" : "text-google-subtext hover:text-gray-900")}>
                 <LayoutTemplate size={12}/> Diff
               </button>
             </div>
           )}

           {phase === 'ANALYSIS' && (
             <div className="relative">
               <Button variant="secondary" className="h-8 text-xs gap-1" onClick={() => setShowExportMenu(!showExportMenu)}>
                 エクスポート <ChevronDown size={12}/>
               </Button>
               {showExportMenu && (
                 <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-google-border shadow-xl rounded-md z-50 py-1">
                   <button onClick={handleExportCurrent} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                     <Download size={14}/> 現在のペア (PNG)
                   </button>
                   <button onClick={handleExportBatch} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                     <Layers size={14}/> 全ペア一括 (ZIP)
                   </button>
                 </div>
               )}
             </div>
           )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Phase 1: Upload */}
        {phase === 'UPLOAD' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50">
             <div className="max-w-4xl w-full grid grid-cols-2 gap-8">
               {/* Before Upload */}
               <div className="bg-white p-8 rounded-xl border-2 border-dashed border-gray-300 hover:border-google-blue transition-colors text-center group">
                 <div className="mb-4 bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-google-blue group-hover:scale-110 transition-transform">
                   <Upload size={32} />
                 </div>
                 <h2 className="text-lg font-bold text-gray-700 mb-2">変更前 (基準図)</h2>
                 <p className="text-sm text-gray-500 mb-6">PDF または 画像ファイル</p>
                 <label className="inline-block">
                   <span className="bg-google-blue text-white px-6 py-2 rounded-md font-medium cursor-pointer hover:bg-blue-600 transition-colors">ファイルを選択</span>
                   <input type="file" multiple accept=".pdf,image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'before')} />
                 </label>
                 {pagesBefore.length > 0 && (
                   <div className="mt-4 text-sm text-green-600 font-medium flex items-center justify-center gap-2">
                     <CheckCircle2 size={16}/> {pagesBefore.length} ページ読み込み済み
                   </div>
                 )}
               </div>

               {/* After Upload */}
               <div className="bg-white p-8 rounded-xl border-2 border-dashed border-gray-300 hover:border-google-blue transition-colors text-center group">
                 <div className="mb-4 bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-red-500 group-hover:scale-110 transition-transform">
                   <Upload size={32} />
                 </div>
                 <h2 className="text-lg font-bold text-gray-700 mb-2">変更後 (対象図)</h2>
                 <p className="text-sm text-gray-500 mb-6">PDF または 画像ファイル</p>
                 <label className="inline-block">
                   <span className="bg-google-blue text-white px-6 py-2 rounded-md font-medium cursor-pointer hover:bg-blue-600 transition-colors">ファイルを選択</span>
                   <input type="file" multiple accept=".pdf,image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'after')} />
                 </label>
                 {pagesAfter.length > 0 && (
                   <div className="mt-4 text-sm text-green-600 font-medium flex items-center justify-center gap-2">
                     <CheckCircle2 size={16}/> {pagesAfter.length} ページ読み込み済み
                   </div>
                 )}
               </div>
             </div>
             
             <div className="mt-12">
                <Button 
                   className="h-12 px-8 text-base bg-gradient-to-r from-google-blue to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                   disabled={pagesBefore.length === 0 || pagesAfter.length === 0}
                   onClick={() => setPhase('MAPPING')}
                >
                  紐付け設定へ進む
                </Button>
             </div>
          </div>
        )}

        {/* Phase 2: Mapping */}
        {phase === 'MAPPING' && (
          <div className="flex-1 w-full h-full">
            <PageMapper 
              pagesBefore={pagesBefore} 
              pagesAfter={pagesAfter}
              pairs={pairs}
              setPairs={setPairs}
              onComplete={handleMappingComplete}
            />
          </div>
        )}

        {/* Phase 3: Analysis */}
        {phase === 'ANALYSIS' && activePair && (
           <>
            <Sidebar 
              width={sidebarWidth}
              setWidth={setSidebarWidth}
              activePair={activePair}
              updateActivePairAlignment={updateActivePairAlignment}
              settings={settings}
              setSettings={setSettings}
              onAnalyze={handleAnalyzeActivePair}
              isAnalyzing={isAnalyzing}
              selectedResultId={selectedResultId}
              onSelectResult={handleSelectResult}
              onReconfigure={handleReconfigure}
            />

            <ImageViewer 
              images={{ before: activePair.beforePage.url, after: activePair.afterPage.url }}
              alignment={activePair.alignment}
              view={view}
              setView={setView}
              results={activePair.results} 
              selectedResultId={selectedResultId}
              onSelectResult={handleSelectResult}
              showDiff={showDiff}
              showBefore={showBefore}
              showAfter={showAfter}
              alignmentModeActive={true}
              setImageSize={setImageSize}
            />
           </>
        )}

        {/* Loading Overlay */}
        {isAnalyzing && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center text-white overflow-hidden">
                <CanvasRipple />
                <div className="relative z-10 flex flex-col items-center">
                   <div className="w-16 h-16 rounded-full border-4 border-white/20 border-t-cyan-400 animate-spin mb-8"></div>
                   <div className="text-center space-y-3">
                       <h2 className="text-2xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white drop-shadow-md">
                          RULESOME AI
                       </h2>
                       <div className="flex items-center justify-center gap-2 text-cyan-100/80 font-mono text-sm">
                          <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                          {progressMsg || "INITIALIZING..."}
                       </div>
                   </div>
                   <button 
                     onClick={handleRequestCancel}
                     className="mt-12 px-6 py-2 rounded-full border border-white/30 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all"
                   >
                     キャンセル
                   </button>
                </div>

                {showCancelConfirm && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                     <div className="bg-white text-gray-900 p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 border border-gray-200">
                        <h3 className="text-lg font-bold mb-2">解析を中止しますか？</h3>
                        <p className="text-sm text-gray-600 mb-6">現在の進捗は破棄されます。</p>
                        <div className="flex justify-end gap-3">
                           <Button variant="secondary" onClick={ignoreCancel}>続行する</Button>
                           <Button variant="danger" onClick={confirmCancel}>中止する</Button>
                        </div>
                     </div>
                  </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
}
