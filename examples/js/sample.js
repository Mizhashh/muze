/* eslint-disable */

(function () {
    let env = muze();
    let DataModel = muze.DataModel,
        share = muze.Operators.share,
        html = muze.Operators.html,
        actionModel = muze.ActionModel;
    const SpawnableSideEffect = muze.SideEffects.SpawnableSideEffect;



    d3.json('../data/cars.json', (data) => {
        const jsonData = data,
            schema = [{
                name: 'Name',
                type: 'dimension'
            },
            {
                name: 'Maker',
                type: 'dimension'
            },
            {
                name: 'Miles_per_Gallon',
                type: 'measure'
            },

            {
                name: 'Displacement',
                type: 'measure'
            },
            {
                name: 'Horsepower',
                type: 'measure'
            },
            {
                name: 'Weight_in_lbs',
                type: 'measure',
            },
            {
                name: 'Acceleration',
                type: 'measure',
                defAggFn: 'avg'
            },
            {
                name: 'Origin',
                type: 'dimension'
            },
            {
                name: 'Cylinders',
                type: 'dimension'
            },
            {
                name: 'Year',
                type: 'dimension',
                // subtype: 'temporal',
                // format: '%Y-%m-%d'
            },

            ];
        let rootData = new DataModel(jsonData, schema);

        env = env.data(rootData).minUnitHeight(40).minUnitWidth(40);
        let mountPoint = document.getElementById('chart');
        window.canvas = env.canvas();
        let rows = ['Acceleration'],
            columns = ['Displacement'];
        const dataModelInstance = new DataModel(jsonData, schema);
        canvas
    		.rows(['Miles_per_Gallon'])
			.columns(['Year'])
          	.width(600)
          	.height(400)
			.data(dataModelInstance)
    		.transform({ transformedData: (dt) =>
                        dt.groupBy([''],{ Miles_per_Gallon: 'avg' })})
			.layers([{
					mark: 'bar',
			}, {
					mark: 'tick',
					source: 'transformedData',
					encoding: {
                      		x: {
                              field: null
                            },
							y: 'Miles_per_Gallon'
					},
					color: {
							value: () => 'red' /* To differentiate the line */
					},
					calculateDomain : false  /* Don't need to caluclate the domain*/
			}])
    		.mount(mountPoint)/* Attaching the canvas to DOM element */
    })

})()