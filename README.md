# Auto-Deploy Portfolio Backend

A lightweight Node.js backend service that automates the deployment of HTML portfolios to Netlify. Simply send your HTML content and get a live URL instantly.

## Features

- **Instant Deployment** — Deploy HTML portfolios to Netlify in seconds
- **Auto-Generated URLs** — Creates unique subdomain names based on usernames
- **Collision Handling** — Automatically increments site names if already taken
- **HTML Sanitization** — Cleans and normalizes HTML content before deployment
- **File Upload Support** — Accept HTML as raw text or file upload
- **Health Monitoring** — Built-in health check endpoint

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- A [Netlify](https://www.netlify.com/) account
- Netlify Personal Access Token

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd auto-deploy
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the root directory:

   ```env
   NETLIFY_TOKEN=your_netlify_personal_access_token
   PORT=3000
   ```

   > To generate a Netlify token, go to [Netlify User Settings > Applications](https://app.netlify.com/user/applications) and create a new personal access token.

## Usage

### Start the Server

```bash
npm start
```

The server will start on the configured port (default: 3000).

### API Endpoints

#### Deploy Portfolio

```http
POST /deploy
```

**Request Body (JSON):**

| Parameter  | Type   | Required | Description                       |
|------------|--------|----------|-----------------------------------|
| `username` | string | Yes      | Username for site subdomain       |
| `html`     | string | Yes*     | HTML content to deploy            |

*Alternatively, you can send an HTML file as `portfolio` in a multipart form.

**Example Request:**

```bash
curl -X POST http://localhost:3000/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "html": "<!DOCTYPE html><html><head><title>My Portfolio</title></head><body><h1>Hello World</h1></body></html>"
  }'
```

**Success Response:**

```json
{
  "success": true,
  "url": "https://johndoe-portfolio.netlify.app",
  "siteId": "abc123",
  "deployId": "xyz789",
  "sslUrl": "https://johndoe-portfolio.netlify.app"
}
```

#### Health Check

```http
GET /health
```

**Response:**

```json
{
  "status": "ok",
  "token": "✓"
}
```

## How It Works

1. **Site Creation** — Creates a new Netlify site with a sanitized subdomain based on the username
2. **HTML Processing** — Cleans the HTML content by normalizing escape sequences
3. **ZIP Packaging** — Bundles the HTML with proper headers and Netlify configuration
4. **Deployment** — Uploads the ZIP to Netlify and returns the live URL

## Project Structure

```
auto-deploy/
├── server.js       # Main application entry point
├── package.json    # Project dependencies and scripts
├── .env            # Environment variables (not tracked)
└── README.md       # Documentation
```

## Configuration

| Environment Variable | Description                          | Default |
|---------------------|--------------------------------------|---------|
| `NETLIFY_TOKEN`     | Netlify Personal Access Token        | —       |
| `PORT`              | Server port                          | 3000    |
| `NODE_ENV`          | Environment (development/production) | —       |

## Error Handling

The API returns appropriate HTTP status codes:

- `200` — Successful deployment
- `400` — Bad request (missing username or HTML)
- `500` — Server error (Netlify API issues or internal errors)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
