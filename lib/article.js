const debug = require('debug')('article');
const path = require('path');
const fs = require('fs-extra');
const globby = require('globby');
const matter = require('gray-matter');
const slugify = require('slugify');
const got = require('got');
const pMap = require('p-map');
const { updateRelativeImageUrls, getImageUrls } = require('./util');

const defaultArticlesFolder = 'posts';

async function getArticlesFromFiles(filesGlob) {
  const files = await globby(filesGlob);
  return Promise.all(files.map(getArticleFromFile));
}

async function getArticleFromFile(file) {
  const content = await fs.readFile(file, 'utf-8');
  const article = matter(content, { language: 'yaml' });
  return { file, ...article };
}

function getArticlesFromRemoteData(data) {
  return (data || []).map(getArticleFromRemoteData);
}

function generateFrontMatterMetadata(remoteData) {
  const { data: frontmatter } = matter(remoteData.body_markdown);
  // Note: series info is missing here as it's not available through the dev.to API yet
  const metadata = {
    title: frontmatter.title ? null : remoteData.title,
    description: frontmatter.description ? null : remoteData.description,
    tags: frontmatter.tags ? null : remoteData.tag_list.join(', '),
    cover_image: frontmatter.cover_image ? null : remoteData.cover_image,
    canonical_url:
      frontmatter.canonical_url || remoteData.url === remoteData.canonical_url ? null : remoteData.canonical_url,
    published: remoteData.published ? true : null,
    id: remoteData.id,
    date: remoteData.published_at
  };

  // Clean up unset properties
  for (const p in metadata) {
    if (metadata[p] === null || metadata[p] === undefined) {
      delete metadata[p];
    }
  }

  return metadata;
}

function getArticleFromRemoteData(data) {
  const article = matter(data.body_markdown);
  return {
    ...article,
    file: null,
    data: {
      ...article.data,
      ...generateFrontMatterMetadata(data)
    }
  };
}

function prepareArticleForDevto(article, repository) {
  return updateRelativeImageUrls(article, repository);
}

async function saveArticleToFile(article) {
  try {
    const markdown = matter.stringify(article.content, article.data);
    await fs.ensureDir(path.dirname(article.file));
    await fs.writeFile(article.file, markdown);
    debug('Saved article "%s" to file "%s"', article.data.title, article.file);
  } catch (error) {
    throw new Error(`Cannot write to file "${article.file}": ${error}`);
  }
}

async function updateLocalArticle(article, remoteData) {
  const data = { ...article.data };
  const newArticle = { ...article, data };
  let hasChanged = false;

  if (remoteData.id) {
    data.id = remoteData.id;
    hasChanged = true;
  }

  if (remoteData.published_at) {
    data.date = remoteData.published_at;
    hasChanged = true;
  }

  return { ...newArticle, hasChanged };
}

function generateArticleFilename(article) {
  if (!article.data || !article.data.title) {
    throw new Error('No title found');
  }

  const name = slugify(article.data.title, { lower: true, strict: true });
  const file = path.join(defaultArticlesFolder, name + '.md');
  return { ...article, file };
}

function reconcileLocalArticles(remoteArticles, localArticles, idOnly = true) {
  return localArticles.map((article) => {
    if (article.data.id) {
      return article;
    }

    const title = article.data.title && article.data.title.trim();
    const remoteArticle = remoteArticles.find((a) => a.data.title.trim() === title);

    if (remoteArticle && remoteArticle.data.id) {
      debug('Reconciled article "%s" to ID %s', article.data.title, remoteArticle.data.id);
      const reconciledMetadata = idOnly ? { id: remoteArticle.data.id } : { ...remoteArticle.data };

      return {
        ...article,
        data: {
          ...article.data,
          ...reconciledMetadata
        },
        hasChanged: true
      };
    }

    return article;
  });
}

function areArticlesEqual(article1, article2) {
  // Note: ignore date for comparison, since dev.to does not always format it the same way,
  // and it's not meant to be updated anyways
  const a1 = matter.stringify(article1, { ...article1.data, date: null });
  const a2 = matter.stringify(article2, { ...article2.data, date: null });
  return a1 === a2;
}

function checkIfArticleNeedsUpdate(remoteArticles, article) {
  if (!article.data.id) {
    return true;
  }

  const remoteArticle = remoteArticles.find((a) => a.data.id === article.data.id);
  if (!remoteArticle) {
    throw new Error(`Cannot find published article on dev.to: ${article.data.title}`);
  }

  return !areArticlesEqual(remoteArticle, article);
}

async function createNewArticle(file) {
  const article = {
    file,
    content: `My article content`,
    data: {
      title: 'My article title',
      description: 'My article description',
      tags: '',
      cover_image: '',
      canonical_url: null,
      published: false
    }
  };

  await saveArticleToFile(article);
}

async function checkArticleForOfflineImages(article) {
  try {
    const urls = getImageUrls(article);
    debug('Found %s image(s) to check for "%s"', urls.length, article.data.title);

    const checkUrl = async (url) => {
      debug('Checking image "%s"…', url);
      await got(url);
      return false;
    };

    await pMap(urls, checkUrl, { concurrency: 5 });
    return false;
  } catch (error) {
    if (error.response) {
      debug('Image "%s" appears to be offline', error.response.requestUrl);
    } else {
      debug('Error while checking image: %s', error.toString());
    }

    return true;
  }
}

module.exports = {
  defaultArticlesFolder,
  getArticlesFromFiles,
  getArticlesFromRemoteData,
  prepareArticleForDevto,
  updateLocalArticle,
  checkIfArticleNeedsUpdate,
  reconcileLocalArticles,
  saveArticleToFile,
  generateArticleFilename,
  createNewArticle,
  checkArticleForOfflineImages
};
