#!/bin/bash

./async-stop.sh
npm run build
./async-start.sh
