#!/usr/bin/env node

const { ethers } = require('ethers');
const { getProvider, getSigner, getMarketplaceHub } = require('../utils/config');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const prompt = (question) => new Promise((resolve) => rl.question(question, resolve));

async function createOffer() {
  console.log('💸 NFT Offer Creation Tool\n');

  try {
    // Get network and signer
    const provider = await getProvider();
    const signer = await getSigner();
    const offererAddress = await signer.getAddress();
    
    console.log(`📍 Connected to network: ${(await provider.getNetwork()).name}`);
    console.log(`👤 Your address: ${offererAddress}\n`);

    // Get offer type
    console.log('Select offer type:');
    console.log('  1. NFT Offer (specific token)');
    console.log('  2. Collection Offer (any token in collection)');
    console.log('  3. Trait Offer (tokens with specific traits)');
    
    const offerType = await prompt('Enter choice (1, 2, or 3): ');

    // Initialize MarketplaceHub
    const hub = await getMarketplaceHub();
    const { addresses } = hub;
    const offerManagerAddress = addresses.offerManager;
    
    const offerManager = new ethers.Contract(
      offerManagerAddress,
      [
        'function createNFTOffer(address,uint256,uint256,uint256) payable returns (bytes32)',
        'function createCollectionOffer(address,address,uint256,uint256,uint256) payable returns (bytes32)',
        'function createTraitOffer(address,string,string,address,uint256,uint256,uint256) payable returns (bytes32)',
        'event NFTOfferCreated(bytes32,address,address,uint256,uint256,address,uint256)',
        'event CollectionOfferCreated(bytes32,address,address,uint256,uint256,address,uint256)',
        'event TraitOfferCreated(bytes32,address,address,string,string,uint256,uint256,address,uint256)',
      ],
      signer
    );

    let tx, offerValue;

    if (offerType === '1') {
      // NFT Offer
      console.log('\n📝 NFT Offer Details:');
      
      const nftAddress = await prompt('Enter NFT contract address: ');
      const tokenId = await prompt('Enter token ID: ');
      const offerAmountEth = await prompt('Enter offer amount (in ETH): ');
      const durationDays = await prompt('Offer duration (in days): ');
      
      const offerAmount = ethers.parseEther(offerAmountEth);
      const duration = parseInt(durationDays) * 24 * 60 * 60;
      
      // Check if NFT exists and get owner
      const nftContract = new ethers.Contract(
        nftAddress,
        ['function ownerOf(uint256) view returns (address)'],
        provider
      );
      
      let currentOwner;
      try {
        currentOwner = await nftContract.ownerOf(tokenId);
      } catch {
        console.log('⚠️  Warning: Could not verify NFT ownership');
      }
      
      console.log('\n📋 Offer Summary:');
      console.log(`   NFT Contract: ${nftAddress}`);
      console.log(`   Token ID: ${tokenId}`);
      if (currentOwner) {
        console.log(`   Current Owner: ${currentOwner}`);
      }
      console.log(`   Offer Amount: ${offerAmountEth} ETH`);
      console.log(`   Duration: ${durationDays} days`);
      
      const expirationDate = new Date(Date.now() + duration * 1000);
      console.log(`   Expires: ${expirationDate.toLocaleString()}\n`);
      
      // Check balance
      const balance = await provider.getBalance(offererAddress);
      if (balance < offerAmount) {
        throw new Error(`Insufficient balance. You have ${ethers.formatEther(balance)} ETH`);
      }
      
      // Confirm offer
      const confirm = await prompt('Confirm offer creation? (yes/no): ');
      if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
        console.log('Offer cancelled.');
        process.exit(0);
      }
      
      console.log('\n📤 Creating NFT offer...');
      tx = await offerManager.createNFTOffer(
        nftAddress,
        tokenId,
        offerAmount,
        duration,
        { value: offerAmount }
      );
      
      offerValue = offerAmount;
      
    } else if (offerType === '2') {
      // Collection Offer
      console.log('\n📝 Collection Offer Details:');
      
      const collectionAddress = await prompt('Enter collection address: ');
      const pricePerNftEth = await prompt('Enter price per NFT (in ETH): ');
      const quantity = await prompt('How many NFTs do you want? (max 100): ');
      const durationDays = await prompt('Offer duration (in days): ');
      
      const pricePerNft = ethers.parseEther(pricePerNftEth);
      const totalAmount = pricePerNft * BigInt(quantity);
      const duration = parseInt(durationDays) * 24 * 60 * 60;
      const expiration = Math.floor(Date.now() / 1000) + duration;
      
      if (parseInt(quantity) > 100) {
        throw new Error('Maximum quantity is 100 NFTs');
      }
      
      // Get collection info
      const collectionContract = new ethers.Contract(
        collectionAddress,
        [
          'function name() view returns (string)',
          'function symbol() view returns (string)',
          'function totalSupply() view returns (uint256)',
        ],
        provider
      );
      
      let collectionName, collectionSymbol, totalSupply;
      try {
        collectionName = await collectionContract.name();
        collectionSymbol = await collectionContract.symbol();
        totalSupply = await collectionContract.totalSupply();
      } catch {
        console.log('⚠️  Warning: Could not fetch collection details');
      }
      
      console.log('\n📋 Collection Offer Summary:');
      console.log(`   Collection: ${collectionAddress}`);
      if (collectionName) {
        console.log(`   Name: ${collectionName} (${collectionSymbol})`);
        console.log(`   Total Supply: ${totalSupply}`);
      }
      console.log(`   Price per NFT: ${pricePerNftEth} ETH`);
      console.log(`   Quantity: ${quantity} NFTs`);
      console.log(`   Total Offer: ${ethers.formatEther(totalAmount)} ETH`);
      console.log(`   Duration: ${durationDays} days\n`);
      
      // Check balance
      const balance = await provider.getBalance(offererAddress);
      if (balance < totalAmount) {
        throw new Error(`Insufficient balance. You have ${ethers.formatEther(balance)} ETH but need ${ethers.formatEther(totalAmount)} ETH`);
      }
      
      // Confirm offer
      const confirm = await prompt('Confirm collection offer? (yes/no): ');
      if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
        console.log('Offer cancelled.');
        process.exit(0);
      }
      
      console.log('\n📤 Creating collection offer...');
      tx = await offerManager.createCollectionOffer(
        collectionAddress,
        ethers.ZeroAddress, // ETH payment
        pricePerNft,
        quantity,
        expiration,
        { value: totalAmount }
      );
      
      offerValue = totalAmount;
      
    } else if (offerType === '3') {
      // Trait Offer
      console.log('\n📝 Trait-Based Offer Details:');
      
      const collectionAddress = await prompt('Enter collection address: ');
      const traitType = await prompt('Enter trait type (e.g., "Background"): ');
      const traitValue = await prompt('Enter trait value (e.g., "Blue"): ');
      const pricePerNftEth = await prompt('Enter price per NFT (in ETH): ');
      const quantity = await prompt('How many NFTs with this trait? (max 50): ');
      const durationDays = await prompt('Offer duration (in days): ');
      
      const pricePerNft = ethers.parseEther(pricePerNftEth);
      const totalAmount = pricePerNft * BigInt(quantity);
      const duration = parseInt(durationDays) * 24 * 60 * 60;
      const expiration = Math.floor(Date.now() / 1000) + duration;
      
      if (parseInt(quantity) > 50) {
        throw new Error('Maximum quantity is 50 NFTs for trait offers');
      }
      
      console.log('\n📋 Trait Offer Summary:');
      console.log(`   Collection: ${collectionAddress}`);
      console.log(`   Trait: ${traitType} = ${traitValue}`);
      console.log(`   Price per NFT: ${pricePerNftEth} ETH`);
      console.log(`   Quantity: ${quantity} NFTs`);
      console.log(`   Total Offer: ${ethers.formatEther(totalAmount)} ETH`);
      console.log(`   Duration: ${durationDays} days\n`);
      
      // Check balance
      const balance = await provider.getBalance(offererAddress);
      if (balance < totalAmount) {
        throw new Error(`Insufficient balance. You have ${ethers.formatEther(balance)} ETH but need ${ethers.formatEther(totalAmount)} ETH`);
      }
      
      // Confirm offer
      const confirm = await prompt('Confirm trait offer? (yes/no): ');
      if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
        console.log('Offer cancelled.');
        process.exit(0);
      }
      
      console.log('\n📤 Creating trait-based offer...');
      tx = await offerManager.createTraitOffer(
        collectionAddress,
        traitType,
        traitValue,
        ethers.ZeroAddress, // ETH payment
        pricePerNft,
        quantity,
        expiration,
        { value: totalAmount }
      );
      
      offerValue = totalAmount;
      
    } else {
      throw new Error('Invalid offer type selection');
    }

    console.log(`   ⏳ Transaction: ${tx.hash}`);
    const receipt = await tx.wait();

    // Extract offer ID from events
    let offerId;
    const eventTypes = ['NFTOfferCreated', 'CollectionOfferCreated', 'TraitOfferCreated'];
    
    for (const eventType of eventTypes) {
      const event = receipt.logs.find(
        log => log.topics[0] === ethers.id(`${eventType}(bytes32,address,address,uint256,uint256,address,uint256)`) ||
               log.topics[0] === ethers.id(`${eventType}(bytes32,address,address,string,string,uint256,uint256,address,uint256)`)
      );
      
      if (event) {
        offerId = event.topics[1];
        break;
      }
    }

    console.log('\n✅ Offer Created Successfully!');
    if (offerId) {
      console.log(`   Offer ID: ${offerId}`);
    }
    console.log(`   Transaction: ${tx.hash}`);
    console.log(`   ETH Locked: ${ethers.formatEther(offerValue)} ETH`);
    
    console.log('\n💡 Next steps:');
    if (offerType === '1') {
      console.log('   - The NFT owner can accept your offer');
      console.log('   - You can cancel the offer anytime before acceptance');
      console.log('   - ETH will be refunded if offer expires or is cancelled');
    } else if (offerType === '2') {
      console.log('   - Any holder in the collection can accept your offer');
      console.log('   - Multiple NFTs can be sold to fulfill your quantity');
      console.log('   - Unused ETH will be refunded when offer expires');
    } else {
      console.log('   - Holders with matching traits can accept your offer');
      console.log('   - Trait verification happens on-chain');
      console.log('   - Unused ETH will be refunded when offer expires');
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
createOffer().catch(console.error);
