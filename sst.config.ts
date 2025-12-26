/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "hotukdeals-discord-notifier",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
  },
  async run() {
    await import("./infra/notifier-lambda");
    await import("./infra/secrets");
    await import("./infra/auth");
    await import("./infra/site");
  },
});
