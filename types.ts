
export enum ChangeType {
  ADDED = 'ADDED',
  REMOVED = 'REMOVED',
  MODIFIED = 'MODIFIED',
  MOVED = 'MOVED'
}

export type DiffCategory = 'WIRING' | 'EQUIPMENT' | 'AREA' | 'TEXT';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DiffItem {
  id: number;
  displayId?: string;
  type: ChangeType;
  category?: DiffCategory;
  title: string;
  description: string;
  box: BoundingBox;
  points?: number[][];
  movedFrom?: { x: number, y: number };
  areaSize: number;
}

export interface AnalysisResult {
  items: DiffItem[];
  totalTokens: number;
}

export interface AlignmentState {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface DetectionSettings {
  sensitivity: number;
  minArea: number;     
  mergeDistance: number; 
  mode: 'MACRO' | 'MICRO' | 'ELECTRICAL' | 'CUSTOM';
}

export interface ImageState {
  before: string | null;
  after: string | null;
}

// --- New Types for Multi-Page Support ---

export interface PageData {
  id: string;        // Unique ID for the page
  url: string;       // Blob URL of the image
  fileName: string;  // Original filename
  pageNumber: number;// 1-based page index
  thumbUrl?: string; // Optional thumbnail
}

export interface ComparisonPair {
  id: string;
  name: string;      // e.g., "Page 1 - Page 1"
  beforePage: PageData;
  afterPage: PageData;
  
  // Each pair maintains its own state
  alignment: AlignmentState;
  results: DiffItem[];
  totalTokens: number;
  isAnalyzed: boolean;
}

export type AppPhase = 'UPLOAD' | 'MAPPING' | 'ANALYSIS';
