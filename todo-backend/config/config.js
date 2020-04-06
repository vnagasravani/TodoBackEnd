let appConfig = {};
appConfig.port = 3000;
appConfig.allowedCorsOrgin = "*";
appConfig.env = "dev";
appConfig.db = {
    uri: 'mongodb://127.0.0.1:27017/TodoListDB'
};
appConfig.apiVersion = 'api/v1';
module.exports = {
    port: appConfig.port,
    allowedCorsOrgin: appConfig.allowedCorsOrgin,
    environment: appConfig.env,
    db: appConfig.db,
    apiVersion: appConfig.apiVersion

}
