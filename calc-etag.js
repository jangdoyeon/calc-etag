/**
 * @author yeon
 */
import { createReadStream, statSync } from 'fs';
import { createHash } from 'crypto';
import path from 'path';

/**
 * calculating S3 eTag from local file
 * @param {string} filePath Local file path
 * @param {({name: string, eTag: string}) => void} callback
 */
export function getEtagFromLocalFile(filePath, callback) {
  const waterMarkSize = 8 * 1024 * 1024; // aws multipart upload part size : 8MB
  const stream = createReadStream(filePath, {
    highWaterMark: waterMarkSize,
  });
  let dataChunks = [];
  let count = 0;
  const md5sum = createHash('MD5');
  const inPartSize = statSync(filePath).size < waterMarkSize;
  stream.on('data', (data) => {
    if (inPartSize) {
      md5sum.update(data);
    } else {
      const chunkmd5sum = createHash('MD5');
      const md5Chunk = chunkmd5sum.update(data).digest();
      dataChunks.push(md5Chunk);
      count++;
    }
  });

  stream.on('end', async () => {
    let eTag;
    const name = seperateFileName(filePath);

    if (inPartSize) {
      eTag = md5sum.digest('hex');
      console.log(`[In PartSize] Filename: ${filePath} eTag: ${eTag}`);
      await callback({ name, eTag });
    } else {
      const md5sumConcat = createHash('MD5');
      const genRes = md5sumConcat
        .update(Buffer.concat(dataChunks))
        .digest('hex');
      eTag = `${genRes}-${count}`;
      console.log(`[Over PartSize] Filename: ${filePath} eTag: ${eTag}`);
      await callback({ name, eTag });
    }
    return eTag;
  });
}

function seperateFileName(fullPath) {
  return path.basename(fullPath);
}
// example - calculate 'README.md' eTag
getEtagFromLocalFile('README.md', ({ name, eTag }) => {});
