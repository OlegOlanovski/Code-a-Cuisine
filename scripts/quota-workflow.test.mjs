import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const workflow = JSON.parse(readFileSync(new URL('../n8n/code-a-cuisine.json', import.meta.url)));
const nodes = new Map(workflow.nodes.map((node) => [node.name, node]));

assert.equal(workflow.name, 'Code-a-Cuisine Firebase Queue');
assert.equal(nodes.size, workflow.nodes.length, 'Workflow node names must be unique');
assert.equal(
  nodes.get('Google Gemini Chat Model')?.parameters?.modelName,
  'models/gemini-3.5-flash',
  'Recipe generation should use the configured Gemini model',
);

for (const connection of Object.values(workflow.connections)) {
  for (const outputs of Object.values(connection)) {
    for (const branch of outputs) {
      for (const target of branch) {
        assert.ok(nodes.has(target.node), `Connected node ${target.node} must exist`);
      }
    }
  }
}

/** Executes JavaScript from one n8n Code node with a minimal test context. */
function executeCodeNode(name, input, nodeData = {}) {
  const code = nodes.get(name)?.parameters?.jsCode;
  assert.ok(code, `Code node ${name} must exist`);

  const inputValues = Array.isArray(input) ? input : [input];
  const inputItems = inputValues.map((json) => ({ json }));
  const $input = { first: () => inputItems[0], all: () => inputItems };
  const $ = (nodeName) => {
    const value = nodeData[nodeName] ?? {};
    const values = Array.isArray(value) ? value : [value];
    const items = values.map((json) => ({ json }));

    return { first: () => items[0], all: () => items };
  };

  return new Function('$input', '$', '$json', code)($input, $, inputItems[0].json)[0].json;
}

const validPayload = {
  ingredients: [
    { name: 'Potato', quantity: 600, unit: 'gram' },
    { name: 'Carrot', quantity: 200, unit: 'gram' },
  ],
  servings: 5,
  timeCategory: 'medium',
  cuisine: 'german',
  diet: 'none',
  helperCount: 3,
};
const queueItem = executeCodeNode('Select Pending Request', {
  request_1: {
    ownerId: 'anonymous-firebase-user',
    status: 'pending',
    createdAt: 1,
    payload: validPayload,
  },
});

assert.equal(queueItem.requestId, 'request_1');
assert.equal(queueItem.ownerId, 'anonymous-firebase-user');
assert.equal(queueItem.quotaIp.split(':').length, 8);
assert.match(queueItem.quotaIp, /^fd00:/);

const validRequest = executeCodeNode(
  'Validate Recipe Request',
  {},
  {
    'Select Pending Request': queueItem,
  },
);
assert.equal(validRequest.isValid, true);
assert.equal(validRequest.ipKey, queueItem.quotaIp);
assert.equal(validRequest.requestId, 'request_1');

const invalidQueueItem = {
  ...queueItem,
  payload: { ...validPayload, helperCount: 4 },
};
const invalidRequest = executeCodeNode(
  'Validate Recipe Request',
  {},
  {
    'Select Pending Request': invalidQueueItem,
  },
);
assert.equal(invalidRequest.isValid, false);
assert.ok(
  invalidRequest.validationErrors.includes('Helper count must be an integer between 1 and 3.'),
);

const oneIngredientRequest = executeCodeNode(
  'Validate Recipe Request',
  {},
  {
    'Select Pending Request': {
      ...queueItem,
      payload: { ...validPayload, ingredients: validPayload.ingredients.slice(0, 1) },
    },
  },
);
assert.equal(oneIngredientRequest.isValid, false);
assert.ok(
  oneIngredientRequest.validationErrors.includes('At least two ingredients are required.'),
);

const validationError = executeCodeNode(
  'Build Queue Validation Error',
  {},
  {
    'Validate Recipe Request': invalidRequest,
  },
);
assert.equal(validationError.requestId, 'request_1');
assert.equal(validationError.patch.status, 'failed');
assert.equal(validationError.patch.errorMessage, 'Invalid request');

const dailyQuota = {};
for (let generation = 0; generation < 3; generation += 1) {
  const availableQuota = executeCodeNode('Check Quota', dailyQuota, {
    'Validate Recipe Request': validRequest,
  });
  assert.equal(availableQuota.recipesPerRequest, 3);
  assert.equal(availableQuota.maxPerIp, 9);
  assert.equal(availableQuota.maxTotal, 12);
  assert.equal(availableQuota.quotaExceeded, false);
  assert.equal(availableQuota.ipCount, generation * 3);
  assert.equal(availableQuota.totalCount, generation * 3);

  const increment = executeCodeNode(
    'Prepare Quota Increment',
    {},
    {
      'Check Quota': availableQuota,
      'Sign In For Quota Check': { idToken: 'test-token' },
    },
  );
  dailyQuota[validRequest.ipKey] = JSON.parse(increment.quotaBody);
  assert.equal(dailyQuota[validRequest.ipKey].count, (generation + 1) * 3);
}

const exhaustedQuota = executeCodeNode('Check Quota', dailyQuota, {
  'Validate Recipe Request': validRequest,
});
assert.equal(exhaustedQuota.quotaExceeded, true);
assert.match(exhaustedQuota.quotaMessage, /daily limit of 9 recipes/);

const quotaError = executeCodeNode('Build Queue Quota Error', exhaustedQuota, {
  'Validate Recipe Request': validRequest,
});
assert.equal(quotaError.requestId, 'request_1');
assert.equal(quotaError.patch.status, 'failed');
assert.equal(quotaError.patch.quota.canGenerate, false);

const systemQuota = executeCodeNode(
  'Check Quota',
  {
    first_user: { count: 3 },
    second_user: { count: 3 },
    third_user: { count: 3 },
    fourth_user: { count: 3 },
  },
  { 'Validate Recipe Request': validRequest },
);
assert.equal(systemQuota.quotaExceeded, true);
assert.match(systemQuota.quotaMessage, /system-wide limit of 12 recipes/);

assert.equal(nodes.get('Every 10 Seconds')?.type, 'n8n-nodes-base.scheduleTrigger');
assert.equal(nodes.get('Every 10 Seconds')?.parameters?.rule?.interval?.[0]?.secondsInterval, 10);
assert.equal(workflow.connections['Every 10 Seconds'].main[0][0].node, 'Get Pending Request');
assert.equal(
  workflow.connections['Mark Request Processing'].main[0][0].node,
  'Validate Recipe Request',
);
assert.equal(workflow.connections['Is Request Valid?'].main[0][0].node, 'Sign In For Quota Check');
assert.equal(
  workflow.connections['Is Request Valid?'].main[1][0].node,
  'Build Queue Validation Error',
);
assert.equal(
  workflow.connections['Is Quota Available?'].main[0][0].node,
  'Build Queue Quota Error',
);
assert.equal(workflow.connections['Is Quota Available?'].main[1][0].node, 'Generate Recipes');
assert.equal(workflow.connections['Combine Final Recipes'].main[0][0].node, 'Save Queue Result');

for (const removedNode of [
  'Receive Recipe Request',
  'Receive Quota Status Request',
  'Respond With Recipes',
  'Respond to Webhook',
  'Generate Recipes Internally',
  'Sign In For Quota Status',
  'Build Quota Status',
]) {
  assert.equal(nodes.has(removedNode), false, `${removedNode} should not exist`);
}

assert.equal(
  workflow.nodes.some((node) => node.type === 'n8n-nodes-base.webhook'),
  false,
  'The Firebase queue workflow must not expose a webhook',
);
assert.equal(
  workflow.nodes.some((node) => node.type === 'n8n-nodes-base.respondToWebhook'),
  false,
  'The merged workflow must not contain webhook response nodes',
);

const composeConfig = readFileSync(new URL('../compose.yaml', import.meta.url), 'utf8');
assert.match(composeConfig, /N8N_CONCURRENCY_PRODUCTION_LIMIT: '1'/);
assert.match(composeConfig, /'5679:5678'/);
assert.doesNotMatch(composeConfig, /quota-gateway|firebase-recipe-queue/);
assert.equal(existsSync(new URL('../n8n/firebase-recipe-queue.json', import.meta.url)), false);
assert.equal(existsSync(new URL('../n8n/nginx.conf', import.meta.url)), false);

const generatorService = readFileSync(
  new URL('../src/app/services/recipe-generator.ts', import.meta.url),
  'utf8',
);
assert.doesNotMatch(
  generatorService,
  /n8nWebhookUrl|localhost:5679/,
  'The deployed frontend must not connect directly to local n8n',
);
assert.match(
  generatorService,
  /generationRequests/,
  'The frontend must submit generation requests through Firebase',
);

console.log('Merged Firebase queue workflow checks passed.');
