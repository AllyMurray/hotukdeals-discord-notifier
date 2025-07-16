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

const configTable = new sst.aws.Dynamo("ConfigTable", {
  fields: {
    searchTerm: "string",
  },
  primaryIndex: { hashKey: "searchTerm" },
  transform: {
    table(args, opts, name) {
        args.name = 'hotukdeals-config'
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
      CONFIG_TABLE_NAME: configTable.name,
    },
    permissions: [
      {
        actions: ["dynamodb:GetItem", "dynamodb:PutItem"],
        resources: [dealsTable.arn],
      },
      {
        actions: ["dynamodb:Scan"],
        resources: [configTable.arn],
      },
    ],
  },
  schedule: "rate(1 minute)",
});

export { dealsTable, configTable, notifierLambda };