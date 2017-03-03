import test from 'ava';
import cconsole from './index';

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

test('cconsole is instance of CConsole',t => {
  t.is(typeof t.context, 'object');
});

test('no transports by default', t => {
  t.is(t.context.transports.length, 0);
});

test('no transformers by default', t => {
  t.is(t.context.transformers.length, 0);
});

test('without transformers', async t => {
  await handlerLogMethods(t, 'hello', ['hello']);
});

test('empty transformer', async t => {
  t.context.addTransformer((type, resolvedParts) => resolvedParts);

  await handlerLogMethods(t, 'hello', ['hello']);
});

test('transformer that modifies message', async t => {
  t.context.addTransformer((type, resolvedParts) => resolvedParts.concat('!'));

  await handlerLogMethods(t, 'hello', ['hello', '!']);
});

test('several transformers that modify message', async t => {
  t.context.addTransformer((type, resolvedParts) => resolvedParts.concat('!'));
  t.context.addTransformer((type, resolvedParts) => ['!'].concat(resolvedParts));

  await handlerLogMethods(t, 'hello', ['!', 'hello', '!']);
});

test('transport', async t => {
  // 6 for transport
  // 6 for handler
  t.plan(12);

  t.context.addTransport((type, resolvedParts) => t.pass());

  await handlerLogMethods(t, 'hello', ['hello']);
});

test('transports', async t => {
  // 12 for transports
  // 6 for handler
  t.plan(18);

  t.context.addTransport((type, resolvedParts) => t.pass());
  t.context.addTransport((type, resolvedParts) => t.pass());

  await handlerLogMethods(t, 'hello', ['hello']);
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
