/**
 * Job Queues with 'Kue'
 *
 * @description :: To manage and execute various computation jobs
 * @help        :: See https://github.com/Automattic/kue
 */

var kue = require('kue')
  , buildQueue = kue.createQueue()
  , deployQueue = kue.createQueue()
  , monitorQueue = kue.createQueue();
console.log('queues created...globally');
var queue = kue.createQueue();
var job = monitorQueue.create("gitClone");
job.save();


/**
 * Method to create and initialize queues
 */
exports.startQueue = function(){
  var buildQueue = kue.createQueue()
    , deployQueue = kue.createQueue()
    , monitorQueue = kue.createQueue();
  console.log('queues created... and module loaded')
};


/**
 * Method to create new jobs
 *
 * @param   {String} name           Name of the job
 * @param   {Variable} execute      Queue name where the job to be created
 */
exports.createJob = function(name, queue) {
  var job = queue.create(name, {
    //execute this
  }).save( function(err){
    if( !err ) console.log( job.id );
  });

};


/**
 * Method to process jobs
 *
 * @param   {String} name           Name of the job
 * @param   {Function} execute      Compute function to be executed by the job (payload)
 */
exports.processJob = function(name ,execute) {
  queue.process(name, function(job, done) {
    //write what you want to execute here
    //better way is to pass code to be executed as a function param
    execute();
    console.log('Job', job.id, 'is done');
    done && done();
  })
};
