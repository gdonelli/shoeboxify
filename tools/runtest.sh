#!/bin/bash

cd "./Facebook Login"
xcodebuild DSTROOT=/tmp/dst SYMROOT=/tmp/sym
cd ..

APPFOLDER="../app"

# /tmp/sym/Release/Facebook Login.app/Contents/MacOS/Facebook Login

source ../secret/setenv.sh



if [ "$#" -gt 0 ]; then

	echo "$1.test.js"
	mocha $APPFOLDER/code/$1.test.js -t 15000

	exit
fi


echo 'shoeboxify.test.js'
mocha $APPFOLDER/code/shoeboxify.test.js

echo 'fb.test.js'
mocha $APPFOLDER/code/fb.test.js -t 15000

echo 'service.test.js'
mocha $APPFOLDER/code/service.test.js  -t 15000

echo 'handy.test.js'
mocha $APPFOLDER/code/handy.test.js

echo 's3.test.js'
mocha $APPFOLDER/code/s3.test.js -t 15000
