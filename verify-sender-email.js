#!/usr/bin/env node

/**
 * SendGrid Sender Verification Script
 * Automates the process of verifying sender email for iSynera Healthcare Platform
 */

import https from 'https';

// SendGrid API configuration
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDER_EMAIL = 'noreply@isynera.healthcare';
const SENDER_NAME = 'iSynera AI Healthcare Platform';

if (!SENDGRID_API_KEY) {
  console.error('❌ SENDGRID_API_KEY environment variable is required');
  process.exit(1);
}

console.log('🚀 Starting SendGrid sender verification process...');
console.log(`📧 Email to verify: ${SENDER_EMAIL}`);
console.log(`👤 Sender name: ${SENDER_NAME}`);

/**
 * Make authenticated request to SendGrid API
 */
function sendGridRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.sendgrid.com',
      port: 443,
      path: `/v3${path}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonResponse = responseData ? JSON.parse(responseData) : {};
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              statusCode: res.statusCode,
              data: jsonResponse
            });
          } else {
            reject({
              statusCode: res.statusCode,
              error: jsonResponse,
              message: `HTTP ${res.statusCode}: ${responseData}`
            });
          }
        } catch (parseError) {
          reject({
            statusCode: res.statusCode,
            error: parseError,
            message: `Failed to parse response: ${responseData}`
          });
        }
      });
    });

    req.on('error', (error) => {
      reject({
        error: error,
        message: `Request failed: ${error.message}`
      });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Check if sender is already verified
 */
async function checkExistingSenders() {
  try {
    console.log('\n🔍 Checking existing verified senders...');
    const response = await sendGridRequest('GET', '/verified_senders');
    
    const existingSender = response.data.results?.find(
      sender => sender.from_email === SENDER_EMAIL
    );
    
    if (existingSender) {
      console.log(`✅ Sender ${SENDER_EMAIL} is already verified!`);
      console.log(`📊 Verification status: ${existingSender.verified ? 'VERIFIED' : 'PENDING'}`);
      console.log(`🆔 Sender ID: ${existingSender.id}`);
      return existingSender;
    }
    
    console.log(`ℹ️  Sender ${SENDER_EMAIL} not found in verified senders list`);
    return null;
    
  } catch (error) {
    console.log('⚠️  Could not check existing senders:', error.message);
    return null;
  }
}

/**
 * Create new sender verification request
 */
async function createSenderVerification() {
  try {
    console.log('\n📤 Creating sender verification request...');
    
    const senderData = {
      nickname: 'iSynera Healthcare Platform',
      from_email: SENDER_EMAIL,
      from_name: SENDER_NAME,
      reply_to: SENDER_EMAIL,
      reply_to_name: SENDER_NAME,
      address: '123 Healthcare Drive',
      address_2: 'Suite 100',
      city: 'Medical City',
      state: 'CA',
      zip: '90210',
      country: 'United States'
    };
    
    const response = await sendGridRequest('POST', '/verified_senders', senderData);
    
    console.log('✅ Sender verification request created successfully!');
    console.log(`🆔 Verification ID: ${response.data.id}`);
    console.log(`📧 Verification email sent to: ${SENDER_EMAIL}`);
    console.log(`📋 Status: ${response.data.verified ? 'VERIFIED' : 'PENDING VERIFICATION'}`);
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Failed to create sender verification:', error.message);
    
    if (error.statusCode === 400 && error.error?.errors) {
      console.log('\n📋 Validation errors:');
      error.error.errors.forEach(err => {
        console.log(`   - ${err.field}: ${err.message}`);
      });
    }
    
    throw error;
  }
}

/**
 * Resend verification email
 */
async function resendVerificationEmail(senderId) {
  try {
    console.log(`\n📬 Resending verification email for sender ID: ${senderId}...`);
    
    const response = await sendGridRequest('POST', `/verified_senders/${senderId}/resend`);
    
    console.log('✅ Verification email resent successfully!');
    return response.data;
    
  } catch (error) {
    console.log('⚠️  Could not resend verification email:', error.message);
    return null;
  }
}

/**
 * Main verification process
 */
async function main() {
  try {
    console.log('\n🔐 Authenticating with SendGrid API...');
    
    // Check existing senders first
    const existingSender = await checkExistingSenders();
    
    if (existingSender) {
      if (existingSender.verified) {
        console.log('\n🎉 SUCCESS: Sender email is already verified and ready to use!');
        console.log('\n📧 Email service should now work correctly.');
        return;
      } else {
        console.log('\n⏳ Sender exists but verification is pending.');
        await resendVerificationEmail(existingSender.id);
      }
    } else {
      // Create new sender verification
      const newSender = await createSenderVerification();
      
      if (newSender && !newSender.verified) {
        console.log('\n⏳ Verification email sent. Please check the email inbox.');
      }
    }
    
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Check the email inbox for verification email');
    console.log('2. Click the verification link in the email');
    console.log('3. Complete the verification process');
    console.log('4. Test the email functionality in iSynera platform');
    
    console.log('\n🔗 Manual verification URL: https://app.sendgrid.com/settings/sender_auth/senders');
    
  } catch (error) {
    console.error('\n❌ Verification process failed:', error.message);
    
    console.log('\n🛠️  MANUAL VERIFICATION STEPS:');
    console.log('1. Go to https://app.sendgrid.com/settings/sender_auth/senders');
    console.log('2. Click "Create New Sender"');
    console.log(`3. Use email: ${SENDER_EMAIL}`);
    console.log(`4. Use name: ${SENDER_NAME}`);
    console.log('5. Fill in required address information');
    console.log('6. Complete verification process');
    
    process.exit(1);
  }
}

// Run the verification process
main().catch(console.error);