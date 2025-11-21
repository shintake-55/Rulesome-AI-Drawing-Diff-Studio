
import React, { useRef, useState } from 'react';
import { AlignmentState, ViewState, ImageState, DiffItem, ChangeType } from '../types';

interface ImageViewerProps {
  images: ImageState;
  alignment: AlignmentState;
  view: ViewState;
  setView: (v: ViewState) => void;
  results: DiffItem[];
  selectedResultId: number | null;
  onSelectResult: (id: number) => void;
  showDiff: boolean;
  showBefore: boolean;
  showAfter: boolean;
  alignmentModeActive: boolean;
  setImageSize: (size: { width: number; height: number }) => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  images, alignment, view, setView, results, selectedResultId, onSelectResult,
  showDiff, showBefore, showAfter, setImageSize
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { 
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setView({
        ...view,
        panX: view.panX + dx,
        panY: view.panY + dy
      });
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const scaleAmount = -e.deltaY * 0.001;
      const newZoom = Math.min(Math.max(view.zoom + scaleAmount, 0.1), 8);
      
      const ratio = newZoom / view.zoom;

      setView({ 
        zoom: newZoom,
        panX: view.panX * ratio,
        panY: view.panY * ratio
      });
    } else {
      setView({
        ...view,
        panX: view.panX - e.deltaX,
        panY: view.panY - e.deltaY
      });
    }
  };

  const handleZoomBtn = (direction: 1 | -1) => {
    const step = 0.2;
    const newZoom = Math.min(Math.max(view.zoom + (direction * step), 0.1), 8);
    const ratio = newZoom / view.zoom;
    
    setView({
      zoom: newZoom,
      panX: view.panX * ratio,
      panY: view.panY * ratio
    });
  };

  const handleReset = () => setView({ zoom: 1.0, panX: 0, panY: 0 });

  const getBoxColor = (type: ChangeType) => {
    switch (type) {
      case ChangeType.ADDED: return '#22C55E'; // Green
      case ChangeType.REMOVED: return '#EF4444'; // Red
      case ChangeType.MODIFIED: return '#EAB308'; // Yellow
      case ChangeType.MOVED: return '#3B82F6'; // Blue
      default: return '#9CA3AF';
    }
  };

  const renderResultItem = (item: DiffItem) => {
    const isSelected = selectedResultId === item.id;
    const color = getBoxColor(item.type);
    const strokeWidth = isSelected ? 3 : 2;
    
    // Darker fills: Unselected 0.25, Selected 0.55
    const fill = isSelected ? `${color}8C` : `${color}40`; // Hex opacity: 8C=55%, 40=25%

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelectResult(item.id);
    };

    const commonStyle = {
      cursor: 'pointer',
      pointerEvents: 'all' as const,
      filter: isSelected ? `drop-shadow(0 0 8px ${color})` : 'none',
      transition: 'all 0.2s'
    };

    // MOVED EQUIPMENT (Vector Arrow)
    if (item.type === ChangeType.MOVED && item.movedFrom) {
      const cx = item.box.x + item.box.width / 2;
      const cy = item.box.y + item.box.height / 2;
      const ox = item.movedFrom.x;
      const oy = item.movedFrom.y;

      return (
        <g key={item.id} onClick={handleClick} style={commonStyle}>
          <line 
            x1={ox} y1={oy} x2={cx} y2={cy} 
            stroke={color} 
            strokeWidth={2} 
            markerEnd={`url(#arrowhead-${item.id})`}
            strokeDasharray="4,2"
          />
          <rect
            x={item.box.x}
            y={item.box.y}
            width={item.box.width}
            height={item.box.height}
            fill={fill}
            stroke={color}
            strokeWidth={strokeWidth}
          />
          <defs>
            <marker id={`arrowhead-${item.id}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={color} />
            </marker>
          </defs>
        </g>
      );
    }

    // STANDARD BOX (Used for everything now, including Wiring)
    return (
      <rect
        key={item.id}
        x={item.box.x}
        y={item.box.y}
        width={item.box.width}
        height={item.box.height}
        fill={fill}
        stroke={color}
        strokeWidth={strokeWidth}
        onClick={handleClick}
        style={commonStyle}
      />
    );
  };

  const renderResultLabel = (item: DiffItem) => {
    const isSelected = selectedResultId === item.id;
    if (view.zoom < 0.8 && !isSelected) return null;

    const color = getBoxColor(item.type);
    let top = item.box.y;
    let left = item.box.x;

    return (
       <div
        key={`label-${item.id}`}
        className="absolute px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap z-20 cursor-pointer transition-transform hover:scale-105"
        onClick={(e) => {
          e.stopPropagation();
          onSelectResult(item.id);
        }}
        style={{
          left: left,
          top: top - 20,
          backgroundColor: color,
          color: 'white',
          fontSize: '10px',
          fontWeight: 'bold',
          pointerEvents: 'auto',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
      >
        {item.displayId || `#${item.id}`} {item.category === 'WIRING' ? '配線' : (item.category === 'EQUIPMENT' ? '機器' : item.type)}
      </div>
    );
  };

  const hasImages = images.before || images.after;

  return (
    <div 
      className="relative flex-1 bg-[#1a1a1a] overflow-hidden cursor-grab active:cursor-grabbing"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
    >
      <div 
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: 'linear-gradient(#555 1px, transparent 1px), linear-gradient(90deg, #555 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}
      />

      {!hasImages && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-600 select-none">
          <div className="text-center">
            <p className="text-lg font-medium">図面が読み込まれていません</p>
            <p className="text-sm opacity-70">サイドバーから画像をアップロードしてください</p>
          </div>
        </div>
      )}

      <div
        className="absolute origin-top-left transition-transform duration-75 ease-out will-change-transform"
        style={{
          transformOrigin: '0 0', 
          transform: `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})`,
          left: '50%',
          top: '50%' 
        }}
      >
        <div className="relative -translate-x-1/2 -translate-y-1/2">
          {images.before && (
            <img 
              src={images.before} 
              alt="Before" 
              className="block max-w-none shadow-sm pointer-events-none"
              onLoad={(e) => setImageSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
              style={{ 
                opacity: showBefore ? 1 : 0,
                transition: 'opacity 0.2s ease-in-out'
              }}
            />
          )}
          {images.after && (
            <div
              className="absolute top-0 left-0 origin-center pointer-events-none"
              style={{
                transform: `translate(${alignment.x}px, ${alignment.y}px) rotate(${alignment.rotation}deg) scale(${alignment.scale})`,
              }}
            >
              {showAfter && (
                <img 
                  src={images.after} 
                  alt="After" 
                  className="block max-w-none"
                  onLoad={(e) => !images.before && setImageSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
                  style={{ 
                    mixBlendMode: 'multiply',
                    opacity: alignment.opacity
                  }}
                />
              )}
            </div>
          )}
          {showDiff && (
            <svg 
              className="absolute inset-0 overflow-visible pointer-events-none"
              width="100%" 
              height="100%"
              style={{ left: 0, top: 0 }}
            >
               {results.map(item => renderResultItem(item))}
            </svg>
          )}
          {showDiff && results.map(item => renderResultLabel(item))}
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur shadow-2xl rounded-full px-4 py-2 flex items-center gap-4 border border-gray-700 z-30 text-white">
         <div className="flex items-center gap-2 text-xs font-mono text-gray-400 border-r border-gray-600 pr-4 mr-2">
           <span>X: {view.panX.toFixed(0)}</span>
           <span>Y: {view.panY.toFixed(0)}</span>
           <span>{(view.zoom * 100).toFixed(0)}%</span>
         </div>
         <button onClick={() => handleZoomBtn(-1)} className="p-1 hover:bg-gray-800 rounded"><span className="text-lg leading-none">-</span></button>
         <span className="text-xs font-medium min-w-[3ch] text-center">{(view.zoom).toFixed(1)}x</span>
         <button onClick={() => handleZoomBtn(1)} className="p-1 hover:bg-gray-800 rounded"><span className="text-lg leading-none">+</span></button>
         <div className="w-px h-4 bg-gray-600 mx-1"></div>
         <button onClick={handleReset} className="p-1 hover:bg-gray-800 rounded text-xs font-medium text-blue-400">RESET</button>
      </div>
    </div>
  );
};
