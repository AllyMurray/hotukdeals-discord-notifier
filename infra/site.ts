import { auth } from "./auth";
import { sessionSecret, adminDiscordId } from "./secrets";
import { hotukdealsTable } from "./notifier-lambda";
import { appDomainConfig } from "./domain";

export const site = new sst.aws.React("Site", {
  link: [auth, sessionSecret, adminDiscordId, hotukdealsTable],
  domain: appDomainConfig,
});
