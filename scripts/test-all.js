/**
 * Test all collection, NFT, and marketplace operations
 * Usage: node scripts/test-all.js [basic|marketplace|full]
 * 
 * Options:
 *   basic      - Test collections and minting only (default)
 *   marketplace - Test marketplace features only
 *   full       - Test everything
 */

const { createERC721Collection } = require("./collections/create-erc721");
const { createERC1155Collection } = require("./collections/create-erc1155");
const { mintERC721 } = require("./nfts/mint-erc721");
const { mintERC1155 } = require("./nfts/mint-erc1155");
const { batchMintERC721 } = require("./nfts/batch-mint-erc721");
const { batchMintERC1155 } = require("./nfts/batch-mint-erc1155");
const { testMarketplace } = require("./test-marketplace");

async function testAll() {
  console.log("🚀 Starting comprehensive test suite...\n");
  console.log("=" .repeat(60));
  
  try {
    // Test 1: Create ERC721 Collection
    console.log("\n📝 TEST 1: Create ERC721 Collection");
    console.log("-" .repeat(60));
    const erc721Address = await createERC721Collection({
      name: "Test ERC721 Suite",
      symbol: "TEST721",
      description: "ERC721 collection for testing all features"
    });
    console.log("✅ ERC721 Collection created:", erc721Address);
    
    // Wait a bit for blockchain to settle
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Mint single ERC721
    console.log("\n📝 TEST 2: Mint Single ERC721 NFT");
    console.log("-" .repeat(60));
    await mintERC721(erc721Address, 1);
    console.log("✅ Single ERC721 NFT minted");
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 3: Batch mint ERC721 (mint 4 more to reach the limit of 5)
    console.log("\n📝 TEST 3: Batch Mint ERC721 NFTs");
    console.log("-" .repeat(60));
    await batchMintERC721(erc721Address, 4); // Only 4 more since we already minted 1
    console.log("✅ Batch minted 4 ERC721 NFTs");
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 4: Create ERC1155 Collection
    console.log("\n📝 TEST 4: Create ERC1155 Collection");
    console.log("-" .repeat(60));
    const erc1155Address = await createERC1155Collection({
      name: "Test ERC1155 Suite",
      symbol: "TEST1155",
      description: "ERC1155 collection for testing multi-token features"
    });
    console.log("✅ ERC1155 Collection created:", erc1155Address);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 5: Mint single ERC1155 token (reduced amount to respect mint limits)
    console.log("\n📝 TEST 5: Mint Single ERC1155 Token");
    console.log("-" .repeat(60));
    await mintERC1155(erc1155Address, 1, 5); // Token ID 1, amount 5 (respecting mint limit)
    console.log("✅ Minted 5 units of ERC1155 Token");
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 6: Batch mint ERC1155 tokens (with smaller amounts)
    console.log("\n📝 TEST 6: Batch Mint ERC1155 Tokens");
    console.log("-" .repeat(60));
    await batchMintERC1155(
      erc1155Address,
      [2, 3, 4],        // Token IDs (ignored in Zuno - creates new ones)
      [1, 1, 1]         // Amounts (1 of each to stay within limits)
    );
    console.log("✅ Batch minted multiple ERC1155 tokens");
    
    // Summary
    console.log("\n" + "=" .repeat(60));
    console.log("🎉 ALL TESTS COMPLETED SUCCESSFULLY!");
    console.log("=" .repeat(60));
    console.log("\n📊 Test Summary:");
    console.log("   ✅ ERC721 Collection Created");
    console.log("   ✅ Single ERC721 NFT Minted");
    console.log("   ✅ Batch ERC721 NFTs Minted");
    console.log("   ✅ ERC1155 Collection Created");
    console.log("   ✅ Single ERC1155 Token Minted");
    console.log("   ✅ Batch ERC1155 Tokens Minted");
    console.log("\n📍 Deployed Contracts:");
    console.log("   ERC721 Collection:", erc721Address);
    console.log("   ERC1155 Collection:", erc1155Address);
    
  } catch (error) {
    console.error("\n❌ Test suite failed:", error);
    throw error;
  }
}

async function runTests() {
  const testMode = process.argv[2] || 'basic';
  
  console.log(`\n🎯 Running test mode: ${testMode.toUpperCase()}\n`);
  
  switch(testMode.toLowerCase()) {
    case 'basic':
      await testAll();
      break;
      
    case 'marketplace':
      await testMarketplace();
      break;
      
    case 'full':
      console.log("=" .repeat(60));
      console.log("PART 1: BASIC TESTS");
      console.log("=" .repeat(60));
      await testAll();
      
      console.log("\n" + "=" .repeat(60));
      console.log("PART 2: MARKETPLACE TESTS");
      console.log("=" .repeat(60));
      await testMarketplace();
      break;
      
    default:
      console.error(`Unknown test mode: ${testMode}`);
      console.log('Usage: node scripts/test-all.js [basic|marketplace|full]');
      process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runTests()
    .then(() => {
      console.log("\n✨ Test suite completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Test suite failed:", error);
      process.exit(1);
    });
}

module.exports = { testAll };
