var request = require('request');
var Telegram = require('node-telegram-bot-api');
var jsonfile = require('jsonfile');

var file = 'users.json';

var api = new Telegram('287633435:AAGyNZvGKKBQaZXsW2lvTzw4MJcrmB2-6JE');

var bot = {
    users: {},
    getUsers: function() {
        var self = this;
        return new Promise(function(resolve, reject) {
            jsonfile.readFile(file, function(err, obj) {
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
        var self = this;
        Object.keys(self.users).forEach(function(key) {
            request({
                url: 'https://www.instagram.com/'+ key +'/?__a=1',
                json: true,
            }, function (error, response, body) {
                if (!error && response.statusCode == 200 && !body.user.is_private) {
                    if (body.user.media.nodes[0].display_src !== self.users[key]) {
                        self.users[key] = body.user.media.nodes[0].display_src;
                        jsonfile.writeFile(file, self.users);
                        self.send(key);
                    }
                }
            })
        })
    },
    send: function(key) {
        request({
            url: this.users[key],
            encoding: null,
        }, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                api.sendPhoto('64318688', body, {
                    caption: key+' posted new photo',
                });
            }
        })
    }
}


bot.getUsers().then(setInterval(function() {
    bot.check();
}, 60000))
