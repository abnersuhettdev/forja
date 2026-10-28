import { useEffect, useRef, useState, type PointerEvent } from "react";
import styles from "./LineChart.module.css";

// LineChart (UX-06): uma série + linhas de referência (inicial tracejada, meta) com rótulo
// direto; eixos com unidade; toque/hover mostra o valor (linha-guia e dica); sem animação.
// A alternativa acessível em lista fica na tela que usa o gráfico.
export interface ChartPoint {
  /** Data de calendário AAAA-MM-DD. */
  readonly date: string;
  readonly value: number;
}

export interface ChartReference {
  readonly value: number;
  readonly label: string;
  readonly dashed: boolean;
}

const HEIGHT = 200;
const PAD = { top: 16, right: 16, bottom: 28, left: 40 };
const DAY_MS = 86_400_000;

const time = (date: string) => new Date(`${date}T12:00:00Z`).getTime();

/** Marcas "redondas" do eixo vertical (passo 1, 2, 5 × 10ⁿ). */
function niceTicks(min: number, max: number, count = 4): number[] {
  const span = Math.max(max - min, 1);
  const raw = span / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * power).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step)
    ticks.push(Number(v.toFixed(6)));
  return ticks;
}

export function LineChart({
  points,
  references,
  unit,
  label,
  formatValue,
  formatDate,
}: {
  points: readonly ChartPoint[];
  references: readonly ChartReference[];
  unit: string;
  /** Resumo para leitores de tela (o detalhe fica na lista alternativa). */
  label: string;
  formatValue: (value: number) => string;
  formatDate: (date: string) => string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(240, Math.round(entry.contentRect.width)));
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  const values = [...points.map((p) => p.value), ...references.map((r) => r.value)];
  const padding = Math.max((Math.max(...values) - Math.min(...values)) * 0.15, 1);
  const yMin = Math.min(...values) - padding;
  const yMax = Math.max(...values) + padding;
  const first = time(points[0]?.date ?? "");
  const last = time(points.at(-1)?.date ?? "");
  const xSpan = Math.max(last - first, DAY_MS);
  const plotW = width - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (date: string) => PAD.left + ((time(date) - first) / xSpan) * plotW;
  const y = (value: number) => PAD.top + (1 - (value - yMin) / (yMax - yMin)) * plotH;
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join(" ");
  const ticks = niceTicks(yMin, yMax);
  const end = points.at(-1);
  const active = hover === null ? null : (points[hover] ?? null);

  /** Ponto mais próximo do ponteiro (alvo maior que a marca — UX-06). */
  function onMove(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * width;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.date) - px) < Math.abs(x(points[best]?.date ?? "") - px)) best = i;
    });
    setHover(best);
  }

  return (
    <div ref={box} className={styles.chart}>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={label}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => {
          setHover(null);
        }}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              className={styles.grid}
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text
              className={styles.axis}
              x={PAD.left - 6}
              y={y(tick)}
              textAnchor="end"
              dominantBaseline="middle"
            >
              {formatValue(tick)}
            </text>
          </g>
        ))}
        <text className={styles.axis} x={PAD.left - 6} y={PAD.top - 6} textAnchor="end">
          {unit}
        </text>
        <text className={styles.axis} x={PAD.left} y={HEIGHT - 8} textAnchor="start">
          {formatDate(points[0]?.date ?? "")}
        </text>
        <text className={styles.axis} x={width - PAD.right} y={HEIGHT - 8} textAnchor="end">
          {formatDate(end?.date ?? "")}
        </text>
        {references.map((ref) => (
          <g key={ref.label}>
            <line
              className={ref.dashed ? styles.referenceDashed : styles.reference}
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(ref.value)}
              y2={y(ref.value)}
            />
            <text className={styles.referenceLabel} x={PAD.left + 4} y={y(ref.value) - 4}>
              {ref.label}
            </text>
          </g>
        ))}
        <path className={styles.line} d={path} />
        {points.map((p, i) => (
          <circle
            key={p.date}
            className={styles.marker}
            cx={x(p.date)}
            cy={y(p.value)}
            r={i === hover ? 6 : 4}
          />
        ))}
        {end ? (
          <text
            className={styles.endLabel}
            x={x(end.date) - 6}
            y={y(end.value) - 10}
            textAnchor="end"
          >
            {formatValue(end.value)}
          </text>
        ) : null}
        {active ? (
          <line
            className={styles.crosshair}
            x1={x(active.date)}
            x2={x(active.date)}
            y1={PAD.top}
            y2={HEIGHT - PAD.bottom}
          />
        ) : null}
      </svg>
      {active ? (
        <div
          className={styles.tooltip}
          style={{ left: Math.min(Math.max(x(active.date) - 60, 0), width - 120) }}
          aria-hidden="true"
        >
          {formatDate(active.date)} · {formatValue(active.value)} {unit}
        </div>
      ) : null}
    </div>
  );
}
