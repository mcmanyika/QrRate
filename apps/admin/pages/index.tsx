import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1>RateMyRide Admin</h1>
      <ul>
        <li><Link href="/vehicles">Vehicles</Link></li>
        <li><Link href="/routes">Routes</Link></li>
        <li><Link href="/stats">Stats</Link></li>
      </ul>
    </main>
  );
}


