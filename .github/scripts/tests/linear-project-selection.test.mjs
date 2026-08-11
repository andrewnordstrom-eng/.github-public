import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

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
}
