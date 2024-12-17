// eslint-disable-next-line import/no-extraneous-dependencies
import { jest } from "@jest/globals";
import { validateTags } from "../src/util";

jest.unstable_mockModule("fs-extra", () => ({
  __esModule: true,
  default: {
    writeFile: jest.fn(),
    readFile: jest.fn()
  }
}));

const { convertPathToPosix, updateRelativeImageUrls, getImageUrls, scaleNumber, replaceInFile } = await import(
  "../src/util"
);

describe("utilities", () => {
  describe("convertPathToPosix", () => {
    it("should convert a windows path", () => {
      expect(convertPathToPosix("c:\\test\\path")).toEqual("c:/test/path");
    });

    it("should not change a posix path", () => {
      expect(convertPathToPosix("./posix/path")).toEqual("./posix/path");
    });
  });

  describe("updateRelativeImageUrls", () => {
    const repository = { user: "me", name: "repo" };

    it("should update local images with full github url", () => {
      const article = {
        file: "test.md",
        data: {},
        content: `
          ![blurb](local/image.jpg)
          ![](/image.png)
          ![](./image.gif "with title")
          ![](http://site.com/image.jpg)`
      };
      const updatedArticle = updateRelativeImageUrls(article, repository, "master");
      expect(updatedArticle.content).toMatchInlineSnapshot(`
        "
                  ![blurb](https://raw.githubusercontent.com/me/repo/master/local/image.jpg)
                  ![](https://raw.githubusercontent.com/me/repo/master/image.png)
                  ![](https://raw.githubusercontent.com/me/repo/master/image.gif "with title")
                  ![](http://site.com/image.jpg)"
      `);
    });

    it("should update cover image url", () => {
      const article = {
        file: "test.md",
        data: { cover_image: "./local.jpg" },
        content: ""
      };
      const updatedArticle = updateRelativeImageUrls(article, repository, "main");
      expect(updatedArticle.data).toEqual({
        cover_image: "https://raw.githubusercontent.com/me/repo/main/local.jpg"
      });
    });

    it("should not change cover image url", () => {
      const article = {
        file: "test.md",
        data: { cover_image: "https://distant.jpg" },
        content: ""
      };
      const updatedArticle = updateRelativeImageUrls(article, repository, "master");
      expect(updatedArticle.data).toEqual({ cover_image: "https://distant.jpg" });
    });
  });

  describe("getImageUrls", () => {
    it("should get all images urls", () => {
      const article = {
        file: "test.md",
        data: {},
        content: `
          ![blurb](local/image.jpg)
          ![](/image.png)
          ![](./image.gif "with title")
          ![](http://site.com/image.jpg)`
      };
      const urls = getImageUrls(article);
      expect(urls).toEqual(["local/image.jpg", "/image.png", "./image.gif", "http://site.com/image.jpg"]);
    });
  });

  describe("scaleNumber", () => {
    it("should convert number to string", () => {
      expect(scaleNumber(123)).toEqual("123");
    });

    it("should scale to K and round number", () => {
      expect(scaleNumber(12_365)).toEqual("12.4K");
    });

    it("should scale to G and round number", () => {
      expect(scaleNumber(1_234_567_890)).toEqual("1.23G");
    });

    it("should scale to K and round number with specified length", () => {
      expect(scaleNumber(12_365, 6)).toEqual("12.37K");
    });
  });

  describe("replaceInFile", () => {
    it("should replace string in file", async () => {
      const fs: any = (await import("fs-extra")).default;
      fs.readFile.mockImplementation(async () => "Lorem ipsum dolor sit amet");
      await replaceInFile("dummy.md", "ipsum", "replaced");

      expect(fs.writeFile).toHaveBeenCalledWith("dummy.md", "Lorem replaced dolor sit amet");
    });

    it("should replace multiple string occurences in file", async () => {
      const fs: any = (await import("fs-extra")).default;
      fs.readFile.mockImplementation(async () => "Lorem ipsum dolor sit amet ipsum bis");
      await replaceInFile("dummy.md", "ipsum", "replaced");

      expect(fs.writeFile).toHaveBeenCalledWith("dummy.md", "Lorem replaced dolor sit amet replaced bis");
    });
  });

  describe("validateTags", () => {
    it("should return an array of valid tags", () => {
      const tags = "terraform,devops,validation,practices";
      const result = validateTags(tags);
      expect(result).toEqual(["terraform", "devops", "validation", "practices"]);
    });

    it("should throw an error if tags exceed the maximum allowed", () => {
      const tags = "tag1,tag2,tag3,tag4,tag5";
      expect(() => validateTags(tags)).toThrow("Too many tags. Max allowed: 4");
    });

    it("should throw an error for invalid tags", () => {
      const tags = "validTag1,invalid@tag,another-invalid-tag!";
      expect(() => validateTags(tags)).toThrow("Invalid tags: invalid@tag, another-invalid-tag!");
    });

    it("should allow valid tags with mixed cases and numbers", () => {
      const tags = "NodeJS,React2024,terraform,devops";
      const result = validateTags(tags);
      expect(result).toEqual(["NodeJS", "React2024", "terraform", "devops"]);
    });

    it("should trim whitespace around tags", () => {
      const tags = " tag1 , tag2,tag3 ,  tag4 ";
      const result = validateTags(tags);
      expect(result).toEqual(["tag1", "tag2", "tag3", "tag4"]);
    });
  });
});
