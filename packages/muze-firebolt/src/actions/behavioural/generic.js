import { getSetInfo, getMergedSet, getSourceFields } from '../../helper';

/**
 * Abstract class which provides common functionalities for all behavioural actions like
 *  - Creating entry exit set based on criteria
 *  - Enabling behavioural action
 *  - Disabling behavioural action
 *
 * Any new behavioural action must extend this class.
 *
 * To create a new behavioural action,
 *  ```
 *      class SingleSelectBehaviour extends GenericBehaviour {
 *          // Every behavioural action must declare a formal name for identifying it.
 *          static formalName () {
 *              return 'singleSelect';
 *          }
 *
 *          setSelectionSet () {
 *
 *          }
 *      }
 *  ```
 *
 * @public
 * @class
 * @namespace Muze
 */
export default class GenericBehaviour {
    constructor (firebolt) {
        this.firebolt = firebolt;
        this._enabled = true;
    }

    dispatch (payload) {
        const criteria = payload.criteria;
        const firebolt = this.firebolt;
        const formalName = this.constructor.formalName();
        const selectionSets = firebolt.getSelectionSets(formalName);
        const {
            model: filteredDataModel,
            uids
        } = this.firebolt.getAddSetFromCriteria(criteria, this.firebolt.getPropagationInf());
        const entryExitSets = selectionSets.map((selectionSet) => {
            this.setSelectionSet(uids, selectionSet);
            return this.getEntryExitSet(selectionSet, filteredDataModel, payload);
        });

        return entryExitSets;
    }

    /**
     * Adds or removes row ids from the {@link SelectionSet}. It decides if the row ids should be added or removed
     * from the {@link SelectionSet} and when the {@link SelectionSet} should be resetted.
     *
     * @public
     *
     * @param {Array} uids Array of unique row ids which were selected during interaction.
     * @param {SelectionSet} selectionSet Instance of {@link SelectionSet}.
     *
     * @return {GenericBehaviour} Instance of behavioural aciton.
     */
    setSelectionSet () {
        return this;
    }

    getEntryExitSet (selectionSet, filteredDataModel, payload) {
        const {
            entrySet,
            exitSet,
            completeSet
        } = selectionSet.getSets();
        const propagationInf = this.firebolt.getPropagationInf();
        const dataModel = this.firebolt.getFullData();
        const setConfig = {
            isSourceFieldPresent: propagationInf.isSourceFieldPresent,
            dataModel,
            filteredDataModel,
            propagationData: propagationInf.data,
            selectionSet
        };

        return {
            entrySet: [getSetInfo('oldEntry', entrySet[0], setConfig),
                getSetInfo('newEntry', entrySet[1], setConfig)],
            exitSet: [getSetInfo('oldEntry', exitSet[0], setConfig),
                getSetInfo('newExit', exitSet[1], setConfig)],
            mergedEnter: getSetInfo('mergedEnter', getMergedSet(entrySet), setConfig),
            mergedExit: getSetInfo('mergedExit', getMergedSet(exitSet), setConfig),
            completeSet: getSetInfo('complete', completeSet, setConfig),
            isSourceFieldPresent: propagationInf.isSourceFieldPresent,
            fields: getSourceFields(propagationInf, payload.criteria),
            sourceSelectionSet: selectionSet._volatile === true
        };
    }

    /**
     * Returns a boolean value if the behavioural action has any mutating effect like if it changes the data of the
     * visualization.
     *
     * @public
     *
     * @return {boolean} If the action mutates the data.
     */
    static mutates () {
        return false;
    }

    enable () {
        this._enabled = true;
    }

    disable () {
        this._enabled = false;
    }

    isEnabled () {
        return this._enabled;
    }
}

