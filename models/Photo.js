const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  project:      { type: mongoose.Schema.Types.ObjectId, ref: 'Project',     required: true },
  title:        { type: String, required: true },
  description:  String,
  url:          { type: String, required: true },
  publicId:     String,
  uploadedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',        required: true },
  folder:       { type: mongoose.Schema.Types.ObjectId, ref: 'PhotoFolder', default: null },
  gps: {
    lat: Number,
    lng: Number
  },
  hasWatermark: { type: Boolean, default: true },
  createdAt:    { type: Date, default: Date.now }
});

module.exports = mongoose.model('Photo', photoSchema);
