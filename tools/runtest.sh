#!/bin/bash

cd "./Facebook Login"
xcodebuild DSTROOT=/tmp/dst SYMROOT=/tmp/sym
cd ..

APPFOLDER="../app"
REPORTER="spec"
TIMEOUT=10000

# /tmp/sym/Release/Facebook Login.app/Contents/MacOS/Facebook Login

source ../secret/setenv.sh


####################
##    one test    ##
####################

if [ "$#" -gt 0 ]; then
	echo "$1.test.js"
	mocha $APPFOLDER/code/$1.test.js -t $TIMEOUT -R $REPORTER

	exit
fi

#####################
##    all tests    ##
#####################

mocha $APPFOLDER/code/*.test.js -t $TIMEOUT -R $REPORTER

exit 

echo 'shoeboxify.test.js'
mocha $APPFOLDER/code/shoeboxify.test.js -t $TIMEOUT -R $REPORTER

echo 'mongo.test.js'
mocha $APPFOLDER/code/mongo.test.js -t $TIMEOUT -R $REPORTER

echo 'fb.test.js'
mocha $APPFOLDER/code/fb.test.js -t $TIMEOUT -R $REPORTER

echo 'service.test.js'
mocha $APPFOLDER/code/service.test.js -t $TIMEOUT -R $REPORTER

echo 'handy.test.js'
mocha $APPFOLDER/code/handy.test.js -t $TIMEOUT -R $REPORTER

echo 's3.test.js'
mocha $APPFOLDER/code/s3.test.js -t $TIMEOUT -R $REPORTER
