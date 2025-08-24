# 🚀 MetaEgg デプロイメントガイド

このドキュメントでは、MetaEggシステムの本番環境へのデプロイメント手順を詳しく説明します。

## 📋 目次

- [前提条件](#前提条件)
- [環境設定](#環境設定)
- [ローカルデプロイメント](#ローカルデプロイメント)
- [Dockerデプロイメント](#dockerデプロイメント)
- [クラウドデプロイメント](#クラウドデプロイメント)
- [監視・ログ](#監視ログ)
- [トラブルシューティング](#トラブルシューティング)

## 🔧 前提条件

### システム要件

| 項目 | 最小要件 | 推奨 |
|------|----------|------|
| **CPU** | 2コア | 4コア以上 |
| **メモリ** | 2GB | 4GB以上 |
| **ストレージ** | 10GB | 50GB以上 |
| **ネットワーク** | 100Mbps | 1Gbps |

### ソフトウェア要件

- **Node.js**: 18.0.0以上
- **npm**: 8.0.0以上
- **TypeScript**: 5.2.0以上
- **PostgreSQL**: 13以上（オプション）
- **Redis**: 6以上（オプション）

## ⚙️ 環境設定

### 1. 基本設定ファイル

```bash
# 設定ディレクトリ作成
mkdir -p config

# 本番用設定ファイル作成
cat > config/production.json << EOF
{
  "system": {
    "maxConcurrency": 20,
    "defaultBatchSize": 100,
    "enableCache": true,
    "logLevel": "warn"
  },
  "cache": {
    "ttl": {
      "stockPrice": 300,
      "financialData": 3600,
      "companyInfo": 86400
    },
    "strategy": "hierarchical",
    "redis": {
      "enabled": true,
      "host": "localhost",
      "port": 6379,
      "password": "${REDIS_PASSWORD}",
      "db": 0
    }
  },
  "api": {
    "port": 3001,
    "cors": {
      "origin": ["https://yourdomain.com"],
      "credentials": true
    },
    "rateLimit": {
      "windowMs": 900000,
      "max": 1000
    }
  },
  "optimization": {
    "processingSpeedTarget": 75,
    "memoryEfficiencyTarget": 50,
    "cacheHitRateTarget": 89,
    "errorRecoveryTarget": 90,
    "enablePerformanceMonitoring": true
  },
  "database": {
    "type": "postgresql",
    "host": "${DB_HOST}",
    "port": 5432,
    "database": "${DB_NAME}",
    "username": "${DB_USER}",
    "password": "${DB_PASSWORD}",
    "ssl": true,
    "pool": {
      "min": 5,
      "max": 20
    }
  },
  "security": {
    "enableHelmet": true,
    "enableCompression": true,
    "enableCors": true,
    "trustProxy": true
  }
}
EOF
```

### 2. 環境変数設定

```bash
# .env.production
NODE_ENV=production
PORT=3001
LOG_LEVEL=warn

# データベース設定
DB_HOST=your-postgres-host
DB_PORT=5432
DB_NAME=metaegg_production
DB_USER=metaegg_user
DB_PASSWORD=your-secure-password

# Redis設定
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# セキュリティ設定
SESSION_SECRET=your-session-secret-key
JWT_SECRET=your-jwt-secret-key

# 外部API設定
YAHOO_API_KEY=your-yahoo-api-key
IRBANK_API_KEY=your-irbank-api-key

# 監視・ログ設定
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=warn
ENABLE_METRICS=true

# パフォーマンス設定
MAX_CONCURRENCY=20
OPTIMIZATION_LEVEL=maximum
ENABLE_CACHE=true
```

## 🏠 ローカルデプロイメント

### 1. 直接実行

```bash
# プロジェクトクローン
git clone https://github.com/metaegg/system.git
cd metaegg-system

# 依存関係インストール
npm ci --only=production

# TypeScriptビルド
npm run build

# 環境変数設定
cp .env.production .env

# データベース初期化（必要に応じて）
npm run db:migrate

# 本番サーバー起動
npm run start
```

### 2. PM2を使用した運用

```bash
# PM2インストール
npm install -g pm2

# PM2設定ファイル作成
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'metaegg-api',
      script: 'dist/api/server-refactored.js',
      instances: 'max',
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      log_file: 'logs/combined.log',
      time: true,
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      restart_delay: 5000,
      max_restarts: 10
    }
  ]
};
EOF

# PM2でアプリケーション起動
pm2 start ecosystem.config.js --env production

# PM2の自動起動設定
pm2 startup
pm2 save
```

## 🐳 Dockerデプロイメント

### 1. Dockerファイル

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS production

# セキュリティ向上のためnon-rootユーザー作成
RUN addgroup -g 1001 -S nodejs
RUN adduser -S metaegg -u 1001

WORKDIR /app

# 依存関係コピー
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=metaegg:nodejs . .

# TypeScriptビルド
RUN npm run build

# 不要なファイル削除
RUN rm -rf src tests scripts

# ユーザー切り替え
USER metaegg

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

EXPOSE 3001

CMD ["npm", "run", "api:start"]
```

### 2. Docker Compose設定

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  metaegg-api:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_HOST=redis
      - PORT=3001
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - metaegg-network
    volumes:
      - ./logs:/app/logs
      - ./data:/app/data
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped
    networks:
      - metaegg-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - metaegg-network
    healthcheck:
      test: ["CMD", "redis-cli", "auth", "${REDIS_PASSWORD}", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - metaegg-api
    restart: unless-stopped
    networks:
      - metaegg-network

volumes:
  postgres_data:
  redis_data:

networks:
  metaegg-network:
    driver: bridge
```

### 3. Nginx設定

```nginx
# nginx/nginx.conf
upstream metaegg_backend {
    least_conn;
    server metaegg-api:3001 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 10M;
    keepalive_timeout 65;

    location / {
        proxy_pass http://metaegg_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket対応
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # タイムアウト設定
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    location /health {
        access_log off;
        proxy_pass http://metaegg_backend/health;
    }
}
```

### 4. Docker実行

```bash
# 本番環境でDocker Compose実行
docker-compose -f docker-compose.production.yml up -d

# ログ確認
docker-compose -f docker-compose.production.yml logs -f

# スケール調整
docker-compose -f docker-compose.production.yml up -d --scale metaegg-api=4

# 停止
docker-compose -f docker-compose.production.yml down
```

## ☁️ クラウドデプロイメント

### AWS ECS

```bash
# AWS CLIインストール・設定
aws configure

# ECRリポジトリ作成
aws ecr create-repository --repository-name metaegg

# Dockerイメージビルド・プッシュ
./scripts/deploy-aws.sh

# ECSタスク定義作成
aws ecs register-task-definition --cli-input-json file://aws/task-definition.json

# ECSサービス作成
aws ecs create-service --cluster metaegg-cluster --service-name metaegg-service \
  --task-definition metaegg:1 --desired-count 2
```

### Google Cloud Run

```bash
# Google Cloud SDKインストール・認証
gcloud auth login
gcloud config set project your-project-id

# Container Registryにプッシュ
docker tag metaegg:latest gcr.io/your-project-id/metaegg:latest
docker push gcr.io/your-project-id/metaegg:latest

# Cloud Runデプロイ
gcloud run deploy metaegg-service \
  --image gcr.io/your-project-id/metaegg:latest \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --port 3001 \
  --memory 1Gi \
  --cpu 1 \
  --concurrency 100 \
  --min-instances 1 \
  --max-instances 10
```

### Azure Container Instances

```bash
# Azure CLIインストール・ログイン
az login

# コンテナグループ作成
az container create \
  --resource-group metaegg-rg \
  --name metaegg-container \
  --image metaegg:latest \
  --dns-name-label metaegg-app \
  --ports 3001 \
  --memory 2 \
  --cpu 1 \
  --environment-variables NODE_ENV=production \
  --restart-policy Always
```

## 📊 監視・ログ

### 1. ログ設定

```javascript
// config/logging.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

module.exports = logger;
```

### 2. プロメテウス・Grafana監視

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana:/etc/grafana/provisioning

volumes:
  grafana_data:
```

### 3. ヘルスチェック監視

```bash
# ヘルスチェックスクリプト
cat > scripts/health-check.sh << EOF
#!/bin/bash

ENDPOINT="http://localhost:3001/health"
TIMEOUT=10

response=$(curl -s -w "%{http_code}" --max-time $TIMEOUT $ENDPOINT)
http_code=${response: -3}

if [ $http_code -eq 200 ]; then
    echo "✅ Health check passed"
    exit 0
else
    echo "❌ Health check failed (HTTP $http_code)"
    exit 1
fi
EOF

chmod +x scripts/health-check.sh

# cronでヘルスチェック実行
echo "*/1 * * * * /path/to/scripts/health-check.sh" | crontab -
```

## 🛠️ トラブルシューティング

### よくある問題と解決策

#### 1. メモリ不足

```bash
# メモリ使用量確認
free -h
docker stats

# Node.jsメモリ制限設定
export NODE_OPTIONS="--max-old-space-size=1024"

# PM2メモリ再起動設定
pm2 start ecosystem.config.js --max-memory-restart 1G
```

#### 2. データベース接続エラー

```bash
# PostgreSQL接続確認
psql -h $DB_HOST -U $DB_USER -d $DB_NAME

# Redis接続確認
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping

# 接続プール設定調整
# config/production.jsonでpool設定を調整
```

#### 3. パフォーマンス低下

```bash
# CPU・メモリ監視
top
htop

# Node.jsプロファイリング
node --prof app.js
node --prof-process isolate-*-v8.log

# パフォーマンステスト実行
npm run test:performance
```

#### 4. ログ確認

```bash
# アプリケーションログ
tail -f logs/combined.log

# Dockerログ
docker-compose logs -f metaegg-api

# PM2ログ
pm2 logs metaegg-api
```

### 緊急時対応

#### 1. サービス再起動

```bash
# PM2再起動
pm2 restart metaegg-api

# Docker再起動
docker-compose restart metaegg-api

# システムサービス再起動
systemctl restart metaegg
```

#### 2. ロールバック

```bash
# Dockerイメージロールバック
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d --scale metaegg-api=2

# コードロールバック
git checkout previous-stable-version
npm run build
pm2 restart metaegg-api
```

#### 3. データベースバックアップ

```bash
# PostgreSQLバックアップ
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME > backup-$(date +%Y%m%d_%H%M%S).sql

# Redisバックアップ
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD --rdb backup.rdb
```

## 📞 サポート

デプロイメントに関する問題や質問がある場合は、以下にお問い合わせください：

- **GitHub Issues**: [Issues](https://github.com/metaegg/system/issues)
- **Email**: devops@metaegg.com
- **Slack**: #metaegg-support

---

このガイドにより、MetaEggシステムを安全かつ効率的に本番環境にデプロイできます。