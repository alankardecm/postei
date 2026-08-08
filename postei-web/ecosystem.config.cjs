// O `next start` le a PORTA da variavel de ambiente real do processo --
// nao do .env.production. Por isso ela vai aqui, e nao no arquivo de env.
module.exports = {
  apps: [
    {
      name: "postei-web",
      cwd: "/opt/postei-web",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: "4720",
        HOSTNAME: "127.0.0.1",
      },
      max_restarts: 5,
      restart_delay: 3000,
    },
  ],
};
