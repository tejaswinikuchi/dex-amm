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

      const totalLiquidity = await dex.totalLiquidity();
      expect(totalLiquidity).to.be.gt(0);
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

      const reserves = await dex.getReserves();
      expect(reserves[0]).to.equal(ethers.utils.parseEther("150"));
      expect(reserves[1]).to.equal(ethers.utils.parseEther("300"));
    });

    it("should allow partial liquidity removal", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      const halfLiquidity = (await dex.totalLiquidity()).div(2);
      await dex.removeLiquidity(halfLiquidity);

      const reserves = await dex.getReserves();
      expect(reserves[0]).to.equal(ethers.utils.parseEther("50"));
      expect(reserves[1]).to.equal(ethers.utils.parseEther("100"));
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

      const reserves = await dex.getReserves();
      expect(reserves[0]).to.equal(ethers.utils.parseEther("110"));
      expect(reserves[1]).to.be.lt(ethers.utils.parseEther("200"));
    });

    it("should calculate correct output amount with fee", async function () {
      const amountIn = ethers.utils.parseEther("10");

      const expectedOut = await dex.getAmountOut(
        amountIn,
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      await dex.swapAForB(amountIn);

      const reserves = await dex.getReserves();
      const actualOut = ethers.utils.parseEther("200").sub(reserves[1]);

      expect(actualOut).to.equal(expectedOut);
    });

    it("should update reserves after swap", async function () {
      await dex.swapAForB(ethers.utils.parseEther("10"));

      const reserves = await dex.getReserves();
      expect(reserves[0]).to.equal(ethers.utils.parseEther("110"));
      expect(reserves[1]).to.be.lt(ethers.utils.parseEther("200"));
    });

    it("should increase k after swap due to fees", async function () {
      const [rA1, rB1] = await dex.getReserves();
      const k1 = rA1.mul(rB1);

      await dex.swapAForB(ethers.utils.parseEther("10"));

      const [rA2, rB2] = await dex.getReserves();
      const k2 = rA2.mul(rB2);

      expect(k2).to.be.gt(k1);
    });

    it("should swap token B for token A", async function () {
      await dex.swapBForA(ethers.utils.parseEther("20"));

      const reserves = await dex.getReserves();
      expect(reserves[1]).to.equal(ethers.utils.parseEther("220"));
      expect(reserves[0]).to.be.lt(ethers.utils.parseEther("100"));
    });

    it("should revert on zero swap amount", async function () {
      await expect(dex.swapAForB(0)).to.be.revertedWith("Invalid input");
      await expect(dex.swapBForA(0)).to.be.revertedWith("Invalid input");
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

      const initialPrice = await dex.getPrice();
      await dex.swapAForB(ethers.utils.parseEther("10"));
      const newPrice = await dex.getPrice();

      expect(newPrice).to.not.equal(initialPrice);
    });

    it("should handle price queries with zero reserves gracefully", async function () {
      const DEX = await ethers.getContractFactory("DEX");
      const freshDex = await DEX.deploy(tokenA.address, tokenB.address);

      await expect(
        freshDex.getPrice()
      ).to.be.revertedWith("No liquidity");
    });
  });
  describe("Events", function () {

  it("should emit LiquidityAdded event", async function () {
    await expect(
      dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      )
    )
      .to.emit(dex, "LiquidityAdded")
      .withArgs(
        owner.address,
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200"),
        await dex.totalLiquidity()
      );
  });

  it("should emit LiquidityRemoved event", async function () {
    await dex.addLiquidity(
      ethers.utils.parseEther("100"),
      ethers.utils.parseEther("200")
    );

    const liquidity = await dex.totalLiquidity();

    await expect(
      dex.removeLiquidity(liquidity.div(2))
    )
      .to.emit(dex, "LiquidityRemoved");
  });

  it("should emit Swap event", async function () {
    await dex.addLiquidity(
      ethers.utils.parseEther("100"),
      ethers.utils.parseEther("200")
    );

    await expect(
      dex.swapAForB(ethers.utils.parseEther("10"))
    )
      .to.emit(dex, "Swap");
  });

});

});
