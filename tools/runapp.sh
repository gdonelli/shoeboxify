#!/bin/bash

source ../secret/setenv.sh

if [ "$#" -gt 0 ]; then
	echo "Launch Shoeboxify.app"
	node ../app/app.js
else
	echo "Run supervisor"
	supervisor --watch ../app/  --poll-interval 10000 ../app/app.js
fi

