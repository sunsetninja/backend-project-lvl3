#!/usr/bin/env node

import commander from 'commander';
import loadPage from '../index.js';

const program = new commander.Command();

program
  .version('0.0.1')
  .description('Compares two configuration files and shows a difference.')
  .arguments('<pageurl>')
  .helpOption('-h, --help', 'output usage information')
  .option('--output', 'output directory')
  .action((pageurl, options) => {
    loadPage(pageurl, options.output).then(console.log);
  });

program.parse(process.argv);
