/*
This is a client to upload images to S3.
*/
const { Upload } = require("@aws-sdk/lib-storage");
const { S3Client } = require("@aws-sdk/client-s3");

const Bucket = process.env.S3Bucket;

const s3client = new S3Client(process.env.region);

const upload_image = async (uploadParams) => {
  const filename = uploadParams['email'] + '.png';
  const base64Data = new Buffer.from(uploadParams['imagebase64'], 'base64');

  try {
      // upload to S3
      var uploadresponse = await new Upload({
        client: s3client,
        params: {
            ACL: 'private',
            Bucket,
            Key: filename,
            Body: base64Data,
            ContentEncoding: 'base64',
            ContentType: 'image/png'
        },
        tags: [], // optional tags
        queueSize: 4, // optional concurrency configuration
        partSize: 1024 * 1024 * 5, // optional size of each part, in bytes, at least 5MB
        leavePartsOnError: false, // optional manually handle dropped parts
    })
    .done();

    // Sample uploadresponse: https://<<Bucketname>>.s3.us-east-1.amazonaws.com/<<Filename>>.png
    return uploadresponse['Location'];
  } catch(e) {
    throw e;
  }
}


module.exports = upload_image;