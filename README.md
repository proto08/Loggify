# 🔰 Delta Verify

Delta Verify is a Discord verification system that collects and displays user information through a webhook and stores data in Supabase.

## ⚠️ Disclaimer

**This application is developed for educational purposes only. The developers do not take any responsibility for any damages or issues that may arise from the use of this application. Unauthorized use for malicious purposes is strictly prohibited.**

## ✨ Features

- 🔐 OAuth2 authentication with Discord
- 📊 Collects user data including:
  - 👤 User profile information
  - 🏢 Server memberships
  - 🔗 Connected accounts
  - 🌐 IP and location information
- 📡 Sends collected data to a Discord webhook
- 💾 Stores verification data in Supabase database

## 🛠️ Technology Stack

- 🖥️ **Frontend**: Next.js 15.3.1, React 19
- 🔑 **Authentication**: Discord OAuth2
- 🔄 **API Integration**: Discord API
- 📨 **Notifications**: Discord Webhooks
- 🗃️ **Database**: Supabase

## 🚀 Getting Started

### 📋 Prerequisites

- 📦 Node.js (LTS version recommended)
- 🎮 Discord Application with OAuth2 setup
- 📢 Discord webhook URL
- 🔋 Supabase account and project

### 📥 Installation

1. Clone the repository
   ```
   git clone https://github.com/yuk228/delta-verify.git
   cd delta-verify
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   # Discord Configuration
   CLIENT_ID=<your-discord-client-id>
   CLIENT_SECRET=<your-discord-client-secret>
   BASE_URL=<your-base-url> # e.g., http://localhost:3000 for development
   DISCORD_WEBHOOK=<your-discord-webhook-url>
   
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=<your-supabase-project-url>
   SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
   ```

4. Set up your Supabase database:
   - Create a `log` table with the following columns:
     - `user_id` (text, primary key)
     - `user_name` (text)
     - `global_name` (text, nullable)
     - `email` (text, nullable)
     - `mfa_enabled` (boolean, nullable)
     - `locale` (text, nullable)
     - `verified` (boolean, nullable)
     - `ip` (text)
     - `user_agent` (text)
     - `refresh_token` (text)
     - `created_at` (timestamp with timezone)

5. Start the development server
   ```
   npm run dev
   ```

6. Build for production
   ```
   npm run build
   ```

7. Start the production server
   ```
   npm run start
   ```

## 🎮 Setup Discord Application

1. Create a new application at the [Discord Developer Portal](https://discord.com/developers/applications)
2. Navigate to the "OAuth2" tab
3. Add a redirect URL: `<your-base-url>/api/callback`
4. Set the required scopes (identify, email, guilds, connections)
5. Copy the Client ID and Client Secret to your `.env` file

## 🗃️ Setup Supabase

1. Create a new project at [Supabase](https://supabase.com)
2. Create the `log` table as described in the installation section
3. Get your project URL and API keys from the Settings > API section
4. Add these credentials to your `.env` file
5. For production, ensure Row Level Security (RLS) policies are properly configured

## 🔒 Security Notes

- ⚠️ The application collects and sends sensitive user information
- 🛡️ Ensure your webhook URL is secure and not publicly accessible
- 🔐 The Supabase service role key has admin privileges - keep it secure
- 🔍 Consider implementing additional security measures for production environments
- 🚫 Remember that this application is for educational purposes only
- ⚖️ Using this application to collect data without proper consent may violate privacy laws and terms of service

## 📜 License

[MIT](LICENSE)
