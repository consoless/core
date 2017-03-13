import test from 'ava';
import coreLess, {LOG_LEVEL} from './index';

// console.dir(coreLess);
// function logTransport(type, messages) {
// 	// if (LOG_LEVEL.WARN === type) {
// 	// 	console.warn.apply(null, messages);
// 	// }
//   //
// 	// if (LOG_LEVEL.ERROR === type) {
// 	// 	console.error.apply(null, messages);
// 	// }
// 	return new Promise(resolve => setTimeout(() => console.log(2), 2000));
// }
//
// function other(type, message) {
// 	console.log(22);
// }
// coreLess.addTransport(logTransport, {});
// coreLess.addTransport(other);
// // coreLess.setLevel(LOG_LEVEL.ALL & ~LOG_LEVEL.ERROR);
// coreLess.setLevel(LOG_LEVEL.ERROR | LOG_LEVEL.WARN);
// coreLess.error('err msg');
// coreLess.warn('warn msg');
// coreLess.info('info msg');
// coreLess.debug('debug msg');

// TODO update
function spy(fn) {
  let called = 0;
  let throwed = 0;

  return (...args) => {
    try {
      const result = fn(args);
      fn.$__called = called++;

      return result;
    } catch (e) {
      fn.$__throwed = throwed++;
    }
  };
}

test.beforeEach(t => {
  t.context = coreLess.profile();
});

test('new instance of coreLess creates', t => {
  t.true(t.context instanceof coreLess.CoreLess);
});

test('no transports by default', t => {
  t.is(t.context.transports.size, 0);
});

test('no transformers by default', t => {
  t.is(t.context.transformers.size, 0);
});

test('message is not modified without transformers and transports', t => handlerLogMethods(t, 'hello', ['hello']));

test('operations with level', t => {
  // ALL consists of four
  t.is(LOG_LEVEL.ALL, LOG_LEVEL.WARN | LOG_LEVEL.ERROR | LOG_LEVEL.INFO | LOG_LEVEL.DEBUG);

  // all except ERROR
  t.is(LOG_LEVEL.ALL & ~LOG_LEVEL.ERROR, LOG_LEVEL.WARN | LOG_LEVEL.INFO | LOG_LEVEL.DEBUG);

  // all except WARN and INFO
  t.is(LOG_LEVEL.ALL & ~LOG_LEVEL.WARN & ~LOG_LEVEL.INFO, LOG_LEVEL.ERROR | LOG_LEVEL.DEBUG);
});

test('set level', t => {
  const _coreLess = t.context;

  // default level
  t.is(_coreLess.level, LOG_LEVEL.ALL);

  // set ERROR level
  _coreLess.setLevel(LOG_LEVEL.ERROR);
  t.true(_coreLess.checkLevel(LOG_LEVEL.ERROR));

  _coreLess.setLevel(LOG_LEVEL.WARN | LOG_LEVEL.ERROR);
  t.true(_coreLess.checkLevel(LOG_LEVEL.WARN));
  t.true(_coreLess.checkLevel(LOG_LEVEL.ERROR));
  t.true(_coreLess.checkLevel(LOG_LEVEL.ERROR | LOG_LEVEL.WARN));
});

test('log methods are handled depending on level', async t => {
  // set ERROR level
  t.context.setLevel(LOG_LEVEL.ERROR);
  await handlerLogMethods(t, 'hello',
    ['hello'], // error
    undefined, // info
    undefined, // log
    undefined, // warn
    undefined, // debug
    ['hello'] // exception
  );

  // set ERROR and WARN levels
  t.context.setLevel(LOG_LEVEL.ERROR | LOG_LEVEL.WARN);
  await handlerLogMethods(t, 'hello',
    ['hello'], // error
    undefined, // info
    undefined, // log
    ['hello'], // warn
    undefined, // debug
    ['hello'] // exception
  );
});

test('transformers and transport are not called when log level is not suite', async t => {
  t.plan(1);
  t.context.setLevel(LOG_LEVEL.WARN);
  t.context.addTransformer((type, resolvedParts) => (t.pass(), resolvedParts));
  t.context.addTransport((type, resolvedParts) => t.pass());
  t.is(t.context.error('hello'), undefined);
});

test('transformer is applied', t => {
  t.plan(6);
  t.context.addTransformer((type, resolvedParts) => (t.pass(), resolvedParts));

  return callLogMethods(t);
});

test(`same transformers are not added twice`, t => {
  const tr = (type, resolvedParts) => (t.pass(), resolvedParts);
  t.context.addTransformer(tr);
  t.context.addTransformer(tr);

  t.is(t.context.transformers.size, 1);
});

test('transformers return arrays', async t => {
  const notAnArray = null;
  t.context.addTransformer((type, resolvedParts) => (t.pass(), notAnArray));

  const err = await t.throws(callLogMethods(t));
  t.is(err.message, 'Transformers should return an array of messages')
});

test('transformers are applied synchronous', t => {
  t.plan(12);
  t.context.addTransformer((type, resolvedParts) => (t.pass(), resolvedParts));
  t.context.addTransformer((type, resolvedParts) => (t.pass(), resolvedParts));

  return callLogMethods(t);
});

test('transformers are applied consistently', async t => {
  const result = [];

  // 50ms delay
  t.context.addTransformer((type, resolvedParts) => {
    // collect calls
    result.push(1);

    return new Promise(resolve => setTimeout(() => resolve(resolvedParts), 50));
  });
  // 10ms delay
  t.context.addTransformer((type, resolvedParts) => {
    // collect calls
    result.push(2);

    return new Promise(resolve => setTimeout(() => resolve(resolvedParts), 10));
  });

  await callLogMethods(t);

  // compare transport calls order
  t.deepEqual(result, [
    1, 2,
    1, 2,
    1, 2,
    1, 2,
    1, 2,
    1, 2,
  ]);
});

test('transformer:context: present', t => {
  t.context.addTransformer(function (type, resolvedParts) {
    t.is(typeof this, 'object');

    return resolvedParts;
  });

  return callLogMethods(t);
});

test('transformer:config: empty by default', t => {
  t.context.addTransformer(function (type, resolvedParts) {
    t.is(typeof this.config, 'object');
    t.is(Object.keys(this.config).length, 0);

    return resolvedParts;
  });

  return callLogMethods(t);
});

test('transformer:config: can be set', t => {
  t.context.addTransformer(function (type, resolvedParts) {
    t.deepEqual(Object.keys(this.config), ['hello']);
    t.is(this.config.hello, 'world');

    return resolvedParts;
  }, {
    hello: 'world'
  });

  return callLogMethods(t);
});

test('transformer(named):config: can be set later', t => {
  function helloTransformer(type, resolvedParts) {
    t.is(this.config.hello, 'foo');

    return resolvedParts;
  }

  t.context.addTransformer(helloTransformer);
  t.is(typeof t.context.config.transformers.helloTransformer, 'object');
  t.context.config.transformers.helloTransformer.hello = 'foo';

  return callLogMethods(t);
});

test('transformer:config: can be modified by reference', t => {
  const config = {
    hello: 'world'
  };

  t.context.addTransformer(function (type, resolvedParts) {
    t.is(this.config.hello, 'foo');

    return resolvedParts;
  }, config);

  config.hello = 'foo';

  return callLogMethods(t);
});

test('transformer(named):config: can be modified through config storage', t => {
  const config = {
    hello: 'world'
  };

  function helloTransformer(type, resolvedParts) {
    t.is(this.config.hello, 'foo');

    return resolvedParts;
  }

  t.context.addTransformer(helloTransformer, config);
  t.context.config.transformers.helloTransformer.hello = 'foo';

  return callLogMethods(t);
});

test('transport is applied', t => {
  // 6 for transport
  t.plan(6);

  t.context.addTransport((type, resolvedParts) => t.pass());

  return callLogMethods(t);
});

test(`same transports are not added twice`, t => {
  const tr = (type, resolvedParts) => t.pass();
  t.context.addTransport(tr);
  t.context.addTransport(tr);

  t.is(t.context.transports.size, 1);
});

test('transports are applied synchronous', t => {
  // 6 for each transport
  t.plan(12);

  t.context.addTransport((type, resolvedParts) => t.pass());
  t.context.addTransport((type, resolvedParts) => t.pass());

  return callLogMethods(t);
});

// TODO implement, when coreLess's config is implemented
test.skip('transports are applied consistently', async t => {
  // 6 for each transport
  t.plan(12);
  const result = [];

  t.context.addTransport((type, resolvedParts) => result.push(1));
  t.context.addTransport((type, resolvedParts) => result.push(2));

  await callLogMethods(t);
  t.deepEqual(result, [
    1, 1, 1, 1, 1, 1,
    2, 2, 2, 2, 2, 2
  ]);
});

test('transport:context: present', t => {
  t.context.addTransport(function () {
    t.is(typeof this, 'object');
  });

  return callLogMethods(t);
});

test('transport:config: empty by default', t => {
  t.context.addTransport(function () {
    t.is(typeof this.config, 'object');
    t.is(Object.keys(this.config).length, 0);
  });

  return callLogMethods(t);
});

test('transport:config: can be set', t => {
  t.context.addTransport(function () {
    t.deepEqual(Object.keys(this.config), ['hello']);
    t.is(this.config.hello, 'world');
  }, {
    hello: 'world'
  });

  return callLogMethods(t);
});

test('transport(named):config: can be set later', t => {
  function helloTransport(type, resolvedParts) {
    t.is(this.config.hello, 'foo');

    return resolvedParts;
  }

  t.context.addTransport(helloTransport);
  t.is(typeof t.context.config.transports.helloTransport, 'object');
  t.context.config.transports.helloTransport.hello = 'foo';

  return callLogMethods(t);
});

test('transport:config: can be modified by reference', t => {
  const config = {
    hello: 'world'
  };

  t.context.addTransformer(function (type, resolvedParts) {
    t.is(this.config.hello, 'foo');

    return resolvedParts;
  }, config);

  config.hello = 'foo';

  return callLogMethods(t);
});

test('transport(named):config: can be modified through config storage', t => {
  const config = {
    hello: 'world'
  };

  function helloTransport(type, resolvedParts) {
    t.is(this.config.hello, 'foo');

    return resolvedParts;
  }

  t.context.addTransport(helloTransport, config);
  t.context.config.transports.helloTransport.hello = 'foo';

  return callLogMethods(t);
});

test('transformer modifies message', t => {
  t.context.addTransformer((type, resolvedParts) => resolvedParts.concat('!'));

  return handlerLogMethods(t, 'hello', ['hello', '!']);
});

test('transformers modify message', t => {
  t.context.addTransformer((type, resolvedParts) => resolvedParts.concat('!'));
  t.context.addTransformer((type, resolvedParts) => ['!'].concat(resolvedParts));

  return handlerLogMethods(t, 'hello', ['!', 'hello', '!']);
});

test('throws if added modifier is invalid', t => {
  const invalidModifier = 'invalidModifier';
  const err = t.throws(() => t.context.addUniqueModifier(invalidModifier));
  t.is(err.message, `Illegal modifier ${invalidModifier}`);
});

test('throws if modifier misses its config', t => {
  delete t.context.config.transports;
  const err = t.throws(() => t.context.addTransport(() => {}));
  t.is(err.message, 'Missing config for modifier transports');
});

function getExpected(expected, num) {
  return num === 0 || expected.length === 1 ? expected[0] : expected[num];
}

/**
 * Expected might contain 1 element or 6 - each for every method relatively: error, info, log, warn, debug, exception
 * @param t
 * @param input
 * @param expected
 * @return {Promise.<void>}
 */
async function handlerLogMethods(t, input, ...expected) {
  const coreLess = t.context;
  t.deepEqual(await coreLess.error(input), getExpected(expected, 0));
  t.deepEqual(await coreLess.info(input), getExpected(expected, 1));
  t.deepEqual(await coreLess.log(input), getExpected(expected, 2));
  t.deepEqual(await coreLess.warn(input), getExpected(expected, 3));
  t.deepEqual(await coreLess.debug(input), getExpected(expected, 4));
  t.deepEqual(await coreLess.exception(input), getExpected(expected, 5));
}

/**
 * Just calls every log methods
 * @param t
 * @param input
 * @return {Promise.<void>}
 */
async function callLogMethods(t, input) {
  const coreLess = t.context;
  await coreLess.error(input);
  await coreLess.info(input);
  await coreLess.log(input);
  await coreLess.warn(input);
  await coreLess.debug(input);
  await coreLess.exception(input);
}
