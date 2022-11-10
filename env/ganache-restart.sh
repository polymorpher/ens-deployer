#!/usr/bin/env bash
# Use if you want to emulate 2-seconds per block
#ganache -b 2 --server.ws --database.dbPath "./db"
ganache -b 2 --server.ws --database.dbPath "./db" -m "test test test test test test test test test test test junk"

# ganache --server.ws --database.dbPath "./db" -m "test test test test test test test test test test test junk"