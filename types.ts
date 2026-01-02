
export enum GridSize {
  SMALL = 3,
  LARGE = 5
}

export interface GameHistoryItem {
  id: string;
  timestamp: number;
  bet: number;
  mines: number;
  multiplier: number;
  payout: number;
  won: boolean;
}

export interface TileState {
  index: number;
  isRevealed: boolean;
  isMine: boolean;
}

export type GameStatus = 'idle' | 'playing' | 'ended';
