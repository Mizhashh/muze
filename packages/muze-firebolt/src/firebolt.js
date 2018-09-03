import {
    mergeRecursive,
    hasTouch,
    filterPropagationModel,
    FieldType,
    selectElement
} from 'muze-utils';
import SelectionSet from './selection-set';
import {
    initializeBehaviouralActions,
    initializeSideEffects,
    changeSideEffectAvailability,
    initializePhysicalActions,
    unionSets,
    getSideEffects
} from './helper';

/**
 * This class is used to manage the interactions of chart components like visual unit, legend, etc. This is initialized
 * by the components which needs to manage it's interactions. It stores the physical and behavioural actions and the
 * side effects. It also has the mapping between the physical and behavioural actions and behavioural actions and side
 * effects.
 *
 * @public
 * @class
 * @namespace Muze
 */
export default class Firebolt {
    constructor (context, actions, sideEffects, behaviourEffectMap) {
        this.context = context;
        this._sideEffectDefinitions = {};
        this._sideEffects = {};
        this._propagationInf = {};
        this._actions = {
            behavioural: {},
            physical: {}
        };
        this._selectionSet = {};
        this._volatileSelectionSet = {};
        this._propagationFields = {};
        this._sourceSideEffects = {
            tooltip: true,
            selectionBox: true
        };
        this._actionBehaviourMap = {};
        this._config = {};
        this._behaviourEffectMap = {};
        this._entryExitSet = {};
        this._actionHistory = {};
        this._queuedSideEffects = [];

        this.mapSideEffects(behaviourEffectMap);
        this.registerBehaviouralActions(actions.behavioural);
        this.registerSideEffects(sideEffects);
        this.registerPhysicalBehaviouralMap(actions.physicalBehaviouralMap);
        this.registerPhysicalActions(actions.physical);
    }

    config (...config) {
        if (config.length) {
            const conf = this._config = mergeRecursive(this._config, config[0]);
            const sideEffects = this.sideEffects();
            for (const key in sideEffects) {
                if ({}.hasOwnProperty.call(sideEffects, key)) {
                    const sideEffectConf = conf[key];
                    sideEffectConf && sideEffects[key].config(sideEffectConf);
                }
            }
            return this;
        }
        return this._config;
    }

    mapSideEffects (behEffectMap) {
        const behaviourEffectMap = this._behaviourEffectMap;
        for (const key in behEffectMap) {
            if ({}.hasOwnProperty.call(behEffectMap, key)) {
                const sideEffects = behEffectMap[key] || [];
                !behaviourEffectMap[key] && (behaviourEffectMap[key] = []);
                this._behaviourEffectMap[key] = [...new Set([...behaviourEffectMap[key], ...sideEffects])];
            }
        }
        return this;
    }

    registerBehaviouralActions (actions) {
        const behaviours = initializeBehaviouralActions(this, actions);
        this.prepareSelectionSets(behaviours);
        Object.assign(this._actions.behavioural, behaviours);
        return this;
    }

    prepareSelectionSets () {
        return this;
    }

    registerSideEffects (sideEffects) {
        for (const key in sideEffects) {
            this._sideEffectDefinitions[sideEffects[key].formalName()] = sideEffects[key];
        }
        return this;
    }

    applySideEffects (sideEffects, selectionSet, payload) {
        const sideEffectStore = this.sideEffects();
        const actionHistory = this._actionHistory;
        const queuedSideEffects = [];
        sideEffects.forEach((sideEffect) => {
            let options;
            let name;
            const effects = sideEffect.effects;
            const behaviours = sideEffect.behaviours;
            const combinedSet = unionSets(this, behaviours, selectionSet);
            effects.forEach((effect) => {
                if (typeof effect === 'object') {
                    name = effect.name;
                    options = effect.options;
                } else {
                    name = effect;
                }

                const sideEffectInstance = sideEffectStore[name];
                if (sideEffectInstance.isEnabled()) {
                    if (!sideEffectInstance.constructor.mutates() &&
                        Object.values(actionHistory).some(d => d.isMutableAction)) {
                        queuedSideEffects.push({
                            name,
                            params: [combinedSet, payload, options]
                        });
                    } else {
                        this.dispatchSideEffect(name, combinedSet, payload, options);
                    }
                }
            });
        });
        this._queuedSideEffects.push(...queuedSideEffects);
        return this;
    }

    dispatchSideEffect (name, selectionSet, payload, options = {}) {
        const sideEffectStore = this.sideEffects();
        const sideEffect = sideEffectStore[name];
        let disable = false;
        if (options.filter && options.filter(sideEffect)) {
            disable = true;
        }
        !disable && sideEffectStore[name].apply(selectionSet, payload, options);
    }

    dispatchBehaviour (behaviour, payload, propagationInfo = {}) {
        const propagate = propagationInfo.propagate !== undefined ? propagationInfo.propagate : true;
        const behaviouralActions = this._actions.behavioural;
        const action = behaviouralActions[behaviour];
        const behaviourEffectMap = this._behaviourEffectMap;
        const sideEffects = getSideEffects(behaviour, behaviourEffectMap);
        this._propagationInf = propagationInfo;
        if (action && action.isEnabled()) {
            const selectionSet = action.dispatch(payload);
            const propagationSelectionSet = this.getPropagationSelectionSet(selectionSet);
            this._entryExitSet[behaviour] = propagationSelectionSet;
            const shouldApplySideEffects = this.shouldApplySideEffects(propagate);

            if (propagate) {
                this.propagate(behaviour, payload, selectionSet.find(d => d.sourceSelectionSet), sideEffects);
            }
            if (shouldApplySideEffects) {
                const applicableSideEffects = this.getApplicableSideEffects(sideEffects, payload, propagationInfo);
                this.applySideEffects(applicableSideEffects, propagationSelectionSet, payload);
            }
        }

        return this;
    }

    getPropagationSelectionSet (selectionSet) {
        return selectionSet.find(d => !d.sourceSelectionSet);
    }

    shouldApplySideEffects () {
        return true;
    }

    propagate () {
        return this;
    }

    sideEffects (...sideEffects) {
        if (sideEffects.length) {
            this._sideEffects = sideEffects[0];
            return this;
        }
        return this._sideEffects;
    }

    enableSideEffects (fn) {
        changeSideEffectAvailability(this, fn, true);
        return this;
    }

    disableSideEffects (fn) {
        changeSideEffectAvailability(this, fn, false);
        return this;
    }

    dissociateBehaviour (behaviour, physicalAction) {
        const actionBehaviourMap = this._actionBehaviourMap;
        for (const key in actionBehaviourMap) {
            if (key === physicalAction) {
                const behaviourMap = actionBehaviourMap[key];
                behaviourMap.behaviours = behaviourMap.behaviours.filter(d => d !== behaviour);
            }
        }

        return this;
    }

    dissociateSideEffect (sideEffect, behaviour) {
        const behaviourEffectMap = this._behaviourEffectMap;
        behaviourEffectMap[behaviour] = behaviourEffectMap[behaviour].filter(d => (d.name || d) !== sideEffect);
        return this;
    }

    getApplicableSideEffects (sideEffects) {
        return sideEffects;
    }

    attachPropagationListener (dataModel) {
        dataModel.unsubscribe('propagation');
        dataModel.on('propagation', this.onDataModelPropagation());
        return this;
    }

    onDataModelPropagation () {
        return (propValue) => {
            const payload = propValue.payload;
            const action = payload.action;

            this.dispatchBehaviour(action, payload, {
                propagate: false
            });
        };
    }

    createSelectionSet (uniqueIds, behaviouralActions) {
        const behaviours = behaviouralActions || this._actions.behavioural;
        const selectionSet = this._selectionSet;
        const volatileSelectionSet = this._volatileSelectionSet;

        for (const key in behaviours) {
            if ({}.hasOwnProperty.call(behaviours, key)) {
                selectionSet[key] = new SelectionSet(uniqueIds);
                volatileSelectionSet[key] = new SelectionSet(uniqueIds, true);
            }
        }
        this._volatileSelectionSet = volatileSelectionSet;
        this.selectionSet(selectionSet);
        return this;
    }

    selectionSet (...selectionSet) {
        if (selectionSet.length) {
            this._selectionSet = selectionSet[0];
            return this;
        }
        return this._selectionSet;
    }

    initializeSideEffects () {
        const sideEffectDefinitions = this._sideEffectDefinitions;
        this.sideEffects(initializeSideEffects(this, sideEffectDefinitions));
        return this;
    }

    registerPhysicalActions (actions) {
        const initedActions = initializePhysicalActions(this, actions);
        Object.assign(this._actions.physical, initedActions);
        return this;
    }

    /**
     * Sets the fields by which the propagation data will be prepared for any action.
     *
     * ```
     *  firebolt.propagateWith('highlight', 'Origin', 'Year');
     * ```
     *
     * @public
     *
     * @param {string} action Name of the behavioural action.
     * @param  {string} fields Field names of the propagation data model.
     *
     * @return {Firebolt} Instance of firebolt.
     */
    propagateWith (action, ...fields) {
        if (fields.length) {
            this._propagationFields[action] = fields;
            return this;
        }
        return this._propagationFields;
    }

    /**
     * Map actions and behaviours
     *
     * @return {Firebolt} Firebolt instance
     */
    mapActionsAndBehaviour () {
        const initedPhysicalActions = this._actions.physical;
        const map = this._actionBehaviourMap;

        for (const action in map) {
            if (!({}).hasOwnProperty.call(action, map)) {
                let target;
                const mapObj = map[action];
                target = mapObj.target;
                const touch = mapObj.touch;
                if (!target) {
                    target = this.context.getDefaultTargetContainer();
                }
                const bind = hasTouch() ? touch === true || touch === undefined : !touch;
                bind && this.bindActionWithBehaviour(initedPhysicalActions[action], target, mapObj.behaviours);
            }
        }
        return this;
    }

    registerPhysicalBehaviouralMap (map) {
        Object.assign(this._actionBehaviourMap, map);
        return this;
    }

    /**
     * Binds a target element with an action.
     * @param {Function} action Action method
     * @param {string} target Class name of element
     * @param {Array} behaviourList Array of behaviours
     * @return {FireBolt} Instance of firebolt
     */
    bindActionWithBehaviour (action, targets, behaviourList) {
        if (typeof (targets) === 'string') {
            targets = [targets];
        }
        targets.forEach((target) => {
            const mount = this.context.mount();
            const nodes = target.node instanceof Function ? target : selectElement(mount).selectAll(target);
            if (behaviourList.length && !nodes.empty()) {
                if (nodes instanceof Array) {
                    nodes.forEach((node) => {
                        action(selectElement(node), behaviourList);
                    });
                } else {
                    action(nodes, behaviourList);
                }
            }
        });
        return this;
    }

    getPropagationInf () {
        return this._propagationInf;
    }

    /**
     * Gets the ids of the tuples from selection criteria.
     *
     * @public
     *
     * @param {Object | Array} criteria Selection criteria
     * @param {Object} propagationInf Propagation information.
     * @param {DataModel} propagationInf.data propagation data model.
     * @param {string} propagationInf.sourceId id of the component from where the propagation was initiated.
     *
     * @return {Object} Selection data model and ids of the selected tuples.
     * ```
     *   {
     *      model: // Selection data model instance
     *      uids: // Unique ids of the selected row tuples.
     *   }
     * ```
     */
    getAddSetFromCriteria (criteria, propagationInf = {}) {
        const context = this.context;
        const filteredDataModel = propagationInf.data ? propagationInf.data :
            context.getDataModelFromIdentifiers(criteria, 'all');
        const xFields = context.fields().x || [];
        const yFields = context.fields().y || [];
        const xMeasures = xFields.every(field => field.type() === FieldType.MEASURE);
        const yMeasures = yFields.every(field => field.type() === FieldType.MEASURE);
        return {
            model: filteredDataModel,
            uids: criteria === null ? null : (propagationInf.data ? filterPropagationModel(this.getFullData(),
                propagationInf.data[0], xMeasures && yMeasures).getData().uids : filteredDataModel[0].getData().uids)
        };
    }

    /**
     * Get the instances of selection set corresponding to a particular behavioural action.
     *
     * @public
     *
     * @param {string} action Name of the behavioural action.
     *
     * @return { Array } Array of selection sets.
     */
    getSelectionSets (action) {
        const sourceId = this.context.id();
        const propagationInf = this._propagationInf || {};
        const propagationSource = propagationInf.sourceId;
        let applicableSelectionSets = [];
        if (propagationSource !== sourceId) {
            applicableSelectionSets = [this._volatileSelectionSet[action]];
        }

        if (propagationSource) {
            applicableSelectionSets.push(this.selectionSet()[action]);
        }
        return applicableSelectionSets;
    }

    getFullData () {
        return this.context.data();
    }

    resetted () {
        return this._resetted;
    }
}
