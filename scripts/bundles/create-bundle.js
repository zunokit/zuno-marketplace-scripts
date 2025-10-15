#!/usr/bin/env node

const { ethers } = require("ethers");
const {
  getProvider,
  getSigner,
  getMarketplaceHub,
} = require("../utils/config");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const prompt = (question) =>
  new Promise((resolve) => rl.question(question, resolve));

async function createBundle() {
  console.log("📦 NFT Bundle Creation Tool\n");

  try {
    // Get network and signer
    const provider = await getProvider();
    const signer = await getSigner();
    const sellerAddress = await signer.getAddress();

    console.log(
      `📍 Connected to network: ${(await provider.getNetwork()).name}`
    );
    console.log(`👤 Your address: ${sellerAddress}\n`);

    // Get number of NFTs to bundle
    const numNfts = parseInt(await prompt("How many NFTs to bundle? (2-20): "));

    if (numNfts < 2 || numNfts > 20) {
      throw new Error("Bundle must contain between 2 and 20 NFTs");
    }

    // Collect NFT details
    const bundleItems = [];
    console.log(`\n📝 Enter details for ${numNfts} NFTs:\n`);

    for (let i = 0; i < numNfts; i++) {
      console.log(`NFT ${i + 1}:`);
      const nftAddress = await prompt("  Contract address: ");
      const tokenId = await prompt("  Token ID: ");

      // Try to detect NFT type
      const nftContract = new ethers.Contract(
        nftAddress,
        [
          "function supportsInterface(bytes4) view returns (bool)",
          "function ownerOf(uint256) view returns (address)",
          "function balanceOf(address,uint256) view returns (uint256)",
          "function name() view returns (string)",
          "function symbol() view returns (string)",
        ],
        provider
      );

      let isERC721 = false;
      let isERC1155 = false;
      let amount = 1;
      let name = "",
        symbol = "";

      try {
        // Check interfaces
        isERC721 = await nftContract.supportsInterface("0x80ac58cd");
        isERC1155 = await nftContract.supportsInterface("0xd9b67a26");
      } catch {
        // Fallback detection
        try {
          await nftContract.ownerOf(tokenId);
          isERC721 = true;
        } catch {
          isERC1155 = true;
        }
      }

      // Get collection name if possible
      try {
        name = await nftContract.name();
        symbol = await nftContract.symbol();
      } catch {}

      // Check ownership and get amount for ERC1155
      if (isERC721) {
        const owner = await nftContract.ownerOf(tokenId);
        if (owner.toLowerCase() !== sellerAddress.toLowerCase()) {
          throw new Error(
            `You don't own token ID ${tokenId} from ${nftAddress}`
          );
        }
        console.log(`  ✅ ERC721 - ${name || "Unknown"} (${symbol || "???"})`);
      } else if (isERC1155) {
        const balance = await nftContract.balanceOf(sellerAddress, tokenId);
        if (balance === 0n) {
          throw new Error(
            `You don't own any tokens of ID ${tokenId} from ${nftAddress}`
          );
        }

        const amountStr = await prompt(
          `  Amount to bundle (you have ${balance}): `
        );
        amount = parseInt(amountStr);

        if (BigInt(amount) > balance) {
          throw new Error(`You only have ${balance} tokens`);
        }

        console.log(
          `  ✅ ERC1155 - ${name || "Unknown"} (${symbol || "???"}) x${amount}`
        );
      } else {
        throw new Error(`Unable to detect NFT type for ${nftAddress}`);
      }

      bundleItems.push({
        nftContract: nftAddress,
        tokenId: BigInt(tokenId),
        amount: BigInt(amount),
        tokenType: isERC721 ? 0 : 1, // 0 = ERC721, 1 = ERC1155
        name: name || "Unknown",
        symbol: symbol || "???",
      });

      console.log("");
    }

    // Get bundle price and duration
    const bundlePriceEth = await prompt("Bundle price (in ETH): ");
    const bundlePrice = ethers.parseEther(bundlePriceEth);

    const durationDays = await prompt("Listing duration (in days): ");
    const duration = parseInt(durationDays) * 24 * 60 * 60;

    // Display bundle summary
    console.log("\n📋 Bundle Summary:");
    console.log("   Items:");
    bundleItems.forEach((item, i) => {
      console.log(
        `     ${i + 1}. ${item.name} #${item.tokenId}${
          item.amount > 1 ? ` x${item.amount}` : ""
        }`
      );
    });
    console.log(`   Total Price: ${bundlePriceEth} ETH`);
    console.log(`   Duration: ${durationDays} days`);

    const expirationDate = new Date(Date.now() + duration * 1000);
    console.log(`   Expires: ${expirationDate.toLocaleString()}\n`);

    // Confirm creation
    const confirm = await prompt("Create this bundle? (yes/no): ");
    if (confirm.toLowerCase() !== "yes" && confirm.toLowerCase() !== "y") {
      console.log("Bundle creation cancelled.");
      process.exit(0);
    }

    // Initialize MarketplaceHub
    const hub = await getMarketplaceHub();
    const { addresses } = hub;
    const bundleManagerAddress = addresses.bundleManager;

    console.log(`   Bundle Manager: ${bundleManagerAddress}\n`);

    // Check approvals for all NFTs
    console.log("🔐 Checking approvals...");

    for (const item of bundleItems) {
      const nftContract = new ethers.Contract(
        item.nftContract,
        [
          "function isApprovedForAll(address,address) view returns (bool)",
          "function setApprovalForAll(address,bool)",
          "function getApproved(uint256) view returns (address)",
          "function approve(address,uint256)",
        ],
        signer
      );

      if (item.tokenType === 0) {
        // ERC721 - check specific approval
        const approved = await nftContract.getApproved(item.tokenId);
        const isApprovedForAll = await nftContract.isApprovedForAll(
          sellerAddress,
          bundleManagerAddress
        );

        if (
          approved.toLowerCase() !== bundleManagerAddress.toLowerCase() &&
          !isApprovedForAll
        ) {
          console.log(`   Approving ${item.name} #${item.tokenId}...`);
          const tx = await nftContract.setApprovalForAll(
            bundleManagerAddress,
            true
          );
          await tx.wait();
          console.log(`   ✅ Approved`);
        }
      } else {
        // ERC1155 - check setApprovalForAll
        const isApproved = await nftContract.isApprovedForAll(
          sellerAddress,
          bundleManagerAddress
        );

        if (!isApproved) {
          console.log(`   Approving ${item.name} collection...`);
          const tx = await nftContract.setApprovalForAll(
            bundleManagerAddress,
            true
          );
          await tx.wait();
          console.log(`   ✅ Approved`);
        }
      }
    }

    console.log("   ✅ All NFTs approved!\n");

    // Create bundle
    const bundleManager = new ethers.Contract(
      bundleManagerAddress,
      [
        "function createBundle(tuple(address nftContract,uint256 tokenId,uint256 amount,uint8 tokenType)[] items,uint256 totalPrice,uint256 duration) returns (bytes32)",
        "event BundleCreated(bytes32,address,tuple(address,uint256,uint256,uint8)[],uint256,uint256)",
      ],
      signer
    );

    console.log("📤 Creating bundle...");

    // Format bundle items for contract call
    const formattedItems = bundleItems.map((item) => ({
      nftContract: item.nftContract,
      tokenId: item.tokenId,
      amount: item.amount,
      tokenType: item.tokenType,
    }));

    const tx = await bundleManager.createBundle(
      formattedItems,
      bundlePrice,
      duration
    );

    console.log(`   ⏳ Transaction: ${tx.hash}`);
    const receipt = await tx.wait();

    // Extract bundle ID from events
    const bundleEvent = receipt.logs.find(
      (log) =>
        log.topics[0] ===
        ethers.id(
          "BundleCreated(bytes32,address,tuple(address,uint256,uint256,uint8)[],uint256,uint256)"
        )
    );

    let bundleId;
    if (bundleEvent) {
      bundleId = bundleEvent.topics[1];
    }

    console.log("\n✅ Bundle Created Successfully!");
    if (bundleId) {
      console.log(`   Bundle ID: ${bundleId}`);
    }
    console.log(`   Transaction: ${tx.hash}`);
    console.log(`   Total Items: ${numNfts}`);
    console.log(`   Bundle Price: ${bundlePriceEth} ETH`);

    console.log("\n💡 Next steps:");
    console.log("   - Share the bundle ID with potential buyers");
    console.log("   - Buyers purchase all NFTs in the bundle at once");
    console.log("   - You can update price or cancel before sale");
    console.log("   - Bundle expires automatically after duration");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.data) {
      console.error("   Error data:", error.data);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
createBundle().catch(console.error);
