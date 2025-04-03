<div align="center">

<h1>RAGFlow 知识库助手 <br/><sup>LobeChat 插件</sup></h1>

这是一个 LobeChat 插件，允许用户通过 RAGFlow 服务查询知识库，并以知识图谱形式可视化结果。

![License](https://img.shields.io/github/license/lobehub/chat-plugin-template?color=white&labelColor=black&style=flat-square)

</div>

## ✨ 功能特点

- **知识库集成** - 与 RAGFlow 知识库 API 无缝集成，提供智能问答功能
- **知识图谱可视化** - 使用 D3.js 将知识关系以交互式图谱形式展示
- **来源引用** - 展示参考来源，确保信息透明和可溯源
- **自定义配置** - 支持配置自定义 RAGFlow API 地址和密钥

## 📚 使用方法

### 插件设置

首先，您需要在插件设置中配置 RAGFlow 服务地址：

1. 在 LobeChat 中打开插件市场
2. 找到并安装 "RAGFlow 知识库助手" 插件
3. 点击插件设置
4. 填写以下信息：
   - **RAGFlow API 地址**：您的 RAGFlow 服务地址（例如：<http://your-ragflow-server）>
   - **API 密钥**（可选）：如果您的 RAGFlow 服务需要鉴权，请填入 API 密钥

### 使用插件

设置完成后，您可以通过以下方式使用插件：

1. 在对话中输入需要查询的问题
2. 调用 "RAGFlow 知识库助手" 插件
3. 查看返回的答案、知识图谱和参考来源

您也可以直接在插件界面中输入查询并搜索。

## 🧩 插件能力

RAGFlow 知识库助手插件提供以下核心功能：

- **智能问答** - 基于知识库回答用户问题
- **知识可视化** - 以知识图谱形式展示相关信息
- **文档引用** - 提供信息来源，支持深入了解
- **自定义查询** - 支持用户输入自定义问题

## 💻 开发

如果您想修改或开发此插件，可以按照以下步骤操作：

```bash
# 克隆代码库
git clone https://github.com/your-username/ragflow-integration-plugin.git
cd ragflow-integration-plugin

# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建生产版本
npm run build
```

## 🚀 部署

您可以将此插件部署到任何支持静态网站托管的平台，如 Vercel、Netlify、GitHub Pages 等。

## ⚠️ 注意事项

- 确保您的 RAGFlow 服务支持 CORS，以允许从 LobeChat 发出的请求
- 如果您的 RAGFlow 服务有自定义 API 路径，您可能需要修改代码中的 API 路径
- 知识图谱的渲染效果取决于 RAGFlow 返回的数据结构

## 📄 许可证

Copyright © 2025 [LobeHub](https://github.com/lobehub).

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
