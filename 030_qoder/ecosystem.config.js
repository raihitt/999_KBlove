module.exports = {
  apps: [
    {
      name: 'metaegg-api',
      script: 'dist/api/server-refactored.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        OPTIMIZATION_LEVEL: 'maximum',
        ENABLE_CACHE: 'true',
        LOG_LEVEL: 'warn'
      },
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      log_file: 'logs/combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: ['node_modules', 'logs', '*.log'],
      restart_delay: 5000,
      max_restarts: 10,
      autorestart: true,
      kill_timeout: 5000,
      listen_timeout: 10000,
      increment_var: 'PORT',
      merge_logs: true,
      instance_var: 'INSTANCE_ID'
    },
    {
      name: 'metaegg-scheduler',
      script: 'dist/cli/scheduler.js',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        SCHEDULE_INTERVAL: '3600000',  // 1時間毎
        AUTO_OPTIMIZATION: 'true'
      },
      cron_restart: '0 2 * * *',  // 毎日2:00に再起動
      error_file: 'logs/scheduler-err.log',
      out_file: 'logs/scheduler-out.log',
      log_file: 'logs/scheduler-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 5
    }
  ],

  deploy: {
    production: {
      user: 'metaegg',
      host: ['your-production-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:metaegg/system.git',
      path: '/var/www/metaegg',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci --only=production && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    },
    staging: {
      user: 'metaegg',
      host: ['your-staging-server.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:metaegg/system.git',
      path: '/var/www/metaegg-staging',
      'post-deploy': 'npm ci && npm run build && pm2 reload ecosystem.config.js --env staging'
    }
  }
};