const moment = require('moment')
const momenttz = require('moment-timezone')
const timeZone = 'Asia/Calcutta'

let now = () => {
  return moment.utc().format()
}//end now

let getLocalTime = () => {
  return moment().tz(timeZone).format()
}//end getLocalTime

let convertToLocalTime = (time) => {
  return momenttz.tz(time, timeZone).format('LLLL')
}//end convertToLocalTime

module.exports = {
  now: now,
  getLocalTime: getLocalTime,
  convertToLocalTime: convertToLocalTime
}