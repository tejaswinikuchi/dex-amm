const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DEX", function () {
  let dex, tokenA, tokenB;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    tokenA = await MockERC20.deploy("Token A", "TKA");
    tokenB = await MockERC20.deploy("Token B", "TKB");

    const DEX = await ethers.getContractFactory("DEX");
    dex = await DEX.deploy(tokenA.address, tokenB.address);

    await tokenA.approve(dex.address, ethers.utils.parseEther("1000000"));
    await tokenB.approve(dex.address, ethers.utils.parseEther("1000000"));
  });

  /* -------------------- LIQUIDITY -------------------- */
  describe("Liquidity Management", function () {

    it("should allow initial liquidity provision", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      const reserves = await dex.getReserves();
      expect(reserves[0]).to.equal(ethers.utils.parseEther("100"));
      expect(reserves[1]).to.equal(ethers.utils.parseEther("200"));
    });

    it("should mint correct LP tokens for first provider", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      expect(await dex.totalLiquidity()).to.be.gt(0);
    });

    it("should allow subsequent liquidity additions", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      await dex.addLiquidity(
        ethers.utils.parseEther("50"),
        ethers.utils.parseEther("100")
      );

      const [a, b] = await dex.getReserves();
      expect(a).to.equal(ethers.utils.parseEther("150"));
      expect(b).to.equal(ethers.utils.parseEther("300"));
    });

    it("should allow partial liquidity removal", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      await dex.removeLiquidity((await dex.totalLiquidity()).div(2));
      const [a, b] = await dex.getReserves();

      expect(a).to.equal(ethers.utils.parseEther("50"));
      expect(b).to.equal(ethers.utils.parseEther("100"));
    });

    it("should revert on wrong ratio liquidity addition", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      await expect(
        dex.addLiquidity(
          ethers.utils.parseEther("50"),
          ethers.utils.parseEther("90")
        )
      ).to.be.revertedWith("Ratio mismatch");
    });

    it("should revert when adding zero liquidity", async function () {
      await expect(dex.addLiquidity(0, 0))
        .to.be.revertedWith("Invalid amounts");
    });

    it("should revert when removing more liquidity than owned", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      await expect(
        dex.removeLiquidity((await dex.totalLiquidity()).add(1))
      ).to.be.revertedWith("Not enough liquidity");
    });

    it("should return full reserves when all liquidity is removed", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      await dex.removeLiquidity(await dex.totalLiquidity());
      const [a, b] = await dex.getReserves();

      expect(a).to.equal(0);
      expect(b).to.equal(0);
    });

    it("should preserve ratio after multiple liquidity additions", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      await dex.addLiquidity(
        ethers.utils.parseEther("50"),
        ethers.utils.parseEther("100")
      );

      const [a, b] = await dex.getReserves();
      expect(b.mul(100)).to.equal(a.mul(200));
    });

    it("should revert when removing zero liquidity", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      await expect(dex.removeLiquidity(0))
        .to.be.revertedWith("Invalid amount");
    });
  });

  /* -------------------- SWAPS -------------------- */
  describe("Token Swaps", function () {

    beforeEach(async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
    });

    it("should swap token A for token B", async function () {
      await dex.swapAForB(ethers.utils.parseEther("10"));
      const [a, b] = await dex.getReserves();

      expect(a).to.equal(ethers.utils.parseEther("110"));
      expect(b).to.be.lt(ethers.utils.parseEther("200"));
    });

    it("should calculate correct output amount with fee", async function () {
      const expectedOut = await dex.getAmountOut(
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      await dex.swapAForB(ethers.utils.parseEther("10"));
      const [, b] = await dex.getReserves();

      expect(ethers.utils.parseEther("200").sub(b))
        .to.equal(expectedOut);
    });

    it("should increase k after swap due to fees", async function () {
      const [a1, b1] = await dex.getReserves();
      await dex.swapAForB(ethers.utils.parseEther("10"));
      const [a2, b2] = await dex.getReserves();

      expect(a2.mul(b2)).to.be.gt(a1.mul(b1));
    });

    it("should revert on zero swap amount", async function () {
      await expect(dex.swapAForB(0))
        .to.be.revertedWith("Invalid input");
    });

    it("should accumulate fees for liquidity providers", async function () {
      await dex.swapAForB(ethers.utils.parseEther("10"));
      await dex.swapAForB(ethers.utils.parseEther("10"));

      await dex.removeLiquidity(await dex.totalLiquidity());
      expect(await tokenA.balanceOf(owner.address))
        .to.be.gt(ethers.utils.parseEther("999900"));
    });

    it("should handle large swap with high price impact", async function () {
      const smallOut = await dex.getAmountOut(
        ethers.utils.parseEther("5"),
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      const largeOut = await dex.getAmountOut(
        ethers.utils.parseEther("80"),
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      expect(largeOut.div(80)).to.be.lt(smallOut.div(5));
    });

    it("should handle multiple consecutive swaps correctly", async function () {
      await dex.swapAForB(ethers.utils.parseEther("10"));
      await dex.swapBForA(ethers.utils.parseEther("5"));
      await dex.swapAForB(ethers.utils.parseEther("7"));

      const [a, b] = await dex.getReserves();
      expect(a).to.be.gt(0);
      expect(b).to.be.gt(0);
    });

    it("should revert swap when no liquidity exists", async function () {
      const DEX = await ethers.getContractFactory("DEX");
      const freshDex = await DEX.deploy(tokenA.address, tokenB.address);

      await expect(
        freshDex.swapAForB(ethers.utils.parseEther("10"))
      ).to.be.revertedWith("No liquidity");
    });

   
    it("should revert getAmountOut for zero input", async function () {
      await expect(
        dex.getAmountOut(
          0,
          ethers.utils.parseEther("100"),
          ethers.utils.parseEther("200")
        )
      ).to.be.revertedWith("Invalid input");
    });
  });

  /* -------------------- PRICE -------------------- */
  describe("Price Calculations", function () {

    it("should return correct initial price", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      expect(await dex.getPrice()).to.equal(2);
    });

    it("should update price after swaps", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      const priceBefore = await dex.getPrice();
      await dex.swapAForB(ethers.utils.parseEther("10"));
      const priceAfter = await dex.getPrice();

      expect(priceAfter).to.be.lt(priceBefore);
    });

    it("should revert price query with no liquidity", async function () {
      const DEX = await ethers.getContractFactory("DEX");
      const freshDex = await DEX.deploy(tokenA.address, tokenB.address);

      await expect(freshDex.getPrice())
        .to.be.revertedWith("No liquidity");
    });
  });

  /* -------------------- EVENTS -------------------- */
  describe("Events", function () {

    it("should emit LiquidityAdded event", async function () {
      await expect(
        dex.addLiquidity(
          ethers.utils.parseEther("100"),
          ethers.utils.parseEther("200")
        )
      ).to.emit(dex, "LiquidityAdded");
    });

    it("should emit LiquidityRemoved event", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      await expect(
        dex.removeLiquidity((await dex.totalLiquidity()).div(2))
      ).to.emit(dex, "LiquidityRemoved");
    });

    it("should emit Swap event", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      await expect(
        dex.swapAForB(ethers.utils.parseEther("10"))
      ).to.emit(dex, "Swap");
    });
  });
});
