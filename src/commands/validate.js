import fs from 'node:fs';
import path from 'node:path';
import { scanNamingIssues } from '../utils/naming.js';
import { validateRequiredQualityGates } from '../utils/quality-gates.js';
import { listSessionDirs, listSessionModules, parseSessionFolderName } from '../utils/session.js';

const MAIN_SUBFOLDERS = [
  '00_ddae_engine',
  '01_product',
  '02_architecture',
  '03_contracts',
  '04_governance',
  '05_sessions',
  '06_quality_gates',
  '07_design_system',
  '08_deploy',
  '09_observability',
  '99_archive',
];

const ROOT_FILES = ['CLAUDE.md', 'AGENTS.md', '.cursorrules', 'ddae-engine.config.json'];

/**
 * Validates the sessions found under Docs/05_sessions/: no duplicate session
 * numbers, and each real session has all 13 internal modules present. Having
 * zero sessions is valid — a freshly initialized project has none yet.
 */
function validateSessions(sessionsDir, errors, warnings) {
  if (!fs.existsSync(path.join(sessionsDir, 'README.md'))) {
    errors.push('Arquivo ausente: Docs/05_sessions/README.md');
  }

  const sessions = listSessionDirs(sessionsDir);
  const byNumber = new Map();
  for (const name of sessions) {
    const { number } = parseSessionFolderName(name);
    const key = Number(number);
    if (!byNumber.has(key)) {
      byNumber.set(key, []);
    }
    byNumber.get(key).push(name);
  }
  for (const [number, names] of byNumber) {
    if (names.length > 1) {
      errors.push(`Numeração de sessão duplicada (número ${number}): ${names.join(', ')}`);
    }
  }

  const modules = listSessionModules();
  for (const name of sessions) {
    for (const moduleName of modules) {
      if (!fs.existsSync(path.join(sessionsDir, name, moduleName))) {
        warnings.push(`Sessão sem módulo obrigatório (${moduleName}): Docs/05_sessions/${name}`);
      }
    }
  }

  return sessions.length;
}

export async function validateCommand({ dir }) {
  const errors = [];
  const warnings = [];
  const qualityGateErrors = [];
  let qualityGateStatus = 'SKIPPED';
  let sessionsFound = 0;
  const docsDir = path.join(dir, 'Docs');

  if (!fs.existsSync(docsDir)) {
    errors.push('Docs/ não encontrado. Execute "ddae-engine init" primeiro.');
  } else {
    for (const folder of MAIN_SUBFOLDERS) {
      if (!fs.existsSync(path.join(docsDir, folder))) {
        errors.push(`Pasta principal ausente: Docs/${folder}`);
      }
    }

    if (!fs.existsSync(path.join(docsDir, '00_ddae_engine', 'metodologia.md'))) {
      errors.push('Arquivo ausente: Docs/00_ddae_engine/metodologia.md');
    }

    const gatesValidation = validateRequiredQualityGates(path.join(docsDir, '06_quality_gates'));
    qualityGateErrors.push(...gatesValidation.errors);
    errors.push(...qualityGateErrors);
    qualityGateStatus = qualityGateErrors.length === 0 ? 'OK' : 'FAIL';

    const sessionsDir = path.join(docsDir, '05_sessions');
    if (fs.existsSync(sessionsDir)) {
      sessionsFound = validateSessions(sessionsDir, errors, warnings);
    }

    const naming = scanNamingIssues(docsDir);
    errors.push(...naming.errors);
    warnings.push(...naming.warnings);
  }

  for (const file of ROOT_FILES) {
    if (!fs.existsSync(path.join(dir, file))) {
      errors.push(`Arquivo de agente ausente na raiz: ${file}`);
    }
  }

  const status = errors.length === 0 ? 'OK' : 'FAILED';

  console.log('DDAE Engine Validation Report\n');
  console.log(`Status: ${status}`);
  console.log(`Sessions found: ${sessionsFound}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`[DDAE Engine validate] Quality gates: ${qualityGateStatus}`);

  if (qualityGateErrors.length > 0) {
    for (const error of qualityGateErrors) {
      console.log(`  - ${error}`);
    }
  }

  if (warnings.length > 0) {
    console.log('\nWarnings:');
    for (const warning of warnings) {
      console.log(`  - ${warning}`);
    }
  }
  if (errors.length > 0) {
    console.log('\nErrors:');
    for (const error of errors) {
      console.log(`  - ${error}`);
    }
  }

  process.exitCode = status === 'OK' ? 0 : 1;
}
