import React from 'react'

import './macro.scss'
import MacroTable from './macro_table'

class Macro extends React.Component {
  render () {
    return (
      <div className="macro-table-container">
        <MacroTable />
      </div>
    )
  }
}

export default Macro
