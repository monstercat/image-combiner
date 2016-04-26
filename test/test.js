var expect = require('expect.js')
var image  = require('../index.js')

describe('dependencies', done => {
  it('imagemagick installed', (done)=> {
    image.command('convert', '--version', done)
  })
})