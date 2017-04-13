const combineLevels = (...levels) => levels.reduce((prev, cur) => prev | cur);
const isLevel = (level1, level2) => (level1 & level2) > 0;
const LOG_LEVEL = {
  WARN: 1,
  ERROR: 2,
  INFO: 4,
  DEBUG: 8
  // PROD:
  // DEV:
};

LOG_LEVEL.ALL = combineLevels(LOG_LEVEL.WARN, LOG_LEVEL.ERROR, LOG_LEVEL.INFO, LOG_LEVEL.DEBUG);

module.exports = {isLevel, LOG_LEVEL};
