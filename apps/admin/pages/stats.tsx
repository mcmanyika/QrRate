import { useEffect, useState } from 'react';
import { supabaseAdmin } from '../lib/supabaseAdmin';

type Row = { vehicle_id: string; reg_number: string; route_name: string | null; avg_stars: number; num_ratings: number };

export default function StatsPage() {
  const [rows, setRows] = useState<Row[]>([]);

  const load = async () => {
    const { data } = await supabaseAdmin.from('vehicle_avg_last_7d').select('*');
    setRows((data as any) || []);
  };

  useEffect(() => { load(); }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Last 7 days</h1>
      <table>
        <thead><tr><th>Reg</th><th>Route</th><th>Avg</th><th>Ratings</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.vehicle_id}>
              <td>{r.reg_number}</td>
              <td>{r.route_name || '-'}</td>
              <td>{Number(r.avg_stars).toFixed(2)}</td>
              <td>{r.num_ratings}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}


