import { ethers } from 'hardhat'
import { expect } from 'chai'
import { PinkFlamingoSocialClub, PinkFlamingoSocialClub__factory } from '../typechain'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import mintersJson from '../minters/minters.json'
describe('Pink Flamingo Social Club', () => {
  let contract: PinkFlamingoSocialClub
  let admin: SignerWithAddress
  let buyer: SignerWithAddress
  let router: SignerWithAddress
  let collectionPrice = ethers.utils.parseEther('50')
  let maxTokenId = 779
  let baseURI = 'https://api.fantomglamingos.co'
  const mintersJsonArray = mintersJson.minterAddress
  const uniqueMinters = [...new Set(mintersJsonArray)]

  beforeEach(async () => {
    const signers = await ethers.getSigners()
    admin = signers[0]
    buyer = signers[1]
    router = signers[3]
    uniqueMinters.push(buyer.address)

    const contractFactory = (await ethers.getContractFactory(
      'PinkFlamingoSocialClub',
      admin,
    )) as PinkFlamingoSocialClub__factory
    contract = (await contractFactory.deploy(
      'PinkFlamingoSocialClub',
      'PFSC',
      router.address,
      maxTokenId,
      collectionPrice,
      uniqueMinters,
    )) as PinkFlamingoSocialClub
  })

  it('can mint flamingo', async () => {
    await contract.pauseMint({ from: admin.address })
    await contract.mintFalmingoTo(buyer.address, { value: collectionPrice })
    const balanceOfBuyer = await contract.balanceOf(buyer.address)
    expect(balanceOfBuyer.toNumber()).equal(1)
  })

  it('should get correct token URI', async () => {
    await contract.addBaseURI(baseURI)
    await contract.pauseMint({ from: admin.address })
    await contract.mintFalmingoTo(buyer.address, { value: collectionPrice })
    const expectedURI = baseURI + '/nfts/' + '778'
    const tokenURI = await contract.tokenURI(778)
    expect(tokenURI).equal(expectedURI)
  })

  // it('should be able to add minters to whitelist', async () => {
  //   await contract.loadMinters(uniqueMinters)
  // })

  it('should be able to bridge from router', async () => {
    await contract.pauseMint({ from: admin.address })
    await contract.mintFalmingoTo(buyer.address, { value: collectionPrice })
    await contract.mintFalmingoTo(buyer.address, { value: collectionPrice })
    await contract
      .connect(router)
      ['safeTransferFrom(address,address,uint256)'](router.address, buyer.address, 3)
    await contract
      .connect(router)
      ['safeTransferFrom(address,address,uint256)'](router.address, buyer.address, 4)

    const balanceOfBuyer = await contract.balanceOf(buyer.address)
    expect(balanceOfBuyer.toNumber()).equal(4)
  })

  it('should allow whitelist to redeem', async () => {
    await contract.pauseMint({ from: admin.address })
    await contract.connect(buyer).redeemFlamingo(buyer.address)
    const balance = await contract.balanceOf(buyer.address)
    expect(balance.toNumber()).equal(1)
  })

  it('redeem should fail if not in white list', async () => {
    await contract.pauseMint({ from: admin.address })
    expect(contract.connect(router).redeemFlamingo(buyer.address)).to.revertedWith(
      'Address not in Whitelist or Has Already Redeemed',
    )
  })

  it('redeem should fail if Address Already has Redeemed', async () => {
    await contract.pauseMint({ from: admin.address })
    await contract.connect(buyer).redeemFlamingo(buyer.address)
    expect(contract.connect(buyer).redeemFlamingo(buyer.address)).to.revertedWith(
      'Address not in Whitelist or Has Already Redeemed',
    )
  })

  it('should fail if value is lower than tokenPrice', async () => {
    await contract.pauseMint({ from: admin.address })
    expect(
      contract
        .connect(buyer)
        .mintFalmingoTo(buyer.address, { value: ethers.utils.parseEther('49') }),
    ).to.revertedWith('Must send at least current price for token')
  })

  it('should fail if over maxMint', async () => {
    await contract.pauseMint({ from: admin.address })
    await contract.mintFalmingoTo(buyer.address, { value: collectionPrice })
    await contract.mintFalmingoTo(buyer.address, { value: collectionPrice })
    expect(contract.mintFalmingoTo(buyer.address, { value: collectionPrice })).to.revertedWith(
      'Must not exceed maximum mint on Fantom',
    )
  })
  it('should fail if paused', async () => {
    expect(contract.mintFalmingoTo(buyer.address, { value: collectionPrice })).to.revertedWith(
      'Purchases must not be paused',
    )
  })
})
