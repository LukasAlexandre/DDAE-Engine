import { execFileSync } from 'node:child_process';

const output = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' });

if (output.trim().length > 0) {
  console.error('Working tree is not clean after running tests/pack — CI commands must not modify or leave tracked/untracked files behind:');
  console.error(output);
  process.exit(1);
}

console.log('Working tree clean.');
