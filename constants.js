String.prototype.replaceAll = function(search, replacement) {
  let target = this;
  return target.split(search).join(replacement);
};

exports.defaultGameVersion = 'test';
exports.schema = process.env.DEFAULT_SCHEMA || 'ncidence__aruffino_c9users_io';
exports.host = exports.schema.replaceAll('__', '-').replaceAll('_', '.');
exports.sessionExpiration = process.env.SESSION_EXP_SEC || (60 * 60 * 24 * 7);

exports.getSubdomain = (host) => {
  host = host.indexOf(':') > -1 ? host.substring(0, host.indexOf(':')) : host;
  let subdomain;
  if (exports.host !== host && host.endsWith("." + exports.host)) {
    subdomain = host.substring(0, host.indexOf("." + exports.host));
  }
  return subdomain;
};