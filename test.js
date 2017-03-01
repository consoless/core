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

test('cconsole is instance of CConsole', t => {
  t.is(typeof cconsole, 'object');
});

test('no transports by default', t => {
  t.is(cconsole.transports.length, 0);
});

test('no transformers by default', t => {
  t.is(cconsole.transformers.length, 0);
});

test('log without transformers', async t => {
  t.deepEqual(await cconsole.error('hello'), ['hello']);
  t.deepEqual(await cconsole.info('hello'), ['hello']);
  t.deepEqual(await cconsole.log('hello'), ['hello']);
  t.deepEqual(await cconsole.debug('hello'), ['hello']);
  t.deepEqual(await cconsole.exception('hello'), ['hello']);
});

test.skip('add empty transformer', async t => {
  cconsole.addTransformer((type, resolvedParts) => resolvedParts);

  t.deepEqual(await cconsole.error('hello'), ['hello']);
  t.deepEqual(await cconsole.info('hello'), ['hello']);
  t.deepEqual(await cconsole.log('hello'), ['hello']);
  t.deepEqual(await cconsole.debug('hello'), ['hello']);
  t.deepEqual(await cconsole.exception('hello'), ['hello']);
});

test.skip('add transformer that modifies message', async t => {
  cconsole.addTransformer((type, resolvedParts) => {
    resolvedParts.push('!');

    return resolvedParts;
  });

  t.deepEqual(await cconsole.error('hello'), ['hello', '!']);
  t.deepEqual(await cconsole.info('hello'), ['hello', '!']);
  t.deepEqual(await cconsole.log('hello'), ['hello', '!']);
  t.deepEqual(await cconsole.debug('hello'), ['hello', '!']);
  t.deepEqual(await cconsole.exception('hello'), ['hello', '!']);
});
