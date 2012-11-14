#!/bin/bash

cd "tools/Facebook Login"
xcodebuild DSTROOT=/tmp/dst SYMROOT=/tmp/sym
cd ../..

# /tmp/sym/Release/Facebook Login.app/Contents/MacOS/Facebook Login

source ../setenv.sh

echo 'shoeboxify.test.js'
mocha ./code/shoeboxify.test.js

echo 'fb.test.js'
mocha ./code/fb.test.js  -t 15000

echo 'service.test.js'
mocha ./code/service.test.js

echo 'utils.test.js'
mocha ./code/utils.test.js

echo 's3.test.js'
mocha ./code/s3.test.js -t 15000
