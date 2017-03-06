// @see http://m15.ru/bitmask_in_php
// https://github.com/pimterry/loglevel
// import md5 from './just-md5';
import isPromise from 'is-promise';
// console.log(md5('hello'));
// let realConsole = console;
// realConsole.log = function() {
// 	console.log(super);
// };

export const LOG_LEVEL = {
  WARN: 1,
  ERROR: 2,
  INFO: 4,
  DEBUG: 8
  // PROD:
  // DEV:
};

LOG_LEVEL.ALL = LOG_LEVEL.WARN | LOG_LEVEL.ERROR | LOG_LEVEL.INFO | LOG_LEVEL.DEBUG;

/*
const LOG_TYPE = {
  ERROR: 1,
  INFO: 2,
  LOG: 4,
  WARN: 8,
};

const LOG_FUNCTION_MAP = {
  ERROR: 'error',
  INFO: 'info',
  LOG: 'log',
  WARN: 'warn',
};
*/

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

function reduceTransportsSync(transports, type, args) {
  transports.reduce((result, transport) => {
    if (isPromise(result)) {
      return result.then(() => transport(type, args));
    }

    return transport(type, args);
  }, null);

  return args;
}

class CConsole {
  constructor({customLogHandler, syncTransports} = {}) {
    this.customLogHandler = customLogHandler;
    this.syncTransports = syncTransports || false;
    this.level = LOG_LEVEL.ALL;
    this.transformers = []; // candidate for Set
    this.transports = []; // candidate for Set
    this.config = {
      transports: {},
      transformers: {}
    };
  }

  addUniqueModifier(modifiers, modifierFn, modifierConfig = {}) {
    if (modifiers.indexOf(modifierFn) === -1) {
      modifiers.push(modifierFn);
    }

    if (modifierFn.name) {
      this.config.transports[modifierFn.name] = modifierConfig;
    }
  }

  addTransport(transportFn, config) {
    this.addUniqueModifier(this.transports, transportFn, config);
  }

  addTransformer(transformerFn, config) {
    this.addUniqueModifier(this.transformers, transformerFn, config);
  }

  setLevel(level) {
    this.level = level;
  }

  checkLevel(level) {
    return (this.level & level) > 0;
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

  // consoleLogProvider(type, args) {
  // 	if (LOG_FUNCTION_MAP.hasOwnProperty(type)) {
  // 		return console[LOG_FUNCTION_MAP[type]].apply(console, args);
  // 	}
  //
  // 	throw new TypeError(`Type ${type} is not exists`);
  // }

  logHandler(level, args) {
    if (typeof this.customLogHandler === 'function') {
      return this.customLogHandler(level, args);
    }

    // TODO check if transformer is a function somewhere
    return Promise.resolve(reduceTransformers(this.transformers, level, args))
      .then(validateParts)
      .then(parts => {
        if (this.transports.length === 0) {
          return parts;
        }

        return (this.syncTransports ? reduceTransportsSync : reduceTransports)(this.transports, level, parts);
      });
  }
}

CConsole.prototype.debug = CConsole.prototype.log;
CConsole.prototype.exception = CConsole.prototype.error;

const cconsoleInstance = new CConsole();
const cconsole = Object.create(cconsoleInstance);

cconsole.profile = function (name, options = {}) {
  return new CConsole(options);
};

cconsole.CConsole = CConsole;

cconsole.paranoya = {
  enabled: false,
  secretKey: null
};
//
// const cconsoleInstance = new CConsole();
//
// Object.keys(LOG_FUNCTION_MAP).map(key => {
// 	const logFn = LOG_FUNCTION_MAP[key];
//
// 	cconsole[logFn] = cconsoleInstance[logFn].bind(cconsoleInstance);
// });
//
// cconsole.setLevel = cconsoleInstance.setLevel.bind(cconsoleInstance);

export default cconsole;
