'use strict';

let request = require('request');
let Telegram = require('node-telegram-bot-api');
let jsonfile = require('jsonfile');

class Instabot {

    constructor(config) {
        this._api = new Telegram(config.token, { polling: true });
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

    addUser(user) {
        if (user in this.users) {
            this._api.sendMessage(this._config.dialog, `User ${user} already exists`);
        } else {
            request({
                url: `https://www.instagram.com/${user}/?__a=1`,
                json: true,
            }, (error, response, body) => {
                if (!error && response.statusCode == 200) {
                    this.users[user] = null;
                    jsonfile.writeFile(this._config.file, this.users);
                    this._api.sendMessage(this._config.dialog, `User ${user} has been added successfully`);
                } else {
                    this._api.sendMessage(this._config.dialog, `There is no such user ${user} on Instagram`);
                }
            })
        }
    }

    deleteUser(user) {
        if (user in this.users) {
            delete this.users[user];
            jsonfile.writeFile(this._config.file, this.users);
            this._api.sendMessage(this._config.dialog, `User ${user} has been deleted`);
        } else {
            this._api.sendMessage(this._config.dialog, `Can't find user ${user}`);
        }
    }

    check() {
        Object.keys(this.users).forEach( (key) => {
            request({
                url: `https://www.instagram.com/${key}/?__a=1`,
                json: true,
            }, (error, response, body) => {
                if (!error && response.statusCode == 200 && !body.user.is_private && body.user.media.nodes.length > 0) {
                    let code = body.user.media.nodes[0].code;
                    if (!this.users[key] || this.users[key] !== code) {
                        this.users[key] = code;
                        jsonfile.writeFile(this._config.file, this.users);
                        this.send(key);
                    }
                }
            })
        })
    }

    send(key) {
        request({
            url: `https://www.instagram.com/p/${this.users[key]}/?__a=1`,
            json: true,
        }, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                switch(body.graphql.shortcode_media.__typename) {
                    case 'GraphSidecar':
                        body.graphql.shortcode_media.edge_sidecar_to_children.edges.forEach((item, index) => {
                            request({
                                url: item.display_url,
                                encoding: null,
                            }, (error, response, body) => {
                                if (!error && response.statusCode === 200) {
                                    this._api.sendPhoto(this._config.dialog, body, {
                                        caption: `${key} posted a new slides: ${index} of ${body.graphql.shortcode_media.edge_sidecar_to_children.edges.length}`,
                                    });
                                }
                            })
                        })
                        break;
                    case 'GraphVideo':
                        request({
                            url: body.graphql.shortcode_media.video_url,
                            encoding: null,
                        }, (error, response, body) => {
                            if (!error && response.statusCode === 200) {
                                this._api.sendVideo(this._config.dialog, body, {
                                    caption: `${key} posted a new video`,
                                });
                            }
                        })
                        break;
                    default:
                        request({
                            url: body.graphql.shortcode_media.display_url,
                            encoding: null,
                        }, (error, response, body) => {
                            if (!error && response.statusCode === 200) {
                                this._api.sendPhoto(this._config.dialog, body, {
                                    caption: `${key} posted a new photo`,
                                });
                            }
                        })
                        break;
                }
            }
        })
    }

    go() {
        this.getUsers().then( () => {
            setInterval( () => {
                this.check();
            }, this._config.time)

            this._api.onText(/\/delete (.+)/, (msg, match) => {
                this.deleteUser(match[1]);
            })

            this._api.onText(/\/add (.+)/, (msg, match) => {
                this.addUser(match[1]);
            })

        })
    }
}

let bot = new Instabot({
    token: '287633435:AAGyNZvGKKBQaZXsW2lvTzw4MJcrmB2-6JE',
    file: 'users.json',
    dialog: 64318688,
    time: 60000
});

bot.go();
