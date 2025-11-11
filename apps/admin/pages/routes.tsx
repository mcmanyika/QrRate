import { useEffect, useState } from 'react';
import { supabaseAdmin } from '../lib/supabaseAdmin';

type RouteRow = { id: string; name: string; code: string };

export default function RoutesPage() {
  const [rows, setRows] = useState<RouteRow[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const load = async () => {
    const { data } = await supabaseAdmin.from('route').select('id,name,code').order('name');
    setRows(data || []);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name || !code) return;
    await supabaseAdmin.from('route').insert({ name, code });
    setName(''); setCode('');
    await load();
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>Routes</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
        <input placeholder="Code" value={code} onChange={e => setCode(e.target.value)} />
        <button onClick={add}>Add</button>
      </div>
      <table>
        <thead><tr><th>Name</th><th>Code</th></tr></thead>
        <tbody>
          {rows.map(r => <tr key={r.id}><td>{r.name}</td><td>{r.code}</td></tr>)}
        </tbody>
      </table>
    </main>
  );
}


