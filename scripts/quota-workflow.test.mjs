import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = JSON.parse(readFileSync(new URL('../n8n/code-a-cuisine.json', import.meta.url)));
const nodes = new Map(workflow.nodes.map((node) => [node.name, node]));
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

function executeCodeNode(name, input, nodeData = {}, staticData = {}) {
  const code = nodes.get(name)?.parameters?.jsCode;
  assert.ok(code, `Code node ${name} must exist`);

  const inputValues = Array.isArray(input) ? input : [input];
  const inputItems = inputValues.map((json) => ({ json }));
  const $input = { first: () => inputItems[0], all: () => inputItems };
  const $ = (nodeName) => ({ first: () => ({ json: nodeData[nodeName] ?? {} }) });
  const $getWorkflowStaticData = (scope) => {
    assert.equal(scope, 'global');
    return staticData;
  };
  return new Function('$input', '$', '$getWorkflowStaticData', code)(
    $input,
    $,
    $getWorkflowStaticData,
  )[0].json;
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

const staticData = {
  recipeQuota: { version: 4, date: ipv4.date, total: 0, byIp: {} },
};
for (let generation = 0; generation < 3; generation += 1) {
  const availableQuota = executeCodeNode(
    'Check Quota',
    {},
    { 'Extract Request Context': ipv4 },
    staticData,
  );
  assert.equal(availableQuota.recipesPerRequest, 3);
  assert.equal(availableQuota.maxPerIp, 9);
  assert.equal(availableQuota.maxTotal, 12);
  assert.equal(availableQuota.quotaExceeded, false);
  assert.equal(
    staticData.recipeQuota.total,
    generation * 3,
    'Quota checks must not change counters',
  );

  executeCodeNode(
    'Increment Quota After Success',
    { id: `generated-recipe-${generation}` },
    { 'Extract Request Context': ipv4 },
    staticData,
  );
}
assert.equal(staticData.recipeQuota.byIp[ipv4.ipKey], 9);
assert.equal(staticData.recipeQuota.total, 9);

const exhaustedIpQuota = executeCodeNode(
  'Check Quota',
  {},
  {
    'Extract Request Context': ipv4,
  },
  staticData,
);
assert.equal(exhaustedIpQuota.quotaExceeded, true);
assert.match(exhaustedIpQuota.quotaMessage, /daily limit of 9 recipes/);
assert.equal(staticData.recipeQuota.total, 9, 'Rejected requests must not change counters');

const quotaStatus = executeCodeNode(
  'Build Quota Status',
  {},
  { 'Extract Quota Status Context': ipv4 },
  staticData,
);
assert.equal(quotaStatus.ipUsed, 9);
assert.equal(quotaStatus.totalUsed, 9);
assert.equal(quotaStatus.canGenerate, false);

const exhaustedSystemQuota = executeCodeNode(
  'Check Quota',
  {},
  { 'Extract Request Context': ipv4 },
  { recipeQuota: { version: 4, date: ipv4.date, total: 12, byIp: {} } },
);
assert.equal(exhaustedSystemQuota.quotaExceeded, true);
assert.match(exhaustedSystemQuota.quotaMessage, /system-wide limit of 12 recipes/);

const legacyStaticData = {
  recipeQuota: { date: ipv4.date, total: 3, byIp: { [ipv4.ipKey]: 3 } },
};
const resetQuotaStatus = executeCodeNode(
  'Build Quota Status',
  {},
  { 'Extract Quota Status Context': ipv4 },
  legacyStaticData,
);
assert.equal(resetQuotaStatus.ipUsed, 0);
assert.equal(resetQuotaStatus.totalUsed, 0);
assert.equal(legacyStaticData.recipeQuota.version, 4);

const nginxConfig = readFileSync(new URL('../n8n/nginx.conf', import.meta.url), 'utf8');
assert.match(nginxConfig, /proxy_set_header X-Forwarded-For \$remote_addr;/);

assert.equal(
  workflow.connections['Is Quota Available?'].main[1][0].node,
  'Generate Recipes',
);
assert.equal(workflow.connections['Is Request Valid?'].main[0][0].node, 'Check Quota');
assert.equal(workflow.connections['Is Quota Status IP Valid?'].main[0][0].node, 'Build Quota Status');
assert.equal(
  workflow.connections['Attach Firebase ID'].main[0][0].node,
  'Increment Quota After Success',
);
assert.equal(
  workflow.connections['Increment Quota After Success'].main[0][0].node,
  'Combine Final Recipes',
);
for (const removedNode of [
  'Sign In For Quota Check',
  'Get IP Count',
  'Get Total Count',
  'Prepare Quota Increment',
  'Increment IP Count',
  'Increment Total Count',
  'Sign In For Quota Status',
  'Get Quota Status Total',
  'Get Quota Status IP',
]) {
  assert.equal(nodes.has(removedNode), false, `${removedNode} should not exist`);
}
assert.equal(nodes.has('Email Error Notification'), false);

console.log('Quota workflow checks passed.');
