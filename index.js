/**
 * Wood Plugin Module.
 * 七牛云
 * by blucehuang on 2019-02-28
 */
const QiniuOss = require('./src/qiniuOss');

module.exports = (app = {}, config = {}) => {
  app.QiniuOss = new QiniuOss(app, config);
  if(app.addAppProp) app.addAppProp('QiniuOss', app.QiniuOss);
  return app;
}
