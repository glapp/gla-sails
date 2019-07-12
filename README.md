# Backend for GLAPP
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fglapp%2Fgla-sails.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fglapp%2Fgla-sails?ref=badge_shield)

Based on the [sails.js](http://sailsjs.com/) framework.
This is the base repository to run the complete GLAPP platform by performing the following steps:

## Pre-requisites
* [Docker Toolbox](https://www.docker.com/products/docker-toolbox)
* A fixed infrastructure in place
  * e.g. https://github.com/glapp/docker-swarm-creation

## Prepare
* Copy your .pem files into /swarmcerts on whatever machine the components are going to run on
* Set the environment variable SWARM_HOST to the swarm-host `IP:port` (e.g. `SWARM_HOST=192.168.99.101:3376`). If no port is declared, 3376 is assumed.

## Run
* Start app with `docker-compose up -d`

## Test
* Since this will run the tests locally and not in a docker container, [Node.js](https://nodejs.org/en/download/) is required
    * Install the dependencies locally with `npm install`
* Make sure the test images are pulled on the swarm so the tests don't time out: `docker pull bfirsh/compose-mongodb-demo && docker pull mongo`
* Start the tests with `npm test`


## License
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fglapp%2Fgla-sails.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fglapp%2Fgla-sails?ref=badge_large)