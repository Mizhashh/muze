import { TOP, LEFT, BOTTOM } from '../enums/axis-orientation';
import { LOG } from '../enums/scale-type';

export const getNumberOfTicks = (availableSpace, labelDim, axis, axisInstance) => {
    const ticks = axis.scale().ticks();
    const { numberOfTicks } = axisInstance.config();
    const tickLength = ticks.length;
    let numberOfValues = tickLength;

    if (tickLength * (labelDim * 1.5) > availableSpace) {
        numberOfValues = Math.floor(availableSpace / (labelDim * 1.5));
    }

    numberOfValues = Math.min(numberOfTicks, Math.max(1, numberOfValues));
    return axis.scale().ticks(numberOfValues);
};

export const sanitizeDomain = (domain, context) => {
    const interpolator = context.config().interpolator;
    // @todo: Get from scale decorator
    if (interpolator === LOG && domain[0] >= 0) {
        return [Math.max(1, domain[0]), Math.max(1, domain[1])];
    }
    return domain;
};

export const getTickLabelInfo = (context) => {
    let largestLabel = '';
    let labelProps;
    let smartTick = {};
    let axisTickLabels;
    const scale = context.scale();
    const allLabelLengths = [];
    const { tickFormat, tickValues, numberFormat } = context.config();
    const labelFunc = scale.ticks || scale.quantile || scale.domain;
    // set the style on the shared label manager instance
    const { labelManager } = context.dependencies();

    labelManager.setStyle(context._tickLabelStyle);
    // get the values along the domain

    axisTickLabels = tickValues || labelFunc();
    // Get the tick labels
    axisTickLabels = axisTickLabels.map((originalLabel, i) => {
        const formattedLabel = numberFormat(originalLabel);

        //  get formats of tick if any
        const label = tickFormat ? tickFormat(formattedLabel) : (scale.tickFormat ?
            numberFormat(scale.tickFormat()(originalLabel)) : formattedLabel);

        // convert to string for quant values
        const temp = label.toString();
        // Get spaces for all labels
        allLabelLengths.push(labelManager.getOriSize(temp));
        // Getting largest label
        if (temp.length > largestLabel.length) {
            largestLabel = temp;
            smartTick = context.smartTicks() ? context.smartTicks()[i] : {};
            labelProps = allLabelLengths[i];
        }
        return label;
    });

    labelProps = labelManager.getOriSize(largestLabel);

    return { largestLabel, largestLabelDim: labelProps, axisTickLabels, allLabelLengths, smartTick };
};

export const computeAxisDimensions = (context) => {
    let tickLabelDim = {};
    const {
        name,
        labels,
        tickValues
    } = context.config();
    const angle = ((labels.smartTicks) ? 0 : labels.rotation) * Math.PI / 180;
    const { labelManager } = context.dependencies();
    const {
        largestLabelDim,
        axisTickLabels,
        smartTick
    } = getTickLabelInfo(context);
    const { height: labelHeight, width: labelWidth } = largestLabelDim;
    // get the domain of axis
    const domain = context.domain();

    if (domain.length === 0) {
        return null;
    }
    if (context._rotationLock === false) {
        context.setRotationConfig(tickValues || axisTickLabels, largestLabelDim.width);
        context._rotationLock = false;
    }
    if (labels.smartTicks) {
        tickLabelDim = smartTick;
    } else {
        tickLabelDim = {
            width: Math.abs(labelHeight * Math.sin(angle)) + Math.abs(labelWidth * Math.cos(angle)),
            height: Math.abs(labelWidth * Math.sin(angle)) + Math.abs(labelHeight * Math.cos(angle))
        };
    }

    labelManager.setStyle(context._axisNameStyle);
    return {
        tickSize: context.getTickSize(),
        tickLabelDim,
        axisLabelDim: labelManager.getOriSize(name),
        largestLabelDim,
        axisTickLabels
    };
};

export const setOffset = (context) => {
    let x = 0;
    let y = 0;
    const logicalSpace = context.logicalSpace();
    const config = context.config();
    const {
        orientation,
        xOffset,
        yOffset
    } = config;
    if (orientation === LEFT) {
        x = xOffset === undefined ? logicalSpace.width : xOffset;
    }
    if (orientation === TOP) {
        y = yOffset === undefined ? logicalSpace.height : yOffset;
    }
    context.config({ xOffset: x, yOffset: y });
};

const getAxisOffset = (timeDiff, range, domain) => {
    const pvr = Math.abs(range[1] - range[0]) / (domain[1] - domain[0]);
    const width = (pvr * timeDiff);
    const avWidth = (range[1] - range[0]);
    const bars = avWidth / width;
    const barWidth = avWidth / (bars + 1);
    const diff = avWidth - barWidth * bars;

    return diff / 2;
};

export const adjustRange = (minDiff, range, domain, orientation) => {
    const diff = getAxisOffset(minDiff, range, domain);

    if (orientation === TOP || orientation === BOTTOM) {
        range[0] += diff;
        range[1] -= diff;
    } else {
        range[0] -= diff;
        range[1] += diff;
    }
    return range;
};

export const registerChangeListeners = (context) => {
    const store = context.store();

    store.model.next(['domain', 'range', 'mount', 'config'], (...params) => {
        context.render();
        context._domainLock = false;
        context._eventList.forEach((e) => {
            e.action instanceof Function && e.action(...params);
        });
    }, true);
    return context;
};

export const getHorizontalAxisSpace = (context, axisDimensions, config, range) => {
    let width;
    let height;
    const {
        tickSize,
        tickLabelDim,
        axisLabelDim
    } = axisDimensions;
    const {
        axisNamePadding,
        showAxisName,
        tickValues
   } = config;
    const domain = context.domain();
    const { height: axisDimHeight } = axisLabelDim;
    const { height: tickDimHeight, width: tickDimWidth } = tickLabelDim;

    width = range && range.length ? range[1] - range[0] : 0;

    height = 0;
    if (tickValues) {
        const minTickDiff = context.getMinTickDifference();
        const [min, max] = [Math.min(...tickValues, ...domain), Math.max(...tickValues, ...domain)];

        width = ((max - min) / Math.abs(minTickDiff)) * (tickDimWidth + context._minTickDistance.width);
    }
    if (!width || width === 0) {
        height = Math.max(tickDimWidth, tickDimHeight);
    } else {
        height = tickDimHeight;
    }
    height += (showAxisName ? (axisDimHeight + axisNamePadding) : 0) + tickSize;
    return {
        width,
        height
    };
};

export const getVerticalAxisSpace = (context, axisDimensions, config) => {
    let height;
    let width;
    const {
        tickSize,
        tickLabelDim,
        axisLabelDim
    } = axisDimensions;
    const {
        axisNamePadding,
        showAxisName,
        tickValues
   } = config;
    const domain = context.domain();
    const { height: axisDimHeight } = axisLabelDim;
    const { height: tickDimHeight, width: tickDimWidth } = tickLabelDim;

    height = 0;
    width = tickDimWidth;
    if (tickValues) {
        const minTickDiff = context.getMinTickDifference();
        const [min, max] = [Math.min(...tickValues, ...domain), Math.max(...tickValues, ...domain)];

        height = ((max - min) / Math.abs(minTickDiff)) * (tickDimHeight);
    }
    width += (showAxisName ? axisDimHeight : 0) + tickSize + axisNamePadding;

    return {
        height,
        width
    };
};

export const calculateBandSpace = (context) => {
    const range = context.range();
    const config = context.config();
    const {
        orientation,
        show
    } = config;
    const axisDimensions = context.getAxisDimensions();
    const {
        largestLabelDim,
        axisTickLabels
    } = axisDimensions;
    const { height: largestDimHeight, width: largestDimWidth } = largestLabelDim;

    if (orientation === TOP || orientation === BOTTOM) {
        let { width, height } = getHorizontalAxisSpace(context, axisDimensions, config, range);
        if (!width || width === 0) {
            width = axisTickLabels.length * (Math.min(largestDimWidth + context._minTickDistance.width,
                         largestDimHeight + context._minTickDistance.width));
        }
        if (show === false) {
            height = 0;
        }
        return {
            width,
            height
        };
    }

    let { width, height } = getVerticalAxisSpace(context, axisDimensions, config, range);

    if (!height || height === 0) {
        height = axisTickLabels.length * (largestDimHeight + largestDimHeight / 2) + largestDimHeight;
    }
    if (show === false) {
        width = 0;
    }
    return {
        width,
        height
    };
};

export const calculateContinousSpace = (context) => {
    const range = context.range();
    const config = context.config();
    const axisDimensions = context.getAxisDimensions();

    const {
        orientation,
        show,
        showAxisName
    } = config;
    const {
        axisLabelDim
    } = axisDimensions;

    if (show === false) {
        return {
            width: 0,
            height: 0
        };
    }

    const { width: axisDimWidth } = axisLabelDim;

    if (orientation === TOP || orientation === BOTTOM) {
        const { width, height } = getHorizontalAxisSpace(context, axisDimensions, config);
        const axisWidth = Math.max(width, axisDimWidth);

        return {
            width: axisWidth,
            height
        };
    }

    const { width, height } = getVerticalAxisSpace(context, axisDimensions, config, range);

    const effHeight = Math.max(height, showAxisName ? axisDimWidth : 0);

    return {
        width,
        height: effHeight
    };
};

