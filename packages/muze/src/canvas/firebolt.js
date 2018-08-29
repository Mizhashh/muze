import {
    getDataModelFromIdentifiers
} from 'muze-utils';

/**
 * This class is responsible for dispatching any behavioural action to all the visual units housed by the canvas.
 * It is created by {@link Canvas}.
 *
 * To get the firebolt instance of {@link Canvas}
 * ```
 *  const firebolt = canvas.firebolt();
 * ```
 *
 * @class
 * @public
 * @namespace Muze
 */
export default class GroupFireBolt {
    constructor (context) {
        this.context = context;
    }

    /**
     * Dispatches a behavioural action with a payload. It takes the name of the behavioural action and a payload
     * object which contains the criteria aend an array of side effects which determines what side effects are
     * going to be shown in each visual unit of the canvas. It prepares the datamodel from the given criteria
     * and initiates a propagation from the datamodel of canvas. Then all the visual units of canvas which listens
     * to the propagation gets informed on which rows got selected and dispatches the behavioural action sent during
     * propagation.
     *
     * To dispatch a behavioural action on the canvas
     * ```
     *  // Get the firebolt instance of the canvas
     *  const firebolt = canvas.firebolt();
     *  // Dispatch a brush behaviour
     *  firebolt.dispatchBehaviour('brush', {
     *      // Selects all the rows with Horsepower having range between 100 and 200.
     *      criteria: {
     *          Horsepower: [100, 200]
     *      }
     *  });
     * // On dispatch of this behavioural action, a selection box gets created and plots gets faded out which are the
     * // default side effects mapped to this behavioural action.
     * ```
     *
     * ```
     * Additionally, it can also be passed an array of side effects in the payload.
     *  // Dispatch a select behaviour with only crossline as side effect.
     *  firebolt.dispatchBehaviour('select', {
     *      criteria: {
     *          Cylinders: ['8']
     *      },
     *      sideEffects: ['crossline']
     *  });
     * ```
     *
     * @public
     *
     * @param {string} behaviour Name of the behavioural action
     * @param {object} payload Object which contains the interaction information.
     * @param {object | Array.<Array>} payload.criteria Identifiers by which the selection happens.
     * @param {Array.<string|object>} payload.sideEffects Side effects which needs to be shown.
     *
     * @return {GroupFireBolt} Instance of firebolt.
     */
    dispatchBehaviour (behaviour, payload) {
        const propPayload = Object.assign(payload);
        const criteria = propPayload.criteria;
        const data = this.context.data();

        propPayload.action = behaviour;
        const model = getDataModelFromIdentifiers(data, criteria);
        data.propagate(model, propPayload, {
            sourceId: this.context.alias()
        });
        return this;
    }
}
