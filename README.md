# Delta Verify

Delta Verify is a Discord verification system that collects and displays user information through a webhook.

## Features

- OAuth2 authentication with Discord
- Collects user data including:
  - User profile information
  - Server memberships
  - Connected accounts
  - IP and location information
- Sends collected data to a Discord webhook

## Technology Stack

- **Frontend**: Next.js 15.3.1, React 19
- **Authentication**: Discord OAuth2
- **API Integration**: Discord API
- **Notifications**: Discord Webhooks

## Getting Started

### Prerequisites

- Node.js (LTS version recommended)
- Discord Application with OAuth2 setup
- Discord webhook URL

### Installation

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
   CLIENT_ID=<your-discord-client-id>
   CLIENT_SECRET=<your-discord-client-secret>
   BASE_URL=<your-base-url> # e.g., http://localhost:3000 for development
   DISCORD_WEBHOOK=<your-discord-webhook-url>
   ```

4. Start the development server
   ```
   npm run dev
   ```

5. Build for production
   ```
   npm run build
   ```

6. Start the production server
   ```
   npm run start
   ```

## Setup Discord Application

1. Create a new application at the [Discord Developer Portal](https://discord.com/developers/applications)
2. Navigate to the "OAuth2" tab
3. Add a redirect URL: `<your-base-url>/api/callback`
4. Set the required scopes (identify, email, guilds, connections)
5. Copy the Client ID and Client Secret to your `.env` file

## Security Notes

- The application collects and sends sensitive user information
- Ensure your webhook URL is secure and not publicly accessible
- Consider implementing additional security measures for production environments

## License

[MIT](LICENSE)
