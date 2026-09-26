// Shared fixtures for the Brain schema/fingerprint/compiler tests. The
// snapshot mirrors the shape returned by discoverWorkspaceState() — the
// compiler under test only ever receives such an object, never a path.
export const ENGINE_VERSION = '0.4.0-test';

export function makeSnapshot(overrides = {}) {
  return {
    project: { name: 'demo-project', root_relative_path: '.' },
    git: {
      available: true,
      repository: true,
      branch: 'main',
      head: 'a'.repeat(40),
    },
    ddae: {
      available: true,
      docs_root: 'Docs',
      sessions_root: 'Docs/05_sessions',
      sessions: [
        { name: 'session_01_alpha', path: 'Docs/05_sessions/session_01_alpha' },
        { name: 'session_02_beta', path: 'Docs/05_sessions/session_02_beta' },
      ],
      current_session: {
        name: 'session_02_beta',
        path: 'Docs/05_sessions/session_02_beta',
        status: 'Em andamento',
        modules: [
          { name: '01_intake', exists: true },
          { name: '02_analysis', exists: false },
        ],
        counts: { blocks: 2, prompts: 1, feedbacks: 1 },
      },
    },
    current_session: { id: 'session_02_beta', selection_reason: 'latest_canonical' },
    decisions: [
      { id: 'RD-02', summary: 'Second decision', source_path: 'Docs/04_governance/registro_decisoes.md' },
      { id: 'RD-01', summary: 'First decision', source_path: 'Docs/04_governance/registro_decisoes.md' },
    ],
    risks: [
      { id: 'MR-01', summary: 'A risk', status: 'Aberto', source_path: 'Docs/04_governance/matriz_riscos.md' },
    ],
    open_bugs: [
      { id: 'BUG-01', summary: 'Bug in beta', status: 'Aberto', session: 'session_02_beta', source_path: 'Docs/05_sessions/session_02_beta/07_bugs/bugs_identificados.md' },
      { id: 'BUG-01', summary: 'Bug in alpha', status: 'Aberto', session: 'session_01_alpha', source_path: 'Docs/05_sessions/session_01_alpha/07_bugs/bugs_identificados.md' },
    ],
    recent_changes: [{ sha: 'b'.repeat(40) }, { sha: 'a'.repeat(40) }],
    current_tasks: [
      { text: 'Write tests', block: 'bloco_02_x', source_path: 'Docs/05_sessions/session_02_beta/05_blocks/bloco_02_x.md' },
      { text: 'Write code', block: 'bloco_02_x', source_path: 'Docs/05_sessions/session_02_beta/05_blocks/bloco_02_x.md' },
    ],
    release_state: { version: '1.2.3', latest_tag: 'v1.2.3' },
    warnings: [],
    ...overrides,
  };
}
