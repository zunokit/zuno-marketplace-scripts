/**
 * Real Data Test Script for Zuno Marketplace CLI
 * Tests all commands with real blockchain data
 *
 * Usage: npx tsx test-real-data.ts
 */

import { spawn } from 'child_process';
import { ethers } from 'ethers';

// Configuration
const NETWORK = process.env.TEST_NETWORK || 'local';
const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';

// Test results
const results: { command: string; status: 'pass' | 'fail'; error?: string; duration: number }[] = [];

/**
 * Execute CLI command and return result
 */
async function runCommand(command: string, args: string[] = []): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const cmd = `node`;
    const cmdArgs = ['./dist/index.js', command, ...args, '--network', NETWORK];

    console.log(`\n📝 Executing: zuno ${command} ${args.join(' ')}`);

    const proc = spawn(cmd, cmdArgs, {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'test' },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });

    proc.on('close', (exitCode) => {
      const duration = Date.now() - startTime;
      resolve({ stdout, stderr, exitCode: exitCode || 0 });
    });
  });
}

/**
 * Test a command and record result
 */
async function testCommand(
  name: string,
  command: string,
  args: string[] = [],
  expectSuccess = true
): Promise<boolean> {
  const startTime = Date.now();
  try {
    const result = await runCommand(command, args);
    const duration = Date.now() - startTime;
    const success = result.exitCode === 0;

    if (success === expectSuccess) {
      results.push({ command: name, status: 'pass', duration });
      console.log(`✅ ${name} - PASSED (${duration}ms)`);
      return true;
    } else {
      results.push({ command: name, status: 'fail', error: result.stderr, duration });
      console.log(`❌ ${name} - FAILED (${duration}ms)`);
      return false;
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    results.push({ command: name, status: 'fail', error: String(error), duration });
    console.log(`❌ ${name} - ERROR (${duration}ms)`);
    return false;
  }
}

/**
 * Get a random account from the network
 */
async function getAccount(index: number): Promise<string> {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const accounts = await provider.listAccounts();
  return accounts[index]?.address || '0x0000000000000000000000000000000000000000';
}

/**
 * Main test suite
 */
async function runTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   Zuno Marketplace CLI - Real Data Test Suite          ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`Network: ${NETWORK}`);
  console.log(`RPC URL: ${RPC_URL}`);
  console.log('');

  // Get test accounts
  const account0 = await getAccount(0);
  const account1 = await getAccount(1);

  console.log(`Test Account 0: ${account0}`);
  console.log(`Test Account 1: ${account1}`);
  console.log('');

  // ============================================
  // COLLECTION TESTS
  // ============================================
  console.log('\n📦 COLLECTION TESTS');
  console.log('═══════════════════════════════════════════════════════');

  // 1. Create ERC721 Collection
  let collectionAddress721 = '';
  const create721Result = await testCommand(
    'Create ERC721 Collection',
    'create-erc721',
    ['--name', 'Test ERC721 Collection', '--symbol', 'TEST721', '--maxSupply', '100', '--mintPrice', '0.01']
  );

  if (create721Result) {
    // Extract collection address from output
    const { stdout } = await runCommand('list-collections', []);
    const match = stdout.match(/Address:\s+(0x[a-fA-F0-9]{40})/);
    if (match) {
      collectionAddress721 = match[1];
      console.log(`   Collection address: ${collectionAddress721}`);
    }
  }

  // 2. Create ERC1155 Collection
  let collectionAddress1155 = '';
  const create1155Result = await testCommand(
    'Create ERC1155 Collection',
    'create-erc1155',
    ['--name', 'Test ERC1155 Collection', '--symbol', 'TEST1155', '--maxSupply', '1000', '--mintPrice', '0.001']
  );

  if (create1155Result) {
    const { stdout } = await runCommand('list-collections', []);
    const matches = stdout.match(/Address:\s+(0x[a-fA-F0-9]{40})/g);
    if (matches && matches.length > 1) {
      collectionAddress1155 = matches[1].replace('Address:', '').trim();
      console.log(`   Collection address: ${collectionAddress1155}`);
    }
  }

  // 3. Get Collection Info
  if (collectionAddress721) {
    await testCommand('Get Collection Info', 'get-collection-info', ['--collectionAddress', collectionAddress721]);
  }

  // 4. List Collections
  await testCommand('List Collections', 'list-collections', []);

  // 5. Verify Collection
  if (collectionAddress721) {
    await testCommand('Verify Collection', 'verify-collection', ['--collectionAddress', collectionAddress721]);
  }

  // ============================================
  // NFT MINTING TESTS
  // ============================================
  console.log('\n🎨 NFT MINTING TESTS');
  console.log('═══════════════════════════════════════════════════════');

  let tokenId721 = '';
  let tokenId1155 = '';

  // 6. Mint ERC721
  if (collectionAddress721) {
    const mintResult = await testCommand(
      'Mint ERC721',
      'mint-erc721',
      ['--collectionAddress', collectionAddress721, '--recipient', account0]
    );
    if (mintResult) {
      const { stdout } = await runCommand('get-owned-tokens', ['--collectionAddress', collectionAddress721, '--userAddress', account0]);
      const match = stdout.match(/Token ID:\s+(\d+)/);
      if (match) tokenId721 = match[1];
    }
  }

  // 7. Mint ERC1155
  if (collectionAddress1155) {
    const mintResult = await testCommand(
      'Mint ERC1155',
      'mint-erc1155',
      ['--collectionAddress', collectionAddress1155, '--amount', '10', '--recipient', account0]
    );
    if (mintResult) {
      const { stdout } = await runCommand('get-owned-tokens', ['--collectionAddress', collectionAddress1155, '--userAddress', account0]);
      const match = stdout.match(/Token ID:\s+(\d+)/);
      if (match) tokenId1155 = match[1];
    }
  }

  // 8. Get Owned Tokens
  if (collectionAddress721) {
    await testCommand('Get Owned Tokens', 'get-owned-tokens', ['--collectionAddress', collectionAddress721]);
  }

  // 9. Batch Mint ERC721
  if (collectionAddress721) {
    await testCommand(
      'Batch Mint ERC721',
      'batch-mint-erc721',
      ['--collectionAddress', collectionAddress721, '--quantity', '3']
    );
  }

  // 10. Owner Mint
  if (collectionAddress721) {
    await testCommand(
      'Owner Mint',
      'owner-mint',
      ['--collectionAddress', collectionAddress721, '--amount', '2', '--recipient', account0]
    );
  }

  // ============================================
  // ALLOWLIST TESTS
  // ============================================
  console.log('\n📋 ALLOWLIST TESTS');
  console.log('═══════════════════════════════════════════════════════');

  if (collectionAddress721) {
    // 11. Add to Allowlist
    await testCommand(
      'Add to Allowlist',
      'add-to-allowlist',
      ['--collectionAddress', collectionAddress721, '--addresses', `${account0},${account1}`]
    );

    // 12. Check Allowlist
    await testCommand('Check Allowlist', 'check-allowlist', ['--collectionAddress', collectionAddress721, '--address', account0]);

    // 13. Check Allowlist Mode
    await testCommand('Check Allowlist Mode', 'check-allowlist-mode', ['--collectionAddress', collectionAddress721]);

    // 14. Set Allowlist Only
    await testCommand(
      'Set Allowlist Only',
      'set-allowlist-only',
      ['--collectionAddress', collectionAddress721, '--enabled', 'true']
    );

    // 15. Setup Allowlist (combined)
    await testCommand(
      'Setup Allowlist',
      'setup-allowlist',
      ['--collectionAddress', collectionAddress721, '--addresses', account1, '--enableAllowlistOnly', 'false']
    );

    // 16. Remove from Allowlist
    await testCommand(
      'Remove from Allowlist',
      'remove-from-allowlist',
      ['--collectionAddress', collectionAddress721, '--addresses', account1]
    );
  }

  // ============================================
  // MARKETPLACE TESTS
  // ============================================
  console.log('\n🏪 MARKETPLACE TESTS');
  console.log('═══════════════════════════════════════════════════════');

  let listingId = '';

  // 17. List NFT
  if (collectionAddress721 && tokenId721) {
    const listResult = await testCommand(
      'List NFT',
      'list-nft',
      ['--nftAddress', collectionAddress721, '--tokenId', tokenId721, '--price', '0.1', '--duration', '7']
    );
    if (listResult) {
      const { stdout } = await runCommand('get-listings', ['--collectionAddress', collectionAddress721]);
      const match = stdout.match(/Listing ID:\s+(0x[a-fA-F0-9]+)/);
      if (match) listingId = match[1];
    }
  }

  // 18. Get Listings
  if (collectionAddress721) {
    await testCommand('Get Listings', 'get-listings', ['--collectionAddress', collectionAddress721]);
  }

  // 19. Get Listings By Seller
  await testCommand('Get Listings By Seller', 'get-listings-by-seller', ['--sellerAddress', account0]);

  // 20. Get Listing
  if (listingId) {
    await testCommand('Get Listing', 'get-listing', ['--listingId', listingId]);
  }

  // 21. Get Buyer Price
  if (listingId) {
    await testCommand('Get Buyer Price', 'get-buyer-price', ['--listingId', listingId]);
  }

  // 22. Batch List NFT
  if (collectionAddress721 && tokenId721) {
    await testCommand(
      'Batch List NFT',
      'batch-list-nft',
      ['--collectionAddress', collectionAddress721, '--tokenIds', '2,3', '--prices', '0.05,0.08', '--duration', '5']
    );
  }

  // ============================================
  // AUCTION TESTS
  // ============================================
  console.log('\n🔨 AUCTION TESTS');
  console.log('═══════════════════════════════════════════════════════');

  let auctionId = '';
  let dutchAuctionId = '';

  // 23. Create Auction (English)
  if (collectionAddress721 && tokenId721) {
    const auctionResult = await testCommand(
      'Create English Auction',
      'create-auction',
      ['--auctionType', 'english', '--nftAddress', collectionAddress721, '--tokenId', tokenId721, '--startingPrice', '0.05', '--duration', '3']
    );
    if (auctionResult) {
      const { stdout } = await runCommand('get-auction', ['--auctionId', '1']);
      auctionId = '1';
    }
  }

  // 24. Create Dutch Auction
  if (collectionAddress721) {
    const dutchResult = await testCommand(
      'Create Dutch Auction',
      'create-dutch-auction',
      ['--nftAddress', collectionAddress721, '--tokenId', '2', '--startPrice', '0.2', '--endPrice', '0.05', '--duration', '2']
    );
    if (dutchResult) {
      dutchAuctionId = '2';
    }
  }

  // 25. Get Auction
  if (auctionId) {
    await testCommand('Get Auction', 'get-auction', ['--auctionId', auctionId]);
  }

  // 26. Get Auction Price (Dutch)
  if (dutchAuctionId) {
    await testCommand('Get Auction Price', 'get-auction-price', ['--auctionId', dutchAuctionId]);
  }

  // 27. Batch Create English Auction
  if (collectionAddress721) {
    await testCommand(
      'Batch Create English Auction',
      'batch-create-english-auction',
      ['--collectionAddress', collectionAddress721, '--tokenIds', '4,5', '--startingBid', '0.03', '--duration', '3']
    );
  }

  // 28. Batch Create Dutch Auction
  if (collectionAddress721) {
    await testCommand(
      'Batch Create Dutch Auction',
      'batch-create-dutch-auction',
      ['--collectionAddress', collectionAddress721, '--tokenIds', '6,7', '--startPrice', '0.15', '--endPrice', '0.03', '--duration', '2']
    );
  }

  // ============================================
  // UTILITY TESTS
  // ============================================
  console.log('\n🔧 UTILITY TESTS');
  console.log('═══════════════════════════════════════════════════════');

  // 29. Clear Cache
  await testCommand('Clear Cache', 'clear-cache', ['--type', 'all']);

  // ============================================
  // TEST SUMMARY
  // ============================================
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║                  TEST SUMMARY                          ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Total Duration: ${totalDuration}ms`);
  console.log(`⚡ Average: ${Math.round(totalDuration / results.length)}ms/test`);

  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results
      .filter(r => r.status === 'fail')
      .forEach(r => {
        console.log(`   - ${r.command}`);
        if (r.error) console.log(`     Error: ${r.error.slice(0, 100)}...`);
      });
  }

  console.log('');
  console.log(failed === 0 ? '🎉 All tests passed!' : '⚠️  Some tests failed');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('Test suite error:', error);
  process.exit(1);
});
