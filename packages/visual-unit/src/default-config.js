import { CLASSPREFIX, CONSOLIDATED } from './enums/constants';

/**
 * Default configuration of the visual unit
 */
export const defaultConfig = {
    classPrefix: CLASSPREFIX,
    defClassName: 'visual-unit',
    className: '',
    trackerClassName: 'visual-unit-tracker',
    gridLines: {
        defClassName: 'axis-grid-lines',
        className: '',
        show: true,
        color: '#efefef',
        zeroLineColor: '#b6b6b6'
    },
    gridBands: {
        defClassName: 'axis-grid-bands',
        className: '',
        show: false,
        y: {
            color: ['#fff', '#fbfbfb']
        },
        x: {
            color: ['#fff', '#f9f9f9']
        }
    },
    arcLayerClassName: 'layer-arc',
    interaction: {
        tooltip: {
            mode: CONSOLIDATED
        }
    },
    sideEffectClassName: 'side-effect-container'
};
