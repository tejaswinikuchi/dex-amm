# DEX AMM Project

## Overview
This project is a simplified Decentralized Exchange (DEX) built using the
Automated Market Maker (AMM) model, similar to Uniswap V2.  
It allows users to add liquidity, remove liquidity, and swap between two ERC-20 tokens
without relying on order books or centralized intermediaries.

## Features
- Add initial and subsequent liquidity
- Remove liquidity proportionally
- Swap between Token A and Token B
- Constant product formula (x * y = k)
- 0.3% trading fee distributed to liquidity providers
- LP token accounting
- Fully tested with Hardhat + Chai

## Architecture
- **DEX.sol**: Core AMM logic (liquidity, swaps, pricing)
- **MockERC20.sol**: ERC-20 tokens for testing
- **Hardhat**: Development & testing framework

## Mathematical Implementation

### Constant Product Formula
x * y = k

Where:
- x = reserve of token A
- y = reserve of token B
- k = constant

### Fee Calculation
A 0.3% fee is applied on swaps:


amountInWithFee = amountIn * 997 / 1000

The fee remains in the pool, increasing `k` over time.

### LP Token Minting
- First provider: `sqrt(amountA * amountB)`
- Subsequent providers: proportional to existing liquidity

## Setup Instructions

### Prerequisites
- Node.js
- npm
- Hardhat

### Install & Test
```bash
npm install
npx hardhat compile
npx hardhat test

Testing

17+ unit tests

Covers liquidity, swaps, pricing, edge cases, and events

All tests passing

Known Limitations

Single token pair

No slippage protection

No frontend UI

Security Considerations

Solidity 0.8+ overflow protection

Input validation for all critical functions

Explicit revert conditions

