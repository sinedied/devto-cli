import {
  convertPathToPosix,
  updateRelativeImageUrls,
  getImageUrls,
  scaleNumber,
  replaceInFile
} from '../src/util';

jest.mock('fs-extra');

describe('utilities', () => {
  describe('convertPathToPosix', () => {
    it('should convert a windows path', () => {
      expect(convertPathToPosix('c:\\test\\path')).toEqual('c:/test/path');
    });

    it('should not change a posix path', () => {
      expect(convertPathToPosix('./posix/path')).toEqual('./posix/path');
    });
  });

  describe('updateRelativeImageUrls', () => {
    const repository = { user: 'me', name: 'repo' };

    it('should update local images with full github url', () => {
      const article = {
        file: 'test.md',
        data: {},
        content: `
          ![blurb](local/image.jpg)
          ![](/image.png)
          ![](./image.gif "with title")
          ![](http://site.com/image.jpg)`
      };
      const updatedArticle = updateRelativeImageUrls(article, repository);
      expect(updatedArticle.content).toMatchInlineSnapshot(`
        "
                  ![blurb](https://raw.githubusercontent.com/me/repo/master/local/image.jpg)
                  ![](https://raw.githubusercontent.com/me/repo/master/image.png)
                  ![](https://raw.githubusercontent.com/me/repo/master/image.gif \\"with title\\")
                  ![](http://site.com/image.jpg)"
      `);
    });

    it('should update cover image url', () => {
      const article = {
        file: 'test.md',
        data: { cover_image: './local.jpg' },
        content: ''
      };
      const updatedArticle = updateRelativeImageUrls(article, repository);
      expect(updatedArticle.data).toEqual({
        cover_image: 'https://raw.githubusercontent.com/me/repo/master/local.jpg'
      });
    });

    it('should not change cover image url', () => {
      const article = {
        file: 'test.md',
        data: { cover_image: 'https://distant.jpg' },
        content: ''
      };
      const updatedArticle = updateRelativeImageUrls(article, repository);
      expect(updatedArticle.data).toEqual({ cover_image: 'https://distant.jpg' });
    });
  });

  describe('getImageUrls', () => {
    it('should get all images urls', () => {
      const article = {
        file: 'test.md',
        data: {},
        content: `
          ![blurb](local/image.jpg)
          ![](/image.png)
          ![](./image.gif "with title")
          ![](http://site.com/image.jpg)`
      };
      const urls = getImageUrls(article);
      expect(urls).toEqual(['local/image.jpg', '/image.png', './image.gif', 'http://site.com/image.jpg']);
    });
  });

  describe('scaleNumber', () => {
    it('should convert number to string', () => {
      expect(scaleNumber(123)).toEqual('123');
    });

    it('should scale to K and round number', () => {
      expect(scaleNumber(12365)).toEqual('12.4K');
    });

    it('should scale to G and round number', () => {
      expect(scaleNumber(1234567890)).toEqual('1.23G');
    });

    it('should scale to K and round number with specified length', () => {
      expect(scaleNumber(12365, 6)).toEqual('12.37K');
    });
  });

  describe('replaceInFile', () => {
    it('should replace string in file', async () => {
      const fs = require('fs-extra');
      fs.readFile.mockImplementation(async () => 'Lorem ipsum dolor sit amet');
      await replaceInFile('dummy.md', 'ipsum', 'replaced');

      expect(fs.writeFile).toHaveBeenCalledWith('dummy.md', 'Lorem replaced dolor sit amet');
    });
  });
});
