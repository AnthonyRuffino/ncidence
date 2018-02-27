'use strict'

class Controller {
    constructor({ name }) {
        this.name = name;
        this.subdomain;
    }
    connect({ io, $scope }) {
        const socket = io.connect();

        $scope.messages = [];
        $scope.roster = [];
        $scope.name = '';
        $scope.text = '';
        $scope.title = '';
        $scope.owner = '';
        
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
        
        socket.on('whoami', (me) => {
        	console.log('whoami:', me);
        	hooks.whoami(me);
        });

        socket.on('message', (msg) => {
          $scope.messages.push(msg);
          $scope.$apply();
          hooks.message(msg);
        });
        
        socket.on('debug', (msg) => {
          console.log('[DEBUG]', msg);
        });
        
        socket.on('connected', (data) => {
          this.subdomain = data.subdomain;
          $scope.title = this.name + ' ' + data.subdomain;
          $scope.$apply();
          hooks.connected(data);
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