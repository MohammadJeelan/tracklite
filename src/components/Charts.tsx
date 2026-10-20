import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { groupByCity, groupByCourier } from '../lib/stats';
import type { Shipment } from '../lib/types';

const tipStyle = {
  background: '#121a2b',
  border: '1px solid #243049',
  borderRadius: 10,
  color: '#e8eefc',
};

export function Charts({ shipments }: { shipments: Shipment[] }) {
  const byCourier = groupByCourier(shipments);
  const byCity = groupByCity(shipments);

  return (
    <div className="charts">
      <section className="card">
        <h2>By courier</h2>
        <p className="sub">Volume and late share across carriers</p>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byCourier} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#243049" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="courier" tick={{ fill: '#93a0b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#93a0b8', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tipStyle} cursor={{ fill: 'rgba(61,139,253,0.08)' }} />
              <Legend wrapperStyle={{ color: '#93a0b8', fontSize: 12 }} />
              <Bar dataKey="total" name="Total" fill="#3d8bfd" radius={[6, 6, 0, 0]} />
              <Bar dataKey="late" name="Late" fill="#f43f5e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="card">
        <h2>Late by destination city</h2>
        <p className="sub">Top cities by delayed shipments</p>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byCity} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid stroke="#243049" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#93a0b8', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="city" width={90} tick={{ fill: '#93a0b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tipStyle} cursor={{ fill: 'rgba(61,139,253,0.08)' }} />
              <Bar dataKey="late" name="Late" fill="#f59e0b" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
