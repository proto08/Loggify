export type DiscordUser = {
  id: string;
  username: string;
  avatar?: string;
  accent_color?: string;
  global_name?: string;
  primary_guild: {
    identity_guild_id?: string;
    tag?: string;
  };
  mfa_enabled: boolean;
  locale: string;
  email?: string;
  verified: boolean;
};