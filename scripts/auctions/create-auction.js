#!/usr/bin/env node

const { ethers } = require('ethers');
const { getProvider, getSigner, getMarketplaceHub } = require('../utils/config');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const prompt = (question) => new Promise((resolve) => rl.question(question, resolve));

async function createAuction() {
  console.log('🔨 NFT Auction Creation Tool\n');

  try {
    // Get network and signer
    const provider = await getProvider();
    const signer = await getSigner();
    const sellerAddress = await signer.getAddress();
    
    console.log(`📍 Connected to network: ${(await provider.getNetwork()).name}`);
    console.log(`👤 Your address: ${sellerAddress}\n`);

    // Get auction type
    console.log('Select auction type:');
    console.log('  1. English Auction (ascending bids)');
    console.log('  2. Dutch Auction (descending price)');
    const auctionTypeChoice = await prompt('Enter choice (1 or 2): ');
    const isEnglishAuction = auctionTypeChoice === '1';

    console.log(`\n✅ Selected: ${isEnglishAuction ? 'English' : 'Dutch'} Auction\n`);

    // Get NFT details
    const nftAddress = process.argv[2] || await prompt('Enter NFT contract address: ');
    const tokenId = process.argv[3] || await prompt('Enter token ID: ');

    // Check NFT ownership
    const nftContract = new ethers.Contract(
      nftAddress,
      [
        'function supportsInterface(bytes4) view returns (bool)',
        'function ownerOf(uint256) view returns (address)',
        'function balanceOf(address,uint256) view returns (uint256)',
        'function isApprovedForAll(address,address) view returns (bool)',
        'function setApprovalForAll(address,bool)',
        'function approve(address,uint256)',
      ],
      signer
    );

    let isERC721 = false;
    let isERC1155 = false;
    let amount = 1;

    try {
      isERC721 = await nftContract.supportsInterface('0x80ac58cd');
      isERC1155 = await nftContract.supportsInterface('0xd9b67a26');
    } catch (e) {
      try {
        await nftContract.ownerOf(tokenId);
        isERC721 = true;
      } catch {
        isERC1155 = true;
      }
    }

    if (isERC721) {
      console.log('✅ Detected ERC721 NFT');
      const owner = await nftContract.ownerOf(tokenId);
      if (owner.toLowerCase() !== sellerAddress.toLowerCase()) {
        throw new Error(`You don't own token ID ${tokenId}`);
      }
    } else if (isERC1155) {
      console.log('✅ Detected ERC1155 NFT');
      const balance = await nftContract.balanceOf(sellerAddress, tokenId);
      console.log(`   Your balance: ${balance}`);
      
      if (balance === 0n) {
        throw new Error(`You don't own any tokens of ID ${tokenId}`);
      }

      const amountStr = await prompt('Enter amount to auction (default: 1): ');
      amount = amountStr ? parseInt(amountStr) : 1;

      if (BigInt(amount) > balance) {
        throw new Error(`You only have ${balance} tokens, cannot auction ${amount}`);
      }
    }

    // Get auction parameters
    console.log('\n📝 Auction Parameters:');
    
    let startingPrice, endingPrice, reservePrice;
    
    if (isEnglishAuction) {
      const startingPriceEth = await prompt('Starting price (in ETH): ');
      startingPrice = ethers.parseEther(startingPriceEth);
      
      const reservePriceEth = await prompt('Reserve price (in ETH, 0 for none): ');
      reservePrice = reservePriceEth === '0' ? 0n : ethers.parseEther(reservePriceEth);
      
      if (reservePrice > 0n && reservePrice < startingPrice) {
        throw new Error('Reserve price must be higher than starting price');
      }
    } else {
      // Dutch auction
      const startingPriceEth = await prompt('Starting price (in ETH, high): ');
      startingPrice = ethers.parseEther(startingPriceEth);
      
      const endingPriceEth = await prompt('Ending price (in ETH, low): ');
      endingPrice = ethers.parseEther(endingPriceEth);
      
      if (endingPrice >= startingPrice) {
        throw new Error('Ending price must be lower than starting price');
      }
    }

    const durationDays = await prompt('Auction duration (in days): ');
    const duration = parseInt(durationDays) * 24 * 60 * 60; // Convert to seconds

    // Display summary
    console.log('\n📋 Auction Summary:');
    console.log(`   Type: ${isEnglishAuction ? 'English' : 'Dutch'} Auction`);
    console.log(`   NFT Contract: ${nftAddress}`);
    console.log(`   Token ID: ${tokenId}`);
    if (amount > 1) {
      console.log(`   Amount: ${amount}`);
    }
    
    if (isEnglishAuction) {
      console.log(`   Starting Bid: ${ethers.formatEther(startingPrice)} ETH`);
      if (reservePrice > 0n) {
        console.log(`   Reserve Price: ${ethers.formatEther(reservePrice)} ETH`);
      }
    } else {
      console.log(`   Starting Price: ${ethers.formatEther(startingPrice)} ETH`);
      console.log(`   Ending Price: ${ethers.formatEther(endingPrice)} ETH`);
    }
    console.log(`   Duration: ${durationDays} days\n`);

    // Initialize MarketplaceHub
    const hub = await getMarketplaceHub();
    const { addresses } = hub;
    
    // Get auction factory address
    const auctionFactoryAddress = addresses.auctionFactory;
    console.log(`   Auction Factory: ${auctionFactoryAddress}\n`);

    // Check approval for auction factory
    console.log('🔐 Checking approval status...');
    
    if (isERC721) {
      // For ERC721, we need to approve the specific token
      const approvedAddress = await nftContract.getApproved(tokenId);
      if (approvedAddress.toLowerCase() !== auctionFactoryAddress.toLowerCase()) {
        console.log('   ❌ Not approved. Approving auction factory...');
        const approveTx = await nftContract.approve(auctionFactoryAddress, tokenId);
        console.log(`   ⏳ Approval tx: ${approveTx.hash}`);
        await approveTx.wait();
        console.log('   ✅ Auction factory approved!\n');
      } else {
        console.log('   ✅ Already approved!\n');
      }
    } else {
      // For ERC1155, use setApprovalForAll
      const isApproved = await nftContract.isApprovedForAll(sellerAddress, auctionFactoryAddress);
      if (!isApproved) {
        console.log('   ❌ Not approved. Approving auction factory...');
        const approveTx = await nftContract.setApprovalForAll(auctionFactoryAddress, true);
        console.log(`   ⏳ Approval tx: ${approveTx.hash}`);
        await approveTx.wait();
        console.log('   ✅ Auction factory approved!\n');
      } else {
        console.log('   ✅ Already approved!\n');
      }
    }

    // Create auction through factory
    const auctionFactory = new ethers.Contract(
      auctionFactoryAddress,
      [
        'function createEnglishAuction(address,uint256,uint256,uint256,uint256,uint256) returns (bytes32)',
        'function createDutchAuction(address,uint256,uint256,uint256,uint256,uint256) returns (bytes32)',
        'event AuctionCreated(bytes32,uint8,address,address,uint256,uint256,uint256)',
      ],
      signer
    );

    console.log('📤 Creating auction...');
    
    let tx;
    if (isEnglishAuction) {
      tx = await auctionFactory.createEnglishAuction(
        nftAddress,
        tokenId,
        amount,
        startingPrice,
        reservePrice || 0n,
        duration
      );
    } else {
      tx = await auctionFactory.createDutchAuction(
        nftAddress,
        tokenId,
        amount,
        startingPrice,
        endingPrice,
        duration
      );
    }

    console.log(`   ⏳ Transaction: ${tx.hash}`);
    const receipt = await tx.wait();

    // Extract auction ID from events
    const auctionEvent = receipt.logs.find(
      log => log.topics[0] === ethers.id('AuctionCreated(bytes32,uint8,address,address,uint256,uint256,uint256)')
    );

    if (auctionEvent) {
      const auctionId = auctionEvent.topics[1];
      console.log(`\n✅ Auction Created Successfully!`);
      console.log(`   Auction ID: ${auctionId}`);
      console.log(`   Type: ${isEnglishAuction ? 'English' : 'Dutch'} Auction`);
      
      const endTime = new Date(Date.now() + duration * 1000);
      console.log(`   Ends: ${endTime.toLocaleString()}`);
      
      if (isEnglishAuction) {
        console.log(`\n💡 Next steps:`);
        console.log(`   - Share the auction ID with potential bidders`);
        console.log(`   - Bidders can place bids using the bid script`);
        console.log(`   - Auction will end automatically after ${durationDays} days`);
        if (reservePrice > 0n) {
          console.log(`   - Reserve price must be met for sale to complete`);
        }
      } else {
        console.log(`\n💡 Next steps:`);
        console.log(`   - Price will decrease linearly over ${durationDays} days`);
        console.log(`   - Anyone can buy at the current price`);
        console.log(`   - Auction ends when someone buys or time expires`);
      }
    } else {
      console.log(`\n✅ Auction Created Successfully!`);
      console.log(`   Transaction: ${tx.hash}`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.data) {
      console.error('   Error data:', error.data);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
createAuction().catch(console.error);
