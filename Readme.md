# Atomic scheduler

[![Greenkeeper badge](https://badges.greenkeeper.io/ghostmonitor/atomic-scheduler.svg)](https://greenkeeper.io/)
Schedule lib for folks who takes it seriously :)

## Requirements
Redis >= 2.8.0 with keyspace notification enabled (http://redis.io/topics/notifications) 

TL;DR: `redis-cli config set notify-keyspace-events KEA`

## Features
- Atomic - handlers only called once
- Works after restarting an istance

## Usage
Please take a look at `example.js` 

## Todo
- Docs
- Handle orphaned keys
- Redis cluster support

More doc coming soon