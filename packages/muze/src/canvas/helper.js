import { isEqual } from 'muze-utils';
import { ROWS, COLUMNS, COLOR, SHAPE, SIZE, MOUNT, DETAIL, DATA, CONFIG } from '../constants';
import { canvasOptions } from './local-options';

/**
 * Instantiate high level components. Canvas knows what all high level component it has.
 * @nice-to-have dynamic high level components.
 *  - Is it even required ?
 *  - Reactive to source (canvas) streaming ?
 *
 * @param {*} context Canvas instance
 * @return {Object.<Array>} Arrays of Title, visualGroup, Legend
 */
export const initCanvas = (context) => {
    const reg = context._registry.components;

    return [new reg.VisualGroup(context._registry, context.dependencies())];
};

export const dispatchProps = (context) => {
    const lifeCycleManager = context.dependencies().lifeCycleManager;
    lifeCycleManager.notify({ client: context, action: 'beforeupdate' });
    const visualGroup = context.composition().visualGroup;

    visualGroup.lockModel();
    const allOptions = context._allOptions;
    for (const key in allOptions) {
        const value = context[key]();
        if (value !== null) {
            visualGroup[key] && visualGroup[key](value);
        }
    }
    visualGroup.unlockModel();

    context._cachedProps = {};
    lifeCycleManager.notify({ client: context, action: 'initialized' });
    lifeCycleManager.notify({ client: context, action: 'updated' });
};

export const setupChangeListener = (context) => {
    const store = context._store;

    store.registerImmediateListener(MOUNT, () => {
        const allOptions = Object.keys(context._allOptions);
        const props = [...allOptions, ...Object.keys(canvasOptions)];
        let equalityChecker = () => false;
        store.registerChangeListener(props, (...params) => {
            const updateProps = props.every((option, i) => {
                switch (option) {
                case ROWS:
                case COLUMNS:
                case DETAIL:
                    equalityChecker = isEqual('Array');
                    break;

                case SHAPE:
                case SIZE:
                case COLOR:
                case DATA:
                case CONFIG:
                    equalityChecker = isEqual('Object');
                    break;
                default:
                    equalityChecker = () => true;
                    break;
                }
                const oldVal = params[i][0];
                const newVal = params[i][1];

                return equalityChecker(oldVal, newVal);
            });
            // inform attached board to rerender
            !updateProps && dispatchProps(context);
            context.render();
        }, true);
    });
};

