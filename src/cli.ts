import debug from 'debug';
import minimist from 'minimist';
import dotenv from 'dotenv';
import { init, createNew, push, showStats } from './commands';

const help = `Usage: devto <init|new|push|stats> [options]

Commands:
  i, init            Init current dir as an article repository
    -p, --pull       Pull your articles from dev.to
    -s, --skip-git   Skip git repository init
  n, new <file>      Create new article
  p, push [files]    Push articles to dev.to [default: posts/**/*.md]
    -c, --check-img  Check all images to be online before pushing
    -d, --dry-run    Do not make actual changes on dev.to
    -e, --reconcile  Reconcile articles without id using their title
  s, stats           Display stats for your latest published articles
    -n, --number <n> Number of articles to list stats for [default: 10]
    -j, --json       Format result as JSON

General options:
  -t, --token <token> Use this dev.to API token
  -r, --repo <repo>   GitHub repository (in "user/repo" form)
  -v, --version       Show version
  --verbose           Show detailed logs
  --help              Show this help
`;

export async function run(args: string[]) {
  const options = minimist(args, <any>{
    number: ['number', 'depth'],
    string: ['token', 'repo'],
    boolean: ['help', 'version', 'reconcile', 'check-img', 'json', 'pull', 'skip-git', 'verbose'],
    alias: {
      e: 'reconcile',
      d: 'dry-run',
      c: 'check-img',
      n: 'number',
      t: 'token',
      v: 'version',
      j: 'json',
      p: 'pull',
      r: 'repo',
      s: 'skip-git'
    }
  });

  if (options.version) {
    const pkg = require('./package.json');
    return console.info(pkg.version);
  }

  if (options.help) {
    return console.info(help);
  }

  if (options.verbose) {
    debug.enable('*');
  }

  if (!options.token) {
    dotenv.config();
    options.token = process.env.DEVTO_TOKEN;
  }

  const [command, ...parameters] = options._;
  switch (command) {
    case 'i':
    case 'init':
      return init({
        devtoKey: options.token,
        repo: options.repo,
        pull: options.pull,
        skipGit: options['skip-git']
      });
    case 'n':
    case 'new':
      return createNew(parameters[0]);
    case 'p':
    case 'push':
      return push(parameters, {
        devtoKey: options.token,
        repo: options.repo,
        dryRun: options['dry-run'],
        reconcile: options.reconcile,
        checkImages: options['check-img']
      });
    case 's':
    case 'stats':
      return showStats({
        devtoKey: options.token,
        number: options.number,
        json: options.json
      });
    default:
      return console.log(help);
  }
}
