/**
 * Job Queuedocks with 'Kue'
 *
 * @description :: To manage and execute various computation jobs
 * @help        :: See https://github.com/Automattic/kue
 */

var kue = require('kue')
    , queue = kue.createQueue();
