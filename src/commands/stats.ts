import process from 'process';
import Debug from 'debug';
import chalk from 'chalk';
import { table } from 'table';
import { getLastArticlesStats } from '../api.js';
import { scaleNumber } from '../util.js';
import { createSpinner } from '../spinner.js';

const debug = Debug('init');

interface ShowStatsOptions {
  devtoKey: string;
  number: number;
  json: boolean;
}

export async function showStats(options?: Partial<ShowStatsOptions>) {
  options = options ?? {};
  options.number = options.number || 10;
  debug('options: %O', options);

  if (!options.devtoKey) {
    process.exitCode = -1;
    console.error(
      chalk`{red No dev.to API key provided.}\nUse {bold --token} option or {bold .env} file to provide one.`
    );
    return;
  }

  const spinner = createSpinner(debug);

  try {
    spinner.text = 'Retrieving articles from dev.to…';
    spinner.start();
    const stats = await getLastArticlesStats(options.devtoKey, options.number);
    spinner.stop();

    if (stats.length === 0) {
      console.info(`No published articles found.`);
      return;
    }

    if (options.json) {
      console.info(stats);
      return;
    }

    const remainingWidth = 42; // <- obviously :)
    const availableWidth = process.stdout.columns || 80;
    const maxTitleWidth = Math.max(availableWidth - remainingWidth, 8);

    const rows = stats.map((a) => [
      new Date(a.date).toLocaleDateString(),
      a.title,
      scaleNumber(a.views),
      scaleNumber(a.reactions),
      scaleNumber(a.comments)
    ]);
    rows.unshift(['Date', 'Title', 'Views', 'Likes', 'Comm.']);
    console.info(
      table(rows, {
        drawHorizontalLine: (index: number, size: number) => index === 0 || index === 1 || index === size,
        columns: { 1: { truncate: maxTitleWidth, width: maxTitleWidth } }
      })
    );
  } catch (error) {
    spinner.stop();
    process.exitCode = -1;
    console.error(chalk`{red Error while showing stats: ${(error as Error).message}}`);
  }
}
