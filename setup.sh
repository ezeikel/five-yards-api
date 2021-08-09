#!/bin/bash

cd /home/ec2-user/five-yards-api
source /home/ec2-user/.bash_profile
npm install --global yarn
yarn install
yarn build