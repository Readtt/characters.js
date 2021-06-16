const SQL = require('./MySQL');
const got = require('got');
const cheerio = require('cheerio');
const options = require('./options.json');
const _Console = require('./_Console')
const URL = "https://www.animecharactersdatabase.com/charactershub.php?x=${}&load=c_latest";
const Limit = 100;
const StartingPage = 0;
const Logger = new _Console();

function InitSQL() {
    return new Promise((resolve, reject) => {
        SQL.connect(function (err) {
            if (err) {
                reject();
                throw err;
            };
            Logger.Success("Connected...")
        });
        SQL.query(`CREATE DATABASE IF NOT EXISTS character_schema;`, function (err) {
            if (err) {
                reject();
                throw err;
            };
            Logger.Info("Database `character_schema` Initialized...");
        });
        SQL.query(`USE character_schema;`, function (err) {
            if (err) {
                reject();
                throw err;
            };
            Logger.Info("Using `character_schema`...");
        });
        SQL.query(`CREATE TABLE IF NOT EXISTS characters(
            ID INT AUTO_INCREMENT NOT NULL,
            name varchar(255) NOT NULL,
            img varchar(255) NOT NULL,
            from_where varchar(255),
            media_type varchar(255),
            date int NOT NULL,
            PRIMARY key (ID),
            UNIQUE(img)
        );`, function (err) {
            if (err) {
                reject();
                throw err;
            };
            Logger.Info("Table `characters` Initialized...");
        });
        SQL.query(`CREATE TABLE IF NOT EXISTS metadata(
            entity VARCHAR(255) NOT NULL,
            value VARCHAR(255) NOT NULL,
            UNIQUE(entity)
        );`, function (err) {
            if (err) {
                reject();
                throw err;
            };
            Logger.Info("Table `metadata` Initialized...");
        });
        SQL.query(`INSERT INTO metadata (entity, value) VALUES ('page','0')`, function (err) {
            if (err) {
                if (err.code === "ER_DUP_ENTRY") {
                    Logger.Warning("ER_DUP_ENTRY `metadata` VALUES ('page','0')...")
                    return;
                } else {
                    reject();
                    throw err;
                }
            }
            Logger.Success(`INSERT INTO metadata (entity, value) VALUES ('page','0')`);
        })
        resolve();
    })
}

function ModifyMetadata(entity, value) {
    return new Promise(resolve => {
        SQL.query(`UPDATE metadata SET value = '${value}' WHERE entity = '${entity}'`, function (err) {
            if (err) {
                return;
            }
            resolve();
            if (Logger.Previous() != `UPDATE metadata SET value = '${value}' WHERE entity = '${entity}'`) {
                Logger.Info(`UPDATE metadata SET value = '${value}' WHERE entity = '${entity}'`);
            }
        })
    })
}

function GetMetadata(entity, callback) {
    return new Promise(resolve => {
        SQL.query(`SELECT * FROM metadata`, function (err, res) {
            if (err) {
                return 0;
            }
            resolve();
            if (Logger.Previous() != `SELECT * FROM metadata`) {
                Logger.Info(`SELECT * FROM metadata`);
            }
            callback(res.find(x => x.entity === entity).value);
        })
    })
}

async function Start() {
    let CharactersInserted = 0;
    while (true) {
        let StartTime = Date.now();
        let PageFn;
        await new Promise(resolve => setTimeout(resolve));
        await GetMetadata('page', async(res) => {
            if(isNaN(res)) {
                PageFn = 0;
                await ModifyMetadata('page', "0")
                Logger.Warning("^^^^^^ Modified Page, Last Page was NaN...");
            } else {
                PageFn = res;
            }
            if (Logger.Previous() != `PageFn Set To Current Page: ${res}...`) {
                Logger.Info(`PageFn Set To Current Page ${res}...`);
            }
        })

        await got(URL.replace('${}', PageFn)).then(async(res) => {
            const $ = cheerio.load(res.body);

            if ($('.tile3top').length == 0) {
                await ModifyMetadata('page', StartingPage.toString())
                return;
            }

            $('.tile3top').each(async (i) => {
                const name = $('#tile1 > ul > li:nth-child(' + (i + 1) + ') > a > img').attr().title;
                const img = $('#tile1 > ul > li:nth-child(' + (i + 1) + ') > a > img').attr().src;
                const ID = parseInt($('#tile1 > ul > li:nth-child(' + (i + 1) + ') > a').attr().href.split("=")[1])
                let from_where = "NULL",
                    media_type = "NULL";

                if (options.FromWhere == true || options.MediaType == true) {
                    await got(`https://www.animecharactersdatabase.com/characters.php?id=${ID}`).then(result => {
                        const $ = cheerio.load(result.body)
                        if (options.FromWhere == true) {
                            if ($('#sidephoto > table:nth-child(4) > tbody > tr:nth-child(3) > td > a').text().trim().length != 0) {
                                from_where = $('#sidephoto > table:nth-child(4) > tbody > tr:nth-child(3) > td > a').text().trim();
                            }
                        }
                        if (options.MediaType == true) {
                            if ($('#sidephoto > table:nth-child(4) > tbody > tr:nth-child(4) > td').text().trim().length != 0) {
                                media_type = $('#sidephoto > table:nth-child(4) > tbody > tr:nth-child(3) > td > a').text().trim().toLowerCase().split(' ').map(type => type.charAt(0).toUpperCase() + type.substring(1)).join(' ');
                            }
                        }
                    }).catch(err => {
                        if (err.toString().includes('HTTPError')) {
                            if (Logger.Previous() != "Service Unavailable Waiting...") {
                                Logger.Warning("Service Unavailable Waiting...")
                            }
                        } else {
                            if (Logger.Previous() != err) {
                                Logger.Error(err)
                            }
                        }
                    });
                }

                const CurrentDate = Date.now();
                SQL.query(`INSERT INTO characters (name,img,from_where,media_type,date) VALUES ('${name}','${img}','${from_where}','${media_type}','${CurrentDate}');`, async function (err) {
                    if (err) {
                        if (err.code === "ER_DUP_ENTRY") {
                            if (Logger.Previous() != "ER_DUP_ENTRY `characters` Waiting...") {
                                Logger.Warning("ER_DUP_ENTRY `characters` Waiting...")
                            }
                            //ModifyMetadata('page', (parseInt(PageFn) + Limit).toString())
                            ModifyMetadata('page', StartingPage.toString())
                            return;
                        } else {
                            if (Logger.Previous() != err) {
                                Logger.Error(err);
                            }
                            return;
                        }
                    }
                    CharactersInserted = (CharactersInserted + 1)
                    Logger.Success(`INSERT INTO characters (name,img,from_where,media_type,date) VALUES ('${name}','${img}','NULL','NULL','${CurrentDate}');`);
                });
            });
        }).catch(err => {
            if (err.toString().includes('HTTPError')) {
                if (Logger.Previous() != "Service Unavailable Waiting...") {
                    Logger.Warning("Service Unavailable Waiting...")
                }
            } else {
                if (Logger.Previous() != err) {
                    Logger.Error(err)
                }
            }
        }).then(async() => {
            let EndTime = Date.now();
            await ModifyMetadata('page', (parseInt(PageFn) + Limit).toString())
            Logger.Warning("Page Took " + (EndTime - StartTime) + "ms To Complete...")
            if (CharactersInserted == 100) {
                Logger.Success("100 Characters Inserted...")
            } else if (CharactersInserted < 100 && CharactersInserted > 80) {
                Logger.Warning(CharactersInserted + " Characters Inserted...")
            } else if (CharactersInserted < 80) {
                if (CharactersInserted == 1) {
                    Logger.Error(CharactersInserted + " Character Inserted...")
                } else {
                    Logger.Error(CharactersInserted + " Characters Inserted...")
                }
            }
            CharactersInserted = 0;
        });
    }
}

(async() => {
    await InitSQL();
    Start();
})();