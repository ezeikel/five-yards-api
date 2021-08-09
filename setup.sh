#!/bin/bash

cd /home/ec2-user/five-yards-api
source /home/ec2-user/.bashrc
npm install --global yarn
yarn install
yarn build