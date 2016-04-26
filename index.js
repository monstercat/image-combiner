var spawn    = require('child_process').spawn
var tmp      = require('tmp')
var async    = require('async')
var path     = require('path')
var debug    = require('debug')('image-combiner')
var join     = require('path').join
var sizeOf   = require('image-size');
var isUrl    = require('is-url')
var request  = require('superagent')

var types = {
  'image/text': processText,
  'image/image': processImage
}

function downloadFiles(data, dir, done) {
  var map = new Map()
  async.each(data, (layer, cb)=> {
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
    else if (layer.file) {
      map.set(layer, layer.file)
    }
  }, err => {
    done(err, map)
  })
}

function processLayers(data, source, done) {
  if (!Array.isArray(data)) {
    data = [data]
  }
  if (typeof source === 'function') {
    done = source
    source = null
  }

  tmp.dir((err, filepath, clean) => {
    if (err) {
      debug('Error creating tmp file: %s', err)
      return done(err)
    }
    var filepath = join(filepath, 'temp.png')

    largestSize(data, (err, dim)=> {
      if (err) {
        debug('largestSize error: %s', err)
        return done(err)
      }
      debug('dimensions %j', dim)

      blank(filepath, dim.width, dim.height, err => {
        if (err) {
          debug('blank error: %s', err)
          return done(err)
        }
        debug('Dimensions %dx%d', dim.width, dim.height)

        async.eachSeries(data, processLayer.bind(null, filepath), err => {
          debug('Output at %s', filepath)
          done(err, filepath)
        })
      })
    })
  })
}

function processLayer(filepath, layer, done) {
  if (types[layer.type]) {
    types[layer.type](filepath, layer, done)
  }
  else {
    async.setImmediate(done)
  }
}

function processText(filepath, layer, done) {
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
  args.push(filepath, filepath)
  command('convert', args, done)
}

function processImage(filepath, layer, done) {
  var args = []
    , x = layer.x || 0
    , y = layer.y || 0
    , source = layer.file

  if (!source) {
    return done(Error('processImage: source not provided.'))
  }
  args.push('-gravity', 'center')
  args.push('-geometry', `+${x}+${y}`)
  args.push(source, filepath, filepath)
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
