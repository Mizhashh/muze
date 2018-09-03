import { mergeRecursive, getUniqueId } from 'muze-utils';

/**
 * An abstract class which has the definition of common functionalities of side effects like
 *  - Enabling side effect
 *  - Disabling side effect
 *  - Setting of configuration
 *  - Adding strategy
 * Every side effect has to inherit this class and add the concrete definition.
 *
 * @public
 * @class
 * @namespace Muze
 */
export default class GenericSideEffect {
    constructor (firebolt) {
        this.firebolt = firebolt;
        this._enabled = true;
        this._strategy = 'default';
        this._config = {};
        this._id = getUniqueId();
        this._strategies = {};
        this.config(this.constructor.defaultConfig());
    }

    static defaultConfig () {
        return {};
    }

    static target () {
        return 'all';
    }

    static mutates () {
        return false;
    }

    config (...params) {
        if (params.length) {
            this._config = mergeRecursive(this._config, params[0]);
            return this;
        }
        return this._config;
    }

    disable () {
        this._enabled = false;
        return this;
    }

    enable () {
        this._enabled = true;
        return this;
    }

    isEnabled () {
        return this._enabled;
    }

    /**
     * Changes the visualization by adding new elements or changing any attributes of the elements. It gets an entry
     * and exit set and adds a new layer using the entry data model or the exit datamodel or it can also change the
     * color of the plots by retrieving it from the entry or exit set.
     *
     * @public
     *
     * @param {Object} selectionSet Contains the entry and exit set information
     * @param {Array} [selectionSet.entrySet =
     *  [oldEntrySet = { uids: // row ids, newEntrySet: { uids: // row ids }]] Contains the old and new entry set.
     * @param {Array} [selectionSet.exitSet =
     *  [oldExitSet = { uids: // row ids, newExitSet: { uids: // row ids }]] Contains the old and new exit set.
     * @param {Object} selectionSet.mergedEnter Contains both the old entry set and the new entry set.
     * @param {Array} selectionSet.mergedEnter.uids Unique row ids which are in the entry set.
     * @param {DataModel} selectionSet.mergedEnter.model Data model which contains all data from the entry set.
     * @param {Object} selectionSet.mergedExit Contains both the old exit set and the new exit set.
     * @param {Array} selectionSet.mergedExit.uids Unique row ids which are in the exit set.
     * @param {DataModel} selectionSet.mergedExit.model Data model which contains all data from the exit set.
     * @param {Object} selectionSet.completeSet Contains all the row ids and the datamodel instance.
     * @param {Array} selectionSet.completeSet.uids All row ids present in {@link SelectionSet}.
     * @param {DataModel} selectionSet.completeSet.model Data model which contains all data from complete set.
     *
     * @param {Object} payload Contains information like criteria which were passed during behaviour dispatching.
     * @param {Object} options Contains strategy and other information needed for creating a side effect.
     * @param {string} options.strategy Name of strategy which will be decide how the side effect will be created.
     *
     * @return {GenericSideEffect} Instance of the side effect.
     */
    apply () {
        return this;
    }

    addStrategy (name, fn) {
        this._strategies[name] = fn;
        return this;
    }
}
