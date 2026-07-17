import { useTetris } from "@/hooks/useTetris";
import { TetrisCanvas } from "@/components/TetrisCanvas";
import { TouchControls } from "@/components/TouchControls";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Pause, RotateCw } from "lucide-react";

export default function App() {
  const game = useTetris();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-slate-100">
      {/* Live region for screen readers */}
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {game.announce}
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-teal-400">
              Arcade · Accessible
            </p>
            <h1 className="mt-1 font-serif text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Tetris<span className="text-teal-400">.</span>
            </h1>
            <p className="mt-2 max-w-md text-sm text-slate-400">
              Real-time speed curve, wall-kick rotations, keyboard & touch controls.
              Built for keyboard and screen-reader users alike.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="lg"
              onClick={game.startOrRestart}
              className="bg-teal-500 text-slate-950 hover:bg-teal-400 focus-visible:ring-4 focus-visible:ring-teal-400/40"
              aria-label={game.status === "gameover" ? "Ricomincia partita" : "Inizia partita"}
            >
              <Play className="h-5 w-5" />
              {game.status === "idle" ? "Inizia" : game.status === "gameover" ? "Ricomincia" : "Nuova"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={game.togglePause}
              disabled={game.status === "idle" || game.status === "gameover"}
              className="border-slate-600 bg-slate-800/60 text-white hover:bg-slate-700 focus-visible:ring-4 focus-visible:ring-teal-400/40"
              aria-label={game.status === "paused" ? "Riprendi partita" : "Metti in pausa la partita"}
            >
              <Pause className="h-5 w-5" />
              {game.status === "paused" ? "Riprendi" : "Pausa"}
            </Button>
          </div>
        </header>

        {/* Main layout */}
        <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:gap-8">
          {/* Board column */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative rounded-2xl border border-slate-700/60 bg-slate-900/60 p-3 shadow-2xl shadow-teal-950/40 ring-1 ring-teal-500/10">
              <TetrisCanvas
                board={game.board}
                piece={game.piece}
                ghost={game.ghost}
                status={game.status}
              />
              {game.status === "paused" && (
                <div className="absolute inset-3 flex flex-col items-center justify-center rounded-xl bg-slate-950/80 backdrop-blur-sm">
                  <Pause className="h-10 w-10 text-teal-400" />
                  <p className="mt-2 font-serif text-2xl font-bold text-white">In pausa</p>
                  <p className="text-sm text-slate-400">Premi P o Riprendi</p>
                </div>
              )}
              {game.status === "gameover" && (
                <div className="absolute inset-3 flex flex-col items-center justify-center rounded-xl bg-slate-950/85 backdrop-blur-sm">
                  <p className="font-serif text-3xl font-bold text-rose-400">Game Over</p>
                  <p className="mt-1 text-sm text-slate-300">Punteggio: {game.score}</p>
                  <Button
                    className="mt-4 bg-teal-500 text-slate-950 hover:bg-teal-400"
                    onClick={game.startOrRestart}
                    aria-label="Ricomincia partita"
                  >
                    <RotateCw className="h-4 w-4" /> Ricomincia
                  </Button>
                </div>
              )}
            </div>

            {/* Touch controls */}
            <TouchControls
              onLeft={game.moveLeft}
              onRight={game.moveRight}
              onRotate={game.rotate}
              onSoftDropStart={game.startSoftDrop}
              onSoftDropEnd={game.endSoftDrop}
              onHardDrop={game.hardDrop}
              onTogglePause={game.togglePause}
              status={game.status}
            />
          </div>

          {/* Side panel */}
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
              <StatCard label="Punteggio" value={game.score} accent="teal" />
              <StatCard label="Righe" value={game.lines} accent="emerald" />
              <StatCard label="Livello" value={game.level} accent="cyan" />
            </div>

            <Card className="border-slate-700/60 bg-slate-800/40 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-teal-300">
                  Stato
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span
                    className={
                      "inline-block h-2.5 w-2.5 rounded-full " +
                      (game.status === "playing"
                        ? "bg-teal-400 animate-pulse"
                        : game.status === "paused"
                        ? "bg-amber-400"
                        : game.status === "gameover"
                        ? "bg-rose-500"
                        : "bg-slate-500")
                    }
                  />
                  <span className="text-lg font-medium text-white">
                    {statusLabel(game.status)}
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Velocità: {(game.fallIntervalMs).toFixed(0)}ms / caduta
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-700/60 bg-slate-800/40 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-teal-300">
                  Controlli
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-300">
                <ul className="space-y-1.5">
                  <li><Kbd>←</Kbd> <Kbd>→</Kbd> — Muovi</li>
                  <li><Kbd>↑</Kbd> / <Kbd>T</Kbd> — Ruota</li>
                  <li><Kbd>↓</Kbd> — Soft drop (tenibile)</li>
                  <li><Kbd>Space</Kbd> — Hard drop</li>
                  <li><Kbd>P</Kbd> — Pausa / Riprendi</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function statusLabel(s: string) {
  switch (s) {
    case "idle": return "Pronto";
    case "playing": return "In gioco";
    case "paused": return "In pausa";
    case "gameover": return "Game Over";
    default: return s;
  }
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-7 items-center justify-center rounded-md border border-slate-600 bg-slate-900 px-1.5 py-0.5 text-xs font-semibold text-teal-300">
      {children}
    </kbd>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "teal" | "emerald" | "cyan";
}) {
  const ring =
    accent === "teal"
      ? "ring-teal-500/20 bg-teal-500/10"
      : accent === "emerald"
      ? "ring-emerald-500/20 bg-emerald-500/10"
      : "ring-cyan-500/20 bg-cyan-500/10";
  return (
    <Card className={"border-slate-700/60 bg-slate-800/40 shadow-lg ring-1 " + ring}>
      <CardContent className="px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="mt-1 font-serif text-3xl font-bold text-white tabular-nums">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}