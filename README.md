# calc-etag

Calculating AWS S3 eTag for local file using node.js

## Usage

```
node calc-etag.js
```

## Function

```
/**
 * calculating S3 eTag for local file
 * @param {String} filePath Local file path
 */
function getEtagFromLocalFile(filePath) {
  const waterMarkSize = 8 * 1024 * 1024; // aws multipart upload part size : 8MB
  const stream = fs.createReadStream(filePath, {
    highWaterMark: waterMarkSize,
  });
  let dataChunks = [];
  let count = 0;
  const md5sum = crypto.createHash('MD5');
  const inPartSize = fs.statSync(filePath).size < waterMarkSize;
  stream.on('data', (data) => {
    if (inPartSize) {
      const md5Chunk = md5sum.update(data);
    } else {
      const chunkmd5sum = crypto.createHash('MD5');
      const md5Chunk = chunkmd5sum.update(data).digest();
      dataChunks.push(md5Chunk);
      count++;
    }
  });

  stream.on('end', () => {
    let eTag;
    if (inPartSize) {
      eTag = md5sum.digest('hex');
      console.log(`${filePath} eTag: ${eTag}`);
    } else {
      const md5sumConcat = crypto.createHash('MD5');
      const genRes = md5sumConcat
        .update(Buffer.concat(dataChunks))
        .digest('hex');
      eTag = `${genRes}-${count}`;
      console.log(`${filePath} eTag: ${eTag}`);
    }
    return eTag;
  });
}
```
