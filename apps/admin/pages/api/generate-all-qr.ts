import { NextApiRequest, NextApiResponse } from 'next';
import QRCode from 'qrcode';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

// This endpoint can be called to generate QR codes for all vehicles that don't have one
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get all vehicles without QR codes
        const { data: vehicles, error: fetchError } = await supabaseAdmin
            .from('vehicle')
            .select('id')
            .is('qr_code_svg', null);

        if (fetchError) {
            return res.status(500).json({ error: 'Failed to fetch vehicles', details: fetchError.message });
        }

        if (!vehicles || vehicles.length === 0) {
            return res.status(200).json({ message: 'All vehicles already have QR codes', count: 0 });
        }

        let successCount = 0;
        let errorCount = 0;

        // Generate QR codes for each vehicle
        for (const vehicle of vehicles) {
            try {
                const payload = `kombirate://v/${vehicle.id}`;
                const qrSvg = await QRCode.toString(payload, { type: 'svg', margin: 2, width: 256 });

                const { error: updateError } = await supabaseAdmin
                    .from('vehicle')
                    .update({ qr_code_svg: qrSvg })
                    .eq('id', vehicle.id);

                if (updateError) {
                    console.error(`Error saving QR code for vehicle ${vehicle.id}:`, updateError);
                    errorCount++;
                } else {
                    successCount++;
                }
            } catch (error) {
                console.error(`Error generating QR code for vehicle ${vehicle.id}:`, error);
                errorCount++;
            }
        }

        return res.status(200).json({
            message: 'QR code generation completed',
            total: vehicles.length,
            success: successCount,
            errors: errorCount
        });
    } catch (error) {
        console.error('Error in generate-all-qr:', error);
        return res.status(500).json({
            error: 'Failed to generate QR codes',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

