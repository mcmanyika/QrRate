import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseAdmin } from '../lib/supabaseAdmin';

type VehicleRow = { id: string; reg_number: string; route_id: string | null };
type RouteRow = { id: string; name: string };

export default function VehiclesPage() {
  const [rows, setRows] = useState<VehicleRow[]>([]);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [reg, setReg] = useState('');
  const [routeId, setRouteId] = useState<string>('');

  const load = async () => {
    const [v, r] = await Promise.all([
      supabaseAdmin.from('vehicle').select('id,reg_number,route_id').order('reg_number'),
      supabaseAdmin.from('route').select('id,name').order('name')
    ]);
    setRows(v.data || []);
    setRoutes(r.data || []);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!reg) return;
    
    // First create the vehicle
    const { data, error } = await supabaseAdmin
      .from('vehicle')
      .insert({ reg_number: reg, route_id: routeId || null })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating vehicle:', error);
      return;
    }
    
    // Generate QR code and save it via API route
    if (data?.id) {
      try {
        const response = await fetch('/api/generate-qr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vehicleId: data.id })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error generating QR code:', response.status, errorData);
          // The QR page will generate it on-demand if API fails
        } else {
          console.log('QR code generated and saved successfully');
        }
      } catch (qrError) {
        console.error('Error calling QR generation API:', qrError);
        // Continue even if QR generation fails - QR page will generate it on-demand
      }
    }
    
    setReg(''); setRouteId('');
    await load();
    
    // Automatically open QR code page for the new vehicle
    // The QR page will generate and save the QR code if it doesn't exist
    if (data?.id) {
      window.open(`/qr/${data.id}`, '_blank');
    }
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>Vehicles</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input placeholder="Reg number" value={reg} onChange={e => setReg(e.target.value)} />
        <select value={routeId} onChange={e => setRouteId(e.target.value)}>
          <option value="">No route</option>
          {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <button onClick={add}>Add</button>
      </div>
      <table>
        <thead><tr><th>Reg</th><th>Route</th><th>QR</th></tr></thead>
        <tbody>
          {rows.map(v => (
            <tr key={v.id}>
              <td>{v.reg_number}</td>
              <td>{routes.find(r => r.id === v.route_id)?.name || '-'}</td>
              <td><Link href={`/qr/${v.id}`}>QR</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}


