import path from 'path';
import chalk from 'chalk';
import fs from 'fs-extra';
import { createNewArticle } from '../article';

export async function createNew(file?: string) {
  if (!file) {
    process.exitCode = -1;
    return console.error(chalk`{red No file name provided.}`);
  }

  const newFile = path.extname(file).toLowerCase() === '.md' ? file : file + '.md';
  if (await fs.pathExists(newFile)) {
    process.exitCode = -1;
    return console.error(chalk`{red File "${newFile}" already exists.}`);
  }

  try {
    await createNewArticle(newFile);
    console.info(chalk`Created {green ${newFile}}.`);
  } catch (error) {
    process.exitCode = -1;
    console.error(chalk`{red Error: ${(error as Error).message}}`);
    console.error('New article creation failed.');
  }
}
