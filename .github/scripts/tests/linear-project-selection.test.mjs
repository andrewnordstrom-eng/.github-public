import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

const WORKFLOWS = [
  '.github/workflows/issue-to-linear.yml',
  '.github/workflows/pr-to-linear.yml',
];
const START_MARKER = '// linear-project-selection:start';
const END_MARKER = '// linear-project-selection:end';

function loadSelector(workflowPath) {
  const workflow = readFileSync(workflowPath, 'utf8');
  const start = workflow.indexOf(START_MARKER);
  const end = workflow.indexOf(END_MARKER);
  assert.notEqual(start, -1, `${workflowPath} is missing the selector start marker`);
  assert.notEqual(end, -1, `${workflowPath} is missing the selector end marker`);
  assert.ok(end > start, `${workflowPath} selector markers are out of order`);

  const source = workflow.slice(start + START_MARKER.length, end);
  const context = vm.createContext({});
  return vm.runInContext(`(() => {${source}; return selectProjectForTeam;})()`, context);
}

function loadWorkflowScript(workflowPath) {
  const workflow = readFileSync(workflowPath, 'utf8');
  const marker = '          script: |\n';
  const start = workflow.indexOf(marker);
  assert.notEqual(start, -1, `${workflowPath} is missing the github-script body`);
  return workflow
    .slice(start + marker.length)
    .split('\n')
    .map(line => (line.startsWith('            ') ? line.slice(12) : line))
    .join('\n');
}

function environmentFor(workflowPath) {
  if (workflowPath.endsWith('issue-to-linear.yml')) {
    return {
      ACTION: 'opened',
      EVENT_NAME: 'issues',
      ISSUE_AUTHOR: 'contributor',
      ISSUE_NUMBER: '7',
      ISSUE_TITLE: 'Corgi issue',
      ISSUE_URL: 'https://github.com/andrewnordstrom-eng/corgi/issues/7',
      LINEAR_API_KEY: 'test-key',
      REPO_NAME: 'corgi',
    };
  }
  return {
    ACTION: 'opened',
    BRANCH_NAME: 'feature/no-linear-key',
    EVENT_NAME: 'pull_request',
    IS_FORK: 'false',
    LINEAR_API_KEY: 'test-key',
    PR_AUTHOR: 'contributor',
    PR_AUTHOR_ASSOC: 'OWNER',
    PR_NUMBER: '8',
    PR_TITLE: 'Corgi pull request',
    PR_URL: 'https://github.com/andrewnordstrom-eng/corgi/pull/8',
    REPO_NAME: 'corgi',
  };
}

async function executeWorkflow(workflowPath, projects) {
  const issueCreateInputs = [];
  const fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    let data;
    if (request.query.includes('teams(filter:')) {
      data = { teams: { nodes: [{ id: 'team-proj', key: 'PROJ' }] } };
    } else if (request.query.includes('projects(filter:')) {
      data = { projects: { nodes: projects } };
    } else if (request.query.includes('issueCreate(')) {
      issueCreateInputs.push(request.variables.input);
      data = {
        issueCreate: {
          issue: {
            id: 'issue-created',
            identifier: 'PROJ-9999',
            url: 'https://linear.app/example/PROJ-9999',
          },
          success: true,
        },
      };
    } else {
      throw new Error(`Unexpected Linear query in ${workflowPath}`);
    }
    return {
      json: async () => ({ data }),
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data }),
    };
  };
  const notices = [];
  const warnings = [];
  const core = {
    error: () => {},
    info: () => {},
    notice: message => notices.push(message),
    setFailed: message => {
      throw new Error(message);
    },
    warning: message => warnings.push(message),
  };
  const context = {
    payload: {
      issue: { labels: [] },
    },
    repo: { owner: 'andrewnordstrom-eng', repo: 'corgi' },
  };
  const github = {
    rest: {
      issues: {
        createComment: async () => ({ status: 201 }),
      },
    },
  };
  const run = new AsyncFunction(
    'process',
    'context',
    'core',
    'github',
    'fetch',
    loadWorkflowScript(workflowPath)
  );
  await run(
    { env: environmentFor(workflowPath) },
    context,
    core,
    github,
    fetch
  );
  return { issueCreateInputs, notices, warnings };
}

for (const workflowPath of WORKFLOWS) {
  test(`${workflowPath}: rejects a missing project`, () => {
    const selectProjectForTeam = loadSelector(workflowPath);
    assert.equal(selectProjectForTeam([], 'team-proj'), null);
  });

  test(`${workflowPath}: rejects a project associated with another team`, () => {
    const selectProjectForTeam = loadSelector(workflowPath);
    const projects = [
      {
        id: 'project-corgi',
        teams: { nodes: [{ id: 'team-lab', key: 'LAB' }] },
      },
    ];
    assert.equal(selectProjectForTeam(projects, 'team-proj'), null);
  });

  test(`${workflowPath}: accepts the project associated with the resolved team`, () => {
    const selectProjectForTeam = loadSelector(workflowPath);
    const projects = [
      {
        id: 'project-corgi',
        teams: { nodes: [{ id: 'team-proj', key: 'PROJ' }] },
      },
    ];
    assert.equal(
      selectProjectForTeam(projects, 'team-proj')?.id,
      'project-corgi'
    );
  });

  test(`${workflowPath}: missing project emits no issueCreate mutation`, async () => {
    const result = await executeWorkflow(workflowPath, []);
    assert.equal(result.issueCreateInputs.length, 0);
    assert.equal(result.warnings.length, 1);
  });

  test(`${workflowPath}: mismatched project emits no issueCreate mutation`, async () => {
    const projects = [
      {
        id: 'project-corgi',
        teams: { nodes: [{ id: 'team-lab', key: 'LAB' }] },
      },
    ];
    const result = await executeWorkflow(workflowPath, projects);
    assert.equal(result.issueCreateInputs.length, 0);
    assert.equal(result.warnings.length, 1);
  });

  test(`${workflowPath}: valid project emits one issueCreate mutation`, async () => {
    const projects = [
      {
        id: 'project-corgi',
        teams: { nodes: [{ id: 'team-proj', key: 'PROJ' }] },
      },
    ];
    const result = await executeWorkflow(workflowPath, projects);
    assert.equal(result.issueCreateInputs.length, 1);
    assert.equal(result.issueCreateInputs[0].teamId, 'team-proj');
    assert.equal(result.issueCreateInputs[0].projectId, 'project-corgi');
  });
}
