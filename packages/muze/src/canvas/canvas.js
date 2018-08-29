import { GridLayout } from '@chartshq/layout';
import { transactor, Store, getUniqueId } from 'muze-utils';
import { RETINAL } from '../constants';
import TransactionSupport from '../transaction-support';
import { getRenderDetails, prepareLayout } from './layout-maker';
import { localOptions, canvasOptions } from './local-options';
import { renderComponents } from './renderer';
import GroupFireBolt from './firebolt';
import options from '../options';
import { initCanvas, setupChangeListener } from './helper';

/**
 * This is the primary class which manages highlevel components like visualGroup, Titles, Legend, Extensions
 * (in future). Global level Muze functionality is subset this. Every time user works with an instance of
 * canvas in dom which provides instance level settings.
 *
 */
export default class Canvas extends TransactionSupport {
    constructor (globalDependencies) {
        super();

        this._allOptions = Object.assign({}, options, localOptions);
        this._registry = {};
        this._composition = {};
        this._cachedProps = {};
        this._alias = null;
        this._renderedResolve = null;
        this._renderedPromise = new Promise((resolve) => {
            this._renderedResolve = resolve;
        });
        this._composition.layout = new GridLayout();
        this._store = new Store({});

        this.firebolt(new GroupFireBolt(this));

        // Setters and getters will be mounted on this. The object will be mutated.
        const [, store] = transactor(this, options, this._store.model);
        transactor(this, localOptions, store);
        transactor(this, canvasOptions, store);
        this.dependencies(Object.assign({}, globalDependencies, this._dependencies));
        this.alias(`canvas-${getUniqueId()}`);
        this.title('', {});
        this.subtitle('', {});
        this.legend({});
        this.color({});
        this.shape({});
        this.size({});
        setupChangeListener(this);
    }

    layout (...params) {
        if (params.length) {
            return this;
        }
        return this.composition().layout;
    }

    composition (...params) {
        if (params.length) {
            return this;
        }
        return this._composition;
    }

    done () {
        return this._renderedPromise;
    }

    alias (...params) {
        if (params.length) {
            const visualGroup = this.composition().visualGroup;
            this._alias = params[0];
            visualGroup && visualGroup.alias(this.alias());
            return this;
        }
        return this._alias;
    }

    /**
     * Creates an instance initiated with given settings.
     *
     * @param {Object} initialSettings Initial settings to be populated in the model
     * @param {Object} regEntry newly created instance with the initial settings
     * @param {Object} globalDependencies dependencies which will be created only once in the page
     *
     * @return {Canvas} newly created canvas instance with the initial settings
     */
    static withSettings (initialSettings, regEntry, globalDependencies) {
        const instance = new Canvas(globalDependencies);

        for (const key in initialSettings) {
            instance[key](initialSettings[key]);
        }
        // set registry for instance
        instance.registry(regEntry);
        return instance;
    }

    static formalName () {
        return 'canvas';
    }

    firebolt (...firebolt) {
        if (firebolt.length) {
            this._firebolt = firebolt[0];
            return this;
        }
        return this._firebolt;
    }

    registry (...params) {
        if (params.length) {
            const components = Object.assign({}, params[0].components);
            const componentSubRegistry = Object.assign({}, params[0].componentSubRegistry);

            this._registry = { components, componentSubRegistry };
            const initedComponents = initCanvas(this);
            // @todo is it okay to continue this tight behaviour? If not use a resolver to resolve diff component type.
            this._composition.visualGroup = initedComponents[0];

            this.composition().visualGroup.alias(this.alias());
            return this;
        }
        return this._registry;
    }

    /*
     * Prepare dependencies for top level elements
     */
    dependencies (...param) {
        if (param.length) {
            this._dependencies = param[0];
            return this;
        }
        // @todo prepare dependencies here.
        return this._dependencies;
    }

    lifeCycle (lifeCycles) {
        const lifeCycleManager = this.dependencies().lifeCycleManager;
        if (lifeCycles) {
            lifeCycleManager.register(lifeCycles);
            return this;
        }
        return lifeCycleManager;
    }

    legend (...params) {
        if (params.length) {
            return this;
        }
        return this.composition().legend;
    }

    once (eventName) {
        const lifeCycleManager = this.dependencies().lifeCycleManager;
        return lifeCycleManager.retrieve(eventName);
    }

    /**
     * Internal function to trigger render, this method is cognizant of all the properties of the core modules and
     * establish a passive reactivity. Passive reactivity is not always a bad thing :)
     *
     * @private
     *
     * @return {Canvas} Instance of canvas.
     */
    render () {
        const mount = this.mount();
        const visGroup = this.composition().visualGroup;
        const lifeCycleManager = this.dependencies().lifeCycleManager;
        // Get render details including arrangement and measurement
        const { components, layoutConfig, measurement } = getRenderDetails(this, mount);

        lifeCycleManager.notify({ client: this, action: 'beforedraw' });
        // Prepare the layout by triggering the matrix calculation
        prepareLayout(this.layout(), components, layoutConfig, measurement);
        // Render each component
        renderComponents(this, components, layoutConfig, measurement);
        // Update life cycle
        lifeCycleManager.notify({ client: this, action: 'drawn' });
        const promises = [];
        visGroup.matrixInstance().value.each((el) => {
            promises.push(el.valueOf().done());
        });
        Promise.all(promises).then(() => {
            this._renderedResolve();
        });
        return this;
    }

    xAxes () {
        return this.composition().visualGroup.getAxes('x');
    }

    yAxes () {
        return this.composition().visualGroup.getAxes('y');
    }

    getRetinalAxes () {
        const visualGroup = this.composition().visualGroup;
        return visualGroup.getAxes(RETINAL);
    }
}
