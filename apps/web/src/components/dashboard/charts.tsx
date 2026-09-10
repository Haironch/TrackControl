import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DashboardStatistics } from '@trackcontrol/shared';
import { colorHex } from '@/lib/colors';
import { formatCompactCurrency, formatCurrency, formatPercent } from '@/lib/utils';

const axis = { fontSize: 11, fill: '#94a3b8' };
const grid = { stroke: '#e2e8f0', strokeDasharray: '3 3', vertical: false };
const tooltipStyle = { borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -10px rgb(15 23 42 / 0.2)', fontSize: 12 };

export function DailyChart({ data }: { data: DashboardStatistics['daily'] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gShipped" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gDelivered" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...grid} />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="shipped" name="Enviados" stroke="#0ea5e9" strokeWidth={2} fill="url(#gShipped)" />
        <Area type="monotone" dataKey="delivered" name="Entregados" stroke="#10b981" strokeWidth={2} fill="url(#gDelivered)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DeliveriesVsReturnsChart({ data }: { data: DashboardStatistics['daily'] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid {...grid} />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="delivered" name="Entregas" stroke="#10b981" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="returned" name="Devoluciones" stroke="#f43f5e" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function StatusChart({ data }: { data: DashboardStatistics['byStatus'] }) {
  const rows = data.filter((d) => d.count > 0);
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, rows.length * 26)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }} barCategoryGap={6}>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="label" width={130} tick={{ ...axis, fill: '#475569' }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9' }} />
        <Bar dataKey="count" name="Paquetes" radius={[0, 6, 6, 0]} label={{ position: 'right', fontSize: 11, fill: '#64748b' }}>
          {rows.map((r) => (
            <Cell key={r.code} fill={colorHex(r.color)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SuccessRateChart({ data }: { data: DashboardStatistics['successRate'] }) {
  const rows = [
    { name: 'Entregados', value: data.delivered, color: '#10b981' },
    { name: 'Devueltos', value: data.returned, color: '#f43f5e' },
    { name: 'En proceso', value: data.inProgress, color: '#cbd5e1' },
  ];
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="name" innerRadius={62} outerRadius={90} paddingAngle={3} stroke="none">
            {rows.map((r) => (
              <Cell key={r.name} fill={r.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 top-[88px] flex flex-col items-center">
        <span className="text-2xl font-bold text-slate-900 tabular">{formatPercent(data.rate)}</span>
        <span className="text-[11px] text-slate-500">éxito</span>
      </div>
    </div>
  );
}

export function SalesChart({ data }: { data: DashboardStatistics['salesByWeek'] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -10, bottom: 0 }} barGap={2}>
        <CartesianGrid {...grid} />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
        <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompactCurrency(v)} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(Number(v))} cursor={{ fill: '#f1f5f9' }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="sold" name="Vendido" fill="#94a3b8" radius={[4, 4, 0, 0]} />
        <Bar dataKey="delivered" name="Entregado" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
        <Bar dataKey="settled" name="Liquidado" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CarrierChart({ data }: { data: DashboardStatistics['carrierPerformance'] }) {
  const rows = data.map((d) => ({ name: d.carrier.name, Entregados: d.delivered, Devueltos: d.returned, 'En tránsito': d.inTransit, color: d.carrier.color }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={rows} margin={{ top: 10, right: 8, left: -20, bottom: 0 }} barGap={2}>
        <CartesianGrid {...grid} />
        <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} />
        <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9' }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Entregados" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="En tránsito" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Devueltos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
