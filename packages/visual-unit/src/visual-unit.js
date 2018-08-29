import { layerFactory } from '@chartshq/visual-layer';
import {
    setAttrs,
    CommonProps,
    getUniqueId,
    getQualifiedClassName,
    selectElement,
    transactor,
    Store,
    makeElement,
    registerListeners,
    generateGetterSetters,
    getDataModelFromIdentifiers,
    isSimpleObject,
    transposeArray,
    FieldType
} from 'muze-utils';
import { physicalActions, sideEffects, behaviouralActions, behaviourEffectMap } from '@chartshq/muze-firebolt';
import { actionBehaviourMap } from './firebolt/action-behaviour-map';
import {
    renderLayers,
    getNearestDimensionalValue,
    removeLayersBy,
    getLayersBy,
    getLayerFromDef,
    attachAxisToLayers,
    getLayerAxisIndex,
    createSideEffectGroup,
    getAdjustedDomain
} from './helper';
import { renderGridLineLayers } from './helper/grid-lines';
import localOptions from './local-options';
import { listenerMap } from './listener-map';
import {
    primaryYAxisUpdated,
    primaryXAxisUpdated,
    secondaryXAxisUpdated,
    secondaryYAxisUpdated,
    DATADOMAIN,
    TIMEDIFFS
} from './enums/reactive-props';
import { PROPS } from './props';
import UnitFireBolt from './firebolt';
import './styles.scss';

const FORMAL_NAME = 'unit';

/**
 * @module VisualUnit
 * A hierarchical component of renderer which manages multiple layers. This logical
 * module is responsible for layouting layers, attach axis with them, resolving conflicts of layers.
 */

/**
 * Basic unit implementaiton
 * @class VisualUnit
 */
export default class VisualUnit {

    /**
     * Creates instance of visualization unit
     * @param registry {Object} Component registry
     * @param dependencies {Object} Dependencies required by visual unit.
     */
    constructor (registry, dependencies) {
        this._id = getUniqueId();
        this._dependencies = dependencies;
        this._layerDeps = {
            throwback: new Store({
                onlayerdraw: false
            }),
            smartLabel: dependencies.smartLabel
        };
        this._renderedResolve = null;
        this._renderedPromise = new Promise((resolve) => {
            this._renderedResolve = resolve;
        });
        this._layerDeps.throwback.registerChangeListener([CommonProps.ON_LAYER_DRAW], () => {
            this._renderedResolve();
            this._lifeCycleManager.notify({ client: this.layers(), action: 'drawn', formalName: 'layer' });
        });

        this._lifeCycleManager = dependencies.lifeCycleManager;
        this._layersMap = {};
        this._gridlines = [];
        this._gridbands = [];
        this._layerAxisIndex = {};
        this._transformedDataModels = {};

        layerFactory.setLayerRegistry(registry.layerRegistry);
        generateGetterSetters(this, PROPS);
        this.cachedData([]);
        this.store(new Store({
            [primaryXAxisUpdated]: null,
            [primaryYAxisUpdated]: null,
            [secondaryXAxisUpdated]: null,
            [secondaryYAxisUpdated]: null
        }));
        transactor(this, localOptions, this.store().model);
        this.firebolt(new UnitFireBolt(this, {
            physical: physicalActions,
            behavioural: behaviouralActions,
            physicalBehaviouralMap: actionBehaviourMap
        }, sideEffects, behaviourEffectMap));
        registerListeners(this, listenerMap);
    }

    static formalName () {
        return FORMAL_NAME;
    }

    /**
     * Static helper for creates a unit instance
     *
     * @param {Object} [id] optional unique identifier for a unit; , id is calculated internally
     * @param {DataModel} data instance of datamodel
     * @param {Array.<Layer>} layers layer configuration
     * @param {Object} config configurtion for the visual unit
     * @return {VisualUnit} Instance of a unit
     */
    static create (...params) {
        return new this(...params);
    }

    firebolt (...firebolt) {
        if (firebolt.length) {
            this._firebolt = firebolt[0];
            return this;
        }
        return this._firebolt;
    }

    /**
     * Gets the domain for all axes of this visual unit.
     * @return {Object} Domains of each data field.
     */
    getDataDomain () {
        return this.store().get(DATADOMAIN);
    }

    /**
     * Retrieves the id created for this instance of visual unit
     * @return {string} id associated with the instance
     */
    id () {
        return this._id;
    }

    lockModel () {
        this._store.model.lock();
        return this;
    }

    unlockModel () {
        this._store.model.unlock();
        return this;
    }

    /**
     * Renders the visual unit. It creates the layout and renders the axes and layers.
     *
     * @return {VisualUnit} Instance of visual unit.
     */
    render (container) {
        const config = this.config();
        const { className, defClassName, sideEffectClassName, classPrefix } = config;
        const qualifiedClassName = getQualifiedClassName(defClassName, this.id(), config.classPrefix);
        const width = this.width();
        const height = this.height();
        const containerSelection = selectElement(container).style('position', 'relative');

        this._rootSvg = makeElement(containerSelection, 'svg', [null], className)
                        .style('width', `${width}px`).style('height', `${height}px`);

        const node = this._rootSvg.node();
        setAttrs(node, {
            width,
            height,
            class: qualifiedClassName.join(' ')
        });
        renderGridLineLayers(this, node);
        renderLayers(this, node, this.layers(), {
            width,
            height
        });
        this._sideEffectGroup = createSideEffectGroup(node, `${classPrefix}-${sideEffectClassName}`);
        return this;
    }

    done () {
        return this._renderedPromise;
    }

    enableCaching () {
        this._cache = true;
        return this;
    }

    clearCaching () {
        this._cache = false;
        this.cachedData([this.cachedData()[0]]);
        return this;
    }

    getDrawingContext () {
        const rootSvg = this._rootSvg && this._rootSvg.node();
        const width = this.width();
        const height = this.height();
        return {
            htmlContainer: this.mount(),
            svgContainer: rootSvg,
            width,
            height,
            sideEffectGroup: this._sideEffectGroup,
            parentContainer: this.parentContainer(),
            xOffset: 0,
            yOffset: 0
        };
    }

    /**
     * Returns the serialized configuration of visual unit.
     * @return {Object} serialized configuration
     */
    serialize () {
        return {
            layers: this.layers().map(layer => layer.serialize()),
            config: this.config(),
            axes: this.store().get('axes').map(axis => axis.serialize())
        };
    }

    addLayer (layerDef) {
        const layerName = layerDef.name;
        const layer = this.getLayerByName(layerName);
        const measurement = {
            width: this.width(),
            height: this.height()
        };

        if (layer) {
            return [layer];
        }
        const serializedDef = layerFactory.getSerializedConf(layerDef.mark, layerDef);
        const instances = Object.values(getLayerFromDef(this, serializedDef));
        this.layers().push(...instances);
        const layerAxisIndex = getLayerAxisIndex(instances, this.fields());
        this._layerAxisIndex = Object.assign(this._layerAxisIndex, layerAxisIndex);
        attachAxisToLayers(this.axes(), instances, layerAxisIndex);
        this.layers().forEach((lyr) => {
            lyr.measurement(measurement);
            lyr.dataProps({
                timeDiffs: this.store().get(TIMEDIFFS)
            });
        });
        return instances;
    }

    remove () {
        const lifeCycleManager = this._dependencies.lifeCycleManager;
        lifeCycleManager.notify({ client: this, action: 'beforeremove', formalName: 'unit' });
        this.store().unsubscribeAll();
        selectElement(this.mount()).remove();
        this.firebolt().remove();
        // Remove layers
        lifeCycleManager.notify({ client: this.layers(), action: 'beforeremove', formalName: 'layer' });
        this.layers().forEach(layer => layer.remove());
        lifeCycleManager.notify({ client: this.layers(), action: 'removed', formalName: 'layer' });
        lifeCycleManager.notify({ client: this, action: 'removed', formalName: 'unit' });
        return this;
    }

    getDataModelFromIdentifiers (identifiers, mode, parentModel) {
        if (identifiers === null) {
            return null;
        }
        const dataModel = parentModel || this.data();
        return getDataModelFromIdentifiers(dataModel, identifiers, mode);
    }

    resetData () {
        this.data(this.cachedData()[0]);
        return this;
    }

    getSourceInfo () {
        return {
            dimensionMeasureMap: this._dimensionMeasureMap,
            fields: this.fields(),
            data: this.data(),
            axes: this.axes()
        };
    }

    getDefaultTargetContainer () {
        const { classPrefix, defClassName, arcLayerClassName } = this.config();
        return [`.${classPrefix}-${defClassName}`, `.${classPrefix}-${arcLayerClassName} path`];
    }

    getLayersByType (type) {
        const layers = getLayersBy(this.layers(), 'type', type);
        return layers;
    }

    getLayerByName (name) {
        const layers = getLayersBy(this.layers(), 'name', name);
        return layers[0];
    }

    updateAxisDomain (domain) {
        ['x', 'y'].forEach((type) => {
            const axes = this.axes()[type];
            let min = [];
            let max = [];
            let dom;

            axes && axes.forEach((axis, i) => {
                const field = this.fields()[type][i];
                dom = domain[`${this.fields()[type][i]}`];

                if (field.type() !== FieldType.DIMENSION && dom) {
                    min[i] = dom[0];
                    max[i] = dom[1];
                }
            });

            if (axes) {
                if (axes.length > 1) {
                    const axisConf = axes[0].config();
                    if (axes[0].constructor.type() === 'linear') {
                        if (axisConf.alignZeroLine) {
                            axes.forEach(axis => axis.config({
                                nice: false
                            }));
                            const adjustedDomain = getAdjustedDomain(max, min);
                            min = adjustedDomain.min;
                            max = adjustedDomain.max;
                        }

                        axes[0].updateDomainCache([min[0], max[0]]);
                        axes[1].updateDomainCache([min[1], max[1]]);
                    } else {
                        axes[0].updateDomainCache(dom);
                        axes[1].updateDomainCache(dom);
                    }
                } else {
                    axes[0].updateDomainCache(dom);
                }
            }
        });
        return this;
    }

    /**
     * Finds the nearest point closest to the x and y position.
     * @param {number} x x position.
     * @param {number} y y position.
     * @return {Object} Nearest point.
     */
    getNearestPoint (x, y, args) {
        let pointObj = {
            id: null
        };
        const dimValue = getNearestDimensionalValue(this, {
            x,
            y
        });

        if (dimValue !== null && args.getAllPoints) {
            pointObj.id = dimValue;
            const pointInf = this.getMarkInfFromLayers(x, y, args);
            pointObj.target = pointInf && pointInf.id ? pointInf.id : pointObj.id;
            return pointObj;
        }

        const markInf = this.getMarkInfFromLayers(x, y, args) || { id: null };
        pointObj = Object.assign({}, markInf);

        pointObj.target = markInf.id;
        return pointObj;
    }

    getMarkInfFromLayers (x, y, args) {
        let point = null;
        const layers = this.layers();
        const len = layers.length;

        // Iterate through the layers array and fetch the nearest point from each layer. If a valid
        // nearest point is found from any layer, then return that point.
        for (let i = 0; i < len; i++) {
            const layer = layers[i];
            const config = layer.config();
            if (config.interactive !== false) {
                point = layer.getNearestPoint(x, y, args);
            }
            if (point) {
                return point;
            }
        }
        return point;
    }

    getPlotPointsFromIdentifiers (identifiers, config = {}) {
        let points = [];
        let parsedIdentifiers = identifiers;
        if (identifiers === null) {
            return [];
        }
        const layers = this.layers();
        const len = layers.length;
        if (isSimpleObject(identifiers)) {
            parsedIdentifiers = [Object.keys(identifiers)];
            parsedIdentifiers = [...parsedIdentifiers, ...transposeArray(Object.values(identifiers))];
        }
        for (let i = 0; i < len; i++) {
            const layer = layers[i];
            if (layer.config().interactive !== false) {
                points = [...points, ...layer.getPointsFromIdentifiers(parsedIdentifiers, config)];
            }
        }
        return points;
    }

    removeLayerByName (name) {
        removeLayersBy('name', name);
        return this;
    }

    removeLayersByType (type) {
        removeLayersBy('type', type);
        return this;
    }

    parentContainer (...container) {
        if (container.length) {
            this._parentContainer = container[0];

            return this;
        }
        return this._parentContainer;
    }
}
