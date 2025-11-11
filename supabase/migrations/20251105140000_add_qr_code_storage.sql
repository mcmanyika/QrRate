-- Add qr_code_svg column to vehicle table to store generated QR codes
alter table vehicle add column if not exists qr_code_svg text;

comment on column vehicle.qr_code_svg is 'SVG string of the QR code for this vehicle. Generated automatically on vehicle creation.';

