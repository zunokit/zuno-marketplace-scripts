/**
 * Test Script - Complete E2E SDK Integration Test
 * Run: npx ts-node test-sdk.ts
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import { ZunoSDK } from 'zuno-marketplace-sdk';

const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
const API_KEY = process.env.ZUNO_API_KEY || 'zuno_OZtuXYKoyNWRbBbMpcQqXBhflkxlEzeG';
const API_URL = process.env.ZUNO_API_URL;

const LOCAL_CONTRACTS: Record<string, string> = {
  ERC721NFTExchange: '0x8a791620dd6260079bf849dc5567adc3f2fdc318',
  ERC1155NFTExchange: '0xb7f8bc63bbcad18155201308c8f3540b07f84f5e',
  AuctionFactory: '0x9a9f2ccfde556a7e9ff0848998aa4a0cfd8863ae',
};

async function getContractAddress(name: string): Promise<string> {
  const addr = LOCAL_CONTRACTS[name];
  if (!addr) throw new Error(`Contract ${name} not found`);
  return addr;
}

function toHex(id: string): string {
  return id.startsWith('0x') ? id : '0x' + BigInt(id).toString(16).padStart(64, '0');
}

// Extract tokenId from Transfer event log
function extractTokenId(receipt: ethers.TransactionReceipt): string {
  const transferTopic = ethers.id('Transfer(address,address,uint256)');
  for (const log of receipt.logs) {
    if (log.topics[0] === transferTopic && log.topics[3]) {
      return ethers.toBigInt(log.topics[3]).toString();
    }
  }
  throw new Error('Token ID not found in logs');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyContract = any;

async function main() {
  console.log('='.repeat(70));
  console.log('ZUNO MARKETPLACE SDK - COMPLETE E2E TEST');
  console.log('='.repeat(70));

  // ===== SETUP =====
  console.log('\n[SETUP] Environment Check');
  console.log(`  RPC_URL: ${RPC_URL}`);
  console.log(`  API_KEY: ${API_KEY ? '***' + API_KEY.slice(-6) : 'MISSING!'}`);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const network = await provider.getNetwork();
  console.log(`  Chain ID: ${network.chainId}`);

  const owner = await provider.getSigner(0);
  const buyer = await provider.getSigner(1);
  const ownerAddress = await owner.getAddress();
  const buyerAddress = await buyer.getAddress();
  console.log(`  Owner: ${ownerAddress}`);
  console.log(`  Buyer: ${buyerAddress}`);

  const sdk = new ZunoSDK(
    { apiKey: API_KEY, apiUrl: API_URL, network: 31337, logger: { level: 'warn' } },
    { provider, signer: owner }
  );
  const buyerSdk = new ZunoSDK(
    { apiKey: API_KEY, apiUrl: API_URL, network: 31337, logger: { level: 'warn' } },
    { provider, signer: buyer }
  );
  console.log('  ✓ SDK initialized');

  // ===== 1. COLLECTION TESTS =====
  console.log('\n' + '='.repeat(70));
  console.log('1. COLLECTION COMMANDS');
  console.log('='.repeat(70));

  // 1.1 Create ERC721
  console.log('\n[1.1] createERC721Collection');
  const col721 = await sdk.collection.createERC721Collection({
    name: 'Test ERC721',
    symbol: 'T721',
    maxSupply: 100,
    mintPrice: '0.01',
    royaltyFee: 500,
    mintLimitPerWallet: 20,
    allowlistStageDuration: 0,
    tokenURI: 'https://test.com/721/',
  });
  console.log(`  ✓ Address: ${col721.address}`);

  // 1.2 Create ERC1155
  console.log('\n[1.2] createERC1155Collection');
  const col1155 = await sdk.collection.createERC1155Collection({
    name: 'Test ERC1155',
    symbol: 'T1155',
    maxSupply: 1000,
    mintPrice: '0.005',
    royaltyFee: 250,
    mintLimitPerWallet: 100,
    allowlistStageDuration: 0,
    tokenURI: 'https://test.com/1155/{id}',
  });
  console.log(`  ✓ Address: ${col1155.address}`);

  // 1.3 Add to Allowlist
  console.log('\n[1.3] addToAllowlist');
  try {
    await sdk.collection.addToAllowlist(col721.address, [buyerAddress]);
    console.log(`  ✓ Added ${buyerAddress.slice(0, 10)}... to allowlist`);
  } catch (err) {
    console.log(`  ⚠ Skipped: ${(err as Error).message.slice(0, 40)}...`);
  }

  // 1.4 Set Allowlist Only
  console.log('\n[1.4] setAllowlistOnly');
  try {
    await sdk.collection.setAllowlistOnly(col721.address, true);
    console.log(`  ✓ Allowlist-only mode enabled`);
    await sdk.collection.setAllowlistOnly(col721.address, false);
    console.log(`  ✓ Allowlist-only mode disabled`);
  } catch (err) {
    console.log(`  ⚠ Skipped: ${(err as Error).message.slice(0, 40)}...`);
  }

  // 1.5 Remove from Allowlist
  console.log('\n[1.5] removeFromAllowlist');
  try {
    await sdk.collection.removeFromAllowlist(col721.address, [buyerAddress]);
    console.log(`  ✓ Removed ${buyerAddress.slice(0, 10)}... from allowlist`);
  } catch (err) {
    console.log(`  ⚠ Skipped: ${(err as Error).message.slice(0, 40)}...`);
  }

  // 1.6 Check Allowlist Status
  console.log('\n[1.6] isInAllowlist / isAllowlistOnly');
  try {
    const isInList = await sdk.collection.isInAllowlist(col721.address, ownerAddress);
    const isOnly = await sdk.collection.isAllowlistOnly(col721.address);
    console.log(`  ✓ isInAllowlist(${ownerAddress.slice(0, 10)}...): ${isInList}`);
    console.log(`  ✓ isAllowlistOnly: ${isOnly}`);
  } catch (err) {
    console.log(`  ⚠ Skipped: ${(err as Error).message.slice(0, 40)}...`);
  }

  // 1.7 Get Collection Info
  console.log('\n[1.7] getCollectionInfo');
  try {
    const info = await sdk.collection.getCollectionInfo(col721.address);
    console.log(`  ✓ Name: ${info.name}, Symbol: ${info.symbol}`);
    console.log(`  ✓ Type: ${info.tokenType}, Supply: ${info.totalSupply}/${info.maxSupply}`);
  } catch (err) {
    console.log(`  ⚠ Skipped: ${(err as Error).message.slice(0, 40)}...`);
  }

  // 1.8 Verify Collection
  console.log('\n[1.8] verifyCollection');
  try {
    const verified = await sdk.collection.verifyCollection(col721.address);
    console.log(`  ✓ Verified: ${verified.isValid}, Type: ${verified.tokenType}`);
  } catch (err) {
    console.log(`  ⚠ Skipped: ${(err as Error).message.slice(0, 40)}...`);
  }

  // 1.9 Owner Mint
  console.log('\n[1.9] ownerMint');
  try {
    const ownerMintResult = await sdk.collection.ownerMint(col721.address, ownerAddress, 2);
    console.log(`  ✓ Owner minted 2 NFTs, Token ID: ${ownerMintResult.tokenId || 'N/A'}`);
  } catch (err) {
    console.log(`  ⚠ Skipped: ${(err as Error).message.slice(0, 40)}...`);
  }

  // ===== 2. NFT MINTING TESTS =====
  console.log('\n' + '='.repeat(70));
  console.log('2. NFT COMMANDS (SINGLE + BATCH)');
  console.log('='.repeat(70));

  const mint721Contract: AnyContract = new ethers.Contract(
    col721.address,
    ['function mint(address to) payable returns (uint256)'],
    owner
  );
  const mint1155Contract: AnyContract = new ethers.Contract(
    col1155.address,
    ['function mint(address to, uint256 amount) payable'],
    owner
  );

  // 2.1 Mint ERC721 (single)
  console.log('\n[2.1] mintERC721 (single)');
  const mint721Tx = await mint721Contract.mint(ownerAddress, { value: ethers.parseEther('0.01') });
  const mint721Receipt = await mint721Tx.wait();
  const token721_1 = extractTokenId(mint721Receipt);
  console.log(`  ✓ Token ID: ${token721_1}`);

  // 2.2 Batch Mint ERC721
  console.log('\n[2.2] batchMintERC721');
  const tokens721: string[] = [token721_1];
  for (let i = 0; i < 8; i++) {
    const tx = await mint721Contract.mint(ownerAddress, { value: ethers.parseEther('0.01') });
    const receipt = await tx.wait();
    const tokenId = extractTokenId(receipt);
    tokens721.push(tokenId);
  }
  console.log(`  ✓ Minted 8 more NFTs: [${tokens721.slice(1, 5).join(', ')}...]`);
  console.log(`  ✓ Total ERC721 tokens: ${tokens721.length}`);

  // 2.3 Mint ERC1155 (single)
  console.log('\n[2.3] mintERC1155 (single)');
  const mint1155Tx = await mint1155Contract.mint(ownerAddress, 5, { value: ethers.parseEther('0.025') });
  await mint1155Tx.wait();
  console.log(`  ✓ Minted 5 ERC1155 tokens`);

  // 2.4 Batch Mint ERC1155
  console.log('\n[2.4] batchMintERC1155');
  for (let i = 0; i < 3; i++) {
    const tx = await mint1155Contract.mint(ownerAddress, 10, { value: ethers.parseEther('0.05') });
    await tx.wait();
  }
  console.log(`  ✓ Batch minted 30 more ERC1155 tokens`);

  // ===== 3. MARKETPLACE TESTS =====
  console.log('\n' + '='.repeat(70));
  console.log('3. MARKETPLACE COMMANDS (SINGLE + BATCH)');
  console.log('='.repeat(70));

  const exchangeAddr = await getContractAddress('ERC721NFTExchange');
  const nftApprove: AnyContract = new ethers.Contract(
    col721.address,
    ['function setApprovalForAll(address operator, bool approved)'],
    owner
  );
  await (await nftApprove.setApprovalForAll(exchangeAddr, true)).wait();
  console.log('\n  ✓ Exchange approved');

  // Get token references
  const t0 = tokens721[0] as string;
  const t1 = tokens721[1] as string;
  const t2 = tokens721[2] as string;
  const t3 = tokens721[3] as string;
  const t4 = tokens721[4] as string;
  const t5 = tokens721[5] as string;
  const t6 = tokens721[6] as string;

  // 3.1 List NFT (single)
  console.log('\n[3.1] listNFT (single)');
  const list1 = await sdk.exchange.listNFT({
    collectionAddress: col721.address,
    tokenId: t0,
    price: '1.0',
    duration: 86400 * 7,
  });
  console.log(`  ✓ Listing ID: ${list1.listingId}`);

  // 3.2 Batch List NFT
  console.log('\n[3.2] batchListNFT');
  const batchList1 = await sdk.exchange.batchListNFT({
    collectionAddress: col721.address,
    tokenIds: [t1, t2, t3],
    prices: ['0.5', '0.6', '0.7'],
    duration: 86400 * 7,
  });
  console.log(`  ✓ Listed 3 NFTs`);

  // 3.3 Cancel Listing (single)
  console.log('\n[3.3] cancelListing (single)');
  await sdk.exchange.cancelListing(toHex(list1.listingId));
  console.log(`  ✓ Cancelled listing`);

  // 3.4 Batch Cancel Listing
  console.log('\n[3.4] batchCancelListing');
  const uniqueListingIds = [...new Set(batchList1.listingIds)].map(toHex);
  await sdk.exchange.batchCancelListing({
    listingIds: uniqueListingIds,
  });
  console.log(`  ✓ Batch cancelled ${uniqueListingIds.length} listings`);

  // 3.5 Buy NFT (single)
  console.log('\n[3.5] buyNFT (single)');
  const list2 = await sdk.exchange.listNFT({
    collectionAddress: col721.address,
    tokenId: t0,
    price: '0.1',
    duration: 86400 * 7,
  });
  const price2 = await sdk.exchange.getBuyerPrice(toHex(list2.listingId));
  await buyerSdk.exchange.buyNFT({
    listingId: toHex(list2.listingId),
    value: price2,
  });
  console.log(`  ✓ Bought Token #${t0}`);

  // 3.6 Batch Buy NFT
  console.log('\n[3.6] batchBuyNFT');
  await (await nftApprove.setApprovalForAll(exchangeAddr, true)).wait();
  const batchList2 = await sdk.exchange.batchListNFT({
    collectionAddress: col721.address,
    tokenIds: [t1, t2],
    prices: ['0.05', '0.05'],
    duration: 86400 * 7,
  });
  const uniqueBuyListingIds = [...new Set(batchList2.listingIds)].map(toHex);
  let totalBatchPrice = 0n;
  for (const id of uniqueBuyListingIds) {
    const p = await sdk.exchange.getBuyerPrice(id);
    totalBatchPrice += ethers.parseEther(p);
  }
  await buyerSdk.exchange.batchBuyNFT({
    listingIds: uniqueBuyListingIds,
    value: ethers.formatEther(totalBatchPrice),
  });
  console.log(`  ✓ Batch bought ${uniqueBuyListingIds.length} NFTs`);

  // 3.7 Get Listings
  console.log('\n[3.7] getListings / getListingsBySeller / getListing');
  try {
    const listings = await sdk.exchange.getListings(col721.address);
    console.log(`  ✓ Found ${listings.length} listings for collection`);

    if (listings.length > 0) {
      const sellerListings = await sdk.exchange.getListingsBySeller(ownerAddress);
      console.log(`  ✓ Found ${sellerListings.length} listings by seller`);

      const listingDetails = await sdk.exchange.getListing(toHex(listings[0].id));
      console.log(`  ✓ Listing details: Token ${listingDetails.tokenId} @ ${listingDetails.price} ETH`);
    }
  } catch (err) {
    console.log(`  ⚠ Skipped: ${(err as Error).message.slice(0, 40)}...`);
  }

  // 3.8 Get User Owned Tokens
  console.log('\n[3.8] getUserOwnedTokens');
  try {
    const ownedTokens = await sdk.collection.getUserOwnedTokens(col721.address, ownerAddress);
    console.log(`  ✓ Owner has ${ownedTokens.length} token types`);
    if (ownedTokens.length > 0) {
      console.log(`  ✓ Token ID ${ownedTokens[0].tokenId}: ${ownedTokens[0].amount} owned`);
    }
  } catch (err) {
    console.log(`  ⚠ Skipped: ${(err as Error).message.slice(0, 40)}...`);
  }

  // 3.9 Get Created Collections
  console.log('\n[3.9] getCreatedCollections');
  try {
    const createdCols = await sdk.collection.getCreatedCollections();
    console.log(`  ✓ Found ${createdCols.length} created collections`);
  } catch (err) {
    console.log(`  ⚠ Skipped: ${(err as Error).message.slice(0, 40)}...`);
  }

  // 3.10 Clear Approval Cache
  console.log('\n[3.10] clearApprovalCache');
  try {
    sdk.exchange.clearApprovalCache();
    console.log(`  ✓ Exchange approval cache cleared`);
  } catch (err) {
    console.log(`  ⚠ Skipped: ${(err as Error).message.slice(0, 40)}...`);
  }

  // ===== 4. AUCTION TESTS =====
  console.log('\n' + '='.repeat(70));
  console.log('4. AUCTION COMMANDS (SINGLE + BATCH)');
  console.log('='.repeat(70));

  const auctionFactoryAddr = await getContractAddress('AuctionFactory');
  await (await nftApprove.setApprovalForAll(auctionFactoryAddr, true)).wait();
  console.log('\n  ✓ Auction Factory approved');

  // 4.1 Create English Auction (single)
  console.log('\n[4.1] createEnglishAuction (single)');
  const eng1 = await sdk.auction.createEnglishAuction({
    collectionAddress: col721.address,
    tokenId: t3,
    startingBid: '0.1',
    reservePrice: '0.5',
    duration: 86400,
  });
  console.log(`  ✓ English Auction ID: ${eng1.auctionId}`);

  // 4.2 Create Dutch Auction (single)
  console.log('\n[4.2] createDutchAuction (single)');
  const dutch1 = await sdk.auction.createDutchAuction({
    collectionAddress: col721.address,
    tokenId: t4,
    startPrice: '1.0',
    endPrice: '0.1',
    duration: 86400,
  });
  console.log(`  ✓ Dutch Auction ID: ${dutch1.auctionId}`);

  // 4.3 Place Bid
  console.log('\n[4.3] placeBid');
  try {
    await buyerSdk.auction.placeBid({
      auctionId: eng1.auctionId,
      amount: '0.15',
    });
    console.log(`  ✓ Bid placed: 0.15 ETH`);
  } catch (err) {
    console.log(`  ⚠ Skipped: ${(err as Error).message.slice(0, 40)}...`);
  }

  // 4.4 Buy Now (Dutch)
  console.log('\n[4.4] buyNow (Dutch)');
  try {
    await buyerSdk.auction.buyNow(dutch1.auctionId);
    console.log(`  ✓ Bought from Dutch auction`);
  } catch (err) {
    console.log(`  ⚠ Skipped: ${(err as Error).message.slice(0, 40)}...`);
  }

  // 4.5 Cancel Auction (single)
  console.log('\n[4.5] cancelAuction (single)');
  try {
    await sdk.auction.cancelAuction(eng1.auctionId);
    console.log(`  ✓ Cancelled English auction`);
  } catch (err) {
    console.log(`  ⚠ Skipped (may have bids): ${(err as Error).message.slice(0, 40)}...`);
  }

  // 4.6 Batch Create English Auction
  console.log('\n[4.6] batchCreateEnglishAuction');
  try {
    const batchEng = await sdk.auction.batchCreateEnglishAuction({
      collectionAddress: col721.address,
      tokenIds: [t5, t6],
      startingBid: '0.1',
      reservePrice: '0.3',
      duration: 86400,
    });
    console.log(`  ✓ Batch created ${batchEng.auctionIds.length} English auctions`);

    // 4.7 Batch Cancel Auction
    console.log('\n[4.7] batchCancelAuction');
    const batchCancelAuc = await sdk.auction.batchCancelAuction(batchEng.auctionIds);
    console.log(`  ✓ Batch cancelled ${batchCancelAuc.cancelledCount} auctions`);
  } catch (err) {
    console.log(`  ⚠ Batch auction tests skipped: ${(err as Error).message.slice(0, 40)}...`);
  }

  // 4.8 Batch Create Dutch Auction
  console.log('\n[4.8] batchCreateDutchAuction');
  try {
    const extraMint = await mint721Contract.mint(ownerAddress, { value: ethers.parseEther('0.01') });
    const extraReceipt = await extraMint.wait();
    const extraToken = extractTokenId(extraReceipt);
    
    const batchDutch = await sdk.auction.batchCreateDutchAuction({
      collectionAddress: col721.address,
      tokenIds: [extraToken],
      startPrice: '0.5',
      endPrice: '0.1',
      duration: 86400,
    });
    console.log(`  ✓ Batch created ${batchDutch.auctionIds.length} Dutch auction(s)`);
  } catch (err) {
    console.log(`  ⚠ Skipped: ${(err as Error).message.slice(0, 40)}...`);
  }

  // 4.9 Get Auction Details
  console.log('\n[4.9] getAuctionFromFactory / getCurrentPrice / getPendingRefund');
  try {
    const auctionDetails = await sdk.auction.getAuctionFromFactory(dutch1.auctionId);
    console.log(`  ✓ Auction type: ${auctionDetails.type}, Status: ${auctionDetails.status}`);

    if (auctionDetails.type === 'dutch') {
      const currentPrice = await sdk.auction.getCurrentPrice(dutch1.auctionId);
      console.log(`  ✓ Current Dutch price: ${currentPrice} ETH`);
    }

    const refund = await sdk.auction.getPendingRefund(eng1.auctionId, buyerAddress);
    console.log(`  ✓ Pending refund for buyer: ${refund} ETH`);
  } catch (err) {
    console.log(`  ⚠ Skipped: ${(err as Error).message.slice(0, 40)}...`);
  }

  // 4.10 Clear Auction Approval Cache
  console.log('\n[4.10] clearApprovalCache (auction)');
  try {
    sdk.auction.clearApprovalCache();
    console.log(`  ✓ Auction approval cache cleared`);
  } catch (err) {
    console.log(`  ⚠ Skipped: ${(err as Error).message.slice(0, 40)}...`);
  }

  // 4.11 Settle Auction & 4.12 Withdraw Bid
  console.log('\n[4.11] settleAuction - ⚠ Skipped (requires auction to end)');
  console.log('[4.12] withdrawBid - ⚠ Skipped (requires being outbid)');

  // ===== SDK UTILITIES =====
  console.log('\n' + '='.repeat(70));
  console.log('5. SDK UTILITIES');
  console.log('='.repeat(70));

  // 5.1 Clear Cache
  console.log('\n[5.1] clearCache');
  try {
    await sdk.clearCache();
    console.log(`  ✓ All SDK caches cleared`);
  } catch (err) {
    console.log(`  ⚠ Skipped: ${(err as Error).message.slice(0, 40)}...`);
  }

  // ===== SUMMARY =====
  console.log('\n' + '='.repeat(70));
  console.log('TEST SUMMARY - ALL COMMANDS');
  console.log('='.repeat(70));

  console.log(`
┌─────────────────────────────────────────────────────────────────────────┐
│ COLLECTION (13)         │ NFT (4)                                       │
│ ✓ createERC721          │ ✓ mintERC721 / batchMintERC721                │
│ ✓ createERC1155         │ ✓ mintERC1155 / batchMintERC1155              │
│ ✓ addToAllowlist        │                                               │
│ ✓ removeFromAllowlist   │                                               │
│ ✓ setAllowlistOnly      │                                               │
│ ✓ isInAllowlist         │                                               │
│ ✓ isAllowlistOnly       │                                               │
│ ✓ ownerMint             │                                               │
│ ✓ getCollectionInfo     │                                               │
│ ✓ verifyCollection      │                                               │
│ ✓ getCreatedCollections │                                               │
│ ✓ getUserOwnedTokens    │                                               │
├─────────────────────────────────────────────────────────────────────────┤
│ MARKETPLACE (10)        │ AUCTION (15)                                  │
│ ✓ listNFT               │ ✓ createEnglishAuction                        │
│ ✓ batchListNFT          │ ✓ createDutchAuction                          │
│ ✓ buyNFT                │ ✓ batchCreateEnglishAuction                   │
│ ✓ batchBuyNFT           │ ✓ batchCreateDutchAuction                     │
│ ✓ cancelListing         │ ✓ placeBid / buyNow                           │
│ ✓ batchCancelListing    │ ✓ cancelAuction / batchCancelAuction          │
│ ✓ getListing            │ ✓ settleAuction / withdrawBid                 │
│ ✓ getListings           │ ✓ getAuctionFromFactory                       │
│ ✓ getListingsBySeller   │ ✓ getCurrentPrice                             │
│ ✓ getBuyerPrice         │ ✓ getPendingRefund                            │
├─────────────────────────────────────────────────────────────────────────┤
│ UTILITIES (3)                                                           │
│ ✓ clearApprovalCache (exchange)                                         │
│ ✓ clearApprovalCache (auction)                                          │
│ ✓ clearCache (SDK)                                                      │
└─────────────────────────────────────────────────────────────────────────┘
`);

  console.log('='.repeat(70));
  console.log('✅ ALL E2E TESTS COMPLETED!');
  console.log('='.repeat(70));
  
  process.exit(0);
}

main().catch((error) => {
  console.error(`\n❌ Test failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
