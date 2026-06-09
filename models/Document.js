const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  project:            { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    title:              { type: String, required: true },
      type:               { type: String, enum: ['plan', 'devis', 'facture', 'contrat', 'autre'], default: 'autre' },
        filename:           String,
          url:                { type: String },
            publicId:           String,
              fileData:           String,
                fileType:           String,
                  fileSize:           Number,
                    uploadedBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                      depositDate:        { type: Date, default: Date.now },
                        depositedBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                          statut:             { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
                            intervenants: [{
                                user:             { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                                    role:             { type: String, enum: ['validator', 'intervenant'], default: 'validator' },
                                        decision:         { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
                                            comment:          String,
                                                validatedAt:      Date,
                                                  }],
                                                    consultations: [{ viewedAt: Date, viewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }],
                                                      validationStatus:   { type: String, enum: ['favorable', 'non-conforme', 'partiel'] },
                                                        validationComments: String,
                                                          validatedBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                                                            validatedAt:        Date,
                                                              signature: {
                                                                  signedBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                                                                      signedAt:         Date,
                                                                          signatureImage:   String,
                                                                            },
                                                                              createdBy:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                                                                                createdAt:          { type: Date, default: Date.now },
                                                                                  updatedAt:          { type: Date, default: Date.now },
                                                                                  });

                                                                                  module.exports = mongoose.model('Document', documentSchema);