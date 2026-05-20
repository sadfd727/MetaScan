# MetaScan 无障碍开发指南

## 目标

本项目致力于达到 **WCAG 2.1 AA 级**可访问性标准，确保所有用户（包括使用辅助技术的用户）能够无障碍地使用本系统。

## 架构概览

无障碍功能分布在以下模块中：

| 模块 | 位置 | 职责 |
|------|------|------|
| `accessibility.js` | `src/accessibility.js` | 核心无障碍引擎：焦点陷阱、跳过链接、屏幕阅读器播报、ARIA landmarks注入、axe-core审计 |
| `theme.js` | `src/theme.js` | 主题/高对比度/键盘导航基础层 |
| `i18n.js` | `src/i18n.js` | 国际化 aria-label 翻译 |
| `index.html` | `index.html` | 静态 ARIA 属性标记（role/tablist/tab/aria-selected） |

### 核心 API

```javascript
// 屏幕阅读器播报
window.announce('消息内容', 'polite');          // 礼貌播报（等待当前播报完成）
window.announce('重要消息', 'assertive');       // 立即播报（打断当前播报）
window.announceError('错误描述');               // 错误立即播报
window.announceSuccess('操作成功');             // 成功礼貌播报

// 焦点管理
window.trapFocus(modalElement);                 // 开启焦点陷阱（返回 release 函数）
window.addSkipToContentLink();                  // 注入"跳到主要内容"链接

// ARIA 基础设施
window.injectARIALandmarks();                   // 注入 banner/main/navigation/contentinfo 等角色
window.ensureAriaLabels();                      // 自动为无 label 的可交互元素添加 aria-label
window.associateFormErrors(formElement, errors); // 关联表单错误（aria-invalid + aria-describedby）

// axe-core 审计
const result = await window.runA11yAudit();     // 运行 WCAG AA 级审计
const summary = window.generateA11ySummaryHTML(result); // 生成审计报告HTML
window.getLatestAuditResult();                  // 获取最近一次审计结果
```

## 开发规范

### 1. 键盘导航

**所有交互元素必须可通过键盘访问：**

```html
<!-- ✅ 正确：原生按钮，自带键盘支持 -->
<button onclick="save()">保存</button>

<!-- ✅ 正确：为非原生元素添加 tabindex 和 aria-label -->
<div tabindex="0" role="button" aria-label="打开菜单" onclick="openMenu()">☰</div>

<!-- ❌ 错误：div 无 tabindex，不可聚焦 -->
<div onclick="save()">保存</div>
```

**焦点陷阱用于模态框：**

```javascript
// 打开模态框时
var release = trapFocus(document.getElementById('myModal'));
// 关闭时
release();
```

### 2. 屏幕阅读器支持

**动态内容必须使用 aria-live：**

```javascript
// ✅ 加载状态
announce('数据加载中，请稍候...', 'polite');

// ✅ 错误消息
announceError('网络连接失败，请检查网络设置');

// ✅ 操作成功
announceSuccess('数据已保存');
```

**通知系统已自动集成：** `showNotification()` 会自动调用 `announce()` 进行屏幕阅读器播报。

### 3. 表单验证

```javascript
// 表单错误必须使用 associateFormErrors 关联
associateFormErrors(document.getElementById('loginForm'), {
    'username': '请输入用户名',
    'password': '密码长度不能少于6位',
    'confirmPassword': '两次密码输入不一致'
});
// 自动生成：错误摘要(role=alert) + aria-invalid + aria-describedby
```

### 4. HTML ARIA 属性

**导航标签必须使用 tablist 模式：**

```html
<nav role="tablist" aria-label="主导航">
    <button role="tab" aria-selected="true" aria-label="首页">首页</button>
    <button role="tab" aria-selected="false" aria-label="数据">数据</button>
</nav>
```

**所有图片必须有 alt 属性：**

```html
<img src="avatar.png" alt="用户头像">
<img src="chart.png" alt="代谢指标趋势图">          <!-- 信息性图片 -->
<img src="decorative-line.png" alt="">                <!-- 装饰性图片，空 alt -->
```

**聊天区域：**

```html
<div id="chatMessages" role="log" aria-label="聊天消息" aria-live="polite">
    <!-- 新消息自动被屏幕阅读器播报 -->
</div>
```

### 5. 焦点可见性

项目使用**自适应焦点环**：鼠标操作隐藏 outline，键盘 Tab 导航显示 3px 青色 outline。

```css
/* 键盘模式 */
[data-focus-method="keyboard"] :focus-visible {
    outline: 3px solid #26d0ce !important;
    outline-offset: 2px !important;
}

/* 鼠标模式 */
[data-focus-method="mouse"] :focus {
    outline: none !important;
}
```

### 6. 高对比度模式

通过 `<html data-contrast="high">` 激活，使用 localStorage 键 `metascanContrast`。

## axe-core 审计

### 在浏览器控制台中运行

```javascript
// 运行完整的 WCAG 2.1 AA 审计
await runA11yAudit();

// 查看结构化结果
getLatestAuditResult();
```

axe-core 仅在调用 `runA11yAudit()` 时动态加载，不影响正常页面加载性能。

### 审计检查范围

审计覆盖以下 WCAG 规则集：
- `wcag2a` / `wcag2aa` (WCAG 2.0)
- `wcag21a` / `wcag21aa` (WCAG 2.1)
- `best-practice` (最佳实践)

### Lighthouse 评分目标

- 可访问性评分 ≥ **90 分**
- 所有 `critical` 和 `serious` 级别违规必须修复
- `moderate` 级别违规应在规划迭代中修复

## 检查清单

开发新功能时，请完成以下检查：

- [ ] 所有按钮和可交互元素可通过 Tab 键访问
- [ ] 模态框实现了焦点陷阱（trapFocus）
- [ ] 动态内容变更通过 announce() 播报
- [ ] 所有 `<img>` 标签有合适的 alt 属性
- [ ] 表单错误使用 associateFormErrors() 关联
- [ ] 导航使用 role="tablist" / role="tab" / aria-selected
- [ ] 高对比度模式下元素可见（添加 `[data-contrast="high"]` 样式）
- [ ] 运行 `await runA11yAudit()` 无 critical/serious 违规

## 使用的辅助技术

开发测试应在以下环境中验证：

- **屏幕阅读器**：NVDA (Windows)、VoiceOver (macOS)、JAWS (Windows)
- **高对比度**：Windows 高对比度模式、浏览器缩放 200%
- **键盘导航**：仅使用 Tab/Shift+Tab/Enter/Space/Escape/Arrow 键
- **自动化**：axe-core + Lighthouse Accessibility audit

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 2.0 | 2026-05 | 集成 axe-core 审计、增强 ARIA landmarks、focus trap、form error association、sr-only CSS、通知自动播报 |
| 1.0 | 2026-02 | 初始无障碍支持：aria-labels、高对比度、基础键盘导航 |