const MySQL = require('mysql');
const Config = {
    host: "localhost",
    user: "root",
    password: ""
}

const Connection = MySQL.createConnection(Config);

module.exports = Connection;