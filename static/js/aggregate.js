function toggle_menu (ev) {
  var settings = $(this).closest('.settings');
  var view = settings.find('.view');
  if (view.is('.active')) {
    view.removeClass('active');
    view.addClass('hidden');
    settings.trigger('saved');
    // save / re-render
  } else {
    view.addClass('active');
    view.removeClass('hidden');

  }
}
function config_master ( ) {
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

    socket.on('pool', function (ep, data) {
      var a = data[0];
      var b = data[1];
      var c = data[2];
      var d = data[3];
      console.log('GOT DATA', ep, a.length, b.length, c.length, d.length);
      var glucose = data[0], predict = data[1],
          alarms = data[2],
          treatments = data[3];
      var plot = glucose.map(function (obj) {
        return { date: new Date(obj.x), sgv: obj.y, color: ep.color}
      });
      plot = plot.concat(predict.map(function (obj) {
        return { date: new Date(obj.x), sgv: obj.y, color: ep.color}
      }));
      plot = plot.concat(alarms.map(function (obj) {
        return { date: new Date(obj.x), sgv: obj.y, color: ep.color}
      }));
      my.nightscout.update(ep, plot);

      $('.endpoints ' + ep.color).trigger('data', data);

    });
    return socket;
}

function subscribe (ev) {
  var ep = $(this).closest('LI.describe');
  console.log('subscribe this', this);
  if (true || !ep.is('.ready')) {
    ep.addClass('ready');
    var opts = {
      color: ep.find('.color').text( ) 
    , endpoint: ep.find('.endpoint').val( )
    };
    ep.attr('id', opts.color.slice(1));
    console.log('subscribing to', opts);
    my.master.emit('subscribe', opts);
  }
  if ($(this).is("FORM")) {
    console.log('cancel form submit');
    ev.preventDefault( );
  }

}

function add_row (ev) {
  var settings = $(this).closest('.settings');
  var clone = settings.find('.endpoints .template').clone(true);
  clone.removeClass('template').addClass('describe');
  var color = randomColor( );
  console.log('new', color);
  clone.find('.color').text(color);
  clone.find('.color, .chrome').css({color: color});
  settings.find('.endpoints').append(clone); 
  clone.find('INPUT.endpoint').focus( );
}
function get_ep (control) {
  var opts = {
    color: control.find('.color').text( ) 
  , endpoint: control.find('.endpoint').val( )
  };
  return opts;
};

function remove_row (ev) {
  var control = $(this).closest('LI');
  var opts = get_ep(control);
  my.master.emit('unsubscribe', opts);
  control.remove( );
}
var my = {endpoints: [ ] };

function update_data (ev, glucose, predict, alarms, treatments) {
  var target = $(ev.target);
  console.log('UPDATE DATA', 'target', target, glucose.length, predict.length);
  // console.log('args', arguments);
  // var glucose = data[0];
  var current = glucose.slice(-1)[0].y;
  target.find('.currentBG').text(current);

  /*
  var data = glucose.map(function (obj) {
    return { date: new Date(obj.x), sgv: obj.y, color: 'grey'}
  });
  data = data.concat(predict.map(function (obj) {
    return { date: new Date(obj.x), sgv: obj.y, color: 'blue'}
  }));
  data = data.concat(alarms.map(function (obj) {
    return { date: new Date(obj.x), sgv: obj.y, color: 'red'}
  }));
  */
  // var opts = get_ep(target);
  // window.update_context(data, opts);
}

function restore_list (endpoints) {
  console.log('restore list', endpoints);
  var settings = $('.settings');
  endpoints.forEach(function (ep) {
    console.log("EP", ep);
    var clone = settings.find('.endpoints .template').clone(true);
    clone.removeClass('template').addClass('describe');
    var color = ep.color;
    console.log('new', color);
    clone.find('.color').text(color);
    clone.find('.endpoint').val(ep.endpoint);
    clone.find('.color, .chrome').css({color: color});
    settings.find('.endpoints').append(clone); 
    clone.find('FORM').submit( );
    // clone.find('INPUT.endpoint').focus( );
  });
}

$(document).ready(function ( ) {
  console.log('aggregator ready', $('.settings, .settings button.toggle'));
  $('.settings button.toggle').on('click', toggle_menu);
  $('.settings button.add').on('click', add_row);
  $('.settings button.nix').on('click', remove_row);
  // $('.settings button.sync').on('click', subscribe);
  $('.settings FORM.config').on('submit', subscribe);
  $('.endpoints').on('data', update_data);
  my.master = config_master( );
  my.master.once('list', restore_list);
  my.master.emit('list');
  my.nightscout = d3.nightscout( );
  console.log('socket', my.master);
  $(document.body).on('keypress', function (ev) {
    if (!$(ev.target).is(":input") && ev.which == ('+').charCodeAt(0)) {
      ev.preventDefault( );
      $('.settings button.add').trigger('click');
    }

  });
});
