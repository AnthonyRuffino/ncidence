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
        
        const hook = {
          connect: () => {},
          whoami: () => {},
          message: () => {},
          connected: () => {},
          roster: () => {}
        }

        socket.on('connect', () => {
        	//console.log('connect');
        	hook.connect();
        });
        
        socket.on('whoami', (me) => {
        	console.log('me', me);
        	hook.whoami(me);
        });

        socket.on('message', (msg) => {
          $scope.messages.push(msg);
          $scope.$apply();
          hook.message(msg);
        });
        
        socket.on('connected', (data) => {
          this.subdomain = data.subdomain;
          console.log('data.subdomain', data.subdomain);
          $scope.title = this.name + ' ' + data.subdomain;
          console.log('game', data.owner);
          $scope.$apply();
          hook.connected(data);
        });

        socket.on('roster', (names) => {
          $scope.roster = names;
          $scope.$apply();
          hook.roster(names);
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
          hook 
        };
      }
}