# Characters.js
Web scraper for https://animecharactersdatabase.com

## Installing
``git clone https://github.com/Readtt/characters.js.git``
``unzip``
``Setup MySQL DB in MySQL.js file``
``node .``

## Tips
- Enabling FromWhere or MediaType slows the process down a lot.
- It's highly highly recommended that you get everything in the first run because if there is a duplicated entry in the DB, the page will automatically get sent to the starting page in which it will keep looking for new character entries. You can change this by commenting out line 174:
```js
173:                             // ModifyMetadata('page', (parseInt(PageFn) + Limit).toString())
174:                             // ModifyMetadata('page', StartingPage.toString()) 
```
- You can setup your MySQL DB in the MySQL.js file.
- This isn't perfect but meh, I was bored