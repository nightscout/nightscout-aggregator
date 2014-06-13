(function() {
    "use strict";

    var   TWENTY_FIVE_MINS_IN_MS = 1500000,
        THIRTY_MINS_IN_MS = 1800000,
        FORTY_TWO_MINS_IN_MS = 2520000,
        UPDATE_TRANS_MS = 750, // milliseconds
        BRUSH_TIMEOUT = 300000,  // 5 minutes in ms
        FOCUS_DATA_RANGE_MS = 12600000;  // 3.5 hours of actual data

    var dateFn = function (d) { return new Date(d.date)};

    // This creates our top level closure to create a re-usable d3
    // component.
    function create (opts) {
        var width, height,
            charts,
            context,
            focus,
            now,
            clip,
            brush,
            brushTimer,
            focusHeight,
            contextHeight,
            sugars
            ;
        var xScale, xScale2, yScale, yScale2,
            xAxis, xAxis2, yAxis, yAxis2
            ;

        var brushInProgress = false;
        var container = null;
        var pools = { };

        // This closure provides an API.  Any functions attached as
        // properties to this object can be used by users.
        function my ( ) {

        }

        my.charts = function ( ) {
            return charts;
        };
        my.subscribe = function ( ) {
        };
        my.unsubscribe = function ( ) {
        };
        my.update = function (ep, data) {
            // Receive new dataset with some endpoint metadata so we know
            // where it came from.
            console.log('render new data update', ep, data);
            // reset now
            now = new Date( ).getTime( );
            // This will be the element that should bind this data
            var selector = 'g#pool_' + ep.color.slice(1) + '.pool';
            var tuple = { ep: ep, data: data };
            // update domain/extent of our data
            var old = my.extent( );
            var future = new Date(now + TWENTY_FIVE_MINS_IN_MS);
            var extending = d3.extent(old.concat().concat(d3.extent(data, dateFn)));
            // XXX: why is this necessary?
            // XXX: why does the now-line walk off the screen?
            // extending.reverse( );

            console.log('updated extent', extending);
            my.extent(extending);
            // If this is the first time, we won't have a valid extent.
            if (old.length == 0) {
                // initialize all scales, axis, and basic DOM creation for the
                // whole chart
                initializeCharts( );
            }

            // generate unique element to bind all data per endpoint
            sugars.selectAll(selector)
                // bind our updated data set to an element
                .data([tuple])
                // create the element if it does not exist
                .enter( )
                .append('g')
                // let's call it a "data pool"
                .attr('id', 'pool_' + ep.color.slice(1))
                .attr('class', 'pool')
            ;

            // generate unique element to bind all data per endpoint
            context.selectAll(selector)
                // bind our updated data set to an element
                .data([tuple])
                // create the element if it does not exist
                .enter( )
                .append('g')
                // let's call it a "data pool"
                .attr('id', 'pool_' + ep.color.slice(1))
                .attr('class', 'pool')
            ;

            // draw everything
            draw( );

        };

        // these functions make our global variables accessible to users
        my.width = function (v) {
            if (!isFinite(v)) return width;
            width = v;
            return my;
        }

        my.height = function (v) {
            if (!isFinite(v)) return height;
            height = v;
            return my;
        }

        // This manages our global sense of how much data we have across
        // all data sets.
        var extent = [ ];
        my.extent = function (v) {
            if (!arguments.length) return extent;
            extent = v;
            return my;
        };

        // XXX: unused
        var domain = [0, 0];
        my.domain = function (v) {
            if (!arguments.length) return domain;
            domain = v;
            return my;

        };

        var margin = { top: 20, right: 10, bottom: 30, left: 10};
        my.margin = function (v) {
            if (!arguments.length) return margin;
            margin = v;
            return my;
        }

        // reset widths/heights based on actual size of element
        function get_dimensions ( ) {
            var bounds = container.getBoundingClientRect();
            var margins = my.margin( );
            // seems to fit better
            height = bounds.height - (margins.top + margins.left);
            width = bounds.width - (margins.left + margins.right);;
            focusHeight = height * .7;
            contextHeight = height * .2;
            return bounds;
        }

        function _setup_container (opts) {
            // create svg and g to contain the chart contents
            console.log(margin);
            var padding = margin;
            var charts = d3.select(opts && opts.container || '#chartContainer').append('svg')
                .append('g')
                .attr('class', 'chartContainer')
                .attr('transform', 'translate(' + padding.left + ',' + padding.top + ')');

            return charts;
        }

        function _setup_focus ( ) {
            var focus = my.charts( ).append('g');

            // create the x axis container
            focus.append('g')
                .attr('class', 'x axis');

            // create the y axis container
            focus.append('g')
                .attr('class', 'y axis');
            return focus;
        }

        // initial setup of chart when data is first made available
        function initializeCharts() {

            // XX DATA
            // define the parts of the axis that aren't dependent on width or height
            // XXX
            xScale = d3.time.scale()
                //  .domain(d3.extent(data, function (d) { return d.date; }));
                .domain(my.extent( ));

            yScale = d3.scale.log()
                .domain([30, 420]);

            // XX DATA
            xScale2 = d3.time.scale()
                //  .domain(d3.extent(data, function (d) { return d.date; }));
                .domain(my.extent( ));

            yScale2 = d3.scale.log()
                .domain([36, 420]);

            xAxis = d3.svg.axis()
                .scale(xScale)
                .ticks(4)
                .orient('top');

            yAxis = d3.svg.axis()
                .scale(yScale)
                .tickFormat(d3.format('d'))
                .tickValues([40, 60, 80, 120, 180, 300, 400])
                .orient('left');

            xAxis2 = d3.svg.axis()
                .scale(xScale2)
                .ticks(4)
                .orient('bottom');

            yAxis2 = d3.svg.axis()
                .scale(yScale2)
                .tickFormat(d3.format('d'))
                .tickValues([40, 60, 80, 120, 180, 300, 400])
                .orient('right');

            brush = d3.svg.brush()
                .x(xScale2)
                .on('brushstart', brushStarted)
                .on('brush', brushed)
                .on('brushend', brushEnded);

            // create a bunch of basic DOM that will be re-used from here
            // on out, all the brush, guides, and clipping details
            // later on, rendering code should look for these elements and
            // update them accordingly
            context.append('g')
                .attr('class', 'x brush')
                .call(d3.svg.brush().x(xScale2).on('brush', brushed))
                .attr('height', height - focusHeight);
            ;
            // create a clipPath for when brushing
            clip = charts.append('defs')
                .append('clipPath')
                .attr('id', 'clip')
                .append('rect')
                .attr('class', 'viewport')
            ;
            // add a line that marks the current time
            focus.append('line')
                .attr('class', 'now-line')
            ;
            // add a y-axis line that shows the high bg threshold
            focus.append('line')
                .attr('class', 'high-line')
            ;

            // add a y-axis line that shows the low bg threshold
            focus.append('line')
                .attr('class', 'low-line')
            ;
            // add a y-axis line that opens up the brush extent from the context to the focus
            focus.append('line')
                .attr('class', 'open-top')
            ;
            // add a x-axis line that closes the the brush container on left side
            focus.append('line')
                .attr('class', 'open-left')
            ;

            // add a x-axis line that closes the the brush container on right side
            focus.append('line')
                .attr('class', 'open-right')
            ;
            // add a line that marks the current time
            context.append('line')
                .attr('class', 'now-line')
            ;
            // add a y-axis line that shows the high bg threshold
            context.append('line')
                .attr('class', 'high-line')
            ;
            // add a y-axis line that shows the low bg threshold
            context.append('line')
                .attr('class', 'low-line')
            ;
        }

        function draw ( ) {
            get_dimensions( );
            var dataRange = my.extent( );
            var padding = my.margin( );
            //set the width and height of the SVG element
            charts.attr('width', width + padding.left + padding.right)
                .attr('height', height + padding.top + padding.bottom);

            charts.select('rect.viewport')
                .attr('height', height)
                .attr('width', width);

            // ranges are based on the width and height available so reset
            xScale.range([0, width])
                // .domain(d3.extent(dataRange.concat([new Date(now + FOCUS_DATA_RANGE_MS)])))
            ;
            xScale2.range([0, width])
                .domain(d3.extent(dataRange.concat([new Date(now + FOCUS_DATA_RANGE_MS)])))
            ;
            yScale.range([focusHeight, 0]);

            yScale2.range([height, height - contextHeight]);

            // if first run then just display axis with no transition
            focus.select('.x')
                .attr('transform', 'translate(0,' + focusHeight + ')')
                .call(xAxis);

            focus.select('.y')
                .attr('transform', 'translate(' + width + ',0)')
                .call(yAxis);

            // if first run then just display axis with no transition
            context.select('.x')
                .attr('transform', 'translate(0,' + height + ')')
                .call(xAxis2);

            context.select('.x.brush')
                .selectAll('rect')
                .attr('y', focusHeight)
            ;
            context.select('g.x.brush')
                .call(d3.svg.brush().x(xScale2).on('brush', brushed))
                .selectAll('rect')
                .attr('y', focusHeight)
                .attr('height', height - focusHeight);

            // disable resizing of brush
            d3.select('.x.brush').select('.background').style('cursor', 'move');
            d3.select('.x.brush').select('.resize.e').style('cursor', 'move');
            d3.select('.x.brush').select('.resize.w').style('cursor', 'move');


            console.log(now, new Date(now), xScale(new Date(now)), xScale(now));
            // update all the guides, and other DOM for the whole chart
            // add a line that marks the current time
            focus.select('.now-line')
                .attr('x1', xScale(new Date(now)))
                .attr('y1', yScale(36))
                .attr('x2', xScale(new Date(now)))
                .attr('y2', yScale(420))
                .style('stroke-dasharray', ('3, 3'))
                .attr('stroke', 'grey');

            // add a y-axis line that shows the high bg threshold
            focus.select('.high-line')
                .attr('x1', xScale(dataRange[0]))
                .attr('y1', yScale(180))
                .attr('x2', xScale(dataRange[1]))
                .attr('y2', yScale(180))
                .style('stroke-dasharray', ('3, 3'))
                .attr('stroke', 'grey');

            // add a y-axis line that shows the low bg threshold
            focus.select('.low-line')
                .attr('x1', xScale(dataRange[0]))
                .attr('y1', yScale(80))
                .attr('x2', xScale(dataRange[1]))
                .attr('y2', yScale(80))
                .style('stroke-dasharray', ('3, 3'))
                .attr('stroke', 'grey');

            // add a y-axis line that opens up the brush extent from the context to the focus
            focus.select('.open-top')
                .attr('stroke', 'black')
                .attr('stroke-width', 2);

            // add a x-axis line that closes the the brush container on left side
            focus.select('.open-left')
                .attr('stroke', 'white');

            // add a x-axis line that closes the the brush container on right side
            focus.select('.open-right')
                .attr('stroke', 'white');

            // add a line that marks the current time
            context.select('.now-line')
                .attr('x1', xScale(new Date(now)))
                .attr('y1', yScale2(36))
                .attr('x2', xScale(new Date(now)))
                .attr('y2', yScale2(420))
                .style('stroke-dasharray', ('3, 3'))
                .attr('stroke', 'grey');

            // add a y-axis line that shows the high bg threshold
            context.select('.high-line')
                .attr('x1', xScale(dataRange[0]))
                .attr('y1', yScale2(180))
                .attr('x2', xScale(dataRange[1]))
                .attr('y2', yScale2(180))
                .style('stroke-dasharray', ('3, 3'))
                .attr('stroke', 'grey');

            // add a y-axis line that shows the low bg threshold
            context.select('.low-line')
                .attr('x1', xScale(dataRange[0]))
                .attr('y1', yScale2(80))
                .attr('x2', xScale(dataRange[1]))
                .attr('y2', yScale2(80))
                .style('stroke-dasharray', ('3, 3'))
                .attr('stroke', 'grey');

            var focusTransition = focus.transition().duration(UPDATE_TRANS_MS);
            var currentBrushExtent = brush.extent();
            var chartWidth = width;
            var chartHeight = height;


            // update domain
            xScale2.domain(dataRange);

            context.select('.now-line')
                .transition()
                .duration(UPDATE_TRANS_MS)
                .attr('x1', xScale2(new Date(now)))
                .attr('y1', yScale2(36))
                .attr('x2', xScale2(new Date(now)))
                .attr('y2', yScale2(420));

            // only if a user brush is not active, update brush and focus chart with recent data
            // else, just transition brush
            var updateBrush = d3.select('.brush').transition().duration(UPDATE_TRANS_MS);
            if (!brushInProgress) {
                updateBrush
                    .call(brush.extent([new Date(dataRange[1].getTime() - FOCUS_DATA_RANGE_MS), dataRange[1]]));
                brushed(true);
            } else {
                updateBrush
                    .call(brush.extent([currentBrushExtent[0], currentBrushExtent[1]]));
                brushed(true);
            }

            context.select('.x')
                .call(xAxis2);
        }

        // get the desired opacity for context chart based on the brush extent
        function highlightBrushPoints(data) {
            if (data.date.getTime() >= brush.extent()[0].getTime() && data.date.getTime() <= brush.extent()[1].getTime()) {
                return 1
            } else {
                return 0.2
            }
        }

        // clears the current user brush and resets to the current real time data
        function updateBrushToNow() {

            // get current time range
            var dataRange = my.extent( );

            // update brush and focus chart with recent data
            d3.select('.brush')
                .transition()
                .duration(UPDATE_TRANS_MS)
                .call(brush.extent([new Date(dataRange[1].getTime() - FOCUS_DATA_RANGE_MS), dataRange[1]]));
            brushed(true);

            // clear user brush tracking
            brushInProgress = false;
        }

        function brushStarted() {
            // update the opacity of the context data points to brush extent
            context.select('circle')
                .style('opacity', function(d) {return 1;} );
        }

        function brushEnded() {
            // update the opacity of the context data points to brush extent
            context.select('circle')
                .style('opacity', function (d) { return highlightBrushPoints(d) });
        }

        // function to call when context chart is brushed
        function brushed(skipTimer) {

            if (!skipTimer) {
                // set a timer to reset focus chart to real-time data
                clearTimeout(brushTimer);
                brushTimer = setTimeout(updateBrushToNow, BRUSH_TIMEOUT);
                brushInProgress = true;
            }

            var brushExtent = brush.extent();
            console.log('brushExtent', brushExtent);

            // ensure that brush extent is fixed at 3.5 hours
            if (brushExtent[1].getTime() - brushExtent[0].getTime() != FOCUS_DATA_RANGE_MS) {

                // ensure that brush updating is with the time range
                if (brushExtent[0].getTime() + FOCUS_DATA_RANGE_MS > my.extent( )[1].getTime()) {
                    d3.select('.brush')
                        .call(brush.extent([new Date(brushExtent[1].getTime() - FOCUS_DATA_RANGE_MS), brushExtent[1]]));
                } else {
                    d3.select('.brush')
                        .call(brush.extent([brushExtent[0], new Date(brushExtent[0].getTime() + FOCUS_DATA_RANGE_MS)]));
                }
            }

            xScale.domain(brush.extent());

            // bind up the focus chart data to an array of circles
            // selects all our data into data and uses date function to get current max date
            // from update above, each pool has it's own data set bound,
            // iterate over each one, to bind then render
            sugars.selectAll('.pool').each(function (meta, i) {
                console.log('in sugars updating selection', meta, i, this);
                var elem = d3.select(this);

                // should we use a path instead?
                // fetch our updated data set and bind to the circles
                var focusCircles = elem.selectAll('circle').data(meta.data, dateFn);

                // if already existing then transition each circle to its
                // new position
                focusCircles.transition()
                    .duration(UPDATE_TRANS_MS)
                    .attr('cx', function (d) { return xScale(d.date); })
                    .attr('cy', function (d) { return yScale(d.sgv);  })
                    .attr('fill', function (d) { return d.color;      });

                // if new circle then just display
                focusCircles.enter().append('circle')
                    .attr('cx', function (d) { return xScale(d.date); })
                    .attr('cy', function (d) { return yScale(d.sgv);  })
                    .attr('fill', function (d) { return d.color;      })
                    .attr('r', 3);

                focusCircles.exit()
                    .remove();
                // add clipping path so that data stays within axis
                focusCircles.attr('clip-path', 'url(#clip)');
            });

            // bind up the focus chart data to an array of circles
            // selects all our data into data and uses date function to get current max date
            // from update above, each pool has it's own data set bound,
            // iterate over each one, to bind then render
            context.selectAll('.pool').each(function (meta, i) {
                console.log('in sugars updating selection', meta, i, this);
                var elem = d3.select(this);

                // should we use a path instead?
                // fetch our updated data set and bind to the circles
                var contextCircles = elem.selectAll('circle').data(meta.data, dateFn);

                // if already existing then transition each circle to its
                // new position
                contextCircles.transition()
                    .duration(UPDATE_TRANS_MS)
                    .attr('cx', function (d) { return xScale2(d.date); })
                    .attr('cy', function (d) { return yScale2(d.sgv);  })
                    .attr('fill', function (d) { return d.color;      })
                    .style('opacity', function (d)   { return highlightBrushPoints(d) });

                // if new circle then just display
                contextCircles.enter().append('circle')
                    .attr('cx', function (d) { return xScale2(d.date); })
                    .attr('cy', function (d) { return yScale2(d.sgv);  })
                    .attr('fill', function (d) { return d.color;      })
                    .style('opacity', function (d)   { return highlightBrushPoints(d) })
                    .attr('r', 2);

                contextCircles.exit()
                    .remove();

                // add clipping path so that data stays within axis
                contextCircles.attr('clip-path', 'url(#clip)');
            });

            // remove all insulin/carb treatment bubbles so that they can be redrawn to correct location
            d3.selectAll('.path').remove();

            // XXX: temporarily removed, see above sugars pattern
            // add treatment bubbles
            // var bubbleSize = prevChartWidth < 400 ? 4 : (prevChartWidth < 600 ? 3 : 2);
            focus.selectAll('circle')
                // .data(treatments)
                // .each(function (d) { drawTreatment(d, bubbleSize, true)});
            ;

            // transition open-top line to correct location
            focus.select('.open-top')
                .attr('x1', xScale2(brush.extent()[0]))
                .attr('y1', yScale(30))
                .attr('x2', xScale2(brush.extent()[1]))
                .attr('y2', yScale(30));

            // transition open-left line to correct location
            focus.select('.open-left')
                .attr('x1', xScale2(brush.extent()[0]))
                .attr('y1', focusHeight)
                .attr('x2', xScale2(brush.extent()[0]))
                .attr('y2', height);

            // transition open-right line to correct location
            focus.select('.open-right')
                .attr('x1', xScale2(brush.extent()[1]))
                .attr('y1', focusHeight)
                .attr('x2', xScale2(brush.extent()[1]))
                .attr('y2', height);

            focus.select('.now-line')
                .transition()
                .duration(UPDATE_TRANS_MS)
                .attr('x1', xScale(new Date(now)))
                .attr('y1', yScale(36))
                .attr('x2', xScale(new Date(now)))
                .attr('y2', yScale(420));

            // update x axis
            focus.select('.x.axis')
                .call(xAxis);

        }

        // setup our basic global variables
        function init ( ) {
            container = document.getElementById('chartContainer');
            charts = _setup_container(opts);
            console.log('charts', charts);
            focus = _setup_focus(opts);
            context = charts.append('g');
            sugars = focus.append('g').attr('class', 'sugars');
            // setup a brush
            var resizeTimer;
            window.onresize = function () {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(function () {
                    if (my.extent( ).length > 0) draw( );
                }, 100);
            };

        }

        // initialize everything
        init( );
        // return closure with our api attached
        return my;
    }

    d3.nightscout = create;
})();
