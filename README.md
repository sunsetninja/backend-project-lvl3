# Page loader

![Node CI](https://github.com/sunsetninja/backend-project-lvl3/workflows/Node%20CI/badge.svg)
![hexlet-check](https://github.com/sunsetninja/backend-project-lvl3/workflows/hexlet-check/badge.svg)
[![Maintainability](https://api.codeclimate.com/v1/badges/3440da4b2317a6db2228/maintainability)](https://codeclimate.com/github/sunsetninja/backend-project-lvl3/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/3440da4b2317a6db2228/test_coverage)](https://codeclimate.com/github/sunsetninja/backend-project-lvl3/test_coverage)

A program for downloading web pages. Downloads html page with its assets in setted output direcotry. Creates files directory for assets.

## Installation

```sh
  make setup
```

## Usage

To see a list of commands that PageLoader offers, you can run:

```sh
  page-loader --help
```

### Usage signature

```sh
  page-loader [options] <pageurl>
```

### Usage examples

```sh
  page-loader --output output-folder https://example.org
```

### Running examples

#### Success saving

[![asciicast](https://asciinema.org/a/z0MIbCJGx1Xj2R3CJWAl1bfUf.svg)](https://asciinema.org/a/z0MIbCJGx1Xj2R3CJWAl1bfUf)

#### Saving with debug

[![asciicast](https://asciinema.org/a/XsHL5SyNL1Mdw5083X4ST0Kto.svg)](https://asciinema.org/a/XsHL5SyNL1Mdw5083X4ST0Kto)

#### Handling errors

[![asciicast](https://asciinema.org/a/2amvGEQocTW0tYr0jJp3PcCql.svg)](https://asciinema.org/a/2amvGEQocTW0tYr0jJp3PcCql)