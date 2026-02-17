# RentWise Frontend

RentWise 前端原型项目，使用 React + TypeScript + Vite + MUI 构建。  
该原型聚焦“可解释的社区对比决策”：将客观指标（Objective Metrics）与 Reddit 语义总结（Perception Summary）并列展示，帮助用户快速理解社区差异与权衡。

## 主要功能

- 三步式流程：`Profile -> Constraints -> Dashboard`
- 基于用户画像与约束条件自动推荐权重
- 手动调权并实时重算个性化社区评分
- 双社区并排对比：
  - 客观 API 指标
  - AI 生成的 Reddit 认知总结
- 结构化结论输出（trade-off summary）
- 缺失指标容错（`null` 指标不参与加权计算）

## 技术栈

- React 19
- TypeScript 5
- Vite 7
- MUI 7（Material UI）
- ESLint 9

## 快速开始

### 1) 安装依赖

```bash
npm ci
```

### 2) 启动开发环境

```bash
npm run dev
```

默认地址（通常）:

- `http://127.0.0.1:5173`

### 3) 构建生产包

```bash
npm run build
```

### 4) 本地预览生产包

```bash
npm run preview
```

### 5) 代码检查

```bash
npm run lint
```

## NPM 源常见问题

如果你遇到 `ENOTFOUND mirrors.cloud.tencent.com` 或类似错误，说明本机 npm 源被设置到不可达镜像。可以切回官方源：

```bash
npm config set registry https://registry.npmjs.org
```

然后重新执行：

```bash
npm ci
```

## 目录结构

```text
Rentwise-Frontend/
├─ public/
├─ src/
│  ├─ App.tsx
│  ├─ App.css
│  ├─ index.css
│  └─ main.tsx
├─ index.html
├─ package.json
└─ vite.config.ts
```

## 已完成的前端优化

- 视觉主题升级：统一色彩系统、背景层次与卡片风格
- 字体与排版升级：提升标题与正文层次感
- Dashboard 可解释性增强：新增当前权重快照 + Top Drivers
- 交互完善：
  - 推荐权重一键应用
  - 权重一键重置
  - A/B 选择相同社区时告警提示
- 移动端可读性优化：关键区域间距与按钮布局自适应

## 后续建议

- 接入真实后端 API 与认证流程
- 增加历史对比记录（保存用户权重组合）
- 为评分模型补充置信度与数据新鲜度展示
- 添加端到端测试（Playwright）

## License

仅用于课程/原型演示。
