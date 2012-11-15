#!/bin/bash

source ../secret/setenv.sh

####################
### Facebook App ###
####################

jitsu env set APP_ID $APP_ID
jitsu env set APP_SECRET $APP_SECRET

###############
### Session ###
###############

jitsu env set SESSION_SECRET $SESSION_SECRET
jitsu env set SESSION_DB_URL $SESSION_DB_URL
jitsu env set SESSION_DB_NAME $SESSION_DB_NAME

jitsu env set ADMIN_ID $ADMIN_ID

##############################
### Amazon S3 Access Users ###
##############################

jitsu env set S3_R_KEY $S3_R_KEY
jitsu env set S3_R_SECRET $S3_R_SECRET

jitsu env set S3_RW_KEY $S3_RW_KEY
jitsu env set S3_RW_SECRET $S3_RW_SECRET

jitsu env set S3_URL $S3_URL

jitsu env set S3_OBJECT_BUCKET $S3_OBJECT_BUCKET
jitsu env set S3_CACHE_BUCKET $S3_CACHE_BUCKET
jitsu env set S3_TEST_BUCKET $S3_TEST_BUCKET

################
### Database ###
################

jitsu env set DB_SERVER_HOST $DB_SERVER_HOST
jitsu env set DB_SERVER_PORT $DB_SERVER_PORT

jitsu env set DB_SERVER_USERNAME $DB_SERVER_USERNAME
jitsu env set DB_SERVER_PASSWORD $DB_SERVER_PASSWORD

jitsu env set DB_NAME $DB_NAME
