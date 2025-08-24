#!/bin/bash

# MetaEgg本番デプロイメントスクリプト
# Usage: ./scripts/deploy.sh [production|staging]

set -e

# カラー出力設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 環境設定
ENVIRONMENT=${1:-production}
PROJECT_NAME="metaegg"
BACKUP_DIR="backups"
DEPLOY_DATE=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}🚀 MetaEgg デプロイメント開始 - 環境: ${ENVIRONMENT}${NC}"

# 引数チェック
if [[ "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "staging" ]]; then
    echo -e "${RED}❌ エラー: 環境は 'production' または 'staging' を指定してください${NC}"
    exit 1
fi

# 前提条件チェック
echo -e "${YELLOW}📋 前提条件チェック中...${NC}"

# Node.js チェック
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js がインストールされていません${NC}"
    exit 1
fi

# Docker チェック
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker がインストールされていません${NC}"
    exit 1
fi

# Docker Compose チェック
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose がインストールされていません${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 前提条件チェック完了${NC}"

# 設定ファイルチェック
echo -e "${YELLOW}📋 設定ファイルチェック中...${NC}"

ENV_FILE=".env.${ENVIRONMENT}"
if [[ ! -f "$ENV_FILE" ]]; then
    echo -e "${RED}❌ 環境設定ファイル ${ENV_FILE} が見つかりません${NC}"
    echo -e "${YELLOW}💡 .env.production.template をコピーして作成してください${NC}"
    exit 1
fi

CONFIG_FILE="config/${ENVIRONMENT}.json"
if [[ ! -f "$CONFIG_FILE" ]]; then
    echo -e "${RED}❌ 設定ファイル ${CONFIG_FILE} が見つかりません${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 設定ファイルチェック完了${NC}"

# バックアップ作成
echo -e "${YELLOW}💾 バックアップ作成中...${NC}"
mkdir -p "$BACKUP_DIR"

# データベースバックアップ（本番環境のみ）
if [[ "$ENVIRONMENT" == "production" ]]; then
    if docker ps | grep -q metaegg-postgres; then
        echo -e "${BLUE}🗃️ データベースバックアップ中...${NC}"
        docker exec metaegg-postgres pg_dump -U metaegg metaegg > "${BACKUP_DIR}/db_backup_${DEPLOY_DATE}.sql"
        echo -e "${GREEN}✅ データベースバックアップ完了${NC}"
    fi
fi

# 設定ファイルバックアップ
cp -r config "${BACKUP_DIR}/config_backup_${DEPLOY_DATE}"
echo -e "${GREEN}✅ バックアップ作成完了${NC}"

# 依存関係インストール
echo -e "${YELLOW}📦 依存関係インストール中...${NC}"
npm ci --only=production
echo -e "${GREEN}✅ 依存関係インストール完了${NC}"

# TypeScriptビルド
echo -e "${YELLOW}🔨 TypeScriptビルド中...${NC}"
npm run build
echo -e "${GREEN}✅ TypeScriptビルド完了${NC}"

# テスト実行
echo -e "${YELLOW}🧪 テスト実行中...${NC}"
npm run test:production
if [[ $? -ne 0 ]]; then
    echo -e "${RED}❌ テストに失敗しました。デプロイを中止します${NC}"
    exit 1
fi
echo -e "${GREEN}✅ テスト完了${NC}"

# Docker イメージビルド
echo -e "${YELLOW}🐳 Dockerイメージビルド中...${NC}"
docker build -t "${PROJECT_NAME}:${DEPLOY_DATE}" .
docker tag "${PROJECT_NAME}:${DEPLOY_DATE}" "${PROJECT_NAME}:latest"
echo -e "${GREEN}✅ Dockerイメージビルド完了${NC}"

# 既存サービス停止
echo -e "${YELLOW}⏹️ 既存サービス停止中...${NC}"
if docker-compose -f docker-compose.${ENVIRONMENT}.yml ps | grep -q Up; then
    docker-compose -f docker-compose.${ENVIRONMENT}.yml down
fi
echo -e "${GREEN}✅ 既存サービス停止完了${NC}"

# 新サービス起動
echo -e "${YELLOW}🚀 新サービス起動中...${NC}"
docker-compose -f docker-compose.${ENVIRONMENT}.yml up -d
echo -e "${GREEN}✅ 新サービス起動完了${NC}"

# ヘルスチェック
echo -e "${YELLOW}🩺 ヘルスチェック中...${NC}"
MAX_RETRIES=30
RETRY_COUNT=0

while [[ $RETRY_COUNT -lt $MAX_RETRIES ]]; do
    if curl -s http://localhost:3001/health | grep -q '"success":true'; then
        echo -e "${GREEN}✅ サービスが正常に起動しました${NC}"
        break
    fi
    
    echo -e "${YELLOW}⏳ サービス起動待機中... (${RETRY_COUNT}/${MAX_RETRIES})${NC}"
    sleep 5
    ((RETRY_COUNT++))
done

if [[ $RETRY_COUNT -eq $MAX_RETRIES ]]; then
    echo -e "${RED}❌ サービスの起動に失敗しました${NC}"
    echo -e "${YELLOW}📋 ログを確認してください:${NC}"
    docker-compose -f docker-compose.${ENVIRONMENT}.yml logs metaegg-api
    exit 1
fi

# パフォーマンステスト
echo -e "${YELLOW}⚡ パフォーマンステスト実行中...${NC}"
npm run test:performance:production
echo -e "${GREEN}✅ パフォーマンステスト完了${NC}"

# デプロイ情報表示
echo -e "${GREEN}🎉 デプロイメント完了！${NC}"
echo -e "${BLUE}📊 デプロイ情報:${NC}"
echo -e "  🌍 環境: ${ENVIRONMENT}"
echo -e "  📅 日時: ${DEPLOY_DATE}"
echo -e "  🏷️ イメージタグ: ${PROJECT_NAME}:${DEPLOY_DATE}"
echo -e "  🔗 API URL: http://localhost:3001"
echo -e "  📈 ダッシュボード: http://localhost:3001"
echo -e "  📊 監視: http://localhost:3000 (Grafana)"

# 後片付け
echo -e "${YELLOW}🧹 後片付け中...${NC}"
docker image prune -f
echo -e "${GREEN}✅ 後片付け完了${NC}"

echo -e "${GREEN}🚀 MetaEgg デプロイメント正常完了！${NC}"