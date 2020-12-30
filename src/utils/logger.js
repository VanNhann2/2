/* eslint-disable no-console */
import chalk from 'chalk'
import path from 'path'

class Logger {
  static LogLevel = {
    dlog: 3,
    ilog: 2,
    wlog: 1,
    elog: 0,
  }

  static LogType = {
    dlog: '[debug]',
    ilog: '[info]',
    wlog: '[warn]',
    elog: '[error]',
  }

  static LogColor = {
    dlog: 'white',
    ilog: 'green',
    wlog: 'yellow',
    elog: 'red',
  }

  /**
   * @constructor
   * @param {number} level
   */
  constructor(level) {
    if (level > Logger.LogLevel.dlog) throw 'Invalid log level, please choose: debug: 3, info: 2, warning: 1, error: 0'
    this.level = level
  }

  /**
   * Debug trace
   * @param {string=} msg
   * @param  {...any} args
   */
  debug = (msg, ...args) => {
    this.#log(Logger.LogLevel.dlog, Logger.LogType.dlog, Logger.LogColor.dlog, msg, ...args)
  }

  /**
   * Info trace
   * @param {string=} msg
   * @param  {...any} args
   */
  info = (msg, ...args) => {
    this.#log(Logger.LogLevel.ilog, Logger.LogType.ilog, Logger.LogColor.ilog, msg, ...args)
  }

  /**
   * Warning trace
   * @param {string=} msg
   * @param  {...any} args
   */
  warn = (msg, ...args) => {
    this.#log(Logger.LogLevel.wlog, Logger.LogType.wlog, Logger.LogColor.wlog, msg, ...args)
  }

  /**
   * Error trace
   * @param {string=} msg
   * @param  {...any} args
   */
  error = (msg, ...args) => {
    this.#log(Logger.LogLevel.elog, Logger.LogType.elog, Logger.LogColor.elog, msg, ...args)
  }

  /**
   * Do trace log
   * @param {number} level
   * @param {string} type
   * @param {string} color
   * @param {string=} msg
   * @param  {any[]} args
   */
  #log = (level, type, color, msg, ...args) => {
    if (this.level < level) return

    const stackInfo = process.env.NODE_ENV !== 'production' ? this.getStackInfo() : ''

    if (typeof msg !== 'string' && args.length === 0) msg = type + ' message:\n' + JSON.stringify(msg, null, 4)

    let fullLog = this.getTime() + chalk[color](type) + stackInfo + ': ' + msg

    args.forEach((arg) => {
      if (arg instanceof Error) {
        fullLog += '\n' + chalk[color](arg.stack)
      } else if (arg instanceof Object) {
        fullLog += '\n' + JSON.stringify(arg, null, 4)
      } else {
        fullLog += ' ' + JSON.stringify(arg, null, 4)
      }
    })

    console.log(fullLog)
  }

  getTime = () => {
    let nowDate = new Date()
    let dateTime = '[' + nowDate.toLocaleDateString() + ' ' + nowDate.toLocaleTimeString([], { hour12: false }) + ']'
    return dateTime
  }

  getPID = () => {
    let pid = '[' + process.pid + ']'
    return pid
  }

  getStackInfo = () => {
    let stacklist = new Error().stack.split('\n').slice(4)

    let stackReg = /at\s+(.*)\s+\((.*):(\d*):(\d*)\)/gi
    let stackReg2 = /at\s+()(.*):(\d*):(\d*)/gi

    let s = stacklist[0]
    let sp = stackReg.exec(s) || stackReg2.exec(s)

    if (sp && sp.length === 5) {
      let relativePath = path.relative(path.join(__dirname, '../../'), sp[2]),
        line = sp[3]
      let filenameLine = '[' + relativePath + ':' + line + ']'
      return filenameLine
    }
  }
}

const logLevel = process.env.NODE_ENV !== 'production' ? Logger.LogLevel.dlog : Logger.LogLevel.ilog
const logger = new Logger(logLevel)

export { logger }
