#!/bin/bash


start_npm() {
    local DIRECTORY=$1
    cd ${DIRECTORY} && npm install
    cd ${DIRECTORY} && npm start
}

get_pid() {
    echo `cat $1`
}

stop_pid() {
    local PID=$(get_pid $1)
    echo "KILL ${PID}"
    kill $PID
}

catch_signal() {
    stop_pid ${react_pid}
    stop_pid ${express_pid}
}

CURRENT_DIR=$(pwd)
start_npm "${CURRENT_DIR}"

#trap catch_signal INT
#trap catch_signal SIGINT
#trap catch_signal SIGTERM

#wait $(get_pid ${EXPRESS_PID})
#wait $(get_pid ${REACT_PID})
#echo "run_auth complete"
