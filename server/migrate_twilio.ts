/**
 * One-time migration script: Adds Twilio columns to user_settings and campaigns tables.
 * Run with: npx tsx migrate_twilio.ts
 */
import { createClient } from '@insforge/sdk';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const client = createClient({
  baseUrl: process.env.INSFORGE_URL!,
  anonKey: process.env.INSFORGE_ANON_KEY!,
});

const migrations = [
  // user_settings — Twilio credentials
  `ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS twilio_account_sid TEXT`,
  `ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS twilio_auth_token TEXT`,
  `ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS twilio_api_key TEXT`,
  `ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS twilio_api_secret TEXT`,
  `ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS twilio_twiml_app_sid TEXT`,
  `ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS twilio_caller_number TEXT`,
  `ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS default_provider TEXT DEFAULT 'telnyx'`,

  // campaigns — provider selection
  `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'telnyx'`,
  `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS caller_number TEXT`,
];

async function run() {
  console.log('🔄 Running Twilio migration...\n');

  for (const sql of migrations) {
    try {
      const { data, error } = await client.db.rpc('raw_sql', { query: sql });
      if (error) {
        console.log(`❌ FAILED: ${sql.substring(0, 60)}...`);
        console.log(`   Error: ${error.message}\n`);
      } else {
        console.log(`✅ ${sql.substring(0, 70)}...`);
      }
    } catch (err: any) {
      console.log(`❌ FAILED: ${sql.substring(0, 60)}...`);
      console.log(`   Error: ${err.message}\n`);
    }
  }

  console.log('\n✅ Migration complete!');
}

run().catch(console.error);
