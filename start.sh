#!/bin/bash
echo starting web app...
echo parsing run arguments...


HOST=''
TLD=''
PORT=''
SSL_PORT=''
MOUNT=''
CERT_PATH=''
GIT_REPO_URL=''
GIT_SCHEMA=''
GIT_HOST_NAME='';
GIT_GROUP_NAME='';
GIT_PROJECT_NAME='';
GIT_REVISION='';
LOCAL_PROJECT_NAME='';

DEFAULT_HOST='worldy'
DEFAULT_TLD='io'
DEFAULT_PORT=8080
DEFAULT_MOUNT='/tmp';
DEFAULT_CERT_PATH="ssl";
LOCAL_HOST='localhost'
DEFAULT_GIT_SCHEMA='https'
DEFAULT_GIT_HOST_NAME='github.com';
DEFAULT_GIT_GROUP_NAME='AnthonyRuffino'
DEFAULT_GIT_PROJECT_NAME='ncidence'


while [[ $# > 1 ]]
do
key="$1"

case $key in
    -h|--host)
    HOST="$2"
    shift # past argument
    ;;
    -t|--tld)
    TLD="$2"
    shift # past argument
    ;;
    -p|--port)
    PORT="$2"
    shift # past argument
    ;;
    -s|--ssl)
    SSL_PORT="$2"
    shift # past argument
    ;;
    -m|--mnt)
    MOUNT="$2"
    shift # past argument
    ;;
    -c|--crt)
    CERT_PATH="$2"
    shift # past argument
    ;;
    -g|--gitRepo)
    GIT_REPO_URL="$2"
    shift # past argument
    ;;
    -gg|--gitGroup)
    GIT_GROUP_NAME="$2"
    shift # past argument
    ;;
    -gp|--gitProject)
    GIT_PROJECT_NAME="$2"
    shift # past argument
    ;;
    -gr|--gitRevision)
    GIT_REVISION="$2"
    shift # past argument
    ;;
    -lp|--locProject)
    LOCAL_PROJECT_NAME="$2"
    shift # past argument
    ;;

    *)
            # unknown option
    ;;
esac
shift # past argument or value
done


if [ -z "$HOST" ]; then
   HOST="$DEFAULT_HOST"
fi

if [ -z "$PORT" ]; then
   PORT="$DEFAULT_PORT"
fi

if [ -z "$TLD" ] && [ "$HOST" != "$LOCAL_HOST" ]; then
   TLD="$DEFAULT_TLD"
fi

if [ -z "$MOUNT" ]; then
   MOUNT="$DEFAULT_MOUNT"
fi

if [ ! -z "$SSL_PORT" ]; then
   if [ -z "$CERT_PATH" ]; then
           CERT_PATH="$MOUNT"
           CERT_PATH+="/"
           CERT_PATH+="$DEFAULT_CERT_PATH"
   fi
fi

if [ -z "$GIT_REPO_URL" ]; then
  
  if [ -z "$GIT_SCHEMA" ]; then
        GIT_SCHEMA="$DEFAULT_GIT_SCHEMA"
  fi

  if [ -z "$GIT_HOST_NAME" ]; then
        GIT_HOST_NAME="$DEFAULT_GIT_HOST_NAME"
  fi

  if [ -z "$GIT_GROUP_NAME" ]; then
        GIT_GROUP_NAME="$DEFAULT_GIT_GROUP_NAME"
  fi

  if [ -z "$GIT_PROJECT_NAME" ]; then
        GIT_PROJECT_NAME="$DEFAULT_GIT_PROJECT_NAME"
  fi

  GIT_REPO_URL="$GIT_SCHEMA"
  GIT_REPO_URL+="://"
  GIT_REPO_URL+="$GIT_HOST_NAME"
  GIT_REPO_URL+="/"
  GIT_REPO_URL+="$GIT_GROUP_NAME"
  GIT_REPO_URL+="/"
  GIT_REPO_URL+="$GIT_PROJECT_NAME"
  GIT_REPO_URL+=".git"

fi

echo HOST="${HOST}"
echo TLD="${TLD}"
echo PORT="${PORT}"
echo MOUNT="${MOUNT}"
echo SSL_PORT="${SSL_PORT}"
echo CERT_PATH="${CERT_PATH}"
echo GIT_REPO_URL="${GIT_REPO_URL}"
echo LOCAL_PROJECT_NAME="${LOCAL_PROJECT_NAME}"


cd "$MOUNT"


if [ -z "$LOCAL_PROJECT_NAME" ]; then
        # try to remove the repo if it already exists
        rm -rf "$GIT_PROJECT_NAME"; true

        git clone "$GIT_REPO_URL"

        cd "$GIT_PROJECT_NAME"
else
        cd "$LOCAL_PROJECT_NAME"
fi



#npm install

if [ ! -z "$SSL_PORT" ]; then
        PORT=$PORT SECURE_PORT=$SSL_PORT useHttps=true sslKeyFile=$CERT_PATH/domain-key.pem sslDomainCertFile=$CERT_PATH/domain.org.crt ssCaBundleFile=$CERT_PATH/bundle.crt nodejs server.js
else
        PORT=$PORT nodejs server.js
fi