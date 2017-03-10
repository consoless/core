const pluginsRef = Symbol('plugins');
const pluginsScope = Symbol('pluginsScope');

export function applyPlugin(cconsole, plugins) {
  if (!Array.isArray(plugins)) {
    plugins = [plugins];
  }

  // check if cconsole is already applied with plugins
  const isPluginScope = cconsole.hasOwnProperty(pluginsScope);
  // array of objects to assign to resulting cconsole instance
  const extendings = [];

  if (isPluginScope) {
    // don't create new object if any plugin was applied before
    extendings.unshift(cconsole);
  } else {
    // create new object and add cconsole instance as proto
    extendings.push({
      __proto__: cconsole,
      [pluginsScope]: true,
    });
  }

  // add plugins
  extendings.push(...plugins);
  // compose extended cconsole object
  cconsole = Object.assign.apply(null, extendings);

  // save plugins to prototype in order to have access to them in future (probably to remove some plugin)
  const cconsoleProto = Object.getPrototypeOf(cconsole);

  if (!cconsoleProto.hasOwnProperty(pluginsRef)) {
    cconsoleProto[pluginsRef] = [];
  }

  cconsoleProto[pluginsRef] = cconsoleProto[pluginsRef].concat(plugins);

  return cconsole;
}

/**
 * Returns list of plugins applied to the cconsole
 * @param cconsole
 * @return {Array}
 */
export function getPlugins(cconsole) {
  const proto = Object.getPrototypeOf(cconsole);

  // don't lookup for plugins in prototype chain
  if (proto.hasOwnProperty(pluginsRef)) {
    return proto[pluginsRef];
  }

  return [];
}
