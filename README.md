# GLA-pilot

This application is based on [Sails](http://sailsjs.org).

## Pre-requisites
* [Node.js](https://nodejs.org/)
* [Docker-Machine](https://docs.docker.com/machine/install-machine/)
* A fixed infrastructure in place
  * e.g. https://bitbucket.org/uzh/docker-swarm-creation

## Prepare
* Have [gla-angular](git@bitbucket.org:uzh/gla-angular.git) ready in the parent directory
* Copy your .pem files into config/certs (the content of this folder is gitignored)

## Run
* Set the environment variable SWARM_HOST to the swarm-host `IP:port` (e.g. `SWARM_HOST=192.168.99.101:3376`)
* Start app with `docker-compose up -d`
