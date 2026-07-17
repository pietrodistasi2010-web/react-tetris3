import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivePiece,
  Board,
  PIECE_ORDER,
  PIECE_COLORS,
  clearRows,
  collides,
  computeFallInterval,
  computeGhost,
  createBoard,
  findFullRows,
  lockPiece,
  randomPiece,
  scoreForLines,
  tryMove,
  tryRotate,
} from "@/game/tetris";

export type GameStatus = "idle" | "playing" | "paused" | "gameover";

export interface TetrisState {
  board: Board;
  piece: ActivePiece | null;
  ghost: ActivePiece | null;
  score: number;
  lines: number;
  level: number;
  status: GameStatus;
  fallIntervalMs: number;
  announce: string;
}

const DROP_MULTIPLIER = 8;

export function useTetris() {
  const [board, setBoard] = useState<Board>(createBoard);
  const [piece, setPiece] = useState<ActivePiece | null>(null);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [status, setStatus] = useState<GameStatus>("idle");
  const [announce, setAnnounce] = useState("Partita pronta. Premi Inizia.");
  const [fallIntervalMs, setFallIntervalMs] = useState(800);

  const startTimeRef = useRef<number>(0);
  const lastFallRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const softDropRef = useRef<boolean>(false);
  const statusRef = useRef<GameStatus>("idle");
  const boardRef = useRef<Board>(board);
  const pieceRef = useRef<ActivePiece | null>(piece);
  const levelRef = useRef<number>(1);

  // Keep refs in sync for the rAF loop.
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { pieceRef.current = piece; }, [piece]);
  useEffect(() => { levelRef.current = level; }, [level]);

  const announceMsg = useCallback((msg: string) => {
    setAnnounce(msg);
  }, []);

  const spawn = useCallback((b: Board): ActivePiece | null => {
    const p = randomPiece();
    if (collides(b, p)) {
      // Game over — new piece can't spawn.
      setStatus("gameover");
      announceMsg("Game Over. Punteggio finale: " + scoreRef.current);
      return null;
    }
    return p;
  }, [announceMsg]);

  const scoreRef = useRef(0);
  useEffect(() => { scoreRef.current = score; }, [score]);

  // Lock current piece, clear lines, update score/level, spawn next.
  const lockAndAdvance = useCallback(() => {
    const cur = pieceRef.current;
    const b = boardRef.current;
    if (!cur) return;

    const locked = lockPiece(b, cur);
    const full = findFullRows(locked);

    if (full.length > 0) {
      const { board: cleared, cleared: n } = clearRows(locked, full);
      setBoard(cleared);
      boardRef.current = cleared;

      const newLines = linesRef.current + n;
      setLines(newLines);
      linesRef.current = newLines;

      const newLevel = Math.floor(newLines / 10) + 1;
      if (newLevel !== levelRef.current) {
        setLevel(newLevel);
        levelRef.current = newLevel;
        announceMsg(`Livello ${newLevel}! ${n} riga/e rimossa/e.`);
      } else {
        announceMsg(`${n} riga/e rimossa/e.`);
      }

      const gained = scoreForLines(n, newLevel);
      const newScore = scoreRef.current + gained;
      setScore(newScore);
      scoreRef.current = newScore;
    } else {
      setBoard(locked);
      boardRef.current = locked;
    }

    const next = spawn(boardRef.current);
    setPiece(next);
    pieceRef.current = next;
    lastFallRef.current = performance.now();
  }, [announceMsg, spawn]);

  const linesRef = useRef(0);
  useEffect(() => { linesRef.current = lines; }, [lines]);

  // Main game loop via requestAnimationFrame with delta time.
  useEffect(() => {
    if (status !== "playing") return;

    const loop = (now: number) => {
      if (statusRef.current !== "playing") return;

      const elapsed = (now - startTimeRef.current) / 1000;
      const baseInterval = computeFallInterval(elapsed, levelRef.current);
      const interval = softDropRef.current
        ? baseInterval / DROP_MULTIPLIER
        : baseInterval;

      setFallIntervalMs(baseInterval);

      if (now - lastFallRef.current >= interval) {
        lastFallRef.current = now;
        const cur = pieceRef.current;
        if (cur) {
          const moved = tryMove(boardRef.current, cur, 1, 0);
          if (moved) {
            setPiece(moved);
            pieceRef.current = moved;
          } else {
            lockAndAdvance();
          }
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [status, lockAndAdvance]);

  // --- Controls ---

  const startOrRestart = useCallback(() => {
    const b = createBoard();
    setBoard(b);
    boardRef.current = b;
    setScore(0); scoreRef.current = 0;
    setLines(0); linesRef.current = 0;
    setLevel(1); levelRef.current = 1;
    const p = randomPiece();
    setPiece(p);
    pieceRef.current = p;
    startTimeRef.current = performance.now();
    lastFallRef.current = performance.now();
    setStatus("playing");
    announceMsg("Partita iniziata. Buona fortuna!");
  }, [announceMsg]);

  const togglePause = useCallback(() => {
    setStatus((prev) => {
      if (prev === "playing") {
        announceMsg("Gioco in pausa.");
        return "paused";
      }
      if (prev === "paused") {
        lastFallRef.current = performance.now();
        announceMsg("Gioco ripreso.");
        return "playing";
      }
      return prev;
    });
  }, [announceMsg]);

  const moveLeft = useCallback(() => {
    if (statusRef.current !== "playing") return;
    const cur = pieceRef.current;
    if (!cur) return;
    const moved = tryMove(boardRef.current, cur, 0, -1);
    if (moved) { setPiece(moved); pieceRef.current = moved; }
  }, []);

  const moveRight = useCallback(() => {
    if (statusRef.current !== "playing") return;
    const cur = pieceRef.current;
    if (!cur) return;
    const moved = tryMove(boardRef.current, cur, 0, 1);
    if (moved) { setPiece(moved); pieceRef.current = moved; }
  }, []);

  const rotate = useCallback(() => {
    if (statusRef.current !== "playing") return;
    const cur = pieceRef.current;
    if (!cur) return;
    const rotated = tryRotate(boardRef.current, cur);
    if (rotated) { setPiece(rotated); pieceRef.current = rotated; }
  }, []);

  const startSoftDrop = useCallback(() => { softDropRef.current = true; }, []);
  const endSoftDrop = useCallback(() => { softDropRef.current = false; }, []);

  const hardDrop = useCallback(() => {
    if (statusRef.current !== "playing") return;
    const cur = pieceRef.current;
    if (!cur) return;
    let dropped = cur;
    while (true) {
      const next = tryMove(boardRef.current, dropped, 1, 0);
      if (!next) break;
      dropped = next;
    }
    setPiece(dropped);
    pieceRef.current = dropped;
    lockAndAdvance();
  }, [lockAndAdvance]);

  // Keyboard controls.
  useEffect(() => {
    const downKeys = new Set<string>();

    const onKeyDown = (e: KeyboardEvent) => {
      // Prevent page scroll on arrows/space.
      if (["ArrowLeft","ArrowRight","ArrowDown","ArrowUp"," "].includes(e.key)) {
        e.preventDefault();
      }
      if (downKeys.has(e.key)) return; // ignore auto-repeat for discrete actions
      downKeys.add(e.key);

      switch (e.key) {
        case "ArrowLeft": moveLeft(); break;
        case "ArrowRight": moveRight(); break;
        case "ArrowUp":
        case "t":
        case "T": rotate(); break;
        case "ArrowDown": startSoftDrop(); break;
        case " ": hardDrop(); break;
        case "p":
        case "P": togglePause(); break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      downKeys.delete(e.key);
      if (e.key === "ArrowDown") endSoftDrop();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [moveLeft, moveRight, rotate, startSoftDrop, endSoftDrop, hardDrop, togglePause]);

  const ghost = piece && status === "playing" ? computeGhost(board, piece) : null;

  return {
    board,
    piece,
    ghost,
    score,
    lines,
    level,
    status,
    fallIntervalMs,
    announce,
    startOrRestart,
    togglePause,
    moveLeft,
    moveRight,
    rotate,
    startSoftDrop,
    endSoftDrop,
    hardDrop,
  };
}