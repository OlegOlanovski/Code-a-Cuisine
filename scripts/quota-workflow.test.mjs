import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = JSON.parse(readFileSync(new URL('../n8n/code-a-cuisine.json', import.meta.url)));
const nodes = new Map(workflow.nodes.map((node) => [node.name, node]));
assert.equal(nodes.size, workflow.nodes.length, 'Workflow node names must be unique');

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

  const $input = { first: () => ({ json: input }) };
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

const availableQuota = executeCodeNode(
  'Check Quota',
  {},
  {
    'Get IP Count': { count: 0 },
    'Get Total Count': { count: 9 },
    'Extract Request Context': ipv4,
  },
);
assert.equal(availableQuota.recipesPerRequest, 3);
assert.equal(availableQuota.maxPerIp, 3);
assert.equal(availableQuota.maxTotal, 12);
assert.equal(availableQuota.quotaExceeded, false);

const reservedQuota = executeCodeNode(
  'Prepare Quota Increment',
  {},
  {
    'Check Quota': availableQuota,
    'Sign In For Quota Check': { idToken: 'test-token' },
  },
);
assert.deepEqual(JSON.parse(reservedQuota.quotaBody), {
  'byIp/203_0_113_42/count': 3,
  'total/count': 12,
});

const exhaustedIpQuota = executeCodeNode(
  'Check Quota',
  {},
  {
    'Get IP Count': { count: 3 },
    'Get Total Count': { count: 3 },
    'Extract Request Context': ipv4,
  },
);
assert.equal(exhaustedIpQuota.quotaExceeded, true);
assert.match(exhaustedIpQuota.quotaMessage, /daily limit of 3 recipes/);

const nginxConfig = readFileSync(new URL('../n8n/nginx.conf', import.meta.url), 'utf8');
assert.match(nginxConfig, /proxy_set_header X-Forwarded-For \$remote_addr;/);

assert.equal(
  workflow.connections['Is Quota Available?'].main[1][0].node,
  'Prepare Quota Increment',
);
assert.equal(workflow.connections['Increment Quota Counters'].main[0][0].node, 'Generate Recipes');

console.log('Quota workflow checks passed.');
