#!/bin/bash

source ../secret/setenv.sh

if [ "$#" -gt 0 ]; then
	echo "Launch Shoeboxify.app"
	node ../app/app.js
else
	echo "Run supervisor"
	supervisor -p 1000 --watch ../app/ ../app/app.js 
fi

