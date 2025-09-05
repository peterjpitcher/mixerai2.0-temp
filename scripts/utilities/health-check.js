#!/usr/bin/env node

/**
 * Health check script for monitoring application status
 * Can be used by monitoring services or cron jobs
 */

const https = require('https');
const http = require('http');

const HEALTH_ENDPOINT = process.env.HEALTH_CHECK_URL || 'http://localhost:3000/api/health';
const TIMEOUT = parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 30000; // 30 seconds

function checkHealth() {
  const url = new URL(HEALTH_ENDPOINT);
  const protocol = url.protocol === 'https:' ? https : http;
  
  return new Promise((resolve, reject) => {
    const req = protocol.get(url, { timeout: TIMEOUT }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const healthData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            status: healthData.status,
            data: healthData,
          });
        } catch (error) {
          reject(new Error(`Failed to parse health check response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Health check request failed: ${error.message}`));
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Health check timed out after ${TIMEOUT}ms`));
    });
  });
}

async function main() {
  console.log(`Checking health at: ${HEALTH_ENDPOINT}`);
  console.log('=' .repeat(80));
  
  try {
    const result = await checkHealth();
    const { statusCode, status, data } = result;
    
    console.log(`Status Code: ${statusCode}`);
    console.log(`Health Status: ${status}`);
    console.log(`Version: ${data.version}`);
    console.log(`Uptime: ${data.uptime} seconds`);
    console.log('\nService Checks:');
    console.log('-'.repeat(80));
    
    Object.entries(data.checks).forEach(([service, check]) => {
      const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
      console.log(`${icon} ${service.padEnd(15)} ${check.status.padEnd(6)} ${check.message || ''}`);
      if (check.responseTime) {
        console.log(`   Response time: ${check.responseTime}ms`);
      }
    });
    
    // Exit with appropriate code
    if (statusCode === 200) {
      console.log('\n✅ Application is healthy');
      process.exit(0);
    } else {
      console.log('\n❌ Application is unhealthy');
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Health check failed: ${error.message}`);
    process.exit(2);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { checkHealth };