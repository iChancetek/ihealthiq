#!/usr/bin/env node

/**
 * iSynera AI Healthcare Platform Database Migration Script
 * 
 * This script ensures the database schema is properly set up with all tables
 * and indexes for the healthcare platform.
 * 
 * Usage: node database-migration.js
 */

const { Pool } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DATABASE_URL_ENV_VAR
});

async function runMigration() {
  console.log('🏥 Starting iSynera Healthcare Platform Database Migration...');
  
  try {
    // Check database connection
    const client = await pool.connect();
    console.log('✅ Database connection established');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'database-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📄 Executing database schema...');
    
    // Execute the schema
    await client.query(schemaSql);
    
    console.log('✅ Database schema executed successfully');
    
    // Verify tables were created
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('📋 Created tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // Check if admin user exists
    const adminResult = await client.query(
      'SELECT username, email, role FROM users WHERE username = $1',
      ['admin']
    );
    
    if (adminResult.rows.length > 0) {
      console.log('👤 Admin user found:', adminResult.rows[0]);
    } else {
      console.log('⚠️  Admin user not found - please ensure admin user is created');
    }
    
    client.release();
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('📍 Error details:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };