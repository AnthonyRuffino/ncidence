class CharacterHelper {

    constructor({ storming, subdomain }) {
        this.storming = storming;
        this.subdomain = subdomain;
        this.ofValue = require('of-value');
    }
    
    getGameEntityRecord(gameName, entityName, filter) {
        return new Promise((resolve, reject) => {
            try {

                if (!this.storming) {
                    console.log(gameName, `Error fetching model '[${entityName}]'`);
                    resolve(false);
                    return;
                }

                console.log('Getting game entity: ' + entityName + ' - [' + this.storming.database + ']');

                if (!(this.storming.getMap()[entityName].model)) {
                    console.log(gameName, `Error fetching model '[${entityName}]'`);
                    resolve(false);
                    return;
                }
                this.storming.getMap()[entityName].model.find(filter, (err, entities) => {
                    if (err) {
                        console.log(`Game ${gameName}, Error fetching entity '[${entityName}]' with filter:`, filter, err);
                        resolve(false);
                        return;
                    }
                    if (!entities[0]) {
                        console.log(`Game: ${gameName}, Entity '[${entityName}]' not found after filter:`, filter);
                        resolve(false);
                        return;
                    }
                    resolve(entities);
                });
            }
            catch (err) {
                console.log(gameName, `Exception fetching model for '[${entityName}]'`, err);
                resolve(false);
            }
        });
    }
    
    findCharacters({name, user}){
        return new Promise(async(resolve, reject) => {
            let characters = await this.getGameEntityRecord(
                this.subdomain,
                'character', this.ofValue.stripUndefined({ name, user }));
            if (!characters) {
                resolve([]);
            }
            else {
                const returnList = [];
                characters.forEach((character) => {
                    returnList.push({ ...character,
                        data: () => {
                            let buffer = Buffer.from(JSON.parse(JSON.stringify(character.data)).data).toString();
                            //console.log('Character data loaded: ' + buffer);
                            return JSON.parse(buffer.toString());
                        }
                    });
                });
                resolve(returnList);
            }
        });
    }
    
    createCharacter({name, user, data}){
        return new Promise(async(resolve, reject) => {
            this.storming.getMap()['character'].model.create({ name, user, data: JSON.stringify(data) }, (err, createdCharacter) => {
                if(err) {
                    reject(err);
                }else {
                    resolve(createdCharacter);
                }
            });
        });
    }
}
module.exports = CharacterHelper;