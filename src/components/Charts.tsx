import { useData } from '../App';
import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend,
  type ChartOptions, type Plugin,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend);

/** Цвета графиков берём из темы выбранного года. */
function useTheme() {
  const { theme } = useData();
  return { bar: theme.bar, text: theme.text2, grid: theme.grid, axis: theme.axis, surface: theme.surface, ink: theme.text };
}

const font = { family: 'Nunito, system-ui, -apple-system, "Segoe UI", sans-serif', size: 12, weight: 600 as const };

function baseOptions(t: ReturnType<typeof useTheme>, horizontal: boolean, legend: boolean): ChartOptions<'bar' | 'line'> {
  const valueAxis = { grid: { color: t.grid }, border: { display: false }, ticks: { color: t.text, font, precision: 0 }, beginAtZero: true };
  const catAxis = { grid: { display: false }, border: { color: t.axis }, ticks: { color: t.text, font, autoSkip: false } };
  return {
    locale: 'ru-RU',
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' : 'x',
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: legend, position: 'top', align: 'start', labels: { color: t.text, font, boxWidth: 10, boxHeight: 10, useBorderRadius: true, borderRadius: 2 } },
      tooltip: { backgroundColor: t.ink, titleColor: t.surface, bodyColor: t.surface, padding: 10, cornerRadius: 12, titleFont: font, bodyFont: font },
    },
    scales: horizontal ? { x: valueAxis, y: catAxis } : { x: catAxis, y: valueAxis },
  } as ChartOptions<'bar' | 'line'>;
}

export interface Series { label: string; data: (number | null)[]; color?: string; colors?: string[] }

/** Подписи «количество · процент» прямо на столбиках. Для узких столбиков не рисуются — тогда всё видно в подсказке. */
function valueLabelsPlugin(horizontal: boolean, ink: string, muted: string, num: (v: number) => string, pct?: (v: number) => string): Plugin<'bar'> {
  return {
    id: 'valueLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      chart.data.datasets.forEach((ds, i) => {
        const meta = chart.getDatasetMeta(i);
        if (meta.hidden) return;
        meta.data.forEach((el, j) => {
          const v = ds.data[j] as number | null;
          if (!v) return;
          const bar = el as unknown as { x: number; y: number; width: number; height: number };
          ctx.save();
          if (horizontal) {
            ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.font = '800 12px Nunito, system-ui, sans-serif'; ctx.fillStyle = ink;
            const a = num(v);
            ctx.fillText(a, bar.x + 6, bar.y);
            if (pct) {
              const w = ctx.measureText(a + ' ').width;
              ctx.font = '700 12px Nunito, system-ui, sans-serif'; ctx.fillStyle = muted;
              ctx.fillText('· ' + pct(v), bar.x + 6 + w, bar.y);
            }
          } else {
            if (bar.width < 24) { ctx.restore(); return; }
            ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
            ctx.font = '800 11px Nunito, system-ui, sans-serif'; ctx.fillStyle = ink;
            ctx.fillText(num(v), bar.x, bar.y - (pct ? 15 : 3));
            if (pct) {
              ctx.font = '700 10px Nunito, system-ui, sans-serif'; ctx.fillStyle = muted;
              ctx.fillText(pct(v), bar.x, bar.y - 3);
            }
          }
          ctx.restore();
        });
      });
    },
  };
}

export const percent = (n: number, total: number) => {
  if (!total) return '';
  const p = (n / total) * 100;
  return p > 0 && p < 1 ? '<1%' : `${Math.round(p)}%`;
};

export function BarChart({ labels, series, horizontal = false, height, format, total, values = true }: {
  labels: string[]; series: Series[]; horizontal?: boolean; height?: number; format?: (v: number) => string;
  /** от чего считать процент; без него проценты не показываются */
  total?: number;
  /** подписывать значения на столбиках */
  values?: boolean;
}) {
  const t = useTheme();
  const h = height ?? (horizontal ? Math.max(120, labels.length * 28 + 40) : 250);
  const options = baseOptions(t, horizontal, series.length > 1) as ChartOptions<'bar'>;
  const num = format ?? ((v: number) => String(v));
  const pct = total ? (v: number) => percent(v, total) : undefined;
  options.plugins!.tooltip!.callbacks = {
    label: (c) => {
      const v = c.parsed[horizontal ? 'x' : 'y'] as number;
      return `${c.dataset.label ? c.dataset.label + ': ' : ''}${num(v)}${pct ? ' · ' + pct(v) : ''}`;
    },
  };
  if (values) options.layout = { padding: horizontal ? { right: pct ? 78 : 36 } : { top: pct ? 30 : 16 } };
  const plugins = values ? [valueLabelsPlugin(horizontal, t.ink, t.text, num, pct)] : [];
  return (
    <div style={{ height: h }}>
      <Bar
        options={options}
        plugins={plugins}
        data={{
          labels,
          datasets: series.map((s) => ({
            label: s.label, data: s.data, backgroundColor: s.colors ?? s.color ?? t.bar, borderRadius: 8, borderSkipped: 'start',
            maxBarThickness: horizontal ? 18 : 36, categoryPercentage: 0.8, barPercentage: 0.9,
          })),
        }}
      />
    </div>
  );
}

export function LineChart({ labels, series, height = 240 }: { labels: string[]; series: Series[]; height?: number }) {
  const t = useTheme();
  return (
    <div style={{ height }}>
      <Line
        options={baseOptions(t, false, series.length > 1) as ChartOptions<'line'>}
        data={{
          labels,
          datasets: series.map((s) => ({
            label: s.label, data: s.data, borderColor: s.color ?? t.bar, backgroundColor: s.color ?? t.bar,
            borderWidth: 3, pointRadius: 5, pointHoverRadius: 7, pointBorderColor: t.surface, pointBorderWidth: 2, tension: 0.25, spanGaps: true,
          })),
        }}
      />
    </div>
  );
}
