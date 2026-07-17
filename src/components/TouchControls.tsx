import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, RotateCw, ArrowDown, ChevronDown, Pause, Play } from "lucide-react";

interface Props {
  onLeft: () => void;
  onRight: () => void;
  onRotate: () => void;
  onSoftDropStart: () => void;
  onSoftDropEnd: () => void;
  onHardDrop: () => void;
  onTogglePause: () => void;
  status: string;
}

export function TouchControls({
  onLeft,
  onRight,
  onRotate,
  onSoftDropStart,
  onSoftDropEnd,
  onHardDrop,
  onTogglePause,
  status,
}: Props) {
  const disabled = status !== "playing" && status !== "paused";

  return (
    <div
      className="grid w-full max-w-sm grid-cols-4 gap-2 sm:gap-3"
      role="group"
      aria-label="Controlli di gioco"
    >
      {/* Left */}
      <ControlButton
        ariaLabel="Muovi a sinistra"
        onClick={onLeft}
        disabled={disabled}
        className="col-span-1"
      >
        <ArrowLeft className="h-6 w-6" />
        <span className="mt-1 text-xs font-semibold">Sinistra</span>
      </ControlButton>

      {/* Rotate */}
      <ControlButton
        ariaLabel="Ruota pezzo in senso orario"
        onClick={onRotate}
        disabled={disabled}
        className="col-span-1"
      >
        <RotateCw className="h-6 w-6" />
        <span className="mt-1 text-xs font-semibold">Ruota</span>
      </ControlButton>

      {/* Right */}
      <ControlButton
        ariaLabel="Muovi a destra"
        onClick={onRight}
        disabled={disabled}
        className="col-span-1"
      >
        <ArrowRight className="h-6 w-6" />
        <span className="mt-1 text-xs font-semibold">Destra</span>
      </ControlButton>

      {/* Pause */}
      <ControlButton
        ariaLabel={status === "paused" ? "Riprendi partita" : "Metti in pausa"}
        onClick={onTogglePause}
        disabled={status === "idle" || status === "gameover"}
        className="col-span-1"
      >
        {status === "paused" ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
        <span className="mt-1 text-xs font-semibold">{status === "paused" ? "Riprendi" : "Pausa"}</span>
      </ControlButton>

      {/* Soft drop (press-and-hold) */}
      <ControlButton
        ariaLabel="Soft drop — tieni premuto per accelerare la caduta"
        onPointerDown={(e) => { e.preventDefault(); onSoftDropStart(); }}
        onPointerUp={onSoftDropEnd}
        onPointerLeave={onSoftDropEnd}
        onPointerCancel={onSoftDropEnd}
        disabled={disabled}
        className="col-span-2"
      >
        <ArrowDown className="h-6 w-6" />
        <span className="mt-1 text-xs font-semibold">Soft Drop</span>
      </ControlButton>

      {/* Hard drop */}
      <ControlButton
        ariaLabel="Hard drop — lascia cadere il pezzo immediatamente"
        onClick={onHardDrop}
        disabled={disabled}
        className="col-span-2 bg-teal-500/20 ring-teal-400/30 hover:bg-teal-500/30"
      >
        <ChevronDown className="h-6 w-6" />
        <span className="mt-1 text-xs font-semibold">Hard Drop</span>
      </ControlButton>
    </div>
  );
}

function ControlButton({
  children,
  ariaLabel,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  ariaLabel: string;
  onClick?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerUp?: () => void;
  onPointerLeave?: () => void;
  onPointerCancel?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerCancel}
      disabled={disabled}
      className={
        "flex min-h-16 flex-col items-center justify-center rounded-xl border border-slate-600/60 bg-slate-800/70 px-2 py-3 text-white shadow-md transition-all hover:bg-slate-700 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-400/50 disabled:cursor-not-allowed disabled:opacity-40 " +
        className
      }
    >
      {children}
    </button>
  );
}