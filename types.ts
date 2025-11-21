
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
  id: number; // Changed to handle formatted display logic in UI
  displayId?: string; // #0001 format
  type: ChangeType;
  category?: DiffCategory;
  title: string;
  description: string;
  box: BoundingBox;
  points?: number[][]; // Polyline points [[x,y], [x,y]]
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
  sensitivity: number; // Kept for internal logic, though UI might hide it
  minArea: number;     
  mergeDistance: number; 
  mode: 'MACRO' | 'MICRO' | 'ELECTRICAL' | 'CUSTOM';
}

export interface ImageState {
  before: string | null;
  after: string | null;
}
