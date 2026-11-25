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
- Anonymous-user and system-wide recipe quotas enforced by n8n
- Responsive layouts for smartphone, tablet, desktop, and widescreen displays
- Accessible loading, validation, empty, and error states

## Technology

- Angular 22 and TypeScript
- SCSS
- Firebase Authentication and Realtime Database
- n8n workflow automation
- Google Gemini
- Docker Compose
- Vitest

## Architecture

```text
Angular frontend ----> Firebase generation queue
                              ^
                              | polls every 10 seconds
                              |
                     local n8n workflow ----> Google Gemini
                              |
                              v
                     Firebase recipes and queue result
```

The Angular application never connects directly to the computer running n8n. It writes a pending request to Firebase and listens for its status. One scheduled n8n workflow finds pending requests, validates the request and quota, generates recipes with Gemini, stores them, and writes either the recipes or an error back to the Firebase queue. This makes the deployed frontend usable without exposing n8n or creating a public tunnel.

## Demo and project evaluation

The submitted Developer Akademie URL contains the compiled Angular frontend. No installation, account, or local development server is required to review the hosted demo.

The application uses two different backend components:

- Firebase is hosted in the cloud. The cookbook, saved recipes, recipe details, and likes remain available independently of the project author's computer.
- n8n is self-hosted for this educational demonstration. AI recipe generation is available during the agreed review period while the project author's computer and Docker services are running.

> [!IMPORTANT]
> Firebase is the bridge between the public frontend and local n8n. No inbound connection, public n8n URL, or HTTPS tunnel is required. If n8n is temporarily offline, new generation requests remain pending in Firebase until the queue workflow is available again.

### Suggested review flow

1. Open the submitted Developer Akademie project URL and select **Get started**.
2. Add at least one ingredient with a quantity and unit. For example, add `Pasta` with `200 gram` and `Tomato` with `150 gram`.
3. Select **Next step**.
4. Choose the portions, number of cooks, cooking time, cuisine, and diet preference.
5. Select **Generate recipe** and wait for the AI workflow to return three suggestions.
6. Open a generated recipe and review its ingredients, nutrition information, cooking steps, and chef assignments.
7. Open **Cookbook**, browse a cuisine, open an existing recipe, and test the like button.
8. Resize the browser or use browser device emulation to review the smartphone, tablet, desktop, and widescreen layouts.

No login is required. Recipe generation is intentionally limited by a daily quota. If that quota has already been reached, the application displays the corresponding message; existing cookbook content remains available.

### Maintainer checklist before the review

The following steps are performed by the project author, not by the reviewer:

1. Start Docker Desktop and run `docker compose up -d` in the project directory.
2. Confirm that `code-a-cuisine-n8n` is running.
3. Confirm that **Code-a-Cuisine Firebase Queue** is published in n8n.
4. Confirm that the Google Gemini credential is connected to the workflow.
5. Run `npm run build` and upload the contents of `dist/code-a-cuisine/browser` to the frontend server.
6. Keep the computer, Docker services, and internet connection running for the agreed review period. Disable sleep mode for that period.
7. Test one complete generation through the deployed URL in a private browser window. A request can remain pending for up to ten seconds before processing starts.

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

Set `production: true` in `environment.ts`. The same Firebase project must be used by the frontend and the n8n workflow. No n8n URL is included in the frontend configuration.

## Firebase setup

1. Create a Firebase project.
2. Enable **Authentication > Sign-in method > Anonymous**.
3. Create a Realtime Database in the appropriate region.
4. Add the Firebase web-app configuration to both Angular environment files.
5. Configure database access for `recipes`.
6. Merge the `quota` child from `n8n/firebase-quota-rules-snippet.json` into the existing Realtime Database rules.
7. Merge `generationRequests` from `n8n/firebase-generation-queue-rules-snippet.json` into the same rules and publish them.

Do not replace the existing `recipes` rules when adding these rule sections. The queue rules are intended only for an educational demonstration: n8n polls and updates the queue without a backend credential, so queue records are publicly accessible. A production application should use a dedicated backend identity and private server-side queue.

## n8n setup

Start n8n:

```bash
docker compose up -d
```

Open n8n at [http://localhost:5679](http://localhost:5679), configure the Google Gemini credential, and import the workflow:

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

The workflow fetches one pending Firebase request every ten seconds and processes it directly. There is no webhook or internal HTTP call between workflows, so frontend CORS configuration and a public n8n URL are not required. Firebase authentication is performed only by the frontend and by n8n when it stores recipes and quota data, not by the queue poll.

## Development

Start the Angular development server:

```bash
npm start
```

Open [http://localhost:4200](http://localhost:4200).

The complete local application requires the Angular server, n8n container, Firebase configuration, and the published n8n workflow to be available.

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

The optimized frontend is written to `dist/code-a-cuisine/browser`. Upload the contents of the `browser` directory, not the directory itself, to the web server.

## Daily quota

The quota is tracked by anonymous Firebase user and Berlin calendar date. The workflow converts the Firebase user ID into a stable synthetic IPv6 identifier before checking the quota. The browser cannot directly provide or modify this internal identifier.

Current workflow limits:

- Three recipes are generated per successful request
- Nine recipes per anonymous browser user per day
- Twelve recipes across the whole system per day

Quota data is stored under:

```text
quota/<YYYY-MM-DD>/byIp/<synthetic-user-IP>/count
```

Deleting one synthetic user entry resets that browser user's allowance. Deleting the date entry resets the complete daily quota. Clearing browser storage creates a new anonymous Firebase user, so this client-side identity is suitable for a course demonstration rather than a production anti-abuse system.

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
n8n/*-rules-snippet.json    Firebase queue and quota rule fragments
scripts/                    Workflow checks and seed data
compose.yaml                Local n8n service
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
