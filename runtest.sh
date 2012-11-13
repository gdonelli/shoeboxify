#!/bin/bash

source ../setenv.sh

echo 'utils.test.js'
mocha ./code/utils.test.js

echo 'service.test.js'
mocha ./code/service.test.js

echo 's3.test.js'
mocha ./code/s3.test.js -t 15000
