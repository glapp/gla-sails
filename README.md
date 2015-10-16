# GLA-pilot

This application is based on [Sails](http://sailsjs.org).

## Pre-requisites
* [Node.js](https://nodejs.org/)
* [MongoDB](https://www.mongodb.org/downloads) (or whatever DB is used in config/models.js)
  * Change to 'localDiskDb' in config/models.js if you don't want to use a db

## Prepare
* `npm install`

## Run
* start whatever DB is chosen
  * MongoDB: `mongod --dbpath /path/to/any/db/folder`
* Start app with `npm start`
