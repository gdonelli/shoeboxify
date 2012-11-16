#!/bin/bash

source ../secret/setenv.sh


mongo --host $DB_SERVER_HOST --port $DB_SERVER_PORT -u $DB_SERVER_USERNAME -p $DB_SERVER_PASSWORD $DB_NAME
