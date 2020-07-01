'use strict'
var http = require('http'),
  stream = require('stream'),
  bodyParser = require('body-parser'),
  pathUtils = require('path'),
  express = require('express'),
  Papa = require('papaparse'),
  fs = require('fs'),
  app = express(),
  PORT = process.env.PORT || 5000,
  appDir = pathUtils.resolve(__dirname, 'static')

const { Readable } = require('stream')

app.use(bodyParser.json())
app.use(express.urlencoded())

app.post('/download', function (req, res) {
  var subset_rows = []
  fs.readFile(
    pathUtils.resolve(appDir, 'data/data_for_download.csv'),
    function (err, data) {
      var subset_rows = []
      var read_results = Papa.parse(data.toString('utf-8'), {
        dynamicTyping: true,
      })
      var all_rows = read_results['data']
      subset_rows.push(all_rows.shift()) // add headers
      req.body.idxs.split('').forEach(function (el, ind) {
        if (el == '1') {
          subset_rows.push(all_rows[ind])
        }
      })
      res.contentType('text/plain')
      res.set(
        'Content-disposition',
        'attachment; filename="dramaticpenguin.csv"'
      )
      res.send(Papa.unparse(subset_rows, { delimiter: '\t' }))
    }
  )
})
app.use(express.static('static'))
http.createServer(app).listen(PORT, function () {
  console.log('Express server listening on port ' + PORT)
  console.log('http://localhost:' + PORT)
})
