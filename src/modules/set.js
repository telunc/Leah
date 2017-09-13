import rp from 'request-promise';
import redis from './redis';
import { compareTwoStrings } from 'string-similarity';

export default class {

    static async getSets() {
        let cacheSet = await redis.getAsync('sets');
        if (cacheSet) return JSON.parse(cacheSet);
        let results = await rp({ uri: 'http://d3planner.com/game/json/itemsets', gzip: true, json: true }).catch(() => {
            console.error('failed to load sets');
        });
        if (!results) return;
        let sets = Object.keys(results).map((set) => {
            results[set].id = set;
            return results[set];
        });
        await redis.set('sets', JSON.stringify(sets), 'EX', 86400);
        return sets;
    }

    static async getSetWithName(name) {
        let sets = await this.getSets();
        if (!sets) return;
        sets.forEach((set) => {
            if (name && set.name) {
                set.similarity = compareTwoStrings(name, set.name);
            } else {
                set.similarity = 0;
            }
        });
        sets.sort((a, b) => {
            return b.similarity - a.similarity;
        });
        return sets[0];
    }

}