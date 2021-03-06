#!/bin/bash

source ../secret/setenv.sh

if [ "$#" -gt 0 ]; then
	echo "Launch Shoeboxify.app"
	node ../app/app.js --use_strict
else
	echo "Run supervisor"
	supervisor --watch ../app/  --poll-interval 1000 ../app/app.js
fi

