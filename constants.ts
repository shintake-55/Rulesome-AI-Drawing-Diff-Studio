import { ChangeType, DiffItem, AlignmentState, ViewState } from './types';

// Mock Data for Macro Mode (Overview)
export const MOCK_MACRO_RESULTS: DiffItem[] = [
  {
    id: 12,
    type: ChangeType.ADDED,
    category: 'AREA',
    title: "左上部: 設備エリア拡張",
    description: "洗面所・トイレエリアのレイアウトが全面的に変更され、個室が増設されています。",
    box: { x: 50, y: 50, width: 300, height: 250 },
    areaSize: 75000
  },
  {
    id: 10,
    type: ChangeType.MODIFIED,
    category: 'AREA',
    title: "中央左: 部屋配置変更",
    description: "会議室AとBの仕切り壁の位置が変更され、A室が拡大されました。",
    box: { x: 50, y: 350, width: 200, height: 180 },
    areaSize: 36000
  },
  {
    id: 9,
    type: ChangeType.MOVED,
    category: 'AREA',
    title: "右側: 大規模間取り変更",
    description: "右側エリアの部屋配置を全面的に再設計し、トイレ・浴室・階段の位置を変更。",
    box: { x: 500, y: 100, width: 400, height: 300 },
    areaSize: 120000
  },
  {
    id: 8,
    type: ChangeType.MOVED,
    category: 'AREA',
    title: "階段構造変更",
    description: "階段の登り口位置が北側から東側に移動されています。",
    box: { x: 400, y: 450, width: 150, height: 150 },
    areaSize: 22500
  },
  {
    id: 6,
    type: ChangeType.MODIFIED,
    category: 'AREA',
    title: "左端: 通路幅拡張",
    description: "避難経路確保のため、メイン通路の幅が1200mmから1500mmへ変更。",
    box: { x: 20, y: 50, width: 40, height: 500 },
    areaSize: 20000
  },
  {
    id: 3,
    type: ChangeType.REMOVED,
    category: 'AREA',
    title: "下部中央: 倉庫削除",
    description: "当初計画されていた備品倉庫が削除され、オープンスペースに変更されました。",
    box: { x: 300, y: 650, width: 250, height: 100 },
    areaSize: 25000
  }
];

// Mock Data for Micro Mode (Detailed)
export const MOCK_MICRO_RESULTS: DiffItem[] = [
  { id: 57, category: 'EQUIPMENT', type: ChangeType.MOVED, title: "空調機A-1位置微調整", description: "ダクト干渉回避のため右へ50mm移動", box: { x: 60, y: 60, width: 30, height: 30 }, areaSize: 900 },
  { id: 56, category: 'EQUIPMENT', type: ChangeType.ADDED, title: "配管スリーブ追加", description: "Φ100スリーブ追加", box: { x: 100, y: 70, width: 20, height: 20 }, areaSize: 400 },
  { id: 55, category: 'EQUIPMENT', type: ChangeType.MODIFIED, title: "点検口サイズ変更", description: "450角から600角へ変更", box: { x: 150, y: 60, width: 40, height: 40 }, areaSize: 1600 },
  { id: 53, category: 'EQUIPMENT', type: ChangeType.MOVED, title: "建具DW-3位置", description: "有効開口確保のため移動", box: { x: 80, y: 360, width: 40, height: 10 }, areaSize: 400 },
  { id: 52, category: 'WIRING', type: ChangeType.REMOVED, title: "不要配線削除", description: "旧設計のLAN配線を削除", box: { x: 120, y: 380, width: 100, height: 5 }, areaSize: 500 },
  { id: 51, category: 'AREA', type: ChangeType.REMOVED, title: "手摺削除", description: "階段下の手摺を削除", box: { x: 410, y: 460, width: 10, height: 50 }, areaSize: 500 },
  { id: 48, category: 'EQUIPMENT', type: ChangeType.MOVED, title: "コンセント位置", description: "家具配置に合わせて移動", box: { x: 30, y: 100, width: 10, height: 10 }, areaSize: 100 },
  { id: 44, category: 'WIRING', type: ChangeType.REMOVED, title: "配管ルート削除", description: "中央部の給水配管ルートを削除", box: { x: 350, y: 200, width: 80, height: 150 }, areaSize: 1200 },
  { id: 40, category: 'AREA', type: ChangeType.MODIFIED, title: "壁厚変更", description: "LGS65からLGS100へ変更", box: { x: 200, y: 400, width: 10, height: 100 }, areaSize: 1000 },
  { id: 29, category: 'EQUIPMENT', type: ChangeType.ADDED, title: "ブラケット照明追加", description: "廊下照度確保のため", box: { x: 520, y: 120, width: 15, height: 15 }, areaSize: 225 },
  { id: 23, category: 'AREA', type: ChangeType.ADDED, title: "洗面台新設", description: "左側2階の洗面所に洗面台を新設", box: { x: 550, y: 150, width: 120, height: 80 }, areaSize: 960 },
  { id: 17, category: 'TEXT', type: ChangeType.MODIFIED, title: "寸法値修正", description: "2500 → 2550 表記修正", box: { x: 320, y: 680, width: 40, height: 20 }, areaSize: 800 },
  { id: 14, category: 'TEXT', type: ChangeType.MODIFIED, title: "仕上表修正", description: "床材指定の変更", box: { x: 400, y: 700, width: 100, height: 50 }, areaSize: 5000 },
  { id: 11, category: 'EQUIPMENT', type: ChangeType.ADDED, title: "ペーパーホルダー", description: "トイレブース内に設置", box: { x: 800, y: 150, width: 10, height: 10 }, areaSize: 100 },
];

// Mock Data for Electrical/Energy Calculation Mode
export const MOCK_ELECTRICAL_RESULTS: DiffItem[] = [
  {
    id: 101,
    type: ChangeType.ADDED,
    category: 'WIRING',
    title: "照明配線追加 (L-2系統)",
    description: "増設された会議室Aのダウンライトへの渡り配線を追加。",
    box: { x: 100, y: 100, width: 200, height: 100 }, // Fallback box
    points: [[100, 100], [150, 100], [150, 180], [250, 180], [250, 220]], // Zig-zag wiring path
    areaSize: 500
  },
  {
    id: 102,
    type: ChangeType.MOVED,
    category: 'EQUIPMENT',
    title: "スイッチ(3路) 移動",
    description: "ドア開閉方向の変更に伴い、スイッチ位置を壁反対側へ移動。",
    box: { x: 320, y: 400, width: 20, height: 20 },
    movedFrom: { x: 280, y: 400 }, // Vector origin
    areaSize: 400
  },
  {
    id: 103,
    type: ChangeType.REMOVED,
    category: 'WIRING',
    title: "撤去配線 (旧幹線)",
    description: "レイアウト変更により不要となった床下配線を撤去。",
    box: { x: 400, y: 300, width: 100, height: 100 },
    points: [[400, 300], [420, 350], [500, 350], [550, 400]],
    areaSize: 800
  },
  {
    id: 104,
    type: ChangeType.MODIFIED,
    category: 'EQUIPMENT',
    title: "分電盤 容量変更",
    description: "L-1盤の容量を50Aから75Aへ変更（外形寸法変更なし）。",
    box: { x: 800, y: 50, width: 60, height: 40 },
    areaSize: 2400
  },
  {
    id: 105,
    type: ChangeType.ADDED,
    category: 'EQUIPMENT',
    title: "人感センサー追加",
    description: "省エネ計算に基づき、廊下に人感センサー(WTK)を追加。",
    box: { x: 450, y: 150, width: 15, height: 15 },
    areaSize: 225
  },
  {
    id: 106,
    type: ChangeType.MOVED,
    category: 'WIRING',
    title: "幹線ルート変更",
    description: "EPSからの幹線ルートを梁貫通からスリーブ経由に変更。",
    box: { x: 600, y: 600, width: 200, height: 50 },
    points: [[600, 600], [650, 600], [650, 650], [800, 650]],
    movedFrom: { x: 600, y: 580 }, // Rough shift
    areaSize: 1000
  }
];

// Initial Settings
export const INITIAL_ALIGNMENT: AlignmentState = {
  x: 0,
  y: 0,
  scale: 1.0,
  rotation: 0,
  opacity: 0.5
};

export const INITIAL_VIEW: ViewState = {
  zoom: 1.0,
  panX: 0,
  panY: 0
};