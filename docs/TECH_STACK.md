# TutorMarket AI 技术选型说明

## 1. 总体建议

采用 `TypeScript monorepo` 架构，把 Web、小程序、移动端和后端拆成独立应用，但共享类型、SDK 和配置。

建议目录结构：

```text
apps/
  web/
  miniapp/
  mobile/
  api/
packages/
  sdk/
  types/
  config/
  prompts/
  lint-config/
  tsconfig/
docs/
```

## 2. 框架选型

### 2.1 Web 和后台：Next.js

用途：

- 官网
- 学生 Web 聊天端
- 老师后台
- 管理后台

为什么选它：

- React 生态成熟
- 路由、服务端渲染、鉴权和后台开发体验都很好
- 适合做内容页、管理页和复杂交互页
- 和 TypeScript、monorepo 配合很好

为什么不只用 Taro：

- Web 后台会比小程序复杂得多
- SEO、管理台、权限流这些事情，Next.js 更顺手
- 强行所有前端统一到跨端抽象层，后面大概率越做越痛苦

### 2.2 微信小程序：Taro

用途：

- 微信小程序端

为什么选它：

- 国内生态成熟
- 支持 React 风格开发
- 比直接拿 Web 项目改小程序更现实

为什么不优先选 uni-app：

- uni-app 不是不能用
- 但如果主栈已经是 React + TypeScript，Taro 的心智和代码风格更统一

### 2.3 iOS 和 Android：Expo + React Native

用途：

- iOS App
- Android App

为什么选它：

- 小团队上线速度更快
- 构建、调试、发版体验更省事
- 和 Web 端技术栈更统一

为什么不先上 Flutter：

- Flutter 也能做，但会把前端栈切成两套
- 你已经要用 React 做 Web，大概率还要用 Taro 做小程序
- 再单独引入 Flutter，会增加学习和维护成本

### 2.4 后端：NestJS

用途：

- 主业务 API
- 鉴权
- 对话编排
- 知识库与记忆服务
- 支付和后台接口

为什么选它：

- 模块化清晰
- 适合做中大型 Node 后端
- Guard、Pipe、DTO、Validation 这些都比较完整
- 适合后面拆服务和加中间层

为什么不直接用 Express：

- Express 做 demo 很快
- 但你的项目不是单接口聊天页，而是一个多模块系统
- 到后面会话、知识库、记忆、支付、后台都堆上来，结构会乱

### 2.5 数据库：PostgreSQL + pgvector

用途：

- 主业务数据
- 长期记忆
- 部分语义检索

为什么选它：

- 你的数据里有大量结构化内容：用户、老师、订阅、文档、记忆、日志
- 长期记忆本质上不能只存在向量库里
- PostgreSQL 既能存结构化业务表，也能通过 pgvector 做语义召回

为什么不直接以向量库为核心：

- 这是个产品系统，不是纯检索系统
- 如果一开始就把向量库当核心，业务数据和权限模型会很难维护

### 2.6 缓存和异步任务：Redis + BullMQ

用途：

- 文档解析任务
- 索引任务
- 记忆抽取任务
- 失败重试

为什么选它：

- 上传文档和写记忆不能阻塞聊天请求
- 需要稳定的异步任务能力和失败重试机制

### 2.7 文件存储：S3 / OSS 兼容对象存储

用途：

- 文档上传
- 图片资源
- 导出文件

为什么选它：

- 成熟、便宜、好接
- 适合和解析、索引流程对接

## 3. AI 层怎么做

### 3.1 对话编排

使用 OpenAI `Responses API`。

原因：

- 更适合当前的多轮对话和工具调用场景
- 支持 `previous_response_id` 或对话状态管理
- 比旧式做法更适合新项目

关键实现原则：

- 不要假设老师规则会自动继承
- 后端每轮都要重新加载并下发 `platform_rules + teacher_rules + user_prefs`

### 3.2 RAG 检索

第一阶段使用 OpenAI `file_search`。

原因：

- 能最快做出可用产品
- 不需要你一开始就自己搭整套复杂索引系统
- 更适合先验证需求，再决定是否自建

### 3.3 长期记忆

不要把 RAG 当成完整记忆系统。

应该拆成三层：

- 当前会话摘要
- 结构化长期记忆
- 知识库检索

原因：

- 原始聊天记录越堆越脏
- 用户需要修改和删除错误记忆
- 长期记忆必须有来源、置信度和更新时间

## 4. 推荐开发顺序

### 第一阶段

- monorepo 初始化
- Next.js Web
- NestJS API
- PostgreSQL
- OpenAI Responses API
- 老师公开知识库

### 第二阶段

- 长期记忆服务
- 用户私有知识库
- 老师规则中心
- 管理后台

### 第三阶段

- 微信小程序
- 支付
- 埋点分析

### 第四阶段

- Expo 移动端
- 推送通知
- 老师入驻

## 5. 数据模型原则

核心隔离键：

`tenant_id + teacher_id + user_id`

核心实体：

- users
- teachers
- teacher_rule_versions
- conversations
- messages
- memory_records
- knowledge_files
- knowledge_chunks
- subscriptions
- feedback_events
- audit_logs

## 6. 一开始不要做的事

- 不要先自建复杂向量检索基础设施
- 不要所有平台一起开工
- 不要让用户直接编辑系统提示词
- 不要把老师记忆和用户记忆混成一个大字段
- 不要在产品还没验证前做开放市场

## 7. 最终建议

如果你想走最现实、最稳的路线，就按这个顺序：

- 先做 `Next.js + NestJS + PostgreSQL`
- 接 `OpenAI Responses API + file_search`
- 在此基础上补自建长期记忆服务
- 先上线 `Web + 微信小程序`
- 原生 App 放到后面

这套方案最适合学生团队，开发速度、项目完整度和简历含金量之间平衡最好。
