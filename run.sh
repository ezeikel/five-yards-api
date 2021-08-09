#!/bin/bash

cd /home/ec2-user/five-yards-api
pm2 start yarn --name "five-yards-api" --log-date-format "YYYY-MM-DD HH:mm" -- start
pm2 startup
pm2 save