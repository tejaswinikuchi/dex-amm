// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DEX {
    address public tokenA;
    address public tokenB;

    uint256 public reserveA;
    uint256 public reserveB;

    uint256 public totalLiquidity;
    mapping(address => uint256) public liquidity;

    event LiquidityAdded(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidityMinted
    );

    event LiquidityRemoved(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidityBurned
    );

    event Swap(
        address indexed trader,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    constructor(address _tokenA, address _tokenB) {
        tokenA = _tokenA;
        tokenB = _tokenB;
    }

    function addLiquidity(uint256 amountA, uint256 amountB)
        external
        returns (uint256 liquidityMinted)
    {
        require(amountA > 0 && amountB > 0, "Invalid amounts");

        if (totalLiquidity == 0) {
            IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
            IERC20(tokenB).transferFrom(msg.sender, address(this), amountB);

            liquidityMinted = _sqrt(amountA * amountB);

            liquidity[msg.sender] = liquidityMinted;
            totalLiquidity = liquidityMinted;

            reserveA = amountA;
            reserveB = amountB;
        } else {
            uint256 requiredB = (amountA * reserveB) / reserveA;
            require(amountB == requiredB, "Ratio mismatch");

            IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
            IERC20(tokenB).transferFrom(msg.sender, address(this), amountB);

            liquidityMinted = (amountA * totalLiquidity) / reserveA;

            liquidity[msg.sender] += liquidityMinted;
            totalLiquidity += liquidityMinted;

            reserveA += amountA;
            reserveB += amountB;
        }

        emit LiquidityAdded(
            msg.sender,
            amountA,
            amountB,
            liquidityMinted
        );
    }

    function removeLiquidity(uint256 liquidityAmount)
        external
        returns (uint256 amountA, uint256 amountB)
    {
        require(liquidityAmount > 0, "Invalid amount");
        require(liquidity[msg.sender] >= liquidityAmount, "Not enough liquidity");

        amountA = (liquidityAmount * reserveA) / totalLiquidity;
        amountB = (liquidityAmount * reserveB) / totalLiquidity;

        liquidity[msg.sender] -= liquidityAmount;
        totalLiquidity -= liquidityAmount;

        reserveA -= amountA;
        reserveB -= amountB;

        IERC20(tokenA).transfer(msg.sender, amountA);
        IERC20(tokenB).transfer(msg.sender, amountB);

        emit LiquidityRemoved(
            msg.sender,
            amountA,
            amountB,
            liquidityAmount
        );
    }

    function swapAForB(uint256 amountAIn)
        external
        returns (uint256 amountBOut)
    {
        require(amountAIn > 0, "Invalid input");
        require(reserveA > 0 && reserveB > 0, "No liquidity");

        IERC20(tokenA).transferFrom(msg.sender, address(this), amountAIn);

        amountBOut = getAmountOut(amountAIn, reserveA, reserveB);

        reserveA += amountAIn;
        reserveB -= amountBOut;

        IERC20(tokenB).transfer(msg.sender, amountBOut);

        emit Swap(
            msg.sender,
            tokenA,
            tokenB,
            amountAIn,
            amountBOut
        );
    }

    function swapBForA(uint256 amountBIn)
        external
        returns (uint256 amountAOut)
    {
        require(amountBIn > 0, "Invalid input");
        require(reserveA > 0 && reserveB > 0, "No liquidity");

        IERC20(tokenB).transferFrom(msg.sender, address(this), amountBIn);

        amountAOut = getAmountOut(amountBIn, reserveB, reserveA);

        reserveB += amountBIn;
        reserveA -= amountAOut;

        IERC20(tokenA).transfer(msg.sender, amountAOut);

        emit Swap(
            msg.sender,
            tokenB,
            tokenA,
            amountBIn,
            amountAOut
        );
    }

    function getPrice() external view returns (uint256 price) {
        require(reserveA > 0, "No liquidity");
        price = reserveB / reserveA;
    }

    function getReserves()
        external
        view
        returns (uint256 _reserveA, uint256 _reserveB)
    {
        _reserveA = reserveA;
        _reserveB = reserveB;
    }

    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256 amountOut) {
        require(amountIn > 0, "Invalid input");
        require(reserveIn > 0 && reserveOut > 0, "Invalid reserves");

        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;

        amountOut = numerator / denominator;
    }

    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
