import { useEffect, useState } from 'react';
import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend,
  type ChartOptions,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend);

/** Цвета графиков берём из CSS-переменных, чтобы светлая и тёмная темы менялись в одном месте. */
function useTheme() {
  const read = () => {
    const s = getComputedStyle(document.documentElement);
    const v = (n: string) => s.getPropertyValue(n).trim();
    return {
      series: [v('--series-1'), v('--series-2'), v('--series-3'), v('--series-4')],
      text: v('--text-2'), grid: v('--grid'), axis: v('--axis'), surface: v('--surface'), ink: v('--text'),
    };
  };
  const [t, setT] = useState(read);
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const on = () => setT(read());
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return t;
}

const font = { family: 'system-ui, -apple-system, "Segoe UI", sans-serif', size: 12 };

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
      tooltip: { backgroundColor: t.ink, titleColor: t.surface, bodyColor: t.surface, padding: 8, cornerRadius: 6, titleFont: font, bodyFont: font },
    },
    scales: horizontal ? { x: valueAxis, y: catAxis } : { x: catAxis, y: valueAxis },
  } as ChartOptions<'bar' | 'line'>;
}

export interface Series { label: string; data: (number | null)[] }

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
            label: s.label, data: s.data, backgroundColor: t.series[i], borderRadius: 4, borderSkipped: 'start',
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
            label: s.label, data: s.data, borderColor: t.series[i], backgroundColor: t.series[i],
            borderWidth: 2, pointRadius: 4, pointHoverRadius: 6, pointBorderColor: t.surface, pointBorderWidth: 2, tension: 0.25, spanGaps: true,
          })),
        }}
      />
    </div>
  );
}
