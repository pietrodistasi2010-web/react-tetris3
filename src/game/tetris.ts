// Tetris core logic — pure functions, no React dependency.

export const COLS = 10;
export const ROWS = 20;
export const EMPTY = 0;

// Piece definitions with rotation states (each rotation is a list of [row, col] offsets).
export type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

export interface PieceShape {
  type: PieceType;
  color: string;
  rotations: [number, number][][];
}

export const PIECES: Record<PieceType, PieceShape> = {
  I: {
    type: "I",
    color: "#22d3ee",
    rotations: [
      [[0,0],[0,1],[0,2],[0,3]],
      [[-1,1],[0,1],[1,1],[2,1]],
      [[1,0],[1,1],[1,2],[1,3]],
      [[-1,2],[0,2],[1,2],[2,2]],
    ],
  },
  O: {
    type: "O",
    color: "#fbbf24",
    rotations: [
      [[0,0],[0,1],[1,0],[1,1]],
      [[0,0],[0,1],[1,0],[1,1]],
      [[0,0],[0,1],[1,0],[1,1]],
      [[0,0],[0,1],[1,0],[1,1]],
    ],
  },
  T: {
    type: "T",
    color: "#c084fc",
    rotations: [
      // Spawn: flat top, bump down
      [[0,0],[0,1],[0,2],[1,1]],
      // R: pointing right
      [[-1,0],[0,0],[0,1],[1,0]],
      // 180: flat bottom, bump up
      [[-1,1],[0,0],[0,1],[0,2]],
      // L: pointing left
      [[-1,1],[0,0],[0,1],[1,1]],
    ],
  },
  S: {
    type: "S",
    color: "#34d399",
    rotations: [
      [[0,1],[0,2],[1,0],[1,1]],
      [[-1,1],[0,1],[0,2],[1,2]],
      [[0,0],[0,1],[1,1],[1,2]],
      [[-1,0],[0,0],[0,1],[1,1]],
    ],
  },
  Z: {
    type: "Z",
    color: "#fb7185",
    rotations: [
      [[0,0],[0,1],[1,1],[1,2]],
      [[-1,2],[0,1],[0,2],[1,1]],
      [[0,0],[0,1],[1,1],[1,2]],
      [[-1,1],[0,0],[0,1],[1,0]],
    ],
  },
  J: {
    type: "J",
    color: "#60a5fa",
    rotations: [
      // Spawn: #.. / ###
      [[0,0],[1,0],[1,1],[1,2]],
      // R: .## / .#. / .#.
      [[-1,1],[-1,2],[0,1],[1,1]],
      // 180: ### / ..#
      [[0,0],[0,1],[0,2],[1,2]],
      // L: .#. / .#. / ##.
      [[-1,1],[0,1],[1,0],[1,1]],
    ],
  },
  L: {
    type: "L",
    color: "#fb923c",
    rotations: [
      [[0,2],[1,0],[1,1],[1,2]],
      [[-1,1],[0,1],[1,1],[1,2]],
      [[0,0],[0,1],[0,2],[1,0]],
      [[-1,0],[0,0],[1,0],[1,1]],
    ],
  },
};

export type Board = number[][]; // ROWS x COLS, 0 = empty, else color index+1

export interface ActivePiece {
  type: PieceType;
  row: number;
  col: number;
  rotation: number;
}

export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<number>(COLS).fill(EMPTY));
}

const PIECE_ORDER: PieceType[] = ["I","O","T","S","Z","J","L"];

export function randomPiece(): ActivePiece {
  const type = PIECE_ORDER[Math.floor(Math.random() * PIECE_ORDER.length)];
  return { type, row: 0, col: 3, rotation: 0 };
}

// Returns absolute [row, col] cells for a piece at a given position/rotation.
export function getCells(
  piece: ActivePiece,
  row = piece.row,
  col = piece.col,
  rotation = piece.rotation
): [number, number][] {
  const shape = PIECES[piece.type].rotations[rotation];
  return shape.map(([dr, dc]) => [row + dr, col + dc] as [number, number]);
}

export function collides(board: Board, piece: ActivePiece, row = piece.row, col = piece.col, rotation = piece.rotation): boolean {
  for (const [r, c] of getCells(piece, row, col, rotation)) {
    if (c < 0 || c >= COLS || r >= ROWS) return true;
    if (r >= 0 && board[r][c] !== EMPTY) return true;
  }
  return false;
}

// Try rotation with simple wall-kick: try offsets [-1,+1,-2,+2,0].
export function tryRotate(board: Board, piece: ActivePiece): ActivePiece | null {
  const nextRot = (piece.rotation + 1) % 4;
  const kicks = [-1, 1, -2, 2, 0];
  for (const dc of kicks) {
    if (!collides(board, piece, piece.row, piece.col + dc, nextRot)) {
      return { ...piece, col: piece.col + dc, rotation: nextRot };
    }
  }
  return null;
}

export function tryMove(board: Board, piece: ActivePiece, dr: number, dc: number): ActivePiece | null {
  const nr = piece.row + dr;
  const nc = piece.col + dc;
  if (!collides(board, piece, nr, nc, piece.rotation)) {
    return { ...piece, row: nr, col: nc };
  }
  return null;
}

// Lock piece into board, return new board.
export function lockPiece(board: Board, piece: ActivePiece): Board {
  const next = board.map((r) => [...r]);
  const colorIndex = PIECE_ORDER.indexOf(piece.type) + 1;
  for (const [r, c] of getCells(piece)) {
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
      next[r][c] = colorIndex;
    }
  }
  return next;
}

// Find completed row indices.
export function findFullRows(board: Board): number[] {
  const rows: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    if (board[r].every((v) => v !== EMPTY)) rows.push(r);
  }
  return rows;
}

// Remove full rows, return { board, cleared }.
export function clearRows(board: Board, rows: number[]): { board: Board; cleared: number } {
  if (rows.length === 0) return { board, cleared: 0 };
  const next = board.filter((_, r) => !rows.includes(r));
  while (next.length < ROWS) {
    next.unshift(Array<number>(COLS).fill(EMPTY));
  }
  return { board: next, cleared: rows.length };
}

// Scoring: 1=100, 2=300, 3=500, 4=800, multiplied by level.
export function scoreForLines(lines: number, level: number): number {
  const base = [0, 100, 300, 500, 800][lines] ?? 0;
  return base * level;
}

// Speed curve: exponential decay over elapsed seconds, clamped to minMs.
// Slower start (900ms) and gentler decay so the ramp-up is more gradual.
export function computeFallInterval(elapsedSeconds: number, level: number): number {
  const baseMs = 900;
  const k = 0.025; // gentler decay rate
  const minMs = 80;
  let interval = baseMs * Math.exp(-k * elapsedSeconds);
  // Additional reduction per level (clamped).
  const levelFactor = Math.min(0.06 * (level - 1), 0.5);
  interval *= 1 - levelFactor;
  return Math.max(minMs, interval);
}

// Compute ghost piece (hard-drop landing position).
export function computeGhost(board: Board, piece: ActivePiece): ActivePiece {
  let g = piece;
  while (!collides(board, piece, g.row + 1, g.col, g.rotation)) {
    g = { ...g, row: g.row + 1 };
  }
  return g;
}

export const PIECE_COLORS: Record<PieceType, string> = {
  I: "#22d3ee",
  O: "#fbbf24",
  T: "#c084fc",
  S: "#34d399",
  Z: "#fb7185",
  J: "#60a5fa",
  L: "#fb923c",
};

export const COLOR_BY_INDEX: string[] = [
  "",
  "#22d3ee",
  "#fbbf24",
  "#c084fc",
  "#34d399",
  "#fb7185",
  "#60a5fa",
  "#fb923c",
];