import path from 'node:path';
import process from 'node:process';
import chalk from 'chalk';
import fs from 'fs-extra';
import { createNewArticle } from '../article.js';

export async function createNew(file?: string) {
  if (!file) {
    process.exitCode = -1;
    console.error(chalk.red(`red No file name provided.`));
    return;
  }

  const newFile = path.extname(file).toLowerCase() === '.md' ? file : file + '.md';
  if (await fs.pathExists(newFile)) {
    process.exitCode = -1;
    console.error(chalk.red(`File "${newFile}" already exists.`));
    return;
  }

  try {
    await createNewArticle(newFile);
    console.info(`Created ${chalk.green(newFile)}.`);
  } catch (error) {
    process.exitCode = -1;
    console.error(chalk.red(`Error: ${(error as Error).message}`));
    console.error('New article creation failed.');
  }
}
