import mongoose from 'mongoose'

export const schemaOptions = {
  versionKey: false,
}

export const violationsSchema = {
  actions: { type: Number, required: true },
  // object loai phuong tien
  // action luon 3: loai vi pham
  // status la trang thai 0 la all , 1 là chưa duyệt, 2 là đã duyệt
  object: { type: Number, required: true },
  status: { type: Number, enum: [0, 1, 2, 3, 4], required: true },
  plate: { type: String, required: true },
  camera: { type: mongoose.SchemaTypes.ObjectId, required: true },
  time: { type: Date },
  images: [{ type: String }],
  object_images: [{ type: String }],
  plate_images: [{ type: String }],
  vio_time: { type: Date, required: true },
  alpr_time: { type: Date },
  vio_adress: { type: String, required: true },
  owner: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
  deleted: { type: Boolean },
}
