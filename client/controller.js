'use strict'

let pageDetails = {};

class Controller {
    constructor({ name }) {
        this.name = name;
        this.subdomain;
    }
    connect({ io, $scope }) {
        const socket = io.connect();

        $scope.pageName = 'worldy.io';
        $scope.messages = [];
        $scope.roster = [];
        $scope.name = '';
        $scope.text = '';
        $scope.title = '';
        $scope.owner = '';
        $scope.logoutText = '';
        $scope.me = '';
        $scope.isMySubdomain = false;
        $scope.pageDetails = {};
        $scope.isSubdomainTaken = false;
        
        
        
        
        
        $scope.isLoggedIn = false;
        
        const hooks = {
          connect: () => {},
          whoami: () => {},
          message: () => {},
          connected: () => {},
          roster: () => {}
        }

        socket.on('connect', () => {
        	hooks.connect();
        });
        
        socket.on('connected', (data) => {
          console.log('connected-data:', data);
          this.subdomain = data.subdomain;
          $scope.title = this.name + ' ' + data.subdomain;
          hooks.connected(data);
          $scope.pageDetails = data;
          $scope.pageName = (data.subdomain ? (data.subdomain == '#' ? '' : data.subdomain + '.') : '') + 'worldy.io';
          $scope.$apply();
        });
        
        socket.on('whoami', (me) => {
        	console.log("Server: 'whoami'", me);
        	$scope.logoutText = me.endsWith('_?') ? null : 'Logout';
        	$scope.isLoggedIn = !!$scope.logoutText;
        	$scope.me = me;
        	$scope.isSubdomainTaken = !!$scope.pageDetails.game;
        	$scope.isMySubdomain = $scope.isSubdomainTaken && $scope.isLoggedIn && $scope.me === $scope.pageDetails.owner;
        	hooks.whoami(me);
        	$scope.$apply();
        });

        socket.on('message', (msg) => {
          $scope.messages.push(msg);
          $scope.$apply();
          hooks.message(msg);
        });
        
        socket.on('debug', (msg) => {
          console.log('[DEBUG]', msg);
        });
        
        socket.on('roster', (names) => {
          $scope.roster = names;
          $scope.$apply();
          hooks.roster(names);
        });
        
        $scope.send = () => {
          socket.emit('message', $scope.text);
          $scope.text = '';
        };
        
        
        return { 
          name: this.name,
          subdomain: this.subdomain,
          emit: (name, data) => {
            socket.emit(name, data);
          },
          on:  (name, callback) => {
            socket.on(name, callback);
          },
          hooks 
        };
      }
}