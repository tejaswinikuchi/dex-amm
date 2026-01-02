# DEX AMM Project

## Overview
This project is a simplified Decentralized Exchange (DEX) implemented using an
Automated Market Maker (AMM) model inspired by Uniswap V2.

It allows users to:
- Add liquidity
- Remove liquidity
- Swap between two ERC-20 tokens

All swaps follow the constant product invariant without using order books or centralized intermediaries.

---

## Features
- Initial and subsequent liquidity provision
- Proportional liquidity removal
- Token swaps (A ↔ B)
- Constant product formula (x * y = k)
- 0.3% trading fee distributed to liquidity providers
- LP token accounting
- Extensive automated test suite (25+ tests)
- Dockerized execution environment

---

## Architecture
- **DEX.sol** — Core AMM logic (liquidity, swaps, pricing, fees)
- **MockERC20.sol** — ERC-20 tokens used for testing
- **Hardhat** — Development, testing, and deployment framework
- **Docker** — Containerized environment for reproducible builds

---

## Mathematical Implementation

### Constant Product Formula
x * y = k


Where:
- `x` = reserve of token A  
- `y` = reserve of token B  
- `k` = constant invariant  

Swaps adjust reserves while preserving the invariant (excluding fees).

---

### Fee Calculation
A **0.3% fee** is applied on every swap:

amountInWithFee = amountIn * 997 / 1000


The fee remains in the pool, increasing `k` over time and rewarding liquidity providers.

---

### LP Token Minting
- **First liquidity provider:**  

sqrt(amountA * amountB)

- **Subsequent providers:**  
Minted proportionally based on existing pool reserves.

---

## Setup Instructions

### Prerequisites
- Node.js (v18 recommended)
- npm
- Docker (optional but recommended)

---

### Local Setup

npm install
npx hardhat compile
npx hardhat test
npm run coverage

Docker Setup
docker-compose build
docker-compose up -d
docker-compose exec app npm test
docker-compose run --rm app npm run coverage

### Testing

25+ automated unit tests

## Covers:

Liquidity management

Swaps & fees

Pricing

Edge cases

Event emissions

Code coverage ≥ 94%

### Contract Addresses

This project is not deployed to a public blockchain.

All contracts are deployed locally during testing using Hardhat.

### Known Limitations

Supports only a single trading pair

No slippage protection

No oracle-based pricing

No frontend UI

### Security Considerations

Solidity 0.8+ overflow/underflow protection

Input validation on all state-changing functions

Checks-effects-interactions pattern

No external calls before state updates

Comprehensive test coverage for edge cases

