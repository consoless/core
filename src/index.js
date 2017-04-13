const isPromise = require('is-promise');
const {LOG_LEVEL, isLevel} = require('./levels');

function validateParts(parts) {
  if (!Array.isArray(parts)) {
    throw new TypeError('Transformers should return an array of messages');
  }

  return parts;
}

function reduceTransformers(transformers, type, initialParts) {
  return transformers.reduce((parts, transformer) => {
    if (isPromise(parts)) {
      return parts.then(resolvedParts => transformer(type, resolvedParts, initialParts));
    }

    return transformer(type, parts, initialParts);
  }, initialParts);
}

function reduceTransports(transports, type, args) {
  return Promise.all(transports.map(transport => transport(type, args))).then(() => args);
}

class CoreLess {
  constructor({customLogHandler}) {
    this.customLogHandler = customLogHandler;
    this.level = LOG_LEVEL.ALL;
    this.transformers = new Map();
    this.transports = new Map();
    this.config = {
      transports: {},
      transformers: {}
    };
  }

  addUniqueModifier(modifiersName, modifierFn, modifierConfig = {}) {
    const modifiers = this[modifiersName];
    const modifiersConfig = this.config[modifiersName];

    if (!modifiers) {
      throw new Error(`Illegal modifier ${modifiersName}`);
    }

    if (!modifiersConfig) {
      throw new Error(`Missing config for modifier ${modifiersName}`);
    }

    if (!modifiers.has(modifierFn)) {
      // Save config to be able to modify it from outside
      if (modifierFn.name) {
        modifiersConfig[modifierFn.name] = modifierConfig;
      }

      // Bind config in any case for usage consistency
      modifiers.set(modifierFn, modifierFn.bind({
        config: modifierConfig
      }));
    }
  }

  addTransport(transportFn, config) {
    this.addUniqueModifier('transports', transportFn, config);
  }

  addTransformer(transformerFn, config) {
    this.addUniqueModifier('transformers', transformerFn, config);
  }

  setLevel(level) {
    this.level = level;
  }

  checkLevel(level) {
    return isLevel(this.level, level);
  }

  error(...args) {
    if (this.checkLevel(LOG_LEVEL.ERROR)) {
      return this.logHandler(LOG_LEVEL.ERROR, args);
    }
  }

  info(...args) {
    if (this.checkLevel(LOG_LEVEL.INFO)) {
      return this.logHandler(LOG_LEVEL.INFO, args);
    }
  }

  log(...args) {
    if (this.checkLevel(LOG_LEVEL.DEBUG)) {
      return this.logHandler(LOG_LEVEL.DEBUG, args);
    }
  }

  warn(...args) {
    if (this.checkLevel(LOG_LEVEL.WARN)) {
      return this.logHandler(LOG_LEVEL.WARN, args);
    }
  }

  logHandler(level, args) {
    // eslint-disable-next-line capitalized-comments
    // if (typeof this.customLogHandler === 'function') {
    //   return this.customLogHandler(level, args);
    // }

    // TODO check if transformer is a function somewhere
    return Promise.resolve(reduceTransformers(Array.from(this.transformers.values()), level, args))
      .then(validateParts)
      .then(parts => {
        if (this.transports.size === 0) {
          return parts;
        }

        return reduceTransports(Array.from(this.transports.values()), level, parts);
      });
  }
}

CoreLess.prototype.debug = CoreLess.prototype.log;
CoreLess.prototype.exception = CoreLess.prototype.error;

function coreFactory(options = {}) {
  return Object.create(new CoreLess(options));
}

const coreLess = {LOG_LEVEL, isLevel};

coreLess.profile = coreFactory;
coreLess.CoreLess = CoreLess;

coreLess.paranoya = {
  enabled: false,
  secretKey: null
};

module.exports = coreLess;
