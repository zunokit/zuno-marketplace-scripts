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

async function listNFT() {
  console.log("🛒 NFT Marketplace Listing Tool\n");

  try {
    // Get network and signer
    const provider = await getProvider();
    const signer = await getSigner();
    const signerAddress = await signer.getAddress();

    console.log(
      `📍 Connected to network: ${(await provider.getNetwork()).name}`
    );
    console.log(`👤 Your address: ${signerAddress}\n`);

    // Get NFT contract address from command line or prompt
    let nftAddress = process.argv[2];
    if (!nftAddress) {
      nftAddress = await prompt("Enter NFT contract address: ");
    }

    // Get token ID
    let tokenId = process.argv[3];
    if (!tokenId) {
      tokenId = await prompt("Enter token ID to list: ");
    }

    // Get price in ETH
    let priceInEth = process.argv[4];
    if (!priceInEth) {
      priceInEth = await prompt("Enter listing price (in ETH): ");
    }

    // Get duration in days
    let durationInDays = process.argv[5];
    if (!durationInDays) {
      durationInDays = await prompt("Enter listing duration (in days): ");
    }

    // Convert inputs
    const price = ethers.parseEther(priceInEth);
    const duration = parseInt(durationInDays) * 24 * 60 * 60; // Convert days to seconds

    console.log("\n📋 Listing Details:");
    console.log(`   NFT Contract: ${nftAddress}`);
    console.log(`   Token ID: ${tokenId}`);
    console.log(`   Price: ${priceInEth} ETH`);
    console.log(`   Duration: ${durationInDays} days\n`);

    // Initialize MarketplaceHub
    const hub = await getMarketplaceHub();
    const { addresses } = hub;

    // Get the appropriate exchange based on NFT type
    console.log("🔍 Detecting NFT type...");

    // Try to detect if it's ERC721 or ERC1155
    const nftContract = new ethers.Contract(
      nftAddress,
      [
        "function supportsInterface(bytes4) view returns (bool)",
        "function ownerOf(uint256) view returns (address)",
        "function balanceOf(address,uint256) view returns (uint256)",
        "function isApprovedForAll(address,address) view returns (bool)",
        "function setApprovalForAll(address,bool)",
      ],
      signer
    );

    let isERC721 = false;
    let isERC1155 = false;

    try {
      // Check for ERC721 interface (0x80ac58cd)
      isERC721 = await nftContract.supportsInterface("0x80ac58cd");
      // Check for ERC1155 interface (0xd9b67a26)
      isERC1155 = await nftContract.supportsInterface("0xd9b67a26");
    } catch (e) {
      // Fallback: try to call ownerOf (ERC721 specific)
      try {
        await nftContract.ownerOf(tokenId);
        isERC721 = true;
      } catch {
        // Assume ERC1155 if ownerOf fails
        isERC1155 = true;
      }
    }

    let exchangeAddress;
    let amount = 1; // Default amount for ERC721

    if (isERC721) {
      console.log("✅ Detected ERC721 NFT");

      // Check ownership
      const owner = await nftContract.ownerOf(tokenId);
      if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
        throw new Error(`You don't own token ID ${tokenId}`);
      }

      exchangeAddress = addresses.erc721Exchange;
    } else if (isERC1155) {
      console.log("✅ Detected ERC1155 NFT");

      // For ERC1155, ask for amount to list
      const balance = await nftContract.balanceOf(signerAddress, tokenId);
      console.log(`   Your balance: ${balance}`);

      if (balance === 0n) {
        throw new Error(`You don't own any tokens of ID ${tokenId}`);
      }

      const amountStr = await prompt("Enter amount to list (default: 1): ");
      amount = amountStr ? parseInt(amountStr) : 1;

      if (BigInt(amount) > balance) {
        throw new Error(
          `You only have ${balance} tokens, cannot list ${amount}`
        );
      }

      exchangeAddress = addresses.erc1155Exchange;
    } else {
      throw new Error("Unable to detect NFT standard (ERC721/ERC1155)");
    }

    console.log(`   Exchange address: ${exchangeAddress}\n`);

    // Check approval
    console.log("🔐 Checking approval status...");
    const isApproved = await nftContract.isApprovedForAll(
      signerAddress,
      exchangeAddress
    );

    if (!isApproved) {
      console.log("   ❌ Not approved. Approving marketplace...");
      const approveTx = await nftContract.setApprovalForAll(
        exchangeAddress,
        true
      );
      console.log(`   ⏳ Approval tx: ${approveTx.hash}`);
      await approveTx.wait();
      console.log("   ✅ Marketplace approved!\n");
    } else {
      console.log("   ✅ Already approved!\n");
    }

    // Create the exchange contract instance
    const exchangeAbi = [
      "function listNFT(address,uint256,uint256,uint256) returns (bytes32)" +
        (isERC1155 ? "" : ""),
      "function listNFT(address,uint256,uint256,uint256,uint256) returns (bytes32)" +
        (isERC1155 ? "" : ""),
      "event NFTListed(bytes32,address,uint256,address,uint256,uint256,address,uint256)",
    ];

    const exchange = new ethers.Contract(exchangeAddress, exchangeAbi, signer);

    // List the NFT
    console.log("📤 Listing NFT on marketplace...");

    let tx;
    if (isERC721) {
      tx = await exchange["listNFT(address,uint256,uint256,uint256)"](
        nftAddress,
        tokenId,
        price,
        duration
      );
    } else {
      tx = await exchange["listNFT(address,uint256,uint256,uint256,uint256)"](
        nftAddress,
        tokenId,
        amount,
        price,
        duration
      );
    }

    console.log(`   ⏳ Transaction: ${tx.hash}`);
    const receipt = await tx.wait();

    // Extract listing ID from events
    const listingEvent = receipt.logs.find(
      (log) =>
        log.topics[0] ===
        ethers.id(
          "NFTListed(bytes32,address,uint256,address,uint256,uint256,address,uint256)"
        )
    );

    if (listingEvent) {
      const listingId = listingEvent.topics[1];
      console.log(`\n✅ NFT Listed Successfully!`);
      console.log(`   Listing ID: ${listingId}`);
      console.log(
        `   View on marketplace: [Your marketplace URL]/listing/${listingId}`
      );
    } else {
      console.log(`\n✅ NFT Listed Successfully!`);
      console.log(`   Transaction: ${tx.hash}`);
    }

    // Calculate expiration
    const expirationDate = new Date(Date.now() + duration * 1000);
    console.log(`   Expires: ${expirationDate.toLocaleString()}\n`);
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
listNFT().catch(console.error);
