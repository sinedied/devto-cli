import Debug from 'debug';
import chalk from 'chalk';
import { table, getBorderCharacters } from 'table';
import pMap from 'p-map';
import {
  Article,
  getArticlesFromFiles,
  getArticlesFromRemoteData,
  prepareArticleForDevto,
  checkIfArticleNeedsUpdate,
  updateLocalArticle,
  saveArticleToFile,
  reconcileLocalArticles,
  checkArticleForOfflineImages
} from '../article';
import { getAllArticles, updateRemoteArticle } from '../api';
import { Repository, getRepository } from '../repo';
import { syncStatus, publishedStatus } from '../status';
import { createSpinner } from '../spinner';

const debug = Debug('push');

interface PushOptions {
  devtoKey: string;
  repo: string;
  dryRun: boolean;
  reconcile: boolean;
  checkImages: true;
}

interface PushResult {
  article: Article;
  status: string; // TODO
  publishedStatus: string; // TODO
}

function showResults(results: PushResult[]) {
  const rows = results.map((r) => [r.status, r.publishedStatus, r.article.data.title]);
  const usedWidth = 27; // Status columns + padding
  const availableWidth = process.stdout.columns || 80;
  const maxTitleWidth = Math.max(availableWidth - usedWidth, 8);

  console.info(
    table(rows, {
      drawHorizontalLine: () => false,
      border: getBorderCharacters('void'),
      columnDefault: { paddingLeft: 0, paddingRight: 1 },
      columns: { 2: { truncate: maxTitleWidth, width: maxTitleWidth } }
    }).slice(0, -1)
  );
}

async function getRemoteArticles(devtoKey: string): Promise<Article[]> {
  const remoteData = await getAllArticles(devtoKey);
  const remoteArticles = getArticlesFromRemoteData(remoteData);
  debug('Retrieved %s article(s)', remoteArticles.length);
  return remoteArticles;
}

async function processArticles(localArticles: Article[], remoteArticles: Article[], repository: Repository, options: Partial<PushOptions>): Promise<PushResult[]> {
  const processArticle = async (article: Article) => {
    let newArticle = prepareArticleForDevto(article, repository);
    const needsUpdate = checkIfArticleNeedsUpdate(remoteArticles, newArticle);
    let status = newArticle.hasChanged ? syncStatus.reconciled : syncStatus.upToDate;
    let updateResult = null;

    if (needsUpdate) {
      try {
        const hasOfflineImages = options.checkImages && (await checkArticleForOfflineImages(newArticle));

        if (!options.dryRun && !hasOfflineImages) {
          updateResult = await updateRemoteArticle(newArticle, options.devtoKey!);
          newArticle = await updateLocalArticle(article, updateResult);
        }

        if (hasOfflineImages) {
          status = syncStatus.imageOffline;
        } else {
          status = newArticle.data.id ? syncStatus.updated : syncStatus.created;
        }
      } catch (error) {
        debug('Article update failed: %s', error.toString());
        status = syncStatus.failed;
      }
    }

    if (updateResult || newArticle.hasChanged) {
      try {
        debug('Article "%s" has pending changes', newArticle.data.title);
        if (!options.dryRun) {
          await saveArticleToFile(newArticle);
        }
      } catch (error) {
        debug('Cannot save article "%s": %s', newArticle.data.title, error.toString());
        status = syncStatus.outOfSync;
      }
    }

    return {
      article: newArticle,
      status,
      publishedStatus: newArticle.data.published ? publishedStatus.published : publishedStatus.draft
    };
  };

  return pMap(localArticles, processArticle, { concurrency: 5 });
}

export async function push(files: string[], options?: Partial<PushOptions>) {
  options = options || {};
  files = files.length > 0 ? files : ['posts/**/*.md'];
  debug('files: %O', files);
  debug('options: %O', options);

  if (!options.devtoKey) {
    process.exitCode = -1;
    return console.error(
      chalk`{red No dev.to API key provided.}\nUse {bold --token} option or {bold .env} file to provide one.`
    );
  }

  if (options.dryRun) {
    console.warn(chalk`{yellow Running in dry run mode, local and remote changes will be skipped}`);
  }

  const spinner = createSpinner(debug);

  try {
    const repository = await getRepository(options.repo);
    if (!repository) {
      process.exitCode = -1;
      return console.error(
        chalk`{red No GitHub repository provided.}\nUse {bold --repo} option or {bold .env} file to provide one.`
      );
    }

    let articles = await getArticlesFromFiles(files);
    console.info(chalk`Found {green ${articles.length}} article(s)`);

    if (articles.length === 0) {
      console.warn(chalk`No articles to push.`);
      return;
    }

    spinner.text = 'Retrieving articles from dev.to…';
    spinner.start();
    const remoteArticles = await getRemoteArticles(options.devtoKey);

    if (options.reconcile) {
      spinner.text = 'Reconciling articles…';
      articles = reconcileLocalArticles(remoteArticles, articles);
    }

    spinner.text = 'Pushing articles to dev.to…';
    const results = await processArticles(articles, remoteArticles, repository, options);

    spinner.stop();
    showResults(results);

    const outOfSync = results.some((r) => r.status === syncStatus.outOfSync);
    if (outOfSync) {
      console.info(chalk`{yellow Some local files are out of sync. Retry pushing with {bold --reconcile} option.}`);
    }

    const failed = results.some((r) => r.status === syncStatus.failed || r.status === syncStatus.imageOffline);
    if (failed) {
      process.exitCode = -1;
    }
  } catch (error) {
    spinner.stop();
    process.exitCode = -1;
    console.error(chalk`{red Error: ${error.message}}`);
    console.error('Push failed');
  }
}
