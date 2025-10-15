/**
 * Mint NFTs on an ERC721 Collection
 * Usage: node scripts/nfts/mint-erc721.js [collectionAddress] [quantity]
 */

const { ethers } = require("ethers");
const {
  getProviderAndSigner,
  waitForTransaction,
  ERC721_ABI
} = require("../utils/config");

// Extended ABI for minting functions (Updated for Zuno contracts)
// Using a custom ABI without inheriting ERC721_ABI to avoid conflicts
const MINT_ABI = [
  // ERC721 standard functions
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function transferFrom(address from, address to, uint256 tokenId)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  // Zuno custom minting functions
  "function mint(address to) external payable",
  "function batchMintERC721(address to, uint256 amount) external payable",
  "function getMintPrice() external view returns (uint256)",
  "function getMaxSupply() external view returns (uint256)",
  "function getTotalMinted() external view returns (uint256)",
  "function getMintLimitPerWallet() external view returns (uint256)",
  "function getMintedPerWallet(address account) external view returns (uint256)",
  "function getCurrentStage() external view returns (uint8)",
  "function isInAllowlist(address account) external view returns (bool)",
  "function getMintInfo(address account) external view returns (uint256,uint256,uint256,uint8,uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool)"
];

async function mintERC721(collectionAddress, quantity = 1, recipientAddress = null) {
  try {
    // Validate inputs
    if (!collectionAddress || !ethers.isAddress(collectionAddress)) {
      throw new Error("Invalid collection address");
    }

    // Connect to network
    const { provider, signer, account } = await getProviderAndSigner();
    const recipient = recipientAddress || account;
    
    // Connect to collection
    const collection = new ethers.Contract(collectionAddress, MINT_ABI, signer);
    
    console.log("\n📝 Collection Information:");
    console.log("   Address:", collectionAddress);
    
    // Get collection info
    let name, symbol, totalSupply, maxSupply, mintPrice, currentStage, isAllowlisted;
    try {
      name = await collection.name();
      symbol = await collection.symbol();
      console.log("   Name:", name || "N/A");
      console.log("   Symbol:", symbol || "N/A");
    } catch (e) {
      console.log("   Name/Symbol: Unable to fetch");
    }
    
    // Get minting stage
    try {
      currentStage = await collection.getCurrentStage();
      const stageNames = ["INACTIVE", "ALLOWLIST", "PUBLIC"];
      console.log("   Current Stage:", stageNames[currentStage] || "UNKNOWN");
      
      // Check if user is in allowlist
      if (currentStage === 1) { // ALLOWLIST stage
        isAllowlisted = await collection.isInAllowlist(recipient);
        console.log("   Allowlist Status:", isAllowlisted ? "✅ Whitelisted" : "❌ Not whitelisted");
      }
    } catch (e) {
      console.log("   Minting Stage: Unable to fetch");
    }
    
    try {
      totalSupply = await collection.getTotalMinted();
      console.log("   Current Supply:", totalSupply.toString());
    } catch (e) {
      console.log("   Current Supply: Unable to fetch");
    }
    
    try {
      maxSupply = await collection.getMaxSupply();
      console.log("   Max Supply:", maxSupply.toString());
    } catch (e) {
      console.log("   Max Supply: Unable to fetch");
    }
    
    // Try to get mint price (getMintPrice returns current price based on stage)
    try {
      mintPrice = await collection.getMintPrice();
    } catch (e) {
      mintPrice = ethers.parseEther("0.01"); // Default fallback
      console.log("   Mint Price: Using default 0.01 ETH");
    }
    
    if (mintPrice) {
      console.log("   Mint Price:", ethers.formatEther(mintPrice), "ETH");
    }
    
    // Check mint limits
    try {
      const mintLimitPerWallet = await collection.getMintLimitPerWallet();
      const mintedPerWallet = await collection.getMintedPerWallet(recipient);
      console.log(`   Mint Limit: ${mintedPerWallet}/${mintLimitPerWallet} already minted`);
      
      if (mintedPerWallet + BigInt(quantity) > mintLimitPerWallet) {
        console.log(`   ⚠️  Warning: Exceeds mint limit! Max remaining: ${mintLimitPerWallet - mintedPerWallet}`);
      }
    } catch (e) {
      // Ignore if unable to fetch
    }
    
    const totalCost = mintPrice * BigInt(quantity);
    console.log(`   Total Cost for ${quantity} NFT(s):`, ethers.formatEther(totalCost), "ETH");
    
    console.log("\n🎯 Minting Parameters:");
    console.log("   Recipient:", recipient);
    console.log("   Quantity:", quantity);
    
    // Try different mint methods
    let tx;
    let success = false;
    
    // Method 1: Try batchMintERC721 for multiple NFTs
    if (!success && quantity > 1) {
      try {
        console.log("\n🔄 Attempting batchMintERC721(address, amount)...");
        tx = await collection.batchMintERC721(recipient, quantity, { value: totalCost });
        success = true;
      } catch (e) {
        console.log("   batchMintERC721 failed:", e.message || e);
      }
    }
    
    // Method 2: Try single mint (works for both single and multiple)
    if (!success) {
      try {
        console.log("\n🔄 Attempting mint(address)...");
        if (quantity > 1) {
          console.log("   Minting one by one...");
          for (let i = 0; i < quantity; i++) {
            tx = await collection.mint(recipient, { value: mintPrice });
            await waitForTransaction(tx, `Mint NFT ${i + 1}/${quantity}`);
          }
          console.log(`\n✅ Successfully minted ${quantity} NFTs!`);
          return;
        } else {
          tx = await collection.mint(recipient, { value: mintPrice });
          success = true;
        }
      } catch (e) {
        console.log("   mint failed:", e.message || e);
        throw new Error("No compatible mint function found on this collection. Error: " + (e.message || e));
      }
    }
    
    if (success && tx) {
      const receipt = await waitForTransaction(tx, "Mint NFT");
      
      console.log("\n✅ NFT(s) minted successfully!");
      
      // Try to get token IDs from events
      try {
        const transferEvents = receipt.logs.filter(log => {
          try {
            const parsed = collection.interface.parseLog(log);
            return parsed?.name === "Transfer";
          } catch {
            return false;
          }
        });
        
        if (transferEvents.length > 0) {
          console.log("\n📦 Minted Token IDs:");
          transferEvents.forEach(event => {
            const parsed = collection.interface.parseLog(event);
            console.log(`   Token #${parsed.args[2]}`);
          });
        }
      } catch (e) {
        // Event parsing failed
      }
      
      // Check new balance
      try {
        const balance = await collection.balanceOf(recipient);
        console.log(`\n📊 New Balance: ${balance} NFTs`);
      } catch (e) {
        // Balance check failed
      }
    }
    
  } catch (error) {
    console.error("\n❌ Error minting NFT:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const collectionAddress = args[0];
  const quantity = parseInt(args[1]) || 1;
  const recipient = args[2];
  
  if (!collectionAddress) {
    console.error("Usage: node mint-erc721.js <collectionAddress> [quantity] [recipient]");
    console.error("Example: node mint-erc721.js 0x123... 5");
    process.exit(1);
  }
  
  mintERC721(collectionAddress, quantity, recipient)
    .then(() => {
      console.log("\n✨ Minting completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Minting failed:", error);
      process.exit(1);
    });
}

module.exports = { mintERC721 };
