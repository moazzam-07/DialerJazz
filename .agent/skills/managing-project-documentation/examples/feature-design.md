# 2026-04-10 Surplus Ledger Design

## The Problem
When vendors fulfill Zakat Kits, the loose ingredients in our inventory often don't divide perfectly into complete kits (e.g. 5kg extra rice remains). We need to track this fractional inventory separately from normal monetary donations.

## Proposed Resolution
We will create a `surplus_ledger` table.

### Schema Updates
```sql
CREATE TABLE zakat_surplus_ledger (
    id UUID PRIMARY KEY,
    batch_id UUID REFERENCES zakat_vendor_batches(id),
    product_name TEXT NOT NULL,
    quantity_kg NUMERIC NOT NULL,
    transaction_type TEXT NOT NULL, -- 'IN' or 'OUT'
    created_at TIMESTAMP WITH TIME ZONE
);
```

### Server Action Pipeline
In `actions.ts`:
1. When locking the batch, verify the kit composition against incoming raw materials.
2. Generate an aggregate difference table.
3. Apply standard TDD workflow to ensure precision mathematics (no floating point drift).
