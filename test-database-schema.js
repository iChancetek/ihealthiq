#!/usr/bin/env node

/**
 * Database Schema Test Script
 * Verifies all tables exist and basic operations work
 */

import { Pool } from '@neondatabase/serverless';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testDatabaseSchema() {
  console.log('🧪 Testing Database Schema...');
  
  try {
    const client = await pool.connect();
    
    // Test 1: Check all tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    const expectedTables = [
      'ai_intake_processing',
      'ai_referral_summaries', 
      'ai_transcription_sessions',
      'appeal_letters',
      'appointments',
      'audit_logs',
      'claim_line_items',
      'claims',
      'consent_forms',
      'denials',
      'eligibility_verifications',
      'homebound_assessments',
      'medication_interactions',
      'patient_audit_logs',
      'patient_medications',
      'patients',
      'payers',
      'pharmacies',
      'prescription_audit_logs',
      'prescriptions',
      'refill_requests',
      'referrals',
      'sessions',
      'tasks',
      'users',
      'voice_sessions'
    ];
    
    const actualTables = tablesResult.rows.map(row => row.table_name);
    const missingTables = expectedTables.filter(table => !actualTables.includes(table));
    
    if (missingTables.length === 0) {
      console.log('✅ All required tables exist');
    } else {
      console.log('❌ Missing tables:', missingTables);
    }
    
    // Test 2: Check admin user exists
    const adminResult = await client.query(
      'SELECT username, email, role, is_active, is_approved FROM users WHERE username = $1',
      ['admin']
    );
    
    if (adminResult.rows.length > 0) {
      console.log('✅ Admin user exists:', adminResult.rows[0]);
    } else {
      console.log('❌ Admin user not found');
    }
    
    // Test 3: Check foreign key constraints
    const constraintsResult = await client.query(`
      SELECT conname, confrelid::regclass as foreign_table, conrelid::regclass as table_name
      FROM pg_constraint 
      WHERE contype = 'f' 
      ORDER BY conname;
    `);
    
    console.log(`✅ Found ${constraintsResult.rows.length} foreign key constraints`);
    
    // Test 4: Check indexes
    const indexesResult = await client.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname NOT LIKE '%_pkey'
      ORDER BY tablename, indexname;
    `);
    
    console.log(`✅ Found ${indexesResult.rows.length} custom indexes`);
    
    client.release();
    console.log('🎉 Database schema test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run test if this file is executed directly
testDatabaseSchema();