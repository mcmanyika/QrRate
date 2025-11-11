import { NextApiRequest, NextApiResponse } from 'next';
import QRCode from 'qrcode';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { vehicleId } = req.body;
    if (!vehicleId) {
        return res.status(400).json({ error: 'vehicleId is required' });
    }

    try {
        const payload = `kombirate://v/${vehicleId}`;
        const qrSvg = await QRCode.toString(payload, { type: 'svg', margin: 2, width: 256 });

        // Save the QR code to the database
        const { error: updateError } = await supabaseAdmin
            .from('vehicle')
            .update({ qr_code_svg: qrSvg })
            .eq('id', vehicleId);

        if (updateError) {
            console.error('Error saving QR code to database:', updateError);
            return res.status(500).json({ error: 'Failed to save QR code', details: updateError.message });
        }

        return res.status(200).json({ qrSvg, success: true });
    } catch (error) {
        console.error('Error generating QR code:', error);
        return res.status(500).json({ error: 'Failed to generate QR code', details: error instanceof Error ? error.message : 'Unknown error' });
    }
}

