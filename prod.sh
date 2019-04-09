#!/bin/bash
sudo PORT=80  MYSQL_ENV_MYSQL_DATABASE_USER_NAME=worldy MYSQL_ENV_MYSQL_ROOT_PASSWORD=secret SECURE_PORT=443 useHttps=true sslKeyFile=/tmp/worldy.io/privkey1.pem sslDomainCertFile=/tmp/worldy.io/cert1.pem ssCaBundleFile=/tmp/worldy.io/fullchain1.pem nodejs server.js
