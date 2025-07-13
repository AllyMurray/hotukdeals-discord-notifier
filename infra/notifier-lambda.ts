const dealsTable = new sst.aws.Dynamo("DealsTable", {
  fields: {
    id: "string",
  },
  primaryIndex: { hashKey: "id" },
  transform: {
    table(args, opts, name) {
        args.name = 'hotukdeals-processed-deals'
    },
  }
});

const notifierLambda = new sst.aws.Cron("NotifierLambda", {
  function: {
    name: "hotukdeals-discord-notifier",
    handler: "src/notifier.handler",
    timeout: "30 seconds",
    environment: {
      DYNAMODB_TABLE_NAME: dealsTable.name,
      DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL!,
      SEARCH_TERMS: process.env.SEARCH_TERMS || "steam-deck",
    },
    permissions: [
      {
        actions: ["dynamodb:GetItem", "dynamodb:PutItem"],
        resources: [dealsTable.arn],
      },
    ],
  },
  schedule: "rate(1 minute)",
});

export { dealsTable, notifierLambda };