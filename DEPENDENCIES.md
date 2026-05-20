# MetaScan 依赖管理规范

## 一、依赖清单

### 生产依赖 (dependencies)

| 包名 | 版本 | 用途 | 引入方式 |
|---|---|---|---|
| `@fortawesome/fontawesome-free` | 6.5.1 | 图标字体库 (Font Awesome 6) | ES Module import (CSS) |
| `axe-core` | 4.11.4 | WCAG 2.1 AA 无障碍自动化审计 | 动态 import() |
| `chart.js` | 4.5.1 | 数据可视化图表 (趋势图、热力图等) | ES Module import + window.Chart |
| `cors` | 2.8.6 | Express CORS 跨域中间件 | ES Module import (服务端) |
| `exceljs` | 4.4.0 | Excel 文件读写与导出 | ES Module import (服务端) |
| `express` | 5.2.1 | HTTP 服务器框架 | ES Module import (服务端) |
| `html2canvas` | 1.4.1 | HTML 元素截图生成 Canvas | ES Module import |
| `jspdf` | 2.5.2 | PDF 文件生成 | ES Module import |
| `multer` | 2.1.1 | 文件上传中间件 | ES Module import (服务端) |
| `pdfkit` | 0.18.0 | PDF 文档生成 (服务端) | ES Module import (服务端) |
| `pinia` | 3.0.4 | Vue 3 状态管理 | ES Module import (Vue) |
| `tesseract.js` | 5.1.1 | OCR 光学字符识别 | ES Module import + window.Tesseract |
| `uuid` | 14.0.0 | UUID 生成 | ES Module import |
| `vue` | 3.5.34 | Vue 3 前端框架 | ES Module import (Vue) |
| `vue-router` | 4.6.4 | Vue 3 路由管理 | ES Module import (Vue) |
| `ws` | 8.20.1 | WebSocket 通信 | ES Module import (服务端) |

### 开发依赖 (devDependencies)

| 包名 | 版本 | 用途 |
|---|---|---|
| `@vitejs/plugin-vue` | 6.0.7 | Vite Vue 3 插件 |
| `typescript` | 6.0.3 | TypeScript 编译器 |
| `vite` | 5.4.21 | 前端构建工具 |
| `vue-tsc` | 3.2.9 | Vue TypeScript 类型检查 |

### 安全覆盖 (overrides)

| 包名 | 覆盖版本 | 原始间接依赖版本 | 覆盖原因 |
|---|---|---|---|
| `dompurify` | 3.2.4 | ≤3.3.3 | 修复 jspdf 传递依赖中的 XSS 漏洞 |
| `esbuild` | 0.25.2 | 旧版本 | 修复 vite 传递依赖中的安全漏洞 |

---

## 二、依赖迁移历史

### 2026-05-16 — CDN → npm 迁移

| 库 | 原 CDN 地址 | 新 npm 版本 | 影响文件 |
|---|---|---|---|
| Chart.js | `cdn.jsdelivr.net/npm/chart.js` | chart.js@4.5.1 | index.html, index-vue.html, src/main.js |
| Tesseract.js | `cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js` | tesseract.js@5.1.1 | index.html, src/main.js |
| Font Awesome 6 | `cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css` | @fortawesome/fontawesome-free@6.5.1 | index.html, index-vue.html, src/main.js, src-vue/main.ts |

**迁移后状态：**
- 所有第三方库均通过 npm 管理，无 CDN 引入方式
- package.json 中所有版本号均为精确版本（无 `^` 或 `~` 前缀）
- package-lock.json 已提交，确保团队成员依赖版本一致

---

## 三、版本号选择原则

### 版本号格式：MAJOR.MINOR.PATCH

| 级别 | 含义 | 更新策略 |
|---|---|---|
| MAJOR (主版本) | 不兼容的 API 变更 | 每季度评估，需全面测试后执行 |
| MINOR (次版本) | 向后兼容的功能新增 | 每月执行，需通过现有测试套件 |
| PATCH (补丁版本) | 向后兼容的问题修复 | 安全修复24小时内执行；常规修复每周执行 |

### 版本号锁定原则

1. **生产依赖（dependencies）**：使用精确版本号（如 `4.5.1`，禁止 `^4.5.1`）
2. **开发依赖（devDependencies）**：使用精确版本号，确保 CI/CD 环境一致性
3. **安全覆盖（overrides）**：仅用于修复传递依赖的安全漏洞，需记录覆盖原因

---

## 四、依赖管理操作流程

### 4.1 添加新依赖

```bash
# 1. 安装依赖（使用 --save-exact 锁定精确版本）
npm install <package-name>@<version> --save-exact

# 2. 检查版本冲突
npm ls <package-name>

# 3. 运行安全审计
npm audit

# 4. 构建验证
npm run build
```

### 4.2 更新现有依赖

```bash
# 检查可更新的依赖
npm run check:deps

# 更新次要/补丁版本
npm update <package-name>

# 更新完成后执行去重
npm run dedupe

# 安全审计
npm run audit

# 构建验证
npm run build
```

### 4.3 安全漏洞修复

```bash
# 每周安全扫描
npm run audit

# 自动修复（非破坏性）
npm run audit:fix

# 审核报告中的 Critical/High 漏洞，24小时内处理
```

### 4.4 依赖树优化

```bash
# 消除冗余依赖，优化依赖树结构
npm run dedupe
```

---

## 五、安全审计机制

### 5.1 定期扫描

- **频率**：每周一执行 `npm audit`
- **责任人**：项目维护者
- **响应时间**：
  - Critical 级别：24小时内修复
  - High 级别：24小时内修复
  - Moderate 级别：当周内评估修复
  - Low 级别：纳入下次更新计划

### 5.2 当前已知风险（已评估可接受）

| 漏洞编号 | 级别 | 涉及包 | 说明 | 状态 |
|---|---|---|---|---|
| GHSA-cjmm-f4jc-qw8r | Critical | dompurify (via jspdf) | DOMPurify XSS 漏洞 | 已通过 overrides 缓解 (3.2.4)，完全修复需 jspdf@4.x（破坏性变更，待评估） |
| GHSA-4w7w-66w2-5vf9 | Moderate | vite | Vite 路径遍历 | 需 vite@8.x（破坏性变更，待评估） |
| GHSA-v8jm-5vwx-cfxm | Moderate | dompurify (via jspdf) | DOMPurify XSS 漏洞 | 已通过 overrides 缓解 |

---

## 六、CI/CD 集成

### 6.1 建议的 CI Pipeline 配置

```yaml
# .github/workflows/dependency-check.yml (示例)
name: Dependency Security Check

on:
  schedule:
    - cron: '0 9 * * 1'  # 每周一 9:00 UTC
  pull_request:
    paths:
      - 'package.json'
      - 'package-lock.json'

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm audit --audit-level=high
      - run: npm run build
      - run: npm run dedupe
```

### 6.2 本地预检命令

```bash
# 完整预检
npm ci && npm run audit && npm run dedupe && npm run build && npm run typecheck
```

---

## 七、依赖冲突预防

### 7.1 引入前检查

在 `npm install` 任何新依赖前，执行：

```bash
npm ls <package-name>
```

检查是否存在版本冲突。若已有该包的间接依赖，评估是否会导致多版本共存。

### 7.2 定期去重

每次 `npm install` 后执行：

```bash
npm run dedupe
```

### 7.3 锁定文件管理

- `package-lock.json` 必须提交到版本控制
- 任何 `package.json` 或 `package-lock.json` 变更需通过 Code Review
- CI 中使用 `npm ci` 而非 `npm install` 确保严格按 lock 文件安装

---

## 八、更新审批流程

```
新增依赖 / 版本更新请求
        ↓
  npm audit 安全扫描
        ↓
  npm run build 构建验证
        ↓
  npm run typecheck 类型检查
        ↓
  Code Review (PR)
        ↓
  合并分支 → 通知团队成员执行 npm ci
```

---

## 九、迁移后验证清单

- [x] 所有第三方依赖均通过 npm 管理，无 CDN 引入方式
- [x] package.json 中所有版本号均为精确版本
- [x] package-lock.json 已生成并纳入版本控制
- [x] 项目构建无依赖相关警告
- [x] npm dedupe 可正常执行
- [x] 安全审计报告已知风险文档化
- [ ] CI/CD pipeline 自动依赖安全检查（待配置）
- [ ] 团队成员培训：依赖更新流程