var spawn = require('child_process').spawn
var tmp   = require('tmp')
var async = require('async')
var debug = require('debug')('image-combiner')
var join  = require('path').join

var types = {
  'image/text': processText,
  'image/image': processImage
}

function handle(data, done) {
  if (!Array.isArray(data)) {
    data = [data]
  }

  tmp.dir((err, path, clean) => {
    if (err) {
      debug('Error creating tmp file: %s', err)
      return done(err)
    }
    var filepath = join(path, 'temp.png')

    async.eachSeries(data, processLayer.bind(null, filepath), err => {
      debug('Output at %s', filepath)
      done(err, filepath)
    })
  })
}

function processLayer(path, layer, done) {
  if (types[layer.type]) {
    types[layer.type](path, layer, done)
  }
  else {
    async.setImmediate(done)
  }
}

function processText(path, layer, done) {
  var args = []
    , x = layer.x || 0
    , y = layer.y || 0
    , text = layer.text
    , color = layer.color || 'black'
  if (layer.font) {
    args.push('-font', layer.font)
  }
  if (layer.pointsize) {
    args.push('-pointsize', layer.pointsize)
  }
  args.push('-gravity', 'northwest')
  args.push('-annotate', `+${x}+${y}`, text)
  args.push('-fill', color)
  args.push(path, path)
  command('convert', args, done)
}

function processImage(path, layer, done) {
  var args = []
    , x = layer.x || 0
    , y = layer.y || 0
    , overlay = layer.overlay

  args.push('-gravity', 'center')
  args.push('-geometry', `+${x}+${y}`)
  args.push(overlay, path, path)
  command('composite', args, done)
}

function command(cmd, args, done) {
  var program = spawn(cmd, args)

  program.stdout.setEncoding('utf8')
  program.stderr.setEncoding('utf8')

  program.stdout.on('data', data => {
    debug("program:out: %s", data.toString())
  })

  program.stderr.on('data', data => {
    debug("program:err: %s", data.toString())
  })

  program.on('close', err => {
    if (err) {
      debug(err)
    }
    return done(err)
  })
}

module.exports = handle
