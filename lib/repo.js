const fs = require('fs-extra');
const findUp = require('find-up');

const repositoryRegex = /.*\/(.*)\/(.*)\.git|^([^/]*)\/([^/]*)$/;

function parseRepository(string) {
  if (!string) {
    return null;
  }

  const match = string.match(repositoryRegex);
  if (!match) {
    return null;
  }

  const shorthand = Boolean(match[3]);
  return {
    user: shorthand ? match[3] : match[1],
    name: shorthand ? match[4] : match[2]
  };
}

async function getRepositoryFromPackage() {
  const pkgPath = await findUp('package.json');
  if (!pkgPath) {
    throw new Error(`Cannot find package.json.`);
  }

  const pkg = await fs.readJson(pkgPath);
  const repository = parseRepository((pkg.repository && pkg.repository.url) || pkg.repository);
  if (!repository) {
    throw new Error(
      `Cannot read repository from package.json.\nMake sure you have a "repository" attribute with your git repository URL.`
    );
  }

  return repository;
}

module.exports = {
  parseRepository,
  getRepositoryFromPackage
};
