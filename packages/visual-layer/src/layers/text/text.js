import {
    getQualifiedClassName,
    selectElement,
    setStyles,
    createElements
} from 'muze-utils';
import { BaseLayer } from '../../base-layer';
import drawText from './renderer';
import { defaultConfig } from './default-config';
import { getLayerColor, positionPoints } from '../../helpers';
import { TEXT_ANCHOR_MIDDLE, ENCODING } from '../../enums/constants';
import * as PROPS from '../../enums/props';

import './styles.scss';

/**
 * Text Layer creates labels. It needs to be passed a data table, axes and configuration
 * of the layer.
 *
 * Example :-
 * const textLayer = layerFactory.getLayer('text', [dataModel, axes, config]);
 * textLayer.render(container);
 * @class
 */
export default class TextLayer extends BaseLayer {
    /**
     * Returns the default configuration of the text layer.
     *
     * @return {Object} Default configuration of the text layer
     */
    static defaultConfig () {
        return defaultConfig;
    }

    static formalName () {
        return 'text';
    }

    elemType () {
        return 'text';
    }

    /**
     * Generates an array of objects containing x, y, width and height of the points from the data.
     *
     * @param  {Array.<Array>} data Normalized data array.
     * @param  {Object} encoding Encoding information.
     * @param  {Object} axes Instances of axis.
     *
     * @return {Array.<Object>}  Array of points
     */
    translatePoints (data, encoding, axes) {
        let points;
        const colorAxis = axes.color;
        const textEncoding = encoding.text;
        const { field: textField, value, formatter: textFormatter } = textEncoding;
        const colorEncoding = encoding.color;
        const colorField = colorEncoding && colorEncoding.field;
        const fieldsConfig = this.data().getFieldsConfig();
        const backgroundField = encoding.background.field;
        const backgroundFieldIndex = backgroundField ? fieldsConfig[backgroundField].index : -1;
        const colorFieldIndex = colorField ? fieldsConfig[colorField].index : -1;
        const textFieldIndex = textField ? fieldsConfig[textField] && fieldsConfig[textField].index : -1;
        const xEnc = ENCODING.X;
        const yEnc = ENCODING.Y;

        points = data.map((d, i) => {
            const row = d._data;
            const textValue = textField ? row[textFieldIndex] : value;

            const [xPx, yPx] = [xEnc, yEnc].map(type => (axes[type] ? axes[type].getScaleValue(d[type]) +
                    axes[type].getUnitWidth() / 2 : 0));

            const { color, rawColor } = getLayerColor({ datum: d, index: i },
                { colorEncoding, colorAxis, colorFieldIndex });

            return {
                enter: {},
                update: {
                    x: xPx,
                    y: yPx
                },
                text: textFormatter ? textFormatter(textValue) : textValue,
                color,
                background: colorAxis.getColor(d._data[backgroundFieldIndex]),
                meta: {
                    stateColor: {},
                    originalColor: rawColor,
                    colorTransform: {}
                },
                _data: row,
                _id: d._id,
                source: d._data,
                rowId: d._id
            };
        });
        points = positionPoints(this, points);

        return points;
    }

    /**
     * Renders the plot in the given container.
     *
     * @param  {SVGElement} container SVGElement which will hold the plot.
     *
     * @return {textLayer} Instance of text layer
     */
    render (container) {
        let points;
        const config = this.config();
        const encoding = config.encoding;
        const normalizedData = this._store.get(PROPS.NORMALIZED_DATA);
        const className = config.className;
        const backgroundPadding = encoding.background.padding;
        const backgroundEnabled = encoding.background.enabled || encoding.background.field;
        const qualifiedClassName = getQualifiedClassName(config.defClassName, this.id(), config.classPrefix);
        const axes = this.axes();
        const containerSelection = selectElement(container);

        containerSelection.classed(`${qualifiedClassName.join(' ')} ${className}`, true);
        createElements({
            data: normalizedData,
            append: 'g',
            selector: 'g',
            container,
            each: (dataArr, group, i) => {
                const node = group.node();
                points = this.translatePoints(dataArr, encoding, axes, i);
                setStyles(node, {
                    'text-anchor': TEXT_ANCHOR_MIDDLE
                });
                drawText(node, points, {
                    className: qualifiedClassName[0],
                    backgroundPadding,
                    backgroundEnabled
                }, this._dependencies.smartLabel);
            }
        });
        return this;
    }
}
