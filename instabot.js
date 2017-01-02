'use strict';

let request = require('request');
let Telegram = require('node-telegram-bot-api');
let jsonfile = require('jsonfile');

function Instabot(config) {

    this._api = new Telegram(config.token);
    this._config = config;
    this.users = {};

}

Instabot.prototype = {

    getUsers: function() {
        let self = this;
        return new Promise(function(resolve, reject) {
            jsonfile.readFile(self._config.file, function(err, obj) {
                if (err) {
                    reject();
                } else {
                    self.users = obj;
                    resolve();
                }
            })
        })
    },
    check: function() {
        let self = this;
        Object.keys(self.users).forEach(function(key) {
            request({
                url: 'https://www.instagram.com/'+ key +'/?__a=1',
                json: true,
            }, function (error, response, body) {
                if (!error && response.statusCode == 200 && !body.user.is_private) {
                    let name = body.user.media.nodes[0].display_src.match(/[^\/?#]+(?=$|[?#])/)[0];
                    if (!self.users[key] || self.users[key].indexOf(name) == -1) {
                        self.users[key] = body.user.media.nodes[0].display_src;
                        jsonfile.writeFile(self._config.file, self.users);
                        self.send(key);
                    }
                }
            })
        })
    },
    send: function(key) {
        let self = this;
        request({
            url: self.users[key],
            encoding: null,
        }, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                self._api.sendPhoto(self._config.dialog, body, {
                    caption: key+' posted a new photo',
                });
            }
        })
    },
    go: function() {
        let self = this;
        self.getUsers().then(setInterval(function() {
            self.check();
        }, self._config.time))
    }

}

var bot = new Instabot({
    token: '287633435:AAGyNZvGKKBQaZXsW2lvTzw4MJcrmB2-6JE',
    file: 'users.json',
    dialog: 64318688,
    time: 60000
});

bot.go();
