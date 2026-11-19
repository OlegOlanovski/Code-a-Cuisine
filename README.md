# Code à Cuisine

Code à Cuisine is an AI-powered recipe generator that turns available ingredients into three personalized recipe suggestions. Users can choose serving size, cooking time, cuisine, dietary preferences, and the number of people cooking. Generated recipes are stored in Firebase and are available to everyone through the public cookbook.

Repository: [github.com/OlegOlanovski/Code-a-Cuisine](https://github.com/OlegOlanovski/Code-a-Cuisine)

## Features

- Ingredient entry with quantity, unit, autocomplete, editing, and removal
- Recipe preferences for 1–12 portions and 1–3 cooks
- Quick, medium, and complex cooking-time categories
- German, Italian, Indian, Japanese, Gourmet, and Fusion cuisines
- Vegetarian, vegan, keto, and unrestricted diets
- Three AI-generated recipe suggestions per request
- Chef assignments, parallel-step metadata, and waiting times
- Nutrition information per serving and for the complete recipe in the stored data
- Public Firebase recipe library with cuisine categories, likes, and pagination
- IP-based and system-wide recipe quotas enforced by n8n
- Responsive layouts for smartphone, tablet, desktop, and widescreen displays
- Accessible loading, validation, empty, and error states

## Technology

- Angular 22 and TypeScript
- SCSS
- Firebase Authentication and Realtime Database
- n8n workflow automation
- Google Gemini
- Docker Compose and nginx
- Vitest

## Architecture

```text
Angular frontend
      |
      v
nginx quota gateway
      |
      v
n8n workflow ----> Google Gemini
      |
      v
Firebase Realtime Database
```

The Angular application sends ingredients and preferences to the n8n webhook. The workflow validates the request, checks the daily quota, generates exactly three recipes with Gemini, stores them in Firebase, updates the quota, and returns the saved recipes to the frontend.

## Requirements

- Node.js 22 or newer
- npm 11 or newer
- Docker with Docker Compose
- Firebase project with Anonymous Authentication and Realtime Database enabled
- Google Gemini credentials configured in n8n

## Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/OlegOlanovski/Code-a-Cuisine.git
cd Code-a-Cuisine
npm install
```

## Frontend configuration

Local environment files are intentionally excluded from Git. Create both files:

- `src/environments/environment.ts`
- `src/environments/environment.development.ts`

Use this structure and insert the public configuration from your Firebase project:

```ts
export const environment = {
  production: false,
  n8nWebhookUrl: 'http://localhost:5679/webhook/generate-recipes',
  firebase: {
    apiKey: 'YOUR_FIREBASE_API_KEY',
    authDomain: 'YOUR_PROJECT.firebaseapp.com',
    databaseURL: 'https://YOUR_DATABASE.firebasedatabase.app',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT.firebasestorage.app',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
    appId: 'YOUR_APP_ID',
  },
};
```

Set `production: true` in `environment.ts`. For a deployed application, also replace `n8nWebhookUrl` with the public HTTPS address of the quota gateway.

## Firebase setup

1. Create a Firebase project.
2. Enable **Authentication > Sign-in method > Anonymous**.
3. Create a Realtime Database in the appropriate region.
4. Add the Firebase web-app configuration to both Angular environment files.
5. Configure database access for `recipes`.
6. Merge the `quota` child from `n8n/firebase-quota-rules-snippet.json` into the existing Realtime Database rules and publish them.

Do not replace the existing `recipes` rules when adding the quota rules.

## n8n setup

Start n8n and the quota gateway:

```bash
docker compose up -d
```

Open n8n through the local instance, configure the Google Gemini credential, and import the workflow:

```bash
docker compose exec -u node n8n \
  n8n import:workflow --input=/workflows/code-a-cuisine.json
```

Publish the imported workflow and restart n8n:

```bash
docker compose exec -u node n8n \
  n8n publish:workflow --id=jbQPlrHD9efaS8X0
docker compose restart n8n
```

The frontend communicates with the gateway at `http://localhost:5679`. The gateway replaces forwarded IP headers with the real connection address before forwarding requests to n8n.

### CORS for deployment

The exported workflow currently permits `http://localhost:4200`. Before deployment, update `allowedOrigins` for both webhook nodes in `n8n/code-a-cuisine.json` to the final frontend domain, then import and publish the workflow again.

## Development

Start the Angular development server:

```bash
npm start
```

Open [http://localhost:4200](http://localhost:4200).

The complete local application requires the Angular server, n8n container, quota gateway, Firebase configuration, and published n8n workflow to be available.

## Tests

Run the Angular unit tests once:

```bash
npm test -- --watch=false
```

Validate the n8n quota workflow without making external API requests:

```bash
npm run test:quota
```

## Production build

```bash
npm run build
```

The optimized frontend is written to `dist/code-a-cuisine`.

## Daily quota

The quota is tracked by public IP address and Berlin calendar date. IPv4 and IPv6 addresses are normalized and validated. The gateway prevents clients from spoofing forwarded IP headers, and n8n serializes production executions to prevent concurrent quota updates from racing.

Current workflow limits:

- Three recipes are generated per successful request
- Nine recipes per public IP per day
- Twelve recipes across the whole system per day

Quota data is stored under:

```text
quota/<YYYY-MM-DD>/byIp/<normalized-IP>/count
```

Deleting one IP entry resets that network's allowance. Deleting the date entry resets the complete daily quota.

## Error logging

Failed workflow execution data is retained by n8n. The exported workflow includes `On Workflow Error` and `Format and Log Error` nodes intended to create a structured `n8n_workflow_error` entry. Container logs are also persisted to `/home/node/.n8n/logs/n8n.log`.

```bash
docker compose logs -f n8n
docker compose exec n8n tail -f /home/node/.n8n/logs/n8n.log
```

The n8n Error Trigger only runs for automatic or production executions, not manual editor executions.

## Repository structure

```text
src/app/                    Angular application
src/app/pages/              Application pages
src/app/services/           Firebase and recipe-generation services
src/app/models/             Shared recipe data model
public/                     Images, icons, and loading animation
n8n/code-a-cuisine.json     Exported n8n workflow
n8n/nginx.conf              IP-preserving quota gateway
scripts/                    Workflow checks and seed data
compose.yaml                Local n8n and nginx services
```

## Available scripts

| Command                     | Description                           |
| --------------------------- | ------------------------------------- |
| `npm start`                 | Start the Angular development server  |
| `npm run build`             | Create an optimized production build  |
| `npm test -- --watch=false` | Run Angular unit tests once           |
| `npm run test:quota`        | Validate quota and workflow structure |

## License

This project was created as an educational project for the Code à Cuisine assignment.
