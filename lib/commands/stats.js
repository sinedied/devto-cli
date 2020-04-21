const chalk = require('chalk');
const { table } = require('table');
const { getLastArticlesStats } = require('../devto');
const { scaleNumber } = require('../util');

async function showStats(options) {
  options = options || {};
  options.number = options.number || 10;

  if (!options.devtoKey) {
    process.exitCode = -1;
    return console.error(
      chalk`{red No dev.to API key set.}\nUse {bold --token} option or {bold .env} file to set one.`
    );
  }

  const stats = await getLastArticlesStats(options.devtoKey, options.number);

  if (stats.length === 0) {
    return console.info(`No published articles found.`);
  }

  if (options.json) {
    return console.info(stats);
  }

  const remainingWidth = 42; // <- obviously :)
  const availableWidth = process.stdout.columns || 80;
  const maxTitleWidth = Math.max(availableWidth - remainingWidth, 8);

  const rows = stats.map(a => [
    new Date(a.date).toLocaleDateString(),
    a.title,
    scaleNumber(a.views),
    scaleNumber(a.reactions),
    scaleNumber(a.comments)
  ]);
  rows.unshift(['Date', 'Title', 'Views', 'Likes', 'Comm.']);
  console.log(
    table(rows, {
      drawHorizontalLine: (index, size) => index === 0 || index === 1 || index === size,
      columns: { 1: { truncate: maxTitleWidth, width: maxTitleWidth } }
    })
  );
}

module.exports = showStats;
