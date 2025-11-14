# DomainVault fhEVM v0.9.12 完整重构计划

## 🎯 重构目标

将DomainVault项目从fhEVM v0.8.0升级到v0.9.12，参考Zama官方模板进行完整重构。

## 📊 当前进度

### ✅ 已完成

1. **依赖升级** - 完成
   - `@fhevm/solidity`: `^0.8.0` → `^0.9.12`
   - `@fhevm/hardhat-plugin`: `^0.1.0` → `^0.3.0-1`
   - `@zama-fhe/relayer-sdk`: `0.2.0` → `^0.3.0-5`
   - 添加官方推荐的测试和开发依赖

2. **Hardhat配置重构** - 完成
   - 创建`hardhat.config.ts` (TypeScript)
   - 使用`hardhat-deploy`插件
   - 配置`hardhat-gas-reporter`
   - 支持Sepolia和本地网络
   - EVM版本升级到`cancun`

3. **合约代码重构** - 进行中
   - 创建`DomainVaultAuction_v2.sol`
   - 使用`ZamaEthereumConfig`替代`SepoliaConfig`
   - Solidity版本升级到`^0.8.27`
   - 优化FHE操作和权限管理

### 🔄 进行中

4. **创建hardhat-deploy部署脚本**
5. **编写完整的合约测试用例**

### ⏳ 待完成

6. **升级前端SDK到v0.3.0-5**
7. **重构前端FHE加密解密逻辑**
8. **更新hooks使用新的SDK API**
9. **部署测试到Sepolia网络**
10. **端到端功能测试和验证**

## 🏗️ 架构变更

### 合约层 (Backend)

#### 旧架构 (v0.8.0)
```solidity
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract DomainVaultAuction is SepoliaConfig, ReentrancyGuard {
    constructor(address initialGatewaySigner) {
        gatewaySigner = initialGatewaySigner;
    }
}
```

#### 新架构 (v0.9.12)
```solidity
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract DomainVaultAuction is ZamaEthereumConfig, ReentrancyGuard {
    constructor() {
        // ZamaEthereumConfig自动处理网络配置
    }
}
```

**关键变更**:
- 不再需要手动传入`gatewaySigner`
- `ZamaEthereumConfig`自动配置ACL/KMS/Coprocessor地址
- 支持Ethereum主网和Sepolia测试网

### 前端层 (Frontend)

#### 旧SDK (v0.2.0)
```typescript
// 使用CDN加载
const sdk = await import('https://cdn.zama.ai/relayer-sdk-js/0.2.0/relayer-sdk-js.js');
const { initSDK, createInstance, SepoliaConfig } = sdk;

await initSDK();
const fhe = await createInstance(SepoliaConfig);
```

#### 新SDK (v0.3.0-5)
```typescript
// 使用npm包
import { createInstance, ZamaSepoliaConfig, FhevmType } from '@zama-fhe/relayer-sdk';

const fhe = await createInstance(ZamaSepoliaConfig);

// 加密示例
const input = await fhe.createEncryptedInput(contractAddress, userAddress);
input.add64(bidAmount);
const encrypted = await input.encrypt();

// 使用加密数据
await contract.submitBid(
  dropId,
  encrypted.handles[0],
  encrypted.inputProof
);
```

**关键变更**:
- 使用npm包代替CDN
- API简化，不再需要手动`initSDK()`
- 更好的TypeScript类型支持
- 支持多种加密类型 (`add8`, `add16`, `add32`, `add64`, `add128`, `add256`)

## 📁 新文件结构

```
projects/10_DomainVault/
├── contracts/
│   ├── DomainVaultAuction.sol          # 旧合约 (v0.8.0)
│   └── DomainVaultAuction_v2.sol       # 新合约 (v0.9.12) ✅
├── deploy/
│   └── 001_deploy_domainvault.ts       # hardhat-deploy脚本 ⏳
├── test/
│   ├── DomainVault.test.ts             # 本地测试 ⏳
│   └── DomainVault.sepolia.test.ts     # Sepolia测试 ⏳
├── tasks/
│   └── domainvault.ts                  # Hardhat任务 ⏳
├── src/
│   ├── utils/
│   │   ├── fheInstance.ts              # FHE实例管理 (需要更新)
│   │   └── encryption.ts               # 加密工具 (需要更新)
│   └── hooks/
│       └── useDomainVault.ts           # React hooks (需要更新)
├── hardhat.config.ts                   # 新配置 ✅
├── tsconfig.hardhat.json               # Hardhat TypeScript配置 ✅
└── package.json                        # 更新依赖 ✅
```

## 🔑 关键API变更

### 1. FHE操作

#### 旧API
```solidity
euint64 encrypted = FHE.fromExternal(externalData, proof);
FHE.allowThis(encrypted);
FHE.allow(encrypted, address);
```

#### 新API (相同，但有增强)
```solidity
euint64 encrypted = FHE.fromExternal(externalData, proof);
FHE.allowThis(encrypted);  // 授权合约访问
FHE.allow(encrypted, address);  // 授权用户访问

// 新增：条件选择
euint64 result = FHE.select(condition, trueValue, falseValue);

// 新增：解密 (仅在本地测试中使用)
bool decrypted = FHE.decrypt(ebool value);
```

### 2. 比较操作

```solidity
// 比较返回加密的布尔值 (ebool)
ebool isGreater = FHE.gt(bidA, bidB);
ebool isEqual = FHE.eq(bidA, bidB);

// 条件选择
euint64 max = FHE.select(isGreater, bidA, bidB);
```

### 3. 算术操作

```solidity
euint64 sum = FHE.add(a, b);
euint64 diff = FHE.sub(a, b);
euint64 product = FHE.mul(a, b);
```

## 📝 测试策略

### 本地测试 (Hardhat Network)

```typescript
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

describe("DomainVaultAuction", function () {
  it("should create auction with encrypted reserve", async function () {
    // 使用fhevm.createEncryptedInput创建加密输入
    const reservePrice = 1000000; // 0.001 ETH in wei
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, deployer.address)
      .add64(reservePrice)
      .encrypt();

    // 调用合约
    await contract.createDrop(
      dropId,
      registrar,
      allowlistOpens,
      biddingOpens,
      biddingCloses,
      encrypted.handles[0],
      encrypted.inputProof
    );

    // 使用fhevm.userDecryptEuint解密验证
    const storedReserve = await contract.getHighestBid(dropId);
    const decrypted = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      storedReserve,
      contractAddress,
      deployer
    );
    expect(decrypted).to.equal(reservePrice);
  });
});
```

### Sepolia测试

```typescript
describe("DomainVaultAuction on Sepolia", function () {
  before(async function () {
    // 检查是否在真实网络
    if (fhevm.isMock) {
      this.skip();
    }
  });

  it("should submit encrypted bid on testnet", async function () {
    // 真实网络测试，无法解密验证
    // 只能验证交易成功和事件
    const tx = await contract.submitBid(...);
    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1);
  });
});
```

## 🚀 部署流程

### 1. 本地开发

```bash
# 清理
npm run clean

# 编译
npm run compile

# 本地测试
npm run test

# 启动本地节点
npx hardhat node

# 部署到本地 (另一个终端)
npm run deploy:localhost
```

### 2. Sepolia测试网

```bash
# 配置环境变量
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY
npx hardhat vars set ETHERSCAN_API_KEY

# 部署
npm run deploy:sepolia

# 验证合约
npm run verify:sepolia <CONTRACT_ADDRESS>

# Sepolia测试
npm run test:sepolia
```

## 🎨 前端重构要点

### 1. FHE实例初始化

```typescript
// src/utils/fheInstance.ts

import { createInstance, ZamaSepoliaConfig } from '@zama-fhe/relayer-sdk';

let fheInstance: any = null;

export async function initializeFHE() {
  if (fheInstance) return fheInstance;

  console.log('[FHE] Creating instance with ZamaSepoliaConfig...');
  fheInstance = await createInstance(ZamaSepoliaConfig);

  return fheInstance;
}
```

### 2. 加密工具

```typescript
// src/utils/encryption.ts

import { initializeFHE } from './fheInstance';

export async function encryptUint64(
  value: number,
  contractAddress: string,
  userAddress: string
): Promise<{ handle: string; proof: Uint8Array }> {
  const fhe = await initializeFHE();

  const input = await fhe.createEncryptedInput(contractAddress, userAddress);
  input.add64(value);
  const encrypted = await input.encrypt();

  return {
    handle: encrypted.handles[0],
    proof: encrypted.inputProof,
  };
}
```

### 3. React Hook更新

```typescript
// src/hooks/useDomainVault.ts

export function useCreateAuction() {
  return useMutation({
    mutationFn: async (params: CreateAuctionParams) => {
      // 1. 加密reserve价格
      const reserveWei = parseEther(params.reservePriceEth);
      const encrypted = await encryptUint64(
        Number(reserveWei),
        contractAddress,
        address
      );

      // 2. 调用合约
      const tx = await contract.createDrop(
        params.dropId,
        params.registrar,
        params.allowlistOpens,
        params.biddingOpens,
        params.biddingCloses,
        encrypted.handle,
        encrypted.proof
      );

      // 3. 等待确认
      const receipt = await tx.wait();
      return receipt;
    },
  });
}
```

## ⚠️ 注意事项

### 1. 网络配置

- **Sepolia**: 使用`ZamaSepoliaConfig`
- **Ethereum主网**: 使用`ZamaEthereumConfig` (未来)
- 不要混用配置！

### 2. Gas限制

```typescript
// Sepolia gas限制: 16,777,216
// FHE操作建议: 10,000,000

const tx = await contract.submitBid(..., {
  gas: 10000000n
});
```

### 3. 时间戳验证

```solidity
// 合约中的严格验证
if (allowlistOpens > biddingOpens || biddingOpens >= biddingCloses) {
    revert DomainVault__InvalidSchedule();
}

// 前端应该在提交前验证，避免无效交易
```

### 4. 错误处理

```typescript
try {
  const encrypted = await encryptUint64(...);
} catch (error) {
  if (error.message.includes('Failed to encrypt')) {
    // 加密失败，可能是网络问题
    toast.error('Encryption failed. Please check your connection.');
  } else if (error.message.includes('User rejected')) {
    // 用户拒绝签名
    toast.error('Transaction cancelled.');
  } else {
    // 其他错误
    console.error('Unexpected error:', error);
    toast.error('An unexpected error occurred.');
  }
}
```

## 📚 参考资源

- [fhEVM官方文档](https://docs.zama.ai/fhevm)
- [fhEVM GitHub v0.9.12](https://github.com/zama-ai/fhevm/tree/v0.9.12)
- [Hardhat Setup Guide](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup)
- [Testing Guide](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat/write_test)
- [Relayer SDK Docs](https://docs.zama.ai/protocol/javascript-sdk)

## 🎯 下一步行动

1. ✅ **完成合约重构** - 已创建`DomainVaultAuction_v2.sol`
2. ⏳ **创建部署脚本** - 使用`hardhat-deploy`
3. ⏳ **编写测试用例** - 本地和Sepolia测试
4. ⏳ **更新前端SDK** - 升级到v0.3.0-5
5. ⏳ **重构加密逻辑** - 使用新API
6. ⏳ **集成测试** - 端到端测试
7. ⏳ **部署验证** - Sepolia实际测试

---

**状态**: 🔄 进行中
**最后更新**: 2025-10-31
