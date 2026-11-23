import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = JSON.parse(readFileSync(new URL('../n8n/code-a-cuisine.json', import.meta.url)));
const queueWorkflow = JSON.parse(
  readFileSync(new URL('../n8n/firebase-recipe-queue.json', import.meta.url)),
);
const nodes = new Map(workflow.nodes.map((node) => [node.name, node]));
const queueNodes = new Map(queueWorkflow.nodes.map((node) => [node.name, node]));
assert.equal(nodes.size, workflow.nodes.length, 'Workflow node names must be unique');
assert.equal(
  nodes.get('Google Gemini Chat Model')?.parameters?.modelName,
  'models/gemini-3.5-flash',
  'Recipe generation should use the stable Gemini model',
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

function executeCodeNode(name, input, nodeData = {}) {
  const code = nodes.get(name)?.parameters?.jsCode;
  assert.ok(code, `Code node ${name} must exist`);

  const inputValues = Array.isArray(input) ? input : [input];
  const inputItems = inputValues.map((json) => ({ json }));
  const $input = { first: () => inputItems[0], all: () => inputItems };
  const $ = (nodeName) => ({ first: () => ({ json: nodeData[nodeName] ?? {} }) });
  return new Function('$input', '$', code)($input, $)[0].json;
}

const ipv4 = executeCodeNode('Extract Request Context', {
  headers: { 'x-forwarded-for': '203.0.113.42' },
  body: {},
});
assert.equal(ipv4.ip, '203.0.113.42');
assert.equal(ipv4.ipKey, '203_0_113_42');
assert.equal(ipv4.ipValid, true);

const compressedIpv6 = executeCodeNode('Extract Request Context', {
  headers: { 'x-forwarded-for': '2001:db8::1' },
  body: {},
});
const expandedIpv6 = executeCodeNode('Extract Request Context', {
  headers: { 'x-forwarded-for': '2001:0db8:0:0:0:0:0:1' },
  body: {},
});
assert.equal(compressedIpv6.ip, expandedIpv6.ip);
assert.equal(compressedIpv6.ipValid, true);

const invalidIp = executeCodeNode('Extract Request Context', {
  headers: { 'x-forwarded-for': 'not-an-ip' },
  body: {},
});
assert.equal(invalidIp.ipValid, false);

const validRecipeRequest = {
  ...ipv4,
  body: {
    ingredients: [{ name: 'Potato', quantity: 800, unit: 'gram' }],
    servings: 5,
    timeCategory: 'medium',
    cuisine: 'german',
    diet: 'none',
    helperCount: 3,
  },
};
const validRequest = executeCodeNode('Validate Recipe Request', validRecipeRequest);
assert.equal(validRequest.isValid, true);

const tooManyHelpersRequest = executeCodeNode('Validate Recipe Request', {
  ...validRecipeRequest,
  body: { ...validRecipeRequest.body, helperCount: 4 },
});
assert.equal(tooManyHelpersRequest.isValid, false);
assert.ok(
  tooManyHelpersRequest.validationErrors.includes(
    'Helper count must be an integer between 1 and 3.',
  ),
);

const dailyQuota = {};
for (let generation = 0; generation < 3; generation += 1) {
  const availableQuota = executeCodeNode('Check Quota', dailyQuota, {
    'Extract Request Context': ipv4,
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
  dailyQuota[ipv4.ipKey] = JSON.parse(increment.quotaBody);
  assert.equal(dailyQuota[ipv4.ipKey].count, (generation + 1) * 3);
}

const exhaustedIpQuota = executeCodeNode('Check Quota', dailyQuota, {
  'Extract Request Context': ipv4,
});
assert.equal(exhaustedIpQuota.quotaExceeded, true);
assert.match(exhaustedIpQuota.quotaMessage, /daily limit of 9 recipes/);

const quotaStatus = executeCodeNode('Build Quota Status', dailyQuota, {
  'Extract Quota Status Context': ipv4,
});
assert.equal(quotaStatus.ipUsed, 9);
assert.equal(quotaStatus.totalUsed, 9);
assert.equal(quotaStatus.canGenerate, false);

const exhaustedSystemQuota = executeCodeNode(
  'Check Quota',
  {
    first_ip: { count: 3 },
    second_ip: { count: 3 },
    third_ip: { count: 3 },
    fourth_ip: { count: 3 },
  },
  { 'Extract Request Context': ipv4 },
);
assert.equal(exhaustedSystemQuota.quotaExceeded, true);
assert.match(exhaustedSystemQuota.quotaMessage, /system-wide limit of 12 recipes/);

delete dailyQuota[ipv4.ipKey];
const resetQuotaStatus = executeCodeNode('Build Quota Status', dailyQuota, {
  'Extract Quota Status Context': ipv4,
});
assert.equal(resetQuotaStatus.ipUsed, 0);
assert.equal(resetQuotaStatus.totalUsed, 0);

const nginxConfig = readFileSync(new URL('../n8n/nginx.conf', import.meta.url), 'utf8');
assert.match(nginxConfig, /proxy_set_header X-Forwarded-For \$remote_addr;/);

assert.equal(workflow.connections['Is Quota Available?'].main[1][0].node, 'Generate Recipes');
assert.equal(workflow.connections['Is Request Valid?'].main[0][0].node, 'Sign In For Quota Check');
assert.equal(workflow.connections['Sign In For Quota Check'].main[0][0].node, 'Get Daily Quota');
assert.equal(workflow.connections['Get Daily Quota'].main[0][0].node, 'Check Quota');
assert.equal(
  workflow.connections['Is Quota Status IP Valid?'].main[0][0].node,
  'Sign In For Quota Status',
);
assert.equal(
  workflow.connections['Sign In For Quota Status'].main[0][0].node,
  'Get Quota Status Daily',
);
assert.equal(workflow.connections['Get Quota Status Daily'].main[0][0].node, 'Build Quota Status');
assert.equal(workflow.connections['Attach Firebase ID'].main[0][0].node, 'Prepare Quota Increment');
assert.equal(
  workflow.connections['Prepare Quota Increment'].main[0][0].node,
  'Save Quota to Firebase',
);
assert.equal(
  workflow.connections['Save Quota to Firebase'].main[0][0].node,
  'Combine Final Recipes',
);
for (const removedNode of [
  'Get IP Count',
  'Get Total Count',
  'Increment IP Count',
  'Increment Total Count',
  'Get Quota Status Total',
  'Get Quota Status IP',
  'Increment Quota After Success',
]) {
  assert.equal(nodes.has(removedNode), false, `${removedNode} should not exist`);
}
assert.equal(nodes.has('Email Error Notification'), false);

assert.equal(
  queueNodes.get('Every 10 Seconds')?.type,
  'n8n-nodes-base.scheduleTrigger',
  'The Firebase queue must run from a schedule trigger',
);
assert.equal(
  queueNodes.get('Every 10 Seconds')?.parameters?.rule?.interval?.[0]?.secondsInterval,
  10,
  'The Firebase queue should check pending requests every ten seconds',
);
assert.equal(
  queueNodes.get('Generate Recipes Internally')?.parameters?.url,
  'http://n8n:5678/webhook/generate-recipes',
  'The queue must call n8n only through the private Docker network',
);
assert.equal(
  queueNodes.get('Generate Recipes Internally')?.parameters?.headerParameters?.parameters?.[0]
    ?.name,
  'X-Forwarded-For',
  'The queue must provide the private anonymous-user quota identity',
);
assert.equal(queueWorkflow.connections['Build Queue Result'].main[0][0].node, 'Save Queue Result');

for (const connection of Object.values(queueWorkflow.connections)) {
  for (const outputs of Object.values(connection)) {
    for (const branch of outputs) {
      for (const target of branch) {
        assert.ok(queueNodes.has(target.node), `Connected queue node ${target.node} must exist`);
      }
    }
  }
}

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

console.log('Quota workflow checks passed.');
