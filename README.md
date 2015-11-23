# GLA-pilot

This application is based on [Sails](http://sailsjs.org).

## Pre-requisites
* [Node.js](https://nodejs.org/)
* [Docker-Machine](https://docs.docker.com/machine/install-machine/)

## Prepare
* `npm install`
* Set up a docker swarm
  * Set up key-value storage:
    * ``docker-machine create -d virtualbox kvstore``
    * Unix: ``eval $(docker-machine env kvstore)``, Windows: ``FOR /f "tokens=*" %i IN ('docker-machine env --shell=cmd kvstore') DO %i``
    * ```docker run -d --net=host progrium/consul --server -bootstrap-expect 1```
  * Create swarm-master
    * ```docker-machine create -d virtualbox --engine-opt "cluster-store consul://$(docker-machine ip kvstore):8500" --engine-opt "cluster-advertise eth1:2376" --swarm --swarm-master --swarm-discovery consul://$(docker-machine ip kvstore):8500 swarm-master```
    * Note that this is the same command as setting up a regular swarm-master, but with another swarm-discovery argument and some engine-opts.
  * Create swarm agents
    * ```docker-machine create -d virtualbox --engine-opt "cluster-store consul://$(docker-machine ip kvstore):8500" --engine-opt "cluster-advertise eth1:2376" --swarm --swarm-discovery consul://$(docker-machine ip kvstore):8500 swarm-agent-00```
    * Here, again, the only change to setting up a regular swarm-agent is the swarm-discovery and the engine-opts.
    * Same command for swarm-agent-01, swarm-agent-02, etc.
  * To get the IP and the right port on the swarm-master, type ``docker-machine env --swarm swarm-master``
* Copy config/localSample.js and name the file local.js, where SWARM_HOST and SWARM_PORT are set according to above information

## Run
* Start app with `npm start`

## Test
* Run the defined tests with `npm test`
