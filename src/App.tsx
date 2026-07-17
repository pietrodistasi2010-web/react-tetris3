import { useEffect, useRef, useState, useCallback } from 'react';

// ==================== COSTANTI ====================
const COLS = 10;
const ROWS = 20;
const BUFFER = 2;
const TOTAL_ROWS = ROWS + BUFFER;
const CELL = 30;
const W = COLS * CELL;
const H = ROWS * CELL;
const NEXT_CELL = 22;
const NEXT_W = 4 * NEXT_CELL;
const NEXT_H = 4 * NEXT_CELL;

const COLORS: Record<string, [number, number]> = {
  I: [188, 80], O: [50, 85], T: [280, 65],
  S: [140, 60], Z: [0, 72], J: [222, 70], L: [28, 88]
};

const SHAPES: Record<string, number[][]> = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  O: [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
  T: [[0,1,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
  S: [[0,1,1,0],[1,1,0,0],[0,0,0,0],[0,0,0,0]],
  Z: [[1,1,0,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
  J: [[1,0,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
  L: [[0,0,1,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]]
};
const TYPES = ['I','O','T','S','Z','J','L'];

const KICKS = [[0,0],[-1,0],[1,0],[0,-1],[-2,0],[2,0]];

const LINE_SCORE = [0, 100, 300, 500, 800];
const LINES_PER_LEVEL = 10;
const BASE_SPEED = 800;
const SPEED_STEP = 70;
const MIN_SPEED = 80;
const SOFT_DROP_FACTOR = 0.12;

// ==================== TIPI ====================
type Piece = {
  type: string;
  matrix: number[][];
  row: number;
  col: number;
};

// ==================== LOGICA GIOCO ====================
function emptyBoard(): (string | null)[][] {
  const b: (string | null)[][] = [];
  for (let r = 0; r < TOTAL_ROWS; r++) {
    b.push(new Array(COLS).fill(null));
  }
  return b;
}

function refillBag(): string[] {
  const bag = TYPES.slice();
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = bag[i]; bag[i] = bag[j]; bag[j] = tmp;
  }
  return bag;
}

function makePiece(type: string): Piece {
  return {
    type,
    matrix: SHAPES[type].map(r => r.slice()),
    row: 0,
    col: 3
  };
}

function collides(board: (string | null)[][], piece: Piece, dRow: number, dCol: number, matrix?: number[][]): boolean {
  const m = matrix || piece.matrix;
  for (let r = 0; r < m.length; r++) {
    for (let c = 0; c < m[r].length; c++) {
      if (!m[r][c]) continue;
      const nr = piece.row + r + dRow;
      const nc = piece.col + c + dCol;
      if (nc < 0 || nc >= COLS || nr >= TOTAL_ROWS) return true;
      if (nr >= 0 && board[nr][nc]) return true;
    }
  }
  return false;
}

function rotateMatrix(m: number[][]): number[][] {
  const n = m.length;
  const out: number[][] = [];
  for (let r = 0; r < n; r++) {
    out.push(new Array(n).fill(0));
    for (let c = 0; c < n; c++) out[r][c] = m[n - 1 - c][r];
  }
  return out;
}

function tryRotate(board: (string | null)[][], piece: Piece): boolean {
  const rotated = rotateMatrix(piece.matrix);
  for (let i = 0; i < KICKS.length; i++) {
    const dc = KICKS[i][0], dr = KICKS[i][1];
    if (!collides(board, piece, dr, dc, rotated)) {
      piece.matrix = rotated;
      piece.row += dr;
      piece.col += dc;
      return true;
    }
  }
  return false;
}

function getGhost(board: (string | null)[][], piece: Piece): Piece {
  const g: Piece = { ...piece, matrix: piece.matrix.map(r => r.slice()) };
  while (!collides(board, g, 1, 0)) g.row++;
  return g;
}

function lockPiece(board: (string | null)[][], piece: Piece): (string | null)[][] {
  const newBoard = board.map(r => r.slice());
  for (let r = 0; r < piece.matrix.length; r++) {
    for (let c = 0; c < piece.matrix[r].length; c++) {
      if (piece.matrix[r][c]) {
        const br = piece.row + r, bc = piece.col + c;
        if (br >= 0 && br < TOTAL_ROWS) newBoard[br][bc] = piece.type;
      }
    }
  }
  return newBoard;
}

function clearLines(board: (string | null)[][]): { board: (string | null)[][]; cleared: number } {
  const newBoard = board.map(r => r.slice());
  let cleared = 0;
  for (let r = TOTAL_ROWS - 1; r >= 0; r--) {
    if (newBoard[r].every(v => v !== null)) {
      newBoard.splice(r, 1);
      newBoard.unshift(new Array(COLS).fill(null));
      cleared++;
      r++;
    }
  }
  return { board: newBoard, cleared };
}

// ==================== RENDERING ====================
function drawCell(c: CanvasRenderingContext2D, x: number, y: number, size: number, type: string, isGhost: boolean) {
  const hue = COLORS[type][0], sat = COLORS[type][1];
  if (isGhost) {
    c.strokeStyle = `hsl(${hue} ${sat}% 55% / 0.55)`;
    c.lineWidth = 2;
    c.strokeRect(x + 2, y + 2, size - 4, size - 4);
    return;
  }
  const grad = c.createLinearGradient(x, y, x, y + size);
  grad.addColorStop(0, `hsl(${hue} ${sat}% 62%)`);
  grad.addColorStop(1, `hsl(${hue} ${sat}% 42%)`);
  c.fillStyle = grad;
  c.fillRect(x + 1, y + 1, size - 2, size - 2);
  c.fillStyle = `hsl(${hue} ${sat}% 80% / 0.35)`;
  c.fillRect(x + 1, y + 1, size - 2, 3);
  c.fillRect(x + 1, y + 1, 3, size - 2);
  c.fillStyle = `hsl(${hue} ${sat}% 25% / 0.4)`;
  c.fillRect(x + 1, y + size - 4, size - 2, 3);
  c.fillRect(x + size - 4, y + 1, 3, size - 2);
}

function render(ctx: CanvasRenderingContext2D, board: (string | null)[][], current: Piece | null, running: boolean, paused: boolean) {
  ctx.fillStyle = '#0a0e1f';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(99,102,241,0.08)';
  ctx.lineWidth = 1;
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, H); ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(W, r * CELL); ctx.stroke();
  }

  for (let r = BUFFER; r < TOTAL_ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]) drawCell(ctx, c * CELL, (r - BUFFER) * CELL, CELL, board[r][c], false);
    }
  }

  if (running && !paused && current) {
    const g = getGhost(board, current);
    for (let r = 0; r < g.matrix.length; r++) {
      for (let c = 0; c < g.matrix[r].length; c++) {
        if (g.matrix[r][c]) {
          const rr = g.row + r - BUFFER, cc = g.col + c;
          if (rr >= 0) drawCell(ctx, cc * CELL, rr * CELL, CELL, g.type, true);
        }
      }
    }
    for (let r = 0; r < current.matrix.length; r++) {
      for (let c = 0; c < current.matrix[r].length; c++) {
        if (current.matrix[r][c]) {
          const rr = current.row + r - BUFFER, cc = current.col + c;
          if (rr >= 0) drawCell(ctx, cc * CELL, rr * CELL, CELL, current.type, false);
        }
      }
    }
  }
}

function drawNext(nctx: CanvasRenderingContext2D, nextPiece: string | null) {
  nctx.fillStyle = 'rgba(15,23,42,0.4)';
  nctx.fillRect(0, 0, NEXT_W, NEXT_H);
  if (!nextPiece) return;
  const m = SHAPES[nextPiece];
  let minR = 4, maxR = -1, minC = 4, maxC = -1;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    if (m[r][c]) {
      if (r < minR) minR = r; if (r > maxR) maxR = r;
      if (c < minC) minC = c; if (c > maxC) maxC = c;
    }
  }
  const pw = (maxC - minC + 1) * NEXT_CELL;
  const ph = (maxR - minR + 1) * NEXT_CELL;
  const ox = (NEXT_W - pw) / 2 - minC * NEXT_CELL;
  const oy = (NEXT_H - ph) / 2 - minR * NEXT_CELL;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (m[r][c]) drawCell(nctx, ox + c * NEXT_CELL, oy + r * NEXT_CELL, NEXT_CELL, nextPiece, false);
    }
  }
}

// ==================== COMPONENT ====================
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [overlay, setOverlay] = useState({ title: 'TF-047', text: 'Premi Start per giocare', btn: 'Start', show: true });

  const boardRef = useRef<(string | null)[][]>(emptyBoard());
  const currentRef = useRef<Piece | null>(null);
  const nextRef = useRef<string | null>(null);
  const bagRef = useRef<string[]>([]);
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const linesRef = useRef(0);
  const dropMsRef = useRef(BASE_SPEED);
  const dropAccRef = useRef(0);
  const runningRef = useRef(false);
  const pausedRef = useRef(false);
  const gameOverRef = useRef(false);
  const lastTimeRef = useRef(0);
  const keysDownRef = useRef<Set<string>>(new Set());

  const takeFromBag = useCallback(() => {
    if (bagRef.current.length === 0) bagRef.current = refillBag();
    return bagRef.current.pop()!;
  }, []);

  const spawn = useCallback(() => {
    if (!nextRef.current) nextRef.current = takeFromBag();
    currentRef.current = makePiece(nextRef.current);
    nextRef.current = takeFromBag();
    if (collides(boardRef.current, currentRef.current, 0, 0)) {
      gameOverRef.current = true;
      runningRef.current = false;
      setOverlay({ title: 'Game Over', text: `Punteggio finale: ${scoreRef.current}`, btn: 'Riprova', show: true });
    }
  }, [takeFromBag]);

  const startGame = useCallback(() => {
    boardRef.current = emptyBoard();
    bagRef.current = refillBag();
    nextRef.current = takeFromBag();
    scoreRef.current = 0; setScore(0);
    levelRef.current = 1; setLevel(1);
    linesRef.current = 0; setLines(0);
    dropMsRef.current = BASE_SPEED;
    dropAccRef.current = 0;
    gameOverRef.current = false;
    pausedRef.current = false;
    runningRef.current = true;
    setOverlay(o => ({ ...o, show: false }));
    spawn();
  }, [takeFromBag, spawn]);

  const lockAndSpawn = useCallback(() => {
    if (!currentRef.current) return;
    boardRef.current = lockPiece(boardRef.current, currentRef.current);
    const { board: newBoard, cleared } = clearLines(boardRef.current);
    boardRef.current = newBoard;
    if (cleared > 0) {
      linesRef.current += cleared;
      scoreRef.current += LINE_SCORE[cleared] * levelRef.current;
      setScore(scoreRef.current);
      setLines(linesRef.current);
      const newLevel = Math.floor(linesRef.current / LINES_PER_LEVEL) + 1;
      if (newLevel !== levelRef.current) {
        levelRef.current = newLevel;
        setLevel(newLevel);
        dropMsRef.current = Math.max(MIN_SPEED, BASE_SPEED - (newLevel - 1) * SPEED_STEP);
      }
    }
    spawn();
  }, [spawn]);

  const hardDrop = useCallback(() => {
    if (!runningRef.current || pausedRef.current || !currentRef.current) return;
    let dist = 0;
    while (!collides(boardRef.current, currentRef.current, 1, 0)) {
      currentRef.current.row++;
      dist++;
    }
    scoreRef.current += dist * 2;
    setScore(scoreRef.current);
    lockAndSpawn();
  }, [lockAndSpawn]);

  const softDrop = useCallback(() => {
    if (!runningRef.current || pausedRef.current || !currentRef.current) return;
    if (!collides(boardRef.current, currentRef.current, 1, 0)) {
      currentRef.current.row++;
      dropAccRef.current = 0;
    } else {
      lockAndSpawn();
    }
  }, [lockAndSpawn]);

  const moveLeft = useCallback(() => {
    if (!runningRef.current || pausedRef.current || !currentRef.current) return;
    if (!collides(boardRef.current, currentRef.current, 0, -1)) currentRef.current.col--;
  }, []);

  const moveRight = useCallback(() => {
    if (!runningRef.current || pausedRef.current || !currentRef.current) return;
    if (!collides(boardRef.current, currentRef.current, 0, 1)) currentRef.current.col++;
  }, []);

  const doRotate = useCallback(() => {
    if (!runningRef.current || pausedRef.current || !currentRef.current) return;
    tryRotate(boardRef.current, currentRef.current);
  }, []);

  const togglePause = useCallback(() => {
    if (!runningRef.current || gameOverRef.current) return;
    pausedRef.current = !pausedRef.current;
    if (pausedRef.current) {
      setOverlay({ title: 'Pausa', text: 'Premi P per riprendere', btn: 'Riprendi', show: true });
    } else {
      setOverlay(o => ({ ...o, show: false }));
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key;
      keysDownRef.current.add(k);
      if (k === 'p' || k === 'P') { togglePause(); e.preventDefault(); return; }
      if (!runningRef.current || pausedRef.current) return;
      switch (k) {
        case 'ArrowLeft': moveLeft(); e.preventDefault(); break;
        case 'ArrowRight': moveRight(); e.preventDefault(); break;
        case 'ArrowDown': softDrop(); e.preventDefault(); break;
        case 'ArrowUp':
        case 'x': case 'X': doRotate(); e.preventDefault(); break;
        case ' ': hardDrop(); e.preventDefault(); break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysDownRef.current.delete(e.key);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [togglePause, moveLeft, moveRight, softDrop, doRotate, hardDrop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const nextCanvas = nextCanvasRef.current;
    if (!canvas || !nextCanvas) return;
    const ctx = canvas.getContext('2d')!;
    const nctx = nextCanvas.getContext('2d')!;
    canvas.width = W; canvas.height = H;
    nextCanvas.width = NEXT_W; nextCanvas.height = NEXT_H;

    let rafId: number;
    const loop = (t: number) => {
      const dt = t - lastTimeRef.current;
      lastTimeRef.current = t;
      if (runningRef.current && !pausedRef.current && !gameOverRef.current) {
        dropAccRef.current += dt;
        const interval = keysDownRef.current.has('ArrowDown') ? dropMsRef.current * SOFT_DROP_FACTOR : dropMsRef.current;
        while (dropAccRef.current >= interval) {
          dropAccRef.current -= interval;
          if (!currentRef.current || !collides(boardRef.current, currentRef.current, 1, 0)) {
            if (currentRef.current) currentRef.current.row++;
          } else {
            lockAndSpawn();
            break;
          }
        }
      }
      render(ctx, boardRef.current, currentRef.current, runningRef.current, pausedRef.current);
      drawNext(nctx, nextRef.current);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [lockAndSpawn]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-4 font-sans">
      <div className="flex gap-6 items-stretch">
        <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-indigo-500/30">
          <canvas ref={canvasRef} className="block bg-slate-900" />
          {overlay.show && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm gap-4 z-10">
              <h2 className="text-3xl font-extrabold tracking-wide">{overlay.title}</h2>
              <p className="text-slate-400 text-sm">{overlay.text}</p>
              <button
                onClick={() => {
                  if (pausedRef.current && !gameOverRef.current) {
                    pausedRef.current = false;
                    setOverlay(o => ({ ...o, show: false }));
                  } else {
                    startGame();
                  }
                }}
                className="mt-2 px-7 py-3 bg-gradient-to-br from-indigo-500 to-violet-500 text-white rounded-xl font-semibold shadow-lg hover:scale-105 transition-transform"
              >
                {overlay.btn}
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-4 w-56">
          <div className="bg-slate-800/50 border border-indigo-500/20 rounded-2xl p-4 backdrop-blur">
            <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">Prossimo</h3>
            <canvas ref={nextCanvasRef} className="block mx-auto" />
          </div>
          <div className="bg-slate-800/50 border border-indigo-500/20 rounded-2xl p-4 backdrop-blur">
            <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">Punteggio</h3>
            <div className="grid gap-3">
              <div className="flex justify-between items-baseline">
                <span className="text-xs uppercase tracking-wider text-slate-500">Punti</span>
                <span className="text-2xl font-extrabold text-slate-100 tabular-nums">{score}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs uppercase tracking-wider text-slate-500">Livello</span>
                <span className="text-2xl font-extrabold text-slate-100 tabular-nums">{level}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs uppercase tracking-wider text-slate-500">Linee</span>
                <span className="text-2xl font-extrabold text-slate-100 tabular-nums">{lines}</span>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 border border-indigo-500/20 rounded-2xl p-4 backdrop-blur">
            <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">Controlli</h3>
            <div className="text-xs leading-relaxed text-slate-400 space-y-1">
              <div className="flex justify-between"><span>Sinistra</span><kbd className="bg-indigo-500/10 border border-indigo-500/30 rounded px-2 py-0.5 text-indigo-300 font-mono">←</kbd></div>
              <div className="flex justify-between"><span>Destra</span><kbd className="bg-indigo-500/10 border border-indigo-500/30 rounded px-2 py-0.5 text-indigo-300 font-mono">→</kbd></div>
              <div className="flex justify-between"><span>Soft drop</span><kbd className="bg-indigo-500/10 border border-indigo-500/30 rounded px-2 py-0.5 text-indigo-300 font-mono">↓</kbd></div>
              <div className="flex justify-between"><span>Ruota</span><kbd className="bg-indigo-500/10 border border-indigo-500/30 rounded px-2 py-0.5 text-indigo-300 font-mono">X / ↑</kbd></div>
              <div className="flex justify-between"><span>Hard drop</span><kbd className="bg-indigo-500/10 border border-indigo-500/30 rounded px-2 py-0.5 text-indigo-300 font-mono">Space</kbd></div>
              <div className="flex justify-between"><span>Pausa</span><kbd className="bg-indigo-500/10 border border-indigo-500/30 rounded px-2 py-0.5 text-indigo-300 font-mono">P</kbd></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}