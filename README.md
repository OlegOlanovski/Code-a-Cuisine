# CodeACuisine

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.1.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## n8n error handling and logging

The workflow in `n8n/code-a-cuisine.json` contains its own error logging workflow:

1. `On Workflow Error` receives failures from automatic executions.
2. `Format and Log Error` writes a structured `n8n_workflow_error` entry to the container output.

The Docker setup writes n8n logs both to the container console and to the persistent
`/home/node/.n8n/logs/n8n.log` file. Follow either output with:

```bash
docker compose logs -f n8n
docker compose exec n8n tail -f /home/node/.n8n/logs/n8n.log
```

Failed execution data is retained by the workflow for diagnosis. Test the error path through a
published/automatic execution (for example, a production webhook call that reaches a temporary
`Stop And Error` node). n8n does not run `Error Trigger` for manual executions.

## Daily recipe quota

The webhook is exposed through the `quota-gateway` service. The gateway overwrites forwarded IP
headers with the actual connection address, while n8n serializes production executions so the
quota check and update cannot race. The daily counters are persisted in Firebase Realtime Database
under `quota/<Berlin date>/byIp/<IP key>/count`. Each
successful recipe generation consumes three recipes; failed Gemini requests do not consume quota.
The limits are three generations (nine recipes) per public IP and twelve recipes system-wide per
Berlin calendar day. The system-wide total is calculated from the per-IP counters, so deleting one
IP entry in Firebase resets both that IP's allowance and its contribution to the total.

Before publishing this workflow, merge the `quota` child from
`n8n/firebase-quota-rules-snippet.json` into the existing root rules in Firebase Console under
**Realtime Database > Rules**, then publish the rules. Do not replace the existing `recipes` rules.
To reset one network manually, delete `quota/<date>/byIp/<IP key>`. To reset the whole day, delete
`quota/<date>`.

After changing `n8n/code-a-cuisine.json`, import and publish the workflow draft:

```bash
docker compose up -d
docker compose exec -u node n8n n8n import:workflow --input=/workflows/code-a-cuisine.json
docker compose exec -u node n8n n8n publish:workflow --id=jbQPlrHD9efaS8X0
docker compose restart n8n
```

Validate the quota workflow without making external requests:

```bash
npm run test:quota
```

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
