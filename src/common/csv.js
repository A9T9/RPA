import csv from 'csv'

const csvDataURI = (csvStr) => {
  return 'data:text/csv;base64,' + window.btoa(unescape(encodeURIComponent(csvStr)))
}

export function parseFromCSV (text) {
  return new Promise(function (resolve, reject) {
    csv.parse(text, function (err, data) {
      if (err)  return reject(err)
      return resolve(data)
    })
  })
}

export function stringifyToCSV (list) {
  return new Promise(function (resolve, reject) {
    csv.stringify(list, function (err, data) {
      if (err)  return reject(err)
      return resolve(data)
    })
  })
}

export function toCsvDataURI (list) {
  return stringifyToCSV(list).then(csvDataURI)
}
