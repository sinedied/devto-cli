const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const { createNewArticle } = require('../article');

async function createNew(file) {
  if (!file) {
    process.exitCode = -1;
    return console.error(chalk`{red No file name provided.}`);
  }

  const newFile = path.extname(file).toLowerCase() === '.md' ? file : file + '.md';
  if (await fs.exists(newFile)) {
    process.exitCode = -1;
    return console.error(chalk`{red File "${newFile}" already exists.}`);
  }

  try {
    await createNewArticle(newFile);
  } catch (error) {
    process.exitCode = -1;
    console.error(chalk`{red Error: ${error.message}}`);
    console.error('New article creation failed.');
  }
}

module.exports = createNew;
