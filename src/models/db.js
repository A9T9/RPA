import Dexie from 'dexie'

const db = new Dexie('selenium-ide')

db.version(1).stores({
  testCases: 'id,name,updateTime'
})

db.version(2).stores({
  testCases: 'id,name,updateTime',
  testSuites: 'id,name,updateTime'
})

db.open();

export default db
