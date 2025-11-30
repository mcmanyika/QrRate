-- Create countries table for storing all country codes and information
-- This allows dynamic country management without code changes

CREATE TABLE IF NOT EXISTS country (
  code TEXT PRIMARY KEY, -- ISO 3166-1 alpha-2 code (e.g., 'KE', 'US')
  name TEXT NOT NULL,
  flag TEXT NOT NULL, -- Flag emoji
  region TEXT, -- Optional: for grouping (e.g., 'Africa', 'Asia')
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 999, -- For custom ordering (lower numbers first)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_country_is_active ON country(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_country_sort_order ON country(sort_order);

-- Enable RLS
ALTER TABLE country ENABLE ROW LEVEL SECURITY;

-- Allow public read access to countries (everyone can see country list)
-- Check if policy exists before creating it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'country' 
    AND policyname = 'country_read_public'
  ) THEN
    CREATE POLICY country_read_public ON country
      FOR SELECT USING (is_active = true);
  END IF;
END $$;

-- Insert all countries
INSERT INTO country (code, name, flag, region, sort_order) VALUES
  -- Africa - East Africa (prioritized)
  ('KE', 'Kenya', '🇰🇪', 'Africa', 1),
  ('TZ', 'Tanzania', '🇹🇿', 'Africa', 2),
  ('UG', 'Uganda', '🇺🇬', 'Africa', 3),
  ('RW', 'Rwanda', '🇷🇼', 'Africa', 4),
  ('ET', 'Ethiopia', '🇪🇹', 'Africa', 5),
  ('SS', 'South Sudan', '🇸🇸', 'Africa', 6),
  ('BI', 'Burundi', '🇧🇮', 'Africa', 7),
  
  -- Africa - Other
  ('DZ', 'Algeria', '🇩🇿', 'Africa', 100),
  ('AO', 'Angola', '🇦🇴', 'Africa', 101),
  ('BJ', 'Benin', '🇧🇯', 'Africa', 102),
  ('BW', 'Botswana', '🇧🇼', 'Africa', 103),
  ('BF', 'Burkina Faso', '🇧🇫', 'Africa', 104),
  ('CM', 'Cameroon', '🇨🇲', 'Africa', 105),
  ('CV', 'Cape Verde', '🇨🇻', 'Africa', 106),
  ('CF', 'Central African Republic', '🇨🇫', 'Africa', 107),
  ('TD', 'Chad', '🇹🇩', 'Africa', 108),
  ('KM', 'Comoros', '🇰🇲', 'Africa', 109),
  ('CG', 'Congo', '🇨🇬', 'Africa', 110),
  ('CD', 'DR Congo', '🇨🇩', 'Africa', 111),
  ('CI', 'Ivory Coast', '🇨🇮', 'Africa', 112),
  ('DJ', 'Djibouti', '🇩🇯', 'Africa', 113),
  ('EG', 'Egypt', '🇪🇬', 'Africa', 114),
  ('GQ', 'Equatorial Guinea', '🇬🇶', 'Africa', 115),
  ('ER', 'Eritrea', '🇪🇷', 'Africa', 116),
  ('SZ', 'Eswatini', '🇸🇿', 'Africa', 117),
  ('GA', 'Gabon', '🇬🇦', 'Africa', 118),
  ('GM', 'Gambia', '🇬🇲', 'Africa', 119),
  ('GH', 'Ghana', '🇬🇭', 'Africa', 120),
  ('GN', 'Guinea', '🇬🇳', 'Africa', 121),
  ('GW', 'Guinea-Bissau', '🇬🇼', 'Africa', 122),
  ('LR', 'Liberia', '🇱🇷', 'Africa', 123),
  ('LY', 'Libya', '🇱🇾', 'Africa', 124),
  ('MG', 'Madagascar', '🇲🇬', 'Africa', 125),
  ('MW', 'Malawi', '🇲🇼', 'Africa', 126),
  ('ML', 'Mali', '🇲🇱', 'Africa', 127),
  ('MR', 'Mauritania', '🇲🇷', 'Africa', 128),
  ('MU', 'Mauritius', '🇲🇺', 'Africa', 129),
  ('MA', 'Morocco', '🇲🇦', 'Africa', 130),
  ('MZ', 'Mozambique', '🇲🇿', 'Africa', 131),
  ('NA', 'Namibia', '🇳🇦', 'Africa', 132),
  ('NE', 'Niger', '🇳🇪', 'Africa', 133),
  ('NG', 'Nigeria', '🇳🇬', 'Africa', 134),
  ('RE', 'Réunion', '🇷🇪', 'Africa', 135),
  ('ST', 'São Tomé and Príncipe', '🇸🇹', 'Africa', 136),
  ('SN', 'Senegal', '🇸🇳', 'Africa', 137),
  ('SC', 'Seychelles', '🇸🇨', 'Africa', 138),
  ('SL', 'Sierra Leone', '🇸🇱', 'Africa', 139),
  ('SO', 'Somalia', '🇸🇴', 'Africa', 140),
  ('ZA', 'South Africa', '🇿🇦', 'Africa', 141),
  ('SD', 'Sudan', '🇸🇩', 'Africa', 142),
  ('TG', 'Togo', '🇹🇬', 'Africa', 143),
  ('TN', 'Tunisia', '🇹🇳', 'Africa', 144),
  ('ZM', 'Zambia', '🇿🇲', 'Africa', 145),
  ('ZW', 'Zimbabwe', '🇿🇼', 'Africa', 146),
  
  -- Asia
  ('AF', 'Afghanistan', '🇦🇫', 'Asia', 200),
  ('AM', 'Armenia', '🇦🇲', 'Asia', 201),
  ('AZ', 'Azerbaijan', '🇦🇿', 'Asia', 202),
  ('BH', 'Bahrain', '🇧🇭', 'Asia', 203),
  ('BD', 'Bangladesh', '🇧🇩', 'Asia', 204),
  ('BT', 'Bhutan', '🇧🇹', 'Asia', 205),
  ('BN', 'Brunei', '🇧🇳', 'Asia', 206),
  ('KH', 'Cambodia', '🇰🇭', 'Asia', 207),
  ('CN', 'China', '🇨🇳', 'Asia', 208),
  ('GE', 'Georgia', '🇬🇪', 'Asia', 209),
  ('HK', 'Hong Kong', '🇭🇰', 'Asia', 210),
  ('IN', 'India', '🇮🇳', 'Asia', 211),
  ('ID', 'Indonesia', '🇮🇩', 'Asia', 212),
  ('IR', 'Iran', '🇮🇷', 'Asia', 213),
  ('IQ', 'Iraq', '🇮🇶', 'Asia', 214),
  ('IL', 'Israel', '🇮🇱', 'Asia', 215),
  ('JP', 'Japan', '🇯🇵', 'Asia', 216),
  ('JO', 'Jordan', '🇯🇴', 'Asia', 217),
  ('KZ', 'Kazakhstan', '🇰🇿', 'Asia', 218),
  ('KW', 'Kuwait', '🇰🇼', 'Asia', 219),
  ('KG', 'Kyrgyzstan', '🇰🇬', 'Asia', 220),
  ('LA', 'Laos', '🇱🇦', 'Asia', 221),
  ('LB', 'Lebanon', '🇱🇧', 'Asia', 222),
  ('MO', 'Macao', '🇲🇴', 'Asia', 223),
  ('MY', 'Malaysia', '🇲🇾', 'Asia', 224),
  ('MV', 'Maldives', '🇲🇻', 'Asia', 225),
  ('MN', 'Mongolia', '🇲🇳', 'Asia', 226),
  ('MM', 'Myanmar', '🇲🇲', 'Asia', 227),
  ('NP', 'Nepal', '🇳🇵', 'Asia', 228),
  ('KP', 'North Korea', '🇰🇵', 'Asia', 229),
  ('OM', 'Oman', '🇴🇲', 'Asia', 230),
  ('PK', 'Pakistan', '🇵🇰', 'Asia', 231),
  ('PS', 'Palestine', '🇵🇸', 'Asia', 232),
  ('PH', 'Philippines', '🇵🇭', 'Asia', 233),
  ('QA', 'Qatar', '🇶🇦', 'Asia', 234),
  ('SA', 'Saudi Arabia', '🇸🇦', 'Asia', 235),
  ('SG', 'Singapore', '🇸🇬', 'Asia', 236),
  ('KR', 'South Korea', '🇰🇷', 'Asia', 237),
  ('LK', 'Sri Lanka', '🇱🇰', 'Asia', 238),
  ('SY', 'Syria', '🇸🇾', 'Asia', 239),
  ('TW', 'Taiwan', '🇹🇼', 'Asia', 240),
  ('TJ', 'Tajikistan', '🇹🇯', 'Asia', 241),
  ('TH', 'Thailand', '🇹🇭', 'Asia', 242),
  ('TL', 'Timor-Leste', '🇹🇱', 'Asia', 243),
  ('TR', 'Turkey', '🇹🇷', 'Asia', 244),
  ('TM', 'Turkmenistan', '🇹🇲', 'Asia', 245),
  ('AE', 'UAE', '🇦🇪', 'Asia', 246),
  ('UZ', 'Uzbekistan', '🇺🇿', 'Asia', 247),
  ('VN', 'Vietnam', '🇻🇳', 'Asia', 248),
  ('YE', 'Yemen', '🇾🇪', 'Asia', 249),
  
  -- Europe
  ('AL', 'Albania', '🇦🇱', 'Europe', 300),
  ('AD', 'Andorra', '🇦🇩', 'Europe', 301),
  ('AT', 'Austria', '🇦🇹', 'Europe', 302),
  ('BY', 'Belarus', '🇧🇾', 'Europe', 303),
  ('BE', 'Belgium', '🇧🇪', 'Europe', 304),
  ('BA', 'Bosnia and Herzegovina', '🇧🇦', 'Europe', 305),
  ('BG', 'Bulgaria', '🇧🇬', 'Europe', 306),
  ('HR', 'Croatia', '🇭🇷', 'Europe', 307),
  ('CY', 'Cyprus', '🇨🇾', 'Europe', 308),
  ('CZ', 'Czech Republic', '🇨🇿', 'Europe', 309),
  ('DK', 'Denmark', '🇩🇰', 'Europe', 310),
  ('EE', 'Estonia', '🇪🇪', 'Europe', 311),
  ('FI', 'Finland', '🇫🇮', 'Europe', 312),
  ('FR', 'France', '🇫🇷', 'Europe', 313),
  ('DE', 'Germany', '🇩🇪', 'Europe', 314),
  ('GR', 'Greece', '🇬🇷', 'Europe', 315),
  ('HU', 'Hungary', '🇭🇺', 'Europe', 316),
  ('IS', 'Iceland', '🇮🇸', 'Europe', 317),
  ('IE', 'Ireland', '🇮🇪', 'Europe', 318),
  ('IT', 'Italy', '🇮🇹', 'Europe', 319),
  ('LV', 'Latvia', '🇱🇻', 'Europe', 320),
  ('LI', 'Liechtenstein', '🇱🇮', 'Europe', 321),
  ('LT', 'Lithuania', '🇱🇹', 'Europe', 322),
  ('LU', 'Luxembourg', '🇱🇺', 'Europe', 323),
  ('MT', 'Malta', '🇲🇹', 'Europe', 324),
  ('MD', 'Moldova', '🇲🇩', 'Europe', 325),
  ('MC', 'Monaco', '🇲🇨', 'Europe', 326),
  ('ME', 'Montenegro', '🇲🇪', 'Europe', 327),
  ('NL', 'Netherlands', '🇳🇱', 'Europe', 328),
  ('MK', 'North Macedonia', '🇲🇰', 'Europe', 329),
  ('NO', 'Norway', '🇳🇴', 'Europe', 330),
  ('PL', 'Poland', '🇵🇱', 'Europe', 331),
  ('PT', 'Portugal', '🇵🇹', 'Europe', 332),
  ('RO', 'Romania', '🇷🇴', 'Europe', 333),
  ('RU', 'Russia', '🇷🇺', 'Europe', 334),
  ('SM', 'San Marino', '🇸🇲', 'Europe', 335),
  ('RS', 'Serbia', '🇷🇸', 'Europe', 336),
  ('SK', 'Slovakia', '🇸🇰', 'Europe', 337),
  ('SI', 'Slovenia', '🇸🇮', 'Europe', 338),
  ('ES', 'Spain', '🇪🇸', 'Europe', 339),
  ('SE', 'Sweden', '🇸🇪', 'Europe', 340),
  ('CH', 'Switzerland', '🇨🇭', 'Europe', 341),
  ('UA', 'Ukraine', '🇺🇦', 'Europe', 342),
  ('GB', 'United Kingdom', '🇬🇧', 'Europe', 343),
  ('VA', 'Vatican City', '🇻🇦', 'Europe', 344),
  
  -- Americas
  ('AG', 'Antigua and Barbuda', '🇦🇬', 'Americas', 400),
  ('AR', 'Argentina', '🇦🇷', 'Americas', 401),
  ('BS', 'Bahamas', '🇧🇸', 'Americas', 402),
  ('BB', 'Barbados', '🇧🇧', 'Americas', 403),
  ('BZ', 'Belize', '🇧🇿', 'Americas', 404),
  ('BO', 'Bolivia', '🇧🇴', 'Americas', 405),
  ('BR', 'Brazil', '🇧🇷', 'Americas', 406),
  ('CA', 'Canada', '🇨🇦', 'Americas', 407),
  ('CL', 'Chile', '🇨🇱', 'Americas', 408),
  ('CO', 'Colombia', '🇨🇴', 'Americas', 409),
  ('CR', 'Costa Rica', '🇨🇷', 'Americas', 410),
  ('CU', 'Cuba', '🇨🇺', 'Americas', 411),
  ('DM', 'Dominica', '🇩🇲', 'Americas', 412),
  ('DO', 'Dominican Republic', '🇩🇴', 'Americas', 413),
  ('EC', 'Ecuador', '🇪🇨', 'Americas', 414),
  ('SV', 'El Salvador', '🇸🇻', 'Americas', 415),
  ('GD', 'Grenada', '🇬🇩', 'Americas', 416),
  ('GT', 'Guatemala', '🇬🇹', 'Americas', 417),
  ('GY', 'Guyana', '🇬🇾', 'Americas', 418),
  ('HT', 'Haiti', '🇭🇹', 'Americas', 419),
  ('HN', 'Honduras', '🇭🇳', 'Americas', 420),
  ('JM', 'Jamaica', '🇯🇲', 'Americas', 421),
  ('MX', 'Mexico', '🇲🇽', 'Americas', 422),
  ('NI', 'Nicaragua', '🇳🇮', 'Americas', 423),
  ('PA', 'Panama', '🇵🇦', 'Americas', 424),
  ('PY', 'Paraguay', '🇵🇾', 'Americas', 425),
  ('PE', 'Peru', '🇵🇪', 'Americas', 426),
  ('KN', 'Saint Kitts and Nevis', '🇰🇳', 'Americas', 427),
  ('LC', 'Saint Lucia', '🇱🇨', 'Americas', 428),
  ('VC', 'Saint Vincent and the Grenadines', '🇻🇨', 'Americas', 429),
  ('SR', 'Suriname', '🇸🇷', 'Americas', 430),
  ('TT', 'Trinidad and Tobago', '🇹🇹', 'Americas', 431),
  ('US', 'United States', '🇺🇸', 'Americas', 432),
  ('UY', 'Uruguay', '🇺🇾', 'Americas', 433),
  ('VE', 'Venezuela', '🇻🇪', 'Americas', 434),
  
  -- Oceania
  ('AS', 'American Samoa', '🇦🇸', 'Oceania', 500),
  ('AU', 'Australia', '🇦🇺', 'Oceania', 501),
  ('FJ', 'Fiji', '🇫🇯', 'Oceania', 502),
  ('PF', 'French Polynesia', '🇵🇫', 'Oceania', 503),
  ('GU', 'Guam', '🇬🇺', 'Oceania', 504),
  ('KI', 'Kiribati', '🇰🇮', 'Oceania', 505),
  ('MH', 'Marshall Islands', '🇲🇭', 'Oceania', 506),
  ('FM', 'Micronesia', '🇫🇲', 'Oceania', 507),
  ('NR', 'Nauru', '🇳🇷', 'Oceania', 508),
  ('NC', 'New Caledonia', '🇳🇨', 'Oceania', 509),
  ('NZ', 'New Zealand', '🇳🇿', 'Oceania', 510),
  ('PW', 'Palau', '🇵🇼', 'Oceania', 511),
  ('PG', 'Papua New Guinea', '🇵🇬', 'Oceania', 512),
  ('WS', 'Samoa', '🇼🇸', 'Oceania', 513),
  ('SB', 'Solomon Islands', '🇸🇧', 'Oceania', 514),
  ('TO', 'Tonga', '🇹🇴', 'Oceania', 515),
  ('TV', 'Tuvalu', '🇹🇻', 'Oceania', 516),
  ('VU', 'Vanuatu', '🇻🇺', 'Oceania', 517)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  flag = EXCLUDED.flag,
  region = EXCLUDED.region,
  sort_order = EXCLUDED.sort_order;

-- Add comment
COMMENT ON TABLE country IS 'Stores all countries with ISO 3166-1 alpha-2 codes for vehicle registration plate support';

