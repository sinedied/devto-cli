const chalk = require('chalk');

const syncStatus = {
  upToDate: chalk`{grey [UP-TO-DATE]}`,
  created: chalk`{green [CREATED]}`,
  updated: chalk`{green [UPDATED]}`,
  reconciled: chalk`{cyan [RECONCILED]}`,
  failed: chalk`{red [FAILED]}`,
  outOfSync: chalk`{yellow [OUT-OF-SYNC]}`,
  imageOffline: chalk`{red [IMG OFFLINE]}`
};

const publishedStatus = {
  draft: chalk`{grey [DRAFT]}`,
  published: chalk`{cyan [PUBLISHED]}`
};

module.exports = {
  syncStatus,
  publishedStatus
};
