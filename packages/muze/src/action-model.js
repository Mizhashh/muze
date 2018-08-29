/**
 * This class is initiated only once in lifecycle and is reponsible for regisration of physical and behavioural
 * actions and side effects and the mapping between them.
 *
 * To get the instance of action model
 * ```
 *  const ActionModel = muze.ActionModel;
 * ```
 *
 * @public
 *
 * @namespace Muze
 */
class ActionModel {
    constructor () {
        this._registrableComponents = [];
    }

    /**
     * Takes an array of canvases on which the physical and behavioural actions will get registered.
     *
     * @public
     * @param  {Canvas} components Array of canvases
     *
     * @return {ActionModel} Instance of action model.
     */
    for (...components) {
        this._registrableComponents = components;
        return this;
    }

    /**
     * Registers physical actions on the canvases. It takes an object with key as the name of action and value having
     * the definition of the action.
     *
     * To register a physical action
     * ```
     *  const ActionModel = muze.ActionModel;
     *  ActionModel
     *       // Physical actions will be registered on these canvases.
     *      .for(canvas)
     *      .registerPhysicalActions({
     *          // Key is the name of physical action.
     *          ctrlClick: (firebolt) => (targetEl, behaviours) => {
     *              targetEl.on('click', function (data) {
     *                  const event = utils.getEvent();
     *                  const pos = utils.getClientPoint(event, this);
     *                  // Get the data point nearest to the mouse position.
     *                  const nearestPoint = firebolt.context.getNearestPoint(pos, {
     *                      data
     *                  });
     *                  // Prepare the payload
     *                  const payload = {
     *                      criteria: nearestPoint.id
     *                  };
     *                  behaviours.forEach((behaviour) => firebolt.dispatchBehaviour(behaviour, payload));
     *              });
     *          }
     *      });
     *
     * @public
     *
     * @param {Object} actions Names of physical actions and their definitions.
     *
     * @return {ActionModel} Instance of the action model.
     */
    registerPhysicalActions (actions) {
        const canvases = this._registrableComponents;

        canvases.forEach((canvas) => {
            canvas.once('canvas.updated').then((args) => {
                const matrix = args.client.composition().visualGroup.matrixInstance().value;
                matrix.each(cell => cell.valueOf().firebolt().registerPhysicalActions(actions));
            });
        });
        return this;
    }

    /**
     * Registers behavioural actions on the canvases. It takes definitions of the behavioural actions and registers
     * them on the canvases. Every behavioural action must inherit the {@link GenericBehaviour} class.
     *
     * To register a behavioural action
     * ```
     *  // Define a new behavioural action
     *  class SingleSelectBehaviour extends GenericBehaviour {
     *      static formalName () {
     *          return 'singleSelect';
     *      }
     *
     *      setSelectionSet (addSet, selectionSet) {
     *          if (addSet === null) {
     *              selectionSet.reset();
     *          } else if (addSet.length) {
     *              const existingAddSet = selectionSet.getExistingEntrySet(addSet);
     *              if (existingAddSet.length){
     *                  selectionSet.reset();
     *              } else {
     *               selectionSet.add(addSet);
     *              }
     *          } else {
     *              selectionSet.reset();
     *          }
     *      }
     * }
     * muze.ActionModel.registerBehaviouralActions(SingleSelectBehaviour);
     * ```
     *
     * @public
     *
     * @param {GenericBehaviour} actions Definition of behavioural actions.
     *
     * @return {ActionModel} Instance of action model.
     */
    registerBehaviouralActions (...actions) {
        const canvases = this._registrableComponents;

        canvases.forEach((canvas) => {
            canvas.once('canvas.updated').then(() => {
                const matrix = canvas.composition().visualGroup.matrixInstance().value;
                matrix.each(cell => cell.valueOf().firebolt().registerBehaviouralActions(...actions));
            });
        });
        return this;
    }

    /**
     * Registers the mapping of physical and behavioural actions. This mapping is used to establish which behavioural
     * actions should be dispatched on any triggering of physical actions.
     *
     * To map physical actions with behavioural actions
     * ```
     *  muze.ActionModel.registerPhysicalBehaviouralMap({
     *      ctrlClick: {
     *          behaviours: ['select'] // This array must be the formal names of the behavioural actions.
     *      }
     *  });
     * ```
     *
     * @public
     * @param {Object} map Contains the physical and behavioural action map.
     * ```
     *   {
     *      // Name of the physical action
     *      click: {
     *          // Target element selector. This is an optional field. If not passed, then by default takes the
     *          // container element of visual unit.
     *          target: '.muze-layers-area path',
     *          // Behaviours which should be dispatched on triggering of the mapped physical action.
     *          behaviours: ['select']
     *      }
     *   }
     * ```
     *
     * @returns {ActionModel} Instance of action model.
     */
    registerPhysicalBehaviouralMap (map) {
        const canvases = this._registrableComponents;

        canvases.forEach((canvas) => {
            canvas.once('canvas.updated').then((args) => {
                const matrix = args.client.composition().visualGroup.matrixInstance().value;
                matrix.each(cell => cell.valueOf().firebolt().registerPhysicalBehaviouralMap(map));
            });
        });
        return this;
    }

    /**
     * Registers the side effects on the registered canvases. It takes definitions of side effects and registers them
     * on the canvases. Every side effect must inherit the base class {@link GenericSideEffect} or
     * {@link SpawnableSideEffect} or {@link SurrogateSideEffect} class.
     *
     * ```
     * // Define a custom side effect
     *  class InfoBox extends SpawnableSideEffect {
     *      static formalName () {
     *          return 'infoBox';
     *      }
     *
     *      apply (selectionSet) {
     *      }
     *  }
     *  muze.ActionModel.registerSideEffects(InfoBox);
     * ```
     * @public
     * @param  {GenericSideEffect} sideEffects Definition of side effects.
     * @return {ActionModel} Instance of action model.
     */
    registerSideEffects (...sideEffects) {
        const registrableComponents = this._registrableComponents;

        registrableComponents.forEach((canvas) => {
            canvas.once('canvas.updated').then((args) => {
                const matrix = args.client.composition().visualGroup.matrixInstance().value;
                matrix.each(cell => cell.valueOf().firebolt().registerSideEffects(sideEffects));
            });
        });

        return this;
    }

    /**
     * Registers the mapping of side effects and behavioural actions. It takes an object which contains key as the
     * name of behavioural action and the side effects which will be linked to it.
     *
     * ```
     *  muze.ActionModel.mapSideEffects({
     *      select: ['infoBox'] // This array must be the formal names of the side effects
     *  });
     * ```
     * @public
     * @param {Object} map Mapping of behavioural actions and side effects.
     * ```
     *     {
     *          select: ['infoBox']
     *     }
     * ```
     * @return {ActionModel} Instance of action model.
     */
    mapSideEffects (map) {
        const canvases = this._registrableComponents;

        canvases.forEach((canvas) => {
            canvas.once('canvas.updated').then(() => {
                const matrix = canvas.composition().visualGroup.matrixInstance().value;
                matrix.each(cell => cell.valueOf().firebolt().mapSideEffects(map));
            });
        });
        return this;
    }

    /**
     * Breaks the link between behavioural actions and physical actions. It takes an array of behavioural action
     * and it's physical action.
     *
     * To dissociate behavioural actions from physical actions
     * ```
     *  muze.ActionModel.dissociateBehaviour(['select', 'click'], ['highlight', 'hover']);
     * ```
     * @public
     * @param  {Array} maps Array of behavioural action and physical action.
     *
     * @return {ActionModel} Instance of action model.
     */
    dissociateBehaviour (...maps) {
        const registrableComponents = this._registrableComponents;

        registrableComponents.forEach((canvas) => {
            canvas.once('canvas.updated').then((args) => {
                const matrix = args.client.composition().visualGroup.matrixInstance().value;
                matrix.each((cell) => {
                    maps.forEach(val => cell.valueOf().firebolt().dissociateBehaviour(val[0], val[1]));
                });
            });
        });

        return this;
    }

    /**
     * Breaks the link between side effects and behavioural actions. It takes an array of formal names of the side
     * effects and it's linked behavioural action.
     *
     * To dissociate side effects from behavioural actions
     * ```
     *  muze.ActionModel.dissociateSideEffect(['crossline', 'highlight'], ['selectionBox', 'brush']);
     * ```
     *
     * @public
     * @param  {Array} maps Array of side effects and behavioural actions.
     *
     * @return {ActionModel} Instance of action model.
     */
    dissociateSideEffect (...maps) {
        const registrableComponents = this._registrableComponents;

        registrableComponents.forEach((canvas) => {
            canvas.once('canvas.updated').then((args) => {
                const matrix = args.client.composition().visualGroup.matrixInstance().value;
                matrix.each((cell) => {
                    maps.forEach(val => cell.valueOf().firebolt().dissociateBehaviour(val[0], val[1]));
                });
            });
        });

        return this;
    }
}

export const actionModel = (() => new ActionModel())();
