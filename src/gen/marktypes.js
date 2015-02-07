"use strict";

var vl = require('vegalite'),
  util = require('../util'),
  rank = require('../rank/rank'),
  consts = require('../consts');

module.exports = function(output, enc, opt, cfg) {
  opt = vl.schema.util.extend(opt||{}, consts.gen.encodings);

  getSupportedMarkTypes(enc, opt)
    .forEach(function(markType) {
      var encoding = { marktype: markType, enc: enc, cfg: cfg },
        score = rank.encoding(encoding);
      encoding.score = score.score;
      encoding.scoreFeatures = score.features;
      output.push(encoding);
    });
  return output;
};

var marksRule = {
  point:  pointRule,
  bar:    barRule,
  line:   lineRule,
  area:   lineRule, // area is similar to line
  text:   textRule
};

//TODO(kanitw): write test case
function getSupportedMarkTypes(enc, opt) {
  var markTypes = opt.marktypeList.filter(function(markType) {
    var mark = vl.compile.marks[markType],
      reqs = mark.requiredEncoding,
      support = mark.supportedEncoding;

    for (var i in reqs) { // all required encodings in enc
      if (!(reqs[i] in enc)) return false;
    }

    for (var encType in enc) { // all encodings in enc are supported
      if (!support[encType]) return false;
    }

    return !marksRule[markType] || marksRule[markType](enc, opt);
  });

  //console.log('enc:', util.json(enc), " ~ marks:", markTypes);

  return markTypes;
}

function pointRule(enc, opt) {
  if (enc.x && enc.y) {
    // have both x & y ==> scatter plot / bubble plot

    // For OxQ
    if (opt.omitTranpose && util.xOyQ(enc)) {
      // if omitTranpose, put Q on X, O on Y
      return false;
    }

    // For OxO
    if (util.isDim(enc.x) && util.isDim(enc.y)) {
      // shape doesn't work with both x, y as ordinal
      if (enc.shape) {
        return false;
      }

      // TODO(kanitw): check that there is quant at least ...
      if (enc.color && util.isDim(enc.color)) {
        return false;
      }
    }

  } else { // plot with one axis = dot plot
    // Dot plot should always be horizontal
    if (opt.omitTranpose && enc.y) return false;

    // dot plot shouldn't have other encoding
    if (opt.omitDotPlotWithExtraEncoding && vl.keys(enc).length > 1) return false;

    // dot plot with shape is non-sense
    if (enc.shape) return false;
  }
  return true;
}

function barRule(enc, opt) {
  // need to aggregate on either x or y
  if (((enc.x.aggr !== undefined) ^ (enc.y.aggr !== undefined)) &&
      (vl.field.isOrdinalScale(enc.x) ^ vl.field.isOrdinalScale(enc.y))) {

    // if omitTranpose, put Q on X, O on Y
    if (opt.omitTranpose && util.xOyQ(enc)) return false;

    return true;
  }

  return false;
}

function lineRule(enc, opt) {
  // TODO(kanitw): add omitVerticalLine as config

  // Line chart should be only horizontal
  // and use only temporal data
  return enc.x == 'T' && enc.y == 'Q';
}

function textRule(enc, opt) {
  // FIXME should be aggregated
  // at least must have row or col
  return enc.row || enc.col;
}