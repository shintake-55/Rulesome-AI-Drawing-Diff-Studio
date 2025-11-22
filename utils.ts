
import { GoogleGenAI, Type } from "@google/genai";
import { AlignmentState, DiffItem, AnalysisResult, ChangeType } from './types';

// Helper to load an image from a URL
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
};

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Export Composite Image
 */
export const downloadCompositeImage = async (
  beforeSrc: string | null,
  afterSrc: string | null,
  alignment: AlignmentState,
  results: DiffItem[]
) => {
  if (!beforeSrc) return;

  try {
    const imgBefore = await loadImage(beforeSrc);
    const canvas = document.createElement('canvas');
    canvas.width = imgBefore.naturalWidth;
    canvas.height = imgBefore.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Draw Before Image (Base)
    ctx.drawImage(imgBefore, 0, 0);

    // 2. Draw After Image (Overlay)
    if (afterSrc) {
      const imgAfter = await loadImage(afterSrc);
      ctx.save();
      
      // Calculate center for rotation/scale
      const overlayCenterX = (imgAfter.naturalWidth * alignment.scale) / 2;
      const overlayCenterY = (imgAfter.naturalHeight * alignment.scale) / 2;
      
      // Apply transformations relative to the top-left origin, shifting by user X/Y
      ctx.translate(alignment.x, alignment.y);
      
      // To rotate around the center of the overlay image:
      // Move to center -> Rotate/Scale -> Move back
      ctx.translate(overlayCenterX, overlayCenterY);
      ctx.rotate((alignment.rotation * Math.PI) / 180);
      ctx.scale(alignment.scale, alignment.scale);
      ctx.translate(-overlayCenterX, -overlayCenterY);

      ctx.globalAlpha = alignment.opacity;
      ctx.globalCompositeOperation = 'multiply'; // Simulate the UI blend mode
      ctx.drawImage(imgAfter, 0, 0);
      
      ctx.restore();
    }

    // 3. Draw Detection Results (Bounding Boxes)
    if (results.length > 0) {
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = 3;
      ctx.font = 'bold 24px sans-serif';

      results.forEach(item => {
        let color = '#9CA3AF';
        switch (item.type) {
          case ChangeType.ADDED: color = '#22C55E'; break;
          case ChangeType.REMOVED: color = '#EF4444'; break;
          case ChangeType.MODIFIED: color = '#EAB308'; break;
          case ChangeType.MOVED: color = '#3B82F6'; break;
        }

        // Draw Box
        ctx.strokeStyle = color;
        ctx.strokeRect(item.box.x, item.box.y, item.box.width, item.box.height);

        // Draw Label Background
        const text = item.displayId || `#${item.id}`;
        const textMetrics = ctx.measureText(text);
        const padding = 6;
        const textW = textMetrics.width;
        const textH = 24; // approximate height

        ctx.fillStyle = color;
        ctx.fillRect(item.box.x, item.box.y - textH - padding * 2, textW + padding * 2, textH + padding * 2);

        // Draw Label Text
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(text, item.box.x + padding, item.box.y - padding);
      });
    }

    // 4. Trigger Download
    const link = document.createElement('a');
    link.download = 'rulesome-diff-export.png';
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (error) {
    console.error("Failed to export image", error);
    alert("画像の生成に失敗しました。");
  }
};

/**
 * Step 1: ROI Detection
 */
const detectROIs = (
  ctxBefore: CanvasRenderingContext2D,
  imgAfter: HTMLImageElement,
  width: number,
  height: number,
  alignment: AlignmentState,
  sensitivity: number,
  mergeDistance: number
): Rect[] => {
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = width;
  diffCanvas.height = height;
  const diffCtx = diffCanvas.getContext('2d', { willReadFrequently: true });
  if (!diffCtx) return [];

  diffCtx.drawImage(ctxBefore.canvas, 0, 0);
  diffCtx.globalCompositeOperation = 'difference';

  diffCtx.save();
  const tx = alignment.x;
  const ty = alignment.y;
  const overlayCenterX = (imgAfter.naturalWidth * alignment.scale) / 2;
  const overlayCenterY = (imgAfter.naturalHeight * alignment.scale) / 2;

  diffCtx.translate(tx, ty);
  diffCtx.translate(overlayCenterX, overlayCenterY);
  diffCtx.rotate((alignment.rotation * Math.PI) / 180);
  diffCtx.translate(-overlayCenterX, -overlayCenterY);
  diffCtx.scale(alignment.scale, alignment.scale);
  diffCtx.drawImage(imgAfter, 0, 0);
  diffCtx.restore();

  const imageData = diffCtx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const gridSize = 40; 
  const gridCols = Math.ceil(width / gridSize);
  const gridRows = Math.ceil(height / gridSize);
  const grid: boolean[] = new Array(gridCols * gridRows).fill(false);

  const threshold = Math.max(10, 100 - sensitivity); 
  
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      const diffVal = (data[i] + data[i+1] + data[i+2]) / 3;
      
      if (diffVal > threshold) {
        const gx = Math.floor(x / gridSize);
        const gy = Math.floor(y / gridSize);
        if (gx < gridCols && gy < gridRows) {
           grid[gy * gridCols + gx] = true;
        }
      }
    }
  }

  const boxes: Rect[] = [];
  const visited = new Array(grid.length).fill(false);

  for (let i = 0; i < grid.length; i++) {
    if (grid[i] && !visited[i]) {
      let minGX = i % gridCols;
      let maxGX = minGX;
      let minGY = Math.floor(i / gridCols);
      let maxGY = minGY;
      
      const stack = [i];
      visited[i] = true;
      
      while (stack.length > 0) {
        const idx = stack.pop()!;
        const gx = idx % gridCols;
        const gy = Math.floor(idx / gridCols);
        
        minGX = Math.min(minGX, gx);
        maxGX = Math.max(maxGX, gx);
        minGY = Math.min(minGY, gy);
        maxGY = Math.max(maxGY, gy);

        const neighbors = [idx - 1, idx + 1, idx - gridCols, idx + gridCols];
        
        for (const n of neighbors) {
          if (n >= 0 && n < grid.length && grid[n] && !visited[n]) {
            if (Math.abs((n % gridCols) - (idx % gridCols)) <= 1) {
               visited[n] = true;
               stack.push(n);
            }
          }
        }
      }

      boxes.push({
        x: minGX * gridSize,
        y: minGY * gridSize,
        width: (maxGX - minGX + 1) * gridSize,
        height: (maxGY - minGY + 1) * gridSize
      });
    }
  }

  const PADDING = 60;
  const mergedBoxes: Rect[] = [];
  boxes.forEach(b => mergedBoxes.push(b));

  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < mergedBoxes.length; i++) {
      for (let j = i + 1; j < mergedBoxes.length; j++) {
        const b1 = mergedBoxes[i];
        const b2 = mergedBoxes[j];
        
        const intersect = !(
            b2.x > b1.x + b1.width + mergeDistance || 
            b2.x + b2.width + mergeDistance < b1.x || 
            b2.y > b1.y + b1.height + mergeDistance || 
            b2.y + b2.height + mergeDistance < b1.y
        );
                           
        if (intersect) {
          const newX = Math.min(b1.x, b2.x);
          const newY = Math.min(b1.y, b2.y);
          const newW = Math.max(b1.x + b1.width, b2.x + b2.width) - newX;
          const newH = Math.max(b1.y + b1.height, b2.y + b2.height) - newY;
          
          mergedBoxes[i] = { x: newX, y: newY, width: newW, height: newH };
          mergedBoxes.splice(j, 1);
          merged = true;
          j--; 
        }
      }
    }
  }

  return mergedBoxes.map(b => ({
    x: Math.max(0, b.x - PADDING),
    y: Math.max(0, b.y - PADDING),
    width: Math.min(width - Math.max(0, b.x - PADDING), b.width + PADDING * 2),
    height: Math.min(height - Math.max(0, b.y - PADDING), b.height + PADDING * 2)
  }));
};

/**
 * Step 2: Tiling
 */
const generateTiles = (rois: Rect[], maxWidth: number, maxHeight: number): Rect[] => {
  const TILE_SIZE = 900;
  const OVERLAP = 200;
  const tiles: Rect[] = [];

  rois.forEach(roi => {
    if (roi.width <= TILE_SIZE && roi.height <= TILE_SIZE) {
      tiles.push(roi);
      return;
    }
    const xSteps = Math.ceil(roi.width / (TILE_SIZE - OVERLAP));
    const ySteps = Math.ceil(roi.height / (TILE_SIZE - OVERLAP));

    for (let y = 0; y < ySteps; y++) {
      for (let x = 0; x < xSteps; x++) {
        let tx = x * (TILE_SIZE - OVERLAP);
        let ty = y * (TILE_SIZE - OVERLAP);
        const tw = Math.min(TILE_SIZE, roi.width - tx);
        const th = Math.min(TILE_SIZE, roi.height - ty);

        tiles.push({
          x: roi.x + tx,
          y: roi.y + ty,
          width: tw,
          height: th
        });
      }
    }
  });
  return tiles;
};

/**
 * Step 3: Semantic Analysis
 */
const analyzeTile = async (
  ai: GoogleGenAI,
  imgBefore: HTMLImageElement,
  imgAfter: HTMLImageElement,
  alignment: AlignmentState,
  tile: Rect,
  mode: 'MACRO' | 'MICRO'
): Promise<{ items: DiffItem[], tokenCount: number }> => {
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = tile.width;
  cropCanvas.height = tile.height;
  const cropCtx = cropCanvas.getContext('2d');
  if (!cropCtx) return { items: [], tokenCount: 0 };

  // Before Crop
  cropCtx.drawImage(imgBefore, tile.x, tile.y, tile.width, tile.height, 0, 0, tile.width, tile.height);
  const base64Before = cropCanvas.toDataURL("image/jpeg", 0.8).split(',')[1];

  // After Crop
  cropCtx.clearRect(0, 0, tile.width, tile.height);
  cropCtx.save();
  cropCtx.translate(-tile.x, -tile.y);
  
  const tx = alignment.x;
  const ty = alignment.y;
  const overlayCenterX = (imgAfter.naturalWidth * alignment.scale) / 2;
  const overlayCenterY = (imgAfter.naturalHeight * alignment.scale) / 2;

  cropCtx.translate(tx, ty);
  cropCtx.translate(overlayCenterX, overlayCenterY);
  cropCtx.rotate((alignment.rotation * Math.PI) / 180);
  cropCtx.translate(-overlayCenterX, -overlayCenterY);
  cropCtx.scale(alignment.scale, alignment.scale);
  cropCtx.drawImage(imgAfter, 0, 0);
  cropCtx.restore();
  
  const base64After = cropCanvas.toDataURL("image/jpeg", 0.8).split(',')[1];

  const isElectrical = mode === 'MICRO';
  
  const systemInstruction = `
    あなたは「Rulesome AI」です。建築図面のBefore/After差分を検出します。

    【必須要件】
    1. **グルーピング**: 機器やシンボルが追加/削除されている場合、**その付近にある関連テキスト（タグ、室名、注釈）も必ず同じボックスに含めてください**。バラバラに検出せず、意味のある1つの塊として囲ってください。
    2. 言語: 全て日本語。

    【モード: ${isElectrical ? "詳細・設備解析 (MICRO)" : "全体・建築解析 (MACRO)"}】
    ${isElectrical ? 
      "- 電気配線、配管、コンセント、スイッチ等の設備記号を重点的に検出。" : 
      "- 壁、部屋の配置、大きな構造変更を検出。\n- 細かいノイズは無視。"
    }
    
    【座標】
    0-1000の正規化座標を使用。順序は [xmin, ymin, xmax, ymax] です。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [
        {
          role: 'user',
          parts: [
            { text: "差分を検出せよ。" },
            { inlineData: { mimeType: "image/jpeg", data: base64Before } },
            { inlineData: { mimeType: "image/jpeg", data: base64After } }
          ]
        }
      ],
      config: {
        systemInstruction: systemInstruction,
        thinkingConfig: { thinkingBudget: 2048 }, 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              category: { type: Type.STRING, enum: ["WIRING", "EQUIPMENT", "AREA", "TEXT"] },
              type: { type: Type.STRING, enum: ["ADDED", "REMOVED", "MODIFIED", "MOVED"] },
              box_2d: { type: Type.ARRAY, items: { type: Type.NUMBER } }
            },
            required: ["title", "category", "type", "box_2d"]
          }
        }
      }
    });

    const jsonText = response.text;
    const tokenCount = response.usageMetadata?.totalTokenCount || 0;

    if (!jsonText) return { items: [], tokenCount };
    const rawDiffs = JSON.parse(jsonText) as any[];

    const items = rawDiffs.map((item: any) => {
      const [xmin, ymin, xmax, ymax] = item.box_2d;
      const nYmin = Math.max(0, Math.min(1000, ymin));
      const nXmin = Math.max(0, Math.min(1000, xmin));
      const nYmax = Math.max(0, Math.min(1000, ymax));
      const nXmax = Math.max(0, Math.min(1000, xmax));

      return {
        id: 0, 
        type: item.type,
        category: item.category,
        title: item.title,
        description: item.description,
        box: {
          x: tile.x + (nXmin / 1000) * tile.width,
          y: tile.y + (nYmin / 1000) * tile.height,
          width: ((nXmax - nXmin) / 1000) * tile.width,
          height: ((nYmax - nYmin) / 1000) * tile.height
        },
        areaSize: 0 
      };
    });

    return { items, tokenCount };

  } catch (e) {
    console.warn("Analysis failed for tile", tile, e);
    return { items: [], tokenCount: 0 };
  }
};

/**
 * Main Orchestrator
 */
export const analyzeImageDiff = async (
  beforeSrc: string,
  afterSrc: string,
  alignment: AlignmentState,
  mode: 'MACRO' | 'MICRO',
  mergeDistance: number = 20,
  onProgress?: (msg: string) => void,
  signal?: AbortSignal
): Promise<AnalysisResult> => {
  try {
    if (onProgress) onProgress("画像データをロード中...");
    
    const [imgBefore, imgAfter] = await Promise.all([
      loadImage(beforeSrc),
      loadImage(afterSrc)
    ]);

    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const width = imgBefore.naturalWidth;
    const height = imgBefore.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Canvas context error");
    ctx.drawImage(imgBefore, 0, 0);

    // ROI Sensitivity: Macro = lower sensitivity (ignore small stuff), Micro = high sensitivity
    const sensitivity = mode === 'MACRO' ? 50 : 85;

    if (onProgress) onProgress("Rulesome AI: 変更候補エリアをスキャン中...");
    const rois = detectROIs(ctx, imgAfter, width, height, alignment, sensitivity, mergeDistance);
    
    if (rois.length === 0) {
      return { items: [], totalTokens: 0 };
    }

    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    if (onProgress) onProgress(`解析領域の最適化中 (${rois.length}エリア)...`);
    const tiles = generateTiles(rois, width, height);
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const allDiffs: DiffItem[] = [];
    let totalTokens = 0;
    
    const BATCH_SIZE = 3;
    const totalTiles = tiles.length;

    for (let i = 0; i < totalTiles; i += BATCH_SIZE) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

      const batch = tiles.slice(i, i + BATCH_SIZE);
      if (onProgress) onProgress(`Rulesome AI 詳細解析中: ${Math.min(i + BATCH_SIZE, totalTiles)} / ${totalTiles} タイル`);
      
      const promises = batch.map(tile => 
        analyzeTile(ai, imgBefore, imgAfter, alignment, tile, mode)
      );
      
      const batchResults = await Promise.all(promises);
      batchResults.forEach(res => {
        allDiffs.push(...res.items);
        totalTokens += res.tokenCount;
      });
    }

    if (onProgress) onProgress("結果を統合・重複排除中...");
    
    const uniqueDiffs: DiffItem[] = [];
    allDiffs.forEach(item => {
      const isDuplicate = uniqueDiffs.some(existing => {
        const x1 = Math.max(item.box.x, existing.box.x);
        const y1 = Math.max(item.box.y, existing.box.y);
        const x2 = Math.min(item.box.x + item.box.width, existing.box.x + existing.box.width);
        const y2 = Math.min(item.box.y + item.box.height, existing.box.y + existing.box.height);
        
        if (x1 < x2 && y1 < y2) {
          const intersection = (x2 - x1) * (y2 - y1);
          const area1 = item.box.width * item.box.height;
          const area2 = existing.box.width * existing.box.height;
          const union = area1 + area2 - intersection;
          return (intersection / union) > 0.3; 
        }
        return false;
      });
      
      if (!isDuplicate) {
        uniqueDiffs.push(item);
      }
    });

    // Sort by Y position, then X position for natural reading order
    uniqueDiffs.sort((a, b) => {
      const yDiff = a.box.y - b.box.y;
      if (Math.abs(yDiff) > 20) return yDiff; // if Y is significantly different
      return a.box.x - b.box.x;
    });

    const finalItems = uniqueDiffs.map((d, idx) => {
      const num = idx + 1;
      const formattedId = `#${num.toString().padStart(4, '0')}`;
      return {
        ...d,
        id: num,
        displayId: formattedId,
        areaSize: d.box.width * d.box.height
      };
    });

    return { items: finalItems, totalTokens };

  } catch (e) {
    // Let the caller handle AbortError
    throw e;
  }
};
