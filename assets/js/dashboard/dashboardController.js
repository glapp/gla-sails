/**
 * Created by Fabio on 05.02.2015.
 */

(function () {
  'use strict';

  angular.module('glaPilotApp')
    .controller('dashboardController', dashboardController);

  dashboardController.$inject = ["$scope", "ngSails"];

  function dashboardController($scope, $sails) {



  }

})();

/*clabshomeApp.controller('clabsController', function ($scope, $sails, $filter, $http, moment) {
  // User
  var getUsers = function () {
    $sails.get('/user/getUsersInclBalance')
      .success(function (users) {
        $scope.users = users;
      })
      .error(function (response) {
        alert('Problem with users')
      });
  };

  // Job
  var getJobs = function () {
    $sails.get('/job')
      .success(function (jobs) {
        $scope.jobs = jobs;
      })
      .error(function (response) {
        alert('Problem with jobs')
      });
  };

  var addJob = function (newJob) {
    $sails.post('/job', newJob)
      .success(function (job) {
        $scope.jobs.push(job);
      })
      .error(function (response) {
        alert('Problem with creating job: ' + response)
      });
  };

  $scope.removeJob = function (job) {
    $sails.delete('/job', job)
      .success(function (deleted) {
        $scope.jobs = $scope.jobs.filter(function (job) {
          return job.id != deleted.id;
        });
      })
      .error(function (response) {
        console.log(response);
      })
  };

  $scope.removePenalty = function(penalty) {
    $sails.delete('/penalty', penalty)
      .success(function (deleted) {
        getUsers();
      })
      .error(function(response) {
        console.log(response);
      })
  };

  $scope.removePayment = function(payment) {
    $sails.delete('/payment', payment)
      .success(function (deleted) {
        getUsers();
      })
      .error(function(response) {
        console.log(response);
      })
  };

  var updateJob = function (job) {
    var job_clear = angular.copy(job);
    $sails.put('/job/' + job.id, job_clear)
      .success(function (job) {
        console.log('updated ' + job.id);
      })
      .error(function (response) {
        alert('Problem with updating job: ' + response)
      });
  };

  var createPenalty = function (job) {
    var a = moment(job.dueDate);
    var b = moment(job.dateDone);
    var diff = a.diff(b, 'days');
    if (diff < 0) {
      var newPenalty = {};
      newPenalty.delay = -diff;
      newPenalty.user = job.assignedTo;
      newPenalty.job = job.id;
      $sails.post('/penalty', newPenalty)
        .success(function (createdPenalty) {
          console.log(createdPenalty);
          getUsers();
        })
        .error(function (response) {
          alert(response);
        })
    }
  };

  $scope.createJobs = function (date) {
    date = moment(date, "DD.MM.YYYY");
    addJob({kind: 'Bad', dueDate: date, doneFlag: false});
    addJob({kind: 'Boden', dueDate: date, doneFlag: false});
    addJob({kind: 'Küche', dueDate: date, doneFlag: false});
  };

  $scope.addSeven = function (date) {
    var newDate = moment(date, "DD.MM.YYYY");
    newDate = moment(newDate).add(7, 'days').format('DD.MM.YYYY');
    return newDate;
  };

  $scope.addRow = function () {
    $sails.get('/job/addNewRow')
      .success(function (response) {
        toastr.success('No meh ztüe...');
        getJobs();
      })
      .error(function (response) {
        console.log(response);
      })
  };

  function deletePenalty(job) {
    $sails.get('/penalty', function (penalties) {
      console.log(penalties);
      for (var i in penalties) {
        console.log(penalties[i]);
        if (penalties[i].job.id == job.id) {
          $sails.delete('/penalty', {id: penalties[i].id})
            .success(function (deleted) {
              console.log('deleted: ' + deleted);
              getUsers();
            })
            .error(function (deleted) {
              console.log(deleted);
            });
        }
      }
    });
  }

  $scope.setDone = function (job) {
    if (!job.doneFlag) {
      job.dateDone = new Date();
      job.doneFlag = true;
      updateJob(job);
      createPenalty(job);
    } else {
      job.doneFlag = false;
      job.dateDone = null;
      updateJob(job);
      deletePenalty(job);
    }

  };

  var addPayment = function (newPayment) {
    $sails.post('/payment', newPayment)
      .success(function (payment) {
        toastr.success('Zahlig registriert! Merci!');
        getUsers();
      })
      .error(function (response) {
        alert('Problem with creating payment: ' + response)
      });
  };

  $scope.payPrompt = function (user) {
    vex.dialog.prompt({
      message: 'Wi viu hesch zaut?',
      placeholder: 'CHF',
      callback: function (value) {
        if (!value) return;
        console.log(value);
        if (!isNaN(parseFloat(value)) && isFinite(value)) {
          addPayment({amount: value, user: user.id})
        } else {
          toastr.error('Fausches Format! Mir hei hie CHF!')
        }
      }
    })
  };

  var difference = function (job) {
    var a = moment(job.dueDate);
    var b = moment();
    var diff = a.diff(b, 'days');
    return diff;
  };

  $scope.isWarning = function (job) {
    var diff = difference(job);
    if (diff < 3 && diff >= 0 && !job.doneFlag) {
      return true;
    } else {
      return false;
    }
  };

  $scope.isLate = function (job) {
    var diff = difference(job);
    if (diff < 0 && !job.doneFlag) {
      return true;
    } else {
      return false;
    }
  };

  $sails.on('job', function (message) {
    console.log('message: ' + message.verb);
    switch (message.verb) {
      case 'created':
        console.log("pushing " + JSON.stringify(message.data));
        $scope.jobs.push(message.data);
        break;
      case 'destroyed':
        $scope.jobs = $scope.jobs.filter(function (job) {
          return job.id != message.id;
        });
        break;
    }
  });

  getUsers();
  getJobs();

});

clabshomeApp.controller('navController', function ($scope, $location, $sails, $filter, $http, moment) {
  $scope.auth = function () {
    var login;

    login = function (username, password, callback) {
      // `setTimeout` for demo purposes only
      // Here you could make an asynchronous request to your server.
      if (username === 'admin' && password === 'homeadmin') {
        return callback('success');
      } else {
        return callback('An error occurred logging in.');
      }
    };

    vex.dialog.prompt({
      className: 'vex-theme-default',
      message: 'Log in:',
      input: '<input name="username" type="text" class="vex-dialog-prompt-input" placeholder="username" value="" required>\n<input name="password" type="password" class="vex-dialog-prompt-input" placeholder="password" value="" required>',
      onSubmit: function (event) {
        var $vexContent;
        event.preventDefault();
        event.stopPropagation();
        $vexContent = $(this).parent();
        return login(this.username.value, this.password.value, function (message) {
          if (message === 'success') {
            window.location.href = '/login';
            toastr.error('Successfully logged in.');
            return vex.close($vexContent.data().vex.id);
          } else {
            return toastr.error(message);
          }
        });
      }
    });
  };
});
