import Debug from 'debug';
import path from 'path';
import chalk from 'chalk';
import fs from 'fs-extra';
import {
  Article,
  defaultArticlesFolder,
  getArticlesFromRemoteData,
  generateArticleFilename,
  saveArticleToFile,
  createNewArticle
} from '../article';
import { getAllArticles } from '../api';
import { prompt, replaceInFile } from '../util';
import {
  getRepositoryFromStringOrEnv,
  parseRepository,
  getShorthandString,
  hasGitInstalled,
  initGitRepository
} from '../repo';
import { createSpinner } from '../spinner';

const debug = Debug('init');

interface InitOptions {
  pull: boolean;
  devtoKey: string;
  repo: string;
  skipGit: boolean;
}

async function createGitHubAction(repoString?: string) {
  let repo = getRepositoryFromStringOrEnv(repoString);
  while (!repo) {
    // eslint-disable-next-line no-await-in-loop
    const string = await prompt(chalk`{green >} Enter your GitHub repository: {grey (username/repository)} `);
    repo = parseRepository(string);
  }

  await fs.copy(path.join(__dirname, '../../template/.github'), '.github');
  await replaceInFile('.github/workflows/publish.yml', 'USERNAME/REPO', getShorthandString(repo));
}

async function importArticlesFromDevTo(devtoKey: string) {
  const remoteData = await getAllArticles(devtoKey);
  console.info(`Retrieving articles from dev.to…`);

  const remoteArticles = getArticlesFromRemoteData(remoteData);

  console.info(chalk`Found {green ${remoteArticles.length}} article(s) to import.`);

  const processArticle = async (article: Article) => {
    const newArticle = generateArticleFilename(article);
    await saveArticleToFile(newArticle);
  };

  await Promise.all(remoteArticles.map(processArticle));
}

export async function init(options?: Partial<InitOptions>) {
  options = options ?? {};
  options.pull = options.pull ?? false;
  debug('options: %O', options);

  if (options.pull && !options.devtoKey) {
    process.exitCode = -1;
    return console.error(
      chalk`{red No dev.to API key provided.}\nUse {bold --token} option or {bold .env} file to provide one.`
    );
  }

  const spinner = createSpinner(debug);

  try {
    await createGitHubAction(options.repo);

    if (options.pull) {
      spinner.text = 'Retrieving articles from dev.to…';
      spinner.start();
      await importArticlesFromDevTo(options.devtoKey!);
      spinner.stop();
    }

    const articlesFolderExists = await fs.pathExists(defaultArticlesFolder);
    if (!articlesFolderExists) {
      await createNewArticle(path.join(defaultArticlesFolder, 'article.md'));
      console.info(chalk`Created your first article draft in {green posts/article.md}!`);
    }

    if (!options.skipGit) {
      if (await hasGitInstalled()) {
        await initGitRepository();
      } else {
        console.warn(chalk`{yellow Cannot init git repository, git binary not found}`);
      }
    }

    console.info('Init done.');
    console.info(chalk`Take a look at {green .github/workflows/publish.yml} for next steps.`);
  } catch (error) {
    spinner.stop();
    process.exitCode = -1;
    console.error(chalk`{red Error: ${(error as Error).message}}`);
    console.error('Init failed.');
  }
}
