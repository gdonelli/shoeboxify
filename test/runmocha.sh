#!/bin/bash

source ../../setenv.sh

mocha s3-test.js -t 15000
