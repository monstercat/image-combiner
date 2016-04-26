var expect     = require('expect.js')
var BlinkDiff  = require('blink-diff')
var imageUtil  = require('../index.js')
var tmp        = require('tmp')
var path       = require('path')

var source               = path.join(__dirname, 'fixtures/source.png')
var overlayedText        = path.join(__dirname, 'fixtures/overlayed-text-result.png')

describe('dependencies', () => {
  it('imagemagick installed', (done)=> {
    imageUtil.command('convert', '--version', done)
  })
})

describe('image-combiner', () => {
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
          file: source,
          type: 'image/image'
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
        isSimilar(path, overlayedText, tmpfile, (err, similar) => {
          expect(similar).to.be(true)
          done(err)
        })
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
