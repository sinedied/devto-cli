const minimist = require('minimist');
const dotenv = require('dotenv');
const { init, createNew, publish, showStats } = require('./lib/commands');

const help = `Usage: devto <init|new|publish|pull|stats> [options]

Commands:
  i, init             Init current dir as an article repository
    -p, --pull        Pull your articles from dev.to
  n, new <file>       Create new article
  p, publish [files]  Publish articles to dev.to [default: posts/**/*.md]
    -r, --reconcile   Reconcile articles without id using their title
    -c, --check-img   Check all images to be online before publishing
    -d, --dry-run     Do not make actual changes on dev.to
  u, pull [files]     Pull updates from dev.to   [default: posts/**/*.md]
    -r, --reconcile   Reconcile articles without id using their title
  s, stats            Display stats for your latest published articles
    -n, --number <n>  Number of articles to list stats for [default: 10]
    -j, --json        Format result as JSON

General options:
  -t, --token <token> Use this dev.to API token
  -v, --version       Show version
  --help              Show this help
`;

function run(args) {
  const options = minimist(args, {
    number: ['number', 'depth'],
    string: ['token'],
    boolean: ['help', 'version', 'reconcile', 'check-img', 'json'],
    alias: {
      r: 'reconcile',
      d: 'dry-run',
      c: 'check-img',
      n: 'number',
      t: 'token',
      v: 'version',
      j: 'json'
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
      return init();
    case 'n':
    case 'new':
      return createNew();
    case 'p':
    case 'publish':
      return publish(parameters, {
        devtoKey: options.token,
        dryRun: options.dryRun,
        reconcile: options.reconcile,
        checkImages: options['check-img']
      });
    case 's':
    case 'stats':
      return showStats(options.token, options.number, options.json);
    default:
      return console.log(help);
  }
}

module.exports = run;
