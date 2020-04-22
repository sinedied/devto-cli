const minimist = require('minimist');
const dotenv = require('dotenv');
const { init, createNew, publish, pullUpdates, showStats } = require('./lib/commands');

const help = `Usage: devto <init|new|publish|pull|stats> [options]

Commands:
  i, init             Init current dir as an article repository
    -p, --pull        Pull your articles from dev.to
  n, new <file>       Create new article
  p, publish [files]  Publish articles to dev.to [default: posts/**/*.md]
    -c, --check-img   Check all images to be online before publishing
    -d, --dry-run     Do not make actual changes on dev.to
    -e, --reconcile   Reconcile articles without id using their title
  u, pull [files]     Pull updates from dev.to   [default: posts/**/*.md]
    -e, --reconcile   Reconcile articles without id using their title
  s, stats            Display stats for your latest published articles
    -n, --number <n>  Number of articles to list stats for [default: 10]
    -j, --json        Format result as JSON

General options:
  -t, --token <token> Use this dev.to API token
  -r, --repo <repo>   GitHub repository (in "user/repo" form)
  -v, --version       Show version
  --help              Show this help
`;

function run(args) {
  const options = minimist(args, {
    number: ['number', 'depth'],
    string: ['token', 'repo'],
    boolean: ['help', 'version', 'reconcile', 'check-img', 'json', 'pull', 'verbose'],
    alias: {
      e: 'reconcile',
      d: 'dry-run',
      c: 'check-img',
      n: 'number',
      t: 'token',
      v: 'version',
      j: 'json',
      p: 'pull',
      r: 'repo'
    }
  });

  if (options.version) {
    const pkg = require('./package.json');
    return console.log(pkg.version);
  }

  if (options.help) {
    return console.log(help);
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
        pull: options.pull
      });
    case 'n':
    case 'new':
      return createNew();
    case 'p':
    case 'publish':
      return publish(parameters, {
        devtoKey: options.token,
        repo: options.repo,
        dryRun: options.dryRun,
        reconcile: options.reconcile,
        checkImages: options['check-img']
      });
    case 'u':
    case 'pull':
      return pullUpdates({
        devtoKey: options.token,
        repo: options.repo,
        reconcile: options.reconcile
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

module.exports = run;
