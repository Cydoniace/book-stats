import { useData } from '../App';
import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend,
  type ChartOptions,
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

export function BarChart({ labels, series, horizontal = false, height, format }: {
  labels: string[]; series: Series[]; horizontal?: boolean; height?: number; format?: (v: number) => string;
}) {
  const t = useTheme();
  const h = height ?? (horizontal ? Math.max(120, labels.length * 26 + 40) : 240);
  const options = baseOptions(t, horizontal, series.length > 1) as ChartOptions<'bar'>;
  if (format) options.plugins!.tooltip!.callbacks = { label: (c) => `${c.dataset.label ? c.dataset.label + ': ' : ''}${format(c.parsed[horizontal ? 'x' : 'y'] as number)}` };
  return (
    <div style={{ height: h }}>
      <Bar
        options={options}
        data={{
          labels,
          datasets: series.map((s, i) => ({
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
          datasets: series.map((s, i) => ({
            label: s.label, data: s.data, borderColor: s.color ?? t.bar, backgroundColor: s.color ?? t.bar,
            borderWidth: 3, pointRadius: 5, pointHoverRadius: 7, pointBorderColor: t.surface, pointBorderWidth: 2, tension: 0.25, spanGaps: true,
          })),
        }}
      />
    </div>
  );
}
