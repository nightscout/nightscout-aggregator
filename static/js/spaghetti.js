(function() {
    "use strict";

    var retrospectivePredictor = true,
        latestSGV,
        treatments,
        padding = { top: 20, right: 10, bottom: 30, left: 10},
        opacity = {current: 1, DAY: 1, NIGHT: 0.5},
        now = Date.now(),
        data = [],
        dateFn = function (d) { return new Date(d.date)},
        xScale, xScale2, yScale, yScale2,
        xAxis, yAxis, xAxis2, yAxis2,
        prevChartWidth = 0,
        prevChartHeight = 0,
        focusHeight,
        UPDATE_TRANS_MS = 750, // milliseconds
        brush,
        BRUSH_TIMEOUT = 300000,  // 5 minutes in ms
        brushTimer,
        brushInProgress = false,
        clip,
        TWENTY_FIVE_MINS_IN_MS = 1500000,
        THIRTY_MINS_IN_MS = 1800000,
        FORTY_TWO_MINS_IN_MS = 2520000,
        FOCUS_DATA_RANGE_MS = 12600000;  // 3.5 hours of actual data

    // create svg and g to contain the chart contents
    var charts = d3.select('#chartContainer').append('svg')
        .append('g')
        .attr('class', 'chartContainer')
        .attr('transform', 'translate(' + padding.left + ',' + padding.top + ')');

    var focus = charts.append('g');

    // create the x axis container
    focus.append('g')
        .attr('class', 'x axis');

    // create the y axis container
    focus.append('g')
        .attr('class', 'y axis');

    // initial setup of chart when data is first made available
    function initializeCharts() {

        // define the parts of the axis that aren't dependent on width or height
        xScale = d3.time.scale()
            .domain(d3.extent(data, function (d) { return d.date; }));

        yScale = d3.scale.log()
            .domain([30, 420]);

        xScale2 = d3.time.scale()
            .domain(d3.extent(data, function (d) { return d.date; }));

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

        updateChart(true);
    }

    // called for initial update and updates for resize
    function updateChart(init) {

        // get current data range
        var dataRange = d3.extent(data, dateFn);

        // get the entire container height and width subtracting the padding
        var chartWidth = (document.getElementById('chartContainer')
            .getBoundingClientRect().width) - padding.left - padding.right;

        var chartHeight = (document.getElementById('chartContainer')
            .getBoundingClientRect().height) - padding.top - padding.bottom;

        // get the height of each chart based on its container size ratio
        focusHeight = chartHeight * .9;

        // only redraw chart if chart size has changed
        if ((prevChartWidth != chartWidth) || (prevChartHeight != chartHeight)) {

            prevChartWidth = chartWidth;
            prevChartHeight = chartHeight;

            //set the width and height of the SVG element
            charts.attr('width', chartWidth + padding.left + padding.right)
                .attr('height', chartHeight + padding.top + padding.bottom);

            // ranges are based on the width and height available so reset
            xScale.range([0, chartWidth]);
            yScale.range([focusHeight, 0]);

            if (init) {

                // if first run then just display axis with no transition
                focus.select('.x')
                    .attr('transform', 'translate(0,' + focusHeight + ')')
                    .call(xAxis);

                focus.select('.y')
                    .attr('transform', 'translate(' + chartWidth + ',0)')
                    .call(yAxis);

                // disable resizing of brush
                d3.select('.x.brush').select('.background').style('cursor', 'move');
                d3.select('.x.brush').select('.resize.e').style('cursor', 'move');
                d3.select('.x.brush').select('.resize.w').style('cursor', 'move');

                // create a clipPath for when brushing
                clip = charts.append('defs')
                    .append('clipPath')
                    .attr('id', 'clip')
                    .append('rect')
                    .attr('height', chartHeight)
                    .attr('width', chartWidth);

                // add a line that marks the current time
                focus.append('line')
                    .attr('class', 'now-line')
                    .attr('x1', xScale(new Date(now)))
                    .attr('y1', yScale(36))
                    .attr('x2', xScale(new Date(now)))
                    .attr('y2', yScale(420))
                    .style('stroke-dasharray', ('3, 3'))
                    .attr('stroke', 'grey');

                // add a y-axis line that shows the high bg threshold
                focus.append('line')
                    .attr('class', 'high-line')
                    .attr('x1', xScale(dataRange[0]))
                    .attr('y1', yScale(180))
                    .attr('x2', xScale(dataRange[1]))
                    .attr('y2', yScale(180))
                    .style('stroke-dasharray', ('3, 3'))
                    .attr('stroke', 'grey');

                // add a y-axis line that shows the low bg threshold
                focus.append('line')
                    .attr('class', 'low-line')
                    .attr('x1', xScale(dataRange[0]))
                    .attr('y1', yScale(80))
                    .attr('x2', xScale(dataRange[1]))
                    .attr('y2', yScale(80))
                    .style('stroke-dasharray', ('3, 3'))
                    .attr('stroke', 'grey');

                // add a x-axis line that closes the the brush container on left side
                focus.append('line')
                    .attr('class', 'open-left')
                    .attr('stroke', 'white');

                // add a x-axis line that closes the the brush container on right side
                focus.append('line')
                    .attr('class', 'open-right')
                    .attr('stroke', 'white');  

            } else {

                // for subsequent updates use a transition to animate the axis to the new position
                var focusTransition = focus.transition().duration(UPDATE_TRANS_MS);

                focusTransition.select('.x')
                    .attr('transform', 'translate(0,' + focusHeight + ')')
                    .call(xAxis);

                focusTransition.select('.y')
                    .attr('transform', 'translate(' + chartWidth + ', 0)')
                    .call(yAxis);
 
                // reset clip to new dimensions
                clip.transition()
                    .attr('width', chartWidth)
                    .attr('height', chartHeight);

                // clear current brush
                d3.select('.brush').call(brush.clear());

                // redraw old brush with new dimensions
                d3.select('.brush').transition().duration(UPDATE_TRANS_MS).call(brush.extent(currentBrushExtent));

                // transition high line to correct location
                focus.select('.high-line')
                    .transition()
                    .duration(UPDATE_TRANS_MS)
                    .attr('x1', xScale(currentBrushExtent[0]))
                    .attr('y1', yScale(180))
                    .attr('x2', xScale(currentBrushExtent[1]))
                    .attr('y2', yScale(180));

                // transition low line to correct location
                focus.select('.low-line')
                    .transition()
                    .duration(UPDATE_TRANS_MS)
                    .attr('x1', xScale(currentBrushExtent[0]))
                    .attr('y1', yScale(80))
                    .attr('x2', xScale(currentBrushExtent[1]))
                    .attr('y2', yScale(80));

                // transition open-top line to correct location
                focus.select('.open-top')
                    .transition()
                    .duration(UPDATE_TRANS_MS)
                    .attr('x1', xScale2(currentBrushExtent[0]))
                    .attr('y1', yScale(30))
                    .attr('x2', xScale2(currentBrushExtent[1]))
                    .attr('y2', yScale(30));

                // transition open-left line to correct location
                focus.select('.open-left')
                    .transition()
                    .duration(UPDATE_TRANS_MS)
                    .attr('x1', xScale2(currentBrushExtent[0]))
                    .attr('y1', focusHeight)
                    .attr('x2', xScale2(currentBrushExtent[0]))
                    .attr('y2', chartHeight);

                // transition open-right line to correct location
                focus.select('.open-right')
                    .transition()
                    .duration(UPDATE_TRANS_MS)
                    .attr('x1', xScale2(currentBrushExtent[1]))
                    .attr('y1', focusHeight)
                    .attr('x2', xScale2(currentBrushExtent[1]))
                    .attr('y2', chartHeight);

            }
        }

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

        
    }

    // look for resize but use timer to only call the update script when a resize stops
    var resizeTimer;
    window.onresize = function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            updateChart(false);
        }, 100);
    };

    

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Client-side code to connect to server and handle incoming data
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    var isInitialData = false;
    var socket = io.connect();

    socket.on('now', function (d) {
        now = d;
        var dateTime = new Date(now);
        $('#currentTime').text(d3.time.format('%I:%M%p')(dateTime));

        // Dim the screen by reducing the opacity when at nighttime
        if (opacity.current != opacity.NIGHT && (dateTime.getHours() > 21 || dateTime.getHours() < 7 )) {
            $('body').css({'opacity': opacity.NIGHT});
        } else {
            $('body').css({'opacity': opacity.DAY});
        }
    });

    socket.on('sgv', function (d) {
        if (d.length > 1) {
            data = d[0].map(function (obj) { return { date: new Date(obj.x), sgv: obj.y, color: 'grey'} });
            data = data.concat(d[1].map(function (obj) { return { date: new Date(obj.x), sgv: obj.y, color: 'blue'} }));
            data = data.concat(d[2].map(function (obj) { return { date: new Date(obj.x), sgv: obj.y, color: 'red'} }));
            if (!isInitialData) {
                isInitialData = true;
                initializeCharts();
            }
            else {
                updateChart(false);
            }
        }
    });
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Text handling
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    socket.on('connect', function () {
        console.log('Client connected to server.')
    });

})();