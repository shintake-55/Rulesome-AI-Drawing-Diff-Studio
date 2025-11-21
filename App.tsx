
import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ImageViewer } from './components/ImageViewer';
import { INITIAL_ALIGNMENT, INITIAL_VIEW } from './constants';
import { AlignmentState, DetectionSettings, ImageState, ViewState, DiffItem } from './types';
import { Eye, EyeOff, LayoutTemplate } from 'lucide-react';
import { Button, cn } from './components/ui';
import { analyzeImageDiff, downloadCompositeImage } from './utils';

// --- Canvas Ripple Effect Component ---
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
      
      // Draw darker background overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw ripples
      for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
        const r = ripplesRef.current[i];
        r.radius += 3;
        r.alpha -= 0.01;

        if (r.alpha <= 0) {
          ripplesRef.current.splice(i, 1);
        } else {
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(6, 182, 212, ${r.alpha})`; // Cyan color
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Inner faint fill
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
// --------------------------------------

export default function App() {
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [images, setImages] = useState<ImageState>({ before: null, after: null });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [results, setResults] = useState<DiffItem[]>([]);
  const [totalTokens, setTotalTokens] = useState<number>(0);
  const [selectedResultId, setSelectedResultId] = useState<number | null>(null);
  
  const [alignment, setAlignment] = useState<AlignmentState>(INITIAL_ALIGNMENT);
  const [view, setView] = useState<ViewState>(INITIAL_VIEW);
  const [settings, setSettings] = useState<DetectionSettings>({
    sensitivity: 75,
    minArea: 100,         
    mergeDistance: 40, 
    mode: 'MICRO'         
  });

  const [showBefore, setShowBefore] = useState(true);
  const [showAfter, setShowAfter] = useState(true);
  const [showDiff, setShowDiff] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string>("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleAnalyze = async () => {
    if (!images.before || !images.after) {
      alert("比較する画像を2枚（変更前・変更後）アップロードしてください。");
      return;
    }

    // Create a new abort controller
    abortControllerRef.current = new AbortController();

    setIsAnalyzing(true);
    setProgressMsg("エンジン起動中...");
    setResults([]); 
    setTotalTokens(0);

    try {
      await new Promise(r => requestAnimationFrame(r));
      
      const { items, totalTokens } = await analyzeImageDiff(
        images.before, 
        images.after, 
        alignment,
        settings.mode === 'ELECTRICAL' ? 'MICRO' : settings.mode as 'MACRO' | 'MICRO',
        settings.mergeDistance,
        (msg) => setProgressMsg(msg),
        abortControllerRef.current.signal
      );

      if (items.length === 0) {
        console.log("No differences detected.");
        alert("差分が検出されませんでした。");
      }
      
      setResults(items);
      setTotalTokens(totalTokens);
      setShowDiff(true);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log("Analysis cancelled by user.");
      } else {
        console.error("Analysis error:", error);
        alert("解析中にエラーが発生しました。");
      }
    } finally {
      setIsAnalyzing(false);
      abortControllerRef.current = null;
    }
  };

  const handleExport = () => {
    downloadCompositeImage(images.before, images.after, alignment, results);
  };

  const handleRequestCancel = () => {
    setShowCancelConfirm(true);
  };

  const confirmCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // Immediately stop UI loading state to feel responsive
    setIsAnalyzing(false);
    setShowCancelConfirm(false);
  };

  const ignoreCancel = () => {
    setShowCancelConfirm(false);
  };

  const handleSelectResult = (id: number) => {
    setSelectedResultId(id);
    const item = results.find(r => r.id === id);
    
    if (item && imageSize.width > 0 && imageSize.height > 0) {
      const cx = item.box.x + item.box.width / 2;
      const cy = item.box.y + item.box.height / 2;
      const targetZoom = 1.6; // Fixed Zoom as requested
      const imgCenterX = imageSize.width / 2;
      const imgCenterY = imageSize.height / 2;
      
      setView({
        zoom: targetZoom,
        panX: -(cx - imgCenterX) * targetZoom,
        panY: -(cy - imgCenterY) * targetZoom
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.shiftKey) {
         const delta = 1;
         if (e.key === 'ArrowUp') setAlignment(p => ({ ...p, y: p.y - delta }));
         if (e.key === 'ArrowDown') setAlignment(p => ({ ...p, y: p.y + delta }));
         if (e.key === 'ArrowLeft') setAlignment(p => ({ ...p, x: p.x - delta }));
         if (e.key === 'ArrowRight') setAlignment(p => ({ ...p, x: p.x + delta }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

        <div className="flex items-center gap-2">
           <div className="flex bg-gray-100 rounded-md p-1 gap-1 mr-4">
             <button 
               onClick={() => setShowBefore(!showBefore)}
               className={cn("px-2 py-1 text-xs rounded flex items-center gap-1.5", showBefore ? "bg-white shadow-sm text-google-blue" : "text-google-subtext")}
             >
               {showBefore ? <Eye size={12}/> : <EyeOff size={12}/>} 変更前
             </button>
             <button 
               onClick={() => setShowAfter(!showAfter)}
               className={cn("px-2 py-1 text-xs rounded flex items-center gap-1.5", showAfter ? "bg-white shadow-sm text-google-blue" : "text-google-subtext")}
             >
               {showAfter ? <Eye size={12}/> : <EyeOff size={12}/>} 変更後
             </button>
             <button 
               onClick={() => setShowDiff(!showDiff)}
               className={cn("px-2 py-1 text-xs rounded flex items-center gap-1.5 font-medium", showDiff ? "bg-purple-600 text-white shadow-sm" : "text-google-subtext hover:text-gray-900")}
             >
               {showDiff ? <LayoutTemplate size={12}/> : <LayoutTemplate size={12}/>} 差分
             </button>
           </div>
           
           <Button variant="secondary" className="h-8 text-xs" onClick={handleExport}>エクスポート</Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar 
          width={sidebarWidth}
          setWidth={setSidebarWidth}
          images={images}
          setImages={setImages}
          alignment={alignment}
          setAlignment={setAlignment}
          settings={settings}
          setSettings={setSettings}
          onAnalyze={handleAnalyze}
          isAnalyzing={isAnalyzing}
          results={results} 
          selectedResultId={selectedResultId}
          onSelectResult={handleSelectResult}
          totalTokens={totalTokens}
        />

        <ImageViewer 
          images={images}
          alignment={alignment}
          view={view}
          setView={setView}
          results={results} 
          selectedResultId={selectedResultId}
          onSelectResult={handleSelectResult}
          showDiff={showDiff}
          showBefore={showBefore}
          showAfter={showAfter}
          alignmentModeActive={true}
          setImageSize={setImageSize}
        />
        
        {/* Ripple Interactive Loading Overlay */}
        {isAnalyzing && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center text-white overflow-hidden">
                <CanvasRipple />
                
                {/* Central Content */}
                <div className="relative z-10 flex flex-col items-center">
                   {/* Sophisticated Spinner */}
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

                {/* Cancellation Confirmation Modal */}
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
