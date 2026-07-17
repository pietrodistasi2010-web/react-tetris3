import { useEffect, useRef } from "react";
import {
  ActivePiece,
  Board,
  COLS,
  ROWS,
  PIECE_COLORS,
  COLOR_BY_INDEX,
  getCells,
  computeGhost,
} from "@/game/tetris";

const CELL = 28; // px per cell

export function TetrisCanvas({
  board,
  piece,
  ghost,
  status,
}: {
  board: Board;
  piece: ActivePiece | null;
  ghost: ActivePiece | null;
  status: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = COLS * CELL;
    const H = ROWS * CELL;
    canvas.width = W;
    canvas.height = H;

    // Background
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = "rgba(148,163,184,0.08)";
    ctx.lineWidth = 1;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL, 0);
      ctx.lineTo(c * CELL, H);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL);
      ctx.lineTo(W, r * CELL);
      ctx.stroke();
    }

    // Draw locked blocks
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const v = board[r][c];
        if (v !== 0) {
          drawCell(ctx, c, r, COLOR_BY_INDEX[v]);
        }
      }
    }

    // Draw ghost
    if (ghost && status === "playing") {
      const color = PIECE_COLORS[ghost.type];
      for (const [r, c] of getCells(ghost)) {
        if (r < 0) continue;
        ctx.strokeStyle = color + "66";
        ctx.lineWidth = 2;
        ctx.strokeRect(c * CELL + 2, r * CELL + 2, CELL - 4, CELL - 4);
      }
    }

    // Draw current piece
    if (piece && status !== "gameover") {
      const color = PIECE_COLORS[piece.type];
      for (const [r, c] of getCells(piece)) {
        if (r < 0) continue;
        drawCell(ctx, c, r, color);
      }
    }
  }, [board, piece, ghost, status]);

  return (
    <canvas
      ref={canvasRef}
      className="block rounded-lg"
      style={{ width: COLS * CELL, height: ROWS * CELL }}
      aria-label="Tavolo da gioco Tetris"
      role="img"
    />
  );
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  color: string
) {
  const x = col * CELL;
  const y = row * CELL;
  // Fill
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
  // Top highlight
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(x + 1, y + 1, CELL - 2, 4);
  // Bottom shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(x + 1, y + CELL - 5, CELL - 2, 4);
  // Inner border
  ctx.strokeStyle = "rgba(15,23,42,0.5)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 1.5, y + 1.5, CELL - 3, CELL - 3);
}