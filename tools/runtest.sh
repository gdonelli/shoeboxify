#!/bin/bash

cd "./Facebook Login"
xcodebuild DSTROOT=/tmp/dst SYMROOT=/tmp/sym
cd ..

APPFOLDER="../app"
REPORTER="spec"
TIMEOUT=10000

# /tmp/sym/Release/Facebook Login.app/Contents/MacOS/Facebook Login

source ../secret/setenv.sh

cmd=`node test-core.js $@`

echo "cmd:"
echo $cmd
cd ..

$cmd
