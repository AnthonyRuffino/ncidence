let html = '<b>Thank you for signing up with {{serviceName}}</b>'
html    += '<br/>';
html    += '<br/>';
html    += 'Your user name is {{userName}}';
html    += '<br/>';
html    += 'Click <a href="{{confirmLink}}">here</a> to confirm your account ';

let text = 'Thank you for signing up with {{serviceName}}. Your user name is {{userName}}.  Navigate here to confirm your account: {{confirmLink}}'

exports.html = html;
exports.text = text;