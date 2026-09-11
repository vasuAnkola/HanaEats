module.exports = {
  apps: [
    {
      name: "hanaeats",
      cwd: "/var/www/hanaeats/app",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3016",
      env: {
        NODE_ENV: "production",
        PORT: "3016",
      },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
