import {Endpoint, S3} from 'aws-sdk';
import DomainModel from '../models/DomainModel';
import {User} from '../models/UserModel';
import CounterModel from '../models/CounterModel';
import Axios, {Method} from 'axios';

/**
 * The aws-S3 session.
 */
const s3 = new S3({
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_KEY,
  endpoint: process.env.S3_ENDPOINT,
  s3ForcePathStyle: true, // needed with minio?
  signatureVersion: 'v4',
});
// const s3 = new S3({
//     credentials: {
//         secretAccessKey: process.env.S3_SECRET_KEY,
//         accessKeyId: process.env.S3_ACCESS_KEY_ID,
//     },
//     endpoint: process.env.S3_ENDPOINT,
// });

// the function below is terrible, disgusting, and long, I know, I couldn't really think of any either way to do it and I wanted to release quickly, sorry!
async function updateStorage() {
  try {
    const params = {
      Bucket: process.env.S3_BUCKET,
    };
    let storageUsed = 0;
    const objects = await s3.listObjectsV2(params).promise();
    for (const object of objects.Contents) {
      storageUsed += object.Size;
    }
    await CounterModel.findByIdAndUpdate('counter', {
      storageUsed: storageUsed,
    });
    setTimeout(async () => {
      await this.updateStorage();
    }, 300000);
  } catch (err) {
    new Error(err);
  }
}

/**
 * Wipe a user's files.
 * @param {user} user The user's files to wipe.
 * @param {string} dir The directory to delete.
 */
async function wipeFiles(user: User, dir = `${user._id}/`) {
  const domains = await DomainModel.find({userOnly: true, donatedBy: user._id});
  let count = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const params = {
      Bucket: process.env.S3_BUCKET,
      Prefix: dir,
    };

    if (domains.length !== 0)
      for (const domain of domains) {
        if (domain.userOnly) {
          params.Prefix = `${domain.name}/`;

          const domainObjects = await s3.listObjectsV2(params).promise();

          if (domainObjects.Contents.length !== 0) {
            const deleteParams = {
              Bucket: process.env.S3_BUCKET,
              Delete: {
                Objects: [],
              },
            };

            for (const {Key} of domainObjects.Contents) {
              deleteParams.Delete.Objects.push({Key});
            }

            const deleted = await s3.deleteObjects(deleteParams).promise();
            count += (deleted.Deleted as AWS.S3.DeletedObjects).length;
          }
        }
      }

    params.Prefix = `${user._id}/`;

    const objects = await s3.listObjectsV2(params).promise();

    if (objects.Contents.length !== 0) {
      const deleteParams = {
        Bucket: process.env.S3_BUCKET,
        Delete: {
          Objects: [],
        },
      };

      for (const {Key} of objects.Contents) {
        deleteParams.Delete.Objects.push({Key});
      }

      const deleted = await s3.deleteObjects(deleteParams).promise();
      count += (deleted.Deleted as AWS.S3.DeletedObjects).length;
    }

    if (!objects.IsTruncated) return count;
  }
}

export {s3, wipeFiles, updateStorage};
