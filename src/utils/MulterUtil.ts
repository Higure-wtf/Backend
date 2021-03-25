import {Request} from 'express';
import {formatExtension} from './FormatUtil';
import {generateString} from './GenerateUtil';
import {s3} from './S3Util';
import multer, {Multer} from 'multer';
import MulterS3 from 'multer-s3';
import DomainModel from '../models/DomainModel';

/**
 * The Multer configuration.
 */
const upload: Multer = multer({
  storage: MulterS3({
    s3,
    contentType: MulterS3.AUTO_CONTENT_TYPE,
    acl: 'public-read',
    bucket: process.env.S3_BUCKET,
    key: async (req: Request, file: Express.Multer.File, cb) => {
      if (!req.user) return;

      const key = req.user._id;
      const {longUrl, domain} = req.user.settings;
      const document = await DomainModel.findOne({name: domain.name});
      const filename =
        (longUrl ? generateString(17) : generateString(7)) +
        formatExtension(file);

      if (document.userOnly) {
        file.userOnlyDomain = true;
      }

      file.filename = filename;
      file.key = `${key}/${filename}`;

      cb(null, `${key}/${filename}`);
    },
  }),
  limits: {
    fileSize: 104857600,
  },
});

export {upload};
