// Single table design for HotUKDeals notifier
// Uses ElectroDB with the following access patterns:
// - Channel: Query by channelId (PK), list all via GSI1
// - SearchTermConfig: Query by channelId (PK), list all via GSI1, lookup by searchTerm via GSI2
// - Deal: Query by dealId (PK)

const hotukdealsTable = new sst.aws.Dynamo("HotUKDealsTable", {
  fields: {
    pk: "string",      // Partition key
    sk: "string",      // Sort key
    gsi1pk: "string",  // GSI1 partition key (for listing all configs)
    gsi1sk: "string",  // GSI1 sort key
    gsi2pk: "string",  // GSI2 partition key (for lookup by search term)
    gsi2sk: "string",  // GSI2 sort key
  },
  primaryIndex: { hashKey: "pk", rangeKey: "sk" },
  globalIndexes: {
    gsi1: { hashKey: "gsi1pk", rangeKey: "gsi1sk" },
    gsi2: { hashKey: "gsi2pk", rangeKey: "gsi2sk" },
  },
  ttl: "ttl",  // TTL attribute for Deal entity (12 month expiry)
  transform: {
    table(args) {
      args.name = 'hotukdeals';
    },
  },
});

const notifierLambda = new sst.aws.Cron("NotifierLambda", {
  function: {
    name: "hotukdeals-discord-notifier",
    handler: "src/notifier.handler",
    timeout: "30 seconds",
    environment: {
      TABLE_NAME: hotukdealsTable.name,
    },
    permissions: [
      {
        actions: [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:Query",
          "dynamodb:DeleteItem",
          "dynamodb:UpdateItem",
        ],
        resources: [
          hotukdealsTable.arn,
          $interpolate`${hotukdealsTable.arn}/index/*`,
        ],
      },
    ],
  },
  schedule: "rate(1 minute)",
});

export { hotukdealsTable, notifierLambda };
