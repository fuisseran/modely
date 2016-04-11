var util = require('util')
var Logger  = {
  info : function info(){
    console.log('[INFO] ' + util.format.apply(util.format, arguments))     
  },
  warn : function warn(){
    console.log('[WARN] ' + util.format.apply(util.format, arguments))    
  },
  debug : function debug(){
    console.log('[DEBUG] ' + util.format.apply(util.format, arguments))  
  },
  error : function error(){ 
    console.log('[ERROR] ' + util.format.apply(util.format, arguments))     
  }
}

module.exports = Logger