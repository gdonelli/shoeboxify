#!/bin/bash

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

##############################
### Amazon S3 Access Users ###
##############################

jitsu env set S3_R_KEY $S3_R_KEY
jitsu env set S3_R_SECRET $S3_R_SECRET
jitsu env set S3_RW_KEY $S3_RW_KEY
jitsu env set S3_RW_SECRET $S3_RW_SECRET
jitsu env set S3_OBJECTS_BUCKET $S3_OBJECTS_BUCKET

