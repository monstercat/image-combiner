var expect     = require('expect.js')
var BlinkDiff  = require('blink-diff')
var imageUtil  = require('../index.js')
var tmp        = require('tmp')
var path       = require('path')

var source               = path.join(__dirname, 'fixtures/source.png')
var overlaySource        = path.join(__dirname, 'fixtures/overlay.png')
var textResult           = path.join(__dirname, 'fixtures/text-result.png')
var overlayResult        = path.join(__dirname, 'fixtures/overlay-result.png')

describe('dependencies @slow', () => {
  it('imagemagick installed', (done)=> {
    imageUtil.command('convert', '--version', done)
  })
})

describe('image-combiner @slow', () => {
  var tmpfile = ''
    , clean

  before(done => {
    tmp.file((err, path, fd, cleanfunc) => {
      tmpfile = path
      clean = cleanfunc
      done(err)
    })
  })

  describe('text labeling', ()=> {
    it('works', (done)=> {
      var layers = [
        {
          type: 'image/image',
          file: source
        },
        {
          type: 'image/text',
          text: 'Overlayed text',
          pointsize: 32
        }
      ]

      imageUtil.processLayers(layers, (err, path) => {
        if (err) {
          return done(err)
        }
        isSimilar(path, textResult, tmpfile, (err, similar) => {
          expect(similar).to.be(true)
          done(err)
        })
      })
    })
  })

  describe('image overlaying', ()=> {
    it('works', (done)=> {
      var layers = [
        {
          type: 'image/image',
          file: source
        },
        {
          type: 'image/image',
          file: overlaySource
        }
      ]

      imageUtil.processLayers(layers, (err, path) => {
        if (err) {
          return done(err)
        }
        isSimilar(path, overlayResult, tmpfile, (err, similar) => {
          expect(similar).to.be(true)
          done(err)
        })
      })
    })

    it('works with a url', (done)=> {
     var layers = [
        {
          type: 'image/image',
          file: source
        },
        {
          type: 'image/image',
          file: 'https://www.monstercat.com/img/monstercat_long.png'
        }
      ]

      imageUtil.processLayers(layers, (err, path) => {
        done(err)
      })
    })
  })

  after(() => {
    clean()
  })
})


function isSimilar(a, b, output, done) {
  var diff = new BlinkDiff({
    imageAPath: a,
    imageBPath: b,
    thresholdType: BlinkDiff.THRESHOLD_PERCENT,
    threshold: .01,
    imageOutputPath: output
  })
  diff.run((err, result) => {
    if (err) {
      return done(err)
    }

    done(null, diff.hasPassed(result.code))
  })
}
