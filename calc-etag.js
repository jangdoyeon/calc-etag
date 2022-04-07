import { createReadStream, statSync } from 'fs';
import { createHash } from 'crypto';
import path from 'path';

/**
 * calculating S3 eTag for local file
 * @param {String} filePath Local file path
 * @param {callback} callback
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
      console.log(`In PartSize ${filePath} eTag: ${eTag}`);
      const resData = await callback({ name, eTag });
      console.log(resData);
    } else {
      const md5sumConcat = createHash('MD5');
      const genRes = md5sumConcat
        .update(Buffer.concat(dataChunks))
        .digest('hex');
      eTag = `${genRes}-${count}`;
      console.log(`Over PartSize ${filePath} eTag: ${eTag}`);
      const resData = await callback({ name, eTag });
      console.log(resData);
    }
    return eTag;
  });
}

function seperateFileName(fullPath) {
  return path.basename(fullPath);
}
// example - calculate 'README.md' eTag

const testPath =
  '/Users/doyeon/dev/python/autobackup/backup-data/202203/SecurityDevices';
// getEtagFromLocalFile(testPath);

// 테스트 경로: /Users/doyeon/dev/python/autobackup/backup-data/202203/NetworkDevices/Office-INT_BB_A-192.168.110.252-config-20220320.txt
