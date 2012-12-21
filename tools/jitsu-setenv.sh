#!/bin/bash

source ../secret/setenv.sh

cd ../app

####################
### Facebook App ###
####################

jitsu env set APP_ID $APP_ID
jitsu env set APP_SECRET $APP_SECRET

jitsu env set NODEFLY_ID $NODEFLY_ID

###############
### Session ###
###############

jitsu env set SESSION_SECRET $SESSION_SECRET
jitsu env set SESSION_DB_URL $SESSION_DB_URL
jitsu env set SESSION_DB_NAME $SESSION_DB_NAME

##############################
### Amazon S3 Access Users ###
##############################

jitsu env set S3_R_KEY $S3_R_KEY
jitsu env set S3_R_SECRET $S3_R_SECRET

jitsu env set S3_RW_KEY $S3_RW_KEY
jitsu env set S3_RW_SECRET $S3_RW_SECRET

jitsu env set S3_HOST_NAME $S3_HOST_NAME

jitsu env set S3_PRODUCTION_BUCKET $S3_PRODUCTION_BUCKET
jitsu env set S3_TEST_BUCKET $S3_TEST_BUCKET

################
### Database ###
################

jitsu env set DB_SERVER_HOST $DB_SERVER_HOST
jitsu env set DB_SERVER_PORT $DB_SERVER_PORT

jitsu env set DB_SERVER_USERNAME $DB_SERVER_USERNAME
jitsu env set DB_SERVER_PASSWORD $DB_SERVER_PASSWORD

jitsu env set DB_NAME $DB_NAME

############
### SMTP ###
############

jitsu env set EMAIL_ADDRESS $EMAIL_ADDRESS

jitsu env set SMTP_USER $SMTP_USER
jitsu env set SMTP_PASSWORD $SMTP_PASSWORD
jitsu env set SMTP_HOST $SMTP_HOST

#############
### Other ###
#############

jitsu env set ADMIN_ID $ADMIN_ID
