'use strict';

let request = require('request');
let Telegram = require('node-telegram-bot-api');
let jsonfile = require('jsonfile');

class Instabot {

    constructor(config) {
        this._api = new Telegram(config.token);
        this._config = config;
        this.users = {};
    }

    getUsers() {
        return new Promise( (resolve, reject) => {
            jsonfile.readFile(this._config.file, (err, obj) => {
                if (err) {
                    reject();
                } else {
                    this.users = obj;
                    resolve();
                }
            })
        })
    }

    check() {
        Object.keys(this.users).forEach( (key) => {
            request({
                url: `https://www.instagram.com/${key}/?__a=1`,
                json: true,
            }, (error, response, body) => {
                if (!error && response.statusCode == 200 && !body.user.is_private) {
                    let name = body.user.media.nodes[0].display_src.match(/[^\/?#]+(?=$|[?#])/)[0];
                    if (!this.users[key] || this.users[key].indexOf(name) == -1) {
                        this.users[key] = body.user.media.nodes[0].display_src;
                        jsonfile.writeFile(this._config.file, this.users);
                        this.send(key);
                    }
                }
            })
        })
    }

    send(key) {
        request({
            url: this.users[key],
            encoding: null,
        }, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                this._api.sendPhoto(this._config.dialog, body, {
                    caption: `${key} posted a new photo`,
                });
            }
        })
    }

    go() {
        this.getUsers().then(setInterval( () => {
            this.check();
        }, this._config.time))
    }

}

let bot = new Instabot({
    token: '287633435:AAGyNZvGKKBQaZXsW2lvTzw4MJcrmB2-6JE',
    file: 'users.json',
    dialog: 64318688,
    time: 60000
});

bot.go();
