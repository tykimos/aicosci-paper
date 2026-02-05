/**
 * Admin User Creation Script
 * Usage: npx tsx scripts/create-admin.ts <email> <password> <name>
 * Example: npx tsx scripts/create-admin.ts admin@example.com password123 "Admin User"
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdmin() {
  const [, , email, password, name] = process.argv;

  if (!email || !password) {
    console.log('Usage: npx tsx scripts/create-admin.ts <email> <password> [name]');
    console.log('Example: npx tsx scripts/create-admin.ts admin@example.com mypassword "Admin User"');
    process.exit(1);
  }

  try {
    // Check if admin already exists
    const { data: existing } = await supabase
      .from('admins')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      console.log(`Admin with email ${email} already exists.`);
      process.exit(0);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin
    const { data, error } = await supabase
      .from('admins')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name: name || 'Admin',
        role: 'admin',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating admin:', error.message);
      process.exit(1);
    }

    console.log('Admin created successfully!');
    console.log('Email:', data.email);
    console.log('Name:', data.name);
    console.log('Role:', data.role);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

createAdmin();
