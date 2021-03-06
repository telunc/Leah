'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _requestPromise = require('request-promise');

var _requestPromise2 = _interopRequireDefault(_requestPromise);

var _redis = require('./redis');

var _redis2 = _interopRequireDefault(_redis);

var _version = require('./version');

var _version2 = _interopRequireDefault(_version);

var _stringSimilarity = require('string-similarity');

var _config = require('config');

var _config2 = _interopRequireDefault(_config);

var _slugify = require('slugify');

var _slugify2 = _interopRequireDefault(_slugify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _class = function () {
    function _class() {
        _classCallCheck(this, _class);
    }

    _createClass(_class, null, [{
        key: 'getItems',
        value: async function getItems() {
            var cacheItems = await _redis2.default.getAsync('leah-items');
            if (cacheItems) return JSON.parse(cacheItems);
            var build = await _version2.default.getVersion().catch(function () {
                console.error('failed to load version');
            });
            var results = await (0, _requestPromise2.default)({ uri: 'http://ptr.d3planner.com/api/' + build + '/items', gzip: true, json: true }).catch(function () {
                console.error('failed to load items');
            });
            if (!results) return;
            var items = Object.keys(results).map(function (item) {
                results[item].id = (0, _slugify2.default)(results[item].name.replace('\'', ''), { lower: true }) + '-' + item;
                return results[item];
            });
            await _redis2.default.set('leah-items', JSON.stringify(items), 'EX', 86400);
            return items;
        }
    }, {
        key: 'getItemsWithId',
        value: async function getItemsWithId(region, id) {
            var cacheItem = await _redis2.default.getAsync('leah-' + region + '-items-' + id);
            if (cacheItem) return JSON.parse(cacheItem);
            var item = await (0, _requestPromise2.default)({ uri: 'https://' + region + '.api.battle.net/d3/data/item/' + id + '?apikey=' + _config2.default.get('battle-net').key, json: true }).catch(function () {
                console.error('failed to load item with id ' + id + ' in ' + region + ' region');
            });
            if (!item) return;
            await _redis2.default.set('leah-' + region + '-items-' + id, JSON.stringify(item), 'EX', 86400);
            return item;
        }
    }, {
        key: 'getItemWithName',
        value: async function getItemWithName(region, name) {
            var items = await this.getItems();
            if (!items) return;
            items.forEach(function (item) {
                if (name && item.name) {
                    item.similarity = (0, _stringSimilarity.compareTwoStrings)(name, item.name);
                    if (item.powers) item.similarity += 0.0001;
                    if (item.drop_classes) item.similarity += 0.001;
                    if (item.drop_weight > 0) item.similarity += 0.001;
                } else {
                    item.similarity = 0;
                }
            });
            items.sort(function (a, b) {
                return b.similarity - a.similarity;
            });
            return this.getItemsWithId(region, items[0].id);
        }
    }]);

    return _class;
}();

exports.default = _class;