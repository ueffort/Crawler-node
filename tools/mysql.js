/**
 * Created by gaojie on 2017/3/15.
 */
var mysql = require('mysql');

function Mysql(config){
  this.connect = mysql.createPool(config);
}
Mysql.prototype.instance = function(){
  return this.connect;
};
Mysql.prototype.escape = function(string){
  return this.connect.escape(string);
};
Mysql.prototype.promise = function(sql, connect){
  let self = this;
  let instance = connect || self.instance();
  return new Promise((resolve, reject) => {
    instance.query(sql, function(err, result, fields){
      if(err)
        reject(err);
      else{
        resolve(result);
      }
    });
  });
};

Mysql.prototype.transactions = function(cb){
  let self = this;
  let instance = null;
  return new Promise((resolve, reject) => {
    self.instance().getConnection(function(err, connect){
      if(err){
        // console.log('reject');
        return reject(err);
      }else{
        instance = connect;
        instance.beginTransaction(function(err){
          if(err)
            return reject(err);
          if(config.debug) console.log('mysql start transaction');
            return resolve(connect);
        });
      }
    });
  }).then(cb).then((result)=>{
    return new Promise((resolve, reject)=>{
      instance.commit(function(err){
        if(config.debug) console.log('mysql commit');
        if(err){
          reject(err);
        }else {
          self.instance().releaseConnection(instance);
          resolve(result);
        }
      })
    })
  }).catch((err)=>{
    instance.rollback(function(){
      if(config.debug) console.log('mysql rollback');
      self.instance().releaseConnection(instance);
    });
    throw err;
  });
};

Mysql.prototype.transaction = function(){
  let self = this;
  return new Promise((resolve, reject) => {
    self.instance().getConnection(function(err, connect){
      if(err){
        reject(err);
      }else{
        connect.beginTransaction(function(err){
          if(err)
            return reject(err);
          if(config.debug) console.log('mysql start transaction');
          return resolve(connect);
        });
      }
    });
  })
};

Mysql.prototype.commit = function(connect){
  let self = this;
  return new Promise((resolve, reject)=>{
    connect.commit(function(err){
      if(config.debug) console.log('mysql commit');
      if(err){
        reject(err);
      }else {
        self.instance().releaseConnection(connect);
        resolve();
      }
    });
  });
};

Mysql.prototype.rollback = function(connect){
  let self = this;
  return new Promise((resolve, reject)=>{
    connect.rollback(function(err){
      if(config.debug) console.log('mysql rollback');
      self.instance().releaseConnection(connect);
      resolve();
    });
  });
};

// var mysqlInstance = new Mysql(config.mysql);
//
// module.exports = mysqlInstance;
module.exports.Mysql = Mysql;
