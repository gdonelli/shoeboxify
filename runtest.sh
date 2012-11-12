#!/bin/bash

source ../setenv.sh

echo 's3.test.js'
mocha ./code/s3.test.js -t 15000


echo 'service.test.js'
mocha ./code/service.test.js -t 15000
