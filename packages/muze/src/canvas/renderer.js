import { makeElement, selectElement } from 'muze-utils';
import { VERTICAL, HORIZONTAL, TOP, LEFT, RIGHT, BOTTOM } from '../constants';

/**
 * Sets the rotation for all x axes if any axis has the rotation config set in the
 * entire view
 *
 * @param {Canvas} context Instance of canvas
 */
const setLabelRotationForAxes = (context) => {
    let rotation = 0;

    const xAxes = context.xAxes() || [];

    (() => {
        for (let i = 0; i < xAxes.length; i++) {
            for (let j = 0; j < xAxes[i].length; j++) {
                if (xAxes[i][j].config().labels.rotation !== 0) {
                    rotation = xAxes[i][j].config().labels.rotation;
                    return;
                }
            }
        }
    })();

    if (rotation) {
        xAxes.forEach((axes) => {
            axes.forEach((axis) => {
                axis.config({ labels: { rotation, smartTicks: false } });
            });
        });
    }
};

const getSkeletons = (mount, layoutConfig, measurement) => {
    const {
        layoutArrangement,
        classPrefix
    } = layoutConfig;
    const {
        headers,
        legends
    } = layoutArrangement;
    const {
        canvasWidth,
        canvasHeight,
        mountSpace
    } = measurement;
    const container = selectElement(mount);
    const components = {};
    if (mountSpace.height && mountSpace.height < canvasHeight) {
        container.style('overflow-y', 'scroll');
    }
    if (mountSpace.width && mountSpace.width < canvasWidth) {
        container.style('overflow-x', 'scroll');
    }
    const mountPoint = makeElement(container, 'div', [1], `${classPrefix}-viz`)
        .style('width', `${canvasWidth}px`)
        .style('height', `${canvasHeight}px`);
    const containers = mountPoint
        .selectAll(`.${classPrefix}-container`)
        .data(headers);
    containers.exit().remove();
    const containersEnter = containers.enter().append('div');

    const mergedContainer = containersEnter.merge(containers)
                    .attr('class', `${classPrefix}-container`)
                    .style('width', `${canvasWidth}px`)
                    .style('padding', `${null}px`)
                    .each(function (type) {
                        components[type] = selectElement(this).classed(`${classPrefix}-${type}-container`, true);
                    });
    const innerContainer = mergedContainer
                    .selectAll(`.${classPrefix}-inner-container`)
                    .data((d) => {
                        if (d === 'group') {
                            return legends;
                        } return [];
                    });
    innerContainer.exit().remove();
    const innerContainerEnter = innerContainer.enter().append('div');

    innerContainerEnter
                    .merge(innerContainer)
                    .attr('class', `${classPrefix}-inner-container`)
                    .style('width', 'auto')
                    .style('height', 'auto')
                    .each(function (layoutType) {
                        components[layoutType] = selectElement(this)
                             .classed(`${classPrefix}-${layoutType}-container`, true);
                    });
    return components;
};

const renderLegend = (legendConfig, container, legendComponents, measurement) => {
    const sectionComponents = [];
    const { legendSpace, headerHeight, height, width } = measurement;
    const { legend, classPrefix } = legendConfig;
    const { position } = legend;
    const legendMount = makeElement(container, 'div', [legendComponents], `${classPrefix}-inner-content`, {}, d => d);
    legendMount.classed(`${classPrefix}-legend`, true);
    const align = (position === LEFT || position === RIGHT) ? VERTICAL : HORIZONTAL;
    const legWidth = align === VERTICAL ? legendSpace.width : width;
    const legHeight = align === VERTICAL ? height - headerHeight : legendSpace.height;

    [container, legendMount].forEach((elem) => {
        elem.style('width', `${Math.floor(legWidth)}px`)
                        .style('height', `${legHeight}px`)
                        .style('float', LEFT);
    });

    if (align === VERTICAL) {
        let sections = -1;
        let currHeight = legHeight;
        let currWidth = 0;

        legendComponents.forEach((legendInfo) => {
            const leg = legendInfo.legend;
            if (leg.measurement().height > currHeight) {
                sections++;
                currWidth = 0;
                currHeight = legHeight;
            } else {
                sections < 0 && sections++;
            }
            sectionComponents[sections] = sectionComponents[sections] || [];
            currHeight -= Math.min(leg.measurement().height, currHeight);
            currWidth = Math.max(leg.measurement().width, currWidth);
            sectionComponents[sections].push({
                legend: leg,
                legendHeight: legHeight,
                legendWidth: currWidth
            });
        });

        const mount = makeElement(legendMount, ['div'], sectionComponents, `${classPrefix}-legend-section`)
            .each((d, i) => selectElement(this).classed(`${classPrefix}-legend-section-${i}`, true))
            .classed(`${classPrefix}-legend-vertical-section`, true)
            .style('width', d => `${d[0].legendWidth}px`);
        makeElement(mount, ['div'], d => d, `${classPrefix}-legend-components`, {}, d => d.legend.id())
                        .each(function (d) {
                            d.legend.mount(this);
                        })
                        .style('width', d => `${d.legendWidth}px`);
    } else {
        const mount = makeElement(legendMount, 'div', [1], `${classPrefix}-legend-section`)
            .classed(`${classPrefix}-legend-horizontal-section`, true)
            .classed(`${classPrefix}-legend-section-${0}`, true)
            .style('width', `${legWidth}px`);

        makeElement(mount, 'div', legendComponents, `${classPrefix}-legend-components`, {}, d => d.legend.id())
                        .each(function (d) { d.legend.mount(this); })
                        .style('width', d => `${d.legend.measurement().width}px`);
    }
};

const renderHeader = (layoutConfig, container, type, headers) => {
    const headerCell = headers[`${type}Cell`];
    const config = layoutConfig[`${type}`];
    const { position, align, padding } = config;
    const sel = container
        .selectAll(`.${layoutConfig.classPrefix}-inner-container`)
        .data([type]);
    sel.exit().remove();
    const selEnter = sel.enter().append('div');

    const cont = selEnter.merge(sel);
    cont.classed(`${layoutConfig.classPrefix}-inner-container`, true);

    headerCell && headerCell.render(cont.node());

    cont.selectAll('div').classed(`${layoutConfig.classPrefix}-inner-content`, true);
    cont.style('width', `${100}%`);

    if (config && headerCell) {
        cont.style('float', LEFT)
                        .style('text-align', align)
                        .style(`padding-${position === TOP ? BOTTOM : TOP}`, `${padding}px`);
    }
};

const shiftHeaders = (config, shifter, measurement) => {
    const { classPrefix, title, subtitle, legend } = config;
    const { legendSpace } = measurement;
    const { position } = legend;

    shifter += position === LEFT ? legendSpace.width : 0;
    title && selectElement(`.${classPrefix}-title-container`).select(`.${classPrefix}-inner-content`)
                    .style('padding-left', title.align === LEFT ? `${shifter}px` : 0);
    subtitle && selectElement(`.${classPrefix}-subtitle-container`).select(`.${classPrefix}-inner-content`)
                    .style('padding-left', subtitle.align === LEFT ? `${shifter}px` : 0);
    selectElement(`.${classPrefix}-legend-horizontal-section`)
                    .style('padding-left', `${shifter}px`)
                    .selectAll(`.${classPrefix}-legend-body, .${classPrefix}-legend-title`)
                    .style('max-width', `${legendSpace.width - shifter}px`);
    selectElement(`.${classPrefix}-legend-vertical-section`)
                    .style('padding-left', null)
                    .selectAll(`.${classPrefix}-legend-body, .${classPrefix}-legend-title`)
                    .style('max-width', null);
};

const prepareGridContainer = (mountPoint, measurement, classPrefix, alias) => {
    if (!mountPoint) {
        return this;
    }

    const {
        height,
        width
    } = measurement;
    // Create container for the layout

    const sel = selectElement(mountPoint)
         .selectAll(`.${classPrefix}-inner-content`)
         .data(['layout']);
    sel.exit().remove();
    const selEnter = sel.enter().append('div');

    const container = selEnter.merge(sel)
    .attr('class', `${classPrefix}-inner-content`)
                    .classed(`${classPrefix}-grid-layout`, true)
                    .attr('id', `${classPrefix}-grid-layout-${alias}`)
                    .style('height', `${height}px`)
                    .style('padding', null)
                    .text('')
                    .style('width', `${Math.ceil(width)}px`);
    // Mount for matrices
    const innerSel = container.selectAll(`.${classPrefix}-layout-grid-container`)
         .data(['layout2']);
    innerSel.exit().remove();
    const innerSelEnter = innerSel.enter().append('div');

    const mount = innerSelEnter.merge(innerSel);
    mount.classed(`${classPrefix}-layout-grid-container`, true)
                    .attr('id', `${classPrefix}-layout-grid-container-${alias}`)
                    .style('height', `${height}px`)
                    .style('width', `${Math.ceil(width)}px`)
                    .style('overflow-x', width > 300 ? 'none' : 'scroll')
                    .style('overflow-y', height > 300 ? 'none' : 'scroll');

    return {
        mount,
        container
    };
};

export const renderComponents = (context, components, layoutConfig, measurement) => {
    const {
        headers,
        legends
    } = components;
    const {
        classPrefix
    } = layoutConfig;
    const {
        title,
        legend,
        subtitle,
        layout
    } = getSkeletons(context.mount(), layoutConfig, measurement);
    const {
        mount
    } = prepareGridContainer(layout.node(), measurement, classPrefix, context.alias());
    const padding = context.layout().getViewInformation().layoutDimensions.viewWidth[0];
    measurement.padding = padding;
    setLabelRotationForAxes(context);

    // Render layout
    context.layout().renderGrid(mount);
    context.once('layer.drawn').then(() => {
        renderLegend(layoutConfig, legend, legends, measurement);
    });

    renderHeader(layoutConfig, title, 'title', headers);
    renderHeader(layoutConfig, subtitle, 'subtitle', headers);

    shiftHeaders(layoutConfig, padding, measurement);
    context.composition().visualGroup.matrixInstance().value.each((el) => {
        el.valueOf().parentContainer(layout.node());
    });
};
