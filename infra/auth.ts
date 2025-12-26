import { discordClientId, discordClientSecret } from "./secrets";
import { authDomainConfig } from "./domain";

export const auth = new sst.aws.Auth("Auth", {
  issuer: {
    handler: "functions/auth.handler",
    link: [discordClientId, discordClientSecret],
  },
  domain: authDomainConfig,
});
