import path from 'path';

module.exports = {
  context: __dirname,
  entry: {
    bundle: './src/index.js'
  },
  output: {
    path: path.join(__dirname, '/dist'),
    filename: '[name].umd.js',
    library: 'coreLess',
    libraryTarget: 'umd'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel-loader',
        query: {
          presets: [
            ['env', {
              modules: false,
              targets: {
                browsers: [
                  'last 2 versions'
                ]
              }
            }]
          ],
          babelrc: false
        }
      }
    ]
  }
};
