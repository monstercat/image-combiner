# Image Combiner

A utility that uses imagemagick to process a set of layers into a final image.

## Functions

### processLayers(layers, [opts], done)

Processes an array of `layers` into a single image. Optionally takes an `opts` object where user
can specify a starting image. By default the final resulting image will be the largest size image in layers unless
opts are provided to override this.

__Arguments__

* `layers` - An array of layers. See [Layers](#layers).
* `opts` - optional options that user can use to override the default implementation. See [Options](#options).
* `done` - callback to be called when processing is finished. It has the signature `done(error, pathToFinalImage)`

### Layers

Layers is an array of layer objects. Each layer object is in the format:

__Image Overlay__

This will overlay an image over the existing canvas.

```json
{
  "type": "image/image",
  "file": "path to image or url to image"
}
```

__Text Overlay__

This will overlay text over the existing canvas.

```json
{
  "type": "image/text",
  "text": "The text string to overlay",
  "x": "Optional - the x position of the label relative to its gravity - can be percent or pixels.",
  "y": "Optional - the y position of the label relative to its gravity - can be percent or pixels.",
  "gravity": "Optional - the anchoring of the label - uses the same values as imagemagick's gravity flag.",
  "pointsize": "Optional - The size of the font.",
  "font": "Optional - Name of the font - run 'convert -list font' from a shell to see a list available.",
  "color": "Optional - Color of the font."
}
```


### Options

Options is an optional object used for some additional config and override.

```json
{
  "source": "file or url of a source image. This will be the first layer if provided.",
  "width": "Force set the width of final image - ignored if 'source' is provided.",
  "height": "Force set the height of final image - ignored if 'source' is provided.",
}
```