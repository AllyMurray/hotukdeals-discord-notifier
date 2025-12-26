import { discordClientId, discordClientSecret } from "./secrets";

export const auth = new sst.aws.Auth("Auth", {
  issuer: {
    handler: "functions/auth.handler",
    link: [discordClientId, discordClientSecret],
  },
});
