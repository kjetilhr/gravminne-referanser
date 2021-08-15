'use strict';

const { merge } = require('webpack-merge');

const common = require('./webpack.common.js');
const PATHS = require('./paths');

// Merge webpack configuration files
const config = merge(common, {
  entry: {
    background: PATHS.src + '/background.js',
    slektogdata: PATHS.src + '/slektogdata.js',
    wikidata: PATHS.src + '/wikidata.js',
  },
});

module.exports = config;
