const fs = require('fs-extra');
const globby = require('globby');
const matter = require('gray-matter');
const { updateImagesUrls } = require('./util');

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

function getArticleFromRemoteData(data) {
  const article = matter(data.body_markdown);
  return {
    ...article,
    file: null,
    data: {
      ...article.data,
      id: data.id,
      title: data.title,
      description: data.description,
      cover_image: data.cover_image,
      date: data.published_at,
      tags: data.tag_list.join(', ')
    }
  };
}

function prepareArticleForDevto(article, repository) {
  return updateImagesUrls(article, repository);
}

async function saveArticleToFile(article) {
  try {
    const markdown = matter.stringify(article.content, article.data);
    fs.writeFileSync(article.file, markdown);
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
    await saveArticleToFile(newArticle);
  }

  return { ...newArticle, hasChanged };
}

function reconcileLocalArticles(remoteArticles, localArticles) {
  return localArticles.map(article => {
    if (article.data.id) {
      return article;
    }

    const title = article.data.title && article.data.title.trim();
    const remoteArticle = remoteArticles.find(a => a.data.title === title);

    if (remoteArticle && remoteArticle.data.id) {
      return {
        ...article,
        data: {
          ...article.data,
          id: remoteArticle.data.id,
          published: remoteArticle.data.published,
          // TODO: fill in if needed when fetching
          date: remoteArticle.data.date
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

module.exports = {
  getArticlesFromFiles,
  getArticlesFromRemoteData,
  prepareArticleForDevto,
  updateLocalArticle,
  checkIfArticleNeedsUpdate,
  reconcileLocalArticles
};
