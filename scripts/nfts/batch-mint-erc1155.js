/**
 * Batch mint multiple tokens on an ERC1155 Collection
 * Usage: node scripts/nfts/batch-mint-erc1155.js [collectionAddress] [tokenIds] [amounts]
 */

const { ethers } = require("ethers");
const {
  getProviderAndSigner,
  waitForTransaction,
  ERC1155_ABI
} = require("../utils/config");

// Extended ABI for batch minting (Updated for Zuno contracts)
const BATCH_MINT_ABI = [
  ...ERC1155_ABI,
  "function mint(address to, uint256 amount) external payable", // Creates new token ID
  "function batchMintERC1155(address to, uint256 amount) external payable", // Creates multiple new token IDs  
  "function getMintPrice() external view returns (uint256)",
  "function getMaxSupply() external view returns (uint256)",
  "function getTotalMinted() external view returns (uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)"
];

async function batchMintERC1155(collectionAddress, tokenIds = null, amounts = null, recipientAddress = null) {
  try {
    // Note: In Zuno contracts, tokenIds are not used - batchMintERC1155() creates new token IDs
    // We'll use the amounts array length to determine how many different tokens to create
    
    // Validate inputs
    if (!collectionAddress || !ethers.isAddress(collectionAddress)) {
      throw new Error("Invalid collection address");
    }

    // Default values if not provided
    let numTokens = 3; // Default: create 3 different token IDs
    if (amounts && amounts.length > 0) {
      numTokens = amounts.length;
    } else if (tokenIds && tokenIds.length > 0) {
      numTokens = tokenIds.length;
      amounts = new Array(tokenIds.length).fill(1); // Default: 1 of each
    } else {
      amounts = [50, 75, 100]; // Default amounts for 3 tokens
    }

    // Connect to network
    const { provider, signer, account } = await getProviderAndSigner();
    const recipient = recipientAddress || account;
    
    // Connect to collection
    const collection = new ethers.Contract(collectionAddress, BATCH_MINT_ABI, signer);
    
    console.log("\n📝 Collection Information:");
    console.log("   Address:", collectionAddress);
    
    // Get collection info
    let name, symbol, mintPrice;
    try {
      name = await collection.name();
      symbol = await collection.symbol();
      console.log("   Name:", name || "N/A");
      console.log("   Symbol:", symbol || "N/A");
    } catch (e) {
      console.log("   Name/Symbol: Unable to fetch");
    }
    
    // Try to get mint price
    try {
      mintPrice = await collection.getMintPrice();
    } catch (e1) {
      try {
        mintPrice = await collection.mintPrice();
      } catch (e2) {
        mintPrice = ethers.parseEther("0.005"); // Default for ERC1155
        console.log("   Mint Price: Using default 0.005 ETH per token");
      }
    }
    
    if (mintPrice) {
      console.log("   Mint Price (per token):", ethers.formatEther(mintPrice), "ETH");
    }
    
    // Calculate total cost
    const totalTokens = amounts.reduce((sum, amount) => sum + amount, 0);
    const totalCost = mintPrice * BigInt(totalTokens);
    console.log(`   Total Tokens: ${totalTokens}`);
    console.log(`   Total Cost:`, ethers.formatEther(totalCost), "ETH");
    
    console.log("\n🎯 Batch Minting Parameters:");
    console.log("   Recipient:", recipient);
    console.log("   Token IDs:", tokenIds.join(", "));
    console.log("   Amounts:", amounts.join(", "));
    
    // Show what we're minting
    console.log("\n📦 Minting Details:");
    tokenIds.forEach((id, index) => {
      console.log(`   Token #${id}: ${amounts[index]} units`);
    });
    
    // Try different batch mint methods
    let tx;
    let success = false;
    
    // Method 1: Try mintBatch with data parameter
    if (!success) {
      try {
        console.log("\n🔄 Attempting mintBatch(to, ids[], amounts[], data)...");
        const data = "0x"; // Empty data
        tx = await collection.mintBatch(recipient, tokenIds, amounts, data, { value: totalCost });
        success = true;
      } catch (e) {
        console.log("   mintBatch with data not available");
      }
    }
    
    // Method 2: Try batchMint without data
    if (!success) {
      try {
        console.log("\n🔄 Attempting batchMint(to, ids[], amounts[])...");
        tx = await collection.batchMint(recipient, tokenIds, amounts, { value: totalCost });
        success = true;
      } catch (e) {
        console.log("   batchMint not available");
      }
    }
    
    // Method 3: Try mintMultiple
    if (!success) {
      try {
        console.log("\n🔄 Attempting mintMultiple(to, ids[], amounts[])...");
        tx = await collection.mintMultiple(recipient, tokenIds, amounts, { value: totalCost });
        success = true;
      } catch (e) {
        console.log("   mintMultiple not available");
      }
    }
    
    // Method 4: Try mintBatch without payment (might be owner only)
    if (!success) {
      try {
        console.log("\n🔄 Attempting mintBatch without payment...");
        const data = "0x";
        tx = await collection.mintBatch(recipient, tokenIds, amounts, data);
        success = true;
      } catch (e) {
        console.log("   Free batch mint not available");
      }
    }
    
    // Method 5: Fall back to sequential minting (Zuno creates new token IDs)
    if (!success) {
      console.log("\n⚠️ No batch mint function available, falling back to sequential minting...");
      console.log("Note: Each mint creates a new token ID in Zuno contracts.\n");
      
      for (let i = 0; i < amounts.length; i++) {
        try {
          const amount = amounts[i];
          const tokenCost = mintPrice * BigInt(amount);
          
          console.log(`\n📦 Creating new token with ${amount} units:`);
          console.log(`   Cost: ${ethers.formatEther(tokenCost)} ETH`);
          
          // Zuno's mint(to, amount) creates a new token ID
          const singleTx = await collection.mint(recipient, amount, { value: tokenCost });
          const receipt = await singleTx.wait();
          
          // Try to get the token ID from events
          let newTokenId = "unknown";
          try {
            const transferEvents = receipt.logs.filter(log => {
              try {
                const parsed = collection.interface.parseLog(log);
                return parsed?.name === "TransferSingle";
              } catch {
                return false;
              }
            });
            if (transferEvents.length > 0) {
              const parsed = collection.interface.parseLog(transferEvents[0]);
              newTokenId = parsed.args[3].toString(); // Token ID is 4th argument in TransferSingle
            }
          } catch (e) {
            // Event parsing failed
          }
          
          console.log(`   ✓ Created Token #${newTokenId} with ${amount} units in block ${receipt.blockNumber}`);
          
        } catch (error) {
          console.error(`   ✗ Failed to mint token ${i + 1}:`, error.message);
          throw error;
        }
      }
      
      console.log(`\n✅ Successfully minted all tokens sequentially!`);
      
      // Check final balances
      console.log("\n📊 Final Balances:");
      for (const tokenId of tokenIds) {
        try {
          const balance = await collection.balanceOf(recipient, tokenId);
          console.log(`   Token #${tokenId}: ${balance} units`);
        } catch (e) {
          // Balance check failed
        }
      }
      
      return;
    }
    
    if (success && tx) {
      const receipt = await waitForTransaction(tx, `Batch Mint ${totalTokens} tokens`);
      
      console.log(`\n✅ Batch minted successfully!`);
      console.log(`   Total tokens minted: ${totalTokens}`);
      
      // Try to parse TransferBatch event
      try {
        const transferEvents = receipt.logs.filter(log => {
          try {
            const parsed = collection.interface.parseLog(log);
            return parsed?.name === "TransferBatch" || parsed?.name === "TransferSingle";
          } catch {
            return false;
          }
        });
        
        if (transferEvents.length > 0) {
          console.log("\n📦 Transfer Events:");
          transferEvents.forEach(event => {
            const parsed = collection.interface.parseLog(event);
            if (parsed.name === "TransferBatch") {
              const ids = parsed.args[3]; // token IDs
              const values = parsed.args[4]; // amounts
              ids.forEach((id, idx) => {
                console.log(`   Token #${id}: ${values[idx]} units`);
              });
            } else if (parsed.name === "TransferSingle") {
              console.log(`   Token #${parsed.args[3]}: ${parsed.args[4]} units`);
            }
          });
        }
      } catch (e) {
        // Event parsing failed
      }
      
      // Check final balances
      console.log("\n📊 Final Balances:");
      for (const tokenId of tokenIds) {
        try {
          const balance = await collection.balanceOf(recipient, tokenId);
          console.log(`   Token #${tokenId}: ${balance} units`);
        } catch (e) {
          // Balance check failed
        }
      }
    }
    
  } catch (error) {
    console.error("\n❌ Error batch minting ERC1155 tokens:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const collectionAddress = args[0];
  
  // Parse token IDs and amounts from command line
  let tokenIds = [];
  let amounts = [];
  let recipient = null;
  
  // Simple parsing: alternating tokenId and amount
  // Example: node batch-mint-erc1155.js 0x123... 1,2,3 10,20,30 0xRecipient
  if (args[1]) {
    tokenIds = args[1].split(',').map(id => parseInt(id));
  }
  if (args[2]) {
    amounts = args[2].split(',').map(amt => parseInt(amt));
  }
  if (args[3]) {
    recipient = args[3];
  }
  
  if (!collectionAddress) {
    console.error("Usage: node batch-mint-erc1155.js <collectionAddress> [tokenIds] [amounts] [recipient]");
    console.error("Example: node batch-mint-erc1155.js 0x123... 1,2,3 100,200,300");
    console.error("         This mints 100 of token #1, 200 of token #2, 300 of token #3");
    process.exit(1);
  }
  
  batchMintERC1155(collectionAddress, tokenIds, amounts, recipient)
    .then(() => {
      console.log("\n✨ Batch minting completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Batch minting failed:", error);
      process.exit(1);
    });
}

module.exports = { batchMintERC1155 };
