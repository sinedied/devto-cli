import { dirname } from 'path';
import { fileURLToPath } from 'url';

const { getArticlesFromFiles } = await import('../src/article');
const __dirname = dirname(fileURLToPath(import.meta.url));

describe('articles', () => {
  describe('getArticlesFromFiles', () => {
    it('should get articles from given glob', async () => {
      const articles = await getArticlesFromFiles([`${__dirname}/fixtures/*.md`]);
      expect(articles.length).toBe(1);
      expect(articles[0].data.title).toBe('this is an article');
    });

    it('should return an empty array', async () => {
      const articles = await getArticlesFromFiles([`${__dirname}/*.md`]);
      expect(articles).toEqual([]);
    });
  });
});
