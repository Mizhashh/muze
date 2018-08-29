import {
    Store,
    mergeRecursive,
    getSmartComputedStyle,
    selectElement,
    generateGetterSetters,
    getUniqueId
} from 'muze-utils';
import { createScale } from '../scale-creator';
import { axisOrientationMap, BOTTOM, TOP } from '../enums/axis-orientation';
import { defaultConfig } from './default-config';
import { renderAxis } from '../axis-renderer';
import { DOMAIN, BAND } from '../enums/constants';
import {
    computeAxisDimensions,
    setOffset,
    registerChangeListeners,
    calculateContinousSpace
} from './helper';
import { PROPS } from './props';

export default class SimpleAxis {
    constructor (config, dependencies) {
        this._id = getUniqueId();

        this._dependencies = dependencies;
        this._mount = null;
        this._range = [];
        this._domain = [];
        this._domainLock = false;
        this._rotationLock = false;
        this._axisDimensions = {};
        this._eventList = [];

        const defCon = mergeRecursive({}, this.constructor.defaultConfig());
        const simpleConfig = mergeRecursive(defCon, config);

        const bodyElem = selectElement('body');
        const classPrefix = simpleConfig.classPrefix;
        this._tickLabelStyle = getSmartComputedStyle(bodyElem, `${classPrefix}-ticks`);
        this._axisNameStyle = getSmartComputedStyle(bodyElem, `${classPrefix}-axis-name`);
        dependencies.labelManager.setStyle(this._tickLabelStyle);
        this._minTickDistance = dependencies.labelManager.getOriSize('ww');

        generateGetterSetters(this, PROPS);
        this.store(new Store({
            domain: this.domain(),
            range: this.range(),
            config: simpleConfig,
            mount: this.mount()
        }));
        this.config(simpleConfig);

        this._scale = this.createScale(this._config);
        this._axis = this.createAxis(this._config);

        registerChangeListeners(this);
    }

    /**
     * Returns the default configuration of simple axis
     *
     * @return {Object} default configurations
     */
    static defaultConfig () {
        return defaultConfig;
    }

    setFixedBaseline () {
        return this;
    }

    scale (...params) {
        if (params.length) {
            this._scale = params[0];
            return this;
        }
        return this._scale;
    }

    axis (...params) {
        if (params.length) {
            this._axis = params[0];
            return this;
        }
        return this._axis;
    }

    domain (...domain) {
        if (domain.length) {
            this.scale().domain(domain[0]);
            this._domain = this.scale().domain();
            this.smartTicks(this.setTickConfig());
            this.store().commit(DOMAIN, this._domain);
            this.logicalSpace(null);
            return this;
        }
        return this._domain;
    }

    dependencies () {
        return this._dependencies;
    }

    createScale (config) {
        const {
            base,
            padding,
            interpolator,
            exponent
        } = config;
        const range = this.range();
        const scale = createScale({
            padding,
            interpolator,
            exponent,
            base,
            range,
            type: this.constructor.type()
        });

        return scale;
    }

    createAxis (config) {
        const {
            tickFormat,
            numberFormat,
            orientation
        } = config;
        const axisClass = axisOrientationMap[orientation];

        if (axisClass) {
            let axis = axisClass(this.scale());
            let formatter = {};

            if (tickFormat) {
                formatter = (val, ...params) => tickFormat(numberFormat(val), ...params);
            } else {
                formatter = val => numberFormat(val);
            }
            axis = axis.tickFormat(formatter);
            return axis;
        }
        return null;
    }

    setTickConfig () {
        return this;
    }

    setRotationConfig (axisTickLabels, labelWidth) {
        const { orientation } = this.config();

        if (orientation === TOP || orientation === BOTTOM) {
            const range = this.range();
            const length = Math.abs(range[0] - range[1]);
            this.config({ labels: { rotation: 0 } });
            if (length > 0 && axisTickLabels.length * (labelWidth + this._minTickDistance.width) > length) {
                this.config({ labels: { rotation: -90 } });
            }
        }
        return this;
    }

    adjustRange () {
        return this;
    }

    getScaleValue (domainVal) {
        if (domainVal === null || domainVal === undefined) {
            return undefined;
        }
        return this.scale()(domainVal);
    }

    getTickSize () {
        return this.axis().tickSize();
    }

    /**
     * Gets the space occupied by the parts of an axis
     *
     * @return {Object} object with details about sizes of the axis.
     * @memberof SimpleAxis
     */
    getAxisDimensions () {
        this.axisDimensions(computeAxisDimensions(this));
        return this.axisDimensions();
    }

    /**
     * Gets the space occupied by the axis
     *
     * @return {Object} object with details about size of the axis.
     * @memberof SimpleAxis
     */
    getLogicalSpace () {
        if (!this.logicalSpace()) {
            this.logicalSpace(calculateContinousSpace(this));
            setOffset(this);
            this.logicalSpace();
        }
        return this.logicalSpace();
    }

    /**
     * Returns the value from the domain when given a value from the range.
     *
     * @param {number} value Value from the range.
     *
     * @return {number} Value
     */
    invert (...value) {
        const values = value.map(d => this.scale().invert(d)) || [];
        return value.length === 1 ? values[0] : values;
    }

    /**
     * Gets the nearest range value from the given range values.
     *
     * @param {number} v1 Start range value
     * @param {number} v2 End range value
     *
     * @return {Array} range values
     */
    getNearestRange (v1, v2) {
        let p1;
        let p2;
        let extent;
        const {
            type
        } = this.config();
        const scale = this.scale();
        const range = scale.range();
        const reverse = range[0] > range[1];

        if (type === BAND) {
            extent = scale.invertExtent(v1, v2);
            p1 = scale(reverse ? extent[extent.length - 1] : extent[0]);
            p2 = scale(reverse ? extent[0] : extent[extent.length - 1]) + scale.bandwidth();
            return [p1, p2];
        }
        return [v1, v2];
    }

    /**
     * This method is used to assign a domain to the axis.
     *
     * @param {Array} domain the domain of the scale
     *
     * @return {SimpleAxis} Instance of simple axis.
     * @memberof SimpleAxis
     */
    updateDomainBounds (domain) {
        let currentDomain = this.domain();
        if (this.config().domain) {
            currentDomain = this.config().domain;
        } else {
            if (currentDomain.length === 0) {
                currentDomain = domain;
            }
            if (domain.length) {
                currentDomain = [Math.min(currentDomain[0], domain[0]), Math.max(currentDomain[1], domain[1])];
            }
        }

        return this.domain(currentDomain);
    }

    updateDomainCache (domain) {
        if (this._domainLock === false) {
            this.domain([]);
            this._domainLock = true;
        }
        return this.updateDomainBounds(domain || []);
    }

    getMinTickDifference () {
        return this.domain();
    }

    setTickValues () {
        const {
            tickValues
        } = this.config();

        if (tickValues) {
            tickValues instanceof Array && this.axis().tickValues(tickValues);
            return this;
        }
        return this;
    }

    /**
     * This method returns the width in pixels for one
     * unit along the axis. It is only applicable to band scale
     * and returns undefined for other scale type.
     *
     * @return {number} the width of one band along band scale axis
     * @memberof SimpleAxis
     */
    getUnitWidth () {
        return 0;
    }

    /**
     * This method returns an object that can be used to
     * reconstruct this instance.
     *
     * @return {Object} the serializable props of axis
     * @memberof SimpleAxis
     */
    serialize () {
        return {
            name: this.name,
            type: this.type,
            range: this.range(),
            config: this.config()
        };
    }

    /**
     * Returns the id of the axis.
     *
     * @return {string} Unique identifier of the axis.
     */
    get id () {
        return this._id;
    }

    registerEvent (event, fn) {
        this._eventList.push({ name: event, action: fn });
    }

    on (event, fn) {
        event = event || 'update';
        this.registerEvent(event, fn);
    }

    /**
     * This method is used to render the axis inside
     * the supplied svg container.
     *
     * @param {SVGElement} svg the svg element in which to render the path
     * @return {SimpleAxis} Instance of simple axis.
     * @memberof SimpleAxis
     */
    /* istanbul ignore next */render () {
        if (this.mount()) {
            renderAxis(this);
        }
        return this;
    }

    remove () {
        this.store().unsubscribeAll();
        selectElement(this.mount()).remove();
        return this;
    }

    unsubscribe () {
        this.store().unsubscribeAll();
        return this;
    }

    isReverse () {
        const range = this.range();
        return range[0] > range[1];
    }

    getPixelToValueRatio () {
        const scale = this.scale();
        const range = scale.range();
        const domain = scale.domain();

        return Math.abs(range[1] - range[0]) / (domain[1] - domain[0]);
    }
}

