-- Add driver and conductor fields to vehicle table
alter table vehicle 
add column if not exists driver_name text,
add column if not exists conductor_name text;

comment on column vehicle.driver_name is 'Name of the driver assigned to this vehicle';
comment on column vehicle.conductor_name is 'Name of the conductor assigned to this vehicle';

