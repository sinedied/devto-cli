const debug = require('debug')('article');
const path = require('path');
const fs = require('fs-extra');
const globby = require('globby');
const matter = require('gray-matter');
const slugify = require('slugify');
const { updateImagesUrls } = require('./util');

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
  const metadata = {
    title: remoteData.title,
    description: remoteData.description,
    tags: remoteData.tag_list.join(', '),
    cover_image: remoteData.cover_image,
    published: remoteData.published,
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
  return updateImagesUrls(article, repository);
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

  if (remoteData.id && !data.id) {
    data.id = remoteData.id;
    hasChanged = true;
  }

  if (data.published && !data.date && remoteData.published_at) {
    data.date = remoteData.published_at;
    hasChanged = true;
  }

  if (hasChanged) {
    debug('Article "%s" has pending changes', data.title);
    await saveArticleToFile(newArticle);
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
  return localArticles.map(article => {
    if (article.data.id) {
      return article;
    }

    const title = article.data.title && article.data.title.trim();
    const remoteArticle = remoteArticles.find(a => a.data.title.trim() === title);

    if (remoteArticle && remoteArticle.data.id) {
      debug('Reconciled article "%s" to ID %s', article.data.title, remoteArticle.data.id);
      const reconciledMetadata = idOnly ? { id: remoteArticle.data.id } : { ...remoteArticle.data };

      return {
        ...article,
        data: {
          ...article.data,
          ...reconciledMetadata
        }
      };
    }

    return article;
  });
}

function checkIfArticleNeedsUpdate(remoteArticles, article) {
  if (!article.data.id) {
    return true;
  }

  const remoteArticle = remoteArticles.find(a => a.data.id === article.data.id);
  if (!remoteArticle) {
    throw new Error(`Cannot find published article on dev.to: ${article.data.title}`);
  }

  const remoteMarkdown = matter.stringify(remoteArticle, remoteArticle.data);
  const localMarkdown = matter.stringify(article, article.data);

  return localMarkdown !== remoteMarkdown;
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
  createNewArticle
};
