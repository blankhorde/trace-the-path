import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BOARDS, type Board } from "@/lib/trace-boards";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Trace — One Continuous Route Puzzle" },
      {
        name: "description",
        content:
          "Trace is a single-stroke grid puzzle: cover every open cell with one unbroken line, route around blocked cells, and hit the numbers in order.",
      },
      { property: "og:title", content: "Trace — One Continuous Route Puzzle" },
      {
        property: "og:description",
        content: "One line. Every open cell. Numbers in order. A calm, frost-toned single-stroke puzzle.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Trace,
});

const PAD = 10;
const GAP = 6;

type Cell = [number, number];
const key = (c: Cell) => c[0] + "," + c[1];

function Trace() {
  const [roundIndex, setRoundIndex] = useState(0);
  const [solvedRounds, setSolvedRounds] = useState<number[]>([]);
  const [path, setPath] = useState<Cell[]>([]);
  const [message, setMessage] = useState<{ text: string; bad?: boolean }>({ text: "" });
  const [outcome, setOutcome] = useState<"solved" | "stuck" | null>(null);
  const [cs, setCs] = useState(56);

  const shellRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const board: Board = BOARDS[roundIndex];
  const blocked = useMemo(() => new Set(board.blocked.map(([x, y]) => x + "," + y)), [board]);
  const waypointMap = useMemo(() => {
    const m: Record<string, { x: number; y: number; n: number }> = {};
    board.waypoints.forEach((w) => (m[w.x + "," + w.y] = w));
    return m;
  }, [board]);
  const totalCells = board.w * board.h - board.blocked.length;
  const lastNumber = board.waypoints.length;

  useLayoutEffect(() => {
    const measure = () => {
      const avail = shellRef.current?.clientWidth ?? 320;
      const size = Math.min(60, Math.floor((avail - PAD * 2 - GAP * (board.w - 1)) / board.w));
      setCs(Math.max(26, size));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [board.w]);

  const px = (v: number) => PAD + v * (cs + GAP);
  const center = (c: Cell): [number, number] => [px(c[0]) + cs / 2, px(c[1]) + cs / 2];
  const W = PAD * 2 + board.w * cs + GAP * (board.w - 1);
  const H = PAD * 2 + board.h * cs + GAP * (board.h - 1);

  const loadRound = useCallback((i: number) => {
    setRoundIndex(i);
    setPath([]);
    setMessage({ text: "" });
    setOutcome(null);
  }, []);

  const reset = useCallback(() => {
    setPath([]);
    setMessage({ text: "" });
    setOutcome(null);
  }, []);

  const nextExpected = (p: Cell[]) => {
    let n = 1;
    for (const c of p) {
      const w = waypointMap[key(c)];
      if (w) n = w.n + 1;
    }
    return n;
  };

  const canEnter = (p: Cell[], c: Cell) => {
    const k = key(c);
    if (blocked.has(k)) return false;
    if (p.some((q) => q[0] === c[0] && q[1] === c[1])) return false;
    const w = waypointMap[k];
    if (w) {
      if (w.n !== nextExpected(p)) return false;
      if (w.n === lastNumber && p.length < totalCells - 1) return false;
    }
    return true;
  };

  const isStuck = (p: Cell[]) => {
    if (!p.length || p.length === totalCells) return false;
    const last = p[p.length - 1];
    const neighbours: Cell[] = [
      [last[0] + 1, last[1]],
      [last[0] - 1, last[1]],
      [last[0], last[1] + 1],
      [last[0], last[1] - 1],
    ];
    return !neighbours.some(
      (n) => n[0] >= 0 && n[0] < board.w && n[1] >= 0 && n[1] < board.h && canEnter(p, n),
    );
  };

  const cellFromEvent = (e: React.PointerEvent) => {
    const r = boardRef.current?.getBoundingClientRect();
    if (!r) return null;
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const x = Math.floor((mx - PAD) / (cs + GAP));
    const y = Math.floor((my - PAD) / (cs + GAP));
    if (x < 0 || x >= board.w || y < 0 || y >= board.h) return null;
    const cx = px(x) + cs / 2;
    const cy = px(y) + cs / 2;
    if (Math.abs(mx - cx) > cs * 0.55 || Math.abs(my - cy) > cs * 0.55) return null;
    return [x, y] as Cell;
  };

  const tryExtend = (c: Cell) => {
    if (outcome) return;
    const k = key(c);
    if (blocked.has(k)) return;

    setPath((prev) => {
      if (!prev.length) {
        const w = waypointMap[k];
        if (!w || w.n !== 1) {
          setMessage({ text: "Start on 1 to open the route.", bad: true });
          return prev;
        }
        setMessage({ text: "" });
        return [c];
      }

      const last = prev[prev.length - 1];
      if (last[0] === c[0] && last[1] === c[1]) return prev;

      // backing up along your own line
      if (prev.length > 1) {
        const before = prev[prev.length - 2];
        if (before[0] === c[0] && before[1] === c[1]) {
          setMessage({ text: "" });
          return prev.slice(0, -1);
        }
      }

      if (Math.abs(last[0] - c[0]) + Math.abs(last[1] - c[1]) !== 1) return prev;
      if (prev.some((q) => q[0] === c[0] && q[1] === c[1])) return prev;

      const w = waypointMap[k];
      if (w) {
        const exp = nextExpected(prev);
        if (w.n !== exp) {
          setMessage({ text: `Numbers in order — next is ${exp}.`, bad: true });
          return prev;
        }
        if (w.n === lastNumber && prev.length < totalCells - 1) {
          setMessage({ text: "Cover every open cell before the last number.", bad: true });
          return prev;
        }
      }

      const next = [...prev, c];
      setMessage({ text: "" });

      if (next.length === totalCells) {
        const endWaypoint = waypointMap[k];
        if (endWaypoint && endWaypoint.n === lastNumber) {
          setOutcome("solved");
          setSolvedRounds((s) => (s.includes(roundIndex) ? s : [...s, roundIndex]));
        }
      } else if (isStuck(next)) {
        setOutcome("stuck");
      }
      return next;
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const c = cellFromEvent(e);
    if (!c) return;
    const idx = path.findIndex((p) => p[0] === c[0] && p[1] === c[1]);
    if (idx >= 0) {
      setPath(path.slice(0, idx + 1));
      setMessage({ text: "" });
      setOutcome(null);
      return;
    }
    tryExtend(c);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const c = cellFromEvent(e);
    if (c) tryExtend(c);
  };

  useEffect(() => {
    const up = () => (dragging.current = false);
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);

  const onSet = new Set(path.map(key));
  const d = path
    .map((c, i) => {
      const [x, y] = center(c);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  const head = path.length ? center(path[path.length - 1]) : null;

  const cells: Cell[] = [];
  for (let y = 0; y < board.h; y++) for (let x = 0; x < board.w; x++) cells.push([x, y]);

  return (
    <main className="min-h-screen w-full bg-background font-display text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col justify-center px-4 py-8">
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl border border-frost bg-surface">
              <span className="text-lg font-bold leading-none text-accent">T</span>
            </div>
            <div className="leading-tight">
              <h1 className="text-[17px] font-bold tracking-tight text-ink">Trace</h1>
              <p className="text-[11px] text-slate">One continuous route</p>
            </div>
          </div>
          <div className="text-right leading-tight">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink">
              Round {String(roundIndex + 1).padStart(2, "0")}
            </p>
            <p className="text-[11px] text-slate">
              Solved {String(solvedRounds.length).padStart(2, "0")} / {BOARDS.length}
            </p>
          </div>
        </header>

        <div ref={shellRef} className="rounded-3xl border border-frost bg-surface p-4">
          <div
            ref={boardRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            className="relative mx-auto touch-none select-none"
            style={{ width: W, height: H }}
          >
            {cells.map((c) => {
              const k = key(c);
              const isBlocked = blocked.has(k);
              const on = onSet.has(k);
              return (
                <div
                  key={k}
                  className={
                    "absolute rounded-lg border " +
                    (isBlocked
                      ? "border-ink/15 bg-ink/15"
                      : on
                        ? "border-accent/25 bg-accent/10"
                        : "border-ink/5 bg-frost")
                  }
                  style={{ left: px(c[0]), top: px(c[1]), width: cs, height: cs }}
                />
              );
            })}

            <svg width={W} height={H} className="pointer-events-none absolute inset-0">
              {path.length > 0 && (
                <path
                  d={d}
                  fill="none"
                  stroke="var(--accent-line)"
                  strokeWidth={Math.max(9, cs * 0.3)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {head && <circle cx={head[0]} cy={head[1]} r={cs * 0.18} fill="var(--ink)" />}
            </svg>

            {board.waypoints.map((w) => {
              const s = Math.round(cs * 0.54);
              const hit = onSet.has(w.x + "," + w.y);
              return (
                <div
                  key={w.n}
                  className={
                    "pointer-events-none absolute grid place-items-center rounded-full text-[12px] font-bold " +
                    (hit ? "bg-ink text-frost" : "border-2 border-ink bg-surface text-ink")
                  }
                  style={{
                    left: px(w.x) + (cs - s) / 2,
                    top: px(w.y) + (cs - s) / 2,
                    width: s,
                    height: s,
                  }}
                >
                  {w.n}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="leading-tight">
              <p className="text-[13px] font-semibold text-ink">
                {path.length} of {totalCells} on the route
              </p>
              <p className={"text-[11px] " + (message.bad ? "text-coral" : "text-slate")}>
                {message.text || "Drag to extend, back along your line to undo"}
              </p>
            </div>
            <button
              onClick={reset}
              className="rounded-xl border border-frost bg-surface px-3 py-2 text-[12px] font-semibold text-slate transition-colors hover:text-ink"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-6 gap-2">
          {BOARDS.map((_, i) => (
            <button
              key={i}
              onClick={() => loadRound(i)}
              className={
                "rounded-xl border py-2 text-[12px] font-semibold transition-colors " +
                (i === roundIndex
                  ? "border-accent bg-accent text-frost"
                  : solvedRounds.includes(i)
                    ? "border-accent/40 bg-surface text-accent"
                    : "border-frost bg-surface text-slate")
              }
            >
              {String(i + 1).padStart(2, "0")}
            </button>
          ))}
        </div>

        {outcome && (
          <div className="mt-4 rounded-2xl border border-frost bg-surface p-4">
            <p className={"text-[13px] font-semibold " + (outcome === "solved" ? "text-ink" : "text-coral")}>
              {outcome === "solved" ? "Solved" : "Stuck"} — Round {String(roundIndex + 1).padStart(2, "0")}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-slate">
              {outcome === "solved"
                ? "Every open cell on one line. Nothing crossed, nothing missed. Route set."
                : "The line has nowhere left to go. Back up along it, or start the round again."}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => (outcome === "solved" ? loadRound(roundIndex) : reset())}
                className="rounded-xl border border-accent bg-accent px-4 py-2 text-[12px] font-semibold text-frost"
              >
                Play again
              </button>
              {outcome === "solved" && roundIndex < BOARDS.length - 1 && (
                <button
                  onClick={() => loadRound(roundIndex + 1)}
                  className="rounded-xl border border-frost bg-surface px-4 py-2 text-[12px] font-semibold text-ink"
                >
                  Next round
                </button>
              )}
            </div>
          </div>
        )}

        <p className="mt-4 text-center text-[11px] leading-relaxed text-slate">
          One unbroken line. Every open cell exactly once, numbers in order, blocked cells routed around.
        </p>
      </div>
    </main>
  );
}
