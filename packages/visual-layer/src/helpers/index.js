import { FieldType, getDomainFromData, setStyles, easeFns, selectElement } from 'muze-utils';
import { transformFactory } from '@chartshq/transform';
import { IDENTITY, STACK, GROUP, COLOR, SHAPE, SIZE, ENCODING } from '../enums/constants';

export const getLayerColor = ({ datum, index }, { colorEncoding, colorAxis, colorFieldIndex }) => {
    let rawColor = '';
    let color = '';
    if (colorEncoding && colorEncoding.value instanceof Function) {
        color = colorEncoding.value(datum, index);
        rawColor = colorEncoding.value(datum, index);
    } else {
        rawColor = colorAxis.getRawColor(datum._data[colorFieldIndex]);
        color = colorAxis.getHslString(rawColor);
    }
    return { color, rawColor };
};

const transfromColor = (colorAxis, datum, styleType, intensity) => {
    datum.meta.stateColor[styleType] = datum.meta.stateColor[styleType] || datum.meta.originalColor;
    const fillColorInfo = colorAxis.transformColor(datum.meta.stateColor[styleType], intensity);
    datum.meta.stateColor[styleType] = fillColorInfo.hsla;

    return fillColorInfo;
};

export const applyInteractionStyle = (context, selectionSet, interactionStyles, config) => {
    const elements = context.getPlotElementsFromSet(selectionSet);
    const axes = context.axes();
    const colorAxis = axes.color;
    const apply = config.apply;
    const interactionType = config.interactionType;
    interactionStyles.forEach((style) => {
        const styleType = style.type;
        elements.style(styleType, ((d) => {
            const { colorTransform, stateColor, originalColor } = d.meta;
            colorTransform[interactionType] = colorTransform[interactionType] || {};
            if (apply && !colorTransform[interactionType][styleType]) {
                // fade selections
                colorTransform[interactionType][styleType] = style.intensity;
                const color = transfromColor(colorAxis, d, styleType, style.intensity).color;
                return color;
            }
            if (!apply && colorTransform[interactionType][styleType]) {
                 // unfade selections
                colorTransform[interactionType][styleType] = null;
                return transfromColor(colorAxis, d, styleType, style.intensity.map(e => -e)).color;
            }
            const [h, s, l, a] = stateColor[styleType] ? stateColor[styleType] : originalColor;
            return `hsla(${h * 360},${s * 100}%,${l * 100}%, ${a || 1})`;
        }));
    });
};

export const fadeUnfadeSelection = (context, selectionSet, hasFaded, interaction) => {
    const interactionConfig = { interaction, apply: hasFaded };
    applyInteractionStyle(context, selectionSet, 'fade', interactionConfig);
};

export const focusUnfocusSelection = (context, selectionSet, isFocussed, interaction) => {
    const interactionConfig = { interaction, apply: isFocussed };
    applyInteractionStyle(context, selectionSet, 'focus', interactionConfig);
};

export const getAxesScales = (axes) => {
    const [xAxis, yAxis] = [ENCODING.X, ENCODING.Y].map(e => axes[e]);
    const [xScale, yScale] = [xAxis, yAxis].map(e => e && e.scale());
    return {
        xAxis,
        yAxis,
        xScale,
        yScale
    };
};

export const getEncodingFieldInf = (encoding, fieldsConfig) => {
    const [xField, yField, x0Field, y0Field, colorField, shapeField, sizeField] =
        [ENCODING.X, ENCODING.Y, ENCODING.X0, ENCODING.Y0, COLOR, SHAPE, SIZE].map(e => encoding[e] &&
            encoding[e].field);

    const [xFieldType, yFieldType] = [xField, yField, x0Field, y0Field].map(e => fieldsConfig[e] &&
        fieldsConfig[e].def.type);

    const [xFieldSubType, yFieldSubType] = [xField, yField].map(e => fieldsConfig[e] && (fieldsConfig[e].def.subtype ||
        fieldsConfig[e].def.type));

    const [xFieldIndex, yFieldIndex, x0FieldIndex, y0FieldIndex] = [xField, yField, x0Field, y0Field]
        .map(e => fieldsConfig[e] && fieldsConfig[e].index);

    return {
        xField,
        yField,
        colorField,
        shapeField,
        sizeField,
        x0Field,
        y0Field,
        xFieldType,
        yFieldType,
        xFieldSubType,
        yFieldSubType,
        xFieldIndex,
        yFieldIndex,
        x0FieldIndex,
        y0FieldIndex
    };
};

export const getValidTransform = (layerConfig, fieldsConfig, encodingFieldInf) => {
    let transformType;
    const {
        transform
    } = layerConfig;
    const {
        xField,
        yField,
        xFieldType,
        yFieldType
    } = encodingFieldInf;
    const groupByField = transform.groupBy;
    const groupByFieldMeasure = fieldsConfig[groupByField] && fieldsConfig[groupByField].def.type === FieldType.MEASURE;
    transformType = transform.type;
    if (!xField || !yField || groupByFieldMeasure || !groupByField || xFieldType === FieldType.DIMENSION &&
        yFieldType === FieldType.DIMENSION) {
        transformType = IDENTITY;
    }
    return transformType;
};

export const transformData = (dataModel, config, transformType, encodingFieldInf) => {
    const data = dataModel.getData({ withUid: true });
    const schema = data.schema;
    const transform = config.transform;
    const {
        xField,
        yField,
        xFieldType,
        yFieldType
    } = encodingFieldInf;
    const uniqueField = xFieldType === FieldType.MEASURE ? yField : xField;

    return transformFactory(transformType)(schema, data.data, {
        groupBy: transform.groupBy,
        uniqueField,
        sort: transform.sort || 'none',
        offset: transform.offset,
        value: yFieldType === FieldType.MEASURE ? yField : xField
    }, data.uids);
};

/**
 * This method resolves the x, y, x0 and y0 values from the transformed data.
 * It also checks the type of transformed data for example, if it is a stacked data
 * then it fetches the y and y0 values from the stacked data.
 *
 * @param {Array.<Array>} transformedData transformed data
 * @param {Object} fieldsConfig field definitions
 * @param {Object} encodingFieldInf Encoding field names and types.
 * @param {string} transformType type of transformed data - stack, group or identity.
 *
 * @return {Array.<Object>} Normalized data
*/
export const getNormalizedData = (transformedData, fieldsConfig, encodingFieldInf, transformType) => {
    const transformedDataArr = transformType === IDENTITY ? [transformedData] : transformedData;
    const {
        xFieldType,
        xFieldIndex,
        yFieldIndex,
        x0FieldIndex,
        y0FieldIndex
    } = encodingFieldInf;
    const fieldsLen = Object.keys(fieldsConfig).length;
    /**
     * Returns normalized data from transformed data. It recursively traverses through
     * the transformed data if there it is nested.
     */
    return transformedDataArr.map((data) => {
        const values = transformType === GROUP ? data.values : data;
        return values.map((d) => {
            let pointObj = {};
            let tuple;
            if (transformType === STACK) {
                tuple = d.data || [];
                let y;
                let y0;
                let x;
                let x0;
                if (d[1] >= d[0]) {
                    y = x0 = d[1];
                    x = y0 = d[0];
                } else {
                    y = x0 = d[0];
                    x = y0 = d[1];
                }

                pointObj = xFieldType === FieldType.MEASURE ? {
                    x,
                    x0,
                    y: tuple[yFieldIndex],
                    y0: tuple[yFieldIndex]
                } : {
                    x: tuple[xFieldIndex],
                    x0: tuple[xFieldIndex],
                    y,
                    y0
                };
                pointObj._data = tuple;
                pointObj._id = tuple[fieldsLen];
            } else {
                pointObj = {
                    x: d[xFieldIndex],
                    y: d[yFieldIndex],
                    x0: d[x0FieldIndex],
                    y0: d[y0FieldIndex]
                };
                pointObj._data = d;
                pointObj._id = d[fieldsLen];
            }
            return pointObj;
        });
    });
};

export const calculateDomainFromData = (data, encodingFieldInf, transformType) => {
    const {
        xFieldSubType,
        yFieldSubType,
        xField,
        yField,
        x0Field,
        y0Field
    } = encodingFieldInf;
    const domains = {};
    const yEnc = ENCODING.Y;
    const xEnc = ENCODING.X;
    if (xField) {
        domains.x = getDomainFromData(data, x0Field || transformType === STACK ? [xEnc, ENCODING.X0] : [xEnc, xEnc],
            xFieldSubType);
    }
    if (yField) {
        domains.y = getDomainFromData(data, y0Field || transformType === STACK ? [ENCODING.Y0, ENCODING.Y] :
            [yEnc, yEnc], yFieldSubType);
    }

    return domains;
};

export const attachDataToVoronoi = (voronoi, points) => {
    voronoi.data([].concat(...points).filter(d => d._id !== undefined).map((d) => {
        const point = d.update;
        return {
            x: point.x,
            y: point.y,
            data: d
        };
    }));
};

export const updateStyle = (target, styles, remove) => {
    for (const key in styles) {
        if ({}.hasOwnProperty.call(styles, key)) {
            target.style(key, remove ? null : styles[key]);
        }
    }
};

export const animateGroup = (mount, context) => {
    let groupTransition;
    let update;
    const { transition, groupAnimateStyle } = context;
    const { duration, effect, disabled } = transition;
    if (groupAnimateStyle) {
        setStyles(mount.node(), groupAnimateStyle.enter);
        update = groupAnimateStyle.update;
        if (!disabled) {
            groupTransition = mount.transition()
                .ease(easeFns[effect])
                .duration(duration)
                .on('end', function () {
                    updateStyle(selectElement(this), update, true);
                });
        } else {
            groupTransition = mount;
        }
        updateStyle(groupTransition, update);
    }
};

export const positionPoints = (context, points) => {
    const positioner = context.encodingTransform();
    if (positioner) {
        return positioner(points, context, { smartLabel: context._dependencies.smartLabel });
    }
    return points;
};
