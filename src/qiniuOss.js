// 七牛云Oss 插件类
// by blucehuang 2019-02-28

const { Util } = require('wood-util')();
const qiniu = require('qiniu');
const mime = require('mime');
const request = require('request-promise');
const Buffer = require('buffer').Buffer;

class QiniuOss {
  constructor(app, config) {
    this.config = {...config};
  }

  getCustomToken(config) {
    let {accessKey, secretKey, scope, expires, returnBody, callbackUrl, callbackBody, callbackBodyType} = config;
    let mac = new qiniu.auth.digest.Mac(accessKey, secretKey);

    let options = {
      scope,
      expires
      // returnBody: this.config.returnBody,
      // callbackUrl: 'http://api.example.com/qiniu/upload/callback',
      // callbackBody: '{"key":"$(key)","file_hash":"$(etag)","file_size":$(fsize),"bucket":"$(bucket)","title":"$(x:name)"}',
      // callbackBodyType: 'application/json'
    };

    if (returnBody) {
      options.returnBody = returnBody;
    }

    if (callbackUrl) {
      options.callbackUrl = callbackUrl;
      options.callbackBody = callbackBody;
      options.callbackBodyType = callbackBodyType;
    }

    var putPolicy = new qiniu.rs.PutPolicy(options);
    return putPolicy.uploadToken(mac);
  }

  getCustomCoverToken(config, key) {
    let {accessKey, secretKey, scope, expires, returnBody, callbackUrl, callbackBody, callbackBodyType} = config;
    let mac = new qiniu.auth.digest.Mac(accessKey, secretKey);

    let options = {
      scope: `${scope}:${key}`,
      expires
    };

    if (returnBody) {
      options.returnBody = returnBody;
    }

    if (callbackUrl) {
      options.callbackUrl = callbackUrl;
      options.callbackBody = callbackBody;
      options.callbackBodyType = callbackBodyType;
    }

    var putPolicy = new qiniu.rs.PutPolicy(options);
    return putPolicy.uploadToken(mac);
  }
  
  getToken() {
    let uploadToken = this.getCustomToken(this.config);
    return uploadToken;
  }

  getCoverToken(key) {
    let uploadToken = this.getCustomCoverToken(this.config, key);
    return uploadToken;
  }

  uploadQiuniuOss(key, data, putExtra) {
    return new Promise((resolve, reject) => {
      let uploadToken = this.getToken();
      let config = new qiniu.conf.Config();
      config.zone = qiniu.zone.Zone_z2; //华东地区
      // 是否使用https域名
      config.useHttpsDomain = this.config.useCdnDomain ? true : false;
      // 上传是否使用cdn加速
      config.useCdnDomain = this.config.useCdnDomain ? true : false;
      let formUploader = new qiniu.form_up.FormUploader(config);
     
      formUploader.put(uploadToken, key, data, putExtra, function(respErr, respBody, respInfo) {
        if (respErr) {
          reject(respErr);
        }else if (respInfo.statusCode === 200) {
          resolve(respInfo);
        } else {
          reject(respBody);
        }
      });
    });
  }

  coverQiuniuOss(key, data, putExtra) {
    return new Promise((resolve, reject) => {
      let uploadToken = this.getCoverToken(key);
      let config = new qiniu.conf.Config();
      config.zone = qiniu.zone.Zone_z2; //华东地区
      // 是否使用https域名
      config.useHttpsDomain = this.config.useCdnDomain ? true : false;
      // 上传是否使用cdn加速
      config.useCdnDomain = this.config.useCdnDomain ? true : false;
      let formUploader = new qiniu.form_up.FormUploader(config);
      formUploader.put(uploadToken, key, data, putExtra, function(respErr, respBody, respInfo) {
        if (respErr) {
          reject(respErr);
        }else if(respInfo.statusCode === 200) {
          resolve(respInfo);
        } else {
          reject(respBody);
        }
      });
    });
  }

  // 上传文档内容
  async uploadDocument(id, data) {
    let key = `${id}.json`;
    return await this.uploadQiuniuOss(key, JSON.stringify(data));
  }

  // 覆盖文档内容
  async coverDocument(id, data) {
    let key = `${id}.json`;
    return this.coverQiuniuOss(key, JSON.stringify(data));
  }

  // 上传文件
  async uploadFile(name, content) {
    let putExtra = new qiniu.form_up.PutExtra();
    putExtra.fname = name;
    putExtra.mimeType = mime.getType(name);
    return this.uploadQiuniuOss(name, content, putExtra);
  }

  // 覆盖文件
  async coverFile(name, content) {
    let putExtra = new qiniu.form_up.PutExtra();
    putExtra.fname = name;
    putExtra.mimeType = mime.getType(name);
    return this.coverQiuniuOss(name, content, putExtra);
  }

  async uploadBase64File(name, content, cover = 0) {
    let uploadToken = null;
    
    if (cover) { 
      uploadToken = this.getCoverToken(name);
    } else {
      uploadToken = this.getToken();
    }

    let key = '';
    if (name) {
      key = Buffer(name).toString('base64');
    }
    
    const options = {
      method: 'POST',
      uri: key ? `http://upload-z2.qiniup.com/putb64/-1/key/${key}` : `http://upload-z2.qiniup.com/putb64/-1/`,
      body: content,
      json: false,
      headers: {
        "Authorization": `UpToken ${uploadToken}`,
        "Content-Type": 'application/octet-stream'
      }
    };

    let result = await request(options);
    return JSON.parse(result);
  }
}

module.exports = QiniuOss;
