import fs from 'node:fs';
import path from 'node:path';
import { IrbankYearData } from './types/irbank';

const SCREENING_DIR = path.join(__dirname, '../data/screening');

// コマンドライン引数から --codes=... を取得
const args = process.argv.slice(2);
const codeArg = args.find((arg) => arg.startsWith('--codes='));
let targetCodes: string[] | null = null;
if (codeArg) {
  targetCodes = codeArg
    .replace('--codes=', '')
    .split(',')
    .map((c) => c.trim());
}

function loadStockData(targetCodes: string[] | null): IrbankYearData[] {
  const files = fs.readdirSync(SCREENING_DIR);
  const stocks: IrbankYearData[] = [];

  for (const file of files) {
    if (file.endsWith('.json')) {
      const code = file.replace('.json', '');
      if (targetCodes && !targetCodes.includes(code)) continue;
      const content = fs.readFileSync(path.join(SCREENING_DIR, file), 'utf-8');
      const data = JSON.parse(content) as IrbankYearData;
      stocks.push(data);
    }
  }

  return stocks;
}

function toNumber(value: string | number): number {
  if (typeof value === 'number') return value;
  return parseFloat(value) || 0;
}

function evaluateStock(stock: IrbankYearData): IrbankYearData {
  const long: string[] = [];
  const short: string[] = [];
  let totalPoint = 0;

  // 長期評価
  if (toNumber(stock.roe) >= 10) {
    long.push('ROE10%以上');
    totalPoint += 2;
  }
  if (toNumber(stock.equityRatio) >= 50) {
    long.push('自己資本比率50%以上');
    totalPoint += 2;
  }
  if (toNumber(stock.operatingCF) > 0) {
    long.push('営業CFプラス');
    totalPoint += 1;
  }

  // 短期評価
  if (toNumber(stock.per) > 0 && toNumber(stock.per) <= 15) {
    short.push('PER15倍以下');
    totalPoint += 2;
  }
  if (toNumber(stock.pbr) > 0 && toNumber(stock.pbr) <= 1.5) {
    short.push('PBR1.5倍以下');
    totalPoint += 2;
  }
  if (toNumber(stock.dividendYield) >= 3) {
    short.push('配当利回り3%以上');
    totalPoint += 1;
  }

  // 総合評価
  const 合格 = totalPoint >= 5 ? '合格' : '不合格';

  return {
    ...stock,
    long,
    short,
    totalPoint,
    合格,
  };
}

function main() {
  console.log('--- 総合評価開始 ---');

  // データ読み込み
  const stocks = loadStockData(targetCodes);
  console.log(`読み込み銘柄数: ${stocks.length}件`);

  // 評価実行
  const evaluatedStocks = stocks.map(evaluateStock);

  // 評価結果の保存
  const outDir = path.join(__dirname, '../public/data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 評価結果をJSONとして保存
  const outJsonPath = path.join(outDir, 'stock_master.json');
  fs.writeFileSync(outJsonPath, JSON.stringify(evaluatedStocks, null, 2), 'utf-8');
  console.log(`総合評価JSONデータを出力: ${outJsonPath}`);

  // 評価結果をMarkdownとして保存
  const outMdPath = path.join(outDir, 'evaluation.md');
  const mdContent = evaluatedStocks
    .sort((a, b) => b.totalPoint - a.totalPoint)
    .map((stock) => {
      return `## ${stock.code} ${stock.name}
- セクター: ${stock.sector}
- 株価: ${stock.price}
- 配当利回り: ${stock.dividendYield}
- PBR: ${stock.pbr}
- PER: ${stock.per}
- 長期評価: ${stock.long.join(', ')}
- 短期評価: ${stock.short.join(', ')}
- 総合ポイント: ${stock.totalPoint}
- 判定: ${stock.合格}
`;
    })
    .join('\n');

  fs.writeFileSync(outMdPath, mdContent, 'utf-8');
  console.log(`総合評価表を出力: ${outMdPath}`);

  console.log('--- 完了 ---');
}

// 集計・マスター生成バッチ（雛形）

console.log('集計・マスター生成バッチを実行します（ここに集計処理を実装）');
// TODO: 必要な集計・マスター生成処理をここに追加

main();
