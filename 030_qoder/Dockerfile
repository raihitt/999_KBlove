# MetaEgg本番環境用Dockerfile
FROM node:18-alpine AS builder

# 作業ディレクトリ設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係インストール（開発依存含む）
RUN npm ci

# ソースコードコピー
COPY . .

# TypeScriptビルド
RUN npm run build

# 本番用イメージ
FROM node:18-alpine AS production

# セキュリティ: 非rootユーザー作成
RUN addgroup -g 1001 -S metaegg && \
    adduser -S metaegg -u 1001

# 作業ディレクトリ設定
WORKDIR /app

# package.jsonコピー
COPY package*.json ./

# 本番依存関係のみインストール
RUN npm ci --only=production && npm cache clean --force

# ビルド済みファイルコピー
COPY --from=builder --chown=metaegg:metaegg /app/dist ./dist
COPY --from=builder --chown=metaegg:metaegg /app/config ./config
COPY --from=builder --chown=metaegg:metaegg /app/docs ./docs
COPY --from=builder --chown=metaegg:metaegg /app/scripts ./scripts

# ログディレクトリ作成
RUN mkdir -p logs output data && \
    chown -R metaegg:metaegg logs output data

# 非rootユーザーに切り替え
USER metaegg

# ポート公開
EXPOSE 3001

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/health').then(r => r.json()).then(d => d.success ? process.exit(0) : process.exit(1))" || exit 1

# 起動コマンド
CMD ["node", "dist/api/server-refactored.js"]