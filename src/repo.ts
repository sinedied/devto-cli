import process from 'process';
import Debug from 'debug';
import fs from 'fs-extra';
import { findUp } from 'find-up';
import hasbin from 'hasbin';
import execa from 'execa';
import { Repository } from './models.js';

const debug = Debug('repo');
const repositoryRegex = /.*[/:](.*)\/(.*)\.git|^([^/]*)\/([^/]*)$/;
const packageFile = 'package.json';

export const getShorthandString = (repo: Repository) => `${repo.user}/${repo.name}`;
export const hasGitInstalled = async () =>
  new Promise((resolve) => {
    hasbin('git', resolve);
  });

export function parseRepository(string?: string): Repository | null {
  if (!string) {
    return null;
  }

  const match = repositoryRegex.exec(string);
  if (!match) {
    return null;
  }

  const shorthand = Boolean(match[3]);
  return {
    user: shorthand ? match[3] : match[1],
    name: shorthand ? match[4] : match[2]
  };
}

export async function getRepositoryFromPackage(searchUp?: boolean): Promise<Repository | null> {
  let pkgPath: string | undefined;

  if (searchUp) {
    pkgPath = await findUp(packageFile);
  } else if (await fs.pathExists(packageFile)) {
    pkgPath = packageFile;
  }

  if (!pkgPath) {
    debug('No package.json found');
    return null;
  }

  try {
    const pkg: any = await fs.readJson(pkgPath);
    const repository = parseRepository(pkg.repository?.url || pkg.repository);
    debug(
      repository ? 'Repository found in package.json:' : 'No repository found in package.json',
      repository ? getShorthandString(repository) : ''
    );
    return repository;
  } catch (error) {
    debug('Error while reading package.json:', String(error));
    return null;
  }
}

export async function getRepositoryFromGit(): Promise<Repository | null> {
  if (!(await hasGitInstalled())) {
    debug('Git binary not found');
    return null;
  }

  try {
    const { stdout } = await execa('git', ['remote', 'get-url', 'origin']);
    const repository = parseRepository(stdout);
    debug(
      repository ? 'Repository found in git origin:' : 'No repository found in git origin',
      repository ? getShorthandString(repository) : ''
    );
    return repository;
  } catch (error) {
    debug(`Git error: ${String(error as Error)}`);
    return null;
  }
}

export function getRepositoryFromStringOrEnv(string?: string): Repository | null {
  return parseRepository(string) ?? parseRepository(process.env.DEVTO_REPO);
}

export async function getRepository(string?: string, searchPackageUp = true): Promise<Repository | null> {
  return (
    getRepositoryFromStringOrEnv(string) ?? (await getRepositoryFromGit()) ?? getRepositoryFromPackage(searchPackageUp)
  );
}

export async function isGitRepository() {
  return (await hasGitInstalled()) && fs.pathExists('.git');
}

export async function initGitRepository() {
  try {
    await execa('git', ['init']);
    debug('Git repository initialized');

    const currentBranch = await getCurrentBranchFromGit();
    if (currentBranch !== 'main') {
      await execa('git', ['branch', '-M', 'main']);
      debug('Git: renamed branch to "main"');
    }
  } catch (error) {
    debug(`Git error: ${String(error as Error)}`);
  }
}

export async function getCurrentBranchFromGit(): Promise<string | null> {
  if (!(await hasGitInstalled())) {
    debug('Git binary not found');
    return null;
  }

  try {
    const { stdout } = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
    return stdout.trim();
  } catch (error) {
    debug(`Git error: ${String(error as Error)}`);
    return null;
  }
}

export function getBranchFromStringOrEnv(string?: string): string | null {
  const branch = string || process.env.DEVTO_BRANCH;
  return branch?.trim() || null;
}

export async function getBranch(string?: string): Promise<string | null> {
  return getBranchFromStringOrEnv(string) ?? getCurrentBranchFromGit();
}
