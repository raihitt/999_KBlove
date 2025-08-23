import fs from 'node:fs';
import path from 'node:path';
import { runParallelScraping } from './services/irbankFetchService';

const args = process.argv.slice(2);
const codeArg = args.find((arg) => arg.startsWith('--codes='));
const parallelArg = args.find((arg) => arg.startsWith('--parallel='));

let codes: string[] = [];
if (codeArg) {
  codes = codeArg
    .replace('--codes=', '')
    .split(',')
    .map((c) => c.trim());
} else {
  console.error('エラー: --codes=1332,1871 のように銘柄コードを指定してください');
  process.exit(1);
}
const MAX_PARALLEL = parallelArg ? parseInt(parallelArg.replace('--parallel=', ''), 10) : 5;

const outputDir = path.join(__dirname, '../data/screening');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
const donePath = path.join(outputDir, 'done.txt');

// 進捗ファイルパス
const progressDir = path.join(__dirname, '../data');
if (!fs.existsSync(progressDir)) {
  fs.mkdirSync(progressDir, { recursive: true });
}
const progressPath = path.join(progressDir, 'batch_progress.json');
function updateProgress(current: number, total: number, code: string | null, errors: number) {
  fs.writeFileSync(
    progressPath,
    JSON.stringify({ current, total, code, errors, updatedAt: new Date().toISOString() }),
  );
}

console.log('--- IRBANKデータ取得バッチ ---');
console.log(`取得対象銘柄数: ${codes.length}件`);
console.log(`保存先ディレクトリ: ${outputDir}`);
console.log(`並列取得数: ${MAX_PARALLEL}`);
console.log('-----------------------------------');

// 進捗初期化
updateProgress(0, codes.length, null, 0);

runParallelScraping(codes, outputDir, donePath, MAX_PARALLEL, () => {
  // 進捗ファイル更新はirbankFetchService側で行うため、ここでは何もしない
})
  .then(() => {
    console.log('\nバッチ処理が完了しました。');
  })
  .catch((e: Error) => {
    console.error('致命的なエラーが発生しました:', e);
  });
