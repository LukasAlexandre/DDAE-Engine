import fs from 'node:fs';
import path from 'node:path';
import { scanNamingIssues } from '../utils/naming.js';
import { auditQualityGates } from '../utils/quality-gates.js';
import { getMarkdownSection, hasFilledListItem, readMarkdownFile } from '../utils/markdown-checks.js';
import {
  listSessionDirs,
  listNonConformingDirs,
  listSessionModules,
  parseSessionFolderName,
  detectLegacyBaseSessions,
} from '../utils/session.js';

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

const ROOT_FILES = ['CLAUDE.md', 'AGENTS.md', '.cursorrules'];

function mdFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  return fs.readdirSync(dirPath).filter((name) => name.endsWith('.md') && name !== 'README.md');
}

function auditPendencies(feedbackPath, label, errors, warnings, pendencies) {
  const read = readMarkdownFile(feedbackPath, label);
  if (!read.ok) {
    warnings.push(read.error);
    return;
  }

  if (hasFilledListItem(getMarkdownSection(read.content, 'P1', '###'))) {
    const message = `Pendência P1 (crítica) aberta em: ${label}`;
    errors.push(message);
    pendencies.push({ priority: 'P1', label, message });
  }
  if (hasFilledListItem(getMarkdownSection(read.content, 'P2', '###'))) {
    const message = `Pendência P2 (importante) aberta em: ${label}`;
    warnings.push(message);
    pendencies.push({ priority: 'P2', label, message });
  }
}

/**
 * Classifies a single real session as: vazia (no blocks yet), em andamento
 * (has blocks, closure not filled in), or concluída (09_validation has a
 * filled closure document). This is a diagnostic label, not a hard gate.
 */
function classifySession(sessionDir, blocks, validations) {
  if (blocks.length === 0) {
    return 'vazia';
  }
  const closurePath = path.join(sessionDir, '09_validation', 'fechamento_sessao.md');
  if (validations.length > 0 && fs.existsSync(closurePath)) {
    const read = readMarkdownFile(closurePath);
    const statusSection = read.ok ? getMarkdownSection(read.content, '1. Status', '##') : '';
    if (/^[-*]\s*\[[xX]\]/m.test(statusSection)) {
      return 'concluída';
    }
  }
  return 'em andamento';
}

function auditSessions(sessionsDir, errors, warnings, suggestions, pendencies, sessionSummaries) {
  if (!fs.existsSync(sessionsDir)) {
    return;
  }

  const sessionModules = listSessionModules();
  const sessionNames = listSessionDirs(sessionsDir);

  for (const nonConforming of listNonConformingDirs(sessionsDir)) {
    suggestions.push(`Pasta fora do padrão de sessão (esperado session_NN_nome): Docs/05_sessions/${nonConforming}`);
  }

  const byNumber = new Map();
  for (const name of sessionNames) {
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

  const legacySessions = detectLegacyBaseSessions(sessionsDir);
  if (legacySessions.length > 0) {
    warnings.push(
      `Estrutura de sessões legada detectada (${legacySessions.length} pasta(s) do antigo scaffold automático `
      + `session_01..10): ${legacySessions.join(', ')}. O modelo atual não pré-cria sessões — nenhum conteúdo foi `
      + 'removido automaticamente. Revise manualmente antes de renumerar, consolidar ou remover.',
    );
  }

  for (const sessionName of sessionNames) {
    const sessionDir = path.join(sessionsDir, sessionName);

    if (!fs.existsSync(path.join(sessionDir, 'README.md'))) {
      warnings.push(`Sessão sem README: Docs/05_sessions/${sessionName}`);
    }

    for (const moduleName of sessionModules) {
      if (!fs.existsSync(path.join(sessionDir, moduleName))) {
        warnings.push(`Sessão sem módulo obrigatório (falta ${moduleName}): Docs/05_sessions/${sessionName}`);
      }
    }

    const blocks = mdFiles(path.join(sessionDir, '05_blocks'))
      .map((name) => name.replace(/\.md$/, ''));
    const prompts = mdFiles(path.join(sessionDir, '06_prompts'))
      .map((name) => name.replace(/^prompt_/, '').replace(/\.md$/, ''));
    const feedbackFiles = mdFiles(path.join(sessionDir, '08_feedbacks'));
    const feedbacks = feedbackFiles.map((name) => name.replace(/^feedback_/, '').replace(/\.md$/, ''));
    const validations = mdFiles(path.join(sessionDir, '09_validation'));

    for (const block of blocks) {
      if (!prompts.includes(block)) {
        warnings.push(`Bloco sem prompt correspondente: Docs/05_sessions/${sessionName}/05_blocks/${block}.md`);
      }
      if (!feedbacks.includes(block)) {
        warnings.push(`Bloco sem feedback correspondente: Docs/05_sessions/${sessionName}/05_blocks/${block}.md`);
      }
    }
    for (const prompt of prompts) {
      if (!blocks.includes(prompt)) {
        warnings.push(`Prompt órfão (sem bloco correspondente): Docs/05_sessions/${sessionName}/06_prompts/prompt_${prompt}.md`);
      }
    }
    for (const feedback of feedbacks) {
      if (!blocks.includes(feedback)) {
        warnings.push(`Feedback órfão (sem bloco correspondente): Docs/05_sessions/${sessionName}/08_feedbacks/feedback_${feedback}.md`);
      }
    }
    for (const feedbackFile of feedbackFiles) {
      const label = `Docs/05_sessions/${sessionName}/08_feedbacks/${feedbackFile}`;
      auditPendencies(path.join(sessionDir, '08_feedbacks', feedbackFile), label, errors, warnings, pendencies);
    }
    if (fs.existsSync(path.join(sessionDir, '09_validation')) && validations.length === 0) {
      warnings.push(`Sessão sem validação preenchida: Docs/05_sessions/${sessionName}/09_validation`);
    }

    sessionSummaries.push({
      name: sessionName,
      status: classifySession(sessionDir, blocks, validations),
      blocks: blocks.length,
      blocksSemFeedback: blocks.filter((block) => !feedbacks.includes(block)).length,
    });
  }
}

export async function auditCommand({ dir }) {
  const errors = [];
  const warnings = [];
  const suggestions = [];
  const pendencies = [];
  const sessionSummaries = [];
  const docsDir = path.join(dir, 'Docs');

  if (!fs.existsSync(docsDir)) {
    console.log('DDAE Engine Audit Report\n');
    console.log('Status: FAILED');
    console.log('Warnings: 0');
    console.log('Errors: 1');
    console.log('Suggestions: 0');
    console.log('\nErrors:');
    console.log('  - Docs/ não encontrado. Execute "ddae-engine init" primeiro.');
    process.exitCode = 1;
    return;
  }

  for (const entry of fs.readdirSync(docsDir, { withFileTypes: true })) {
    if (entry.isDirectory() && !MAIN_SUBFOLDERS.includes(entry.name)) {
      suggestions.push(`Pasta fora do padrão principal: Docs/${entry.name}`);
    }
  }

  const gatesAudit = auditQualityGates(path.join(docsDir, '06_quality_gates'));
  errors.push(...gatesAudit.errors);
  warnings.push(...gatesAudit.warnings);

  if (!fs.existsSync(path.join(docsDir, '00_ddae_engine', 'metodologia.md'))) {
    warnings.push('Arquivo ausente: Docs/00_ddae_engine/metodologia.md');
  }

  for (const file of ROOT_FILES) {
    if (!fs.existsSync(path.join(dir, file))) {
      warnings.push(`Arquivo de agente IA ausente na raiz: ${file}`);
    }
  }

  const sessionsDir = path.join(docsDir, '05_sessions');
  if (!fs.existsSync(path.join(sessionsDir, 'README.md'))) {
    warnings.push('Arquivo ausente: Docs/05_sessions/README.md');
  }
  auditSessions(sessionsDir, errors, warnings, suggestions, pendencies, sessionSummaries);

  const naming = scanNamingIssues(docsDir);
  errors.push(...naming.errors);
  warnings.push(...naming.warnings);

  const status = errors.length === 0 ? 'OK' : 'FAILED';

  console.log('DDAE Engine Audit Report\n');
  console.log(`Status: ${status}`);
  console.log(`Sessions found: ${sessionSummaries.length}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Suggestions: ${suggestions.length}`);

  console.log('\nQuality Gates:');
  for (const gate of gatesAudit.gates) {
    console.log(`  - Gate: ${gate.gate} - ${gate.state} (${gate.status})`);
  }

  console.log('\nSessions:');
  if (sessionSummaries.length === 0) {
    console.log('  - Nenhuma sessão criada ainda.');
  } else {
    for (const session of sessionSummaries) {
      const feedbackNote = session.blocksSemFeedback > 0 ? `, ${session.blocksSemFeedback} sem feedback` : '';
      console.log(`  - ${session.name}: ${session.status} (${session.blocks} bloco(s)${feedbackNote})`);
    }
  }

  console.log('\nPendências:');
  if (pendencies.length === 0) {
    console.log('  - Nenhuma pendência P1/P2 encontrada.');
  } else {
    for (const pendency of pendencies) {
      console.log(`  - ${pendency.priority}: ${pendency.label}`);
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
  if (suggestions.length > 0) {
    console.log('\nSuggestions:');
    for (const suggestion of suggestions) {
      console.log(`  - ${suggestion}`);
    }
  }

  process.exitCode = status === 'OK' ? 0 : 1;
}
