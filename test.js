import test from 'ava';
import cconsole, {LOG_LEVEL} from './index';

// console.dir(cconsole);
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
// cconsole.addTransport(logTransport, {});
// cconsole.addTransport(other);
// // cconsole.setLevel(LOG_LEVEL.ALL & ~LOG_LEVEL.ERROR);
// cconsole.setLevel(LOG_LEVEL.ERROR | LOG_LEVEL.WARN);
// cconsole.error('err msg');
// cconsole.warn('warn msg');
// cconsole.info('info msg');
// cconsole.debug('debug msg');

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
  t.context = cconsole.profile();
});

test('cconsole instance is exported by default', t => {
  t.true(cconsole instanceof cconsole.CConsole);
});

test('new instance of cconsole creates', t => {
  t.true(t.context instanceof cconsole.CConsole);
});

test('no transports by default', t => {
  t.is(t.context.transports.length, 0);
});

test('no transformers by default', t => {
  t.is(t.context.transformers.length, 0);
});

test('operations with level', t => {
  // ALL consists of four
  t.is(LOG_LEVEL.ALL, LOG_LEVEL.WARN | LOG_LEVEL.ERROR | LOG_LEVEL.INFO | LOG_LEVEL.DEBUG);

  // all except ERROR
  t.is(LOG_LEVEL.ALL & ~LOG_LEVEL.ERROR, LOG_LEVEL.WARN | LOG_LEVEL.INFO | LOG_LEVEL.DEBUG);

  // all except WARN and INFO
  t.is(LOG_LEVEL.ALL & ~LOG_LEVEL.WARN & ~LOG_LEVEL.INFO, LOG_LEVEL.ERROR | LOG_LEVEL.DEBUG);
});

test('set level', t => {
  const _cconsole = cconsole.profile();

  // default level
  t.true(_cconsole.level === LOG_LEVEL.ALL);

  // set ERROR level
  _cconsole.setLevel(LOG_LEVEL.ERROR);
  t.is(_cconsole.level, LOG_LEVEL.ERROR);
});

test.todo('log methods are handled depending on level');

test('message is not modified without transformers and transports', async t => {
  await handlerLogMethods(t, 'hello', ['hello']);
});

test('transformer is applied', async t => {
  t.plan(6);
  t.context.addTransformer((type, resolvedParts) => (t.pass(), resolvedParts));

  await callLogMethods(t);
});

test('transformers are applied synchronous', async t => {
  t.plan(12);
  t.context.addTransformer((type, resolvedParts) => (t.pass(), resolvedParts));
  t.context.addTransformer((type, resolvedParts) => (t.pass(), resolvedParts));

  await callLogMethods(t);
});

test('transformers are applied consistently', async t => {
  const result = [];

  t.context.addTransformer((type, resolvedParts) => {
    result.push(1);

    return new Promise(resolve => setTimeout(() => resolve(resolvedParts), 50));
  });
  t.context.addTransformer((type, resolvedParts) => {
    result.push(2);

    return new Promise(resolve => setTimeout(() => resolve(resolvedParts), 10));
  });

  await callLogMethods(t);
  t.deepEqual(result, [
    1, 2,
    1, 2,
    1, 2,
    1, 2,
    1, 2,
    1, 2,
  ]);
});

test('transport is applied', async t => {
  // 6 for transport
  t.plan(6);

  t.context.addTransport((type, resolvedParts) => t.pass());

  await callLogMethods(t);
});

test('transports are applied synchronous', async t => {
  // 6 for each transport
  t.plan(12);

  t.context.addTransport((type, resolvedParts) => t.pass());
  t.context.addTransport((type, resolvedParts) => t.pass());

  await callLogMethods(t);
});

// TODO implement, when config is implemented
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

test('transformer modifies message', async t => {
  t.context.addTransformer((type, resolvedParts) => resolvedParts.concat('!'));

  await handlerLogMethods(t, 'hello', ['hello', '!']);
});

test('transformers modify message', async t => {
  t.context.addTransformer((type, resolvedParts) => resolvedParts.concat('!'));
  t.context.addTransformer((type, resolvedParts) => ['!'].concat(resolvedParts));

  await handlerLogMethods(t, 'hello', ['!', 'hello', '!']);
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
  const cconsole = t.context;
  t.deepEqual(await cconsole.error(input), getExpected(expected, 0));
  t.deepEqual(await cconsole.info(input), getExpected(expected, 1));
  t.deepEqual(await cconsole.log(input), getExpected(expected, 2));
  t.deepEqual(await cconsole.warn(input), getExpected(expected, 3));
  t.deepEqual(await cconsole.debug(input), getExpected(expected, 4));
  t.deepEqual(await cconsole.exception(input), getExpected(expected, 5));
}

/**
 * Just calls every log methods
 * @param t
 * @param input
 * @return {Promise.<void>}
 */
async function callLogMethods(t, input) {
  const cconsole = t.context;
  await cconsole.error(input);
  await cconsole.info(input);
  await cconsole.log(input);
  await cconsole.warn(input);
  await cconsole.debug(input);
  await cconsole.exception(input);
}
