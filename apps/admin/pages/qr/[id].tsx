import { GetServerSideProps } from 'next';
import QRCode from 'qrcode';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const id = ctx.params?.id as string;
  const { data: v } = await supabaseAdmin
    .from('vehicle')
    .select('id,reg_number,qr_code_svg')
    .eq('id', id)
    .maybeSingle();
  if (!v) return { notFound: true };
  
  // Use stored QR code if available, otherwise generate it
  let svg = v.qr_code_svg;
  if (!svg) {
    const payload = `kombirate://v/${v.id}`;
    svg = await QRCode.toString(payload, { type: 'svg', margin: 2, width: 256 });
    // Save the generated QR code for future use
    await supabaseAdmin
      .from('vehicle')
      .update({ qr_code_svg: svg })
      .eq('id', v.id);
  }
  
  return { props: { svg, reg: v.reg_number } };
};

export default function QRPage({ svg, reg }: { svg: string; reg: string }) {
  return (
    <main style={{ padding: 24 }}>
      <h1>QR for {reg}</h1>
      <div dangerouslySetInnerHTML={{ __html: svg }} />
      <p>Scan opens in the app: kombirate://v/&lt;vehicleId&gt;</p>
      <button onClick={() => window.print()}>Print</button>
    </main>
  );
}


