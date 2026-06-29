# College Preferences 高考志愿填报辅助工具

一个帮助高考考生筛选大学、了解校园生活条件的前端应用。

> **⚠️ 适用范围：仅适用于福建地区考生。** 录取分数线、招生计划等数据均为福建省数据，院校筛选条件也针对福建考生需求设计。

## 功能特性

- **大学筛选**：按地区、城市等级、层次（本科/专科）、性质（公办/民办）筛选
- **大学详情**：宿舍条件、管理情况、网络设施、交通出行、生活服务等
- **福建录取数据**：2023-2025 福建分数线及 2026 招生计划
- **搜索功能**：按大学名称、城市、省份快速搜索

## 技术栈

- React 19 + TypeScript
- Vite 8
- TailwindCSS 4
- PDF.js（PDF 文件展示）

## 快速开始

```bash
# 安装依赖
cd frontend
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 项目结构

```
College_Preferences/
├── frontend/          # React 前端应用
│   ├── public/        # 静态资源（大学数据 JSON、PDF）
│   └── src/           # 源代码
│       ├── components/  # UI 组件
│       ├── data/        # 数据加载
│       ├── types/       # TypeScript 类型
│       └── utils/       # 工具函数
├── scripts/           # 数据处理脚本
└── README.md
```

## 数据来源

- 大学宿舍及管理情况数据（Excel → JSON）
- 福建录取数据（PDF）
