#!/bin/bash

source ../secret/setenv.sh

# if [ "$#" -gt 0 ]; then
# 	echo "Setting up variable in Nodejitsu"
#   	cd shoeboxify
# 	sh ./jitsu-setenv.sh
# 	cd ..
# else

supervisor -p 1000 ../app/app.js	

