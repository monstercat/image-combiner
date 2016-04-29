var spawn    = require('child_process').spawn
var tmp      = require('tmp')
var async    = require('async')
var path     = require('path')
var debug    = require('debug')('image-combiner')
var join     = require('path').join
var sizeOf   = require('image-size')
var fs       = require('fs')
var isUrl    = require('is-url')
var request  = require('superagent')
var _        = require('underscore')._

var types = {
  'image/text': processText,
  'image/image': processImage
}

function downloadFiles(layers, dir, done) {
  var map = new Map()
  async.each(layers, (layer, cb)=> {
    if (layer.file && isUrl(layer.file)) {
      var filepath = path.join(dir, path.basename(layer.file))
      var stream = fs.createWriteStream(filepath)
      request.get(layer.file)
      .pipe(stream)
      .on('error', cb)
      .on('finish', ()=> {
        map.set(layer, filepath)
        cb(null)
      })
    }
    else {
      if (layer.file) {
        map.set(layer, layer.file)
      }
      cb(null)
    }
  }, err => {
    done(err, map)
  })
}

function processLayers(layers, opts, done) {
  if (!Array.isArray(layers)) {
    layers = [layers]
  }
  if (typeof opts === 'function') {
    done = opts
    opts = {}
  }

  if (opts.source) {
    layers = [{
      type: 'image/image',
      file: opts.source
    }].concat(layers)
  }

  async.auto({
    directory: makeDirectory,
    download: ['directory', download],
    size: ['download', findSize],
    blank: ['size', makeBlank],
    layers: ['size', 'blank', doLayers]
  }, (err, results) => {
    var resultpath = (results && results.layers) ? results.layers : null
    debug(`Processed layers into image file "${resultpath}"`)
    done(err, resultpath)
  })

  function makeDirectory(cb) {
    tmp.dir((err, dirpath, clean) => {
      cb(err, {directory: dirpath, file: join(dirpath, 'temp.png')})
    })
  }

  function download(results, cb) {
    downloadFiles(layers, results.directory.directory, (err, map)=> {
      if (err) {
        return cb(err)
      }
      layers = layers.map(layer => {
        var obj = _.clone(layer)
        if (layer.file && map.get(layer)) {
          obj.file = map.get(layer)
        }
        return obj
      })
      cb(null)
    })
  }

  function findSize(results, cb) {
    if (opts.width && opts.height) {
      async.setImmediate(() => {
        cb(null, {width: opts.width, height: opts.height})
      })
    }
    else {
      largestSize(layers, cb)
    }
  }

  function makeBlank(results, cb) {
    var filepath = results.directory.file
      , dim = results.size
    blank(filepath, dim.width, dim.height, cb)
  }

  function doLayers(results, cb) {
    var outputfile = results.directory.file
    async.eachSeries(layers, processLayer.bind(null, outputfile, results.size), err => {
      cb(err, outputfile)
    })
  }
}

function processLayer(outputfile, canvasSize, layer, done) {
  if (types[layer.type]) {
    types[layer.type](outputfile, canvasSize, layer, done)
  }
  else {
    async.setImmediate(done)
  }
}

function processText(outputfile, canvasSize, layer, done) {
  var args = []
    , x = layer.x || 0
    , y = layer.y || 0
    , text = layer.text
    , color = layer.color || 'black'
    , gravity = layer.gravity || 'northwest'
  if (layer.font) {
    args.push('-font', layer.font)
  }
  if (layer.pointsize) {
    var pointsize = '' + layer.pointsize
    // Convert size in percent to point size used in imagemagick if needed
    if (pointsize.indexOf('%') > -1) {
      pointsize = Math.floor(parseInt(pointsize) / 100 * canvasSize.height)
    }
    args.push('-pointsize', pointsize)
  }
  args.push('-gravity', gravity)
  args.push('-annotate', `+${x}+${y}`, text)
  args.push('-fill', color)
  args.push(outputfile, outputfile)
  command('convert', args, done)
}

function processImage(outputfile, canvasSize, layer, done) {
  var args = []
    , x = layer.x || 0
    , y = layer.y || 0
    , source = layer.file

  if (!source) {
    return done(Error('processImage: source not provided.'))
  }
  args.push('-gravity', 'center')
  args.push('-geometry', `+${x}+${y}`)
  args.push(source, outputfile, outputfile)
  command('composite', args, done)
}

function command(cmd, args, done) {
  if (typeof args === 'function') {
    done = args
    args = []
  }
  else if (typeof args === 'string') {
    args = args.split(' ').filter(a => !!a.length)
  }

  var program = spawn(cmd, args)

  program.stdout.setEncoding('utf8')
  program.stderr.setEncoding('utf8')

  program.stdout.on('data', data => {
    debug("%s stdout: %s", cmd, data.toString())
  })

  program.stderr.on('data', data => {
    debug("%s stderr: %s", cmd, data.toString())
  })

  program.on('close', ret => {
    if (ret !== 0) {
      debug("%s return value: ", cmd, ret)
    }
    return done(ret === 0 ? null : Error(`${cmd} exited with status ${ret}`))
  })
}

function blank(filepath, w, h, done) {
  var args = ['-size', `${w}x${h}`, 'xc:none', filepath]
  command('convert', args, done)
}

function largestSize(layers, done) {
  var dim = {
    width: 0,
    height: 0
  }

  async.eachSeries(layers, (layer, cb)=> {
    if (!layer || layer.type !== 'image/image' || !layer.file) {
      return cb(null)
    }
    sizeOf(layer.file, (err, d) => {
      if (err) {
        return cb(err)
      }
      dim.width = Math.max(dim.width, d.width)
      dim.height = Math.max(dim.height, d.height)
      cb(null)
    })
  }, err => {
    done(err, dim)
  })
}

module.exports = {
  processLayers,
  command
}
