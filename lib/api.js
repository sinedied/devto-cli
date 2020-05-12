const debug = require('debug')('devto');
const got = require('got');
const matter = require('gray-matter');
const pThrottle = require('p-throttle');

const apiUrl = 'https://dev.to/api';
const paginationLimit = 1000;

// There's a limit of 10 articles created each 30 seconds by the same user,
// so we need to throttle the API calls in that case.
const throttledPostForCreate = pThrottle(got.post, 10, 30500);

async function getAllArticles(devtoKey) {
  try {
    const articles = [];
    let page = 1;
    const getPage = (page) =>
      got(`${apiUrl}/articles/me/all`, {
        searchParams: { per_page: paginationLimit, page },
        headers: { 'api-key': devtoKey },
        responseType: 'json'
      });

    // Handle pagination
    let newArticles;
    do {
      debug('Requesting articles (page %s)', page);
      // eslint-disable-next-line no-await-in-loop
      const result = await getPage(page++);
      newArticles = result.body;
      articles.push(...newArticles);
    } while (newArticles.length === paginationLimit);

    debug('Found %s remote article(s)', articles.length);
    return articles;
  } catch (error) {
    if (error && error.response) {
      debug('Debug infos: %O', error.response.body);
    }

    throw error;
  }
}

async function getLastArticlesStats(devtoKey, number) {
  try {
    const result = await got(`${apiUrl}/articles/me`, {
      searchParams: { per_page: number || 10 },
      headers: { 'api-key': devtoKey },
      responseType: 'json'
    });
    return result.body.map((a) => ({
      date: a.published_at,
      title: a.title,
      views: a.page_views_count,
      reactions: a.positive_reactions_count,
      comments: a.comments_count
    }));
  } catch (error) {
    if (error && error.response) {
      debug('Debug infos: %O', error.response.body);
    }

    throw error;
  }
}

async function updateRemoteArticle(article, devtoKey) {
  try {
    const markdown = matter.stringify(article, article.data, { lineWidth: -1 });
    const { id } = article.data;
    // Throttle API calls in case of article creation
    const get = id ? got.put : throttledPostForCreate;
    const result = await get(`${apiUrl}/articles${id ? `/${id}` : ''}`, {
      headers: { 'api-key': devtoKey },
      json: { article: { title: article.data.title, body_markdown: markdown } },
      responseType: 'json'
    });
    return result.body;
  } catch (error) {
    if (error && error.response) {
      debug('Debug infos: %O', error.response.body);
    }

    throw error;
  }
}

module.exports = {
  getAllArticles,
  getLastArticlesStats,
  updateRemoteArticle
};
