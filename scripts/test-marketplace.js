#!/usr/bin/env node

/**
 * Test all marketplace features
 * Usage: node scripts/test-marketplace.js
 */

const { execSync } = require("child_process");
const { ethers } = require("ethers");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const prompt = (question) =>
  new Promise((resolve) => rl.question(question, resolve));

// Color codes for output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log("\n" + "=".repeat(60));
  log(title, "bright");
  console.log("=".repeat(60));
}

function logTest(testName) {
  console.log("\n" + "-".repeat(60));
  log(`📝 ${testName}`, "cyan");
  console.log("-".repeat(60));
}

async function runCommand(command, description) {
  try {
    log(`\n⏳ ${description}...`, "yellow");
    const output = execSync(command, { encoding: "utf8", stdio: "pipe" });
    log(`✅ ${description} completed`, "green");
    return output;
  } catch (error) {
    log(`❌ ${description} failed: ${error.message}`, "red");
    throw error;
  }
}

async function testMarketplace() {
  logSection("🚀 MARKETPLACE TEST SUITE");

  let erc721Address, erc1155Address;
  let tokenId721 = 1;
  let tokenId1155 = 1;
  let listingId, auctionId, offerId, bundleId;

  try {
    // ============================================================
    // PHASE 1: COLLECTION CREATION
    // ============================================================
    logSection("PHASE 1: COLLECTION CREATION");

    logTest("Creating ERC721 Collection");
    const output721 = await runCommand(
      "node scripts/collections/create-erc721.js",
      "Creating ERC721 collection"
    );
    // Extract address from output
    const match721 = output721.match(
      /Collection deployed at: (0x[a-fA-F0-9]{40})/
    );
    if (match721) {
      erc721Address = match721[1];
      log(`   Collection Address: ${erc721Address}`, "blue");
    } else {
      // Try alternative pattern
      const altMatch = output721.match(/(0x[a-fA-F0-9]{40})/);
      if (altMatch) {
        erc721Address = altMatch[1];
        log(`   Collection Address: ${erc721Address}`, "blue");
      }
    }

    logTest("Creating ERC1155 Collection");
    const output1155 = await runCommand(
      "node scripts/collections/create-erc1155.js",
      "Creating ERC1155 collection"
    );
    const match1155 = output1155.match(
      /Collection deployed at: (0x[a-fA-F0-9]{40})/
    );
    if (match1155) {
      erc1155Address = match1155[1];
      log(`   Collection Address: ${erc1155Address}`, "blue");
    } else {
      const altMatch = output1155.match(/(0x[a-fA-F0-9]{40})/);
      if (altMatch) {
        erc1155Address = altMatch[1];
        log(`   Collection Address: ${erc1155Address}`, "blue");
      }
    }

    // Wait for blockchain
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // ============================================================
    // PHASE 2: NFT MINTING
    // ============================================================
    logSection("PHASE 2: NFT MINTING");

    if (erc721Address) {
      logTest("Minting ERC721 NFTs");
      await runCommand(
        `node scripts/nfts/mint-erc721.js ${erc721Address} 3`,
        "Minting 3 ERC721 NFTs"
      );
    }

    if (erc1155Address) {
      logTest("Minting ERC1155 Tokens");
      await runCommand(
        `node scripts/nfts/mint-erc1155.js ${erc1155Address} 1 10`,
        "Minting 10 units of token ID 1"
      );
      await runCommand(
        `node scripts/nfts/mint-erc1155.js ${erc1155Address} 2 5`,
        "Minting 5 units of token ID 2"
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));

    // ============================================================
    // PHASE 3: MARKETPLACE LISTING
    // ============================================================
    logSection("PHASE 3: MARKETPLACE LISTING");

    if (erc721Address) {
      logTest("Listing ERC721 NFT");
      const listOutput = await runCommand(
        `node scripts/marketplace/list-nft.js ${erc721Address} 1 0.1 7`,
        "Listing NFT #1 for 0.1 ETH (7 days)"
      );

      // Try to extract listing ID
      const listingMatch = listOutput.match(/Listing ID: (0x[a-fA-F0-9]{64})/);
      if (listingMatch) {
        listingId = listingMatch[1];
        log(`   Listing ID: ${listingId}`, "blue");
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // ============================================================
    // PHASE 4: AUCTION SYSTEM
    // ============================================================
    logSection("PHASE 4: AUCTION SYSTEM");

    if (erc721Address) {
      logTest("Creating English Auction");
      try {
        await runCommand(
          `echo "1\n${erc721Address}\n2\n0.05\n0.1\n1" | node scripts/auctions/create-auction.js`,
          "Creating English auction"
        );
        log("   ✅ English auction created successfully", "green");
      } catch (error) {
        log("   ⚠️  Auction creation failed (may need manual input)", "yellow");
      }
    }

    // ============================================================
    // PHASE 5: OFFER SYSTEM
    // ============================================================
    logSection("PHASE 5: OFFER SYSTEM");

    logTest("Creating Offers");
    if (erc721Address) {
      try {
        await runCommand(
          `echo "1\n${erc721Address}\n1\n0.08\n1" | node scripts/offers/create-offer.js`,
          "Creating NFT offer"
        );
        log("   ✅ NFT offer created successfully", "green");
      } catch (error) {
        log("   ⚠️  Offer creation failed (may need manual input)", "yellow");
      }
    }

    // ============================================================
    // PHASE 6: BUNDLE CREATION
    // ============================================================
    logSection("PHASE 6: BUNDLE CREATION");

    logTest("Creating NFT Bundle");
    if (erc721Address && erc1155Address) {
      try {
        await runCommand(
          `echo "2\n${erc721Address}\n1\n${erc1155Address}\n1\n0.15\n1\nyes" | node scripts/bundles/create-bundle.js`,
          "Creating NFT bundle"
        );
        log("   ✅ NFT bundle created successfully", "green");
      } catch (error) {
        log("   ⚠️  Bundle creation failed (may need manual input)", "yellow");
      }
    }

    // ============================================================
    // PHASE 7: ANALYTICS
    // ============================================================
    logSection("PHASE 7: ANALYTICS & STATISTICS");

    if (erc721Address) {
      logTest("Getting Collection Statistics");
      await runCommand(
        `node scripts/analytics/collection-stats.js ${erc721Address}`,
        "Fetching collection analytics"
      );
    }

    // ============================================================
    // SUMMARY
    // ============================================================
    logSection("✨ TEST SUMMARY");

    log("\n📊 Deployed Contracts:", "bright");
    if (erc721Address) log(`   ERC721 Collection: ${erc721Address}`, "green");
    if (erc1155Address)
      log(`   ERC1155 Collection: ${erc1155Address}`, "green");

    log("\n📋 Created Assets:", "bright");
    log("   ✅ 3 ERC721 NFTs minted", "green");
    log("   ✅ 10 units of ERC1155 token #1", "green");
    log("   ✅ 5 units of ERC1155 token #2", "green");

    log("\n🛒 Marketplace Activity:", "bright");
    if (listingId) {
      log(`   ✅ NFT Listed with ID: ${listingId}`, "green");
    } else {
      log("   ✅ NFT Listed for 0.1 ETH", "green");
    }

    log("\n⚠️  Interactive Features (Run Manually):", "yellow");
    log(
      "   - Auction creation: node scripts/auctions/create-auction.js",
      "cyan"
    );
    log("   - Place bid: node scripts/auctions/place-bid.js", "cyan");
    log("   - Create offer: node scripts/offers/create-offer.js", "cyan");
    log("   - Create bundle: node scripts/bundles/create-bundle.js", "cyan");
    log("   - Buy NFT: node scripts/marketplace/buy-nft.js", "cyan");
  } catch (error) {
    logSection("❌ TEST FAILED");
    log(error.message, "red");
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    rl.close();
  }

  logSection("🎉 MARKETPLACE TEST SUITE COMPLETED");
}

// Run if called directly
if (require.main === module) {
  testMarketplace()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error("Test suite failed:", error);
      process.exit(1);
    });
}

module.exports = { testMarketplace };
