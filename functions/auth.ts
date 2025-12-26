import { handle } from "hono/aws-lambda";
import { issuer } from "@openauthjs/openauth";
import { DiscordProvider } from "@openauthjs/openauth/provider/discord";
import { subjects } from "./subjects";
import { Resource } from "sst";

interface DiscordUser {
  id: string;
  email: string;
  username: string;
  avatar: string | null;
  discriminator: string;
  global_name: string | null;
}

const app = issuer({
  subjects,
  allow: async () => true,
  providers: {
    discord: DiscordProvider({
      clientID: Resource.DiscordClientId.value,
      clientSecret: Resource.DiscordClientSecret.value,
      scopes: ["identify", "email"],
    }),
  },
  success: async (ctx, value) => {
    if (value.provider === "discord") {
      const response = await fetch("https://discord.com/api/users/@me", {
        headers: {
          Authorization: `Bearer ${value.tokenset.access}`,
        },
      });
      const discordUser = (await response.json()) as DiscordUser;

      const avatarUrl = discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : undefined;

      return ctx.subject("user", {
        id: discordUser.id,
        email: discordUser.email,
        username: discordUser.global_name || discordUser.username,
        avatar: avatarUrl,
      });
    }

    throw new Error("Unknown provider");
  },
});

export const handler = handle(app);
