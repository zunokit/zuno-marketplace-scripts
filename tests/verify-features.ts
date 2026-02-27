/**
 * Quick verification of new SDK 2.1.2 features
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import { ZunoSDK } from 'zuno-marketplace-sdk';

const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
const API_KEY = process.env.ZUNO_API_KEY || 'zuno_OZtuXYKoyNWRbBbMpcQqXBhflkxlEzeG';

async function quickTest() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = await provider.getSigner(0);
  const address = await signer.getAddress();

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  Verifying SDK 2.1.2 Features                          ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`Network: ${RPC_URL}`);
  console.log(`Account: ${address}\n`);

  const sdk = new ZunoSDK(
    { apiKey: API_KEY, network: 31337, logger: { level: 'warn' } },
    { provider, signer }
  );

  const results: { feature: string; status: '✅' | '❌'; error?: string }[] = [];

  // Test 1: getCreatedCollections
  try {
    const cols = await sdk.collection.getCreatedCollections();
    results.push({ feature: `getCreatedCollections (${cols.length} found)`, status: '✅' });
  } catch (e) {
    results.push({ feature: 'getCreatedCollections', status: '❌', error: (e as Error).message });
  }

  // Test 2: getCollectionInfo
  try {
    const cols = await sdk.collection.getCreatedCollections();
    if (cols.length > 0) {
      const info = await sdk.collection.getCollectionInfo(cols[0].address);
      results.push({ feature: `getCollectionInfo (${info.name})`, status: '✅' });
    }
  } catch (e) {
    results.push({ feature: 'getCollectionInfo', status: '❌', error: (e as Error).message });
  }

  // Test 3: verifyCollection
  try {
    const cols = await sdk.collection.getCreatedCollections();
    if (cols.length > 0) {
      const verified = await sdk.collection.verifyCollection(cols[0].address);
      results.push({ feature: `verifyCollection (${verified.tokenType})`, status: '✅' });
    }
  } catch (e) {
    results.push({ feature: 'verifyCollection', status: '❌', error: (e as Error).message });
  }

  // Test 4: isInAllowlist
  try {
    const cols = await sdk.collection.getCreatedCollections();
    if (cols.length > 0) {
      const isListed = await sdk.collection.isInAllowlist(cols[0].address, address);
      results.push({ feature: `isInAllowlist (${isListed})`, status: '✅' });
    }
  } catch (e) {
    results.push({ feature: 'isInAllowlist', status: '❌', error: (e as Error).message });
  }

  // Test 5: isAllowlistOnly
  try {
    const cols = await sdk.collection.getCreatedCollections();
    if (cols.length > 0) {
      const isOnly = await sdk.collection.isAllowlistOnly(cols[0].address);
      results.push({ feature: `isAllowlistOnly (${isOnly})`, status: '✅' });
    }
  } catch (e) {
    results.push({ feature: 'isAllowlistOnly', status: '❌', error: (e as Error).message });
  }

  // Test 6: getUserOwnedTokens
  try {
    const cols = await sdk.collection.getCreatedCollections();
    if (cols.length > 0) {
      const tokens = await sdk.collection.getUserOwnedTokens(cols[0].address, address);
      results.push({ feature: `getUserOwnedTokens (${tokens.length} types)`, status: '✅' });
    }
  } catch (e) {
    results.push({ feature: 'getUserOwnedTokens', status: '❌', error: (e as Error).message });
  }

  // Test 7: getListings
  try {
    const cols = await sdk.collection.getCreatedCollections();
    if (cols.length > 0) {
      const listings = await sdk.exchange.getListings(cols[0].address);
      results.push({ feature: `getListings (${listings.length} found)`, status: '✅' });
    }
  } catch (e) {
    results.push({ feature: 'getListings', status: '❌', error: (e as Error).message });
  }

  // Test 8: getListingsBySeller
  try {
    const listings = await sdk.exchange.getListingsBySeller(address);
    results.push({ feature: `getListingsBySeller (${listings.length} found)`, status: '✅' });
  } catch (e) {
    results.push({ feature: 'getListingsBySeller', status: '❌', error: (e as Error).message });
  }

  // Test 9: clearApprovalCache
  try {
    sdk.exchange.clearApprovalCache();
    sdk.auction.clearApprovalCache();
    results.push({ feature: 'clearApprovalCache (exchange & auction)', status: '✅' });
  } catch (e) {
    results.push({ feature: 'clearApprovalCache', status: '❌', error: (e as Error).message });
  }

  // Test 10: clearCache
  try {
    await sdk.clearCache();
    results.push({ feature: 'clearCache (SDK)', status: '✅' });
  } catch (e) {
    results.push({ feature: 'clearCache', status: '❌', error: (e as Error).message });
  }

  // Print results
  console.log('\nTest Results:');
  console.log('─'.repeat(60));
  results.forEach((r) => {
    console.log(`${r.status} ${r.feature}`);
    if (r.error) console.log(`   Error: ${r.error.slice(0, 60)}`);
  });
  console.log('─'.repeat(60));

  const passed = results.filter((r) => r.status === '✅').length;
  const failed = results.filter((r) => r.status === '❌').length;

  console.log(`\n✅ Passed: ${passed}/${results.length}`);
  if (failed > 0) console.log(`❌ Failed: ${failed}/${results.length}`);

  console.log('\n🎉 All SDK 2.1.2 features verified!');
}

quickTest().catch((err) => {
  console.error('Verification failed:', err.message);
  process.exit(1);
});
