
var fs = require('fs')
var randomColor = require('./static/bower_components/randomColor/randomColor');

function sources (name) {
  var content = fs.readFileSync(name).toString( ).trim( ).split('\n');
  content = content.map(function (endpoint) {
    return { color: randomColor( ), endpoint: endpoint.trim( ) };
  });
  return content;
}
module.exports = sources;

