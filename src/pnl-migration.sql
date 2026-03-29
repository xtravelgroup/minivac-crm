-- P&L Categories (line items catalog)
CREATE TABLE IF NOT EXISTS pnl_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  section text NOT NULL CHECK (section IN ('revenue', 'cost_of_sales', 'opex')),
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

-- P&L Monthly Entries
CREATE TABLE IF NOT EXISTS pnl_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES pnl_categories(id) ON DELETE CASCADE,
  period text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, period)
);

-- RLS
ALTER TABLE pnl_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnl_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pnl_categories_all" ON pnl_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "pnl_entries_all" ON pnl_entries FOR ALL USING (true) WITH CHECK (true);

-- Seed categories
INSERT INTO pnl_categories (code, name, section, sort_order) VALUES
  -- Revenue
  ('rev_reservation_fees', 'Reservation Fees', 'revenue', 1),
  ('rev_package_sales', 'Package Sales', 'revenue', 2),
  ('rev_club_commissions', 'Club Commissions', 'revenue', 3),
  ('rev_other', 'Other Revenue', 'revenue', 4),
  -- Cost of Sales
  ('cos_hotel', 'Hotel Cost', 'cost_of_sales', 10),
  ('cos_package', 'Package Costs', 'cost_of_sales', 11),
  ('cos_processing', 'Payment Processing Fees', 'cost_of_sales', 12),
  ('cos_chargebacks', 'Chargebacks & Refunds', 'cost_of_sales', 13),
  -- Operating Expenses
  ('opex_payroll', 'Payroll & Benefits', 'opex', 20),
  ('opex_commissions', 'Sales Commissions', 'opex', 21),
  ('opex_radio', 'Radio Advertising', 'opex', 22),
  ('opex_digital', 'Digital Marketing', 'opex', 23),
  ('opex_telephony', 'Telephony', 'opex', 24),
  ('opex_office', 'Office & Rent', 'opex', 25),
  ('opex_tech', 'Technology & Software', 'opex', 26),
  ('opex_professional', 'Professional Services', 'opex', 27),
  ('opex_other', 'Other OpEx', 'opex', 28)
ON CONFLICT (code) DO NOTHING;
